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
        weight, 
        count, 
        silver,
        source
    FROM (
        SELECT s.dse, si.item, IFNULL(si.wt, 0) AS weight, IFNULL(si.count, 0) AS count, IFNULL(si.withcoverwt, 0) AS silver, 'STOCK' as source
        FROM stock s 
        JOIN stocksitem si ON s.stockid = si.stockid
        
        UNION ALL
        
        SELECT sa.dse, sai.item, -IFNULL(sai.totalweight, 0) AS weight, -IFNULL(sai.count, 0) AS count, -IFNULL(sai.weight, 0) AS silver, 'SALES' as source
        FROM sales sa 
        JOIN salesitem sai ON sa.invno = sai.invno
        
        UNION ALL
        
        SELECT i.dse, ii.item, -IFNULL(ii.wt, 0) AS weight, -IFNULL(ii.count, 0) AS count, -IFNULL(ii.withcoverwt, 0) AS silver, 'INVENTORY' as source
        FROM inventory i 
        JOIN inventoryitem ii ON i.inventid = ii.inventid
        
        UNION ALL

        SELECT pm.dsename AS dse, pmi.item, -IFNULL(pmi.totalwt, 0) AS weight, -IFNULL(pmi.count, 0) AS count, -IFNULL(pmi.weight, 0) AS silver, 'PUREMC' as source
        FROM puremc pm
        JOIN puremcitem pmi ON pm.pureid = pmi.pureid
    ) t
    WHERE t.dse = 'admin' AND t.item = 'Dollar'
`;

db.query(sql, (err, results) => {
    if (err) {
        console.error(err);
    } else {
        console.table(results);
        const totals = results.reduce((acc, row) => {
            acc.weight += parseFloat(row.weight);
            acc.count += parseInt(row.count);
            acc.silver += parseFloat(row.silver);
            return acc;
        }, { weight: 0, count: 0, silver: 0 });
        console.log("Calculated Totals:", totals);
    }
    db.end();
});
