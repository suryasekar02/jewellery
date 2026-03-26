const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "yamabiko.proxy.rlwy.net",
    user: "root",
    password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
    database: "railway",
    port: 38563
});

db.query("SELECT DISTINCT date FROM sales ORDER BY date DESC LIMIT 10", (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("Existing dates in sales table:", results);
    }
    db.end();
});
