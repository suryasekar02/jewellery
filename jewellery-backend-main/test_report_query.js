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
        IFNULL(SUM(silver), 0) AS silver
    FROM (
        SELECT s.dse, si.item, si.wt AS weight, si.count AS count, si.withcoverwt AS silver
        FROM stock s 
        JOIN stocksitem si ON s.stockid = si.stockid
        
        UNION ALL
        
        SELECT sa.dse, sai.item, -sai.totalweight AS weight, -sai.count AS count, -sai.weight AS silver
        FROM sales sa 
        JOIN salesitem sai ON sa.invno = sai.invno
        
        UNION ALL
        
        SELECT i.dse, ii.item, ii.wt AS weight, ii.count AS count, ii.withcoverwt AS silver
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
