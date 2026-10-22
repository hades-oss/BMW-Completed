// main.js - Global Auth UI State & Cart logic

document.addEventListener('DOMContentLoaded', () => {

    // ─── 1. Auth UI: Account Dropdown Menu ────────────────────────────────────
    const wrapper = document.querySelector('.account-dropdown-wrapper');
    const toggleBtn = document.querySelector('.account-toggle-btn');
    const menu = document.querySelector('.account-dropdown-menu');
    
    if (wrapper && toggleBtn && menu) {
        // Ensure Admin & Staff demo entry points exist in logged-out menu (Đợt 8 Bổ Sung)
        if (!menu.querySelector('a[href*="demo=admin"]')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'login.html?demo=admin';
            adminLink.className = 'acc-menu-link acc-demo-link acc-demo-admin auth-logged-out';
            adminLink.setAttribute('role', 'menuitem');
            adminLink.innerHTML = 'Admin <span class="acc-demo-tag">Demo</span>';

            const staffLink = document.createElement('a');
            staffLink.href = 'login.html?demo=staff';
            staffLink.className = 'acc-menu-link acc-demo-link acc-demo-staff auth-logged-out';
            staffLink.setAttribute('role', 'menuitem');
            staffLink.innerHTML = 'Staff <span class="acc-demo-tag">Demo</span>';

            const regLink = menu.querySelector('a[href="register.html"]');
            if (regLink && regLink.parentNode) {
                if (regLink.nextSibling) {
                    regLink.parentNode.insertBefore(adminLink, regLink.nextSibling);
                    regLink.parentNode.insertBefore(staffLink, adminLink.nextSibling);
                } else {
                    regLink.parentNode.appendChild(adminLink);
                    regLink.parentNode.appendChild(staffLink);
                }
            } else {
                menu.appendChild(adminLink);
                menu.appendChild(staffLink);
            }
        }

        const loggedOutLinks = menu.querySelectorAll('.auth-logged-out');
        const loggedInLinks = menu.querySelectorAll('.auth-logged-in');
        const logoutBtn = menu.querySelector('#acc-logout-btn');

        // Check session in sessionStorage first, then localStorage
        let currentUser = null;
        try {
            const rawSession = sessionStorage.getItem('bmw_current_user');
            const rawLocal = localStorage.getItem('bmw_current_user');
            const raw = rawSession || rawLocal;
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && parsed.id) {
                    currentUser = parsed;
                } else {
                    if (rawSession) sessionStorage.removeItem('bmw_current_user');
                    if (rawLocal) localStorage.removeItem('bmw_current_user');
                }
            }
        } catch (e) {
            sessionStorage.removeItem('bmw_current_user');
            localStorage.removeItem('bmw_current_user');
        }

        if (currentUser) {
            // Live verification against bmw_users (check banned / locked status & live role)
            try {
                const rawUsers = localStorage.getItem('bmw_users');
                if (rawUsers) {
                    const users = JSON.parse(rawUsers);
                    const liveUser = users.find(u => u.id === currentUser.id || (u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase()));
                    if (liveUser) {
                        currentUser.role = liveUser.role || 'customer';
                        currentUser.status = liveUser.status || 'active';
                        if (liveUser.status === 'banned' || liveUser.status === 'locked') {
                            sessionStorage.removeItem('bmw_current_user');
                            localStorage.removeItem('bmw_current_user');
                            currentUser = null;
                        }
                    }
                }
            } catch (err) {}
        }

        if (currentUser) {
            // Logged in UI
            const displayName = currentUser.username || currentUser.fullName || currentUser.email || 'User';
            
            toggleBtn.classList.add('logged-in');
            toggleBtn.setAttribute('title', 'Tài khoản');
            
            const menuUsernameDisplay = menu.querySelector('.menu-username-display');
            if (menuUsernameDisplay) {
                menuUsernameDisplay.textContent = '@' + displayName;
            }

            // Display role badge in account header
            let roleBadge = menu.querySelector('.menu-role-badge');
            if (!roleBadge) {
                roleBadge = document.createElement('span');
                roleBadge.className = 'menu-role-badge';
                roleBadge.style.cssText = 'display:inline-block; font-size:10px; font-weight:800; padding:2px 6px; border-radius:3px; margin-top:4px; text-transform:uppercase; letter-spacing:0.05em;';
                const accMenuHeader = menu.querySelector('.acc-menu-header');
                if (accMenuHeader) accMenuHeader.appendChild(roleBadge);
            }
            if (roleBadge) {
                const role = (currentUser.role || 'customer').toLowerCase();
                if (role === 'admin') {
                    roleBadge.textContent = 'QUẢN TRỊ';
                    roleBadge.style.backgroundColor = '#DC2626';
                    roleBadge.style.color = '#FFFFFF';
                    roleBadge.style.display = 'inline-block';
                } else if (role === 'staff') {
                    roleBadge.textContent = 'NHÂN VIÊN';
                    roleBadge.style.backgroundColor = '#D97706';
                    roleBadge.style.color = '#FFFFFF';
                    roleBadge.style.display = 'inline-block';
                } else {
                    roleBadge.textContent = 'KHÁCH HÀNG';
                    roleBadge.style.backgroundColor = '#2563EB';
                    roleBadge.style.color = '#FFFFFF';
                    roleBadge.style.display = 'inline-block';
                }
            }

            loggedOutLinks.forEach(el => el.style.display = 'none');
            loggedInLinks.forEach(el => el.style.display = 'block');

            // Add/Show Dashboard link for Admin and Staff roles
            let dashLink = menu.querySelector('.menu-dashboard-link');
            const userRole = (currentUser.role || 'customer').toLowerCase();
            if (userRole === 'admin' || userRole === 'staff') {
                if (!dashLink) {
                    dashLink = document.createElement('a');
                    dashLink.className = 'auth-logged-in menu-dashboard-link';
                    dashLink.style.fontWeight = '600';
                    const profileLink = menu.querySelector('a[href="profile.html"]');
                    if (profileLink && profileLink.parentNode) {
                        profileLink.parentNode.insertBefore(dashLink, profileLink);
                    } else if (logoutBtn) {
                        menu.insertBefore(dashLink, logoutBtn);
                    }
                }
                if (userRole === 'admin') {
                    dashLink.href = 'admin-dashboard.html';
                    dashLink.innerHTML = '⚙️ Bảng điều khiển Quản trị';
                    dashLink.style.display = 'block';
                } else if (userRole === 'staff') {
                    dashLink.href = 'staff-dashboard.html';
                    dashLink.innerHTML = '📋 Bảng điều khiển Nhân viên';
                    dashLink.style.display = 'block';
                }
            } else if (dashLink) {
                dashLink.style.display = 'none';
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const confirmed = confirm('Bạn có chắc muốn đăng xuất?');
                    if (confirmed) {
                        sessionStorage.removeItem('bmw_current_user');
                        localStorage.removeItem('bmw_current_user');
                        window.location.reload();
                    }
                });
            }
        } else {
            // Logged out UI
            toggleBtn.setAttribute('title', 'Đăng nhập / Đăng ký');
            
            loggedOutLinks.forEach(el => {
                if (el.classList.contains('acc-demo-link')) {
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'block';
                }
            });
            loggedInLinks.forEach(el => el.style.display = 'none');
        }

        // Toggle click for mobile tap support
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            menu.classList.toggle('active');
        });

        // Close menu on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('active')) {
                menu.classList.remove('active');
                toggleBtn.focus();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                menu.classList.remove('active');
            }
        });
    }

    // ─── 2. Mobile Navigation Toggle ──────────────────────────────────────────
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const nav = document.querySelector('.header nav');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.setAttribute('aria-controls', 'site-navigation');
        if (!nav.id) nav.id = 'site-navigation';

        mobileMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = nav.classList.toggle('open');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            mobileMenuBtn.classList.toggle('active', isOpen);
        });

        // Close menu after clicking any navigation link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (nav.classList.contains('open')) {
                    nav.classList.remove('open');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                    mobileMenuBtn.classList.remove('active');
                }
            });
        });

        // Close menu on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('open')) {
                nav.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileMenuBtn.classList.remove('active');
                mobileMenuBtn.focus();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !mobileMenuBtn.contains(e.target) && nav.classList.contains('open')) {
                nav.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }
});
