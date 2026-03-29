//const API_URL = 'http://51.20.73.184:3000';
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:" || window.location.hostname === "";
const API_URL = isLocal ? "http://localhost:3000" : "https://jewelleryshop-nk0z.onrender.com";

// Global fetch wrapper for Role-Based Access Control (RBAC)
const originalFetch = window.fetch;
window.fetch = function() {
    let [resource, config] = arguments;
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.Role) {
        if (!config) config = {};
        if (!config.headers) config.headers = {};
        
        if (config.headers instanceof Headers) {
            config.headers.set('X-User-Role', user.Role);
        } else {
            config.headers['X-User-Role'] = user.Role;
        }
    }
    return originalFetch(resource, config);
};
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
 
    // Generate Excel File
    try {
        const wb = XLSX.utils.book_new();
 
        // 1. Sheet 1 - Overview (Clean main table)
        const tableClone = table.cloneNode(true);
        // Remove "Details" toggle columns, buttons, and nested rows
        tableClone.querySelectorAll('button, .btn-toggle, .btn-action, .d-none, .detail-row').forEach(el => el.remove());
        const wsOverview = XLSX.utils.table_to_sheet(tableClone, { raw: true });
        
        // Auto-width for Overview
        applyAutoWidth(wsOverview, tableClone.rows);
        XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");
 
        // 2. Sheet 2 - Itemized Details (Scrape nested tables)
        const detailRows = Array.from(table.querySelectorAll('.detail-row'));
        if (detailRows.length > 0) {
            const detailData = [];
            let detailHeaders = [];
            
            detailRows.forEach(detailRow => {
                const nestedTable = detailRow.querySelector('.nested-table');
                if (!nestedTable) return;
                
                // Identify the Parent Reference ID (e.g., Invoice No or Invent ID)
                // It is typically in the 2nd cell of the preceding main row (after toggle button)
                const mainRow = detailRow.previousElementSibling;
                let parentId = "Unknown";
                if (mainRow && mainRow.cells.length > 1) {
                    // Skip toggle cell (0), take ID cell (1)
                    parentId = mainRow.cells[1].innerText.trim();
                }
 
                // Extract Headers if not already done
                if (detailHeaders.length === 0) {
                    const heads = Array.from(nestedTable.querySelectorAll('thead th')).map(th => th.innerText.trim());
                    detailHeaders = ["Ref ID", ...heads];
                    detailData.push(detailHeaders);
                }
 
                // Extract Body and Footer Rows (Items and their totals)
                const rows = Array.from(nestedTable.querySelectorAll('tbody tr, tfoot tr'));
                rows.forEach(tr => {
                    const firstCellText = (tr.cells[0]?.innerText || "").trim().toUpperCase();
                    // Skip header rows if they are repetitive (RETAILER, ITEM, REF ID)
                    if (["RETAILER", "ITEM", "REF ID"].includes(firstCellText)) return;
                    
                    const rowData = [parentId, ...Array.from(tr.cells).map(td => td.innerText.trim())];
                    detailData.push(rowData);
                });
                // Add a spacer row between different transactions
                detailData.push([]);
            });
 
            if (detailData.length > 1) {
                const wsDetails = XLSX.utils.aoa_to_sheet(detailData);
                // Simple auto-width for Details based on headers/data
                applyAutoWidthFromAOA(wsDetails, detailData);
                XLSX.utils.book_append_sheet(wb, wsDetails, "Itemized Details");
            }
        }
 
        const fileName = `${baseFileName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    } catch (err) {
        console.error("Export Error:", err);
        alert("Export failed: " + err.message);
    }
}
 
// Helper for auto-width from HTML table rows
function applyAutoWidth(ws, rows) {
    if (!rows || rows.length === 0) return;
    const colWidths = [];
    const numCols = rows[0].cells.length;
    for (let i = 0; i < numCols; i++) {
        let maxWidth = 15;
        for (let j = 0; j < rows.length; j++) {
            const row = rows[j];
            if (row.cells && row.cells[i]) {
                const val = row.cells[i].innerText || "";
                if (val.length > maxWidth) maxWidth = Math.min(val.length + 2, 50);
            }
        }
        colWidths.push({ wch: maxWidth });
    }
    ws['!cols'] = colWidths;
}
 
// Helper for auto-width from AOA (Array of Arrays)
function applyAutoWidthFromAOA(ws, aoa) {
    if (!aoa || aoa.length === 0) return;
    const colWidths = [];
    const numCols = aoa[0].length;
    for (let i = 0; i < numCols; i++) {
        let maxWidth = 15;
        for (let j = 0; j < aoa.length; j++) {
            const val = String(aoa[j][i] || "");
            if (val.length > maxWidth) maxWidth = Math.min(val.length + 2, 50);
        }
        colWidths.push({ wch: maxWidth });
    }
    ws['!cols'] = colWidths;
}

// Helper to render report results to both main and dashboard containers
function renderToReportContainers(html) {
    const mainContainer = document.getElementById("report-results");
    const dashboardContainer = document.getElementById("dashboard-report-results");
    if (mainContainer) mainContainer.innerHTML = html;
    if (dashboardContainer) dashboardContainer.innerHTML = html;
}

window.exportToPdf = function(type) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library is not loaded.");
        return;
    }

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

    try {
        const { jsPDF } = window.jspdf;
        
        const head = [];
        const body = [];
        const foot = [];

        // Utility to sanitize text for jsPDF
        // jsPDF Helvetica doesn't support ₹ natively
        const sanitize = (text) => text ? text.replace(/₹/g, 'Rs. ').trim() : '';

        // Extract Headers
        const mainThead = table.tHead;
        let headerCells = [];
        if (mainThead && mainThead.rows.length > 0) {
            headerCells = Array.from(mainThead.rows[0].cells);
        }
        
        const headRow = [];
        const skipColIndices = new Set();
        
        headerCells.forEach((th, idx) => {
            const text = th.innerText.trim().toUpperCase();
            if (text === 'DETAILS' || th.classList.contains('btn-action') || text === 'ACTION' || text === '') {
                skipColIndices.add(idx);
            } else {
                headRow.push(sanitize(th.innerText));
            }
        });
        head.push(headRow);

        // Extract Body
        const mainTbody = table.tBodies[0];
        let trs = [];
        if (mainTbody) {
            trs = Array.from(mainTbody.children);
        }
        
        trs.forEach(tr => {
            if (tr.classList.contains('detail-row')) {
                const nestedTable = tr.querySelector('table');
                if (nestedTable) {
                    // Nested Heads
                    const nHeadCells = Array.from(nestedTable.querySelectorAll('thead th'));
                    if (nHeadCells.length > 0) {
                        const nHeadRow = [];
                        nHeadCells.forEach((th, idx) => {
                            let text = sanitize(th.innerText);
                            if (idx === 0) text = "    ↳ " + text;
                            nHeadRow.push({ content: text, styles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' } });
                        });
                        body.push(nHeadRow);
                    }
                    // Nested Body
                    const nBodyRows = Array.from(nestedTable.querySelectorAll('tbody tr'));
                    nBodyRows.forEach(nr => {
                        const nBodyCol = [];
                        Array.from(nr.cells).forEach((td, idx) => {
                            let text = sanitize(td.innerText);
                            if (idx === 0) text = "        " + text;
                            nBodyCol.push({ content: text, styles: { textColor: [100, 116, 139] } });
                        });
                        body.push(nBodyCol);
                    });
                    // Nested Foot
                    const nFootRows = Array.from(nestedTable.querySelectorAll('tfoot tr'));
                    nFootRows.forEach(nr => {
                        const nFootCol = [];
                        Array.from(nr.cells).forEach((td, idx) => {
                            let text = sanitize(td.innerText);
                            if (idx === 0) text = "    " + text;
                            nFootCol.push({ content: text, styles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold' } });
                        });
                        body.push(nFootCol);
                    });
                }
            } else {
                // Main Row
                const rowData = [];
                Array.from(tr.cells).forEach((td, idx) => {
                    if (!skipColIndices.has(idx)) {
                        rowData.push(sanitize(td.innerText));
                    }
                });
                body.push(rowData);
            }
        });

        // Extract Footer
        const tfoot = table.tFoot;
        if (tfoot) {
            Array.from(tfoot.children).forEach(tr => {
                const footRow = [];
                Array.from(tr.cells).forEach((td, idx) => {
                    let content = sanitize(td.innerText);
                    let colSpan = td.colSpan || 1;
                    
                    if (idx === 0 && skipColIndices.has(0)) {
                         colSpan -= 1;
                         if (colSpan <= 0) return;
                    }
                    footRow.push({ content: content, colSpan: colSpan });
                });
                foot.push(footRow);
            });
        }

        // Determine Orientation
        let orientation = 'p';
        let maxCols = head[0].length;
        if (body.length > 0) {
            maxCols = Math.max(maxCols, ...body.map(row => row.length));
        }
        if (maxCols > 6) {
             orientation = 'l';
        }

        const doc = new jsPDF(orientation, 'pt', 'a4');

        doc.autoTable({
            head: head,
            body: body,
            foot: foot,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [30, 41, 59] },
            footStyles: { fillColor: [245, 243, 255], textColor: [67, 56, 202], fontStyle: 'bold' }
        });

        const fileName = `${baseFileName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    } catch (err) {
        console.error("PDF Export Error:", err);
        alert("Export failed: " + err.message);
    }
};

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

    // Apply Role-Based Access Control for Sidebar and Dashboard
    if (user.Role === 'office') {
        const allowedKeywords = ['dashboard', 'advanced_search', 'reports'];
        
        // Hide sidebar menu items not in allowedKeywords
        const sidebarLinks = document.querySelectorAll('.sidebar-menu li a');
        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href').substring(1);
            if (!allowedKeywords.includes(href)) {
                link.parentElement.classList.add('d-none');
            }
        });
        
        // Hide menu headers
        document.querySelectorAll('.menu-header').forEach(header => {
            header.classList.add('d-none');
        });

        // Dashboard Card Restrictions
        const cardsToHide = ['dashboard-cash-in-hand', 'stat-total-users'];
        cardsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const card = el.closest('.stat-card');
                if (card) {
                    card.style.setProperty('display', 'none', 'important');
                    card.classList.add('d-none');
                }
            }
        });

        // Hide Purchase, Party and Tally in dropdowns
        const hideOptions = (selectId, values) => {
            const select = document.getElementById(selectId);
            if (select) {
                values.forEach(val => {
                    const opt = select.querySelector(`option[value="${val}"]`);
                    if (opt) opt.remove();
                });
            }
        };

        hideOptions('searchType', ['purchase']);
        hideOptions('reportType', ['party', 'tally_report']);

        // Hide Party filter in search
        const partyFilter = document.getElementById('filter-party-group');
        if (partyFilter) partyFilter.style.display = 'none';
    }

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
    const user = JSON.parse(localStorage.getItem('user'));
    const allowedForOffice = ['dashboard', 'advanced_search', 'reports'];
    
    if (user && user.Role === 'office' && !allowedForOffice.includes(sectionId)) {
        alert("Access Denied: You do not have permission to access this section.");
        window.location.hash = '#dashboard';
        return;
    }

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
                if (typeof val === 'object') val = JSON.stringify(val);
                
                if (col.toLowerCase() === 'password') {
                    html += `<td>
                        <span class="password-text" data-password="${val}">••••••</span>
                        <i class="fas fa-eye-slash toggle-btn" onclick="togglePassword(this)" style="cursor: pointer; margin-left: 10px; color: #6366f1;"></i>
                    </td>`;
                } else {
                    html += `<td>${val}</td>`;
                }
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

// New Helper for Password Toggling
function togglePassword(el) {
    const span = el.previousElementSibling;
    const isHidden = span.textContent === '••••••';
    if (isHidden) {
        span.textContent = span.getAttribute('data-password');
        el.classList.remove('fa-eye-slash');
        el.classList.add('fa-eye');
    } else {
        span.textContent = '••••••';
        el.classList.remove('fa-eye');
        el.classList.add('fa-eye-slash');
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
        const itemNameGroup = document.getElementById('filter-item-name');
        const payModeGroup = document.getElementById('filter-pay-mode');

        // Reset visibility
        dseGroup.style.display = 'block';
        retailerGroup.style.display = 'block';
        partyGroup.style.display = 'none';
        itemNameGroup.style.display = 'block';
        payModeGroup.style.display = 'none';

        if (type === 'payment') {
            retailerGroup.style.display = 'none'; // DSE Payments don't have retailer
            itemNameGroup.style.display = 'none'; // Payments don't have items
            payModeGroup.style.display = 'block'; // Show Pay Mode instead
        } else if (type === 'retailer_payment') {
            itemNameGroup.style.display = 'none'; // Retailer Payments don't have items
            payModeGroup.style.display = 'block'; // Show Pay Mode instead
        } else if (type === 'expenses') {
            dseGroup.style.display = 'none';
            retailerGroup.style.display = 'none';
            payModeGroup.style.display = 'block'; // Expenses also have paymode
            itemNameGroup.style.display = 'none';
        } else if (type === 'purchase') {
            dseGroup.style.display = 'none';
            retailerGroup.style.display = 'none';
            partyGroup.style.display = 'block';
        } else if (type === 'stock') {
            retailerGroup.style.display = 'none';
        } else if (type === 'inventory') {
            retailerGroup.style.display = 'none';
        } else if (type === 'petrol') {
            retailerGroup.style.display = 'none';
            itemNameGroup.style.display = 'none';
        } else if (type === 'party_payout') {
            dseGroup.style.display = 'none';
            retailerGroup.style.display = 'none';
            itemNameGroup.style.display = 'none';
            partyGroup.style.display = 'block';
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
        payMode: document.getElementById('searchPayMode').value,
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

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Server Error: ${response.status}`);
        }

        renderSearchResults(type, data);

        // Show export button for search results
        const exportBtn = document.getElementById('export-search-btn');
        if (exportBtn) {
            exportBtn.classList.remove('d-none');
            exportBtn.onclick = () => exportToExcel('search'); // Correctly point to search container
        }

    } catch (error) {
        console.error('Search error:', error);
        container.innerHTML = `<p class="error-msg">Error: ${error.message}</p>`;
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
    const user = JSON.parse(localStorage.getItem('user'));
    const isOffice = user && user.Role === 'office';

    if (type === 'sales') columns = ['Date', 'Invoice Number', 'DSE', 'Retailer', 'Final Total'];
    else if (type === 'payment') columns = ['Date', 'DSE Name', 'Payment Mode', 'Amount'];
    else if (type === 'retailer_payment') columns = ['Date', 'DSE', 'Retailer', 'Mode', 'Amount', 'Silver Weight', 'Pure', 'Pure Cash'];
    else if (type === 'stock') columns = ['Date', 'Stock ID', 'DSE'];
    else if (type === 'inventory') columns = ['Date', 'Invent ID', 'DSE'];
    else if (type === 'purchase') columns = isOffice ? ['Date', 'Purchase ID'] : ['Date', 'Purchase ID', 'Party'];
    else if (type === 'puremc') columns = ['Date', 'Pure ID', 'DSE', 'Retailer'];
    else if (type === 'expenses') columns = ['Date', 'Ex ID', 'Particulars', 'Pay Mode', 'Amount', 'Pure', 'Description'];
    else if (type === 'petrol') columns = ['Date', 'DSE Name', 'Description', 'Amount'];
    else if (type === 'party_payout') columns = ['Date', 'Party Name', 'Pure', 'MC'];

    const colClasses = {
        'Date': 'text-left', 'DSE': 'text-left col-dsename', 'DSE Name': 'text-left col-dsename', 
        'Retailer': 'text-left col-retailer', 'Amount': 'text-right', 'Final Total': 'text-right',
        'Invoice Number': 'text-left', 'Stock ID': 'col-id text-left', 'Invent ID': 'col-id text-left',
        'Purchase ID': 'col-id text-left', 'Pure ID': 'col-id text-left', 'Ex ID': 'col-id text-left',
        'Description': 'text-left', 'Particulars': 'text-left', 'Pay Mode': 'text-left',
        'Mode': 'text-left', 'Payment Mode': 'text-left', 'Silver Weight': 'text-right col-narrow',
        'Pure': 'text-right col-narrow', 'Pure Cash': 'text-right', 'Party': 'text-left col-name',
        'Party Name': 'text-left col-name', 'Payout No': 'col-id text-left', 'MC': 'text-right',
        'Weight': 'text-right', 'Count': 'text-right', 'CoverWt': 'text-right', 'Item': 'text-left'
    };

    let html = '<table class="data-table"><thead><tr>';

    // Check if Type supports Nested Grid (Sales and Retailer Payment removed for clean overview)
    const hasNested = ['sales', 'stock', 'purchase', 'puremc', 'inventory'].includes(type);
    if (hasNested) html += '<th class="text-center" style="width: 50px;">Details</th>';

    columns.forEach(col => {
        const cls = colClasses[col] || '';
        html += `<th class="${cls}">${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    let petrolTotal = 0;
    let paymentTotal = 0;
    let salesTotalSum = 0;
    let retailerPaymentTotal = { amount: 0, silver: 0, pure: 0, pureCash: 0 };
    let pureTotalSum = 0;
    let mcTotalSum = 0;
    let grandStockTotal = { weight: 0, count: 0, silver: 0, cover: 0 };
    let grandInventoryTotal = { weight: 0, count: 0, silver: 0, cover: 0 };
    let grandPurchaseTotal = { weight: 0, count: 0, mc: 0, pure: 0, total: 0 };
    let grandPureMCTotal = { weight: 0, count: 0, mc: 0, pure: 0, total: 0 };
    let expensesTotal = { amount: 0, pure: 0 };

    data.forEach((row, index) => {
        const rowId = `${type}-row-${index}`;
        html += `<tr class="main-row">`;

        if (hasNested) {
            html += `<td><button class="btn-toggle" onclick="toggleDetail('${rowId}')"><i class="fas fa-plus-circle"></i></button></td>`;
        }

        if (type === 'sales') {
            const finalTotal = parseFloat(row.finaltotal || 0);
            salesTotalSum += finalTotal;
            html += `<td class="text-left">${row.date || '-'}</td><td class="text-left">${row.invno || '-'}</td><td class="text-left col-dsename">${row.dse || '-'}</td><td class="text-left col-retailer">${row.retailer || '-'}</td><td class="text-right">₹${finalTotal.toLocaleString()}</td>`;
        } else if (type === 'payment') {
            const amt = parseFloat(row.amount || 0);
            paymentTotal += amt;
            html += `<td class="text-left">${row.date || '-'}</td><td class="text-left col-dsename">${row.dsename || '-'}</td><td class="text-left">${row.mode || '-'}</td><td class="text-right">₹${amt.toLocaleString()}</td>`;
        } else if (type === 'retailer_payment') {
            const amt = parseFloat(row.amount || 0);
            const sil = parseFloat(row.silverweight || 0);
            const pur = parseFloat(row.pure || 0);
            const pc = parseFloat(row.purecash || 0);
            retailerPaymentTotal.amount += amt;
            retailerPaymentTotal.silver += sil;
            retailerPaymentTotal.pure += pur;
            retailerPaymentTotal.pureCash += pc;
            html += `<td class="text-left">${row.date || '-'}</td><td class="text-left col-dsename">${row.dsename || '-'}</td><td class="text-left col-retailer">${row.retailername || '-'}</td><td class="text-left">${row.mode || '-'}</td><td class="text-right">₹${amt.toLocaleString()}</td><td class="text-right col-narrow">${sil.toFixed(3)}</td><td class="text-right col-narrow">${pur.toFixed(3)}</td><td class="text-right">₹${pc.toLocaleString()}</td>`;
        } else if (type === 'stock') {
            let wtSum = 0, ctSum = 0, svSum = 0, cvSum = 0;
            if (row.items) {
                row.items.forEach(it => {
                    const gwt = parseFloat(it.wt || it.weight || 0);
                    const nwt = parseFloat(it.withcoverwt || it.cover || it.coverwt || 0);
                    wtSum += gwt;
                    ctSum += parseInt(it.count || 0);
                    svSum += nwt;
                    cvSum += Math.max(0, gwt - nwt);
                });
            }
            grandStockTotal.weight += wtSum;
            grandStockTotal.count += ctSum;
            grandStockTotal.silver += svSum;
            grandStockTotal.cover += cvSum;
            html += `<td class="text-left">${row.date}</td><td class="col-id text-left">${row.stockid}</td><td class="text-left col-dsename">${row.dse}</td>`;
        } else if (type === 'inventory') {
            let wtSum = 0, ctSum = 0, svSum = 0, cvSum = 0;
            if (row.items) {
                row.items.forEach(it => {
                    const gwt = parseFloat(it.wt || it.weight || 0);
                    const nwt = parseFloat(it.withcoverwt || it.cover || it.coverwt || 0);
                    wtSum += gwt;
                    ctSum += parseInt(it.count || 0);
                    svSum += nwt;
                    cvSum += Math.max(0, gwt - nwt);
                });
            }
            grandInventoryTotal.weight += wtSum;
            grandInventoryTotal.count += ctSum;
            grandInventoryTotal.silver += svSum;
            grandInventoryTotal.cover += cvSum;
            html += `<td class="text-left">${row.date}</td><td class="col-id text-left">${row.inventid}</td><td class="text-left col-dsename">${row.dse}</td>`;
        } else if (type === 'purchase') {
            let wtS = 0, ctS = 0, mcS = 0, prS = 0, totS = 0;
            if (row.items) {
                row.items.forEach(it => {
                    wtS += parseFloat(it.wt || it.weight || 0);
                    ctS += parseInt(it.count || 0);
                    mcS += parseFloat(it.mc || 0);
                    prS += parseFloat(it.pure || 0);
                    totS += parseFloat(it.total || it.totalamount || 0);
                });
            }
            grandPurchaseTotal.weight += wtS;
            grandPurchaseTotal.count += ctS;
            grandPurchaseTotal.mc += mcS;
            grandPurchaseTotal.pure += prS;
            grandPurchaseTotal.total += totS;
            html += `<td class="text-left">${row.date}</td><td class="col-id text-left">${row.purchaseid}</td>${isOffice ? '' : `<td class="text-left col-name">${row.party}</td>`}`;
        } else if (type === 'puremc') {
            let wtS = 0, ctS = 0, mcS = 0, prS = 0, totS = 0;
            if (row.items) {
                row.items.forEach(it => {
                    wtS += parseFloat(it.wt || it.weight || 0);
                    ctS += parseInt(it.count || 0);
                    mcS += parseFloat(it.mc || 0);
                    prS += parseFloat(it.pure || 0);
                    totS += parseFloat(it.total || it.totalamount || 0);
                });
            }
            grandPureMCTotal.weight += wtS;
            grandPureMCTotal.count += ctS;
            grandPureMCTotal.mc += mcS;
            grandPureMCTotal.pure += prS;
            grandPureMCTotal.total += totS;
            html += `<td class="text-left">${row.date}</td><td class="col-id text-left">${row.pureid}</td><td class="text-left col-dsename">${row.dsename}</td><td class="text-left col-retailer">${row.retailername}</td>`;
        } else if (type === 'expenses') {
            const expAmt = parseFloat(row.amount || 0);
            const expPure = parseFloat(row.pure || 0);
            expensesTotal.amount += expAmt;
            expensesTotal.pure += expPure;
            html += `<td class="text-left">${row.date}</td><td class="col-id text-left">${row.exid}</td><td class="text-left">${row.particulars}</td><td class="text-left">${row.paymode || '-'}</td><td class="text-right">₹${expAmt.toFixed(2)}</td><td class="text-right col-narrow">${expPure.toFixed(3)}</td><td class="text-left">${row.description || '-'}</td>`;
        } else if (type === 'petrol') {
            const petAmt = parseFloat(row.amount || 0);
            petrolTotal += petAmt;
            html += `<td class="text-left">${row.date || '-'}</td><td class="text-left col-dsename">${row.dsename || '-'}</td><td class="text-left">${row.description || '-'}</td><td class="text-right">₹${petAmt.toLocaleString()}</td>`;
        } else if (type === 'party_payout') {
            const pureVal = parseFloat(row.pure || 0);
            const mcVal = parseFloat(row.mc || 0);
            pureTotalSum += pureVal;
            mcTotalSum += mcVal;
            html += `<td class="text-left">${row.date}</td><td class="text-left col-name">${row.partyname}</td><td class="text-right col-narrow">${pureVal.toFixed(3)}</td><td class="text-right">${row.mc || 0}</td>`;
        }
        html += '</tr>';

        if (hasNested) {
            let nestedHtml = '';
            if (['sales', 'stock', 'purchase', 'puremc', 'inventory'].includes(type)) {
                if (row.items && row.items.length > 0) {
                    let itemTotals = { totalWt: 0, count: 0, amount: 0, cover: 0, withCover: 0, mc: 0, pure: 0 };
                    
                    nestedHtml = `<table class="nested-table" style="font-size: 12px; width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                ${['sales', 'puremc'].includes(type) ? '<th style="text-align: left; min-width: 140px;">Retailer</th>' : ''}
                                <th style="text-align: left; min-width: 110px; white-space: nowrap;">Item</th>
                                <th class="text-center" style="min-width: 75px; white-space: nowrap;">Weight</th>
                                <th class="text-center" style="min-width: 55px; white-space: nowrap;">Count</th>
                                ${type === 'sales' ? '<th class="text-right" style="min-width: 80px; white-space: nowrap;">Rate</th><th class="text-right" style="min-width: 100px; white-space: nowrap;">Total</th>' : ''}
                                ${['stock', 'inventory'].includes(type) ? '<th class="text-center" style="min-width: 80px; white-space: nowrap;">Silver</th><th class="text-center" style="min-width: 80px; white-space: nowrap;">Cover</th>' : ''}
                                ${type === 'purchase' ? '<th class="text-right" style="min-width: 80px; white-space: nowrap;">MC</th><th class="text-center" style="min-width: 65px; white-space: nowrap;">%</th><th class="text-right" style="min-width: 80px; white-space: nowrap;">Pure</th><th class="text-right" style="min-width: 110px; white-space: nowrap;">Total</th>' : ''}
                                ${type === 'puremc' ? '<th class="text-right" style="min-width: 80px; white-space: nowrap;">MC</th><th class="text-center" style="min-width: 65px; white-space: nowrap;">%</th><th class="text-right" style="min-width: 80px; white-space: nowrap;">Pure</th><th class="text-right" style="min-width: 110px; white-space: nowrap;">Total</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>`;
 
                    row.items.forEach(item => {
                        const grossWeight = parseFloat(item.weight || item.wt || 0); // Primary weight (e.g. 101.6)
                        const netWeight = parseFloat(item.cover || item.coverwt || item.withcoverwt || 0); // Automatic value (e.g. 100)
                        const ct = parseInt(item.count || 0);
                        const amt = parseFloat(item.total || item.totalamount || 0);
                        const coverWeight = Math.max(0, grossWeight - netWeight);
                        const mcVal = parseFloat(item.mc || 0);
                        const pureVal = parseFloat(item.pure || 0);

                        itemTotals.totalWt += grossWeight;
                        itemTotals.count += ct;
                        itemTotals.amount += amt;
                        itemTotals.withCover += netWeight; // Displayed as With Cover Weight per user request
                        itemTotals.cover += coverWeight;
                        itemTotals.mc += mcVal;
                        itemTotals.pure += pureVal;

                        nestedHtml += `<tr>
                            ${['sales', 'puremc'].includes(type) ? `<td>${(row.retailer || row.retailername || '-').replace(',', ',<br>')}</td>` : ''}
                            <td style="white-space: nowrap;">${item.item || item.product || '-'}</td>
                            <td class="text-center" style="white-space: nowrap;">${grossWeight.toFixed(3)}</td>
                            <td class="text-center" style="white-space: nowrap;">${ct}</td>
                            ${type === 'sales' ? `<td class="text-right" style="white-space: nowrap;">${item.rate}</td><td class="text-right" style="white-space: nowrap;">₹${amt.toFixed(2)}</td>` : ''}
                            ${['stock', 'inventory'].includes(type) ? `<td class="text-center" style="white-space: nowrap;">${netWeight.toFixed(3)}</td><td class="text-center" style="white-space: nowrap;">${coverWeight.toFixed(3)}</td>` : ''}
                            ${type === 'purchase' ? `<td class="text-right" style="white-space: nowrap;">₹${mcVal.toFixed(2)}</td><td class="text-center">${item.percent || 0}%</td><td class="text-right" style="white-space: nowrap;">${pureVal.toFixed(3)}</td><td class="text-right" style="white-space: nowrap;">₹${amt.toFixed(2)}</td>` : ''}
                            ${type === 'puremc' ? `<td class="text-right" style="white-space: nowrap;">₹${mcVal.toFixed(2)}</td><td class="text-center">${item.percent || 0}%</td><td class="text-right" style="white-space: nowrap;">${pureVal.toFixed(3)}</td><td class="text-right" style="white-space: nowrap;">₹${amt.toFixed(2)}</td>` : ''}
                        </tr>`;
                    });

                    // Add summary row for Sales, Stock, Inventory, Purchase, and PureMC
                    if (['sales', 'stock', 'inventory', 'purchase', 'puremc'].includes(type) && row.items.length > 0) {
                        nestedHtml += `
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                                <td style="text-align: left;">TOTAL</td>
                                ${['sales', 'puremc'].includes(type) ? '<td></td>' : ''}
                                <td class="text-center" style="white-space: nowrap;">${itemTotals.totalWt.toFixed(3)}</td>
                                <td class="text-center" style="white-space: nowrap;">${itemTotals.count}</td>
                                ${type === 'sales' ? `<td></td><td class="text-right" style="white-space: nowrap;">₹${itemTotals.amount.toFixed(2)}</td>` : ''}
                                ${['stock', 'inventory'].includes(type) ? `<td class="text-center" style="white-space: nowrap;">${itemTotals.withCover.toFixed(3)}</td><td class="text-center" style="white-space: nowrap;">${itemTotals.cover.toFixed(3)}</td>` : ''}
                                ${type === 'purchase' ? `<td class="text-right" style="white-space: nowrap;">₹${itemTotals.mc.toFixed(2)}</td><td></td><td class="text-right" style="white-space: nowrap;">${itemTotals.pure.toFixed(3)}</td><td class="text-right" style="white-space: nowrap;">₹${itemTotals.amount.toFixed(2)}</td>` : ''}
                                ${type === 'puremc' ? `<td class="text-right" style="white-space: nowrap;">₹${itemTotals.mc.toFixed(2)}</td><td></td><td class="text-right" style="white-space: nowrap;">${itemTotals.pure.toFixed(3)}</td><td class="text-right" style="white-space: nowrap;">₹${itemTotals.amount.toFixed(2)}</td>` : ''}
                            </tr>
                        </tfoot>`;
                    }
                    nestedHtml += `</table>`;
                } else {
                    nestedHtml = '<p class="text-muted p-2">No items found.</p>';
                }
            } else if (type === 'retailer_payment') {
                nestedHtml = `<div class="detail-view"><p class="text-muted">No additional details available for this payment.</p></div>`;
            }

            html += `<tr id="${rowId}" class="detail-row d-none">
                <td colspan="${columns.length + 1}">
                    <div class="nested-container">${nestedHtml}</div>
                </td>
            </tr>`;
        }
    });

    if (type === 'petrol' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-right">₹${petrolTotal.toFixed(2)}</td>
            </tr>
        </tfoot>`;
    } else if (type === 'expenses' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td colspan="4" class="text-left">TOTAL</td>
                <td class="text-right">₹${expensesTotal.amount.toFixed(2)}</td>
                <td class="text-right col-narrow">${expensesTotal.pure.toFixed(3)}</td>
                <td></td>
            </tr>
        </tfoot>`;
    } else if (type === 'payment' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-right">₹${paymentTotal.toFixed(2)}</td>
            </tr>
        </tfoot>`;
    } else if (type === 'retailer_payment' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td colspan="4" class="text-left">TOTAL</td>
                <td class="text-right">₹${retailerPaymentTotal.amount.toLocaleString()}</td>
                <td class="text-right col-narrow">${retailerPaymentTotal.silver.toFixed(3)}</td>
                <td class="text-right col-narrow">${retailerPaymentTotal.pure.toFixed(3)}</td>
                <td class="text-right">₹${retailerPaymentTotal.pureCash.toLocaleString()}</td>
            </tr>
        </tfoot>`;
    } else if (type === 'sales' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td colspan="5" class="text-left">TOTAL</td>
                <td class="text-right">₹${salesTotalSum.toLocaleString()}</td>
            </tr>
        </tfoot>`;
    } else if (type === 'party_payout' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td colspan="2" class="text-left">TOTAL</td>
                <td class="text-right col-narrow">${pureTotalSum.toFixed(3)}</td>
                <td class="text-right">${mcTotalSum.toLocaleString()}</td>
            </tr>
        </tfoot>`;
    } else if (type === 'stock' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td class="text-left"><span style="color: #6366f1;">TOTAL</span></td>
                <td class="text-right">Weight: ${grandStockTotal.weight.toFixed(3)}</td>
                <td class="text-right">Count: ${grandStockTotal.count}</td>
                <td class="text-right">Silver: ${grandStockTotal.silver.toFixed(3)} / Cover: ${grandStockTotal.cover.toFixed(3)}</td>
            </tr>
        </tfoot>`;
    } else if (type === 'inventory' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td class="text-left"><span style="color: #6366f1;">TOTAL</span></td>
                <td class="text-right">Weight: ${grandInventoryTotal.weight.toFixed(3)}</td>
                <td class="text-right">Count: ${grandInventoryTotal.count}</td>
                <td class="text-right">Silver: ${grandInventoryTotal.silver.toFixed(3)} / Cover: ${grandInventoryTotal.cover.toFixed(3)}</td>
            </tr>
        </tfoot>`;
    } else if (type === 'purchase' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td class="text-left"><span style="color: #6366f1;">TOTAL</span></td>
                <td class="text-right">Weight: ${grandPurchaseTotal.weight.toFixed(3)}</td>
                ${isOffice ? '' : `<td class="text-right">Count: ${grandPurchaseTotal.count}</td>`}
                <td class="text-right">
                    ${isOffice ? `Count: ${grandPurchaseTotal.count} | ` : ''}
                    MC: ₹${grandPurchaseTotal.mc.toLocaleString()} | Pure: ${grandPurchaseTotal.pure.toFixed(3)} | Total: ₹${grandPurchaseTotal.total.toLocaleString()}
                </td>
            </tr>
        </tfoot>`;
    } else if (type === 'puremc' && data.length > 0) {
        html += `</tbody>
        <tfoot class="total-row">
            <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                <td class="text-left"><span style="color: #6366f1;">TOTAL</span></td>
                <td class="text-right">Weight: ${grandPureMCTotal.weight.toFixed(3)}</td>
                <td class="text-right">Count: ${grandPureMCTotal.count}</td>
                <td class="text-right">MC: ₹${grandPureMCTotal.mc.toLocaleString()} | Pure: ${grandPureMCTotal.pure.toFixed(3)}</td>
                <td class="text-right">Total: ₹${grandPureMCTotal.total.toLocaleString()}</td>
            </tr>
        </tfoot>`;
    } else {
        html += '</tbody>';
    }

    html += '</table>';
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
let retailerAnalysisData = [];
let originalRetailerData = [];
let retailerSortState = { field: '', order: 'none' }; 

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
    const retailerLedgerFilters = document.getElementById("retailer-ledger-filters");
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
    if (retailerLedgerFilters) retailerLedgerFilters.classList.add("d-none");
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

    } else if (type === "retailer_ledger") {
        if (retailerLedgerFilters) retailerLedgerFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");

        const retDl = document.getElementById("ledgerRetailerList");
        if (retDl) retDl.innerHTML = '';

        fetch(`${API_URL}/get_autocomplete_data`)
            .then(res => res.json())
            .then(data => {
                if (retDl) retDl.innerHTML = (data.retailer || []).map(r => `<option value="${r}">${r}</option>`).join('');
            })
            .catch(err => console.error("Error loading ledger filters:", err));

    } else if (type === "retailer") {
        if (retailerFilters) retailerFilters.classList.remove("d-none");
        if (trigger) trigger.classList.remove("d-none");

        const dseSel = document.getElementById("reportRetailerDse");
        const distSel = document.getElementById("reportRetailerDistrict");
        const retInput = document.getElementById("reportRetailerName");
        const retDl = document.getElementById("reportRetailerList");

        if (dseSel) dseSel.innerHTML = '<option value="">-- Loading --</option>';
        if (distSel) distSel.innerHTML = '<option value="">-- Loading --</option>';
        if (retInput) retInput.value = '';
        if (retDl) retDl.innerHTML = '';

        fetch(`${API_URL}/get_autocomplete_data`)
            .then(res => res.json())
            .then(data => {
                if (dseSel) dseSel.innerHTML = '<option value="">-- All DSE --</option>' + (data.dse || []).map(d => `<option value="${d}">${d}</option>`).join('');
                if (distSel) distSel.innerHTML = '<option value="">-- All Districts --</option>' + (data.district || []).map(d => `<option value="${d}">${d}</option>`).join('');
                if (retDl) retDl.innerHTML = (data.retailer || []).map(r => `<option value="${r}">${r}</option>`).join('');
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
    } else if (type === "tally_report") {
        // Tally Report doesn't need date filters based on requirements
        if (trigger) trigger.classList.remove("d-none");
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
    } else if (type === "retailer_ledger") {
        fetchRetailerLedger();
    } else if (type === "tally_report") {
        fetchTallyReport();
    }
}

// Fetch Retailer Ledger
function fetchRetailerLedger() {
    const reportResults = document.getElementById("report-results");
    const retailer = document.getElementById("ledgerRetailerName").value;
    const fromDate = document.getElementById("ledgerFromDate").value;
    const toDate = document.getElementById("ledgerToDate").value;

    if (!retailer) {
        alert("Please select a Retailer first.");
        return;
    }

    reportResults.innerHTML = "<p>Loading Retailer Ledger...</p>";

    let queryParams = new URLSearchParams();
    queryParams.append("retailer", retailer);
    if (fromDate) queryParams.append("fromDate", fromDate);
    if (toDate) queryParams.append("toDate", toDate);

    fetch(`${API_URL}/report_retailer_ledger?${queryParams.toString()}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch ledger");
            return res.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                reportResults.innerHTML = "<p class='text-muted'>No Ledger Records Found for this Retailer.</p>";
                return;
            }
            renderRetailerLedgerTable(data);
        })
        .catch(err => {
            console.error("Ledger Error:", err);
            reportResults.innerHTML = `<p class='text-danger'>Error: ${err.message}</p>`;
        });
}

function renderRetailerLedgerTable(data) {
    let html = `
        <table class="data-table" style="font-size: 11px; width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background-color: #1e293b; color: #ffffff;">
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: left;">DATE</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: left;">TYPE</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 80px;">SALE AMT</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 70px;">SALE PURE</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 80px;">RECEIVED</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 70px;">REC PURE</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 70px;">PURECASH</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: left; min-width: 80px;">MODE</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 70px;">SILVER</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 90px;">BAL DUE</th>
                    <th style="white-space: nowrap; padding: 8px 10px; text-align: right; min-width: 90px;">BAL PURE</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        const isOpening = row.type === 'Opening';
        const rowStyle = isOpening ? 'style="background-color: #f8fafc; font-weight: bold; border-bottom: 2px solid #e2e8f0;"' : '';
        
        html += `
            <tr ${rowStyle}>
                <td style="white-space: nowrap; padding: 6px 10px;">${row.date}</td>
                <td style="white-space: nowrap; padding: 6px 10px;"><span class="badge ${getBadgeClass(row.type)}" style="font-size: 10px; padding: 2px 6px;">${row.type}</span></td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px;">${parseFloat(row.saleAmt || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px;">${parseFloat(row.salePure || 0).toFixed(3)}</td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px;">${parseFloat(row.recCash || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px;">${parseFloat(row.recPure || 0).toFixed(3)}</td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px;">${parseFloat(row.pureCash || 0).toFixed(3)}</td>
                <td style="white-space: nowrap; padding: 6px 10px;">${row.mode || "-"}</td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px;">${parseFloat(row.silver || 0).toFixed(3)}</td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px; color: #4338ca; font-weight: bold;">₹${parseFloat(row.balDue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="white-space: nowrap; padding: 6px 10px; color: #059669; font-weight: bold;">${parseFloat(row.balPure || 0).toFixed(3)} g</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = html;

    const exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) exportBtn.classList.remove("d-none");
}

function getBadgeClass(type) {
    switch (type) {
        case 'Opening': return 'badge-secondary';
        case 'Sale': return 'badge-success';
        case 'PureMC': return 'badge-info';
        case 'Payment-In': return 'badge-warning';
        default: return 'badge-light';
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
            retailerAnalysisData = [...data];
            originalRetailerData = [...data];
            retailerSortState = { field: '', order: 'none' };
            renderRetailerTable(retailerAnalysisData);
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
    let totalBalanceDue = 0;
    let totalBalPure = 0;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>DSE Name</th>
                    <th>Retailer</th>
                    <th>District</th>
                    <th onclick="sortRetailerReport('balance_due')" style="cursor: pointer; user-select: none;">
                        Balance Due ${getSortIcon('balance_due')}
                    </th>
                    <th onclick="sortRetailerReport('bal_pure')" style="cursor: pointer; user-select: none;">
                        Bal Pure ${getSortIcon('bal_pure')}
                    </th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        const balDue = parseFloat(row.balance_due || 0);
        const balPur = parseFloat(row.bal_pure || 0);
        totalBalanceDue += balDue;
        totalBalPure += balPur;

        html += `
            <tr>
                <td>${row.dsename || "-"}</td>
                <td>${row.retailername || "-"}</td>
                <td>${row.district || "-"}</td>
                <td>${balDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td><b>${balPur.toFixed(3)}</b></td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot class="total-row">
                <tr style="font-weight: bold; background: #f5f3ff; color: #4338ca; border-top: 2px solid #c7d2fe; white-space: nowrap;">
                    <td colspan="3" class="text-left">TOTAL</td>
                    <td class="text-left">₹${totalBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-left"><b>${totalBalPure.toFixed(3)}</b></td>
                </tr>
            </tfoot>
        </table>`;
    renderToReportContainers(html);

    // Show export button
    let exportBtn = document.getElementById("export-report-btn");
    if (exportBtn) {
        exportBtn.classList.remove("d-none");
    }
}

// Sorting Functions for Retailer Analysis
function sortRetailerReport(field) {
    if (retailerSortState.field === field) {
        if (retailerSortState.order === 'asc') retailerSortState.order = 'desc';
        else if (retailerSortState.order === 'desc') retailerSortState.order = 'none';
        else retailerSortState.order = 'asc';
    } else {
        retailerSortState.field = field;
        retailerSortState.order = 'asc';
    }

    if (retailerSortState.order === 'none') {
        retailerAnalysisData = [...originalRetailerData];
    } else {
        retailerAnalysisData.sort((a, b) => {
            const valA = parseFloat(a[field] || 0);
            const valB = parseFloat(b[field] || 0);
            return retailerSortState.order === 'asc' ? valA - valB : valB - valA;
        });
    }

    renderRetailerTable(retailerAnalysisData);
}

function getSortIcon(field) {
    if (retailerSortState.field !== field || retailerSortState.order === 'none') {
        return '<i class="fas fa-sort" style="opacity: 0.3; margin-left: 5px;"></i>';
    }
    return retailerSortState.order === 'asc' 
        ? '<i class="fas fa-sort-up" style="margin-left: 5px; color: #4338ca;"></i>' 
        : '<i class="fas fa-sort-down" style="margin-left: 5px; color: #4338ca;"></i>';
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
            console.error('Report error:', err);
            reportResults.innerHTML = `<p class='text-danger'>Error fetching data: ${err.message}</p>`;
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
                    <th>Weight<br><small style="font-weight: normal; opacity: 0.8;">(Inv - Stock)</small></th>
                    <th>Count<br><small style="font-weight: normal; opacity: 0.8;">(Inv - Stock)</small></th>
                    <th>Silver<br><small style="font-weight: normal; opacity: 0.8;">(Inv - Stock)</small></th>
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
    const user = JSON.parse(localStorage.getItem('user'));
    const isOffice = user && user.Role === 'office';

    let totals = { pure: 0, mc: 0 };

    let rows = data.map(row => {
        let pure = parseFloat(row.pure || 0);
        let mc = parseFloat(row.mc || 0);
        totals.pure += pure;
        totals.mc += mc;
        return `
            <tr>
                ${isOffice ? '' : `<td>${row.partyname || "-"}</td>`}
                <td>${pure.toFixed(3)}</td>
                <td>${mc.toFixed(2)}</td>
            </tr>`;
    }).join('');

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    ${isOffice ? '' : '<th>Party Name</th>'}
                    <th>Pure</th>
                    <th>MC</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr>
                    <td colspan="${isOffice ? 0 : 1}">TOTALS</td>
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
            renderItemSaleTable(data, from.includes('tally') || window.location.search.includes('tally_report') || document.getElementById("reportType").value === 'tally_report');
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
function renderItemSaleTable(data, isTally = false) {
    const user = JSON.parse(localStorage.getItem('user'));
    const isOffice = user && user.Role === 'office';
    
    // RBAC: office role cannot see Tally
    if (isOffice) isTally = false;

    let totals = { weight: 0, count: 0, amount: 0, tally: 0 };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Item</th>
                    ${isTally ? '<th>Weight</th>' : `
                        <th>Weight</th>
                        <th>Count</th>
                        <th>Amount</th>
                    `}
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        let weight = parseFloat(row.total_weight || 0);
        let count = parseInt(row.total_count || 0);
        let amount = parseFloat(row.total_amount || 0);
        let tally = parseFloat(row.tally_weight || 0);

        totals.weight += weight;
        totals.count += count;
        totals.amount += amount;
        totals.tally += tally;

        html += `
            <tr>
                <td>${row.item || "-"}</td>
                ${isTally ? `
                    <td style="font-weight: bold; color: ${tally < 0 ? '#ff4d4d' : '#2ecc71'}">${tally.toFixed(3)}</td>
                ` : `
                    <td>${weight.toFixed(3)}</td>
                    <td>${count}</td>
                    <td>${Math.round(amount).toLocaleString()}</td>
                `}
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td>TOTAL</td>
                    ${isTally ? `
                        <td>${totals.tally.toFixed(3)}</td>
                    ` : `
                        <td>${totals.weight.toFixed(3)}</td>
                        <td>${totals.count}</td>
                        <td>${Math.round(totals.amount).toLocaleString()}</td>
                    `}
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



// Fetch Tally Report
function fetchTallyReport() {
    const reportResults = document.getElementById("report-results");
    reportResults.innerHTML = "<p>Loading Tally Report...</p>";

    const showBtn = document.getElementById("show-report-btn");
    if (showBtn) showBtn.disabled = true;

    fetch(`${API_URL}/report_tally`)
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
            renderTallyTable(data);
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

// Render Tally Table
function renderTallyTable(data) {
    let totalWeight = 0;
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th style="text-align: right;">Final Weight</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        let weight = parseFloat(row.weight || 0);
        totalWeight += weight;

        html += `
            <tr>
                <td>${row.item || "-"}</td>
                <td style="text-align: right; font-weight: bold; color: ${weight < 0 ? '#ff4d4d' : 'var(--primary)'}">${weight.toFixed(3)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td>TOTAL</td>
                    <td style="text-align: right;">${totalWeight.toFixed(3)}</td>
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
