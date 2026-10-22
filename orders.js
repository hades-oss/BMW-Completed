// js/orders.js - BMW Orders List, Delivery Tracking Timeline, Order Cancellation & Return Request

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('orders-page-container');
    if (!container) return;

    let activeCancelOrderId = null;
    let activeReturnOrderId = null;

    function renderOrdersPage() {
        const orders = window.BMW_ORDERS_API.getOrdersForCurrentUser();

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="checkout-card checkout-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 9 9 6 9-6"/></svg>
                    <h2>BẠN CHƯA CÓ ĐƠN HÀNG NÀO</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 24px;">Khám phá trang phục & dụng cụ tập gym cao cấp để đặt đơn hàng đầu tiên của bạn.</p>
                    <a href="shop.html" class="button blue">BẮT ĐẦU MUA SẮM</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="orders-list">
                ${orders.map(order => createOrderCardHtml(order)).join('')}
            </div>

            <!-- Cancel Order Modal Dialog -->
            <div class="modal-overlay" id="cancel-order-modal">
                <div class="cancel-modal-card">
                    <h3>Lý do hủy đơn hàng</h3>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                        Vui lòng chọn hoặc nhập lý do để giúp chúng tôi nâng cao chất lượng dịch vụ:
                    </p>

                    <div class="cancel-reasons-list">
                        <label class="reason-radio-label">
                            <input type="radio" name="cancelReasonRadio" value="Tôi muốn thay đổi sản phẩm" checked>
                            <span>Tôi muốn thay đổi sản phẩm</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="cancelReasonRadio" value="Thông tin giao hàng không chính xác">
                            <span>Thông tin giao hàng không chính xác</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="cancelReasonRadio" value="Tôi muốn đổi phương thức thanh toán">
                            <span>Tôi muốn đổi phương thức thanh toán</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="cancelReasonRadio" value="Tôi không còn nhu cầu mua nữa">
                            <span>Tôi không còn nhu cầu mua nữa</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="cancelReasonRadio" value="Tìm thấy sản phẩm phù hợp hơn ở nơi khác">
                            <span>Tìm thấy sản phẩm phù hợp hơn ở nơi khác</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="cancelReasonRadio" value="Lý do khác">
                            <span>Lý do khác</span>
                        </label>
                    </div>

                    <textarea id="cancel-custom-input" class="cancel-custom-reason" rows="3" placeholder="Nhập lý do hủy đơn hàng của bạn..."></textarea>
                    <div id="cancel-error-msg" style="color: #ef4444; font-size: 11px; margin-top: 6px; display: none;">
                        Vui lòng cung cấp chi tiết cụ thể khi chọn "Lý do khác".
                    </div>

                    <div class="modal-actions-row">
                        <button type="button" class="button line" id="btn-close-modal">Quay lại</button>
                        <button type="button" class="button" style="background: #ef4444; color: #fff; border: none;" id="btn-confirm-cancel">Xác nhận hủy đơn</button>
                    </div>
                </div>
            </div>

            <!-- Return / Exchange Modal Dialog (Requirement 5 & 7) -->
            <div class="modal-overlay" id="return-order-modal">
                <div class="cancel-modal-card">
                    <h3>Yêu cầu Đổi / Trả hàng (Return & Exchange)</h3>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                        Đơn hàng đã được giao thành công. Vui lòng chọn lý do để bộ phận CSKH hỗ trợ quy trình đổi trả:
                    </p>

                    <div class="cancel-reasons-list">
                        <label class="reason-radio-label">
                            <input type="radio" name="returnReasonRadio" value="Sản phẩm bị lỗi / rách / hư hỏng do vận chuyển" checked>
                            <span>Sản phẩm bị lỗi hoặc hư hỏng do vận chuyển</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="returnReasonRadio" value="Giao sai mẫu hoặc sai kích cỡ (Size)">
                            <span>Giao sai kích cỡ hoặc mẫu mã</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="returnReasonRadio" value="Không vừa vặn, muốn đổi sang size khác">
                            <span>Mặc không vừa, muốn đổi size</span>
                        </label>
                        <label class="reason-radio-label">
                            <input type="radio" name="returnReasonRadio" value="Lý do khác">
                            <span>Lý do khác</span>
                        </label>
                    </div>

                    <textarea id="return-custom-input" class="cancel-custom-reason" rows="3" placeholder="Mô tả chi tiết tình trạng sản phẩm hoặc yêu cầu đổi size..."></textarea>

                    <div class="modal-actions-row">
                        <button type="button" class="button line" id="btn-close-return-modal">Hủy bỏ</button>
                        <button type="button" class="button blue" id="btn-confirm-return">Gửi yêu cầu đổi trả</button>
                    </div>
                </div>
            </div>
        `;

        attachEventListeners();
    }

    function getStatusDisplay(status) {
        switch (status) {
            case 'Chờ xác nhận':
            case 'Đã đặt hàng':
            case 'Order Placed': return 'Chờ xác nhận';
            case 'Đã xác nhận':
            case 'Confirmed': return 'Đã xác nhận';
            case 'Đang xử lý':
            case 'Chờ chuyển phát':
            case 'Awaiting Dispatch':
            case 'Processing': return 'Đang xử lý';
            case 'Đang đóng gói':
            case 'Packing': return 'Đang đóng gói';
            case 'Đã bàn giao vận chuyển':
            case 'Handed Over': return 'Đã bàn giao vận chuyển';
            case 'Đang giao hàng':
            case 'Đang trung chuyển':
            case 'In Transit': return 'Đang giao hàng';
            case 'Đã giao':
            case 'Đã giao đơn hàng':
            case 'Delivered': return 'Đã giao';
            case 'Đã hủy':
            case 'Cancelled': return 'Đã hủy';
            case 'Yêu cầu đổi trả':
            case 'Return Requested': return 'Yêu cầu đổi trả';
            case 'Đã trả hàng':
            case 'Returned': return 'Đã trả hàng';
            default: return status || 'Chờ xác nhận';
        }
    }

    function createOrderCardHtml(order) {
        const isCancelled = order.orderStatus === 'Cancelled' || order.orderStatus === 'Đã hủy';
        const isDelivered = order.orderStatus === 'Delivered' || order.orderStatus === 'Đã giao đơn hàng' || order.orderStatus === 'Đã giao';
        const isReturnRequested = order.orderStatus === 'Yêu cầu đổi trả' || order.orderStatus === 'Return Requested';

        // Order cancellation is ONLY permitted before shipping (Order Placed / Confirmed)
        const canCancel = !isCancelled && !isDelivered && !isReturnRequested && (
            order.orderStatus === 'Order Placed' || 
            order.orderStatus === 'Đã đặt hàng' || 
            order.orderStatus === 'Chờ xác nhận' || 
            order.orderStatus === 'Confirmed' || 
            order.orderStatus === 'Đã xác nhận'
        );

        // Can request return only after delivered
        const canRequestReturn = isDelivered && !isCancelled && !isReturnRequested;

        const displayStatus = getStatusDisplay(order.orderStatus);

        let badgeClass = 'badge-ordered';
        if (isCancelled) {
            badgeClass = 'badge-cancelled';
        } else if (isDelivered) {
            badgeClass = 'badge-delivered';
        } else if (isReturnRequested) {
            badgeClass = 'badge-dispatch';
        } else if (order.orderStatus === 'In Transit' || order.orderStatus === 'Đang trung chuyển' || order.orderStatus === 'Đang giao hàng') {
            badgeClass = 'badge-transit';
        } else if (order.orderStatus === 'Awaiting Dispatch' || order.orderStatus === 'Chờ chuyển phát' || order.orderStatus === 'Đang xử lý') {
            badgeClass = 'badge-dispatch';
        }

        // Payment status badge separate from delivery status (Requirement 6)
        let paymentBadge = `<span class="badge badge-pending">CHƯA THANH TOÁN</span>`;
        if (order.paymentStatus === 'paid') {
            paymentBadge = `<span class="badge badge-paid">ĐÃ THANH TOÁN</span>`;
        } else if (order.paymentStatus === 'refund_pending') {
            paymentBadge = `<span class="badge badge-pending" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a;">CHỜ HOÀN TIỀN</span>`;
        } else if (order.paymentStatus === 'refunded') {
            paymentBadge = `<span class="badge badge-paid" style="background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe;">ĐÃ HOÀN TIỀN</span>`;
        }

        // Timeline index (0 to 3)
        const timelineSteps = ['Chờ xác nhận', 'Đang xử lý', 'Đang giao hàng', 'Đã giao'];
        let activeIndex = 0;
        if (displayStatus === 'Chờ xác nhận') activeIndex = 0;
        else if (displayStatus === 'Đang xử lý' || displayStatus === 'Đang đóng gói' || displayStatus === 'Đã bàn giao vận chuyển') activeIndex = 1;
        else if (displayStatus === 'Đang giao hàng') activeIndex = 2;
        else if (displayStatus === 'Đã giao' || displayStatus === 'Yêu cầu đổi trả' || displayStatus === 'Đã trả hàng') activeIndex = 3;

        return `
            <article class="order-card" data-order-id="${order.orderId}">
                <!-- Header row -->
                <div class="order-header-row">
                    <div class="order-id-group">
                        <span class="order-id-code">${order.orderId}</span>
                        <span class="order-date-label">Ngày đặt: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div class="order-badges-group">
                        <span class="badge ${badgeClass}">${displayStatus}</span>
                        ${paymentBadge}
                    </div>
                </div>

                <!-- Preview summary row -->
                <div class="order-summary-row">
                    <div class="order-thumbnails-preview">
                        ${order.items.map(item => `
                            <img src="${item.image}" alt="${item.name}" class="order-thumb-img" title="${item.name} (${item.quantity})">
                        `).join('')}
                        <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-left: 8px;">
                            ${order.items.length} loại sản phẩm (${order.totalItems || 1} sản phẩm)
                        </span>
                    </div>
                    <div class="order-total-preview">
                        <span>TỔNG CỘNG:</span>
                        <strong>${(order.total || 0).toLocaleString('vi-VN')}₫</strong>
                    </div>
                </div>

                <!-- Order details drawer (expanded on click) -->
                <div class="order-details-drawer">
                    <!-- Delivery Tracking Timeline -->
                    ${!isCancelled ? `
                        <div class="tracking-timeline-box">
                            <div class="tracking-header">
                                <h3>THEO DÕI VẬN CHUYỂN</h3>
                                <span class="route-badge">${order.route?.name || 'TP. Hồ Chí Minh → Đà Nẵng'} (Mô phỏng)</span>
                            </div>

                            <div class="timeline-steps">
                                ${timelineSteps.map((step, idx) => {
                                    let cls = '';
                                    if (idx < activeIndex) cls = 'completed';
                                    else if (idx === activeIndex) cls = 'active';
                                    return `
                                        <div class="timeline-step ${cls}">
                                            <div class="step-dot">${idx < activeIndex ? '✓' : (idx + 1)}</div>
                                            <div class="step-label">${step}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>

                            <!-- Detailed shipping route checkpoints -->
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 18px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
                                <strong>Lộ trình chi tiết:</strong> ${order.route?.checkpoints ? order.route.checkpoints.join(' ➔ ') : 'Kho trung tâm ➔ Trạm trung chuyển ➔ Bưu cục phát'}
                            </div>

                            <!-- Status History Audit Trail (Requirement 1 & 10) -->
                            ${Array.isArray(order.statusHistory) && order.statusHistory.length > 0 ? `
                                <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Lịch sử trạng thái đơn hàng:</div>
                                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--text-secondary);">
                                        ${order.statusHistory.map(h => `
                                            <div>
                                                • <strong>${h.status}</strong> (${new Date(h.at).toLocaleDateString('vi-VN')} ${new Date(h.at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}): 
                                                <span>${h.note || ''}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Geolocation check button -->
                            <div style="margin-top: 16px;">
                                <button type="button" class="tracking-geo-btn" data-order="${order.orderId}">
                                    <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                    Vị trí của tôi (GPS)
                                </button>
                                <div class="geo-status-text" id="geo-status-${order.orderId}"></div>
                            </div>
                        </div>
                    ` : `
                        <div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; padding: 14px 18px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
                            <strong style="color: #ef4444;">ĐƠN HÀNG NÀY ĐÃ BỊ HỦY</strong>
                            <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0;">
                                Lý do: ${order.cancellationReason || 'Khách hàng yêu cầu hủy đơn'} (vào lúc ${new Date(order.cancelledAt || order.updatedAt).toLocaleString('vi-VN')})
                            </p>
                            ${order.paymentStatus === 'refund_pending' ? `
                                <div style="margin-top: 8px; font-size: 11.5px; color: #b45309; background: #fef3c7; padding: 6px 10px; border-radius: 4px;">
                                    <strong>Chờ hoàn tiền:</strong> Đơn hàng đã được thanh toán trực tuyến. Bộ phận kế toán đang đối soát sao kê để thực hiện hoàn tiền theo quy định.
                                </div>
                            ` : ''}
                        </div>
                    `}

                    <!-- Return Request notice if requested -->
                    ${isReturnRequested ? `
                        <div style="background: rgba(37, 99, 235, 0.08); border-left: 4px solid var(--accent-blue); padding: 14px 18px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
                            <strong style="color: var(--accent-blue);">YÊU CẦU ĐỔI / TRẢ HÀNG ĐÃ ĐƯỢC GỬI</strong>
                            <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0;">
                                Lý do: ${order.returnRequest?.reason || 'Khách hàng yêu cầu đổi trả'}. Chuyên viên CSKH BMW GYM sẽ liên hệ bạn qua SĐT <strong>${order.customer?.phone || ''}</strong> trong vòng 24h làm việc.
                            </p>
                        </div>
                    ` : ''}

                    <!-- Recipient Information -->
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
                        <div><strong>Người nhận:</strong> ${order.customer?.fullName || ''} — <strong>Số điện thoại:</strong> ${order.customer?.phone || ''}</div>
                        <div><strong>Địa chỉ:</strong> ${order.customer?.address || ''}</div>
                        <div><strong>Phương thức thanh toán:</strong> ${order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản QR ngân hàng (MB Bank)'} — <strong>Trạng thái thanh toán:</strong> ${order.paymentStatus === 'paid' ? 'Đã thanh toán' : (order.paymentStatus === 'refund_pending' ? 'Chờ hoàn tiền' : (order.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán'))}</div>
                        ${order.customer?.notes ? `<div><strong>Ghi chú:</strong> ${order.customer.notes}</div>` : ''}
                    </div>

                    <!-- Detailed Items List -->
                    <div class="order-detail-items">
                        ${order.items.map(item => `
                            <div class="detail-item-line">
                                <img src="${item.image}" alt="${item.name}" class="detail-item-img">
                                <div style="flex: 1;">
                                    <div style="font-size: 12px; font-weight: 800; color: var(--text-primary);">${item.name}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${item.price} × ${item.quantity}</div>
                                </div>
                                <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${(item.itemTotal || 0).toLocaleString('vi-VN')}₫</div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Action bar -->
                    <div class="order-action-bar">
                        ${order.paymentMethod === 'QR' && order.paymentStatus !== 'paid' && !isCancelled ? `
                            <a href="payment-qr.html?orderId=${order.orderId}" class="button blue" style="font-size: 11px; padding: 8px 14px;">
                                THANH TOÁN MÃ QR
                            </a>
                        ` : ''}

                        ${canCancel ? `
                            <button type="button" class="btn-cancel-order" data-order="${order.orderId}">
                                HỦY ĐƠN HÀNG
                            </button>
                        ` : ''}

                        ${canRequestReturn ? `
                            <button type="button" class="button line btn-request-return" data-order="${order.orderId}" style="font-size: 11px; padding: 8px 14px; border-color: var(--accent-blue); color: var(--accent-blue);">
                                YÊU CẦU ĐỔI / TRẢ HÀNG
                            </button>
                        ` : ''}
                    </div>
                </div>
            </article>
        `;
    }

    function attachEventListeners() {
        // Toggle expansion of order card
        container.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button, a, input, textarea')) return;
                card.classList.toggle('expanded');
            });
        });

        // GPS Geolocation Handler
        container.querySelectorAll('.tracking-geo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ordId = btn.getAttribute('data-order');
                const statusEl = document.getElementById(`geo-status-${ordId}`);
                if (!statusEl) return;

                statusEl.style.display = 'block';
                statusEl.textContent = 'Đang lấy tọa độ GPS từ trình duyệt...';

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const lat = pos.coords.latitude.toFixed(4);
                            const lng = pos.coords.longitude.toFixed(4);
                            statusEl.innerHTML = `Vị trí hiện tại của bạn: <strong>Vĩ độ ${lat}, Kinh độ ${lng}</strong> (Dùng để ước tính khoảng cách giao hàng).`;
                        },
                        (err) => {
                            statusEl.textContent = 'Quyền truy cập vị trí bị từ chối hoặc không khả dụng. Quá trình theo dõi đơn hàng vẫn tiếp tục bình thường.';
                        }
                    );
                } else {
                    statusEl.textContent = 'Trình duyệt không hỗ trợ Geolocation API.';
                }
            });
        });

        // Trigger Cancel Dialog
        container.querySelectorAll('.btn-cancel-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                activeCancelOrderId = btn.getAttribute('data-order');
                const modal = document.getElementById('cancel-order-modal');
                if (modal) modal.classList.add('show');
            });
        });

        // Close Cancel Dialog
        const closeBtn = document.getElementById('btn-close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = document.getElementById('cancel-order-modal');
                if (modal) modal.classList.remove('show');
                activeCancelOrderId = null;
            });
        }

        // Confirm Cancel Dialog
        const confirmBtn = document.getElementById('btn-confirm-cancel');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                if (!activeCancelOrderId) return;

                const selectedRadio = document.querySelector('input[name="cancelReasonRadio"]:checked')?.value;
                const customText = document.getElementById('cancel-custom-input')?.value.trim();
                const errorEl = document.getElementById('cancel-error-msg');

                let finalReason = selectedRadio;
                if (selectedRadio === 'Other reason' || selectedRadio === 'Lý do khác') {
                    if (!customText) {
                        if (errorEl) errorEl.style.display = 'block';
                        return;
                    }
                    finalReason = customText;
                } else if (customText) {
                    finalReason = `${selectedRadio} (${customText})`;
                }

                // Perform cancellation in order-storage
                const res = window.BMW_ORDERS_API.cancelOrder(activeCancelOrderId, finalReason);
                if (res.success) {
                    const modal = document.getElementById('cancel-order-modal');
                    if (modal) modal.classList.remove('show');
                    
                    // Render clean success notification
                    renderCancelSuccessScreen(activeCancelOrderId, finalReason);
                } else {
                    alert(res.message || 'Không thể hủy đơn hàng.');
                }
            });
        }

        // Trigger Return Dialog
        container.querySelectorAll('.btn-request-return').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                activeReturnOrderId = btn.getAttribute('data-order');
                const modal = document.getElementById('return-order-modal');
                if (modal) modal.classList.add('show');
            });
        });

        // Close Return Dialog
        const closeReturnBtn = document.getElementById('btn-close-return-modal');
        if (closeReturnBtn) {
            closeReturnBtn.addEventListener('click', () => {
                const modal = document.getElementById('return-order-modal');
                if (modal) modal.classList.remove('show');
                activeReturnOrderId = null;
            });
        }

        // Confirm Return Dialog
        const confirmReturnBtn = document.getElementById('btn-confirm-return');
        if (confirmReturnBtn) {
            confirmReturnBtn.addEventListener('click', () => {
                if (!activeReturnOrderId) return;
                const selectedRadio = document.querySelector('input[name="returnReasonRadio"]:checked')?.value;
                const details = document.getElementById('return-custom-input')?.value.trim();

                const res = window.BMW_ORDERS_API.requestReturn(activeReturnOrderId, selectedRadio, details);
                if (res.success) {
                    const modal = document.getElementById('return-order-modal');
                    if (modal) modal.classList.remove('show');
                    alert(`Đã gửi yêu cầu đổi/trả cho đơn hàng #${activeReturnOrderId} thành công! Bộ phận CSKH sẽ liên hệ lại bạn.`);
                    renderOrdersPage();
                } else {
                    alert(res.message || 'Không thể gửi yêu cầu đổi trả.');
                }
            });
        }
    }

    function renderCancelSuccessScreen(orderId, reason) {
        const order = window.BMW_ORDERS_API.getOrderById(orderId);
        const hasRefund = order && order.paymentStatus === 'refund_pending';

        container.innerHTML = `
            <div class="cancel-success-box">
                <div class="cancel-success-badge">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2>Hủy đơn hàng thành công</h2>
                <p>Đơn hàng <strong>${orderId}</strong> đã được hủy theo yêu cầu của bạn.</p>

                <div class="cancel-success-meta">
                    <div class="meta-row">
                        <span>Mã đơn hàng</span>
                        <strong>${orderId}</strong>
                    </div>
                    <div class="meta-row">
                        <span>Lý do hủy đơn</span>
                        <span style="text-align:right; max-width: 60%;">${reason}</span>
                    </div>
                    <div class="meta-row">
                        <span>Trạng thái</span>
                        <strong style="color: #DC2626;">Đã hủy</strong>
                    </div>
                    ${hasRefund ? `
                        <div class="meta-row" style="background: #fef3c7; padding: 8px 12px; border-radius: 4px; margin-top: 8px;">
                            <span style="color: #92400e; font-weight: 700;">Ghi chú hoàn tiền</span>
                            <span style="text-align:right; max-width: 65%; color: #92400e; font-size: 11px;">
                                Đơn đã thanh toán online -> Đang chuyển trạng thái <strong>Chờ hoàn tiền</strong>. Kế toán sẽ đối soát và hoàn tiền qua tài khoản của bạn.
                            </span>
                        </div>
                    ` : ''}
                </div>

                <div class="cancel-success-actions">
                    <button type="button" class="button line" id="btn-back-to-orders">Xem lịch sử đơn hàng</button>
                    <a href="index.html" class="button blue">Về trang chủ</a>
                </div>
            </div>
        `;

        document.getElementById('btn-back-to-orders')?.addEventListener('click', () => {
            renderOrdersPage();
        });
    }

    renderOrdersPage();
});
