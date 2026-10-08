// Search and link-preview tags for every page, derived from what each HTML entry under pages/
// already says (its <title>, description and og:* tags) and its URL, so they stay consistent:
// canonical URL, og:url, og:locale, Twitter/X card tags, theme colors, icons and JSON-LD
// (the organization on the home page, breadcrumbs, articles for docs, source code for projects).
// The build also writes sitemap.xml and robots.txt from the same rules (see scripts/build.mjs).
import { relative } from "node:path";
import type { Plugin } from "vite";

export const SITE = "https://quaedra.com";
const NAME = "Quaedra Research";

/** Pages that show whatever ?model= names: useful to open, not to index. */
const NOINDEX = new Set(["/nodd/model", "/nodd/bench", "/nodd/parity"]);

/** Project overviews: their source repositories, for SoftwareSourceCode. */
const REPOSITORIES: Record<string, string> = {
  "/welp": "https://github.com/quaedra/welp",
  "/jet": "https://github.com/quaedra/jet",
  "/megacode": "https://github.com/quaedra/megacode",
  "/nodd/": "https://github.com/quaedra/nodd",
};

const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: NAME,
  url: `${SITE}/`,
  logo: `${SITE}/icon-512.png`,
  email: "hello@quaedra.com",
  sameAs: ["https://github.com/quaedra", "https://huggingface.co/quaedra"],
};

/** A page's URL path from its entry under pages/: index.html → /, jet/docs/index.html → /jet/docs/, welp.html → /welp. */
export function pathFor(file: string, pagesDir: string): string {
  const rel = relative(pagesDir, file).replace(/\\/g, "/");
  return "/" + rel.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
}

export const indexable = (path: string) => !NOINDEX.has(path);

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const unescape = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function meta(html: string, attr: "name" | "property", key: string): string | undefined {
  const m = html.match(new RegExp(`<meta ${attr}="${key.replace(/[:.]/g, "\\$&")}" content="([^"]*)"`));
  return m ? unescape(m[1]) : undefined;
}

/** "Decision Index · Jet · Quaedra Research" at /jet/docs/decision-index → Quaedra Research › Jet › Decision Index. */
function breadcrumbs(title: string, path: string) {
  const parts = title.split(" · ").reverse();
  if (parts.length < 2) return null;
  const project = "/" + path.split("/")[1] + (path.startsWith("/nodd") ? "/" : "");
  const urls = parts.length === 2 ? ["/", path] : ["/", project, path];
  if (parts.length > 3) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: parts.map((name, i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + urls[i] })),
  };
}

function jsonLd(path: string, title: string, description: string) {
  const graph: object[] = [];
  const url = SITE + path;
  if (path === "/") {
    graph.push(ORGANIZATION, { "@type": "WebSite", "@id": `${SITE}/#website`, name: NAME, url: `${SITE}/`, publisher: { "@id": ORGANIZATION["@id"] } });
  } else {
    const crumbs = breadcrumbs(title, path);
    if (crumbs) graph.push(crumbs);
  }
  const project = title.split(" · ").slice(-2, -1)[0];
  if (/\/docs(\/|$)/.test(path)) {
    graph.push({
      "@type": "TechArticle",
      headline: title.split(" · ").slice(0, -1).join(" · "),
      description,
      url,
      about: project,
      publisher: { "@id": ORGANIZATION["@id"] },
      author: { "@id": ORGANIZATION["@id"] },
    });
  }
  if (REPOSITORIES[path]) {
    graph.push({
      "@type": "SoftwareSourceCode",
      name: project,
      description,
      url,
      codeRepository: REPOSITORIES[path],
      author: { "@id": ORGANIZATION["@id"] },
    });
  }
  if (path !== "/" && graph.length) graph.push({ ...ORGANIZATION, sameAs: undefined, email: undefined });
  return graph.length ? { "@context": "https://schema.org", "@graph": graph } : null;
}

/** Rewrites one page's <head>. */
export function seoHead(html: string, path: string): string {
  const title = unescape(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? NAME);
  const description = meta(html, "name", "description") ?? "";
  const ogTitle = meta(html, "property", "og:title") ?? title;
  const ogDescription = meta(html, "property", "og:description") ?? description;
  const image = meta(html, "property", "og:image") ?? `${SITE}/og/index.png`;
  const imageAlt = meta(html, "property", "og:image:alt") ?? ogTitle;
  const url = SITE + path;

  // Docs pages are articles. Drop what's generated here, so each tag appears once.
  if (/\/docs(\/|$)/.test(path)) html = html.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">');
  html = html
    .replace(/\s*<link rel="canonical"[^>]*>/g, "")
    .replace(/\s*<meta (?:property="og:(?:url|locale|image:type)"|name="(?:twitter:(?:title|description|image|image:alt|card)|theme-color|robots)")[^>]*>/g, "");

  const tags = [
    `<link rel="canonical" href="${url}">`,
    ...(indexable(path) ? [] : ['<meta name="robots" content="noindex">']),
    `<meta property="og:url" content="${url}">`,
    '<meta property="og:locale" content="en_US">',
    `<meta property="og:image:type" content="image/png">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeAttr(ogTitle)}">`,
    `<meta name="twitter:description" content="${escapeAttr(ogDescription)}">`,
    `<meta name="twitter:image" content="${escapeAttr(image)}">`,
    `<meta name="twitter:image:alt" content="${escapeAttr(imageAlt)}">`,
    '<meta name="theme-color" content="#fafaf9" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#0c0c0d" media="(prefers-color-scheme: dark)">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  ];
  const ld = jsonLd(path, title, description);
  if (ld) tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`);
  return html.replace(/\n?<\/head>/, `\n  ${tags.join("\n  ")}\n</head>`);
}

export function seo(pagesDir: string): Plugin {
  return {
    name: "quaedra-seo",
    transformIndexHtml: {
      order: "pre",
      handler: (html, ctx) => seoHead(html, pathFor(ctx.filename, pagesDir)),
    },
  };
}
