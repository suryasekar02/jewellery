const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'Jewellery',
    multipleStatements: true
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to DB');
    migrate();
});

async function migrate() {
    const tables = [
        { table: 'dse', id: 'did', prefix: 'D' },
        { table: 'category', id: 'cid', prefix: 'C' },
        { table: 'retailer', id: 'rid', prefix: 'R' },
        { table: 'item', id: 'iid', prefix: 'I' },
        { table: 'sales', id: 'invno', prefix: 'S', children: ['salesitem'] },
        { table: 'stock', id: 'stockid', prefix: 'K', children: ['stocksitem'] },
        { table: 'inventory', id: 'inventid', prefix: 'N', children: ['inventoryitem'] },
        { table: 'purchase', id: 'purchaseid', prefix: 'P', children: ['purchaseitem'] },
        { table: 'puremc', id: 'pureid', prefix: 'M', children: ['puremcitem'] },
        { table: 'payment', id: 'payid', prefix: 'Y' },
        { table: 'retailerpayment', id: 'payid', prefix: 'L' },
        { table: 'expenses', id: 'exid', prefix: 'E' },
        { table: 'petrolexpenses', id: 'petid', prefix: 'F' },
        { table: 'TrashTable', id: 'trashId', prefix: 'T' }
    ];

    for (const t of tables) {
        console.log(`Migrating ${t.table}...`);

        // 1. Check if ID column is already VARCHAR
        let isVarchar = await new Promise((resolve, reject) => {
            db.query(`DESCRIBE ${t.table}`, (err, results) => {
                if (err) return reject(err);
                const col = results.find(c => c.Field === t.id);
                if (!col) return resolve(false); // Column might not exist (e.g. retailer rid)
                resolve(col.Type.includes('varchar'));
            });
        });

        if (isVarchar) {
            console.log(`Table ${t.table} already migrated.`);
            continue;
        }

        // 2. Drop Auto Increment (modify column to INT first to drop AI)
        // Then modify to VARCHAR
        // NOTE: We must update data BEFORE changing to VARCHAR? No, Int to Varchar is implicit.
        // But if we want 'D101', we should do it after or during.
        // If we change to VARCHAR, '101' becomes "101". Then we can UPDATE to "D101".

        try {
            // Step 1: Remove AUTO_INCREMENT
            await runQuery(`ALTER TABLE ${t.table} MODIFY COLUMN ${t.id} INT`);

            // Step 2: Change to VARCHAR
            await runQuery(`ALTER TABLE ${t.table} MODIFY COLUMN ${t.id} VARCHAR(50)`);

            // Step 3: Prefix existing IDs
            await runQuery(`UPDATE ${t.table} SET ${t.id} = CONCAT('${t.prefix}', ${t.id}) WHERE ${t.id} NOT LIKE '${t.prefix}%'`);

            // Step 4: Update Children
            if (t.children) {
                for (const child of t.children) {
                    console.log(`  Migrating child ${child}...`);
                    await runQuery(`ALTER TABLE ${child} MODIFY COLUMN ${t.id} VARCHAR(50)`);
                    await runQuery(`UPDATE ${child} SET ${t.id} = CONCAT('${t.prefix}', ${t.id}) WHERE ${t.id} NOT LIKE '${t.prefix}%'`);
                }
            }
            console.log(`Done ${t.table}`);

        } catch (e) {
            console.error(`Error migrating ${t.table}:`, e.message);
        }
    }

    console.log('Migration Finished');
    db.end();
}

function runQuery(sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}
