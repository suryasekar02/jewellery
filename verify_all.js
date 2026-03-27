// Native fetch available in Node 25

async function testEndpoint(name, url, data) {
    console.log(`Testing ${name}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const text = await response.text();
        console.log(`${name} Response:`, text);
        return text;
    } catch (err) {
        console.error(`${name} Error:`, err);
        return null;
    }
}

async function runTests() {
    const timestamp = Date.now();

    await testEndpoint("Add Sale", 'http://localhost:3000/add_sale', {
        invno: "TEST_S" + timestamp, date: "27/03/2026", dse: "Test DSE", retailer: "Test Retailer", rid: "R1", discount: 0, finaltotal: 100, userid: "USR1",
        saleItems: [{ product: "Test", weight: 1, count: 1, rate: 100, cover: 0, total: 100, totalweight: 1 }]
    });

    await testEndpoint("Add Stock", 'http://localhost:3000/add_stock', {
        stockid: "TEST_K" + timestamp, date: "27/03/2026", dse: "Test DSE",
        stockItems: [{ item: "Test", count: 1, wt: 1, withcoverwt: 1, coverwt: 0 }]
    });

    await testEndpoint("Add Inventory", 'http://localhost:3000/add_inventory', {
        inventid: "TEST_V" + timestamp, date: "27/03/2026", dse: "Test DSE",
        inventoryItems: [{ item: "Test", count: 1, wt: 1, withcoverwt: 1, coverwt: 0 }]
    });

    await testEndpoint("Add PureMC", 'http://localhost:3000/add_puremc', {
        date: "27/03/2026", dsename: "Test DSE", retailername: "Test Retailer", userid: "USR1",
        pureMcItems: [{ item: "Test", weight: 1, count: 1, percent: 100, mc: 0, pure: 1, cover: 0, totalwt: 1, totalamount: 100 }]
    });

    await testEndpoint("Add Payment", 'http://localhost:3000/add_payment', {
        payid: "TEST_Y" + timestamp, date: "27/03/2026", time: "12:00", dsename: "Test DSE", mode: "Cash", amount: 100, description: "Test"
    });

    await testEndpoint("Add Retailer Payment", 'http://localhost:3000/add_retailer_payment', {
        payid: "TEST_L" + timestamp, date: "27/03/2026", time: "12:00", dsename: "Test DSE", retailername: "Test Retailer", mode: "Cash", amount: 100, userid: "USR1"
    });

    await testEndpoint("Add Expense", 'http://localhost:3000/add_expense', {
        exid: "TEST_E" + timestamp, date: "27/03/2026", time: "12:00", particulars: "Test", paymode: "Cash", amount: 100, pure: 0, description: "Test"
    });
}

runTests();
