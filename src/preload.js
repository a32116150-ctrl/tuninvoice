const { contextBridge, ipcRenderer } = require('electron');

const invoke = async (channel, data) => {
    try { return await ipcRenderer.invoke(channel, data); }
    catch (error) { console.error(`IPC[${channel}]:`, error); return { success: false, error: error.message || 'IPC error' }; }
};

contextBridge.exposeInMainWorld('electronAPI', Object.freeze({

    // ── APP ──────────────────────────────────────────────────────────
    getAppVersion:   ()     => invoke('app:version'),

    // ── AUTO-UPDATER ─────────────────────────────────────────────────
    checkForUpdates: ()     => invoke('updater:check'),
    installUpdate:   ()     => invoke('updater:install'),
    onUpdaterEvent:  (cb)   => { ipcRenderer.on('updater:event', (_, payload) => cb(payload)); },

    // ── AUTH ─────────────────────────────────────────────────────────
    authRegister:    (d)    => invoke('auth:register', d),
    authLogin:       (d)    => invoke('auth:login', d),
    changePassword:  (d)    => invoke('auth:changePassword', d),
    authResetPasswordMasterKey: (d) => invoke('auth:resetPasswordMasterKey', d),

    // ── DOCUMENTS ────────────────────────────────────────────────────
    getDocuments:        (userId)  => invoke('docs:getAll', userId),
    getDocumentsByType:  (params)  => invoke('docs:getByType', params),
    getDocument:         (id)      => invoke('docs:getById', id),
    saveDocument:        (data)    => invoke('docs:save', data),
    updateDocument:      (data)    => invoke('docs:update', data),
    deleteDocument:      (id)      => invoke('docs:delete', id),
    getNextDocNumber:    (params)  => invoke('docs:getNextNumber', params),
    peekNextDocNumber:   (params)  => invoke('docs:peekNextNumber', params),
    getCounterStatus:    (params)  => invoke('docs:counterStatus', params),
    convertDocument:     (data)    => invoke('docs:convert', data),
    duplicateDocument:   (data)    => invoke('docs:duplicate', data),
    searchDocuments:     (params)  => invoke('docs:search', params),
    getOverdueDocuments: (userId)  => invoke('docs:overdue', userId),
    getExpiringDocuments:(params)  => invoke('docs:expiring', params),

    // ── PAYMENTS ─────────────────────────────────────────────────────
    addPayment:    (data)  => invoke('payments:add', data),
    getPayments:   (docId) => invoke('payments:getAll', docId),
    deletePayment: (id)    => invoke('payments:delete', id),

    // ── CLIENTS ──────────────────────────────────────────────────────
    getClients:      (userId)  => invoke('clients:getAll', userId),
    getClient:       (id)      => invoke('clients:getById', id),
    saveClient:      (data)    => invoke('clients:save', data),
    deleteClient:    (id)      => invoke('clients:delete', id),
    getClientHistory:(params)  => invoke('clients:history', params),

    // ── COMPANY ──────────────────────────────────────────────────────
    getCompany:         (userId) => invoke('company:get', userId),
    saveCompany:        (data)   => invoke('company:save', data),
    saveCompanyImages:  (data)   => invoke('company:saveImages', data),
    removeCompanyImage: (data)   => invoke('company:removeImage', data),

    // ── STATS ────────────────────────────────────────────────────────
    getStats:        (userId)  => invoke('stats:get', userId),
    getAnnualStats:  (params)  => invoke('stats:annual', params),
    getClientStats:  (params)  => invoke('stats:client', params),
    getExpenseStats: (params)  => invoke('stats:expenses', params),

    // ── SERVICES ─────────────────────────────────────────────────────
    getServices:          (userId) => invoke('services:getAll', userId),
    saveService:          (data)   => invoke('services:save', data),
    deleteService:        (id)     => invoke('services:delete', id),
    getServiceCategories: (userId) => invoke('services:cats:get', userId),
    saveServiceCategory:  (data)   => invoke('services:cats:save', data),
    deleteServiceCategory:(id)     => invoke('services:cats:del', id),

    // ── SETTINGS ─────────────────────────────────────────────────────
    getSettings:    (userId) => invoke('settings:get', userId),
    updateSettings: (data)   => invoke('settings:update', data),
    resetCounter:   (data)   => invoke('settings:resetCounter', data),

    // ── THEMES ───────────────────────────────────────────────────────
    getThemeSettings:  (userId) => invoke('theme:get', userId),
    saveThemeSettings: (data)   => invoke('theme:save', data),
    getDocumentTheme:  (userId) => invoke('doctheme:get', userId),
    saveDocumentTheme: (data)   => invoke('doctheme:save', data),

    // ── EXCEL ────────────────────────────────────────────────────────
    exportExcelDocuments: (params) => invoke('export:excel:documents', params),
    exportExcelClients:   (params) => invoke('export:excel:clients', params),
    exportExcelRetenues:  (params) => invoke('export:excel:retenues', params),

    // ── BACKUP ───────────────────────────────────────────────────────
    getBackupSettings:  ()     => invoke('backup:settings:get'),
    saveBackupSettings: (s)    => invoke('backup:settings:save', s),
    createManualBackup: ()     => invoke('backup:create:manual'),
    getBackupList:      ()     => invoke('backup:list'),
    restoreBackup:      (path) => invoke('backup:restore', path),

    // ── PDF ──────────────────────────────────────────────────────────
    savePDF:           (params) => invoke('pdf:save', params),
    printPDF:          (params) => invoke('pdf:print', params),
    generatePDFBuffer: (params) => invoke('pdf:generateBuffer', params),

    // ── CONTRACTS ────────────────────────────────────────────────────
    getContracts:   (userId) => invoke('contracts:getAll', userId),
    getContract:    (id)     => invoke('contracts:getById', id),
    saveContract:   (data)   => invoke('contracts:save', data),
    deleteContract: (id)     => invoke('contracts:delete', id),

    // ── RETENUE À LA SOURCE ──────────────────────────────────────────
    getRetenues:   (userId)  => invoke('retenues:getAll', userId),
    getRetenue:    (id)      => invoke('retenues:getById', id),
    saveRetenue:   (data)    => invoke('retenues:save', data),
    deleteRetenue: (id)      => invoke('retenues:delete', id),
    createRetenueFromFacture: (params) => invoke('retenues:createFromFacture', params),
    getRetenuesByFacture: (factureId) => invoke('retenues:byFacture', factureId),
    buildRetenueHTML: (params) => invoke('retenues:buildHTML', params),

    // ── EXPENSES ─────────────────────────────────────────────────────
    getExpenses:       (userId) => invoke('expenses:getAll', userId),
    getExpense:        (id)     => invoke('expenses:getById', id),
    saveExpense:       (data)   => invoke('expenses:save', data),
    deleteExpense:     (id)     => invoke('expenses:delete', id),
    getExpenseSummary: (params) => invoke('expenses:summary', params),

    // ── SCANNER ──────────────────────────────────────────────────────
    scannerPickFile:      ()         => invoke('scanner:pickFile'),
    scannerStoreFile:     (srcPath)  => invoke('scanner:storeFile', srcPath),
    scannerExtractPdfText:(filePath) => invoke('scanner:extractPdfText', filePath),
    scannerOcrImage:      (filePath) => invoke('scanner:ocrImage', filePath),
    scannerOpenAttachment:(filePath) => invoke('scanner:openAttachment', filePath),
    scannerDeleteAttachment:(filePath)=> invoke('scanner:deleteAttachment', filePath),

    // ── NOTES ────────────────────────────────────────────────────────
    getNotes:    (userId) => invoke('notes:getAll', userId),
    saveNote:    (data)   => invoke('notes:save', data),
    deleteNote:  (id)     => invoke('notes:delete', id),

    // ── REMINDERS ────────────────────────────────────────────────────
    getReminders:    (userId) => invoke('reminders:getAll', userId),
    saveReminder:    (data)   => invoke('reminders:save', data),
    deleteReminder:  (id)     => invoke('reminders:delete', id),
    markReminderDone:(id)     => invoke('reminders:markDone', id),
    onReminderDue:   (cb)     => ipcRenderer.on('reminder:due', (_, r) => cb(r)),

    // ── HR (EMPLOYEES & PAYSLIPS) ────────────────────────────────────
    getEmployees:    (userId) => invoke('hr:getEmployees', userId),
    saveEmployee:    (data)   => invoke('hr:saveEmployee', data),
    deleteEmployee:  (id)     => invoke('hr:deleteEmployee', id),
    getPayslips:     (userId) => invoke('hr:getPayslips', userId),
    savePayslip:     (data)   => invoke('hr:savePayslip', data),
    deletePayslip:   (id)     => invoke('hr:deletePayslip', id),
    buildPayslipHTML:(p)      => invoke('hr:buildPayslipHTML', p),

    // ── TOOLS ────────────────────────────────────────────────────────
    openCalculator:         ()     => invoke('tools:openCalculator'),
    generateRelanceLetter:  (params) => invoke('tools:relanceLetter', params),
    generateFiscalSummary:  (params) => invoke('tools:fiscalSummary', params),

    // ── FILE SYSTEM ──────────────────────────────────────────────────
    openFolder:   (path) => invoke('fs:openFolder', path),
    selectFolder: ()     => invoke('fs:selectFolder'),
}));