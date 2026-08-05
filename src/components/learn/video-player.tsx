import { mediaUrl } from "@/lib/media-url";
import { youtubeId, vimeoId } from "@/lib/video";

type Props = {
  videoType: "NONE" | "YOUTUBE" | "VIMEO" | "UPLOAD";
  videoUrl: string | null;
};

export function VideoPlayer({ videoType, videoUrl }: Props) {
  if (videoType === "NONE" || !videoUrl) return null;

  if (videoType === "YOUTUBE") {
    const id = youtubeId(videoUrl);
    if (!id) return null;
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
        <iframe
          className="size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title="Видео урока"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (videoType === "VIMEO") {
    const id = vimeoId(videoUrl);
    if (!id) return null;
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
        <iframe
          className="size-full"
          src={`https://player.vimeo.com/video/${id}`}
          title="Видео урока"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // UPLOAD — локальный файл
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
      <video className="size-full" src={mediaUrl(videoUrl)} controls preload="metadata" />
    </div>
  );
}
