const i18n = {
    locale: 'fr',
    translations: {},
    loaded: false,

    async init() {
        try {
            const response = await fetch('locales/fr.json');
            this.translations = await response.json();
        } catch (e) {
            console.warn('Failed to load locale:', e);
        }
        this.loaded = true;
    },

    t(key, fallback) {
        const parts = key.split('.');
        let val = this.translations;
        for (const p of parts) {
            if (val && typeof val === 'object' && p in val) val = val[p];
            else return fallback || key;
        }
        return typeof val === 'string' ? val : (fallback || key);
    }
};

document.addEventListener('DOMContentLoaded', () => i18n.init());
