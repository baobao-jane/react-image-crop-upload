import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cropperCss = readFileSync(
  require.resolve("cropperjs/dist/cropper.css"),
  "utf8",
);
const ownCss = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

mkdirSync(new URL("../dist", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../dist/styles.css", import.meta.url),
  `${cropperCss}\n${ownCss}`,
);
