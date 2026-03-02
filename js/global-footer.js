/**
 * XUDOTrailer GLOBAL FOOTER (DOFOLLOW / AGGRESSIVE SEO MODE)
 * ------------------------------------------------
 * WARNING: This configuration passes Link Juice to Money Sites.
 * Risk Level: HIGH (Sitewide Betting Links).
 * Benefit: Maximum Ranking Power.
 */

const GLOBAL_FOOTER_CONTENT = `
<footer class="sk-footer">
    <div class="sk-footer-top">
        <div class="sk-top-left">
            <h2>Powered by <br>
                <span class="sk-brand-name">XUDO.Digital</span>
            </h2>
        </div>
        <div class="sk-top-right">
            <div class="sk-app-icon">X+</div>
            <div class="style-text">
                <div style="font-weight:700; font-size:0.9rem;">Find Us on</div>
                <div style="font-size:0.75rem; color:#ccc; display: flex; align-items: center; gap: 5px; margin-top: 3px;"> 4.5 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ffd700">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <span style="color:#666">• 10K+ Downloads</span>
                </div>
            </div>
            <div class="sk-dl-group">
                <a href="#PlayStore" class="sk-store-link" aria-label="Google Play">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" class="sk-store-img">
                </a>
                <a href="#AppStore" class="sk-store-link" aria-label="App Store">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" class="sk-store-img">
                </a>
            </div>
        </div>
    </div>
    <div class="sk-footer-grid">
        <div class="sk-col">
            <div class="sk-head-xs">Movie Categories</div>
            <a href="/browse.html?endpoint=/movie/popular&title=Popular%20Movies&type=movie" class="sk-li">Popular</a>
            <a href="/browse.html?endpoint=/movie/now_playing&title=Now%20Playing%20Movies&type=movie" class="sk-li">Now Playing</a>
            <a href="/browse.html?endpoint=/movie/upcoming&title=Upcoming%20Movies&type=movie" class="sk-li">Upcoming</a>
        </div>
        <div class="sk-col">
            <div class="sk-head-xs">TV Show Categories</div>
            <a href="/browse.html?endpoint=/tv/popular&title=Popular%20TV%20Shows&type=tv" class="sk-li">Popular TV Shows</a>
            <a href="/browse.html?endpoint=/tv/airing_today&title=Airing%20Today&type=tv" class="sk-li">Airing Today</a>
            <a href="/browse.html?endpoint=/tv/top_rated&title=Top%20Rated%20TV%20Shows&type=tv" class="sk-li">Top Rated TV Shows</a>
        </div>
        <div class="sk-col">
            <div class="sk-head-xs">Discover</div>
            <a href="https://xudogames.us" class="sk-li" target="_blank"><b>XUDO</b>Game</a>
            <a href="https://xudomovie.us" class="sk-li" target="_blank"><b>XUDO</b>Movie</a>
            <a href="https://xudonews.us" class="sk-li" target="_blank"><b>XUDO</b>News</a>
            <a href="https://xudotrailer.us" class="sk-li" target="_blank"><b>XUDO</b>Trailer</a>
            <a href="https://xudotv.us" class="sk-li" target="_blank"><b>XUDO</b>TV</a>
        </div>
        <div class="sk-col">
            <div class="sk-head-xs">XUDODigital Network</div>
            <a href="#LinkNetwork1" class="sk-li" target="_blank">Network 1</a>
            <a href="#LinkNetwork2" class="sk-li" target="_blank">Network 2</a>
            <a href="#LinkNetwork3" class="sk-li" target="_blank">Network 3</a>
        </div>
    </div>
    <div class="sk-brand-row"></div>
    <div class="sk-bottom-info">
        <div class="sk-office-box">
            <div class="sk-office-title">THE XUDODigital ENTERPRISE ECOSYSTEM</div>
            <p>XUDODigital is a strategically integrated digital media network engineered to deliver scalable, high-impact entertainment and information solutions across global markets.</p>
        </div>
        <div class="sk-about-box">
            <div class="sk-office-title">COMMITMENT TO DIGITAL</div>
            <p>Through XUDOGame, XUDOMovie, XUDONews, XUDOTrailer, and XUDOTV, we empower audiences with authoritative content, data-driven insights, and premium user experiences — defined by speed, credibility, and international relevance.</p>
        </div>
    </div>
</footer>`;

(function() {
	const placeholder = document.getElementById("global-footer-placeholder");
	if (placeholder) {
		placeholder.innerHTML = GLOBAL_FOOTER_CONTENT;
	}
})();