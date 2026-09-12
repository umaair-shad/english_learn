import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

export interface AccessTokenPair {
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
}

export function generateAccessTokenPair(): AccessTokenPair {
  const rawToken = randomBytes(TOKEN_BYTES).toString('hex');
  return {
    rawToken,
    tokenHash: hashAccessToken(rawToken),
    tokenPrefix: rawToken.slice(0, 8),
  };
}

export function hashAccessToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function accessTokenUrl(rawToken: string): string {
  return `/student/${rawToken}`;
}
