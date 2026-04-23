# Factarlou (TuniInvoice Pro) - Project Memory

## Project Overview
- **App Name**: Factarlou (Product Name) / TuniInvoice Pro (Internal Name)
- **Version**: 2.6.0
- **Description**: A comprehensive, high-performance desktop application tailored for the Tunisian market to manage invoicing, taxation (Retenue), and business operations.
- **Tech Stack**: 
  - **Framework**: Electron (v28+)
  - **Database**: SQLite (`better-sqlite3`) for robust local data storage.
  - **OCR Engine**: `Tesseract.js` for scanning and text extraction.
  - **Logic**: Node.js / Modern JavaScript.
  - **Styling**: Vanilla CSS with a premium, dark-mode-ready design system.

## Critical Recent Fixes

### 1. Missing Document Stamps on Windows PDFs (Fixed 2026-04-22)
- **Issue**: Company stamps and signatures were failing to appear on exported PDFs in the Windows version, though they worked on macOS.
- **Root Cause**: 
  1. **URL Truncation**: Using `data:` URLs to load HTML in the hidden PDF window hit Chromium's URL length limits on Windows (especially with multiple large base64 images).
  2. **Race Condition**: The PDF capture was triggered before large images (like stamps) were fully decoded by the renderer.
- **Solution**:
  - **Temp Files**: Replaced `loadURL('data:...')` with `loadFile()` using temporary HTML files stored in the system temp folder.
  - **Image Sync**: Implemented an `executeJavaScript` hook that waits for all document images to complete loading (`img.complete` or `onload`) before triggering `printToPDF`.
  - **Location**: `src/main.js` (Handlers: `pdf:save`, `pdf:print`, `pdf:generateBuffer`).

## Key Features & Modules (v2.6.0 Updates)

### 📄 Invoicing & Document Management
- **Document Types**: Professional generation of Invoices (Factures), Quotes (Devis), and Purchase Orders (Bons de Commande).
- **Taxation**: Integrated calculation of Tunisian TVA (19%, 13%, 7%, 0%) and "Timbre Fiscal".
- **Multi-Theme**: Modern and professional layout options with customizable colors and fonts.
- **Partial Payments**: Track payments (Virement, Chèque, Espèces) with status updates (Unpaid, Partial, Paid).

### 🏦 Taxation (Retenue à la Source)
- **DGF Compliance**: Generates official Tunisian "Certificat de Retenue à la Source" in the required Ministry of Finance format.
- **Auto-Conversion**: One-click conversion from a Facture to a Retenue certificate.

### 👥 Client & Service Management
- **CRM**: Detailed client profiles including MF, RIB, Credit Limits, and Categories.
- **Catalog**: Unified service/product catalog for rapid document filling.
- **History**: View transaction history and balances per client.

### 💼 HR & Payroll
- **Employees**: Employee database with CIN, CNSS, and Role tracking.
- **Payslips**: Generation of monthly "Bulletin de Paie" with IRPP and CNSS calculations.

### 📊 Intelligence & Tools
- **Dashboard**: Real-time stats on revenue, expenses, and tax liabilities.
- **Scanner/OCR**: Built-in support for scanning attachments and extracting text using AI.
- **Excel Export**: Bulk export of documents and client data for accounting software.
- **Relance**: Automated generation of payment reminder letters (Relance 1, 2, and Mise en Demeure).

### 🔐 Security & Maintenance
- **Data Safety**: Automated local backups with retention settings.
- **Access Control**: Encrypted password protection and master key recovery.
- **Auto-Updater**: Integrated update system for seamless version upgrades.

## Important File Paths
- **Main Process**: `src/main.js` (IPC handlers, PDF generation, Window management)
- **Database Logic**: `src/database/db.js` (Schema, CRUD operations, SQL queries)
- **UI Logic**: `src/renderer/app.js` (State management, UI interactions, form handling)
- **Theming**: `src/renderer/Themes.js` & `src/renderer/retenue-builder.js` (Templates)

## Ongoing Reminders
- **PDF Export**: Always use the `handlePDFGeneration` helper in `main.js` to ensure Windows compatibility.
- **Database Schema**: Hardened initialization in `db.js` ensures migrations don't crash the app on startup.
- **Images**: Company logo, stamp, and signature are stored as Base64 in the `companies` table.
 