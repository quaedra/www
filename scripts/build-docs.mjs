// Builds each project's documentation pages (public/<project>/docs/) from the Markdown in its
// repository, in the site's own style.
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
  const out = join(root, "public", project.id, "docs");
  const pageBySource = new Map(project.pages.map((page) => [page.source, page]));
  const url = (page) => `/${project.id}/docs/${page.slug}`;

  if (!existsSync(join(repo, "README.md"))) {
    console.error(`No ${project.name} repository at ${repo}. Set ${project.id.toUpperCase()}_REPO.`);
    process.exit(1);
  }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "assets"), { recursive: true });

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
    writeFileSync(join(out, page.slug ? `${page.slug}.html` : "index.html"), render(project, page, body, usesMermaid, url));
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
    copyFileSync(join(repo, resolved), join(out, "assets", name));
    return `/${project.id}/docs/assets/${name}`;
  }
}

function escape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(project, page, body, usesMermaid, url) {
  // The project's submenu, the same as on its overview page.
  const nav = [
    `<a href="/${project.id}">Overview</a>`,
    ...project.pages.filter((other) => other.nav !== false || other === page).map((other) => other === page
      ? `<a href="${url(other)}" aria-current="page">${other.title}</a>`
      : `<a href="${url(other)}">${other.title}</a>`),
    `<a href="${project.github}">GitHub</a>`,
    ...project.links.map(([label, href]) => `<a href="${href}">${label}</a>`),
  ].join("\n        ");
  const title = `${page.title} · ${project.name}`;
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
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <!-- Generated by scripts/build-docs.mjs from ${project.github}/blob/main/${page.source}. Edit the source, then run npm run docs. -->
  <div class="wrap page">
    <header>
      <a class="crumb mono" href="/"><svg class="glyph" viewBox="136 112 242 208" aria-hidden="true"><path fill="currentColor" transform="translate(91.1667 386.1667) scale(0.64 -0.64)" d="M74 422H134Q143 264 252 264Q362 264 381 422H441Q428 290 336 231Q376 163 436 183L444 153Q356 111 278 206Q265 204 252 204Q106 204 74 422Z"/></svg>Quaedra Research</a>
      <h1>${project.name}</h1>
      <nav class="links mono" aria-label="${project.name}">
        ${nav}
      </nav>
    </header>

    <article class="doc">
${body}
      <p class="note"><a href="${project.github}/blob/main/${page.source}">Edit this page on GitHub</a></p>
    </article>

    <footer class="mono">
      <span>© <span id="y">2026</span> Quaedra Research</span>
      <nav>
        <a href="/contact">Contact</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="https://github.com/quaedra">GitHub</a>
      </nav>
    </footer>
  </div>
  <script>document.getElementById("y").textContent = new Date().getFullYear();</script>${usesMermaid ? `
  <script type="module">
    // Diagrams in the site's colors, light or dark.
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    mermaid.initialize({
      startOnLoad: true,
      theme: "base",
      fontFamily: "Inter, system-ui, sans-serif",
      themeVariables: {
        background: v("--bg"), primaryColor: v("--surface"), primaryTextColor: v("--fg"),
        primaryBorderColor: v("--line"), lineColor: v("--muted"), textColor: v("--fg"),
        clusterBkg: "transparent", clusterBorder: v("--line"), edgeLabelBackground: v("--bg"), fontSize: "13px",
      },
    });
  </script>` : ""}
</body>
</html>
`;
}
