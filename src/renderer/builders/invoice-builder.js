export function buildInvoiceHTML(data) {
    const itemsRows = data.items.map(item => `
        <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 40px; }

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
    color: #111;
    font-size: 14px;
}

.header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
}

.title {
    font-size: 32px;
    font-weight: 700;
}

.line {
    height: 2px;
    background: #111;
    margin: 30px 0;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th {
    text-align: left;
    font-size: 12px;
    color: #666;
    border-bottom: 1px solid #ddd;
    padding-bottom: 10px;
}

td {
    padding: 12px 0;
}

.total {
    text-align: right;
    margin-top: 30px;
}

.footer {
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
}

.logo img { max-height: 60px; }
.signature img { max-height: 80px; }
.stamp img { max-height: 100px; opacity: 0.8; }
</style>
</head>

<body>

<div class="header">
    <div>
        <div class="title">INVOICE</div>
        <div>#${data.number}</div>
    </div>

    <div style="text-align:right;">
        ${data.logoImage ? `<div class="logo"><img src="${data.logoImage}" /></div>` : ''}
        <div><strong>${data.companyName || ''}</strong></div>
        <div>${data.companyAddress || ''}</div>
    </div>
</div>

<div>
    <strong>Bill To:</strong><br/>
    ${data.clientName || ''}<br/>
    ${data.clientAddress || ''}
</div>

<div class="line"></div>

<table>
<thead>
<tr>
    <th>Description</th>
    <th>Qty</th>
    <th>Price</th>
    <th>Total</th>
</tr>
</thead>
<tbody>
${itemsRows}
</tbody>
</table>

<div class="total">
    <div>Total HT: ${data.totalHT.toFixed(2)}</div>
    <h2>Total TTC: ${data.totalTTC.toFixed(2)}</h2>
</div>

<div class="footer">
    <div class="signature">
        ${data.signatureImage ? `<img src="${data.signatureImage}" />` : ''}
    </div>

    <div class="stamp">
        ${data.stampImage ? `<img src="${data.stampImage}" />` : ''}
    </div>
</div>

</body>
</html>
`;
}