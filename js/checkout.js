/* ==========================================
   结算页逻辑 - checkout.js
   ========================================== */

const orderId = utils.getUrlParam('order_id');
const total = utils.getUrlParam('total');

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', () => {
    if (!orderId || !total) {
        document.getElementById('payCard').innerHTML =
            '<div class="empty-state" style="padding:60px"><div class="empty-icon">😕</div><p>订单信息不存在</p><a href="user.html#orders" class="btn btn-primary mt-8">我的订单</a></div>';
        return;
    }
    document.getElementById('payAmount').textContent = parseFloat(total).toFixed(2);
    document.getElementById('orderId').textContent = orderId;
});

// ---- 支付方式切换 ----
document.querySelectorAll('.pay-method').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.pay-method').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        opt.querySelector('input').checked = true;
    });
});

// ---- 确认支付 ----
async function confirmPay() {
    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.textContent = '处理中...';

    try {
        // 调用接口将订单状态改为 paid
        await http.put(`/api/orders/${orderId}/status`, { status: 'paid' });

        // 显示支付成功
        document.getElementById('payCard').classList.add('hidden');
        document.getElementById('successCard').classList.remove('hidden');
        toast.success('支付成功！');

        // 3秒后跳转到订单页
        setTimeout(() => location.href = 'user.html#orders', 3500);
    } catch (e) {
        toast.error(e.message || '支付失败，请重试');
        btn.disabled = false;
        btn.textContent = '确认支付';
    }
}
