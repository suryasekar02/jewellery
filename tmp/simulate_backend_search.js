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
    
    const type = 'party_payout';
    const filters = {
        dateFrom: '2026-03-28',
        dateTo: '',
        party: ''
    };
    
    let config = {
        table: 'partypayout',
        alias: 'pp',
        dateField: 'date',
        select: 'pp.*'
    };

    let sql = `SELECT ${config.select} FROM ${config.table} ${config.alias}`;
    let whereClauses = [];
    let params = [];

    const dbDateExpr = `DATE(COALESCE(
        STR_TO_DATE(${config.alias}.${config.dateField}, '%d/%m/%Y'),
        STR_TO_DATE(${config.alias}.${config.dateField}, '%Y-%m-%d'),
        STR_TO_DATE(${config.alias}.${config.dateField}, '%d-%m-%Y')
    ))`;

    if (filters.dateFrom) {
        whereClauses.push(`${dbDateExpr} >= CAST(? AS DATE)`);
        params.push(filters.dateFrom);
    }

    if ((type === 'purchase' || type === 'party_payout') && filters.party) {
        let col = (type === 'party_payout') ? 'partyname' : 'party';
        whereClauses.push(`${config.alias}.${col} LIKE ?`);
        params.push(`%${filters.party}%`);
    }

    if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    sql += ` ORDER BY ${config.alias}.${config.dateField} DESC`;

    console.log("Simulated SQL:", sql);
    console.log("Simulated Params:", params);

    db.query(sql, params, (err, res) => {
        if (err) {
            console.error('SQL EXECUTION FAILED!', err);
        } else {
            console.log('SQL EXECUTION SUCCESS! Rows:', res.length);
        }
        db.end();
    });
});
