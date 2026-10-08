import { SiteLayout } from "../ui/Layout";

const PROJECTS: { name: string; href?: string; status: [string, "live" | "training"]; desc: string }[] = [
  {
    name: "Welp",
    href: "/welp",
    status: ["Research build", "training"],
    desc: "Welp-35B-A3B, a 35B mixture-of-experts model in 13.21 GB. Runs on a 16 GB GPU with the full 262k context and beats UD-IQ3_XXS at the same size.",
  },
  {
    name: "megacode",
    href: "/megacode",
    status: ["Released", "live"],
    desc: "A minimal coding agent for the terminal, for Anthropic, OpenAI, Gemini and any OpenAI-compatible or local model.",
  },
  {
    name: "Jet",
    href: "/jet",
    status: ["Released", "live"],
    desc: "A family of typed decision models, starting with Jet-4B. Returns choices, scores and calibrated probabilities instead of text.",
  },
  {
    name: "Nodd",
    href: "/nodd/",
    status: ["Released", "live"],
    desc: "Tiny, calibrated text classifiers that run in the browser, offline, in about 20 MB.",
  },
  { name: "Hestrel", status: ["Released", "live"], desc: "A Quaedra model." },
];

export default function Home() {
  return (
    <SiteLayout home title="Quaedra Research" lede={<p className="lede">We build compact models, AI tools and agent harnesses.</p>}>
      <section>
        <h2 className="mono">Projects</h2>
        <ul className="projects">
          {PROJECTS.map((p) => (
            <li key={p.name}>
              {p.href ? <a className="name" href={p.href}>{p.name}</a> : <span className="name">{p.name}</span>}
              <span className={`status mono ${p.status[1]}`}>{p.status[0]}</span>
              <span className="desc">{p.desc}</span>
            </li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
