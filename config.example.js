window.APP_CONFIG = {
    oktaSignInWidgetUrl: "https://global.oktacdn.com/okta-signin-widget/7.49.0/js/okta-sign-in.min.js",
    appClientID: "your-okta-client-id",
    entraIdpId: "your-okta-idp-id",
    redirectUri: "http://localhost:9000/callback",
    oktaOrgUrl: "https://your-okta-domain",
    authorizeUrl: "https://your-okta-domain/oauth2/your-auth-server-id/v1/authorize",
    tokenEndpoint: "https://your-okta-domain/oauth2/your-auth-server-id/v1/token",
    endSessionEndpoint: "https://your-okta-domain/oauth2/your-auth-server-id/v1/logout",
    issuer: "https://your-okta-domain/oauth2/your-auth-server-id"
};

document.write('<script src="' + window.APP_CONFIG.oktaSignInWidgetUrl + '" type="text/javascript"></' + 'script>');
