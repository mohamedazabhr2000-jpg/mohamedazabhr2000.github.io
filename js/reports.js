/* ==============================================
   OUIIL HOME - Reports JavaScript
   ============================================== */

let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
const perPage = 20;

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    populateFilterGovernorates();
    loadAllOrders();
    initFilterListeners();
});

// ==========================================
// POPULATE FILTER GOVERNORATES
// ==========================================
function populateFilterGovernorates() {
    var select = document.getElementById('filterGov');
    if (!select) return;
    GOVERNORATES.forEach(function (gov) {
        var opt = document.createElement('option');
        opt.value = gov;
        opt.textContent = gov;
        select.appendChild(opt);
    });
}

// ==========================================
// LOAD ALL ORDERS
// ==========================================
function loadAllOrders() {
    showLoading();

    apiCall('getOrders')
        .then(function (data) {
            hideLoading();
            if (data && data.success && data.orders) {
                allOrders = data.orders;
                filteredOrders = [...allOrders];
                updateStats();
                renderTable();
                renderTopGovernorates();
                renderTopPayments();
                renderDuplicates();
                showToast('تم تحميل ' + allOrders.length + ' طلب', 'success');
            } else {
                showEmptyState();
                showToast('لا توجد طلبات حالياً', 'warning');
            }
        })
        .catch(function (err) {
            hideLoading();
            console.error(err);
            showEmptyState();
            showToast('خطأ في تحميل البيانات', 'error');
        });
}

// ==========================================
// UPDATE STATISTICS
// ==========================================
function updateStats() {
    var now = new Date();
    var today = now.toDateString();
    var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    var todayOrders = 0;
    var weekOrders = 0;
    var monthOrders = 0;
    var totalRevenue = 0;
    var discountOrders = 0;
    var phoneCount = {};

    allOrders.forEach(function (order) {
        var orderDate = new Date(order.date);
        var total = parseFloat(order.total) || 0;
        totalRevenue += total;

        if (orderDate.toDateString() === today) todayOrders++;
        if (orderDate >= weekAgo) weekOrders++;
        if (orderDate >= monthStart) monthOrders++;
        if (parseFloat(order.discount_value) > 0) discountOrders++;

        var phone = order.phone_primary;
        if (phone) {
            phoneCount[phone] = (phoneCount[phone] || 0) + 1;
        }
    });

    var duplicates = Object.values(phoneCount).filter(function (c) { return c > 1; }).length;
    var avgOrder = allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;

    document.getElementById('statTotal').textContent = allOrders.length;
    document.getElementById('statToday').textContent = todayOrders;
    document.getElementById('statWeek').textContent = weekOrders;
    document.getElementById('statMonth').textContent = monthOrders;
    document.getElementById('statRevenue').textContent = totalRevenue.toLocaleString('ar-EG') + ' ج.م';
    document.getElementById('statAvg').textContent = avgOrder.toLocaleString('ar-EG') + ' ج.م';
    document.getElementById('statDiscount').textContent = discountOrders;
    document.getElementById('statDuplicates').textContent = duplicates;
}

// ==========================================
// FILTER LISTENERS
// ==========================================
function initFilterListeners() {
    document.getElementById('filterSearch').addEventListener('input', debounce(applyFilters, 400));
}

function debounce(fn, delay) {
    var timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    };
}

// ==========================================
// APPLY FILTERS
// ==========================================
function applyFilters() {
    var search = (document.getElementById('filterSearch').value || '').trim().toLowerCase();
    var gov = document.getElementById('filterGov').value;
    var payment = document.getElementById('filterPayment').value;
    var status = document.getElementById('filterStatus').value;
    var dateFilter = document.getElementById('filterDate').value;
    var dupFilter = document.getElementById('filterDuplicate').value;

    var now = new Date();
    var today = now.toDateString();
    var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Phone count for duplicate detection
    var phoneCount = {};
    allOrders.forEach(function (o) {
        if (o.phone_primary) phoneCount[o.phone_primary] = (phoneCount[o.phone_primary] || 0) + 1;
    });

    filteredOrders = allOrders.filter(function (order) {
        // Search
        if (search) {
            var match = (order.customer_name || '').toLowerCase().includes(search) ||
                (order.phone_primary || '').includes(search) ||
                (order.order_id || '').toLowerCase().includes(search);
            if (!match) return false;
        }
        // Governorate
        if (gov && order.governorate !== gov) return false;
        // Payment
        if (payment && order.payment_method !== payment) return false;
        // Status
        if (status && order.order_status !== status) return false;
        // Date
        if (dateFilter) {
            var orderDate = new Date(order.date);
            if (dateFilter === 'today' && orderDate.toDateString() !== today) return false;
            if (dateFilter === 'week' && orderDate < weekAgo) return false;
            if (dateFilter === 'month' && orderDate < monthStart) return false;
        }
        // Duplicate
        if (dupFilter === 'duplicate' && phoneCount[order.phone_primary] < 2) return false;

        return true;
    });

    currentPage = 1;
    renderTable();
}

function resetFilters() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterGov').value = '';
    document.getElementById('filterPayment').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterDate').value = '';
    document.getElementById('filterDuplicate').value = '';
    filteredOrders = [...allOrders];
    currentPage = 1;
    renderTable();
}

// ==========================================
// RENDER TABLE
// ==========================================
function renderTable() {
    var tbody = document.getElementById('ordersTableBody');
    var countEl = document.getElementById('ordersCount');
    if (!tbody) return;

    if (countEl) countEl.textContent = '(' + filteredOrders.length + ' طلب)';

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-inbox" style="font-size:2rem;margin-bottom:8px;display:block;"></i>لا توجد طلبات</td></tr>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    // Phone count
    var phoneCount = {};
    allOrders.forEach(function (o) {
        if (o.phone_primary) phoneCount[o.phone_primary] = (phoneCount[o.phone_primary] || 0) + 1;
    });

    var start = (currentPage - 1) * perPage;
    var end = start + perPage;
    var pageOrders = filteredOrders.slice(start, end);

    var html = '';
    pageOrders.forEach(function (order, i) {
        var isDuplicate = phoneCount[order.phone_primary] > 1;
        var statusClass = getStatusClass(order.order_status);

        html += '<tr>' +
            '<td>' + (start + i + 1) + '</td>' +
            '<td><strong>' + (order.order_id || '-') + '</strong></td>' +
            '<td>' + (order.date || '-') + '</td>' +
            '<td>' + (order.customer_name || '-') + '</td>' +
            '<td dir="ltr" style="text-align:right;">' + (order.phone_primary || '-') +
            (isDuplicate ? ' <span class="duplicate-flag"><i class="fas fa-exclamation-triangle"></i> مكرر</span>' : '') +
            '</td>' +
            '<td>' + (order.governorate || '-') + '</td>' +
            '<td>' + (order.city || '-') + '</td>' +
            '<td>' + (order.quantity || 1) + '</td>' +
            '<td><strong>' + (order.total || 0) + ' ج.م</strong></td>' +
            '<td>' + (order.payment_method || '-') + '</td>' +
            '<td>' + (order.coupon_code && order.coupon_code !== '-' ? order.coupon_code : '-') + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + (order.order_status || 'جديد') + '</span></td>' +
            '<td>' +
            '<a href="invoice.html?id=' + (order.order_id || '') + '" class="btn btn-sm btn-outline" style="padding:6px 12px;font-size:0.8rem;">' +
            '<i class="fas fa-file-invoice"></i></a>' +
            '</td>' +
            '</tr>';
    });

    tbody.innerHTML = html;
    renderPagination();
}

function getStatusClass(status) {
    switch (status) {
        case 'جديد': return 'pending';
        case 'مؤكد': return 'confirmed';
        case 'تم الشحن': return 'shipped';
        case 'تم التوصيل': return 'delivered';
        case 'ملغي': return 'cancelled';
        default: return 'pending';
    }
}

// ==========================================
// PAGINATION
// ==========================================
function renderPagination() {
    var pag = document.getElementById('pagination');
    if (!pag) return;

    var total = Math.ceil(filteredOrders.length / perPage);
    if (total <= 1) { pag.innerHTML = ''; return; }

    var html = '';
    // Prev
    html += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')"><i class="fas fa-chevron-right"></i></button>';

    for (var i = 1; i <= total; i++) {
        if (i === currentPage) {
            html += '<button class="active">' + i + '</button>';
        } else if (i === 1 || i === total || Math.abs(i - currentPage) <= 2) {
            html += '<button onclick="goToPage(' + i + ')">' + i + '</button>';
        } else if (Math.abs(i - currentPage) === 3) {
            html += '<button disabled>...</button>';
        }
    }

    // Next
    html += '<button ' + (currentPage === total ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')"><i class="fas fa-chevron-left"></i></button>';

    pag.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
    window.scrollTo({ top: document.querySelector('.table-wrapper').offsetTop - 100, behavior: 'smooth' });
}

// ==========================================
// TOP GOVERNORATES
// ==========================================
function renderTopGovernorates() {
    var container = document.getElementById('topGovernorates');
    if (!container) return;

    var govCount = {};
    allOrders.forEach(function (o) {
        if (o.governorate) govCount[o.governorate] = (govCount[o.governorate] || 0) + 1;
    });

    var sorted = Object.entries(govCount).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    var max = sorted.length > 0 ? sorted[0][1] : 1;

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;">لا توجد بيانات</p>';
        return;
    }

    var html = '';
    sorted.forEach(function (item) {
        var pct = Math.round((item[1] / max) * 100);
        html += '<div style="margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem;">' +
            '<span style="font-weight:600;">' + item[0] + '</span>' +
            '<span style="color:var(--text-muted);">' + item[1] + ' طلب</span>' +
            '</div>' +
            '<div style="background:var(--border-light);border-radius:10px;height:8px;overflow:hidden;">' +
            '<div style="background:var(--primary);height:100%;border-radius:10px;width:' + pct + '%;transition:width 0.5s;"></div>' +
            '</div></div>';
    });

    container.innerHTML = html;
}

// ==========================================
// TOP PAYMENTS
// ==========================================
function renderTopPayments() {
    var container = document.getElementById('topPayments');
    if (!container) return;

    var payCount = {};
    allOrders.forEach(function (o) {
        if (o.payment_method) payCount[o.payment_method] = (payCount[o.payment_method] || 0) + 1;
    });

    var sorted = Object.entries(payCount).sort(function (a, b) { return b[1] - a[1]; });
    var max = sorted.length > 0 ? sorted[0][1] : 1;
    var colors = { 'الدفع عند الاستلام': '#059669', 'محفظة إلكترونية': '#1A73E8', 'إنستا باي': '#5B2C8E' };

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;">لا توجد بيانات</p>';
        return;
    }

    var html = '';
    sorted.forEach(function (item) {
        var pct = Math.round((item[1] / max) * 100);
        var color = colors[item[0]] || 'var(--primary)';
        html += '<div style="margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem;">' +
            '<span style="font-weight:600;">' + item[0] + '</span>' +
            '<span style="color:var(--text-muted);">' + item[1] + ' طلب</span>' +
            '</div>' +
            '<div style="background:var(--border-light);border-radius:10px;height:8px;overflow:hidden;">' +
            '<div style="background:' + color + ';height:100%;border-radius:10px;width:' + pct + '%;transition:width 0.5s;"></div>' +
            '</div></div>';
    });

    container.innerHTML = html;
}

// ==========================================
// DUPLICATE CUSTOMERS
// ==========================================
function renderDuplicates() {
    var tbody = document.getElementById('duplicatesTableBody');
    if (!tbody) return;

    var phoneData = {};
    allOrders.forEach(function (o) {
        var phone = o.phone_primary;
        if (!phone) return;
        if (!phoneData[phone]) {
            phoneData[phone] = { name: o.customer_name, phone: phone, count: 0, lastDate: '', totalSpent: 0 };
        }
        phoneData[phone].count++;
        phoneData[phone].totalSpent += parseFloat(o.total) || 0;
        phoneData[phone].lastDate = o.date;
    });

    var duplicates = Object.values(phoneData).filter(function (d) { return d.count > 1; })
        .sort(function (a, b) { return b.count - a.count; });

    if (duplicates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">لا يوجد عملاء مكررون</td></tr>';
        return;
    }

    var html = '';
    duplicates.forEach(function (d) {
        html += '<tr>' +
            '<td>' + d.name + '</td>' +
            '<td dir="ltr" style="text-align:right;">' + d.phone + '</td>' +
            '<td><span class="status-badge pending">' + d.count + ' طلبات</span></td>' +
            '<td>' + d.lastDate + '</td>' +
            '<td><strong>' + d.totalSpent.toLocaleString('ar-EG') + ' ج.م</strong></td>' +
            '</tr>';
    });

    tbody.innerHTML = html;
}

// ==========================================
// EXPORT CSV
// ==========================================
function exportCSV() {
    if (filteredOrders.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return;
    }

    var headers = ['رقم الطلب', 'التاريخ', 'العميل', 'الهاتف', 'المحافظة', 'المدينة', 'العنوان', 'الكمية', 'سعر المنتج', 'الشحن', 'الخصم', 'الإجمالي', 'طريقة الدفع', 'الكوبون', 'الحالة'];
    var BOM = '\uFEFF';
    var csv = BOM + headers.join(',') + '\n';

    filteredOrders.forEach(function (o) {
        var row = [
            o.order_id || '',
            o.date || '',
            '"' + (o.customer_name || '') + '"',
            o.phone_primary || '',
            o.governorate || '',
            o.city || '',
            '"' + (o.full_address || '') + '"',
            o.quantity || 1,
            o.product_price || 0,
            o.shipping_price || 0,
            o.discount_value || 0,
            o.total || 0,
            o.payment_method || '',
            o.coupon_code || '',
            o.order_status || ''
        ];
        csv += row.join(',') + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'OUIIL_Orders_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    showToast('تم تصدير ' + filteredOrders.length + ' طلب بنجاح', 'success');
}

// ==========================================
// EMPTY STATE
// ==========================================
function showEmptyState() {
    var tbody = document.getElementById('ordersTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-inbox" style="font-size:2rem;margin-bottom:8px;display:block;"></i>لا توجد طلبات حالياً</td></tr>';
    }
}