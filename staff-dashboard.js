/**
 * js/staff-dashboard.js — BMW GYM Staff Dashboard Logic
 * Role Guard (staff + admin), Operational Queue, Order Status Update, Stock Alerts
 */

(function () {
    'use strict';

    // ── 1. RBAC Guard: Require Staff or Admin Role ─────────────────────────
    if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.requireRole === 'function') {
        const hasAccess = window.BMW_AUTH_GUARD.requireRole(['staff', 'admin'], 'index.html');
        if (!hasAccess) return;
    }

    // ── 2. State & Variables ────────────────────────────────────────────────
    let allOrders = [];
    let allProducts = [];
    let filteredOrders = [];
    let currentPage = 1;
    const PAGE_SIZE = 5;
    let currentTaskFilter = 'ALL';
    let searchQuery = '';

    // ── 3. DOM Elements ─────────────────────────────────────────────────────
    const layoutEl = document.getElementById('dash-layout');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const mobileToggleBtn = document.getElementById('sidebar-mobile-toggle');
    const backdropEl = document.getElementById('dash-backdrop');
    const notifBtn = document.getElementById('notif-btn');
    const notifMenu = document.getElementById('notif-menu');
    const notifDot = document.getElementById('notif-dot');
    const notifCountBadge = document.getElementById('notif-count-badge');
    const notifList = document.getElementById('notif-list');
    const logoutBtn = document.getElementById('logout-btn');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');

    // Metrics Elements
    const statPendingOrdersEl = document.getElementById('stat-pending-orders');
    const statPendingSubEl = document.getElementById('stat-pending-sub');
    const statTransitOrdersEl = document.getElementById('stat-transit-orders');
    const statTransitSubEl = document.getElementById('stat-transit-sub');
    const statReturnsOrdersEl = document.getElementById('stat-returns-orders');
    const statReturnsSubEl = document.getElementById('stat-returns-sub');
    const statLowStockEl = document.getElementById('stat-low-stock');
    const statLowStockSubEl = document.getElementById('stat-low-stock-sub');

    // Table & List Elements
    const queueTableBody = document.getElementById('queue-table-body');
    const tableLoading = document.getElementById('table-loading');
    const tableEmpty = document.getElementById('table-empty');
    const filterTaskSelect = document.getElementById('filter-task-select');
    const tableSearchInput = document.getElementById('table-search-input');
    const topbarSearchInput = document.getElementById('topbar-search-input');
    const paginationContainer = document.getElementById('table-pagination');
    const pageInfoText = document.getElementById('pagination-info');
    const paginationBtnsWrapper = document.getElementById('pagination-btns');
    const refreshDataBtn = document.getElementById('btn-refresh-data');

    // Stock Watchlist Container
    const stockWatchlistContainer = document.getElementById('stock-watchlist-container');

    // Order Modal Elements
    const orderModal = document.getElementById('order-detail-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCloseFooterBtn = document.getElementById('modal-close-footer-btn');

    // User Profile Elements in Header & Sidebar
    const topbarUserName = document.getElementById('topbar-user-name');
    const topbarUserAvatar = document.getElementById('topbar-user-avatar');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarRoleBadge = document.getElementById('sidebar-role-badge');

    // Toast Container
    const toastContainer = document.getElementById('dash-toast-container');

    // ── 4. Helper Utilities ─────────────────────────────────────────────────
    function formatVND(num) {
        if (num === null || num === undefined || isNaN(num)) return '0₫';
        return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + '₫';
    }

    function formatDate(isoStr) {
        if (!isoStr) return 'N/A';
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return isoStr;
        }
    }

    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `dash-toast ${type}`;
        
        let iconHtml = 'ℹ️';
        if (type === 'success') iconHtml = '✓';
        if (type === 'error') iconHtml = '✕';

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

    function getStatusBadge(orderStatus) {
        const s = (orderStatus || '').toLowerCase();
        if (s.includes('delivered') || s.includes('giao')) {
            return `<span class="badge-status status-delivered">Đã giao hàng</span>`;
        }
        if (s.includes('transit') || s.includes('đang giao')) {
            return `<span class="badge-status status-transit">Đang vận chuyển</span>`;
        }
        if (s.includes('dispatch') || s.includes('chuẩn bị')) {
            return `<span class="badge-status status-dispatch">Chờ xuất kho</span>`;
        }
        if (s.includes('cancelled') || s.includes('hủy')) {
            return `<span class="badge-status status-cancelled">Đã hủy</span>`;
        }
        return `<span class="badge-status status-ordered">Chờ xử lý</span>`;
    }

    function getPaymentBadge(paymentStatus, paymentMethod) {
        const ps = (paymentStatus || '').toLowerCase();
        const pm = (paymentMethod || 'COD').toUpperCase();
        if (ps === 'paid') {
            return `<span class="badge-status status-paid">${pm} • Đã thanh toán</span>`;
        }
        if (ps === 'cancelled') {
            return `<span class="badge-status status-cancelled">${pm} • Hủy thanh toán</span>`;
        }
        return `<span class="badge-status status-pending">${pm} • Chờ thanh toán</span>`;
    }

    // ── 5. Data Fetching (Real Local Storage) ───────────────────────────────
    function loadData() {
        // Orders
        try {
            if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.getOrders === 'function') {
                allOrders = window.BMW_ORDERS_API.getOrders();
            } else {
                const raw = localStorage.getItem('bmw_orders');
                allOrders = raw ? JSON.parse(raw) : [];
            }
        } catch (e) {
            console.error('Error loading orders:', e);
            allOrders = [];
        }

        // Products
        try {
            const raw = localStorage.getItem('bmw_products');
            if (raw) {
                allProducts = JSON.parse(raw);
            } else if (typeof products !== 'undefined' && Array.isArray(products)) {
                allProducts = products;
            } else {
                allProducts = [];
            }
        } catch (e) {
            console.error('Error loading products:', e);
            allProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
        }
    }

    // ── 6. Metrics Calculation & Rendering ──────────────────────────────────
    function renderMetrics() {
        // 1. Orders to Process (Order Placed or Awaiting Dispatch)
        const pendingOrders = allOrders.filter(o => o.orderStatus === 'Order Placed' || o.orderStatus === 'Awaiting Dispatch');
        if (statPendingOrdersEl) statPendingOrdersEl.textContent = pendingOrders.length;
        if (statPendingSubEl) {
            const placedCount = allOrders.filter(o => o.orderStatus === 'Order Placed').length;
            statPendingSubEl.textContent = `${placedCount} đơn mới cần xác nhận`;
        }

        // 2. Orders In Transit
        const transitOrders = allOrders.filter(o => o.orderStatus === 'In Transit');
        if (statTransitOrdersEl) statTransitOrdersEl.textContent = transitOrders.length;
        if (statTransitSubEl) statTransitSubEl.textContent = `Đang trên đường giao đến khách`;

        // 3. Returns & Cancellations
        const returnOrders = allOrders.filter(o => o.orderStatus === 'Cancelled' || o.cancellationReason);
        if (statReturnsOrdersEl) statReturnsOrdersEl.textContent = returnOrders.length;
        if (statReturnsSubEl) statReturnsSubEl.textContent = `Bao gồm yêu cầu hủy và đổi trả`;

        // 4. Low Stock Alerts (stock <= 20)
        const lowStockProducts = allProducts.filter(p => (Number(p.stock) || 0) <= 20);
        if (statLowStockEl) statLowStockEl.textContent = lowStockProducts.length;
        if (statLowStockSubEl) {
            const urgentCount = allProducts.filter(p => (Number(p.stock) || 0) <= 10).length;
            statLowStockSubEl.textContent = `${urgentCount} sản phẩm dưới 10 chiếc (khẩn cấp)`;
        }
    }

    // ── 7. Low Stock Watchlist Rendering ────────────────────────────────────
    function renderStockWatchlist() {
        if (!stockWatchlistContainer) return;
        const lowStock = allProducts.filter(p => (Number(p.stock) || 0) <= 25).sort((a, b) => a.stock - b.stock);

        if (lowStock.length === 0) {
            stockWatchlistContainer.innerHTML = `
                <div class="dash-empty" style="padding: 20px 0;">
                    <p>Tất cả sản phẩm đều đang đủ tồn kho an toàn.</p>
                </div>
            `;
            return;
        }

        stockWatchlistContainer.innerHTML = lowStock.map(p => {
            const stock = Number(p.stock) || 0;
            const isCritical = stock <= 10;
            const badgeClass = isCritical ? 'status-danger' : 'status-warning';
            const badgeLabel = isCritical ? 'Rất thấp' : 'Sắp hết';

            return `
                <div class="top-product-item" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                        <img src="${p.image || 'images/products/performance-oversized-tshirt.jpg'}" alt="${p.name}" class="top-prod-thumb" onerror="this.src='images/products/performance-oversized-tshirt.jpg'">
                        <div class="top-prod-info">
                            <div class="top-prod-name" title="${p.name}">${p.name}</div>
                            <div class="top-prod-sales">Danh mục: ${p.category || 'Thể thao'}</div>
                        </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <div style="font-weight: 800; font-size: 15px; color: ${isCritical ? '#ef4444' : '#f59e0b'};">${stock} chiếc</div>
                        <span class="badge-status ${badgeClass}" style="font-size: 10.5px;">${badgeLabel}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── 8. Notifications Bell & List ────────────────────────────────────────
    function renderNotifications() {
        if (!notifList) return;
        const pendingOrders = allOrders.filter(o => o.orderStatus === 'Order Placed' || o.orderStatus === 'Awaiting Dispatch');
        const lowStockProducts = allProducts.filter(p => (Number(p.stock) || 0) <= 20);

        const totalNotifs = pendingOrders.length + lowStockProducts.length;

        if (notifCountBadge) {
            notifCountBadge.textContent = totalNotifs;
            notifCountBadge.style.display = totalNotifs > 0 ? 'inline-block' : 'none';
        }
        if (notifDot) {
            notifDot.style.display = totalNotifs > 0 ? 'block' : 'none';
        }

        if (totalNotifs === 0) {
            notifList.innerHTML = `
                <div class="dash-empty" style="padding: 20px;">
                    <p>Không có tác vụ mới cần xử lý.</p>
                </div>
            `;
            return;
        }

        let html = '';
        pendingOrders.slice(0, 3).forEach(o => {
            html += `
                <div class="notif-item">
                    <div class="notif-item-title">Cần xử lý đơn #${o.orderId}</div>
                    <div>Khách: ${o.customer?.fullName || 'Khách vãng lai'} • ${formatVND(o.total)}</div>
                    <div class="notif-item-time">${formatDate(o.createdAt)}</div>
                </div>
            `;
        });

        lowStockProducts.slice(0, 3).forEach(p => {
            html += `
                <div class="notif-item">
                    <div class="notif-item-title" style="color:#ef4444;">⚠️ Tồn kho thấp: ${p.name}</div>
                    <div>Còn lại ${p.stock} sản phẩm trong kho.</div>
                </div>
            `;
        });

        notifList.innerHTML = html;
    }

    // ── 9. Staff Operational Queue: Filter, Search & Render ─────────────────
    function applyQueueFilters() {
        filteredOrders = allOrders.filter(order => {
            // Task Category Filter
            if (currentTaskFilter !== 'ALL') {
                const s = (order.orderStatus || '').toLowerCase();
                const ps = (order.paymentStatus || '').toLowerCase();
                if (currentTaskFilter === 'PENDING') {
                    if (s !== 'order placed' && s !== 'awaiting dispatch') return false;
                } else if (currentTaskFilter === 'TRANSIT') {
                    if (s !== 'in transit') return false;
                } else if (currentTaskFilter === 'UNPAID') {
                    if (ps === 'paid' || s === 'cancelled') return false;
                } else if (currentTaskFilter === 'DELIVERED') {
                    if (s !== 'delivered') return false;
                } else if (currentTaskFilter === 'CANCELLED') {
                    if (s !== 'cancelled') return false;
                }
            }

            // Search Query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchId = (order.orderId || '').toLowerCase().includes(q);
                const matchName = (order.customer?.fullName || '').toLowerCase().includes(q);
                const matchPhone = (order.customer?.phone || '').toLowerCase().includes(q);
                const matchUser = (order.userAccount || '').toLowerCase().includes(q);
                if (!matchId && !matchName && !matchPhone && !matchUser) return false;
            }

            return true;
        });

        currentPage = 1;
        renderQueueTable();
    }

    function renderQueueTable() {
        if (!queueTableBody) return;

        if (tableLoading) tableLoading.style.display = 'none';

        if (filteredOrders.length === 0) {
            queueTableBody.innerHTML = '';
            if (tableEmpty) tableEmpty.style.display = 'flex';
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        if (tableEmpty) tableEmpty.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'flex';

        const totalItems = filteredOrders.length;
        const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const pageItems = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);

        queueTableBody.innerHTML = pageItems.map(order => {
            const customerName = order.customer?.fullName || order.userAccount || 'Khách vãng lai';
            const customerPhone = order.customer?.phone || 'N/A';
            const orderStatus = order.orderStatus || 'Order Placed';
            const paymentStatus = order.paymentStatus || 'pending_payment';

            // Generate Action Buttons according to current status
            let actionBtnHtml = '';
            if (orderStatus === 'Order Placed') {
                actionBtnHtml += `<button class="btn-table-action primary" data-action="set-status" data-status="Awaiting Dispatch" data-id="${order.orderId}" title="Đóng gói xong, chuyển sang Chờ xuất kho">Đóng gói xong</button>`;
            } else if (orderStatus === 'Awaiting Dispatch') {
                actionBtnHtml += `<button class="btn-table-action primary" data-action="set-status" data-status="In Transit" data-id="${order.orderId}" title="Bàn giao đơn cho bưu tá">Giao vận chuyển</button>`;
            } else if (orderStatus === 'In Transit') {
                actionBtnHtml += `<button class="btn-table-action success" data-action="set-status" data-status="Delivered" data-id="${order.orderId}" title="Xác nhận khách đã nhận hàng">Đã giao hàng</button>`;
            }

            // Quick Payment confirmation for QR or COD
            if (paymentStatus !== 'paid' && orderStatus !== 'Cancelled') {
                actionBtnHtml += `<button class="btn-table-action" data-action="confirm-payment" data-id="${order.orderId}" title="Xác nhận đã nhận thanh toán">Duyệt tiền</button>`;
            }

            actionBtnHtml += `<button class="btn-table-action" data-action="view" data-id="${order.orderId}">Chi tiết</button>`;

            return `
                <tr>
                    <td><strong>#${order.orderId}</strong></td>
                    <td>
                        <div style="font-weight: 600;">${customerName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${customerPhone}</div>
                    </td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td style="font-weight: 700; color: var(--accent-blue);">${formatVND(order.total)}</td>
                    <td>${getPaymentBadge(order.paymentStatus, order.paymentMethod)}</td>
                    <td>${getStatusBadge(order.orderStatus)}</td>
                    <td>
                        <div class="table-actions">
                            ${actionBtnHtml}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Pagination Info
        if (pageInfoText) {
            const from = startIndex + 1;
            const to = Math.min(startIndex + PAGE_SIZE, totalItems);
            pageInfoText.textContent = `Hiển thị ${from}–${to} trên tổng số ${totalItems} đơn hàng`;
        }

        if (paginationBtnsWrapper) {
            let btnsHtml = `
                <button class="btn-page" id="btn-page-prev" ${currentPage <= 1 ? 'disabled' : ''}>&larr;</button>
            `;
            for (let i = 1; i <= totalPages; i++) {
                btnsHtml += `
                    <button class="btn-page ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
                `;
            }
            btnsHtml += `
                <button class="btn-page" id="btn-page-next" ${currentPage >= totalPages ? 'disabled' : ''}>&rarr;</button>
            `;
            paginationBtnsWrapper.innerHTML = btnsHtml;
        }
    }

    // ── 10. Staff Status Update Actions (Live Storage Persistence) ───────────
    function updateOrderStatus(orderId, newStatus) {
        let updated = false;
        if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.updateOrderStatus === 'function') {
            const res = window.BMW_ORDERS_API.updateOrderStatus(orderId, newStatus);
            updated = res && res.success;
        } else {
            // Direct storage update fallback
            const idx = allOrders.findIndex(o => String(o.orderId) === String(orderId));
            if (idx !== -1) {
                allOrders[idx].orderStatus = newStatus;
                if (newStatus === 'Delivered' && allOrders[idx].paymentMethod === 'COD') {
                    allOrders[idx].paymentStatus = 'paid';
                }
                allOrders[idx].updatedAt = new Date().toISOString();
                localStorage.setItem('bmw_orders', JSON.stringify(allOrders));
                updated = true;
            }
        }

        if (updated) {
            showToast(`Cập nhật đơn hàng #${orderId} sang "${newStatus}" thành công!`, 'success');
            loadData();
            renderMetrics();
            renderNotifications();
            applyQueueFilters();
        } else {
            showToast(`Lỗi cập nhật trạng thái đơn hàng #${orderId}`, 'error');
        }
    }

    function confirmOrderPayment(orderId) {
        let updated = false;
        if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.updateOrderPaymentStatus === 'function') {
            const res = window.BMW_ORDERS_API.updateOrderPaymentStatus(orderId, 'paid');
            updated = Boolean(res);
        } else {
            const idx = allOrders.findIndex(o => String(o.orderId) === String(orderId));
            if (idx !== -1) {
                allOrders[idx].paymentStatus = 'paid';
                allOrders[idx].updatedAt = new Date().toISOString();
                localStorage.setItem('bmw_orders', JSON.stringify(allOrders));
                updated = true;
            }
        }

        if (updated) {
            showToast(`Xác nhận thanh toán đơn hàng #${orderId} thành công!`, 'success');
            loadData();
            renderMetrics();
            applyQueueFilters();
        } else {
            showToast(`Lỗi xác nhận thanh toán đơn #${orderId}`, 'error');
        }
    }

    // ── 11. Modal Logic ─────────────────────────────────────────────────────
    function openOrderModal(orderId) {
        const order = allOrders.find(o => String(o.orderId) === String(orderId));
        if (!order || !orderModal) return;

        const modalOrderId = document.getElementById('modal-order-id');
        const modalCustomerName = document.getElementById('modal-customer-name');
        const modalCustomerPhone = document.getElementById('modal-customer-phone');
        const modalCustomerAddress = document.getElementById('modal-customer-address');
        const modalCustomerNotes = document.getElementById('modal-customer-notes');
        const modalOrderDate = document.getElementById('modal-order-date');
        const modalOrderPayment = document.getElementById('modal-order-payment');
        const modalOrderStatus = document.getElementById('modal-order-status');
        const modalItemsList = document.getElementById('modal-items-list');
        const modalSubtotal = document.getElementById('modal-subtotal');
        const modalShipping = document.getElementById('modal-shipping');
        const modalDiscount = document.getElementById('modal-discount');
        const modalTotal = document.getElementById('modal-total');

        if (modalOrderId) modalOrderId.textContent = `#${order.orderId}`;
        if (modalCustomerName) modalCustomerName.textContent = order.customer?.fullName || order.userAccount || 'N/A';
        if (modalCustomerPhone) modalCustomerPhone.textContent = order.customer?.phone || 'N/A';
        if (modalCustomerAddress) modalCustomerAddress.textContent = order.customer?.address || 'N/A';
        if (modalCustomerNotes) modalCustomerNotes.textContent = order.customer?.notes || 'Không có';
        if (modalOrderDate) modalOrderDate.textContent = formatDate(order.createdAt);
        if (modalOrderPayment) modalOrderPayment.innerHTML = getPaymentBadge(order.paymentStatus, order.paymentMethod);
        if (modalOrderStatus) modalOrderStatus.innerHTML = getStatusBadge(order.orderStatus);

        if (modalItemsList) {
            const items = Array.isArray(order.items) ? order.items : [];
            modalItemsList.innerHTML = items.map(it => {
                const itemTotal = it.itemTotal || (it.priceNumber ? it.priceNumber * it.quantity : 0);
                return `
                    <div class="modal-item-row">
                        <div class="modal-item-left">
                            <img src="${it.image || 'images/products/performance-oversized-tshirt.jpg'}" alt="${it.name}" class="modal-item-img" onerror="this.src='images/products/performance-oversized-tshirt.jpg'">
                            <div>
                                <div class="modal-item-title">${it.name}</div>
                                <div class="modal-item-qty">Số lượng: ${it.quantity} × ${it.price || formatVND(it.priceNumber)}</div>
                            </div>
                        </div>
                        <div style="font-weight: 700;">${formatVND(itemTotal)}</div>
                    </div>
                `;
            }).join('');
        }

        if (modalSubtotal) modalSubtotal.textContent = formatVND(order.subtotal || order.total);
        if (modalShipping) modalShipping.textContent = formatVND(order.shippingFee || 0);
        if (modalDiscount) modalDiscount.textContent = `-${formatVND(order.discount || 0)}`;
        if (modalTotal) modalTotal.textContent = formatVND(order.total);

        orderModal.classList.add('show');
    }

    function closeOrderModal() {
        if (orderModal) orderModal.classList.remove('show');
    }

    // ── 12. User Profile Binding ────────────────────────────────────────────
    function bindCurrentUser() {
        let user = null;
        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.getCurrentUser === 'function') {
            user = window.BMW_AUTH_GUARD.getCurrentUser();
        } else {
            const raw = sessionStorage.getItem('bmw_current_user') || localStorage.getItem('bmw_current_user');
            if (raw) user = JSON.parse(raw);
        }

        if (!user) return;

        const displayName = user.fullName || user.username || 'Nhân viên';
        const initial = (user.username || 'S').charAt(0).toUpperCase();

        if (topbarUserName) topbarUserName.textContent = displayName;
        if (sidebarUserName) sidebarUserName.textContent = displayName;

        if (sidebarRoleBadge) {
            sidebarRoleBadge.textContent = (user.role || 'staff').toUpperCase() === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên';
        }

        const avatarHtml = user.avatar 
            ? `<img src="${user.avatar}" alt="${displayName}">`
            : `<span>${initial}</span>`;

        if (topbarUserAvatar) topbarUserAvatar.innerHTML = avatarHtml;
        if (sidebarUserAvatar) sidebarUserAvatar.innerHTML = avatarHtml;
    }

    // ── 13. Event Listeners ─────────────────────────────────────────────────
    function initEvents() {
        if (collapseBtn && layoutEl) {
            collapseBtn.addEventListener('click', () => layoutEl.classList.toggle('sidebar-collapsed'));
        }
        if (mobileToggleBtn && layoutEl) {
            mobileToggleBtn.addEventListener('click', () => layoutEl.classList.toggle('sidebar-mobile-open'));
        }
        if (backdropEl && layoutEl) {
            backdropEl.addEventListener('click', () => layoutEl.classList.remove('sidebar-mobile-open'));
        }

        if (notifBtn && notifMenu) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifMenu.classList.toggle('show');
            });
            document.addEventListener('click', () => notifMenu.classList.remove('show'));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.logout === 'function') {
                    window.BMW_AUTH_GUARD.logout();
                } else {
                    sessionStorage.removeItem('bmw_current_user');
                    localStorage.removeItem('bmw_current_user');
                }
                showToast('Đã đăng xuất thành công', 'info');
                setTimeout(() => window.location.href = 'login.html', 400);
            });
        }

        if (filterTaskSelect) {
            filterTaskSelect.addEventListener('change', (e) => {
                currentTaskFilter = e.target.value;
                applyQueueFilters();
            });
        }

        if (tableSearchInput) {
            tableSearchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                applyQueueFilters();
            });
        }

        if (topbarSearchInput) {
            topbarSearchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                if (tableSearchInput) tableSearchInput.value = searchQuery;
                applyQueueFilters();
            });
        }

        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => {
                loadData();
                renderMetrics();
                renderStockWatchlist();
                renderNotifications();
                applyQueueFilters();
                showToast('Dữ liệu đã được cập nhật', 'success');
            });
        }

        if (queueTableBody) {
            queueTableBody.addEventListener('click', (e) => {
                const btnView = e.target.closest('button[data-action="view"]');
                if (btnView) {
                    openOrderModal(btnView.getAttribute('data-id'));
                    return;
                }

                const btnStatus = e.target.closest('button[data-action="set-status"]');
                if (btnStatus) {
                    const id = btnStatus.getAttribute('data-id');
                    const status = btnStatus.getAttribute('data-status');
                    updateOrderStatus(id, status);
                    return;
                }

                const btnPay = e.target.closest('button[data-action="confirm-payment"]');
                if (btnPay) {
                    const id = btnPay.getAttribute('data-id');
                    confirmOrderPayment(id);
                    return;
                }
            });
        }

        if (paginationBtnsWrapper) {
            paginationBtnsWrapper.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target || target.disabled) return;

                if (target.id === 'btn-page-prev') {
                    if (currentPage > 1) {
                        currentPage--;
                        renderQueueTable();
                    }
                    return;
                }
                if (target.id === 'btn-page-next') {
                    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderQueueTable();
                    }
                    return;
                }
                const pageNum = Number(target.getAttribute('data-page'));
                if (pageNum && pageNum !== currentPage) {
                    currentPage = pageNum;
                    renderQueueTable();
                }
            });
        }

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeOrderModal);
        if (modalCloseFooterBtn) modalCloseFooterBtn.addEventListener('click', closeOrderModal);
        if (orderModal) {
            orderModal.addEventListener('click', (e) => {
                if (e.target === orderModal) closeOrderModal();
            });
        }

        // Sidebar Navigation Links
        const navLinks = document.querySelectorAll('.dash-nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    const title = link.querySelector('.nav-text')?.textContent || 'Dashboard';
                    if (breadcrumbCurrent) breadcrumbCurrent.textContent = title;

                    if (layoutEl) layoutEl.classList.remove('sidebar-mobile-open');

                    if (href !== '#view-dashboard') {
                        showToast(`Tính năng "${title}" đang sẵn sàng cho đợt tiếp theo. Hiện tại hiển thị bàn làm việc nhân viên.`, 'info');
                    }
                }
            });
        });
    }

    // ── 14. Initialize Dashboard ────────────────────────────────────────────
    function init() {
        bindCurrentUser();
        loadData();
        renderMetrics();
        renderStockWatchlist();
        renderNotifications();
        applyQueueFilters();
        initEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
