import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL, api } from "../api";
import { useAuth } from "../context/AuthContext";
import type { Sensitivity, VideoItem, VideoListResponse, VideoStatus } from "../types";

type Filters = {
  search: string;
  status: "" | VideoStatus;
  sensitivity: "" | Sensitivity;
};

const initialFilters: Filters = {
  search: "",
  status: "",
  sensitivity: ""
};

function formatBytes(value: number) {
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size > 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size > 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Processing...";
  }

  const rounded = Math.round(value);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function DashboardPage() {
  const { logout, token, user } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, flagged: 0, processing: 0 });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    file: null as File | null
  });

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedId) ?? videos[0] ?? null,
    [selectedId, videos]
  );

  const visibleDuration = mediaDuration && mediaDuration > 0 ? mediaDuration : selectedVideo?.durationSeconds ?? 0;

  async function loadVideos(options?: { background?: boolean }) {
    const isBackground = options?.background ?? false;

    if (isInitialLoading && !isBackground) {
      setIsInitialLoading(true);
    } else if (isBackground) {
      setIsRefreshing(true);
    }

    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );
      const response = await api.get<VideoListResponse>("/api/videos", { params });
      setVideos(response.data.items);
      setStats(response.data.stats);
      setSelectedId((current) => {
        if (!response.data.items.length) {
          return null;
        }

        if (current && response.data.items.some((video) => video.id === current)) {
          return current;
        }

        return response.data.items[0]?.id ?? null;
      });
      setError(null);
    } catch {
      setError("Unable to load the dashboard right now.");
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadVideos();
  }, [filters.search, filters.sensitivity, filters.status]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = io(API_BASE_URL, {
      auth: { token }
    });

    socket.on("video:update", () => {
      void loadVideos({ background: true });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, filters.search, filters.sensitivity, filters.status]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadData.file) {
      setError("Select a video file before uploading.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", uploadData.title);
      formData.append("description", uploadData.description);
      formData.append("video", uploadData.file);
      await api.post("/api/videos/upload", formData);
      setUploadData({ title: "", description: "", file: null });
      await loadVideos();
    } catch {
      setError("Upload failed. Please check your file and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function overrideSensitivity(videoId: string, sensitivity: "safe" | "flagged") {
    try {
      await api.patch(`/api/videos/${videoId}/sensitivity`, { sensitivity });
      await loadVideos();
    } catch {
      setError("Unable to update the sensitivity status.");
    }
  }

  useEffect(() => {
    setMediaDuration(null);
  }, [selectedVideo?.id]);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <div className="eyebrow">Workspace</div>
          <h2>{user?.organizationName}</h2>
          <p className="sidebar-copy">
            Process uploads, monitor safety decisions, and stream approved assets across the tenant.
          </p>
        </div>

        <div className="user-badge">
          <strong>{user?.name}</strong>
          <span>
            {user?.role} · {user?.email}
          </span>
        </div>

        <div className="stats-stack">
          <div className="stat-card">
            <span>Total library</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <span>Flagged assets</span>
            <strong>{stats.flagged}</strong>
          </div>
          <div className="stat-card">
            <span>Running jobs</span>
            <strong>{stats.processing}</strong>
          </div>
        </div>

        <button className="ghost-button" onClick={logout} type="button">
          Sign out
        </button>
      </aside>

      <main className="dashboard-main">
        <section className="toolbar">
          <div>
            <div className="eyebrow">Operations board</div>
            <h1>Video processing and review</h1>
          </div>
          <div className="filters">
            <input
              placeholder="Search title, description, uploader"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value as Filters["status"] }))
              }
            >
              <option value="">All statuses</option>
              <option value="uploading">Uploading</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filters.sensitivity}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sensitivity: event.target.value as Filters["sensitivity"]
                }))
              }
            >
              <option value="">All sensitivity</option>
              <option value="pending">Pending</option>
              <option value="safe">Safe</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </section>

        {(user?.role === "admin" || user?.role === "editor") && (
          <section className="panel upload-panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Upload queue</div>
                <h3>Add a new video</h3>
              </div>
              <span className="muted">Accepted up to 500 MB</span>
            </div>

            <form className="upload-form" onSubmit={handleUpload}>
              <input
                placeholder="Video title"
                value={uploadData.title}
                onChange={(event) => setUploadData((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <input
                placeholder="Description"
                value={uploadData.description}
                onChange={(event) =>
                  setUploadData((current) => ({ ...current, description: event.target.value }))
                }
                required
              />
              <input
                type="file"
                accept="video/*"
                onChange={(event) =>
                  setUploadData((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                }
                required
              />
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? "Uploading..." : "Upload and process"}
              </button>
            </form>
          </section>
        )}

        {error ? <div className="panel form-error">{error}</div> : null}

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Library</div>
                <h3>Tenant video inventory</h3>
              </div>
              <span className="muted">{videos.length} results</span>
            </div>

            <div className="video-list">
              {isInitialLoading ? (
                <div className="empty-state">Loading workspace...</div>
              ) : videos.length === 0 ? (
                <div className="empty-state">No videos match the current filters.</div>
              ) : (
                videos.map((video) => (
                  <button
                    className={`video-row ${selectedVideo?.id === video.id ? "selected" : ""}`}
                    key={video.id}
                    onClick={() => setSelectedId(video.id)}
                    type="button"
                  >
                    <div className="video-row-main">
                      <strong>{video.title}</strong>
                      <span>{video.description}</span>
                    </div>
                    <div className="video-row-meta">
                      <span className={`badge status-${video.status}`}>{video.status}</span>
                      <span className={`badge sensitivity-${video.sensitivity}`}>{video.sensitivity}</span>
                      <span>{video.progress}%</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            {isRefreshing && videos.length > 0 ? <div className="muted">Refreshing updates...</div> : null}
          </div>

          <div className="panel player-panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Preview</div>
                <h3>{selectedVideo?.title ?? "Select a video"}</h3>
              </div>
              {selectedVideo ? <span className="muted">{formatDate(selectedVideo.createdAt)}</span> : null}
            </div>

            {selectedVideo ? (
              <>
                <video
                  className="video-player"
                  controls
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;
                    setMediaDuration(Number.isFinite(duration) ? duration : null);
                  }}
                  src={`${API_BASE_URL}${selectedVideo.streamUrl}?token=${token}`}
                />
                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Uploader</span>
                    <strong>{selectedVideo.uploadedByName}</strong>
                  </div>
                  <div>
                    <span className="detail-label">File size</span>
                    <strong>{formatBytes(selectedVideo.size)}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Duration</span>
                    <strong>{formatDuration(visibleDuration)}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Progress</span>
                    <strong>{selectedVideo.progress}%</strong>
                  </div>
                </div>
                <p className="description-copy">{selectedVideo.description}</p>
                <div className="preview-footer">
                  <div className="tag-panel">
                    <span className="detail-label">Tags</span>
                    <div className="tag-row">
                      {selectedVideo.tags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {user?.role === "admin" ? (
                    <div className="actions-panel">
                      <span className="detail-label">Review actions</span>
                      <div className="review-actions">
                        <button type="button" onClick={() => overrideSensitivity(selectedVideo.id, "safe")}>
                          Mark safe
                        </button>
                        <button type="button" onClick={() => overrideSensitivity(selectedVideo.id, "flagged")}>
                          Flag content
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="empty-state">Choose a video from the library to preview it here.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
