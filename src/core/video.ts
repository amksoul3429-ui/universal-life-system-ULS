export type VideoProvider = "YouTube" | "Vimeo";
export type VideoResource = { id: string; label: string; url: string };
export type VideoChapter = { id: string; title: string; seconds: number };
export type LearningVideo = {
  id: string; title: string; created: string; url: string; provider: VideoProvider;
  description: string; durationMinutes: number; subject: string; level: string;
  transcript: string; visualUrl: string; resources: VideoResource[]; chapters: VideoChapter[];
  courseId: string; lessonId: string; status: "Saved" | "In Progress" | "Watched";
  watchedAt?: string; notes: string; updatedAt: string;
};
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
const id = () => crypto.randomUUID();
export function parseVideoUrl(input: string): { provider: VideoProvider; embedUrl: string; canonicalUrl: string } | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      let videoId = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
      if (!videoId) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) videoId = parts[1];
      }
      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
      const start = Math.max(0, Number(url.searchParams.get("start") || url.searchParams.get("t") || 0) || 0);
      return { provider: "YouTube", embedUrl: "https://www.youtube-nocookie.com/embed/" + videoId + (start ? "?start=" + Math.floor(start) : ""), canonicalUrl: "https://www.youtube.com/watch?v=" + videoId };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = url.pathname.match(/(?:video\/)?(\d+)/);
      if (!match) return null;
      return { provider: "Vimeo", embedUrl: "https://player.vimeo.com/video/" + match[1], canonicalUrl: "https://vimeo.com/" + match[1] };
    }
    return null;
  } catch { return null; }
}
export function normalizeVideo(value: unknown): LearningVideo | null {
  if (!object(value)) return null;
  const title = text(value.title).trim();
  const idValue = text(value.id);
  const parsed = parseVideoUrl(text(value.url));
  if (!title || !idValue || !parsed) return null;
  const status = value.status === "Watched" || value.status === "In Progress" ? value.status : "Saved";
  const resources = Array.isArray(value.resources) ? value.resources.filter(object).map(r => ({
    id: text(r.id) || id(), label: text(r.label, "Resource"), url: text(r.url),
  })).filter(r => { try { return new URL(r.url).protocol === "https:"; } catch { return false; } }) : [];
  const chapters = Array.isArray(value.chapters) ? value.chapters.filter(object).map(c => ({
    id: text(c.id) || id(), title: text(c.title), seconds: Math.max(0, Math.floor(Number(c.seconds) || 0)),
  })).filter(c => c.title) : [];
  return {
    id: idValue, title, created: text(value.created), url: parsed.canonicalUrl, provider: parsed.provider,
    description: text(value.description), durationMinutes: Math.max(0, Math.floor(Number(value.durationMinutes) || 0)),
    subject: text(value.subject, "General"), level: text(value.level, "Beginner"), transcript: text(value.transcript),
    visualUrl: (() => { const s = text(value.visualUrl); try { return s && new URL(s).protocol === "https:" ? s : ""; } catch { return ""; } })(),
    resources, chapters, courseId: text(value.courseId), lessonId: text(value.lessonId), status,
    ...(typeof value.watchedAt === "string" ? { watchedAt: value.watchedAt } : {}),
    notes: text(value.notes), updatedAt: text(value.updatedAt),
  };
}
export function videoEmbedUrl(video: LearningVideo): string {
  return parseVideoUrl(video.url)?.embedUrl || "";
}
export function videoSummary(videos: LearningVideo[]) {
  return {
    total: videos.length,
    watched: videos.filter(v => v.status === "Watched").length,
    inProgress: videos.filter(v => v.status === "In Progress").length,
    minutes: videos.filter(v => v.status === "Watched").reduce((sum, v) => sum + v.durationMinutes, 0),
  };
}
export function updateVideoStatus(videos: LearningVideo[], videoId: string, status: LearningVideo["status"]): LearningVideo[] {
  return videos.map(v => v.id === videoId ? { ...v, status, watchedAt: status === "Watched" ? (v.watchedAt || new Date().toISOString()) : undefined, updatedAt: new Date().toISOString() } : v);
}
export function videoChapterTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return Math.floor(safe / 60) + ":" + String(safe % 60).padStart(2, "0");
}
