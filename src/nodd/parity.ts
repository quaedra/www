import { nodd } from "@nodd/browser";
import { MODEL_URL, ORT_WASM, configsFor, parityRows, webgpuAvailable } from "./common";

export const MIN_AGREEMENT = 0.995;

export interface ParityResult {
  name: string;
  device?: string;
  agreement?: number;
  maxProbDiff?: number;
  pass?: boolean;
  skipped?: string;
}

export interface ParityRun {
  model: string;
  n: number;
  results: ParityResult[];
  pass: boolean;
  webgpu: boolean;
}

/** Browser labels vs the Python labels in parity.jsonl, for every backend. */
export async function runParity(model = MODEL_URL): Promise<ParityRun> {
  const rows = await parityRows(model);
  const gpu = await webgpuAvailable();
  const results: ParityResult[] = [];
  for (const cfg of await configsFor(model)) {
    if (!cfg.parity) continue;
    if (cfg.device === "webgpu" && !gpu) {
      results.push({ name: cfg.name, skipped: "WebGPU not available" });
      continue;
    }
    const m = await nodd.load(model, { device: cfg.device, dtype: cfg.dtype, ortWasmPaths: ORT_WASM });
    const ds = await m.decideBatch(rows.map((r) => r.text));
    let same = 0;
    let maxDiff = 0;
    ds.forEach((d, i) => {
      if (d.label === rows[i].label) same++;
      for (const [k, v] of Object.entries(rows[i].probabilities)) maxDiff = Math.max(maxDiff, Math.abs(v - d.probabilities[k]));
    });
    const agreement = same / rows.length;
    results.push({ name: cfg.name, device: m.info.device, agreement, maxProbDiff: maxDiff, pass: agreement >= MIN_AGREEMENT });
    m.dispose();
  }
  return { model, n: rows.length, results, pass: results.every((r) => r.skipped || r.pass), webgpu: gpu };
}
