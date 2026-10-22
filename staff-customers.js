/**
 * js/staff-customers.js — BMW GYM Staff Customer & Delivery Support Logic (Phase 8.5)
 * Role-Restricted (Staff, Admin). Customers list only. Delivery & Support inquiries.
 */

(function () {
    'use strict';

    // ── 1. RBAC Guard: Require Staff or Admin Role ──────────────────────────
    if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.requireRole === 'function') {
        const hasAccess = window.BMW_AUTH_GUARD.requireRole(['staff', 'admin'], 'index.html');
        if (!hasAccess) return;
    }

    // ── 2. State & Variables ────────────────────────────────────────────────
    let customers = [];
    let orders = [];
    let filteredCustomers = [];
    let searchQuery = '';
    let currentPage = 1;
    const PAGE_SIZE = 8;

    // ── 3. DOM Elements ─────────────────────────────────────────────────────
    const layoutEl = document.getElementById('dash-layout');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const mobileToggleBtn = document.getElementById('sidebar-mobile-toggle');
    const backdropEl = document.getElementById('dash-backdrop');
    const logoutBtn = document.getElementById('logout-btn');

    // User Profile Elements
    const topbarUserAvatar = document.getElementById('topbar-user-avatar');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');

    // Table & Controls
    const searchInput = document.getElementById('staff-customer-search');
    const tableBody = document.getElementById('customers-table-body');
    const tableEmpty = document.getElementById('customers-table-empty');
    const paginationInfo = document.getElementById('customers-pagination-info');
    const paginationBtns = document.getElementById('customers-pagination-btns');

    // Modal
    const modalView = document.getElementById('modal-staff-view-customer');
    const btnCloseView = document.getElementById('btn-close-staff-view');
    const btnCloseViewFooter = document.getElementById('btn-close-staff-view-footer');

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
                day: '2-digit'
            });
        } catch (e) {
            return isoStr;
        }
    }

    // ── 5. Data Loading ─────────────────────────────────────────────────────
    function loadData() {
        let allUsers = [];
        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.getUsers === 'function') {
            allUsers = window.BMW_AUTH_GUARD.getUsers();
        } else {
            try { allUsers = JSON.parse(localStorage.getItem('bmw_users')) || []; } catch (e) { allUsers = []; }
        }

        // Filter strictly customers only (Staff cannot inspect other staff or admin)
        customers = allUsers.filter(u => u.role === 'customer');

        if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.getOrders === 'function') {
            orders = window.BMW_ORDERS_API.getOrders();
        } else {
            try { orders = JSON.parse(localStorage.getItem('bmw_orders')) || []; } catch (e) { orders = []; }
        }
    }

    function getCustomerOrders(customer) {
        if (!customer) return [];
        return orders.filter(o => {
            if (!o) return false;
            const matchesId = customer.id && o.userId && String(o.userId) === String(customer.id);
            const matchesAccount = customer.username && o.userAccount && o.userAccount.toLowerCase() === customer.username.toLowerCase();
            return matchesId || matchesAccount;
        });
    }

    // ── 6. Filtering & Rendering ────────────────────────────────────────────
    function applyFilters() {
        filteredCustomers = customers.filter(c => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchName = c.fullName && c.fullName.toLowerCase().includes(q);
                const matchUser = c.username && c.username.toLowerCase().includes(q);
                const matchEmail = c.email && c.email.toLowerCase().includes(q);
                const matchPhone = c.phone && c.phone.toLowerCase().includes(q);
                const matchAddress = c.address && c.address.toLowerCase().includes(q);
                if (!matchName && !matchUser && !matchEmail && !matchPhone && !matchAddress) {
                    return false;
                }
            }
            return true;
        });

        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (filteredCustomers.length === 0) {
            if (tableEmpty) tableEmpty.style.display = 'block';
            if (paginationInfo) paginationInfo.textContent = '0 khách hàng';
            if (paginationBtns) paginationBtns.innerHTML = '';
            return;
        }

        if (tableEmpty) tableEmpty.style.display = 'none';

        const totalItems = filteredCustomers.length;
        const totalPages = Math.ceil(totalItems / PAGE_SIZE);
        if (currentPage > totalPages) currentPage = totalPages || 1;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
        const pageCustomers = filteredCustomers.slice(startIndex, endIndex);

        pageCustomers.forEach(cust => {
            const tr = document.createElement('tr');
            const custOrders = getCustomerOrders(cust);
            const initial = (cust.fullName || cust.username || 'U').charAt(0).toUpperCase();

            const avatarHtml = cust.avatar
                ? `<img src="${cust.avatar}" alt="${cust.username}">`
                : initial;

            tr.innerHTML = `
                <td>
                    <div class="user-cell">
                        <div class="user-cell-avatar">${avatarHtml}</div>
                        <div class="user-cell-info">
                            <span class="user-cell-name">${cust.fullName || 'Khách hàng'}</span>
                            <span class="user-cell-handle">@${cust.username}</span>
                        </div>
                    </div>
                </td>
                <td><strong>${cust.phone || 'Chưa có SĐT'}</strong></td>
                <td>${cust.email || 'N/A'}</td>
                <td style="max-width: 220px; font-size: 13px;">${cust.address || '<span style="color:var(--text-muted)">Chưa cập nhật địa chỉ</span>'}</td>
                <td><span class="badge-status status-processing">${custOrders.length} đơn</span></td>
                <td style="text-align: right;">
                    <button class="btn-action" data-action="view-cust" data-id="${cust.id}">
                        Xem giao vận
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });

        if (paginationInfo) {
            paginationInfo.textContent = `Hiển thị ${startIndex + 1}–${endIndex} trên tổng số ${totalItems} khách hàng`;
        }

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        if (!paginationBtns) return;
        paginationBtns.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.className = `btn-page ${currentPage === 1 ? 'disabled' : ''}`;
        prevBtn.textContent = '‹ Trước';
        prevBtn.disabled = currentPage === 1;
        prevBtn.id = 'btn-cust-prev';
        paginationBtns.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `btn-page ${i === currentPage ? 'active' : ''}`;
            pageBtn.setAttribute('data-page', i);
            pageBtn.textContent = i;
            paginationBtns.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = `btn-page ${currentPage === totalPages ? 'disabled' : ''}`;
        nextBtn.textContent = 'Sau ›';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.id = 'btn-cust-next';
        paginationBtns.appendChild(nextBtn);
    }

    // ── 7. Modal Handlers ───────────────────────────────────────────────────
    function openCustomerModal(custId) {
        const cust = customers.find(c => String(c.id) === String(custId));
        if (!cust || !modalView) return;

        const nameEl = document.getElementById('staff-view-fullname');
        const userEl = document.getElementById('staff-view-username');
        const phoneEl = document.getElementById('staff-view-phone');
        const emailEl = document.getElementById('staff-view-email');
        const addressEl = document.getElementById('staff-view-address');
        const avatarEl = document.getElementById('staff-view-avatar');
        const ordersBody = document.getElementById('staff-view-orders-body');

        if (nameEl) nameEl.textContent = cust.fullName || 'Khách hàng';
        if (userEl) userEl.textContent = `@${cust.username}`;
        if (phoneEl) phoneEl.textContent = cust.phone || 'Chưa có SĐT';
        if (emailEl) emailEl.textContent = cust.email || 'N/A';
        if (addressEl) addressEl.textContent = cust.address || 'Chưa cập nhật địa chỉ giao hàng';

        if (avatarEl) {
            const initial = (cust.fullName || cust.username || 'U').charAt(0).toUpperCase();
            avatarEl.innerHTML = cust.avatar ? `<img src="${cust.avatar}" alt="${cust.username}">` : initial;
        }

        const custOrders = getCustomerOrders(cust);
        if (ordersBody) {
            ordersBody.innerHTML = '';
            if (custOrders.length === 0) {
                ordersBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Khách hàng chưa có đơn hàng nào.</td></tr>';
            } else {
                custOrders.forEach(o => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${o.orderId || o.id}</strong></td>
                        <td>${formatDate(o.createdAt || o.orderDate)}</td>
                        <td>${formatVND(o.finalTotal || o.totalAmount)}</td>
                        <td><span class="badge-status status-processing">${o.orderStatus || 'Đang xử lý'}</span></td>
                    `;
                    ordersBody.appendChild(row);
                });
            }
        }

        modalView.classList.add('active');
        modalView.setAttribute('aria-hidden', 'false');
    }

    function closeCustomerModal() {
        if (!modalView) return;
        modalView.classList.remove('active');
        modalView.setAttribute('aria-hidden', 'true');
    }

    // ── 8. Bind Current User & Events ───────────────────────────────────────
    function bindCurrentUser() {
        const currentUser = window.BMW_AUTH_GUARD.getCurrentUser();
        if (!currentUser) return;

        const displayName = currentUser.fullName || currentUser.username || 'Staff';
        const initial = displayName.charAt(0).toUpperCase();

        if (topbarUserAvatar) {
            topbarUserAvatar.textContent = initial;
            if (currentUser.avatar) {
                topbarUserAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            }
        }
        if (sidebarUserName) sidebarUserName.textContent = displayName;
        if (sidebarUserAvatar) {
            sidebarUserAvatar.textContent = initial;
            if (currentUser.avatar) {
                sidebarUserAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            }
        }
    }

    function initEvents() {
        if (collapseBtn) collapseBtn.addEventListener('click', () => layoutEl && layoutEl.classList.toggle('sidebar-collapsed'));
        if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', () => layoutEl && layoutEl.classList.toggle('sidebar-mobile-open'));
        if (backdropEl) backdropEl.addEventListener('click', () => layoutEl && layoutEl.classList.remove('sidebar-mobile-open'));

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.BMW_AUTH_GUARD.logout();
                window.location.replace('login.html');
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value.trim();
                applyFilters();
            });
        }

        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action="view-cust"]');
                if (btn) {
                    const id = btn.getAttribute('data-id');
                    openCustomerModal(id);
                }
            });
        }

        if (paginationBtns) {
            paginationBtns.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target || target.disabled) return;

                if (target.id === 'btn-cust-prev' && currentPage > 1) {
                    currentPage--;
                    renderTable();
                    return;
                }
                const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
                if (target.id === 'btn-cust-next' && currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                    return;
                }
                const pageNum = Number(target.getAttribute('data-page'));
                if (pageNum && pageNum !== currentPage) {
                    currentPage = pageNum;
                    renderTable();
                }
            });
        }

        if (btnCloseView) btnCloseView.addEventListener('click', closeCustomerModal);
        if (btnCloseViewFooter) btnCloseViewFooter.addEventListener('click', closeCustomerModal);
        if (modalView) {
            modalView.addEventListener('click', (e) => {
                if (e.target === modalView) closeCustomerModal();
            });
        }
    }

    function init() {
        bindCurrentUser();
        loadData();
        applyFilters();
        initEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.BMW_STAFF_CUSTOMERS_UI = {
        loadData,
        applyFilters,
        openCustomerModal
    };

})();
