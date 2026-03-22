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

    db.query('DESCRIBE party', (err, results) => {
        if (err) {
            console.error('Error describing party table:', err);
        } else {
            console.log('Table structure:', results);
        }
        db.end();
        process.exit(0);
    });
});
