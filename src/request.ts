import {RequestOptions, ResponseObject} from "..";

const debug = require('debug')('byu-oauth:request')
const http = require('http')
const https = require('https')
const querystring = require('querystring')

const rxJson = /^application\/(?:[^+]+\+)?json(?:;|$)/
const rxUrl = /^(https?):\/\/([^:/?]+)(?::(\d+))?([/?].*)?$/

module.exports = function (options: RequestOptions): Promise<ResponseObject> {
    return new Promise((resolve, reject) => {
        const match = rxUrl.exec(options.url)
        if (!match) return reject(Error('Invalid URL specified'))
        let [ , protocol, hostname, port, path ] = match

        // finish building the path
        if (!path.startsWith('/')) path = '/' + path
        if (options.query) {
            let first = path.indexOf('?') !== -1
            Object.keys(options.query).forEach(key => {
                path += (first ? '?' : '&') + key + '=' + encodeURIComponent(options.query[key])
                first = false
            })
        }

        // lower case all headers
        const headers = {}
        if (options.headers) {
            Object.keys(options.headers).forEach(key => {
                headers[key.toLowerCase()] = options.headers[key]
            })
        }

        // if the body is an object and there is no content-type then convert to application/json
        let body
        if (typeof options.body !== 'object') {
            if (!headers['content-type']) headers['content-type'] = 'application/json'
            switch (headers['content-type']) {
                case 'application/json':
                    body = JSON.stringify(options.body)
                    break
                case 'application/x-www-form-urlencoded':
                case 'multipart/form-data':
                    body = querystring.stringify(options.body)
                    break
                case 'text/plain':
                default:
                    body = String(options.body)
            }
        } else if (options.body !== undefined) {
            body = String(options.body)
        }

        const config = {
            hostname,
            port: port || (protocol === 'http' ? 80 : 443),
            method: options.method ? options.method.toUpperCase() : 'GET',
            path,
            headers
        }
        const signature = config.method + ' ' + config.hostname + (port ? ':' + port : '') + config.path
        debug('request to ' + signature + ' initialized')

        const req = (protocol === 'http' ? http : https).request(config, res => {
            debug('request to ' + signature + ' receiving response code: ' + res.statusCode)
            let body = ''
            res.setEncoding('utf8')
            res.on('data', chunk => {
                body += chunk
            })
            res.on('end', () => {
                try {
                    if (body && rxJson.test(res.headers['content-type'])) body = JSON.parse(body)
                    resolve({
                        body,
                        headers: res.headers,
                        statusCode: res.statusCode
                    })
                } catch (err) {
                    reject(err)
                }
            })
        })

        req.on('error', err => {
            debug('request to ' + signature + ' has error: ' + err.stack)
            reject(err)
        })

        if (body !== undefined) req.write(body)
        req.end()
    })
}