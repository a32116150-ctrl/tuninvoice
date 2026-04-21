<h1 align="center">
  🧾 Factarlou
</h1>

<p align="center">
  <strong>La Solution de Facturation Intelligente pour le Marché Tunisien</strong><br/>
  Une application de bureau haute performance, confidentielle et sécurisée pour les entrepreneurs et PME.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.6.0-blue?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" alt="Platform"/>
  <img src="https://img.shields.io/badge/built%20with-Electron-47848F?style=for-the-badge&logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License"/>
</p>

---

## 📖 Aperçu

**Factarlou** est une application de bureau multiplateforme construite avec **Electron.js**, conçue spécifiquement pour le marché tunisien. Elle gère tout le cycle de vie de votre facturation — de la création de devis à la conversion en factures conformes, tout en gardant vos données financières **100% locales et privées**.

Pour un guide complet des fonctionnalités, consultez le fichier [FEATURES_GUIDE.md](./FEATURES_GUIDE.md).

---

## ✨ Features

### 🏗️ Advanced PDF Rendering Engine
- Invoices are generated in an **isolated background process** — no UI chrome, sidebars, or buttons ever bleed into your documents.
- **Pixel-perfect A4 layouts** ready for high-quality printing or digital sharing.

### 🇹🇳 Tunisian Fiscal Compliance
- **Timbre Fiscal**: Native support for the `1.000 TND` fiscal stamp.
- **Millimes Precision**: Configurable currency precision (up to 3 decimal places) to meet Tunisian accounting standards.
- Full support for **TVA (VAT)** and **Retenue à la Source** calculations.

### 📄 Document Management
- Create, edit, and manage **Invoices (Factures)** and **Quotes (Devis)**.
- **One-click quote-to-invoice conversion** with a complete audit trail.
- Generate **Retenue à la Source** certificates.
- Generate professional **Contracts** from within the app.

### 📊 Data Export
- Export financial data to **CSV** or **Excel (.xlsx)** for accounting or archival purposes.
- **Scheduled automatic backups** via the built-in backup scheduler (`node-cron`).

### 🎨 Theming & UX
- Multiple UI **themes** supported via `Themes.js`.
- Clean, modern interface built with vanilla **CSS3**, including print media support.
- **Auto-updates** delivered seamlessly through GitHub Releases.

### 🔒 Privacy & Security
- All data stored **locally** in a secure **SQLite** database (`better-sqlite3`).
- **No telemetry, no cloud sync, no external data uploads.**
- Passwords hashed with **bcrypt** (`bcryptjs`).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | [Electron.js](https://www.electronjs.org/) v28 |
| **Database** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **Scheduling** | [node-cron](https://github.com/node-cron/node-cron) |
| **Auth** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Export** | [xlsx](https://github.com/SheetJS/sheetjs) |
| **Archiving** | [archiver](https://github.com/archiverjs/node-archiver) |
| **IDs** | [uuid](https://github.com/uuidjs/uuid) |
| **Build** | [electron-builder](https://www.electron.build/) |
| **CI/CD** | GitHub Actions |
| **Styling** | Vanilla CSS3 (with Print Media support) |

---

## 📦 Installation

### macOS *(Recommended)*
1. Download the latest `.dmg` from the [Releases page](https://github.com/a32116150-ctrl/tuninvoice/releases).
2. Open the `.dmg` and drag **TuniInvoice Pro** to your `Applications` folder.
3. **First launch**: Right-click the app → **Open** to bypass Gatekeeper for unsigned apps.

### Windows
1. Download the `.exe` installer from the [Releases page](https://github.com/a32116150-ctrl/tuninvoice/releases).
2. Run the installer and follow the on-screen steps.
3. A desktop shortcut will be created automatically.

### Linux
1. Download the `.AppImage` or `.deb` from the [Releases page](https://github.com/a32116150-ctrl/tuninvoice/releases).
2. For `.AppImage`: make it executable and run it directly.
   ```bash
   chmod +x TuniInvoice-Pro.AppImage
   ./TuniInvoice-Pro.AppImage
   ```

---

## 👨‍💻 Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- npm

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/a32116150-ctrl/tuninvoice.git
cd tuninvoice

# 2. Install dependencies
npm install

# 3. Launch the app in development mode
npm start
```

### Building for Production

```bash
# macOS (Intel + Apple Silicon)
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

Built artifacts are output to the `dist/` directory.

---

## 🗂️ Project Structure

```
tuniinvoice-desktop/
├── assets/                  # App icons and static assets
├── src/
│   ├── main.js              # Electron main process & IPC handlers
│   ├── preload.js           # Secure context bridge (renderer ↔ main)
│   ├── backup-scheduler.js  # Automated backup cron job
│   ├── database/
│   │   └── db.js            # SQLite database logic & queries
│   ├── exporters/
│   │   ├── csv-exporter.js  # CSV export functionality
│   │   └── excel-exporter.js# Excel (.xlsx) export functionality
│   └── renderer/
│       ├── index.html       # Main application shell
│       ├── app.js           # Renderer process logic
│       ├── styles.css       # Application styles
│       ├── Themes.js        # Theme definitions
│       ├── contract-builder.js   # Contract document generator
│       ├── retenue-builder.js    # Retenue à la Source builder
│       └── builders/
│           └── invoice-builder.js # Invoice/PDF builder (isolated)
├── package.json
└── README.md
```

---

## 🔐 Privacy & Security

TuniInvoice Pro is built on the principle of **local-first data**:

- ✅ Your database lives in your system's **Application Support** folder.
- ✅ No data is ever sent to an external server.
- ✅ No analytics or tracking of any kind.
- ✅ Passwords are protected with **bcrypt hashing**.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the Tunisian fiscal logic, add new templates, or enhance the UI:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a **Pull Request**.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <strong>Anoir Cherif</strong> in Tunisia 🇹🇳<br/>
  © 2026 TuniInvoice Pro. All rights reserved.
</p>
