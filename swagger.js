// swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Use a safe fallback so the Authorize button renders even if env isn't set yet
const domain = process.env.AUTH0_DOMAIN || 'YOUR_DOMAIN.auth0.com';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Library API',
      version: '1.0.0',
      description: 'OAuth2-protected CRUD API for books and authors'
    },
    servers: [
      { url: '/', description: 'Render (relative base)' },
      { url: 'http://localhost:8080', description: 'Local dev' }
    ],
    components: {
      securitySchemes: {
        oauth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: `https://${domain}/authorize`,
              tokenUrl: `https://${domain}/oauth/token`,
              scopes: {
                'read:library': 'Read access to library resources',
                'write:library': 'Write access to library resources'
              }
            }
          }
        }
      }
    },
    // Global security requirement ensures the Authorize button shows
    security: [{ oauth2: [] }]
  },
  apis: ['./routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
export const serveSwagger = swaggerUi.serve;
export const setupSwagger = swaggerUi.setup(swaggerSpec, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    // Works on both localhost and Render (relative path)
    oauth2RedirectUrl: '/api-docs/oauth2-redirect.html',
    oauth: {
      clientId: process.env.AUTH0_CLIENT_ID || 'YOUR_CLIENT_ID',
      // clientSecret optional with PKCE; keep if you use it
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      usePkceWithAuthorizationCodeGrant: true,
      scopes: ['read:library', 'write:library'],
      // If your Auth0 API requires an audience param on authorize:
      // additionalQueryStringParams: { audience: process.env.AUTH0_AUDIENCE }
    }
  }
});
