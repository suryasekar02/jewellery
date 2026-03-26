const mysql = require('mysql2');

const db = mysql.createPool({
  host: "yamabiko.proxy.rlwy.net",
  user: "root",
  password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
  database: "railway",
  port: 38563,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

db.query("DESCRIBE sales", (err, res1) => {
    if (err) console.error(err);
    console.log("Columns in sales table:", res1.map(c => c.Field));

    db.query("DESCRIBE salesitem", (err, res2) => {
        if (err) console.error(err);
        console.log("Columns in salesitem table:", res2.map(c => c.Field));
        process.exit();
    });
});
