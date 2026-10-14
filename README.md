# react-image-crop-upload

React 이미지 크로퍼. 잘라낸 결과를 **바로 업로드할 수 있는 `File`** 로 돌려줍니다.

- 긴 변 기준 리사이즈 또는 고정 크기 출력
- 지정 용량 이하가 될 때까지 JPEG/WebP 품질을 단계적으로 낮춰 재인코딩
- 파일 선택 → 크롭 → 미리보기 흐름과 blob URL 정리를 처리하는 `useImageCropUpload` 훅
- Tailwind 등 스타일 프레임워크 의존 없음 (CSS 변수로 테마 변경)
- [cropperjs](https://github.com/fengyuanchen/cropperjs) v1 / [react-cropper](https://github.com/react-cropper/react-cropper) 기반

## 설치

```bash
npm install react-image-crop-upload
```

```ts
import "react-image-crop-upload/styles.css"; // cropperjs 기본 CSS 포함
```

## 사용법

```tsx
import { ImageCropper, useImageCropUpload } from "react-image-crop-upload";

function BannerImageField() {
  const upload = useImageCropUpload({
    maxSourceSizeBytes: 10 * 1024 * 1024,
    onReject: ({ reason }) => alert(reason),
    onCropped: (file) => console.log(file.name, file.size),
  });

  return (
    <>
      <input type="file" accept="image/*" onChange={upload.handleInputChange} />

      {upload.cropperProps ? (
        <ImageCropper
          {...upload.cropperProps}
          aspectRatio={16 / 9}
          maxOutputSize={1080}
          maxFileSizeBytes={500 * 1024}
        />
      ) : upload.previewUrl ? (
        <img src={upload.previewUrl} alt="" />
      ) : null}
    </>
  );
}
```

`upload.file`을 `FormData`에 담아 전송하면 됩니다. 수정 화면처럼 서버 이미지가 이미 있다면 `initialPreviewUrl`로 넘기거나, 데이터를 받은 뒤 `upload.setPreviewUrl(url)`을 호출하세요.

## `<ImageCropper />`

| prop | 기본값 | 설명 |
| --- | --- | --- |
| `imageSrc` | (필수) | 크롭할 이미지 URL |
| `onConfirm` | (필수) | `(file: File) => void` |
| `onCancel` | (필수) | 취소 버튼 |
| `aspectRatio` | `1` | 초기 비율. 자유 비율은 `NaN` |
| `aspectRatioOptions` | Free, 1:1, 4:3, 3:4, 16:9 | `false`면 비율 버튼 숨김 |
| `maxOutputSize` | `1080` | 출력 긴 변 최대 px |
| `outputWidth` / `outputHeight` | - | 둘 다 지정하면 고정 크기로 출력 |
| `maxFileSizeBytes` | `2MB` | 결과 파일 최대 용량 |
| `fileName` | `cropped-image.jpg` | 결과 파일 이름 |
| `mimeType` | `image/jpeg` | `image/jpeg`, `image/webp`, `image/png` |
| `cropperHeight` | `320` | 크롭 영역 높이 |
| `labels` | 영어 | 버튼·안내·오류 문구 |
| `className` | - | 루트 요소 클래스 |

### 문구 변경 예시 (한국어)

```tsx
<ImageCropper
  {...upload.cropperProps}
  aspectRatioOptions={[
    { label: "자유", value: NaN },
    { label: "1:1", value: 1 },
    { label: "16:9", value: 16 / 9 },
  ]}
  labels={{
    cancel: "취소",
    confirm: "적용",
    processing: "처리 중...",
    exceedsMaxSize: "이미지 용량이 제한을 초과했습니다. 크롭 영역을 조정해주세요.",
    canvasUnavailable: "이미지를 읽을 수 없습니다.",
    sizeGuide: ({ maxOutputSize, maxFileSizeBytes }) =>
      `최대 ${maxOutputSize}px · 최대 ${maxFileSizeBytes / 1024 / 1024}MB`,
  }}
/>
```

### 테마

`.ricu-root`의 CSS 변수를 덮어쓰면 됩니다.

```css
.ricu-root {
  --ricu-accent: #6d28d9;
  --ricu-radius: 12px;
}
```

## `useImageCropUpload(options)`

| 옵션 | 설명 |
| --- | --- |
| `maxSourceSizeBytes` | 원본 파일 용량 제한 (크로퍼를 열기 전에 거절) |
| `mimeType` | 출력 타입, 파일 확장자도 이에 맞춰 바뀜 |
| `fallbackFileName` | 원본 이름이 비었을 때 쓸 이름 |
| `initialPreviewUrl` | 기존 이미지 URL |
| `onReject` | `{ reason: "not-image" \| "exceeds-source-size", file }` |
| `onCropped` | 크롭 완료 시 호출 |

반환값: `cropperProps`, `isCropping`, `file`, `previewUrl`, `setPreviewUrl`, `selectFile`, `handleInputChange`, `cancel`, `confirm`, `reset`

훅이 직접 만든 blob URL만 해제하며, 언마운트 시 남은 URL도 모두 정리합니다.

## 저수준 유틸

React 없이 쓸 수 있는 함수도 export 합니다.

- `cropToFile(cropper, options)` → `{ ok: true, file } | { ok: false, reason }`
- `encodeWithinSize(encode, maxBytes, mimeType, options)`
- `resolveOutputSize(crop, options)`
- `toCroppedFileName(sourceName, mimeType)`

## 개발

```bash
npm install
npm run dev        # example/ 데모 (Vite)
npm test           # vitest
npm run typecheck
npm run build      # dist/ (ESM + CJS + d.ts + styles.css)
```

## License

MIT
