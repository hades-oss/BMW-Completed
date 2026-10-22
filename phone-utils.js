/**
 * js/phone-utils.js — BMW GYM Phone Country Code Selector & Validation Utilities (Phase 8.8)
 * Quản lý danh sách quốc gia, chuẩn hóa mã gọi quốc tế (+84, +1,...), tách/ghép số điện thoại,
 * kiểm tra tính hợp lệ thích ứng theo quốc gia và tương thích Light/Dark Mode.
 */

(function (window) {
    'use strict';

    // ── 1. Danh sách quốc gia và mã gọi quốc tế (Calling Codes) ─────────────
    const COUNTRIES = [
        { dialCode: '+84', name: 'Việt Nam', emoji: '🇻🇳', minLength: 9, maxLength: 10, example: '0905123456' },
        { dialCode: '+1', name: 'Mỹ / Canada', emoji: '🇺🇸', minLength: 10, maxLength: 10, example: '2025550143' },
        { dialCode: '+44', name: 'Vương quốc Anh', emoji: '🇬🇧', minLength: 9, maxLength: 11, example: '7911123456' },
        { dialCode: '+81', name: 'Nhật Bản', emoji: '🇯🇵', minLength: 9, maxLength: 11, example: '9012345678' },
        { dialCode: '+82', name: 'Hàn Quốc', emoji: '🇰🇷', minLength: 9, maxLength: 11, example: '1012345678' },
        { dialCode: '+65', name: 'Singapore', emoji: '🇸🇬', minLength: 8, maxLength: 8, example: '81234567' },
        { dialCode: '+61', name: 'Úc', emoji: '🇦🇺', minLength: 9, maxLength: 10, example: '412345678' },
        { dialCode: '+86', name: 'Trung Quốc', emoji: '🇨🇳', minLength: 11, maxLength: 11, example: '13812345678' },
        { dialCode: '+66', name: 'Thái Lan', emoji: '🇹🇭', minLength: 9, maxLength: 10, example: '812345678' },
        { dialCode: '+49', name: 'Đức', emoji: '🇩🇪', minLength: 10, maxLength: 12, example: '15112345678' },
        { dialCode: '+33', name: 'Pháp', emoji: '🇫🇷', minLength: 9, maxLength: 10, example: '612345678' },
        { dialCode: '+39', name: 'Ý', emoji: '🇮🇹', minLength: 9, maxLength: 11, example: '3123456789' },
        { dialCode: '+34', name: 'Tây Ban Nha', emoji: '🇪🇸', minLength: 9, maxLength: 10, example: '612345678' },
        { dialCode: '+91', name: 'Ấn Độ', emoji: '🇮🇳', minLength: 10, maxLength: 10, example: '9812345678' },
        { dialCode: '+7', name: 'Nga', emoji: '🇷🇺', minLength: 10, maxLength: 10, example: '9123456789' },
        { dialCode: '+63', name: 'Philippines', emoji: '🇵🇭', minLength: 10, maxLength: 10, example: '9171234567' },
        { dialCode: '+60', name: 'Malaysia', emoji: '🇲🇾', minLength: 9, maxLength: 10, example: '123456789' },
        { dialCode: '+62', name: 'Indonesia', emoji: '🇮🇩', minLength: 9, maxLength: 12, example: '8123456789' },
        { dialCode: '+886', name: 'Đài Loan', emoji: '🇹🇼', minLength: 9, maxLength: 9, example: '912345678' },
        { dialCode: '+852', name: 'Hồng Kông', emoji: '🇭🇰', minLength: 8, maxLength: 8, example: '91234567' }
    ];

    /**
     * Điền các tùy chọn mã quốc gia vào phần tử <select>
     * @param {HTMLSelectElement} selectEl Phần tử select cần điền
     * @param {string} selectedDialCode Mã gọi mặc định chọn (ví dụ: '+84')
     */
    function populateCountrySelect(selectEl, selectedDialCode) {
        if (!selectEl) return;
        const targetCode = selectedDialCode || '+84';
        selectEl.innerHTML = '';

        COUNTRIES.forEach(function (c) {
            const opt = document.createElement('option');
            opt.value = c.dialCode;
            opt.textContent = `${c.emoji} ${c.dialCode} (${c.name})`;
            if (c.dialCode === targetCode) {
                opt.selected = true;
            }
            selectEl.appendChild(opt);
        });

        // Nếu mã truyền vào không nằm trong danh sách chuẩn nhưng hợp lệ (VD: +999)
        if (targetCode && !COUNTRIES.some(function (c) { return c.dialCode === targetCode; })) {
            const extraOpt = document.createElement('option');
            extraOpt.value = targetCode;
            extraOpt.textContent = `🌐 ${targetCode} (Quốc tế)`;
            extraOpt.selected = true;
            selectEl.appendChild(extraOpt);
        }
    }

    /**
     * Tách số điện thoại thành dialCode và số hiển thị trong ô nhập
     * Đảm bảo không làm thay đổi hay nhân đôi mã quốc gia khi mở trang
     * @param {string} rawPhone Chuỗi số điện thoại lưu trữ
     * @returns {{dialCode: string, phone: string, hasPrefix: boolean}}
     */
    function parsePhoneNumber(rawPhone) {
        if (!rawPhone || typeof rawPhone !== 'string') {
            return { dialCode: '+84', phone: '', hasPrefix: false };
        }

        const trimmed = rawPhone.trim();
        if (!trimmed) {
            return { dialCode: '+84', phone: '', hasPrefix: false };
        }

        // Kiểm tra xem chuỗi có bắt đầu bằng '+' không
        if (trimmed.startsWith('+')) {
            // Sắp xếp các dialCode theo độ dài giảm dần để khớp chính xác nhất (+886 trước +84 trước +8 trước +1...)
            const sortedCountries = COUNTRIES.slice().sort(function (a, b) {
                return b.dialCode.length - a.dialCode.length;
            });

            for (let i = 0; i < sortedCountries.length; i++) {
                const c = sortedCountries[i];
                if (trimmed.startsWith(c.dialCode)) {
                    let rem = trimmed.substring(c.dialCode.length).trim();
                    // Nếu là Việt Nam và số còn lại không có 0 ở đầu, thêm lại 0 cho người dùng dễ nhìn
                    if (c.dialCode === '+84' && rem && !rem.startsWith('0') && rem.length === 9) {
                        rem = '0' + rem;
                    }
                    return {
                        dialCode: c.dialCode,
                        phone: rem,
                        hasPrefix: true
                    };
                }
            }

            // Trường hợp bắt đầu bằng '+' nhưng không trong danh sách chuẩn
            const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
            if (match) {
                return {
                    dialCode: match[1],
                    phone: match[2],
                    hasPrefix: true
                };
            }
        }

        // Xử lý trường hợp lỗi legacy "VN 0905123456" nếu có
        if (/^VN\s+/i.test(trimmed)) {
            return {
                dialCode: '+84',
                phone: trimmed.replace(/^VN\s+/i, '').trim(),
                hasPrefix: false
            };
        }

        // Mặc định không có tiền tố quốc tế -> Số nội địa Việt Nam
        return {
            dialCode: '+84',
            phone: trimmed,
            hasPrefix: false
        };
    }

    /**
     * Kiểm tra tính hợp lệ của số điện thoại thích ứng theo mã quốc gia đã chọn
     * @param {string} dialCode Mã gọi quốc tế (VD: '+84')
     * @param {string} phoneVal Số điện thoại nhập trong input
     * @param {boolean} isRequired Có bắt buộc nhập không
     * @returns {{valid: boolean, message: string}}
     */
    function validatePhone(dialCode, phoneVal, isRequired) {
        const val = (phoneVal || '').trim();

        if (!val) {
            if (isRequired) {
                return { valid: false, message: 'Số điện thoại không được để trống.' };
            }
            return { valid: true, message: '' };
        }

        // Không cho phép nhập tiền tố quốc gia trực tiếp vào ô số
        if (val.startsWith('+')) {
            return { valid: false, message: 'Vui lòng chọn mã quốc gia ở danh sách bên trái và chỉ nhập số điện thoại.' };
        }

        // Loại bỏ khoảng trắng và dấu gạch nối để kiểm tra chữ số
        const digits = val.replace(/[\s\-\.]/g, '');

        if (!/^\d+$/.test(digits)) {
            return { valid: false, message: 'Số điện thoại chỉ được chứa các chữ số (0-9).' };
        }

        // Quy tắc riêng cho Việt Nam (+84)
        if (dialCode === '+84') {
            // Định dạng Việt Nam: 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09
            // Hoặc 9 chữ số nếu bỏ số 0 (3, 5, 7, 8, 9)
            if (digits.length === 10) {
                if (!/^0[35789]\d{8}$/.test(digits)) {
                    return {
                        valid: false,
                        message: 'Số điện thoại Việt Nam không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09).'
                    };
                }
                return { valid: true, message: '' };
            } else if (digits.length === 9) {
                if (!/^[35789]\d{8}$/.test(digits)) {
                    return {
                        valid: false,
                        message: 'Số điện thoại Việt Nam không hợp lệ (bắt đầu bằng 3, 5, 7, 8, 9).'
                    };
                }
                return { valid: true, message: '' };
            } else {
                return {
                    valid: false,
                    message: 'Số điện thoại Việt Nam phải có 10 chữ số (bắt đầu bằng số 0).'
                };
            }
        }

        // Quy tắc cho các quốc gia khác
        const country = COUNTRIES.find(function (c) { return c.dialCode === dialCode; });
        if (country) {
            if (digits.length < country.minLength) {
                return {
                    valid: false,
                    message: `Số điện thoại phải có ít nhất ${country.minLength} chữ số cho ${country.name}.`
                };
            }
            if (digits.length > country.maxLength) {
                return {
                    valid: false,
                    message: `Số điện thoại không được vượt quá ${country.maxLength} chữ số cho ${country.name}.`
                };
            }
            return { valid: true, message: '' };
        }

        // Quốc tế tổng quát (theo chuẩn ITU E.164: 7 - 15 chữ số)
        if (digits.length < 7 || digits.length > 15) {
            return {
                valid: false,
                message: 'Số điện thoại quốc tế phải có độ dài từ 7 đến 15 chữ số.'
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * Định dạng số điện thoại để lưu vào LocalStorage
     * Tránh lặp lại mã quốc gia +84 hai lần và tôn trọng định dạng cũ của người dùng
     * @param {string} dialCode Mã quốc tế
     * @param {string} rawPhone Số điện thoại người dùng nhập
     * @param {boolean} wasPrefixed Trước đó số này có lưu kèm mã quốc tế không
     * @returns {string} Chuỗi hoàn chỉnh để lưu
     */
    function formatPhoneToSave(dialCode, rawPhone, wasPrefixed) {
        if (!rawPhone) return '';
        const clean = rawPhone.trim();
        if (!clean) return '';

        // Nếu đã có sẵn tiền tố dialCode trong chuỗi nhập, không thêm nữa
        if (clean.startsWith('+')) return clean;

        const code = dialCode || '+84';

        if (code === '+84') {
            // Đối với Việt Nam:
            // Nếu ban đầu người dùng lưu có tiền tố +84 thì tiếp tục lưu có tiền tố
            // Nếu ban đầu lưu số nội địa dạng "0905123456" thì giữ nguyên số nội địa
            const digits = clean.replace(/[\s\-\.]/g, '');
            if (wasPrefixed) {
                const noZero = digits.startsWith('0') ? digits.substring(1) : digits;
                return `+84 ${noZero}`;
            } else {
                // Đảm bảo có số 0 ở đầu nếu là số 9 chữ số
                if (digits.length === 9 && /^[35789]/.test(digits)) {
                    return `0${digits}`;
                }
                return digits;
            }
        } else {
            // Với các quốc gia khác: luôn lưu kèm mã quốc tế để định danh
            const digits = clean.replace(/[\s\-\.]/g, '');
            // Bỏ số 0 đứng đầu đối với số quốc tế nếu có
            const cleanDigits = digits.startsWith('0') ? digits.substring(1) : digits;
            return `${code} ${cleanDigits}`;
        }
    }

    // ── Export ra window namespace ──────────────────────────────────────────
    window.BMW_PHONE_UTILS = {
        COUNTRIES: COUNTRIES,
        populateCountrySelect: populateCountrySelect,
        parsePhoneNumber: parsePhoneNumber,
        validatePhone: validatePhone,
        formatPhoneToSave: formatPhoneToSave
    };

})(window);
