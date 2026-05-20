/* ==========================================
   购物车逻辑 - cart.js
   ========================================== */

let cartItems = [];

// ---- 加载购物车 ----
async function loadCart() {
    const list = document.getElementById('cartList');
    list.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>加载购物车...</span></div>';
    try {
        const res = await http.get('/api/cart');
        cartItems = res.data;
        renderCart();
    } catch (e) {
        if (e.message.includes('401') || e.message.includes('登录')) {
            list.innerHTML = `<div class="empty-state" style="padding:60px 0">
                <div class="empty-icon">🔒</div>
                <p>请先登录后查看购物车</p>
                <a href="login.html" class="btn btn-primary mt-8">立即登录</a>
            </div>`;
        } else {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>加载失败</p></div>';
        }
    }
}

function renderCart() {
    const list = document.getElementById('cartList');
    if (cartItems.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding:60px 0">
            <div class="empty-icon">🛒</div>
            <p>购物车是空的，快去挑选商品吧</p>
            <a href="index.html" class="btn btn-primary mt-8">去购物</a>
        </div>`;
        updateSummary();
        return;
    }
    list.innerHTML = cartItems.map((item, i) => `
    <div class="cart-item" id="item-${item.id}">
        <input type="checkbox" class="item-checkbox" checked onchange="updateSummary()">
        <div class="item-product">
            <img class="item-img" src="${item.image}" alt="${item.name}" onclick="location.href='product.html?id=${item.product_id}'" onerror="this.src='images/products/default.jpg'">
            <div>
                <div class="item-name" onclick="location.href='product.html?id=${item.product_id}'">${item.name}</div>
                ${item.product_status !== 1 ? '<div class="item-offline">该商品已下架</div>' : ''}
            </div>
        </div>
        <div class="item-price">${parseFloat(item.price).toFixed(2)}</div>
        <div class="item-qty">
            <button class="qty-btn-sm" onclick="updateQty(${item.id}, ${item.quantity - 1})">−</button>
            <input class="qty-num" type="number" value="${item.quantity}" min="1" onchange="updateQtyInput(${item.id}, this.value)">
            <button class="qty-btn-sm" onclick="updateQty(${item.id}, ${item.quantity + 1})">+</button>
        </div>
        <div class="item-subtotal">${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
        <div class="item-action">
            <span class="del-btn" onclick="deleteItem(${item.id})">删除</span>
        </div>
    </div>`).join('');
    updateSummary();
    syncCheckAll();
}

// ---- 更新数量 ----
async function updateQty(id, qty) {
    if (qty < 1) { deleteItem(id); return; }
    try {
        await http.put(`/api/cart/${id}`, { quantity: qty });
        const item = cartItems.find(i => i.id === id);
        if (item) item.quantity = qty;
        renderCart();
    } catch (e) { toast.error(e.message); }
}
async function updateQtyInput(id, val) {
    const qty = parseInt(val);
    if (isNaN(qty) || qty < 1) return;
    await updateQty(id, qty);
}

// ---- 删除 ----
async function deleteItem(id) {
    const el = document.getElementById('item-' + id);
    if (el) { el.classList.add('removing'); await new Promise(r => setTimeout(r, 300)); }
    try {
        await http.delete(`/api/cart/${id}`);
        cartItems = cartItems.filter(i => i.id !== id);
        renderCart();
        auth.updateCartCount();
        toast.success('已移除');
    } catch (e) { toast.error(e.message); cartItems = [...cartItems]; renderCart(); }
}

// ---- 全选/反选 ----
function toggleAll(checked) {
    document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = checked);
    document.getElementById('checkAll').checked = checked;
    document.getElementById('checkAll2').checked = checked;
    updateSummary();
}
function syncCheckAll() {
    const all = document.querySelectorAll('.item-checkbox');
    const checked = [...all].every(cb => cb.checked);
    document.getElementById('checkAll').checked = checked;
    document.getElementById('checkAll2').checked = checked;
}

// ---- 删除选中 ----
async function deleteSelected() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const selectedIds = [];
    checkboxes.forEach((cb, i) => { if (cb.checked && cartItems[i]) selectedIds.push(cartItems[i].id); });
    if (selectedIds.length === 0) { toast.warning('请先选择要删除的商品'); return; }
    try {
        await http.delete('/api/cart', { ids: selectedIds });
        cartItems = cartItems.filter(i => !selectedIds.includes(i.id));
        renderCart();
        auth.updateCartCount();
        toast.success('已删除选中商品');
    } catch (e) { toast.error(e.message); }
}

// ---- 更新汇总 ----
function updateSummary() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    let count = 0, total = 0;
    checkboxes.forEach((cb, i) => {
        if (cb.checked && cartItems[i]) {
            count += cartItems[i].quantity;
            total += parseFloat(cartItems[i].price) * cartItems[i].quantity;
        }
    });
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('totalPrice').textContent = '¥' + total.toFixed(2);
    syncCheckAll();
}

// ---- 去结算 ----
function goCheckout() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const selected = [];
    checkboxes.forEach((cb, i) => { if (cb.checked && cartItems[i] && cartItems[i].product_status === 1) selected.push(cartItems[i]); });
    if (selected.length === 0) { toast.warning('请选择要结算的商品'); return; }
    // 存到 sessionStorage，传递给下单页
    sessionStorage.setItem('checkoutItems', JSON.stringify(selected));
    location.href = 'order.html';
}

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', async () => {
    const authData = await auth.check();
    if (!authData.loggedIn) {
        document.getElementById('cartList').innerHTML = `<div class="empty-state" style="padding:60px 0">
            <div class="empty-icon">🔒</div>
            <p>请先登录后查看购物车</p>
            <a href="login.html?redirect=${encodeURIComponent(location.href)}" class="btn btn-primary mt-8">立即登录</a>
        </div>`;
        return;
    }
    loadCart();
});
