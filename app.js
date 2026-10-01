const SYNC_URL = "https://script.google.com/macros/s/AKfycbzTA-Qvuzdv6f_YB2jxrreR4wN0tw_m6eacVVD9YDvs1MaNoVLDecBYVmLe3YQFawKijw/exec";
const SYNC_TOKEN = "CM_2026_10_01_9f4d7a6b2e8c1a0f5d3b7e9c2a6f8d1e";

function generateSyncId() { return 'CM-PWA-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }
function getUtcNow() { return new Date().toISOString(); }

if (!localStorage.getItem('customers')) localStorage.setItem('customers', JSON.stringify([]));
if (!localStorage.getItem('last_sync')) localStorage.setItem('last_sync', '1970-01-01T00:00:00.000Z');

function renderCustomers() {
    const list = document.getElementById('customersList');
    const customers = JSON.parse(localStorage.getItem('customers')).filter(c => !c.deleted).reverse();
    list.innerHTML = '';
    
    if(customers.length === 0) { list.innerHTML = '<p style="text-align:center; color:#777;">لا يوجد زبائن مسجلين حالياً.</p>'; return; }

    customers.slice(0, 50).forEach(c => {
        const data = c.data;
        if(data.type !== 'customer') return;
        list.innerHTML += `
            <div class="card">
                <h3>${data.name} - ${data.wilaya}</h3>
                <p><strong>الهاتف:</strong> ${data.phone}</p>
                <p><strong>الطلب:</strong> ${data.request}</p>
                <p><strong>الدور:</strong> ${data.role} | <strong>التاريخ:</strong> ${data.entry_date}</p>
            </div>
        `;
    });
}

document.getElementById('customerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const customerData = {
        type: "customer", name: document.getElementById('name').value, phone: document.getElementById('phone').value,
        wilaya: document.getElementById('wilaya').value, request: document.getElementById('request').value,
        role: document.getElementById('role').value, entry_date: new Date().toISOString().split('T')[0],
        status: "غير مؤكد", people_count: 1, room: "ثنائية"
    };

    const newRecord = { sync_id: generateSyncId(), updated_at: getUtcNow(), deleted: 0, data: customerData };
    let customers = JSON.parse(localStorage.getItem('customers'));
    customers.push(newRecord);
    localStorage.setItem('customers', JSON.stringify(customers));

    document.getElementById('customerForm').reset();
    showStatus("تمت الإضافة بنجاح! يتم الآن المزامنة...", "green");
    renderCustomers();
    syncData();
});

function showStatus(msg, color) {
    const statusEl = document.getElementById('statusMsg');
    statusEl.textContent = msg; statusEl.style.color = color;
    setTimeout(() => statusEl.textContent = '', 5000);
}

async function syncData() {
    const btn = document.getElementById('syncBtn');
    btn.disabled = true; btn.textContent = "جاري المزامنة...";
    
    const lastSync = localStorage.getItem('last_sync');
    let customers = JSON.parse(localStorage.getItem('customers'));
    const changes = customers.filter(c => new Date(c.updated_at) > new Date(lastSync));
    
    const payload = { token: SYNC_TOKEN, action: "sync", since: lastSync, changes: changes };

    try {
        const response = await fetch(SYNC_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const result = await response.json();
        
        if (result.success) {
            if (result.changes && result.changes.length > 0) {
                result.changes.forEach(serverItem => {
                    let idx = customers.findIndex(c => c.sync_id === serverItem.sync_id);
                    if (idx >= 0) {
                        if (new Date(serverItem.updated_at) >= new Date(customers[idx].updated_at)) customers[idx] = serverItem;
                    } else {
                        if (!serverItem.deleted) customers.push(serverItem);
                    }
                });
                localStorage.setItem('customers', JSON.stringify(customers));
            }
            if (result.server_time) localStorage.setItem('last_sync', result.server_time);
            showStatus("تمت المزامنة بنجاح!", "green");
            renderCustomers();
        } else { showStatus("فشلت المزامنة: " + result.error, "red"); }
    } catch (error) { showStatus("لا يوجد اتصال بالإنترنت. سيتم المزامنة لاحقاً.", "orange"); }
    
    btn.disabled = false; btn.textContent = "مزامنة 🔄";
}
renderCustomers();