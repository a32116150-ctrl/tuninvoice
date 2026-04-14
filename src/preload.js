const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    register: (userData) => ipcRenderer.invoke('auth:register', userData),
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    
    // Documents
    getDocuments: (userId) => ipcRenderer.invoke('docs:getAll', userId),
    getDocument: (docId) => ipcRenderer.invoke('docs:getById', docId),
    saveDocument: (docData) => ipcRenderer.invoke('docs:save', docData),
    deleteDocument: (docId) => ipcRenderer.invoke('docs:delete', docId),
    getNextDocNumber: (params) => ipcRenderer.invoke('docs:getNextNumber', params),
    
    // Document conversion and edit
    convertDocument: (data) => ipcRenderer.invoke('docs:convert', data),
    updateDocument: (data) => ipcRenderer.invoke('docs:update', data),
    
    // Clients
    getClients: (userId) => ipcRenderer.invoke('clients:getAll', userId),
    saveClient: (clientData) => ipcRenderer.invoke('clients:save', clientData),
    deleteClient: (clientId) => ipcRenderer.invoke('clients:delete', clientId),
    
    // Company
    getCompany: (userId) => ipcRenderer.invoke('company:get', userId),
    saveCompany: (settings) => ipcRenderer.invoke('company:save', settings),
    
    // Stats
    getStats: (userId) => ipcRenderer.invoke('stats:get', userId),
    
    // Services
    getServices: (userId) => ipcRenderer.invoke('services:getAll', userId),
    saveService: (serviceData) => ipcRenderer.invoke('services:save', serviceData),
    deleteService: (serviceId) => ipcRenderer.invoke('services:delete', serviceId),
    
    // Settings
    getSettings: (userId) => ipcRenderer.invoke('settings:get', userId),
    updateSettings: (data) => ipcRenderer.invoke('settings:update', data),
    resetCounter: (data) => ipcRenderer.invoke('settings:resetCounter', data),
    
    // Export
    exportExcelDocuments: (params) => ipcRenderer.invoke('export:excel:documents', params),
    exportExcelClients: (params) => ipcRenderer.invoke('export:excel:clients', params),
    
    // Backup
    getBackupSettings: () => ipcRenderer.invoke('backup:settings:get'),
    saveBackupSettings: (settings) => ipcRenderer.invoke('backup:settings:save', settings),
    createManualBackup: () => ipcRenderer.invoke('backup:create:manual'),
    getBackupList: () => ipcRenderer.invoke('backup:list'),
    restoreBackup: (path) => ipcRenderer.invoke('backup:restore', path),
    
    // PDF
    exportPDF: (params) => ipcRenderer.invoke('pdf:export', params)
});