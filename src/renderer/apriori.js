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

// Analyze client reorder patterns
function analyzeClientPatterns(documents) {
    const clientMap = new Map();
    documents.forEach(doc => {
        const key = doc.client_name || '';
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

function parseItems(doc) {
    const raw =
        doc.items ||
        (() => {
            try {
                return JSON.parse(doc.items_json || '[]');
            } catch {
                return [];
            }
        })();
    return (raw || []).map(i => (i.description || '').trim()).filter(Boolean);
}
