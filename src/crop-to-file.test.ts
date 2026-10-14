import { describe, expect, it, vi } from "vitest";
import {
  encodeWithinSize,
  resolveOutputSize,
  toCroppedFileName,
} from "./crop-to-file";

describe("resolveOutputSize", () => {
  it("keeps the crop size when it fits", () => {
    expect(resolveOutputSize({ width: 800, height: 600 }, { maxOutputSize: 1080 }))
      .toEqual({ width: 800, height: 600 });
  });

  it("scales down by the longest edge", () => {
    expect(resolveOutputSize({ width: 4000, height: 2000 }, { maxOutputSize: 1000 }))
      .toEqual({ width: 1000, height: 500 });
  });

  it("uses the fixed size when both dimensions are given", () => {
    expect(
      resolveOutputSize(
        { width: 4000, height: 2000 },
        { maxOutputSize: 1000, outputWidth: 300, outputHeight: 300 },
      ),
    ).toEqual({ width: 300, height: 300 });
  });

  it("never returns a zero dimension", () => {
    expect(resolveOutputSize({ width: 5000, height: 1 }, { maxOutputSize: 100 }))
      .toEqual({ width: 100, height: 1 });
  });
});

describe("encodeWithinSize", () => {
  const blobOfSize = (size: number) => new Blob([new Uint8Array(size)]);

  it("lowers quality until the blob fits", async () => {
    const encode = vi.fn(async (quality: number) => blobOfSize(quality * 1000));
    const blob = await encodeWithinSize(encode, 700, "image/jpeg");

    expect(encode.mock.calls.map(([quality]) => quality)).toEqual([
      0.92, 0.84, 0.76, 0.68,
    ]);
    expect(blob?.size).toBe(680);
  });

  it("stops at minQuality and returns null when it never fits", async () => {
    const encode = vi.fn(async (_quality: number) => blobOfSize(1000));
    const blob = await encodeWithinSize(encode, 10, "image/jpeg");

    expect(blob).toBeNull();
    expect(encode.mock.calls.map(([quality]) => quality)).toEqual([
      0.92, 0.84, 0.76, 0.68, 0.6, 0.52,
    ]);
  });

  it("tries a lossless format only once", async () => {
    const encode = vi.fn(async () => blobOfSize(1000));
    const blob = await encodeWithinSize(encode, 10, "image/png");

    expect(blob).toBeNull();
    expect(encode).toHaveBeenCalledTimes(1);
  });
});

describe("toCroppedFileName", () => {
  it("swaps the extension to match the output type", () => {
    expect(toCroppedFileName("photo.HEIC", "image/jpeg")).toBe("photo.jpg");
    expect(toCroppedFileName("my.banner.png", "image/webp")).toBe("my.banner.webp");
  });

  it("falls back when the source name is empty", () => {
    expect(toCroppedFileName("", "image/png", "banner")).toBe("banner.png");
  });
});
