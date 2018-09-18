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
const debug = require('debug')('byu-oauth:oauth-client');
const getOpenId = require('./openid');
const simpleOauth2 = require('simple-oauth2');
const map = {};
module.exports = function getOauth(clientId, clientSecret, ignoreCache) {
    return __awaiter(this, void 0, void 0, function* () {
        if (ignoreCache || !map[clientId] || map[clientId].secret !== clientSecret) {
            debug('get fresh oauth client object');
            const openId = yield getOpenId(ignoreCache);
            const issueLength = openId.issuer.length;
            const credentials = {
                client: {
                    id: clientId,
                    secret: clientSecret
                },
                auth: {
                    tokenHost: openId.issuer,
                    tokenPath: openId.tokenEndpoint.substr(issueLength),
                    revokePath: openId.revocationEndpoint.substr(issueLength),
                    authorizePath: openId.authorizationEndpoint.substr(issueLength)
                }
            };
            map[clientId] = {
                credentials,
                secret: clientSecret
            };
            setTimeout(() => {
                debug('cache expired');
                map[clientId] = undefined;
            }, 600000);
        }
        else {
            debug('get cached oauth client object');
        }
        return simpleOauth2.create(map[clientId].credentials);
    });
};
//# sourceMappingURL=oauth.js.map