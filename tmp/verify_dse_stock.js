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
        IFNULL(SUM(weight), 0) AS weight 
    FROM (
        SELECT s.dse, si.item, IFNULL(si.wt, 0) AS weight 
        FROM stock s 
        JOIN stocksitem si ON s.stockid = si.stockid 
        
        UNION ALL 
        
        SELECT sa.dse, sai.item, -IFNULL(sai.totalweight, 0) AS weight 
        FROM sales sa 
        JOIN salesitem sai ON sa.invno = sai.invno 
        
        UNION ALL 
        
        SELECT pm.dsename AS dse, pmi.item, -IFNULL(pmi.totalwt, 0) AS weight 
        FROM puremc pm 
        JOIN puremcitem pmi ON pm.pureid = pmi.pureid
    ) t 
    WHERE dse = 'tester' 
    GROUP BY dse, item
`;

db.query(sql, (err, results) => {
    if (err) {
        console.error("SQL Error:", err);
    } else {
        console.table(results);
    }
    db.end();
});
