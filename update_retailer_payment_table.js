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
    console.log('Connected to MySQL.');

    const createTableSql = `
        CREATE TABLE IF NOT EXISTS retailerpayment (
            payid VARCHAR(20) PRIMARY KEY NOT NULL, 
            date VARCHAR(15) NOT NULL, 
            time VARCHAR(15) NOT NULL, 
            dsename VARCHAR(50) NOT NULL, 
            retailername VARCHAR(50) NOT NULL, 
            mode VARCHAR(15) NOT NULL, 
            silverweight FLOAT NOT NULL DEFAULT 0,
            amount INT, 
            description VARCHAR(200)
        )
    `;

    const alterTableSql = `
        ALTER TABLE retailerpayment 
        ADD COLUMN IF NOT EXISTS silverweight FLOAT NOT NULL DEFAULT 0 AFTER mode
    `;

    db.query(createTableSql, (err) => {
        if (err) console.error('Error creating retailerpayment table:', err);

        db.query(alterTableSql, (err) => {
            if (err) console.error('Error altering retailerpayment table:', err);
            else console.log('Retailerpayment table updated with silverweight.');
            db.end();
            process.exit(0);
        });
    });
});
