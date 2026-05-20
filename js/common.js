/* ==========================================
   通用 JS 工具库 - common.js
   ========================================== */

// ---- Ajax 封装 ----
const http = {
    async request(method, url, data) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };
        if (data && method !== 'GET') opts.body = JSON.stringify(data);
        const res = await fetch(url, opts);
        const json = await res.json();
        if (!res.ok && json.code !== 200) throw new Error(json.message || '请求失败');
        return json;
    },
    get: (url) => http.request('GET', url),
    post: (url, data) => http.request('POST', url, data),
    put: (url, data) => http.request('PUT', url, data),
    delete: (url, data) => http.request('DELETE', url, data),
};

// ---- Toast 提示 ----
const toast = {
    container: null,
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    show(msg, type = '', duration = 2500) {
        this.init();
        const el = document.createElement('div');
        el.className = 'toast' + (type ? ' ' + type : '');
        el.textContent = msg;
        this.container.appendChild(el);
        setTimeout(() => {
            el.classList.add('hiding');
            setTimeout(() => el.remove(), 300);
        }, duration);
    },
    success: (msg) => toast.show(msg, 'success'),
    error: (msg) => toast.show(msg, 'error'),
    warning: (msg) => toast.show(msg, 'warning'),
};

// ---- 登录状态管理 ----
const auth = {
    user: null,

    async check() {
        try {
            const res = await http.get('/api/auth/check-auth');
            if (res.data.loggedIn) {
                this.user = res.data;
                this.renderLoggedIn();
            } else {
                this.renderLoggedOut();
            }
            return res.data;
        } catch (e) {
            this.renderLoggedOut();
            return { loggedIn: false };
        }
    },

    renderLoggedIn() {
        const area = document.getElementById('headerUserArea');
        if (!area) return;
        const u = this.user;
        area.innerHTML = `
            <div class="user-info-area">
                <img class="avatar-sm" src="images/default-avatar.svg" alt="头像">
                <span>${u.nickname || u.username}</span>
                <div class="user-dropdown">
                    <a href="user.html">个人中心</a>
                    ${u.role === 'seller' || u.role === 'admin' ? '<a href="user.html#my-products">我的商品</a>' : ''}
                    <a href="#" id="logoutBtn">退出登录</a>
                </div>
            </div>`;
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault(); this.logout();
        });
        // 更新购物车数量
        this.updateCartCount();
    },

    renderLoggedOut() {
        const area = document.getElementById('headerUserArea');
        if (!area) return;
        area.innerHTML = `<a href="login.html">登录</a> <span style="color:var(--text-muted);margin:0 2px">|</span> <a href="register.html">注册</a>`;
    },

    async logout() {
        try {
            await http.post('/api/auth/logout');
            this.user = null;
            toast.success('已退出登录');
            setTimeout(() => location.href = 'index.html', 800);
        } catch (e) {
            toast.error(e.message);
        }
    },

    async updateCartCount() {
        try {
            const res = await http.get('/api/cart/count');
            const cnt = res.data.count;
            const badge = document.getElementById('cartCount');
            if (badge) {
                badge.textContent = cnt > 99 ? '99+' : cnt;
                badge.style.display = cnt > 0 ? 'flex' : 'none';
            }
        } catch (e) { /* ignore */ }
    },

    requireLogin() {
        if (!this.user) {
            toast.warning('请先登录');
            setTimeout(() => location.href = 'login.html?redirect=' + encodeURIComponent(location.href), 800);
            return false;
        }
        return true;
    }
};

// ---- 工具函数 ----
const utils = {
    formatPrice: (p) => '¥' + parseFloat(p).toFixed(2),
    formatDate: (d) => {
        const date = new Date(d);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    },
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
    },
    getUrlParam(name) {
        return new URLSearchParams(location.search).get(name);
    },
    // 表单验证
    validate: {
        required: (val) => val.trim() !== '' ? '' : '此项为必填',
        minLen: (n) => (val) => val.length >= n ? '' : `至少 ${n} 个字符`,
        maxLen: (n) => (val) => val.length <= n ? '' : `最多 ${n} 个字符`,
        phone: (val) => /^1[3-9]\d{9}$/.test(val) ? '' : '手机号格式不正确',
        email: (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '' : '邮箱格式不正确',
    },
    // 显示/隐藏错误
    showError(inputEl, msg) {
        inputEl.classList.toggle('error', !!msg);
        const errEl = inputEl.parentElement.querySelector('.form-error');
        if (errEl) { errEl.textContent = msg; errEl.classList.toggle('show', !!msg); }
    },
    clearError(inputEl) { utils.showError(inputEl, ''); },
};

// ---- 搜索框 ----
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (!searchInput) return;
    const doSearch = () => {
        const kw = searchInput.value.trim();
        if (kw) location.href = `index.html?keyword=${encodeURIComponent(kw)}`;
    };
    searchBtn?.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    // 预填搜索词
    const kw = utils.getUrlParam('keyword');
    if (kw) searchInput.value = decodeURIComponent(kw);
}

// ---- 页面初始化 ----
document.addEventListener('DOMContentLoaded', () => {
    auth.check();
    initSearch();
});
