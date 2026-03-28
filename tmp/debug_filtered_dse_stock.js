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
        SUM(weight) AS weight, 
        SUM(count) AS count, 
        SUM(silver) AS silver
    FROM (
        SELECT s.dse, si.item, IFNULL(si.wt, 0) AS weight, IFNULL(si.count, 0) AS count, IFNULL(si.withcoverwt, 0) AS silver, 1 AS is_stock
        FROM stock s 
        JOIN stocksitem si ON s.stockid = si.stockid
        
        UNION ALL
        
        SELECT i.dse, ii.item, -IFNULL(ii.wt, 0) AS weight, -IFNULL(ii.count, 0) AS count, -IFNULL(ii.withcoverwt, 0) AS silver, 0 AS is_stock
        FROM inventory i 
        JOIN inventoryitem ii ON i.inventid = ii.inventid
    ) t
    GROUP BY dse, item
    HAVING SUM(is_stock) > 0
`;

db.query(sql, (err, results) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Results with Stock Filter:");
        console.table(results);
    }
    db.end();
});
