//const API_URL = 'http://51.20.73.184:3000';
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:" || window.location.hostname === "";
const API_URL = isLocal ? "http://localhost:3000" : "https://jewelleryshop-nk0z.onrender.com";
function exportToExcel(type) {
    let containerId = "";
    let baseFileName = type;

    const mapping = {
        'view_dse': 'dse-data', 'view_retailer': 'retailers-data', 'view_parties': 'parties-data',
        'view_item': 'items-data', 'view_category': 'categories-data', 'view_users': 'users-data',
        'sales': 'sales-data', 'stock': 'stock-data', 'inventory': 'inventory-data',
        'purchase': 'purchases-data', 'puremc': 'puremc-data', 'view_payment': 'payments-data',
        'view_retailer_payment': 'retailer_payments-data', 'view_expense': 'expenses-data',
        'view_petrol': 'petrol-data', 'view_trash': 'trash-data'
    };
    
    // Priority 1: Check if 'type' is a direct element ID (like dashboard-dse-data)
    if (document.getElementById(type)) {
        containerId = type;
    } else if (type === 'report') {
        containerId = "report-results";
        const reportTypeSelect = document.getElementById("reportType");
        if (reportTypeSelect && reportTypeSelect.value) {
            baseFileName = reportTypeSelect.value + "_report";
        }
    } else if (type === 'search') {
        containerId = "search-results-container";
        const searchTypeSelect = document.getElementById("searchType");
        if (searchTypeSelect && searchTypeSelect.value) {
            baseFileName = searchTypeSelect.value + "_search";
        }
    } else {
        containerId = mapping[type] || type;
    }

    const container = document.getElementById(containerId);
    if (!container) {
        alert("No data to export");
        return;
    }

    const table = container.querySelector("table");
    if (!table || table.rows.length <= 1) {
        alert("No data to export");
        return;
    }

    // Clone table to safely manipulate for export (remove UI elements like toggle buttons)
    const tableClone = table.cloneNode(true);
    
    // Remove "Details" toggle columns and buttons
    tableClone.querySelectorAll('button, .btn-toggle, .btn-action, .d-none').forEach(el => el.remove());
    
    // Ensure nested rows (like search details) are also excluded
    tableClone.querySelectorAll('.detail-row').forEach(el => el.remove());

    // Generate Excel File
    try {
        const wb = XLSX.utils.table_to_book(tableClone, { sheet: "Data" });
        const fileName = `${baseFileName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    } catch (err) {
        console.error("Export Error:", err);
        alert("Failed to export. Please ensure the XLSX library is loaded.");
    }
}

// Helper to render report results to both main and dashboard containers
function renderToReportContainers(html) {
    const mainContainer = document.getElementById("report-results");
    const dashboardContainer = document.getElementById("dashboard-report-results");
    if (mainContainer) mainContainer.innerHTML = html;
    if (dashboardContainer) dashboardContainer.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        handleLogin();
    } else {
        initDashboard();
    }
});

function handleLogin() {
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username.value;
        const password = form.password.value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginname: username, password: password })
            });

            if (response.ok) {
                const user = await response.json();
                localStorage.setItem('user', JSON.stringify(user));
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.classList.remove('d-none');
                errorMsg.textContent = 'Invalid credentials. Please try again.';
            }
        } catch (err) {
            console.error('Login error:', err);
            errorMsg.classList.remove('d-none');
            errorMsg.textContent = 'Server error. Please try again later.';
        }
    });
}

function initDashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('adminName').textContent = user.username || user.loginname;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    const navLinks = document.querySelectorAll('.sidebar-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('href').substring(1);
            showSection(targetId);
        });
    });

    loadDashboardStats();
    loadDashboard(); // Initial load for performance cards
    initDashboardFilters();
    if (typeof initAdvancedSearch === 'function') initAdvancedSearch(); // Initialize Search
}

function initDashboardFilters() {
    const filterSelect = document.getElementById('timeFilter');
    const customRange = document.getElementById('dashboardCustomRange');
    const applyBtn = document.getElementById('applyCustomFilter');

    if (!filterSelect) return;

    filterSelect.addEventListener('change', () => {
        if (filterSelect.value === 'custom') {
            customRange.classList.remove('d-none');
        } else {
            customRange.classList.add('d-none');
            loadDashboard();
        }
    });

    applyBtn.addEventListener('click', () => {
        const from = document.getElementById('dashboardFromDate').value;
        const to = document.getElementById('dashboardToDate').value;
        if (!from || !to) {
            alert("Please select both from and to dates");
            return;
        }
        loadDashboard('custom', from, to);
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.section-content').forEach(el => el.classList.add('d-none'));
    const target = document.getElementById(sectionId + '-section');
    if (target) {
        target.classList.remove('d-none');
        
        // Custom reset for Reports
        if (sectionId === 'reports') {
            const reportType = document.getElementById("reportType");
            if (reportType) {
                reportType.value = ""; // Reset dropdown
                toggleReportFilters(); // Hide filters
            }
            const results = document.getElementById("report-results");
            if (results) {
                results.innerHTML = `
                    <div class="report-placeholder">
                        <i class="fas fa-chart-pie"></i>
                        <p>Select report type to view analytical data.</p>
                    </div>
                `;
            }
            const exportBtn = document.getElementById("export-report-btn");
            if (exportBtn) exportBtn.classList.add("d-none");
            const trigger = document.getElementById("report-trigger-container");
            if (trigger) trigger.classList.add("d-none");
            const retFilters = document.getElementById("retailer-report-filters");
            if (retFilters) retFilters.classList.add("d-none");
        }

        // Auto-load data if button exists inside
        const btn = target.querySelector('.refresh-btn');
        if (btn) btn.click();
    } else if (sectionId === 'dashboard') {
        document.getElementById('dashboard-section').classList.remove('d-none');
        loadDashboardStats();
        loadDashboard();
        // Load DSE data for the dashboard table
        loadGeneric('view_dse', 'dashboard-dse-data', ['did', 'dsename', 'mobile', 'email', 'totalbal']);
    }
}

// Reuseable loader
async function loadGeneric(endpoint, containerId, columns) {
    const container = document.getElementById(containerId);
    container.innerHTML = 'Loading...';
    try {
        const res = await fetch(`${API_URL}/${endpoint}`);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `
                <div class="report-placeholder">
                    <i class="fas fa-folder-open"></i>
                    <p>No records found.</p>
                </div>
            `;
            return;
        }

        let html = '<table><thead><tr>';
        columns.forEach(col => {
            html += `<th>${col.toUpperCase()}</th>`;
        });
        html += '</tr></thead><tbody>';

        data.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
                let val = row[col];
                if (val === undefined || val === null) val = '-';
                // Basic check for objects (like nested items) - though this generic loader implies flat data or specific cols
                if (typeof val === 'object') val = JSON.stringify(val);
                html += `<td>${val}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = 'Error loading data.';
    }
}

async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/dashboard_summary`);
        const data = await res.json();

        // Original Stats
        document.getElementById('stat-total-sales').textContent = '₹' + (parseFloat(data.total_sales_value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('stat-total-orders').textContent = data.total_orders || 0;
        document.getElementById('stat-total-users').textContent = data.total_users || 0;

        // New Metrics
        document.getElementById('dashboard-cash-in-hand').textContent = '₹' + (parseFloat(data.cash_in_hand) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('dashboard-cash-in-office').textContent = '₹' + (parseFloat(data.cash_in_office) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('dashboard-pure-balance').textContent = (parseFloat(data.pure_balance) || 0).toFixed(3) + ' g';
        
        document.getElementById('dashboard-credit-cash').textContent = '₹' + (parseFloat(data.credit_cash) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('dashboard-credit-pure').textContent = (parseFloat(data.credit_pure) || 0).toFixed(3) + ' g';
        
        // Performance Metrics (Initial load from summary)
        loadDashboard('month');
        // New: Load Latest Transactions
        loadLatestTransactions();

    } catch (err) {
        console.error('Error loading dashboard summary:', err);
    }
}

async function loadLatestTransactions() {
    const container = document.getElementById('dashboard-report-results');
    try {
        const res = await fetch(`${API_URL}/latest_transactions`);
        const data = await res.json();
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="report-placeholder-sm"><p>No transactions found.</p></div>';
            return;
        }

        let html = `
            <table class="footer-table">
                <thead>
                    <tr>
                        <th>Inv No</th>
                        <th>Date</th>
                        <th>Retailer</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.forEach(tr => {
            html += `
                <tr>
                    <td>${tr.invno}</td>
                    <td>${tr.date}</td>
                    <td>${tr.retailer}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--primary);">₹${(parseFloat(tr.finaltotal) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error("Latest transactions error:", err);
        if (container) container.innerHTML = '<p class="text-danger">Error loading latest transactions.</p>';
    }
}

async function loadDashboard(filter = null, from = '', to = '') {
    try {
        if (!filter) {
            filter = document.getElementById('timeFilter')?.value || 'month';
        }

        let url = `${API_URL}/dashboard_data?filter=${filter}`;
        if (filter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            url += `&today=${today}`;
        }
        if (from) url += `&from=${from}`;
        if (to) url += `&to=${to}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch performance data");
        const data = await res.json();

        document.getElementById('saleWeight').textContent = (parseFloat(data.sale_weight) || 0).toFixed(3) + ' g';
        document.getElementById('payinCash').textContent = '₹' + (parseFloat(data.payin_cash) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('payinPure').textContent = (parseFloat(data.payin_pure) || 0).toFixed(3) + ' g';
    } catch (err) {
        console.error("Dashboard Performance Error:", err);
    }
}

// Optimized Custom Loaders for complex tables
async function loadSales() {
    const container = document.getElementById('sales-data');
    container.innerHTML = 'Loading...';
    try {
        const res = await fetch(`${API_URL}/view_sales`);
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = `
                <div class="report-placeholder">
                    <i class="fas fa-receipt"></i>
                    <p>No sales records found.</p>
                </div>
            `;
            return;
        }

        let html = `<table>
            <thead>
                <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>DSE</th>
                    <th>Retailer</th>
                    <th>Total Amount</th>
                    <th>Items</th>
                </tr>
            </thead>
            <tbody>`;

        data.forEach(row => {
            let totalAmt = 0;
            let itemsDesc = '';
            if (row.saleItems) {
                totalAmt = row.saleItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
                itemsDesc = row.saleItems.map(i => `${i.product} (${i.weight}g)`).join(', ');
            }

            html += `<tr>
                <td>${row.invno}</td>
                <td>${row.date}</td>
                <td>${row.dse}</td>
                <td>${row.retailer}</td>
                <td>₹${totalAmt.toLocaleString()}</td>
                <td>${itemsDesc}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = 'Error loading sales data.';
    }
}

async function loadStock() {
    const container = document.getElementById('stock-data');
    container.innerHTML = 'Loading...';
    try {
        const res = await fetch(`${API_URL}/view_stock`);
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = `
                <div class="report-placeholder">
                    <i class="fas fa-box-open"></i>
                    <p>No stock records found.</p>
                </div>
            `;
            return;
        }

        let html = `<table>
            <thead>
                <tr>
                    <th>Stock ID</th>
                    <th>Date</th>
                    <th>DSE</th>
                    <th>Items</th>
                </tr>
            </thead>
            <tbody>`;

        data.forEach(row => {
            let itemsDesc = row.stockItems ? row.stockItems.map(i => `${i.item} (${i.wt}g)`).join(', ') : '';
            html += `<tr>
                <td>${row.stockid}</td>
                <td>${row.date}</td>
                <td>${row.dse}</td>
                <td>${itemsDesc}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = 'Error loading stock data.';
    }
}

// Advanced Search Logic

function initAdvancedSearch() {
    const searchType = document.getElementById('searchType');
    const searchForm = document.getElementById('searchForm');
    const clearBtn = document.getElementById('clearSearchBtn');

    // Load Autocomplete Data
    loadAutocompleteData();

    // Dynamic Filter Visibility
    searchType.addEventListener('change', () => {
        const type = searchType.value;
        const dseGroup = document.getElementById('filter-dse-group');
        const retailerGroup = document.getElementById('filter-retailer-group');
        const partyGroup = document.getElementById('filter-party-group');

        // Reset visibility
        dseGroup.style.display = 'block';
        retailerGroup.style.display = 'block';
        partyGroup.style.display = 'none';

        if (type === 'payment') {
            retailerGroup.style.display = 'none'; // DSE Payments don't have retailer
        } else if (type === 'expenses') {
            dseGroup.style.display = 'none';
            retailerGroup.style.display = 'none';
        } else if (type === 'purchase') {
            dseGroup.style.display = 'none';
            retailerGroup.style.display = 'none';
            partyGroup.style.display = 'block';
        } else if (type === 'stock') {
            retailerGroup.style.display = 'none';
        } else if (type === 'inventory') {
            retailerGroup.style.display = 'none';
        }
    });

    // Handle Search Submit
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch();
    });

    clearBtn.addEventListener('click', () => {
        searchForm.reset();
        document.getElementById('search-results-container').innerHTML = `
            <div class="report-placeholder">
                <i class="fas fa-search"></i>
                <p>Select filters and search to see results.</p>
            </div>
        `;
    });
}

function loadAutocompleteData() {
    fetch(`${API_URL}/get_autocomplete_data`)
        .then(res => res.json())
        .then(data => {
            if (data.dse) populateDatalist('dseList', data.dse);
            if (data.retailer) populateDatalist('retailerList', data.retailer);
            if (data.party) populateDatalist('partyList', data.party);
            if (data.items) populateDatalist('itemList', data.items);
        })
        .catch(err => console.error('Error loading autocomplete data:', err));
}

function populateDatalist(id, items) {
    const datalist = document.getElementById(id);
    if (!datalist) return;
    datalist.innerHTML = items.map(item => `<option value="${item}">`).join('');
}

async function performSearch() {
    const type = document.getElementById('searchType').value;
    const filters = {
        dateFrom: document.getElementById('searchDateFrom').value,
        dateTo: document.getElementById('searchDateTo').value,
        dse: document.getElementById('searchDse').value,
        retailer: document.getElementById('searchRetailer').value,
        party: document.getElementById('searchParty').value,
        amountMin: document.getElementById('searchAmountMin').value,
        amountMax: document.getElementById('searchAmountMax').value,
        itemName: document.getElementById('searchItemName').value,
        userid: localStorage.getItem('userId') // Send UserID if available
    };

    // Clean empty filters
    Object.keys(filters).forEach(key => (filters[key] === '' || filters[key] === null) && delete filters[key]);

    const container = document.getElementById('search-results-container');
    container.innerHTML = '<p>Loading...</p>';

    try {
        const response = await fetch(`${API_URL}/search_transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, filters })
        });

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        renderSearchResults(type, data);

        // Show export button for search results
        const exportBtn = document.getElementById('export-search-btn');
        if (exportBtn) {
            exportBtn.classList.remove('d-none');
            exportBtn.onclick = () => exportToExcel(type); // Export current search type
        }

    } catch (error) {
        console.error(error);
        container.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

function renderSearchResults(type, data, containerId = 'search-results-container') {
    const container = document.getElementById(containerId);

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="report-placeholder">
                <i class="fas fa-search-minus"></i>
                <p>No results found matching your filters.</p>
            </div>
        `;
        return;
    }

    let columns = [];
    if (type === 'sales') columns = ['Date', 'Inv No', 'DSE', 'Retailer', 'Final Total'];
    else if (type === 'payment') columns = ['Date', 'Pay ID', 'DSE', 'Amount', 'Mode'];
    else if (type === 'retailer_payment') columns = ['Date', 'Pay ID', 'DSE', 'Retailer', 'Amount', 'Mode'];
    else if (type === 'stock') columns = ['Date', 'Stock ID', 'DSE'];
    else if (type === 'inventory') columns = ['Date', 'Invent ID', 'DSE'];
    else if (type === 'purchase') columns = ['Date', 'Purchase ID', 'Party'];
    else if (type === 'puremc') columns = ['Date', 'Pure ID', 'DSE', 'Retailer'];
    else if (type === 'expenses') columns = ['Date', 'Ex ID', 'Particulars', 'Pay Mode', 'Amount', 'Pure', 'Description'];
    else if (type === 'petrol') columns = ['Date', 'Pet ID', 'DSE', 'Amount', 'Description'];

    let html = '<table class="data-table"><thead><tr>';

    // Check if Type supports Nested Grid
    const hasNested = ['sales', 'stock', 'purchase', 'puremc', 'inventory', 'retailer_payment'].includes(type);
    if (hasNested) html += '<th>Details</th>';

    columns.forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';

    data.forEach((row, index) => {
        const rowId = `${type}-row-${index}`; // Unique ID based on type
        html += `<tr class="main-row">`;

        if (hasNested) {
            html += `<td><button class="btn-toggle" onclick="toggleDetail('${rowId}')"><i class="fas fa-plus-circle"></i></button></td>`;
        }

        if (type === 'sales') {
            html += `<td>${row.date}</td><td>${row.invno}</td><td>${row.dse}</td><td>${row.retailer}</td><td>₹${row.finaltotal}</td>`;
        } else if (type === 'payment') {
            html += `<td>${row.date}</td><td>${row.payid}</td><td>${row.dsename}</td><td>₹${row.amount}</td><td>${row.mode}</td>`;
        } else if (type === 'retailer_payment') {
            html += `<td>${row.date}</td><td>${row.payid}</td><td>${row.dsename}</td><td>${row.retailername}</td><td>₹${row.amount}</td><td>${row.mode}</td>`;
        } else if (type === 'stock') {
            html += `<td>${row.date}</td><td>${row.stockid}</td><td>${row.dse}</td>`;
        } else if (type === 'inventory') {
            html += `<td>${row.date}</td><td>${row.inventid}</td><td>${row.dse}</td>`;
        } else if (type === 'purchase') {
            html += `<td>${row.date}</td><td>${row.purchaseid}</td><td>${row.party}</td>`;
        } else if (type === 'puremc') {
            html += `<td>${row.date}</td><td>${row.pureid}</td><td>${row.dsename}</td><td>${row.retailername}</td>`;
        } else if (type === 'expenses') {
            html += `<td>${row.date}</td><td>${row.exid}</td><td>${row.particulars}</td><td>${row.paymode || '-'}</td><td>₹${row.amount}</td><td>${row.pure || '0'}</td><td>${row.description || '-'}</td>`;
        } else if (type === 'petrol') {
            html += `<td>${row.date}</td><td>${row.petid}</td><td>${row.dsename}</td><td>₹${row.amount}</td><td>${row.description || '-'}</td>`;
        }
        html += '</tr>';




        // Nested Row
        if (hasNested) {
            let nestedHtml = '';

            // Handle Item Lists (Sales, Stock, Purchase, PureMC, Inventory)
            if (['sales', 'stock', 'purchase', 'puremc', 'inventory'].includes(type)) {
                if (row.items && row.items.length > 0) {
                    nestedHtml = `<table class="nested-table">
                        <thead>
                            <tr>
                                <th>Item</th><th>Weight</th><th>Count</th>
                                ${type === 'sales' ? '<th>Rate</th><th>Total</th>' : ''}
                                ${['stock', 'inventory'].includes(type) ? '<th>Cover</th>' : ''}
                                ${type === 'purchase' ? '<th>MC</th><th>%</th><th>Pure</th><th>Total</th>' : ''}
                                ${type === 'puremc' ? '<th>MC</th><th>Total</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>`;

                    row.items.forEach(item => {
                        nestedHtml += `<tr>
                            <td>${item.item || item.product || '-'}</td>
                            <td>${item.weight || item.wt || 0}</td>
                            <td>${item.count || 0}</td>
                            ${type === 'sales' ? `<td>${item.rate}</td><td>₹${item.total}</td>` : ''}
                            ${['stock', 'inventory'].includes(type) ? `<td>${item.cover || item.coverwt || 0}</td>` : ''}
                            ${type === 'purchase' ? `<td>${item.mc || 0}</td><td>${item.percent || 0}%</td><td>${item.pure || 0}</td><td>₹${item.totalamount || 0}</td>` : ''}
                            ${type === 'puremc' ? `<td>${item.mc}</td><td>₹${item.total}</td>` : ''}
                        </tr>`;
                    });
                    nestedHtml += `</tbody></table>`;
                } else {
                    nestedHtml = '<p class="text-muted p-2">No items found.</p>';
                }
            }
            // Handle Detail View (Retailer Payment)
            else if (type === 'retailer_payment') {
                nestedHtml = `<div class="detail-view">
                    <p><strong>Silver Weight:</strong> ${row.silverweight || '0'} g</p>
                    <p><strong>Description:</strong> ${row.description || '-'}</p>
                </div>`;
            }

            html += `<tr id="${rowId}" class="detail-row d-none">
                <td colspan="${columns.length + 1}">
                    <div class="nested-container">
                        ${nestedHtml}
                    </div>
                </td>
            </tr>`;
        }
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function toggleDetail(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        if (row.classList.contains('d-none')) {
            row.classList.remove('d-none');
        } else {
            row.classList.add('d-none');
        }
    }
}

// Global Loader for Transaction Tabs
async function loadTransactions(type) {
    const config = {
        'sales': { endpoint: 'view_sales', container: 'sales-data', itemsKey: 'saleItems' },
        'stock': { endpoint: 'view_stock', container: 'stock-data', itemsKey: 'stockItems' },
        'inventory': { endpoint: 'view_inventory', container: 'inventory-data', itemsKey: 'inventoryItems' },
        'purchase': { endpoint: 'view_purchase', container: 'purchases-data', itemsKey: 'purchaseItems' },
        'puremc': { endpoint: 'view_puremc', container: 'puremc-data', itemsKey: 'pureMcItems' }
    }[type];

    if (!config) {
        console.error('Invalid transaction type for loader:', type);
        return;
    }

    const container = document.getElementById(config.container);
    container.innerHTML = 'Loading...';

    try {
        const res = await fetch(`${API_URL}/${config.endpoint}`);
        const data = await res.json();

        if (!Array.isArray(data)) {
            container.innerHTML = '<p class="text-danger">Error loading data.</p>';
            return;
        }

        // Normalize Data: Map specific item keys to 'items'
        data.forEach(row => {
            if (row[config.itemsKey]) {
                row.items = row[config.itemsKey];
            }
        });

        renderSearchResults(type, data, config.container);

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="text-danger">Error loading data.</p>';
    }
}

// ================= REPORT =================

function toggleReportFilters() {
    let type = document.getElementById("reportType").value;
    
    // Clear previous results and show styled placeholder instantly
    const reportResults = document.getElementById("report-results");
    if (reportResults) {
        reportResults.innerHTML = `
            <div class="report-placeholder">
                <i class="fas fa-chart-pie"></i>
                <p>Select report type to view analytical data.</p>
            </div>
        `;
    }
    const exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) exportBtn.classList.add("d-none");

    const dseFilters = document.getElementById("dse-report-filters");
    const retailerFilters = document.getElementById("retailer-report-filters");
    const stockFilters = document.getElementById("dse-stock-report-filters");
    const partyFilters = document.getElementById("party-report-filters");
    const receiveBalanceFilters = document.getElementById("receive-balance-filters");
    const retailerBalanceFilters = document.getElementById("retailer-balance-filters");
    const dseSaleFilters = document.getElementById("dse-sale-report-filters");
    const itemSaleFilters = document.getElementById("item-sale-report-filters");
    const trigger = document.getElementById("report-trigger-container");

    // Hide all first
    if (dseFilters) dseFilters.classList.add("d-none");
    if (retailerFilters) retailerFilters.classList.add("d-none");
    if (stockFilters) stockFilters.classList.add("d-none");
    if (partyFilters) partyFilters.classList.add("d-none");
    if (receiveBalanceFilters) receiveBalanceFilters.classList.add("d-none");
    if (retailerBalanceFilters) retailerBalanceFilters.classList.add("d-none");
    if (dseSaleFilters) dseSaleFilters.classList.add("d-none");
    if (itemSaleFilters) itemSaleFilters.classList.add("d-none");
    if (trigger) trigger.classList.add("d-none");

    if (type === "dse") {
        if (dseFilters) dseFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");

        const select = document.getElementById("reportDseSelect");
        if (select) select.innerHTML = '<option value="">-- Loading DSEs --</option>';

        fetch(`${API_URL}/get_autocomplete_data`)
            .then(res => res.json())
            .then(data => {
                if (data.dse && select) {
                    select.innerHTML = '<option value="">-- Select DSE --</option>' +
                        data.dse.map(d => `<option value="${d}">${d}</option>`).join('');
                }
            })
            .catch(err => console.error("Error loading DSEs:", err));

    } else if (type === "retailer") {
        if (retailerFilters) retailerFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");

        const dseSel = document.getElementById("reportRetailerDse");
        const distSel = document.getElementById("reportRetailerDistrict");
        const retSel = document.getElementById("reportRetailerName");

        if (dseSel) dseSel.innerHTML = '<option value="">-- Loading --</option>';
        if (distSel) distSel.innerHTML = '<option value="">-- Loading --</option>';
        if (retSel) retSel.innerHTML = '<option value="">-- Loading --</option>';

        fetch(`${API_URL}/get_autocomplete_data`)
            .then(res => res.json())
            .then(data => {
                if (dseSel) dseSel.innerHTML = '<option value="">-- All DSE --</option>' + (data.dse || []).map(d => `<option value="${d}">${d}</option>`).join('');
                if (distSel) distSel.innerHTML = '<option value="">-- All Districts --</option>' + (data.district || []).map(d => `<option value="${d}">${d}</option>`).join('');
                if (retSel) retSel.innerHTML = '<option value="">-- All Retailers --</option>' + (data.retailer || []).map(r => `<option value="${r}">${r}</option>`).join('');
            })
            .catch(err => console.error("Error loading filters:", err));
    } else if (type === "dse_stock" || type === "inventory_balance") {
        if (stockFilters) stockFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");

        const stockDse = document.getElementById("reportStockDse");
        if (stockDse) stockDse.innerHTML = '<option value="">-- Loading --</option>';

        fetch(`${API_URL}/get_autocomplete_data`)
            .then(res => res.json())
            .then(data => {
                if (stockDse) stockDse.innerHTML = '<option value="">-- All DSE --</option>' + (data.dse || []).map(d => `<option value="${d}">${d}</option>`).join('');
            })
            .catch(err => console.error("Error loading filters:", err));

        fetchItemList();
    } else if (type === "party") {
        // Show party dropdown immediately when report type is selected
        if (partyFilters) partyFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");
        loadPartyList();
    } else if (type === "receive_balance") {
        if (receiveBalanceFilters) receiveBalanceFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");
        loadDseList();
    } else if (type === "retailer_balance") {
        if (retailerBalanceFilters) retailerBalanceFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");
        loadDseListForRetailerBalance();
    } else if (type === "dse_sale") {
        if (dseSaleFilters) dseSaleFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");
        
        // Set default dates to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        document.getElementById("dseSaleFromDate").value = firstDay;
        document.getElementById("dseSaleToDate").value = lastDay;
    } else if (type === "item_sale") {
        if (itemSaleFilters) itemSaleFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");
        
        // Set default dates to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        document.getElementById("itemSaleFromDate").value = firstDay;
        document.getElementById("itemSaleToDate").value = lastDay;
    }
}

// Load DSE List for Retailer Balance
function loadDseListForRetailerBalance() {
    const dseSelect = document.getElementById("retailerBalanceDseSelect");
    if (!dseSelect) return;

    dseSelect.innerHTML = '<option value="">Loading...</option>';

    fetch(`${API_URL}/get_dse_list`)
        .then(res => res.json())
        .then(data => {
            dseSelect.innerHTML = '<option value="">All DSE</option>' +
                (data || []).map(d => `<option value="${d}">${d}</option>`).join('');
        })
        .catch(err => {
            console.error("Error loading DSE list for Retailer Balance:", err);
            dseSelect.innerHTML = '<option value="">All DSE</option>';
        });
}

// Load DSE List for Receive Balance
function loadDseList() {
    const dseSelect = document.getElementById("dseSelect");
    if (!dseSelect) return;

    dseSelect.innerHTML = '<option value="">Loading...</option>';

    fetch(`${API_URL}/get_dse_list`)
        .then(res => res.json())
        .then(data => {
            dseSelect.innerHTML = '<option value="">All DSE</option>' +
                (data || []).map(d => `<option value="${d}">${d}</option>`).join('');
        })
        .catch(err => {
            console.error("Error loading DSE list:", err);
            dseSelect.innerHTML = '<option value="">All DSE</option>';
        });
}

// Load Report Type
function loadReport() {
    let type = document.getElementById("reportType").value;
    if (type === "dse") {
        fetchDseLedger();
    } else if (type === "retailer") {
        fetchRetailerAnalysis();
    } else if (type === "dse_stock") {
        fetchDseStockBalance();
    } else if (type === "inventory_balance") {
        fetchInventoryBalance();
    } else if (type === "party") {
        fetchPartyReport();
    } else if (type === "receive_balance") {
        const dse = document.getElementById("dseSelect") ? document.getElementById("dseSelect").value : "";
        fetchReceiveBalance(dse);
    } else if (type === "retailer_balance") {
        const dse = document.getElementById("retailerBalanceDseSelect") ? document.getElementById("retailerBalanceDseSelect").value : "";
        fetchRetailerBalance(dse);
    } else if (type === "dse_sale") {
        const from = document.getElementById("dseSaleFromDate").value;
        const to = document.getElementById("dseSaleToDate").value;
        fetchDseSale(from, to);
    } else if (type === "item_sale") {
        const from = document.getElementById("itemSaleFromDate").value;
        const to = document.getElementById("itemSaleToDate").value;
        fetchItemSale(from, to);
    }
}

// Fetch Retailer Analysis
function fetchRetailerAnalysis() {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Retailer Analysis...</p>";

    const dse = document.getElementById("reportRetailerDse").value;
    const district = document.getElementById("reportRetailerDistrict").value;
    const retailer = document.getElementById("reportRetailerName").value;

    let queryParams = new URLSearchParams();
    if (dse) queryParams.append("dse", dse);
    if (district) queryParams.append("district", district);
    if (retailer) queryParams.append("retailer", retailer);

    fetch(`${API_URL}/report_retailer_analysis?${queryParams.toString()}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderRetailerTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        });
}

// Render Retailer Table
function renderRetailerTable(data) {
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>DSE Name</th>
                    <th>Retailer</th>
                    <th>District</th>
                    <th>Balance Due</th>
                    <th>Bal Pure</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        html += `
            <tr>
                <td>${row.dsename || "-"}</td>
                <td>${row.retailername || "-"}</td>
                <td>${row.district || "-"}</td>
                <td>${parseFloat(row.balance_due || 0).toFixed(2)}</td>
                <td><b>${parseFloat(row.bal_pure || 0).toFixed(3)}</b></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
        exportBtn.classList.remove("d-none");
    }
}

// Fetch DSE Ledger
function fetchDseLedger() {
    const dseSelect = document.getElementById("reportDseSelect");
    const dseName = dseSelect ? dseSelect.value : "";
    const fromDate = document.getElementById("reportFromDate") ? document.getElementById("reportFromDate").value : "";
    const toDate = document.getElementById("reportToDate") ? document.getElementById("reportToDate").value : "";

    if (!dseName) {
        alert("Please Select a DSE Name");
        return;
    }

    const queryParams = new URLSearchParams({ dse: dseName });
    if (fromDate) queryParams.append('fromDate', fromDate);
    if (toDate) queryParams.append('toDate', toDate);

    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading...</p>"; // Clear previous and show loading

    fetch(window.location.origin + "/report_dse_ledger?" + queryParams.toString())
        .then(res => {
            if (!res.ok) throw new Error("API Error: " + res.statusText);
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0 || (data.length === 1 && data[0].date === "Opening" && data[0].balance === 0)) {
                reportResults.innerHTML = "<p class='text-muted'>No Data</p>";
                let btn = document.getElementById("export-report-btn");
                if(btn) btn.classList.add("d-none");
                return;
            }
            renderDseTable(data);
        })
        .catch(err => {
            console.error(err);
            reportResults.innerHTML = "<p class='text-danger'>Error fetching data.</p>";
            let btn = document.getElementById("export-report-btn");
            if(btn) btn.classList.add("d-none");
        });
}

// Render Table
function renderDseTable(data) {
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>PayIn</th>
                    <th>PayOut</th>
                    <th>Petrol</th>
                    <th>Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        if (row.date === "Opening") { // Opening Balance Row (Highlighted)
            html += `
            <tr class="opening-row">
                <td>Opening</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><b>${parseFloat(row.balance || 0).toFixed(3)}</b></td>
            </tr>
    `;
        } else {
            html += `
                <tr>
                    <td>${row.date}</td>
                    <td>${row.payin}</td>
                    <td>${row.payout}</td>
                    <td>${row.petrol}</td>
                    <td><b>${row.balance}</b></td>
                </tr>
            `;
        }
    });

    html += `</tbody></table>`;
    renderToReportContainers(html);
    
    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if(exportBtn) exportBtn.classList.remove("d-none");
}

// Fetch DSE Stock Balance
function fetchDseStockBalance() {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Stock Balance...</p>";

    const dse = document.getElementById("reportStockDse").value;
    const item = document.getElementById("reportStockItem").value;

    let queryParams = new URLSearchParams();
    if (dse) queryParams.append("dse", dse);
    if (item) queryParams.append("item", item);

    fetch(`${API_URL}/report_dse_stock?${queryParams.toString()}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderDseStockTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        });
}

// Render DSE Stock Table
function renderDseStockTable(data) {
    let totals = { weight: 0, count: 0, silver: 0 };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>DSE Name</th>
                    <th>Item</th>
                    <th>Weight</th>
                    <th>Count</th>
                    <th>Silver</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        let wt = parseFloat(row.weight || 0);
        let ct = parseInt(row.count || 0);
        let slv = parseFloat(row.silver || 0);

        totals.weight += wt;
        totals.count += ct;
        totals.silver += slv;

        html += `
            <tr>
                <td>${row.dse || "-"}</td>
                <td>${row.item || "-"}</td>
                <td>${wt.toFixed(3)}</td>
                <td>${ct}</td>
                <td>${slv.toFixed(3)}</td>
            </tr>
        `;
    });

    // Totals Row
    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2">TOTALS</td>
                    <td>${totals.weight.toFixed(3)}</td>
                    <td>${totals.count}</td>
                    <td>${totals.silver.toFixed(3)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
        exportBtn.classList.remove("d-none");
    }
}

// Fetch Inventory Balance
function fetchInventoryBalance() {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Inventory Balance...</p>";

    const dse = document.getElementById("reportStockDse").value;
    const item = document.getElementById("reportStockItem").value;

    let queryParams = new URLSearchParams();
    if (item) queryParams.append("item", item);

    fetch(`${API_URL}/report_inventory_balance?${queryParams.toString()}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderInventoryTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        });
}

// Render Inventory Table
function renderInventoryTable(data) {
    let totals = { weight: 0, count: 0, silver: 0 };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Weight</th>
                    <th>Count</th>
                    <th>Silver</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        let wt = parseFloat(row.weight || 0);
        let ct = parseInt(row.count || 0);
        let slv = parseFloat(row.silver || 0);

        totals.weight += wt;
        totals.count += ct;
        totals.silver += slv;

        html += `
            <tr>
                <td>${row.item || "-"}</td>
                <td>${wt.toFixed(3)}</td>
                <td>${ct}</td>
                <td>${slv.toFixed(3)}</td>
            </tr>
        `;
    });

    // Totals Row
    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="1">TOTALS</td>
                    <td>${totals.weight.toFixed(3)}</td>
                    <td>${totals.count}</td>
                    <td>${totals.silver.toFixed(3)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
        exportBtn.classList.remove("d-none");
    }
}

// Fetch Item List for Dropdown
function fetchItemList() {
    const itemSelect = document.getElementById("reportStockItem");
    if (!itemSelect) return;

    itemSelect.innerHTML = '<option value="">-- Loading Items --</option>';

    fetch(`${API_URL}/get_item_list`)
        .then(res => res.json())
        .then(data => {
            itemSelect.innerHTML = '<option value="">All Items</option>' + 
                (data || []).map(item => `<option value="${item}">${item}</option>`).join('');
        })
        .catch(err => {
            console.error("Error fetching items:", err);
            itemSelect.innerHTML = '<option value="">All Items</option>';
        });
}

// Show Party Dropdown (called on "Show Report" button click)
function showPartyDropdown() {
    const partyFilters = document.getElementById("party-report-filters");
    if (partyFilters) partyFilters.classList.remove("d-none");
    loadPartyList();
}

// Load Party List into Dropdown (no auto-fetch)
function loadPartyList() {
    const partySelect = document.getElementById("reportPartySelect");
    if (!partySelect) return;

    partySelect.innerHTML = '<option value="">Loading...</option>';

    fetch(`${API_URL}/get_party_list`)
        .then(res => res.json())
        .then(data => {
            partySelect.innerHTML = '<option value="">All Parties</option>' +
                (data || []).map(p => `<option value="${p}">${p}</option>`).join('');
            // No onchange, no auto-fetch — data loads only on "Show Report" click
        })
        .catch(err => {
            console.error("Error loading party list:", err);
            partySelect.innerHTML = '<option value="">All Parties</option>';
        });
}

// Fetch Party List for Dropdown (legacy - kept for compatibility)
function fetchPartyList() {
    const partySelect = document.getElementById("reportPartySelect");
    if (!partySelect) return;

    partySelect.innerHTML = '<option value="">-- Loading --</option>';

    fetch(`${API_URL}/get_party_list`)
        .then(res => res.json())
        .then(data => {
            partySelect.innerHTML = '<option value="">All Parties</option>' +
                (data || []).map(p => `<option value="${p}">${p}</option>`).join('');
        })
        .catch(err => {
            console.error("Error fetching party list:", err);
            partySelect.innerHTML = '<option value="">All Parties</option>';
        });
}

// Fetch Party Report
function fetchPartyReport() {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Party Report...</p>";

    const showBtn = document.getElementById("show-report-btn");
    if (showBtn) showBtn.disabled = true;

    const partyName = document.getElementById("reportPartySelect").value;

    let queryParams = new URLSearchParams();
    if (partyName) queryParams.append("party", partyName);

    fetch(`${API_URL}/report_party?${queryParams.toString()}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderPartyTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        })
        .finally(() => {
            if (showBtn) showBtn.disabled = false;
        });
}

// Fetch Receive Balance Report
function fetchReceiveBalance(dse = "") {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Receive Balance...</p>";

    const showBtn = document.getElementById("show-report-btn"); // Assuming this is the button or adding common class
    // We can also just use the trigger container button if needed, but let's assume current flow

    let queryParams = new URLSearchParams();
    if (dse) queryParams.append("dse", dse);

    fetch(`${API_URL}/report_receive_balance?${queryParams.toString()}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderReceiveTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        });
}

// Render Receive Balance Table
function renderReceiveTable(data) {
    let totalBalance = 0;

    let rows = data.map(row => {
        let bal = parseFloat(row.balance || 0);
        totalBalance += bal;
        return `
            <tr>
                <td>${row.dsename || "-"}</td>
                <td>${Math.round(bal).toLocaleString()}</td>
            </tr>`;
    }).join('');

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>DSE</th>
                    <th>Balance</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr>
                    <td>TOTAL</td>
                    <td>${Math.round(totalBalance).toLocaleString()}</td>
                </tr>
            </tfoot>
        </table>
    `;

    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) exportBtn.classList.remove("d-none");
}

// Render Party Table
function renderPartyTable(data) {
    let totals = { pure: 0, mc: 0 };

    let rows = data.map(row => {
        let pure = parseFloat(row.pure || 0);
        let mc = parseFloat(row.mc || 0);
        totals.pure += pure;
        totals.mc += mc;
        return `
            <tr>
                <td>${row.partyname || "-"}</td>
                <td>${pure.toFixed(3)}</td>
                <td>${mc.toFixed(2)}</td>
            </tr>`;
    }).join('');

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Party Name</th>
                    <th>Pure</th>
                    <th>MC</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr>
                    <td>TOTALS</td>
                    <td>${totals.pure.toFixed(3)}</td>
                    <td>${totals.mc.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) exportBtn.classList.remove("d-none");
}

// Fetch Retailer Balance Report
function fetchRetailerBalance(dse = "") {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Retailer Balance...</p>";

    const showBtn = document.getElementById("show-report-btn");
    if (showBtn) showBtn.disabled = true;

    let queryParams = new URLSearchParams();
    if (dse) queryParams.append("dse", dse);

    fetch(`${API_URL}/report_retailer_balance?${queryParams.toString()}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderRetailerBalanceTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        })
        .finally(() => {
            if (showBtn) showBtn.disabled = false;
        });
}

// Render Retailer Balance Table
function renderRetailerBalanceTable(data) {
    let totals = { cash: 0, pure: 0 };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>DSE Name</th>
                    <th>Retailer</th>
                    <th>Bal Cash</th>
                    <th>Bal Pure</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        let cash = parseFloat(row.bal_cash || 0);
        let pure = parseFloat(row.bal_pure || 0);

        totals.cash += cash;
        totals.pure += pure;

        html += `
            <tr>
                <td>${row.dsename || "-"}</td>
                <td>${row.retailername || "-"}</td>
                <td>${Math.round(cash).toLocaleString()}</td>
                <td><b>${pure.toFixed(3)}</b></td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2">TOTALS</td>
                    <td>${Math.round(totals.cash).toLocaleString()}</td>
                    <td>${totals.pure.toFixed(3)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
        exportBtn.classList.remove("d-none");
    }
}

// Fetch DSE Sale Report
function fetchDseSale(from, to) {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading DSE Sale Report...</p>";

    const showBtn = document.getElementById("show-report-btn");
    if (showBtn) showBtn.disabled = true;

    fetch(`${API_URL}/report_dse_sale?from=${from}&to=${to}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderDseSaleTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        })
        .finally(() => {
            if (showBtn) showBtn.disabled = false;
        });
}

// Render DSE Sale Table
function renderDseSaleTable(data) {
    let totals = { weight: 0, payin: 0, pure: 0 };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>DSE</th>
                    <th>Weight</th>
                    <th>Payin</th>
                    <th>Pure</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        let weight = parseFloat(row.total_weight || 0);
        let payin = parseFloat(row.total_payin || 0);
        let pure = parseFloat(row.total_pure || 0);

        totals.weight += weight;
        totals.payin += payin;
        totals.pure += pure;

        html += `
            <tr>
                <td>${row.dsename || "-"}</td>
                <td>${weight.toFixed(3)}</td>
                <td>${Math.round(payin).toLocaleString()}</td>
                <td><b>${pure.toFixed(3)}</b></td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td>TOTALS</td>
                    <td>${totals.weight.toFixed(3)}</td>
                    <td>${Math.round(totals.payin).toLocaleString()}</td>
                    <td>${totals.pure.toFixed(3)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
        exportBtn.classList.remove("d-none");
    }
}

// Fetch Item Sale Report
function fetchItemSale(from, to) {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Item Sale Report...</p>";

    const showBtn = document.getElementById("show-report-btn");
    if (showBtn) showBtn.disabled = true;

    fetch(`${API_URL}/report_item_sale?from=${from}&to=${to}`)
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Data Found.</p>";
                let btn = document.getElementById("export-report-btn");
                if (btn) btn.classList.add("d-none");
                return;
            }
            renderItemSaleTable(data);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            reportResults.innerHTML = `<p class='text-danger'><b>Error fetching data:</b> ${err.message}</p>`;
            let btn = document.getElementById("export-report-btn");
            if (btn) btn.classList.add("d-none");
        })
        .finally(() => {
            if (showBtn) showBtn.disabled = false;
        });
}

// Render Item Sale Table
function renderItemSaleTable(data) {
    let totals = { weight: 0, count: 0, amount: 0 };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Weight</th>
                    <th>Count</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        let weight = parseFloat(row.total_weight || 0);
        let count = parseInt(row.total_count || 0);
        let amount = parseFloat(row.total_amount || 0);

        totals.weight += weight;
        totals.count += count;
        totals.amount += amount;

        html += `
            <tr>
                <td>${row.item || "-"}</td>
                <td>${weight.toFixed(3)}</td>
                <td>${count}</td>
                <td>${Math.round(amount).toLocaleString()}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td>TOTAL</td>
                    <td>${totals.weight.toFixed(3)}</td>
                    <td>${totals.count}</td>
                    <td>${Math.round(totals.amount).toLocaleString()}</td>
                </tr>
            </tfoot>
        </table>
    `;

    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
        exportBtn.classList.remove("d-none");
    }
}


