const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const Database = require('./database/db');
const BackupScheduler = require('./backup-scheduler');
const ExcelExporter = require('./exporters/excel-exporter');

const db = new Database();
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

app.whenReady().then(() => { createWindow(); autoUpdater.checkForUpdatesAndNotify(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ==================== PDF ====================
ipcMain.handle('pdf:save', async (_, { html, filename }) => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: filename || 'document.pdf',
            filters: [{ name: 'Fichiers PDF', extensions: ['pdf'] }]
        });
        if (canceled || !filePath) return { success: false, canceled: true };
        const pdfWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
        await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        await new Promise(r => setTimeout(r, 400));
        const pdfData = await pdfWin.webContents.printToPDF({ pageSize: 'A4', printBackground: true, marginsType: 0, landscape: false });
        pdfWin.close();
        fs.writeFileSync(filePath, pdfData);
        shell.showItemInFolder(filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('pdf:print', async (_, { html }) => {
    try {
        const pdfWin = new BrowserWindow({ show: false, webPreferences: { offscreen: false } });
        await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        await new Promise(r => setTimeout(r, 400));
        await new Promise((resolve, reject) => {
            pdfWin.webContents.print({ silent: false, printBackground: true, color: true }, (success, errorType) => {
                if (success || errorType === 'cancelled') resolve(); else reject(new Error(errorType));
            });
        });
        pdfWin.close();
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== AUTH ====================
ipcMain.handle('auth:register', async (_, d) => { try { return { success: true, user: db.registerUser(d) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('auth:login',    async (_, d) => { try { return { success: true, user: db.loginUser(d.email, d.password) }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== DOCUMENTS ====================
ipcMain.handle('docs:getAll',       async (_, userId) => db.getDocuments(userId));
ipcMain.handle('docs:getById',      async (_, id)     => db.getDocumentById(id));
ipcMain.handle('docs:save',         async (_, data)   => { try { return { success: true, document: db.saveDocument(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:update',       async (_, { docId, updates }) => {
    try {
        const existing = db.getDocumentById(docId);
        if (!existing) throw new Error('Document introuvable');
        return { success: true, document: db.saveDocument({ ...existing, ...updates, id: docId }) };
    } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('docs:delete',       async (_, id) => { try { db.deleteDocument(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('docs:getNextNumber',async (_, { userId, type, year }) => db.getNextDocumentNumber(userId, type, year));
ipcMain.handle('docs:convert',      async (_, { sourceId, targetType, userId, year }) => {
    try {
        const source = db.getDocumentById(sourceId);
        if (!source) throw new Error('Source introuvable');
        const number = db.getNextDocumentNumber(userId, targetType, year);
        const note = `Converti depuis ${source.type.toUpperCase()} N° ${source.number} du ${source.date}`;
        const newDoc = { ...source, id: undefined, type: targetType, number, date: new Date().toISOString().split('T')[0],
            dueDate: targetType==='facture' ? new Date(Date.now()+30*86400000).toISOString().split('T')[0] : null,
            notes: source.notes ? `${source.notes}\n\n${note}` : note, paymentStatus: 'unpaid', paidAmount: 0 };
        return { success: true, document: db.saveDocument(newDoc) };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== PAYMENTS ====================
ipcMain.handle('payments:add',    async (_, data) => { try { return { success: true, payment: db.addPayment(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('payments:getAll', async (_, docId) => db.getPayments(docId));
ipcMain.handle('payments:delete', async (_, id) => { try { db.deletePayment(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== CLIENTS ====================
ipcMain.handle('clients:getAll', async (_, userId) => db.getClients(userId));
ipcMain.handle('clients:save',   async (_, data)   => { try { return { success: true, client: db.saveClient(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('clients:delete', async (_, id)     => { try { db.deleteClient(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== SERVICES ====================
ipcMain.handle('services:getAll', async (_, userId) => db.getServices(userId));
ipcMain.handle('services:save',   async (_, data)   => { try { return { success: true, service: db.saveService(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('services:delete', async (_, id)     => { try { db.deleteService(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== COMPANY ====================
ipcMain.handle('company:get',         async (_, userId) => db.getCompanySettings(userId));
ipcMain.handle('company:save',        async (_, data)   => { try { return { success: true, company: db.saveCompanySettings(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('company:saveImages',  async (_, data)   => { try { db.saveCompanyImages(data.userId, data); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('company:removeImage', async (_, { userId, imageType }) => { try { db.removeCompanyImage(userId, imageType); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== SETTINGS ====================
ipcMain.handle('settings:get',    async (_, userId) => db.getUserSettings(userId));
ipcMain.handle('settings:update', async (_, { userId, settings }) => {
    try { return { success: true, settings: db.updateUserSettings(userId, settings) }; } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('settings:resetCounter', async (_, { userId, type, year }) => {
    try { db.resetDocumentCounter(userId, type, year||new Date().getFullYear()); return { success: true }; } catch (e) { return { success: false, error: e.message }; }
});

// ==================== THEME ====================
ipcMain.handle('theme:get',  async (_, userId)         => db.getThemeSettings(userId));
ipcMain.handle('theme:save', async (_, { userId, theme }) => { try { db.saveThemeSettings(userId, theme); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// Document visual theme (full JSON)
ipcMain.handle('doctheme:get',  async (_, userId)           => db.getDocumentTheme(userId));
ipcMain.handle('doctheme:save', async (_, { userId, theme }) => { try { db.saveDocumentTheme(userId, theme); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== STATS ====================
ipcMain.handle('stats:get', async (_, userId) => db.getDashboardStats(userId));

// ==================== EXCEL ====================
ipcMain.handle('export:excel:documents', async (_, { documents, filePath }) => {
    try {
        if (!filePath) {
            const res = await dialog.showSaveDialog(mainWindow, { defaultPath: `documents-${Date.now()}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
            if (res.canceled) return { success: false };
            filePath = res.filePath;
        }
        excelExporter.exportMultipleDocuments(documents, filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('export:excel:clients', async (_, { clients, filePath }) => {
    try {
        if (!filePath) {
            const res = await dialog.showSaveDialog(mainWindow, { defaultPath: `clients-${Date.now()}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
            if (res.canceled) return { success: false };
            filePath = res.filePath;
        }
        excelExporter.exportClients(clients, filePath);
        return { success: true, path: filePath };
    } catch (e) { return { success: false, error: e.message }; }
});

// ==================== BACKUP ====================
ipcMain.handle('backup:settings:get',    ()      => backupScheduler.getSettings());
ipcMain.handle('backup:settings:save',   (_, s)  => { backupScheduler.saveSettings(s); backupScheduler.start(); return { success: true }; });
ipcMain.handle('backup:create:manual',   async() => await backupScheduler.createBackup(true));
ipcMain.handle('backup:list',            ()      => backupScheduler.getBackupList());
ipcMain.handle('backup:restore',         async (_, p) => { try { await backupScheduler.restoreBackup(p); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== CONTRACTS ====================
ipcMain.handle('contracts:getAll',  async (_, userId) => db.getContracts(userId));
ipcMain.handle('contracts:getById', async (_, id)     => db.getContractById(id));
ipcMain.handle('contracts:save',    async (_, data)   => { try { return { success: true, contract: db.saveContract(data) }; } catch (e) { return { success: false, error: e.message }; } });
ipcMain.handle('contracts:delete',  async (_, id)     => { try { db.deleteContract(id); return { success: true }; } catch (e) { return { success: false, error: e.message }; } });

// ==================== AUTO UPDATER ====================
autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, { type: 'info', title: 'Mise à jour disponible', message: 'Une nouvelle version est prête. Redémarrer ?', buttons: ['Redémarrer', 'Plus tard'] })
        .then(res => { if (res.response === 0) autoUpdater.quitAndInstall(); });
});