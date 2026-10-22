// wishlist-page.js — Y6.3 Wishlist page renderer

(function () {
    'use strict';

    function renderWishlistPage() {
        var grid = document.getElementById('wishlist-grid');
        var countEl = document.getElementById('wishlist-count-display');
        if (!grid) return;

        var wishlist = (typeof wishlistAPI !== 'undefined') ? wishlistAPI.getWishlist() : [];

        // Filter valid products from wishlist IDs
        var wishlistProducts = [];
        if (typeof products !== 'undefined' && Array.isArray(products)) {
            wishlist.forEach(function (id) {
                var p = products.find(function (x) { return String(x.id) === String(id); });
                if (p) wishlistProducts.push(p);
            });
        }

        // Update count display
        if (countEl) {
            if (wishlistProducts.length === 0) {
                countEl.textContent = '0 SẢN PHẨM';
            } else if (wishlistProducts.length === 1) {
                countEl.textContent = '1 SẢN PHẨM';
            } else {
                countEl.textContent = wishlistProducts.length + ' SẢN PHẨM';
            }
        }

        if (wishlistProducts.length === 0) {
            grid.innerHTML = `
                <div class="wishlist-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.8 5.9a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 22l8.8-8.4a5.4 5.4 0 0 0 0-7.7Z"/></svg>
                    <h2>DANH SÁCH YÊU THÍCH TRỐNG</h2>
                    <p>Lưu lại những sản phẩm bạn yêu thích để dễ dàng tìm kiếm khi cần.</p>
                    <a href="shop.html" class="button blue" style="display:inline-flex;">TIẾP TỤC MUA SẮM
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </a>
                </div>
            `;
            return;
        }

        grid.innerHTML = wishlistProducts.map(function (p) {
            var oldPriceHtml = p.oldPrice
                ? `<span style="text-decoration:line-through;color:#999;font-size:10px;margin-left:5px;">${p.oldPrice}</span>`
                : '';
            return `
                <article class="product-card group" data-id="${p.id}">
                    <div class="product-image">
                        <a href="product-detail.html?id=${p.id}">
                            <img src="${p.image}" alt="${p.name}">
                        </a>
                        <span class="product-tag">${p.tag}</span>
                        <button aria-label="Xóa khỏi danh sách yêu thích" class="heart liked" data-id="${p.id}">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.9a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 22l8.8-8.4a5.4 5.4 0 0 0 0-7.7Z"/></svg>
                        </button>
                    </div>
                    <div class="product-copy">
                        <h3><a href="product-detail.html?id=${p.id}">${p.name}</a></h3>
                        <div>
                            <span class="price">${p.price}${oldPriceHtml}</span>
                            <span class="rating">★ ${p.rating.toFixed(1)}</span>
                        </div>
                        <div class="wishlist-item-actions">
                            <button class="button blue quick-add" data-id="${p.id}" style="font-size:10px;padding:10px 14px;">THÊM VÀO GIỎ</button>
                            <a href="product-detail.html?id=${p.id}" class="button wishlist-view-btn" style="font-size:10px;padding:8px 14px;text-align:center;text-decoration:none;display:block;">XEM CHI TIẾT</a>
                            <button class="wishlist-remove-btn" data-id="${p.id}">
                                <svg style="width:12px;height:12px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                XÓA
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Attach remove buttons
        var removeBtns = grid.querySelectorAll('.wishlist-remove-btn');
        removeBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var id = btn.getAttribute('data-id');
                if (typeof wishlistAPI !== 'undefined') {
                    wishlistAPI.removeFromWishlist(id);
                }
                renderWishlistPage();
                if (typeof wishlistAPI !== 'undefined') {
                    wishlistAPI.updateWishlistBadge();
                }
            });
        });
    }

    // When heart button on wishlist page is toggled, refresh grid
    var gridEl = document.getElementById('wishlist-grid');
    if (gridEl) {
        gridEl.addEventListener('click', function (e) {
            if (e.target.closest('.heart[data-id]')) {
                setTimeout(renderWishlistPage, 60);
            }
        });
    }

    // Re-render on storage events (cross-tab)
    window.addEventListener('storage', function (e) {
        if (e.key === 'bmw_wishlist') {
            renderWishlistPage();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderWishlistPage);
    } else {
        renderWishlistPage();
    }

    window.renderWishlistPage = renderWishlistPage;

})();
