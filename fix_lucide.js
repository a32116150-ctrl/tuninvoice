const fs = require('fs');
const path = 'src/renderer/app.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add lucide.createIcons() to all render...Table functions
const tableFunctions = [
    'renderServicesTable',
    'renderDocumentsTable',
    'renderClientsTable',
    'renderContractsTable',
    'renderRetenuesTable',
    'renderExpensesTable',
    'renderEmployeesTable',
    'renderPayslipsTable'
];

tableFunctions.forEach(fn => {
    // Find the closing brace of the function
    const regex = new RegExp(`function ${fn}\\s*\\([^\\)]*\\)\\s*{[\\s\\S]*?container\\.innerHTML\\s*=\\s*\`[\\s\\S]*?\`;`, 'g');
    content = content.replace(regex, (match) => {
        if (!match.includes('lucide.createIcons')) {
            return match + '\n    if (window.lucide) lucide.createIcons();';
        }
        return match;
    });
});

// 2. Fix textContent = ...icon... to innerHTML
content = content.replace(/\.textContent\s*=\s*(\`|'|")([^'"`]*?<i data-lucide=[^'"`]*?>[^'"`]*?)(\`|'|")/g, '.innerHTML = $1$2$3');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Lucide initialization and innerHTML in app.js');
