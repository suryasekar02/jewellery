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
    
    const sql = `
        SELECT
            (IFNULL((SELECT SUM(openbalance) FROM retailer), 0) +
            IFNULL((SELECT SUM(finaltotal) FROM sales), 0) +
            IFNULL((SELECT SUM(i.totalamount) FROM puremcitem i JOIN puremc p ON i.pureid = p.pureid), 0) -
            IFNULL((SELECT SUM(amount) FROM retailerpayment), 0)) AS credit_cash,
            
            (IFNULL((SELECT SUM(openpure) FROM retailer), 0) +
            IFNULL((SELECT SUM(i.pure) FROM puremcitem i JOIN puremc p ON i.pureid = p.pureid), 0) -
            IFNULL((SELECT SUM(pure) FROM retailerpayment), 0)) AS credit_pure
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Verified Credit (Grand Total):");
            console.log(JSON.stringify(results[0], null, 2));
        }
        db.end();
    });
});
