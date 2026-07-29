/**
 * invoice-builder.js — CRIT-02: Includes all legally required fields per
 * Tunisian Code de Commerce Art. 18 and Code de la TVA Art. 18
 */

function esc(t) {
    if (!t) return '';
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildInvoiceHTML(data) {
    const dp = data.decimalPlaces ?? 3;
    const fmt = v => (parseFloat(v) || 0).toFixed(dp);
    const isStockDoc = ['bl', 'bs', 'be'].includes(data.type);
    const isAvoir = data.type === 'avoir';
    const hidePrices = isStockDoc;

    const titles = {
        facture: 'FACTURE',
        devis: 'DEVIS',
        bon: 'BON DE COMMANDE',
        bl: 'BON DE LIVRAISON',
        ba: "BON D'ACHAT",
        bs: 'BON DE SORTIE',
        be: "BON D'ENTRÉE",
        avoir: 'AVOIR / NOTE DE CRÉDIT',
        proforma: 'FACTURE PROFORMA'
    };
    const title = titles[data.type] || data.type.toUpperCase();

    // CRIT-02: TVA% column added to items table
    const itemsRows = data.items
        .map((item, idx) => {
            const lineHT = item.quantity * item.price;
            if (hidePrices) {
                return `<tr><td>${idx + 1}</td><td>${esc(item.description)}</td><td>${item.quantity}</td><td>${esc(item.unit || '')}</td></tr>`;
            }
            return `
            <tr>
                <td>${idx + 1}</td>
                <td>${esc(item.description)}</td>
                <td>${item.quantity}</td>
                <td>${esc(item.unit || 'unité')}</td>
                <td>${isAvoir ? `<span style="color:#dc2626">-${fmt(item.price)}</span>` : fmt(item.price)}</td>
                <td style="text-align:center">${item.tva || 0}%</td>
                <td>${isAvoir ? `<span style="color:#dc2626">-${fmt(lineHT)}</span>` : fmt(lineHT)}</td>
            </tr>
        `;
        })
        .join('');

    // CRIT-02: Calculate total TVA from tvaLines
    const totalTVA = (data.tvaLines || []).reduce((s, l) => s + (l.tvaAmount || 0), 0);

    // CRIT-02: Compute pre-discount subtotal if discount was applied
    const hasDiscount = (data.discountPercent || 0) > 0 || (data.discountAmount || 0) > 0;
    const preDiscountHT = hasDiscount
        ? (data.discountPercent > 0
            ? data.totalHT / (1 - data.discountPercent / 100)
            : data.totalHT + (data.discountAmount || 0))
        : data.totalHT;
    const discountValue = preDiscountHT - data.totalHT;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 40px; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; font-size: 13px; line-height: 1.4; }
.header { display: flex; justify-content: space-between; margin-bottom: 30px; }
.title { font-size: 28px; font-weight: 800; color: ${isAvoir ? '#dc2626' : '#111'}; margin-bottom: 5px; }
.line { height: 2px; background: #eee; margin: 25px 0; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 2px solid #eee; padding: 10px 5px; }
td { padding: 12px 5px; border-bottom: 1px solid #f9f9f9; }
.fiscal-summary { margin-top: 30px; display: flex; justify-content: flex-end; }
.totals-table { width: 300px; }
.totals-table td { padding: 6px 10px; }
.totals-table td:last-child { text-align: right; font-weight: 600; }
.total-row { font-size: 16px; border-top: 2px solid #eee; }
.footer { margin-top: 50px; display: flex; justify-content: space-between; }
.logo img { max-height: 70px; margin-bottom: 10px; }
.signature img, .stamp img { max-height: 90px; }
.avoir-banner { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: #991b1b; font-size: 12px; }
.legal-footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 10px; color: #888; }
</style>
</head>
<body>

<div class="header">
    <div>
        <div class="title">${title}</div>
        <div style="font-size:16px; font-weight:600;">N° ${data.number}</div>
        <div style="color:#666; margin-top:4px;">Date: ${data.date}</div>
        ${isAvoir && data.referenceDoc ? `<div style="color:#dc2626; font-weight:600; margin-top:8px;">↩️ SUR FACTURE N°: ${data.referenceDoc}</div>` : ''}
    </div>
    <div style="text-align:right;">
        ${data.logoImage ? `<div class="logo"><img src="${data.logoImage}" /></div>` : ''}
        <div style="font-size:16px; font-weight:700;">${esc(data.companyName || '')}</div>
        <div style="color:#444;">MF: ${esc(data.companyMF || '')}</div>
        ${data.companyRC ? `<div style="color:#444;">RC: ${esc(data.companyRC)}</div>` : ''}
        <div style="color:#666; max-width:250px; margin-left:auto;">${esc(data.companyAddress || '')}</div>
        ${data.companyPhone ? `<div style="color:#666;">Tél: ${esc(data.companyPhone)}</div>` : ''}
        ${data.companyEmail ? `<div style="color:#666;">${esc(data.companyEmail)}</div>` : ''}
    </div>
</div>

${
    isAvoir
        ? `
<div class="avoir-banner">
    <strong>⚠️ DOCUMENT D'AVOIR</strong> — Ce document annule ou réduit la facture référencée ci-dessus. Les montants indiqués sont portés au crédit du client.
</div>`
        : ''
}

<div style="display:flex; justify-content:space-between;">
    <div>
        <div style="text-transform:uppercase; font-size:11px; color:#666; margin-bottom:5px;">Destinataire</div>
        <div style="font-size:15px; font-weight:700;">${esc(data.clientName || '')}</div>
        ${data.clientMF ? `<div>MF: ${esc(data.clientMF)}</div>` : ''}
        <div style="color:#444; max-width:250px;">${esc(data.clientAddress || '')}</div>
    </div>
    <div style="text-align:right;">
        ${data.dueDate ? `<div style="color:#666;">Échéance: <strong>${data.dueDate}</strong></div>` : ''}
        ${data.paymentMode ? `<div style="color:#666;">Mode paiement: <strong>${esc(data.paymentMode)}</strong></div>` : ''}
        ${data.currency ? `<div style="color:#666;">Devise: <strong>${data.currency}</strong></div>` : ''}
    </div>
</div>

<table>
<thead>
    <tr>
        <th style="width:40px;">#</th>
        <th>Désignation</th>
        <th style="width:50px;">Qté</th>
        ${!hidePrices ? '<th style="width:60px;">Unité</th>' : '<th style="width:60px;">Unité</th>'}
        ${!hidePrices ? '<th style="width:90px;">Prix Unit. HT</th>' : ''}
        ${!hidePrices ? '<th style="width:60px;">TVA %</th>' : ''}
        ${!hidePrices ? '<th style="width:90px;">Montant HT</th>' : ''}
    </tr>
</thead>
<tbody>
    ${itemsRows}
</tbody>
</table>

${
    !hidePrices
        ? `
<div class="fiscal-summary">
    <table class="totals-table">
        ${hasDiscount ? `
        <tr>
            <td>Sous-total HT avant remise</td>
            <td>${fmt(preDiscountHT)}</td>
        </tr>
        <tr style="color:#dc2626">
            <td>Remise${data.discountPercent ? ` ${data.discountPercent}%` : ''}</td>
            <td>-${fmt(discountValue)}</td>
        </tr>` : ''}
        <tr>
            <td>Total HT</td>
            <td style="${isAvoir ? 'color:#dc2626' : ''}">${isAvoir ? '-' : ''}${fmt(data.totalHT)}</td>
        </tr>
        ${(data.tvaLines || [])
            .map(
                line => `
        <tr>
            <td>TVA ${line.rate}% (base: ${fmt(line.baseHT || 0)})</td>
            <td style="${isAvoir ? 'color:#dc2626' : ''}">${isAvoir ? '-' : ''}${fmt(line.tvaAmount)}</td>
        </tr>`
            )
            .join('')}
        <tr>
            <td><strong>Total TVA</strong></td>
            <td style="${isAvoir ? 'color:#dc2626' : ''}"><strong>${isAvoir ? '-' : ''}${fmt(totalTVA)}</strong></td>
        </tr>
        ${
            data.timbreFiscal
                ? `
        <tr>
            <td>Timbre Fiscal</td>
            <td>${fmt(data.timbreFiscal)}</td>
        </tr>`
                : ''
        }
        <tr class="total-row">
            <td>TOTAL TTC</td>
            <td style="${isAvoir ? 'color:#dc2626' : ''}">${isAvoir ? '-' : ''}${fmt(data.totalTTC)} ${data.currency || 'TND'}</td>
        </tr>
    </table>
</div>`
        : ''
}

${
    data.notes
        ? `
<div style="margin-top:40px; padding:15px; background:#f8f9fa; border-radius:8px;">
    <div style="font-size:11px; text-transform:uppercase; color:#666; margin-bottom:5px;">Notes & Observations</div>
    <div style="white-space:pre-wrap;">${esc(data.notes)}</div>
</div>`
        : ''
}

<div class="footer">
    <div style="flex:1">
        ${data.companyBank ? `<div style="font-size:11px; color:#666; margin-bottom:2px;">Banque: ${esc(data.companyBank)}</div>` : ''}
        ${data.companyRIB ? `<div style="font-size:11px; color:#666; margin-bottom:2px;">RIB: ${esc(data.companyRIB)}</div>` : ''}
    </div>
    <div class="signature">
        <div style="font-size:11px; color:#666; margin-bottom:10px;">Signature</div>
        ${data.signatureImage ? `<img src="${data.signatureImage}" />` : ''}
    </div>
    <div class="stamp">
        <div style="font-size:11px; color:#666; margin-bottom:10px;">Cachet</div>
        ${data.stampImage ? `<img src="${data.stampImage}" />` : ''}
    </div>
</div>

</body>
</html>
`;
}

if (typeof window !== 'undefined') {
    window.buildInvoiceHTML = buildInvoiceHTML;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildInvoiceHTML };
}
