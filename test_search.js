
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testSearch(type, filters, description) {
    try {
        const response = await axios.post(`${API_URL}/search_transactions`, {
            type: type,
            filters: filters
        });

        if (response.data.length > 0) {
            const firstRow = response.data[0];
            const itemCount = firstRow.items ? firstRow.items.length : 0;
            console.log(`[PASS] ${description}: Found ${response.data.length} records. First record has ${itemCount} items.`);
        } else {
            console.log(`[WARN] ${description}: No records found.`);
        }
    } catch (error) {
        console.error(`[FAIL] ${description}:`, error.message);
    }
}

async function runTests() {
    console.log('--- Verification Results ---');
    await testSearch('sales', {}, 'Sales');
    await testSearch('stock', {}, 'Stock');
    await testSearch('purchase', {}, 'Purchase');
    await testSearch('puremc', {}, 'Pure MC');
}

runTests();
