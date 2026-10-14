import type Cropper from "cropperjs";

export type Size = { width: number; height: number };

export type OutputSizeOptions = {
  /** Longest edge of the output image. Ignored when both outputWidth and outputHeight are set. */
  maxOutputSize: number;
  /** Fixed output size. Both must be set to take effect; the crop is stretched to fit. */
  outputWidth?: number;
  outputHeight?: number;
};

export type EncodeOptions = {
  initialQuality?: number;
  minQuality?: number;
  qualityStep?: number;
};

export type CropToFileOptions = OutputSizeOptions &
  EncodeOptions & {
    maxFileSizeBytes: number;
    fileName: string;
    mimeType: string;
  };

export type CropToFileResult =
  | { ok: true; file: File }
  | { ok: false; reason: "canvas-unavailable" | "exceeds-max-size" };

const LOSSY_MIME_TYPES = new Set(["image/jpeg", "image/webp"]);

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function resolveOutputSize(
  crop: Size,
  { maxOutputSize, outputWidth, outputHeight }: OutputSizeOptions,
): Size {
  if (outputWidth && outputHeight) {
    return { width: outputWidth, height: outputHeight };
  }

  const width = Math.max(1, Math.round(crop.width));
  const height = Math.max(1, Math.round(crop.height));
  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxOutputSize) {
    return { width, height };
  }

  const scale = maxOutputSize / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Re-encodes with decreasing quality until the blob fits in maxBytes.
 * Quality is only stepped for lossy formats; PNG gets a single attempt.
 */
export async function encodeWithinSize(
  encode: (quality: number) => Promise<Blob | null>,
  maxBytes: number,
  mimeType: string,
  {
    initialQuality = 0.92,
    minQuality = 0.5,
    qualityStep = 0.08,
  }: EncodeOptions = {},
): Promise<Blob | null> {
  if (!LOSSY_MIME_TYPES.has(mimeType)) {
    const blob = await encode(initialQuality);
    return blob && blob.size <= maxBytes ? blob : null;
  }

  // Integer steps avoid floating point drift (0.92 - 0.08 * 5 !== 0.52).
  const attempts =
    Math.floor((initialQuality - minQuality) / qualityStep + 1e-9) + 1;

  for (let i = 0; i < attempts; i++) {
    const quality = Number((initialQuality - qualityStep * i).toFixed(4));
    const blob = await encode(quality);
    if (!blob) return null;
    if (blob.size <= maxBytes) return blob;
  }

  return null;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

export function toCroppedFileName(
  sourceName: string,
  mimeType: string,
  fallbackBaseName = "cropped-image",
): string {
  const baseName = sourceName.replace(/\.[^.]+$/, "") || fallbackBaseName;
  const extension = MIME_EXTENSIONS[mimeType] ?? "img";
  return `${baseName}.${extension}`;
}

export async function cropToFile(
  cropper: Cropper,
  {
    maxOutputSize,
    outputWidth,
    outputHeight,
    maxFileSizeBytes,
    fileName,
    mimeType,
    ...encodeOptions
  }: CropToFileOptions,
): Promise<CropToFileResult> {
  const { width, height } = resolveOutputSize(cropper.getData(true), {
    maxOutputSize,
    outputWidth,
    outputHeight,
  });

  const canvas = cropper.getCroppedCanvas({
    width,
    height,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });

  if (!canvas) return { ok: false, reason: "canvas-unavailable" };

  const blob = await encodeWithinSize(
    (quality) => canvasToBlob(canvas, mimeType, quality),
    maxFileSizeBytes,
    mimeType,
    encodeOptions,
  );

  if (!blob) return { ok: false, reason: "exceeds-max-size" };

  return { ok: true, file: new File([blob], fileName, { type: mimeType }) };
}
