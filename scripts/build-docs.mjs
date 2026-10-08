// Builds each project's documentation pages from the Markdown in its repository: the rendered
// body and menu as src/docs/<project>/<page>.json (drawn by src/pages/Doc.tsx) and the page's
// HTML entry with its meta tags as pages/<project>/docs/<page>.html. Images go to public/.
//
//   npm run docs                      # reads ../jet and ../megacode
//   npm run docs -- megacode          # one project
//   JET_REPO=/path/to/jet MEGACODE_REPO=/path/to/megacode npm run docs
//
// The generated pages are committed, so deploying the site doesn't need the repositories.
// Links to the pages built here stay on quaedra.com; links to other files in a repository
// (experiment reports, release files) go to GitHub; images are copied in.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Each project: repository file → page. Page order is the docs navigation; `nav: false` pages are
 * built and linked from the others but left out of the menu. `links` follow the pages in the menu.
 */
const projects = [
  {
    id: "jet",
    name: "Jet",
    github: "https://github.com/quaedra/jet",
    links: [["Weights", "https://huggingface.co/quaedra/jet"]],
    pages: [
      { source: "README.md", slug: "", title: "Docs", description: "Jet's prompt format, local runtime, training pipeline and project layout." },
      { source: "docs/decision-index.md", slug: "decision-index", title: "Decision Index", description: "Jet-4B's official Decision Index 0.3 result and how to run the benchmark yourself." },
      { source: "TRAINING_HISTORY.md", slug: "training-history", title: "Training history", description: "Every Jet release, from the first 0.6B runs to Jet-4B v6.2." },
    ],
  },
  {
    id: "megacode",
    name: "megacode",
    github: "https://github.com/quaedra/megacode",
    links: [["npm", "https://www.npmjs.com/package/@megacode/cli"]],
    pages: [
      { source: "README.md", slug: "", title: "Docs", description: "Installing and using megacode: providers, the interactive UI, settings, skills, MCP servers, sessions, worktrees and tools." },
      { source: "bench/README.md", slug: "benchmark", title: "Benchmark", description: "megacode's harness benchmark: three fixed coding tasks, independent grading, and how to compare other harnesses on them." },
      { source: "bench/gateway-comparison.md", slug: "gateway-comparison", title: "Same-model comparison", nav: false, description: "megacode and Claude Code on the same model, GPT-6 Astra, through one gateway: 30 attempts, five repeats per task." },
      { source: "bench/effort-comparison.md", slug: "effort-comparison", title: "Effort comparison", nav: false, description: "megacode at medium and low reasoning effort on the harness benchmark: 30 attempts, five repeats per task." },
    ],
  },
];

const only = process.argv[2];
if (only && !projects.some((project) => project.id === only)) {
  console.error(`Unknown project ${only}. Projects: ${projects.map((project) => project.id).join(", ")}.`);
  process.exit(1);
}
for (const project of projects) {
  if (!only || project.id === only) build(project);
}

function build(project) {
  const repo = process.env[`${project.id.toUpperCase()}_REPO`] ?? join(root, "..", project.id);
  const dataDir = join(root, "src", "docs", project.id);
  const htmlDir = join(root, "pages", project.id, "docs");
  const assetDir = join(root, "public", project.id, "docs", "assets");
  const pageBySource = new Map(project.pages.map((page) => [page.source, page]));
  const url = (page) => `/${project.id}/docs/${page.slug}`;

  if (!existsSync(join(repo, "README.md"))) {
    console.error(`No ${project.name} repository at ${repo}. Set ${project.id.toUpperCase()}_REPO.`);
    process.exit(1);
  }
  for (const dir of [dataDir, htmlDir, assetDir]) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(htmlDir, { recursive: true });

  for (const page of project.pages) {
    const markdown = readFileSync(join(repo, page.source), "utf8");
    const sourceDir = posix.dirname(page.source);
    let usesMermaid = false;

    const marked = new Marked({
      gfm: true,
      renderer: {
        code({ text, lang }) {
          if (lang === "mermaid") {
            usesMermaid = true;
            return `<pre class="mermaid">${escape(text)}</pre>\n`;
          }
          return `<pre><code>${escape(text)}</code></pre>\n`;
        },
        // GitHub's heading anchors, so links into a section work the same here.
        heading({ tokens, depth }) {
          const text = this.parser.parseInline(tokens);
          const slug = text.replace(/<[^>]+>/g, "").replace(/&[a-z]+;|&#\d+;/g, "").toLowerCase().trim()
            .replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
          return `<h${depth} id="${slug}">${text}</h${depth}>\n`;
        },
        table(token) {
          return this.constructor.prototype.table.call(this, token).replace("<table>", '<table class="data">');
        },
      },
      walkTokens(token) {
        if (token.type === "link") token.href = rewriteLink(token.href, sourceDir);
        if (token.type === "image") token.href = copyImage(token.href, sourceDir);
      },
    });

    // The page title comes from the template, not the document's own H1, and the site menu replaces
    // the README's row of links (Website · Docs · …).
    const body = marked.parse(markdown.replace(/^# .*\n+/, "").replace(/^\[Website\]\([^\n]*(?:\n\[[^\n]*)*\n+/m, ""));
    const name = page.slug || "index";
    writeFileSync(join(dataDir, `${name}.json`), JSON.stringify(data(project, page, body, usesMermaid, url), null, 2) + "\n");
    writeFileSync(join(htmlDir, `${name}.html`), entry(project, page, url));
    console.log(`${project.id}/${page.source} → ${url(page)}`);
  }

  /** Links to built pages stay here; other repository paths go to GitHub. */
  function rewriteLink(href, sourceDir) {
    if (/^([a-z]+:|#|\/)/i.test(href)) return href;
    const [path, hash = ""] = href.split("#");
    const resolved = normalize(posix.join(sourceDir, path)).replace(/\\/g, "/").replace(/^\.\//, "");
    const page = pageBySource.get(resolved);
    if (page) return url(page) + (hash ? `#${hash}` : "");
    const kind = path.endsWith("/") || !posix.extname(resolved) ? "tree" : "blob";
    return `${project.github}/${kind}/main/${resolved}${hash ? `#${hash}` : ""}`;
  }

  function copyImage(href, sourceDir) {
    if (/^[a-z]+:/i.test(href)) return href;
    const resolved = normalize(posix.join(sourceDir, href));
    const name = resolved.replace(/[\\/]/g, "-");
    mkdirSync(assetDir, { recursive: true });
    copyFileSync(join(repo, resolved), join(assetDir, name));
    return `/${project.id}/docs/assets/${name}`;
  }
}

function escape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** What src/pages/Doc.tsx draws: the project menu, the page title and the rendered body. */
function data(project, page, body, usesMermaid, url) {
  return {
    project: project.name,
    title: page.title,
    // The project's submenu, the same as on its overview page.
    menu: [
      ["Overview", `/${project.id}`],
      ...project.pages.filter((other) => other.nav !== false || other === page)
        .map((other) => (other === page ? [other.title, url(other), true] : [other.title, url(other)])),
      ["GitHub", project.github],
      ...project.links,
    ],
    source: `${project.github}/blob/main/${page.source}`,
    mermaid: usesMermaid,
    html: body,
  };
}

/** The page's HTML entry: meta tags for search and link previews, then the app. */
function entry(project, page, url) {
  const title = `${page.title} · ${project.name}`;
  const name = page.slug || "index";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · Quaedra Research</title>
  <meta name="description" content="${page.description}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Quaedra Research">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:url" content="https://quaedra.com${url(page)}">
  <meta property="og:image" content="https://quaedra.com/og/${project.id}.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${project.name} by Quaedra Research">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/styles/site.css">
</head>
<!-- Generated by scripts/build-docs.mjs from ${project.github}/blob/main/${page.source}. Edit the source, then run npm run docs. -->
<body data-page="doc" data-doc="${project.id}/${name}">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`;
}
