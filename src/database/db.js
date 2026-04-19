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
        this.initTables();
        this.runMigrations();
    }

    // ==================== MIGRATIONS ====================
    runMigrations() {
        const tryAlter = (sql) => { try { this.db.exec(sql); } catch {} };
        // companies
        tryAlter(`ALTER TABLE companies ADD COLUMN website TEXT`);
        tryAlter(`ALTER TABLE companies ADD COLUMN bank TEXT`);
        tryAlter(`ALTER TABLE companies ADD COLUMN logo_image TEXT`);
        tryAlter(`ALTER TABLE companies ADD COLUMN stamp_image TEXT`);
        tryAlter(`ALTER TABLE companies ADD COLUMN signature_image TEXT`);
        // user_settings: decimal/rounding/theme
        tryAlter(`ALTER TABLE user_settings ADD COLUMN decimal_places INTEGER DEFAULT 3`);
        tryAlter(`ALTER TABLE user_settings ADD COLUMN rounding_method TEXT DEFAULT 'half_up'`);
        tryAlter(`ALTER TABLE user_settings ADD COLUMN document_theme TEXT DEFAULT NULL`);
        tryAlter(`ALTER TABLE user_settings ADD COLUMN currency_default TEXT DEFAULT 'TND'`);
        // documents: payment tracking + rounding
        tryAlter(`ALTER TABLE documents ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`);
        tryAlter(`ALTER TABLE documents ADD COLUMN paid_amount REAL DEFAULT 0`);
        tryAlter(`ALTER TABLE documents ADD COLUMN paid_date TEXT`);
        tryAlter(`ALTER TABLE documents ADD COLUMN rounding_adjustment REAL DEFAULT 0`);
    }

    // ==================== THEME SETTINGS (legacy per-type colours) ====================
    getThemeSettings(userId) {
        const row = this.db.prepare('SELECT * FROM document_themes WHERE user_id = ?').get(userId);
        if (!row) return null;
        return {
            fontFamily: row.font_family, fontSize: row.font_size,
            titles: {
                facture: { text: row.title_facture_text, color: row.title_facture_color },
                devis:   { text: row.title_devis_text,   color: row.title_devis_color   },
                bon:     { text: row.title_bon_text,     color: row.title_bon_color     }
            }
        };
    }

    saveThemeSettings(userId, theme) {
        this.db.prepare(`
            INSERT INTO document_themes (user_id, font_family, font_size,
                title_facture_text, title_facture_color,
                title_devis_text, title_devis_color,
                title_bon_text, title_bon_color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                font_family=excluded.font_family, font_size=excluded.font_size,
                title_facture_text=excluded.title_facture_text, title_facture_color=excluded.title_facture_color,
                title_devis_text=excluded.title_devis_text, title_devis_color=excluded.title_devis_color,
                title_bon_text=excluded.title_bon_text, title_bon_color=excluded.title_bon_color
        `).run(userId, theme.fontFamily, theme.fontSize,
            theme.titles.facture.text, theme.titles.facture.color,
            theme.titles.devis.text,   theme.titles.devis.color,
            theme.titles.bon.text,     theme.titles.bon.color);
        return { success: true };
    }

    // ==================== INIT TABLES ====================
    initTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS document_themes (
                user_id TEXT PRIMARY KEY,
                font_family TEXT DEFAULT "'Segoe UI', sans-serif",
                font_size TEXT DEFAULT '14px',
                title_facture_text TEXT DEFAULT 'FACTURE',
                title_facture_color TEXT DEFAULT '#1e3a8a',
                title_devis_text TEXT DEFAULT 'DEVIS',
                title_devis_color TEXT DEFAULT '#92400e',
                title_bon_text TEXT DEFAULT 'BON DE COMMANDE',
                title_bon_color TEXT DEFAULT '#065f46'
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                company TEXT,
                mf TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                number TEXT NOT NULL,
                date TEXT NOT NULL,
                due_date TEXT,
                currency TEXT DEFAULT 'TND',
                payment_mode TEXT,
                payment_status TEXT DEFAULT 'unpaid',
                paid_amount REAL DEFAULT 0,
                paid_date TEXT,
                company_name TEXT,
                company_mf TEXT,
                company_address TEXT,
                company_phone TEXT,
                company_email TEXT,
                company_rc TEXT,
                client_name TEXT NOT NULL,
                client_mf TEXT,
                client_address TEXT,
                client_phone TEXT,
                client_email TEXT,
                items_json TEXT NOT NULL,
                apply_timbre INTEGER DEFAULT 0,
                timbre_amount REAL DEFAULT 0,
                rounding_adjustment REAL DEFAULT 0,
                total_ht REAL NOT NULL,
                total_ttc REAL NOT NULL,
                logo_image TEXT,
                stamp_image TEXT,
                signature_image TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                mf TEXT,
                address TEXT,
                phone TEXT,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS companies (
                user_id TEXT PRIMARY KEY,
                name TEXT, mf TEXT, address TEXT, phone TEXT, email TEXT, rc TEXT,
                website TEXT, bank TEXT,
                logo_image TEXT, stamp_image TEXT, signature_image TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS doc_counters (
                user_id TEXT NOT NULL, type TEXT NOT NULL, year INTEGER NOT NULL,
                last_number INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, type, year)
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS services (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                price REAL DEFAULT 0,
                tva REAL DEFAULT 19,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id TEXT PRIMARY KEY,
                prefix_facture TEXT DEFAULT 'FAC',
                prefix_devis TEXT DEFAULT 'DEV',
                prefix_bon TEXT DEFAULT 'BC',
                decimal_places INTEGER DEFAULT 3,
                rounding_method TEXT DEFAULT 'half_up',
                document_theme TEXT DEFAULT NULL,
                currency_default TEXT DEFAULT 'TND',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contracts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                number TEXT NOT NULL,
                title TEXT,
                employer_name TEXT, employer_mf TEXT, employer_address TEXT,
                employer_rep TEXT, employer_rep_role TEXT,
                employee_name TEXT, employee_cin TEXT, employee_address TEXT,
                employee_role TEXT, employee_department TEXT,
                start_date TEXT, end_date TEXT,
                salary REAL, salary_type TEXT DEFAULT 'mensuel',
                work_hours REAL DEFAULT 40, work_location TEXT,
                trial_period INTEGER DEFAULT 0, trial_duration TEXT,
                notice_period TEXT, extra_clauses TEXT,
                status TEXT DEFAULT 'brouillon',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                amount REAL NOT NULL,
                method TEXT,
                reference TEXT,
                date TEXT NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                entity_label TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    getDatabasePath() { return this.dbPath; }

    restore(backupPath) {
        this.db.close();
        fs.copyFileSync(backupPath, this.dbPath);
        this.db = new Database(this.dbPath);
    }

    // ==================== AUTH ====================
    registerUser({ name, email, password, company, mf }) {
        const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) throw new Error('Email already exists');
        const id = uuidv4();
        const hash = bcrypt.hashSync(password, 10);
        this.db.prepare(`INSERT INTO users (id,name,email,password_hash,company,mf) VALUES (?,?,?,?,?,?)`).run(id,name,email,hash,company||null,mf||null);
        this.db.prepare(`INSERT INTO user_settings (user_id,prefix_facture,prefix_devis,prefix_bon,decimal_places,rounding_method) VALUES (?,'FAC','DEV','BC',3,'half_up')`).run(id);
        return { id, name, email, company, mf };
    }

    loginUser(email, password) {
        const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !bcrypt.compareSync(password, user.password_hash)) throw new Error('Invalid credentials');
        return { id: user.id, name: user.name, email: user.email, company: user.company, mf: user.mf };
    }

    // ==================== DOCUMENT NUMBERING ====================
    getNextDocumentNumber(userId, type, year) {
        const counter = this.db.prepare(`SELECT last_number FROM doc_counters WHERE user_id=? AND type=? AND year=?`).get(userId,type,year);
        const nextNum = (counter?.last_number||0)+1;
        this.db.prepare(`INSERT INTO doc_counters (user_id,type,year,last_number) VALUES (?,?,?,?) ON CONFLICT(user_id,type,year) DO UPDATE SET last_number=?`).run(userId,type,year,nextNum,nextNum);
        const s = this.getUserSettings(userId);
        const prefix = type==='facture'?(s.prefix_facture||'FAC'):type==='devis'?(s.prefix_devis||'DEV'):(s.prefix_bon||'BC');
        return `${prefix}-${year}-${String(nextNum).padStart(3,'0')}`;
    }

    resetDocumentCounter(userId, type, year) {
        if (type==='all') this.db.prepare(`DELETE FROM doc_counters WHERE user_id=? AND year=?`).run(userId,year);
        else this.db.prepare(`DELETE FROM doc_counters WHERE user_id=? AND type=? AND year=?`).run(userId,type,year);
        return { success: true };
    }

    // ==================== DOCUMENTS ====================
    saveDocument(docData) {
        const id = docData.id || uuidv4();
        const number = docData.number || this.getNextDocumentNumber(docData.userId,docData.type,new Date().getFullYear());
        const existing = this.db.prepare('SELECT id FROM documents WHERE id=?').get(id);
        const vals = [
            docData.type, number, docData.date, docData.dueDate||null,
            docData.currency||'TND', docData.paymentMode||null,
            docData.paymentStatus||'unpaid', docData.paidAmount||0, docData.paidDate||null,
            docData.companyName||null, docData.companyMF||null, docData.companyAddress||null,
            docData.companyPhone||null, docData.companyEmail||null, docData.companyRC||null,
            docData.clientName, docData.clientMF||null, docData.clientAddress||null,
            docData.clientPhone||null, docData.clientEmail||null,
            JSON.stringify(docData.items), docData.applyTimbre?1:0, docData.timbreAmount||0,
            docData.roundingAdjustment||0, docData.totalHT, docData.totalTTC,
            docData.logoImage||null, docData.stampImage||null, docData.signatureImage||null,
            docData.notes||null
        ];
        if (existing) {
            this.db.prepare(`UPDATE documents SET type=?,number=?,date=?,due_date=?,currency=?,payment_mode=?,payment_status=?,paid_amount=?,paid_date=?,company_name=?,company_mf=?,company_address=?,company_phone=?,company_email=?,company_rc=?,client_name=?,client_mf=?,client_address=?,client_phone=?,client_email=?,items_json=?,apply_timbre=?,timbre_amount=?,rounding_adjustment=?,total_ht=?,total_ttc=?,logo_image=?,stamp_image=?,signature_image=?,notes=? WHERE id=?`).run(...vals,id);
        } else {
            this.db.prepare(`INSERT INTO documents (id,user_id,type,number,date,due_date,currency,payment_mode,payment_status,paid_amount,paid_date,company_name,company_mf,company_address,company_phone,company_email,company_rc,client_name,client_mf,client_address,client_phone,client_email,items_json,apply_timbre,timbre_amount,rounding_adjustment,total_ht,total_ttc,logo_image,stamp_image,signature_image,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,docData.userId,...vals);
        }
        this.logActivity(docData.userId, existing?'update_document':'create_document', 'document', id, `${(docData.type||'').toUpperCase()} ${number}`);
        return this.getDocumentById(id);
    }

    getDocuments(userId) {
        return this.db.prepare(`SELECT * FROM documents WHERE user_id=? ORDER BY created_at DESC`).all(userId).map(d=>this.formatDocument(d));
    }

    getDocumentById(docId) {
        const doc = this.db.prepare('SELECT * FROM documents WHERE id=?').get(docId);
        return doc ? this.formatDocument(doc) : null;
    }

    deleteDocument(docId) {
        this.db.prepare('DELETE FROM documents WHERE id=?').run(docId);
        this.db.prepare('DELETE FROM payments WHERE document_id=?').run(docId);
    }

    updateDocumentPaymentStatus(docId, status, paidAmount, paidDate) {
        this.db.prepare(`UPDATE documents SET payment_status=?,paid_amount=?,paid_date=? WHERE id=?`).run(status,paidAmount||0,paidDate||null,docId);
    }

    formatDocument(doc) {
        return {
            id:doc.id, userId:doc.user_id, type:doc.type, number:doc.number,
            date:doc.date, dueDate:doc.due_date, currency:doc.currency, paymentMode:doc.payment_mode,
            paymentStatus:doc.payment_status||'unpaid', paidAmount:doc.paid_amount||0, paidDate:doc.paid_date,
            companyName:doc.company_name, companyMF:doc.company_mf, companyAddress:doc.company_address,
            companyPhone:doc.company_phone, companyEmail:doc.company_email, companyRC:doc.company_rc,
            clientName:doc.client_name, clientMF:doc.client_mf, clientAddress:doc.client_address,
            clientPhone:doc.client_phone, clientEmail:doc.client_email,
            items:JSON.parse(doc.items_json),
            applyTimbre:doc.apply_timbre===1, timbreAmount:doc.timbre_amount,
            roundingAdjustment:doc.rounding_adjustment||0,
            totalHT:doc.total_ht, totalTTC:doc.total_ttc,
            logoImage:doc.logo_image, stampImage:doc.stamp_image, signatureImage:doc.signature_image,
            notes:doc.notes, createdAt:doc.created_at
        };
    }

    // ==================== PAYMENTS ====================
    addPayment(data) {
        const id = uuidv4();
        this.db.prepare(`INSERT INTO payments (id,user_id,document_id,amount,method,reference,date,notes) VALUES (?,?,?,?,?,?,?,?)`).run(id,data.userId,data.documentId,data.amount,data.method||null,data.reference||null,data.date,data.notes||null);
        const doc = this.getDocumentById(data.documentId);
        if (doc) {
            const newPaid = (doc.paidAmount||0)+data.amount;
            const status = newPaid>=doc.totalTTC?'paid':newPaid>0?'partial':'unpaid';
            this.updateDocumentPaymentStatus(data.documentId, status, newPaid, status==='paid'?data.date:null);
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
                const remaining = Math.max(0,(doc.paidAmount||0)-p.amount);
                const status = remaining<=0?'unpaid':remaining>=doc.totalTTC?'paid':'partial';
                this.updateDocumentPaymentStatus(p.document_id, status, remaining, status==='paid'?p.date:null);
            }
        }
    }

    // ==================== CLIENTS ====================
    saveClient(clientData) {
        const id = clientData.id||uuidv4();
        const existing = this.db.prepare('SELECT id FROM clients WHERE id=?').get(id);
        if (existing) {
            this.db.prepare(`UPDATE clients SET name=?,mf=?,address=?,phone=?,email=? WHERE id=?`).run(clientData.name,clientData.mf||null,clientData.address||null,clientData.phone||null,clientData.email||null,id);
        } else {
            this.db.prepare(`INSERT INTO clients (id,user_id,name,mf,address,phone,email) VALUES (?,?,?,?,?,?,?)`).run(id,clientData.userId,clientData.name,clientData.mf||null,clientData.address||null,clientData.phone||null,clientData.email||null);
        }
        return { id, ...clientData };
    }

    getClients(userId) { return this.db.prepare('SELECT * FROM clients WHERE user_id=? ORDER BY name').all(userId); }
    deleteClient(id)   { this.db.prepare('DELETE FROM clients WHERE id=?').run(id); }

    // ==================== COMPANY ====================
    saveCompanySettings(settings) {
        this.db.prepare(`
            INSERT INTO companies (user_id,name,mf,address,phone,email,rc,website,bank,logo_image,stamp_image,signature_image)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(user_id) DO UPDATE SET
                name=?,mf=?,address=?,phone=?,email=?,rc=?,website=?,bank=?,
                logo_image=COALESCE(?,logo_image),
                stamp_image=COALESCE(?,stamp_image),
                signature_image=COALESCE(?,signature_image),
                updated_at=CURRENT_TIMESTAMP
        `).run(
            settings.userId,settings.name,settings.mf,settings.address,settings.phone,settings.email,settings.rc,settings.website||null,settings.bank||null,settings.logoImage||null,settings.stampImage||null,settings.signatureImage||null,
            settings.name,settings.mf,settings.address,settings.phone,settings.email,settings.rc,settings.website||null,settings.bank||null,settings.logoImage||null,settings.stampImage||null,settings.signatureImage||null
        );
        return settings;
    }

    saveCompanyImages(userId, { logoImage, stampImage, signatureImage }) {
        this.db.prepare(`
            INSERT INTO companies (user_id,name,mf,address,phone,email,rc,logo_image,stamp_image,signature_image) VALUES (?,'','','','','','',?,?,?)
            ON CONFLICT(user_id) DO UPDATE SET
                logo_image=COALESCE(?,logo_image),
                stamp_image=COALESCE(?,stamp_image),
                signature_image=COALESCE(?,signature_image),
                updated_at=CURRENT_TIMESTAMP
        `).run(userId,logoImage||null,stampImage||null,signatureImage||null,logoImage||null,stampImage||null,signatureImage||null);
    }

    removeCompanyImage(userId, imageType) {
        const col = imageType==='logo'?'logo_image':imageType==='stamp'?'stamp_image':'signature_image';
        this.db.prepare(`UPDATE companies SET ${col}=NULL WHERE user_id=?`).run(userId);
    }

    getCompanySettings(userId) { return this.db.prepare('SELECT * FROM companies WHERE user_id=?').get(userId); }

    // ==================== STATS ====================
    getDashboardStats(userId) {
        const totalDocs    = this.db.prepare('SELECT COUNT(*) as count FROM documents WHERE user_id=?').get(userId).count;
        const totalRevenue = this.db.prepare(`SELECT COALESCE(SUM(total_ttc),0) as total FROM documents WHERE user_id=? AND type='facture'`).get(userId).total;
        const totalClients = this.db.prepare('SELECT COUNT(*) as count FROM clients WHERE user_id=?').get(userId).count;
        const thisMonth    = this.db.prepare(`SELECT COUNT(*) as count FROM documents WHERE user_id=? AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')`).get(userId).count;
        const unpaidCount  = this.db.prepare(`SELECT COUNT(*) as count FROM documents WHERE user_id=? AND type='facture' AND payment_status!='paid'`).get(userId).count;
        const unpaidTotal  = this.db.prepare(`SELECT COALESCE(SUM(total_ttc-paid_amount),0) as total FROM documents WHERE user_id=? AND type='facture' AND payment_status!='paid'`).get(userId).total;

        const monthlyRevenue = this.db.prepare(`
            SELECT strftime('%Y-%m',date) as month, COALESCE(SUM(total_ttc),0) as revenue, COUNT(*) as count
            FROM documents WHERE user_id=? AND type='facture' AND date>=date('now','-6 months')
            GROUP BY month ORDER BY month ASC
        `).all(userId);

        const typeBreakdown = this.db.prepare(`
            SELECT type, COUNT(*) as count, COALESCE(SUM(total_ttc),0) as total
            FROM documents WHERE user_id=? GROUP BY type
        `).all(userId);

        const topClients = this.db.prepare(`
            SELECT client_name, COUNT(*) as doc_count, COALESCE(SUM(total_ttc),0) as revenue
            FROM documents WHERE user_id=? AND type='facture'
            GROUP BY client_name ORDER BY revenue DESC LIMIT 5
        `).all(userId);

        const recentActivity = this.db.prepare(`SELECT * FROM activity_log WHERE user_id=? ORDER BY created_at DESC LIMIT 8`).all(userId);

        return { totalDocs, totalRevenue, totalClients, thisMonth, unpaidCount, unpaidTotal, monthlyRevenue, typeBreakdown, topClients, recentActivity };
    }

    // ==================== SERVICES ====================
    saveService(d) {
        const id = d.id||uuidv4();
        const ex = this.db.prepare('SELECT id FROM services WHERE id=?').get(id);
        if (ex) this.db.prepare(`UPDATE services SET name=?,description=?,price=?,tva=? WHERE id=?`).run(d.name,d.description||null,d.price,d.tva,id);
        else     this.db.prepare(`INSERT INTO services (id,user_id,name,description,price,tva) VALUES (?,?,?,?,?,?)`).run(id,d.userId,d.name,d.description||null,d.price,d.tva);
        return { id, ...d };
    }
    getServices(userId) { return this.db.prepare('SELECT * FROM services WHERE user_id=? ORDER BY name').all(userId); }
    deleteService(id)   { this.db.prepare('DELETE FROM services WHERE id=?').run(id); }

    // ==================== USER SETTINGS ====================
    getUserSettings(userId) {
        let s = this.db.prepare('SELECT * FROM user_settings WHERE user_id=?').get(userId);
        if (!s) {
            this.db.prepare(`INSERT INTO user_settings (user_id,prefix_facture,prefix_devis,prefix_bon,decimal_places,rounding_method) VALUES (?,'FAC','DEV','BC',3,'half_up')`).run(userId);
            s = this.db.prepare('SELECT * FROM user_settings WHERE user_id=?').get(userId);
        }
        return s;
    }

    updateUserSettings(userId, settings) {
        this.db.prepare(`
            UPDATE user_settings SET
                prefix_facture=COALESCE(?,prefix_facture),
                prefix_devis=COALESCE(?,prefix_devis),
                prefix_bon=COALESCE(?,prefix_bon),
                decimal_places=COALESCE(?,decimal_places),
                rounding_method=COALESCE(?,rounding_method),
                document_theme=COALESCE(?,document_theme),
                currency_default=COALESCE(?,currency_default)
            WHERE user_id=?
        `).run(
            settings.prefix_facture||null, settings.prefix_devis||null, settings.prefix_bon||null,
            settings.decimal_places!==undefined?settings.decimal_places:null,
            settings.rounding_method||null,
            settings.document_theme!==undefined?settings.document_theme:null,
            settings.currency_default||null,
            userId
        );
        return this.getUserSettings(userId);
    }

    // ==================== DOCUMENT THEME (full JSON) ====================
    getDocumentTheme(userId) {
        const s = this.getUserSettings(userId);
        if (!s?.document_theme) return null;
        try { return JSON.parse(s.document_theme); } catch { return null; }
    }

    saveDocumentTheme(userId, theme) {
        this.db.prepare(`UPDATE user_settings SET document_theme=? WHERE user_id=?`).run(JSON.stringify(theme), userId);
        return { success: true };
    }

    // ==================== CONTRACTS ====================
    saveContract(data) {
        const id = data.id||uuidv4();
        const year = new Date().getFullYear();
        const number = data.number||`CTR-${year}-${String(Math.floor(Math.random()*9000)+1000)}`;
        const ex = this.db.prepare('SELECT id FROM contracts WHERE id=?').get(id);
        const fields = [
            data.type, number, data.title||null,
            data.employerName||null, data.employerMF||null, data.employerAddress||null,
            data.employerRep||null, data.employerRepRole||null,
            data.employeeName||null, data.employeeCIN||null, data.employeeAddress||null,
            data.employeeRole||null, data.employeeDepartment||null,
            data.startDate||null, data.endDate||null,
            data.salary||null, data.salaryType||'mensuel',
            data.workHours||40, data.workLocation||null,
            data.trialPeriod?1:0, data.trialDuration||null,
            data.noticePeriod||null, data.extraClauses||null,
            data.status||'brouillon', data.notes||null
        ];
        if (ex) {
            this.db.prepare(`UPDATE contracts SET type=?,number=?,title=?,employer_name=?,employer_mf=?,employer_address=?,employer_rep=?,employer_rep_role=?,employee_name=?,employee_cin=?,employee_address=?,employee_role=?,employee_department=?,start_date=?,end_date=?,salary=?,salary_type=?,work_hours=?,work_location=?,trial_period=?,trial_duration=?,notice_period=?,extra_clauses=?,status=?,notes=? WHERE id=?`).run(...fields,id);
        } else {
            this.db.prepare(`INSERT INTO contracts (id,user_id,type,number,title,employer_name,employer_mf,employer_address,employer_rep,employer_rep_role,employee_name,employee_cin,employee_address,employee_role,employee_department,start_date,end_date,salary,salary_type,work_hours,work_location,trial_period,trial_duration,notice_period,extra_clauses,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,data.userId,...fields);
        }
        return this.getContractById(id);
    }

    getContracts(userId)  { return this.db.prepare('SELECT * FROM contracts WHERE user_id=? ORDER BY created_at DESC').all(userId).map(c=>this.formatContract(c)); }
    getContractById(id)   { const c = this.db.prepare('SELECT * FROM contracts WHERE id=?').get(id); return c?this.formatContract(c):null; }
    deleteContract(id)    { this.db.prepare('DELETE FROM contracts WHERE id=?').run(id); }

    formatContract(c) {
        return {
            id:c.id, userId:c.user_id, type:c.type, number:c.number, title:c.title,
            employerName:c.employer_name, employerMF:c.employer_mf, employerAddress:c.employer_address,
            employerRep:c.employer_rep, employerRepRole:c.employer_rep_role,
            employeeName:c.employee_name, employeeCIN:c.employee_cin, employeeAddress:c.employee_address,
            employeeRole:c.employee_role, employeeDepartment:c.employee_department,
            startDate:c.start_date, endDate:c.end_date,
            salary:c.salary, salaryType:c.salary_type,
            workHours:c.work_hours, workLocation:c.work_location,
            trialPeriod:c.trial_period===1, trialDuration:c.trial_duration,
            noticePeriod:c.notice_period, extraClauses:c.extra_clauses,
            status:c.status, notes:c.notes, createdAt:c.created_at
        };
    }

    // ==================== ACTIVITY LOG ====================
    logActivity(userId, action, entityType, entityId, entityLabel) {
        try { this.db.prepare(`INSERT INTO activity_log (id,user_id,action,entity_type,entity_id,entity_label) VALUES (?,?,?,?,?,?)`).run(uuidv4(),userId,action,entityType||null,entityId||null,entityLabel||null); } catch {}
    }
}

module.exports = AppDatabase;