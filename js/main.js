/**
 * XUDOMovie — MAIN SCRIPT
 * ─────────────────────────────────────────────────────────────
 * Sections follow the visual design flow top → bottom:
 *   1  Configuration & Constants
 *   2  State Variables
 *   3  Utility Helpers
 *   4  Local Storage & Watch History
 *   5  Toast Notifications
 *   6  Theme Toggle
 *   7  Header & Navigation (Header Scroll + Mega Menu)
 *   8  Search Subsystem
 *   9  UI Components (Cards, Skeletons, Delegation)
 *  10  Home Page (Hero Slider + Content Sections)
 *  11  Browse & Filter
 *  12  Watch Page & Player
 *  13  Trailer & Share
 *  14  Person Page
 *  15  Page-Level Favorites & Watch Later
 *  16  Static Page Support
 *  17  Back to Top
 *  18  AdBlock Detection
 *  19  Initialization
 * ─────────────────────────────────────────────────────────────
 * - All inline event handlers removed; addEventListener used throughout.
 * - Event delegation used for card buttons (fav / watch later).
 * - Single initSearchEvents definition.
 * - Google Analytics ID: G-FZLP60XCL2
 */

/* ==========================================================================
   1. CONFIGURATION & CONSTANTS
   ========================================================================== */
const INJECTED = window.XUDO_CONFIG || {};

const CONFIG = {
    AUTHORITY_DOMAIN: INJECTED.authority || window.location.hostname,
    get AUTHORITY_URL() { return 'https://' + this.AUTHORITY_DOMAIN; },
    IS_LOCALHOST: ['localhost', '127.0.0.1'].includes(window.location.hostname),
    isAuthority() { return window.location.hostname === this.AUTHORITY_DOMAIN; },
    API_KEY: INJECTED.apiKey || '9d3fd8464dbd695f9457240aeea19851'
};

const API_KEY    = CONFIG.API_KEY;
const BASE_URL   = 'https://api.themoviedb.org/3';
const IMG_HD     = 'https://image.tmdb.org/t/p/original';
const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
const IMG_THUMB  = 'https://image.tmdb.org/t/p/w92';
const IMG_STILL  = 'https://image.tmdb.org/t/p/w300';
const CURRENT_LANG = 'en-US';

const TEXTS = {
    allGenres    : 'All Genres',
    contWatch    : 'Continue Watching',
    clearHistory : 'Clear All',
    loadMore     : 'Load More',
    heroBtn      : 'WATCH MOVIE',
    trending     : 'TRENDING',
    viewMore     : 'View More',
    confirmClear : 'Are you sure?',
    movPopular   : 'Popular Movies',
    movNowPlaying: 'Now Playing',
    movUpcoming  : 'Upcoming',
    movTopRated  : 'Top Rated Movies',
    tvPopular    : 'Popular TV Shows',
    tvAiringToday: 'Airing Today',
    tvOnAir      : 'On TV',
    tvTopRated   : 'Top Rated TV Shows',
    season       : 'Season',
    sortRelevance: 'Relevance',
    sortPopular  : 'Popular',
    sortNewest   : 'Newest',
    sortOldest   : 'Oldest',
    sortRating   : 'Rating',
    sortLabel    : 'Sort:'
};

/**
 * Whitelisted origins allowed to send postMessage progress events.
 * Any message from an origin not in this Set is silently ignored to
 * prevent rogue iframes (e.g. ad banners) from manipulating watch history.
 */
const TRUSTED_PLAYER_ORIGINS = new Set([
    'https://vidlink.pro',
    'https://vidsrc.to',
]);

const DEPT_LABELS = {
    'Acting'          : 'Actor',
    'Directing'       : 'Director',
    'Writing'         : 'Writer',
    'Production'      : 'Producer',
    'Editing'         : 'Editor',
    'Camera'          : 'Cinematographer',
    'Sound'           : 'Sound',
    'Art'             : 'Art Director',
    'Visual Effects'  : 'Visual Effects',
    'Costume & Make-Up': 'Costume & Make-Up',
    'Crew'            : 'Crew',
    'Lighting'        : 'Lighting'
};

function deptLabel(dept) {
    return DEPT_LABELS[dept] || dept || 'Actor';
}

/* ==========================================================================
   2. STATE VARIABLES
   ========================================================================== */
let currentPage = 1,
    isLoading = false,
    currentSeason = 1,
    currentEpisode = 1,
    currentServer = 1;
let currentBrowseEndpoint = '',
    currentMediaType = 'movie',
    currentGenreId = null,
    searchDebounceTimer;
let LOCAL_SEARCH_INDEX = [];
let isSearchIndexLoaded = false;
let searchCurrentPage = 1,
    searchQuery = '',
    searchTotalPages = 1;
let searchAllItems = [];
let searchSortBy  = 'relevance';
let currentSortBy = 'popularity.desc';

/* ==========================================================================
   3. UTILITY HELPERS
   ========================================================================== */

/** Escape user-supplied strings before inserting into the DOM. */
function sanitizeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Write or update the <link rel="canonical"> tag. */
function updateCanonical() {
    const staticCanonical = document.querySelector("link[rel='canonical']");
    if (staticCanonical && !CONFIG.IS_LOCALHOST && staticCanonical.href.includes(CONFIG.AUTHORITY_DOMAIN)) return;
    let link = document.querySelector("link[rel='canonical']") || document.createElement('link');
    link.rel = 'canonical';
    const relativePath = window.location.pathname + window.location.search;
    link.href = CONFIG.IS_LOCALHOST ? window.location.href : CONFIG.AUTHORITY_URL + relativePath;
    if (!link.parentNode) document.head.appendChild(link);
}

/** Update <title> and meta description. */
function updateSEOMeta(title, description) {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.name    = 'description';
    meta.content = sanitizeHTML(description);
    if (!meta.parentNode) document.head.appendChild(meta);
}

/** Disable right-click, drag, and common DevTools shortcuts. */
function initContentProtection() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('dragstart',   e => e.preventDefault());
    document.addEventListener('keydown', e => {
        const blocked = ['F12', 'I', 'i', 'J', 'j', 'U', 'u', 'S', 's', 'P', 'p'];
        if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && blocked.includes(e.key))) {
            e.preventDefault();
            return false;
        }
    });
}

/* ==========================================================================
   4. LOCAL STORAGE & WATCH HISTORY
   ========================================================================== */

/** Returns true if the given content ID is in the user's favorites. */
function isFavorite(id) {
    return (JSON.parse(localStorage.getItem('xudo_favs')) || []).some(f => f.id == id);
}

/** Returns true if the given content ID is in the Watch Later list. */
function isWatchLater(id) {
    return (JSON.parse(localStorage.getItem('xudo_watch_later')) || []).some(f => f.id == id);
}

/** Returns the watch progress (0–100) for a given content ID. */
function getWatchProgress(id) {
    const history = JSON.parse(localStorage.getItem('xudo_history')) || [];
    return history.find(x => x.id == id)?.progress || 0;
}

/**
 * Persist watch progress percentage (0–100) for a given content ID.
 *
 * Only updates existing history entries; it never inserts.
 * This is intentional: updateContinueWatching() owns insertion and runs
 * at t = 5 s, while the first save from initProgressListener fires at t = 6 s,
 * guaranteeing the entry already exists by the time this is called.
 */
function saveWatchProgress(id, percent) {
    let history = JSON.parse(localStorage.getItem('xudo_history')) || [];
    const idx   = history.findIndex(x => x.id == id);
    if (idx === -1) return; // entry not yet created — updateContinueWatching will handle it
    history[idx].progress = Math.min(100, Math.max(0, Math.round(percent)));
    localStorage.setItem('xudo_history', JSON.stringify(history));
}

/**
 * Add or refresh a content item in the watch history.
 * Called 5 s after the watch page loads so the item is stored
 * even if the player does not fire postMessage events.
 */
function updateContinueWatching(item) {
    setTimeout(() => {
        let history = JSON.parse(localStorage.getItem('xudo_history')) || [];
        const existing = history.find(x => x.id == item.id);
        const existingProgress = existing?.progress || 0;
        history = history.filter(x => x.id !== item.id);

        const s = typeof currentSeason  !== 'undefined' ? currentSeason  : 1;
        const e = typeof currentEpisode !== 'undefined' ? currentEpisode : 1;

        history.unshift({
            id     : item.id,
            type   : item.media_type || (item.title ? 'movie' : 'tv'),
            title  : item.title || item.name,
            poster : item.poster_path
                ? (item.poster_path.startsWith('http') ? item.poster_path : IMG_POSTER + item.poster_path)
                : 'https://via.placeholder.com/500',
            year    : (item.release_date || item.first_air_date || '').split('-')[0],
            rating  : item.vote_average,
            season  : s,
            episode : e,
            progress: existingProgress
        });
        if (history.length > 20) history.pop();
        localStorage.setItem('xudo_history', JSON.stringify(history));
    }, 5000);
}

/**
 * Watch-progress subsystem.
 *
 * Three data sources are used, in descending order of accuracy:
 *   1. postMessage events from the embedded player (real timestamps, most accurate).
 *   2. Page elapsed time minus hidden time (fallback when the player is silent).
 *   3. startedTimer at 6 s (marks "started" so the card appears in Continue Watching).
 *
 * Key design decisions:
 *   - startedTimer fires at t = 6 s, after updateContinueWatching's t = 5 s delay,
 *     so the history entry is guaranteed to exist before the first save attempt.
 *   - Elapsed time is corrected for tab-hidden periods via the Page Visibility API,
 *     preventing overestimation when the browser tab is not active.
 *   - postMessage events are only trusted from TRUSTED_PLAYER_ORIGINS to prevent
 *     rogue iframes from manipulating the progress bar.
 *   - Content that reaches ≥ 98 % is reset to 0 so it can be re-watched cleanly.
 */
function initProgressListener(contentId, runtimeMinutes = 0) {
    let progressSavedViaMessage = false;

    // Use the moment the player iframe finished loading as the watch-start baseline.
    // Falls back to Date.now() when the player has not yet set the flag
    // (e.g. initStaticPage path where updatePlayer may not have been called).
    const watchStartTime = window._playerReadyTime || Date.now();

    // ── Page Visibility API ───────────────────────────────────────────────────
    // Track total time the tab was hidden so the fallback estimate stays accurate.
    // When the tab is not visible the embedded player is typically paused.
    let hiddenDuration = 0;
    let hiddenAt       = null;

    function onVisibilityChange() {
        if (document.hidden) {
            hiddenAt = Date.now();
        } else if (hiddenAt !== null) {
            hiddenDuration += Date.now() - hiddenAt;
            hiddenAt = null;
        }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    /** Active viewing time in minutes (tab-hidden periods excluded). */
    function activeElapsedMinutes() {
        const inProgressHiddenMs = hiddenAt !== null ? Date.now() - hiddenAt : 0;
        return (Date.now() - watchStartTime - hiddenDuration - inProgressHiddenMs) / 60000;
    }

    // ── postMessage listener ─────────────────────────────────────────────────
    function onPlayerMessage(event) {
        // Reject messages from untrusted origins (e.g. ad iframes).
        if (!TRUSTED_PLAYER_ORIGINS.has(event.origin)) return;
        try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data?.type !== 'timeupdate' || !(data.current > 0) || !(data.duration > 0)) return;

            const percent = (data.current / data.duration) * 100;

            if (percent >= 98) {
                // Content finished — reset to 0 so user can re-watch cleanly.
                saveWatchProgress(contentId, 0);
            } else if (percent > 2) {
                saveWatchProgress(contentId, percent);
            }
            // Disable the less-accurate fallback path once real events arrive.
            progressSavedViaMessage = true;
        } catch (_) {}
    }
    window.addEventListener('message', onPlayerMessage);

    // ── startedTimer ─────────────────────────────────────────────────────────
    // Fires at t = 6 s — 1 s after updateContinueWatching's t = 5 s delay —
    // so the localStorage entry is guaranteed to exist when saveWatchProgress runs.
    const startedTimer = setTimeout(() => {
        if (!progressSavedViaMessage) saveWatchProgress(contentId, 5);
    }, 6000);

    // ── Periodic fallback estimate (once per minute) ──────────────────────────
    let timeUpdateInterval = null;
    if (runtimeMinutes > 0) {
        timeUpdateInterval = setInterval(() => {
            // Stop estimating as soon as real player events take over.
            if (progressSavedViaMessage) { clearInterval(timeUpdateInterval); return; }
            const percent = Math.min(95, (activeElapsedMinutes() / runtimeMinutes) * 100);
            if (percent > 5) saveWatchProgress(contentId, percent);
        }, 60000);
    }

    // ── beforeunload — final save before the page closes ─────────────────────
    window.addEventListener('beforeunload', () => {
        if (!progressSavedViaMessage && runtimeMinutes > 0) {
            const percent = Math.min(95, (activeElapsedMinutes() / runtimeMinutes) * 100);
            if (percent > 2) saveWatchProgress(contentId, percent);
        }
        // Remove named listeners and cancel timers to avoid memory leaks
        // in single-page-application contexts where the watch page may reload.
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('message', onPlayerMessage);
        clearTimeout(startedTimer);
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    }, { once: true });
}

/** Load the pre-generated search index JSON (static file, cached). */
async function loadSearchIndex() {
    if (isSearchIndexLoaded) return;
    try {
        const ts   = new Date().getTime();
        const res  = await fetch(`search_index.json?v=${ts}`);
        if (res.ok) LOCAL_SEARCH_INDEX = await res.json();
        else {
            const res2 = await fetch(`../search_index.json?v=${ts}`);
            if (res2.ok) LOCAL_SEARCH_INDEX = await res2.json();
        }
        isSearchIndexLoaded = true;
    } catch (_) {}
}

/** Resolve the best URL for a content item (static slug or dynamic watch page). */
function getTargetUrl(item) {
    const type      = item.media_type || (item.title ? 'movie' : 'tv');
    const localFile = LOCAL_SEARCH_INDEX.find(x => x.id == item.id && x.type == type);
    let extraParams = '';
    if (type === 'tv' && item.season && item.episode) {
        extraParams = `&s=${item.season}&e=${item.episode}`;
    }
    return localFile
        ? `/${localFile.folder}/${localFile.slug}.html${extraParams ? '?' + extraParams.substring(1) : ''}`
        : `/watch.html?type=${type}&id=${item.id}${extraParams}`;
}

/** Remove all watch history after user confirmation. */
window.clearHistory = () => {
    if (confirm(TEXTS.confirmClear)) {
        localStorage.removeItem('xudo_history');
        document.getElementById('continue-watching-section')?.remove();
    }
};

/* ==========================================================================
   5. TOAST NOTIFICATIONS
   ========================================================================== */

/** Display a transient notification toast. Kept for compatibility. */
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id        = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
}

/* ==========================================================================
   6. THEME TOGGLE
   ========================================================================== */
function initThemeToggle() {
    const btn      = document.getElementById('theme-toggle');
    if (!btn) return;
    const iconSun  = document.getElementById('theme-icon-sun');
    const iconMoon = document.getElementById('theme-icon-moon');

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.setAttribute('data-theme', 'light');
            if (iconSun)  iconSun.style.display  = 'block';
            if (iconMoon) iconMoon.style.display = 'none';
        } else {
            document.body.removeAttribute('data-theme');
            if (iconSun)  iconSun.style.display  = 'none';
            if (iconMoon) iconMoon.style.display = 'block';
        }
        localStorage.setItem('xudo_theme', theme);
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.content = theme === 'light' ? '#f5f5f5' : '#0f0f0f';
    }

    const saved = localStorage.getItem('xudo_theme') || 'dark';
    applyTheme(saved);
    btn.addEventListener('click', () => {
        const next = (localStorage.getItem('xudo_theme') || 'dark') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    });
}

/* ==========================================================================
   7. HEADER & NAVIGATION
   ========================================================================== */

/** Add / remove the .scrolled class on the fixed header as the user scrolls. */
function initHeaderScroll() {
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.movie-header');
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
}

/**
 * Mega Menu — triggered by the hamburger button.
 * Desktop : full-width dropdown; top position is computed from the live
 *           header height so it always sits flush below the bar.
 * Mobile  : drawer slides in from the right.
 */
function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const megaMenu     = document.getElementById('mega-menu');
    const megaOverlay  = document.getElementById('mega-overlay');
    const megaClose    = document.getElementById('mega-close');

    // Mega menu is injected by global-header.js; bail if missing.
    if (!hamburgerBtn || !megaMenu || !megaOverlay) return;

    /** Return the bottom edge of the header in pixels. */
    function getHeaderBottom() {
        const header = document.querySelector('.movie-header');
        return header ? header.getBoundingClientRect().bottom : 70;
    }

    function openMenu() {
        if (window.innerWidth > 768) {
            megaMenu.style.top = getHeaderBottom() + 'px';
        }
        megaMenu.classList.add('active');
        megaOverlay.classList.add('active');
        document.body.classList.add('menu-open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        megaMenu.setAttribute('aria-hidden', 'false');
        megaOverlay.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
        megaMenu.classList.remove('active');
        megaOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        megaMenu.setAttribute('aria-hidden', 'true');
        megaOverlay.setAttribute('aria-hidden', 'true');
    }

    // Toggle on hamburger click
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        megaMenu.classList.contains('active') ? closeMenu() : openMenu();
    });

    // Close via the ✕ button inside the menu (mobile)
    megaClose?.addEventListener('click', closeMenu);

    // Close when the overlay backdrop is clicked
    megaOverlay.addEventListener('click', closeMenu);

    // Close when any navigation link is clicked
    megaMenu.querySelectorAll('.mega-link').forEach(link =>
        link.addEventListener('click', closeMenu)
    );

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && megaMenu.classList.contains('active')) closeMenu();
    });

    // Recalculate top position after window resize (desktop only)
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && megaMenu.classList.contains('active')) {
            megaMenu.style.top = getHeaderBottom() + 'px';
        }
    }, { passive: true });
}

/* ==========================================================================
   8. SEARCH SUBSYSTEM
   ========================================================================== */

/** Attach all search-related event listeners once the header is in the DOM. */
function initSearchEvents() {
    const input = document.getElementById('search-input');
    if (!input) return;

    // Pre-fill input from URL ?search= parameter
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) {
        input.value = sanitizeHTML(q);
        document.getElementById('clear-btn').classList.add('show-flex');
    }

    // Ensure the dropdown container exists (global-header.js already creates it)
    let drop = document.getElementById('search-dropdown');
    if (!drop) {
        drop = document.createElement('div');
        drop.id        = 'search-dropdown';
        drop.className = 'search-dropdown';
        document.querySelector('.search-wrapper').appendChild(drop);
    }

    // Debounced live search on input
    input.addEventListener('input', (e) => {
        document.getElementById('clear-btn').classList.toggle('show-flex', e.target.value.trim().length > 0);
        clearTimeout(searchDebounceTimer);
        const query = e.target.value.trim();
        if (query.length < 2) { drop.classList.remove('active'); return; }
        searchDebounceTimer = setTimeout(() => fetchLiveSearch(query), 300);
    });

    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeSearch(); });

    // Close dropdown when clicking outside the search wrapper
    document.addEventListener('click', (e) => {
        if (!document.querySelector('.search-wrapper').contains(e.target)) {
            drop.classList.remove('active');
        }
    });

    document.getElementById('clear-btn').addEventListener('click', clearSearch);
    document.querySelector('.search-btn').addEventListener('click', executeSearch);
}

/** Show / hide the clear (✕) button based on input content. */
window.toggleClearButton = function () {
    const input = document.getElementById('search-input');
    document.getElementById('clear-btn').classList.toggle('show-flex', input.value.trim().length > 0);
};

/** Clear the search input and hide the dropdown. */
window.clearSearch = function () {
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('clear-btn').classList.remove('show-flex');
    document.getElementById('search-dropdown').classList.remove('active');
};

/** Navigate to the full search results page. */
window.executeSearch = function () {
    const q = document.getElementById('search-input').value.trim();
    if (q) window.location.href = `index.html?search=${encodeURIComponent(q)}`;
};

/** Fetch live suggestions from TMDB and render the dropdown. */
async function fetchLiveSearch(query) {
    const dropdown = document.getElementById('search-dropdown');
    if (!isSearchIndexLoaded) await loadSearchIndex();
    try {
        const res  = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=${CURRENT_LANG}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        const seenIds = new Set();
        const results = data.results || [];

        const mediaItems  = [];
        const personItems = [];
        results.forEach(i => {
            if (i.media_type === 'movie' || i.media_type === 'tv') {
                if (!seenIds.has(i.id)) { mediaItems.push(i); seenIds.add(i.id); }
            } else if (i.media_type === 'person') {
                personItems.push(i);
                if (i.known_for) {
                    i.known_for.forEach(media => {
                        if ((media.media_type === 'movie' || media.media_type === 'tv') && !seenIds.has(media.id)) {
                            mediaItems.push(media);
                            seenIds.add(media.id);
                        }
                    });
                }
            }
        });

        const topMedia   = mediaItems.slice(0, 6);
        const topPersons = personItems.slice(0, 2);
        if (!topMedia.length && !topPersons.length) { dropdown.classList.remove('active'); return; }

        let html = '';

        // Person rows
        html += topPersons.map(p => {
            const name  = sanitizeHTML(p.name);
            const dept  = sanitizeHTML(deptLabel(p.known_for_department));
            const photo = p.profile_path ? IMG_THUMB + p.profile_path : 'https://via.placeholder.com/40x60?text=?';
            return `<a href="person.html?id=${p.id}" class="search-item search-item-actor">
                <img src="${photo}" alt="${name}" style="border-radius:50%;width:40px;height:40px;object-fit:cover;">
                <div class="search-item-info" style="flex:1;">
                    <span class="search-item-title">${name}</span>
                    <span class="search-item-meta">${dept} · VIEW FILMOGRAPHY</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;opacity:0.5"><polyline points="9 18 15 12 9 6"/></svg>
            </a>`;
        }).join('');

        // Media rows
        html += topMedia.map(i => {
            const title      = sanitizeHTML(i.title || i.name);
            const year       = sanitizeHTML((i.release_date || i.first_air_date || '').split('-')[0] || '');
            const poster     = i.poster_path ? IMG_THUMB + i.poster_path : 'https://via.placeholder.com/40x60?text=NA';
            const targetLink = getTargetUrl(i);
            return `<div class="search-item">
                <a href="${targetLink}" class="search-item-link">
                    <img src="${poster}" alt="${title}">
                    <div class="search-item-info">
                        <span class="search-item-title">${title}</span>
                        <span class="search-item-meta">${year} · ${i.media_type.toUpperCase()}</span>
                    </div>
                </a>
                <button class="search-fav-btn ${isFavorite(i.id) ? 'active' : ''}"
                    onclick="toggleFavoriteCore(${i.id},'${i.media_type}','${title.replace(/'/g,"\\'")}','${(i.poster_path?IMG_POSTER+i.poster_path:poster).replace(/'/g,"\\'")}','${year}','${i.vote_average?i.vote_average.toFixed(1):'NR'}',this)">
                    ${isFavorite(i.id) ? '❤️' : '🤍'}
                </button>
            </div>`;
        }).join('');

        html += `<a href="index.html?search=${encodeURIComponent(query)}" class="search-see-all">See all results for "<strong>${sanitizeHTML(query)}</strong>" ›</a>`;
        dropdown.innerHTML = html;
        dropdown.classList.add('active');
    } catch (_) {
        dropdown.classList.remove('active');
    }
}

/** Full-page search: renders actor cards + media grid with sort controls. */
async function performSearch(q, append = false) {
    const main = document.getElementById('main-content');
    if (!append) {
        searchCurrentPage = 1;
        searchQuery       = q;
        searchAllItems    = [];
        searchSortBy      = 'relevance';
        main.innerHTML = `
            <div class="media-grid-container">
                <h2 class="page-title">Searching...</h2>
                <div class="search-sort-bar" id="search-sort-bar" style="display:none;">
                    <span class="server-label">${TEXTS.sortLabel}</span>
                    <div class="server-control">
                        <button class="server-btn active" onclick="applySortToSearch('relevance',this)">${TEXTS.sortRelevance}</button>
                        <button class="server-btn" onclick="applySortToSearch('popular',this)">${TEXTS.sortPopular}</button>
                        <button class="server-btn" onclick="applySortToSearch('newest',this)">${TEXTS.sortNewest}</button>
                        <button class="server-btn" onclick="applySortToSearch('oldest',this)">${TEXTS.sortOldest}</button>
                        <button class="server-btn" onclick="applySortToSearch('rating',this)">${TEXTS.sortRating}</button>
                    </div>
                </div>
                <div id="actor-cards-container"></div>
                <div id="search-grid" class="media-grid"></div>
                <div class="load-more-container">
                    <button id="search-load-more" class="load-more-btn" style="display:none;">${TEXTS.loadMore}</button>
                </div>
            </div>`;
        renderSkeletons('search-grid', 10);
        attachCardDelegation('#search-grid');
    }

    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=${CURRENT_LANG}&query=${encodeURIComponent(q)}&page=${searchCurrentPage}`);
        if (!res.ok) throw new Error('Search API failed');
        const d = await res.json();
        searchTotalPages = d.total_pages;

        const seenIds = new Set();
        const mediaItems = [], personItems = [];
        (d.results || []).forEach(i => {
            if (i.media_type === 'movie' || i.media_type === 'tv') {
                if (!seenIds.has(i.id)) { mediaItems.push(i); seenIds.add(i.id); }
            } else if (i.media_type === 'person') {
                personItems.push(i);
                if (i.known_for) {
                    i.known_for.forEach(media => {
                        if ((media.media_type === 'movie' || media.media_type === 'tv') && !seenIds.has(media.id)) {
                            mediaItems.push(media);
                            seenIds.add(media.id);
                        }
                    });
                }
            }
        });

        if (!append) {
            const titleEl = main.querySelector('.page-title');
            if (titleEl) titleEl.textContent = `Results for: "${sanitizeHTML(q)}"`;
        }

        // Render actor cards and merge their credits on the first page
        if (!append && personItems.length > 0) {
            const actorContainer = document.getElementById('actor-cards-container');
            if (actorContainer) {
                actorContainer.innerHTML = personItems.slice(0, 3).map(p => createActorCardHTML(p)).join('');
            }
            const creditFetches   = personItems.slice(0, 3).map(p => fetchPersonCreditsForSearch(p.id, seenIds));
            const allCreditArrays = await Promise.allSettled(creditFetches);
            allCreditArrays.forEach(r => { if (r.status === 'fulfilled' && Array.isArray(r.value)) mediaItems.push(...r.value); });
        }

        const allItems = [...mediaItems];
        if (allItems.length) {
            searchAllItems = [...searchAllItems, ...allItems];
            const sortBar = document.getElementById('search-sort-bar');
            if (sortBar) sortBar.style.display = 'flex';
            renderSearchGrid(searchAllItems);
        } else if (!append) {
            document.getElementById('search-grid').innerHTML = '<div class="no-results">No results found.</div>';
        }

        const lmBtn = document.getElementById('search-load-more');
        if (lmBtn) {
            if (searchCurrentPage < searchTotalPages) {
                lmBtn.style.display = 'inline-block';
                lmBtn.textContent   = TEXTS.loadMore;
                lmBtn.onclick = () => {
                    searchCurrentPage++;
                    lmBtn.textContent = 'Loading...';
                    lmBtn.disabled    = true;
                    performSearch(searchQuery, true).then(() => { lmBtn.disabled = false; });
                };
            } else {
                lmBtn.style.display = 'none';
            }
        }
    } catch (error) {
        const grid = document.getElementById('search-grid');
        if (grid) grid.innerHTML = '<div class="no-results" style="color:var(--main-red);">Error fetching results. Please try again.</div>';
    }
}

/** Build the HTML for a person card shown in search results. */
function createActorCardHTML(person) {
    const name  = sanitizeHTML(person.name);
    const dept  = sanitizeHTML(deptLabel(person.known_for_department));
    const photo = person.profile_path
        ? IMG_POSTER + person.profile_path
        : "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3e%3crect width='500' height='750' fill='%231a1a1a'/%3e%3ccircle cx='250' cy='280' r='100' fill='%23333'/%3e%3cellipse cx='250' cy='560' rx='160' ry='120' fill='%23333'/%3e%3c/svg%3e";
    return `<div class="actor-search-card" onclick="location.href='person.html?id=${person.id}'" style="cursor:pointer;">
        <img src="${photo}" alt="${name}" class="actor-search-photo" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/80x120?text=?';">
        <div class="actor-search-info">
            <div class="actor-search-name">${name}</div>
            <div class="actor-search-dept">${dept}</div>
        </div>
        <div class="actor-search-cta">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            View Filmography
        </div>
    </div>`;
}

/** Fetch and filter credits for a person to enrich search results. */
async function fetchPersonCreditsForSearch(personId, seenIds) {
    try {
        const res  = await fetch(`${BASE_URL}/person/${personId}/combined_credits?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) return [];
        const data = await res.json();
        const credits = (data.cast || []).filter(i => {
            if (seenIds.has(i.id)) return false;
            if (i.media_type !== 'movie' && i.media_type !== 'tv') return false;
            if (!i.poster_path) return false;
            seenIds.add(i.id);
            return true;
        });
        return credits.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } catch (_) { return []; }
}

/** Re-render the search results grid applying the active sort order. */
function renderSearchGrid(items) {
    const grid = document.getElementById('search-grid');
    if (!grid) return;
    let sorted = [...items];
    switch (searchSortBy) {
        case 'popular': sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); break;
        case 'newest' : sorted.sort((a, b) => (b.release_date || b.first_air_date || '0') < (a.release_date || a.first_air_date || '0') ? 1 : -1); break;
        case 'oldest' : sorted.sort((a, b) => (a.release_date || a.first_air_date || '9') < (b.release_date || b.first_air_date || '9') ? -1 : 1); break;
        case 'rating' : sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)); break;
    }
    grid.innerHTML = sorted.map(i => createCardHTML(i, i.media_type || (i.title ? 'movie' : 'tv'))).join('');
    attachCardDelegation('#search-grid');
}

/** Update the active sort and re-render the search grid. */
window.applySortToSearch = function (val, btn) {
    searchSortBy = val;
    if (btn) {
        document.querySelectorAll('.search-sort-bar .server-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    renderSearchGrid(searchAllItems);
};

/* ==========================================================================
   9. UI COMPONENTS — CARDS, SKELETONS, DELEGATION
   ========================================================================== */

/** Fill a container with skeleton placeholder cards while content loads. */
function renderSkeletons(id, count) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = Array(count).fill('<div class="skeleton-card skeleton"></div>').join('');
}

/** Build the HTML string for a single content card. */
function createCardHTML(item, typeOverride) {
    const t           = item.media_type || typeOverride || (item.title ? 'movie' : 'tv');
    const title       = sanitizeHTML(item.title || item.name);
    const releaseDate = item.release_date || item.first_air_date;
    const year        = releaseDate ? releaseDate.split('-')[0] : '????';

    const fallbackImage = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750' fill='%231a1a1a'%3e%3crect width='500' height='750' fill='%231a1a1a'/%3e%3cpath d='M250 345c-19.3 0-35 15.7-35 35s15.7 35 35 35 35-15.7 35-35-15.7-35-35-35zm0 60c-13.8 0-25-11.2-25-25s11.2-25 25-25 25 11.2 25 25-11.2 25-25 25z' fill='%23444'/%3e%3cpath d='M330 290H170c-16.5 0-30 13.5-30 30v110c0 16.5 13.5 30 30 30h160c16.5 0 30-13.5 30-30V320c0-16.5-13.5-30-30-30zm10 140c0 5.5-4.5 10-10 10H170c-5.5 0-10-4.5-10-10V320c0-5.5 4.5-10 10-10h160c5.5 0 10 4.5 10 10v110z' fill='%23444'/%3e%3ctext x='50%25' y='490' dominant-baseline='middle' text-anchor='middle' fill='%23444' font-family='sans-serif' font-size='24' font-weight='bold'%3eNO POSTER%3c/text%3e%3c/svg%3e";
    const poster      = item.poster_path
        ? (item.poster_path.startsWith('http') ? item.poster_path : IMG_POSTER + item.poster_path)
        : fallbackImage;
    const rating      = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
    const isFav       = isFavorite(item.id);
    const isWL        = isWatchLater(item.id);
    const progress    = getWatchProgress(item.id);
    const progressBar = progress > 0
        ? `<div class="card-progress-bar"><div class="card-progress-fill" style="width:${progress}%"></div></div>`
        : '';

    const targetLink    = getTargetUrl({ id: item.id, media_type: t, season: item.season, episode: item.episode });
    const mediaTypeLabel = t === 'movie' ? 'Movie' : 'TV Show';

    const favIcon = isFav
        ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

    const wlIcon = isWL
        ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11H8a1 1 0 0 1 0-2h4V7a1 1 0 0 1 2 0v5a1 1 0 0 1-1 1z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

    let continueBadge = '';
    if (t === 'tv' && item.season && item.episode) {
        continueBadge = `<span style="display:inline-block;margin-top:6px;background:var(--main-red);color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:4px;font-weight:700;">S${item.season} E${item.episode}</span>`;
    }

    return `
        <div class="content-card" data-href="${targetLink}" role="button" tabindex="0">
            <button class="card-fav-btn ${isFav ? 'active' : ''}"
                data-fav-id="${item.id}" data-fav-type="${t}"
                data-fav-title="${encodeURIComponent(title)}"
                data-fav-poster="${encodeURIComponent(poster)}"
                data-fav-year="${year}" data-fav-rating="${rating}">
                ${favIcon}
            </button>
            <button class="card-wl-btn ${isWL ? 'active' : ''}"
                data-wl-id="${item.id}" data-wl-type="${t}"
                data-wl-title="${encodeURIComponent(title)}"
                data-wl-poster="${encodeURIComponent(poster)}"
                data-wl-year="${year}" data-wl-rating="${rating}">
                ${wlIcon}
            </button>
            <img src="${poster}" alt="${title} (${year}) Full ${mediaTypeLabel} Review & Details"
                 loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}';">
            <span class="card-rating">★ ${rating}</span>
            ${progressBar}
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-year">${year} • ${t.toUpperCase()}</div>
                ${continueBadge}
            </div>
        </div>`;
}

/**
 * Attach a single click listener to a container.
 * Handles card navigation and fav/watch-later button toggles via delegation.
 */
function attachCardDelegation(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.addEventListener('click', (e) => {
        const card = e.target.closest('.content-card');
        if (!card) return;

        const btn = e.target.closest('button');
        if (!btn) {
            const href = card.dataset.href;
            if (href) location.href = href;
            return;
        }

        if (btn.classList.contains('card-fav-btn')) {
            e.preventDefault();
            toggleFavoriteCore(
                btn.dataset.favId, btn.dataset.favType,
                decodeURIComponent(btn.dataset.favTitle),
                decodeURIComponent(btn.dataset.favPoster),
                btn.dataset.favYear, btn.dataset.favRating, btn
            );
        }

        if (btn.classList.contains('card-wl-btn')) {
            e.preventDefault();
            toggleWatchLaterCore(
                btn.dataset.wlId, btn.dataset.wlType,
                decodeURIComponent(btn.dataset.wlTitle),
                decodeURIComponent(btn.dataset.wlPoster),
                btn.dataset.wlYear, btn.dataset.wlRating, btn
            );
        }
    });
}

/** Toggle a content item in the favorites list and update the button. */
function toggleFavoriteCore(id, type, title, poster, year, rating, btnElement) {
    let favs = JSON.parse(localStorage.getItem('xudo_favs')) || [];
    const index = favs.findIndex(f => f.id == id);
    const isFav = index !== -1;
    if (isFav) favs.splice(index, 1);
    else        favs.push({ id, type, title, poster, year, rating });
    localStorage.setItem('xudo_favs', JSON.stringify(favs));
    updateButtonState(btnElement, 'fav', !isFav);
}

/** Toggle a content item in the Watch Later list and update the button. */
function toggleWatchLaterCore(id, type, title, poster, year, rating, btnElement) {
    let list = JSON.parse(localStorage.getItem('xudo_watch_later')) || [];
    const index = list.findIndex(f => f.id == id);
    const isWL  = index !== -1;
    if (isWL) list.splice(index, 1);
    else       list.push({ id, type, title, poster, year, rating });
    localStorage.setItem('xudo_watch_later', JSON.stringify(list));
    updateButtonState(btnElement, 'wl', !isWL);
}

/** Swap the icon inside a card fav/wl button to reflect the new state. */
function updateButtonState(btn, type, active) {
    if (type === 'fav') {
        btn.innerHTML = active
            ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    } else if (type === 'wl') {
        btn.innerHTML = active
            ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11H8a1 1 0 0 1 0-2h4V7a1 1 0 0 1 2 0v5a1 1 0 0 1-1 1z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    }
    btn.classList.toggle('active', active);
}

/* ==========================================================================
   10. HOME PAGE — HERO SLIDER & CONTENT SECTIONS
   ========================================================================== */

/** Entry point for the home page. Handles search mode vs normal mode. */
async function initHome() {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) {
        document.querySelector('.hero-wrapper').style.display = 'none';
        updateSEOMeta(`Search: ${q} | XUDOMovie`, `Search results for "${q}" on XUDOMovie.`);
        await performSearch(q);
    } else {
        updateSEOMeta(
            'XUDOMovie | Premium HD Streaming for Movies & TV Shows',
            'Discover XUDOMovie, the premier destination for high-definition online streaming. Access an expansive library of blockbuster movies and critically acclaimed TV shows on demand.'
        );
        await loadHeroSlider();
        loadContinueWatching();
        await loadAllSections();
    }
}

/** Fetch and render the hero/trending slider with infinite drag support. */
async function loadHeroSlider() {
    try {
        const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) throw new Error('Trending fetch failed');
        const data   = await res.json();
        const slides = data.results.slice(0, 10);

        const container = document.getElementById('hero-slider');
        const dots      = document.getElementById('hero-dots');
        if (!container || !slides.length) return;

        // Cloned first/last slides enable infinite looping
        container.innerHTML = [slides[slides.length - 1], ...slides, slides[0]].map(i => {
            const link     = getTargetUrl(i);
            const title    = sanitizeHTML(i.title || i.name);
            const overview = sanitizeHTML(i.overview);
            return `<a href="${link}" class="hero-slide" style="background-image:linear-gradient(to top,#0f0f0f,transparent 90%),url('${IMG_HD + i.backdrop_path}')">
                <div class="hero-content">
                    <div class="hero-tag">${TEXTS.trending}</div>
                    <h1 class="hero-title">${title}</h1>
                    <p class="hero-desc">${overview}</p>
                    <div class="hero-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        ${TEXTS.heroBtn}
                    </div>
                </div>
            </a>`;
        }).join('');

        if (dots) {
            dots.innerHTML = slides.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('');
            dots.querySelectorAll('.dot').forEach(d =>
                d.addEventListener('click', (e) => { e.stopPropagation(); snapTo(parseInt(d.dataset.index) + 1, true); })
            );
        }

        let idx = 1, busy = false, timer;
        const totalReal  = slides.length;
        const wrapper    = document.getElementById('hero-wrapper') || container;
        const sliderWidth = () => container.parentElement.offsetWidth || window.innerWidth;

        container.style.transition = 'none';
        container.style.transform  = 'translateX(-100%)';

        const updateDots = () => {
            if (!dots) return;
            dots.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
            let real = idx - 1;
            if (real < 0) real = totalReal - 1;
            if (real >= totalReal) real = 0;
            if (dots.children[real]) dots.children[real].classList.add('active');
        };

        const snapTo = (target, animate = true) => {
            if (busy) return;
            idx  = target;
            busy = true;
            container.style.transition = animate ? 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
            container.style.transform  = `translateX(-${idx * 100}%)`;
            updateDots();
            resetTimer();
            if (!animate) busy = false;
        };

        const next = () => { if (!busy && idx <= totalReal) snapTo(idx + 1); };
        const prev = () => { if (!busy && idx >= 1)         snapTo(idx - 1); };

        container.addEventListener('transitionend', () => {
            busy = false;
            if (idx === totalReal + 1) { idx = 1;         container.style.transition = 'none'; container.style.transform = 'translateX(-100%)'; }
            if (idx === 0)             { idx = totalReal;  container.style.transition = 'none'; container.style.transform = `translateX(-${totalReal * 100}%)`; }
        });

        const startTimer = () => { clearInterval(timer); timer = setInterval(next, 5000); };
        const resetTimer = () => { clearInterval(timer); startTimer(); };
        startTimer();

        // Real-time drag (touch + mouse)
        let pointerDown = false, startX = 0, startY = 0, dragOffset = 0, didDrag = false, directionLocked = null, lastMoveX = 0, lastMoveTime = 0;
        const DRAG_THRESHOLD = 8, SNAP_THRESHOLD = 0.15, VELOCITY_THRESHOLD = 0.3;

        const onPointerDown = (x, y) => {
            if (busy) return;
            pointerDown = true; startX = x; startY = y; dragOffset = 0; didDrag = false; directionLocked = null; lastMoveX = x; lastMoveTime = Date.now();
            container.style.transition = 'none';
            clearInterval(timer);
        };
        const onPointerMove = (x, y) => {
            if (!pointerDown) return;
            const dx = x - startX, dy = y - startY;
            if (!directionLocked) {
                if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                    directionLocked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
                }
            }
            if (directionLocked === 'v') return;
            if (directionLocked === 'h') {
                didDrag    = true;
                dragOffset = dx;
                const basePct = idx * 100;
                const dragPct = (dragOffset / sliderWidth()) * 100;
                let resisted  = dragPct;
                if ((idx === 1 && dragOffset > 0) || (idx === totalReal && dragOffset < 0)) resisted = dragPct * 0.3;
                container.style.transform = `translateX(${-basePct + resisted}%)`;
                lastMoveX = x; lastMoveTime = Date.now();
            }
        };
        const onPointerUp = (x) => {
            if (!pointerDown) return;
            pointerDown = false;
            if (!didDrag || directionLocked !== 'h') { startTimer(); directionLocked = null; return; }
            const dt         = Date.now() - lastMoveTime;
            const velocity   = dt > 0 ? Math.abs(x - lastMoveX) / dt : 0;
            const dragRatio  = Math.abs(dragOffset) / sliderWidth();
            let target       = idx;
            if (velocity > VELOCITY_THRESHOLD || dragRatio > SNAP_THRESHOLD) {
                target = dragOffset > 0 ? idx - 1 : idx + 1;
            }
            target = Math.max(0, Math.min(totalReal + 1, target));
            dragOffset = 0; directionLocked = null; busy = false;
            snapTo(target, true);
        };

        wrapper.addEventListener('touchstart',  e => { const t = e.touches[0]; onPointerDown(t.clientX, t.clientY); }, { passive: true });
        wrapper.addEventListener('touchmove',   e => { const t = e.touches[0]; onPointerMove(t.clientX, t.clientY); if (directionLocked === 'h') e.preventDefault(); }, { passive: false });
        wrapper.addEventListener('touchend',    e => { const t = e.changedTouches[0]; onPointerUp(t.clientX); }, { passive: true });
        wrapper.addEventListener('touchcancel', () => { pointerDown = false; didDrag = false; directionLocked = null; snapTo(idx, true); });

        container.addEventListener('mousedown', e => { e.preventDefault(); onPointerDown(e.clientX, e.clientY); container.style.cursor = 'grabbing'; });
        window.addEventListener('mousemove',    e => { if (pointerDown) onPointerMove(e.clientX, e.clientY); });
        window.addEventListener('mouseup',      e => { if (pointerDown) { onPointerUp(e.clientX); container.style.cursor = 'grab'; } });

        container.querySelectorAll('.hero-slide').forEach(slide => {
            slide.addEventListener('click', e => {
                if (didDrag) { e.preventDefault(); e.stopPropagation(); requestAnimationFrame(() => { didDrag = false; }); }
            }, true);
        });

        document.addEventListener('keydown', e => {
            if (!document.getElementById('hero-wrapper')) return;
            if (e.key === 'ArrowRight') next();
            else if (e.key === 'ArrowLeft') prev();
        });

    } catch (error) {
        console.error('Hero slider error:', error);
    }
}

/** Render the Continue Watching row from localStorage history. */
function loadContinueWatching() {
    const history = JSON.parse(localStorage.getItem('xudo_history')) || [];
    if (!history.length) return;
    const main    = document.getElementById('main-content');
    const section = document.createElement('section');
    section.id        = 'continue-watching-section';
    section.className = 'content-section';
    section.innerHTML = `
        <div class="section-header">
            <h2 class="section-heading">${TEXTS.contWatch}</h2>
            <a href="javascript:void(0)" onclick="clearHistory()" class="section-more-link">${TEXTS.clearHistory}</a>
        </div>
        <div class="horizontal-slider">
            ${history.map(i => createCardHTML({
                id: i.id, media_type: i.type, title: i.title,
                poster_path: i.poster, release_date: i.year,
                vote_average: +i.rating, season: i.season, episode: i.episode
            })).join('')}
        </div>`;
    main.prepend(section);
    attachCardDelegation('#continue-watching-section .horizontal-slider');
}

/** Fetch all homepage content sections in parallel and render them. */
async function loadAllSections() {
    const main = document.getElementById('main-content');
    const sections = [
        { t: TEXTS.movPopular,    u: '/movie/popular',       k: 'movie' },
        { t: TEXTS.movNowPlaying, u: '/movie/now_playing',   k: 'movie' },
        { t: TEXTS.movUpcoming,   u: '/movie/upcoming',      k: 'movie' },
        { t: TEXTS.movTopRated,   u: '/movie/top_rated',     k: 'movie' },
        { t: TEXTS.tvPopular,     u: '/tv/popular',          k: 'tv'    },
        { t: TEXTS.tvAiringToday, u: '/tv/airing_today',     k: 'tv'    },
        { t: TEXTS.tvOnAir,       u: '/tv/on_the_air',       k: 'tv'    },
        { t: TEXTS.tvTopRated,    u: '/tv/top_rated',        k: 'tv'    }
    ];

    const promises = sections.map(async (s) => {
        const res = await fetch(`${BASE_URL}${s.u}?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) throw new Error(`Section ${s.t} failed`);
        const d = await res.json();
        return { ...s, results: d.results };
    });

    const settled = await Promise.allSettled(promises);
    settled.forEach((result, i) => {
        if (result.status === 'rejected') { console.error(`Section error: ${sections[i].t}`, result.reason); return; }
        const { t, u, k, results } = result.value;
        if (!results.length) return;
        const link    = `browse.html?endpoint=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}&type=${k}&lang=${CURRENT_LANG}`;
        const section = document.createElement('section');
        section.className = 'content-section';
        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-heading"><a href="${link}">${t}</a></h2>
                <a href="${link}" class="section-more-link">${TEXTS.viewMore} ›</a>
            </div>
            <div class="horizontal-slider">
                ${results.map(item => createCardHTML(item, k)).join('')}
            </div>`;
        main.appendChild(section);
        attachCardDelegation(`section:nth-of-type(${main.children.length}) .horizontal-slider`);

        // Insert an ad banner between sections
        if (i < sections.length - 1) {
            const adDiv = document.createElement('div');
            adDiv.className = 'ad-banner-container';
            adDiv.innerHTML = `<div class="ad-banner" style="background:transparent;border:none;">
                <iframe src="ad-banner.html" width="100%" height="90" frameborder="0" scrolling="no" style="max-width:728px;border:none;overflow:hidden;"></iframe>
            </div>`;
            main.appendChild(adDiv);
        }
    });
}

/* ==========================================================================
   11. BROWSE & FILTER
   ========================================================================== */

/** Entry point for browse.html — routes to favorites, watch-later, or TMDB endpoint. */
async function initBrowse() {
    const params = new URLSearchParams(window.location.search);
    const ep     = params.get('endpoint');
    const title  = params.get('title');
    const type   = params.get('type');

    if (type === 'favorites') {
        document.getElementById('page-title').innerText = 'My Favorites';
        document.getElementById('genre-list').style.display = 'none';
        document.getElementById('load-more-btn').style.display = 'none';
        const favs = JSON.parse(localStorage.getItem('xudo_favs')) || [];
        document.getElementById('browse-grid').innerHTML = favs.length
            ? favs.map(f => createCardHTML({ id: f.id, media_type: f.type, title: f.title, poster_path: f.poster, release_date: f.year, vote_average: parseFloat(f.rating) })).join('')
            : '<div class="no-results">No favorites yet.</div>';
        attachCardDelegation('#browse-grid');
        return;
    }

    if (type === 'watchlater') {
        document.getElementById('page-title').innerText = 'Watch Later';
        document.getElementById('genre-list').style.display = 'none';
        document.getElementById('load-more-btn').style.display = 'none';
        const wl = JSON.parse(localStorage.getItem('xudo_watch_later')) || [];
        document.getElementById('browse-grid').innerHTML = wl.length
            ? wl.map(f => createCardHTML({ id: f.id, media_type: f.type, title: f.title, poster_path: f.poster, release_date: f.year, vote_average: parseFloat(f.rating) })).join('')
            : '<div class="no-results">Your Watch Later list is empty.</div>';
        attachCardDelegation('#browse-grid');
        return;
    }

    if (!ep) return (window.location.href = 'index.html');

    document.getElementById('page-title').innerText = sanitizeHTML(title);
    document.getElementById('load-more-btn').onclick = () => loadBrowseContent();
    currentMediaType      = type;
    currentBrowseEndpoint = ep;
    renderSkeletons('browse-grid', 15);
    attachCardDelegation('#browse-grid');
    await fetchGenres(type);
    await loadBrowseContent();
}

/** Load the next page of browse results from TMDB. */
async function loadBrowseContent() {
    if (isLoading) return;
    isLoading = true;
    const btn = document.getElementById('load-more-btn');
    btn.innerText = 'Loading...';
    btn.disabled  = true;
    try {
        const sep = currentBrowseEndpoint.includes('?') ? '&' : '?';
        const res = await fetch(`${BASE_URL}${currentBrowseEndpoint}${sep}api_key=${API_KEY}&language=${CURRENT_LANG}&page=${currentPage}`);
        if (!res.ok) throw new Error('Browse content fetch failed');
        const d = await res.json();

        if (currentPage === 1) document.getElementById('browse-grid').innerHTML = '';
        document.getElementById('browse-grid').insertAdjacentHTML('beforeend',
            d.results.map(i => createCardHTML(i, currentMediaType)).join('')
        );

        currentPage++;
        if (d.page >= d.total_pages) {
            btn.style.display = 'none';
        } else {
            btn.innerText     = TEXTS.loadMore;
            btn.disabled      = false;
            btn.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Browse fetch error:', error);
        btn.innerText = 'Retry';
        btn.disabled  = false;
    } finally {
        isLoading = false;
    }
}

/** Render genre filter buttons; results are cached in localStorage. */
async function fetchGenres(type) {
    const list = document.getElementById('genre-list');
    if (!list) return;
    list.innerHTML = `<button class="genre-btn active" onclick="filterByGenre(null,this)">${TEXTS.allGenres}</button>`;

    const addGenreBtn = (g) => {
        const b      = document.createElement('button');
        b.className  = 'genre-btn';
        b.innerText  = g.name;
        b.onclick    = () => filterByGenre(g.id, b);
        list.appendChild(b);
    };

    const cacheKey = `xudo_genres_en_${type}`;
    const cached   = localStorage.getItem(cacheKey);
    if (cached) {
        JSON.parse(cached).forEach(addGenreBtn);
    } else {
        try {
            const res = await fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=en-US`);
            if (!res.ok) throw new Error('Failed to fetch genres');
            const d = await res.json();
            if (d.genres) {
                localStorage.setItem(cacheKey, JSON.stringify(d.genres));
                d.genres.forEach(addGenreBtn);
            }
        } catch (error) { console.error('Fetch genres error:', error); }
    }
}

/** Filter browse results by genre; delegates to applyAdvancedFilters if active. */
window.filterByGenre = function (id, btn) {
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentGenreId = id;
    if (typeof window.applyAdvancedFilters === 'function' && document.querySelector('.modern-filters-container')) {
        window.applyAdvancedFilters();
    } else {
        currentPage = 1;
        document.getElementById('browse-grid').innerHTML = '';
        renderSkeletons('browse-grid', 10);
        currentBrowseEndpoint = id
            ? `/discover/${currentMediaType}?with_genres=${id}&sort_by=popularity.desc`
            : new URLSearchParams(window.location.search).get('endpoint');
        loadBrowseContent();
    }
};

/** Build a TMDB /discover URL from the active filter UI values and reload results. */
window.applyAdvancedFilters = async function () {
    const year    = document.getElementById('filter-year')?.value.trim() || '';
    const country = document.getElementById('filter-country')?.value || '';
    let sort      = document.getElementById('filter-sort')?.value || currentSortBy;
    if (currentMediaType === 'tv' && sort === 'primary_release_date.desc') sort = 'first_air_date.desc';
    currentSortBy = sort;

    currentPage = 1;
    document.getElementById('browse-grid').innerHTML = '';
    renderSkeletons('browse-grid', 10);

    let params = `?sort_by=${sort}`;
    if (currentGenreId) params += `&with_genres=${currentGenreId}`;
    if (year)    params += `&${currentMediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year'}=${year}`;
    if (country) params += `&with_origin_country=${country}`;
    const today = new Date().toISOString().slice(0, 10);
    params += currentMediaType === 'movie' ? `&primary_release_date.lte=${today}` : `&first_air_date.lte=${today}`;

    currentBrowseEndpoint = `/discover/${currentMediaType}${params}`;

    const sortLabels = { 'popularity.desc': 'Popular', 'vote_average.desc': 'Top Rated', 'primary_release_date.desc': 'Newest', 'first_air_date.desc': 'Newest', 'title.asc': 'A–Z' };
    renderFilterBadges(year, country, sortLabels[sort] || '');
    loadBrowseContent();
};

/** Render dismissible filter badge pills above the grid. */
function renderFilterBadges(year, country, sortLabel) {
    let container = document.getElementById('active-filter-badges');
    if (!container) {
        container = document.createElement('div');
        container.id        = 'active-filter-badges';
        container.className = 'active-filter-badges';
        const refNode = document.querySelector('.modern-filters-container') || document.getElementById('browse-grid');
        if (refNode) refNode.before(container);
    }
    const badges = [];
    if (year)                           badges.push(`<span class="filter-badge">Year: ${sanitizeHTML(year)} <button onclick="clearFilterBadge('year')">✕</button></span>`);
    if (country)                        badges.push(`<span class="filter-badge">Country: ${sanitizeHTML(country)} <button onclick="clearFilterBadge('country')">✕</button></span>`);
    if (sortLabel && sortLabel !== 'Popular') badges.push(`<span class="filter-badge">Sort: ${sanitizeHTML(sortLabel)} <button onclick="clearFilterBadge('sort')">✕</button></span>`);
    container.innerHTML = badges.join('');
}

/** Remove a single filter badge and re-apply filters. */
window.clearFilterBadge = function (type) {
    if (type === 'year') {
        const el = document.getElementById('filter-year');
        if (el) el.value = '';
    } else if (type === 'country') {
        const input   = document.getElementById('filter-country');
        const trigger = document.getElementById('country-trigger');
        if (input)   input.value = '';
        if (trigger) trigger.textContent = 'All Countries';
        document.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
    } else if (type === 'sort') {
        const select = document.getElementById('filter-sort');
        if (select) select.value = 'popularity.desc';
        currentSortBy = 'popularity.desc';
    }
    window.applyAdvancedFilters();
};

/** Initialise the custom country dropdown widget. */
function initCustomSelect() {
    const wrapper = document.getElementById('country-dropdown');
    if (!wrapper) return;
    const trigger = document.getElementById('country-trigger');
    const options = wrapper.querySelectorAll('.custom-option');
    const hidden  = document.getElementById('filter-country');

    trigger.addEventListener('click', (e) => { e.stopPropagation(); wrapper.classList.toggle('open'); });
    options.forEach(opt => {
        opt.addEventListener('click', function (e) {
            e.stopPropagation();
            trigger.textContent = this.textContent;
            hidden.value        = this.dataset.value;
            options.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            wrapper.classList.remove('open');
        });
    });
    document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) wrapper.classList.remove('open'); });
}

/* ==========================================================================
   12. WATCH PAGE & PLAYER
   ========================================================================== */

/** Entry point for watch.html — reads URL params and bootstraps the player. */
async function initWatchPage() {
    const p    = new URLSearchParams(window.location.search);
    const type = p.get('type'), id = p.get('id');
    currentSeason  = parseInt(p.get('s')) || 1;
    currentEpisode = parseInt(p.get('e')) || 1;
    if (!id || !type) return (window.location.href = 'index.html');

    updatePlayer(type, id);
    if (type === 'tv') {
        const c = document.getElementById('tv-controls');
        if (c) c.style.display = 'block';
        await loadTVSeasons(id);
    }
    await fetchMovieDetails(type, id);
    initProgressListener(id, window._currentRuntimeMinutes || 0);
    await fetchCertification(type, id);
    await fetchCast(type, id);
    await fetchSimilarMovies(type, id);
}

/** Write the player iframe for the selected server into the player container. */
function updatePlayer(type, id) {
    const el = document.getElementById('player-container') || document.getElementById('static-player');
    if (!el) return;

    // Reset the ready-time flag so initProgressListener gets a fresh baseline
    // when the user switches server or episode.
    window._playerReadyTime = null;

    el.innerHTML = '<div style="display:grid;place-items:center;height:100%;background:#000;color:#fff"><div class="loader">Loading Player...</div></div>';

    let src = '';
    if (type === 'movie') {
        switch (currentServer) {
            case 1: src = `https://vidlink.pro/movie/${id}`; break;
            case 2: src = `https://vidsrc.to/embed/movie/${id}`; break;
            default: src = `https://vidlink.pro/movie/${id}`;
        }
    } else {
        switch (currentServer) {
            case 1: src = `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}`; break;
            case 2: src = `https://vidsrc.to/embed/tv/${id}/${currentSeason}/${currentEpisode}`; break;
            default: src = `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}`;
        }
    }

    // Build the iframe via DOM API (avoids innerHTML injection) and record the
    // exact moment it finishes loading as the watch-start time baseline.
    const iframe = document.createElement('iframe');
    iframe.src          = src;
    iframe.className    = 'player-frame';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'autoplay');
    iframe.scrolling    = 'no';
    iframe.frameBorder  = '0';
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    iframe.addEventListener('load', () => {
        // Record when the player document is ready — used as the watch-start
        // baseline in initProgressListener to avoid counting page-load time.
        window._playerReadyTime = Date.now();
    }, { once: true });

    el.innerHTML = '';
    el.appendChild(iframe);
}

/** Switch to a different embed server and reload the player. */
window.changeServer = function (serverNum) {
    currentServer = serverNum;
    document.querySelectorAll('.server-btn').forEach((btn, idx) => btn.classList.toggle('active', idx === serverNum - 1));
    const p = new URLSearchParams(window.location.search);
    let type = p.get('type'), id = p.get('id');
    if (!type && window.XUDO_STATIC_DATA) { type = window.XUDO_STATIC_DATA.type; id = window.XUDO_STATIC_DATA.id; }
    if (type && id) updatePlayer(type, id);
};

/** Populate the season selector and load the first season's episodes. */
async function loadTVSeasons(id) {
    const s = document.getElementById('season-select');
    s.onchange = (e) => {
        currentSeason  = parseInt(e.target.value);
        currentEpisode = 1;
        loadEpisodesForSeason(id, currentSeason);
        updatePlayer('tv', id);
        let history = JSON.parse(localStorage.getItem('xudo_history')) || [];
        const idx   = history.findIndex(x => x.id == id);
        if (idx > -1) { history[idx].season = currentSeason; history[idx].episode = currentEpisode; localStorage.setItem('xudo_history', JSON.stringify(history)); }
    };
    try {
        const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) throw new Error('TV details failed');
        const d = await res.json();
        s.innerHTML = '';
        d.seasons.forEach(x => {
            if (x.season_number > 0) {
                const opt    = document.createElement('option');
                opt.value    = x.season_number;
                opt.text     = `${TEXTS.season} ${x.season_number}`;
                if (x.season_number == currentSeason) opt.selected = true;
                s.appendChild(opt);
            }
        });
        loadEpisodesForSeason(id, currentSeason);
    } catch (error) { console.error('TV seasons load error:', error); }
}

/** Render the episode card grid for the given season. */
async function loadEpisodesForSeason(id, sn) {
    const grid = document.getElementById('episodes-grid');
    grid.innerHTML = '<div style="color:#888;font-size:0.85rem;padding:10px;">Loading episodes...</div>';
    try {
        const res = await fetch(`${BASE_URL}/tv/${id}/season/${sn}?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) throw new Error(`Season ${sn} fetch failed`);
        const d = await res.json();
        grid.className = 'episodes-grid episodes-grid-rich';
        grid.innerHTML = '';
        d.episodes.forEach(ep => {
            const thumb   = ep.still_path ? IMG_STILL + ep.still_path : 'https://via.placeholder.com/300x170/1a1a1a/666?text=No+Preview';
            const epTitle = sanitizeHTML(ep.name || `Episode ${ep.episode_number}`);
            const epDate  = ep.air_date ? ep.air_date.split('-')[0] : '';
            const isActive = ep.episode_number === currentEpisode;

            const card      = document.createElement('div');
            card.className  = `ep-card ${isActive ? 'active' : ''}`;
            card.innerHTML  = `
                <div class="ep-card-thumb">
                    <img src="${thumb}" alt="Episode ${ep.episode_number}" loading="lazy">
                    <span class="ep-card-num">Ep ${ep.episode_number}</span>
                </div>
                <div class="ep-card-info">
                    <div class="ep-card-title">${epTitle}</div>
                    ${epDate ? `<div class="ep-card-date">${epDate}</div>` : ''}
                </div>`;
            card.addEventListener('click', () => {
                currentEpisode = ep.episode_number;
                document.querySelectorAll('.ep-card').forEach(x => x.classList.remove('active'));
                card.classList.add('active');
                updatePlayer('tv', id);
                let history = JSON.parse(localStorage.getItem('xudo_history')) || [];
                const hi    = history.findIndex(x => x.id == id);
                if (hi > -1) { history[hi].season = currentSeason; history[hi].episode = currentEpisode; localStorage.setItem('xudo_history', JSON.stringify(history)); }
            });
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Episodes load error:', error);
        grid.innerHTML = '<span style="color:red;padding:10px;">Failed to load episodes.</span>';
    }
}

/** Fetch and render the movie/show detail panel below the player. */
async function fetchMovieDetails(type, id) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) return (document.querySelector('.watch-container').innerHTML = '<div class="error-message">Not Found</div>');
        const d = await res.json();
        try { updateContinueWatching(d); } catch (_) {}

        const title = d.title || d.name;
        const year  = (d.release_date || d.first_air_date || '').split('-')[0] || '----';
        const rt    = type === 'movie' && d.runtime
            ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
            : (type === 'tv' && d.episode_run_time?.[0] ? `${d.episode_run_time[0]}m / ep` : 'N/A');
        window._currentRuntimeMinutes = type === 'movie'
            ? (d.runtime || 90)                          // default 90 min for unknown movies
            : (d.episode_run_time?.[0] || 45);           // 45 min is more representative for TV than 90

        updateSEOMeta(`${title} (${year}) - Reviews & Details | XUDOMovie`, `Read reviews and watch the trailer for ${title}.`);

        const seoBlurb = `Find movie summaries, production details, and trivia about <strong>${sanitizeHTML(title)}</strong> on <strong>${sanitizeHTML(window.location.hostname)}</strong>.`;
        document.getElementById('detail-title').textContent    = title;
        document.getElementById('detail-overview').innerHTML   = sanitizeHTML(d.overview || 'No synopsis available.') + `<br><br><span style="color:#888;font-size:0.9rem;">${seoBlurb}</span>`;
        document.getElementById('detail-year').textContent     = year;
        document.getElementById('detail-rating').textContent   = `⭐ ${d.vote_average?.toFixed(1) || 'NR'}`;
        document.getElementById('detail-runtime').textContent  = rt;

        const img = document.getElementById('detail-poster');
        if (img) { img.src = d.poster_path ? IMG_POSTER + d.poster_path : 'https://via.placeholder.com/500x750?text=No+Poster'; img.alt = title; }

        const genres = document.getElementById('detail-genres');
        if (genres && d.genres) genres.innerHTML = d.genres.map(g => `<span class="genre-tag">${sanitizeHTML(g.name)}</span>`).join('');

        const watchFullBtn = document.getElementById('watch-full-btn');
        if (watchFullBtn) { watchFullBtn.href = `https://xudomovie.us/watch.html?type=${type}&id=${id}`; watchFullBtn.target = '_blank'; }

        window.initPageActionButtons(id, type, title, d.poster_path ? IMG_POSTER + d.poster_path : '', year, d.vote_average?.toFixed(1) || 'NR');
    } catch (error) { console.error('Movie details fetch error:', error); }
}

/** Fetch and display the US content rating badge. */
async function fetchCertification(type, id) {
    const el = document.getElementById('detail-cert');
    if (!el) return;
    try {
        const res = await fetch(type === 'movie'
            ? `${BASE_URL}/movie/${id}/release_dates?api_key=${API_KEY}`
            : `${BASE_URL}/tv/${id}/content_ratings?api_key=${API_KEY}`
        );
        if (!res.ok) throw new Error('Certification API failed');
        const d = await res.json();
        const c = type === 'movie'
            ? d.results.find(r => r.iso_3166_1 === 'US')?.release_dates.find(x => x.certification)?.certification
            : d.results.find(r => r.iso_3166_1 === 'US')?.rating;
        if (c) { el.textContent = sanitizeHTML(c); el.style.display = 'inline-block'; }
    } catch (error) { console.warn('Could not fetch certification:', error); }
}

/** Fetch and render the first 10 cast members. */
async function fetchCast(type, id) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) throw new Error('Credits fetch failed');
        const d    = await res.json();
        const list = document.getElementById('cast-list');
        if (d.cast.length) {
            list.innerHTML = d.cast.slice(0, 10).map(a => {
                const name      = sanitizeHTML(a.name);
                const character = sanitizeHTML(a.character);
                return `<div class="cast-card" onclick="location.href='person.html?id=${a.id}'" style="cursor:pointer;">
                    <img src="${a.profile_path ? 'https://image.tmdb.org/t/p/w200' + a.profile_path : 'https://via.placeholder.com/200x200?text=No+Img'}" class="cast-img">
                    <div class="cast-name">${name}</div>
                    <div class="cast-character">${character}</div>
                </div>`;
            }).join('');
        } else {
            list.innerHTML = '<div style="color:#666;font-size:0.8rem;">No cast info available.</div>';
        }
    } catch (error) { console.error('Cast fetch error:', error); }
}

/** Fetch recommendations; falls back to /similar if empty. */
async function fetchSimilarMovies(type, id) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        if (!res.ok) throw new Error('Recommendations failed');
        const d = await res.json();
        if (d.results.length) {
            document.getElementById('rec-slider').innerHTML = d.results.map(i => createCardHTML(i, type)).join('');
        } else {
            const fallback = await fetch(`${BASE_URL}/${type}/${id}/similar?api_key=${API_KEY}&language=${CURRENT_LANG}`);
            const fd       = await fallback.json();
            document.getElementById('rec-slider').innerHTML = fd.results?.length ? fd.results.map(i => createCardHTML(i, type)).join('') : '';
        }
    } catch (error) { console.error('Similar content error:', error); }
}

/* ==========================================================================
   13. TRAILER & SHARE
   ========================================================================== */

/** Fetch and play the official YouTube trailer for the current watch page. */
window.openTrailer = async function () {
    const p    = new URLSearchParams(window.location.search);
    const type = p.get('type'), id = p.get('id');
    try {
        const res     = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=${CURRENT_LANG}`);
        const d       = await res.json();
        const trailer = d.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || d.results.find(v => v.site === 'YouTube');
        if (trailer) {
            document.getElementById('trailer-video-container').innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" allow="autoplay;encrypted-media" allowfullscreen style="border:none;"></iframe>`;
            document.getElementById('trailer-modal').classList.add('show');
        }
    } catch (e) { console.error('Trailer error', e); }
};

/** Open the trailer modal with a known YouTube video key (used by static pages). */
window.openTrailerModal = function (videoKey) {
    if (!videoKey || videoKey.includes('{{')) return;
    document.getElementById('trailer-video-container').innerHTML = `<iframe src="https://www.youtube.com/embed/${videoKey}?autoplay=1" allow="autoplay;encrypted-media" allowfullscreen style="border:none;"></iframe>`;
    document.getElementById('trailer-modal').classList.add('show');
};

/** Stop playback and hide the trailer modal. */
window.closeTrailer = function () {
    document.getElementById('trailer-modal').classList.remove('show');
    document.getElementById('trailer-video-container').innerHTML = '';
};

/** Share the current page URL using the Web Share API or clipboard fallback. */
window.shareMovie = () => {
    if (navigator.share) {
        navigator.share({ title: document.title, text: `Watch ${document.title}`, url: location.href }).catch(() => {});
    } else {
        navigator.clipboard.writeText(location.href).catch(() => prompt('Copy link:', location.href));
    }
};

/* ==========================================================================
   14. PERSON PAGE
   ========================================================================== */

/** Entry point for person.html — fetches biography and full filmography. */
async function initPersonPage() {
    const p  = new URLSearchParams(window.location.search);
    const id = p.get('id');
    if (!id) return (window.location.href = 'index.html');
    const container = document.getElementById('person-container');
    if (!container) return;
    container.innerHTML = '<div style="color:var(--text-muted);padding:60px 0;text-align:center;">Loading...</div>';

    try {
        const [detailRes, creditRes] = await Promise.all([
            fetch(`${BASE_URL}/person/${id}?api_key=${API_KEY}&language=${CURRENT_LANG}`),
            fetch(`${BASE_URL}/person/${id}/combined_credits?api_key=${API_KEY}&language=${CURRENT_LANG}`)
        ]);
        if (!detailRes.ok) throw new Error('Person not found');
        const d       = await detailRes.json();
        const credits = creditRes.ok ? await creditRes.json() : { cast: [], crew: [] };

        updateSEOMeta(`${d.name} — Filmography & Biography | XUDOMovie`, `Explore the filmography, biography, and career of ${d.name} on XUDOMovie.`);

        const badges = [];
        if (d.known_for_department) badges.push(`<span class="person-badge person-known-for">${deptLabel(d.known_for_department)}</span>`);
        if (d.birthday)             badges.push(`<span class="person-badge">Born: ${d.birthday}</span>`);
        if (d.place_of_birth)       badges.push(`<span class="person-badge">${d.place_of_birth}</span>`);
        if (d.deathday)             badges.push(`<span class="person-badge">Died: ${d.deathday}</span>`);

        const photo       = d.profile_path ? IMG_POSTER + d.profile_path : "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='220' height='330' viewBox='0 0 220 330' fill='%231a1a1a'%3e%3crect width='220' height='330' fill='%231a1a1a'/%3e%3ccircle cx='110' cy='120' r='50' fill='%23333'/%3e%3cellipse cx='110' cy='280' rx='80' ry='60' fill='%23333'/%3e%3c/svg%3e";
        const bioText     = sanitizeHTML(d.biography || 'No biography available.');
        const needsToggle = (d.biography || '').length > 400;

        container.innerHTML = `
            <div class="person-hero">
                <div class="person-photo-wrap">
                    <img src="${photo}" alt="${sanitizeHTML(d.name)}" class="person-photo" loading="lazy">
                </div>
                <div class="person-details">
                    <h1 class="person-name">${sanitizeHTML(d.name)}</h1>
                    <div class="person-meta-row">${badges.join('')}</div>
                    <div class="person-bio" id="person-bio">${bioText}</div>
                    ${needsToggle ? '<button class="person-bio-toggle" id="bio-toggle" onclick="togglePersonBio()">Read more ▾</button>' : ''}
                </div>
            </div>
            <div>
                <h2 class="person-section-title">Filmography</h2>
                <div class="person-tabs">
                    <button class="person-tab-btn active" onclick="filterPersonCredits('all')">All</button>
                    <button class="person-tab-btn" onclick="filterPersonCredits('movie')">Movies</button>
                    <button class="person-tab-btn" onclick="filterPersonCredits('tv')">TV Shows</button>
                </div>
                <div class="person-filmography-grid" id="filmography-grid"></div>
            </div>`;

        const seen       = new Set();
        const allCredits = (credits.cast || []).filter(i => {
            if (seen.has(i.id)) return false;
            seen.add(i.id);
            return (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path;
        }).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        container._credits = allCredits;
        renderPersonCredits(allCredits);

    } catch (_) {
        container.innerHTML = '<div style="color:var(--main-red);padding:60px 0;text-align:center;">Could not load person details.</div>';
    }
}

/** Render up to 60 filmography cards for the given credits array. */
function renderPersonCredits(credits) {
    const grid = document.getElementById('filmography-grid');
    if (!grid) return;
    if (!credits.length) { grid.innerHTML = '<div class="no-results">No filmography found.</div>'; return; }
    grid.innerHTML = credits.slice(0, 60).map(i => createCardHTML(i, i.media_type)).join('');
    attachCardDelegation('#filmography-grid');
}

/** Filter filmography by media type (all / movie / tv). */
window.filterPersonCredits = function (type) {
    document.querySelectorAll('.person-tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${type}`) || document.querySelector('.person-tab-btn:first-child');
    if (activeBtn) activeBtn.classList.add('active');
    const container = document.getElementById('person-container');
    if (!container?._credits) return;
    const filtered = type === 'all' ? container._credits : container._credits.filter(i => i.media_type === type);
    renderPersonCredits(filtered);
};

/** Expand or collapse the biography text block. */
window.togglePersonBio = function () {
    const bio = document.getElementById('person-bio');
    const btn = document.getElementById('bio-toggle');
    if (!bio || !btn) return;
    const expanded   = bio.classList.toggle('expanded');
    btn.textContent  = expanded ? 'Show less ▴' : 'Read more ▾';
};

/* ==========================================================================
   15. PAGE-LEVEL FAVORITES & WATCH LATER
   (Used on watch.html and static detail pages)
   ========================================================================== */
let _page = null;

/** Initialise the page-level fav and watch-later buttons with content metadata. */
window.initPageActionButtons = function (id, type, title, poster, year, rating) {
    _page = { id: +id, type, title, poster, year: String(year), rating: String(rating) };
    _refreshPageButtons();
};

/** Sync the visual state of the page-level buttons with localStorage. */
function _refreshPageButtons() {
    const favBtn = document.getElementById('page-fav-btn');
    const wlBtn  = document.getElementById('page-wl-btn');
    if (!favBtn || !wlBtn || !_page) return;

    const isFav  = isFavorite(_page.id);
    favBtn.classList.toggle('active', isFav);
    const favLabel = favBtn.querySelector('span') || favBtn.appendChild(document.createElement('span'));
    favLabel.textContent = isFav ? 'SAVED ✓' : 'FAVORITE';
    const favIcon = favBtn.querySelector('svg');
    if (favIcon) { favIcon.style.fill = isFav ? '#e50914' : 'none'; favIcon.style.stroke = isFav ? '#e50914' : 'currentColor'; }

    const isWL  = isWatchLater(_page.id);
    wlBtn.classList.toggle('active', isWL);
    const wlLabel = wlBtn.querySelector('span') || wlBtn.appendChild(document.createElement('span'));
    wlLabel.textContent = isWL ? 'IN LIST ✓' : 'WATCH LATER';
}

window.togglePageFav = function () {
    if (!_page) return;
    let favs  = JSON.parse(localStorage.getItem('xudo_favs')) || [];
    const idx = favs.findIndex(f => f.id == _page.id);
    if (idx === -1) favs.push({ id: _page.id, type: _page.type, title: _page.title, poster: _page.poster, year: _page.year, rating: _page.rating });
    else            favs.splice(idx, 1);
    localStorage.setItem('xudo_favs', JSON.stringify(favs));
    _refreshPageButtons();
};

window.togglePageWatchLater = function () {
    if (!_page) return;
    let list  = JSON.parse(localStorage.getItem('xudo_watch_later')) || [];
    const idx = list.findIndex(f => f.id == _page.id);
    if (idx === -1) list.push({ id: _page.id, type: _page.type, title: _page.title, poster: _page.poster, year: _page.year, rating: _page.rating });
    else            list.splice(idx, 1);
    localStorage.setItem('xudo_watch_later', JSON.stringify(list));
    _refreshPageButtons();
};

/* ==========================================================================
   16. STATIC PAGE SUPPORT
   (Pre-rendered HTML pages that embed XUDO_STATIC_DATA)
   ========================================================================== */
function initStaticPage() {
    const data = window.XUDO_STATIC_DATA;
    if (!data) return;
    updatePlayer(data.type, data.id);
    try { updateContinueWatching({ id: data.id, media_type: data.type, title: data.title, poster_path: data.poster, release_date: data.year, vote_average: parseFloat(data.rating) }); } catch (_) {}
    initProgressListener(data.id, 90);
    if (typeof fetchSimilarMovies === 'function') fetchSimilarMovies(data.type, data.id);
    window.initPageActionButtons(data.id, data.type, data.title, data.poster, data.year, data.rating);
}

/* ==========================================================================
   17. BACK TO TOP
   ========================================================================== */
function initBackToTop() {
    const btn       = document.createElement('button');
    btn.className   = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML   = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => { btn.classList.toggle('visible', window.scrollY > 400); }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ==========================================================================
   18. ADBLOCK DETECTION
   ========================================================================== */
function initAdBlockDetection() {
    const dismissed = localStorage.getItem('xudo_adblock_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    // Bait element — ad blockers typically hide or remove this
    const bait = document.createElement('div');
    bait.className = 'adsbygoogle ad-banner adsbox doubleclick ad-placement';
    bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;';
    bait.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bait);

    requestAnimationFrame(() => {
        setTimeout(() => {
            const blocked = bait.offsetHeight === 0 || bait.offsetWidth === 0 || bait.style.display === 'none' || !document.body.contains(bait);
            bait.remove();
            if (blocked) showAdBlockBanner();
        }, 150);
    });
}

function showAdBlockBanner() {
    if (document.getElementById('adblock-banner')) return;
    const banner      = document.createElement('div');
    banner.id         = 'adblock-banner';
    banner.className  = 'adblock-banner';
    banner.innerHTML  = `
        <div class="adblock-banner-text">
            <div class="adblock-banner-title">❤️ We noticed you're using an ad blocker</div>
            <div class="adblock-banner-sub">Ads keep <strong>${sanitizeHTML(window.location.hostname)}</strong> free. No pop-ups, no autoplay audio. Please whitelist us.</div>
        </div>
        <div class="adblock-banner-actions">
            <button class="adblock-dismiss-btn" onclick="dismissAdBlockBanner()">Maybe later</button>
            <button class="adblock-whitelist-btn" onclick="dismissAdBlockBanner(true)">I've whitelisted ✓</button>
        </div>`;
    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
}

window.dismissAdBlockBanner = function () {
    const banner = document.getElementById('adblock-banner');
    if (banner) {
        banner.classList.remove('show');
        banner.addEventListener('transitionend', () => banner.remove(), { once: true });
    }
    localStorage.setItem('xudo_adblock_dismissed', Date.now().toString());
};

/* ==========================================================================
   19. INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadSearchIndex();
    updateCanonical();
    initContentProtection();
    initCustomSelect();
    initThemeToggle();
    initHeaderScroll();
    initBackToTop();
    initAdBlockDetection();

    /** Route to the correct page init function based on a landmark element. */
    const pageRouter = () => {
        if      (document.getElementById('hero-slider'))      initHome();
        else if (document.getElementById('browse-grid'))      initBrowse();
        else if (document.getElementById('player-container')) initWatchPage();
        else if (document.getElementById('static-player'))    initStaticPage();
        else if (document.getElementById('person-container')) initPersonPage();
    };

    /**
     * initSearchEvents and initHamburgerMenu depend on DOM nodes injected
     * by global-header.js. Wait for the 'header-loaded' event if the header
     * placeholder has not yet been replaced.
     */
    const initHeaderDependent = () => {
        initSearchEvents();
        initHamburgerMenu();
    };

    if (document.getElementById('search-input')) {
        // Header was rendered server-side or is already in the DOM
        initHeaderDependent();
        pageRouter();
    } else {
        document.addEventListener('header-loaded', () => {
            initHeaderDependent();
            pageRouter();
        });
    }
});