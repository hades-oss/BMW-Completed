// register.js - Y5.2 BMW Register Validation Logic

document.addEventListener('DOMContentLoaded', () => {
    // 0. User Storage Key
    const USERS_STORAGE_KEY = 'bmw_users';

    function getRegisteredUsers() {
        try {
            const data = localStorage.getItem(USERS_STORAGE_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error reading registered users from localStorage:', e);
            return [];
        }
    }

    function saveRegisteredUser(user) {
        try {
            const users = getRegisteredUsers();
            users.push(user);
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
            return true;
        } catch (e) {
            console.error('Error saving user to localStorage:', e);
            return false;
        }
    }

    // 1. Phone Country Data
    const countries = [
        { code: "VN", name: "Việt Nam", dialCode: "+84", minLength: 9, maxLength: 10, emoji: "🇻🇳" },
        { code: "US", name: "Hoa Kỳ", dialCode: "+1", minLength: 10, maxLength: 10, emoji: "🇺🇸" },
        { code: "CA", name: "Canada", dialCode: "+1", minLength: 10, maxLength: 10, emoji: "🇨🇦" },
        { code: "GB", name: "Vương quốc Anh", dialCode: "+44", minLength: 10, maxLength: 11, emoji: "🇬🇧" },
        { code: "AU", name: "Úc", dialCode: "+61", minLength: 9, maxLength: 10, emoji: "🇦🇺" },
        { code: "JP", name: "Nhật Bản", dialCode: "+81", minLength: 9, maxLength: 10, emoji: "🇯🇵" },
        { code: "KR", name: "Hàn Quốc", dialCode: "+82", minLength: 9, maxLength: 11, emoji: "🇰🇷" },
        { code: "CN", name: "Trung Quốc", dialCode: "+86", minLength: 11, maxLength: 11, emoji: "🇨🇳" },
        { code: "SG", name: "Singapore", dialCode: "+65", minLength: 8, maxLength: 8, emoji: "🇸🇬" },
        { code: "TH", name: "Thái Lan", dialCode: "+66", minLength: 9, maxLength: 10, emoji: "🇹🇭" },
        { code: "DE", name: "Đức", dialCode: "+49", minLength: 10, maxLength: 11, emoji: "🇩🇪" },
        { code: "FR", name: "Pháp", dialCode: "+33", minLength: 9, maxLength: 10, emoji: "🇫🇷" },
        { code: "IT", name: "Ý", dialCode: "+39", minLength: 9, maxLength: 10, emoji: "🇮🇹" },
        { code: "ES", name: "Tây Ban Nha", dialCode: "+34", minLength: 9, maxLength: 10, emoji: "🇪🇸" },
        { code: "IN", name: "Ấn Độ", dialCode: "+91", minLength: 10, maxLength: 10, emoji: "🇮🇳" }
    ];

    // Populate country select
    const countrySelect = document.getElementById('country-code');
    if (countrySelect && countrySelect.options.length === 0) {
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = `${country.emoji} ${country.dialCode} (${country.name})`;
            countrySelect.appendChild(option);
        });
    }

    // Elements
    const form = document.getElementById('register-form');
    const formSuccess = document.getElementById('form-success');
    
    const inputs = {
        fullName: document.getElementById('fullName'),
        username: document.getElementById('username'),
        email: document.getElementById('email'),
        phone: document.getElementById('phone'),
        password: document.getElementById('password'),
        confirmPassword: document.getElementById('confirmPassword'),
        terms: document.getElementById('terms')
    };

    const errors = {
        fullName: document.getElementById('fullName-error'),
        username: document.getElementById('username-error'),
        email: document.getElementById('email-error'),
        phone: document.getElementById('phone-error'),
        password: document.getElementById('password-error'),
        confirmPassword: document.getElementById('confirmPassword-error'),
        terms: document.getElementById('terms-error')
    };

    // Helper: Show / Hide Error
    function showError(fieldId, message) {
        const input = inputs[fieldId];
        const errorDiv = errors[fieldId];
        if (!input || !errorDiv) return;

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        if (fieldId !== 'terms') {
            input.classList.add('input-error');
            input.classList.remove('input-valid');
        }
    }

    function clearError(fieldId) {
        const input = inputs[fieldId];
        const errorDiv = errors[fieldId];
        if (!input || !errorDiv) return;

        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        if (fieldId !== 'terms') {
            input.classList.remove('input-error');
            if (input.value && input.value.trim().length > 0) {
                input.classList.add('input-valid');
            }
        }
    }

    // Validation Functions
    function validateFullName() {
        if (!inputs.fullName) return false;
        const val = inputs.fullName.value.trim();
        if (!val) {
            showError('fullName', 'Vui lòng nhập họ và tên.');
            return false;
        }
        if (val.length < 2) {
            showError('fullName', 'Họ và tên phải có ít nhất 2 ký tự.');
            return false;
        }
        const nameRegex = /^[\p{L}\s'-]+$/u;
        if (!nameRegex.test(val)) {
            showError('fullName', 'Họ và tên chỉ được chứa chữ cái và khoảng trắng.');
            return false;
        }
        clearError('fullName');
        return true;
    }

    function validateUsername() {
        if (!inputs.username) return false;
        const val = inputs.username.value.trim();
        if (!val) {
            showError('username', 'Tên đăng nhập không được để trống.');
            return false;
        }
        if (val.length < 3 || val.length > 20) {
            showError('username', 'Tên đăng nhập phải từ 3-20 ký tự.');
            return false;
        }
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(val)) {
            showError('username', 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới.');
            return false;
        }
        const existingUsers = getRegisteredUsers();
        const isDuplicate = existingUsers.some(u => u.username && u.username.toLowerCase() === val.toLowerCase());
        if (isDuplicate) {
            showError('username', 'Tên đăng nhập này đã được sử dụng.');
            return false;
        }
        clearError('username');
        return true;
    }

    function validateEmail() {
        if (!inputs.email) return false;
        const val = inputs.email.value.trim();
        if (!val) {
            showError('email', 'Email không được để trống.');
            return false;
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(val)) {
            showError('email', 'Vui lòng nhập địa chỉ email hợp lệ.');
            return false;
        }
        const existingUsers = getRegisteredUsers();
        const isDuplicate = existingUsers.some(u => 
            (u.email && u.email.toLowerCase() === val.toLowerCase()) ||
            (u.linkedGmail && u.linkedGmail.email && u.linkedGmail.email.toLowerCase() === val.toLowerCase())
        );
        if (isDuplicate) {
            showError('email', 'Email này đã được đăng ký.');
            return false;
        }
        clearError('email');
        return true;
    }

    function validatePhone() {
        if (!inputs.phone) return false;
        const code = countrySelect ? countrySelect.value : 'VN';
        const country = countries.find(c => c.code === code);
        let val = inputs.phone.value;

        if (!val.trim()) {
            showError('phone', 'Số điện thoại không được để trống.');
            return false;
        }

        // Normalize spaces and hyphens
        val = val.replace(/\s+/g, '').replace(/-/g, '');
        
        // Check for country code prefix entered manually
        if (val.startsWith('+')) {
            showError('phone', 'Vui lòng nhập số điện thoại không bao gồm mã quốc gia.');
            return false;
        }

        const phoneRegex = /^\d+$/;
        if (!phoneRegex.test(val)) {
            showError('phone', 'Vui lòng nhập số điện thoại hợp lệ (chỉ gồm chữ số).');
            return false;
        }

        if (country) {
            if (val.length < country.minLength) {
                showError('phone', `Số điện thoại phải có ít nhất ${country.minLength} chữ số cho ${country.name}.`);
                return false;
            }
            if (val.length > country.maxLength) {
                showError('phone', `Số điện thoại không được vượt quá ${country.maxLength} chữ số cho ${country.name}.`);
                return false;
            }
        }
        clearError('phone');
        return true;
    }

    function validatePassword() {
        if (!inputs.password) return false;
        const val = inputs.password.value;
        if (!val) {
            showError('password', 'Mật khẩu không được để trống.');
            return false;
        }
        if (val.length < 8) {
            showError('password', 'Mật khẩu phải có ít nhất 8 ký tự.');
            return false;
        }
        const hasLetter = /[a-zA-Z]/.test(val);
        const hasNumber = /\d/.test(val);
        if (!hasLetter || !hasNumber) {
            showError('password', 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.');
            return false;
        }
        clearError('password');
        
        // Re-validate confirm password if it already has value
        if (inputs.confirmPassword && inputs.confirmPassword.value) {
            validateConfirmPassword();
        }
        return true;
    }

    function validateConfirmPassword() {
        if (!inputs.confirmPassword) return false;
        const val = inputs.confirmPassword.value;
        if (!val) {
            showError('confirmPassword', 'Vui lòng xác nhận mật khẩu.');
            return false;
        }
        if (val !== inputs.password.value) {
            showError('confirmPassword', 'Mật khẩu xác nhận không khớp.');
            return false;
        }
        clearError('confirmPassword');
        return true;
    }

    function validateTerms() {
        if (!inputs.terms) return false;
        if (!inputs.terms.checked) {
            showError('terms', 'Bạn phải đồng ý với Điều khoản & Điều kiện.');
            return false;
        }
        clearError('terms');
        return true;
    }

    // Form Submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Never reload or navigate

            if (formSuccess) {
                formSuccess.style.display = 'none';
            }

            const isValidFullName = validateFullName();
            const isValidUsername = validateUsername();
            const isValidEmail = validateEmail();
            const isValidPhone = validatePhone();
            const isValidPassword = validatePassword();
            const isValidConfirmPassword = validateConfirmPassword();
            const isValidTerms = validateTerms();

            if (isValidFullName && isValidUsername && isValidEmail && isValidPhone && isValidPassword && isValidConfirmPassword && isValidTerms) {
                // Save user to localStorage (bmw_users)
                const nowIso = new Date().toISOString();
                const newUser = {
                    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                    fullName: inputs.fullName.value.trim(),
                    username: inputs.username.value.trim(),
                    email: inputs.email.value.trim().toLowerCase(),
                    phone: (countrySelect ? countrySelect.value + ' ' : '') + inputs.phone.value.trim(),
                    password: inputs.password.value,
                    role: 'customer',
                    status: 'active',
                    address: '',
                    dob: '',
                    avatar: '',
                    linkedGmail: null,
                    createdAt: nowIso,
                    updatedAt: nowIso
                };
                const saveSuccess = saveRegisteredUser(newUser);

                if (!saveSuccess) {
                    if (formSuccess) {
                        formSuccess.style.display = 'block';
                        formSuccess.style.color = '#DC2626';
                        formSuccess.style.backgroundColor = '#FEE2E2';
                        formSuccess.style.borderColor = '#FCA5A5';
                        formSuccess.textContent = 'Không thể lưu tài khoản. Vui lòng thử lại.';
                        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    return;
                }

                if (formSuccess) {
                    formSuccess.style.display = 'block';
                    formSuccess.style.color = '#065F46';
                    formSuccess.style.backgroundColor = '#D1FAE5';
                    formSuccess.style.borderColor = '#10B981';
                    formSuccess.textContent = '✓ Tạo tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...';
                    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                // Reset form fields
                form.reset();
                Object.keys(inputs).forEach(key => {
                    if (inputs[key]) {
                        inputs[key].classList.remove('input-valid', 'input-error');
                    }
                });

                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                // Focus first invalid field
                const fields = ['fullName', 'username', 'email', 'phone', 'password', 'confirmPassword', 'terms'];
                for (let id of fields) {
                    if (inputs[id] && (inputs[id].classList.contains('input-error') || (id === 'terms' && !inputs.terms.checked))) {
                        inputs[id].focus();
                        break;
                    }
                }
            }
        });
    }

    // Live Validation (on blur or input when error/valid)
    if (inputs.fullName) {
        inputs.fullName.addEventListener('blur', validateFullName);
        inputs.fullName.addEventListener('input', () => {
            if (inputs.fullName.classList.contains('input-error') || errors.fullName.style.display === 'block') {
                validateFullName();
            }
        });
    }

    if (inputs.username) {
        inputs.username.addEventListener('blur', validateUsername);
        inputs.username.addEventListener('input', () => {
            if (inputs.username.classList.contains('input-error') || errors.username.style.display === 'block') {
                validateUsername();
            }
        });
    }

    if (inputs.email) {
        inputs.email.addEventListener('blur', validateEmail);
        inputs.email.addEventListener('input', () => {
            if (inputs.email.classList.contains('input-error') || errors.email.style.display === 'block') {
                validateEmail();
            }
        });
    }

    if (inputs.phone) {
        inputs.phone.addEventListener('blur', validatePhone);
        inputs.phone.addEventListener('input', () => {
            if (inputs.phone.classList.contains('input-error') || errors.phone.style.display === 'block') {
                validatePhone();
            }
        });
    }

    if (countrySelect) {
        countrySelect.addEventListener('change', () => {
            if (inputs.phone && inputs.phone.value) {
                validatePhone();
            }
        });
    }

    if (inputs.password) {
        inputs.password.addEventListener('blur', validatePassword);
        inputs.password.addEventListener('input', () => {
            if (inputs.password.classList.contains('input-error') || inputs.password.value.length > 0) {
                validatePassword();
            }
        });
    }

    if (inputs.confirmPassword) {
        inputs.confirmPassword.addEventListener('blur', validateConfirmPassword);
        inputs.confirmPassword.addEventListener('input', () => {
            if (inputs.confirmPassword.classList.contains('input-error') || inputs.confirmPassword.value.length > 0) {
                validateConfirmPassword();
            }
        });
    }

    if (inputs.terms) {
        inputs.terms.addEventListener('change', validateTerms);
    }

    // Show / Hide Password
    function togglePassword(inputId, toggleBtnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(toggleBtnId);
        if (input && btn) {
            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                
                // Toggle icon (Eye / Eye Off)
                if (isPassword) {
                    btn.innerHTML = `<svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
                    btn.setAttribute('aria-label', 'Ẩn mật khẩu');
                } else {
                    btn.innerHTML = `<svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
                    btn.setAttribute('aria-label', 'Hiện mật khẩu');
                }
            });
        }
    }

    togglePassword('password', 'toggle-password');
    togglePassword('confirmPassword', 'toggle-confirm-password');
});

