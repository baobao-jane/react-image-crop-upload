import { useCallback, useRef, useState, type ReactNode } from "react";
import Cropper, { type ReactCropperElement } from "react-cropper";
import { cropToFile, type CropToFileResult } from "./crop-to-file";

export type AspectRatioOption = {
  label: string;
  /** Use NaN for a free-form crop box. */
  value: number;
};

export type SizeGuideInfo = {
  maxOutputSize: number;
  outputWidth?: number;
  outputHeight?: number;
  maxFileSizeBytes: number;
};

export type ImageCropperLabels = {
  cancel: ReactNode;
  confirm: ReactNode;
  processing: ReactNode;
  exceedsMaxSize: ReactNode;
  canvasUnavailable: ReactNode;
  sizeGuide: (info: SizeGuideInfo) => ReactNode;
};

export type ImageCropperProps = {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
  /** Initial aspect ratio. Defaults to 1. */
  aspectRatio?: number;
  /** Pass false to hide the ratio picker. */
  aspectRatioOptions?: readonly AspectRatioOption[] | false;
  maxOutputSize?: number;
  outputWidth?: number;
  outputHeight?: number;
  maxFileSizeBytes?: number;
  fileName?: string;
  mimeType?: string;
  cropperHeight?: number | string;
  labels?: Partial<ImageCropperLabels>;
  className?: string;
};

export const DEFAULT_ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  { label: "Free", value: Number.NaN },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${Number((bytes / 1024 / 1024).toFixed(1))}MB`
    : `${Math.round(bytes / 1024)}KB`;

export const DEFAULT_LABELS: ImageCropperLabels = {
  cancel: "Cancel",
  confirm: "Apply",
  processing: "Processing...",
  exceedsMaxSize:
    "The image is still larger than the size limit. Try a smaller crop area.",
  canvasUnavailable: "Could not read the image. Please try another file.",
  sizeGuide: ({ maxOutputSize, outputWidth, outputHeight, maxFileSizeBytes }) =>
    `${
      outputWidth && outputHeight
        ? `Output ${outputWidth}x${outputHeight}px`
        : `Up to ${maxOutputSize}px (keeps ratio)`
    } · max ${formatBytes(maxFileSizeBytes)}`,
};

const cx = (...classNames: (string | false | undefined)[]) =>
  classNames.filter(Boolean).join(" ");

export function ImageCropper({
  imageSrc,
  onCancel,
  onConfirm,
  aspectRatio = 1,
  aspectRatioOptions = DEFAULT_ASPECT_RATIO_OPTIONS,
  maxOutputSize = 1080,
  outputWidth,
  outputHeight,
  maxFileSizeBytes = 2 * 1024 * 1024,
  fileName = "cropped-image.jpg",
  mimeType = "image/jpeg",
  cropperHeight = 320,
  labels: labelOverrides,
  className,
}: ImageCropperProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const cropperRef = useRef<ReactCropperElement>(null);
  const [selectedRatio, setSelectedRatio] = useState(aspectRatio);
  const [failure, setFailure] = useState<
    Extract<CropToFileResult, { ok: false }>["reason"] | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRatioChange = (ratio: number) => {
    setSelectedRatio(ratio);
    cropperRef.current?.cropper.setAspectRatio(ratio);
  };

  const handleConfirm = useCallback(async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setIsProcessing(true);
    setFailure(null);

    try {
      const result = await cropToFile(cropper, {
        maxOutputSize,
        outputWidth,
        outputHeight,
        maxFileSizeBytes,
        fileName,
        mimeType,
      });

      if (result.ok) {
        onConfirm(result.file);
      } else {
        setFailure(result.reason);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    fileName,
    maxFileSizeBytes,
    maxOutputSize,
    mimeType,
    onConfirm,
    outputHeight,
    outputWidth,
  ]);

  return (
    <div className={cx("ricu-root", className)}>
      <p className="ricu-guide">
        {labels.sizeGuide({
          maxOutputSize,
          outputWidth,
          outputHeight,
          maxFileSizeBytes,
        })}
      </p>

      {aspectRatioOptions && aspectRatioOptions.length > 0 ? (
        <div className="ricu-ratios" role="group">
          {aspectRatioOptions.map((option) => {
            const isActive = Object.is(selectedRatio, option.value);
            return (
              <button
                key={option.label}
                type="button"
                className="ricu-ratio"
                data-active={isActive || undefined}
                aria-pressed={isActive}
                onClick={() => handleRatioChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="ricu-stage">
        <Cropper
          key={imageSrc}
          ref={cropperRef}
          src={imageSrc}
          style={{ height: cropperHeight, width: "100%" }}
          aspectRatio={selectedRatio}
          viewMode={1}
          guides
          dragMode="move"
          background={false}
          responsive
          autoCropArea={1}
          checkOrientation
        />
      </div>

      {failure ? (
        <p className="ricu-error" role="alert">
          {failure === "exceeds-max-size"
            ? labels.exceedsMaxSize
            : labels.canvasUnavailable}
        </p>
      ) : null}

      <div className="ricu-actions">
        <button
          type="button"
          className="ricu-button"
          onClick={onCancel}
          disabled={isProcessing}
        >
          {labels.cancel}
        </button>
        <button
          type="button"
          className="ricu-button ricu-button--primary"
          onClick={handleConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? labels.processing : labels.confirm}
        </button>
      </div>
    </div>
  );
}
