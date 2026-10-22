// js/profile.js - Profile Page Management (Phase 8.1 Unified Account & Profile System)

document.addEventListener('DOMContentLoaded', () => {
    // ─── 0. DOM References ───────────────────────────────────────────────────────
    const msgBanner       = document.getElementById('profile-msg-banner');
    const form            = document.getElementById('profile-form');

    const avatarText      = document.getElementById('profile-avatar-text');
    const avatarInput     = document.getElementById('profile-avatar-input');
    const btnChangeAvatar = document.getElementById('btn-change-avatar');
    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');
    const avatarError     = document.getElementById('profile-avatar-error');

    const badgeName       = document.getElementById('profile-badge-name');
    const badgeEmail      = document.getElementById('profile-badge-email');
    const badgeRole       = document.getElementById('profile-role-badge');
    const badgeStatus     = document.getElementById('profile-status-badge');

    const inputUsername   = document.getElementById('profile-username');
    const inputEmail      = document.getElementById('profile-email');
    const inputFullname   = document.getElementById('profile-fullname');
    const inputCountryCode = document.getElementById('profile-country-code');
    const inputPhone      = document.getElementById('profile-phone');
    let originalPhoneWasPrefixed = false;
    let originalRawPhone = '';
    const inputAddress    = document.getElementById('profile-address');
    const inputDob        = document.getElementById('profile-dob');
    const inputCreated    = document.getElementById('profile-created');

    const errorUsername   = document.getElementById('profile-username-error');
    const errorFullname   = document.getElementById('profile-fullname-error');
    const errorPhone      = document.getElementById('profile-phone-error');
    const errorAddress    = document.getElementById('profile-address-error');
    const errorDob        = document.getElementById('profile-dob-error');

    // Linked Gmail References
    const linkedGmailView    = document.getElementById('linked-gmail-view');
    const linkedGmailAddress = document.getElementById('linked-gmail-address');
    const btnUnlinkGmail     = document.getElementById('btn-unlink-gmail');
    const linkGmailFormBox   = document.getElementById('link-gmail-form-box');
    const inputLinkGmail     = document.getElementById('input-link-gmail');
    const btnLinkGmail       = document.getElementById('btn-link-gmail');
    const linkGmailError     = document.getElementById('link-gmail-error');

    // Password Form References
    const passwordForm         = document.getElementById('password-form');
    const inputCurrentPassword = document.getElementById('input-current-password');
    const inputNewPassword     = document.getElementById('input-new-password');
    const inputConfirmPassword = document.getElementById('input-confirm-password');
    const passwordMsgBanner    = document.getElementById('password-msg-banner');
    const errorCurrentPassword = document.getElementById('password-current-error');
    const errorNewPassword     = document.getElementById('password-new-error');
    const errorConfirmPassword = document.getElementById('password-confirm-error');

    // ─── 1. Authenticate & Load User Data ──────────────────────────────────────
    let currentUser = null;
    let isSessionStorage = false;

    try {
        const rawSession = sessionStorage.getItem('bmw_current_user');
        const rawLocal   = localStorage.getItem('bmw_current_user');
        const raw        = rawSession || rawLocal;
        isSessionStorage = Boolean(rawSession);

        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.id) {
                currentUser = parsed;
            }
        }
    } catch (e) {
        currentUser = null;
    }

    if (!currentUser) {
        // Not logged in -> Redirect to login
        window.location.href = 'login.html';
        return;
    }

    // Live sync against bmw_users list
    function getStoredUsers() {
        try {
            const raw = localStorage.getItem('bmw_users');
            if (raw) {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {}
        return [];
    }

    function saveStoredUsers(users) {
        try {
            localStorage.setItem('bmw_users', JSON.stringify(users));
            return true;
        } catch (e) {
            console.error('Failed to save bmw_users:', e);
            return false;
        }
    }

    function getLiveUser() {
        const users = getStoredUsers();
        return users.find(u => 
            String(u.id) === String(currentUser.id) ||
            (u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase()) ||
            (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
        ) || null;
    }

    // Check account status (kick out if banned or locked)
    const liveCheck = getLiveUser();
    if (liveCheck && (liveCheck.status === 'banned' || liveCheck.status === 'locked')) {
        sessionStorage.removeItem('bmw_current_user');
        localStorage.removeItem('bmw_current_user');
        alert('Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động.');
        window.location.href = 'login.html';
        return;
    }

    // Synchronize latest attributes from live record
    if (liveCheck) {
        currentUser.id          = liveCheck.id;
        currentUser.role        = liveCheck.role || 'customer';
        currentUser.status      = liveCheck.status || 'active';
        currentUser.fullName    = liveCheck.fullName || currentUser.fullName || '';
        currentUser.username    = liveCheck.username || currentUser.username || '';
        currentUser.email       = liveCheck.email || currentUser.email || '';
        currentUser.phone       = liveCheck.phone || currentUser.phone || '';
        currentUser.address     = liveCheck.address || currentUser.address || '';
        currentUser.dob         = liveCheck.dob || currentUser.dob || '';
        currentUser.avatar      = liveCheck.avatar || currentUser.avatar || '';
        currentUser.linkedGmail = liveCheck.linkedGmail || currentUser.linkedGmail || null;
        currentUser.createdAt   = liveCheck.createdAt || currentUser.createdAt;
    }

    // Persist current user in memory and active session storage
    function persistCurrentUser() {
        const sessionPayload = {
            id:          currentUser.id,
            fullName:    currentUser.fullName || '',
            username:    currentUser.username || '',
            email:       currentUser.email || '',
            phone:       currentUser.phone || '',
            role:        currentUser.role || 'customer',
            status:      currentUser.status || 'active',
            address:     currentUser.address || '',
            dob:         currentUser.dob || '',
            avatar:      currentUser.avatar || '',
            linkedGmail: currentUser.linkedGmail || null,
            createdAt:   currentUser.createdAt || new Date().toISOString()
        };

        if (isSessionStorage) {
            sessionStorage.setItem('bmw_current_user', JSON.stringify(sessionPayload));
        } else {
            localStorage.setItem('bmw_current_user', JSON.stringify(sessionPayload));
        }

        // Update in bmw_users
        const users = getStoredUsers();
        const userIndex = users.findIndex(u => 
            String(u.id) === String(currentUser.id) ||
            (u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase()) ||
            (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
        );

        if (userIndex !== -1) {
            users[userIndex].fullName    = currentUser.fullName;
            users[userIndex].username    = currentUser.username;
            users[userIndex].phone       = currentUser.phone;
            users[userIndex].address     = currentUser.address;
            users[userIndex].dob         = currentUser.dob;
            users[userIndex].avatar      = currentUser.avatar;
            users[userIndex].linkedGmail = currentUser.linkedGmail;
            users[userIndex].updatedAt   = new Date().toISOString();
            saveStoredUsers(users);
        }
    }

    // ─── 2. Populate User Profile Info ─────────────────────────────────────────
    function populateFields() {
        const displayName     = currentUser.fullName || currentUser.username || currentUser.email || 'User';
        const displayUsername = currentUser.username || 'user';
        const displayEmail    = currentUser.email || 'N/A';
        const initial         = (displayUsername.charAt(0) || 'U').toUpperCase();

        // Avatar
        if (avatarText) {
            if (currentUser.avatar) {
                avatarText.innerHTML = `<img src="${currentUser.avatar}" alt="${displayUsername}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'inline-block';
            } else {
                avatarText.textContent = initial;
                if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'none';
            }
        }

        if (badgeName) badgeName.textContent = displayName;
        if (badgeEmail) badgeEmail.textContent = displayEmail;

        // Role & Status Badges (Read-Only to prevent self-elevation)
        const role = (currentUser.role || 'customer').toLowerCase();
        const status = (currentUser.status || 'active').toLowerCase();

        if (badgeRole) {
            const roleLabels = { 'admin': 'QUẢN TRỊ', 'staff': 'NHÂN VIÊN', 'customer': 'KHÁCH HÀNG' };
            badgeRole.textContent = roleLabels[role] || role.toUpperCase();
            badgeRole.className = `profile-badge badge-role role-${role}`;
        }
        if (badgeStatus) {
            const statusLabels = { 'active': 'HOẠT ĐỘNG', 'banned': 'BỊ KHÓA', 'locked': 'TẠM KHÓA', 'inactive': 'KHÔNG HOẠT ĐỘNG' };
            badgeStatus.textContent = statusLabels[status] || status.toUpperCase();
            badgeStatus.className = `profile-badge badge-status status-${status}`;
        }

        // Username: prefixed with '@' for display & test suite compatibility
        if (inputUsername) inputUsername.value = '@' + displayUsername;
        if (inputEmail) inputEmail.value = displayEmail;
        if (inputFullname) inputFullname.value = currentUser.fullName || '';
                originalRawPhone = currentUser.phone || '';
        if (window.BMW_PHONE_UTILS) {
            const parsed = window.BMW_PHONE_UTILS.parsePhoneNumber(currentUser.phone);
            originalPhoneWasPrefixed = parsed.hasPrefix;
            if (inputCountryCode) {
                window.BMW_PHONE_UTILS.populateCountrySelect(inputCountryCode, parsed.dialCode);
            }
            if (inputPhone) inputPhone.value = parsed.phone;
        } else {
            if (inputPhone) inputPhone.value = currentUser.phone || '';
        }
        if (inputAddress) inputAddress.value = currentUser.address || '';
        if (inputDob) inputDob.value = currentUser.dob || '';

        if (inputCreated) {
            if (currentUser.createdAt) {
                try {
                    const dateObj = new Date(currentUser.createdAt);
                    inputCreated.value = dateObj.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
                } catch (e) {
                    inputCreated.value = currentUser.createdAt;
                }
            } else {
                inputCreated.value = 'Thành viên';
            }
        }

        // Linked Gmail display
        if (currentUser.linkedGmail && currentUser.linkedGmail.email) {
            if (linkedGmailView) linkedGmailView.style.display = 'flex';
            if (linkGmailFormBox) linkGmailFormBox.style.display = 'none';
            if (linkedGmailAddress) linkedGmailAddress.textContent = currentUser.linkedGmail.email;
        } else {
            if (linkedGmailView) linkedGmailView.style.display = 'none';
            if (linkGmailFormBox) linkGmailFormBox.style.display = 'block';
            if (inputLinkGmail) inputLinkGmail.value = '';
        }
    }

    populateFields();

    // ─── 3. Avatar Upload & Resize (Local Canvas Compression) ───────────────────
    if (btnChangeAvatar && avatarInput) {
        btnChangeAvatar.addEventListener('click', () => {
            if (avatarError) avatarError.style.display = 'none';
            avatarInput.click();
        });

        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            // 1. Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                if (avatarError) {
                    avatarError.textContent = 'Chỉ chấp nhận định dạng ảnh (PNG, JPG, WEBP, GIF).';
                    avatarError.style.display = 'block';
                }
                avatarInput.value = '';
                return;
            }

            // 2. Validate file size (max 2MB before compression)
            if (file.size > 2 * 1024 * 1024) {
                if (avatarError) {
                    avatarError.textContent = 'Dung lượng ảnh tối đa 2MB.';
                    avatarError.style.display = 'block';
                }
                avatarInput.value = '';
                return;
            }

            // 3. Compress / Resize via Canvas (max 180x180, ~5-10KB base64) to prevent localStorage quota overflow
            const reader = new FileReader();
            reader.onload = (readEvt) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const maxDim = 180;
                        const canvas = document.createElement('canvas');
                        const size = Math.min(img.width, img.height);
                        const startX = (img.width - size) / 2;
                        const startY = (img.height - size) / 2;

                        canvas.width = maxDim;
                        canvas.height = maxDim;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, startX, startY, size, size, 0, 0, maxDim, maxDim);

                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

                        currentUser.avatar = compressedBase64;
                        persistCurrentUser();
                        populateFields();

                        if (msgBanner) {
                            msgBanner.className = 'profile-msg-banner success';
                            msgBanner.textContent = '✓ Ảnh đại diện đã được cập nhật thành công!';
                            msgBanner.style.display = 'block';
                        }
                    } catch (canvasErr) {
                        if (avatarError) {
                            avatarError.textContent = 'Lỗi nén ảnh, vui lòng thử lại ảnh khác.';
                            avatarError.style.display = 'block';
                        }
                    }
                };
                img.src = readEvt.target.result;
            };
            reader.readAsDataURL(file);
            avatarInput.value = '';
        });
    }

    if (btnRemoveAvatar) {
        btnRemoveAvatar.addEventListener('click', () => {
            currentUser.avatar = '';
            persistCurrentUser();
            populateFields();

            if (msgBanner) {
                msgBanner.className = 'profile-msg-banner success';
                msgBanner.textContent = '✓ Đã xóa ảnh đại diện, chuyển về mặc định.';
                msgBanner.style.display = 'block';
            }
        });
    }

    // ─── 4. Personal Info Form Submission ───────────────────────────────────────
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Clear previous errors & banners
            if (errorUsername) errorUsername.style.display = 'none';
            if (errorFullname) errorFullname.style.display = 'none';
            if (errorPhone) errorPhone.style.display = 'none';
            if (errorAddress) errorAddress.style.display = 'none';
            if (errorDob) errorDob.style.display = 'none';
            if (msgBanner) msgBanner.style.display = 'none';

            let isValid = true;

            // 1. Validate Username
            let newUsername = (inputUsername ? inputUsername.value.trim() : '').replace(/^@/, '');
            if (!newUsername) {
                if (errorUsername) {
                    errorUsername.textContent = 'Tên đăng nhập không được để trống.';
                    errorUsername.style.display = 'block';
                }
                isValid = false;
            } else {
                const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
                if (!usernameRegex.test(newUsername)) {
                    if (errorUsername) {
                        errorUsername.textContent = 'Tên đăng nhập phải từ 3-20 ký tự (chữ cái, chữ số, dấu gạch dưới).';
                        errorUsername.style.display = 'block';
                    }
                    isValid = false;
                } else if (newUsername.toLowerCase() !== (currentUser.username || '').toLowerCase()) {
                    // Check duplicate against other users
                    const users = getStoredUsers();
                    const isTaken = users.some(u => 
                        String(u.id) !== String(currentUser.id) &&
                        u.username && u.username.toLowerCase() === newUsername.toLowerCase()
                    );
                    if (isTaken) {
                        if (errorUsername) {
                            errorUsername.textContent = 'Tên đăng nhập này đã được sử dụng bởi tài khoản khác.';
                            errorUsername.style.display = 'block';
                        }
                        isValid = false;
                    }
                }
            }

            // 2. Validate Full Name
            const newFullname = inputFullname ? inputFullname.value.trim() : '';
            if (!newFullname) {
                if (errorFullname) {
                    errorFullname.textContent = 'Họ và tên không được để trống.';
                    errorFullname.style.display = 'block';
                }
                isValid = false;
            }

            // 3. Validate Phone with Country Code (Phase 8.8)
            const rawPhoneInput = inputPhone ? inputPhone.value.trim() : '';
            const selectedDialCode = inputCountryCode ? inputCountryCode.value : '+84';
            let newPhone = '';

            if (rawPhoneInput) {
                if (window.BMW_PHONE_UTILS) {
                    const phoneCheck = window.BMW_PHONE_UTILS.validatePhone(selectedDialCode, rawPhoneInput, false);
                    if (!phoneCheck.valid) {
                        if (errorPhone) {
                            errorPhone.textContent = phoneCheck.message;
                            errorPhone.style.display = 'block';
                        }
                        isValid = false;
                    } else {
                        // Không đổi số nếu chỉ mở trang rồi lưu mà không sửa
                        const parsedOld = window.BMW_PHONE_UTILS.parsePhoneNumber(originalRawPhone);
                        if (rawPhoneInput === parsedOld.phone && selectedDialCode === parsedOld.dialCode) {
                            newPhone = originalRawPhone;
                        } else {
                            newPhone = window.BMW_PHONE_UTILS.formatPhoneToSave(selectedDialCode, rawPhoneInput, originalPhoneWasPrefixed);
                        }
                    }
                } else {
                    newPhone = rawPhoneInput;
                }
            }

            // 4. Address & Date of Birth
            const newAddress = inputAddress ? inputAddress.value.trim() : '';
            const newDob     = inputDob ? inputDob.value.trim() : '';

            if (!isValid) return;

            try {
                const oldUsername = currentUser.username;

                // Update Current User object in memory
                // ⚠️ NOTE: Role is strictly preserved to prevent self-elevation (Requirement 8)
                currentUser.username = newUsername;
                currentUser.fullName = newFullname;
                currentUser.phone    = newPhone;
                currentUser.address  = newAddress;
                currentUser.dob      = newDob;

                // Persist to session & master bmw_users list
                persistCurrentUser();

                // 5. Synchronize orders if username changed (Requirement 5: không làm hỏng đơn hàng cũ)
                if (oldUsername && oldUsername.toLowerCase() !== newUsername.toLowerCase()) {
                    if (window.BMW_ORDERS_API && typeof window.BMW_ORDERS_API.syncUserOrders === 'function') {
                        window.BMW_ORDERS_API.syncUserOrders(currentUser.id, oldUsername, newUsername);
                    } else {
                        // Direct fallback to synchronize bmw_orders in localStorage
                        try {
                            const rawOrders = localStorage.getItem('bmw_orders');
                            if (rawOrders) {
                                const orders = JSON.parse(rawOrders);
                                if (Array.isArray(orders)) {
                                    let modified = false;
                                    orders.forEach(order => {
                                        const matchesId = currentUser.id && String(order.userId) === String(currentUser.id);
                                        const matchesName = order.userAccount && order.userAccount.toLowerCase() === oldUsername.toLowerCase();
                                        if (matchesId || matchesName) {
                                            order.userAccount = newUsername;
                                            if (currentUser.id && !order.userId) order.userId = currentUser.id;
                                            modified = true;
                                        }
                                    });
                                    if (modified) {
                                        localStorage.setItem('bmw_orders', JSON.stringify(orders));
                                    }
                                }
                            }
                        } catch (orderSyncErr) {
                            console.warn('Direct order sync error:', orderSyncErr);
                        }
                    }
                }

                // Update UI badges & header
                populateFields();

                // Show Success Banner (Keep exact string for test_register.html compatibility)
                if (msgBanner) {
                    msgBanner.className = 'profile-msg-banner success';
                    msgBanner.textContent = '✓ Cập nhật hồ sơ thành công!'; 
                    msgBanner.style.display = 'block';
                    msgBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

            } catch (err) {
                console.error('Profile update error:', err);
                if (msgBanner) {
                    msgBanner.className = 'profile-msg-banner error';
                    msgBanner.textContent = 'Không thể lưu thay đổi. Vui lòng thử lại.';
                    msgBanner.style.display = 'block';
                }
            }
        });
    }

    // ─── 5. Linked Gmail Logic ──────────────────────────────────────────────────
    if (btnLinkGmail && inputLinkGmail) {
        btnLinkGmail.addEventListener('click', () => {
            if (linkGmailError) linkGmailError.style.display = 'none';

            const gmailVal = inputLinkGmail.value.trim().toLowerCase();
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

            // 1. Format check
            if (!gmailVal || !emailRegex.test(gmailVal)) {
                if (linkGmailError) {
                    linkGmailError.textContent = 'Vui lòng nhập địa chỉ Gmail/email hợp lệ.';
                    linkGmailError.style.display = 'block';
                }
                return;
            }

            // 2. Cannot link same primary email
            if (currentUser.email && currentUser.email.toLowerCase() === gmailVal) {
                if (linkGmailError) {
                    linkGmailError.textContent = 'Không thể liên kết email chính của tài khoản làm Gmail phụ.';
                    linkGmailError.style.display = 'block';
                }
                return;
            }

            // 3. Check duplicate against all users in system
            const users = getStoredUsers();
            const isTaken = users.some(u => 
                (u.email && u.email.toLowerCase() === gmailVal) ||
                (u.linkedGmail && u.linkedGmail.email && u.linkedGmail.email.toLowerCase() === gmailVal)
            );

            if (isTaken) {
                if (linkGmailError) {
                    linkGmailError.textContent = 'Địa chỉ Gmail này đã được sử dụng hoặc liên kết ở tài khoản khác.';
                    linkGmailError.style.display = 'block';
                }
                return;
            }

            // 4. Save linked Gmail (explicitly marked unverified as there's no backend OTP)
            currentUser.linkedGmail = {
                email: gmailVal,
                verified: false,
                linkedAt: new Date().toISOString(),
                note: 'Unverified (Client-side demo: pending email verification service)'
            };

            persistCurrentUser();
            populateFields();

            if (msgBanner) {
                msgBanner.className = 'profile-msg-banner success';
                msgBanner.textContent = '✓ Gmail đã được liên kết thành công! (Trạng thái: Chưa xác minh - Demo)';
                msgBanner.style.display = 'block';
                msgBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    if (btnUnlinkGmail) {
        btnUnlinkGmail.addEventListener('click', () => {
            const confirmed = confirm('Bạn có chắc chắn muốn hủy liên kết tài khoản Gmail này?');
            if (confirmed) {
                currentUser.linkedGmail = null;
                persistCurrentUser();
                populateFields();

                if (msgBanner) {
                    msgBanner.className = 'profile-msg-banner success';
                    msgBanner.textContent = '✓ Đã hủy liên kết Gmail an toàn.';
                    msgBanner.style.display = 'block';
                }
            }
        });
    }

    // ─── 6. Change Password Logic ───────────────────────────────────────────────
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (errorCurrentPassword) errorCurrentPassword.style.display = 'none';
            if (errorNewPassword) errorNewPassword.style.display = 'none';
            if (errorConfirmPassword) errorConfirmPassword.style.display = 'none';
            if (passwordMsgBanner) passwordMsgBanner.style.display = 'none';

            const currentPass = inputCurrentPassword ? inputCurrentPassword.value : '';
            const newPass     = inputNewPassword ? inputNewPassword.value : '';
            const confirmPass = inputConfirmPassword ? inputConfirmPassword.value : '';

            let passValid = true;

            // 1. Verify current password
            const liveUser = getLiveUser();
            if (!liveUser || liveUser.password !== currentPass) {
                if (errorCurrentPassword) {
                    errorCurrentPassword.textContent = 'Mật khẩu hiện tại không chính xác.';
                    errorCurrentPassword.style.display = 'block';
                }
                passValid = false;
            }

            // 2. Validate new password (min 8 chars, letter + number)
            const passRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
            if (!newPass || !passRegex.test(newPass)) {
                if (errorNewPassword) {
                    errorNewPassword.textContent = 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm cả chữ cái và số.';
                    errorNewPassword.style.display = 'block';
                }
                passValid = false;
            } else if (newPass === currentPass) {
                if (errorNewPassword) {
                    errorNewPassword.textContent = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
                    errorNewPassword.style.display = 'block';
                }
                passValid = false;
            }

            // 3. Confirm password check
            if (confirmPass !== newPass) {
                if (errorConfirmPassword) {
                    errorConfirmPassword.textContent = 'Xác nhận mật khẩu mới không khớp.';
                    errorConfirmPassword.style.display = 'block';
                }
                passValid = false;
            }

            if (!passValid) return;

            // Update password in master users list
            const users = getStoredUsers();
            const userIdx = users.findIndex(u => 
                String(u.id) === String(currentUser.id) ||
                (u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase())
            );

            if (userIdx !== -1) {
                users[userIdx].password  = newPass;
                users[userIdx].updatedAt = new Date().toISOString();
                saveStoredUsers(users);

                // Clear input fields
                if (inputCurrentPassword) inputCurrentPassword.value = '';
                if (inputNewPassword) inputNewPassword.value = '';
                if (inputConfirmPassword) inputConfirmPassword.value = '';

                if (passwordMsgBanner) {
                    passwordMsgBanner.className = 'profile-msg-banner success';
                    passwordMsgBanner.textContent = '✓ Đổi mật khẩu thành công!'; 
                    passwordMsgBanner.style.display = 'block';
                    passwordMsgBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                if (passwordMsgBanner) {
                    passwordMsgBanner.className = 'profile-msg-banner error';
                    passwordMsgBanner.textContent = 'Không tìm thấy tài khoản để cập nhật mật khẩu.';
                    passwordMsgBanner.style.display = 'block';
                }
            }
        });
    }
});
