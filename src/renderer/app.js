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
let currentTemplate = 'modern'; // 'modern', 'retro98', 'cinematic'
let editingDocId = null; // Track if we're editing an existing document

// ==================== TEMPLATE CONFIGURATIONS ====================
const templates = {
    modern: {
        name: 'Modern Minimal',
        colors: {
            facture: '#1e3a8a',
            devis: '#92400e',
            bon: '#065f46'
        },
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        headerStyle: 'gradient',
        tableStyle: 'clean',
        showBorders: true,
        borderRadius: '8px',
        shadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    retro98: {
        name: 'Retro 98',
        colors: {
            facture: '#000080',
            devis: '#800080',
            bon: '#008000'
        },
        fontFamily: "'Courier New', 'Courier', monospace",
        headerStyle: 'pixel',
        tableStyle: 'retro',
        showBorders: true,
        borderRadius: '0px',
        shadow: '4px 4px 0px #000000',
        pixelArt: true
    },
    cinematic: {
        name: 'Cinematic Studio',
        colors: {
            facture: '#0f172a',
            devis: '#1e1b4b',
            bon: '#064e3b'
        },
        fontFamily: "'Playfair Display', 'Georgia', serif",
        headerStyle: 'dramatic',
        tableStyle: 'elegant',
        showBorders: false,
        borderRadius: '0px',
        shadow: '0 20px 40px rgba(0,0,0,0.3)',
        cinematicEffects: true
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    const savedUser = sessionStorage.getItem('currentUser');
    const savedTemplate = localStorage.getItem('preferredTemplate');
    if (savedTemplate && templates[savedTemplate]) {
        currentTemplate = savedTemplate;
    }
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showApp();
        } catch {
            sessionStorage.removeItem('currentUser');
        }
    }
});

// ==================== TEMPLATE FUNCTIONS ====================
function setTemplate(templateName) {
    if (templates[templateName]) {
        currentTemplate = templateName;
        localStorage.setItem('preferredTemplate', templateName);
        showToast(`Thème "${templates[templateName].name}" appliqué`, 'success');
        if (document.getElementById('previewModal').classList.contains('active')) {
            generatePreviewHTML();
        }
    }
}

function getCurrentTemplate() {
    return templates[currentTemplate];
}

// ==================== CONVERSION: DEVIS TO FACTURE ====================
async function convertDevisToFacture(devisId) {
    try {
        const devis = await window.electronAPI.getDocument(devisId);
        if (!devis) {
            showToast('Devis non trouvé', 'error');
            return;
        }
        if (devis.type !== 'devis') {
            showToast('Ce document n\'est pas un devis', 'warning');
            return;
        }

        showConfirm(
            '🔄 Conversion Devis → Facture',
            `Convertir le devis "${devis.number}" en facture ?\nLes données seront copiées et un nouveau numéro de facture sera généré.`,
            async () => {
                showLoading('Conversion en cours...');
                try {
                    // Generate new facture number
                    const newNumber = await window.electronAPI.getNextDocNumber({
                        userId: currentUser.id,
                        type: 'facture',
                        year: new Date().getFullYear()
                    });

                    // Prepare facture data from devis
                    const factureData = {
                        userId: currentUser.id,
                        type: 'facture',
                        number: newNumber,
                        date: new Date().toISOString().split('T')[0],
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        currency: devis.currency,
                        paymentMode: devis.paymentMode,
                        companyName: devis.companyName,
                        companyMF: devis.companyMF,
                        companyAddress: devis.companyAddress,
                        companyPhone: devis.companyPhone,
                        companyEmail: devis.companyEmail,
                        companyRC: devis.companyRC,
                        clientName: devis.clientName,
                        clientMF: devis.clientMF,
                        clientAddress: devis.clientAddress,
                        clientPhone: devis.clientPhone,
                        clientEmail: devis.clientEmail,
                        items: devis.items,
                        applyTimbre: devis.applyTimbre,
                        timbreAmount: devis.timbreAmount,
                        totalHT: devis.totalHT,
                        totalTTC: devis.totalTTC,
                        logoImage: devis.logoImage,
                        stampImage: devis.stampImage,
                        signatureImage: devis.signatureImage,
                        notes: `Converti depuis le devis ${devis.number}\n\n${devis.notes || ''}`,
                        originalDevisId: devis.id,
                        originalDevisNumber: devis.number
                    };

                    // Save the new facture
                    const result = await window.electronAPI.saveDocument(factureData);
                    
                    if (result.success) {
                        showToast(`✅ Facture ${newNumber} créée avec succès !`, 'success', 5000);
                        loadDocuments();
                        loadDashboard();
                        
                        // Option to view the new facture immediately
                        setTimeout(() => {
                            viewDocument(result.document.id);
                        }, 500);
                    } else {
                        showToast('Erreur lors de la conversion', 'error');
                    }
                } catch (error) {
                    showToast('Erreur de conversion', 'error');
                    console.error(error);
                } finally {
                    hideLoading();
                }
            },
            'Convertir',
            'btn-success'
        );
    } catch (error) {
        showToast('Erreur lors du chargement du devis', 'error');
    }
}

// ==================== EDIT DOCUMENT ====================
async function editDocument(docId) {
    try {
        const doc = await window.electronAPI.getDocument(docId);
        if (!doc) {
            showToast('Document non trouvé', 'error');
            return;
        }

        editingDocId = docId;
        currentDocType = doc.type;

        // Fill in the form
        document.getElementById('docNumber').value = doc.number;
        document.getElementById('docDate').value = doc.date;
        document.getElementById('docDueDate').value = doc.dueDate || '';
        document.getElementById('docCurrency').value = doc.currency || 'TND';
        document.getElementById('docPayment').value = doc.paymentMode || 'Virement bancaire';
        document.getElementById('docNotes').value = doc.notes || '';

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

        // Items
        document.getElementById('itemsBody').innerHTML = '';
        itemCount = 0;
        doc.items.forEach((item, index) => {
            itemCount++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:center;color:var(--gray-500);font-size:0.82rem">${itemCount}</td>
                <td><input type="text" class="item-input" id="desc${itemCount}" placeholder="Description..." value="${escapeHtml(item.description)}"></td>
                <td><input type="number" class="item-input" id="qty${itemCount}" value="${item.quantity}" min="0.001" step="0.001" onchange="calculateTotals()"></td>
                <td><input type="number" class="item-input" id="price${itemCount}" value="${item.price}" min="0" step="0.001" onchange="calculateTotals()"></td>
                <td><select class="tva-select" id="tva${itemCount}" onchange="calculateTotals()">
                    <option value="19" ${item.tva == 19 ? 'selected' : ''}>19%</option>
                    <option value="13" ${item.tva == 13 ? 'selected' : ''}>13%</option>
                    <option value="7" ${item.tva == 7 ? 'selected' : ''}>7%</option>
                    <option value="0" ${item.tva == 0 ? 'selected' : ''}>0%</option>
                </select></td>
                <td style="text-align:right;font-weight:500" id="total${itemCount}">${item.total.toFixed(3)}</td>
                <td><button type="button" class="btn-icon btn-delete" onclick="removeItem(this)">🗑️</button></td>`;
            document.getElementById('itemsBody').appendChild(tr);
        });

        // Images
        if (doc.logoImage) {
            logoImage = doc.logoImage;
            document.getElementById('logoPreview').src = doc.logoImage;
            document.getElementById('logoPreview').classList.remove('hidden');
            document.getElementById('logoPlaceholder').classList.add('hidden');
            document.getElementById('logoBox').classList.add('has-image');
        }
        if (doc.stampImage) {
            stampImage = doc.stampImage;
            document.getElementById('stampPreview').src = doc.stampImage;
            document.getElementById('stampPreview').classList.remove('hidden');
            document.getElementById('stampPlaceholder').classList.add('hidden');
            document.getElementById('stampBox').classList.add('has-image');
        }
        if (doc.signatureImage) {
            signatureImage = doc.signatureImage;
            document.getElementById('signaturePreview').src = doc.signatureImage;
            document.getElementById('signaturePreview').classList.remove('hidden');
            document.getElementById('signaturePlaceholder').classList.add('hidden');
            document.getElementById('signatureBox').classList.add('has-image');
        }

        // Timbre
        document.getElementById('applyTimbre').checked = doc.applyTimbre;
        timbreAmount = doc.timbreAmount || 0;

        // Update UI
        updateDocType();
        calculateTotals();
        navigateTo('new-document');
        
        // Change save button to indicate editing
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.innerHTML = '💾 Mettre à jour le Document';
        saveBtn.onclick = () => updateExistingDocument(docId);
        
        showToast(`Modification du ${doc.type} ${doc.number}`, 'info');
    } catch (error) {
        showToast('Erreur lors du chargement du document', 'error');
        console.error(error);
    }
}

async function updateExistingDocument(docId) {
    if (!validateDocumentForm()) return;
    
    const items = [];
    for (let i = 1; i <= itemCount; i++) {
        const desc = document.getElementById(`desc${i}`)?.value.trim();
        if (desc) {
            items.push({
                description: desc,
                quantity: parseFloat(document.getElementById(`qty${i}`).value) || 0,
                price: parseFloat(document.getElementById(`price${i}`).value) || 0,
                tva: parseFloat(document.getElementById(`tva${i}`).value) || 0,
                total: parseFloat(document.getElementById(`total${i}`).textContent) || 0
            });
        }
    }

    const docData = {
        id: docId,
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
        notes: document.getElementById('docNotes').value,
        totalHT: parseFloat(document.getElementById('totalHT').textContent) || 0,
        totalTTC: parseFloat(document.getElementById('totalTTC').textContent) || 0,
        logoImage: logoImage,
        stampImage: stampImage,
        signatureImage: signatureImage
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Mise à jour...';
    showLoading('Mise à jour du document...');

    try {
        const result = await window.electronAPI.saveDocument(docData);
        if (result.success) {
            generatePreviewHTML();
            const html = buildPDFDocument(document.getElementById('previewContent').innerHTML);
            await window.electronAPI.exportPDF({
                html,
                filename: `${currentDocType.toUpperCase()}-${result.document.number}.pdf`
            });
            showToast('Document mis à jour et PDF généré !', 'success', 5000);
            resetDocumentForm();
            loadDashboard();
            navigateTo('documents');
        } else {
            showToast('Erreur: ' + (result.error || 'Impossible de mettre à jour'), 'error');
        }
    } catch (error) {
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        hideLoading();
        btn.disabled = false;
        btn.innerHTML = '💾 Enregistrer & Exporter PDF';
        btn.onclick = saveAndDownloadPDF;
        editingDocId = null;
    }
}

// ==================== TEMPLATE-BASED HTML BUILDERS ====================
function buildInvoiceHTML(d) {
    const template = getCurrentTemplate();
    const typeColors = template.colors;
    const color = typeColors[d.docType] || typeColors.facture;
    
    switch (currentTemplate) {
        case 'retro98':
            return buildRetro98Template(d, color, template);
        case 'cinematic':
            return buildCinematicTemplate(d, color, template);
        default:
            return buildModernTemplate(d, color, template);
    }
}

function buildModernTemplate(d, color, template) {
    const typeLabels = { facture: 'FACTURE', devis: 'DEVIS', bon: 'BON DE COMMANDE' };
    
    return `<div style="font-family:${template.fontFamily};color:#1f2937">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid ${color}">
        <div style="flex:1">${d.logoHTML}<h2 style="color:${color};font-size:1.3rem;font-weight:700;margin-bottom:8px">${escapeHtml(d.companyName)}</h2>
        <div style="font-size:0.82rem;color:#4b5563;line-height:1.8">
            ${d.companyMF ? `<span style="background:${color};color:white;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:0.78rem">MF: ${escapeHtml(d.companyMF)}</span><br>` : ''}
            ${d.companyAddress ? `📍 ${escapeHtml(d.companyAddress)}<br>` : ''}
            ${d.companyPhone ? `📞 ${escapeHtml(d.companyPhone)}<br>` : ''}
            ${d.companyEmail ? `✉️ ${escapeHtml(d.companyEmail)}<br>` : ''}
            ${d.companyRC ? `🏛️ RC: ${escapeHtml(d.companyRC)}` : ''}
        </div></div>
        <div style="text-align:right;flex-shrink:0;margin-left:30px">
            <div style="background:${color};color:white;padding:10px 20px;border-radius:8px;margin-bottom:14px;display:inline-block"><div style="font-size:1.4rem;font-weight:800;letter-spacing:1px">${typeLabels[d.docType]}</div></div>
            <div style="font-size:0.85rem;color:#4b5563;line-height:2">
                <div><strong style="color:#1f2937">N°:</strong> <span style="font-family:monospace">${escapeHtml(d.docNumber)}</span></div>
                <div><strong style="color:#1f2937">Date:</strong> ${formatDate(d.docDate)}</div>
                ${d.docType === 'facture' && d.docDueDate ? `<div><strong style="color:#1f2937">Échéance:</strong> ${formatDate(d.docDueDate)}</div>` : ''}
                <div><strong style="color:#1f2937">Paiement:</strong> ${escapeHtml(d.paymentMode)}</div>
            </div>
        </div>
    </div>
    <div style="background:#f8faff;border:1px solid #dbeafe;border-left:4px solid ${color};padding:16px 20px;border-radius:8px;margin-bottom:28px">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${color};margin-bottom:8px">Facturé à</div>
        <div style="font-weight:700;font-size:1rem;color:#1f2937;margin-bottom:4px">${escapeHtml(d.clientName)}</div>
        <div style="font-size:0.82rem;color:#4b5563;line-height:1.8">
            ${d.clientMF ? `MF: ${escapeHtml(d.clientMF)}<br>` : ''}
            ${d.clientAddress ? `${escapeHtml(d.clientAddress)}<br>` : ''}
            ${d.clientPhone ? `Tél: ${escapeHtml(d.clientPhone)}<br>` : ''}
            ${d.clientEmail ? `Email: ${escapeHtml(d.clientEmail)}` : ''}
        </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead><tr style="background:${color};color:white">
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
            ${buildTotalRow('Total HT', d.totalHT, d.currency)}
            ${d.tva19 > 0 ? buildTotalRow('TVA 19%', d.tva19, d.currency) : ''}
            ${d.tva13 > 0 ? buildTotalRow('TVA 13%', d.tva13, d.currency) : ''}
            ${d.tva7 > 0 ? buildTotalRow('TVA 7%', d.tva7, d.currency) : ''}
            ${d.timbreAmount > 0 ? buildTotalRow('Timbre Fiscal', d.timbreAmount, d.currency) : ''}
            <div style="display:flex;justify-content:space-between;padding:13px 16px;background:${color};color:white;font-weight:700;font-size:1rem"><span>TOTAL TTC</span><span>${d.totalTTC.toFixed(3)} ${d.currency}</span></div>
        </div>
    </div>
    <div style="background:#fffbeb;border:1px solid #fcd34d;padding:12px 16px;border-radius:8px;font-size:0.82rem;color:#78350f;margin-bottom:28px">
        <strong>Arrêté à la somme de :</strong> ${numberToWords(d.totalTTC)} ${d.currency}
    </div>
    ${d.notes ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;padding:14px 18px;border-radius:8px;font-size:0.82rem;color:#4b5563;margin-bottom:28px"><strong style="color:#1f2937;display:block;margin-bottom:6px">Notes & Conditions :</strong>${escapeHtml(d.notes).replace(/\n/g, '<br>')}</div>` : ''}
    <div style="display:flex;gap:30px;margin-top:40px">
        <div style="flex:1;text-align:center">
            ${d.stampImage ? `<img src="${d.stampImage}" style="max-width:120px;max-height:90px;display:inline-block;margin-bottom:8px">` : '<div style="height:80px"></div>'}
            ${d.signatureImage ? `<img src="${d.signatureImage}" style="max-width:120px;max-height:70px;display:inline-block;margin-bottom:8px">` : ''}
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

function buildRetro98Template(d, color, template) {
    const typeLabels = { facture: 'FACTURE', devis: 'DEVIS', bon: 'BON DE COMMANDE' };
    
    return `<div style="font-family:${template.fontFamily};color:#000;background:#c0c0c0;padding:20px;">
    <div style="background:#fff;border:2px solid #000;${template.shadow};padding:20px;max-width:700px;margin:0 auto;">
        <div style="border:2px solid ${color};padding:15px;margin-bottom:20px;background:#fff;">
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="vertical-align:top;">
                        ${d.logoHTML}
                        <div style="font-size:1.2rem;font-weight:bold;color:${color};margin-bottom:10px;">${escapeHtml(d.companyName)}</div>
                        <div style="font-size:0.8rem;line-height:1.6;">
                            ${d.companyMF ? `<span style="background:#000;color:#0f0;padding:2px 6px;">MF:${escapeHtml(d.companyMF)}</span><br>` : ''}
                            ${d.companyAddress ? `📍 ${escapeHtml(d.companyAddress)}<br>` : ''}
                            ${d.companyPhone ? `☎ ${escapeHtml(d.companyPhone)}<br>` : ''}
                            ${d.companyEmail ? `@ ${escapeHtml(d.companyEmail)}` : ''}
                        </div>
                    </td>
                    <td style="text-align:right;vertical-align:top;">
                        <div style="background:${color};color:#fff;padding:8px 16px;font-size:1.3rem;font-weight:bold;border:2px solid #000;${template.shadow};display:inline-block;margin-bottom:10px;">
                            ${typeLabels[d.docType]}
                        </div>
                        <div style="font-size:0.9rem;line-height:1.8;border:1px solid #000;padding:10px;background:#f0f0f0;">
                            <div><b>N°:</b> ${escapeHtml(d.docNumber)}</div>
                            <div><b>Date:</b> ${formatDate(d.docDate)}</div>
                            ${d.docType === 'facture' && d.docDueDate ? `<div><b>Échéance:</b> ${formatDate(d.docDueDate)}</div>` : ''}
                            <div><b>Paiement:</b> ${escapeHtml(d.paymentMode)}</div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="border:2px solid #000;padding:15px;margin-bottom:20px;background:#e8e8e8;">
            <div style="background:${color};color:#fff;padding:4px 8px;font-size:0.7rem;font-weight:bold;display:inline-block;margin-bottom:8px;">CLIENT</div>
            <div style="font-weight:bold;font-size:1rem;">${escapeHtml(d.clientName)}</div>
            <div style="font-size:0.85rem;line-height:1.6;">
                ${d.clientMF ? `<b>MF:</b> ${escapeHtml(d.clientMF)}<br>` : ''}
                ${d.clientAddress ? `${escapeHtml(d.clientAddress)}<br>` : ''}
                ${d.clientPhone ? `<b>Tél:</b> ${escapeHtml(d.clientPhone)}<br>` : ''}
                ${d.clientEmail ? `<b>Email:</b> ${escapeHtml(d.clientEmail)}` : ''}
            </div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:2px solid #000;margin-bottom:20px;">
            <thead>
                <tr style="background:${color};color:#fff;">
                    <th style="padding:8px;border:2px solid #000;">N°</th>
                    <th style="padding:8px;border:2px solid #000;text-align:left;">DESCRIPTION</th>
                    <th style="padding:8px;border:2px solid #000;">QTÉ</th>
                    <th style="padding:8px;border:2px solid #000;text-align:right;">P.U.HT</th>
                    <th style="padding:8px;border:2px solid #000;">TVA</th>
                    <th style="padding:8px;border:2px solid #000;text-align:right;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${d.itemsHTML.replace(/style="[^"]*"/g, '').replace(/<td>/g, '<td style="padding:8px;border:1px solid #000;">').replace(/<tr>/g, '<tr style="background:#fff;">')}
            </tbody>
        </table>

        <div style="border:2px solid #000;padding:15px;background:#f0f0f0;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
                ${d.totalHT > 0 ? `<tr><td style="padding:5px;"><b>Total HT:</b></td><td style="text-align:right;padding:5px;">${d.totalHT.toFixed(3)} ${d.currency}</td></tr>` : ''}
                ${d.tva19 > 0 ? `<tr style="background:#e0e0e0;"><td style="padding:5px;"><b>TVA 19%:</b></td><td style="text-align:right;padding:5px;">${d.tva19.toFixed(3)} ${d.currency}</td></tr>` : ''}
                ${d.tva13 > 0 ? `<tr style="background:#e0e0e0;"><td style="padding:5px;"><b>TVA 13%:</b></td><td style="text-align:right;padding:5px;">${d.tva13.toFixed(3)} ${d.currency}</td></tr>` : ''}
                ${d.tva7 > 0 ? `<tr style="background:#e0e0e0;"><td style="padding:5px;"><b>TVA 7%:</b></td><td style="text-align:right;padding:5px;">${d.tva7.toFixed(3)} ${d.currency}</td></tr>` : ''}
                ${d.timbreAmount > 0 ? `<tr style="background:#ffffcc;"><td style="padding:5px;"><b>Timbre:</b></td><td style="text-align:right;padding:5px;">${d.timbreAmount.toFixed(3)} ${d.currency}</td></tr>` : ''}
                <tr style="background:${color};color:#fff;font-size:1.1rem;font-weight:bold;">
                    <td style="padding:10px 5px;"><b>TOTAL TTC:</b></td>
                    <td style="text-align:right;padding:10px 5px;">${d.totalTTC.toFixed(3)} ${d.currency}</td>
                </tr>
            </table>
        </div>

        <div style="border:2px solid #ff0;background:#ffffcc;padding:10px;margin-bottom:20px;font-size:0.85rem;">
            <b>Arrêté à la somme de:</b> ${numberToWords(d.totalTTC)} ${d.currency}
        </div>

        ${d.notes ? `<div style="border:1px solid #000;padding:10px;margin-bottom:20px;font-size:0.8rem;background:#fff;">${escapeHtml(d.notes).replace(/\n/g, '<br>')}</div>` : ''}

        <table style="width:100%;margin-top:30px;">
            <tr>
                <td style="width:50%;text-align:center;padding:20px;">
                    ${d.stampImage ? `<img src="${d.stampImage}" style="max-width:100px;max-height:80px;"><br>` : '<div style="height:60px;"></div>'}
                    ${d.signatureImage ? `<img src="${d.signatureImage}" style="max-width:100px;max-height:60px;"><br>` : ''}
                    <div style="border-top:2px solid #000;padding-top:5px;font-weight:bold;">Cachet & Signature</div>
                </td>
                <td style="width:50%;text-align:center;padding:20px;">
                    <div style="height:60px;"></div>
                    <div style="border-top:2px solid #000;padding-top:5px;font-weight:bold;">Signature Client</div>
                </td>
            </tr>
        </table>

        <div style="text-align:center;font-size:0.7rem;color:#666;margin-top:20px;padding-top:10px;border-top:1px solid #999;">
            [TuniInvoice Pro 98 Edition] - Document conforme DGI Tunisie
        </div>
    </div>
</div>`;
}

function buildCinematicTemplate(d, color, template) {
    const typeLabels = { facture: 'FACTURE', devis: 'DEVIS', bon: 'BON DE COMMANDE' };
    
    return `<div style="font-family:${template.fontFamily};color:#1a1a1a;background:linear-gradient(135deg, #f5f5f0 0%, #e8e6e1 100%);padding:40px;min-height:100%;">
    <div style="max-width:800px;margin:0 auto;background:#fff;${template.shadow};position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg, ${color}, #000);"></div>
        
        <div style="padding:50px 60px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:50px;">
                <div style="flex:1;">
                    ${d.logoHTML ? `<div style="margin-bottom:20px;filter:grayscale(100%) contrast(120%);">${d.logoHTML}</div>` : ''}
                    <h1 style="font-size:2rem;font-weight:300;letter-spacing:3px;color:${color};text-transform:uppercase;margin-bottom:15px;">${escapeHtml(d.companyName)}</h1>
                    <div style="font-size:0.85rem;color:#666;line-height:2;letter-spacing:0.5px;">
                        ${d.companyMF ? `<span style="border-bottom:1px solid ${color};padding-bottom:2px;">MF ${escapeHtml(d.companyMF)}</span><br>` : ''}
                        ${d.companyAddress ? `${escapeHtml(d.companyAddress)}<br>` : ''}
                        ${d.companyPhone ? `${escapeHtml(d.companyPhone)}<br>` : ''}
                        ${d.companyEmail ? `${escapeHtml(d.companyEmail)}` : ''}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.7rem;letter-spacing:4px;color:#999;text-transform:uppercase;margin-bottom:10px;">${typeLabels[d.docType]}</div>
                    <div style="font-size:2.5rem;font-weight:100;color:${color};letter-spacing:2px;margin-bottom:20px;">${escapeHtml(d.docNumber.split('-').pop())}</div>
                    <div style="font-size:0.8rem;color:#666;line-height:2;">
                        <div>${formatDate(d.docDate)}</div>
                        ${d.docType === 'facture' && d.docDueDate ? `<div style="color:#999;">Échéance: ${formatDate(d.docDueDate)}</div>` : ''}
                        <div style="margin-top:10px;font-style:italic;">${escapeHtml(d.paymentMode)}</div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom:50px;padding:30px;background:#fafaf8;border-left:3px solid ${color;">
                <div style="font-size:0.65rem;letter-spacing:3px;color:#999;text-transform:uppercase;margin-bottom:15px;">Facturé à</div>
                <div style="font-size:1.4rem;font-weight:300;color:${color};margin-bottom:10px;letter-spacing:1px;">${escapeHtml(d.clientName)}</div>
                <div style="font-size:0.85rem;color:#666;line-height:1.8;">
                    ${d.clientMF ? `<span style="color:#999;">Matricule</span> ${escapeHtml(d.clientMF)}<br>` : ''}
                    ${d.clientAddress ? `${escapeHtml(d.clientAddress)}<br>` : ''}
                    ${d.clientPhone || d.clientEmail ? `<div style="margin-top:10px;">` : ''}
                    ${d.clientPhone ? `<span style="color:#999;">Tél.</span> ${escapeHtml(d.clientPhone)} ` : ''}
                    ${d.clientEmail ? `<span style="color:#999;">@</span> ${escapeHtml(d.clientEmail)}` : ''}
                    ${d.clientPhone || d.clientEmail ? `</div>` : ''}
                </div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:50px;">
                <thead>
                    <tr style="border-bottom:2px solid ${color};">
                        <th style="padding:15px 10px;text-align:left;font-weight:400;letter-spacing:2px;font-size:0.7rem;color:#999;text-transform:uppercase;">N°</th>
                        <th style="padding:15px 10px;text-align:left;font-weight:400;letter-spacing:2px;font-size:0.7rem;color:#999;text-transform:uppercase;">Description</th>
                        <th style="padding:15px 10px;text-align:center;font-weight:400;letter-spacing:2px;font-size:0.7rem;color:#999;text-transform:uppercase;">Qté</th>
                        <th style="padding:15px 10px;text-align:right;font-weight:400;letter-spacing:2px;font-size:0.7rem;color:#999;text-transform:uppercase;">P.U.</th>
                        <th style="padding:15px 10px;text-align:center;font-weight:400;letter-spacing:2px;font-size:0.7rem;color:#999;text-transform:uppercase;">TVA</th>
                        <th style="padding:15px 10px;text-align:right;font-weight:400;letter-spacing:2px;font-size:0.7rem;color:#999;text-transform:uppercase;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${d.itemsHTML.replace(/style="[^"]*"/g, '').replace(/<td>/g, '<td style="padding:20px 10px;border-bottom:1px solid #eee;font-size:0.9rem;">').replace(/<tr>/g, '<tr style="transition:background 0.3s;">')}
                </tbody>
            </table>

            <div style="display:flex;justify-content:flex-end;margin-bottom:40px;">
                <div style="width:350px;">
                    ${buildCinematicTotalRow('Sous-total', d.totalHT, d.currency, color)}
                    ${d.tva19 > 0 ? buildCinematicTotalRow('TVA (19%)', d.tva19, d.currency, color) : ''}
                    ${d.tva13 > 0 ? buildCinematicTotalRow('TVA (13%)', d.tva13, d.currency, color) : ''}
                    ${d.tva7 > 0 ? buildCinematicTotalRow('TVA (7%)', d.tva7, d.currency, color) : ''}
                    ${d.timbreAmount > 0 ? buildCinematicTotalRow('Timbre fiscal', d.timbreAmount, d.currency, color) : ''}
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:25px 0;margin-top:20px;border-top:3px solid ${color};">
                        <span style="font-size:1.1rem;letter-spacing:3px;text-transform:uppercase;color:${color};">Total</span>
                        <span style="font-size:1.8rem;font-weight:300;color:${color};letter-spacing:1px;">${d.totalTTC.toFixed(3)} <span style="font-size:0.9rem;color:#999;">${d.currency}</span></span>
                    </div>
                </div>
            </div>

            <div style="background:#fafaf8;padding:25px 30px;margin-bottom:40px;font-style:italic;color:#666;font-size:0.9rem;line-height:1.6;border-left:3px solid #d4af37;">
                "${numberToWords(d.totalTTC)} ${d.currency}"
            </div>

            ${d.notes ? `<div style="margin-bottom:40px;padding:25px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;font-size:0.85rem;color:#666;line-height:1.8;">
                <div style="font-size:0.65rem;letter-spacing:3px;color:#999;text-transform:uppercase;margin-bottom:15px;">Notes</div>
                ${escapeHtml(d.notes).replace(/\n/g, '<br>')}
            </div>` : ''}

            <div style="display:flex;gap:60px;margin-top:60px;">
                <div style="flex:1;text-align:center;">
                    ${d.stampImage ? `<div style="margin-bottom:15px;opacity:0.8;">${d.stampImage}</div>` : '<div style="height:80px;"></div>'}
                    ${d.signatureImage ? `<div style="margin-bottom:15px;font-family:cursive;font-size:1.5rem;color:${color};transform:rotate(-5deg);display:inline-block;">Signature</div>` : ''}
                    <div style="font-size:0.7rem;letter-spacing:3px;color:#999;text-transform:uppercase;padding-top:15px;border-top:1px solid #ddd;">Émetteur</div>
                </div>
                <div style="flex:1;text-align:center;">
                    <div style="height:80px;"></div>
                    <div style="font-size:0.7rem;letter-spacing:3px;color:#999;text-transform:uppercase;padding-top:15px;border-top:1px solid #ddd;">Client</div>
                </div>
            </div>

            <div style="text-align:center;margin-top:60px;padding-top:30px;border-top:1px solid #eee;">
                <div style="font-size:0.6rem;letter-spacing:2px;color:#bbb;text-transform:uppercase;">
                    Document établi conformément à la législation fiscale tunisienne • DGI
                </div>
            </div>
        </div>
        
        <div style="position:absolute;bottom:0;left:0;right:0;height:8px;background:linear-gradient(90deg, #000, ${color});"></div>
    </div>
</div>`;
}

function buildCinematicTotalRow(label, value, currency, color) {
    return `<div style="display:flex;justify-content:space-between;padding:12px 0;font-size:0.9rem;color:#666;border-bottom:1px solid #f0f0f0;">
        <span>${label}</span>
        <span style="color:${color};font-weight:500;">${value.toFixed(3)} ${currency}</span>
    </div>`;
}

// ==================== UPDATED RENDER FUNCTIONS ====================
function renderDocumentsTable(docs) {
    const container = document.getElementById('allDocsTable');
    if (!docs.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📄</div><h3>Aucun document</h3><p>Commencez par créer votre premier document</p></div>`;
        return;
    }
    container.innerHTML = `<table><thead><tr><th>Type</th><th>N°</th><th>Client</th><th>Date</th><th>Échéance</th><th>Total TTC</th><th>Actions</th></tr></thead><tbody>
        ${docs.map(doc => `<tr>
            <td><span class="badge badge-${doc.type}">${doc.type.toUpperCase()}</span></td>
            <td style="font-family:monospace;font-size:0.82rem">${doc.number}</td>
            <td>${escapeHtml(doc.clientName)}</td>
            <td>${formatDate(doc.date)}</td>
            <td>${doc.dueDate ? formatDate(doc.dueDate) : '—'}</td>
            <td style="font-weight:600">${doc.totalTTC.toFixed(3)} ${doc.currency}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewDocument('${doc.id}')" title="Aperçu">👁️</button>
                <button class="btn-icon btn-edit" onclick="editDocument('${doc.id}')" title="Modifier">✏️</button>
                ${doc.type === 'devis' ? `<button class="btn-icon btn-pdf" onclick="convertDevisToFacture('${doc.id}')" title="Convertir en Facture" style="background:#d1fae5;color:#065f46;">🔄</button>` : ''}
                <button class="btn-icon btn-pdf" onclick="downloadDocPDF('${doc.id}')" title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDoc('${doc.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
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
                <button class="btn-icon btn-view" onclick="viewDocument('${doc.id}')" title="Aperçu">👁️</button>
                <button class="btn-icon btn-edit" onclick="editDocument('${doc.id}')" title="Modifier">✏️</button>
                ${doc.type === 'devis' ? `<button class="btn-icon btn-pdf" onclick="convertDevisToFacture('${doc.id}')" title="Convertir en Facture" style="background:#d1fae5;color:#065f46;">🔄</button>` : ''}
                <button class="btn-icon btn-pdf" onclick="downloadDocPDF('${doc.id}')" title="PDF">📄</button>
                <button class="btn-icon btn-delete" onclick="confirmDeleteDoc('${doc.id}')" title="Supprimer">🗑️</button>
            </td></tr>`).join('')}
    </tbody></table>`;
}

// ==================== RESET FORM FIX ====================
function resetDocumentForm() {
    ['docClientName', 'docClientMF', 'docClientAddress', 'docClientPhone', 'docClientEmail', 'docNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('applyTimbre').checked = false;
    document.getElementById('itemsBody').innerHTML = '';
    itemCount = 0;
    addItem();
    removeImage('logo');
    removeImage('stamp');
    removeImage('signature');
    calculateTotals();
    
    // Reset save button
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerHTML = '💾 Enregistrer & Exporter PDF';
    saveBtn.onclick = saveAndDownloadPDF;
    editingDocId = null;
    
    window.electronAPI.getNextDocNumber({ userId: currentUser.id, type: currentDocType, year: new Date().getFullYear() })
        .then(n => { document.getElementById('docNumber').value = n; })
        .catch(() => {});
}

// Keep all other existing functions (showToast, handleLogin, etc.) as they were...
// [Previous code remains unchanged below this point]