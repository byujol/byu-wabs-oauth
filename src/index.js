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
            if (!options.token)
                options.token = yield getClientGrantToken();
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
    function createToken(expiresAt, accessToken, refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = { access_token: accessToken, expires_in: +expiresAt - Date.now() };
            if (refreshToken)
                options.refresh_token = refreshToken;
            const oauth = yield getOauth(clientId, clientSecret);
            const token = oauth.accessToken.create(options);
            return processToken(token, function refresh() {
                if (refreshToken)
                    return token.refresh({});
                throw Error('Unable to refresh token');
            });
        });
    }
    function getAuthorizationUrl(redirectUri, state) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('get authorization url');
            const oauth = yield getOauth(clientId, clientSecret);
            const config = {
                redirect_uri: redirectUri,
                scope: 'openid'
            };
            // if (scope !== undefined) config.scope = scope
            if (state !== undefined)
                config.state = state;
            return oauth.authorizationCode.authorizeURL(config);
        });
    }
    function getClientGrantToken() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('get client grant token');
            const oauth = yield getOauth(clientId, clientSecret);
            const result = yield oauth.clientCredentials.getToken({});
            const rawToken = oauth.accessToken.create(result);
            const token = yield processToken(rawToken, refresh);
            function refresh() {
                return __awaiter(this, void 0, void 0, function* () {
                    const newToken = yield getClientGrantToken();
                    token.accessToken = newToken.accessToken;
                    token.expiresAt = newToken.expiresAt;
                    token.scope = newToken.scope;
                    token.type = newToken.type;
                    return token;
                });
            }
            return token;
        });
    }
    function getCodeGrantToken(code, redirectUri) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('get code grant token');
            const oauth = yield getOauth(clientId, clientSecret);
            const config = {
                code: code,
                redirect_uri: redirectUri,
                scope: ['openid']
            };
            const result = yield oauth.authorizationCode.getToken(config);
            const token = oauth.accessToken.create(result);
            return processToken(token, () => token.refresh({}));
        });
    }
    function refreshToken(accessToken, refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield createToken(new Date(), accessToken, refreshToken);
            yield token.refresh();
            return token;
        });
    }
    function revokeToken(accessToken, refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield createToken(new Date(), accessToken, refreshToken);
            yield token.revoke();
            return token;
        });
    }
    return {
        authorizedRequest,
        createToken,
        getAuthorizationUrl,
        getClientGrantToken,
        getCodeGrantToken,
        getOpenId,
        refreshToken,
        revokeToken
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
function processToken(token, refresh) {
    return __awaiter(this, void 0, void 0, function* () {
        const protect = {
            refreshing: undefined
        };
        const result = {
            accessToken: token.token.access_token,
            get expired() { return this.expiresAt < Date.now(); },
            expiresAt: token.token.expires_at,
            get expiresIn() { return this.expiresAt - Date.now(); },
            refresh: () => __awaiter(this, void 0, void 0, function* () {
                if (protect.refreshing)
                    return protect.refreshing;
                protect.refreshing = refresh();
                const result = yield protect.refreshing;
                protect.refreshing = undefined;
                return result;
            }),
            revoke: () => __awaiter(this, void 0, void 0, function* () {
                token.revokeAll();
                result.accessToken = undefined;
                result.expiresAt = new Date();
                if (result.hasOwnProperty('resourceOwner'))
                    result.resourceOwner = undefined;
                if (result.hasOwnProperty('refreshToken'))
                    result.refreshToken = undefined;
                return result;
            }),
            scope: token.token.scope,
            type: token.token.token_type
        };
        if (token.token.refresh_token)
            result.refreshToken = token.token.refresh_token;
        const jwt = token.token.id_token;
        if (!jwt)
            return result;
        const decoded = yield byuJwt.decodeJWT(jwt);
        if (!decoded)
            throw Error('Access token failed verification');
        result.resourceOwner = {
            atHash: decoded.raw.at_hash,
            aud: decoded.raw.aud,
            authTime: decoded.raw.auth_time,
            azp: decoded.raw.azp,
            byuId: decoded.raw.byu_id,
            exp: decoded.raw.exp,
            iat: decoded.raw.iat,
            iss: decoded.raw.iss,
            jwt,
            netId: decoded.raw.net_id,
            personId: decoded.raw.person_id,
            preferredFirstName: decoded.raw.preferred_first_name,
            prefix: decoded.raw.prefix,
            restOfName: decoded.raw.rest_of_name,
            sortName: decoded.raw.sort_name,
            sub: decoded.raw.sub,
            suffix: decoded.raw.suffix,
            surname: decoded.raw.surname,
            surnamePosition: decoded.raw.surname_position
        };
        return result;
    });
}
function responseIndicatesInvalidToken(res) {
    return res.statusCode === 401
        && String(res.body).indexOf('<ams:code>900901</ams:code>') !== -1;
}
module.exports = byuOauth;
//# sourceMappingURL=index.js.map