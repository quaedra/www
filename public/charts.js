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
 *   rows: [{ label, values: number[], tip?: string }],
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
        const color = diverging ? (v < 0 ? negColor : series[0].color) : series[j].color;
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
