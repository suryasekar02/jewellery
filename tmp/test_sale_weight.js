const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563
});

const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

const sql = `
    SELECT
        IFNULL((
            SELECT SUM(si.weight) FROM salesitem si 
            JOIN sales s ON si.invno = s.invno 
            WHERE COALESCE(STR_TO_DATE(s.date, '%d/%m/%Y'), STR_TO_DATE(s.date, '%d-%m-%Y'), STR_TO_DATE(s.date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as sales_wt,
        
        IFNULL((
            SELECT SUM(pmi.weight) FROM puremcitem pmi 
            JOIN puremc pm ON pmi.pureid = pm.pureid 
            WHERE COALESCE(STR_TO_DATE(pm.date, '%d/%m/%Y'), STR_TO_DATE(pm.date, '%d-%m-%Y'), STR_TO_DATE(pm.date, '%Y-%m-%d')) BETWEEN ? AND ?
        ), 0) as mc_wt
`;

const params = [
    monthStart, monthEnd,
    monthStart, monthEnd
];

db.query(sql, params, (err, rows) => {
    if(err) {
        console.error(err);
    } else {
        const r = rows[0];
        const saleWeight = parseFloat(r.sales_wt) + parseFloat(r.mc_wt);
        console.log("Month Range:", monthStart, "to", monthEnd);
        console.log("---------------------------------");
        console.log("Sales Item Weight: ", r.sales_wt);
        console.log("PureMC Item Weight:", r.mc_wt);
        console.log("---------------------------------");
        console.log("FINAL SALE WEIGHT: ", saleWeight.toFixed(3), "g");
    }
    process.exit();
});
