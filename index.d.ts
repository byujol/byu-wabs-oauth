export = byuOAuth

declare function byuOAuth (clientId: string, clientSecret: string): byuOAuth.ByuOAuth

declare namespace byuOAuth {

    export interface ByuOAuth {
        authorizedRequest (options: RequestWithTokenOptions): Promise<ResponseObject>,
        createToken (expiresAt: Date, accessToken: string, refreshToken?: string): Promise<ByuToken>,
        getAuthorizationUrl (redirectUri: string, state?: string): Promise<string>,
        getClientGrantToken (): Promise<ByuToken>,
        getCodeGrantToken (code: string, redirectUri: string): Promise<ByuToken>,
        getOpenId (ignoreCache?: boolean): Promise<ByuOpenId>,
        refreshToken (accessToken: string, refreshToken: string) : Promise<ByuToken>,
        revokeToken (accessToken: string, refreshToken?: string) : Promise<ByuToken>
    }

    export interface ByuToken {
        accessToken: string,
        expired: boolean,
        expiresAt: Date,
        expiresIn: number,
        resourceOwner?: ResourceOwner|void,
        refresh (): Promise<ByuToken>,
        refreshToken?: string|void,
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

    export interface ResourceOwner {
        atHash: string,
        aud: Array<string>,
        authTime: number,
        azp: string,
        byuId: string,
        exp: number,
        iat: number,
        iss: string,
        jwt: string,
        netId: string,
        personId: string,
        preferredFirstName: string,
        prefix: string,
        restOfName: string,
        sortName: string,
        sub: string,
        suffix: string,
        surname: string,
        surnamePosition: string
    }

    export interface RequestOptions {
        body?: object|string,
        headers?: {[k: string]: string},
        method?: string,
        query?: object,
        url: string
    }

    export interface RequestWithTokenOptions {
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