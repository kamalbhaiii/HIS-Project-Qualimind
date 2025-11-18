// src/core/swagger.ts (example)
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { authPaths } from '../docs/auth.docs';
import {healthPaths} from '../docs/health.docs';
import {datasetPaths} from '../docs/dataset.docs';
import {jobPaths} from '../docs/job.docs';

const baseSpec: any = {
  openapi: '3.0.3',
  info: {
    title: 'QualiMind API',
    version: '1.0.0',
  },
  paths: {},
  components: {
    schemas: {},
  },
};

baseSpec.paths = {
  ...baseSpec.paths,
  ...authPaths,
  ...healthPaths,
  ...datasetPaths,
  ...jobPaths,
};

baseSpec.components.schemas = {
  ...baseSpec.components.schemas,
};

export function setupSwagger(app: Express) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(baseSpec));
}
