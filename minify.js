import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

await build({
  absWorkingDir: dirname(fileURLToPath(import.meta.url)),
  entryPoints: ["calendar.js"],
  outfile: "calendar.min.js",
  format: "esm",
  legalComments: "none",
  minify: true,
  platform: "browser",
  sourcemap: true,
  target: "es2022",
});
