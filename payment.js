// js/payment.js - BMW QR Payment Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('payment-qr-container');
    if (!container) return;

    // Lấy orderId từ URL params
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        container.innerHTML = `
            <div class="payment-card" style="text-align: center;">
                <h2>KHÔNG TÌM THẤY MÃ ĐƠN HÀNG</h2>
                <p style="color: var(--text-secondary); margin: 16px 0 24px;">Liên kết không hợp lệ hoặc đơn hàng không tồn tại.</p>
                <a href="shop.html" class="button blue">QUAY LẠI CỬA HÀNG</a>
            </div>
        `;
        return;
    }

    const order = window.BMW_ORDERS_API.getOrderById(orderId);
    if (!order) {
        container.innerHTML = `
            <div class="payment-card" style="text-align: center;">
                <h2>ĐƠN HÀNG KHÔNG TỒN TẠI</h2>
                <p style="color: var(--text-secondary); margin: 16px 0 24px;">Không tìm thấy thông tin cho đơn hàng <strong>${orderId}</strong>.</p>
                <a href="shop.html" class="button blue">QUAY LẠI CỬA HÀNG</a>
            </div>
        `;
        return;
    }

    // If order was already paid, show success view
    if (order.paymentStatus === 'paid') {
        renderSuccessView(order);
        return;
    }

    const config = window.BMW_PAYMENT_CONFIG;
    const vietQrUrl = config.getVietQrUrl(order.total, order.orderId);
    const transferMemo = `BMW ${order.orderId}`;

    container.innerHTML = `
        <div class="payment-card">
            <div class="payment-qr-layout">
                <!-- Left column: Banking QR code image -->
                <div class="qr-image-wrapper">
                    <img id="qr-display-img" src="${config.qrImageLocal}" alt="MB Bank QR Code ${config.accountHolder}" onerror="this.style.display='none'; document.getElementById('qr-img-error').style.display='flex';">
                    <div id="qr-img-error" style="display:none; flex-direction:column; align-items:center; justify-content:center; background:#FEF3C7; border:1px solid #F59E0B; border-radius:8px; padding:20px; text-align:center; font-size:13px; color:#92400E;">
                        <span style="font-size:28px; margin-bottom:8px;">⚠️</span>
                        <strong>Không thể tải ảnh mã QR</strong>
                        <span style="margin-top:6px;">Vui lòng chuyển khoản trực tiếp theo thông tin ngân hàng bên cạnh.</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 800; color: #002D72; margin-top: 10px; letter-spacing: 0.05em;">
                        QUÉT MÃ BẰNG ỨNG DỤNG NGÂN HÀNG HOẶC VNPAY
                    </div>
                </div>

                <!-- Right column: Transfer details -->
                <div class="qr-info-panel">
                    <h2>THANH TOÁN ĐƠN HÀNG</h2>
                    <div class="qr-amount-box">
                        <span>SỐ TIỀN CẦN THANH TOÁN</span>
                        <strong>${(order.total || 0).toLocaleString('vi-VN')}₫</strong>
                    </div>

                    <div class="bank-details-list">
                        <div class="bank-detail-row">
                            <span>Ngân hàng:</span>
                            <span>${config.bankName}</span>
                        </div>
                        <div class="bank-detail-row">
                            <span>Chủ tài khoản:</span>
                            <span>${config.accountHolder}</span>
                        </div>
                        <div class="bank-detail-row">
                            <span>Số tài khoản:</span>
                            <span>
                                <strong>${config.accountNumber}</strong>
                                <button type="button" class="btn-copy-code" data-copy="${config.accountNumber}">Sao chép</button>
                            </span>
                        </div>
                        <div class="bank-detail-row">
                            <span>Nội dung chuyển khoản:</span>
                            <span>
                                <strong style="color: var(--accent-blue);">${transferMemo}</strong>
                                <button type="button" class="btn-copy-code" data-copy="${transferMemo}">Sao chép</button>
                            </span>
                        </div>
                        <div class="bank-detail-row">
                            <span>Trạng thái:</span>
                            <span id="qr-payment-status-badge" style="color: #F59E0B; font-weight: 800;">
                                ● Chờ chuyển khoản
                            </span>
                        </div>
                    </div>

                    <div class="qr-action-buttons">
                        <button type="button" class="btn-paid-simulation" id="btn-confirm-paid">
                            <svg style="width:18px;height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            TÔI ĐÃ CHUYỂN KHOẢN (MÔ PHỎNG THANH TOÁN)
                        </button>
                        <a href="orders.html" class="button line" style="text-align: center; justify-content: center;">
                            XEM ĐƠN HÀNG CỦA TÔI
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Copy to clipboard handlers
    container.querySelectorAll('.btn-copy-code').forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const origText = btn.textContent;
                    btn.textContent = 'Đã sao chép ✓';
                    setTimeout(() => { btn.textContent = origText; }, 1500);
                });
            } else {
                alert('Đã sao chép: ' + textToCopy);
            }
        });
    });

    // Handle simulation button
    const paidBtn = document.getElementById('btn-confirm-paid');
    if (paidBtn) {
        paidBtn.addEventListener('click', () => {
            paidBtn.disabled = true;
            paidBtn.textContent = 'ĐANG XÁC THỰC...';

            const updatedOrder = window.BMW_ORDERS_API.updateOrderPaymentStatus(order.orderId, 'paid');

            setTimeout(() => {
                renderSuccessView(updatedOrder || order);
            }, 600);
        });
    }

    function renderSuccessView(succOrder) {
        container.innerHTML = `
            <div class="payment-card success-screen-box">
                <div class="success-checkmark-circle">
                    <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2>THANH TOÁN THÀNH CÔNG</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">Cảm ơn bạn! Khoản thanh toán đã được tiếp nhận và đơn hàng đang được chuẩn bị để giao.</p>
                
                <div class="success-order-meta">
                    <div class="bank-detail-row">
                        <span>Mã đơn hàng:</span>
                        <strong style="color: var(--accent-blue);">${succOrder.orderId}</strong>
                    </div>
                    <div class="bank-detail-row">
                        <span>Phương thức thanh toán:</span>
                        <span>Chuyển khoản QR ngân hàng (MB Bank)</span>
                    </div>
                    <div class="bank-detail-row">
                        <span>Số tiền đã thanh toán:</span>
                        <strong style="font-size: 16px;">${(succOrder.total || 0).toLocaleString('vi-VN')}₫</strong>
                    </div>
                    <div class="bank-detail-row">
                        <span>Trạng thái thanh toán:</span>
                        <strong style="color: #10B981;">ĐÃ THANH TOÁN</strong>
                    </div>
                    <div class="bank-detail-row">
                        <span>Trạng thái vận chuyển:</span>
                        <span style="color: var(--accent-blue); font-weight: 800;">${succOrder.orderStatus || 'Chờ xác nhận'}</span>
                    </div>
                </div>

                <div style="margin: 16px 0 24px; padding: 12px 14px; background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.18); border-radius: 8px; font-size: 12px; color: var(--text-secondary); text-align: left; line-height: 1.5;">
                    <strong style="color: var(--accent-blue);">ℹ️ Lưu ý xác thực thanh toán:</strong> Đây là chế độ mô phỏng giao dịch QR phía trình duyệt (Client Demo). Trong hệ thống sản xuất thật, trạng thái thanh toán chỉ được tự động chuyển sang <strong>Đã thanh toán</strong> sau khi nhận được tín hiệu Webhook đối soát thành công từ ngân hàng (VietQR/MB Bank) hoặc nhân viên kế toán duyệt sao kê.
                </div>

                <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                    <a href="orders.html" class="button blue">XEM ĐƠN HÀNG</a>
                    <a href="index.html" class="button line">VỀ TRANG CHỦ</a>
                </div>
            </div>
        `;
    }
});
