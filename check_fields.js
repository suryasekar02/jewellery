const mysql = require('mysql2');
const db = mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'Jewellery' });
db.query('DESCRIBE party', (e, r) => {
    if (e) { console.log(e); }
    else { r.forEach(f => console.log(f.Field)); }
    db.end();
});
