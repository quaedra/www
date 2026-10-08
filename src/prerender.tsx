// Server entry for the build: renders a page to HTML for its entry's #root (see scripts/build.mjs).
import { renderToString } from "react-dom/server";
import { load } from "./routes";

export async function render(page: string, doc?: string): Promise<string> {
  return renderToString(await load(page, doc));
}
