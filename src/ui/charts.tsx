// Horizontal bar charts, a log-x scatter plot, line charts and probability bars, drawn as inline SVG.
// Charts render empty on the server and draw once they know their width.
import { type PointerEvent, type ReactNode, useLayoutEffect, useRef, useState } from "react";

/** The container's width, kept current with a ResizeObserver; 0 until mounted. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current!;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface TipState { content: ReactNode; x: number; y: number }

/** A tooltip that follows the pointer and stays inside the window. */
function useTip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!tip || !el) return;
    const x = Math.min(tip.x + 14, innerWidth - el.offsetWidth - 8);
    const y = tip.y + 14 + el.offsetHeight > innerHeight ? tip.y - el.offsetHeight - 10 : tip.y + 14;
    el.style.left = x + "px";
    el.style.top = y + "px";
  }, [tip]);
  const show = (e: PointerEvent, content: ReactNode) => setTip({ content, x: e.clientX, y: e.clientY });
  const hide = () => setTip(null);
  const node = tip && <div className="tip" ref={ref} style={{ display: "block" }}>{tip.content}</div>;
  return { show, hide, node };
}

export interface BarRow {
  label: string;
  values: (number | null)[];
  /** This row's bars, overriding the series colors. */
  color?: string;
  tip?: ReactNode;
}

export interface BarChartProps {
  rows: BarRow[];
  /** One entry per value; colors are CSS values. */
  series: { name: string; color: string }[];
  min: number;
  max: number;
  ticks?: number[];
  /** Formats ticks (value=false) and bar values (value=true). */
  fmt?: (v: number, value?: boolean) => string;
}

export function BarChart({ rows, series, min, max, ticks = [], fmt = String }: BarChartProps) {
  const [ref, W] = useWidth();
  const tip = useTip();
  const k = series.length;
  const barH = 12;
  const gap = k > 1 ? 3 : 2;
  const rowH = k * barH + (k - 1) * gap + 12;

  let svg = null;
  if (W > 0) {
    const labelW = Math.min(150, Math.max(96, W * 0.3));
    const valueW = 46;
    const x0 = labelW + 8;
    const plotW = Math.max(60, W - x0 - valueW);
    const H = rows.length * rowH + 22;
    const sx = (v: number) => x0 + ((v - min) / (max - min)) * plotW;
    const base = sx(Math.max(min, Math.min(0, max)));
    svg = (
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 && min < 0 ? "zero" : "grid"} x1={sx(t)} x2={sx(t)} y1={0} y2={H - 18} />
            <text x={sx(t)} y={H - 4} textAnchor="middle">{fmt(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = i * rowH;
          const content = r.tip ?? <><b>{r.label}</b>{r.values.map((v, j) => <span key={j}><br />{series[j].name}: {v == null ? "–" : fmt(v, true)}</span>)}</>;
          return (
            <g key={r.label} className="row" onPointerMove={(e) => tip.show(e, content)} onPointerLeave={tip.hide}>
              <rect className="hit" x={0} y={y} width={W} height={rowH} rx={4} />
              <text x={labelW} y={y + rowH / 2 + 4} textAnchor="end">{r.label}</text>
              {r.values.map((v, j) => {
                if (v == null) return null;
                const by = y + 6 + j * (barH + gap);
                const end = sx(v);
                const left = Math.min(base, end);
                const w = Math.max(2, Math.abs(end - base));
                return (
                  <g key={j}>
                    <rect x={left} y={by} width={w} height={barH} rx={Math.min(3, w / 2)} fill={r.color ?? series[j].color} />
                    <text className="v" x={left + w + 4} y={by + barH / 2 + 4}>{fmt(v, true)}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    );
  }
  return <div className="chart" ref={ref}>{svg}{tip.node}</div>;
}

export interface ScatterPoint {
  label: string;
  x: number;
  y: number;
  group: string;
  /** Where the direct label goes. */
  side?: "l" | "r" | "t" | "b";
  tip?: ReactNode;
}

interface Axis { min: number; max: number; ticks: number[]; fmt: (v: number) => string; title: string }

export interface ScatterChartProps {
  points: ScatterPoint[];
  /** "focus" is drawn larger and on top; diamonds are drawn above everything. */
  groups: Record<string, { name: string; color: string; shape?: "circle" | "diamond" }>;
  /** Log-scaled. */
  x: Axis;
  y: Axis;
  /** Labels of points joined by a dashed line, in order; drawn in the first point's color. */
  line?: string[];
  /** A marked threshold on the x axis. */
  vline?: { x: number; label: string };
}

export function ScatterChart({ points, groups, x, y, line = [], vline }: ScatterChartProps) {
  const [ref, W] = useWidth();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);

  let svg = null;
  if (W > 0) {
    const H = W < 480 ? 280 : 320;
    const m = { l: 58, r: 12, t: 12, b: 40 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const sx = (v: number) => m.l + (Math.log(v / x.min) / Math.log(x.max / x.min)) * pw;
    const sy = (v: number) => m.t + (1 - (v - y.min) / (y.max - y.min)) * ph;
    const byLabel = new Map(points.map((p) => [p.label, p]));
    const linePoints = line.map((l) => byLabel.get(l)!);
    // Paint order: the rest, then the focus mark, then diamonds, so overlapping marks stay visible.
    const rank = (p: ScatterPoint) => (groups[p.group].shape === "diamond" ? 2 : p.group === "focus" ? 1 : 0);
    const ordered = [...points].sort((a, b) => rank(a) - rank(b));

    const onMove = (e: PointerEvent<SVGSVGElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
      let best: ScatterPoint | null = null, bd = 24 * 24;
      for (const p of points) {
        const d = (sx(p.x) - px) ** 2 + (sy(p.y) - py) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
      setHover(best?.label ?? null);
      if (best) tip.show(e, best.tip ?? <><b>{best.label}</b><br />{x.fmt(best.x)}, {y.fmt(best.y)}</>);
      else tip.hide();
    };

    svg = (
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" onPointerMove={onMove} onPointerLeave={() => { tip.hide(); setHover(null); }}>
        {y.ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} />
            <text x={m.l - 8} y={sy(t) + 4} textAnchor="end">{y.fmt(t)}</text>
          </g>
        ))}
        {x.ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} />
            <text x={sx(t)} y={H - m.b + 16} textAnchor="middle">{x.fmt(t)}</text>
          </g>
        ))}
        <text x={m.l + pw / 2} y={H - 4} textAnchor="middle">{x.title}</text>
        <text x={0} y={0} textAnchor="middle" transform={`translate(11 ${m.t + ph / 2}) rotate(-90)`}>{y.title}</text>
        {vline && (
          <>
            <line className="vline" x1={sx(vline.x)} x2={sx(vline.x)} y1={m.t} y2={H - m.b} />
            <text x={sx(vline.x) - 6} y={m.t + 12} textAnchor="end">{vline.label}</text>
          </>
        )}
        {linePoints.length > 1 && (
          <polyline className="frontier" points={linePoints.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} stroke={groups[linePoints[0].group].color} />
        )}
        {points.map((p) => {
          const cx = sx(p.x), cy = sy(p.y), r = p.group === "focus" ? 6 : 5;
          const side = p.side ?? "r";
          const lx = side === "l" ? cx - r - 6 : side === "r" ? cx + r + 6 : cx;
          const ly = side === "t" ? cy - r - 6 : side === "b" ? cy + r + 14 : cy + 4;
          return (
            <text key={p.label} className={p.group === "focus" ? "v" : undefined} x={lx} y={ly} textAnchor={side === "l" ? "end" : side === "r" ? "start" : "middle"}>
              {p.label}
            </text>
          );
        })}
        {ordered.map((p) => {
          const g = groups[p.group];
          const cx = sx(p.x), cy = sy(p.y), r = p.group === "focus" ? 6 : 5;
          const cls = hover === p.label ? "dot on" : "dot";
          return g.shape === "diamond"
            ? <rect key={p.label} className={cls} x={cx - r * 0.8} y={cy - r * 0.8} width={r * 1.6} height={r * 1.6} rx={1.5} transform={`rotate(45 ${cx} ${cy})`} fill={g.color} />
            : <circle key={p.label} className={cls} cx={cx} cy={cy} r={r} fill={g.color} />;
        })}
      </svg>
    );
  }
  return <div className="chart" ref={ref}>{svg}{tip.node}</div>;
}

export interface LineSeries {
  name: string;
  color: string;
  points: { x: number; y: number }[];
  /** Drawn thicker and on top. */
  focus?: boolean;
  /** Marks the last point with a cross: the series cannot go further (e.g. out of memory). */
  endCross?: boolean;
}

export interface LineChartProps {
  series: LineSeries[];
  /** Linear. */
  x: Axis;
  y: Axis;
  vline?: { x: number; label: string };
}

/** Lines over a linear x axis with a direct label at each line's end and a tooltip for the nearest point. */
export function LineChart({ series, x, y, vline }: LineChartProps) {
  const [ref, W] = useWidth();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);

  let svg = null;
  if (W > 0) {
    const H = W < 480 ? 280 : 320;
    // Right margin fits the longest end label (about 7 px per character at 12 px).
    const m = { l: 58, r: 14 + 7 * Math.max(...series.filter((s) => !s.endCross).map((s) => s.name.length)), t: 12, b: 40 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const sx = (v: number) => m.l + ((v - x.min) / (x.max - x.min)) * pw;
    const sy = (v: number) => m.t + (1 - (v - y.min) / (y.max - y.min)) * ph;
    const ordered = [...series].sort((a, b) => Number(!!a.focus) - Number(!!b.focus));
    // End labels at the right, nudged apart vertically so they never overlap; a line that stops early
    // (endCross) is labeled below its last point instead, where other lines are unlikely to run.
    const ends = series.filter((s) => !s.endCross).map((s) => ({ s, y: sy(s.points[s.points.length - 1].y) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14);

    const onMove = (e: PointerEvent<SVGSVGElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
      let best: { s: LineSeries; p: { x: number; y: number } } | null = null, bd = 24 * 24;
      for (const s of series) for (const p of s.points) {
        const d = (sx(p.x) - px) ** 2 + (sy(p.y) - py) ** 2;
        if (d < bd) { bd = d; best = { s, p }; }
      }
      setHover(best ? best.s.name + best.p.x : null);
      if (best) tip.show(e, <><b>{best.s.name}</b><br />{x.fmt(best.p.x)} context: {y.fmt(best.p.y)}</>);
      else tip.hide();
    };

    svg = (
      <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" onPointerMove={onMove} onPointerLeave={() => { tip.hide(); setHover(null); }}>
        {y.ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} />
            <text x={m.l - 8} y={sy(t) + 4} textAnchor="end">{y.fmt(t)}</text>
          </g>
        ))}
        {x.ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} />
            <text x={sx(t)} y={H - m.b + 16} textAnchor="middle">{x.fmt(t)}</text>
          </g>
        ))}
        <text x={m.l + pw / 2} y={H - 4} textAnchor="middle">{x.title}</text>
        <text x={0} y={0} textAnchor="middle" transform={`translate(11 ${m.t + ph / 2}) rotate(-90)`}>{y.title}</text>
        {vline && (
          <>
            <line className="vline" x1={sx(vline.x)} x2={sx(vline.x)} y1={m.t} y2={H - m.b} />
            <text x={sx(vline.x) - 6} y={m.t + 12} textAnchor="end">{vline.label}</text>
          </>
        )}
        {ordered.map((s) => {
          const last = s.points[s.points.length - 1];
          const r = s.focus ? 4.5 : 3.5;
          return (
            <g key={s.name}>
              <polyline className="line" points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} stroke={s.color} strokeWidth={s.focus ? 2.5 : 1.75} />
              {s.points.map((p) => (
                <circle key={p.x} className={hover === s.name + p.x ? "dot on" : "dot"} cx={sx(p.x)} cy={sy(p.y)} r={r} fill={s.color} />
              ))}
              {s.endCross && (
                <path className="cross" d={`M${sx(last.x) + 7},${sy(last.y) - 5}l10,10m0,-10l-10,10`} stroke={s.color} />
              )}
            </g>
          );
        })}
        {ends.map(({ s, y: ly }) => (
          <text key={s.name} className={s.focus ? "v" : undefined} x={sx(s.points[s.points.length - 1].x) + 8} y={ly + 4}>{s.name}</text>
        ))}
        {series.filter((s) => s.endCross).map((s) => {
          const last = s.points[s.points.length - 1];
          return <text key={s.name} x={sx(last.x)} y={sy(last.y) + 20} textAnchor="end">{s.name}</text>;
        })}
      </svg>
    );
  }
  return <div className="chart" ref={ref}>{svg}{tip.node}</div>;
}

/** Probability bars for demo outputs; the highlighted label (default: the most likely) is emphasized. */
export function ProbBars({ items, highlight }: { items: { label: string; p: number }[]; highlight?: string }) {
  const top = highlight ?? items.reduce((a, b) => (b.p > a.p ? b : a)).label;
  return (
    <div className="bars">
      {items.map(({ label, p }) => (
        <div key={label} className={label === top ? "bar top" : "bar"}>
          <span className="lbl" title={label}>{label}</span>
          <span className="track"><span className="fill" style={{ width: (p * 100).toFixed(2) + "%" }} /></span>
          <span className="pct">{(p * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

/** A legend row: circle, diamond, square swatch or dashed line, then the name. */
export function Legend({ items }: { items: { name: string; color?: string; shape?: "circle" | "diamond" | "dash" }[] }) {
  return (
    <div className="legend" aria-hidden="true">
      {items.map((it) => (
        <span key={it.name}><i className={it.shape} style={it.color ? { background: it.color } : undefined} />{it.name}</span>
      ))}
    </div>
  );
}
