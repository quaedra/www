import { nodd, clearModelCache } from "@nodd/browser";
import type { Config } from "./common";
import { MODEL_URL, ORT_WASM, configsFor, fmt, gpuAdapterInfo, parityRows, percentile, webgpuAvailable } from "./common";

const N_SINGLE = 200;

export interface BenchResult {
  name: string;
  device?: string;
  coldLoadMs?: number;
  warmLoadMs?: number;
  modelMB?: number;
  p50Ms?: number;
  p95Ms?: number;
  engineP50Ms?: number;
  batchMsPerInput?: number;
  memoryMB?: number | null;
  error?: string;
}

async function memoryMB(): Promise<number | null> {
  const perf = performance as Performance & { measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }> };
  if (!perf.measureUserAgentSpecificMemory || !crossOriginIsolated) return null;
  try {
    return (await perf.measureUserAgentSpecificMemory()).bytes / 1e6;
  } catch {
    return null;
  }
}

async function bench(model: string, cfg: Config, texts: string[]): Promise<BenchResult> {
  await clearModelCache();
  const opts = { device: cfg.device, dtype: cfg.dtype, ortWasmPaths: ORT_WASM };
  const cold = await nodd.load(model, opts);
  cold.dispose();
  const m = await nodd.load(model, opts); // warm: model files from the Cache API
  await m.decide(texts[0]);
  const wall: number[] = [];
  const engine: number[] = [];
  for (const t of texts.slice(0, N_SINGLE)) {
    const t0 = performance.now();
    const d = await m.decide(t);
    wall.push(performance.now() - t0);
    engine.push(d.latency_ms);
  }
  const t0 = performance.now();
  await m.decideBatch(texts);
  const batch = (performance.now() - t0) / texts.length;
  const mem = await memoryMB();
  m.dispose();
  return {
    name: cfg.name,
    device: m.info.device,
    coldLoadMs: cold.info.loadMs,
    warmLoadMs: m.info.loadMs,
    modelMB: m.info.downloadBytes / 1e6,
    p50Ms: percentile(wall, 0.5),
    p95Ms: percentile(wall, 0.95),
    engineP50Ms: percentile(engine, 0.5),
    batchMsPerInput: batch,
    memoryMB: mem,
  };
}

export interface BenchRun {
  model: string;
  gpuAdapter: Record<string, string> | null;
  results: BenchResult[];
  webgpu: boolean;
  crossOriginIsolated: boolean;
  userAgent: string;
  n: number;
}

/** Cold/warm load, per-input latency and batch throughput for every backend; `onUpdate` after each. */
export async function runBench(model = MODEL_URL, onUpdate: (rs: BenchResult[]) => void = () => {}): Promise<BenchRun> {
  const texts = (await parityRows(model)).map((r) => r.text);
  const gpu = await webgpuAvailable();
  const results: BenchResult[] = [];
  for (const cfg of await configsFor(model)) {
    if (cfg.device === "webgpu" && !gpu) {
      results.push({ name: cfg.name, error: "WebGPU not available" });
    } else {
      try {
        results.push(await bench(model, cfg, texts));
      } catch (err) {
        results.push({ name: cfg.name, error: err instanceof Error ? err.message : String(err) });
      }
    }
    onUpdate(results);
  }
  return { model, gpuAdapter: await gpuAdapterInfo(), results, webgpu: gpu, crossOriginIsolated, userAgent: navigator.userAgent, n: texts.length };
}
