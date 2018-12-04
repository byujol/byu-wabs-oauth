import {OAuthClient} from "simple-oauth2";

const debug = require('debug')('byu-oauth:oauth-client')
const getOpenId = require('./openid')
const simpleOauth2 = require('simple-oauth2')

export {}

const map = {}

module.exports = async function getOauth(clientId: string, clientSecret: string, ignoreCache?: boolean): Promise<OAuthClient> {
    if (ignoreCache || !map[clientId] || map[clientId].secret !== clientSecret) {
        debug('get fresh oauth client object')
        const openId = await getOpenId(ignoreCache)
        const issueLength = openId.issuer.length
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
        }
        map[clientId] = {
            credentials,
            secret: clientSecret
        }
        map[clientId].timeoutId = setTimeout(() => {
            debug('cache expired')
            map[clientId] = undefined
        }, 600000)
    } else {
        debug('get cached oauth client object')
    }
    return simpleOauth2.create(map[clientId].credentials)
}

function clearTimeouts() {
    Object.keys(map).forEach(key => {
        const value = map[key]
        if (value) clearTimeout(value.timeoutId)
    })
}

process.on('exit', clearTimeouts)      // app is closing
process.on('SIGINT', clearTimeouts)    // catches ctrl+c event
process.on('SIGBREAK', clearTimeouts)  // catches Windows ctrl+c event
process.on('SIGUSR1', clearTimeouts)   // catches "kill pid"
process.on('SIGUSR2', clearTimeouts)   // catches "kill pid"