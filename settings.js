/**
 * js/settings.js — BMW GYM System Settings & Safe Storefront Configuration API
 * Phase 8.7: Store Info, Contact, Inventory Thresholds, UI Options & RBAC Protection.
 */

(function () {
    'use strict';

    const SETTINGS_STORAGE_KEY = 'bmw_system_settings';

    // ── 1. Default System Configuration ─────────────────────────────────────
    const DEFAULT_SETTINGS = {
        storeName: 'BMW GYM STORE',
        tagline: 'Built to move. Made to endure.',
        address: 'Tòa nhà BMW GYM Center, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh',
        phone: '0901 234 567',
        email: 'contact@bmwgym.vn',
        businessHours: '06:00 - 22:00 (Thứ 2 - Chủ Nhật)',
        websiteCopyright: '© 2026 BMW GYM Sportswear & Fitness. All rights reserved.',
        lowStockThreshold: 15,
        outOfStockThreshold: 0,
        itemsPerPage: 6,
        announcementBanner: 'Chào mừng bạn đến với BMW GYM — Tặng voucher giảm 10% cho đơn hàng đầu tiên!',
        enableAnnouncement: true,
        maintenanceMode: false,
        updatedAt: '2026-10-19T20:00:00.000Z',
        updatedBy: 'system'
    };

    // ── 2. Get Settings (With Automatic Sync & Fallback) ─────────────────────
    function getSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
            let parsed = raw ? JSON.parse(raw) : {};
            
            // Sync with BMW_PRODUCTS_API if threshold exists there
            if (window.BMW_PRODUCTS_API && typeof window.BMW_PRODUCTS_API.getLowStockThreshold === 'function') {
                const prodThreshold = window.BMW_PRODUCTS_API.getLowStockThreshold();
                if (typeof prodThreshold === 'number' && !parsed.lowStockThreshold) {
                    parsed.lowStockThreshold = prodThreshold;
                }
            }

            return { ...DEFAULT_SETTINGS, ...parsed };
        } catch (e) {
            console.error('Failed to load system settings from localStorage:', e);
            return { ...DEFAULT_SETTINGS };
        }
    }

    // ── 3. Save Settings (Admin Role-Restricted) ─────────────────────────────
    function saveSettings(newSettings, callerUser) {
        // RBAC Enforcement: Only Admin can modify system settings
        if (!callerUser || callerUser.role !== 'admin') {
            return {
                success: false,
                message: 'Chỉ Quản trị viên (Admin) mới có quyền thay đổi Cài đặt hệ thống.'
            };
        }

        if (!newSettings || typeof newSettings !== 'object') {
            return {
                success: false,
                message: 'Dữ liệu cài đặt không hợp lệ.'
            };
        }

        // Field Validations
        const cleanStoreName = (newSettings.storeName || '').trim();
        if (!cleanStoreName) {
            return { success: false, message: 'Tên cửa hàng không được để trống.' };
        }

        const cleanPhone = (newSettings.phone || '').trim();
        if (!cleanPhone || cleanPhone.length < 8) {
            return { success: false, message: 'Số điện thoại liên hệ không hợp lệ (tối thiểu 8 ký tự).' };
        }

        const cleanEmail = (newSettings.email || '').trim();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            return { success: false, message: 'Email liên hệ không hợp lệ.' };
        }

        const cleanAddress = (newSettings.address || '').trim();
        if (!cleanAddress) {
            return { success: false, message: 'Địa chỉ cửa hàng không được để trống.' };
        }

        let lowStockThreshold = parseInt(newSettings.lowStockThreshold, 10);
        if (isNaN(lowStockThreshold) || lowStockThreshold < 1) {
            return { success: false, message: 'Ngưỡng cảnh báo tồn kho phải là số nguyên dương (≥ 1).' };
        }

        let itemsPerPage = parseInt(newSettings.itemsPerPage, 10);
        if (isNaN(itemsPerPage) || itemsPerPage < 1 || itemsPerPage > 50) {
            itemsPerPage = 6;
        }

        const current = getSettings();
        const updated = {
            ...current,
            storeName: cleanStoreName,
            tagline: (newSettings.tagline || current.tagline).trim(),
            address: cleanAddress,
            phone: cleanPhone,
            email: cleanEmail,
            businessHours: (newSettings.businessHours || current.businessHours).trim(),
            websiteCopyright: (newSettings.websiteCopyright || current.websiteCopyright).trim(),
            lowStockThreshold: lowStockThreshold,
            outOfStockThreshold: 0,
            itemsPerPage: itemsPerPage,
            announcementBanner: (newSettings.announcementBanner || '').trim(),
            enableAnnouncement: Boolean(newSettings.enableAnnouncement),
            maintenanceMode: Boolean(newSettings.maintenanceMode),
            updatedAt: new Date().toISOString(),
            updatedBy: callerUser.username || callerUser.email || 'admin'
        };

        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

            // Sync lowStockThreshold to BMW_PRODUCTS_API
            if (window.BMW_PRODUCTS_API && typeof window.BMW_PRODUCTS_API.setLowStockThreshold === 'function') {
                window.BMW_PRODUCTS_API.setLowStockThreshold(lowStockThreshold, callerUser);
            }

            return {
                success: true,
                settings: updated,
                message: 'Cập nhật Cài đặt hệ thống thành công!'
            };
        } catch (e) {
            console.error('Failed to save bmw_system_settings:', e);
            return {
                success: false,
                message: 'Lỗi khi lưu cấu hình vào LocalStorage.'
            };
        }
    }

    // ── 4. Reset Defaults (Admin Role-Restricted) ────────────────────────────
    function resetDefaults(callerUser) {
        if (!callerUser || callerUser.role !== 'admin') {
            return {
                success: false,
                message: 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục cài đặt mặc định.'
            };
        }

        try {
            const resetObj = {
                ...DEFAULT_SETTINGS,
                updatedAt: new Date().toISOString(),
                updatedBy: callerUser.username || callerUser.email || 'admin'
            };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(resetObj));

            if (window.BMW_PRODUCTS_API && typeof window.BMW_PRODUCTS_API.setLowStockThreshold === 'function') {
                window.BMW_PRODUCTS_API.setLowStockThreshold(resetObj.lowStockThreshold, callerUser);
            }

            return {
                success: true,
                settings: resetObj,
                message: 'Đã khôi phục toàn bộ cài đặt về mặc định!'
            };
        } catch (e) {
            return {
                success: false,
                message: 'Lỗi khi khôi phục cài đặt.'
            };
        }
    }

    // ── 5. Safe Storefront UI Sync Helper ───────────────────────────────────
    function applyStorefrontSettings() {
        const s = getSettings();

        // Safe DOM updates if elements exist on storefront/footer
        const storeNameEls = document.querySelectorAll('[data-bind-setting="storeName"]');
        storeNameEls.forEach(el => { el.textContent = s.storeName; });

        const phoneEls = document.querySelectorAll('[data-bind-setting="phone"]');
        phoneEls.forEach(el => {
            el.textContent = s.phone;
            if (el.tagName === 'A') el.href = `tel:${s.phone.replace(/[^0-9+]/g, '')}`;
        });

        const emailEls = document.querySelectorAll('[data-bind-setting="email"]');
        emailEls.forEach(el => {
            el.textContent = s.email;
            if (el.tagName === 'A') el.href = `mailto:${s.email}`;
        });

        const addressEls = document.querySelectorAll('[data-bind-setting="address"]');
        addressEls.forEach(el => { el.textContent = s.address; });

        const copyrightEls = document.querySelectorAll('[data-bind-setting="copyright"]');
        copyrightEls.forEach(el => { el.textContent = s.websiteCopyright; });

        const hoursEls = document.querySelectorAll('[data-bind-setting="hours"]');
        hoursEls.forEach(el => { el.textContent = s.businessHours; });

        // Announcement banner if present
        const bannerEl = document.getElementById('store-announcement-bar');
        if (bannerEl) {
            if (s.enableAnnouncement && s.announcementBanner) {
                bannerEl.style.display = 'block';
                const textEl = bannerEl.querySelector('.announcement-text') || bannerEl;
                textEl.textContent = s.announcementBanner;
            } else {
                bannerEl.style.display = 'none';
            }
        }
    }

    // ── 6. Export Global API ────────────────────────────────────────────────
    if (typeof window !== 'undefined') {
        window.BMW_SETTINGS_API = {
            DEFAULT_SETTINGS: DEFAULT_SETTINGS,
            getSettings: getSettings,
            saveSettings: saveSettings,
            resetDefaults: resetDefaults,
            applyStorefrontSettings: applyStorefrontSettings
        };

        // Auto apply if DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyStorefrontSettings);
        } else {
            applyStorefrontSettings();
        }
    }
})();
