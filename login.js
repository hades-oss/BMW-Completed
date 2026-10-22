// login.js - BMW Login: Validation + LocalStorage Authentication
// LocalStorage key: bmw_users (array), bmw_current_user (object session)
// ⚠️ SECURITY NOTE: Passwords simulated in localStorage for academic/demo frontend project.
//    In a production system, all credentials must be hashed and verified via secure server-side API.

document.addEventListener('DOMContentLoaded', () => {
    // ─── DOM References ───────────────────────────────────────────────────────
    const form             = document.getElementById('login-form');
    const identityInput    = document.getElementById('login-identity');
    const passwordInput    = document.getElementById('login-password');
    const toggleBtn        = document.getElementById('toggle-login-password');
    const submitBtn        = form ? form.querySelector('.login-btn') : null;

    // Error & Notice display elements
    const bannerEl         = document.getElementById('login-error-banner');
    const demoNoticeEl     = document.getElementById('login-demo-notice');
    const identityErrorEl  = document.getElementById('login-identity-error');
    const passwordErrorEl  = document.getElementById('login-password-error');

    // ─── Password Toggle ─────────────────────────────────────────────────────
    if (passwordInput && toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = isPassword
                ? `<svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
                : `<svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
            toggleBtn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        });
    }

    // ─── Helper: Show / Clear field-level errors ──────────────────────────────
    function showFieldError(inputEl, errorEl, msg) {
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
        if (inputEl) {
            inputEl.style.borderColor = '#DC2626';
            inputEl.style.boxShadow = '0 0 0 2px rgba(220,38,38,0.2)';
        }
    }

    function clearFieldError(inputEl, errorEl) {
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
        if (inputEl) {
            inputEl.style.borderColor = '';
            inputEl.style.boxShadow = '';
        }
    }

    function showBanner(msg) {
        if (bannerEl) {
            bannerEl.textContent = msg;
            bannerEl.style.display = 'block';
        }
    }

    function clearBanner() {
        if (bannerEl) {
            bannerEl.textContent = '';
            bannerEl.style.display = 'none';
        }
    }

    function showDemoNotice(roleType, htmlContent) {
        if (!demoNoticeEl) return;
        demoNoticeEl.innerHTML = htmlContent;
        demoNoticeEl.style.display = 'block';
        if (roleType === 'admin') {
            demoNoticeEl.style.backgroundColor = '#EFF6FF';
            demoNoticeEl.style.borderColor = '#93C5FD';
            demoNoticeEl.style.color = '#1E3A8A';
        } else if (roleType === 'staff') {
            demoNoticeEl.style.backgroundColor = '#FFFBEB';
            demoNoticeEl.style.borderColor = '#FCD34D';
            demoNoticeEl.style.color = '#92400E';
        }
    }

    // ─── Live: clear error when user re-types ────────────────────────────────
    if (identityInput) {
        identityInput.addEventListener('input', () => {
            clearFieldError(identityInput, identityErrorEl);
            clearBanner();
        });
    }
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            clearFieldError(passwordInput, passwordErrorEl);
            clearBanner();
        });
    }

    // ─── Check URL params for Demo mode or locked notifications ───────────────
    let demoParam = '';
    try {
        const urlParams = new URLSearchParams(window.location.search);
        demoParam = (urlParams.get('demo') || urlParams.get('role') || '').toLowerCase();
        
        if (urlParams.get('reason') === 'locked') {
            showBanner('Phiên đăng nhập đã kết thúc: Tài khoản của bạn đã bị khóa hoặc tạm ngưng bởi Quản trị viên.');
        }
    } catch (e) {}

    const isDemoMode = demoParam === 'admin' || demoParam === 'staff';

    // ─── Session Handling & Pre-fill ──────────────────────────────────────────
    if (isDemoMode) {
        // Rule: Avoid using stale session of previous user in demo flow
        try {
            sessionStorage.removeItem('bmw_current_user');
            localStorage.removeItem('bmw_current_user');
        } catch (e) {}

        // Ensure users are loaded & seeded
        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.getUsers === 'function') {
            window.BMW_AUTH_GUARD.getUsers();
        }

        const demoAccounts = window.BMW_AUTH_GUARD && window.BMW_AUTH_GUARD.DEMO_ACCOUNTS
            ? window.BMW_AUTH_GUARD.DEMO_ACCOUNTS
            : {
                admin: { username: 'admin_demo', password: 'Admin@2026' },
                staff: { username: 'staff_demo', password: 'Staff@2026' }
            };

        if (demoParam === 'admin') {
            const adminData = demoAccounts.admin || { username: 'admin_demo', password: 'Admin@2026' };
            if (identityInput) identityInput.value = adminData.username;
            if (passwordInput) passwordInput.value = adminData.password;

            showDemoNotice('admin', `
                <div style="font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563EB;"></span>
                    <span>CHẾ ĐỘ DEMO QUẢN TRỊ VIÊN (ADMIN)</span>
                </div>
                <div style="font-size:12px; color:#1E40AF;">
                    Thông tin tài khoản Quản trị demo đã được điền sẵn (<strong>${adminData.username}</strong>). 
                    Vui lòng nhấn nút <strong>ĐĂNG NHẬP</strong> bên dưới để xác thực quyền hạn và truy cập Bảng điều khiển Quản trị.
                </div>
            `);
        } else if (demoParam === 'staff') {
            const staffData = demoAccounts.staff || { username: 'staff_demo', password: 'Staff@2026' };
            if (identityInput) identityInput.value = staffData.username;
            if (passwordInput) passwordInput.value = staffData.password;

            showDemoNotice('staff', `
                <div style="font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#D97706;"></span>
                    <span>CHẾ ĐỘ DEMO NHÂN VIÊN (STAFF)</span>
                </div>
                <div style="font-size:12px; color:#92400E;">
                    Thông tin tài khoản Nhân viên demo đã được điền sẵn (<strong>${staffData.username}</strong>). 
                    Vui lòng nhấn nút <strong>ĐĂNG NHẬP</strong> bên dưới để xác thực quyền hạn và truy cập Bàn làm việc Nhân viên.
                </div>
            `);
        }
        // NOTE: Strictly do NOT auto-submit. User must deliberately click LOGIN button.
    } else {
        // Normal login flow: Redirect if already logged in
        try {
            const existing = sessionStorage.getItem('bmw_current_user') || localStorage.getItem('bmw_current_user');
            if (existing) {
                const parsed = JSON.parse(existing);
                if (parsed && parsed.id) {
                    window.location.replace('index.html');
                    return;
                }
            }
        } catch (e) {
            sessionStorage.removeItem('bmw_current_user');
            localStorage.removeItem('bmw_current_user');
        }
    }

    // ─── Form Submit ──────────────────────────────────────────────────────────
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();

        clearBanner();
        clearFieldError(identityInput, identityErrorEl);
        clearFieldError(passwordInput, passwordErrorEl);

        const identity = identityInput ? identityInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        // ── Field-level validation (empty check) ──
        let hasError = false;

        if (!identity) {
            showFieldError(identityInput, identityErrorEl, 'Vui lòng nhập tên đăng nhập hoặc email.');
            hasError = true;
        }

        if (!password) {
            showFieldError(passwordInput, passwordErrorEl, 'Vui lòng nhập mật khẩu.');
            hasError = true;
        }

        if (hasError) return;

        // ── Read registered users ──
        let users = [];
        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.getUsers === 'function') {
            users = window.BMW_AUTH_GUARD.getUsers();
        } else {
            try {
                const raw = localStorage.getItem('bmw_users');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    users = Array.isArray(parsed) ? parsed : [];
                }
            } catch (err) {
                console.error('[login.js] Failed to parse bmw_users:', err);
                showBanner('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
                return;
            }
        }

        // ── Authenticate Credentials ──
        const identityLower = identity.toLowerCase();
        const matchedUser = users.find(u => {
            if (!u || typeof u !== 'object') return false;
            const emailMatch       = u.email       && u.email.toLowerCase()       === identityLower;
            const usernameMatch    = u.username    && u.username.toLowerCase()    === identityLower;
            const linkedGmailMatch = u.linkedGmail && u.linkedGmail.email && u.linkedGmail.email.toLowerCase() === identityLower;
            const passwordMatch    = u.password === password;
            return (emailMatch || usernameMatch || linkedGmailMatch) && passwordMatch;
        });

        if (!matchedUser) {
            // Check if user exists at all (to give clear feedback)
            const userExists = users.find(u =>
                u && ((u.email && u.email.toLowerCase() === identityLower) ||
                      (u.username && u.username.toLowerCase() === identityLower) ||
                      (u.linkedGmail && u.linkedGmail.email && u.linkedGmail.email.toLowerCase() === identityLower))
            );
            if (userExists) {
                showFieldError(passwordInput, passwordErrorEl, 'Mật khẩu không chính xác.');
            } else {
                showFieldError(identityInput, identityErrorEl, 'Không tìm thấy tài khoản với tên đăng nhập hoặc email này.');
            }
            return;
        }

        // ── Check Account Status (Active vs Banned / Locked) ──
        if (matchedUser.status === 'banned' || matchedUser.status === 'locked') {
            showBanner('Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động. Vui lòng liên hệ quản trị viên.');
            return;
        }

        // ── Role Authorization Check for Demo Modes ──
        const actualRole = (matchedUser.role || 'customer').toLowerCase();

        if (demoParam === 'admin' && actualRole !== 'admin') {
            showBanner('Truy cập bị từ chối: Tài khoản này không có vai trò Quản trị viên (Admin). Bạn không thể truy cập Bảng điều khiển Quản trị.');
            return;
        }

        if (demoParam === 'staff' && actualRole !== 'staff') {
            showBanner('Truy cập bị từ chối: Tài khoản này không có vai trò Nhân viên (Staff). Bạn không thể truy cập Bàn làm việc Nhân viên.');
            return;
        }

        // ── Success: Save session according to actual verified user role ──
        const sessionData = {
            id:          matchedUser.id,
            fullName:    matchedUser.fullName || '',
            username:    matchedUser.username || '',
            email:       matchedUser.email || '',
            phone:       matchedUser.phone || '',
            role:        matchedUser.role || 'customer',
            status:      matchedUser.status || 'active',
            permissions: Array.isArray(matchedUser.permissions) ? matchedUser.permissions : [],
            address:     matchedUser.address || '',
            dob:         matchedUser.dob || '',
            avatar:      matchedUser.avatar || '',
            linkedGmail: matchedUser.linkedGmail || null,
            createdAt:   matchedUser.createdAt || new Date().toISOString()
        };

        // Handle "Remember me": if checked, persist session in localStorage; otherwise use sessionStorage
        const rememberMe = form.querySelector('#rememberMe');
        if (rememberMe && rememberMe.checked) {
            sessionStorage.removeItem('bmw_current_user');
            localStorage.setItem('bmw_current_user', JSON.stringify(sessionData));
        } else {
            localStorage.removeItem('bmw_current_user');
            sessionStorage.setItem('bmw_current_user', JSON.stringify(sessionData));
        }

        // ── Success UI feedback ──
        if (submitBtn) {
            submitBtn.textContent = '✓ ĐANG ĐĂNG NHẬP...';
            submitBtn.style.backgroundColor = '#059669';
            submitBtn.disabled = true;
        }

        // ── Determine target URL based on actual verified role ──
        let targetUrl = 'index.html';
        const returnUrl = sessionStorage.getItem('bmw_return_url');

        if (actualRole === 'admin') {
            if (returnUrl && returnUrl.includes('admin') && !returnUrl.includes('login')) {
                targetUrl = returnUrl;
            } else {
                targetUrl = 'admin-dashboard.html';
            }
        } else if (actualRole === 'staff') {
            if (returnUrl && returnUrl.includes('staff') && !returnUrl.includes('login')) {
                targetUrl = returnUrl;
            } else {
                targetUrl = 'staff-dashboard.html';
            }
        } else {
            // Customer role: strictly forbid redirecting to admin/staff internal URLs
            if (returnUrl && !returnUrl.includes('admin') && !returnUrl.includes('staff') && !returnUrl.includes('login')) {
                targetUrl = returnUrl;
            } else {
                targetUrl = 'index.html';
            }
        }

        sessionStorage.removeItem('bmw_return_url');

        setTimeout(() => {
            window.location.href = targetUrl;
        }, 500);
    });
});
