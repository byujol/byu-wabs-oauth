# byu-wabs-oauth
Convenience library to handle oauth requests specific to BYU's well-known configuration data

## Functions
* generateAuthorizationCodeRequestURL
* getAccessTokenAsClientGrantType
* getAccessTokenFromAuthorizationCode
* getAccessTokenFromRefreshToken

## generateAuthorizationCodeRequestURL(clientID, clientSecret, wellKnownURL, query_params, callback)
generateAuthorizationCodeRequestURL constructs the request URL to invoke for an Oauth authorization code grant type request.
Parameters:
- clientID: The consumer key from the application defined in WSO2
- clientSecret: The consumer secret from the application defined in WSO2
- wellKnownURL: The Open ID configuration page (currently defined as https://api.byu.edu/.well-known/openid-configuration). You can specify the test Open ID configuration here for test development as well.
- query_params: The query_params parameter should at least include the redirect_uri, scope, and state properties. (i.e. { redirect_uri: 'https://something.byu.edu/wabs', scope: 'openid', state: 'recommend this to be a value that represents the state of the app or uniquely identifies the request'})
- callback: callback function

## getAccessTokenAsClientGrantType(clientID, clientSecret, wellKnownURL, callback)
getAccessTokenAsClientGrantType produces an access token from the client credentials provided.
Parameters:
- clientID: The consumer key from the application defined in WSO2
- clientSecret: The consumer secret from the application defined in WSO2
- wellKnownURL: The Open ID configuration page (currently defined as https://api.byu.edu/.well-known/openid-configuration). You can specify the test Open ID configuration here for test development as well.
- callback: callback function

## getAccessTokenFromAuthorizationCode(clientID, clientSecret, wellKnownURL, authorization_code, redirect_uri, callback)
getAccessTokenFromAuthorizationCode produces an access token from the authorization code provided.
Parameters:
- clientID: The consumer key from the application defined in WSO2
- clientSecret: The consumer secret from the application defined in WSO2
- wellKnownURL: The Open ID configuration page (currently defined as https://api.byu.edu/.well-known/openid-configuration). You can specify the test Open ID configuration here for test development as well.
- authorization_code: The value retrieved from the interaction of invoking the generateAuthorizationCodeRequestURL request.
- redirect_uri: The redirect URL configured with the WSO2 application. It's used as another layer of authentication in this request.
- callback: callback function

## getAccessTokenFromRefreshToken(clientID, clientSecret, wellKnownURL, refresh_token, redirect_uri, callback)
getAccessTokenFromRefreshToken produces an access token from the refresh token provided.
Parameters:
- clientID: The consumer key from the application defined in WSO2
- clientSecret: The consumer secret from the application defined in WSO2
- wellKnownURL: The Open ID configuration page (currently defined as https://api.byu.edu/.well-known/openid-configuration). You can specify the test Open ID configuration here for test development as well.
- refresh_token: The value retrieved from a previous call to gain an access token and used to gain a new access token when the current access token has expired or may be expiring soon.
- redirect_uri: The redirect URL configured with the WSO2 application. It's used as another layer of authentication in this request.
- callback: callback function
