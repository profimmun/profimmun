export type VideoType = "NONE" | "YOUTUBE" | "VIMEO" | "UPLOAD";

export function youtubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function vimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

export function validateVideoSource(type: VideoType, url: string): string | null {
  if (type === "NONE") return null;
  if (!url.trim()) {
    return type === "UPLOAD" ? "Загрузите видеофайл" : "Укажите ссылку на видео";
  }
  if (type === "YOUTUBE" && !youtubeId(url)) {
    return "Введите корректную ссылку YouTube";
  }
  if (type === "VIMEO" && !vimeoId(url)) {
    return "Введите корректную ссылку Vimeo";
  }
  return null;
}
