/* ==========================================
   首页逻辑 - home.js
   ========================================== */

let currentPage = 1;
let currentCategory = null;
let currentKeyword = utils.getUrlParam('keyword') || '';
let currentSort = 'sales';
let totalPages = 1;

// ---- 分类 ----
async function loadCategories() {
    try {
        const res = await http.get('/api/products/categories');
        const cats = res.data;
        renderSideCategories(cats);
        renderCategoryGrid(cats);
        renderCategoryNav(cats);
    } catch (e) {
        console.error('加载分类失败', e);
    }
}

function renderSideCategories(cats) {
    const el = document.getElementById('sideCategories');
    el.innerHTML = cats.map(c => `
        <div class="side-cat-item" onclick="filterByCategory(${c.id}, '${c.name}')">
            <img src="${c.icon}" alt="${c.name}" onerror="this.src='images/default-avatar.svg'">
            <span>${c.name}</span>
            <span class="arrow">›</span>
        </div>
    `).join('');
}

function renderCategoryGrid(cats) {
    const el = document.getElementById('categoryGrid');
    el.innerHTML = cats.map(c => `
        <div class="cat-card fade-in-up" onclick="filterByCategory(${c.id}, '${c.name}')">
            <img src="${c.icon}" alt="${c.name}" onerror="this.src='images/default-avatar.svg'">
            <span>${c.name}</span>
        </div>
    `).join('');
}

function renderCategoryNav(cats) {
    const nav = document.getElementById('categoryNav');
    const allActive = !currentCategory ? ' active' : '';
    let html = `<a href="index.html" class="${allActive}">全部商品</a>`;
    cats.forEach(c => {
        const cls = currentCategory === c.id ? ' active' : '';
        html += `<a href="index.html?category=${c.id}" class="${cls}">${c.name}</a>`;
    });
    nav.innerHTML = html;
}

function filterByCategory(id, name) {
    currentCategory = id;
    currentPage = 1;
    if (name) {
        document.getElementById('sectionTitleText').textContent = name;
        document.querySelectorAll('.category-nav a').forEach(a => a.classList.remove('active'));
    }
    loadProducts();
    document.querySelector('.section-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- 商品列表 ----
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '<div class="loading-wrap" style="grid-column:1/-1"><div class="spinner"></div><span>加载中...</span></div>';

    let url = `/api/products?page=${currentPage}&limit=20`;
    if (currentCategory) url += `&category=${currentCategory}`;
    if (currentKeyword) url += `&keyword=${encodeURIComponent(currentKeyword)}`;
    if (currentSort === 'price_asc') url += '&sort=price_asc';
    else if (currentSort === 'price_desc') url += '&sort=price_desc';
    else if (currentSort === 'newest') url += '&sort=newest';

    try {
        const res = await http.get(url);
        const { list, total, totalPages: tp } = res.data;
        totalPages = tp;

        if (list.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
                <div class="empty-icon">🔍</div>
                <p>没有找到相关商品</p>
                <button class="btn btn-outline btn-sm" onclick="clearFilter()">查看全部</button>
            </div>`;
        } else {
            grid.innerHTML = list.map(p => productCardHTML(p)).join('');
        }
        renderPagination(total, tp);
        if (currentKeyword) {
            document.getElementById('sectionTitleText').textContent = `"${currentKeyword}" 的搜索结果 (${total}件)`;
        }
    } catch (e) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><p>加载失败，请刷新重试</p></div>`;
    }
}

function productCardHTML(p) {
    const discount = p.original_price > p.price
        ? Math.round((1 - p.price / p.original_price) * 10) + '折'
        : '';
    return `
    <div class="product-card fade-in-up" onclick="location.href='product.html?id=${p.id}'">
        <div class="card-img-wrap">
            <img class="card-img" src="${p.image}" alt="${p.name}" onerror="this.src='images/products/default.jpg'" loading="lazy">
        </div>
        <div class="card-body">
            <p class="card-name">${p.name}</p>
            <div class="card-price">
                <span class="price-now">${parseFloat(p.price).toFixed(2)}</span>
                ${p.original_price > p.price ? `<span class="price-original">${parseFloat(p.original_price).toFixed(2)}</span>` : ''}
                ${discount ? `<span class="badge badge-sale">${discount}</span>` : ''}
            </div>
            <p class="card-sales">已售 ${p.sales > 10000 ? (p.sales/10000).toFixed(1) + '万' : p.sales}+</p>
        </div>
    </div>`;
}

function clearFilter() {
    currentCategory = null;
    currentKeyword = '';
    currentPage = 1;
    document.getElementById('sectionTitleText').textContent = '猜你喜欢';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    loadProducts();
}

// ---- 分页 ----
function renderPagination(total, tp) {
    const el = document.getElementById('pagination');
    if (tp <= 1) { el.innerHTML = ''; return; }
    let html = '';
    html += `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>«</button>`;
    const start = Math.max(1, currentPage-2);
    const end = Math.min(tp, currentPage+2);
    if (start > 1) html += `<button class="page-btn" onclick="goPage(1)">1</button>${start>2?'<span class="page-btn" style="border:none">…</span>':''}`;
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn${i===currentPage?' active':''}" onclick="goPage(${i})">${i}</button>`;
    }
    if (end < tp) html += `${end<tp-1?'<span class="page-btn" style="border:none">…</span>':''}<button class="page-btn" onclick="goPage(${tp})">${tp}</button>`;
    html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===tp?'disabled':''}>»</button>`;
    el.innerHTML = html;
}

function goPage(p) {
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    loadProducts();
    document.querySelector('.section-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- 轮播图 ----
function initCarousel() {
    const track = document.getElementById('carouselTrack');
    const dotsWrap = document.getElementById('carouselDots');
    const slides = track.querySelectorAll('.carousel-slide');
    let idx = 0;
    let timer;

    dotsWrap.innerHTML = Array.from(slides).map((_, i) =>
        `<div class="carousel-dot${i===0?' active':''}" onclick="goSlide(${i})"></div>`
    ).join('');

    function goSlide(i) {
        idx = (i + slides.length) % slides.length;
        track.style.transform = `translateX(-${idx * 100}%)`;
        dotsWrap.querySelectorAll('.carousel-dot').forEach((d, j) => d.classList.toggle('active', j === idx));
    }

    window.goSlide = goSlide;

    document.getElementById('carouselPrev')?.addEventListener('click', () => { goSlide(idx - 1); resetTimer(); });
    document.getElementById('carouselNext')?.addEventListener('click', () => { goSlide(idx + 1); resetTimer(); });

    function resetTimer() { clearInterval(timer); timer = setInterval(() => goSlide(idx + 1), 4000); }
    resetTimer();
}

// ---- 排序 ----
document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        currentPage = 1;
        loadProducts();
    });
});

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', () => {
    // 处理 URL 参数
    const catParam = utils.getUrlParam('category');
    if (catParam) currentCategory = parseInt(catParam);
    const sortParam = utils.getUrlParam('sort');
    if (sortParam && ['sales','price_asc','price_desc','newest'].includes(sortParam)) {
        currentSort = sortParam;
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === sortParam));
    }
    if (currentKeyword) {
        document.getElementById('sectionTitleText').textContent = `搜索: ${currentKeyword}`;
    }

    initCarousel();
    loadCategories();
    loadProducts();
});
