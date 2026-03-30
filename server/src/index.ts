import fs from "node:fs";
import http from "node:http";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { connectDatabase } from "./lib/db.js";
import { createSocketServer } from "./lib/socket.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { videosRouter } from "./routes/videos.js";

dotenv.config();

async function bootstrap() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  await connectDatabase();

  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/videos", videosRouter);
  app.use(errorHandler);

  const server = http.createServer(app);
  createSocketServer(server);

  server.listen(config.port, () => {
    console.log(`Server listening on ${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
