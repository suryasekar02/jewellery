const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jewellery'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL...');

    const tables = ['sales', 'retailerpayment', 'puremc', 'petrolexpenses'];

    tables.forEach(table => {
        const query = `ALTER TABLE ${table} ADD COLUMN userid VARCHAR(50)`;
        db.query(query, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column userid already exists in ${table}`);
                } else {
                    console.error(`Error altering ${table}:`, err);
                }
            } else {
                console.log(`Added userid column to ${table}`);
            }
        });
    });

    // Close connection after short delay to allow queries to queue/finish (simple script approach)
    setTimeout(() => {
        db.end();
    }, 2000);
});
