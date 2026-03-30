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
        process.exit(1);
    }
    
    // Testing the updated Payin query in BackendAPI.js
    const sql = `
        SELECT
            IFNULL((
                SELECT SUM(amount) FROM retailerpayment 
            ), 0) AS payin_cash,
            IFNULL((
                SELECT SUM(silverweight + pure) FROM retailerpayment 
            ), 0) AS payin_pure
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Verification Error:", err.message);
        } else {
            console.log("Verified Payin (Grand Total):");
            console.log(JSON.stringify(results[0], null, 2));
        }
        db.end();
    });
});
