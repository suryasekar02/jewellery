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

db.query("DESCRIBE retailerpayment", (err, res) => {
    if (err) console.error(err);
    console.log("Columns in retailerpayment table:", res.map(c => c.Field));
    process.exit();
});
