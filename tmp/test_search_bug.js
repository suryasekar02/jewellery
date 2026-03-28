const axios = require('axios');

const API_URL = 'http://localhost:3000'; // Assuming local server

async function testSearch() {
    try {
        const response = await axios.post(`${API_URL}/search_transactions`, {
            type: 'party_payout',
            filters: {
                dateFrom: '2026-03-28',
                dateTo: '',
                party: ''
            }
        });
        console.log('Search response:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Search failed with status:', error.response.status);
            console.error('Error details:', error.response.data);
        } else {
            console.error('Search failed:', error.message);
        }
    }
}

testSearch();
