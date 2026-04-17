const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    authLogin: (data) => ipcRenderer.invoke('auth-login', data),
    authRegister: (data) => ipcRenderer.invoke('auth-register', data),

    // Company
    getCompany: (userId) => ipcRenderer.invoke('get-company', userId),
    saveCompany: (settings) => ipcRenderer.invoke('save-company', settings),

    // Documents
    getDocuments: (userId) => ipcRenderer.invoke('get-documents', userId),
    saveDocument: (docData) => ipcRenderer.invoke('save-document', docData),
    updateDocument: (data) => ipcRenderer.invoke('update-document', data),
    deleteDocument: (docId) => ipcRenderer.invoke('delete-document', docId),
    getNextDocNumber: (data) => ipcRenderer.invoke('get-next-doc-number', data),
    convertDocument: (data) => ipcRenderer.invoke('convert-document', data),

    // Clients
    getClients: (userId) => ipcRenderer.invoke('get-clients', userId),
    saveClient: (clientData) => ipcRenderer.invoke('save-client', clientData),
    deleteClient: (clientId) => ipcRenderer.invoke('delete-client', clientId),

    // Services
    getServices: (userId) => ipcRenderer.invoke('get-services', userId),
    saveService: (serviceData) => ipcRenderer.invoke('save-service', serviceData),
    deleteService: (serviceId) => ipcRenderer.invoke('delete-service', serviceId),

    // Stats
    getStats: (userId) => ipcRenderer.invoke('get-stats', userId),

    // Settings (prefixes)
    getSettings: (userId) => ipcRenderer.invoke('get-settings', userId),
    updateSettings: (data) => ipcRenderer.invoke('update-settings', data),
    resetCounter: (data) => ipcRenderer.invoke('reset-counter', data),

    // Backup
    getBackupSettings: () => ipcRenderer.invoke('get-backup-settings'),
    saveBackupSettings: (settings) => ipcRenderer.invoke('save-backup-settings', settings),
    getBackupList: () => ipcRenderer.invoke('get-backup-list'),
    createManualBackup: () => ipcRenderer.invoke('create-manual-backup'),
    restoreBackup: (backupPath) => ipcRenderer.invoke('restore-backup', backupPath),

    // Theme
    getThemeSettings: (userId) => ipcRenderer.invoke('get-theme-settings', userId),
    saveThemeSettings: (data) => ipcRenderer.invoke('save-theme-settings', data),

    // PDF / Print
    savePDF: (data) => ipcRenderer.invoke('save-pdf', data),
    printPDF: (data) => ipcRenderer.invoke('print-pdf', data)
});