import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from '@routes/index';
import { notFound } from '@middlewares/notFound';
import { errorHandler } from '@middlewares/errorHandler';
import { setupSwagger } from '@core/swagger';
import cfg from '@config/index';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.use(
    rateLimit({
      windowMs: cfg.rateLimit.windowMs,
      max: cfg.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  setupSwagger(app);
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
