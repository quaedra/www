import type { ReactNode } from "react";

const MARK_PATH =
  "M74 422H134Q143 264 252 264Q362 264 381 422H441Q428 290 336 231Q376 163 436 183L444 153Q356 111 278 206Q265 204 252 204Q106 204 74 422Z";

/** The Quaedra Research mark. */
export function Mark({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="136 112 242 208" aria-hidden="true">
      <path fill="currentColor" transform="translate(91.1667 386.1667) scale(0.64 -0.64)" d={MARK_PATH} />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mono">
      <span>© {new Date().getFullYear()} Quaedra Research</span>
      <nav aria-label="Site">
        <a href="/contact">Contact</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="https://github.com/quaedra">GitHub</a>
        <a href="https://huggingface.co/quaedra">Hugging Face</a>
      </nav>
    </footer>
  );
}

/** Top-level pages (home, contact, legal): the large mark above the title. */
export function SiteLayout({ title, lede, home, children }: {
  title: string;
  lede?: ReactNode;
  /** The home page shows the mark without linking it. */
  home?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="wrap">
      <header>
        {home ? <Mark className="mark" /> : <a className="home" href="/" aria-label="Quaedra Research home"><Mark className="mark" /></a>}
        <h1>{title}</h1>
        {lede}
      </header>
      {children}
      <Footer />
    </div>
  );
}

/** [label, href, current] */
export type MenuItem = [string, string, boolean?];

/** Project pages: the site crumb, the project name, its menu and key figures, then the page. */
export function ProjectLayout({ name, lede, menu, intro, className = "wrap page", children }: {
  name: string;
  lede?: ReactNode;
  menu: MenuItem[];
  /** Shown under the menu, like the key figures on an overview. */
  intro?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <header>
        <a className="crumb mono" href="/"><Mark className="glyph" />Quaedra Research</a>
        <h1>{name}</h1>
        {lede && <p className="lede">{lede}</p>}
        <nav className="links mono" aria-label={name}>
          {menu.map(([label, href, current]) => (
            <a key={label} href={href} aria-current={current ? "page" : undefined}>{label}</a>
          ))}
        </nav>
        {intro}
      </header>
      {children}
      <Footer />
    </div>
  );
}

/** Key figures under a project's menu. */
export function KeyFigures({ items }: { items: [string, string][] }) {
  return (
    <div className="kv">
      {items.map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
    </div>
  );
}
