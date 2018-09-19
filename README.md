# byu-wabs-oauth

Manage OAuth access tokens for BYU's implementation of WSO2.

## Features

- Get client grant access tokens
- Get code grant access tokens
- Make authenticated requests with automatic retry
- Get OpenID information

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

## API

### byuWabsOauth

**byuWabsOauth ( clientId: *string*, clientSecret: *string* ): *Promise<[ByuOAuth](#byuoauth)>***

Create a [ByuOAuth](#byuoauth) object.

**Parameters**

- *clientId* - The client ID or consumer key
- *clientSecret* - The client secret or consumer secret

**Returns** a [ByuOAuth](#byuoauth) object.

**Example**

```js
const byuOAuth = require('byu-wabs-oauth')
const oauth = await byuOauth('<client_id>', '<client_secret>')
```

### #authorizedRequest

**authorizedRequest ( options: *object* ): *Promise<

**Parameters**

- *options*
    - *body* (string|object) - The body to send with the request
    - *headers*

Make an HTTP or HTTPS request with the authorization header automatically set and managed. If the token provided is invalid then the request will get a new token and attempt the request again.



### getClientGrantAccessToken

**#getClientGrantAccessToken ( [ ignoreCache ] ) :** ***Promise\<[Token](#token)\>***

Get a client grant access token. Client grant tokens only require the client's credentials (not the resource owner's) to get an access token.

This function will return a cached access token unless the access token has expired or if the optional `ignoreCache` parameter is set to true.

**Parameters**

* **ignoreCache** - Set this parameter to true to ignore the cached client grant access token. Defaults to `false`.

**Returns**:

A Promise that resolves to a [Token](#token) object.

**Example**

```js
const byuOauth = require('byu-wabs-oauth');
const oauth = byuOauth('<client_id>', '<client_secret>', 'http://well-known-url.com');
oauth.getClientGrantAccessToken()
    .then(function(token) {
        console.log('Access token: ' + token.accessToken);
    });
```

### getCodeGrantAccessToken

**#getCodeGrantAccessToken ( code: *string*, redirectUri: *string* ) :** ***Promise\<[Token](#token)\>***

**Parameters**

* **code** - The grant code supplied by the authorize url.
* **redirectUri** - The URI to redirect the client to once the token has been acquired.

**Returns**

A Promise that resolves to a [Token](#token) object.

**Example**

```js
const byuOauth = require('byu-wabs-oauth');
const oauth = byuOauth('<client_id>', '<client_secret>', 'http://well-known-url.com');
oauth.getCodeGrantAccessToken('<some retrieved code>', 'http://somehost.com')
    .then(function(token) {
        console.log('Access token: ' + token.accessToken);
    });
```

### getCodeGrantAuthorizeUrl

**#getCodeGrantAuthorizeUrl ( redirectUri: *string*, scope?: *string*, state?: *string* ) :** ***Promise\<string\>***

Get the URL to send a client to to authorize the application to use the resource owner's information.

**Parameters**

* **redirectUri** - The URI to redirect the client to once that code has been acquired.
* **scope** - *Optional* - The scope to authorize the application for.
* **state** - *Optional* - A string representing state information for the application.

**Returns**

A Promise that resolves to a string representing the authorization URL.

**Example**

```js
const byuOauth = require('byu-wabs-oauth');
const oauth = byuOauth('<client_id>', '<client_secret>', 'http://well-known-url.com');
oauth.getCodeGrantAuthorizeUrl('http://somehost.com')
    .then(function(url) {
        console.log('URL: ' + url);
    });
```

### refreshTokens

**#refreshTokens ( accessToken: *string*, refreshToken: *string* ) :** ***Promise\<[Token](#token)\>***

Get a new set of tokens, using both the access token and the refresh token.

**Parameters**

* **accessToken** - The old access token.
* **refreshToken** - The old refresh token.

**Returns**

A Promise that resolves to a [Token](#token) object.

**Example**

```js
const byuOauth = require('byu-wabs-oauth');
const oauth = byuOauth('<client_id>', '<client_secret>', 'http://well-known-url.com');
oauth.refreshTokens('<access_token>', '<refresh_token>')
    .then(function(token) {
        console.log('Access token: ' + token.accessToken);
    });
```

### revokeTokens

**#revokeTokens ( accessToken: *string*, refreshToken?: *string* ) :** ***Promise\<void\>***

Revoke tokens so that they are no longer usable.

If a client access token revoked and it has been cached then the cached client access token will also be removed.

**Parameters**

* **accessToken** - The old access token.
* **refreshToken** - *Optional* - The old refresh token.

**Returns**

A Promise that resolves to `undefined`.

**Example**

```js
const byuOauth = require('byu-wabs-oauth');
const oauth = byuOauth('<client_id>', '<client_secret>', 'http://well-known-url.com');
oauth.revokeTokens('<access_token>', '<refresh_token>')
    .then(function(token) {
        console.log('Tokens revoked');
    });
```

## Token

A token object has the following structure:

```js
{
    accessToken: string,
    expiresIn: number,
    openId: [string, void],             // string or undefined
    refreshToken: [string, void],       // string or undefined
    scope: string,
    tokenType: string
}
```

## Testing

To run tests you need to first set up a client ID and client secret. Once done then you can run tests on this library by running the following command:

```sh
$ npm test -- --client-id=<client_id> --client-secret=<client_secret> --well-known-url=<well_known_url> --redirect-uri=<redirect_uri> --net-id=<net_id> --password=<password>
```

Note that if the net id used requires dual authentication that the tests will not pass.
Tests may take a while to run, so you may need to specify the mocha `--timeout` option in the test command.