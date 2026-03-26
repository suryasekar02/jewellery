const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "yamabiko.proxy.rlwy.net",
    user: "root",
    password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
    database: "railway",
    port: 38563
});

db.query("SELECT dsename, amount, pure, date FROM retailerpayment WHERE STR_TO_DATE(date, '%d/%m/%Y') = '2026-03-26'", (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("Payments found for 26/03/2026:", results);
    }
    db.end();
});
