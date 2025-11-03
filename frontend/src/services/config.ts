import dev from '../config/development.json';
import test from '../config/testing.json';
import predep from '../config/predeployment.json';
import deployment from '../config/deployment.json';

type AppConfig = typeof dev;

const byMode: Record<string, AppConfig> = {
  development: dev,
  testing: test,
  predeployment: predep,
  deployment: deployment
};

const cfg = byMode[import.meta.env.MODE] ?? dev;

export const API_BASE_URL = cfg.apiBaseUrl;
export const features = cfg.featureFlags;
export const SERVER_TIMEOUT = cfg.serverTimeout;
