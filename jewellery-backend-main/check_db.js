
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'Jewellery'
});

db.connect((err) => {
    if (err) {
        console.error('Connection error:', err);
        process.exit(1);
    }
    db.query('DESCRIBE User', (err, results) => {
        if (err) {
            console.error('Error describing table User:', err);
        } else {
            console.log('Table User Structure:', JSON.stringify(results, null, 2));
        }
        db.end();
    });
});
