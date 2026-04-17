const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AppDatabase = require('./db');

let mainWindow;
let db;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
    mainWindow.maximize();
}

app.whenReady().then(() => {
    db = new AppDatabase();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ========== IPC HANDLERS ==========

ipcMain.handle('auth-login', async (event, { email, password }) => {
    try {
        const user = db.loginUser(email, password);
        return { success: true, user };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('auth-register', async (event, userData) => {
    try {
        const user = db.registerUser(userData);
        return { success: true, user };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-company', async (event, userId) => {
    try {
        return db.getCompanySettings(userId) || {};
    } catch (err) {
        console.error('get-company error:', err);
        return {};
    }
});

ipcMain.handle('save-company', async (event, settings) => {
    try {
        return db.saveCompanySettings(settings);
    } catch (err) {
        console.error('save-company error:', err);
        throw err;
    }
});

ipcMain.handle('get-documents', async (event, userId) => {
    return db.getDocuments(userId);
});

ipcMain.handle('save-document', async (event, docData) => {
    const doc = db.saveDocument(docData);
    return { success: true, document: doc };
});

ipcMain.handle('update-document', async (event, { docId, updates }) => {
    updates.id = docId;
    const doc = db.saveDocument(updates);
    return { success: true, document: doc };
});

ipcMain.handle('delete-document', async (event, docId) => {
    db.deleteDocument(docId);
    return { success: true };
});

ipcMain.handle('get-next-doc-number', async (event, { userId, type, year }) => {
    return db.getNextDocumentNumber(userId, type, year);
});

ipcMain.handle('convert-document', async (event, { sourceId, targetType, userId, year }) => {
    const source = db.getDocumentById(sourceId);
    if (!source) throw new Error('Document not found');
    const newDoc = {
        ...source,
        id: null,
        type: targetType,
        number: db.getNextDocumentNumber(userId, targetType, year),
        date: new Date().toISOString().slice(0,10)
    };
    const saved = db.saveDocument(newDoc);
    return { success: true, document: saved };
});

ipcMain.handle('get-clients', async (event, userId) => {
    return db.getClients(userId);
});

ipcMain.handle('save-client', async (event, clientData) => {
    return db.saveClient(clientData);
});

ipcMain.handle('delete-client', async (event, clientId) => {
    db.deleteClient(clientId);
    return { success: true };
});

ipcMain.handle('get-services', async (event, userId) => {
    return db.getServices(userId);
});

ipcMain.handle('save-service', async (event, serviceData) => {
    return db.saveService(serviceData);
});

ipcMain.handle('delete-service', async (event, serviceId) => {
    db.deleteService(serviceId);
    return { success: true };
});

ipcMain.handle('get-stats', async (event, userId) => {
    try {
        return db.getDashboardStats(userId);
    } catch (err) {
        console.error('get-stats error:', err);
        return { totalDocs: 0, totalRevenue: 0, totalClients: 0, thisMonth: 0 };
    }
});

ipcMain.handle('get-settings', async (event, userId) => {
    return db.getUserSettings(userId);
});

ipcMain.handle('update-settings', async (event, { userId, settings }) => {
    return db.updateUserSettings(userId, settings);
});

ipcMain.handle('reset-counter', async (event, { userId, type, year }) => {
    return db.resetDocumentCounter(userId, type, year);
});

// Backup handlers (simplified – you can expand later)
ipcMain.handle('get-backup-settings', async () => {
    return { enabled: false, frequency: 'daily', time: '02:00', keepCount: 10 };
});
ipcMain.handle('save-backup-settings', async (event, settings) => {
    return { success: true };
});
ipcMain.handle('get-backup-list', async () => {
    return [];
});
ipcMain.handle('create-manual-backup', async () => {
    return { success: true };
});
ipcMain.handle('restore-backup', async (event, backupPath) => {
    return { success: true };
});

ipcMain.handle('get-theme-settings', async (event, userId) => {
    return db.getThemeSettings(userId);
});
ipcMain.handle('save-theme-settings', async (event, { userId, theme }) => {
    return db.saveThemeSettings(userId, theme);
});

// ========== REAL PDF GENERATION ==========
ipcMain.handle('save-pdf', async (event, { html, filename }) => {
    try {
        // Create a temporary window to render the HTML
        const pdfWindow = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true }
        });
        await pdfWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        const pdfData = await pdfWindow.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });
        pdfWindow.close();

        // Show save dialog
        const { filePath, canceled } = await dialog.showSaveDialog({
            title: 'Enregistrer le PDF',
            defaultPath: filename,
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (canceled || !filePath) return { success: false, canceled: true };

        fs.writeFileSync(filePath, pdfData);
        return { success: true, path: filePath };
    } catch (err) {
        console.error('PDF generation error:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('print-pdf', async (event, { html }) => {
    try {
        const printWindow = new BrowserWindow({ show: false });
        await printWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        printWindow.webContents.print({ silent: false });
        printWindow.close();
        return { success: true };
    } catch (err) {
        console.error('Print error:', err);
        return { success: false, error: err.message };
    }
});