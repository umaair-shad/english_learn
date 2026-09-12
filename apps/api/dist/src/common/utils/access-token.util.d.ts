export interface AccessTokenPair {
    rawToken: string;
    tokenHash: string;
    tokenPrefix: string;
}
export declare function generateAccessTokenPair(): AccessTokenPair;
export declare function hashAccessToken(rawToken: string): string;
export declare function accessTokenUrl(rawToken: string): string;
