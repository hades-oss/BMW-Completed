/**
 * BMW GYM - Authentication & Role Guard System (Phase 8.1 & 8.5)
 * File: js/auth-guard.js
 * 
 * ⚠️ BẢO MẬT & GIỚI HẠN KIẾN TRÚC (SECURITY NOTE):
 * Hệ thống BMW GYM hiện hoạt động hoàn toàn ở phía Frontend (Client-side) với localStorage/sessionStorage.
 * - Mật khẩu và phân quyền (Role: admin, staff, customer) hiện tại được mô phỏng phía Client cho mục đích
 *   đồ án/demo/học tập.
 * - KHÔNG có máy chủ (Backend), KHÔNG có cơ chế ký số bảo mật (JWT/HttpOnly Cookies) hoặc mã hóa cơ sở dữ liệu.
 * - Người dùng có quyền truy cập trình duyệt có thể can thiệp dữ liệu trong DevTools Application.
 * - Khi đưa vào môi trường sản xuất (Production), BẮT BUỘC phải chuyển toàn bộ xác thực, kiểm tra quyền hạn,
 *   băm mật khẩu (bcrypt/argon2) và xác minh OTP email sang API máy chủ an toàn.
 * - Không sử dụng mật khẩu mặc định yếu (chỉ demo các mật khẩu mẫu tuân thủ độ phức tạp như Admin@2026, Staff@2026).
 */

(function (window) {
    'use strict';

    const USERS_STORAGE_KEY = 'bmw_users';
    const SESSION_STORAGE_KEY = 'bmw_current_user';
    const RETURN_URL_KEY = 'bmw_return_url';
    const AUDIT_STORAGE_KEY = 'bmw_audit_logs';

    const ROLES = Object.freeze({
        ADMIN: 'admin',
        STAFF: 'staff',
        CUSTOMER: 'customer'
    });

    const STATUS = Object.freeze({
        ACTIVE: 'active',
        BANNED: 'banned',
        LOCKED: 'locked'
    });

    const STAFF_PERMISSIONS = Object.freeze({
        ORDERS_VIEW: 'orders_view',
        ORDERS_UPDATE: 'orders_update',
        PRODUCTS_VIEW: 'products_view',
        PRODUCTS_EDIT: 'products_edit',
        CUSTOMERS_VIEW: 'customers_view',
        REPORTS_VIEW: 'reports_view'
    });

    const DEFAULT_STAFF_PERMISSIONS = Object.freeze([
        STAFF_PERMISSIONS.ORDERS_VIEW,
        STAFF_PERMISSIONS.ORDERS_UPDATE,
        STAFF_PERMISSIONS.PRODUCTS_VIEW,
        STAFF_PERMISSIONS.CUSTOMERS_VIEW
    ]);

    // Default Seed Accounts for Testing & Administration
    const DEFAULT_ADMIN = {
        id: 'admin_001',
        fullName: 'Admin BMW GYM',
        username: 'admin',
        email: 'admin@bmwgym.vn',
        phone: '+84 0355278900',
        password: 'Admin@2026',
        role: ROLES.ADMIN,
        status: STATUS.ACTIVE,
        permissions: Object.values(STAFF_PERMISSIONS),
        address: '137 Nguyễn Thị Thập, Phường Hải Châu, TP. Đà Nẵng',
        dob: '1990-01-01',
        avatar: '',
        linkedGmail: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    };

    const DEFAULT_STAFF = {
        id: 'staff_001',
        fullName: 'Staff BMW GYM',
        username: 'staff',
        email: 'staff@bmwgym.vn',
        phone: '+84 0905123456',
        password: 'Staff@2026',
        role: ROLES.STAFF,
        status: STATUS.ACTIVE,
        permissions: [...DEFAULT_STAFF_PERMISSIONS],
        address: 'District 7 Central Warehouse, HCMC',
        dob: '1995-05-15',
        avatar: '',
        linkedGmail: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    };

    // Dedicated Independent Demo Accounts for Evaluation (Đợt 8 Bổ Sung)
    // ⚠️ Security Note: Passwords simulated client-side for academic/demo project.
    const DEMO_ADMIN = Object.freeze({
        id: 'admin_demo_001',
        fullName: 'Admin Demo BMW GYM',
        username: 'admin_demo',
        email: 'admin.demo@bmwgym.vn',
        phone: '+84 0355278901',
        password: 'Admin@2026',
        role: ROLES.ADMIN,
        status: STATUS.ACTIVE,
        permissions: Object.values(STAFF_PERMISSIONS),
        address: '137 Nguyễn Thị Thập, Phường Hải Châu, TP. Đà Nẵng',
        dob: '1990-01-01',
        avatar: '',
        linkedGmail: null,
        isDemo: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    });

    const DEMO_STAFF = Object.freeze({
        id: 'staff_demo_001',
        fullName: 'Staff Demo BMW GYM',
        username: 'staff_demo',
        email: 'staff.demo@bmwgym.vn',
        phone: '+84 0905123457',
        password: 'Staff@2026',
        role: ROLES.STAFF,
        status: STATUS.ACTIVE,
        permissions: [...DEFAULT_STAFF_PERMISSIONS],
        address: 'District 7 Central Warehouse, HCMC',
        dob: '1995-05-15',
        avatar: '',
        linkedGmail: null,
        isDemo: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    });

    /**
     * Get all registered users with data normalization & automatic seeding.
     * Guarantees all user objects conform to Phase 8.1 & 8.5 schema.
     */
    function getUsers() {
        let users = [];
        let modified = false;

        try {
            const raw = localStorage.getItem(USERS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    users = parsed;
                }
            }
        } catch (e) {
            console.error('[auth-guard] Error reading users from localStorage:', e);
            users = [];
        }

        // 1. Normalize each user record (migration for old accounts)
        users = users.map(user => {
            if (!user || typeof user !== 'object') return null;

            let userModified = false;

            if (!user.id) {
                user.id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                userModified = true;
            }
            if (!user.role || ![ROLES.ADMIN, ROLES.STAFF, ROLES.CUSTOMER].includes(user.role)) {
                user.role = ROLES.CUSTOMER;
                userModified = true;
            }
            if (!user.status || ![STATUS.ACTIVE, STATUS.BANNED, STATUS.LOCKED].includes(user.status)) {
                user.status = STATUS.ACTIVE;
                userModified = true;
            }
            if (!Array.isArray(user.permissions)) {
                if (user.role === ROLES.ADMIN) {
                    user.permissions = Object.values(STAFF_PERMISSIONS);
                } else if (user.role === ROLES.STAFF) {
                    user.permissions = [...DEFAULT_STAFF_PERMISSIONS];
                } else {
                    user.permissions = [];
                }
                userModified = true;
            }
            if (user.address === undefined) {
                user.address = '';
                userModified = true;
            }
            if (user.dob === undefined) {
                user.dob = '';
                userModified = true;
            }
            if (user.avatar === undefined) {
                user.avatar = '';
                userModified = true;
            }
            if (user.linkedGmail === undefined) {
                user.linkedGmail = null;
                userModified = true;
            }
            if (!user.createdAt) {
                user.createdAt = new Date().toISOString();
                userModified = true;
            }
            if (!user.updatedAt) {
                user.updatedAt = user.createdAt;
                userModified = true;
            }

            if (userModified) modified = true;
            return user;
        }).filter(Boolean);

        // 2. Ensure default Admin exists
        const hasAdmin = users.some(u => u.username === DEFAULT_ADMIN.username || u.role === ROLES.ADMIN);
        if (!hasAdmin) {
            users.unshift({ ...DEFAULT_ADMIN, permissions: Object.values(STAFF_PERMISSIONS) });
            modified = true;
        }

        // 3. Ensure default Staff exists
        const hasStaff = users.some(u => u.username === DEFAULT_STAFF.username);
        if (!hasStaff) {
            users.push({ ...DEFAULT_STAFF, permissions: [...DEFAULT_STAFF_PERMISSIONS] });
            modified = true;
        }

        // 4. Ensure independent Demo Admin exists (Prompt Bổ Sung Đợt 8)
        const existingAdminDemo = users.find(u => u.username === DEMO_ADMIN.username || u.id === DEMO_ADMIN.id);
        if (!existingAdminDemo) {
            users.push({ ...DEMO_ADMIN, permissions: Object.values(STAFF_PERMISSIONS) });
            modified = true;
        } else if (existingAdminDemo.id === DEMO_ADMIN.id && existingAdminDemo.role !== ROLES.ADMIN) {
            // Restore demo role if altered on the official demo id
            existingAdminDemo.role = ROLES.ADMIN;
            existingAdminDemo.permissions = Object.values(STAFF_PERMISSIONS);
            modified = true;
        }

        // 5. Ensure independent Demo Staff exists (Prompt Bổ Sung Đợt 8)
        const existingStaffDemo = users.find(u => u.username === DEMO_STAFF.username || u.id === DEMO_STAFF.id);
        if (!existingStaffDemo) {
            users.push({ ...DEMO_STAFF, permissions: [...DEFAULT_STAFF_PERMISSIONS] });
            modified = true;
        } else if (existingStaffDemo.id === DEMO_STAFF.id && existingStaffDemo.role !== ROLES.STAFF) {
            existingStaffDemo.role = ROLES.STAFF;
            if (!Array.isArray(existingStaffDemo.permissions) || existingStaffDemo.permissions.length === 0) {
                existingStaffDemo.permissions = [...DEFAULT_STAFF_PERMISSIONS];
            }
            modified = true;
        }

        // Save normalized / seeded data back if changed
        if (modified) {
            try {
                localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
            } catch (e) {
                console.error('[auth-guard] Failed to persist migrated users:', e);
            }
        }

        return users;
    }

    /**
     * Save users array to localStorage safely.
     */
    function saveUsers(users) {
        if (!Array.isArray(users)) return false;
        try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
            return true;
        } catch (e) {
            console.error('[auth-guard] Error saving users to localStorage:', e);
            return false;
        }
    }

    /**
     * Invalidate session for a specific user ID if active.
     */
    function invalidateUserSession(userId) {
        if (!userId) return;
        try {
            const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
            const rawLocal = localStorage.getItem(SESSION_STORAGE_KEY);
            const currentSession = rawSession ? JSON.parse(rawSession) : (rawLocal ? JSON.parse(rawLocal) : null);
            if (currentSession && String(currentSession.id) === String(userId)) {
                logout();
            }
        } catch (e) {}
    }

    /**
     * Get active current user session (from sessionStorage or localStorage).
     * Synchronizes live role/status against master bmw_users list.
     * Automatically invalidates session if account is banned or locked.
     */
    function getCurrentUser() {
        let session = null;
        let isSessionStorage = false;

        try {
            const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
            const rawLocal = localStorage.getItem(SESSION_STORAGE_KEY);

            if (rawSession) {
                session = JSON.parse(rawSession);
                isSessionStorage = true;
            } else if (rawLocal) {
                session = JSON.parse(rawLocal);
                isSessionStorage = false;
            }
        } catch (e) {
            console.error('[auth-guard] Corrupted session data:', e);
            logout();
            return null;
        }

        if (!session || typeof session !== 'object' || !session.id) {
            return null;
        }

        // Validate session against live bmw_users record if present
        const users = getUsers();
        const liveUser = users.find(u => 
            String(u.id) === String(session.id) || 
            (u.username && session.username && u.username.toLowerCase() === session.username.toLowerCase()) ||
            (u.email && session.email && u.email.toLowerCase() === session.email.toLowerCase())
        );

        if (liveUser) {
            if (liveUser.status === STATUS.BANNED || liveUser.status === STATUS.LOCKED) {
                // User is banned or locked -> kick out immediately
                logout();
                return null;
            }

            // Sync live attributes into session object without overriding session storage type
            session.role        = liveUser.role || ROLES.CUSTOMER;
            session.status      = liveUser.status || STATUS.ACTIVE;
            session.permissions = Array.isArray(liveUser.permissions) ? liveUser.permissions : [];
            session.fullName    = liveUser.fullName || session.fullName || '';
            session.username    = liveUser.username || session.username || '';
            session.email       = liveUser.email || session.email || '';
            session.phone       = liveUser.phone || session.phone || '';
            session.address     = liveUser.address !== undefined ? liveUser.address : (session.address || '');
            session.dob         = liveUser.dob !== undefined ? liveUser.dob : (session.dob || '');
            session.avatar      = liveUser.avatar !== undefined ? liveUser.avatar : (session.avatar || '');
            session.linkedGmail = liveUser.linkedGmail !== undefined ? liveUser.linkedGmail : (session.linkedGmail || null);
        } else {
            if (session.status === STATUS.BANNED || session.status === STATUS.LOCKED) {
                logout();
                return null;
            }
            if (!session.role) session.role = ROLES.CUSTOMER;
            if (!session.status) session.status = STATUS.ACTIVE;
            if (!session.permissions) session.permissions = [];
        }

        return session;
    }

    /**
     * Check if a user is authenticated.
     */
    function isAuthenticated() {
        return Boolean(getCurrentUser());
    }

    /**
     * Check if current user has any of the required roles.
     * @param {string|string[]} roles - Role or array of roles (e.g. 'admin' or ['admin', 'staff'])
     */
    function hasRole(roles) {
        const user = getCurrentUser();
        if (!user) return false;

        const allowed = Array.isArray(roles) ? roles : [roles];
        return allowed.includes(user.role);
    }

    /**
     * Check granular permission for current user.
     * Admins always have all permissions.
     * Staff must have the specific permission in their permissions array.
     */
    function checkPermission(permission) {
        const user = getCurrentUser();
        if (!user) return false;
        if (user.role === ROLES.ADMIN) return true;
        if (user.role === ROLES.STAFF) {
            return Array.isArray(user.permissions) && user.permissions.includes(permission);
        }
        return false;
    }

    /**
     * Guard route: require user to be logged in.
     * If not, saves return URL and redirects to login page.
     */
    function requireAuth(redirectUrl = 'login.html') {
        const user = getCurrentUser();
        if (!user) {
            try {
                sessionStorage.setItem(RETURN_URL_KEY, window.location.pathname + window.location.search);
            } catch (e) {}
            window.location.replace(redirectUrl);
            return false;
        }
        return true;
    }

    /**
     * Guard route: require specific role (e.g. admin or staff).
     * If not logged in -> redirect to login.html with returnUrl.
     * If logged in but role unauthorized (e.g. customer) -> redirect to redirectUrl (default: index.html).
     */
    function requireRole(allowedRoles, redirectUrl = 'index.html') {
        const user = getCurrentUser();
        if (!user) {
            try {
                sessionStorage.setItem(RETURN_URL_KEY, window.location.pathname + window.location.search);
            } catch (e) {}
            window.location.replace('login.html');
            return false;
        }

        const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!allowed.includes(user.role)) {
            console.warn(`[auth-guard] Access Denied: User role "${user.role}" does not have required permissions:`, allowed);
            try {
                if (window.self === window.top && typeof alert === 'function') {
                    alert('Bạn không có quyền truy cập trang này. Đang chuyển về trang phù hợp.');
                }
            } catch (e) {}
            // Route smartly based on user role
            if (user.role === ROLES.STAFF) {
                window.location.replace('staff-dashboard.html');
            } else {
                window.location.replace(redirectUrl);
            }
            return false;
        }

        return true;
    }

    /**
     * Rule: Last Admin Protection.
     * Checks if target user is the only active official admin remaining in system.
     * Demo accounts (isDemo === true) are excluded from the official admin count.
     */
    function isLastActiveAdmin(userId) {
        if (!userId) return false;
        const users = getUsers();
        const activeAdmins = users.filter(u => u.role === ROLES.ADMIN && u.status === STATUS.ACTIVE && !u.isDemo);
        return activeAdmins.length === 1 && String(activeAdmins[0].id) === String(userId);
    }

    /**
     * Validate whether an admin can have their role changed or account deactivated.
     */
    function validateAdminChange(userId, newRole = null, newStatus = null) {
        const users = getUsers();
        const target = users.find(u => String(u.id) === String(userId));
        if (!target) return { allowed: false, message: 'Người dùng không tồn tại.' };

        if (target.role === ROLES.ADMIN) {
            const isDemoting = newRole !== null && newRole !== ROLES.ADMIN;
            const isDeactivating = newStatus !== null && newStatus !== STATUS.ACTIVE;

            if ((isDemoting || isDeactivating) && isLastActiveAdmin(userId)) {
                return {
                    allowed: false,
                    message: 'Không thể hạ quyền hoặc khóa tài khoản Quản trị viên (Admin) duy nhất còn hoạt động trong hệ thống!'
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Query order history for a specific user from bmw_orders.
     */
    function getUserOrders(userId, username = '') {
        try {
            const raw = localStorage.getItem('bmw_orders');
            if (!raw) return [];
            const orders = JSON.parse(raw);
            if (!Array.isArray(orders)) return [];
            return orders.filter(o => {
                if (!o) return false;
                const matchesId = userId && o.userId && String(o.userId) === String(userId);
                const matchesAccount = username && o.userAccount && o.userAccount.toLowerCase() === username.toLowerCase();
                return matchesId || matchesAccount;
            });
        } catch (e) {
            console.error('[auth-guard] Error getting user orders:', e);
            return [];
        }
    }

    /**
     * Safe deletion check:
     * - Cannot delete last active admin
     * - Priority to deactivate (lock) instead of hard delete if user has order history
     */
    function canDeleteUser(userId) {
        if (!userId) return { allowed: false, message: 'ID người dùng không hợp lệ.' };
        const users = getUsers();
        const user = users.find(u => String(u.id) === String(userId));
        if (!user) return { allowed: false, message: 'Không tìm thấy người dùng.' };

        if (user.role === ROLES.ADMIN && isLastActiveAdmin(userId)) {
            return {
                allowed: false,
                isLastAdmin: true,
                hasOrders: false,
                orderCount: 0,
                message: 'Không thể xóa Quản trị viên (Admin) duy nhất còn hoạt động trong hệ thống!'
            };
        }

        const orders = getUserOrders(user.id, user.username);
        if (orders.length > 0) {
            return {
                allowed: false,
                isLastAdmin: false,
                hasOrders: true,
                orderCount: orders.length,
                message: `Tài khoản có ${orders.length} đơn hàng liên kết. Hệ thống ưu tiên Vô hiệu hóa (khóa) tài khoản để bảo toàn dữ liệu lịch sử đơn hàng!`
            };
        }

        return { allowed: true, isLastAdmin: false, hasOrders: false, orderCount: 0 };
    }

    /**
     * Audit Log System: Write an entry to bmw_audit_logs.
     */
    function logAuditEvent(action, targetUser, details, actor = null) {
        try {
            const currentActor = actor || getCurrentUser() || { id: 'admin_001', username: 'admin', role: ROLES.ADMIN };
            const rawLogs = localStorage.getItem(AUDIT_STORAGE_KEY);
            let logs = [];
            if (rawLogs) {
                try { logs = JSON.parse(rawLogs); } catch (e) { logs = []; }
            }
            if (!Array.isArray(logs)) logs = [];

            const entry = {
                id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                timestamp: new Date().toISOString(),
                actor: {
                    id: currentActor.id || 'unknown',
                    username: currentActor.username || 'unknown',
                    role: currentActor.role || 'unknown'
                },
                action: action || 'UNKNOWN_ACTION',
                targetUser: targetUser ? {
                    id: targetUser.id || '',
                    username: targetUser.username || '',
                    role: targetUser.role || ''
                } : null,
                details: details || ''
            };

            logs.unshift(entry);
            if (logs.length > 200) logs = logs.slice(0, 200);
            localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
            return entry;
        } catch (e) {
            console.error('[auth-guard] Error writing audit log:', e);
            return null;
        }
    }

    /**
     * Read audit logs.
     */
    function getAuditLogs() {
        try {
            const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.error('[auth-guard] Error reading audit logs:', e);
        }
        return [];
    }

    /**
     * Toggle lock status of a user account.
     */
    function toggleLockUser(userId, actor = null) {
        const users = getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index === -1) return { success: false, message: 'Không tìm thấy người dùng.' };

        const target = users[index];
        const willLock = target.status === STATUS.ACTIVE;

        if (willLock && target.role === ROLES.ADMIN && isLastActiveAdmin(userId)) {
            return {
                success: false,
                message: 'Không thể khóa Quản trị viên (Admin) duy nhất còn hoạt động trong hệ thống!'
            };
        }

        const newStatus = willLock ? STATUS.LOCKED : STATUS.ACTIVE;
        target.status = newStatus;
        target.updatedAt = new Date().toISOString();
        saveUsers(users);

        if (willLock) {
            invalidateUserSession(userId);
        }

        logAuditEvent(
            willLock ? 'LOCK_USER' : 'UNLOCK_USER',
            target,
            `${willLock ? 'Khóa' : 'Mở khóa'} tài khoản @${target.username} (${target.fullName})`,
            actor
        );

        return { success: true, user: target, newStatus };
    }

    /**
     * Safe deactivation of a user account.
     */
    function deactivateUser(userId, reason = '', actor = null) {
        const users = getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index === -1) return { success: false, message: 'Không tìm thấy người dùng.' };

        const target = users[index];
        if (target.role === ROLES.ADMIN && isLastActiveAdmin(userId)) {
            return {
                success: false,
                message: 'Không thể vô hiệu hóa Quản trị viên (Admin) duy nhất còn hoạt động!'
            };
        }

        target.status = STATUS.LOCKED;
        target.updatedAt = new Date().toISOString();
        target.deactivatedReason = reason || 'Vô hiệu hóa an toàn bởi quản trị viên';
        saveUsers(users);

        invalidateUserSession(userId);

        logAuditEvent(
            'DEACTIVATE_USER',
            target,
            `Vô hiệu hóa tài khoản @${target.username}. Lý do: ${target.deactivatedReason}`,
            actor
        );

        return { success: true, user: target };
    }

    /**
     * Hard delete of a user account (only if no orders and not last admin).
     */
    function deleteUser(userId, actor = null) {
        const check = canDeleteUser(userId);
        if (!check.allowed) {
            return { success: false, message: check.message, hasOrders: check.hasOrders };
        }

        const users = getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index === -1) return { success: false, message: 'Không tìm thấy người dùng.' };

        const target = users[index];
        users.splice(index, 1);
        saveUsers(users);

        invalidateUserSession(userId);

        logAuditEvent(
            'DELETE_USER',
            target,
            `Xóa vĩnh viễn tài khoản @${target.username} (${target.fullName})`,
            actor
        );

        return { success: true, user: target };
    }

    /**
     * Create a new Staff account with required validations & granular permissions.
     */
    function createStaffAccount(staffData, actor = null) {
        const currentActor = actor || getCurrentUser();
        if (!currentActor || currentActor.role !== ROLES.ADMIN) {
            return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền tạo tài khoản Nhân viên!' };
        }

        if (!staffData || typeof staffData !== 'object') {
            return { success: false, message: 'Dữ liệu không hợp lệ.' };
        }

        const fullName = (staffData.fullName || '').trim();
        const username = (staffData.username || '').trim().toLowerCase();
        const email = (staffData.email || '').trim().toLowerCase();
        const phone = (staffData.phone || '').trim();
        const password = staffData.password || '';
        const address = (staffData.address || '').trim();
        const dob = (staffData.dob || '').trim();
        const permissions = Array.isArray(staffData.permissions) && staffData.permissions.length > 0
            ? staffData.permissions
            : [...DEFAULT_STAFF_PERMISSIONS];

        // Validation checks
        if (!fullName) return { success: false, field: 'fullName', message: 'Họ và tên không được để trống.' };
        if (!username) return { success: false, field: 'username', message: 'Username không được để trống.' };
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return { success: false, field: 'username', message: 'Username phải từ 3 đến 20 ký tự (chữ cái, số hoặc gạch dưới).' };
        }
        if (!email) return { success: false, field: 'email', message: 'Email không được để trống.' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { success: false, field: 'email', message: 'Định dạng email không hợp lệ.' };
        }
        if (!phone) return { success: false, field: 'phone', message: 'Số điện thoại không được để trống.' };
        if (!/^[0-9+\s-]{9,15}$/.test(phone)) {
            return { success: false, field: 'phone', message: 'Số điện thoại không hợp lệ (từ 9 đến 15 chữ số).' };
        }
        if (!password || password.length < 6) {
            return { success: false, field: 'password', message: 'Mật khẩu phải có tối thiểu 6 ký tự.' };
        }

        const users = getUsers();
        const isDupUsername = users.some(u => u.username && u.username.toLowerCase() === username);
        if (isDupUsername) {
            return { success: false, field: 'username', message: 'Username này đã được sử dụng.' };
        }

        const isDupEmail = users.some(u => 
            (u.email && u.email.toLowerCase() === email) || 
            (u.linkedGmail && u.linkedGmail.email && u.linkedGmail.email.toLowerCase() === email)
        );
        if (isDupEmail) {
            return { success: false, field: 'email', message: 'Email này đã tồn tại trong hệ thống.' };
        }

        const nowIso = new Date().toISOString();
        const newStaff = {
            id: 'staff_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            fullName,
            username,
            email,
            phone,
            password,
            role: ROLES.STAFF,
            status: STATUS.ACTIVE,
            permissions,
            address,
            dob,
            avatar: '',
            linkedGmail: null,
            createdAt: nowIso,
            updatedAt: nowIso
        };

        users.push(newStaff);
        saveUsers(users);

        logAuditEvent(
            'CREATE_STAFF',
            newStaff,
            `Tạo tài khoản nhân viên mới @${username} (${fullName}) với các quyền: ${permissions.join(', ')}`,
            currentActor
        );

        return { success: true, user: newStaff };
    }

    /**
     * Update user account info, role, status, or granular staff permissions.
     */
    function updateUser(userId, updateData, actor = null) {
        const currentActor = actor || getCurrentUser();
        if (!currentActor || currentActor.role !== ROLES.ADMIN) {
            return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền sửa thông tin và phân quyền người dùng!' };
        }

        const users = getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index === -1) return { success: false, message: 'Không tìm thấy người dùng.' };

        const target = users[index];
        const details = [];

        // Role change check
        if (updateData.role && updateData.role !== target.role) {
            const adminCheck = validateAdminChange(userId, updateData.role, null);
            if (!adminCheck.allowed) {
                return { success: false, message: adminCheck.message };
            }
            details.push(`Đổi vai trò: ${target.role} → ${updateData.role}`);
            target.role = updateData.role;
            if (target.role === ROLES.ADMIN) {
                target.permissions = Object.values(STAFF_PERMISSIONS);
            } else if (target.role === ROLES.CUSTOMER) {
                target.permissions = [];
            } else if (target.role === ROLES.STAFF && (!Array.isArray(target.permissions) || target.permissions.length === 0)) {
                target.permissions = [...DEFAULT_STAFF_PERMISSIONS];
            }
        }

        // Status change check
        if (updateData.status && updateData.status !== target.status) {
            const adminCheck = validateAdminChange(userId, null, updateData.status);
            if (!adminCheck.allowed) {
                return { success: false, message: adminCheck.message };
            }
            details.push(`Đổi trạng thái: ${target.status} → ${updateData.status}`);
            target.status = updateData.status;
            if (target.status !== STATUS.ACTIVE) {
                invalidateUserSession(userId);
            }
        }

        // Staff permissions update
        if (target.role === ROLES.STAFF && Array.isArray(updateData.permissions)) {
            target.permissions = updateData.permissions;
            details.push(`Cập nhật quyền: [${target.permissions.join(', ')}]`);
        }

        // Basic attributes
        if (updateData.fullName !== undefined) target.fullName = updateData.fullName.trim();
        if (updateData.phone !== undefined) target.phone = updateData.phone.trim();
        if (updateData.address !== undefined) target.address = updateData.address.trim();
        if (updateData.dob !== undefined) target.dob = updateData.dob.trim();
        if (updateData.avatar !== undefined) target.avatar = updateData.avatar;
        if (updateData.password && updateData.password.trim()) {
            target.password = updateData.password.trim();
            details.push('Đặt lại mật khẩu');
        }

        target.updatedAt = new Date().toISOString();
        saveUsers(users);

        logAuditEvent(
            'UPDATE_USER',
            target,
            details.length > 0 ? details.join('; ') : `Cập nhật thông tin tài khoản @${target.username}`,
            currentActor
        );

        return { success: true, user: target };
    }

    /**
     * Logout helper: clears session and active flags.
     */
    function logout() {
        try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(SESSION_STORAGE_KEY);
            sessionStorage.removeItem(RETURN_URL_KEY);
        } catch (e) {}
        return true;
    }

    // Auto-run migration & seeding on load
    getUsers();

    // Check data-require-role or data-require-auth on current script tag if present
    document.addEventListener('DOMContentLoaded', () => {
        const currentScript = document.querySelector('script[src*="auth-guard.js"]');
        if (currentScript) {
            const requiredRoleAttr = currentScript.getAttribute('data-require-role');
            const requireAuthAttr = currentScript.getAttribute('data-require-auth');

            if (requiredRoleAttr) {
                const roles = requiredRoleAttr.split(',').map(s => s.trim());
                requireRole(roles);
            } else if (requireAuthAttr === 'true') {
                requireAuth();
            }
        }
    });

    // Public API
    window.BMW_AUTH_GUARD = {
        ROLES,
        STATUS,
        STAFF_PERMISSIONS,
        DEFAULT_STAFF_PERMISSIONS,
        DEMO_ADMIN,
        DEMO_STAFF,
        DEMO_ACCOUNTS: Object.freeze({
            admin: DEMO_ADMIN,
            staff: DEMO_STAFF
        }),
        getUsers,
        saveUsers,
        getCurrentUser,
        isAuthenticated,
        hasRole,
        checkPermission,
        requireAuth,
        requireRole,
        isLastActiveAdmin,
        validateAdminChange,
        getUserOrders,
        canDeleteUser,
        toggleLockUser,
        deactivateUser,
        deleteUser,
        createStaffAccount,
        updateUser,
        logAuditEvent,
        getAuditLogs,
        logout,
        invalidateUserSession,
        seedDefaults: getUsers
    };

})(window);
