const { contextBridge, ipcRenderer } = require('electron');

const invoke = async (channel, data) => {
  try {
    return await ipcRenderer.invoke(channel, data);
  } catch (error) {
    console.error(`IPC Error on channel "${channel}":`, error);
    return { success: false, error: error.message || 'IPC error' };
  }
};

contextBridge.exposeInMainWorld(
  'electronAPI',
  Object.freeze({
    // AUTH
    authRegister: (userData) => invoke('auth:register', userData),
    authLogin: (credentials) => invoke('auth:login', credentials),

    // DOCUMENTS
    getDocuments: (userId) => invoke('docs:getAll', userId),
    getDocument: (docId) => invoke('docs:getById', docId),
    saveDocument: (docData) => invoke('docs:save', docData),
    updateDocument: (docData) => invoke('docs:update', docData),
    deleteDocument: (docId) => invoke('docs:delete', docId),
    getNextDocNumber: (params) => invoke('docs:getNextNumber', params),
    convertDocument: (data) => invoke('docs:convert', data),

    // CLIENTS
    getClients: (userId) => invoke('clients:getAll', userId),
    saveClient: (clientData) => invoke('clients:save', clientData),
    deleteClient: (clientId) => invoke('clients:delete', clientId),

    // COMPANY
    getCompany: (userId) => invoke('company:get', userId),
    saveCompany: (data) => invoke('company:save', data),

    // STATS
    getStats: (userId) => invoke('stats:get', userId),

    // SERVICES
    getServices: (userId) => invoke('services:getAll', userId),
    saveService: (serviceData) => invoke('services:save', serviceData),
    deleteService: (serviceId) => invoke('services:delete', serviceId),

    // SETTINGS
    getSettings: (userId) => invoke('settings:get', userId),
    updateSettings: (data) => invoke('settings:update', data),
    resetCounter: (data) => invoke('settings:resetCounter', data),

    // EXPORT EXCEL
    exportExcelDocuments: (params) => invoke('export:excel:documents', params),
    exportExcelClients: (params) => invoke('export:excel:clients', params),

    // BACKUP
    getBackupSettings: () => invoke('backup:settings:get'),
    saveBackupSettings: (settings) => invoke('backup:settings:save', settings),
    createManualBackup: () => invoke('backup:create:manual'),
    getBackupList: () => invoke('backup:list'),
    restoreBackup: (path) => invoke('backup:restore', path),

    // PDF
    // savePDF: opens a Save dialog and writes the invoice HTML as a real PDF file
    savePDF: (params) => invoke('pdf:save', params),
    // printPDF: opens the system Print dialog with the invoice HTML
    printPDF: (params) => invoke('pdf:print', params),

    // THEME
    getThemeSettings: (userId) => invoke('theme:get', userId),
    saveThemeSettings: (data) => invoke('theme:save', data),
  })
);