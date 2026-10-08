// Nodd's models, onnxruntime files and training base model live in public/nodd/{models,ort,training}
// (not committed). Their published copy is the Hugging Face dataset quaedra/nodd-site, which the
// GitHub deploy downloads before building.
//
//   npm run nodd:pull   # download quaedra/nodd-site into public/nodd/
//   npm run nodd:push   # upload public/nodd/ to quaedra/nodd-site (after npm run sync-nodd)
//
// Needs the Hugging Face CLI (`hf`, from huggingface_hub); pushing needs a login with write access.
import { execFileSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "quaedra/nodd-site";
const DIRS = ["models", "ort", "training"];
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "public", "nodd");
/** Each pattern needs its own flag: --include a --include b. */
const each = (flag, patterns) => patterns.flatMap((p) => [flag, p]);
const globs = DIRS.map((d) => `${d}/**`);
const hf = (...args) => execFileSync(process.env.HF ?? "hf", args, { stdio: "inherit" });

const command = process.argv[2];
if (command === "pull") {
  // Download beside the site, then copy, so the CLI's own metadata stays out of public/.
  const download = join(root, ".cache", "nodd-site");
  hf("download", REPO, "--repo-type", "dataset", "--local-dir", download, ...each("--include", globs));
  for (const dir of DIRS) {
    rmSync(join(target, dir), { recursive: true, force: true });
    cpSync(join(download, dir), join(target, dir), { recursive: true });
  }
  console.log(`public/nodd: ${DIRS.join(", ")} from ${REPO}`);
} else if (command === "push") {
  hf("upload", REPO, target, ".", "--repo-type", "dataset", ...each("--include", globs), ...each("--delete", globs),
    "--commit-message", "Update Nodd site files");
} else {
  console.error("usage: node scripts/nodd-files.mjs pull|push");
  process.exit(1);
}
