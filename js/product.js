/* ==========================================
   商品详情逻辑 - product.js
   ========================================== */

const productId = utils.getUrlParam('id');
let productData = null;

// ---- 加载商品详情 ----
async function loadProduct() {
    if (!productId) {
        document.getElementById('productDetail').innerHTML =
            '<div class="empty-state"><div class="empty-icon">😕</div><p>商品不存在</p><a class="btn btn-primary" href="index.html">返回首页</a></div>';
        return;
    }

    try {
        const res = await http.get(`/api/products/${productId}`);
        productData = res.data;
        renderProduct(productData);
        loadRelated(productData.category_id, productData.id);

        // 更新面包屑
        document.getElementById('bcCategory').textContent = productData.category_name || '商品分类';
        document.getElementById('bcName').textContent = productData.name;
        document.title = productData.name + ' - 宝淘';

        // 面包屑链接
        const bcCat = document.getElementById('bcCategory');
        bcCat.innerHTML = `<a href="index.html?category=${productData.category_id}">${productData.category_name}</a>`;
    } catch (e) {
        document.getElementById('productDetail').innerHTML =
            `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message || '加载失败'}</p></div>`;
    }
}

function renderProduct(p) {
    const images = (() => {
        try { return JSON.parse(p.images) || [p.image]; }
        catch { return [p.image]; }
    })();

    const discount = p.original_price > p.price
        ? '<span class="price-discount">' + Math.round((1 - p.price / p.original_price) * 10) + '折</span>'
        : '';

    const thumbsHTML = images.length > 1 ? images.map((img, i) => `
        <div class="gallery-thumb${i === 0 ? ' active' : ''}" onclick="switchImage('${img}', this)">
            <img src="${img}" alt="商品图" onerror="this.src='images/products/default.jpg'">
        </div>
    `).join('') : '';

    document.getElementById('productDetail').innerHTML = `
    <div class="product-layout">
        <div class="product-gallery">
            <div class="gallery-main">
                <img id="mainImg" src="${p.image}" alt="${p.name}" onerror="this.src='images/products/default.jpg'">
            </div>
            ${thumbsHTML ? `<div class="gallery-thumbs">${thumbsHTML}</div>` : ''}
        </div>

        <div class="product-info">
            <div class="product-category-badge">${p.category_name || ''}</div>
            <h1 class="product-title">${p.name}</h1>

            <div class="product-price-box">
                <div class="price-label">价格</div>
                <div class="price-main">
                    <span class="price-big">${parseFloat(p.price).toFixed(2)}</span>
                    ${p.original_price > p.price ? `<span class="price-ori">${parseFloat(p.original_price).toFixed(2)}</span>` : ''}
                    ${discount}
                </div>
            </div>

            <div class="product-sales-info">
                <span>已售 <strong>${p.sales > 10000 ? (p.sales/10000).toFixed(1)+'万' : p.sales}+</strong></span>
                <span>库存 <strong>${p.stock}</strong> 件</span>
                <span>卖家 <strong>${p.seller_name || '官方旗舰店'}</strong></span>
            </div>

            <div class="quantity-selector">
                <span class="qty-label">数量</span>
                <button class="qty-btn" onclick="changeQty(-1)">−</button>
                <input class="qty-input" type="number" id="qtyInput" value="1" min="1" max="${p.stock}" onchange="validateQty()">
                <button class="qty-btn" onclick="changeQty(1)">+</button>
                <span class="qty-stock">库存${p.stock}件</span>
            </div>

            <div class="product-actions">
                <button class="btn-cart" onclick="addToCart()">🛒 加入购物车</button>
                <button class="btn-buy" onclick="buyNow()">立即购买</button>
            </div>
        </div>
    </div>

    <div class="product-desc-section">
        <h3>商品详情</h3>
        <p class="product-desc">${p.description || '暂无详细描述'}</p>
    </div>`;
}

// ---- 图片切换 ----
function switchImage(src, thumbEl) {
    document.getElementById('mainImg').src = src;
    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
}

// ---- 数量操作 ----
function changeQty(delta) {
    const input = document.getElementById('qtyInput');
    const max = productData ? productData.stock : 99;
    let val = parseInt(input.value) + delta;
    val = Math.max(1, Math.min(max, val));
    input.value = val;
}
function validateQty() {
    const input = document.getElementById('qtyInput');
    const max = productData ? productData.stock : 99;
    let val = parseInt(input.value) || 1;
    val = Math.max(1, Math.min(max, val));
    input.value = val;
}

// ---- 加入购物车 ----
async function addToCart() {
    if (!auth.requireLogin()) return;
    const qty = parseInt(document.getElementById('qtyInput').value);
    try {
        await http.post('/api/cart', { product_id: parseInt(productId), quantity: qty });
        toast.success('已加入购物车！');
        auth.updateCartCount();
    } catch (e) {
        toast.error(e.message || '加入购物车失败');
    }
}

// ---- 立即购买 ----
function buyNow() {
    if (!auth.requireLogin()) return;
    const qty = parseInt(document.getElementById('qtyInput').value);
    // 直接跳转到下单页，携带商品信息
    location.href = `order.html?product_id=${productId}&quantity=${qty}&direct=1`;
}

// ---- 相关推荐 ----
async function loadRelated(categoryId, excludeId) {
    try {
        const res = await http.get(`/api/products?category=${categoryId}&limit=5`);
        const list = res.data.list.filter(p => p.id != excludeId).slice(0, 4);
        const grid = document.getElementById('relatedGrid');
        if (list.length === 0) {
            grid.innerHTML = '<div class="text-muted" style="padding:20px">暂无相关商品</div>';
            return;
        }
        grid.innerHTML = list.map(p => `
            <div class="product-card fade-in-up" onclick="location.href='product.html?id=${p.id}'">
                <div class="card-img-wrap">
                    <img class="card-img" src="${p.image}" alt="${p.name}" onerror="this.src='images/products/default.jpg'" loading="lazy">
                </div>
                <div class="card-body">
                    <p class="card-name">${p.name}</p>
                    <div class="card-price">
                        <span class="price-now">${parseFloat(p.price).toFixed(2)}</span>
                        ${p.original_price > p.price ? `<span class="price-original">${parseFloat(p.original_price).toFixed(2)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error('加载相关商品失败', e); }
}

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', loadProduct);
