// Builds the site into dist/: Vite builds every page under pages/, each Quaedra page is prerendered
// to HTML (React attaches to it in the browser), and files over the Workers asset limit are split
// for worker/index.js to reassemble. Nodd's pages render in the browser only.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { SITE, pathFor } from "./seo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

if (!existsSync(join(root, "public/nodd/models/index.json"))) {
  console.error("Nodd's models are missing from public/nodd/. Run npm run sync-nodd first.");
  process.exit(1);
}

await build({ root, logLevel: "warn" });

// Vite keeps each entry's path under pages/; the site serves them from the root.
for (const file of walk(join(dist, "pages"))) {
  const target = join(dist, relative(join(dist, "pages"), file));
  mkdirSync(dirname(target), { recursive: true });
  renameSync(file, target);
}
rmSync(join(dist, "pages"), { recursive: true });

// sitemap.xml lists every page that doesn't ask not to be indexed; robots.txt points to it.
const urls = walk(dist)
  .filter((f) => f.endsWith(".html") && !readFileSync(f, "utf8").includes('<meta name="robots" content="noindex">'))
  .map((f) => SITE + pathFor(f, dist))
  .sort();
writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// Prerender every page that names itself in <body data-page>.
const ssrDir = join(root, ".ssr");
await build({
  root,
  logLevel: "warn",
  build: { ssr: "src/prerender.tsx", outDir: ssrDir, emptyOutDir: true, rollupOptions: { input: "src/prerender.tsx" } },
});
const { render } = await import(pathToFileURL(join(ssrDir, "prerender.js")).href);
let pages = 0;
for (const file of walk(dist).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  const body = html.match(/<body data-page="([^"]+)"(?: data-doc="([^"]+)")?>/);
  if (!body) continue;
  const markup = await render(body[1], body[2]);
  writeFileSync(file, html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`));
  pages++;
}
rmSync(ssrDir, { recursive: true });
console.log(`prerendered ${pages} pages`);

// Workers assets cap files at 25 MiB: split larger ones; worker/index.js reassembles them.
const LIMIT = 24 * 1024 * 1024;
const TYPES = { ".wasm": "application/wasm", ".zip": "application/zip", ".onnx": "application/octet-stream" };
for (const file of walk(dist)) {
  const size = statSync(file).size;
  if (size <= LIMIT) continue;
  const buf = readFileSync(file);
  const parts = Math.ceil(size / LIMIT);
  for (let i = 0; i < parts; i++) writeFileSync(`${file}.part${i}`, buf.subarray(i * LIMIT, (i + 1) * LIMIT));
  writeFileSync(`${file}.parts.json`, JSON.stringify({ parts, size, type: TYPES[extname(file)] ?? "application/octet-stream" }));
  unlinkSync(file);
  console.log(`split ${relative(dist, file)} (${(size / 1048576).toFixed(1)} MiB) into ${parts} parts`);
}
const mb = walk(dist).reduce((total, f) => total + statSync(f).size, 0) / 1048576;
console.log(`dist: ${mb.toFixed(0)} MiB`);
