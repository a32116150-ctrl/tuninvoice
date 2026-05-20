const fs = require('fs');

const appJsPath = 'src/renderer/app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

const emojiMap = {
    '📊': '<i data-lucide="layout-dashboard" class="lucide-sm"></i>',
    '➕': '<i data-lucide="plus-circle" class="lucide-sm"></i>',
    '📄': '<i data-lucide="file-text" class="lucide-sm"></i>',
    '👥': '<i data-lucide="users" class="lucide-sm"></i>',
    '🛍️': '<i data-lucide="shopping-bag" class="lucide-sm"></i>',
    '🏢': '<i data-lucide="building" class="lucide-sm"></i>',
    '📃': '<i data-lucide="file-signature" class="lucide-sm"></i>',
    '🧑‍💼': '<i data-lucide="briefcase" class="lucide-sm"></i>',
    '🛒': '<i data-lucide="shopping-cart" class="lucide-sm"></i>',
    '🧾': '<i data-lucide="receipt" class="lucide-sm"></i>',
    '🧰': '<i data-lucide="wrench" class="lucide-sm"></i>',
    '🔁': '<i data-lucide="repeat" class="lucide-sm"></i>',
    '📉': '<i data-lucide="trending-down" class="lucide-sm"></i>',
    '📦': '<i data-lucide="package" class="lucide-sm"></i>',
    '⚙️': '<i data-lucide="settings" class="lucide-sm"></i>',
    '🚪': '<i data-lucide="log-out" class="lucide-sm"></i>',
    '☀️': '<i data-lucide="sun" class="lucide-sm"></i>',
    '🌙': '<i data-lucide="moon" class="lucide-sm"></i>',
    '🔍': '<i data-lucide="search" class="lucide-sm"></i>',
    '📅': '<i data-lucide="calendar" class="lucide-sm"></i>',
    '💰': '<i data-lucide="coins" class="lucide-sm"></i>',
    '⚠️': '<i data-lucide="alert-triangle" class="lucide-sm"></i>',
    '📈': '<i data-lucide="trending-up" class="lucide-sm"></i>',
    '⚡': '<i data-lucide="zap" class="lucide-sm"></i>',
    '📋': '<i data-lucide="clipboard-list" class="lucide-sm"></i>',
    '👤': '<i data-lucide="user" class="lucide-sm"></i>',
    '🍩': '<i data-lucide="pie-chart" class="lucide-sm"></i>',
    '🕐': '<i data-lucide="clock" class="lucide-sm"></i>',
    '🏆': '<i data-lucide="award" class="lucide-sm"></i>',
    '🚚': '<i data-lucide="truck" class="lucide-sm"></i>',
    '📥': '<i data-lucide="inbox" class="lucide-sm"></i>',
    '📤': '<i data-lucide="upload" class="lucide-sm"></i>',
    '↩️': '<i data-lucide="undo-2" class="lucide-sm"></i>',
    '🎲': '<i data-lucide="dices" class="lucide-sm"></i>',
    '🔄': '<i data-lucide="refresh-cw" class="lucide-sm"></i>',
    '👁️': '<i data-lucide="eye" class="lucide-sm"></i>',
    '✏️': '<i data-lucide="edit" class="lucide-sm"></i>',
    '🗑️': '<i data-lucide="trash-2" class="lucide-sm"></i>',
    '💾': '<i data-lucide="save" class="lucide-sm"></i>',
    '🎓': '<i data-lucide="graduation-cap" class="lucide-sm"></i>',
    '🏫': '<i data-lucide="school" class="lucide-sm"></i>',
    '💻': '<i data-lucide="laptop" class="lucide-sm"></i>',
    '⏱️': '<i data-lucide="timer" class="lucide-sm"></i>',
    '⏰': '<i data-lucide="clock" class="lucide-sm"></i>',
    '🤝': '<i data-lucide="handshake" class="lucide-sm"></i>',
    '🔒': '<i data-lucide="lock" class="lucide-sm"></i>',
    '📝': '<i data-lucide="edit-3" class="lucide-sm"></i>',
    '🔑': '<i data-lucide="key" class="lucide-sm"></i>',
    '🚀': '<i data-lucide="rocket" class="lucide-sm"></i>',
    '🛑': '<i data-lucide="octagon" class="lucide-sm"></i>',
    '✅': '<i data-lucide="check-circle" class="lucide-sm"></i>',
    '❌': '<i data-lucide="x-circle" class="lucide-sm"></i>',
    'ℹ️': '<i data-lucide="info" class="lucide-sm"></i>',
    '🖼️': '<i data-lucide="image" class="lucide-sm"></i>',
    '📞': '<i data-lucide="phone" class="lucide-sm"></i>',
    '✉': '<i data-lucide="mail" class="lucide-sm"></i>',
    '💡': '<i data-lucide="lightbulb" class="lucide-sm"></i>',
    '👋': '<i data-lucide="hand" class="lucide-sm"></i>',
    '🔔': '<i data-lucide="bell" class="lucide-sm"></i>',
    '👑': '<i data-lucide="crown" class="lucide-sm"></i>',
    '🇹🇳': '<i data-lucide="flag" class="lucide-sm"></i>',
    '📜': '<i data-lucide="scroll" class="lucide-sm"></i>',
    '✨': '<i data-lucide="sparkles" class="lucide-sm"></i>'
};

for (const [emoji, icon] of Object.entries(emojiMap)) {
    content = content.split(emoji).join(icon);
}

// Add lucide.createIcons() to DOMContentLoaded
if (!content.includes('lucide.createIcons()')) {
    content = content.replace("initTheme();", "initTheme();\n    if(window.lucide) { lucide.createIcons(); }");
}
// For any dynamically created html, we might need an observer or call it after render.
// I will just add a global re-render function hook.
if (!content.includes('function refreshIcons()')) {
    content += `\nwindow.refreshIcons = function() { if(window.lucide) lucide.createIcons(); };\n`;
}
// Add refreshIcons to the ends of rendering functions
content = content.replace(/renderRecentDocs\([^)]*\)\s*{[\s\S]*?}/, match => match + '\n    if(window.refreshIcons) window.refreshIcons();');
content = content.replace(/renderTopClients\([^)]*\)\s*{[\s\S]*?}/, match => match + '\n    if(window.refreshIcons) window.refreshIcons();');
content = content.replace(/renderRecentActivity\([^)]*\)\s*{[\s\S]*?}/, match => match + '\n    if(window.refreshIcons) window.refreshIcons();');

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Replaced emojis in app.js');
