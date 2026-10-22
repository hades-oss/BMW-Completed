// filter-sort.js - Product Filtering & Sorting for BMW Website

// Helper: parse price string to integer number
function parsePriceNumber(priceStr) {
    if (typeof priceStr === 'number') return Math.round(priceStr);
    if (!priceStr) return 0;
    const clean = String(priceStr).replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
}

document.addEventListener('DOMContentLoaded', () => {
    const shopGrid = document.getElementById('shop-grid');
    if (!shopGrid) return; // Only execute on shop.html

    const categorySelect = document.getElementById('filter-category');
    const priceSelect = document.getElementById('filter-price');
    const sortSelect = document.getElementById('sort-select');
    const productCountDisplay = document.getElementById('product-count-display');
    const tabLinks = document.querySelectorAll('.tabs a, .tabs button');

    // Read initial URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search') ? urlParams.get('search').trim() : (urlParams.get('q') ? urlParams.get('q').trim() : '');
    const categoryParam = urlParams.get('category') ? urlParams.get('category').trim() : 'all';
    const priceParam = urlParams.get('price') ? urlParams.get('price').trim() : 'all';
    const sortParam = urlParams.get('sort') ? urlParams.get('sort').trim() : 'default';

    // Set initial dropdown values from URL params
    if (categorySelect && categoryParam) {
        for (let opt of categorySelect.options) {
            if (opt.value.toLowerCase() === categoryParam.toLowerCase()) {
                categorySelect.value = opt.value;
                break;
            }
        }
    }

    if (priceSelect && priceParam) {
        priceSelect.value = priceParam;
    }

    if (sortSelect && sortParam) {
        sortSelect.value = sortParam;
    }

    // Function to update active category tab visual styling
    function updateTabActiveState(activeCategory) {
        const catLower = (activeCategory || 'all').toLowerCase();

        tabLinks.forEach(tab => {
            tab.classList.remove('active');
            tab.style.color = '#999';
            tab.style.borderBottomColor = 'transparent';

            let tabCat = 'all';
            const href = tab.getAttribute('href') || '';
            const text = tab.textContent.trim().toLowerCase();
            const id = tab.id || '';

            if (id.includes('clothing') || href.toLowerCase().includes('category=clothing') || text === 'clothing' || text === 'trang phục') {
                tabCat = 'clothing';
            } else if (id.includes('accessories') || href.toLowerCase().includes('category=accessories') || text === 'accessories' || text === 'phụ kiện') {
                tabCat = 'accessories';
            } else if (id.includes('equipment') || href.toLowerCase().includes('category=equipment') || text === 'equipment' || text === 'dụng cụ') {
                tabCat = 'equipment';
            } else if (id.includes('all') || text === 'all' || text === 'tất cả') {
                tabCat = 'all';
            }

            if (tabCat === catLower) {
                tab.classList.add('active');
                tab.style.color = 'var(--blue)';
                tab.style.borderBottomColor = 'var(--blue)';
            }
        });
    }

    // Core Filter & Sort Logic Function (Never mutates original products array)
    function applyFilterAndSort() {
        if (typeof products === 'undefined' || !Array.isArray(products)) {
            console.error('products array not defined!');
            return;
        }

        // 0. Copy original catalog array to prevent mutation
        let result = [...products];

        // 1. Filter by Search Query parameter if present
        const searchVal = searchParam ? searchParam.toLowerCase() : '';
        if (searchVal) {
            result = result.filter(p => {
                const name = String(p.name || '').toLowerCase();
                const category = String(p.category || '').toLowerCase();
                const description = String(p.description || '').toLowerCase();
                const tag = String(p.tag || '').toLowerCase();
                return name.includes(searchVal) || category.includes(searchVal) || description.includes(searchVal) || tag.includes(searchVal);
            });

            const pageHeaderTitle = document.querySelector('.page-header h1');
            if (pageHeaderTitle) {
                pageHeaderTitle.innerHTML = `KẾT QUẢ TÌM KIẾM CHO <i>"${searchParam}"</i>`;
            }
        }

        // 2. Filter by Category (ALL, CLOTHING, ACCESSORIES, EQUIPMENT)
        const catVal = categorySelect ? categorySelect.value : categoryParam;
        if (catVal && catVal.toLowerCase() !== 'all') {
            result = result.filter(p => String(p.category || '').toLowerCase() === catVal.toLowerCase());
        }

        // 3. Filter by Price Range if selected
        const priceVal = priceSelect ? priceSelect.value : priceParam;
        if (priceVal && priceVal !== 'all') {
            result = result.filter(p => {
                const num = parsePriceNumber(p.price);
                switch (priceVal) {
                    case 'under500':
                        return num < 500000;
                    case '500-1000':
                        return num >= 500000 && num <= 1000000;
                    case '1000-2000':
                        return num > 1000000 && num <= 2000000;
                    case 'over2000':
                        return num > 2000000;
                    default:
                        return true;
                }
            });
        }

        // 4. Apply Sorting
        const sortVal = sortSelect ? sortSelect.value : sortParam;
        if (sortVal === 'price-low') {
            result.sort((a, b) => parsePriceNumber(a.price) - parsePriceNumber(b.price));
        } else if (sortVal === 'price-high') {
            result.sort((a, b) => parsePriceNumber(b.price) - parsePriceNumber(a.price));
        } else if (sortVal === 'name-az') {
            result.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        } else if (sortVal === 'rating-high') {
            result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        }
        // Default keeps original array order

        // 5. Update URL state without page reload
        const newParams = new URLSearchParams();
        if (searchParam) newParams.set('search', searchParam);
        if (catVal && catVal.toLowerCase() !== 'all') newParams.set('category', catVal);
        if (priceVal && priceVal !== 'all') newParams.set('price', priceVal);
        if (sortVal && sortVal !== 'default') newParams.set('sort', sortVal);

        const newQueryString = newParams.toString();
        const newRelativePathQuery = window.location.pathname + (newQueryString ? '?' + newQueryString : '');
        window.history.replaceState(null, '', newRelativePathQuery);

        // 6. Update Active Tab Highlights
        updateTabActiveState(catVal);

        // 7. Update Product Count Display
        if (productCountDisplay) {
            if (result.length === 0) {
                productCountDisplay.textContent = 'KHÔNG TÌM THẤY SẢN PHẨM';
            } else if (result.length === 1) {
                productCountDisplay.textContent = '1 SẢN PHẨM';
            } else {
                productCountDisplay.textContent = `${result.length} SẢN PHẨM`;
            }
        }

        // 8. Render Results or Empty State
        if (result.length > 0) {
            if (typeof renderProducts === 'function') {
                renderProducts(result, 'shop-grid');
            }
        } else {
            shopGrid.innerHTML = `
                <div class="no-products-found" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <svg style="width: 52px; height: 52px; margin: 0 auto 16px; color: var(--blue);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>
                    <h2 style="font-family: var(--font-display); font-size: 36px; margin: 0 0 12px;">KHÔNG TÌM THẤY SẢN PHẨM</h2>
                    <p style="font-size: 13px; margin: 0 0 28px;">Chúng tôi không tìm thấy sản phẩm nào phù hợp với bộ lọc của bạn.</p>
                    <a href="shop.html" class="button blue" style="display: inline-flex;">TIẾP TỤC MUA SẮM <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
                </div>
            `;
        }
    }

    // Attach Event Listeners to Category Tabs
    tabLinks.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const text = tab.textContent.trim().toLowerCase();
            let selectedCat = 'all';

            if (text.includes('clothing') || text.includes('trang phục')) selectedCat = 'Clothing';
            else if (text.includes('accessories') || text.includes('phụ kiện')) selectedCat = 'Accessories';
            else if (text.includes('equipment') || text.includes('dụng cụ')) selectedCat = 'Equipment';
            else if (text.includes('all') || text.includes('tất cả')) selectedCat = 'all';

            if (categorySelect) {
                for (let opt of categorySelect.options) {
                    if (opt.value.toLowerCase() === selectedCat.toLowerCase()) {
                        categorySelect.value = opt.value;
                        break;
                    }
                }
            }

            applyFilterAndSort();
        });
    });

    // Attach Event Listeners to Dropdowns
    if (categorySelect) categorySelect.addEventListener('change', applyFilterAndSort);
    if (priceSelect) priceSelect.addEventListener('change', applyFilterAndSort);
    if (sortSelect) sortSelect.addEventListener('change', applyFilterAndSort);

    // Initial Filter & Sort Execution on page load
    applyFilterAndSort();
});
