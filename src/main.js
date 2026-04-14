const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Database and modules
const Database = require('./database/db');
const BackupScheduler = require('./backup-scheduler');
const ExcelExporter = require('./exporters/excel-exporter');

// Initialize
const db = new Database();
const excelExporter = new ExcelExporter();
let backupScheduler;
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Initialize backup scheduler
    backupScheduler = new BackupScheduler(db);
    backupScheduler.start();
}

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

// ==================== IPC HANDLERS ====================

// AUTH
ipcMain.handle('auth:register', async (event, userData) => {
    try {
        const result = db.registerUser(userData);
        return { success: true, user: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
        const result = db.loginUser(email, password);
        return { success: true, user: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// DOCUMENTS
ipcMain.handle('docs:getAll', async (event, userId) => {
    return db.getDocuments(userId);
});

ipcMain.handle('docs:getById', async (event, docId) => {
    return db.getDocumentById(docId);
});

ipcMain.handle('docs:save', async (event, docData) => {
    try {
        const result = db.saveDocument(docData);
        return { success: true, document: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('docs:delete', async (event, docId) => {
    try {
        db.deleteDocument(docId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('docs:getNextNumber', async (event, { userId, type, year }) => {
    return db.getNextDocumentNumber(userId, type, year);
});

// NEW: Document conversion (Devis -> Facture, etc.)
ipcMain.handle('docs:convert', async (event, { sourceId, targetType, newNumber, userId, year }) => {
    try {
        const sourceDoc = db.getDocumentById(sourceId);
        if (!sourceDoc) throw new Error("Document source introuvable");

        // Generate new number if not provided
        const finalNumber = newNumber || db.getNextDocumentNumber(userId, targetType, year);
        
        // Create conversion note
        const conversionNote = `Converti depuis ${sourceDoc.type.toUpperCase()} N° ${sourceDoc.number} du ${sourceDoc.date}`;
        const newNotes = sourceDoc.notes ? `${sourceDoc.notes}\n\n${conversionNote}` : conversionNote;

        const newDocData = {
            userId: sourceDoc.userId,
            type: targetType,
            number: finalNumber,
            date: new Date().toISOString().split('T')[0],
            dueDate: targetType === 'facture' ? new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] : null,
            currency: sourceDoc.currency,
            paymentMode: sourceDoc.paymentMode,
            companyName: sourceDoc.companyName,
            companyMF: sourceDoc.companyMF,
            companyAddress: sourceDoc.companyAddress,
            companyPhone: sourceDoc.companyPhone,
            companyEmail: sourceDoc.companyEmail,
            companyRC: sourceDoc.companyRC,
            clientName: sourceDoc.clientName,
            clientMF: sourceDoc.clientMF,
            clientAddress: sourceDoc.clientAddress,
            clientPhone: sourceDoc.clientPhone,
            clientEmail: sourceDoc.clientEmail,
            items: sourceDoc.items,
            applyTimbre: sourceDoc.applyTimbre,
            timbreAmount: sourceDoc.timbreAmount,
            totalHT: sourceDoc.totalHT,
            totalTTC: sourceDoc.totalTTC,
            logoImage: sourceDoc.logoImage,
            stampImage: sourceDoc.stampImage,
            signatureImage: sourceDoc.signatureImage,
            notes: newNotes
        };

        const result = db.saveDocument(newDocData);
        return { success: true, document: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// NEW: Document edit/update
ipcMain.handle('docs:update', async (event, { docId, updates }) => {
    try {
        const existingDoc = db.getDocumentById(docId);
        if (!existingDoc) throw new Error("Document introuvable");

        // Merge updates with existing data, keep same ID
        const updatedData = {
            ...existingDoc,
            ...updates,
            id: docId
        };

        const result = db.saveDocument(updatedData);
        return { success: true, document: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// CLIENTS
ipcMain.handle('clients:getAll', async (event, userId) => {
    return db.getClients(userId);
});

ipcMain.handle('clients:save', async (event, clientData) => {
    try {
        const result = db.saveClient(clientData);
        return { success: true, client: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('clients:delete', async (event, clientId) => {
    try {
        db.deleteClient(clientId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// COMPANY
ipcMain.handle('company:get', async (event, userId) => {
    return db.getCompanySettings(userId);
});

ipcMain.handle('company:save', async (event, settings) => {
    try {
        const result = db.saveCompanySettings(settings);
        return { success: true, company: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// STATS
ipcMain.handle('stats:get', async (event, userId) => {
    return db.getDashboardStats(userId);
});

// NEW: SERVICES
ipcMain.handle('services:getAll', async (event, userId) => {
    return db.getServices(userId);
});

ipcMain.handle('services:save', async (event, serviceData) => {
    try {
        const result = db.saveService(serviceData);
        return { success: true, service: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('services:delete', async (event, serviceId) => {
    try {
        db.deleteService(serviceId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// NEW: USER SETTINGS (Serial Numbers)
ipcMain.handle('settings:get', async (event, userId) => {
    return db.getUserSettings(userId);
});

ipcMain.handle('settings:update', async (event, { userId, settings }) => {
    try {
        const result = db.updateUserSettings(userId, settings);
        return { success: true, settings: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('settings:resetCounter', async (event, { userId, type, year }) => {
    try {
        db.resetDocumentCounter(userId, type, year || new Date().getFullYear());
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// EXPORT EXCEL
ipcMain.handle('export:excel:documents', async (event, { documents, filePath }) => {
    if (!filePath) {
        const result = await dialog.showSaveDialog({
            defaultPath: `documents-${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        });
        if (result.canceled) return { success: false };
        filePath = result.filePath;
    }
    
    try {
        excelExporter.exportMultipleDocuments(documents, filePath);
        return { success: true, path: filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export:excel:clients', async (event, { clients, filePath }) => {
    if (!filePath) {
        const result = await dialog.showSaveDialog({
            defaultPath: `clients-${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        });
        if (result.canceled) return { success: false };
        filePath = result.filePath;
    }
    
    try {
        excelExporter.exportClients(clients, filePath);
        return { success: true, path: filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// PDF EXPORT
ipcMain.handle('pdf:export', async (event, { html, filename }) => {
    const { filePath } = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (filePath) {
        const win = new BrowserWindow({ show: false });
        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        const pdf = await win.webContents.printToPDF({ 
            format: 'A4', 
            printBackground: true,
            margins: { marginType: 'none' }
        });
        fs.writeFileSync(filePath, pdf);
        win.close();
        return { success: true, path: filePath };
    }
    return { success: false };
});

// BACKUP
ipcMain.handle('backup:settings:get', () => {
    return backupScheduler.getSettings();
});

ipcMain.handle('backup:settings:save', (event, settings) => {
    backupScheduler.saveSettings(settings);
    backupScheduler.start();
    return { success: true };
});

ipcMain.handle('backup:create:manual', async () => {
    const result = await backupScheduler.createBackup(true);
    return result;
});

ipcMain.handle('backup:list', () => {
    return backupScheduler.getBackupList();
});

ipcMain.handle('backup:restore', async (event, backupPath) => {
    try {
        await backupScheduler.restoreBackup(backupPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== AUTO-UPDATER EVENTS ====================

autoUpdater.on('update-available', () => {
    // You could send a message to the renderer or just log it
    console.log('Mise à jour disponible...');
});

autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Mise à jour prête',
        message: 'Une nouvelle version a été téléchargée. Voulez-vous redémarrer pour l\'installer ?',
        buttons: ['Redémarrer', 'Plus tard']
    }).then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
    });
});