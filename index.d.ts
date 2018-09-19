export = byuOAuth

declare function byuOAuth (clientId: string, clientSecret: string): byuOAuth.ByuOAuth

declare namespace byuOAuth {

    export interface ByuOAuth {
        authorizedRequest (options: RequestWithTokenOptions): Promise<ResponseObject>,
        getAuthorizationUrl (redirectUri: string, scope?: string, state?: string): Promise<string>,
        getClientGrantToken (): Promise<ByuToken>,
        getCodeGrantToken (code: string, redirectUri: string, scope?: string): Promise<ByuToken>,
        getOpenId (ignoreCache?: boolean): Promise<ByuOpenId>
    }

    export interface ByuToken {
        accessToken: string,
        expired: boolean,
        expiresAt: Date,
        expiresIn: number,
        jwt: string|void,
        refresh (): Promise<ByuToken>,
        refreshToken: string|void,
        revoke (): Promise<ByuToken>,
        scope: string,
        type: string
    }

    export interface ByuOpenId {
        authorizationEndpoint: string,
        idTokenSigningAlgorithmValuesSupported: Array<string>,
        issuer: string,
        jwksUri: string,
        responseTypesSupported: Array<string>,
        revocationEndpoint: string,
        scopesSupported: Array<string>,
        subjectTypesSupported: Array<string>,
        tokenEndpoint: string,
        userInfoEndpoint: string
    }

    interface RequestOptions {
        body?: object|string,
        headers?: {[k: string]: string},
        method?: string,
        query?: object,
        url: string
    }

    interface RequestWithTokenOptions {
        body?: object|string,
        headers?: {[k: string]: string},
        method?: string,
        query?: object,
        token?: ByuToken,
        url: string
    }

    interface ResponseObject {
        body: string|object|void,
        headers: object,
        statusCode: number
    }
}