/**
 * Shared TVA/Tax calculation utilities.
 * Centralizes the tax calculation logic used across app.js, invoice-builder.js, and main.js.
 *
 * CRIT-01: Timbre fiscal = 0.600 TND (Loi 2017-66, Art. 44)
 * CRIT-09: Discount applied per-line BEFORE TVA (Tunisian fiscal law)
 * CRIT-18: CNSS/IRPP auto-calculation per Tunisian law
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
 * Returns { totalHT, tvaByRate, totalTVA, timbreAmount, roundingAdjustment, totalTTC, tvaLines }
 *
 * @param {Array} items - Array of { quantity, price, tva }
 * @param {Object} options
 * @param {boolean} options.applyTimbre - Whether to add timbre fiscal (0.600 TND per Tunisian law)
 * @param {number} options.discountPercent - Discount percentage (applied per-line BEFORE TVA)
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

    // CRIT-09: First pass — compute raw totalHT for proportional discount allocation
    let totalHTRawPreDiscount = 0;
    (items || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        totalHTRawPreDiscount += qty * price;
    });

    // Determine effective discount ratio
    // M-05: If both discountPercent and discountAmount are provided, percent takes priority
    let discountRatio = 0;
    if (discountPercent > 0) {
        discountRatio = discountPercent / 100;
    } else if (discountAmount > 0 && totalHTRawPreDiscount > 0) {
        discountRatio = discountAmount / totalHTRawPreDiscount;
    }

    // CRIT-09: Second pass — apply discount per-line BEFORE TVA calculation
    let totalHTAfterDiscount = 0;
    let totalTVA = 0;
    const tvaByRate = {};

    (items || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const tva = parseTVARate(item.tva);
        let lineHT = qty * price;

        // Apply discount per-line (before TVA)
        if (discountRatio > 0) {
            lineHT *= (1 - discountRatio);
        }

        totalHTAfterDiscount += lineHT;

        if (!tvaByRate[tva]) tvaByRate[tva] = { baseHT: 0, tvaAmount: 0 };
        tvaByRate[tva].baseHT += lineHT;
        tvaByRate[tva].tvaAmount += (lineHT * tva) / 100;
    });

    // Round TVA amounts
    Object.keys(tvaByRate).forEach(rate => {
        tvaByRate[rate].baseHT = round(tvaByRate[rate].baseHT);
        tvaByRate[rate].tvaAmount = round(tvaByRate[rate].tvaAmount);
        totalTVA += tvaByRate[rate].tvaAmount;
    });

    const totalHT = round(totalHTAfterDiscount);
    totalTVA = round(totalTVA);

    // CRIT-01: Timbre fiscal = 0.600 TND per Tunisian law (Loi 2017-66, Art. 44)
    // Applies to ALL commercial invoices regardless of amount
    const timbreAmount = applyTimbre ? 0.600 : 0;

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
        roundingAdjustment,
        discountAmount: round(totalHTRawPreDiscount - totalHTAfterDiscount)
    };
}

/**
 * Format a number with the configured decimal places.
 */
function formatAmount(value, decimalPlaces = 3) {
    const factor = Math.pow(10, decimalPlaces);
    return (Math.round(parseFloat(value || 0) * factor) / factor).toFixed(decimalPlaces);
}

/**
 * CRIT-18: Calculate payroll deductions per Tunisian law.
 * CNSS employee = 9.18% of gross (régime général)
 * IRPP = progressive brackets on annual basis
 *
 * @param {number} grossSalary - Base salary
 * @param {Object} options
 * @param {number} options.transportAllowance - Transport allowance
 * @param {number} options.otherAllowances - Other allowances
 * @returns {Object} { grossSalary, cnssDeduction, irppDeduction, netSalary, employerCNSS }
 */
function calculatePayroll(grossSalary, options = {}) {
    const { transportAllowance = 0, otherAllowances = 0 } = options;

    const totalGross = (Number(grossSalary) || 0) + (Number(transportAllowance) || 0) + (Number(otherAllowances) || 0);

    // CNSS employee contribution: 9.18% of gross salary (régime général)
    const cnssDeduction = Math.round(totalGross * 0.0918 * 1000) / 1000;

    // Taxable income = gross - CNSS
    const taxableMonthly = totalGross - cnssDeduction;
    const taxableAnnual = taxableMonthly * 12;

    // IRPP progressive brackets (annual, per Tunisian tax code)
    // 0 — 5,000 TND:     0%
    // 5,001 — 20,000:    26%
    // 20,001 — 30,000:   28%
    // 30,001 — 50,000:   32%
    // > 50,000:          35%
    let irppAnnual = 0;
    if (taxableAnnual > 50000) irppAnnual += (taxableAnnual - 50000) * 0.35;
    if (taxableAnnual > 30000) irppAnnual += (Math.min(taxableAnnual, 50000) - 30000) * 0.32;
    if (taxableAnnual > 20000) irppAnnual += (Math.min(taxableAnnual, 30000) - 20000) * 0.28;
    if (taxableAnnual > 5000) irppAnnual += (Math.min(taxableAnnual, 20000) - 5000) * 0.26;
    // 0 — 5,000 = 0% (no addition needed)

    const irppMonthly = Math.round((irppAnnual / 12) * 1000) / 1000;
    const netSalary = Math.round((totalGross - cnssDeduction - irppMonthly) * 1000) / 1000;

    // Employer CNSS: 16.57% (régime général)
    const employerCNSS = Math.round(totalGross * 0.1657 * 1000) / 1000;

    return {
        grossSalary: totalGross,
        cnssDeduction,
        irppDeduction: irppMonthly,
        netSalary,
        employerCNSS
    };
}

/**
 * H-19: Convert an amount between currencies using stored exchange rates.
 * @param {number} amount
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {Array} rates - Array of { currency, rate } (rate is TND per 1 unit of currency)
 * @returns {number}
 */
function convertCurrency(amount, fromCurrency, toCurrency, rates = []) {
    const val = Number(amount) || 0;
    if (!val || fromCurrency === toCurrency) return val;

    const getRateToTND = curr => {
        if (curr === 'TND') return 1.0;
        const found = (rates || []).find(r => r.currency === curr);
        return found ? Number(found.rate) || 1.0 : 1.0;
    };

    const fromRate = getRateToTND(fromCurrency);
    const toRate = getRateToTND(toCurrency);

    const amountInTND = val * fromRate;
    const converted = amountInTND / toRate;

    return Math.round(converted * 1000) / 1000;
}

module.exports = {
    calculateTotals,
    formatAmount,
    calculatePayroll,
    convertCurrency,
    VALID_TVA_RATES,
    parseTVARate
};
