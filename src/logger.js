/**
 * M-12: Structured application logger.
 * Provides consistent, structured logging throughout the application.
 * Logs to console in dev and appends to a rotating log file in production.
 */
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB max log file size

class AppLogger {
    constructor() {
        this.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
        this.logPath = null;
        try {
            const logDir = path.join(app.getPath('userData'), 'logs');
            if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
            this.logPath = path.join(logDir, 'app.log');
            this._rotateIfNeeded();
        } catch {}
    }

    _rotateIfNeeded() {
        try {
            if (this.logPath && fs.existsSync(this.logPath)) {
                const stats = fs.statSync(this.logPath);
                if (stats.size > MAX_LOG_SIZE) {
                    const archivePath = this.logPath + '.old';
                    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
                    fs.renameSync(this.logPath, archivePath);
                }
            }
        } catch {}
    }

    _format(level, module, message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            ...(data ? { data } : {})
        };
        return JSON.stringify(entry);
    }

    _write(level, module, message, data) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) return;

        const formatted = this._format(level, module, message, data);
        const readable = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${module}] ${message}`;

        // Console output
        if (level === 'error') console.error(readable, data || '');
        else if (level === 'warn') console.warn(readable, data || '');
        else console.log(readable, data || '');

        // File output
        if (this.logPath) {
            try {
                fs.appendFileSync(this.logPath, formatted + '\n');
            } catch {}
        }
    }

    debug(module, message, data) { this._write('debug', module, message, data); }
    info(module, message, data) { this._write('info', module, message, data); }
    warn(module, message, data) { this._write('warn', module, message, data); }
    error(module, message, data) { this._write('error', module, message, data); }
}

const logger = new AppLogger();
module.exports = logger;
