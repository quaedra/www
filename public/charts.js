// Minimal horizontal bar charts (single, grouped, diverging) drawn as inline SVG.
const NS = "http://www.w3.org/2000/svg";
const tip = document.createElement("div");
tip.className = "tip";
document.body.appendChild(tip);

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function showTip(e, html) {
  tip.innerHTML = html;
  tip.style.display = "block";
  const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
  const y = e.clientY + 14 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 14;
  tip.style.left = x + "px";
  tip.style.top = y + "px";
}
const hideTip = () => (tip.style.display = "none");

/**
 * opts: {
 *   rows: [{ label, values: number[], tip?: string, color?: string }],   // color: this row's bars
 *   series: [{ name, color }],     // one entry per value; colors are CSS values
 *   min, max, ticks: number[], fmt: v => string,
 *   diverging?: bool                // color by sign: series[0] positive, negColor negative
 *   negColor?: string
 * }
 */
export function barChart(container, opts) {
  const { rows, series, min, max, ticks = [], fmt = String, diverging = false, negColor = "var(--neg)" } = opts;
  const k = series.length;
  const barH = 12;
  const gap = k > 1 ? 3 : 2;
  const rowH = k * barH + (k - 1) * gap + 12;

  function render() {
    container.querySelector("svg")?.remove();
    const W = container.clientWidth;
    const labelW = Math.min(150, Math.max(96, W * 0.3));
    const valueW = 46;
    const x0 = labelW + 8;
    const plotW = Math.max(60, W - x0 - valueW);
    const H = rows.length * rowH + 22;
    const sx = (v) => x0 + ((v - min) / (max - min)) * plotW;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, height: H, role: "img" });

    for (const t of ticks) {
      el("line", { class: t === 0 && min < 0 ? "zero" : "grid", x1: sx(t), x2: sx(t), y1: 0, y2: H - 18 }, svg);
      const tx = el("text", { x: sx(t), y: H - 4, "text-anchor": "middle" }, svg);
      tx.textContent = fmt(t);
    }

    rows.forEach((r, i) => {
      const y = i * rowH;
      const g = el("g", { class: "row" }, svg);
      el("rect", { class: "hit", x: 0, y, width: W, height: rowH, rx: 4 }, g);
      const lt = el("text", { x: labelW, y: y + rowH / 2 + 4, "text-anchor": "end" }, g);
      lt.textContent = r.label;
      r.values.forEach((v, j) => {
        if (v == null) return;
        const by = y + 6 + j * (barH + gap);
        const base = sx(Math.max(min, Math.min(0, max)));
        const end = sx(v);
        const left = Math.min(base, end);
        const w = Math.max(2, Math.abs(end - base));
        const color = r.color ?? (diverging ? (v < 0 ? negColor : series[0].color) : series[j].color);
        el("rect", { x: left, y: by, width: w, height: barH, rx: Math.min(3, w / 2), fill: color }, g);
        const vt = el("text", {
          class: "v",
          x: v < 0 && diverging ? left - 4 : left + w + 4,
          y: by + barH / 2 + 4,
          "text-anchor": v < 0 && diverging ? "end" : "start",
        }, g);
        vt.textContent = fmt(v, true);
        if (v < 0 && diverging && left - 4 < x0 + 30) {
          vt.setAttribute("x", left + w + 4);
          vt.setAttribute("text-anchor", "start");
        }
      });
      const html = r.tip || `<b>${r.label}</b><br>` + r.values.map((v, j) => `${series[j].name}: ${fmt(v, true)}`).join("<br>");
      g.addEventListener("pointermove", (e) => showTip(e, html));
      g.addEventListener("pointerleave", hideTip);
    });
    container.appendChild(svg);
  }

  render();
  let w = container.clientWidth;
  new ResizeObserver(() => {
    if (container.clientWidth !== w) { w = container.clientWidth; render(); }
  }).observe(container);
}

/** Probability bars for demo outputs. items: [{label, p}] */
export function probBars(container, items, { highlight } = {}) {
  container.innerHTML = "";
  const top = highlight ?? items.reduce((a, b) => (b.p > a.p ? b : a)).label;
  for (const { label, p } of items) {
    const row = document.createElement("div");
    row.className = "bar" + (label === top ? " top" : "");
    row.innerHTML = `<span class="lbl"></span><span class="track"><span class="fill"></span></span><span class="pct">${(p * 100).toFixed(1)}%</span>`;
    row.querySelector(".lbl").textContent = label;
    row.querySelector(".lbl").title = label;
    row.querySelector(".fill").style.width = (p * 100).toFixed(2) + "%";
    container.appendChild(row);
  }
}

/**
 * Scatter plot with a log-scaled x axis.
 * opts: {
 *   points: [{ label, x, y, group, side?: "l" | "r" | "t" | "b" }],   // side: where the direct label goes
 *   groups: { [key]: { name, color, shape?: "circle" | "diamond" } },
 *   x: { min, max, ticks, fmt, title }, y: { min, max, ticks, fmt, title },
 *   line?: string[],                 // labels of points joined by a dashed line, in order
 *   vline?: { x, label },            // a marked threshold on the x axis
 *   tip?: p => string,
 * }
 */
export function scatterChart(container, opts) {
  const { points, groups, x, y, line = [], vline, tip: tipFor } = opts;

  function render() {
    container.querySelector("svg")?.remove();
    const W = container.clientWidth;
    const H = W < 480 ? 280 : 320;
    const m = { l: 58, r: 12, t: 12, b: 40 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const sx = (v) => m.l + (Math.log(v / x.min) / Math.log(x.max / x.min)) * pw;
    const sy = (v) => m.t + (1 - (v - y.min) / (y.max - y.min)) * ph;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, height: H, role: "img" });

    for (const t of y.ticks) {
      el("line", { class: "grid", x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t) }, svg);
      const tx = el("text", { x: m.l - 8, y: sy(t) + 4, "text-anchor": "end" }, svg);
      tx.textContent = y.fmt(t);
    }
    for (const t of x.ticks) {
      el("line", { class: "grid", x1: sx(t), x2: sx(t), y1: m.t, y2: H - m.b }, svg);
      const tx = el("text", { x: sx(t), y: H - m.b + 16, "text-anchor": "middle" }, svg);
      tx.textContent = x.fmt(t);
    }
    const xt = el("text", { x: m.l + pw / 2, y: H - 4, "text-anchor": "middle" }, svg);
    xt.textContent = x.title;
    const yt = el("text", { x: 0, y: 0, "text-anchor": "middle", transform: `translate(11 ${m.t + ph / 2}) rotate(-90)` }, svg);
    yt.textContent = y.title;

    if (vline) {
      el("line", { class: "vline", x1: sx(vline.x), x2: sx(vline.x), y1: m.t, y2: H - m.b }, svg);
      const vt = el("text", { x: sx(vline.x) - 6, y: m.t + 12, "text-anchor": "end" }, svg);
      vt.textContent = vline.label;
    }

    const byLabel = Object.fromEntries(points.map((p) => [p.label, p]));
    if (line.length > 1) {
      const lp = line.map((l) => byLabel[l]);
      el("polyline", {
        class: "frontier",
        points: lp.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" "),
        stroke: groups[lp[0].group].color,
      }, svg);
    }

    const dots = points.map((p) => {
      const g = groups[p.group];
      const cx = sx(p.x), cy = sy(p.y);
      const r = p.group === "focus" ? 6 : 5;
      const mark = g.shape === "diamond"
        ? el("rect", { class: "dot", x: cx - r * 0.8, y: cy - r * 0.8, width: r * 1.6, height: r * 1.6, rx: 1.5, transform: `rotate(45 ${cx} ${cy})`, fill: g.color }, svg)
        : el("circle", { class: "dot", cx, cy, r, fill: g.color }, svg);
      const side = p.side || "r";
      const lx = side === "l" ? cx - r - 6 : side === "r" ? cx + r + 6 : cx;
      const ly = side === "t" ? cy - r - 6 : side === "b" ? cy + r + 14 : cy + 4;
      const lt = el("text", { class: p.group === "focus" ? "v" : "", x: lx, y: ly, "text-anchor": side === "l" ? "end" : side === "r" ? "start" : "middle" }, svg);
      lt.textContent = p.label;
      return { p, cx, cy, mark };
    });
    // Raise the focus mark above its group, and diamonds above both, so overlapping marks stay visible.
    for (const d of dots) if (d.p.group === "focus") svg.appendChild(d.mark);
    for (const d of dots) if (groups[d.p.group].shape === "diamond") svg.appendChild(d.mark);

    svg.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
      let best = null, bd = 24 * 24;
      for (const d of dots) {
        const dd = (d.cx - px) ** 2 + (d.cy - py) ** 2;
        if (dd < bd) { bd = dd; best = d; }
      }
      for (const d of dots) d.mark.classList.toggle("on", d === best);
      if (best) showTip(e, tipFor ? tipFor(best.p) : `<b>${best.p.label}</b><br>${x.fmt(best.p.x)}, ${y.fmt(best.p.y)}`);
      else hideTip();
    });
    svg.addEventListener("pointerleave", () => { hideTip(); for (const d of dots) d.mark.classList.remove("on"); });
    container.appendChild(svg);
  }

  render();
  let w = container.clientWidth;
  new ResizeObserver(() => {
    if (container.clientWidth !== w) { w = container.clientWidth; render(); }
  }).observe(container);
}
