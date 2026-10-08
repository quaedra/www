import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { type Plugin, defaultClientConditions, defineConfig, searchForWorkspaceRoot } from "vite";

const root = import.meta.dirname;
const pagesDir = join(root, "pages");

// COOP/COEP make Nodd's pages crossOriginIsolated → multi-threaded WASM for onnxruntime-web.
// The same headers go on /nodd/* and /assets/* in production (public/_headers, worker/index.js).
const ISOLATION = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

/** Every HTML entry under pages/; its path there is its URL (pages/jet/docs/index.html → /jet/docs/). */
function entries(dir = pagesDir): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) Object.assign(out, entries(file));
    else if (name.endsWith(".html")) out[relative(pagesDir, file).replace(/\.html$/, "")] = file;
  }
  return out;
}

/** The pages/ file a clean URL is served from, as the production site does (/welp → welp.html). */
function pageFor(pathname: string): string | null {
  const path = decodeURIComponent(pathname).replace(/^\/+/, "");
  for (const candidate of path === "" || path.endsWith("/") ? [`${path}index.html`] : [`${path}.html`, `${path}/index.html`]) {
    if (existsSync(join(pagesDir, candidate))) return candidate;
  }
  return null;
}

/** Dev server: clean URLs, Nodd's isolation headers, and onnxruntime's files served raw. */
const devServer: Plugin = {
  name: "quaedra-dev-server",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const page = pageFor(url.pathname);
      // Isolate Nodd's pages and everything they load; other pages stay unisolated so
      // cross-origin fonts load without CORS.
      const isDocument = req.headers["sec-fetch-dest"] === "document";
      if (!isDocument || url.pathname.startsWith("/nodd")) for (const [k, v] of Object.entries(ISOLATION)) res.setHeader(k, v);
      if (page) req.url = `/pages/${page}${url.search}`;
      next();
    });
    // onnxruntime-web dynamically imports its .mjs loader from /nodd/ort/; serve those files
    // as they are instead of letting Vite transform them.
    server.middlewares.use("/nodd/ort", (req, res, next) => {
      const dir = join(root, "public/nodd/ort");
      const file = resolve(dir, (req.url ?? "").split("?")[0].replace(/^\//, ""));
      if (!file.startsWith(dir) || !existsSync(file)) return next();
      const type = extname(file) === ".wasm" ? "application/wasm" : "text/javascript";
      res.writeHead(200, { "Content-Type": type, ...ISOLATION });
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  plugins: [react(), devServer],
  appType: "mpa",
  // @nodd/* resolve to their TypeScript sources in ../nodd (packages/*/src), not dist/
  resolve: { conditions: ["@nodd/source", ...defaultClientConditions] },
  server: { fs: { allow: [searchForWorkspaceRoot(root), resolve(root, "../nodd")] } },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
  worker: { format: "es" },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: { input: entries() },
  },
});
