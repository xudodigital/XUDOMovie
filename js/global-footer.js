/**
 * XUDOMovie GLOBAL FOOTER (v2)
 * ------------------------------------------------
 * - Static HTML injected via placeholder element.
 * - All internal links use absolute paths for consistent SEO.
 * - [v2] Changes:
 *     • "Discover" column renamed to "Company" with links to
 *       About Us, Contact, Privacy Policy, and DMCA Policy.
 *     • "General Disclaimer" box removed (now covered by dedicated
 *       Privacy Policy and DMCA pages linked from the Company column).
 *     • TMDB Attribution box retained — required by TMDB API Terms.
 */

/* ── Footer Column Data ─────────────────────────────────────
   Centralising link data makes updates easier without touching HTML.
   ──────────────────────────────────────────────────────────── */
const FOOTER_COLS = [
    {
        heading : 'Movies',
        links   : [
            { label: 'Popular Movies',    href: '/browse.html?endpoint=/movie/popular&title=Popular%20Movies&type=movie'         },
            { label: 'Now Playing',       href: '/browse.html?endpoint=/movie/now_playing&title=Now%20Playing%20Movies&type=movie'},
            { label: 'Upcoming Movies',   href: '/browse.html?endpoint=/movie/upcoming&title=Upcoming%20Movies&type=movie'        },
            { label: 'Top Rated Movies',  href: '/browse.html?endpoint=/movie/top_rated&title=Top%20Rated%20Movies&type=movie'    },
        ],
    },
    {
        heading : 'TV Shows',
        links   : [
            { label: 'Popular TV Shows',  href: '/browse.html?endpoint=/tv/popular&title=Popular%20TV%20Shows&type=tv'           },
            { label: 'Airing Today',      href: '/browse.html?endpoint=/tv/airing_today&title=Airing%20Today&type=tv'            },
            { label: 'On The Air',        href: '/browse.html?endpoint=/tv/on_the_air&title=On%20The%20Air&type=tv'              },
            { label: 'Top Rated Shows',   href: '/browse.html?endpoint=/tv/top_rated&title=Top%20Rated%20TV%20Shows&type=tv'     },
        ],
    },
    {
        // Renamed from "Discover" → "Company"
        // Groups all static informational & legal pages in one column.
        heading : 'Company',
        links   : [
            { label: 'About Us',         href: '/about.html'          },
            { label: 'Contact Us',       href: '/contact.html'        },
            { label: 'Privacy Policy',   href: '/privacy-policy.html' },
            { label: 'DMCA Policy',      href: '/dmca.html'           },
        ],
    },
    {
        heading : 'Our Network',
        links   : [
            { label: 'Network 1', href: '#', blank: true },
            { label: 'Network 2', href: '#', blank: true },
            { label: 'Network 3', href: '#', blank: true },
        ],
    },
];

const colsHTML = FOOTER_COLS.map(col => `
    <div class="sk-col">
        <div class="sk-head-xs">${col.heading}</div>
        ${col.links.map(l =>
            `<a href="${l.href}" class="sk-li"${l.blank ? ' target="_blank" rel="noopener noreferrer"' : ''}>${l.label}</a>`
        ).join('\n        ')}
    </div>`).join('');

/* ── Star SVG ───────────────────────────────────────────── */
const ICON_STAR = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ffd700" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;

/* ── Footer HTML ────────────────────────────────────────── */
const GLOBAL_FOOTER_CONTENT = `
<footer class="sk-footer">

    <!-- Top bar: branding + app store badges -->
    <div class="sk-footer-top">
        <div class="sk-top-left">
            <h2>Powered by<br>
                <span class="sk-brand-name">XUDODigital</span>
            </h2>
        </div>
        <div class="sk-top-right">
            <div class="sk-app-icon" aria-hidden="true">X+</div>
            <div class="style-text">
                <div style="font-weight:700; font-size:0.9rem;">Find Us on</div>
                <div style="font-size:0.75rem; color:#ccc; display:flex; align-items:center; gap:5px; margin-top:3px;">
                    4.5 ${ICON_STAR}
                    <span style="color:#666">• 10K+ Downloads</span>
                </div>
            </div>
            <div class="sk-dl-group">
                <a href="#PlayStore" class="sk-store-link" aria-label="Download on Google Play">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                         alt="Get it on Google Play" class="sk-store-img" loading="lazy">
                </a>
                <a href="#AppStore" class="sk-store-link" aria-label="Download on the App Store">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                         alt="Download on the App Store" class="sk-store-img" loading="lazy">
                </a>
            </div>
        </div>
    </div>

    <!-- Link columns -->
    <div class="sk-footer-grid">
        ${colsHTML}
    </div>

    <!-- Brand row (logo) -->
    <div class="sk-brand-row">
        <a href="/index.html" class="sk-logo-big" aria-label="XUDOMovie Home">XUDO<span>MOVIE</span></a>
    </div>

    <!-- Legal / attribution -->
    <div class="sk-bottom-info">
        <div class="sk-office-box">
            <div class="sk-office-title">TMDB Attribution</div>
            <p>This product uses the TMDB API but is not endorsed or certified by TMDB.
               We use The Movie Database (TMDB) as a reference source for movies, TV shows,
               and entertainment information. All data — including images, descriptions, and
               ratings — is provided by TMDB and remains the property of their respective
               owners. Content is used for informational and non-commercial purposes only.</p>
        </div>
        <div class="sk-about-box">
            <div class="sk-office-title">Quick Links</div>
            <p>
                <a href="/about.html" style="color:inherit; margin-right:14px;">About Us</a>
                <a href="/contact.html" style="color:inherit; margin-right:14px;">Contact</a>
                <a href="/privacy-policy.html" style="color:inherit; margin-right:14px;">Privacy Policy</a>
                <a href="/dmca.html" style="color:inherit;">DMCA Policy</a>
            </p>
            <p style="margin-top:10px;">XUDOMovie does not host or distribute any media content. All trademarks,
               logos, and media belong to their respective owners.
               &copy; ${new Date().getFullYear()} XUDODigital. All rights reserved.</p>
        </div>
    </div>

</footer>`;

/* ── Mount ──────────────────────────────────────────────── */
(function () {
    const placeholder = document.getElementById('global-footer-placeholder');
    if (placeholder) {
        placeholder.outerHTML = GLOBAL_FOOTER_CONTENT;
    }
})();