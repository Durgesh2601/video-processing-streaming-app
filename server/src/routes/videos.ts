import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Video } from "../models/Video.js";
import { buildVideoTags, startProcessing } from "../services/processor.js";

const upload = multer({
  dest: config.uploadDir,
  limits: {
    fileSize: 500 * 1024 * 1024
  }
});

const querySchema = z.object({
  status: z.enum(["uploading", "processing", "ready", "failed"]).optional(),
  sensitivity: z.enum(["pending", "safe", "flagged"]).optional(),
  search: z.string().optional()
});

export const videosRouter = Router();

videosRouter.use(requireAuth);

videosRouter.get("/", async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const filter: Record<string, unknown> = {
      organizationId: req.user!.organizationId
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.sensitivity) {
      filter.sensitivity = query.sensitivity;
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
        { uploadedByName: { $regex: query.search, $options: "i" } }
      ];
    }

    const videos = await Video.find(filter).sort({ createdAt: -1 }).lean();
    const total = await Video.countDocuments({ organizationId: req.user!.organizationId });
    const flagged = await Video.countDocuments({
      organizationId: req.user!.organizationId,
      sensitivity: "flagged"
    });
    const processing = await Video.countDocuments({
      organizationId: req.user!.organizationId,
      status: "processing"
    });

    res.json({
      stats: { total, flagged, processing },
      items: videos.map((video) => ({
        ...video,
        id: video._id.toString(),
        streamUrl: `/api/videos/${video._id.toString()}/stream`
      }))
    });
  } catch (error) {
    next(error);
  }
});

videosRouter.get("/:id", async (req, res, next) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId
    }).lean();

    if (!video) {
      res.status(404).json({ message: "Video not found" });
      return;
    }

    res.json({
      ...video,
      id: video._id.toString(),
      streamUrl: `/api/videos/${video._id.toString()}/stream`
    });
  } catch (error) {
    next(error);
  }
});

videosRouter.post("/upload", requireRole(["admin", "editor"]), upload.single("video"), async (req, res, next) => {
  try {
    const file = req.file;
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();

    if (!file || !title || !description) {
      res.status(400).json({ message: "Title, description and video file are required" });
      return;
    }

    const video = await Video.create({
      title,
      description,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      durationSeconds: 0,
      organizationId: req.user!.organizationId,
      uploadedBy: req.user!.id,
      uploadedByName: req.user!.name,
      status: "uploading",
      sensitivity: "pending",
      progress: 5,
      tags: []
    });

    void startProcessing(video.id);

    res.status(201).json({
      id: video.id,
      title: video.title,
      status: video.status,
      sensitivity: video.sensitivity,
      progress: video.progress
    });
  } catch (error) {
    next(error);
  }
});

videosRouter.patch("/:id/sensitivity", requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = z.object({ sensitivity: z.enum(["safe", "flagged"]) }).parse(req.body);
    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { sensitivity: payload.sensitivity },
      { new: true }
    );

    if (!video) {
      res.status(404).json({ message: "Video not found" });
      return;
    }

    video.tags = buildVideoTags(payload.sensitivity, video.originalName);
    await video.save();

    res.json({
      id: video.id,
      sensitivity: video.sensitivity,
      tags: video.tags
    });
  } catch (error) {
    next(error);
  }
});

videosRouter.get("/:id/stream", async (req, res, next) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId
    });

    if (!video) {
      res.status(404).json({ message: "Video not found" });
      return;
    }

    const filePath = path.join(config.uploadDir, video.filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: "File unavailable" });
      return;
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    const contentType = video.mimeType || "video/mp4";

    if (!range) {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes"
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const [startText, endText] = range.replace(/bytes=/, "").split("-");
    const start = Number(startText);
    const end = endText ? Number(endText) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch (error) {
    next(error);
  }
});
