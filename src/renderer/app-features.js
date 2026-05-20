




// ==================== DOCUMENT VISUAL THEME ====================
let currentDocumentTheme = null; // full theme object from themes.js THEMES
let docNumberManuallySet = false; // tracks if user manually edited the doc number field

const DEFAULT_THEMES = {
    classic: {
        id: 'classic', label: 'Classique', icon: '📜',
        colors: { primary: '#1e3a8a', secondary: '#334155', accent: '#64748b', bg: '#ffffff', surface: '#f8fafc', border: '#e2e8f0', text: '#1e293b', textLight: '#64748b' },
        fonts: { header: "'Times New Roman', Times, serif", body: "'Times New Roman', Times, serif", size: '13px' },
        headerStyle: 'left', tableStyle: 'bordered', footerLayout: 'two-columns',
        showLogo: true, showStamp: true, showSignature: true, showQrCode: false, accentLine: true, borderRadius: '0px'
    },
    modern: {
        id: 'modern', label: 'Moderne', icon: '✨',
        colors: { primary: '#0f172a', secondary: '#3b82f6', accent: '#06b6d4', bg: '#ffffff', surface: '#f0f9ff', border: '#bfdbfe', text: '#0f172a', textLight: '#6b7280' },
        fonts: { header: "'Inter', 'Segoe UI', sans-serif", body: "'Inter', 'Segoe UI', sans-serif", size: '13px' },
        headerStyle: 'center', tableStyle: 'striped', footerLayout: 'simple',
        showLogo: true, showStamp: false, showSignature: true, showQrCode: true, accentLine: false, borderRadius: '8px'
    },
    executive: {
        id: 'executive', label: 'Exécutif', icon: '👑',
        colors: { primary: '#b8942a', secondary: '#2c2c2c', accent: '#c6a43f', bg: '#fffdf5', surface: '#fdf8ec', border: '#e8d5a3', text: '#1a1a1a', textLight: '#6b5c3e' },
        fonts: { header: "'Georgia', serif", body: "'Lato', 'Helvetica Neue', sans-serif", size: '13px' },
        headerStyle: 'right', tableStyle: 'minimal', footerLayout: 'with-bank',
        showLogo: true, showStamp: true, showSignature: true, showQrCode: false, accentLine: true, borderRadius: '4px'
    },
    tunisian: {
        id: 'tunisian', label: 'Tunisien', icon: '🇹🇳',
        colors: { primary: '#7c1a1a', secondary: '#c17a54', accent: '#e87b2a', bg: '#fffbf7', surface: '#fdf5ee', border: '#f5cba7', text: '#2d1b0e', textLight: '#7c5c3e' },
        fonts: { header: "'Georgia', serif", body: "'Lato', 'Arial', sans-serif", size: '13px' },
        headerStyle: 'center', tableStyle: 'bordered', footerLayout: 'two-columns',
        showLogo: true, showStamp: true, showSignature: true, showQrCode: false, accentLine: true, borderRadius: '2px'
    }
};









// ==================== LOAD FORMAT SETTINGS ====================
async function loadUserFormatSettings() {
    try {
        const s = await window.electronAPI.getSettings(currentUser.id);
        currentDecimalPlaces = s.decimal_places ?? 3;
        currentRoundingMethod = s.rounding_method || 'half_up';
        currentSettings = s;
    } catch { }
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


// ==================== DASHBOARD ====================
async function loadDashboard() {
    try {
        const stats = await window.electronAPI.getStats(currentUser.id);

        // Basic stats
        document.getElementById('statTotalDocs').textContent = stats.totalDocs || 0;
        document.getElementById('statTotalRevenue').textContent = formatAmount(stats.totalRevenue || 0) + ' TND';
        document.getElementById('statTotalClients').textContent = stats.totalClients || 0;
        const thisMonthEl = document.getElementById('statThisMonth');
        if (thisMonthEl) thisMonthEl.textContent = stats.thisMonth || 0;

        // Unpaid stats
        const unpaidEl = document.getElementById('statUnpaid');
        if (unpaidEl) unpaidEl.textContent = (stats.unpaidCount || 0) + ' (' + formatAmount(stats.unpaidTotal || 0) + ' TND)';

        // Expenses & Profit stats
        const expensesEl = document.getElementById('statTotalExpenses');
        if (expensesEl) expensesEl.textContent = formatAmount(stats.totalExpenses || 0) + ' TND';

        const profitEl = document.getElementById('statNetProfit');
        if (profitEl) profitEl.textContent = formatAmount(stats.netProfit || 0) + ' TND';

        const result = await window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: 999999 });
        const docs = result.rows || [];
        renderRecentDocs(docs.slice(0, 6));
        renderDashboardCharts(stats);
        renderTopClients(stats.topClients || []);
        renderRecentActivity(stats.recentActivity || []);
        renderDashboardNotes();
    } catch (e) {
        console.error('Dashboard error:', e);
        showToast('Erreur tableau de bord', 'error');
    }
}

function renderRecentDocs(docs) {
    const container = document.getElementById('recentDocsTable');
    if (!docs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="file-text" class="lucide-sm"></i></div><h3>Aucun document</h3><p>Créez votre premier document</p></div>`; if (window.lucide) lucide.createIcons(); return; }
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
                ${doc.type === 'devis' ? `<button class="btn-icon btn-convert" onclick="convertToInvoice('${doc.id}')" title="Convertir">🔄</button>` : ''}
                <button class="btn-icon btn-edit"   onclick="editExistingDoc('${doc.id}')"  title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadDocPDF('${doc.id}')"   title="PDF"><i data-lucide="file-text" class="lucide-sm"></i></button>
                <button class="btn-icon btn-whatsapp" onclick="sendWhatsApp('${doc.id}')" title="WhatsApp">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDoc('${doc.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function renderPaymentBadge(doc) {
    if (doc.type !== 'facture') return '—';
    const status = doc.paymentStatus || 'unpaid';
    const map = { paid: '<i data-lucide="check-circle" class="lucide-sm"></i> Payée', partial: '<i data-lucide="clock" class="lucide-sm"></i> Partiel', unpaid: '<i data-lucide="x-circle" class="lucide-sm"></i> Impayée' };
    const cls = { paid: 'badge-paid', partial: 'badge-partial', unpaid: 'badge-unpaid' };
    return `<span class="badge ${cls[status] || 'badge-unpaid'}" onclick="openPaymentModal('${doc.id}')" style="cursor:pointer" title="Gérer paiement">${map[status] || status}</span>`;
}

let lastDashboardStats = null;

function renderDashboardCharts(stats) {
    lastDashboardStats = stats;
    renderRevenueChart(stats.monthlyRevenue || []);
    renderExpenseChart(stats.monthlyExpenses || []);
    renderTypeDonutChart(stats.typeBreakdown || []);
}

function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
    }
}


function renderRevenueChart(monthlyData) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    ctx.scale(ratio, ratio);
    const W = canvas.width / ratio, H = canvas.height / ratio;

    const months = [], values = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(d.toLocaleDateString('fr-FR', { month: 'short' }));
        const found = monthlyData.find(m => m.month === key);
        values.push(found ? parseFloat(found.revenue) : 0);
    }
    drawBarChart(ctx, W, H, months, values, currentDocumentTheme?.colors?.primary || '#3b82f6');
}

function renderExpenseChart(monthlyData) {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;
    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    ctx.scale(ratio, ratio);
    const W = canvas.width / ratio, H = canvas.height / ratio;

    const months = [], values = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(d.toLocaleDateString('fr-FR', { month: 'short' }));
        const found = monthlyData.find(m => m.month === key);
        values.push(found ? parseFloat(found.expense) : 0);
    }
    drawBarChart(ctx, W, H, months, values, '#ef4444');
}

function drawBarChart(ctx, W, H, labels, values, color) {
    const pad = { top: 30, right: 20, bottom: 40, left: 60 };
    const cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;
    const max = Math.max(...values, 1) * 1.1;

    ctx.clearRect(0, 0, W, H);
    // Grid & Y-Axis
    ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1;
    ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (cH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
        const val = max - (max / 4) * i;
        ctx.fillText(val >= 1000 ? (val / 1000).toFixed(1) + 'k' : Math.round(val), pad.left - 10, y + 4);
    }
    // Bars
    const gap = cW / labels.length;
    const barW = gap * 0.6;
    values.forEach((v, i) => {
        const x = pad.left + gap * i + (gap - barW) / 2;
        const bH = (v / max) * cH;
        const y = pad.top + cH - bH;

        const grad = ctx.createLinearGradient(0, y, 0, y + bH);
        grad.addColorStop(0, color); grad.addColorStop(1, color + '99');
        ctx.fillStyle = grad;

        if (ctx.roundRect) {
            ctx.beginPath(); ctx.roundRect(x, y, barW, bH, [4, 4, 0, 0]); ctx.fill();
        } else {
            ctx.fillRect(x, y, barW, bH);
        }

        // Labels
        ctx.fillStyle = '#4b5563'; ctx.textAlign = 'center'; ctx.font = '11px sans-serif';
        ctx.fillText(labels[i], x + barW / 2, pad.top + cH + 20);
        if (v > 0) {
            ctx.fillStyle = color; ctx.font = 'bold 11px sans-serif';
            ctx.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v), x + barW / 2, y - 8);
        }
    });
}


function renderTypeDonutChart(breakdown) {
    const canvas = document.getElementById('typeDonutChart');
    if (!canvas) return;
    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    ctx.scale(ratio, ratio);
    const W = canvas.width / ratio, H = canvas.height / ratio;

    const colors = { facture: '#3b82f6', devis: '#f59e0b', bon: '#10b981' };
    const labels = { facture: 'Factures', devis: 'Devis', bon: 'Bons' };
    const total = breakdown.reduce((s, b) => s + b.count, 0);
    const cx = W / 2, cy = H / 2 - 20, r = Math.min(W, H) * 0.35;

    ctx.clearRect(0, 0, W, H);
    if (total === 0) {
        ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9ca3af'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Aucun document', cx, cy + 4); return;
    }
    let start = -Math.PI / 2;
    breakdown.forEach(b => {
        const slice = (b.count / total) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + slice); ctx.closePath();
        ctx.fillStyle = colors[b.type] || '#6b7280'; ctx.fill(); start += slice;
    });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(total, cx, cy + 4);
    ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'; ctx.fillText('documents', cx, cy + 18);
    let ly = cy + r + 22;
    breakdown.forEach(b => {
        const lx = cx - 60;
        ctx.fillStyle = colors[b.type] || '#6b7280'; ctx.fillRect(lx, ly - 8, 12, 12);
        ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`${labels[b.type] || b.type}: ${b.count}`, lx + 16, ly + 2); ly += 18;
    });
}

function renderTopClients(topClients) {
    const el = document.getElementById('topClientsTable');
    if (!el) return;
    if (!topClients.length) { el.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;padding:12px">Aucune donnée</p>'; return; }
    const max = Math.max(...topClients.map(c => c.revenue), 1);
    el.innerHTML = topClients.map((c, i) => `
        <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px">
                <span style="font-weight:600;color:#374151">${i + 1}. ${escapeHtml(c.client_name)}</span>
                <span style="color:#6b7280">${formatAmount(c.revenue)} TND</span>
            </div>
            <div style="background:#e5e7eb;border-radius:4px;height:6px">
                <div style="background:${currentDocumentTheme?.colors?.primary || '#3b82f6'};width:${Math.round(c.revenue / max * 100)}%;height:6px;border-radius:4px"></div>
            </div>
        </div>`).join('');
}

function renderRecentActivity(activities) {
    const el = document.getElementById('recentActivityList');
    if (!el) return;
    const icons = { create_document: '<i data-lucide="file-text" class="lucide-sm"></i>', update_document: '<i data-lucide="edit" class="lucide-sm"></i>', create_client: '<i data-lucide="user" class="lucide-sm"></i>', default: '<i data-lucide="bell" class="lucide-sm"></i>' };
    const labels = { create_document: 'Document créé', update_document: 'Document modifié', create_client: 'Client ajouté', default: 'Action' };
    if (!activities.length) { el.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;padding:12px">Aucune activité récente</p>'; return; }
    el.innerHTML = activities.map(a => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
            <span>${icons[a.action] || icons.default}</span>
            <div>
                <div style="font-size:0.85rem;font-weight:500;color:#374151">${escapeHtml(a.entity_label || labels[a.action] || a.action)}</div>
                <div style="font-size:0.75rem;color:#9ca3af">${formatDate(a.created_at?.split('T')[0] || a.created_at)}</div>
            </div>
        </div>`).join('');
    if (window.lucide) lucide.createIcons();
}

// ==================== DASHBOARD NOTES WIDGET ====================
async function renderDashboardNotes() {
    const container = document.getElementById('dashboardNotesGrid');
    if (!container) return;
    try {
        const notes = await window.electronAPI.getNotes(currentUser.id);
        const recent = notes.slice(0, 4);
        if (!recent.length) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);font-size:0.85rem">Aucune note — <a href="#" onclick="navigateTo(\'notes\');return false" style="color:var(--primary)">Créer une note</a></div>';
            return;
        }
        container.innerHTML = recent.map(note => `
            <div class="note-card" style="background:${note.color || '#fef9c3'};border-radius:10px;padding:12px;position:relative;min-height:80px;box-shadow:0 1px 4px rgba(0,0,0,0.06);cursor:pointer" onclick="navigateTo('notes')">
                ${note.pinned ? '<i data-lucide="pin" style="position:absolute;top:6px;right:6px;font-size:0.75rem;opacity:0.5"></i>' : ''}
                ${note.title ? `<div style="font-weight:600;font-size:0.85rem;margin-bottom:4px;color:#1e293b">${escapeHtml(note.title)}</div>` : ''}
                <div style="font-size:0.8rem;color:#374151;line-height:1.4;word-break:break-word">${escapeHtml(note.content || '').substring(0, 80)}${(note.content || '').length > 80 ? '…' : ''}</div>
            </div>`).join('');
        if (window.lucide) lucide.createIcons();
    } catch {}
}

// ==================== PAYMENT MODAL ====================
let currentPaymentDocId = null;

async function openPaymentModal(docId) {
    currentPaymentDocId = docId;
    const doc = allDocuments.find(d => d.id === docId) || await window.electronAPI.getDocument(docId);
    if (!doc) return;
    document.getElementById('paymentDocInfo').textContent = `${doc.number} — ${escapeHtml(doc.clientName)} — Total: ${formatAmount(doc.totalTTC)} ${doc.currency}`;
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.getElementById('paymentAmount').value = formatAmount(Math.max(0, doc.totalTTC - (doc.paidAmount || 0)));
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
    if (!payments || !payments.length) { el.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Aucun paiement enregistré</p>'; return; }
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    el.innerHTML = `
        <div style="margin-bottom:8px;font-size:0.85rem;color:#374151"><strong>Total encaissé:</strong> ${formatAmount(totalPaid)} ${doc?.currency || 'TND'} / ${formatAmount(doc?.totalTTC || 0)} ${doc?.currency || 'TND'}</div>
        ${payments.map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:0.85rem">
                <div><strong>${formatAmount(p.amount)} TND</strong> — ${escapeHtml(p.method || 'N/A')} <span style="color:#9ca3af">${formatDate(p.date)}</span> ${p.reference ? `<span style="color:#6b7280">(${escapeHtml(p.reference)})</span>` : ''}</div>
                <button class="btn-icon btn-delete" onclick="deletePayment('${p.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
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

// ==================== CUSTOM FIELDS ====================
let _customFields = [];

function addCustomField(key, value) {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center';
    const idx = _customFields.length;
    _customFields.push({ key: key || '', value: value || '' });
    div.innerHTML = `
        <input type="text" class="cf-key" placeholder="Nom du champ" value="${escapeHtml(key || '')}" style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:0.85rem">
        <input type="text" class="cf-value" placeholder="Valeur" value="${escapeHtml(value || '')}" style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:0.85rem">
        <button type="button" class="btn-icon btn-delete" onclick="this.parentElement.remove();_customFields.splice(${idx},1)" title="Supprimer"><i data-lucide="x" style="width:14px;height:14px"></i></button>
    `;
    container.appendChild(div);
    if (window.lucide) lucide.createIcons();
}

function loadCustomFields(fields) {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    container.innerHTML = '';
    _customFields = [];
    (fields || []).forEach(f => addCustomField(f.key, f.value));
}

function collectCustomFields() {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return [];
    const inputs = container.querySelectorAll('.cf-key');
    const vals = container.querySelectorAll('.cf-value');
    const result = [];
    inputs.forEach((inp, i) => {
        const k = inp.value.trim();
        const v = vals[i]?.value?.trim();
        if (k) result.push({ key: k, value: v || '' });
    });
    return result;
}

// ==================== NEW DOCUMENT ====================
async function initNewDocument() {
    loadCustomFields([]);
    const lastDocType = localStorage.getItem('tuni_last_doc_type');
    if (lastDocType && ['facture', 'devis', 'bon', 'bl', 'ba', 'bs', 'be', 'avoir'].includes(lastDocType)) {
        currentDocType = lastDocType;
        document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === lastDocType);
        document.querySelectorAll('.doc-type-card').forEach(c => c.classList.toggle('active', c.querySelector(`input[value="${lastDocType}"]`) !== null));
    }
    document.getElementById('docDate').valueAsDate = new Date();
    const due = new Date(); due.setDate(due.getDate() + 30);
    document.getElementById('docDueDate').valueAsDate = due;
    const docNumInput = document.getElementById('docNumber');
    try {
        const number = await window.electronAPI.peekNextDocNumber({ userId: currentUser.id, type: currentDocType, year: new Date().getFullYear() });
        docNumInput.value = number;
        docNumberManuallySet = false;
    } catch { }
    if (!docNumInput.dataset.manualInit) {
        docNumInput.dataset.manualInit = '1';
        docNumInput.addEventListener('input', () => { docNumberManuallySet = true; });
    }
    await loadCompanyIntoForm();
    await loadClientsDropdown();
    await loadServicesDropdown();
    if (!document.getElementById('itemsBody').children.length) addItem();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerHTML = getLabel(currentDocType);
    saveBtn.onclick = saveAndDownloadPDF;
    editingDocId = null;
    restoreDraft();
    initNaturalDateInputs();
    initMFAutoComplete();
    updateBreadcrumb(getDocTypeLabel(currentDocType) + ' — Nouveau');
    initClientMFPaste();
}

async function loadCompanyIntoForm() {
    try {
        const c = await window.electronAPI.getCompany(currentUser.id) || {};
        document.getElementById('docCompanyName').value = c.name || currentUser.company || '';
        document.getElementById('docCompanyMF').value = c.mf || currentUser.mf || '';
        document.getElementById('docCompanyAddress').value = c.address || '';
        document.getElementById('docCompanyPhone').value = c.phone || '';
        document.getElementById('docCompanyEmail').value = c.email || '';
        document.getElementById('docCompanyRC').value = c.rc || '';
        if (c.logo_image) logoImage = c.logo_image;
        if (c.stamp_image) stampImage = c.stamp_image;
        if (c.signature_image) signatureImage = c.signature_image;
    } catch { }
}

function selectDocType(type, element) {
    currentDocType = type;
    document.querySelectorAll('.doc-type-card').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    const radio = document.querySelector(`input[name="docType"][value="${type}"]`);
    if (radio) { radio.checked = true; updateDocType(); }
}

async function updateDocType() {
    const radio = document.querySelector('input[name="docType"]:checked');
    if (!radio) return;
    currentDocType = radio.value;
    try { localStorage.setItem('tuni_last_doc_type', currentDocType); } catch {}

    const isStockDoc = ['bl', 'bs', 'be'].includes(currentDocType);
    const isAvoir = currentDocType === 'avoir';
    const hidePrices = isStockDoc;

    // Toggle Groups
    const dueDateGroup = document.getElementById('dueDateGroup');
    const referenceDocGroup = document.getElementById('referenceDocGroup');
    if (dueDateGroup) dueDateGroup.classList.toggle('hidden', !['facture', 'avoir'].includes(currentDocType));
    if (referenceDocGroup) referenceDocGroup.classList.toggle('hidden', !isAvoir);

    // Toggle Totals Section
    const totalsSection = document.querySelector('.totals-section');
    const timbreContainer = document.getElementById('applyTimbre')?.closest('div');
    if (totalsSection) totalsSection.classList.toggle('hidden', hidePrices);
    if (timbreContainer) timbreContainer.classList.toggle('hidden', hidePrices);

    // Toggle Table Columns (Price, TVA, Total HT)
    const table = document.querySelector('.items-table');
    if (table) {
        const headRow = table.querySelector('thead tr');
        if (headRow) {
            // Index 3: Price, 4: TVA, 5: Total HT
            [3, 4, 5].forEach(idx => headRow.cells[idx]?.classList.toggle('hidden', hidePrices));
        }
        document.querySelectorAll('#itemsBody tr').forEach(row => {
            [3, 4, 5].forEach(idx => row.cells[idx]?.classList.toggle('hidden', hidePrices));
        });
    }

    // Update Doc Number Prefix (preview only — counter not consumed until save)
    try {
        const year = new Date().getFullYear();
        const number = await window.electronAPI.peekNextDocNumber({ userId: currentUser.id, type: currentDocType, year });
        document.getElementById('docNumber').value = number;
        docNumberManuallySet = false;
    } catch (err) {
        console.error("Failed to update doc number:", err);
    }
}

function generateRandomMF() {
    const n = () => Math.floor(Math.random() * 9000000 + 1000000);
    const l = () => Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    document.getElementById('docCompanyMF').value = `${n()} ${l()} ${n()}`;
}

// ==================== ITEMS ====================
function addItem(data) {
    itemCount++;
    const tr = document.createElement('tr');
    tr.style.cursor = 'grab';
    const desc = data?.description || '';
    const qty = data?.quantity || 1;
    const price = data?.price || 0;
    const tva = data?.tva || 19;
    tr.innerHTML = `
        <td style="text-align:center;color:var(--gray-500);font-size:0.82rem"><span class="drag-handle" style="cursor:grab;display:inline-block;padding:2px 4px">⠿</span> <span class="item-num">${itemCount}</span></td>
        <td><input type="text"   class="item-input" id="desc${itemCount}"  value="${escapeHtml(desc)}" placeholder="Description..."></td>
        <td><input type="number" class="item-input" id="qty${itemCount}"   value="${qty}" min="0.001" step="0.001" onchange="calculateTotals()"></td>
        <td><input type="number" class="item-input" id="price${itemCount}" value="${price}" min="0" step="0.001" onchange="calculateTotals()"></td>
        <td><select class="tva-select" id="tva${itemCount}" onchange="calculateTotals()">
            <option value="19" ${tva===19?'selected':''}>19%</option><option value="13" ${tva===13?'selected':''}>13%</option>
            <option value="7" ${tva===7?'selected':''}>7%</option><option value="0" ${tva===0?'selected':''}>0%</option>
        </select></td>
        <td style="text-align:right;font-weight:500" id="total${itemCount}">0.${'0'.repeat(currentDecimalPlaces)}</td>
        <td><button type="button" class="btn-icon btn-delete" onclick="removeItem(this)"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button></td>`;
    document.getElementById('itemsBody').appendChild(tr);
    initItemDrag(tr);
    document.getElementById(`desc${itemCount}`).focus();
    calculateTotals();
    if (window.lucide) lucide.createIcons();
}

function removeItem(btn) {
    if (document.getElementById('itemsBody').children.length <= 1) { showToast('Au moins une ligne requise', 'warning'); return; }
    btn.closest('tr').remove(); renumberItems(); calculateTotals();
}

function renumberItems() {
    itemCount = 0;
    document.querySelectorAll('#itemsBody tr').forEach(row => {
        itemCount++;
        const numSpan = row.querySelector('.item-num');
        if (numSpan) numSpan.textContent = itemCount;
        row.cells[0].childNodes.forEach(cn => { if (cn.nodeType === 3) cn.textContent = ''; });
        if (!numSpan) row.cells[0].textContent = itemCount;
        row.querySelectorAll('[id]').forEach(el => { el.id = el.id.replace(/\d+$/, '') + itemCount; });
    });
}

function calculateTotals() {
    let totalHTRaw = 0, tva19 = 0, tva13 = 0, tva7 = 0;
    for (let i = 1; i <= itemCount; i++) {
        const qty = parseFloat(document.getElementById(`qty${i}`)?.value) || 0;
        const price = parseFloat(document.getElementById(`price${i}`)?.value) || 0;
        const tva = parseFloat(document.getElementById(`tva${i}`)?.value) || 0;
        const line = qty * price;
        const cell = document.getElementById(`total${i}`);
        if (cell) cell.textContent = formatAmount(line);
        totalHTRaw += line;
        if (tva === 19) tva19 += line * 0.19;
        else if (tva === 13) tva13 += line * 0.13;
        else if (tva === 7) tva7 += line * 0.07;
    }
    const applyTimbre = document.getElementById('applyTimbre').checked;
    timbreAmount = (applyTimbre && totalHTRaw > 1000) ? 1.000 : 0;
    document.getElementById('timbreDisplay').textContent = formatAmount(timbreAmount) + ' TND';

    // Raw total TTC (full precision)
    const totalTTCRaw = totalHTRaw + tva19 + tva13 + tva7 + timbreAmount;

    // Rounded total TTC
    const totalTTCRounded = roundValue(totalTTCRaw);
    const totalHTRounded = roundValue(totalHTRaw);

    // Rounding adjustment
    const adjustment = parseFloat((totalTTCRounded - totalTTCRaw).toFixed(10));

    const currency = document.getElementById('docCurrency').value;
    document.getElementById('totalHT').textContent = formatAmount(totalHTRaw) + ' ' + currency;
    setRow('tva19Row', 'tva19Amount', tva19, currency);
    setRow('tva13Row', 'tva13Amount', tva13, currency);
    setRow('tva7Row', 'tva7Amount', tva7, currency);
    setRow('timbreRow', 'timbreTotal', timbreAmount, currency);

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
    } catch { }
}

function addPresetService() {
    const select = document.getElementById('presetServiceSelect');
    if (!select.value) return;
    const service = JSON.parse(select.value);
    addItem();
    document.getElementById(`desc${itemCount}`).value = service.description ? `${service.name} - ${service.description}` : service.name;
    document.getElementById(`price${itemCount}`).value = service.price;
    document.getElementById(`tva${itemCount}`).value = service.tva;
    select.value = '';
    calculateTotals();
    showToast('Service ajouté', 'success');
}

// ==================== COMPANY IMAGES ====================
function handleCompanyImageUpload(input, type) {
    if (!input.files?.[0]) return;
    if (input.files[0].size > 5 * 1024 * 1024) { showToast('Image trop lourde (max 5 MB)', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = e.target.result;
        const cap = type.charAt(0).toUpperCase() + type.slice(1);
        const previewEl = document.getElementById(`company${cap}Preview`);
        const placeholderEl = document.getElementById(`company${cap}Placeholder`);
        const boxEl = document.getElementById(`company${cap}Box`);
        if (previewEl) { previewEl.src = data; previewEl.classList.remove('hidden'); }
        if (placeholderEl) placeholderEl.classList.add('hidden');
        if (boxEl) boxEl.classList.add('has-image');
        try {
            const payload = { userId: currentUser.id };
            if (type === 'logo') { payload.logoImage = data; logoImage = data; }
            if (type === 'stamp') { payload.stampImage = data; stampImage = data; }
            if (type === 'signature') { payload.signatureImage = data; signatureImage = data; }
            await window.electronAPI.saveCompanyImages(payload);
            showToast(`${cap} enregistré`, 'success');
        } catch { showToast('Erreur sauvegarde image', 'error'); }
    };
    reader.readAsDataURL(input.files[0]);
}

async function removeCompanyImage(type) {
    const cap = type.charAt(0).toUpperCase() + type.slice(1);
    const previewEl = document.getElementById(`company${cap}Preview`);
    const placeholderEl = document.getElementById(`company${cap}Placeholder`);
    const boxEl = document.getElementById(`company${cap}Box`);
    const inputEl = document.getElementById(`company${cap}Input`);
    if (previewEl) { previewEl.src = ''; previewEl.classList.add('hidden'); }
    if (placeholderEl) placeholderEl.classList.remove('hidden');
    if (boxEl) boxEl.classList.remove('has-image');
    if (inputEl) inputEl.value = '';
    if (type === 'logo') logoImage = null;
    if (type === 'stamp') stampImage = null;
    if (type === 'signature') signatureImage = null;
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
            o.value = JSON.stringify({ name: c.name, mf: c.mf, address: c.address, phone: c.phone, email: c.email });
            o.textContent = c.name; select.appendChild(o);
        });
    } catch { }
}

function loadSavedClient() {
    const val = document.getElementById('savedClientSelect').value;
    if (!val) return;
    const c = JSON.parse(val);
    document.getElementById('docClientName').value = c.name || '';
    document.getElementById('docClientMF').value = c.mf || '';
    document.getElementById('docClientAddress').value = c.address || '';
    document.getElementById('docClientPhone').value = c.phone || '';
    document.getElementById('docClientEmail').value = c.email || '';
}

// ==================== CLIENT MODAL ====================
let currentClientId = null;
function openClientModal(clientId = null) {
    currentClientId = clientId;
    const modal = document.getElementById('clientModal');
    const title = modal.querySelector('h2');

    // Clear
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientMF').value = '';
    document.getElementById('newClientAddress').value = '';
    document.getElementById('newClientPhone').value = '';
    document.getElementById('newClientEmail').value = '';

    if (clientId) {
        const client = allClients.find(c => c.id == clientId);
        if (client) {
            if (title) title.innerHTML = '✏️ Modifier Client';
            document.getElementById('newClientName').value = client.name || '';
            document.getElementById('newClientMF').value = client.mf || '';
            document.getElementById('newClientAddress').value = client.address || '';
            document.getElementById('newClientPhone').value = client.phone || '';
            document.getElementById('newClientEmail').value = client.email || '';
            setTimeout(() => geocodeAddress(document.getElementById('newClientAddress').value), 300);
        }
    } else {
        if (title) title.innerHTML = '➕ Nouveau Client';
    }

    modal.classList.add('active');
    setTimeout(() => document.getElementById('newClientName').focus(), 100);
    const addrInput = document.getElementById('newClientAddress');
    if (addrInput) {
        addrInput.addEventListener('change', function() {
            geocodeAddress(this.value);
        });
    }
}

function closeClientModal() {
    hideClientMap();
    document.getElementById('clientModal').classList.remove('active');
    ['newClientName', 'newClientMF', 'newClientAddress', 'newClientPhone', 'newClientEmail'].forEach(id => document.getElementById(id).value = '');
}

async function saveNewClient() {
    const name = document.getElementById('newClientName').value.trim();
    if (!name) { showToast('Le nom est obligatoire', 'warning'); return; }
    const data = {
        id: currentClientId,
        userId: currentUser.id,
        name,
        mf: document.getElementById('newClientMF').value.trim(),
        address: document.getElementById('newClientAddress').value.trim(),
        phone: document.getElementById('newClientPhone').value.trim(),
        email: document.getElementById('newClientEmail').value.trim()
    };
    try {
        await window.electronAPI.saveClient(data);
        showToast(currentClientId ? `Client "${name}" mis à jour` : `Client "${name}" ajouté`, 'success');
        closeClientModal(); await loadClientsDropdown(); await loadClients();
    } catch { showToast("Erreur lors de l'enregistrement", 'error'); }
}

// ==================== SERVICES PAGE ====================
async function loadServices() {
    if (!currentUser) return;
    try { allServices = await window.electronAPI.getServices(currentUser.id); renderServicesTable(allServices); }
    catch { showToast('Erreur chargement services', 'error'); }
}

function renderServicesTable(services = allServices) {
    const container = document.getElementById('servicesTable');
    if (!services.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🛍️</div><h3>Aucun service</h3><p>Ajoutez vos produits et services pour un remplissage rapide des documents</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th style="width:32px">...</th><th>Nom</th><th>Description</th><th>Catégorie</th><th>Prix HT</th><th>TVA</th><th>Actions</th></tr></thead><tbody>
        ${services.map(s => `<tr>
            <td><input type="checkbox" class="service-checkbox" data-service-id="${s.id}" onchange="updateSelectedServices()" style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer"></td>
            <td style="font-weight:600">${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.description) || '—'}</td>
            <td>${escapeHtml(s.category) || '—'}</td>
            <td>${formatAmount(parseFloat(s.price))} TND</td>
            <td>${s.tva}%</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit"   onclick="editService('${s.id}')"         title="Modifier">✏️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteService('${s.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function filterServices() {
    const q = (document.getElementById('searchServices')?.value || '').toLowerCase();
    const cat = document.getElementById('filterServiceCategory')?.value || '';
    const filtered = allServices.filter(s =>
        (s.name || '').toLowerCase().includes(q) &&
        (!cat || (s.category || '') === cat)
    );
    renderServicesTable(filtered);
}

function toggleSelectAllServices(el) {
    document.querySelectorAll('.service-checkbox').forEach(cb => cb.checked = el.checked);
    updateSelectedServices();
}
function updateSelectedServices() {
    const count = document.querySelectorAll('.service-checkbox:checked').length;
    const el = document.getElementById('selectedServicesCount');
    const btn = document.getElementById('deleteSelectedServicesBtn');
    if (el) el.textContent = count + ' sélectionné(s)';
    if (btn) btn.disabled = count === 0;
}
async function deleteSelectedServices() {
    const ids = [...document.querySelectorAll('.service-checkbox:checked')].map(cb => cb.dataset.serviceId);
    if (!ids.length) return;
    showConfirm('Supprimer', `Supprimer ${ids.length} service(s) ? Cette action est irréversible.`, async () => {
        let done = 0;
        for (const id of ids) {
            try { await window.electronAPI.deleteService(id); done++; } catch {}
        }
        await loadServices();
        showToast(`${done} service(s) supprimé(s)`, 'success');
    });
}

function openServiceModal() {
    editingServiceId = null;
    document.getElementById('serviceModalTitle').textContent = '➕ Nouveau Service';
    ['serviceName', 'serviceDescription', 'svBarcode'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('servicePrice').value = '0.000';
    document.getElementById('serviceTva').value = '19';
    document.getElementById('svCategory').value = '';
    document.getElementById('svStock').value = '0';
    document.getElementById('svMinStock').value = '0';
    document.getElementById('serviceModal').classList.add('active');
}

function closeServiceModal() { document.getElementById('serviceModal').classList.remove('active'); editingServiceId = null; }

async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    if (!name) { showToast('Le nom du service est requis', 'warning'); return; }
    try {
        await window.electronAPI.saveService({
            id: editingServiceId, userId: currentUser.id, name,
            description: document.getElementById('serviceDescription').value.trim(),
            price: parseFloat(document.getElementById('servicePrice').value) || 0,
            tva: parseFloat(document.getElementById('serviceTva').value) || 19,
            category: document.getElementById('svCategory').value,
            barcode: document.getElementById('svBarcode').value.trim() || null,
            stock: parseInt(document.getElementById('svStock').value) || 0,
            minStock: parseInt(document.getElementById('svMinStock').value) || 0
        });
        showToast(editingServiceId ? 'Service mis à jour' : 'Service créé', 'success');
        closeServiceModal(); await loadServices(); await loadServicesDropdown();
    } catch { showToast("Erreur lors de l'enregistrement", 'error'); }
}

async function editService(serviceId) {
    const s = allServices.find(x => x.id === serviceId);
    if (!s) return;
    editingServiceId = serviceId;
    document.getElementById('serviceModalTitle').textContent = '✏️ Modifier Service';
    document.getElementById('serviceName').value = s.name;
    document.getElementById('serviceDescription').value = s.description || '';
    document.getElementById('servicePrice').value = s.price;
    document.getElementById('serviceTva').value = s.tva;
    document.getElementById('svCategory').value = s.category || '';
    document.getElementById('svBarcode').value = s.barcode || '';
    document.getElementById('svStock').value = s.stock || 0;
    document.getElementById('svMinStock').value = s.min_stock || s.minStock || 0;
    document.getElementById('serviceModal').classList.add('active');
}

function confirmDeleteService(serviceId) {
    const s = allServices.find(x => x.id === serviceId);
    showConfirm('Supprimer', `Supprimer "${s?.name}" ?`, async () => {
        try { await window.electronAPI.deleteService(serviceId); showToast('Service supprimé', 'info'); await loadServices(); await loadServicesDropdown(); }
        catch { showToast('Erreur suppression', 'error'); }
    });
}

async function exportServicesXLSX() {
    const data = allServices.map(s => ({ 'Nom': s.name, 'Prix': s.price || 0, 'Description': s.description || '' }));
    const result = await window.electronAPI.exportXLSX({ data, headers: ['Nom','Prix','Description'], filename: 'services.xlsx' });
    if (result?.success) showToast('Excel exporté', 'success');
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
    } catch { }
}

function updateSerialPreview() {
    const prefix = document.getElementById('prefixFacture').value || 'FAC';
    document.getElementById('serialPreview').textContent = `${prefix}-${new Date().getFullYear()}-001`;
}

async function saveSerialSettings() {
    const settings = { prefix_facture: document.getElementById('prefixFacture').value.toUpperCase(), prefix_devis: document.getElementById('prefixDevis').value.toUpperCase(), prefix_bon: document.getElementById('prefixBon').value.toUpperCase() };
    try { await window.electronAPI.updateSettings({ userId: currentUser.id, settings }); showToast('Paramètres de numérotation enregistrés', 'success'); await loadSerialSettings(); }
    catch { showToast("Erreur d'enregistrement", 'error'); }
}

function openResetCounterModal() {
    showConfirm('🔄 Réinitialiser le compteur', "Cela réinitialisera la séquence à 001. Continuer ?", async () => {
        try {
            await window.electronAPI.resetCounter({ userId: currentUser.id, type: 'all', year: new Date().getFullYear() });
            showToast('Compteur réinitialisé', 'success');
            await loadSerialSettings();
            if (document.getElementById('page-new-document').classList.contains('active')) {
                const number = await window.electronAPI.peekNextDocNumber({ userId: currentUser.id, type: currentDocType, year: new Date().getFullYear() });
                document.getElementById('docNumber').value = number;
            }
        } catch { showToast('Erreur', 'error'); }
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
        currentDecimalPlaces = dp;
        currentRoundingMethod = rm;
        showToast('Format des nombres enregistré', 'success');
        calculateTotals(); // refresh display
    } catch { showToast("Erreur d'enregistrement", 'error'); }
}

// ==================== CLIENT MF PASTE DETECTION ====================
function initClientMFPaste() {
    const mfInput = document.getElementById('docClientMF');
    if (!mfInput || mfInput.dataset.pasteInit) return;
    mfInput.dataset.pasteInit = '1';
    mfInput.addEventListener('paste', function(e) {
        setTimeout(async () => {
            const val = this.value.trim();
            if (val.length >= 7) {
                try {
                    const res = await window.electronAPI.searchRNE(val);
                    if (res && res.success && res.data) {
                        const d = res.data;
                        const name = d.denominationLatin || d.nomEtPrenomFr || '';
                        const address = [d.rueFr, d.codePostal, d.villeFr].filter(x => x).map(x => x.trim()).join(' ');
                        if (name) {
                            document.getElementById('docClientName').value = name;
                            document.getElementById('docClientAddress').value = address;
                            showToast('Client trouvé via RNE', 'success');
                        }
                    }
                } catch {}
            }
        }, 100);
    });
}

// ==================== PREVIEW & SAVE ====================
function previewDocument() { if (!validateDocumentForm()) return; generatePreviewHTML(); document.getElementById('previewModal').classList.add('active'); }
function closePreview() { document.getElementById('previewModal').classList.remove('active'); }

function validateDocumentForm() {
    if (!document.getElementById('docCompanyName').value.trim()) { showToast('La raison sociale est requise', 'warning'); return false; }
    if (!document.getElementById('docClientName').value.trim()) { showToast('Le nom du client est requis', 'warning'); return false; }
    let hasItem = false;
    for (let i = 1; i <= itemCount; i++) if (document.getElementById(`desc${i}`)?.value.trim()) { hasItem = true; break; }
    if (!hasItem) { showToast('Ajoutez au moins un article', 'warning'); return false; }
    return true;
}

function generatePreviewHTML() {
    const get = id => document.getElementById(id)?.value || '';
    const companyName = get('docCompanyName'), companyMF = get('docCompanyMF'), companyAddress = get('docCompanyAddress');
    const companyPhone = get('docCompanyPhone'), companyEmail = get('docCompanyEmail'), companyRC = get('docCompanyRC');
    const clientName = get('docClientName'), clientMF = get('docClientMF'), clientAddress = get('docClientAddress');
    const clientPhone = get('docClientPhone'), clientEmail = get('docClientEmail');
    const docNumber = get('docNumber'), docDate = get('docDate'), docDueDate = get('docDueDate');
    const currency = get('docCurrency'), paymentMode = get('docPayment'), notes = get('docNotes');

    let totalHTRaw = 0, tva19 = 0, tva13 = 0, tva7 = 0;
    const items = [];
    for (let i = 1; i <= itemCount; i++) {
        const desc = document.getElementById(`desc${i}`)?.value.trim();
        const qty = parseFloat(document.getElementById(`qty${i}`)?.value) || 0;
        const price = parseFloat(document.getElementById(`price${i}`)?.value) || 0;
        const tva = parseFloat(document.getElementById(`tva${i}`)?.value) || 0;
        if (!desc) continue;
        const line = qty * price; totalHTRaw += line;
        if (tva === 19) tva19 += line * 0.19; else if (tva === 13) tva13 += line * 0.13; else if (tva === 7) tva7 += line * 0.07;
        items.push({ description: desc, quantity: qty, price, tva });
    }
    const totalTTCRaw = totalHTRaw + tva19 + tva13 + tva7 + timbreAmount;
    const totalTTCRounded = roundValue(totalTTCRaw);
    const roundingAdjustment = parseFloat((totalTTCRounded - totalTTCRaw).toFixed(10));

    const theme = currentDocumentTheme || DEFAULT_THEMES.modern;
    const typeLabel = getDocTypeLabel(currentDocType);

    const themedHTML = buildThemedInvoicePreview({
        theme: {
            ...theme,
            showLogo: currentCompanySettings?.show_logo !== 0,
            showStamp: currentCompanySettings?.show_stamp !== 0,
            showSignature: currentCompanySettings?.show_signature !== 0,
            showQrCode: currentCompanySettings?.show_qr !== 0,
            accentLine: currentCompanySettings?.show_accent !== 0
        },
        typeLabel,
        companyName, companyMF, companyAddress, companyPhone, companyEmail, companyRC,
        clientName, clientMF, clientAddress, clientPhone, clientEmail,
        docNumber, docDate, docDueDate, currency, paymentMode, notes,
        logoImage: (currentCompanySettings?.show_logo !== 0) ? logoImage : null,
        stampImage: (currentCompanySettings?.show_stamp !== 0) ? stampImage : null,
        signatureImage: (currentCompanySettings?.show_signature !== 0) ? signatureImage : null,
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
    const fa = (v) => d.formatAmount ? d.formatAmount(v) : (v || 0).toFixed(3);

    const tableCSS = t.tableStyle === 'bordered'
        ? `table{border-collapse:collapse;width:100%} th,td{border:1px solid ${c.border};padding:8px 10px} thead tr{background:${c.surface}}`
        : t.tableStyle === 'striped'
            ? `table{border-collapse:collapse;width:100%} th{border-bottom:2px solid ${c.primary};padding:10px;color:${c.textLight};font-size:11px;text-transform:uppercase} td{padding:10px;border-bottom:1px solid ${c.border}} tbody tr:nth-child(odd){background:${c.surface}}`
            : `table{border-collapse:collapse;width:100%} th{border-bottom:2px solid ${c.primary};padding:10px 4px;color:${c.textLight};font-size:11px;text-transform:uppercase} td{padding:12px 4px;border-bottom:1px solid ${c.border}}`;

    const itemsRows = d.items.map((item, i) => `
        <tr>
            <td style="color:${c.textLight};font-size:12px">${i + 1}</td>
            <td>${escapeHtml(item.description)}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${fa(item.price)}</td>
            <td style="text-align:center">${item.tva}%</td>
            <td style="text-align:right;font-weight:600">${fa(item.quantity * item.price)}</td>
        </tr>`).join('');

    const logoHtml = d.logoImage ? `<img src="${d.logoImage}" style="max-width:130px;max-height:65px;object-fit:contain;margin-bottom:8px;display:block${t.headerStyle === 'center' ? ';margin:0 auto 8px auto' : ''}">` : '';

    let headerHtml;
    if (t.headerStyle === 'center') {
        headerHtml = `<div style="text-align:center;margin-bottom:40px">
            ${logoHtml}
            <div style="font-family:${f.header};font-size:30px;font-weight:800;color:${c.primary}">${escapeHtml(d.typeLabel)}</div>
            <div style="width:50px;height:3px;background:${c.primary};margin:10px auto"></div>
            <div style="color:${c.textLight};font-size:13px"># ${escapeHtml(d.docNumber)} | ${formatDate(d.docDate)}</div>
            <div style="font-size:18px;font-weight:700;margin-top:12px;color:${c.secondary}">${escapeHtml(d.companyName)}</div>
            <div style="font-size:12px;color:${c.textLight}">${d.companyAddress ? escapeHtml(d.companyAddress) : ''} ${d.companyMF ? '| MF: ' + escapeHtml(d.companyMF) : ''}</div>
        </div>`;
    } else {
        const left = `<div>${logoHtml}<div style="font-size:18px;font-weight:700;color:${c.secondary};font-family:${f.header}">${escapeHtml(d.companyName)}</div><div style="font-size:12px;color:${c.textLight};margin-top:6px">${d.companyAddress ? `<div>${escapeHtml(d.companyAddress)}</div>` : ''} ${d.companyPhone ? `<div>📞 ${escapeHtml(d.companyPhone)}</div>` : ''} ${d.companyMF ? `<div>MF: ${escapeHtml(d.companyMF)}</div>` : ''}</div></div>`;
        const right = `<div style="text-align:right"><div style="font-family:${f.header};font-size:30px;font-weight:800;color:${c.primary}">${escapeHtml(d.typeLabel)}</div><div style="width:50px;height:3px;background:${c.primary};margin:10px 0 12px auto"></div><div style="font-size:13px;color:${c.textLight}"><div><strong style="color:${c.text}">#</strong> ${escapeHtml(d.docNumber)}</div><div><strong style="color:${c.text}">Date:</strong> ${formatDate(d.docDate)}</div>${d.docDueDate ? `<div><strong style="color:${c.text}">Échéance:</strong> ${formatDate(d.docDueDate)}</div>` : ''} ${d.paymentMode ? `<div><strong style="color:${c.text}">Paiement:</strong> ${escapeHtml(d.paymentMode)}</div>` : ''}</div></div>`;
        headerHtml = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">${t.headerStyle === 'right' ? right + left : left + right}</div>`;
    }

    const accentBar = t.accentLine ? `<div style="height:4px;background:linear-gradient(90deg,${c.primary},${c.accent || c.secondary})"></div>` : '';

    return `<div style="font-family:${f.body};color:${c.text};padding:40px;max-width:900px;margin:auto;font-size:${f.size};background:${c.bg}">
        ${accentBar}
        <div style="padding-top:${t.accentLine ? '24px' : '0'}">
        ${headerHtml}
        <div style="margin-bottom:32px">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${c.textLight};margin-bottom:6px">Facturé à</div>
            <div style="font-weight:600;font-size:15px;color:${c.text}">${escapeHtml(d.clientName)}</div>
            <div style="font-size:12px;color:${c.textLight};margin-top:4px">
                ${d.clientAddress ? `<div>${escapeHtml(d.clientAddress)}</div>` : ''}
                ${d.clientPhone ? `<div>📞 ${escapeHtml(d.clientPhone)}</div>` : ''}
                ${d.clientEmail ? `<div>✉ ${escapeHtml(d.clientEmail)}</div>` : ''}
                ${d.clientMF ? `<div>MF: ${escapeHtml(d.clientMF)}</div>` : ''}
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
                ${d.tva19 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>TVA 19%</span><span>${fa(d.tva19)} ${d.currency}</span></div>` : ''}
                ${d.tva13 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>TVA 13%</span><span>${fa(d.tva13)} ${d.currency}</span></div>` : ''}
                ${d.tva7 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>TVA 7%</span><span>${fa(d.tva7)} ${d.currency}</span></div>` : ''}
                ${d.timbreAmount ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:13px"><span>Timbre fiscal</span><span>${fa(d.timbreAmount)} ${d.currency}</span></div>` : ''}
                ${d.roundingAdjustment && Math.abs(d.roundingAdjustment) > 0.0001 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:${c.textLight};font-size:12px;font-style:italic"><span>Ajustement d'arrondi</span><span>${d.roundingAdjustment > 0 ? '+' : ''}${fa(d.roundingAdjustment)} ${d.currency}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:2px solid ${c.primary};font-size:18px;font-weight:800;color:${c.primary}"><span>Total TTC</span><span>${fa(d.totalTTC)} ${d.currency}</span></div>
            </div>
        </div>
        ${d.notes ? `<div style="margin-top:40px;padding-top:16px;border-top:1px solid ${c.border};font-size:12px;color:${c.textLight}">${escapeHtml(d.notes).replace(/\n/g, '<br>')}</div>` : ''}
        <div style="margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end">
            ${d.signatureImage ? `<div><div style="font-size:10px;color:${c.textLight};margin-bottom:4px">Signature</div><img src="${d.signatureImage}" style="max-height:70px"></div>` : '<div></div>'}
            ${d.stampImage ? `<div><img src="${d.stampImage}" style="max-height:85px;opacity:0.85"></div>` : '<div></div>'}
        </div>

        </div>
    </div>`;
}

async function saveAndDownloadPDF() {
    if (!validateDocumentForm()) return;
    showLoading('Enregistrement...');
    try {
        // Auto-assign next number only if user didn't manually change it
        if (!docNumberManuallySet) {
            const year = new Date().getFullYear();
            const reservedNumber = await window.electronAPI.getNextDocNumber({ userId: currentUser.id, type: currentDocType, year });
            document.getElementById('docNumber').value = reservedNumber;
        }
        docNumberManuallySet = false;
        const docData = collectDocumentData();
        const result = await window.electronAPI.saveDocument(docData);
        if (result.success) {
            showToast('Document enregistré', 'success');
            generatePreviewHTML();
            const html = buildFullHTML();
            let filename = `${result.document.number}.pdf`;
            const pdfFolder = localStorage.getItem('tuni_pdf_folder');
            if (pdfFolder) filename = `${pdfFolder}/${filename}`;
            hideLoading();
            const pdfResult = await window.electronAPI.savePDF({ html, filename });
            if (pdfResult.success) {
                showToast('PDF enregistré avec succès', 'success');
                setTimeout(async () => {
                    if (localStorage.getItem('tuni_autobackup') === 'true') {
                        try { await window.electronAPI.createManualBackup(); } catch {}
                    }
                }, 500);
            }
            resetDocumentForm(); navigateTo('documents');
        }
    } catch { showToast("Erreur lors de l'enregistrement", 'error'); }
    finally { hideLoading(); }
}

// ==================== PDF HELPERS ====================
function buildFullHTML() {
    const inner = document.getElementById('previewContent').innerHTML;
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0} body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact} @page{size:A4;margin:0}</style></head><body>${inner}</body></html>`;
}

async function downloadPDF() {
    const docNumber = document.getElementById('docNumber')?.value || 'facture';
    generatePreviewHTML();
    const html = buildFullHTML();
    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename: `${docNumber}.pdf` });
        if (result.success) { showToast('PDF enregistré', 'success'); closePreview(); }
        else if (!result.canceled) showToast('Erreur PDF', 'error');
    } catch (e) { showToast('Erreur PDF: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

async function printDocument() {
    generatePreviewHTML();
    const html = buildFullHTML();
    showLoading("Ouverture de l'impression...");
    try {
        const result = await window.electronAPI.printPDF({ html });
        if (!result.success && result.error) showToast('Erreur impression: ' + result.error, 'error');
    } catch (e) { showToast('Erreur impression: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

async function downloadDocPDF(docId) {
    const doc = allDocuments.find(d => d.id === docId);
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
        if (result.success) showToast('PDF enregistré: ' + result.path, 'success');
    } catch (e) { showToast('Erreur PDF: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

// ==================== AUTO-SAVE DRAFT ====================
let autoSaveTimer = null;
const DRAFT_KEY = 'factarlou_draft';

function collectFormData() {
    const get = id => document.getElementById(id)?.value || '';
    const items = [];
    for (let i = 1; i <= itemCount; i++) {
        const desc = document.getElementById(`desc${i}`)?.value.trim();
        if (!desc) continue;
        items.push({
            description: desc,
            quantity: parseFloat(document.getElementById(`qty${i}`)?.value) || 0,
            price: parseFloat(document.getElementById(`price${i}`)?.value) || 0,
            tva: parseFloat(document.getElementById(`tva${i}`)?.value) || 0
        });
    }
    return {
        type: currentDocType,
        number: get('docNumber'),
        date: get('docDate'),
        dueDate: get('docDueDate'),
        referenceDoc: get('docReference'),
        currency: get('docCurrency'),
        paymentMode: get('docPayment'),
        companyName: get('docCompanyName'), companyMF: get('docCompanyMF'),
        companyAddress: get('docCompanyAddress'), companyPhone: get('docCompanyPhone'),
        companyEmail: get('docCompanyEmail'), companyRC: get('docCompanyRC'),
        clientName: get('docClientName'), clientMF: get('docClientMF'),
        clientAddress: get('docClientAddress'), clientPhone: get('docClientPhone'),
        clientEmail: get('docClientEmail'),
        items,
        applyTimbre: document.getElementById('applyTimbre')?.checked || false,
        notes: get('docNotes')
    };
}

function autoSaveDraft() {
    const docPage = document.getElementById('page-new-document');
    if (!docPage || !docPage.classList.contains('active')) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        try {
            const data = collectFormData();
            if (data.clientName || data.items.length > 0) {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
            }
        } catch {}
    }, 2000);
}

function restoreDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (!draft.clientName && draft.items.length === 0) return;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('docNumber', draft.number);
        setVal('docDate', draft.date);
        setVal('docDueDate', draft.dueDate);
        setVal('docReference', draft.referenceDoc);
        setVal('docCurrency', draft.currency || 'TND');
        setVal('docPayment', draft.paymentMode);
        setVal('docCompanyName', draft.companyName);
        setVal('docCompanyMF', draft.companyMF);
        setVal('docCompanyAddress', draft.companyAddress);
        setVal('docCompanyPhone', draft.companyPhone);
        setVal('docCompanyEmail', draft.companyEmail);
        setVal('docCompanyRC', draft.companyRC);
        setVal('docClientName', draft.clientName);
        setVal('docClientMF', draft.clientMF);
        setVal('docClientAddress', draft.clientAddress);
        setVal('docClientPhone', draft.clientPhone);
        setVal('docClientEmail', draft.clientEmail);
        setVal('docNotes', draft.notes);
        document.getElementById('applyTimbre').checked = draft.applyTimbre || false;
        if (draft.items?.length > 0) {
            draft.items.forEach(item => addItem(item));
        } else {
            addItem();
        }
        calculateTotals();
        showToast('Brouillon restauré', 'info', 2000);
        localStorage.removeItem(DRAFT_KEY);
    } catch {}
}

function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}

// Hook auto-save onto form inputs
document.addEventListener('input', (e) => {
    if (e.target.closest('#page-new-document')) autoSaveDraft();
});

function collectDocumentData() {
    const get = id => document.getElementById(id)?.value || '';
    const items = [];
    for (let i = 1; i <= itemCount; i++) {
        const desc = document.getElementById(`desc${i}`)?.value.trim();
        if (!desc) continue;
        const qty = parseFloat(document.getElementById(`qty${i}`)?.value) || 0;
        const price = parseFloat(document.getElementById(`price${i}`)?.value) || 0;
        const tva = parseFloat(document.getElementById(`tva${i}`)?.value) || 0;
        items.push({ description: desc, quantity: qty, price, tva, total: qty * price });
    }
    let totalHTRaw = 0, tva19 = 0, tva13 = 0, tva7 = 0;
    items.forEach(item => {
        totalHTRaw += item.total;
        if (item.tva === 19) tva19 += item.total * 0.19;
        else if (item.tva === 13) tva13 += item.total * 0.13;
        else if (item.tva === 7) tva7 += item.total * 0.07;
    });
    const totalTTCRaw = totalHTRaw + tva19 + tva13 + tva7 + timbreAmount;
    const totalTTCRounded = roundValue(totalTTCRaw);
    const roundingAdjustment = parseFloat((totalTTCRounded - totalTTCRaw).toFixed(10));
    return {
        id: editingDocId || undefined,
        userId: currentUser.id,
        type: currentDocType,
        number: get('docNumber'),
        date: get('docDate'),
        dueDate: get('docDueDate') || null,
        referenceDoc: get('docReference') || null,
        currency: get('docCurrency') || 'TND',
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
        notes: get('docNotes'),
        internalNotes: document.getElementById('docInternalNotes')?.value || '',
        customFields: collectCustomFields()
    };
}

function resetDocumentForm() {
    ['docClientName', 'docClientMF', 'docClientAddress', 'docClientPhone', 'docClientEmail', 'docNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('docInternalNotes').value = '';
    document.getElementById('applyTimbre').checked = false;
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0; editingDocId = null;
    clearDraft();
    initNewDocument();
}

// ==================== DOCUMENT MANAGEMENT ====================
let docSortBy = 'date';
let docSortDir = 'desc';

async function loadDocuments() {
    if (!currentUser) return;
    try {
        const result = await window.electronAPI.getDocuments({
            userId: currentUser.id,
            page: docPage,
            pageSize: DOC_PAGE_SIZE
        });
        allDocuments = result.rows || [];
        const totalPages = Math.ceil((result.total || 0) / DOC_PAGE_SIZE) || 1;
        renderDocumentsTable(allDocuments);
        renderDocPagination(docPage, totalPages);
    } catch { showToast('Erreur chargement documents', 'error'); }
}

function renderDocPagination(current, total) {
    const container = document.getElementById('docPagination');
    if (!container) return;
    if (total <= 1) { container.innerHTML = ''; return; }
    let html = '<div class="pagination" style="display:flex;justify-content:center;gap:6px;padding:16px 0">';
    html += `<button class="btn btn-sm ${current <= 1 ? 'disabled' : ''}" onclick="${current > 1 ? `goDocPage(${current - 1})` : ''}" ${current <= 1 ? 'disabled' : ''}><i data-lucide="chevron-left" style="width:14px;height:14px"></i></button>`;
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        html += `<button class="btn btn-sm ${i === current ? 'btn-primary' : 'btn-secondary'}" onclick="goDocPage(${i})">${i}</button>`;
    }
    html += `<button class="btn btn-sm ${current >= total ? 'disabled' : ''}" onclick="${current < total ? `goDocPage(${current + 1})` : ''}" ${current >= total ? 'disabled' : ''}><i data-lucide="chevron-right" style="width:14px;height:14px"></i></button>`;
    html += '</div>';
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function goDocPage(page) {
    docPage = page;
    loadDocuments();
}

function sortDocs(field) {
    if (docSortBy === field) docSortDir = docSortDir === 'asc' ? 'desc' : 'asc';
    else { docSortBy = field; docSortDir = 'asc'; }
    allDocuments.sort((a, b) => {
        let va = a[field] || '', vb = b[field] || '';
        if (field === 'date' || field === 'createdAt') { va = new Date(va); vb = new Date(vb); }
        else if (field === 'totalTTC' || field === 'totalHT') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
        else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
        if (va < vb) return docSortDir === 'asc' ? -1 : 1;
        if (va > vb) return docSortDir === 'asc' ? 1 : -1;
        return 0;
    });
    renderDocumentsTable(allDocuments);
}

function renderDocumentsTable(docs) {
    window._filteredDocs = docs;
    const container = document.getElementById('allDocsTable');
    if (!docs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="file-text" class="lucide-sm"></i></div><h3>Aucun document</h3><p>Créez votre premier document pour commencer</p></div>`; if (window.lucide) lucide.createIcons(); updateBatchButtons(); return; }
    container.innerHTML = `<table><thead><tr><th style="width:36px"><input type="checkbox" id="selectAllDocs" onchange="toggleSelectAllDocs(this.checked)" style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer"></th><th>Type</th><th onclick="sortDocs('number')" style="cursor:pointer">N° ${docSortBy==='number'?(docSortDir==='asc'?' ▲':' ▼'):''}</th><th onclick="sortDocs('clientName')" style="cursor:pointer">Client ${docSortBy==='clientName'?(docSortDir==='asc'?' ▲':' ▼'):''}</th><th onclick="sortDocs('date')" style="cursor:pointer">Date ${docSortBy==='date'?(docSortDir==='asc'?' ▲':' ▼'):''}</th><th onclick="sortDocs('totalTTC')" style="cursor:pointer">Total TTC ${docSortBy==='totalTTC'?(docSortDir==='asc'?' ▲':' ▼'):''}</th><th>Statut</th><th>Pipeline</th><th>Actions</th></tr></thead><tbody>
        ${docs.map(doc => `<tr>
            <td><input type="checkbox" class="doc-select" value="${doc.id}" onchange="updateBatchButtons()" style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer"></td>
            <td><span class="badge badge-${doc.type}">${doc.type.toUpperCase()}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${doc.number}</td>
            <td>${escapeHtml(doc.clientName)}</td>
            <td>${formatDate(doc.date)}</td>
            <td style="font-weight:600">${formatAmount(doc.totalTTC)} ${doc.currency}</td>
            <td>${renderPaymentBadge(doc)}</td>
            <td>${renderPipelineBadge(doc)}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"    onclick="viewDocument('${doc.id}')"           title="Aperçu"><i data-lucide="eye" class="lucide-sm"></i></button>
                ${doc.type === 'devis' ? `<button class="btn-icon btn-convert" onclick="convertToInvoice('${doc.id}')" title="Convertir"><i data-lucide="refresh-cw" class="lucide-sm"></i></button>` : ''}
                <button class="btn-icon btn-edit"    onclick="editExistingDoc('${doc.id}')"         title="Modifier"><i data-lucide="edit" class="lucide-sm"></i></button>
                <button class="btn-icon"             onclick="duplicateDocument('${doc.id}')"        title="Dupliquer" style="color:#8b5cf6"><i data-lucide="clipboard-list" class="lucide-sm"></i></button>
                <button class="btn-icon btn-pdf"     onclick="downloadDocPDF('${doc.id}')"           title="PDF"><i data-lucide="file-text" class="lucide-sm"></i></button>
                <button class="btn-icon btn-whatsapp" onclick="sendWhatsApp('${doc.id}')" title="WhatsApp">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
                ${doc.type === 'facture' ? `<button class="btn-icon btn-payment" onclick="openPaymentModal('${doc.id}')" title="Paiement" style="color:#10b981"><i data-lucide="coins" class="lucide-sm"></i></button>` : ''}
                ${doc.type === 'ba' ? `<button class="btn-icon" onclick="convertBAToExpense('${doc.id}')" title="Convertir en dépense" style="color:#8b5cf6"><i data-lucide="shopping-cart" class="lucide-sm"></i></button>` : ''}
                <button class="btn-icon btn-delete"  onclick="confirmDeleteDoc('${doc.id}')"         title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td></tr>`).join('')}
    </tbody></table>`;
    if (window.lucide) lucide.createIcons();
    updateBatchButtons();
}

function renderPipelineBadge(doc) {
    if (doc.reference_doc) {
        const ref = allDocuments.find(d => d.id === doc.reference_doc);
        if (ref) return `<span style="font-size:0.72rem;padding:3px 8px;border-radius:4px;background:#e0e7ff;color:#4338ca;white-space:nowrap"><i data-lucide="link" style="width:10px;height:10px;display:inline;vertical-align:middle"></i> Issu de ${ref.number}</span>`;
        return `<span style="font-size:0.72rem;padding:3px 8px;border-radius:4px;background:#f3f4f6;color:#6b7280;white-space:nowrap">Réf. liée</span>`;
    }
    if (doc.type === 'devis') {
        const converted = allDocuments.find(d => d.reference_doc === doc.id);
        if (converted) return `<span style="font-size:0.72rem;padding:3px 8px;border-radius:4px;background:#d1fae5;color:#065f46;white-space:nowrap"><i data-lucide="check" style="width:10px;height:10px;display:inline;vertical-align:middle"></i> Converti → ${converted.number}</span>`;
        return `<span style="font-size:0.72rem;padding:3px 8px;border-radius:4px;background:#fef3c7;color:#92400e;white-space:nowrap"><i data-lucide="clock" style="width:10px;height:10px;display:inline;vertical-align:middle"></i> En attente</span>`;
    }
    return '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';
}

function toggleSelectAllDocs(checked) {
    document.querySelectorAll('.doc-select').forEach(cb => cb.checked = checked);
    updateBatchButtons();
}
function updateBatchButtons() {
    const selected = document.querySelectorAll('.doc-select:checked').length;
    document.getElementById('batchDeleteBtn').disabled = selected === 0;
    document.getElementById('batchPaidBtn').disabled = selected === 0;
    document.getElementById('batchPdfBtn').disabled = selected === 0;
}
function getSelectedDocIds() {
    return Array.from(document.querySelectorAll('.doc-select:checked')).map(cb => cb.value);
}
async function batchDeleteSelected() {
    const ids = getSelectedDocIds();
    if (!ids.length) return;
    showConfirm('<i data-lucide="trash-2" class="lucide-sm"></i> Supprimer', `Supprimer ${ids.length} document(s) définitivement ?`, async () => {
        for (const id of ids) {
            try { await window.electronAPI.deleteDocument(id); } catch {}
        }
        showToast(`${ids.length} document(s) supprimés`, 'success');
        await loadDocuments();
    });
}
async function batchMarkPaid() {
    const ids = getSelectedDocIds();
    if (!ids.length) return;
    for (const id of ids) {
        try {
            const doc = allDocuments.find(d => d.id === id);
            if (doc && doc.type === 'facture') {
                await window.electronAPI.saveDocument({ ...doc, id, paymentStatus: 'paid', paidDate: new Date().toISOString().split('T')[0], paidAmount: doc.totalTTC });
            }
        } catch {}
    }
    showToast(`${ids.length} facture(s) marquées payées`, 'success');
    await loadDocuments();
}
async function batchExportPDF() {
    const ids = getSelectedDocIds();
    if (!ids.length) return;
    for (const id of ids) {
        try { await downloadDocPDF(id); } catch {}
    }
}

// ==================== BATCH EMAIL ====================
let _selectedDocIds = new Set();

function updateSelectedCount() {
    _selectedDocIds = new Set();
    document.querySelectorAll('.doc-select:checked').forEach(cb => {
        _selectedDocIds.add(parseInt(cb.value));
    });
    const count = _selectedDocIds.size;
    document.getElementById('batchEmailBtn').disabled = count === 0;
}

async function emailSelectedDocs() {
    const ids = getSelectedDocIds();
    if (!ids.length) return;
    const docs = allDocuments.filter(d => ids.includes(String(d.id)));
    if (!docs.length) return;
    document.getElementById('batchEmailCount').textContent = docs.length;
    document.getElementById('batchEmailSubject').value = docs.length === 1 && docs[0].number ? 'Facture ' + docs[0].number : 'Vos documents';
    document.getElementById('batchEmailBody').value = '';
    document.getElementById('batchEmailProgress').style.display = 'none';
    document.getElementById('sendBatchBtn').disabled = false;
    document.getElementById('sendBatchBtn').innerHTML = '<i data-lucide="send"></i> Envoyer';
    document.getElementById('batchEmailModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

async function sendBatchEmails() {
    const ids = getSelectedDocIds();
    if (!ids.length) return;
    const docs = allDocuments.filter(d => ids.includes(String(d.id)));
    if (!docs.length) return;
    const subject = document.getElementById('batchEmailSubject').value || 'Documents';
    const body = document.getElementById('batchEmailBody').value || '';

    document.getElementById('sendBatchBtn').disabled = true;
    document.getElementById('sendBatchBtn').innerHTML = '<i data-lucide="loader" class="spin"></i> Envoi...';
    document.getElementById('batchEmailProgress').style.display = 'block';
    if (window.lucide) lucide.createIcons();

    let sent = 0, failed = 0;
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        try {
            if (doc.clientEmail) {
                const pdfResult = await window.electronAPI.generateDocumentPDF({
                    doc: doc,
                    company: { name: doc.companyName || '' },
                    type: doc.type,
                    theme: currentDocumentTheme,
                    decimalPlaces: currentDecimalPlaces,
                    roundingMethod: currentRoundingMethod,
                });
                if (pdfResult.success && pdfResult.path) {
                    const emailResult = await window.electronAPI.sendEmail({
                        userId: currentUser.id,
                        to: doc.clientEmail,
                        subject,
                        body,
                        attachments: [{ path: pdfResult.path, filename: doc.number + '.pdf' }]
                    });
                    if (emailResult.success) sent++;
                    else failed++;
                } else {
                    failed++;
                }
            } else {
                failed++;
            }
        } catch { failed++; }
        const pct = Math.round(((i + 1) / docs.length) * 100);
        document.getElementById('batchEmailProgressBar').style.width = pct + '%';
        document.getElementById('batchEmailStatus').textContent = `${i + 1}/${docs.length} — ${sent} envoyé(s), ${failed} échec(s)`;
    }

    document.getElementById('sendBatchBtn').innerHTML = '<i data-lucide="check"></i> Terminé';
    showToast(`${sent} document(s) envoyé(s)${failed ? ', ' + failed + ' échec(s)' : ''}`, failed ? 'warning' : 'success');
    setTimeout(() => { closeModal('batchEmailModal'); updateSelectedCount(); }, 2000);
}

// Hook into existing batch selection to enable/disable email button
const origUpdateBatch = updateBatchButtons;
updateBatchButtons = function() {
    origUpdateBatch();
    updateSelectedCount();
};

// ==================== EMAIL TEMPLATES ====================
let _emailTemplates = [];

function loadEmailTemplates() {
    try {
        const saved = localStorage.getItem('tuni_email_templates');
        _emailTemplates = saved ? JSON.parse(saved) : [];
    } catch { _emailTemplates = []; }
}

function saveEmailTemplates() {
    localStorage.setItem('tuni_email_templates', JSON.stringify(_emailTemplates));
}

function openEmailTemplateManager() {
    loadEmailTemplates();
    const container = document.getElementById('emailTemplateList');
    if (!container) return;
    if (!_emailTemplates.length) {
        container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-light)">Aucun modèle d\'email</div>';
    } else {
        container.innerHTML = _emailTemplates.map((t, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6">
                <div><strong>${escapeHtml(t.name)}</strong><div style="font-size:0.8rem;color:#6b7280">${escapeHtml(t.subject)}</div></div>
                <div style="display:flex;gap:6px">
                    <button class="btn-icon" onclick="applyEmailTemplate(${i})" title="Appliquer"><i data-lucide="upload" style="width:14px;height:14px"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteEmailTemplate(${i})" title="Supprimer"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
                </div>
            </div>`).join('');
    }
    document.getElementById('emailTemplateModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function saveCurrentAsEmailTemplate() {
    const name = document.getElementById('newTemplateName').value.trim();
    if (!name) { showToast('Nom requis', 'warning'); return; }
    loadEmailTemplates();
    _emailTemplates.push({
        name,
        subject: document.getElementById('batchEmailSubject').value || '',
        body: document.getElementById('batchEmailBody').value || ''
    });
    saveEmailTemplates();
    document.getElementById('newTemplateName').value = '';
    showToast('Modèle enregistré', 'success');
    openEmailTemplateManager();
}

function applyEmailTemplate(idx) {
    loadEmailTemplates();
    const t = _emailTemplates[idx];
    if (!t) return;
    document.getElementById('batchEmailSubject').value = t.subject || '';
    document.getElementById('batchEmailBody').value = t.body || '';
    showToast('Modèle appliqué', 'success');
    closeModal('emailTemplateModal');
}

function deleteEmailTemplate(idx) {
    loadEmailTemplates();
    _emailTemplates.splice(idx, 1);
    saveEmailTemplates();
    openEmailTemplateManager();
}

// ==================== BA → EXPENSE CONVERSION ====================
async function convertBAToExpense(docId) {
    const doc = allDocuments.find(d => d.id === docId) || await window.electronAPI.getDocument(docId);
    if (!doc) return;
    try {
        const items = JSON.parse(doc.items_json || '[]');
        const totalHT = items.reduce((s, i) => s + (parseFloat(i.unitPrice) * parseFloat(i.quantity || 1)), 0);
        const totalTVA = (doc.totalTTC || 0) - totalHT;
        const tvaRate = totalHT > 0 ? Math.round((totalTVA / totalHT) * 100) : 19;
        await window.electronAPI.saveExpense({
            userId: currentUser.id,
            vendor: doc.clientName,
            date: doc.date,
            amountTTC: doc.totalTTC || 0,
            amountHT: totalHT,
            tvaRate: Math.min(Math.max(tvaRate, 0), 19),
            category: 'Fournitures',
            reference: doc.number,
            description: `Bon d'Achat ${doc.number} — ${doc.clientName}`,
            docType: 'facture'
        });
        showToast('Dépense créée depuis le BA', 'success');
    } catch (e) { showToast('Erreur conversion: ' + e.message, 'error'); }
}

function filterDocuments() {
    docPage = 1;
    const search = document.getElementById('searchDocs').value.toLowerCase();
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterPaymentStatus')?.value || '';
    const filtered = allDocuments.filter(doc => {
        const matchSearch = !search || doc.number.toLowerCase().includes(search) || doc.clientName.toLowerCase().includes(search);
        const matchType = !type || doc.type === type;
        const matchStatus = !status || doc.paymentStatus === status;
        return matchSearch && matchType && matchStatus;
    });
    renderDocumentsTable(filtered);
}

async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    populateFormWithDoc(doc);
    generatePreviewHTML();
    updateBreadcrumb(getDocTypeLabel(doc.type) + ' — Consultation');
    document.getElementById('previewModal').classList.add('active');
}

async function editExistingDoc(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    editingDocId = docId;
    populateFormWithDoc(doc);
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerHTML = '<i data-lucide="save" class="lucide-sm"></i> Mettre à jour le Document';
    if (window.lucide) lucide.createIcons();
    saveBtn.onclick = async () => {
        if (!validateDocumentForm()) return;
        showLoading('Mise à jour...');
        try {
            const docData = collectDocumentData();
            const result = await window.electronAPI.updateDocument({ docId, updates: docData });
            if (result.success) { showToast('Document mis à jour', 'success'); resetDocumentForm(); navigateTo('documents'); }
        } catch { showToast('Erreur lors de la mise à jour', 'error'); }
        finally { hideLoading(); }
    };
    navigateTo('new-document');
    initNaturalDateInputs();
    initMFAutoComplete();
    updateBreadcrumb(getDocTypeLabel(doc.type) + ' — Édition');
    initClientMFPaste();
    showToast('Mode édition activé', 'info');
}

function populateFormWithDoc(doc) {
    currentDocType = doc.type;
    document.querySelectorAll('input[name="docType"]').forEach(r => r.checked = r.value === doc.type);
    updateDocType();
    document.getElementById('docInternalNotes').value = doc.internalNotes || '';
    const fields = { docCompanyName: doc.companyName, docCompanyMF: doc.companyMF, docCompanyAddress: doc.companyAddress, docCompanyPhone: doc.companyPhone, docCompanyEmail: doc.companyEmail, docCompanyRC: doc.companyRC, docClientName: doc.clientName, docClientMF: doc.clientMF, docClientAddress: doc.clientAddress, docClientPhone: doc.clientPhone, docClientEmail: doc.clientEmail, docNumber: doc.number, docDate: doc.date, docDueDate: doc.dueDate, docCurrency: doc.currency || 'TND', docPayment: doc.paymentMode || 'Virement bancaire', docNotes: doc.notes };
    Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val || ''; });
    document.getElementById('applyTimbre').checked = doc.applyTimbre || false;
    logoImage = doc.logoImage || logoImage || null;
    stampImage = doc.stampImage || stampImage || null;
    signatureImage = doc.signatureImage || signatureImage || null;
    document.getElementById('itemsBody').innerHTML = ''; itemCount = 0;
    (doc.items || []).forEach(item => addItem(item));
    loadCustomFields(doc.customFields);
    calculateTotals();
}

async function convertToInvoice(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    showConfirm('🔄 Convertir en Facture', `Convertir le devis ${doc.number} en facture ?`, async () => {
        showLoading('Conversion...');
        try {
            const result = await window.electronAPI.convertDocument({ sourceId: docId, targetType: 'facture', userId: currentUser.id, year: new Date().getFullYear() });
            if (result.success) { showToast('Devis converti en facture', 'success'); await loadDocuments(); navigateTo('documents'); }
        } catch { showToast('Erreur de conversion', 'error'); }
        finally { hideLoading(); }
    }, 'Convertir', 'btn-primary');
}

async function confirmDeleteDoc(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    showConfirm('Supprimer', `Supprimer définitivement ${doc?.number} ?`, async () => {
        showLoading('Suppression...');
        try {
            const result = await window.electronAPI.deleteDocument(docId);
            if (result.success) { showToast('Document supprimé', 'info'); await loadDocuments(); await loadDashboard(); }
        } catch { showToast('Erreur lors de la suppression', 'error'); }
        finally { hideLoading(); }
    });
}

async function exportAllToExcel() {
    try { const result = await window.electronAPI.exportExcelDocuments({ documents: allDocuments }); if (result.success) showToast(`Excel exporté: ${result.path}`, 'success'); }
    catch { showToast('Erreur export Excel', 'error'); }
}

async function exportDocumentsXLSX() {
    const headers = ['N°', 'Type', 'Client', 'Date', 'Total HT', 'TVA', 'Total TTC', 'Statut'];
    const data = allDocuments.map(d => ({
        'N°': d.number, 'Type': d.type, 'Client': d.clientName, 'Date': d.date,
        'Total HT': d.totalHT || 0, 'TVA': (d.totalTTC || 0) - (d.totalHT || 0),
        'Total TTC': d.totalTTC || 0, 'Statut': d.paymentStatus || 'unpaid'
    }));
    const result = await window.electronAPI.exportXLSX({ data, headers, filename: 'documents.xlsx' });
    if (result?.success) showToast('Excel exporté', 'success');
}

async function sendWhatsApp(docId) {
    try {
        const doc = allDocuments.find(d => d.id === docId) || await window.electronAPI.getDocument(docId);
        if (!doc) return;

        const phone = doc.clientPhone || "";
        const cleanPhone = phone.replace(/[^0-9]/g, '');

        // Prefix with +216 if it's 8 digits (Tunisian format)
        let finalPhone = cleanPhone;
        if (cleanPhone.length === 8) finalPhone = "216" + cleanPhone;

        const typeLabel = getDocTypeLabel(doc.type);
        const message = `Bonjour,\n\nVoici votre ${typeLabel} N° ${doc.number} d'un montant de ${formatAmount(doc.totalTTC)} ${doc.currency}.\n\nCordialement,\n${doc.companyName}`;

        const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        showToast('Lien WhatsApp ouvert', 'success');
    } catch (e) {
        showToast('Erreur WhatsApp', 'error');
    }
}

// ==================== CLIENTS ====================
async function loadClients() {
    try {
        allClients = await window.electronAPI.getClients(currentUser.id);
        renderClientsTable(allClients);
        updateClientStats(allClients);
    } catch { showToast('Erreur chargement clients', 'error'); }
}

function updateClientStats(clients) {
    const total = clients.length;
    const active = clients.length; // Assuming all clients are active for now
    const elTotal = document.getElementById('clientsTotalCount');
    const elActive = document.getElementById('clientsActiveCount');
    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
}

function renderClientsTable(clients = allClients) {
    const container = document.getElementById('clientsTable');
    if (!clients.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><h3>Aucun client</h3><p>Ajoutez votre premier client</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th style="width:32px">...</th><th>Nom</th><th>MF</th><th>Téléphone</th><th>Email</th><th style="text-align:right">Actions</th></tr></thead><tbody>
        ${clients.map(c => `<tr>
            <td><input type="checkbox" class="client-checkbox" data-client-id="${c.id}" onchange="updateSelectedClients()" style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer"></td>
            <td style="font-weight:600">${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.mf) || '—'}</td>
            <td>${escapeHtml(c.phone) || '—'}</td>
            <td>${escapeHtml(c.email) || '—'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="viewClientPreview('${c.id}')"   title="Aperçu">👁️</button>
                <button class="btn-icon btn-edit"   onclick="openClientModal('${c.id}')"     title="Modifier">✏️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteClient('${c.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function viewClientPreview(clientId) {
    const client = allClients.find(c => c.id == clientId);
    if (!client) return;
    const html = `
        <div style="padding:10px; text-align:left;">
            <div style="font-size:1.4rem; font-weight:800; color:var(--primary); margin-bottom:15px;">${escapeHtml(client.name)}</div>
            <div style="display:grid; grid-template-columns:110px 1fr; gap:8px; font-size:0.95rem;">
                <b style="color:var(--text-muted)">MF:</b> <span>${escapeHtml(client.mf) || '—'}</span>
                <b style="color:var(--text-muted)">Adresse:</b> <span>${escapeHtml(client.address) || '—'}</span>
                <b style="color:var(--text-muted)">Téléphone:</b> <span>${escapeHtml(client.phone) || '—'}</span>
                <b style="color:var(--text-muted)">Email:</b> <span>${escapeHtml(client.email) || '—'}</span>
            </div>
            <div style="margin-top:20px; padding:12px; background:var(--gray-50); border-radius:8px; font-size:0.85rem; color:var(--text-secondary); text-align:center;">
                Historique des transactions bientôt disponible.
            </div>
        </div>
    `;
    showConfirm(escapeHtml(client.name), html, null, 'Fermer', 'btn-secondary', false);
}

function filterClients() {
    const q = (document.getElementById('searchClients')?.value || '').toLowerCase();
    const filtered = allClients.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.mf || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
    );
    renderClientsTable(filtered);
}

function toggleSelectAllClients(el) {
    document.querySelectorAll('.client-checkbox').forEach(cb => cb.checked = el.checked);
    updateSelectedClients();
}
function updateSelectedClients() {
    const count = document.querySelectorAll('.client-checkbox:checked').length;
    const el = document.getElementById('selectedClientsCount');
    const btn = document.getElementById('deleteSelectedClientsBtn');
    if (el) el.textContent = count + ' sélectionné(s)';
    if (btn) btn.disabled = count === 0;
}
async function deleteSelectedClients() {
    const ids = [...document.querySelectorAll('.client-checkbox:checked')].map(cb => cb.dataset.clientId);
    if (!ids.length) return;
    showConfirm('Supprimer', `Supprimer ${ids.length} client(s) ? Les documents et paiements associés seront également supprimés.`, async () => {
        let done = 0;
        for (const id of ids) {
            try { await window.electronAPI.deleteClient(id); done++; } catch {}
        }
        await loadClients();
        showToast(`${done} client(s) supprimé(s)`, 'success');
    });
}

function confirmDeleteClient(clientId) {
    const client = allClients.find(c => c.id === clientId);
    showConfirm('Supprimer', `Supprimer "${client?.name}" ?`, async () => {
        try { await window.electronAPI.deleteClient(clientId); showToast('Client supprimé', 'info'); await loadClients(); await loadClientsDropdown(); }
        catch { showToast('Erreur suppression', 'error'); }
    });
}

async function exportClientsToExcel() {
    try { const result = await window.electronAPI.exportExcelClients({ clients: allClients }); if (result.success) showToast(`Excel exporté: ${result.path}`, 'success'); }
    catch { showToast('Erreur export Excel', 'error'); }
}

// ==================== CLIENT IMPORT ====================
let _clientImportData = [];

async function openClientImportModal() {
    _clientImportData = [];
    document.getElementById('clientImportFile').value = '';
    document.getElementById('clientImportPreview').innerHTML = '';
    document.getElementById('clientImportMapping').style.display = 'none';
    document.getElementById('clientImportResult').innerHTML = '';
    document.getElementById('confirmClientImportBtn').disabled = true;
    document.getElementById('clientImportModal').classList.add('active');
}

async function previewClientImport(input) {
    const file = input.files?.[0];
    if (!file) return;
    showLoading('Lecture du fichier...');
    try {
        const result = await window.electronAPI.importXLSX({ filePath: file.path });
        hideLoading();
        if (!result.success || !result.data?.length) { showToast('Fichier vide ou invalide', 'error'); return; }
        _clientImportData = result.data;
        // Preview
        const headers = Object.keys(result.data[0]);
        let html = '<table class="data-table"><thead><tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>';
        result.data.slice(0, 5).forEach(row => {
            html += '<tr>' + headers.map(h => `<td>${escapeHtml(String(row[h]||''))}</td>`).join('') + '</tr>';
        });
        if (result.data.length > 5) html += `<tr><td colspan="${headers.length}" style="text-align:center;color:#9ca3af;font-style:italic">...et ${result.data.length - 5} ligne(s)</td></tr>`;
        html += '</tbody></table>';
        document.getElementById('clientImportPreview').innerHTML = html;
        // Mapping
        const mappingArea = document.getElementById('clientImportMapping');
        mappingArea.style.display = 'block';
        ['mapName','mapMF','mapAddress','mapPhone','mapEmail'].forEach(id => {
            const sel = document.getElementById(id);
            sel.innerHTML = '<option value="">— Ignorer —</option>' + headers.map(h => `<option value="${h}" ${/nom|name/i.test(h) && id==='mapName' ? 'selected' : /mf|matricule|patente/i.test(h) && id==='mapMF' ? 'selected' : /adresse|address|addr/i.test(h) && id==='mapAddress' ? 'selected' : /t[eé]l|phone|mobile/i.test(h) && id==='mapPhone' ? 'selected' : /email|e-mail|mail/i.test(h) && id==='mapEmail' ? 'selected' : ''}>${escapeHtml(h)}</option>`).join('');
        });
        document.getElementById('confirmClientImportBtn').disabled = false;
        document.getElementById('clientImportResult').innerHTML = `<span style="color:var(--success)">✓ ${result.data.length} ligne(s) détectée(s)</span>`;
    } catch (e) { hideLoading(); showToast('Erreur: ' + e.message, 'error'); }
}

async function confirmClientImport() {
    if (!_clientImportData.length) return;
    const getName = (row) => row[document.getElementById('mapName').value] || '';
    const getMF = (row) => row[document.getElementById('mapMF').value] || '';
    const getAddr = (row) => row[document.getElementById('mapAddress').value] || '';
    const getPhone = (row) => row[document.getElementById('mapPhone').value] || '';
    const getEmail = (row) => row[document.getElementById('mapEmail').value] || '';
    const btn = document.getElementById('confirmClientImportBtn');
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Importation...'; if (window.lucide) lucide.createIcons();
    let success = 0, errors = 0;
    for (const row of _clientImportData) {
        const name = getName(row);
        if (!name) { errors++; continue; }
        try {
            await window.electronAPI.saveClient({ userId: currentUser.id, name, mf: getMF(row), address: getAddr(row), phone: getPhone(row), email: getEmail(row) });
            success++;
        } catch { errors++; }
    }
    document.getElementById('clientImportResult').innerHTML = `<div style="padding:12px;border-radius:8px;font-weight:600;text-align:center;background:${errors?'#fef2f2':'#f0fdf4'};color:${errors?'#b91c1c':'#166534'}">${success} importé(s)${errors?`, ${errors} erreur(s)`:''}</div>`;
    btn.innerHTML = '<i data-lucide="check"></i> Terminé';
    await loadClients();
    setTimeout(() => closeModal('clientImportModal'), 2000);
}

async function exportClientsXLSX() {
    const data = allClients.map(c => ({ 'Nom': c.name, 'MF': c.mf || '', 'Adresse': c.address || '', 'Téléphone': c.phone || '', 'Email': c.email || '' }));
    const result = await window.electronAPI.exportXLSX({ data, headers: ['Nom','MF','Adresse','Téléphone','Email'], filename: 'clients.xlsx' });
    if (result?.success) showToast('Excel exporté', 'success');
}

// ==================== COMPANY ====================
let currentCompanySettings = null;

async function loadCompanyPage() {
    try {
        const c = await window.electronAPI.getCompany(currentUser.id) || {};
        const fields = { companyName: c.name || currentUser.company || '', companyMF: c.mf || currentUser.mf || '', companyAddress: c.address || '', companyPhone: c.phone || '', companyEmail: c.email || '', companyRC: c.rc || '', companyWebsite: c.website || '', companyBank: c.bank || '' };
        Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
        document.getElementById('companyProfileName').textContent = c.name || currentUser.company || 'Votre Entreprise';
        document.getElementById('companyProfileMF').textContent = (c.mf || currentUser.mf) ? `Matricule Fiscal: ${c.mf || currentUser.mf}` : 'Matricule Fiscal: —';

        // Display Toggles
        const setToggle = (id, val) => { const el = document.getElementById(id); if (el) el.checked = (val !== 0); };
        setToggle('compShowLogo', c.show_logo);
        setToggle('compShowStamp', c.show_stamp);
        setToggle('compShowSignature', c.show_signature);
        setToggle('compShowQR', c.show_qr);
        setToggle('compShowAccent', c.show_accent);
        const loadImg = (data, prevId, phId, boxId) => {
            const pv = document.getElementById(prevId), ph = document.getElementById(phId), bx = document.getElementById(boxId);
            if (data && pv) { pv.src = data; pv.classList.remove('hidden'); if (ph) ph.classList.add('hidden'); if (bx) bx.classList.add('has-image'); }
            else if (pv) { pv.src = ''; pv.classList.add('hidden'); if (ph) ph.classList.remove('hidden'); if (bx) bx.classList.remove('has-image'); }
        };
        loadImg(c.logo_image, 'companyLogoPreview', 'companyLogoPlaceholder', 'companyLogoBox');
        loadImg(c.stamp_image, 'companyStampPreview', 'companyStampPlaceholder', 'companyStampBox');
        loadImg(c.signature_image, 'companySignaturePreview', 'companySignaturePlaceholder', 'companySignatureBox');
        if (c.logo_image) logoImage = c.logo_image;
        if (c.stamp_image) stampImage = c.stamp_image;
        if (c.signature_image) signatureImage = c.signature_image;
        currentCompanySettings = c;
    } catch (e) { console.error('Error loading company:', e); }
}

async function saveCompanySettings() {
    const get = id => document.getElementById(id).value.trim();
    const isChecked = id => document.getElementById(id).checked ? 1 : 0;
    const settings = {
        userId: currentUser.id, name: get('companyName'), mf: get('companyMF'), address: get('companyAddress'),
        phone: get('companyPhone'), email: get('companyEmail'), rc: get('companyRC'), website: get('companyWebsite'),
        bank: get('companyBank'), logoImage, stampImage, signatureImage,
        show_logo: isChecked('compShowLogo'), show_stamp: isChecked('compShowStamp'),
        show_signature: isChecked('compShowSignature'), show_qr: isChecked('compShowQR'), show_accent: isChecked('compShowAccent')
    };
    try { await window.electronAPI.saveCompany(settings); showToast('Informations entreprise enregistrées', 'success'); await loadCompanyPage(); }
    catch { showToast("Erreur d'enregistrement", 'error'); }
}

// ==================== BACKUP ====================
async function loadSettings() {
    try {
        const settings = await window.electronAPI.getBackupSettings();
        document.getElementById('backupEnabled').checked = settings.enabled || false;
        document.getElementById('backupFrequency').value = settings.frequency || 'daily';
        document.getElementById('backupTime').value = settings.time || '02:00';
        document.getElementById('backupKeep').value = settings.keepCount || 10;
        await loadBackupList();
    } catch { }
    if (typeof loadPdfOutputFolder === 'function') loadPdfOutputFolder();
    const autoBackup = localStorage.getItem('tuni_autobackup') === 'true';
    const cb = document.getElementById('autoBackupOnSave');
    if (cb) cb.checked = autoBackup;
}

function toggleAutoBackupOnSave(el) {
    localStorage.setItem('tuni_autobackup', el.checked);
}

async function loadBackupList() {
    try {
        const backups = await window.electronAPI.getBackupList();
        const container = document.getElementById('backupList');
        if (!backups?.length) { container.innerHTML = '<p style="color:#6b7280;font-size:0.9rem">Aucune sauvegarde disponible</p>'; return; }
        container.innerHTML = backups.map(b => `
            <div class="backup-item">
                <div class="backup-item-info">
                    <div class="backup-date">${new Date(b.created).toLocaleString('fr-FR')}</div>
                    <div class="backup-size">${(b.size / 1024 / 1024).toFixed(3)} MB</div>
                </div>
                <button class="btn btn-small btn-secondary" onclick="restoreBackup('${b.path}')">Restaurer</button>
            </div>`).join('');
    } catch { }
}

function switchSettingsTab(sectionId, btn) {
    document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
    document.querySelectorAll('.settings-sidebar-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else document.querySelector(`.settings-sidebar-btn[data-target="${sectionId}"]`)?.classList.add('active');
    localStorage.setItem('tuni_settings_tab', sectionId);
}

function restoreSettingsTab() {
    const saved = localStorage.getItem('tuni_settings_tab');
    if (saved) {
        const btn = document.querySelector(`.settings-sidebar-btn[data-target="${saved}"]`);
        if (btn) switchSettingsTab(saved, btn);
    }
}

async function saveBackupSettings() {
    const settings = { enabled: document.getElementById('backupEnabled').checked, frequency: document.getElementById('backupFrequency').value, time: document.getElementById('backupTime').value, keepCount: parseInt(document.getElementById('backupKeep').value) || 10 };
    try { await window.electronAPI.saveBackupSettings(settings); showToast('Paramètres de sauvegarde enregistrés', 'success'); }
    catch { showToast("Erreur d'enregistrement", 'error'); }
}

async function createManualBackup() {
    showLoading('Création de la sauvegarde...');
    try { const result = await window.electronAPI.createManualBackup(); if (result.success) { showToast('Sauvegarde créée', 'success'); await loadBackupList(); } }
    catch { showToast('Erreur de sauvegarde', 'error'); }
    finally { hideLoading(); }
}

async function restoreBackup(backupPath) {
    showConfirm('📤 Restaurer', 'Cela remplacera toutes les données actuelles. Continuer ?', async () => {
        showLoading('Restauration...');
        try { const result = await window.electronAPI.restoreBackup(backupPath); if (result.success) { showToast('Restauration terminée. Redémarrage...', 'success'); setTimeout(() => location.reload(), 2000); } }
        catch { showToast('Erreur de restauration', 'error'); }
        finally { hideLoading(); }
    }, 'Restaurer', 'btn-warning');
}


// ==================== THEME SETTINGS (legacy per-type colours) ====================
let currentTheme = {
    fontFamily: "'Segoe UI', sans-serif", fontSize: "14px",
    titles: { facture: { text: "FACTURE", color: "#1e3a8a" }, devis: { text: "DEVIS", color: "#92400e" }, bon: { text: "BON DE COMMANDE", color: "#065f46" } }
};

async function loadThemeSettings() {
    if (!currentUser) return;
    try {
        const settings = await window.electronAPI.getThemeSettings(currentUser.id);
        if (settings) { currentTheme = { ...currentTheme, ...settings }; applyThemeToUI(); updateThemePreview(); }
    } catch { }
}

function applyThemeToUI() {
    document.getElementById('docFontFamily').value = currentTheme.fontFamily;
    document.getElementById('docFontSize').value = currentTheme.fontSize;
    document.getElementById('titleFacture').value = currentTheme.titles.facture.text;
    document.getElementById('colorFacture').value = currentTheme.titles.facture.color;
    document.getElementById('colorFactureHex').textContent = currentTheme.titles.facture.color;
    document.getElementById('titleDevis').value = currentTheme.titles.devis.text;
    document.getElementById('colorDevis').value = currentTheme.titles.devis.color;
    document.getElementById('colorDevisHex').textContent = currentTheme.titles.devis.color;
    document.getElementById('titleBon').value = currentTheme.titles.bon.text;
    document.getElementById('colorBon').value = currentTheme.titles.bon.color;
    document.getElementById('colorBonHex').textContent = currentTheme.titles.bon.color;
}

function updateThemePreview() {
    ['Facture', 'Devis', 'Bon'].forEach(n => {
        const id = n === 'Bon' ? 'colorBon' : `color${n}`;
        document.getElementById(id + 'Hex').textContent = document.getElementById(id).value;
    });
    const font = document.getElementById('docFontFamily').value, size = document.getElementById('docFontSize').value;
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
            devis: { text: document.getElementById('titleDevis').value, color: document.getElementById('colorDevis').value },
            bon: { text: document.getElementById('titleBon').value, color: document.getElementById('colorBon').value }
        }
    };
    try { await window.electronAPI.saveThemeSettings({ userId: currentUser.id, theme: themeData }); currentTheme = themeData; showToast('Thème enregistré', 'success'); }
    catch { showToast('Erreur', 'error'); }
}

function resetThemeDefaults() {
    document.getElementById('docFontFamily').value = '\'Segoe UI\', sans-serif'; document.getElementById('docFontSize').value = '14px';
    document.getElementById('titleFacture').value = 'FACTURE'; document.getElementById('colorFacture').value = '#1e3a8a';
    document.getElementById('titleDevis').value = 'DEVIS'; document.getElementById('colorDevis').value = '#92400e';
    document.getElementById('titleBon').value = 'BON DE COMMANDE'; document.getElementById('colorBon').value = '#065f46';
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
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('themeColorPrimary', t.colors.primary);
    setVal('themeColorSecondary', t.colors.secondary);
    setVal('themeColorBg', t.colors.bg);
    setVal('themeColorSurface', t.colors.surface);
    setVal('themeColorBorder', t.colors.border);
    setVal('themeHeaderFont', t.fonts.header);
    setVal('themeBodyFont', t.fonts.body);
    setVal('themeFontSize', t.fonts.size);
    setVal('themeHeaderStyle', t.headerStyle);
    setVal('themeTableStyle', t.tableStyle);
    setVal('themeFooterLayout', t.footerLayout);
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
    setChk('themeShowLogo', t.showLogo);
    setChk('themeShowStamp', t.showStamp);
    setChk('themeShowSignature', t.showSignature);
    setChk('themeShowQrCode', t.showQrCode);
    setChk('themeAccentLine', t.accentLine);
    updateDocumentThemePreview();
}

function applyPresetTheme(themeId) {
    const preset = DEFAULT_THEMES[themeId];
    if (!preset) return;
    currentDocumentTheme = JSON.parse(JSON.stringify(preset));
    loadDocumentThemeSettings();
    showToast(`Thème "${preset.label}" appliqué`, 'success');
}

function updateDocumentThemePreview() {
    const previewEl = document.getElementById('docThemePreview');
    if (!previewEl) return;
    const primary = document.getElementById('themeColorPrimary')?.value || '#1e3a8a';
    const secondary = document.getElementById('themeColorSecondary')?.value || '#334155';
    const bg = document.getElementById('themeColorBg')?.value || '#ffffff';
    const surface = document.getElementById('themeColorSurface')?.value || '#f8fafc';
    const border = document.getElementById('themeColorBorder')?.value || '#e2e8f0';
    const hFont = document.getElementById('themeHeaderFont')?.value || 'sans-serif';
    const bFont = document.getElementById('themeBodyFont')?.value || 'sans-serif';
    const hStyle = document.getElementById('themeHeaderStyle')?.value || 'left';
    const tableStyle = document.getElementById('themeTableStyle')?.value || 'bordered';
    const accent = currentCompanySettings?.show_accent !== 0;

    previewEl.innerHTML = `
        <div style="font-family:${bFont};color:${secondary};background:${bg};padding:20px;border:1px solid ${border};border-radius:6px;font-size:12px">
            ${accent ? `<div style="height:3px;background:linear-gradient(90deg,${primary},${primary}88);margin-bottom:12px"></div>` : ''}
            <div style="display:flex;justify-content:${hStyle === 'center' ? 'center' : hStyle === 'right' ? 'flex-end' : 'space-between'};align-items:flex-start;margin-bottom:12px">
                <div>
                    <div style="font-family:${hFont};font-size:18px;font-weight:700;color:${primary}">FACTURE</div>
                    <div style="width:30px;height:2px;background:${primary};margin-top:4px"></div>
                    <div style="font-size:10px;color:${secondary};margin-top:4px;font-weight:600">Entreprise SARL</div>
                </div>
                <div style="text-align:right;font-size:10px;color:${secondary}">
                    <div><strong># FAC-2026-001</strong></div><div>Date: 17/04/2026</div>
                </div>
            </div>
            <div style="font-size:10px;background:${tableStyle === 'striped' ? surface : 'transparent'};padding:4px 6px;border:${tableStyle === 'bordered' ? `1px solid ${border}` : 'none'};border-bottom:2px solid ${primary}">
                <strong style="color:${primary}">Description</strong>&nbsp;&nbsp;
                <strong style="color:${primary}">Qté</strong>&nbsp;&nbsp;
                <strong style="color:${primary}">Total</strong>
            </div>
            <div style="font-size:10px;padding:4px 6px;border:${tableStyle === 'bordered' ? `1px solid ${border}` : 'none'};border-top:none;background:${surface}">Prestation de service&nbsp;&nbsp;1&nbsp;&nbsp;1,000.000</div>
            <div style="text-align:right;margin-top:8px;font-size:11px;font-weight:700;color:${primary}">Total TTC: 1,190.000 TND</div>
        </div>`;
}

function getDocTypeLabel(type) {
    const labels = {
        facture: 'Facture',
        devis: 'Devis',
        bon: 'Bon de Commande',
        bl: 'Bon de Livraison',
        ba: "Bon d'Achat",
        bs: 'Bon de Sortie',
        be: "Bon d'Entrée",
        avoir: "Facture d'Avoir"
    };
    return labels[type] || type.toUpperCase();
}

async function saveDocumentTheme() {
    const getVal = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const getChk = id => { const el = document.getElementById(id); return el ? el.checked : false; };
    const theme = {
        id: 'custom', label: 'Personnalisé', icon: '🎨',
        colors: {
            primary: getVal('themeColorPrimary'),
            secondary: getVal('themeColorSecondary'),
            accent: getVal('themeColorPrimary'),
            bg: getVal('themeColorBg'),
            surface: getVal('themeColorSurface'),
            border: getVal('themeColorBorder'),
            text: '#1e293b', textLight: '#64748b'
        },
        fonts: { header: getVal('themeHeaderFont'), body: getVal('themeBodyFont'), size: getVal('themeFontSize') },
        headerStyle: getVal('themeHeaderStyle'),
        tableStyle: getVal('themeTableStyle'),
        footerLayout: getVal('themeFooterLayout'),
        showLogo: currentCompanySettings?.show_logo !== 0,
        showStamp: currentCompanySettings?.show_stamp !== 0,
        showSignature: currentCompanySettings?.show_signature !== 0,
        showQrCode: currentCompanySettings?.show_qr !== 0,
        accentLine: currentCompanySettings?.show_accent !== 0,
        borderRadius: '4px'
    };
    try {
        await window.electronAPI.saveDocumentTheme({ userId: currentUser.id, theme });
        currentDocumentTheme = theme;
        showToast('Thème de document enregistré', 'success');
    } catch { showToast('Erreur sauvegarde thème', 'error'); }
}

// ==================== CONTRACTS ====================
const CONTRACT_TYPES = {
    cdi: { label: 'CDI', icon: 'clipboard-list', desc: 'Durée Indéterminée' },
    cdd: { label: 'CDD', icon: 'file-text', desc: 'Durée Déterminée' },
    essai: { label: "Période d'Essai", icon: 'search', desc: "Contrat d'essai" },
    prestation: { label: 'Prestation de service', icon: '🤝', desc: 'Prestation de services' },
    alternance: { label: 'Alternance', icon: '🎓', desc: "Contrat d'alternance" },
    stage: { label: 'Stage', icon: '🏫', desc: 'Convention de stage' },
    freelance: { label: 'Freelance', icon: '💻', desc: 'Indépendant' },
    interim: { label: 'Intérim', icon: '⏱️', desc: 'Mission intérimaire' },
    parttime: { label: 'Temps partiel', icon: 'clock', desc: 'À temps partiel' },
    consulting: { label: 'Consulting', icon: 'bar-chart-3', desc: 'Conseil & expertise' }
};

async function loadContracts() {
    if (!currentUser) return;
    try { allContracts = await window.electronAPI.getContracts(currentUser.id); renderContractsTable(allContracts); }
    catch { showToast('Erreur chargement contrats', 'error'); }
}

function renderContractsTable(contracts) {
    const container = document.getElementById('contractsTable');
    if (!contracts?.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📃</div><h3>Aucun contrat</h3><p>Créez votre premier contrat en choisissant un type ci-dessus</p></div>`; return; }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>Numéro</th><th>Salarié / Prestataire</th><th>Employeur</th><th>Date début</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
        ${contracts.map(c => `<tr>
            <td><span class="badge badge-contract">${CONTRACT_TYPES[c.type]?.label || c.type}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${c.number}</td>
            <td style="font-weight:600">${escapeHtml(c.employeeName) || '—'}</td>
            <td>${escapeHtml(c.employerName) || '—'}</td>
            <td>${formatDate(c.startDate)}</td>
            <td><span class="badge badge-${c.status === 'signé' ? 'active' : 'pending'}">${c.status || 'brouillon'}</span></td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="previewContract('${c.id}')"      title="Aperçu">👁️</button>
                <button class="btn-icon btn-edit"   onclick="editContract('${c.id}')"         title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadContractPDF('${c.id}')"  title="PDF"><i data-lucide="file-text" class="lucide-sm"></i></button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteContract('${c.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

function openNewContractModal(type) {
    editingContractId = null;
    document.getElementById('contractType').value = type;
    document.getElementById('contractModalTitle').innerHTML = `<i data-lucide="${CONTRACT_TYPES[type]?.icon || 'file-text'}" class="lucide-sm"></i> ${CONTRACT_TYPES[type]?.label || type}`;
    window.electronAPI.getCompany(currentUser.id).then(c => {
        if (c) { document.getElementById('cEmployerName').value = c.name || ''; document.getElementById('cEmployerMF').value = c.mf || ''; document.getElementById('cEmployerAddress').value = c.address || ''; }
    }).catch(() => { });
    const showEnd = ['cdd', 'essai', 'prestation', 'freelance', 'stage', 'consulting', 'alternance', 'interim'].includes(type);
    document.getElementById('cEndDateGroup').style.display = showEnd ? 'block' : 'none';
    document.getElementById('cTrialGroup').style.display = ['cdi', 'parttime'].includes(type) ? 'block' : 'none';
    ['cEmployeeeName', 'cEmployeeCIN', 'cEmployeeAddress', 'cEmployeeRole', 'cEmployeeDept', 'cEmployerRep', 'cEmployerRepRole', 'cStartDate', 'cEndDate', 'cSalary', 'cWorkLocation', 'cNoticePeriod', 'cTrialDuration', 'cExtraClauses', 'cNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('cSalaryType').value = 'mensuel'; document.getElementById('cWorkHours').value = '40'; document.getElementById('cTrialPeriod').checked = false;
    document.getElementById('contractModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeContractModal() { document.getElementById('contractModal').classList.remove('active'); editingContractId = null; }

async function saveContract() {
    const employeeName = document.getElementById('cEmployeeeName').value.trim();
    const employerName = document.getElementById('cEmployerName').value.trim();
    if (!employeeName || !employerName) { showToast('Employeur et Salarié sont requis', 'warning'); return; }
    const data = {
        id: editingContractId || undefined, userId: currentUser.id,
        type: document.getElementById('contractType').value,
        employerName, employerMF: document.getElementById('cEmployerMF').value.trim(), employerAddress: document.getElementById('cEmployerAddress').value.trim(),
        employerRep: document.getElementById('cEmployerRep').value.trim(), employerRepRole: document.getElementById('cEmployerRepRole').value.trim(),
        employeeName, employeeCIN: document.getElementById('cEmployeeCIN').value.trim(), employeeAddress: document.getElementById('cEmployeeAddress').value.trim(),
        employeeRole: document.getElementById('cEmployeeRole').value.trim(), employeeDepartment: document.getElementById('cEmployeeDept').value.trim(),
        startDate: document.getElementById('cStartDate').value, endDate: document.getElementById('cEndDate').value || null,
        salary: parseFloat(document.getElementById('cSalary').value) || null, salaryType: document.getElementById('cSalaryType').value,
        workHours: parseFloat(document.getElementById('cWorkHours').value) || 40, workLocation: document.getElementById('cWorkLocation').value.trim(),
        trialPeriod: document.getElementById('cTrialPeriod').checked, trialDuration: document.getElementById('cTrialDuration').value.trim(),
        noticePeriod: document.getElementById('cNoticePeriod').value.trim(), extraClauses: document.getElementById('cExtraClauses').value.trim(),
        notes: document.getElementById('cNotes').value.trim(), status: 'brouillon', employerLogo: logoImage || null
    };
    try {
        const result = await window.electronAPI.saveContract(data);
        if (result.success) { showToast(editingContractId ? 'Contrat mis à jour' : 'Contrat créé', 'success'); closeContractModal(); await loadContracts(); }
        else showToast(result.error || 'Erreur', 'error');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function editContract(id) {
    const c = allContracts.find(x => x.id === id);
    if (!c) return;
    editingContractId = id;
    document.getElementById('contractType').value = c.type;
    document.getElementById('contractModalTitle').textContent = `✏️ Modifier — ${CONTRACT_TYPES[c.type]?.label || c.type}`;
    document.getElementById('cEndDateGroup').style.display = ['cdd', 'essai', 'prestation', 'freelance', 'stage', 'consulting', 'alternance', 'interim'].includes(c.type) ? 'block' : 'none';
    document.getElementById('cTrialGroup').style.display = ['cdi', 'parttime'].includes(c.type) ? 'block' : 'none';
    const fields = { cEmployerName: c.employerName, cEmployerMF: c.employerMF, cEmployerAddress: c.employerAddress, cEmployerRep: c.employerRep, cEmployerRepRole: c.employerRepRole, cEmployeeeName: c.employeeName, cEmployeeCIN: c.employeeCIN, cEmployeeAddress: c.employeeAddress, cEmployeeRole: c.employeeRole, cEmployeeDept: c.employeeDepartment, cStartDate: c.startDate, cEndDate: c.endDate, cSalary: c.salary, cWorkHours: c.workHours, cWorkLocation: c.workLocation, cNoticePeriod: c.noticePeriod, cTrialDuration: c.trialDuration, cExtraClauses: c.extraClauses, cNotes: c.notes };
    Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val || ''; });
    document.getElementById('cSalaryType').value = c.salaryType || 'mensuel';
    document.getElementById('cTrialPeriod').checked = c.trialPeriod || false;
    document.getElementById('contractModal').classList.add('active');
}

function buildContractHTMLFromData(c) {
    if (typeof window.buildContractHTML === 'function') return window.buildContractHTML({ ...c, employerLogo: logoImage });
    return `<p>Contrat: ${c.number}</p>`;
}

async function previewContract(id) {
    const c = allContracts.find(x => x.id === id);
    if (!c) return;
    const html = buildContractHTMLFromData(c);
    document.getElementById('previewContent').innerHTML = `<div style="padding:40px;font-family:serif">${html.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}</div>`;
    document.getElementById('previewModal').classList.add('active');
}

async function downloadContractPDF(id) {
    const c = allContracts.find(x => x.id === id);
    if (!c) return;
    const html = buildContractHTMLFromData(c);
    const filename = `${c.number}-${(c.employeeName || 'contrat').replace(/\s+/g, '-')}.pdf`;
    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename });
        if (result.success) showToast('Contrat PDF enregistré', 'success');
        else if (!result.canceled) showToast('Erreur PDF', 'error');
    } catch (e) { showToast('Erreur PDF: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

function confirmDeleteContract(id) {
    const c = allContracts.find(x => x.id === id);
    showConfirm('Supprimer', `Supprimer le contrat ${c?.number} ?`, async () => {
        try { await window.electronAPI.deleteContract(id); showToast('Contrat supprimé', 'info'); await loadContracts(); }
        catch { showToast('Erreur suppression', 'error'); }
    });
}

function filterContracts() {
    const q = document.getElementById('searchContracts').value.toLowerCase();
    const type = document.getElementById('filterContractType').value;
    renderContractsTable(allContracts.filter(c => {
        const mQ = !q || (c.employeeName || '').toLowerCase().includes(q) || (c.number || '').toLowerCase().includes(q);
        const mT = !type || c.type === type;
        return mQ && mT;
    }));
}





// ==================== AUTO-UPDATER UI ====================
let updateBannerShown = false;

function initUpdaterListener() {
    if (!window.electronAPI?.onUpdaterEvent) return;
    window.electronAPI.onUpdaterEvent((payload) => {
        const { event, version, percent, message } = payload;
        if (event === 'available' && !updateBannerShown) {
            updateBannerShown = true;
            showUpdateBanner(version, 'downloading');
        }
        if (event === 'progress') {
            const bar = document.getElementById('updateProgressBar');
            const pct = document.getElementById('updateProgressPct');
            if (bar) bar.style.width = percent + '%';
            if (pct) pct.textContent = percent + '%';
        }
        if (event === 'downloaded') {
            showUpdateBanner(version, 'ready');
        }
        if (event === 'error') {
            console.warn('[updater]', message);
        }
    });
}

function showUpdateBanner(version, state) {
    let banner = document.getElementById('updateBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'updateBanner';
        banner.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;background:#1e293b;color:#f1f5f9;border-radius:12px;padding:14px 18px;box-shadow:0 8px 32px rgba(0,0,0,0.35);min-width:280px;max-width:340px;font-size:0.875rem;transition:all 0.3s';
        document.body.appendChild(banner);
    }
    if (state === 'downloading') {
        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:1.2rem">⬇️</span>
                <div>
                    <div style="font-weight:700">Mise à jour ${version}</div>
                    <div style="color:#94a3b8;font-size:0.8rem">Téléchargement en cours…</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-left:auto;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem">×</button>
            </div>
            <div style="background:#334155;border-radius:4px;height:6px;overflow:hidden">
                <div id="updateProgressBar" style="background:#3b82f6;height:6px;width:0%;transition:width 0.3s"></div>
            </div>
            <div id="updateProgressPct" style="text-align:right;color:#94a3b8;font-size:0.75rem;margin-top:4px">0%</div>`;
    } else {
        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:1.3rem">🎉</span>
                <div style="flex:1">
                    <div style="font-weight:700">Version ${version} prête !</div>
                    <div style="color:#94a3b8;font-size:0.8rem">Redémarrer pour mettre à jour</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
                <button onclick="window.electronAPI.installUpdate()" style="flex:1;background:#3b82f6;color:white;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:0.8rem;font-weight:600">🔄 Redémarrer</button>
                <button onclick="this.parentElement.parentElement.remove()" style="background:#334155;color:#94a3b8;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:0.8rem">Plus tard</button>
            </div>`;
    }
}

// Show current version in settings
async function loadAppVersion() {
    try {
        const v = await window.electronAPI.getAppVersion();
        const el = document.getElementById('appVersionLabel');
        if (el) el.textContent = `TuniInvoice Pro v${v}`;
    } catch { }
}

async function manualCheckUpdate() {
    showToast('Vérification des mises à jour…', 'info', 2500);
    try {
        const r = await window.electronAPI.checkForUpdates();
        if (r.success && r.version) showToast(`Mise à jour ${r.version} trouvée, téléchargement…`, 'success');
        else showToast("Vous avez déjà la dernière version.", 'info');
    } catch { showToast('Impossible de vérifier les mises à jour.', 'warning'); }
}

// ==================== GLOBAL SEARCH ====================
let searchDebounce = null;
function globalSearchHandler() {
    clearTimeout(searchDebounce);
    const q = document.getElementById('globalSearch')?.value?.trim();
    if (!q || q.length < 2) { closeGlobalSearchResults(); return; }
    searchDebounce = setTimeout(() => runGlobalSearch(q), 280);
}

async function runGlobalSearch(query) {
    try {
        const results = await window.electronAPI.searchDocuments({ userId: currentUser.id, query });
        renderGlobalSearchResults(results, query);
    } catch { }
}

function renderGlobalSearchResults(results, query) {
    let box = document.getElementById('globalSearchResults');
    if (!box) {
        box = document.createElement('div');
        box.id = 'globalSearchResults';
        box.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:1000;max-height:320px;overflow-y:auto;margin-top:4px';
        document.querySelector('.topbar-search').style.position = 'relative';
        document.querySelector('.topbar-search').appendChild(box);
    }
    if (!results.length) {
        box.innerHTML = `<div style="padding:16px;color:var(--text-muted);text-align:center;font-size:0.875rem">Aucun résultat pour "<strong>${escapeHtml(query)}</strong>"</div>`;
        return;
    }
    box.innerHTML = results.map(doc => `
        <div onclick="openDocFromSearch('${doc.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <span class="badge badge-${doc.type}" style="min-width:56px;text-align:center">${doc.type.toUpperCase()}</span>
            <div style="flex:1">
                <div style="font-weight:600;font-size:0.875rem">${escapeHtml(doc.number)}</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">${escapeHtml(doc.clientName)} · ${formatDate(doc.date)}</div>
            </div>
            <div style="font-size:0.875rem;font-weight:600;color:var(--primary)">${formatAmount(doc.totalTTC)} ${doc.currency}</div>
        </div>`).join('');
}

function closeGlobalSearchResults() {
    document.getElementById('globalSearchResults')?.remove();
}

async function openDocFromSearch(docId) {
    closeGlobalSearchResults();
    document.getElementById('globalSearch').value = '';
    const result = await window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: 999999 });
    allDocuments = result.rows || [];
    const doc = allDocuments.find(d => d.id === docId);
    if (doc) { populateFormWithDoc(doc); generatePreviewHTML(); document.getElementById('previewModal').classList.add('active'); }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-search')) closeGlobalSearchResults();
});

// ==================== NOTES (Sticky Notes) ====================
let allNotes = [];
const NOTE_COLORS = ['#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3', '#ede9fe', '#ffedd5', '#f1f5f9'];

async function loadNotes() {
    try {
        allNotes = await window.electronAPI.getNotes(currentUser.id);
        renderNotes();
    } catch { }
}

function renderNotes() {
    const container = document.getElementById('notesGrid');
    if (!container) return;
    if (!allNotes.length) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">
            <div style="font-size:2.5rem;margin-bottom:8px"><i data-lucide="edit-3" style="width:40px;height:40px;color:var(--text-light)"></i></div>
            <div style="font-weight:600">Aucune note</div>
            <div style="font-size:0.875rem">Cliquez sur "Nouvelle note" pour commencer</div>
        </div>`; if (window.lucide) lucide.createIcons();
        return;
    }
    container.innerHTML = allNotes.map(note => `
        <div class="note-card" style="background:${note.color || '#fef9c3'};border-radius:12px;padding:16px;position:relative;min-height:120px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
            ${note.pinned ? `<div style="position:absolute;top:10px;right:36px;font-size:0.9rem"><i data-lucide="pin" style="width:14px;height:14px"></i></div>` : ''}
            <button onclick="deleteNote('${note.id}')" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#6b7280;font-size:1rem;opacity:0.6" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
            <div onclick="openNoteModal('${note.id}')" style="cursor:pointer">
                ${note.title ? `<div style="font-weight:700;font-size:0.95rem;margin-bottom:6px;color:#1e293b">${escapeHtml(note.title)}</div>` : ''}
                <div style="font-size:0.875rem;color:#374151;white-space:pre-wrap;line-height:1.5">${escapeHtml(note.content || '').substring(0, 200)}${(note.content || '').length > 200 ? '…' : ''}</div>
                <div style="margin-top:8px;font-size:0.75rem;color:#9ca3af">${formatDate(note.updated_at?.split('T')[0] || note.updated_at)}</div>
            </div>
        </div>`).join('');
    if (window.lucide) lucide.createIcons();
}

let editingNoteId = null;
function openNoteModal(noteId) {
    editingNoteId = noteId || null;
    const note = noteId ? allNotes.find(n => n.id === noteId) : null;
    document.getElementById('noteTitle').value = note?.title || '';
    document.getElementById('noteContent').value = note?.content || '';
    document.getElementById('notePinned').checked = note?.pinned || false;
    const colorPicker = document.getElementById('noteColorPicker');
    if (colorPicker) {
        colorPicker.innerHTML = NOTE_COLORS.map(c =>
            `<div onclick="selectNoteColor('${c}')" style="width:24px;height:24px;border-radius:50%;background:${c};cursor:pointer;border:${(note?.color || '#fef9c3') === c ? '3px solid #1e293b' : '2px solid transparent'}" data-color="${c}"></div>`
        ).join('');
    }
    document.getElementById('selectedNoteColor').value = note?.color || '#fef9c3';
    document.getElementById('noteModal').classList.add('active');
}

function selectNoteColor(color) {
    document.getElementById('selectedNoteColor').value = color;
    document.querySelectorAll('#noteColorPicker > div').forEach(el => {
        el.style.border = el.dataset.color === color ? '3px solid #1e293b' : '2px solid transparent';
    });
}

function closeNoteModal() { document.getElementById('noteModal').classList.remove('active'); editingNoteId = null; }

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    if (!title && !content) { showToast('Contenu de la note requis', 'warning'); return; }
    try {
        await window.electronAPI.saveNote({
            id: editingNoteId || undefined,
            userId: currentUser.id,
            title, content,
            color: document.getElementById('selectedNoteColor').value || '#fef9c3',
            pinned: document.getElementById('notePinned').checked
        });
        showToast(editingNoteId ? 'Note mise à jour' : 'Note créée', 'success');
        closeNoteModal();
        await loadNotes();
    } catch { showToast('Erreur sauvegarde note', 'error'); }
}

async function deleteNote(id) {
    try { await window.electronAPI.deleteNote(id); showToast('Note supprimée', 'info'); await loadNotes(); }
    catch { showToast('Erreur suppression', 'error'); }
}

// ==================== REMINDERS ====================
let allReminders = [];

async function loadReminders() {
    try {
        allReminders = await window.electronAPI.getReminders(currentUser.id);
        renderReminders();
        updateReminderBadge();
    } catch { }
}

function renderReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;
    const pending = allReminders.filter(r => !r.done);
    const done = allReminders.filter(r => r.done);
    if (!allReminders.length) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
            <div style="font-size:2.5rem;margin-bottom:8px"><i data-lucide="clock" style="width:40px;height:40px;color:var(--text-light)"></i></div>
            <div style="font-weight:600">Aucun rappel</div>
        </div>`;
        return;
    }
    const renderGroup = (items, label) => items.length ? `
        <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 8px">${label} (${items.length})</div>
        ${items.map(r => {
        const overdue = !r.done && new Date(`${r.dueDate}T${r.dueTime || '09:00'}`) < new Date();
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;margin-bottom:6px;background:${r.done ? '#f8fafc' : overdue ? '#fff1f2' : 'white'};border:1px solid ${r.done ? '#e5e7eb' : overdue ? '#fecaca' : '#e5e7eb'}">
                <input type="checkbox" ${r.done ? 'checked' : ''} onchange="toggleReminder('${r.id}',this.checked)" style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer">
                <div style="flex:1">
                    <div style="font-weight:600;font-size:0.875rem;color:${r.done ? '#9ca3af' : '#1e293b'};text-decoration:${r.done ? 'line-through' : 'none'}">${escapeHtml(r.title)}</div>
                    ${r.description ? `<div style="font-size:0.8rem;color:#6b7280">${escapeHtml(r.description)}</div>` : ''}
                    <div style="font-size:0.75rem;color:${overdue && !r.done ? '#ef4444' : '#9ca3af'}">${overdue && !r.done ? '<i data-lucide="alert-triangle" style="width:12px;height:12px;color:#ef4444"></i> En retard — ' : ''}${formatDate(r.dueDate)} à ${r.dueTime || '09:00'}</div>
                </div>
                <button onclick="deleteReminder('${r.id}')" style="background:none;border:none;cursor:pointer;color:#9ca3af"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
            </div>`;
    }).join('')}` : '';

    container.innerHTML = renderGroup(pending, 'À faire') + renderGroup(done, 'Terminés');
    if (window.lucide) lucide.createIcons();
}

function updateReminderBadge() {
    const badge = document.getElementById('reminderBadge');
    if (!badge) return;
    const overdue = allReminders.filter(r => !r.done && new Date(`${r.dueDate}T${r.dueTime || '09:00'}`) < new Date()).length;
    badge.textContent = overdue || '';
    badge.style.display = overdue ? 'flex' : 'none';
}

async function toggleReminder(id, checked) {
    try {
        if (checked) await window.electronAPI.markReminderDone(id);
        await loadReminders();
    } catch { showToast('Erreur', 'error'); }
}

async function deleteReminder(id) {
    try { await window.electronAPI.deleteReminder(id); await loadReminders(); showToast('Rappel supprimé', 'info'); }
    catch { showToast('Erreur suppression', 'error'); }
}

function openReminderModal(prefill) {
    const f = prefill || {};
    document.getElementById('reminderTitle').value = f.title || '';
    document.getElementById('reminderDesc').value = f.description || '';
    document.getElementById('reminderDate').value = f.dueDate || new Date().toISOString().split('T')[0];
    document.getElementById('reminderTime').value = f.dueTime || '09:00';
    document.getElementById('reminderEntityType').value = f.entityType || '';
    document.getElementById('reminderEntityId').value = f.entityId || '';
    document.getElementById('reminderModal').classList.add('active');
}
function closeReminderModal() { document.getElementById('reminderModal').classList.remove('active'); }

async function saveReminder() {
    const title = document.getElementById('reminderTitle').value.trim();
    const date = document.getElementById('reminderDate').value;
    if (!title) { showToast('Titre du rappel requis', 'warning'); return; }
    if (!date) { showToast('Date requise', 'warning'); return; }
    try {
        await window.electronAPI.saveReminder({
            userId: currentUser.id, title, date,
            description: document.getElementById('reminderDesc').value.trim(),
            dueDate: date,
            dueTime: document.getElementById('reminderTime').value || '09:00',
            entityType: document.getElementById('reminderEntityType').value || null,
            entityId: document.getElementById('reminderEntityId').value || null
        });
        showToast('Rappel créé', 'success');
        closeReminderModal();
        await loadReminders();
    } catch { showToast('Erreur création rappel', 'error'); }
}

// Listen for reminder:due events pushed by main process
if (window.electronAPI?.onReminderDue) {
    window.electronAPI.onReminderDue((r) => {
        showToast(`Rappel : ${r.title}`, 'warning', 8000);
        loadReminders();
    });
}

// ==================== DUPLICATE DOCUMENT ====================
async function duplicateDocument(docId) {
    try {
        const result = await window.electronAPI.duplicateDocument({ docId, userId: currentUser.id });
        if (result.success) {
            showToast(`Document dupliqué : ${result.document.number}`, 'success');
            await loadDocuments();
        }
    } catch (e) { showToast('Erreur duplication', 'error'); }
}


// ==================== ANNUAL REPORT ====================
let annualReportYear = new Date().getFullYear();

async function loadAnnualReport() {
    const el = document.getElementById('page-annual');
    if (!el?.classList.contains('active')) return;
    try {
        document.getElementById('annualReportYear').textContent = annualReportYear;
        const data = await window.electronAPI.getAnnualStats({ userId: currentUser.id, year: annualReportYear });
        renderAnnualReport(data);
    } catch { }
}

function renderAnnualReport(data) {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthMap = {};
    (data.monthly || []).forEach(m => { monthMap[m.month] = m; });

    // Revenue by month table
    const table = document.getElementById('annualMonthlyTable');
    if (table) {
        table.innerHTML = `<table style="width:100%"><thead><tr>
            <th>Mois</th><th style="text-align:right">Documents</th><th style="text-align:right">Revenus TTC</th>
        </tr></thead><tbody>
        ${monthNames.map((name, i) => {
            const key = String(i + 1).padStart(2, '0');
            const row = monthMap[key] || { count: 0, revenue: 0 };
            return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:8px 0">${name}</td>
                <td style="text-align:right;color:var(--text-muted)">${row.count || 0}</td>
                <td style="text-align:right;font-weight:600;color:var(--primary)">${formatAmount(row.revenue || 0)} TND</td>
            </tr>`;
        }).join('')}
        <tr style="background:var(--bg-secondary);font-weight:700">
            <td style="padding:10px 0">TOTAL ${annualReportYear}</td>
            <td style="text-align:right">${data.monthly.reduce((s, m) => s + (m.count || 0), 0)}</td>
            <td style="text-align:right;color:var(--primary)">${formatAmount(data.totalRevenue)} TND</td>
        </tr></tbody></table>`;
    }

    // Canvas bar chart
    renderAnnualBarChart(data.monthly || [], monthNames);

    // Top clients
    const topEl = document.getElementById('annualTopClients');
    if (topEl) {
        topEl.innerHTML = (data.topClients || []).map((c, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="width:24px;height:24px;border-radius:50%;background:var(--primary);color:white;font-size:0.75rem;font-weight:700;display:flex;align-items:center;justify-content:center">${i + 1}</div>
                <div style="flex:1;font-size:0.875rem;font-weight:600">${escapeHtml(c.client_name)}</div>
                <div style="font-size:0.875rem;color:var(--primary);font-weight:700">${formatAmount(c.revenue)} TND</div>
            </div>`).join('') || '<p style="color:var(--text-muted);font-size:0.875rem">Aucune donnée</p>';
    }
}

function renderAnnualBarChart(monthly, monthNames) {
    const canvas = document.getElementById('annualRevenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const monthMap = {};
    monthly.forEach(m => { monthMap[m.month] = parseFloat(m.revenue); });
    const values = Array.from({ length: 12 }, (_, i) => monthMap[String(i + 1).padStart(2, '0')] || 0);
    const max = Math.max(...values, 1);
    const W = canvas.width, H = canvas.height;
    const pad = { top: 20, right: 10, bottom: 44, left: 60 };
    const cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;
    ctx.clearRect(0, 0, W, H);
    // Grid
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (cH / 4) * i;
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
        const val = max - (max / 4) * i;
        ctx.fillStyle = '#9ca3af'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0), pad.left - 4, y + 4);
    }
    const barW = cW / 12 * 0.6, gap = cW / 12;
    const primary = currentDocumentTheme?.colors?.primary || '#3b82f6';
    values.forEach((v, i) => {
        const x = pad.left + gap * i + (gap - barW) / 2;
        const bH = (v / max) * cH, y = pad.top + cH - bH;
        const grad = ctx.createLinearGradient(0, y, 0, y + bH);
        grad.addColorStop(0, primary); grad.addColorStop(1, primary + '66');
        ctx.fillStyle = v > 0 ? grad : '#f1f5f9';
        if (ctx.roundRect) ctx.roundRect(x, y, barW, Math.max(bH, 2), 3); else ctx.rect(x, y, barW, Math.max(bH, 2));
        ctx.fill();
        ctx.fillStyle = '#6b7280'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(monthNames[i].slice(0, 3), x + barW / 2, pad.top + cH + 14);
    });
}

function changeReportYear(delta) {
    annualReportYear += delta;
    loadAnnualReport();
}

// ==================== AUDIT LOG ====================
let _allAuditLogEntries = [];

async function loadAuditLog() {
    if (!currentUser) return;
    try {
        _allAuditLogEntries = await window.electronAPI.getActivityLog(currentUser.id);
        renderAuditLogTable(_allAuditLogEntries);
    } catch { showToast('Erreur chargement journal', 'error'); }
}

function renderAuditLogTable(entries) {
    const container = document.getElementById('auditLogTable');
    if (!container) return;
    if (!entries || !entries.length) {
        container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-light)">Aucune activité enregistrée</div>';
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>Date</th><th>Action</th><th>Détails</th></tr></thead><tbody>';
    entries.forEach(e => {
        html += `<tr>
            <td style="white-space:nowrap">${formatDate(e.created_at)}</td>
            <td><span class="badge badge-${e.action?.includes('supprim') || e.action?.includes('delete') ? 'danger' : e.action?.includes('cré') || e.action?.includes('create') ? 'success' : 'info'}">${escapeHtml(e.action)}</span></td>
            <td style="color:var(--text-light);font-size:0.85rem">${escapeHtml(e.details || '')}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterAuditLog() {
    const q = (document.getElementById('searchAuditLog')?.value || '').toLowerCase();
    if (!q) { renderAuditLogTable(_allAuditLogEntries); return; }
    const filtered = _allAuditLogEntries.filter(e =>
        (e.action || '').toLowerCase().includes(q) ||
        (e.details || '').toLowerCase().includes(q)
    );
    renderAuditLogTable(filtered);
}

async function clearActivityLog() {
    if (!await confirmModal('Vider le journal d\'activité ?', 'Cette action est irréversible.')) return;
    try {
        await window.electronAPI.clearActivityLog();
        _allAuditLogEntries = [];
        renderAuditLogTable([]);
        showToast('Journal vidé', 'success');
    } catch { showToast('Erreur', 'error'); }
}
// ==================== RECURRING INVOICES ====================
let _editingRecurringId = null;

function loadRecurringInvoices() {
    const container = document.getElementById('recurringInvoicesList');
    if (!container) return;
    window.electronAPI.getRecurringInvoices(currentUser.id).then(list => {
        if (!list || !list.length) {
            container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-light)">Aucune facture récurrente configurée</div>';
            return;
        }
        let html = '<table class="data-table"><thead><tr><th>Client</th><th>Type</th><th>Fréquence</th><th>Jour</th><th>Prochaine</th><th>Actions</th></tr></thead><tbody>';
        list.forEach(r => {
            const clientName = (allClients.find(c => c.id === r.client_id) || {}).name || r.client_id;
            const items = (r.items_template ? (typeof r.items_template === 'string' ? JSON.parse(r.items_template) : r.items_template) : []);
            const total = items.reduce((s, line) => { const p = line.split('|').map(x => x.trim()); return s + (parseFloat(p[2]) || 0) * (parseFloat(p[1]) || 1); }, 0);
            html += `<tr>
                <td>${escapeHtml(clientName)}</td>
                <td>${escapeHtml(r.doc_type)}</td>
                <td>${r.frequency}</td>
                <td>${r.day_of_month || '-'}</td>
                <td>${r.next_run ? formatDate(r.next_run) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="editRecurringInvoice('${r.id}')"><i data-lucide="edit-3" style="width:14px;height:14px"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteRecurringInvoice('${r.id}')"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    }).catch(() => {});
}

async function openRecurringModal() {
    _editingRecurringId = null;
    document.getElementById('recurringModalTitle').textContent = 'Nouvelle Récurrence';
    document.getElementById('recDocType').value = 'facture';
    const sel = document.getElementById('recClientId');
    sel.innerHTML = '<option value="">Sélectionner un client</option>';
    (allClients || []).forEach(c => {
        sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)} ${c.mf ? '(' + escapeHtml(c.mf) + ')' : ''}</option>`;
    });
    document.getElementById('recFrequency').value = 'monthly';
    document.getElementById('recDayOfMonth').value = '15';
    document.getElementById('recItemsTemplate').value = '';
    document.getElementById('recCurrency').value = 'TND';
    document.getElementById('recPaymentMode').value = 'Virement bancaire';
    document.getElementById('recurringModal').classList.add('active');
    document.getElementById('recurringModal').querySelector('input')?.focus();
}

async function editRecurringInvoice(id) {
    try {
        const list = await window.electronAPI.getRecurringInvoices(currentUser.id);
        const r = list.find(x => x.id === id);
        if (!r) return;
        _editingRecurringId = id;
        document.getElementById('recurringModalTitle').textContent = 'Modifier la Récurrence';
        document.getElementById('recDocType').value = r.doc_type || 'facture';
        const sel = document.getElementById('recClientId');
        sel.innerHTML = '<option value="">Sélectionner un client</option>';
        (allClients || []).forEach(c => {
            sel.innerHTML += `<option value="${c.id}" ${c.id === r.client_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`;
        });
        document.getElementById('recFrequency').value = r.frequency || 'monthly';
        document.getElementById('recDayOfMonth').value = String(r.day_of_month || 15);
        document.getElementById('recItemsTemplate').value = (r.items_template || []).join('\n');
        document.getElementById('recCurrency').value = r.currency || 'TND';
        document.getElementById('recPaymentMode').value = r.payment_mode || 'Virement bancaire';
        document.getElementById('recurringModal').classList.add('active');
    } catch { showToast('Erreur', 'error'); }
}

async function saveRecurringInvoice() {
    const data = {
        userId: currentUser.id,
        clientId: parseInt(document.getElementById('recClientId').value),
        docType: document.getElementById('recDocType').value,
        frequency: document.getElementById('recFrequency').value,
        dayOfMonth: parseInt(document.getElementById('recDayOfMonth').value),
        itemsTemplate: document.getElementById('recItemsTemplate').value.split('\n').filter(Boolean),
        currency: document.getElementById('recCurrency').value,
        paymentMode: document.getElementById('recPaymentMode').value,
    };
    if (!data.clientId) { showToast('Veuillez sélectionner un client', 'error'); return; }
    try {
        if (_editingRecurringId) data.id = _editingRecurringId;
        await window.electronAPI.saveRecurringInvoice(data);
        closeModal('recurringModal');
        loadRecurringInvoices();
        showToast('Récurrence enregistrée', 'success');
    } catch { showToast('Erreur', 'error'); }
}

async function deleteRecurringInvoice(id) {
    if (!await confirmModal('Supprimer cette récurrence ?', 'Les factures déjà générées ne seront pas affectées.')) return;
    try {
        await window.electronAPI.deleteRecurringInvoice(id);
        loadRecurringInvoices();
        showToast('Récurrence supprimée', 'success');
    } catch { showToast('Erreur', 'error'); }
}
// ==================== RETENUE À LA SOURCE ====================
let allRetenues = [];
let editingRetenueId = null;

async function loadRetenues() {
    if (!currentUser) return;
    try {
        allRetenues = await window.electronAPI.getRetenues(currentUser.id);
        renderRetenuesTable(allRetenues);
    } catch (e) { showToast('Erreur chargement retenues', 'error'); }
}

function renderRetenuesTable(retenues) {
    const container = document.getElementById('retenuesTable');
    if (!container) return;
    if (!retenues.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="receipt" style="width:40px;height:40px;color:var(--text-light)"></i></div><h3>Aucun certificat</h3><p>Créez votre premier certificat de retenue à la source</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr>
        <th>N°</th><th>Date</th><th>Période</th><th>Bénéficiaire</th>
        <th>Montant Brut</th><th>Taux</th><th>Montant Retenu</th><th>Statut</th><th>Actions</th>
    </tr></thead><tbody>
        ${retenues.map(r => `<tr>
            <td style="font-family:monospace;font-size:0.82rem">${escapeHtml(r.number)}</td>
            <td>${formatDate(r.date)}</td>
            <td>${['', 'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sep.', 'Oct.', 'Nov.', 'Déc.'][r.month] || r.month} ${r.year}</td>
            <td style="font-weight:600">${escapeHtml(r.beneficiaireName)}</td>
            <td>${formatAmount(r.montantBrut)} TND</td>
            <td style="font-weight:600;color:#92400e">${r.tauxRetenue}%</td>
            <td style="font-weight:700;color:#b45309">${formatAmount(r.montantRetenue)} TND</td>
            <td><span class="badge" style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:6px;font-size:0.75rem">${r.status || 'emis'}</span></td>
            <td class="actions-cell">
                <button class="btn-icon btn-view"   onclick="previewRetenue('${r.id}')"        title="Aperçu">👁️</button>
                <button class="btn-icon btn-edit"   onclick="editRetenue('${r.id}')"           title="Modifier">✏️</button>
                <button class="btn-icon btn-pdf"    onclick="downloadRetenuePDF('${r.id}')"    title="PDF"><i data-lucide="file-text" class="lucide-sm"></i></button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteRetenue('${r.id}')"  title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td>
        </tr>`).join('')}
    </tbody></table>`;
    if (window.lucide) lucide.createIcons();
}

function filterRetenues() {
    const q = document.getElementById('searchRetenues').value.toLowerCase();
    const year = document.getElementById('filterRetenueYear').value;
    renderRetenuesTable(allRetenues.filter(r => {
        const mQ = !q || (r.number || '').toLowerCase().includes(q) || (r.beneficiaireName || '').toLowerCase().includes(q) || (r.retenuerName || '').toLowerCase().includes(q);
        const mY = !year || String(r.year) === year;
        return mQ && mY;
    }));
}

async function openRetenueModal(prefill) {
    editingRetenueId = null;
    const today = new Date();
    document.getElementById('rDate').value = today.toISOString().split('T')[0];
    document.getElementById('rMonth').value = String(today.getMonth() + 1);
    document.getElementById('rRetenuerName').value = '';
    document.getElementById('rRetenuerMF').value = '';
    document.getElementById('rRetenuerAddress').value = '';
    document.getElementById('rRetenuerRep').value = '';
    document.getElementById('rBeneficiaireName').value = '';
    document.getElementById('rBeneficiaireMF').value = '';
    document.getElementById('rBeneficiaireAddress').value = '';
    document.getElementById('rBeneficiaireRib').value = '';
    document.getElementById('rFactureNumber').value = '';
    document.getElementById('rFactureDate').value = '';
    document.getElementById('rMontantBrut').value = '';
    document.getElementById('rMontantRetenue').value = '';
    document.getElementById('rTaux').value = '1.5';
    document.getElementById('rNatureRevenu').value = 'Honoraires et commissions';
    document.getElementById('rNotes').value = '';
    // Pre-fill company info
    try {
        const c = await window.electronAPI.getCompany(currentUser.id) || {};
        document.getElementById('rRetenuerName').value = c.name || currentUser.company || '';
        document.getElementById('rRetenuerMF').value = c.mf || currentUser.mf || '';
        document.getElementById('rRetenuerAddress').value = c.address || '';
    } catch { }
    if (prefill) {
        if (prefill.beneficiaireName) document.getElementById('rBeneficiaireName').value = prefill.beneficiaireName;
        if (prefill.beneficiaireMF) document.getElementById('rBeneficiaireMF').value = prefill.beneficiaireMF;
        if (prefill.factureNumber) document.getElementById('rFactureNumber').value = prefill.factureNumber;
        if (prefill.factureDate) document.getElementById('rFactureDate').value = prefill.factureDate;
        if (prefill.montantBrut) { document.getElementById('rMontantBrut').value = prefill.montantBrut; calculateRetenueAmount(); }
    }
    document.getElementById('retenueModalTitle').textContent = '➕ Nouveau Certificat de Retenue';
    document.getElementById('retenueModal').classList.add('active');
}

function closeRetenueModal() {
    document.getElementById('retenueModal').classList.remove('active');
    editingRetenueId = null;
}

function calculateRetenueAmount() {
    const brut = parseFloat(document.getElementById('rMontantBrut').value) || 0;
    const taux = parseFloat(document.getElementById('rTaux').value) || 1.5;
    const retenu = Math.round(brut * (taux / 100) * 1000) / 1000;
    document.getElementById('rMontantRetenue').value = retenu.toFixed(3);
}

function collectRetenueData() {
    const get = id => document.getElementById(id)?.value || '';
    const brut = parseFloat(get('rMontantBrut')) || 0;
    const taux = parseFloat(get('rTaux')) || 1.5;
    const retenu = Math.round(brut * (taux / 100) * 1000) / 1000;
    const today = new Date();
    return {
        id: editingRetenueId || undefined,
        userId: currentUser.id,
        date: get('rDate') || today.toISOString().split('T')[0],
        year: today.getFullYear(),
        month: parseInt(get('rMonth')) || (today.getMonth() + 1),
        retenuerName: get('rRetenuerName'),
        retenuerMF: get('rRetenuerMF'),
        retenuerAddress: get('rRetenuerAddress'),
        retenuerRep: get('rRetenuerRep'),
        beneficiaireName: get('rBeneficiaireName'),
        beneficiaireMF: get('rBeneficiaireMF'),
        beneficiaireAddress: get('rBeneficiaireAddress'),
        beneficiaireRib: get('rBeneficiaireRib'),
        factureNumber: get('rFactureNumber') || null,
        factureDate: get('rFactureDate') || null,
        montantBrut: brut,
        tauxRetenue: taux,
        montantRetenue: retenu,
        natureRevenu: get('rNatureRevenu') || 'Honoraires et commissions',
        notes: get('rNotes') || null,
        logoImage: logoImage || null,
        stampImage: stampImage || null,
        signatureImage: signatureImage || null,
        status: 'emis'
    };
}

async function saveRetenue() {
    const data = collectRetenueData();
    if (!data.retenuerName) { showToast('La raison sociale de l\'entreprise est requise', 'warning'); return; }
    if (!data.beneficiaireName) { showToast('Le nom du bénéficiaire est requis', 'warning'); return; }
    if (!data.montantBrut) { showToast('Le montant brut est requis', 'warning'); return; }
    try {
        const result = await window.electronAPI.saveRetenue(data);
        if (result.success) {
            showToast(editingRetenueId ? 'Certificat mis à jour' : 'Certificat créé', 'success');
            closeRetenueModal();
            await loadRetenues();
        } else { showToast(result.error || 'Erreur lors de l\'enregistrement', 'error'); }
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function saveAndPrintRetenue() {
    const data = collectRetenueData();
    if (!data.retenuerName) { showToast('La raison sociale de l\'entreprise est requise', 'warning'); return; }
    if (!data.beneficiaireName) { showToast('Le nom du bénéficiaire est requis', 'warning'); return; }
    if (!data.montantBrut) { showToast('Le montant brut est requis', 'warning'); return; }
    try {
        const result = await window.electronAPI.saveRetenue(data);
        if (result.success) {
            closeRetenueModal();
            await loadRetenues();
            await downloadRetenuePDF(result.retenue.id);
        } else { showToast(result.error || 'Erreur', 'error'); }
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function editRetenue(id) {
    const r = allRetenues.find(x => x.id === id);
    if (!r) return;
    editingRetenueId = id;
    document.getElementById('rDate').value = r.date || '';
    document.getElementById('rMonth').value = String(r.month || 1);
    document.getElementById('rRetenuerName').value = r.retenuerName || '';
    document.getElementById('rRetenuerMF').value = r.retenuerMF || '';
    document.getElementById('rRetenuerAddress').value = r.retenuerAddress || '';
    document.getElementById('rRetenuerRep').value = r.retenuerRep || '';
    document.getElementById('rBeneficiaireName').value = r.beneficiaireName || '';
    document.getElementById('rBeneficiaireMF').value = r.beneficiaireMF || '';
    document.getElementById('rBeneficiaireAddress').value = r.beneficiaireAddress || '';
    document.getElementById('rBeneficiaireRib').value = r.beneficiaireRib || '';
    document.getElementById('rFactureNumber').value = r.factureNumber || '';
    document.getElementById('rFactureDate').value = r.factureDate || '';
    document.getElementById('rMontantBrut').value = r.montantBrut || '';
    document.getElementById('rTaux').value = String(r.tauxRetenue || 1.5);
    document.getElementById('rMontantRetenue').value = (r.montantRetenue || 0).toFixed(3);
    document.getElementById('rNatureRevenu').value = r.natureRevenu || 'Honoraires et commissions';
    document.getElementById('rNotes').value = r.notes || '';
    document.getElementById('retenueModalTitle').textContent = '✏️ Modifier le Certificat';
    document.getElementById('retenueModal').classList.add('active');
}

async function previewRetenue(id) {
    const r = allRetenues.find(x => x.id === id);
    if (!r) return;
    const html = buildRetenueHTMLFromData(r);
    document.getElementById('previewContent').innerHTML = html.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '');
    document.getElementById('previewModal').classList.add('active');
}

async function downloadRetenuePDF(id) {
    const r = allRetenues.find(x => x.id === id);
    if (!r) return;
    const html = buildRetenueHTMLFromData(r);
    const filename = `${r.number}.pdf`;
    showLoading('Génération du PDF...');
    try {
        const result = await window.electronAPI.savePDF({ html, filename });
        if (result.success) showToast('PDF Retenue enregistré', 'success');
        else if (!result.canceled) showToast('Erreur PDF', 'error');
    } catch (e) { showToast('Erreur PDF: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

function buildRetenueHTMLFromData(r) {
    // Use global buildRetenueHTML from retenue-builder.js if available
    if (typeof buildRetenueHTML === 'function') {
        return buildRetenueHTML(r, currentDocumentTheme);
    }
    // Fallback basic HTML
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Retenue ${r.number}</title></head><body style="font-family:sans-serif;padding:40px">
        <h1 style="color:#1e3a8a">CERTIFICAT DE RETENUE À LA SOURCE</h1>
        <h2>${escapeHtml(r.number)}</h2>
        <p><strong>Date:</strong> ${formatDate(r.date)} | <strong>Période:</strong> ${r.month}/${r.year}</p>
        <hr>
        <p><strong>Débiteur:</strong> ${escapeHtml(r.retenuerName)} (MF: ${escapeHtml(r.retenuerMF || '—')})</p>
        <p><strong>Bénéficiaire:</strong> ${escapeHtml(r.beneficiaireName)} (MF: ${escapeHtml(r.beneficiaireMF || '—')})</p>
        <hr>
        <p><strong>Montant Brut:</strong> ${(r.montantBrut || 0).toFixed(3)} TND</p>
        <p><strong>Taux RS:</strong> ${r.tauxRetenue}%</p>
        <p><strong>Montant Retenu:</strong> ${(r.montantRetenue || 0).toFixed(3)} TND</p>
        <p><strong>Nature:</strong> ${escapeHtml(r.natureRevenu || '')}</p>
        <p style="font-size:11px;color:#aaa;margin-top:40px">Document généré par TuniInvoice Pro</p>
    </body></html>`;
}

function confirmDeleteRetenue(id) {
    const r = allRetenues.find(x => x.id === id);
    showConfirm('Supprimer', `Supprimer le certificat ${r?.number} ?`, async () => {
        try {
            await window.electronAPI.deleteRetenue(id);
            showToast('Certificat supprimé', 'info');
            await loadRetenues();
        } catch { showToast('Erreur suppression', 'error'); }
    });
}

async function exportRetenuesToExcel() {
    try {
        const result = await window.electronAPI.exportExcelRetenues({ retenues: allRetenues });
        if (result.success) showToast(`Excel exporté: ${result.path}`, 'success');
    } catch { showToast('Erreur export Excel', 'error'); }
}

// ==================== RETENUE: OFFICIAL FIELDS ====================
function calculateRetenueAmount() {
    const brut = parseFloat(document.getElementById('rMontantBrut')?.value) || 0;
    const taux = parseFloat(document.getElementById('rTaux')?.value) || 1.5;
    const retenu = Math.round(brut * (taux / 100) * 1000) / 1000;
    const el = document.getElementById('rMontantRetenue');
    if (el) el.value = retenu.toFixed(3);
}

// Enhanced collectRetenueData (includes all new fields)
function collectRetenueData() {
    const get = id => document.getElementById(id)?.value || '';
    const brut = parseFloat(get('rMontantBrut')) || 0;
    const taux = parseFloat(get('rTaux')) || 1.5;
    const today = new Date();
    return {
        id: editingRetenueId || undefined,
        userId: currentUser.id,
        date: get('rDate') || today.toISOString().split('T')[0],
        year: today.getFullYear(),
        month: parseInt(get('rMonth')) || (today.getMonth() + 1),
        retenuerName: get('rRetenuerName'),
        retenuerMF: get('rRetenuerMF'),
        retenuerAddress: get('rRetenuerAddress'),
        retenuerRep: get('rRetenuerRep'),
        retenuerCodeTva: get('rRetenuerCodeTva'),
        retenuerCodeCat: get('rRetenuerCodeCat'),
        retenuerNEtab: get('rRetenuerNEtab'),
        beneficiaireName: get('rBeneficiaireName'),
        beneficiaireMF: get('rBeneficiaireMF'),
        beneficiaireAddress: get('rBeneficiaireAddress'),
        beneficiaireRib: get('rBeneficiaireRib'),
        beneficiaireCIN: get('rBeneficiaireCIN'),
        beneficiaireCodeTva: get('rBeneficiaireCodeTva'),
        beneficiaireCodeCat: get('rBeneficiaireCodeCat'),
        beneficiaireNEtab: get('rBeneficiaireNEtab'),
        factureNumber: get('rFactureNumber') || null,
        factureDate: get('rFactureDate') || null,
        montantBrut: brut,
        tauxRetenue: taux,
        montantRetenue: Math.round(brut * (taux / 100) * 1000) / 1000,
        natureRevenu: get('rNatureRevenu') || 'Honoraires et commissions',
        notes: get('rNotes') || null,
        logoImage: logoImage || null,
        stampImage: stampImage || null,
        signatureImage: signatureImage || null,
        status: 'emis'
    };
}

// Override openRetenueModal to clear new fields and prefill company
const originalOpenRetenue = window.openRetenueModal;
window.openRetenueModal = async function (prefill) {
    editingRetenueId = null;
    const today = new Date();
    document.getElementById('rDate').value = today.toISOString().split('T')[0];
    document.getElementById('rMonth').value = String(today.getMonth() + 1);
    const fields = ['rRetenuerName', 'rRetenuerMF', 'rRetenuerAddress', 'rRetenuerRep',
        'rRetenuerCodeTva', 'rRetenuerCodeCat', 'rRetenuerNEtab',
        'rBeneficiaireName', 'rBeneficiaireMF', 'rBeneficiaireAddress', 'rBeneficiaireRib',
        'rBeneficiaireCIN', 'rBeneficiaireCodeTva', 'rBeneficiaireCodeCat', 'rBeneficiaireNEtab',
        'rFactureNumber', 'rFactureDate', 'rMontantBrut', 'rTaux', 'rNatureRevenu', 'rNotes'];
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const c = await window.electronAPI.getCompany(currentUser.id) || {};
    document.getElementById('rRetenuerName').value = c.name || currentUser.company || '';
    document.getElementById('rRetenuerMF').value = c.mf || currentUser.mf || '';
    document.getElementById('rRetenuerAddress').value = c.address || '';
    if (prefill) {
        if (prefill.beneficiaireName) document.getElementById('rBeneficiaireName').value = prefill.beneficiaireName;
        if (prefill.beneficiaireMF) document.getElementById('rBeneficiaireMF').value = prefill.beneficiaireMF;
        if (prefill.factureNumber) document.getElementById('rFactureNumber').value = prefill.factureNumber;
        if (prefill.factureDate) document.getElementById('rFactureDate').value = prefill.factureDate;
        if (prefill.montantBrut) { document.getElementById('rMontantBrut').value = prefill.montantBrut; calculateRetenueAmount(); }
    }
    document.getElementById('retenueModalTitle').textContent = '➕ Nouveau Certificat de Retenue';
    document.getElementById('retenueModal').classList.add('active');
};

// Override editRetenue to load new fields
const originalEditRetenue = window.editRetenue;
window.editRetenue = async function (id) {
    const r = allRetenues.find(x => x.id === id);
    if (!r) return;
    editingRetenueId = id;
    document.getElementById('rDate').value = r.date || '';
    document.getElementById('rMonth').value = String(r.month || 1);
    document.getElementById('rRetenuerName').value = r.retenuerName || '';
    document.getElementById('rRetenuerMF').value = r.retenuerMF || '';
    document.getElementById('rRetenuerAddress').value = r.retenuerAddress || '';
    document.getElementById('rRetenuerRep').value = r.retenuerRep || '';
    document.getElementById('rRetenuerCodeTva').value = r.retenuerCodeTva || '';
    document.getElementById('rRetenuerCodeCat').value = r.retenuerCodeCat || '';
    document.getElementById('rRetenuerNEtab').value = r.retenuerNEtab || '';
    document.getElementById('rBeneficiaireName').value = r.beneficiaireName || '';
    document.getElementById('rBeneficiaireMF').value = r.beneficiaireMF || '';
    document.getElementById('rBeneficiaireAddress').value = r.beneficiaireAddress || '';
    document.getElementById('rBeneficiaireRib').value = r.beneficiaireRib || '';
    document.getElementById('rBeneficiaireCIN').value = r.beneficiaireCIN || '';
    document.getElementById('rBeneficiaireCodeTva').value = r.beneficiaireCodeTva || '';
    document.getElementById('rBeneficiaireCodeCat').value = r.beneficiaireCodeCat || '';
    document.getElementById('rBeneficiaireNEtab').value = r.beneficiaireNEtab || '';
    document.getElementById('rFactureNumber').value = r.factureNumber || '';
    document.getElementById('rFactureDate').value = r.factureDate || '';
    document.getElementById('rMontantBrut').value = r.montantBrut || '';
    document.getElementById('rTaux').value = String(r.tauxRetenue || 1.5);
    document.getElementById('rMontantRetenue').value = (r.montantRetenue || 0).toFixed(3);
    document.getElementById('rNatureRevenu').value = r.natureRevenu || 'Honoraires et commissions';
    document.getElementById('rNotes').value = r.notes || '';
    document.getElementById('retenueModalTitle').textContent = '✏️ Modifier le Certificat';
    document.getElementById('retenueModal').classList.add('active');
};

// Override saveRetenue to use new data
const originalSaveRetenue = window.saveRetenue;
window.saveRetenue = async function () {
    const data = collectRetenueData();
    if (!data.retenuerName) { showToast('Raison sociale du payeur requise', 'warning'); return; }
    if (!data.beneficiaireName) { showToast('Nom du bénéficiaire requis', 'warning'); return; }
    if (!data.montantBrut) { showToast('Montant brut requis', 'warning'); return; }
    try {
        const result = await window.electronAPI.saveRetenue(data);
        if (result.success) {
            showToast(editingRetenueId ? 'Certificat mis à jour' : 'Certificat créé', 'success');
            closeRetenueModal();
            await loadRetenues();
        } else { showToast(result.error || 'Erreur', 'error'); }
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
};

// ==================== TOOLS ====================
async function openFiscalCalculator() {
    try {
        const result = await window.electronAPI.openCalculator();
        if (!result.success) showToast('Erreur ouverture calculatrice', 'error');
    } catch (e) { showToast(e.message, 'error'); }
}

async function openRelanceGenerator() {
    const overdue = await window.electronAPI.getOverdueDocuments(currentUser.id);
    const select = document.getElementById('relanceDocSelect');
    if (!select) { showToast('Section relance non trouvée', 'error'); return; }
    select.innerHTML = '<option value="">-- Choisir une facture impayée --</option>';
    overdue.forEach(doc => {
        select.innerHTML += `<option value="${doc.id}">${doc.number} - ${doc.clientName} - ${formatAmount(doc.totalTTC - (doc.paidAmount || 0))} TND</option>`;
    });
    document.getElementById('relanceFactureSelect').style.display = 'block';
    document.getElementById('fiscalPeriodSelect').style.display = 'none';
}

async function generateRelancePDF() {
    const docId = document.getElementById('relanceDocSelect').value;
    if (!docId) { showToast('Sélectionnez une facture', 'warning'); return; }
    showLoading('Génération de la lettre...');
    try {
        const result = await window.electronAPI.generateRelanceLetter({ docId, userId: currentUser.id, attempt: 1 });
        if (result.success && result.html) {
            const filename = `relance_${docId}_${Date.now()}.pdf`;
            const pdfResult = await window.electronAPI.savePDF({ html: result.html, filename });
            if (pdfResult.success) showToast('Lettre de relance enregistrée', 'success');
        } else showToast('Erreur génération', 'error');
    } catch (e) { showToast(e.message, 'error'); }
    finally { hideLoading(); document.getElementById('relanceFactureSelect').style.display = 'none'; }
}

async function openFiscalSummary() {
    const yearSelect = document.getElementById('fiscalYearSelect');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let y = currentYear - 2; y <= currentYear; y++) {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }
    yearSelect.value = currentYear;
    document.getElementById('fiscalPeriodSelect').style.display = 'block';
    document.getElementById('relanceFactureSelect').style.display = 'none';
}

async function generateFiscalSummaryPDF() {
    const year = document.getElementById('fiscalYearSelect').value;
    const quarter = document.getElementById('fiscalQuarterSelect').value || null;
    showLoading('Génération du bilan fiscal...');
    try {
        const result = await window.electronAPI.generateFiscalSummary({ userId: currentUser.id, year, quarter });
        if (result.success && result.html) {
            const filename = `bilan_fiscal_${year}${quarter ? '_T' + quarter : ''}.pdf`;
            const pdfResult = await window.electronAPI.savePDF({ html: result.html, filename });
            if (pdfResult.success) showToast('Bilan fiscal enregistré', 'success');
        } else showToast('Erreur génération', 'error');
    } catch (e) { showToast(e.message, 'error'); }
    finally { hideLoading(); document.getElementById('fiscalPeriodSelect').style.display = 'none'; }
}

// ==================== ACHATS & DÉPENSES ====================
async function loadAchats() {
    if (!currentUser) return;
    try {
        allExpenses = await window.electronAPI.getExpenses(currentUser.id);
        renderExpensesTable(allExpenses);
        updateExpenseSummaryCards(allExpenses);
    } catch (e) { showToast('Erreur chargement dépenses', 'error'); }
}

function updateExpenseSummaryCards(expenses) {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const total = expenses.reduce((s, e) => s + (e.amountTTC || 0), 0);
    const month = expenses.filter(e => e.date && e.date.startsWith(thisMonth)).reduce((s, e) => s + (e.amountTTC || 0), 0);
    const tva = expenses.reduce((s, e) => s + ((e.amountTTC || 0) - (e.amountHT || 0)), 0);
    const ret = expenses.reduce((s, e) => s + (e.retenueSource || 0), 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = formatAmount(v) + ' TND'; };
    set('expensesTotalDisplay', total);
    set('expensesMonthDisplay', month);
    set('expensesTvaDisplay', tva);
    set('expensesRetenueDisplay', ret);
}

function filterExpenses() {
    const q = (document.getElementById('searchExpenses')?.value || '').toLowerCase();
    const cat = document.getElementById('filterExpenseCategory')?.value || '';
    const filtered = allExpenses.filter(e => {
        const mQ = !q || (e.vendor || '').toLowerCase().includes(q) || (e.reference || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
        const mC = !cat || e.category === cat;
        return mQ && mC;
    });
    renderExpensesTable(filtered);
}

function renderExpensesTable(expenses) {
    const container = document.getElementById('expensesTable');
    if (!expenses.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🛒</div><h3>Aucune dépense</h3><p>Ajoutez une dépense manuellement ou scannez un document</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr>
        <th>Date</th><th>Fournisseur</th><th>Catégorie</th><th>Type</th>
        <th>Montant TTC</th><th>Retenue</th><th>Réf.</th><th>Pièce jointe</th><th>Actions</th>
    </tr></thead><tbody>
    ${expenses.map(e => `<tr>
        <td>${formatDate(e.date)}</td>
        <td style="font-weight:600">${escapeHtml(e.vendor || '—')}</td>
        <td><span class="badge" style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:6px;font-size:0.75rem">${escapeHtml(e.category || '—')}</span></td>
        <td><span class="badge" style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:6px;font-size:0.75rem">${e.docType || 'facture'}</span></td>
        <td style="font-weight:600;color:#0f172a">${formatAmount(e.amountTTC)} TND</td>
        <td style="color:#ef4444">${e.retenueSource > 0 ? formatAmount(e.retenueSource) + ' TND' : '—'}</td>
        <td style="font-family:monospace;font-size:0.8rem">${escapeHtml(e.reference || '—')}</td>
        <td>${e.attachmentPath ? `<button class="btn-icon" onclick="viewAttachment('${e.attachmentPath.replace(/\\/g, '\\\\')}')" title="Aperçu">📎</button>` : '—'}</td>
        <td class="actions-cell">
            <button class="btn-icon btn-edit" onclick="openExpenseModal('${e.id}')" title="Modifier">✏️</button>
            <button class="btn-icon btn-delete" onclick="confirmDeleteExpense('${e.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
        </td>
    </tr>`).join('')}
    </tbody></table>`;
    if (window.lucide) lucide.createIcons();
}

async function viewAttachment(filePath) {
    const content = document.getElementById('attachmentPreviewContent');
    const modal = document.getElementById('attachmentPreviewModal');
    if (!content || !modal) return;
    content.innerHTML = '<p>Chargement de l\'aperçu...</p>';
    modal.classList.add('active');
    const ext = filePath.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
    const isPdf = ext === 'pdf';
    document.getElementById('attachmentPreviewDownloadBtn').onclick = () => {
        window.electronAPI.scannerOpenAttachment(filePath);
    };
    if (isImage) {
        content.innerHTML = `<img src="media://${filePath}" alt="Preview" style="max-width:100%;max-height:80vh">`;
    } else if (isPdf) {
        content.innerHTML = `<iframe src="media://${filePath}" style="width:100%;height:75vh;border:none"></iframe>`;
    } else {
        content.innerHTML = `<div style="text-align:center"><div style="font-size:3rem">📁</div><p>Aperçu non disponible</p></div>`;
    }
}
function closeAttachmentPreviewModal() { document.getElementById('attachmentPreviewModal').classList.remove('active'); }
window.viewAttachment = viewAttachment;
window.closeAttachmentPreviewModal = closeAttachmentPreviewModal;


// ==================== EXPENSE MODAL LOGIC ====================
let currentExpenseId = null;
let currentExpenseAttachment = null;

function openExpenseModal(id = null) {
    currentExpenseId = id;
    const form = document.getElementById('expenseForm');
    if (form) form.reset();

    const attName = document.getElementById('expAttachmentName');
    if (attName) attName.textContent = 'Aucun fichier sélectionné';

    currentExpenseAttachment = null;

    if (id && typeof id === 'string') {
        const title = document.getElementById('expenseModalTitle');
        if (title) title.textContent = '✏️ Modifier la Dépense';

        const exp = allExpenses.find(e => e.id === id);
        if (exp) {
            if (document.getElementById('expVendor')) document.getElementById('expVendor').value = exp.vendor || '';
            if (document.getElementById('expDate')) document.getElementById('expDate').value = exp.date || '';
            if (document.getElementById('expAmountTTC')) document.getElementById('expAmountTTC').value = exp.amountTTC || '';
            if (document.getElementById('expRetenue')) document.getElementById('expRetenue').value = exp.retenueSource || '';
            if (document.getElementById('expCategory')) document.getElementById('expCategory').value = exp.category || 'Autre';
            if (document.getElementById('expRef')) document.getElementById('expRef').value = exp.reference || '';
            if (exp.attachmentPath) {
                currentExpenseAttachment = exp.attachmentPath;
                if (attName) attName.textContent = exp.attachmentPath.split(/[\\/]/).pop();
            }
        }
    } else {
        const title = document.getElementById('expenseModalTitle');
        if (title) title.textContent = '➕ Nouvelle Dépense';
        const dateInput = document.getElementById('expDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    }

    const modal = document.getElementById('expenseModal');
    if (modal) modal.classList.add('active');
    initExpenseDropZone();
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) modal.classList.remove('active');
}

function initExpenseDropZone() {
    const dz = document.getElementById('expDropZone');
    if (!dz || dz.dataset.dropInit) return;
    dz.dataset.dropInit = '1';
    ['dragenter','dragover'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.style.borderColor = 'var(--primary)'; dz.style.background = 'var(--gray-50)'; }));
    ['dragleave','drop'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.style.borderColor = '#cbd5e1'; dz.style.background = '#f8fafc'; }));
    dz.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (!file.type.match(/image\/(png|jpe?g|gif|webp)|application\/pdf/)) { showToast('Format non supporté', 'error'); return; }
        const input = document.getElementById('expAttachment');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleExpenseAttachment(input);
    });
}

async function handleExpenseAttachment(input) {
    if (!input.files?.[0]) return;
    const file = input.files[0];
    const attName = document.getElementById('expAttachmentName');
    if (attName) attName.textContent = '⏳ Traitement...';

    try {
        const result = await window.electronAPI.scannerStoreFile(file.path);
        if (result.success) {
            currentExpenseAttachment = result.path;
            if (attName) attName.textContent = file.name;
        } else showToast('Erreur lors du stockage du fichier', 'error');
    } catch (e) { showToast('Erreur pièce jointe', 'error'); }
}

async function saveExpense() {
    const vendor = document.getElementById('expVendor')?.value.trim();
    const date = document.getElementById('expDate')?.value;
    const amount = parseFloat(document.getElementById('expAmountTTC')?.value) || 0;

    if (!vendor || !date || amount <= 0) {
        showToast('Veuillez remplir les champs obligatoires (*)', 'warning');
        return;
    }

    showLoading('Enregistrement...');
    try {
        const data = {
            id: currentExpenseId,
            userId: currentUser.id,
            vendor,
            date,
            amountTTC: amount,
            amountHT: amount / 1.19,
            retenueSource: parseFloat(document.getElementById('expRetenue')?.value) || 0,
            category: document.getElementById('expCategory')?.value || 'Autre',
            reference: document.getElementById('expRef')?.value.trim() || '',
            attachmentPath: currentExpenseAttachment
        };
        const result = await window.electronAPI.saveExpense(data);
        if (result.success) {
            showToast('Dépense enregistrée', 'success');
            closeExpenseModal();
            loadAchats();
        } else showToast('Erreur: ' + result.error, 'error');
    } catch (e) { showToast('Erreur lors de l\'enregistrement', 'error'); }
    finally { hideLoading(); }
}

function confirmDeleteExpense(id) {
    showConfirm('Supprimer la dépense', 'Voulez-vous vraiment supprimer cette dépense ? Cette action est irréversible.', async () => {
        try {
            const result = await window.electronAPI.deleteExpense(id);
            if (result.success) {
                showToast('Dépense supprimée', 'success');
                loadAchats();
            } else showToast('Erreur suppression: ' + result.error, 'error');
        } catch (e) { showToast('Erreur suppression', 'error'); }
    });
}

// ==================== SCANNER / OCR LOGIC ====================
let lastScannedData = null;

function openScannerModal() {
    const res = document.getElementById('scannerResult');
    const load = document.getElementById('scannerLoading');
    const drop = document.getElementById('scannerDropZone');
    const modal = document.getElementById('scannerModal');

    if (res) res.classList.add('hidden');
    if (load) load.classList.add('hidden');
    if (drop) drop.classList.remove('hidden');
    if (modal) modal.classList.add('active');
}

function closeScannerModal() {
    const modal = document.getElementById('scannerModal');
    if (modal) modal.classList.remove('active');
}

function parseOCRText(text) {
    const data = { vendor: '', date: '', amountTTC: '' };
    if (!text) return data;

    // 1. Vendor Extraction & Correction
    const low = text.toLowerCase();
    if (low.includes('ednfo') || low.includes('e-info') || low.includes('esnfo')) {
        data.vendor = 'E-info';
    } else {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            if (!/\d{2}[/-]\d{2}/.test(lines[i]) && !/facture|bon|devis/i.test(lines[i])) {
                data.vendor = lines[i].substring(0, 50).replace(/[^a-zA-Z0-9\s\-\.]/g, '');
                break;
            }
        }
    }

    // 2. Date Extraction (Searching everywhere)
    const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})/;
    const dateMatches = text.match(new RegExp(dateRegex, 'g'));
    if (dateMatches) {
        let d = dateMatches[0].replace(/\//g, '-');
        if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(d)) {
            const p = d.split('-');
            if (p[0].length <= 2 && p[2].length >= 2) { // DD-MM-YYYY
                const year = p[2].length === 2 ? '20' + p[2] : p[2];
                const day = p[0].padStart(2, '0');
                const month = p[1].padStart(2, '0');
                d = `${year}-${month}-${day}`;
            }
        }
        data.date = d;
    }

    // 3. Amount Extraction (Numbers + French Words)
    // Strategy A: French number detection (specific for Tunisian invoices)
    const frenchMap = {
        'cent': 100, 'deux cent': 200, 'trois cent': 300, 'quatre cent': 400, 'cinq cent': 500,
        'soixante dix-neuf': 79, 'quatre-vingt': 80, 'soixante': 60, 'cinquante': 50
    };

    let textAmount = 0;
    if (text.toLowerCase().includes('deux cent') && text.toLowerCase().includes('soixante dix-neuf')) textAmount = 279.000;
    else if (text.toLowerCase().includes('deux cent') && text.toLowerCase().includes('quatre-vingt')) textAmount = 280.000;

    // Strategy B: Clean numbers (avoiding bracketed item prices)
    const cleanText = text.replace(/\[.*?\]/g, ' '); // Remove item lines like [ ... | 21,000]
    const candidates = [];

    // Look for numbers near total keywords
    const keywords = ['net', 'somme', 'total', 'ttc', 'payer', 'tnd', 'dt', 'dinars'];
    keywords.forEach(kw => {
        const idx = text.toLowerCase().lastIndexOf(kw);
        if (idx !== -1) {
            const context = text.substring(idx - 10, idx + 60);
            const matches = context.match(/[\d\s,']+[.,]\d{3}/g);
            if (matches) {
                matches.forEach(m => {
                    const n = parseFloat(m.replace(/[\s,']/g, '').replace(',', '.'));
                    if (!isNaN(n) && n > 1) candidates.push(n);
                });
            }
        }
    });

    if (candidates.length > 0) {
        data.amountTTC = Math.max(...candidates);
    } else if (textAmount > 0) {
        data.amountTTC = textAmount;
    } else {
        // Fallback: Biggest number overall (excluding years and phone-like numbers)
        const allNums = text.match(/[\d\s,']+[.,]\d{3}/g);
        if (allNums) {
            const nums = allNums.map(m => parseFloat(m.replace(/[\s,']/g, '').replace(',', '.')))
                .filter(n => n > 1 && n < 10000 && n !== 2024 && n !== 2025);
            if (nums.length > 0) data.amountTTC = Math.max(...nums);
        }
    }

    return data;
}

async function processScannedImage(input) {
    if (!input.files?.[0]) return;
    const file = input.files[0];

    const drop = document.getElementById('scannerDropZone');
    const load = document.getElementById('scannerLoading');

    if (drop) drop.classList.add('hidden');
    if (load) load.classList.remove('hidden');

    try {
        const storeResult = await window.electronAPI.scannerStoreFile(file.path);
        if (!storeResult.success) throw new Error('Erreur stockage');

        const ocrResult = await window.electronAPI.scannerOcrImage(storeResult.path);
        if (ocrResult.success && ocrResult.text) {
            const rawEl = document.getElementById('ocrRawText');
            if (rawEl) rawEl.value = ocrResult.text;

            const parsedData = parseOCRText(ocrResult.text);
            lastScannedData = { ...parsedData, attachmentPath: storeResult.path };
            displayScannerResult(parsedData);
        } else {
            showToast('L\'analyse a échoué, remplissage manuel requis', 'warning');
            openExpenseModal();
            currentExpenseAttachment = storeResult.path;
            const attName = document.getElementById('expAttachmentName');
            if (attName) attName.textContent = file.name;
            closeScannerModal();
        }
        input.value = ''; // RESET INPUT FOR NEXT USE
    } catch (e) {
        showToast('Erreur scanner: ' + e.message, 'error');
        openScannerModal();
        input.value = '';
    } finally {
        if (load) load.classList.add('hidden');
    }
}

function displayScannerResult(data) {
    const summary = `
        <b>Fournisseur:</b> ${data.vendor || 'Non détecté'}<br>
        <b>Date:</b> ${data.date || 'Non détectée'}<br>
        <b>Montant:</b> ${data.amountTTC ? data.amountTTC + ' TND' : 'Non détecté'}
    `;
    const sumEl = document.getElementById('ocrSummary');
    const resEl = document.getElementById('scannerResult');
    if (sumEl) sumEl.innerHTML = summary;
    if (resEl) resEl.classList.remove('hidden');
}

function confirmScannerResult() {
    if (!lastScannedData) return;
    openExpenseModal();
    if (document.getElementById('expVendor')) document.getElementById('expVendor').value = lastScannedData.vendor || '';
    if (document.getElementById('expDate')) document.getElementById('expDate').value = lastScannedData.date || '';
    if (document.getElementById('expAmountTTC')) document.getElementById('expAmountTTC').value = lastScannedData.amountTTC || '';
    currentExpenseAttachment = lastScannedData.attachmentPath;
    const attName = document.getElementById('expAttachmentName');
    if (attName) attName.textContent = lastScannedData.attachmentPath.split(/[\\/]/).pop();
    closeScannerModal();
}

window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.saveExpense = saveExpense;
window.handleExpenseAttachment = handleExpenseAttachment;
window.openScannerModal = openScannerModal;
window.closeScannerModal = closeScannerModal;
window.processScannedImage = processScannedImage;
window.confirmScannerResult = confirmScannerResult;
window.confirmDeleteExpense = confirmDeleteExpense;

// ==================== HR LOGIC ====================
let allEmployees = [];
let allPayslips = [];
let editingEmployeeId = null;
let editingPayslipId = null;

async function loadHR() {
    if (!currentUser) return;
    try {
        allEmployees = await window.electronAPI.getEmployees(currentUser.id) || [];
        allPayslips = await window.electronAPI.getPayslips(currentUser.id) || [];
        renderEmployeesTable();
        renderPayslipsTable();
    } catch (e) {
        showToast('Erreur chargement RH', 'error');
    }
}

function switchHRTab(tab, btn) {
    document.querySelectorAll('#page-hr .auth-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('hrEmployeesSection').classList.toggle('hidden', tab !== 'employees');
    document.getElementById('hrPayslipsSection').classList.toggle('hidden', tab !== 'payslips');
}

function renderEmployeesTable() {
    const container = document.getElementById('employeesTable');
    if (!allEmployees.length) { container.innerHTML = '<div class="empty-state"><p>Aucun employé.</p></div>'; return; }
    container.innerHTML = `<table><thead><tr><th>Nom Complet</th><th>Poste</th><th>CIN</th><th>CNSS</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
        ${allEmployees.map(e => `<tr>
            <td style="font-weight:600">${escapeHtml(e.name)}</td>
            <td>${escapeHtml(e.role || '—')}</td>
            <td>${escapeHtml(e.cin || '—')}</td>
            <td>${escapeHtml(e.cnss || '—')}</td>
            <td><span class="badge ${e.active ? 'badge-paid' : 'badge-unpaid'}">${e.active ? 'Actif' : 'Inactif'}</span></td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" onclick="openEmployeeModal('${e.id}')" title="Modifier">✏️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteEmployee('${e.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td>
        </tr>`).join('')}
    </tbody></table>`;
    if (window.lucide) lucide.createIcons();
}

function renderPayslipsTable() {
    const container = document.getElementById('payslipsTable');
    if (!allPayslips.length) { container.innerHTML = '<div class="empty-state"><p>Aucune fiche de paie.</p></div>'; return; }
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    container.innerHTML = `<table><thead><tr><th>Employé</th><th>Période</th><th>Date</th><th>Brut</th><th>Net</th><th>Actions</th></tr></thead><tbody>
        ${allPayslips.map(p => `<tr>
            <td style="font-weight:600">${escapeHtml(p.employee_name)}</td>
            <td>${months[p.period_month - 1]} ${p.period_year}</td>
            <td>${formatDate(p.date)}</td>
            <td>${formatAmount(p.gross_salary)} TND</td>
            <td style="font-weight:700;color:#166534">${formatAmount(p.net_salary)} TND</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="previewPayslip('${p.id}')" title="Aperçu">👁️</button>
                <button class="btn-icon btn-download" onclick="savePayslipPDF('${p.id}')" title="Enregistrer PDF"><i data-lucide="save" class="lucide-sm"></i></button>
                <button class="btn-icon btn-edit" onclick="printPayslip('${p.id}')" title="Imprimer">🖨️</button>
                <button class="btn-icon btn-delete" onclick="confirmDeletePayslip('${p.id}')" title="Supprimer"><i data-lucide="trash-2" class="lucide-sm"></i></button>
            </td>
        </tr>`).join('')}
    </tbody></table>`;
    if (window.lucide) lucide.createIcons();
}

function openEmployeeModal(id = null) {
    editingEmployeeId = id;
    if (id) {
        const emp = allEmployees.find(e => e.id === id);
        if (emp) {
            document.getElementById('employeeModalTitle').textContent = '✏️ Modifier Employé';
            document.getElementById('empName').value = emp.name || '';
            document.getElementById('empRole').value = emp.role || '';
            document.getElementById('empDept').value = emp.department || '';
            document.getElementById('empHireDate').value = emp.hire_date || '';
            document.getElementById('empCin').value = emp.cin || '';
            document.getElementById('empCnss').value = emp.cnss || '';
            document.getElementById('empBaseSalary').value = emp.base_salary || 0;
            document.getElementById('empTransport').value = emp.transport_allowance || 0;
            document.getElementById('empOther').value = emp.other_allowances || 0;
            document.getElementById('empActive').checked = !!emp.active;
        }
    } else {
        document.getElementById('employeeModalTitle').textContent = '➕ Ajouter un Employé';
        document.getElementById('empName').value = '';
        document.getElementById('empRole').value = '';
        document.getElementById('empDept').value = '';
        document.getElementById('empHireDate').valueAsDate = new Date();
        document.getElementById('empCin').value = '';
        document.getElementById('empCnss').value = '';
        document.getElementById('empBaseSalary').value = 0;
        document.getElementById('empTransport').value = 0;
        document.getElementById('empOther').value = 0;
        document.getElementById('empActive').checked = true;
    }
    document.getElementById('employeeModal').classList.add('active');
}

function closeEmployeeModal() { document.getElementById('employeeModal').classList.remove('active'); }

async function saveEmployee() {
    const name = document.getElementById('empName').value.trim();
    if (!name) return showToast('Nom requis', 'warning');
    const data = {
        id: editingEmployeeId,
        userId: currentUser.id,
        name,
        role: document.getElementById('empRole').value.trim(),
        department: document.getElementById('empDept').value.trim(),
        hire_date: document.getElementById('empHireDate').value,
        cin: document.getElementById('empCin').value.trim(),
        cnss: document.getElementById('empCnss').value.trim(),
        base_salary: parseFloat(document.getElementById('empBaseSalary').value) || 0,
        transport_allowance: parseFloat(document.getElementById('empTransport').value) || 0,
        other_allowances: parseFloat(document.getElementById('empOther').value) || 0,
        active: document.getElementById('empActive').checked ? 1 : 0
    };
    try {
        await window.electronAPI.saveEmployee(data);
        showToast('Employé enregistré', 'success');
        closeEmployeeModal();
        loadHR();
    } catch (e) { showToast('Erreur', 'error'); }
}

function confirmDeleteEmployee(id) {
    showConfirm('Supprimer Employé', 'Supprimer cet employé ?', async () => {
        try {
            await window.electronAPI.deleteEmployee(id);
            showToast('Employé supprimé', 'info');
            loadHR();
        } catch { showToast('Erreur', 'error'); }
    });
}

function openPayslipModal() {
    const sel = document.getElementById('psEmployee');
    sel.innerHTML = '<option value="">— Sélectionner —</option>' +
        allEmployees.filter(e => e.active).map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
    document.getElementById('psDate').valueAsDate = new Date();
    document.getElementById('psMonth').value = new Date().getMonth() + 1;
    document.getElementById('psYear').value = new Date().getFullYear();
    document.getElementById('psBaseSalary').value = 0;
    document.getElementById('psTransport').value = 0;
    document.getElementById('psOther').value = 0;
    document.getElementById('psGrossSalary').value = '0.000';
    document.getElementById('psCnss').value = 0;
    document.getElementById('psIrpp').value = 0;
    document.getElementById('psNetSalary').value = '0.000';
    document.getElementById('payslipModal').classList.add('active');
}

function closePayslipModal() { document.getElementById('payslipModal').classList.remove('active'); }

function loadEmployeeDefaultsForPayslip() {
    const id = document.getElementById('psEmployee').value;
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;
    document.getElementById('psBaseSalary').value = emp.base_salary || 0;
    document.getElementById('psTransport').value = emp.transport_allowance || 0;
    document.getElementById('psOther').value = emp.other_allowances || 0;
    calculatePayslipTotals();
}

function calculatePayslipTotals() {
    const base = parseFloat(document.getElementById('psBaseSalary').value) || 0;
    const transport = parseFloat(document.getElementById('psTransport').value) || 0;
    const other = parseFloat(document.getElementById('psOther').value) || 0;
    const gross = base + transport + other;
    document.getElementById('psGrossSalary').value = gross.toFixed(3);
    updatePayslipNet();
}

function autoCalculateCNSS() {
    const base = parseFloat(document.getElementById('psBaseSalary').value) || 0;
    const other = parseFloat(document.getElementById('psOther').value) || 0;
    const grossSubjectToCnss = base + other;
    const cnss = grossSubjectToCnss * 0.0918;
    document.getElementById('psCnss').value = cnss.toFixed(3);
    updatePayslipNet();
}

function updatePayslipNet() {
    const gross = parseFloat(document.getElementById('psGrossSalary').value) || 0;
    const cnss = parseFloat(document.getElementById('psCnss').value) || 0;
    const irpp = parseFloat(document.getElementById('psIrpp').value) || 0;
    const net = gross - cnss - irpp;
    document.getElementById('psNetSalary').value = Math.max(0, net).toFixed(3);
}

async function savePayslip() {
    const empId = document.getElementById('psEmployee').value;
    if (!empId) return showToast('Sélectionnez un employé', 'warning');
    const data = {
        userId: currentUser.id,
        employee_id: empId,
        period_month: parseInt(document.getElementById('psMonth').value),
        period_year: parseInt(document.getElementById('psYear').value),
        date: document.getElementById('psDate').value,
        base_salary: parseFloat(document.getElementById('psBaseSalary').value) || 0,
        transport_allowance: parseFloat(document.getElementById('psTransport').value) || 0,
        other_allowances: parseFloat(document.getElementById('psOther').value) || 0,
        gross_salary: parseFloat(document.getElementById('psGrossSalary').value) || 0,
        cnss_deduction: parseFloat(document.getElementById('psCnss').value) || 0,
        irpp_deduction: parseFloat(document.getElementById('psIrpp').value) || 0,
        net_salary: parseFloat(document.getElementById('psNetSalary').value) || 0,
        status: 'unpaid'
    };
    try {
        await window.electronAPI.savePayslip(data);
        showToast('Fiche de paie générée', 'success');
        closePayslipModal();
        loadHR();
    } catch { showToast('Erreur', 'error'); }
}

function confirmDeletePayslip(id) {
    showConfirm('Supprimer', 'Supprimer cette fiche de paie ?', async () => {
        try {
            await window.electronAPI.deletePayslip(id);
            showToast('Fiche supprimée', 'info');
            loadHR();
        } catch { showToast('Erreur', 'error'); }
    });
}

async function printPayslip(id) {
    const payslip = allEmployees.length && allPayslips.find(p => p.id === id);
    if (!payslip) return;
    const employee = allEmployees.find(e => e.id === payslip.employee_id);
    const company = await window.electronAPI.getCompany(currentUser.id);

    try {
        const res = await window.electronAPI.buildPayslipHTML({ payslip, employee, company });
        if (res.success) {
            window.electronAPI.printPDF({ html: res.html });
        }
    } catch { showToast('Erreur impression', 'error'); }
}

async function previewPayslip(id) {
    const payslip = allPayslips.find(p => p.id === id);
    if (!payslip) return;
    const employee = allEmployees.find(e => e.id === payslip.employee_id);
    const company = await window.electronAPI.getCompany(currentUser.id);
    try {
        const res = await window.electronAPI.buildPayslipHTML({ payslip, employee, company });
        if (res.success) {
            document.getElementById('previewContent').innerHTML = res.html.replace(/<!DOCTYPE html>|<html[^>]*>|<\/html>|<head>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '');
            document.getElementById('previewModal').classList.add('active');
        }
    } catch { showToast('Erreur aperçu', 'error'); }
}

async function savePayslipPDF(id) {
    const payslip = allPayslips.find(p => p.id === id);
    if (!payslip) return;
    const employee = allEmployees.find(e => e.id === payslip.employee_id);
    const company = await window.electronAPI.getCompany(currentUser.id);
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const filename = `Fiche_de_paie_${employee.name.replace(/\s+/g, '_')}_${months[payslip.period_month - 1]}_${payslip.period_year}.pdf`;
    try {
        const res = await window.electronAPI.buildPayslipHTML({ payslip, employee, company });
        if (res.success) {
            await window.electronAPI.savePDF({ html: res.html, filename });
        }
    } catch { showToast('Erreur enregistrement PDF', 'error'); }
}

window.switchHRTab = switchHRTab;
window.openEmployeeModal = openEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.confirmDeleteEmployee = confirmDeleteEmployee;
window.openPayslipModal = openPayslipModal;
window.closePayslipModal = closePayslipModal;
window.loadEmployeeDefaultsForPayslip = loadEmployeeDefaultsForPayslip;
window.calculatePayslipTotals = calculatePayslipTotals;
window.autoCalculateCNSS = autoCalculateCNSS;
window.updatePayslipNet = updatePayslipNet;
window.savePayslip = savePayslip;
window.confirmDeletePayslip = confirmDeletePayslip;
window.printPayslip = printPayslip;
window.previewPayslip = previewPayslip;
window.savePayslipPDF = savePayslipPDF;

window.addEventListener('resize', () => {
    if (document.getElementById('page-dashboard').classList.contains('active') && lastDashboardStats) {
        renderDashboardCharts(lastDashboardStats);
    }
});



// ==================== TEJ EXPORT ====================
let tejAvailableDocs = [];

function openTEJExportModal(type) {
    document.getElementById('tejExportType').value = type;
    document.getElementById('tejExportModalTitle').textContent = `Export XML ${type === 'RS' ? 'Retenue' : 'Factures'}`;
    const now = new Date();
    document.getElementById('tejYear').value = now.getFullYear();
    document.getElementById('tejMonth').value = now.getMonth() + 1;

    // Add listeners for automatic reload
    document.getElementById('tejYear').onchange = loadTEJDocuments;
    document.getElementById('tejMonth').onchange = loadTEJDocuments;

    loadTEJDocuments();
    document.getElementById('tejExportModal').classList.add('active');
}

async function loadTEJDocuments() {
    const type = document.getElementById('tejExportType').value;
    const year = parseInt(document.getElementById('tejYear').value);
    const month = parseInt(document.getElementById('tejMonth').value);
    const container = document.getElementById('tejDocList');

    container.innerHTML = '<p style="text-align:center; padding:10px; font-size:0.8rem">Chargement...</p>';

    try {
        const data = await window.electronAPI.getTEJData({ type, month, year, userId: currentUser.id });
        tejAvailableDocs = data || [];

        if (tejAvailableDocs.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--text-secondary); padding:20px; font-size:0.85rem">Aucun ${type === 'RS' ? 'certificat' : 'facture'} trouvé pour cette période.</p>`;
            return;
        }

        container.innerHTML = tejAvailableDocs.map(doc => `
            <label style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee; cursor:pointer; font-size:0.85rem">
                <input type="checkbox" class="tej-doc-checkbox" value="${doc.id}" checked style="width:16px; height:16px">
                <div style="flex:1">
                    <div style="font-weight:600">${doc.number || doc.id.slice(0, 8)}</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary)">${doc.client_name || doc.beneficiaire_name || 'Sans nom'} - ${doc.date}</div>
                </div>
                <div style="font-weight:700">${formatAmount(doc.total_ttc || doc.montant_retenue || 0)}</div>
            </label>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-danger); padding:10px; font-size:0.8rem">Erreur: ${e.message}</p>`;
    }
}

function toggleAllTEJSelection() {
    const checkboxes = document.querySelectorAll('.tej-doc-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

function closeTEJExportModal() {
    document.getElementById('tejExportModal').classList.remove('active');
}

async function processTEJExport() {
    const type = document.getElementById('tejExportType').value;
    const year = parseInt(document.getElementById('tejYear').value);
    const month = parseInt(document.getElementById('tejMonth').value);
    const codeActe = parseInt(document.getElementById('tejCodeActe').value);

    const selectedIds = Array.from(document.querySelectorAll('.tej-doc-checkbox:checked')).map(cb => cb.value);

    if (selectedIds.length === 0) {
        showToast('Veuillez sélectionner au moins un document à exporter', 'warning');
        return;
    }

    const selectedData = tejAvailableDocs.filter(d => selectedIds.includes(d.id));

    showLoading(`Génération du fichier XML ${type}...`);
    try {
        const company = await window.electronAPI.getCompany(currentUser.id);
        if (!company || !company.mf) {
            hideLoading();
            showToast('Veuillez configurer votre Matricule Fiscal dans Mon Entreprise', 'error');
            return;
        }

        const result = await window.electronAPI.exportTEJ({
            type, month, year, codeActe, company, data: selectedData
        });

        hideLoading();
        if (result.success) {
            showToast(`Export XML réussi : ${result.path}`, 'success');
            closeTEJExportModal();
        } else if (result.canceled) {
            // User canceled
        } else {
            showToast(`Erreur export: ${result.error}`, 'error');
        }
    } catch (e) {
        hideLoading();
        showToast(`Erreur système: ${e.message}`, 'error');
    }
}

// ==================== ADDITIONAL TOOLS ====================

function openMFValidator() {
    document.getElementById('mfValidatorModal').classList.add('active');
    document.getElementById('mfToVerify').value = '';
    document.getElementById('mfVerifyResult').style.display = 'none';
    document.getElementById('rneResultBox').style.display = 'none';
    document.getElementById('rneDataContent').innerHTML = '';
}

async function searchRNELive() {
    const mf = document.getElementById('mfToVerify').value;
    if (!mf) return showToast('Veuillez saisir un matricule fiscal', 'warning');

    const btn = document.getElementById('btnSearchRNE');
    const icon = document.getElementById('searchRNEIcon');
    const spinner = document.getElementById('searchRNESpinner');
    const resultBox = document.getElementById('rneResultBox');
    const content = document.getElementById('rneDataContent');

    btn.disabled = true;
    icon.style.display = 'none';
    spinner.style.display = 'inline-block';
    resultBox.style.display = 'none';

    try {
        const res = await window.electronAPI.searchRNE(mf);
        if (res.success) {
            const d = res.data;
            resultBox.style.display = 'block';
            document.getElementById('mfVerifyResult').style.display = 'none'; // Hide the format warning on success

            const statusColor = (d.etatRegistreFr || '').toLowerCase().includes('actif') ? '#10b981' : '#ef4444';

            // Heuristic: If legal form is null but activity contains SARL/SUARL/SA, swap them or show both
            let legalForm = d.formeJuridiqueFr || 'N/A';
            let activity = d.objetActivitePrincipaleFr || 'N/A';

            if (legalForm === 'N/A' && (activity.includes('SARL') || activity.includes('SUARL') || activity.includes('S.A'))) {
                legalForm = activity;
                activity = 'Consultation RNE requise pour détails';
            }

            const address = [d.rueFr, d.codePostal, d.villeFr].filter(x => x).map(x => x.trim()).join(' ');

            content.innerHTML = `
                <div style="margin-bottom:12px">
                    <div style="font-weight:700; font-size:1.1rem; color:var(--primary); margin-bottom:4px">${(d.denominationLatin || d.nomEtPrenomFr || 'N/A').toUpperCase()}</div>
                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px">
                        <span style="font-size:0.75rem; font-weight:700; color:white; background:${statusColor}; padding:2px 8px; border-radius:4px; text-transform:uppercase">${d.etatRegistreFr || 'Inconnu'}</span>
                        <span style="font-size:0.8rem; color:var(--text-secondary)">MF: <b>${d.idUnique || mf}</b></span>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.85rem">
                    <div style="grid-column: span 2">
                        <label style="display:block; font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Forme Juridique</label>
                        <div style="font-weight:600">${legalForm}</div>
                    </div>
                    <div style="grid-column: span 2">
                        <label style="display:block; font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Adresse</label>
                        <div style="font-weight:600">${address || 'N/A'}</div>
                    </div>
                    <div style="grid-column: span 2">
                        <label style="display:block; font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700">Activité</label>
                        <div style="font-weight:600; font-style:italic">${activity}</div>
                    </div>
                </div>
            `;
        } else {
            showToast(res.error || 'Erreur RNE', 'error');
        }
    } catch (e) {
        showToast('Erreur de connexion au RNE', 'error');
    } finally {
        btn.disabled = false;
        icon.style.display = 'inline-block';
        spinner.style.display = 'none';
    }
}

function validateMFInput(val) {
    const resultEl = document.getElementById('mfVerifyResult');
    if (!val) { resultEl.style.display = 'none'; return; }

    const cleanVal = val.toUpperCase().trim();

    // If it's a short MF (e.g. 1948241P), don't show error, just wait for search
    if (cleanVal.length < 10 && !cleanVal.includes('/')) {
        resultEl.style.display = 'none';
        return;
    }

    // Pattern: XXXXXXX/X/X/XXX
    const mfPattern = /^[0-9]{7}\/[A-P]\/[A-P]\/[0-9]{3}$/;
    const isValid = mfPattern.test(cleanVal);

    resultEl.style.display = 'block';
    if (isValid) {
        resultEl.style.background = '#d1fae5';
        resultEl.style.border = '1px solid #10b981';
        resultEl.style.color = '#065f46';
        resultEl.innerHTML = '<i data-lucide="check-circle" style="width:16px;height:16px;color:#065f46;vertical-align:middle"></i> <b>Format Valide</b><br>Ce matricule respecte la structure réglementaire complète.';
    } else {
        resultEl.style.background = '#fffbeb';
        resultEl.style.border = '1px solid #f59e0b';
        resultEl.style.color = '#92400e';
        resultEl.innerHTML = '💡 <b>Recherche RNE</b><br>Utilisez la loupe <i data-lucide="search" style="width:12px;height:12px;vertical-align:middle"></i> pour interroger le registre public avec ce matricule.';
    }
    if (window.lucide) lucide.createIcons();
}

function openIRPPProjector() {
    document.getElementById('irppModal').classList.add('active');
    document.getElementById('irppRevenu').value = '';
    calculateIRPPSimulation();
}

function calculateIRPPSimulation() {
    const revenu = parseFloat(document.getElementById('irppRevenu').value) || 0;
    let impôt = 0;

    // Tunisian IRPP Brackets 2024+
    // 0 - 5000: 0%
    // 5000 - 20000: 26%
    // 20000 - 30000: 28%
    // 30000 - 50000: 32%
    // > 50000: 35%

    if (revenu <= 5000) {
        impôt = 0;
    } else if (revenu <= 20000) {
        impôt = (revenu - 5000) * 0.26;
    } else if (revenu <= 30000) {
        impôt = (15000 * 0.26) + (revenu - 20000) * 0.28;
    } else if (revenu <= 50000) {
        impôt = (15000 * 0.26) + (10000 * 0.28) + (revenu - 30000) * 0.32;
    } else {
        impôt = (15000 * 0.26) + (10000 * 0.28) + (20000 * 0.32) + (revenu - 50000) * 0.35;
    }

    document.getElementById('irppTaxAmount').textContent = formatAmount(impôt) + ' TND';
    const rate = revenu > 0 ? ((impôt / revenu) * 100).toFixed(1) : 0;
    document.getElementById('irppRate').textContent = rate + '%';
}

function openFiscalCalendar() {
    document.getElementById('calendarModal').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ==================== EXTENDED TOOLS LOGIC ====================

function openPenaltyCalculator() {
    document.getElementById('penaltyModal').classList.add('active');
    document.getElementById('penaltyBase').value = '';
    document.getElementById('penaltyMonths').value = '';
    calculatePenalties();
}

function calculatePenalties() {
    const base = parseFloat(document.getElementById('penaltyBase').value) || 0;
    const months = parseInt(document.getElementById('penaltyMonths').value) || 0;
    const rate = parseFloat(document.getElementById('penaltyType').value);

    const penalty = base * rate * months;
    const minPenalty = (months > 0) ? 5 : 0; // Simplified min penalty rule
    const finalPenalty = Math.max(penalty, minPenalty);

    document.getElementById('penaltyAmount').textContent = formatAmount(finalPenalty) + ' TND';
    document.getElementById('penaltyTotal').textContent = formatAmount(base + finalPenalty) + ' TND';
}

function openTVASummary() {
    document.getElementById('tvaSummaryModal').classList.add('active');
    document.getElementById('tvaSumResult').style.display = 'none';
}

async function calculateTVASummary() {
    const year = parseInt(document.getElementById('tvaSumYear').value);
    const month = parseInt(document.getElementById('tvaSumMonth').value);

    showLoading('Calcul de la TVA...');
    try {
        const expenses = await window.electronAPI.getExpenses(currentUser.id);
        // Filter by period
        const periodExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });

        const summary = {
            7: { ht: 0, tva: 0 },
            13: { ht: 0, tva: 0 },
            19: { ht: 0, tva: 0 }
        };

        let totalHT = 0;
        let totalTVA = 0;

        periodExpenses.forEach(e => {
            const rate = parseInt(e.tva_rate) || 0;
            if (summary[rate]) {
                summary[rate].ht += (e.amount_ht || 0);
                summary[rate].tva += (e.amount_tva || 0);
            } else {
                // Handle custom rates if any
                summary[rate] = { ht: (e.amount_ht || 0), tva: (e.amount_tva || 0) };
            }
            totalHT += (e.amount_ht || 0);
            totalTVA += (e.amount_tva || 0);
        });

        const tbody = document.getElementById('tvaSumTableBody');
        tbody.innerHTML = '';
        Object.keys(summary).sort((a, b) => a - b).forEach(rate => {
            if (summary[rate].ht > 0) {
                tbody.innerHTML += `<tr><td>${rate}%</td><td>${formatAmount(summary[rate].ht)}</td><td>${formatAmount(summary[rate].tva)}</td></tr>`;
            }
        });

        document.getElementById('tvaSumTotalHT').textContent = formatAmount(totalHT);
        document.getElementById('tvaSumTotalTVA').textContent = formatAmount(totalTVA);
        document.getElementById('tvaSumResult').style.display = 'block';

    } catch (e) { showToast('Erreur calcul TVA', 'error'); }
    finally { hideLoading(); }
}

// ==================== TVA DÉCLARATION ASSISTANT ====================
function openTVADeclaration() {
    document.getElementById('tvaDeclarationModal').classList.add('active');
    document.getElementById('tvaDeclResult').style.display = 'none';
}

async function calculateTVADeclaration() {
    const year = parseInt(document.getElementById('tvaDeclYear').value);
    const month = parseInt(document.getElementById('tvaDeclMonth').value);
    showLoading('Calcul de la déclaration TVA...');
    try {
        const result = await window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: 999999 });
        const docs = result.rows || [];
        const expenses = await window.electronAPI.getExpenses(currentUser.id);
        const periodDocs = docs.filter(d => {
            const dt = new Date(d.date);
            return dt.getFullYear() === year && (dt.getMonth() + 1) === month && (d.type === 'facture' || d.type === 'avoir');
        });
        const periodExpenses = expenses.filter(e => {
            const dt = new Date(e.date);
            return dt.getFullYear() === year && (dt.getMonth() + 1) === month;
        });
        const collected = { 7: { ht: 0, tva: 0 }, 13: { ht: 0, tva: 0 }, 19: { ht: 0, tva: 0 } };
        let colHT = 0, colTVA = 0;
        periodDocs.forEach(doc => {
            const items = JSON.parse(doc.items_json || '[]');
            items.forEach(item => {
                const rate = parseInt(item.tva) || 19;
                const ht = parseFloat(item.unitPrice) * parseFloat(item.quantity || 1);
                const sign = doc.type === 'avoir' ? -1 : 1;
                if (collected[rate]) {
                    collected[rate].ht += ht * sign;
                    collected[rate].tva += ht * (rate / 100) * sign;
                }
                colHT += ht * sign;
                colTVA += ht * (rate / 100) * sign;
            });
        });
        const deductible = { 7: { ht: 0, tva: 0 }, 13: { ht: 0, tva: 0 }, 19: { ht: 0, tva: 0 } };
        let dedHT = 0, dedTVA = 0;
        periodExpenses.forEach(e => {
            const rate = parseInt(e.tva_rate) || 0;
            if (deductible[rate]) {
                deductible[rate].ht += (e.amount_ht || 0);
                deductible[rate].tva += (e.amount_tva || 0);
            }
            dedHT += (e.amount_ht || 0);
            dedTVA += (e.amount_tva || 0);
        });
        const collectedBody = document.getElementById('tvaDeclCollectedBody');
        collectedBody.innerHTML = '';
        Object.keys(collected).sort((a, b) => a - b).forEach(rate => {
            if (Math.abs(collected[rate].ht) > 0.001) {
                collectedBody.innerHTML += `<tr><td>${rate}%</td><td>${formatAmount(collected[rate].ht)}</td><td>${formatAmount(collected[rate].tva)}</td></tr>`;
            }
        });
        document.getElementById('tvaDeclCollectedHT').textContent = formatAmount(colHT);
        document.getElementById('tvaDeclCollectedTVA').textContent = formatAmount(colTVA);
        const deductibleBody = document.getElementById('tvaDeclDeductibleBody');
        deductibleBody.innerHTML = '';
        Object.keys(deductible).sort((a, b) => a - b).forEach(rate => {
            if (Math.abs(deductible[rate].ht) > 0.001) {
                deductibleBody.innerHTML += `<tr><td>${rate}%</td><td>${formatAmount(deductible[rate].ht)}</td><td>${formatAmount(deductible[rate].tva)}</td></tr>`;
            }
        });
        document.getElementById('tvaDeclDeductibleHT').textContent = formatAmount(dedHT);
        document.getElementById('tvaDeclDeductibleTVA').textContent = formatAmount(dedTVA);
        const netTVA = colTVA - dedTVA;
        const netEl = document.getElementById('tvaDeclNetResult');
        if (netTVA >= 0) {
            netEl.style.background = '#fef3c7';
            netEl.style.color = '#92400e';
            netEl.innerHTML = `<i data-lucide="arrow-up" style="vertical-align:middle"></i> TVA à reverser : <span style="font-size:1.2rem">${formatAmount(netTVA)} TND</span>`;
        } else {
            netEl.style.background = '#d1fae5';
            netEl.style.color = '#065f46';
            netEl.innerHTML = `<i data-lucide="arrow-down" style="vertical-align:middle"></i> Crédit TVA (reportable) : <span style="font-size:1.2rem">${formatAmount(Math.abs(netTVA))} TND</span>`;
        }
        if (window.lucide) lucide.createIcons();
        document.getElementById('tvaDeclResult').style.display = 'block';
    } catch (e) { showToast('Erreur calcul déclaration TVA', 'error'); }
    finally { hideLoading(); }
}

function openPVGenerator() {
    document.getElementById('pvGeneratorModal').classList.add('active');
    document.getElementById('pvDate').valueAsDate = new Date();
}

async function generatePVDocument() {
    const date = document.getElementById('pvDate').value;
    const year = document.getElementById('pvYear').value;
    const amount = document.getElementById('pvAmount').value;
    const decision = document.getElementById('pvDecision').value;

    if (!date || !amount) { showToast('Remplissez les champs obligatoires', 'warning'); return; }

    showLoading('Génération du PV...');
    try {
        const html = `
            <div style="font-family:'Times New Roman',serif; padding:50px; line-height:1.6; color:#000;">
                <h2 style="text-align:center; text-decoration:underline; text-transform:uppercase;">Procès-Verbal de l'Assemblée Générale Ordinaire</h2>
                <div style="margin-top:40px;">
                    <p><b>Société :</b> ${currentCompanySettings?.name || 'Ma Société'}</p>
                    <p><b>Siège Social :</b> ${currentCompanySettings?.address || '—'}</p>
                    <p><b>Matricule Fiscal :</b> ${currentCompanySettings?.mf || '—'}</p>
                </div>
                <p style="margin-top:30px;">
                    L'an deux mille vingt-six, le ${new Date(date).toLocaleDateString('fr-FR')}, s'est réunie l'Assemblée Générale Ordinaire des associés au siège social.
                </p>
                <p><b>Ordre du jour :</b> Approbation des comptes de l'exercice clos au 31/12/${year}.</p>
                <p>L'assemblée, après lecture du rapport de gestion, constate un résultat net de <b>${formatAmount(amount)} TND</b>.</p>
                <p><b>Résolution :</b> L'assemblée décide d'affecter le résultat comme suit : ${decision || 'Report à nouveau'}.</p>
                <div style="margin-top:60px; display:flex; justify-content:space-between;">
                    <div>Le Gérant</div>
                    <div>Signature & Cachet</div>
                </div>
            </div>
        `;

        const result = await window.electronAPI.savePDF({ html, filename: `PV_Assemblee_${year}.pdf` });
        if (result.success) showToast('PV généré avec succès', 'success');
    } catch (e) { showToast('Erreur génération PV', 'error'); }
    finally { hideLoading(); closeModal('pvGeneratorModal'); }
}

function openFinanceDirectory() {
    document.getElementById('financeDirectoryModal').classList.add('active');
}

function filterFinanceDirectory(q) {
    const query = q.toLowerCase();
    const rows = document.querySelectorAll('#financeTable tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// ==================== CURRENCY CONVERTER ====================
function openCurrencyConverter() {
    document.getElementById('ccResults').innerHTML = '';
    document.getElementById('ccRate').value = '1.000';
    document.getElementById('currencyConverterModal').classList.add('active');
}
function closeCurrencyConverter() {
    document.getElementById('currencyConverterModal').classList.remove('active');
}
function runCurrencyConversion() {
    const rate = parseFloat(document.getElementById('ccRate').value) || 1;
    const period = document.getElementById('ccPeriod').value;
    const sourceCurrency = document.getElementById('ccSourceCurrency').value;
    const now = new Date();
    const filtered = allDocuments.filter(d => {
        if (!d.totalTTC) return false;
        if (period === 'month') {
            const dDate = new Date(d.date);
            return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
        }
        if (period === 'year') {
            return new Date(d.date).getFullYear() === now.getFullYear();
        }
        return true;
    });
    const byCurrency = {};
    filtered.forEach(d => {
        const cur = d.currency || 'TND';
        if (!byCurrency[cur]) byCurrency[cur] = 0;
        const factor = d.type === 'avoir' ? -1 : 1;
        byCurrency[cur] += (d.totalTTC || 0) * factor;
    });
    let html = `<table class="data-table"><thead><tr><th>Devise</th><th>Total (${sourceCurrency})</th><th>Taux</th><th>Total (${sourceCurrency})</th></tr></thead><tbody>`;
    let grandTotal = 0;
    Object.entries(byCurrency).forEach(([cur, total]) => {
        const converted = total * rate;
        grandTotal += converted;
        html += `<tr><td>${cur}</td><td>${formatAmount(total)}</td><td>${cur === sourceCurrency ? '1.000' : rate.toFixed(3)}</td><td><strong>${formatAmount(converted)}</strong></td></tr>`;
    });
    html += `<tr style="font-weight:800;background:var(--gray-50)"><td>TOTAL</td><td></td><td></td><td>${formatAmount(grandTotal)} ${sourceCurrency}</td></tr>`;
    html += '</tbody></table>';
    html += `<div style="margin-top:12px;font-size:0.85rem;color:var(--text-light)">Basé sur ${filtered.length} document(s)</div>`;
    document.getElementById('ccResults').innerHTML = html;
}

// ==================== DOCUMENT TEMPLATES ====================
let _allTemplates = [];

async function openTemplateModal() {
    document.getElementById('templateNameInput').value = '';
    _allTemplates = await window.electronAPI.getTemplates(currentUser.id);
    renderTemplateList();
    document.getElementById('templateModal').classList.add('active');
}

function renderTemplateList() {
    const container = document.getElementById('templateList');
    if (!_allTemplates.length) {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-light)">Aucun modèle enregistré</div>';
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>Nom</th><th>Type</th><th>Actions</th></tr></thead><tbody>';
    _allTemplates.forEach(t => {
        html += `<tr>
            <td>${escapeHtml(t.name)}</td>
            <td>${escapeHtml(t.type || '—')}</td>
            <td>
                <button class="btn-icon" onclick="loadTemplate('${t.id}')" title="Appliquer"><i data-lucide="upload" style="width:14px;height:14px"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteTemplate('${t.id}')" title="Supprimer"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

async function saveCurrentAsTemplate() {
    const name = document.getElementById('templateNameInput').value.trim();
    if (!name) { showToast('Nom du modèle requis', 'warning'); return; }
    const templateData = collectDocumentData();
    try {
        await window.electronAPI.saveTemplate({ userId: currentUser.id, name, type: currentDocType, templateData });
        showToast('Modèle enregistré', 'success');
        _allTemplates = await window.electronAPI.getTemplates(currentUser.id);
        renderTemplateList();
        document.getElementById('templateNameInput').value = '';
    } catch { showToast('Erreur', 'error'); }
}

async function loadTemplate(templateId) {
    const templates = await window.electronAPI.getTemplates(currentUser.id);
    const t = templates.find(x => x.id === templateId);
    if (!t) return;
    const data = typeof t.data === 'string' ? JSON.parse(t.data) : t.data;
    const fields = { docCompanyName: 'companyName', docCompanyMF: 'companyMF', docCompanyAddress: 'companyAddress', docCompanyPhone: 'companyPhone', docCompanyEmail: 'companyEmail', docCompanyRC: 'companyRC', docClientName: 'clientName', docClientMF: 'clientMF', docClientAddress: 'clientAddress', docClientPhone: 'clientPhone', docClientEmail: 'clientEmail', docNotes: 'notes' };
    Object.entries(fields).forEach(([id, key]) => { const el = document.getElementById(id); if (el && data[key]) el.value = data[key]; });
    if (data.items) {
        document.getElementById('itemsBody').innerHTML = '';
        itemCount = 0;
        data.items.forEach(item => addItem(item));
    }
    showToast('Modèle appliqué', 'success');
    closeModal('templateModal');
}

async function deleteTemplate(id) {
    if (!await confirmModal('Supprimer ce modèle ?', '')) return;
    try {
        await window.electronAPI.deleteTemplate(id);
        _allTemplates = await window.electronAPI.getTemplates(currentUser.id);
        renderTemplateList();
    } catch { showToast('Erreur', 'error'); }
}

// ==================== SAVE & NEW ====================
async function saveAndNew() {
    await saveAndDownloadPDF();
    resetDocumentForm();
    navigateTo('new-document');
}

// ==================== PDF OUTPUT FOLDER ====================
async function loadPdfOutputFolder() {
    const saved = localStorage.getItem('tuni_pdf_folder') || '';
    document.getElementById('pdfOutputFolder').value = saved || '(Dossier par défaut de l\'application)';
}
async function selectPdfOutputFolder() {
    const folder = await window.electronAPI.selectFolder();
    if (folder) document.getElementById('pdfOutputFolder').value = folder;
}
function savePdfOutputFolder() {
    const folder = document.getElementById('pdfOutputFolder').value;
    if (folder && folder !== '(Dossier par défaut de l\'application)') localStorage.setItem('tuni_pdf_folder', folder);
    else localStorage.removeItem('tuni_pdf_folder');
    showToast('Dossier PDF enregistré', 'success');
}

// ==================== P&L REPORT ====================
function openPLReport() {
    const year = new Date().getFullYear();
    showLoading('Génération du rapport...');
    window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: -1 }).then(allDocs => {
        const docs = (allDocs || []).filter(d => d.date && d.date.startsWith(String(year)) && (d.type === 'facture' || d.type === 'avoir'));
        const revenue = docs.reduce((s, d) => s + (d.type === 'avoir' ? -1 : 1) * (d.totalTTC || 0), 0);
        const expenses = allExpenses ? allExpenses.reduce((s, e) => s + (e.amountTTC || 0), 0) : 0;
        hideLoading();
        const netResult = revenue - expenses;
        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Compte de Résultat ${year}</title>
        <style>body{font-family:'Inter',sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1e293b}
        h1{font-size:24px}table{width:100%;border-collapse:collapse;margin:20px 0}
        th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:14px}
        th{background:#f8fafc;font-weight:600;text-transform:uppercase;font-size:12px}
        .total{font-weight:700;background:#f0fdf4}.neg{color:#ef4444}.pos{color:#16a34a}
        .footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:40px}
        @media print{body{margin:20px}}</style></head><body>
        <h1>Compte de Résultat ${year}</h1>
        <table><tr><th>Catégorie</th><th>Montant (TND)</th></tr>
        <tr><td>Revenus (Factures - Avoirs)</td><td class="pos">${revenue.toFixed(3)}</td></tr>
        <tr><td>Dépenses</td><td class="neg">-${expenses.toFixed(3)}</td></tr>
        <tr class="total"><td>Résultat Net</td><td class="${netResult>=0?'pos':'neg'}">${netResult.toFixed(3)}</td></tr>
        </table>
        <p style="font-size:0.85rem;color:#64748b">Basé sur ${docs.length} document(s) et ${allExpenses?.length||0} dépense(s)</p>
        <div class="footer">Factarlou — Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
        <script>window.print();</script></body></html>`);
        win.document.close();
    }).catch(() => hideLoading());
}

// ==================== BALANCE REPORT ====================
function openBalanceReport() {
    const year = new Date().getFullYear();
    showLoading('Génération du bilan...');
    window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: -1 }).then(allDocs => {
        const allDocsArr = allDocs || [];
        const totalRevenue = allDocsArr.filter(d => d.date && d.date.startsWith(String(year)) && d.type === 'facture').reduce((s, d) => s + (d.totalTTC || 0), 0);
        const totalExpenses = allExpenses ? allExpenses.reduce((s, e) => s + (e.amountTTC || 0), 0) : 0;
        const unpaid = allDocsArr.filter(d => d.type === 'facture' && d.paymentStatus !== 'paid').reduce((s, d) => s + ((d.totalTTC||0) - (d.paidAmount||0)), 0);
        const totalPaid = allDocsArr.filter(d => d.type === 'facture' && d.paymentStatus === 'paid').reduce((s, d) => s + (d.totalTTC || 0), 0);
        const netPosition = totalRevenue - totalExpenses;
        hideLoading();
        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bilan Annuel ${year}</title>
        <style>body{font-family:'Inter',sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1e293b}
        h1{font-size:24px}.section{margin-bottom:24px}.section h2{font-size:18px;border-bottom:2px solid #3b82f6;padding-bottom:8px}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        th,td{padding:10px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:14px}
        th{background:#f8fafc;font-weight:600;font-size:12px;text-transform:uppercase}
        .total{font-weight:700;background:#f0fdf4;border-top:2px solid #3b82f6}
        .num{text-align:right}.footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:40px}
        @media print{body{margin:20px}}</style></head><body>
        <h1>Bilan Annuel ${year}</h1>
        <div class="section"><h2>Actif</h2>
        <table><tr><th>Poste</th><th class="num">Montant</th></tr>
        <tr><td>Créances clients (impayés)</td><td class="num">${unpaid.toFixed(3)} TND</td></tr>
        <tr><td>Total encaissé</td><td class="num">${totalPaid.toFixed(3)} TND</td></tr>
        <tr class="total"><td>Total Actif</td><td class="num">${(unpaid+totalPaid).toFixed(3)} TND</td></tr></table></div>
        <div class="section"><h2>Passif</h2>
        <table><tr><th>Poste</th><th class="num">Montant</th></tr>
        <tr><td>Capital propre (Résultat net)</td><td class="num">${netPosition.toFixed(3)} TND</td></tr>
        <tr><td>Dépenses totales</td><td class="num">${totalExpenses.toFixed(3)} TND</td></tr>
        <tr class="total"><td>Total Passif</td><td class="num">${(netPosition+totalExpenses).toFixed(3)} TND</td></tr></table></div>
        <div class="footer">Factarlou — ${new Date().toLocaleDateString('fr-FR')}</div>
        <script>window.print();</script></body></html>`);
        win.document.close();
    }).catch(() => hideLoading());
}

// ==================== TVA ANNUAL REPORT ====================
function openTVAAnnualReport() {
    const year = new Date().getFullYear();
    showLoading('Génération de la déclaration TVA...');
    window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: -1 }).then(allDocs => {
        const allDocsArr = allDocs || [];
        const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
        const byMonth = {};
        months.forEach(m => { byMonth[m] = { collected: 0, deductible: 0 }; });
        allDocsArr.filter(d => d.date && d.date.startsWith(String(year)) && (d.type === 'facture' || d.type === 'avoir')).forEach(d => {
        const m = d.date.substring(5, 7);
        if (!byMonth[m]) return;
        const factor = d.type === 'avoir' ? -1 : 1;
        byMonth[m].collected += factor * ((d.totalTTC||0) - (d.totalHT||0));
    });
    (allExpenses || []).filter(e => e.date && e.date.startsWith(String(year))).forEach(e => {
        const m = e.date.substring(5, 7);
        if (!byMonth[m]) return;
        byMonth[m].deductible += (e.amountTTC||0) - (e.amountHT||e.amountTTC||0);
    });
    let rows = '';
    let totalC = 0, totalD = 0;
    months.forEach(m => {
        const c = byMonth[m].collected, d = byMonth[m].deductible;
        totalC += c; totalD += d;
        const net = c - d;
        rows += `<tr><td>${m}/${year}</td><td class="num">${c.toFixed(3)}</td><td class="num">${d.toFixed(3)}</td><td class="num ${net>=0?'pos':'neg'}">${net.toFixed(3)}</td></tr>`;
    });
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Déclaration TVA ${year}</title>
    <style>body{font-family:'Inter',sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#1e293b}
    h1{font-size:24px}table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:14px}
    th{background:#f8fafc;font-weight:600;font-size:12px;text-transform:uppercase}
    .num{text-align:right}.total{font-weight:700;background:#f0fdf4;border-top:2px solid #3b82f6}
    .pos{color:#16a34a}.neg{color:#ef4444}.footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:40px}
    @media print{body{margin:20px}}</style></head><body>
    <h1>Déclaration TVA Annuelle ${year}</h1>
    <table><thead><tr><th>Mois</th><th class="num">Collectée</th><th class="num">Déductible</th><th class="num">Net</th></tr></thead><tbody>
    ${rows}
    <tr class="total"><td>TOTAL</td><td class="num">${totalC.toFixed(3)}</td><td class="num">${totalD.toFixed(3)}</td><td class="num ${(totalC-totalD)>=0?'pos':'neg'}">${(totalC-totalD).toFixed(3)}</td></tr>
    </tbody></table>
    <div class="footer">Factarlou — ${new Date().toLocaleDateString('fr-FR')}</div>
    <script>window.print();</script></body></html>`);
        win.document.close();
        hideLoading();
    }).catch(() => hideLoading());
}

// ═══════════════════════════════════════════
// GRAPHE RELATIONNEL (Apriori Mining)
// ═══════════════════════════════════════════

let lastGraphResults = null;
let currentGraphTab = 'associations';

function openGrapheRelationnel() {
    document.getElementById('grapheModal').classList.add('active');
    document.getElementById('graphResults').innerHTML =
        '<p style="color:var(--text-light);text-align:center;padding:40px 0">Cliquez sur "Analyser" pour découvrir les patterns cachés dans vos données</p>';
    lastGraphResults = null;
    if (window.lucide) lucide.createIcons();
}

function runGrapheAnalysis() {
    const minSupport = parseFloat(document.getElementById('graphMinSupport').value);
    const minConfidence = parseFloat(document.getElementById('graphMinConfidence').value);
    showLoading('Analyse des relations...');
    window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: -1 }).then(allDocs => {
        const docs = allDocs || [];
        const relevantDocs = docs.filter(d => d.type === 'facture' || d.type === 'devis' || d.type === 'bon');
        if (relevantDocs.length < 5) {
            hideLoading();
            document.getElementById('graphResults').innerHTML =
                '<p style="color:var(--warning);text-align:center;padding:40px 0">⚠️ Pas assez de documents (minimum 5 factures/devis) pour dégager des patterns significatifs.</p>';
            return;
        }
        setTimeout(() => {
            try {
                const transactions = relevantDocs.map(d => {
                    try { return (d.items || []).map(i => (i.description || '').trim()).filter(Boolean); }
                    catch { return []; }
                }).filter(t => t.length > 0);
                const rules = apriori(transactions, minSupport, minConfidence);
                const paymentStats = analyzePaymentByItem(relevantDocs);
                const clientPatterns = analyzeClientPatterns(relevantDocs);
                lastGraphResults = { rules, paymentStats, clientPatterns, docCount: relevantDocs.length };
                renderGraphTab(currentGraphTab);
                hideLoading();
            } catch (e) {
                hideLoading();
                document.getElementById('graphResults').innerHTML =
                    `<p style="color:var(--danger);text-align:center;padding:40px 0">Erreur d'analyse: ${e.message}</p>`;
            }
        }, 50);
    }).catch(() => hideLoading());
}

function showGraphTab(tab) {
    currentGraphTab = tab;
    ['associations', 'payment', 'clients'].forEach(t => {
        const btn = document.getElementById('graphTab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) { btn.style.background = t === tab ? 'var(--primary)' : ''; btn.style.color = t === tab ? 'white' : ''; }
    });
    if (lastGraphResults) renderGraphTab(tab);
}

function renderGraphTab(tab) {
    const container = document.getElementById('graphResults');
    if (!lastGraphResults) { container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px 0">Lancez une analyse d\'abord</p>'; return; }
    const { rules, paymentStats, clientPatterns, docCount } = lastGraphResults;

    if (tab === 'associations') {
        if (rules.length === 0) {
            container.innerHTML = `<p style="color:var(--text-light);text-align:center;padding:40px 0">Aucune association significative trouvée avec les seuils actuels. Essayez des seuils plus bas.</p>`;
            return;
        }
        let html = `<p style="font-size:0.85rem;color:var(--text-light);margin-bottom:12px">Basé sur <strong>${docCount}</strong> documents — <strong>${rules.length}</strong> règles d'association trouvées</p>`;
        html += `<table><thead><tr><th>Règle</th><th style="width:80px">Support</th><th style="width:100px">Confiance</th><th style="width:80px">Lift</th><th style="width:60px">Force</th></tr></thead><tbody>`;
        rules.slice(0, 50).forEach(r => {
            const ant = r.antecedent.join(' + ');
            const cons = r.consequent.join(' + ');
            const barW = Math.min(r.confidence * 100, 100);
            const color = r.lift > 2 ? 'var(--success)' : r.lift > 1.5 ? 'var(--primary)' : 'var(--warning)';
            html += `<tr>
                <td style="font-size:0.85rem">« ${escHtml(ant)} » → « ${escHtml(cons)} »</td>
                <td>${(r.support * 100).toFixed(1)}%</td>
                <td><div style="background:var(--gray-100);border-radius:4px;height:16px;overflow:hidden"><div style="height:100%;width:${barW}%;background:${color};border-radius:4px;font-size:0.7rem;line-height:16px;padding-left:4px;color:white">${(r.confidence * 100).toFixed(0)}%</div></div></td>
                <td>${r.lift.toFixed(2)}</td>
                <td style="color:${color}">${r.lift > 2 ? '🔥 Forte' : r.lift > 1.5 ? '✅ Moyenne' : '⚠️ Faible'}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        if (rules.length > 50) html += `<p style="font-size:0.85rem;color:var(--text-light);margin-top:8px">+ ${rules.length - 50} règles supplémentaires (affinez les seuils pour plus de pertinence)</p>`;
        container.innerHTML = html;
    } else if (tab === 'payment') {
        if (paymentStats.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px 0">Pas assez de données de paiement (minimum 3 occurrences par article)</p>';
            return;
        }
        let html = `<p style="font-size:0.85rem;color:var(--text-light);margin-bottom:12px">Taux de paiement à temps par article — du plus risqué au plus fiable</p>`;
        html += `<table><thead><tr><th>Article</th><th style="width:70px">Total</th><th style="width:80px">À temps</th><th style="width:80px">En retard</th><th style="width:80px">Impayé</th><th style="width:140px">Taux ponctualité</th></tr></thead><tbody>`;
        paymentStats.forEach(s => {
            const barW = s.onTimeRate * 100;
            const color = s.onTimeRate > 0.8 ? 'var(--success)' : s.onTimeRate > 0.5 ? 'var(--warning)' : 'var(--danger)';
            html += `<tr>
                <td style="font-size:0.85rem">${escHtml(s.item)}</td>
                <td>${s.total}</td>
                <td style="color:var(--success)">${s.onTime}</td>
                <td style="color:var(--warning)">${s.late}</td>
                <td style="color:var(--danger)">${s.unpaid}</td>
                <td><div style="background:var(--gray-100);border-radius:4px;height:16px;overflow:hidden"><div style="height:100%;width:${barW}%;background:${color};border-radius:4px;font-size:0.7rem;line-height:16px;padding-left:4px;color:white">${(s.onTimeRate * 100).toFixed(0)}%</div></div></td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } else if (tab === 'clients') {
        if (clientPatterns.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px 0">Aucun pattern de récurrence client trouvé. Les clients doivent avoir au moins 2 commandes.</p>';
            return;
        }
        let html = `<p style="font-size:0.85rem;color:var(--text-light);margin-bottom:12px">Clients qui commandent le même article régulièrement — opportunités d'abonnement</p>`;
        html += `<table><thead><tr><th>Client</th><th>Article</th><th style="width:70px">Commandes</th><th style="width:120px">Fréquence moyenne</th><th style="width:100px">Dernière</th></tr></thead><tbody>`;
        clientPatterns.slice(0, 30).forEach(p => {
            html += `<tr>
                <td>${escHtml(p.client)}</td>
                <td style="font-size:0.85rem">${escHtml(p.item)}</td>
                <td>${p.orderCount}</td>
                <td>Tous les ${p.avgDays} jours</td>
                <td style="font-size:0.85rem">${p.lastOrder.toLocaleDateString('fr-FR')}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        if (clientPatterns.length > 30) html += `<p style="font-size:0.85rem;color:var(--text-light);margin-top:8px">+ ${clientPatterns.length - 30} autres patterns</p>`;
        container.innerHTML = html;
    }
}

// ═══════════════════════════════════════════
// SIMULATEUR DE SCÉNARIOS FISCAUX
// ═══════════════════════════════════════════

let simCurrentDoc = null;

// Pure calculation function for the simulator (no DOM dependency)
function simCalculateTotals(items, options = {}) {
    const { applyTimbre = false, discountPercent = 0, decimalPlaces = 3, roundingMethod = 'half_up' } = options;
    const round = (v) => {
        const f = Math.pow(10, decimalPlaces);
        if (roundingMethod === 'ceil') return Math.ceil(v * f) / f;
        if (roundingMethod === 'floor') return Math.floor(v * f) / f;
        return Math.round(v * f) / f;
    };
    let totalHT = 0;
    const tvaByRate = {};
    items.forEach(item => {
        const qty = parseFloat(item.quantity) || 1;
        const price = parseFloat(item.price) || 0;
        const rate = parseInt(item.tva) || 0;
        const lineHT = qty * price;
        totalHT += lineHT;
        if (rate > 0) tvaByRate[rate] = (tvaByRate[rate] || 0) + lineHT * rate / 100;
    });
    const discountFactor = 1 - (parseFloat(discountPercent) || 0) / 100;
    totalHT = round(totalHT * discountFactor);
    let totalTVA = 0;
    const tvaLines = [];
    Object.keys(tvaByRate).sort((a, b) => a - b).forEach(rate => {
        const amt = round(tvaByRate[rate] * discountFactor);
        totalTVA += amt;
        tvaLines.push({ rate: parseInt(rate), amount: amt });
    });
    totalTVA = round(totalTVA);
    const timbreAmount = (applyTimbre && totalHT > 1000) ? round(1.000) : 0;
    const totalTTC = round(totalHT + totalTVA + timbreAmount);
    return { totalHT, totalTVA, totalTTC, timbreAmount, tvaLines, roundingAdjustment: 0 };
}

function openScenarioSimulator() {
    const sel = document.getElementById('simDocSelect');
    sel.innerHTML = '<option value="">— Chargement...</option>';
    document.getElementById('simComparison').style.display = 'none';
    document.getElementById('simApplyBtn').disabled = true;
    simCurrentDoc = null;
    document.getElementById('simulatorModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
    window.electronAPI.getDocuments({ userId: currentUser.id, page: 1, pageSize: -1 }).then(allDocs => {
        const docs = allDocs || [];
        sel.innerHTML = '<option value="">— Sélectionner un document —</option>';
        docs.filter(d => d.type === 'facture' || d.type === 'devis' || d.type === 'bon').forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `#${d.number} - ${d.clientName || ''} (${(d.totalTTC || 0).toFixed(3)} TND)`;
            sel.appendChild(opt);
        });
    }).catch(() => {});
}

function simulateCurrentDocument() {
    const type = document.getElementById('docType').value;
    const items = [];
    const itemRows = document.querySelectorAll('#itemsContainer .item-row');
    itemRows.forEach((row, i) => {
        const desc = document.getElementById('desc' + i)?.value?.trim();
        const qty = parseFloat(document.getElementById('qty' + i)?.value) || 1;
        const price = parseFloat(document.getElementById('price' + i)?.value) || 0;
        const tva = parseInt(document.getElementById('tva' + i)?.value) || 19;
        if (desc) items.push({ description: desc, quantity: qty, price, tva });
    });
    if (items.length === 0) { showToast('Ajoutez au moins un article avant de simuler', 'warning'); return; }
    const discount = parseFloat(document.getElementById('discountPercent')?.value) || 0;
    const currency = document.getElementById('docCurrency')?.value || 'TND';
    const applyTimbre = document.getElementById('docApplyTimbre')?.checked;

    const simCalc = simCalculateTotals(items, {
        applyTimbre, discountPercent: discount, decimalPlaces: parseInt(localStorage.getItem('tuni_decimals')) || 3,
        roundingMethod: localStorage.getItem('tuni_rounding') || 'half_up'
    });

    simCurrentDoc = {
        id: 'sim_' + Date.now(),
        number: 'SIMULATION',
        type, items, discount, currency, apply_timbre: applyTimbre ? 1 : 0,
        total_ht: simCalc.totalHT, total_ttc: simCalc.totalTTC, total_tva: simCalc.totalTVA,
        timbre_amount: simCalc.timbreAmount || 0, rounding_adjustment: simCalc.roundingAdjustment || 0,
        client_name: document.getElementById('docClientName')?.value || '',
        date: new Date().toISOString().split('T')[0],
        payment_status: 'unpaid'
    };

    openScenarioSimulator();
    document.getElementById('simDocSelect').value = '';
    loadSimDocumentIntoSimulator(simCurrentDoc);
}

function loadSimDocument() {
    const id = document.getElementById('simDocSelect').value;
    if (!id) { document.getElementById('simComparison').style.display = 'none'; simCurrentDoc = null; return; }
    const doc = (window.allDocuments || []).find(d => d.id === id);
    if (doc) loadSimDocumentIntoSimulator(doc);
    else window.electronAPI.getDocument(id).then(d => { if (d) loadSimDocumentIntoSimulator(d); });
}

function loadSimDocumentIntoSimulator(doc) {
    simCurrentDoc = JSON.parse(JSON.stringify(doc));
    document.getElementById('simType').value = doc.type || 'facture';
    document.getElementById('simDiscount').value = doc.discount_percent || 0;
    document.getElementById('simCurrency').value = doc.currency || 'TND';
    document.getElementById('simTimbre').checked = doc.apply_timbre ? true : false;
    document.getElementById('simTvaOverride').value = '';
    document.getElementById('simComparison').style.display = 'block';
    document.getElementById('simApplyBtn').disabled = false;
    recalcSimulation();
}

function recalcSimulation() {
    if (!simCurrentDoc) return;
    try {
        const items = JSON.parse(JSON.stringify(simCurrentDoc.items || JSON.parse(simCurrentDoc.items_json || '[]')));
        const simType = document.getElementById('simType').value;
        const simDiscount = parseFloat(document.getElementById('simDiscount').value) || 0;
        const simCurrency = document.getElementById('simCurrency').value;
        const simTimbre = document.getElementById('simTimbre').checked;
        const tvaOverride = document.getElementById('simTvaOverride').value;
        if (tvaOverride) items.forEach(item => { item.tva = parseInt(tvaOverride); });
        const dec = parseInt(localStorage.getItem('tuni_decimals')) || 3;
        const rounding = localStorage.getItem('tuni_rounding') || 'half_up';

        const origCalc = simCalculateTotals(simCurrentDoc.items || JSON.parse(simCurrentDoc.items_json || '[]'), {
            applyTimbre: simCurrentDoc.apply_timbre ? true : false,
            discountPercent: simCurrentDoc.discount_percent || 0,
            decimalPlaces: dec, roundingMethod: rounding
        });
        const simCalc = simCalculateTotals(items, {
            applyTimbre: simTimbre,
            discountPercent: simDiscount,
            decimalPlaces: dec, roundingMethod: rounding
        });

        const fmt = v => (v || 0).toFixed(dec);
        document.getElementById('simOriginalSummary').innerHTML = `
            <div style="font-size:0.85rem;margin-bottom:8px"><strong>${escHtml(simCurrentDoc.number || '—')}</strong><br><span style="color:var(--text-light)">${escHtml(simCurrentDoc.client_name || '')}</span></div>
            <div style="border-top:1px solid var(--border);padding-top:8px">
                <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span>Type</span><span>${simCurrentDoc.type || '—'}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span>Total HT</span><span>${fmt(origCalc.totalHT)} ${simCurrentDoc.currency || 'TND'}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span>TVA</span><span>${fmt(origCalc.totalTVA)} ${simCurrentDoc.currency || 'TND'}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span>Timbre</span><span>${fmt(origCalc.timbreAmount)} ${simCurrentDoc.currency || 'TND'}</span></div>
                <div style="display:flex;justify-content:space-between;font-weight:600;font-size:1rem;margin-top:4px;padding-top:4px;border-top:2px solid var(--border)"><span>Total TTC</span><span>${fmt(origCalc.totalTTC)} ${simCurrentDoc.currency || 'TND'}</span></div>
            </div>`;

        const diffHT = simCalc.totalHT - origCalc.totalHT;
        const diffTVA = simCalc.totalTVA - origCalc.totalTVA;
        const diffTTC = simCalc.totalTTC - origCalc.totalTTC;
        const signHT = diffHT >= 0 ? '+' : '';
        const signTVA = diffTVA >= 0 ? '+' : '';
        const signTTC = diffTTC >= 0 ? '+' : '';
        const diffColor = diffTTC >= 0 ? 'var(--success)' : 'var(--danger)';

        document.getElementById('simImpact').innerHTML = `
            <div style="border-bottom:1px solid #bbf7d0;padding-bottom:8px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span>Total HT</span><span>${fmt(simCalc.totalHT)} ${simCurrency}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span>TVA</span><span>${fmt(simCalc.totalTVA)} ${simCurrency}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span>Timbre</span><span>${fmt(simCalc.timbreAmount)} ${simCurrency}</span></div>
                <div style="display:flex;justify-content:space-between;font-weight:600;font-size:1rem;margin-top:4px;padding-top:4px;border-top:2px solid #bbf7d0"><span>Total TTC</span><span>${fmt(simCalc.totalTTC)} ${simCurrency}</span></div>
            </div>
            <div style="background:white;border-radius:6px;padding:10px">
                <div style="font-weight:600;font-size:0.85rem;margin-bottom:6px;color:${diffColor}">Différence vs original</div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:${diffTTC > 0 ? 'var(--success)' : 'var(--danger)'}"><span>HT</span><span>${signHT}${fmt(Math.abs(diffHT))}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:${diffTVA > 0 ? 'var(--success)' : 'var(--danger)'}"><span>TVA</span><span>${signTVA}${fmt(Math.abs(diffTVA))}</span></div>
                <div style="display:flex;justify-content:space-between;font-weight:600;font-size:1rem;margin-top:4px;padding-top:4px;border-top:1px solid var(--border);color:${diffColor}"><span>TTC</span><span>${signTTC}${fmt(Math.abs(diffTTC))}</span></div>
            </div>
            ${simType === 'avoir' ? '<div style="margin-top:8px;padding:6px;background:#fef3c7;border-radius:4px;font-size:0.8rem;color:#92400e">💡 Type Avoir : le montant sera déduit du chiffre d\'affaires</div>' : ''}
            ${simDiscount > 0 ? `<div style="margin-top:8px;padding:6px;background:#f0f9ff;border-radius:4px;font-size:0.8rem;color:var(--primary)">💡 Remise ${simDiscount}% appliquée — économie fiscale de ${fmt(simCalc.totalTVA - (origCalc.totalTVA * (1 - simDiscount / 100)))} TND sur la TVA</div>` : ''}
        `;
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        document.getElementById('simImpact').innerHTML = `<p style="color:var(--danger)">Erreur: ${e.message}</p>`;
    }
}

function applySimulation() {
    if (!simCurrentDoc) return;
    const simType = document.getElementById('simType').value;
    const simDiscount = parseFloat(document.getElementById('simDiscount').value) || 0;
    const simCurrency = document.getElementById('simCurrency').value;
    const simTimbre = document.getElementById('simTimbre').checked;
    const tvaOverride = document.getElementById('simTvaOverride').value;

    let items = JSON.parse(JSON.stringify(simCurrentDoc.items || JSON.parse(simCurrentDoc.items_json || '[]')));
    if (tvaOverride) items.forEach(item => { item.tva = parseInt(tvaOverride); });

    const simCalc = simCalculateTotals(items, {
        applyTimbre: simTimbre,
        discountPercent: simDiscount,
        decimalPlaces: parseInt(localStorage.getItem('tuni_decimals')) || 3,
        roundingMethod: localStorage.getItem('tuni_rounding') || 'half_up'
    });

    const docData = {
        userId: currentUser.id,
        type: simType,
        number: simCurrentDoc.number || 'SIM-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        dueDate: simCurrentDoc.dueDate || '',
        currency: simCurrency,
        paymentMode: simCurrentDoc.paymentMode || '',
        clientId: simCurrentDoc.clientId || '',
        clientName: simCurrentDoc.clientName || '',
        clientMF: simCurrentDoc.clientMF || '',
        clientAddress: simCurrentDoc.clientAddress || '',
        clientPhone: simCurrentDoc.clientPhone || '',
        clientEmail: simCurrentDoc.clientEmail || '',
        items,
        applyTimbre: simTimbre ? 1 : 0,
        discountPercent: simDiscount,
        totalHT: simCalc.totalHT,
        totalTTC: simCalc.totalTTC,
        timbreAmount: simCalc.timbreAmount || 0,
        roundingAdjustment: simCalc.roundingAdjustment || 0,
        notes: 'Généré depuis le simulateur de scénarios. Document source: #' + (simCurrentDoc.number || '')
    };

    showLoading('Création du document simulé...');
    window.electronAPI.saveDocument(docData).then(result => {
        hideLoading();
        if (result.success) {
            showToast('Document créé avec le scénario simulé', 'success');
            closeModal('simulatorModal');
            navigateTo('documents');
            loadDocuments();
        } else {
            showToast('Erreur: ' + (result.error || 'Échec'), 'error');
        }
    }).catch(e => { hideLoading(); showToast('Erreur: ' + e.message, 'error'); });
}

// ═══════════════════════════════════════════
// POINT DE VENTE (POS)
// ═══════════════════════════════════════════

let posCart = [];
let posActiveSession = null;
let posAllProducts = [];
let posSelectedMethod = 'cash';
let posFullscreenActive = false;
let posTTCMode = false;
let posLastReceiptData = null;
let posHeldCart = null;
let posTodaySalesOpen = false;
let posFavorites = JSON.parse(localStorage.getItem('tuni_pos_favorites') || '[]');
let posSplitPayments = [];
let posCashMoves = [];
let posOperatorName = '';
let posSearchFilter = '';
let posAcompteAmount = 0;
let posCartNote = '';
let posReceiptFooter = localStorage.getItem('tuni_pos_footer') || '';
let posDrafts = JSON.parse(localStorage.getItem('tuni_pos_drafts') || '[]');

function loadPOS() {
    posCart = [];
    posSelectedMethod = 'cash';
    posLastReceiptData = null;
    posHeldCart = null;
    posTTCMode = false;
    posSearchFilter = '';
    posAcompteAmount = 0;
    posCartNote = '';
    document.getElementById('posTTCToggle').classList.remove('active');
    document.getElementById('posTTCToggle').innerHTML = '<i data-lucide="toggle-left"></i>';
    document.getElementById('posReprintBtn').style.display = 'none';
    document.getElementById('posReprintCartBtn').style.display = 'none';
    document.getElementById('posHoldBtn').style.display = '';
    document.getElementById('posHeldIndicator').style.display = 'none';
    if (document.getElementById('posBarcodeInput')) document.getElementById('posBarcodeInput').value = '';
    posFullscreenActive = true;
    document.body.classList.add('pos-mode');
    const fsBtn = document.querySelector('.pos-topbar-btn');
    if (fsBtn) fsBtn.innerHTML = '<i data-lucide="minimize-2"></i>';
    loadPOSSession();
    loadPOSProducts();
    renderPOSCart();
    posLoadQuickGrid();
    document.getElementById('posBarcodeInput').value = '';
    setTimeout(() => document.getElementById('posBarcodeInput').focus(), 100);
    if (window.lucide) lucide.createIcons();
}

function posToggleFullscreen() {
    posFullscreenActive = !posFullscreenActive;
    document.body.classList.toggle('pos-mode', posFullscreenActive);
    const btn = document.querySelector('.pos-topbar-btn');
    if (btn) btn.innerHTML = posFullscreenActive
        ? '<i data-lucide="minimize-2"></i>'
        : '<i data-lucide="maximize-2"></i>';
    if (window.lucide) lucide.createIcons();
}

async function loadPOSSession() {
    try {
        posActiveSession = await window.electronAPI.getActivePOSSession(currentUser.id);
        updatePOSSessionUI();
    } catch {}
}

function updatePOSSessionUI() {
    const badge = document.getElementById('posSessionStatus');
    const toggleBtn = document.getElementById('posToggleSessionBtn');
    const zBtn = document.getElementById('posZReportBtn');
    const xBtn = document.getElementById('posXReportBtn');
    const cashMoveBtn = document.getElementById('posCashMoveBtn');
    const opInput = document.getElementById('posOperatorInput');
    if (posActiveSession) {
        const bal = parseFloat(posActiveSession.opening_balance || 0).toFixed(3);
        badge.className = 'pos-session-badge open';
        badge.innerHTML = `<i data-lucide="circle"></i> Fond: ${bal} TND`;
        toggleBtn.innerHTML = '<i data-lucide="square"></i> Clôturer';
        if (zBtn) zBtn.style.display = '';
        if (xBtn) xBtn.style.display = '';
        if (cashMoveBtn) cashMoveBtn.style.display = '';
        if (opInput) opInput.style.display = '';
    } else {
        badge.className = 'pos-session-badge closed';
        badge.innerHTML = '<i data-lucide="circle"></i> Session fermée';
        toggleBtn.innerHTML = '<i data-lucide="play"></i> Ouvrir';
        if (zBtn) zBtn.style.display = 'none';
        if (xBtn) xBtn.style.display = 'none';
        if (cashMoveBtn) cashMoveBtn.style.display = 'none';
        if (opInput) opInput.style.display = 'none';
    }
    loadTodayTotal();
    if (window.lucide) lucide.createIcons();
}

async function loadTodayTotal() {
    try {
        // Prefer session totals (always up-to-date), fallback to document query
        if (posActiveSession && posActiveSession.total_sales > 0) {
            const v = parseFloat(posActiveSession.total_sales) || 0;
            document.getElementById('posTodayTotal').innerHTML = v.toFixed(3) + ' TND <small>ventes</small>';
            return;
        }
        const sales = await window.electronAPI.getTodayPOSSales(currentUser.id);
        const total = (sales || []).reduce((s, d) => s + (d.totalTTC || 0), 0);
        document.getElementById('posTodayTotal').innerHTML = total.toFixed(3) + ' TND <small>ventes</small>';
    } catch { document.getElementById('posTodayTotal').innerHTML = '0,000 TND <small>ventes</small>'; }
}

// ── TTC Pricing Mode ──────────────────────────────────────────
function posToggleTTCMode() {
    posTTCMode = !posTTCMode;
    const btn = document.getElementById('posTTCToggle');
    btn.classList.toggle('active', posTTCMode);
    btn.innerHTML = posTTCMode ? '<i data-lucide="toggle-right"></i>' : '<i data-lucide="toggle-left"></i>';
    const activeCat = document.querySelector('.pos-cat-btn.active');
    renderPOSProducts(activeCat ? activeCat.dataset.cat : 'all');
    if (window.lucide) lucide.createIcons();
}

// ── Today Sales Toggle ────────────────────────────────────────
async function posToggleTodaySales() {
    posTodaySalesOpen = !posTodaySalesOpen;
    const btn = document.getElementById('posTodaySalesBtn');
    btn.classList.toggle('active', posTodaySalesOpen);
    if (posTodaySalesOpen) {
        await posLoadTodaySales();
        document.getElementById('posTodaySalesModal').style.display = 'flex';
    } else {
        document.getElementById('posTodaySalesModal').style.display = 'none';
    }
}
function posCloseTodaySales() {
    posTodaySalesOpen = false;
    document.getElementById('posTodaySalesBtn').classList.remove('active');
    document.getElementById('posTodaySalesModal').style.display = 'none';
}
async function posLoadTodaySales() {
    try {
        const sales = await window.electronAPI.getTodayPOSSales(currentUser.id);
        const content = document.getElementById('posTodaySalesContent');
        if (!sales || sales.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Aucune vente aujourd\'hui</div>';
            return;
        }
        const total = sales.reduce((s, d) => s + (d.totalTTC || 0), 0);
        const payLabels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile Money', check: 'Chèque' };
        content.innerHTML = `<div style="margin-bottom:10px;display:flex;justify-content:space-between;font-weight:600;font-size:0.9rem;border-bottom:2px solid var(--border);padding-bottom:6px">
            <span>${sales.length} vente(s) — Total: ${total.toFixed(3)} TND</span>
        </div>` + sales.map(s => {
            const d = new Date(s.created_at);
            const t = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const payLabel = payLabels[s.paymentMode] || s.paymentMode;
            const isNegative = (s.totalTTC || 0) < 0;
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 6px;border-bottom:1px solid var(--border-light);font-size:0.85rem;${isNegative ? 'opacity:0.6' : ''}">
                <div>
                    <strong>#${s.number}</strong> <span style="color:var(--text-muted)">${t}</span>
                    ${isNegative ? '<span style="color:#dc2626;font-size:0.7rem;font-weight:600"> REMBOURSÉ</span>' : ''}
                    <br><span style="font-size:0.75rem;color:var(--text-muted)">${escHtml(s.client_name || s.clientName || 'Client du magasin')}</span>
                </div>
                <div style="text-align:right">
                    <strong>${(s.totalTTC || 0).toFixed(3)} TND</strong>
                    <br><span style="font-size:0.7rem;color:var(--text-muted)">${payLabel}</span>
                    ${!isNegative && posActiveSession ? `<br><button class="btn btn-danger" style="font-size:0.65rem;padding:2px 6px;margin-top:4px" onclick="posRefundSale('${s.id}');event.stopPropagation()">Rembourser</button>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch { document.getElementById('posTodaySalesContent').innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger)">Erreur de chargement</div>'; }
}

// ── Last Receipt Reprint ──────────────────────────────────────
function posReprintLast() {
    if (posLastReceiptData) {
        posShowReceipt(posLastReceiptData);
    } else {
        showToast('Aucun ticket à réimprimer', 'warning');
    }
}

// ── Hold / Resume Cart ────────────────────────────────────────
function posHoldCart() {
    if (posCart.length === 0) { showToast('Panier vide', 'warning'); return; }
    posHeldCart = JSON.parse(JSON.stringify(posCart));
    posCart = [];
    renderPOSCart();
    document.getElementById('posHoldBtn').style.display = 'none';
    const ind = document.getElementById('posHeldIndicator');
    ind.style.display = 'inline-flex';
    ind.innerHTML = `<i data-lucide="rotate-ccw" style="width:12px;height:12px"></i> 1 en attente`;
    if (window.lucide) lucide.createIcons();
    showToast('Panier mis en attente', 'info');
}
function posResumeCart() {
    if (!posHeldCart) return;
    if (posCart.length > 0) {
        showConfirm('Reprendre', 'Le panier actuel sera remplacé. Continuer ?', () => { doResume(); });
    } else {
        doResume();
    }
    function doResume() {
        posCart = JSON.parse(JSON.stringify(posHeldCart));
        posHeldCart = null;
        renderPOSCart();
        document.getElementById('posHoldBtn').style.display = '';
        document.getElementById('posHeldIndicator').style.display = 'none';
        showToast('Panier restauré', 'success');
    }
}

// ── Z-Report ──────────────────────────────────────────────────
async function posZReport() {
    if (!posActiveSession) { showToast('Aucune session active', 'warning'); return; }
    showLoading('Génération du rapport...');
    try {
        const sales = await window.electronAPI.getTodayPOSSales(currentUser.id);
        const openingBal = parseFloat(posActiveSession.opening_balance || 0);
        const cashSales = parseFloat(posActiveSession.cash_sales || 0);
        const cardSales = parseFloat(posActiveSession.card_sales || 0);
        const totalSales = parseFloat(posActiveSession.total_sales || 0);
        const txCount = posActiveSession.transaction_count || 0;
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        let storeName = 'FACTARLOU', storeMF = '';
        try {
            const company = await window.electronAPI.getCompany(currentUser.id);
            if (company) { storeName = company.name || storeName; storeMF = company.mf || ''; }
        } catch {}
        const payLabels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile Money', check: 'Chèque' };
        let byMethod = '<div style="font-size:0.7rem;margin:4px 0">';
        if (cashSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Espèces</span><span>${cashSales.toFixed(3)}</span></div>`;
        if (cardSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Carte</span><span>${cardSales.toFixed(3)}</span></div>`;
        const mobileSales = sales.filter(s => s.paymentMode === 'mobile').reduce((sum, s) => sum + (s.totalTTC || 0), 0);
        const checkSales = sales.filter(s => s.paymentMode === 'check').reduce((sum, s) => sum + (s.totalTTC || 0), 0);
        if (mobileSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Mobile Money</span><span>${mobileSales.toFixed(3)}</span></div>`;
        if (checkSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Chèque</span><span>${checkSales.toFixed(3)}</span></div>`;
        byMethod += '</div>';

        document.getElementById('posZReportContent').innerHTML = `
            <div style="text-align:center;margin-bottom:10px">
                <div style="font-weight:700;font-size:1rem">${escHtml(storeName)}</div>
                ${storeMF ? `<div style="font-size:0.7rem;color:#666">MF: ${storeMF}</div>` : ''}
                <div style="font-size:0.7rem;color:#666;margin-top:4px">RAPPORT Z</div>
                <div style="font-size:0.7rem;color:#666">${dateStr} ${timeStr}</div>
            </div>
            <div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:6px 0;margin:6px 0">
                <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Fond de caisse</span><span>${openingBal.toFixed(3)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Total des ventes</span><span>${totalSales.toFixed(3)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Nombre de transactions</span><span>${txCount}</span></div>
                <div style="font-weight:700;display:flex;justify-content:space-between;font-size:0.85rem;margin-top:4px;padding-top:4px;border-top:1px solid #ccc">
                    <span>Total caisse attendu</span><span>${(openingBal + totalSales).toFixed(3)} TND</span>
                </div>
            </div>
            <div style="margin:6px 0;font-size:0.8rem">
                <div style="font-weight:600;margin-bottom:2px">Par moyen de paiement</div>
                ${byMethod}
            </div>
            <div style="font-size:0.7rem;color:#999;text-align:center;margin-top:10px;border-top:1px dashed #ccc;padding-top:6px">
                Rapport Z — ${dateStr}
            </div>`;
        document.getElementById('posZReportModal').style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
    finally { hideLoading(); }
}
function posPrintZReport() {
    const content = document.getElementById('posZReportContent').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
        body{font-family:'Courier New',monospace;font-size:12px;width:80mm;margin:0 auto;padding:10px;color:#000}
        @media print{@page{size:80mm auto;margin:0}body{margin:0;padding:10px}}
    </style></head><body>${content}
    <script>window.print();setTimeout(()=>window.close(),500);<\/script></body></html>`);
    win.document.close();
}

// ── Rapport X (mid-day, no session close) ─────────────────────
async function posXReport() {
    if (!posActiveSession) { showToast('Aucune session active', 'warning'); return; }
    showLoading('Génération du rapport...');
    try {
        const sales = await window.electronAPI.getTodayPOSSales(currentUser.id);
        const openingBal = parseFloat(posActiveSession.opening_balance || 0);
        const cashSales = parseFloat(posActiveSession.cash_sales || 0);
        const cardSales = parseFloat(posActiveSession.card_sales || 0);
        const totalSales = parseFloat(posActiveSession.total_sales || 0);
        const txCount = posActiveSession.transaction_count || 0;
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        let storeName = 'FACTARLOU', storeMF = '';
        try {
            const company = await window.electronAPI.getCompany(currentUser.id);
            if (company) { storeName = company.name || storeName; storeMF = company.mf || ''; }
        } catch {}
        const mobileSales = sales.filter(s => s.paymentMode === 'mobile').reduce((sum, s) => sum + (s.totalTTC || 0), 0);
        const checkSales = sales.filter(s => s.paymentMode === 'check').reduce((sum, s) => sum + (s.totalTTC || 0), 0);
        let byMethod = '';
        if (cashSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Espèces</span><span>${cashSales.toFixed(3)}</span></div>`;
        if (cardSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Carte</span><span>${cardSales.toFixed(3)}</span></div>`;
        if (mobileSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Mobile Money</span><span>${mobileSales.toFixed(3)}</span></div>`;
        if (checkSales > 0) byMethod += `<div style="display:flex;justify-content:space-between"><span>Chèque</span><span>${checkSales.toFixed(3)}</span></div>`;
        const cashMovesNet = posCashMoves.reduce((s, m) => s + (m.type === 'in' ? m.amount : -m.amount), 0);
        const expectedCash = openingBal + cashSales + cashMovesNet;

        document.getElementById('posZReportContent').innerHTML = `
            <div style="text-align:center;margin-bottom:10px">
                <div style="font-weight:700;font-size:1rem">${escHtml(storeName)}</div>
                ${storeMF ? `<div style="font-size:0.7rem;color:#666">MF: ${storeMF}</div>` : ''}
                <div style="font-size:0.7rem;color:#666;margin-top:4px">RAPPORT X</div>
                <div style="font-size:0.7rem;color:#666">${dateStr} ${timeStr}</div>
            </div>
            <div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:6px 0;margin:6px 0">
                <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Fond de caisse</span><span>${openingBal.toFixed(3)}</span></div>
                ${cashMovesNet !== 0 ? `<div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Mouvements nets</span><span>${cashMovesNet > 0 ? '+' : ''}${cashMovesNet.toFixed(3)}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Total des ventes</span><span>${totalSales.toFixed(3)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Nombre de transactions</span><span>${txCount}</span></div>
                <div style="font-weight:700;display:flex;justify-content:space-between;font-size:0.85rem;margin-top:4px;padding-top:4px;border-top:1px solid #ccc">
                    <span>Total caisse attendu</span><span>${expectedCash.toFixed(3)} TND</span>
                </div>
            </div>
            <div style="margin:6px 0;font-size:0.8rem">
                <div style="font-weight:600;margin-bottom:2px">Par moyen de paiement</div>
                ${byMethod}
            </div>
            <div style="font-size:0.7rem;color:#999;text-align:center;margin-top:10px;border-top:1px dashed #ccc;padding-top:6px">
                Rapport X — ${dateStr}
            </div>`;
        document.getElementById('posZReportModal').style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

// ── Override prix dans le panier ──────────────────────────────
function posOverridePrice(index, span) {
    const item = posCart[index];
    if (!item) return;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.001';
    input.min = '0';
    input.value = item.price;
    input.style.width = '70px';
    input.style.padding = '2px 4px';
    input.style.border = '1px solid var(--primary)';
    input.style.borderRadius = '4px';
    input.style.fontSize = '0.85rem';
    input.style.textAlign = 'right';
    input.style.fontWeight = '700';
    input.style.fontFamily = 'inherit';
    input.onblur = () => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val >= 0) { item.price = val; item.priceOverridden = true; }
        renderPOSCart();
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter') { input.blur(); }
        if (e.key === 'Escape') { renderPOSCart(); }
    };
    span.replaceWith(input);
    input.focus();
    input.select();
}

// ── Favoris ───────────────────────────────────────────────────
function posToggleFavorite(productId) {
    const idx = posFavorites.indexOf(productId);
    if (idx >= 0) { posFavorites.splice(idx, 1); } else { posFavorites.push(productId); }
    localStorage.setItem('tuni_pos_favorites', JSON.stringify(posFavorites));
    const activeCat = document.querySelector('.pos-cat-btn.active');
    renderPOSProducts(activeCat ? activeCat.dataset.cat : 'all');
}

function posShowFavorites() {
    posFilterCategory(document.querySelector('[data-cat="__fav__"]'), '__fav__');
}

// ── Création rapide de produit ────────────────────────────────
function posOpenCreateProduct() {
    document.getElementById('posCreateProductModal').style.display = 'flex';
    document.getElementById('posNewProdName').value = '';
    document.getElementById('posNewProdPrice').value = '';
    document.getElementById('posNewProdTVA').value = '19';
    document.getElementById('posNewProdCategory').value = '';
    document.getElementById('posNewProdBarcode').value = '';
    document.getElementById('posNewProdStock').value = '0';
    setTimeout(() => document.getElementById('posNewProdName').focus(), 100);
}

function posCreateProduct() {
    const name = document.getElementById('posNewProdName').value.trim();
    const price = parseFloat(document.getElementById('posNewProdPrice').value) || 0;
    const tva = parseFloat(document.getElementById('posNewProdTVA').value) || 19;
    if (!name) { showToast('Nom requis', 'warning'); return; }
    showLoading('Création...');
    window.electronAPI.saveService({
        userId: currentUser.id, name, price, tva,
        category: document.getElementById('posNewProdCategory').value.trim() || null,
        barcode: document.getElementById('posNewProdBarcode').value.trim() || null,
        stock: parseInt(document.getElementById('posNewProdStock').value) || 0,
        minStock: 0
    }).then(result => {
        hideLoading();
        if (result.success) {
            showToast('Produit créé', 'success');
            document.getElementById('posCreateProductModal').style.display = 'none';
            loadPOSProducts();
        } else { showToast('Erreur: ' + (result.error || 'Échec'), 'error'); }
    }).catch(e => { hideLoading(); showToast('Erreur: ' + e.message, 'error'); });
}

// ── Mouvements de caisse ──────────────────────────────────────
function posAddCashMove() {
    const reason = prompt('Motif du mouvement (ex: Retrait fournisseur, Apport):');
    if (!reason || !reason.trim()) return;
    const amount = parseFloat(prompt('Montant (négatif = retrait, positif = apport):'));
    if (isNaN(amount) || amount === 0) return;
    const type = amount > 0 ? 'in' : 'out';
    posCashMoves.push({ reason: reason.trim(), amount: Math.abs(amount), type, date: new Date().toISOString() });
    showToast(`Mouvement enregistré: ${amount > 0 ? '+' : ''}${amount.toFixed(3)} TND`, amount > 0 ? 'success' : 'warning');
    updatePOSSessionUI();
}

function posGetNetCashMoves() {
    return posCashMoves.reduce((s, m) => s + (m.type === 'in' ? m.amount : -m.amount), 0);
}

// ── Remboursement ─────────────────────────────────────────────
async function posRefundSale(saleId) {
    if (!showConfirm) { if (!confirm('Rembourser cette vente ?')) return; }
    else {
        const confirmed = await new Promise(resolve => {
            showConfirm('Remboursement', 'Annuler cette vente et rembourser le client ? Le stock sera réintégré.', resolve);
        });
        if (!confirmed) return;
    }
    showLoading('Remboursement...');
    try {
        const sale = await window.electronAPI.getPOSSale(saleId);
        if (!sale) { hideLoading(); showToast('Vente introuvable', 'error'); return; }
        // Reverse stock
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
        (items || []).forEach(item => {
            if (item.serviceId) {
                const product = posAllProducts.find(p => p.id === item.serviceId);
                if (product) {
                    const qty = item.quantity || item.qty || 0;
                    window.electronAPI.updatePOSStock({ id: item.serviceId, quantity: (product.stock || 0) + qty });
                }
            }
        });
        // Create refund document
        const refundResult = await window.electronAPI.savePOSSale({
            userId: currentUser.id,
            items: (items || []).map(i => ({ ...i, quantity: -(i.quantity || i.qty || 0) })),
            totalHT: -(sale.total_ht || sale.totalHT || 0),
            totalTTC: -(sale.total_ttc || sale.totalTTC || 0),
            paymentMethod: 'cash',
            clientName: sale.client_name || sale.clientName || 'Client du magasin',
            notes: `Remboursement de ${sale.number || ''}`,
            sessionId: posActiveSession ? posActiveSession.id : null,
            currency: 'TND'
        });
        if (refundResult.success) {
            showToast('Vente remboursée', 'success');
            if (posTodaySalesOpen) posLoadTodaySales();
            loadPOSProducts();
            if (posActiveSession) { posActiveSession = await window.electronAPI.getActivePOSSession(currentUser.id); }
            loadTodayTotal();
        } else { showToast('Erreur: ' + (refundResult.error || 'Échec'), 'error'); }
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

// ── Fidélité ──────────────────────────────────────────────────
let posLoyaltyPoints = {};

function posGetLoyalty(clientName) {
    if (!clientName || clientName === 'Client du magasin') return 0;
    const key = 'tuni_pos_loyalty_' + currentUser.id;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return data[clientName] || 0;
}

function posAddLoyaltyPoints(clientName, amount) {
    if (!clientName || clientName === 'Client du magasin') return;
    const key = 'tuni_pos_loyalty_' + currentUser.id;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[clientName] = (data[clientName] || 0) + Math.floor(amount / 10);
    localStorage.setItem(key, JSON.stringify(data));
}

async function posToggleSession() {
    const modal = document.getElementById('posSessionModal');
    const title = document.getElementById('posSessionModalTitleText');
    const openFields = document.getElementById('posSessionOpenFields');
    const closeFields = document.getElementById('posSessionCloseFields');
    const closeSummary = document.getElementById('posSessionCloseSummary');
    const confirmBtn = document.getElementById('posSessionConfirmBtn');
    const diffEl = document.getElementById('posSessionCloseDiff');

    if (posActiveSession) {
        // Show close session form
        title.textContent = 'Clôturer la session';
        openFields.style.display = 'none';
        closeFields.style.display = 'block';
        closeSummary.style.display = 'block';
        confirmBtn.textContent = 'Clôturer la session';
        confirmBtn.className = 'btn btn-danger';

        // Show session totals
        const openingBal = parseFloat(posActiveSession.opening_balance || 0);
        const cashSales = parseFloat(posActiveSession.cash_sales || 0);
        const cardSales = parseFloat(posActiveSession.card_sales || 0);
        const totalSales = parseFloat(posActiveSession.total_sales || 0);
        const cashMovesNet = posCashMoves.reduce((s, m) => s + (m.type === 'in' ? m.amount : -m.amount), 0);
        const expectedCash = openingBal + cashSales + cashMovesNet;
        document.getElementById('posSessOpeningBal').textContent = openingBal.toFixed(3) + ' TND';
        document.getElementById('posSessCashSales').textContent = cashSales.toFixed(3) + ' TND';
        document.getElementById('posSessCardSales').textContent = cardSales.toFixed(3) + ' TND';
        const movesEl = document.getElementById('posSessCashMoves');
        if (posCashMoves.length > 0) {
            movesEl.style.display = 'block';
            movesEl.innerHTML = '<div style="font-weight:600;margin-top:4px">Mouvements de caisse:</div>' +
                posCashMoves.map(m => `<div style="display:flex;justify-content:space-between;font-size:0.75rem;padding:1px 0">
                    <span>${escHtml(m.reason)}</span>
                    <span style="color:${m.type === 'in' ? 'var(--success)' : 'var(--danger)'}">${m.type === 'in' ? '+' : '-'}${m.amount.toFixed(3)}</span>
                </div>`).join('') +
                `<div style="display:flex;justify-content:space-between;font-size:0.8rem;font-weight:600;padding:2px 0;border-top:1px solid #bbf7d0;margin-top:2px">
                    <span>Net mouvements</span>
                    <span>${cashMovesNet >= 0 ? '+' : ''}${cashMovesNet.toFixed(3)}</span>
                </div>`;
        } else {
            movesEl.style.display = 'none';
        }
        document.getElementById('posSessCount').textContent = posActiveSession.transaction_count || 0;
        document.getElementById('posSessExpectedTotal').textContent = (openingBal + totalSales + cashMovesNet).toFixed(3) + ' TND';

        document.getElementById('posSessionClosingCash').value = (posActiveSession.cash_sales || 0).toFixed(3);
        document.getElementById('posSessionClosingCard').value = (posActiveSession.card_sales || 0).toFixed(3);
        diffEl.style.display = 'none';
        window._posSessionAction = 'close';
    } else {
        // Show open session form
        title.textContent = 'Ouvrir une session';
        openFields.style.display = 'block';
        closeFields.style.display = 'none';
        closeSummary.style.display = 'none';
        confirmBtn.textContent = 'Ouvrir la session';
        confirmBtn.className = 'btn btn-primary';
        document.getElementById('posSessionOpeningBal').value = '0';
        window._posSessionAction = 'open';
    }
    modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
}

function posCloseSessionModal() {
    document.getElementById('posSessionModal').style.display = 'none';
}

async function posConfirmSession() {
    const action = window._posSessionAction;
    const modal = document.getElementById('posSessionModal');

    if (action === 'open') {
        const amount = parseFloat(document.getElementById('posSessionOpeningBal').value) || 0;
        posCashMoves = [];
        posOperatorName = document.getElementById('posOperatorInput').value.trim();
        showLoading('Ouverture de session...');
        try {
            posActiveSession = await window.electronAPI.openPOSSession({
                userId: currentUser.id, openingBalance: amount
            });
            showToast('Session ouverte', 'success');
            modal.style.display = 'none';
            updatePOSSessionUI();
        } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
        finally { hideLoading(); }
    } else {
        const cash = parseFloat(document.getElementById('posSessionClosingCash').value) || 0;
        const card = parseFloat(document.getElementById('posSessionClosingCard').value) || 0;
        const openingBal = parseFloat(posActiveSession.opening_balance || 0);
        const cashSales = parseFloat(posActiveSession.cash_sales || 0);
        const cashMovesNet = posCashMoves.reduce((s, m) => s + (m.type === 'in' ? m.amount : -m.amount), 0);
        const expectedCash = openingBal + cashSales + cashMovesNet;
        const diff = cash - expectedCash;
        const doClose = () => {
            showLoading('Clôture de session...');
            window.electronAPI.closePOSSession({
                id: posActiveSession.id, closingCash: cash, closingCard: card
            }).then(result => {
                hideLoading();
                if (result && result.id) {
                    showToast('Session clôturée', 'success');
                    modal.style.display = 'none';
                    posActiveSession = null;
                    posCashMoves = [];
                    updatePOSSessionUI();
                } else { showToast('Erreur de clôture', 'error'); }
            }).catch(e => { hideLoading(); showToast('Erreur: ' + e.message, 'error'); });
        };
        if (Math.abs(diff) > 0.001) {
            showConfirm('Écart de caisse',
                `Fond + ventes espèces attendus: ${expectedCash.toFixed(3)} TND\nEspèces déclarées: ${cash.toFixed(3)} TND\nÉcart: ${diff > 0 ? '+' : ''}${diff.toFixed(3)} TND`,
                doClose
            );
        } else {
            doClose();
        }
    }
}

async function loadPOSProducts() {
    try {
        posAllProducts = await window.electronAPI.getPOSProducts(currentUser.id);
        renderPOSProducts('all');
        renderPOSCategories();
        checkLowStock();
    } catch {}
}

async function checkLowStock() {
    try {
        const low = await window.electronAPI.getPOSLowStock(currentUser.id);
        const badge = document.getElementById('posLowStockBadge');
        if (!badge) return;
        if (low && low.length > 0) {
            badge.style.display = 'flex';
            badge.innerHTML = `<i data-lucide="alert-triangle" style="width:12px"></i> ${low.length} en stock bas`;
            if (window.lucide) lucide.createIcons();
        } else {
            badge.style.display = 'none';
        }
    } catch {}
}

function renderPOSCategories() {
    const cats = ['__fav__', 'all', ...new Set(posAllProducts.map(p => p.category || 'Autre').filter(Boolean))];
    const container = document.getElementById('posCategories');
    container.innerHTML = cats.map(c => {
        const label = c === '__fav__' ? '⭐ Favoris' : (c === 'all' ? 'Tout' : c);
        const cls = c === 'all' ? 'active' : '';
        return `<button class="pos-cat-btn ${cls}" data-cat="${c}" onclick="posFilterCategory(this, '${c}')">${escHtml(label)}</button>`;
    }).join('');
}

function posFilterCategory(btn, cat) {
    document.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPOSProducts(cat);
}

function renderPOSProducts(category) {
    const grid = document.getElementById('posProductGrid');
    let filtered;
    if (category === '__fav__') {
        filtered = posAllProducts.filter(p => posFavorites.includes(p.id));
    } else {
        filtered = category === 'all' ? posAllProducts : posAllProducts.filter(p => (p.category || 'Autre') === category);
    }
    if (posSearchFilter) {
        const q = posSearchFilter.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.category || '').toLowerCase().includes(q)
        );
    }
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="pos-empty">Aucun produit trouvé</div>';
        return;
    }
    grid.innerHTML = filtered.map(p => {
        const stock = p.stock || 0;
        const tracking = p.min_stock > 0;
        const outOfStock = tracking && stock <= 0;
        const lowStock = tracking && stock <= p.min_stock;
        const stockLabel = tracking
            ? (outOfStock ? 'Rupture' : `Stock: ${stock}`)
            : '';
        const displayPrice = posTTCMode
            ? (p.price || 0) * (1 + (p.tva || 19) / 100)
            : (p.price || 0);
        const priceLabel = displayPrice.toFixed(3) + (posTTCMode ? ' TTC' : ' TND');
        const isFav = posFavorites.includes(p.id);
        const img = p.image || '';
        return `<div class="pos-product-card ${outOfStock ? 'pos-out-of-stock' : ''}" onclick="${outOfStock ? '' : `posAddToCart('${p.id}')`}" title="${escHtml(p.description || p.name)}">
            <button class="pos-fav-star ${isFav ? 'active' : ''}" onclick="event.stopPropagation();posToggleFavorite('${p.id}')" title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${isFav ? '★' : '☆'}</button>
            ${posTTCMode ? `<div class="pos-prod-tag-ttc">TTC</div>` : ''}
            ${img ? `<img class="pos-prod-img" src="${escHtml(img)}" alt="${escHtml(p.name)}" loading="lazy">` : ''}
            <div class="pos-prod-name">${escHtml(p.name)}</div>
            <div class="pos-prod-price">${priceLabel}</div>
            ${stockLabel ? `<div class="pos-prod-stock ${lowStock ? 'low' : ''}">${stockLabel}</div>` : ''}
        </div>`;
    }).join('');
}

function posFilterSearch(val) {
    posSearchFilter = val.trim();
    const activeCat = document.querySelector('.pos-cat-btn.active');
    renderPOSProducts(activeCat ? activeCat.dataset.cat : 'all');
}

function posAddToCart(productId) {
    const product = posAllProducts.find(p => p.id === productId);
    if (!product) return;
    const tracking = product.min_stock > 0;
    if (tracking && (product.stock || 0) <= 0) { showToast('Stock épuisé', 'warning'); return; }
    const existing = posCart.find(c => c.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        posCart.push({ id: product.id, name: product.name, price: product.price || 0, tva: product.tva || 19, qty: 1, discount: 0, priceOverridden: false });
    }
    renderPOSCart();
    document.getElementById('posBarcodeInput').focus();
}

function renderPOSCart() {
    const itemsEl = document.getElementById('posCartItems');
    const totalsEl = document.getElementById('posCartTotals');
    const countEl = document.getElementById('posCartCount');
    const clearBtn = document.getElementById('posClearBtn');
    const payBtn = document.getElementById('posPayBtn');

    countEl.textContent = posCart.reduce((s, c) => s + c.qty, 0);

    if (posCart.length === 0) {
        itemsEl.innerHTML = '<div class="pos-cart-empty">Panier vide<br><small>Scannez ou cliquez un produit</small></div>';
        totalsEl.style.display = 'none';
        clearBtn.disabled = true;
        payBtn.disabled = true;
        return;
    }

    document.getElementById('posCartNotes').style.display = posCart.length > 0 ? 'block' : 'none';
    clearBtn.disabled = false;
    payBtn.disabled = false;

    const lineTotals = posCart.map(item => {
        const lineHT = item.qty * item.price;
        const discountAmt = lineHT * ((item.discount || 0) / 100);
        return lineHT - discountAmt;
    });

    itemsEl.innerHTML = posCart.map((item, i) => {
        const lineHT = item.qty * item.price;
        const discountPct = item.discount || 0;
        const discountAmt = lineHT * discountPct / 100;
        const total = lineHT - discountAmt;
        const tvaAmt = (item.tva > 0) ? total * item.tva / 100 : 0;
        const priceOverridden = item.priceOverridden;
        return `<div class="pos-cart-item">
            <div style="flex:1;min-width:0">
                <div class="pos-ci-name">${escHtml(item.name)}</div>
                <div class="pos-ci-discount">
                    <label>−${discountPct}%</label>
                    <input type="number" min="0" max="100" step="1" value="${discountPct}" onchange="posSetDiscount(${i},this)" onclick="event.stopPropagation()">
                </div>
            </div>
            <div class="pos-ci-qty">
                <button onclick="posDecQty(${i})">−</button>
                <span ondblclick="posQuickQty(${i},this)" style="cursor:pointer" title="Double-clic quantité">${item.qty}</span>
                <button onclick="posIncQty(${i})">+</button>
            </div>
            <div style="text-align:right">
                <span class="pos-ci-total ${discountPct > 0 ? 'pos-ci-discounted' : ''}" ondblclick="posOverridePrice(${i},this)" style="cursor:pointer" title="Double-clic prix">${total.toFixed(3)}</span>
                ${priceOverridden ? `<div style="font-size:0.55rem;color:#f59e0b;font-weight:600">PRIX MODIFIÉ</div>` : ''}
                ${tvaAmt > 0 ? `<div style="font-size:0.6rem;color:var(--text-muted)">TVA ${tvaAmt.toFixed(3)}</div>` : ''}
            </div>
            <button class="pos-ci-remove" onclick="posRemoveItem(${i})"><i data-lucide="x" style="width:14px"></i></button>
        </div>`;
    }).join('');

    const subtotal = posCart.reduce((s, c) => s + c.qty * c.price, 0);
    const totalDiscount = posCart.reduce((s, c) => {
        const lineHT = c.qty * c.price;
        return s + lineHT * (c.discount || 0) / 100;
    }, 0);
    const discountedHT = subtotal - totalDiscount;
    const tvaByRate = {};
    posCart.forEach(c => {
        const lineHT = c.qty * c.price;
        const lineDiscountAmt = lineHT * (c.discount || 0) / 100;
        const taxable = lineHT - lineDiscountAmt;
        if (c.tva > 0) tvaByRate[c.tva] = (tvaByRate[c.tva] || 0) + taxable * c.tva / 100;
    });
    const totalTVA = Object.values(tvaByRate).reduce((s, v) => s + v, 0);
    const grandTotal = discountedHT + totalTVA;

    document.getElementById('posSubtotal').textContent = subtotal.toFixed(3);
    const discountRow = document.getElementById('posDiscountRow');
    if (totalDiscount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('posDiscountTotal').textContent = '-' + totalDiscount.toFixed(3);
    } else {
        discountRow.style.display = 'none';
    }
    document.getElementById('posTaxTotal').textContent = totalTVA.toFixed(3);
    document.getElementById('posGrandTotal').textContent = grandTotal.toFixed(3);
    document.getElementById('posPayBtnAmount').textContent = grandTotal.toFixed(3) + ' TND';
    totalsEl.style.display = 'block';

    if (window.lucide) lucide.createIcons();
}

function posSetDiscount(index, input) {
    const val = parseFloat(input.value) || 0;
    const clamped = Math.min(100, Math.max(0, val));
    input.value = clamped;
    if (posCart[index]) posCart[index].discount = clamped;
    renderPOSCart();
}

function posQuickQty(index, span) {
    const current = posCart[index] ? posCart[index].qty : 1;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '9999';
    input.value = current;
    input.style.width = '40px';
    input.style.padding = '2px 4px';
    input.style.border = '1px solid var(--border)';
    input.style.borderRadius = '4px';
    input.style.fontSize = '0.85rem';
    input.style.textAlign = 'center';
    input.style.fontWeight = '700';
    input.style.fontFamily = 'inherit';
    input.onblur = () => {
        const val = parseInt(input.value) || 1;
        if (posCart[index]) { posCart[index].qty = Math.max(1, val); }
        renderPOSCart();
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter') { input.blur(); }
        if (e.key === 'Escape') { renderPOSCart(); }
    };
    span.replaceWith(input);
    input.focus();
    input.select();
}

function posIncQty(index) {
    const item = posCart[index];
    if (!item) return;
    const product = posAllProducts.find(p => p.id === item.id);
    const tracking = product && product.min_stock > 0;
    if (tracking && (product.stock || 0) <= item.qty) { showToast('Stock insuffisant', 'warning'); return; }
    item.qty += 1;
    renderPOSCart();
}

function posDecQty(index) {
    const item = posCart[index];
    if (!item) return;
    if (item.qty <= 1) { posCart.splice(index, 1); }
    else { item.qty -= 1; }
    renderPOSCart();
}

function posRemoveItem(index) {
    posCart.splice(index, 1);
    renderPOSCart();
}

function posClearCart() {
    posCart = [];
    renderPOSCart();
    document.getElementById('posBarcodeInput').focus();
}

function posOpenPayment() {
    if (posCart.length === 0) { showToast('Panier vide', 'warning'); return; }
    const subtotal = posCart.reduce((s, c) => s + c.qty * c.price, 0);
    const totalDiscount = posCart.reduce((s, c) => s + (c.qty * c.price) * (c.discount || 0) / 100, 0);
    const discountedHT = subtotal - totalDiscount;
    const total = discountedHT +
        Object.values(posCart.reduce((r, c) => {
            if (c.tva > 0) {
                const lineHT = c.qty * c.price;
                const lineDiscount = lineHT * (c.discount || 0) / 100;
                r[c.tva] = (r[c.tva] || 0) + (lineHT - lineDiscount) * c.tva / 100;
            }
            return r;
        }, {})).reduce((s, v) => s + v, 0);
    document.getElementById('posPayTotal').textContent = total.toFixed(3) + ' TND';
    document.getElementById('posAmountReceived').value = '';
    document.getElementById('posChangeDisplay').style.display = 'none';
    document.getElementById('posPayClient').value = '';
    document.getElementById('posPayNotes').value = '';
    posSelectedMethod = 'cash';
    posSplitPayments = [];
    document.querySelectorAll('.pos-pay-method').forEach(b => b.classList.toggle('active', b.dataset.method === 'cash'));
    document.getElementById('posCashSection').style.display = 'block';
    document.getElementById('posSplitPaymentsList').innerHTML = '';
    document.getElementById('posPaymentModal').style.display = 'flex';
    if (window.lucide) lucide.createIcons();
}

function posSelectPayMethod(btn) {
    document.querySelectorAll('.pos-pay-method').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    posSelectedMethod = btn.dataset.method;
    // If split payments exist, add this method as a split
    const totalText = document.getElementById('posPayTotal').textContent;
    const total = parseFloat(totalText) || 0;
    const splitTotal = posSplitPayments.reduce((s, p) => s + p.amount, 0);
    const remaining = total - splitTotal;
    if (posSplitPayments.length > 0 && remaining > 0) {
        posSplitPayments.push({ method: posSelectedMethod, amount: remaining });
        posRenderSplitPayments();
        posSelectedMethod = 'cash';
        document.querySelectorAll('.pos-pay-method').forEach(b => b.classList.remove('active'));
        document.querySelector('.pos-pay-method[data-method="cash"]').classList.add('active');
    }
    document.getElementById('posCashSection').style.display = posSelectedMethod === 'cash' ? 'block' : 'none';
}

function posAddSplitPayment() {
    const totalText = document.getElementById('posPayTotal').textContent;
    const total = parseFloat(totalText) || 0;
    const splitTotal = posSplitPayments.reduce((s, p) => s + p.amount, 0);
    const remaining = total - splitTotal;
    if (remaining <= 0) { showToast('Total déjà atteint', 'warning'); return; }
    if (!posSelectedMethod || posSelectedMethod === 'multiple') { showToast('Sélectionnez un moyen', 'warning'); return; }
    // Check if this method already exists in split
    const existing = posSplitPayments.find(p => p.method === posSelectedMethod);
    if (existing) {
        existing.amount += remaining;
    } else {
        posSplitPayments.push({ method: posSelectedMethod, amount: remaining });
    }
    posRenderSplitPayments();
    // Reset method selector
    posSelectedMethod = 'cash';
    document.querySelectorAll('.pos-pay-method').forEach(b => b.classList.remove('active'));
    document.querySelector('.pos-pay-method[data-method="cash"]').classList.add('active');
    document.getElementById('posCashSection').style.display = 'block';
    showToast('Paiement partagé ajouté', 'success');
}

function posRenderSplitPayments() {
    const el = document.getElementById('posSplitPaymentsList');
    const payLabels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile Money', check: 'Chèque' };
    const totalText = document.getElementById('posPayTotal').textContent;
    const total = parseFloat(totalText) || 0;
    const splitTotal = posSplitPayments.reduce((s, p) => s + p.amount, 0);
    const remaining = total - splitTotal;
    el.innerHTML = posSplitPayments.map((p, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f0fdf4;border-radius:8px;margin-bottom:4px;font-size:0.85rem">
            <span style="font-weight:600">${payLabels[p.method] || p.method}</span>
            <input type="number" step="0.001" value="${p.amount.toFixed(3)}" onchange="posUpdateSplitAmount(${i},this)" style="width:90px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-weight:600;text-align:right">
            <span>TND</span>
            <button onclick="posRemoveSplitPayment(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:4px"><i data-lucide="x" style="width:14px"></i></button>
        </div>
    `).join('');
    if (remaining > 0) {
        el.innerHTML += `<div style="text-align:right;font-size:0.85rem;color:#64748b;padding:4px 4px 0">Reste: <strong>${remaining.toFixed(3)} TND</strong></div>`;
    }
    if (window.lucide) lucide.createIcons();
}

function posUpdateSplitAmount(index, input) {
    const val = parseFloat(input.value) || 0;
    if (posSplitPayments[index]) posSplitPayments[index].amount = val;
    posRenderSplitPayments();
}

function posRemoveSplitPayment(index) {
    posSplitPayments.splice(index, 1);
    posRenderSplitPayments();
}

function posSelectPayMethod(btn) {
    document.querySelectorAll('.pos-pay-method').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    posSelectedMethod = btn.dataset.method;
    document.getElementById('posCashSection').style.display = posSelectedMethod === 'cash' ? 'block' : 'none';
}

function posCalcChange() {
    const received = parseFloat(document.getElementById('posAmountReceived').value) || 0;
    const totalText = document.getElementById('posPayTotal').textContent;
    const total = parseFloat(totalText) || 0;
    const change = received - total;
    if (received >= total && total > 0) {
        document.getElementById('posChangeDisplay').style.display = 'block';
        document.getElementById('posChangeAmount').textContent = change.toFixed(3);
    } else {
        document.getElementById('posChangeDisplay').style.display = 'none';
    }
}

function posClosePayment() {
    document.getElementById('posPaymentModal').style.display = 'none';
}

async function posCompleteSale() {
    const totalText = document.getElementById('posPayTotal').textContent;
    const total = parseFloat(totalText) || 0;
    if (total <= 0) return;

    // Calculate totals (with discounts)
    const subtotal = posCart.reduce((s, c) => s + c.qty * c.price, 0);
    const totalDiscount = posCart.reduce((s, c) => {
        return s + (c.qty * c.price) * (c.discount || 0) / 100;
    }, 0);
    const discountedHT = subtotal - totalDiscount;
    const tvaByRate = {};
    posCart.forEach(c => {
        const lineHT = c.qty * c.price;
        const lineDiscount = lineHT * (c.discount || 0) / 100;
        const taxable = lineHT - lineDiscount;
        if (c.tva > 0) tvaByRate[c.tva] = (tvaByRate[c.tva] || 0) + taxable * c.tva / 100;
    });
    const totalTVA = Object.values(tvaByRate).reduce((s, v) => s + v, 0);
    const totalTTC = discountedHT + totalTVA;

    // Build items for document
    const items = posCart.map(c => {
        const product = posAllProducts.find(p => p.id === c.id);
        return {
            description: c.name, quantity: c.qty, price: c.price, tva: c.tva,
            discount: c.discount || 0,
            serviceId: c.id
        };
    });

    const clientName = document.getElementById('posPayClient').value.trim() || 'Client du magasin';
    const notes = document.getElementById('posPayNotes').value.trim();
    const cartNote = document.getElementById('posCartNoteInput')?.value?.trim() || '';

    // Build payment methods string for notes
    let paymentNote = '';
    if (posSplitPayments.length > 0) {
        const payLabels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile Money', check: 'Chèque' };
        paymentNote = 'Paiement multiple: ' + posSplitPayments.map(p => `${payLabels[p.method] || p.method} ${p.amount.toFixed(3)}`).join(' + ');
    }

    // Acompte handling
    let acompteNote = '';
    if (posAcompteAmount > 0) {
        acompteNote = `Acompte versé: ${posAcompteAmount.toFixed(3)} TND. Reste à payer: ${Math.max(0, totalTTC - posAcompteAmount).toFixed(3)} TND.`;
    }

    showLoading('Enregistrement de la vente...');
    try {
        const result = await window.electronAPI.savePOSSale({
            userId: currentUser.id,
            items,
            totalHT: subtotal,
            totalTTC,
            paymentMethod: posSplitPayments.length > 1 ? 'multiple' : posSelectedMethod,
            clientName,
            notes: [notes, paymentNote, acompteNote, cartNote].filter(Boolean).join('\n'),
            sessionId: posActiveSession ? posActiveSession.id : null,
            currency: 'TND'
        });

        if (result.success) {
            showToast('Vente enregistrée', 'success');
            document.getElementById('posPaymentModal').style.display = 'none';
            // Add loyalty points
            posAddLoyaltyPoints(clientName, totalTTC);
            const pts = posGetLoyalty(clientName);
            // Build payment label for receipt
            let payLabel = '';
            if (posSplitPayments.length > 1) {
                const payLabels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile Money', check: 'Chèque' };
                payLabel = posSplitPayments.map(p => `${payLabels[p.method] || p.method} ${p.amount.toFixed(3)}`).join(' + ');
            } else {
                const payLabels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile Money', check: 'Chèque' };
                payLabel = payLabels[posSelectedMethod] || posSelectedMethod;
            }
            posShowReceipt({ number: result.number, clientName, items, totalHT: discountedHT, totalDiscount, totalTVA, totalTTC, paymentMethod: payLabel, loyalty: pts, operator: posOperatorName, notes: acompteNote || cartNote || undefined });
            posSplitPayments = [];
            posCart = [];
            renderPOSCart();
            loadPOSProducts();
            // Refresh session totals first, then update the display
            if (posActiveSession) {
                try { posActiveSession = await window.electronAPI.getActivePOSSession(currentUser.id); } catch {}
            }
            loadTodayTotal();
        } else {
            showToast('Erreur: ' + (result.error || 'Échec'), 'error');
        }
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
    finally { hideLoading(); }
}

async function posShowReceipt(data) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const paymentLabels = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile Money', check: 'Chèque' };

    // Store for reprint
    posLastReceiptData = data;
    document.getElementById('posReprintBtn').style.display = '';
    document.getElementById('posReprintCartBtn').style.display = '';

    // Load store info from company
    let storeName = 'FACTARLOU', storeInfo = 'Point de Vente', storePhone = '';
    try {
        const company = await window.electronAPI.getCompany(currentUser.id);
        if (company) {
            storeName = company.name || storeName;
            const parts = [];
            if (company.address) parts.push(company.address);
            if (company.mf) parts.push('MF: ' + company.mf);
            if (company.rc) parts.push('RC: ' + company.rc);
            storeInfo = parts.join(' | ') || 'Point de Vente';
            storePhone = company.phone || '';
        }
    } catch {}

    let itemsHtml = '';
    data.items.forEach(item => {
        const qty = item.quantity || item.qty || 1;
        const price = item.price || 0;
        const discount = item.discount || 0;
        const lineHT = qty * price;
        const discountAmt = lineHT * discount / 100;
        const total = lineHT - discountAmt;
        itemsHtml += `<div style="display:flex;justify-content:space-between;padding:2px 0">
            <span>${escHtml(item.description)} x${qty}</span>
            <span>${total.toFixed(3)}</span>
        </div>`;
        if (discount > 0) {
            itemsHtml += `<div style="display:flex;justify-content:space-between;padding:0 0 2px 8px;font-size:0.7rem;color:#dc2626">
                <span>Remise ${discount}%</span>
                <span>−${discountAmt.toFixed(3)}</span>
            </div>`;
        }
    });

    document.getElementById('posReceiptContent').innerHTML = `
        <div style="text-align:center;margin-bottom:10px">
            <div style="font-weight:700;font-size:1rem">${escHtml(storeName)}</div>
            <div style="font-size:0.7rem;color:#666">${escHtml(storeInfo)}</div>
            ${storePhone ? `<div style="font-size:0.7rem;color:#666">${escHtml(storePhone)}</div>` : ''}
            <div style="font-size:0.7rem;color:#666;margin-top:4px">${dateStr} ${timeStr}</div>
            <div style="font-size:0.7rem;color:#666">N° ${data.number}</div>
        </div>
        <div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:6px 0;margin:6px 0">
            ${itemsHtml}
        </div>
        <div style="margin-bottom:4px">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>Total HT</span><span>${data.totalHT.toFixed(3)}</span></div>
            ${data.totalDiscount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:0.75rem;color:#dc2626"><span>Remise globale</span><span>−${data.totalDiscount.toFixed(3)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-size:0.75rem"><span>TVA</span><span>${data.totalTVA.toFixed(3)}</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:0.9rem;margin-top:4px;padding-top:4px;border-top:1px solid #ccc"><span>TOTAL TTC</span><span>${data.totalTTC.toFixed(3)} TND</span></div>
        </div>
        <div style="font-size:0.7rem;color:#666;margin-top:4px">Paiement: ${data.paymentMethod}</div>
        <div style="font-size:0.7rem;color:#666">Client: ${escHtml(data.clientName)}</div>
        ${data.operator ? `<div style="font-size:0.7rem;color:#666">Caissier: ${escHtml(data.operator)}</div>` : ''}
        ${data.loyalty !== undefined && data.loyalty !== null ? `<div style="font-size:0.7rem;color:#666">Points fidélité: ${data.loyalty} pts</div>` : ''}
        ${data.notes ? `<div style="font-size:0.7rem;color:#666;margin-top:2px">Note: ${escHtml(data.notes)}</div>` : ''}
        <div style="font-size:0.7rem;color:#999;text-align:center;margin-top:10px;border-top:1px dashed #ccc;padding-top:6px">
            Merci de votre visite !
            ${posReceiptFooter ? `<br><span style="font-size:0.65rem">${escHtml(posReceiptFooter)}</span>` : ''}
        </div>
    `;
    document.getElementById('posReceiptModal').style.display = 'flex';
    if (window.lucide) lucide.createIcons();
}

// ── Quick Grid (Top Ventes) ──────────────────────────────────
async function posLoadQuickGrid() {
    const container = document.getElementById('posQuickGrid');
    const itemsEl = document.getElementById('posQuickGridItems');
    if (!container || !itemsEl) return;
    try {
        const sales = await window.electronAPI.getTodayPOSSales(currentUser.id);
        if (!sales || sales.length === 0) { container.style.display = 'none'; return; }
        const freq = {};
        sales.forEach(s => {
            try {
                const items = typeof s.items_json === 'string' ? JSON.parse(s.items_json) : (s.items || []);
                items.forEach(item => {
                    const name = item.description || item.name || '';
                    if (name) freq[name] = (freq[name] || 0) + (item.quantity || 1);
                });
            } catch {}
        });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (top.length === 0) { container.style.display = 'none'; return; }
        itemsEl.innerHTML = top.map(([name]) => {
            const product = posAllProducts.find(p => p.name === name);
            if (!product) return '';
            return `<span class="pos-quick-item" onclick="posAddToCart('${product.id}')">${escHtml(name)}</span>`;
        }).filter(Boolean).join('');
        container.style.display = top.some(Boolean) ? 'flex' : 'none';
    } catch { container.style.display = 'none'; }
}

// ── Client Search ────────────────────────────────────────────
function posSearchClient(val) {
    const results = document.getElementById('posClientResults');
    if (!val || val.length < 1) { results.style.display = 'none'; return; }
    if (typeof allClients === 'undefined' || !allClients) { results.style.display = 'none'; return; }
    const q = val.toLowerCase();
    const matches = allClients.filter(c => c.name && c.name.toLowerCase().includes(q)).slice(0, 8);
    if (matches.length === 0) { results.style.display = 'none'; return; }
    results.innerHTML = matches.map(c =>
        `<div class="pos-client-result" onclick="posSelectClient('${escHtml(c.name)}')">
            <span class="clr-name">${escHtml(c.name)}</span>
            <span class="clr-info">${c.phone ? escHtml(c.phone) : ''}${c.mf ? ' | MF: ' + escHtml(c.mf) : ''}</span>
        </div>`
    ).join('');
    results.style.display = 'block';
}

function posSelectClient(name) {
    document.getElementById('posPayClient').value = name;
    document.getElementById('posClientResults').style.display = 'none';
    posRefreshFidelityFromClient(name);
}

function posRefreshFidelityFromClient(name) {
    const display = document.getElementById('posFidelityDisplay');
    if (!name || name === 'Client du magasin') { display.style.display = 'none'; return; }
    const pts = posGetLoyalty(name);
    if (pts > 0) {
        display.style.display = 'block';
        display.textContent = `⭐ ${pts} points fidélité`;
    } else {
        display.style.display = 'none';
    }
}

// ── Fidélité Modal ────────────────────────────────────────────
function posRefreshFidelity() {
    const name = document.getElementById('posFidClient').value.trim();
    const content = document.getElementById('posFidelityContent');
    if (!name) {
        content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Entrez un nom de client pour voir ses points</div>';
        return;
    }
    const pts = posGetLoyalty(name);
    content.innerHTML = `
        <div class="pos-fid-card">
            <div style="font-size:0.9rem;font-weight:600;color:#92400e;margin-bottom:8px">${escHtml(name)}</div>
            <div class="pos-fid-points">${pts}</div>
            <div class="pos-fid-label">Points de fidélité</div>
            <div style="margin-top:8px;font-size:0.8rem;color:#92400e">1 point = 10 TND d\'achat</div>
        </div>
        <div class="pos-fid-history">
            <strong>Historique d\'acquisition :</strong><br>
            <span style="font-size:0.7rem">Les points sont cumulés automatiquement à chaque vente.</span>
        </div>
    `;
}

// ── Acompte ──────────────────────────────────────────────────
function posApplyAcompte() {
    const totalText = document.getElementById('posPayTotal').textContent;
    const total = parseFloat(totalText) || 0;
    const amount = parseFloat(document.getElementById('posAcompteAmount').value) || 0;
    if (amount <= 0) { showToast('Montant invalide', 'warning'); return; }
    if (amount > total) { showToast('L\'acompte ne peut pas dépasser le total', 'warning'); return; }
    posAcompteAmount = amount;
    const restant = total - amount;
    document.getElementById('posAcompteInfo').innerHTML = `
        <span class="pos-acompte-badge">Acompte: ${amount.toFixed(3)} TND</span>
        <span style="margin-left:8px">Reste: ${restant.toFixed(3)} TND</span>
    `;
    document.getElementById('posPayTotal').textContent = total.toFixed(3) + ' TND';
    document.getElementById('posAcompteSection').style.display = 'block';
    showToast(`Acompte de ${amount.toFixed(3)} TND appliqué`, 'success');
}

// ── Drafts ───────────────────────────────────────────────────
function posOpenDrafts() {
    const container = document.getElementById('posDraftsContent');
    const list = JSON.parse(localStorage.getItem('tuni_pos_drafts') || '[]');
    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Aucun brouillon sauvegardé</div>';
    } else {
        container.innerHTML = list.map((d, i) => {
            const total = (d.cart || []).reduce((s, c) => s + c.qty * c.price, 0);
            const items = (d.cart || []).length;
            return `<div class="pos-draft-item">
                <div class="pos-draft-info">
                    <div class="pos-draft-name">${escHtml(d.name || 'Sans nom')}</div>
                    <div class="pos-draft-meta">${items} article(s) · ${total.toFixed(3)} TND · ${d.date || ''}</div>
                </div>
                <div class="pos-draft-actions">
                    <button class="pos-draft-btn pos-draft-restore" onclick="posRestoreDraft(${i})">Restaurer</button>
                    <button class="pos-draft-btn pos-draft-delete" onclick="posDeleteDraft(${i})">Suppr.</button>
                </div>
            </div>`;
        }).join('');
    }
    document.getElementById('posDraftsModal').style.display = 'flex';
}

function posCloseDrafts() {
    document.getElementById('posDraftsModal').style.display = 'none';
}

function posSaveDraft() {
    if (posCart.length === 0) { showToast('Panier vide', 'warning'); return; }
    const name = prompt('Nom du brouillon:', 'Brouillon ' + (posDrafts.length + 1));
    if (!name) return;
    const draft = {
        name: name.trim(),
        cart: JSON.parse(JSON.stringify(posCart)),
        date: new Date().toLocaleDateString('fr-FR')
    };
    posDrafts.push(draft);
    localStorage.setItem('tuni_pos_drafts', JSON.stringify(posDrafts));
    showToast('Brouillon sauvegardé', 'success');
}

function posRestoreDraft(index) {
    const list = JSON.parse(localStorage.getItem('tuni_pos_drafts') || '[]');
    if (!list[index]) return;
    if (posCart.length > 0) {
        showConfirm('Restaurer', 'Le panier actuel sera remplacé. Continuer ?', () => { doRestore(index, list); });
    } else {
        doRestore(index, list);
    }
}

function doRestore(index, list) {
    posCart = JSON.parse(JSON.stringify(list[index].cart));
    renderPOSCart();
    // Remove restored draft
    list.splice(index, 1);
    localStorage.setItem('tuni_pos_drafts', JSON.stringify(list));
    posDrafts = list;
    document.getElementById('posDraftsModal').style.display = 'none';
    showToast('Brouillon restauré', 'success');
}

function posDeleteDraft(index) {
    const list = JSON.parse(localStorage.getItem('tuni_pos_drafts') || '[]');
    if (!list[index]) return;
    list.splice(index, 1);
    localStorage.setItem('tuni_pos_drafts', JSON.stringify(list));
    posDrafts = list;
    posOpenDrafts(); // refresh
    showToast('Brouillon supprimé', 'info');
}

// ── Receipt Footer ──────────────────────────────────────────
function posSetFooter() {
    const current = localStorage.getItem('tuni_pos_footer') || '';
    const val = prompt('Texte du pied de ticket (laissez vide pour supprimer) :', current);
    if (val === null) return;
    posReceiptFooter = val.trim();
    localStorage.setItem('tuni_pos_footer', posReceiptFooter);
    showToast(posReceiptFooter ? 'Pied de ticket mis à jour' : 'Pied de ticket supprimé', 'info');
}

// ── Open Fidelity Modal from topbar ──────────────────────────
function posOpenFidelity() {
    document.getElementById('posFidClient').value = '';
    document.getElementById('posFidelityContent').innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Entrez un nom de client pour voir ses points</div>';
    document.getElementById('posFidelityModal').style.display = 'flex';
}

// ── Also add a hold with draft save ──────────────────────────
// Enhances the existing posHoldCart to also save as draft and in-memory hold
posHoldCart = function posHoldCartOverride() {
    if (posCart.length === 0) { showToast('Panier vide', 'warning'); return; }
    posSaveDraft();
    posHeldCart = JSON.parse(JSON.stringify(posCart));
    posCart = [];
    renderPOSCart();
    document.getElementById('posHoldBtn').style.display = 'none';
    const ind = document.getElementById('posHeldIndicator');
    ind.style.display = 'inline-flex';
    ind.innerHTML = `<i data-lucide="rotate-ccw" style="width:12px;height:12px"></i> 1 en attente`;
    if (window.lucide) lucide.createIcons();
    showToast('Panier mis en attente', 'info');
};

function posCloseReceipt() {
    document.getElementById('posReceiptModal').style.display = 'none';
    document.getElementById('posBarcodeInput').focus();
}

function posPrintReceipt() {
    const content = document.getElementById('posReceiptContent').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
        body{font-family:'Courier New',monospace;font-size:12px;width:80mm;margin:0 auto;padding:10px;color:#000}
        @media print{@page{size:80mm auto;margin:0}body{margin:0;padding:10px}}
    </style></head><body>${content}
    <script>window.print();setTimeout(()=>window.close(),500);<\/script></body></html>`);
    win.document.close();
}

// ── Unified barcode/search handler ───────────────────────────
let posScanTimer = null;
function posBarcodeSearch(val) {
    clearTimeout(posScanTimer);
    if (val.length === 0) {
        posSearchFilter = '';
        const activeCat = document.querySelector('.pos-cat-btn.active');
        renderPOSProducts(activeCat ? activeCat.dataset.cat : 'all');
        return;
    }
    if (val.length < 2) { posSearchFilter = val; return; }
    posScanTimer = setTimeout(async () => {
        if (!currentUser) return;
        const trimmed = val.trim();
        // Try barcode first
        let product = posAllProducts.find(p => p.barcode && p.barcode === trimmed);
        if (product) {
            posAddToCart(product.id);
            document.getElementById('posBarcodeInput').value = '';
            posSearchFilter = '';
            renderPOSProducts(document.querySelector('.pos-cat-btn.active')?.dataset?.cat || 'all');
            return;
        }
        // Search by name
        const matches = posAllProducts.filter(p =>
            p.name.toLowerCase().includes(trimmed.toLowerCase())
        );
        if (matches.length === 1) {
            posAddToCart(matches[0].id);
            document.getElementById('posBarcodeInput').value = '';
            posSearchFilter = '';
        } else if (matches.length > 1) {
            posSearchFilter = trimmed;
            document.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.remove('active'));
            renderPOSProducts('all');
        } else {
            posSearchFilter = trimmed;
            renderPOSProducts(document.querySelector('.pos-cat-btn.active')?.dataset?.cat || 'all');
        }
    }, 300);
}

// Init F2 focus shortcut
document.addEventListener('DOMContentLoaded', () => {
    // Nothing else needed here — posBarcodeSearch is called via oninput
});

function escHtml(t) {
    if (!t) return '';
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
