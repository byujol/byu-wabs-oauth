"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const byuJwt = require('byu-jwt');
const debug = require('debug')('byu-oauth:openId');
const request = require('./request');
let cache = undefined;
module.exports = function (ignoreCache) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!cache || ignoreCache) {
            debug('get fresh OpenID object');
            const res = yield request({ url: byuJwt.WELL_KNOWN_URL });
            const data = JSON.parse(res.body);
            cache = {
                authorizationEndpoint: data.authorization_endpoint,
                idTokenSigningAlgorithmValuesSupported: data.id_token_signing_alg_values_supported,
                issuer: data.issuer,
                jwksUri: data.jwks_uri,
                responseTypesSupported: data.response_types_supported,
                revocationEndpoint: data.revocation_endpoint,
                scopesSupported: data.scopes_supported,
                subjectTypesSupported: data.subject_types_supported,
                tokenEndpoint: data.token_endpoint,
                userInfoEndpoint: data.userinfo_endpoint
            };
            setTimeout(() => {
                debug('cache expired');
                cache = undefined;
            }, 600000);
        }
        else {
            debug('get cached OpenID object');
        }
        return Promise.resolve(cache);
    });
};
//# sourceMappingURL=openid.js.map