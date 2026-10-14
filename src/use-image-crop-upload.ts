import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toCroppedFileName } from "./crop-to-file";
import type { ImageCropperProps } from "./image-cropper";

export type ImageRejection = {
  reason: "not-image" | "exceeds-source-size";
  file: File;
};

export type UseImageCropUploadOptions = {
  /** Rejects source files larger than this before opening the cropper. */
  maxSourceSizeBytes?: number;
  /** Output type; also decides the extension of the cropped file name. */
  mimeType?: string;
  fallbackFileName?: string;
  /** Existing image URL, e.g. when editing a saved record. */
  initialPreviewUrl?: string | null;
  onReject?: (rejection: ImageRejection) => void;
  onCropped?: (file: File) => void;
};

export type ImageCropperBindings = Pick<
  ImageCropperProps,
  "imageSrc" | "onCancel" | "onConfirm" | "fileName" | "mimeType"
>;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useImageCropUpload({
  maxSourceSizeBytes,
  mimeType = "image/jpeg",
  fallbackFileName = "cropped-image",
  initialPreviewUrl = null,
  onReject,
  onCropped,
}: UseImageCropUploadOptions = {}) {
  const [sourceUrl, setSourceUrlState] = useState<string | null>(null);
  const [previewUrl, setPreviewUrlState] = useState<string | null>(
    initialPreviewUrl,
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(
    toCroppedFileName("", mimeType, fallbackFileName),
  );

  const sourceUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(initialPreviewUrl);
  const ownedUrlsRef = useRef(new Set<string>());
  const callbacksRef = useRef({ onReject, onCropped });

  useIsomorphicLayoutEffect(() => {
    callbacksRef.current = { onReject, onCropped };
  });

  const createOwnedUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    ownedUrlsRef.current.add(url);
    return url;
  }, []);

  /** Only revokes URLs this hook created, never caller-provided ones. */
  const revokeOwnedUrl = useCallback((url: string | null) => {
    if (url && ownedUrlsRef.current.delete(url)) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const replaceSourceUrl = useCallback(
    (next: string | null) => {
      revokeOwnedUrl(sourceUrlRef.current);
      sourceUrlRef.current = next;
      setSourceUrlState(next);
    },
    [revokeOwnedUrl],
  );

  const setPreviewUrl = useCallback(
    (next: string | null) => {
      if (previewUrlRef.current !== next) {
        revokeOwnedUrl(previewUrlRef.current);
      }
      previewUrlRef.current = next;
      setPreviewUrlState(next);
    },
    [revokeOwnedUrl],
  );

  const selectFile = useCallback(
    (selected: File) => {
      if (!selected.type.startsWith("image/")) {
        callbacksRef.current.onReject?.({ reason: "not-image", file: selected });
        return;
      }
      if (maxSourceSizeBytes !== undefined && selected.size > maxSourceSizeBytes) {
        callbacksRef.current.onReject?.({
          reason: "exceeds-source-size",
          file: selected,
        });
        return;
      }

      setFileName(toCroppedFileName(selected.name, mimeType, fallbackFileName));
      replaceSourceUrl(createOwnedUrl(selected));
    },
    [createOwnedUrl, fallbackFileName, maxSourceSizeBytes, mimeType, replaceSourceUrl],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0];
      // Allows picking the same file again after cancelling.
      event.target.value = "";
      if (selected) selectFile(selected);
    },
    [selectFile],
  );

  const cancel = useCallback(() => {
    replaceSourceUrl(null);
  }, [replaceSourceUrl]);

  const confirm = useCallback(
    (cropped: File) => {
      setFile(cropped);
      setPreviewUrl(createOwnedUrl(cropped));
      replaceSourceUrl(null);
      callbacksRef.current.onCropped?.(cropped);
    },
    [createOwnedUrl, replaceSourceUrl, setPreviewUrl],
  );

  const reset = useCallback(() => {
    replaceSourceUrl(null);
    setPreviewUrl(null);
    setFile(null);
  }, [replaceSourceUrl, setPreviewUrl]);

  useEffect(() => {
    const ownedUrls = ownedUrlsRef.current;
    return () => {
      ownedUrls.forEach((url) => URL.revokeObjectURL(url));
      ownedUrls.clear();
    };
  }, []);

  const cropperProps: ImageCropperBindings | null = sourceUrl
    ? {
        imageSrc: sourceUrl,
        onCancel: cancel,
        onConfirm: confirm,
        fileName,
        mimeType,
      }
    : null;

  return {
    /** Spread into <ImageCropper /> while non-null. */
    cropperProps,
    isCropping: sourceUrl !== null,
    file,
    previewUrl,
    setPreviewUrl,
    selectFile,
    handleInputChange,
    cancel,
    confirm,
    reset,
  };
}
