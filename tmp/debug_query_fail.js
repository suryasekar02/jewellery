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
    
    // Testing the exact query that might be failing
    const sql = `SELECT pp.* FROM partypayout pp 
                 WHERE DATE(COALESCE(
                    STR_TO_DATE(pp.date, '%d/%m/%Y'),
                    STR_TO_DATE(pp.date, '%Y-%m-%d'),
                    STR_TO_DATE(pp.date, '%d-%m-%Y')
                 )) >= CAST('2026-03-28' AS DATE)
                 ORDER BY pp.date DESC`;
    
    console.log("Executing SQL:", sql);
    
    db.query(sql, (err, res) => {
        if (err) {
            console.error('Query failed!', err);
        } else {
            console.log('Query successful! Results count:', res.length);
            if (res.length > 0) console.log('First result:', res[0]);
        }
        db.end();
    });
});
