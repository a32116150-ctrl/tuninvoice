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
let allContracts = [];
let editingServiceId = null;
let editingDocId = null;
let editingContractId = null;
let confirmCallback = null;
let currentSettings = {};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Try remembered user first (localStorage), then sessionStorage
    const rememberedUser = localStorage.getItem('rememberedUser');
    const sessionUser   = sessionStorage.getItem('currentUser');

    const raw = rememberedUser || sessionUser;
    if (raw) {
        try {
            currentUser = JSON.parse(raw);
            showApp();
        } catch {
            localStorage.removeItem('rememberedUser');
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
            const rememberMe = document.getElementById('rememberMe')?.checked;
            if (rememberMe) {
                localStorage.setItem('rememberedUser', JSON.stringify(safeUser));
            } else {
                localStorage.removeItem('rememberedUser');
            }
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
    localStorage.removeItem('rememberedUser');
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
    const pages = ['dashboard','new-document','documents','clients','services','company','contracts','settings'];
    const idx = pages.indexOf(page);
    const navItems = document.querySelectorAll('.nav-item');
    if (idx !== -1 && navItems[idx]) navItems[idx].classList.add('active');
    if (page === 'dashboard')   loadDashboard();
    if (page === 'documents')   loadDocuments();
    if (page === 'clients')     loadClients();
    if (page === 'services')    loadServices();
    if (page === 'company')     loadCompanyPage();
    if (page === 'contracts')   loadContracts();
    if (page === 'settings')    { loadSettings(); loadSerialSettings(); loadThemeSettings(); }
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
        renderDashboardCharts(stats);
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

function renderDashboardCharts(stats) {
    renderRevenueChart(stats.monthlyRevenue || []);
    renderTypeDonutChart(stats.typeBreakdown || []);
}

function renderRevenueChart(monthlyData) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Build last 6 months labels even if data is missing
    const months = [];
    const values = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label = d.toLocaleDateString('fr-FR', { month:'short', year:'2-digit' });
        const found = monthlyData.find(m => m.month === key);
        months.push(label);
        values.push(found ? parseFloat(found.revenue) : 0);
    }

    const max = Math.max(...values, 1);
    const W = canvas.width, H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
        const val = max - (max / 4) * i;
        ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(val >= 1000 ? (val/1000).toFixed(1)+'k' : val.toFixed(0), pad.left - 6, y + 4);
    }

    // Bars
    const barW = chartW / months.length * 0.55;
    const gap  = chartW / months.length;
    values.forEach((v, i) => {
        const x = pad.left + gap * i + (gap - barW) / 2;
        const barH = (v / max) * chartH;
        const y = pad.top + chartH - barH;
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(1, '#1e40af');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW, barH, 4) : ctx.rect(x, y, barW, barH);
        ctx.fill();
        // Label
        ctx.fillStyle = '#374151'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(months[i], x + barW / 2, pad.top + chartH + 16);
        if (v > 0) {
            ctx.fillStyle = '#1e40af'; ctx.font = 'bold 10px sans-serif';
            ctx.fillText(v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0), x + barW / 2, y - 4);
        }
    });
}

function renderTypeDonutChart(breakdown) {
    const canvas = document.getElementById('typeDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const colors = { facture: '#3b82f6', devis: '#f59e0b', bon: '#10b981' };
    const labels = { facture: 'Factures', devis: 'Devis', bon: 'Bons' };
    const total = breakdown.reduce((s, b) => s + b.count, 0);
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2 - 10, r = Math.min(W, H) * 0.35;

    ctx.clearRect(0, 0, W, H);

    if (total === 0) {
        ctx.fillStyle = '#d1d5db';
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9ca3af'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Aucun document', cx, cy + 4);
        return;
    }

    let startAngle = -Math.PI / 2;
    breakdown.forEach(b => {
        const slice = (b.count / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = colors[b.type] || '#6b7280';
        ctx.fill();
        startAngle += slice;
    });

    // Hole
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Center text
    ctx.fillStyle = '#111'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif';
    ctx.fillText('documents', cx, cy + 18);

    // Legend
    let ly = cy + r + 20;
    breakdown.forEach(b => {
        const lx = cx - 60;
        ctx.fillStyle = colors[b.type] || '#6b7280';
        ctx.fillRect(lx, ly - 8, 12, 12);
        ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`${labels[b.type] || b.type}: ${b.count}`, lx + 16, ly + 2);
        ly += 18;
    });
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
        // Load images from company settings
        if (c.logo_image)      { logoImage = c.logo_image; }
        if (c.stamp_image)     { stampImage = c.stamp_image; }
        if (c.signature_image) { signatureImage = c.signature_image; }
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

// ==================== IMAGES (doc form - read-only, loaded from company) ====================
// Images in the document form are loaded from company settings.
// Users no longer upload images per-document; they're managed in Mon Entreprise.
// This function is kept for backward compat when editing existing documents with embedded images.
function handleImageUpload(input, type) {
    if (!input.files?.[0]) return;
    if (input.files[0].size > 5*1024*1024) { showToast('Image trop lourde (max 5 MB)','warning'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target.result;
        if (type==='logo') logoImage=data; else if (type==='stamp') stampImage=data; else if (type==='signature') signatureImage=data;
    };
    reader.readAsDataURL(input.files[0]);
}

function removeImage(type) {
    if (type==='logo') logoImage=null; else if (type==='stamp') stampImage=null; else if (type==='signature') signatureImage=null;
}

// ==================== COMPANY IMAGE UPLOADS (Mon Entreprise page) ====================
function handleCompanyImageUpload(input, type) {
    if (!input.files?.[0]) return;
    if (input.files[0].size > 5*1024*1024) { showToast('Image trop lourde (max 5 MB)','warning'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = e.target.result;
        const previewId = `company${type.charAt(0).toUpperCase()+type.slice(1)}Preview`;
        const placeholderId = `company${type.charAt(0).toUpperCase()+type.slice(1)}Placeholder`;
        const boxId = `company${type.charAt(0).toUpperCase()+type.slice(1)}Box`;

        const previewEl = document.getElementById(previewId);
        const placeholderEl = document.getElementById(placeholderId);
        const boxEl = document.getElementById(boxId);

        if (previewEl) { previewEl.src = data; previewEl.classList.remove('hidden'); }
        if (placeholderEl) placeholderEl.classList.add('hidden');
        if (boxEl) boxEl.classList.add('has-image');

        // Save image to company in DB immediately
        try {
            const payload = { userId: currentUser.id };
            if (type === 'logo')      { payload.logoImage = data; logoImage = data; }
            if (type === 'stamp')     { payload.stampImage = data; stampImage = data; }
            if (type === 'signature') { payload.signatureImage = data; signatureImage = data; }
            await window.electronAPI.saveCompanyImages(payload);
            showToast(`${type.charAt(0).toUpperCase()+type.slice(1)} enregistré`, 'success');
        } catch { showToast('Erreur de sauvegarde image', 'error'); }
    };
    reader.readAsDataURL(input.files[0]);
}

async function removeCompanyImage(type) {
    const previewId = `company${type.charAt(0).toUpperCase()+type.slice(1)}Preview`;
    const placeholderId = `company${type.charAt(0).toUpperCase()+type.slice(1)}Placeholder`;
    const boxId = `company${type.charAt(0).toUpperCase()+type.slice(1)}Box`;
    const inputId = `company${type.charAt(0).toUpperCase()+type.slice(1)}Input`;

    const previewEl = document.getElementById(previewId);
    const placeholderEl = document.getElementById(placeholderId);
    const boxEl = document.getElementById(boxId);
    const inputEl = document.getElementById(inputId);

    if (previewEl) { previewEl.src = ''; previewEl.classList.add('hidden'); }
    if (placeholderEl) placeholderEl.classList.remove('hidden');
    if (boxEl) boxEl.classList.remove('has-image');
    if (inputEl) inputEl.value = '';

    if (type === 'logo') logoImage = null;
    if (type === 'stamp') stampImage = null;
    if (type === 'signature') signatureImage = null;

    try {
        await window.electronAPI.removeCompanyImage({ userId: currentUser.id, imageType: type });
        showToast(`${type.charAt(0).toUpperCase()+type.slice(1)} supprimé`, 'info');
    } catch { showToast('Erreur suppression image', 'error'); }
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
        name,
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
        document.getElementById('prefixDevis').value   = currentSettings.prefix_devis   || 'DEV';
        document.getElementById('prefixBon').value     = currentSettings.prefix_bon     || 'BC';
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
        prefix_devis:   document.getElementById('prefixDevis').value.toUpperCase(),
        prefix_bon:     document.getElementById('prefixBon').value.toUpperCase()
    };
    try {
        await window.electronAPI.updateSettings({ userId: currentUser.id, settings });
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
    const logoHTML = logoImage ? `<img src="${logoImage}" style="max-width:140px;max-height:80px;object-fit:contain;margin-bottom:12px;display:block">` : '';

    document.getElementById('previewContent').innerHTML = buildInvoicePreviewHTML({
        color, typeLabel, companyName, companyMF, companyAddress, companyPhone, companyEmail, companyRC,
        clientName, clientMF, clientAddress, clientPhone, clientEmail,
        docNumber, docDate, docDueDate, currency, paymentMode, notes,
        logoHTML, items, totalHT, tva19, tva13, tva7, totalTTC, timbreAmount,
        stampImage, signatureImage
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
            generatePreviewHTML();
            const html = buildFullHTML();
            const filename = `${result.document.number}.pdf`;
            hideLoading();
            const pdfResult = await window.electronAPI.savePDF({ html, filename });
            if (pdfResult.success) showToast('PDF enregistré avec succès', 'success');
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
        if (!result.success && result.error) showToast('Erreur impression: ' + result.error, 'error');
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
        if (result.success) showToast('✅ PDF enregistré: ' + result.path, 'success');
    } catch (err) {
        showToast('Erreur PDF: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

function collectDocumentData() {
    const get = id => document.getElementById(id)?.value || '';
    const items = [];
    for (let i=1;i<=itemCount;i++) {
        const desc=document.getElementById(`desc${i}`)?.value.trim();
        if (!desc) continue;
        const qty=parseFloat(document.getElementById(`qty${i}`)?.value)||0;
        const price=parseFloat(document.getElementById(`price${i}`)?.value)||0;
        const tva=parseFloat(document.getElementById(`tva${i}`)?.value)||0;
        const line=qty*price;
        items.push({ description:desc, quantity:qty, price, tva, total:line });
    }
    let totalHT=0, tva19=0, tva13=0, tva7=0;
    items.forEach(item => {
        totalHT+=item.total;
        if (item.tva===19) tva19+=item.total*0.19;
        else if (item.tva===13) tva13+=item.total*0.13;
        else if (item.tva===7) tva7+=item.total*0.07;
    });
    const totalTTC = totalHT+tva19+tva13+tva7+timbreAmount;
    return {
        id: editingDocId || undefined,
        userId: currentUser.id,
        type: currentDocType,
        number: get('docNumber'),
        date: get('docDate'),
        dueDate: get('docDueDate') || null,
        currency: get('docCurrency') || 'TND',
        paymentMode: get('docPayment'),
        companyName: get('docCompanyName'),
        companyMF: get('docCompanyMF'),
        companyAddress: get('docCompanyAddress'),
        companyPhone: get('docCompanyPhone'),
        companyEmail: get('docCompanyEmail'),
        companyRC: get('docCompanyRC'),
        clientName: get('docClientName'),
        clientMF: get('docClientMF'),
        clientAddress: get('docClientAddress'),
        clientPhone: get('docClientPhone'),
        clientEmail: get('docClientEmail'),
        items,
        applyTimbre: document.getElementById('applyTimbre').checked,
        timbreAmount,
        totalHT,
        totalTTC,
        logoImage,
        stampImage,
        signatureImage,
        notes: get('docNotes')
    };
}

function resetDocumentForm() {
    document.getElementById('docClientName').value = '';
    document.getElementById('docClientMF').value = '';
    document.getElementById('docClientAddress').value = '';
    document.getElementById('docClientPhone').value = '';
    document.getElementById('docClientEmail').value = '';
    document.getElementById('docNotes').value = '';
    document.getElementById('applyTimbre').checked = false;
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0;
    editingDocId = null;
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
    document.getElementById('docCompanyName').value    = doc.companyName    || '';
    document.getElementById('docCompanyMF').value      = doc.companyMF      || '';
    document.getElementById('docCompanyAddress').value = doc.companyAddress  || '';
    document.getElementById('docCompanyPhone').value   = doc.companyPhone    || '';
    document.getElementById('docCompanyEmail').value   = doc.companyEmail    || '';
    document.getElementById('docCompanyRC').value      = doc.companyRC       || '';
    document.getElementById('docClientName').value    = doc.clientName    || '';
    document.getElementById('docClientMF').value      = doc.clientMF      || '';
    document.getElementById('docClientAddress').value = doc.clientAddress  || '';
    document.getElementById('docClientPhone').value   = doc.clientPhone    || '';
    document.getElementById('docClientEmail').value   = doc.clientEmail    || '';
    document.getElementById('docNumber').value   = doc.number   || '';
    document.getElementById('docDate').value     = doc.date     || '';
    document.getElementById('docDueDate').value  = doc.dueDate  || '';
    document.getElementById('docCurrency').value = doc.currency || 'TND';
    document.getElementById('docPayment').value  = doc.paymentMode || 'Virement bancaire';
    document.getElementById('docNotes').value    = doc.notes    || '';
    document.getElementById('applyTimbre').checked = doc.applyTimbre || false;
    // Use document-embedded images if present, otherwise fall back to company images
    logoImage      = doc.logoImage      || logoImage      || null;
    stampImage     = doc.stampImage     || stampImage     || null;
    signatureImage = doc.signatureImage || signatureImage || null;
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
                        <option value="19" ${item.tva===19?'selected':''}>19%</option>
                        <option value="13" ${item.tva===13?'selected':''}>13%</option>
                        <option value="7"  ${item.tva===7 ?'selected':''}>7%</option>
                        <option value="0"  ${item.tva===0 ?'selected':''}>0%</option>
                    </select>
                </td>
                <td style="text-align:right;font-weight:500" id="total${itemCount}">${(item.quantity*item.price).toFixed(3)}</td>
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

// ==================== COMPANY SETTINGS ====================
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

        // Load company images
        const loadImg = (imgData, previewId, placeholderId, boxId) => {
            const previewEl = document.getElementById(previewId);
            const placeholderEl = document.getElementById(placeholderId);
            const boxEl = document.getElementById(boxId);
            if (imgData && previewEl) {
                previewEl.src = imgData;
                previewEl.classList.remove('hidden');
                if (placeholderEl) placeholderEl.classList.add('hidden');
                if (boxEl) boxEl.classList.add('has-image');
            } else if (previewEl) {
                previewEl.src = '';
                previewEl.classList.add('hidden');
                if (placeholderEl) placeholderEl.classList.remove('hidden');
                if (boxEl) boxEl.classList.remove('has-image');
            }
        };

        loadImg(c.logo_image,      'companyLogoPreview',      'companyLogoPlaceholder',      'companyLogoBox');
        loadImg(c.stamp_image,     'companyStampPreview',     'companyStampPlaceholder',     'companyStampBox');
        loadImg(c.signature_image, 'companySignaturePreview', 'companySignaturePlaceholder', 'companySignatureBox');

        // Sync to globals
        if (c.logo_image)      logoImage = c.logo_image;
        if (c.stamp_image)     stampImage = c.stamp_image;
        if (c.signature_image) signatureImage = c.signature_image;

    } catch (err) {
        console.error('Error loading company:', err);
    }
}

async function saveCompanySettings() {
    const settings = {
        userId:  currentUser.id,
        name:    document.getElementById('companyName').value.trim(),
        mf:      document.getElementById('companyMF').value.trim(),
        address: document.getElementById('companyAddress').value.trim(),
        phone:   document.getElementById('companyPhone').value.trim(),
        email:   document.getElementById('companyEmail').value.trim(),
        rc:      document.getElementById('companyRC').value.trim(),
        website: document.getElementById('companyWebsite').value.trim(),
        bank:    document.getElementById('companyBank').value.trim(),
        // Pass current images so they are not overwritten with null
        logoImage,
        stampImage,
        signatureImage
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
        document.getElementById('backupEnabled').checked   = settings.enabled    || false;
        document.getElementById('backupFrequency').value   = settings.frequency  || 'daily';
        document.getElementById('backupTime').value        = settings.time       || '02:00';
        document.getElementById('backupKeep').value        = settings.keepCount  || 10;
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
    document.getElementById('docFontFamily').value        = currentTheme.fontFamily;
    document.getElementById('docFontSize').value          = currentTheme.fontSize;
    document.getElementById('titleFacture').value         = currentTheme.titles.facture.text;
    document.getElementById('colorFacture').value         = currentTheme.titles.facture.color;
    document.getElementById('colorFactureHex').textContent= currentTheme.titles.facture.color;
    document.getElementById('titleDevis').value           = currentTheme.titles.devis.text;
    document.getElementById('colorDevis').value           = currentTheme.titles.devis.color;
    document.getElementById('colorDevisHex').textContent  = currentTheme.titles.devis.color;
    document.getElementById('titleBon').value             = currentTheme.titles.bon.text;
    document.getElementById('colorBon').value             = currentTheme.titles.bon.color;
    document.getElementById('colorBonHex').textContent    = currentTheme.titles.bon.color;
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

// ==================== CONTRACTS ====================
const CONTRACT_TYPES = {
    cdi:        { label: 'CDI',                  icon: '📋', desc: 'Contrat à Durée Indéterminée' },
    cdd:        { label: 'CDD',                  icon: '📄', desc: 'Contrat à Durée Déterminée' },
    essai:      { label: "Période d'Essai",      icon: '🔍', desc: "Contrat avec période d'essai" },
    prestation: { label: 'Prestation de service',icon: '🤝', desc: 'Contrat de prestation de services' },
    alternance: { label: 'Alternance',           icon: '🎓', desc: "Contrat d'alternance" },
    stage:      { label: 'Stage',                icon: '🏫', desc: 'Convention de stage' },
    freelance:  { label: 'Freelance',            icon: '💻', desc: 'Contrat de travail indépendant' },
    interim:    { label: 'Intérim',              icon: '⏱️', desc: 'Contrat de mission intérimaire' },
    parttime:   { label: 'Temps partiel',        icon: '⏰', desc: 'Contrat à temps partiel' },
    consulting: { label: 'Consulting',           icon: '📊', desc: 'Contrat de conseil et consulting' },
};

async function loadContracts() {
    if (!currentUser) return;
    try {
        allContracts = await window.electronAPI.getContracts(currentUser.id);
        renderContractsTable(allContracts);
    } catch (err) {
        showToast('Erreur chargement contrats', 'error');
    }
}

function renderContractsTable(contracts) {
    const container = document.getElementById('contractsTable');
    if (!contracts || !contracts.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📃</div><h3>Aucun contrat</h3><p>Créez votre premier contrat en choisissant un type ci-dessus</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>Numéro</th><th>Salarié / Prestataire</th><th>Employeur</th><th>Date début</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
        ${contracts.map(c => `<tr>
            <td><span class="badge badge-contract">${CONTRACT_TYPES[c.type]?.label || c.type}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${c.number}</td>
            <td style="font-weight:600">${escapeHtml(c.employeeName) || '—'}</td>
            <td>${escapeHtml(c.employerName) || '—'}</td>
            <td>${formatDate(c.startDate)}</td>
            <td><span class="badge badge-${c.status === 'signé' ? 'active' : 'pending'}">${c.status || 'brouillon'}</span></td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="previewContract('${c.id}')"   title="Aperçu">👁️</button>
                <button class="btn-icon btn-edit"   onclick="editContract('${c.id}')"      title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadContractPDF('${c.id}')" title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteContract('${c.id}')" title="Supprimer">🗑️</button>
            </td>
        </tr>`).join('')}
    </tbody></table>`;
}

function openNewContractModal(type) {
    editingContractId = null;
    document.getElementById('contractType').value = type;
    document.getElementById('contractModalTitle').textContent = `${CONTRACT_TYPES[type]?.icon || '📄'} ${CONTRACT_TYPES[type]?.label || type}`;

    // Pre-fill employer from company settings
    window.electronAPI.getCompany(currentUser.id).then(c => {
        if (c) {
            document.getElementById('cEmployerName').value    = c.name    || '';
            document.getElementById('cEmployerMF').value      = c.mf      || '';
            document.getElementById('cEmployerAddress').value = c.address  || '';
        }
    }).catch(() => {});

    // Show/hide fields based on type
    const showEndDate = ['cdd','essai','prestation','freelance','stage','consulting','alternance','interim'].includes(type);
    const showTrialPeriod = ['cdi','parttime'].includes(type);
    document.getElementById('cEndDateGroup').style.display    = showEndDate ? 'block' : 'none';
    document.getElementById('cTrialGroup').style.display      = showTrialPeriod ? 'block' : 'none';

    // Clear form
    ['cEmployeeeName','cEmployeeCIN','cEmployeeAddress','cEmployeeRole','cEmployeeDept',
     'cEmployerRep','cEmployerRepRole','cStartDate','cEndDate','cSalary','cWorkLocation',
     'cNoticePeriod','cTrialDuration','cExtraClauses','cNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('cSalaryType').value = 'mensuel';
    document.getElementById('cWorkHours').value  = '40';
    document.getElementById('cTrialPeriod').checked = false;

    document.getElementById('contractModal').classList.add('active');
}

function closeContractModal() {
    document.getElementById('contractModal').classList.remove('active');
    editingContractId = null;
}

async function saveContract() {
    const employeeName = document.getElementById('cEmployeeeName').value.trim();
    const employerName = document.getElementById('cEmployerName').value.trim();
    if (!employeeName || !employerName) { showToast('Employeur et Salarié sont requis', 'warning'); return; }

    const data = {
        id:              editingContractId || undefined,
        userId:          currentUser.id,
        type:            document.getElementById('contractType').value,
        employerName,
        employerMF:      document.getElementById('cEmployerMF').value.trim(),
        employerAddress: document.getElementById('cEmployerAddress').value.trim(),
        employerRep:     document.getElementById('cEmployerRep').value.trim(),
        employerRepRole: document.getElementById('cEmployerRepRole').value.trim(),
        employeeName,
        employeeCIN:     document.getElementById('cEmployeeCIN').value.trim(),
        employeeAddress: document.getElementById('cEmployeeAddress').value.trim(),
        employeeRole:    document.getElementById('cEmployeeRole').value.trim(),
        employeeDepartment: document.getElementById('cEmployeeDept').value.trim(),
        startDate:       document.getElementById('cStartDate').value,
        endDate:         document.getElementById('cEndDate').value || null,
        salary:          parseFloat(document.getElementById('cSalary').value) || null,
        salaryType:      document.getElementById('cSalaryType').value,
        workHours:       parseFloat(document.getElementById('cWorkHours').value) || 40,
        workLocation:    document.getElementById('cWorkLocation').value.trim(),
        trialPeriod:     document.getElementById('cTrialPeriod').checked,
        trialDuration:   document.getElementById('cTrialDuration').value.trim(),
        noticePeriod:    document.getElementById('cNoticePeriod').value.trim(),
        extraClauses:    document.getElementById('cExtraClauses').value.trim(),
        notes:           document.getElementById('cNotes').value.trim(),
        status:          'brouillon',
        // Attach company logo for contract header
        employerLogo:    logoImage || null,
    };

    try {
        const result = await window.electronAPI.saveContract(data);
        if (result.success) {
            showToast(editingContractId ? 'Contrat mis à jour' : 'Contrat créé', 'success');
            closeContractModal();
            await loadContracts();
        } else {
            showToast(result.error || 'Erreur lors de la sauvegarde', 'error');
        }
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    }
}

async function editContract(id) {
    const c = allContracts.find(x => x.id === id);
    if (!c) return;
    editingContractId = id;

    document.getElementById('contractType').value = c.type;
    document.getElementById('contractModalTitle').textContent = `✏️ Modifier — ${CONTRACT_TYPES[c.type]?.label || c.type}`;

    const showEndDate = ['cdd','essai','prestation','freelance','stage','consulting','alternance','interim'].includes(c.type);
    const showTrialPeriod = ['cdi','parttime'].includes(c.type);
    document.getElementById('cEndDateGroup').style.display    = showEndDate ? 'block' : 'none';
    document.getElementById('cTrialGroup').style.display      = showTrialPeriod ? 'block' : 'none';

    document.getElementById('cEmployerName').value    = c.employerName    || '';
    document.getElementById('cEmployerMF').value      = c.employerMF      || '';
    document.getElementById('cEmployerAddress').value = c.employerAddress  || '';
    document.getElementById('cEmployerRep').value     = c.employerRep      || '';
    document.getElementById('cEmployerRepRole').value = c.employerRepRole  || '';
    document.getElementById('cEmployeeeName').value   = c.employeeName    || '';
    document.getElementById('cEmployeeCIN').value     = c.employeeCIN     || '';
    document.getElementById('cEmployeeAddress').value = c.employeeAddress  || '';
    document.getElementById('cEmployeeRole').value    = c.employeeRole    || '';
    document.getElementById('cEmployeeDept').value    = c.employeeDepartment || '';
    document.getElementById('cStartDate').value       = c.startDate       || '';
    document.getElementById('cEndDate').value         = c.endDate         || '';
    document.getElementById('cSalary').value          = c.salary          || '';
    document.getElementById('cSalaryType').value      = c.salaryType      || 'mensuel';
    document.getElementById('cWorkHours').value       = c.workHours       || 40;
    document.getElementById('cWorkLocation').value    = c.workLocation    || '';
    document.getElementById('cTrialPeriod').checked   = c.trialPeriod     || false;
    document.getElementById('cTrialDuration').value   = c.trialDuration   || '';
    document.getElementById('cNoticePeriod').value    = c.noticePeriod    || '';
    document.getElementById('cExtraClauses').value    = c.extraClauses    || '';
    document.getElementById('cNotes').value           = c.notes           || '';

    document.getElementById('contractModal').classList.add('active');
}

function buildContractHTMLFromData(c) {
    // Dynamically import contract builder (it's an ES module export)
    // Since this app uses plain script tags, we call a globally registered function
    if (typeof window.buildContractHTML === 'function') {
        return window.buildContractHTML({ ...c, employerLogo: logoImage });
    }
    return `<p>Contrat: ${c.number}</p>`;
}

async function previewContract(id) {
    const c = allContracts.find(x => x.id === id);
    if (!c) return;
    const html = buildContractHTMLFromData(c);
    document.getElementById('previewContent').innerHTML = `<div style="padding:40px;font-family:serif">${html.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i,'').replace(/<\/body>[\s\S]*?<\/html>/i,'')}</div>`;
    document.getElementById('previewModal').classList.add('active');
    // Store current contract id for download/print
    window._previewingContractId = id;
}

async function downloadContractPDF(id) {
    const c = allContracts.find(x => x.id === id);
    if (!c) return;
    const html = buildContractHTMLFromData(c);
    const filename = `${c.number}-${(c.employeeName || 'contrat').replace(/\s+/g,'-')}.pdf`;
    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename });
        if (result.success) showToast('✅ Contrat PDF enregistré', 'success');
        else if (!result.canceled) showToast('Erreur PDF', 'error');
    } catch (err) {
        showToast('Erreur PDF: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

async function printContract(id) {
    const c = allContracts.find(x => x.id === id);
    if (!c) return;
    const html = buildContractHTMLFromData(c);
    showLoading("Ouverture de l'impression...");
    try {
        await window.electronAPI.printPDF({ html });
    } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

function confirmDeleteContract(id) {
    const c = allContracts.find(x => x.id === id);
    showConfirm('🗑️ Supprimer', `Supprimer le contrat ${c?.number} ?`, async () => {
        try {
            await window.electronAPI.deleteContract(id);
            showToast('Contrat supprimé', 'info');
            await loadContracts();
        } catch (err) {
            showToast('Erreur suppression', 'error');
        }
    });
}

function filterContracts() {
    const q = document.getElementById('searchContracts').value.toLowerCase();
    const type = document.getElementById('filterContractType').value;
    const filtered = allContracts.filter(c => {
        const matchQ = !q || (c.employeeName||'').toLowerCase().includes(q) || (c.number||'').toLowerCase().includes(q);
        const matchT = !type || c.type === type;
        return matchQ && matchT;
    });
    renderContractsTable(filtered);
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