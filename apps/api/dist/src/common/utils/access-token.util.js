"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessTokenPair = generateAccessTokenPair;
exports.hashAccessToken = hashAccessToken;
exports.accessTokenUrl = accessTokenUrl;
const node_crypto_1 = require("node:crypto");
const TOKEN_BYTES = 32;
function generateAccessTokenPair() {
    const rawToken = (0, node_crypto_1.randomBytes)(TOKEN_BYTES).toString('hex');
    return {
        rawToken,
        tokenHash: hashAccessToken(rawToken),
        tokenPrefix: rawToken.slice(0, 8),
    };
}
function hashAccessToken(rawToken) {
    return (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex');
}
function accessTokenUrl(rawToken) {
    return `/student/${rawToken}`;
}
//# sourceMappingURL=access-token.util.js.map