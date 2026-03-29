const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    user: 'root',
    password: 'hRirQGrleAlWWpWnThZottwHolrrGaJF',
    database: 'railway',
    port: 38563
});

let testQuery = `
SELECT 
  date, 
  STR_TO_DATE(date, '%d/%m/%Y') AS d1,
  STR_TO_DATE(date, '%d-%m-%Y') AS d2,
  STR_TO_DATE(date, '%Y-%m-%d') AS d3,
  COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) as parsed_date
FROM petrolexpenses LIMIT 5
`;

db.query(testQuery, (err, rows) => {
    if(err) console.error(err);
    else console.log("DATE PARSING PREVIEW:", rows);
    process.exit();
});
