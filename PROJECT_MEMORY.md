# Factarlou (TuniInvoice Pro) - Project Memory

## Project Overview
- **App Name**: Factarlou (Product Name) / TuniInvoice Pro (Internal Name)
- **Version**: 2.6.3
- **Description**: A comprehensive, high-performance desktop application tailored for the Tunisian market to manage invoicing, taxation (Retenue), and business operations.
- **Tech Stack**: 
  - **Framework**: Electron (v28+)
  - **Database**: SQLite (`better-sqlite3`) for robust local data storage.
  - **OCR Engine**: `Tesseract.js` for scanning and text extraction.
  - **Logic**: Node.js / Modern JavaScript.
  - **Styling**: Premium vanilla CSS design system with custom properties, refined shadows, smooth transitions, and hover/active micro-interactions.
  - **Icons**: Lucide SVG icons for consistent, crisp rendering across the entire UI.

## Premium Design Overhaul — Phase 1 (2026-05-19)

### CSS UI/UX Enhancement
- **Approach**: CSS-only for visual design; HTML/JS changes limited to emoji→Lucide icon replacement and bug fixes.
- **Inspiration**: Open Design generated design system (`colors_and_type.css`) used as visual reference.
- **Scope**: 22+ component groups enhanced across auth, sidebar, topbar, pages, cards, tables, buttons, forms, modals, preview, and all interactive elements.
- **Key Improvements**: Premium shadows, gradient accents, hover lift effects, active state indicators, page transitions, consistent Lucide icon styling, and refined typography.
- **See**: `PROJECT_MEMORY.md → Premium Design Enhancement` section for full details.

---

## Bug Fixes & Icon Consolidation (2026-05-19)

### 1. Login Crash Fix — `initTheme()` null reference
- `initTheme()` called `document.getElementById('themeToggleBtn').innerHTML` on a non-existent element, throwing a TypeError that prevented the auth auto-login check in `DOMContentLoaded`.
- **Fix**: Added null guards (`if (toggleBtn)`) to `initTheme()` and `toggleTheme()`.

### 2. Raw HTML in Confirm Modal — `textContent` vs `innerHTML`
- The `confirmLogout()` function passed Lucide HTML (`<i data-lucide="log-out">`) as the modal title, but `showConfirm()` used `.textContent` (plain text), rendering the tag as raw text.
- **Fix**: Changed `.textContent` to `.innerHTML` and added `lucide.createIcons()` call in `showConfirm()`.

### 3. Comprehensive Emoji → Lucide Icon Replacement
- Replaced all emoji icon characters with Lucide SVG icons across `index.html` and `app.js` for a consistent, premium visual language:
  - **Outils page**: 🧮📨🆔⚖️🏛️ → `calculator`/`send`/`fingerprint`/`scale`/`landmark`
  - **Settings page**: 🔢🎨📜✨👑🇹🇳🏗️ → `list`/`palette`/`scroll`/`sparkles`/`crown`/`flag`/`layout`
  - **HR page**: 💸 → `wallet`
  - **Modals**: 🆔⚖️🏛️ → `fingerprint`/`scale`/`landmark`
  - **Preview toolbar**: ✕🖨️ → `x`/`printer`
  - **Attachment button**: 📎 → `paperclip`
  - **No-preview placeholder**: 🤖📁 → `bot`/`folder-open`
  - **Update notifications**: 🎉⬇️ → `party-popper`/`download`
  - **Status badges**: ⏳ → `clock`
  - **Loading indicators**: ⏳ → `loader` + `.spin` animation
  - **Theme selector**: 🎨 → `palette`
  - **Note pins**: 📌 → `pin`
  - **Payslip print**: 🖨️ → `printer`
- **Total**: ~50 emoji characters replaced with Lucide SVG icons across both files.

### 4. CSS Additions
- Added `.spin` animation class for Lucide loader icons.

---

## New Features (2026-05-19)

### 1. Dark Mode Toggle
- Added theme toggle button in topbar (`#themeToggleBtn`) — already fully wired in JS (`initTheme`/`toggleTheme`)
- Added `[data-theme="light"]` CSS overrides for lighter sidebar, topbar, cards, tables, inputs
- Toggle persists in `localStorage`

### 2. Sticky Notes Feature (UI completed)
- The notes system was fully implemented in JS+DB but **missing HTML** (no page, nav item, or modal)
- **Added**: Notes nav item in "Productivité" section, notes page with grid layout, note modal with title/content/color picker/pin option
- Notes are persisted in SQLite with colors, pinning, and timestamps

### 3. Dashboard Notes Widget
- Recent 4 notes displayed on the dashboard in a clickable grid
- Empty state links to notes page to create the first note
- Clicking a note navigates to the full notes page

### 4. Document Search Enhancement
- Search query in `db.js` now also searches `items_json` (line item descriptions)
- Broader search coverage across document content

### 5. Batch Operations on Documents
- Checkbox column added to the documents table with "Select All" header checkbox
- **Batch Delete**: Delete multiple documents at once with confirmation
- **Batch Mark Paid**: Mark multiple factures as paid in one click
- **Batch Export PDF**: Export PDFs for selected documents
- Batch buttons are disabled until at least one document is selected

### 6. BA → Expense Conversion
- BA (Bon d'Achat) documents now have a "Convert to Expense" button in the actions column
- Automatically calculates HT/TVA from line items and creates an expense entry

### 7. Devis → Facture → BL Pipeline Tracking
- New "Pipeline" column in documents table shows conversion status:
  - Devis not yet converted: yellow "En attente" badge
  - Converted devis: green indicator with reference to resulting document
  - Documents with reference_doc: blue badge showing source document number
- Uses the existing `reference_doc` field on the documents table

### 8. TVA Déclaration Assistant
- New "Déclaration TVA" tool card in the Outils section
- Monthly TVA declaration summary showing:
  - **TVA Collectée**: From factures and avoirs, broken down by rate (7%, 13%, 19%)
  - **TVA Déductible**: From expenses, broken down by rate
  - **Net result**: TVA à reverser (orange) or Crédit TVA reportable (green)
- Data is computed directly from existing documents and expenses

---

## Critical Recent Fixes (v2.6.1 Patch)
15: 
16: ### 1. Advanced Document Management & RNE (Fixed 2026-04-26)
17: - **New Document Types**: Integrated 5 new document types into the core engine: **BL** (Bon de Livraison), **BA** (Bon d'Achat), **BS** (Bon de Sortie), **BE** (Bon d'Entrée), and **Avoir** (Credit Note).
18: - **Negative Revenue Logic**: Re-engineered the database queries for dashboard, annual stats, and fiscal summaries to treat `avoir` as negative revenue (subtraction) and exclude non-financial types (BL, BA, BS, BE) from revenue totals.
19: - **RNE Live Search**: Implemented a secure bridge to the **Tunisian National Registry of Enterprises (RNE)** API. Users can now fetch official client data (Name, Status, Legal Form, Address) directly via the Matricule Fiscal (MF).
20: - **WhatsApp Integration**: Replaced generic icons with official **SVG WhatsApp branding** and optimized the messaging workflow for professional client communication.
21: 
22: ## Critical Previous Fixes (v2.6.0)

### 1. Tunisian Compliance & Precision (Fixed 2026-04-25)
- **Precision**: Updated all builder functions and UI displays to use **3-decimal precision** (`toFixed(3)`). This is critical for Tunisian Millimes compliance, as 2-decimal rounding caused financial discrepancies.
- **Localization**: Fully translated invoice templates to **French** (default business language in Tunisia) and optimized labels for clarity.
- **Fiscal Fields**: Integrated mandatory Tunisian fields: **Matricule Fiscal (MF)**, **TVA Breakdown** per rate, and the **Timbre Fiscal (1.000 TND)** logic.

### 2. PDF Rendering & Image Fixes (Fixed 2026-04-25)
- **Base64 Images**: Implemented a mandatory conversion from local file paths to **Base64 Data URIs** in the main process (`imagePathToBase64`). This resolves the "blank image" bug in offscreen BrowserWindows where `file://` protocols are blocked.
- **Rendering Sync**: Replaced hardcoded `setTimeout(250)` with `document.fonts.ready` check in the PDF generator. This ensures pixel-perfect PDFs regardless of machine speed.
- **Unified Builders**: Added `docs:buildHTML` IPC handler to bridge the gap between renderer templates and main-process PDF generation.

### 3. Performance & Security (Fixed 2026-04-25)
- **OCR Acceleration**: Implemented **module-level caching** for the Tesseract.js worker. Instead of creating/terminating a worker on every scan (3-5s overhead), the app now reuses a persistent worker, making subsequent scans near-instant.
- **Credential Safety**: Switched SMTP password storage to use **Electron `safeStorage`**. Passwords are now encrypted at rest in the SQLite database and only decrypted in memory during the `email:send` process.
- **Import Optimization**: Moved heavy dependencies like `xlsx` to top-level imports to reduce IPC latency.

## Premium Design Enhancement (2026-05-19)

Premium UI/UX overhaul (CSS + icon consolidation) using Open Design's generated design system as inspiration:

### Design Tokens
- **Shadows**: Added `--shadow-md`, `--shadow-lg` for layered depth
- **Transitions**: Refined to `cubic-bezier(0.4, 0, 0.2, 1)` for smoother motion
- **Removed utility classes** (`.hidden`, `.flex`, etc.) — unused bloat cleaned

### Auth Screen
- Refined gradient: deep navy → indigo → sky blue (`#1e3a5f → #4f46e5 → #0ea5e9`)
- Larger radial decoration blobs with radial-gradient fade
- Enhanced auth card with multi-layer depth shadow (`0 25px 60px rgba(0,0,0,0.2)` + inner rim)

### Sidebar & Navigation
- Subtle primary tint gradient in user section
- Avatar ring glow (`box-shadow: 0 0 0 2px rgba(79,70,229,0.2)`)
- Section labels with decorative top accent bar (`::before`)
- Active nav items with inset primary indicator (`inset 3px 0 0 var(--primary)`)
- Refined spacing, hover states, and typography

### Page & Content
- Subtle vertical gradient across page container
- `fadeIn` animation (0.25s) on page activation with increased translateY (8px)
- Card hover elevation and softer resting shadows
- Stat cards with top gradient accent bar (`::before` opacity transition)
- Table headers with gradient background, rows with primary inset accent on hover

### Buttons & Interactions
- Hover lift effect (`translateY(-1px)`) on primary/success/danger/warning buttons
- Stronger active press (`scale(0.97)`)
- Icon buttons slightly larger (34px) with refined border-radius (8px) and hover lift
- Form focus with inner shadow for tactile depth

### Special Components
- Quick-action cards with primary-tinted shadow on hover, stronger lift
- Tool cards with icon scale animation (1.1x) on hover
- Doc type cards with enhanced active shadow (`rgba(79,70,229,0.15)`)
- Contract type cards with hover lift and shadow
- Export TEJ cards with hover lift and primary tint
- Company profile card with increased padding and refined gradient
- Theme cards with subtle translateY on hover
- Modals with enhanced multi-layer shadow + inner rim highlight
- Upload boxes with consistent design token usage

### Lucide Icons
- Comprehensive SVG icon sizing and stroke styling
- All emoji icons replaced with Lucide SVG equivalents for consistent rendering across nav, buttons, modals, tool cards, status badges, and inline contexts
- Proper stroke-width, stroke-linecap/join for crisp icons
- `.spin` animation class for loader icons in loading states

---

## Key Modules

### 📄 Document Engine
- **Templates**: Professional templates in `src/renderer/builders/invoice-builder.js` and `retenue-builder.js`.
- **Types**: Full support for Facture, Avoir, Devis, BL, BA, BS, BE, and Bon de commande.
- **Logic**: Support for FODEC, Timbre Fiscal, mixed TVA rates, and negative Avoir reconciliation.
- **Pipeline Tracking**: Reference document linking for Devis→Facture→BL lifecycle.

### 🗒️ Notes Module
- **Sticky Notes**: Fully implemented CRUD with colors, pinning, and rich text.
- **Dashboard Widget**: Recent notes preview on dashboard.
- **Storage**: SQLite `notes` table with `user_id`, `title`, `content`, `color`, `pinned` fields.

### 📊 Batch Operations
- **Multi-Select**: Checkbox-based selection on documents table.
- **Batch Actions**: Delete, mark as paid, and export PDF for multiple documents at once.

### 🇹🇳 TVA Declaration Assistant
- **Monthly Summary**: Computes TVA collectée (from invoices/avoirs) and TVA déductible (from expenses).
- **Rate Breakdown**: Per-rate analysis at 7%, 13%, 19%.
- **Net Result**: Calculates TVA à reverser or crédit TVA reportable.

### 🧠 Scanner Module
- **OCR**: `scanner:ocrImage` handler in `main.js`.
- **Caching**: Persistent `ocrWorker` instance.

### 🔐 Database Module
- **Schema**: `src/database/db.js` handles all tables (companies, clients, documents, expenses, employees, etc.).
- **Security**: Password hashing via `bcryptjs` and SMTP encryption via `safeStorage`.

## Important File Paths
- **Main Process**: `src/main.js` (Core IPC & PDF logic)
- **Database Logic**: `src/database/db.js`
- **Invoicing Logic**: `src/renderer/builders/invoice-builder.js`
- **Retenue/HR Logic**: `src/renderer/retenue-builder.js`

## Ongoing Reminders
- **Millimes**: Always use `toFixed(3)` for monatery values.
- **Images**: Pass base64 strings, not file paths, to builders for PDF reliability.
- **Offline-First**: Maintain zero cloud dependency for all core features.