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
        console.error('Error connecting to MySQL:', err);
        return;
    }
    
    // Check if user already exists
    db.query('SELECT * FROM user WHERE loginname = "office"', (err, results) => {
        if (err) { console.error(err); db.end(); return; }
        
        if (results.length > 0) {
            console.log('Office user already exists, updating role and password...');
            db.query('UPDATE user SET password = "office", Role = "office" WHERE loginname = "office"', (err, res) => {
                if (err) console.error(err);
                else console.log('Office user updated.');
                db.end();
            });
        } else {
            const user = {
                userid: "USR_OFFICE",
                username: "Office User",
                loginname: "office",
                password: "office",
                mobile: "-",
                email: "office@jewellery.com",
                Role: "office"
            };
            db.query('INSERT INTO user SET ?', user, (err, res) => {
                if (err) console.error(err);
                else console.log('Office user created.');
                db.end();
            });
        }
    });
});
