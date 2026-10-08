import { useEffect } from "react";
import { type MenuItem, ProjectLayout } from "../ui/Layout";

/** A docs page as scripts/build-docs.mjs writes it to src/docs/<project>/<page>.json. */
export interface DocData {
  project: string;
  title: string;
  menu: MenuItem[];
  /** The Markdown source on GitHub. */
  source: string;
  /** The body has ```mermaid blocks to draw. */
  mermaid: boolean;
  html: string;
}

/** Draws the page's Mermaid diagrams in the site's colors, light or dark. */
async function drawDiagrams() {
  const url = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  const { default: mermaid } = await import(/* @vite-ignore */ url);
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    fontFamily: "Inter, system-ui, sans-serif",
    themeVariables: {
      background: v("--bg"), primaryColor: v("--surface"), primaryTextColor: v("--fg"),
      primaryBorderColor: v("--line"), lineColor: v("--muted"), textColor: v("--fg"),
      clusterBkg: "transparent", clusterBorder: v("--line"), edgeLabelBackground: v("--bg"), fontSize: "13px",
    },
  });
  await mermaid.run({ querySelector: "pre.mermaid" });
}

export default function Doc({ doc }: { doc: DocData }) {
  useEffect(() => {
    if (doc.mermaid) void drawDiagrams();
  }, [doc]);
  const edit = `<p class="note"><a href="${doc.source}">Edit this page on GitHub</a></p>`;
  return (
    <ProjectLayout name={doc.project} menu={doc.menu}>
      <article className="doc" dangerouslySetInnerHTML={{ __html: doc.html + edit }} />
    </ProjectLayout>
  );
}
