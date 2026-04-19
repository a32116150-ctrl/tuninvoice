/**
 * contract-builder.js
 * Generates professional Tunisian employment contract HTML for PDF export/print.
 */

export function buildContractHTML(data) {
    const today = new Date().toLocaleDateString('fr-FR');
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '___/___/______';
    const blank = (n = 30) => '_'.repeat(n);

    const typeLabels = {
        cdi: 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE (CDI)',
        cdd: 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE (CDD)',
        essai: "CONTRAT DE TRAVAIL — PÉRIODE D'ESSAI",
        prestation: 'CONTRAT DE PRESTATION DE SERVICES',
        alternance: "CONTRAT D'ALTERNANCE",
        stage: 'CONVENTION DE STAGE',
        freelance: 'CONTRAT DE TRAVAIL INDÉPENDANT (FREELANCE)',
        interim: 'CONTRAT DE MISSION INTÉRIMAIRE',
        parttime: 'CONTRAT DE TRAVAIL À TEMPS PARTIEL',
        consulting: 'CONTRAT DE CONSEIL ET CONSULTING',
    };

    const typeLabel = typeLabels[data.type] || data.type?.toUpperCase() || 'CONTRAT DE TRAVAIL';

    // Build clause body based on contract type
    const clauseBody = buildClauses(data, formatDate, blank);

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 30mm 25mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13px;
    color: #111;
    line-height: 1.8;
    background: #fff;
}
.contract-header {
    text-align: center;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 2px solid #111;
}
.contract-title {
    font-size: 17px;
    font-weight: bold;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
}
.contract-number {
    font-size: 12px;
    color: #555;
}
.section {
    margin-bottom: 22px;
}
.section-title {
    font-size: 13px;
    font-weight: bold;
    text-transform: uppercase;
    border-bottom: 1px solid #aaa;
    padding-bottom: 4px;
    margin-bottom: 10px;
    letter-spacing: 0.3px;
}
.article {
    margin-bottom: 14px;
}
.article-title {
    font-weight: bold;
    margin-bottom: 4px;
}
p { margin-bottom: 8px; }
.signature-section {
    margin-top: 48px;
    display: flex;
    justify-content: space-between;
}
.sig-block {
    width: 45%;
    text-align: center;
}
.sig-line {
    border-top: 1px solid #333;
    margin-top: 60px;
    padding-top: 6px;
    font-size: 12px;
}
.footer-note {
    margin-top: 32px;
    font-size: 11px;
    color: #666;
    text-align: center;
    border-top: 1px solid #ddd;
    padding-top: 12px;
}
.highlight { background: #f9f9f9; padding: 2px 4px; }
ul { margin: 6px 0 6px 24px; }
li { margin-bottom: 4px; }
</style>
</head>
<body>

<div class="contract-header">
    ${data.employerLogo ? `<img src="${data.employerLogo}" style="max-height:60px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto">` : ''}
    <div class="contract-title">${typeLabel}</div>
    <div class="contract-number">Référence : ${data.number || blank(15)} &nbsp;|&nbsp; Date : ${today}</div>
</div>

<div class="section">
    <div class="section-title">Entre les soussignés</div>

    <div class="article">
        <div class="article-title">L'Employeur :</div>
        <p>La société <strong>${data.employerName || blank(25)}</strong>, immatriculée sous le Matricule Fiscal N° <strong>${data.employerMF || blank(20)}</strong>, dont le siège social est situé à <strong>${data.employerAddress || blank(35)}</strong>, représentée par <strong>${data.employerRep || blank(20)}</strong>, en qualité de <strong>${data.employerRepRole || blank(15)}</strong>, ci-après dénommée « <em>l'Employeur</em> ».</p>
    </div>

    <div class="article">
        <div class="article-title">Le Salarié / Le Prestataire :</div>
        <p>Monsieur / Madame <strong>${data.employeeName || blank(25)}</strong>, titulaire de la CIN N° <strong>${data.employeeCIN || blank(15)}</strong>, demeurant à <strong>${data.employeeAddress || blank(35)}</strong>, ci-après dénommé(e) « <em>le Salarié</em> ».</p>
    </div>
</div>

${clauseBody}

${data.extraClauses ? `
<div class="section">
    <div class="section-title">Clauses particulières</div>
    <div class="article">
        <p style="white-space:pre-wrap">${data.extraClauses}</p>
    </div>
</div>` : ''}

<div class="section">
    <div class="section-title">Dispositions générales</div>
    <p>Le présent contrat est régi par les dispositions du Code du Travail tunisien et de la Convention Collective sectorielle applicable. En cas de litige, les parties s'engagent à recourir à la conciliation avant tout contentieux judiciaire. Les tribunaux compétents de <strong>${data.workLocation || 'Tunis'}</strong> seront seuls compétents.</p>
    <p>Ce contrat est établi en deux (2) exemplaires originaux, chaque partie reconnaissant en avoir reçu un.</p>
</div>

<div class="signature-section">
    <div class="sig-block">
        <div>Pour l'Employeur</div>
        <div style="font-size:12px;color:#555">${data.employerName || ''}</div>
        <div class="sig-line">Signature et cachet</div>
    </div>
    <div class="sig-block">
        <div>Le Salarié</div>
        <div style="font-size:12px;color:#555">${data.employeeName || ''}</div>
        <div class="sig-line">Signature précédée de « Lu et approuvé »</div>
    </div>
</div>

<div class="footer-note">
    Ce document a valeur contractuelle une fois signé par les deux parties.
</div>

</body>
</html>`;
}

function buildClauses(data, formatDate, blank) {
    const type = data.type;
    const salary = data.salary ? `${parseFloat(data.salary).toFixed(3)} TND` : blank(12);
    const salaryPeriod = { mensuel: 'par mois', hebdomadaire: 'par semaine', journalier: 'par jour', horaire: 'par heure' }[data.salaryType] || 'par mois';
    const workHours = data.workHours || 40;

    // Common articles shared by most employment contracts
    const articlePoste = `
<div class="article">
    <div class="article-title">Article 1 — Engagement et Poste</div>
    <p>L'Employeur engage le Salarié en qualité de <strong>${data.employeeRole || blank(20)}</strong>${data.employeeDepartment ? `, au sein du département <strong>${data.employeeDepartment}</strong>` : ''}, à compter du <strong>${formatDate(data.startDate)}</strong>.</p>
</div>`;

    const articleHoraire = `
<div class="article">
    <div class="article-title">Article 3 — Durée et Horaires de Travail</div>
    <p>La durée hebdomadaire de travail est fixée à <strong>${workHours} heures</strong> conformément à la législation tunisienne en vigueur. Le lieu de travail principal est : <strong>${data.workLocation || blank(25)}</strong>.</p>
</div>`;

    const articleSalaire = `
<div class="article">
    <div class="article-title">Article 4 — Rémunération</div>
    <p>Le Salarié percevra une rémunération brute de <strong>${salary}</strong> ${salaryPeriod}, payable à terme échu. Cette rémunération inclut tous les avantages en nature le cas échéant. Elle est susceptible d'être révisée annuellement.</p>
</div>`;

    const articleObligations = `
<div class="article">
    <div class="article-title">Article 5 — Obligations des Parties</div>
    <p>Le Salarié s'engage à :</p>
    <ul>
        <li>Exercer ses fonctions avec diligence et loyauté ;</li>
        <li>Respecter le règlement intérieur et les instructions de l'Employeur ;</li>
        <li>Conserver la confidentialité des informations de l'entreprise ;</li>
        <li>Informer l'Employeur de tout empêchement dans les meilleurs délais.</li>
    </ul>
</div>`;

    const articleConge = `
<div class="article">
    <div class="article-title">Article 6 — Congés</div>
    <p>Le Salarié bénéficiera des congés payés légaux conformément au Code du Travail tunisien, soit un jour ouvrable par mois de travail effectif (minimum 15 jours ouvrables par an).</p>
</div>`;

    const articleResiliation = (noticePeriod) => `
<div class="article">
    <div class="article-title">Article 7 — Résiliation</div>
    <p>Chaque partie peut mettre fin au présent contrat moyennant un préavis de <strong>${noticePeriod || blank(10)}</strong>, sauf faute grave ou force majeure. La rupture doit être notifiée par écrit.</p>
</div>`;

    switch (type) {
        case 'cdi':
            return `
<div class="section">
    <div class="section-title">Conditions d'Engagement</div>
    ${articlePoste}
    <div class="article">
        <div class="article-title">Article 2 — Durée du Contrat</div>
        <p>Le présent contrat est conclu pour une <strong>durée indéterminée</strong> à compter du <strong>${formatDate(data.startDate)}</strong>.</p>
        ${data.trialPeriod ? `<p>Il est prévu une période d'essai de <strong>${data.trialDuration || blank(10)}</strong> renouvelable une fois selon la législation en vigueur.</p>` : ''}
    </div>
    ${articleHoraire}
    ${articleSalaire}
    ${articleObligations}
    ${articleConge}
    ${articleResiliation(data.noticePeriod)}
</div>`;

        case 'cdd':
            return `
<div class="section">
    <div class="section-title">Conditions d'Engagement</div>
    ${articlePoste}
    <div class="article">
        <div class="article-title">Article 2 — Durée du Contrat</div>
        <p>Le présent contrat est conclu pour une <strong>durée déterminée</strong> du <strong>${formatDate(data.startDate)}</strong> au <strong>${formatDate(data.endDate)}</strong>. À l'échéance du terme, le contrat prend fin de plein droit sans indemnité, sauf renouvellement expressément convenu.</p>
        <p><strong>Motif de recours au CDD :</strong> Accroissement temporaire d'activité / Remplacement d'un salarié absent / Travaux saisonniers.</p>
    </div>
    ${articleHoraire}
    ${articleSalaire}
    ${articleObligations}
    ${articleConge}
    <div class="article">
        <div class="article-title">Article 7 — Fin du Contrat</div>
        <p>Le présent contrat prend fin à son terme sans qu'il soit nécessaire de donner congé. En cas de rupture anticipée sans motif légitime, la partie responsable devra indemniser l'autre pour le préjudice subi.</p>
    </div>
</div>`;

        case 'essai':
            return `
<div class="section">
    <div class="section-title">Conditions de la Période d'Essai</div>
    ${articlePoste}
    <div class="article">
        <div class="article-title">Article 2 — Durée de la Période d'Essai</div>
        <p>Le présent engagement est conclu à titre d'essai pour une durée de <strong>${data.trialDuration || blank(10)}</strong> à compter du <strong>${formatDate(data.startDate)}</strong> jusqu'au <strong>${formatDate(data.endDate)}</strong>.</p>
        <p>Durant cette période, chaque partie pourra mettre fin à l'engagement à tout moment, sans préavis ni indemnité, sauf dispositions plus favorables prévues par la convention collective applicable.</p>
        <p>À l'issue de la période d'essai et en l'absence de notification contraire, le Salarié sera considéré comme définitivement embauché et un contrat à durée indéterminée lui sera proposé.</p>
    </div>
    ${articleHoraire}
    ${articleSalaire}
    ${articleObligations}
</div>`;

        case 'prestation':
            return `
<div class="section">
    <div class="section-title">Objet et Conditions de la Prestation</div>
    <div class="article">
        <div class="article-title">Article 1 — Objet du Contrat</div>
        <p>Le présent contrat a pour objet la réalisation par le Prestataire de la mission suivante : <strong>${data.employeeRole || blank(40)}</strong>.</p>
        <p>Le Prestataire interviendra en toute indépendance et ne se trouvera pas dans un lien de subordination juridique vis-à-vis du Client.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 2 — Durée de la Mission</div>
        <p>La mission débutera le <strong>${formatDate(data.startDate)}</strong> et se terminera le <strong>${formatDate(data.endDate)}</strong>, sauf renouvellement convenu par avenant.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 3 — Rémunération</div>
        <p>En contrepartie des prestations réalisées, le Client versera au Prestataire la somme de <strong>${salary}</strong> ${salaryPeriod}, sur présentation d'une facture conforme. Le règlement sera effectué par virement bancaire dans un délai de 30 jours.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 4 — Propriété Intellectuelle</div>
        <p>Toutes les créations, travaux et livrables produits dans le cadre de cette mission seront la propriété exclusive du Client dès règlement intégral des factures correspondantes.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 5 — Confidentialité</div>
        <p>Le Prestataire s'engage à ne divulguer aucune information confidentielle obtenue dans le cadre de la présente mission, pendant toute sa durée et pour une période de 2 ans après son terme.</p>
    </div>
    ${articleResiliation(data.noticePeriod)}
</div>`;

        case 'stage':
            return `
<div class="section">
    <div class="section-title">Conditions du Stage</div>
    <div class="article">
        <div class="article-title">Article 1 — Objet et Lieu du Stage</div>
        <p>La présente convention a pour objet un stage de formation pratique au sein de l'entreprise <strong>${data.employerName || blank(20)}</strong>, dans le département <strong>${data.employeeDepartment || blank(15)}</strong>.</p>
        <p>Le(la) stagiaire sera encadré(e) dans le cadre de ses études à ${blank(25)}.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 2 — Durée du Stage</div>
        <p>Le stage se déroulera du <strong>${formatDate(data.startDate)}</strong> au <strong>${formatDate(data.endDate)}</strong>.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 3 — Gratification</div>
        <p>${data.salary ? `Le(la) stagiaire percevra une gratification mensuelle de <strong>${salary}</strong>.` : "Le présent stage n'est pas rémunéré / La gratification sera fixée conformément à la réglementation en vigueur."}</p>
    </div>
    <div class="article">
        <div class="article-title">Article 4 — Obligations de l'Entreprise</div>
        <ul>
            <li>Accueillir le(la) stagiaire et lui fournir les moyens nécessaires ;</li>
            <li>Désigner un tuteur pour encadrer et évaluer le stagiaire ;</li>
            <li>Délivrer une attestation de stage à l'issue de la période ;</li>
            <li>Assurer la confidentialité des données personnelles du stagiaire.</li>
        </ul>
    </div>
    <div class="article">
        <div class="article-title">Article 5 — Obligations du Stagiaire</div>
        <ul>
            <li>Respecter le règlement intérieur de l'entreprise ;</li>
            <li>Observer les règles de confidentialité ;</li>
            <li>Rédiger un rapport de stage à l'issue de la mission.</li>
        </ul>
    </div>
</div>`;

        case 'freelance':
        case 'consulting':
            return `
<div class="section">
    <div class="section-title">Conditions de la Mission</div>
    <div class="article">
        <div class="article-title">Article 1 — Mission et Livrables</div>
        <p>Le Consultant / Freelance est mandaté pour réaliser la mission suivante : <strong>${data.employeeRole || blank(40)}</strong>.</p>
        <p>Les livrables attendus seront définis dans un cahier des charges annexé au présent contrat.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 2 — Durée</div>
        <p>Du <strong>${formatDate(data.startDate)}</strong> au <strong>${formatDate(data.endDate)}</strong>, renouvelable par tacite reconduction sauf dénonciation écrite.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 3 — Honoraires</div>
        <p>Les honoraires sont fixés à <strong>${salary}</strong> ${salaryPeriod}, payables sur facture dans un délai de 30 jours nets.</p>
    </div>
    <div class="article">
        <div class="article-title">Article 4 — Indépendance et Exclusivité</div>
        <p>Le Consultant agit en qualité de travailleur indépendant. Il est libre d'exercer d'autres activités sauf clause d'exclusivité expressément stipulée.</p>
        ${data.extraClauses?.includes('exclusivité') ? '<p><strong>Clause d\'exclusivité :</strong> Pour la durée du présent contrat, le Consultant s\'engage à ne pas travailler pour des concurrents directs.</p>' : ''}
    </div>
    <div class="article">
        <div class="article-title">Article 5 — Confidentialité et Propriété Intellectuelle</div>
        <p>Toutes les informations partagées sont confidentielles. Les livrables sont cédés au Client après paiement intégral.</p>
    </div>
    ${articleResiliation(data.noticePeriod)}
</div>`;

        case 'parttime':
            return `
<div class="section">
    <div class="section-title">Conditions d'Engagement à Temps Partiel</div>
    ${articlePoste}
    <div class="article">
        <div class="article-title">Article 2 — Durée et Organisation du Travail</div>
        <p>Le présent contrat est conclu pour une durée <strong>indéterminée</strong> à compter du <strong>${formatDate(data.startDate)}</strong>.</p>
        <p>La durée hebdomadaire de travail est fixée à <strong>${workHours} heures</strong> (temps partiel), réparties comme suit : ${blank(30)}.</p>
        <p>Les heures complémentaires pourront être effectuées dans les limites légales (1/3 de la durée contractuelle).</p>
    </div>
    ${articleSalaire}
    ${articleObligations}
    ${articleConge}
    ${articleResiliation(data.noticePeriod)}
</div>`;

        default: // alternance, interim, and generic
            return `
<div class="section">
    <div class="section-title">Conditions d'Engagement</div>
    ${articlePoste}
    <div class="article">
        <div class="article-title">Article 2 — Durée</div>
        <p>Du <strong>${formatDate(data.startDate)}</strong> au <strong>${data.endDate ? `<strong>${formatDate(data.endDate)}</strong>` : '(durée indéterminée)'}</strong>.</p>
    </div>
    ${articleHoraire}
    ${articleSalaire}
    ${articleObligations}
    ${articleConge}
    ${articleResiliation(data.noticePeriod)}
</div>`;
    }
}