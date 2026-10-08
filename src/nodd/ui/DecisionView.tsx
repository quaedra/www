import type { Decision } from "@nodd/browser";
import { fmt } from "../common";

const pct = (x: number) => `${fmt(x * 100, 1)}%`;

/** Probabilities as a table with bars (top label in bold), then the answer and its confidence. */
export function DecisionView({ d, meta = true }: { d: Decision; meta?: boolean }) {
  return (
    <>
      <table className="probs">
        <tbody>
          {Object.entries(d.probabilities).map(([k, p]) => (
            <tr key={k} className={k === d.label ? "best" : undefined}>
              <td>{k}</td>
              <td className="num">{pct(p)}</td>
              <td>
                <span className="bar" style={{ width: `calc(${p.toFixed(4)} * min(200px, 30vw))` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small">
        <b>{d.label}</b> with {pct(d.confidence)} confidence.
      </p>
      {meta && (
        <p className="muted small">
          inference {fmt(d.latency_ms, 2)} ms · model {d.model}
        </p>
      )}
      <details className="raw-output">
        <summary>Raw output</summary>
        <pre><code>{JSON.stringify(d, null, 2)}</code></pre>
      </details>
    </>
  );
}
