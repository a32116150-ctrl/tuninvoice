// M-09: Global error boundary — prevents renderer from silently failing
window.addEventListener('error', (event) => {
    console.error('[UI ERROR]', event.message, event.filename, event.lineno);
    try {
        if (typeof showToast === 'function') {
            showToast('Erreur inattendue: ' + (event.message || 'Erreur inconnue'), 'error');
        }
    } catch {}
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('[UI PROMISE ERROR]', event.reason);
    try {
        const msg = event.reason?.message || event.reason || 'Erreur asynchrone';
        if (typeof showToast === 'function') {
            showToast('Erreur: ' + msg, 'error');
        }
    } catch {}
});

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
let allFournisseurs = [];
let allServices = [];
let allContracts = [];
let allExpenses = [];
let editingServiceId = null;
let editingDocId = null;
let docPage = 1;
const DOC_PAGE_SIZE = 50;
let editingContractId = null;
let confirmCallback = null;
let currentSettings = {};
let currentDecimalPlaces = 3;
let currentRoundingMethod = 'half_up';

/**
 * Round a number according to currentRoundingMethod, then format to currentDecimalPlaces.
 */
function roundValue(value) {
    const dp = currentDecimalPlaces;
    const factor = Math.pow(10, dp);
    if (currentRoundingMethod === 'ceil') return Math.ceil(value * factor) / factor;
    if (currentRoundingMethod === 'floor') return Math.floor(value * factor) / factor;
    // half_up (default) — standard Math.round behaviour
    return Math.round(value * factor) / factor;
}

function formatAmount(value) {
    return roundValue(parseFloat(value) || 0).toFixed(currentDecimalPlaces);
}
// ==================== NATURAL LANGUAGE DATE ====================
function parseNaturalDate(str) {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const matches = {
        "aujourd'hui": today,
        auj: today,
        today: today,
        demain: new Date(today.getTime() + 86400000),
        tomorrow: new Date(today.getTime() + 86400000),
        'next day': new Date(today.getTime() + 86400000),
        hier: new Date(today.getTime() - 86400000),
        yesterday: new Date(today.getTime() - 86400000)
    };
    if (matches[s]) return matches[s];

    const weekdayMap = {
        lundi: 1,
        mardi: 2,
        mercredi: 3,
        jeudi: 4,
        vendredi: 5,
        samedi: 6,
        dimanche: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0
    };

    // "next monday", "next lundi", "next week", "next month"
    const nextMatch = s.match(/^(next|prochain)\s+(.+)/);
    if (nextMatch) {
        const unit = nextMatch[2];
        if (weekdayMap[unit] !== undefined) {
            const targetDay = weekdayMap[unit];
            const currentDay = today.getDay();
            let diff = targetDay - currentDay;
            if (diff <= 0) diff += 7;
            return new Date(today.getTime() + diff * 86400000);
        }
        if (unit === 'week' || unit === 'semaine') return new Date(today.getTime() + 7 * 86400000);
        if (unit === 'month' || unit === 'mois') {
            const d = new Date(today);
            d.setMonth(d.getMonth() + 1);
            return d;
        }
        if (unit === 'year' || unit === 'an' || unit === 'année') {
            const d = new Date(today);
            d.setFullYear(d.getFullYear() + 1);
            return d;
        }
    }

    // "+30d", "+2w", "+3m", "+1y", "-7d"
    const offsetMatch = s.match(/^([+-]?\d+)\s*(d|j|w|s|m|y|mois|day|week|month|year|semaine|mois)$/);
    if (offsetMatch) {
        const num = parseInt(offsetMatch[1]);
        const unit = offsetMatch[2][0];
        const d = new Date(today);
        if (unit === 'd' || unit === 'j') d.setDate(d.getDate() + num);
        else if (unit === 'w' || unit === 's') d.setDate(d.getDate() + num * 7);
        else if (unit === 'm' || unit === 'y') {
            if (unit === 'm') d.setMonth(d.getMonth() + num);
            else d.setFullYear(d.getFullYear() + num);
        }
        return d;
    }

    // "end of month", "fin de mois", "last day of month"
    if (/end|fin/.test(s) && /month|mois/.test(s)) {
        const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return d;
    }

    return null;
}

// Hook natural language dates onto date inputs
function initNaturalDateInputs() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.addEventListener('input', function () {
            if (this.value && this.value.length > 4 && this.value.includes('-') === false) {
                const parsed = parseNaturalDate(this.value);
                if (parsed) {
                    const iso = parsed.toISOString().split('T')[0];
                    if (iso !== this.value) {
                        this.value = iso;
                    }
                }
            }
        });
        // Also handle blur for expressions typed
        input.addEventListener('blur', function () {
            if (this.value && !/^\d{4}-\d{2}-\d{2}$/.test(this.value)) {
                const parsed = parseNaturalDate(this.value);
                if (parsed) this.value = parsed.toISOString().split('T')[0];
            }
        });
    });
}
// ==================== BREADCRUMB ====================
function updateBreadcrumb(label) {
    const el = document.getElementById('breadcrumbDocType');
    if (el) el.textContent = label || 'Nouveau';
}
// ==================== DRAG & DROP ITEMS ====================
let dragSource = null;

function initItemDrag(row) {
    row.setAttribute('draggable', 'true');
    row.addEventListener('dragstart', e => {
        dragSource = row;
        row.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
        row.style.opacity = '1';
        dragSource = null;
        document.querySelectorAll('#itemsBody tr').forEach(r => r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('#itemsBody tr').forEach(r => r.classList.remove('drag-over'));
        row.classList.add('drag-over');
    });
    row.addEventListener('drop', e => {
        e.preventDefault();
        if (dragSource && dragSource !== row) {
            const tbody = document.getElementById('itemsBody');
            const rows = [...tbody.children];
            const fromIdx = rows.indexOf(dragSource);
            const toIdx = rows.indexOf(row);
            if (fromIdx < toIdx) tbody.insertBefore(dragSource, row.nextSibling);
            else tbody.insertBefore(dragSource, row);
            renumberItems();
            calculateTotals();
        }
        document.querySelectorAll('#itemsBody tr').forEach(r => r.classList.remove('drag-over'));
    });
}
// ==================== AUTO-COMPLETE MF ====================
function initMFAutoComplete() {
    const mfInput = document.getElementById('docClientMF');
    if (!mfInput) return;
    let dropdown = null;

    mfInput.addEventListener('input', function () {
        const q = this.value.trim().toLowerCase();
        if (q.length < 2) {
            if (dropdown) {
                dropdown.remove();
                dropdown = null;
            }
            return;
        }

        const matches = allClients
            .filter(c => (c.mf && c.mf.toLowerCase().includes(q)) || (c.name && c.name.toLowerCase().includes(q)))
            .slice(0, 8);

        if (dropdown) {
            dropdown.remove();
            dropdown = null;
        }
        if (!matches.length) return;

        dropdown = document.createElement('div');
        dropdown.style.cssText =
            'position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:100;max-height:200px;overflow-y:auto;margin-top:2px';

        matches.forEach(c => {
            const item = document.createElement('div');
            item.style.cssText =
                'padding:8px 12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;border-bottom:1px solid var(--border)';
            item.innerHTML = `<span><strong>${escapeHtml(c.name)}</strong> ${c.mf ? `<span style="color:var(--text-light)">· ${escapeHtml(c.mf)}</span>` : ''}</span>`;
            item.onmouseenter = () => (item.style.background = 'var(--gray-50)');
            item.onmouseleave = () => (item.style.background = '');
            item.onclick = () => {
                document.getElementById('docClientName').value = c.name;
                document.getElementById('docClientMF').value = c.mf || '';
                document.getElementById('docClientAddress').value = c.address || '';
                document.getElementById('docClientPhone').value = c.phone || '';
                document.getElementById('docClientEmail').value = c.email || '';
                if (dropdown) {
                    dropdown.remove();
                    dropdown = null;
                }
            };
            dropdown.appendChild(item);
        });

        const wrap = mfInput.closest('.form-group') || mfInput.parentElement;
        if (wrap.style.position !== 'relative') wrap.style.position = 'relative';
        wrap.appendChild(dropdown);
    });

    mfInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (dropdown) {
                dropdown.remove();
                dropdown = null;
            }
        }, 200);
    });
}
// ==================== TOAST ====================
function showToast(message, type = 'info', duration = 3500) {
    const icons = {
        success: '<i data-lucide="check-circle" class="lucide-sm"></i>',
        error: '<i data-lucide="x-circle" class="lucide-sm"></i>',
        info: '<i data-lucide="info" class="lucide-sm"></i>',
        warning: '<i data-lucide="alert-triangle" class="lucide-sm"></i>'
    };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span></span>`;
    toast.lastElementChild.textContent = message;
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
    document.getElementById('confirmMessage').innerHTML = message;
    if (window.lucide) lucide.createIcons();
    const btn = document.getElementById('confirmBtn');
    btn.textContent = btnLabel;
    btn.className = `btn ${btnClass}`;
    confirmCallback = onConfirm;
    const cancelBtn = document.querySelector('#confirmModal .btn-secondary');
    if (cancelBtn) cancelBtn.style.display = onConfirm ? 'inline-flex' : 'none';
    document.getElementById('confirmModal').classList.add('active');
}
function executeConfirm() {
    if (typeof confirmCallback === 'function') {
        const a = confirmCallback;
        confirmCallback = null;
        closeConfirm();
        a();
    }
}
function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}
// ==================== BACKUP REPORT ====================
async function generateBackupReport() {
    showLoading('Génération du rapport...');
    try {
        const data = await window.electronAPI.generateBackupReport(currentUser.id);
        if (!data) {
            showToast('Erreur génération rapport', 'error');
            hideLoading();
            return;
        }
        hideLoading();

        const formatCurrency = v => (v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
        const docTypeLabel = {
            facture: 'Factures',
            devis: 'Devis',
            bon: 'Bons de Commande',
            avoir: 'Avoirs',
            bl: 'Bons de Livraison',
            ba: "Bons d'Achat",
            bs: 'Bons de Sortie',
            be: "Bons d'Entrée"
        };

        let byTypeHtml = '';
        (data.documents.byType || []).forEach(d => {
            byTypeHtml += `<tr><td>${docTypeLabel[d.type] || d.type}</td><td style="text-align:right">${d.count}</td><td style="text-align:right">${formatCurrency(d.total)}</td></tr>`;
        });

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport de Sauvegarde</title>
<style>
    body { font-family: 'Inter', 'Segoe UI', sans-serif; max-width:800px; margin:40px auto; padding:20px; color:#1e293b; }
    h1 { font-size:24px; margin-bottom:4px; }
    .subtitle { color:#64748b; font-size:14px; margin-bottom:30px; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    th, td { padding:10px 12px; text-align:left; border-bottom:1px solid #e2e8f0; font-size:14px; }
    th { background:#f8fafc; font-weight:600; color:#475569; text-transform:uppercase; font-size:12px; letter-spacing:0.5px; }
    .section { margin-bottom:32px; }
    .section h2 { font-size:18px; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #3b82f6; }
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:12px; margin-bottom:24px; }
    .stat-card { background:#f8fafc; border-radius:8px; padding:14px; text-align:center; }
    .stat-card .num { font-size:22px; font-weight:700; color:#0f172a; }
    .stat-card .lbl { font-size:12px; color:#64748b; margin-top:4px; }
    .footer { text-align:center; font-size:12px; color:#94a3b8; margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; }
    @media print { body { margin:20px; } .no-print { display:none; } }
</style></head><body>
<h1>📊 Rapport de Sauvegarde</h1>
<div class="subtitle">Généré le ${new Date(data.generatedAt).toLocaleString('fr-FR')} par ${data.user?.username || '—'}</div>
<div class="stat-grid">
    <div class="stat-card"><div class="num">${data.documents.total}</div><div class="lbl">Documents</div></div>
    <div class="stat-card"><div class="num">${data.clients}</div><div class="lbl">Clients</div></div>
    <div class="stat-card"><div class="num">${data.services}</div><div class="lbl">Services</div></div>
    <div class="stat-card"><div class="num">${data.expenses.count}</div><div class="lbl">Dépenses</div></div>
    <div class="stat-card"><div class="num">${data.contracts}</div><div class="lbl">Contrats</div></div>
    <div class="stat-card"><div class="num">${data.companies}</div><div class="lbl">Sociétés</div></div>
</div>
<div class="section"><h2>Documents par type</h2>
<table><thead><tr><th>Type</th><th>Quantité</th><th>Total Net</th></tr></thead><tbody>
${byTypeHtml || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">Aucun document</td></tr>'}
</tbody></table></div>
<div class="section"><h2>Résumé financier</h2>
<table><thead><tr><th>Catégorie</th><th>Quantité</th><th>Total</th></tr></thead><tbody>
<tr><td>Dépenses</td><td>${data.expenses.count}</td><td>${formatCurrency(data.expenses.total)}</td></tr>
<tr><td>Retenues à la source</td><td>${data.retenues.count}</td><td>${formatCurrency(data.retenues.total)}</td></tr>
</tbody></table></div>
<div class="footer">TuniInvoice Pro — Rapport de sauvegarde — ${new Date().toLocaleDateString('fr-FR')}</div>
<script>window.print();</script>
</body></html>`);
        win.document.close();
    } catch (e) {
        hideLoading();
        showToast('Erreur', 'error');
    }
}
// ==================== I18N ====================
window.addEventListener('locale-changed', () => {
    document.title = i18n.t('app.name', 'TuniInvoice Pro');
});
// ==================== OFFLINE MAP ====================
let _clientMap = null;
let _clientMarker = null;

function initClientMap(lat = 36.8065, lng = 10.1815) {
    const container = document.getElementById('clientMapContainer');
    if (!container) return;
    container.style.display = 'block';

    if (_clientMap) {
        _clientMap.invalidateSize();
        _clientMap.setView([lat, lng], 13);
        if (_clientMarker) _clientMarker.setLatLng([lat, lng]);
        else _clientMarker = L.marker([lat, lng]).addTo(_clientMap);
        return;
    }

    _clientMap = L.map(container, { zoomControl: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(_clientMap);
    _clientMarker = L.marker([lat, lng]).addTo(_clientMap);

    _clientMap.on('click', function (e) {
        if (_clientMarker) _clientMarker.setLatLng(e.latlng);
        else _clientMarker = L.marker(e.latlng).addTo(_clientMap);
    });
}

function hideClientMap() {
    if (_clientMap) {
        _clientMap.remove();
        _clientMap = null;
        _clientMarker = null;
    }
    const container = document.getElementById('clientMapContainer');
    if (container) container.style.display = 'none';
}

function geocodeAddress(address) {
    if (!address || !address.trim()) return;
    const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address + ', Tunisie') + '&limit=1';
    fetch(url, { headers: { 'User-Agent': 'TuniInvoice/2.0' } })
        .then(r => r.json())
        .then(data => {
            if (data && data.length) {
                initClientMap(parseFloat(data[0].lat), parseFloat(data[0].lon));
            } else {
                initClientMap();
            }
        })
        .catch(() => initClientMap());
}
// ==================== CSV IMPORT ====================
let _csvParsedData = [];

function openCSVImportModal() {
    _csvParsedData = [];
    document.getElementById('csvFileInput').value = '';
    document.getElementById('csvPreviewTable').innerHTML = '';
    document.getElementById('csvImportResult').innerHTML = '';
    document.getElementById('csvImportBtn').disabled = true;
    csvImportTypeChanged();
    document.getElementById('csvImportModal').classList.add('active');
}

function csvImportTypeChanged() {
    const type = document.getElementById('csvImportType').value;
    const info = document.getElementById('csvTemplateInfo');
    if (type === 'clients') {
        info.innerHTML = '<strong>Format attendu (Clients) :</strong><br><code>nom, mf, adresse, telephone, email</code>';
    } else {
        info.innerHTML = '<strong>Format attendu (Services) :</strong><br><code>nom, prix, description</code>';
    }
}

function previewCSV(input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
            document.getElementById('csvPreviewTable').innerHTML =
                '<div style="padding:16px;text-align:center;color:var(--text-light)">Fichier vide ou invalide</div>';
            document.getElementById('csvImportBtn').disabled = true;
            return;
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        _csvParsedData = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((h, i) => (obj[h] = vals[i] || ''));
            return obj;
        });
        let html = '<table class="data-table"><thead><tr>';
        headers.forEach(h => {
            html += `<th>${escapeHtml(h)}</th>`;
        });
        html += '</tr></thead><tbody>';
        _csvParsedData.slice(0, 10).forEach(row => {
            html += '<tr>';
            headers.forEach(h => {
                html += `<td>${escapeHtml(row[h] || '')}</td>`;
            });
            html += '</tr>';
        });
        if (_csvParsedData.length > 10) {
            html += `<tr><td colspan="${headers.length}" style="text-align:center;color:var(--text-light);font-style:italic">... et ${_csvParsedData.length - 10} ligne(s) supplémentaire(s)</td></tr>`;
        }
        html += '</tbody></table>';
        document.getElementById('csvPreviewTable').innerHTML = html;
        document.getElementById('csvImportBtn').disabled = false;
        document.getElementById('csvImportResult').innerHTML =
            `<span style="color:var(--success)">✓ ${_csvParsedData.length} entrée(s) détectée(s)</span>`;
    };
    reader.readAsText(file);
}

async function confirmCSVImport() {
    if (!_csvParsedData.length) return;
    const btn = document.getElementById('csvImportBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Importation...';
    const type = document.getElementById('csvImportType').value;
    let success = 0,
        errors = 0;
    for (const row of _csvParsedData) {
        try {
            if (type === 'clients') {
                await window.electronAPI.saveClient({
                    userId: currentUser.id,
                    name: row.nom || row.name || '',
                    mf: row.mf || '',
                    address: row.adresse || row.address || '',
                    phone: row.telephone || row.phone || '',
                    email: row.email || ''
                });
            } else {
                await window.electronAPI.saveService({
                    userId: currentUser.id,
                    name: row.nom || row.name || '',
                    price: parseFloat(row.prix || row.price || 0),
                    description: row.description || ''
                });
            }
            success++;
        } catch {
            errors++;
        }
    }
    document.getElementById('csvImportResult').innerHTML = `
        <div style="padding:12px;border-radius:8px;font-weight:600;text-align:center;background:${errors ? '#fef2f2' : '#f0fdf4'};color:${errors ? '#b91c1c' : '#166534'}">
            ${success} importé(s) avec succès${errors ? `, ${errors} erreur(s)` : ''}
        </div>`;
    btn.innerHTML = '<i data-lucide="check"></i> Terminé';
    // Reload data
    if (type === 'clients') await loadClients();
    else await loadServices();
    setTimeout(() => closeModal('csvImportModal'), 2000);
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
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
        return dateStr;
    }
}

function getDocTypeLabel(type) {
    return currentTheme.titles[type]?.text || type.toUpperCase();
}
function getDocTypeColor(type) {
    return currentTheme.titles[type]?.color || '#1e3a8a';
}

// === Migrated Inline Scripts from index.html ===
document.addEventListener('DOMContentLoaded', () => {
    // Topbar date
    const opts = { weekday:'short', year:'numeric', month:'short', day:'numeric' };
    const str = new Date().toLocaleDateString('fr-FR', opts);
    ['topbarDateText','dashDate'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=str; });

    // Topbar user sync
    const origShowApp = window.showApp;
    if (origShowApp) window.showApp = function() {
        origShowApp.apply(this, arguments);
        setTimeout(() => {
            const u = document.getElementById('userName')?.textContent;
            const av = document.getElementById('userAvatar')?.textContent;
            if (document.getElementById('topbarName')) document.getElementById('topbarName').textContent = u || '';
            if (document.getElementById('topbarAvatar')) document.getElementById('topbarAvatar').textContent = av || 'U';
        }, 100);
    };

    // Theme color hex labels
    ['themeColorPrimary','themeColorSecondary','themeColorBg','themeColorSurface','themeColorBorder'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const spanId = id + 'Hex';
        el.addEventListener('input', () => {
            const span = document.querySelector(`[id="${spanId}"]`) || el.nextElementSibling;
            if (span) span.textContent = el.value;
        });
    });
});

window.addEventListener('load', () => {
    const origNav = window.navigateTo;
    if (origNav) window.navigateTo = function(page) {
        origNav.apply(this, arguments);
        const u = document.getElementById('userName')?.textContent;
        const av = document.getElementById('userAvatar')?.textContent;
        if (document.getElementById('topbarName') && u) document.getElementById('topbarName').textContent = u;
        if (document.getElementById('topbarAvatar') && av) document.getElementById('topbarAvatar').textContent = av;
    };
});

window.updateFormatPreview = function() {
    const dp = parseInt(document.getElementById('settingDecimalPlaces')?.value) || 3;
    const rm = document.getElementById('settingRoundingMethod')?.value || 'half_up';
    const testVal = 1234.5678;
    const factor = Math.pow(10, dp);
    let rounded;
    if (rm === 'ceil')  rounded = Math.ceil(testVal  * factor) / factor;
    else if (rm === 'floor') rounded = Math.floor(testVal * factor) / factor;
    else rounded = Math.round(testVal * factor) / factor;
    const el = document.getElementById('formatPreviewValue');
    if (el) el.textContent = rounded.toFixed(dp) + ' TND';
};

// === Event Delegation for Strict CSP (M-10) ===
function parseArguments(argsStr, target) {
    if (!argsStr || !argsStr.trim()) return [];
    
    // Naive comma split, ignoring commas inside quotes
    const args = [];
    let current = '';
    let inQuote = null;
    
    for (let i = 0; i < argsStr.length; i++) {
        const char = argsStr[i];
        if (char === "'" || char === '"') {
            if (!inQuote) inQuote = char;
            else if (inQuote === char) inQuote = null;
            else current += char; // nested quote
        } else if (char === ',' && !inQuote) {
            args.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current) args.push(current.trim());
    
    return args.map(s => {
        if (s === 'this') return target;
        if (s === 'this.checked') return target.checked;
        if (s === 'this.value') return target.value;
        if (s === 'this.parentElement') return target.parentElement;
        if (s === 'event' || s === 'e') return window.event;
        return isNaN(Number(s)) ? s : Number(s);
    });
}

function handleDelegation(event, attrName) {
    let target = event.target;
    while (target && target !== document) {
        if (target.hasAttribute(attrName)) {
            const script = target.getAttribute(attrName);
            // Example script: "viewDocument('doc-123', this)"
            const match = script.match(/^([a-zA-Z0-9_]+)\((.*)\);?$/);
            if (match) {
                const funcName = match[1];
                const argsStr = match[2];
                const args = parseArguments(argsStr, target);
                
                if (typeof window[funcName] === 'function') {
                    window[funcName].apply(target, args);
                } else {
                    console.error(`CSP Delegation Error: function ${funcName} is not defined on window.`);
                }
            } else {
                // simple function call without parens, or multiple statements (which we don't support easily)
                if (typeof window[script] === 'function') {
                    window[script]();
                } else {
                     console.error(`CSP Delegation Error: could not parse inline script: ${script}`);
                }
            }
            if (attrName === 'data-onclick' && target.tagName !== 'INPUT' && target.tagName !== 'LABEL') {
                 event.preventDefault();
            }
            break;
        }
        target = target.parentElement;
    }
}

document.addEventListener('click', e => handleDelegation(e, 'data-onclick'));
document.addEventListener('change', e => handleDelegation(e, 'data-onchange'));
document.addEventListener('submit', e => handleDelegation(e, 'data-onsubmit'));
