import mongoose, { Schema } from "mongoose";

export type VideoStatus = "uploading" | "processing" | "ready" | "failed";
export type Sensitivity = "pending" | "safe" | "flagged";

export interface VideoDocument {
  title: string;
  description: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  durationSeconds: number;
  organizationId: string;
  uploadedBy: string;
  uploadedByName: string;
  status: VideoStatus;
  sensitivity: Sensitivity;
  progress: number;
  errorMessage?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<VideoDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    organizationId: { type: String, required: true, index: true },
    uploadedBy: { type: String, required: true },
    uploadedByName: { type: String, required: true },
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "failed"],
      default: "uploading"
    },
    sensitivity: {
      type: String,
      enum: ["pending", "safe", "flagged"],
      default: "pending"
    },
    progress: { type: Number, default: 0 },
    errorMessage: { type: String },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

videoSchema.index({ organizationId: 1, createdAt: -1 });
videoSchema.index({ organizationId: 1, sensitivity: 1, status: 1 });

export const Video = mongoose.model<VideoDocument>("Video", videoSchema);

