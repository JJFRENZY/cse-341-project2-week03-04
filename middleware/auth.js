// middleware/auth.js
import { auth, requiredScopes } from 'express-oauth2-jwt-bearer';

/**
 * Secure-by-default:
 * - In production, auth MUST be configured unless AUTH_DISABLE=true.
 * - In dev, you can set AUTH_DISABLE=true to bypass for local testing.
 *
 * Required env for secure mode:
 *   AUTH0_AUDIENCE            e.g. https://library-api.example.com
 *   AUTH0_ISSUER_BASE_URL     e.g. https://your-tenant.us.auth0.com
 *
 * Optional:
 *   AUTH_DISABLE=true         (bypass all auth checks; NOT for prod)
 */

const AUTH_DISABLED = String(process.env.AUTH_DISABLE || '').toLowerCase() === 'true';
const hasAuthConfig =
  !!process.env.AUTH0_AUDIENCE &&
  (!!process.env.AUTH0_ISSUER_BASE_URL || !!process.env.AUTH0_DOMAIN);

const ISSUER_BASE_URL =
  process.env.AUTH0_ISSUER_BASE_URL ||
  (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : undefined);

// Treat NODE_ENV=production as prod (Render sets this)
const PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

// Determine enforcement: in prod (and not disabled) OR properly configured
const ENFORCE = (hasAuthConfig && !AUTH_DISABLED) || (PROD && !AUTH_DISABLED);

// Boot diagnostics
const MODE = AUTH_DISABLED ? 'disabled' : (hasAuthConfig ? 'secure' : (PROD ? 'INVALID (prod missing config)' : 'unconfigured'));
console.log(`[AUTH] mode=${MODE} audience=${process.env.AUTH0_AUDIENCE || '-'} issuer=${ISSUER_BASE_URL || '-'}`);

if (PROD && !AUTH_DISABLED && !hasAuthConfig) {
  // Fail fast in production if you forgot to configure Auth0
  throw new Error('[AUTH] Missing Auth0 configuration in production. Set AUTH_DISABLE=true to bypass (NOT recommended).');
}

function noop(_req, _res, next) { next(); }

/**
 * jwtCheck:
 *  - Validates RS256 JWTs when ENFORCE=true.
 *  - No-op when auth is disabled/unconfigured (dev only).
 */
export const jwtCheck = ENFORCE
  ? auth({
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseURL: ISSUER_BASE_URL,
      tokenSigningAlg: 'RS256'
    })
  : noop;

/**
 * Scope guards:
 *  - Use with routes that require write/read scopes.
 *  - No-op if not enforcing.
 */
const reqScopes = (scopes) => (ENFORCE ? requiredScopes(scopes) : noop);

export const needWrite = reqScopes('write:library'); // POST/PUT/DELETE
export const needRead  = reqScopes('read:library');  // optional for GETs

export const SCOPES = { READ: 'read:library', WRITE: 'write:library' };
