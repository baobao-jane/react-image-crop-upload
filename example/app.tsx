import { useState } from "react";
import { ImageCropper, useImageCropUpload } from "../src";

const MIME_TYPES = ["image/jpeg", "image/webp", "image/png"] as const;
const MAX_FILE_SIZE_OPTIONS = [200 * 1024, 500 * 1024, 2 * 1024 * 1024];

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)}MB`
    : `${(bytes / 1024).toFixed(1)}KB`;

export function App() {
  const [mimeType, setMimeType] = useState<(typeof MIME_TYPES)[number]>("image/jpeg");
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState(MAX_FILE_SIZE_OPTIONS[1]);
  const [maxOutputSize, setMaxOutputSize] = useState(1080);
  const [rejection, setRejection] = useState("");
  const [dimensions, setDimensions] = useState("");

  const upload = useImageCropUpload({
    mimeType,
    maxSourceSizeBytes: 20 * 1024 * 1024,
    onReject: ({ reason, file }) =>
      setRejection(
        reason === "not-image"
          ? `${file.name} is not an image.`
          : `${file.name} is larger than 20MB.`,
      ),
    onCropped: () => setRejection(""),
  });

  return (
    <main className="demo">
      <h1>react-image-crop-upload</h1>
      <p className="demo-lead">
        Pick an image, crop it, and get a resized File that fits the size limit.
      </p>

      <section className="demo-controls">
        <label>
          Output type
          <select
            value={mimeType}
            onChange={(event) =>
              setMimeType(event.target.value as (typeof MIME_TYPES)[number])
            }
          >
            {MIME_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Max file size
          <select
            value={maxFileSizeBytes}
            onChange={(event) => setMaxFileSizeBytes(Number(event.target.value))}
          >
            {MAX_FILE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {formatBytes(size)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Max edge (px)
          <input
            type="number"
            min={100}
            step={100}
            value={maxOutputSize}
            onChange={(event) => setMaxOutputSize(Number(event.target.value) || 1080)}
          />
        </label>
      </section>

      <input type="file" accept="image/*" onChange={upload.handleInputChange} />
      {rejection ? <p className="demo-error">{rejection}</p> : null}

      {upload.cropperProps ? (
        <ImageCropper
          {...upload.cropperProps}
          maxFileSizeBytes={maxFileSizeBytes}
          maxOutputSize={maxOutputSize}
        />
      ) : upload.previewUrl ? (
        <figure className="demo-result">
          <img
            src={upload.previewUrl}
            alt="Cropped result"
            onLoad={(event) =>
              setDimensions(
                `${event.currentTarget.naturalWidth}x${event.currentTarget.naturalHeight}px`,
              )
            }
          />
          {upload.file ? (
            <figcaption>
              {upload.file.name} · {upload.file.type} · {formatBytes(upload.file.size)}
              {dimensions ? ` · ${dimensions}` : ""}
            </figcaption>
          ) : null}
          <button type="button" className="demo-button" onClick={upload.reset}>
            Clear
          </button>
        </figure>
      ) : null}
    </main>
  );
}
