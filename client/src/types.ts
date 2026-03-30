export type Role = "admin" | "editor" | "viewer";
export type VideoStatus = "uploading" | "processing" | "ready" | "failed";
export type Sensitivity = "pending" | "safe" | "flagged";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  organizationName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface VideoItem {
  id: string;
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
  tags: string[];
  createdAt: string;
  updatedAt: string;
  streamUrl: string;
}

export interface VideoListResponse {
  stats: {
    total: number;
    flagged: number;
    processing: number;
  };
  items: VideoItem[];
}

