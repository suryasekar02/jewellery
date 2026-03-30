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

    // Constructing exactly as line 2519-2523 in BackendAPI.js
    const dbDateExpr = `DATE(COALESCE(
        STR_TO_DATE(\`${config.alias}\`.\`${config.dateField}\`, '%d/%m/%Y'),
        STR_TO_DATE(\`${config.alias}\`.\`${config.dateField}\`, '%Y-%m-%d'),
        STR_TO_DATE(\`${config.alias}\`.\`${config.dateField}\`, '%d-%m-%Y')
    ))`;

    let sql = `SELECT ${config.select} FROM ${config.table} ${config.alias}`;
    sql += ` WHERE ${dbDateExpr} IS NOT NULL`; // Try to run this to check syntax
    sql += ` ORDER BY ${config.alias}.${config.dateField} DESC`;

    console.log("Executing SQL:\n", sql);

    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error:", err.message);
            console.error("Full Error:", err);
        } else {
            console.log("Success! Results count:", results.length);
        }
        db.end();
        process.exit(0);
    });
});
