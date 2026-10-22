/**
 * js/staff-products.js — Staff Product & Inventory Inspection Logic
 * Phase 8.3: View & search products, enforce dynamic Admin-granted permissions
 */

(function () {
    'use strict';

    // ── 1. RBAC Guard: Require Staff or Admin Role ─────────────────────────
    if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.requireRole === 'function') {
        const hasAccess = window.BMW_AUTH_GUARD.requireRole(['staff', 'admin'], 'index.html');
        if (!hasAccess) return;
    }

    const api = window.BMW_PRODUCTS_API;
    if (!api) {
        console.error('BMW_PRODUCTS_API not loaded.');
        return;
    }

    const currentUser = window.BMW_AUTH_GUARD.getCurrentUser();

    // ── 2. State & Variables ────────────────────────────────────────────────
    let productsList = [];
    let filteredProducts = [];
    let currentPage = 1;
    const PAGE_SIZE = 6;

    let searchQuery = '';
    let categoryFilter = 'ALL';
    let stockStatusFilter = 'ALL';
    let sortOption = 'ID_ASC';

    // ── 3. DOM Elements ─────────────────────────────────────────────────────
    const tabBtns = document.querySelectorAll('.dash-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    const productsTableBody = document.getElementById('products-table-body');
    const productsEmpty = document.getElementById('products-empty');
    const productsLoading = document.getElementById('products-loading');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterStockSelect = document.getElementById('filter-stock');
    const sortSelect = document.getElementById('sort-products');
    const searchInput = document.getElementById('search-products-input');
    const paginationContainer = document.getElementById('products-pagination');
    const paginationInfo = document.getElementById('products-pagination-info');
    const paginationBtns = document.getElementById('products-pagination-btns');
    const btnOpenAddProduct = document.getElementById('btn-open-add-product');

    // Product Modal Elements (Used only if granted permission)
    const productModal = document.getElementById('product-modal');
    const productModalTitle = document.getElementById('product-modal-title');
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('modal-prod-id');
    const productNameInput = document.getElementById('modal-prod-name');
    const productCatSelect = document.getElementById('modal-prod-category');
    const productPriceInput = document.getElementById('modal-prod-price');
    const productOldPriceInput = document.getElementById('modal-prod-old-price');
    const productStockInput = document.getElementById('modal-prod-stock');
    const productTagSelect = document.getElementById('modal-prod-tag');
    const productImageInput = document.getElementById('modal-prod-image');
    const productDescInput = document.getElementById('modal-prod-desc');
    const productFormError = document.getElementById('product-form-error');
    const productModalClose = document.getElementById('product-modal-close');
    const productModalCancel = document.getElementById('product-modal-cancel');

    // Inventory Tab Elements
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const statTotalStock = document.getElementById('stat-total-stock');
    const statLowStockCount = document.getElementById('stat-low-stock-count');

    // Toast Container
    const toastContainer = document.getElementById('dash-toast-container');
    const topbarUserName = document.getElementById('topbar-user-name');
    const topbarUserAvatar = document.getElementById('topbar-user-avatar');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');

    // ── 4. Helpers ──────────────────────────────────────────────────────────
    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `dash-toast ${type}`;
        const iconHtml = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ️');
        toast.innerHTML = `
            <span class="dash-toast-icon">${iconHtml}</span>
            <span class="dash-toast-msg">${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getStockBadge(stock) {
        const threshold = api.getLowStockThreshold();
        if (stock === 0) {
            return `<span class="badge-status status-danger">Hết hàng (0)</span>`;
        }
        if (stock <= threshold) {
            return `<span class="badge-status status-warning">Sắp hết (${stock})</span>`;
        }
        return `<span class="badge-status status-delivered">Còn hàng (${stock})</span>`;
    }

    // ── 5. Data Loading ─────────────────────────────────────────────────────
    function loadAllData() {
        productsList = api.getProducts();

        populateCategoryDropdowns();
        applyProductFilters();
        renderInventoryTab();
    }

    function populateCategoryDropdowns() {
        const categories = api.getCategories();
        if (filterCategorySelect) {
            const currentVal = filterCategorySelect.value;
            filterCategorySelect.innerHTML = `<option value="ALL">Tất cả danh mục (${categories.length})</option>` +
                categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
            if (categories.includes(currentVal)) {
                filterCategorySelect.value = currentVal;
            }
        }
        if (productCatSelect) {
            productCatSelect.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        }
    }

    // ── 6. Products Tab Logic ───────────────────────────────────────────────
    function applyProductFilters() {
        const threshold = api.getLowStockThreshold();

        filteredProducts = productsList.filter(prod => {
            if (categoryFilter !== 'ALL') {
                if ((prod.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
            }

            const stock = Number(prod.stock) || 0;
            if (stockStatusFilter === 'IN_STOCK' && stock <= threshold) return false;
            if (stockStatusFilter === 'LOW_STOCK' && (stock === 0 || stock > threshold)) return false;
            if (stockStatusFilter === 'OUT_OF_STOCK' && stock > 0) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchId = (prod.id || '').toLowerCase().includes(q);
                const matchName = (prod.name || '').toLowerCase().includes(q);
                const matchCat = (prod.category || '').toLowerCase().includes(q);
                if (!matchId && !matchName && !matchCat) return false;
            }
            return true;
        });

        filteredProducts.sort((a, b) => {
            const priceA = api.parsePrice(a.price);
            const priceB = api.parsePrice(b.price);
            const stockA = Number(a.stock) || 0;
            const stockB = Number(b.stock) || 0;

            if (sortOption === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
            if (sortOption === 'NAME_DESC') return (b.name || '').localeCompare(a.name || '');
            if (sortOption === 'PRICE_ASC') return priceA - priceB;
            if (sortOption === 'PRICE_DESC') return priceB - priceA;
            if (sortOption === 'STOCK_ASC') return stockA - stockB;
            if (sortOption === 'STOCK_DESC') return stockB - stockA;

            return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
        });

        currentPage = 1;
        renderProductsTable();
    }

    function renderProductsTable() {
        if (!productsTableBody) return;
        if (productsLoading) productsLoading.style.display = 'none';

        if (filteredProducts.length === 0) {
            productsTableBody.innerHTML = '';
            if (productsEmpty) productsEmpty.style.display = 'flex';
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        if (productsEmpty) productsEmpty.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'flex';

        const total = filteredProducts.length;
        const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const pageItems = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);

        const perms = api.getStaffPermissions();
        const canEdit = Boolean(perms.canEditProducts);

        productsTableBody.innerHTML = pageItems.map(p => {
            let actionBtnHtml = '';
            if (canEdit) {
                actionBtnHtml = `<button class="btn-table-action primary" data-action="edit-product" data-id="${p.id}" title="Sửa sản phẩm">Sửa</button>`;
            } else {
                actionBtnHtml = `<button class="btn-table-action" style="opacity: 0.5; cursor: not-allowed;" data-action="locked-edit" title="Cần Admin cấp quyền">Sửa (Khóa)</button>`;
            }

            return `
                <tr>
                    <td><strong>${escapeHtml(p.id)}</strong></td>
                    <td>
                        <div class="prod-cell-flex">
                            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="prod-table-thumb" onerror="this.src='images/products/performance-oversized-tshirt.jpg'">
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(p.name)}</div>
                                <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(p.description || '')}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge-status status-neutral">${escapeHtml(p.category)}</span></td>
                    <td style="font-weight: 700; color: var(--accent-blue);">${escapeHtml(p.price)}</td>
                    <td>${getStockBadge(Number(p.stock) || 0)}</td>
                    <td>★ ${Number(p.rating || 5.0).toFixed(1)}</td>
                    <td>
                        <div class="table-actions">
                            ${actionBtnHtml}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (paginationInfo) {
            const from = startIndex + 1;
            const to = Math.min(startIndex + PAGE_SIZE, total);
            paginationInfo.textContent = `Hiển thị ${from}–${to} trên tổng số ${total} sản phẩm`;
        }

        if (paginationBtns) {
            let btnsHtml = `<button class="btn-page" id="btn-prod-prev" ${currentPage <= 1 ? 'disabled' : ''}>&larr;</button>`;
            for (let i = 1; i <= totalPages; i++) {
                btnsHtml += `<button class="btn-page ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            btnsHtml += `<button class="btn-page" id="btn-prod-next" ${currentPage >= totalPages ? 'disabled' : ''}>&rarr;</button>`;
            paginationBtns.innerHTML = btnsHtml;
        }
    }

    // Modal logic for Staff (only when permitted)
    function openAddProductModal() {
        const perms = api.getStaffPermissions();
        if (!perms.canAddProducts) {
            showToast('Bạn chưa được Admin cấp quyền thêm sản phẩm. Vui lòng liên hệ Quản trị viên.', 'error');
            return;
        }

        if (!productModal) return;
        productModalTitle.textContent = 'Thêm Sản Phẩm Mới (Staff Mode)';
        productIdInput.value = '';
        productNameInput.value = '';
        productPriceInput.value = '';
        productOldPriceInput.value = '';
        productStockInput.value = '50';
        productImageInput.value = 'images/products/performance-oversized-tshirt.jpg';
        productDescInput.value = '';
        productTagSelect.value = '';
        if (productFormError) productFormError.style.display = 'none';

        populateCategoryDropdowns();
        productModal.classList.add('show');
    }

    function openEditProductModal(id) {
        const perms = api.getStaffPermissions();
        if (!perms.canEditProducts) {
            showToast('Bạn chưa được Admin cấp quyền sửa thông tin sản phẩm.', 'error');
            return;
        }

        const prod = api.getProductById(id);
        if (!prod || !productModal) return;

        productModalTitle.textContent = `Chỉnh Sửa Sản Phẩm (#${prod.id})`;
        productIdInput.value = prod.id;
        productNameInput.value = prod.name || '';
        populateCategoryDropdowns();
        productCatSelect.value = prod.category || '';
        productPriceInput.value = api.parsePrice(prod.price);
        productOldPriceInput.value = prod.oldPrice ? api.parsePrice(prod.oldPrice) : '';
        productStockInput.value = prod.stock ?? 0;
        productImageInput.value = prod.image || '';
        productDescInput.value = prod.description || '';
        productTagSelect.value = prod.tag || '';
        if (productFormError) productFormError.style.display = 'none';

        productModal.classList.add('show');
    }

    function closeProductModal() {
        if (productModal) productModal.classList.remove('show');
    }

    function handleProductFormSubmit(e) {
        e.preventDefault();
        if (productFormError) productFormError.style.display = 'none';

        const id = productIdInput.value.trim();
        const payload = {
            name: productNameInput.value.trim(),
            category: productCatSelect.value.trim(),
            price: productPriceInput.value.trim(),
            oldPrice: productOldPriceInput.value.trim() || null,
            stock: productStockInput.value.trim(),
            image: productImageInput.value.trim(),
            tag: productTagSelect.value.trim() || null,
            description: productDescInput.value.trim()
        };

        let res;
        if (id) {
            res = api.updateProduct(id, payload, currentUser);
        } else {
            res = api.addProduct(payload, currentUser);
        }

        if (res.success) {
            closeProductModal();
            showToast(id ? `Cập nhật sản phẩm #${id} thành công!` : `Thêm sản phẩm mới #${res.product.id} thành công!`, 'success');
            loadAllData();
        } else {
            if (productFormError) {
                productFormError.textContent = res.message;
                productFormError.style.display = 'block';
            }
        }
    }

    let currentInvFilter = 'ALL';

    // ── 7. Inventory Tab Logic ──────────────────────────────────────────────
    function renderInventoryTab() {
        const threshold = api.getLowStockThreshold();
        const products = api.getProducts();
        const totalItems = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
        const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= threshold && (Number(p.stock) || 0) > 0).length;
        const outOfStockCount = products.filter(p => (Number(p.stock) || 0) === 0).length;

        if (statTotalStock) statTotalStock.textContent = totalItems.toLocaleString('vi-VN');
        if (statLowStockCount) statLowStockCount.textContent = (lowStockCount + outOfStockCount);

        if (!inventoryTableBody) return;

        let invFiltered = products;
        if (currentInvFilter === 'LOW_STOCK') {
            invFiltered = products.filter(p => (Number(p.stock) || 0) <= threshold && (Number(p.stock) || 0) > 0);
        } else if (currentInvFilter === 'OUT_OF_STOCK') {
            invFiltered = products.filter(p => (Number(p.stock) || 0) === 0);
        } else if (currentInvFilter === 'IN_STOCK') {
            invFiltered = products.filter(p => (Number(p.stock) || 0) > threshold);
        }

        const perms = api.getStaffPermissions();
        const canStock = Boolean(perms.canManageStock) || (currentUser && currentUser.role === 'admin');

        if (invFiltered.length === 0) {
            inventoryTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        Không có sản phẩm nào thuộc nhóm tồn kho này.
                    </td>
                </tr>
            `;
            return;
        }

        inventoryTableBody.innerHTML = invFiltered.map(p => {
            const stock = Number(p.stock) || 0;
            let restockHtml = '';
            if (canStock) {
                restockHtml = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <input type="number" min="1" max="1000" value="20" style="width: 70px; height: 32px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px;" data-stock-input="${p.id}">
                        <button class="btn-table-action success" data-action="quick-restock" data-id="${p.id}">
                            + Nhập hàng
                        </button>
                    </div>
                `;
            } else {
                restockHtml = `<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Chỉ xem (chưa cấp quyền)</span>`;
            }

            return `
                <tr>
                    <td><strong>${escapeHtml(p.id)}</strong></td>
                    <td>
                        <div class="prod-cell-flex">
                            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="prod-table-thumb" onerror="this.src='images/products/performance-oversized-tshirt.jpg'">
                            <span style="font-weight: 600;">${escapeHtml(p.name)}</span>
                        </div>
                    </td>
                    <td><span class="badge-status status-neutral">${escapeHtml(p.category)}</span></td>
                    <td style="font-weight: 700; font-size: 14px;">${stock} chiếc</td>
                    <td>${getStockBadge(stock)}</td>
                    <td>${restockHtml}</td>
                </tr>
            `;
        }).join('');
    }

    function handleQuickRestock(id, qty) {
        const perms = api.getStaffPermissions();
        const canStock = perms.canManageStock || (currentUser && currentUser.role === 'admin');
        if (!canStock) {
            showToast('Bạn chưa được Admin cấp quyền điều chỉnh tồn kho.', 'error');
            return;
        }

        const prod = api.getProductById(id);
        if (!prod) return;
        const addQty = parseInt(qty, 10);
        if (isNaN(addQty) || addQty <= 0) {
            showToast('Số lượng nhập hàng phải lớn hơn 0.', 'error');
            return;
        }

        const newStock = (Number(prod.stock) || 0) + addQty;
        // Use RBAC-protected updateStock
        const res = (api.updateStock && typeof api.updateStock === 'function')
            ? api.updateStock(id, newStock, currentUser)
            : api.updateProduct(id, { stock: newStock }, currentUser);

        if (res.success) {
            showToast(`Đã nhập thêm +${addQty} chiếc cho "${prod.name}" (Tồn kho: ${newStock})!`, 'success');
            loadAllData();
        } else {
            showToast(res.message, 'error');
        }
    }

    // ── 8. Bind Current User Mini ───────────────────────────────────────────
    function bindCurrentUser() {
        if (!currentUser) return;
        const displayName = currentUser.fullName || currentUser.username || 'Staff';
        const initial = (currentUser.username || 'S').charAt(0).toUpperCase();

        if (topbarUserName) topbarUserName.textContent = displayName;
        if (sidebarUserName) sidebarUserName.textContent = displayName;

        const avatarHtml = currentUser.avatar 
            ? `<img src="${currentUser.avatar}" alt="${displayName}">`
            : `<span>${initial}</span>`;

        if (topbarUserAvatar) topbarUserAvatar.innerHTML = avatarHtml;
        if (sidebarUserAvatar) sidebarUserAvatar.innerHTML = avatarHtml;
    }

    // ── 9. Event Listeners ──────────────────────────────────────────────────
    function initEvents() {
        // Tab Switching
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const pane = document.getElementById(targetTab);
                if (pane) pane.classList.add('active');
                window.location.hash = targetTab;
            });
        });

        if (window.location.hash) {
            const activeBtn = document.querySelector(`.dash-tab-btn[data-tab="${window.location.hash.substring(1)}"]`);
            if (activeBtn) activeBtn.click();
        }

        // Inventory filter pills
        const invPills = document.getElementById('inventory-filter-pills');
        if (invPills) {
            invPills.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-inv-filter]');
                if (!btn) return;
                invPills.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentInvFilter = btn.getAttribute('data-inv-filter') || 'ALL';
                renderInventoryTab();
            });
        }

        // Filters
        if (filterCategorySelect) {
            filterCategorySelect.addEventListener('change', (e) => {
                categoryFilter = e.target.value;
                applyProductFilters();
            });
        }
        if (filterStockSelect) {
            filterStockSelect.addEventListener('change', (e) => {
                stockStatusFilter = e.target.value;
                applyProductFilters();
            });
        }
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                sortOption = e.target.value;
                applyProductFilters();
            });
        }
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                applyProductFilters();
            });
        }

        // Add Product button
        if (btnOpenAddProduct) btnOpenAddProduct.addEventListener('click', openAddProductModal);
        if (productModalClose) productModalClose.addEventListener('click', closeProductModal);
        if (productModalCancel) productModalCancel.addEventListener('click', closeProductModal);
        if (productForm) productForm.addEventListener('submit', handleProductFormSubmit);

        // Products table click delegation
        if (productsTableBody) {
            productsTableBody.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('button[data-action="edit-product"]');
                if (btnEdit) {
                    openEditProductModal(btnEdit.getAttribute('data-id'));
                    return;
                }
                const btnLocked = e.target.closest('button[data-action="locked-edit"]');
                if (btnLocked) {
                    showToast('Bạn chưa được Admin cấp quyền sửa sản phẩm.', 'error');
                    return;
                }
            });
        }

        // Pagination delegation
        if (paginationBtns) {
            paginationBtns.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target || target.disabled) return;

                if (target.id === 'btn-prod-prev') {
                    if (currentPage > 1) {
                        currentPage--;
                        renderProductsTable();
                    }
                    return;
                }
                if (target.id === 'btn-prod-next') {
                    const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderProductsTable();
                    }
                    return;
                }
                const pageNum = Number(target.getAttribute('data-page'));
                if (pageNum && pageNum !== currentPage) {
                    currentPage = pageNum;
                    renderProductsTable();
                }
            });
        }

        // Inventory table quick restock delegation
        if (inventoryTableBody) {
            inventoryTableBody.addEventListener('click', (e) => {
                const btnRestock = e.target.closest('button[data-action="quick-restock"]');
                if (btnRestock) {
                    const id = btnRestock.getAttribute('data-id');
                    const input = inventoryTableBody.querySelector(`input[data-stock-input="${id}"]`);
                    const qty = input ? input.value : 20;
                    handleQuickRestock(id, qty);
                }
            });
        }

        // Collapse & Mobile
        const collapseBtn = document.getElementById('sidebar-collapse-btn');
        const layoutEl = document.getElementById('dash-layout');
        const mobileToggleBtn = document.getElementById('sidebar-mobile-toggle');
        const backdropEl = document.getElementById('dash-backdrop');

        if (collapseBtn && layoutEl) {
            collapseBtn.addEventListener('click', () => layoutEl.classList.toggle('sidebar-collapsed'));
        }
        if (mobileToggleBtn && layoutEl) {
            mobileToggleBtn.addEventListener('click', () => layoutEl.classList.toggle('sidebar-mobile-open'));
        }
        if (backdropEl && layoutEl) {
            backdropEl.addEventListener('click', () => layoutEl.classList.remove('sidebar-mobile-open'));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.BMW_AUTH_GUARD.logout();
                window.location.href = 'login.html';
            });
        }
    }

    function init() {
        bindCurrentUser();
        loadAllData();
        initEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
