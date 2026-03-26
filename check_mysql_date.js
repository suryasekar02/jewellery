const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "yamabiko.proxy.rlwy.net",
    user: "root",
    password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
    database: "railway",
    port: 38563
});

db.query("SELECT date, STR_TO_DATE(date, '%d/%m/%Y') AS parsed, DATE(date) AS mysql_date FROM sales LIMIT 5", (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("Date parsing test:", results);
    }
    db.end();
});
