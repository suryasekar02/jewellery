const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Jewellery',
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }

    const sql = `
        ALTER TABLE puremcitem 
        ADD COLUMN pure DOUBLE DEFAULT 0,
        ADD COLUMN cover DOUBLE DEFAULT 0;
    `;

    db.query(sql, (err, result) => {
        if (err) {
            // Ignore if column already exists
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns likely already exist.');
            } else {
                console.error('Error adding columns:', err);
            }
        } else {
            console.log('Columns added successfully.');
        }
        db.end();
        process.exit(0);
    });
});
