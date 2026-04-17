const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Modules
const Database = require('./database/db');
const BackupScheduler = require('./backup-scheduler');
const ExcelExporter = require('./exporters/excel-exporter');

// Init
const db = new Database();
const excelExporter = new ExcelExporter();

let mainWindow;
let backupScheduler;

// ==================== WINDOW ====================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    mainWindow.once('ready-to-show', () => mainWindow.show());

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    backupScheduler = new BackupScheduler(db);
    backupScheduler.start();
}

// ==================== APP ====================
app.whenReady().then(() => {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ==================== PDF HANDLERS ====================

/**
 * pdf:save — Generate PDF from HTML string and save to a user-chosen location.
 */
ipcMain.handle('pdf:save', async (_, { html, filename }) => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: filename || 'document.pdf',
            filters: [{ name: 'Fichiers PDF', extensions: ['pdf'] }]
        });

        if (canceled || !filePath) return { success: false, canceled: true };

        const pdfWin = new BrowserWindow({
            show: false,
            webPreferences: { offscreen: true }
        });

        await pdfWin.loadURL(
            'data:text/html;charset=utf-8,' + encodeURIComponent(html)
        );

        await new Promise(resolve => setTimeout(resolve, 400));

        const pdfData = await pdfWin.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            marginsType: 0,
            landscape: false
        });

        pdfWin.close();
        fs.writeFileSync(filePath, pdfData);
        shell.showItemInFolder(filePath);

        return { success: true, path: filePath };
    } catch (error) {
        console.error('[pdf:save] Error:', error);
        return { success: false, error: error.message };
    }
});

/**
 * pdf:print — Generate a temporary PDF from HTML and open the system print dialog.
 */
ipcMain.handle('pdf:print', async (_, { html }) => {
    try {
        const pdfWin = new BrowserWindow({
            show: false,
            webPreferences: { offscreen: false }
        });

        await pdfWin.loadURL(
            'data:text/html;charset=utf-8,' + encodeURIComponent(html)
        );

        await new Promise(resolve => setTimeout(resolve, 400));

        await new Promise((resolve, reject) => {
            pdfWin.webContents.print(
                { silent: false, printBackground: true, color: true },
                (success, errorType) => {
                    if (success) resolve();
                    else {
                        if (errorType === 'cancelled') resolve();
                        else reject(new Error(errorType));
                    }
                }
            );
        });

        pdfWin.close();
        return { success: true };
    } catch (error) {
        console.error('[pdf:print] Error:', error);
        return { success: false, error: error.message };
    }
});

// ==================== AUTH ====================
ipcMain.handle('auth:register', async (_, userData) => {
    try {
        const user = db.registerUser(userData);
        return { success: true, user };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('auth:login', async (_, { email, password }) => {
    try {
        const user = db.loginUser(email, password);
        return { success: true, user };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== DOCUMENTS ====================
ipcMain.handle('docs:getAll', async (_, userId) => db.getDocuments(userId));

ipcMain.handle('docs:getById', async (_, id) => db.getDocumentById(id));

ipcMain.handle('docs:save', async (_, data) => {
    try {
        const doc = db.saveDocument(data);
        return { success: true, document: doc };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('docs:update', async (_, { docId, updates }) => {
    try {
        const existing = db.getDocumentById(docId);
        if (!existing) throw new Error('Document introuvable');

        const updated = { ...existing, ...updates, id: docId };
        const result = db.saveDocument(updated);

        return { success: true, document: result };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('docs:delete', async (_, id) => {
    try {
        await Promise.resolve(db.deleteDocument(id));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('docs:getNextNumber', async (_, args) => {
    return db.getNextDocumentNumber(args.userId, args.type, args.year);
});

// Convert document
ipcMain.handle('docs:convert', async (_, { sourceId, targetType, newNumber, userId, year }) => {
    try {
        const source = db.getDocumentById(sourceId);
        if (!source) throw new Error('Document source introuvable');

        const number = newNumber || db.getNextDocumentNumber(userId, targetType, year);

        const note = `Converti depuis ${source.type.toUpperCase()} N° ${source.number} du ${source.date}`;

        const newDoc = {
            ...source,
            id: undefined,
            type: targetType,
            number,
            date: new Date().toISOString().split('T')[0],
            dueDate: targetType === 'facture'
                ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
                : null,
            notes: source.notes ? `${source.notes}\n\n${note}` : note
        };

        const result = db.saveDocument(newDoc);

        return { success: true, document: result };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== CLIENTS ====================
ipcMain.handle('clients:getAll', async (_, userId) => db.getClients(userId));

ipcMain.handle('clients:save', async (_, data) => {
    try {
        const client = db.saveClient(data);
        return { success: true, client };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('clients:delete', async (_, id) => {
    try {
        await Promise.resolve(db.deleteClient(id));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== SERVICES ====================
ipcMain.handle('services:getAll', async (_, userId) => db.getServices(userId));

ipcMain.handle('services:save', async (_, data) => {
    try {
        const service = db.saveService(data);
        return { success: true, service };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('services:delete', async (_, id) => {
    try {
        await Promise.resolve(db.deleteService(id));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== COMPANY ====================
ipcMain.handle('company:get', async (_, userId) => db.getCompanySettings(userId));

ipcMain.handle('company:save', async (_, settings) => {
    try {
        const company = db.saveCompanySettings(settings);
        return { success: true, company };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('company:saveImages', async (_, { userId, logoImage, stampImage, signatureImage }) => {
    try {
        db.saveCompanyImages(userId, { logoImage, stampImage, signatureImage });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('company:removeImage', async (_, { userId, imageType }) => {
    try {
        db.removeCompanyImage(userId, imageType);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== SETTINGS ====================
ipcMain.handle('settings:get', async (_, userId) => db.getUserSettings(userId));

ipcMain.handle('settings:update', async (_, { userId, settings }) => {
    try {
        const updated = db.updateUserSettings(userId, settings);
        return { success: true, settings: updated };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('settings:resetCounter', async (_, { userId, type, year }) => {
    try {
        db.resetDocumentCounter(userId, type, year || new Date().getFullYear());
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== THEME ====================
ipcMain.handle('theme:get', async (_, userId) => db.getThemeSettings(userId));

ipcMain.handle('theme:save', async (_, { userId, theme }) => {
    try {
        db.saveThemeSettings(userId, theme);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== STATS ====================
ipcMain.handle('stats:get', async (_, userId) => db.getDashboardStats(userId));

// ==================== EXCEL ====================
ipcMain.handle('export:excel:documents', async (_, { documents, filePath }) => {
    try {
        if (!filePath) {
            const res = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `documents-${Date.now()}.xlsx`,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }]
            });
            if (res.canceled) return { success: false };
            filePath = res.filePath;
        }

        excelExporter.exportMultipleDocuments(documents, filePath);

        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('export:excel:clients', async (_, { clients, filePath }) => {
    try {
        if (!filePath) {
            const res = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `clients-${Date.now()}.xlsx`,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }]
            });
            if (res.canceled) return { success: false };
            filePath = res.filePath;
        }

        excelExporter.exportClients(clients, filePath);

        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== BACKUP ====================
ipcMain.handle('backup:settings:get', () => backupScheduler.getSettings());

ipcMain.handle('backup:settings:save', (_, settings) => {
    backupScheduler.saveSettings(settings);
    backupScheduler.start();
    return { success: true };
});

ipcMain.handle('backup:create:manual', async () => {
    return await backupScheduler.createBackup(true);
});

ipcMain.handle('backup:list', () => backupScheduler.getBackupList());

ipcMain.handle('backup:restore', async (_, path) => {
    try {
        await backupScheduler.restoreBackup(path);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== CONTRACTS ====================
ipcMain.handle('contracts:getAll', async (_, userId) => db.getContracts(userId));

ipcMain.handle('contracts:getById', async (_, id) => db.getContractById(id));

ipcMain.handle('contracts:save', async (_, data) => {
    try {
        const contract = db.saveContract(data);
        return { success: true, contract };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('contracts:delete', async (_, id) => {
    try {
        db.deleteContract(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== AUTO UPDATER ====================
autoUpdater.on('update-available', () => {
    console.log('Update available...');
});

autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Mise à jour disponible',
        message: 'Une nouvelle version est prête. Redémarrer maintenant ?',
        buttons: ['Redémarrer', 'Plus tard']
    }).then(res => {
        if (res.response === 0) autoUpdater.quitAndInstall();
    });
});