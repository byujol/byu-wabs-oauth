'use strict'
import {AccessToken} from "simple-oauth2"
import {ByuOAuth, ByuToken, RequestWithTokenOptions, ResponseObject} from "../index";

const byuJwt = require('byu-jwt')()
const debug = require('debug')('byu-oauth')
const getOauth = require('./oauth')
const getOpenId = require('./openid')
const request = require('./request')

export = byuOauth
module.exports = byuOauth

function byuOauth (clientId: string, clientSecret: string): ByuOAuth {

    async function authorizedRequest(options: RequestWithTokenOptions): Promise<ResponseObject> {
        debug('make authorized request')
        options = Object.assign({}, options)
        options.headers = options.headers ? Object.assign({}, options.headers) : {}
        options.headers = lowerCaseHeaders(options.headers)
        if (!options.token) options.token = await getClientGrantToken()
        if (!options.headers.authorization) options.headers.authorization = 'Bearer ' + options.token.accessToken
        let res = await request(options)
        if (responseIndicatesInvalidToken(res)) {
            debug('retry authorized request with new token')
            await options.token.refresh()
            options.headers.authorization = 'Bearer ' + options.token.accessToken
            res = await request(options)
        }
        return res
    }

    async function getAuthorizationUrl (redirectUri: string, scope?: string, state?: string): Promise<string> {
        debug('get authorization url')
        const oauth = await getOauth(clientId, clientSecret)
        const config: {[k: string]: any} = { redirect_uri: redirectUri }
        if (scope !== undefined) config.scope = scope
        if (state !== undefined) config.state = state
        return oauth.authorizationCode.authorizeURL(config)
    }

    async function getClientGrantToken (): Promise<ByuToken> {
        debug('get client grant token')
        const openId = await getOpenId()
        const oauth = await getOauth(clientId, clientSecret)
        const result = await oauth.clientCredentials.getToken({
            scope: openId.scopesSupported
        })
        const rawToken = oauth.accessToken.create(result)
        const token = await processToken(rawToken, refresh, undefined)
        async function refresh() {
            const newToken = await getClientGrantToken()
            token.accessToken = newToken.accessToken
            token.expiresAt = newToken.expiresAt
            token.jwt = newToken.jwt
            token.scope = newToken.scope
            token.type = newToken.type
            return token
        }
        return token
    }

    async function getCodeGrantToken (code: string, redirectUri: string, scope?: string): Promise<ByuToken> {
        debug('get code grant token')
        const oauth = await getOauth(clientId, clientSecret)
        const config = {
            code: code,
            redirect_uri: redirectUri,
            scope: scope ? scope.split(/ +/) : []
        }
        const result = await oauth.authorizationCode.getToken(config)
        const token = oauth.accessToken.create(result)
        return processToken(token, () => token.refresh({}), token.token.refreshToken)
    }

    return {
        authorizedRequest,
        getAuthorizationUrl,
        getClientGrantToken,
        getCodeGrantToken,
        getOpenId
    }

}

function lowerCaseHeaders(headers) {
    const result = {}
    if (headers) {
        Object.keys(headers).forEach(key => {
            result[key.toLowerCase()] = headers[key]
        })
    }
    return result
}

function processToken(token: AccessToken, refresh: Function, refreshToken: string|void) : ByuToken {
    const protect = {
        refreshing: undefined
    }

    const result = {
        accessToken: token.token.access_token,
        get expired(): boolean { return this.expiresAt < Date.now() },
        expiresAt: token.token.expires_at,
        get expiresIn(): number { return this.expiresAt - Date.now() },
        jwt: token.token.id_token,
        refresh: async () => {
            if (protect.refreshing) return protect.refreshing
            protect.refreshing = refresh()
            const result = await protect.refreshing
            protect.refreshing = undefined
            return result
        },
        refreshToken: refreshToken,
        revoke: async () => {
            token.revokeAll()
            result.accessToken = undefined
            result.expiresAt = new Date()
            result.jwt = undefined
            result.refreshToken = undefined
            return result
        },
        scope: token.token.scope,
        type: token.token.token_type
    }

    if (!result.jwt) return result

    return byuJwt.verifyJWT(result.jwt)
        .then(function(verified) {
            if (!verified) throw Error('Access token failed verification')
            return result
        })
}

function responseIndicatesInvalidToken(res: ResponseObject): boolean {
    return res.statusCode === 401
        && String(res.body).indexOf('<ams:code>900901</ams:code>') !== -1;
}