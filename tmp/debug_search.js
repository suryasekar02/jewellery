const mysql = require('mysql2');

const db = mysql.createConnection({
  host: "yamabiko.proxy.rlwy.net",
  user: "root",
  password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
  database: "railway",
  port: 38563
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL...');

    const config = {
        table: 'expenses',
        alias: 'e',
        dateField: 'date',
        select: 'e.*'
    };

    let sql = `SELECT ${config.select} FROM ${config.table} ${config.alias}`;
    sql += ` ORDER BY ${config.alias}.${config.dateField} DESC`;

    console.log("Executing SQL:", sql);

    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error:", err.message);
            console.error("Full Error:", err);
        } else {
            console.log("Success! Results count:", results.length);
            if (results.length > 0) {
                console.log("First row:", results[0]);
            }
        }
        db.end();
        process.exit(0);
    });
});
