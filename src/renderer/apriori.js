// Apriori Association Rule Mining
// Pure JS, zero dependencies, runs in renderer
// Classic Apriori: frequent itemsets → association rules with support/confidence/lift

function apriori(transactions, minSupport, minConfidence) {
    const total = transactions.length;
    if (total === 0) return [];
    const deduped = transactions.map(t => [...new Set(t)].sort());
    const frequent = new Map();

    deduped.forEach(t =>
        t.forEach(item => {
            frequent.set(item, (frequent.get(item) || 0) + 1);
        })
    );

    let level = [];
    frequent.forEach((count, item) => {
        if (count / total >= minSupport) level.push([item]);
    });
    if (level.length === 0) return [];

    const allFrequent = level.map(a => a.slice());
    while (level.length > 0) {
        const next = [];
        for (let i = 0; i < level.length; i++) {
            for (let j = i + 1; j < level.length; j++) {
                const cand = merge(level[i], level[j]);
                if (cand && countSupport(cand, deduped) / total >= minSupport) {
                    next.push(cand);
                    allFrequent.push(cand);
                }
            }
        }
        level = next;
    }

    const rules = [];
    allFrequent.forEach(itemset => {
        if (itemset.length < 2) return;
        const subs = subsets(itemset);
        subs.forEach(ant => {
            const cons = itemset.filter(x => !ant.includes(x));
            if (ant.length === 0 || cons.length === 0) return;
            const sAnt = countSupport(ant, deduped) / total;
            const sItem = countSupport(itemset, deduped) / total;
            const conf = sItem / sAnt;
            if (conf < minConfidence) return;
            rules.push({
                antecedent: ant,
                consequent: cons,
                support: sItem,
                confidence: conf,
                lift: total > 0 ? conf / (countSupport(cons, deduped) / total) : 0
            });
        });
    });

    return rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);
}

function merge(a, b) {
    for (let i = 0; i < a.length - 1; i++) if (a[i] !== b[i]) return null;
    if (a[a.length - 1] >= b[b.length - 1]) return null;
    return [...a, b[b.length - 1]];
}

function countSupport(itemset, transactions) {
    return transactions.filter(t => itemset.every(item => t.includes(item))).length;
}

function subsets(arr) {
    const res = [];
    for (let i = 1; i < (1 << arr.length) - 1; i++) {
        const s = [];
        for (let j = 0; j < arr.length; j++) if (i & (1 << j)) s.push(arr[j]);
        res.push(s);
    }
    return res;
}

// ==================== ITEM PARSER (fixed) ====================
function parseItems(doc) {
    let items = doc.items;
    if (!Array.isArray(items)) {
        try { items = JSON.parse(doc.items_json || '[]'); } catch { items = []; }
    }
    return (items || []).map(i => (i.description || i.name || '').trim()).filter(Boolean);
}

// ==================== PAYMENT BEHAVIOR BY ITEM ====================
// Analyze payment behavior by item
function analyzePaymentByItem(documents) {
    const stats = new Map();
    documents.forEach(doc => {
        const items = parseItems(doc);
        const onTime = doc.payment_status === 'paid' && doc.paid_date && doc.due_date && new Date(doc.paid_date) <= new Date(doc.due_date);
        const late = doc.payment_status === 'paid' && doc.paid_date && doc.due_date && new Date(doc.paid_date) > new Date(doc.due_date);
        const unpaid = doc.payment_status === 'unpaid' || doc.payment_status === 'partial';
        items.forEach(item => {
            if (!stats.has(item)) stats.set(item, { total: 0, onTime: 0, late: 0, unpaid: 0 });
            const s = stats.get(item);
            s.total++;
            if (onTime) s.onTime++;
            else if (late) s.late++;
            else if (unpaid) s.unpaid++;
        });
    });
    return [...stats.entries()]
        .filter(([, s]) => s.total >= 3)
        .map(([item, s]) => ({ item, ...s, onTimeRate: s.onTime / s.total }))
        .sort((a, b) => a.onTimeRate - b.onTimeRate);
}

// ==================== CLIENT REORDER PATTERNS ====================
// Analyze client reorder patterns
function analyzeClientPatterns(documents) {
    const clientMap = new Map();
    documents.forEach(doc => {
        const key = doc.client_name || doc.clientName || '';
        if (!clientMap.has(key)) clientMap.set(key, []);
        clientMap.get(key).push(doc);
    });
    const patterns = [];
    clientMap.forEach((docs, client) => {
        if (docs.length < 2) return;
        const itemDates = new Map();
        docs.forEach(doc => {
            parseItems(doc).forEach(item => {
                if (!itemDates.has(item)) itemDates.set(item, []);
                itemDates.get(item).push(new Date(doc.date));
            });
        });
        itemDates.forEach((dates, item) => {
            if (dates.length < 2) return;
            dates.sort((a, b) => a - b);
            let totalDays = 0;
            for (let i = 1; i < dates.length; i++) totalDays += (dates[i] - dates[i - 1]) / 86400000;
            patterns.push({
                client,
                item,
                orderCount: dates.length,
                avgDays: Math.round(totalDays / (dates.length - 1)),
                lastOrder: dates[dates.length - 1]
            });
        });
    });
    return patterns.sort((a, b) => b.orderCount - a.orderCount);
}

// ==================== CHURN RISK ANALYSIS ====================
/**
 * Classify clients by activity recency:
 *   active   = last doc within 90 days
 *   at_risk  = 91–180 days
 *   churned  = > 180 days
 * Returns array sorted by daysSinceLastOrder DESC (highest churn risk first)
 */
function analyzeChurnRisk(documents) {
    const clientLastDate = new Map();
    documents.forEach(doc => {
        const name = doc.client_name || doc.clientName || '';
        if (!name) return;
        const existing = clientLastDate.get(name);
        const docDate = doc.date ? new Date(doc.date) : null;
        if (docDate && (!existing || docDate > existing)) {
            clientLastDate.set(name, docDate);
        }
    });

    const now = Date.now();
    const result = [];
    clientLastDate.forEach((lastDate, client) => {
        const daysSince = Math.floor((now - lastDate.getTime()) / 86400000);
        let risk;
        if (daysSince <= 90) risk = 'active';
        else if (daysSince <= 180) risk = 'at_risk';
        else risk = 'churned';
        result.push({ client, lastDate, daysSince, risk });
    });

    return result.sort((a, b) => b.daysSince - a.daysSince);
}

// ==================== PAYMENT DURATION RANKING ====================
/**
 * Compute average days-to-pay per client, from invoice date to paid_date.
 * Only uses factures with paymentStatus === 'paid' and a paid_date.
 * Returns array sorted by avgPayDays DESC (slowest payers first).
 */
function analyzePaymentDuration(documents) {
    const clientStats = new Map();
    documents.forEach(doc => {
        const isPaidInvoice =
            (doc.type === 'facture' || doc.payment_status === 'paid') &&
            doc.date &&
            (doc.paid_date || doc.paidDate);
        if (!isPaidInvoice) return;
        const name = doc.client_name || doc.clientName || '';
        if (!name) return;
        const invoiceDate = new Date(doc.date);
        const paidDate = new Date(doc.paid_date || doc.paidDate);
        const days = Math.max(0, Math.floor((paidDate - invoiceDate) / 86400000));
        if (!clientStats.has(name)) clientStats.set(name, { totalDays: 0, count: 0 });
        const s = clientStats.get(name);
        s.totalDays += days;
        s.count++;
    });

    const result = [];
    clientStats.forEach((s, client) => {
        result.push({
            client,
            avgPayDays: Math.round(s.totalDays / s.count),
            invoiceCount: s.count
        });
    });

    return result.sort((a, b) => b.avgPayDays - a.avgPayDays);
}

// ==================== NEXT-ORDER PREDICTION ====================
/**
 * From analyzeClientPatterns results, predict the next expected order date.
 * Flags items where the predicted reorder date has already passed (overdue).
 * Returns array sorted by overdueDays DESC.
 */
function predictNextOrder(patterns) {
    const now = Date.now();
    return patterns
        .filter(p => p.avgDays > 0 && p.lastOrder)
        .map(p => {
            const lastOrder = p.lastOrder instanceof Date ? p.lastOrder : new Date(p.lastOrder);
            const predictedNext = new Date(lastOrder.getTime() + p.avgDays * 86400000);
            const overdueDays = Math.floor((now - predictedNext.getTime()) / 86400000);
            return {
                client: p.client,
                item: p.item,
                lastOrder,
                avgDays: p.avgDays,
                predictedNext,
                overdueDays,   // positive = overdue, negative = upcoming
                isOverdue: overdueDays > 0
            };
        })
        .sort((a, b) => b.overdueDays - a.overdueDays);
}

// ==================== REVENUE SEASONALITY ====================
/**
 * Compute monthly revenue totals for calendar months Jan–Dec (all-time).
 * Returns array of 12 objects { month (1-12), label, total } sorted by month.
 * Use for a full-year seasonal heatmap / bar chart.
 */
function analyzeRevenueSeasonality(documents) {
    const monthTotals = new Array(12).fill(0);
    documents.forEach(doc => {
        if (doc.type !== 'facture') return;
        const d = doc.date ? new Date(doc.date) : null;
        if (!d || isNaN(d.getTime())) return;
        monthTotals[d.getMonth()] += parseFloat(doc.total_ttc || doc.totalTTC || 0);
    });
    const FR_MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jui','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return monthTotals.map((total, i) => ({
        month: i + 1,
        label: FR_MONTHS[i],
        total: Math.round(total * 1000) / 1000
    }));
}
