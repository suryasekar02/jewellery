const testData = {
    pureid: "TEST_M1",
    date: "10/02/2026",
    dsename: "Test DSE",
    retailername: "Test Retailer",
    pureMcItems: [
        {
            item: "Test Item",
            weight: 10.5,
            count: 2,
            percent: 90.0,
            mc: 50.0,
            pure: 9.45,
            cover: 2.0,
            totalwt: 14.5,
            totalamount: 525.0
        }
    ]
};

fetch('http://localhost:3000/add_puremc', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
})
    .then(response => response.text())
    .then(data => {
        console.log('Response:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
