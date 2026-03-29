
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' folder

// Auth Middleware
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role'];
        
        // Admin always has full access
        if (userRole === 'admin') {
            return next();
        }

        // If no role provided, we'll allow for now to prevent breaking existing clients (like APK)
        // but strictly enforce for "office" role once header is present.
        if (!userRole) {
            return next();
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            console.warn(`Access denied for role: ${userRole} at ${req.method} ${req.url}`);
            return res.status(403).json({ error: 'Unauthorized access: This action is restricted to Administrators.' });
        }
        next();
    };
};

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);
    next();
});

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
    console.log('Connected to MySQL...');
});


// Helper to generate next ID (FIXED VERSION)
function getNextId(table, column, prefix, callback) {

    let sql = `
        SELECT ${column} 
        FROM ${table}
        WHERE ${column} LIKE '${prefix}%'
        ORDER BY CAST(SUBSTRING(${column}, ${prefix.length + 1}) AS UNSIGNED) DESC
        LIMIT 1
    `;

    db.query(sql, (err, results) => {

        if (err) return callback(err);

        if (results.length === 0) {
            return callback(null, prefix + "1");
        }

        let lastId = results[0][column];

        let number = parseInt(lastId.replace(prefix, '')) || 0;

        let nextId = prefix + (number + 1);

        callback(null, nextId);

    });
}
app.post('/add_dse', authorize(['admin']), (req, res) => {
    let dsename = req.body.dsename;
    if (!dsename) return res.status(400).send('DSE Name is required');

    // Case-insensitive check for existing DSE name
    db.query('SELECT * FROM dse WHERE LOWER(dsename) = LOWER(?)', [dsename], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error checking DSE'); return; }
        if (results.length > 0) {
            return res.status(409).send('DSE Name already exists');
        }

        getNextId('dse', 'did', 'D', (err, nextId) => {
            if (err) { console.error(err); res.status(500).send('Error generating ID'); return; }

            let dse = {
                did: nextId,
                dsename: req.body.dsename,
                mobile: req.body.mobile,
                email: req.body.email,
                openbalance: req.body.openbalance,
                totalbal: req.body.totalbal !== undefined ? req.body.totalbal : req.body.openbalance
            };
            let sql = 'INSERT INTO dse SET ?';
            db.query(sql, dse, (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error inserting data');
                    return;
                }
                res.send('DSE added...');
            });
        });
    });
});

app.post('/add_user', authorize(['admin']), (req, res) => {
    let loginname = req.body.loginname;
    if (!loginname) {
        return res.status(400).send('Login name is required');
    }

    // Case-insensitive check for existing login name
    db.query('SELECT * FROM user WHERE LOWER(loginname) = LOWER(?)', [loginname], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error checking user'); return; }
        if (results.length > 0) {
            return res.status(409).send('Login name already exists');
        }

        getNextId('user', 'userid', 'USR', (err, nextId) => {
            if (err) { console.error(err); res.status(500).send('Error generating ID'); return; }

            let user = {
                userid: nextId, // Auto-generated ID
                username: req.body.username,
                loginname: req.body.loginname,
                password: req.body.password,
                mobile: req.body.mobile,
                email: req.body.email,
                Role: 'user' // Default Role required by schema
            };
            let sql = 'INSERT INTO user SET ?';
            db.query(sql, user, (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error inserting user: ' + err.message);
                    return;
                }
                res.send('user added successfully');
            });
        });
    });
});


app.get('/view_users', authorize(['admin']), (req, res) => {
    let sql = 'SELECT * FROM user';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching users');
            return;
        }
        res.json(results);
    });
});

app.post('/update_password', authorize(['admin']), (req, res) => {
    let loginName = req.body.loginname;
    let newPassword = req.body.password;

    if (!loginName || !newPassword) {
        return res.status(400).send('Missing loginname or password');
    }

    let sql = 'UPDATE user SET password = ? WHERE loginname = ?';
    db.query(sql, [newPassword, loginName], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error updating password');
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).send('user not found');
            return;
        }
        res.send('Password updated successfully');
    });
});


app.post('/login', (req, res) => {
    console.log("Login request received:", req.body);
    let loginname = req.body.loginname;
    let password = req.body.password;

    if (!loginname || !password) {
        console.log("Missing loginname or password");
        return res.status(400).send('Login name and password are required');
    }

    let sql = 'SELECT * FROM user WHERE loginname = ? AND password = ?';
    db.query(sql, [loginname, password], (err, results) => {
        if (err) {
            console.error("Database error during login:", err);
            return res.status(500).send('Error checking user credentials: ' + err.message);
        }
        console.log("Login query results:", results);
        if (results.length > 0) {
            console.log("Login successful for:", loginname);
            res.json(results[0]);
        } else {
            console.log("Login failed: Invalid credentials for", loginname);
            res.status(401).send('Invalid credentials');
        }
    });
});

// ID Configuration Map
const ID_CONFIG = {
    'sale': { table: 'sales', column: 'invno', prefix: 'S' },
    'stock': { table: 'stock', column: 'stockid', prefix: 'K' },
    'inventory': { table: 'inventory', column: 'inventid', prefix: 'V' },
    'purchase': { table: 'purchase', column: 'purchaseid', prefix: 'P' },
    'puremc': { table: 'puremcheader', column: 'pureid', prefix: 'PM' },
    'payment': { table: 'payment', column: 'payid', prefix: 'Y' },
    'retailer_payment': { table: 'retailerpayment', column: 'payid', prefix: 'L' },
    'expenses': { table: 'expenses', column: 'exid', prefix: 'E' },
    'petrol': { table: 'petrolexpenses', column: 'petid', prefix: 'F' },
    'partypayout': { table: 'partypayout', column: 'parid', prefix: 'PAR' },
    'dse': { table: 'dse', column: 'did', prefix: 'D' },
    'user': { table: 'user', column: 'userid', prefix: 'USR' }
};

// Generic Endpoint for Next ID
app.get('/get_next_id', (req, res) => {
    const type = req.query.type;
    const config = ID_CONFIG[type];

    if (!config) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    const { table, column, prefix } = config;

    // Find the last ID that starts with the given prefix
    // We order by length first to handle numeric sorting (e.g. S10 > S2) correctly if using simple string sort
    let sql = `SELECT ${column} as id FROM ${table} WHERE ${column} LIKE '${prefix}%' ORDER BY LENGTH(${column}) DESC, ${column} DESC LIMIT 1`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error fetching next ID' });
            return;
        }

        let nextId = prefix + "1"; // Default if no record found

        if (results.length > 0) {
            let lastId = results[0].id;
            // Extract the numeric part
            let numPart = lastId.substring(prefix.length);
            if (!isNaN(numPart)) {
                let nextNum = parseInt(numPart) + 1;
                nextId = prefix + nextNum;
            }
        }
        res.json({ nextId: nextId });
    });
});

app.get('/view_dse', (req, res) => {
    let sql = 'SELECT * FROM dse';
    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_dse', authorize(['admin']), (req, res) => {
    console.log('Received delete_dse request. Body:', req.body);
    let did = req.body.did;
    if (!did) {
        console.error('Missing did in request');
        res.status(400).send('Missing did');
        return;
    }
    // 1. Fetch record
    db.query('SELECT * FROM dse WHERE did = ?', [did], (err, results) => {
        if (err) {
            console.error('Error fetching DSE:', err);
            res.status(500).send('Error finding dse record');
            return;
        }
        if (results.length === 0) {
            console.error('DSE Record not found for did:', did);
            res.status(404).send('Record not found');
            return;
        }

        let item = results[0];
        console.log('Found DSE item:', item);

        // 2. Add to Trash
        // Field Mapping: field1: did, field2: dsename, field3: mobile, field4: email, field5: openbalance, field6: totalbal
        let trashFields = {
            field1: String(item.did),
            field2: item.dsename,
            field3: item.mobile,
            field4: item.email,
            field5: String(item.openbalance),
            field6: String(item.totalbal)
        };

        addToTrash('Dse', did, trashFields, 'API', db, (err) => {
            if (err) console.error("Error adding to trash:", err); // Log but continue delete

            // 3. Delete
            let sql = 'DELETE FROM dse WHERE did = ?';
            db.query(sql, [did], (err, result) => {
                if (err) {
                    console.error('Error deleting DSE from DB:', err);
                    res.status(500).send('Error deleting dse: ' + err.message);
                    return;
                }
                console.log('DSE deleted successfully');
                res.send('DSE deleted successfully');
            });
        });
    });
});

app.post('/add_category', authorize(['admin']), (req, res) => {
    let categoryname = req.body.categoryname || req.body.categoryName;
    if (!categoryname) return res.status(400).send('Category Name is required');

    // Case-insensitive check for existing category
    db.query('SELECT * FROM category WHERE LOWER(categoryname) = LOWER(?)', [categoryname], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error checking category'); return; }
        if (results.length > 0) {
            return res.status(409).send('Category Name already exists');
        }

        getNextId('category', 'cid', 'C', (err, nextId) => {
            if (err) { console.error(err); res.status(500).send('Error generating ID'); return; }

            let category = {
                cid: nextId,
                categoryname: categoryname
            };
            let sql = 'INSERT INTO category SET ?';
            db.query(sql, category, (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error inserting category');
                    return;
                }
                res.send('Category added...');
            });
        });
    });
});

app.get('/view_category', (req, res) => {
    let sql = 'SELECT * FROM category';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching categories');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_category', authorize(['admin']), (req, res) => {
    let cid = req.body.cid;
    // 1. Fetch record
    db.query('SELECT * FROM category WHERE cid = ?', [cid], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error finding category'); return; }
        if (results.length === 0) { res.status(404).send('Category not found'); return; }

        let item = results[0];
        // 2. Add to Trash
        // Field Mapping: field1: cid, field2: categoryname
        let trashFields = {
            field1: String(item.cid),
            field2: item.categoryname
        };

        addToTrash('Category', cid, trashFields, 'API', db, (err) => {
            if (err) console.error("Error adding to Trash:", err);

            // 3. Delete
            let sql = 'DELETE FROM category WHERE cid = ?';
            db.query(sql, [cid], (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error deleting category');
                    return;
                }
                res.send('Category deleted successfully');
            });
        });
    });
});

app.post('/add_retailer', authorize(['admin']), (req, res) => {
    let retailername = req.body.retailername;
    if (!retailername) return res.status(400).send('Retailer Name is required');

    // Case-insensitive check for existing retailer
    db.query('SELECT * FROM retailer WHERE LOWER(retailername) = LOWER(?)', [retailername], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error checking retailer'); return; }
        if (results.length > 0) {
            return res.status(409).send('Retailer Name already exists');
        }

        getNextId('retailer', 'rid', 'R', (err, nextId) => {

            if (err) {
                console.error(err);
                return res.status(500).send('Error generating ID');
            }

            let retailer = {
                rid: nextId,
                dsename: req.body.dsename,
                retailername: req.body.retailername,
                mobile: req.body.mobile,
                location: req.body.location,
                district: req.body.district,
                openbalance: parseInt(req.body.openbalance) || 0,
                openpure: parseFloat(req.body.openpure) || 0
            };

            let sql = 'INSERT INTO retailer SET ?';

            db.query(sql, retailer, (err, result) => {

                if (err) {
                    console.error(err);
                    return res.status(500).send('Error inserting retailer');
                }

                res.send('Retailer added successfully');

            });
        });
    });
});

app.post('/delete_retailer', (req, res) => {

    let rid = req.body.rid;

    if (!rid) {
        return res.status(400).send('Missing rid');
    }

    db.query('SELECT * FROM retailer WHERE rid = ?', [rid], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send('Error finding retailer');
        }

        if (results.length === 0) {
            return res.status(404).send('Retailer not found');
        }

        let item = results[0];

        let trashFields = {
            field1: item.rid,
            field2: item.dsename,
            field3: item.retailername,
            field4: item.mobile,
            field5: item.location,
            field6: String(item.openbalance),
            field7: String(item.openpure || 0)
        };

        addToTrash('Retailer', item.rid, trashFields, 'API', db, (err) => {

            if (err) console.error("Error adding to Trash:", err);

            let sql = 'DELETE FROM retailer WHERE rid = ?';

            db.query(sql, [rid], (err, result) => {

                if (err) {
                    console.error(err);
                    return res.status(500).send('Error deleting retailer');
                }

                res.send('Retailer deleted successfully');

            });

        });

    });

});

app.post('/update_retailer', (req, res) => {

    let rid = req.body.rid;
    let retailername = req.body.retailername;

    if (!rid) {
        return res.status(400).send('Missing rid');
    }
    if (!retailername) {
        return res.status(400).send('Retailer Name is required');
    }

    // Case-insensitive check for existing retailer name (excluding current record)
    db.query('SELECT * FROM retailer WHERE LOWER(retailername) = LOWER(?) AND rid != ?', [retailername, rid], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error checking retailer'); return; }
        if (results.length > 0) {
            return res.status(409).send('Retailer Name already exists');
        }

        let retailer = {
            dsename: req.body.dsename,
            retailername: req.body.retailername,
            mobile: req.body.mobile,
            location: req.body.location,
            district: req.body.district,
            openbalance: parseInt(req.body.openbalance) || 0,
            openpure: parseFloat(req.body.openpure) || 0
        };

        let sql = 'UPDATE retailer SET ? WHERE rid = ?';

        db.query(sql, [retailer, rid], (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).send('Error updating retailer');
            }

            res.send('Retailer updated successfully');

        });
    });
});

app.get('/view_retailer', (req, res) => {

    let sql = 'SELECT * FROM retailer';

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching retailers');
        }

        res.json(results);

    });

});

app.get('/view_retailer_by_dse', (req, res) => {

    let dsename = req.query.dsename;

    if (!dsename) {
        return res.status(400).send('Missing dsename parameter');
    }

    let sql = 'SELECT * FROM retailer WHERE dsename = ?';

    db.query(sql, [dsename], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching retailers');
        }

        res.json(results);

    });

});

app.post('/add_item', authorize(['admin']), (req, res) => {
    let itemname = req.body.itemName;
    if (!itemname) return res.status(400).send('Item Name is required');

    // Case-insensitive check for existing item
    db.query('SELECT * FROM item WHERE LOWER(itemname) = LOWER(?)', [itemname], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error checking item'); return; }
        if (results.length > 0) {
            return res.status(409).send('Item Name already exists');
        }

        getNextId('item', 'iid', 'I', (err, nextId) => {
            if (err) { console.error(err); res.status(500).send('Error generating ID'); return; }

            let item = {
                iid: nextId,
                itemname: req.body.itemName,
                coverweight: req.body.coverWeight,
                category: req.body.category
            };
            let sql = 'INSERT INTO item SET ?';
            db.query(sql, item, (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error inserting item');
                    return;
                }
                res.send('Item added...');
            });
        });
    });
});

app.get('/view_item', (req, res) => {
    let sql = 'SELECT iid, itemname AS itemName, coverweight AS coverWeight, category FROM item';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching items');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_item', authorize(['admin']), (req, res) => {
    let iid = req.body.iid;
    // 1. Fetch record
    db.query('SELECT * FROM item WHERE iid = ?', [iid], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error finding item'); return; }
        if (results.length === 0) { res.status(404).send('Item not found'); return; }

        let item = results[0];
        // 2. Add to Trash
        // Field Mapping: field1: iid, field2: itemname, field3: coverweight, field4: category
        let trashFields = {
            field1: String(item.iid),
            field2: item.itemname,
            field3: String(item.coverweight),
            field4: item.category
        };

        addToTrash('Item', iid, trashFields, 'API', db, (err) => {
            if (err) console.error("Error adding to Trash:", err);

            // 3. Delete
            let sql = 'DELETE FROM item WHERE iid = ?';
            db.query(sql, [iid], (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error deleting item');
                    return;
                }
                res.send('Item deleted successfully');
            });
        });
    });
});

app.get('/get_last_invoice', (req, res) => {
    let sql = 'SELECT invno FROM sales ORDER BY LENGTH(invno) DESC, invno DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching invoice');
            return;
        }
        if (results.length > 0) {
            res.json({ invno: results[0].invno });
        } else {
            res.json({ invno: null });
        }
    });
});


                    //
app.get('/view_sales', (req, res) => {
    let userid = req.query.userid;
    let sql = 'SELECT * FROM sales';
    let params = [];

    if (userid) {
        sql += ' WHERE userid = ?';
        params.push(userid);
    }

    db.query(sql, params, (err, sales) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching sales');
            return;
        }

        // For each sale, fetch items. This is a simple implementation.
        // For better performance in production, use a JOIN and process result.
        // But to match current logic:
        let pending = sales.length;
        if (pending === 0) {
            res.json([]);
            return;
        }

        sales.forEach(sale => {
            let sqlItems = 'SELECT * FROM salesitem WHERE invno = ?';
            db.query(sqlItems, [sale.invno], (err, items) => {
                if (err) {
                    console.error(err);
                    sale.saleItems = [];
                } else {
                    sale.saleItems = items.map(item => ({
                        product: item.item,
                        weight: item.weight,
                        count: item.count,
                        rate: item.rate,
                        cover: item.coverwt,
                        total: item.total,
                        totalweight: item.totalweight
                    }));
                }
                sale.discount = sale.discount || 0;
                sale.finaltotal = sale.finaltotal || 0;
                pending--;
                if (pending === 0) {
                    res.json(sales);
                }
            });
        });
    });
});

app.post('/delete_sale', authorize(['admin']), (req, res) => {
    console.log("Received delete_sale request. Body:", req.body);
    let invno = req.body.invno;
    if (!invno) {
        console.error("Missing invno in request");
        res.status(400).send("Missing invno");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { console.error("Transaction Error:", err); throw err; }

        // 1. Fetch Header for Trash
        db.query('SELECT * FROM sales WHERE invno = ?', [invno], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching sale:", err);
                    res.status(500).send('Error fetching sale for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    console.error("Sale not found for invno:", invno);
                    res.status(404).send('Sale not found');
                });
            }

            let sale = results[0];
            console.log("Found sale to delete:", sale);
            // Trash Fields
            let trashFields = {
                field1: String(sale.invno),
                field2: sale.date,
                field3: sale.dse,
                field4: sale.retailer,
                field5: String(sale.discount || 0),
                field6: String(sale.finaltotal || 0)
            };

            // Add to Trash
            addToTrash('Sale', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // 2. Update Retailer Balance (Revert)
                let sqlUpdateRetailer = 'UPDATE retailer SET openbalance = openbalance - ? WHERE rid = ?';
                db.query(sqlUpdateRetailer, [sale.finaltotal || 0, sale.rid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Error reverting retailer balance on sale delete:", err);
                            res.status(500).send('Error updating retailer balance');
                        });
                    }

                    // 3. Delete items
                    let sqlItems = 'DELETE FROM salesitem WHERE invno = ?';
                    db.query(sqlItems, [invno], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error deleting sale items');
                            });
                        }

                        // 4. Delete header
                        let sqlSale = 'DELETE FROM sales WHERE invno = ?';
                        db.query(sqlSale, [invno], (err, result) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error(err);
                                    res.status(500).send('Error deleting sale');
                                });
                            }
                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        throw err;
                                    });
                                }
                                res.send('Sale deleted successfully');
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/get_last_stock_id', (req, res) => {
    let sql = 'SELECT stockid FROM stock ORDER BY LENGTH(stockid) DESC, stockid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching stock ID');
            return;
        }
        if (results.length > 0) {
            res.json({ stockid: results[0].stockid });
        } else {
            res.json({ stockid: null });
        }
    });
});

app.post('/add_stock', authorize(['admin']), (req, res) => {
    db.beginTransaction((err) => {
        if (err) { throw err; }

        let stock = {
            stockid: req.body.stockid, // Header uses 'invno' in Java but mapped to 'stockid' via SerializedName or logic
            date: req.body.date,
            dse: req.body.dse
        };

        let sql = 'INSERT INTO stock SET ?';
        db.query(sql, stock, (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error(err);
                    res.status(500).send('Error inserting stock');
                });
            }

            let items = req.body.stockItems;
            if (items && items.length > 0) {
                let sqlItems = 'INSERT INTO stocksitem (stockid, item, count, wt, withcoverwt, coverwt) VALUES ?';
                let values = items.map(item => [req.body.stockid, item.item, item.count, item.wt, item.withcoverwt, item.coverwt]);

                db.query(sqlItems, [values], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error inserting stock items');
                        });
                    }
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                throw err;
                            });
                        }
                        res.send('Stock added successfully');
                    });
                });
            } else {
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            throw err;
                        });
                    }
                    res.send('Stock added successfully');
                });
            }
        });
    });
});

app.get('/view_stock', (req, res) => {
    let sql = 'SELECT * FROM stock';
    db.query(sql, (err, stocks) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching stocks');
            return;
        }

        let pending = stocks.length;
        if (pending === 0) {
            res.json([]);
            return;
        }

        stocks.forEach(stock => {
            let sqlItems = 'SELECT * FROM stocksitem WHERE stockid = ?';
            db.query(sqlItems, [stock.stockid], (err, items) => {
                if (err) {
                    console.error(err);
                    stock.stockItems = [];
                } else {
                    stock.stockItems = items.map(item => ({
                        item: item.item,
                        count: item.count,
                        wt: item.wt,
                        withcoverwt: item.withcoverwt,
                        coverwt: item.coverwt
                    }));
                }
                pending--;
                if (pending === 0) {
                    res.json(stocks);
                }
            });
        });
    });
});

app.post('/delete_stock', authorize(['admin']), (req, res) => {
    let stockid = req.body.stockid;
    if (!stockid) {
        res.status(400).send("Missing stockid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        // 1. Fetch for Trash
        db.query('SELECT * FROM stock WHERE stockid = ?', [stockid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching stock:", err);
                    res.status(500).send('Error fetching stock for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Stock not found');
                });
            }

            let item = results[0];
            let trashFields = {
                field1: String(item.stockid),
                field2: item.date,
                field3: item.dse
            };

            addToTrash('Stock', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // 2. Delete Items
                let sqlItems = 'DELETE FROM stocksitem WHERE stockid = ?';
                db.query(sqlItems, [stockid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error deleting stock items');
                        });
                    }

                    // 3. Delete Header
                    let sqlStock = 'DELETE FROM stock WHERE stockid = ?';
                    db.query(sqlStock, [stockid], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error deleting stock');
                            });
                        }
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    throw err;
                                });
                            }
                            res.send('Stock deleted successfully');
                        });
                    });
                });
            });
        });
    });
});

app.get('/get_last_inventory_id', (req, res) => {
    let sql = 'SELECT inventid FROM inventory ORDER BY LENGTH(inventid) DESC, inventid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching inventory ID');
            return;
        }
        if (results.length > 0) {
            res.json({ inventid: results[0].inventid });
        } else {
            res.json({ inventid: null });
        }
    });
});

app.post('/add_inventory', authorize(['admin']), (req, res) => {
    db.beginTransaction((err) => {
        if (err) { throw err; }

        let inventory = {
            inventid: req.body.inventid,
            date: req.body.date,
            dse: req.body.dse
        };

        let sql = 'INSERT INTO inventory SET ?';
        db.query(sql, inventory, (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error(err);
                    res.status(500).send('Error inserting inventory');
                });
            }

            let items = req.body.inventoryItems;
            if (items && items.length > 0) {
                // Mapping: product -> item, count -> count, cover -> wt, withcover -> withcoverwt
                let sqlItems = 'INSERT INTO inventoryitem (inventid, item, count, wt, withcoverwt, coverwt) VALUES ?';
                let values = items.map(item => [req.body.inventid, item.item, item.count, item.wt, item.withcoverwt, item.coverwt]);

                db.query(sqlItems, [values], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error inserting inventory items');
                        });
                    }
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                throw err;
                            });
                        }
                        res.send('Inventory added successfully');
                    });
                });
            } else {
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            throw err;
                        });
                    }
                    res.send('Inventory added successfully');
                });
            }
        });
    });
});

app.get('/view_inventory', (req, res) => {
    let sql = 'SELECT * FROM inventory';
    db.query(sql, (err, inventories) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching inventories');
            return;
        }

        let pending = inventories.length;
        if (pending === 0) {
            res.json([]);
            return;
        }

        inventories.forEach(inv => {
            let sqlItems = 'SELECT * FROM inventoryitem WHERE inventid = ?';
            db.query(sqlItems, [inv.inventid], (err, items) => {
                if (err) {
                    console.error(err);
                    inv.inventoryItems = [];
                } else {
                    inv.inventoryItems = items.map(item => ({
                        item: item.item,
                        count: item.count,
                        wt: item.wt,
                        withcoverwt: item.withcoverwt,
                        coverwt: item.coverwt
                    }));
                }
                pending--;
                if (pending === 0) {
                    res.json(inventories);
                }
            });
        });
    });
});

app.post('/delete_inventory', authorize(['admin']), (req, res) => {
    let inventid = req.body.inventid;
    if (!inventid) {
        res.status(400).send("Missing inventid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        // 1. Fetch record for Trash
        db.query('SELECT * FROM inventory WHERE inventid = ?', [inventid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching inventory:", err);
                    res.status(500).send('Error fetching inventory for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Inventory not found');
                });
            }

            let item = results[0];
            // Trash Fields
            // Field Mapping: field1: inventid, field2: date, field3: dse
            let trashFields = {
                field1: String(item.inventid),
                field2: item.date,
                field3: item.dse
            };

            addToTrash('Inventory', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // 2. Delete Items
                let sqlItems = 'DELETE FROM inventoryitem WHERE inventid = ?';
                db.query(sqlItems, [inventid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error deleting inventory items');
                        });
                    }

                    // 3. Delete Header
                    let sqlInventory = 'DELETE FROM inventory WHERE inventid = ?';
                    db.query(sqlInventory, [inventid], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error deleting inventory');
                            });
                        }
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    throw err;
                                });
                            }
                            res.send('Inventory deleted successfully');
                        });
                    });
                });
            });
        });
    });
});

app.get('/get_last_purchase_id', (req, res) => {
    let sql = 'SELECT purchaseid FROM purchase ORDER BY LENGTH(purchaseid) DESC, purchaseid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching purchase ID');
            return;
        }
        if (results.length > 0) {
            res.json({ purchaseid: results[0].purchaseid });
        } else {
            res.json({ purchaseid: null });
        }
    });
});

app.post('/add_purchase', authorize(['admin']), (req, res) => {
    db.beginTransaction((err) => {
        if (err) { throw err; }

        let purchase = {
            purchaseid: req.body.purchaseid,
            date: req.body.date,
            party: req.body.party
        };

        let sql = 'INSERT INTO purchase SET ?';
        db.query(sql, purchase, (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error(err);
                    res.status(500).send('Error inserting purchase');
                });
            }

            let items = req.body.purchaseItems;
            if (items && items.length > 0) {
                let sqlItems = 'INSERT INTO purchaseitem (purchaseid, item, coverwt, count, mc, wt, percent, pure, withcoverwt, totalamount) VALUES ?';
                let values = items.map(item => [
                    req.body.purchaseid,
                    item.item,
                    item.coverwt,
                    item.count,
                    item.mc,
                    item.wt,
                    item.percent,
                    item.pure,
                    item.withcoverwt,
                    item.totalamount
                ]);

                db.query(sqlItems, [values], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error inserting purchase items');
                        });
                    }
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                throw err;
                            });
                        }
                        res.send('Purchase added successfully');
                    });
                });
            } else {
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            throw err;
                        });
                    }
                    res.send('Purchase added successfully');
                });
            }
        });
    });
});

app.get('/view_purchase', (req, res) => {
    let sql = 'SELECT * FROM purchase';
    db.query(sql, (err, purchases) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching purchases');
            return;
        }

        let pending = purchases.length;
        if (pending === 0) {
            res.json([]);
            return;
        }

        purchases.forEach(pur => {
            let sqlItems = 'SELECT * FROM purchaseitem WHERE purchaseid = ?';
            db.query(sqlItems, [pur.purchaseid], (err, items) => {
                if (err) {
                    console.error(err);
                    pur.purchaseItems = [];
                } else {
                    pur.purchaseItems = items;
                }
                pending--;
                if (pending === 0) {
                    res.json(purchases);
                }
            });
        });
    });
});

app.post('/delete_purchase', authorize(['admin']), (req, res) => {
    let purchaseid = req.body.purchaseid;
    if (!purchaseid) {
        res.status(400).send("Missing purchaseid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        // 1. Fetch record for Trash
        db.query('SELECT * FROM purchase WHERE purchaseid = ?', [purchaseid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching purchase:", err);
                    res.status(500).send('Error fetching purchase for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Purchase not found');
                });
            }

            let item = results[0];
            // Trash Fields
            // Field Mapping: field1: purchaseid, field2: date, field3: party
            let trashFields = {
                field1: String(item.purchaseid),
                field2: item.date,
                field3: item.party
            };

            addToTrash('Purchase', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // 2. Delete Items
                let sqlItems = 'DELETE FROM purchaseitem WHERE purchaseid = ?';
                db.query(sqlItems, [purchaseid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error deleting purchase items');
                        });
                    }

                    // 3. Delete Header
                    let sqlPurchase = 'DELETE FROM purchase WHERE purchaseid = ?';
                    db.query(sqlPurchase, [purchaseid], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error deleting purchase');
                            });
                        }
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    throw err;
                                });
                            }
                            res.send('Purchase deleted successfully');
                        });
                    });
                });
            });
        });
    });
});

app.get('/get_last_puremc_id', (req, res) => {
    let sql = 'SELECT pureid FROM puremc ORDER BY LENGTH(pureid) DESC, pureid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching PureMc ID');
            return;
        }
        if (results.length > 0) {
            res.json({ pureid: results[0].pureid });
        } else {
            res.json({ pureid: null });
        }
    });
});

app.post('/add_puremc', authorize(['admin']), (req, res) => {

    db.beginTransaction((err) => {

        if (err) { throw err; }

        getNextId('puremc', 'pureid', 'PM', (err, nextId) => {

            if (err) {
                console.error(err);
                return res.status(500).send('Error generating ID');
            }

            let puremc = {
                pureid: nextId,
                date: req.body.date,
                dsename: req.body.dsename,
                retailername: req.body.retailername,
                userid: req.body.userid
            };

            let sql = 'INSERT INTO puremc SET ?';

            db.query(sql, puremc, (err, result) => {

                if (err) {
                    return db.rollback(() => {
                        console.error(err);
                        res.status(500).send('Error inserting puremc');
                    });
                }

                let items = req.body.pureMcItems;

                if (items && items.length > 0) {

                    let sqlItems = 'INSERT INTO puremcitem (pureid, item, weight, count, percent, mc, pure, cover, totalwt, totalamount) VALUES ?';

                    let values = items.map(item => [
                        nextId,
                        item.item,
                        item.weight,
                        item.count,
                        item.percent,
                        item.mc,
                        item.pure,
                        item.cover,
                        item.totalwt,
                        item.totalamount
                    ]);

                    db.query(sqlItems, [values], (err, result) => {

                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error inserting puremc items');
                            });
                        }

                        db.commit((err) => {

                            if (err) {
                                return db.rollback(() => { throw err; });
                            }

                            res.send('PureMc added successfully');

                        });

                    });

                } else {

                    db.commit((err) => {

                        if (err) {
                            return db.rollback(() => { throw err; });
                        }

                        res.send('PureMc added successfully');

                    });

                }

            });

        });

    });

});
app.get('/view_puremc', (req, res) => {
    let userid = req.query.userid;
    let sql = 'SELECT * FROM puremc';
    let params = [];

    if (userid) {
        sql += ' WHERE userid = ?';
        params.push(userid);
    }

    db.query(sql, params, (err, puremcs) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching puremcs');
            return;
        }

        let pending = puremcs.length;
        if (pending === 0) {
            res.json([]);
            return;
        }

        puremcs.forEach(pmc => {
            let sqlItems = 'SELECT * FROM puremcitem WHERE pureid = ?';
            db.query(sqlItems, [pmc.pureid], (err, items) => {
                if (err) {
                    console.error(err);
                    pmc.pureMcItems = [];
                } else {
                    // Map DB 'percent' to 'percentage' if needed or rely on GSON alias
                    pmc.pureMcItems = items;
                }
                pending--;
                if (pending === 0) {
                    res.json(puremcs);
                }
            });
        });
    });
});

app.post('/delete_puremc', authorize(['admin']), (req, res) => {
    let pureid = req.body.pureid;
    if (!pureid) {
        res.status(400).send("Missing pureid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        // 1. Fetch record for Trash
        db.query('SELECT * FROM puremc WHERE pureid = ?', [pureid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching puremc:", err);
                    res.status(500).send('Error fetching puremc for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('PureMc not found');
                });
            }

            let item = results[0];
            // Trash Fields
            // Field Mapping: field1: pureid, field2: date, field3: dsename, field4: retailername
            let trashFields = {
                field1: String(item.pureid),
                field2: item.date,
                field3: item.dsename,
                field4: item.retailername
            };

            addToTrash('PureMc', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // 2. Delete Items
                let sqlItems = 'DELETE FROM puremcitem WHERE pureid = ?';
                db.query(sqlItems, [pureid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error deleting puremc items');
                        });
                    }

                    // 3. Delete Header
                    let sqlPureMc = 'DELETE FROM puremc WHERE pureid = ?';
                    db.query(sqlPureMc, [pureid], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error deleting puremc');
                            });
                        }
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    throw err;
                                });
                            }
                            res.send('PureMc deleted successfully');
                        });
                    });
                });
            });
        });
    });
});

app.get('/get_last_payment_id', (req, res) => {
    let sql = 'SELECT payid FROM payment ORDER BY LENGTH(payid) DESC, payid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching payment ID');
            return;
        }
        if (results.length > 0) {
            res.json({ payid: results[0].payid });
        } else {
            res.json({ payid: null });
        }
    });
});

app.post('/add_payment', authorize(['admin']), (req, res) => {
    db.beginTransaction((err) => {
        if (err) { throw err; }

        let payment = {
            payid: req.body.payid,
            date: req.body.date,
            time: req.body.time,
            dsename: req.body.dsename,
            mode: req.body.mode,
            amount: req.body.amount,
            description: req.body.description
        };

        let sql = 'INSERT INTO payment SET ?';
        db.query(sql, payment, (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error(err);
                    res.status(500).send('Error inserting payment');
                });
            }

            // Update DSE Total Balance
            let sqlUpdateDse = 'UPDATE dse SET totalbal = totalbal + ? WHERE dsename = ?';
            db.query(sqlUpdateDse, [payment.amount, payment.dsename], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error(err);
                        res.status(500).send('Error updating DSE balance');
                    });
                }
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            throw err;
                        });
                    }
                    res.send('Payment added and balance updated successfully');
                });
            });
        });
    });
});

app.get('/view_payment', (req, res) => {
    let sql = 'SELECT * FROM payment';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching payments');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_payment', authorize(['admin']), (req, res) => {
    let payid = req.body.payid;
    if (!payid) {
        res.status(400).send("Missing payid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        // 1. Fetch record for Trash
        db.query('SELECT * FROM payment WHERE payid = ?', [payid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching payment:", err);
                    res.status(500).send('Error fetching payment for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Payment not found');
                });
            }

            let item = results[0];
            // Trash Fields
            // Field Mapping: field1: payid, field2: date, field3: dsename, field4: mode, field5: amount, field6: description
            let trashFields = {
                field1: String(item.payid),
                field2: item.date,
                field3: item.dsename,
                field4: item.mode,
                field5: String(item.amount),
                field6: item.description
            };

            addToTrash('Payment', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // Update DSE Balance before deleting
                let sqlUpdateDse = 'UPDATE dse SET totalbal = totalbal - ? WHERE dsename = ?';
                db.query(sqlUpdateDse, [item.amount, item.dsename], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Error updating DSE balance on delete:", err);
                            res.status(500).send('Error updating DSE balance');
                        });
                    }

                    // 2. Delete Record
                    let sqlDelete = 'DELETE FROM payment WHERE payid = ?';
                    db.query(sqlDelete, [payid], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error deleting payment');
                            });
                        }
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    throw err;
                                });
                            }
                            res.send('Payment deleted successfully');
                        });
                    });
                });
            });
        });
    });
});

app.get('/get_last_retailer_payment_id', (req, res) => {
    let sql = 'SELECT payid FROM retailerpayment ORDER BY LENGTH(payid) DESC, payid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching retailer payment ID');
            return;
        }
        if (results.length > 0) {
            res.json({ payid: results[0].payid });
        } else {
            res.json({ payid: null });
        }
    });
});

app.post('/add_retailer_payment', authorize(['admin']), (req, res) => {
    db.beginTransaction((err) => {
        if (err) { throw err; }

        let payment = {
            payid: req.body.payid,
            date: req.body.date,
            time: req.body.time,
            dsename: req.body.dsename,
            retailername: req.body.retailername,
            mode: req.body.mode,
            silverweight: req.body.silverweight || 0,
            pure: req.body.pure || 0,
            purecash: req.body.purecash || 0,
            amount: req.body.amount || 0,
            description: req.body.description,
            userid: req.body.userid // Add user ID
        };

        let sql = 'INSERT INTO retailerpayment SET ?';

        db.query(sql, payment, (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error(err);
                    res.status(500).send('Error inserting retailer payment');
                });
            }

            db.commit((err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Commit Error:", err);
                        res.status(500).send('Error completing transaction');
                    });
                }
                res.send('Retailer Payment added successfully');
            });

            // Update Retailer Balance (Commented out by user)
            /*
            let sqlUpdateRetailer = 'UPDATE retailer SET openbalance = openbalance - ? WHERE retailername = ?';
            db.query(sqlUpdateRetailer, [payment.amount, payment.retailername], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error(err);
                        res.status(500).send('Error updating retailer balance');
                    });
                }

                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            throw err;
                        });
                    }
                    res.send('Retailer Payment added and balance updated successfully');
                });
            });
            */
        });
    });
});


app.get('/view_retailer_payment', (req, res) => {
    let userid = req.query.userid;
    let sql = 'SELECT * FROM retailerpayment';
    let params = [];

    if (userid) {
        sql += ' WHERE userid = ?';
        params.push(userid);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching retailer payments');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_retailer_payment', authorize(['admin']), (req, res) => {
    let payid = req.body.payid;
    if (!payid) {
        res.status(400).send("Missing payid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        // 1. Fetch record for Trash
        db.query('SELECT * FROM retailerpayment WHERE payid = ?', [payid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching retailer payment:", err);
                    res.status(500).send('Error fetching retailer payment for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Retailer Payment not found');
                });
            }

            let item = results[0];
            // Trash Fields
            // Field Mapping: field1: payid, field2: date, field3: retailername, field4: dsename, field5: mode, field6: amount, field7: description
            let trashFields = {
                field1: String(item.payid),
                field2: item.date,
                field3: item.retailername,
                field4: item.dsename,
                field5: item.mode,
                field6: String(item.amount),
                field7: item.description
            };

            addToTrash('RetailerPayment', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // 2. Update Retailer Balance (Revert)
                let sqlUpdateRetailer = 'UPDATE retailer SET openbalance = openbalance + ? WHERE rid = ?';
                db.query(sqlUpdateRetailer, [item.amount, item.rid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Error reverting retailer balance on payment delete:", err);
                            res.status(500).send('Error updating retailer balance');
                        });
                    }

                    // 3. Delete Record
                    let sql = 'DELETE FROM retailerpayment WHERE payid = ?';
                    db.query(sql, [payid], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).send('Error deleting retailer payment');
                            });
                        }
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    throw err;
                                });
                            }
                            res.send('Retailer Payment deleted successfully');
                        });
                    });
                });
            });
        });
    });
});

app.get('/get_last_expense_id', (req, res) => {
    let sql = 'SELECT exid FROM expenses ORDER BY LENGTH(exid) DESC, exid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching expense ID');
            return;
        }
        if (results.length > 0) {
            res.json({ exid: results[0].exid });
        } else {
            res.json({ exid: null });
        }
    });
});

app.post('/add_expense', authorize(['admin']), (req, res) => {
    let expense = {
        exid: req.body.exid,
        date: req.body.date,
        time: req.body.time,
        particulars: req.body.particulars,
        paymode: req.body.paymode,
        amount: req.body.amount,
        pure: req.body.pure,
        description1: req.body.description // Map description to description1
    };

    let sql = 'INSERT INTO expenses SET ?';
    db.query(sql, expense, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error inserting expense: ' + err.message);
            return;
        }
        res.send('Expense added successfully');
    });
});

app.post('/add_partypayout', authorize(['admin']), (req, res) => {
    let payout = {
        parid: req.body.parid,
        date: req.body.date,
        time: req.body.time,
        partyname: req.body.partyname,
        pure: req.body.pure,
        mc: req.body.mc,
        description: req.body.description
    };

    let sql = 'INSERT INTO partypayout SET ?';
    db.query(sql, payout, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error inserting party payout');
            return;
        }
        res.send('Party payout added successfully');
    });
});

app.get('/view_partypayout', (req, res) => {
    let sql = 'SELECT * FROM partypayout';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching party payouts');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_partypayout', authorize(['admin']), (req, res) => {
    let parid = req.body.parid;
    if (!parid) {
        res.status(400).send("Missing parid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        db.query('SELECT * FROM partypayout WHERE parid = ?', [parid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching party payout:", err);
                    res.status(500).send('Error fetching record for trash');
                });
            }

            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Record not found');
                });
            }

            const record = results[0];
            let trashFields = {
                field1: record.parid,
                field2: record.partyname,
                field3: record.date,
                field4: record.time,
                field5: String(record.pure),
                field6: String(record.mc),
                field7: record.description
            };

            addToTrash('PartyPayout', 0, trashFields, 'API', db, (err) => {
                if (err) {
                    console.error("Error adding to Trash:", err);
                }

                db.query('DELETE FROM partypayout WHERE parid = ?', [parid], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Error deleting party payout:", err);
                            res.status(500).send('Error deleting record');
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                throw err;
                            });
                        }
                        res.send('Party payout deleted successfully');
                    });
                });
            });
        });
    });
});

app.get('/view_expense', (req, res) => {
    let sql = 'SELECT * FROM expenses';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching expenses');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_expense', authorize(['admin']), (req, res) => {
    let exid = req.body.exid;
    if (!exid) {
        res.status(400).send("Missing exid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        // 1. Fetch record for Trash
        db.query('SELECT * FROM expenses WHERE exid = ?', [exid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching expense:", err);
                    res.status(500).send('Error fetching expense for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Expense not found');
                });
            }

            let item = results[0];
            // Trash Fields
            // Field Mapping: field1: exid, field2: date, field3: particulars, field4: amount, field5: description1, field6: time
            let trashFields = {
                field1: String(item.exid),
                field2: item.date,
                field3: item.particulars,
                field4: String(item.amount),
                field5: item.description1,
                field6: item.time
            };

            addToTrash('Expenses', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                // 2. Delete Record
                let sql = 'DELETE FROM expenses WHERE exid = ?';
                db.query(sql, [exid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error deleting expense');
                        });
                    }
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                throw err;
                            });
                        }
                        res.send('Expense deleted successfully');
                    });
                });
            });
        });
    });
});

// Endpoint to fetch particulars for spinner
app.get('/get_particulars', (req, res) => {
    let sql = 'SELECT DISTINCT particulars FROM expenses ORDER BY particulars';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching particulars');
            return;
        }
        res.json(results);
    });
});

app.post('/add_particular', authorize(['admin']), (req, res) => {

    res.send('Particular added (logic handled by adding expense)');
});

// Party Endpoints
app.get('/get_last_party_id', (req, res) => {
    let sql = 'SELECT pid FROM party ORDER BY LENGTH(pid) DESC, pid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching Party ID');
            return;
        }
        if (results.length > 0) {
            res.json({ pid: results[0].pid });
        } else {
            res.json({ pid: null });
        }
    });
});

app.post('/add_party', authorize(['admin']), (req, res) => {
    let partyname = req.body.partyname;
    if (!partyname) return res.status(400).send('Party Name is required');

    // Case-insensitive check for existing party
    db.query('SELECT * FROM party WHERE LOWER(partyname) = LOWER(?)', [partyname], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error checking party'); return; }
        if (results.length > 0) {
            return res.status(409).send('Party Name already exists');
        }

        let party = {
            pid: req.body.pid,
            partyname: req.body.partyname,
            mobile: req.body.mobile,
            pure: req.body.pure,
            makecharge: req.body.makecharge
        };

        let sql = 'INSERT INTO party SET ?';
        db.query(sql, party, (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error inserting party: ' + err.message);
                return;
            }
            res.send('Party added successfully');
        });
    });
});

app.get('/view_parties', (req, res) => {
    let sql = 'SELECT * FROM party';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching parties');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_party', authorize(['admin']), (req, res) => {
    let pid = req.body.pid;
    if (!pid) {
        res.status(400).send("Missing pid");
        return;
    }

    db.beginTransaction((err) => {
        if (err) { throw err; }

        db.query('SELECT * FROM party WHERE pid = ?', [pid], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error fetching party:", err);
                    res.status(500).send('Error fetching party for trash');
                });
            }
            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).send('Party not found');
                });
            }

            let item = results[0];
            let trashFields = {
                field1: String(item.pid),
                field2: item.partyname,
                field3: item.mobile,
                field4: String(item.pure),
                field5: String(item.makecharge)
            };

            addToTrash('Party', 0, trashFields, 'API', db, (err) => {
                if (err) console.error("Error adding to Trash:", err);

                let sqlDelete = 'DELETE FROM party WHERE pid = ?';
                db.query(sqlDelete, [pid], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err);
                            res.status(500).send('Error deleting party');
                        });
                    }
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                throw err;
                            });
                        }
                        res.send('Party deleted successfully');
                    });
                });
            });
        });
    });
});


app.get('/get_last_petrol_id', (req, res) => {
    let sql = 'SELECT petid FROM petrolexpenses ORDER BY LENGTH(petid) DESC, petid DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching Petrol ID');
            return;
        }
        if (results.length > 0) {
            res.json({ petid: results[0].petid });
        } else {
            res.json({ petid: null });
        }
    });
});

app.post('/add_petrol', authorize(['admin']), (req, res) => {
    let petrol = {
        petid: req.body.petid,
        date: req.body.date,
        time: req.body.time,
        dsename: req.body.dsename,
        amount: req.body.amount,
        description: req.body.description,
        userid: req.body.userid // Add user ID
    };

    let sql = 'INSERT INTO petrolexpenses SET ?';
    db.query(sql, petrol, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error inserting petrol expense');
            return;
        }
        res.send('Petrol expense added successfully');
    });
});

app.get('/view_petrol', (req, res) => {
    let userid = req.query.userid;
    let sql = 'SELECT * FROM petrolexpenses';
    let params = [];

    if (userid) {
        sql += ' WHERE userid = ?';
        params.push(userid);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching petrol expenses');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_petrol', authorize(['admin']), (req, res) => {
    let petid = req.body.petid;
    // 1. Fetch record
    db.query('SELECT * FROM petrolexpenses WHERE petid = ?', [petid], (err, results) => {
        if (err) { console.error(err); res.status(500).send('Error finding petrol record'); return; }
        if (results.length === 0) { res.status(404).send('Record not found'); return; }

        let item = results[0];
        // 2. Add to Trash
        // Field Mapping: field1: petid, field2: date, field3: dsename, field4: amount, field5: description
        let trashFields = {
            field1: item.petid,
            field2: item.date,
            field3: item.dsename,
            field4: String(item.amount),
            field5: item.description
        };

        addToTrash('Petrol', 0, trashFields, 'API', db, (err) => {
            if (err) console.error("Error adding to trash:", err); // Log but continue delete

            // 3. Delete
            let sql = 'DELETE FROM petrolexpenses WHERE petid = ?';
            db.query(sql, [petid], (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error deleting petrol expense');
                    return;
                }
                res.send('Petrol expense deleted successfully');
            });
        });
    });
});

// Helper to add record to trash
function addToTrash(tableName, recordId, fields, deletedBy, dbConnection, callback) {
    let sql = 'INSERT INTO trashtable (tableName, recordId, field1, field2, field3, field4, field5, field6, field7, deletedBy, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
    let params = [
        tableName,
        recordId || 0,
        fields.field1 || null,
        fields.field2 || null,
        fields.field3 || null,
        fields.field4 || null,
        fields.field5 || null,
        fields.field6 || null,
        fields.field7 || null,
        deletedBy || 'API'
    ];
    // Use provided connection or global db
    (dbConnection || db).query(sql, params, (err, result) => {
        if (callback) callback(err, result);
    });
}

// Trash Endpoints
app.get('/get_trash_tables', (req, res) => {
    let sql = 'SELECT DISTINCT tableName FROM TrashTable';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching trash tables');
            return;
        }
        res.json(results);
    });
});

app.get('/view_trash', (req, res) => {
    let tableName = req.query.tableName;
    let sql = 'SELECT * FROM trashtable';
    let params = [];
    if (tableName && tableName !== 'All Tables') {
        sql += ' WHERE tableName = ?';
        params.push(tableName);
    }
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching trash records');
            return;
        }
        res.json(results);
    });
});

app.post('/delete_trash', authorize(['admin']), (req, res) => {
    let sql = 'DELETE FROM TrashTable WHERE trashId = ?';
    db.query(sql, [req.body.trashId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error deleting trash record');
            return;
        }
        res.send('Trash record deleted successfully');
    });
});


// Advanced Search Endpoint
app.post('/search_transactions', (req, res) => {
    const { type, filters } = req.body;

    // Map types to tables and alias configurations
    const searchConfig = {
        'sales': {
            table: 'sales',
            alias: 's',
            dateField: 'date',
            // fields to select
            select: 's.*',
            // optional joins or specific logic can be handled below
        },
        'payment': {
            table: 'payment',
            alias: 'p',
            dateField: 'date',
            select: 'p.*'
        },
        'retailer_payment': {
            table: 'retailerpayment',
            alias: 'rp',
            dateField: 'date',
            select: 'rp.*'
        },
        'expenses': {
            table: 'expenses',
            alias: 'e',
            dateField: 'date',
            select: 'e.*'
        },
        'petrol': {
            table: 'petrolexpenses',
            alias: 'pe',
            dateField: 'date',
            select: 'pe.*'
        },
        'stock': {
            table: 'stock',
            alias: 'st',
            dateField: 'date',
            select: 'st.*'
        },
        'inventory': {
            table: 'inventory',
            alias: 'inv',
            dateField: 'date',
            select: 'inv.*'
        },
        'purchase': {
            table: 'purchase',
            alias: 'pur',
            dateField: 'date',
            select: 'pur.*'
        },
        'puremc': {
            table: 'puremc',
            alias: 'pm',
            dateField: 'date',
            select: 'pm.*'
        },
        'party_payout': {
            table: 'partypayout',
            alias: 'pp',
            dateField: 'date',
            select: 'pp.*'
        }
    };

    const config = searchConfig[type];
    const userRole = req.headers['x-user-role'] || 'admin';

    if (!config) {
        return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // RBAC: office role cannot search 'purchase'
    if (userRole === 'office' && type === 'purchase') {
        return res.status(403).json({ error: 'Unauthorized: Office role cannot access Purchase data' });
    }

    let sql = `SELECT ${config.select} FROM ${config.table} ${config.alias}`;
    let whereClauses = [];
    let params = [];

    // RBAC: office role can only see 'Office' paymode in expenses
    if (userRole === 'office' && type === 'expenses') {
        whereClauses.push(`${config.alias}.paymode = ?`);
        params.push('Office');
    }

    // Date Range Filter (Normalization for mixed formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
    const dbDateExpr = `DATE(COALESCE(
        STR_TO_DATE(\`${config.alias}\`.\`${config.dateField}\`, '%d/%m/%Y'),
        STR_TO_DATE(\`${config.alias}\`.\`${config.dateField}\`, '%Y-%m-%d'),
        STR_TO_DATE(\`${config.alias}\`.\`${config.dateField}\`, '%d-%m-%Y')
    ))`;

    if (filters.dateFrom) {
        whereClauses.push(`${dbDateExpr} >= CAST(? AS DATE)`);
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        whereClauses.push(`${dbDateExpr} <= CAST(? AS DATE)`);
        params.push(filters.dateTo);
    }

    // Common Filters (DSE, Retailer) - check if table has these columns
    if (filters.dse && ['sales', 'payment', 'retailer_payment', 'stock', 'puremc', 'petrol', 'inventory'].includes(type)) {
        // Some tables use 'dse' others 'dsename'
        let col = (type === 'sales' || type === 'stock' || type === 'inventory') ? 'dse' : 'dsename';
        whereClauses.push(`${config.alias}.${col} LIKE ?`);
        params.push(`%${filters.dse}%`);
    }

    if (filters.retailer && ['sales', 'retailer_payment', 'sales', 'puremc'].includes(type)) {
        // Some tables use 'retailer' others 'retailername'
        let col = (type === 'sales') ? 'retailer' : 'retailername';
        whereClauses.push(`${config.alias}.${col} LIKE ?`);
        params.push(`%${filters.retailer}%`);
    }

    // Amount Range Filter (only for tables with amount/total)
    if (filters.amountMin || filters.amountMax) {
        let amtCol = null;
        if (type === 'sales') amtCol = 'finaltotal';
        else if (['payment', 'retailer_payment', 'expenses', 'petrol'].includes(type)) amtCol = 'amount';

        if (amtCol) {
            if (filters.amountMin) {
                whereClauses.push(`${config.alias}.${amtCol} >= ?`);
                params.push(filters.amountMin);
            }
            if (filters.amountMax) {
                whereClauses.push(`${config.alias}.${amtCol} <= ?`);
                params.push(filters.amountMax);
            }
        }
    }

    // Payment Mode Filter (Specialized logic for weight-based types)
    if (filters.payMode) {
        if (type === 'retailer_payment') {
            if (filters.payMode === 'Silver') {
                whereClauses.push(`${config.alias}.silverweight > 0`);
            } else if (filters.payMode === 'Pure') {
                whereClauses.push(`${config.alias}.pure > 0`);
            } else if (filters.payMode === 'Pure Cash') {
                whereClauses.push(`(${config.alias}.mode = 'Pure Cash' OR ${config.alias}.purecash > 0)`);
            } else {
                whereClauses.push(`${config.alias}.mode = ?`);
                params.push(filters.payMode);
            }
        } else if (['payment', 'expenses'].includes(type)) {
            let col = (type === 'expenses') ? 'paymode' : 'mode';
            whereClauses.push(`${config.alias}.${col} = ?`);
            params.push(filters.payMode);
        }
    }

    // Party Filter for Purchase and Party Payout
    if ((type === 'purchase' || type === 'party_payout') && filters.party) {
        let col = (type === 'party_payout') ? 'partyname' : 'party';
        whereClauses.push(`\`${config.alias}\`.\`${col}\` LIKE ?`);
        params.push(`%${filters.party}%`);
    }

    // user ID Filter (Global if transmitted)
    if (filters.userid) {
        // Check if table has userid column (most do based on schema)
        // Schema check: sales(yes), retailerpayment(yes), petrolexpenses(yes), puremc(yes)
        // others might not.
        const tablesWithuser = ['sales', 'retailerpayment', 'petrolexpenses', 'puremc'];
        if (tablesWithuser.includes(type)) {
            whereClauses.push(`${config.alias}.userid = ?`);
            params.push(filters.userid);
        }
    }

    // Item Name Filter (Requires JOIN for Sales, Stock, Purchase, PureMC, Inventory)
    if (filters.itemName) {
        if (type === 'sales') {
            // JOIN salesitem
            sql += ` JOIN salesitem si ON ${config.alias}.invno = si.invno`;
            whereClauses.push(`si.item LIKE ?`);
            params.push(`%${filters.itemName}%`);
            // Add DISTINCT to avoid duplicate headers
            sql = sql.replace('SELECT s.*', 'SELECT DISTINCT s.*');
        } else if (type === 'stock') {
            sql += ` JOIN stocksitem sti ON ${config.alias}.stockid = sti.stockid`;
            whereClauses.push(`sti.item LIKE ?`);
            params.push(`%${filters.itemName}%`);
            sql = sql.replace('SELECT st.*', 'SELECT DISTINCT st.*');
        } else if (type === 'purchase') {
            sql += ` JOIN purchaseitem pi ON ${config.alias}.purchaseid = pi.purchaseid`;
            whereClauses.push(`pi.item LIKE ?`);
            params.push(`%${filters.itemName}%`);
            sql = sql.replace('SELECT pur.*', 'SELECT DISTINCT pur.*');
        } else if (type === 'puremc') {
            sql += ` JOIN puremcitem pmi ON ${config.alias}.pureid = pmi.pureid`;
            whereClauses.push(`pmi.item LIKE ?`);
            params.push(`%${filters.itemName}%`);
            sql = sql.replace('SELECT pm.*', 'SELECT DISTINCT pm.*');
        } else if (type === 'inventory') {
            sql += ` JOIN inventoryitem ii ON ${config.alias}.inventid = ii.inventid`;
            whereClauses.push(`ii.item LIKE ?`);
            params.push(`%${filters.itemName}%`);
            sql = sql.replace('SELECT inv.*', 'SELECT DISTINCT inv.*');
        }
    }

    if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add Ordering (Date DESC usually)
    sql += ` ORDER BY ${config.alias}.${config.dateField} DESC`;

    console.log("Search SQL:", sql, params);

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Database search error' });
            return;
        }

        // If it's sales order to show items, we might need to fetch items for these results
        // Or we can let the frontend fetch details on demand. 
        // For 'sales', 'stock' dashboard usually shows items inline.
        // Let's reuse the logic to fetch items if it's sales/stock/etc and result count is reasonable

        if (type === 'sales' && results.length > 0) {
            // Fetch items for these sales
            const invnos = results.map(r => r.invno);
            if (invnos.length === 0) return res.json([]);

            const sqlItems = `SELECT * FROM salesitem WHERE invno IN (?)`;

            db.query(sqlItems, [invnos], (err, items) => {
                if (err) { console.error(err); return res.json(results); }

                results.forEach(row => {
                    row.items = items.filter(i => i.invno === row.invno).map(i => ({
                        item: i.item,
                        weight: i.weight,
                        count: i.count,
                        rate: i.rate,
                        total: i.total
                    }));
                    // Keep legacy support if needed, but standardize on 'items'
                    row.saleItems = row.items;
                });
                fs.appendFileSync('search_debug.log', `Final Results to send: ${results.length}\n`);
                res.json(results);
            });
        } else if (type === 'stock' && results.length > 0) {
            const stockids = results.map(r => r.stockid);
            if (stockids.length === 0) return res.json([]);

            const sqlItems = `SELECT * FROM stocksitem WHERE stockid IN (?)`;

            db.query(sqlItems, [stockids], (err, items) => {
                if (err) { console.error(err); return res.json(results); }

                results.forEach(row => {
                    row.items = items.filter(i => i.stockid === row.stockid).map(i => ({
                        item: i.item,
                        weight: i.wt,
                        count: i.count,
                        cover: i.withcoverwt
                    }));
                    row.stockItems = row.items;
                });
                
                // RBAC Redaction for 'office' role
                if (userRole === 'office') {
                    results.forEach(row => {
                        if (row.party) row.party = "Restricted";
                        if (row.partyname) row.partyname = "Restricted";
                    });
                }
                res.json(results);
            });
        } else if (type === 'purchase' && results.length > 0) {
            const purchaseids = results.map(r => r.purchaseid);
            if (purchaseids.length === 0) return res.json([]);

            const sqlItems = `SELECT * FROM purchaseitem WHERE purchaseid IN (?)`;

            db.query(sqlItems, [purchaseids], (err, items) => {
                if (err) { console.error(err); return res.json(results); }

                results.forEach(row => {
                    row.items = items.filter(i => i.purchaseid === row.purchaseid).map(i => ({
                        item: i.item,
                        weight: i.wt,
                        count: i.count,
                        mc: i.mc,
                        percent: i.percent,
                        pure: i.pure,
                        totalamount: i.totalamount
                    }));
                    row.purchaseItems = row.items;
                });
                res.json(results);
            });
        } else if (type === 'puremc' && results.length > 0) {
            const pureids = results.map(r => r.pureid);
            if (pureids.length === 0) return res.json([]);

            const sqlItems = `SELECT * FROM puremcitem WHERE pureid IN (?)`;

            db.query(sqlItems, [pureids], (err, items) => {
                if (err) { console.error(err); return res.json(results); }

                results.forEach(row => {
                    row.items = items.filter(i => i.pureid === row.pureid).map(i => ({
                        item: i.item,
                        weight: i.weight,
                        count: i.count,
                        mc: i.mc,
                        percent: i.percent,
                        pure: i.pure,
                        total: i.totalamount
                    }));
                });
                res.json(results);
            });
        } else if (type === 'inventory' && results.length > 0) {
            const inventids = results.map(r => r.inventid);
            if (inventids.length === 0) return res.json([]);

            const sqlItems = `SELECT * FROM inventoryitem WHERE inventid IN (?)`;

            db.query(sqlItems, [inventids], (err, items) => {
                if (err) { console.error(err); return res.json(results); }

                results.forEach(row => {
                    row.items = items.filter(i => i.inventid === row.inventid).map(i => ({
                        item: i.item,
                        weight: i.wt,
                        count: i.count,
                        cover: i.withcoverwt
                    }));
                });
                res.json(results);
            });
        } else {
            res.json(results);
        }
    });
});

// Get DSE List for dropdowns
app.get('/get_dse_list', (req, res) => {
    const sql = 'SELECT DISTINCT dsename FROM dse ORDER BY dsename';
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('Error fetching DSE list:', err);
            return res.status(500).json({ error: 'Error fetching DSE list' });
        }
        res.json(rows.map(r => r.dsename).filter(v => v));
    });
});

// Autocomplete Endpoint
app.get('/get_autocomplete_data', (req, res) => {
    const queries = {
        dse: 'SELECT DISTINCT dsename FROM dse ORDER BY dsename',
        retailer: 'SELECT DISTINCT retailername FROM retailer ORDER BY retailername',
        party: 'SELECT DISTINCT partyname FROM party ORDER BY partyname',
        items: 'SELECT DISTINCT itemname FROM item ORDER BY itemname',
        district: 'SELECT DISTINCT district FROM retailer WHERE district IS NOT NULL AND district != "" ORDER BY district'
    };

    const results = {};
    let pending = Object.keys(queries).length;
    let failed = false;

    Object.keys(queries).forEach(key => {
        db.query(queries[key], (err, rows) => {
            if (failed) return;
            if (err) {
                console.error(`Error fetching ${key}:`, err);
                failed = true;
                return res.status(500).json({ error: `Error fetching ${key}` });
            }
            results[key] = rows.map(r => Object.values(r)[0]).filter(v => v);

            pending--;
            if (pending === 0) {
                res.json(results);
            }
        });
    });
});


app.post('/update_dse', authorize(['admin']), (req, res) => {
  const { did, mobile, email, openbalance, totalbal } = req.body;
  const sql = 'UPDATE dse SET mobile=?, email=?, openbalance=?, totalbal=? WHERE did=?';
  db.query(sql, [mobile, email, openbalance, totalbal, did], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'DSE updated successfully' });
  });
});

// 17 march 

//comment existing /add_sale post code in BackendAPI use below code:
app.post('/add_sale', authorize(['admin']), (req, res) => {
    db.beginTransaction((err) => {
        if (err) { throw err; }

        console.log("Receiving sale data:", req.body);

        let sale = {
            invno: req.body.invno,
            date: req.body.date,
            dse: req.body.dse,
            retailer: req.body.retailer,
            rid: req.body.rid, 
            discount: Number(req.body.discount) || 0,
            finaltotal: Number(req.body.finaltotal) || 0,
            userid: req.body.userid
        };

        console.log("Mapped sale object for DB:", sale);

        let sqlSale = `
            INSERT INTO sales 
            (invno, date, dse, retailer, discount, finaltotal, userid) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sqlSale, 
            [sale.invno, sale.date, sale.dse, sale.retailer, sale.discount, sale.finaltotal, sale.userid], 
            (err, result) => {

            if (err) {
                return db.rollback(() => {
                    console.error("Error inserting sale:", err);
                    res.status(500).send('Error inserting sale: ' + err.message);
                });
            }

            let items = req.body.saleItems;

            if (items && items.length > 0) {
                let sqlItems = `
                    INSERT INTO salesitem 
                    (invno, item, weight, count, rate, coverwt, total, totalweight) 
                    VALUES ?
                `;

                let values = items.map(item => [
                    req.body.invno,
                    item.product,
                    item.weight,
                    item.count,
                    item.rate,
                    item.cover,
                    item.total,
                    item.totalweight
                ]);

                db.query(sqlItems, [values], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Error inserting sale items:", err);
                            res.status(500).send('Error inserting sale items');
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => { throw err; });
                        }
                        res.send('Sale added successfully');
                    });
                });

            } else {
                // No items case
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => { throw err; });
                    }
                    res.send('Sale added successfully (no items)');
                });
            }
        });
    });
});




///////Reports////////---


app.get('/report_dse_ledger', (req, res) => {
    let { dse, fromDate, toDate } = req.query;

    if (!dse) {
        return res.status(400).json({ error: "Missing dse parameter" });
    }

    if (!fromDate) fromDate = '1970-01-01';
    if (!toDate) toDate = '2099-12-31';

    let dseSearch = dse.trim().toLowerCase();

    // 1. Get Opening Balance
    let sqlDse = `SELECT IFNULL(openbalance, 0) AS openbalance FROM dse WHERE TRIM(LOWER(dsename)) = ? LIMIT 1`;
    db.query(sqlDse, [dseSearch], (err, dseResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        let openBalance = dseResults.length > 0 ? parseFloat(dseResults[0].openbalance) : 0;

        // 2. Get Transaction Data grouped by Date
        let sqlData = `
            SELECT 
                DATE_FORMAT(COALESCE(STR_TO_DATE(t.date_val, '%d-%m-%Y'), STR_TO_DATE(t.date_val, '%Y-%m-%d')), '%Y-%m-%d') AS date,
                IFNULL(SUM(t.payin), 0) AS payin,
                IFNULL(SUM(t.payout), 0) AS payout,
                IFNULL(SUM(t.petrol), 0) AS petrol
            FROM (
                SELECT dsename, date AS date_val, 
                       (IF(LOWER(IFNULL(mode, ''))='cash', IFNULL(amount, 0), 0) + IFNULL(purecash, 0)) AS payin, 
                       0 AS payout, 
                       0 AS petrol 
                FROM retailerpayment
                
                UNION ALL
                
                SELECT dsename, date AS date_val, 
                       0 AS payin, 
                       IFNULL(amount, 0) AS payout, 
                       0 AS petrol 
                FROM payment
                
                UNION ALL
                
                SELECT dsename, date AS date_val, 
                       0 AS payin, 
                       0 AS payout, 
                       IFNULL(amount, 0) AS petrol 
                FROM petrolexpenses
            ) t
            WHERE TRIM(LOWER(t.dsename)) = ?
              AND t.date_val IS NOT NULL
            GROUP BY date
            ORDER BY date ASC
        `;

        db.query(sqlData, [dseSearch], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
            }

            let balance = openBalance;
            let output = [];

            // Calculate Opening up to fromDate
            for (let row of results) {
                if (row.date < fromDate) {
                    balance += parseFloat(row.payin) - parseFloat(row.payout) - parseFloat(row.petrol);
                }
            }

            output.push({
                date: "Opening",
                payin: "-",
                payout: "-",
                petrol: "-",
                balance: balance
            });

            // Process within date range
            for (let row of results) {
                if (row.date >= fromDate && row.date <= toDate) {
                    let inAmt = parseFloat(row.payin) || 0;
                    let outAmt = parseFloat(row.payout) || 0;
                    let petAmt = parseFloat(row.petrol) || 0;

                    balance += (inAmt - outAmt - petAmt);
                    
                    output.push({
                        date: row.date,
                        payin: inAmt,
                        payout: outAmt,
                        petrol: petAmt,
                        balance: balance
                    });
                }
            }

            res.json(output);
        });
    });
});

app.get('/report_retailer_ledger', (req, res) => {
    let { retailer, fromDate, toDate } = req.query;

    if (!retailer) {
        return res.status(400).json({ error: "Missing retailer parameter" });
    }

    // Normalized dates for calculation
    const queryFromDate = fromDate || '1970-01-01';
    const queryToDate = toDate || '2099-12-31';

    // 1. Get Opening Balance from Retailer table
    let sqlRetailer = `SELECT IFNULL(openbalance, 0) AS openbalance, IFNULL(openpure, 0) AS openpure FROM retailer WHERE TRIM(LOWER(retailername)) = ? LIMIT 1`;
    db.query(sqlRetailer, [retailer.trim().toLowerCase()], (err, retResults) => {
        if (err) { console.error(err); return res.status(500).send("Database error"); }

        let startCash = retResults.length > 0 ? parseFloat(retResults[0].openbalance) : 0;
        let startPure = retResults.length > 0 ? parseFloat(retResults[0].openpure) : 0;

        // 2. Get all transactions
        let sqlData = `
            SELECT * FROM (
                /* 1. Sales */
                SELECT 
                    invno AS id, 
                    date AS raw_date,
                    'Sale' AS type,
                    finaltotal AS saleAmt,
                    0 AS salePure,
                    0 AS recCash,
                    0 AS recPure,
                    0 AS pureCash,
                    '' AS mode,
                    0 AS silver
                FROM sales 
                WHERE TRIM(LOWER(retailer)) = ?

                UNION ALL

                /* 2. Pure MC (Summed per pureid) */
                SELECT 
                    pm.pureid AS id,
                    pm.date AS raw_date,
                    'PureMC' AS type,
                    IFNULL(SUM(pi.totalamount), 0) AS saleAmt,
                    IFNULL(SUM(pi.weight), 0) AS salePure,
                    0 AS recCash,
                    0 AS recPure,
                    0 AS pureCash,
                    '' AS mode,
                    0 AS silver
                FROM puremc pm
                JOIN puremcitem pi ON pm.pureid = pi.pureid
                WHERE TRIM(LOWER(pm.retailername)) = ?
                GROUP BY pm.pureid

                UNION ALL

                /* 3. Payments In */
                SELECT 
                    payid AS id,
                    date AS raw_date,
                    'Payment-In' AS type,
                    0 AS saleAmt,
                    0 AS salePure,
                    IFNULL(amount, 0) AS recCash,
                    IFNULL(pure, 0) AS recPure,
                    IFNULL(purecash, 0) AS pureCash,
                    mode,
                    IFNULL(silverweight, 0) AS silver
                FROM retailerpayment
                WHERE TRIM(LOWER(retailername)) = ?
            ) transactions
            ORDER BY 
                CASE 
                    WHEN raw_date LIKE '%/%/%' THEN STR_TO_DATE(raw_date, '%d/%m/%Y')
                    WHEN raw_date LIKE '%-%-%' AND LENGTH(raw_date) > 10 THEN STR_TO_DATE(raw_date, '%d-%m-%Y')
                    ELSE STR_TO_DATE(raw_date, '%Y-%m-%d')
                END ASC
        `;

        db.query(sqlData, [retailer.trim().toLowerCase(), retailer.trim().toLowerCase(), retailer.trim().toLowerCase()], (err, results) => {
            if (err) { console.error(err); return res.status(500).send("Database error"); }

            let runningCash = startCash;
            let runningPure = startPure;
            let ledger = [];

            results.forEach(row => {
                // Parse date for comparison
                let dateObj;
                if (row.raw_date.includes('/')) {
                    let parts = row.raw_date.split('/');
                    dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                    dateObj = new Date(row.raw_date);
                }
                let normDate = dateObj.toISOString().split('T')[0];

                // Calculate balances
                runningCash += parseFloat(row.saleAmt) - parseFloat(row.recCash);
                runningPure += parseFloat(row.salePure) - parseFloat(row.recPure);

                // Add to ledger if in range
                if (normDate >= queryFromDate && normDate <= queryToDate) {
                    ledger.push({
                        date: row.raw_date,
                        type: row.type,
                        id: row.id,
                        saleAmt: row.saleAmt,
                        salePure: row.salePure,
                        recCash: row.recCash,
                        recPure: row.recPure,
                        pureCash: row.pureCash,
                        mode: row.mode,
                        silver: row.silver,
                        balDue: runningCash,
                        balPure: runningPure
                    });
                }
            });

            // Calculate "Opening Balance" as the state just before the first row in range
            let finalBalDue = runningCash;
            let finalBalPure = runningPure;
            
            // To get the starting balance for the range, we can trace back or just use the first row's previous state
            let displayOpeningCash = startCash;
            let displayOpeningPure = startPure;
            
            if (ledger.length > 0) {
                // The balance before the first matching row
                displayOpeningCash = ledger[0].balDue - (ledger[0].saleAmt - ledger[0].recCash);
                displayOpeningPure = ledger[0].balPure - (ledger[0].salePure - ledger[0].recPure);
            } else if (results.length > 0) {
                 // If no results in range, find the state after all results prior to fromDate
                 // This is already accounted for in the loop above by runningCash/runningPure if we had stopped at toDate
                 // But actually, if ledger is empty, it means either all are before or all are after.
                 // Let's simplify: the "Opening Balance" for the view is start + all transactions before queryFromDate.
                 let tempCash = startCash;
                 let tempPure = startPure;
                 results.forEach(r => {
                     let dObj = r.raw_date.includes('/') ? new Date(r.raw_date.split('/').reverse().join('-')) : new Date(r.raw_date);
                     if (dObj.toISOString().split('T')[0] < queryFromDate) {
                         tempCash += parseFloat(r.saleAmt) - parseFloat(r.recCash);
                         tempPure += parseFloat(r.salePure) - parseFloat(r.recPure);
                     }
                 });
                 displayOpeningCash = tempCash;
                 displayOpeningPure = tempPure;
            }

            // Insert Opening Balance at the top
            ledger.unshift({
                date: fromDate || 'Start',
                type: 'Opening',
                id: '-',
                saleAmt: 0,
                salePure: 0,
                recCash: 0,
                recPure: 0,
                pureCash: 0,
                mode: '-',
                silver: 0,
                balDue: displayOpeningCash,
                balPure: displayOpeningPure
            });

            res.json(ledger);
        });
    });
});

app.get('/report_retailer_analysis', (req, res) => {
    const { dse, district, retailer } = req.query;
    let whereClauses = [];
    let params = [];

    if (dse) { whereClauses.push("r.dsename = ?"); params.push(dse); }
    if (district) { whereClauses.push("r.district = ?"); params.push(district); }
    if (retailer) { whereClauses.push("r.retailername = ?"); params.push(retailer); }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
        SELECT 
            r.retailername,
            r.dsename,
            r.district,
            (IFNULL(r.openbalance, 0) + IFNULL(s.total_sales, 0) + IFNULL(pmi.total_puremc_amt, 0) - IFNULL(rp.total_paid_amt, 0)) AS balance_due,
            (IFNULL(r.openpure, 0) + IFNULL(pmi.total_pure_wt, 0) - IFNULL(rp.total_paid_pure, 0)) AS bal_pure
        FROM retailer r
        LEFT JOIN (
            SELECT retailer, SUM(IFNULL(finaltotal, 0)) AS total_sales FROM sales GROUP BY retailer
        ) s ON r.retailername = s.retailer
        LEFT JOIN (
            SELECT pm.retailername, SUM(IFNULL(pmi.totalamount, 0)) AS total_puremc_amt, SUM(IFNULL(pmi.pure, 0)) AS total_pure_wt
            FROM puremcitem pmi
            JOIN puremc pm ON pmi.pureid = pm.pureid
            GROUP BY pm.retailername
        ) pmi ON r.retailername = pmi.retailername
        LEFT JOIN (
            SELECT retailername, SUM(IFNULL(amount, 0)) AS total_paid_amt, SUM(IFNULL(pure, 0)) AS total_paid_pure 
            FROM retailerpayment GROUP BY retailername
        ) rp ON r.retailername = rp.retailername
        ${whereStr}
        GROUP BY r.retailername, r.dsename, r.district, r.openbalance, r.openpure
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error in Retailer Analysis:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});


// Retailer Balance Report
app.get('/report_retailer_balance', (req, res) => {
    const { dse } = req.query;
    let whereClauses = [];
    let params = [];

    if (dse) { 
        whereClauses.push("r.dsename = ?"); 
        params.push(dse); 
    }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
        SELECT 
            r.dsename,
            r.retailername,
            (IFNULL(r.openbalance, 0) + IFNULL(s.total_sales, 0) + IFNULL(pmi.total_puremc_amt, 0) - IFNULL(rp.total_paid_amt, 0)) AS bal_cash,
            (IFNULL(r.openpure, 0) + IFNULL(pmi.total_pure_wt, 0) - IFNULL(rp.total_paid_pure, 0)) AS bal_pure
        FROM retailer r
        LEFT JOIN (
            SELECT retailer, SUM(IFNULL(finaltotal, 0)) AS total_sales FROM sales GROUP BY retailer
        ) s ON r.retailername = s.retailer
        LEFT JOIN (
            SELECT pm.retailername, SUM(IFNULL(pmi.totalamount, 0)) AS total_puremc_amt, SUM(IFNULL(pmi.pure, 0)) AS total_pure_wt
            FROM puremcitem pmi
            JOIN puremc pm ON pmi.pureid = pm.pureid
            GROUP BY pm.retailername
        ) pmi ON r.retailername = pmi.retailername
        LEFT JOIN (
            SELECT retailername, SUM(IFNULL(amount, 0)) AS total_paid_amt, SUM(IFNULL(pure, 0)) AS total_paid_pure 
            FROM retailerpayment GROUP BY retailername
        ) rp ON r.retailername = rp.retailername
        ${whereStr}
        GROUP BY r.retailername, r.dsename, r.openbalance, r.openpure
        ORDER BY r.dsename, r.retailername
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error in Retailer Balance:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});


// DSE Sale Report
app.get('/report_dse_sale', (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ error: "Missing date range" });
    }

    const sql = `
        SELECT 
            t.dsename,
            ROUND(IFNULL(SUM(t.weight), 0), 3) AS total_weight,
            IFNULL(SUM(t.payin), 0) AS total_payin,
            ROUND(IFNULL(SUM(t.pure), 0), 3) AS total_pure
        FROM (
            -- Sales Weight
            SELECT s.dse AS dsename, SUM(IFNULL(si.weight, 0)) AS weight, 0 AS payin, 0 AS pure
            FROM salesitem si
            JOIN sales s ON si.invno = s.invno
            WHERE STR_TO_DATE(s.date, '%d/%m/%Y') BETWEEN ? AND ?
            GROUP BY s.dse

            UNION ALL

            -- Pure MC Weight
            SELECT pm.dsename, SUM(IFNULL(pmi.weight, 0)) AS weight, 0 AS payin, 0 AS pure
            FROM puremcitem pmi
            JOIN puremc pm ON pmi.pureid = pm.pureid
            WHERE STR_TO_DATE(pm.date, '%d/%m/%Y') BETWEEN ? AND ?
            GROUP BY pm.dsename

            UNION ALL

            -- Payments
            SELECT rp.dsename, 0 AS weight, SUM(IFNULL(rp.amount, 0)) AS payin, SUM(IFNULL(rp.pure, 0)) AS pure
            FROM retailerpayment rp
            WHERE DATE(rp.date) BETWEEN ? AND ?
            GROUP BY rp.dsename
        ) AS t
        GROUP BY t.dsename
        ORDER BY t.dsename
    `;

    const params = [from, to, from, to, from, to];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error in DSE Sale Report:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});


// Item Sale Report
app.get('/report_item_sale', (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ error: "Missing date range" });
    }

    // DEBUG LOGGING REQUIREMENT
    const sqlLogSales = `
        SELECT IFNULL(SUM(weight), 0) AS total_sales_weight 
        FROM salesitem si JOIN sales s ON si.invno = s.invno 
        WHERE STR_TO_DATE(s.date, '%d/%m/%Y') BETWEEN ? AND ?
    `;
    const sqlLogPureMC = `
        SELECT IFNULL(SUM(weight), 0) AS total_puremc_weight 
        FROM puremcitem pmi JOIN puremc pm ON pmi.pureid = pm.pureid 
        WHERE STR_TO_DATE(pm.date, '%d/%m/%Y') BETWEEN ? AND ?
    `;
    const sqlLogPurchase = `
        SELECT IFNULL(SUM(wt), 0) AS total_purchase_weight 
        FROM purchaseitem pi JOIN purchase p ON pi.purchaseid = p.purchaseid 
        WHERE STR_TO_DATE(p.date, '%d/%m/%Y') BETWEEN ? AND ?
    `;

    db.query(sqlLogSales, [from, to], (err, salesLogRes) => {
        if (err) console.error("Error logging sales weight:", err);
        const salesWeightLog = salesLogRes ? salesLogRes[0].total_sales_weight : 0;

        db.query(sqlLogPureMC, [from, to], (err, pureLogRes) => {
            if (err) console.error("Error logging puremc weight:", err);
            const pureWeightLog = pureLogRes ? pureLogRes[0].total_puremc_weight : 0;

            db.query(sqlLogPurchase, [from, to], (err, purchaseLogRes) => {
                if (err) console.error("Error logging purchase weight:", err);
                const purchaseWeightLog = purchaseLogRes ? purchaseLogRes[0].total_purchase_weight : 0;

                console.log(`[DEBUG] Item Sale Report Summary (${from} to ${to}):`);
                console.log(` - Total salesitem.weight: ${salesWeightLog}`);
                console.log(` - Total puremcitem.weight: ${pureWeightLog}`);
                console.log(` - Total purchaseitem.wt: ${purchaseWeightLog}`);
                console.log(` - Final calculated weight (Sold): ${salesWeightLog + pureWeightLog}`);
                console.log(` - Tally (Purchase - Sold): ${purchaseWeightLog - (salesWeightLog + pureWeightLog)}`);

                const sqlMain = `
                    SELECT 
                        t.item,
                        ROUND(SUM(CASE WHEN t.type IN ('sale', 'puremc') THEN t.weight ELSE 0 END), 3) AS total_weight,
                        SUM(CASE WHEN t.type IN ('sale', 'puremc') THEN t.count ELSE 0 END) AS total_count,
                        ROUND(SUM(CASE WHEN t.type IN ('sale', 'puremc') THEN t.amount ELSE 0 END), 2) AS total_amount,
                        ROUND(SUM(CASE WHEN t.type = 'purchase' THEN t.weight ELSE 0 END) - SUM(CASE WHEN t.type IN ('sale', 'puremc') THEN t.weight ELSE 0 END), 3) AS tally_weight
                    FROM (
                        -- Sales Items
                        SELECT si.item, si.weight, si.count, si.total AS amount, 'sale' AS type
                        FROM salesitem si
                        JOIN sales s ON si.invno = s.invno
                        WHERE STR_TO_DATE(s.date, '%d/%m/%Y') BETWEEN ? AND ?

                        UNION ALL

                        -- Pure MC Items
                        SELECT pmi.item, pmi.weight, pmi.count, pmi.totalamount AS amount, 'puremc' AS type
                        FROM puremcitem pmi
                        JOIN puremc pm ON pmi.pureid = pm.pureid
                        WHERE STR_TO_DATE(pm.date, '%d/%m/%Y') BETWEEN ? AND ?

                        UNION ALL

                        -- Purchase Items
                        SELECT pi.item, pi.wt AS weight, pi.count, pi.totalamount AS amount, 'purchase' AS type
                        FROM purchaseitem pi
                        JOIN purchase p ON pi.purchaseid = p.purchaseid
                        WHERE STR_TO_DATE(p.date, '%d/%m/%Y') BETWEEN ? AND ?
                    ) t
                    GROUP BY t.item
                    ORDER BY t.item
                `;

                const paramsMain = [from, to, from, to, from, to];
                const userRole = req.headers['x-user-role'] || 'admin';

                db.query(sqlMain, paramsMain, (err, results) => {
                    if (err) {
                        console.error("SQL Error in Item Sale Report:", err);
                        return res.status(500).json({ error: "Database error", details: err.message });
                    }

                    // RBAC: Redact tally for office role
                    if (userRole === 'office') {
                        results.forEach(row => {
                            row.tally_weight = 0;
                        });
                    }
                    res.json(results);
                });
            });
        });
    });
});


// Tally Report (Total Stock Balance)
app.get('/report_tally', (req, res) => {
    const sql = `
        SELECT 
            t.item,
            ROUND(
                SUM(IFNULL(t.p_wt, 0)) - 
                SUM(IFNULL(t.s_weight, 0)) - 
                SUM(IFNULL(t.pm_weight, 0)), 
            3) AS weight
        FROM (
            -- Purchase Items (ADD)
            SELECT item, wt AS p_wt, 0 AS s_weight, 0 AS pm_weight FROM purchaseitem
            
            UNION ALL
            
            -- Sales Items (SUBTRACT)
            SELECT item, 0 AS p_wt, weight AS s_weight, 0 AS pm_weight FROM salesitem
            
            UNION ALL
            
            -- Pure MC Items (SUBTRACT)
            SELECT item, 0 AS p_wt, 0 AS s_weight, weight AS pm_weight FROM puremcitem
        ) t
        GROUP BY t.item
        ORDER BY t.item
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error in Tally Report:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});


app.get('/report_dse_stock', (req, res) => {
    const { dse, item } = req.query;
    let whereClauses = [];
    let params = [];

    if (dse) {
        whereClauses.push("t.dse = ?");
        params.push(dse);
    }
    if (item) {
        whereClauses.push("t.item = ?");
        params.push(item);
    }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
        SELECT 
            dse, 
            item, 
            IFNULL(SUM(weight), 0) AS weight, 
            IFNULL(SUM(count), 0) AS count, 
            ROUND(IFNULL(SUM(silver), 0), 3) AS silver
        FROM (
            SELECT s.dse, si.item, IFNULL(si.wt, 0) AS weight, IFNULL(si.count, 0) AS count, IFNULL(si.withcoverwt, 0) AS silver, 1 AS is_stock
            FROM stock s 
            JOIN stocksitem si ON s.stockid = si.stockid
            
            UNION ALL
            
            SELECT sa.dse, sai.item, -IFNULL(sai.totalweight, 0) AS weight, -IFNULL(sai.count, 0) AS count, -IFNULL(sai.weight, 0) AS silver, 0 AS is_stock
            FROM sales sa 
            JOIN salesitem sai ON sa.invno = sai.invno
            
            UNION ALL
            
            SELECT i.dse, ii.item, -IFNULL(ii.wt, 0) AS weight, -IFNULL(ii.count, 0) AS count, -IFNULL(ii.withcoverwt, 0) AS silver, 0 AS is_stock
            FROM inventory i 
            JOIN inventoryitem ii ON i.inventid = ii.inventid
            
            UNION ALL

            SELECT pm.dsename AS dse, pmi.item, -IFNULL(pmi.totalwt, 0) AS weight, -IFNULL(pmi.count, 0) AS count, -IFNULL(pmi.weight, 0) AS silver, 0 AS is_stock
            FROM puremc pm
            JOIN puremcitem pmi ON pm.pureid = pmi.pureid
        ) t
        ${whereStr}
        GROUP BY dse, item
        HAVING SUM(is_stock) > 0
        ORDER BY dse, item
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error in DSE Stock Report:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});



app.get('/report_inventory_balance', (req, res) => {
    const { item } = req.query;
    let whereClauses = [];
    let params = [];

    if (item) {
        whereClauses.push("t.item = ?");
        params.push(item);
    }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
        SELECT 
            item, 
            ROUND(IFNULL(SUM(weight), 0), 3) AS weight, 
            IFNULL(SUM(count), 0) AS count, 
            ROUND(IFNULL(SUM(silver), 0), 3) AS silver
        FROM (
            SELECT si.item, -IFNULL(si.wt, 0) AS weight, -IFNULL(si.count, 0) AS count, -IFNULL(si.withcoverwt, 0) AS silver
            FROM stock s 
            JOIN stocksitem si ON s.stockid = si.stockid
            
            UNION ALL
            
            SELECT ii.item, IFNULL(ii.wt, 0) AS weight, IFNULL(ii.count, 0) AS count, IFNULL(ii.withcoverwt, 0) AS silver
            FROM inventory i 
            JOIN inventoryitem ii ON i.inventid = ii.inventid
        ) t
        ${whereStr}
        GROUP BY item
        ORDER BY item
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error in Inventory Balance Report:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});

app.get('/get_item_list', (req, res) => {
    const sql = `
        SELECT TRIM(item) as itemname FROM stocksitem
        UNION
        SELECT TRIM(item) as itemname FROM salesitem
        UNION
        SELECT TRIM(item) as itemname FROM puremcitem
        UNION
        SELECT TRIM(item) as itemname FROM inventoryitem
        ORDER BY itemname ASC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error in get_item_list:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results.map(r => r.itemname));
    });
});


// GET /get_party_list - returns unique party names
app.get('/get_party_list', (req, res) => {
    const sql = `SELECT DISTINCT TRIM(partyname) AS partyname FROM party WHERE partyname IS NOT NULL AND partyname != '' ORDER BY partyname ASC`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error in get_party_list:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results.map(r => r.partyname));
    });
});

// GET /report_party - aggregated party Pure & MC balance
app.get('/report_party', (req, res) => {
    const { party } = req.query;
    let params = [];
    const whereStr = party ? " WHERE TRIM(t.partyname) = ?" : "";
    if (party) params.push(party);

    const sql = `
        SELECT 
            TRIM(partyname) AS partyname,
            IFNULL(SUM(pure), 0) AS pure,
            IFNULL(SUM(mc), 0) AS mc
        FROM (
            SELECT partyname, pure, makecharge AS mc FROM party
            
            UNION ALL
            
            SELECT p.party AS partyname, pi.pure, pi.totalamount AS mc
            FROM purchase p
            JOIN purchaseitem pi ON p.purchaseid = pi.purchaseid
            
            UNION ALL
            
            SELECT partyname, -pure, -mc
            FROM partypayout
        ) t
        ${whereStr}
        GROUP BY TRIM(partyname)
        ORDER BY TRIM(partyname)
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error in Party Report:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});

// Receive Balance Report
app.get('/report_receive_balance', (req, res) => {
    const { dse } = req.query;
    let whereClause = "";
    let params = [];

    if (dse) {
        whereClause = "WHERE TRIM(LOWER(d.dsename)) = TRIM(LOWER(?))";
        params.push(dse);
    }

    const sql = `
        SELECT
            d.dsename,
            (
                IFNULL(d.openbalance, 0)
                + IFNULL((
                    SELECT SUM(rp.amount)
                    FROM retailerpayment rp
                    WHERE TRIM(LOWER(rp.dsename)) = TRIM(LOWER(d.dsename))
                      AND LOWER(rp.mode) = 'cash'
                ), 0)
                + IFNULL((
                    SELECT SUM(rp.purecash)
                    FROM retailerpayment rp
                    WHERE TRIM(LOWER(rp.dsename)) = TRIM(LOWER(d.dsename))
                ), 0)
                - IFNULL((
                    SELECT SUM(p.amount)
                    FROM payment p
                    WHERE TRIM(LOWER(p.dsename)) = TRIM(LOWER(d.dsename))
                      AND LOWER(p.mode) IN ('cash', 'gpay')
                ), 0)
                - IFNULL((
                    SELECT SUM(pe.amount)
                    FROM petrolexpenses pe
                    WHERE TRIM(LOWER(pe.dsename)) = TRIM(LOWER(d.dsename))
                ), 0)
            ) AS balance
        FROM dse d
        ${whereClause}
        GROUP BY TRIM(LOWER(d.dsename)), d.dsename, d.openbalance
        ORDER BY d.dsename
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error in Receive Balance Report:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});

app.get('/dashboard_summary', (req, res) => {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const yearEnd = `${now.getFullYear()}-12-31`;
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const sql = `
        SELECT
            -- 1. CASH IN HAND (Fixed Year)
            (IFNULL((
                SELECT SUM(IF(LOWER(mode) IN ('cash', 'gpay'), amount, 0))
                FROM retailerpayment
                WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
            ), 0) + 
            IFNULL((
                SELECT SUM(purecash)
                FROM retailerpayment
                WHERE COALESCE(STR_TO_DATE(date, '%Y-%m-%d'), STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y')) BETWEEN ? AND ?
            ), 0) - 
            IFNULL((
                SELECT SUM(amount) FROM expenses 
                WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
            ), 0) -
            IFNULL((
                SELECT SUM(mc) FROM partypayout 
                WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
            ), 0) -
            IFNULL((
                SELECT SUM(amount) FROM petrolexpenses 
                WHERE COALESCE(STR_TO_DATE(date, '%d/%m/%Y'), STR_TO_DATE(date, '%d-%m-%Y'), STR_TO_DATE(date, '%Y-%m-%d')) BETWEEN ? AND ?
            ), 0)) AS cash_in_hand,

            -- 2. CASH IN OFFICE (Fixed Month)
            IFNULL((
                SELECT SUM(IF(LOWER(mode) = 'cash', amount, 0)) - SUM(IF(LOWER(mode) = 'office', amount, 0))
                FROM payment
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) AS cash_in_office,

            -- 3. PURE BALANCE (Fixed Month)
            (IFNULL((
                SELECT SUM(pure) FROM expenses 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) +
            IFNULL((
                SELECT SUM(silverweight) FROM retailerpayment 
                WHERE DATE(date) BETWEEN ? AND ?
            ), 0) -
            IFNULL((
                SELECT SUM(pure) FROM retailerpayment 
                WHERE DATE(date) BETWEEN ? AND ?
            ), 0) -
            IFNULL((
                SELECT SUM(pure) FROM partypayout 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0)) AS pure_balance,

            -- 4. SALE (Performance - Default Month)
            (IFNULL((
                SELECT SUM(si.totalweight) FROM salesitem si 
                JOIN sales s ON si.invno = s.invno 
                WHERE STR_TO_DATE(s.date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) +
            IFNULL((
                SELECT SUM(pmi.weight) FROM puremcitem pmi 
                JOIN puremc pm ON pmi.pureid = pm.pureid 
                WHERE STR_TO_DATE(pm.date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0)) AS sale_weight,

            -- 5. PAYIN (Performance - Default Month)
            IFNULL((
                SELECT SUM(amount) FROM retailerpayment 
                WHERE DATE(date) BETWEEN ? AND ?
            ), 0) AS payin_cash,
            IFNULL((
                SELECT SUM(silverweight + pure) FROM retailerpayment 
                WHERE DATE(date) BETWEEN ? AND ?
            ), 0) AS payin_pure,

            -- 6. CREDIT (Cumulative - All Time)
            (IFNULL((SELECT SUM(openbalance) FROM retailer), 0) +
            IFNULL((SELECT SUM(finaltotal) FROM sales), 0) -
            IFNULL((SELECT SUM(totalamount) FROM puremcitem), 0) -
            IFNULL((SELECT SUM(amount) FROM retailerpayment), 0)) AS credit_cash,
            (IFNULL((SELECT SUM(openpure) FROM retailer), 0) +
            (IFNULL((SELECT SUM(pure) FROM puremcitem), 0) -
            IFNULL((SELECT SUM(pure) FROM retailerpayment), 0))) AS credit_pure,

            -- 7. ORIGINAL STATS (Static Month)
            IFNULL((
                SELECT SUM(finaltotal) FROM sales 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) AS total_sales_value,
            IFNULL((
                SELECT COUNT(*) FROM sales 
                WHERE STR_TO_DATE(date, '%d/%m/%Y') BETWEEN ? AND ?
            ), 0) AS total_orders,
            IFNULL((SELECT COUNT(*) FROM user), 0) AS total_users
    `;

    const params = [
        yearStart, yearEnd, yearStart, yearEnd, yearStart, yearEnd, yearStart, yearEnd, yearStart, yearEnd, // Cash in hand
        monthStart, monthEnd, // Cash in office
        monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd, // Pure balance
        monthStart, monthEnd, monthStart, monthEnd, // Sale
        monthStart, monthEnd, monthStart, monthEnd, // Payin
        monthStart, monthEnd, monthStart, monthEnd // Original Stats
    ];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Dashboard Summary Error:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results[0]);
    });
});

app.get('/dashboard_data', (req, res) => {
    const filter = req.query.filter;
    const today = req.query.today || new Date().toISOString().split('T')[0];
    
    let saleCondition = "1=1";
    let payCondition = "1=1";
    
    // sale date is DD/MM/YYYY
    const sDate = "STR_TO_DATE(s.date, '%d/%m/%Y')";
    // retailerpayment date is YYYY-MM-DD
    const rpDate = "DATE(rp.date)";

    if (filter === "today") {
        saleCondition = `DATE(${sDate}) = '${today}'`;
        payCondition = `${rpDate} = '${today}'`;
    } else if (filter === "week") {
        saleCondition = `YEARWEEK(${sDate}, 1) = YEARWEEK('${today}', 1)`;
        payCondition = `YEARWEEK(${rpDate}, 1) = YEARWEEK('${today}', 1)`;
    } else if (filter === "month") {
        saleCondition = `MONTH(${sDate}) = MONTH('${today}') AND YEAR(${sDate}) = YEAR('${today}')`;
        payCondition = `MONTH(${rpDate}) = MONTH('${today}') AND YEAR(${rpDate}) = YEAR('${today}')`;
    } else if (filter === "year") {
        saleCondition = `YEAR(${sDate}) = YEAR('${today}')`;
        payCondition = `YEAR(${rpDate}) = YEAR('${today}')`;
    } else if (filter === "custom" || filter === "range") {
        const { from, to } = req.query;
        if (from && to) {
            saleCondition = `DATE(${sDate}) BETWEEN '${from}' AND '${to}'`;
            payCondition = `${rpDate} BETWEEN '${from}' AND '${to}'`;
        }
    }

    const sqlSale = `
        SELECT ROUND(IFNULL(SUM(si.totalweight), 0), 3) AS sale
        FROM sales s
        JOIN salesitem si ON s.invno = si.invno
        WHERE ${saleCondition}
    `;

    const sqlPayin = `
        SELECT 
            IFNULL(SUM(rp.amount), 0) AS cash,
            ROUND(IFNULL(SUM(rp.pure), 0), 3) AS pure
        FROM retailerpayment rp
        WHERE ${payCondition}
    `;

    // Execute both queries
    db.query(sqlSale, (err, saleResult) => {
        if (err) {
            console.error("Dashboard Sale Data Error:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        
        db.query(sqlPayin, (err, payinResult) => {
            if (err) {
                console.error("Dashboard Payin Data Error:", err);
                return res.status(500).json({ error: "Database error", details: err.message });
            }
            
            res.json({
                sale_weight: saleResult[0].sale,
                payin_cash: payinResult[0].cash,
                payin_pure: payinResult[0].pure
            });
        });
    });
});

app.get('/latest_transactions', (req, res) => {
    const sql = `
        SELECT invno, date, retailer, finaltotal 
        FROM sales 
        ORDER BY STR_TO_DATE(date, '%d/%m/%Y') DESC, invno DESC 
        LIMIT 10
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

app.listen(port, () => {
    console.log("Server running on port " + port);
});
