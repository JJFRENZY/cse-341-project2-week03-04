// swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const domain = process.env.AUTH0_DOMAIN || 'YOUR_DOMAIN.auth0.com'; // fallback so the button still shows

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
    }
    // Optional default to mark all ops as requiring auth:
    // ,security: [{ oauth2: ['read:library'] }]
  },
  apis: ['./routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
export const serveSwagger = swaggerUi.serve;
export const setupSwagger = swaggerUi.setup(swaggerSpec, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    oauth2RedirectUrl:
      process.env.SWAGGER_OAUTH2_REDIRECT_URL ||
      'http://localhost:8080/api-docs/oauth2-redirect.html',
    oauth: {
      clientId: process.env.AUTH0_CLIENT_ID || 'YOUR_CLIENT_ID',
      clientSecret: process.env.AUTH0_CLIENT_SECRET, // optional for auth code + PKCE
      usePkceWithAuthorizationCodeGrant: true,
      scopes: ['read:library', 'write:library']
      // If you need Auth0 audience in the authorize URL:
      // additionalQueryStringParams: { audience: process.env.AUTH0_AUDIENCE }
    }
  }
});
