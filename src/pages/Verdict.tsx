import { KeyFigures, ProjectLayout } from "../ui/Layout";

export default function Verdict() {
  return (
    <ProjectLayout
      name="Verdict"
      lede="A programming language where decisions are the branches. Declare a decision, match on its answers, and the checker makes sure every answer and “not sure” is handled before anything runs."
      menu={[
        ["Overview", "/verdict", true],
        ["Docs", "/verdict/docs/"],
        ["Language", "/verdict/docs/language"],
        ["Design", "/verdict/docs/design"],
        ["GitHub", "https://github.com/quaedra/verdict"],
        ["npm", "https://www.npmjs.com/package/@quaedra/verdict"],
      ]}
      intro={<KeyFigures items={[["v0.1.0", "First release, MIT"], ["3", "Decision types, the same as Jet's"], ["4", "Tiers in an escalation chain"]]} />}
    >
      <section>
        <h2 className="mono">How it works</h2>
        <p>You write ordinary logic: functions, loops, lists and strings. Wherever the program needs judgment, you declare a decision with its question and labeled answers, then <code>match</code> on it. Every <code>match</code> needs an arm for each label and an <code>uncertain</code> arm, so a model that isn't sure takes a path you wrote rather than a guess.</p>
        <pre>{`decision moderate: choice "Is this comment ok to publish?" {
  ok: "harmless comment"
  spam: "ads, links, scams"
  toxic: "insults, harassment"
  examples from "comments.csv"
  tiers builtin -> jet
  threshold 0.85
}

fn action(comment: text) -> text {
  match moderate(comment) {
    ok => "publish"
    spam => "quarantine"
    toxic @ 0.9 => "hide"       // only when p(toxic) ≥ 0.9
    uncertain => "review"       // required: leaving it out is a compile error
  }
}`}</pre>
        <p>At runtime each decision climbs its chain of tiers until one is confident. The first is a small model trained from the decision's own examples; above it sit <a href="/nodd/">Nodd</a> and <a href="/jet">Jet</a>. Several decisions on the same input go to Jet in one request, so it reads the input once.</p>
        <table className="data">
          <thead><tr><th>Tier</th><th>Runs</th><th>What it is</th></tr></thead>
          <tbody>
            <tr><td><code>builtin</code></td><td>Anywhere, no dependencies, under 1 ms</td><td>Hashed n-gram logistic regression with temperature calibration, trained from the decision's examples</td></tr>
            <tr><td><code>nodd</code></td><td>Node or the browser</td><td>A Nodd classifier exported for the decision, with its calibrated threshold</td></tr>
            <tr><td><code>jet</code></td><td>HTTP <code>/v1/decide</code></td><td>Jet, a typed decision model: choices, scores and yes/no probabilities</td></tr>
            <tr><td><code>fn</code></td><td>Anywhere</td><td>Any function: rules, an LLM call or a human queue</td></tr>
          </tbody>
        </table>
        <p className="note aside">A tier that fails, like Jet being down, is recorded and skipped. If every tier is unsure, the answer goes to the <code>uncertain</code> arm. <a href="/verdict/docs/design">Design</a></p>
      </section>

      <section>
        <h2 className="mono">What the checker catches</h2>
        <table className="data">
          <thead><tr><th>Mistake</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td>No <code>uncertain</code> arm</td><td>Compile error</td></tr>
            <tr><td>A label without an arm</td><td>Compile error</td></tr>
            <tr><td>An arm for a label that doesn't exist</td><td>Compile error</td></tr>
            <tr><td>An example labeled with a label that doesn't exist</td><td>Compile error</td></tr>
            <tr><td>Arms returning different types</td><td>Compile error</td></tr>
          </tbody>
        </table>
        <p>The same checks hold in TypeScript. The runtime is also a library, and its <code>match</code> type rejects the same mistakes at compile time.</p>
        <pre>{`import { at, choice, decide, jet, match } from "@quaedra/verdict";
import { builtinFromDisk } from "@quaedra/verdict/node";

const o = await decide(Moderate, comment);
match(o, {
  ok: () => publish(),
  spam: () => quarantine(),
  toxic: at(0.9, () => hide()),
  uncertain: () => review(),   // required: forgetting it won't compile
});`}</pre>
      </section>

      <section>
        <h2 className="mono" id="run-it">Run it</h2>
        <p>Needs Node 22 or later. Programs that use Jet read its address from <code>JET_URL</code>.</p>
        <pre>{`npm install @quaedra/verdict

npx verdict check program.vd    # every error, with line, column and a caret
npx verdict run program.vd      # check, then run
npx verdict build program.vd    # train the builtin tier → .verdict/`}</pre>
        <p className="note"><a href="/verdict/docs/">Read the docs</a> for decision types, tiers and the CLI, or the <a href="/verdict/docs/language">language reference</a>.</p>
      </section>
    </ProjectLayout>
  );
}
