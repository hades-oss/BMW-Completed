// js/payment-config.js - BMW Banking Configuration
// Chứa thông tin cấu hình tài khoản ngân hàng chính thức của chủ website

const BMW_PAYMENT_CONFIG = {
    bankName: "MB Bank",
    bankCode: "MB",
    accountNumber: "0355278900",
    accountHolder: "PHAM QUOC TU",
    // Đường dẫn ảnh QR ngân hàng gốc do chủ website cung cấp
    qrImageLocal: "images/banking/qr-banking.jpg",
    // Tạo link VietQR chuẩn khi cần
    getVietQrUrl: function(amount, orderId) {
        const cleanAmount = parseInt(amount, 10) || 0;
        const memo = encodeURIComponent("BMW " + orderId);
        return `https://img.vietqr.io/image/MB-0355278900-compact2.png?amount=${cleanAmount}&addInfo=${memo}&accountName=PHAM%20QUOC%20TU`;
    }
};

// Export to window
if (typeof window !== 'undefined') {
    window.BMW_PAYMENT_CONFIG = BMW_PAYMENT_CONFIG;
}
