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

    async function createToken (expiresAt: Date, accessToken: string, refreshToken?: string): Promise<ByuToken> {
        const options: {[k: string]: any} = { access_token: accessToken, expires_in: +expiresAt - Date.now() }
        if (refreshToken) options.refresh_token = refreshToken
        const oauth = await getOauth(clientId, clientSecret)
        const token = oauth.accessToken.create(options)
        return processToken(token, function refresh() {
            if (refreshToken) return token.refresh({})
            throw Error('Unable to refresh token')
        })
    }

    async function getAuthorizationUrl (redirectUri: string, state?: string): Promise<string> {
        debug('get authorization url')
        const oauth = await getOauth(clientId, clientSecret)
        const config: {[k: string]: any} = {
            redirect_uri: redirectUri,
            scope: 'openid'
        }
        // if (scope !== undefined) config.scope = scope
        if (state !== undefined) config.state = state
        return oauth.authorizationCode.authorizeURL(config)
    }

    async function getClientGrantToken (): Promise<ByuToken> {
        debug('get client grant token')
        const oauth = await getOauth(clientId, clientSecret)
        const result = await oauth.clientCredentials.getToken({})
        const rawToken = oauth.accessToken.create(result)
        const token = await processToken(rawToken, refresh)
        async function refresh() {
            const newToken = await getClientGrantToken()
            token.accessToken = newToken.accessToken
            token.expiresAt = newToken.expiresAt
            token.scope = newToken.scope
            token.type = newToken.type
            return token
        }
        return token
    }

    async function getCodeGrantToken (code: string, redirectUri: string): Promise<ByuToken> {
        debug('get code grant token')
        const oauth = await getOauth(clientId, clientSecret)
        const config: {[k: string]: any} = {
            code: code,
            redirect_uri: redirectUri,
            scope: ['openid']
        }
        const result = await oauth.authorizationCode.getToken(config)
        const token = oauth.accessToken.create(result)
        return processToken(token,() => token.refresh({}))
    }

    async function refreshToken (accessToken: string, refreshToken: string) : Promise<ByuToken> {
        const token = await createToken(new Date(), accessToken, refreshToken)
        await token.refresh()
        return token
    }

    async function revokeToken (accessToken: string, refreshToken?: string) : Promise<ByuToken> {
        const token = await createToken(new Date(), accessToken, refreshToken)
        await token.revoke()
        return token
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

async function processToken(token: AccessToken, refresh: Function) : Promise<ByuToken> {
    const protect = {
        refreshing: undefined
    }

    const result: ByuToken = {
        accessToken: token.token.access_token,
        get expired(): boolean { return this.expiresAt < Date.now() },
        expiresAt: token.token.expires_at,
        get expiresIn(): number { return this.expiresAt - Date.now() },
        refresh: async () => {
            if (protect.refreshing) return protect.refreshing
            protect.refreshing = refresh()
            const result = await protect.refreshing
            protect.refreshing = undefined
            return result
        },
        revoke: async () => {
            token.revokeAll()
            result.accessToken = undefined
            result.expiresAt = new Date()
            if (result.hasOwnProperty('resourceOwner')) result.resourceOwner = undefined
            if (result.hasOwnProperty('refreshToken')) result.refreshToken = undefined
            return result
        },
        scope: token.token.scope,
        type: token.token.token_type
    }

    if (token.token.refresh_token) result.refreshToken = token.token.refresh_token

    const jwt = token.token.id_token
    if (!jwt) return result

    const decoded = await byuJwt.decodeJWT(jwt)
    if (!decoded) throw Error('Access token failed verification')
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
    }
    return result
}

function responseIndicatesInvalidToken(res: ResponseObject): boolean {
    return res.statusCode === 401
        && String(res.body).indexOf('<ams:code>900901</ams:code>') !== -1;
}