const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563
});

const now = new Date();
const yearStart = `${now.getFullYear()}-01-01`;
const yearEnd = `${now.getFullYear()}-12-31`;

const sql = `
    SELECT
        IFNULL((
            SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0))
            FROM retailerpayment
            WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
        ), 0) as cash_in,
        
        IFNULL((
            SELECT SUM(purecash)
            FROM retailerpayment
            WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
        ), 0) as purecash,
        
        IFNULL((
            SELECT SUM(amount) FROM expenses 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as expense,
        
        IFNULL((
            SELECT SUM(mc) FROM partypayout 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as payout_mc,
        
        IFNULL((
            SELECT SUM(amount) FROM petrolexpenses 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as petrol
`;

const params = [
    yearStart, yearEnd,
    yearStart, yearEnd,
    yearStart, yearEnd,
    yearStart, yearEnd,
    yearStart, yearEnd
];

db.query(sql, params, (err, rows) => {
    if(err) {
        console.error(err);
    } else {
        const r = rows[0];
        const cashInHand = parseFloat(r.cash_in) + parseFloat(r.purecash) - parseFloat(r.expense) - parseFloat(r.payout_mc) - parseFloat(r.petrol);
        console.log("Year Range:", yearStart, "to", yearEnd);
        console.log("---------------------------------");
        console.log("Retailer Cash In:  ", r.cash_in);
        console.log("Retailer PureCash: ", r.purecash);
        console.log("Expenses:          ", r.expense);
        console.log("Party Payout MC:   ", r.payout_mc);
        console.log("Petrol Expenses:   ", r.petrol);
        console.log("---------------------------------");
        console.log("FINAL CASH IN HAND:", cashInHand);
    }
    process.exit();
});
