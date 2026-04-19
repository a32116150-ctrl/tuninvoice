const { contextBridge, ipcRenderer } = require('electron');

const invoke = async (channel, data) => {
  try {
    return await ipcRenderer.invoke(channel, data);
  } catch (error) {
    console.error(`IPC Error on channel "${channel}":`, error);
    return { success: false, error: error.message || 'IPC error' };
  }
};

contextBridge.exposeInMainWorld('electronAPI', Object.freeze({
    // AUTH
    authRegister: (d)  => invoke('auth:register', d),
    authLogin:    (d)  => invoke('auth:login', d),

    // DOCUMENTS
    getDocuments:    (userId)   => invoke('docs:getAll', userId),
    getDocument:     (id)       => invoke('docs:getById', id),
    saveDocument:    (data)     => invoke('docs:save', data),
    updateDocument:  (data)     => invoke('docs:update', data),
    deleteDocument:  (id)       => invoke('docs:delete', id),
    getNextDocNumber:(params)   => invoke('docs:getNextNumber', params),
    convertDocument: (data)     => invoke('docs:convert', data),

    // PAYMENTS
    addPayment:    (data) => invoke('payments:add', data),
    getPayments:   (docId) => invoke('payments:getAll', docId),
    deletePayment: (id)    => invoke('payments:delete', id),

    // CLIENTS
    getClients:  (userId) => invoke('clients:getAll', userId),
    saveClient:  (data)   => invoke('clients:save', data),
    deleteClient:(id)     => invoke('clients:delete', id),

    // COMPANY
    getCompany:         (userId) => invoke('company:get', userId),
    saveCompany:        (data)   => invoke('company:save', data),
    saveCompanyImages:  (data)   => invoke('company:saveImages', data),
    removeCompanyImage: (data)   => invoke('company:removeImage', data),

    // STATS
    getStats: (userId) => invoke('stats:get', userId),

    // SERVICES
    getServices:   (userId) => invoke('services:getAll', userId),
    saveService:   (data)   => invoke('services:save', data),
    deleteService: (id)     => invoke('services:delete', id),

    // SETTINGS
    getSettings:    (userId) => invoke('settings:get', userId),
    updateSettings: (data)   => invoke('settings:update', data),
    resetCounter:   (data)   => invoke('settings:resetCounter', data),

    // LEGACY THEME (per-type colours)
    getThemeSettings:  (userId) => invoke('theme:get', userId),
    saveThemeSettings: (data)   => invoke('theme:save', data),

    // DOCUMENT VISUAL THEME (full preset JSON)
    getDocumentTheme:  (userId) => invoke('doctheme:get', userId),
    saveDocumentTheme: (data)   => invoke('doctheme:save', data),

    // EXCEL
    exportExcelDocuments: (params) => invoke('export:excel:documents', params),
    exportExcelClients:   (params) => invoke('export:excel:clients', params),

    // BACKUP
    getBackupSettings:  ()        => invoke('backup:settings:get'),
    saveBackupSettings: (s)       => invoke('backup:settings:save', s),
    createManualBackup: ()        => invoke('backup:create:manual'),
    getBackupList:      ()        => invoke('backup:list'),
    restoreBackup:      (path)    => invoke('backup:restore', path),

    // PDF
    savePDF:  (params) => invoke('pdf:save', params),
    printPDF: (params) => invoke('pdf:print', params),

    // CONTRACTS
    getContracts:   (userId) => invoke('contracts:getAll', userId),
    getContract:    (id)     => invoke('contracts:getById', id),
    saveContract:   (data)   => invoke('contracts:save', data),
    deleteContract: (id)     => invoke('contracts:delete', id),
}));