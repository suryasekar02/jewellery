const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/dashboard_data?filter=month',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Dashboard Data Response (Month):", json);
            if (json.sale_weight === 2277) {
                 console.log("SUCCESS: Sale Weight matches expected (2277 g)");
            } else {
                 console.log("DISCREPANCY: Received", json.sale_weight, "Expected 2277");
            }
        } catch (e) {
            console.error("Parse Error:", e);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    console.log("Note: Make sure the server is running on localhost:3000");
});

req.end();
