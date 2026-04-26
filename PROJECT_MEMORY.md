# Factarlou (TuniInvoice Pro) - Project Memory

## Project Overview
- **App Name**: Factarlou (Product Name) / TuniInvoice Pro (Internal Name)
- **Version**: 2.6.1
- **Description**: A comprehensive, high-performance desktop application tailored for the Tunisian market to manage invoicing, taxation (Retenue), and business operations.
- **Tech Stack**: 
  - **Framework**: Electron (v28+)
  - **Database**: SQLite (`better-sqlite3`) for robust local data storage.
  - **OCR Engine**: `Tesseract.js` for scanning and text extraction.
  - **Logic**: Node.js / Modern JavaScript.
  - **Styling**: Vanilla CSS with a premium design system.

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

## Key Modules

### 📄 Document Engine
- **Templates**: Professional templates in `src/renderer/builders/invoice-builder.js` and `retenue-builder.js`.
- **Types**: Full support for Facture, Avoir, Devis, BL, BA, BS, BE, and Bon de commande.
- **Logic**: Support for FODEC, Timbre Fiscal, mixed TVA rates, and negative Avoir reconciliation.

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