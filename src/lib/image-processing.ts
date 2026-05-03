const FULL_MAX_DIM = 1600;
const THUMB_MAX_DIM = 600;
const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.72;

export interface ProcessedImage {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const ratio = longest > maxDim ? maxDim / longest : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Image encoding failed"));
      },
      type,
      quality,
    );
  });
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const fullCanvas = drawScaled(img, FULL_MAX_DIM);
  const thumbCanvas = drawScaled(img, THUMB_MAX_DIM);
  const [full, thumb] = await Promise.all([
    canvasToBlob(fullCanvas, "image/webp", FULL_QUALITY),
    canvasToBlob(thumbCanvas, "image/webp", THUMB_QUALITY),
  ]);
  return {
    full,
    thumb,
    width: fullCanvas.width,
    height: fullCanvas.height,
  };
}
