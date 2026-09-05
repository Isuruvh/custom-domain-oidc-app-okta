var appClientID = window.APP_CONFIG.appClientID;
var entraIdpId = window.APP_CONFIG.entraIdpId;
var redirectUri = window.APP_CONFIG.redirectUri;
var codeVerifierKey = "okta_pkce_code_verifier";
var codeChallengeKey = "okta_pkce_code_challenge";

function base64UrlEncode(value) {
    if (value instanceof Uint8Array) {
        let binary = '';
        value.forEach(byte => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }

    return btoa(String.fromCharCode(...new Uint8Array(value)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function randomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    return Array.from(values, value => charset[value % charset.length]).join('');
}

async function generatePkcePair() {
    const codeVerifier = randomString(64);
    const encoder = new TextEncoder();
    const digest = await window.crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
    const codeChallenge = base64UrlEncode(new Uint8Array(digest));
    return { codeVerifier, codeChallenge };
}

function getContentContainer() {
    return document.getElementById('content-jwt');
}

function renderPkceCard(authCode, codeChallenge, codeVerifier) {
    const container = getContentContainer();
    if (!container) {
        return;
    }

    const card = document.createElement('div');
    card.className = 'token-card';
    card.innerHTML = `
        <h3>PKCE Authorization Code</h3>
        <div class="pkce-meta">
            <div><strong>Authorization code:</strong></div>
            <pre>${authCode || 'N/A'}</pre>
            <div><strong>Code challenge:</strong></div>
            <pre>${codeChallenge || 'N/A'}</pre>
            <div><strong>Code verifier:</strong></div>
            <pre>${codeVerifier || 'N/A'}</pre>
        </div>
    `;
    container.appendChild(card);
}

function updatePkceDisplay(authCode, codeChallenge, codeVerifier) {
    const container = getContentContainer();
    if (!container) {
        window.addEventListener('DOMContentLoaded', () => updatePkceDisplay(authCode, codeChallenge, codeVerifier), { once: true });
        return;
    }

    container.innerHTML = '';
    renderPkceCard(authCode, codeChallenge, codeVerifier);
}

function parseJwt(token) {
    const payload = token.split('.')[1];
    if (!payload) {
        return {};
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = decodeURIComponent(Array.from(atob(padded), character => {
        return '%' + ('00' + character.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(decoded);
}

function normalizeToken(rawToken) {
    const claims = rawToken ? parseJwt(rawToken) : {};
    const scopeValue = claims.scp;
    const scopes = Array.isArray(scopeValue)
        ? scopeValue
        : typeof scopeValue === 'string'
            ? scopeValue.split(' ')
            : [];

    return {
        raw: rawToken,
        claims: claims,
        issuer: claims.iss || 'N/A',
        aud: claims.aud || 'N/A',
        expiresAt: claims.exp || null,
        scopes: scopes
    };
}

function renderTokenCard(label, token) {
    const container = getContentContainer();
    if (!container) {
        return;
    }

    const claims = token && token.claims ? token.claims : {};
    const card = document.createElement('div');
    card.className = 'token-card';
    card.innerHTML = `
        <h3>${label}</h3>
        <div class="token-meta">
            <div><strong>Email:</strong> ${claims.email || 'N/A'}</div>
            <div><strong>Subject:</strong> ${claims.sub || 'N/A'}</div>
            <div><strong>Issuer:</strong> ${token.issuer || 'N/A'}</div>
            <div><strong>Audience:</strong> ${Array.isArray(token.aud) ? token.aud.join(', ') : (token.aud || 'N/A')}</div>
            <div><strong>Expires:</strong> ${token.expiresAt ? new Date(token.expiresAt * 1000).toISOString() : 'N/A'}</div>
            <div><strong>Scopes:</strong> ${token.scopes && token.scopes.length ? token.scopes.join(', ') : (claims.scp || 'N/A')}</div>
        </div>
        <pre>${JSON.stringify(token, null, 2)}</pre>
    `;
    container.appendChild(card);
}

function showTokens(tokenData) {
    console.log('Okta token response:', tokenData);
    
    // Fixed: Replaced the trailing period with a proper semicolon
    if (tokenData && tokenData.id_token) {
        sessionStorage.setItem('okta_id_token', tokenData.id_token);
    }
    
    const container = getContentContainer();
    if (!container) {
        window.addEventListener('DOMContentLoaded', () => showTokens(tokenData), { once: true });
        return;
    }
    // ... rest of your original function continues here


    const authCode = new URLSearchParams(window.location.search).get('code');
    const codeVerifier = sessionStorage.getItem(codeVerifierKey) || 'N/A';
    const codeChallenge = sessionStorage.getItem(codeChallengeKey) || 'N/A';

    container.innerHTML = '';
    renderPkceCard(authCode || 'N/A', codeChallenge, codeVerifier);

    const tokenMap = {
        idToken: tokenData.id_token ? normalizeToken(tokenData.id_token) : null,
        accessToken: tokenData.access_token ? normalizeToken(tokenData.access_token) : null,
        refreshToken: tokenData.refresh_token ? {
            raw: tokenData.refresh_token,
            claims: {},
            issuer: 'N/A',
            aud: 'N/A',
            expiresAt: null,
            scopes: []
        } : null
    };

    Object.entries(tokenMap).forEach(([name, token]) => {
        if (token) {
            renderTokenCard(name, token);
        }
    });

    document.getElementById('login-actions').style.display = 'none';
}

async function exchangeCodeForTokens(code, codeVerifier) {
    const tokenRequest = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: appClientID,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
    });

    const response = await fetch(window.APP_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenRequest.toString()
    });

    const tokenData = await response.json();

    if (!response.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed.');
    }

    return tokenData;
}

function getAuthorizeUrl(codeChallenge, idp) {
    const url = new URL(window.APP_CONFIG.authorizeUrl);
    const params = new URLSearchParams({
        client_id: appClientID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email offline_access',
        state: Date.now().toString(36),
        nonce: 'pkce-' + Date.now(),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });

    if (idp) {
        params.set('idp', idp);
    }

    url.search = params.toString();
    return url.toString();
}

async function requestAuthorizationCode(idp) {
    const { codeVerifier, codeChallenge } = await generatePkcePair();
    sessionStorage.setItem(codeVerifierKey, codeVerifier);
    sessionStorage.setItem(codeChallengeKey, codeChallenge);
    updatePkceDisplay('Pending', codeChallenge, codeVerifier);
    window.location.href = getAuthorizeUrl(codeChallenge, idp);
}

async function handleRedirectCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const codeVerifier = sessionStorage.getItem(codeVerifierKey);
    const codeChallenge = sessionStorage.getItem(codeChallengeKey);

    updatePkceDisplay(code || 'N/A', codeChallenge || 'N/A', codeVerifier || 'N/A');

    if (!code || !codeVerifier) {
        return;
    }

    try {
        const tokenData = await exchangeCodeForTokens(code, codeVerifier);
        showTokens(tokenData);
        sessionStorage.removeItem(codeVerifierKey);
        sessionStorage.removeItem(codeChallengeKey);
    } catch (error) {
        console.error('Token exchange failed:', error);
        const fallback = document.createElement('p');
        fallback.textContent = 'There was an error while exchanging the authorization code for tokens: ' + error.message;
        document.getElementById('content-jwt').appendChild(fallback);
    }
}

function loginWithOkta() {
    requestAuthorizationCode();
}

function loginWithEntra() {
    requestAuthorizationCode(entraIdpId);
}

function logoutFromOkta() {
    try {
        // 1. Fetch the raw ID Token saved earlier from the token exchange
        // (Assuming you stored the token object in sessionStorage or local variable)
        const idTokenRaw = sessionStorage.getItem('okta_id_token'); 

        sessionStorage.removeItem(codeVerifierKey);
        sessionStorage.removeItem(codeChallengeKey);
        sessionStorage.removeItem('okta_id_token');

        const logoutUrl = new URL(window.APP_CONFIG.endSessionEndpoint);
        
        const params = {
            client_id: appClientID,
            post_logout_redirect_uri: window.location.origin + '/'
        };

        // If you have the ID Token, passing it ensures a seamless zero-prompt logout
        if (idTokenRaw) {
            params.id_token_hint = idTokenRaw;
        }

        logoutUrl.search = new URLSearchParams(params).toString();
        window.location.assign(logoutUrl.toString());
    } catch (error) {
        console.error('Okta logout failed:', error);
        const fallback = document.createElement('p');
        fallback.textContent = 'There was an error while signing out: ' + error.message;
        document.getElementById('content-jwt').appendChild(fallback);
    }
}


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
