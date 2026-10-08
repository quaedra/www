// Copies Nodd's models, onnxruntime files and training base model from the Nodd repository into
// public/nodd/ (not committed). Run `npm run sync-model` in ../nodd/web first so they're current.
//
//   npm run sync-nodd                       # reads ../nodd
//   NODD_REPO=/path/to/nodd npm run sync-nodd
//
// The site leaves out each model's fp32 encoder (about 70 MB, only an optional WebGPU variant).
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(process.env.NODD_REPO ?? join(root, "..", "nodd"), "web", "public");
const to = join(root, "public", "nodd");

for (const dir of ["models", "ort", "training"]) {
  if (!existsSync(join(from, dir))) {
    console.error(`No ${join(from, dir)}. Run npm run sync-model in the Nodd repository's web/ first, or set NODD_REPO.`);
    process.exit(1);
  }
  rmSync(join(to, dir), { recursive: true, force: true });
  cpSync(join(from, dir), join(to, dir), { recursive: true });
}

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
for (const file of walk(join(to, "models"))) {
  if (/\/onnx\/model\.onnx$/.test(file)) rmSync(file);
  if (file.endsWith("/nodd.json")) {
    const config = JSON.parse(readFileSync(file, "utf8"));
    if (config.onnx) delete config.onnx.fp32_file;
    writeFileSync(file, JSON.stringify(config));
  }
}
const mb = walk(to).reduce((total, f) => total + statSync(f).size, 0) / 1048576;
console.log(`public/nodd: ${mb.toFixed(0)} MiB`);
