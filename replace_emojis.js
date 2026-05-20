const fs = require('fs');

const indexHtmlPath = 'src/renderer/index.html';
let content = fs.readFileSync(indexHtmlPath, 'utf8');

const emojiMap = {
    '📊': '<i data-lucide="layout-dashboard"></i>',
    '➕': '<i data-lucide="plus-circle"></i>',
    '📄': '<i data-lucide="file-text"></i>',
    '👥': '<i data-lucide="users"></i>',
    '🛍️': '<i data-lucide="shopping-bag"></i>',
    '🏢': '<i data-lucide="building"></i>',
    '📃': '<i data-lucide="file-signature"></i>',
    '🧑‍💼': '<i data-lucide="briefcase"></i>',
    '🛒': '<i data-lucide="shopping-cart"></i>',
    '🧾': '<i data-lucide="receipt"></i>',
    '🧰': '<i data-lucide="wrench"></i>',
    '🔁': '<i data-lucide="repeat"></i>',
    '📉': '<i data-lucide="trending-down"></i>',
    '📦': '<i data-lucide="package"></i>',
    '⚙️': '<i data-lucide="settings"></i>',
    '🚪': '<i data-lucide="log-out"></i>',
    '☀️': '<i data-lucide="sun"></i>',
    '🌙': '<i data-lucide="moon"></i>',
    '🔍': '<i data-lucide="search"></i>',
    '📅': '<i data-lucide="calendar"></i>',
    '💰': '<i data-lucide="coins"></i>',
    '⚠️': '<i data-lucide="alert-triangle"></i>',
    '📈': '<i data-lucide="trending-up"></i>',
    '⚡': '<i data-lucide="zap"></i>',
    '📋': '<i data-lucide="clipboard-list"></i>',
    '👤': '<i data-lucide="user"></i>',
    '🍩': '<i data-lucide="pie-chart"></i>',
    '🕐': '<i data-lucide="clock"></i>',
    '🏆': '<i data-lucide="award"></i>',
    '🚚': '<i data-lucide="truck"></i>',
    '📥': '<i data-lucide="inbox"></i>',
    '📤': '<i data-lucide="upload"></i>',
    '↩️': '<i data-lucide="undo-2"></i>',
    '🎲': '<i data-lucide="dices"></i>',
    '🔄': '<i data-lucide="refresh-cw"></i>',
    '👁️': '<i data-lucide="eye"></i>',
    '✏️': '<i data-lucide="edit"></i>',
    '🗑️': '<i data-lucide="trash-2"></i>',
    '💾': '<i data-lucide="save"></i>',
    '🎓': '<i data-lucide="graduation-cap"></i>',
    '🏫': '<i data-lucide="school"></i>',
    '💻': '<i data-lucide="laptop"></i>',
    '⏱️': '<i data-lucide="timer"></i>',
    '⏰': '<i data-lucide="clock"></i>',
    '🤝': '<i data-lucide="handshake"></i>',
    '🔒': '<i data-lucide="lock"></i>',
    '📝': '<i data-lucide="edit-3"></i>',
    '🔑': '<i data-lucide="key"></i>',
    '🚀': '<i data-lucide="rocket"></i>',
    '🛑': '<i data-lucide="octagon"></i>',
    '✅': '<i data-lucide="check-circle"></i>',
    '❌': '<i data-lucide="x-circle"></i>',
    'ℹ️': '<i data-lucide="info"></i>',
    '🖼️': '<i data-lucide="image"></i>',
    '📞': '<i data-lucide="phone"></i>',
    '✉': '<i data-lucide="mail"></i>',
    '💡': '<i data-lucide="lightbulb"></i>',
    '👋': '<i data-lucide="hand"></i>'
};

for (const [emoji, icon] of Object.entries(emojiMap)) {
    // Replace all occurrences
    content = content.split(emoji).join(icon);
}

// Add script tag for lucide.min.js at the end of body if not exists
if (!content.includes('lucide.min.js')) {
    content = content.replace('</body>', '    <script src="lucide.min.js"></script>\n</body>');
}

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('Replaced emojis with Lucide icons in index.html');
