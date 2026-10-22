// theme.js — BMW GYM EXT.1: Dark/Light Mode Management

(function () {
    'use strict';

    var THEME_KEY = 'bmw_theme';
    var THEME_LIGHT = 'light';
    var THEME_DARK = 'dark';

    /* ── Storage Helpers ─────────────────────────────────────────────── */

    function getStoredTheme() {
        try {
            var val = localStorage.getItem(THEME_KEY);
            if (val === THEME_DARK) return THEME_DARK;
            return THEME_LIGHT;
        } catch (e) {
            return THEME_LIGHT;
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(THEME_KEY, theme);
            return true;
        } catch (e) {
            console.warn('LocalStorage unavailable for theme persistence:', e);
            return false;
        }
    }

    /* ── Theme Application ───────────────────────────────────────────── */

    function applyTheme(theme) {
        var validTheme = (theme === THEME_DARK) ? THEME_DARK : THEME_LIGHT;
        document.documentElement.setAttribute('data-theme', validTheme);
        
        // Update all toggle buttons
        var buttons = document.querySelectorAll('.theme-toggle-btn, #theme-toggle-btn');
        buttons.forEach(function (btn) {
            if (validTheme === THEME_DARK) {
                btn.setAttribute('aria-label', 'Switch to light mode');
                btn.setAttribute('title', 'Switch to light mode');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.setAttribute('aria-label', 'Switch to dark mode');
                btn.setAttribute('title', 'Switch to dark mode');
                btn.setAttribute('aria-pressed', 'false');
            }
        });

        return validTheme;
    }

    function setTheme(theme) {
        var applied = applyTheme(theme);
        saveTheme(applied);
        return applied;
    }

    function getTheme() {
        return document.documentElement.getAttribute('data-theme') || getStoredTheme();
    }

    function toggleTheme() {
        var current = getTheme();
        var next = (current === THEME_DARK) ? THEME_LIGHT : THEME_DARK;
        return setTheme(next);
    }

    /* ── Immediate Execution to prevent FOUC ─────────────────────────── */
    var initialTheme = getStoredTheme();
    applyTheme(initialTheme);

    /* ── DOM Event Delegation & Sync ─────────────────────────────────── */

    function initThemeListeners() {
        // Re-apply to ensure any newly loaded buttons get correct aria attributes
        applyTheme(getTheme());

        // Event delegation for theme toggle button
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-toggle-btn, #theme-toggle-btn');
            if (!btn) return;
            e.preventDefault();
            toggleTheme();
        });

        // Cross-tab synchronization via storage event
        window.addEventListener('storage', function (e) {
            if (e.key === THEME_KEY) {
                var newTheme = (e.newValue === THEME_DARK) ? THEME_DARK : THEME_LIGHT;
                applyTheme(newTheme);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeListeners);
    } else {
        initThemeListeners();
    }

    /* ── Public API ──────────────────────────────────────────────────── */

    window.themeAPI = {
        getTheme: getTheme,
        setTheme: setTheme,
        toggleTheme: toggleTheme
    };

})();
