<h1 align="center">
  🧾 Factarlou
</h1>

<p align="center">
  <strong>La Solution de Facturation Intelligente pour le Marché Tunisien</strong><br/>
  Une application de bureau haute performance, confidentielle et sécurisée pour les entrepreneurs et PME.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.6.0-blue?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" alt="Platform"/>
  <img src="https://img.shields.io/badge/built%20with-Electron-47848F?style=for-the-badge&logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License"/>
</p>

---

## 📖 Aperçu

**Factarlou** est une application de bureau multiplateforme conçue spécifiquement pour répondre aux exigences fiscales et administratives de la Tunisie. Elle gère tout le cycle de vie de votre facturation — de la création de devis à l'exportation XML pour la plateforme TEJ, tout en gardant vos données financières **100% locales et privées**.

---

## ✨ Features (v2.6.0)

### 🇹🇳 Tunisian Fiscal Compliance
- **TEJ XML Export**: Generate regulatory XML files for **Retenue à la Source (RS)** and **Electronic Invoices (TEIF)**.
- **DGF Compliance**: Native generation of official "Certificat de Retenue à la Source".
- **Timbre Fiscal**: Integrated management of the 1.000 TND fiscal stamp.
- **Millimes Precision**: Full 3-decimal place support for all calculations.

### 🧰 Fiscal & Legal Toolkit (Outils)
- **Calculators**: Spontaneous/Rectified penalty calculator, IRPP simulator, and monthly VAT summary.
- **Legal Tools**: Automated **PV d'Assemblée Générale** generator and **Matricule Fiscal** validator.
- **Resources**: Tunisian tax calendar and searchable directory of tax offices (Recettes des Finances).

### 📄 Document & Branding
- **Custom Branding**: Toggle Logo, Stamp, Signature, QR Code, and Accent Bar globally across all documents.
- **Isolated Rendering**: High-fidelity PDF generation ensuring pixel-perfect A4 documents.
- **Multi-Theme**: Modern, Executive, and Tunisian theme presets with full color/font customization.

### 💼 Integrated Management
- **HR & Payroll**: Employee database and monthly **Bulletin de Paie** generation.
- **CRM & Catalog**: Comprehensive client management and unified service/product catalog.
- **Inventory/Scanner**: AI-powered **OCR Scanner** to extract data from physical receipts and attachments.

### 📊 Intelligence & Security
- **Dashboard**: Real-time analytics for Revenue, Expenses, and Tax Liabilities.
- **Local-First**: All data is stored in a local **SQLite** database. No cloud, no tracking.
- **Backups**: Automated encrypted backups with customizable retention policies.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Electron.js v28 |
| **Database** | better-sqlite3 |
| **OCR** | Tesseract.js |
| **XML** | xmlbuilder2 |
| **UI** | Vanilla CSS3 / Modern JS |
| **Security** | bcryptjs |

---

## 📦 Installation

### macOS
1. Download the `.dmg` from the [Releases page](https://github.com/a32116150-ctrl/tuninvoice/releases).
2. Drag **Factarlou** to your `Applications` folder.

### Windows
1. Download the `.exe` installer.
2. Run the installer and follow the setup wizard.

---

## 👨‍💻 Local Development

```bash
# 1. Clone & Install
git clone https://github.com/a32116150-ctrl/tuninvoice.git
npm install

# 2. Start
npm start

# 3. Build
npm run build:mac  # or build:win / build:linux
```

---

<p align="center">
  Built with ❤️ by <strong>Anoir Cherif</strong> in Tunisia 🇹🇳<br/>
  © 2026 Factarlou. All rights reserved.
</p>
