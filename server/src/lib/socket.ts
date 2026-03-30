import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { config } from "../config.js";

type SocketUser = {
  sub: string;
  organizationId: string;
  role: string;
};

let io: Server | null = null;

export function createSocketServer(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as SocketUser;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(`org:${user.organizationId}`);
    socket.join(`user:${user.sub}`);
  });

  return io;
}

export function getIo() {
  if (!io) {
    throw new Error("Socket server not initialized");
  }

  return io;
}
