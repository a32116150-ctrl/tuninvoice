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
- **Database**: SQLite (via `better-sqlite3`) for robust, local data storage.
- **OCR Engine**: Tesseract.js (Optical Character Recognition).
- **PDF Engine**: Isolated Electron background process for pixel-perfect A4 rendering.

### 🔒 Privacy & Security
- **Local-First**: All financial data, client lists, and documents stay on your physical machine.
- **Encryption**: User passwords are hashed using **bcrypt** before storage.
- **SMTP Security**: Email credentials are encrypted using **Electron safeStorage**, ensuring hardware-backed protection for your mail server passwords.
- **No Telemetry**: No tracking, no analytics, no cloud uploads.

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
The app is integrated with **GitHub Releases**. Every time a new version is published, the app detects it, downloads it in the background, and prompts the user to restart to apply the latest fiscal updates or new features.

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
