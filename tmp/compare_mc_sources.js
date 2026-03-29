const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563
});

const start = '2026-03-01';
const end = '2026-03-31';

async function checkBoth() {
    const q1 = `
        SELECT SUM(i.totalamount) as total
        FROM puremcitem i
        JOIN puremc p ON i.pureid = p.pureid
        WHERE COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d')) BETWEEN ? AND ?
    `;

    const q2 = `
        SELECT SUM(i.totalamount) as total
        FROM purchaseitem i
        JOIN purchase p ON i.purchaseid = p.purchaseid
        WHERE COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d')) BETWEEN ? AND ?
    `;

    db.query(q1, [start, end], (err, r1) => {
        if(err) console.error(err);
        console.log("PURE MC (Retailer/Party Gold Exchange) Total MC:", r1[0].total);

        db.query(q2, [start, end], (err2, r2) => {
            if(err2) console.error(err2);
            console.log("PURCHASE (Stock Purchase) Total MC:", r2[0].total);
            process.exit();
        });
    });
}

checkBoth();
