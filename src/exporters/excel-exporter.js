const XLSX = require('xlsx');

class ExcelExporter {
    exportDocument(document, filePath) {
        const wb = XLSX.utils.book_new();

        // Info sheet
        const infoData = [
            ['Factarlou - Export'],
            [],
            ['Type', document.type.toUpperCase()],
            ['Numéro', document.number],
            ['Date', document.date],
            ['Client', document.clientName],
            ['Total HT', document.totalHT],
            ['Total TTC', document.totalTTC],
            ['Devise', document.currency]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoData), 'Informations');

        // Items sheet
        const itemsData = [['N°', 'Description', 'Quantité', 'Prix Unitaire HT', 'TVA %', 'Total HT']];
        document.items.forEach((item, idx) => {
            itemsData.push([idx + 1, item.description, item.quantity, item.price, item.tva + '%', item.total]);
        });
        itemsData.push([], ['', '', '', '', 'Total HT:', document.totalHT]);
        itemsData.push(['', '', '', '', 'Total TTC:', document.totalTTC]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemsData), 'Articles');

        // Company sheet
        const companyData = [
            ['Entreprise'],
            ['Nom', document.companyName],
            ['MF', document.companyMF],
            ['Adresse', document.companyAddress],
            ['Téléphone', document.companyPhone],
            ['Email', document.companyEmail],
            ['RC', document.companyRC]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(companyData), 'Entreprise');

        XLSX.writeFile(wb, filePath);
        return filePath;
    }

    exportMultipleDocuments(documents, filePath) {
        const wb = XLSX.utils.book_new();
        const data = [['Type', 'Numéro', 'Date', 'Client', 'Total HT', 'Total TTC', 'Devise']];
        
        documents.forEach(doc => {
            data.push([doc.type, doc.number, doc.date, doc.clientName, doc.totalHT, doc.totalTTC, doc.currency]);
        });

        const totalHT = documents.reduce((sum, d) => sum + d.totalHT, 0);
        const totalTTC = documents.reduce((sum, d) => sum + d.totalTTC, 0);
        data.push([], ['TOTAL GENERAL', '', '', '', totalHT, totalTTC, '']);

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Documents');
        XLSX.writeFile(wb, filePath);
        return filePath;
    }

    exportClients(clients, filePath) {
        const wb = XLSX.utils.book_new();
        const data = [['Nom', 'MF', 'Adresse', 'Téléphone', 'Email', 'Date création']];
        
        clients.forEach(client => {
            data.push([client.name, client.mf || '', client.address || '', client.phone || '', client.email || '', client.created_at]);
        });

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Clients');
        XLSX.writeFile(wb, filePath);
        return filePath;
    }
}

module.exports = ExcelExporter;