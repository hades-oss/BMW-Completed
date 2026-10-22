/* ═══════════════════════════════════════════════════════════════════════════
   BMW GYM — EXT.2: PRODUCT QUICK VIEW (quickview.js)
   ═══════════════════════════════════════════════════════════════════════════
   Dependencies (must be loaded before this file):
     - products.js       (product catalog array)
     - cart.js           (addToCart, showToast, updateCartCount)
     - wishlist.js       (wishlistAPI — optional, graceful fallback)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Internal state ──────────────────────────────────────────────────────
    let currentProductId = null;
    let currentQty = 1;
    let overlay = null;
    let modal = null;

    // ── 1. Build the modal DOM once ─────────────────────────────────────────
    function buildModal() {
        if (document.getElementById('qv-overlay')) return; // already exists

        overlay = document.createElement('div');
        overlay.id = 'qv-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Xem nhanh sản phẩm');
        overlay.innerHTML = `
            <div class="qv-modal" id="qv-modal">
                <button class="qv-close" id="qv-close-btn" aria-label="Đóng xem nhanh">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>

                <!-- Left: image -->
                <div class="qv-image-panel" id="qv-image-panel">
                    <div class="qv-loading">Đang tải…</div>
                </div>

                <!-- Right: info -->
                <div class="qv-info-panel" id="qv-info-panel">
                    <div class="qv-loading">Đang tải…</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        modal = overlay.querySelector('#qv-modal');

        // Close on backdrop click
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        // Close button
        overlay.querySelector('#qv-close-btn').addEventListener('click', closeModal);

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('qv-open')) {
                closeModal();
            }
        });
    }

    // ── 2. Open / close ─────────────────────────────────────────────────────
    function openModal(productId) {
        if (!overlay) buildModal();

        const product = findProductById(productId);
        if (!product) {
            console.warn('[QuickView] Product not found:', productId);
            return;
        }

        currentProductId = String(productId);
        currentQty = 1;

        renderContent(product);
        overlay.classList.add('qv-open');
        document.body.style.overflow = 'hidden';

        // Focus trap: focus close button
        requestAnimationFrame(function () {
            const closeBtn = overlay.querySelector('#qv-close-btn');
            if (closeBtn) closeBtn.focus();
        });
    }

    function closeModal() {
        if (!overlay) return;
        overlay.classList.remove('qv-open');
        document.body.style.overflow = '';
        currentProductId = null;
        currentQty = 1;
    }

    // ── 3. Find product from global catalog ─────────────────────────────────
    function findProductById(id) {
        if (typeof products === 'undefined' || !Array.isArray(products)) return null;
        return products.find(function (p) { return String(p.id) === String(id); }) || null;
    }

    // ── 4. Render modal content ─────────────────────────────────────────────
    function renderContent(product) {
        const imagePanel = overlay.querySelector('#qv-image-panel');
        const infoPanel  = overlay.querySelector('#qv-info-panel');

        // ── Image side ──────────────────────────────────────────────────────
        imagePanel.innerHTML = `
            ${product.tag ? `<span class="qv-tag">${escapeHtml(product.tag)}</span>` : ''}
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
        `;

        // ── Wishlist state ──────────────────────────────────────────────────
        const isLiked = (typeof wishlistAPI !== 'undefined' && typeof wishlistAPI.isInWishlist === 'function')
            ? wishlistAPI.isInWishlist(product.id)
            : false;

        // ── Stock state ─────────────────────────────────────────────────────
        const stock = typeof product.stock === 'number' ? product.stock : 99;
        let stockClass, stockLabel;
        if (stock <= 0) {
            stockClass = 'out-stock'; stockLabel = 'HẾT HÀNG';
        } else if (stock <= 5) {
            stockClass = 'low-stock'; stockLabel = `CHỈ CÒN ${stock} SẢN PHẨM`;
        } else {
            stockClass = 'in-stock'; stockLabel = 'CÒN HÀNG';
        }

        // ── Old price ───────────────────────────────────────────────────────
        const oldPriceHtml = product.oldPrice
            ? `<span class="qv-old-price">${escapeHtml(product.oldPrice)}</span>`
            : '';

        // ── Info side ───────────────────────────────────────────────────────
        infoPanel.innerHTML = `
            <p class="qv-category">${escapeHtml(product.category || '')}</p>
            <h2 class="qv-name">${escapeHtml(product.name)}</h2>
            <div class="qv-price-row">
                <span class="qv-price">${escapeHtml(product.price)}</span>
                ${oldPriceHtml}
            </div>
            <p class="qv-rating">★ ${Number(product.rating).toFixed(1)} / 5.0</p>
            <hr class="qv-divider">
            <p class="qv-description">${escapeHtml(product.description || '')}</p>
            <span class="qv-stock ${stockClass}">${stockLabel}</span>
            <hr class="qv-divider">

            <label class="qv-qty-label" for="qv-qty-val">SỐ LƯỢNG</label>
            <div class="qv-qty-control">
                <button class="qv-qty-btn" id="qv-qty-minus" aria-label="Giảm số lượng"${stock <= 0 ? ' disabled' : ''}>−</button>
                <span class="qv-qty-val" id="qv-qty-val" aria-live="polite">1</span>
                <button class="qv-qty-btn" id="qv-qty-plus"  aria-label="Tăng số lượng"${stock <= 0 ? ' disabled' : ''}>+</button>
            </div>

            <div class="qv-actions">
                <button class="qv-btn-cart" id="qv-btn-cart"${stock <= 0 ? ' disabled' : ''}>
                    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>
                    ${stock <= 0 ? 'HẾT HÀNG' : 'THÊM VÀO GIỎ'}
                </button>
                <button class="qv-btn-wishlist${isLiked ? ' liked' : ''}" id="qv-btn-wishlist">
                    <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor"><path d="M20.8 5.9a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 22l8.8-8.4a5.4 5.4 0 0 0 0-7.7Z"/></svg>
                    <span class="qv-wishlist-text">${isLiked ? 'ĐÃ LƯU YÊU THÍCH' : 'THÊM VÀO YÊU THÍCH'}</span>
                </button>
                <a class="qv-btn-detail" href="product-detail.html?id=${encodeURIComponent(product.id)}">
                    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    XEM CHI TIẾT ĐẦY ĐỦ
                </a>
            </div>
        `;

        // ── Wire up quantity ────────────────────────────────────────────────
        if (stock > 0) {
            const minusBtn = infoPanel.querySelector('#qv-qty-minus');
            const plusBtn  = infoPanel.querySelector('#qv-qty-plus');
            const valSpan  = infoPanel.querySelector('#qv-qty-val');

            minusBtn.addEventListener('click', function () {
                if (currentQty > 1) {
                    currentQty--;
                    valSpan.textContent = currentQty;
                    minusBtn.disabled = currentQty <= 1;
                    plusBtn.disabled  = currentQty >= stock;
                }
            });
            plusBtn.addEventListener('click', function () {
                if (currentQty < stock) {
                    currentQty++;
                    valSpan.textContent = currentQty;
                    minusBtn.disabled = currentQty <= 1;
                    plusBtn.disabled  = currentQty >= stock;
                }
            });

            // Initial state
            minusBtn.disabled = true; // starts at qty=1
        }

        // ── Wire up Add to Cart ─────────────────────────────────────────────
        const cartBtn = infoPanel.querySelector('#qv-btn-cart');
        if (cartBtn && stock > 0) {
            cartBtn.addEventListener('click', function () {
                if (typeof addToCart === 'function') {
                    addToCart(product.id, currentQty);
                } else {
                    console.warn('[QuickView] addToCart not available');
                }
                closeModal();
            });
        }

        // ── Wire up Wishlist toggle ─────────────────────────────────────────
        const wishBtn = infoPanel.querySelector('#qv-btn-wishlist');
        if (wishBtn) {
            wishBtn.addEventListener('click', function () {
                if (typeof wishlistAPI === 'undefined' || typeof wishlistAPI.toggleWishlist !== 'function') {
                    console.warn('[QuickView] wishlistAPI not available');
                    return;
                }
                const nowLiked = wishlistAPI.toggleWishlist(product.id);
                wishBtn.classList.toggle('liked', nowLiked);
                const svg = wishBtn.querySelector('svg');
                const txt = wishBtn.querySelector('.qv-wishlist-text');
                if (svg) svg.setAttribute('fill', nowLiked ? 'currentColor' : 'none');
                if (txt) txt.textContent = nowLiked ? 'ĐÃ LƯU YÊU THÍCH' : 'THÊM VÀO YÊU THÍCH';

                // Sync heart buttons on the page
                if (typeof wishlistAPI.syncWishlistState === 'function') {
                    wishlistAPI.syncWishlistState();
                }
            });
        }
    }

    // ── 5. Escape helper ────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── 6. Delegate click events from product cards ─────────────────────────
    //    Handles .qv-trigger buttons injected into every product card.
    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('.qv-trigger');
        if (!trigger) return;
        e.preventDefault();
        e.stopPropagation();
        const productId = trigger.dataset.id;
        if (productId) openModal(productId);
    });

    // ── 7. Public API ───────────────────────────────────────────────────────
    window.quickViewAPI = {
        open:  openModal,
        close: closeModal
    };

    // Build the modal DOM immediately so it's ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildModal);
    } else {
        buildModal();
    }

})();
