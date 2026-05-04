/**
 * XUDOMovie GLOBAL HEADER (Refactored v4)
 * ------------------------------------------------
 * - [v2] .search-wrapper as direct child of <header> → CSS Grid 3-column.
 * - [v3] Nav Drawer slide-in from right, injected into <body>.
 * - [v4] Nav Drawer replaced by Mega Menu:
 *     • Desktop  → Full-width dropdown below header (4 columns).
 *     • Mobile   → Drawer slide-in from right (identical content).
 *   All links are static <a href> → crawlable by search engines (SEO).
 */
(function () {

    /* ── SVG Icons — Header ─────────────────────────────────── */
    const ICON_SEARCH = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

    const ICON_FAVORITES = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

    const ICON_WATCHLATER = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    /* ── SVG Icons — Mega Menu Columns ──────────────────────── */
    const ICON_FILM    = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`;
    const ICON_TV      = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    const ICON_TAG     = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
    const ICON_COLLECT = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`;
    const ICON_ARROW   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`;

    /* ── Mega Menu Content ──────────────────────────────────── */
    // All hrefs are static URLs → Google can crawl the full site
    // structure from the header without executing JavaScript.
    const MEGA_COLS = [
        {
            id    : 'col-movies',
            icon  : ICON_FILM,
            title : 'Movies',
            links : [
                { label: 'Popular Movies',   href: 'browse?endpoint=%2Fmovie%2Fpopular&title=Popular%20Movies&type=movie&lang=en-US'         },
                { label: 'Now Playing',      href: 'browse?endpoint=%2Fmovie%2Fnow_playing&title=Now%20Playing&type=movie&lang=en-US'           },
                { label: 'Upcoming',         href: 'browse?endpoint=%2Fmovie%2Fupcoming&title=Upcoming&type=movie&lang=en-US'              },
                { label: 'Top Rated',        href: 'browse?endpoint=%2Fmovie%2Ftop_rated&title=Top%20Rated%20Movies&type=movie&lang=en-US'       },
            ],
        },
        {
            id    : 'col-tvshows',
            icon  : ICON_TV,
            title : 'TV Shows',
            links : [
                { label: 'Popular Shows',    href: 'browse.html?type=tv&sort=popularity.desc'            },
                { label: 'Airing Today',     href: 'browse.html?type=tv&filter=airing_today'             },
                { label: 'On The Air',       href: 'browse.html?type=tv&filter=on_the_air'               },
                { label: 'Top Rated',        href: 'browse.html?type=tv&sort=vote_average.desc'          },
                { label: 'All TV Shows',     href: 'browse.html?type=tv'                                 },
            ],
        },
        {
            id    : 'col-genre',
            icon  : ICON_TAG,
            title : 'Genre',
            links : [
                { label: 'Action',           href: 'browse.html?type=movie&genre=28'                     },
                { label: 'Drama',            href: 'browse.html?type=movie&genre=18'                     },
                { label: 'Comedy',           href: 'browse.html?type=movie&genre=35'                     },
                { label: 'Horror',           href: 'browse.html?type=movie&genre=27'                     },
                { label: 'Sci-Fi',           href: 'browse.html?type=movie&genre=878'                    },
                { label: 'Animation',        href: 'browse.html?type=movie&genre=16'                     },
                { label: 'Romance',          href: 'browse.html?type=movie&genre=10749'                  },
                { label: 'Thriller',         href: 'browse.html?type=movie&genre=53'                     },
            ],
        },
        {
            id    : 'col-collection',
            icon  : ICON_COLLECT,
            title : 'My Collection',
            links : [
                { label: 'My Favorites',     href: 'browse.html?type=favorites'                          },
                { label: 'Watch Later',      href: 'browse.html?type=watchlater'                         },
                { label: 'Continue Watching',href: 'browse.html?type=continue'                           },
                { label: 'Recently Added',   href: 'browse.html?type=movie&sort=primary_release_date.desc'},
            ],
        },
    ];

    const colsHTML = MEGA_COLS.map(col => `
        <div class="mega-col" id="${col.id}">
            <div class="mega-col-title">
                ${col.icon}
                <span>${col.title}</span>
            </div>
            <ul class="mega-col-list">
                ${col.links.map(l => `
                <li>
                    <a href="${l.href}" class="mega-link">
                        ${ICON_ARROW}
                        <span>${l.label}</span>
                    </a>
                </li>`).join('')}
            </ul>
        </div>`).join('');

    /* ── Header HTML ────────────────────────────────────────── */
    const HEADER_HTML = `
<header class="movie-header">

    <!-- Column 1: Logo -->
    <a href="/index.html" class="logo" aria-label="XUDOMovie Home">XUDO<span>MOVIE</span></a>

    <!-- Column 2: Search -->
    <div class="search-wrapper">
        <input type="text" id="search-input" class="search-input"
               placeholder="Search for movies, TV shows, actors, or actresses"
               aria-label="Search" autocomplete="off">
        <button id="clear-btn" class="search-clear" aria-label="Clear Search">&#x2715;</button>
        <button id="search-btn" class="search-btn" aria-label="Search">${ICON_SEARCH}</button>
        <div class="search-dropdown" id="search-dropdown" role="listbox" aria-label="Search Results"></div>
    </div>

    <!-- Column 3: Header Icons -->
    <div class="header-icons">
        <a href="browse.html?type=favorites"  class="header-fav-btn" aria-label="My Favorites"  title="My Favorites">${ICON_FAVORITES}</a>
        <a href="browse.html?type=watchlater" class="header-fav-btn" aria-label="Watch Later"   title="Watch Later">${ICON_WATCHLATER}</a>
        <div class="hamburger-menu">
            <button class="hamburger-btn" id="hamburger-btn"
                    aria-label="Open Menu" aria-expanded="false" aria-controls="mega-menu">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
        </div>
    </div>

</header>`;

    /* ── Mega Menu + Overlay ─────────────────────────────────── */
    // Injected into <body> so position:fixed is not trapped
    // inside the stacking context of .movie-header (z-index: 1000).
    const MEGA_HTML = `
<div id="mega-overlay" class="mega-overlay" aria-hidden="true"></div>

<nav id="mega-menu" class="mega-menu" role="dialog"
     aria-label="Navigation Menu" aria-hidden="true">

    <!-- Mobile-only header bar (logo + close button) -->
    <div class="mega-mobile-header">
        <a href="/index.html" class="logo" aria-label="XUDOMovie Home">XUDO<span>MOVIE</span></a>
        <button id="mega-close" class="mega-close-btn" aria-label="Close Menu">${ICON_CLOSE}</button>
    </div>

    <!-- 4-column grid (Desktop) / stacked sections (Mobile) -->
    <div class="mega-inner">
        ${colsHTML}
    </div>

</nav>`;

    /* ── Mount ──────────────────────────────────────────────── */
    const placeholder = document.getElementById('global-header-placeholder');
    if (!placeholder) return;

    placeholder.outerHTML = HEADER_HTML;
    document.body.insertAdjacentHTML('beforeend', MEGA_HTML);
    document.dispatchEvent(new Event('header-loaded'));

})();