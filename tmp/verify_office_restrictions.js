const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';

async function testOfficeRestrictions() {
    console.log("Testing Office Role Restrictions...");

    // 1. Test Search Expenses (should only show Office paymode)
    try {
        const response = await fetch(`${API_URL}/search_transactions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-User-Role': 'office'
            },
            body: JSON.stringify({ type: 'expenses', filters: {} })
        });
        const data = await response.json();
        const invalid = data.filter(e => e.paymode !== 'Office');
        console.log(`- Expenses filter test: ${invalid.length === 0 ? 'PASSED' : 'FAILED'}`);
        if (invalid.length > 0) console.log("  Invalid entries found:", invalid);
    } catch (e) { console.log("- Expenses test ERROR:", e.message); }

    // 2. Test Search Purchase (should be blocked)
    try {
        const response = await fetch(`${API_URL}/search_transactions`, {
            method: 'POST',
            headers: { 
                'X-User-Role': 'office',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: 'purchase', filters: {} })
        });
        console.log(`- Purchase block test: ${response.status === 403 ? 'PASSED' : 'FAILED (' + response.status + ')'}`);
    } catch (e) { console.log("- Purchase test ERROR:", e.message); }

    // 3. Test Item Sale Report (tally should be redacted)
    try {
        const response = await fetch(`${API_URL}/report_item_sale?from=01/01/2020&to=01/01/2030`, {
            headers: { 'X-User-Role': 'office' }
        });
        const data = await response.json();
        const hasTally = data.some(r => r.tally_weight !== 0);
        console.log(`- Tally redaction test: ${!hasTally ? 'PASSED' : 'FAILED'}`);
    } catch (e) { console.log("- Tally test ERROR:", e.message); }
}

testOfficeRestrictions();
