const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Jewellery'
});

db.connect((err) => {
    if (err) { console.error('Error connecting:', err); return; }

    const adminUser = {
        userid: 'USR_ADMIN',
        username: 'Administrator',
        loginname: 'admin',
        password: 'admin123',
        mobile: '0000000000',
        email: 'admin@jewellery.com',
        Role: 'Admin' // Explicitly setting Role
    };

    // Check if exists first
    db.query('SELECT * FROM User WHERE loginname = ?', ['admin'], (err, results) => {
        if (results.length > 0) {
            console.log('Admin user already exists. Updating Role to Admin...');
            db.query('UPDATE User SET Role = ?, password = ? WHERE loginname = ?', ['Admin', 'admin123', 'admin'], (err) => {
                if (err) console.error(err);
                else console.log('Admin user updated successfully.');
                db.end();
            });
        } else {
            console.log('Creating new Admin user...');
            // We use simple string concatenation for the query or a prepared statement that includes the Role column
            // distinct from the API which might be missing it.
            const sql = `INSERT INTO User (userid, username, loginname, password, mobile, email, Role) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const values = [adminUser.userid, adminUser.username, adminUser.loginname, adminUser.password, adminUser.mobile, adminUser.email, adminUser.Role];

            db.query(sql, values, (err) => {
                if (err) console.error('Error inserting admin:', err);
                else console.log('Admin user created successfully.');
                db.end();
            });
        }
    });
});
