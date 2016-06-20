'use strict';
const byuJwt = require('byu-jwt');
const oauth2 = require('simple-oauth2');
const Request = require('request-promise');
const Promise = require('bluebird');
module.exports = byuOauth;
function byuOauth(clientId, clientSecret, wellKnownUrl) {
    var cachedClientToken = null;
    var cachedClientTokenTimeoutId;
    const getClientGrantAccessToken = Promise.coroutine(function* (ignoreCache) {
        if (!cachedClientToken || ignoreCache) {
            const oauth2Handle = yield getOauth2Handle(clientId, clientSecret, wellKnownUrl);
            const tokenConfig = {};
            const clientToken = yield oauth2Handle.client.getToken(tokenConfig);
            cachedClientToken = yield processToken(wellKnownUrl, clientToken);
            clearTimeout(cachedClientTokenTimeoutId);
            cachedClientTokenTimeoutId = setTimeout(() => cachedClientToken = null, (clientToken.expires_in + 1) * 1000);
        }
        return Promise.resolve(cachedClientToken);
    });
    const getCodeGrantAccessToken = Promise.coroutine(function* (code, redirectUri) {
        const oauth2Handle = yield getOauth2Handle(clientId, clientSecret, wellKnownUrl);
        const tokenConfig = {
            code: code,
            redirect_uri: redirectUri
        };
        const token = yield oauth2Handle.authCode.getToken(tokenConfig);
        return processToken(wellKnownUrl, token);
    });
    const getCodeGrantAuthorizeUrl = Promise.coroutine(function* (redirectUri, scope, state) {
        const oauth2Handle = yield getOauth2Handle(clientId, clientSecret, wellKnownUrl);
        const authUrl = oauth2Handle.authCode.authorizeURL({
            redirect_uri: redirectUri,
            scope: scope || '',
            state: state || ''
        });
        return Promise.resolve(authUrl);
    });
    const getOauth2Handle = Promise.coroutine(function* (clientID, clientSecret, wellKnownURL) {
        const requestConfig = {
            url: wellKnownURL,
            method: 'GET'
        };
        const response = yield Request(requestConfig);
        const value = JSON.parse(response);
        return oauth2({
            clientID: clientID,
            clientSecret: clientSecret,
            site: value.issuer,
            authorizationPath: value.authorization_endpoint.replace(value.issuer, ''),
            tokenPath: value.token_endpoint.replace(value.issuer, ''),
            revocationPath: value.revocation_endpoint.replace(value.issuer, ''),
            clientSecretParameterName: 'client_secret_omit'
        });
    });
    const refreshTokens = Promise.coroutine(function* (access_token, refresh_token) {
        if (!refresh_token)
            throw Error("Refresh token required to refresh tokens");
        const oauth2Handle = yield getOauth2Handle(clientId, clientSecret, wellKnownUrl);
        const accessToken = oauth2Handle.accessToken.create({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': '1'
        });
        yield accessToken.refresh();
        return processToken(wellKnownUrl, accessToken.token);
    });
    const revokeTokens = Promise.coroutine(function* (access_token, refresh_token) {
        const oauth2Handle = yield getOauth2Handle(clientId, clientSecret, wellKnownUrl);
        const accessToken = oauth2Handle.accessToken.create({
            access_token: access_token,
            expires_in: '1',
            refresh_token: refresh_token || ''
        });
        yield accessToken.revoke('access_token');
        if (refresh_token)
            yield accessToken.revoke('refresh_token');
        if (cachedClientToken && cachedClientToken.accessToken === access_token) {
            clearTimeout(cachedClientTokenTimeoutId);
            cachedClientToken = null;
        }
        return Promise.resolve();
    });
    return {
        getClientGrantAccessToken: (ignoreCache) => getClientGrantAccessToken(ignoreCache),
        getCodeGrantAccessToken: (code, redirectUri) => getCodeGrantAccessToken(code, redirectUri),
        getCodeGrantAuthorizeUrl: (redirectUri, scope, state) => getCodeGrantAuthorizeUrl(redirectUri, scope, state),
        refreshTokens: (accessToken, refreshToken) => refreshTokens(accessToken, refreshToken),
        revokeTokens: (accessToken, refreshToken) => revokeTokens(accessToken, refreshToken)
    };
}
function processToken(wellKnownURL, clientToken) {
    const token = {
        accessToken: clientToken.access_token,
        expiresIn: clientToken.expires_in,
        refreshToken: clientToken.refresh_token,
        openId: void 0,
        scope: clientToken.scope,
        tokenType: clientToken.token_type
    };
    if (!clientToken.id_token)
        return Promise.resolve(token);
    return byuJwt.verifyJWT(clientToken.id_token, wellKnownURL)
        .then(function (open_id_value) {
        token.openId = open_id_value;
        return token;
    });
}
//# sourceMappingURL=byu-wabs-oauth.js.map