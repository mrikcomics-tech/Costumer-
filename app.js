const SYNC_URL = "https://script.google.com/macros/s/AKfycbzTA-Qvuzdv6f_YB2jxrreR4wN0tw_m6eacVVD9YDvs1MaNoVLDecBYVmLe3YQFawKijw/exec";
const SYNC_TOKEN = "CM_2026_10_01_9f4d7a6b2e8c1a0f5d3b7e9c2a6f8d1e";

const WILAYAS = ["أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة", "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة", "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غليزان", "غرداية", "تيميمون", "برج باجي مختار", "أولاد جلال", "بني عباس", "عين صالح", "عين قزام", "تقرت", "جانت", "المغير", "المنيعة"];
const ROLES = ["معتمر", "مسافر", "معلن", "مرشد"];
const STATUSES = ["مؤكد", "غير مؤكد"];
const ROOMS = ["ثنائية", "ثلاثية", "رباعية", "خماسية", "جماعية"];

function initStorage() {
    if (!localStorage.getItem('customers')) localStorage.setItem('customers', JSON.stringify([]));
    if (!localStorage.getItem('trips')) localStorage.setItem('trips', JSON.stringify([
        {sync_id: generateSyncId(), updated_at: getUtcNow(), deleted: 0, data: {type: 'trip', name: 'عمرة أكتوبر 2026', active: 1}}
    ]));
    if (!localStorage.getItem('last_sync')) localStorage.setItem('last_sync', '1970-01-01T00:00:00.000Z');
}

function generateSyncId() { return 'CM-PWA-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }
function getUtcNow() { return new Date().toISOString(); }

// Tab Navigation
function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
    if(tabName === 'tab-customers') filterCustomers();
    if(tabName === 'tab-trips') renderTrips();
}

// Populate Dropdowns
function populateDropdowns() {
    const fill = (id, arr, includeAll=false) => {
        const el = document.getElementById(id);
        if(!el) return;
        let html = includeAll ? el.innerHTML : '';
        arr.forEach(item => html += `<option value="${item}">${item}</option>`);
        el.innerHTML = html;
    };
    
    fill('f_wilaya', WILAYAS);
    fill('filterWilaya', WILAYAS, true);
    fill('f_role', ROLES);
    fill('filterRole', ROLES, true);
    fill('f_status', STATUSES);
    fill('filterStatus', STATUSES, true);
    fill('f_room', ROOMS);
    fill('filterRoom', ROOMS, true);
    updateTripsDropdown();
}

function updateTripsDropdown() {
    const trips = JSON.parse(localStorage.getItem('trips')).filter(t => !t.deleted && t.data.active === 1);
    const reqSelect = document.getElementById('f_request');
    reqSelect.innerHTML = '';
    trips.forEach(t => reqSelect.innerHTML += `<option value="${t.data.name}">${t.data.name}</option>`);
}

function useManualRequest() {
    const manual = document.getElementById('f_manual_request').value.trim();
    if (manual) {
        const reqSelect = document.getElementById('f_request');
        reqSelect.innerHTML += `<option value="${manual}" selected>${manual}</option>`;
    }
}

// Customers Management
document.getElementById('customerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
        type: "customer",
        phone: document.getElementById('f_phone').value,
        wilaya: document.getElementById('f_wilaya').value,
        name: document.getElementById('f_name').value,
        request: document.getElementById('f_request').value,
        role: document.getElementById('f_role').value,
        status: document.getElementById('f_status').value,
        people_count: parseInt(document.getElementById('f_count').value),
        room: document.getElementById('f_room').value,
        entry_date: new Date().toISOString().split('T')[0]
    };

    let customers = JSON.parse(localStorage.getItem('customers'));
    customers.push({ sync_id: generateSyncId(), updated_at: getUtcNow(), deleted: 0, data: data });
    localStorage.setItem('customers', JSON.stringify(customers));
    
    document.getElementById('customerForm').reset();
    alert("تم حفظ الزبون محلياً");
    syncData();
});

function filterCustomers() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const fStatus = document.getElementById('filterStatus').value;
    const fRole = document.getElementById('filterRole').value;
    const fRoom = document.getElementById('filterRoom').value;
    const fWilaya = document.getElementById('filterWilaya').value;

    let customers = JSON.parse(localStorage.getItem('customers')).filter(c => !c.deleted && c.data.type === 'customer');
    
    let filtered = customers.filter(c => {
        const d = c.data;
        const matchSearch = d.name.toLowerCase().includes(search) || d.phone.includes(search) || d.request.toLowerCase().includes(search);
        const matchStatus = fStatus === 'الكل' || d.status === fStatus;
        const matchRole = fRole === 'الكل' || d.role === fRole;
        const matchRoom = fRoom === 'الكل' || d.room === fRoom;
        const matchWilaya = fWilaya === 'الكل' || d.wilaya === fWilaya;
        return matchSearch && matchStatus && matchRole && matchRoom && matchWilaya;
    });

    document.getElementById('recordCount').innerText = filtered.length;
    
    const list = document.getElementById('customersList');
    list.innerHTML = '';
    filtered.reverse().forEach(c => {
        const d = c.data;
        list.innerHTML += `
            <div class="card">
                <h3>${d.name}</h3>
                <p><strong>الهاتف:</strong> ${d.phone} | <strong>الولاية:</strong> ${d.wilaya}</p>
                <p><strong>الطلب:</strong> ${d.request}</p>
                <p><strong>الحالة:</strong> ${d.status} | <strong>الدور:</strong> ${d.role}</p>
                <p><strong>العدد:</strong> ${d.people_count} | <strong>الغرفة:</strong> ${d.room}</p>
            </div>
        `;
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = 'الكل';
    document.getElementById('filterRole').value = 'الكل';
    document.getElementById('filterRoom').value = 'الكل';
    document.getElementById('filterWilaya').value = 'الكل';
    filterCustomers();
}

// Trips Management
function renderTrips() {
    const list = document.getElementById('tripsList');
    const trips = JSON.parse(localStorage.getItem('trips')).filter(t => !t.deleted && t.data.type === 'trip');
    list.innerHTML = '';
    trips.reverse().forEach(t => {
        list.innerHTML += `
            <div class="trip-item">
                <span>${t.data.name}</span>
                <button onclick="deleteTrip('${t.sync_id}')">حذف</button>
            </div>
        `;
    });
}

function addTrip() {
    const name = document.getElementById('newTripName').value.trim();
    if(!name) return;
    let trips = JSON.parse(localStorage.getItem('trips'));
    trips.push({ sync_id: generateSyncId(), updated_at: getUtcNow(), deleted: 0, data: {type: 'trip', name: name, active: 1} });
    localStorage.setItem('trips', JSON.stringify(trips));
    document.getElementById('newTripName').value = '';
    renderTrips();
    updateTripsDropdown();
    syncData();
}

function deleteTrip(syncId) {
    if(!confirm('هل أنت متأكد من الحذف؟')) return;
    let trips = JSON.parse(localStorage.getItem('trips'));
    let idx = trips.findIndex(t => t.sync_id === syncId);
    if(idx >= 0) {
        trips[idx].deleted = 1;
        trips[idx].updated_at = getUtcNow();
        localStorage.setItem('trips', JSON.stringify(trips));
        renderTrips();
        updateTripsDropdown();
        syncData();
    }
}

// Sync Logic
async function syncData() {
    const btn = document.getElementById('syncBtn');
    const statusText = document.getElementById('syncStatusText');
    btn.disabled = true;
    statusText.textContent = "جاري المزامنة...";
    
    const lastSync = localStorage.getItem('last_sync');
    let customers = JSON.parse(localStorage.getItem('customers'));
    let trips = JSON.parse(localStorage.getItem('trips'));
    
    const changes = [...customers, ...trips].filter(c => new Date(c.updated_at) > new Date(lastSync));
    const payload = { token: SYNC_TOKEN, action: "sync", since: lastSync, changes: changes };

    try {
        const response = await fetch(SYNC_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const result = await response.json();
        
        if (result.success) {
            if (result.changes && result.changes.length > 0) {
                result.changes.forEach(serverItem => {
                    const isTrip = serverItem.data.type === 'trip';
                    let arr = isTrip ? trips : customers;
                    let idx = arr.findIndex(c => c.sync_id === serverItem.sync_id);
                    
                    if (idx >= 0) {
                        if (new Date(serverItem.updated_at) >= new Date(arr[idx].updated_at)) arr[idx] = serverItem;
                    } else {
                        if (!serverItem.deleted) arr.push(serverItem);
                    }
                });
                localStorage.setItem('customers', JSON.stringify(customers));
                localStorage.setItem('trips', JSON.stringify(trips));
            }
            if (result.server_time) localStorage.setItem('last_sync', result.server_time);
            statusText.textContent = "متصل ومتزامن ✓";
            filterCustomers();
            renderTrips();
            updateTripsDropdown();
        } else {
            statusText.textContent = "خطأ في المزامنة";
        }
    } catch (error) {
        statusText.textContent = "وضع عدم الاتصال";
    }
    btn.disabled = false;
}

function forceSync() {
    localStorage.setItem('last_sync', '1970-01-01T00:00:00.000Z');
    syncData();
}

window.onload = () => {
    initStorage();
    populateDropdowns();
    filterCustomers();
    syncData();
};
