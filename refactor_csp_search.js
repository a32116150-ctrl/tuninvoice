const fs = require('fs');
const path = require('path');

function replaceInputHandlers(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace oninput="..." and onkeyup="..."
    content = content.replace(/\boninput="/g, 'data-oninput="');
    content = content.replace(/\boninput='/g, "data-oninput='");
    
    content = content.replace(/\bonkeyup="/g, 'data-onkeyup="');
    content = content.replace(/\bonkeyup='/g, "data-onkeyup='");
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${filePath}`);
}

const dir = path.join(__dirname, 'src/renderer');
replaceInputHandlers(path.join(dir, 'index.html'));
console.log("Done.");
