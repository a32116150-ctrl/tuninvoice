const fs = require('fs');

class CSVExporter {
    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    convertToCSV(data, headers) {
        const lines = [headers.join(',')];
        data.forEach(row => {
            lines.push(headers.map(h => this.escapeCSV(row[h])).join(','));
        });
        return lines.join('\n');
    }

    exportDocument(document, filePath) {
        const itemsHeaders = ['n', 'description', 'quantity', 'price', 'tva', 'total'];
        const itemsCSV = this.convertToCSV(document.items.map((item, idx) => ({
            n: idx + 1, description: item.description, quantity: item.quantity,
            price: item.price, tva: item.tva, total: item.total
        })), itemsHeaders);

        const summaryHeaders = ['field', 'value'];
        const summaryData = [
            { field: 'Type', value: document.type },
            { field: 'Numero', value: document.number },
            { field: 'Date', value: document.date },
            { field: 'Client', value: document.clientName },
            { field: 'Total HT', value: document.totalHT },
            { field: 'Total TTC', value: document.totalTTC }
        ];
        const summaryCSV = this.convertToCSV(summaryData, summaryHeaders);

        fs.writeFileSync(filePath, `# RESUME\n${summaryCSV}\n\n# ARTICLES\n${itemsCSV}`, 'utf8');
        return filePath;
    }
}

module.exports = CSVExporter;