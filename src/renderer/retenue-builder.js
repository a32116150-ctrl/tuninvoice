/**
 * retenue-builder.js — Official DGF format for Certificat de Retenue à la Source
 * Matches the Tunisian Ministry of Finance layout exactly.
 */

// Helper: parse a full Tunisian MF string "XXXXXXXX/X/X/XXX"
function parseMF(mf) {
    if (!mf) return { base: '', codeTva: '', codeCat: '', nEtab: '' };
    const parts = String(mf).split('/');
    if (parts.length === 4) {
        return {
            base: parts[0].trim(),
            codeTva: parts[1].trim(),
            codeCat: parts[2].trim(),
            nEtab: parts[3].trim()
        };
    }
    return { base: String(mf), codeTva: '', codeCat: '', nEtab: '' };
}

// Main builder
function buildRetenueHTML(data, _theme) {
    // Get MF components: first from dedicated fields, otherwise from full MF string
    const payeur = {
        name: data.retenuerName || '',
        mf: data.retenuerMF || '',
        address: data.retenuerAddress || '',
        rep: data.retenuerRep || '',
        codeTva: data.retenuerCodeTva || '',
        codeCat: data.retenuerCodeCat || '',
        nEtab: data.retenuerNEtab || ''
    };
    if (!payeur.codeTva && payeur.mf) {
        const parsed = parseMF(payeur.mf);
        payeur.codeTva = parsed.codeTva;
        payeur.codeCat = parsed.codeCat;
        payeur.nEtab = parsed.nEtab;
        payeur.mf = parsed.base;  // keep only base part for display
    }

    const benef = {
        name: data.beneficiaireName || '',
        mf: data.beneficiaireMF || '',
        address: data.beneficiaireAddress || '',
        cin: data.beneficiaireCIN || '',
        rib: data.beneficiaireRib || '',
        codeTva: data.beneficiaireCodeTva || '',
        codeCat: data.beneficiaireCodeCat || '',
        nEtab: data.beneficiaireNEtab || ''
    };
    if (!benef.codeTva && benef.mf) {
        const parsed = parseMF(benef.mf);
        benef.codeTva = parsed.codeTva;
        benef.codeCat = parsed.codeCat;
        benef.nEtab = parsed.nEtab;
        benef.mf = parsed.base;
    }

    const montantBrut = data.montantBrut || 0;
    const montantRetenu = data.montantRetenue || 0;
    const montantNet = montantBrut - montantRetenu;

    // Month name
    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthLabel = monthNames[(data.month || 1) - 1] || '';

    // Format helpers
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '___/___/______';
    const fmtAmount = (v) => (v || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    const esc = (s) => {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const stampHtml = data.stampImage ? `<img src="${data.stampImage}" style="max-height:70px;opacity:0.9">` : '';
    const sigHtml = data.signatureImage ? `<img src="${data.signatureImage}" style="max-height:55px">` : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Certificat de Retenue — ${esc(data.number)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12px;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 15mm;
  }
  .certificate {
    max-width: 800px;
    margin: 0 auto;
    border: 1px solid #aaa;
    padding: 20px 25px;
    background: white;
  }
  .header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #000;
    padding-bottom: 10px;
  }
  .republic {
    font-size: 13px;
    font-weight: bold;
    text-transform: uppercase;
  }
  .ministere {
    font-size: 11px;
  }
  .retenue-date {
    text-align: right;
    font-weight: bold;
    margin: 15px 0;
  }
  .section {
    margin-bottom: 20px;
    border: 1px solid #aaa;
  }
  .section-title {
    background: #e0e0e0;
    font-weight: bold;
    font-size: 11px;
    padding: 4px 8px;
    border-bottom: 1px solid #aaa;
  }
  .mf-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-bottom: 1px solid #aaa;
  }
  .mf-cell {
    padding: 6px 8px;
    text-align: center;
    border-right: 1px solid #aaa;
  }
  .mf-cell:last-child { border-right: none; }
  .mf-label {
    font-size: 10px;
    font-weight: bold;
    background: #f5f5f5;
  }
  .mf-value {
    font-family: monospace;
    font-size: 12px;
  }
  .info-row {
    display: flex;
    padding: 6px 8px;
    border-bottom: 1px solid #aaa;
  }
  .info-label {
    width: 240px;
    font-weight: bold;
  }
  .info-value {
    flex: 1;
    border-bottom: 1px dotted #555;
    padding-bottom: 2px;
  }
  .amount-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
  }
  .amount-table th, .amount-table td {
    border: 1px solid #aaa;
    padding: 6px 8px;
    text-align: center;
  }
  .amount-table th {
    background: #f0f0f0;
    font-size: 11px;
  }
  .amount-table td.left { text-align: left; }
  .amount-table td.right { text-align: right; font-weight: bold; }
  .declaration {
    margin: 20px 0;
    font-style: italic;
    background: #f9f9f9;
    padding: 10px;
    border-left: 3px solid #1e3a8a;
    font-size: 11.5px;
  }
  .signature-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 20px;
    padding-top: 10px;
  }
  .sig-left {
    font-weight: bold;
  }
  .sig-right {
    text-align: center;
  }
  .sig-stamp {
    margin-top: 8px;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
  }
  .footnotes {
    margin-top: 20px;
    font-size: 9.5px;
    color: #444;
    border-top: 1px solid #ccc;
    padding-top: 8px;
    line-height: 1.5;
  }
  hr { margin: 8px 0; }
  @media print {
    body { padding: 0; }
    .certificate { border: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="certificate">
  <div class="header">
    <div class="republic">REPUBLIQUE TUNISIENNE</div>
    <div class="ministere">MINISTERE DU PLAN ET DES FINANCES<br>DIRECTION GENERALE<br>DU CONTRÔLE FISCAL</div>
  </div>

  <div class="retenue-date">
    Retenue effectuée le : ${fmtDate(data.factureDate || data.date)}
    &nbsp;&nbsp;&nbsp;&nbsp; Période : ${monthLabel} ${data.year}
    &nbsp;&nbsp;&nbsp;&nbsp; Facture N° : ${esc(data.factureNumber || '—')}
  </div>

  <!-- Section A : Personne ou organisme payeur -->
  <div class="section">
    <div class="section-title">A. PERSONNE OU ORGANISME PAYEUR</div>
    <div class="mf-grid">
      <div class="mf-cell mf-label">Matricule fiscal</div>
      <div class="mf-cell mf-label">Code TVA</div>
      <div class="mf-cell mf-label">Code catégorie<sup>(2)</sup></div>
      <div class="mf-cell mf-label">N°Etab secondaire</div>
      <div class="mf-cell mf-value">${esc(payeur.mf)}</div>
      <div class="mf-cell mf-value">${esc(payeur.codeTva)}</div>
      <div class="mf-cell mf-value">${esc(payeur.codeCat)}</div>
      <div class="mf-cell mf-value">${esc(payeur.nEtab)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Dénomination de la personne ou de l'organisme payeur :</div>
      <div class="info-value">${esc(payeur.name)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Adresse :</div>
      <div class="info-value">${esc(payeur.address)}</div>
    </div>
    ${payeur.rep ? `<div class="info-row"><div class="info-label">Représentant légal :</div><div class="info-value">${esc(payeur.rep)}</div></div>` : ''}
  </div>

  <!-- Section C : Bénéficiaire -->
  <div class="section">
    <div class="section-title">C. BENEFICIAIRE :</div>
    <div class="info-row">
      <div class="info-label">Nom, prénoms ou raison sociale :</div>
      <div class="info-value">${esc(benef.name)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Adresse professionnelle :</div>
      <div class="info-value">${esc(benef.address)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">N° de la carte d'identité :</div>
      <div class="info-value">${esc(benef.cin)}</div>
    </div>
    <div class="mf-grid">
      <div class="mf-cell mf-label">Matricule fiscal</div>
      <div class="mf-cell mf-label">Code TVA</div>
      <div class="mf-cell mf-label">Code catégorie<sup>(1)</sup></div>
      <div class="mf-cell mf-label">N°Etab secondaire</div>
      <div class="mf-cell mf-value">${esc(benef.mf)}</div>
      <div class="mf-cell mf-value">${esc(benef.codeTva)}</div>
      <div class="mf-cell mf-value">${esc(benef.codeCat)}</div>
      <div class="mf-cell mf-value">${esc(benef.nEtab)}</div>
    </div>
    ${benef.rib ? `<div class="info-row"><div class="info-label">RIB :</div><div class="info-value">${esc(benef.rib)}</div></div>` : ''}
  </div>

  <!-- Montants -->
  <div class="section">
    <div class="section-title">D. MONTANTS DE LA RETENUE</div>
    <table class="amount-table">
      <thead>
        <tr>
          <th style="width:35%">Nature du revenu</th>
          <th style="width:20%">Montant brut (TND)</th>
          <th style="width:15%">Taux (%)</th>
          <th style="width:15%">Montant retenu (TND)</th>
          <th style="width:15%">Montant net versé (TND)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="left">${esc(data.natureRevenu || 'Honoraires et commissions')}</td>
          <td class="right">${fmtAmount(montantBrut)}</td>
          <td style="text-align:center;font-weight:bold">${data.tauxRetenue || 1.5}%</td>
          <td class="right" style="background:#fffbe6">${fmtAmount(montantRetenu)}</td>
          <td class="right">${fmtAmount(montantNet)}</td>
        </tr>
      </tbody>
    </table>
    <div style="padding: 6px 8px; font-size: 10.5px; color:#444; border-top:1px solid #aaa;">
      Base légale : ${esc(data.baseLegale || "Art. 52 du Code de l'IRPP et de l'IS")}
      — Le montant retenu sera reversé avant le 28 du mois suivant au Receveur des Finances compétent.
    </div>
    ${data.notes ? `<div style="padding:6px 8px; font-size:11px; font-style:italic; border-top:1px solid #aaa;">Note : ${esc(data.notes)}</div>` : ''}
  </div>

  <!-- Declaration -->
  <div class="declaration">
    je soussigné, certifie exacts les renseignements figurant sur le présent certificat
    et m'expose aux sanctions par la loi pour toute inexactitude.
  </div>

  <!-- Signature -->
  <div class="signature-row">
    <div class="sig-left">A Tunis Le : ${fmtDate(data.date)}</div>
    <div class="sig-right">
      <div>Cachet &amp; signature du payeur</div>
      <div class="sig-stamp">
        ${sigHtml}
        ${stampHtml}
      </div>
      ${payeur.rep ? `<div style="margin-top:4px; font-weight:bold">${esc(payeur.rep)}</div>` : ''}
    </div>
  </div>

  <!-- Footnotes -->
  <div class="footnotes">
    <div>(1) Le certificat est délivré à l'occasion de chaque paiement. Toutefois, pour les opérations répétitives,
    le certificat peut être délivré trimestriellement.</div>
    <div style="margin-top:4px">(2) Code catégorie : M.personne morale &nbsp; C.personnes physiques "industries et commerce"
    &nbsp; P.professions libérales &nbsp; N. employeurs non soumis</div>
    <div style="margin-top:6px; text-align:right; color:#666; font-size:9px">
      Document généré par Factarlou — Conforme DGF Tunisie
    </div>
  </div>
</div>
</body>
</html>`;
}

function buildRelanceHTML(doc, company, attempt = 1) {
    const dueAmount = doc.totalTTC - (doc.paidAmount || 0);
    const today = new Date().toLocaleDateString('fr-FR');
    
    let subject, intro, body;
    if (attempt === 1) {
        subject = `Objet : Relance - Facture impayée N° ${doc.number}`;
        intro = `Madame, Monsieur,`;
        body = `Sauf erreur ou omission de notre part, le paiement de la facture N° ${doc.number} datée du ${fmtDate(doc.date)} d'un montant de ${fmt3(dueAmount)} TND, arrivée à échéance, ne nous est pas parvenu.<br><br>Nous vous prions de bien vouloir procéder à son règlement dans les meilleurs délais.<br>Si votre règlement a été effectué entre-temps, veuillez ne pas tenir compte de cette lettre.`;
    } else if (attempt === 2) {
        subject = `Objet : Deuxième Relance - Facture impayée N° ${doc.number}`;
        intro = `Madame, Monsieur,`;
        body = `Suite à notre précédente relance concernant la facture N° ${doc.number} d'un montant de ${fmt3(dueAmount)} TND, nous constatons qu'aucun règlement ne nous est parvenu à ce jour.<br><br>Nous vous demandons de bien vouloir régulariser cette situation dans les plus brefs délais afin d'éviter tout désagrément.`;
    } else {
        subject = `Objet : Mise en Demeure - Facture N° ${doc.number}`;
        intro = `Madame, Monsieur,`;
        body = `Malgré nos multiples relances, la facture N° ${doc.number} d'un montant de ${fmt3(dueAmount)} TND reste impayée à ce jour.<br><br>Par la présente, nous vous mettons en demeure de procéder au règlement sous 8 jours. À défaut, nous serons contraints de transmettre ce dossier à notre service contentieux.`;
    }

    const stampHtml = doc.stampImage ? `<img src="${doc.stampImage}" style="max-height:70px;opacity:0.9">` : '';
    const sigHtml = doc.signatureImage ? `<img src="${doc.signatureImage}" style="max-height:55px">` : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; padding: 40px; color: #333; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; margin-bottom: 50px; }
  .company-info { font-size: 13px; }
  .client-info { font-size: 14px; font-weight: bold; padding: 20px; border: 1px solid #ccc; background: #f9f9f9; width: 300px; text-align: left; }
  .date { text-align: right; margin-bottom: 30px; font-style: italic; }
  .subject { font-weight: bold; text-decoration: underline; margin-bottom: 20px; font-size: 15px; }
  .content { margin-bottom: 50px; text-align: justify; }
  .signature { text-align: right; margin-top: 50px; }
  .footer { margin-top: 100px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <strong>${esc(company?.name || doc.companyName)}</strong><br>
      ${esc(company?.address || doc.companyAddress)}<br>
      MF: ${esc(company?.mf || doc.companyMF)}
    </div>
    <div class="client-info">
      A l'attention de :<br>
      ${esc(doc.clientName)}<br>
      ${esc(doc.clientAddress)}<br>
      MF: ${esc(doc.clientMF)}
    </div>
  </div>
  
  <div class="date">Fait à Tunis, le ${today}</div>
  
  <div class="subject">${subject}</div>
  
  <div class="content">
    <p>${intro}</p>
    <p>${body}</p>
    <p>En vous remerciant par avance de faire le nécessaire, nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</p>
  </div>
  
  <div class="signature">
    <strong>La Direction</strong><br>
    <div style="margin-top:10px">${sigHtml} ${stampHtml}</div>
  </div>
  
  <div class="footer">Document généré par Factarlou</div>
</body>
</html>`;
}

function buildFiscalSummaryHTML(summary, company) {
    const today = new Date().toLocaleDateString('fr-FR');
    const period = summary.quarter ? `Trimestre ${summary.quarter} - ${summary.year}` : `Année ${summary.year}`;
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; padding: 30px; color: #222; }
  h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 5px; color: #1e3a8a; }
  h2 { text-align: center; font-size: 14px; margin-bottom: 40px; color: #555; }
  .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .box { padding: 15px; border: 1px solid #ccc; background: #f9f9f9; width: 45%; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
  th { background: #1e3a8a; color: white; }
  td.num { text-align: right; font-weight: bold; }
  .total-row td { background: #f0f0f0; font-weight: bold; font-size: 14px; }
  .footer { text-align: center; font-size: 10px; color: #777; margin-top: 50px; border-top: 1px solid #eee; padding-top: 10px; }
</style>
</head>
<body>
  <h1>Bilan Fiscal et Récapitulatif des Recettes</h1>
  <h2>Période : ${period}</h2>
  
  <div class="info">
    <div class="box">
      <strong>ENTREPRISE</strong><br>
      ${esc(company?.name)}<br>
      ${esc(company?.address)}<br>
      MF: ${esc(company?.mf)}
    </div>
    <div class="box" style="text-align:right">
      <strong>DATE D'EDITION</strong><br>
      ${today}
    </div>
  </div>

  <table>
    <tr><th colspan="2">Résumé des Opérations</th></tr>
    <tr><td>Nombre total de factures émises</td><td class="num">${summary.totalFactures}</td></tr>
    <tr><td>Factures impayées</td><td class="num">${summary.totalUnpaidFactures}</td></tr>
    <tr><td>Total Hors Taxes (HT) facturé</td><td class="num">${fmt3(summary.totalHT)} TND</td></tr>
    <tr><td>Total TVA collectée</td><td class="num">${fmt3(summary.totalTVA)} TND</td></tr>
    <tr><td>Total Droit de Timbre</td><td class="num">${fmt3(summary.totalTimbre)} TND</td></tr>
    <tr><td>Total Retenues à la Source déduites</td><td class="num">${fmt3(summary.totalRetenue)} TND</td></tr>
    <tr class="total-row"><td>Chiffre d'Affaires Global (TTC)</td><td class="num">${fmt3(summary.totalTTC)} TND</td></tr>
  </table>

  <div style="font-style:italic; font-size: 11px;">
    Ce document est un récapitulatif généré à titre indicatif pour faciliter vos déclarations fiscales.
  </div>

  <div class="footer">Document généré par Factarlou — Système de Facturation Tunisien</div>
</body>
</html>`;
}

function buildPayslipHTML(payslip, employee, company) {
    const today = new Date().toLocaleDateString('fr-FR');
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const period = `${months[payslip.period_month-1]} ${payslip.period_year}`;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche de Paie — ${esc(employee.name)} — ${period}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; line-height: 1.5; font-size: 13px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
  .title { text-align: center; margin-bottom: 30px; }
  .title h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9fafb; }
  .info-box h3 { margin-top: 0; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .num { text-align: right; }
  .total-section { display: flex; justify-content: flex-end; }
  .total-box { width: 300px; border: 2px solid #1e3a8a; padding: 15px; border-radius: 8px; background: #eff6ff; }
  .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
  .total-row.final { border-top: 1px solid #1e3a8a; padding-top: 10px; margin-top: 10px; font-weight: bold; font-size: 18px; color: #1e3a8a; }
  .footer { margin-top: 50px; font-size: 11px; color: #666; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <strong>${esc(company.name)}</strong><br>
      ${esc(company.address)}<br>
      MF: ${esc(company.mf)}
    </div>
    <div style="text-align:right">
      <strong>Bulletin de Paie</strong><br>
      Période : ${period}<br>
      Date d'édition : ${today}
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>EMPLOYÉ</h3>
      <strong>${esc(employee.name)}</strong><br>
      ${esc(employee.role || 'Salarié')}<br>
      CIN: ${esc(employee.cin || '—')}<br>
      CNSS: ${esc(employee.cnss || '—')}
    </div>
    <div class="info-box">
      <h3>DÉTAILS PÉRIODE</h3>
      Mois: ${months[payslip.period_month-1]}<br>
      Année: ${payslip.period_year}<br>
      Date de paiement: ${fmtDate(payslip.date)}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th class="num">Base / Taux</th>
        <th class="num">Gains (TND)</th>
        <th class="num">Retenues (TND)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Salaire de base</td>
        <td class="num">—</td>
        <td class="num">${fmt3(payslip.base_salary)}</td>
        <td class="num">—</td>
      </tr>
      <tr>
        <td>Indemnité de transport</td>
        <td class="num">—</td>
        <td class="num">${fmt3(payslip.transport_allowance)}</td>
        <td class="num">—</td>
      </tr>
      <tr>
        <td>Autres indemnités</td>
        <td class="num">—</td>
        <td class="num">${fmt3(payslip.other_allowances)}</td>
        <td class="num">—</td>
      </tr>
      <tr>
        <td>Cotisation CNSS</td>
        <td class="num">9.18%</td>
        <td class="num">—</td>
        <td class="num">${fmt3(payslip.cnss_deduction)}</td>
      </tr>
      <tr>
        <td>IRPP</td>
        <td class="num">Barème</td>
        <td class="num">—</td>
        <td class="num">${fmt3(payslip.irpp_deduction)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-box">
      <div class="total-row">
        <span>TOTAL BRUT</span>
        <span>${fmt3(payslip.gross_salary)}</span>
      </div>
      <div class="total-row">
        <span>TOTAL RETENUES</span>
        <span>${fmt3(payslip.cnss_deduction + payslip.irpp_deduction)}</span>
      </div>
      <div class="total-row final">
        <span>NET À PAYER</span>
        <span>${fmt3(payslip.net_salary)} TND</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Bulletin de paie généré par Factarlou — Document non contractuel
  </div>
</body>
</html>`;
}


// Constants
const TAUX_RETENUE = [
    { value: 1.5, label: '1.5% — Honoraires & commissions (personnes morales résidentes)' },
    { value: 2.5, label: '2.5% — Honoraires (personnes physiques, hors régime réel)' },
    { value: 3, label: '3%   — Loyers immobiliers / revenus fonciers' },
    { value: 5, label: '5%   — Travaux / services (non-résidents)' },
    { value: 10, label: '10%  — Dividendes / valeurs mobilières' },
    { value: 15, label: '15%  — Intérêts / capitaux mobiliers' },
    { value: 25, label: '25%  — Paiements à non-résidents (sans convention)' },
];
const NATURES_REVENU = [
    'Honoraires et commissions', 'Loyers immobiliers', 'Travaux et services',
    'Dividendes', 'Intérêts bancaires', 'Revenus de capitaux mobiliers',
    'Revenus de sources étrangères', 'Autres revenus soumis à retenue'
];
const MOIS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Helper functions
function esc(t) { if (!t) return ''; return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt3(v) { const n = parseFloat(v) || 0; return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }
function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return String(d); } }

// Export for both Node.js and browser
if (typeof window !== 'undefined') {
    window.buildRetenueHTML = buildRetenueHTML;
    window.buildRelanceHTML = buildRelanceHTML;
    window.buildFiscalSummaryHTML = buildFiscalSummaryHTML;
    window.buildPayslipHTML = buildPayslipHTML;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildRetenueHTML,
        buildRelanceHTML,
        buildFiscalSummaryHTML,
        buildPayslipHTML,
        parseMF,
        TAUX_RETENUE,
        NATURES_REVENU,
        MOIS_FR
    };
}