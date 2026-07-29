const { app, BrowserWindow, ipcMain, dialog, shell, Notification, safeStorage, Tray, Menu, globalShortcut, session } = require('electron');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { autoUpdater } = require('electron-updater');

const Database = require('./database/db');
const BackupScheduler = require('./backup-scheduler');
const ExcelExporter = require('./exporters/excel-exporter');
const CSVExporter = require('./exporters/csv-exporter');
const { validateDocSave, validateClientSave, validateExpenseSave, validateSettings, validateRecurringInvoice } = require('./validate');
const { buildRetenueHTML, buildRelanceHTML, buildFiscalSummaryHTML } = require('./renderer/retenue-builder');
const { buildInvoiceHTML } = require('./renderer/builders/invoice-builder');
const { create } = require('xmlbuilder2');
const XLSX = require('xlsx');

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

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
    return null; // Return null if conversion fails
}

const db = new Database();
const excelExporter = new ExcelExporter();
const csvExporter = new CSVExporter();

let mainWindow;
let backupScheduler;
let calculatorWindow = null;
let ocrWorker = null;

function loadWindowState() {
    try {
        const p = path.join(app.getPath('userData'), 'window-state.json');
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, 'utf8'));
        }
    } catch {}
    return { width: 1400, height: 900 };
}

function createWindow() {
    const savedState = loadWindowState();
    const winOpts = {
        width: savedState.width || 1400,
        height: savedState.height || 900,
        minWidth: 1200,
        minHeight: 700,
        show: false,
        icon: path.join(__dirname, '../assets/iconblack2.png'),
        webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
    };
    if (savedState.x !== undefined) winOpts.x = savedState.x;
    if (savedState.y !== undefined) winOpts.y = savedState.y;
    mainWindow = new BrowserWindow(winOpts);
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // Save window state on resize/move/close
    const saveState = () => {
        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                const bounds = mainWindow.getBounds();
                const isMax = mainWindow.isMaximized();
                fs.writeFileSync(path.join(app.getPath('userData'), 'window-state.json'), JSON.stringify({ ...bounds, maximized: isMax }));
            }
        } catch {}
    };
    mainWindow.on('resize', saveState);
    mainWindow.on('move', saveState);
    mainWindow.on('close', saveState);

    mainWindow.once('ready-to-show', () => {
        if (savedState.maximized) mainWindow.maximize();
        mainWindow.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    backupScheduler = new BackupScheduler(db);
    backupScheduler.start();
}

app.whenReady().then(() => {
    const { protocol, net } = require('electron');
    const { pathToFileURL } = require('url');

    // H-08: Use protocol.handle for Electron 28+
    protocol.handle('media', async (request) => {
        try {
            const urlPath = decodeURIComponent(request.url.replace('media://', ''));
            const resolved = path.resolve(urlPath);
            const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
            const allowedDirs = [app.getPath('userData'), app.getPath('pictures'), app.getPath('home')];
            const isAllowed = allowedDirs.some(dir => {
                const realDir = fs.existsSync(dir) ? fs.realpathSync(dir) : path.resolve(dir);
                return real.startsWith(realDir);
            });
            if (!isAllowed) {
                return new Response('Access Denied', { status: 403 });
            }
            return net.fetch(pathToFileURL(real).toString());
        } catch (e) {
            return new Response(e.message, { status: 500 });
        }
    });

    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, '../assets/iconblack2.png'));
    }
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const csp =
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://nominatim.openstreetmap.org https://registre-entreprises.tn https://*.tile.openstreetmap.org";
        callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
    });
    createWindow();
    createTray();
    registerShortcuts();
    startRecurringCron();
    cleanupTempPDFs();
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => console.log('[updater] skipped:', err.message));
    }, 3000);
});
app.on('before-quit', () => stopRecurringCron());
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ==================== TRAY ICON ====================
let appTray = null;
function createTray() {
    try {
        const iconPath = path.join(__dirname, '../assets/iconblack2.png');
        appTray = new Tray(iconPath);
        appTray.setToolTip('Factarlou — Gestion facturation');

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Ouvrir Factarlou',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Nouvelle Facture',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.webContents.send('shortcut:newDoc', 'facture');
                    }
                }
            },
            {
                label: 'Nouveau Devis',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.webContents.send('shortcut:newDoc', 'devis');
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Tableau de bord',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.webContents.send('shortcut:navigate', 'dashboard');
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Quitter',
                click: () => {
                    app.isQuitting = true;
                    app.quit();
                }
            }
        ]);
        appTray.setContextMenu(contextMenu);
        appTray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    } catch (e) {
        console.error('[tray] Failed to create tray:', e.message);
    }
}

// ==================== KEYBOARD SHORTCUTS ====================
function registerShortcuts() {
    globalShortcut.register('CommandOrControl+N', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('shortcut:newDoc', 'facture');
        }
    });
    globalShortcut.register('CommandOrControl+Shift+N', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('shortcut:newDoc', 'devis');
        }
    });
    // H-09: Ctrl+F removed from global shortcuts to prevent system-wide Find hijacking
}

// H-13: Clean up temporary PDF files
function cleanupTempPDFs() {
    try {
        const tempDir = path.join(app.getPath('userData'), 'temp-pdfs');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const f of files) {
                try { fs.unlinkSync(path.join(tempDir, f)); } catch {}
            }
        }
    } catch (e) {
        console.error('[cleanup] temp-pdfs error:', e.message);
    }
}

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    cleanupTempPDFs();
    if (appTray) {
        appTray.destroy();
        appTray = null;
    }
    if (ocrWorker) {
        ocrWorker.terminate();
        ocrWorker = null;
    }
    // H-12: Graceful database shutdown
    if (db && typeof db.getDatabase === 'function' && db.getDatabase()) {
        try {
            db.getDatabase().close();
            console.log('[DB] Database closed cleanly on quit');
        } catch (e) {
            console.error('[DB] Error closing database on quit:', e.message);
        }
    }
});

// ==================== AUTO-UPDATER ====================
// H-11: Require user confirmation before downloading software updates
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
const sendUpdate = (event, payload = {}) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updater:event', { event, ...payload });
};
autoUpdater.on('checking-for-update', () => sendUpdate('checking'));
autoUpdater.on('update-available', info => {
    sendUpdate('available', { version: info.version, notes: info.releaseNotes });
    if (Notification.isSupported())
        new Notification({ title: 'Factarlou — Mise à jour', body: `Version ${info.version} est en cours de téléchargement…` }).show();
});
autoUpdater.on('update-not-available', info => sendUpdate('not-available', { version: info.version }));
autoUpdater.on('download-progress', p => {
    sendUpdate('progress', { percent: Math.round(p.percent), speed: p.bytesPerSecond, transferred: p.transferred, total: p.total });
    if (mainWindow && !mainWindow.isDestroyed()) {
        const fraction = p.percent / 100;
        if (process.platform === 'win32') mainWindow.setProgressBar(fraction);
        else if (process.platform === 'darwin' && app.dock?.setProgressBar) app.dock.setProgressBar(fraction);
    }
});
autoUpdater.on('update-downloaded', info => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (process.platform === 'win32') mainWindow.setProgressBar(-1);
        else if (process.platform === 'darwin' && app.dock?.setProgressBar) app.dock.setProgressBar(-1);
    }
    sendUpdate('downloaded', { version: info.version });

    if (process.platform === 'darwin') {
        try {
            // Find the downloaded DMG — try info props first, then scan temp
            let downloadedPath = info.downloadedFile || (info.files && info.files[0] && info.files[0].path) || info.path;

            if (!downloadedPath || !fs.existsSync(downloadedPath)) {
                const tempDir = app.getPath('temp');
                const files = fs
                    .readdirSync(tempDir)
                    .filter(f => f.endsWith('.dmg') && f.toLowerCase().includes('factarlou'))
                    .sort((a, b) => fs.statSync(path.join(tempDir, b)).mtimeMs - fs.statSync(path.join(tempDir, a)).mtimeMs)
                    .map(f => path.join(tempDir, f));
                if (files.length > 0) downloadedPath = files[0];
            }

            if (!downloadedPath || !fs.existsSync(downloadedPath)) {
                // Fallback — just open website
                dialog
                    .showMessageBox(mainWindow, {
                        type: 'info',
                        title: '🚀 Mise à jour disponible',
                        message: `Factarlou v${info.version} est prêt`,
                        detail: "Téléchargez le fichier DMG depuis notre site et remplacez l'application dans votre dossier Applications.",
                        buttons: ['Ouvrir le site web', 'Plus tard'],
                        defaultId: 0
                    })
                    .then(r => {
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
            dialog
                .showMessageBox(mainWindow, {
                    type: 'info',
                    title: '🚀 Mise à jour prête',
                    message: `Factarlou v${info.version} est dans votre dossier Téléchargements`,
                    detail: `Pour installer la mise à jour :\n\n1. Ouvrez le fichier "${fileName}"\n2. Faites glisser Factarlou vers Applications\n3. Cliquez sur "Remplacer"\n4. Relancez l'application\n\n⚠️ Fermez Factarlou avant d'installer.`,
                    buttons: ['📁 Ouvrir Téléchargements', '✕ Plus tard'],
                    defaultId: 0,
                    cancelId: 1
                })
                .then(r => {
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
        dialog
            .showMessageBox(mainWindow, {
                type: 'info',
                title: '🎉 Mise à jour prête',
                message: `Factarlou ${info.version} est téléchargé et prêt.`,
                detail: "Redémarrez maintenant pour appliquer la mise à jour, ou elle s'installera automatiquement au prochain démarrage.",
                buttons: ['🔄 Redémarrer maintenant', '⏰ Plus tard'],
                defaultId: 0,
                cancelId: 1
            })
            .then(r => {
                if (r.response === 0) {
                    setImmediate(() => {
                        app.removeAllListeners('window-all-closed');
                        autoUpdater.quitAndInstall(false, true);
                    });
                }
            });
    }
});
autoUpdater.on('error', err => {
    sendUpdate('error', { message: err.message });
    console.error('[updater]', err);
});

ipcMain.handle('updater:check', async () => {
    try {
        const r = await autoUpdater.checkForUpdates();
        const currentVersion = app.getVersion();
        const latestVersion = r?.updateInfo?.version;
        const hasUpdate = !!(latestVersion && currentVersion !== '0.0.0' && latestVersion !== currentVersion);
        return { success: true, version: latestVersion, hasUpdate, currentVersion };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('updater:install', () => {
    setImmediate(() => {
        app.removeAllListeners('window-all-closed');
        autoUpdater.quitAndInstall(false, true);
    });
});
ipcMain.handle('app:version', () => {
    let v = app.getVersion();
    if (v === '0.0.0' || !v) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
            v = pkg.version;
        } catch {
            v = '2.6.0';
        }
    }
    return v;
});

// ==================== PDF ====================
async function handlePDFGeneration(html) {
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
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: filename || 'document.pdf',
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (canceled || !filePath) return { success: false, canceled: true };

        const data = await handlePDFGeneration(html);
        fs.writeFileSync(filePath, data);
        shell.showItemInFolder(filePath);
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('pdf:print', async (_, { html }) => {
    const tempPath = path.join(app.getPath('temp'), `print-${uuidv4()}.html`);
    let win;
    try {
        win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } });
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

        await new Promise((res, rej) =>
            win.webContents.print({ silent: false, printBackground: true }, (ok, err) => {
                if (ok || err === 'cancelled') res();
                else rej(new Error(err));
            })
        );
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (win && !win.isDestroyed()) win.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
});

ipcMain.handle('pdf:generateBuffer', async (_, { html }) => {
    try {
        const data = await handlePDFGeneration(html);
        return { success: true, data: data };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== AUTH ====================
const loginAttempts = new Map();
ipcMain.handle('auth:register', async (_, d) => {
    try {
        return { success: true, user: db.registerUser(d) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('auth:login', async (_, d) => {
    const key = d.email;
    const record = loginAttempts.get(key);
    if (record && record.count >= 5 && Date.now() - record.firstAttempt < 15 * 60 * 1000) {
        return { success: false, error: 'Trop de tentatives. Attendez 15 minutes.' };
    }
    try {
        const result = db.loginUser(d.email, d.password);
        loginAttempts.delete(key);
        return { success: true, user: result };
    } catch (e) {
        if (!record) loginAttempts.set(key, { count: 1, firstAttempt: Date.now() });
        else {
            record.count++;
            loginAttempts.set(key, record);
        }
        return { success: false, error: e.message };
    }
});
ipcMain.handle('auth:changePassword', async (_, { userId, oldPassword, newPassword }) => {
    try {
        db.changePassword(userId, oldPassword, newPassword);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('auth:resetPasswordMasterKey', async (_, { email, masterKey, newPassword }) => {
    try {
        db.resetPasswordWithMasterKey(email, masterKey, newPassword);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== DOCUMENTS ====================
ipcMain.handle('docs:getAll', async (_, { userId, page, pageSize }) => {
    if (pageSize === -1) return db.getDocuments(userId);
    return db.getDocumentsPaginated(userId, page || 1, pageSize || 50);
});
ipcMain.handle('docs:getByType', async (_, { userId, type }) => db.getDocumentsByType(userId, type));
ipcMain.handle('docs:getById', async (_, id) => db.getDocumentById(id));
ipcMain.handle('docs:save', async (_, data) => {
    try {
        const errors = validateDocSave(data);
        if (errors.length > 0) return { success: false, error: 'Validation échouée: ' + errors.join('; ') };
        return { success: true, document: db.saveDocument(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('docs:update', async (_, { docId, updates }) => {
    try {
        const ex = db.getDocumentById(docId);
        if (!ex) throw new Error('Introuvable');
        const errors = validateDocSave({ ...ex, ...updates, id: docId });
        if (errors.length > 0) return { success: false, error: 'Validation échouée: ' + errors.join('; ') };
        return { success: true, document: db.saveDocument({ ...ex, ...updates, id: docId }) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('docs:delete', async (_, id) => {
    try {
        db.deleteDocument(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('docs:getNextNumber', async (_, { userId, type, year }) => db.getNextDocumentNumber(userId, type, year));
ipcMain.handle('docs:peekNextNumber', async (_, { userId, type, year }) => db.peekNextDocumentNumber(userId, type, year));
ipcMain.handle('docs:counterStatus', async (_, { userId, year }) => db.getCounterStatus(userId, year));
ipcMain.handle('docs:convert', async (_, { sourceId, targetType, userId, year }) => {
    try {
        const src = db.getDocumentById(sourceId);
        if (!src) throw new Error('Source introuvable');
        const num = db.getNextDocumentNumber(userId, targetType, year || new Date().getFullYear());
        const note = `← ${src.type.toUpperCase()} ${src.number}`;
        const isFactureOrAvoir = ['facture', 'avoir'].includes(targetType);
        const newDoc = db.saveDocument({
            ...src,
            id: undefined,
            type: targetType,
            number: num,
            date: new Date().toISOString().split('T')[0],
            dueDate: isFactureOrAvoir ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null,
            referenceDoc: src.id,
            notes: src.notes && !src.notes.startsWith('←') ? `${src.notes}\n\n${note}` : note,
            paymentStatus: 'unpaid',
            paidAmount: 0
        });

        // H-01: Bi-directional link — update original document internal notes when creating an Avoir
        if (targetType === 'avoir') {
            try {
                const noteMsg = `[AVOIR ÉMIS] Avoir N° ${num} généré le ${new Date().toISOString().split('T')[0]}`;
                db.getDatabase().prepare("UPDATE documents SET internal_notes = COALESCE(internal_notes || '\n', '') || ? WHERE id = ?")
                    .run(noteMsg, src.id);
            } catch (e) {
                console.error('[avoir] bi-directional update error:', e.message);
            }
        }

        return { success: true, document: newDoc };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('docs:duplicate', async (_, { docId, userId }) => {
    try {
        const src = db.getDocumentById(docId);
        if (!src) throw new Error('Introuvable');
        const num = db.getNextDocumentNumber(userId, src.type, new Date().getFullYear());
        return {
            success: true,
            document: db.saveDocument({
                ...src,
                id: undefined,
                number: num,
                date: new Date().toISOString().split('T')[0],
                dueDate: src.type === 'facture' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null,
                notes: src.notes || null,
                paymentStatus: 'unpaid',
                paidAmount: 0
            })
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('docs:search', async (_, { userId, query }) => {
    try {
        return db.searchDocuments(userId, query);
    } catch {
        return [];
    }
});
ipcMain.handle('docs:overdue', async (_, userId) => {
    try {
        return db.getOverdueDocuments(userId);
    } catch {
        return [];
    }
});
ipcMain.handle('docs:expiring', async (_, { userId, days }) => {
    try {
        return db.getExpiringDocuments(userId, days || 7);
    } catch {
        return [];
    }
});
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

        const settings = db.getUserSettings(userId || doc.user_id);

        // Prepare data for builder
        const data = {
            ...doc,
            companyName: company?.name,
            companyMF: company?.mf,
            companyAddress: company?.address,
            companyBank: doc.companyBank || company?.bank,
            companyRIB: doc.companyRIB || company?.rib,
            logoImage: imagePathToBase64(doc.logoImage) || company?.logo_image,
            stampImage: imagePathToBase64(doc.stampImage) || company?.stamp_image,
            signatureImage: imagePathToBase64(doc.signatureImage) || company?.signature_image,
            // Ensure fiscal fields from database match what builder expects
            totalHT: doc.totalHT || 0,
            totalTVA: doc.totalTVA || 0,
            totalTTC: doc.totalTTC || 0,
            timbreFiscal: doc.timbreAmount || 0,
            referenceDoc: doc.referenceDoc || null,
            decimalPlaces: settings?.decimal_places ?? 3,
            tvaLines: (() => {
                const items = doc.items || [];
                const m = {};
                items.forEach(it => {
                    const r = Number(it.tva) || 0;
                    const h = (Number(it.quantity) || 0) * (Number(it.price) || 0);
                    const ta = (h * r) / 100;
                    if (!m[r]) m[r] = { baseHT: 0, tvaAmount: 0 };
                    m[r].baseHT += h;
                    m[r].tvaAmount += ta;
                });
                return Object.entries(m)
                    .filter(([_, v]) => Math.abs(v.baseHT) > 0.0001)
                    .map(([rate, v]) => ({ rate: Number(rate), ...v }))
                    .sort((a, b) => b.rate - a.rate);
            })()
        };

        const html = buildInvoiceHTML(data);
        return { success: true, html };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('docs:generatePDF', async (_, { doc, company, decimalPlaces }) => {
    try {
        // Build HTML for the document
        const items = (doc.items || []).map(item => ({
            description: item.description || '',
            quantity: item.quantity || 1,
            price: item.price || 0,
            tva: item.tva || 19,
            total: (item.quantity || 0) * (item.price || 0)
        }));

        const totalHT = items.reduce((s, i) => s + i.total, 0);
        const tvaBuckets = {};
        items.forEach(i => {
            const rate = Number(i.tva) || 0;
            const amount = (i.total * rate) / 100;
            if (!tvaBuckets[rate]) tvaBuckets[rate] = 0;
            tvaBuckets[rate] += amount;
        });

        // Use standard buildInvoiceHTML builder for premium styling
        const data = {
            ...doc,
            companyName: doc.companyName || company?.name || '',
            companyMF: doc.companyMF || company?.mf || '',
            companyAddress: doc.companyAddress || company?.address || '',
            companyBank: doc.companyBank || company?.bank || '',
            companyRIB: doc.companyRIB || company?.rib || '',
            logoImage: imagePathToBase64(doc.logoImage) || company?.logo_image || '',
            stampImage: imagePathToBase64(doc.stampImage) || company?.stamp_image || '',
            signatureImage: imagePathToBase64(doc.signatureImage) || company?.signature_image || '',
            totalHT: doc.totalHT || totalHT || 0,
            totalTTC: doc.totalTTC || 0,
            timbreFiscal: doc.timbreAmount || 0,
            decimalPlaces: decimalPlaces ?? 3,
            tvaLines: Object.entries(tvaBuckets)
                .filter(([_, v]) => v > 0)
                .map(([rate, amount]) => ({
                    rate: Number(rate),
                    baseHT: items.filter(it => Number(it.tva) === Number(rate)).reduce((s, it) => s + it.total, 0),
                    tvaAmount: amount
                }))
                .sort((a, b) => b.rate - a.rate)
        };
        const html = buildInvoiceHTML(data);

        const pdfData = await handlePDFGeneration(html);

        // Save to a temp file in the user data directory
        const pdfDir = path.join(app.getPath('userData'), 'temp-pdfs');
        fs.mkdirSync(pdfDir, { recursive: true });
        const filename = `${(doc.number || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        const filePath = path.join(pdfDir, filename);
        fs.writeFileSync(filePath, pdfData);

        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('payments:add', async (_, d) => {
    try {
        return { success: true, payment: db.addPayment(d) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('payments:getAll', async (_, id) => db.getPayments(id));
ipcMain.handle('payments:delete', async (_, id) => {
    try {
        db.deletePayment(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== CLIENTS ====================
ipcMain.handle('clients:getAll', async (_, userId) => db.getClients(userId));
ipcMain.handle('clients:getById', async (_, id) => db.getClientById(id));
ipcMain.handle('clients:save', async (_, data) => {
    try {
        const errors = validateClientSave(data);
        if (errors.length > 0) return { success: false, error: 'Validation échouée: ' + errors.join('; ') };
        return { success: true, client: db.saveClient(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('clients:delete', async (_, id) => {
    try {
        db.deleteClient(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('clients:history', async (_, { userId, clientName }) => {
    try {
        return db.getClientHistory(userId, clientName);
    } catch {
        return {};
    }
});

// ==================== FOURNISSEURS ====================
ipcMain.handle('fournisseurs:getAll', async (_, userId) => db.getFournisseurs(userId));
ipcMain.handle('fournisseurs:getById', async (_, id) => db.getFournisseurById(id));
ipcMain.handle('fournisseurs:save', async (_, data) => {
    try {
        if (!data.name) return { success: false, error: 'Validation échouée: Le nom est requis.' };
        return { success: true, fournisseur: db.saveFournisseur(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('fournisseurs:delete', async (_, id) => {
    try {
        db.deleteFournisseur(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== SERVICES ====================
ipcMain.handle('services:getAll', async (_, userId) => db.getServices(userId));
ipcMain.handle('services:save', async (_, data) => {
    try {
        return { success: true, service: db.saveService(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('services:delete', async (_, id) => {
    try {
        db.deleteService(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('services:updateStock', async (_, updates) => {
    try {
        db.addStockBatch(updates);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('services:cats:get', async (_, userId) => db.getServiceCategories(userId));
ipcMain.handle('services:cats:save', async (_, data) => {
    try {
        return { success: true, category: db.saveServiceCategory(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('services:cats:del', async (_, id) => {
    try {
        db.deleteServiceCategory(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== COMPANY ====================
ipcMain.handle('company:get', async (_, userId) => db.getCompanySettings(userId));
ipcMain.handle('company:save', async (_, data) => {
    try {
        return { success: true, company: db.saveCompanySettings(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('company:saveImages', async (_, data) => {
    try {
        db.saveCompanyImages(data.userId, data);
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
ipcMain.handle('settings:get', async (_, userId) => {
    const settings = db.getUserSettings(userId);
    if (settings && settings.smtp_pass && safeStorage.isEncryptionAvailable()) {
        try {
            settings.smtp_pass = safeStorage.decryptString(Buffer.from(settings.smtp_pass, 'base64'));
        } catch (e) {
            // CRIT-11: Clear rather than leak encrypted blob on decryption failure
            console.error('[settings] SMTP password decryption failed:', e.message);
            settings.smtp_pass = '';
            settings._smtp_decrypt_error = true;
        }
    }
    return settings;
});
ipcMain.handle('settings:update', async (_, { userId, settings }) => {
    try {
        const errs = validateSettings(settings);
        if (errs.length > 0) {
            return { success: false, error: 'Validation échouée: ' + errs.join(', ') };
        }
        if (settings.smtp_pass && safeStorage.isEncryptionAvailable()) {
            settings.smtp_pass = safeStorage.encryptString(settings.smtp_pass).toString('base64');
        }
        return { success: true, settings: db.updateUserSettings(userId, settings) };
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

// ==================== THEMES ====================
ipcMain.handle('theme:get', async (_, userId) => db.getThemeSettings(userId));
ipcMain.handle('theme:save', async (_, { userId, theme }) => {
    try {
        db.saveThemeSettings(userId, theme);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('doctheme:get', async (_, userId) => db.getDocumentTheme(userId));
ipcMain.handle('doctheme:save', async (_, { userId, theme }) => {
    try {
        db.saveDocumentTheme(userId, theme);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== STATS ====================
ipcMain.handle('stats:get', async (_, userId) => db.getDashboardStats(userId));
ipcMain.handle('stats:annual', async (_, { userId, year }) => db.getAnnualStats(userId, year));
ipcMain.handle('stats:client', async (_, { userId, clientName }) => db.getClientStats(userId, clientName));
ipcMain.handle('stats:expenses', async (_, { userId, year }) => db.getExpenseSummary(userId, year));

// ==================== EXCEL ====================
ipcMain.handle('export:excel:documents', async (_, { documents, filePath }) => {
    try {
        if (!filePath) {
            const r = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `documents-${Date.now()}.xlsx`,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }]
            });
            if (r.canceled) return { success: false };
            filePath = r.filePath;
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
            const r = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `clients-${Date.now()}.xlsx`,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }]
            });
            if (r.canceled) return { success: false };
            filePath = r.filePath;
        }
        excelExporter.exportClients(clients, filePath);
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('export:excel:retenues', async (_, { retenues, filePath }) => {
    try {
        if (!filePath) {
            const r = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `retenues-${Date.now()}.xlsx`,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }]
            });
            if (r.canceled) return { success: false };
            filePath = r.filePath;
        }
        const rows = retenues.map(r => ({
            Numéro: r.number,
            Date: r.date,
            Année: r.year,
            Mois: r.month,
            'Retenu par': r.retenuerName,
            'MF Retenu': r.retenuerMF || '',
            Bénéficiaire: r.beneficiaireName,
            'MF Bénéficiaire': r.beneficiaireMF || '',
            'N° Facture': r.factureNumber || '',
            'Date Facture': r.factureDate || '',
            'Montant Brut': r.montantBrut,
            'Taux %': r.tauxRetenue,
            'Montant Retenu': r.montantRetenue,
            'Nature Revenu': r.natureRevenu,
            Statut: r.status
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Retenues');
        XLSX.writeFile(wb, filePath);
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('export:xlsx', async (_, { data, headers, filename }) => {
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const { filePath, canceled } = await dialog.showSaveDialog({
            title: 'Exporter vers Excel',
            defaultPath: filename || 'export.xlsx',
            filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        });
        if (canceled) return { success: false, canceled: true };
        fs.writeFileSync(filePath, buf);
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== CSV ====================
ipcMain.handle('export:csv:document', async (_, { document, filePath }) => {
    try {
        if (!filePath) {
            const r = await dialog.showSaveDialog(mainWindow, {
                defaultPath: `${document.number || 'document'}-${Date.now()}.csv`,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });
            if (r.canceled) return { success: false };
            filePath = r.filePath;
        }
        csvExporter.exportDocument(document, filePath);
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== NOTES ====================
ipcMain.handle('notes:getAll', async (_, userId) => db.getNotes(userId));
ipcMain.handle('notes:save', async (_, data) => {
    try {
        return { success: true, note: db.saveNote(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('notes:delete', async (_, id) => {
    try {
        db.deleteNote(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== REMINDERS ====================
ipcMain.handle('reminders:getAll', async (_, userId) => db.getReminders(userId));
ipcMain.handle('reminders:save', async (_, data) => {
    try {
        return { success: true, reminder: db.saveReminder(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('reminders:delete', async (_, id) => {
    try {
        db.deleteReminder(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('reminders:markDone', async (_, id) => {
    try {
        db.markReminderDone(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('relances:save', async (_, data) => {
    try {
        return { success: true, relance: db.saveRelance(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('relances:getByInvoice', async (_, invoiceId) => {
    try {
        return db.getRelancesByInvoice(invoiceId);
    } catch {
        return [];
    }
});
ipcMain.handle('relances:attemptCount', async (_, invoiceId) => {
    try {
        return db.getRelanceAttemptCount(invoiceId);
    } catch {
        return 0;
    }
});
ipcMain.handle('rates:getAll', async (_, userId) => {
    try {
        return db.getExchangeRates(userId);
    } catch {
        return [];
    }
});
ipcMain.handle('rates:save', async (_, data) => {
    try {
        return { success: true, rate: db.saveExchangeRate(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('rates:delete', async (_, { userId, currency }) => {
    try {
        db.deleteExchangeRate(userId, currency);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== HR (EMPLOYEES & PAYSLIPS) ====================
ipcMain.handle('hr:getEmployees', async (_, userId) => db.getEmployees(userId));
ipcMain.handle('hr:saveEmployee', async (_, data) => {
    try {
        return { success: true, employee: db.saveEmployee(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('hr:deleteEmployee', async (_, id) => {
    try {
        db.deleteEmployee(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('hr:getPayslips', async (_, userId) => db.getPayslips(userId));
ipcMain.handle('hr:savePayslip', async (_, data) => {
    try {
        return { success: true, payslip: db.savePayslip(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('hr:deletePayslip', async (_, id) => {
    try {
        db.deletePayslip(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

setInterval(
    () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        try {
            const due = db.getDueReminders();
            due.forEach(r => {
                if (Notification.isSupported()) new Notification({ title: '⏰ Rappel Factarlou', body: r.title }).show();
                mainWindow.webContents.send('reminder:due', r);
            });
        } catch {}
    },
    10 * 60 * 1000
);

// ==================== ACTIVITY LOG ====================
ipcMain.handle('activity:getAll', async (_, userId) => db.getActivityLog(userId, 50));
ipcMain.handle('activity:clear', async (_, userId) => {
    db.clearActivityLog(userId);
    return { success: true };
});

// ==================== BACKUP ====================
ipcMain.handle('backup:settings:get', () => backupScheduler.getSettings());
ipcMain.handle('backup:settings:save', (_, s) => {
    backupScheduler.saveSettings(s);
    backupScheduler.start();
    return { success: true };
});
ipcMain.handle('backup:create:manual', async () => await backupScheduler.createBackup(true));
ipcMain.handle('backup:list', () => backupScheduler.getBackupList());
ipcMain.handle('backup:restore', async (_, p) => {
    try {
        await backupScheduler.restoreBackup(p);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('backup:report', async (event, userId) => {
    if (!userId) return null;
    try {
        const rawDb = db.getDatabase();
        const docs = rawDb
            .prepare('SELECT COUNT(*) as count, COALESCE(SUM(total_ttc), 0) as total, type FROM documents WHERE user_id = ? GROUP BY type')
            .all(userId);
        const totalDocs = rawDb.prepare('SELECT COUNT(*) as c FROM documents WHERE user_id = ?').get(userId);
        const totalClients = rawDb.prepare('SELECT COUNT(*) as c FROM clients WHERE user_id = ?').get(userId);
        const totalServices = rawDb.prepare('SELECT COUNT(*) as c FROM services WHERE user_id = ?').get(userId);
        const totalExpenses = rawDb
            .prepare('SELECT COUNT(*) as c, COALESCE(SUM(amount_ttc), 0) as total FROM expenses WHERE user_id = ?')
            .get(userId);
        const totalRetenues = rawDb
            .prepare('SELECT COUNT(*) as c, COALESCE(SUM(montant_retenue), 0) as total FROM retenues WHERE user_id = ?')
            .get(userId);
        const totalContracts = rawDb.prepare('SELECT COUNT(*) as c FROM contracts WHERE user_id = ?').get(userId);
        const companyCount = rawDb.prepare('SELECT COUNT(*) as c FROM companies WHERE user_id = ?').get(userId);
        const user = rawDb.prepare('SELECT username, email FROM users WHERE id = ?').get(userId);
        return {
            generatedAt: new Date().toISOString(),
            user,
            documents: { total: totalDocs.c, byType: docs },
            clients: totalClients.c,
            services: totalServices.c,
            expenses: { count: totalExpenses.c, total: totalExpenses.total },
            retenues: { count: totalRetenues.c, total: totalRetenues.total },
            contracts: totalContracts.c,
            companies: companyCount.c
        };
    } catch (e) {
        return null;
    }
});

// ==================== EMAIL ====================
ipcMain.handle('email:send', async (_, { userId, to, subject, body, attachments }) => {
    try {
        const settings = db.getUserSettings(userId);
        if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
            throw new Error('SMTP non configuré dans les paramètres');
        }

        let smtpPass = settings.smtp_pass;
        if (smtpPass && safeStorage.isEncryptionAvailable()) {
            try {
                smtpPass = safeStorage.decryptString(Buffer.from(smtpPass, 'base64'));
            } catch (e) {
                throw new Error('Impossible de déchiffrer le mot de passe SMTP. Veuillez le reconfigurer.');
            }
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

        const safeAttachments = (attachments || []).filter(a => {
            if (!a.path) return true;
            const resolved = path.resolve(a.path);
            const allowedDir = path.join(app.getPath('userData'), 'attachments');
            return resolved.startsWith(allowedDir);
        });
        const info = await transporter.sendMail({
            from: settings.smtp_user,
            to,
            subject,
            text: body,
            attachments: safeAttachments
        });

        return { success: true, messageId: info.messageId };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('email:test', async (_, { host, port, user, pass, secure }) => {
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: !!secure,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000
        });
        await transporter.verify();
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
        return { success: true, contract: db.saveContract(data) };
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

// ==================== EMPLOYEES ====================
// ==================== RETENUE À LA SOURCE ====================
ipcMain.handle('retenues:getAll', async (_, userId) => db.getRetenues(userId));
ipcMain.handle('retenues:getById', async (_, id) => db.getRetenueById(id));
ipcMain.handle('retenues:save', async (_, data) => {
    try {
        return { success: true, retenue: db.saveRetenue(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('retenues:delete', async (_, id) => {
    try {
        db.deleteRetenue(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('retenues:createFromFacture', async (_, { userId, factureId, tauxRetenue }) => {
    try {
        const retenue = db.createRetenueFromFacture(userId, factureId, tauxRetenue || 1.5);
        return { success: true, retenue };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('retenues:byFacture', async (_, factureId) => {
    try {
        return db.getRetenuesByFacture(factureId);
    } catch {
        return [];
    }
});
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
    } catch (e) {
        return { success: false, error: e.message };
    }
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
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== POS (Point of Sale) ====================
ipcMain.handle('pos:getProducts', async (_, userId) => db.getProducts(userId));
ipcMain.handle('pos:getProductsPaginated', async (_, { userId, page, pageSize }) => db.getProductsPaginated(userId, page, pageSize));
ipcMain.handle('pos:getProductByBarcode', async (_, { userId, barcode }) => db.getProductByBarcode(userId, barcode));
ipcMain.handle('pos:updateStock', async (_, { id, quantity }) => {
    try {
        db.setStock(id, quantity);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('pos:saveSale', async (_, data) => {
    try {
        const id = uuidv4();
        const now = new Date().toISOString();
        const today = now.split('T')[0];
        // Reserve a document number
        const number = db.getNextDocumentNumber(data.userId, 'ticket', new Date().getFullYear());
        // H-14: POS sale Timbre fiscal support
        const applyTimbre = data.applyTimbre === true;
        const timbreAmount = applyTimbre ? 0.600 : 0;
        const docData = {
            id,
            userId: data.userId,
            type: 'ticket',
            number,
            date: today,
            clientName: data.clientName || 'Client du magasin',
            items: data.items,
            totalHT: data.totalHT,
            totalTVA: data.totalTVA || 0,
            totalTTC: data.totalTTC,
            applyTimbre,
            timbreAmount,
            paymentStatus: 'paid',
            paidAmount: data.totalTTC,
            paidDate: today,
            paymentMode: data.paymentMethod,
            currency: data.currency || 'TND',
            notes: data.notes || '',
            isPos: true,
            posSessionId: data.sessionId || null
        };
        const errs = validateDocSave(docData);
        if (errs.length > 0) {
            return { success: false, error: 'Validation échouée: ' + errs.join(', ') };
        }
        // Save as document
        db.saveDocument(docData);
        // Deduct stock for all items in a single transaction
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            db.deductStockBatch(data.items);
        }
        // Update session totals
        if (data.sessionId) {
            db.addPosSaleToSession(data.sessionId, data.totalTTC, data.paymentMethod);
        }
        return { success: true, id, number };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('pos:getSales', async (_, { userId, sessionId }) => db.getPosSales(userId, sessionId));
ipcMain.handle('pos:getTodaySales', async (_, userId) => db.getTodayPosSales(userId));
ipcMain.handle('pos:getSaleById', async (_, id) => db.getPosSaleById(id));
ipcMain.handle('pos:deleteSale', async (_, id) => {
    try {
        db.deleteDocument(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('pos:openSession', async (_, { userId, openingBalance }) => {
    try {
        return db.openSession(userId, openingBalance);
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('pos:closeSession', async (_, { id, closingCash, closingCard }) => {
    try {
        return db.closeSession(id, closingCash, closingCard);
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('pos:getActiveSession', async (_, userId) => db.getActiveSession(userId));
ipcMain.handle('pos:getSessions', async (_, userId) => db.getPosSessions(userId));
ipcMain.handle('pos:getLowStock', async (_, userId) => db.getLowStockProducts(userId));
ipcMain.handle('pos:getLoyaltyPoints', async (_, { userId, clientName }) => db.getLoyaltyPoints(userId, clientName));
ipcMain.handle('pos:addLoyaltyPoints', async (_, { userId, clientName, amount }) => {
    try {
        return db.addLoyaltyPoints(userId, clientName, amount);
    } catch (e) {
        return 0;
    }
});

// ==================== EXPENSES ====================
ipcMain.handle('expenses:getAll', async (_, userId) => db.getExpenses(userId));
ipcMain.handle('expenses:getById', async (_, id) => db.getExpenseById(id));
ipcMain.handle('expenses:save', async (_, data) => {
    try {
        const errors = validateExpenseSave(data);
        if (errors.length > 0) return { success: false, error: 'Validation échouée: ' + errors.join('; ') };
        return { success: true, expense: db.saveExpense(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('expenses:delete', async (_, id) => {
    try {
        const attachPath = db.deleteExpense(id);
        if (attachPath && fs.existsSync(attachPath)) fs.unlinkSync(attachPath);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('expenses:summary', async (_, { userId, year }) => {
    try {
        return db.getExpenseSummary(userId, year);
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== SCANNER ====================
ipcMain.handle('scanner:pickFile', async () => {
    const r = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Documents', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] }]
    });
    return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('scanner:storeFile', async (_, srcPath) => {
    try {
        const resolved = path.resolve(srcPath);
        const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
        const allowed = [
            app.getPath('home'),
            app.getPath('downloads'),
            app.getPath('desktop'),
            app.getPath('documents'),
            app.getPath('pictures')
        ];
        // H-06: Use realpathSync to prevent path traversal via symlinks
        const isAllowed = allowed.some(dir => {
            const realDir = fs.existsSync(dir) ? fs.realpathSync(dir) : path.resolve(dir);
            return real.startsWith(realDir);
        });
        if (!isAllowed) {
            return { success: false, error: 'Chemin de fichier non autorisé' };
        }
        const attachDir = path.join(app.getPath('userData'), 'attachments');
        fs.mkdirSync(attachDir, { recursive: true });
        const destName = `${Date.now()}_${path.basename(srcPath)}`;
        const destPath = path.join(attachDir, destName);
        fs.copyFileSync(srcPath, destPath);
        const buf = fs.readFileSync(srcPath);
        const base64 = buf.toString('base64');
        const ext = path.extname(srcPath).toLowerCase().slice(1);
        const mime = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        return { success: true, path: destPath, originalName: path.basename(srcPath), base64, mimeType: mime, isPdf: ext === 'pdf' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('scanner:extractPdfText', async (_, filePath) => {
    try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fs.readFileSync(filePath));
        return { success: true, text: data.text };
    } catch (e) {
        return { success: false, error: e.message, text: '' };
    }
});

let ocrTimer = null;
function scheduleOcrCleanup() {
    if (ocrTimer) clearTimeout(ocrTimer);
    ocrTimer = setTimeout(async () => {
        if (ocrWorker) {
            try {
                await ocrWorker.terminate();
                ocrWorker = null;
                console.log('[OCR] Worker terminated due to 3m inactivity');
            } catch (e) {}
        }
    }, 3 * 60 * 1000);
}

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
                tessjs_create_tsv: '0'
            });
        }

        const {
            data: { text }
        } = await ocrWorker.recognize(filePath);
        scheduleOcrCleanup();
        if (process.env.NODE_ENV === 'development') {
            console.log('--- RAW OCR START ---');
            console.log(text);
            console.log('--- RAW OCR END ---');
        }
        return { success: true, text };
    } catch (e) {
        console.error('OCR Error:', e);
        return { success: false, error: e.message, text: '' };
    }
});

ipcMain.handle('scanner:openAttachment', async (_, filePath) => {
    try {
        const resolved = path.resolve(filePath);
        const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
        const attachDir = path.join(app.getPath('userData'), 'attachments');
        const realAttachDir = fs.existsSync(attachDir) ? fs.realpathSync(attachDir) : path.resolve(attachDir);
        if (!real.startsWith(realAttachDir)) {
            return { success: false, error: 'Chemin non autorisé' };
        }
        shell.openPath(real);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('scanner:deleteAttachment', async (_, filePath) => {
    try {
        if (filePath) {
            const resolved = path.resolve(filePath);
            const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
            const attachDir = path.join(app.getPath('userData'), 'attachments');
            const realAttachDir = fs.existsSync(attachDir) ? fs.realpathSync(attachDir) : path.resolve(attachDir);
            if (!real.startsWith(realAttachDir)) {
                return { success: false, error: 'Chemin non autorisé' };
            }
            if (fs.existsSync(real)) fs.unlinkSync(real);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== TOOLS ====================
ipcMain.handle('tools:openCalculator', async () => {
    try {
        if (calculatorWindow && !calculatorWindow.isDestroyed()) {
            calculatorWindow.focus();
            return { success: true };
        }
        calculatorWindow = new BrowserWindow({
            width: 520,
            height: 680,
            title: 'Calculatrice Fiscale — Factarlou',
            icon: path.join(__dirname, '../assets/iconblack2.png'),
            parent: mainWindow,
            modal: false,
            resizable: true,
            minimizable: true,
            maximizable: false,
            webPreferences: { contextIsolation: true, nodeIntegration: false }
        });
        const calcPath = path.join(__dirname, 'calculator.html');
        if (fs.existsSync(calcPath)) {
            await calculatorWindow.loadFile(calcPath);
        } else {
            const fallback = path.join(path.dirname(__dirname), 'calculator.html');
            await calculatorWindow.loadFile(fs.existsSync(fallback) ? fallback : calcPath);
        }
        calculatorWindow.on('closed', () => {
            calculatorWindow = null;
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
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
    } catch (e) {
        return { success: false, error: e.message };
    }
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
    } catch (e) {
        return { success: false, error: e.message };
    }
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
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'application/json, text/plain, */*',
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
ipcMain.handle('fs:openFolder', async (_, p) => {
    try {
        shell.openPath(p);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('fs:selectFolder', async () => {
    const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
});

// ==================== RECURRING INVOICES ====================
ipcMain.handle('recurring:getAll', async (_, userId) => db.getRecurringInvoices(userId));
ipcMain.handle('recurring:save', async (_, data) => {
    try {
        const errs = validateRecurringInvoice(data);
        if (errs.length > 0) {
            return { success: false, error: 'Validation échouée: ' + errs.join(', ') };
        }
        return { success: true, id: db.saveRecurringInvoice(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('recurring:delete', async (_, id) => {
    try {
        db.deleteRecurringInvoice(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

let recurringTimer = null;

function startRecurringCron() {
    // Check every hour
    recurringTimer = setInterval(generateDueRecurring, 60 * 60 * 1000);
    // Also check immediately after a short delay (give DB time to fully init)
    setTimeout(generateDueRecurring, 5000);
}

function stopRecurringCron() {
    if (recurringTimer) {
        clearInterval(recurringTimer);
        recurringTimer = null;
    }
}

function generateDueRecurring() {
    try {
        const due = db.getDueRecurringInvoices();
        if (!due || !due.length) return;
        due.forEach(r => {
            try {
                const items = r.items_template
                    ? typeof r.items_template === 'string'
                        ? JSON.parse(r.items_template)
                        : r.items_template
                    : [];
                const parsedItems = items.map(line => {
                    const p = (line || '').split('|').map(s => s.trim());
                    return {
                        description: p[0] || '',
                        quantity: parseFloat(p[1]) || 1,
                        price: parseFloat(p[2]) || 0,
                        tva: parseInt(p[3]) || 19
                    };
                });
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const year = now.getFullYear();
                const docType = r.doc_type || 'facture';
                const docNumber = db.getNextDocumentNumber(r.user_id, docType, year);
                const dueDate = new Date(now);
                dueDate.setDate(r.day_of_month || 15);
                if (dueDate <= now) dueDate.setMonth(dueDate.getMonth() + 1);

                // Calculate totals for items_template
                const ht = parsedItems.reduce((s, it) => s + it.quantity * it.price, 0);
                const tvaAmounts = {};
                parsedItems.forEach(it => {
                    if (it.tva > 0) tvaAmounts[it.tva] = (tvaAmounts[it.tva] || 0) + it.quantity * it.price * (it.tva / 100);
                });
                const totalTva = Object.values(tvaAmounts).reduce((s, v) => s + v, 0);
                const netTotal = ht + totalTva;

                db.saveDocument({
                    userId: r.user_id,
                    type: docType,
                    number: docNumber,
                    date: dateStr,
                    dueDate: dueDate.toISOString().split('T')[0],
                    currency: r.currency || 'TND',
                    paymentMode: r.payment_mode || 'Virement bancaire',
                    items: parsedItems,
                    notes: 'Généré automatiquement',
                    totalHT: ht,
                    totalTTC: netTotal,
                    timbreAmount: 0,
                    paymentStatus: 'unpaid'
                });

                // Calculate next run
                const nextDate = new Date();
                switch (r.frequency) {
                    case 'weekly':
                        nextDate.setDate(nextDate.getDate() + 7);
                        break;
                    case 'monthly':
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        break;
                    case 'quarterly':
                        nextDate.setMonth(nextDate.getMonth() + 3);
                        break;
                    case 'yearly':
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                        break;
                }
                nextDate.setDate(r.day_of_month || 15);
                db.updateRecurringNextRun(r.id, dateStr, nextDate.toISOString().split('T')[0]);
            } catch (e) {
                console.error('Failed to generate recurring invoice:', r.id, e);
            }
        });
    } catch (e) {
        console.error('Recurring cron error:', e);
    }
}

// ==================== DOCUMENT TEMPLATES ====================
ipcMain.handle('templates:getAll', async (_, userId) => db.getTemplates(userId));
ipcMain.handle('templates:save', async (_, data) => {
    try {
        return { success: true, id: db.saveTemplate(data) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('templates:delete', async (_, id) => {
    try {
        db.deleteTemplate(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==================== XLSX IMPORT ====================
ipcMain.handle('import:xlsx', async (_, { filePath }) => {
    try {
        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ── TEJ EXPORT HANDLERS ──────────────────────────────────────────
ipcMain.handle('export:tej:getData', async (_, params) => {
    try {
        return db.getTEJData(params);
    } catch (e) {
        console.error(e);
        return [];
    }
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
                .ele('Identifiant')
                .txt(company.mf || '')
                .up()
                .ele('RaisonSociale')
                .txt(company.name || '')
                .up()
                .up()
                .ele('ReferenceDeclaration')
                .ele('Annee')
                .txt(year.toString())
                .up()
                .ele('Mois')
                .txt(month.toString())
                .up()
                .ele('CodeActe')
                .txt(codeActe.toString())
                .up()
                .up()
                .ele('AjouterCertificats');

            data.forEach(item => {
                // CRIT-06: Format date as DD/MM/YYYY per DGF spec
                let formattedDate = item.date || '';
                try {
                    if (formattedDate && formattedDate.includes('-')) {
                        const d = new Date(formattedDate);
                        formattedDate = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                    }
                } catch {}

                root.ele('Certificat')
                    .ele('Beneficiaire')
                    .ele('Identifiant')
                    .txt(item.beneficiaire_mf || '')
                    .up()
                    .ele('NomPrenomRaisonSociale')
                    .txt(item.beneficiaire_name || '')
                    .up()
                    .up()
                    .ele('DetailsCertificat')
                    .ele('DateCertificat')
                    .txt(formattedDate)
                    .up()
                    .ele('NatureRevenu')
                    .txt(item.nature_revenu || 'Honoraires et commissions')
                    .up()
                    .ele('MontantBrut')
                    .txt((item.montant_brut || 0).toFixed(3))
                    .up()
                    .ele('TauxRetenue')
                    .txt((item.taux_retenue || 1.5).toFixed(2))
                    .up()
                    .ele('MontantRetenue')
                    .txt((item.montant_retenue || 0).toFixed(3))
                    .up()
                    .ele('BaseLegale')
                    .txt(item.base_legale || "Art. 52 du Code de l'IRPP et de l'IS")
                    .up()
                    .up()
                    .up();
            });

            xmlString = root.end({ prettyPrint: true });
        } else {
            // Schema: DeclarationsTEIF
            const root = create({ version: '1.0', encoding: 'UTF-8' })
                .ele('DeclarationsTEIF')
                .ele('Declarant')
                .ele('Identifiant')
                .txt(company.mf || '')
                .up()
                .ele('RaisonSociale')
                .txt(company.name || '')
                .up()
                .up()
                .ele('ReferenceDeclaration')
                .ele('Annee')
                .txt(year.toString())
                .up()
                .ele('Mois')
                .txt(month.toString())
                .up()
                .ele('CodeActe')
                .txt(codeActe.toString())
                .up()
                .up()
                .ele('ListeFactures');

            data.forEach(item => {
                root.ele('Facture')
                    .ele('Numero')
                    .txt(item.number || '')
                    .up()
                    .ele('Date')
                    .txt(item.date || '')
                    .up()
                    .ele('Client')
                    .ele('Identifiant')
                    .txt(item.client_mf || '')
                    .up()
                    .ele('Nom')
                    .txt(item.client_name || '')
                    .up()
                    .up()
                    .ele('MontantHT')
                    .txt((item.total_ht || 0).toFixed(3))
                    .up()
                    .ele('MontantTTC')
                    .txt((item.total_ttc || 0).toFixed(3))
                    .up()
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
