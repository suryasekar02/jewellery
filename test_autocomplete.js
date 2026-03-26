
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testAutocomplete() {
    console.log('\n--- Testing Autocomplete Endpoint ---');
    try {
        const response = await axios.get(`${API_URL}/get_autocomplete_data`);

        console.log(`Status: ${response.status}`);
        const data = response.data;

        const keys = ['dse', 'retailer', 'party', 'items'];
        let passed = true;

        keys.forEach(key => {
            if (Array.isArray(data[key])) {
                console.log(`[PASS] ${key}: Found ${data[key].length} items.`);
                if (data[key].length > 0) {
                    console.log(`       Sample: ${data[key].slice(0, 3).join(', ')}`);
                }
            } else {
                console.error(`[FAIL] ${key}: Expected array, got ${typeof data[key]}`);
                passed = false;
            }
        });

        if (passed) console.log('\n✅ Autocomplete verification successful.');
        else console.log('\n❌ Autocomplete verification failed.');

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

testAutocomplete();
