// form-validation.js - Newsletter form validation for BMW Website

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newsletter-form') || document.querySelector('.newsletter form');
    if (!form) return;

    const emailInput = form.querySelector('input[type="email"]');
    let messageContainer = form.querySelector('.form-message');

    // Create message element if not already present
    if (!messageContainer) {
        messageContainer = document.createElement('p');
        messageContainer.className = 'form-message';
        messageContainer.setAttribute('aria-live', 'polite');
        form.appendChild(messageContainer);
    }

    // Standard email validation pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateEmail(email) {
        const trimmed = email.trim();
        if (!trimmed) {
            return { isValid: false, message: 'Vui lòng nhập địa chỉ email của bạn.' };
        }
        if (!emailRegex.test(trimmed)) {
            return { isValid: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' };
        }
        return { isValid: true, message: 'Cảm ơn bạn đã đăng ký nhận tin!' };
    }

    function showMessage(msg, isSuccess) {
        messageContainer.textContent = msg;
        messageContainer.className = `form-message ${isSuccess ? 'success' : 'error'}`;
    }

    function clearMessage() {
        messageContainer.textContent = '';
        messageContainer.className = 'form-message';
    }

    // Clear error/success message when user edits the email input
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            if (messageContainer.textContent) {
                clearMessage();
            }
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload

        if (!emailInput) return;

        const emailValue = emailInput.value;
        const result = validateEmail(emailValue);

        if (result.isValid) {
            showMessage(result.message, true);
            emailInput.value = ''; // Reset input content on success
        } else {
            showMessage(result.message, false);
        }
    });
});
