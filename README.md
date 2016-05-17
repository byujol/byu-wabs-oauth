# byu-wabs-oauth

This library provides some functions that will simplify the process of getting, refreshing, revoking, and verifying [Brigham Young University](http://www.byu.edu)'s OAuth tokens.

## Installation

```sh
$ npm install byu-wabs-oauth
```

## API

### byuWabsOauth

**byuWabsOauth ( clientId: *string*, clientSecret: *string*, wellKnownUrl: *string* ) :** ***Object***

Get an object with functions for getting, refreshing, revoking and verifying [Brigham Young University](http://www.byu.edu)'s OAuth tokens.

**Parameters**

* **clientId** - The client ID (a.k.a. consumer key).
* **clientSecret** - The client secret (a.k.a. consumer secret).
* **wellKnownUrl** - The URL to query for WSO2 endpoints.

**Returns** an object with the following functions:

* [getClientGrantAccessToken](#getclientgrantaccesstoken)
* [getCodeGrantAccessToken](#getcdegrantaccesstoken)
* [getCodeGrantAuthorizeUrl](#getcodegrantauthorizeurl)
* [refreshTokens](#refreshtokens)
* [revokeTokens](#revoketokens)

### getClientGrantAccessToken

**#getClientGrantAccessToken ( ) :** ***Promise\<[Token](#token)\>***

Get a client grant access token. Client grant tokens only require the client's credentials (not the resource owner's) to get an access token.

**Parameters**

None

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