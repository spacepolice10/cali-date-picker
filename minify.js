import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";

const dir = dirname(fileURLToPath(import.meta.url));
const src = await readFile(join(dir, "calendar.js"), "utf8");
const result = await minify(src, {
  module: true,
  ecma: 2022,
  compress: {
    passes: 3,
    pure_getters: true,
    toplevel: true,
  },
  mangle: { toplevel: true },
  format: {
    comments: false,
    wrap_func_args: false,
    ecma: 2022,
  },
  sourceMap: {
    filename: "calendar.min.js",
    url: "calendar.min.js.map",
  },
});

if (!result.code) throw new Error("terser produced no output");

await writeFile(join(dir, "calendar.min.js"), result.code);
await writeFile(join(dir, "calendar.min.js.map"), result.map);
