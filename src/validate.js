const VALID_TVA_RATES = [19, 13, 7, 0];
const VALID_CURRENCIES = ['TND', 'EUR', 'USD'];
const VALID_DOC_TYPES = ['facture', 'devis', 'bon', 'bl', 'ba', 'bs', 'be', 'avoir'];
const VALID_ROUNDING_METHODS = ['half_up', 'ceil', 'floor'];
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

function isString(v, maxLen = 500) {
    return typeof v === 'string' && v.length > 0 && v.length <= maxLen;
}

function isNumber(v, min = -1e12, max = 1e12) {
    return typeof v === 'number' && !isNaN(v) && v >= min && v <= max;
}

function isOptionalString(v, maxLen = 500) {
    return v === null || v === undefined || (typeof v === 'string' && v.length <= maxLen);
}

function isOptionalNumber(v, min = -1e12, max = 1e12) {
    return v === null || v === undefined || (typeof v === 'number' && !isNaN(v) && v >= min && v <= max);
}

function isUUID(v) {
    return typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
}

function isDate(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v).getTime());
}

function isMF(v) {
    if (!v) return true;
    return typeof v === 'string' && v.length <= 20;
}

function validateDocSave(data) {
    const errors = [];
    if (!isUUID(data.userId)) errors.push('userId: invalid UUID');
    if (!VALID_DOC_TYPES.includes(data.type)) errors.push(`type: must be one of ${VALID_DOC_TYPES.join(', ')}`);
    if (!isString(data.number, 50)) errors.push('number: required (max 50 chars)');
    if (!isDate(data.date)) errors.push('date: required (YYYY-MM-DD)');
    if (!isString(data.clientName)) errors.push('clientName: required');
    if (!VALID_CURRENCIES.includes(data.currency || 'TND')) errors.push('currency: must be TND, EUR, or USD');
    if (!isOptionalString(data.paymentMode, 50)) errors.push('paymentMode: max 50 chars');
    if (data.paymentStatus && !['unpaid', 'paid', 'partial'].includes(data.paymentStatus)) errors.push('paymentStatus: must be unpaid/paid/partial');
    if (!isOptionalNumber(data.discountPercent, 0, 100)) errors.push('discountPercent: must be 0-100');
    if (data.items && !Array.isArray(data.items)) errors.push('items: must be an array');
    if (data.items) {
        data.items.forEach((item, i) => {
            if (!isString(item.description)) errors.push(`items[${i}].description: required`);
            if (!isNumber(item.quantity, 0, 1e6)) errors.push(`items[${i}].quantity: must be a positive number`);
            if (!isNumber(item.price, 0, 1e9)) errors.push(`items[${i}].price: must be a positive number`);
            if (!VALID_TVA_RATES.includes(item.tva)) errors.push(`items[${i}].tva: must be 0, 7, 13, or 19`);
        });
    }
    return errors;
}

function validateClientSave(data) {
    const errors = [];
    if (!isUUID(data.userId)) errors.push('userId: invalid UUID');
    if (!isString(data.name)) errors.push('name: required');
    if (!isMF(data.mf)) errors.push('mf: invalid');
    if (!isOptionalString(data.email, 200)) errors.push('email: too long');
    if (!isOptionalString(data.phone, 30)) errors.push('phone: too long');
    return errors;
}

function validateExpenseSave(data) {
    const errors = [];
    if (!isUUID(data.userId)) errors.push('userId: invalid UUID');
    if (!isDate(data.date)) errors.push('date: required (YYYY-MM-DD)');
    if (!isOptionalString(data.vendor)) errors.push('vendor: too long');
    if (!isOptionalNumber(data.amountHT, 0)) errors.push('amountHT: must be >= 0');
    if (!isOptionalNumber(data.amountTTC, 0)) errors.push('amountTTC: must be >= 0');
    if (!VALID_TVA_RATES.includes(data.tvaRate || 0)) errors.push('tvaRate: must be 0, 7, 13, or 19');
    return errors;
}

function validateSettings(data) {
    const errors = [];
    if (data.decimal_places !== undefined && ![0, 1, 2, 3, 4, 5].includes(data.decimal_places)) errors.push('decimal_places: must be 0-5');
    if (data.rounding_method && !VALID_ROUNDING_METHODS.includes(data.rounding_method)) errors.push('rounding_method: must be half_up/ceil/floor');
    return errors;
}

function validateRecurringInvoice(data) {
    const errors = [];
    if (!isUUID(data.userId)) errors.push('userId: invalid UUID');
    if (data.template_id && !isUUID(data.template_id)) errors.push('template_id: invalid UUID');
    if (!VALID_FREQUENCIES.includes(data.frequency)) errors.push('frequency: must be daily/weekly/monthly/yearly');
    if (!isDate(data.next_run)) errors.push('next_run: required (YYYY-MM-DD)');
    return errors;
}

module.exports = {
    validateDocSave,
    validateClientSave,
    validateExpenseSave,
    validateSettings,
    validateRecurringInvoice
};