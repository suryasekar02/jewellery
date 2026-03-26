const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "yamabiko.proxy.rlwy.net",
    user: "root",
    password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
    database: "railway",
    port: 38563
});

const from = '2026-03-26';
const to = '2026-03-26';

const sql = `
    SELECT 
        si.item,
        ROUND(IFNULL(SUM(si.totalweight), 0), 3) AS total_weight,
        IFNULL(SUM(si.count), 0) AS total_count,
        ROUND(IFNULL(SUM(si.total), 0), 2) AS total_amount
    FROM salesitem si
    JOIN sales s ON si.invno = s.invno
    WHERE STR_TO_DATE(s.date, '%d/%m/%Y') BETWEEN ? AND ?
    GROUP BY si.item
    ORDER BY si.item
`;

db.query(sql, [from, to], (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("Success:", results.length, "rows found");
        console.log(JSON.stringify(results, null, 2));
    }
    db.end();
});
