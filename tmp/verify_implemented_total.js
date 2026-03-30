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
    
    // Mimicking the updated query in BackendAPI.js
    const sql = `
        SELECT
            (IFNULL((
                SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0))
                FROM retailerpayment
            ), 0) + 
            IFNULL((
                SELECT SUM(purecash)
                FROM retailerpayment
            ), 0) - 
            IFNULL((
                SELECT SUM(amount) FROM expenses 
            ), 0) -
            IFNULL((
                SELECT SUM(mc) FROM partypayout 
            ), 0) -
            IFNULL((
                SELECT SUM(amount) FROM petrolexpenses 
            ), 0)) AS cash_in_hand
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Query Error:", err);
            db.end();
            process.exit(1);
        }
        
        console.log("Verified Cash In Hand (Grand Total):", results[0].cash_in_hand);
        db.end();
    });
});
