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

    db.query('DESCRIBE puremcitem', (err, results) => {
        if (err) {
            console.error('Error describing puremcitem table:', err);
        } else {
            console.log('--- PureMcItem Columns ---');
            results.forEach(col => console.log(col.Field));
        }

        db.query('DESCRIBE puremc', (err, results) => {
            if (err) {
                console.error('Error describing puremc table:', err);
            } else {
                console.log('--- PureMc Columns ---');
                results.forEach(col => console.log(col.Field));
            }
            db.end();
            process.exit(0);
        });
    });
});
