# Release Notes — Factarlou v4.7.0

> **Release Date:** 2026-07-29  
> **Tag:** `v4.7.0`  
> **Target:** Production Release (Tunisian Fiscal Compliance & Enterprise Hardening)

---

## 🚀 Highlights & Key Changes

Factarlou **v4.7.0** brings major enhancements to full compliance with Tunisian tax regulations, strict security hardening, authoritative TVA recordkeeping, and automated payroll calculations.

---

### 1. 🇹🇳 Full Tunisian Fiscal Law Compliance

* **Timbre Fiscal (0.600 TND)**: Updated Timbre Fiscal calculation to **0.600 TND** per document per Finance Law 2018 (Loi n° 2017-66, Art. 44). Removed the ungrounded 1000 TND threshold.
* **Mandatory Invoice PDF Mentions (Code de Commerce Art. 18 & TVA Art. 18)**:
  * Commercial Register (RC), Phone, and Email printed on PDF headers.
  * Unit of measure column (`unité`, `kg`, `heure`, etc.) added to line items table.
  * Explicit per-item TVA% column added.
  * Detailed discount breakdown (Pre-discount subtotal & discount deduction).
  * Explicit **Total TVA** row in total calculations table.
  * Added `proforma` invoice type support.
* **Authoritative `total_tva` Database Storage**: Added dedicated `total_tva` column in the SQLite `documents` table to prevent rounding drift on monthly tax declarations.
* **Strict Matricule Fiscal (MF) Validation**: Enforced official Tunisian format `NNNNNNN/L/L/NNN` (7 digits / code TVA / code catégorie / 3 digits establishment).
* **Retenue à la Source Rates (Art. 52 IRPP/IS Code)**:
  * Added **1%** (achats auprès de fabricants et grossistes) and **20%** (redevances non-résidents avec convention) rates.
  * Standardized section titles (A. Payeur, B. Bénéficiaire, C. Montants).
* **TEJ XML Export Compliance**: Updated XML generator for Retenue à la Source to include `<NatureRevenu>`, `<TauxRetenue>`, `<BaseLegale>`, and `DD/MM/YYYY` date formats.
* **Fiscal Summary TVA Breakdown**: Added per-rate TVA breakdown table (19%, 13%, 7%) to fiscal summary PDFs for monthly tax returns.

---

### 2. 🛡️ Security & Data Integrity Upgrades

* **Invoice Data Retention**: Deleting a client contact no longer cascade-deletes their historical invoices. Invoices are preserved with `client_id = NULL` to comply with tax retention laws.
* **Path Traversal Mitigation**: Hardened media protocol (`protocol.handle`) and file attachment endpoints using canonical `realpathSync` resolution.
* **Persistent Login Rate Limiting**: Added `login_attempts` SQLite table to enforce a 15-minute lockout after 5 consecutive failed attempts, persisting across app restarts.
* **Plaintext Password Removal**: Removed legacy plaintext password fallback.
* **Graceful SQLite Shutdown**: Added explicit `db.close()` on application quit to prevent WAL mode database corruption.
* **Transient PDF Purge**: Automatic cleanup of temporary PDF rendering files on launch and exit.

---

### 3. 💼 Payroll & HR Calculations

* **Automated Tunisian Payroll Deductions**:
  * **Employee CNSS**: 9.18% (régime général)
  * **Employer CNSS**: 16.57% (régime général)
  * **Progressive IRPP**: Annualized tax bracket calculation (0% up to 5,000 TND, 26% up to 20,000 TND, 28% up to 30,000 TND, 32% up to 50,000 TND, 35% above 50,000 TND).
* **Sequential Payslip Reference**: Auto-generated sequential numbering `PE-YYYY-001`.
* **8-Digit CIN Validation**: Validation for Tunisian identity card numbers.

---

## 📦 Technical Details

* **Electron**: v28.0.0
* **SQLite**: WAL mode (`better-sqlite3`) with startup `PRAGMA integrity_check`
* **Version**: `4.7.0`
* **Repository**: [github.com/a32116150-ctrl/tuninvoice](https://github.com/a32116150-ctrl/tuninvoice)
