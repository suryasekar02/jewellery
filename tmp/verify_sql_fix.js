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
        process.exit(1);
    }
    
    // Updated SQL for report_dse_stock with correct GROUP BY
    const sql = `
        SELECT 
            dse, 
            item, 
            IFNULL(SUM(weight), 0) AS weight, 
            IFNULL(SUM(count), 0) AS count, 
            ROUND(IFNULL(SUM(silver), 0), 3) AS silver
        FROM (
            SELECT s.dse, si.item, IFNULL(si.wt, 0) AS weight, IFNULL(si.count, 0) AS count, IFNULL(si.withcoverwt, 0) AS silver, 1 AS is_stock
            FROM stock s 
            JOIN stocksitem si ON s.stockid = si.stockid
            
            UNION ALL
            
            SELECT sa.dse, sai.item, -IFNULL(sai.totalweight, 0) AS weight, -IFNULL(sai.count, 0) AS count, -IFNULL(sai.weight, 0) AS silver, 0 AS is_stock
            FROM sales sa 
            JOIN salesitem sai ON sa.invno = sai.invno
            
            UNION ALL
            
            SELECT i.dse, ii.item, -IFNULL(ii.wt, 0) AS weight, -IFNULL(ii.count, 0) AS count, -IFNULL(ii.withcoverwt, 0) AS silver, 0 AS is_stock
            FROM inventory i 
            JOIN inventoryitem ii ON i.inventid = ii.inventid
            
            UNION ALL

            SELECT pm.dsename AS dse, pmi.item, -IFNULL(pmi.totalwt, 0) AS weight, -IFNULL(pmi.count, 0) AS count, -IFNULL(pmi.weight, 0) AS silver, 0 AS is_stock
            FROM puremc pm
            JOIN puremcitem pmi ON pm.pureid = pmi.pureid
        ) t
        LEFT JOIN item itm ON TRIM(t.item) = itm.itemname
        GROUP BY dse, item, itm.iid
        HAVING SUM(is_stock) > 0
        ORDER BY dse, CAST(SUBSTRING(IFNULL(itm.iid, 'I999999'), 2) AS UNSIGNED), item
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Verification Error:", err.message);
        } else {
            console.log("Verification Success! First 5 rows:");
            console.log(JSON.stringify(results.slice(0, 5).map(r => ({ dse: r.dse, item: r.item })), null, 2));
        }
        db.end();
    });
});
