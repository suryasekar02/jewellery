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
        IFNULL((
            SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0))
            FROM retailerpayment
            WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
        ), 0) as cash_in_monthly,
        
        IFNULL((
            SELECT SUM(purecash)
            FROM retailerpayment
            WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
        ), 0) as purecash_monthly,
        
        IFNULL((
            SELECT SUM(amount) FROM expenses 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as expense_monthly,
        
        IFNULL((
            SELECT SUM(mc) FROM partypayout 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as payout_mc_monthly,
        
        IFNULL((
            SELECT SUM(amount) FROM petrolexpenses 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as petrol_monthly
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
        const cashInHand = parseFloat(r.cash_in_monthly) - parseFloat(r.purecash_monthly) - parseFloat(r.expense_monthly) - parseFloat(r.payout_mc_monthly) - parseFloat(r.petrol_monthly);
        console.log("Month Start:", monthStart);
        console.log("Month End:", monthEnd);
        console.log("---------------------------------");
        console.log("Retailer Cash In:  ", r.cash_in_monthly);
        console.log("Retailer PureCash: ", r.purecash_monthly);
        console.log("Expenses:          ", r.expense_monthly);
        console.log("Party Payout MC:   ", r.payout_mc_monthly);
        console.log("Petrol Expenses:   ", r.petrol_monthly);
        console.log("---------------------------------");
        console.log("FINAL CASH IN HAND:", cashInHand);
    }
    process.exit();
});
