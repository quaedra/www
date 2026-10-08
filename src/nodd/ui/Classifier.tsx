import { type ReactNode, useEffect, useState } from "react";
import { type Decision, type LoadProgress, nodd } from "@nodd/browser";
import { ORT_WASM, demoConfig, fmt } from "../common";
import { DecisionView } from "./DecisionView";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const mb = (bytes: number) => fmt(bytes / 1e6, 1);

/** What the model is doing while it isn't ready: downloading (with bytes) or starting up. */
function loadingText(p: LoadProgress | null): string {
  if (!p || p.total === 0) return "Downloading model…";
  if (p.loaded < p.total) return `Downloading model… ${mb(p.loaded)} / ${mb(p.total)} MB`;
  return "Starting model…";
}

/**
 * Try a model: input on the left, result on the right. Re-mount with `key={model}` to switch models.
 * Runs on the fastest backend (demoConfig: WASM, q8). Keeps the ids the headless checks use
 * (#text, #status) and exposes the last answer as window.__last.
 */
export function Classifier({ model, examples, heading = "h2", picker }: { model: string; examples: string[]; heading?: "h2" | "h3"; picker?: ReactNode }) {
  const H = heading;
  const [text, setText] = useState(examples[0] ?? "");
  const [loaded, setLoaded] = useState<nodd | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);

  useEffect(() => {
    let live = true;
    let m: nodd | null = null;
    nodd.load(model, {
      device: demoConfig.device,
      dtype: demoConfig.dtype,
      ortWasmPaths: ORT_WASM,
      onProgress: (p) => live && setProgress(p),
    })
      .then((x) => {
        if (!live) return x.dispose();
        m = x;
        const i = x.info;
        setStatus(`${i.model} · ${i.device}/${i.dtype} · ${mb(i.downloadBytes)} MB · loaded in ${fmt(i.loadMs, 0)} ms`);
        setLoaded(x);
      })
      .catch((err) => live && setStatus(`failed: ${message(err)}`));
    return () => {
      live = false;
      m?.dispose();
    };
  }, [model]);

  useEffect(() => {
    if (!loaded) return;
    let live = true;
    loaded.decide(text).then(
      (d) => {
        if (!live) return;
        setDecision(d);
        (window as unknown as { __last: Decision }).__last = d;
      },
      () => {}, // model disposed mid-flight (model switch)
    );
    return () => void (live = false);
  }, [loaded, text]);

  const loading = !status;
  const fraction = progress && progress.total ? progress.loaded / progress.total : 0;

  return (
    <div className={heading === "h3" ? "cols tight" : "cols"}>
      <section>
        <H>Input</H>
        {picker && <div className="controls">{picker}</div>}
        <textarea id="text" aria-label="Input" placeholder="Type something…" value={text} onChange={(e) => setText(e.target.value)} />
        <ul className="examples" aria-label="Examples">
          {examples.map((ex) => (
            <li key={ex}>
              <a href="#" onClick={(e) => (e.preventDefault(), setText(ex))}>{ex}</a>
            </li>
          ))}
        </ul>
      </section>
      <section aria-live="polite">
        <H>Result</H>
        <p id="status" className="muted small">{loading ? loadingText(progress) : status}</p>
        {loading && (
          <div className="loadbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
            <div style={{ width: `${Math.round(fraction * 100)}%` }} />
          </div>
        )}
        {decision && loaded && <DecisionView d={decision} />}
      </section>
    </div>
  );
}
