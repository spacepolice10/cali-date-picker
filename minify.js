import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const libraryDirectory = join(projectDirectory, "lib");
const checkOnly = process.argv.includes("--check");
const internalFiles = new Set(["shared.js"]);

const sourceFiles = (await readdir(libraryDirectory))
  .filter(
    (name) =>
      name.endsWith(".js") &&
      !name.endsWith(".min.js") &&
      !internalFiles.has(name)
  )
  .sort();

const changedFiles = [];

for (const sourceFile of sourceFiles) {
  const outputFile = sourceFile.replace(/\.js$/, ".min.js");
  const outputPath = join(libraryDirectory, outputFile);
  const result = await build({
    entryPoints: [join(libraryDirectory, sourceFile)],
    outfile: outputPath,
    bundle: true,
    format: "esm",
    legalComments: "none",
    minify: true,
    platform: "browser",
    sourcemap: "linked",
    target: "es2022",
    write: false,
  });

  for (const generatedFile of result.outputFiles) {
    if (checkOnly) {
      const existing = await readFile(generatedFile.path).catch(() => undefined);
      if (!existing?.equals(generatedFile.contents)) {
        changedFiles.push(generatedFile.path);
      }
    } else {
      await writeFile(generatedFile.path, generatedFile.contents);
    }
  }
}

if (changedFiles.length) {
  console.error("Minified files are out of date:");
  for (const file of changedFiles) console.error(`- ${file}`);
  console.error("Run `npm run minify` and commit the results.");
  process.exitCode = 1;
} else {
  const action = checkOnly ? "Verified" : "Generated";
  console.log(`${action} ${sourceFiles.length} minified modules.`);
}
