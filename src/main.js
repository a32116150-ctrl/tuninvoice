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
let confirmCallback = null;

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
    const pages = ['dashboard','new-document','documents','clients','company','settings'];
    const idx = pages.indexOf(page);
    const navItems = document.querySelectorAll('.nav-item');
    if (idx !== -1 && navItems[idx]) navItems[idx].classList.add('active');
    if (page === 'dashboard')  loadDashboard();
    if (page === 'documents')  loadDocuments();
    if (page === 'clients')    loadClients();
    if (page === 'company')    loadCompanyPage();
    if (page === 'settings')   loadSettings();
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
    if (!document.getElementById('itemsBody').children.length) addItem();
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
    const prefix = { facture:'FAC', devis:'DEV', bon:'BC' }[currentDocType];
    const year = new Date().getFullYear();
    const seq = (document.getElementById('docNumber').value.split('-')[2]) || '001';
    document.getElementById('docNumber').value = `${prefix}-${year}-${seq}`;
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
            <th style="padding:11px 12px;text-align:left;font-size:0.78rem">DESCRIPTION</th>
            <th style="padding:11px 12px;text-align:center;font-size:0.78rem;width:60px">QTÉ</th>
            <th style="padding:11px 12px;text-align:right;font-size:0.78rem;width:110px">P.U. HT</th>
            <th style="padding:11px 12px;text-align:center;font-size:0.78rem;width:70px">TVA</th>
            <th style="padding:11px 12px;text-align:right;font-size:0.78rem;width:110px">TOTAL HT</th>
        </tr></thead>
        <tbody>${d.itemsHTML}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
        <div style="width:300px;border:1.5px solid #e5e7eb;border-radius:8px;overflow:hidden">
            ${buildTotalRow('Total HT',d.totalHT,d.currency)}
            ${d.tva19>0?buildTotalRow('TVA 19%',d.tva19,d.currency):''}
            ${d.tva13>0?buildTotalRow('TVA 13%',d.tva13,d.currency):''}
            ${d.tva7>0?buildTotalRow('TVA 7%',d.tva7,d.currency):''}
            ${d.timbreAmount>0?buildTotalRow('Timbre Fiscal',d.timbreAmount,d.currency):''}
            <div style="display:flex;justify-content:space-between;padding:13px 16px;background:${d.color};color:white;font-weight:700;font-size:1rem"><span>TOTAL TTC</span><span>${d.totalTTC.toFixed(3)} ${d.currency}</span></div>
        </div>
    </div>
    <div style="background:#fffbeb;border:1px solid #fcd34d;padding:12px 16px;border-radius:8px;font-size:0.82rem;color:#78350f;margin-bottom:28px">
        <strong>Arrêté à la somme de :</strong> ${numberToWords(d.totalTTC)} ${d.currency}
    </div>
    ${d.notes?`<div style="background:#f9fafb;border:1px solid #e5e7eb;padding:14px 18px;border-radius:8px;font-size:0.82rem;color:#4b5563;margin-bottom:28px"><strong style="color:#1f2937;display:block;margin-bottom:6px">Notes & Conditions :</strong>${escapeHtml(d.notes).replace(/\n/g,'<br>')}</div>`:''}
    <div style="display:flex;gap:30px;margin-top:40px">
        <div style="flex:1;text-align:center">
            ${d.stampImage?`<img src="${d.stampImage}" style="max-width:120px;max-height:90px;display:inline-block;margin-bottom:8px">`:'<div style="height:80px"></div>'}
            ${d.signatureImage?`<img src="${d.signatureImage}" style="max-width:120px;max-height:70px;display:inline-block;margin-bottom:8px">`:''}
            <div style="border-top:2px solid #1f2937;padding-top:8px;font-weight:600;font-size:0.82rem">Cachet et Signature</div>
        </div>
        <div style="flex:1;text-align:center">
            <div style="height:80px"></div>
            <div style="border-top:2px solid #1f2937;padding-top:8px;font-weight:600;font-size:0.82rem">Signature Client</div>
        </div>
    </div>
    <div style="margin-top:36px;padding:12px 16px;background:#f3f4f6;border-radius:6px;text-align:center;font-size:0.75rem;color:#6b7280">
        Document établi conformément à la législation fiscale tunisienne — TVA: 19% / 13% / 7% / 0% — DGI Tunisie
    </div></div>`;
}

function buildTotalRow(label, value, currency) {
    return `<div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:0.875rem"><span style="color:#4b5563">${label}</span><span style="font-weight:500">${value.toFixed(3)} ${currency}</span></div>`;
}

function numberToWords(num) {
    const d=Math.floor(num), m=Math.round((num-d)*1000);
    return `${d} dinar${d>1?'s':''} ${m>0?`et ${m} millime${m>1?'s':''}`:''}`;
}

function buildPDFDocument(bodyHTML) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:210mm;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#1f2937;background:white;}.pdf-page{width:210mm;min-height:297mm;padding:18mm 16mm;background:white;}table{border-collapse:collapse;width:100%;page-break-inside:auto;}tr{page-break-inside:avoid;}thead{display:table-header-group;}.no-break{page-break-inside:avoid;}img{max-width:100%;}@page{size:A4;margin:0;}</style></head><body><div class="pdf-page">${bodyHTML}</div></body></html>`;
}

async function saveAndDownloadPDF() {
    if (!validateDocumentForm()) return;
    const items=[];
    for (let i=1;i<=itemCount;i++) {
        const desc=document.getElementById(`desc${i}`)?.value.trim();
        if (desc) items.push({description:desc,quantity:parseFloat(document.getElementById(`qty${i}`).value)||0,price:parseFloat(document.getElementById(`price${i}`).value)||0,tva:parseFloat(document.getElementById(`tva${i}`).value)||0,total:parseFloat(document.getElementById(`total${i}`).textContent)||0});
    }
    const docData={
        userId:currentUser.id,type:currentDocType,number:document.getElementById('docNumber').value,
        date:document.getElementById('docDate').value,dueDate:document.getElementById('docDueDate').value,
        currency:document.getElementById('docCurrency').value,paymentMode:document.getElementById('docPayment').value,
        companyName:document.getElementById('docCompanyName').value,companyMF:document.getElementById('docCompanyMF').value,
        companyAddress:document.getElementById('docCompanyAddress').value,companyPhone:document.getElementById('docCompanyPhone').value,
        companyEmail:document.getElementById('docCompanyEmail').value,companyRC:document.getElementById('docCompanyRC').value,
        clientName:document.getElementById('docClientName').value,clientMF:document.getElementById('docClientMF').value,
        clientAddress:document.getElementById('docClientAddress').value,clientPhone:document.getElementById('docClientPhone').value,
        clientEmail:document.getElementById('docClientEmail').value,
        items,applyTimbre:document.getElementById('applyTimbre').checked,timbreAmount,
        notes:document.getElementById('docNotes').value,
        totalHT:parseFloat(document.getElementById('totalHT').textContent)||0,
        totalTTC:parseFloat(document.getElementById('totalTTC').textContent)||0,
        logoImage,stampImage,signatureImage
    };
    const btn=document.getElementById('saveBtn');
    btn.disabled=true; btn.textContent='⏳ Génération...';
    showLoading('Enregistrement et génération du PDF...');
    try {
        const result=await window.electronAPI.saveDocument(docData);
        if (result.success) {
            generatePreviewHTML();
            const html=buildPDFDocument(document.getElementById('previewContent').innerHTML);
            await window.electronAPI.exportPDF({html,filename:`${currentDocType.toUpperCase()}-${result.document.number}.pdf`});
            await window.electronAPI.saveCompany({userId:currentUser.id,name:docData.companyName,mf:docData.companyMF,address:docData.companyAddress,phone:docData.companyPhone,email:docData.companyEmail,rc:docData.companyRC});
            showToast('Document enregistré et PDF généré !','success',5000);
            resetDocumentForm(); loadDashboard();
        } else { showToast('Erreur: '+(result.error||'Impossible d\'enregistrer'),'error'); }
    } catch { showToast('Erreur lors de la génération du PDF','error'); }
    finally { hideLoading(); btn.disabled=false; btn.innerHTML='💾 Enregistrer & Exporter PDF'; }
}

async function downloadPDF() {
    const html=buildPDFDocument(document.getElementById('previewContent').innerHTML);
    const docNumber=document.getElementById('docNumber').value;
    showLoading('Génération du PDF...');
    try { await window.electronAPI.exportPDF({html,filename:`${currentDocType.toUpperCase()}-${docNumber}.pdf`}); showToast('PDF téléchargé','success'); }
    catch { showToast('Erreur PDF','error'); }
    finally { hideLoading(); }
}

async function downloadDocPDF(docId) {
    const doc=await window.electronAPI.getDocument(docId);
    if (!doc) return;
    showLoading('Génération du PDF...');
    try {
        const html=buildPDFDocument(buildDocHTML(doc));
        await window.electronAPI.exportPDF({html,filename:`${doc.type.toUpperCase()}-${doc.number}.pdf`});
        showToast('PDF téléchargé','success');
    } catch { showToast('Erreur PDF','error'); }
    finally { hideLoading(); }
}

function printDocument() { window.print(); }

function resetDocumentForm() {
    ['docClientName','docClientMF','docClientAddress','docClientPhone','docClientEmail','docNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('applyTimbre').checked=false;
    document.getElementById('itemsBody').innerHTML='';
    itemCount=0; addItem();
    removeImage('logo'); removeImage('stamp'); removeImage('signature');
    calculateTotals();
    window.electronAPI.getNextDocNumber({userId:currentUser.id,type:currentDocType,year:new Date().getFullYear()}).then(n=>{document.getElementById('docNumber').value=n;}).catch(()=>{});
}

// ==================== DOCUMENTS LIST ====================
async function loadDocuments() {
    try { allDocuments=await window.electronAPI.getDocuments(currentUser.id); renderDocumentsTable(allDocuments); }
    catch { showToast('Erreur chargement documents','error'); }
}

function renderDocumentsTable(docs) {
    const container=document.getElementById('allDocsTable');
    if (!docs.length) { container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">📄</div><h3>Aucun document</h3><p>Commencez par créer votre premier document</p></div>`; return; }
    container.innerHTML=`<table><thead><tr><th>Type</th><th>N°</th><th>Client</th><th>Date</th><th>Échéance</th><th>Total TTC</th><th>Actions</th></tr></thead><tbody>
        ${docs.map(doc=>`<tr>
            <td><span class="badge badge-${doc.type}">${doc.type.toUpperCase()}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${doc.number}</td>
            <td>${escapeHtml(doc.clientName)}</td>
            <td>${formatDate(doc.date)}</td>
            <td>${doc.dueDate?formatDate(doc.dueDate):'—'}</td>
            <td style="font-weight:600">${doc.totalTTC.toFixed(3)} ${doc.currency}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="viewDocument('${doc.id}')"     title="Aperçu">👁️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadDocPDF('${doc.id}')"   title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDoc('${doc.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function filterDocuments() {
    const search=document.getElementById('searchDocs').value.toLowerCase();
    const type=document.getElementById('filterType').value;
    renderDocumentsTable(allDocuments.filter(d=>(!search||d.number.toLowerCase().includes(search)||d.clientName.toLowerCase().includes(search))&&(!type||d.type===type)));
}

function confirmDeleteDoc(docId) {
    showConfirm('🗑️ Supprimer','Supprimer ce document ? Action irréversible.',async()=>{
        try { await window.electronAPI.deleteDocument(docId); showToast('Document supprimé','info'); loadDocuments(); loadDashboard(); }
        catch { showToast('Erreur suppression','error'); }
    });
}

async function viewDocument(docId) {
    try {
        const doc=await window.electronAPI.getDocument(docId);
        if (!doc) return;
        document.getElementById('previewContent').innerHTML=buildDocHTML(doc);
        document.getElementById('previewModal').classList.add('active');
    } catch { showToast('Erreur chargement document','error'); }
}

function buildDocHTML(doc) {
    let tva19=0,tva13=0,tva7=0;
    const itemsHTML=doc.items.map((item,idx)=>{
        const tva=item.tva||0, line=item.total||(item.quantity*item.price);
        if (tva===19) tva19+=line*(tva/100); else if (tva===13) tva13+=line*(tva/100); else if (tva===7) tva7+=line*(tva/100);
        return `<tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:0.82rem">${idx+1}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${escapeHtml(item.description)}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${item.price.toFixed(3)}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${item.tva}%</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${line.toFixed(3)}</td></tr>`;
    }).join('');
    const timbre=doc.timbreAmount||0, currency=doc.currency||'TND';
    const logoHTML=doc.logoImage?`<img src="${doc.logoImage}" style="max-width:140px;max-height:80px;object-fit:contain;margin-bottom:12px;display:block">`:'';
    return buildInvoiceHTML({color:{facture:'#1e3a8a',devis:'#92400e',bon:'#065f46'}[doc.type]||'#1e3a8a',docType:doc.type,typeLabels:{facture:'FACTURE',devis:'DEVIS',bon:'BON DE COMMANDE'},logoHTML,companyName:doc.companyName,companyMF:doc.companyMF,companyAddress:doc.companyAddress,companyPhone:doc.companyPhone,companyEmail:doc.companyEmail,companyRC:doc.companyRC,clientName:doc.clientName,clientMF:doc.clientMF,clientAddress:doc.clientAddress,clientPhone:doc.clientPhone,clientEmail:doc.clientEmail,docNumber:doc.number,docDate:doc.date,docDueDate:doc.dueDate,currency,paymentMode:doc.paymentMode,notes:doc.notes,itemsHTML,totalHT:doc.totalHT,tva19,tva13,tva7,totalTTC:doc.totalTTC,timbreAmount:timbre,stampImage:doc.stampImage,signatureImage:doc.signatureImage});
}

// ==================== CLIENTS PAGE ====================
async function loadClients() {
    try { allClients=await window.electronAPI.getClients(currentUser.id); renderClientsTable(allClients); }
    catch { showToast('Erreur chargement clients','error'); }
}

function renderClientsTable(clients) {
    const container=document.getElementById('clientsTable');
    if (!clients.length) { container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">👥</div><h3>Aucun client</h3><p>Ajoutez votre premier client</p></div>`; return; }
    container.innerHTML=`<table><thead><tr><th>Nom</th><th>Matricule Fiscal</th><th>Téléphone</th><th>Email</th><th>Adresse</th><th>Actions</th></tr></thead><tbody>
        ${clients.map(c=>`<tr>
            <td style="font-weight:600">${escapeHtml(c.name)}</td>
            <td style="font-family:monospace;font-size:0.82rem">${c.mf||'—'}</td>
            <td>${c.phone||'—'}</td><td>${c.email||'—'}</td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.address||'—'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-delete" onclick="confirmDeleteClient('${c.id}','${escapeHtml(c.name)}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function filterClients() {
    const q=document.getElementById('searchClients').value.toLowerCase();
    renderClientsTable(allClients.filter(c=>c.name.toLowerCase().includes(q)||(c.mf&&c.mf.toLowerCase().includes(q))||(c.email&&c.email.toLowerCase().includes(q))));
}

function confirmDeleteClient(id,name) {
    showConfirm('🗑️ Supprimer le client',`Supprimer "${name}" ? Action irréversible.`,async()=>{
        try { await window.electronAPI.deleteClient(id); showToast(`Client "${name}" supprimé`,'info'); loadClients(); loadClientsDropdown(); }
        catch { showToast('Erreur suppression','error'); }
    });
}

// ==================== COMPANY PAGE ====================
async function loadCompanyPage() {
    try {
        const c=await window.electronAPI.getCompany(currentUser.id)||{};
        ['Name','MF','Address','Phone','Email','RC','Website','Bank'].forEach(f=>{
            const el=document.getElementById('company'+f); if (el) el.value=c[f.toLowerCase()]||'';
        });
        document.getElementById('companyProfileName').textContent=c.name||currentUser.company||'Votre Entreprise';
        document.getElementById('companyProfileMF').textContent=c.mf?`Matricule Fiscal: ${c.mf}`:'Matricule Fiscal: —';
    } catch {}
}

async function saveCompanySettings() {
    const data={userId:currentUser.id,name:document.getElementById('companyName').value.trim(),mf:document.getElementById('companyMF').value.trim(),address:document.getElementById('companyAddress').value.trim(),phone:document.getElementById('companyPhone').value.trim(),email:document.getElementById('companyEmail').value.trim(),rc:document.getElementById('companyRC').value.trim(),website:document.getElementById('companyWebsite').value.trim(),bank:document.getElementById('companyBank').value.trim()};
    try {
        await window.electronAPI.saveCompany(data);
        document.getElementById('companyProfileName').textContent=data.name||'Votre Entreprise';
        document.getElementById('companyProfileMF').textContent=data.mf?`Matricule Fiscal: ${data.mf}`:'Matricule Fiscal: —';
        showToast('Informations enregistrées','success'); await loadCompanyIntoForm();
    } catch { showToast('Erreur enregistrement','error'); }
}

// ==================== EXPORT ====================
async function exportAllToExcel() {
    if (!allDocuments.length) { showToast('Aucun document à exporter','warning'); return; }
    try {
        const {filePath}=await window.electronAPI.showSaveDialog({defaultPath:`documents-${new Date().toISOString().split('T')[0]}.xlsx`,filters:[{name:'Excel',extensions:['xlsx']}]});
        if (filePath) { showLoading('Export Excel...'); await window.electronAPI.exportExcelDocuments({documents:allDocuments,filePath}); showToast('Export terminé !','success'); }
    } catch { showToast('Erreur export','error'); }
    finally { hideLoading(); }
}

async function exportClientsToExcel() {
    if (!allClients.length) { showToast('Aucun client à exporter','warning'); return; }
    try {
        const {filePath}=await window.electronAPI.showSaveDialog({defaultPath:`clients-${new Date().toISOString().split('T')[0]}.xlsx`,filters:[{name:'Excel',extensions:['xlsx']}]});
        if (filePath) { showLoading('Export Excel...'); await window.electronAPI.exportExcelClients({clients:allClients,filePath}); showToast('Export terminé !','success'); }
    } catch { showToast('Erreur export','error'); }
    finally { hideLoading(); }
}

// ==================== SETTINGS & BACKUP ====================
async function loadSettings() {
    try {
        const s=await window.electronAPI.getBackupSettings();
        document.getElementById('backupEnabled').checked=s.enabled;
        document.getElementById('backupFrequency').value=s.frequency;
        document.getElementById('backupTime').value=s.time;
        document.getElementById('backupKeep').value=s.keepCount;
        loadBackupList();
    } catch {}
}

async function saveBackupSettings() {
    try { await window.electronAPI.saveBackupSettings({enabled:document.getElementById('backupEnabled').checked,frequency:document.getElementById('backupFrequency').value,time:document.getElementById('backupTime').value,keepCount:parseInt(document.getElementById('backupKeep').value)}); showToast('Paramètres enregistrés','success'); }
    catch { showToast('Erreur','error'); }
}

async function createManualBackup() {
    showLoading('Création de la sauvegarde...');
    try { const r=await window.electronAPI.createManualBackup(); if (r.success) { showToast('Sauvegarde créée !','success'); loadBackupList(); } }
    catch { showToast('Erreur sauvegarde','error'); }
    finally { hideLoading(); }
}

async function restoreFromBackup() { showToast('Sélectionnez un fichier .zip de sauvegarde','info'); }

async function loadBackupList() {
    try {
        const backups=await window.electronAPI.getBackupList();
        const container=document.getElementById('backupList');
        if (!backups.length) { container.innerHTML='<p style="color:var(--gray-500);font-size:0.875rem">Aucune sauvegarde disponible</p>'; return; }
        container.innerHTML=backups.map(b=>`<div class="backup-item"><div class="backup-item-info"><div class="backup-date">📦 ${new Date(b.created).toLocaleString('fr-FR')}</div><div class="backup-size">${(b.size/1024/1024).toFixed(2)} MB</div></div><button class="btn btn-small btn-secondary" onclick="restoreBackup('${b.path}')">↩️ Restaurer</button></div>`).join('');
    } catch {}
}

async function restoreBackup(backupPath) {
    showConfirm('📤 Restaurer','Cela remplacera TOUTES vos données actuelles. Action irréversible.',async()=>{
        showLoading('Restauration...');
        try { const r=await window.electronAPI.restoreBackup(backupPath); if (r.success) { showToast('Restauration réussie !','success',2000); setTimeout(()=>location.reload(),2000); } else showToast('Erreur: '+r.error,'error'); }
        catch { showToast('Erreur restauration','error'); }
        finally { hideLoading(); }
    },'Restaurer','btn-warning');
}

// ==================== UTILITIES ====================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}); }
    catch { return dateStr; }
}

window.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active'); });
window.addEventListener('keydown', e => { if (e.key==='Escape') document.querySelectorAll('.modal-overlay.active,.preview-container.active').forEach(el=>el.classList.remove('active')); });