# 📚 Factarlou — Full Documentation

Welcome to the official documentation for **Factarlou**, the premier intelligent invoicing and business management desktop application designed for the Tunisian market.

---

## 1. Overview
**Factarlou** is an offline-first, high-performance desktop application built with **Electron.js**. It is designed to handle the entire financial lifecycle of Tunisian freelancers, SMEs, and startups—from quote generation to expense tracking and fiscal compliance—all while ensuring 100% data privacy.

---

## 2. Key Features

### 🏢 Core Facturation (Invoicing)
- **Document Types**: Support for Factures, Devis, Bons de Commande, **Bons de Livraison (BL)**, **Bons d'Achat (BA)**, **Bons de Sortie (BS)**, **Bons d'Entrée (BE)**, and **Factures d'Avoir**.
- **Quote-to-Invoice**: One-click conversion from Devis to Facture or BL with automatic status updates.
- **Avoir Management**: Automated credit notes that reduce client debt and adjust overall revenue totals (negative revenue logic).
- **Tunisian Fiscal Logic**: 
  - Automatic **Timbre Fiscal** (1.000 TND) calculation.
  - Support for multiple **TVA** rates (0%, 7%, 13%, 19%).
  - Management of **FODEC** and other specific taxes.
- **Number Formatting**: Full support for Tunisian accounting standards (3 decimal places / Millimes) with automatic rounding adjustments across all modules.
- **Smart Numbering**: Automatic sequential numbering per document type (configurable prefixes) and year. Counter consumed **only on save** — opening a form or switching types only peeks without consuming. Manual override supported: edit the field directly, the system respects manual entries without advancing the counter.

### 🇹🇳 TVA Declaration Assistant
- **Monthly Summary**: Automatically computes TVA collectée (from invoices/avoirs) and TVA déductible (from expenses) for any month.
- **Rate Breakdown**: Per-rate analysis at 7%, 13%, 19%.
- **Net Result**: Calculates TVA à reverser or crédit TVA reportable.
- **Annual Report**: Month-by-month breakdown of TVA collectée and déductible with full-year totals.
- **Access**: Available from the Outils (Tools) page.

### 📊 P&L Report (Compte de Résultat)
- **Revenue vs Expenses**: Print-ready report comparing total revenue (invoice/avoir) against expenses.
- **Net Result**: Automatically computed net profit or loss for the selected period.
- **Access**: Available from the Outils page.

### 📋 Balance Sheet (Bilan Annuel)
- **Assets**: Total receivables (unpaid invoices) + collected revenue for the selected year.
- **Liabilities**: Net position + total expenses.
- **Net Position**: Automatically computed equity for the year.
- **Access**: Available from the Outils page.

### 🧠 Intelligent Expense Scanner (OCR)
- **Automated Entry**: Uses **Tesseract.js** to scan paper receipts and PDFs.
- **Data Extraction**: Automatically detects the vendor name, date, and total amount (TTC).
- **Text-to-Number**: Smart conversion of amounts written in words (e.g., "deux cent dinars" → 200.000).
- **Attachment Management**: Every expense is linked to its digital scan for easy auditing.

### 🇹🇳 Tax Compliance (Retenue à la Source)
- **Automatic Certificates**: Generate official certificates for "Retenue à la Source" based on current Tunisian law.
- **Rate Presets**: Built-in support for 0.5%, 1%, 1.5%, 5%, 10%, and 15% rates.
- **Batch Export**: View and export summaries of all tax withholdings for a specific period.

### 🤝 Client & Contract Management
- **CRM Lite**: Manage a complete database of clients with history and contact details.
- **Smart Preview**: Instant detailed view of client profiles.
- **Contract Builder**: Generate various Tunisian labor and service contracts (CDI, CDD, Freelance, etc.) using professional templates.
- **HR Management**: 
  - Manage a database of **Employees** with contract details and job titles.
  - Automated **Payslip (Bulletin de Paie)** generation with built-in CNSS calculations (@ 9.18%).
  - PDF Preview and Download functionality for all HR documents.

### 🔄 Document Pipeline & BA→Expense
- **Devis→Facture→BL Pipeline**: Track conversion status of documents with automatic reference linking.
- **BA→Expense**: One-click conversion of Bon d'Achat documents into expense entries.

### 🎨 Interface & Themes
- **Clair/Sombre Toggle**: Theme switching button in the topbar, persists across sessions.
- **Document Themes**: 4 built-in presets (Classique, Moderne, Exécutif, Tunisien) + custom theme builder.

### ⚙️ Paramètres (Settings Page)
- **Redesigned Layout**: Vertical sidebar navigation with 5 tabbed sections (Général, Documents, Apparence, Sauvegarde, Automatisation) replacing the previous broken horizontal tab bar.
- **Tab Persistence**: The last active tab is saved to localStorage and restored automatically when returning to the settings page.
- **Enhanced Cards**: Each settings card features a structured header (title + description), a dedicated save button footer bar, and contextual info boxes with Lucide icons for inline help.
- **Sections**:
  - **Général**: Number format (decimal places, rounding method with live preview) + PDF output folder configuration.
  - **Documents**: Customizable prefixes for all 8 document types with live serial number preview + counter reset.
  - **Apparence**: 4 preset document themes (Classique, Moderne, Exécutif, Tunisien) + full custom theme builder (colors, fonts, layout) with live preview + per-type title customization.
  - **Sauvegarde**: Auto-backup scheduler (frequency/time/retention), manual backup creation, backup report generation, available backups list with restore.
  - **Automatisation**: Recurring invoices management with add/edit/delete.
- **Responsive**: The sidebar collapses to horizontal scroll on narrow screens.

### 🏢 Mon Entreprise (Company Page)
- **Redesigned Layout**: Same card design pattern as Settings — structured card headers with descriptions, contextual info boxes with Lucide icons, and a dedicated save button footer bar.
- **Profile Card Icon**: Lucide `building` icon replaces the previous emoji.
- **Checkbox Pills**: Display checkboxes styled as pill elements (gray background, border, hover effects) for a cleaner appearance.

### 🏪 Point de Vente (POS) — v3.0
- **Cash Register UI**: Full-screen POS interface with a product grid (category-filtered, searchable) and a cart panel (fixed 380px right sidebar). Toggle full-screen with `F1`.
- **Product Search**: Unified barcode/search input — scans barcodes or searches by name/category in real-time. `F2` focuses input.
- **Product Images**: Products with an image field show a thumbnail on the card.
- **Pricing Modes**: Toggle between HT and TTC display (`F3`). TTC = price × (1 + tva/100). Blue "TTC" badge in TTC mode.
- **Quick Grid (Top Ventes)**: Top 10 most-sold products today shown as one-tap quick-add buttons.
- **Favorites**: Star toggle on each product card (☆/★). "⭐ Favoris" filter category. Persisted in localStorage. `F6`.
- **Shopping Cart**: Quantity +/− buttons (40×40px touch targets), double-click qty for direct input, per-line discount (% off), multi-rate TVA calculation. Touch-optimized 44px+ controls.
- **Price Override**: Double-click line total to edit unit price. "PRIX MODIFIÉ" badge on overridden items.
- **Per-Line Discount**: Discount % input per item (0–100%). TVA recalculated on discounted HT. Discount shown on receipt.
- **Cart Notes**: Textarea in cart panel for a note that appears on the receipt.
- **Hold/Resume Cart**: Temporarily park a cart and restore it later. Also saved as a draft automatically.
- **Multiple Drafts**: Save/load/delete multiple carts in localStorage with custom names. Drafts modal.
- **Client Lookup**: Autocomplete search across CRM clients in payment modal. Shows fidelity points inline.
- **Payment Processing**: Modal with 4 methods (Cash, Card, Mobile Money, Check). Cash change calculation.
- **Split Tender**: Split the total across multiple payment methods with editable amounts per method. Stored as "Paiement multiple" in notes.
- **Acompte / Deposit**: Record a partial payment with remaining balance tracked on the receipt.
- **Last Receipt Reprint**: Reprint the last receipt via topbar icon or cart action button.
- **Today Sales History**: Modal with all POS sales for the current day. Total summary. Refund button per sale. `F4`.
- **Refunds**: Reverse stock + create negative document from today sales modal. "REMBOURSÉ" badge.
- **Stock Management**: Opt-in tracking (`min_stock > 0`), out-of-stock dimmed, auto-deduct on sale, low-stock alert badge.
- **Product Creation**: Quick-create products from POS toolbar (name, price, TVA, category, barcode, stock). `F7`.
- **Cash Moves**: Track cash in/out during session. Shown in X-report + session close summary. `F8`.
- **Session Management**: Open/close with opening balance, closing cash/card. Cash difference warning on close.
- **Rapport X**: Mid-day summary (fond + ventes + mouvements + par-méthode). No session close required. `F5`.
- **Z-Report**: End-of-day report with fond, ventes, transactions, per-method, total attendu. Thermal-print modal.
- **Multi-Caissier**: Operator name input in topbar, printed on receipt.
- **Loyalty Points (Fidélité)**: 1 pt per 10 TND spent. Stored in localStorage. Displayed on receipt. Dedicated modal. ⭐ topbar button.
- **Receipt Footer**: Custom message at bottom of receipt, configurable via toolbar button.
- **Receipt**: Thermal 80mm style with items, discounts, payment breakdown, operator, loyalty points, footer, notes.
- **Touch-Friendly**: All controls optimized for touch (≥44px tap targets, `:active` feedback, `touch-action: manipulation`).
- **Integration**: Sales saved as `facture` documents (`is_pos=1`). Stock deducted atomically.
- **Keyboard Shortcuts**: `F1` full-screen, `F2` search focus, `F3` TTC toggle, `F4` today sales, `F5` Rapport X, `F6` Favoris, `F7` new product, `F8` cash move.

### 🗒️ Notes & Productivité
- **Sticky Notes**: Notes adhésives avec code couleur, épinglage, et widget tableau de bord.
- **Batch Operations**: Sélection multiple et actions groupées (supprimer, marquer payé, exporter PDF) sur la liste des documents.
- **Pipeline Tracking**: Colonne "Pipeline" indiquant le statut de conversion Devis→Facture→BL.
- **Factures Récurrentes**: Infrastructure de suivi des factures récurrentes avec gestion du cycle de vie.
- **Export CSV**: Exportation des documents au format CSV pour analyse externe.
- **Export Excel (XLSX)**: Export des documents, clients et services au format Excel.
- **Sauvegarde Automatique des Brouillons**: Les formulaires de document sont sauvegardés localement toutes les 2 secondes et restaurés automatiquement.
- **Dates en Langage Naturel**: Saisie de dates en français/anglais (aujourd'hui, demain, lundi prochain, +30d, fin de mois).
- **Réorganisation par Glisser-Déposer**: Poignées de drag sur les lignes d'articles avec renumérotation automatique.
- **Auto-Complétion MF**: Suggestions de clients en tapant le MF ou le nom, remplissage instantané.
- **Import CSV**: Import en masse des clients et services avec aperçu et validation.
- **Import Clients depuis Excel**: Import par fichier Excel (.xlsx) avec mapping de colonnes et détection automatique.
- **Carte Hors-Ligne**: Visualisation des adresses clients sur Leaflet/OpenStreetMap.
- **Multi-Langue**: Support français, anglais, arabe avec sélecteur dans les Paramètres et direction RTL.
- **Envoi par Lot**: Sélection multiple + email groupé avec barre de progression.
- **Modèles d'Email**: Sauvegarde et chargement des modèles d'objet/corps d'email pour l'envoi par lot.
- **Rapport de Sauvegarde**: Rapport imprimable avec statistiques complètes et totaux financiers.
- **Pagination**: Chargement paginé (50/page) pour les documents.
- **Architecture Modularisée**: app.js divisé en app-core.js, app-auth.js, app-features.js.
- **Persistance Fenêtre**: La position, taille et état de la fenêtre sont sauvegardés entre les sessions.
- **Champs Personnalisés**: Paires clé/valeur sur les documents, stockées en JSON dans la base de données.
- **Catégories de Services**: Champ de catégorie avec filtre dans la page services.
- **Notes Internes**: Notes privées sur les documents, invisibles sur le PDF.
- **Dashboard Amélioré**: Graphique d'évolution mensuelle revenus/dépenses + Top 5 clients.

### 🇹🇳 RNE Live Search

### 🔗 Graphe Relationnel (Association Rule Mining)
- **Apriori Algorithm**: Pure JS implementation of the classic Apriori algorithm running in a Web Worker. Discovers frequent itemsets and generates association rules from your documents.
- **Cross-Selling Insights**: Finds item combinations that frequently appear together (e.g., "Clients who buy service A also buy service B with 85% confidence").
- **Payment Behavior by Item**: Groups documents by item description and computes on-time vs. late vs. unpaid payment rates. Color-coded risk levels identify which items correlate with payment delays.
- **Client Reorder Patterns**: Detects clients who repeatedly order the same items and calculates average frequency in days. Identifies subscription opportunities.
- **Adjustable Thresholds**: Users can tune minimum support (2–15%) and minimum confidence (20–70%) to filter noise.
- **Zero External Dependencies**: Algorithm is ~50KB, runs entirely in the renderer, no server or API needed.

### 🎯 Simulateur de Scénarios Fiscaux
- **What-If Analysis**: Load any existing document (or the current form) and modify parameters: document type (facture/devis/avoir/bon), TVA rate override (7/13/19/0%), discount percentage, currency, and timbre toggle.
- **Side-by-Side Comparison**: Three-column layout showing Original → Simulation → Fiscal Impact with real-time recalculation.
- **Net Difference**: Automatically computes the HT/TVA/TTC difference between original and simulated scenario, color-coded green (increase) or red (decrease).
- **Smart Tips**: Contextual insights — "Type Avoir réduit le chiffre d'affaires", "Remise X% économie Y TND sur la TVA".
- **Apply Scenario**: One-click creates a real document with the simulated parameters, preserving all client info from the source.
- **Entry Points**: Accessible from the Outils page (standalone document picker) or directly from the document form via the "Simuler" button.

### 📊 Real-Time Analytics
- **Dashboard**: High-resolution, responsive charts showing revenue vs. expenses with automatic scaling on window resize.
- **Avoir Integration**: Financial totals (Revenue, Unpaid) automatically account for credit notes (Avoirs) to ensure accounting accuracy.
- **Status Tracking**: Visual indicators for Unpaid, Partially Paid, and Paid documents.
- **Top Metrics**: Identify your most valuable clients and highest spending categories.

### 🆔 RNE Live Search
- **Registry Integration**: Direct integration with the **Tunisian National Registry of Enterprises (RNE)**.
- **Instant Verification**: Fetch official company names, legal status (Actif/Radié), and addresses using only the Matricule Fiscal (MF).
- **Accuracy**: Reduces manual entry errors by providing verified public data for client profiles.

---

## 3. Technical Architecture

### 🛠️ Tech Stack
- **Runtime**: Electron.js (Cross-platform support for Windows, macOS, and Linux).
- **Frontend**: Vanilla JS, HTML5, CSS3 (No heavy frameworks for maximum performance).
- **Styling**: Premium vanilla CSS design system with custom properties, refined shadows, smooth transitions, and hover/active micro-interactions. Inspired by a generated design system from Open Design.
- **Icons**: Lucide SVG icon library for consistent, crisp rendering throughout the interface.
- **Database**: SQLite (via `better-sqlite3`) for robust, local data storage.
- **OCR Engine**: Tesseract.js (Optical Character Recognition).
- **PDF Engine**: Isolated Electron background process for pixel-perfect A4 rendering.
- **Validation**: Custom validation layer (`src/validate.js`) for document, client, and expense data integrity.
- **Math/TVA Utils**: Centralized tax calculation module (`src/math-utils.js`) shared across the application.
- **Linting**: ESLint (flat config) + Prettier for code quality (`npm run lint`, `npm run format`).
- **Mapping**: Leaflet.js + OpenStreetMap tiles for offline client address visualization.
- **i18n**: Custom i18n engine with JSON locale files (fr, ar, en), RTL detection, localStorage persistence.
- **Pagination**: SQL LIMIT/OFFSET with 50 records per page to handle 10K+ documents without crashing.
- **Data Mining**: Pure JS Apriori algorithm (~50KB, `src/renderer/apriori.js`) for association rule mining, payment analysis, and client pattern detection. Runs in the renderer with zero dependencies.
- **Simulation Engine**: `simCalculateTotals()` in `app-features.js` — a pure function mirroring the math-utils.js logic for "what-if" fiscal scenario comparison. No IPC or backend needed.

### 🔒 Privacy & Security
- **Local-First**: All financial data, client lists, and documents stay on your physical machine.
- **Encryption**: User passwords are hashed using **bcrypt** before storage.
- **SMTP Security**: Email credentials are encrypted using **Electron safeStorage**, ensuring hardware-backed protection for your mail server passwords.
- **Input Validation**: All document, client, and expense data is validated server-side before database writes (UUID format, required fields, TVA rates, dates).
- **Cascade Deletes**: Deleting clients or documents automatically cleans up associated payments, retenues, and recurring invoices.
- **No Telemetry**: No tracking, no analytics, no cloud uploads.
- **Recurring Auto-Generation**: A built-in cron checks every hour for due recurring invoices. Generated documents are created automatically with proper numbering and next-run scheduling.

### Keyboard Shortcuts

---

## 4. How It Works (Internal Logic)

### The PDF Generation Engine
Unlike traditional web apps, Factarlou uses a specialized background process to render PDFs. This ensures that the user interface (sidebars, buttons) never appears on the final document, resulting in a perfectly professional A4 file.

### Data Persistence
Data is stored in the user's system application folder (`userData`).
- **macOS**: `~/Library/Application Support/factarlou/`
- **Windows**: `%AppData%\factarlou\`
This ensures that even when the app is updated, your data remains untouched and safe.

### Auto-Update System
The app is integrated with **GitHub Releases** via `electron-updater`. Every time a new version is published, the app detects it (check runs 3 seconds after startup), downloads it in the background, and prompts the user to restart to apply the latest updates.

**Update flow by platform:**
- **Windows**: Update is auto-downloaded, user clicks "Redémarrer maintenant" → `quitAndInstall` runs the installer silently and relaunches the app.
- **macOS**: Update is auto-downloaded to the system temp directory, the DMG is copied to `~/Downloads` with clear instructions. User manually drags the app to Applications.

**Manual check**: Available in Settings → "Vérifier les mises à jour". Correctly detects whether a newer version actually exists (v3.1.0+).

**Error handling**: Update failures (network, GitHub downtime) are shown as visible error toasts in the UI. Download progress is displayed in the Windows taskbar and macOS dock icon.

### Backup System
Backups now include both the SQLite database and the `attachments/` directory (receipt scans, uploaded images). Restoring a backup automatically restores attachments to their original location.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + N` | New invoice |
| `Cmd/Ctrl + Shift + N` | New quote (devis) |
| `Cmd/Ctrl + F` | Focus global search |
| `Cmd/Ctrl + S` | Save current document |
| `Escape` | Close active modal / search |

### System Tray
The app places an icon in the system tray with quick access to: New Invoice, New Devis, Dashboard, and Quit.

### Natural Language Dates
Date inputs accept expressions like `aujourd'hui`, `demain`, `lundi prochain`, `+30d`, `end of month`, `fin de mois`. Parsing supports both French and English.

### Drag & Drop Reordering
Article rows in documents have drag handles (`⠿`). Drag to reorder → items are automatically renumbered and totals recalculated.

### Auto-Complete MF
Typing a client's MF or name in the document form triggers a dropdown with matching clients. Selecting one fills all client fields (name, MF, address, phone, email) instantly.

### i18n Multi-Language
- **Supported**: Français (default), English, العربية
- **Mechanism**: JSON locale files loaded at runtime
- **RTL**: Arabic automatically switches document direction to RTL
- **Persistence**: Language choice saved in localStorage
- **Selector**: Settings page → Language card

### Document Templates
Save any filled document form as a reusable template. Apply a template to pre-fill client info, items, and settings. Access via the "Modèles" button on the document form.

### Configurable PDF Folder
Set a custom default save directory in Settings → Dossier de sortie PDF. All document PDFs will be saved there instead of the default download folder.

### Auto-Backup on Save
Optional toggle in Settings → Sauvegarde. When enabled, a backup is triggered automatically after every document save.

### Paste MF → RNE
Paste a Matricule Fiscal into the client MF field → the app auto-fetches the official company name and address from the RNE public registry.

### Search Across All Pages
Search bars on Clients (name, MF, email, phone), Services (name, description), and Expenses (vendor, category, reference) filter results in real-time.

### Sortable Table Columns
Click column headers (N°, Client, Date, Total TTC) on the documents table to sort ascending or descending. Arrow indicators show the current sort direction.

### Bulk Delete
Multi-select checkboxes + batch delete buttons on Clients and Services pages. Shows confirmation with cascade warning for clients.

### Remember Preferences
The last visited page and last document type are saved to localStorage and automatically restored after login.

### Save & New
A dedicated button that saves the current document and immediately opens a blank form for the next entry.

### Currency Converter
Tool in the Outils section that aggregates all document totals by currency and converts them to a base currency at a user-defined rate. Filterable by period (all, this month, this year).

### Drag & Drop Expense Attachments
Drag PDFs and images directly onto the expense upload zone. The zone highlights on drag-over, accepts valid files, and processes them identically to the file picker.

### Search Across All Pages (Filter Clients/Services/Expenses)
Already documented above.

### Window State Persistence
The app saves its window position, size, and maximized state to `window-state.json` in the user data directory. On relaunch, the window is restored to its last position. If the saved position is off-screen (e.g., after a monitor change), it falls back to the default center.

### Custom Fields on Documents
Add arbitrary key-value pairs to any document via the "Champs personnalisés" section on the document form. Fields are stored as a JSON array in the `custom_fields` column of the `documents` table. They are purely for internal reference and do not appear on the PDF.

### Enhanced Dashboard
The dashboard now includes a monthly revenue vs. expenses line chart and a top 5 clients bar chart. Both charts auto-scale and respond to window resize. Data is computed from documents (revenue from factures/avoirs) and expenses.

### P&L Report (Compte de Résultat)
Opens a print-ready window showing total revenue (factures − avoirs) vs. total expenses for a user-selected year. Displays the net result (profit or loss) as the bottom line.

### Balance Sheet (Bilan Annuel)
Shows assets (receivables from unpaid invoices + collected revenue) and liabilities (net position + total expenses) for the selected year. The net position is calculated as total collected − total expenses.

### TVA Annual Report
A month-by-month table of TVA collectée (from invoices/avoirs) and TVA déductible (from expenses) for the entire year. Each month shows breakdowns by TVA rate (7%, 13%, 19%) with annual totals at the bottom.

### Customizable Email Templates
Subject and body templates for batch email sending are saved to and loaded from localStorage. The "Modèles" button in the batch email modal opens a manager to save (using the current subject/body), load, and delete templates.

### Service Categories
Services can be assigned a category (Service, Produit, Abonnement, Consulting, Autre). A category filter dropdown on the services page allows quick filtering. Categories are stored in the `category` column of the `services` table.

### Internal Notes on Documents
A private notes textarea on the document form stores text in the `internal_notes` column of the `documents` table. These notes are never rendered on the PDF or in the preview — they are for internal reference only.

### Import Clients from Excel
The client import tool reads `.xlsx` files and presents a preview table of the first rows. Column mapping dropdowns auto-detect the correct columns by matching header names (Nom, Name, MF, Matricule, Adresse, Address, etc.). On confirmation, clients are batch-inserted using the same validation as the manual form.

### Export to Excel (XLSX)
Export buttons on the documents, clients, and services pages generate `.xlsx` files using the existing `xlsx` library in the main process. Documents export includes all fields plus client name and totals. Clients and services export their respective table data.

### Graphe Relationnel (Apriori)
The algorithm runs entirely in the renderer process — no IPC, no data leaves the browser. It collects all documents of type `facture`, `devis`, and `bon`, extracts item descriptions from `items_json`, deduplicates per transaction, and runs the Apriori algorithm:
1. **Frequent Itemsets**: Items appearing together above the minimum support threshold
2. **Association Rules**: From frequent itemsets, generates `{A} → {C}` rules with confidence and lift
3. **Sorting**: Rules are sorted by lift (strength of association), then confidence
Results render in a table with visual confidence bars and color-coded strength indicators.

Payment analysis groups documents by each item description found, then computes aggregate payment stats. Client pattern analysis groups documents by `client_name`, then tracks how often each item appears across multiple documents for that client.

### Simulateur de Scénarios
The simulator captures the document's items array and runs a pure calculation function (`simCalculateTotals`) that mirrors the math-utils.js logic but operates on plain data (no DOM). The function supports:
- Multi-rate TVA accumulation (7/13/19%)
- Timbre fiscal (1 TND applied when HT > 1000 and toggle is on)
- Proportional discount (percent applied to all items equally)
- Configurable decimal places and rounding method (half_up/ceil/floor)
- Avoir type awareness (shown as revenue-reducing)
When "Appliquer le scénario" is clicked, the simulated parameters are packaged into a `docData` object, sent via the existing `docs:save` IPC handler, and the document list is refreshed.

---

## 5. Getting Started

### Installation
1. Download the latest installer for your OS (`.dmg` for Mac, `.exe` for Windows).
2. Install as you would any other desktop application.
3. **Register**: Create your first local user (this data never leaves your computer).
4. **Setup**: Go to "Mon Entreprise" to upload your logo, stamp, and signature.

### Daily Workflow
1. **Create Client** → **Generate Devis** → **Convert to Facture** on acceptance.
2. **Scan Receipt** → **Confirm Data** → **Save as Achat**.
3. **Check Dashboard** periodically to monitor unpaid invoices and monthly growth.

---

<p align="center">
  <strong>Factarlou</strong> — The future of Tunisian business management.<br/>
  <em>Built for speed. Built for privacy. Built for you.</em>
</p>
