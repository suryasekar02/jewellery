const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563,
    multipleStatements: true
});

const start = '2026-03-01';
const end = '2026-03-31';

async function verify() {
    console.log(`Verifying transactions for ${start} to ${end}...\n`);

    // 1. Retailer Cash/GPay In
    db.query(`
        SELECT retailername, date, mode, amount 
        FROM retailerpayment 
        WHERE LOWER(mode) IN ('cash', 'gpay') 
          AND COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
    `, [start, end], (err, rows) => {
        if(err) console.error(err);
        let sum = rows.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
        console.log("--- RETAILER CASH/GPAY IN ---");
        rows.forEach(r => console.log(`${r.date} | ${r.retailername.padEnd(20)} | ${r.mode.padEnd(6)} | ${r.amount}`));
        console.log(`TOTAL: ${sum}\n`);

        // 2. Retailer PureCash
        db.query(`
            SELECT retailername, date, purecash 
            FROM retailerpayment 
            WHERE purecash > 0 
              AND COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
        `, [start, end], (err2, rows2) => {
            if(err2) console.error(err2);
            let sum2 = rows2.reduce((a, b) => a + (parseFloat(b.purecash) || 0), 0);
            console.log("--- RETAILER PURECASH ---");
            rows2.forEach(r => console.log(`${r.date} | ${r.retailername.padEnd(20)} | ${r.purecash}`));
            console.log(`TOTAL: ${sum2}\n`);

            // 3. Expenses
            db.query(`
                SELECT particulars, date, amount 
                FROM expenses 
                WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
            `, [start, end], (err3, rows3) => {
                if(err3) console.error(err3);
                let sum3 = rows3.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                console.log("--- EXPENSES ---");
                rows3.forEach(r => console.log(`${r.date} | ${r.particulars.padEnd(20)} | ${r.amount}`));
                console.log(`TOTAL: ${sum3}\n`);

                // 4. PureMC (Party Payout MC)
                db.query(`
                    SELECT p.partyname, p.date, i.totalamount 
                    FROM puremcitem i
                    JOIN puremc p ON i.pureid = p.pureid
                    WHERE COALESCE(STR_TO_DATE(p.date, '%d/%m/%Y'), STR_TO_DATE(p.date, '%d-%m-%Y'), STR_TO_DATE(p.date, '%Y-%m-%d')) BETWEEN ? AND ?
                `, [start, end], (err4, rows4) => {
                    if(err4) console.error(err4);
                    let sum4 = rows4.reduce((a, b) => a + (parseFloat(b.totalamount) || 0), 0);
                    console.log("--- PURE MC (PARTY PAYOUT MC) ---");
                    rows4.forEach(r => console.log(`${r.date} | ${r.partyname.padEnd(20)} | ${r.totalamount}`));
                    console.log(`TOTAL: ${sum4}\n`);

                    // 5. Petrol
                    db.query(`
                        SELECT dsename, date, amount 
                        FROM petrolexpenses 
                        WHERE COALESCE(STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
                    `, [start, end], (err5, rows5) => {
                        if(err5) console.error(err5);
                        let sum5 = rows5.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                        console.log("--- PETROL EXPENSES ---");
                        rows5.forEach(r => console.log(`${r.date} | ${r.dsename.padEnd(20)} | ${r.amount}`));
                        console.log(`TOTAL: ${sum5}\n`);

                        console.log("--- FINAL CALCULATION ---");
                        console.log(`Cash In:   ${sum}`);
                        console.log(`PureCash: -${sum2}`);
                        console.log(`Expenses: -${sum3}`);
                        console.log(`PureMC:   -${sum4}`);
                        console.log(`Petrol:   -${sum5}`);
                        console.log(`RESULT:    ${sum - sum2 - sum3 - sum4 - sum5}`);
                        process.exit();
                    });
                });
            });
        });
    });
}

verify();
