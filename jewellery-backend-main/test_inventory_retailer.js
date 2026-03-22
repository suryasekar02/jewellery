
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testSearch(type, description) {
    try {
        const response = await axios.post(`${API_URL}/search_transactions`, {
            type: type,
            filters: {}
        });

        if (response.data.length > 0) {
            const firstRow = response.data[0];

            if (type === 'inventory') {
                const itemCount = firstRow.items ? firstRow.items.length : 0;
                console.log(`[PASS] ${description}: Found ${response.data.length} records. First record has ${itemCount} items.`);
                if (itemCount > 0) console.log(`       Sample Item: ${JSON.stringify(firstRow.items[0])}`);
            } else if (type === 'retailer_payment') {
                // Check for silverweight and description
                if (firstRow.silverweight !== undefined && firstRow.description !== undefined) {
                    console.log(`[PASS] ${description}: Found ${response.data.length} records.`);
                    console.log(`       Detail Sample: Silver Wt=${firstRow.silverweight}, Desc=${firstRow.description}`);
                } else {
                    console.error(`[FAIL] ${description}: Missing silverweight or description.`);
                }
            }

        } else {
            console.log(`[WARN] ${description}: No records found.`);
        }
    } catch (error) {
        console.error(`[FAIL] ${description}:`, error.message);
    }
}

async function runTests() {
    console.log('\n--- Verification Results ---');
    await testSearch('inventory', 'Inventory');
    await testSearch('retailer_payment', 'Retailer Payment');
}

runTests();
