
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
    
    // Check all payments in March 2026
    const sql = `
        SELECT date, amount, pure, retailername, dsename
        FROM retailerpayment 
        WHERE (date LIKE '%/03/2026' OR date LIKE '2026-03-%')
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error querying retailerpayment:', err);
        } else {
            console.log('Payments in March 2026:', JSON.stringify(results, null, 2));
            const totalCash = results.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            const totalPure = results.reduce((sum, r) => sum + (parseFloat(r.pure) || 0), 0);
            console.log('Total Cash for March 2026:', totalCash);
            console.log('Total Pure for March 2026:', totalPure);
        }
        db.end();
    });
});
