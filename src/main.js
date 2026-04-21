const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs   = require('fs');
const archiver = require('archiver');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { autoUpdater } = require('electron-updater');

const Database        = require('./database/db');
const BackupScheduler = require('./backup-scheduler');
const ExcelExporter   = require('./exporters/excel-exporter');
const { buildRetenueHTML, buildRelanceHTML, buildFiscalSummaryHTML } = require('./renderer/retenue-builder');

const db            = new Database();
const excelExporter = new ExcelExporter();

let mainWindow;
let backupScheduler;
let calculatorWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900, minWidth: 1200, minHeight: 700,
        show: false,
        icon: path.join(__dirname, '../assets/iconblack2.png'),
        webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
    });
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => { mainWindow = null; });
    backupScheduler = new BackupScheduler(db);
    backupScheduler.start();
}

app.whenReady().then(() => {
    const { protocol } = require('electron');
    protocol.registerFileProtocol('media', (request, callback) => {
        const url = request.url.replace('media://', '');
        try { return callback(decodeURIComponent(url)); }
        catch (error) { console.error(error); }
    });

    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, '../assets/iconblack2.png'));
    }
    createWindow();
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => console.log('[updater] skipped:', err.message));
    }, 3000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ==================== AUTO-UPDATER ====================
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
const sendUpdate = (event, payload = {}) => {
    if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('updater:event', { event, ...payload });
};
autoUpdater.on('checking-for-update', () => sendUpdate('checking'));
autoUpdater.on('update-available', (info) => {
    sendUpdate('available', { version: info.version, notes: info.releaseNotes });
    if (Notification.isSupported())
        new Notification({ title: 'Factarlou — Mise à jour', body: `Version ${info.version} est en cours de téléchargement…` }).show();
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
        type: 'info', title: '🎉 Mise à jour prête',
        message: `Factarlou ${info.version} est téléchargé et prêt.`,
        detail: 'Redémarrez maintenant pour appliquer la mise à jour, ou elle s\'installera automatiquement au prochain démarrage.',
        buttons: ['🔄 Redémarrer maintenant', '⏰ Plus tard'],
        defaultId: 0, cancelId: 1
    }).then(r => { 
        if (r.response === 0) {
            // Use setImmediate to ensure the dialog is fully closed before quitting
            setImmediate(() => {
                app.removeAllListeners("window-all-closed");
                autoUpdater.quitAndInstall(false, true);
            });
        }
    });
});
autoUpdater.on('error', (err) => { sendUpdate('error', { message: err.message }); console.error('[updater]', err); });

ipcMain.handle('updater:check',   async () => { try { const r = await autoUpdater.checkForUpdates(); return { success: true, version: r?.updateInfo?.version }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('updater:install', () => {
    setImmediate(() => {
        app.removeAllListeners("window-all-closed");
        autoUpdater.quitAndInstall(false, true);
    });
});
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
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('pdf:generateBuffer', async (_, { html }) => {
    try {
        const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
        await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        await new Promise(r => setTimeout(r, 600)); 
        const data = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, marginsType: 0 });
        win.close();
        return { success: true, data: data }; 
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== AUTH ====================
ipcMain.handle('auth:register',       async (_, d) => { try { return { success: true, user: db.registerUser(d) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('auth:login',          async (_, d) => { try { return { success: true, user: db.loginUser(d.email, d.password) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('auth:changePassword', async (_, { userId, oldPassword, newPassword }) => { try { db.changePassword(userId, oldPassword, newPassword); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('auth:resetPasswordMasterKey', async (_, { email, masterKey, newPassword }) => { try { db.resetPasswordWithMasterKey(email, masterKey, newPassword); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== DOCUMENTS ====================
ipcMain.handle('docs:getAll',        async (_, userId) => db.getDocuments(userId));
ipcMain.handle('docs:getByType',     async (_, { userId, type }) => db.getDocumentsByType(userId, type));
ipcMain.handle('docs:getById',       async (_, id) => db.getDocumentById(id));
ipcMain.handle('docs:save',          async (_, data) => { try { return { success: true, document: db.saveDocument(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:update',        async (_, { docId, updates }) => { try { const ex = db.getDocumentById(docId); if (!ex) throw new Error('Introuvable'); return { success: true, document: db.saveDocument({ ...ex, ...updates, id: docId }) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:delete',        async (_, id) => { try { db.deleteDocument(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:getNextNumber', async (_, { userId, type, year }) => db.getNextDocumentNumber(userId, type, year));
ipcMain.handle('docs:peekNextNumber',async (_, { userId, type, year }) => db.peekNextDocumentNumber(userId, type, year));
ipcMain.handle('docs:counterStatus', async (_, { userId, year }) => db.getCounterStatus(userId, year));
ipcMain.handle('docs:convert', async (_, { sourceId, targetType, userId, year }) => {
    try {
        const src = db.getDocumentById(sourceId);
        if (!src) throw new Error('Source introuvable');
        const num = db.getNextDocumentNumber(userId, targetType, year || new Date().getFullYear());
        const note = `Converti depuis ${src.type.toUpperCase()} N° ${src.number} du ${src.date}`;
        return { success: true, document: db.saveDocument({ ...src, id: undefined, type: targetType, number: num, date: new Date().toISOString().split('T')[0], dueDate: targetType === 'facture' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null, notes: src.notes ? `${src.notes}\n\n${note}` : note, paymentStatus: 'unpaid', paidAmount: 0 }) };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('docs:duplicate', async (_, { docId, userId }) => {
    try {
        const src = db.getDocumentById(docId);
        if (!src) throw new Error('Introuvable');
        const num = db.getNextDocumentNumber(userId, src.type, new Date().getFullYear());
        const note = `Copie de ${src.type.toUpperCase()} N° ${src.number}`;
        return { success: true, document: db.saveDocument({ ...src, id: undefined, number: num, date: new Date().toISOString().split('T')[0], dueDate: src.type === 'facture' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null, notes: src.notes ? `${src.notes}\n\n${note}` : note, paymentStatus: 'unpaid', paidAmount: 0 }) };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('docs:search',   async (_, { userId, query }) => { try { return db.searchDocuments(userId, query); } catch { return []; } });
ipcMain.handle('docs:overdue',  async (_, userId) => { try { return db.getOverdueDocuments(userId); } catch { return []; } });
ipcMain.handle('docs:expiring', async (_, { userId, days }) => { try { return db.getExpiringDocuments(userId, days||7); } catch { return []; } });

// ==================== PAYMENTS ====================
ipcMain.handle('payments:add',    async (_, d) => { try { return { success: true, payment: db.addPayment(d) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('payments:getAll', async (_, id) => db.getPayments(id));
ipcMain.handle('payments:delete', async (_, id) => { try { db.deletePayment(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== CLIENTS ====================
ipcMain.handle('clients:getAll',  async (_, userId) => db.getClients(userId));
ipcMain.handle('clients:getById', async (_, id) => db.getClientById(id));
ipcMain.handle('clients:save',    async (_, data) => { try { return { success: true, client: db.saveClient(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('clients:delete',  async (_, id) => { try { db.deleteClient(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('clients:history', async (_, { userId, clientName }) => { try { return db.getClientHistory(userId, clientName); } catch { return {}; } });

// ==================== SERVICES ====================
ipcMain.handle('services:getAll',   async (_, userId) => db.getServices(userId));
ipcMain.handle('services:save',     async (_, data) => { try { return { success: true, service: db.saveService(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('services:delete',   async (_, id) => { try { db.deleteService(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('services:cats:get', async (_, userId) => db.getServiceCategories(userId));
ipcMain.handle('services:cats:save',async (_, data) => { try { return { success: true, category: db.saveServiceCategory(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('services:cats:del', async (_, id) => { try { db.deleteServiceCategory(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== COMPANY ====================
ipcMain.handle('company:get',         async (_, userId) => db.getCompanySettings(userId));
ipcMain.handle('company:save',        async (_, data) => { try { return { success: true, company: db.saveCompanySettings(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('company:saveImages',  async (_, data) => { try { db.saveCompanyImages(data.userId, data); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('company:removeImage', async (_, { userId, imageType }) => { try { db.removeCompanyImage(userId, imageType); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== SETTINGS ====================
ipcMain.handle('settings:get',          async (_, userId) => db.getUserSettings(userId));
ipcMain.handle('settings:update',       async (_, { userId, settings }) => { try { return { success: true, settings: db.updateUserSettings(userId, settings) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('settings:resetCounter', async (_, { userId, type, year }) => { try { db.resetDocumentCounter(userId, type, year || new Date().getFullYear()); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== THEMES ====================
ipcMain.handle('theme:get',     async (_, userId) => db.getThemeSettings(userId));
ipcMain.handle('theme:save',    async (_, { userId, theme }) => { try { db.saveThemeSettings(userId, theme); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('doctheme:get',  async (_, userId) => db.getDocumentTheme(userId));
ipcMain.handle('doctheme:save', async (_, { userId, theme }) => { try { db.saveDocumentTheme(userId, theme); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== STATS ====================
ipcMain.handle('stats:get',      async (_, userId) => db.getDashboardStats(userId));
ipcMain.handle('stats:annual',   async (_, { userId, year }) => db.getAnnualStats(userId, year));
ipcMain.handle('stats:client',   async (_, { userId, clientName }) => db.getClientStats(userId, clientName));
ipcMain.handle('stats:expenses', async (_, { userId, year }) => db.getExpenseSummary(userId, year));

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
ipcMain.handle('export:excel:retenues', async (_, { retenues, filePath }) => {
    try {
        if (!filePath) { const r = await dialog.showSaveDialog(mainWindow, { defaultPath: `retenues-${Date.now()}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] }); if (r.canceled) return { success: false }; filePath = r.filePath; }
        const XLSX = require('xlsx');
        const rows = retenues.map(r => ({
            'Numéro': r.number, 'Date': r.date, 'Année': r.year, 'Mois': r.month,
            'Retenu par': r.retenuerName, 'MF Retenu': r.retenuerMF||'',
            'Bénéficiaire': r.beneficiaireName, 'MF Bénéficiaire': r.beneficiaireMF||'',
            'N° Facture': r.factureNumber||'', 'Date Facture': r.factureDate||'',
            'Montant Brut': r.montantBrut, 'Taux %': r.tauxRetenue, 'Montant Retenu': r.montantRetenue,
            'Nature Revenu': r.natureRevenu, 'Statut': r.status
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Retenues');
        XLSX.writeFile(wb, filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== NOTES ====================
ipcMain.handle('notes:getAll', async (_, userId) => db.getNotes(userId));
ipcMain.handle('notes:save',   async (_, data) => { try { return { success: true, note: db.saveNote(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('notes:delete', async (_, id) => { try { db.deleteNote(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== REMINDERS ====================
ipcMain.handle('reminders:getAll',   async (_, userId) => db.getReminders(userId));
ipcMain.handle('reminders:save',     async (_, data) => { try { return { success: true, reminder: db.saveReminder(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('reminders:delete',   async (_, id) => { try { db.deleteReminder(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('reminders:markDone', async (_, id) => { try { db.markReminderDone(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== HR (EMPLOYEES & PAYSLIPS) ====================
ipcMain.handle('hr:getEmployees',    async (_, userId) => db.getEmployees(userId));
ipcMain.handle('hr:saveEmployee',    async (_, data) => { try { return { success: true, employee: db.saveEmployee(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('hr:deleteEmployee',  async (_, id) => { try { db.deleteEmployee(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('hr:getPayslips',     async (_, userId) => db.getPayslips(userId));
ipcMain.handle('hr:savePayslip',     async (_, data) => { try { return { success: true, payslip: db.savePayslip(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('hr:deletePayslip',   async (_, id) => { try { db.deletePayslip(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const due = db.getDueReminders();
        due.forEach(r => {
            if (Notification.isSupported()) new Notification({ title: '⏰ Rappel Factarlou', body: r.title }).show();
            mainWindow.webContents.send('reminder:due', r);
        });
    } catch {}
}, 10 * 60 * 1000);

// ==================== BACKUP ====================
ipcMain.handle('backup:settings:get',  () => backupScheduler.getSettings());
ipcMain.handle('backup:settings:save', (_, s) => { backupScheduler.saveSettings(s); backupScheduler.start(); return { success: true }; });
ipcMain.handle('backup:create:manual', async () => await backupScheduler.createBackup(true));
ipcMain.handle('backup:list',          () => backupScheduler.getBackupList());
ipcMain.handle('backup:restore',       async (_, p) => { try { await backupScheduler.restoreBackup(p); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== EMAIL ====================
ipcMain.handle('email:send', async (_, { userId, to, subject, body, attachments }) => {
    try {
        const settings = db.getUserSettings(userId);
        if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
            throw new Error('SMTP non configuré dans les paramètres');
        }

        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port,
            secure: settings.smtp_secure === 1,
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_pass
            }
        });

        const info = await transporter.sendMail({
            from: settings.smtp_user,
            to,
            subject,
            text: body,
            attachments: attachments || []
        });

        return { success: true, messageId: info.messageId };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== CONTRACTS ====================
ipcMain.handle('contracts:getAll',  async (_, userId) => db.getContracts(userId));
ipcMain.handle('contracts:getById', async (_, id) => db.getContractById(id));
ipcMain.handle('contracts:save',    async (_, data) => { try { return { success: true, contract: db.saveContract(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('contracts:delete',  async (_, id) => { try { db.deleteContract(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== EMPLOYEES ====================
// ==================== RETENUE À LA SOURCE ====================
ipcMain.handle('retenues:getAll',  async (_, userId) => db.getRetenues(userId));
ipcMain.handle('retenues:getById', async (_, id) => db.getRetenueById(id));
ipcMain.handle('retenues:save',    async (_, data) => { try { return { success: true, retenue: db.saveRetenue(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('retenues:delete',  async (_, id) => { try { db.deleteRetenue(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('retenues:createFromFacture', async (_, { userId, factureId, tauxRetenue }) => {
    try {
        const retenue = db.createRetenueFromFacture(userId, factureId, tauxRetenue || 1.5);
        return { success: true, retenue };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('retenues:byFacture', async (_, factureId) => { try { return db.getRetenuesByFacture(factureId); } catch { return []; } });
ipcMain.handle('retenues:buildHTML', async (_, { retenueId, theme }) => {
    try {
        const retenue = db.getRetenueById(retenueId);
        if (!retenue) throw new Error('Retenue introuvable');
        const html = buildRetenueHTML(retenue, theme || null);
        return { success: true, html };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('hr:buildPayslipHTML', async (_, { payslip, employee, company }) => {
    try {
        const { buildPayslipHTML } = require('./renderer/retenue-builder');
        const html = buildPayslipHTML(payslip, employee, company);
        return { success: true, html };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== EXPENSES ====================
ipcMain.handle('expenses:getAll',  async (_, userId) => db.getExpenses(userId));
ipcMain.handle('expenses:getById', async (_, id)     => db.getExpenseById(id));
ipcMain.handle('expenses:save',    async (_, data)   => { try { return { success: true, expense: db.saveExpense(data) }; }  catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('expenses:delete',  async (_, id)     => { 
    try { 
        const attachPath = db.deleteExpense(id); 
        if (attachPath && fs.existsSync(attachPath)) fs.unlinkSync(attachPath);
        return { success: true }; 
    } catch (e) { return { success: false, error: e.message }; } 
});
ipcMain.handle('expenses:summary', async (_, { userId, year }) => { try { return db.getExpenseSummary(userId, year); } catch (e) { return { success: false, error: e.message }; } });

// ==================== SCANNER ====================
ipcMain.handle('scanner:pickFile', async () => {
    const r = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Documents', extensions: ['pdf','png','jpg','jpeg','webp'] }]
    });
    return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('scanner:storeFile', async (_, srcPath) => {
    try {
        const attachDir = path.join(app.getPath('userData'), 'attachments');
        fs.mkdirSync(attachDir, { recursive: true });
        const destName = `${Date.now()}_${path.basename(srcPath)}`;
        const destPath = path.join(attachDir, destName);
        fs.copyFileSync(srcPath, destPath);
        const buf    = fs.readFileSync(srcPath);
        const base64 = buf.toString('base64');
        const ext    = path.extname(srcPath).toLowerCase().slice(1);
        const mime   = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        return { success: true, path: destPath, originalName: path.basename(srcPath), base64, mimeType: mime, isPdf: ext === 'pdf' };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('scanner:extractPdfText', async (_, filePath) => {
    try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fs.readFileSync(filePath));
        return { success: true, text: data.text };
    } catch (e) { return { success: false, error: e.message, text: '' }; }
});

ipcMain.handle('scanner:ocrImage', async (_, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'Fichier non trouvé' };
    }
    let worker = null;
    try {
        const { createWorker } = require('tesseract.js');
        worker = await createWorker('fra+ara');
        
        // Optimize for invoices
        await worker.setParameters({
            tessedit_pageseg_mode: '3', // PSM 3: Fully automatic page segmentation, but no OSD.
            tessjs_create_hocr: '0',
            tessjs_create_tsv: '0',
        });

        const { data: { text } } = await worker.recognize(filePath);
        console.log('--- RAW OCR START ---');
        console.log(text);
        console.log('--- RAW OCR END ---');
        return { success: true, text };
    } catch (e) {
        console.error('OCR Error:', e);
        return { success: false, error: e.message, text: '' };
    } finally {
        if (worker) { try { await worker.terminate(); } catch {} }
    }
});

ipcMain.handle('scanner:openAttachment', async (_, filePath) => {
    try { shell.openPath(filePath); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('scanner:deleteAttachment', async (_, filePath) => {
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
});

// ==================== TOOLS ====================
ipcMain.handle('tools:openCalculator', async () => {
    try {
        if (calculatorWindow && !calculatorWindow.isDestroyed()) {
            calculatorWindow.focus();
            return { success: true };
        }
        calculatorWindow = new BrowserWindow({
            width: 520, height: 680, title: 'Calculatrice Fiscale — Factarlou',
            icon: path.join(__dirname, '../assets/iconblack2.png'),
            parent: mainWindow, modal: false, resizable: true, minimizable: true, maximizable: false,
            webPreferences: { contextIsolation: true, nodeIntegration: false }
        });
        const calcPath = path.join(__dirname, 'calculator.html');
        if (fs.existsSync(calcPath)) {
            await calculatorWindow.loadFile(calcPath);
        } else {
            const fallback = path.join(path.dirname(__dirname), 'calculator.html');
            await calculatorWindow.loadFile(fs.existsSync(fallback) ? fallback : calcPath);
        }
        calculatorWindow.on('closed', () => { calculatorWindow = null; });
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('tools:relanceLetter', async (_, { docId, userId, attempt }) => {
    try {
        const doc = db.getDocumentById(docId);
        if (!doc) throw new Error('Document introuvable');
        const company = db.getCompanySettings(userId);
        const html = buildRelanceHTML(doc, company, attempt || 1);
        return { success: true, html };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('tools:fiscalSummary', async (_, { userId, year, quarter }) => {
    try {
        const summary = db.getFiscalSummary(userId, year || new Date().getFullYear(), quarter || null);
        const company = db.getCompanySettings(userId);
        const html = buildFiscalSummaryHTML(summary, company);
        return { success: true, html, summary };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== FS HELPERS ====================
ipcMain.handle('fs:openFolder',   async (_, p) => { try { shell.openPath(p); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('fs:selectFolder', async () => { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });