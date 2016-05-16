"use strict";
const analyzeUrl    = require('./helpers/analyze-url');
const auth          = require('./helpers/auth');
const byuOauth      = require('../bin/byu-wabs-oauth');
const expect        = require('chai').expect;
const http          = require('http');
const Promise       = require('bluebird');
const request       = require('request-promise');

const co = Promise.coroutine;

const clientId = getArgv('client-id');
const clientSecret = getArgv('client-secret');
const netId = getArgv('net-id');
const password = getArgv('password');
const redirectUri = getArgv('redirect-uri');
const wellKnownUrl = getArgv('well-known-url');

// validate that all required command line args were issued
if (!clientId || !clientSecret || !redirectUri || !wellKnownUrl) {
  console.error('Missing values for one or more of the following command line arguments: --client-id, --client-secret, --redirect-uri --well-known-url');
  process.exit(1);
}

// validate the redirect URI and start the test server
(function() {
  const match = analyzeUrl(redirectUri);
  if (!match || match.protocol !== 'http') {
    console.error('Invalid redirect URI. It must use http and be of the format: http://my-domain.com:3000/path/to/use');
    process.exit(1);
  }
})();


describe('byu-wabs-oauth', function() {

  describe('initialization', function() {

    it('net id and password is correct', function() {
      return auth.checkCasNetIdPassword(netId, password)
        .then(function(valid) {
          expect(valid).to.be.equal(true);
        });
    });

    it('well known url is valid', function() {
      return request({ uri: wellKnownUrl, resolveWithFullResponse: true })
        .then(function(response) {
          expect(response.statusCode).to.equal(200);
        });
    });

  });

  describe('client grant', function() {

    it('can get access token', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const token = yield oauth.getClientGrantAccessToken();
      expect(token).to.be.an('object');
      expect(token.accessToken).to.be.a('string');
      expect(token.accessToken.length).to.be.greaterThan(0);
    }));

    it('can revoke access token', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const firstToken = yield oauth.getClientGrantAccessToken();
      yield oauth.revokeTokens(firstToken.accessToken);
      const secondToken = yield oauth.getClientGrantAccessToken();
      expect(firstToken.accessToken).to.not.equal(secondToken.accessToken);
    }));

  });

  describe('code grant', function() {

    it('can get code url', function() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      return oauth.getCodeGrantAuthorizeUrl(redirectUri, 'openid', 'no-state')
        .then(function(url) {
          expect(/^https?:\/\/[\s\S]+$/.test(url)).to.equal(true);
        });
    });

    it('oauth code a string if approved', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const oauthUrl = yield oauth.getCodeGrantAuthorizeUrl(redirectUri, 'openid', 'no-state');
      const uriPort = analyzeUrl(redirectUri).port;
      const oauthCode = yield auth.getOauthCode(oauthUrl, netId, password, uriPort);
      expect(oauthCode).to.be.a('string');
      return Promise.resolve();
    }));

    it('oauth code undefined if denied', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const oauthUrl = yield oauth.getCodeGrantAuthorizeUrl(redirectUri, 'openid', 'no-state');
      const uriPort = analyzeUrl(redirectUri).port;
      const oauthCode = yield auth.getOauthCode(oauthUrl, netId, password, uriPort, false);
      expect(oauthCode).to.equal(undefined);
      return Promise.resolve();
    }));

    it('can get oauth token with oauth code', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const oauthUrl = yield oauth.getCodeGrantAuthorizeUrl(redirectUri, 'openid', 'no-state');
      const uriPort = analyzeUrl(redirectUri).port;
      const oauthCode = yield auth.getOauthCode(oauthUrl, netId, password, uriPort);
      const result = yield oauth.getCodeGrantAccessToken(oauthCode, redirectUri);
      expect(result).to.be.an('object');
      expect(result).to.have.ownProperty('accessToken');
      return Promise.resolve();
    }));

    it('can get oauth token with refresh token', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const oauthUrl = yield oauth.getCodeGrantAuthorizeUrl(redirectUri, 'openid', 'no-state');
      const uriPort = analyzeUrl(redirectUri).port;
      const oauthCode = yield auth.getOauthCode(oauthUrl, netId, password, uriPort);
      const data = yield oauth.getCodeGrantAccessToken(oauthCode, redirectUri);
      const result = yield oauth.refreshTokens(data.accessToken, data.refreshToken);
      expect(result).to.be.an('object');
      expect(result).to.have.ownProperty('accessToken');
      expect(result.access_token).to.not.equal(data.accessToken);
    }));

    it('can revoke access token', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const firstToken = yield getTokenFromCode(oauth);
      yield oauth.revokeTokens(firstToken.accessToken);
      const secondToken = yield getTokenFromCode(oauth);
      expect(firstToken.accessToken).to.not.equal(secondToken.accessToken);
      return Promise.resolve();
    }));

    it('can revoke access token and refresh token', co(function *() {
      const oauth = byuOauth(clientId, clientSecret, wellKnownUrl);
      const firstToken = yield getTokenFromCode(oauth);
      yield oauth.revokeTokens(firstToken.accessToken, firstToken.refreshToken);
      const secondToken = yield getTokenFromCode(oauth);
      expect(firstToken.accessToken).to.not.equal(secondToken.accessToken);
      expect(firstToken.refreshToken).to.not.equal(secondToken.refreshToken);
      return Promise.resolve();
    }));

  });

});

/**
 * Find the value for an argument with the specified name.
 * @param {string} name
 * @returns {string|boolean}
 */
function getArgv(name) {
  var i;
  var data;
  for (i = 0; i < process.argv.length; i++) {
    if (process.argv[i].indexOf('--' + name) === 0) {
      data = process.argv[i].substr(2).split('=');
      return data[1] || true;
    }
  }
}

const getTokenFromCode = co(function *(oauth) {
  const oauthUrl = yield oauth.getCodeGrantAuthorizeUrl(redirectUri, 'openid', 'no-state');
  const uriPort = analyzeUrl(redirectUri).port;
  const oauthCode = yield auth.getOauthCode(oauthUrl, netId, password, uriPort);
  return oauth.getCodeGrantAccessToken(oauthCode, redirectUri);
});