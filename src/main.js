const { app, BrowserWindow, ipcMain, dialog, shell, Notification, safeStorage } = require('electron');
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
const { buildInvoiceHTML } = require('./renderer/builders/invoice-builder');
const { create } = require('xmlbuilder2');
const XLSX = require('xlsx');

/**
 * Helper to convert a local file path to base64 data URI
 * Necessary because offscreen BrowserWindows cannot load local file paths reliably.
 */
function imagePathToBase64(filePath) {
    if (!filePath) return null;
    // If it's already a data URI, return as is
    if (typeof filePath === 'string' && filePath.startsWith('data:')) return filePath;
    try {
        if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            const ext = path.extname(filePath).toLowerCase().slice(1);
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
            return `data:${mime};base64,${buf.toString('base64')}`;
        }
    } catch (e) {
        console.error(`[base64] Error converting ${filePath}:`, e.message);
    }
    return filePath; // Return original if conversion fails
}

const db            = new Database();
const excelExporter = new ExcelExporter();

let mainWindow;
let backupScheduler;
let calculatorWindow = null;
let ocrWorker = null;

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

    if (process.platform === 'darwin') {
        try {
            // Try multiple ways to find the downloaded DMG
            const cacheDir = path.join(app.getPath('userData'), 'pending'); // electron-updater cache location
            
            // Find the DMG file — try info first, then scan cache
            let downloadedPath = info.downloadedFile || (info.files && info.files[0] && info.files[0].path);
            
            if (!downloadedPath || !fs.existsSync(downloadedPath)) {
                // Scan the cache directory for the DMG
                if (fs.existsSync(cacheDir)) {
                    const files = fs.readdirSync(cacheDir)
                        .filter(f => f.endsWith('.dmg'))
                        .map(f => path.join(cacheDir, f));
                    if (files.length > 0) downloadedPath = files[0];
                }
            }
            
            if (!downloadedPath || !fs.existsSync(downloadedPath)) {
                // Fallback — just open website
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: '🚀 Mise à jour disponible',
                    message: `Factarlou v${info.version} est prêt`,
                    detail: 'Téléchargez le fichier DMG depuis notre site et remplacez l\'application dans votre dossier Applications.',
                    buttons: ['Ouvrir le site web', 'Plus tard'],
                    defaultId: 0
                }).then(r => {
                    if (r.response === 0) {
                        shell.openExternal('https://www.factarlou.online/');
                    }
                });
                return;
            }

            // Copy DMG to Downloads folder
            const downloadsFolder = app.getPath('downloads');
            const fileName = `Factarlou-${info.version}.dmg`;
            const destPath = path.join(downloadsFolder, fileName);
            
            fs.copyFileSync(downloadedPath, destPath);
            
            // Show notification
            if (Notification.isSupported()) {
                new Notification({ 
                    title: '✅ Factarlou mis à jour',
                    body: `v${info.version} est dans votre dossier Téléchargements`
                }).show();
            }

            // Show dialog with clear instructions
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '🚀 Mise à jour prête',
                message: `Factarlou v${info.version} est dans votre dossier Téléchargements`,
                detail: `Pour installer la mise à jour :\n\n1. Ouvrez le fichier "${fileName}"\n2. Faites glisser Factarlou vers Applications\n3. Cliquez sur "Remplacer"\n4. Relancez l'application\n\n⚠️ Fermez Factarlou avant d'installer.`,
                buttons: ['📁 Ouvrir Téléchargements', '✕ Plus tard'],
                defaultId: 0,
                cancelId: 1
            }).then(r => {
                if (r.response === 0) {
                    shell.openPath(downloadsFolder);
                }
            });

        } catch (e) {
            console.error('[updater] Mac copy error:', e);
            shell.openExternal('https://www.factarlou.online/');
        }
    } else {
        // Windows behavior stays automatic
        dialog.showMessageBox(mainWindow, {
            type: 'info', title: '🎉 Mise à jour prête',
            message: `Factarlou ${info.version} est téléchargé et prêt.`,
            detail: 'Redémarrez maintenant pour appliquer la mise à jour, ou elle s\'installera automatiquement au prochain démarrage.',
            buttons: ['🔄 Redémarrer maintenant', '⏰ Plus tard'],
            defaultId: 0, cancelId: 1
        }).then(r => { 
            if (r.response === 0) {
                setImmediate(() => {
                    app.removeAllListeners("window-all-closed");
                    autoUpdater.quitAndInstall(false, true);
                });
            }
        });
    }
});
autoUpdater.on('error', (err) => { sendUpdate('error', { message: err.message }); console.error('[updater]', err); });

ipcMain.handle('updater:check',   async () => { try { const r = await autoUpdater.checkForUpdates(); return { success: true, version: r?.updateInfo?.version }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('updater:install', () => {
    setImmediate(() => {
        app.removeAllListeners("window-all-closed");
        autoUpdater.quitAndInstall(false, true);
    });
});
ipcMain.handle('app:version', () => {
    let v = app.getVersion();
    if (v === '0.0.0' || !v) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
            v = pkg.version;
        } catch { v = '2.6.0'; }
    }
    return v;
});

// ==================== PDF ====================
async function handlePDFGeneration(html, callback) {
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    const tempPath = path.join(app.getPath('temp'), `print-${uuidv4()}.html`);
    try {
        fs.writeFileSync(tempPath, html, 'utf8');
        await win.loadFile(tempPath);
        
        // Wait for all images and fonts to load for rendering stability
        await win.webContents.executeJavaScript(`
            Promise.all([
                document.fonts.ready,
                ...Array.from(document.images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => { img.onload = img.onerror = resolve; });
                })
            ])
        `);
        
        const data = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, marginsType: 0 });
        return data;
    } finally {
        win.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
}

ipcMain.handle('pdf:save', async (_, { html, filename }) => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, { defaultPath: filename || 'document.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
        if (canceled || !filePath) return { success: false, canceled: true };
        
        const data = await handlePDFGeneration(html);
        fs.writeFileSync(filePath, data);
        shell.showItemInFolder(filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('pdf:print', async (_, { html }) => {
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } });
    const tempPath = path.join(app.getPath('temp'), `print-${uuidv4()}.html`);
    try {
        fs.writeFileSync(tempPath, html, 'utf8');
        await win.loadFile(tempPath);
        
        // Wait for all images and fonts to load
        await win.webContents.executeJavaScript(`
            Promise.all([
                document.fonts.ready,
                ...Array.from(document.images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => { img.onload = img.onerror = resolve; });
                })
            ])
        `);
        
        await new Promise((res, rej) => win.webContents.print({ silent: false, printBackground: true }, (ok, err) => { 
            if (ok || err === 'cancelled') res(); else rej(new Error(err)); 
        }));
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally {
        win.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
});

ipcMain.handle('pdf:generateBuffer', async (_, { html }) => {
    try {
        const data = await handlePDFGeneration(html);
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
        const isFactureOrAvoir = ['facture', 'avoir'].includes(targetType);
        return { success: true, document: db.saveDocument({ ...src, id: undefined, type: targetType, number: num, date: new Date().toISOString().split('T')[0], dueDate: isFactureOrAvoir ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null, referenceDoc: targetType === 'avoir' ? src.number : null, notes: src.notes ? `${src.notes}\n\n${note}` : note, paymentStatus: 'unpaid', paidAmount: 0 }) };
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
ipcMain.handle('docs:buildHTML', async (_, { docId, userId }) => {
    try {
        const doc = db.getDocumentById(docId);
        if (!doc) throw new Error('Document introuvable');
        const company = db.getCompanySettings(userId || doc.user_id);
        
        // Wrap images for base64 conversion
        if (company) {
            company.logo_image = imagePathToBase64(company.logo_image);
            company.stamp_image = imagePathToBase64(company.stamp_image);
            company.signature_image = imagePathToBase64(company.signature_image);
        }
        
        // Prepare data for builder
        const data = {
            ...doc,
            companyName: company?.name,
            companyMF: company?.mf,
            companyAddress: company?.address,
            logoImage: imagePathToBase64(doc.logoImage) || company?.logo_image,
            stampImage: imagePathToBase64(doc.stampImage) || company?.stamp_image,
            signatureImage: imagePathToBase64(doc.signatureImage) || company?.signature_image,
            // Ensure fiscal fields from database match what builder expects
            totalHT: doc.totalHT || 0,
            totalTVA: doc.totalTVA || 0,
            totalTTC: doc.totalTTC || 0,
            timbreFiscal: doc.timbreAmount || 0,
            referenceDoc: doc.referenceDoc || null,
            tvaLines: doc.items ? [] : [] // Builder handles items and extracts TVA
        };

        const html = buildInvoiceHTML(data);
        return { success: true, html };
    } catch (e) { return { success: false, error: e.message }; }
});

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
ipcMain.handle('settings:get',          async (_, userId) => {
    const settings = db.getUserSettings(userId);
    if (settings && settings.smtp_pass && safeStorage.isEncryptionAvailable()) {
        try { settings.smtp_pass = safeStorage.decryptString(Buffer.from(settings.smtp_pass, 'base64')); } catch {}
    }
    return settings;
});
ipcMain.handle('settings:update',       async (_, { userId, settings }) => { 
    try { 
        if (settings.smtp_pass && safeStorage.isEncryptionAvailable()) {
            settings.smtp_pass = safeStorage.encryptString(settings.smtp_pass).toString('base64');
        }
        return { success: true, settings: db.updateUserSettings(userId, settings) }; 
    } catch (e) { return { success: false, error: e.message }; } 
});
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

        let smtpPass = settings.smtp_pass;
        if (smtpPass && safeStorage.isEncryptionAvailable()) {
            try { smtpPass = safeStorage.decryptString(Buffer.from(smtpPass, 'base64')); } catch {}
        }

        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port,
            secure: settings.smtp_secure === 1,
            auth: {
                user: settings.smtp_user,
                pass: smtpPass
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
        const company = db.getCompanySettings(retenue.user_id);
        
        // Wrap images for base64 conversion
        if (company) {
            company.logo_image = imagePathToBase64(company.logo_image);
            company.stamp_image = imagePathToBase64(company.stamp_image);
            company.signature_image = imagePathToBase64(company.signature_image);
        }
        if (retenue) {
            retenue.logoImage = imagePathToBase64(retenue.logoImage);
            retenue.stampImage = imagePathToBase64(retenue.stampImage);
            retenue.signatureImage = imagePathToBase64(retenue.signatureImage);
        }

        const html = buildRetenueHTML({ ...retenue, ...company }, theme || null);
        return { success: true, html };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('hr:buildPayslipHTML', async (_, { payslip, employee, company }) => {
    try {
        const { buildPayslipHTML } = require('./renderer/retenue-builder');
        
        // Wrap images in company for base64 conversion
        if (company) {
            company.logo_image = imagePathToBase64(company.logo_image);
            company.stamp_image = imagePathToBase64(company.stamp_image);
            company.signature_image = imagePathToBase64(company.signature_image);
        }

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
    try {
        if (!ocrWorker) {
            const { createWorker } = require('tesseract.js');
            ocrWorker = await createWorker('fra+ara');
            
            // Optimize for invoices
            await ocrWorker.setParameters({
                tessedit_pageseg_mode: '3', // PSM 3: Fully automatic page segmentation, but no OSD.
                tessjs_create_hocr: '0',
                tessjs_create_tsv: '0',
            });
        }

        const { data: { text } } = await ocrWorker.recognize(filePath);
        console.log('--- RAW OCR START ---');
        console.log(text);
        console.log('--- RAW OCR END ---');
        return { success: true, text };
    } catch (e) {
        console.error('OCR Error:', e);
        return { success: false, error: e.message, text: '' };
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
        
        // Wrap images for base64 conversion
        if (company) {
            company.logo_image = imagePathToBase64(company.logo_image);
            company.stamp_image = imagePathToBase64(company.stamp_image);
            company.signature_image = imagePathToBase64(company.signature_image);
        }
        if (doc) {
            doc.logoImage = imagePathToBase64(doc.logoImage);
            doc.stampImage = imagePathToBase64(doc.stampImage);
            doc.signatureImage = imagePathToBase64(doc.signatureImage);
        }

        const html = buildRelanceHTML(doc, company, attempt || 1);
        return { success: true, html };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('tools:fiscalSummary', async (_, { userId, year, quarter }) => {
    try {
        const summary = db.getFiscalSummary(userId, year || new Date().getFullYear(), quarter || null);
        const company = db.getCompanySettings(userId);
        
        // Wrap images for base64 conversion
        if (company) {
            company.logo_image = imagePathToBase64(company.logo_image);
            company.stamp_image = imagePathToBase64(company.stamp_image);
            company.signature_image = imagePathToBase64(company.signature_image);
        }

        const html = buildFiscalSummaryHTML(summary, company);
        return { success: true, html, summary };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('tools:searchRNE', async (_, mf) => {
    try {
        // Clean MF: replace / with nothing for the API endpoint
        const cleanMF = (mf || '').replace(/\//g, '').trim();
        if (!cleanMF) throw new Error('MF invalide');

        // We use the short-details endpoint which is public
        const url = `https://www.registre-entreprises.tn/api/rne-api/front-office/entites/short-details/${cleanMF}`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!response.ok) {
            if (response.status === 404) return { success: false, error: 'Matricule non trouvé sur le RNE' };
            throw new Error(`RNE API Error: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (e) {
        console.error('[RNE Search Error]:', e);
        return { success: false, error: e.message };
    }
});

// ==================== FS HELPERS ====================
ipcMain.handle('fs:openFolder',   async (_, p) => { try { shell.openPath(p); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('fs:selectFolder', async () => { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });

// ── TEJ EXPORT HANDLERS ──────────────────────────────────────────
ipcMain.handle('export:tej:getData', async (_, params) => {
    try { return db.getTEJData(params); } catch (e) { console.error(e); return []; }
});

ipcMain.handle('export:tej:generate', async (event, { type, month, year, codeActe, company, data }) => {
    try {
        const monthStr = String(month).padStart(2, '0');
        const mfClean = (company.mf || '0000000').replace(/[^a-zA-Z0-9]/g, '');
        const defaultFilename = `${mfClean}-${year}-${monthStr}-${codeActe}.xml`;
        
        const { filePath, canceled } = await dialog.showSaveDialog({
            title: `Enregistrer l'export XML ${type}`,
            defaultPath: defaultFilename,
            filters: [{ name: 'Fichiers XML', extensions: ['xml'] }]
        });
        
        if (canceled) return { success: false, canceled: true };
        
        let xmlString = '';
        
        if (type === 'RS') {
            // Schema: DeclarationsRS
            const root = create({ version: '1.0', encoding: 'UTF-8' })
                .ele('DeclarationsRS')
                    .ele('Declarant')
                        .ele('Identifiant').txt(company.mf || '').up()
                        .ele('RaisonSociale').txt(company.name || '').up()
                    .up()
                    .ele('ReferenceDeclaration')
                        .ele('Annee').txt(year.toString()).up()
                        .ele('Mois').txt(month.toString()).up()
                        .ele('CodeActe').txt(codeActe.toString()).up()
                    .up()
                    .ele('AjouterCertificats');
            
            data.forEach(item => {
                root.ele('Certificat')
                    .ele('Beneficiaire')
                        .ele('Identifiant').txt(item.beneficiaire_mf || '').up()
                        .ele('NomPrenomRaisonSociale').txt(item.beneficiaire_name || '').up()
                    .up()
                    .ele('DetailsCertificat')
                        .ele('DateCertificat').txt(item.date || '').up()
                        .ele('MontantBrut').txt((item.montant_brut || 0).toFixed(3)).up()
                        .ele('MontantRetenue').txt((item.montant_retenue || 0).toFixed(3)).up()
                    .up()
                .up();
            });
            
            xmlString = root.end({ prettyPrint: true });
        } else {
            // Schema: DeclarationsTEIF
            const root = create({ version: '1.0', encoding: 'UTF-8' })
                .ele('DeclarationsTEIF')
                    .ele('Declarant')
                        .ele('Identifiant').txt(company.mf || '').up()
                        .ele('RaisonSociale').txt(company.name || '').up()
                    .up()
                    .ele('ReferenceDeclaration')
                        .ele('Annee').txt(year.toString()).up()
                        .ele('Mois').txt(month.toString()).up()
                        .ele('CodeActe').txt(codeActe.toString()).up()
                    .up()
                    .ele('ListeFactures');
            
            data.forEach(item => {
                root.ele('Facture')
                    .ele('Numero').txt(item.number || '').up()
                    .ele('Date').txt(item.date || '').up()
                    .ele('Client')
                        .ele('Identifiant').txt(item.client_mf || '').up()
                        .ele('Nom').txt(item.client_name || '').up()
                    .up()
                    .ele('MontantHT').txt((item.total_ht || 0).toFixed(3)).up()
                    .ele('MontantTTC').txt((item.total_ttc || 0).toFixed(3)).up()
                .up();
            });
            
            xmlString = root.end({ prettyPrint: true });
        }
        
        fs.writeFileSync(filePath, xmlString, 'utf8');
        return { success: true, path: filePath };
    } catch (e) {
        console.error('TEJ Export Error:', e);
        return { success: false, error: e.message };
    }
});