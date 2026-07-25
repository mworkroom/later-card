import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = fileURLToPath(new URL("../dist/client/", import.meta.url));
const textExtensions = new Set([".css", ".html", ".js"]);

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTextFiles(path));
      continue;
    }

    const extension = entry.name.slice(entry.name.lastIndexOf("."));
    if (textExtensions.has(extension)) files.push(path);
  }

  return files;
}

const files = await collectTextFiles(outputDir);

for (const file of files) {
  const source = await readFile(file, "utf8");
  const rewritten = source
    .replace(/(["'`])\/assets\//g, "$1/later-card/assets/")
    .replace(/url\((["']?)\/fonts\//g, "url($1/later-card/fonts/");

  if (rewritten !== source) await writeFile(file, rewritten);
}

const remaining = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  if (
    /(["'`])\/assets\//.test(source)
    || /url\((["']?)\/fonts\//.test(source)
  ) {
    remaining.push(file);
  }
}

if (remaining.length > 0) {
  throw new Error(`Unrewritten root asset paths remain in: ${remaining.join(", ")}`);
}

console.log(`Prepared GitHub Pages paths in ${files.length} files.`);
