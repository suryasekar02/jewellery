
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
    
    // Check both date formats usually used in this app: DD/MM/YYYY and YYYY-MM-DD
    const date1 = '30/03/2026';
    const date2 = '2026-03-30';
    
    const sql = `
        SELECT SUM(amount) as total_cash, SUM(pure) as total_pure 
        FROM retailerpayment 
        WHERE date = ? OR date = ?
    `;

    db.query(sql, [date1, date2], (err, results) => {
        if (err) {
            console.error('Error querying retailerpayment:', err);
        } else {
            console.log('Result for 30/03/2026:', JSON.stringify(results[0]));
        }
        
        // Also get individual entries to be sure
        const sqlIndividual = `
            SELECT * FROM retailerpayment 
            WHERE date = ? OR date = ?
        `;
        db.query(sqlIndividual, [date1, date2], (err, results) => {
            if (err) {
                console.error('Error fetching individual records:', err);
            } else {
                console.log('Individual payments for 30/03/2026:', JSON.stringify(results, null, 2));
            }
            db.end();
        });
    });
});
