// js/checkout.js - BMW Gym Checkout Page Logic (Phase 8.6 Integrated)

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('checkout-page-container');
    if (!container) return;

    // Lấy giỏ hàng
    const cart = (typeof getCart === 'function') ? getCart() : [];
    
    // If cart is empty, show empty state
    if (!cart || cart.length === 0) {
        container.innerHTML = `
            <div class="checkout-card checkout-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>
                <h2>GIỎ HÀNG CỦA BẠN ĐANG TRỐNG</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">Vui lòng thêm sản phẩm vào giỏ hàng trước khi tiến hành thanh toán.</p>
                <a href="shop.html" class="button blue">TIẾP TỤC MUA SẮM</a>
            </div>
        `;
        return;
    }

    // Calculate cart metrics
    let subtotal = 0;
    let totalItems = 0;
    const itemsSnapshot = [];

    cart.forEach(item => {
        const itemPriceNum = parsePrice(item.price);
        const itemQty = parseInt(item.quantity, 10) || 1;
        const itemTotal = itemPriceNum * itemQty;
        subtotal += itemTotal;
        totalItems += itemQty;

        itemsSnapshot.push({
            id: item.id,
            name: item.name,
            price: item.price,
            priceNumber: itemPriceNum,
            quantity: itemQty,
            image: item.image,
            category: item.category || 'BMW Gear',
            itemTotal: itemTotal
        });
    });

    const shippingFee = (subtotal >= 1500000 || subtotal === 0) ? 0 : 35000;

    // ── Coupon State ────────────────────────────────────────────────────────
    let appliedCoupon = null; // { code, name, discountPercent, discountAmount, scope, category }

    // Check if coupon pre-saved in sessionStorage (e.g. from homepage click)
    const initialSavedCoupon = sessionStorage.getItem('bmw_applied_coupon');
    if (initialSavedCoupon && window.BMW_PROMOTIONS_API) {
        const valRes = window.BMW_PROMOTIONS_API.validateCoupon(initialSavedCoupon, itemsSnapshot, subtotal);
        if (valRes && valRes.valid) {
            appliedCoupon = {
                code: valRes.coupon.code,
                name: valRes.coupon.name,
                discountPercent: valRes.discountPercent,
                discountAmount: valRes.discountAmount,
                scope: valRes.coupon.scope,
                category: valRes.coupon.category
            };
        } else {
            sessionStorage.removeItem('bmw_applied_coupon');
        }
    }

    function calculateFinalTotal() {
        const discountVal = appliedCoupon ? appliedCoupon.discountAmount : 0;
        return Math.max(0, subtotal - discountVal + shippingFee);
    }

    let finalTotal = calculateFinalTotal();

    // Auto-fill customer info if logged in
    let defaultName = '';
        let defaultPhone = '';
    let defaultPhoneWasPrefixed = false;
    let parsedPhoneVal = '';
    let defaultDialCode = '+84';
    try {
        const rawSession = sessionStorage.getItem('bmw_current_user') || localStorage.getItem('bmw_current_user');
        if (rawSession) {
            const user = JSON.parse(rawSession);
            if (user) {
                defaultName = user.fullName || user.fullname || user.username || '';
                                defaultPhone = user.phone || '';
                if (window.BMW_PHONE_UTILS) {
                    const parsed = window.BMW_PHONE_UTILS.parsePhoneNumber(defaultPhone);
                    defaultDialCode = parsed.dialCode;
                    parsedPhoneVal = parsed.phone;
                    defaultPhoneWasPrefixed = parsed.hasPrefix;
                } else {
                    parsedPhoneVal = defaultPhone;
                }
            }
        }
    } catch (e) {}

    // Render Checkout Layout
    container.innerHTML = `
        <div class="checkout-grid">
            <!-- Customer Shipping Form -->
            <div class="checkout-card">
                <h2>THÔNG TIN GIAO HÀNG</h2>
                <form id="checkout-form" novalidate>
                    <div class="form-group">
                        <label for="checkout-fullname">Họ và tên <span class="req">*</span></label>
                        <input type="text" id="checkout-fullname" name="fullName" value="${defaultName}" placeholder="Nhập họ và tên người nhận" autocomplete="name">
                        <div class="field-error" id="error-fullname">Vui lòng nhập họ và tên người nhận.</div>
                    </div>

                    <div class="form-group">
                        <label for="checkout-phone">Số điện thoại <span class="req">*</span></label>
                        <div class="phone-input-group">
                            <select id="checkout-phone-code" class="phone-country-code" aria-label="Mã quốc gia"></select>
                            <input type="tel" id="checkout-phone" name="phone" value="${parsedPhoneVal}" placeholder="Nhập số điện thoại" autocomplete="tel">
                        </div>
                        <div class="field-error" id="error-phone">Số điện thoại không hợp lệ.</div>
                    </div>

                    <div class="form-group">
                        <label for="checkout-address">Địa chỉ giao hàng <span class="req">*</span></label>
                        <input type="text" id="checkout-address" name="address" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..." autocomplete="street-address">
                        <div class="field-error" id="error-address">Vui lòng nhập địa chỉ nhận hàng của bạn.</div>
                    </div>

                    <div class="form-group">
                        <label for="checkout-notes">Ghi chú đơn hàng (Không bắt buộc)</label>
                        <textarea id="checkout-notes" name="notes" rows="3" placeholder="Ghi chú thời gian nhận hàng mong muốn, hướng dẫn đường đi, v.v..."></textarea>
                    </div>

                    <h2 style="margin-top: 36px;">PHƯƠNG THỨC THANH TOÁN</h2>
                    <div class="payment-methods">
                        <label class="payment-method-card active" id="pm-card-qr">
                            <div class="pm-header">
                                <input type="radio" name="paymentMethod" value="QR" class="pm-radio" checked>
                                <span>Chuyển khoản ngân hàng (Quét mã MB Bank QR)</span>
                            </div>
                            <div class="pm-desc">Quét mã QR bằng ứng dụng ngân hàng hoặc VNPAY để thanh toán tức thì.</div>
                        </label>

                        <label class="payment-method-card" id="pm-card-cod">
                            <div class="pm-header">
                                <input type="radio" name="paymentMethod" value="COD" class="pm-radio">
                                <span>Thanh toán khi nhận hàng (COD)</span>
                            </div>
                            <div class="pm-desc">Thanh toán tiền mặt trực tiếp khi nhận và kiểm tra kiện hàng.</div>
                        </label>
                    </div>

                    <!-- Payment Preview Area -->
                    <div id="checkout-payment-details"></div>

                    <button type="submit" class="btn-confirm-checkout" id="btn-submit-order">
                        XÁC NHẬN &amp; ĐẶT HÀNG →
                    </button>
                </form>
            </div>

            <!-- Order Summary -->
            <div class="checkout-card">
                <h2>TỔNG QUAN ĐƠN HÀNG (${totalItems} SẢN PHẨM)</h2>
                <div class="summary-items-list">
                    ${itemsSnapshot.map(item => `
                        <div class="summary-item-row">
                            <img src="${item.image}" alt="${item.name}" class="summary-item-img">
                            <div class="summary-item-info">
                                <div class="summary-item-name" title="${item.name}">${item.name}</div>
                                <div class="summary-item-meta">Giá: ${item.price} × ${item.quantity}</div>
                            </div>
                            <div class="summary-item-total">${formatVND(item.itemTotal)}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- ── Coupon Code Area (Phase 8.6) ──────────────────────── -->
                <div class="checkout-coupon-section" style="margin: 20px 0; padding: 16px; background: rgba(37, 99, 235, 0.05); border: 1px dashed rgba(37, 99, 235, 0.35); border-radius: 8px;">
                    <label for="checkout-coupon-input" style="display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; color: var(--accent-blue, #2563eb);">
                        🎟 MÃ GIẢM GIÁ / VOUCHER (6 KÝ TỰ)
                    </label>
                    <div id="coupon-input-box" style="display: flex; gap: 8px;">
                        <input type="text" id="checkout-coupon-input" placeholder="VD: AB12CD" maxlength="6" 
                               value="${appliedCoupon ? appliedCoupon.code : ''}"
                               style="text-transform: uppercase; font-family: monospace; font-weight: 700; letter-spacing: 1px; flex: 1; padding: 9px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; font-size: 14px;">
                        <button type="button" id="btn-apply-coupon" class="button blue" style="padding: 9px 16px; font-size: 13px; font-weight: 700; border-radius: 6px; cursor: pointer;">
                            ÁP DỤNG
                        </button>
                    </div>

                    <!-- Applied Badge -->
                    <div id="coupon-applied-badge" style="display: ${appliedCoupon ? 'flex' : 'none'}; align-items: center; justify-content: space-between; margin-top: 10px; padding: 8px 12px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px;">
                        <div style="font-size: 13px; color: #10b981; font-weight: 700;">
                            ✓ Đã áp dụng: <span id="applied-code-text" style="font-family: monospace; letter-spacing: 1px;">${appliedCoupon ? appliedCoupon.code : ''}</span>
                            <span id="applied-name-text" style="font-size: 11px; font-weight: normal; color: var(--text-secondary); margin-left: 6px;">${appliedCoupon ? `(${appliedCoupon.name})` : ''}</span>
                        </div>
                        <button type="button" id="btn-remove-coupon" style="background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: underline;">
                            Gỡ bỏ
                        </button>
                    </div>

                    <div id="coupon-feedback-msg" style="margin-top: 8px; font-size: 12px; line-height: 1.4; display: none;"></div>

                    <!-- Quick Pick Available Vouchers -->
                    <div id="checkout-quick-coupons" style="margin-top: 12px;"></div>
                </div>

                <div class="checkout-totals-row">
                    <span>Tạm tính</span>
                    <span>${formatVND(subtotal)}</span>
                </div>

                <!-- Discount Row -->
                <div class="checkout-totals-row" id="row-coupon-discount" style="display: ${appliedCoupon ? 'flex' : 'none'};">
                    <span id="label-coupon-discount" style="color: #ef4444;">Giảm giá coupon (${appliedCoupon ? `-${appliedCoupon.discountPercent}%` : ''})</span>
                    <span id="val-coupon-discount" style="color: #ef4444; font-weight: 800;">${appliedCoupon ? `-${formatVND(appliedCoupon.discountAmount)}` : '0₫'}</span>
                </div>

                <div class="checkout-totals-row">
                    <span>Phí vận chuyển</span>
                    <span>${shippingFee === 0 ? '<strong style="color: #10B981">MIỄN PHÍ</strong>' : formatVND(shippingFee)}</span>
                </div>

                <div class="checkout-totals-final">
                    <span>TỔNG CỘNG</span>
                    <span class="final-amount" id="checkout-final-amount">${formatVND(finalTotal)}</span>
                </div>
            </div>
        </div>
    `;

    // Render payment detail preview (QR vs COD)
    const paymentDetailsEl = document.getElementById('checkout-payment-details');
    const config = window.BMW_PAYMENT_CONFIG || {
        bankName: "MB Bank",
        accountNumber: "0355278900",
        accountHolder: "PHAM QUOC TU",
        qrImageLocal: "images/banking/qr-banking.jpg"
    };

    function renderPaymentPreview(method) {
        if (!paymentDetailsEl) return;
        finalTotal = calculateFinalTotal();
        if (method === 'QR') {
            paymentDetailsEl.innerHTML = `
                <div class="checkout-qr-preview-box" id="checkout-qr-box">
                    <div style="font-size: 13px; font-weight: 800; color: var(--accent-blue, #2563EB); margin-bottom: 12px; letter-spacing: 0.05em;">
                        MÃ QR CHUYỂN KHOẢN NGÂN HÀNG
                    </div>
                    <div class="checkout-qr-img-wrapper">
                        <img 
                            id="checkout-qr-img" 
                            class="checkout-qr-img" 
                            src="${config.qrImageLocal}" 
                            alt="MÃ QR CHUYỂN KHOẢN NGÂN HÀNG ${config.accountHolder}"
                            onerror="this.style.display='none'; document.getElementById('checkout-qr-error').style.display='block';"
                        >
                        <div id="checkout-qr-error" class="checkout-qr-fallback">
                            Không thể tải mã QR. Vui lòng chuyển khoản trực tiếp theo thông tin ngân hàng bên dưới hoặc liên hệ hỗ trợ.
                        </div>
                    </div>
                    <div class="checkout-qr-meta">
                        <div>Ngân hàng: <strong>${config.bankName}</strong></div>
                        <div>Số tài khoản: <strong>${config.accountNumber}</strong></div>
                        <div>Chủ tài khoản: <strong>${config.accountHolder}</strong></div>
                        <div style="margin-top: 8px; font-size: 11px; color: var(--text-secondary, #64748b);">
                            Quét mã QR này bằng ứng dụng ngân hàng hoặc VNPAY để thanh toán nhanh.
                        </div>
                    </div>
                </div>
            `;
        } else {
            paymentDetailsEl.innerHTML = `
                <div class="checkout-cod-info-box" id="checkout-cod-box">
                    <strong style="color: var(--text-primary, #0f172a); display: block; margin-bottom: 6px;">
                        ✓ THANH TOÁN KHI NHẬN HÀNG (COD)
                    </strong>
                    Bạn sẽ thanh toán <strong>${formatVND(finalTotal)}</strong> tiền mặt trực tiếp cho nhân viên giao hàng khi nhận kiện hàng. Không cần chuyển khoản trước.
                </div>
            `;
        }
    }

    // Radio change visual handler
    const pmCards = container.querySelectorAll('.payment-method-card');
    const radios = container.querySelectorAll('.pm-radio');
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            pmCards.forEach(card => card.classList.remove('active'));
            const parent = radio.closest('.payment-method-card');
            if (parent) parent.classList.add('active');
            renderPaymentPreview(radio.value);
        });
    });

    // Initial render preview (default is QR)
    renderPaymentPreview('QR');

    // Initialize phone country code dropdown for checkout
    const checkoutPhoneCodeEl = document.getElementById('checkout-phone-code');
    if (checkoutPhoneCodeEl && window.BMW_PHONE_UTILS) {
        window.BMW_PHONE_UTILS.populateCountrySelect(checkoutPhoneCodeEl, defaultDialCode);
    }

    // ── Coupon Interaction Handlers ─────────────────────────────────────────
    const couponInput = document.getElementById('checkout-coupon-input');
    const btnApplyCoupon = document.getElementById('btn-apply-coupon');
    const couponFeedbackMsg = document.getElementById('coupon-feedback-msg');
    const couponAppliedBadge = document.getElementById('coupon-applied-badge');
    const appliedCodeText = document.getElementById('applied-code-text');
    const appliedNameText = document.getElementById('applied-name-text');
    const btnRemoveCoupon = document.getElementById('btn-remove-coupon');
    const rowCouponDiscount = document.getElementById('row-coupon-discount');
    const labelCouponDiscount = document.getElementById('label-coupon-discount');
    const valCouponDiscount = document.getElementById('val-coupon-discount');
    const finalAmountEl = document.getElementById('checkout-final-amount');
    const quickCouponsContainer = document.getElementById('checkout-quick-coupons');

    function showCouponMessage(text, isError = false) {
        if (!couponFeedbackMsg) return;
        couponFeedbackMsg.textContent = text;
        couponFeedbackMsg.style.display = 'block';
        couponFeedbackMsg.style.color = isError ? '#ef4444' : '#10b981';
    }

    function hideCouponMessage() {
        if (!couponFeedbackMsg) return;
        couponFeedbackMsg.style.display = 'none';
        couponFeedbackMsg.textContent = '';
    }

    function updateTotalsUI() {
        finalTotal = calculateFinalTotal();
        if (finalAmountEl) {
            finalAmountEl.textContent = formatVND(finalTotal);
        }

        if (appliedCoupon) {
            if (rowCouponDiscount) rowCouponDiscount.style.display = 'flex';
            if (labelCouponDiscount) labelCouponDiscount.textContent = `Giảm giá coupon (${appliedCoupon.code} -${appliedCoupon.discountPercent}%)`;
            if (valCouponDiscount) valCouponDiscount.textContent = `-${formatVND(appliedCoupon.discountAmount)}`;
            if (couponAppliedBadge) couponAppliedBadge.style.display = 'flex';
            if (appliedCodeText) appliedCodeText.textContent = appliedCoupon.code;
            if (appliedNameText) appliedNameText.textContent = `(${appliedCoupon.name})`;
        } else {
            if (rowCouponDiscount) rowCouponDiscount.style.display = 'none';
            if (couponAppliedBadge) couponAppliedBadge.style.display = 'none';
        }

        // Update payment preview with new total
        const currentMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value || 'QR';
        renderPaymentPreview(currentMethod);
    }

    function applyCouponCode(rawCode) {
        hideCouponMessage();
        if (!rawCode || !rawCode.trim()) {
            showCouponMessage('Vui lòng nhập mã giảm giá.', true);
            return;
        }

        const code = rawCode.trim().toUpperCase();

        // Check if same coupon already applied
        if (appliedCoupon && appliedCoupon.code === code) {
            showCouponMessage(`Mã "${code}" đã được áp dụng cho đơn hàng hiện tại.`, true);
            return;
        }

        if (!window.BMW_PROMOTIONS_API) {
            showCouponMessage('Hệ thống khuyến mãi tạm thời không sẵn sàng.', true);
            return;
        }

        // Validate coupon with engine
        const validation = window.BMW_PROMOTIONS_API.validateCoupon(code, itemsSnapshot, subtotal);
        if (!validation.valid) {
            showCouponMessage(validation.message || 'Mã không hợp lệ hoặc không đủ điều kiện sử dụng.', true);
            return;
        }

        // Apply coupon
        appliedCoupon = {
            code: validation.coupon.code,
            name: validation.coupon.name,
            discountPercent: validation.discountPercent,
            discountAmount: validation.discountAmount,
            scope: validation.coupon.scope,
            category: validation.coupon.category
        };

        sessionStorage.setItem('bmw_applied_coupon', validation.coupon.code);
        showCouponMessage(`✓ ${validation.message}`, false);
        updateTotalsUI();
    }

    function removeCoupon() {
        appliedCoupon = null;
        sessionStorage.removeItem('bmw_applied_coupon');
        if (couponInput) couponInput.value = '';
        hideCouponMessage();
        updateTotalsUI();
    }

    if (btnApplyCoupon && couponInput) {
        btnApplyCoupon.addEventListener('click', (e) => {
            e.preventDefault();
            applyCouponCode(couponInput.value);
        });

        couponInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCouponCode(couponInput.value);
            }
        });
    }

    if (btnRemoveCoupon) {
        btnRemoveCoupon.addEventListener('click', (e) => {
            e.preventDefault();
            removeCoupon();
        });
    }

    // Render Quick Pick Coupons for active public vouchers
    function renderQuickCoupons() {
        if (!quickCouponsContainer || !window.BMW_PROMOTIONS_API) return;
        const all = window.BMW_PROMOTIONS_API.getPromotions();
        const available = all.filter(p => {
            const st = window.BMW_PROMOTIONS_API.computePromotionStatus(p);
            return st === 'ACTIVE' && p.isActive !== false;
        }).slice(0, 4);

        if (available.length === 0) {
            quickCouponsContainer.innerHTML = '';
            return;
        }

        quickCouponsContainer.innerHTML = `
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600;">Gợi ý mã giảm giá khả dụng:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${available.map(p => `
                    <button type="button" class="btn-quick-coupon" data-code="${p.code}" 
                            title="${p.name} - Giảm ${p.discountPercent}%"
                            style="padding: 4px 8px; font-size: 11px; font-family: monospace; font-weight: 700; background: rgba(37, 99, 235, 0.1); border: 1px dashed rgba(37, 99, 235, 0.4); color: var(--accent-blue, #2563eb); border-radius: 4px; cursor: pointer;">
                        🏷 ${p.code} (-${p.discountPercent}%)
                    </button>
                `).join('')}
            </div>
        `;

        quickCouponsContainer.querySelectorAll('.btn-quick-coupon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const code = btn.getAttribute('data-code');
                if (couponInput) couponInput.value = code;
                applyCouponCode(code);
            });
        });
    }

    renderQuickCoupons();

    // ── Form validation & submission ─────────────────────────────────────────
    const form = document.getElementById('checkout-form');
    const submitBtn = document.getElementById('btn-submit-order');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullnameInput = document.getElementById('checkout-fullname');
        const phoneInput = document.getElementById('checkout-phone');
        const addressInput = document.getElementById('checkout-address');
        const notesInput = document.getElementById('checkout-notes');

        const errFullname = document.getElementById('error-fullname');
        const errPhone = document.getElementById('error-phone');
        const errAddress = document.getElementById('error-address');

        let isValid = true;

        // 1. Validate full name
        const fullnameVal = fullnameInput.value.trim();
        if (!fullnameVal) {
            errFullname.style.display = 'block';
            fullnameInput.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            errFullname.style.display = 'none';
            fullnameInput.style.borderColor = '';
        }

        // 2. Validate Phone with Country Code (Phase 8.8)
        const phoneVal = phoneInput.value.trim();
        const phoneCodeEl = document.getElementById('checkout-phone-code');
        const dialCode = phoneCodeEl ? phoneCodeEl.value : '+84';
        let phoneToSave = phoneVal;

        if (window.BMW_PHONE_UTILS) {
            const phoneRes = window.BMW_PHONE_UTILS.validatePhone(dialCode, phoneVal, true);
            if (!phoneRes.valid) {
                errPhone.textContent = phoneRes.message;
                errPhone.style.display = 'block';
                phoneInput.style.borderColor = '#ef4444';
                isValid = false;
            } else {
                errPhone.style.display = 'none';
                phoneInput.style.borderColor = '';
                phoneToSave = window.BMW_PHONE_UTILS.formatPhoneToSave(dialCode, phoneVal, defaultPhoneWasPrefixed);
            }
        } else {
            const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
            if (!phoneVal || !phoneRegex.test(phoneVal.replace(/\s+/g, ''))) {
                errPhone.textContent = 'Số điện thoại không hợp lệ (10 chữ số).';
                errPhone.style.display = 'block';
                phoneInput.style.borderColor = '#ef4444';
                isValid = false;
            } else {
                errPhone.style.display = 'none';
                phoneInput.style.borderColor = '';
            }
        }

        // 3. Validate Address
        const addressVal = addressInput.value.trim();
        if (!addressVal) {
            errAddress.style.display = 'block';
            addressInput.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            errAddress.style.display = 'none';
            addressInput.style.borderColor = '';
        }

        if (!isValid) return;

        // Anti-spam & Cooldown (Requirement 9)
        const lastOrderTime = sessionStorage.getItem('bmw_last_order_timestamp');
        const now = Date.now();
        if (lastOrderTime && (now - Number(lastOrderTime)) < 3000) {
            alert('Hệ thống đang xử lý đơn hàng. Vui lòng chờ 3 giây trước khi thực hiện thao tác tiếp theo.');
            return;
        }

        // Recalculate final total right before submission
        finalTotal = calculateFinalTotal();

        // Duplicate submission detection (Requirement 9)
        if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.getOrders === 'function') {
            const existingOrders = window.BMW_ORDERS_API.getOrders();
            const recentDuplicate = existingOrders.find(o => {
                const isSamePhone = o.customer && (o.customer.phone === phoneVal || o.customer.phone === phoneToSave);
                const isSameTotal = Number(o.total) === Number(finalTotal);
                const orderTime = new Date(o.createdAt).getTime();
                return isSamePhone && isSameTotal && (now - orderTime) < 15000;
            });

            if (recentDuplicate) {
                const proceedAnyway = confirm(`Phát hiện đơn hàng #${recentDuplicate.orderId} có cùng thông tin vừa được tạo cách đây ít giây. Bạn có chắc chắn muốn đặt thêm đơn hàng mới không?`);
                if (!proceedAnyway) {
                    return;
                }
            }
        }

        // Inventory Stock Pre-check (Requirement 8 & 9)
        if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.checkStockBeforeOrder === 'function') {
            const stockCheck = window.BMW_ORDERS_API.checkStockBeforeOrder(itemsSnapshot);
            if (!stockCheck.success) {
                alert(stockCheck.message || 'Một số sản phẩm trong giỏ hàng hiện không đủ số lượng tồn kho.');
                return;
            }
        }

        // Prevent double click during processing
        submitBtn.disabled = true;
        submitBtn.textContent = 'ĐANG XỬ LÝ...';

        const selectedMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value || 'COD';

        // Tạo dữ liệu đơn hàng có kèm snapshot coupon thực tế (Requirement E & 8.6)
        const orderPayload = {
            customer: {
                fullName: fullnameVal,
                phone: phoneToSave,
                address: addressVal,
                notes: notesInput.value.trim()
            },
            items: itemsSnapshot,
            totalItems: totalItems,
            subtotal: subtotal,
            shippingFee: shippingFee,
            discount: appliedCoupon ? appliedCoupon.discountAmount : 0,
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            couponName: appliedCoupon ? appliedCoupon.name : null,
            couponDiscountPercent: appliedCoupon ? appliedCoupon.discountPercent : null,
            total: finalTotal,
            paymentMethod: selectedMethod
        };

        const newOrder = window.BMW_ORDERS_API.createOrder(orderPayload);
        sessionStorage.setItem('bmw_last_order_timestamp', String(now));

        // Clean up coupon session
        sessionStorage.removeItem('bmw_applied_coupon');

        // Xóa giỏ hàng chỉ sau khi tạo đơn thành công
        if (typeof clearCart === 'function') {
            clearCart();
        }

        // Điều hướng dựa trên phương thức thanh toán
        if (selectedMethod === 'QR') {
            window.location.href = `payment-qr.html?orderId=${newOrder.orderId}`;
        } else {
            window.location.href = `order-success.html?orderId=${newOrder.orderId}`;
        }
    });
});
