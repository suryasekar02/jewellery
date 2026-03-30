const mysql = require('mysql2');

const db = mysql.createConnection({
  host: "yamabiko.proxy.rlwy.net",
  user: "root",
  password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
  database: "railway",
  port: 38563
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const yearEnd = `${now.getFullYear()}-12-31`;

    const sql = `
        SELECT
            -- 1. CASH IN HAND (Fixed Year)
            IFNULL((
                SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0))
                FROM retailerpayment
                WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
            ), 0) AS total_retailer_payment_cash,
            
            IFNULL((
                SELECT SUM(purecash)
                FROM retailerpayment
                WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
            ), 0) AS total_pure_cash,
            
            IFNULL((
                SELECT SUM(amount) FROM expenses 
                WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
            ), 0) AS total_expenses,
            
            IFNULL((
                SELECT SUM(mc) FROM partypayout 
                WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
            ), 0) AS total_party_payout,
            
            IFNULL((
                SELECT SUM(amount) FROM petrolexpenses 
                WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
            ), 0) AS total_petrol_expenses
    `;

    const params = [
        yearStart, yearEnd, // total_retailer_payment_cash
        yearStart, yearEnd, // total_pure_cash
        yearStart, yearEnd, // total_expenses
        yearStart, yearEnd, // total_party_payout
        yearStart, yearEnd  // total_petrol_expenses
    ];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Query Error:", err);
            db.end();
            process.exit(1);
        }
        
        const data = results[0];
        const cashInHand = (data.total_retailer_payment_cash + data.total_pure_cash) 
                           - data.total_expenses 
                           - data.total_party_payout 
                           - data.total_petrol_expenses;
        
        console.log(JSON.stringify({
            ...data,
            cash_in_hand: cashInHand
        }, null, 2));
        
        db.end();
    });
});
