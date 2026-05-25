/**
 * Shared TVA/Tax calculation utilities.
 * Centralizes the tax calculation logic used across app.js, invoice-builder.js, and main.js.
 */
const VALID_TVA_RATES = [19, 13, 7, 0];

/**
 * Parse TVA rate from an item. Handles string/number.
 */
function parseTVARate(tva) {
    const rate = Number(tva) || 0;
    return VALID_TVA_RATES.includes(rate) ? rate : 0;
}

/**
 * Calculate totals for a list of invoice items.
 * Returns { totalHT, tvaByRate, totalTVA, timbreAmount, roundingAdjustment, totalTTC }
 *
 * @param {Array} items - Array of { quantity, price, tva }
 * @param {Object} options
 * @param {boolean} options.applyTimbre - Whether to add timbre fiscal (1 TND if totalHT > 1000)
 * @param {number} options.discountPercent - Discount percentage
 * @param {number} options.discountAmount - Fixed discount amount
 * @param {number} options.decimalPlaces - Rounding precision (default 3)
 * @param {string} options.roundingMethod - 'half_up' | 'ceil' | 'floor'
 * @returns {Object}
 */
function calculateTotals(items, options = {}) {
    const { applyTimbre = false, discountPercent = 0, discountAmount = 0, decimalPlaces = 3, roundingMethod = 'half_up' } = options;

    const round = value => {
        const factor = Math.pow(10, decimalPlaces);
        if (roundingMethod === 'ceil') return Math.ceil(value * factor) / factor;
        if (roundingMethod === 'floor') return Math.floor(value * factor) / factor;
        return Math.round(value * factor) / factor;
    };

    let totalHTRaw = 0;
    const tvaByRate = {};

    (items || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const tva = parseTVARate(item.tva);
        const lineHT = qty * price;
        totalHTRaw += lineHT;

        if (!tvaByRate[tva]) tvaByRate[tva] = { baseHT: 0, tvaAmount: 0 };
        tvaByRate[tva].baseHT += lineHT;
        tvaByRate[tva].tvaAmount += (lineHT * tva) / 100;
    });

    // Apply discount
    const discountDeduction = discountAmount || (totalHTRaw * discountPercent) / 100;
    const totalHTAfterDiscount = totalHTRaw - discountDeduction;

    // Recalculate TVA on discounted amount
    // (Proportional reduction across TVA rates)
    let totalTVA = 0;
    if (totalHTRaw > 0) {
        const ratio = totalHTAfterDiscount / totalHTRaw;
        Object.keys(tvaByRate).forEach(rate => {
            tvaByRate[rate].baseHT = round(tvaByRate[rate].baseHT * ratio);
            tvaByRate[rate].tvaAmount = round(tvaByRate[rate].tvaAmount * ratio);
            totalTVA += tvaByRate[rate].tvaAmount;
        });
    }

    const totalHT = round(totalHTAfterDiscount);
    totalTVA = round(totalTVA);

    const timbreAmount = applyTimbre && totalHT > 1000 ? 1.0 : 0;

    const totalTTCRaw = totalHT + totalTVA + timbreAmount;
    const totalTTC = round(totalTTCRaw);
    const roundingAdjustment = round(totalTTC - totalTTCRaw);

    // Build TVA breakdown lines for PDF display
    const tvaLines = Object.entries(tvaByRate)
        .filter(([_, v]) => Math.abs(v.baseHT) > 0.0001)
        .map(([rate, v]) => ({ rate: Number(rate), ...v }))
        .sort((a, b) => b.rate - a.rate);

    return {
        totalHT,
        totalTTC,
        totalTVA,
        tvaByRate,
        tvaLines,
        timbreAmount,
        roundingAdjustment
    };
}

/**
 * Format a number with the configured decimal places.
 */
function formatAmount(value, decimalPlaces = 3) {
    const factor = Math.pow(10, decimalPlaces);
    return (Math.round(parseFloat(value || 0) * factor) / factor).toFixed(decimalPlaces);
}

module.exports = {
    calculateTotals,
    formatAmount,
    VALID_TVA_RATES,
    parseTVARate
};
