const fs = require('fs');
const path = require('path');

function replaceInlineHandlers(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace onclick="...", onchange="...", onsubmit="..."
    // Be careful with nested quotes.
    content = content.replace(/\bonclick="/g, 'data-onclick="');
    content = content.replace(/\bonclick='/g, "data-onclick='");
    
    content = content.replace(/\bonchange="/g, 'data-onchange="');
    content = content.replace(/\bonchange='/g, "data-onchange='");
    
    content = content.replace(/\bonsubmit="/g, 'data-onsubmit="');
    content = content.replace(/\bonsubmit='/g, "data-onsubmit='");

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${filePath}`);
}

const dir = path.join(__dirname, 'src/renderer');
['index.html', 'app-features.js', 'app-auth.js'].forEach(file => {
    replaceInlineHandlers(path.join(dir, file));
});

console.log("Done.");
