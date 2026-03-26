const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Jewellery'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to DB:', err);
        return;
    }
    console.log('Connected to DB...');

    db.query('SELECT * FROM User', (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
        } else {
            console.log('--- Users Found ---');
            console.log(JSON.stringify(results, null, 2));
        }
        db.end();
    });
});
