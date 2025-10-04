// swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const domain = process.env.AUTH0_DOMAIN; // e.g. dev-xxxx.us.auth0.com

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
    // Keep this so the Authorize button appears and is applied globally.
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
    oauth2RedirectUrl: '/api-docs/oauth2-redirect.html',
    oauth: {
      clientId: process.env.AUTH0_CLIENT_ID,
      // clientSecret is optional when using PKCE; omit if you prefer
      // clientSecret: process.env.AUTH0_CLIENT_SECRET,
      usePkceWithAuthorizationCodeGrant: true,
      scopes: ['read:library', 'write:library'],
      // ✅ CRITICAL: send your API Identifier so Auth0 issues an access token for YOUR API
      additionalQueryStringParams: {
        audience: process.env.AUTH0_AUDIENCE
      }
    }
  }
});
