const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

class AppDatabase {
    constructor() {
        const userDataPath = app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'tuniinvoice.db');
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');

        // CRIT-15: Verify database integrity on startup
        try {
            const integrityResult = this.db.pragma('integrity_check');
            if (integrityResult[0]?.integrity_check !== 'ok') {
                console.error('[DB] Database integrity check FAILED:', integrityResult);
            }
        } catch (e) {
            console.error('[DB] Integrity check error:', e.message);
        }

        this.initTables();
        this.runMigrations();
        this.initIndexes();
    }

    runMigrations() {
        const tryAlter = sql => {
            try {
                this.db.exec(sql);
            } catch {}
        };
        tryAlter('ALTER TABLE users ADD COLUMN master_key_hash TEXT');
        tryAlter('ALTER TABLE companies ADD COLUMN website TEXT');
        tryAlter('ALTER TABLE companies ADD COLUMN bank TEXT');
        tryAlter('ALTER TABLE companies ADD COLUMN rib TEXT');
        tryAlter('ALTER TABLE companies ADD COLUMN logo_image TEXT');
        tryAlter('ALTER TABLE companies ADD COLUMN stamp_image TEXT');
        tryAlter('ALTER TABLE companies ADD COLUMN signature_image TEXT');
        tryAlter('ALTER TABLE companies ADD COLUMN show_logo INTEGER DEFAULT 1');
        tryAlter('ALTER TABLE companies ADD COLUMN show_stamp INTEGER DEFAULT 1');
        tryAlter('ALTER TABLE companies ADD COLUMN show_signature INTEGER DEFAULT 1');
        tryAlter('ALTER TABLE companies ADD COLUMN show_qr INTEGER DEFAULT 0');
        tryAlter('ALTER TABLE companies ADD COLUMN show_accent INTEGER DEFAULT 1');
        tryAlter('ALTER TABLE user_settings ADD COLUMN decimal_places INTEGER DEFAULT 3');
        tryAlter("ALTER TABLE user_settings ADD COLUMN rounding_method TEXT DEFAULT 'half_up'");
        tryAlter('ALTER TABLE user_settings ADD COLUMN document_theme TEXT DEFAULT NULL');
        tryAlter("ALTER TABLE user_settings ADD COLUMN currency_default TEXT DEFAULT 'TND'");
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_retenue TEXT DEFAULT 'RS'");
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_avoir TEXT DEFAULT 'AV'");
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_contract TEXT DEFAULT 'CTR'");
        tryAlter("ALTER TABLE documents ADD COLUMN payment_status TEXT DEFAULT 'unpaid'");
        tryAlter('ALTER TABLE documents ADD COLUMN paid_amount REAL DEFAULT 0');
        tryAlter('ALTER TABLE documents ADD COLUMN paid_date TEXT');
        tryAlter('ALTER TABLE documents ADD COLUMN rounding_adjustment REAL DEFAULT 0');
        tryAlter('ALTER TABLE documents ADD COLUMN expiry_date TEXT');
        tryAlter('ALTER TABLE documents ADD COLUMN discount_percent REAL DEFAULT 0');
        tryAlter('ALTER TABLE documents ADD COLUMN discount_amount REAL DEFAULT 0');
        tryAlter('ALTER TABLE documents ADD COLUMN reference_doc TEXT DEFAULT NULL');
        tryAlter('ALTER TABLE documents ADD COLUMN internal_notes TEXT DEFAULT NULL');
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_bl TEXT DEFAULT 'BL'");
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_ba TEXT DEFAULT 'BA'");
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_bs TEXT DEFAULT 'BS'");
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_be TEXT DEFAULT 'BE'");
        tryAlter('ALTER TABLE clients ADD COLUMN notes TEXT');
        tryAlter('ALTER TABLE clients ADD COLUMN tags TEXT');
        tryAlter('ALTER TABLE clients ADD COLUMN credit_limit REAL DEFAULT 0');
        tryAlter("ALTER TABLE clients ADD COLUMN category TEXT DEFAULT 'standard'");
        tryAlter('ALTER TABLE clients ADD COLUMN rib TEXT');
        tryAlter('ALTER TABLE services ADD COLUMN category TEXT');
        tryAlter("ALTER TABLE services ADD COLUMN unit TEXT DEFAULT 'unité'");
        tryAlter('ALTER TABLE services ADD COLUMN barcode TEXT');
        tryAlter('ALTER TABLE services ADD COLUMN stock INTEGER DEFAULT 0');
        try {
            const svcCols = this.db
                .prepare('PRAGMA table_info(services)')
                .all()
                .map(c => c.name);
            if (!svcCols.includes('min_stock')) this.db.exec('ALTER TABLE services ADD COLUMN min_stock INTEGER DEFAULT 0');
            if (!svcCols.includes('image')) this.db.exec('ALTER TABLE services ADD COLUMN image TEXT');
        } catch (e) {
            console.error('[migration] services columns:', e.message);
        }
        tryAlter('ALTER TABLE contracts ADD COLUMN signed_at TEXT');
        tryAlter('ALTER TABLE contracts ADD COLUMN pdf_path TEXT');
        // Retenue official fields
        tryAlter('ALTER TABLE retenues ADD COLUMN beneficiaire_cin TEXT');
        tryAlter('ALTER TABLE retenues ADD COLUMN beneficiaire_code_tva TEXT');
        tryAlter('ALTER TABLE retenues ADD COLUMN beneficiaire_code_cat TEXT');
        tryAlter('ALTER TABLE retenues ADD COLUMN beneficiaire_n_etab TEXT');
        tryAlter("ALTER TABLE documents ADD COLUMN custom_fields TEXT DEFAULT '[]'");
        // CRIT-03: Add total_tva column for authoritative TVA storage
        tryAlter('ALTER TABLE documents ADD COLUMN total_tva REAL DEFAULT 0');
        // H-17 & H-18: Payslip employer CNSS and sequential number migrations
        tryAlter('ALTER TABLE payslips ADD COLUMN employer_cnss REAL DEFAULT 0');
        tryAlter('ALTER TABLE payslips ADD COLUMN number TEXT');
        tryAlter("ALTER TABLE user_settings ADD COLUMN prefix_payslip TEXT DEFAULT 'PE'");
        try {
            const docCols = this.db
                .prepare('PRAGMA table_info(documents)')
                .all()
                .map(c => c.name);
            if (!docCols.includes('is_pos')) this.db.exec('ALTER TABLE documents ADD COLUMN is_pos INTEGER DEFAULT 0');
            if (!docCols.includes('pos_session_id')) this.db.exec('ALTER TABLE documents ADD COLUMN pos_session_id TEXT');
            if (!docCols.includes('company_bank')) this.db.exec('ALTER TABLE documents ADD COLUMN company_bank TEXT');
            if (!docCols.includes('company_rib')) this.db.exec('ALTER TABLE documents ADD COLUMN company_rib TEXT');
        } catch (e) {
            console.error('[migration] documents columns:', e.message);
        }

        // ── Expenses table schema migration ─────────────────────────
        // Migrate old expenses table (with `amount` column) to new schema
        // using a safe data-preserving approach instead of DROP.
        try {
            const cols = this.db
                .prepare('PRAGMA table_info(expenses)')
                .all()
                .map(c => c.name);
            if (cols.length > 0 && cols.includes('amount') && !cols.includes('amount_ttc')) {
                // Create new table with updated schema
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS expenses_new (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        date TEXT NOT NULL,
                        vendor TEXT,
                        category TEXT,
                        description TEXT,
                        amount_ht REAL DEFAULT 0,
                        tva_rate REAL DEFAULT 0,
                        amount_ttc REAL NOT NULL DEFAULT 0,
                        retenue_source REAL DEFAULT 0,
                        payment_method TEXT,
                        reference TEXT,
                        doc_type TEXT DEFAULT 'facture',
                        attachment_path TEXT,
                        attachment_name TEXT,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                // Migrate data: old `amount` → amount_ttc, derive amount_ht from amount / (1 + tva_rate/100)
                this.db.exec(`
                    INSERT INTO expenses_new (id, user_id, date, vendor, category, description, 
                        amount_ht, tva_rate, amount_ttc, retenue_source, payment_method, 
                        reference, doc_type, attachment_path, attachment_name, notes, created_at)
                    SELECT id, COALESCE(user_id, ''), COALESCE(date, ''), vendor, category, description,
                        ROUND(amount / (1 + COALESCE(NULLIF(tva_rate, 0), 0) / 100), 3),
                        COALESCE(tva_rate, 0), amount,
                        COALESCE(retenue_source, 0), payment_method,
                        reference, COALESCE(doc_type, 'facture'), attachment_path, attachment_name,
                        notes, COALESCE(created_at, CURRENT_TIMESTAMP)
                    FROM expenses
                `);
                // Swap tables
                this.db.exec('DROP TABLE expenses');
                this.db.exec('ALTER TABLE expenses_new RENAME TO expenses');
            }
        } catch (e) {
            console.error('[migration] expenses table migration failed:', e);
        }

        // expenses: ensure all columns exist (handles pre-existing partial table)
        tryAlter("ALTER TABLE expenses ADD COLUMN user_id TEXT NOT NULL DEFAULT ''");
        tryAlter("ALTER TABLE expenses ADD COLUMN date TEXT NOT NULL DEFAULT ''");
        tryAlter('ALTER TABLE expenses ADD COLUMN vendor TEXT');
        tryAlter('ALTER TABLE expenses ADD COLUMN category TEXT');
        tryAlter('ALTER TABLE expenses ADD COLUMN description TEXT');
        tryAlter('ALTER TABLE expenses ADD COLUMN amount_ht REAL DEFAULT 0');
        tryAlter('ALTER TABLE expenses ADD COLUMN tva_rate REAL DEFAULT 0');
        tryAlter('ALTER TABLE expenses ADD COLUMN amount_ttc REAL NOT NULL DEFAULT 0');
        tryAlter('ALTER TABLE expenses ADD COLUMN retenue_source REAL DEFAULT 0');
        tryAlter('ALTER TABLE expenses ADD COLUMN payment_method TEXT');
        tryAlter('ALTER TABLE expenses ADD COLUMN reference TEXT');
        tryAlter("ALTER TABLE expenses ADD COLUMN doc_type TEXT DEFAULT 'facture'");
        tryAlter('ALTER TABLE expenses ADD COLUMN attachment_path TEXT');
        tryAlter('ALTER TABLE expenses ADD COLUMN attachment_name TEXT');
        tryAlter('ALTER TABLE expenses ADD COLUMN notes TEXT');
        tryAlter('ALTER TABLE expenses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    }

    initTables() {
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS document_themes (user_id TEXT PRIMARY KEY, font_family TEXT DEFAULT \"'Segoe UI', sans-serif\", font_size TEXT DEFAULT '14px', title_facture_text TEXT DEFAULT 'FACTURE', title_facture_color TEXT DEFAULT '#1e3a8a', title_devis_text TEXT DEFAULT 'DEVIS', title_devis_color TEXT DEFAULT '#92400e', title_bon_text TEXT DEFAULT 'BON DE COMMANDE', title_bon_color TEXT DEFAULT '#065f46')"
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, master_key_hash TEXT, company TEXT, mf TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, number TEXT NOT NULL, date TEXT NOT NULL, due_date TEXT, expiry_date TEXT, currency TEXT DEFAULT 'TND', payment_mode TEXT, payment_status TEXT DEFAULT 'unpaid', paid_amount REAL DEFAULT 0, paid_date TEXT, company_name TEXT, company_mf TEXT, company_address TEXT, company_phone TEXT, company_email TEXT, company_rc TEXT, client_id TEXT, client_name TEXT NOT NULL, client_mf TEXT, client_address TEXT, client_phone TEXT, client_email TEXT, items_json TEXT NOT NULL DEFAULT '[]', apply_timbre INTEGER DEFAULT 0, timbre_amount REAL DEFAULT 0, rounding_adjustment REAL DEFAULT 0, discount_percent REAL DEFAULT 0, discount_amount REAL DEFAULT 0, total_ht REAL NOT NULL DEFAULT 0, total_ttc REAL NOT NULL DEFAULT 0, logo_image TEXT, stamp_image TEXT, signature_image TEXT, notes TEXT, internal_notes TEXT, reference_doc TEXT DEFAULT NULL, is_pos INTEGER DEFAULT 0, pos_session_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );

        this.db.exec(
            "CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, mf TEXT, address TEXT, phone TEXT, email TEXT, notes TEXT, tags TEXT, credit_limit REAL DEFAULT 0, category TEXT DEFAULT 'standard', rib TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS fournisseurs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, mf TEXT, address TEXT, phone TEXT, email TEXT, notes TEXT, category TEXT DEFAULT 'standard', rib TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS companies (user_id TEXT PRIMARY KEY, name TEXT, mf TEXT, address TEXT, phone TEXT, email TEXT, rc TEXT, website TEXT, bank TEXT, rib TEXT, logo_image TEXT, stamp_image TEXT, signature_image TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS doc_counters (user_id TEXT NOT NULL, type TEXT NOT NULL, year INTEGER NOT NULL, last_number INTEGER DEFAULT 0, PRIMARY KEY (user_id, type, year))'
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, price REAL DEFAULT 0, tva REAL DEFAULT 19, category TEXT, unit TEXT DEFAULT 'unité', barcode TEXT, stock INTEGER DEFAULT 0, min_stock INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS user_settings (user_id TEXT PRIMARY KEY, prefix_facture TEXT DEFAULT 'FAC', prefix_devis TEXT DEFAULT 'DEV', prefix_bon TEXT DEFAULT 'BC', prefix_retenue TEXT DEFAULT 'RS', prefix_avoir TEXT DEFAULT 'AV', prefix_contract TEXT DEFAULT 'CTR', prefix_bl TEXT DEFAULT 'BL', prefix_ba TEXT DEFAULT 'BA', prefix_bs TEXT DEFAULT 'BS', prefix_be TEXT DEFAULT 'BE', decimal_places INTEGER DEFAULT 3, rounding_method TEXT DEFAULT 'half_up', document_theme TEXT DEFAULT NULL, currency_default TEXT DEFAULT 'TND', smtp_host TEXT, smtp_port INTEGER DEFAULT 587, smtp_user TEXT, smtp_pass TEXT, smtp_secure INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(id))"
        );
        try {
            this.db.exec('ALTER TABLE user_settings ADD COLUMN smtp_host TEXT');
        } catch (e) {}
        try {
            this.db.exec('ALTER TABLE user_settings ADD COLUMN smtp_port INTEGER DEFAULT 587');
        } catch (e) {}
        try {
            this.db.exec('ALTER TABLE user_settings ADD COLUMN smtp_user TEXT');
        } catch (e) {}
        try {
            this.db.exec('ALTER TABLE user_settings ADD COLUMN smtp_pass TEXT');
        } catch (e) {}
        try {
            this.db.exec('ALTER TABLE user_settings ADD COLUMN smtp_secure INTEGER DEFAULT 0');
        } catch (e) {}
        try {
            this.db.exec("ALTER TABLE user_settings ADD COLUMN prefix_ticket TEXT DEFAULT 'TIC'");
        } catch (e) {}
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, number TEXT NOT NULL, title TEXT, employer_name TEXT, employer_mf TEXT, employer_address TEXT, employer_rep TEXT, employer_rep_role TEXT, employee_name TEXT, employee_cin TEXT, employee_address TEXT, employee_role TEXT, employee_department TEXT, start_date TEXT, end_date TEXT, salary REAL, salary_type TEXT DEFAULT 'mensuel', work_hours REAL DEFAULT 40, work_location TEXT, trial_period INTEGER DEFAULT 0, trial_duration TEXT, notice_period TEXT, extra_clauses TEXT, status TEXT DEFAULT 'brouillon', notes TEXT, signed_at TEXT, pdf_path TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, document_id TEXT NOT NULL, amount REAL NOT NULL, method TEXT, reference TEXT, date TEXT NOT NULL, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );

        this.db.exec(
            'CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, entity_label TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, content TEXT, color TEXT DEFAULT '#fef9c3', pinned INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, due_date TEXT NOT NULL, due_time TEXT DEFAULT '09:00', entity_type TEXT, entity_id TEXT, done INTEGER DEFAULT 0, notified INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS relances (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, invoice_id TEXT NOT NULL, attempt INTEGER DEFAULT 1, method TEXT DEFAULT 'pdf', recipient_email TEXT, sent_at DATETIME DEFAULT CURRENT_TIMESTAMP, notes TEXT)"
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS retenues (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, number TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, date TEXT NOT NULL, retenuer_name TEXT NOT NULL, retenuer_mf TEXT, retenuer_address TEXT, retenuer_rc TEXT, retenuer_rep TEXT, retenuer_code_tva TEXT, retenuer_code_cat TEXT, retenuer_n_etab TEXT, beneficiaire_name TEXT NOT NULL, beneficiaire_mf TEXT, beneficiaire_address TEXT, beneficiaire_rib TEXT, beneficiaire_cin TEXT, beneficiaire_code_tva TEXT, beneficiaire_code_cat TEXT, beneficiaire_n_etab TEXT, facture_id TEXT, facture_number TEXT, facture_date TEXT, montant_brut REAL NOT NULL, taux_retenue REAL NOT NULL DEFAULT 1.5, montant_retenue REAL NOT NULL, nature_revenu TEXT DEFAULT 'Honoraires et commissions', base_legale TEXT DEFAULT \"Art. 52 du Code de l'IRPP et de l'IS\", logo_image TEXT, stamp_image TEXT, signature_image TEXT, notes TEXT, status TEXT DEFAULT 'emis', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );

        this.db.exec(
            'CREATE TABLE IF NOT EXISTS exchange_rates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, currency TEXT NOT NULL, rate REAL DEFAULT 1.0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );
        this.db.exec(`CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            vendor TEXT,
            category TEXT,
            description TEXT,
            amount_ht REAL DEFAULT 0,
            tva_rate REAL DEFAULT 0,
            amount_ttc REAL NOT NULL DEFAULT 0,
            retenue_source REAL DEFAULT 0,
            payment_method TEXT,
            reference TEXT,
            doc_type TEXT DEFAULT 'facture',
            attachment_path TEXT,
            attachment_name TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        this.db.exec(
            "CREATE TABLE IF NOT EXISTS service_categories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT DEFAULT '#3b82f6', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS document_tags (document_id TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (document_id, tag))'
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, cin TEXT, cnss TEXT, role TEXT, department TEXT, hire_date TEXT, base_salary REAL DEFAULT 0, transport_allowance REAL DEFAULT 0, other_allowances REAL DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS payslips (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, employee_id TEXT NOT NULL, period_month INTEGER NOT NULL, period_year INTEGER NOT NULL, date TEXT NOT NULL, base_salary REAL DEFAULT 0, transport_allowance REAL DEFAULT 0, other_allowances REAL DEFAULT 0, gross_salary REAL DEFAULT 0, cnss_deduction REAL DEFAULT 0, irpp_deduction REAL DEFAULT 0, net_salary REAL DEFAULT 0, status TEXT DEFAULT 'unpaid', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES employees(id))"
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS document_templates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT, data TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS recurring_invoices (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, template_id TEXT, client_id TEXT, doc_type TEXT, day_of_month INTEGER DEFAULT 15, items_template TEXT, currency TEXT DEFAULT 'TND', payment_mode TEXT DEFAULT 'Virement bancaire', frequency TEXT NOT NULL, last_run TEXT, next_run TEXT, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS pos_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, opened_at TEXT NOT NULL, closed_at TEXT, opening_balance REAL DEFAULT 0, closing_cash REAL DEFAULT 0, closing_card REAL DEFAULT 0, closing_total REAL DEFAULT 0, cash_sales REAL DEFAULT 0, card_sales REAL DEFAULT 0, total_sales REAL DEFAULT 0, transaction_count INTEGER DEFAULT 0, status TEXT DEFAULT 'open', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        );
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS pos_loyalty (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, client_name TEXT NOT NULL, points INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, client_name))'
        );
        // H-05: Persistent login rate limiting table
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, attempts INTEGER DEFAULT 0, locked_until DATETIME)'
        );
    }

    initIndexes() {
        const tryExec = sql => {
            try {
                this.db.exec(sql);
            } catch (e) {}
        };
        tryExec('CREATE INDEX IF NOT EXISTS idx_docs_user_type ON documents(user_id, type)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_docs_client ON documents(user_id, client_name)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_docs_date ON documents(date)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(payment_status)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_payments_doc ON payments(document_id)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_retenues_user ON retenues(user_id)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_retenues_facture ON retenues(facture_id)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id, date)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_services_barcode ON services(barcode)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_documents_pos ON documents(is_pos, user_id, created_at)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_documents_pos_session ON documents(pos_session_id)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_services_user_cat ON services(user_id, category)');
        tryExec('CREATE INDEX IF NOT EXISTS idx_pos_sessions_user ON pos_sessions(user_id, status)');
    }

    getDatabasePath() {
        return this.dbPath;
    }
    restore(backupPath) {
        const header = Buffer.alloc(16);
        const fd = fs.openSync(backupPath, 'r');
        fs.readSync(fd, header, 0, 16, 0);
        fs.closeSync(fd);
        if (header.toString('utf8', 0, 16) !== 'SQLite format 3\0') {
            throw new Error('Fichier de sauvegarde invalide');
        }
        this.db.close();
        fs.copyFileSync(backupPath, this.dbPath);
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.initTables();
        this.runMigrations();
        this.initIndexes();
    }

    // ==================== AUTH ====================
    registerUser({ name, email, password, company, mf }) {
        const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) throw new Error('Email déjà utilisé');
        const id = uuidv4();
        const hash = bcrypt.hashSync(password, 10);

        // Generate Master Recovery Key
        const rawMasterKey = 'FACT-' + uuidv4().split('-')[0].toUpperCase() + '-' + uuidv4().split('-')[1].toUpperCase();
        const masterKeyHash = bcrypt.hashSync(rawMasterKey, 10);

        this.db
            .prepare('INSERT INTO users (id,name,email,password_hash,master_key_hash,company,mf) VALUES (?,?,?,?,?,?,?)')
            .run(id, name, email, hash, masterKeyHash, company || null, mf || null);
        this.db
            .prepare(
                "INSERT INTO user_settings (user_id,prefix_facture,prefix_devis,prefix_bon,prefix_retenue,prefix_avoir,prefix_contract,decimal_places,rounding_method) VALUES (?,'FAC','DEV','BC','RS','AV','CTR',3,'half_up')"
            )
            .run(id);
        return { id, name, email, company, mf, masterKey: rawMasterKey };
    }
    loginUser(email, password) {
        // H-05: Persistent rate limit check
        const rateCheck = this.checkLoginRateLimit(email);
        if (rateCheck.locked) {
            throw new Error(`Compte temporairement verrouillé suite à plusieurs échecs. Réessayez dans ${rateCheck.remainingSeconds} secondes.`);
        }

        const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            this.recordLoginFailure(email);
            throw new Error('Identifiants invalides');
        }

        let match = false;
        try {
            match = bcrypt.compareSync(password, user.password_hash);
        } catch (e) {
            // CRIT-10: Never fall back to plaintext comparison — reject login on bcrypt error
            console.error('[auth] bcrypt error, rejecting login:', e.message);
            match = false;
        }

        if (!match) {
            this.recordLoginFailure(email);
            throw new Error('Identifiants invalides');
        }

        this.resetLoginAttempts(email);
        return { id: user.id, name: user.name, email: user.email, company: user.company, mf: user.mf };
    }

    // H-05: Persistent Rate Limiting Helper Methods
    checkLoginRateLimit(email) {
        if (!email) return { locked: false, attempts: 0 };
        const row = this.db.prepare('SELECT attempts, locked_until FROM login_attempts WHERE email=?').get(email);
        if (!row) return { locked: false, attempts: 0 };
        if (row.locked_until && new Date(row.locked_until) > new Date()) {
            const remainingSeconds = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 1000);
            return { locked: true, remainingSeconds, attempts: row.attempts };
        }
        return { locked: false, attempts: row.attempts };
    }

    recordLoginFailure(email) {
        if (!email) return;
        const now = new Date();
        const row = this.db.prepare('SELECT attempts FROM login_attempts WHERE email=?').get(email);
        const attempts = (row?.attempts || 0) + 1;
        let lockedUntil = null;
        if (attempts >= 5) {
            // Lock out for 15 minutes after 5 consecutive failed attempts
            lockedUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        }
        this.db.prepare(`
            INSERT INTO login_attempts (email, attempts, locked_until)
            VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET attempts=?, locked_until=?
        `).run(email, attempts, lockedUntil, attempts, lockedUntil);
    }

    resetLoginAttempts(email) {
        if (!email) return;
        this.db.prepare('DELETE FROM login_attempts WHERE email=?').run(email);
    }
    changePassword(userId, oldPassword, newPassword) {
        const user = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId);
        if (!user) throw new Error('Utilisateur introuvable');
        if (!bcrypt.compareSync(oldPassword, user.password_hash)) throw new Error('Mot de passe actuel incorrect');
        if (newPassword.length < 6) throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
        this.db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), userId);
    }
    resetPasswordWithMasterKey(email, masterKey, newPassword) {
        const user = this.db.prepare('SELECT * FROM users WHERE email=?').get(email);
        if (!user) throw new Error('Utilisateur introuvable');
        if (!user.master_key_hash) throw new Error('Clé de récupération non configurée pour ce compte');
        if (!bcrypt.compareSync(masterKey, user.master_key_hash)) throw new Error('Clé de récupération incorrecte');
        if (newPassword.length < 6) throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
        this.db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), user.id);
    }

    // ==================== DOCUMENT NUMBERING ====================
    getNextDocumentNumber(userId, type, year) {
        const y = year || new Date().getFullYear();
        const counter = this.db.prepare('SELECT last_number FROM doc_counters WHERE user_id=? AND type=? AND year=?').get(userId, type, y);
        const nextNum = (counter?.last_number || 0) + 1;
        this.db
            .prepare(
                'INSERT INTO doc_counters (user_id,type,year,last_number) VALUES (?,?,?,?) ON CONFLICT(user_id,type,year) DO UPDATE SET last_number=excluded.last_number'
            )
            .run(userId, type, y, nextNum);
        const s = this.getUserSettings(userId);
        const prefix = this._getPrefix(s, type);
        return `${prefix}-${y}-${String(nextNum).padStart(3, '0')}`;
    }
    _getPrefix(s, type) {
        switch (type) {
            case 'facture':
                return s?.prefix_facture || 'FAC';
            case 'devis':
                return s?.prefix_devis || 'DEV';
            case 'bon':
                return s?.prefix_bon || 'BC';
            case 'bl':
                return s?.prefix_bl || 'BL';
            case 'ba':
                return s?.prefix_ba || 'BA';
            case 'bs':
                return s?.prefix_bs || 'BS';
            case 'be':
                return s?.prefix_be || 'BE';
            case 'retenue':
                return s?.prefix_retenue || 'RS';
            case 'avoir':
                return s?.prefix_avoir || 'AV';
            case 'contract':
                return s?.prefix_contract || 'CTR';
            case 'ticket':
                return s?.prefix_ticket || 'TIC';
            case 'proforma':
                return s?.prefix_proforma || 'PRO';
            case 'forfaitaire':
                return s?.prefix_forfaitaire || 'FRF';
            default:
                return type.toUpperCase().slice(0, 4);
        }
    }
    peekNextDocumentNumber(userId, type, year) {
        const y = year || new Date().getFullYear();
        const counter = this.db.prepare('SELECT last_number FROM doc_counters WHERE user_id=? AND type=? AND year=?').get(userId, type, y);
        const nextNum = (counter?.last_number || 0) + 1;
        const s = this.getUserSettings(userId);
        const prefix = this._getPrefix(s, type);
        return `${prefix}-${y}-${String(nextNum).padStart(3, '0')}`;
    }
    resetDocumentCounter(userId, type, year) {
        if (type === 'all') this.db.prepare('DELETE FROM doc_counters WHERE user_id=? AND year=?').run(userId, year);
        else this.db.prepare('DELETE FROM doc_counters WHERE user_id=? AND type=? AND year=?').run(userId, type, year);
        return { success: true };
    }
    getCounterStatus(userId, year) {
        const y = year || new Date().getFullYear();
        const rows = this.db.prepare('SELECT type, last_number FROM doc_counters WHERE user_id=? AND year=?').all(userId, y);
        const result = {};
        rows.forEach(r => {
            result[r.type] = r.last_number;
        });
        return result;
    }

    // M-01: Detect invoice number gaps (required for Tunisian fiscal compliance)
    detectNumberGaps(userId, type, year) {
        const y = year || new Date().getFullYear();
        const s = this.getUserSettings(userId);
        const prefix = this._getPrefix(s, type);
        const pattern = `${prefix}-${y}-%`;
        const docs = this.db
            .prepare('SELECT number FROM documents WHERE user_id=? AND type=? AND number LIKE ? ORDER BY number ASC')
            .all(userId, type, pattern);
        const numbers = docs
            .map(d => {
                const match = d.number.match(/-(\d+)$/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter(n => n !== null)
            .sort((a, b) => a - b);
        const gaps = [];
        if (numbers.length === 0) return { gaps: [], maxNumber: 0, count: 0 };
        for (let i = 1; i < numbers.length; i++) {
            for (let n = numbers[i - 1] + 1; n < numbers[i]; n++) {
                gaps.push(`${prefix}-${y}-${String(n).padStart(3, '0')}`);
            }
        }
        return {
            gaps,
            maxNumber: numbers[numbers.length - 1],
            count: numbers.length,
            hasGaps: gaps.length > 0
        };
    }

    // M-02: Auto-enforce devis expiry date (30-day default per commercial practice)
    getExpiredDevis(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db
            .prepare(
                "SELECT * FROM documents WHERE user_id=? AND type='devis' AND payment_status='unpaid' AND expiry_date IS NOT NULL AND expiry_date < ? ORDER BY expiry_date ASC"
            )
            .all(userId, today)
            .map(d => this.formatDocument(d));
    }

    // ==================== DOCUMENTS ====================
    // CRIT-14: Wrapped in transaction so counter increment + save are atomic (no number gaps)
    saveDocument(docData) {
        const saveTransaction = this.db.transaction(() => {
            const id = docData.id || uuidv4();
            const number = docData.number || this.getNextDocumentNumber(docData.userId, docData.type, new Date().getFullYear());
            const existing = this.db.prepare('SELECT id FROM documents WHERE id=?').get(id);
            // M-02: Auto-set 30-day expiry for devis if not provided
            let expiryDate = docData.expiryDate || null;
            if (!expiryDate && docData.type === 'devis') {
                const baseDate = docData.date ? new Date(docData.date) : new Date();
                expiryDate = new Date(baseDate.getTime() + 30 * 86400000).toISOString().split('T')[0];
            }
            const vals = [
                docData.type,
                number,
                docData.date,
                docData.dueDate || null,
                expiryDate,
                docData.currency || 'TND',
                docData.paymentMode || null,
                docData.paymentStatus || 'unpaid',
                docData.paidAmount || 0,
                docData.paidDate || null,
                docData.companyName || null,
                docData.companyMF || null,
                docData.companyAddress || null,
                docData.companyPhone || null,
                docData.companyEmail || null,
                docData.companyRC || null,
                docData.companyBank || null,
                docData.companyRIB || null,
                docData.clientId || null,
                docData.clientName,
                docData.clientMF || null,
                docData.clientAddress || null,
                docData.clientPhone || null,
                docData.clientEmail || null,
                JSON.stringify(docData.items || []),
                docData.applyTimbre ? 1 : 0,
                docData.timbreAmount || 0,
                docData.roundingAdjustment || 0,
                docData.discountPercent || 0,
                docData.discountAmount || 0,
                docData.totalHT || 0,
                docData.totalTVA || 0,
                docData.totalTTC || 0,
                docData.logoImage || null,
                docData.stampImage || null,
                docData.signatureImage || null,
                docData.notes || null,
                docData.referenceDoc || null,
                docData.internalNotes || null,
                JSON.stringify(docData.customFields || []),
                docData.isPos ? 1 : 0,
                docData.posSessionId || null
            ];
            if (existing) {
                this.db
                    .prepare(
                        'UPDATE documents SET type=?,number=?,date=?,due_date=?,expiry_date=?,currency=?,payment_mode=?,payment_status=?,paid_amount=?,paid_date=?,company_name=?,company_mf=?,company_address=?,company_phone=?,company_email=?,company_rc=?,company_bank=?,company_rib=?,client_id=?,client_name=?,client_mf=?,client_address=?,client_phone=?,client_email=?,items_json=?,apply_timbre=?,timbre_amount=?,rounding_adjustment=?,discount_percent=?,discount_amount=?,total_ht=?,total_tva=?,total_ttc=?,logo_image=?,stamp_image=?,signature_image=?,notes=?,reference_doc=?,internal_notes=?,custom_fields=?,is_pos=?,pos_session_id=? WHERE id=?'
                    )
                    .run(...vals, id);
            } else {
                this.db
                    .prepare(
                        'INSERT INTO documents (id,user_id,type,number,date,due_date,expiry_date,currency,payment_mode,payment_status,paid_amount,paid_date,company_name,company_mf,company_address,company_phone,company_email,company_rc,company_bank,company_rib,client_id,client_name,client_mf,client_address,client_phone,client_email,items_json,apply_timbre,timbre_amount,rounding_adjustment,discount_percent,discount_amount,total_ht,total_tva,total_ttc,logo_image,stamp_image,signature_image,notes,reference_doc,internal_notes,custom_fields,is_pos,pos_session_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                    )
                    .run(id, docData.userId, ...vals);
            }
            this.logActivity(
                docData.userId,
                existing ? 'update_document' : 'create_document',
                'document',
                id,
                `${(docData.type || '').toUpperCase()} N° ${number}`
            );
            return id;
        });
        const savedId = saveTransaction();
        return this.getDocumentById(savedId);
    }
    getDocuments(userId) {
        return this.db
            .prepare('SELECT * FROM documents WHERE user_id=? ORDER BY created_at DESC')
            .all(userId)
            .map(d => this.formatDocument(d));
    }
    getDocumentsPaginated(userId, page, pageSize) {
        const offset = (page - 1) * pageSize;
        const rows = this.db
            .prepare('SELECT * FROM documents WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?')
            .all(userId, pageSize, offset)
            .map(d => this.formatDocument(d));
        const countRow = this.db.prepare('SELECT COUNT(*) as total FROM documents WHERE user_id=?').get(userId);
        return { rows, total: countRow.total };
    }
    getDocumentsByType(userId, type) {
        return this.db
            .prepare('SELECT * FROM documents WHERE user_id=? AND type=? ORDER BY created_at DESC')
            .all(userId, type)
            .map(d => this.formatDocument(d));
    }
    getDocumentById(docId) {
        const doc = this.db.prepare('SELECT * FROM documents WHERE id=?').get(docId);
        return doc ? this.formatDocument(doc) : null;
    }
    // CRIT-12: Verify ownership before delete (if userId provided)
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
    updateDocumentPaymentStatus(docId, status, paidAmount, paidDate) {
        this.db
            .prepare('UPDATE documents SET payment_status=?,paid_amount=?,paid_date=? WHERE id=?')
            .run(status, paidAmount || 0, paidDate || null, docId);
    }
    getExpiringDocuments(userId, withinDays = 7) {
        const today = new Date().toISOString().split('T')[0];
        const limit = new Date(Date.now() + withinDays * 86400000).toISOString().split('T')[0];
        return this.db
            .prepare(
                "SELECT * FROM documents WHERE user_id=? AND type='devis' AND payment_status='unpaid' AND expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ? ORDER BY expiry_date ASC"
            )
            .all(userId, today, limit)
            .map(d => this.formatDocument(d));
    }
    getOverdueDocuments(userId) {
        // Retrieve all unpaid factures so the user can select any of them for a Relance
        return this.db
            .prepare("SELECT * FROM documents WHERE user_id=? AND type='facture' AND payment_status != 'paid' ORDER BY date ASC")
            .all(userId)
            .map(d => this.formatDocument(d));
    }
    formatDocument(doc) {
        return {
            id: doc.id,
            userId: doc.user_id,
            type: doc.type,
            number: doc.number,
            date: doc.date,
            dueDate: doc.due_date,
            expiryDate: doc.expiry_date,
            currency: doc.currency,
            paymentMode: doc.payment_mode,
            paymentStatus: doc.payment_status || 'unpaid',
            paidAmount: doc.paid_amount || 0,
            paidDate: doc.paid_date,
            companyName: doc.company_name,
            companyMF: doc.company_mf,
            companyAddress: doc.company_address,
            companyPhone: doc.company_phone,
            companyEmail: doc.company_email,
            companyRC: doc.company_rc,
            companyBank: doc.company_bank,
            companyRIB: doc.company_rib,
            clientId: doc.client_id,
            clientName: doc.client_name,
            clientMF: doc.client_mf,
            clientAddress: doc.client_address,
            clientPhone: doc.client_phone,
            clientEmail: doc.client_email,
            items: (() => {
                try {
                    return JSON.parse(doc.items_json);
                } catch {
                    return [];
                }
            })(),
            customFields: (() => {
                try {
                    return JSON.parse(doc.custom_fields || '[]');
                } catch {
                    return [];
                }
            })(),
            applyTimbre: doc.apply_timbre === 1,
            timbreAmount: doc.timbre_amount || 0,
            roundingAdjustment: doc.rounding_adjustment || 0,
            discountPercent: doc.discount_percent || 0,
            discountAmount: doc.discount_amount || 0,
            totalHT: doc.total_ht || 0,
            totalTVA: doc.total_tva || 0,
            totalTTC: doc.total_ttc || 0,
            logoImage: doc.logo_image,
            stampImage: doc.stamp_image,
            signatureImage: doc.signature_image,
            notes: doc.notes,
            referenceDoc: doc.reference_doc,
            createdAt: doc.created_at,
            isPos: doc.is_pos === 1,
            posSessionId: doc.pos_session_id
        };
    }

    // ==================== RETENUE (full official fields) ====================
    createRetenueFromFacture(userId, factureId, tauxRetenue = 1.5) {
        const facture = this.getDocumentById(factureId);
        if (!facture) throw new Error('Facture introuvable');
        if (facture.type !== 'facture') throw new Error("Le document sélectionné n'est pas une facture");
        const company = this.getCompanySettings(userId);
        const year = new Date(facture.date).getFullYear();
        const month = new Date(facture.date).getMonth() + 1;
        const montantBrut = facture.totalHT;
        const montantRetenue = Math.round(montantBrut * (tauxRetenue / 100) * 1000) / 1000;
        return this.saveRetenue({
            userId,
            year,
            month,
            date: new Date().toISOString().split('T')[0],
            retenuerName: facture.clientName,
            retenuerMF: facture.clientMF,
            retenuerAddress: facture.clientAddress,
            beneficiaireName: facture.companyName || company?.name || '',
            beneficiaireMF: facture.companyMF || company?.mf || null,
            beneficiaireAddress: facture.companyAddress || company?.address || null,
            beneficiaireRib: company?.rib || null,
            factureId: facture.id,
            factureNumber: facture.number,
            factureDate: facture.date,
            montantBrut,
            tauxRetenue,
            montantRetenue,
            stampImage: company?.stamp_image,
            signatureImage: company?.signature_image
        });
    }
    saveRetenue(data) {
        const id = data.id || uuidv4();
        const year = data.year || new Date().getFullYear();
        const month = data.month || new Date().getMonth() + 1;
        const number = data.number || this.getNextDocumentNumber(data.userId, 'retenue', year);
        const montantRetenue =
            data.montantRetenue !== undefined && data.montantRetenue !== null
                ? data.montantRetenue
                : Math.round((data.montantBrut || 0) * ((data.tauxRetenue || 1.5) / 100) * 1000) / 1000;
        const existing = this.db.prepare('SELECT id FROM retenues WHERE id=?').get(id);
        const fields = [
            number,
            year,
            month,
            data.date,
            data.retenuerName,
            data.retenuerMF || null,
            data.retenuerAddress || null,
            data.retenuerRC || null,
            data.retenuerRep || null,
            data.retenuerCodeTva || null,
            data.retenuerCodeCat || null,
            data.retenuerNEtab || null,
            data.beneficiaireName,
            data.beneficiaireMF || null,
            data.beneficiaireAddress || null,
            data.beneficiaireRib || null,
            data.beneficiaireCIN || null,
            data.beneficiaireCodeTva || null,
            data.beneficiaireCodeCat || null,
            data.beneficiaireNEtab || null,
            data.factureId || null,
            data.factureNumber || null,
            data.factureDate || null,
            data.montantBrut || 0,
            data.tauxRetenue || 1.5,
            montantRetenue,
            data.natureRevenu || 'Honoraires et commissions',
            data.baseLegale || "Art. 52 du Code de l'IRPP et de l'IS",
            data.logoImage || null,
            data.stampImage || null,
            data.signatureImage || null,
            data.notes || null,
            data.status || 'emis'
        ];
        if (existing) {
            this.db
                .prepare(
                    'UPDATE retenues SET number=?,year=?,month=?,date=?,retenuer_name=?,retenuer_mf=?,retenuer_address=?,retenuer_rc=?,retenuer_rep=?,retenuer_code_tva=?,retenuer_code_cat=?,retenuer_n_etab=?,beneficiaire_name=?,beneficiaire_mf=?,beneficiaire_address=?,beneficiaire_rib=?,beneficiaire_cin=?,beneficiaire_code_tva=?,beneficiaire_code_cat=?,beneficiaire_n_etab=?,facture_id=?,facture_number=?,facture_date=?,montant_brut=?,taux_retenue=?,montant_retenue=?,nature_revenu=?,base_legale=?,logo_image=?,stamp_image=?,signature_image=?,notes=?,status=? WHERE id=?'
                )
                .run(...fields, id);
        } else {
            this.db
                .prepare(
                    'INSERT INTO retenues (id,user_id,number,year,month,date,retenuer_name,retenuer_mf,retenuer_address,retenuer_rc,retenuer_rep,retenuer_code_tva,retenuer_code_cat,retenuer_n_etab,beneficiaire_name,beneficiaire_mf,beneficiaire_address,beneficiaire_rib,beneficiaire_cin,beneficiaire_code_tva,beneficiaire_code_cat,beneficiaire_n_etab,facture_id,facture_number,facture_date,montant_brut,taux_retenue,montant_retenue,nature_revenu,base_legale,logo_image,stamp_image,signature_image,notes,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(id, data.userId, ...fields);
        }
        this.logActivity(data.userId, existing ? 'update_retenue' : 'create_retenue', 'retenue', id, `RS N° ${number}`);
        return this.getRetenueById(id);
    }
    getRetenues(userId) {
        return this.db
            .prepare('SELECT * FROM retenues WHERE user_id=? ORDER BY created_at DESC')
            .all(userId)
            .map(r => this.formatRetenue(r));
    }
    getRetenueById(id) {
        const r = this.db.prepare('SELECT * FROM retenues WHERE id=?').get(id);
        return r ? this.formatRetenue(r) : null;
    }
    getRetenuesByFacture(factureId) {
        return this.db
            .prepare('SELECT * FROM retenues WHERE facture_id=? ORDER BY created_at DESC')
            .all(factureId)
            .map(r => this.formatRetenue(r));
    }
    deleteRetenue(id) {
        this.db.prepare('DELETE FROM retenues WHERE id=?').run(id);
    }
    formatRetenue(r) {
        return {
            id: r.id,
            userId: r.user_id,
            number: r.number,
            year: r.year,
            month: r.month,
            date: r.date,
            retenuerName: r.retenuer_name,
            retenuerMF: r.retenuer_mf,
            retenuerAddress: r.retenuer_address,
            retenuerRC: r.retenuer_rc,
            retenuerRep: r.retenuer_rep,
            retenuerCodeTva: r.retenuer_code_tva,
            retenuerCodeCat: r.retenuer_code_cat,
            retenuerNEtab: r.retenuer_n_etab,
            beneficiaireName: r.beneficiaire_name,
            beneficiaireMF: r.beneficiaire_mf,
            beneficiaireAddress: r.beneficiaire_address,
            beneficiaireRib: r.beneficiaire_rib,
            beneficiaireCIN: r.beneficiaire_cin,
            beneficiaireCodeTva: r.beneficiaire_code_tva,
            beneficiaireCodeCat: r.beneficiaire_code_cat,
            beneficiaireNEtab: r.beneficiaire_n_etab,
            factureId: r.facture_id,
            factureNumber: r.facture_number,
            factureDate: r.facture_date,
            montantBrut: r.montant_brut,
            tauxRetenue: r.taux_retenue,
            montantRetenue: r.montant_retenue,
            natureRevenu: r.nature_revenu,
            baseLegale: r.base_legale,
            logoImage: r.logo_image,
            stampImage: r.stamp_image,
            signatureImage: r.signature_image,
            notes: r.notes,
            status: r.status,
            createdAt: r.created_at
        };
    }

    // ==================== FISCAL SUMMARY (Tool 3) ====================
    getFiscalSummary(userId, year, quarter = null) {
        const y = String(year || new Date().getFullYear());
        let query = "SELECT * FROM documents WHERE user_id=? AND type IN ('facture', 'avoir') AND strftime('%Y', date) = ?";
        const params = [userId, y];
        if (quarter) {
            const monthStart = (quarter - 1) * 3 + 1;
            const monthEnd = quarter * 3;
            query += " AND CAST(strftime('%m', date) AS INTEGER) BETWEEN ? AND ?";
            params.push(monthStart, monthEnd);
        }
        const factures = this.db.prepare(query).all(...params);
        let totalHT = 0,
            totalTTC = 0,
            totalTimbre = 0;
        const tvaMap = {};
        factures.forEach(doc => {
            const sign = doc.type === 'avoir' ? -1 : 1;
            totalHT += (doc.total_ht || 0) * sign;
            totalTTC += (doc.total_ttc || 0) * sign;
            totalTimbre += (doc.timbre_amount || 0) * sign;
            let items = [];
            try {
                items = JSON.parse(doc.items_json);
            } catch {}
            items.forEach(item => {
                const rate = Number(item.tva) || 0;
                const itemHT = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                const itemTV = (itemHT * rate) / 100;
                if (!tvaMap[rate]) tvaMap[rate] = { baseHT: 0, tvaAmount: 0 };
                tvaMap[rate].baseHT += itemHT * sign;
                tvaMap[rate].tvaAmount += itemTV * sign;
            });
        });
        const totalTVA = Object.values(tvaMap).reduce((s, v) => s + v.tvaAmount, 0);
        const tvaByRate = Object.entries(tvaMap)
            .map(([rate, v]) => ({ rate: Number(rate), baseHT: v.baseHT, tvaAmount: v.tvaAmount }))
            .sort((a, b) => b.rate - a.rate);

        let retenuesQuery = 'SELECT SUM(montant_retenue) as total FROM retenues WHERE user_id=? AND year=?';
        const retenuesParams = [userId, y];
        if (quarter) {
            const monthStart = (quarter - 1) * 3 + 1;
            const monthEnd = quarter * 3;
            retenuesQuery += ' AND month BETWEEN ? AND ?';
            retenuesParams.push(monthStart, monthEnd);
        }
        const retenuesRows = this.db.prepare(retenuesQuery).get(...retenuesParams);
        const totalRetenuesSubi = retenuesRows?.total || 0;
        const monthList = quarter
            ? Array.from({ length: 3 }, (_, i) => String((quarter - 1) * 3 + i + 1).padStart(2, '0'))
            : Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
        const monthly = monthList.map(m => {
            const mDocs = factures.filter(d => (d.date || '').slice(5, 7) === m);
            const mRev = mDocs.reduce((s, d) => s + (d.type === 'avoir' ? -(d.total_ttc || 0) : d.total_ttc || 0), 0);
            const mHT = mDocs.reduce((s, d) => s + (d.type === 'avoir' ? -(d.total_ht || 0) : d.total_ht || 0), 0);
            const mTimb = mDocs.reduce((s, d) => s + (d.type === 'avoir' ? -(d.timbre_amount || 0) : d.timbre_amount || 0), 0);
            const mTVA = mRev - mHT - mTimb;
            const mRet = this.db
                .prepare('SELECT COALESCE(SUM(montant_retenue),0) as t FROM retenues WHERE user_id=? AND year=? AND month=?')
                .get(userId, y, parseInt(m)).t;
            return { month: m, revenue: mRev, tva: Math.max(0, mTVA), retenu: mRet || 0, timbre: mTimb };
        });
        return {
            year: y,
            quarter,
            totalHT,
            totalTVC: totalTVA,
            totalTVA,
            totalTTC,
            totalTimbre,
            totalRetenuesSubi,
            tvaByRate,
            monthly,
            docCount: factures.length
        };
    }

    // ==================== TEJ EXPORT DATA ====================
    getTEJData(params) {
        const { type, month, year, userId } = params;
        const monthStr = String(month).padStart(2, '0');
        const periodPattern = `${year}-${monthStr}-%`;

        if (type === 'RS') {
            // RS: Queries retenues table (Issued Certificates)
            return this.db
                .prepare(
                    `
                SELECT * FROM retenues 
                WHERE user_id = ? AND year = ? AND month = ?
                ORDER BY date ASC
            `
                )
                .all(userId, year, month);
        } else if (type === 'TEIF') {
            // TEIF: Queries documents where type = 'Facture' for that period.
            return this.db
                .prepare(
                    `
                SELECT d.*, c.mf as client_mf, c.name as client_name, c.address as client_address
                FROM documents d
                LEFT JOIN clients c ON d.client_id = c.id
                WHERE d.user_id = ? AND d.date LIKE ? AND d.type = 'facture'
                ORDER BY d.date ASC
            `
                )
                .all(userId, periodPattern);
        }
        return [];
    }

    // ==================== PAYMENTS ====================
    addPayment(data) {
        const id = uuidv4();
        this.db
            .prepare('INSERT INTO payments (id,user_id,document_id,amount,method,reference,date,notes) VALUES (?,?,?,?,?,?,?,?)')
            .run(id, data.userId, data.documentId, data.amount, data.method || null, data.reference || null, data.date, data.notes || null);
        const doc = this.getDocumentById(data.documentId);
        if (doc) {
            const newPaid = (doc.paidAmount || 0) + data.amount;
            const status = newPaid >= doc.totalTTC ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
            this.updateDocumentPaymentStatus(data.documentId, status, newPaid, status === 'paid' ? data.date : null);
        }
        return this.db.prepare('SELECT * FROM payments WHERE id=?').get(id);
    }
    getPayments(documentId) {
        return this.db.prepare('SELECT * FROM payments WHERE document_id=? ORDER BY date ASC').all(documentId);
    }
    deletePayment(paymentId) {
        const p = this.db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId);
        this.db.prepare('DELETE FROM payments WHERE id=?').run(paymentId);
        if (p) {
            const doc = this.getDocumentById(p.document_id);
            if (doc) {
                const remaining = Math.max(0, (doc.paidAmount || 0) - p.amount);
                const status = remaining === 0 ? 'unpaid' : remaining >= doc.totalTTC ? 'paid' : 'partial';
                const newPaidDate = status === 'paid' ? p.date : doc.paidDate || null;
                this.updateDocumentPaymentStatus(p.document_id, status, remaining, newPaidDate);
            }
        }
    }

    // ==================== CLIENTS ====================
    saveClient(clientData) {
        const id = clientData.id || uuidv4();
        const existing = this.db.prepare('SELECT id FROM clients WHERE id=?').get(id);
        if (existing) {
            this.db
                .prepare(
                    'UPDATE clients SET name=?,mf=?,address=?,phone=?,email=?,notes=?,tags=?,credit_limit=?,category=?,rib=? WHERE id=?'
                )
                .run(
                    clientData.name,
                    clientData.mf || null,
                    clientData.address || null,
                    clientData.phone || null,
                    clientData.email || null,
                    clientData.notes || null,
                    clientData.tags || null,
                    clientData.creditLimit || 0,
                    clientData.category || 'standard',
                    clientData.rib || null,
                    id
                );
        } else {
            this.db
                .prepare(
                    'INSERT INTO clients (id,user_id,name,mf,address,phone,email,notes,tags,credit_limit,category,rib) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(
                    id,
                    clientData.userId,
                    clientData.name,
                    clientData.mf || null,
                    clientData.address || null,
                    clientData.phone || null,
                    clientData.email || null,
                    clientData.notes || null,
                    clientData.tags || null,
                    clientData.creditLimit || 0,
                    clientData.category || 'standard',
                    clientData.rib || null
                );
        }
        return { id, ...clientData };
    }
    getClients(userId) {
        return this.db.prepare('SELECT * FROM clients WHERE user_id=? ORDER BY name').all(userId);
    }
    getClientById(id) {
        return this.db.prepare('SELECT * FROM clients WHERE id=?').get(id);
    }
    deleteClient(id) {
        const client = this.getClientById(id);
        if (client) {
            // H-10: Preserve financial invoice history — detach client_id rather than deleting historical invoices
            this.db.prepare("UPDATE documents SET client_id = NULL WHERE user_id=? AND client_name=?").run(client.user_id, client.name);
        }
        this.db.prepare('DELETE FROM clients WHERE id=?').run(id);
    }
    getClientHistory(userId, clientName) {
        const docs = this.db
            .prepare(
                'SELECT type, number, date, total_ttc, currency, payment_status FROM documents WHERE user_id=? AND client_name=? ORDER BY date DESC'
            )
            .all(userId, clientName);
        const totalRevenue = docs.filter(d => d.type === 'facture').reduce((s, d) => s + d.total_ttc, 0);
        return { docs, totalRevenue, docCount: docs.length };
    }

    // ==================== COMPANY ====================
    saveCompanySettings(settings) {
        const vals = [
            settings.userId,
            settings.name,
            settings.mf,
            settings.address,
            settings.phone,
            settings.email,
            settings.rc,
            settings.website || null,
            settings.bank || null,
            settings.rib || null,
            settings.logoImage || null,
            settings.stampImage || null,
            settings.signatureImage || null,
            settings.show_logo ?? 1,
            settings.show_stamp ?? 1,
            settings.show_signature ?? 1,
            settings.show_qr ?? 0,
            settings.show_accent ?? 1,
            settings.name,
            settings.mf,
            settings.address,
            settings.phone,
            settings.email,
            settings.rc,
            settings.website || null,
            settings.bank || null,
            settings.rib || null,
            settings.logoImage || null,
            settings.stampImage || null,
            settings.signatureImage || null,
            settings.show_logo ?? 1,
            settings.show_stamp ?? 1,
            settings.show_signature ?? 1,
            settings.show_qr ?? 0,
            settings.show_accent ?? 1
        ];
        this.db
            .prepare(
                'INSERT INTO companies (user_id,name,mf,address,phone,email,rc,website,bank,rib,logo_image,stamp_image,signature_image,show_logo,show_stamp,show_signature,show_qr,show_accent) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=?,mf=?,address=?,phone=?,email=?,rc=?,website=?,bank=?,rib=?,logo_image=COALESCE(?,logo_image),stamp_image=COALESCE(?,stamp_image),signature_image=COALESCE(?,signature_image),show_logo=?,show_stamp=?,show_signature=?,show_qr=?,show_accent=?,updated_at=CURRENT_TIMESTAMP'
            )
            .run(...vals);
        return settings;
    }
    saveCompanyImages(userId, { logoImage, stampImage, signatureImage }) {
        this.db
            .prepare(
                "INSERT INTO companies (user_id,name,mf,address,phone,email,rc,logo_image,stamp_image,signature_image) VALUES (?,'','','','','','',?,?,?) ON CONFLICT(user_id) DO UPDATE SET logo_image=COALESCE(?,logo_image), stamp_image=COALESCE(?,stamp_image), signature_image=COALESCE(?,signature_image), updated_at=CURRENT_TIMESTAMP"
            )
            .run(
                userId,
                logoImage || null,
                stampImage || null,
                signatureImage || null,
                logoImage || null,
                stampImage || null,
                signatureImage || null
            );
    }
    removeCompanyImage(userId, imageType) {
        if (!['logo', 'stamp', 'signature'].includes(imageType)) {
            throw new Error('Invalid image type');
        }
        const col = imageType === 'logo' ? 'logo_image' : imageType === 'stamp' ? 'stamp_image' : 'signature_image';
        this.db.prepare(`UPDATE companies SET ${col}=NULL WHERE user_id=?`).run(userId);
    }
    getCompanySettings(userId) {
        return this.db.prepare('SELECT * FROM companies WHERE user_id=?').get(userId);
    }

    // ==================== STATS ====================
    getDashboardStats(userId) {
        const totalDocs = this.db.prepare('SELECT COUNT(*) as count FROM documents WHERE user_id=?').get(userId).count;
        const totalRevenue = this.db
            .prepare(
                "SELECT COALESCE(SUM(CASE WHEN type='facture' THEN total_ttc WHEN type='avoir' THEN -total_ttc ELSE 0 END),0) as total FROM documents WHERE user_id=?"
            )
            .get(userId).total;
        const totalClients = this.db.prepare('SELECT COUNT(*) as count FROM clients WHERE user_id=?').get(userId).count;
        const thisMonth = this.db
            .prepare("SELECT COUNT(*) as count FROM documents WHERE user_id=? AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')")
            .get(userId).count;
        const unpaidCount = this.db
            .prepare("SELECT COUNT(*) as count FROM documents WHERE user_id=? AND type='facture' AND payment_status!='paid'")
            .get(userId).count;
        const unpaidTotal = this.db
            .prepare(
                "SELECT COALESCE(SUM(CASE WHEN type='facture' THEN (total_ttc-paid_amount) WHEN type='avoir' THEN -(total_ttc-paid_amount) ELSE 0 END),0) as total FROM documents WHERE user_id=? AND payment_status!='paid'"
            )
            .get(userId).total;
        const monthlyRevenue = this.db
            .prepare(
                "SELECT strftime('%Y-%m',date) as month, COALESCE(SUM(CASE WHEN type='facture' THEN total_ttc WHEN type='avoir' THEN -total_ttc ELSE 0 END),0) as revenue, COUNT(*) as count FROM documents WHERE user_id=? AND type IN ('facture', 'avoir') AND date>=date('now','-6 months') GROUP BY month ORDER BY month ASC"
            )
            .all(userId);
        const typeBreakdown = this.db
            .prepare('SELECT type, COUNT(*) as count, COALESCE(SUM(total_ttc),0) as total FROM documents WHERE user_id=? GROUP BY type')
            .all(userId);
        const topClients = this.db
            .prepare(
                "SELECT client_name, COUNT(*) as doc_count, COALESCE(SUM(CASE WHEN type='facture' THEN total_ttc WHEN type='avoir' THEN -total_ttc ELSE 0 END),0) as revenue FROM documents WHERE user_id=? AND type IN ('facture', 'avoir') GROUP BY client_name ORDER BY revenue DESC LIMIT 5"
            )
            .all(userId);
        const recentActivity = this.db.prepare('SELECT * FROM activity_log WHERE user_id=? ORDER BY created_at DESC LIMIT 8').all(userId);
        const today = new Date().toISOString().split('T')[0];
        const overdueCount = this.db
            .prepare(
                "SELECT COUNT(*) as count FROM documents WHERE user_id=? AND type='facture' AND payment_status!='paid' AND due_date IS NOT NULL AND due_date < ?"
            )
            .get(userId, today).count;
        const totalRetenues = this.db
            .prepare("SELECT COALESCE(SUM(montant_retenue),0) as total FROM retenues WHERE user_id=? AND year=strftime('%Y','now')")
            .get(userId).total;
        const totalExpenses = this.db
            .prepare('SELECT COALESCE(SUM(amount_ttc),0) as total FROM expenses WHERE user_id=?')
            .get(userId).total;
        const monthlyExpenses = this.db
            .prepare(
                "SELECT strftime('%Y-%m',date) as month, COALESCE(SUM(amount_ttc),0) as expense FROM expenses WHERE user_id=? AND date>=date('now','-6 months') GROUP BY month ORDER BY month ASC"
            )
            .all(userId);
        const netProfit = totalRevenue - totalExpenses;
        return {
            totalDocs,
            totalRevenue,
            totalClients,
            thisMonth,
            unpaidCount,
            unpaidTotal,
            totalExpenses,
            netProfit,
            monthlyRevenue,
            monthlyExpenses,
            typeBreakdown,
            topClients,
            recentActivity,
            overdueCount,
            totalRetenues
        };
    }

    // ==================== FOURNISSEURS ====================
    saveFournisseur(fData) {
        const id = fData.id || uuidv4();
        const existing = this.db.prepare('SELECT id FROM fournisseurs WHERE id=?').get(id);
        if (existing) {
            this.db
                .prepare('UPDATE fournisseurs SET name=?,mf=?,address=?,phone=?,email=?,notes=?,category=?,rib=? WHERE id=?')
                .run(
                    fData.name,
                    fData.mf || null,
                    fData.address || null,
                    fData.phone || null,
                    fData.email || null,
                    fData.notes || null,
                    fData.category || 'standard',
                    fData.rib || null,
                    id
                );
        } else {
            this.db
                .prepare('INSERT INTO fournisseurs (id,user_id,name,mf,address,phone,email,notes,category,rib) VALUES (?,?,?,?,?,?,?,?,?,?)')
                .run(
                    id,
                    fData.userId,
                    fData.name,
                    fData.mf || null,
                    fData.address || null,
                    fData.phone || null,
                    fData.email || null,
                    fData.notes || null,
                    fData.category || 'standard',
                    fData.rib || null
                );
        }
        this.logActivity(fData.userId, existing ? 'update_fournisseur' : 'create_fournisseur', 'fournisseur', id, fData.name);
        return this.getFournisseurById(id);
    }
    getFournisseurs(userId) {
        return this.db
            .prepare('SELECT * FROM fournisseurs WHERE user_id=? ORDER BY name ASC')
            .all(userId)
            .map(f => this.formatFournisseur(f));
    }
    getFournisseurById(id) {
        const f = this.db.prepare('SELECT * FROM fournisseurs WHERE id=?').get(id);
        return f ? this.formatFournisseur(f) : null;
    }
    deleteFournisseur(id) {
        this.db.prepare('DELETE FROM fournisseurs WHERE id=?').run(id);
    }
    formatFournisseur(f) {
        return {
            id: f.id,
            userId: f.user_id,
            name: f.name,
            mf: f.mf,
            address: f.address,
            phone: f.phone,
            email: f.email,
            notes: f.notes,
            category: f.category,
            rib: f.rib,
            createdAt: f.created_at
        };
    }

    // ==================== SERVICES ====================
    saveService(d) {
        const id = d.id || uuidv4();
        const ex = this.db.prepare('SELECT id FROM services WHERE id=?').get(id);
        if (ex) {
            this.db
                .prepare(
                    'UPDATE services SET name=?,description=?,price=?,tva=?,category=?,unit=?,barcode=?,stock=?,min_stock=? WHERE id=?'
                )
                .run(
                    d.name,
                    d.description || null,
                    d.price,
                    d.tva,
                    d.category || null,
                    d.unit || 'unité',
                    d.barcode || null,
                    d.stock || 0,
                    d.minStock || 0,
                    id
                );
        } else {
            this.db
                .prepare(
                    'INSERT INTO services (id,user_id,name,description,price,tva,category,unit,barcode,stock,min_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(
                    id,
                    d.userId,
                    d.name,
                    d.description || null,
                    d.price,
                    d.tva,
                    d.category || null,
                    d.unit || 'unité',
                    d.barcode || null,
                    d.stock || 0,
                    d.minStock || 0
                );
        }
        return { id, ...d };
    }
    getServices(userId) {
        return this.db.prepare('SELECT * FROM services WHERE user_id=? ORDER BY name').all(userId);
    }
    deleteService(id) {
        this.db.prepare('DELETE FROM services WHERE id=?').run(id);
    }
    // CRIT-13: Renamed from updateStock to addStockBatch to resolve name collision with POS updateStock
    addStockBatch(updates) {
        // updates is an array of { id, qty }
        const stmt = this.db.prepare('UPDATE services SET stock = stock + ? WHERE id = ?');
        const transaction = this.db.transaction((items) => {
            for (const item of items) {
                stmt.run(item.qty, item.id);
            }
        });
        transaction(updates);
    }


    // ==================== SERVICE CATEGORIES ====================
    saveServiceCategory(d) {
        const id = d.id || uuidv4();
        const ex = this.db.prepare('SELECT id FROM service_categories WHERE id=?').get(id);
        if (ex) this.db.prepare('UPDATE service_categories SET name=?,color=? WHERE id=?').run(d.name, d.color || '#3b82f6', id);
        else
            this.db
                .prepare('INSERT INTO service_categories (id,user_id,name,color) VALUES (?,?,?,?)')
                .run(id, d.userId, d.name, d.color || '#3b82f6');
        return { id, ...d };
    }
    getServiceCategories(userId) {
        return this.db.prepare('SELECT * FROM service_categories WHERE user_id=? ORDER BY name').all(userId);
    }
    deleteServiceCategory(id) {
        this.db.prepare('DELETE FROM service_categories WHERE id=?').run(id);
    }

    // ==================== USER SETTINGS ====================
    getUserSettings(userId) {
        let s = this.db.prepare('SELECT * FROM user_settings WHERE user_id=?').get(userId);
        if (!s) {
            this.db
                .prepare(
                    "INSERT INTO user_settings (user_id,prefix_facture,prefix_devis,prefix_bon,prefix_retenue,prefix_avoir,prefix_contract,prefix_ticket,decimal_places,rounding_method) VALUES (?,'FAC','DEV','BC','RS','AV','CTR','TIC',3,'half_up')"
                )
                .run(userId);
            s = this.db.prepare('SELECT * FROM user_settings WHERE user_id=?').get(userId);
        }
        return s;
    }
    updateUserSettings(userId, settings) {
        this.db
            .prepare(
                `UPDATE user_settings SET 
            prefix_facture=COALESCE(?,prefix_facture), 
            prefix_devis=COALESCE(?,prefix_devis), 
            prefix_bon=COALESCE(?,prefix_bon), 
            prefix_bl=COALESCE(?,prefix_bl),
            prefix_ba=COALESCE(?,prefix_ba),
            prefix_bs=COALESCE(?,prefix_bs),
            prefix_be=COALESCE(?,prefix_be),
            prefix_retenue=COALESCE(?,prefix_retenue), 
            prefix_avoir=COALESCE(?,prefix_avoir), 
            prefix_contract=COALESCE(?,prefix_contract), 
            prefix_ticket=COALESCE(?,prefix_ticket),
            decimal_places=COALESCE(?,decimal_places), 
            rounding_method=COALESCE(?,rounding_method), 
            document_theme=COALESCE(?,document_theme), 
            currency_default=COALESCE(?,currency_default) 
            WHERE user_id=?`
            )
            .run(
                settings.prefix_facture || null,
                settings.prefix_devis || null,
                settings.prefix_bon || null,
                settings.prefix_bl || null,
                settings.prefix_ba || null,
                settings.prefix_bs || null,
                settings.prefix_be || null,
                settings.prefix_retenue || null,
                settings.prefix_avoir || null,
                settings.prefix_contract || null,
                settings.prefix_ticket || null,
                settings.decimal_places !== undefined ? settings.decimal_places : null,
                settings.rounding_method || null,
                settings.document_theme !== undefined ? settings.document_theme : null,
                settings.currency_default || null,
                userId
            );
        return this.getUserSettings(userId);
    }

    // ==================== DOCUMENT THEME ====================
    getThemeSettings(userId) {
        const row = this.db.prepare('SELECT * FROM document_themes WHERE user_id = ?').get(userId);
        if (!row) return null;
        return {
            fontFamily: row.font_family,
            fontSize: row.font_size,
            titles: {
                facture: { text: row.title_facture_text, color: row.title_facture_color },
                devis: { text: row.title_devis_text, color: row.title_devis_color },
                bon: { text: row.title_bon_text, color: row.title_bon_color }
            }
        };
    }
    saveThemeSettings(userId, theme) {
        this.db
            .prepare(
                'INSERT INTO document_themes (user_id, font_family, font_size, title_facture_text, title_facture_color, title_devis_text, title_devis_color, title_bon_text, title_bon_color) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET font_family=excluded.font_family, font_size=excluded.font_size, title_facture_text=excluded.title_facture_text, title_facture_color=excluded.title_facture_color, title_devis_text=excluded.title_devis_text, title_devis_color=excluded.title_devis_color, title_bon_text=excluded.title_bon_text, title_bon_color=excluded.title_bon_color'
            )
            .run(
                userId,
                theme.fontFamily,
                theme.fontSize,
                theme.titles.facture.text,
                theme.titles.facture.color,
                theme.titles.devis.text,
                theme.titles.devis.color,
                theme.titles.bon.text,
                theme.titles.bon.color
            );
        return { success: true };
    }
    getDocumentTheme(userId) {
        const s = this.getUserSettings(userId);
        if (!s?.document_theme) return null;
        try {
            return JSON.parse(s.document_theme);
        } catch {
            return null;
        }
    }
    saveDocumentTheme(userId, theme) {
        this.db.prepare('UPDATE user_settings SET document_theme=? WHERE user_id=?').run(JSON.stringify(theme), userId);
        return { success: true };
    }

    // ==================== CONTRACTS ====================
    saveContract(data) {
        const id = data.id || uuidv4();
        const year = new Date().getFullYear();
        const number = data.number || this.getNextDocumentNumber(data.userId, 'contract', year);
        const ex = this.db.prepare('SELECT id FROM contracts WHERE id=?').get(id);
        const fields = [
            data.type,
            number,
            data.title || null,
            data.employerName || null,
            data.employerMF || null,
            data.employerAddress || null,
            data.employerRep || null,
            data.employerRepRole || null,
            data.employeeName || null,
            data.employeeCIN || null,
            data.employeeAddress || null,
            data.employeeRole || null,
            data.employeeDepartment || null,
            data.startDate || null,
            data.endDate || null,
            data.salary || null,
            data.salaryType || 'mensuel',
            data.workHours || 40,
            data.workLocation || null,
            data.trialPeriod ? 1 : 0,
            data.trialDuration || null,
            data.noticePeriod || null,
            data.extraClauses || null,
            data.status || 'brouillon',
            data.notes || null,
            data.signedAt || null,
            data.pdfPath || null
        ];
        if (ex) {
            this.db
                .prepare(
                    'UPDATE contracts SET type=?,number=?,title=?,employer_name=?,employer_mf=?,employer_address=?,employer_rep=?,employer_rep_role=?,employee_name=?,employee_cin=?,employee_address=?,employee_role=?,employee_department=?,start_date=?,end_date=?,salary=?,salary_type=?,work_hours=?,work_location=?,trial_period=?,trial_duration=?,notice_period=?,extra_clauses=?,status=?,notes=?,signed_at=?,pdf_path=? WHERE id=?'
                )
                .run(...fields, id);
        } else {
            this.db
                .prepare(
                    'INSERT INTO contracts (id,user_id,type,number,title,employer_name,employer_mf,employer_address,employer_rep,employer_rep_role,employee_name,employee_cin,employee_address,employee_role,employee_department,start_date,end_date,salary,salary_type,work_hours,work_location,trial_period,trial_duration,notice_period,extra_clauses,status,notes,signed_at,pdf_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(id, data.userId, ...fields);
        }
        return this.getContractById(id);
    }
    getContracts(userId) {
        return this.db
            .prepare('SELECT * FROM contracts WHERE user_id=? ORDER BY created_at DESC')
            .all(userId)
            .map(c => this.formatContract(c));
    }
    getContractById(id) {
        const c = this.db.prepare('SELECT * FROM contracts WHERE id=?').get(id);
        return c ? this.formatContract(c) : null;
    }
    deleteContract(id) {
        this.db.prepare('DELETE FROM contracts WHERE id=?').run(id);
    }
    formatContract(c) {
        return {
            id: c.id,
            userId: c.user_id,
            type: c.type,
            number: c.number,
            title: c.title,
            employerName: c.employer_name,
            employerMF: c.employer_mf,
            employerAddress: c.employer_address,
            employerRep: c.employer_rep,
            employerRepRole: c.employer_rep_role,
            employeeName: c.employee_name,
            employeeCIN: c.employee_cin,
            employeeAddress: c.employee_address,
            employeeRole: c.employee_role,
            employeeDepartment: c.employee_department,
            startDate: c.start_date,
            endDate: c.end_date,
            salary: c.salary,
            salaryType: c.salary_type,
            workHours: c.work_hours,
            workLocation: c.work_location,
            trialPeriod: c.trial_period === 1,
            trialDuration: c.trial_duration,
            noticePeriod: c.notice_period,
            extraClauses: c.extra_clauses,
            status: c.status,
            notes: c.notes,
            signedAt: c.signed_at,
            pdfPath: c.pdf_path,
            createdAt: c.created_at
        };
    }

    // ==================== EXPENSES ====================
    saveExpense(data) {
        const id = data.id || uuidv4();
        const ex = this.db.prepare('SELECT id FROM expenses WHERE id=?').get(id);
        const fields = [
            data.date,
            data.vendor || null,
            data.category || null,
            data.description || null,
            data.amountHT || 0,
            data.tvaRate || 0,
            data.amountTTC || 0,
            data.retenueSource || 0,
            data.paymentMethod || null,
            data.reference || null,
            data.docType || 'facture',
            data.attachmentPath || null,
            data.attachmentName || null,
            data.notes || null
        ];
        if (ex) {
            this.db
                .prepare(
                    'UPDATE expenses SET date=?,vendor=?,category=?,description=?,amount_ht=?,tva_rate=?,amount_ttc=?,retenue_source=?,payment_method=?,reference=?,doc_type=?,attachment_path=?,attachment_name=?,notes=? WHERE id=?'
                )
                .run(...fields, id);
        } else {
            this.db
                .prepare(
                    'INSERT INTO expenses (id,user_id,date,vendor,category,description,amount_ht,tva_rate,amount_ttc,retenue_source,payment_method,reference,doc_type,attachment_path,attachment_name,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(id, data.userId, ...fields);
        }
        return this.getExpenseById(id);
    }

    getExpenses(userId) {
        return this.db
            .prepare('SELECT * FROM expenses WHERE user_id=? ORDER BY date DESC, created_at DESC')
            .all(userId)
            .map(e => this.formatExpense(e));
    }

    getExpenseById(id) {
        const e = this.db.prepare('SELECT * FROM expenses WHERE id=?').get(id);
        return e ? this.formatExpense(e) : null;
    }

    deleteExpense(id) {
        const e = this.db.prepare('SELECT attachment_path FROM expenses WHERE id=?').get(id);
        this.db.prepare('DELETE FROM expenses WHERE id=?').run(id);
        return e?.attachment_path || null;
    }

    getExpenseSummary(userId, year) {
        const y = year || new Date().getFullYear();
        try {
            const byCategory = this.db
                .prepare(
                    "SELECT category, COALESCE(SUM(amount_ttc),0) as total, COUNT(*) as count FROM expenses WHERE user_id=? AND strftime('%Y',date)=? GROUP BY category ORDER BY total DESC"
                )
                .all(userId, String(y));
            const monthly = this.db
                .prepare(
                    "SELECT strftime('%m',date) as month, COALESCE(SUM(amount_ttc),0) as total FROM expenses WHERE user_id=? AND strftime('%Y',date)=? GROUP BY month ORDER BY month ASC"
                )
                .all(userId, String(y));
            const totalYear = this.db
                .prepare("SELECT COALESCE(SUM(amount_ttc),0) as total FROM expenses WHERE user_id=? AND strftime('%Y',date)=?")
                .get(userId, String(y)).total;
            return { byCategory, monthly, totalYear, year: y };
        } catch (e) {
            return { byCategory: [], monthly: [], totalYear: 0, year: y };
        }
    }

    formatExpense(e) {
        return {
            id: e.id,
            userId: e.user_id,
            date: e.date,
            vendor: e.vendor,
            category: e.category,
            description: e.description,
            amountHT: e.amount_ht,
            tvaRate: e.tva_rate,
            amountTTC: e.amount_ttc,
            retenueSource: e.retenue_source,
            paymentMethod: e.payment_method,
            reference: e.reference,
            docType: e.doc_type,
            attachmentPath: e.attachment_path,
            attachmentName: e.attachment_name,
            notes: e.notes,
            createdAt: e.created_at
        };
    }

    // ==================== ANNUAL STATS ====================
    getAnnualStats(userId, year) {
        const y = year || new Date().getFullYear();
        const monthly = this.db
            .prepare(
                "SELECT strftime('%m', date) as month, COUNT(*) as count, COALESCE(SUM(CASE WHEN type='facture' THEN total_ttc WHEN type='avoir' THEN -total_ttc ELSE 0 END),0) as revenue FROM documents WHERE user_id=? AND strftime('%Y',date)=? GROUP BY month ORDER BY month ASC"
            )
            .all(userId, String(y));
        const byType = this.db
            .prepare(
                "SELECT type, COUNT(*) as count, COALESCE(SUM(total_ttc),0) as total FROM documents WHERE user_id=? AND strftime('%Y',date)=? GROUP BY type"
            )
            .all(userId, String(y));
        const totalRevenue = this.db
            .prepare(
                "SELECT COALESCE(SUM(CASE WHEN type='facture' THEN total_ttc WHEN type='avoir' THEN -total_ttc ELSE 0 END),0) as total FROM documents WHERE user_id=? AND strftime('%Y',date)=?"
            )
            .get(userId, String(y)).total;
        const topClients = this.db
            .prepare(
                "SELECT client_name, COUNT(*) as count, COALESCE(SUM(CASE WHEN type='facture' THEN total_ttc WHEN type='avoir' THEN -total_ttc ELSE 0 END),0) as revenue FROM documents WHERE user_id=? AND strftime('%Y',date)=? GROUP BY client_name ORDER BY revenue DESC LIMIT 10"
            )
            .all(userId, String(y));
        const totalRetenueYear = this.db
            .prepare('SELECT COALESCE(SUM(montant_retenue),0) as total FROM retenues WHERE user_id=? AND year=?')
            .get(userId, y).total;
        const expenseSummary = this.getExpenseSummary(userId, y);
        return { year: y, monthly, byType, totalRevenue, topClients, totalRetenueYear, expenseSummary };
    }

    getClientStats(userId, clientName) {
        const docs = this.db
            .prepare('SELECT * FROM documents WHERE user_id=? AND client_name=? ORDER BY date DESC')
            .all(userId, clientName)
            .map(d => this.formatDocument(d));
        const totalRevenue = docs
            .filter(d => ['facture', 'avoir'].includes(d.type))
            .reduce((s, d) => s + (d.type === 'avoir' ? -d.totalTTC : d.totalTTC), 0);
        const unpaidRevenue = docs
            .filter(d => ['facture', 'avoir'].includes(d.type) && d.paymentStatus !== 'paid')
            .reduce((s, d) => s + (d.type === 'avoir' ? -(d.totalTTC - d.paidAmount) : d.totalTTC - d.paidAmount), 0);
        const monthlyRevenue = this.db
            .prepare(
                "SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(CASE WHEN type='facture' THEN total_ttc WHEN type='avoir' THEN -total_ttc ELSE 0 END),0) as revenue FROM documents WHERE user_id=? AND client_name=? AND type IN ('facture', 'avoir') GROUP BY month ORDER BY month ASC"
            )
            .all(userId, clientName);
        return { docs, totalRevenue, unpaidRevenue, docCount: docs.length, monthlyRevenue };
    }

    // ==================== DOCUMENT SEARCH ====================
    // M-08: LIKE on items_json is a known perf tradeoff — acceptable for <10k docs per user.
    // For larger datasets, consider FTS5 virtual table or denormalized item_descriptions column.
    searchDocuments(userId, query) {
        if (!query || typeof query !== 'string') return [];
        // Sanitize: escape SQL LIKE wildcards in user input
        const sanitized = query.replace(/[%_]/g, '\\$&');
        const q = `%${sanitized}%`;
        return this.db
            .prepare(
                "SELECT * FROM documents WHERE user_id=? AND (number LIKE ? ESCAPE '\\' OR client_name LIKE ? ESCAPE '\\' OR company_name LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\' OR items_json LIKE ? ESCAPE '\\' OR date LIKE ? ESCAPE '\\' OR type LIKE ? ESCAPE '\\') ORDER BY created_at DESC LIMIT 50"
            )
            .all(userId, q, q, q, q, q, q, q)
            .map(d => this.formatDocument(d));
    }

    // ==================== NOTES ====================
    saveNote(data) {
        const id = data.id || uuidv4();
        const now = new Date().toISOString();
        const ex = this.db.prepare('SELECT id FROM notes WHERE id=?').get(id);
        if (ex) {
            this.db
                .prepare('UPDATE notes SET title=?,content=?,color=?,pinned=?,updated_at=? WHERE id=?')
                .run(data.title || null, data.content || null, data.color || '#fef9c3', data.pinned ? 1 : 0, now, id);
        } else {
            this.db
                .prepare('INSERT INTO notes (id,user_id,title,content,color,pinned) VALUES (?,?,?,?,?,?)')
                .run(id, data.userId, data.title || null, data.content || null, data.color || '#fef9c3', data.pinned ? 1 : 0);
        }
        return this.db.prepare('SELECT * FROM notes WHERE id=?').get(id);
    }
    getNotes(userId) {
        return this.db.prepare('SELECT * FROM notes WHERE user_id=? ORDER BY pinned DESC, updated_at DESC').all(userId);
    }
    deleteNote(id) {
        this.db.prepare('DELETE FROM notes WHERE id=?').run(id);
    }

    // ==================== REMINDERS ====================
    saveReminder(data) {
        const id = data.id || uuidv4();
        const ex = this.db.prepare('SELECT id FROM reminders WHERE id=?').get(id);
        if (ex) {
            this.db
                .prepare('UPDATE reminders SET title=?,description=?,due_date=?,due_time=?,entity_type=?,entity_id=?,done=? WHERE id=?')
                .run(
                    data.title,
                    data.description || null,
                    data.dueDate,
                    data.dueTime || '09:00',
                    data.entityType || null,
                    data.entityId || null,
                    data.done ? 1 : 0,
                    id
                );
        } else {
            this.db
                .prepare(
                    'INSERT INTO reminders (id,user_id,title,description,due_date,due_time,entity_type,entity_id) VALUES (?,?,?,?,?,?,?,?)'
                )
                .run(
                    id,
                    data.userId,
                    data.title,
                    data.description || null,
                    data.dueDate,
                    data.dueTime || '09:00',
                    data.entityType || null,
                    data.entityId || null
                );
        }
        return this.db.prepare('SELECT * FROM reminders WHERE id=?').get(id);
    }
    getReminders(userId) {
        return this.db
            .prepare('SELECT * FROM reminders WHERE user_id=? ORDER BY done ASC, due_date ASC, due_time ASC')
            .all(userId)
            .map(r => this.formatReminder(r));
    }
    getDueReminders() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);
        return this.db
            .prepare('SELECT * FROM reminders WHERE done=0 AND notified=0 AND (due_date < ? OR (due_date = ? AND due_time <= ?))')
            .all(today, today, timeStr)
            .map(r => {
                this.db.prepare('UPDATE reminders SET notified=1 WHERE id=?').run(r.id);
                return this.formatReminder(r);
            });
    }
    markReminderDone(id) {
        this.db.prepare('UPDATE reminders SET done=1 WHERE id=?').run(id);
    }
    deleteReminder(id) {
        this.db.prepare('DELETE FROM reminders WHERE id=?').run(id);
    }
    formatReminder(r) {
        return {
            id: r.id,
            userId: r.user_id,
            title: r.title,
            description: r.description,
            dueDate: r.due_date,
            dueTime: r.due_time,
            entityType: r.entity_type,
            entityId: r.entity_id,
            done: r.done === 1,
            notified: r.notified === 1,
            createdAt: r.created_at
        };
    }

    // ==================== RELANCES (history) ====================
    saveRelance(data) {
        const id = data.id || uuidv4();
        this.db
            .prepare('INSERT INTO relances (id,user_id,invoice_id,attempt,method,recipient_email,notes) VALUES (?,?,?,?,?,?,?)')
            .run(id, data.userId, data.invoiceId, data.attempt || 1, data.method || 'pdf', data.recipientEmail || null, data.notes || null);
        return this.db.prepare('SELECT * FROM relances WHERE id=?').get(id);
    }
    getRelancesByInvoice(invoiceId) {
        return this.db
            .prepare('SELECT * FROM relances WHERE invoice_id=? ORDER BY sent_at ASC')
            .all(invoiceId)
            .map(r => this.formatRelance(r));
    }
    getRelanceAttemptCount(invoiceId) {
        const row = this.db.prepare('SELECT MAX(attempt) as max_attempt FROM relances WHERE invoice_id=?').get(invoiceId);
        return row?.max_attempt || 0;
    }
    formatRelance(r) {
        return {
            id: r.id,
            userId: r.user_id,
            invoiceId: r.invoice_id,
            attempt: r.attempt,
            method: r.method,
            recipientEmail: r.recipient_email,
            sentAt: r.sent_at,
            notes: r.notes
        };
    }

    // ==================== EXCHANGE RATES ====================
    getExchangeRates(userId) {
        return this.db.prepare('SELECT * FROM exchange_rates WHERE user_id=? ORDER BY currency').all(userId);
    }
    saveExchangeRate(data) {
        const existing = this.db.prepare('SELECT id FROM exchange_rates WHERE user_id=? AND currency=?').get(data.userId, data.currency);
        if (existing) {
            this.db.prepare('UPDATE exchange_rates SET rate=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(data.rate, existing.id);
        } else {
            this.db
                .prepare('INSERT INTO exchange_rates (id,user_id,currency,rate) VALUES (?,?,?,?)')
                .run(uuidv4(), data.userId, data.currency, data.rate);
        }
        return this.db.prepare('SELECT * FROM exchange_rates WHERE user_id=? AND currency=?').get(data.userId, data.currency);
    }
    deleteExchangeRate(userId, currency) {
        this.db.prepare('DELETE FROM exchange_rates WHERE user_id=? AND currency=?').run(userId, currency);
    }

    // ==================== ACTIVITY LOG ====================
    logActivity(userId, action, entityType, entityId, entityLabel) {
        try {
            this.db
                .prepare('INSERT INTO activity_log (id,user_id,action,entity_type,entity_id,entity_label) VALUES (?,?,?,?,?,?)')
                .run(uuidv4(), userId, action, entityType || null, entityId || null, entityLabel || null);
        } catch {}
    }
    getActivityLog(userId, limit = 50) {
        return this.db.prepare('SELECT * FROM activity_log WHERE user_id=? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
    }
    clearActivityLog(userId) {
        this.db.prepare('DELETE FROM activity_log WHERE user_id=?').run(userId);
    }
    // ==================== EMPLOYEES & PAYROLL ====================
    getEmployees(userId) {
        return this.db.prepare('SELECT * FROM employees WHERE user_id=? ORDER BY name').all(userId);
    }
    saveEmployee(e) {
        const id = e.id || uuidv4();
        const existing = this.db.prepare('SELECT id FROM employees WHERE id=?').get(id);
        const vals = [
            e.name,
            e.cin || null,
            e.cnss || null,
            e.role || null,
            e.department || null,
            e.hire_date || null,
            e.base_salary || 0,
            e.transport_allowance || 0,
            e.other_allowances || 0,
            e.active !== undefined ? e.active : 1
        ];
        if (existing)
            this.db
                .prepare(
                    'UPDATE employees SET name=?, cin=?, cnss=?, role=?, department=?, hire_date=?, base_salary=?, transport_allowance=?, other_allowances=?, active=? WHERE id=?'
                )
                .run(...vals, id);
        else
            this.db
                .prepare(
                    'INSERT INTO employees (id,user_id,name,cin,cnss,role,department,hire_date,base_salary,transport_allowance,other_allowances,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(id, e.userId, ...vals);
        return id;
    }
    deleteEmployee(id) {
        this.db.prepare('DELETE FROM employees WHERE id=?').run(id);
    }

    getPayslips(userId) {
        return this.db
            .prepare(
                'SELECT p.*, e.name as employee_name FROM payslips p JOIN employees e ON p.employee_id = e.id WHERE p.user_id=? ORDER BY p.period_year DESC, p.period_month DESC'
            )
            .all(userId);
    }
    savePayslip(p) {
        const id = p.id || uuidv4();
        const existing = this.db.prepare('SELECT id FROM payslips WHERE id=?').get(id);
        const grossSalary = p.gross_salary || ((p.base_salary || 0) + (p.transport_allowance || 0) + (p.other_allowances || 0));
        // H-17: Employer CNSS contribution (16.57% per Tunisian law)
        const employerCNSS = p.employer_cnss || Math.round(grossSalary * 0.1657 * 1000) / 1000;
        // H-18: Sequential payslip numbering
        const year = p.period_year || new Date().getFullYear();
        const number = p.number || this.getNextDocumentNumber(p.userId, 'payslip', year);

        const vals = [
            p.employee_id,
            number,
            p.period_month,
            p.period_year,
            p.date,
            p.base_salary,
            p.transport_allowance,
            p.other_allowances,
            grossSalary,
            p.cnss_deduction,
            p.irpp_deduction,
            employerCNSS,
            p.net_salary,
            p.status || 'unpaid'
        ];
        if (existing)
            this.db
                .prepare(
                    'UPDATE payslips SET employee_id=?, number=?, period_month=?, period_year=?, date=?, base_salary=?, transport_allowance=?, other_allowances=?, gross_salary=?, cnss_deduction=?, irpp_deduction=?, employer_cnss=?, net_salary=?, status=? WHERE id=?'
                )
                .run(...vals, id);
        else
            this.db
                .prepare(
                    'INSERT INTO payslips (id,user_id,employee_id,number,period_month,period_year,date,base_salary,transport_allowance,other_allowances,gross_salary,cnss_deduction,irpp_deduction,employer_cnss,net_salary,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(id, p.userId, ...vals);
        return id;
    }
    deletePayslip(id) {
        this.db.prepare('DELETE FROM payslips WHERE id=?').run(id);
    }
    // ==================== RECURRING INVOICES ====================
    getRecurringInvoices(userId) {
        return this.db
            .prepare(
                `
            SELECT r.*, d.number as doc_number, d.client_name 
            FROM recurring_invoices r 
            LEFT JOIN documents d ON r.template_id = d.id 
            WHERE r.user_id=?
        `
            )
            .all(userId);
    }
    saveRecurringInvoice(r) {
        const id = r.id || uuidv4();
        const existing = this.db.prepare('SELECT id FROM recurring_invoices WHERE id=?').get(id);
        const docNumber = this.peekNextDocumentNumber(r.userId, r.docType, new Date().getFullYear());
        const items = (r.itemsTemplate || []).map((line, i) => {
            const parts = line.split('|').map(s => s.trim());
            return {
                description: parts[0] || '',
                quantity: parseFloat(parts[1]) || 1,
                price: parseFloat(parts[2]) || 0,
                tva: parseInt(parts[3]) || 19
            };
        });
        const nextDate = new Date();
        const day = r.dayOfMonth || 15;
        nextDate.setDate(day);
        if (nextDate < new Date()) nextDate.setMonth(nextDate.getMonth() + 1);
        const nextRun = nextDate.toISOString().split('T')[0];
        const vals = [
            r.clientId,
            r.docType,
            r.dayOfMonth,
            JSON.stringify(items),
            r.currency || 'TND',
            r.paymentMode || 'Virement bancaire',
            r.frequency,
            null,
            nextRun,
            id
        ];
        if (existing)
            this.db
                .prepare(
                    'UPDATE recurring_invoices SET client_id=?, doc_type=?, day_of_month=?, items_template=?, currency=?, payment_mode=?, frequency=?, last_run=?, next_run=? WHERE id=?'
                )
                .run(...vals);
        else
            this.db
                .prepare(
                    'INSERT INTO recurring_invoices (id,user_id,client_id,doc_type,day_of_month,items_template,currency,payment_mode,frequency,last_run,next_run) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
                )
                .run(id, r.userId, ...vals);
        return id;
    }
    getDueRecurringInvoices() {
        return this.db
            .prepare("SELECT * FROM recurring_invoices WHERE active=1 AND next_run IS NOT NULL AND next_run <= date('now')")
            .all();
    }
    updateRecurringNextRun(id, lastRun, nextRun) {
        this.db.prepare('UPDATE recurring_invoices SET last_run=?, next_run=? WHERE id=?').run(lastRun, nextRun, id);
    }
    deleteRecurringInvoice(id) {
        this.db.prepare('DELETE FROM recurring_invoices WHERE id=?').run(id);
    }
    getDatabase() {
        return this.db;
    }

    // ==================== DOCUMENT TEMPLATES ====================
    getTemplates(userId) {
        return this.db.prepare('SELECT * FROM document_templates WHERE user_id=? ORDER BY name ASC').all(userId);
    }
    saveTemplate(data) {
        const id = data.id || uuidv4();
        const existing = this.db.prepare('SELECT id FROM document_templates WHERE id=?').get(id);
        if (existing)
            this.db
                .prepare('UPDATE document_templates SET name=?, type=?, data=? WHERE id=?')
                .run(data.name, data.type, JSON.stringify(data.templateData), id);
        else
            this.db
                .prepare('INSERT INTO document_templates (id,user_id,name,type,data) VALUES (?,?,?,?,?)')
                .run(id, data.userId, data.name, data.type, JSON.stringify(data.templateData));
        return id;
    }
    deleteTemplate(id) {
        this.db.prepare('DELETE FROM document_templates WHERE id=?').run(id);
    }

    // ==================== POS (Point of Sale) ====================
    getProducts(userId) {
        return this.db.prepare('SELECT * FROM services WHERE user_id=? ORDER BY category, name').all(userId);
    }

    getProductsPaginated(userId, page = 1, pageSize = 100) {
        const offset = (page - 1) * pageSize;
        const rows = this.db
            .prepare('SELECT * FROM services WHERE user_id=? ORDER BY category, name LIMIT ? OFFSET ?')
            .all(userId, pageSize, offset);
        const countRow = this.db.prepare('SELECT COUNT(*) as total FROM services WHERE user_id=?').get(userId);
        return { rows, total: countRow.total, page, pageSize, hasMore: offset + pageSize < countRow.total };
    }

    getProductByBarcode(userId, barcode) {
        return this.db.prepare('SELECT * FROM services WHERE user_id=? AND barcode=?').get(userId, barcode);
    }

    // CRIT-13: Renamed from updateStock to setStock to resolve name collision
    setStock(id, quantity) {
        this.db.prepare('UPDATE services SET stock=? WHERE id=?').run(quantity, id);
    }

    deductStock(id, qty) {
        this.db.prepare('UPDATE services SET stock = MAX(0, stock - ?) WHERE id=?').run(parseFloat(qty) || 0, id);
    }

    deductStockBatch(items) {
        const stmt = this.db.prepare('UPDATE services SET stock = MAX(0, stock - ?) WHERE id=?');
        const txn = this.db.transaction(items => {
            for (const item of items) {
                if (item.serviceId) {
                    stmt.run(parseFloat(item.quantity) || 0, item.serviceId);
                }
            }
        });
        txn(items);
    }

    getActiveSession(userId) {
        return this.db.prepare("SELECT * FROM pos_sessions WHERE user_id=? AND status='open' ORDER BY opened_at DESC LIMIT 1").get(userId);
    }

    openSession(userId, openingBalance) {
        const existing = this.getActiveSession(userId);
        if (existing) return existing;
        const id = uuidv4();
        const now = new Date().toISOString();
        this.db
            .prepare('INSERT INTO pos_sessions (id,user_id,opened_at,opening_balance,status) VALUES (?,?,?,?,?)')
            .run(id, userId, now, openingBalance || 0, 'open');
        return this.db.prepare('SELECT * FROM pos_sessions WHERE id=?').get(id);
    }

    closeSession(id, closingCash, closingCard) {
        const closingTotal = (parseFloat(closingCash) || 0) + (parseFloat(closingCard) || 0);
        const now = new Date().toISOString();
        this.db
            .prepare(
                `
            UPDATE pos_sessions SET closed_at=?, closing_cash=?, closing_card=?, closing_total=?, status='closed' WHERE id=?
        `
            )
            .run(now, closingCash || 0, closingCard || 0, closingTotal, id);
        return this.db.prepare('SELECT * FROM pos_sessions WHERE id=?').get(id);
    }

    addPosSaleToSession(sessionId, amount, method) {
        const session = this.db.prepare('SELECT * FROM pos_sessions WHERE id=?').get(sessionId);
        if (!session) return;
        const cashSales = method === 'cash' ? (session.cash_sales || 0) + amount : session.cash_sales;
        const cardSales = method === 'card' ? (session.card_sales || 0) + amount : session.card_sales;
        this.db
            .prepare(
                `
            UPDATE pos_sessions SET total_sales=total_sales+?, cash_sales=?, card_sales=?, transaction_count=transaction_count+1 WHERE id=?
        `
            )
            .run(amount, cashSales, cardSales, sessionId);
    }

    getPosSales(userId, sessionId) {
        const where = sessionId ? 'AND pos_session_id=?' : '';
        const params = sessionId ? [userId, sessionId] : [userId];
        return this.db.prepare(`SELECT * FROM documents WHERE user_id=? AND is_pos=1 ${where} ORDER BY created_at DESC`).all(...params);
    }

    getTodayPosSales(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db
            .prepare('SELECT * FROM documents WHERE user_id=? AND is_pos=1 AND date(date) = date(?) ORDER BY created_at DESC')
            .all(userId, today);
    }

    getPosSaleById(id) {
        return this.db.prepare('SELECT * FROM documents WHERE id=? AND is_pos=1').get(id);
    }

    getPosSessions(userId) {
        return this.db.prepare('SELECT * FROM pos_sessions WHERE user_id=? ORDER BY opened_at DESC LIMIT 30').all(userId);
    }

    getLowStockProducts(userId) {
        return this.db
            .prepare('SELECT * FROM services WHERE user_id=? AND min_stock > 0 AND stock <= min_stock ORDER BY stock ASC')
            .all(userId);
    }

    // ── POS Loyalty ────────────────────────────────────────────────────
    getLoyaltyPoints(userId, clientName) {
        if (!clientName || clientName === 'Client du magasin') return 0;
        const row = this.db.prepare('SELECT points FROM pos_loyalty WHERE user_id=? AND client_name=?').get(userId, clientName);
        return row ? row.points : 0;
    }

    addLoyaltyPoints(userId, clientName, amount) {
        if (!clientName || clientName === 'Client du magasin') return 0;
        const pointsToAdd = Math.floor(amount / 10);
        if (pointsToAdd <= 0) return 0;
        const id = uuidv4();
        this.db
            .prepare(
                `
            INSERT INTO pos_loyalty (id, user_id, client_name, points, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id, client_name)
            DO UPDATE SET points = points + ?, updated_at = datetime('now')
        `
            )
            .run(id, userId, clientName, pointsToAdd, pointsToAdd);
        return this.getLoyaltyPoints(userId, clientName);
    }
}

module.exports = AppDatabase;
