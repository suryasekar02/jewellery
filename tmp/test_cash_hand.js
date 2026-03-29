const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563
});

let testQuery = `
SELECT 
  (SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0)) - SUM(IFNULL(purecash, 0)) FROM retailerpayment) AS retail_pay,
  (SELECT SUM(amount) FROM expenses) AS exp_amt,
  (SELECT SUM(mc) FROM partypayout) AS p_mc,
  (SELECT SUM(amount) FROM petrolexpenses) as petrol_amt
`;

db.query(testQuery, (err, rows) => {
    if(err) console.error(err);
    else console.log("ALL TIME:", rows[0]);
    
    // Test the specific month logic to see why it evaluates to what it evaluates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const sql = `
        SELECT
            -- 1. CASH IN HAND (Fixed Month)
            (IFNULL((
                SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0)) - SUM(IFNULL(purecash, 0))
                FROM retailerpayment
                WHERE DATE(date) BETWEEN ? AND ?
            ), 0) - 
            IFNULL((
                SELECT SUM(amount) FROM expenses 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) -
            IFNULL((
                SELECT SUM(mc) FROM partypayout 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) -
            IFNULL((
                SELECT SUM(amount) FROM petrolexpenses 
                WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
            ), 0)) AS cash_in_hand_new,
            
            (IFNULL((
                SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0)) - SUM(IFNULL(purecash, 0))
                FROM retailerpayment
                WHERE DATE(date) BETWEEN ? AND ?
            ), 0) - 
            IFNULL((
                SELECT SUM(amount) FROM expenses 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) -
            IFNULL((
                SELECT SUM(mc) FROM partypayout 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0)) AS cash_in_hand_old,
            
            IFNULL((
                SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0)) - SUM(IFNULL(purecash, 0))
                FROM retailerpayment
                WHERE DATE(date) BETWEEN ? AND ?
            ), 0) as retail_monthly,
            
            IFNULL((
                SELECT SUM(amount) FROM expenses 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) as expense_monthly,
            
            IFNULL((
                SELECT SUM(amount) FROM petrolexpenses 
                WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
            ), 0) as petrol_monthly
    `;
    const params = [
        monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd,
        monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd,
        monthStart, monthEnd,
        monthStart, monthEnd,
        monthStart, monthEnd
    ];
    db.query(sql, params, (e2, r2) => {
        if(e2) console.error(e2);
        else console.log("MONTHLY:", r2[0]);
        process.exit();
    });
});
