// Helpers for rendering episode videos: YouTube / Vimeo get an iframe embed,
// anything else is treated as a direct video file.

export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return match ? match[1] : null;
}

export function vimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : null;
}

export function episodeEmbedUrl(videoUrl: string): string | null {
  const trimmed = videoUrl.trim();
  if (!trimmed) return null;
  const yt = youtubeId(trimmed);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vimeo = vimeoId(trimmed);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return null;
}

export function isDirectVideo(url: string): boolean {
  return episodeEmbedUrl(url) === null && /^https?:\/\//i.test(url.trim());
}
