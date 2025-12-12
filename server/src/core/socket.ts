import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { redis } from "@loaders/redis";
import cfg from "@config/index";

interface AuthSocket extends Socket {
  data: {
    userId?: string;
  };
}

type JobUpdateEvent = {
  ownerId: string;
  jobId: string;
  datasetId: string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PENDING";
  message?: string;
};

const JOB_UPDATES_CHANNEL = "job:updates";

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  /**
   * Redis subscriber: receives worker events and forwards to sockets.
   * IMPORTANT: use duplicate() because a Redis connection in SUBSCRIBE mode
   * cannot be used for normal commands.
   */
  const sub = redis.duplicate();

  sub.subscribe(JOB_UPDATES_CHANNEL, (err) => {
    if (err) {
      // do not crash server; but log clearly
      console.error(`Redis subscribe error (${JOB_UPDATES_CHANNEL})`, err);
    } else {
      console.log(`Subscribed to Redis channel: ${JOB_UPDATES_CHANNEL}`);
    }
  });

  sub.on("message", (_channel: string, message: string) => {
    try {
      const evt = JSON.parse(message) as JobUpdateEvent;

      // Forward to the owning user's room
      io.to(`user:${evt.ownerId}`).emit("job:update", {
        jobId: evt.jobId,
        datasetId: evt.datasetId,
        status: evt.status,
        message: evt.message,
      });

      // Optional: also forward to job room if you use it on client
      io.to(`job:${evt.jobId}`).emit("job:update", {
        jobId: evt.jobId,
        datasetId: evt.datasetId,
        status: evt.status,
        message: evt.message,
      });
    } catch (e) {
      console.error("Invalid job update message from Redis", { message, error: e });
    }
  });

  // 🔐 Socket auth middleware
  io.use((socket: AuthSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("UNAUTHORIZED"));

      const payload = jwt.verify(token, cfg.security.jwtSecret!) as any;
      socket.data.userId = payload.sub;

      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    const userId = socket.data.userId!;
    socket.join(`user:${userId}`);

    socket.on("job:subscribe", ({ jobId }: { jobId: string }) => {
      socket.join(`job:${jobId}`);
    });

    socket.on("job:unsubscribe", ({ jobId }: { jobId: string }) => {
      socket.leave(`job:${jobId}`);
    });

    socket.on("disconnect", () => {
      socket.leave(`user:${userId}`);
    });
  });

  // Graceful shutdown for subscriber connection (recommended)
  const shutdown = async () => {
    try {
      await sub.quit();
    } catch (e) {
      console.error("Error closing Redis subscriber", e);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
