const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs   = require('fs');
const { autoUpdater } = require('electron-updater');

const Database        = require('./database/db');
const BackupScheduler = require('./backup-scheduler');
const ExcelExporter   = require('./exporters/excel-exporter');

const db            = new Database();
const excelExporter = new ExcelExporter();

let mainWindow;
let backupScheduler;

// ==================== WINDOW ====================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900, minWidth: 1200, minHeight: 700,
        show: false,
        webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
    });
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => { mainWindow = null; });
    backupScheduler = new BackupScheduler(db);
    backupScheduler.start();
}

app.whenReady().then(() => {
    createWindow();
    // Silent update check 3 s after launch — non-blocking
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err =>
            console.log('[updater] skipped:', err.message)
        );
    }, 3000);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ==================== AUTO-UPDATER ====================
/*
  GITHUB SETUP (one-time):
  ─────────────────────────────────────────────────────────────
  1. In package.json → "build" → "publish":
       { "provider": "github", "owner": "YOUR_GH_USERNAME", "repo": "YOUR_REPO_NAME" }

  2. For private repos set env var GH_TOKEN = <GitHub personal access token>
     (classic token with repo scope).  Public repos need no token.

  3. Build & publish:   npm run dist   (or  electron-builder --publish always)
     This creates a GitHub Release (draft). Publish it → old clients auto-update.

  4. Users get:
     • A silent background download while they work.
     • A native OS desktop notification: "Version X.Y.Z is downloading…"
     • A dialog box when download completes asking to restart now or later.
     • If they click "Later" the update installs the next time they quit normally.
  ─────────────────────────────────────────────────────────────
*/

autoUpdater.autoDownload         = true;   // download silently
autoUpdater.autoInstallOnAppQuit = true;   // install on next normal quit

const sendUpdate = (event, payload = {}) => {
    if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('updater:event', { event, ...payload });
};

autoUpdater.on('checking-for-update', () => sendUpdate('checking'));

autoUpdater.on('update-available', (info) => {
    sendUpdate('available', { version: info.version, notes: info.releaseNotes });
    if (Notification.isSupported())
        new Notification({ title: 'TuniInvoice Pro — Mise à jour', body: `Version ${info.version} est en cours de téléchargement…` }).show();
});

autoUpdater.on('update-not-available', (info) => sendUpdate('not-available', { version: info.version }));

autoUpdater.on('download-progress', (p) => {
    sendUpdate('progress', { percent: Math.round(p.percent), speed: p.bytesPerSecond, transferred: p.transferred, total: p.total });
    if (mainWindow && process.platform === 'win32') mainWindow.setProgressBar(p.percent / 100);
});

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && process.platform === 'win32') mainWindow.setProgressBar(-1);
    sendUpdate('downloaded', { version: info.version });

    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '🎉 Mise à jour prête',
        message: `TuniInvoice Pro ${info.version} est téléchargé et prêt.`,
        detail: 'Redémarrez maintenant pour appliquer la mise à jour, ou elle s\'installera automatiquement au prochain démarrage.',
        buttons: ['🔄 Redémarrer maintenant', '⏰ Plus tard'],
        defaultId: 0, cancelId: 1
    }).then(r => { if (r.response === 0) autoUpdater.quitAndInstall(false, true); });
});

autoUpdater.on('error', (err) => {
    sendUpdate('error', { message: err.message });
    console.error('[updater]', err);
});

// Renderer-triggered manual check
ipcMain.handle('updater:check',   async () => { try { const r = await autoUpdater.checkForUpdates(); return { success: true, version: r?.updateInfo?.version }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('updater:install', ()       => autoUpdater.quitAndInstall(false, true));
ipcMain.handle('app:version',     ()       => app.getVersion());

// ==================== PDF ====================
ipcMain.handle('pdf:save', async (_, { html, filename }) => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, { defaultPath: filename || 'document.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
        if (canceled || !filePath) return { success: false, canceled: true };
        const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
        await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        await new Promise(r => setTimeout(r, 400));
        const data = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, marginsType: 0 });
        win.close();
        fs.writeFileSync(filePath, data);
        shell.showItemInFolder(filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('pdf:print', async (_, { html }) => {
    try {
        const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } });
        await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        await new Promise(r => setTimeout(r, 400));
        await new Promise((res, rej) => win.webContents.print({ silent: false, printBackground: true }, (ok, err) => { if (ok || err === 'cancelled') res(); else rej(new Error(err)); }));
        win.close();
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== AUTH ====================
ipcMain.handle('auth:register',        async (_, d)                                    => { try { return { success: true, user: db.registerUser(d) }; }             catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('auth:login',           async (_, d)                                    => { try { return { success: true, user: db.loginUser(d.email, d.password) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('auth:changePassword',  async (_, { userId, oldPassword, newPassword }) => { try { db.changePassword(userId, oldPassword, newPassword); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== DOCUMENTS ====================
ipcMain.handle('docs:getAll',        async (_, userId)            => db.getDocuments(userId));
ipcMain.handle('docs:getById',       async (_, id)                => db.getDocumentById(id));
ipcMain.handle('docs:save',          async (_, data)              => { try { return { success: true, document: db.saveDocument(data) }; }  catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:update',        async (_, { docId, updates }) => { try { const ex = db.getDocumentById(docId); if (!ex) throw new Error('Introuvable'); return { success: true, document: db.saveDocument({ ...ex, ...updates, id: docId }) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:delete',        async (_, id)                => { try { db.deleteDocument(id); return { success: true }; }            catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:getNextNumber', async (_, { userId, type, year }) => db.getNextDocumentNumber(userId, type, year));
ipcMain.handle('docs:convert',       async (_, { sourceId, targetType, userId, year }) => {
    try {
        const src  = db.getDocumentById(sourceId); if (!src) throw new Error('Source introuvable');
        const num  = db.getNextDocumentNumber(userId, targetType, year);
        const note = `Converti depuis ${src.type.toUpperCase()} N° ${src.number} du ${src.date}`;
        return { success: true, document: db.saveDocument({ ...src, id: undefined, type: targetType, number: num, date: new Date().toISOString().split('T')[0], dueDate: targetType === 'facture' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null, notes: src.notes ? `${src.notes}\n\n${note}` : note, paymentStatus: 'unpaid', paidAmount: 0 }) };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('docs:duplicate', async (_, { docId, userId }) => {
    try {
        const src  = db.getDocumentById(docId); if (!src) throw new Error('Introuvable');
        const num  = db.getNextDocumentNumber(userId, src.type, new Date().getFullYear());
        const note = `Copie de ${src.type.toUpperCase()} N° ${src.number}`;
        return { success: true, document: db.saveDocument({ ...src, id: undefined, number: num, date: new Date().toISOString().split('T')[0], dueDate: src.type === 'facture' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null, notes: src.notes ? `${src.notes}\n\n${note}` : note, paymentStatus: 'unpaid', paidAmount: 0 }) };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('docs:search',    async (_, { userId, query }) => { try { return db.searchDocuments(userId, query); } catch { return []; } });

// ==================== PAYMENTS ====================
ipcMain.handle('payments:add',    async (_, d)  => { try { return { success: true, payment: db.addPayment(d) }; }  catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('payments:getAll', async (_, id) => db.getPayments(id));
ipcMain.handle('payments:delete', async (_, id) => { try { db.deletePayment(id); return { success: true }; }        catch (e) { return { success: false, error: e.message }; } });

// ==================== CLIENTS ====================
ipcMain.handle('clients:getAll',  async (_, userId) => db.getClients(userId));
ipcMain.handle('clients:getById', async (_, id)     => db.getClientById(id));
ipcMain.handle('clients:save',    async (_, data)   => { try { return { success: true, client: db.saveClient(data) };  } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('clients:delete',  async (_, id)     => { try { db.deleteClient(id); return { success: true }; }        catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('clients:history', async (_, { userId, clientName }) => { try { return db.getClientHistory(userId, clientName); } catch { return []; } });

// ==================== SERVICES ====================
ipcMain.handle('services:getAll', async (_, userId) => db.getServices(userId));
ipcMain.handle('services:save',   async (_, data)   => { try { return { success: true, service: db.saveService(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('services:delete', async (_, id)     => { try { db.deleteService(id); return { success: true }; }           catch (e) { return { success: false, error: e.message }; } });

// ==================== COMPANY ====================
ipcMain.handle('company:get',         async (_, userId)               => db.getCompanySettings(userId));
ipcMain.handle('company:save',        async (_, data)                 => { try { return { success: true, company: db.saveCompanySettings(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('company:saveImages',  async (_, data)                 => { try { db.saveCompanyImages(data.userId, data); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('company:removeImage', async (_, { userId, imageType }) => { try { db.removeCompanyImage(userId, imageType); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== SETTINGS ====================
ipcMain.handle('settings:get',          async (_, userId)               => db.getUserSettings(userId));
ipcMain.handle('settings:update',       async (_, { userId, settings }) => { try { return { success: true, settings: db.updateUserSettings(userId, settings) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('settings:resetCounter', async (_, { userId, type, year }) => { try { db.resetDocumentCounter(userId, type, year || new Date().getFullYear()); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== THEMES ====================
ipcMain.handle('theme:get',     async (_, userId)            => db.getThemeSettings(userId));
ipcMain.handle('theme:save',    async (_, { userId, theme }) => { try { db.saveThemeSettings(userId, theme); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('doctheme:get',  async (_, userId)            => db.getDocumentTheme(userId));
ipcMain.handle('doctheme:save', async (_, { userId, theme }) => { try { db.saveDocumentTheme(userId, theme); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== STATS ====================
ipcMain.handle('stats:get',     async (_, userId)               => db.getDashboardStats(userId));
ipcMain.handle('stats:annual',  async (_, { userId, year })     => db.getAnnualStats(userId, year));
ipcMain.handle('stats:client',  async (_, { userId, clientName }) => db.getClientStats(userId, clientName));

// ==================== EXCEL ====================
ipcMain.handle('export:excel:documents', async (_, { documents, filePath }) => {
    try {
        if (!filePath) { const r = await dialog.showSaveDialog(mainWindow, { defaultPath: `documents-${Date.now()}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] }); if (r.canceled) return { success: false }; filePath = r.filePath; }
        excelExporter.exportMultipleDocuments(documents, filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('export:excel:clients', async (_, { clients, filePath }) => {
    try {
        if (!filePath) { const r = await dialog.showSaveDialog(mainWindow, { defaultPath: `clients-${Date.now()}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] }); if (r.canceled) return { success: false }; filePath = r.filePath; }
        excelExporter.exportClients(clients, filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== NOTES ====================
ipcMain.handle('notes:getAll', async (_, userId) => db.getNotes(userId));
ipcMain.handle('notes:save',   async (_, data)   => { try { return { success: true, note: db.saveNote(data) }; }  catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('notes:delete', async (_, id)     => { try { db.deleteNote(id); return { success: true }; }         catch (e) { return { success: false, error: e.message }; } });

// ==================== REMINDERS ====================
ipcMain.handle('reminders:getAll',   async (_, userId) => db.getReminders(userId));
ipcMain.handle('reminders:save',     async (_, data)   => { try { return { success: true, reminder: db.saveReminder(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('reminders:delete',   async (_, id)     => { try { db.deleteReminder(id); return { success: true }; }           catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('reminders:markDone', async (_, id)     => { try { db.markReminderDone(id); return { success: true }; }          catch (e) { return { success: false, error: e.message }; } });

// Poll for due reminders every 10 minutes
setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const due = db.getDueReminders();
        due.forEach(r => {
            if (Notification.isSupported())
                new Notification({ title: '⏰ Rappel TuniInvoice', body: r.title }).show();
            mainWindow.webContents.send('reminder:due', r);
        });
    } catch {}
}, 10 * 60 * 1000);

// ==================== BACKUP ====================
ipcMain.handle('backup:settings:get',  ()      => backupScheduler.getSettings());
ipcMain.handle('backup:settings:save', (_, s)  => { backupScheduler.saveSettings(s); backupScheduler.start(); return { success: true }; });
ipcMain.handle('backup:create:manual', async() => await backupScheduler.createBackup(true));
ipcMain.handle('backup:list',          ()      => backupScheduler.getBackupList());
ipcMain.handle('backup:restore',       async (_, p) => { try { await backupScheduler.restoreBackup(p); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== CONTRACTS ====================
ipcMain.handle('contracts:getAll',  async (_, userId) => db.getContracts(userId));
ipcMain.handle('contracts:getById', async (_, id)     => db.getContractById(id));
ipcMain.handle('contracts:save',    async (_, data)   => { try { return { success: true, contract: db.saveContract(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('contracts:delete',  async (_, id)     => { try { db.deleteContract(id); return { success: true }; }            catch (e) { return { success: false, error: e.message }; } });

// ==================== FS HELPERS ====================
ipcMain.handle('fs:openFolder',   async (_, p) => { try { shell.openPath(p); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('fs:selectFolder', async ()     => { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });