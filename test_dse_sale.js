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
        t.dsename,
        ROUND(IFNULL(SUM(t.weight), 0), 3) AS total_weight,
        IFNULL(SUM(t.payin), 0) AS total_payin,
        ROUND(IFNULL(SUM(t.pure), 0), 3) AS total_pure
    FROM (
        -- Sales Weight
        SELECT s.dse AS dsename, SUM(IFNULL(si.weight, 0)) AS weight, 0 AS payin, 0 AS pure
        FROM salesitem si
        JOIN sales s ON si.invno = s.invno
        WHERE STR_TO_DATE(s.date, '%d/%m/%Y') BETWEEN ? AND ?
        GROUP BY s.dse

        UNION ALL

        -- Pure MC Weight
        SELECT pm.dsename, SUM(IFNULL(pmi.weight, 0)) AS weight, 0 AS payin, 0 AS pure
        FROM puremcitem pmi
        JOIN puremc pm ON pmi.pureid = pm.pureid
        WHERE STR_TO_DATE(pm.date, '%d/%m/%Y') BETWEEN ? AND ?
        GROUP BY pm.dsename

        UNION ALL

        -- Payments
        SELECT rp.dsename, 0 AS weight, SUM(IFNULL(rp.amount, 0)) AS payin, SUM(IFNULL(rp.pure, 0)) AS pure
        FROM retailerpayment rp
        WHERE DATE(rp.date) BETWEEN ? AND ?
        GROUP BY rp.dsename
    ) AS t
    GROUP BY t.dsename
    ORDER BY t.dsename
`;

db.query(sql, [from, to, from, to, from, to], (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("Success:", results.length, "rows found");
        console.log(JSON.stringify(results, null, 2));
    }
    db.end();
});
