// ==================== GLOBALS ====================
let currentUser       = null;
let currentDocType    = 'facture';
let itemCount         = 0;
let logoImage         = null;
let stampImage        = null;
let signatureImage    = null;
let timbreAmount      = 0;
let allDocuments      = [];
let allClients        = [];
let allServices       = [];
let allContracts      = [];
let editingServiceId  = null;
let editingDocId      = null;
let editingContractId = null;
let confirmCallback   = null;
let currentSettings   = {};

// ==================== DECIMAL / ROUNDING ====================
let currentDecimalPlaces  = 3;
let currentRoundingMethod = 'half_up';

/**
 * Round a number according to currentRoundingMethod, then format to currentDecimalPlaces.
 */
function roundValue(value) {
    const dp = currentDecimalPlaces;
    const factor = Math.pow(10, dp);
    if (currentRoundingMethod === 'ceil')   return Math.ceil(value  * factor) / factor;
    if (currentRoundingMethod === 'floor')  return Math.floor(value * factor) / factor;
    // half_up (default) — standard Math.round behaviour
    return Math.round(value * factor) / factor;
}

function formatAmount(value) {
    return roundValue(parseFloat(value) || 0).toFixed(currentDecimalPlaces);
}

// ==================== DOCUMENT VISUAL THEME ====================
let currentDocumentTheme = null; // full theme object from themes.js THEMES

const DEFAULT_THEMES = {
    classic: {
        id:'classic', label:'Classique', icon:'📜',
        colors:{ primary:'#1e3a8a', secondary:'#334155', accent:'#64748b', bg:'#ffffff', surface:'#f8fafc', border:'#e2e8f0', text:'#1e293b', textLight:'#64748b' },
        fonts:{ header:"'Times New Roman', Times, serif", body:"'Times New Roman', Times, serif", size:'13px' },
        headerStyle:'left', tableStyle:'bordered', footerLayout:'two-columns',
        showLogo:true, showStamp:true, showSignature:true, showQrCode:false, accentLine:true, borderRadius:'0px'
    },
    modern: {
        id:'modern', label:'Moderne', icon:'✨',
        colors:{ primary:'#0f172a', secondary:'#3b82f6', accent:'#06b6d4', bg:'#ffffff', surface:'#f0f9ff', border:'#bfdbfe', text:'#0f172a', textLight:'#6b7280' },
        fonts:{ header:"'Inter', 'Segoe UI', sans-serif", body:"'Inter', 'Segoe UI', sans-serif", size:'13px' },
        headerStyle:'center', tableStyle:'striped', footerLayout:'simple',
        showLogo:true, showStamp:false, showSignature:true, showQrCode:true, accentLine:false, borderRadius:'8px'
    },
    executive: {
        id:'executive', label:'Exécutif', icon:'👑',
        colors:{ primary:'#b8942a', secondary:'#2c2c2c', accent:'#c6a43f', bg:'#fffdf5', surface:'#fdf8ec', border:'#e8d5a3', text:'#1a1a1a', textLight:'#6b5c3e' },
        fonts:{ header:"'Georgia', serif", body:"'Lato', 'Helvetica Neue', sans-serif", size:'13px' },
        headerStyle:'right', tableStyle:'minimal', footerLayout:'with-bank',
        showLogo:true, showStamp:true, showSignature:true, showQrCode:false, accentLine:true, borderRadius:'4px'
    },
    tunisian: {
        id:'tunisian', label:'Tunisien', icon:'🇹🇳',
        colors:{ primary:'#7c1a1a', secondary:'#c17a54', accent:'#e87b2a', bg:'#fffbf7', surface:'#fdf5ee', border:'#f5cba7', text:'#2d1b0e', textLight:'#7c5c3e' },
        fonts:{ header:"'Georgia', serif", body:"'Lato', 'Arial', sans-serif", size:'13px' },
        headerStyle:'center', tableStyle:'bordered', footerLayout:'two-columns',
        showLogo:true, showStamp:true, showSignature:true, showQrCode:false, accentLine:true, borderRadius:'2px'
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    const sessionUser    = sessionStorage.getItem('currentUser');
    const raw = rememberedUser || sessionUser;
    if (raw) {
        try { currentUser = JSON.parse(raw); showApp(); }
        catch { localStorage.removeItem('rememberedUser'); sessionStorage.removeItem('currentUser'); }
    }
});

// ==================== TOAST ====================
function showToast(message, type = 'info', duration = 3500) {
    const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, duration);
}

// ==================== LOADING ====================
function showLoading(text = 'Traitement en cours...') { document.getElementById('loadingText').textContent = text; document.getElementById('loadingOverlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }

// ==================== CONFIRM MODAL ====================
function showConfirm(title, message, onConfirm, btnLabel = 'Confirmer', btnClass = 'btn-danger') {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmBtn');
    btn.textContent = btnLabel; btn.className = `btn ${btnClass}`;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.add('active');
}
function executeConfirm() {
    if (typeof confirmCallback === 'function') { const a = confirmCallback; confirmCallback = null; closeConfirm(); a(); }
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
function showError(msg) { document.getElementById('errorText').textContent = msg; document.getElementById('authError').classList.remove('hidden'); }

async function handleLogin(e) {
    e.preventDefault(); hideError();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Connexion...';
    try {
        const result = await window.electronAPI.authLogin({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value });
        if (result.success) {
            const safeUser = { id: result.user.id||result.user._id, name: result.user.name||'User', email: result.user.email, company: result.user.company||'', mf: result.user.mf||'' };
            currentUser = safeUser;
            if (document.getElementById('rememberMe')?.checked) localStorage.setItem('rememberedUser', JSON.stringify(safeUser));
            else localStorage.removeItem('rememberedUser');
            sessionStorage.setItem('currentUser', JSON.stringify(safeUser));
            showApp();
        } else { showError(result.error || 'Identifiants incorrects'); }
    } catch { showError('Erreur de connexion. Veuillez réessayer.'); }
    finally { btn.disabled = false; btn.textContent = '🔐 Se connecter'; }
}

async function handleRegister(e) {
    e.preventDefault(); hideError();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    if (password !== passwordConfirm) return showError('Les mots de passe ne correspondent pas');
    if (password.length < 6) return showError('Minimum 6 caractères');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Création...';
    try {
        const result = await window.electronAPI.authRegister({ name: document.getElementById('regName').value.trim(), email: document.getElementById('regEmail').value.trim(), company: document.getElementById('regCompany').value.trim(), mf: document.getElementById('regMF').value.trim(), password });
        if (result.success) { showToast('Compte créé ! Veuillez vous connecter.', 'success', 5000); switchAuthTab('login', document.querySelector('.auth-tab')); document.getElementById('loginEmail').value = document.getElementById('regEmail').value; }
        else { showError(result.error || 'Erreur lors de la création'); }
    } catch { showError('Erreur serveur.'); }
    finally { btn.disabled = false; btn.textContent = '📝 Créer mon compte'; }
}

function confirmLogout() { showConfirm('🚪 Déconnexion', 'Tout document non sauvegardé sera perdu. Continuer ?', logout, 'Déconnexion'); }
function logout() {
    currentUser = null;
    localStorage.removeItem('rememberedUser'); sessionStorage.removeItem('currentUser');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('loginForm').reset(); document.getElementById('registerForm').reset();
}

async function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('userName').textContent    = currentUser.name;
    document.getElementById('userEmail').textContent   = currentUser.email;
    document.getElementById('userAvatar').textContent  = currentUser.name.charAt(0).toUpperCase();
    const hour = new Date().getHours();
    document.getElementById('dashboardGreeting').textContent = `${hour < 18 ? 'Bonjour' : 'Bonsoir'}, ${currentUser.name.split(' ')[0]} 👋`;
    // Load user settings (decimal places, rounding, document theme)
    await loadUserFormatSettings();
    await loadDocumentTheme();
    loadDashboard();
    initNewDocument();
}

// ==================== LOAD FORMAT SETTINGS ====================
async function loadUserFormatSettings() {
    try {
        const s = await window.electronAPI.getSettings(currentUser.id);
        currentDecimalPlaces  = s.decimal_places  ?? 3;
        currentRoundingMethod = s.rounding_method  || 'half_up';
        currentSettings = s;
    } catch {}
}

// ==================== LOAD DOCUMENT THEME ====================
async function loadDocumentTheme() {
    try {
        const saved = await window.electronAPI.getDocumentTheme(currentUser.id);
        currentDocumentTheme = saved || DEFAULT_THEMES.modern;
    } catch {
        currentDocumentTheme = DEFAULT_THEMES.modern;
    }
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
    if (idx !== -1) { const navItems = document.querySelectorAll('.nav-item'); if (navItems[idx]) navItems[idx].classList.add('active'); }
    if (page === 'dashboard')   loadDashboard();
    if (page === 'documents')   loadDocuments();
    if (page === 'clients')     loadClients();
    if (page === 'services')    loadServices();
    if (page === 'company')     loadCompanyPage();
    if (page === 'contracts')   loadContracts();
    if (page === 'settings')    { loadSettings(); loadSerialSettings(); loadThemeSettings(); loadDocumentThemeSettings(); loadFormatSettings(); }
}

function createDocOfType(type) { currentDocType = type; document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === type); updateDocType(); navigateTo('new-document'); }

// ==================== DASHBOARD ====================
async function loadDashboard() {
    try {
        const stats = await window.electronAPI.getStats(currentUser.id);
        document.getElementById('statTotalDocs').textContent    = stats.totalDocs;
        document.getElementById('statTotalRevenue').textContent = formatAmount(stats.totalRevenue) + ' TND';
        document.getElementById('statTotalClients').textContent = stats.totalClients;
        document.getElementById('statThisMonth').textContent    = stats.thisMonth;
        // New: unpaid stats
        const unpaidEl = document.getElementById('statUnpaid');
        if (unpaidEl) unpaidEl.textContent = stats.unpaidCount + ' (' + formatAmount(stats.unpaidTotal) + ' TND)';
        const docs = await window.electronAPI.getDocuments(currentUser.id);
        renderRecentDocs(docs.slice(0, 6));
        renderDashboardCharts(stats);
        renderTopClients(stats.topClients || []);
        renderRecentActivity(stats.recentActivity || []);
    } catch (e) { showToast('Erreur tableau de bord', 'error'); }
}

function renderRecentDocs(docs) {
    const container = document.getElementById('recentDocsTable');
    if (!docs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📄</div><h3>Aucun document</h3><p>Créez votre premier document</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>N°</th><th>Client</th><th>Date</th><th>Total TTC</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
        ${docs.map(doc => `<tr>
            <td><span class="badge badge-${doc.type}">${doc.type.toUpperCase()}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${doc.number}</td>
            <td>${escapeHtml(doc.clientName)}</td>
            <td>${formatDate(doc.date)}</td>
            <td style="font-weight:600">${formatAmount(doc.totalTTC)} ${doc.currency}</td>
            <td>${renderPaymentBadge(doc)}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="viewDocument('${doc.id}')"     title="Aperçu">👁️</button>
                ${doc.type==='devis'?`<button class="btn-icon btn-convert" onclick="convertToInvoice('${doc.id}')" title="Convertir">🔄</button>`:''}
                <button class="btn-icon btn-edit"   onclick="editExistingDoc('${doc.id}')"  title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadDocPDF('${doc.id}')"   title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDoc('${doc.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function renderPaymentBadge(doc) {
    if (doc.type !== 'facture') return '—';
    const status = doc.paymentStatus || 'unpaid';
    const map = { paid:'✅ Payée', partial:'⏳ Partiel', unpaid:'❌ Impayée' };
    const cls  = { paid:'badge-paid', partial:'badge-partial', unpaid:'badge-unpaid' };
    return `<span class="badge ${cls[status]||'badge-unpaid'}" onclick="openPaymentModal('${doc.id}')" style="cursor:pointer" title="Gérer paiement">${map[status]||status}</span>`;
}

function renderDashboardCharts(stats) {
    renderRevenueChart(stats.monthlyRevenue || []);
    renderTypeDonutChart(stats.typeBreakdown || []);
}

function renderRevenueChart(monthlyData) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const months = [], values = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth()-i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        months.push(d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}));
        const found = monthlyData.find(m => m.month === key);
        values.push(found ? parseFloat(found.revenue) : 0);
    }
    const max = Math.max(...values, 1);
    const W = canvas.width, H = canvas.height;
    const pad = { top:24, right:16, bottom:44, left:64 };
    const cW = W-pad.left-pad.right, cH = H-pad.top-pad.bottom;
    ctx.clearRect(0,0,W,H);
    // Grid
    for (let i=0;i<=4;i++) {
        const y = pad.top+(cH/4)*i;
        ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cW,y); ctx.stroke();
        const val = max-(max/4)*i;
        ctx.fillStyle='#9ca3af'; ctx.font='10px sans-serif'; ctx.textAlign='right';
        ctx.fillText(val>=1000?(val/1000).toFixed(1)+'k':val.toFixed(0), pad.left-6, y+4);
    }
    // Bars
    const barW = cW/months.length*0.55, gap = cW/months.length;
    const primaryColor = currentDocumentTheme?.colors?.primary || '#3b82f6';
    values.forEach((v,i) => {
        const x = pad.left+gap*i+(gap-barW)/2;
        const bH = (v/max)*cH, y = pad.top+cH-bH;
        const grad = ctx.createLinearGradient(0,y,0,y+bH);
        grad.addColorStop(0, primaryColor); grad.addColorStop(1, primaryColor+'88');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x,y,barW,bH,4); else ctx.rect(x,y,barW,bH);
        ctx.fill();
        ctx.fillStyle='#374151'; ctx.font='10px sans-serif'; ctx.textAlign='center';
        ctx.fillText(months[i], x+barW/2, pad.top+cH+16);
        if (v>0) { ctx.fillStyle=primaryColor; ctx.font='bold 10px sans-serif'; ctx.fillText(v>=1000?(v/1000).toFixed(1)+'k':formatAmount(v), x+barW/2, y-5); }
    });
}

function renderTypeDonutChart(breakdown) {
    const canvas = document.getElementById('typeDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const colors = { facture:'#3b82f6', devis:'#f59e0b', bon:'#10b981' };
    const labels = { facture:'Factures', devis:'Devis', bon:'Bons' };
    const total = breakdown.reduce((s,b) => s+b.count, 0);
    const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2-10, r=Math.min(W,H)*0.35;
    ctx.clearRect(0,0,W,H);
    if (total===0) {
        ctx.fillStyle='#d1d5db'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#9ca3af'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('Aucun document',cx,cy+4); return;
    }
    let start = -Math.PI/2;
    breakdown.forEach(b => {
        const slice = (b.count/total)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+slice); ctx.closePath();
        ctx.fillStyle = colors[b.type]||'#6b7280'; ctx.fill(); start+=slice;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    ctx.fillStyle='#111'; ctx.font='bold 18px sans-serif'; ctx.textAlign='center'; ctx.fillText(total,cx,cy+4);
    ctx.fillStyle='#6b7280'; ctx.font='11px sans-serif'; ctx.fillText('documents',cx,cy+18);
    let ly=cy+r+22;
    breakdown.forEach(b => {
        const lx=cx-60;
        ctx.fillStyle=colors[b.type]||'#6b7280'; ctx.fillRect(lx,ly-8,12,12);
        ctx.fillStyle='#374151'; ctx.font='11px sans-serif'; ctx.textAlign='left';
        ctx.fillText(`${labels[b.type]||b.type}: ${b.count}`,lx+16,ly+2); ly+=18;
    });
}

function renderTopClients(topClients) {
    const el = document.getElementById('topClientsTable');
    if (!el) return;
    if (!topClients.length) { el.innerHTML='<p style="color:#9ca3af;font-size:0.85rem;padding:12px">Aucune donnée</p>'; return; }
    const max = Math.max(...topClients.map(c=>c.revenue),1);
    el.innerHTML = topClients.map((c,i) => `
        <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px">
                <span style="font-weight:600;color:#374151">${i+1}. ${escapeHtml(c.client_name)}</span>
                <span style="color:#6b7280">${formatAmount(c.revenue)} TND</span>
            </div>
            <div style="background:#e5e7eb;border-radius:4px;height:6px">
                <div style="background:${currentDocumentTheme?.colors?.primary||'#3b82f6'};width:${Math.round(c.revenue/max*100)}%;height:6px;border-radius:4px"></div>
            </div>
        </div>`).join('');
}

function renderRecentActivity(activities) {
    const el = document.getElementById('recentActivityList');
    if (!el) return;
    const icons = { create_document:'📄', update_document:'✏️', create_client:'👤', default:'🔔' };
    const labels = { create_document:'Document créé', update_document:'Document modifié', create_client:'Client ajouté', default:'Action' };
    if (!activities.length) { el.innerHTML='<p style="color:#9ca3af;font-size:0.85rem;padding:12px">Aucune activité récente</p>'; return; }
    el.innerHTML = activities.map(a => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
            <span style="font-size:1.2rem">${icons[a.action]||icons.default}</span>
            <div>
                <div style="font-size:0.85rem;font-weight:500;color:#374151">${escapeHtml(a.entity_label||labels[a.action]||a.action)}</div>
                <div style="font-size:0.75rem;color:#9ca3af">${formatDate(a.created_at?.split('T')[0]||a.created_at)}</div>
            </div>
        </div>`).join('');
}

// ==================== PAYMENT MODAL ====================
let currentPaymentDocId = null;

async function openPaymentModal(docId) {
    currentPaymentDocId = docId;
    const doc = allDocuments.find(d => d.id === docId) || await window.electronAPI.getDocument(docId);
    if (!doc) return;
    document.getElementById('paymentDocInfo').textContent = `${doc.number} — ${escapeHtml(doc.clientName)} — Total: ${formatAmount(doc.totalTTC)} ${doc.currency}`;
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.getElementById('paymentAmount').value = formatAmount(Math.max(0, doc.totalTTC-(doc.paidAmount||0)));
    document.getElementById('paymentMethod').value = 'Virement bancaire';
    document.getElementById('paymentRef').value = '';
    document.getElementById('paymentNotes').value = '';
    await loadPaymentHistory(docId, doc);
    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() { document.getElementById('paymentModal').classList.remove('active'); currentPaymentDocId = null; }

async function loadPaymentHistory(docId, doc) {
    const payments = await window.electronAPI.getPayments(docId);
    const el = document.getElementById('paymentHistory');
    if (!payments || !payments.length) { el.innerHTML='<p style="color:#9ca3af;font-size:0.85rem">Aucun paiement enregistré</p>'; return; }
    const totalPaid = payments.reduce((s,p) => s+p.amount, 0);
    el.innerHTML = `
        <div style="margin-bottom:8px;font-size:0.85rem;color:#374151"><strong>Total encaissé:</strong> ${formatAmount(totalPaid)} ${doc?.currency||'TND'} / ${formatAmount(doc?.totalTTC||0)} ${doc?.currency||'TND'}</div>
        ${payments.map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:0.85rem">
                <div><strong>${formatAmount(p.amount)} TND</strong> — ${escapeHtml(p.method||'N/A')} <span style="color:#9ca3af">${formatDate(p.date)}</span> ${p.reference?`<span style="color:#6b7280">(${escapeHtml(p.reference)})</span>`:''}</div>
                <button class="btn-icon btn-delete" onclick="deletePayment('${p.id}')" title="Supprimer">🗑️</button>
            </div>`).join('')}`;
}

async function savePayment() {
    if (!currentPaymentDocId) return;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    if (!amount || amount <= 0) { showToast('Montant invalide', 'warning'); return; }
    try {
        await window.electronAPI.addPayment({
            userId: currentUser.id,
            documentId: currentPaymentDocId,
            amount, method: document.getElementById('paymentMethod').value,
            reference: document.getElementById('paymentRef').value,
            date: document.getElementById('paymentDate').value,
            notes: document.getElementById('paymentNotes').value
        });
        showToast('Paiement enregistré', 'success');
        await loadDocuments();
        const doc = allDocuments.find(d => d.id === currentPaymentDocId);
        await loadPaymentHistory(currentPaymentDocId, doc);
        if (doc) { document.getElementById('paymentDocInfo').textContent = `${doc.number} — ${escapeHtml(doc.clientName)} — Total: ${formatAmount(doc.totalTTC)} ${doc.currency}`; }
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function deletePayment(paymentId) {
    if (!currentPaymentDocId) return;
    try {
        await window.electronAPI.deletePayment(paymentId);
        showToast('Paiement supprimé', 'info');
        await loadDocuments();
        const doc = allDocuments.find(d => d.id === currentPaymentDocId);
        await loadPaymentHistory(currentPaymentDocId, doc);
    } catch (e) { showToast('Erreur suppression', 'error'); }
}

// ==================== NEW DOCUMENT ====================
async function initNewDocument() {
    document.getElementById('docDate').valueAsDate = new Date();
    const due = new Date(); due.setDate(due.getDate()+30);
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
        if (c.logo_image)      logoImage      = c.logo_image;
        if (c.stamp_image)     stampImage     = c.stamp_image;
        if (c.signature_image) signatureImage = c.signature_image;
    } catch {}
}

function selectDocType(type) { currentDocType = type; document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === type); updateDocType(); }

function updateDocType() {
    currentDocType = document.querySelector('input[name="docType"]:checked').value;
    document.getElementById('dueDateGroup').style.display = currentDocType === 'facture' ? 'block' : 'none';
    const currentNum = document.getElementById('docNumber').value;
    if (currentNum) {
        const parts = currentNum.split('-'), year = new Date().getFullYear();
        if (parts.length === 3) {
            const prefix = {facture:'FAC', devis:'DEV', bon:'BC'}[currentDocType];
            document.getElementById('docNumber').value = `${prefix}-${year}-${parts[2]}`;
        }
    }
}

function generateRandomMF() {
    const n = () => Math.floor(Math.random()*9000000+1000000);
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
        <td><input type="number" class="item-input" id="price${itemCount}" value="0.${currentDecimalPlaces===2?'00':'000'}" min="0" step="0.001" onchange="calculateTotals()"></td>
        <td><select class="tva-select" id="tva${itemCount}" onchange="calculateTotals()">
            <option value="19">19%</option><option value="13">13%</option>
            <option value="7">7%</option><option value="0">0%</option>
        </select></td>
        <td style="text-align:right;font-weight:500" id="total${itemCount}">0.${'0'.repeat(currentDecimalPlaces)}</td>
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
    let totalHTRaw = 0, tva19 = 0, tva13 = 0, tva7 = 0;
    for (let i = 1; i <= itemCount; i++) {
        const qty   = parseFloat(document.getElementById(`qty${i}`)?.value)   || 0;
        const price = parseFloat(document.getElementById(`price${i}`)?.value) || 0;
        const tva   = parseFloat(document.getElementById(`tva${i}`)?.value)   || 0;
        const line  = qty * price;
        const cell  = document.getElementById(`total${i}`);
        if (cell) cell.textContent = formatAmount(line);
        totalHTRaw += line;
        if (tva===19) tva19 += line*0.19;
        else if (tva===13) tva13 += line*0.13;
        else if (tva===7)  tva7  += line*0.07;
    }
    const applyTimbre = document.getElementById('applyTimbre').checked;
    timbreAmount = (applyTimbre && totalHTRaw > 1000) ? 1.000 : 0;
    document.getElementById('timbreDisplay').textContent = formatAmount(timbreAmount) + ' TND';

    // Raw total TTC (full precision)
    const totalTTCRaw = totalHTRaw + tva19 + tva13 + tva7 + timbreAmount;

    // Rounded total TTC
    const totalTTCRounded = roundValue(totalTTCRaw);
    const totalHTRounded  = roundValue(totalHTRaw);

    // Rounding adjustment
    const adjustment = parseFloat((totalTTCRounded - totalTTCRaw).toFixed(10));

    const currency = document.getElementById('docCurrency').value;
    document.getElementById('totalHT').textContent = formatAmount(totalHTRaw) + ' ' + currency;
    setRow('tva19Row', 'tva19Amount', tva19, currency);
    setRow('tva13Row', 'tva13Amount', tva13, currency);
    setRow('tva7Row',  'tva7Amount',  tva7,  currency);
    setRow('timbreRow','timbreTotal', timbreAmount, currency);

    // Rounding adjustment row
    const adjRow = document.getElementById('roundingAdjRow');
    const adjAmt = document.getElementById('roundingAdjAmount');
    if (adjRow && adjAmt) {
        if (Math.abs(adjustment) > 0.0001) {
            adjRow.classList.remove('hidden');
            adjAmt.textContent = (adjustment > 0 ? '+' : '') + formatAmount(adjustment) + ' ' + currency;
        } else {
            adjRow.classList.add('hidden');
        }
    }

    document.getElementById('totalTTC').textContent = formatAmount(totalTTCRounded) + ' ' + currency;
}

function setRow(rowId, amtId, value, currency) {
    document.getElementById(rowId).classList.toggle('hidden', value <= 0);
    document.getElementById(amtId).textContent = formatAmount(value) + ' ' + currency;
}

// ==================== SERVICES DROPDOWN ====================
async function loadServicesDropdown() {
    if (!currentUser) return;
    try {
        allServices = await window.electronAPI.getServices(currentUser.id);
        const select = document.getElementById('presetServiceSelect');
        select.innerHTML = '<option value="">— Sélectionner un service enregistré —</option>';
        allServices.forEach(s => {
            const o = document.createElement('option');
            o.value = JSON.stringify({ name: s.name, description: s.description, price: s.price, tva: s.tva });
            o.textContent = `${s.name} - ${formatAmount(parseFloat(s.price))} TND (${s.tva}%)`;
            select.appendChild(o);
        });
    } catch {}
}

function addPresetService() {
    const select = document.getElementById('presetServiceSelect');
    if (!select.value) return;
    const service = JSON.parse(select.value);
    addItem();
    document.getElementById(`desc${itemCount}`).value  = service.description ? `${service.name} - ${service.description}` : service.name;
    document.getElementById(`price${itemCount}`).value = service.price;
    document.getElementById(`tva${itemCount}`).value   = service.tva;
    select.value = '';
    calculateTotals();
    showToast('Service ajouté', 'success');
}

// ==================== COMPANY IMAGES ====================
function handleCompanyImageUpload(input, type) {
    if (!input.files?.[0]) return;
    if (input.files[0].size > 5*1024*1024) { showToast('Image trop lourde (max 5 MB)','warning'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = e.target.result;
        const cap = type.charAt(0).toUpperCase()+type.slice(1);
        const previewEl = document.getElementById(`company${cap}Preview`);
        const placeholderEl = document.getElementById(`company${cap}Placeholder`);
        const boxEl = document.getElementById(`company${cap}Box`);
        if (previewEl) { previewEl.src = data; previewEl.classList.remove('hidden'); }
        if (placeholderEl) placeholderEl.classList.add('hidden');
        if (boxEl) boxEl.classList.add('has-image');
        try {
            const payload = { userId: currentUser.id };
            if (type==='logo')      { payload.logoImage = data;      logoImage = data; }
            if (type==='stamp')     { payload.stampImage = data;     stampImage = data; }
            if (type==='signature') { payload.signatureImage = data; signatureImage = data; }
            await window.electronAPI.saveCompanyImages(payload);
            showToast(`${cap} enregistré`, 'success');
        } catch { showToast('Erreur sauvegarde image', 'error'); }
    };
    reader.readAsDataURL(input.files[0]);
}

async function removeCompanyImage(type) {
    const cap = type.charAt(0).toUpperCase()+type.slice(1);
    const previewEl = document.getElementById(`company${cap}Preview`);
    const placeholderEl = document.getElementById(`company${cap}Placeholder`);
    const boxEl = document.getElementById(`company${cap}Box`);
    const inputEl = document.getElementById(`company${cap}Input`);
    if (previewEl) { previewEl.src=''; previewEl.classList.add('hidden'); }
    if (placeholderEl) placeholderEl.classList.remove('hidden');
    if (boxEl) boxEl.classList.remove('has-image');
    if (inputEl) inputEl.value='';
    if (type==='logo') logoImage=null;
    if (type==='stamp') stampImage=null;
    if (type==='signature') signatureImage=null;
    try { await window.electronAPI.removeCompanyImage({ userId: currentUser.id, imageType: type }); showToast(`${cap} supprimé`, 'info'); }
    catch { showToast('Erreur suppression image', 'error'); }
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
    try { allServices = await window.electronAPI.getServices(currentUser.id); renderServicesTable(allServices); }
    catch { showToast('Erreur chargement services','error'); }
}

function renderServicesTable(services) {
    const container = document.getElementById('servicesTable');
    if (!services.length) { container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">🛍️</div><h3>Aucun service</h3><p>Ajoutez vos produits et services pour un remplissage rapide des documents</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th>Nom</th><th>Description</th><th>Prix HT</th><th>TVA</th><th>Actions</th></tr></thead><tbody>
        ${services.map(s=>`<tr>
            <td style="font-weight:600">${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.description)||'—'}</td>
            <td>${formatAmount(parseFloat(s.price))} TND</td>
            <td>${s.tva}%</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit"   onclick="editService('${s.id}')"         title="Modifier">✏️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteService('${s.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function filterServices() {
    const q = document.getElementById('searchServices').value.toLowerCase();
    renderServicesTable(allServices.filter(s => s.name.toLowerCase().includes(q) || (s.description&&s.description.toLowerCase().includes(q))));
}

function openServiceModal() {
    editingServiceId = null;
    document.getElementById('serviceModalTitle').textContent = '➕ Nouveau Service';
    ['serviceName','serviceDescription'].forEach(id => document.getElementById(id).value='');
    document.getElementById('servicePrice').value = '0.000';
    document.getElementById('serviceTva').value = '19';
    document.getElementById('serviceModal').classList.add('active');
}

function closeServiceModal() { document.getElementById('serviceModal').classList.remove('active'); editingServiceId=null; }

async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    if (!name) { showToast('Le nom du service est requis','warning'); return; }
    try {
        await window.electronAPI.saveService({ id: editingServiceId, userId: currentUser.id, name, description: document.getElementById('serviceDescription').value.trim(), price: parseFloat(document.getElementById('servicePrice').value)||0, tva: parseFloat(document.getElementById('serviceTva').value)||19 });
        showToast(editingServiceId?'Service mis à jour':'Service créé','success');
        closeServiceModal(); await loadServices(); await loadServicesDropdown();
    } catch { showToast("Erreur lors de l'enregistrement",'error'); }
}

async function editService(serviceId) {
    const s = allServices.find(x => x.id===serviceId);
    if (!s) return;
    editingServiceId = serviceId;
    document.getElementById('serviceModalTitle').textContent = '✏️ Modifier Service';
    document.getElementById('serviceName').value = s.name;
    document.getElementById('serviceDescription').value = s.description||'';
    document.getElementById('servicePrice').value = s.price;
    document.getElementById('serviceTva').value = s.tva;
    document.getElementById('serviceModal').classList.add('active');
}

function confirmDeleteService(serviceId) {
    const s = allServices.find(x=>x.id===serviceId);
    showConfirm('🗑️ Supprimer', `Supprimer "${s?.name}" ?`, async () => {
        try { await window.electronAPI.deleteService(serviceId); showToast('Service supprimé','info'); await loadServices(); await loadServicesDropdown(); }
        catch { showToast('Erreur suppression','error'); }
    });
}

// ==================== SERIAL NUMBER SETTINGS ====================
async function loadSerialSettings() {
    if (!currentUser) return;
    try {
        currentSettings = await window.electronAPI.getSettings(currentUser.id);
        document.getElementById('prefixFacture').value = currentSettings.prefix_facture||'FAC';
        document.getElementById('prefixDevis').value   = currentSettings.prefix_devis  ||'DEV';
        document.getElementById('prefixBon').value     = currentSettings.prefix_bon    ||'BC';
        updateSerialPreview();
    } catch {}
}

function updateSerialPreview() {
    const prefix = document.getElementById('prefixFacture').value||'FAC';
    document.getElementById('serialPreview').textContent = `${prefix}-${new Date().getFullYear()}-001`;
}

async function saveSerialSettings() {
    const settings = { prefix_facture: document.getElementById('prefixFacture').value.toUpperCase(), prefix_devis: document.getElementById('prefixDevis').value.toUpperCase(), prefix_bon: document.getElementById('prefixBon').value.toUpperCase() };
    try { await window.electronAPI.updateSettings({ userId: currentUser.id, settings }); showToast('Paramètres de numérotation enregistrés','success'); await loadSerialSettings(); }
    catch { showToast("Erreur d'enregistrement",'error'); }
}

function openResetCounterModal() {
    showConfirm('🔄 Réinitialiser le compteur', "Cela réinitialisera la séquence à 001. Continuer ?", async () => {
        try {
            await window.electronAPI.resetCounter({ userId: currentUser.id, type: 'all', year: new Date().getFullYear() });
            showToast('Compteur réinitialisé','success');
            await loadSerialSettings();
            if (document.getElementById('page-new-document').classList.contains('active')) {
                const number = await window.electronAPI.getNextDocNumber({ userId: currentUser.id, type: currentDocType, year: new Date().getFullYear() });
                document.getElementById('docNumber').value = number;
            }
        } catch { showToast('Erreur','error'); }
    }, 'Réinitialiser', 'btn-warning');
}

// ==================== FORMAT SETTINGS ====================
function loadFormatSettings() {
    const dpEl = document.getElementById('settingDecimalPlaces');
    const rmEl = document.getElementById('settingRoundingMethod');
    if (dpEl) dpEl.value = String(currentDecimalPlaces);
    if (rmEl) rmEl.value = currentRoundingMethod;
}

async function saveFormatSettings() {
    const dp = parseInt(document.getElementById('settingDecimalPlaces').value) || 3;
    const rm = document.getElementById('settingRoundingMethod').value || 'half_up';
    try {
        await window.electronAPI.updateSettings({ userId: currentUser.id, settings: { decimal_places: dp, rounding_method: rm } });
        currentDecimalPlaces  = dp;
        currentRoundingMethod = rm;
        showToast('Format des nombres enregistré','success');
        calculateTotals(); // refresh display
    } catch { showToast("Erreur d'enregistrement",'error'); }
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
    const get = id => document.getElementById(id)?.value||'';
    const companyName=get('docCompanyName'), companyMF=get('docCompanyMF'), companyAddress=get('docCompanyAddress');
    const companyPhone=get('docCompanyPhone'), companyEmail=get('docCompanyEmail'), companyRC=get('docCompanyRC');
    const clientName=get('docClientName'), clientMF=get('docClientMF'), clientAddress=get('docClientAddress');
    const clientPhone=get('docClientPhone'), clientEmail=get('docClientEmail');
    const docNumber=get('docNumber'), docDate=get('docDate'), docDueDate=get('docDueDate');
    const currency=get('docCurrency'), paymentMode=get('docPayment'), notes=get('docNotes');

    let totalHTRaw=0, tva19=0, tva13=0, tva7=0;
    const items = [];
    for (let i=1;i<=itemCount;i++) {
        const desc=document.getElementById(`desc${i}`)?.value.trim();
        const qty=parseFloat(document.getElementById(`qty${i}`)?.value)||0;
        const price=parseFloat(document.getElementById(`price${i}`)?.value)||0;
        const tva=parseFloat(document.getElementById(`tva${i}`)?.value)||0;
        if (!desc) continue;
        const line=qty*price; totalHTRaw+=line;
        if (tva===19) tva19+=line*0.19; else if (tva===13) tva13+=line*0.13; else if (tva===7) tva7+=line*0.07;
        items.push({ description:desc, quantity:qty, price, tva });
    }
    const totalTTCRaw = totalHTRaw+tva19+tva13+tva7+timbreAmount;
    const totalTTCRounded = roundValue(totalTTCRaw);
    const roundingAdjustment = parseFloat((totalTTCRounded-totalTTCRaw).toFixed(10));

    const theme = currentDocumentTheme || DEFAULT_THEMES.modern;
    const typeLabel = getDocTypeLabel(currentDocType);

    const themedHTML = buildThemedInvoicePreview({
        theme, typeLabel,
        companyName, companyMF, companyAddress, companyPhone, companyEmail, companyRC,
        clientName, clientMF, clientAddress, clientPhone, clientEmail,
        docNumber, docDate, docDueDate, currency, paymentMode, notes,
        logoImage: theme.showLogo ? logoImage : null,
        stampImage: theme.showStamp ? stampImage : null,
        signatureImage: theme.showSignature ? signatureImage : null,
        items, totalHT: totalHTRaw, tva19, tva13, tva7,
        totalTTC: totalTTCRounded, timbreAmount, roundingAdjustment,
        formatAmount
    });

    document.getElementById('previewContent').innerHTML = themedHTML;
}

/**
 * Build the themed invoice preview HTML — inline, no module import needed.
 */
function buildThemedInvoicePreview(d) {
    const t = d.theme || DEFAULT_THEMES.modern;
    const c = t.colors;
    const f = t.fonts;
    const fa = (v) => d.formatAmount ? d.formatAmount(v) : (v||0).toFixed(3);

    const tableCSS = t.tableStyle === 'bordered'
        ? `table{border-collapse:collapse;width:100%} th,td{border:1px solid ${c.border};padding:8px 10px} thead tr{background:${c.surface}}`
        : t.tableStyle === 'striped'
        ? `table{border-collapse:collapse;width:100%} th{border-bottom:2px solid ${c.primary};padding:10px;color:${c.textLight};font-size:11px;text-transform:uppercase} td{padding:10px;border-bottom:1px solid ${c.border}} tbody tr:nth-child(odd){background:${c.surface}}`
        : `table{border-collapse:collapse;width:100%} th{border-bottom:2px solid ${c.primary};padding:10px 4px;color:${c.textLight};font-size:11px;text-transform:uppercase} td{padding:12px 4px;border-bottom:1px solid ${c.border}}`;

    const itemsRows = d.items.map((item,i) => `
        <tr>
            <td style="color:${c.textLight};font-size:12px">${i+1}</td>
            <td>${escapeHtml(item.description)}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${fa(item.price)}</td>
            <td style="text-align:center">${item.tva}%</td>
            <td style="text-align:right;font-weight:600">${fa(item.quantity*item.price)}</td>
        </tr>`).join('');

    const logoHtml = d.logoImage ? `<img src="${d.logoImage}" style="max-width:130px;max-height:65px;object-fit:contain;margin-bottom:8px;display:block${t.headerStyle==='center'?';margin:0 auto 8px auto':''}">` : '';

    let headerHtml;
    if (t.headerStyle === 'center') {
        headerHtml = `<div style="text-align:center;margin-bottom:40px">
            ${logoHtml}
            <div style="font-family:${f.header};font-size:30px;font-weight:800;color:${c.primary}">${escapeHtml(d.typeLabel)}</div>
            <div style="width:50px;height:3px;background:${c.primary};margin:10px auto"></div>
            <div style="color:${c.textLight};font-size:13px"># ${escapeHtml(d.docNumber)} | ${formatDate(d.docDate)}</div>
            <div style="font-size:18px;font-weight:700;margin-top:12px;color:${c.secondary}">${escapeHtml(d.companyName)}</div>
            <div style="font-size:12px;color:${c.textLight}">${d.companyAddress?escapeHtml(d.companyAddress):''} ${d.companyMF?'| MF: '+escapeHtml(d.companyMF):''}</div>
        </div>`;
    } else {
        const left = `<div>${logoHtml}<div style="font-size:18px;font-weight:700;color:${c.secondary};font-family:${f.header}">${escapeHtml(d.companyName)}</div><div style="font-size:12px;color:${c.textLight};margin-top:6px">${d.companyAddress?`<div>${escapeHtml(d.companyAddress)}</div>`:''} ${d.companyPhone?`<div>📞 ${escapeHtml(d.companyPhone)}</div>`:''} ${d.companyMF?`<div>MF: ${escapeHtml(d.companyMF)}</div>`:''}</div></div>`;
        const right = `<div style="text-align:right"><div style="font-family:${f.header};font-size:30px;font-weight:800;color:${c.primary}">${escapeHtml(d.typeLabel)}</div><div style="width:50px;height:3px;background:${c.primary};margin:10px 0 12px auto"></div><div style="font-size:13px;color:${c.textLight}"><div><strong style="color:${c.text}">#</strong> ${escapeHtml(d.docNumber)}</div><div><strong style="color:${c.text}">Date:</strong> ${formatDate(d.docDate)}</div>${d.docDueDate?`<div><strong style="color:${c.text}">Échéance:</strong> ${formatDate(d.docDueDate)}</div>`:''} ${d.paymentMode?`<div><strong style="color:${c.text}">Paiement:</strong> ${escapeHtml(d.paymentMode)}</div>`:''}</div></div>`;
        headerHtml = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">${t.headerStyle==='right'?right+left:left+right}</div>`;
    }

    const accentBar = t.accentLine ? `<div style="height:4px;background:linear-gradient(90deg,${c.primary},${c.accent||c.secondary})"></div>` : '';

    return `<div style="font-family:${f.body};color:${c.text};padding:40px;max-width:900px;margin:auto;font-size:${f.size};background:${c.bg}">
        ${accentBar}
        <div style="padding-top:${t.accentLine?'24px':'0'}">
        ${headerHtml}
        <div style="margin-bottom:32px">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${c.textLight};margin-bottom:6px">Facturé à</div>
            <div style="font-weight:600;font-size:15px;color:${c.text}">${escapeHtml(d.clientName)}</div>
            <div style="font-size:12px;color:${c.textLight};margin-top:4px">
                ${d.clientAddress?`<div>${escapeHtml(d.clientAddress)}</div>`:''}
                ${d.clientPhone?`<div>📞 ${escapeHtml(d.clientPhone)}</div>`:''}
                ${d.clientEmail?`<div>✉ ${escapeHtml(d.clientEmail)}</div>`:''}
                ${d.clientMF?`<div>MF: ${escapeHtml(d.clientMF)}</div>`:''}
            </div>
        </div>
        <style>${tableCSS}</style>
        <table style="margin-bottom:32px">
            <thead><tr>
                <th style="width:32px">#</th><th>Description</th>
                <th style="width:70px;text-align:center">Qté</th>
                <th style="width:100px;text-align:right">Prix HT</th>
                <th style="width:70px;text-align:center">TVA</th>
                <th style="width:100px;text-align:right">Total HT</th>
            </tr></thead>
            <tbody>${itemsRows}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end">
            <div style="width:300px">
                <div style="display:flex;justify-content:space-between;padding:5px 0;color:${c.textLight};font-size:13px"><span>Total HT</span><span>${fa(d.totalHT)} ${d.currency}</span></div>
                ${d.tva19?`<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>TVA 19%</span><span>${fa(d.tva19)} ${d.currency}</span></div>`:''}
                ${d.tva13?`<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>TVA 13%</span><span>${fa(d.tva13)} ${d.currency}</span></div>`:''}
                ${d.tva7 ?`<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>TVA 7%</span><span>${fa(d.tva7)} ${d.currency}</span></div>`:''}
                ${d.timbreAmount?`<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>Timbre fiscal</span><span>${fa(d.timbreAmount)} ${d.currency}</span></div>`:''}
                ${d.roundingAdjustment&&Math.abs(d.roundingAdjustment)>0.0001?`<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:12px;font-style:italic"><span>Ajustement d'arrondi</span><span>${d.roundingAdjustment>0?'+':''}${fa(d.roundingAdjustment)} ${d.currency}</span></div>`:''}
                <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:2px solid ${c.primary};font-size:18px;font-weight:800;color:${c.primary}"><span>Total TTC</span><span>${fa(d.totalTTC)} ${d.currency}</span></div>
            </div>
        </div>
        ${d.notes?`<div style="margin-top:40px;padding-top:16px;border-top:1px solid ${c.border};font-size:12px;color:${c.textLight}">${escapeHtml(d.notes).replace(/\n/g,'<br>')}</div>`:''}
        <div style="margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end">
            ${d.signatureImage?`<div><div style="font-size:10px;color:${c.textLight};margin-bottom:4px">Signature</div><img src="${d.signatureImage}" style="max-height:70px"></div>`:'<div></div>'}
            ${d.stampImage?`<div><img src="${d.stampImage}" style="max-height:85px;opacity:0.85"></div>`:'<div></div>'}
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
            showToast('Document enregistré','success');
            generatePreviewHTML();
            const html = buildFullHTML();
            const filename = `${result.document.number}.pdf`;
            hideLoading();
            const pdfResult = await window.electronAPI.savePDF({ html, filename });
            if (pdfResult.success) showToast('PDF enregistré avec succès','success');
            resetDocumentForm(); navigateTo('documents');
        }
    } catch { showToast("Erreur lors de l'enregistrement",'error'); }
    finally { hideLoading(); }
}

// ==================== PDF HELPERS ====================
function buildFullHTML() {
    const inner = document.getElementById('previewContent').innerHTML;
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0} body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact} @page{size:A4;margin:0}</style></head><body>${inner}</body></html>`;
}

async function downloadPDF() {
    const docNumber = document.getElementById('docNumber')?.value||'facture';
    generatePreviewHTML();
    const html = buildFullHTML();
    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename: `${docNumber}.pdf` });
        if (result.success) { showToast('✅ PDF enregistré','success'); closePreview(); }
        else if (!result.canceled) showToast('Erreur PDF','error');
    } catch (e) { showToast('Erreur PDF: '+e.message,'error'); }
    finally { hideLoading(); }
}

async function printDocument() {
    generatePreviewHTML();
    const html = buildFullHTML();
    showLoading("Ouverture de l'impression...");
    try {
        const result = await window.electronAPI.printPDF({ html });
        if (!result.success && result.error) showToast('Erreur impression: '+result.error,'error');
    } catch (e) { showToast('Erreur impression: '+e.message,'error'); }
    finally { hideLoading(); }
}

async function downloadDocPDF(docId) {
    const doc = allDocuments.find(d => d.id===docId);
    if (!doc) return;
    const savedEditingId = editingDocId;
    editingDocId = docId;
    populateFormWithDoc(doc);
    generatePreviewHTML();
    const html = buildFullHTML();
    const filename = `${doc.number}.pdf`;
    editingDocId = savedEditingId;
    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename });
        if (result.success) showToast('✅ PDF enregistré: '+result.path,'success');
    } catch (e) { showToast('Erreur PDF: '+e.message,'error'); }
    finally { hideLoading(); }
}

function collectDocumentData() {
    const get = id => document.getElementById(id)?.value||'';
    const items = [];
    for (let i=1;i<=itemCount;i++) {
        const desc = document.getElementById(`desc${i}`)?.value.trim();
        if (!desc) continue;
        const qty=parseFloat(document.getElementById(`qty${i}`)?.value)||0;
        const price=parseFloat(document.getElementById(`price${i}`)?.value)||0;
        const tva=parseFloat(document.getElementById(`tva${i}`)?.value)||0;
        items.push({ description:desc, quantity:qty, price, tva, total:qty*price });
    }
    let totalHTRaw=0, tva19=0, tva13=0, tva7=0;
    items.forEach(item => {
        totalHTRaw+=item.total;
        if (item.tva===19) tva19+=item.total*0.19;
        else if (item.tva===13) tva13+=item.total*0.13;
        else if (item.tva===7)  tva7+=item.total*0.07;
    });
    const totalTTCRaw = totalHTRaw+tva19+tva13+tva7+timbreAmount;
    const totalTTCRounded = roundValue(totalTTCRaw);
    const roundingAdjustment = parseFloat((totalTTCRounded-totalTTCRaw).toFixed(10));
    return {
        id: editingDocId||undefined,
        userId: currentUser.id,
        type: currentDocType,
        number: get('docNumber'),
        date: get('docDate'),
        dueDate: get('docDueDate')||null,
        currency: get('docCurrency')||'TND',
        paymentMode: get('docPayment'),
        companyName: get('docCompanyName'), companyMF: get('docCompanyMF'),
        companyAddress: get('docCompanyAddress'), companyPhone: get('docCompanyPhone'),
        companyEmail: get('docCompanyEmail'), companyRC: get('docCompanyRC'),
        clientName: get('docClientName'), clientMF: get('docClientMF'),
        clientAddress: get('docClientAddress'), clientPhone: get('docClientPhone'), clientEmail: get('docClientEmail'),
        items,
        applyTimbre: document.getElementById('applyTimbre').checked,
        timbreAmount, roundingAdjustment,
        totalHT: roundValue(totalHTRaw), totalTTC: totalTTCRounded,
        logoImage, stampImage, signatureImage,
        notes: get('docNotes')
    };
}

function resetDocumentForm() {
    ['docClientName','docClientMF','docClientAddress','docClientPhone','docClientEmail','docNotes'].forEach(id => document.getElementById(id).value='');
    document.getElementById('applyTimbre').checked = false;
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0; editingDocId = null;
    initNewDocument();
}

// ==================== DOCUMENT MANAGEMENT ====================
async function loadDocuments() {
    try { allDocuments = await window.electronAPI.getDocuments(currentUser.id); renderDocumentsTable(allDocuments); }
    catch { showToast('Erreur chargement documents','error'); }
}

function renderDocumentsTable(docs) {
    const container = document.getElementById('allDocsTable');
    if (!docs.length) { container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">📄</div><h3>Aucun document</h3><p>Créez votre premier document pour commencer</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>N°</th><th>Client</th><th>Date</th><th>Total TTC</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
        ${docs.map(doc=>`<tr>
            <td><span class="badge badge-${doc.type}">${doc.type.toUpperCase()}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${doc.number}</td>
            <td>${escapeHtml(doc.clientName)}</td>
            <td>${formatDate(doc.date)}</td>
            <td style="font-weight:600">${formatAmount(doc.totalTTC)} ${doc.currency}</td>
            <td>${renderPaymentBadge(doc)}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"    onclick="viewDocument('${doc.id}')"      title="Aperçu">👁️</button>
                ${doc.type==='devis'?`<button class="btn-icon btn-convert" onclick="convertToInvoice('${doc.id}')" title="Convertir">🔄</button>`:''}
                <button class="btn-icon btn-edit"    onclick="editExistingDoc('${doc.id}')"   title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"     onclick="downloadDocPDF('${doc.id}')"    title="PDF">📄</button>
                ${doc.type==='facture'?`<button class="btn-icon btn-payment" onclick="openPaymentModal('${doc.id}')" title="Paiement" style="color:#10b981">💰</button>`:''}
                <button class="btn-icon btn-delete"  onclick="confirmDeleteDoc('${doc.id}')"  title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function filterDocuments() {
    const search = document.getElementById('searchDocs').value.toLowerCase();
    const type   = document.getElementById('filterType').value;
    const status = document.getElementById('filterPaymentStatus')?.value || '';
    const filtered = allDocuments.filter(doc => {
        const matchSearch = !search || doc.number.toLowerCase().includes(search) || doc.clientName.toLowerCase().includes(search);
        const matchType   = !type   || doc.type === type;
        const matchStatus = !status || doc.paymentStatus === status;
        return matchSearch && matchType && matchStatus;
    });
    renderDocumentsTable(filtered);
}

async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id===docId);
    if (!doc) return;
    populateFormWithDoc(doc);
    generatePreviewHTML();
    document.getElementById('previewModal').classList.add('active');
}

async function editExistingDoc(docId) {
    const doc = allDocuments.find(d => d.id===docId);
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
            if (result.success) { showToast('Document mis à jour','success'); resetDocumentForm(); navigateTo('documents'); }
        } catch { showToast('Erreur lors de la mise à jour','error'); }
        finally { hideLoading(); }
    };
    navigateTo('new-document');
    showToast('Mode édition activé','info');
}

function populateFormWithDoc(doc) {
    currentDocType = doc.type;
    document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === doc.type);
    updateDocType();
    const fields = { docCompanyName:doc.companyName, docCompanyMF:doc.companyMF, docCompanyAddress:doc.companyAddress, docCompanyPhone:doc.companyPhone, docCompanyEmail:doc.companyEmail, docCompanyRC:doc.companyRC, docClientName:doc.clientName, docClientMF:doc.clientMF, docClientAddress:doc.clientAddress, docClientPhone:doc.clientPhone, docClientEmail:doc.clientEmail, docNumber:doc.number, docDate:doc.date, docDueDate:doc.dueDate, docCurrency:doc.currency||'TND', docPayment:doc.paymentMode||'Virement bancaire', docNotes:doc.notes };
    Object.entries(fields).forEach(([id,val]) => { const el = document.getElementById(id); if (el) el.value = val||''; });
    document.getElementById('applyTimbre').checked = doc.applyTimbre || false;
    logoImage      = doc.logoImage      || logoImage      || null;
    stampImage     = doc.stampImage     || stampImage     || null;
    signatureImage = doc.signatureImage || signatureImage || null;
    document.getElementById('itemsBody').innerHTML = ''; itemCount = 0;
    (doc.items||[]).forEach(item => {
        itemCount++;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;color:var(--gray-500);font-size:0.82rem">${itemCount}</td>
            <td><input type="text" class="item-input" id="desc${itemCount}" value="${escapeHtml(item.description)}" placeholder="Description..."></td>
            <td><input type="number" class="item-input" id="qty${itemCount}" value="${item.quantity}" min="0.001" step="0.001" onchange="calculateTotals()"></td>
            <td><input type="number" class="item-input" id="price${itemCount}" value="${item.price}" min="0" step="0.001" onchange="calculateTotals()"></td>
            <td><select class="tva-select" id="tva${itemCount}" onchange="calculateTotals()">
                <option value="19" ${item.tva===19?'selected':''}>19%</option>
                <option value="13" ${item.tva===13?'selected':''}>13%</option>
                <option value="7"  ${item.tva===7 ?'selected':''}>7%</option>
                <option value="0"  ${item.tva===0 ?'selected':''}>0%</option>
            </select></td>
            <td style="text-align:right;font-weight:500" id="total${itemCount}">${formatAmount(item.quantity*item.price)}</td>
            <td><button type="button" class="btn-icon btn-delete" onclick="removeItem(this)">🗑️</button></td>`;
        document.getElementById('itemsBody').appendChild(tr);
    });
    calculateTotals();
}

async function convertToInvoice(docId) {
    const doc = allDocuments.find(d => d.id===docId);
    if (!doc) return;
    showConfirm('🔄 Convertir en Facture', `Convertir le devis ${doc.number} en facture ?`, async () => {
        showLoading('Conversion...');
        try {
            const result = await window.electronAPI.convertDocument({ sourceId: docId, targetType: 'facture', userId: currentUser.id, year: new Date().getFullYear() });
            if (result.success) { showToast('Devis converti en facture','success'); await loadDocuments(); navigateTo('documents'); }
        } catch { showToast('Erreur de conversion','error'); }
        finally { hideLoading(); }
    }, 'Convertir', 'btn-primary');
}

async function confirmDeleteDoc(docId) {
    const doc = allDocuments.find(d => d.id===docId);
    showConfirm('🗑️ Supprimer', `Supprimer définitivement ${doc?.number} ?`, async () => {
        showLoading('Suppression...');
        try {
            const result = await window.electronAPI.deleteDocument(docId);
            if (result.success) { showToast('Document supprimé','info'); await loadDocuments(); await loadDashboard(); }
        } catch { showToast('Erreur lors de la suppression','error'); }
        finally { hideLoading(); }
    });
}

async function exportAllToExcel() {
    try { const result = await window.electronAPI.exportExcelDocuments({ documents: allDocuments }); if (result.success) showToast(`Excel exporté: ${result.path}`,'success'); }
    catch { showToast('Erreur export Excel','error'); }
}

// ==================== CLIENTS ====================
async function loadClients() {
    try { allClients = await window.electronAPI.getClients(currentUser.id); renderClientsTable(allClients); }
    catch { showToast('Erreur chargement clients','error'); }
}

function renderClientsTable(clients) {
    const container = document.getElementById('clientsTable');
    if (!clients.length) { container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">👥</div><h3>Aucun client</h3><p>Ajoutez votre premier client</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th>Nom</th><th>MF</th><th>Téléphone</th><th>Email</th><th>Actions</th></tr></thead><tbody>
        ${clients.map(c=>`<tr>
            <td style="font-weight:600">${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.mf)||'—'}</td>
            <td>${escapeHtml(c.phone)||'—'}</td>
            <td>${escapeHtml(c.email)||'—'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-delete" onclick="confirmDeleteClient('${c.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function filterClients() {
    const q = document.getElementById('searchClients').value.toLowerCase();
    renderClientsTable(allClients.filter(c => c.name.toLowerCase().includes(q)||(c.mf&&c.mf.toLowerCase().includes(q))||(c.email&&c.email.toLowerCase().includes(q))));
}

function confirmDeleteClient(clientId) {
    const client = allClients.find(c => c.id===clientId);
    showConfirm('🗑️ Supprimer', `Supprimer "${client?.name}" ?`, async () => {
        try { await window.electronAPI.deleteClient(clientId); showToast('Client supprimé','info'); await loadClients(); await loadClientsDropdown(); }
        catch { showToast('Erreur suppression','error'); }
    });
}

async function exportClientsToExcel() {
    try { const result = await window.electronAPI.exportExcelClients({ clients: allClients }); if (result.success) showToast(`Excel exporté: ${result.path}`,'success'); }
    catch { showToast('Erreur export Excel','error'); }
}

// ==================== COMPANY ====================
async function loadCompanyPage() {
    try {
        const c = await window.electronAPI.getCompany(currentUser.id)||{};
        const fields = { companyName:c.name||currentUser.company||'', companyMF:c.mf||currentUser.mf||'', companyAddress:c.address||'', companyPhone:c.phone||'', companyEmail:c.email||'', companyRC:c.rc||'', companyWebsite:c.website||'', companyBank:c.bank||'' };
        Object.entries(fields).forEach(([id,val]) => { const el=document.getElementById(id); if(el) el.value=val; });
        document.getElementById('companyProfileName').textContent = c.name||currentUser.company||'Votre Entreprise';
        document.getElementById('companyProfileMF').textContent   = (c.mf||currentUser.mf)?`Matricule Fiscal: ${c.mf||currentUser.mf}`:'Matricule Fiscal: —';
        const loadImg = (data,prevId,phId,boxId) => {
            const pv=document.getElementById(prevId), ph=document.getElementById(phId), bx=document.getElementById(boxId);
            if (data&&pv) { pv.src=data; pv.classList.remove('hidden'); if(ph)ph.classList.add('hidden'); if(bx)bx.classList.add('has-image'); }
            else if (pv) { pv.src=''; pv.classList.add('hidden'); if(ph)ph.classList.remove('hidden'); if(bx)bx.classList.remove('has-image'); }
        };
        loadImg(c.logo_image,'companyLogoPreview','companyLogoPlaceholder','companyLogoBox');
        loadImg(c.stamp_image,'companyStampPreview','companyStampPlaceholder','companyStampBox');
        loadImg(c.signature_image,'companySignaturePreview','companySignaturePlaceholder','companySignatureBox');
        if (c.logo_image)      logoImage      = c.logo_image;
        if (c.stamp_image)     stampImage     = c.stamp_image;
        if (c.signature_image) signatureImage = c.signature_image;
    } catch (e) { console.error('Error loading company:',e); }
}

async function saveCompanySettings() {
    const get = id => document.getElementById(id).value.trim();
    const settings = { userId:currentUser.id, name:get('companyName'), mf:get('companyMF'), address:get('companyAddress'), phone:get('companyPhone'), email:get('companyEmail'), rc:get('companyRC'), website:get('companyWebsite'), bank:get('companyBank'), logoImage, stampImage, signatureImage };
    try { await window.electronAPI.saveCompany(settings); showToast('Informations entreprise enregistrées','success'); await loadCompanyPage(); }
    catch { showToast("Erreur d'enregistrement",'error'); }
}

// ==================== BACKUP ====================
async function loadSettings() {
    try {
        const settings = await window.electronAPI.getBackupSettings();
        document.getElementById('backupEnabled').checked  = settings.enabled   ||false;
        document.getElementById('backupFrequency').value  = settings.frequency ||'daily';
        document.getElementById('backupTime').value       = settings.time      ||'02:00';
        document.getElementById('backupKeep').value       = settings.keepCount ||10;
        await loadBackupList();
    } catch {}
}

async function loadBackupList() {
    try {
        const backups = await window.electronAPI.getBackupList();
        const container = document.getElementById('backupList');
        if (!backups?.length) { container.innerHTML='<p style="color:#6b7280;font-size:0.9rem">Aucune sauvegarde disponible</p>'; return; }
        container.innerHTML = backups.map(b=>`
            <div class="backup-item">
                <div class="backup-item-info">
                    <div class="backup-date">${new Date(b.created).toLocaleString('fr-FR')}</div>
                    <div class="backup-size">${(b.size/1024/1024).toFixed(2)} MB</div>
                </div>
                <button class="btn btn-small btn-secondary" onclick="restoreBackup('${b.path}')">Restaurer</button>
            </div>`).join('');
    } catch {}
}

async function saveBackupSettings() {
    const settings = { enabled: document.getElementById('backupEnabled').checked, frequency: document.getElementById('backupFrequency').value, time: document.getElementById('backupTime').value, keepCount: parseInt(document.getElementById('backupKeep').value)||10 };
    try { await window.electronAPI.saveBackupSettings(settings); showToast('Paramètres de sauvegarde enregistrés','success'); }
    catch { showToast("Erreur d'enregistrement",'error'); }
}

async function createManualBackup() {
    showLoading('Création de la sauvegarde...');
    try { const result = await window.electronAPI.createManualBackup(); if (result.success) { showToast('Sauvegarde créée','success'); await loadBackupList(); } }
    catch { showToast('Erreur de sauvegarde','error'); }
    finally { hideLoading(); }
}

async function restoreBackup(backupPath) {
    showConfirm('📤 Restaurer','Cela remplacera toutes les données actuelles. Continuer ?', async () => {
        showLoading('Restauration...');
        try { const result = await window.electronAPI.restoreBackup(backupPath); if (result.success) { showToast('Restauration terminée. Redémarrage...','success'); setTimeout(()=>location.reload(),2000); } }
        catch { showToast('Erreur de restauration','error'); }
        finally { hideLoading(); }
    }, 'Restaurer', 'btn-warning');
}

// ==================== THEME SETTINGS (legacy per-type colours) ====================
let currentTheme = {
    fontFamily: "'Segoe UI', sans-serif", fontSize: "14px",
    titles: { facture:{text:"FACTURE",color:"#1e3a8a"}, devis:{text:"DEVIS",color:"#92400e"}, bon:{text:"BON DE COMMANDE",color:"#065f46"} }
};

async function loadThemeSettings() {
    if (!currentUser) return;
    try {
        const settings = await window.electronAPI.getThemeSettings(currentUser.id);
        if (settings) { currentTheme = {...currentTheme,...settings}; applyThemeToUI(); updateThemePreview(); }
    } catch {}
}

function applyThemeToUI() {
    document.getElementById('docFontFamily').value       = currentTheme.fontFamily;
    document.getElementById('docFontSize').value         = currentTheme.fontSize;
    document.getElementById('titleFacture').value        = currentTheme.titles.facture.text;
    document.getElementById('colorFacture').value        = currentTheme.titles.facture.color;
    document.getElementById('colorFactureHex').textContent = currentTheme.titles.facture.color;
    document.getElementById('titleDevis').value          = currentTheme.titles.devis.text;
    document.getElementById('colorDevis').value          = currentTheme.titles.devis.color;
    document.getElementById('colorDevisHex').textContent = currentTheme.titles.devis.color;
    document.getElementById('titleBon').value            = currentTheme.titles.bon.text;
    document.getElementById('colorBon').value            = currentTheme.titles.bon.color;
    document.getElementById('colorBonHex').textContent   = currentTheme.titles.bon.color;
}

function updateThemePreview() {
    ['Facture','Devis','Bon'].forEach(n => {
        const id = n === 'Bon' ? 'colorBon' : `color${n}`;
        document.getElementById(id+'Hex').textContent = document.getElementById(id).value;
    });
    const font=document.getElementById('docFontFamily').value, size=document.getElementById('docFontSize').value;
    document.getElementById('themePreview').innerHTML = `
        <div style="font-family:${font};font-size:${size}">
            <div style="background:${document.getElementById('colorFacture').value};color:white;padding:10px 20px;border-radius:8px;display:inline-block;margin:5px;font-weight:bold">${document.getElementById('titleFacture').value}</div>
            <div style="background:${document.getElementById('colorDevis').value};color:white;padding:10px 20px;border-radius:8px;display:inline-block;margin:5px;font-weight:bold">${document.getElementById('titleDevis').value}</div>
            <div style="background:${document.getElementById('colorBon').value};color:white;padding:10px 20px;border-radius:8px;display:inline-block;margin:5px;font-weight:bold">${document.getElementById('titleBon').value}</div>
            <p style="margin-top:15px;color:#374151">Exemple de texte avec la police sélectionnée</p>
        </div>`;
}

async function saveThemeSettings() {
    const themeData = {
        fontFamily: document.getElementById('docFontFamily').value,
        fontSize: document.getElementById('docFontSize').value,
        titles: {
            facture: { text: document.getElementById('titleFacture').value, color: document.getElementById('colorFacture').value },
            devis:   { text: document.getElementById('titleDevis').value,   color: document.getElementById('colorDevis').value   },
            bon:     { text: document.getElementById('titleBon').value,     color: document.getElementById('colorBon').value     }
        }
    };
    try { await window.electronAPI.saveThemeSettings({ userId: currentUser.id, theme: themeData }); currentTheme = themeData; showToast('Thème enregistré','success'); }
    catch { showToast('Erreur','error'); }
}

function resetThemeDefaults() {
    document.getElementById('docFontFamily').value='\'Segoe UI\', sans-serif'; document.getElementById('docFontSize').value='14px';
    document.getElementById('titleFacture').value='FACTURE'; document.getElementById('colorFacture').value='#1e3a8a';
    document.getElementById('titleDevis').value='DEVIS'; document.getElementById('colorDevis').value='#92400e';
    document.getElementById('titleBon').value='BON DE COMMANDE'; document.getElementById('colorBon').value='#065f46';
    updateThemePreview();
}

// ==================== DOCUMENT VISUAL THEME SETTINGS ====================
function loadDocumentThemeSettings() {
    const t = currentDocumentTheme || DEFAULT_THEMES.modern;
    // Set preset active button
    document.querySelectorAll('.theme-preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === t.id);
    });
    // Fill customizer fields
    const setVal = (id, val) => { const el=document.getElementById(id); if(el) el.value=val||''; };
    setVal('themeColorPrimary',   t.colors.primary);
    setVal('themeColorSecondary', t.colors.secondary);
    setVal('themeColorBg',        t.colors.bg);
    setVal('themeColorSurface',   t.colors.surface);
    setVal('themeColorBorder',    t.colors.border);
    setVal('themeHeaderFont',     t.fonts.header);
    setVal('themeBodyFont',       t.fonts.body);
    setVal('themeFontSize',       t.fonts.size);
    setVal('themeHeaderStyle',    t.headerStyle);
    setVal('themeTableStyle',     t.tableStyle);
    setVal('themeFooterLayout',   t.footerLayout);
    const setChk = (id, val) => { const el=document.getElementById(id); if(el) el.checked=val; };
    setChk('themeShowLogo',      t.showLogo);
    setChk('themeShowStamp',     t.showStamp);
    setChk('themeShowSignature', t.showSignature);
    setChk('themeShowQrCode',    t.showQrCode);
    setChk('themeAccentLine',    t.accentLine);
    updateDocumentThemePreview();
}

function applyPresetTheme(themeId) {
    const preset = DEFAULT_THEMES[themeId];
    if (!preset) return;
    currentDocumentTheme = JSON.parse(JSON.stringify(preset));
    loadDocumentThemeSettings();
    showToast(`Thème "${preset.label}" appliqué`,'success');
}

function updateDocumentThemePreview() {
    const previewEl = document.getElementById('docThemePreview');
    if (!previewEl) return;
    const primary   = document.getElementById('themeColorPrimary')?.value   || '#1e3a8a';
    const secondary = document.getElementById('themeColorSecondary')?.value || '#334155';
    const bg        = document.getElementById('themeColorBg')?.value        || '#ffffff';
    const surface   = document.getElementById('themeColorSurface')?.value   || '#f8fafc';
    const border    = document.getElementById('themeColorBorder')?.value    || '#e2e8f0';
    const hFont     = document.getElementById('themeHeaderFont')?.value     || 'sans-serif';
    const bFont     = document.getElementById('themeBodyFont')?.value       || 'sans-serif';
    const hStyle    = document.getElementById('themeHeaderStyle')?.value    || 'left';
    const tableStyle= document.getElementById('themeTableStyle')?.value     || 'bordered';
    const accent    = document.getElementById('themeAccentLine')?.checked;

    previewEl.innerHTML = `
        <div style="font-family:${bFont};color:${secondary};background:${bg};padding:20px;border:1px solid ${border};border-radius:6px;font-size:12px">
            ${accent?`<div style="height:3px;background:linear-gradient(90deg,${primary},${primary}88);margin-bottom:12px"></div>`:''}
            <div style="display:flex;justify-content:${hStyle==='center'?'center':hStyle==='right'?'flex-end':'space-between'};align-items:flex-start;margin-bottom:12px">
                <div>
                    <div style="font-family:${hFont};font-size:18px;font-weight:700;color:${primary}">FACTURE</div>
                    <div style="width:30px;height:2px;background:${primary};margin-top:4px"></div>
                    <div style="font-size:10px;color:${secondary};margin-top:4px;font-weight:600">Entreprise SARL</div>
                </div>
                <div style="text-align:right;font-size:10px;color:${secondary}">
                    <div><strong># FAC-2026-001</strong></div><div>Date: 17/04/2026</div>
                </div>
            </div>
            <div style="font-size:10px;background:${tableStyle==='striped'?surface:'transparent'};padding:4px 6px;border:${tableStyle==='bordered'?`1px solid ${border}`:'none'};border-bottom:2px solid ${primary}">
                <strong style="color:${primary}">Description</strong>&nbsp;&nbsp;
                <strong style="color:${primary}">Qté</strong>&nbsp;&nbsp;
                <strong style="color:${primary}">Total</strong>
            </div>
            <div style="font-size:10px;padding:4px 6px;border:${tableStyle==='bordered'?`1px solid ${border}`:'none'};border-top:none;background:${surface}">Prestation de service&nbsp;&nbsp;1&nbsp;&nbsp;1,000.000</div>
            <div style="text-align:right;margin-top:8px;font-size:11px;font-weight:700;color:${primary}">Total TTC: 1,190.000 TND</div>
        </div>`;
}

async function saveDocumentTheme() {
    const getVal = id => { const el=document.getElementById(id); return el?el.value:''; };
    const getChk = id => { const el=document.getElementById(id); return el?el.checked:false; };
    const theme = {
        id: 'custom', label: 'Personnalisé', icon: '🎨',
        colors: {
            primary:   getVal('themeColorPrimary'),
            secondary: getVal('themeColorSecondary'),
            accent:    getVal('themeColorPrimary'),
            bg:        getVal('themeColorBg'),
            surface:   getVal('themeColorSurface'),
            border:    getVal('themeColorBorder'),
            text:      '#1e293b', textLight: '#64748b'
        },
        fonts: { header: getVal('themeHeaderFont'), body: getVal('themeBodyFont'), size: getVal('themeFontSize') },
        headerStyle:  getVal('themeHeaderStyle'),
        tableStyle:   getVal('themeTableStyle'),
        footerLayout: getVal('themeFooterLayout'),
        showLogo:      getChk('themeShowLogo'),
        showStamp:     getChk('themeShowStamp'),
        showSignature: getChk('themeShowSignature'),
        showQrCode:    getChk('themeShowQrCode'),
        accentLine:    getChk('themeAccentLine'),
        borderRadius: '4px'
    };
    try {
        await window.electronAPI.saveDocumentTheme({ userId: currentUser.id, theme });
        currentDocumentTheme = theme;
        showToast('Thème de document enregistré','success');
    } catch { showToast('Erreur sauvegarde thème','error'); }
}

// ==================== CONTRACTS ====================
const CONTRACT_TYPES = {
    cdi:{label:'CDI',icon:'📋',desc:'Durée Indéterminée'},
    cdd:{label:'CDD',icon:'📄',desc:'Durée Déterminée'},
    essai:{label:"Période d'Essai",icon:'🔍',desc:"Contrat d'essai"},
    prestation:{label:'Prestation de service',icon:'🤝',desc:'Prestation de services'},
    alternance:{label:'Alternance',icon:'🎓',desc:"Contrat d'alternance"},
    stage:{label:'Stage',icon:'🏫',desc:'Convention de stage'},
    freelance:{label:'Freelance',icon:'💻',desc:'Indépendant'},
    interim:{label:'Intérim',icon:'⏱️',desc:'Mission intérimaire'},
    parttime:{label:'Temps partiel',icon:'⏰',desc:'À temps partiel'},
    consulting:{label:'Consulting',icon:'📊',desc:'Conseil & expertise'}
};

async function loadContracts() {
    if (!currentUser) return;
    try { allContracts = await window.electronAPI.getContracts(currentUser.id); renderContractsTable(allContracts); }
    catch { showToast('Erreur chargement contrats','error'); }
}

function renderContractsTable(contracts) {
    const container = document.getElementById('contractsTable');
    if (!contracts?.length) { container.innerHTML=`<div class="empty-state"><div class="empty-state-icon">📃</div><h3>Aucun contrat</h3><p>Créez votre premier contrat en choisissant un type ci-dessus</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>Numéro</th><th>Salarié / Prestataire</th><th>Employeur</th><th>Date début</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
        ${contracts.map(c=>`<tr>
            <td><span class="badge badge-contract">${CONTRACT_TYPES[c.type]?.label||c.type}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${c.number}</td>
            <td style="font-weight:600">${escapeHtml(c.employeeName)||'—'}</td>
            <td>${escapeHtml(c.employerName)||'—'}</td>
            <td>${formatDate(c.startDate)}</td>
            <td><span class="badge badge-${c.status==='signé'?'active':'pending'}">${c.status||'brouillon'}</span></td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="previewContract('${c.id}')"      title="Aperçu">👁️</button>
                <button class="btn-icon btn-edit"   onclick="editContract('${c.id}')"         title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadContractPDF('${c.id}')"  title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteContract('${c.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function openNewContractModal(type) {
    editingContractId = null;
    document.getElementById('contractType').value = type;
    document.getElementById('contractModalTitle').textContent = `${CONTRACT_TYPES[type]?.icon||'📄'} ${CONTRACT_TYPES[type]?.label||type}`;
    window.electronAPI.getCompany(currentUser.id).then(c => {
        if (c) { document.getElementById('cEmployerName').value=c.name||''; document.getElementById('cEmployerMF').value=c.mf||''; document.getElementById('cEmployerAddress').value=c.address||''; }
    }).catch(()=>{});
    const showEnd = ['cdd','essai','prestation','freelance','stage','consulting','alternance','interim'].includes(type);
    document.getElementById('cEndDateGroup').style.display  = showEnd?'block':'none';
    document.getElementById('cTrialGroup').style.display    = ['cdi','parttime'].includes(type)?'block':'none';
    ['cEmployeeeName','cEmployeeCIN','cEmployeeAddress','cEmployeeRole','cEmployeeDept','cEmployerRep','cEmployerRepRole','cStartDate','cEndDate','cSalary','cWorkLocation','cNoticePeriod','cTrialDuration','cExtraClauses','cNotes'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('cSalaryType').value='mensuel'; document.getElementById('cWorkHours').value='40'; document.getElementById('cTrialPeriod').checked=false;
    document.getElementById('contractModal').classList.add('active');
}

function closeContractModal() { document.getElementById('contractModal').classList.remove('active'); editingContractId=null; }

async function saveContract() {
    const employeeName = document.getElementById('cEmployeeeName').value.trim();
    const employerName = document.getElementById('cEmployerName').value.trim();
    if (!employeeName||!employerName) { showToast('Employeur et Salarié sont requis','warning'); return; }
    const data = {
        id: editingContractId||undefined, userId: currentUser.id,
        type: document.getElementById('contractType').value,
        employerName, employerMF: document.getElementById('cEmployerMF').value.trim(), employerAddress: document.getElementById('cEmployerAddress').value.trim(),
        employerRep: document.getElementById('cEmployerRep').value.trim(), employerRepRole: document.getElementById('cEmployerRepRole').value.trim(),
        employeeName, employeeCIN: document.getElementById('cEmployeeCIN').value.trim(), employeeAddress: document.getElementById('cEmployeeAddress').value.trim(),
        employeeRole: document.getElementById('cEmployeeRole').value.trim(), employeeDepartment: document.getElementById('cEmployeeDept').value.trim(),
        startDate: document.getElementById('cStartDate').value, endDate: document.getElementById('cEndDate').value||null,
        salary: parseFloat(document.getElementById('cSalary').value)||null, salaryType: document.getElementById('cSalaryType').value,
        workHours: parseFloat(document.getElementById('cWorkHours').value)||40, workLocation: document.getElementById('cWorkLocation').value.trim(),
        trialPeriod: document.getElementById('cTrialPeriod').checked, trialDuration: document.getElementById('cTrialDuration').value.trim(),
        noticePeriod: document.getElementById('cNoticePeriod').value.trim(), extraClauses: document.getElementById('cExtraClauses').value.trim(),
        notes: document.getElementById('cNotes').value.trim(), status: 'brouillon', employerLogo: logoImage||null
    };
    try {
        const result = await window.electronAPI.saveContract(data);
        if (result.success) { showToast(editingContractId?'Contrat mis à jour':'Contrat créé','success'); closeContractModal(); await loadContracts(); }
        else showToast(result.error||'Erreur','error');
    } catch (e) { showToast('Erreur: '+e.message,'error'); }
}

async function editContract(id) {
    const c = allContracts.find(x=>x.id===id);
    if (!c) return;
    editingContractId = id;
    document.getElementById('contractType').value = c.type;
    document.getElementById('contractModalTitle').textContent = `✏️ Modifier — ${CONTRACT_TYPES[c.type]?.label||c.type}`;
    document.getElementById('cEndDateGroup').style.display = ['cdd','essai','prestation','freelance','stage','consulting','alternance','interim'].includes(c.type)?'block':'none';
    document.getElementById('cTrialGroup').style.display   = ['cdi','parttime'].includes(c.type)?'block':'none';
    const fields = { cEmployerName:c.employerName, cEmployerMF:c.employerMF, cEmployerAddress:c.employerAddress, cEmployerRep:c.employerRep, cEmployerRepRole:c.employerRepRole, cEmployeeeName:c.employeeName, cEmployeeCIN:c.employeeCIN, cEmployeeAddress:c.employeeAddress, cEmployeeRole:c.employeeRole, cEmployeeDept:c.employeeDepartment, cStartDate:c.startDate, cEndDate:c.endDate, cSalary:c.salary, cWorkHours:c.workHours, cWorkLocation:c.workLocation, cNoticePeriod:c.noticePeriod, cTrialDuration:c.trialDuration, cExtraClauses:c.extraClauses, cNotes:c.notes };
    Object.entries(fields).forEach(([id,val]) => { const el=document.getElementById(id); if(el) el.value=val||''; });
    document.getElementById('cSalaryType').value = c.salaryType||'mensuel';
    document.getElementById('cTrialPeriod').checked = c.trialPeriod||false;
    document.getElementById('contractModal').classList.add('active');
}

function buildContractHTMLFromData(c) {
    if (typeof window.buildContractHTML === 'function') return window.buildContractHTML({ ...c, employerLogo: logoImage });
    return `<p>Contrat: ${c.number}</p>`;
}

async function previewContract(id) {
    const c = allContracts.find(x=>x.id===id);
    if (!c) return;
    const html = buildContractHTMLFromData(c);
    document.getElementById('previewContent').innerHTML = `<div style="padding:40px;font-family:serif">${html.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i,'').replace(/<\/body>[\s\S]*?<\/html>/i,'')}</div>`;
    document.getElementById('previewModal').classList.add('active');
}

async function downloadContractPDF(id) {
    const c = allContracts.find(x=>x.id===id);
    if (!c) return;
    const html = buildContractHTMLFromData(c);
    const filename = `${c.number}-${(c.employeeName||'contrat').replace(/\s+/g,'-')}.pdf`;
    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename });
        if (result.success) showToast('✅ Contrat PDF enregistré','success');
        else if (!result.canceled) showToast('Erreur PDF','error');
    } catch (e) { showToast('Erreur PDF: '+e.message,'error'); }
    finally { hideLoading(); }
}

function confirmDeleteContract(id) {
    const c = allContracts.find(x=>x.id===id);
    showConfirm('🗑️ Supprimer', `Supprimer le contrat ${c?.number} ?`, async () => {
        try { await window.electronAPI.deleteContract(id); showToast('Contrat supprimé','info'); await loadContracts(); }
        catch { showToast('Erreur suppression','error'); }
    });
}

function filterContracts() {
    const q = document.getElementById('searchContracts').value.toLowerCase();
    const type = document.getElementById('filterContractType').value;
    renderContractsTable(allContracts.filter(c => {
        const mQ = !q||(c.employeeName||'').toLowerCase().includes(q)||(c.number||'').toLowerCase().includes(q);
        const mT = !type||c.type===type;
        return mQ&&mT;
    }));
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
    try { return new Date(dateStr).toLocaleDateString('fr-FR'); } catch { return dateStr; }
}

function getDocTypeLabel(type) { return currentTheme.titles[type]?.text || type.toUpperCase(); }
function getDocTypeColor(type) { return currentTheme.titles[type]?.color || '#1e3a8a'; }