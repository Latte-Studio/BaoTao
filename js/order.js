/* ==========================================
   提交订单逻辑 - order.js
   ========================================== */

let orderItems = [];

// ---- 加载待下单商品 ----
async function loadOrderItems() {
    const isDirect = utils.getUrlParam('direct') === '1';
    const productId = utils.getUrlParam('product_id');
    const quantity = parseInt(utils.getUrlParam('quantity') || '1');

    if (isDirect && productId) {
        // 直接购买：从接口取商品信息
        try {
            const res = await http.get(`/api/products/${productId}`);
            const p = res.data;
            orderItems = [{ product_id: p.id, name: p.name, price: p.price, quantity, image: p.image }];
        } catch (e) {
            toast.error('获取商品信息失败');
            return;
        }
    } else {
        // 从购物车带过来
        const stored = sessionStorage.getItem('checkoutItems');
        if (stored) orderItems = JSON.parse(stored);
    }

    if (orderItems.length === 0) {
        document.getElementById('orderItemList').innerHTML =
            '<div class="empty-state"><div class="empty-icon">😕</div><p>没有可结算的商品</p><a href="cart.html" class="btn btn-primary mt-8">返回购物车</a></div>';
        return;
    }

    renderOrderItems();
    calculateTotal();

    // 预填用户信息
    try {
        const res = await http.get('/api/users/profile');
        const u = res.data;
        if (u.phone) document.getElementById('receiverPhone').value = u.phone;
        if (u.nickname) document.getElementById('receiverName').value = u.nickname;
    } catch (e) { /* ignore */ }
}

function renderOrderItems() {
    document.getElementById('orderItemList').innerHTML = orderItems.map(item => `
    <div class="order-item">
        <img class="order-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='images/products/default.jpg'">
        <div class="order-item-info">
            <div class="order-item-name">${item.name}</div>
            <div class="order-item-meta">数量：${item.quantity}</div>
        </div>
        <div class="order-item-price">${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
    </div>`).join('');
}

function calculateTotal() {
    const total = orderItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    const totalStr = '¥' + total.toFixed(2);
    document.getElementById('goodsTotal').textContent = totalStr;
    document.getElementById('orderTotal').textContent = totalStr;
    document.getElementById('submitTotal').textContent = totalStr;
}

// ---- 表单校验 ----
const formFields = [
    { id: 'receiverName', errId: 'errReceiverName', validate: (v) => v.trim() ? '' : '请填写收件人姓名' },
    { id: 'receiverPhone', errId: 'errReceiverPhone', validate: (v) => /^1[3-9]\d{9}$/.test(v.trim()) ? '' : '手机号格式不正确' },
    { id: 'receiverAddress', errId: 'errReceiverAddress', validate: (v) => v.trim().length >= 5 ? '' : '地址至少5个字符' },
];

formFields.forEach(({ id, errId, validate }) => {
    const input = document.getElementById(id);
    const errEl = document.getElementById(errId);
    input?.addEventListener('blur', () => {
        const msg = validate(input.value);
        input.classList.toggle('error', !!msg);
        errEl.textContent = msg;
        errEl.classList.toggle('show', !!msg);
    });
    input?.addEventListener('input', () => {
        input.classList.remove('error');
        errEl.classList.remove('show');
    });
});

// ---- 提交订单 ----
async function submitOrder() {
    // 整体校验
    let valid = true;
    for (const { id, errId, validate } of formFields) {
        const input = document.getElementById(id);
        const errEl = document.getElementById(errId);
        const msg = validate(input.value);
        if (msg) {
            input.classList.add('error');
            errEl.textContent = msg;
            errEl.classList.add('show');
            valid = false;
        }
    }
    if (!valid) { toast.warning('请完善收货信息'); return; }
    if (orderItems.length === 0) { toast.warning('没有可提交的商品'); return; }

    const btn = document.getElementById('submitOrderBtn');
    btn.disabled = true;
    btn.textContent = '提交中...';

    try {
        const payload = {
            items: orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
            receiver_name: document.getElementById('receiverName').value.trim(),
            phone: document.getElementById('receiverPhone').value.trim(),
            address: document.getElementById('receiverAddress').value.trim(),
        };
        const res = await http.post('/api/orders', payload);
        sessionStorage.removeItem('checkoutItems');
        // 跳转结算页
        location.href = `checkout.html?order_id=${res.data.orderId}&total=${res.data.totalAmount}`;
    } catch (e) {
        toast.error(e.message || '提交失败，请重试');
        btn.disabled = false;
        btn.textContent = '提交订单';
    }
}

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', async () => {
    const authData = await auth.check();
    if (!authData.loggedIn) {
        location.href = 'login.html?redirect=' + encodeURIComponent(location.href);
        return;
    }
    loadOrderItems();
});
