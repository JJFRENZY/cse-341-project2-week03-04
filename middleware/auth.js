// middleware/auth.js
import { auth, requiredScopes } from 'express-oauth2-jwt-bearer';

/**
 * We support Auth0-configured JWT validation. If the required env vars are
 * missing (e.g., local mock/dev), we fall back to permissive no-op middlewares
 * so the server still boots (with a loud warning).
 *
 * Required for secure mode:
 * - AUTH0_AUDIENCE            e.g. https://api.yourdomain.com
 * - AUTH0_ISSUER_BASE_URL     e.g. https://your-tenant.us.auth0.com
 *
 * Optional:
 * - AUTH_DISABLE=true         (bypass all auth checks; DO NOT use in prod)
 */

const hasAuthConfig =
  !!process.env.AUTH0_AUDIENCE &&
  (!!process.env.AUTH0_ISSUER_BASE_URL || !!process.env.AUTH0_DOMAIN);

const ISSUER_BASE_URL =
  process.env.AUTH0_ISSUER_BASE_URL ||
  (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : undefined);

const AUTH_DISABLED = String(process.env.AUTH_DISABLE || '').toLowerCase() === 'true';

function noop(req, _res, next) { next(); }

if (AUTH_DISABLED) {
  console.warn('[AUTH] AUTH_DISABLE=true → JWT & scope checks are DISABLED.');
}

if (!hasAuthConfig && !AUTH_DISABLED) {
  console.warn(
    '[AUTH] Missing AUTH0_* env vars. JWT validation disabled. ' +
      'Set AUTH_DISABLE=true if this is intentional for local dev.'
  );
}

/**
 * jwtCheck:
 *  - Validates RS256 JWTs issued by Auth0 for the configured audience/issuer.
 *  - Falls back to a no-op if auth is disabled/unconfigured.
 */
export const jwtCheck = (hasAuthConfig && !AUTH_DISABLED)
  ? auth({
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseURL: ISSUER_BASE_URL,
      tokenSigningAlg: 'RS256'
    })
  : noop;

/**
 * Scope guards:
 *  - Use with routes that require write/read scopes.
 *  - Become no-ops if auth disabled/unconfigured.
 */
const reqScopes = (scopes) =>
  (hasAuthConfig && !AUTH_DISABLED) ? requiredScopes(scopes) : noop;

export const needWrite = reqScopes('write:library'); // for POST/PUT/DELETE
export const needRead  = reqScopes('read:library');  // optional for GETs

// (Optional) Export names to keep Swagger/security annotations consistent elsewhere
export const SCOPES = {
  READ: 'read:library',
  WRITE: 'write:library'
};
