/**
 * js/products.js — BMW GYM Product Catalog & Storage Management API
 * Phase 8.3: Product, Category & Inventory Unified Storefront System
 * 100% Backward Compatible with Storefront (p1–p12) and Integrated with LocalStorage.
 */

(function () {
    'use strict';

    const PRODUCTS_STORAGE_KEY = 'bmw_products';
    const CATEGORIES_STORAGE_KEY = 'bmw_categories';
    const INVENTORY_SETTINGS_KEY = 'bmw_inventory_settings';
    const STAFF_PERMS_KEY = 'bmw_staff_permissions';

    // ── 1. Default Seed Products Catalog (p1–p12) ───────────────────────────
    const SEED_PRODUCTS = [
        // NEW
        {
            id: "p1",
            name: "BMW Performance Oversized T-Shirt",
            category: "Clothing",
            price: "690.000₫",
            oldPrice: "850.000₫",
            image: "images/products/performance-oversized-tshirt.jpg",
            tag: "NEW",
            description: "Built to move. Made to endure.",
            rating: 4.8,
            stock: 50
        },
        {
            id: "p2",
            name: "BMW Training Shorts",
            category: "Clothing",
            price: "590.000₫",
            oldPrice: null,
            image: "images/products/training-shorts.jpg",
            tag: "NEW",
            description: "Minimal and athletic by design.",
            rating: 4.8,
            stock: 120
        },
        {
            id: "p3",
            name: "BMW Performance Gym Bag",
            category: "Accessories",
            price: "1.290.000₫",
            oldPrice: "1.500.000₫",
            image: "images/products/performance-gym-bag.jpg",
            tag: "NEW",
            description: "Your gym. Your rules.",
            rating: 4.9,
            stock: 30
        },
        {
            id: "p4",
            name: "BMW Adjustable Dumbbells",
            category: "Equipment",
            price: "2.500.000₫",
            oldPrice: null,
            image: "images/products/adjustable-dumbbells.jpg",
            tag: "NEW",
            description: "Durable materials. Proven performance.",
            rating: 5.0,
            stock: 15
        },

        // HOT
        {
            id: "p5",
            name: "BMW Compression T-Shirt",
            category: "Clothing",
            price: "690.000₫",
            oldPrice: null,
            image: "images/products/compression-tshirt.jpg",
            tag: "HOT",
            description: "Compression fit for intense training.",
            rating: 4.8,
            stock: 200
        },
        {
            id: "p6",
            name: "BMW Training Gloves",
            category: "Accessories",
            price: "590.000₫",
            oldPrice: "700.000₫",
            image: "images/products/training-gloves.jpg",
            tag: "HOT",
            description: "Protect your hands while lifting heavy.",
            rating: 4.8,
            stock: 80
        },
        {
            id: "p7",
            name: "BMW Lifting Belt",
            category: "Equipment",
            price: "320.000₫",
            oldPrice: null,
            image: "images/products/lifting-belt.jpg",
            tag: "HOT",
            description: "Essential for heavy squats and deadlifts.",
            rating: 4.8,
            stock: 45
        },
        {
            id: "p8",
            name: "BMW Shaker / Gym Bottle",
            category: "Accessories",
            price: "1.290.000₫",
            oldPrice: null,
            image: "images/products/shaker-gym-bottle.jpg",
            tag: "HOT",
            description: "Stay hydrated during the grind.",
            rating: 4.8,
            stock: 150
        },

        // SALE
        {
            id: "p9",
            name: "BMW Lifting Straps",
            category: "Accessories",
            price: "320.000₫",
            oldPrice: "450.000₫",
            image: "images/products/lifting-straps.jpg",
            tag: "SALE",
            description: "Maximize your grip strength.",
            rating: 4.7,
            stock: 100
        },
        {
            id: "p10",
            name: "BMW Gym Joggers",
            category: "Clothing",
            price: "890.000₫",
            oldPrice: "1.200.000₫",
            image: "images/products/gym-joggers.jpg",
            tag: "SALE",
            description: "Comfortable and athletic.",
            rating: 4.6,
            stock: 60
        },
        {
            id: "p11",
            name: "BMW Resistance Bands",
            category: "Equipment",
            price: "450.000₫",
            oldPrice: "600.000₫",
            image: "images/products/resistance-bands.jpg",
            tag: "SALE",
            description: "Versatile training anywhere.",
            rating: 4.9,
            stock: 75
        },
        {
            id: "p12",
            name: "BMW Push-up Handles",
            category: "Equipment",
            price: "350.000₫",
            oldPrice: "500.000₫",
            image: "images/products/push-up-handles.jpg",
            tag: "SALE",
            description: "Deeper range of motion.",
            rating: 4.5,
            stock: 90
        }
    ];

    const SEED_CATEGORIES = ['Clothing', 'Accessories', 'Equipment'];

    const DEFAULT_STAFF_PERMS = {
        canAddProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canManageCategories: false,
        canManageStock: false
    };

    // ── 2. Format & Parse Helpers ───────────────────────────────────────────
    function formatVND(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
        return Math.round(amount).toLocaleString('vi-VN') + '₫';
    }

    function parsePrice(priceStr) {
        if (typeof priceStr === 'number') return Math.round(priceStr);
        if (!priceStr) return 0;
        const cleanStr = String(priceStr).replace(/[^0-9]/g, '');
        return parseInt(cleanStr, 10) || 0;
    }

    // ── 3. Storage Getters & Seeders ────────────────────────────────────────
    function getStoredProducts() {
        try {
            const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to parse bmw_products from localStorage:', e);
        }

        // Seed if missing
        try {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(SEED_PRODUCTS));
        } catch (e) {}
        return JSON.parse(JSON.stringify(SEED_PRODUCTS));
    }

    function saveStoredProducts(list) {
        if (!Array.isArray(list)) return false;
        try {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(list));
            // Keep window.products in sync
            if (typeof window !== 'undefined' && Array.isArray(window.products)) {
                window.products.length = 0;
                list.forEach(p => window.products.push(p));
            }
            return true;
        } catch (e) {
            console.error('Failed to save bmw_products:', e);
            return false;
        }
    }

    function getStoredCategories() {
        try {
            const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to parse bmw_categories:', e);
        }

        try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(SEED_CATEGORIES));
        } catch (e) {}
        return [...SEED_CATEGORIES];
    }

    function saveStoredCategories(cats) {
        if (!Array.isArray(cats)) return false;
        try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
            return true;
        } catch (e) {
            console.error('Failed to save bmw_categories:', e);
            return false;
        }
    }

    function getLowStockThreshold() {
        try {
            const raw = localStorage.getItem(INVENTORY_SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.lowStockThreshold === 'number') {
                    return parsed.lowStockThreshold;
                }
            }
        } catch (e) {}
        return 10; // Default threshold
    }

    function setLowStockThreshold(num, callerUser) {
        if (!callerUser || callerUser.role !== 'admin') {
            return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền đổi ngưỡng cảnh báo tồn kho.' };
        }
        const val = parseInt(num, 10);
        if (isNaN(val) || val < 1) {
            return { success: false, message: 'Ngưỡng cảnh báo phải là số nguyên dương.' };
        }
        try {
            const current = JSON.parse(localStorage.getItem(INVENTORY_SETTINGS_KEY) || '{}');
            current.lowStockThreshold = val;
            localStorage.setItem(INVENTORY_SETTINGS_KEY, JSON.stringify(current));
            return { success: true, threshold: val };
        } catch (e) {
            return { success: false, message: 'Lỗi lưu cấu hình tồn kho.' };
        }
    }

    function getStaffPermissions() {
        try {
            const raw = localStorage.getItem(STAFF_PERMS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...DEFAULT_STAFF_PERMS, ...parsed };
            }
        } catch (e) {}
        return { ...DEFAULT_STAFF_PERMS };
    }

    function setStaffPermissions(perms, callerUser) {
        if (!callerUser || callerUser.role !== 'admin') {
            return { success: false, message: 'Nhân viên không thể tự cấp quyền cho chính mình. Thao tác yêu cầu quyền Admin.' };
        }
        try {
            const newPerms = { ...DEFAULT_STAFF_PERMS, ...perms };
            localStorage.setItem(STAFF_PERMS_KEY, JSON.stringify(newPerms));
            return { success: true, permissions: newPerms };
        } catch (e) {
            return { success: false, message: 'Lỗi lưu phân quyền nhân viên.' };
        }
    }

    // ── 4. Validation Helpers ───────────────────────────────────────────────
    function validateProductData(data) {
        const errors = [];

        // Name
        const name = (data.name || '').trim();
        if (!name) {
            errors.push('Tên sản phẩm không được để trống.');
        } else if (name.length < 3) {
            errors.push('Tên sản phẩm phải có ít nhất 3 ký tự.');
        }

        // Price
        const priceNum = parsePrice(data.price);
        if (isNaN(priceNum) || priceNum <= 0) {
            errors.push('Giá sản phẩm phải là số dương lớn hơn 0.');
        }

        // Stock
        const stock = parseInt(data.stock, 10);
        if (isNaN(stock) || stock < 0 || !Number.isInteger(Number(data.stock))) {
            errors.push('Số lượng tồn kho phải là số nguyên không âm (≥ 0).');
        }

        // Category
        const category = (data.category || '').trim();
        const validCategories = getStoredCategories();
        if (!category) {
            errors.push('Vui lòng chọn danh mục cho sản phẩm.');
        } else if (!validCategories.includes(category)) {
            errors.push(`Danh mục "${category}" không tồn tại trong hệ thống.`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            sanitized: {
                name: name,
                category: category,
                price: formatVND(priceNum),
                priceNumber: priceNum,
                oldPrice: data.oldPrice ? formatVND(parsePrice(data.oldPrice)) : null,
                stock: Math.max(0, stock),
                image: (data.image || '').trim() || 'images/products/performance-oversized-tshirt.jpg',
                tag: (data.tag || '').trim().toUpperCase() || null,
                description: (data.description || '').trim() || 'Sản phẩm thể thao cao cấp BMW GYM.',
                rating: typeof data.rating === 'number' ? data.rating : 5.0
            }
        };
    }

    // ── 5. Product Management Operations ────────────────────────────────────
    function addProduct(data, callerUser) {
        // Permission check
        if (!callerUser) {
            return { success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác.' };
        }
        if (callerUser.role === 'customer') {
            return { success: false, message: 'Khách hàng không có quyền thêm sản phẩm.' };
        }
        if (callerUser.role === 'staff') {
            const perms = getStaffPermissions();
            if (!perms.canAddProducts) {
                return { success: false, message: 'Nhân viên chưa được Quản trị viên cấp quyền thêm sản phẩm.' };
            }
        }

        const val = validateProductData(data);
        if (!val.isValid) {
            return { success: false, message: val.errors.join(' ') };
        }

        const list = getStoredProducts();

        // Generate unique ID
        let newId = data.id ? String(data.id).trim() : null;
        if (!newId || list.some(p => String(p.id) === newId)) {
            // Find max p number
            let maxPNum = 12;
            list.forEach(p => {
                const match = String(p.id).match(/^p(\d+)$/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxPNum) maxPNum = num;
                }
            });
            newId = `p${maxPNum + 1}`;
        }

        const newProduct = {
            id: newId,
            ...val.sanitized
        };

        list.push(newProduct);
        saveStoredProducts(list);
        return { success: true, product: newProduct };
    }

    function updateProduct(id, data, callerUser) {
        if (!callerUser) {
            return { success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác.' };
        }
        if (callerUser.role === 'customer') {
            return { success: false, message: 'Khách hàng không có quyền chỉnh sửa sản phẩm.' };
        }
        if (callerUser.role === 'staff') {
            const perms = getStaffPermissions();
            if (!perms.canEditProducts) {
                return { success: false, message: 'Nhân viên chưa được Quản trị viên cấp quyền sửa sản phẩm.' };
            }
        }

        const list = getStoredProducts();
        const index = list.findIndex(p => String(p.id) === String(id));
        if (index === -1) {
            return { success: false, message: `Không tìm thấy sản phẩm mã "${id}".` };
        }

        const merged = { ...list[index], ...data };
        const val = validateProductData(merged);
        if (!val.isValid) {
            return { success: false, message: val.errors.join(' ') };
        }

        list[index] = {
            id: list[index].id, // preserve immutable ID
            ...val.sanitized
        };

        saveStoredProducts(list);
        return { success: true, product: list[index] };
    }

    function deleteProduct(id, callerUser) {
        if (!callerUser || callerUser.role !== 'admin') {
            return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền xóa sản phẩm khỏi hệ thống.' };
        }

        const list = getStoredProducts();
        const index = list.findIndex(p => String(p.id) === String(id));
        if (index === -1) {
            return { success: false, message: `Không tìm thấy sản phẩm mã "${id}".` };
        }

        const removed = list.splice(index, 1)[0];
        saveStoredProducts(list);
        return { success: true, product: removed };
    }

    // ── 6. Category Management Operations ───────────────────────────────────
    function addCategory(catName, callerUser) {
        if (!callerUser || callerUser.role !== 'admin') {
            return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền thêm danh mục mới.' };
        }

        const cleanName = (catName || '').trim();
        if (!cleanName) {
            return { success: false, message: 'Tên danh mục không được để trống.' };
        }

        const categories = getStoredCategories();
        if (categories.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
            return { success: false, message: `Danh mục "${cleanName}" đã tồn tại.` };
        }

        categories.push(cleanName);
        saveStoredCategories(categories);
        return { success: true, category: cleanName };
    }

    function updateCategory(oldName, newName, callerUser) {
        if (!callerUser || callerUser.role !== 'admin') {
            return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền đổi tên danh mục.' };
        }

        const cleanOld = (oldName || '').trim();
        const cleanNew = (newName || '').trim();
        if (!cleanNew) {
            return { success: false, message: 'Tên danh mục mới không được để trống.' };
        }

        const categories = getStoredCategories();
        const idx = categories.findIndex(c => c.toLowerCase() === cleanOld.toLowerCase());
        if (idx === -1) {
            return { success: false, message: `Danh mục "${cleanOld}" không tồn tại.` };
        }

        if (cleanOld.toLowerCase() !== cleanNew.toLowerCase()) {
            if (categories.some(c => c.toLowerCase() === cleanNew.toLowerCase())) {
                return { success: false, message: `Danh mục "${cleanNew}" đã tồn tại.` };
            }
        }

        // Rename category
        categories[idx] = cleanNew;
        saveStoredCategories(categories);

        // Cascade rename to all products under old category
        const products = getStoredProducts();
        let updatedCount = 0;
        products.forEach(p => {
            if (p.category && p.category.toLowerCase() === cleanOld.toLowerCase()) {
                p.category = cleanNew;
                updatedCount++;
            }
        });
        if (updatedCount > 0) {
            saveStoredProducts(products);
        }

        return { success: true, oldName: cleanOld, newName: cleanNew, productsUpdated: updatedCount };
    }

    function deleteCategory(catName, targetCatName = null, callerUser) {
        if (!callerUser || callerUser.role !== 'admin') {
            return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền xóa danh mục.' };
        }

        const cleanName = (catName || '').trim();
        const categories = getStoredCategories();
        const idx = categories.findIndex(c => c.toLowerCase() === cleanName.toLowerCase());
        if (idx === -1) {
            return { success: false, message: `Danh mục "${cleanName}" không tồn tại.` };
        }

        // Check if products currently use this category
        const products = getStoredProducts();
        const linkedProducts = products.filter(p => p.category && p.category.toLowerCase() === cleanName.toLowerCase());

        if (linkedProducts.length > 0) {
            // Require target category for safe migration
            if (!targetCatName || targetCatName.toLowerCase() === cleanName.toLowerCase()) {
                return {
                    success: false,
                    hasProducts: true,
                    productCount: linkedProducts.length,
                    message: `Không thể xóa danh mục "${cleanName}" vì đang có ${linkedProducts.length} sản phẩm thuộc danh mục này. Vui lòng chuyển các sản phẩm sang danh mục khác trước khi xóa!`
                };
            }

            const cleanTarget = (targetCatName || '').trim();
            if (!categories.some(c => c.toLowerCase() === cleanTarget.toLowerCase())) {
                return { success: false, message: `Danh mục đích "${cleanTarget}" không tồn tại để chuyển sản phẩm.` };
            }

            // Transfer products to target category
            linkedProducts.forEach(p => {
                p.category = cleanTarget;
            });
            saveStoredProducts(products);
        }

        // Remove category
        categories.splice(idx, 1);
        saveStoredCategories(categories);

        return {
            success: true,
            deletedCategory: cleanName,
            migratedCount: linkedProducts.length,
            targetCategory: targetCatName
        };
    }

    // ── 7. Inventory Stock Deduct & Restock Operations ───────────────────────
    function deductStock(orderItems) {
        if (!Array.isArray(orderItems) || orderItems.length === 0) return true;
        const products = getStoredProducts();
        let modified = false;

        // First pass: Verify all items have enough stock
        for (const item of orderItems) {
            const p = products.find(prod => String(prod.id) === String(item.id));
            if (p && typeof p.stock === 'number') {
                const reqQty = Number(item.quantity) || 1;
                if (reqQty > p.stock) {
                    return {
                        success: false,
                        message: `Sản phẩm "${p.name}" không đủ tồn kho (yêu cầu: ${reqQty}, tồn kho hiện có: ${p.stock}).`
                    };
                }
            }
        }

        // Second pass: Deduct stock safely
        for (const item of orderItems) {
            const p = products.find(prod => String(prod.id) === String(item.id));
            if (p && typeof p.stock === 'number') {
                const reqQty = Number(item.quantity) || 1;
                p.stock = Math.max(0, p.stock - reqQty);
                modified = true;
            }
        }

        if (modified) {
            saveStoredProducts(products);
        }
        return { success: true };
    }

    function restock(orderItems) {
        if (!Array.isArray(orderItems) || orderItems.length === 0) return true;
        const products = getStoredProducts();
        let modified = false;

        for (const item of orderItems) {
            const p = products.find(prod => String(prod.id) === String(item.id));
            if (p) {
                const curStock = Number(p.stock) || 0;
                const reqQty = Number(item.quantity) || 1;
                p.stock = curStock + reqQty;
                modified = true;
            }
        }

        if (modified) {
            saveStoredProducts(products);
        }
        return { success: true };
    }

    // ── 8. Explicit Stock Update with RBAC (Phase 8.7) ──────────────────────
    function updateStock(id, newStock, callerUser) {
        if (!callerUser) {
            return { success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác.' };
        }
        if (callerUser.role === 'customer') {
            return { success: false, message: 'Khách hàng không có quyền điều chỉnh tồn kho.' };
        }
        if (callerUser.role === 'staff') {
            const perms = getStaffPermissions();
            if (!perms.canManageStock && !perms.canManageInventory) {
                return { success: false, message: 'Bạn không có quyền điều chỉnh số lượng tồn kho.' };
            }
        }

        const stockNum = parseInt(newStock, 10);
        if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(Number(newStock))) {
            return { success: false, message: 'Số lượng tồn kho phải là số nguyên không âm (≥ 0).' };
        }

        const list = getStoredProducts();
        const index = list.findIndex(p => String(p.id) === String(id));
        if (index === -1) {
            return { success: false, message: `Không tìm thấy sản phẩm mã "${id}".` };
        }

        list[index].stock = stockNum;
        saveStoredProducts(list);
        return { success: true, product: list[index] };
    }

    // ── 9. Global Export ────────────────────────────────────────────────────
    const initialProducts = getStoredProducts();

    // Export products array to global window (100% storefront backward compatibility)
    if (typeof window !== 'undefined') {
        window.products = initialProducts;

        window.BMW_PRODUCTS_API = {
            SEED_PRODUCTS: SEED_PRODUCTS,
            getProducts: getStoredProducts,
            saveProducts: saveStoredProducts,
            getProductById: (id) => getStoredProducts().find(p => String(p.id) === String(id)) || null,
            addProduct: addProduct,
            updateProduct: updateProduct,
            deleteProduct: deleteProduct,
            updateStock: updateStock,
            getCategories: getStoredCategories,
            saveCategories: saveStoredCategories,
            addCategory: addCategory,
            updateCategory: updateCategory,
            deleteCategory: deleteCategory,
            getStaffPermissions: getStaffPermissions,
            setStaffPermissions: setStaffPermissions,
            getLowStockThreshold: getLowStockThreshold,
            setLowStockThreshold: setLowStockThreshold,
            deductStock: deductStock,
            restock: restock,
            formatVND: formatVND,
            parsePrice: parsePrice
        };
    }
})();

// Guarantee products variable exists in scope for scripts that use it directly
var products = (typeof window !== 'undefined' && window.products) ? window.products : [];
