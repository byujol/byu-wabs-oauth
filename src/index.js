'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const byuJwt = require('byu-jwt')();
const debug = require('debug')('byu-oauth');
const getOauth = require('./oauth');
const getOpenId = require('./openid');
const request = require('./request');
module.exports = byuOauth;
function byuOauth(clientId, clientSecret) {
    function authorizedRequest(options) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('make authorized request');
            options = Object.assign({}, options);
            options.headers = options.headers ? Object.assign({}, options.headers) : {};
            options.headers = lowerCaseHeaders(options.headers);
            if (!options.headers.authorization)
                options.headers.authorization = 'Bearer ' + options.token.accessToken;
            let res = yield request(options);
            if (responseIndicatesInvalidToken(res)) {
                debug('retry authorized request with new token');
                yield options.token.refresh();
                options.headers.authorization = 'Bearer ' + options.token.accessToken;
                res = yield request(options);
            }
            return res;
        });
    }
    function getAuthorizationUrl(redirectUri, scope, state) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('get authorization url');
            const oauth = yield getOauth(clientId, clientSecret);
            const config = { redirect_uri: redirectUri };
            if (scope !== undefined)
                config.scope = scope;
            if (state !== undefined)
                config.state = state;
            return oauth.authorizationCode.authorizeURL(config);
        });
    }
    function getClientGrantToken() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('get client grant token');
            const openId = yield getOpenId();
            const oauth = yield getOauth(clientId, clientSecret);
            const result = yield oauth.clientCredentials.getToken({
                scope: openId.scopesSupported
            });
            const rawToken = oauth.accessToken.create(result);
            const token = yield processToken(rawToken, refresh, undefined);
            function refresh() {
                return __awaiter(this, void 0, void 0, function* () {
                    const newToken = yield getClientGrantToken();
                    token.accessToken = newToken.accessToken;
                    token.expiresAt = newToken.expiresAt;
                    token.jwt = newToken.jwt;
                    token.scope = newToken.scope;
                    token.type = newToken.type;
                    return token;
                });
            }
            return token;
        });
    }
    function getCodeGrantToken(code, redirectUri, scope) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('get code grant token');
            const oauth = yield getOauth(clientId, clientSecret);
            const config = {
                code: code,
                redirect_uri: redirectUri,
                scope: scope ? scope.split(/ +/) : []
            };
            const result = yield oauth.authorizationCode.getToken(config);
            const token = oauth.accessToken.create(result);
            return processToken(token, () => token.refresh({}), token.token.refreshToken);
        });
    }
    return {
        authorizedRequest,
        getAuthorizationUrl,
        getClientGrantToken,
        getCodeGrantToken,
        getOpenId
    };
}
function lowerCaseHeaders(headers) {
    const result = {};
    if (headers) {
        Object.keys(headers).forEach(key => {
            result[key.toLowerCase()] = headers[key];
        });
    }
    return result;
}
function processToken(token, refresh, refreshToken) {
    const protect = {
        refreshing: undefined
    };
    const result = {
        accessToken: token.token.access_token,
        get expired() { return this.expiresAt < Date.now(); },
        expiresAt: token.token.expires_at,
        get expiresIn() { return this.expiresAt - Date.now(); },
        jwt: token.token.id_token,
        refresh: () => __awaiter(this, void 0, void 0, function* () {
            if (protect.refreshing)
                return protect.refreshing;
            protect.refreshing = refresh();
            const result = yield protect.refreshing;
            protect.refreshing = undefined;
            return result;
        }),
        refreshToken: refreshToken,
        revoke: () => __awaiter(this, void 0, void 0, function* () {
            token.revokeAll();
            result.accessToken = undefined;
            result.expiresAt = new Date();
            result.jwt = undefined;
            result.refreshToken = undefined;
            return result;
        }),
        scope: token.token.scope,
        type: token.token.token_type
    };
    if (!result.jwt)
        return result;
    return byuJwt.verifyJWT(result.jwt)
        .then(function (verified) {
        if (!verified)
            throw Error('Access token failed verification');
        return result;
    });
}
function responseIndicatesInvalidToken(res) {
    return res.statusCode === 401
        && String(res.body).indexOf('<ams:code>900901</ams:code>') !== -1;
}
module.exports = byuOauth;
//# sourceMappingURL=index.js.map