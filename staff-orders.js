/**
 * js/staff-orders.js — BMW GYM Staff Order Processing Logic
 * Role-Guard (staff + admin), Permissions Check, Queue Filtering, Valid Transitions & Internal Notes
 */

(function () {
    'use strict';

    // ── 1. RBAC Guard: Require Staff or Admin Role ─────────────────────────
    if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.requireRole === 'function') {
        const hasAccess = window.BMW_AUTH_GUARD.requireRole(['staff', 'admin'], 'index.html');
        if (!hasAccess) return;
    }

    // ── 2. Staff Permissions Check ──────────────────────────────────────────
    function getStaffPermissions() {
        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.hasRole === 'function') {
            if (window.BMW_AUTH_GUARD.hasRole('admin')) {
                return {
                    canViewOrders: true,
                    canUpdateOrderStatus: true,
                    canConfirmPayment: true,
                    canCancelOrders: true,
                    canAddInternalNotes: true,
                    canProcessReturns: true
                };
            }
        }

        try {
            const raw = localStorage.getItem('bmw_staff_permissions');
            if (raw) {
                const p = JSON.parse(raw);
                return {
                    canViewOrders: true,
                    canUpdateOrderStatus: p.canUpdateOrderStatus !== false,
                    canConfirmPayment: Boolean(p.canConfirmPayment),
                    canCancelOrders: Boolean(p.canCancelOrders),
                    canAddInternalNotes: p.canAddInternalNotes !== false,
                    canProcessReturns: Boolean(p.canProcessReturns)
                };
            }
        } catch (e) {}

        return {
            canViewOrders: true,
            canUpdateOrderStatus: true,
            canConfirmPayment: false,
            canCancelOrders: false,
            canAddInternalNotes: true,
            canProcessReturns: false
        };
    }

    // ── 3. State & Variables ────────────────────────────────────────────────
    let allOrders = [];
    let filteredOrders = [];
    let currentPage = 1;
    const PAGE_SIZE = 8;
    let currentFilterStatus = 'ALL';
    let currentFilterMethod = 'ALL';
    let searchQuery = '';
    let currentActiveOrderId = null;

    // ── 4. DOM Elements ─────────────────────────────────────────────────────
    const layoutEl = document.getElementById('dash-layout');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const mobileToggleBtn = document.getElementById('sidebar-mobile-toggle');
    const backdropEl = document.getElementById('dash-backdrop');
    const logoutBtn = document.getElementById('logout-btn');

    // Metrics
    const metricPendingOrders = document.getElementById('metric-pending-orders');
    const metricPackingOrders = document.getElementById('metric-packing-orders');
    const metricShippingOrders = document.getElementById('metric-shipping-orders');
    const metricReturnsOrders = document.getElementById('metric-returns-orders');

    // Filters & Search
    const searchInput = document.getElementById('order-search-input');
    const filterStatusSelect = document.getElementById('filter-order-status');
    const filterMethodSelect = document.getElementById('filter-payment-method');
    const refreshBtn = document.getElementById('btn-refresh-orders');

    // Table
    const ordersTableBody = document.getElementById('orders-table-body');
    const tableLoading = document.getElementById('table-loading');
    const tableEmpty = document.getElementById('table-empty');
    const paginationContainer = document.getElementById('table-pagination');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationBtns = document.getElementById('pagination-btns');

    // Modal
    const orderModal = document.getElementById('order-detail-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCloseFooterBtn = document.getElementById('modal-close-footer-btn');

    // User Profile
    const topbarUserAvatar = document.getElementById('topbar-user-avatar');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarRoleBadge = document.getElementById('sidebar-role-badge');

    // Toast
    const toastContainer = document.getElementById('dash-toast-container');

    // ── 5. Helper Utilities ─────────────────────────────────────────────────
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

    function getNormalizedStatus(orderStatus) {
        if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.normalizeOrderStatus === 'function') {
            return window.BMW_ORDERS_API.normalizeOrderStatus(orderStatus);
        }
        return orderStatus || 'Chờ xác nhận';
    }

    function getStatusBadge(orderStatus) {
        const norm = getNormalizedStatus(orderStatus);
        switch (norm) {
            case 'Đã giao':
                return `<span class="badge-status status-delivered">Đã giao thành công</span>`;
            case 'Đang giao hàng':
                return `<span class="badge-status status-transit">Đang giao hàng</span>`;
            case 'Đã bàn giao vận chuyển':
                return `<span class="badge-status status-transit" style="background:rgba(14,165,233,0.12);color:#0284c7;">Đã bàn giao VC</span>`;
            case 'Đang đóng gói':
                return `<span class="badge-status status-dispatch" style="background:rgba(168,85,247,0.12);color:#7e22ce;">Đang đóng gói</span>`;
            case 'Đang xử lý':
                return `<span class="badge-status status-dispatch">Đang xử lý</span>`;
            case 'Đã xác nhận':
                return `<span class="badge-status status-dispatch" style="background:rgba(16,185,129,0.12);color:#059669;">Đã xác nhận</span>`;
            case 'Đã hủy':
                return `<span class="badge-status status-cancelled">Đã hủy</span>`;
            case 'Yêu cầu đổi trả':
                return `<span class="badge-status status-cancelled" style="background:rgba(234,88,12,0.12);color:#c2410c;">Yêu cầu đổi trả</span>`;
            case 'Đã trả hàng':
                return `<span class="badge-status status-cancelled" style="background:#f1f5f9;color:#64748b;">Đã trả hàng</span>`;
            default:
                return `<span class="badge-status status-ordered">Chờ xác nhận</span>`;
        }
    }

    function getPaymentBadge(paymentStatus, paymentMethod) {
        const ps = (paymentStatus || '').toLowerCase();
        const pm = (paymentMethod || 'COD').toUpperCase();

        if (ps === 'paid') {
            return `<span class="badge-status status-paid">${pm} • Đã thanh toán</span>`;
        }
        if (ps === 'refund_pending') {
            return `<span class="badge-status status-pending" style="background:rgba(245,158,11,0.12);color:#d97706;border:1px solid rgba(245,158,11,0.25);">${pm} • Chờ hoàn tiền</span>`;
        }
        if (ps === 'refunded') {
            return `<span class="badge-status status-paid" style="background:rgba(59,130,246,0.12);color:#2563eb;border:1px solid rgba(59,130,246,0.25);">${pm} • Đã hoàn tiền</span>`;
        }
        if (ps === 'cancelled') {
            return `<span class="badge-status status-cancelled">${pm} • Hủy thanh toán</span>`;
        }
        return `<span class="badge-status status-pending">${pm} • Chưa thanh toán</span>`;
    }

    // ── 6. Data Loading & Metrics ───────────────────────────────────────────
    function loadData() {
        if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.getOrders === 'function') {
            allOrders = window.BMW_ORDERS_API.getOrders();
        } else {
            try {
                const raw = localStorage.getItem('bmw_orders');
                allOrders = raw ? JSON.parse(raw) : [];
            } catch (e) {
                allOrders = [];
            }
        }
    }

    function renderMetrics() {
        let pendingCount = 0;
        let packingCount = 0;
        let shippingCount = 0;
        let returnsCount = 0;

        allOrders.forEach(o => {
            const norm = getNormalizedStatus(o.orderStatus);
            if (norm === 'Chờ xác nhận') {
                pendingCount++;
            } else if (norm === 'Đã xác nhận' || norm === 'Đang xử lý' || norm === 'Đang đóng gói') {
                packingCount++;
            } else if (norm === 'Đã bàn giao vận chuyển' || norm === 'Đang giao hàng') {
                shippingCount++;
            } else if (norm === 'Yêu cầu đổi trả') {
                returnsCount++;
            }
        });

        if (metricPendingOrders) metricPendingOrders.textContent = pendingCount;
        if (metricPackingOrders) metricPackingOrders.textContent = packingCount;
        if (metricShippingOrders) metricShippingOrders.textContent = shippingCount;
        if (metricReturnsOrders) metricReturnsOrders.textContent = returnsCount;
    }

    // ── 7. Filtering, Searching ─────────────────────────────────────────────
    function applyFilters() {
        filteredOrders = allOrders.filter(order => {
            const normStatus = getNormalizedStatus(order.orderStatus);

            // Filter by Order Status
            if (currentFilterStatus !== 'ALL') {
                if (normStatus !== currentFilterStatus) return false;
            }

            // Filter by Payment Method
            if (currentFilterMethod !== 'ALL') {
                const pm = (order.paymentMethod || 'COD').toUpperCase();
                if (pm !== currentFilterMethod.toUpperCase()) return false;
            }

            // Search query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchId = (order.orderId || '').toLowerCase().includes(q);
                const matchName = (order.customer?.fullName || '').toLowerCase().includes(q);
                const matchPhone = (order.customer?.phone || '').toLowerCase().includes(q);
                if (!matchId && !matchName && !matchPhone) return false;
            }

            return true;
        });

        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        if (!ordersTableBody) return;

        if (tableLoading) tableLoading.style.display = 'none';

        if (filteredOrders.length === 0) {
            ordersTableBody.innerHTML = '';
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

        ordersTableBody.innerHTML = pageItems.map(order => {
            const customerName = order.customer?.fullName || order.userAccount || 'Khách vãng lai';
            const customerPhone = order.customer?.phone || 'N/A';
            const itemsCount = Array.isArray(order.items) ? order.items.reduce((s, it) => s + (it.quantity || 1), 0) : 0;
            const normStatus = getNormalizedStatus(order.orderStatus);
            const isPending = normStatus === 'Chờ xác nhận';

            return `
                <tr>
                    <td><strong>#${order.orderId}</strong></td>
                    <td>
                        <div style="font-weight: 600;">${customerName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${customerPhone}</div>
                    </td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>${itemsCount} món</td>
                    <td style="font-weight: 700; color: var(--accent-blue);">${formatVND(order.total)}</td>
                    <td>${getPaymentBadge(order.paymentStatus, order.paymentMethod)}</td>
                    <td>${getStatusBadge(order.orderStatus)}</td>
                    <td style="text-align: center;">
                        <div class="table-actions" style="justify-content: center; gap: 6px;">
                            ${isPending ? `
                                <button class="btn-table-action" style="background:#10b981; color:#fff;" data-action="quick-confirm" data-id="${order.orderId}" title="Xác nhận đơn ngay">
                                    ✓
                                </button>
                            ` : ''}
                            <button class="btn-table-action" style="background:#d97706; color:#fff;" data-action="view" data-id="${order.orderId}">
                                Xử lý
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (paginationInfo) {
            const from = startIndex + 1;
            const to = Math.min(startIndex + PAGE_SIZE, totalItems);
            paginationInfo.textContent = `Hiển thị ${from}–${to} trên tổng số ${totalItems} đơn hàng`;
        }

        if (paginationBtns) {
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
            paginationBtns.innerHTML = btnsHtml;
        }
    }

    // ── 8. Modal Details & Staff Workflow ───────────────────────────────────
    function openOrderModal(orderId) {
        currentActiveOrderId = orderId;
        const order = allOrders.find(o => String(o.orderId) === String(orderId));
        if (!order || !orderModal) return;

        document.getElementById('modal-order-id').textContent = `Đơn hàng #${order.orderId}`;
        document.getElementById('modal-order-date').textContent = `Ngày đặt: ${formatDate(order.createdAt)}`;
        document.getElementById('modal-badge-order-status').innerHTML = getStatusBadge(order.orderStatus);
        document.getElementById('modal-badge-payment-status').innerHTML = getPaymentBadge(order.paymentStatus, order.paymentMethod);

        // Recipient
        const custPhone = order.customer?.phone || '';
        document.getElementById('modal-customer-name').textContent = order.customer?.fullName || 'N/A';
        document.getElementById('modal-customer-phone').textContent = custPhone || 'N/A';
        document.getElementById('modal-customer-address').textContent = order.customer?.address || 'N/A';
        document.getElementById('modal-customer-notes').textContent = order.customer?.notes || 'Không có';

        // Call button link
        const callBtn = document.getElementById('modal-customer-call-btn');
        if (callBtn) {
            callBtn.href = custPhone ? `tel:${custPhone.replace(/[^0-9+]/g, '')}` : '#';
        }

        // Shipping Route Info
        const routeEl = document.getElementById('modal-shipping-route');
        if (routeEl) {
            routeEl.textContent = order.route?.name 
                ? `${order.route.name} (${order.route.origin || 'Kho'} → ${order.route.destination || 'Điểm giao'})` 
                : 'BMW Express Logistics — Đang xử lý vận chuyển';
        }

        // Payment Info
        document.getElementById('modal-payment-method').textContent = order.paymentMethod === 'COD' ? 'Tiền mặt khi giao (COD)' : 'Chuyển khoản QR MB Bank';
        const payStatusText = document.getElementById('modal-payment-status-text');
        if (payStatusText) {
            payStatusText.innerHTML = getPaymentBadge(order.paymentStatus, order.paymentMethod);
        }
        document.getElementById('modal-total').textContent = formatVND(order.total);

        // ── Return / Cancellation Support Panel (Requirement 3) ──────────────
        const returnPanel = document.getElementById('modal-return-panel');
        const returnBadge = document.getElementById('modal-return-badge');
        const returnReasonEl = document.getElementById('modal-return-reason');
        const returnDetailsEl = document.getElementById('modal-return-details');
        const returnTimeEl = document.getElementById('modal-return-time');
        const returnActions = document.getElementById('modal-return-actions');
        const returnNotice = document.getElementById('modal-return-reviewed-notice');

        const normCurrent = getNormalizedStatus(order.orderStatus);
        const hasReturnReq = Boolean(order.returnRequest) || normCurrent === 'Yêu cầu đổi trả' || normCurrent === 'Đã trả hàng';

        if (hasReturnReq && returnPanel) {
            returnPanel.style.display = 'flex';
            const req = order.returnRequest || { reason: 'Yêu cầu đổi trả', details: 'Khách gửi yêu cầu', status: 'pending_review' };
            if (returnReasonEl) returnReasonEl.textContent = req.reason || 'Yêu cầu đổi / trả hàng';
            if (returnDetailsEl) returnDetailsEl.textContent = req.details || 'Không có mô tả chi tiết';
            if (returnTimeEl) returnTimeEl.textContent = req.requestedAt ? formatDate(req.requestedAt) : 'Mới gửi';

            const reqStatus = req.status || 'pending_review';
            if (reqStatus === 'pending_review') {
                if (returnBadge) returnBadge.innerHTML = `<span class="badge-status status-pending" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a;">Đang chờ duyệt</span>`;
                if (returnActions) returnActions.style.display = 'flex';
                if (returnNotice) returnNotice.style.display = 'none';
            } else if (reqStatus === 'approved') {
                if (returnBadge) returnBadge.innerHTML = `<span class="badge-status status-delivered" style="background:#d1fae5; color:#059669; border:1px solid #a7f3d0;">Đã chấp thuận</span>`;
                if (returnActions) returnActions.style.display = 'none';
                if (returnNotice) {
                    returnNotice.style.display = 'block';
                    returnNotice.style.color = '#059669';
                    returnNotice.textContent = `✓ Đã chấp thuận đổi trả hàng bởi ${req.approvedBy || 'Nhân viên'} (${formatDate(req.approvedAt)}). Hàng đã hoàn kho an toàn.`;
                }
            } else if (reqStatus === 'rejected') {
                if (returnBadge) returnBadge.innerHTML = `<span class="badge-status status-cancelled">Đã từ chối</span>`;
                if (returnActions) returnActions.style.display = 'none';
                if (returnNotice) {
                    returnNotice.style.display = 'block';
                    returnNotice.style.color = '#dc2626';
                    returnNotice.textContent = `✕ Yêu cầu bị từ chối: "${req.rejectionReason || 'Không hợp lệ'}" bởi ${req.rejectedBy || 'Nhân viên'} (${formatDate(req.rejectedAt)}).`;
                }
            }
        } else if (returnPanel) {
            returnPanel.style.display = 'none';
        }

        // ── Real Refund Transaction Panel (Requirement 3 & 8) ────────────────
        const refundPanel = document.getElementById('modal-refund-panel');
        const refundRefInput = document.getElementById('modal-refund-ref-input');
        if (refundRefInput) refundRefInput.value = '';

        if (order.paymentStatus === 'refund_pending' && refundPanel) {
            refundPanel.style.display = 'flex';
        } else if (refundPanel) {
            refundPanel.style.display = 'none';
        }

        // Products table
        const tbodyItems = document.getElementById('modal-items-tbody');
        if (tbodyItems) {
            const items = Array.isArray(order.items) ? order.items : [];
            tbodyItems.innerHTML = items.map(it => {
                const itemTotal = it.itemTotal || (it.priceNumber ? it.priceNumber * it.quantity : 0);
                return `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="${it.image || 'images/products/performance-oversized-tshirt.jpg'}" alt="${it.name}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;" onerror="this.src='images/products/performance-oversized-tshirt.jpg'">
                                <div style="font-weight:700;">${it.name}</div>
                            </div>
                        </td>
                        <td style="text-align:right;">${it.price || formatVND(it.priceNumber)}</td>
                        <td style="text-align:center; font-weight:700;">${it.quantity}</td>
                        <td style="text-align:right; font-weight:700; color:var(--accent-blue);">${formatVND(itemTotal)}</td>
                    </tr>
                `;
            }).join('');
        }

        // Transitions select
        const nextStatusSelect = document.getElementById('modal-next-status-select');
        const updateStatusBtn = document.getElementById('btn-modal-update-status');
        const statusNoteInput = document.getElementById('modal-status-note-input');
        if (statusNoteInput) statusNoteInput.value = '';

        const validTransitions = (window.BMW_ORDERS_API && window.BMW_ORDERS_API.VALID_STATUS_TRANSITIONS) 
            ? (window.BMW_ORDERS_API.VALID_STATUS_TRANSITIONS[normCurrent] || window.BMW_ORDERS_API.VALID_STATUS_TRANSITIONS[order.orderStatus] || [])
            : [];

        if (nextStatusSelect) {
            if (validTransitions.length === 0) {
                nextStatusSelect.innerHTML = `<option value="">(Không còn trạng thái khả dụng)</option>`;
                if (updateStatusBtn) updateStatusBtn.disabled = true;
            } else {
                nextStatusSelect.innerHTML = validTransitions.map(t => {
                    const normT = getNormalizedStatus(t);
                    return `<option value="${normT}">${normT}</option>`;
                }).join('');
                if (updateStatusBtn) updateStatusBtn.disabled = false;
            }
        }

        const quickConfirmBtn = document.getElementById('btn-quick-confirm-order');
        if (quickConfirmBtn) {
            quickConfirmBtn.style.display = (normCurrent === 'Chờ xác nhận') ? 'inline-block' : 'none';
        }

        renderStatusHistory(order);
        renderInternalNotes(order);

        orderModal.classList.add('show');
    }

    function closeOrderModal() {
        if (orderModal) orderModal.classList.remove('show');
        currentActiveOrderId = null;
    }

    function renderStatusHistory(order) {
        const container = document.getElementById('modal-status-history-list');
        if (!container) return;

        const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
        if (history.length === 0) {
            container.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">Chưa có lịch sử.</div>`;
            return;
        }

        container.innerHTML = history.slice().reverse().map(h => `
            <div class="timeline-audit-item">
                <div class="timeline-audit-header">
                    <strong>${h.status}</strong>
                    <span>${formatDate(h.at)}</span>
                </div>
                <div style="font-size:11px; color:#d97706; font-weight:600;">Bởi: ${h.by || 'Hệ thống'}</div>
                <div style="margin-top:2px; color:var(--text-secondary);">${h.note || ''}</div>
            </div>
        `).join('');
    }

    function renderInternalNotes(order) {
        const container = document.getElementById('modal-internal-notes-list');
        if (!container) return;

        const notes = Array.isArray(order.internalNotes) ? order.internalNotes : [];
        if (notes.length === 0) {
            container.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">Chưa có ghi chú nội bộ.</div>`;
            return;
        }

        container.innerHTML = notes.map(n => `
            <div class="note-bubble">
                <div class="note-bubble-meta">
                    <strong>${n.by || 'Nhân viên'}</strong>
                    <span>${formatDate(n.at)}</span>
                </div>
                <div>${n.text}</div>
            </div>
        `).join('');
    }

    // ── 9. Status & Note Actions ────────────────────────────────────────────
    function handleUpdateStatus(orderId, newStatus, note = '') {
        const perms = getStaffPermissions();
        if (!perms.canUpdateOrderStatus) {
            showToast('Bạn chưa được cấp quyền cập nhật trạng thái đơn hàng.', 'error');
            return;
        }

        const res = window.BMW_ORDERS_API.updateOrderStatus(orderId, newStatus, note, 'Staff (@staff)');
        if (res.success) {
            showToast(`Cập nhật đơn hàng #${orderId} sang "${newStatus}" thành công!`, 'success');
            loadData();
            renderMetrics();
            applyFilters();
            openOrderModal(orderId);
        } else {
            showToast(res.message || 'Lỗi cập nhật trạng thái đơn', 'error');
        }
    }

    function handleAddInternalNote(orderId, text) {
        const perms = getStaffPermissions();
        if (!perms.canAddInternalNotes) {
            showToast('Bạn chưa được cấp quyền thêm ghi chú nội bộ.', 'error');
            return;
        }

        const res = window.BMW_ORDERS_API.addInternalNote(orderId, text, 'Staff (@staff)');
        if (res.success) {
            showToast('Đã lưu ghi chú ca trực', 'success');
            loadData();
            openOrderModal(orderId);
        } else {
            showToast(res.message || 'Lỗi lưu ghi chú', 'error');
        }
    }

    // ── 10. User Profile Binding ────────────────────────────────────────────
    function bindCurrentUser() {
        let user = null;
        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.getCurrentUser === 'function') {
            user = window.BMW_AUTH_GUARD.getCurrentUser();
        } else {
            const raw = sessionStorage.getItem('bmw_current_user') || localStorage.getItem('bmw_current_user');
            if (raw) user = JSON.parse(raw);
        }

        if (!user) return;

        const displayName = user.fullName || user.username || 'Staff BMW';
        const initial = (user.username || 'S').charAt(0).toUpperCase();

        if (sidebarUserName) sidebarUserName.textContent = displayName;
        if (sidebarRoleBadge) sidebarRoleBadge.textContent = user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên vận hành';

        const avatarHtml = user.avatar 
            ? `<img src="${user.avatar}" alt="${displayName}">`
            : `<span>${initial}</span>`;

        if (topbarUserAvatar) topbarUserAvatar.innerHTML = avatarHtml;
        if (sidebarUserAvatar) sidebarUserAvatar.innerHTML = avatarHtml;
    }

    // ── 11. Hash Routing Check ──────────────────────────────────────────────
    function handleHashRouting() {
        const hash = window.location.hash;
        if (hash === '#queue-shipping') {
            currentFilterStatus = 'Đang giao hàng';
            if (filterStatusSelect) filterStatusSelect.value = 'Đang giao hàng';
        } else if (hash === '#queue-returns') {
            currentFilterStatus = 'Yêu cầu đổi trả';
            if (filterStatusSelect) filterStatusSelect.value = 'Yêu cầu đổi trả';
        }
    }

    // ── 12. Event Listeners ─────────────────────────────────────────────────
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

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                applyFilters();
            });
        }
        if (filterStatusSelect) {
            filterStatusSelect.addEventListener('change', (e) => {
                currentFilterStatus = e.target.value;
                applyFilters();
            });
        }
        if (filterMethodSelect) {
            filterMethodSelect.addEventListener('change', (e) => {
                currentFilterMethod = e.target.value;
                applyFilters();
            });
        }
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadData();
                renderMetrics();
                applyFilters();
                showToast('Dữ liệu đã được cập nhật!', 'success');
            });
        }

        if (ordersTableBody) {
            ordersTableBody.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('button[data-action="view"]');
                if (viewBtn) {
                    const id = viewBtn.getAttribute('data-id');
                    openOrderModal(id);
                    return;
                }

                const quickConfirm = e.target.closest('button[data-action="quick-confirm"]');
                if (quickConfirm) {
                    const id = quickConfirm.getAttribute('data-id');
                    handleUpdateStatus(id, 'Đã xác nhận', 'Nhân viên trực duyệt nhanh qua danh sách');
                }
            });
        }

        if (paginationBtns) {
            paginationBtns.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target || target.disabled) return;

                if (target.id === 'btn-page-prev') {
                    if (currentPage > 1) {
                        currentPage--;
                        renderTable();
                    }
                    return;
                }
                if (target.id === 'btn-page-next') {
                    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderTable();
                    }
                    return;
                }
                const pageNum = Number(target.getAttribute('data-page'));
                if (pageNum && pageNum !== currentPage) {
                    currentPage = pageNum;
                    renderTable();
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

        const updateStatusBtn = document.getElementById('btn-modal-update-status');
        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', () => {
                if (!currentActiveOrderId) return;
                const nextStatusSelect = document.getElementById('modal-next-status-select');
                const noteInput = document.getElementById('modal-status-note-input');
                const selectedStatus = nextStatusSelect?.value;
                if (!selectedStatus) return;

                handleUpdateStatus(currentActiveOrderId, selectedStatus, noteInput?.value.trim() || '');
            });
        }

        const quickConfirmBtn = document.getElementById('btn-quick-confirm-order');
        if (quickConfirmBtn) {
            quickConfirmBtn.addEventListener('click', () => {
                if (!currentActiveOrderId) return;
                handleUpdateStatus(currentActiveOrderId, 'Đã xác nhận', 'Nhân viên trực ca xác nhận đơn');
            });
        }

        const addNoteBtn = document.getElementById('btn-modal-add-note');
        const newNoteInput = document.getElementById('modal-new-note-input');
        if (addNoteBtn && newNoteInput) {
            addNoteBtn.addEventListener('click', () => {
                if (!currentActiveOrderId) return;
                const text = newNoteInput.value.trim();
                if (!text) return;
                handleAddInternalNote(currentActiveOrderId, text);
                newNoteInput.value = '';
            });
            newNoteInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addNoteBtn.click();
                }
            });
        }

        // Copy Address Button
        const copyAddrBtn = document.getElementById('modal-btn-copy-address');
        if (copyAddrBtn) {
            copyAddrBtn.addEventListener('click', () => {
                const addr = document.getElementById('modal-customer-address')?.textContent;
                if (addr && navigator.clipboard) {
                    navigator.clipboard.writeText(addr).then(() => {
                        showToast('Đã sao chép địa chỉ giao hàng vào clipboard!', 'success');
                    }).catch(() => {
                        showToast(`Địa chỉ: ${addr}`, 'info');
                    });
                }
            });
        }

        // Accept Return Button (Requirement 3)
        const acceptReturnBtn = document.getElementById('btn-accept-return');
        if (acceptReturnBtn) {
            acceptReturnBtn.addEventListener('click', () => {
                if (!currentActiveOrderId) return;
                const perms = getStaffPermissions();
                const canReturn = perms.canProcessReturns || (currentUser && currentUser.role === 'admin');
                if (!canReturn) {
                    showToast('Bạn chưa được Admin cấp quyền xử lý đổi trả hàng.', 'error');
                    return;
                }

                const res = window.BMW_ORDERS_API.approveReturnRequest(
                    currentActiveOrderId,
                    'Staff trực ca đã xác nhận hợp lệ',
                    currentUser ? `@${currentUser.username || currentUser.email}` : 'Staff'
                );

                if (res.success) {
                    showToast(`Đã chấp thuận đổi trả đơn #${currentActiveOrderId}! Hàng hóa đã được hoàn kho an toàn.`, 'success');
                    loadData();
                    renderMetrics();
                    applyFilters();
                    openOrderModal(currentActiveOrderId);
                } else {
                    showToast(res.message || 'Lỗi xử lý đổi trả', 'error');
                }
            });
        }

        // Reject Return Button (Requirement 3)
        const rejectReturnBtn = document.getElementById('btn-reject-return');
        if (rejectReturnBtn) {
            rejectReturnBtn.addEventListener('click', () => {
                if (!currentActiveOrderId) return;
                const perms = getStaffPermissions();
                const canReturn = perms.canProcessReturns || (currentUser && currentUser.role === 'admin');
                if (!canReturn) {
                    showToast('Bạn chưa được Admin cấp quyền xử lý đổi trả hàng.', 'error');
                    return;
                }

                const reason = prompt('Nhập lý do từ chối yêu cầu đổi trả của khách:', 'Sản phẩm không đáp ứng điều kiện đổi trả theo chính sách BMW GYM');
                if (!reason || !reason.trim()) return;

                const res = window.BMW_ORDERS_API.rejectReturnRequest(
                    currentActiveOrderId,
                    reason.trim(),
                    currentUser ? `@${currentUser.username || currentUser.email}` : 'Staff'
                );

                if (res.success) {
                    showToast(`Đã từ chối yêu cầu đổi trả đơn #${currentActiveOrderId}`, 'info');
                    loadData();
                    renderMetrics();
                    applyFilters();
                    openOrderModal(currentActiveOrderId);
                } else {
                    showToast(res.message || 'Lỗi từ chối yêu cầu', 'error');
                }
            });
        }

        // Confirm Real Refund Transaction (Requirement 3)
        const confirmRefundBtn = document.getElementById('btn-confirm-refund');
        if (confirmRefundBtn) {
            confirmRefundBtn.addEventListener('click', () => {
                if (!currentActiveOrderId) return;
                const perms = getStaffPermissions();
                const canPay = perms.canProcessPayments || (currentUser && currentUser.role === 'admin');
                if (!canPay) {
                    showToast('Bạn chưa được cấp quyền xác nhận giao dịch tài chính / hoàn tiền.', 'error');
                    return;
                }

                const refInput = document.getElementById('modal-refund-ref-input');
                const refCode = refInput ? refInput.value.trim() : '';
                if (!refCode) {
                    showToast('Vui lòng nhập mã giao dịch ngân hàng / chứng từ hoàn tiền thực tế.', 'error');
                    return;
                }

                const res = window.BMW_ORDERS_API.confirmRefundTransaction(
                    currentActiveOrderId,
                    refCode,
                    currentUser ? `@${currentUser.username || currentUser.email}` : 'Kế toán / Staff',
                    'Đã chuyển khoản hoàn tiền thủ công qua ngân hàng'
                );

                if (res.success) {
                    showToast(`Đã xác nhận hoàn tiền thành công cho đơn #${currentActiveOrderId}!`, 'success');
                    loadData();
                    renderMetrics();
                    applyFilters();
                    openOrderModal(currentActiveOrderId);
                } else {
                    showToast(res.message || 'Lỗi xác nhận hoàn tiền', 'error');
                }
            });
        }

        window.addEventListener('hashchange', () => {
            handleHashRouting();
            applyFilters();
        });
    }

    // ── 13. Initialization ──────────────────────────────────────────────────
    function init() {
        bindCurrentUser();
        handleHashRouting();
        loadData();
        renderMetrics();
        applyFilters();
        initEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
