/**
 * BMW GYM - Promotion & Coupon Management System (Phase 8.6)
 * File: js/promotions.js
 * 
 * Shared engine between Admin, Homepage (index.html), Cart & Checkout.
 * Manages auto-generation, validation, redemption and refund of coupon codes.
 */

(function (window) {
    'use strict';

    const PROMOTIONS_STORAGE_KEY = 'bmw_promotions';

    // Promotion Types
    const PROMO_TYPES = Object.freeze({
        SPECIAL: 'SPECIAL',   // Đặc biệt (VIP/Tri ân)
        STANDARD: 'STANDARD', // Thông dụng (Public)
        LIMITED: 'LIMITED'    // Giới hạn (Flash Sale)
    });

    // Promotion Statuses
    const PROMO_STATUS = Object.freeze({
        DRAFT: 'DRAFT',               // Bản nháp
        UPCOMING: 'UPCOMING',         // Sắp diễn ra
        ACTIVE: 'ACTIVE',             // Đang hiệu lực
        EXPIRED: 'EXPIRED',           // Hết hiệu lực
        OUT_OF_STOCK: 'OUT_OF_STOCK', // Hết lượt sử dụng
        DISABLED: 'DISABLED'          // Đã tắt thủ công
    });

    // Scope Types
    const PROMO_SCOPES = Object.freeze({
        ALL: 'ALL',
        CATEGORY: 'CATEGORY'
    });

    // ── 1. Code Validation & Generation Engine ──────────────────────────────
    /**
     * Quy tắc định dạng mã (Requirement A.1 & A.2):
     * - Đúng chính xác 6 ký tự
     * - Gồm đúng 4 chữ cái A-Z viết hoa và đúng 2 chữ số 0-9
     * - Không chứa khoảng trắng hay ký tự đặc biệt
     * - Ví dụ: AB12CD, X7Y2KL, MN4P8Q
     */
    function isValidCouponFormat(code) {
        if (!code || typeof code !== 'string') return false;
        const trimmed = code.trim();
        if (trimmed.length !== 6) return false;
        if (!/^[A-Z0-9]{6}$/.test(trimmed)) return false;

        const letterMatches = trimmed.match(/[A-Z]/g);
        const digitMatches = trimmed.match(/[0-9]/g);

        const letterCount = letterMatches ? letterMatches.length : 0;
        const digitCount = digitMatches ? digitMatches.length : 0;

        return letterCount === 4 && digitCount === 2;
    }

    /**
     * Sinh một mã ngẫu nhiên tuân thủ đúng 4 chữ cái A-Z và 2 chữ số 0-9.
     */
    function generateSingleRawCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const digits = '0123456789';

        // 4 chữ cái
        const picked = [];
        for (let i = 0; i < 4; i++) {
            picked.push(letters.charAt(Math.floor(Math.random() * letters.length)));
        }
        // 2 chữ số
        for (let i = 0; i < 2; i++) {
            picked.push(digits.charAt(Math.floor(Math.random() * digits.length)));
        }

        // Trộn ngẫu nhiên (Fisher-Yates)
        for (let i = picked.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [picked[i], picked[j]] = [picked[j], picked[i]];
        }

        return picked.join('');
    }

    /**
     * Sinh mã ngẫu nhiên duy nhất, kiểm tra trùng lặp với storage và tự sinh lại (Requirement A.4).
     */
    function generateCouponCode(existingCodes = []) {
        const promos = getRawPromotions();
        const takenCodes = new Set(existingCodes.map(c => String(c).toUpperCase()));

        promos.forEach(p => {
            if (p.code) takenCodes.add(p.code.toUpperCase());
            if (Array.isArray(p.codes)) {
                p.codes.forEach(c => takenCodes.add(String(c).toUpperCase()));
            }
        });

        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            const candidate = generateSingleRawCode();
            if (!takenCodes.has(candidate)) {
                return candidate;
            }
        }
        // Fallback guaranteed random
        return 'BM' + Math.floor(10 + Math.random() * 89) + 'W' + 'X';
    }

    /**
     * Sinh số lượng lớn mã đảm bảo tất cả mã đều duy nhất (Requirement A.5).
     */
    function generateUniqueBatchCodes(count = 1) {
        const result = [];
        for (let i = 0; i < count; i++) {
            const code = generateCouponCode(result);
            result.push(code);
        }
        return result;
    }

    // ── 2. Seed Data ────────────────────────────────────────────────────────
    const DEFAULT_PROMOTIONS = [
        {
            id: 'promo_seed_001',
            name: 'SIÊU SALE CHÀO MÙA 2026',
            type: PROMO_TYPES.SPECIAL,
            code: 'BMW26S',
            codes: ['BMW26S'],
            discountPercent: 15,
            description: 'Giảm 15% toàn bộ sản phẩm trang phục và thiết bị thể thao BMW GYM',
            scope: PROMO_SCOPES.ALL,
            category: 'ALL',
            usageLimit: 100,
            usedCount: 14,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.000Z',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
            id: 'promo_seed_002',
            name: 'ƯU ĐÃI DỤNG CỤ TẬP THỂ HÌNH',
            type: PROMO_TYPES.STANDARD,
            code: 'EQ26PL',
            codes: ['EQ26PL'],
            discountPercent: 20,
            description: 'Giảm ngay 20% khi mua các dụng cụ và thiết bị luyện tập (Equipment)',
            scope: PROMO_SCOPES.CATEGORY,
            category: 'Equipment',
            usageLimit: 50,
            usedCount: 8,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.000Z',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
            id: 'promo_seed_003',
            name: 'FASHION WORKOUT GEAR',
            type: PROMO_TYPES.STANDARD,
            code: 'CL26WT',
            codes: ['CL26WT'],
            discountPercent: 10,
            description: 'Giảm 10% cho các sản phẩm trang phục thể thao cao cấp (Clothing)',
            scope: PROMO_SCOPES.CATEGORY,
            category: 'Clothing',
            usageLimit: 100,
            usedCount: 5,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.000Z',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
            id: 'promo_seed_004',
            name: 'FLASH SALE GIỜ VÀNG (ĐÃ KẾT THÚC)',
            type: PROMO_TYPES.LIMITED,
            code: 'FL26EX',
            codes: ['FL26EX'],
            discountPercent: 30,
            description: 'Chương trình Flash Sale tri ân giờ vàng đã kết thúc',
            scope: PROMO_SCOPES.ALL,
            category: 'ALL',
            usageLimit: 20,
            usedCount: 15,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-02-01T23:59:59.000Z', // Quá hạn
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
            id: 'promo_seed_005',
            name: 'TRI ÂN KHÁCH HÀNG VIP (HẾT LƯỢT)',
            type: PROMO_TYPES.SPECIAL,
            code: 'VP26LT',
            codes: ['VP26LT'],
            discountPercent: 50,
            description: 'Voucher đặc biệt 50% số lượng giới hạn đã hết lượt sử dụng',
            scope: PROMO_SCOPES.ALL,
            category: 'ALL',
            usageLimit: 10,
            usedCount: 10, // Hết lượt
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.000Z',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
            id: 'promo_seed_006',
            name: 'KHUYẾN MÃI MÙA ĐÔNG (SẮP DIỄN RA)',
            type: PROMO_TYPES.STANDARD,
            code: 'WN26WT',
            codes: ['WN26WT'],
            discountPercent: 25,
            description: 'Chương trình mùa đông khởi động vào tháng 12/2026',
            scope: PROMO_SCOPES.ALL,
            category: 'ALL',
            usageLimit: 100,
            usedCount: 0,
            startDate: '2026-12-01T00:00:00.000Z', // Tương lai
            endDate: '2026-12-31T23:59:59.000Z',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }
    ];

    // ── 3. Internal Storage Helpers ─────────────────────────────────────────
    function getRawPromotions() {
        try {
            const raw = localStorage.getItem(PROMOTIONS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('[promotions] Error parsing bmw_promotions:', e);
        }
        // Seed if missing
        saveRawPromotions(DEFAULT_PROMOTIONS);
        return [...DEFAULT_PROMOTIONS];
    }

    function saveRawPromotions(list) {
        if (!Array.isArray(list)) return false;
        try {
            localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            console.error('[promotions] Error saving bmw_promotions:', e);
            return false;
        }
    }

    // ── 4. Dynamic Status Computation ───────────────────────────────────────
    /**
     * Tính toán trạng thái thực tế dựa theo thời gian và số lượt (Requirement B & C).
     */
    function computePromotionStatus(promo, now = new Date()) {
        if (!promo) return PROMO_STATUS.DISABLED;
        if (promo.isActive === false) {
            return PROMO_STATUS.DISABLED;
        }
        if (promo.isDraft === true || promo.status === PROMO_STATUS.DRAFT) {
            return PROMO_STATUS.DRAFT;
        }

        const usageLimit = parseInt(promo.usageLimit, 10) || 0;
        const usedCount = parseInt(promo.usedCount, 10) || 0;
        if (usageLimit > 0 && usedCount >= usageLimit) {
            return PROMO_STATUS.OUT_OF_STOCK;
        }

        const start = promo.startDate ? new Date(promo.startDate) : null;
        const end = promo.endDate ? new Date(promo.endDate) : null;
        const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

        if (start && start.getTime() > currentTime) {
            return PROMO_STATUS.UPCOMING;
        }

        if (end && end.getTime() < currentTime) {
            return PROMO_STATUS.EXPIRED;
        }

        return PROMO_STATUS.ACTIVE;
    }

    // ── 5. CRUD API ─────────────────────────────────────────────────────────
    function getPromotions(options = {}) {
        const raw = getRawPromotions();
        const now = options.now ? new Date(options.now) : new Date();

        return raw.map(p => {
            const remaining = Math.max(0, (parseInt(p.usageLimit, 10) || 0) - (parseInt(p.usedCount, 10) || 0));
            const computedStatus = computePromotionStatus(p, now);
            return {
                ...p,
                remainingCount: remaining,
                computedStatus: computedStatus
            };
        });
    }

    function getPromotionById(id) {
        if (!id) return null;
        const promos = getPromotions();
        return promos.find(p => String(p.id) === String(id)) || null;
    }

    function getPromotionByCode(code) {
        if (!code) return null;
        const search = String(code).trim().toUpperCase();
        const promos = getPromotions();
        return promos.find(p => {
            if (p.code && p.code.toUpperCase() === search) return true;
            if (Array.isArray(p.codes) && p.codes.some(c => String(c).toUpperCase() === search)) return true;
            return false;
        }) || null;
    }

    /**
     * Tạo chương trình khuyến mãi mới (Admin Form - Requirement B).
     */
    function createPromotion(data, actor = null) {
        if (!data || typeof data !== 'object') {
            return { success: false, message: 'Dữ liệu khuyến mãi không hợp lệ.' };
        }

        const name = (data.name || '').trim();
        if (!name) {
            return { success: false, field: 'name', message: 'Tên chương trình khuyến mãi không được để trống.' };
        }

        // Validate percent: > 0 và <= 100
        const discountPercent = parseFloat(data.discountPercent);
        if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
            return { success: false, field: 'discountPercent', message: 'Mức giảm phải lớn hơn 0% và không vượt quá 100%.' };
        }

        // Validate usage limit: số nguyên dương
        const usageLimit = parseInt(data.usageLimit, 10);
        if (isNaN(usageLimit) || usageLimit <= 0) {
            return { success: false, field: 'usageLimit', message: 'Số lượng mã phát hành phải là số nguyên dương lớn hơn 0.' };
        }

        // Validate Dates: Ngày kết thúc không được trước ngày bắt đầu
        if (!data.startDate || !data.endDate) {
            return { success: false, field: 'dates', message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc.' };
        }

        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return { success: false, field: 'dates', message: 'Định dạng ngày tháng không hợp lệ.' };
        }

        if (end.getTime() < start.getTime()) {
            return { success: false, field: 'endDate', message: 'Ngày kết thúc không được trước ngày bắt đầu.' };
        }

        // Code auto-generation or verification
        let code = data.code ? String(data.code).trim().toUpperCase() : '';
        if (code) {
            if (!isValidCouponFormat(code)) {
                return {
                    success: false,
                    field: 'code',
                    message: 'Mã coupon phải gồm chính xác 6 ký tự (4 chữ cái A-Z và 2 chữ số 0-9, ví dụ: AB12CD).'
                };
            }
            const existing = getPromotionByCode(code);
            if (existing) {
                return { success: false, field: 'code', message: `Mã "${code}" đã tồn tại trong hệ thống. Vui lòng sinh mã khác.` };
            }
        } else {
            code = generateCouponCode();
        }

        const type = [PROMO_TYPES.SPECIAL, PROMO_TYPES.STANDARD, PROMO_TYPES.LIMITED].includes(data.type)
            ? data.type
            : PROMO_TYPES.STANDARD;

        const scope = data.scope === PROMO_SCOPES.CATEGORY ? PROMO_SCOPES.CATEGORY : PROMO_SCOPES.ALL;
        const category = scope === PROMO_SCOPES.CATEGORY ? (data.category || 'Clothing') : 'ALL';

        const nowIso = new Date().toISOString();
        const newPromo = {
            id: 'promo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: name,
            type: type,
            code: code,
            codes: [code],
            discountPercent: Math.round(discountPercent),
            description: (data.description || '').trim(),
            scope: scope,
            category: category,
            usageLimit: usageLimit,
            usedCount: 0,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            status: data.isDraft ? PROMO_STATUS.DRAFT : PROMO_STATUS.ACTIVE,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
            createdAt: nowIso,
            updatedAt: nowIso
        };

        const promos = getRawPromotions();
        promos.unshift(newPromo);
        saveRawPromotions(promos);

        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.logAuditEvent === 'function') {
            window.BMW_AUTH_GUARD.logAuditEvent(
                'CREATE_PROMOTION',
                { username: code, role: 'coupon' },
                `Tạo khuyến mãi "${name}" (Mã: ${code}, Giảm: ${newPromo.discountPercent}%, Lượt: ${usageLimit})`,
                actor
            );
        }

        return { success: true, promotion: newPromo };
    }

    /**
     * Sửa chương trình khuyến mãi (Requirement C).
     * Bảo toàn lịch sử đơn hàng cho các đơn cũ.
     */
    function updatePromotion(id, updateData, actor = null) {
        if (!id) return { success: false, message: 'Thiếu ID chương trình.' };

        const promos = getRawPromotions();
        const index = promos.findIndex(p => String(p.id) === String(id));
        if (index === -1) return { success: false, message: 'Không tìm thấy chương trình khuyến mãi.' };

        const target = promos[index];

        if (updateData.name !== undefined) target.name = updateData.name.trim();
        if (updateData.description !== undefined) target.description = updateData.description.trim();

        if (updateData.discountPercent !== undefined) {
            const dp = parseFloat(updateData.discountPercent);
            if (isNaN(dp) || dp <= 0 || dp > 100) {
                return { success: false, message: 'Mức giảm phải lớn hơn 0% và không vượt quá 100%.' };
            }
            target.discountPercent = Math.round(dp);
        }

        if (updateData.usageLimit !== undefined) {
            const ul = parseInt(updateData.usageLimit, 10);
            if (isNaN(ul) || ul <= 0) {
                return { success: false, message: 'Số lượng mã phát hành phải lớn hơn 0.' };
            }
            target.usageLimit = ul;
        }

        if (updateData.startDate && updateData.endDate) {
            const start = new Date(updateData.startDate);
            const end = new Date(updateData.endDate);
            if (end.getTime() < start.getTime()) {
                return { success: false, message: 'Ngày kết thúc không được trước ngày bắt đầu.' };
            }
            target.startDate = start.toISOString();
            target.endDate = end.toISOString();
        }

        if (updateData.type && [PROMO_TYPES.SPECIAL, PROMO_TYPES.STANDARD, PROMO_TYPES.LIMITED].includes(updateData.type)) {
            target.type = updateData.type;
        }

        if (updateData.scope) {
            target.scope = updateData.scope === PROMO_SCOPES.CATEGORY ? PROMO_SCOPES.CATEGORY : PROMO_SCOPES.ALL;
            target.category = target.scope === PROMO_SCOPES.CATEGORY ? (updateData.category || 'Clothing') : 'ALL';
        }

        if (updateData.isActive !== undefined) {
            target.isActive = Boolean(updateData.isActive);
        }

        target.updatedAt = new Date().toISOString();
        saveRawPromotions(promos);

        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.logAuditEvent === 'function') {
            window.BMW_AUTH_GUARD.logAuditEvent(
                'UPDATE_PROMOTION',
                { username: target.code, role: 'coupon' },
                `Cập nhật khuyến mãi "${target.name}" (Mã: ${target.code})`,
                actor
            );
        }

        return { success: true, promotion: target };
    }

    /**
     * Bật/Tắt khuyến mãi nhanh (Toggle Active).
     */
    function togglePromotionActive(id, actor = null) {
        const promos = getRawPromotions();
        const target = promos.find(p => String(p.id) === String(id));
        if (!target) return { success: false, message: 'Không tìm thấy chương trình.' };

        target.isActive = !target.isActive;
        target.updatedAt = new Date().toISOString();
        saveRawPromotions(promos);

        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.logAuditEvent === 'function') {
            window.BMW_AUTH_GUARD.logAuditEvent(
                'TOGGLE_PROMOTION',
                { username: target.code, role: 'coupon' },
                `${target.isActive ? 'Bật' : 'Tắt'} khuyến mãi "${target.name}" (${target.code})`,
                actor
            );
        }

        return { success: true, isActive: target.isActive, promotion: target };
    }

    /**
     * Kết thúc sớm chương trình khuyến mãi (End immediately).
     */
    function endPromotion(id, actor = null) {
        const promos = getRawPromotions();
        const target = promos.find(p => String(p.id) === String(id));
        if (!target) return { success: false, message: 'Không tìm thấy chương trình.' };

        // Set endDate to now
        target.endDate = new Date(Date.now() - 1000).toISOString();
        target.updatedAt = new Date().toISOString();
        saveRawPromotions(promos);

        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.logAuditEvent === 'function') {
            window.BMW_AUTH_GUARD.logAuditEvent(
                'END_PROMOTION',
                { username: target.code, role: 'coupon' },
                `Kết thúc sớm khuyến mãi "${target.name}" (${target.code})`,
                actor
            );
        }

        return { success: true, promotion: target };
    }

    /**
     * Xóa khuyến mãi (chỉ cho phép khi chưa có đơn nào sử dụng).
     */
    function deletePromotion(id, actor = null) {
        const promos = getRawPromotions();
        const index = promos.findIndex(p => String(p.id) === String(id));
        if (index === -1) return { success: false, message: 'Không tìm thấy chương trình.' };

        const target = promos[index];
        if (target.usedCount > 0) {
            // Đã có lượt dùng -> Ưu tiên tắt thay vì xóa cứng
            target.isActive = false;
            target.updatedAt = new Date().toISOString();
            saveRawPromotions(promos);
            return {
                success: true,
                deactivated: true,
                message: `Mã "${target.code}" đã có ${target.usedCount} lượt sử dụng trong các đơn hàng trước. Hệ thống đã tắt mã an toàn thay vì xóa cứng.`
            };
        }

        promos.splice(index, 1);
        saveRawPromotions(promos);

        if (window.BMW_AUTH_GUARD && typeof window.BMW_AUTH_GUARD.logAuditEvent === 'function') {
            window.BMW_AUTH_GUARD.logAuditEvent(
                'DELETE_PROMOTION',
                { username: target.code, role: 'coupon' },
                `Xóa khuyến mãi "${target.name}" (${target.code})`,
                actor
            );
        }

        return { success: true, deactivated: false };
    }

    // ── 6. Checkout Validation & Calculation (Requirement E) ─────────────────
    /**
     * Kiểm tra tính hợp lệ và tính mức giảm cho giỏ hàng.
     * @param {string} code - Mã coupon cần áp dụng
     * @param {Array} cartItems - Danh sách sản phẩm trong giỏ [{ id, category, price, quantity, itemTotal }]
     * @param {number} subtotal - Tổng phụ đơn hàng
     * @param {Date|string} atTime - Thời điểm kiểm tra (mặc định now)
     */
    function validateCoupon(code, cartItems = [], subtotal = 0, atTime = new Date()) {
        if (!code || typeof code !== 'string') {
            return { valid: false, message: 'Vui lòng nhập mã giảm giá.' };
        }

        const cleanCode = code.trim().toUpperCase();
        if (!isValidCouponFormat(cleanCode)) {
            return {
                valid: false,
                message: 'Định dạng mã không hợp lệ (mã chuẩn gồm 6 ký tự: 4 chữ cái và 2 số, ví dụ: AB12CD).'
            };
        }

        const promo = getPromotionByCode(cleanCode);
        if (!promo) {
            return { valid: false, message: `Mã giảm giá "${cleanCode}" không tồn tại trên hệ thống.` };
        }

        const status = computePromotionStatus(promo, atTime);

        if (status === PROMO_STATUS.DISABLED) {
            return { valid: false, message: `Mã giảm giá "${cleanCode}" hiện đang tạm ngưng sử dụng.` };
        }
        if (status === PROMO_STATUS.DRAFT) {
            return { valid: false, message: `Mã giảm giá "${cleanCode}" chưa được phát hành.` };
        }
        if (status === PROMO_STATUS.UPCOMING) {
            const startStr = new Date(promo.startDate).toLocaleDateString('vi-VN');
            return { valid: false, message: `Chương trình khuyến mãi "${promo.name}" chưa bắt đầu (Bắt đầu từ: ${startStr}).` };
        }
        if (status === PROMO_STATUS.EXPIRED) {
            return { valid: false, message: `Mã giảm giá "${cleanCode}" đã hết hạn sử dụng.` };
        }
        if (status === PROMO_STATUS.OUT_OF_STOCK) {
            return { valid: false, message: `Mã giảm giá "${cleanCode}" đã hết lượt sử dụng được phát hành.` };
        }

        // Kiểm tra phạm vi áp dụng (Scope: ALL vs CATEGORY)
        let eligibleSubtotal = 0;
        let matchedItems = [];

        if (promo.scope === PROMO_SCOPES.CATEGORY) {
            const requiredCategory = (promo.category || '').toLowerCase();
            matchedItems = cartItems.filter(item => {
                const cat = (item.category || '').toLowerCase();
                return cat === requiredCategory;
            });

            if (matchedItems.length === 0) {
                return {
                    valid: false,
                    message: `Mã giảm giá "${cleanCode}" chỉ áp dụng cho danh mục sản phẩm: ${promo.category}. Giỏ hàng của bạn không có sản phẩm nào thuộc danh mục này.`
                };
            }

            eligibleSubtotal = matchedItems.reduce((sum, it) => {
                const itemTot = Number(it.itemTotal) || ((Number(it.priceNumber) || 0) * (Number(it.quantity) || 1));
                return sum + itemTot;
            }, 0);
        } else {
            eligibleSubtotal = subtotal;
            matchedItems = cartItems;
        }

        // Tính tiền giảm giá
        const discountPercent = promo.discountPercent || 0;
        let discountAmount = Math.round(eligibleSubtotal * (discountPercent / 100));

        // Không cho tổng giảm vượt quá subtotal thực tế
        if (discountAmount > subtotal) {
            discountAmount = subtotal;
        }

        return {
            valid: true,
            code: cleanCode,
            promotionId: promo.id,
            promotionName: promo.name,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            scope: promo.scope,
            category: promo.category,
            eligibleSubtotal: eligibleSubtotal,
            matchedItemsCount: matchedItems.length,
            message: `Áp dụng thành công mã "${cleanCode}": Giảm ${discountPercent}% (${formatVND(discountAmount)}).`
        };
    }

    /**
     * Ghi nhận đã sử dụng coupon khi đặt hàng thành công (Redeem).
     */
    function redeemCoupon(code, orderId = null) {
        if (!code) return false;
        const promos = getRawPromotions();
        const search = String(code).trim().toUpperCase();
        const target = promos.find(p => p.code && p.code.toUpperCase() === search);
        if (!target) return false;

        target.usedCount = (parseInt(target.usedCount, 10) || 0) + 1;
        target.updatedAt = new Date().toISOString();
        saveRawPromotions(promos);
        return true;
    }

    /**
     * Hoàn lại lượt sử dụng coupon khi đơn hàng bị hủy (Refund Usage - Requirement E).
     * Chỉ hoàn lượt đúng một lần theo chính sách.
     */
    function refundCoupon(code, orderId = null) {
        if (!code) return false;
        const promos = getRawPromotions();
        const search = String(code).trim().toUpperCase();
        const target = promos.find(p => p.code && p.code.toUpperCase() === search);
        if (!target) return false;

        if (target.usedCount > 0) {
            target.usedCount -= 1;
            target.updatedAt = new Date().toISOString();
            saveRawPromotions(promos);
            return true;
        }
        return false;
    }

    // Helper: format integer to VND string
    function formatVND(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
        return Math.round(amount).toLocaleString('vi-VN') + '₫';
    }

    // Helper: format date to DD/MM/YYYY
    function formatDateSimple(isoStr) {
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

    // ── 7. Homepage Showcase Renderer (Requirement D) ──────────────────────
    let currentVoucherTab = 'active';

    function copyVoucherCode(code) {
        if (!code) return;
        const toast = document.getElementById('promo-copy-toast');
        const toastText = document.getElementById('promo-copy-toast-text');

        function triggerSuccess() {
            if (toast) {
                if (toastText) toastText.textContent = `Đã sao chép mã "${code}" thành công!`;
                toast.style.display = 'flex';
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 3000);
            } else {
                alert(`Đã sao chép mã "${code}". Dán mã tại trang Checkout để nhận ưu đãi!`);
            }
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(triggerSuccess).catch(() => {
                fallbackCopy(code, triggerSuccess);
            });
        } else {
            fallbackCopy(code, triggerSuccess);
        }
    }

    function fallbackCopy(text, callback) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        try {
            document.execCommand('copy');
            if (callback) callback();
        } catch (e) {
            alert(`Mã coupon của bạn: ${text}`);
        }
        document.body.removeChild(temp);
    }

    function applyVoucherAndShop(code) {
        if (!code) return;
        sessionStorage.setItem('bmw_applied_coupon', code);
        copyVoucherCode(code);
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 600);
    }

    function renderHomepageVouchers(gridContainerId = 'homepage-promo-grid') {
        const grid = document.getElementById(gridContainerId);
        if (!grid) return;

        const all = getPromotions();
        let filtered = [];

        if (currentVoucherTab === 'active') {
            filtered = all.filter(p => {
                const status = computePromotionStatus(p);
                return status === PROMO_STATUS.ACTIVE && p.isActive !== false;
            });
        } else if (currentVoucherTab === 'special') {
            filtered = all.filter(p => {
                return p.type === PROMO_TYPES.SPECIAL && p.isActive !== false;
            });
        } else if (currentVoucherTab === 'expired') {
            filtered = all.filter(p => {
                const status = computePromotionStatus(p);
                return status === PROMO_STATUS.EXPIRED || 
                       status === PROMO_STATUS.OUT_OF_STOCK || 
                       status === PROMO_STATUS.DISABLED || 
                       p.isActive === false;
            });
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: var(--bg-surface); border-radius: 12px; border: 1px dashed var(--border-color);">
                    <svg viewBox="0 0 24 24" style="width: 42px; height: 42px; stroke: var(--text-muted); fill: none; stroke-width: 1.5; margin: 0 auto 12px;"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><line x1="9.5" y1="9.5" x2="9.55" y2="9.5"/><line x1="14.5" y1="14.5" x2="14.55" y2="14.5"/></svg>
                    <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 16px;">Hiện chưa có mã giảm giá trong mục này</h4>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 13px;">Hãy quay lại sau hoặc theo dõi các ưu đãi tại các tab khác.</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(p => {
            const status = computePromotionStatus(p);
            const isUsable = status === PROMO_STATUS.ACTIVE && p.isActive !== false;
            const cardDisabledClass = isUsable ? '' : 'disabled';

            let typeTagClass = 'standard';
            let typeLabel = 'Thông dụng';
            if (p.type === PROMO_TYPES.SPECIAL) {
                typeTagClass = 'special';
                typeLabel = 'Đặc biệt (VIP)';
            } else if (p.type === PROMO_TYPES.LIMITED) {
                typeTagClass = 'limited';
                typeLabel = 'Giới hạn';
            }

            const scopeText = p.scope === PROMO_SCOPES.CATEGORY
                ? `Danh mục: <strong>${p.category || 'Tất cả'}</strong>`
                : 'Toàn bộ sản phẩm';

            let statusFooter = '';
            if (isUsable) {
                statusFooter = `
                    <div class="promo-card-actions">
                        <button type="button" class="promo-btn-copy" onclick="window.BMW_PROMOTIONS_API.copyVoucherCode('${p.code}')" title="Sao chép mã">
                            Sao chép
                        </button>
                        <button type="button" class="promo-btn-apply" onclick="window.BMW_PROMOTIONS_API.applyVoucherAndShop('${p.code}')" title="Áp dụng mã và mua sắm ngay">
                            Dùng ngay →
                        </button>
                    </div>
                `;
            } else {
                let badgeClass = 'expired';
                let badgeText = 'Đã hết hạn';
                if (status === PROMO_STATUS.OUT_OF_STOCK) {
                    badgeClass = 'out-of-stock';
                    badgeText = 'Đã hết lượt dùng';
                } else if (status === PROMO_STATUS.DISABLED || p.isActive === false) {
                    badgeClass = 'disabled';
                    badgeText = 'Chương trình đã tắt';
                } else if (status === PROMO_STATUS.UPCOMING) {
                    badgeClass = 'disabled';
                    badgeText = 'Sắp diễn ra';
                }

                statusFooter = `
                    <span class="promo-status-label ${badgeClass}">${badgeText}</span>
                `;
            }

            html += `
                <div class="promo-voucher-card ${cardDisabledClass}">
                    <div class="promo-card-header">
                        <span class="promo-type-tag ${typeTagClass}">${typeLabel}</span>
                        <div class="promo-discount-badge">-${p.discountPercent}%</div>
                    </div>
                    <div class="promo-card-body">
                        <h3>${p.name}</h3>
                        ${p.description ? `<p>${p.description}</p>` : ''}
                        <div class="promo-card-meta">
                            <div>Phạm vi: ${scopeText}</div>
                            <div>Thời hạn: <strong>${formatDateSimple(p.startDate)} – ${formatDateSimple(p.endDate)}</strong></div>
                            ${isUsable ? `<div style="font-size: 11px; color: var(--accent-blue);">Còn lại: ${Math.max(0, (p.usageLimit || 0) - (p.usedCount || 0))} lượt sử dụng</div>` : ''}
                        </div>
                    </div>
                    <div class="promo-card-footer">
                        <span class="promo-code-pill" title="Click để sao chép" onclick="window.BMW_PROMOTIONS_API.copyVoucherCode('${p.code}')">
                            🎟 ${p.code}
                        </span>
                        ${statusFooter}
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    // Auto setup on homepage if grid is present
    document.addEventListener('DOMContentLoaded', () => {
        const grid = document.getElementById('homepage-promo-grid');
        if (grid) {
            renderHomepageVouchers();

            // Setup tab buttons
            const tabBtns = document.querySelectorAll('.promo-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    tabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentVoucherTab = btn.getAttribute('data-tab') || 'active';
                    renderHomepageVouchers();
                });
            });
        }
    });

    // Initialize seed data if not yet present
    getRawPromotions();

    // ── 8. Public API Export ────────────────────────────────────────────────
    window.BMW_PROMOTIONS_API = {
        PROMO_TYPES,
        PROMO_STATUS,
        PROMO_SCOPES,
        isValidCouponFormat,
        generateCouponCode,
        generateUniqueBatchCodes,
        computePromotionStatus,
        getPromotions,
        getPromotionById,
        getPromotionByCode,
        createPromotion,
        updatePromotion,
        togglePromotionActive,
        endPromotion,
        deletePromotion,
        validateCoupon,
        redeemCoupon,
        refundCoupon,
        formatVND,
        formatDateSimple,
        copyVoucherCode,
        applyVoucherAndShop,
        renderHomepageVouchers
    };

})(window);
