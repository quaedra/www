// Browser entry for Quaedra pages: the build prerenders each page into #root, and this attaches
// React to it (or renders from scratch on the dev server).
import { createRoot, hydrateRoot } from "react-dom/client";
import { load } from "./routes";

const root = document.getElementById("root")!;
const { page = "home", doc } = document.body.dataset;
const element = await load(page, doc);
if (root.hasChildNodes()) hydrateRoot(root, element);
else createRoot(root).render(element);
