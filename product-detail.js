// product-detail.js - BMW Product Detail Page Functionality

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('product-detail-container');
    if (!container) return; // Only execute on product-detail.html

    // 1. Read Product ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // 2. Find product in products array
    let product = null;
    if (typeof products !== 'undefined' && productId) {
        product = products.find(p => String(p.id) === String(productId).trim());
    }

    // 3. Handle Product Not Found
    if (!product) {
        // Update header title
        const pageHeaderH1 = document.querySelector('.page-header h1');
        if (pageHeaderH1) pageHeaderH1.textContent = 'KHÔNG TÌM THẤY SẢN PHẨM';

        container.innerHTML = `
            <div class="product-not-found-view" style="text-align: center; padding: 60px 20px; max-width: 500px; margin: 0 auto;">
                <svg style="width: 54px; height: 54px; margin: 0 auto 16px; color: var(--blue);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>
                <h2 style="font-family: var(--font-display); font-size: 38px; margin: 0 0 12px;">KHÔNG TÌM THẤY SẢN PHẨM</h2>
                <p style="font-size: 13px; margin: 0 0 28px;">Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
                <a href="shop.html" class="button blue" style="display: inline-flex;">QUAY LẠI CỬA HÀNG <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            </div>
        `;
        return;
    }

    // Update page title & page header
    document.title = `${product.name} - BMW`;
    const pageHeaderH1 = document.querySelector('.page-header h1');
    if (pageHeaderH1) pageHeaderH1.textContent = product.name;

    const oldPriceHtml = product.oldPrice 
        ? `<span class="detail-old-price" style="text-decoration: line-through; color: #999; font-size: 16px; margin-left: 12px;">${product.oldPrice}</span>` 
        : '';
        
    const maxStock = product.stock || 0;

    // 4. Render Product Detail Layout
    container.innerHTML = `
        <div class="product-detail-wrapper">
            <div class="detail-gallery">
                <div class="detail-image-box">
                    <img src="${product.image}" alt="${product.name}">
                    ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ''}
                </div>
            </div>

            <div class="detail-info">
                <p class="eyebrow">${(product.category || 'BMW GEAR').toUpperCase()}</p>
                <h1 class="detail-title">${product.name}</h1>
                
                <div class="detail-meta">
                    <span class="detail-rating">★ ${product.rating.toFixed(1)}</span>
                    <span class="detail-stock-badge ${maxStock > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${maxStock > 0 ? `Còn hàng: ${maxStock}` : 'Hết hàng'}
                    </span>
                </div>

                <div class="detail-price-row">
                    <span class="detail-current-price">${product.price}</span>
                    ${oldPriceHtml}
                </div>

                <p class="detail-description">${product.description || 'Thiết kế tối ưu cho hiệu suất cao, sức mạnh và sự bền bỉ. Dành riêng cho những ai không ngừng nỗ lực mỗi ngày.'}</p>

                <!-- Y4.2 Quantity Selection -->
                <div class="detail-qty-group">
                    <label>SỐ LƯỢNG</label>
                    <div class="qty-control">
                        <button class="btn-qty" id="detail-qty-minus" aria-label="Giảm số lượng">-</button>
                        <span class="qty-number" id="detail-qty-val">1</span>
                        <button class="btn-qty" id="detail-qty-plus" aria-label="Tăng số lượng">+</button>
                    </div>
                </div>

                <!-- Y4.3 Add to Cart Button -->
                <div class="detail-cta-row">
                    <button class="button blue detail-add-btn" id="detail-add-btn" data-id="${product.id}" ${maxStock <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        ${maxStock > 0 ? 'THÊM VÀO GIỎ' : 'HẾT HÀNG'} 
                        ${maxStock > 0 ? `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>` : ''}
                    </button>
                    <button class="button detail-wishlist-btn" id="detail-wishlist-btn" data-id="${product.id}" aria-pressed="false" aria-label="Thêm vào danh sách yêu thích">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.9a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 22l8.8-8.4a5.4 5.4 0 0 0 0-7.7Z"/></svg>
                        <span class="wishlist-btn-text">THÊM VÀO YÊU THÍCH</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // 5. Quantity Control Logic (Y4.2)
    const qtyMinusBtn = document.getElementById('detail-qty-minus');
    const qtyPlusBtn = document.getElementById('detail-qty-plus');
    const qtyValEl = document.getElementById('detail-qty-val');
    
    let selectedQuantity = 1;

    // Default state for OUT OF STOCK
    if (maxStock <= 0) {
        selectedQuantity = 0;
        if (qtyValEl) qtyValEl.textContent = '0';
        if (qtyMinusBtn) {
            qtyMinusBtn.disabled = true;
            qtyMinusBtn.style.opacity = '0.5';
            qtyMinusBtn.style.cursor = 'not-allowed';
        }
        if (qtyPlusBtn) {
            qtyPlusBtn.disabled = true;
            qtyPlusBtn.style.opacity = '0.5';
            qtyPlusBtn.style.cursor = 'not-allowed';
        }
    }

    if (qtyMinusBtn && maxStock > 0) {
        qtyMinusBtn.addEventListener('click', () => {
            if (selectedQuantity > 1) {
                selectedQuantity--;
                qtyValEl.textContent = selectedQuantity;
                
                // Re-enable plus button if we go below maxStock
                qtyPlusBtn.disabled = false;
                qtyPlusBtn.style.opacity = '1';
                qtyPlusBtn.style.cursor = 'pointer';
            }
        });
    }

    if (qtyPlusBtn && maxStock > 0) {
        // Initial check if stock is exactly 1
        if (selectedQuantity >= maxStock) {
            qtyPlusBtn.disabled = true;
            qtyPlusBtn.style.opacity = '0.5';
            qtyPlusBtn.style.cursor = 'not-allowed';
        }

        qtyPlusBtn.addEventListener('click', () => {
            if (selectedQuantity < maxStock) {
                selectedQuantity++;
                qtyValEl.textContent = selectedQuantity;
            }
            
            // Disable plus button if we reached maxStock
            if (selectedQuantity >= maxStock) {
                qtyPlusBtn.disabled = true;
                qtyPlusBtn.style.opacity = '0.5';
                qtyPlusBtn.style.cursor = 'not-allowed';
            }
        });
    }

    // 6. ADD TO CART Logic (Y4.3)
    const addBtn = document.getElementById('detail-add-btn');
    if (addBtn && maxStock > 0) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (typeof addToCart === 'function') {
                // Call Y1 cart logic
                const success = addToCart(product.id, selectedQuantity);
                
                if (success) {
                    // Visual feedback on button (temporary change)
                    const originalHtml = addBtn.innerHTML;
                    addBtn.innerHTML = `ĐÃ THÊM ✔`;
                    
                    setTimeout(() => {
                        addBtn.innerHTML = originalHtml;
                    }, 1200);
                }
            } else {
                console.error("addToCart function not found! Make sure cart.js is loaded.");
            }
        });
    }

    // Y6.1 — sync wishlist state after render (wishlist.js may load before/after)
    if (typeof wishlistAPI !== 'undefined') {
        wishlistAPI.syncWishlistState();
    }
});
