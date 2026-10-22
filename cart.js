// cart.js - BMW Cart & LocalStorage Manager

const CART_STORAGE_KEY = 'bmw_cart';

// Helper: parse price string or number to integer
function parsePrice(priceStr) {
    if (typeof priceStr === 'number') return Math.round(priceStr);
    if (!priceStr) return 0;
    const cleanStr = String(priceStr).replace(/[^0-9]/g, '');
    return parseInt(cleanStr, 10) || 0;
}

// Helper: format integer to VND string (e.g. 690.000₫)
function formatVND(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
    return Math.round(amount).toLocaleString('vi-VN') + '₫';
}

// Helper: find product by ID in products array
function findProduct(productId) {
    if (typeof products !== 'undefined' && Array.isArray(products)) {
        return products.find(p => String(p.id) === String(productId).trim()) || null;
    }
    return null;
}

// Get cart array from LocalStorage with robust validation & catalog sync
function getCart() {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (!stored) return [];

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
            console.warn('Cart data in localStorage is not an array. Resetting.');
            return [];
        }

        const validCart = [];
        let dataChanged = false;

        for (const item of parsed) {
            if (!item || !item.id) {
                dataChanged = true;
                continue;
            }

            const product = findProduct(item.id);
            // If product catalog is loaded and product doesn't exist, drop it safely
            if (typeof products !== 'undefined' && Array.isArray(products) && !product) {
                console.warn(`Product ID ${item.id} not found in catalog. Dropping from cart.`);
                dataChanged = true;
                continue;
            }

            // Sanitize quantity
            let qty = parseInt(item.quantity, 10);
            if (isNaN(qty) || qty < 1) {
                qty = 1;
                dataChanged = true;
            }

            // Check stock limit if product has stock
            if (product && typeof product.stock === 'number' && product.stock >= 0) {
                if (qty > product.stock) {
                    qty = product.stock;
                    dataChanged = true;
                }
            }

            validCart.push({
                id: String(item.id),
                name: product ? product.name : (item.name || 'BMW Product'),
                price: product ? product.price : (item.price || '0₫'),
                image: product ? product.image : (item.image || ''),
                category: product ? (product.category || 'BMW Gear') : (item.category || 'BMW Gear'),
                stock: product && typeof product.stock === 'number' ? product.stock : (item.stock ?? 999),
                quantity: qty
            });
        }

        // Auto-heal localStorage if data was invalid or synced with products
        if (dataChanged) {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validCart));
            } catch (saveErr) {
                console.error('Failed to sync cleansed cart to localStorage:', saveErr);
            }
        }

        return validCart;
    } catch (e) {
        console.error('Failed to parse cart from localStorage:', e);
        return [];
    }
}

// Save cart array to LocalStorage
function saveCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
    }
    updateCartCount();
    renderCartPage();
}

// Get total items quantity in cart (sum of quantities)
function getCartCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
}

// Update all header bag icons (i elements inside .bag)
function updateCartCount() {
    const count = getCartCount();
    const bagBadgeElements = document.querySelectorAll('.bag i');
    bagBadgeElements.forEach(badge => {
        badge.textContent = count;
    });
}

// Helper: safely escape HTML characters in cart UI strings
function escapeCartHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Show a temporary toast message with optional clickable action link
function showToast(message, type = 'info', actionText = null, actionCallback = null) {
    let toast = document.getElementById('bmw-cart-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'bmw-cart-toast';
        toast.className = 'cart-toast';
        document.body.appendChild(toast);
    }

    let actionHtml = '';
    if (actionText) {
        actionHtml = `<div class="toast-action" id="toast-action-btn">${escapeCartHtml(actionText)} →</div>`;
    }

    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-msg">${message}</div>
            ${actionHtml}
        </div>
    `;
    toast.className = `cart-toast show ${type}`;

    const actionBtn = toast.querySelector('#toast-action-btn');
    if (actionBtn) {
        actionBtn.style.cursor = 'pointer';
        actionBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof actionCallback === 'function') {
                actionCallback();
            } else {
                window.location.href = 'cart.html';
            }
        };
    }

    toast.onclick = (e) => {
        if (actionText && (actionText.toUpperCase().includes('CART') || actionText.toUpperCase().includes('GIỎ HÀNG'))) {
            window.location.href = 'cart.html';
        }
    };

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add item to cart with stock validation
function addToCart(productId, quantity = 1) {
    quantity = parseInt(quantity, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;

    const product = findProduct(productId);
    if (!product) {
        console.error(`Product with ID ${productId} not found!`);
        showToast('Không tìm thấy sản phẩm!', 'warning');
        return false;
    }

    const maxStock = typeof product.stock === 'number' ? product.stock : 999;
    if (maxStock <= 0) {
        showToast(`Sản phẩm "${product.name}" hiện đã hết hàng!`, 'warning');
        return false;
    }

    let cart = getCart();
    const existingIndex = cart.findIndex(item => String(item.id) === String(productId));

    if (existingIndex > -1) {
        const currentQty = cart[existingIndex].quantity;
        if (currentQty >= maxStock) {
            showToast(`Bạn đã đạt giới hạn số lượng tồn kho (${maxStock}) cho "${product.name}" trong giỏ hàng!`, 'warning');
            return false;
        }
        if (currentQty + quantity > maxStock) {
            const addedQty = maxStock - currentQty;
            cart[existingIndex].quantity = maxStock;
            saveCart(cart);
            showToast(`✓ Đã thêm ${addedQty} sản phẩm (Đã đạt giới hạn tồn kho: ${maxStock})`, 'success', 'XEM GIỎ HÀNG', () => { window.location.href = 'cart.html'; });
            return true;
        }
        cart[existingIndex].quantity += quantity;
    } else {
        const addQty = Math.min(quantity, maxStock);
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category || 'BMW Gear',
            stock: maxStock,
            quantity: addQty
        });
        if (quantity > maxStock) {
            saveCart(cart);
            showToast(`✓ Đã thêm ${addQty} sản phẩm (Đã đạt giới hạn tồn kho: ${maxStock})`, 'success', 'XEM GIỎ HÀNG', () => { window.location.href = 'cart.html'; });
            return true;
        }
    }

    saveCart(cart);
    showToast(`✓ ĐÃ THÊM "${product.name.toUpperCase()}" VÀO GIỎ HÀNG`, 'success', 'XEM GIỎ HÀNG', () => { window.location.href = 'cart.html'; });
    return true;
}

// Update quantity of an item (+1 or -1)
function updateQuantity(productId, delta) {
    let cart = getCart();
    const item = cart.find(i => String(i.id) === String(productId));
    if (!item) return;

    const product = findProduct(productId);
    const maxStock = product && typeof product.stock === 'number' ? product.stock : (item.stock || 999);

    if (delta > 0) {
        if (item.quantity >= maxStock) {
            showToast(`Số lượng tối đa trong kho là ${maxStock} sản phẩm!`, 'warning');
            return;
        }
        item.quantity += 1;
    } else if (delta < 0) {
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            item.quantity = 1;
        }
    }

    saveCart(cart);
}

// Remove item from cart
function removeFromCart(productId) {
    let cart = getCart();
    const itemToRemove = cart.find(i => String(i.id) === String(productId));
    const itemName = itemToRemove ? itemToRemove.name : 'Product';
    cart = cart.filter(i => String(i.id) !== String(productId));
    saveCart(cart);
    showToast(`Đã xóa "${itemName}" khỏi giỏ hàng!`, 'info');
}

// Clear entire cart
function clearCart() {
    saveCart([]);
    showToast('Đã xóa toàn bộ giỏ hàng!', 'info');
}

// Render cart page if on cart.html
function renderCartPage() {
    const container = document.getElementById('cart-page-content');
    if (!container) return; // Not on cart.html

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-view">
                <svg class="cart-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>
                </svg>
                <h2>GIỎ HÀNG CỦA BẠN ĐANG TRỐNG</h2>
                <p>Có vẻ như bạn chưa thêm sản phẩm BMW nào vào giỏ hàng.</p>
                <a href="shop.html" class="button blue">TIẾP TỤC MUA SẮM <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            </div>
        `;
        return;
    }

    let subtotal = 0;
    let totalItems = 0;

    const itemsHtml = cart.map(item => {
        const itemPriceNum = parsePrice(item.price);
        const itemTotalNum = itemPriceNum * item.quantity;
        subtotal += itemTotalNum;
        totalItems += item.quantity;

        const maxStock = item.stock || 999;
        const isMax = item.quantity >= maxStock;

        return `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-img">
                    <a href="product-detail.html?id=${item.id}">
                        <img src="${item.image}" alt="${item.name}">
                    </a>
                </div>
                <div class="cart-item-info">
                    <h3><a href="product-detail.html?id=${item.id}">${item.name}</a></h3>
                    <span class="cart-item-price">${item.price}</span>
                </div>
                <div class="cart-item-qty">
                    <button class="btn-qty btn-minus" data-id="${item.id}" aria-label="Giảm số lượng">-</button>
                    <span class="qty-number">${item.quantity}</span>
                    <button class="btn-qty btn-plus" data-id="${item.id}" aria-label="Tăng số lượng" ${isMax ? 'title="Đã đạt giới hạn tồn kho"' : ''}>+</button>
                </div>
                <div class="cart-item-total">
                    <span>${formatVND(itemTotalNum)}</span>
                </div>
                <button class="cart-item-remove" data-id="${item.id}" title="Xóa sản phẩm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg>
                    <span>XÓA</span>
                </button>
            </div>
        `;
    }).join('');

    const formattedSubtotal = formatVND(subtotal);

    container.innerHTML = `
        <div class="cart-wrapper">
            <div class="cart-items-list">
                <div class="cart-list-header">
                    <span>SẢN PHẨM</span>
                    <span>SỐ LƯỢNG</span>
                    <span>TỔNG TIỀN</span>
                    <span></span>
                </div>
                ${itemsHtml}
                <div class="cart-actions-row">
                    <a href="shop.html" class="text-link">← TIẾP TỤC MUA SẮM</a>
                    <button type="button" class="cart-clear-btn" id="cart-clear-btn">XÓA GIỎ HÀNG</button>
                </div>
            </div>
            
            <div class="cart-summary-box">
                <h2>TỔNG QUAN ĐƠN HÀNG</h2>
                <div class="summary-line">
                    <span>TỔNG SỐ LƯỢNG</span>
                    <strong>${totalItems}</strong>
                </div>
                <div class="summary-line">
                    <span>TẠM TÍNH</span>
                    <span>${formattedSubtotal}</span>
                </div>
                <div class="summary-line">
                    <span>VẬN CHUYỂN</span>
                    <span>${subtotal >= 1500000 ? '<strong style="color: #10B981">MIỄN PHÍ</strong>' : 'Tính khi thanh toán'}</span>
                </div>
                <div class="summary-total">
                    <span>TỔNG TIỀN</span>
                    <strong>${formattedSubtotal}</strong>
                </div>
                <button class="button blue checkout-btn" onclick="window.location.href='checkout.html'">
                    TIẾN HÀNH THANH TOÁN <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
            </div>
        </div>
    `;
}

// Global Event Listeners initialization
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Bag Count update
    updateCartCount();

    // 2. Render Cart Page if container exists
    renderCartPage();

    // 3. Make all .bag elements clickable to open cart.html
    document.querySelectorAll('.bag').forEach(bagBtn => {
        bagBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'cart.html';
        });
    });

    // 4. Global click listener for Add to Cart, Quantity buttons, Remove buttons, Clear Cart
    document.addEventListener('click', (e) => {
        // Clear Cart button
        const clearBtn = e.target.closest('#cart-clear-btn, .cart-clear-btn');
        if (clearBtn) {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?')) {
                clearCart();
            }
            return;
        }

        // Add to cart from quick-add button
        const addBtn = e.target.closest('.quick-add, .quick-add-essential, [data-add-to-cart]');
        if (addBtn) {
            e.preventDefault();
            let productId = addBtn.getAttribute('data-id');
            if (!productId) {
                const parentCard = addBtn.closest('[data-id]');
                if (parentCard) productId = parentCard.getAttribute('data-id');
            }
            if (productId) {
                const origText = addBtn.textContent;
                const success = addToCart(productId, 1);
                if (success) {
                    addBtn.textContent = 'ĐÃ THÊM ✓';
                    setTimeout(() => { addBtn.textContent = origText; }, 1000);
                }
            }
            return;
        }

        // Cart Page Quantity Plus
        const plusBtn = e.target.closest('.btn-plus');
        if (plusBtn) {
            e.preventDefault();
            const id = plusBtn.getAttribute('data-id');
            if (id) updateQuantity(id, 1);
            return;
        }

        // Cart Page Quantity Minus
        const minusBtn = e.target.closest('.btn-minus');
        if (minusBtn) {
            e.preventDefault();
            const id = minusBtn.getAttribute('data-id');
            if (id) updateQuantity(id, -1);
            return;
        }

        // Cart Page Remove
        const removeBtn = e.target.closest('.cart-item-remove');
        if (removeBtn) {
            e.preventDefault();
            const id = removeBtn.getAttribute('data-id');
            if (id) removeFromCart(id);
            return;
        }
    });
});
