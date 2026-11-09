var isLocalDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

window.APP_CONFIG = {
    oktaSignInWidgetUrl: "https://global.oktacdn.com/okta-signin-widget/7.49.0/js/okta-sign-in.min.js",
    appClientID: "0oa19123myqdEDJ6a698",
    entraIdpId: "0oa16izocu4ayhhsz698",
    redirectUri: isLocalDevelopment
        ? "http://localhost:9000/callback"
        : "https://www.isurutrader.com/callback",
    oktaOrgUrl: "https://login.isurutrader.com",
    authorizeUrl: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698/v1/authorize",
    tokenEndpoint: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698/v1/token",
    endSessionEndpoint: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698/v1/logout",
    issuer: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698"
};

// --- SAFE ALTERNATIVE TO DOCUMENT.WRITE ---
// Dynamically appends the Okta Sign-In Widget JS to the head element
(function() {
    var script = document.createElement('script');
    script.src = window.APP_CONFIG.oktaSignInWidgetUrl;
    script.type = 'text/javascript';
    document.head.appendChild(script);
})();

function initializePage() {
    if (window.location.search.includes('code=')) {
        handleRedirectCallback();
    } else {
        const storedCodeVerifier = sessionStorage.getItem(codeVerifierKey);
        const storedCodeChallenge = sessionStorage.getItem(codeChallengeKey);
        updatePkceDisplay('N/A', storedCodeChallenge || 'N/A', storedCodeVerifier || 'N/A');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// --- BFCACHE FIX ---
// This safely reloads your homepage if a user hits the browser "Back" button after logging out.
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});
