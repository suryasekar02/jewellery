const mysql = require('mysql2');

const db = mysql.createConnection({
    host: '51.20.73.184',
    database: 'Jewellery'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database.');

    const sql = "ALTER TABLE payment MODIFY COLUMN mode VARCHAR(15) NOT NULL";
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error altering table:', err);
        } else {
            console.log('Table altered successfully. Payment mode column increased to VARCHAR(15).');
        }
        db.end();
    });
});
