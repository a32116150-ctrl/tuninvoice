/**
 * themes.js — TuniInvoice Pro document visual themes
 * Four preset themes + schema for the full customizer.
 */

export const THEMES = {
    classic: {
        id: 'classic',
        label: 'Classique',
        icon: '📜',
        colors: { primary: '#1e3a8a', secondary: '#334155', accent: '#64748b', bg: '#ffffff', surface: '#f8fafc', border: '#e2e8f0', text: '#1e293b', textLight: '#64748b' },
        fonts: { header: "'Times New Roman', Times, serif", body: "'Times New Roman', Times, serif", size: '13px' },
        headerStyle: 'left',
        tableStyle: 'bordered',
        footerLayout: 'two-columns',
        showLogo: true, showStamp: true, showSignature: true, showQrCode: false,
        borderRadius: '0px',
        accentLine: true,
        watermark: false
    },
    modern: {
        id: 'modern',
        label: 'Moderne',
        icon: '✨',
        colors: { primary: '#0f172a', secondary: '#3b82f6', accent: '#06b6d4', bg: '#ffffff', surface: '#f0f9ff', border: '#bfdbfe', text: '#0f172a', textLight: '#6b7280' },
        fonts: { header: "'Inter', 'Segoe UI', sans-serif", body: "'Inter', 'Segoe UI', sans-serif", size: '13px' },
        headerStyle: 'center',
        tableStyle: 'striped',
        footerLayout: 'simple',
        showLogo: true, showStamp: false, showSignature: true, showQrCode: true,
        borderRadius: '8px',
        accentLine: false,
        watermark: false
    },
    executive: {
        id: 'executive',
        label: 'Exécutif',
        icon: '👑',
        colors: { primary: '#b8942a', secondary: '#2c2c2c', accent: '#c6a43f', bg: '#fffdf5', surface: '#fdf8ec', border: '#e8d5a3', text: '#1a1a1a', textLight: '#6b5c3e' },
        fonts: { header: "'Georgia', 'Playfair Display', serif", body: "'Lato', 'Helvetica Neue', sans-serif", size: '13px' },
        headerStyle: 'right',
        tableStyle: 'minimal',
        footerLayout: 'with-bank',
        showLogo: true, showStamp: true, showSignature: true, showQrCode: false,
        borderRadius: '4px',
        accentLine: true,
        watermark: false
    },
    tunisian: {
        id: 'tunisian',
        label: 'Tunisien',
        icon: '🇹🇳',
        colors: { primary: '#7c1a1a', secondary: '#c17a54', accent: '#e87b2a', bg: '#fffbf7', surface: '#fdf5ee', border: '#f5cba7', text: '#2d1b0e', textLight: '#7c5c3e' },
        fonts: { header: "'Georgia', serif", body: "'Lato', 'Arial', sans-serif", size: '13px' },
        headerStyle: 'center',
        tableStyle: 'bordered',
        footerLayout: 'two-columns',
        showLogo: true, showStamp: true, showSignature: true, showQrCode: false,
        borderRadius: '2px',
        accentLine: true,
        watermark: false
    }
};

export const DEFAULT_THEME_ID = 'modern';
export const DEFAULT_THEME = THEMES[DEFAULT_THEME_ID];

/**
 * Generate complete CSS string from a theme object.
 * Used by buildInvoicePreviewHTML and buildContractHTML.
 */
export function generateThemeCSS(theme) {
    const t = theme || DEFAULT_THEME;
    const c = t.colors;
    const f = t.fonts;
    const br = t.borderRadius || '4px';

    const tableCSS = t.tableStyle === 'bordered'
        ? `table { border-collapse: collapse; width: 100%; }
           th, td { border: 1px solid ${c.border}; padding: 8px 10px; }
           thead tr { background: ${c.surface}; }`
        : t.tableStyle === 'striped'
        ? `table { border-collapse: collapse; width: 100%; }
           th { border-bottom: 2px solid ${c.primary}; padding: 10px; color: ${c.textLight}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
           td { padding: 10px; border-bottom: 1px solid ${c.border}; }
           tbody tr:nth-child(odd) { background: ${c.surface}; }`
        : /* minimal */
          `table { border-collapse: collapse; width: 100%; }
           th { border-bottom: 2px solid ${c.primary}; padding: 10px 4px; color: ${c.textLight}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
           td { padding: 12px 4px; border-bottom: 1px solid ${c.border}; }`;

    const footerCSS = t.footerLayout === 'two-columns'
        ? `.doc-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }`
        : t.footerLayout === 'with-bank'
        ? `.doc-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid ${c.border}; padding-top: 16px; }
           .bank-info { font-size: 11px; color: ${c.textLight}; }`
        : `.doc-footer { display: flex; justify-content: flex-end; gap: 40px; margin-top: 40px; }`;

    return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: ${f.body};
            font-size: ${f.size};
            color: ${c.text};
            background: ${c.bg};
            line-height: 1.65;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .doc-wrap { padding: 40px; max-width: 900px; margin: auto; }
        .doc-header { display: flex; justify-content: ${t.headerStyle === 'center' ? 'center' : t.headerStyle === 'right' ? 'flex-end' : 'space-between'}; align-items: flex-start; margin-bottom: 40px; ${t.headerStyle === 'center' ? 'flex-direction:column;align-items:center;text-align:center;' : ''} }
        .doc-title { font-family: ${f.header}; font-size: 32px; font-weight: 800; color: ${c.primary}; letter-spacing: -0.5px; text-align: ${t.headerStyle}; }
        .doc-title-bar { width: 60px; height: 3px; background: ${c.primary}; margin: 10px ${t.headerStyle === 'right' ? '0 10px auto' : t.headerStyle === 'center' ? 'auto' : '0'}; }
        .doc-number { font-size: 13px; color: ${c.textLight}; margin-top: 4px; }
        .company-name { font-size: 18px; font-weight: 700; color: ${c.secondary}; font-family: ${f.header}; }
        .company-info { font-size: 12px; color: ${c.textLight}; margin-top: 8px; line-height: 1.7; }
        .section-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: ${c.textLight}; margin-bottom: 6px; }
        .client-name { font-size: 15px; font-weight: 600; color: ${c.text}; font-family: ${f.header}; }
        .client-info { font-size: 12px; color: ${c.textLight}; margin-top: 4px; line-height: 1.7; }
        .meta-block { text-align: right; }
        .meta-block div { font-size: 13px; color: ${c.textLight}; margin-bottom: 3px; }
        .meta-block strong { color: ${c.text}; }
        .billing-section { margin-bottom: 36px; }
        .totals-box { width: 300px; margin-left: auto; }
        .total-line { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: ${c.textLight}; }
        .total-grand { display: flex; justify-content: space-between; border-top: 2px solid ${c.primary}; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: 800; color: ${c.primary}; font-family: ${f.header}; }
        .notes-section { margin-top: 40px; padding-top: 16px; border-top: 1px solid ${c.border}; font-size: 12px; color: ${c.textLight}; line-height: 1.7; }
        .footer-note { margin-top: 40px; text-align: center; font-size: 11px; color: ${c.textLight}; }
        ${tableCSS}
        ${footerCSS}
        ${t.accentLine ? `.accent-bar { height: 4px; background: linear-gradient(90deg, ${c.primary}, ${c.accent || c.secondary}); margin-bottom: 0; }` : ''}
        ${br !== '0px' ? `.doc-card { border-radius: ${br}; }` : ''}
        @page { size: A4; margin: 0; }
        @media print { body { margin: 0; } }
    `;
}

/**
 * Build the complete invoice HTML using a theme.
 */
export function buildThemedInvoiceHTML(data, theme) {
    const t = theme || DEFAULT_THEME;
    const css = generateThemeCSS(t);
    const c = t.colors;
    const fa = (v) => data.formatAmount ? data.formatAmount(v) : (v||0).toFixed(3);

    const itemsRows = (data.items||[]).map((item, i) => `
        <tr>
            <td style="color:${c.textLight};font-size:12px">${i+1}</td>
            <td>${escHtml(item.description)}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${fa(item.price)}</td>
            <td style="text-align:center">${item.tva}%</td>
            <td style="text-align:right;font-weight:600">${fa(item.quantity * item.price)}</td>
        </tr>`).join('');

    const logoHtml = data.logoImage && t.showLogo
        ? `<img src="${data.logoImage}" style="max-width:140px;max-height:70px;object-fit:contain;margin-bottom:10px;display:block${t.headerStyle==='center'?';margin:0 auto 10px auto':''}">`
        : '';
    const accentBarHtml = t.accentLine ? `<div class="accent-bar"></div>` : '';

    const headerLeft = `
        <div>
            ${logoHtml}
            <div class="company-name">${escHtml(data.companyName)}</div>
            <div class="company-info">
                ${data.companyAddress?`<div>${escHtml(data.companyAddress)}</div>`:''}
                ${data.companyPhone?`<div>📞 ${escHtml(data.companyPhone)}</div>`:''}
                ${data.companyEmail?`<div>✉ ${escHtml(data.companyEmail)}</div>`:''}
                ${data.companyMF?`<div>MF: ${escHtml(data.companyMF)}</div>`:''}
                ${data.companyRC?`<div>RC: ${escHtml(data.companyRC)}</div>`:''}
            </div>
        </div>`;

    const headerRight = `
        <div class="meta-block">
            <div class="doc-title">${escHtml(data.typeLabel)}</div>
            <div class="doc-title-bar"></div>
            <div class="doc-number"><strong>#</strong> ${escHtml(data.docNumber)}</div>
            <div style="margin-top:8px">
                <div><strong>Date:</strong> ${fmtDate(data.docDate)}</div>
                ${data.docDueDate?`<div><strong>Échéance:</strong> ${fmtDate(data.docDueDate)}</div>`:''}
                ${data.paymentMode?`<div><strong>Paiement:</strong> ${escHtml(data.paymentMode)}</div>`:''}
            </div>
        </div>`;

    const headerCentered = `
        <div style="text-align:center;width:100%">
            ${logoHtml}
            <div class="doc-title">${escHtml(data.typeLabel)}</div>
            <div class="doc-title-bar"></div>
            <div class="doc-number"># ${escHtml(data.docNumber)} &nbsp;|&nbsp; ${fmtDate(data.docDate)}</div>
            <div class="company-name" style="margin-top:12px">${escHtml(data.companyName)}</div>
            <div class="company-info">${data.companyAddress?escHtml(data.companyAddress):''} ${data.companyMF?`| MF: ${escHtml(data.companyMF)}`:''}</div>
        </div>`;

    const headerHTML = t.headerStyle === 'center' ? headerCentered
        : t.headerStyle === 'right' ? `${headerRight}${headerLeft}`
        : `${headerLeft}${headerRight}`;

    const signatureSection = t.showSignature && data.signatureImage
        ? `<div><div style="font-size:10px;color:${c.textLight};margin-bottom:4px">Signature</div><img src="${data.signatureImage}" style="max-height:70px"></div>`
        : '<div></div>';
    const stampSection = t.showStamp && data.stampImage
        ? `<div><img src="${data.stampImage}" style="max-height:90px;opacity:0.85"></div>`
        : '<div></div>';

    const bankInfoHtml = t.footerLayout === 'with-bank' && data.companyBank
        ? `<div class="bank-info"><strong>Coordonnées bancaires:</strong><br>${escHtml(data.companyBank)}</div>`
        : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>${css}</style>
</head>
<body>
${accentBarHtml}
<div class="doc-wrap">
    <div class="doc-header">${headerHTML}</div>

    <div class="billing-section">
        <div class="section-label">Facturé à</div>
        <div class="client-name">${escHtml(data.clientName)}</div>
        <div class="client-info">
            ${data.clientAddress?`<div>${escHtml(data.clientAddress)}</div>`:''}
            ${data.clientPhone?`<div>📞 ${escHtml(data.clientPhone)}</div>`:''}
            ${data.clientEmail?`<div>✉ ${escHtml(data.clientEmail)}</div>`:''}
            ${data.clientMF?`<div>MF: ${escHtml(data.clientMF)}</div>`:''}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:32px">#</th>
                <th>Description</th>
                <th style="width:70px;text-align:center">Qté</th>
                <th style="width:100px;text-align:right">Prix HT</th>
                <th style="width:70px;text-align:center">TVA</th>
                <th style="width:100px;text-align:right">Total HT</th>
            </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
    </table>

    <div style="margin-top:24px">
        <div class="totals-box">
            <div class="total-line"><span>Total HT</span><span>${fa(data.totalHT)} ${data.currency||'TND'}</span></div>
            ${data.tva19?`<div class="total-line"><span>TVA 19%</span><span>${fa(data.tva19)} ${data.currency||'TND'}</span></div>`:''}
            ${data.tva13?`<div class="total-line"><span>TVA 13%</span><span>${fa(data.tva13)} ${data.currency||'TND'}</span></div>`:''}
            ${data.tva7 ?`<div class="total-line"><span>TVA 7%</span><span>${fa(data.tva7)} ${data.currency||'TND'}</span></div>`:''}
            ${data.timbreAmount?`<div class="total-line"><span>Timbre fiscal</span><span>${fa(data.timbreAmount)} ${data.currency||'TND'}</span></div>`:''}
            ${data.roundingAdjustment&&Math.abs(data.roundingAdjustment)>0.0001?`<div class="total-line"><span style="font-style:italic">Ajustement d'arrondi</span><span style="font-style:italic">${data.roundingAdjustment>0?'+':''}${fa(data.roundingAdjustment)} ${data.currency||'TND'}</span></div>`:''}
            <div class="total-grand"><span>Total TTC</span><span>${fa(data.totalTTC)} ${data.currency||'TND'}</span></div>
        </div>
    </div>

    ${data.notes?`<div class="notes-section">${escHtml(data.notes).replace(/\n/g,'<br>')}</div>`:''}

    <div class="doc-footer">
        ${bankInfoHtml}
        ${signatureSection}
        ${stampSection}
    </div>

    <div class="footer-note"></div>
</div>
</body>
</html>`;
}

function escHtml(t) {
    if (!t) return '';
    return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}