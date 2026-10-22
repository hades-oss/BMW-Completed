// product-render.js

// Render function for generic product card
function createProductCard(product) {
    const oldPriceHtml = product.oldPrice 
        ? `<span class="old-price" style="text-decoration: line-through; color: #999; font-size: 10px; margin-left: 5px;">${product.oldPrice}</span>` 
        : '';
        
    const isLiked = (typeof wishlistAPI !== 'undefined' && typeof wishlistAPI.isInWishlist === 'function')
        ? wishlistAPI.isInWishlist(product.id)
        : false;

    return `
        <article class="product-card group" data-id="${product.id}">
            <div class="product-image">
                <a href="product-detail.html?id=${product.id}">
                    <img src="${product.image}" alt="${product.name}">
                </a>
                <span class="product-tag">${product.tag}</span>
                <button aria-label="${isLiked ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}" class="heart${isLiked ? ' liked' : ''}" data-id="${product.id}">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.9a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 22l8.8-8.4a5.4 5.4 0 0 0 0-7.7Z"/></svg>
                </button>
                <button class="qv-trigger" data-id="${product.id}" aria-label="Xem nhanh ${product.name}">XEM NHANH</button>
                <button class="quick-add" data-id="${product.id}">THÊM VÀO GIỎ</button>
            </div>
            <div class="product-copy">
                <h3><a href="product-detail.html?id=${product.id}">${product.name}</a></h3>
                <div>
                    <span class="price">${product.price}${oldPriceHtml}</span>
                    <span class="rating">★ ${product.rating.toFixed(1)}</span>
                </div>
            </div>
        </article>
    `;
}

// Function to render products into a specific container
function renderProducts(productsToRender, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = productsToRender.map(createProductCard).join('');
        if (typeof wishlistAPI !== 'undefined' && typeof wishlistAPI.syncWishlistState === 'function') {
            wishlistAPI.syncWishlistState();
        }
    }
}

// Function to render Essential category cards
function createEssentialCard(product, index) {
    return `
        <article data-id="${product.id}">
            <span>0${index + 1}</span>
            <div class="item-visual">
                <a href="product-detail.html?id=${product.id}">
                    <img src="${product.image}" alt="${product.name}">
                </a>
                <button class="quick-add-essential" data-id="${product.id}" title="Thêm vào giỏ">+</button>
            </div>
            <h3><a href="product-detail.html?id=${product.id}">${product.name}</a></h3>
            <p>Từ ${product.price}</p>
        </article>
    `;
}

function renderEssentials(category) {
    const container = document.getElementById('essentials-grid');
    if (!container) return;
    
    let targetCat = String(category || '').toUpperCase().trim();
    if (targetCat === 'TRANG PHỤC') targetCat = 'CLOTHING';
    if (targetCat === 'PHỤ KIỆN') targetCat = 'ACCESSORIES';
    if (targetCat === 'DỤNG CỤ') targetCat = 'EQUIPMENT';

    // Get up to 4 products of the specified category
    const catProducts = products.filter(p => p.category.toUpperCase() === targetCat).slice(0, 4);
    
    container.innerHTML = catProducts.map((p, index) => createEssentialCard(p, index)).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Render NEW ARRIVALS (tag = NEW)
    const newProducts = products.filter(p => p.tag === 'NEW');
    renderProducts(newProducts, 'new-arrivals-grid');

    // 2. Render BEST SELLERS (tag = HOT)
    const hotProducts = products.filter(p => p.tag === 'HOT');
    renderProducts(hotProducts, 'best-sellers-grid');
    
    // 3. Render THE ESSENTIALS (by Category tabs)
    renderEssentials('CLOTHING'); // Default tab
    
    // Add event listeners to tabs for switching categories
    const tabButtons = document.querySelectorAll('.product-preview .tabs button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked tab
            e.target.classList.add('active');
            
            // Render specific category
            const category = e.target.getAttribute('data-category') || e.target.textContent.trim();
            renderEssentials(category);
        });
    });
});
