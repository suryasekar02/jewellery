const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Jewellery'
});

db.connect((err) => {
    if (err) { console.error('Error connecting:', err); return; }

    db.query('SELECT loginname, password, Role FROM User', (err, results) => {
        if (err) { console.error(err); }
        else {
            console.log('\n--- CREDENTIALS ---');
            if (results.length === 0) {
                console.log('No users found.');
            } else {
                results.forEach(u => {
                    console.log(`Login: ${u.loginname} | Password: ${u.password} | Role: ${u.Role || 'None'}`);
                });
            }
            console.log('-------------------\n');
        }
        db.end();
    });
});
