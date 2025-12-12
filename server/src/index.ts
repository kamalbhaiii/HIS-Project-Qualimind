import http from "http";
import { createApp } from "./server";
import cfg from "@config/index";
import { logger } from "@core/logger";
import { initSocket } from "@core/socket";

const app = createApp();

// Create HTTP server explicitly
const server = http.createServer(app);

// Attach socket.io to HTTP server
initSocket(server);

server.listen(cfg.app.port, () => {
  logger.info(`API running on port ${cfg.app.port} (env=${cfg.app.env})`);
  logger.info(`Swagger docs at /docs`);
});
