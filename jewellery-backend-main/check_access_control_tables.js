const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Jewellery'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }

    const tables = ['sales', 'retailerpayment', 'puremc', 'petrolexpenses'];
    let completed = 0;

    tables.forEach(table => {
        db.query(`DESCRIBE ${table}`, (err, results) => {
            if (err) {
                console.error(`Error describing ${table}:`, err.message);
            } else {
                console.log(`--- ${table} Columns ---`);
                results.forEach(col => console.log(col.Field));
            }
            completed++;
            if (completed === tables.length) {
                db.end();
                process.exit(0);
            }
        });
    });
});
