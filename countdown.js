// countdown.js - BMW Flash Sale Countdown Clock

document.addEventListener('DOMContentLoaded', () => {
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');
    const clockEl = document.getElementById('countdown-clock');
    const endedEl = document.getElementById('sale-ended-message');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    const FLASH_SALE_KEY = 'bmw_flash_sale_end';
    
    // Default sale duration: 2 days, 14 hours, 36 minutes, 25 seconds
    const DEFAULT_DURATION_MS = (2 * 24 * 60 * 60 * 1000) + (14 * 60 * 60 * 1000) + (36 * 60 * 1000) + (25 * 1000);

    let targetTime;
    const storedTarget = localStorage.getItem(FLASH_SALE_KEY);

    if (storedTarget) {
        targetTime = parseInt(storedTarget, 10);
    }

    // Set a persistent future end timestamp if not set or invalid
    if (!targetTime || isNaN(targetTime)) {
        targetTime = Date.now() + DEFAULT_DURATION_MS;
        localStorage.setItem(FLASH_SALE_KEY, targetTime.toString());
    }

    let timerInterval = null;

    function formatTwoDigits(num) {
        return String(Math.max(0, Math.floor(num))).padStart(2, '0');
    }

    function updateCountdown() {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
            // Sale Ended state
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';

            if (clockEl) clockEl.classList.add('hidden');
            if (endedEl) endedEl.classList.remove('hidden');

            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            return;
        }

        // Calculate time units
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Update DOM elements
        daysEl.textContent = formatTwoDigits(days);
        hoursEl.textContent = formatTwoDigits(hours);
        minutesEl.textContent = formatTwoDigits(minutes);
        secondsEl.textContent = formatTwoDigits(seconds);
    }

    // Initialize immediately & set 1s interval
    updateCountdown();
    timerInterval = setInterval(updateCountdown, 1000);
});
