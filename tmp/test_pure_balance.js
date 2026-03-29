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
            SELECT SUM(pure) FROM expenses 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as exp_pure,
        
        IFNULL((
            SELECT SUM(silverweight) FROM retailerpayment 
            WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
        ), 0) as ret_silver,
        
        IFNULL((
            SELECT SUM(pure) FROM retailerpayment 
            WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
        ), 0) as ret_pure,
        
        IFNULL((
            SELECT SUM(pure) FROM partypayout 
            WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as payout_pure
`;

const params = [
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
        const pureBalance = parseFloat(r.exp_pure) + parseFloat(r.ret_silver) - parseFloat(r.ret_pure) - parseFloat(r.payout_pure);
        console.log("Month Range:", monthStart, "to", monthEnd);
        console.log("---------------------------------");
        console.log("Expense Pure:      ", r.exp_pure);
        console.log("Retailer Silver:   ", r.ret_silver);
        console.log("Retailer Pure:     ", r.ret_pure);
        console.log("Party Payout Pure: ", r.payout_pure);
        console.log("---------------------------------");
        console.log("FINAL PURE BALANCE:", pureBalance.toFixed(3));
    }
    process.exit();
});
