# byu-wabs-oauth

Manage OAuth access tokens for BYU's implementation of WSO2.

## Features

- Get client grant access tokens
- Get code grant access tokens
- Make authenticated requests with automatic retry
- Get OpenID information

## Table of Contents

- [Installation](#installation)
- [Examples](#examples)
    - [Client Grant Token](#client-grant-token)
    - [Code Grant Token](#code-grant-token)
    - [Authorized Request](#authorized-request)
    - [Refresh Tokens](#refresh-tokens)
    - [Revoke Tokens](#revoke-tokens)
- [Create a BYU OAuth object](#create-a-byu-oauth-object)
- [BYU OAuth Object](#byu-oauth-object)
    - [authorizedRequest](#authorizedRequest)
    - [getAuthorizationUrl](#getauthorizationurl)
    - [getClientGrantToken](#getclientgranttoken)
    - [getCodeGrantToken](#getcodegranttoken)
    - [getOpenId](#getopenid)
- [BYU OAuth Token](#byu-oauth-token)
- [Testing](#testing)


## Installation

If you don't want to install all of the testing baggage (which there is a lot of) you'll want to do a production installation:

```sh
$ npm install --production byu-wabs-oauth
```

Alternatively if you'd like to install with testing libraries:

```sh
$ npm install byu-wabs-oauth
```

## Examples

### Client Grant Token

Use this grant type for communicating from one server to another where a specific user’s permission to access data is not required.

```js
const byuOAuth = require('byu-wabs-oauth')
const oauth = await byuOauth('<client_id>', '<client_secret>')
const token = await oauth.getClientGrantToken()
```

### Code Grant Token

Use this grant type if you need the user's authorization to access data. Getting this grant type is a two step process.

1. Direct the user to the authorization URL
2. Get the token using the authorization code that comes in a follow up request

```js
;(async () => {
    const byuOAuth = require('byu-wabs-oauth')
    const redirectUrl = 'http://localhost:3000/'

    // get BYU OAuth instance
    const oauth = await byuOauth('<client_id>', '<client_secret>')

    // start a server that will listen for the OAuth code grant redirect
    const server = http.createServer(async (req, res) => {
        const code = req.url.startsWith('/code=')
            ? req.url.substr(6)
            : null

        // if there is no code then redirect browser to authorization url
        if (!code) {
            const url = await oauth.getAuthorizationUrl(redirectUrl)
            res.setHeader('Location', url)
            res.end()

        // if there is a code then use the code to get the code grant token
        } else {
            const token = await oauth.getCodeGrantToken(code, redirectUrl)
            res.write(token.accessToken)
            res.end()
        }
    });

    const listener = server.listen(3000)
})()
```

### Authorized Request

Make an HTTP/HTTPS request with the authorization header automatically set. If the first request fails due to an invalid token then a fresh token will be acquired and the request will be attempted a second time. This will work for either client grant or code grant tokens.

**Client grant token example**

```js
;(async () => {
    const byuOAuth = require('byu-wabs-oauth')
    const oauth = await byuOauth('<client_id>', '<client_secret>')

    // make a GET request to the specified URL using client grant
    const response = oauth.authorizedRequest({ url: 'https://api.byu.edu/something' })
})()
```

**Code grant token example**

```js
;(async () => {
    const byuOAuth = require('byu-wabs-oauth')
    const redirectUrl = 'http://localhost:3000/'

    // get BYU OAuth instance
    const oauth = await byuOauth('<client_id>', '<client_secret>')

    // start a server that will listen for the OAuth code grant redirect
    const server = http.createServer(async (req, res) => {
        const code = req.url.startsWith('/code=')
            ? req.url.substr(6)
            : null

        // if there is no code then redirect browser to authorization url
        if (!code) {
            const url = await oauth.getAuthorizationUrl(redirectUrl)
            res.setHeader('Location', url)
            res.end()

        // if there is a code then use the code to get the code grant token
        } else {
            const token = await oauth.getCodeGrantToken(code, redirectUrl)

            // make the autorized request with the specified token
            const response = oauth.authorizedRequest({
                token,
                url: 'https://api.byu.edu/something'
            })

            res.write(response.body)
            res.end()
        }
    });

    const listener = server.listen(3000)
})()
```

### Refresh Tokens

This operation can be performed on tokens that were generated as either client grant or code grant tokens. For simplicity the client grant token is used in the example.

```js
const byuOAuth = require('byu-wabs-oauth')
const oauth = await byuOauth('<client_id>', '<client_secret>')
const token = await oauth.getClientGrantToken()

await token.refresh()
```

### Revoke Tokens

This operation can be performed on tokens that were generated as either client grant or code grant tokens. For simplicity the client grant token is used in the example.

```js
const byuOAuth = require('byu-wabs-oauth')
const oauth = await byuOauth('<client_id>', '<client_secret>')
const token = await oauth.getClientGrantToken()

await token.revoke()
```

## Create a BYU OAuth object

**Parameters**

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| **clientId** | `string` | Yes | N/A | The client ID or consumer key |
| **clientSecret** | `string` | Yes | N/A | The client secret or consumer secret |

**Returns** a Promise that resolves to a [BYU OAuth object](#byu-oauth-object).

**Example**

```js
const byuOAuth = require('byu-wabs-oauth')
const oauth = await byuOauth('<client_id>', '<client_secret>')
```

## BYU OAuth Object

This object is created when you [call the module function](#create-a-byu-oauth-object). It has the following properties:

- [authorizedRequest](#authorizedrequest) - Used for making HTTP/S requests with an authorization token. Includes auto token refresh when stale.
- [getAuthorizationUrl](#getauthorizationurl) - Get the URL that will provide an OAuth code grant code.
- [getClientGrantToken](#getclientgranttoken) - Get a client grant [token](#byu-oauth-token). Use this grant type for communicating from one server to another where a specific user’s permission to access data is not required.
- [getCodeGrantToken](#getcodegranttoken) - Get a code grant [token](#byu-oauth-token). Use this grant type if you need the user's authorization to access data.
- [getOpenId](#getopenid) - Get the OpenID object.

### authorizedRequest

`authorizedRequest ( options: object ): Promise<object>`

Make an HTTP/S request. The authorization header will automatically be set based on the token provided. If the token is invalid then the request will get a new token and attempt the request again.

**Parameters**

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| options | `object` | Yes | N/A | The [request options](#request-options). |

#### Request Options

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| body | `string` or `object` | No | N/A | The body to send with the request. |
| headers | `Object<string, string>` | No | `{}` | An object with keys as header names and values as header values. |
| method | `string` | No | `"GET"` | The HTTP method to use |
| query | `Object<string, string|string[]>` | No | `{}` | An object with keys as query parameter names and values as query parameter values. If the value is an array of strings then the query parameter will be set multiple times. If the `url` option also has query parameters then this will be appended to existing options.
| token | [Token](#byu-oauth-token) | No | [getClientGrantAccessToken](#getclientgrantaccesstoken) | The token to use to make the request.
| **url** | `string` | Yes | N/A | The URL to call, including protocol. For example: `https://api.byu.edu/some/path` |

**Returns** a Promise that resolves to an object with the following properties:

- body - May be undefined, a string, or an object
- headers - An object
- statusCode - A number

**Example**

```js
;(async () => {
    const byuOAuth = require('byu-wabs-oauth')
    const oauth = await byuOauth('<client_id>', '<client_secret>')

    // make a GET request to the specified URL using client grant
    const response = await oauth.authorizedRequest({ url: 'https://api.byu.edu/something' })
})()
```

### getAuthorizationUrl

`getAuthorizationUrl ( redirectUri: string, scope?: string, state?: string ): Promise<string>`

Get the URL that needs to be visited to acquire a code grant code.

**Parameters**

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| *redirectUri* | `string` | Yes | N/A | The URL that the API manager will redirect to after the user has authorized the application. |
| scope | `string` | No | `''` | The OAuth2 scopes to ask permission for. Each scope should be seperated by a space. |

**Returns** a Promise that resolves to the URL.

**Example**

```js
;(async () => {
    const byuOAuth = require('byu-wabs-oauth')
    const oauth = await byuOauth('<client_id>', '<client_secret>')

    const url = await oauth.getAuthorizationUrl('https://my-server.com', 'scope1 scope2', 'state info')
})()
```

### getClientGrantToken

`getClientGrantToken (): Promise<Token>`

Get a client grant [token](#byu-oauth-token).

**Parameters**

None

**Returns** a Promise that resolves to a [token](#byu-oauth-token).

**Example**

```js
;(async () => {
    const byuOAuth = require('byu-wabs-oauth')
    const oauth = await byuOauth('<client_id>', '<client_secret>')

    const token = await oauth.getClientGrantToken()
})()
```

### getCodeGrantToken

`getCodeGrantToken ( code: string, redirectUri: string, scope?: string): Promise<Token>`

Get a code grant [token](#byu-oauth-token).

**Parameters**

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| *code* | `string` | Yes | N/A | The code grant code that signifies authorization |
| *redirectUri* | `string` | Yes | N/A | The OAuth2 scopes to ask permission for. Each scope should be seperated by a space. |
| scope | `string` | No | `''` | The OAuth2 scopes to ask permission for. Each scope should be seperated by a space. These scopes can be the same as those used in the [authorization URL](#getauthorizationurl) or they can be a lesser set. |

**Returns** a Promise that resolves to a [token](#byu-oauth-token).

**Example**

See the [Code Grant Token example](#code-grant-token).

### getOpenId

`getOpenId ( ignoreCache?: boolean ): Promise<object>`

Get the latest OpenID information. This value changes so rarely that it may never change, therefor it is safe to cache this value and a cache time of 10 minutes has been set internally. This method is used by all other [BYU OAuth Object](#byu-oauth-object) properties, so if nothing is working then just maybe the OpenID information has changed and you can either wait up to 10 minutes for it to fix, or you can call this function with the `ignoreCache` parameter set to `true` and that will cause an update.

**Parameters**

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| ignoreCache | `boolean` | No | `false` | Whether to ignore cached OpenID object value. |

**Returns** a Promise that resolves to an object with the following properties:

- authorizationEndpoint - A string
- idTokenSigningAlgorithmValuesSupported - An array of strings
- issuer - A string
- jwksUri - A string
- responseTypesSupported - An array of strings
- revocationEndpoint - A string
- scopesSupported - An array of strings
- subjectTypesSupported - An array of strings
- tokenEndpoint - A string
- userInfoEndpoint - A string

## BYU OAuth Token

This object has information about the current token as well as methods for managing the token. These are the properties:

- accessToken - A string that has the most recent access token. This value will be `undefined` if the token has been revoked.
- expired - A boolean that indicates if the token has expired.
- expiresAt - A Date object that represents when the token will expire.
- expiresIn - The number of milliseconds until the token expires.
- jwt - The JWT that represents this access token.
- refresh() - A function for refresing the token. See the [Refresh Tokens](#refresh-tokens) example.
- refreshToken - A string representing the refresh token. This value will be `undefined` for client grant tokens, although client grant tokens can still be refreshed using the `refresh` function on this object.
- revoke() - A function to revoke the current access token and refresh token. See the [Revoke Tokens](#revoke-tokens) example.
- scope - A string representing the scopes associated with this token.
- type - A string of the token type.

## Testing

1. Open a terminal and log into AWS using [awslogin](https://github.com/byu-oit/awslogin).
2. Select the `dev-oit-byu` account.
3. Change the directory to this project's directory.
4. Run: `npm install`
5. Run: `npm test`