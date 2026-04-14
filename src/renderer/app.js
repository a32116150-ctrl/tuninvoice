// ==================== GLOBALS ====================
let currentUser = null;
let currentDocType = 'facture';
let itemCount = 0;
let logoImage = null;
let stampImage = null;
let signatureImage = null;
let timbreAmount = 0;
let allDocuments = [];
let allClients = [];
let allServices = [];
let editingServiceId = null;
let editingDocId = null;
let confirmCallback = null;
let currentSettings = {};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showApp();
        } catch {
            sessionStorage.removeItem('currentUser');
        }
    }
});

// ==================== TOAST ====================
function showToast(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==================== LOADING ====================
function showLoading(text = 'Traitement en cours...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}
function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// ==================== CONFIRM MODAL ====================
function showConfirm(title, message, onConfirm, btnLabel = 'Confirmer', btnClass = 'btn-danger') {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmBtn');
    btn.textContent = btnLabel;
    btn.className = `btn ${btnClass}`;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.add('active');
}
function executeConfirm() { closeConfirm(); if (confirmCallback) confirmCallback(); }
function closeConfirm() { document.getElementById('confirmModal').classList.remove('active'); confirmCallback = null; }

// ==================== AUTH ====================
function switchAuthTab(tab, btn) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tab === 'login' ? 'loginForm' : 'registerForm').classList.add('active');
    hideError();
}
function hideError() { document.getElementById('authError').classList.add('hidden'); }
function showError(msg) {
    document.getElementById('errorText').textContent = msg;
    document.getElementById('authError').classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    hideError();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Connexion...';
    try {
        const result = await window.electronAPI.login({
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        });
        if (result.success) {
            const safeUser = { id: result.user.id, name: result.user.name, email: result.user.email, company: result.user.company, mf: result.user.mf };
            currentUser = safeUser;
            sessionStorage.setItem('currentUser', JSON.stringify(safeUser));
            showApp();
        } else { showError(result.error || 'Identifiants incorrects'); }
    } catch { showError('Erreur de connexion. Veuillez réessayer.'); }
    finally { btn.disabled = false; btn.textContent = '🔐 Se connecter'; }
}

async function handleRegister(e) {
    e.preventDefault();
    hideError();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    if (password !== passwordConfirm) return showError('Les mots de passe ne correspondent pas');
    if (password.length < 6) return showError('Minimum 6 caractères');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Création...';
    try {
        const result = await window.electronAPI.register({
            name: document.getElementById('regName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            company: document.getElementById('regCompany').value.trim(),
            mf: document.getElementById('regMF').value.trim(),
            password
        });
        if (result.success) {
            showToast('Compte créé ! Veuillez vous connecter.', 'success', 5000);
            switchAuthTab('login', document.querySelector('.auth-tab'));
            document.getElementById('loginEmail').value = document.getElementById('regEmail').value;
        } else { showError(result.error || 'Erreur lors de la création'); }
    } catch { showError('Erreur serveur.'); }
    finally { btn.disabled = false; btn.textContent = '📝 Créer mon compte'; }
}

function confirmLogout() {
    showConfirm('🚪 Déconnexion', 'Tout document non sauvegardé sera perdu. Continuer ?', logout, 'Déconnexion');
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    const hour = new Date().getHours();
    const greet = hour < 18 ? 'Bonjour' : 'Bonsoir';
    document.getElementById('dashboardGreeting').textContent = `${greet}, ${currentUser.name.split(' ')[0]} 👋`;
    loadDashboard();
    initNewDocument();
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (!pageEl) return;
    pageEl.classList.add('active');
    const pages = ['dashboard','new-document','documents','clients','services','company','settings'];
    const idx = pages.indexOf(page);
    const navItems = document.querySelectorAll('.nav-item');
    if (idx !== -1 && navItems[idx]) navItems[idx].classList.add('active');
    if (page === 'dashboard')  loadDashboard();
    if (page === 'documents')  loadDocuments();
    if (page === 'clients')    loadClients();
    if (page === 'services')   loadServices();
    if (page === 'company')    loadCompanyPage();
    if (page === 'settings')   { loadSettings(); loadSerialSettings(); }
}

function createDocOfType(type) {
    currentDocType = type;
    document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === type);
    updateDocType();
    navigateTo('new-document');
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    try {
        const stats = await window.electronAPI.getStats(currentUser.id);
        document.getElementById('statTotalDocs').textContent    = stats.totalDocs;
        document.getElementById('statTotalRevenue').textContent = stats.totalRevenue.toFixed(3) + ' TND';
        document.getElementById('statTotalClients').textContent = stats.totalClients;
        document.getElementById('statThisMonth').textContent    = stats.thisMonth;
        const docs = await window.electronAPI.getDocuments(currentUser.id);
        renderRecentDocs(docs.slice(0, 6));
    } catch { showToast('Erreur tableau de bord', 'error'); }
}

function renderRecentDocs(docs) {
    const container = document.getElementById('recentDocsTable');
    if (!docs.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📄</div><h3>Aucun document</h3><p>Créez votre premier document</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>N°</th><th>Client</th><th>Date</th><th>Total TTC</th><th>Actions</th></tr></thead><tbody>
        ${docs.map(doc => `<tr>
            <td><span class="badge badge-${doc.type}">${doc.type.toUpperCase()}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${doc.number}</td>
            <td>${escapeHtml(doc.clientName)}</td>
            <td>${formatDate(doc.date)}</td>
            <td style="font-weight:600">${doc.totalTTC.toFixed(3)} ${doc.currency}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="viewDocument('${doc.id}')"     title="Aperçu">👁️</button>
                ${doc.type === 'devis' ? `<button class="btn-icon btn-convert" onclick="convertToInvoice('${doc.id}')" title="Convertir en Facture">🔄</button>` : ''}
                <button class="btn-icon btn-edit" onclick="editExistingDoc('${doc.id}')" title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadDocPDF('${doc.id}')"   title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDoc('${doc.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

// ==================== NEW DOCUMENT ====================
async function initNewDocument() {
    document.getElementById('docDate').valueAsDate = new Date();
    const due = new Date(); due.setDate(due.getDate() + 30);
    document.getElementById('docDueDate').valueAsDate = due;
    try {
        const number = await window.electronAPI.getNextDocNumber({ userId: currentUser.id, type: currentDocType, year: new Date().getFullYear() });
        document.getElementById('docNumber').value = number;
    } catch {}
    await loadCompanyIntoForm();
    await loadClientsDropdown();
    await loadServicesDropdown();
    if (!document.getElementById('itemsBody').children.length) addItem();
    
    // Reset save button
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerHTML = '💾 Enregistrer & Exporter PDF';
    saveBtn.onclick = saveAndDownloadPDF;
    editingDocId = null;
}

async function loadCompanyIntoForm() {
    try {
        const c = await window.electronAPI.getCompany(currentUser.id) || {};
        document.getElementById('docCompanyName').value    = c.name    || currentUser.company || '';
        document.getElementById('docCompanyMF').value      = c.mf      || currentUser.mf      || '';
        document.getElementById('docCompanyAddress').value = c.address  || '';
        document.getElementById('docCompanyPhone').value   = c.phone    || '';
        document.getElementById('docCompanyEmail').value   = c.email    || '';
        document.getElementById('docCompanyRC').value      = c.rc       || '';
    } catch {}
}

function selectDocType(type) { currentDocType = type; document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === type); updateDocType(); }

function updateDocType() {
    currentDocType = document.querySelector('input[name="docType"]:checked').value;
    document.getElementById('dueDateGroup').style.display = currentDocType === 'facture' ? 'block' : 'none';
    // Preview will be updated when document is created, but we update the input if empty
    const currentNum = document.getElementById('docNumber').value;
    if (currentNum) {
        const parts = currentNum.split('-');
        const year = new Date().getFullYear();
        if (parts.length === 3) {
            const seq = parts[2];
            const prefix = {facture:'FAC', devis:'DEV', bon:'BC'}[currentDocType];
            document.getElementById('docNumber').value = `${prefix}-${year}-${seq}`;
        }
    }
}

function generateRandomMF() {
    const n = () => Math.floor(Math.random() * 9000000 + 1000000);
    const l = () => Array.from({length:4},()=>String.fromCharCode(65+Math.floor(Math.random()*26))).join('');
    document.getElementById('docCompanyMF').value = `${n()} ${l()} ${n()}`;
}

// ==================== ITEMS ====================
function addItem() {
    itemCount++;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align:center;color:var(--gray-500);font-size:0.82rem">${itemCount}</td>
        <td><input type="text"   class="item-input" id="desc${itemCount}"  placeholder="Description..."></td>
        <td><input type="number" class="item-input" id="qty${itemCount}"   value="1"     min="0.001" step="0.001" onchange="calculateTotals()"></td>
        <td><input type="number" class="item-input" id="price${itemCount}" value="0.000" min="0"     step="0.001" onchange="calculateTotals()"></td>
        <td><select class="tva-select" id="tva${itemCount}" onchange="calculateTotals()">
            <option value="19">19%</option><option value="13">13%</option>
            <option value="7">7%</option><option value="0">0%</option>
        </select></td>
        <td style="text-align:right;font-weight:500" id="total${itemCount}">0.000</td>
        <td><button type="button" class="btn-icon btn-delete" onclick="removeItem(this)">🗑️</button></td>`;
    document.getElementById('itemsBody').appendChild(tr);
    document.getElementById(`desc${itemCount}`).focus();
    calculateTotals();
}

function removeItem(btn) {
    if (document.getElementById('itemsBody').children.length <= 1) { showToast('Au moins une ligne requise','warning'); return; }
    btn.closest('tr').remove(); renumberItems(); calculateTotals();
}

function renumberItems() {
    itemCount = 0;
    document.querySelectorAll('#itemsBody tr').forEach(row => {
        itemCount++;
        row.cells[0].textContent = itemCount;
        row.querySelectorAll('[id]').forEach(el => { el.id = el.id.replace(/\d+$/,'') + itemCount; });
    });
}

function calculateTotals() {
    let totalHT = 0, tva19 = 0, tva13 = 0, tva7 = 0;
    for (let i = 1; i <= itemCount; i++) {
        const qty   = parseFloat(document.getElementById(`qty${i}`)?.value)   || 0;
        const price = parseFloat(document.getElementById(`price${i}`)?.value) || 0;
        const tva   = parseFloat(document.getElementById(`tva${i}`)?.value)   || 0;
        const line  = qty * price;
        const cell  = document.getElementById(`total${i}`);
        if (cell) cell.textContent = line.toFixed(3);
        totalHT += line;
        if (tva===19) tva19 += line*(tva/100);
        else if (tva===13) tva13 += line*(tva/100);
        else if (tva===7)  tva7  += line*(tva/100);
    }
    const applyTimbre = document.getElementById('applyTimbre').checked;
    timbreAmount = (applyTimbre && totalHT > 1000) ? 1.000 : 0;
    document.getElementById('timbreDisplay').textContent = timbreAmount.toFixed(3) + ' TND';
    const totalTTC = totalHT + tva19 + tva13 + tva7 + timbreAmount;
    const currency = document.getElementById('docCurrency').value;
    document.getElementById('totalHT').textContent = totalHT.toFixed(3) + ' ' + currency;
    setRow('tva19Row','tva19Amount',tva19,currency);
    setRow('tva13Row','tva13Amount',tva13,currency);
    setRow('tva7Row', 'tva7Amount', tva7, currency);
    setRow('timbreRow','timbreTotal',timbreAmount,currency);
    document.getElementById('totalTTC').textContent = totalTTC.toFixed(3) + ' ' + currency;
}

function setRow(rowId, amtId, value, currency) {
    document.getElementById(rowId).classList.toggle('hidden', value <= 0);
    document.getElementById(amtId).textContent = value.toFixed(3) + ' ' + currency;
}

// ==================== SERVICES DROPDOWN ====================
async function loadServicesDropdown() {
    if (!currentUser) return;
    try {
        allServices = await window.electronAPI.getServices(currentUser.id);
        const select = document.getElementById('presetServiceSelect');
        select.innerHTML = '<option value="">— Sélectionner un service enregistré —</option>';
        allServices.forEach(s => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                name: s.name,
                description: s.description,
                price: s.price,
                tva: s.tva
            });
            option.textContent = `${s.name} - ${parseFloat(s.price).toFixed(3)} TND (${s.tva}%)`;
            select.appendChild(option);
        });
    } catch {}
}

function addPresetService() {
    const select = document.getElementById('presetServiceSelect');
    if (!select.value) return;
    
    const service = JSON.parse(select.value);
    
    // Add new row with service data
    addItem();
    const currentRow = itemCount;
    
    document.getElementById(`desc${currentRow}`).value = service.description ? 
        `${service.name} - ${service.description}` : service.name;
    document.getElementById(`price${currentRow}`).value = service.price;
    document.getElementById(`tva${currentRow}`).value = service.tva;
    
    // Reset dropdown
    select.value = '';
    
    calculateTotals();
    showToast('Service ajouté', 'success');
}

// ==================== IMAGES ====================
function handleImageUpload(input, type) {
    if (!input.files?.[0]) return;
    if (input.files[0].size > 5*1024*1024) { showToast('Image trop lourde (max 5 MB)','warning'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target.result;
        document.getElementById(`${type}Preview`).src = data;
        document.getElementById(`${type}Preview`).classList.remove('hidden');
        document.getElementById(`${type}Placeholder`).classList.add('hidden');
        document.getElementById(`${type}Box`).classList.add('has-image');
        if (type==='logo') logoImage=data; else if (type==='stamp') stampImage=data; else if (type==='signature') signatureImage=data;
    };
    reader.readAsDataURL(input.files[0]);
}

function removeImage(type) {
    document.getElementById(`${type}Preview`).src='';
    document.getElementById(`${type}Preview`).classList.add('hidden');
    document.getElementById(`${type}Placeholder`).classList.remove('hidden');
    document.getElementById(`${type}Box`).classList.remove('has-image');
    document.getElementById(`${type}Input`).value='';
    if (type==='logo') logoImage=null; else if (type==='stamp') stampImage=null; else if (type==='signature') signatureImage=null;
}

// ==================== CLIENTS DROPDOWN ====================
async function loadClientsDropdown() {
    try {
        const clients = await window.electronAPI.getClients(currentUser.id);
        const select = document.getElementById('savedClientSelect');
        select.innerHTML = '<option value="">— Choisir un client existant —</option>';
        clients.forEach(c => {
            const o = document.createElement('option');
            o.value = JSON.stringify({name:c.name,mf:c.mf,address:c.address,phone:c.phone,email:c.email});
            o.textContent = c.name; select.appendChild(o);
        });
    } catch {}
}

function loadSavedClient() {
    const val = document.getElementById('savedClientSelect').value;
    if (!val) return;
    const c = JSON.parse(val);
    document.getElementById('docClientName').value    = c.name    || '';
    document.getElementById('docClientMF').value      = c.mf      || '';
    document.getElementById('docClientAddress').value = c.address  || '';
    document.getElementById('docClientPhone').value   = c.phone    || '';
    document.getElementById('docClientEmail').value   = c.email    || '';
}

// ==================== CLIENT MODAL ====================
function openClientModal() { document.getElementById('clientModal').classList.add('active'); setTimeout(()=>document.getElementById('newClientName').focus(),100); }
function closeClientModal() {
    document.getElementById('clientModal').classList.remove('active');
    ['newClientName','newClientMF','newClientAddress','newClientPhone','newClientEmail'].forEach(id=>document.getElementById(id).value='');
}

async function saveNewClient() {
    const name = document.getElementById('newClientName').value.trim();
    if (!name) { showToast('Le nom est obligatoire','warning'); return; }
    try {
        await window.electronAPI.saveClient({ userId:currentUser.id, name, mf:document.getElementById('newClientMF').value.trim(), address:document.getElementById('newClientAddress').value.trim(), phone:document.getElementById('newClientPhone').value.trim(), email:document.getElementById('newClientEmail').value.trim() });
        showToast(`Client "${name}" ajouté`,'success');
        closeClientModal(); await loadClientsDropdown(); await loadClients();
    } catch { showToast("Erreur lors de l'ajout",'error'); }
}

// ==================== SERVICES PAGE ====================
async function loadServices() {
    if (!currentUser) return;
    try {
        allServices = await window.electronAPI.getServices(currentUser.id);
        renderServicesTable(allServices);
    } catch (err) {
        showToast('Erreur chargement services', 'error');
    }
}

function renderServicesTable(services) {
    const container = document.getElementById('servicesTable');
    if (!services.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🛍️</div><h3>Aucun service</h3><p>Ajoutez vos produits et services pour un remplissage rapide des documents</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr><th>Nom</th><th>Description</th><th>Prix HT</th><th>TVA</th><th>Actions</th></tr></thead><tbody>
        ${services.map(s => `<tr>
            <td style="font-weight:600">${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.description) || '—'}</td>
            <td>${parseFloat(s.price).toFixed(3)} TND</td>
            <td>${s.tva}%</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" onclick="editService('${s.id}')" title="Modifier">✏️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteService('${s.id}')" title="Supprimer">🗑️</button>
            </td>
        </tr>`).join('')}
    </tbody></table>`;
}

function filterServices() {
    const q = document.getElementById('searchServices').value.toLowerCase();
    renderServicesTable(allServices.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.description && s.description.toLowerCase().includes(q))
    ));
}

// Service Modal Functions
function openServiceModal() {
    editingServiceId = null;
    document.getElementById('serviceModalTitle').textContent = '➕ Nouveau Service';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceDescription').value = '';
    document.getElementById('servicePrice').value = '0.000';
    document.getElementById('serviceTva').value = '19';
    document.getElementById('serviceModal').classList.add('active');
}

function closeServiceModal() {
    document.getElementById('serviceModal').classList.remove('active');
    editingServiceId = null;
}

async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    if (!name) {
        showToast('Le nom du service est requis', 'warning');
        return;
    }
    
    const serviceData = {
        id: editingServiceId,
        userId: currentUser.id,
        name: name,
        description: document.getElementById('serviceDescription').value.trim(),
        price: parseFloat(document.getElementById('servicePrice').value) || 0,
        tva: parseFloat(document.getElementById('serviceTva').value) || 19
    };
    
    try {
        await window.electronAPI.saveService(serviceData);
        showToast(editingServiceId ? 'Service mis à jour' : 'Service créé', 'success');
        closeServiceModal();
        await loadServices();
        await loadServicesDropdown();
    } catch (err) {
        showToast('Erreur lors de l\'enregistrement', 'error');
    }
}

async function editService(serviceId) {
    const service = allServices.find(s => s.id === serviceId);
    if (!service) return;
    
    editingServiceId = serviceId;
    document.getElementById('serviceModalTitle').textContent = '✏️ Modifier Service';
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceDescription').value = service.description || '';
    document.getElementById('servicePrice').value = service.price;
    document.getElementById('serviceTva').value = service.tva;
    document.getElementById('serviceModal').classList.add('active');
}

function confirmDeleteService(serviceId) {
    const service = allServices.find(s => s.id === serviceId);
    showConfirm('🗑️ Supprimer', `Supprimer "${service?.name}" ?`, async () => {
        try {
            await window.electronAPI.deleteService(serviceId);
            showToast('Service supprimé', 'info');
            await loadServices();
            await loadServicesDropdown();
        } catch (err) {
            showToast('Erreur suppression', 'error');
        }
    });
}

// ==================== SERIAL NUMBER SETTINGS ====================
async function loadSerialSettings() {
    if (!currentUser) return;
    try {
        currentSettings = await window.electronAPI.getSettings(currentUser.id);
        document.getElementById('prefixFacture').value = currentSettings.prefix_facture || 'FAC';
        document.getElementById('prefixDevis').value = currentSettings.prefix_devis || 'DEV';
        document.getElementById('prefixBon').value = currentSettings.prefix_bon || 'BC';
        updateSerialPreview();
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

function updateSerialPreview() {
    const prefix = document.getElementById('prefixFacture').value || 'FAC';
    const year = new Date().getFullYear();
    document.getElementById('serialPreview').textContent = `${prefix}-${year}-001`;
}

async function saveSerialSettings() {
    const settings = {
        prefix_facture: document.getElementById('prefixFacture').value.toUpperCase(),
        prefix_devis: document.getElementById('prefixDevis').value.toUpperCase(),
        prefix_bon: document.getElementById('prefixBon').value.toUpperCase()
    };
    
    try {
        await window.electronAPI.updateSettings({
            userId: currentUser.id,
            settings: settings
        });
        showToast('Paramètres de numérotation enregistrés', 'success');
        await loadSerialSettings();
    } catch (err) {
        showToast('Erreur d\'enregistrement', 'error');
    }
}

function openResetCounterModal() {
    showConfirm(
        '🔄 Réinitialiser le compteur',
        'Cela réinitialisera la séquence de numérotation à 001 pour l\'année en cours. Le prochain document sera numéroté XXX-2026-001. Continuer ?',
        async () => {
            try {
                await window.electronAPI.resetCounter({
                    userId: currentUser.id,
                    type: 'all',
                    year: new Date().getFullYear()
                });
                showToast('Compteur réinitialisé', 'success');
                await loadSerialSettings();
                // Refresh current doc number if on new document page
                if (document.getElementById('page-new-document').classList.contains('active')) {
                    const number = await window.electronAPI.getNextDocNumber({ 
                        userId: currentUser.id, 
                        type: currentDocType, 
                        year: new Date().getFullYear() 
                    });
                    document.getElementById('docNumber').value = number;
                }
            } catch (err) {
                showToast('Erreur', 'error');
            }
        },
        'Réinitialiser',
        'btn-warning'
    );
}

// ==================== PREVIEW & SAVE ====================
function previewDocument() { if (!validateDocumentForm()) return; generatePreviewHTML(); document.getElementById('previewModal').classList.add('active'); }
function closePreview() { document.getElementById('previewModal').classList.remove('active'); }

function validateDocumentForm() {
    if (!document.getElementById('docCompanyName').value.trim()) { showToast('La raison sociale est requise','warning'); return false; }
    if (!document.getElementById('docClientName').value.trim())  { showToast('Le nom du client est requis','warning'); return false; }
    let hasItem = false;
    for (let i=1;i<=itemCount;i++) if (document.getElementById(`desc${i}`)?.value.trim()) { hasItem=true; break; }
    if (!hasItem) { showToast('Ajoutez au moins un article','warning'); return false; }
    return true;
}

function generatePreviewHTML() {
    const get = id => document.getElementById(id)?.value || '';
    const companyName=get('docCompanyName'), companyMF=get('docCompanyMF'), companyAddress=get('docCompanyAddress');
    const companyPhone=get('docCompanyPhone'), companyEmail=get('docCompanyEmail'), companyRC=get('docCompanyRC');
    const clientName=get('docClientName'), clientMF=get('docClientMF'), clientAddress=get('docClientAddress');
    const clientPhone=get('docClientPhone'), clientEmail=get('docClientEmail');
    const docNumber=get('docNumber'), docDate=get('docDate'), docDueDate=get('docDueDate');
    const currency=get('docCurrency'), paymentMode=get('docPayment'), notes=get('docNotes');
    const typeLabels={facture:'FACTURE',devis:'DEVIS',bon:'BON DE COMMANDE'};
    const typeColors={facture:'#1e3a8a',devis:'#92400e',bon:'#065f46'};
    const color=typeColors[currentDocType]||'#1e3a8a';
    let totalHT=0, tva19=0, tva13=0, tva7=0, itemsHTML='';
    for (let i=1;i<=itemCount;i++) {
        const desc=document.getElementById(`desc${i}`)?.value.trim();
        const qty=parseFloat(document.getElementById(`qty${i}`)?.value)||0;
        const price=parseFloat(document.getElementById(`price${i}`)?.value)||0;
        const tva=parseFloat(document.getElementById(`tva${i}`)?.value)||0;
        if (!desc) continue;
        const line=qty*price; totalHT+=line;
        if (tva===19) tva19+=line*(tva/100); else if (tva===13) tva13+=line*(tva/100); else if (tva===7) tva7+=line*(tva/100);
        itemsHTML+=`<tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:0.82rem">${i}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${escapeHtml(desc)}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${qty}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${price.toFixed(3)}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${tva}%</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${line.toFixed(3)}</td></tr>`;
    }
    const totalTTC=totalHT+tva19+tva13+tva7+timbreAmount;
    const logoHTML=logoImage?`<img src="${logoImage}" style="max-width:140px;max-height:80px;object-fit:contain;margin-bottom:12px;display:block">`:'';
    document.getElementById('previewContent').innerHTML = buildInvoiceHTML({color,typeLabels,companyName,companyMF,companyAddress,companyPhone,companyEmail,companyRC,clientName,clientMF,clientAddress,clientPhone,clientEmail,docNumber,docDate,docDueDate,currency,paymentMode,notes,logoHTML,itemsHTML,totalHT,tva19,tva13,tva7,totalTTC,timbreAmount,stampImage,signatureImage,docType:currentDocType});
}

function buildInvoiceHTML(d) {
    const typeLabels={facture:'FACTURE',devis:'DEVIS',bon:'BON DE COMMANDE'};
    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid ${d.color}">
        <div style="flex:1">${d.logoHTML}<h2 style="color:${d.color};font-size:1.3rem;font-weight:700;margin-bottom:8px">${escapeHtml(d.companyName)}</h2>
        <div style="font-size:0.82rem;color:#4b5563;line-height:1.8">
            ${d.companyMF?`<span style="background:${d.color};color:white;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:0.78rem">MF: ${escapeHtml(d.companyMF)}</span><br>`:''}
            ${d.companyAddress?`📍 ${escapeHtml(d.companyAddress)}<br>`:''}
            ${d.companyPhone?`📞 ${escapeHtml(d.companyPhone)}<br>`:''}
            ${d.companyEmail?`✉️ ${escapeHtml(d.companyEmail)}<br>`:''}
            ${d.companyRC?`🏛️ RC: ${escapeHtml(d.companyRC)}`:''}
        </div></div>
        <div style="text-align:right;flex-shrink:0;margin-left:30px">
            <div style="background:${d.color};color:white;padding:10px 20px;border-radius:8px;margin-bottom:14px;display:inline-block"><div style="font-size:1.4rem;font-weight:800;letter-spacing:1px">${typeLabels[d.docType]}</div></div>
            <div style="font-size:0.85rem;color:#4b5563;line-height:2">
                <div><strong style="color:#1f2937">N°:</strong> <span style="font-family:monospace">${escapeHtml(d.docNumber)}</span></div>
                <div><strong style="color:#1f2937">Date:</strong> ${formatDate(d.docDate)}</div>
                ${d.docType==='facture'&&d.docDueDate?`<div><strong style="color:#1f2937">Échéance:</strong> ${formatDate(d.docDueDate)}</div>`:''}
                <div><strong style="color:#1f2937">Paiement:</strong> ${escapeHtml(d.paymentMode)}</div>
            </div>
        </div>
    </div>
    <div style="background:#f8faff;border:1px solid #dbeafe;border-left:4px solid ${d.color};padding:16px 20px;border-radius:8px;margin-bottom:28px">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${d.color};margin-bottom:8px">Facturé à</div>
        <div style="font-weight:700;font-size:1rem;color:#1f2937;margin-bottom:4px">${escapeHtml(d.clientName)}</div>
        <div style="font-size:0.82rem;color:#4b5563;line-height:1.8">
            ${d.clientMF?`MF: ${escapeHtml(d.clientMF)}<br>`:''}
            ${d.clientAddress?`${escapeHtml(d.clientAddress)}<br>`:''}
            ${d.clientPhone?`Tél: ${escapeHtml(d.clientPhone)}<br>`:''}
            ${d.clientEmail?`Email: ${escapeHtml(d.clientEmail)}`:''}
        </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead><tr style="background:${d.color};color:white">
            <th style="padding:11px 12px;text-align:left;font-size:0.78rem;width:35px">N°</th>
            <th style="padding:11px 12px;text-align:left;font-size:0.78rem">Description</th>
            <th style="padding:11px 12px;text-align:center;font-size:0.78rem;width:70px">Qté</th>
            <th style="padding:11px 12px;text-align:right;font-size:0.78rem;width:110px">P.U. HT</th>
            <th style="padding:11px 12px;text-align:center;font-size:0.78rem;width:60px">TVA</th>
            <th style="padding:11px 12px;text-align:right;font-size:0.78rem;width:110px">Total HT</th>
        </tr></thead>
        <tbody>${d.itemsHTML}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:30px">
        <div style="width:320px;background:#f9fafb;border-radius:8px;padding:20px">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:0.9rem"><span>Total HT:</span><span style="font-weight:600">${d.totalHT.toFixed(3)} ${d.currency}</span></div>
            ${d.tva19>0?`<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:0.9rem;color:#4b5563"><span>TVA 19%:</span><span>${d.tva19.toFixed(3)} ${d.currency}</span></div>`:''}
            ${d.tva13>0?`<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:0.9rem;color:#4b5563"><span>TVA 13%:</span><span>${d.tva13.toFixed(3)} ${d.currency}</span></div>`:''}
            ${d.tva7>0?`<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:0.9rem;color:#4b5563"><span>TVA 7%:</span><span>${d.tva7.toFixed(3)} ${d.currency}</span></div>`:''}
            ${d.timbreAmount>0?`<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:0.9rem;color:#4b5563"><span>Timbre Fiscal:</span><span>${d.timbreAmount.toFixed(3)} ${d.currency}</span></div>`:''}
            <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid ${d.color};font-size:1.1rem;font-weight:700;color:${d.color}"><span>Total TTC:</span><span>${d.totalTTC.toFixed(3)} ${d.currency}</span></div>
        </div>
    </div>
    ${d.notes?`<div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin-bottom:24px;font-size:0.85rem;color:#713f12"><strong>Notes:</strong><br>${escapeHtml(d.notes).replace(/\n/g,'<br>')}</div>`:''}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px">
        ${d.stampImage?`<div style="flex:1"><img src="${d.stampImage}" style="max-width:120px;max-height:120px;opacity:0.8"></div>`:''}
        <div style="text-align:center;flex:1">
            ${d.signatureImage?`<img src="${d.signatureImage}" style="max-width:150px;max-height:80px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"><div style="border-top:1px solid #9ca3af;width:200px;margin:0 auto;padding-top:4px;font-size:0.8rem;color:#6b7280">Signature</div>`:''}
        </div>
    </div>
</div>`;
}

async function saveAndDownloadPDF() {
    if (!validateDocumentForm()) return;
    showLoading('Enregistrement...');
    try {
        const docData = collectDocumentData();
        const result = await window.electronAPI.saveDocument(docData);
        if (result.success) {
            showToast('Document enregistré', 'success');
            await downloadPDF(result.document.number);
            resetDocumentForm();
            navigateTo('documents');
        }
    } catch (err) {
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        hideLoading();
    }
}

async function downloadPDF(filename) {
    generatePreviewHTML();
    const html = document.getElementById('previewContent').innerHTML;
    const result = await window.electronAPI.exportPDF({ html, filename: `${filename}.pdf` });
    if (result.success) {
        showToast(`PDF téléchargé: ${result.path}`, 'success');
    }
}

async function downloadDocPDF(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    // Populate form temporarily for PDF generation
    const originalEditingId = editingDocId;
    editingDocId = docId;
    populateFormWithDoc(doc);
    generatePreviewHTML();
    
    const html = document.getElementById('previewContent').innerHTML;
    const result = await window.electronAPI.exportPDF({ html, filename: `${doc.number}.pdf` });
    
    if (result.success) {
        showToast(`PDF téléchargé: ${result.path}`, 'success');
    }
    
    // Restore state
    editingDocId = originalEditingId;
}

function printDocument() {
    window.print();
}

function collectDocumentData() {
    const items = [];
    for (let i = 1; i <= itemCount; i++) {
        const desc = document.getElementById(`desc${i}`)?.value.trim();
        if (!desc) continue;
        items.push({
            description: desc,
            quantity: parseFloat(document.getElementById(`qty${i}`).value) || 0,
            price: parseFloat(document.getElementById(`price${i}`).value) || 0,
            tva: parseFloat(document.getElementById(`tva${i}`).value) || 0
        });
    }
    
    return {
        id: editingDocId,
        userId: currentUser.id,
        type: currentDocType,
        number: document.getElementById('docNumber').value,
        date: document.getElementById('docDate').value,
        dueDate: document.getElementById('docDueDate').value,
        currency: document.getElementById('docCurrency').value,
        paymentMode: document.getElementById('docPayment').value,
        companyName: document.getElementById('docCompanyName').value,
        companyMF: document.getElementById('docCompanyMF').value,
        companyAddress: document.getElementById('docCompanyAddress').value,
        companyPhone: document.getElementById('docCompanyPhone').value,
        companyEmail: document.getElementById('docCompanyEmail').value,
        companyRC: document.getElementById('docCompanyRC').value,
        clientName: document.getElementById('docClientName').value,
        clientMF: document.getElementById('docClientMF').value,
        clientAddress: document.getElementById('docClientAddress').value,
        clientPhone: document.getElementById('docClientPhone').value,
        clientEmail: document.getElementById('docClientEmail').value,
        items: items,
        applyTimbre: document.getElementById('applyTimbre').checked,
        timbreAmount: timbreAmount,
        totalHT: parseFloat(document.getElementById('totalHT').textContent) || 0,
        totalTTC: parseFloat(document.getElementById('totalTTC').textContent) || 0,
        logoImage: logoImage,
        stampImage: stampImage,
        signatureImage: signatureImage,
        notes: document.getElementById('docNotes').value
    };
}

function resetDocumentForm() {
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0;
    logoImage = null;
    stampImage = null;
    signatureImage = null;
    timbreAmount = 0;
    editingDocId = null;
    
    // Reset images UI
    ['logo', 'stamp', 'signature'].forEach(type => {
        document.getElementById(`${type}Preview`).src = '';
        document.getElementById(`${type}Preview`).classList.add('hidden');
        document.getElementById(`${type}Placeholder`).classList.remove('hidden');
        document.getElementById(`${type}Box`).classList.remove('has-image');
        document.getElementById(`${type}Input`).value = '';
    });
    
    document.getElementById('applyTimbre').checked = false;
    document.getElementById('docNotes').value = '';
    
    initNewDocument();
    showToast('Formulaire réinitialisé', 'info');
}

// ==================== DOCUMENT MANAGEMENT ====================
async function loadDocuments() {
    try {
        allDocuments = await window.electronAPI.getDocuments(currentUser.id);
        renderDocumentsTable(allDocuments);
    } catch (err) {
        showToast('Erreur chargement documents', 'error');
    }
}

function renderDocumentsTable(docs) {
    const container = document.getElementById('allDocsTable');
    if (!docs.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📄</div><h3>Aucun document</h3><p>Créez votre premier document pour commencer</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>N°</th><th>Client</th><th>Date</th><th>Total TTC</th><th>Actions</th></tr></thead><tbody>
        ${docs.map(doc => `<tr>
            <td><span class="badge badge-${doc.type}">${doc.type.toUpperCase()}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${doc.number}</td>
            <td>${escapeHtml(doc.clientName)}</td>
            <td>${formatDate(doc.date)}</td>
            <td style="font-weight:600">${doc.totalTTC.toFixed(3)} ${doc.currency}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewDocument('${doc.id}')" title="Aperçu">👁️</button>
                ${doc.type === 'devis' ? `<button class="btn-icon btn-convert" onclick="convertToInvoice('${doc.id}')" title="Convertir en Facture">🔄</button>` : ''}
                <button class="btn-icon btn-edit" onclick="editExistingDoc('${doc.id}')" title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf" onclick="downloadDocPDF('${doc.id}')" title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDoc('${doc.id}')" title="Supprimer">🗑️</button>
            </td>
        </tr>`).join('')}
    </tbody></table>`;
}

function filterDocuments() {
    const search = document.getElementById('searchDocs').value.toLowerCase();
    const type = document.getElementById('filterType').value;
    
    const filtered = allDocuments.filter(doc => {
        const matchesSearch = !search || 
            doc.number.toLowerCase().includes(search) || 
            doc.clientName.toLowerCase().includes(search);
        const matchesType = !type || doc.type === type;
        return matchesSearch && matchesType;
    });
    
    renderDocumentsTable(filtered);
}

async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    populateFormWithDoc(doc);
    generatePreviewHTML();
    document.getElementById('previewModal').classList.add('active');
}

async function editExistingDoc(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    editingDocId = docId;
    populateFormWithDoc(doc);
    
    // Change button to indicate update mode
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerHTML = '💾 Mettre à jour le Document';
    saveBtn.onclick = async () => {
        if (!validateDocumentForm()) return;
        showLoading('Mise à jour...');
        try {
            const docData = collectDocumentData();
            const result = await window.electronAPI.updateDocument({ docId, updates: docData });
            if (result.success) {
                showToast('Document mis à jour', 'success');
                resetDocumentForm();
                navigateTo('documents');
            }
        } catch (err) {
            showToast('Erreur lors de la mise à jour', 'error');
        } finally {
            hideLoading();
        }
    };
    
    navigateTo('new-document');
    showToast('Mode édition activé', 'info');
}

function populateFormWithDoc(doc) {
    // Set document type
    currentDocType = doc.type;
    document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === doc.type);
    updateDocType();
    
    // Company info
    document.getElementById('docCompanyName').value = doc.companyName || '';
    document.getElementById('docCompanyMF').value = doc.companyMF || '';
    document.getElementById('docCompanyAddress').value = doc.companyAddress || '';
    document.getElementById('docCompanyPhone').value = doc.companyPhone || '';
    document.getElementById('docCompanyEmail').value = doc.companyEmail || '';
    document.getElementById('docCompanyRC').value = doc.companyRC || '';
    
    // Client info
    document.getElementById('docClientName').value = doc.clientName || '';
    document.getElementById('docClientMF').value = doc.clientMF || '';
    document.getElementById('docClientAddress').value = doc.clientAddress || '';
    document.getElementById('docClientPhone').value = doc.clientPhone || '';
    document.getElementById('docClientEmail').value = doc.clientEmail || '';
    
    // Document details
    document.getElementById('docNumber').value = doc.number || '';
    document.getElementById('docDate').value = doc.date || '';
    document.getElementById('docDueDate').value = doc.dueDate || '';
    document.getElementById('docCurrency').value = doc.currency || 'TND';
    document.getElementById('docPayment').value = doc.paymentMode || 'Virement bancaire';
    document.getElementById('docNotes').value = doc.notes || '';
    document.getElementById('applyTimbre').checked = doc.applyTimbre || false;
    
    // Images
    logoImage = doc.logoImage || null;
    stampImage = doc.stampImage || null;
    signatureImage = doc.signatureImage || null;
    
    ['logo', 'stamp', 'signature'].forEach(type => {
        const img = type === 'logo' ? logoImage : type === 'stamp' ? stampImage : signatureImage;
        if (img) {
            document.getElementById(`${type}Preview`).src = img;
            document.getElementById(`${type}Preview`).classList.remove('hidden');
            document.getElementById(`${type}Placeholder`).classList.add('hidden');
            document.getElementById(`${type}Box`).classList.add('has-image');
        } else {
            document.getElementById(`${type}Preview`).src = '';
            document.getElementById(`${type}Preview`).classList.add('hidden');
            document.getElementById(`${type}Placeholder`).classList.remove('hidden');
            document.getElementById(`${type}Box`).classList.remove('has-image');
        }
    });
    
    // Items
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0;
    
    if (doc.items && doc.items.length) {
        doc.items.forEach((item, idx) => {
            itemCount++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:center;color:var(--gray-500);font-size:0.82rem">${itemCount}</td>
                <td><input type="text" class="item-input" id="desc${itemCount}" value="${escapeHtml(item.description)}" placeholder="Description..."></td>
                <td><input type="number" class="item-input" id="qty${itemCount}" value="${item.quantity}" min="0.001" step="0.001" onchange="calculateTotals()"></td>
                <td><input type="number" class="item-input" id="price${itemCount}" value="${item.price}" min="0" step="0.001" onchange="calculateTotals()"></td>
                <td>
                    <select class="tva-select" id="tva${itemCount}" onchange="calculateTotals()">
                        <option value="19" ${item.tva === 19 ? 'selected' : ''}>19%</option>
                        <option value="13" ${item.tva === 13 ? 'selected' : ''}>13%</option>
                        <option value="7" ${item.tva === 7 ? 'selected' : ''}>7%</option>
                        <option value="0" ${item.tva === 0 ? 'selected' : ''}>0%</option>
                    </select>
                </td>
                <td style="text-align:right;font-weight:500" id="total${itemCount}">${(item.quantity * item.price).toFixed(3)}</td>
                <td><button type="button" class="btn-icon btn-delete" onclick="removeItem(this)">🗑️</button></td>
            `;
            document.getElementById('itemsBody').appendChild(tr);
        });
    }
    
    calculateTotals();
}

async function convertToInvoice(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    showConfirm(
        '🔄 Convertir en Facture',
        `Convertir le devis ${doc.number} en facture ? Un nouveau numéro de série sera généré.`,
        async () => {
            showLoading('Conversion...');
            try {
                const result = await window.electronAPI.convertDocument({
                    sourceId: docId,
                    targetType: 'facture',
                    userId: currentUser.id,
                    year: new Date().getFullYear()
                });
                
                if (result.success) {
                    showToast('Devis converti en facture', 'success');
                    await loadDocuments();
                    navigateTo('documents');
                }
            } catch (err) {
                showToast('Erreur de conversion', 'error');
            } finally {
                hideLoading();
            }
        },
        'Convertir',
        'btn-primary'
    );
}

function confirmDeleteDoc(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    showConfirm('🗑️ Supprimer', `Supprimer définitivement ${doc?.number} ?`, async () => {
        try {
            await window.electronAPI.deleteDocument(docId);
            showToast('Document supprimé', 'info');
            await loadDocuments();
            await loadDashboard();
        } catch (err) {
            showToast('Erreur suppression', 'error');
        }
    });
}

async function exportAllToExcel() {
    try {
        const result = await window.electronAPI.exportExcelDocuments({ documents: allDocuments });
        if (result.success) {
            showToast(`Excel exporté: ${result.path}`, 'success');
        }
    } catch (err) {
        showToast('Erreur export Excel', 'error');
    }
}

// ==================== CLIENTS MANAGEMENT ====================
async function loadClients() {
    try {
        allClients = await window.electronAPI.getClients(currentUser.id);
        renderClientsTable(allClients);
    } catch (err) {
        showToast('Erreur chargement clients', 'error');
    }
}

function renderClientsTable(clients) {
    const container = document.getElementById('clientsTable');
    if (!clients.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><h3>Aucun client</h3><p>Ajoutez votre premier client</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr><th>Nom</th><th>MF</th><th>Téléphone</th><th>Email</th><th>Actions</th></tr></thead><tbody>
        ${clients.map(c => `<tr>
            <td style="font-weight:600">${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.mf) || '—'}</td>
            <td>${escapeHtml(c.phone) || '—'}</td>
            <td>${escapeHtml(c.email) || '—'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-delete" onclick="confirmDeleteClient('${c.id}')" title="Supprimer">🗑️</button>
            </td>
        </tr>`).join('')}
    </tbody></table>`;
}

function filterClients() {
    const q = document.getElementById('searchClients').value.toLowerCase();
    renderClientsTable(allClients.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.mf && c.mf.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    ));
}

function confirmDeleteClient(clientId) {
    const client = allClients.find(c => c.id === clientId);
    showConfirm('🗑️ Supprimer', `Supprimer "${client?.name}" ?`, async () => {
        try {
            await window.electronAPI.deleteClient(clientId);
            showToast('Client supprimé', 'info');
            await loadClients();
            await loadClientsDropdown();
        } catch (err) {
            showToast('Erreur suppression', 'error');
        }
    });
}

async function exportClientsToExcel() {
    try {
        const result = await window.electronAPI.exportExcelClients({ clients: allClients });
        if (result.success) {
            showToast(`Excel exporté: ${result.path}`, 'success');
        }
    } catch (err) {
        showToast('Erreur export Excel', 'error');
    }
}

// ==================== COMPANY SETTINGS ====================
async function loadCompanyPage() {
    try {
        const c = await window.electronAPI.getCompany(currentUser.id) || {};
        document.getElementById('companyName').value = c.name || currentUser.company || '';
        document.getElementById('companyMF').value = c.mf || currentUser.mf || '';
        document.getElementById('companyAddress').value = c.address || '';
        document.getElementById('companyPhone').value = c.phone || '';
        document.getElementById('companyEmail').value = c.email || '';
        document.getElementById('companyRC').value = c.rc || '';
        document.getElementById('companyWebsite').value = c.website || '';
        document.getElementById('companyBank').value = c.bank || '';
        
        // Update profile card
        document.getElementById('companyProfileName').textContent = c.name || currentUser.company || 'Votre Entreprise';
        document.getElementById('companyProfileMF').textContent = c.mf || currentUser.mf ? `Matricule Fiscal: ${c.mf || currentUser.mf}` : 'Matricule Fiscal: —';
    } catch (err) {
        console.error('Error loading company:', err);
    }
}

async function saveCompanySettings() {
    const settings = {
        userId: currentUser.id,
        name: document.getElementById('companyName').value.trim(),
        mf: document.getElementById('companyMF').value.trim(),
        address: document.getElementById('companyAddress').value.trim(),
        phone: document.getElementById('companyPhone').value.trim(),
        email: document.getElementById('companyEmail').value.trim(),
        rc: document.getElementById('companyRC').value.trim(),
        website: document.getElementById('companyWebsite').value.trim(),
        bank: document.getElementById('companyBank').value.trim()
    };
    
    try {
        await window.electronAPI.saveCompany(settings);
        showToast('Informations entreprise enregistrées', 'success');
        await loadCompanyPage();
    } catch (err) {
        showToast('Erreur d\'enregistrement', 'error');
    }
}

// ==================== BACKUP & SETTINGS ====================
async function loadSettings() {
    try {
        const settings = await window.electronAPI.getBackupSettings();
        document.getElementById('backupEnabled').checked = settings.enabled || false;
        document.getElementById('backupFrequency').value = settings.frequency || 'daily';
        document.getElementById('backupTime').value = settings.time || '02:00';
        document.getElementById('backupKeep').value = settings.keep || 10;
        await loadBackupList();
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

async function loadBackupList() {
    try {
        const backups = await window.electronAPI.getBackupList();
        const container = document.getElementById('backupList');
        if (!backups || !backups.length) {
            container.innerHTML = '<p style="color:#6b7280;font-size:0.9rem">Aucune sauvegarde disponible</p>';
            return;
        }
        container.innerHTML = backups.map(b => `
            <div class="backup-item">
                <div class="backup-item-info">
                    <div class="backup-date">${new Date(b.date).toLocaleString('fr-FR')}</div>
                    <div class="backup-size">${(b.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button class="btn btn-small btn-secondary" onclick="restoreBackup('${b.path}')">Restaurer</button>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading backups:', err);
    }
}

async function saveBackupSettings() {
    const settings = {
        enabled: document.getElementById('backupEnabled').checked,
        frequency: document.getElementById('backupFrequency').value,
        time: document.getElementById('backupTime').value,
        keep: parseInt(document.getElementById('backupKeep').value) || 10
    };
    
    try {
        await window.electronAPI.saveBackupSettings(settings);
        showToast('Paramètres de sauvegarde enregistrés', 'success');
    } catch (err) {
        showToast('Erreur d\'enregistrement', 'error');
    }
}

async function createManualBackup() {
    showLoading('Création de la sauvegarde...');
    try {
        const result = await window.electronAPI.createManualBackup();
        if (result.success) {
            showToast('Sauvegarde créée', 'success');
            await loadBackupList();
        }
    } catch (err) {
        showToast('Erreur de sauvegarde', 'error');
    } finally {
        hideLoading();
    }
}

async function restoreFromBackup() {
    // This would typically open a file dialog to select a backup file
    showToast('Sélectionnez une sauvegarde dans la liste ci-dessous', 'info');
}

async function restoreBackup(backupPath) {
    showConfirm(
        '📤 Restaurer',
        'Cela remplacera toutes les données actuelles. Continuer ?',
        async () => {
            showLoading('Restauration...');
            try {
                const result = await window.electronAPI.restoreBackup(backupPath);
                if (result.success) {
                    showToast('Restauration terminée. Redémarrage...', 'success');
                    setTimeout(() => location.reload(), 2000);
                }
            } catch (err) {
                showToast('Erreur de restauration', 'error');
            } finally {
                hideLoading();
            }
        },
        'Restaurer',
        'btn-warning'
    );
}

// ==================== UTILS ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR');
}