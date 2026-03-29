const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563
});

const sql = `
    SELECT 
        s.date, si.weight, si.item, 'SALE' as type
    FROM salesitem si 
    JOIN sales s ON si.invno = s.invno 
    WHERE MONTH(COALESCE(STR_TO_DATE(s.date, '%d/%m/%Y'), STR_TO_DATE(s.date, '%d-%m-%Y'), STR_TO_DATE(s.date, '%Y-%m-%d'))) = 3 
      AND YEAR(COALESCE(STR_TO_DATE(s.date, '%d/%m/%Y'), STR_TO_DATE(s.date, '%d-%m-%Y'), STR_TO_DATE(s.date, '%Y-%m-%d'))) = 2026
    
    UNION ALL
    
    SELECT 
        p.date, pmi.weight, pmi.item, 'PUREMC' as type
    FROM puremcitem pmi 
    JOIN puremc p ON pmi.pureid = p.pureid 
    WHERE MONTH(COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d'))) = 3 
      AND YEAR(COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d'))) = 2026
`;

db.query(sql, (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    
    let saleWt = 0;
    let mcWt = 0;
    
    rows.forEach(r => {
        if (r.type === 'SALE') saleWt += parseFloat(r.weight || 0);
        else mcWt += parseFloat(r.weight || 0);
        console.log(`[${r.type}] ${r.date}: ${r.weight} - ${r.item}`);
    });
    
    console.log("---------------------------------");
    console.log("Total Sales Weight: ", saleWt);
    console.log("Total PureMC Weight:", mcWt);
    console.log("GRAND TOTAL:        ", saleWt + mcWt);
    process.exit(0);
});
