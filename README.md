# quaedra.com

The Quaedra Research site, Nodd included: a React + Vite multi-page app served by one Cloudflare
Worker (`quaedra-www`).

- `pages/`: one HTML entry per page, at its URL's path (`pages/jet/docs/index.html` → `/jet/docs/`),
  with the page's meta tags
- `src/pages/`: the Quaedra pages; `src/routes.tsx` maps each entry's `<body data-page>` to one.
  The build prerenders them to HTML and React attaches in the browser
- `src/nodd/`: Nodd's pages (demo, train, docs, models), rendered in the browser
- `src/docs/`: docs pages built from the Jet and megacode repositories (`npm run docs`)
- `public/`: static files; `public/nodd/{models,ort,training}` are copied from the Nodd repository
  and not committed
- `worker/index.js`: redirects old Nodd URLs and reassembles files split for the 25 MiB asset limit

Nodd's runtime (`@nodd/browser`, `@nodd/core`) builds from source in `../nodd`. Nodd's models,
onnxruntime files and training base model aren't in git: their published copy is the Hugging Face
dataset [quaedra/nodd-site](https://huggingface.co/datasets/quaedra/nodd-site).

Every push to `main` deploys: `.github/workflows/deploy.yml` checks out quaedra/nodd beside the
site, pulls Nodd's files from Hugging Face, type-checks, builds and runs `wrangler deploy`.

```bash
npm install
npm run nodd:pull   # download Nodd's files from quaedra/nodd-site into public/nodd/
npm run sync-nodd   # or copy them from ../nodd (run npm run sync-model there first)…
npm run nodd:push   # …then publish them to quaedra/nodd-site for the GitHub deploy
npm run dev         # http://localhost:5173, clean URLs as in production
npm run typecheck
npm run build       # → dist/
npm run preview     # build, then serve dist/ with the worker (wrangler dev)
npm run deploy      # build and deploy from this machine (pushing to main does this too)
npm run docs        # rebuild the Jet and megacode docs from ../jet and ../megacode
npm run og          # re-render the Open Graph cards in public/og/
```
