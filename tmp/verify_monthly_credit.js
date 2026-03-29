const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563
});

const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

const sql = `
    SELECT
        (SELECT SUM(openbalance) FROM retailer) as open_cash,
        (SELECT SUM(openpure) FROM retailer) as open_pure,
        
        (SELECT SUM(finaltotal) FROM sales 
         WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?) as sales_cash,
         
        (SELECT SUM(i.totalamount) FROM puremcitem i JOIN puremc p ON i.pureid = p.pureid
         WHERE COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d')) BETWEEN ? AND ?) as mc_cash,
         
        (SELECT SUM(i.pure) FROM puremcitem i JOIN puremc p ON i.pureid = p.pureid
         WHERE COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d')) BETWEEN ? AND ?) as mc_pure,
         
        (SELECT SUM(amount) FROM retailerpayment 
         WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?) as pay_cash,
         
        (SELECT SUM(pure) FROM retailerpayment 
         WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?) as pay_pure
`;

const params = [
    monthStart, monthEnd,
    monthStart, monthEnd,
    monthStart, monthEnd,
    monthStart, monthEnd,
    monthStart, monthEnd
];

db.query(sql, params, (err, rows) => {
    if(err) {
        console.error(err);
    } else {
        const r = rows[0];
        const cashCredit = parseFloat(r.open_cash || 0) + parseFloat(r.sales_cash || 0) + parseFloat(r.mc_cash || 0) - parseFloat(r.pay_cash || 0);
        const pureCredit = parseFloat(r.open_pure || 0) + parseFloat(r.mc_pure || 0) - parseFloat(r.pay_pure || 0);
        
        console.log("Month Range:", monthStart, "to", monthEnd);
        console.log("---------------------------------");
        console.log("Cash Breakdown:");
        console.log("  Retailer Opening:", r.open_cash);
        console.log("  Sales Total:     ", r.sales_cash);
        console.log("  PureMC Amount:   ", r.mc_cash);
        console.log("  Payments Out:    ", r.pay_cash);
        console.log("  TOTAL CASH CREDIT:", cashCredit);
        console.log("---------------------------------");
        console.log("Pure Breakdown:");
        console.log("  Retailer Opening:", r.open_pure);
        console.log("  PureMC Pure:     ", r.mc_pure);
        console.log("  Payments Out:    ", r.pay_pure);
        console.log("  TOTAL PURE CREDIT:", pureCredit.toFixed(3));
    }
    process.exit();
});
