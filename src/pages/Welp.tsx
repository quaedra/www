import { BarChart, type BarChartProps, Legend, LineChart, type LineSeries, ScatterChart, type ScatterPoint } from "../ui/charts";
import { KeyFigures, ProjectLayout } from "../ui/Layout";

/** Bars with Welp in the highlight color. */
const marked = (rows: [string, number][], opts: Omit<BarChartProps, "rows" | "series"> & { name: string }): BarChartProps => ({
  rows: rows.map(([label, v]) => ({ label, values: [v], color: label.startsWith("Welp") ? "var(--s2)" : undefined })),
  series: [{ name: opts.name, color: "var(--s1)" }],
  ...opts,
});

// HumanEval problems passed (of 164) against GGUF size, RTX 4080 Super; results/humaneval in quaedra/welp
const SIZE: { label: string; table: string; base: string; gb: number; passed: number; group: string; side: ScatterPoint["side"] }[] = [
  { label: "Ternary", table: "Ternary experts (research)", base: "Qwen3.6-35B-A3B", gb: 8.64, passed: 129, group: "q36", side: "r" },
  { label: "IQ2_XXS", table: "IQ2_XXS", base: "Qwen3.6-35B-A3B", gb: 9.5, passed: 139, group: "q36", side: "r" },
  { label: "Ternary + Q2_K", table: "Ternary experts, Q2_K down (research)", base: "Qwen3.6-35B-A3B", gb: 9.82, passed: 149, group: "q36", side: "r" },
  { label: "Welp", table: "Welp-35B-A3B", base: "Qwen3.6-35B-A3B", gb: 13.21, passed: 157, group: "focus", side: "r" },
  { label: "UD-IQ3_XXS", table: "UD-IQ3_XXS (Unsloth)", base: "Qwen3.6-35B-A3B", gb: 13.21, passed: 154, group: "q36", side: "r" },
  { label: "Q4_K_M", table: "Q4_K_M", base: "Qwen3.6-35B-A3B", gb: 21.17, passed: 157, group: "q36", side: "t" },
  { label: "Bonsai 2 27B", table: "Bonsai 2 27B", base: "Qwen3.8-27B", gb: 5.95, passed: 150, group: "other", side: "t" },
  { label: "Qwen3.8-27B", table: "UD-Q3_K_XL", base: "Qwen3.8-27B", gb: 13.15, passed: 158, group: "other", side: "l" },
];

// Speed against context depth: llama-bench -d, tg128 and pp2048, q4_0 KV, -ub 256, RTX 4080 Super; results/ctxspeed in quaedra/welp
const DEPTHS = [0, 4096, 16384, 32768, 65536, 131072, 196608, 258048];
const CTX: { name: string; color: string; focus?: boolean; tg: number[]; pp: number[] }[] = [
  { name: "Welp-35B-A3B", color: "var(--s2)", focus: true,
    tg: [161.5, 161.8, 155.1, 151.8, 141.1, 126.9, 115.2, 105.0], pp: [3826, 3667, 3301, 3063, 2637, 2029, 1647, 1396] },
  { name: "Bonsai 2 27B", color: "var(--muted)",
    tg: [83.9, 83.8, 80.4, 76.5, 69.4, 58.8, 50.9, 45.1], pp: [2335, 2247, 1952, 1660, 1285, 882, 672, 548] },
  { name: "Qwen3.8-27B", color: "var(--s1)",
    tg: [46.6, 46.4, 45.3, 44.1, 41.6, 37.5], pp: [2132, 2044, 1791, 1550, 1220, 851] },
];
const lines = (k: "tg" | "pp"): LineSeries[] =>
  CTX.map((c) => ({ name: c.name, color: c.color, focus: c.focus, endCross: c[k].length < DEPTHS.length, points: c[k].map((y, i) => ({ x: DEPTHS[i], y })) }));
const ctxAxis = { min: 0, max: 262144, ticks: [0, 32768, 65536, 131072, 196608, 262144], fmt: (v: number) => (v ? Math.round(v / 1024) + "k" : "0"), title: "Context already in the cache (tokens)" };

/** pass@1 in percent */
const he = (passed: number) => (passed / 164) * 100;

const COMPARISON: [string, string, string, string, string, string, string][] = [
  ["Welp-35B-A3B", "13.21", "95.7%", "23/37", "262k", "164", "5,111"],
  ["UD-IQ3_XXS (Unsloth)", "13.21", "93.9%", "21/37", "262k", "165", "5,165"],
  ["Qwen3.8-27B (UD-Q3_K_XL)", "13.15", "96.3%", "26/37", "131k", "47", "2,155"],
  ["Bonsai 2 27B", "5.95", "91.5%", "15/37", "262k", "85", "2,278"],
];

export default function Welp() {
  return (
    <ProjectLayout
      name="Welp"
      lede="Welp-35B-A3B is Qwen3.6-35B-A3B in 13.21 GB. It runs on a 16 GB GPU with the full 262k context, and scores higher than Unsloth's UD-IQ3_XXS at exactly the same size."
      menu={[["Overview", "/welp", true], ["Benchmarks", "#benchmarks"], ["Run it", "#run-it"], ["GitHub", "https://github.com/quaedra/welp"], ["Hugging Face", "https://huggingface.co/quaedra/Welp-35B-A3B-GGUF"]]}
      intro={<KeyFigures items={[["13.21 GB", "GGUF file"], ["262k", "context on 16 GB"], ["164 tok/s", "decode on 16 GB"], ["95.7%", "HumanEval pass@1"]]} />}
    >
      <section>
        <h2 className="mono">How it works</h2>
        <p>Welp is the same model, quantized more carefully: no fine-tuning and no new training data. It keeps the per-tensor format mix of Unsloth's UD-IQ3_XXS and re-quantizes only the expert weights. Each expert matrix is quantized one 256-weight block at a time with llama.cpp's own quantizer, and each block's rounding error is pushed into the weights not yet quantized (GPTQ, applied block-wise so standard formats can be used). Layers go in order, each fed the output of the already quantized layers.</p>
        <p className="note aside">Quantized from Qwen3.6-35B-A3B (35B total, 3B active, 256 experts, top-8). Experts gate/up IQ2_S, down IQ3_XXS (IQ4_XS in 3 layers), everything else Q6_K, as in UD-IQ3_XXS. Standard llama.cpp formats.</p>
      </section>

      <section>
        <h2 className="mono" id="benchmarks">Benchmarks</h2>
        <h3>Fig I: HumanEval pass@1</h3>
        <p className="note" style={{ marginTop: 0 }}>164 problems, thinking off, temperature 0. Same harness for every model, RTX 4080 Super. Every model here fits on a 16 GB GPU.</p>
        {/* RTX 4080 Super, same HumanEval harness (164 problems, thinking off, temperature 0) */}
        <BarChart {...marked([["Qwen3.8-27B", 96.3], ["Welp-35B-A3B", 95.7], ["UD-IQ3_XXS", 93.9], ["Bonsai 2 27B", 91.5]], {
          name: "pass@1", min: 0, max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v, value) => (value ? v.toFixed(1) + "%" : String(v)),
        })} />
        <h3>Fig II: Decode speed</h3>
        <p className="note" style={{ marginTop: 0 }}>Tokens per second, llama-bench tg128.</p>
        <BarChart {...marked([["UD-IQ3_XXS", 165], ["Welp-35B-A3B", 164], ["Bonsai 2 27B", 85], ["Qwen3.8-27B", 47]], {
          name: "tok/s", min: 0, max: 200, ticks: [0, 50, 100, 150, 200],
        })} />
        <h3>Fig III: Prefill speed</h3>
        <p className="note" style={{ marginTop: 0 }}>Tokens per second, llama-bench pp4096.</p>
        <BarChart {...marked([["UD-IQ3_XXS", 5165], ["Welp-35B-A3B", 5111], ["Bonsai 2 27B", 2278], ["Qwen3.8-27B", 2155]], {
          name: "tok/s", min: 0, max: 6000, ticks: [0, 2000, 4000, 6000], fmt: (v) => v.toLocaleString("en-US"),
        })} />
        <h3>Fig IV: Performance vs size (log scale)</h3>
        <p className="note" style={{ marginTop: 0 }}>HumanEval pass@1 against GGUF size, same harness and card as Fig I. Points to the upper left are better. The dashed line joins the best Qwen3.6-35B-A3B quantization at each size; Welp moves it up at 13.21 GB.</p>
        <ScatterChart
          points={SIZE.map((s) => ({
            label: s.label, x: s.gb, y: he(s.passed), group: s.group, side: s.side,
            tip: <><b>{s.label}</b><br />{s.base}<br />{s.gb.toFixed(2)} GB · {he(s.passed).toFixed(1)}%</>,
          }))}
          groups={{
            focus: { name: "Welp", color: "var(--s2)" },
            q36: { name: "Qwen3.6-35B-A3B", color: "var(--s1)" },
            other: { name: "Other base models", color: "var(--muted)", shape: "diamond" },
          }}
          line={["Ternary", "IQ2_XXS", "Ternary + Q2_K", "Welp"]}
          vline={{ x: 16, label: "16 GB card" }}
          x={{ min: 5, max: 26, ticks: [6, 8, 12, 16, 24], fmt: (v) => +v.toFixed(2) + " GB", title: "GGUF size (log scale)" }}
          y={{ min: 76, max: 100, ticks: [80, 85, 90, 95, 100], fmt: (v) => +v.toFixed(1) + "%", title: "HumanEval pass@1" }}
        />
        <Legend items={[
          { name: "Welp", color: "var(--s2)", shape: "circle" },
          { name: "Other Qwen3.6-35B-A3B quants", color: "var(--s1)", shape: "circle" },
          { name: "Other base models", color: "var(--muted)", shape: "diamond" },
          { name: "Qwen3.6-35B-A3B frontier", shape: "dash" },
        ]} />
        <details className="table">
          <summary>Show as table</summary>
          <div className="scroll-x">
            <table className="data">
              <thead><tr><th>Model</th><th>Base</th><th className="n">GB</th><th className="n">HumanEval</th></tr></thead>
              <tbody>
                {SIZE.map((s) => (
                  <tr key={s.label}>
                    <td>{s.group === "focus" ? <b>{s.table}</b> : s.table}</td>
                    <td>{s.base}</td>
                    <td className="n">{s.gb.toFixed(2)}</td>
                    <td className="n">{he(s.passed).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="note">Welp ties Q4_K_M (157 of 164) at 62% of its size; Q4_K_M does not fit on a 16 GB card. The two ternary builds are Quaedra research quantizations from the <a href="https://github.com/quaedra/welp">Welp log</a> and are not released. One HumanEval problem is 0.6 points.</p>
        <div className="scroll-x">
          <table className="data">
            <thead><tr><th>Model</th><th className="n">GB</th><th className="n">HumanEval</th><th className="n">Long-exact</th><th className="n">Context</th><th className="n">Decode tok/s</th><th className="n">Prefill tok/s</th></tr></thead>
            <tbody>
              {COMPARISON.map(([name, ...cells], i) => (
                <tr key={name}><td>{i === 0 ? <b>{name}</b> : name}</td>{cells.map((c, j) => <td key={j} className="n">{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Single runs on an RTX 4080 Super (16 GB). Context is the largest that fits entirely on the card with a q4_0 KV cache. Long-exact is the bonsai-ada-surgery suite (37 long tool-using tasks, thinking on). Bonsai 2 scores 15/37 here against 17/37 in the bonsai-ada-surgery report (RTX 4070). Qwen3.8-27B is the dense model Bonsai 2 is built from; Welp and UD-IQ3_XXS are Qwen3.6-35B-A3B, so perplexity is only comparable between those two: 5.762 for Welp against 5.873 for UD-IQ3_XXS on wikitext-2 (1.880 against 1.900 on code).</p>
        <p>Welp is one problem behind the dense Qwen3.8-27B on HumanEval (157 against 158 of 164) and three tasks behind on long-exact (23 against 26 of 37), at 3.5 times its decode speed and twice its context. It beats UD-IQ3_XXS of its own base model on every quality measure at the same size. The differences against UD-IQ3_XXS on HumanEval and long-exact are small enough to be run-to-run noise on their own; the perplexity gain is consistent.</p>
        <h3>Full context</h3>
        <p>With a q4_0 KV cache, Welp runs the full 262k context entirely on a 16 GB card (14.8 GB, including about 0.8 GB used by the desktop). After a 214k-token prompt it still decodes at 107 tok/s, and prefill runs at 2,043 tok/s. A passcode hidden at 10%, 50% and 90% of that prompt was retrieved every time.</p>
        <h3>Fig V: Decode speed vs context</h3>
        <p className="note" style={{ marginTop: 0 }}>Tokens per second generating 128 tokens after the given amount of context, llama-bench. Same KV cache (q4_0) for every model. Qwen3.8-27B does not fit 192k on the card (×).</p>
        <LineChart series={lines("tg")} x={ctxAxis} y={{ min: 0, max: 175, ticks: [0, 50, 100, 150], fmt: (v) => String(Math.round(v)), title: "Decode tok/s" }} />
        <h3>Fig VI: Prefill speed vs context</h3>
        <p className="note" style={{ marginTop: 0 }}>Tokens per second reading the next 2,048 prompt tokens after the given amount of context.</p>
        <LineChart series={lines("pp")} x={ctxAxis} y={{ min: 0, max: 4000, ticks: [0, 1000, 2000, 3000, 4000], fmt: (v) => v.toLocaleString("en-US"), title: "Prefill tok/s" }} />
        <details className="table">
          <summary>Show as table</summary>
          <div className="scroll-x">
            <table className="data">
              <thead><tr><th>Model</th>{DEPTHS.map((d) => <th key={d} className="n">{ctxAxis.fmt(d)}</th>)}</tr></thead>
              <tbody>
                {CTX.flatMap((c) => (["tg", "pp"] as const).map((k) => (
                  <tr key={c.name + k}>
                    <td>{c.focus ? <b>{c.name}</b> : c.name} {k === "tg" ? "decode" : "prefill"}</td>
                    {DEPTHS.map((d, i) => <td key={d} className="n">{c[k][i] != null ? c[k][i].toLocaleString("en-US") : "–"}</td>)}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="note">Welp keeps 65% of its decode speed at 252k (161 to 105 tok/s); Bonsai 2 keeps 54%. At 252k Welp still decodes faster than either 27B model with an empty cache: only 10 of its 40 layers use full attention, the rest are linear-attention (Gated DeltaNet) layers whose cost does not grow with context, and only 3B of its parameters are active per token. Run with <span className="mono">-ub 256</span> for every model, the batch size Welp needs for 262k on 16 GB, so prefill is lower than in Fig III (default batch). UD-IQ3_XXS is left out: same architecture and formats as Welp, same speed (Fig II, III).</p>
      </section>

      <section>
        <h2 className="mono" id="run-it">Run it</h2>
        <p>Welp uses only standard llama.cpp formats, the same as UD-IQ3_XXS. Download it from Hugging Face: <a href="https://huggingface.co/quaedra/Welp-35B-A3B-GGUF">quaedra/Welp-35B-A3B-GGUF</a>. Recipe, scripts and evals are on <a href="https://github.com/quaedra/welp">GitHub</a>.</p>
        <p>Download and serve in one step (llama.cpp caches the file):</p>
        <pre>{`llama-server -hf quaedra/Welp-35B-A3B-GGUF -hff Welp-35B-A3B.gguf \\
  -ngl 99 -fa on -c 262144 -ctk q4_0 -ctv q4_0 -ub 256 --jinja`}</pre>
        <p>Or download the file first and point <span className="mono">-m</span> at it:</p>
        <pre>{`hf download quaedra/Welp-35B-A3B-GGUF Welp-35B-A3B.gguf --local-dir .
llama-server -m Welp-35B-A3B.gguf -ngl 99 -fa on -c 262144 \\
  -ctk q4_0 -ctv q4_0 -ub 256 --jinja`}</pre>
        <p className="note">The server speaks the OpenAI API at <span className="mono">http://localhost:8080/v1</span>, so coding agents such as opencode can use it directly.</p>
        <p className="note">For a more precise KV cache at half the context, use <span className="mono">-c 131072 -ctk q8_0 -ctv q8_0</span>.</p>
        <p className="note aside">Thanks to the Qwen team for the base model, Unsloth for the UD-IQ3_XXS format mix, and llama.cpp for the formats.</p>
      </section>
    </ProjectLayout>
  );
}
