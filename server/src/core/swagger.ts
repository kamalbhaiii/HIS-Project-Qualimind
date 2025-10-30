import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

export function setupSwagger(app: Express) {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: { title: 'QualiMind API', version: '1.0.0' },
    },
    apis: ['src/routes/**/*.ts'], // scans JSDoc in routes
  };

  const spec = swaggerJsdoc(options);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
