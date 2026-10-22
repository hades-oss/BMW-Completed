// js/order-storage.js - BMW Orders Management, Status History, RBAC & Storage API
// Khóa lưu trữ LocalStorage: bmw_orders

(function () {
    'use strict';

    const ORDERS_STORAGE_KEY = 'bmw_orders';

    // ── 1. Order Status Definitions & Canonical Mapping ───────────────────────
    const ORDER_STATUS = {
        // Standard Vietnamese statuses (Đợt 8.4)
        PENDING_CONFIRMATION: 'Chờ xác nhận',
        CONFIRMED: 'Đã xác nhận',
        PROCESSING: 'Đang xử lý',
        PACKING: 'Đang đóng gói',
        HANDED_OVER: 'Đã bàn giao vận chuyển',
        SHIPPING: 'Đang giao hàng',
        DELIVERED: 'Đã giao',
        CANCELLED: 'Đã hủy',
        RETURN_REQUESTED: 'Yêu cầu đổi trả',
        RETURNED: 'Đã trả hàng',

        // Legacy English aliases for 100% backward compatibility
        ORDERED: 'Order Placed',
        AWAITING_DISPATCH: 'Awaiting Dispatch',
        IN_TRANSIT: 'In Transit'
    };

    // ── 2. Payment Status Definitions ─────────────────────────────────────────
    const PAYMENT_STATUS = {
        PENDING: 'pending_payment',
        PAID: 'paid',
        REFUND_PENDING: 'refund_pending',
        REFUNDED: 'refunded',
        PAYMENT_FAILED: 'payment_failed',
        CANCELLED: 'cancelled'
    };

    // ── 3. Simulated Shipping Routes ──────────────────────────────────────────
    const SHIPPING_ROUTES = [
        {
            name: 'Tuyến 1: TP. Hồ Chí Minh → Đà Nẵng',
            origin: 'Kho trung tâm Quận 7, TP.HCM',
            destination: 'Trung tâm phân phối Hải Châu, Đà Nẵng',
            checkpoints: [
                'Kho tổng Quận 7, TP.HCM (Đã xuất kho)',
                'Trạm trung chuyển Dĩ An, Bình Dương',
                'Trạm trung chuyển Nha Trang, Khánh Hòa',
                'Bưu cục phát Hải Châu, Đà Nẵng (Đang phát hàng)'
            ]
        },
        {
            name: 'Tuyến 2: Hà Nội → Đà Nẵng',
            origin: 'Kho trung tâm Long Biên, Hà Nội',
            destination: 'Trung tâm phân phối Thanh Khê, Đà Nẵng',
            checkpoints: [
                'Kho KCN Đại Tư, Long Biên, Hà Nội (Đã xuất kho)',
                'Trạm trung chuyển Vinh, Nghệ An',
                'Trạm trung chuyển Đồng Hới, Quảng Bình',
                'Bưu cục phát Thanh Khê, Đà Nẵng (Đang phát hàng)'
            ]
        }
    ];

    // ── 4. Valid Status Transitions Matrix (Requirement 3 & 7) ─────────────────
    // Quy định chuyển trạng thái hợp lệ, chặn nhảy cóc hoặc cập nhật tùy tiện
    const VALID_STATUS_TRANSITIONS = {
        'Chờ xác nhận': ['Đã xác nhận', 'Đang xử lý', 'Awaiting Dispatch', 'Đã hủy'],
        'Order Placed': ['Đã xác nhận', 'Confirmed', 'Awaiting Dispatch', 'Đang xử lý', 'Cancelled', 'Đã hủy'],
        'Đã đặt hàng': ['Đã xác nhận', 'Đang xử lý', 'Awaiting Dispatch', 'Đã hủy'],

        'Đã xác nhận': ['Đang xử lý', 'Đang đóng gói', 'Đã hủy'],
        'Confirmed': ['Đang xử lý', 'Processing', 'Awaiting Dispatch', 'Cancelled', 'Đã hủy'],

        'Đang xử lý': ['Đang đóng gói', 'Đã bàn giao vận chuyển', 'Đã hủy'],
        'Awaiting Dispatch': ['Đang đóng gói', 'In Transit', 'Đang giao hàng', 'Cancelled', 'Đã hủy'],
        'Chờ chuyển phát': ['Đang đóng gói', 'Đang giao hàng', 'Đã hủy'],

        'Đang đóng gói': ['Đã bàn giao vận chuyển', 'Đang giao hàng', 'Đã hủy'],

        'Đã bàn giao vận chuyển': ['Đang giao hàng', 'Đã giao'],

        'Đang giao hàng': ['Đã giao', 'Đã hủy'],
        'In Transit': ['Delivered', 'Đã giao', 'Cancelled', 'Đã hủy'],
        'Đang trung chuyển': ['Đã giao', 'Đã hủy'],

        // Đã giao KHÔNG ĐƯỢC PHÉP HỦY TRỰC TIẾP (Requirement 7)
        'Đã giao': ['Yêu cầu đổi trả'],
        'Delivered': ['Yêu cầu đổi trả', 'Return Requested'],
        'Đã giao đơn hàng': ['Yêu cầu đổi trả'],

        'Yêu cầu đổi trả': ['Đã trả hàng', 'Đã giao'],
        'Return Requested': ['Đã trả hàng', 'Delivered'],

        'Đã hủy': [],
        'Cancelled': [],
        'Đã trả hàng': [],
        'Returned': []
    };

    function normalizeOrderStatus(status) {
        if (!status) return 'Chờ xác nhận';
        const s = String(status).trim().toLowerCase();
        if (s === 'order placed' || s === 'đã đặt hàng' || s === 'chờ xác nhận') return 'Chờ xác nhận';
        if (s === 'confirmed' || s === 'đã xác nhận') return 'Đã xác nhận';
        if (s === 'awaiting dispatch' || s === 'chờ chuyển phát' || s === 'đang xử lý') return 'Đang xử lý';
        if (s === 'packing' || s === 'đang đóng gói') return 'Đang đóng gói';
        if (s === 'handed over' || s === 'đã bàn giao' || s === 'đã bàn giao vận chuyển') return 'Đã bàn giao vận chuyển';
        if (s === 'in transit' || s === 'đang trung chuyển' || s === 'đang giao hàng') return 'Đang giao hàng';
        if (s === 'delivered' || s === 'đã giao đơn hàng' || s === 'đã giao') return 'Đã giao';
        if (s === 'cancelled' || s === 'đã hủy') return 'Đã hủy';
        if (s === 'return requested' || s === 'yêu cầu đổi trả') return 'Yêu cầu đổi trả';
        if (s === 'returned' || s === 'đã trả hàng') return 'Đã trả hàng';
        return status;
    }

    function canTransitionStatus(currentStatus, targetStatus) {
        if (!currentStatus || !targetStatus) {
            return { allowed: false, message: 'Trạng thái không hợp lệ.' };
        }

        const currNorm = normalizeOrderStatus(currentStatus);
        const targNorm = normalizeOrderStatus(targetStatus);

        if (currNorm === targNorm) {
            return { allowed: true, message: 'Trạng thái không đổi.' };
        }

        // Chặn tuyệt đối hủy đơn đã giao thành công (Requirement 7)
        if (currNorm === 'Đã giao' && targNorm === 'Đã hủy') {
            return {
                allowed: false,
                message: 'Đơn hàng đã được giao thành công, không thể hủy trực tiếp. Vui lòng chuyển sang quy trình Đổi / Trả hàng.'
            };
        }

        // Đơn đã hủy không được phục hồi về trạng thái active
        if (currNorm === 'Đã hủy') {
            return {
                allowed: false,
                message: 'Đơn hàng đã bị hủy, không thể kích hoạt lại chu trình xử lý.'
            };
        }

        const allowedTransitions = VALID_STATUS_TRANSITIONS[currNorm] || VALID_STATUS_TRANSITIONS[currentStatus] || [];
        const isAllowed = allowedTransitions.some(t => normalizeOrderStatus(t) === targNorm || t === targetStatus);

        if (!isAllowed) {
            return {
                allowed: false,
                message: `Chuyển trạng thái từ "${currentStatus}" sang "${targetStatus}" không hợp lệ theo quy trình vận hành.`
            };
        }

        return { allowed: true };
    }

    // ── 5. ID & Storage Helpers ──────────────────────────────────────────────
    function generateOrderId() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `BMW${timestamp}${random}`;
    }

    function getOrders() {
        try {
            const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            // Backward compatibility: ensure statusHistory & internalNotes arrays exist
            parsed.forEach(order => {
                if (!Array.isArray(order.statusHistory)) {
                    order.statusHistory = [
                        {
                            status: order.orderStatus || 'Order Placed',
                            at: order.createdAt || new Date().toISOString(),
                            by: order.userAccount ? `@${order.userAccount}` : 'Khách hàng',
                            note: 'Khởi tạo đơn hàng'
                        }
                    ];
                }
                if (!Array.isArray(order.internalNotes)) {
                    order.internalNotes = [];
                }
                if (typeof order.inventoryRestocked !== 'boolean') {
                    order.inventoryRestocked = false;
                }
            });

            return parsed;
        } catch (e) {
            console.error('Failed to get orders:', e);
            return [];
        }
    }

    function saveOrders(orders) {
        try {
            localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
            return true;
        } catch (e) {
            console.error('Failed to save orders:', e);
            return false;
        }
    }

    function getCurrentUserObj() {
        try {
            const rawSession = sessionStorage.getItem('bmw_current_user');
            const rawLocal = localStorage.getItem('bmw_current_user');
            const raw = rawSession || rawLocal;
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
            }
        } catch (e) {}
        return null;
    }

    function getCurrentUserEmail() {
        const user = getCurrentUserObj();
        return user ? (user.username || user.email || user.id) : null;
    }

    // ── 6. Pre-check Inventory Availability ──────────────────────────────────
    function checkStockBeforeOrder(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return { success: true };
        }
        if (!window.BMW_PRODUCTS_API || typeof window.BMW_PRODUCTS_API.getProducts !== 'function') {
            return { success: true };
        }

        const catalog = window.BMW_PRODUCTS_API.getProducts();
        for (const it of items) {
            const prod = catalog.find(p => String(p.id) === String(it.id));
            if (prod && typeof prod.stock === 'number') {
                const reqQty = Number(it.quantity) || 1;
                if (reqQty > prod.stock) {
                    return {
                        success: false,
                        message: `Sản phẩm "${prod.name}" không đủ tồn kho (yêu cầu: ${reqQty}, tồn kho hiện có: ${prod.stock}).`,
                        productId: prod.id,
                        availableStock: prod.stock
                    };
                }
            }
        }
        return { success: true };
    }

    // ── 7. Create Order (Requirement 1, 6, 8, 9, 11) ──────────────────────────
    function createOrder(orderData, options = {}) {
        const orders = getOrders();
        const orderId = orderData.orderId || generateOrderId();
        const randomRoute = SHIPPING_ROUTES[Math.floor(Math.random() * SHIPPING_ROUTES.length)];

        const currentUser = getCurrentUserObj();
        const userAccount = currentUser ? (currentUser.username || currentUser.email) : (orderData.userAccount || null);
        const userId = currentUser ? currentUser.id : (orderData.userId || null);

        // Pre-check stock if strict stock requested
        if (options && options.strictStock) {
            const stockCheck = checkStockBeforeOrder(orderData.items);
            if (!stockCheck.success) {
                return {
                    success: false,
                    error: 'INSUFFICIENT_STOCK',
                    message: stockCheck.message
                };
            }
        }

        const initialStatus = orderData.orderStatus || ORDER_STATUS.ORDERED;
        const initialPaymentMethod = orderData.paymentMethod || 'COD';
        
        // Trạng thái thanh toán ban đầu: COD và QR đều khởi đầu là pending_payment
        const initialPaymentStatus = initialPaymentMethod === 'COD' 
            ? PAYMENT_STATUS.PENDING 
            : (orderData.paymentStatus || PAYMENT_STATUS.PENDING);

        const newOrder = {
            orderId: orderId,
            userId: userId,
            userAccount: userAccount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            customer: {
                fullName: (orderData.customer?.fullName || '').trim(),
                phone: (orderData.customer?.phone || '').trim(),
                address: (orderData.customer?.address || '').trim(),
                notes: (orderData.customer?.notes || '').trim()
            },
            // Snapshot giá và thông tin sản phẩm tại thời điểm mua (Requirement 1 & 8.3)
            items: Array.isArray(orderData.items) ? orderData.items.map(it => ({
                id: it.id,
                name: it.name,
                price: it.price,
                priceNumber: it.priceNumber || 0,
                quantity: Number(it.quantity) || 1,
                image: it.image,
                category: it.category || 'BMW Gear',
                itemTotal: it.itemTotal || ((it.priceNumber || 0) * (Number(it.quantity) || 1))
            })) : [],
            totalItems: orderData.totalItems || 0,
            subtotal: orderData.subtotal || 0,
            shippingFee: orderData.shippingFee || 0,
            discount: orderData.discount || 0,
            couponCode: orderData.couponCode || null,
            couponName: orderData.couponName || null,
            couponDiscountPercent: orderData.couponDiscountPercent || null,
            couponRefunded: false,
            total: orderData.total || 0,
            paymentMethod: initialPaymentMethod,
            paymentStatus: initialPaymentStatus,
            orderStatus: initialStatus,
            route: randomRoute,
            inventoryDeducted: false,
            inventoryRestocked: false,
            cancellationReason: null,
            cancelledAt: null,

            // Lịch sử trạng thái (Audit Trail Timeline - Requirement 1 & 10)
            statusHistory: [
                {
                    status: initialStatus,
                    at: new Date().toISOString(),
                    by: userAccount ? `@${userAccount}` : (orderData.customer?.fullName || 'Khách hàng'),
                    note: 'Đơn hàng được khởi tạo thành công qua hệ thống BMW GYM'
                }
            ],
            // Ghi chú nội bộ dành cho Admin & Staff
            internalNotes: []
        };

        // Ghi nhận sử dụng mã giảm giá nếu có (Requirement E)
        if (newOrder.couponCode && window.BMW_PROMOTIONS_API && typeof window.BMW_PROMOTIONS_API.redeemCoupon === 'function') {
            window.BMW_PROMOTIONS_API.redeemCoupon(newOrder.couponCode, newOrder.orderId);
        }

        // Trừ kho an toàn & Chặn trừ kho hai lần (Requirement 8)
        if (window.BMW_PRODUCTS_API && typeof window.BMW_PRODUCTS_API.deductStock === 'function') {
            const deductResult = window.BMW_PRODUCTS_API.deductStock(newOrder.items);
            if (deductResult && deductResult.success) {
                newOrder.inventoryDeducted = true;
            } else if (deductResult && !deductResult.success && options && options.strictStock) {
                return {
                    success: false,
                    error: 'INSUFFICIENT_STOCK',
                    message: deductResult.message
                };
            }
        }

        // Đưa lên đầu danh sách (đơn mới nhất trước)
        orders.unshift(newOrder);
        saveOrders(orders);
        return newOrder;
    }

    // ── 8. Query Orders ──────────────────────────────────────────────────────
    function getOrderById(orderId) {
        const orders = getOrders();
        return orders.find(o => String(o.orderId) === String(orderId)) || null;
    }

    function getOrdersForCurrentUser() {
        const all = getOrders();
        const currentUser = getCurrentUserObj();

        if (!currentUser) {
            // Khách vãng lai: chỉ hiển thị các đơn không gắn tài khoản thành viên
            return all.filter(o => !o.userAccount && !o.userId);
        }

        // Người dùng đã đăng nhập: chỉ xem đơn hàng của chính mình (Requirement 5)
        return all.filter(o => {
            if (o.userId && currentUser.id && String(o.userId) === String(currentUser.id)) return true;
            if (o.userAccount && (o.userAccount === currentUser.username || o.userAccount === currentUser.email)) return true;
            return false;
        });
    }

    // ── 9. Update Order Status with Validation (Requirement 3, 4, 7) ─────────
    function updateOrderStatus(orderId, newStatus, note = '', actor = '') {
        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return { success: false, message: 'Không tìm thấy mã đơn hàng.' };
        }

        // Kiểm tra tính hợp lệ của việc chuyển trạng thái
        const validation = canTransitionStatus(order.orderStatus, newStatus);
        if (!validation.allowed) {
            return { success: false, message: validation.message };
        }

        // Nếu chuyển sang Đã giao: tự động cập nhật COD sang paid
        const isDelivered = normalizeOrderStatus(newStatus) === 'Đã giao';
        if (isDelivered && order.paymentMethod === 'COD') {
            order.paymentStatus = PAYMENT_STATUS.PAID;
        }

        // Nếu chuyển sang Đã hủy: thực hiện quy trình hủy an toàn
        const isCancelled = normalizeOrderStatus(newStatus) === 'Đã hủy';
        if (isCancelled) {
            return cancelOrder(orderId, note || 'Hủy bởi quản trị viên / nhân viên', actor);
        }

        order.orderStatus = newStatus;
        order.updatedAt = new Date().toISOString();

        // Ghi nhận lịch sử trạng thái
        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
            status: newStatus,
            at: new Date().toISOString(),
            by: actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Quản trị viên'),
            note: note || `Cập nhật trạng thái sang "${newStatus}"`
        });

        saveOrders(orders);
        return { success: true, order: order };
    }

    // ── 10. Update Order Payment Status (Requirement 4 & 6) ───────────────────
    function updateOrderPaymentStatus(orderId, status, actor = '', note = '') {
        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return null;
        }

        order.paymentStatus = status;
        order.updatedAt = new Date().toISOString();

        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
            status: `Thanh toán: ${status}`,
            at: new Date().toISOString(),
            by: actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Admin'),
            note: note || `Cập nhật trạng thái thanh toán sang "${status}"`
        });

        saveOrders(orders);
        return order;
    }

    // ── 11. Cancel Order with Safe Restock (Requirement 7 & 8) ────────────────
    function cancelOrder(orderId, reason, actor = '') {
        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return { success: false, message: 'Order not found.' };
        }

        // Chặn tuyệt đối hủy đơn đã giao thành công (Requirement 7)
        const isDelivered = normalizeOrderStatus(order.orderStatus) === 'Đã giao' ||
                            order.orderStatus === ORDER_STATUS.DELIVERED ||
                            order.orderStatus === 'Đã giao đơn hàng';
        if (isDelivered) {
            return {
                success: false,
                message: 'This order has already been delivered and cannot be cancelled.'
            };
        }

        // Chặn hủy đơn đã bị hủy trước đó
        const isCancelled = normalizeOrderStatus(order.orderStatus) === 'Đã hủy' ||
                            order.orderStatus === ORDER_STATUS.CANCELLED ||
                            order.orderStatus === 'Đã hủy';
        if (isCancelled) {
            return {
                success: false,
                message: 'This order has already been cancelled.'
            };
        }

        order.orderStatus = ORDER_STATUS.CANCELLED; // 'Cancelled'
        order.cancellationReason = (reason || 'Customer requested cancellation').trim();
        order.cancelledAt = new Date().toISOString();
        order.updatedAt = new Date().toISOString();

        // Xử lý hoàn tiền an toàn: Nếu đã thanh toán trực tuyến (paid), chuyển sang refund_pending
        // Tuyệt đối không tự tuyên bố đã hoàn tiền xong nếu chưa có giao dịch hoàn tiền thực tế (Requirement 8)
        let refundNote = '';
        if (order.paymentStatus === PAYMENT_STATUS.PAID) {
            order.paymentStatus = PAYMENT_STATUS.REFUND_PENDING;
            refundNote = ' (Đơn đã thanh toán online. Đã ghi nhận yêu cầu hoàn tiền, chờ kế toán chuyển khoản thủ công).';
        } else {
            order.paymentStatus = PAYMENT_STATUS.CANCELLED;
        }

        // Xử lý hoàn kho nhất quán & CHỐNG CỘNG KHO HAI LẦN (Requirement 8)
        if (order.inventoryDeducted && !order.inventoryRestocked) {
            if (window.BMW_PRODUCTS_API && typeof window.BMW_PRODUCTS_API.restock === 'function') {
                window.BMW_PRODUCTS_API.restock(order.items);
            }
            order.inventoryDeducted = false;
            order.inventoryRestocked = true;
        }

        // Hoàn lại lượt sử dụng mã giảm giá đúng 1 lần (Requirement E)
        let couponRefundNote = '';
        if (order.couponCode && !order.couponRefunded) {
            if (window.BMW_PROMOTIONS_API && typeof window.BMW_PROMOTIONS_API.refundCoupon === 'function') {
                window.BMW_PROMOTIONS_API.refundCoupon(order.couponCode, order.orderId);
            }
            order.couponRefunded = true;
            couponRefundNote = ` (Đã hoàn lại 1 lượt sử dụng cho mã ${order.couponCode}).`;
        }

        // Ghi nhận lịch sử trạng thái
        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
            status: 'Cancelled',
            at: new Date().toISOString(),
            by: actor || (order.userAccount ? `@${order.userAccount}` : 'Khách hàng'),
            note: `Hủy đơn hàng: ${order.cancellationReason}${refundNote}${couponRefundNote}`
        });

        saveOrders(orders);
        return { success: true, order: order };
    }

    // ── 12. Return / Exchange Request for Delivered Orders (Requirement 5 & 7) ─
    function requestReturn(orderId, returnReason, details = '', actor = '') {
        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return { success: false, message: 'Không tìm thấy đơn hàng.' };
        }

        const isDelivered = normalizeOrderStatus(order.orderStatus) === 'Đã giao' ||
                            order.orderStatus === 'Delivered';
        if (!isDelivered) {
            return {
                success: false,
                message: 'Chỉ đơn hàng đã giao thành công mới có thể gửi yêu cầu Đổi / Trả hàng.'
            };
        }

        order.orderStatus = ORDER_STATUS.RETURN_REQUESTED; // 'Yêu cầu đổi trả'
        order.updatedAt = new Date().toISOString();
        order.returnRequest = {
            reason: (returnReason || 'Yêu cầu đổi / trả hàng').trim(),
            details: (details || '').trim(),
            requestedAt: new Date().toISOString(),
            status: 'pending_review'
        };

        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
            status: ORDER_STATUS.RETURN_REQUESTED,
            at: new Date().toISOString(),
            by: actor || (order.userAccount ? `@${order.userAccount}` : 'Khách hàng'),
            note: `Gửi yêu cầu đổi trả: ${order.returnRequest.reason} (${order.returnRequest.details})`
        });

        saveOrders(orders);
        return { success: true, order: order };
    }

    // ── 13. Approve Return Request (Phase 8.7) ──────────────────────────────
    function approveReturnRequest(orderId, note = '', actor = '') {
        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return { success: false, message: 'Không tìm thấy đơn hàng.' };
        }

        const isReturnReq = normalizeOrderStatus(order.orderStatus) === 'Yêu cầu đổi trả' ||
                            order.orderStatus === ORDER_STATUS.RETURN_REQUESTED ||
                            Boolean(order.returnRequest);
        if (!isReturnReq) {
            return { success: false, message: 'Đơn hàng không ở trạng thái yêu cầu đổi trả.' };
        }

        if (!order.returnRequest) {
            order.returnRequest = { reason: 'Yêu cầu đổi trả', details: '', requestedAt: new Date().toISOString() };
        }

        order.returnRequest.status = 'approved';
        order.returnRequest.approvedAt = new Date().toISOString();
        order.returnRequest.approvedBy = actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Nhân viên');
        order.returnRequest.staffNote = (note || 'Đã chấp thuận yêu cầu đổi trả hàng').trim();

        order.orderStatus = ORDER_STATUS.RETURNED; // 'Đã trả hàng'
        order.updatedAt = new Date().toISOString();

        // Hoàn kho an toàn nếu đã trừ kho trước đó và chưa hoàn lại
        if (order.inventoryDeducted && !order.inventoryRestocked) {
            if (window.BMW_PRODUCTS_API && typeof window.BMW_PRODUCTS_API.restock === 'function') {
                window.BMW_PRODUCTS_API.restock(order.items);
            }
            order.inventoryDeducted = false;
            order.inventoryRestocked = true;
        }

        // Tài chính an toàn: Nếu đơn đã thanh toán, chuyển sang refund_pending (chờ chuyển khoản thực tế)
        // Tuyệt đối không tự xác nhận refunded nếu chưa có giao dịch thật!
        let paymentNote = '';
        if (order.paymentStatus === PAYMENT_STATUS.PAID) {
            order.paymentStatus = PAYMENT_STATUS.REFUND_PENDING;
            paymentNote = ' (Đơn đã thanh toán online. Đã ghi nhận yêu cầu hoàn tiền, chờ chuyển khoản thủ công).';
        } else {
            order.paymentStatus = PAYMENT_STATUS.CANCELLED;
        }

        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
            status: ORDER_STATUS.RETURNED,
            at: new Date().toISOString(),
            by: actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Nhân viên'),
            note: `Chấp thuận đổi trả hàng: ${order.returnRequest.staffNote}${paymentNote}`
        });

        saveOrders(orders);
        return { success: true, order: order };
    }

    // ── 14. Reject Return Request (Phase 8.7) ───────────────────────────────
    function rejectReturnRequest(orderId, rejectionReason = '', actor = '') {
        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return { success: false, message: 'Không tìm thấy đơn hàng.' };
        }

        const reason = (rejectionReason || 'Không đáp ứng điều kiện đổi trả theo chính sách BMW GYM').trim();
        if (!order.returnRequest) {
            order.returnRequest = { reason: 'Yêu cầu đổi trả', details: '', requestedAt: new Date().toISOString() };
        }

        order.returnRequest.status = 'rejected';
        order.returnRequest.rejectedAt = new Date().toISOString();
        order.returnRequest.rejectedBy = actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Nhân viên');
        order.returnRequest.rejectionReason = reason;

        // Hoàn lại trạng thái Đã giao thành công
        order.orderStatus = ORDER_STATUS.DELIVERED;
        order.updatedAt = new Date().toISOString();

        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
            status: ORDER_STATUS.DELIVERED,
            at: new Date().toISOString(),
            by: actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Nhân viên'),
            note: `Từ chối yêu cầu đổi trả: ${reason}`
        });

        saveOrders(orders);
        return { success: true, order: order };
    }

    // ── 15. Confirm Real Refund Transaction (Phase 8.7) ─────────────────────
    function confirmRefundTransaction(orderId, transactionRef, actor = '', note = '') {
        const cleanRef = (transactionRef || '').trim();
        if (!cleanRef) {
            return { success: false, message: 'Vui lòng nhập mã giao dịch ngân hàng hoặc bằng chứng hoàn tiền thực tế.' };
        }

        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return { success: false, message: 'Không tìm thấy đơn hàng.' };
        }

        if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
            return { success: false, message: 'Đơn hàng này đã được xác nhận hoàn tiền trước đó.' };
        }

        order.paymentStatus = PAYMENT_STATUS.REFUNDED;
        order.refundTransaction = {
            transactionRef: cleanRef,
            confirmedAt: new Date().toISOString(),
            confirmedBy: actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Kế toán / Quản trị viên'),
            note: (note || '').trim()
        };
        order.refundTransactionRef = cleanRef;
        order.updatedAt = new Date().toISOString();

        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
            status: 'Thanh toán: Đã hoàn tiền',
            at: new Date().toISOString(),
            by: actor || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Kế toán'),
            note: `Xác nhận giao dịch chuyển khoản hoàn tiền thành công (Mã GD: ${cleanRef})`
        });

        saveOrders(orders);
        return { success: true, order: order };
    }

    // ── 16. Internal Notes for Admin & Staff (Requirement 4 & 10) ────────────
    function addInternalNote(orderId, noteText, author = '') {
        if (!noteText || !noteText.trim()) {
            return { success: false, message: 'Nội dung ghi chú không được để trống.' };
        }

        const orders = getOrders();
        const order = orders.find(o => String(o.orderId) === String(orderId));
        if (!order) {
            return { success: false, message: 'Không tìm thấy đơn hàng.' };
        }

        if (!Array.isArray(order.internalNotes)) {
            order.internalNotes = [];
        }

        const noteObj = {
            id: 'n_' + Date.now(),
            text: noteText.trim(),
            at: new Date().toISOString(),
            by: author || (getCurrentUserEmail() ? `@${getCurrentUserEmail()}` : 'Nhân viên')
        };

        order.internalNotes.push(noteObj);
        order.updatedAt = new Date().toISOString();
        saveOrders(orders);
        return { success: true, note: noteObj, order: order };
    }

    // ── 17. Sync Orders on User Update (Phase 8.1 compatibility) ─────────────
    function syncUserOrders(userId, oldUsername, newUsername) {
        if (!oldUsername && !userId) return false;
        const orders = getOrders();
        let modified = false;

        orders.forEach(order => {
            const matchesUser = (userId && order.userId && String(order.userId) === String(userId)) ||
                                (oldUsername && order.userAccount === oldUsername);
            if (matchesUser) {
                if (newUsername) {
                    order.userAccount = newUsername;
                }
                if (userId && !order.userId) {
                    order.userId = userId;
                }
                order.updatedAt = new Date().toISOString();
                modified = true;
            }
        });

        if (modified) {
            saveOrders(orders);
        }
        return modified;
    }

    // ── 18. Export API to Window ─────────────────────────────────────────────
    if (typeof window !== 'undefined') {
        window.BMW_ORDERS_API = {
            getOrders: getOrders,
            saveOrders: saveOrders,
            createOrder: createOrder,
            getOrderById: getOrderById,
            getOrdersForCurrentUser: getOrdersForCurrentUser,
            updateOrderStatus: updateOrderStatus,
            updateOrderPaymentStatus: updateOrderPaymentStatus,
            cancelOrder: cancelOrder,
            requestReturn: requestReturn,
            approveReturnRequest: approveReturnRequest,
            rejectReturnRequest: rejectReturnRequest,
            confirmRefundTransaction: confirmRefundTransaction,
            addInternalNote: addInternalNote,
            canTransitionStatus: canTransitionStatus,
            normalizeOrderStatus: normalizeOrderStatus,
            checkStockBeforeOrder: checkStockBeforeOrder,
            syncUserOrders: syncUserOrders,
            ORDER_STATUS: ORDER_STATUS,
            PAYMENT_STATUS: PAYMENT_STATUS,
            VALID_STATUS_TRANSITIONS: VALID_STATUS_TRANSITIONS
        };
    }
})();
