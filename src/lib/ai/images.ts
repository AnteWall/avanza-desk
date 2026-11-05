import { m } from "@/lib/i18n";

// Images pasted or dropped into the message box. Downscaled before sending: providers resize
// anything larger anyway, and big base64 strings slow the chat and bloat saved history.

/** Longest side Anthropic uses without downscaling. */
const MAX_SIDE = 1568;
export const MAX_IMAGES = 4;

export type Attachment = { mimeType: string; data: string; url: string; name: string };

const KEEP = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Reads an image file as base64 (and a preview URL), downscaled to at most MAX_SIDE. */
export async function readImage(file: File): Promise<Attachment> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // GIFs and other types become PNG; screenshots stay crisp, photos stay JPEG.
  const mimeType = KEEP.has(file.type) ? file.type : "image/png";
  const url = canvas.toDataURL(mimeType, 0.9);
  return {
    mimeType,
    data: url.slice(url.indexOf(",") + 1),
    url,
    name: file.name || m.ai.composer.pastedImage,
  };
}

/** Image files among a paste or a drop. */
export const imageFiles = (files: FileList | null | undefined) =>
  [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
