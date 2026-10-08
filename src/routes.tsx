// Every Quaedra page, by the name in its HTML entry's <body data-page>. Docs pages also name their
// data file in data-doc. Used by the browser (src/main.tsx) and the build's prerender (src/prerender.tsx).
import type { ComponentType, ReactElement } from "react";
import type { DocData } from "./pages/Doc";

const pages: Record<string, () => Promise<{ default: ComponentType }>> = {
  home: () => import("./pages/Home"),
  welp: () => import("./pages/Welp"),
  jet: () => import("./pages/Jet"),
  megacode: () => import("./pages/Megacode"),
  contact: () => import("./pages/Contact"),
  terms: () => import("./pages/Terms"),
  privacy: () => import("./pages/Privacy"),
};

const docs = import.meta.glob<DocData>("./docs/*/*.json", { import: "default" });

export async function load(page: string, doc?: string): Promise<ReactElement> {
  if (page === "doc") {
    const data = docs[`./docs/${doc}.json`];
    if (!data) throw new Error(`no docs page ${doc}`);
    const [{ default: Doc }, d] = await Promise.all([import("./pages/Doc"), data()]);
    return <Doc doc={d} />;
  }
  const Page = (await pages[page]?.())?.default;
  if (!Page) throw new Error(`no page ${page}`);
  return <Page />;
}
