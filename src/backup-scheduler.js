const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const archiver = require('archiver');

class BackupScheduler {
    constructor(database) {
        this.db = database;
        this.settings = this.loadSettings();
    }

    loadSettings() {
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'backup-settings.json');
        
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        return {
            enabled: true,
            frequency: 'daily',
            time: '02:00',
            keepCount: 10,
            backupPath: path.join(app.getPath('documents'), 'Factarlou Backups')
        };
    }

    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'backup-settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
    }

    start() {
        if (!this.settings.enabled) return;
        if (this.scheduledJob) this.scheduledJob.stop();

        const [hours, minutes] = this.settings.time.split(':');
        let cronPattern;
        
        switch (this.settings.frequency) {
            case 'daily': cronPattern = `${minutes} ${hours} * * *`; break;
            case 'weekly': cronPattern = `${minutes} ${hours} * * 0`; break;
            case 'monthly': cronPattern = `${minutes} ${hours} 1 * *`; break;
            default: cronPattern = `${minutes} ${hours} * * *`;
        }

        this.scheduledJob = cron.schedule(cronPattern, () => {
            this.createBackup();
        });
    }

    stop() {
        if (this.scheduledJob) {
            this.scheduledJob.stop();
            this.scheduledJob = null;
        }
    }

    async createBackup(manual = false) {
        if (!fs.existsSync(this.settings.backupPath)) {
            fs.mkdirSync(this.settings.backupPath, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFileName = `tuniinvoice-backup-${timestamp}.zip`;
        const backupFilePath = path.join(this.settings.backupPath, backupFileName);

        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(backupFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                this.cleanOldBackups();
                resolve({
                    success: true,
                    path: backupFilePath,
                    size: archive.pointer(),
                    timestamp: new Date()
                });
            });

            archive.on('error', reject);
            archive.pipe(output);
            archive.file(this.db.getDatabasePath(), { name: 'tuniinvoice.db' });
            archive.finalize();
        });
    }

    cleanOldBackups() {
        try {
            const files = fs.readdirSync(this.settings.backupPath)
                .filter(f => f.startsWith('tuniinvoice-backup-') && f.endsWith('.zip'))
                .map(f => ({
                    path: path.join(this.settings.backupPath, f),
                    time: fs.statSync(path.join(this.settings.backupPath, f)).mtime
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length > this.settings.keepCount) {
                files.slice(this.settings.keepCount).forEach(f => fs.unlinkSync(f.path));
            }
        } catch (error) {
            console.error('Error cleaning backups:', error);
        }
    }

    getBackupList() {
        try {
            if (!fs.existsSync(this.settings.backupPath)) return [];
            
            return fs.readdirSync(this.settings.backupPath)
                .filter(f => f.startsWith('tuniinvoice-backup-') && f.endsWith('.zip'))
                .map(f => {
                    const stat = fs.statSync(path.join(this.settings.backupPath, f));
                    return {
                        name: f,
                        path: path.join(this.settings.backupPath, f),
                        size: stat.size,
                        created: stat.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);
        } catch (error) {
            return [];
        }
    }

    async restoreBackup(backupPath) {
        const extract = require('extract-zip');
        const tempPath = path.join(app.getPath('temp'), 'tuniinvoice-restore');
        
        await extract(backupPath, { dir: tempPath });
        
        const dbFile = path.join(tempPath, 'tuniinvoice.db');
        if (!fs.existsSync(dbFile)) {
            throw new Error('Invalid backup file');
        }
        
        this.db.restore(dbFile);
        fs.rmSync(tempPath, { recursive: true, force: true });
        return true;
    }

    getSettings() {
        return this.settings;
    }
}

module.exports = BackupScheduler;