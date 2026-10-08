import { BarChart, Legend } from "../ui/charts";
import { KeyFigures, ProjectLayout } from "../ui/Layout";

const MEGACODE = { name: "megacode", color: "var(--s2)" };

export default function Megacode() {
  return (
    <ProjectLayout
      name="megacode"
      lede="A minimal coding agent for the terminal. One harness for Anthropic, OpenAI, Gemini and any OpenAI-compatible model, local ones included."
      menu={[
        ["Overview", "/megacode", true],
        ["Docs", "/megacode/docs/"],
        ["Benchmark", "/megacode/docs/benchmark"],
        ["GitHub", "https://github.com/quaedra/megacode"],
        ["npm", "https://www.npmjs.com/package/@megacode/cli"],
      ]}
      intro={<KeyFigures items={[["v0.7.0", "Latest release, MIT"], ["9", "Providers, live model lists"], ["75/75", "Benchmark checks passed"]]} />}
    >
      <section>
        <h2 className="mono">How it works</h2>
        <p>megacode runs a plain agent loop: a model turn, then its tool calls, repeated until the model stops. It talks to each provider through its official SDK and keeps the conversation in a neutral format, so you can switch models mid-conversation. Each turn also keeps the provider's own content, so thinking blocks and thought signatures go back to the same provider unchanged.</p>
        <p>Tool results are kept small. File reads return 200 lines at a time, long command output keeps its first and last parts with the full log saved to disk, and the conversation is summarized when it nears the context window.</p>
        <table className="data">
          <thead><tr><th>Feature</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td>Providers</td><td>Anthropic, OpenAI (or a ChatGPT plan), Gemini, OpenRouter, Groq, DeepSeek, Ollama, LM Studio, any compatible server</td></tr>
            <tr><td>Tools</td><td>Read, write and edit files, bash, grep, list files, view images, ask questions</td></tr>
            <tr><td>MCP servers</td><td>stdio, HTTP and SSE, in the same config format as Claude Code</td></tr>
            <tr><td>Skills</td><td>Install <code>SKILL.md</code> skills from a folder or GitHub</td></tr>
            <tr><td>Worktrees</td><td>Work in a separate git worktree with <code>-w</code></td></tr>
            <tr><td>Sessions</td><td>Every conversation is saved; continue it with <code>--resume</code></td></tr>
          </tbody>
        </table>
        <p className="note aside">Written in TypeScript with an Ink terminal UI. The core has no SDK, file or UI dependencies; providers and tools plug in as adapters. <a href="/megacode/docs/#layout">Layout</a></p>
      </section>

      <section>
        <h2 className="mono" id="benchmarks">Benchmarks</h2>
        <p>The harness benchmark is a small smoke test: three fixed coding tasks (a parser, an atomic inventory update, and finding a bug in long log output), each in a fresh workspace and graded by 15 checks the agent never sees.</p>

        <h3>Same model, two harnesses</h3>
        <p className="note" style={{ marginTop: 0 }}>Mean wall time per task in seconds, lower is better. Both on GPT-6 Astra at medium effort through the same gateway, five repeats per task, alternating order.</p>
        {/* Gateway comparison, October 3, 2026: mean wall seconds over five attempts per task */}
        <BarChart
          rows={[
            { label: "range-parser", values: [60.196, 55.169] },
            { label: "inventory", values: [93.78, 87.393] },
            { label: "log-recovery", values: [65.28, 63.676] },
          ]}
          series={[MEGACODE, { name: "Claude Code", color: "var(--s1)" }]}
          min={0} max={100} ticks={[0, 25, 50, 75, 100]}
          fmt={(v, value) => (value ? v.toFixed(1) + " s" : String(v))}
        />
        <Legend items={[{ name: "megacode", color: "var(--s2)" }, { name: "Claude Code", color: "var(--s1)" }]} />
        <table className="data">
          <thead><tr><th>Harness</th><th className="n">Checks</th><th className="n">Suite time</th><th className="n">Input tokens</th><th className="n">Tool calls</th></tr></thead>
          <tbody>
            <tr><td><b>megacode</b></td><td className="n">75/75</td><td className="n">219.3 s</td><td className="n">264,818</td><td className="n">98</td></tr>
            <tr><td>Claude Code</td><td className="n">75/75</td><td className="n">206.2 s</td><td className="n">172,110</td><td className="n">45</td></tr>
          </tbody>
        </table>
        <p className="note">Suite time is the mean of the five three-task runs. Input tokens include cached context and are not cost. Fifteen attempts each; Claude Code 2.1.288 in bare mode. October 3, 2026. <a href="/megacode/docs/gateway-comparison">Every attempt</a></p>
        <p>Both passed every check. Claude Code was 5.9% faster in total and faster in 11 of 15 paired attempts, using about half as many tool calls. 99% of megacode's time is spent waiting on the model, so fewer round trips is where the gap is.</p>

        <h3>Input tokens vs Codex</h3>
        <p className="note" style={{ marginTop: 0 }}>Input tokens per task, including cached context, lower is better. Both on GPT-6 Astra at medium effort via a ChatGPT plan, one run each.</p>
        {/* Codex comparison, October 2, 2026: one run per task */}
        <BarChart
          rows={[
            { label: "range-parser", values: [7400, 60997] },
            { label: "inventory", values: [9502, 74837] },
            { label: "log-recovery", values: [27656, 86611] },
          ]}
          series={[MEGACODE, { name: "Codex", color: "var(--s1)" }]}
          min={0} max={100000} ticks={[0, 25000, 50000, 75000, 100000]}
          fmt={(v, value) => (value ? (v / 1000).toFixed(1) + "k" : v / 1000 + "k")}
        />
        <Legend items={[{ name: "megacode", color: "var(--s2)" }, { name: "Codex CLI 0.153", color: "var(--s1)" }]} />
        <p className="note">Single runs on October 2, 2026; cache warmth wasn't controlled. Both passed 15/15 checks; megacode took 188.4 s in total and Codex 230.3 s. <a href="/megacode/docs/benchmark#local-comparison-one-run-per-harness">Details</a></p>
        <p>With the same model, megacode sent 80% fewer input tokens than Codex. That's one run per harness, not a general claim about speed or cost.</p>

        <h3>Reasoning effort</h3>
        <p>Low effort didn't make megacode faster: across 30 attempts it saved 0.39% of total time and was faster in only 6 of 15 pairs, with every check passing at both levels. <a href="/megacode/docs/effort-comparison">Results</a></p>
      </section>

      <section>
        <h2 className="mono" id="run-it">Run it</h2>
        <p>Needs Node 22.14 or later. Run <code>/login</code> to connect a provider; ChatGPT and OpenRouter support browser sign-in.</p>
        <pre>{`npm install -g @megacode/cli

megacode                          # interactive
megacode "fix the failing test"   # one-shot
megacode -m ollama:qwen3:8b       # any provider:model
megacode -w fix-auth              # in a new git worktree`}</pre>
        <p className="note"><a href="/megacode/docs/">Read the docs</a> for providers, settings, skills, MCP servers and sessions.</p>
      </section>
    </ProjectLayout>
  );
}
