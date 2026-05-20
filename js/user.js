/* ==========================================
   个人中心逻辑 - user.js
   ========================================== */

let currentUser = null;
const orderStatusMap = {
    pending: { text: '待付款', cls: 'status-pending' },
    paid: { text: '待发货', cls: 'status-paid' },
    shipped: { text: '待收货', cls: 'status-shipped' },
    completed: { text: '已完成', cls: 'status-completed' },
    cancelled: { text: '已取消', cls: 'status-cancelled' },
};

// ---- 面板切换 ----
function showPanel(name) {
    document.querySelectorAll('.user-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
    const panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-tab="${name}"]`);
    if (navItem) navItem.classList.add('active');
    location.hash = name;

    // 懒加载
    if (name === 'orders') loadOrders('');
    if (name === 'profile') loadProfile();
    if (name === 'my-products') loadMyProducts();
    if (name === 'all-users') loadAllUsers();
}

// ---- 侧边栏导航 ----
document.getElementById('userNav').addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) showPanel(navItem.dataset.tab);
});

// ---- 订单状态 Tab ----
document.getElementById('orderStatusTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab-item');
    if (!tab) return;
    document.querySelectorAll('#orderStatusTabs .tab-item').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadOrders(tab.dataset.status);
});

// ---- 加载订单 ----
async function loadOrders(status) {
    const list = document.getElementById('orderList');
    list.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
    try {
        let url = '/api/orders?limit=20';
        if (status) url += '&status=' + status;
        const res = await http.get(url);
        const orders = res.data.list;
        if (orders.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>暂无相关订单</p></div>';
            return;
        }
        list.innerHTML = orders.map(o => orderCardHTML(o)).join('');
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>加载失败</p></div>';
    }
}

function orderCardHTML(o) {
    const status = orderStatusMap[o.status] || { text: o.status, cls: '' };
    const itemsHTML = (o.items || []).map(item => `
        <div class="order-prod-item">
            <img class="order-prod-img" src="${item.image}" alt="${item.product_name}" onerror="this.src='images/products/default.jpg'">
            <div class="order-prod-name">${item.product_name} × ${item.quantity}</div>
            <div class="order-prod-price">${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
        </div>`).join('');

    // 操作按钮
    let actionsHTML = '';
    if (o.status === 'pending') {
        actionsHTML += `<a href="checkout.html?order_id=${o.id}&total=${o.total_amount}" class="btn btn-primary btn-sm">去付款</a>`;
        actionsHTML += `<button class="btn btn-sm btn-outline" onclick="updateStatus(${o.id},'cancelled')">取消订单</button>`;
    }
    if (o.status === 'paid' && currentUser?.role === 'seller') {
        actionsHTML += `<button class="btn btn-primary btn-sm" onclick="updateStatus(${o.id},'shipped')">发货</button>`;
    }
    if (o.status === 'shipped' && (currentUser?.role === 'buyer' || currentUser?.role === 'admin')) {
        actionsHTML += `<button class="btn btn-primary btn-sm" onclick="updateStatus(${o.id},'completed')">确认收货</button>`;
    }
    if (['paid','shipped','completed'].includes(o.status) && (currentUser?.role === 'seller' || currentUser?.role === 'admin')) {
        actionsHTML += `<button class="btn btn-sm btn-outline" onclick="updateStatus(${o.id},'shipped')">标记已发货</button>`;
    }

    return `<div class="order-card-item">
        <div class="order-card-header">
            <span class="order-id">订单号：${o.id}</span>
            <span>${utils.formatDate(o.created_at)}</span>
            ${o.buyer_name ? `<span>买家：${o.buyer_name}</span>` : ''}
            <span class="order-status ${status.cls}">${status.text}</span>
        </div>
        <div class="order-card-products">${itemsHTML}</div>
        <div class="order-card-footer">
            <div class="order-total">共 ${(o.items||[]).reduce((s,i)=>s+i.quantity,0)} 件 &nbsp; 实付：<strong>¥${parseFloat(o.total_amount).toFixed(2)}</strong></div>
            <div class="order-card-actions">${actionsHTML}</div>
        </div>
    </div>`;
}

async function updateStatus(orderId, status) {
    try {
        await http.put(`/api/orders/${orderId}/status`, { status });
        toast.success('订单状态已更新');
        const activeTab = document.querySelector('#orderStatusTabs .tab-item.active');
        loadOrders(activeTab?.dataset.status || '');
    } catch (e) { toast.error(e.message); }
}

// ---- 个人信息 ----
async function loadProfile() {
    try {
        const res = await http.get('/api/users/profile');
        const u = res.data;
        document.getElementById('profileUsername').value = u.username || '';
        document.getElementById('profileNickname').value = u.nickname || '';
        document.getElementById('profilePhone').value = u.phone || '';
        document.getElementById('profileEmail').value = u.email || '';
    } catch (e) { toast.error('加载个人信息失败'); }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    try {
        await http.put('/api/users/profile', {
            nickname: document.getElementById('profileNickname').value.trim(),
            phone: document.getElementById('profilePhone').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
        });
        toast.success('个人信息已更新');
    } catch (err) { toast.error(err.message); }
    btn.disabled = false;
});

// ---- 我的商品 ----
async function loadMyProducts() {
    const list = document.getElementById('myProductList');
    list.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
    try {
        const res = await http.get('/api/users/my-products');
        const products = res.data.list;
        if (products.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>暂无商品</p></div>';
            return;
        }
        list.innerHTML = `<table class="product-table">
            <thead><tr>
                <th>图片</th><th>商品名</th><th>分类</th>
                <th>售价</th><th>库存</th><th>销量</th><th>状态</th><th>操作</th>
            </tr></thead>
            <tbody>
            ${products.map(p => `<tr>
                <td><img class="product-thumb" src="${p.image}" onerror="this.src='images/products/default.jpg'"></td>
                <td style="max-width:180px" class="ellipsis-2">${p.name}</td>
                <td>${p.category_name||''}</td>
                <td style="color:var(--secondary);font-weight:600">¥${parseFloat(p.price).toFixed(2)}</td>
                <td>${p.stock}</td>
                <td>${p.sales}</td>
                <td><span class="status-badge ${p.status?'badge-on':'badge-off'}">${p.status?'上架':'下架'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editProduct(${p.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})" style="margin-top:4px">删除</button>
                </td>
            </tr>`).join('')}
            </tbody>
        </table>`;
    } catch (e) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>加载失败</p></div>'; }
}

function showAddProduct() {
    document.getElementById('productFormTitle').textContent = '发布商品';
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    loadCategoriesForForm();
    showPanel('add-product');
}

async function editProduct(id) {
    try {
        const res = await http.get(`/api/products/${id}`);
        const p = res.data;
        document.getElementById('productFormTitle').textContent = '编辑商品';
        document.getElementById('editProductId').value = p.id;
        document.getElementById('pName').value = p.name;
        document.getElementById('pPrice').value = p.price;
        document.getElementById('pOriginalPrice').value = p.original_price || '';
        document.getElementById('pStock').value = p.stock;
        document.getElementById('pStatus').value = p.status;
        document.getElementById('pDesc').value = p.description || '';
        await loadCategoriesForForm();
        document.getElementById('pCategory').value = p.category_id;
        showPanel('add-product');
    } catch (e) { toast.error(e.message); }
}

async function deleteProduct(id) {
    if (!confirm('确定要删除这个商品吗？')) return;
    try {
        await http.delete(`/api/products/${id}`);
        toast.success('商品已删除');
        loadMyProducts();
    } catch (e) { toast.error(e.message); }
}

async function loadCategoriesForForm() {
    try {
        const res = await http.get('/api/products/categories');
        const sel = document.getElementById('pCategory');
        sel.innerHTML = '<option value="">请选择分类</option>' +
            res.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) { /* ignore */ }
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pName').value.trim();
    const category = document.getElementById('pCategory').value;
    const price = document.getElementById('pPrice').value;
    let valid = true;

    if (!name) { utils.showError(document.getElementById('pName'), '请填写商品名称'); valid = false; }
    if (!category) { utils.showError(document.getElementById('pCategory'), '请选择分类'); valid = false; }
    if (!price || parseFloat(price) <= 0) { utils.showError(document.getElementById('pPrice'), '请填写有效价格'); valid = false; }
    if (!valid) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category_id', category);
    formData.append('price', price);
    formData.append('original_price', document.getElementById('pOriginalPrice').value || price);
    formData.append('stock', document.getElementById('pStock').value || 999);
    formData.append('status', document.getElementById('pStatus').value);
    formData.append('description', document.getElementById('pDesc').value);
    const imgFile = document.getElementById('pImage').files[0];
    if (imgFile) formData.append('image', imgFile);

    const btn = document.getElementById('saveProductBtn');
    btn.disabled = true;
    try {
        const editId = document.getElementById('editProductId').value;
        if (editId) {
            await fetch(`/api/products/${editId}`, { method: 'PUT', body: formData, credentials: 'same-origin' });
        } else {
            await fetch('/api/products', { method: 'POST', body: formData, credentials: 'same-origin' });
        }
        toast.success(editId ? '商品已更新' : '商品发布成功');
        showPanel('my-products');
    } catch (err) { toast.error('操作失败'); }
    btn.disabled = false;
});

// ---- 用户管理 (管理员) ----
async function loadAllUsers() {
    const list = document.getElementById('userList');
    list.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
    try {
        const res = await http.get('/api/users/all');
        const users = res.data;
        list.innerHTML = `<table class="product-table">
            <thead><tr>
                <th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>手机</th><th>注册时间</th>
            </tr></thead>
            <tbody>
            ${users.map(u => `<tr>
                <td>${u.id}</td><td>${u.username}</td><td>${u.nickname||'-'}</td>
                <td><span class="status-badge ${u.role==='admin'?'badge-sale':u.role==='seller'?'badge-on':'badge-off'}">${u.role}</span></td>
                <td>${u.phone||'-'}</td>
                <td>${utils.formatDate(u.created_at)}</td>
            </tr>`).join('')}
            </tbody>
        </table>`;
    } catch (e) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>加载失败</p></div>'; }
}

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', async () => {
    const authData = await auth.check();
    if (!authData.loggedIn) {
        location.href = 'login.html?redirect=' + encodeURIComponent(location.href);
        return;
    }
    currentUser = authData;

    // 侧边栏用户信息
    const roleNames = { buyer: '买家', seller: '卖家', admin: '管理员' };
    document.getElementById('profileBrief').innerHTML = `
        <img class="profile-avatar" src="images/default-avatar.svg" alt="头像">
        <div class="profile-name">${authData.nickname || authData.username}</div>
        <div class="profile-role">${roleNames[authData.role] || authData.role}</div>
    `;

    // 根据角色显示不同菜单
    const nav = document.getElementById('userNav');
    if (authData.role === 'seller' || authData.role === 'admin') {
        nav.innerHTML += `<a href="#my-products" class="nav-item" data-tab="my-products">我的商品</a>`;
    }
    if (authData.role === 'admin') {
        nav.innerHTML += `<a href="#all-users" class="nav-item" data-tab="all-users">用户管理</a>`;
    }
    nav.innerHTML += `<a href="index.html" class="nav-item" style="color:var(--primary);cursor:pointer" onclick="auth.logout()">退出登录</a>`;

    // 根据 URL Hash 激活面板
    const hash = location.hash.replace('#', '') || 'orders';
    const validPanels = ['orders', 'profile', 'my-products', 'all-users'];
    showPanel(validPanels.includes(hash) ? hash : 'orders');
});
