function buildInvoiceHTML(data) {
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
        avoir: 'AVOIR / NOTE DE CRÉDIT'
    };
    const title = titles[data.type] || data.type.toUpperCase();

    const itemsRows = data.items.map((item, idx) => {
        const lineHT = (item.quantity * item.price);
        if (hidePrices) {
            return `<tr><td>${idx + 1}</td><td>${item.description}</td><td>${item.quantity}</td></tr>`;
        }
        return `
            <tr>
                <td>${idx + 1}</td>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${isAvoir ? `<span style="color:#dc2626">-${item.price.toFixed(3)}</span>` : item.price.toFixed(3)}</td>
                <td>${isAvoir ? `<span style="color:#dc2626">-${lineHT.toFixed(3)}</span>` : lineHT.toFixed(3)}</td>
            </tr>
        `;
    }).join('');

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
.totals-table { width: 280px; }
.totals-table td { padding: 6px 10px; }
.totals-table td:last-child { text-align: right; font-weight: 600; }
.total-row { font-size: 16px; border-top: 2px solid #eee; }
.footer { margin-top: 50px; display: flex; justify-content: space-between; }
.logo img { max-height: 70px; margin-bottom: 10px; }
.signature img, .stamp img { max-height: 90px; }
.avoir-banner { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: #991b1b; font-size: 12px; }
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
        <div style="font-size:16px; font-weight:700;">${data.companyName || ''}</div>
        <div style="color:#444;">MF: ${data.companyMF || ''}</div>
        <div style="color:#666; max-width:250px; margin-left:auto;">${data.companyAddress || ''}</div>
    </div>
</div>

${isAvoir ? `
<div class="avoir-banner">
    <strong>⚠️ DOCUMENT D'AVOIR</strong> — Ce document annule ou réduit la facture référencée ci-dessus. Les montants indiqués sont portés au crédit du client.
</div>` : ''}

<div style="display:flex; justify-content:space-between;">
    <div>
        <div style="text-transform:uppercase; font-size:11px; color:#666; margin-bottom:5px;">Destinataire</div>
        <div style="font-size:15px; font-weight:700;">${data.clientName || ''}</div>
        ${data.clientMF ? `<div>MF: ${data.clientMF}</div>` : ''}
        <div style="color:#444; max-width:250px;">${data.clientAddress || ''}</div>
    </div>
    <div style="text-align:right;">
        ${data.dueDate ? `<div style="color:#666;">Échéance: <strong>${data.dueDate}</strong></div>` : ''}
        ${data.currency ? `<div style="color:#666;">Devise: <strong>${data.currency}</strong></div>` : ''}
    </div>
</div>

<table>
<thead>
    <tr>
        <th style="width:40px;">#</th>
        <th>Désignation</th>
        <th style="width:60px;">Qté</th>
        ${!hidePrices ? `<th style="width:100px;">Prix Unit. HT</th>` : ''}
        ${!hidePrices ? `<th style="width:100px;">Montant HT</th>` : ''}
    </tr>
</thead>
<tbody>
    ${itemsRows}
</tbody>
</table>

${!hidePrices ? `
<div class="fiscal-summary">
    <table class="totals-table">
        <tr>
            <td>Total HT</td>
            <td style="${isAvoir ? 'color:#dc2626' : ''}">${isAvoir ? '-' : ''}${data.totalHT.toFixed(3)}</td>
        </tr>
        ${(data.tvaLines || []).map(line => `
        <tr>
            <td>TVA ${line.rate}%</td>
            <td style="${isAvoir ? 'color:#dc2626' : ''}">${isAvoir ? '-' : ''}${line.amount.toFixed(3)}</td>
        </tr>`).join('')}
        ${data.timbreFiscal ? `
        <tr>
            <td>Timbre Fiscal</td>
            <td>${data.timbreFiscal.toFixed(3)}</td>
        </tr>` : ''}
        <tr class="total-row">
            <td>TOTAL TTC</td>
            <td style="${isAvoir ? 'color:#dc2626' : ''}">${isAvoir ? '-' : ''}${data.totalTTC.toFixed(3)} ${data.currency || 'TND'}</td>
        </tr>
    </table>
</div>` : ''}

${data.notes ? `
<div style="margin-top:40px; padding:15px; background:#f8f9fa; border-radius:8px;">
    <div style="font-size:11px; text-transform:uppercase; color:#666; margin-bottom:5px;">Notes & Observations</div>
    <div style="white-space:pre-wrap;">${data.notes}</div>
</div>` : ''}

<div class="footer">
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

if (typeof window !== 'undefined') { window.buildInvoiceHTML = buildInvoiceHTML; }
if (typeof module !== 'undefined' && module.exports) { module.exports = { buildInvoiceHTML }; }