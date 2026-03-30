import path from "node:path";
import { getIo } from "../lib/socket.js";
import type { Sensitivity } from "../models/Video.js";
import { Video } from "../models/Video.js";

const activeJobs = new Map<string, NodeJS.Timeout>();

function deriveSensitivity(title: string, originalName: string, size: number) {
  const value = `${title} ${originalName}`.toLowerCase();
  const flaggedTerms = ["adult", "violence", "blood", "weapon", "nsfw"];

  if (flaggedTerms.some((term) => value.includes(term))) {
    return "flagged" as const;
  }

  return size % 7 === 0 ? ("flagged" as const) : ("safe" as const);
}

function deriveDuration(size: number) {
  return Math.max(30, Math.min(780, Math.round(size / 18000)));
}

export function buildVideoTags(sensitivity: Sensitivity, originalName: string) {
  return [
    sensitivity === "flagged" ? "needs-review" : "approved",
    path.extname(originalName).replace(".", "").toLowerCase() || "video"
  ];
}

export async function startProcessing(videoId: string) {
  if (activeJobs.has(videoId)) {
    return;
  }

  const video = await Video.findById(videoId);

  if (!video) {
    return;
  }

  video.status = "processing";
  video.progress = 10;
  video.durationSeconds = deriveDuration(video.size);
  await video.save();

  emitVideoUpdate(videoId);

  const steps = [24, 39, 56, 73, 88, 100];
  let index = 0;

  const timer = setInterval(async () => {
    const current = await Video.findById(videoId);

    if (!current) {
      clearInterval(timer);
      activeJobs.delete(videoId);
      return;
    }

    current.progress = steps[index];
    current.status = current.progress >= 100 ? "ready" : "processing";

    if (current.progress >= 100) {
      current.sensitivity = deriveSensitivity(current.title, current.originalName, current.size);
      current.tags = buildVideoTags(current.sensitivity, current.originalName);
    }

    await current.save();
    emitVideoUpdate(videoId);

    index += 1;

    if (index >= steps.length) {
      clearInterval(timer);
      activeJobs.delete(videoId);
    }
  }, 1300);

  activeJobs.set(videoId, timer);
}

export async function emitVideoUpdate(videoId: string) {
  const video = await Video.findById(videoId).lean();

  if (!video) {
    return;
  }

  const io = getIo();
  io.to(`org:${video.organizationId}`).emit("video:update", {
    id: video._id.toString(),
    title: video.title,
    status: video.status,
    sensitivity: video.sensitivity,
    progress: video.progress,
    updatedAt: video.updatedAt
  });
}
