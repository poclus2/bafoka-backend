import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { config } from './config/config.js';
import { swaggerSpec } from './config/swagger.js';

// Création de l'application Express
const app = express();

// Middlewares de sécurité (avec exception pour Swagger UI)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https://validator.swagger.io"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors({
  origin: config.nodeEnv === 'development' ? '*' : process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Token Gated DAO API Docs',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true
  }
}));

// Endpoint pour récupérer le spec JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes de l'API
app.use('/api', routes);

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Token Gated DAO Backend API',
    version: '1.0.0',
    documentation: {
      swagger: '/api-docs',
      json: '/api-docs.json',
      endpoints: '/api'
    }
  });
});

// Gestion des erreurs
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
