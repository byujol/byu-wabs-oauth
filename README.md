# byu-wabs-oauth
Convenience library to handle oauth requests specific to BYU's well-known configuration data

## Functions
* generateAuthorizationCodeRequestURL
* getAccessTokenFromAuthorizationCode

## generateAuthorizationCodeRequestURL(clientID, clientSecret, wellKnownURL, query_params, callback)
generateAuthorizationCodeRequestURL constructs the request URL to invoke for an Oauth authorization code grant type request.
Parameters:
- clientID: The consumer key from the application defined in WSO2
- clientSecret: The consumer secret from the application defined in WSO2
- wellKnownURL: The Open ID configuration page (currently defined as https://api.byu.edu/.well-known/openid-configuration). You can specify the test Open ID configuration here for test development as well.
- query_params: The query_params parameter should at least include the redirect_uri, scope, and state properties. (i.e. { redirect_uri: 'https://something.byu.edu/wabs', scope: 'openid', state: 'recommend this to be a value that represents the state of the app or uniquely identifies the request'})
- callback: callback function

## getAccessTokenFromAuthorizationCode(clientID, clientSecret, wellKnownURL, authorization_code, redirect_uri, callback)
getAccessTokenFromAuthorizationCode produces an access token from the authorization code provided.
Parameters:
- clientID: The consumer key from the application defined in WSO2
- clientSecret: The consumer secret from the application defined in WSO2
- wellKnownURL: The Open ID configuration page (currently defined as https://api.byu.edu/.well-known/openid-configuration). You can specify the test Open ID configuration here for test development as well.
- authorization_code: The value retrieved from the interaction of invoking the generateAuthorizationCodeRequestURL request.
- callback: callback function
