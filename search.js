// search.js - Product Search Functionality for BMW Website

// Helper: Filter products across multiple fields (name, category, description, tag)
function searchProducts(keyword) {
    if (typeof products === 'undefined' || !Array.isArray(products)) {
        console.warn('products catalog array not found or invalid');
        return [];
    }
    if (!keyword || typeof keyword !== 'string') return [];

    const cleanKeyword = keyword.trim().toLowerCase();
    if (!cleanKeyword) return [];

    return products.filter(product => {
        if (!product) return false;
        const name = String(product.name || '').toLowerCase();
        const category = String(product.category || '').toLowerCase();
        const description = String(product.description || '').toLowerCase();
        const tag = String(product.tag || '').toLowerCase();

        return name.includes(cleanKeyword) ||
               category.includes(cleanKeyword) ||
               description.includes(cleanKeyword) ||
               tag.includes(cleanKeyword);
    });
}

// Escape HTML for safe display in UI
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. HEADER SEARCH PANEL (Global across all pages)
    // ==========================================
    let searchPanel = document.getElementById('search-panel');
    const header = document.querySelector('.header');
    const searchTriggerBtn = document.querySelector('.header-actions button[aria-label="Search"], .search-btn');

    // Auto-create Search Panel overlay in header if not already in markup
    if (!searchPanel && header) {
        searchPanel = document.createElement('form');
        searchPanel.id = 'search-panel';
        searchPanel.className = 'search-panel hidden';
        searchPanel.setAttribute('role', 'search');
        searchPanel.innerHTML = `
            <input type="text" id="search-input" placeholder="Tìm kiếm theo tên, danh mục, thẻ tag..." autocomplete="off">
            <button type="submit" aria-label="Gửi tìm kiếm">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>
            </button>
            <button type="button" class="close-search" id="close-search" aria-label="Đóng tìm kiếm">&times;</button>
        `;
        header.appendChild(searchPanel);
    }

    const headerSearchInput = document.getElementById('search-input');
    const closeSearchBtn = document.getElementById('close-search');

    function openHeaderSearch() {
        if (!searchPanel) return;
        searchPanel.classList.remove('hidden');
        searchPanel.classList.add('active');
        if (headerSearchInput) {
            const urlParams = new URLSearchParams(window.location.search);
            const currentSearch = urlParams.get('q') || urlParams.get('search');
            if (currentSearch && !headerSearchInput.value) {
                headerSearchInput.value = currentSearch;
            }
            setTimeout(() => headerSearchInput.focus(), 100);
        }
    }

    function closeHeaderSearch() {
        if (!searchPanel) return;
        searchPanel.classList.remove('active');
        searchPanel.classList.add('hidden');
    }

    // Toggle search panel when clicking Header Search button
    if (searchTriggerBtn) {
        searchTriggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // If already on search.html, focus the main search input on the page
            const pageSearchInput = document.getElementById('search-page-input');
            if (pageSearchInput && window.location.pathname.includes('search.html')) {
                pageSearchInput.focus();
                pageSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (searchPanel && searchPanel.classList.contains('active')) {
                closeHeaderSearch();
            } else {
                openHeaderSearch();
            }
        });
    }

    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeHeaderSearch();
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchPanel && searchPanel.classList.contains('active')) {
            closeHeaderSearch();
        }
    });

    // Handle Header Search Form submit
    if (searchPanel) {
        searchPanel.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!headerSearchInput) return;
            const query = headerSearchInput.value.trim();
            if (!query) return;

            closeHeaderSearch();

            // If already on search.html, execute search in-place
            if (window.location.pathname.includes('search.html') && typeof window.executePageSearch === 'function') {
                const pageInput = document.getElementById('search-page-input');
                if (pageInput) pageInput.value = query;
                window.executePageSearch(query, true);
                return;
            }

            // Redirect to search.html with ?q=
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        });
    }

    // ==========================================
    // 2. DEDICATED SEARCH PAGE LOGIC (search.html)
    // ==========================================
    const searchPageForm = document.getElementById('search-page-form');
    const searchPageInput = document.getElementById('search-page-input');
    const searchResultsGrid = document.getElementById('search-results-grid');
    const searchMetaBar = document.getElementById('search-meta-bar');
    const searchMetaTitle = document.getElementById('search-meta-title');
    const searchResultsCount = document.getElementById('search-results-count');
    const searchStateView = document.getElementById('search-state-view');

    // Only proceed with search page logic if elements exist
    if (!searchPageForm || !searchResultsGrid) return;

    function renderDefaultState(message = '') {
        searchResultsGrid.style.display = 'none';
        searchResultsGrid.innerHTML = '';
        if (searchMetaBar) searchMetaBar.style.display = 'none';

        if (searchStateView) {
            searchStateView.style.display = 'block';
            searchStateView.innerHTML = `
                <div class="search-prompt-box">
                    <svg class="search-prompt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>
                    </svg>
                    <h2>TÌM KIẾM SẢN PHẨM BMW</h2>
                    <p>${message || 'Nhập từ khóa để tìm kiếm theo tên sản phẩm, danh mục hoặc thẻ tag.'}</p>
                    <div class="search-popular-tags">
                        <span>GỢI Ý:</span>
                        <a href="search.html?q=Clothing" class="search-tag-link">Trang phục</a>
                        <a href="search.html?q=Accessories" class="search-tag-link">Phụ kiện</a>
                        <a href="search.html?q=Equipment" class="search-tag-link">Dụng cụ</a>
                        <a href="search.html?q=Shirt" class="search-tag-link">Áo thun</a>
                        <a href="search.html?q=HOT" class="search-tag-link">Nổi bật</a>
                    </div>
                </div>
            `;
        }
    }

    function renderNoResultsState(query) {
        searchResultsGrid.style.display = 'none';
        searchResultsGrid.innerHTML = '';
        if (searchMetaBar) searchMetaBar.style.display = 'none';

        if (searchStateView) {
            searchStateView.style.display = 'block';
            searchStateView.innerHTML = `
                <div class="no-products-found">
                    <svg class="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>
                        <path d="m9 9 4 4M13 9l-4 4" stroke-width="1.5"/>
                    </svg>
                    <h2>KHÔNG TÌM THẤY KẾT QUẢ CHO "${escapeHtml(query)}"</h2>
                    <p>Chúng tôi không tìm thấy sản phẩm nào khớp với "${escapeHtml(query)}". Vui lòng thử từ khóa khác hoặc khám phá bộ sưu tập của chúng tôi.</p>
                    <a href="shop.html" class="button blue" style="display: inline-flex;">QUAY LẠI CỬA HÀNG <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
                </div>
            `;
        }
    }

    function renderResultsState(query, results) {
        if (searchStateView) {
            searchStateView.style.display = 'none';
            searchStateView.innerHTML = '';
        }

        if (searchMetaBar) {
            searchMetaBar.style.display = 'flex';
            if (searchMetaTitle) {
                searchMetaTitle.innerHTML = `KẾT QUẢ TÌM KIẾM CHO <i>"${escapeHtml(query)}"</i>`;
            }
            if (searchResultsCount) {
                const countText = results.length === 1 ? 'TÌM THẤY 1 SẢN PHẨM' : `TÌM THẤY ${results.length} SẢN PHẨM`;
                searchResultsCount.textContent = countText;
            }
        }

        searchResultsGrid.style.display = 'grid';
        if (typeof renderProducts === 'function') {
            renderProducts(results, 'search-results-grid');
        } else if (typeof createProductCard === 'function') {
            searchResultsGrid.innerHTML = results.map(createProductCard).join('');
        }
    }

    window.executePageSearch = function(query, updateUrl = true) {
        const cleanQuery = (query || '').trim();

        if (searchPageInput) {
            searchPageInput.value = cleanQuery;
        }

        if (updateUrl) {
            const newUrl = cleanQuery
                ? `${window.location.pathname}?q=${encodeURIComponent(cleanQuery)}`
                : window.location.pathname;
            history.pushState({ q: cleanQuery }, '', newUrl);
        }

        if (!cleanQuery) {
            renderDefaultState('VUI LÒNG NHẬP TỪ KHÓA TÌM KIẾM');
            return;
        }

        const matches = searchProducts(cleanQuery);

        if (matches.length === 0) {
            renderNoResultsState(cleanQuery);
        } else {
            renderResultsState(cleanQuery, matches);
        }
    };

    // Form submit listener (handles both Enter key and Search button click)
    searchPageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchPageInput ? searchPageInput.value : '';
        window.executePageSearch(query, true);
    });

    // Handle browser back/forward buttons seamlessly
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q') || urlParams.get('search') || '';
        window.executePageSearch(query, false);
    });

    // Initial search check on page load from URL parameters (?q= or ?search=)
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q') || urlParams.get('search');

    if (initialQuery !== null) {
        window.executePageSearch(initialQuery, false);
    } else {
        renderDefaultState();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    // INLINE HEADER SEARCH LOGIC
    const inlineHeaderSearch = document.getElementById('inline-header-search');
    const inlineSearchInput = document.getElementById('inline-search-input');
    if (inlineHeaderSearch) {
        inlineHeaderSearch.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!inlineSearchInput) return;
            const query = inlineSearchInput.value.trim();
            if (!query) return;

            // If already on search.html, execute search in-place
            if (window.location.pathname.includes('search.html') && typeof window.executePageSearch === 'function') {
                const pageInput = document.getElementById('search-page-input');
                if (pageInput) pageInput.value = query;
                window.executePageSearch(query, true);
                return;
            }

            // Redirect to search.html with ?q=
            window.location.href = 'search.html?q=' + encodeURIComponent(query);
        });
    }
});

