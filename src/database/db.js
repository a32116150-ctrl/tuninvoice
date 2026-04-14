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
    }

    initTables() {
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
                name TEXT,
                mf TEXT,
                address TEXT,
                phone TEXT,
                email TEXT,
                rc TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS doc_counters (
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                year INTEGER NOT NULL,
                last_number INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, type, year)
            )
        `);
    }

    getDatabasePath() {
        return this.dbPath;
    }

    restore(backupPath) {
        this.db.close();
        fs.copyFileSync(backupPath, this.dbPath);
        this.db = new Database(this.dbPath);
    }

    registerUser({ name, email, password, company, mf }) {
        const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) throw new Error('Email already exists');

        const id = uuidv4();
        const passwordHash = bcrypt.hashSync(password, 10);

        this.db.prepare(`
            INSERT INTO users (id, name, email, password_hash, company, mf)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, name, email, passwordHash, company || null, mf || null);

        return { id, name, email, company, mf };
    }

    loginUser(email, password) {
        const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) throw new Error('Invalid credentials');

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) throw new Error('Invalid credentials');

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            company: user.company,
            mf: user.mf
        };
    }

    getNextDocumentNumber(userId, type, year) {
        const counter = this.db.prepare(`
            SELECT last_number FROM doc_counters 
            WHERE user_id = ? AND type = ? AND year = ?
        `).get(userId, type, year);

        const nextNum = (counter?.last_number || 0) + 1;

        this.db.prepare(`
            INSERT INTO doc_counters (user_id, type, year, last_number)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, type, year) DO UPDATE SET last_number = ?
        `).run(userId, type, year, nextNum, nextNum);

        const prefix = type === 'facture' ? 'FAC' : type === 'devis' ? 'DEV' : 'BC';
        return `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;
    }


    updateDocument(doc) {
        const stmt = this.db.prepare(`UPDATE documents SET type=?, number=?, date=?, totalTTC=?, clientName=? WHERE id=?`);
        return stmt.run(doc.type, doc.number, doc.date, doc.totalTTC, doc.clientName, doc.id);
    }

    saveDocument(docData) {
        const id = docData.id || uuidv4();
        const number = docData.number || this.getNextDocumentNumber(
            docData.userId,
            docData.type,
            new Date().getFullYear()
        );

        const existing = this.db.prepare('SELECT id FROM documents WHERE id = ?').get(id);

        if (existing) {
            // Update
            this.db.prepare(`
                UPDATE documents SET
                    type = ?, number = ?, date = ?, due_date = ?, currency = ?,
                    payment_mode = ?, company_name = ?, company_mf = ?,
                    company_address = ?, company_phone = ?, company_email = ?,
                    company_rc = ?, client_name = ?, client_mf = ?,
                    client_address = ?, client_phone = ?, client_email = ?,
                    items_json = ?, apply_timbre = ?, timbre_amount = ?,
                    total_ht = ?, total_ttc = ?, logo_image = ?,
                    stamp_image = ?, signature_image = ?, notes = ?
                WHERE id = ?
            `).run(
                docData.type, number, docData.date, docData.dueDate || null,
                docData.currency || 'TND', docData.paymentMode || null,
                docData.companyName || null, docData.companyMF || null,
                docData.companyAddress || null, docData.companyPhone || null,
                docData.companyEmail || null, docData.companyRC || null,
                docData.clientName, docData.clientMF || null,
                docData.clientAddress || null, docData.clientPhone || null,
                docData.clientEmail || null, JSON.stringify(docData.items),
                docData.applyTimbre ? 1 : 0, docData.timbreAmount || 0,
                docData.totalHT, docData.totalTTC, docData.logoImage || null,
                docData.stampImage || null, docData.signatureImage || null,
                docData.notes || null, id
            );
        } else {
            // Insert
            this.db.prepare(`
                INSERT INTO documents (
                    id, user_id, type, number, date, due_date, currency,
                    payment_mode, company_name, company_mf, company_address,
                    company_phone, company_email, company_rc, client_name,
                    client_mf, client_address, client_phone, client_email,
                    items_json, apply_timbre, timbre_amount, total_ht, total_ttc,
                    logo_image, stamp_image, signature_image, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id, docData.userId, docData.type, number, docData.date,
                docData.dueDate || null, docData.currency || 'TND',
                docData.paymentMode || null, docData.companyName || null,
                docData.companyMF || null, docData.companyAddress || null,
                docData.companyPhone || null, docData.companyEmail || null,
                docData.companyRC || null, docData.clientName,
                docData.clientMF || null, docData.clientAddress || null,
                docData.clientPhone || null, docData.clientEmail || null,
                JSON.stringify(docData.items), docData.applyTimbre ? 1 : 0,
                docData.timbreAmount || 0, docData.totalHT, docData.totalTTC,
                docData.logoImage || null, docData.stampImage || null,
                docData.signatureImage || null, docData.notes || null
            );
        }

        return this.getDocumentById(id);
    }

    getDocuments(userId) {
        const docs = this.db.prepare(`
            SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC
        `).all(userId);
        return docs.map(d => this.formatDocument(d));
    }

    getDocumentById(docId) {
        const doc = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
        return doc ? this.formatDocument(doc) : null;
    }

    deleteDocument(docId) {
        this.db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
    }

    formatDocument(doc) {
        return {
            id: doc.id,
            userId: doc.user_id,
            type: doc.type,
            number: doc.number,
            date: doc.date,
            dueDate: doc.due_date,
            currency: doc.currency,
            paymentMode: doc.payment_mode,
            companyName: doc.company_name,
            companyMF: doc.company_mf,
            companyAddress: doc.company_address,
            companyPhone: doc.company_phone,
            companyEmail: doc.company_email,
            companyRC: doc.company_rc,
            clientName: doc.client_name,
            clientMF: doc.client_mf,
            clientAddress: doc.client_address,
            clientPhone: doc.client_phone,
            clientEmail: doc.client_email,
            items: JSON.parse(doc.items_json),
            applyTimbre: doc.apply_timbre === 1,
            timbreAmount: doc.timbre_amount,
            totalHT: doc.total_ht,
            totalTTC: doc.total_ttc,
            logoImage: doc.logo_image,
            stampImage: doc.stamp_image,
            signatureImage: doc.signature_image,
            notes: doc.notes,
            createdAt: doc.created_at
        };
    }

    saveClient(clientData) {
        const id = clientData.id || uuidv4();
        const existing = this.db.prepare('SELECT id FROM clients WHERE id = ?').get(id);

        if (existing) {
            this.db.prepare(`
                UPDATE clients SET name = ?, mf = ?, address = ?, phone = ?, email = ?
                WHERE id = ?
            `).run(clientData.name, clientData.mf || null, clientData.address || null,
                clientData.phone || null, clientData.email || null, id);
        } else {
            this.db.prepare(`
                INSERT INTO clients (id, user_id, name, mf, address, phone, email)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, clientData.userId, clientData.name, clientData.mf || null,
                clientData.address || null, clientData.phone || null, clientData.email || null);
        }

        return { id, ...clientData };
    }

    getClients(userId) {
        return this.db.prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY name').all(userId);
    }

    deleteClient(clientId) {
        this.db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    }

    saveCompanySettings(settings) {
        this.db.prepare(`
            INSERT INTO companies (user_id, name, mf, address, phone, email, rc)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name = ?, mf = ?, address = ?, phone = ?, email = ?, rc = ?,
                updated_at = CURRENT_TIMESTAMP
        `).run(settings.userId, settings.name, settings.mf, settings.address,
            settings.phone, settings.email, settings.rc,
            settings.name, settings.mf, settings.address,
            settings.phone, settings.email, settings.rc);
        return settings;
    }

    getCompanySettings(userId) {
        return this.db.prepare('SELECT * FROM companies WHERE user_id = ?').get(userId);
    }

    getDashboardStats(userId) {
        const totalDocs = this.db.prepare('SELECT COUNT(*) as count FROM documents WHERE user_id = ?').get(userId).count;
        const totalRevenue = this.db.prepare(`
            SELECT COALESCE(SUM(total_ttc), 0) as total FROM documents WHERE user_id = ? AND type = 'facture'
        `).get(userId).total;
        const totalClients = this.db.prepare('SELECT COUNT(*) as count FROM clients WHERE user_id = ?').get(userId).count;
        const thisMonth = this.db.prepare(`
            SELECT COUNT(*) as count FROM documents 
            WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `).get(userId).count;

        return { totalDocs, totalRevenue, totalClients, thisMonth };
    }
}

module.exports = AppDatabase;