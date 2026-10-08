import type { ReactNode } from "react";
import { ProjectLayout } from "../../ui/Layout";
import { page } from "../common";

export type Page = "home" | "models" | "docs" | "bench" | "parity" | "model" | "train";

/** The submenu under the title, the same on every Nodd page. The model page belongs to Models. */
const MENU: [Page, string, string][] = [
  ["home", "Overview", page("")],
  ["train", "Train", page("train")],
  ["models", "Models", page("models")],
  ["docs", "Docs", page("docs")],
];

/** The site's project page chrome with Nodd's menu; the page goes in <main>. */
export function Layout({ page: current, wide, lede, intro, children }: {
  page: Page;
  wide?: boolean;
  lede?: ReactNode;
  /** Shown in the header under the submenu, like the key figures on the overview. */
  intro?: ReactNode;
  children: ReactNode;
}) {
  const section = current === "model" ? "models" : current;
  return (
    <ProjectLayout
      name="Nodd"
      lede={lede}
      menu={[...MENU.map(([p, label, href]): [string, string, boolean] => [label, href, p === section]), ["GitHub", "https://github.com/quaedra/nodd"]]}
      intro={intro}
      className={wide ? "wrap nodd wide" : "wrap nodd"}
    >
      <main>{children}</main>
    </ProjectLayout>
  );
}
