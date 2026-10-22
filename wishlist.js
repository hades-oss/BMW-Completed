// wishlist.js — Y6 Wishlist System
// Key: bmw_wishlist → array of product ID strings in localStorage

(function () {
    'use strict';

    var WISHLIST_KEY = 'bmw_wishlist';

    /* ── Storage helpers ─────────────────────────────────────────── */

    function getWishlist() {
        try {
            var raw = localStorage.getItem(WISHLIST_KEY);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            var clean = [];
            for (var i = 0; i < parsed.length; i++) {
                var id = String(parsed[i]).trim();
                if (!id) continue;
                if (clean.indexOf(id) === -1) {
                    // Filter out invalid product IDs if catalog is loaded
                    if (typeof products !== 'undefined' && Array.isArray(products) && products.length > 0) {
                        var exists = products.some(function (p) { return String(p.id) === id; });
                        if (!exists) continue;
                    }
                    clean.push(id);
                }
            }
            return clean;
        } catch (e) {
            return [];
        }
    }

    function saveWishlist(list) {
        try {
            // Deduplicate and ensure array
            var uniqueList = [];
            for (var i = 0; i < list.length; i++) {
                var item = String(list[i]).trim();
                if (item && uniqueList.indexOf(item) === -1) {
                    uniqueList.push(item);
                }
            }
            localStorage.setItem(WISHLIST_KEY, JSON.stringify(uniqueList));
            return true;
        } catch (e) {
            console.error('LocalStorage write failed:', e);
            return false;
        }
    }

    function isInWishlist(productId) {
        if (!productId) return false;
        return getWishlist().indexOf(String(productId)) !== -1;
    }

    function addToWishlist(productId) {
        if (!productId) return false;
        var id = String(productId).trim();
        
        // Validate against products catalog if available
        if (typeof products !== 'undefined' && Array.isArray(products) && products.length > 0) {
            var found = products.some(function (p) { return String(p.id) === id; });
            if (!found) return false;
        }

        var list = getWishlist();
        if (list.indexOf(id) === -1) {
            list.push(id);
            var saved = saveWishlist(list);
            return saved;
        }
        return true; // already in wishlist
    }

    function removeFromWishlist(productId) {
        if (!productId) return false;
        var id = String(productId).trim();
        var list = getWishlist().filter(function (x) { return x !== id; });
        return saveWishlist(list);
    }

    function toggleWishlist(productId) {
        if (isInWishlist(productId)) {
            var ok = removeFromWishlist(productId);
            if (!ok) return null; // write error
            return false; // removed
        } else {
            var ok = addToWishlist(productId);
            if (!ok) return null; // write error or invalid product
            return true; // added
        }
    }

    /* ── Badge update ────────────────────────────────────────────── */

    function updateWishlistBadge() {
        var count = getWishlist().length;
        var badges = document.querySelectorAll('.wishlist-badge');
        badges.forEach(function (b) {
            b.textContent = count;
            b.style.display = count > 0 ? 'inline-flex' : 'none';
        });

        // Toggle active style on header icon
        var headerBtns = document.querySelectorAll('.wishlist-header-btn');
        headerBtns.forEach(function (btn) {
            if (count > 0) {
                btn.classList.add('has-items');
            } else {
                btn.classList.remove('has-items');
            }
        });
    }

    /* ── DOM state sync ──────────────────────────────────────────── */

    function syncWishlistState() {
        var list = getWishlist();
        
        // 1. Update all product card hearts
        var hearts = document.querySelectorAll('.heart[data-id]');
        hearts.forEach(function (btn) {
            var id = btn.getAttribute('data-id');
            var svg = btn.querySelector('svg');
            if (list.indexOf(id) !== -1) {
                btn.classList.add('liked');
                btn.setAttribute('aria-label', 'Xóa khỏi yêu thích');
                if (svg) svg.setAttribute('fill', 'currentColor');
            } else {
                btn.classList.remove('liked');
                btn.setAttribute('aria-label', 'Thêm vào yêu thích');
                if (svg) svg.setAttribute('fill', 'none');
            }
        });

        // 2. Update product detail page wishlist button
        var detailBtn = document.getElementById('detail-wishlist-btn');
        if (detailBtn) {
            var did = detailBtn.getAttribute('data-id');
            var textEl = detailBtn.querySelector('.wishlist-btn-text');
            var svgEl = detailBtn.querySelector('svg');
            if (list.indexOf(did) !== -1) {
                detailBtn.classList.add('liked');
                detailBtn.setAttribute('aria-pressed', 'true');
                detailBtn.setAttribute('aria-label', 'Xóa khỏi yêu thích');
                if (textEl) textEl.textContent = 'ĐÃ LƯU YÊU THÍCH';
                if (svgEl) svgEl.setAttribute('fill', 'currentColor');
            } else {
                detailBtn.classList.remove('liked');
                detailBtn.setAttribute('aria-pressed', 'false');
                detailBtn.setAttribute('aria-label', 'Thêm vào yêu thích');
                if (textEl) textEl.textContent = 'THÊM VÀO YÊU THÍCH';
                if (svgEl) svgEl.setAttribute('fill', 'none');
            }
        }

        // 3. Update badges
        updateWishlistBadge();
    }

    /* ── Toast notification ──────────────────────────────────────── */

    function showWishlistToast(status) {
        var msg = '';
        if (status === true) {
            msg = '❤️ Đã thêm vào danh sách yêu thích';
        } else if (status === false) {
            msg = '🤍 Đã xóa khỏi danh sách yêu thích';
        } else {
            msg = '⚠️ Không thể cập nhật danh sách yêu thích';
        }

        var existing = document.getElementById('wishlist-toast');
        if (!existing) {
            existing = document.createElement('div');
            existing.id = 'wishlist-toast';
            existing.className = 'cart-toast wishlist-toast-el';
            document.body.appendChild(existing);
        }
        existing.textContent = msg;
        existing.classList.add('show');
        clearTimeout(existing._timer);
        existing._timer = setTimeout(function () {
            existing.classList.remove('show');
        }, 2200);
    }

    /* ── Event delegation for product card hearts ────────────────── */

    function initHeartDelegation() {
        // Product cards heart button delegation
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.heart[data-id]');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();

            var id = btn.getAttribute('data-id');
            var result = toggleWishlist(id);
            if (result === null) {
                showWishlistToast(null);
                return;
            }

            var svg = btn.querySelector('svg');
            if (result === true) {
                btn.classList.add('liked');
                btn.setAttribute('aria-label', 'Xóa khỏi yêu thích');
                if (svg) svg.setAttribute('fill', 'currentColor');
            } else {
                btn.classList.remove('liked');
                btn.setAttribute('aria-label', 'Thêm vào yêu thích');
                if (svg) svg.setAttribute('fill', 'none');
            }
            updateWishlistBadge();
            showWishlistToast(result);
        });

        // Detail page wishlist button delegation
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('#detail-wishlist-btn');
            if (!btn) return;
            e.preventDefault();

            var id = btn.getAttribute('data-id');
            var result = toggleWishlist(id);
            if (result === null) {
                showWishlistToast(null);
                return;
            }

            var textEl = btn.querySelector('.wishlist-btn-text');
            var svgEl = btn.querySelector('svg');
            if (result === true) {
                btn.classList.add('liked');
                btn.setAttribute('aria-pressed', 'true');
                btn.setAttribute('aria-label', 'Xóa khỏi yêu thích');
                if (textEl) textEl.textContent = 'ĐÃ LƯU YÊU THÍCH';
                if (svgEl) svgEl.setAttribute('fill', 'currentColor');
            } else {
                btn.classList.remove('liked');
                btn.setAttribute('aria-pressed', 'false');
                btn.setAttribute('aria-label', 'Thêm vào yêu thích');
                if (textEl) textEl.textContent = 'THÊM VÀO YÊU THÍCH';
                if (svgEl) svgEl.setAttribute('fill', 'none');
            }
            updateWishlistBadge();
            showWishlistToast(result);
        });
    }

    /* ── Cross-tab sync via storage event ───────────────────────── */

    window.addEventListener('storage', function (e) {
        if (e.key === WISHLIST_KEY) {
            syncWishlistState();
        }
    });

    /* ── Initialization ─────────────────────────────────────────── */

    function init() {
        initHeartDelegation();
        syncWishlistState();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* ── Public API ──────────────────────────────────────────────── */

    window.wishlistAPI = {
        getWishlist: getWishlist,
        addToWishlist: addToWishlist,
        removeFromWishlist: removeFromWishlist,
        toggleWishlist: toggleWishlist,
        isInWishlist: isInWishlist,
        syncWishlistState: syncWishlistState,
        updateWishlistBadge: updateWishlistBadge
    };

})();
