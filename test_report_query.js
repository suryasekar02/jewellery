const mysql = require('mysql2');

const db = mysql.createConnection({
  host: "yamabiko.proxy.rlwy.net",
  user: "root",
  password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
  database: "railway",
  port: 38563
});

const sql = `
    SELECT 
        dse, 
        item, 
        IFNULL(SUM(weight), 0) AS weight, 
        IFNULL(SUM(count), 0) AS count, 
        ROUND(IFNULL(SUM(silver), 0), 3) AS silver
    FROM (
        SELECT s.dse, si.item, IFNULL(si.wt, 0) AS weight, IFNULL(si.count, 0) AS count, IFNULL(si.withcoverwt, 0) AS silver
        FROM stock s 
        JOIN stocksitem si ON s.stockid = si.stockid
        
        UNION ALL
        
        SELECT sa.dse, sai.item, -IFNULL(sai.totalweight, 0) AS weight, -IFNULL(sai.count, 0) AS count, -IFNULL(sai.weight, 0) AS silver
        FROM sales sa 
        JOIN salesitem sai ON sa.invno = sai.invno

        UNION ALL

        SELECT pm.dsename AS dse, pmi.item, -IFNULL(pmi.totalwt, 0) AS weight, -IFNULL(pmi.count, 0) AS count, -IFNULL(pmi.weight, 0) AS silver
        FROM puremc pm
        JOIN puremcitem pmi ON pm.pureid = pmi.pureid
        
        UNION ALL
        
        SELECT i.dse, ii.item, -IFNULL(ii.wt, 0) AS weight, -IFNULL(ii.count, 0) AS count, -IFNULL(ii.withcoverwt, 0) AS silver
        FROM inventory i 
        JOIN inventoryitem ii ON i.inventid = ii.inventid
    ) t
    GROUP BY dse, item
    ORDER BY dse, item
`;

db.query(sql, (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.log("Success:", results.length, "rows found");
        console.log(JSON.stringify(results.slice(0, 5), null, 2));
    }
    db.end();
});
