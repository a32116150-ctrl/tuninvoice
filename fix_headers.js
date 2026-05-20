const fs = require('fs');
const path = 'src/renderer/app.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace textContent with innerHTML when it contains lucide icons
content = content.replace(/\.textContent\s*=\s*(\`|'|")([^'"`]*?<i data-lucide=[^'"`]*?>[^'"`]*?)(\`|'|")/g, '.innerHTML = $1$2$3');

// 2. Ensure lucide.createIcons() is called after setting innerHTML for titles or buttons
// Find lines that set innerHTML with an icon but don't have createIcons following them
content = content.replace(/\.innerHTML\s*=\s*(\`|'|")[^'"`]*?<i data-lucide=[^'"`]*?>[^'"`]*?(\`|'|");(?!\s*if\s*\(window\.lucide\)\s*lucide\.createIcons\(\);)/g, (match) => {
    return match + ' if (window.lucide) lucide.createIcons();';
});

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed icon rendering in headers and buttons.');
