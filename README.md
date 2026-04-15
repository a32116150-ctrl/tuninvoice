# 🚀 TuniInvoice Pro
**The Ultimate Invoicing Solution for the Tunisian Market.**

TuniInvoice Pro is a high-performance desktop application designed for freelancers and small businesses in Tunisia. Built with **Electron**, **JavaScript**, and **SQLite**, it combines a sleek, modern UI with a powerful local database to manage quotes, invoices, and clients with zero latency.

---

## ✨ Key Features
* **Local-First Privacy:** All your data stays on your machine in a secure SQLite database.
* **Premium PDF Engine:** Generate professional, branded invoices ready for printing or email.
* **Automatic Backups:** Integrated scheduler to ensure your financial data is never lost.
* **Cross-Platform:** Native installers available for both **macOS** and **Windows**.
* **Auto-Update Ready:** Built-in support for seamless version upgrades via GitHub.

---

## 🛠️ Tech Stack
* **Framework:** Electron.js
* **Database:** Better-SQLite3
* **Exports:** ExcelJS & PDFKit
* **Build System:** GitHub Actions (CI/CD)

---

## 🚀 How to Install

### For Windows
1. Go to the [Releases](https://github.com/a32116150-ctrl/tuninvoice/releases) page.
2. Download `TuniInvoice-Pro-Setup-1.0.2.exe`.
3. Run the installer and follow the prompts.

### For macOS
1. Go to the [Releases](https://github.com/a32116150-ctrl/tuninvoice/releases) page.
2. Download `TuniInvoice-Pro-1.0.2.dmg`.
3. Open the DMG and drag the app to your **Applications** folder.
4. *Note: As the app is currently unsigned, you may need to Right-Click > Open for the first run.*

---

## 👨‍💻 Development
If you want to run the project locally:

```bash
# Clone the repo
git clone [https://github.com/a32116150-ctrl/tuninvoice.git](https://github.com/a32116150-ctrl/tuninvoice.git)

# Install dependencies
npm install

# Run in development mode
npm start

# Build for Mac/Windows
npm run build
