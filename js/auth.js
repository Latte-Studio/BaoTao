/* ==========================================
   登录注册逻辑 - auth.js
   ========================================== */

const isLoginPage = location.pathname.includes('login.html') || location.pathname.endsWith('/login');
const isRegisterPage = location.pathname.includes('register.html') || location.pathname.endsWith('/register');

// ---- 通用: 密码显示切换 ----
document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
        } else {
            input.type = 'password';
            btn.textContent = '👁';
        }
    });
});

// ---- 登录页逻辑 ----
if (isLoginPage) {
    const form = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // 实时校验
    usernameInput?.addEventListener('blur', () => {
        const err = utils.validate.required(usernameInput.value);
        utils.showError(usernameInput, err);
    });
    passwordInput?.addEventListener('blur', () => {
        const err = utils.validate.required(passwordInput.value);
        utils.showError(passwordInput, err);
    });
    usernameInput?.addEventListener('input', () => utils.clearError(usernameInput));
    passwordInput?.addEventListener('input', () => utils.clearError(passwordInput));

    // 体验账号快速填写
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            usernameInput.value = btn.dataset.user;
            passwordInput.value = '123456';
            utils.clearError(usernameInput);
            utils.clearError(passwordInput);
        });
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        let valid = true;
        if (!username) { utils.showError(usernameInput, '用户名不能为空'); valid = false; }
        if (!password) { utils.showError(passwordInput, '密码不能为空'); valid = false; }
        if (!valid) return;

        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.textContent = '登录中...';

        try {
            const res = await http.post('/api/auth/login', { username, password });
            toast.success('登录成功！');
            const redirect = utils.getUrlParam('redirect');
            setTimeout(() => {
                location.href = redirect ? decodeURIComponent(redirect) : 'index.html';
            }, 800);
        } catch (e) {
            toast.error(e.message || '登录失败');
            btn.disabled = false;
            btn.textContent = '登录';
        }
    });

    // 已登录则跳转
    auth.check().then(data => {
        if (data.loggedIn) location.href = 'index.html';
    });
}

// ---- 注册页逻辑 ----
if (isRegisterPage) {
    let selectedRole = 'buyer';

    // 角色切换
    document.querySelectorAll('.role-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.role-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedRole = opt.dataset.role;
            opt.querySelector('input[type=radio]').checked = true;
        });
    });

    const form = document.getElementById('registerForm');
    const fields = {
        username: { el: document.getElementById('regUsername'), rules: [utils.validate.required, utils.validate.minLen(3), utils.validate.maxLen(20)] },
        password: { el: document.getElementById('regPassword'), rules: [utils.validate.required, utils.validate.minLen(6)] },
        confirm: { el: document.getElementById('regConfirm'), rules: [utils.validate.required] },
        phone: { el: document.getElementById('regPhone'), rules: [] },
        email: { el: document.getElementById('regEmail'), rules: [] },
    };

    // 实时校验
    Object.entries(fields).forEach(([key, { el, rules }]) => {
        if (!el) return;
        el.addEventListener('blur', () => {
            for (const rule of rules) {
                const err = rule(el.value);
                if (err) { utils.showError(el, err); return; }
            }
            if (key === 'phone' && el.value) {
                const err = utils.validate.phone(el.value);
                if (err) { utils.showError(el, err); return; }
            }
            if (key === 'email' && el.value) {
                const err = utils.validate.email(el.value);
                if (err) { utils.showError(el, err); return; }
            }
            if (key === 'confirm') {
                const pwd = fields.password.el.value;
                if (el.value !== pwd) { utils.showError(el, '两次密码不一致'); return; }
            }
            utils.clearError(el);
        });
        el.addEventListener('input', () => utils.clearError(el));
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = fields.username.el.value.trim();
        const password = fields.password.el.value;
        const confirm = fields.confirm.el.value;
        const phone = fields.phone.el?.value.trim();
        const email = fields.email.el?.value.trim();
        const nickname = document.getElementById('regNickname')?.value.trim();

        // 整体校验
        let valid = true;
        if (username.length < 3) { utils.showError(fields.username.el, '用户名至少3个字符'); valid = false; }
        if (password.length < 6) { utils.showError(fields.password.el, '密码至少6个字符'); valid = false; }
        if (password !== confirm) { utils.showError(fields.confirm.el, '两次密码不一致'); valid = false; }
        if (phone && !/^1[3-9]\d{9}$/.test(phone)) { utils.showError(fields.phone.el, '手机号格式不正确'); valid = false; }
        if (!valid) return;

        const btn = document.getElementById('registerBtn');
        btn.disabled = true;
        btn.textContent = '注册中...';

        try {
            await http.post('/api/auth/register', { username, password, role: selectedRole, nickname, phone, email });
            toast.success('注册成功！正在跳转...');
            setTimeout(() => location.href = 'login.html', 1200);
        } catch (e) {
            toast.error(e.message || '注册失败');
            btn.disabled = false;
            btn.textContent = '立即注册';
        }
    });
}
