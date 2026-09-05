# Okta OAuth PKCE SPA

A small browser-based single-page application that demonstrates Okta OAuth 2.0 Authorization Code flow with PKCE. It supports both local development and the production custom domain `https://www.isurutrader.com`.

The application performs the authorization and token exchange with the browser Fetch API. It does not use the deprecated Okta Auth JS client. The Okta Sign-In Widget CDN script is loaded by `config.js`, although the visible sign-in buttons currently start the custom PKCE flow directly.

## Features

- Sign in with Okta using Authorization Code with PKCE
- Sign in through an Okta external identity provider, currently Entra ID
- Automatic redirect URI selection for localhost and production
- Browser-side authorization-code to token exchange
- Display of PKCE values and decoded token claims for demonstration
- Okta logout with an optional ID token hint
- Back-forward cache handling after logout

## Project Structure

```text
.
|-- app.js                  OAuth, PKCE, token, and logout logic
|-- config.js               Active environment and Okta configuration
|-- config.example.js       Configuration template
|-- index.html              Main application page
|-- styles.css              Application styles
`-- callback/
    `-- index.html          Returns the authorization response to the SPA
```

## Requirements

- A modern browser with Web Crypto API support
- An Okta OIDC application configured as a public client
- A static web server for local development or production hosting
- An Okta authorization server with issuer:

```text
https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698
```

The application uses these scopes:

```text
openid profile email offline_access
```

## Okta Application Configuration

Configure the Okta application as a Single-Page Application using Authorization Code with PKCE.

### Sign-in redirect URIs

Add both redirect URIs to the Okta application:

```text
http://localhost:9000/callback
https://www.isurutrader.com/callback
```

### Sign-out redirect URIs

Add both post-logout redirect URIs:

```text
http://localhost:9000/
https://www.isurutrader.com/
```

### Trusted origins and CORS

If the Okta authorization server or organization policy requires trusted origins, add:

```text
http://localhost:9000
https://www.isurutrader.com
```

Enable the appropriate Redirect and CORS permissions for both origins.

### Identity provider

The Entra ID button sends the configured Okta identity provider ID as the `idp` query parameter. Set `entraIdpId` in `config.js` to the Okta identity provider ID for Entra ID.

## Configuration

The active configuration is in `config.js`:

```javascript
var isLocalDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

window.APP_CONFIG = {
    oktaSignInWidgetUrl: "https://global.oktacdn.com/okta-signin-widget/7.49.0/js/okta-sign-in.min.js",
    appClientID: "your-client-id",
    entraIdpId: "your-entra-idp-id",
    redirectUri: isLocalDevelopment
        ? "http://localhost:9000/callback"
        : "https://www.isurutrader.com/callback",
    oktaOrgUrl: "https://login.isurutrader.com",
    authorizeUrl: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698/v1/authorize",
    tokenEndpoint: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698/v1/token",
    endSessionEndpoint: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698/v1/logout",
    issuer: "https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698"
};
```

Replace these values for another Okta tenant or application:

- `appClientID`: the Okta OIDC application client ID
- `entraIdpId`: the Okta identity provider ID used by the Entra ID button
- `redirectUri`: selected automatically from the browser hostname
- `oktaOrgUrl`: the Okta custom domain
- `authorizeUrl`: the authorization endpoint
- `tokenEndpoint`: the token endpoint
- `endSessionEndpoint`: the logout endpoint
- `issuer`: the authorization server issuer

Do not commit private client secrets. This SPA is a public client and should not contain a client secret.

## Local Development

Start a static server from the project directory. For example, with Python:

```powershell
python3 -m http.server 9000
```

Open:

```text
http://localhost:9000/
```

When the hostname is `localhost` or `127.0.0.1`, the application automatically uses:

```text
http://localhost:9000/callback
```

Do not open `index.html` directly with a `file://` URL. The OAuth redirect and browser security policies require HTTP or HTTPS.

## Production Deployment

Host the files as a static website at:

```text
https://www.isurutrader.com/
```

The production web server must serve:

```text
/
/callback/
```

The `/callback/` route must return `callback/index.html`. Configure the host so that the callback path is not redirected to a different hostname or protocol.

When loaded from the production custom domain, the application automatically uses:

```text
https://www.isurutrader.com/callback
```

The production site must use HTTPS. Ensure the TLS certificate, DNS record, and Okta redirect URI all use the same hostname.

## Authentication Flow

1. The user clicks `Sign in with Okta` or `Sign in with Entra ID`.
2. The app generates a random PKCE code verifier.
3. It creates a SHA-256 code challenge from the verifier.
4. The verifier and challenge are stored in `sessionStorage`.
5. The browser is redirected to the Okta authorization endpoint.
6. Okta authenticates the user and redirects to `/callback` with an authorization code.
7. `callback/index.html` sends the query string back to `/`.
8. The app exchanges the authorization code and verifier at the token endpoint.
9. The returned ID token, access token, and refresh token are displayed for demonstration.
10. The ID token is stored in `sessionStorage` so it can be supplied as the logout `id_token_hint`.

## Logout Flow

The `Close Okta Session` button:

1. Reads the ID token from `sessionStorage`, when available.
2. Removes the PKCE values and stored ID token.
3. Redirects the browser to the Okta `/v1/logout` endpoint.
4. Sends the client ID and the current origin as `post_logout_redirect_uri`.
5. Sends `id_token_hint` when an ID token is available.
6. Returns the browser to the current application origin after Okta logout.

The logout endpoint is configured as:

```text
https://login.isurutrader.com/oauth2/aus177j9g754ujW7C698/v1/logout
```

## Important Security Notes

This project is a learning and diagnostic sample, not a production token-management implementation.

- It displays raw tokens and decoded claims in the page and browser console.
- It stores PKCE values and the ID token in `sessionStorage`.
- It does not implement silent renewal or refresh-token rotation.
- It does not protect the UI based on token expiry.
- It does not use a backend to keep tokens away from browser JavaScript.
- Validate and escape token claims before rendering user-controlled values in a production application.
- Use a production-grade authentication library or a backend-for-frontend architecture for a real application.
- Keep the client ID public, but never place a client secret in this repository.

## Troubleshooting

### `invalid_redirect_uri`

The URI in the browser must exactly match an Okta sign-in redirect URI, including:

- Scheme: `http` or `https`
- Hostname
- Port
- Path
- Trailing slash behavior

Check both local and production entries in the Okta application.

### `access_denied` or identity provider errors

Verify that:

- The Entra ID identity provider is enabled in Okta.
- `entraIdpId` is the Okta identity provider ID, not the Entra tenant ID.
- The requested scopes are allowed.
- The user is assigned to the Okta application.

### Token exchange fails

Check that:

- The PKCE verifier remains in the same browser session.
- The callback returns to the same origin that started login.
- The token endpoint matches the configured issuer.
- The client ID is correct.
- The redirect URI in the token request exactly matches the authorization request.

### Logout returns an Okta error

Check that the post-logout redirect URI is registered in Okta and that the logout endpoint uses `/v1/logout`, not `/vi/logout`.

### The callback page does not return to the app

Confirm that the server serves `callback/index.html` at `/callback/` and preserves the query string containing `code` and `state`.

## Updating the Example Configuration

`config.example.js` is a reference template. Keep its endpoint structure aligned with `config.js` when changing tenants or authorization servers. The active `config.js` loads the Sign-In Widget script through DOM APIs rather than `document.write()`.

## License

No license is specified for this project.
