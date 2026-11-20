export interface CompressedImageResult {
  dataUrl: string;
  mimeType: string;
  size: number;
  originalSize: number;
  wasCompressed: boolean;
}

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;
const SKIP_COMPRESSION_MAX_BYTES = 180 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("เกิดข้อผิดพลาดในการอ่านไฟล์"));
    };
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return 0;
  const base64 = dataUrl.slice(commaIdx + 1);
  return Math.floor((base64.length * 3) / 4);
}

function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("ไม่สามารถโหลดรูปภาพเพื่อประมวลผลได้"));
    img.src = objectUrl;
  });
}

/**
 * Compresses and resizes oversized raster images client-side (using WebP with JPEG fallback)
 * to reduce upload latency, token cost, and browser storage footprint.
 */
export async function compressImageFile(
  file: File,
  options?: { maxDimension?: number; quality?: number }
): Promise<CompressedImageResult> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const fallbackMime = file.type || "image/jpeg";

  if (
    file.type === "image/gif" ||
    file.type === "image/svg+xml" ||
    file.size <= SKIP_COMPRESSION_MAX_BYTES ||
    typeof document === "undefined"
  ) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      mimeType: fallbackMime,
      size: file.size,
      originalSize: file.size,
      wasCompressed: false,
    };
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadImageElement(objectUrl);

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) {
      throw new Error("ขนาดรูปภาพไม่ถูกต้อง");
    }

    const maxSide = Math.max(naturalWidth, naturalHeight);
    const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
    const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(naturalHeight * scale));
    const resized = scale < 1;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context unavailable");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    let mimeType = "image/webp";
    let compressedUrl = canvas.toDataURL("image/webp", quality);
    if (!compressedUrl.startsWith("data:image/webp")) {
      mimeType = "image/jpeg";
      compressedUrl = canvas.toDataURL("image/jpeg", quality);
    }

    const compressedSize = estimateDataUrlBytes(compressedUrl);
    if (!resized && compressedSize >= file.size) {
      const originalDataUrl = await readFileAsDataUrl(file);
      return {
        dataUrl: originalDataUrl,
        mimeType: fallbackMime,
        size: file.size,
        originalSize: file.size,
        wasCompressed: false,
      };
    }

    return {
      dataUrl: compressedUrl,
      mimeType,
      size: compressedSize,
      originalSize: file.size,
      wasCompressed: compressedSize < file.size,
    };
  } catch {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      mimeType: fallbackMime,
      size: file.size,
      originalSize: file.size,
      wasCompressed: false,
    };
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
