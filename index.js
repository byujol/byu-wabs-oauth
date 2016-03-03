'use strict';
var oauth2 = require('oauth').OAuth2;
var byujwt = require('byu-jwt');
var Promise = require('bluebird');
var promised_request = Promise.promisify(require('request'));

function getWellKnown(clientID, clientSecret, wellKnownURL) {
  return promised_request(
    {
      url: wellKnownURL,
      method: 'GET'
    })
    .then(function (response) {
        return JSON.parse(response.body);
      }
    )
    .then(function (value) {
      return new oauth2(
        clientID,
        clientSecret,
        value.issuer,
        value.authorization_endpoint.replace(value.issuer, ''),
        value.token_endpoint.replace(value.issuer, ''),
        null
      );
    });
}
// The query_params parameter should at least include the redirect_uri, scope, and state properties.
// { redirect_uri: 'https://something.byu.edu/wabs', scope: 'openid', state: 'recommend this to be a value that represents the state of the app or uniquely identifies the request'}
exports.generateAuthorizationCodeRequestURL = function(clientID, clientSecret, wellKnownURL, query_params, callback){
  var params = query_params || {};
  params['response_type'] = 'code';
  getWellKnown(clientID, clientSecret, wellKnownURL)
    .then(function (oauth2Handle){
      callback(null, oauth2Handle.getAuthorizeUrl(params));
    })
    .catch(function(reason) {
      callback(reason, null);
    });
};

exports.getAccessTokenFromAuthorizationCode = function(clientID, clientSecret, wellKnownURL, authorization_code, redirect_uri, callback) {
  var data = {'grant_type': 'authorization_code', redirect_uri: redirect_uri };
  getWellKnown(clientID, clientSecret, wellKnownURL)
    .then(function(oauth2Handle) {
      oauth2Handle.getOAuthAccessToken(authorization_code, data, function(error, access_token, refresh_token, results){
        var data = {};
        data['results'] = results;
        byujwt.verifyJWT(results.id_token, wellKnownURL)
          .then(function(results) {
            data['access_token'] = access_token;
            data['refresh_token'] = refresh_token;
            data['open_id'] = results;
            return data;
          })
          .then(function(value) {
            callback(null,value);
          })
          .catch(function(reason) {
            callback(reason,null);
          });
      });
    });
};