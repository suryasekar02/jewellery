const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Jewellery'
});

db.connect((err) => {
    if (err) throw err;

    db.query('SELECT * FROM puremcitem WHERE pureid = "TEST_M1"', (err, results) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Inserted Items:', JSON.stringify(results, null, 2));
        }

        // Cleanup
        db.query('DELETE FROM puremcitem WHERE pureid = "TEST_M1"', () => {
            db.query('DELETE FROM puremc WHERE pureid = "TEST_M1"', () => {
                db.end();
                process.exit(0);
            });
        });
    });
});
