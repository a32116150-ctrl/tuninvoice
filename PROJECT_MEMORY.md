# Factarlou (TuniInvoice Pro) - Project Memory

## Project Overview
- **App Name**: Factarlou (Product Name) / TuniInvoice Pro (Internal Name)
- **Version**: 3.0.0
- **Description**: A comprehensive, high-performance desktop application tailored for the Tunisian market to manage invoicing, taxation (Retenue), and business operations.
- **Tech Stack**: 
  - **Framework**: Electron (v28+)
  - **Database**: SQLite (`better-sqlite3`) for robust local data storage.
  - **OCR Engine**: `Tesseract.js` for scanning and text extraction.
  - **Logic**: Node.js / Modern JavaScript.
  - **Styling**: Premium vanilla CSS design system with custom properties, refined shadows, smooth transitions, and hover/active micro-interactions.
  - **Icons**: Lucide SVG icons for consistent, crisp rendering across the entire UI.
  - **Validation**: Custom validation layer (`src/validate.js`) for IPC payload integrity.
  - **Math Utils**: Centralized `src/math-utils.js` for shared TVA/tax calculations.
  - **Linting**: ESLint (flat config v9+) + Prettier (`npm run lint`, `npm run format`).

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

### 1. Sticky Notes Feature (UI completed)
- The notes system was fully implemented in JS+DB but **missing HTML** (no page, nav item, or modal)
- **Added**: Notes nav item in "Productivité" section, notes page with grid layout, note modal with title/content/color picker/pin option
- Notes are persisted in SQLite with colors, pinning, and timestamps

### 2. Dashboard Notes Widget
- Recent 4 notes displayed on the dashboard in a clickable grid
- Empty state links to notes page to create the first note
- Clicking a note navigates to the full notes page

### 3. Document Search Enhancement
- Search query in `db.js` now also searches `items_json` (line item descriptions)
- Broader search coverage across document content

### 4. Batch Operations on Documents
- Checkbox column added to the documents table with "Select All" header checkbox
- **Batch Delete**: Delete multiple documents at once with confirmation
- **Batch Mark Paid**: Mark multiple factures as paid in one click
- **Batch Export PDF**: Export PDFs for selected documents
- Batch buttons are disabled until at least one document is selected

### 5. BA → Expense Conversion
- BA (Bon d'Achat) documents now have a "Convert to Expense" button in the actions column
- Automatically calculates HT/TVA from line items and creates an expense entry

### 6. Devis → Facture → BL Pipeline Tracking
- New "Pipeline" column in documents table shows conversion status:
  - Devis not yet converted: yellow "En attente" badge
  - Converted devis: green indicator with reference to resulting document
  - Documents with reference_doc: blue badge showing source document number
- Uses the existing `reference_doc` field on the documents table

### 7. TVA Déclaration Assistant
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

## v2.6.5 Upgrades — Data Integrity & Developer Experience (2026-05-19)

### 1. Fix: Destructive Expenses Migration (`db.js:76-108`)
- **Bug**: The expenses table migration used `DROP TABLE IF EXISTS` on schema change, causing **data loss** for users upgrading from older versions.
- **Fix**: Replaced with a safe migration pattern:
  - Creates a new `expenses_new` table
  - Migrates data with `INSERT INTO ... SELECT` (converts old `amount` → `amount_ttc`)
  - Swaps tables with `ALTER TABLE ... RENAME TO`
  - Falls back gracefully on error
- **Impact**: Zero data loss on schema upgrades.

### 2. Backup Now Includes Attachments (`backup-scheduler.js`)
- **Before**: Only the SQLite `.db` file was included in ZIP backups
- **After**: The `attachments/` directory (receipt scans, uploaded images) is now included in every backup, and restored on restore.
- **Restore**: Automatically extracts attachments back to their original `userData/attachments/` path.

### 3. CSV Exporter Wired Up (`main.js`, `preload.js`)
- **Before**: `src/exporters/csv-exporter.js` existed but was dead code (never imported, no IPC handler, no preload bridge)
- **After**: 
  - Imported in `main.js`, instantiated as `csvExporter`
  - IPC handler `export:csv:document` with save dialog
  - Preload bridge method `exportCSVDocument`
  - Handles both single document and items export

### 4. ON DELETE CASCADE (Manual in JS) (`db.js`)
- **Before**: Deleting a client left orphaned documents; deleting a document left orphaned payments
- **After**: 
  - `deleteDocument()` now cascades to payments, retenues (by `facture_id`), and recurring invoices
  - `deleteClient()` cascades to all documents (which cascade further)
- **Note**: SQLite `PRAGMA foreign_keys = ON` + manual pre-delete cleanup

### 5. Input Validation Layer (`src/validate.js`)
- New module `src/validate.js` with functions:
  - `validateDocSave()` — checks UUID, type, number, date, client, currency, items (description, qty, price, TVA rate)
  - `validateClientSave()` — name, MF format, email/phone length
  - `validateExpenseSave()` — date, vendor, amounts, TVA rates
  - `validateSettings()` — decimal places (0-5), rounding method
  - `validateRecurringInvoice()` — UUIDs, frequency, next_run date
- Integrated into IPC handlers: `docs:save`, `docs:update`, `clients:save`, `expenses:save`
- Returns clear French error messages on failure

### 6. Recurring Invoices (DB methods existed, no IPC) (`main.js`, `preload.js`)
- **Before**: `recurring_invoices` table existed in schema but no IPC handlers or preload bridge
- **After**: 
  - IPC handlers: `recurring:getAll`, `recurring:save`, `recurring:delete`
  - Preload bridge: `getRecurringInvoices`, `saveRecurringInvoice`, `deleteRecurringInvoice`
  - Ready for UI integration in a future update

### 7. System Tray Icon (`main.js`)
- New system tray with icon and context menu:
  - "Ouvrir Factarlou" — show/focus main window
  - "Nouvelle Facture" — triggers `shortcut:newDoc` event
  - "Nouveau Devis" — triggers `shortcut:newDoc` event
  - "Tableau de bord" — triggers `shortcut:navigate` event
  - "Quitter" — clean app quit
- Double-click tray icon opens the window

### 8. Keyboard Shortcuts (`main.js`, `preload.js`, `app.js`)
- **Global shortcuts** (registered via `globalShortcut`):
  - `Cmd/Ctrl+N` → new invoice
  - `Cmd/Ctrl+Shift+N` → new devis
  - `Cmd/Ctrl+F` → focus search bar
- **In-app shortcuts** (via `keydown` listener):
  - `Escape` → close active modal
  - `Cmd/Ctrl+S` → save current document
- Shortcuts properly unregister on `will-quit`

### 9. Auto-Save Drafts (`app.js`)
- New module in app.js: `autoSaveDraft`, `restoreDraft`, `clearDraft`
- Form state saved to `localStorage` under `factarlou_draft` key every 2 seconds (debounced)
- Restored when creating a new document via `initNewDocument()`
- Cleared on successful save (`saveAndDownloadPDF`) and form reset
- Only saves if client name or items exist (avoids saving empty forms)

### 10. Audit Log Viewer API (`db.js`, `main.js`, `preload.js`)
- **Before**: `activity_log` table existed and was written to (`logActivity()`), but never readable from the UI
- **After**:
  - `getActivityLog(userId, limit)` — returns recent activity entries
  - `clearActivityLog(userId)` — wipes activity for a user
  - IPC handlers: `activity:getAll`, `activity:clear`
  - Preload bridges: `getActivityLog`, `clearActivityLog`

### 11. Shared Math/TVA Utils (`src/math-utils.js`)
- New module centralizing TVA calculation logic that was previously duplicated in `app.js`, `main.js`, and `invoice-builder.js`
- Exports:
  - `calculateTotals(items, options)` — full tax computation with discount, timbre, rounding
  - `formatAmount(value, decimalPlaces)` — consistent number formatting
  - `VALID_TVA_RATES`, `parseTVARate(tva)` — rate validation
- Supports: multi-rate TVA, proportional discount, timbre fiscal, 3 rounding methods

### 12. ESLint + Prettier (`eslint.config.js`, `.prettierrc`)
- ESLint flat config (v9+ compatible) with:
  - Recommended rule set
  - Node.js + browser globals
  - Warnings for unused vars, `no-var`, `eqeqeq`, semicolons, quotes
- Prettier config: single quotes, 4-space tabs, no trailing commas, 140 print width
- Scripts added to `package.json`:
  - `npm run lint` — check all `src/`
  - `npm run lint:fix` — auto-fix
  - `npm run format` — format all JS files
  - `npm run format:check` — check formatting

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

## v2.6.6 Upgrades — UX & Scalability (2026-05-19)

### 1. Natural Language Date Input (`app.js:39-93`)
- `parseNaturalDate(str)` accepts expressions: `aujourd'hui`, `demain`, `après-demain`, `lundi prochain`, `+30d`, `fin de mois`, `end of month`, etc.
- Auto-hooked onto all `input[type="date"]` fields via `initNaturalDateInputs()`
- Supports both French and English for maximum accessibility

### 2. Breadcrumb Navigation (`app.js:116-120`)
- Breadcrumb element on document page
- Shows `Documents › Nouveau`, `Documents › Édition`, or `Documents › Consultation`
- Updated via `updateBreadcrumb(label)` called from `initNewDocument()`, `editExistingDoc()`, `viewDocument()`

### 3. Drag & Drop Item Reordering (`app.js:122-157`)
- `initItemDrag(row)` adds drag handles and event listeners to each item row
- Uses HTML5 Drag & Drop API (no library dependency)
- On drop: reorders DOM, calls `renumberItems()` and `calculateTotals()`
- Visual feedback: `.drag-over` dashed outline, `opacity: 0.4` on dragged row
- CSS: `.drag-handle`, `tr.drag-over`, `tr.dragging` styles in styles.css

### 4. Auto-Complete MF (`app.js:159-205`)
- `initMFAutoComplete()` listens on `#docClientMF` input
- At 2+ chars, filters `allClients` by MF or name (top 8 matches)
- Dropdown appears below the input; clicking fills all client fields
- French error messages, 200ms blur delay for click-through

### 5. Activity Log Viewer (`app.js` AUDIT LOG section)
- **Before**: `activity_log` DB writes existed but no read path for UI
- **After**: 
  - `loadAuditLog()` fetches via `getActivityLog()`, renders in a data table
  - `filterAuditLog()` — searches by action or details text
  - `clearActivityLog()` — wipes entries with confirmation
- **HTML**: New `#page-audit-log` with search input and clear button
- **Nav**: `Journal d'Activité` under Système section

### 6. Recurring Invoices UI (`app.js` RECURRING INVOICES section)
- **Before**: DB schema + IPC handlers existed, no UI
- **After**: 
  - Settings card with CRUD table (client, type, frequency, day, mount)
  - `openRecurringModal()` — populates client dropdown from `allClients`
  - `saveRecurringInvoice()` — creates or updates via IPC
  - `editRecurringInvoice()` / `deleteRecurringInvoice()` — full CRUD
- **HTML**: Modal with doc type, client, frequency, day of month, items template, currency, payment mode

### 7. CSV Import (`app.js` CSV IMPORT section)
- `openCSVImportModal()` — resets state, shows modal
- `previewCSV(file)` — reads file, parses headers, renders preview table (first 10 rows)
- `confirmCSVImport()` — bulk inserts via `saveClient` / `saveService`, shows success/error count
- Supports both Clients (nom, mf, adresse, telephone, email) and Services (nom, prix, description)

### 8. Leaflet Offline Map (`app.js` OFFLINE MAP section)
- `initClientMap(lat, lng)` — creates Leaflet map with OpenStreetMap tiles
- `geocodeAddress(addr)` — uses Nominatim geocoding with ", Tunisie" qualifier
- `hideClientMap()` — cleanup on modal close
- Hooked into `openClientModal()` and `closeClientModal()`

### 9. i18n Multi-Language (`app.js` I18N section)
- `changeLocale(code)` — switches language, dispatches `locale-changed` event
- Selector in Settings (Français / English / العربية)
- RTL direction for Arabic via `document.dir = 'rtl'`
- Locales stored in `src/renderer/locales/{fr,ar,en}.json` (~45 keys each)
- Engine in `src/renderer/i18n.js` with localStorage persistence and French fallback

### 10. Batch Email (`app.js` BATCH EMAIL section)
- Checkbox-based multi-select on documents table
- `emailSelectedDocs()` — opens modal with count, subject, message fields
- `sendBatchEmails()` — generates PDF for each doc and sends via existing SMTP handler
- Progress bar showing `sent/failed` per document

### 11. Printable Backup Report (`app.js` BACKUP REPORT section)
- IPC handler `backup:report` queries all entity counts + totals grouped by type
- `generateBackupReport()` — opens new window with styled HTML report
- Auto-prints via `window.print()` in the report window
- Shows: total documents (by type), clients, services, expenses, retenues, contracts, companies

### 12. Document Pagination
- **DB**: `getDocumentsPaginated(userId, page, pageSize)` returns `{ rows, total }`
- **IPC**: `docs:getAll` accepts `{ userId, page, pageSize }`
- **Preload**: `getDocuments(params)` updated signature
- **UI**: `docPage` / `DOC_PAGE_SIZE` globals, `renderDocPagination(current, total)`, `goDocPage(n)`
- **Filter**: `filterDocuments()` resets to page 1 on filter change
- All other callers of `getDocuments` updated to pass params format

### 13. Recurring Invoice Auto-Generation (Cron) (`main.js`)
- `startRecurringCron()` starts a `setInterval` every 60 minutes
- `generateDueRecurring()` queries `getDueRecurringInvoices()` (WHERE active=1 AND next_run <= today)
- For each due invoice:
  - Parses `items_template` JSON into line items
  - Generates document number with proper prefix + year + increment
  - Inserts into `documents` table with auto-calculated totals
  - Advances `next_run` based on frequency (weekly/monthly/quarterly/yearly) and `day_of_month`
- `stopRecurringCron()` called on `app.on('before-quit')`
- Also added `app.on('before-quit')` handler for clean shutdown

### 14. Cleanup & Fixes
- **Deleted `broken_state_backup/`** — stale directory with duplicate source files
- **Deleted orphaned `Themes.js`** — ES module with `export const THEMES` was never imported/loaded in `index.html`; `DEFAULT_THEMES` already exists inline in `app-features.js`
- **DB schema updated**: `recurring_invoices` table now has `client_id`, `doc_type`, `day_of_month`, `items_template` (JSON), `currency`, `payment_mode` columns — supports inline config without requiring a template document
- **Password toggle fix**: `togglePasswordVisibility()` now queries `btn.querySelector('i') || btn.querySelector('svg')` because Lucide replaces `<i>` elements with `<svg>` on first render, causing the original code to silently fail

### 15. Document Templates (`db.js`, `main.js`, `preload.js`, `index.html`, `app-features.js`)
- New `document_templates` DB table with `id, user_id, name, type, data (JSON)`
- Templates capture the full document form state (client fields, items, notes) via `collectDocumentData()`
- IPC handlers: `templates:getAll`, `templates:save`, `templates:delete`
- Preload bridges: `getTemplates`, `saveTemplate`, `deleteTemplate`
- UI: "Modèles" button on document form, modal with save/load/delete, "Sauvegarder" saves current form, clicking a template fills the form

### 16. Remember Last-Used Settings (`app-auth.js`, `app-features.js`)
- `localStorage` persistence for `tuni_last_page`, `tuni_last_doc_type`
- `navigateTo()` saves last page; `createDocOfType()` / `updateDocType()` saves doc type
- `showApp()` restores last page after login with `setTimeout(navigateTo, 100)`

### 17. Save & New Button (`index.html`, `app-features.js`)
- Button next to the existing save button
- `saveAndNew()` calls `saveAndDownloadPDF()` then `resetDocumentForm()` then `navigateTo('new-document')`

### 18. Configurable PDF Output Folder (`index.html`, `app-features.js`)
- Settings card with folder input + "Parcourir" button
- Uses existing `fs:selectFolder` IPC to open native folder dialog
- Saved to `localStorage('tuni_pdf_folder')`
- `saveAndDownloadPDF()` reads the folder and prepends it to the default filename when calling the PDF save IPC

### 19. Search Across All Pages (`index.html`, `app-features.js`)
- **Clients**: `filterClients()` filters by name, MF, email, phone
- **Services**: `filterServices()` filters by name, description
- **Expenses**: `filterExpenses()` filters by vendor, category, reference (existing function enhanced)
- Each page has a search box in the card header with `onkeyup` binding

### 20. Sortable Table Columns (`app-features.js`)
- `docSortBy` / `docSortDir` state variables
- `sortDocs(field)` — toggles direction on same column, sets new column ascending on first click
- Supports: string (clientName, number), number (totalTTC, totalHT), date (date, createdAt) comparisons
- ▲/▼ indicators in column headers

### 21. Bulk Delete Clients/Services (`index.html`, `app-features.js`)
- Checkbox column in `renderClientsTable()` and `renderServicesTable()`
- "Select All" header checkbox + batch toolbar
- `deleteSelectedClients()` / `deleteSelectedServices()` — confirmation modal, then loops through IPC delete calls
- Cascade warning for clients ("documents et paiements associés seront également supprimés")

### 22. Auto-Backup on Save (`index.html`, `app-features.js`)
- Checkbox toggle in Settings backup card, saved to `localStorage('tuni_autobackup')`
- `saveAndDownloadPDF()` checks the setting; if enabled, calls `createManualBackup()` via `setTimeout` (non-blocking)
- Restore state in `loadSettings()`

### 23. Drag & Drop Expense Attachments (`index.html`, `app-features.js`)
- `expDropZone` div with drag event listeners
- Highlights border on `dragenter/dragover`, restores on `dragleave/drop`
- `initExpenseDropZone()` — one-time init, called from `openExpenseModal()`
- Validates file type (image/png,image/jpeg,image/webp,application/pdf)
- Creates a `DataTransfer` to set the hidden file input's `files` property

### 24. Paste MF → RNE Auto-Fill (`app-features.js`)
- `initClientMFPaste()` — paste event listener on `#docClientMF`
- 100ms timeout after paste to let the value settle
- If value length >= 7, calls `window.electronAPI.searchRNE(val)`
- On success: fills `#docClientName` and `#docClientAddress`
- Called from `initNewDocument()` and `editExistingDoc()`

### 25. Currency Converter Tool (`index.html`, `app-features.js`)
- Tool card in Outils grid: "Convertisseur de Devises"
- Modal with: source currency selector, conversion rate input, period filter (all/month/year)
- `runCurrencyConversion()` — aggregates `allDocuments` by currency, applies rate, shows per-currency breakdown + grand total
- Accounts for `avoir` type (negative) in totals

### 26. Module Split (`app-core.js`, `app-auth.js`, `app-features.js`)
- `app.js` was 4500+ lines; now a 2-line entry point
- **app-core.js** (471 lines): GLOBALS, DECIMAL/ROUNDING, NATURAL DATE, BREADCRUMB, DRAG DROP, AUTOCOMPLETE, TOAST, LOADING, CONFIRM, UTILS, I18N, MAP, CSV IMPORT, BACKUP REPORT
- **app-auth.js** (246 lines): INIT, AUTH (login/register/logout), NAVIGATION, CHANGE PASSWORD, HOOK
- **app-features.js** (4263+ lines): All remaining feature code (dashboard, documents, clients, settings, retenues, purchases, HR, tools, notes, search, updater, contracts, audit, recurring, financial reports, currency converter, etc.)
- **index.html**: Script order is i18n.js → app-core.js → app-auth.js → app-features.js → app.js → Lucide → Leaflet

### 27. Export to Excel (XLSX) (`app-features.js`, `main.js`, `preload.js`)
- `exportDocumentsXLSX()`, `exportClientsToExcel()`, `exportServicesXLSX()` — collect data and send via IPC
- `docs:exportXLSX`, `clients:exportXLSX`, `services:exportXLSX` IPC handlers in `main.js`
- Preload bridges: `exportXLSX` with `{ type, data, filename }` — uses `xlsx` library to write `.xlsx`
- XLSX buttons on documents, clients, and services pages

### 28. Window State Persistence (`main.js`)
- Saves window bounds (x, y, width, height) and maximized state to `window-state.json` in `userData`
- `saveWindowState()` called on `move`, `resize`, and `maximize/unmaximize` events
- On app start, `restoreWindowState()` reads the file and applies bounds; falls back to centered defaults if off-screen

### 29. Custom Fields on Documents (`index.html`, `app-features.js`, `db.js`)
- UI section "Champs personnalisés" on document form with add/remove key-value pairs
- `addCustomField()`, `removeCustomField()` — DOM manipulation
- `collectCustomFields()` and `applyCustomFields()` — serialize/deserialize JSON to/from form
- Stored as JSON array in `documents.custom_fields` column (default `'[]'`)
- Not visible on PDF or preview — internal reference only

### 30. Enhanced Dashboard (`app-features.js`)
- **Monthly Revenue Chart**: Line chart rendered in a `<canvas>` element showing revenue (factures − avoirs) vs expenses per month for the current year
- **Top 5 Clients Bar Chart**: Horizontal bar chart ranking clients by total revenue
- `renderRevenueChart()` and `renderTopClientsChart()` — compute data from `allDocuments` / `window.electronAPI.getExpenses()`, draw with vanilla Canvas API
- Auto-scales on window resize via `ResizeObserver`

### 31. P&L Report (Compte de Résultat) (`app-features.js`)
- `openPLReport()` — opens new window with HTML content showing:
  - Total revenue: sum of facture HT − avoir HT for the selected year
  - Total expenses: sum of expense HT for the selected year
  - Net result: revenue − expenses (green for profit, red for loss)
- Auto-prints via `window.print()`; closes after printing

### 32. Balance Sheet (Bilan Annuel) (`app-features.js`)
- `openBalanceReport()` — computes for the selected year:
  - **Assets**: Créances (total unpaid factures) + Encaissements (total collected revenue)
  - **Liabilities**: Situation nette (collected − expenses) + total expenses
- Renders in a print-ready new window with two-column layout

### 33. TVA Annual Report (`app-features.js`)
- `openTVAAnnualReport()` — month-by-month breakdown for the selected year:
  - Each month row: TVA collectée (from factures/avoirs) by rate, TVA déductible (from expenses)
  - Annual totals row at bottom
- Opens in a print-ready new window with full-width table

### 34. Customizable Email Templates (`app-features.js`)
- Email templates saved/loaded from `localStorage` under key `tuni_email_templates`
- `saveCurrentAsEmailTemplate()` — saves current subject + body from batch email modal
- `openEmailTemplateManager()` — shows modal with saved templates; click to load, delete
- Templates stored as `{ name, subject, body }` array

### 35. Service Categories (`app-features.js`, `index.html`)
- Category dropdown on service modal (Service, Produit, Abonnement, Consulting, Autre)
- Stored in `services.category` column (migration adds column via `tryAlter`)
- `filterServices()` respects `#filterServiceCategory` select value
- Categories shown in services table

### 36. Internal Notes on Documents (`app-features.js`, `index.html`, `db.js`)
- Textarea `#docInternalNotes` on the document form
- Stored in `documents.internal_notes` column (migration via `tryAlter`)
- `collectInternalNotes()` / `applyInternalNotes()` — serialize/deserialize on save and edit
- Never rendered in PDF or preview — purely internal

### 37. Import Clients from Excel (`app-features.js`, `index.html`, `main.js`, `preload.js`)
- Client import card on clients page: "Importer" button opens modal
- `previewClientImport(file)` — reads `.xlsx` via `importXLSX` IPC, renders preview table of first rows
- Auto-mapping: column selects auto-select matching columns (Nom/Name → name, MF/Matricule → mf, etc.)
- `confirmClientImport()` — batch inserts via `clients:save` for each row
- IPC handler `import:clients:xlsx` in `main.js` reads workbook using `xlsx` library
- Preload bridge: `importXLSX` (generic XLSX file reader)

### 38. Graphe Relationnel — Apriori Association Mining (`src/renderer/apriori.js`, `app-features.js`)
- New module `apriori.js` (137 lines): Pure JS implementation of the classic Apriori algorithm
  - `apriori(transactions, minSupport, minConfidence)` — generates frequent itemsets → association rules with support, confidence, lift
  - `analyzePaymentByItem(documents)` — groups by item description, computes on-time/late/unpaid rates
  - `analyzeClientPatterns(documents)` — finds clients who reorder same items, calculates avg frequency (days)
- No external dependencies, no IPC, no backend — runs entirely in the renderer from `allDocuments` global
- **UI**: Modal with 3 tabs — associations table (with confidence bars), payment risk (color-coded), client recurrence
- Threshold controls: support (2–15%) and confidence (20–70%)
- Minimum 5 documents required to run analysis
- Loaded via `<script src="apriori.js">` in `index.html` after leaflet.js

### 39. Simulateur de Scénarios Fiscaux (`app-features.js`)
- `simCalculateTotals(items, options)` — pure function mirroring math-utils.js logic: multi-rate TVA, timbre, proportional discount, configurable rounding
- Entry points: tool card in Outils (`openScenarioSimulator()`) + "Simuler" button on document form (`simulateCurrentDocument()`)
- Standalone mode: select any existing document from dropdown
- Inline mode: captures current form data (items, type, discount, timbre, currency)
- Comparison: 3-column layout showing Original / Simulation / Impact fiscal with HT/TVA/TTC differences color-coded
- Live recalculation on every parameter change (`onchange`/`oninput`)
- `applySimulation()` — packages simulated params into `docData`, sends via `docs:save` IPC, refreshes document list
- Smart tips: contextual insights for avoir type (revenue reduction) and discount (TVA savings)

### 40. Settings Page Redesign — Full UI/UX Overhaul (`styles.css`, `app-features.js`, `app-auth.js`, `index.html`)
- **Problem**: The settings navigation was completely unstyled (missing CSS) and the `switchSettingsTab()` function was never implemented — clicking tabs did nothing
- **Layout**: Restructured from broken horizontal tab bar to a polished **sidebar+content** layout (`settings-layout` flex container)
  - Sticky vertical sidebar (`settings-sidebar`, 220px) with 5 icon+label buttons and active left-accent indicator
  - Content area (`settings-content`) with animated section transitions (`fadeIn 0.25s`)
  - Responsive: sidebar collapses to horizontal scroll on screens < 800px
- **Tab Persistence**: `switchSettingsTab()` saves last tab to `localStorage('tuni_settings_tab')`; `restoreSettingsTab()` auto-restores it on page load
- **Card Enhancement**: Every settings card now has a structured header with title + description (`card-desc`), save buttons in a dedicated footer bar (`card-save-bar`), and contextual info boxes (`card-info-box`) with Lucide icons
- **Visual Polish**: Added `card-info-box` (blue info) and `card-info-box-success` (green info) components; icons added to document prefix labels; improved spacing and visual hierarchy
- **Files modified**: `styles.css` (~100 lines new CSS), `app-features.js` (2 new functions), `app-auth.js` (1 line), `index.html` (full settings page restructured)

### 41. Mon Entreprise Page Redesign — Matching Settings Card Pattern (`styles.css`, `index.html`)
- **Problem**: The company page cards did not match the new Settings design — no structured headers, descriptions, info boxes, or dedicated save bar.
- **Changes**:
  - Cards restructured with `card-header` + `card-desc` + `card-body` + `card-save-bar` layout
  - Added contextual `card-info-box` components with Lucide icons for inline help
  - Profile card emoji `🏛️` replaced with Lucide `building` icon (`.company-profile-icon` class)
  - Display checkboxes wrapped in styled pill elements (gray background, border-radius, hover effect)
  - Save button moved to `card-save-bar` footer
- **Files modified**: `index.html` (company page restructured), `styles.css` (`.company-profile-card`, `.card-pill` classes)

### 42. Critical Fix — Document Sequence Number Counter Leak (`app-features.js`, `main.js`, `db.js`)
- **Problem**: `initNewDocument()` and `updateDocType()` called `getNextDocNumber()` which **increments** the SQLite counter just to display the next number. Every form open + every type change burned one number even if the user never saved.
- **Root Cause**: `db.js:305` `saveDocument()` accepts `docData.number` as-is and only calls `getNextDocumentNumber` as fallback. The display already consumed the number, so passing it back on save didn't re-increment.
- **Fix**:
  - Added `peekNextDocNumber()` IPC handler (`docs:peekNextNumber`) — read-only, does not increment counter
  - Added separate `getNextDocNumber()` IPC handler (`docs:getNextNumber`) — increments counter, returns reserved number
  - `initNewDocument()`, `updateDocType()`, `openResetCounterModal()` use `peekNextDocNumber()` for display only
  - `saveAndDownloadPDF()` calls `getNextDocNumber()` right before `collectDocumentData()` — counter consumed only on actual save
- **Recurring invoices fix**: `main.js:1064` `generateDueRecurring()` replaced `COUNT(*)` + hardcoded prefix with `db.getNextDocumentNumber()`. `db.js:865` `saveRecurringInvoice()` uses `peekNextDocumentNumber()` for template preview.

### 43. Manual Doc Number Override (`app-features.js`)
- **Feature**: Users can type any number into `#docNumber` to override auto-assignment. Tracks manual edits via `docNumberManuallySet` flag.
- **Behavior**:
  - Field not edited → `saveAndDownloadPDF()` auto-assigns next sequential number via `getNextDocNumber()`
  - Field edited → manual number used as-is; counter is NOT consumed
  - Changing doc type or creating a new document resets the flag to `false`
- **Implementation**: Input listener on `#docNumber` sets flag; `initNewDocument()` and `updateDocType()` reset it after peeking.

### 44. Point de Vente (POS) — Cash Register Module (`styles.css`, `index.html`, `app-features.js`, `main.js`, `preload.js`, `db.js`)
- **New Feature**: Full retail POS system integrated into Factarlou — suitable for markets and stores.
- **Database**:
  - `pos_sessions` table (`id, user_id, opened_at, closed_at, opening_balance, closing_cash, closing_card, closing_total, cash_sales, card_sales, total_sales, transaction_count, status`)
  - `services` table extended with `min_stock INTEGER DEFAULT 0`
  - `documents` table extended with `is_pos INTEGER DEFAULT 0`, `pos_session_id TEXT`
  - POS sales stored as regular `facture` documents with `is_pos=1` flag for financial report integration
- **IPC Handlers** (main.js, after line 862):
  - `pos:getProducts` — get all services with stock info
  - `pos:getProductByBarcode` — look up by barcode
  - `pos:saveSale` — creates document + deducts stock + updates session, reserves document number atomically
  - `pos:getSales` / `pos:getTodaySales` / `pos:getSaleById` / `pos:deleteSale`
  - `pos:updateStock` — manual stock adjustment
  - `pos:openSession` / `pos:closeSession` / `pos:getActiveSession` / `pos:getSessions`
  - `pos:getLowStock` — products below min_stock threshold
- **UI** (index.html):
  - Nav item "Point de Vente" with `cash-register` Lucide icon, between Services and Mon Entreprise
  - `#page-pos` with session bar (open/close), product grid (left, auto-fill 140px cards), cart panel (right, fixed 340px)
  - Barcode input with auto-search (300ms debounce, barcode first → name fallback)
  - Category filter pills (dynamic from product categories)
  - Cart with quantity +/- , remove, totals (subtotal HT, TVA by rate, total TTC)
  - Payment modal: 4 methods (cash, card, mobile, check), cash change calculation, optional client/notes
  - Receipt modal: thermal-80mm-style ticket with print button
- **JavaScript** (app-features.js):
  - `loadPOS()` — main entry point, loads session + products
  - `posToggleSession()` — open/close with prompts for amounts
  - `loadPOSProducts()` / `renderPOSProducts()` — grid with out-of-stock dimming
  - `checkLowStock()` — badge in page header for products below threshold
  - `posAddToCart()` / `posIncQty()` / `posDecQty()` / `posRemoveItem()` / `posClearCart()`
  - `posOpenPayment()` / `posSelectPayMethod()` / `posCalcChange()` / `posCompleteSale()`
  - `posShowReceipt()` / `posPrintReceipt()` — opens new window with thermal-print CSS (@page 80mm)
  - Barcode input listener on DOMContentLoaded (works with POS page hidden, elements exist in DOM)
  - Stock deducted atomically in `pos:saveSale` main process handler
- **CSS** (styles.css):
  - Full redesign for "super POS app" experience: dark topbar (`#0f172a`), full-height layout, no page padding
  - `.pos-layout` flex container, `.pos-product-grid` with `auto-fill,minmax(160px,1fr)`
  - `.pos-cart` panel (380px) with inner scrolling, `.pos-cart-item` with hover/active states
  - `.pos-scan-box` with focus ring, `.pos-cat-btn` pill filters (dark active state)
  - `.pos-btn-pay` large green payment button with amount display
  - `body.pos-mode .sidebar { display:none }` + `.main-content` full width
  - `.pos-pay-method` active state, `.pos-product-card` hover lift + out-of-stock dimming
  - Responsive design
- **Preload** (preload.js): 12 new bridge methods for all POS IPC channels
- **Keyboard Shortcuts**: `F1` toggle full-screen, `F2` focus barcode input, `F3` TTC toggle, `F4` today sales (from any page when POS is active)
- **Navigation**: Moved "Point de Vente" to its own "Ventes" section in sidebar, above "Productivité"

### 45. POS Upgrades — Market-Ready Enhancements (2026-05-20)
- **SQL Injection Fix**: `deductStock()` changed from string interpolation to parameterized query (`?` placeholders)
- **TTC Pricing Mode**: `posToggleTTCMode()` — toggle HT/TTC display in product grid. TTC = price × (1 + tva/100). Blue "TTC" badge on cards in TTC mode. `F3` shortcut.
- **Per-Line Discount**: Each cart item now has a discount % input. Line total = `qty × price × (1 − discount%)`. TVA recalculated on discounted HT. Global discount line shown in cart totals (red). Discount displayed on receipt.
- **Quick Quantity Edit**: Double-click qty number in cart → inline input. Enter/Tab to confirm, Escape to cancel. `onblur` also saves.
- **Last Receipt Reprint**: `posLastReceiptData` stores the last completed sale data. Two reprint buttons: topbar icon + cart action (shown after sale). `posReprintLast()` calls `posShowReceipt()` with stored data.
- **Hold/Resume Cart**: `posHoldCart()` — deep-clones current cart into `posHeldCart`, clears cart, shows held indicator. `posResumeCart()` — restores (with confirmation if current cart non-empty). Visible in cart header.
- **Today Sales Modal**: `posToggleTodaySales()` — fetches `getTodayPOSSales()`, renders in modal with time, number, client, amount, payment method per sale. Total summary at top. `F4` shortcut.
- **Z-Report**: `posZReport()` — generates end-of-day report with: fond de caisse, total ventes, transactions count, par-méthode breakdown (mobile/check computed from documents), total caisse attendu. Opens in thermal-print modal. `posPrintZReport()` opens new window with 80mm print CSS. Button in topbar, shown only when session active.
- **UI Additions**: separator + icon buttons in topbar (TTC, Z-report, today sales, reprint). Hold button in cart header. Per-line discount inputs. Discount row in cart totals.
- **Keyboard Shortcuts**: `F3` TTC toggle, `F4` today sales.

### 46. POS V2 — Retail-Ready Enhancements (2026-05-20)
- **Rapport X**: Mid-day summary identical to Z-report but does not require or imply session closing. Shows fond + ventes + mouvements + par-méthode. `F5` shortcut. Button in topbar (visible when session active).
- **Override Prix**: Double-click the line total in the cart to edit the unit price. `priceOverridden` flag shown as "PRIX MODIFIÉ" badge. Supports custom pricing per-sale.
- **Création Produit depuis le POS**: "Nouveau Produit" button in the toolbar row. Modal with name, price, TVA, category, barcode, stock. Saves via existing `services:save` IPC. Products list refreshed automatically. `F7` shortcut.
- **Favoris (Vente Rapide)**: Star button on each product card to toggle favorite (☆/★). Favorites stored in `localStorage('tuni_pos_favorites')`. "⭐ Favoris" category button at start of category pills. `F6` shortcut.
- **Split Tender (Paiement Multiple)**: "Ajouter un moyen de paiement" button in payment modal. Each method gets an editable amount. Remaining total shown. Methods stored in `posSplitPayments[]` array. On save, all methods are recorded in the document notes as "Paiement multiple: Espèces 50.000 + Carte 30.000".
- **Mouvements de Caisse**: `posAddCashMove()` — prompts for reason and amount (positive = apport, negative = retrait). Tracks in `posCashMoves[]` array. Shown in session close summary with net total. Affects expected cash calculation. `F8` shortcut. Button visible in toolbar when session active.
- **Remboursement**: "Rembourser" button on each sale in the today sales modal. Reverses stock (adds back), creates a negative-amount POS sale document, refreshes session totals. Refunded sales shown with "REMBOURSÉ" badge and reduced opacity.
- **Fidélité**: `posAddLoyaltyPoints()` — awards 1 point per 10 TND spent, stored in `localStorage('tuni_pos_loyalty_{userId}')`. Points displayed on the receipt. `posGetLoyalty()` reads points for a client.
- **Multi-Caissier**: `posOperatorInput` text field in the topbar brand area, shows only when session active. `posOperatorName` stored globally. Operator name printed on receipt.
- **Nouveaux Raccourcis Clavier**: `F5` Rapport X, `F6` Favoris, `F7` Nouveau produit, `F8` Mouvement de caisse.
- **Rapport X**: Mid-day summary identical to Z-report but does not require or imply session closing. Shows fond + ventes + mouvements + par-méthode. `F5` shortcut. Button in topbar (visible when session active).
- **Override Prix**: Double-click the line total in the cart to edit the unit price. `priceOverridden` flag shown as "PRIX MODIFIÉ" badge. Supports custom pricing per-sale.
- **Création Produit depuis le POS**: "Nouveau Produit" button in the toolbar row. Modal with name, price, TVA, category, barcode, stock. Saves via existing `services:save` IPC. Products list refreshed automatically. `F7` shortcut.
- **Favoris (Vente Rapide)**: Star button on each product card to toggle favorite (☆/★). Favorites stored in `localStorage('tuni_pos_favorites')`. "⭐ Favoris" category button at start of category pills. `F6` shortcut.
- **Split Tender (Paiement Multiple)**: "Ajouter un moyen de paiement" button in payment modal. Each method gets an editable amount. Remaining total shown. Methods stored in `posSplitPayments[]` array. On save, all methods are recorded in the document notes as "Paiement multiple: Espèces 50.000 + Carte 30.000".
- **Mouvements de Caisse**: `posAddCashMove()` — prompts for reason and amount (positive = apport, negative = retrait). Tracks in `posCashMoves[]` array. Shown in session close summary with net total. Affects expected cash calculation. `F8` shortcut. Button visible in toolbar when session active.
- **Remboursement**: "Rembourser" button on each sale in the today sales modal. Reverses stock (adds back), creates a negative-amount POS sale document, refreshes session totals. Refunded sales shown with "REMBOURSÉ" badge and reduced opacity.
- **Fidélité**: `posAddLoyaltyPoints()` — awards 1 point per 10 TND spent, stored in `localStorage('tuni_pos_loyalty_{userId}')`. Points displayed on the receipt. `posGetLoyalty()` reads points for a client.
- **Multi-Caissier**: `posOperatorInput` text field in the topbar brand area, shows only when session active. `posOperatorName` stored globally. Operator name printed on receipt.
- **Nouveaux Raccourcis Clavier**: `F5` Rapport X, `F6` Favoris, `F7` Nouveau produit, `F8` Mouvement de caisse.

### 47. POS V3 — Retail-Ready Enhancements (2026-05-20)
- **Touch-Friendly POS**: All POS controls optimized for touch (≥44px tap targets, `:active` visual feedback, `touch-action: manipulation`). Cart +/- buttons 40×40px, topbar icons 44×44px, payment methods 64px min-height, category pills 40px min-height.
- **Fullscreen Fix**: `posFullscreenActive` now correctly synced with `pos-mode` class on load — the fullscreen toggle button works on the first click.
- **Toolbar Consolidation**: Moved separate search input into barcode input (unified search/scan). Moved "Pied ticket" to topbar icon. All toolbar items now fit on one compact row. Categories scroll horizontally.
- **Quick Grid (Top Ventes)**: `posLoadQuickGrid()` — top 10 most-sold products today from `getTodayPOSSales` data, shown as compact one-tap quick-add buttons.
- **Client Lookup**: `posSearchClient()` — autocomplete search across `allClients` CRM array in payment modal. Shows loyalty points inline via `posRefreshFidelityFromClient()`.
- **Cart Notes**: `#posCartNoteInput` textarea appears when cart has items. Value included in receipt and document notes.
- **Multiple Drafts**: Save/restore/delete multiple carts in localStorage (`tuni_pos_drafts`). `posSaveDraft()`, `posOpenDrafts()`, `posRestoreDraft()`, `posDeleteDraft()`. Drafts modal UI.
- **Search/Scan Unification**: `posBarcodeSearch()` replaces the old inline barcode listener — first tries barcode match, then name search. Single match auto-adds, multiple matches filter grid. `F2` focus shortcut.
- **Acompte/Deposit**: `posApplyAcompte()` — partial payment with remaining balance tracked in document notes. UI section in payment modal.
- **Product Images**: `image` column added to `services` table via `tryAlter` migration. `pos-prod-img` <img> tag rendered in product cards if image exists.
- **Receipt Footer**: `posSetFooter()` — custom message stored in `localStorage('tuni_pos_footer')`, displayed at bottom of receipt.
- **Enhanced Fidélité**: `posOpenFidelity()` — dedicated modal with points display. Star ⭐ button in topbar. Points shown in payment modal on client selection.
- **Hold + Draft**: `posHoldCart()` now also saves to drafts in addition to in-memory `posHeldCart`.
- **Unified POS version**: All features merged into v3.0.0 release with updated documentation.

## Important File Paths
- **Main Process**: `src/main.js` (Core IPC & PDF logic)
- **Database Logic**: `src/database/db.js`
- **Invoicing Logic**: `src/renderer/builders/invoice-builder.js`
- **Retenue/HR Logic**: `src/renderer/retenue-builder.js`
- **Input Validation**: `src/validate.js`
- **Math/TVA Utils**: `src/math-utils.js`
- **CSV Export**: `src/exporters/csv-exporter.js`
- **Backup Scheduler**: `src/backup-scheduler.js`
- **App Core**: `src/renderer/app-core.js` (shared state & utilities)
- **App Auth**: `src/renderer/app-auth.js` (authentication & navigation)
- **App Features**: `src/renderer/app-features.js` (all feature code)
- **i18n Engine**: `src/renderer/i18n.js`
- **Locales**: `src/renderer/locales/{fr,ar,en}.json`
- **Leaflet**: `src/renderer/leaflet.css`, `src/renderer/leaflet.js`
- **Apriori**: `src/renderer/apriori.js` (association rule mining, payment analysis, client patterns)
- **Window State**: `window-state.json` in `app.getPath('userData')`

## Ongoing Reminders
- **Millimes**: Always use `toFixed(3)` for monatery values.
- **Images**: Pass base64 strings, not file paths, to builders for PDF reliability.
- **Offline-First**: Maintain zero cloud dependency for all core features.
- **Validation**: Always add validation checks in `src/validate.js` for new IPC handlers.
- **TVA Calculations**: Use `calculateTotals()` from `src/math-utils.js` instead of writing inline tax logic.
- **Cascade Deletes**: When adding new entity types, ensure `delete*()` methods cascade to related records.
- **Migrations**: Never use `DROP TABLE` in migrations — always use the `CREATE NEW → INSERT → RENAME` pattern.
- **Backups**: Any new file storage directory must be added to `backup-scheduler.js`'s `createBackup()`.
- **Pagination**: When adding new list views, use `LIMIT/OFFSET` with `renderPagination()` to avoid memory issues at scale.
- **Module Loading**: New features go in `app-features.js` (or a dedicated module if large). All 3 app modules must be loaded in order (core → auth → features) in `index.html`.
- **i18n**: New strings should be added to all 3 locale files. The `i18n.t('key')` pattern is preferred over hardcoded French strings.
- **Recurring Cron**: `startRecurringCron()` in `main.js` runs every hour. Any new scheduled task should be added there. Use `startRecurringCron()` in `app.whenReady()` and `stopRecurringCron()` in `app.on('before-quit')`.
- **Password Toggle**: `togglePasswordVisibility()` must query for both `i` and `svg` elements because Lucide replaces `<i>` with `<svg>` on first render.
- **Themes.js**: Do NOT recreate `src/renderer/Themes.js` — the `DEFAULT_THEMES` object is defined inline in `app-features.js` and `Themes.js` was an orphaned ES module with no load path, deleted to avoid confusion.
- **XLSX Export/Import**: New export/import handlers should use the existing `xlsx` library in `main.js` (already imported for export). Reuse the `exportXLSX` preload bridge or the `importXLSX` bridge for reading.
- **Custom Fields / Internal Notes**: Document-level metadata that should NOT appear on PDFs goes in DB columns (`custom_fields`, `internal_notes`). Use `tryAlter` migrations for new columns. Never render these in the PDF builder.
- **Window State**: When saving window state, handle off-screen recovery gracefully (monitor unplugged, resolution change). Always write `window-state.json` synchronously on `move`/`resize` to avoid race conditions during quit.
- **Chart Dependencies**: Dashboard charts use vanilla Canvas API — no charting library needed. New chart types should follow the same pattern (compute data, draw with Canvas 2D context).
- **Pure Calculation Functions**: When implementing simulation or "what-if" features in the renderer, write pure functions (like `simCalculateTotals()`) that don't depend on DOM elements. The existing `calculateTotals()` in `app-features.js` reads from DOM — don't reuse it for data-only operations.
- **apriori.js**: This module is loaded via `<script>` tag in `index.html` AFTER `app-features.js`. Functions defined in it are only called at runtime (user click), so the load order is safe. New analysis functions should be added here, not in `app-features.js`, to keep the algorithm code isolated and testable.
- **Document Numbering**: Never consume the counter (`getNextDocNumber`) in display-only flows (form init, type change, counter preview). Use `peekNextDocNumber()` for read-only previews. Only call `getNextDocNumber()` right before the actual `saveDocument()` call to prevent number gaps when users navigate without saving.
- **POS Stock Deduction**: Stock is deducted in the `pos:saveSale` IPC handler (`main.js`) atomically with document creation. Keep stock logic server-side to avoid race conditions. The `deductStock` DB method uses `MAX(0, stock - qty)` to prevent negative stock.
- **POS Sessions**: `pos_sessions` tracks cash/card totals and transaction counts. The `addPosSaleToSession()` method accumulates these; `closeSession()` stores final closing amounts. Session open/close is user-driven (manual).
- **Client-Side Mining**: All data mining (Apriori, payment analysis, client patterns) runs on the `allDocuments` global array already in memory. No IPC or SQL needed. For larger datasets (>10K documents), consider running in a Web Worker to avoid blocking the UI.
- **Simulator Document Creation**: The `applySimulation()` function calls `window.electronAPI.saveDocument()` directly via existing IPC. If new fields are added to the document schema in the future, update the `docData` object in `applySimulation()` and ensure the simulator form includes toggles for them.

---

## v3.1.0 — Auto-Updater Reliability (2026-05-20)

### 1. Fix: macOS DMG Cache Path (`src/main.js`)
- **Bug**: The post-download DMG scanning used `app.getPath('userData')` (`~/Library/Application Support/Factarlou/pending/`) but `electron-updater` stores downloads in `app.getPath('temp')`.
- **Fix**: Replaced `app.getPath('userData')` scan with a robust recursive scan of `app.getPath('temp')` for `.dmg` files containing `factarlou` (case-insensitive), sorted by modification time (newest first).

### 2. Fix: False-Positive Update Toast (`src/renderer/app-features.js`)
- **Bug**: `manualCheckUpdate()` called `checkForUpdates()` which returns the latest available version regardless of whether it differs from the current version. The renderer always showed "Mise à jour trouvée" even when already up-to-date.
- **Fix**: `updater:check` IPC handler now compares `currentVersion` with `latestVersion` and returns a `hasUpdate` boolean. Renderer checks `r.hasUpdate` before showing the success toast.

### 3. Fix: Silent Updater Errors (`src/renderer/app-features.js`)
- **Bug**: The `error` event in `initUpdaterListener()` only called `console.warn`, giving the user no feedback when a check or download failed.
- **Fix**: Added `showToast('Erreur de mise à jour: ...', 'error', 5000)` to display a visible error toast.

### 4. Enhancement: macOS Dock Progress Bar (`src/main.js`)
- **Before**: `setProgressBar()` was only called on Windows.
- **After**: Added `app.dock.setProgressBar(fraction)` on macOS for visual download progress in the dock icon.

### 5. Enhancement: Destroyed Window Guard (`src/main.js`)
- **Before**: `mainWindow.setProgressBar()` could throw if the window was destroyed between the event firing and the handler executing.
- **After**: Added `!mainWindow.isDestroyed()` guard before any window/dock operations.