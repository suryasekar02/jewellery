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
        SUM(i.totalamount) as total_mc
    FROM puremcitem i
    JOIN puremc p ON i.pureid = p.pureid
    WHERE COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d')) BETWEEN '2026-03-01' AND '2026-03-31'
`;

db.query(sql, (err, rows) => {
    if(err) console.error(err);
    else console.log("MONTHLY PURE MC TOTAL:", rows[0]);
    process.exit();
});
