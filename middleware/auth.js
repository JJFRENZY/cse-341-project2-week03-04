// middleware/auth.js
import { auth, requiredScopes } from 'express-oauth2-jwt-bearer';

export const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256'
});

export const needWrite = requiredScopes('write:library'); // for POST/PUT/DELETE
export const needRead  = requiredScopes('read:library');  // optional for GETs
