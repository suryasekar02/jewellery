const mysql = require('mysql2');

const db = mysql.createConnection({
  host: "yamabiko.proxy.rlwy.net",
  user: "root",
  password: "hRirQGrleAlWWpWnThZottwHolrrGaJF",
  database: "railway",
  port: 38563
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to remote DB:', err);
        process.exit(1);
    }
    console.log('Connected to Railway DB.');

    db.query('SELECT * FROM user WHERE loginname = ?', ['admin'], (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
        } else if (results.length > 0) {
            console.log('Admin user found:', results[0]);
        } else {
            console.log('Admin user NOT found in the database.');
        }
        db.end();
    });
});
