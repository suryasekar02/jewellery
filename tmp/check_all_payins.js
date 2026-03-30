
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
        return;
    }
    
    // Check ALL records in retailerpayment
    const sql = `SELECT payid, date, amount, pure FROM retailerpayment`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error querying retailerpayment:', err);
        } else {
            console.log('All payments in retailerpayment:', JSON.stringify(results, null, 2));
        }
        db.end();
    });
});
