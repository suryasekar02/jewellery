const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "yamabiko.proxy.rlwy.net",
    user: "root",
    password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
    database: "railway",
    port: 38563
});

db.query("SELECT date FROM puremc LIMIT 5", (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("PureMC dates:", results);
    }
    db.end();
});
