/* ═══════════════════════════════════════════════════════════
   VOYAGER BENTO PORTFOLIO — Scripts (Production Build)
   ═══════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ───────────────────────────────────────────────────────
       CONSTANTS
       ─────────────────────────────────────────────────────── */
    const SCROLL_OFFSET = 80;
    const NAV_SCROLL_THRESHOLD = 60;
    const ACTIVE_SECTION_OFFSET = 200;
    const COUNTER_DURATION_MS = 1500;
    const CANVAS_LINE_COUNT_MIN = 150;
    const CANVAS_LINE_COUNT_RANGE = 50;
    const RESIZE_DEBOUNCE_MS = 150;
    const MAX_DPR = 2;
    const TILT_PERSPECTIVE = 800;
    const TILT_ANGLE = 5;

    /* ───────────────────────────────────────────────────────
       DOM HELPERS
       ─────────────────────────────────────────────────────── */

    /**
     * Query a single element. Returns null if not found.
     * @param {string} sel - CSS selector
     * @param {Document|Element} ctx - Query context
     * @returns {Element|null}
     */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);

    /**
     * Query all matching elements as a real Array.
     * @param {string} sel - CSS selector
     * @param {Document|Element} ctx - Query context
     * @returns {Element[]}
     */
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    /* ───────────────────────────────────────────────────────
       UTILITIES
       ─────────────────────────────────────────────────────── */

    /**
     * Returns true if the user prefers reduced motion.
     * @returns {boolean}
     */
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Create a debounced version of a function.
     * @param {Function} fn - Function to debounce
     * @param {number} ms - Delay in milliseconds
     * @returns {Function}
     */
    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    /**
     * Create an IntersectionObserver that auto-unobserves after triggering.
     * Reduces repetitive observer boilerplate used across skill bars,
     * counters, and reveal animations.
     *
     * @param {Function} callback - Called with the intersecting entry's target
     * @param {IntersectionObserverInit} options - Observer options
     * @returns {IntersectionObserver}
     */
    function createOnceObserver(callback, options = {}) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, options);
        return observer;
    }

    /**
     * Request fullscreen on an element, with cross-browser fallbacks.
     * Silently catches rejections (e.g. user gesture requirement).
     *
     * @param {Element} el - Element to make fullscreen
     */
    function requestFullscreen(el) {
        const rfs =
            el.requestFullscreen ||
            el.webkitRequestFullscreen ||
            el.msRequestFullscreen;

        if (rfs) {
            try {
                const result = rfs.call(el);
                // requestFullscreen returns a Promise in modern browsers
                if (result && typeof result.catch === 'function') {
                    result.catch(() => { /* silently ignore */ });
                }
            } catch (_) {
                /* older browsers may throw synchronously */
            }
        }
    }

    /* ═══════════════════════════════════════════════════════
       1. BACKGROUND CANVAS — Anime Speed Lines
       ═══════════════════════════════════════════════════════ */

    /**
     * Initialise the animated speed-line canvas background.
     * Skipped entirely when the user prefers reduced motion.
     */
    function initCanvas() {
        if (prefersReducedMotion()) return;

        const canvas = $('#bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w, h;
        let lines = [];
        let animFrameId = null;

        /** Populate the line array with random speed-line data. */
        function initLines() {
            lines = [];
            const count = CANVAS_LINE_COUNT_MIN + Math.random() * CANVAS_LINE_COUNT_RANGE;
            for (let i = 0; i < count; i++) {
                lines.push({
                    angle: Math.random() * Math.PI * 2,
                    speed: 15 + Math.random() * 25,
                    length: 100 + Math.random() * 400,
                    width: 0.5 + Math.random() * 2,
                    distance: Math.random() * (w || window.innerWidth),
                });
            }
        }

        /** Resize the canvas to match its CSS dimensions (DPR-aware). */
        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            w = canvas.offsetWidth;
            h = canvas.offsetHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            initLines();
        }

        /** Main render loop — draws speed lines radiating from centre. */
        function draw() {
            // Motion-blur effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h / 2;

            ctx.save();
            ctx.translate(cx, cy);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                line.distance += line.speed;

                if (line.distance > Math.max(w, h)) {
                    line.distance = 50 + Math.random() * 100;
                    line.angle = Math.random() * Math.PI * 2;
                }

                ctx.rotate(line.angle);
                ctx.beginPath();
                ctx.moveTo(line.distance, 0);
                ctx.lineTo(line.distance + line.length, 0);

                // Randomly colour lines gold, brown, or dark sand
                const r = Math.random();
                if (r > 0.9) {
                    ctx.strokeStyle = 'rgba(231, 189, 95, 0.4)';
                } else if (r > 0.8) {
                    ctx.strokeStyle = 'rgba(138, 110, 80, 0.4)';
                } else {
                    ctx.strokeStyle = 'rgba(28, 17, 7, 0.15)';
                }

                ctx.lineWidth = line.width;
                ctx.stroke();
                ctx.rotate(-line.angle);
            }

            ctx.restore();
            animFrameId = requestAnimationFrame(draw);
        }

        resize();
        draw();
        window.addEventListener('resize', debounce(resize, RESIZE_DEBOUNCE_MS));
    }

    /* ═══════════════════════════════════════════════════════
       2. NAVIGATION
       ═══════════════════════════════════════════════════════ */

    /** Set up sticky nav styling, active-link highlighting, and mobile menu toggle. */
    function initNav() {
        const nav = $('#main-nav');
        const toggle = $('#nav-toggle');
        const menu = $('#mobile-menu');

        if (!nav) return;

        window.addEventListener('scroll', () => {
            nav.classList.toggle('nav--scrolled', window.scrollY > NAV_SCROLL_THRESHOLD);

            // Determine the currently visible section for active-link styling
            const sections = $$('section[id], [id="hero"]');
            let current = 'hero';
            sections.forEach((s) => {
                if (window.scrollY >= s.offsetTop - ACTIVE_SECTION_OFFSET) {
                    current = s.id;
                }
            });

            $$('.nav__link').forEach((l) => {
                l.classList.toggle(
                    'nav__link--active',
                    l.getAttribute('href') === `#${current}`
                );
            });
        }, { passive: true });

        // Mobile hamburger toggle
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('nav__toggle--open');
                menu.classList.toggle('mobile-menu--open');
                document.body.style.overflow =
                    menu.classList.contains('mobile-menu--open') ? 'hidden' : '';
            });

            menu.querySelectorAll('a').forEach((a) => {
                a.addEventListener('click', () => {
                    toggle.classList.remove('nav__toggle--open');
                    menu.classList.remove('mobile-menu--open');
                    document.body.style.overflow = '';
                });
            });
        }
    }

    /* ═══════════════════════════════════════════════════════
       3. SMOOTH SCROLL
       ═══════════════════════════════════════════════════════ */

    /** Hijack anchor clicks for smooth-scroll behaviour with a nav offset. */
    function initSmoothScroll() {
        $$('a[href^="#"]').forEach((a) => {
            a.addEventListener('click', (e) => {
                const href = a.getAttribute('href');
                if (!href || href === '#') return;

                const target = $(href);
                if (target) {
                    e.preventDefault();
                    window.scrollTo({
                        top: target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET,
                        behavior: 'smooth',
                    });
                }
            });
        });
    }

    /* ═══════════════════════════════════════════════════════
       4. SCROLL REVEAL
       ═══════════════════════════════════════════════════════ */

    /** Animate elements into view as the user scrolls down. */
    function initReveal() {
        const els = $$('[data-reveal]');
        if (!els.length) return;

        const observer = createOnceObserver(
            (el) => el.classList.add('revealed'),
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );

        els.forEach((el, i) => {
            // Stagger based on position in grid
            el.style.transitionDelay = `${(i % 6) * 0.08}s`;
            observer.observe(el);
        });
    }

    /* ═══════════════════════════════════════════════════════
       5. SKILL BARS — Dynamic creation + animation
       ═══════════════════════════════════════════════════════ */

    /**
     * Build skill-bar track/fill DOM nodes and animate them
     * when they scroll into view.
     */
    function initSkillBars() {
        $$('.skill-bar').forEach((bar) => {
            const track = document.createElement('div');
            track.className = 'bar-track';

            const fill = document.createElement('div');
            fill.className = 'bar-fill';
            fill.style.setProperty('--level', bar.dataset.level + '%');

            track.appendChild(fill);
            bar.appendChild(track);
        });

        const observer = createOnceObserver(
            (el) => el.classList.add('animated'),
            { threshold: 0.3 }
        );
        $$('.bar-fill').forEach((f) => observer.observe(f));
    }

    /* ═══════════════════════════════════════════════════════
       6. COUNTER ANIMATION — Profile stats
       ═══════════════════════════════════════════════════════ */

    /** Animate numeric counters (e.g. "10 Projects", "9.14 CGPA") on scroll. */
    function initCounters() {
        const observer = createOnceObserver(
            (el) => {
                const target = parseFloat(el.dataset.count);
                if (isNaN(target)) return;

                const isDecimal = target % 1 !== 0;
                const start = performance.now();

                function tick(now) {
                    const progress = Math.min((now - start) / COUNTER_DURATION_MS, 1);
                    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                    const val = eased * target;
                    el.textContent = isDecimal ? val.toFixed(2) : Math.round(val);
                    if (progress < 1) requestAnimationFrame(tick);
                }

                requestAnimationFrame(tick);
            },
            { threshold: 0.5 }
        );

        $$('[data-count]').forEach((c) => observer.observe(c));
    }

    /* ═══════════════════════════════════════════════════════
       7. CARD MOUSE GLOW — Radial highlight follows cursor
       ═══════════════════════════════════════════════════════ */

    /** Attach CSS custom-property mouse tracking to every bento card. */
    function initCardGlow() {
        $$('.bento-card').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty(
                    '--mouse-x',
                    ((e.clientX - rect.left) / rect.width * 100) + '%'
                );
                card.style.setProperty(
                    '--mouse-y',
                    ((e.clientY - rect.top) / rect.height * 100) + '%'
                );
            }, { passive: true });
        });
    }

    /* ═══════════════════════════════════════════════════════
       8. 3D TILT — Project cards
       ═══════════════════════════════════════════════════════ */

    /** Apply a subtle 3D tilt on project cards following the cursor. */
    function initTilt() {
        if (window.matchMedia('(hover: none)').matches) return;

        $$('.bento-card--project').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform =
                    `perspective(${TILT_PERSPECTIVE}px) rotateX(${y * -TILT_ANGLE}deg) rotateY(${x * TILT_ANGLE}deg) translateY(-3px)`;
            }, { passive: true });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    /* ═══════════════════════════════════════════════════════
       9. PROJECT VIDEOS — Play on hover & Watch Video Button
       ═══════════════════════════════════════════════════════ */

    /** Lazy load video metadata (thumbnails) as they approach the viewport. */
    function initLazyVideos() {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const video = entry.target;
                    if (video.getAttribute('preload') === 'none') {
                        video.setAttribute('preload', 'metadata');
                    }
                    obs.unobserve(video);
                }
            });
        }, { rootMargin: '300px' });

        $$('video[preload="none"]').forEach((video) => observer.observe(video));
    }

    /** Set up video hover-play, click-fullscreen, and "Watch Video" buttons. */
    function initVideoControls() {
        // Play project video on card hover
        $$('.bento-card--project .project__img video').forEach((video) => {
            const card = video.closest('.bento-card--project');
            if (!card) return;

            card.addEventListener('mouseenter', () => {
                video.play().catch(() => { /* autoplay may be blocked */ });
            });

            card.addEventListener('mouseleave', () => {
                video.pause();
            });
        });

        // Click any video to play and enter fullscreen
        $$('video').forEach((video) => {
            video.addEventListener('click', () => {
                if (video.paused) {
                    video.play().catch(() => {});
                }

                if (!document.fullscreenElement) {
                    video.muted = false;
                    requestFullscreen(video);
                }
            });
        });

        // "Watch Video" button — play from start in fullscreen
        $$('.btn--watch-video').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const card = btn.closest('.bento-card--project');
                if (!card) return;

                const video = $('video', card);
                if (!video) return;

                video.currentTime = 0;
                video.muted = false;
                video.play().catch(() => {});
                requestFullscreen(video);
            });
        });
    }

    /* ═══════════════════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {
        initCanvas();
        initNav();
        initSmoothScroll();
        initReveal();
        initSkillBars();
        initCounters();
        initCardGlow();
        initTilt();
        initLazyVideos();
        initVideoControls();
    });
})();
