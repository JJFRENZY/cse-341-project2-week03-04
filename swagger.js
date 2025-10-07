// swagger.js (Library API)
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Detect Auth0 configuration (optional)
const hasAuth0 =
  !!process.env.AUTH0_DOMAIN &&
  !!process.env.AUTH0_CLIENT_ID &&
  !!process.env.AUTH0_AUDIENCE;

const domain = process.env.AUTH0_DOMAIN;

const securitySchemes = {
  // Always offer simple Bearer auth so you can paste a JWT (from Auth0 or elsewhere)
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT'
  },
  // Only include OAuth2 when Auth0 env is present (lets Swagger do full auth code + PKCE)
  ...(hasAuth0 && {
    oauth2: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: `https://${domain}/authorize`,
          tokenUrl: `https://${domain}/oauth/token`,
          scopes: {
            'read:library': 'Read library resources',
            'write:library': 'Write library resources'
          }
        }
      }
    }
  })
};

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Library API',
      version: '1.0.0',
      description: 'Books & Authors API with validation and OAuth/JWT security'
    },
    servers: [
      { url: '/', description: 'Render (relative base)' },
      { url: 'http://localhost:8080', description: 'Local dev' }
    ],
    components: {
      securitySchemes
    }
    // NOTE: No global `security` here, so public endpoints can be tested without auth.
    // Add `security` per-operation in your routes for protected endpoints, e.g.:
    // security: [{ bearerAuth: [] }]  OR  security: [{ oauth2: ['write:library'] }]
  },
  apis: ['./routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
export const serveSwagger = swaggerUi.serve;

// Swagger UI options
const uiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    // This page is served by swagger-ui-express automatically
    oauth2RedirectUrl: '/api-docs/oauth2-redirect.html'
  }
};

// Only configure OAuth client bits if Auth0 env is present
if (hasAuth0) {
  uiOptions.swaggerOptions.oauth = {
    clientId: process.env.AUTH0_CLIENT_ID,
    usePkceWithAuthorizationCodeGrant: true,
    additionalQueryStringParams: {
      audience: process.env.AUTH0_AUDIENCE
    }
  };
} else {
  console.warn(
    '[Swagger] AUTH0_* env vars not fully set; OAuth2 button will be hidden. You can still use the Bearer token option.'
  );
}

export const setupSwagger = swaggerUi.setup(swaggerSpec, uiOptions);
