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
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL...');

    const sql = `
        SELECT 
            t.item,
            ROUND(
                SUM(IFNULL(t.p_wt, 0)) - 
                SUM(IFNULL(t.s_weight, 0)) - 
                SUM(IFNULL(t.pm_weight, 0)), 
            3) AS weight
        FROM (
            -- Purchase Items (ADD)
            SELECT item, wt AS p_wt, 0 AS s_weight, 0 AS pm_weight FROM purchaseitem
            
            UNION ALL
            
            -- Sales Items (SUBTRACT)
            SELECT item, 0 AS p_wt, weight AS s_weight, 0 AS pm_weight FROM salesitem
            
            UNION ALL
            
            -- Pure MC Items (SUBTRACT)
            SELECT item, 0 AS p_wt, 0 AS s_weight, weight AS pm_weight FROM puremcitem
        ) t
        GROUP BY t.item
        ORDER BY t.item
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error:", err);
        } else {
            console.log("Tally Report Results:");
            console.table(results);
        }
        db.end();
    });
});
