import { episodeEmbedUrl, isDirectVideo } from "@/lib/episode-video";

export function EpisodePlayer({ videoUrl, title, className }: { videoUrl: string; title: string; className?: string }) {
  const frame = className ?? "aspect-video w-full";
  const embed = episodeEmbedUrl(videoUrl);
  if (embed) {
    return <iframe src={embed} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className={`${frame} border-0`} />;
  }
  if (isDirectVideo(videoUrl)) {
    return <video src={videoUrl} controls preload="metadata" className={`${frame} bg-black`} />;
  }
  return <a href={videoUrl} target="_blank" rel="noreferrer" className={`grid ${frame} place-items-center bg-black/30 text-sm font-semibold text-emerald-200/70`}>Open video ↗</a>;
}

export function formatDuration(totalSeconds: number | null): string | null {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
