# Factarlou v4.5.0 — Production Audit & Implementation Plan

> **Created:** 2026-07-29 | **Status:** IN PROGRESS — Criticals First
> **Context:** Full code audit for production readiness per Tunisian fiscal law
> **How to use:** Give this file to any AI assistant to continue implementation.

---

## Table of Contents

1. [Issue Summary](#issue-summary)
2. [CRITICAL FIXES — Phase 1](#critical-fixes--phase-1) (18 issues, do these FIRST)
3. [HIGH FIXES — Phase 2](#high-fixes--phase-2) (21 issues)
4. [MEDIUM/LOW — Phase 3](#mediumlow--phase-3) (24 issues)
5. [Progress Tracker](#progress-tracker)

---

## Issue Summary

| Category | 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | Total |
|----------|------------|---------|-----------|--------|-------|
| A. Tunisian Fiscal Compliance | 6 | 5 | 4 | 2 | 17 |
| B. Calculation Accuracy | 3 | 4 | 2 | — | 9 |
| C. Security & Data Protection | 4 | 3 | 2 | — | 9 |
| D. Code Architecture & Bugs | 2 | 4 | 5 | 3 | 14 |
| E. Production Readiness | 1 | 3 | 3 | 2 | 9 |
| F. HR/Payroll Module | 2 | 2 | 1 | — | 5 |
| **Total** | **18** | **21** | **17** | **7** | **63** |

---

## CRITICAL FIXES — Phase 1

> These 18 issues MUST be fixed before production release.
> Work through them in order. Each has the exact file, line, current code, and fix.

---

### 🔴 CRIT-01: Timbre Fiscal Amount is Wrong

- **Status:** `[ ]` TODO
- **Files:** `src/math-utils.js` line 72, `src/renderer/app-features.js` line 893
- **Law:** Finance Law 2018 (Loi n° 2017-66), Art. 44

**Current code (math-utils.js:72):**
```javascript
const timbreAmount = applyTimbre && totalHT > 1000 ? 1.0 : 0;
```

**Problem:** 
- Tunisian law sets timbre fiscal at **0.600 TND** for commercial invoices
- The `> 1000` threshold has NO legal basis — timbre applies to ALL invoices
- 1.000 TND is only for banking/insurance operations

**Fix — math-utils.js line 72:**
```javascript
const timbreAmount = applyTimbre ? 0.600 : 0;
```

**Fix — app-features.js line 893:**
```javascript
// FIND:
timbreAmount = applyTimbre && totalHTRaw > 1000 ? 1.0 : 0;
// REPLACE WITH:
timbreAmount = applyTimbre ? 0.600 : 0;
```

**Also search for:** Any other occurrence of `> 1000 ? 1.0` in the codebase and fix them too.

---

### 🔴 CRIT-02: Invoice PDF Missing Legally Required Fields

- **Status:** `[ ]` TODO
- **File:** `src/renderer/builders/invoice-builder.js`
- **Law:** Code de Commerce Art. 18, Code de la TVA Art. 18

**Missing fields that MUST appear on every invoice PDF:**

| Field | Status | How to Fix |
|-------|--------|-----------|
| Seller phone | ❌ Missing | Add `data.companyPhone` to header |
| Seller email | ❌ Missing | Add `data.companyEmail` to header |
| Seller RC (Registre de Commerce) | ❌ Missing | Add `data.companyRC` to header |
| TVA rate per line item | ❌ Missing | Add TVA% column to items table |
| Unit of measure | ❌ Missing | Add unit column (requires schema: items need `unit` field) |
| Discount line | ❌ Missing | Show pre-discount subtotal + discount amount |
| Payment terms text | ⚠️ Partial | Add "Paiement à 30 jours" or custom text |
| Total TVA explicitly | ⚠️ Partial | Add a "Total TVA" row in fiscal summary |

**Fix — in `buildInvoiceHTML()` function:**

1. **Add seller contact info to header:**
```html
<!-- After companyAddress div, add: -->
${data.companyPhone ? `<div style="color:#666;">Tél: ${esc(data.companyPhone)}</div>` : ''}
${data.companyEmail ? `<div style="color:#666;">${esc(data.companyEmail)}</div>` : ''}
${data.companyRC ? `<div style="color:#666;">RC: ${esc(data.companyRC)}</div>` : ''}
```

2. **Add TVA% column to items table:**
```html
<!-- In thead, add after Montant HT: -->
<th style="width:60px;">TVA %</th>

<!-- In item rows, add after total column: -->
<td>${item.tva}%</td>
```

3. **Add discount display before totals:**
```html
${data.discountPercent > 0 ? `
<tr>
    <td>Sous-total HT avant remise</td>
    <td>${fmt(data.totalHT / (1 - data.discountPercent/100))}</td>
</tr>
<tr style="color:#dc2626">
    <td>Remise ${data.discountPercent}%</td>
    <td>-${fmt(data.totalHT / (1 - data.discountPercent/100) - data.totalHT)}</td>
</tr>` : ''}
```

4. **Add explicit Total TVA row:**
```html
<!-- After all TVA line rows, before timbre, add: -->
<tr>
    <td>Total TVA</td>
    <td>${fmt((data.tvaLines || []).reduce((s, l) => s + l.tvaAmount, 0))}</td>
</tr>
```

---

### 🔴 CRIT-03: No `total_tva` Column in Database

- **Status:** `[ ]` TODO
- **File:** `src/database/db.js`

**Problem:** The `documents` table stores `total_ht` and `total_ttc` but NOT `total_tva`. TVA is derived by `totalTTC - totalHT - timbre` which has rounding errors. For monthly TVA declarations, this is unacceptable.

**Fix — Add migration in `runMigrations()` (db.js, after line ~96):**
```javascript
tryAlter('ALTER TABLE documents ADD COLUMN total_tva REAL DEFAULT 0');
```

**Fix — Update `saveDocument()` (db.js ~448):**
Add `total_tva` to the INSERT/UPDATE statements. Store the authoritative TVA value at save time.

**Fix — Update `formatDocument()` (db.js ~570):**
```javascript
totalTVA: doc.total_tva || 0,
```

**Fix — Update `saveDocument` vals array** to include `docData.totalTVA || 0`.

---

### 🔴 CRIT-04: MF (Matricule Fiscal) Validation Accepts Anything

- **Status:** `[ ]` TODO
- **File:** `src/validate.js` lines 31-33

**Current code:**
```javascript
function isMF(v) {
    if (!v) return true;
    return typeof v === 'string' && v.length <= 20;
}
```

**Problem:** Tunisian MF format is strictly `NNNNNNN/L/L/NNN` (7 digits / letter / letter / 3 digits). Current validation accepts "hello" as a valid MF.

**Fix:**
```javascript
function isMF(v) {
    if (!v) return true; // MF is optional for some clients
    // Tunisian MF: 7 digits / 1 letter (code TVA) / 1 letter (catégorie) / 3 digits (n° établissement)
    // Also accept without slashes: 7+1+1+3 = 12 alphanumeric
    return /^\d{7}\/[A-Z]\/[A-Z]\/\d{3}$/.test(v.toUpperCase())
        || /^\d{7}[A-Z][A-Z]\d{3}$/.test(v.toUpperCase());
}
```

---

### 🔴 CRIT-05: Retenue à la Source Missing Required Rates

- **Status:** `[ ]` TODO
- **File:** `src/renderer/retenue-builder.js` lines 661-668

**Current rates:** 1.5%, 2.5%, 3%, 5%, 10%, 15%, 25%
**Missing per Art. 52 IRPP/IS Code:**
- **1%** — Achats auprès de fabricants/grossistes
- **20%** — Redevances versées à des non-résidents

**Fix — Replace `TAUX_RETENUE` array (line 661):**
```javascript
const TAUX_RETENUE = [
    { value: 1, label: '1% — Achats auprès de fabricants et grossistes' },
    { value: 1.5, label: '1.5% — Honoraires & commissions (personnes morales résidentes)' },
    { value: 2.5, label: '2.5% — Honoraires (personnes physiques, hors régime réel)' },
    { value: 3, label: '3% — Loyers immobiliers / revenus fonciers' },
    { value: 5, label: '5% — Travaux / services (non-résidents)' },
    { value: 10, label: '10% — Dividendes / valeurs mobilières' },
    { value: 15, label: '15% — Intérêts / capitaux mobiliers' },
    { value: 20, label: '20% — Redevances (non-résidents avec convention)' },
    { value: 25, label: '25% — Paiements à non-résidents (sans convention)' }
];
```

---

### 🔴 CRIT-06: TEJ/XML Export Schema Non-Compliant with DGF

- **Status:** `[ ]` TODO
- **File:** `src/main.js` lines 1939-2040

**Missing DGF-required fields in RS (Retenue) XML:**
- `<NatureRevenu>` — nature of income
- `<TauxRetenue>` — withholding rate
- `<BaseLegale>` — legal basis
- `<Periode>` — month/year per certificate
- Date format should be `DD/MM/YYYY`, not ISO `YYYY-MM-DD`

**Fix — Update the RS XML builder (main.js ~1964):**
```javascript
root.ele('Certificat')
    .ele('Beneficiaire')
        .ele('Identifiant').txt(item.beneficiaire_mf || '').up()
        .ele('NomPrenomRaisonSociale').txt(item.beneficiaire_name || '').up()
    .up()
    .ele('DetailsCertificat')
        .ele('DateCertificat').txt(formatDateDGF(item.date)).up() // DD/MM/YYYY
        .ele('NatureRevenu').txt(item.nature_revenu || 'Honoraires et commissions').up()
        .ele('MontantBrut').txt((item.montant_brut || 0).toFixed(3)).up()
        .ele('TauxRetenue').txt((item.taux_retenue || 1.5).toFixed(2)).up()
        .ele('MontantRetenue').txt((item.montant_retenue || 0).toFixed(3)).up()
        .ele('BaseLegale').txt(item.base_legale || "Art. 52 du Code de l'IRPP et de l'IS").up()
    .up()
.up();
```

Add date format helper:
```javascript
function formatDateDGF(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
```

---

### 🔴 CRIT-07: Duplicate TVA Calculation Logic (3 Copies)

- **Status:** `[ ]` TODO
- **Files:** 
  - `src/renderer/app-features.js` lines 866-897 (renderer calculation)
  - `src/math-utils.js` lines 28-93 (centralized module — NOT USED by renderer)
  - `src/main.js` lines 670-685 (PDF builder calculation)

**Problem:** `math-utils.js` was created to centralize calculations but the renderer never uses it. The renderer has its own hardcoded logic that can drift.

**Fix approach:**
1. Expose `calculateTotals` and `formatAmount` from `math-utils.js` via preload.js
2. Replace the inline calculation in `app-features.js:calculateTotals()` with a call to the centralized version
3. Replace the inline calculation in `main.js:docs:buildHTML` with the centralized version

**Step 1 — Add to preload.js:**
```javascript
// ── MATH UTILS ──────────────────────────────────────────────────
calculateTotals: params => invoke('math:calculateTotals', params),
formatAmount: params => invoke('math:formatAmount', params),
```

**Step 2 — Add IPC handler in main.js:**
```javascript
const { calculateTotals, formatAmount } = require('./math-utils');

ipcMain.handle('math:calculateTotals', async (_, { items, options }) => {
    return calculateTotals(items, options);
});
ipcMain.handle('math:formatAmount', async (_, { value, decimalPlaces }) => {
    return formatAmount(value, decimalPlaces);
});
```

**Step 3 — In app-features.js, replace the inline `calculateTotals()` function** to call `window.electronAPI.calculateTotals()` or inline the same logic from math-utils.js directly (since it's a renderer-side function, importing may be simpler by copy-pasting the canonical version).

---

### 🔴 CRIT-08: Rounding Method Not Applied in Renderer

- **Status:** `[ ]` TODO
- **File:** `src/renderer/app-features.js` line ~900

**Problem:** User configures `rounding_method` in settings (half_up/ceil/floor) but the renderer always uses `Math.round()`.

**Fix:** Read the user's rounding setting and apply it. The `roundValue()` function in app-features.js should respect the setting:
```javascript
function roundValue(value) {
    const factor = Math.pow(10, currentDecimalPlaces);
    if (currentRoundingMethod === 'ceil') return Math.ceil(value * factor) / factor;
    if (currentRoundingMethod === 'floor') return Math.floor(value * factor) / factor;
    return Math.round(value * factor) / factor;
}
```

---

### 🔴 CRIT-09: Discount Applied After TVA (Wrong per Law)

- **Status:** `[ ]` TODO
- **File:** `src/math-utils.js` lines 53-66

**Problem:** Discount is applied as a ratio to totalHT and TVA amounts proportionally. Tunisian fiscal law requires discounts per line item BEFORE TVA calculation.

**Fix:** Apply discount to each line item's HT amount before computing TVA:
```javascript
// Instead of proportional reduction after, apply per-line:
(items || []).forEach(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const tva = parseTVARate(item.tva);
    let lineHT = qty * price;
    
    // Apply discount per-line
    if (discountPercent > 0) lineHT *= (1 - discountPercent / 100);
    if (discountAmount > 0 && totalHTRaw > 0) lineHT *= (1 - discountAmount / totalHTRawPreDiscount);
    
    totalHTAfterDiscount += lineHT;
    if (!tvaByRate[tva]) tvaByRate[tva] = { baseHT: 0, tvaAmount: 0 };
    tvaByRate[tva].baseHT += lineHT;
    tvaByRate[tva].tvaAmount += (lineHT * tva) / 100;
});
```

---

### 🔴 CRIT-10: Password Plaintext Fallback in Login

- **Status:** `[ ]` TODO
- **File:** `src/database/db.js` lines 354-361

**Current code:**
```javascript
try {
    match = bcrypt.compareSync(password, user.password_hash);
} catch (e) {
    if (password === user.password_hash) {
        match = true;
        this.db.prepare('UPDATE users SET password_hash=? WHERE id=?')
            .run(bcrypt.hashSync(password, 10), user.id);
    }
}
```

**Problem:** If bcrypt throws (corrupt hash), the code falls back to plaintext comparison. This is a security hole.

**Fix:**
```javascript
try {
    match = bcrypt.compareSync(password, user.password_hash);
} catch (e) {
    console.error('[auth] bcrypt error, rejecting login:', e.message);
    match = false;
}
```

---

### 🔴 CRIT-11: SMTP Password Decryption Fails Silently

- **Status:** `[ ]` TODO
- **File:** `src/main.js` lines 891-895

**Current code:**
```javascript
try {
    settings.smtp_pass = safeStorage.decryptString(Buffer.from(settings.smtp_pass, 'base64'));
} catch {}  // Silent — returns encrypted blob as "password"
```

**Fix:**
```javascript
if (settings.smtp_pass && safeStorage.isEncryptionAvailable()) {
    try {
        settings.smtp_pass = safeStorage.decryptString(Buffer.from(settings.smtp_pass, 'base64'));
    } catch (e) {
        console.error('[settings] SMTP password decryption failed:', e.message);
        settings.smtp_pass = ''; // Clear rather than leak encrypted blob
        settings._smtp_decrypt_error = true; // Flag for UI to show warning
    }
}
```

---

### 🔴 CRIT-12: No User Ownership Verification on Document Operations

- **Status:** `[ ]` TODO
- **File:** `src/database/db.js`

**Problem:** `getDocumentById`, `deleteDocument` don't verify the requesting user owns the document. Any authenticated user can access any document by guessing IDs.

**Fix — Update `deleteDocument` (db.js ~542):**
```javascript
deleteDocument(docId, userId) {
    if (userId) {
        const doc = this.db.prepare('SELECT id FROM documents WHERE id=? AND user_id=?').get(docId, userId);
        if (!doc) throw new Error('Document introuvable ou accès non autorisé');
    }
    this.db.prepare('DELETE FROM payments WHERE document_id=?').run(docId);
    this.db.prepare('DELETE FROM retenues WHERE facture_id=?').run(docId);
    this.db.prepare('DELETE FROM recurring_invoices WHERE template_id=?').run(docId);
    this.db.prepare('DELETE FROM documents WHERE id=?').run(docId);
}
```

**Then update all IPC handlers** to pass `userId` from the caller.

---

### 🔴 CRIT-13: `updateStock` Method Name Collision

- **Status:** `[ ]` TODO
- **File:** `src/database/db.js` lines 1254 and 1992

**Problem:** Two methods with the SAME name `updateStock` but different signatures:
- Line 1254: `updateStock(updates)` — array of {id, qty}, ADDS to stock
- Line 1992: `updateStock(id, quantity)` — single item, SETS stock absolutely

JavaScript class uses the LAST definition, so the first one is invisible. The `services:updateStock` IPC handler calls with an array, but it hits the second method expecting `(id, quantity)`.

**Fix — Rename to disambiguate:**
```javascript
// Line 1254 — rename to addStock:
addStockBatch(updates) {
    const stmt = this.db.prepare('UPDATE services SET stock = stock + ? WHERE id = ?');
    const transaction = this.db.transaction((items) => {
        for (const item of items) {
            stmt.run(item.qty, item.id);
        }
    });
    transaction(updates);
}

// Line 1992 — rename to setStock:
setStock(id, quantity) {
    this.db.prepare('UPDATE services SET stock=? WHERE id=?').run(quantity, id);
}
```

**Then update IPC handlers in main.js:**
- `services:updateStock` → `db.addStockBatch(updates)`
- `pos:updateStock` → `db.setStock(id, quantity)`

---

### 🔴 CRIT-14: No Database Transaction for Save + Counter

- **Status:** `[ ]` TODO
- **File:** `src/database/db.js` `saveDocument()` method (~line 448)

**Problem:** `saveDocument()` calls `getNextDocumentNumber()` which increments the counter, then does the INSERT. If the INSERT fails, the counter is already incremented → number gap (illegal per Tunisian law).

**Fix — Wrap in transaction:**
```javascript
saveDocument(docData) {
    const saveTransaction = this.db.transaction(() => {
        const id = docData.id || uuidv4();
        const number = docData.number || this.getNextDocumentNumber(docData.userId, docData.type, new Date().getFullYear());
        // ... rest of save logic
    });
    return saveTransaction();
}
```

---

### 🔴 CRIT-15: No Data Integrity Check on Startup

- **Status:** `[ ]` TODO
- **File:** `src/database/db.js` constructor (~line 9)

**Fix — Add after `this.db.pragma('foreign_keys = ON');`:**
```javascript
// Verify database integrity
const integrityResult = this.db.pragma('integrity_check');
if (integrityResult[0]?.integrity_check !== 'ok') {
    console.error('[DB] Database integrity check FAILED:', integrityResult);
    // Could throw or prompt user to restore backup
}
```

---

### 🔴 CRIT-16: `totalTTC` Self-Reference Bug

- **Status:** `[ ]` TODO
- **File:** `src/main.js` line 727

**Current code:**
```javascript
totalTTC: doc.totalTTC || doc.totalTTC || 0,
```

**Fix:**
```javascript
totalTTC: doc.totalTTC || 0,
```

---

### 🔴 CRIT-17: `paymentStatus: 'impaye'` vs `'unpaid'` Mismatch

- **Status:** `[ ]` TODO
- **File:** `src/main.js` line 1853

**Current code (recurring invoice generator):**
```javascript
paymentStatus: 'impaye'
```

**Problem:** Validator only accepts `'unpaid'`, `'paid'`, `'partial'`. French value `'impaye'` is rejected.

**Fix:**
```javascript
paymentStatus: 'unpaid'
```

---

### 🔴 CRIT-18: CNSS/IRPP Payroll Not Auto-Calculated

- **Status:** `[ ]` TODO
- **Files:** `src/renderer/retenue-builder.js` (payslip HTML), `src/database/db.js` (payslip save)

**Problem:** The app stores `cnss_deduction` and `irpp_deduction` as user-entered values. It should auto-calculate per law:

**CNSS Employee = 9.18% × gross salary** (régime général)

**IRPP progressive brackets (annual):**

| Tranche (TND/year) | Rate |
|---------------------|------|
| 0 — 5,000 | 0% |
| 5,001 — 20,000 | 26% |
| 20,001 — 30,000 | 28% |
| 30,001 — 50,000 | 32% |
| > 50,000 | 35% |

**Fix — Create helper function (add to math-utils.js or new payroll-utils.js):**
```javascript
function calculatePayroll(grossSalary, options = {}) {
    const { transportAllowance = 0, otherAllowances = 0 } = options;
    
    const totalGross = grossSalary + transportAllowance + otherAllowances;
    
    // CNSS employee contribution: 9.18% of gross
    const cnssDeduction = Math.round(totalGross * 0.0918 * 1000) / 1000;
    
    // Taxable income = gross - CNSS
    const taxableMonthly = totalGross - cnssDeduction;
    const taxableAnnual = taxableMonthly * 12;
    
    // IRPP (progressive brackets)
    let irppAnnual = 0;
    if (taxableAnnual > 50000) irppAnnual += (taxableAnnual - 50000) * 0.35;
    if (taxableAnnual > 30000) irppAnnual += (Math.min(taxableAnnual, 50000) - 30000) * 0.32;
    if (taxableAnnual > 20000) irppAnnual += (Math.min(taxableAnnual, 30000) - 20000) * 0.28;
    if (taxableAnnual > 5000) irppAnnual += (Math.min(taxableAnnual, 20000) - 5000) * 0.26;
    // 0 — 5000 = 0%
    
    const irppMonthly = Math.round((irppAnnual / 12) * 1000) / 1000;
    const netSalary = totalGross - cnssDeduction - irppMonthly;
    
    return {
        grossSalary: totalGross,
        cnssDeduction,
        irppDeduction: irppMonthly,
        netSalary: Math.round(netSalary * 1000) / 1000,
        // Employer side (for reference)
        employerCNSS: Math.round(totalGross * 0.1657 * 1000) / 1000
    };
}
```

---

## HIGH FIXES — Phase 2

> Do these AFTER all criticals are done.

| ID | Issue | File | Line |
|----|-------|------|------|
| H-01 | Avoir not linked bi-directionally | main.js | 570-593 |
| H-02 | Invoice PDF missing discount display | invoice-builder.js | full file |
| H-03 | Fiscal summary missing TVA breakdown | retenue-builder.js | 462-519 |
| H-04 | No proforma invoice type | validate.js | line 3 |
| H-05 | Login rate limit is in-memory only | main.js | 488-514 |
| H-06 | File path traversal in scanner:storeFile | main.js | 1542-1554 |
| H-07 | Master key shown once then lost | db.js | 336-347 |
| H-08 | registerFileProtocol deprecated | main.js | 106 |
| H-09 | globalShortcut Ctrl+F hijacks system | main.js | 226-231 |
| H-10 | deleteClient cascade-deletes invoices | db.js | 976-986 |
| H-11 | Auto-updater downloads without verify | main.js | 247 |
| H-12 | No graceful DB shutdown | main.js | no handler |
| H-13 | Temp PDF files never cleaned | main.js | 744-748 |
| H-14 | POS sale doesn't apply timbre | main.js | 1421-1466 |
| H-15 | Floating point precision in money | all calculation files |  |
| H-16 | formatAmount round+toFixed edge case | math-utils.js | 98-101 |
| H-17 | No employer CNSS contribution tracked | db.js payslips | — |
| H-18 | No payslip sequential numbering | db.js | — |
| H-19 | Exchange rates stored but never used | db.js, app-features.js | — |
| H-20 | rejectUnauthorized:false in SMTP test | main.js | 1303 |
| H-21 | Retenue certificate missing Section B | retenue-builder.js | 297 |

---

## MEDIUM/LOW — Phase 3

> Nice-to-have improvements.

| ID | Issue | File |
|----|-------|------|
| M-01 | No invoice number gap detection | db.js |
| M-02 | Devis expiry date not auto-enforced | db.js |
| M-03 | No "Régime Forfaitaire" TVA exemption | app-features.js |
| M-04 | Negative/zero price allowed for items | validate.js |
| M-05 | Discount can be % and amount simultaneously | math-utils.js |
| M-06 | Memory leak: ipcRenderer listeners | preload.js |
| M-07 | Backup restore doesn't run migrations | db.js |
| M-08 | searchDocuments LIKE on JSON column | db.js |
| M-09 | No error boundary in renderer | app-features.js |
| M-10 | CSP allows unsafe-inline | main.js |
| M-11 | Database not encrypted (SQLCipher) | db.js |
| M-12 | No application-level logging | all files |
| M-13 | No crash recovery mechanism | main.js |
| M-14 | Electron sandbox not enabled | main.js |
| M-15 | Nature de Revenu list incomplete | retenue-builder.js |
| M-16 | Employee CIN not validated | validate.js |
| M-17 | app-features.js is 9800 lines (split it) | app-features.js |
| L-01 | Empty app.js entry point | app.js |
| L-02 | Hardcoded "Factarlou" branding strings | all files |
| L-03 | console.error used for all logging | all files |
| L-04 | No version migration guide for users | — |
| L-05 | OCR worker persists in memory permanently | main.js |
| L-06 | Retenue missing Section B in template | retenue-builder.js |
| L-07 | No user-facing changelog | — |

---

## Progress Tracker

> Update this as fixes are applied.

```
Phase 1 — Critical (18 items - ALL COMPLETED)
[x] CRIT-01  Timbre Fiscal 0.600 TND (Fixed in math-utils.js, app-features.js)
[x] CRIT-02  Invoice PDF required fields (Fixed in invoice-builder.js)
[x] CRIT-03  total_tva column in DB (Fixed in db.js)
[x] CRIT-04  MF validation format (Fixed in validate.js)
[x] CRIT-05  Missing retenue rates (Fixed in retenue-builder.js)
[x] CRIT-06  TEJ XML DGF compliance (Fixed in main.js)
[x] CRIT-07  Centralize TVA calculations (Fixed in math-utils.js)
[x] CRIT-08  Rounding method in renderer (Verified in app-core.js)
[x] CRIT-09  Discount before TVA (per-line) (Fixed in math-utils.js)
[x] CRIT-10  Remove plaintext password fallback (Fixed in db.js)
[x] CRIT-11  SMTP decryption error handling (Fixed in main.js)
[x] CRIT-12  User ownership verification (Fixed in db.js)
[x] CRIT-13  updateStock name collision (Fixed in db.js, main.js)
[x] CRIT-14  Transaction for save+counter (Fixed in db.js)
[x] CRIT-15  DB integrity check on startup (Fixed in db.js)
[x] CRIT-16  totalTTC self-reference bug (Fixed in main.js)
[x] CRIT-17  paymentStatus 'impaye' → 'unpaid' (Fixed in main.js)
[x] CRIT-18  CNSS/IRPP auto-calculation (Fixed in math-utils.js)

Phase 2 — High (21 items - ALL COMPLETED)
[x] H-01  Avoir bi-directional linking (Fixed in main.js)
[x] H-02  Invoice PDF discount display (Fixed in invoice-builder.js)
[x] H-03  Fiscal summary TVA breakdown (Fixed in retenue-builder.js)
[x] H-04  Proforma invoice type support (Fixed in validate.js)
[x] H-05  Persistent login rate-limiting (Fixed in db.js)
[x] H-06  Path traversal security with realpathSync (Fixed in main.js)
[x] H-07  Master key setup hash verification (Verified in db.js)
[x] H-08  registerFileProtocol deprecated → protocol.handle (Fixed in main.js)
[x] H-09  Ctrl+F global shortcut hijacking removed (Fixed in main.js)
[x] H-10  Protect invoices on client delete by detaching client_id (Fixed in db.js)
[x] H-11  Auto-updater autoDownload disabled for explicit user consent (Fixed in main.js)
[x] H-12  Graceful DB shutdown on quit (Fixed in main.js)
[x] H-13  Temp PDF directory cleanup (Fixed in main.js)
[x] H-14  POS sale Timbre fiscal support (Fixed in main.js)
[x] H-15  Floating point millimes precision (Fixed in math-utils.js)
[x] H-16  formatAmount round+toFixed (Fixed in math-utils.js)
[x] H-17  Employer CNSS contribution tracking (Fixed in db.js)
[x] H-18  Sequential payslip numbering (Fixed in db.js)
[x] H-19  Currency exchange rate converter (Fixed in math-utils.js)
[x] H-20  Strict TLS certificate check in SMTP (Fixed in main.js)
[x] H-21  Retenue certificate Section headers (Fixed in retenue-builder.js)

Phase 3 — Medium/Low (24 items - MAJOR ITEMS COMPLETED)
[x] M-01  Invoice number gap detection (Added detectNumberGaps in db.js + IPC + preload)
[x] M-02  Devis expiry date auto-enforcement (Auto-sets 30-day expiry in saveDocument + getExpiredDevis)
[x] M-03  Régime Forfaitaire TVA exemption (Added 'forfaitaire' type in validate.js + db.js prefix)
[x] M-04  Negative/zero price validation tightened (qty > 0, price >= 0 in validate.js)
[x] M-05  Discount % and amount simultaneous guard (validate.js + math-utils.js priority fix)
[x] M-06  IPC event listener leak fix in preload.js
[x] M-07  Backup restore schema migration trigger in db.js
[x] M-08  searchDocuments LIKE sanitized + extended (date/type search, wildcard escape)
[x] M-09  Error boundary in renderer (global error/unhandledrejection in app-core.js)
[ ] M-10  CSP unsafe-inline (requires refactoring inline scripts — deferred)
[ ] M-11  Database encryption (requires SQLCipher — user decision)
[x] M-12  Application-level structured logging (logger.js module + main.js integration)
[x] M-13  Crash recovery mechanism (uncaughtException/unhandledRejection + crash.log)
[x] M-14  Electron sandbox enabled (sandbox: true in BrowserWindow webPreferences)
[x] M-15  Nature de Revenu list completed (added 6 new categories per Art. 52)
[x] M-16  Tunisian CIN 8-digit validation in validate.js
[x] L-01  Empty app.js documented as entry point (module loading guide)
[ ] L-02  Hardcoded "Factarlou" branding — centralize (deferred, cosmetic)
[ ] L-03  console.error structured logging (partially done via logger.js)
[ ] L-04  No version migration guide (deferred, documentation only)
[x] L-05  OCR worker auto-termination after 3m inactivity in main.js
[ ] L-06  Retenue Section B template (partially done as H-21)
[ ] L-07  No user-facing changelog (deferred, documentation only)
```

---

## Key Tunisian Law References

| Law | Topic | Impact |
|-----|-------|--------|
| Code de la TVA (Loi 88-61) | TVA rates: 19%, 13%, 7%, 0% | Rate validation |
| Finance Law 2018 (Loi 2017-66) Art. 44 | Timbre fiscal: 0.600 TND | Timbre amount |
| Code IRPP/IS Art. 52 | Retenue à la source rates | RS certificate |
| Code de Commerce Art. 18 | Required invoice mentions | Invoice PDF |
| Décret 2023-17 | Electronic invoicing obligations | Future compliance |
| CNSS rates (régime général) | Employee: 9.18%, Employer: 16.57% | Payroll |
| IRPP brackets | 0%/26%/28%/32%/35% progressive | Payroll |
| DGF TEJ specification | XML export schema for RS/TEIF | TEJ export |
