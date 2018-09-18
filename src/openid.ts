import {ByuOpenId} from "..";

const byuJwt = require('byu-jwt');
const debug = require('debug')('byu-oauth:openId')
const request = require('./request')

export {}

let cache = undefined

module.exports = async function (ignoreCache: boolean): Promise<ByuOpenId> {
    if (!cache || ignoreCache) {
        debug('get fresh OpenID object')
        const res = await request({ url: byuJwt.WELL_KNOWN_URL })
        const data = JSON.parse(res.body)
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
        }
        setTimeout(() => {
            debug('cache expired')
            cache = undefined
        }, 600000)
    } else {
        debug('get cached OpenID object')
    }
    return Promise.resolve(cache)
}