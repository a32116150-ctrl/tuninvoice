const fs = require('fs');
const path = 'src/renderer/app.js';
let content = fs.readFileSync(path, 'utf8');

// Replace .textContent = ...<i>... with .innerHTML = ...
content = content.replace(/\.textContent\s*=\s*(['"`].*?<i data-lucide.*?['"`])/g, '.innerHTML = $1');

// Add lucide.createIcons() after assignments to .innerHTML that contain lucide icons
// This version is simpler and more robust
const lines = content.split('\n');
const newLines = lines.map(line => {
    if (line.includes('.innerHTML =') && line.includes('data-lucide') && !line.includes('lucide.createIcons()')) {
        return line.replace(/;(\s*)$/, '; if (window.lucide) lucide.createIcons();$1');
    }
    return line;
});

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Fixed icon rendering in headers and buttons.');
