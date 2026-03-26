const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "yamabiko.proxy.rlwy.net",
    user: "root",
    password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
    database: "railway",
    port: 38563,
    connectTimeout: 20000
});

db.query("SELECT 1", (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("Connection successful:", results);
    }
    db.end();
});
