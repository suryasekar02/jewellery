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
    
    const sql = `
        SELECT
            IFNULL((
                SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0))
                FROM retailerpayment
            ), 0) AS total_retailer_payment_cash,
            
            IFNULL((
                SELECT SUM(purecash)
                FROM retailerpayment
            ), 0) AS total_pure_cash,
            
            IFNULL((
                SELECT SUM(amount) FROM expenses 
            ), 0) AS total_expenses,
            
            IFNULL((
                SELECT SUM(mc) FROM partypayout 
            ), 0) AS total_party_payout,
            
            IFNULL((
                SELECT SUM(amount) FROM petrolexpenses 
            ), 0) AS total_petrol_expenses
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Query Error:", err);
            db.end();
            process.exit(1);
        }
        
        const data = results[0];
        const v1 = Number(data.total_retailer_payment_cash);
        const v2 = Number(data.total_pure_cash);
        const v3 = Number(data.total_expenses);
        const v4 = Number(data.total_party_payout);
        const v5 = Number(data.total_petrol_expenses);

        const grandTotalCash = (v1 + v2) - v3 - v4 - v5;
        
        console.log(JSON.stringify({
            total_retailer_payment_cash: v1,
            total_pure_cash: v2,
            total_expenses: v3,
            total_party_payout: v4,
            total_petrol_expenses: v5,
            grand_total_cash: grandTotalCash
        }, null, 2));
        
        db.end();
    });
});
