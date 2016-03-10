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

function _retrieveAccessToken(clientID, clientSecret, wellKnownURL, code_or_token, params, callback) {
  getWellKnown(clientID, clientSecret, wellKnownURL)
    .then(function(oauth2Handle) {
      oauth2Handle.getOAuthAccessToken(code_or_token, params, function(error, access_token, refresh_token, results){
        if(error) {
          callback(error,null);
        }
        else {
          var data = {};
          data['results'] = results;
          data['access_token'] = access_token;
          if(refresh_token) {
            data['refresh_token'] = refresh_token;
          }
          if(results.id_token) {
            byujwt.verifyJWT(results.id_token, wellKnownURL)
              .then(function(open_id_value) {
                data['open_id'] = open_id_value;
                return data;
              })
              .then(function(value) {
                callback(null,value);
              })
              .catch(function(reason) {
                callback(reason,null);
              });
          }
          else {
            callback(null,data);
          }
        }
      });
    })
    .catch(function(error) {
      callback(error,null);
    });
}

exports.getAccessTokenAsClientGrantType = function(clientID, clientSecret, wellKnownURL, callback) {
  var params = {'grant_type': 'client_credentials'};
  _retrieveAccessToken(clientID, clientSecret, wellKnownURL, null, params, callback);
};

exports.getAccessTokenFromAuthorizationCode = function(clientID, clientSecret, wellKnownURL, authorization_code, redirect_uri, callback) {
  var params = {'grant_type': 'authorization_code', 'redirect_uri': redirect_uri };
  _retrieveAccessToken(clientID, clientSecret, wellKnownURL, authorization_code, params, callback);
};

exports.getAccessTokenFromRefreshToken = function(clientID, clientSecret, wellKnownURL, refresh_token, callback) {
  var params = {'grant_type': 'refresh_token'};
  _retrieveAccessToken(clientID, clientSecret, wellKnownURL, refresh_token, params, callback);
};