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

    const createPurchaseTable = `
        CREATE TABLE IF NOT EXISTS purchase (
            purchaseid VARCHAR(20) PRIMARY KEY NOT NULL, 
            date VARCHAR(12) NOT NULL, 
            party VARCHAR(50)
        )
    `;

    const createPurchaseItemTable = `
        CREATE TABLE IF NOT EXISTS purchaseitem (
            pid INT AUTO_INCREMENT PRIMARY KEY, 
            purchaseid VARCHAR(20) NOT NULL, 
            item VARCHAR(50) NOT NULL,  
            coverwt FLOAT NOT NULL,  
            count INT NOT NULL,    
            wt FLOAT NOT NULL,   
            withcoverwt FLOAT NOT NULL,    
            FOREIGN KEY (purchaseid) REFERENCES purchase(purchaseid) ON DELETE CASCADE
        )
    `;

    // Alter table if columns are missing
    const alterTable = `
        ALTER TABLE purchaseitem 
        ADD COLUMN IF NOT EXISTS coverwt FLOAT NOT NULL DEFAULT 0 AFTER item
    `;

    db.query(createPurchaseTable, (err) => {
        if (err) console.error('Error creating purchase table:', err);

        db.query(createPurchaseItemTable, (err) => {
            if (err) {
                // If it exists, try altering it
                db.query(alterTable, (err2) => {
                    if (err2) console.error('Error altering purchaseitem table:', err2);
                    else console.log('Purchaseitem table updated with coverwt.');
                    finish();
                });
            } else {
                console.log('Purchase tables created successfully.');
                finish();
            }
        });
    });

    function finish() {
        db.end();
        process.exit(0);
    }
});
