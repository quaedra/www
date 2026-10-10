import { useState } from "react";
import examples from "../data/jet-examples.json";
import { BarChart, ProbBars } from "../ui/charts";
import { KeyFigures, ProjectLayout } from "../ui/Layout";

// Decision Index 0.3 leaderboard (multimodalart/jev-decision-index, data/v03.json, 2026-10-07):
// model, index, public, same skills, new domains
const DI: [string, number, number, number, number][] = [
  ["Hopper (G) 1.2", 42.61, 41.15, 42.37, 39.61],
  ["JPT-4B", 41.63, 42.82, 40.11, 39.17],
  ["Jet-4B v6.2", 40.01, 42.17, 40.93, 34.46],
  ["Kev 4B r10", 39.5, 37.95, 36.17, 41.25],
  ["InternLM Intern-Decision", 38.21, 38.0, 39.1, 34.35],
  ["Interfaze lev", 36.53, 39.2, 37.2, 31.98],
  ["Together Tev1", 34.14, 29.51, 31.78, 37.65],
  ["Jobe", 33.06, 32.93, 34.34, 30.08],
  ["Qwen3.5-4B Base (SemIf)", 28.84, 26.5, 28.04, 30.68],
];

const AREAS: [string, number][] = [
  ["Tools & Automation", 62.94],
  ["Retrieval & Classification", 48.17],
  ["Language Understanding", 44.21],
  ["Arts & Human Taste", 30.23],
  ["Knowledge & Reasoning", 25.42],
];

const score = (v: number, value?: boolean) => (value ? v.toFixed(1) : String(v));

// Recorded golden cases (quaedra/jet @ 25ccbd9e, golden.json)
interface Case {
  name: string;
  state: unknown;
  question: { type: "choice" | "score" | "noul"; instructions: string; criteria?: Record<string, string> | string[] };
  answer: { type: string; choice?: string; level?: string; score?: number; probability?: number; probabilities: Record<string, number> | number[] };
  top?: [string, number][];
}
const CASES = examples as Case[];
const TITLES: Record<string, string> = {
  choice_dbpedia_0: "Entity type", choice_ag_news_2: "News topic", list_state: "Agent next step",
  choice_mnli_3: "Entailment", choice_massive_5: "User intent", score_yelp_3: "Review score",
  score_stsb_6: "Similarity", non_ascii_state: "Urgency (multilingual)", noul_ag_news_2: "Yes / no: sports?",
  noul_emotion_8: "Yes / no: happy?",
};

/** The verdict, its detail line, the bars and the highlighted bar for one recorded answer. */
function answerView(c: Case) {
  const q = c.question, a = c.answer;
  if (a.type === "choice") {
    const probs = a.probabilities as Record<string, number>;
    const items = (c.top ?? Object.entries(probs)).map(([label, p]) => ({ label, p }));
    const rest = Object.keys(probs).length - items.length;
    if (rest > 0) items.push({ label: `${rest} other options`, p: Math.max(0, 1 - items.reduce((t, i) => t + i.p, 0)) });
    return { verdict: a.choice!, detail: "", items, highlight: a.choice! };
  }
  if (a.type === "score") {
    const items = (q.criteria as string[]).map((label, i) => ({ label, p: (a.probabilities as number[])[i] }));
    return { verdict: a.level!, detail: `score ${a.score!.toFixed(2)}`, items, highlight: a.level! };
  }
  const yes = a.probability! >= 0.5 ? "yes" : "no";
  return {
    verdict: yes,
    detail: `p(yes) ${(a.probability! * 100).toFixed(1)}%`,
    items: [{ label: "yes", p: a.probability! }, { label: "no", p: 1 - a.probability! }],
    highlight: yes,
  };
}

function Examples() {
  const [current, setCurrent] = useState(CASES[0]);
  const view = answerView(current);
  return (
    <div className="demo">
      <div className="chips" style={{ marginTop: 0 }}>
        {CASES.map((c) => (
          <button key={c.name} aria-pressed={c === current} onClick={() => setCurrent(c)}>{TITLES[c.name] ?? c.name}</button>
        ))}
      </div>
      <div className="state">{typeof current.state === "string" ? current.state : JSON.stringify(current.state, null, 2)}</div>
      <div className="q"><span className="type mono">{current.question.type}</span>{"  "}{current.question.instructions}</div>
      <div className="out">
        <div className="verdict">{view.verdict}{view.detail && <small>{view.detail}</small>}</div>
        <ProbBars items={view.items} highlight={view.highlight} />
      </div>
      <details className="table" style={{ marginTop: 12 }}>
        <summary>Response JSON</summary>
        <pre>{JSON.stringify(current.answer, null, 2)}</pre>
      </details>
    </div>
  );
}

export default function Jet() {
  return (
    <ProjectLayout
      name="Jet"
      lede="A family of typed decision models. Give one a state and named questions; it returns choices, scores and probabilities, never free-form text."
      menu={[
        ["Overview", "/jet", true],
        ["Docs", "/jet/docs/"],
        ["Decision Index", "/jet/docs/decision-index"],
        ["Training history", "/jet/docs/training-history"],
        ["GitHub", "https://github.com/quaedra/jet"],
        ["Hugging Face", "https://huggingface.co/quaedra/jet"],
      ]}
      intro={<KeyFigures items={[["Jet-4B", "Latest model, v6.2"], ["bf16", "Merged weights, 8.4 GB"], ["40.0", "Decision Index 0.3, #52 of 113"]]} />}
    >
      <section>
        <h2 className="mono">How it works</h2>
        <p>Each answer option maps to a single label token. Jet reads the next-token logits for those labels only, divides by a temperature fitted on held-out data, and applies softmax. One forward pass per question, no sampling. Answers always follow the requested type, but decisions can still be wrong.</p>
        <table className="data">
          <thead><tr><th>Type</th><th>Criteria</th><th>Answer</th></tr></thead>
          <tbody>
            <tr><td><code>choice</code></td><td>2–255 named options</td><td>Selected key, probability per key</td></tr>
            <tr><td><code>score</code></td><td>2–10 ordered levels</td><td>Fractional score, level, probabilities</td></tr>
            <tr><td><code>noul</code></td><td>None</td><td>Probability that the answer is yes</td></tr>
          </tbody>
        </table>
        <p className="note aside">Fine-tuned from Qwen3.5-4B with a rank-16 LoRA, merged into full weights.</p>
      </section>

      <section>
        <h2 className="mono">Benchmarks</h2>
        <h3>Decision Index 0.3</h3>
        <p className="note" style={{ marginTop: 0 }}>The official leaderboard, run by its maintainers on the full suite: 110,201 requests across 42 benchmarks, published October 7, 2026. Models on the same 4B base shown; Jet-4B v6.2 scores 40.01, rank 52 of 113.</p>
        <BarChart
          rows={DI.map(([n, v, pub, same, fresh]) => ({
            label: n, values: [v], color: n.startsWith("Jet") ? "var(--s2)" : undefined,
            tip: <><b>{n}</b><br />Index: {v.toFixed(2)}<br />Public: {pub.toFixed(2)}<br />Same skills: {same.toFixed(2)}<br />New domains: {fresh.toFixed(2)}</>,
          }))}
          series={[{ name: "Index", color: "var(--s1)" }]}
          min={0} max={50} ticks={[0, 10, 20, 30, 40, 50]} fmt={score}
        />
        <p className="note">The index weights public benchmarks 20%, same skills 50% and new domains 30%, after equating each part across models. Scores within 0.9 points are tied, as Jet-4B is with its neighbors. It answered 109,958 requests; 243 exceed its 16,384-token prompt limit. <a href="/jet/docs/decision-index">Details</a> · <a href="https://huggingface.co/spaces/multimodalart/jev-decision-index">Leaderboard</a></p>
        <details className="table">
          <summary>Show as table</summary>
          <table className="data">
            <thead><tr><th>Model</th><th className="n">Index</th><th className="n">Public</th><th className="n">Same skills</th><th className="n">New domains</th></tr></thead>
            <tbody>
              {DI.map(([n, ...v]) => <tr key={n}><td>{n}</td>{v.map((x, i) => <td key={i} className="n">{x.toFixed(2)}</td>)}</tr>)}
            </tbody>
          </table>
        </details>

        <h3>v6.2 by area</h3>
        <p className="note" style={{ marginTop: 0 }}>Decision Index skill score per area.</p>
        <BarChart
          rows={AREAS.map(([label, v]) => ({ label, values: [v] }))}
          series={[{ name: "Skill score", color: "var(--s1)" }]}
          min={0} max={100} ticks={[0, 25, 50, 75, 100]} fmt={score}
        />
        <p className="note">Strongest at tools and retrieval, weakest at knowledge and reasoning. Calibration: 66% accurate at 80% mean confidence (ECE 0.14), so confidences run high.</p>
      </section>

      <section>
        <h2 className="mono">Examples</h2>
        <p>Real outputs recorded in the model's reference file (from Jet v5, an earlier 0.6B model, calibrated). Pick a case to see the request and the typed answer.</p>
        <Examples />
        <p className="note">For live inference, run the model locally; see <a href="#run-it">Run it</a>.</p>
      </section>

      <section>
        <h2 className="mono" id="run-it">Run it</h2>
        <p>The v6.2 release is self-contained: merged bf16 weights plus the CUDA runtime.</p>
        <pre>{`hf download quaedra/jet --revision v6.2.0 --local-dir jet-4b
cd jet-4b && python -m pip install -r requirements.txt
echo '{"state":"I was charged twice this month.",
  "questions":{"billing":{"type":"noul",
  "instructions":"Is this a billing issue?"}}}' | python jet.py`}</pre>
      </section>
    </ProjectLayout>
  );
}
