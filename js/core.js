/* StratLab core: registry, helpers, charts, results log */
(function () {
  'use strict';

  const GT = {
    games: [],
    register(game) { this.games.push(game); },
    byId(id) { return this.games.find(g => g.id === id); }
  };

  /* ---------- small helpers ---------- */
  GT.$ = (sel, root) => (root || document).querySelector(sel);
  GT.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  GT.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  GT.fmt = (x, d = 0) => {
    if (x === null || x === undefined || Number.isNaN(x)) return '–';
    return Number(x).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  GT.pct = (x, d = 0) => GT.fmt(x * 100, d) + '%';
  GT.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  GT.sum = arr => arr.reduce((a, b) => a + b, 0);
  GT.mean = arr => arr.length ? GT.sum(arr) / arr.length : 0;
  GT.rand = (a, b) => a + Math.random() * (b - a);
  GT.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  GT.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  GT.shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  GT.normal = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  GT.parseNums = text => (String(text).match(/-?\d+(\.\d+)?/g) || []).map(Number);
  GT.permutations = arr => {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    arr.forEach((x, i) => GT.permutations(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(p => out.push([x].concat(p))));
    return out;
  };

  GT.toast = msg => {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  };

  GT.copy = text => {
    try {
      navigator.clipboard.writeText(text).then(() => GT.toast('Copied to clipboard'), () => GT.toast('Copy failed — select and copy manually'));
    } catch (e) { GT.toast('Copy failed — select and copy manually'); }
  };

  GT.download = (filename, text, type = 'text/plain') => {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };

  /* Sub-tab helper: buttons with data-sub inside .subtabs, panes with data-pane */
  GT.subtabs = (root, onChange) => {
    const btns = GT.$$('.subtab', root);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.classList.toggle('active', x === b));
      GT.$$('[data-pane]', root).forEach(p => p.classList.toggle('hide', !p.dataset.pane.split(' ').includes(b.dataset.sub)));
      if (onChange) onChange(b.dataset.sub);
    }));
  };

  /* Range slider binding: <input type=range data-k="name"> and <span data-v="name"> */
  GT.bindRanges = (root, onInput, formatters = {}) => {
    const read = () => {
      const o = {};
      GT.$$('input[data-k], select[data-k]', root).forEach(i => { o[i.dataset.k] = i.type === 'range' || i.type === 'number' ? parseFloat(i.value) : (i.value !== '' && !isNaN(+i.value) ? +i.value : i.value); });
      return o;
    };
    const paint = () => {
      const o = read();
      GT.$$('[data-v]', root).forEach(s => { const k = s.dataset.v; const f = formatters[k]; s.textContent = f ? f(o[k]) : o[k]; });
      return o;
    };
    GT.$$('input[data-k], select[data-k]', root).forEach(i => i.addEventListener('input', () => onInput(paint())));
    return paint;
  };

  /* ---------- results log (per browser) ---------- */
  const LOG_KEY = 'stratlab.results.v1';
  GT.readLog = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; } };
  const saveLog = all => { try { localStorage.setItem(LOG_KEY, JSON.stringify(all.slice(-500))); } catch (e) { /* storage unavailable */ } };

  /* ---------- student identity + Google Sheet sync ---------- */
  const ID_KEY = 'stratlab.student.v1';
  const CFG = window.STRATLAB_CONFIG || {};
  GT.sheetOn = () => /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test((CFG.sheetUrl || '').trim());
  GT.identity = () => { try { const v = JSON.parse(localStorage.getItem(ID_KEY) || 'null'); return v && v.name && v.roll ? v : null; } catch (e) { return null; } };
  GT.setIdentity = (name, roll) => { try { localStorage.setItem(ID_KEY, JSON.stringify({ name, roll })); } catch (e) { } };
  GT.clearIdentity = () => { try { localStorage.removeItem(ID_KEY); } catch (e) { } };

  function markSent(id) {
    const all = GT.readLog(); const r = all.find(x => x.id === id);
    if (r) { r.sent = true; saveLog(all); }
  }
  GT.send = rec => {
    const who = GT.identity();
    if (!GT.sheetOn() || !who || rec.sent) return Promise.resolve(false);
    let data = '';
    try { data = JSON.stringify(rec.data || {}); } catch (e) { data = ''; }
    const payload = { id: rec.id, t: rec.t, roll: who.roll, name: who.name, game: rec.game, title: rec.title, summary: rec.summary, data: data.slice(0, 5000) };
    // text/plain + no-cors avoids a CORS preflight, which Apps Script web apps do not answer
    return fetch(CFG.sheetUrl.trim(), { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(() => { markSent(rec.id); return true; })
      .catch(() => false);
  };
  GT.resendUnsent = async () => {
    let n = 0;
    for (const r of GT.readLog().filter(r => !r.sent)) { if (await GT.send(r)) n++; }
    return n;
  };

  GT.log = (gameId, summary, data) => {
    const g = GT.byId(gameId);
    const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), t: new Date().toISOString(), game: gameId, title: g ? g.title : gameId, summary, data: data || {} };
    const all = GT.readLog(); all.push(rec); saveLog(all);
    GT.send(rec);
    if (typeof GT.onLog === 'function') { try { GT.onLog(rec); } catch (e) { } }
    return rec;
  };
  GT.clearLog = () => { try { localStorage.removeItem(LOG_KEY); } catch (e) { } };

  /* ---------- SVG charts ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function niceTicks(min, max, n = 5) {
    if (min === max) { max = min + 1; }
    const span = max - min, step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag;
    const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }

  /**
   * GT.chart.line(el, {series:[{name,color,points:[[x,y]],dash,dots,width}], xMin,xMax,yMin,yMax,xLabel,yLabel,
   *   height, hlines:[{y,label,color}], vlines:[{x,label,color}], markers:[{x,y,color,label,r}], area:false})
   */
  GT.chart = {};
  GT.chart.line = (el, o) => {
    const W = 640, H = o.height || 300, m = { l: 52, r: 18, t: 16, b: 40 };
    const all = o.series.flatMap(s => s.points);
    const xs = all.map(p => p[0]).concat((o.markers || []).map(p => p.x));
    const ys = all.map(p => p[1]).concat((o.markers || []).map(p => p.y)).concat((o.hlines || []).map(h => h.y));
    let xMin = o.xMin ?? Math.min(...xs, 0), xMax = o.xMax ?? Math.max(...xs, 1);
    let yMin = o.yMin ?? Math.min(...ys, 0), yMax = o.yMax ?? Math.max(...ys, 1);
    if (!isFinite(xMin)) { xMin = 0; xMax = 1; }
    if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
    if (yMax === yMin) yMax = yMin + 1;
    if (xMax === xMin) xMax = xMin + 1;
    const X = x => m.l + (x - xMin) / (xMax - xMin) * (W - m.l - m.r);
    const Y = y => H - m.b - (y - yMin) / (yMax - yMin) * (H - m.t - m.b);
    const cid = 'clip' + Math.random().toString(36).slice(2, 8);
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="${NS}" role="img"><defs><clipPath id="${cid}"><rect x="${m.l}" y="${m.t - 4}" width="${W - m.l - m.r}" height="${H - m.t - m.b + 4}"/></clipPath></defs>`;
    niceTicks(yMin, yMax, 5).forEach(t => {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" style="stroke:var(--line-2);stroke-width:.7;stroke-dasharray:1 3"/>`;
      s += `<text x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${GT.fmt(t, Math.abs(t) < 10 && t % 1 ? 2 : 0)}</text>`;
    });
    niceTicks(xMin, xMax, o.xTicks || 6).forEach(t => {
      s += `<text x="${X(t)}" y="${H - m.b + 16}" text-anchor="middle">${GT.fmt(t, Math.abs(t) < 10 && t % 1 ? 2 : 0)}</text>`;
    });
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" style="stroke:var(--line-2)"/>`;
    if (o.xLabel) s += `<text x="${(W + m.l) / 2}" y="${H - 6}" text-anchor="middle" style="font-weight:600">${GT.esc(o.xLabel)}</text>`;
    if (o.yLabel) s += `<text transform="translate(13 ${(H - m.b + m.t) / 2}) rotate(-90)" text-anchor="middle" style="font-weight:600">${GT.esc(o.yLabel)}</text>`;
    (o.hlines || []).forEach(h => {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(h.y)}" y2="${Y(h.y)}" style="stroke:${h.color || 'var(--amber)'};stroke-width:1.5;stroke-dasharray:5 4"/>`;
      if (h.label) s += `<text x="${W - m.r - 4}" y="${Y(h.y) - 5}" text-anchor="end" style="fill:${h.color || 'var(--amber)'};font-weight:600">${GT.esc(h.label)}</text>`;
    });
    (o.vlines || []).forEach(v => {
      s += `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${m.t}" y2="${H - m.b}" style="stroke:${v.color || 'var(--amber)'};stroke-width:1.5;stroke-dasharray:5 4"/>`;
      if (v.label) s += `<text x="${X(v.x) + 5}" y="${m.t + 10}" style="fill:${v.color || 'var(--amber)'};font-weight:600">${GT.esc(v.label)}</text>`;
    });
    s += `<g clip-path="url(#${cid})">`;
    o.series.forEach(se => {
      if (!se.points.length) return;
      const d = se.points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
      if (se.area) s += `<path d="${d}L${X(se.points[se.points.length - 1][0])},${Y(yMin)}L${X(se.points[0][0])},${Y(yMin)}Z" style="fill:${se.color};opacity:.12"/>`;
      if (!se.noLine) s += `<path d="${d}" style="fill:none;stroke:${se.color};stroke-width:${se.width || 2.4};${se.dash ? 'stroke-dasharray:' + se.dash : ''};stroke-linejoin:round;stroke-linecap:round"/>`;
      if (se.dots) se.points.forEach(p => { s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${se.r || 3.5}" style="fill:${se.color}"/>`; });
    });
    s += '</g>';
    (o.markers || []).forEach(mk => {
      const eqm = !mk.color || mk.color === 'var(--amber)';
      s += `<circle cx="${X(mk.x)}" cy="${Y(mk.y)}" r="${mk.r || 6}" style="fill:${eqm ? 'var(--hl)' : mk.color};stroke:var(--ink);stroke-width:1.5"/>`;
      if (mk.label) s += `<text x="${X(mk.x) + 10}" y="${Y(mk.y) - 8}" style="fill:var(--ink);font-weight:600;paint-order:stroke;stroke:var(--surface);stroke-width:3px">${GT.esc(mk.label)}</text>`;
    });
    s += '</svg>';
    const legend = o.series.filter(se => se.name).map(se => `<span><i style="background:${se.color}"></i>${GT.esc(se.name)}</span>`).join('');
    el.innerHTML = `<div class="chart">${s}${legend ? `<div class="legend">${legend}</div>` : ''}</div>`;
  };

  /** GT.chart.bars(el, {bars:[{label,value,color,note}], height, yLabel, hlines, yMax, yMin, vmark:{index,label}}) */
  GT.chart.bars = (el, o) => {
    const W = 640, H = o.height || 260, m = { l: 48, r: 12, t: 14, b: o.rotate ? 70 : 42 };
    const vals = o.bars.map(b => b.value);
    const yMax = o.yMax ?? Math.max(...vals, ...(o.hlines || []).map(h => h.y), 1) * 1.08;
    const yMin = o.yMin ?? Math.min(0, ...vals);
    const Y = y => H - m.b - (y - yMin) / (yMax - yMin) * (H - m.t - m.b);
    const bw = (W - m.l - m.r) / o.bars.length;
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="${NS}" role="img">`;
    niceTicks(yMin, yMax, 5).forEach(t => {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" style="stroke:var(--line-2);stroke-width:.7;stroke-dasharray:1 3"/>`;
      s += `<text x="${m.l - 7}" y="${Y(t) + 4}" text-anchor="end">${GT.fmt(t, t % 1 ? 1 : 0)}</text>`;
    });
    o.bars.forEach((b, i) => {
      const x = m.l + i * bw + bw * 0.12, w = bw * 0.76;
      const y0 = Y(Math.max(0, b.value)), y1 = Y(Math.min(0, b.value));
      s += `<rect x="${x}" y="${y0}" width="${w}" height="${Math.max(1, y1 - y0)}" rx="3" style="fill:${b.color || 'var(--accent)'}"/>`;
      if (o.showValues !== false && bw > 22) s += `<text x="${x + w / 2}" y="${y0 - 4}" text-anchor="middle" style="fill:var(--ink-2);font-weight:600">${GT.fmt(b.value, o.decimals || 0)}</text>`;
      if (o.rotate) s += `<text transform="translate(${x + w / 2} ${H - m.b + 12}) rotate(-35)" text-anchor="end">${GT.esc(b.label)}</text>`;
      else if (bw > 14 || i % Math.ceil(14 / bw) === 0) s += `<text x="${x + w / 2}" y="${H - m.b + 16}" text-anchor="middle">${GT.esc(b.label)}</text>`;
    });
    (o.hlines || []).forEach(h => {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(h.y)}" y2="${Y(h.y)}" style="stroke:${h.color || 'var(--amber)'};stroke-width:1.5;stroke-dasharray:5 4"/>`;
      if (h.label) s += `<text x="${W - m.r - 2}" y="${Y(h.y) - 5}" text-anchor="end" style="fill:${h.color || 'var(--amber)'};font-weight:600">${GT.esc(h.label)}</text>`;
    });
    (o.vmarks || []).forEach(v => {
      const x = m.l + v.pos * bw;
      s += `<line x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}" style="stroke:${v.color || 'var(--amber)'};stroke-width:2;stroke-dasharray:5 4"/>`;
      s += `<text x="${x + 4}" y="${m.t + 10}" style="fill:${v.color || 'var(--amber)'};font-weight:700">${GT.esc(v.label)}</text>`;
    });
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--line-2)"/>`;
    if (o.yLabel) s += `<text transform="translate(12 ${(H - m.b + m.t) / 2}) rotate(-90)" text-anchor="middle" style="font-weight:600">${GT.esc(o.yLabel)}</text>`;
    if (o.xLabel) s += `<text x="${(W + m.l) / 2}" y="${H - 4}" text-anchor="middle" style="font-weight:600">${GT.esc(o.xLabel)}</text>`;
    s += '</svg>';
    el.innerHTML = `<div class="chart">${s}</div>`;
  };

  /* histogram helper → bars */
  GT.histogram = (values, lo, hi, bins) => {
    const w = (hi - lo) / bins, counts = new Array(bins).fill(0);
    values.forEach(v => { const i = GT.clamp(Math.floor((v - lo) / w), 0, bins - 1); counts[i]++; });
    return counts.map((c, i) => ({ label: `${GT.fmt(lo + i * w)}`, value: c, lo: lo + i * w, hi: lo + (i + 1) * w }));
  };

  window.GT = GT;
})();
