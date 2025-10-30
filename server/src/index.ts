import { createApp } from './server';
import cfg from '@config/index';
import { logger } from '@core/logger';

const app = createApp();
app.listen(cfg.app.port, () => {
  logger.info(`API running on port ${cfg.app.port} (env=${cfg.app.env})`);
  logger.info(`Swagger docs at /docs`);
});
