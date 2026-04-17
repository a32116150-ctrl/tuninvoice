// ==================== GLOBALS ====================
let currentUser = null;
let currentDocType = 'facture';
let itemCount = 0;
let timbreAmount = 0;
let allDocuments = [];
let allClients = [];
let allServices = [];
let editingServiceId = null;
let editingDocId = null;
let confirmCallback = null;
let currentSettings = {};
let companyImages = { logo: null, stamp: null, signature: null }; // from company settings

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Check localStorage first for persistent login
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            showApp();
            return;
        } catch {}
    }
    // Fallback to sessionStorage
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
function executeConfirm() {
    if (typeof confirmCallback === 'function') {
        const action = confirmCallback;
        confirmCallback = null;
        closeConfirm();
        action();
    }
}
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
        const result = await window.electronAPI.authLogin({
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        });
        if (result.success) {
            const safeUser = { 
                id: result.user.id || result.user._id, 
                name: result.user.name || 'User', 
                email: result.user.email, 
                company: result.user.company || '', 
                mf: result.user.mf || '' 
            };
            currentUser = safeUser;
            const remember = document.getElementById('rememberMeCheckbox').checked;
            if (remember) {
                localStorage.setItem('currentUser', JSON.stringify(safeUser));
                sessionStorage.removeItem('currentUser');
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(safeUser));
                localStorage.removeItem('currentUser');
            }
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
        const result = await window.electronAPI.authRegister({
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
    localStorage.removeItem('currentUser');
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
    const pages = ['dashboard','new-document','documents','clients','services','contrat','company','settings'];
    const idx = pages.indexOf(page);
    const navItems = document.querySelectorAll('.nav-item');
    if (idx !== -1 && navItems[idx]) navItems[idx].classList.add('active');
    if (page === 'dashboard')  loadDashboard();
    if (page === 'documents')  loadDocuments();
    if (page === 'clients')    loadClients();
    if (page === 'services')   loadServices();
    if (page === 'contrat')    initContractPage();
    if (page === 'company')    loadCompanyPage();
    if (page === 'settings')   { loadSettings(); loadSerialSettings(); loadThemeSettings(); }
}

function createDocOfType(type) {
    currentDocType = type;
    document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === type);
    updateDocType();
    navigateTo('new-document');
}

// ==================== DASHBOARD (ENHANCED) ====================
let monthlyChart = null, docTypeChart = null;

async function loadDashboard() {
    try {
        const stats = await window.electronAPI.getStats(currentUser.id);
        document.getElementById('statTotalDocs').textContent    = stats.totalDocs;
        document.getElementById('statTotalRevenue').textContent = stats.totalRevenue.toFixed(3) + ' TND';
        document.getElementById('statTotalClients').textContent = stats.totalClients;
        document.getElementById('statThisMonth').textContent    = stats.thisMonth;
        const docs = await window.electronAPI.getDocuments(currentUser.id);
        allDocuments = docs;
        renderRecentDocs(docs.slice(0, 6));

        // Prepare charts data
        const monthlyData = await prepareMonthlyRevenueData(docs);
        const typeCounts = { facture:0, devis:0, bon:0 };
        docs.forEach(d => typeCounts[d.type]++);
        
        // Render charts
        if (monthlyChart) monthlyChart.destroy();
        if (docTypeChart) docTypeChart.destroy();
        const ctx1 = document.getElementById('monthlyRevenueChart').getContext('2d');
        monthlyChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{ label: 'Revenus (TND)', data: monthlyData.values, backgroundColor: '#3b82f6' }]
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
        const ctx2 = document.getElementById('docTypeChart').getContext('2d');
        docTypeChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Factures', 'Devis', 'Bons de commande'],
                datasets: [{ data: [typeCounts.facture, typeCounts.devis, typeCounts.bon], backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'] }]
            }
        });

        // Top clients by total amount
        const clientTotals = {};
        docs.forEach(doc => {
            if (doc.type === 'facture') {
                clientTotals[doc.clientName] = (clientTotals[doc.clientName] || 0) + doc.totalTTC;
            }
        });
        const topClients = Object.entries(clientTotals).sort((a,b) => b[1]-a[1]).slice(0,3);
        const topClientsDiv = document.getElementById('topClientsList');
        topClientsDiv.innerHTML = topClients.length ? topClients.map(([name,amount]) => `<div><strong>${escapeHtml(name)}</strong> : ${amount.toFixed(2)} TND</div>`).join('') : '<p>Aucune facture</p>';
        
        // Pending invoices (simulated - you may add a 'status' field later)
        const pendingDiv = document.getElementById('pendingInvoicesList');
        pendingDiv.innerHTML = '<p>Fonctionnalité à venir (statut de paiement)</p>';
    } catch { showToast('Erreur tableau de bord', 'error'); }
}

async function prepareMonthlyRevenueData(docs) {
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const values = new Array(12).fill(0);
    docs.forEach(doc => {
        if (doc.type === 'facture') {
            const date = new Date(doc.date);
            const month = date.getMonth();
            values[month] += doc.totalTTC;
        }
    });
    return { labels: months, values };
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
            </td>
        </tr>`).join('')}
    </tbody></tr>`;
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
        // Load company images (will be used in preview)
        companyImages.logo      = c.logo_image || null;
        companyImages.stamp     = c.stamp_image || null;
        companyImages.signature = c.signature_image || null;
    } catch {}
}

function selectDocType(type) { currentDocType = type; document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === type); updateDocType(); }

function updateDocType() {
    currentDocType = document.querySelector('input[name="docType"]:checked').value;
    document.getElementById('dueDateGroup').style.display = currentDocType === 'facture' ? 'block' : 'none';
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
            option.value = JSON.stringify({ name: s.name, description: s.description, price: s.price, tva: s.tva });
            option.textContent = `${s.name} - ${parseFloat(s.price).toFixed(3)} TND (${s.tva}%)`;
            select.appendChild(option);
        });
    } catch {}
}

function addPresetService() {
    const select = document.getElementById('presetServiceSelect');
    if (!select.value) return;
    const service = JSON.parse(select.value);
    addItem();
    const currentRow = itemCount;
    document.getElementById(`desc${currentRow}`).value = service.description ?
        `${service.name} - ${service.description}` : service.name;
    document.getElementById(`price${currentRow}`).value = service.price;
    document.getElementById(`tva${currentRow}`).value = service.tva;
    select.value = '';
    calculateTotals();
    showToast('Service ajouté', 'success');
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
    if (!name) { showToast('Le nom du service est requis', 'warning'); return; }
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
        await window.electronAPI.updateSettings({ userId: currentUser.id, settings: settings });
        showToast('Paramètres de numérotation enregistrés', 'success');
        await loadSerialSettings();
    } catch (err) {
        showToast('Erreur d\'enregistrement', 'error');
    }
}

function openResetCounterModal() {
    showConfirm(
        '🔄 Réinitialiser le compteur',
        'Cela réinitialisera la séquence de numérotation à 001 pour l\'année en cours. Continuer ?',
        async () => {
            try {
                await window.electronAPI.resetCounter({ userId: currentUser.id, type: 'all', year: new Date().getFullYear() });
                showToast('Compteur réinitialisé', 'success');
                await loadSerialSettings();
                if (document.getElementById('page-new-document').classList.contains('active')) {
                    const number = await window.electronAPI.getNextDocNumber({ userId: currentUser.id, type: currentDocType, year: new Date().getFullYear() });
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

// ==================== PREVIEW & SAVE (using company images) ====================
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

    const color = getDocTypeColor(currentDocType);
    const typeLabel = getDocTypeLabel(currentDocType);

    let totalHT=0, tva19=0, tva13=0, tva7=0;
    const items = [];
    for (let i=1;i<=itemCount;i++) {
        const desc=document.getElementById(`desc${i}`)?.value.trim();
        const qty=parseFloat(document.getElementById(`qty${i}`)?.value)||0;
        const price=parseFloat(document.getElementById(`price${i}`)?.value)||0;
        const tva=parseFloat(document.getElementById(`tva${i}`)?.value)||0;
        if (!desc) continue;
        const line=qty*price; totalHT+=line;
        if (tva===19) tva19+=line*(tva/100); else if (tva===13) tva13+=line*(tva/100); else if (tva===7) tva7+=line*(tva/100);
        items.push({ description: desc, quantity: qty, price, tva });
    }
    const totalTTC = totalHT + tva19 + tva13 + tva7 + timbreAmount;
    const logoHTML = companyImages.logo ? `<img src="${companyImages.logo}" style="max-width:140px;max-height:80px;object-fit:contain;margin-bottom:12px;display:block">` : '';

    document.getElementById('previewContent').innerHTML = buildInvoicePreviewHTML({
        color, typeLabel, companyName, companyMF, companyAddress, companyPhone, companyEmail, companyRC,
        clientName, clientMF, clientAddress, clientPhone, clientEmail,
        docNumber, docDate, docDueDate, currency, paymentMode, notes,
        logoHTML, items, totalHT, tva19, tva13, tva7, totalTTC, timbreAmount,
        stampImage: companyImages.stamp, signatureImage: companyImages.signature
    });
}

function buildInvoicePreviewHTML(d) {
    const itemsHTML = d.items.map((item, i) => `
        <tr style="border-bottom:1px solid #F5F5F5">
            <td style="padding:14px 0;color:#6b7280;font-size:0.82rem">${i+1}</td>
            <td style="padding:14px 0">${escapeHtml(item.description)}</td>
            <td style="padding:14px 0;text-align:center">${item.quantity}</td>
            <td style="padding:14px 0;text-align:right">${item.price.toFixed(3)}</td>
            <td style="padding:14px 0;text-align:center">${item.tva}%</td>
            <td style="padding:14px 0;text-align:right;font-weight:600">${(item.quantity * item.price).toFixed(3)}</td>
        </tr>`).join('');

    return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',Inter,sans-serif;color:#0A0A0A;padding:40px;max-width:900px;margin:auto;line-height:1.6;font-size:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:50px">
            <div>
                ${d.logoHTML || ''}
                <div style="font-size:20px;font-weight:700;margin-top:10px">${escapeHtml(d.companyName)}</div>
                <div style="margin-top:12px;color:#555;font-size:13px">
                    ${d.companyAddress ? `<div>${escapeHtml(d.companyAddress)}</div>` : ''}
                    ${d.companyPhone ? `<div>${escapeHtml(d.companyPhone)}</div>` : ''}
                    ${d.companyEmail ? `<div>${escapeHtml(d.companyEmail)}</div>` : ''}
                    ${d.companyMF ? `<div>MF: ${escapeHtml(d.companyMF)}</div>` : ''}
                    ${d.companyRC ? `<div>RC: ${escapeHtml(d.companyRC)}</div>` : ''}
                </div>
            </div>
            <div style="text-align:right">
                <div style="font-size:34px;font-weight:800;letter-spacing:-1px">${d.typeLabel}</div>
                <div style="width:60px;height:3px;background:${d.color};margin:12px 0 18px auto"></div>
                <div style="font-size:13px;color:#444">
                    <div><strong>#</strong> ${escapeHtml(d.docNumber)}</div>
                    <div><strong>Date:</strong> ${formatDate(d.docDate)}</div>
                    ${d.docDueDate ? `<div><strong>Échéance:</strong> ${formatDate(d.docDueDate)}</div>` : ''}
                    ${d.paymentMode ? `<div><strong>Paiement:</strong> ${escapeHtml(d.paymentMode)}</div>` : ''}
                </div>
            </div>
        </div>
        <div style="margin-bottom:40px">
            <div style="font-size:11px;letter-spacing:1px;color:#888;text-transform:uppercase">Facturé à</div>
            <div style="margin-top:8px">
                <div style="font-weight:600;font-size:15px">${escapeHtml(d.clientName)}</div>
                <div style="margin-top:6px;color:#555;font-size:13px">
                    ${d.clientAddress ? `<div>${escapeHtml(d.clientAddress)}</div>` : ''}
                    ${d.clientPhone ? `<div>${escapeHtml(d.clientPhone)}</div>` : ''}
                    ${d.clientEmail ? `<div>${escapeHtml(d.clientEmail)}</div>` : ''}
                    ${d.clientMF ? `<div>MF: ${escapeHtml(d.clientMF)}</div>` : ''}
                </div>
            </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:40px">
            <thead>
                <tr style="text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888;border-bottom:1px solid #EAEAEA">
                    <th style="padding:10px 0">#</th>
                    <th style="padding:10px 0">Description</th>
                    <th style="padding:10px 0;text-align:center">Qté</th>
                    <th style="padding:10px 0;text-align:right">Prix HT</th>
                    <th style="padding:10px 0;text-align:center">TVA</th>
                    <th style="padding:10px 0;text-align:right">Total HT</th>
                </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end">
            <div style="width:320px">
                <div style="display:flex;justify-content:space-between;padding:6px 0;color:#555"><span>Total HT</span><span>${d.totalHT.toFixed(3)} ${d.currency}</span></div>
                ${d.tva19 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#555"><span>TVA 19%</span><span>${d.tva19.toFixed(3)} ${d.currency}</span></div>` : ''}
                ${d.tva13 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#555"><span>TVA 13%</span><span>${d.tva13.toFixed(3)} ${d.currency}</span></div>` : ''}
                ${d.tva7  ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#555"><span>TVA 7%</span><span>${d.tva7.toFixed(3)} ${d.currency}</span></div>` : ''}
                ${d.timbreAmount ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#555"><span>Timbre fiscal</span><span>${d.timbreAmount.toFixed(3)} ${d.currency}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:2px solid #111;font-size:18px;font-weight:700">
                    <span>Total TTC</span><span>${d.totalTTC.toFixed(3)} ${d.currency}</span>
                </div>
            </div>
        </div>
        ${d.notes ? `<div style="margin-top:50px;padding-top:20px;border-top:1px solid #EAEAEA;font-size:13px;color:#666">${escapeHtml(d.notes).replace(/\n/g,'<br>')}</div>` : ''}
        <div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end">
            ${d.signatureImage ? `<div><div style="font-size:11px;color:#aaa;margin-bottom:6px">Signature</div><img src="${d.signatureImage}" style="max-height:80px"></div>` : '<div></div>'}
            ${d.stampImage ? `<div><img src="${d.stampImage}" style="max-height:100px;opacity:0.8"></div>` : '<div></div>'}
        </div>
        <div style="margin-top:40px;font-size:11px;color:#AAA;text-align:center">TuniInvoice Pro — Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
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

            // Build and save the PDF for the just-saved document
            generatePreviewHTML();
            const html = buildFullHTML();
            const filename = `${result.document.number}.pdf`;
            hideLoading();

            const pdfResult = await window.electronAPI.savePDF({ html, filename });
            if (pdfResult.success) {
                showToast('PDF enregistré avec succès', 'success');
            }

            resetDocumentForm();
            navigateTo('documents');
        }
    } catch (err) {
        showToast("Erreur lors de l'enregistrement", 'error');
    } finally {
        hideLoading();
    }
}

// ==================== PDF HELPERS ====================
function buildFullHTML() {
    const inner = document.getElementById('previewContent').innerHTML;
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>${inner}</body>
</html>`;
}

async function downloadPDF() {
    const docNumber = document.getElementById('docNumber')?.value || 'facture';
    const filename = `${docNumber}.pdf`;

    generatePreviewHTML();
    const html = buildFullHTML();

    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename });
        if (result.success) {
            showToast('✅ PDF enregistré avec succès', 'success');
            closePreview();
        } else if (!result.canceled) {
            showToast('Erreur lors de la génération du PDF', 'error');
        }
    } catch (err) {
        showToast('Erreur PDF: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

async function printDocument() {
    generatePreviewHTML();
    const html = buildFullHTML();

    showLoading('Ouverture de l\'impression...');
    try {
        const result = await window.electronAPI.printPDF({ html });
        if (!result.success && result.error) {
            showToast('Erreur impression: ' + result.error, 'error');
        }
    } catch (err) {
        showToast('Erreur impression: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

async function downloadDocPDF(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    const originalEditingId = editingDocId;
    editingDocId = docId;

    populateFormWithDoc(doc);
    generatePreviewHTML();
    const html = buildFullHTML();
    const filename = `${doc.number}.pdf`;

    editingDocId = originalEditingId;

    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename });
        if (result.success) {
            showToast('✅ PDF enregistré: ' + result.path, 'success');
        } else if (!result.canceled) {
            showToast('Erreur lors de la génération du PDF', 'error');
        }
    } catch (err) {
        showToast('Erreur PDF: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
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
        items,
        applyTimbre: document.getElementById('applyTimbre').checked,
        timbreAmount,
        totalHT: parseFloat(document.getElementById('totalHT').textContent) || 0,
        totalTTC: parseFloat(document.getElementById('totalTTC').textContent) || 0,
        // No logo/stamp/signature per document – they come from company settings
        notes: document.getElementById('docNotes').value
    };
}

function resetDocumentForm() {
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0;
    timbreAmount = 0; editingDocId = null;
    document.getElementById('applyTimbre').checked = false;
    document.getElementById('docNotes').value = '';
    initNewDocument();
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
        const matchesSearch = !search || doc.number.toLowerCase().includes(search) || doc.clientName.toLowerCase().includes(search);
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
    currentDocType = doc.type;
    document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === doc.type);
    updateDocType();
    document.getElementById('docCompanyName').value = doc.companyName || '';
    document.getElementById('docCompanyMF').value = doc.companyMF || '';
    document.getElementById('docCompanyAddress').value = doc.companyAddress || '';
    document.getElementById('docCompanyPhone').value = doc.companyPhone || '';
    document.getElementById('docCompanyEmail').value = doc.companyEmail || '';
    document.getElementById('docCompanyRC').value = doc.companyRC || '';
    document.getElementById('docClientName').value = doc.clientName || '';
    document.getElementById('docClientMF').value = doc.clientMF || '';
    document.getElementById('docClientAddress').value = doc.clientAddress || '';
    document.getElementById('docClientPhone').value = doc.clientPhone || '';
    document.getElementById('docClientEmail').value = doc.clientEmail || '';
    document.getElementById('docNumber').value = doc.number || '';
    document.getElementById('docDate').value = doc.date || '';
    document.getElementById('docDueDate').value = doc.dueDate || '';
    document.getElementById('docCurrency').value = doc.currency || 'TND';
    document.getElementById('docPayment').value = doc.paymentMode || 'Virement bancaire';
    document.getElementById('docNotes').value = doc.notes || '';
    document.getElementById('applyTimbre').checked = doc.applyTimbre || false;
    // Note: logo/stamp/signature not stored per document; they come from company settings
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0;
    if (doc.items && doc.items.length) {
        doc.items.forEach(item => {
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
                        <option value="7"  ${item.tva === 7  ? 'selected' : ''}>7%</option>
                        <option value="0"  ${item.tva === 0  ? 'selected' : ''}>0%</option>
                    </select>
                </td>
                <td style="text-align:right;font-weight:500" id="total${itemCount}">${(item.quantity * item.price).toFixed(3)}</td>
                <td><button type="button" class="btn-icon btn-delete" onclick="removeItem(this)">🗑️</button></td>`;
            document.getElementById('itemsBody').appendChild(tr);
        });
    }
    calculateTotals();
}

async function convertToInvoice(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    showConfirm('🔄 Convertir en Facture', `Convertir le devis ${doc.number} en facture ?`, async () => {
        showLoading('Conversion...');
        try {
            const result = await window.electronAPI.convertDocument({ sourceId: docId, targetType: 'facture', userId: currentUser.id, year: new Date().getFullYear() });
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
    }, 'Convertir', 'btn-primary');
}

async function confirmDeleteDoc(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    showConfirm('🗑️ Supprimer', `Supprimer définitivement ${doc?.number} ?`, async () => {
        showLoading('Suppression...');
        try {
            const result = await window.electronAPI.deleteDocument(docId);
            if (result.success) {
                showToast('Document supprimé', 'info');
                await loadDocuments();
                await loadDashboard();
            }
        } catch (err) {
            showToast('Erreur lors de la suppression', 'error');
        } finally {
            hideLoading();
        }
    });
}

async function exportAllToExcel() {
    try {
        const result = await window.electronAPI.exportExcelDocuments({ documents: allDocuments });
        if (result.success) showToast(`Excel exporté: ${result.path}`, 'success');
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
        if (result.success) showToast(`Excel exporté: ${result.path}`, 'success');
    } catch (err) {
        showToast('Erreur export Excel', 'error');
    }
}

// ==================== COMPANY SETTINGS (with logo/stamp/signature) ====================
async function loadCompanyPage() {
    try {
        const c = await window.electronAPI.getCompany(currentUser.id) || {};
        document.getElementById('companyName').value    = c.name    || currentUser.company || '';
        document.getElementById('companyMF').value      = c.mf      || currentUser.mf      || '';
        document.getElementById('companyAddress').value = c.address  || '';
        document.getElementById('companyPhone').value   = c.phone    || '';
        document.getElementById('companyEmail').value   = c.email    || '';
        document.getElementById('companyRC').value      = c.rc       || '';
        document.getElementById('companyWebsite').value = c.website  || '';
        document.getElementById('companyBank').value    = c.bank     || '';
        document.getElementById('companyProfileName').textContent = c.name || currentUser.company || 'Votre Entreprise';
        document.getElementById('companyProfileMF').textContent   = (c.mf || currentUser.mf) ? `Matricule Fiscal: ${c.mf || currentUser.mf}` : 'Matricule Fiscal: —';
        
        // Load images
        companyImages.logo      = c.logo_image || null;
        companyImages.stamp     = c.stamp_image || null;
        companyImages.signature = c.signature_image || null;
        updateCompanyImagePreviews();
    } catch (err) {
        console.error('Error loading company:', err);
    }
}

function updateCompanyImagePreviews() {
    const types = ['logo', 'stamp', 'signature'];
    types.forEach(type => {
        const img = companyImages[type];
        const preview = document.getElementById(`company${type.charAt(0).toUpperCase() + type.slice(1)}Preview`);
        const placeholder = document.getElementById(`company${type.charAt(0).toUpperCase() + type.slice(1)}Placeholder`);
        const box = document.getElementById(`company${type.charAt(0).toUpperCase() + type.slice(1)}Box`);
        if (img) {
            preview.src = img;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
            box.classList.add('has-image');
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
            box.classList.remove('has-image');
        }
    });
}

function handleCompanyImageUpload(input, type) {
    if (!input.files?.[0]) return;
    if (input.files[0].size > 5*1024*1024) { showToast('Image trop lourde (max 5 MB)','warning'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target.result;
        companyImages[type] = data;
        updateCompanyImagePreviews();
    };
    reader.readAsDataURL(input.files[0]);
}

function removeCompanyImage(type) {
    companyImages[type] = null;
    updateCompanyImagePreviews();
    document.getElementById(`company${type.charAt(0).toUpperCase() + type.slice(1)}Input`).value = '';
}

async function saveCompanySettings() {
    const settings = {
        userId: currentUser.id,
        name:    document.getElementById('companyName').value.trim(),
        mf:      document.getElementById('companyMF').value.trim(),
        address: document.getElementById('companyAddress').value.trim(),
        phone:   document.getElementById('companyPhone').value.trim(),
        email:   document.getElementById('companyEmail').value.trim(),
        rc:      document.getElementById('companyRC').value.trim(),
        website: document.getElementById('companyWebsite').value.trim(),
        bank:    document.getElementById('companyBank').value.trim(),
        logo_image: companyImages.logo,
        stamp_image: companyImages.stamp,
        signature_image: companyImages.signature
    };
    try {
        await window.electronAPI.saveCompany(settings);
        showToast('Informations entreprise enregistrées', 'success');
        await loadCompanyPage();
    } catch (err) {
        showToast('Erreur d\'enregistrement', 'error');
    }
}

// ==================== CONTRAT FEATURE ====================
let currentContractType = 'cdi';

function selectContractType(type, element) {
    currentContractType = type;
    document.querySelectorAll('#page-contrat .doc-type-card').forEach(card => card.classList.remove('selected'));
    element.classList.add('selected');
    updateContractForm();
}

function updateContractForm() {
    const container = document.getElementById('dynamicContractFields');
    let html = '<div class="section-title">📝 Détails du contrat</div><div class="grid-2">';
    if (currentContractType === 'cdi') {
        html += `<div class="form-group"><label>Date de début</label><input type="date" id="contractStartDate"></div>
                 <div class="form-group"><label>Période d'essai (mois)</label><input type="number" id="contractTrialMonths" value="2" step="1" min="0"></div>`;
    } else if (currentContractType === 'cdd') {
        html += `<div class="form-group"><label>Date de début</label><input type="date" id="contractStartDate"></div>
                 <div class="form-group"><label>Date de fin</label><input type="date" id="contractEndDate"></div>
                 <div class="form-group"><label>Motif (remplacement, accroissement...)</label><input type="text" id="contractCddReason" placeholder="ex: remplacement d'un salarié absent"></div>`;
    } else if (currentContractType === 'essai') {
        html += `<div class="form-group"><label>Date de début</label><input type="date" id="contractStartDate"></div>
                 <div class="form-group"><label>Durée de la période d'essai (mois)</label><input type="number" id="contractTrialMonths" value="1" step="1" min="1"></div>`;
    } else if (currentContractType === 'prestation') {
        html += `<div class="form-group"><label>Description de la prestation</label><textarea id="contractServiceDesc" rows="2" placeholder="Détail des services à fournir..."></textarea></div>
                 <div class="form-group"><label>Tarif journalier / forfait (TND)</label><input type="number" id="contractDailyRate" step="0.001" placeholder="0.000"></div>
                 <div class="form-group"><label>Date de début</label><input type="date" id="contractStartDate"></div>
                 <div class="form-group"><label>Date de fin (optionnel)</label><input type="date" id="contractEndDate"></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function initContractPage() {
    // reset form
    document.getElementById('contractClientName').value = '';
    document.getElementById('contractClientAddress').value = '';
    document.getElementById('contractClientPhone').value = '';
    document.getElementById('contractClientEmail').value = '';
    document.getElementById('contractPosition').value = '';
    document.getElementById('contractSalary').value = '';
    // Set default contract type to CDI
    currentContractType = 'cdi';
    const cards = document.querySelectorAll('#page-contrat .doc-type-card');
    cards.forEach(card => card.classList.remove('selected'));
    cards[0].classList.add('selected');
    updateContractForm();
}

async function generateContract() {
    const clientName = document.getElementById('contractClientName').value.trim();
    if (!clientName) { showToast('Le nom du cocontractant est requis', 'warning'); return; }
    const position = document.getElementById('contractPosition').value.trim();
    if ((currentContractType === 'cdi' || currentContractType === 'cdd') && !position) {
        showToast('Le poste est requis pour CDI/CDD', 'warning'); return;
    }
    const salary = parseFloat(document.getElementById('contractSalary').value);
    if ((currentContractType === 'cdi' || currentContractType === 'cdd') && isNaN(salary)) {
        showToast('Le salaire est requis', 'warning'); return;
    }

    // Get company info
    const company = await window.electronAPI.getCompany(currentUser.id) || {};
    const companyName = company.name || currentUser.company || 'Votre Entreprise';
    const companyAddress = company.address || '';
    const companyPhone = company.phone || '';
    const companyEmail = company.email || '';
    const companyMF = company.mf || currentUser.mf || '';

    // Build contract HTML
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    let contractHtml = `
    <div style="font-family:'Times New Roman', serif; max-width:800px; margin:0 auto; padding:40px; background:white; line-height:1.5;">
        <div style="text-align:center; margin-bottom:30px;">
            ${companyImages.logo ? `<img src="${companyImages.logo}" style="max-height:80px; margin-bottom:10px;">` : ''}
            <h1>CONTRAT DE TRAVAIL</h1>
            <p><strong>${companyName}</strong><br>${companyAddress}<br>${companyPhone ? 'Tél: '+companyPhone : ''}${companyEmail ? ' - Email: '+companyEmail : ''}</p>
        </div>
        <p>Entre les soussignés :</p>
        <p><strong>${companyName}</strong>, représentée par son gérant, agissant en qualité d'employeur,<br>
        d'une part,</p>
        <p>Et <strong>${escapeHtml(clientName)}</strong>, demeurant ${escapeHtml(document.getElementById('contractClientAddress').value || '...')},<br>
        d'autre part,</p>
        <p>Il a été convenu ce qui suit :</p>
    `;
    if (currentContractType === 'cdi') {
        const startDate = document.getElementById('contractStartDate').value || now.toISOString().slice(0,10);
        const trialMonths = document.getElementById('contractTrialMonths').value || 2;
        contractHtml += `
        <h3>Article 1 : Engagement</h3>
        <p>L'employeur engage le salarié à compter du ${formatDate(startDate)} en qualité de <strong>${escapeHtml(position)}</strong>, dans le cadre d'un Contrat à Durée Indéterminée (CDI).</p>
        <h3>Article 2 : Période d'essai</h3>
        <p>Le présent contrat est assorti d'une période d'essai de ${trialMonths} mois, conformément à la convention collective applicable.</p>
        <h3>Article 3 : Rémunération</h3>
        <p>Le salarié percevra un salaire mensuel brut de <strong>${salary.toFixed(3)} TND</strong>, payable à la fin de chaque mois.</p>
        `;
    } else if (currentContractType === 'cdd') {
        const startDate = document.getElementById('contractStartDate').value;
        const endDate = document.getElementById('contractEndDate').value;
        const reason = document.getElementById('contractCddReason').value || 'surcroît temporaire d\'activité';
        contractHtml += `
        <h3>Article 1 : Engagement</h3>
        <p>L'employeur engage le salarié en qualité de <strong>${escapeHtml(position)}</strong> dans le cadre d'un Contrat à Durée Déterminée (CDD) du ${formatDate(startDate)} au ${formatDate(endDate)}.</p>
        <p><strong>Motif du CDD :</strong> ${escapeHtml(reason)}.</p>
        <h3>Article 2 : Rémunération</h3>
        <p>Le salarié percevra un salaire mensuel brut de <strong>${salary.toFixed(3)} TND</strong>.</p>
        `;
    } else if (currentContractType === 'essai') {
        const startDate = document.getElementById('contractStartDate').value || now.toISOString().slice(0,10);
        const trialMonths = document.getElementById('contractTrialMonths').value || 1;
        contractHtml += `
        <h3>Article 1 : Engagement à l'essai</h3>
        <p>L'employeur engage le salarié à compter du ${formatDate(startDate)} en qualité de <strong>${escapeHtml(position)}</strong> pour une période d'essai de ${trialMonths} mois.</p>
        <p>A l'issue de cette période, si les aptitudes professionnelles sont satisfaisantes, un CDI pourra être proposé.</p>
        <h3>Article 2 : Rémunération</h3>
        <p>Pendant la période d'essai, le salarié percevra un salaire mensuel brut de <strong>${salary.toFixed(3)} TND</strong>.</p>
        `;
    } else if (currentContractType === 'prestation') {
        const serviceDesc = document.getElementById('contractServiceDesc').value || 'prestations décrites en annexe';
        const rate = parseFloat(document.getElementById('contractDailyRate').value) || 0;
        const startDate = document.getElementById('contractStartDate').value;
        const endDate = document.getElementById('contractEndDate').value;
        contractHtml += `
        <h3>Article 1 : Objet</h3>
        <p>Le prestataire s'engage à fournir à la société <strong>${companyName}</strong> les prestations suivantes :<br>${escapeHtml(serviceDesc)}</p>
        <h3>Article 2 : Durée</h3>
        <p>La prestation débutera le ${formatDate(startDate)}${endDate ? ` et se terminera le ${formatDate(endDate)}` : ', sans date de fin prédéterminée'}.</p>
        <h3>Article 3 : Rémunération</h3>
        <p>En contrepartie, le prestataire facturera un tarif journalier de <strong>${rate.toFixed(3)} TND HT</strong> (hors taxes).</p>
        `;
    }
    contractHtml += `
        <h3>Article 4 : Lieu de travail</h3>
        <p>Le travail sera effectué au siège social de l'entreprise ou à distance selon les besoins du service.</p>
        <h3>Article 5 : Obligations</h3>
        <p>Le salarié s'engage à respecter les règles internes et à faire preuve de discrétion professionnelle.</p>
        <p>Fait en deux exemplaires originaux, à ${companyAddress || 'Tunis'}, le ${dateStr}.</p>
        <div style="margin-top:50px; display:flex; justify-content:space-between;">
            <div>Signature de l'employeur<br><br><br>${companyImages.signature ? `<img src="${companyImages.signature}" style="max-height:60px;">` : '(cachet et signature)'}</div>
            <div>Signature du cocontractant<br><br><br>____________________</div>
        </div>
        ${companyImages.stamp ? `<div style="text-align:center; margin-top:30px;"><img src="${companyImages.stamp}" style="max-height:80px; opacity:0.8;"></div>` : ''}
        <div style="margin-top:30px; font-size:10px; text-align:center;">Généré par TuniInvoice Pro le ${dateStr}</div>
    </div>`;
    
    // Display in preview modal (reuse same modal)
    document.getElementById('previewContent').innerHTML = contractHtml;
    document.getElementById('previewModal').classList.add('active');
}

// ==================== BACKUP & SETTINGS ====================
async function loadSettings() {
    try {
        const settings = await window.electronAPI.getBackupSettings();
        document.getElementById('backupEnabled').checked  = settings.enabled   || false;
        document.getElementById('backupFrequency').value  = settings.frequency || 'daily';
        document.getElementById('backupTime').value       = settings.time      || '02:00';
        document.getElementById('backupKeep').value       = settings.keepCount || 10;
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
                    <div class="backup-date">${new Date(b.created).toLocaleString('fr-FR')}</div>
                    <div class="backup-size">${(b.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button class="btn btn-small btn-secondary" onclick="restoreBackup('${b.path}')">Restaurer</button>
            </div>`).join('');
    } catch (err) {
        console.error('Error loading backups:', err);
    }
}

async function saveBackupSettings() {
    const settings = {
        enabled:   document.getElementById('backupEnabled').checked,
        frequency: document.getElementById('backupFrequency').value,
        time:      document.getElementById('backupTime').value,
        keepCount: parseInt(document.getElementById('backupKeep').value) || 10
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

async function restoreBackup(backupPath) {
    showConfirm('📤 Restaurer', 'Cela remplacera toutes les données actuelles. Continuer ?', async () => {
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
    }, 'Restaurer', 'btn-warning');
}

// ==================== THEME SETTINGS ====================
let currentTheme = {
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: "14px",
    titles: {
        facture: { text: "FACTURE",          color: "#1e3a8a" },
        devis:   { text: "DEVIS",            color: "#92400e" },
        bon:     { text: "BON DE COMMANDE",  color: "#065f46" }
    }
};

async function loadThemeSettings() {
    if (!currentUser) return;
    try {
        const settings = await window.electronAPI.getThemeSettings(currentUser.id);
        if (settings) {
            currentTheme = { ...currentTheme, ...settings };
            applyThemeToUI();
            updateThemePreview();
        }
    } catch (err) {
        console.error('Error loading theme:', err);
    }
}

function applyThemeToUI() {
    document.getElementById('docFontFamily').value      = currentTheme.fontFamily;
    document.getElementById('docFontSize').value        = currentTheme.fontSize;
    document.getElementById('titleFacture').value       = currentTheme.titles.facture.text;
    document.getElementById('colorFacture').value       = currentTheme.titles.facture.color;
    document.getElementById('colorFactureHex').textContent = currentTheme.titles.facture.color;
    document.getElementById('titleDevis').value         = currentTheme.titles.devis.text;
    document.getElementById('colorDevis').value         = currentTheme.titles.devis.color;
    document.getElementById('colorDevisHex').textContent   = currentTheme.titles.devis.color;
    document.getElementById('titleBon').value           = currentTheme.titles.bon.text;
    document.getElementById('colorBon').value           = currentTheme.titles.bon.color;
    document.getElementById('colorBonHex').textContent     = currentTheme.titles.bon.color;
}

function updateThemePreview() {
    document.getElementById('colorFactureHex').textContent = document.getElementById('colorFacture').value;
    document.getElementById('colorDevisHex').textContent   = document.getElementById('colorDevis').value;
    document.getElementById('colorBonHex').textContent     = document.getElementById('colorBon').value;
    const font   = document.getElementById('docFontFamily').value;
    const size   = document.getElementById('docFontSize').value;
    const fColor = document.getElementById('colorFacture').value;
    const dColor = document.getElementById('colorDevis').value;
    const bColor = document.getElementById('colorBon').value;
    document.getElementById('themePreview').innerHTML = `
        <div style="font-family:${font};font-size:${size}">
            <div style="background:${fColor};color:white;padding:10px 20px;border-radius:8px;display:inline-block;margin:5px;font-weight:bold">${document.getElementById('titleFacture').value}</div>
            <div style="background:${dColor};color:white;padding:10px 20px;border-radius:8px;display:inline-block;margin:5px;font-weight:bold">${document.getElementById('titleDevis').value}</div>
            <div style="background:${bColor};color:white;padding:10px 20px;border-radius:8px;display:inline-block;margin:5px;font-weight:bold">${document.getElementById('titleBon').value}</div>
            <p style="margin-top:15px;color:#374151">Exemple de texte avec la police sélectionnée</p>
        </div>`;
}

async function saveThemeSettings() {
    const themeData = {
        fontFamily: document.getElementById('docFontFamily').value,
        fontSize:   document.getElementById('docFontSize').value,
        titles: {
            facture: { text: document.getElementById('titleFacture').value, color: document.getElementById('colorFacture').value },
            devis:   { text: document.getElementById('titleDevis').value,   color: document.getElementById('colorDevis').value   },
            bon:     { text: document.getElementById('titleBon').value,     color: document.getElementById('colorBon').value     }
        }
    };
    try {
        await window.electronAPI.saveThemeSettings({ userId: currentUser.id, theme: themeData });
        currentTheme = themeData;
        showToast('Thème enregistré', 'success');
    } catch (err) {
        showToast('Erreur', 'error');
    }
}

function resetThemeDefaults() {
    document.getElementById('docFontFamily').value = "'Segoe UI', sans-serif";
    document.getElementById('docFontSize').value   = "14px";
    document.getElementById('titleFacture').value  = "FACTURE";
    document.getElementById('colorFacture').value  = "#1e3a8a";
    document.getElementById('titleDevis').value    = "DEVIS";
    document.getElementById('colorDevis').value    = "#92400e";
    document.getElementById('titleBon').value      = "BON DE COMMANDE";
    document.getElementById('colorBon').value      = "#065f46";
    updateThemePreview();
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
    return new Date(dateStr).toLocaleDateString('fr-FR');
}

function getDocTypeLabel(type) {
    return currentTheme.titles[type]?.text || type.toUpperCase();
}

function getDocTypeColor(type) {
    return currentTheme.titles[type]?.color || '#1e3a8a';
}