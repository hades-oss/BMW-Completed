// slider.js - Hero Slider functionality for BMW Website

document.addEventListener('DOMContentLoaded', () => {
    const heroSection = document.querySelector('.hero');
    const slides = document.querySelectorAll('.hero-slide');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    const dots = document.querySelectorAll('.slider-dot');
    const counterSpan = document.querySelector('.slide-counter');
    const progressBar = document.getElementById('hero-progress-bar');

    if (!slides.length) return;

    let currentIndex = 0;
    const totalSlides = slides.length;
    const autoSlideInterval = 4500; // 4.5 seconds
    let slideTimer = null;

    function showSlide(index) {
        // Handle wrap-around index
        if (index < 0) {
            currentIndex = totalSlides - 1;
        } else if (index >= totalSlides) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }

        // Update slides active state
        slides.forEach((slide, i) => {
            if (i === currentIndex) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        // Update dots active state
        dots.forEach((dot, i) => {
            if (i === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update counter (01 / 03, 02 / 03, etc.)
        if (counterSpan) {
            const formattedCurrent = String(currentIndex + 1).padStart(2, '0');
            const formattedTotal = String(totalSlides).padStart(2, '0');
            counterSpan.textContent = `${formattedCurrent} / ${formattedTotal}`;
        }

        // Update progress bar
        if (progressBar) {
            const progressPercent = ((currentIndex + 1) / totalSlides) * 100;
            progressBar.style.width = `${progressPercent}%`;
        }
    }

    function nextSlide() {
        showSlide(currentIndex + 1);
    }

    function prevSlide() {
        showSlide(currentIndex - 1);
    }

    function startAutoSlide() {
        stopAutoSlide();
        slideTimer = setInterval(nextSlide, autoSlideInterval);
    }

    function stopAutoSlide() {
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
    }

    function resetAutoSlide() {
        stopAutoSlide();
        startAutoSlide();
    }

    // Navigation buttons event listeners
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoSlide();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoSlide();
        });
    }

    // Dots event listeners
    dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'), 10);
            if (!isNaN(index) && index !== currentIndex) {
                showSlide(index);
                resetAutoSlide();
            }
        });
    });

    // Pause auto-slide on hover
    if (heroSection) {
        heroSection.addEventListener('mouseenter', stopAutoSlide);
        heroSection.addEventListener('mouseleave', startAutoSlide);
    }

    // Touch swipe support for mobile responsiveness
    let touchStartX = 0;
    let touchEndX = 0;

    if (heroSection) {
        heroSection.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        heroSection.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const threshold = 40;
        if (touchEndX < touchStartX - threshold) {
            nextSlide();
            resetAutoSlide();
        } else if (touchEndX > touchStartX + threshold) {
            prevSlide();
            resetAutoSlide();
        }
    }

    // Initialize first slide & start timer
    showSlide(0);
    startAutoSlide();
});
