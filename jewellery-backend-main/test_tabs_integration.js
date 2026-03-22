
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function verifyEndpoint(name, endpoint, itemKey) {
    try {
        console.log(`Testing ${name} (${endpoint})...`);
        const response = await axios.get(`${API_URL}/${endpoint}`);
        const data = response.data;

        if (Array.isArray(data)) {
            console.log(`[PASS] ${name}: Endpoint returned array of ${data.length} records.`);

            if (data.length > 0) {
                const firstRow = data[0];
                if (firstRow[itemKey]) {
                    const itemCount = Array.isArray(firstRow[itemKey]) ? firstRow[itemKey].length : 'Not Array';
                    console.log(`[PASS] ${name}: Found nested key '${itemKey}' with ${itemCount} items.`);
                } else {
                    console.warn(`[WARN] ${name}: Nested key '${itemKey}' NOT found in first record. (Might be empty or wrong key)`);
                    console.log('Record Keys:', Object.keys(firstRow));
                }
            }
        } else {
            console.error(`[FAIL] ${name}: API did not return an array.`);
        }

    } catch (error) {
        console.error(`[FAIL] ${name}: ${error.message}`);
    }
}

async function runTests() {
    await verifyEndpoint('Sales', 'view_sales', 'saleItems');
    await verifyEndpoint('Stock', 'view_stock', 'stockItems');
    await verifyEndpoint('Inventory', 'view_inventory', 'inventoryItems');
    await verifyEndpoint('Purchase', 'view_purchase', 'purchaseItems');
    await verifyEndpoint('Pure MC', 'view_puremc', 'pureMcItems');
}

runTests();
