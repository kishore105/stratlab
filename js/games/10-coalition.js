/* 10 — Coalition Lab: characteristic functions, Shapley value, the Core, Shapley–Shubik voting power */
(function () {
  const { $, $$, fmt, esc } = GT;

  const PRESETS = {
    it: {
      name: 'IT modernisation consortium (₹800 cr)', players: ['Infosys', 'Wipro', 'Global partner'], unit: '₹ crore profit',
      story: 'Session 16. Three firms win a government IT contract. Alone or in pairs they could have bid for smaller packages. The table gives the profit each coalition could secure.',
      v: { '1': 100, '2': 80, '4': 150, '3': 300, '5': 500, '6': 450, '7': 800 }
    },
    highway: {
      name: 'Highway bid: L&T + Japanese firm + local EPC (₹500 cr)', players: ['L&T', 'Japanese infra firm', 'Local EPC'], unit: '₹ crore profit',
      story: 'Session 17. No firm qualifies for the ₹5,000 crore project alone (value 0). Some pairs can bid; the full consortium is strongest.',
      v: { '1': 0, '2': 0, '4': 0, '3': 300, '5': 200, '6': 100, '7': 500 }
    },
    glove: {
      name: 'Glove game: one scarce supplier', players: ['Chip supplier (scarce)', 'OEM A', 'OEM B'], unit: '₹ crore',
      story: 'One supplier owns a scarce component; two OEMs each need it. A deal creates ₹100 cr. The Core gives everything to the scarce side, while Shapley shares some value with the OEMs. Fairness and stability pull apart.',
      v: { '1': 0, '2': 0, '4': 0, '3': 100, '5': 100, '6': 0, '7': 100 }
    },
    majority: {
      name: 'Empty Core: any two can split the pie', players: ['Firm A', 'Firm B', 'Firm C'], unit: '₹ crore',
      story: 'Any two firms can capture ₹100 cr without the third, and all three together also get only ₹100 cr. Every allocation is blocked by some pair, so the Core is empty and coalitions keep re-forming.',
      v: { '1': 0, '2': 0, '4': 0, '3': 100, '5': 100, '6': 100, '7': 100 }
    },
    airport: {
      name: 'Airport runway cost sharing (4 airlines)', players: ['Regional', 'Narrow-body', 'Wide-body', 'Jumbo'], unit: '₹ crore COST', cost: true,
      story: 'Cost allocation in infrastructure (Littlechild & Owen 1973). A runway long enough for the largest aircraft serves everyone, so the cost of any group is the cost of the runway its largest aircraft needs. Shapley splits each runway segment equally among the airlines that use it.',
      v: (() => { const c = [20, 50, 80, 100]; const o = {}; for (let m = 1; m < 16; m++) { let mx = 0; for (let i = 0; i < 4; i++) if (m & (1 << i)) mx = Math.max(mx, c[i]); o[m] = mx; } return o; })()
    }
  };

  const VOTING = {
    board: { name: 'Board vote, ordinary resolution', players: ['Promoter', 'PE fund', 'Mutual funds', 'Retail'], w: [45, 30, 15, 10], q: 51 },
    special: { name: 'Special resolution (75%)', players: ['Promoter', 'PE fund', 'Mutual funds', 'Retail'], w: [45, 30, 15, 10], q: 75 },
    jv: { name: 'JV with a 1% partner', players: ['Partner A', 'Partner B', 'Partner C'], w: [50, 49, 1], q: 51 },
    council: { name: 'GST-Council-style weighted vote', players: ['Centre', 'State bloc 1', 'State bloc 2', 'State bloc 3'], w: [33.3, 25, 22, 19.7], q: 75 }
  };

  const bits = (m, n) => [...Array(n).keys()].filter(i => m & (1 << i));
  const label = (m, P) => '{' + bits(m, P.length).map(i => P[i]).join(', ') + '}';

  function shapley(n, v) {
    const phi = new Array(n).fill(0), rows = [];
    const perms = GT.permutations([...Array(n).keys()]);
    perms.forEach(p => {
      let m = 0; const mc = new Array(n).fill(0);
      p.forEach(i => { mc[i] = (v[m | (1 << i)] || 0) - (v[m] || 0); m |= 1 << i; });
      mc.forEach((x, i) => phi[i] += x); rows.push({ p, mc });
    });
    return { phi: phi.map(x => x / perms.length), rows };
  }
  function coreViolations(n, v, x) {
    const full = (1 << n) - 1, out = [];
    for (let m = 1; m < full; m++) { const s = GT.sum(bits(m, n).map(i => x[i])); if (s < (v[m] || 0) - 1e-6) out.push({ m, s, need: v[m] }); }
    return out;
  }
  function findCore(n, v) {
    const full = (1 << n) - 1, V = v[full] || 0;
    let x = new Array(n).fill(V / n);
    for (let it = 0; it < 4000; it++) {
      for (let m = 1; m < full; m++) { const b = bits(m, n); const s = GT.sum(b.map(i => x[i])); const need = v[m] || 0; if (s < need) b.forEach(i => x[i] += (need - s) / b.length); }
      const d = (V - GT.sum(x)) / n; x = x.map(y => y + d);
    }
    const viol = coreViolations(n, v, x);
    const maxV = viol.length ? Math.max(...viol.map(o => o.need - o.s)) : 0;
    return maxV < Math.max(1e-3, Math.abs(V) * 1e-4) ? x : null;
  }

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="value">Value sharing: Shapley & Core</button><button class="subtab" data-sub="vote">Voting power</button><button class="subtab" data-sub="class">Classroom: test team proposals</button></div>
      <div data-pane="value" class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="field"><label>Scenario</label><select id="co-pre">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join('')}</select></div>
            <p class="muted" id="co-story" style="font-size:.9rem"></p>
            <div class="panel-title">Characteristic function <span id="co-unit"></span></div>
            <div id="co-vtable" class="scroll-y" style="max-height:380px"></div>
          </div>
          <div class="card">
            <div class="panel-title">Your proposed split</div>
            <div id="co-prop"></div>
            <div class="btn-row"><button class="btn sm" id="co-eq">Equal split</button><button class="btn sm" id="co-sa">Stand-alone proportional</button><button class="btn sm" id="co-sh">Use Shapley</button></div>
          </div>
        </div>
        <div class="stack">
          <div class="card"><div id="co-result"></div></div>
          <div class="card" id="co-simplex-card"><div class="panel-title">The imputation triangle</div><div id="co-simplex"></div><p class="muted" style="font-size:.82rem">Each point is a way to split v(N). Green dots = Core (no coalition can do better on its own). Gold = Shapley. Blue = your proposal.</p></div>
          <div class="card" data-fold="Step by step: marginal contributions in every arrival order"><div id="co-orders" class="scroll-y tbl-wrap"></div></div>
        </div>
      </div>
      <div data-pane="vote" class="layout-2 hide">
        <div class="card">
          <div class="field"><label>Scenario</label><select id="co-vpre">${Object.entries(VOTING).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join('')}</select></div>
          <div id="co-vw"></div>
          <div class="field"><div class="field-row"><label>Quota needed to pass</label><input type="number" id="co-q" step="0.1"></div></div>
          <p class="muted" style="font-size:.86rem">Edit weights or the quota. Up to 6 voters can be added below.</p>
          <div class="btn-row"><button class="btn sm" id="co-vadd">+ Add voter</button><button class="btn sm" id="co-vrem">− Remove last</button></div>
        </div>
        <div class="card"><div id="co-vout"></div></div>
      </div>
      <div data-pane="class" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Paste team proposals for the current scenario</div>
          <p class="muted" style="font-size:.88rem">One proposal per line: <code>Team name: x1, x2, x3</code> in the same player order as the Value-sharing tab. The tool checks efficiency, Core stability and distance from Shapley.</p>
          <textarea id="co-cpaste" placeholder="Team A: 260, 200, 340&#10;Team B: 266.7, 266.7, 266.6"></textarea>
          <button class="btn primary mt" id="co-cgo">Evaluate proposals</button>
        </div>
        <div class="card"><div id="co-cout"><p class="muted">Results appear here.</p></div></div>
      </div>`;

    GT.subtabs(root, s => { if (s === 'vote') drawVote(); });
    let P, n, v, x, Sh;
    const sign = () => P.cost ? -1 : 1; // internal games are value games; costs are negated

    function load(key) {
      P = JSON.parse(JSON.stringify(PRESETS[key])); n = P.players.length;
      v = {}; Object.entries(P.v).forEach(([m, val]) => v[+m] = sign() * val); v[0] = 0;
      $('#co-story', root).textContent = P.story;
      $('#co-unit', root).textContent = '(' + P.unit + ')';
      drawVTable(); recompute(true);
    }
    function drawVTable() {
      const full = (1 << n) - 1;
      const masks = [...Array(full).keys()].map(i => i + 1).sort((a, b) => bits(a, n).length - bits(b, n).length || a - b);
      $('#co-vtable', root).innerHTML = `<table class="data"><thead><tr><th>Coalition S</th><th>${P.cost ? 'c(S)' : 'v(S)'}</th></tr></thead><tbody>${masks.map(m => `<tr${m === full ? ' class="hl"' : ''}><td>${esc(label(m, P.players))}</td><td><input type="number" data-m="${m}" value="${sign() * v[m]}" style="width:90px"></td></tr>`).join('')}</tbody></table>`;
      $$('#co-vtable input', root).forEach(inp => inp.onchange = () => { v[+inp.dataset.m] = sign() * (parseFloat(inp.value) || 0); recompute(true); });
    }
    function drawProp() {
      $('#co-prop', root).innerHTML = P.players.map((p, i) => `<div class="field-row" style="margin-bottom:8px"><label>${esc(p)}</label><input type="number" step="0.1" data-x="${i}" value="${fmt(sign() * x[i], 1).replace(/,/g, '')}" style="width:100px"></div>`).join('');
      $$('#co-prop input', root).forEach(inp => inp.onchange = () => { x[+inp.dataset.x] = sign() * (parseFloat(inp.value) || 0); drawResult(); drawSimplex(); });
    }
    function recompute(resetProp) {
      Sh = shapley(n, v);
      if (resetProp || !x) x = Sh.phi.slice();
      drawProp(); drawResult(); drawOrders(); drawSimplex();
    }
    function drawResult() {
      const full = (1 << n) - 1, V = v[full];
      const shViol = coreViolations(n, v, Sh.phi);
      const core = findCore(n, v);
      const propViol = coreViolations(n, v, x);
      const eff = Math.abs(GT.sum(x) - V) < 0.05;
      const disp = val => fmt(sign() * val, 1);
      $('#co-result', root).innerHTML = `
        <div class="panel-title">${P.cost ? 'Cost shares' : 'Allocations'}</div>
        <table class="data"><thead><tr><th>Player</th><th>Stand-alone ${P.cost ? 'cost' : 'value'}</th><th>Shapley</th><th>Your proposal</th></tr></thead><tbody>
          ${P.players.map((p, i) => `<tr><td><b>${esc(p)}</b></td><td>${disp(v[1 << i])}</td><td><b style="color:var(--amber)">${disp(Sh.phi[i])}</b></td><td style="color:var(--p1)">${disp(x[i])}</td></tr>`).join('')}
          <tr><td><b>Total</b></td><td>–</td><td>${disp(GT.sum(Sh.phi))}</td><td style="color:${eff ? 'inherit' : 'var(--bad)'}">${disp(GT.sum(x))}</td></tr>
        </tbody></table>
        <div class="note ${core ? 'good' : 'bad'}" style="margin-top:12px"><p><b>Core:</b> ${core ? `non-empty. One stable allocation: (${core.map(disp).join(', ')}).` : 'appears to be <b>empty</b>. Every way of splitting v(N) is blocked by some coalition, so expect instability and renegotiation.'}</p></div>
        <div class="note ${shViol.length ? 'amber' : 'good'}"><p><b>Is the Shapley value in the Core?</b> ${shViol.length ? `No. Blocked by ${shViol.map(o => esc(label(o.m, P.players))).join('; ')} (they could ${P.cost ? 'build alone more cheaply' : 'earn more alone'}). Fair is not the same as stable.` : 'Yes. The fair allocation is also stable.'}</p></div>
        <div class="note ${!eff ? 'bad' : propViol.length ? 'bad' : 'good'}"><p><b>Your proposal:</b> ${!eff ? `not efficient: it must add up to ${disp(V)}.` : propViol.length ? `blocked by ${propViol.slice(0, 4).map(o => `${esc(label(o.m, P.players))} (gets ${disp(o.s)}, could ${P.cost ? 'do it for' : 'get'} ${disp(o.need)})`).join('; ')}.` : 'efficient and in the Core. No group has an incentive to walk away.'}</p></div>`;
    }
    function drawOrders() {
      $('#co-orders', root).innerHTML = `<table class="data"><thead><tr><th>Arrival order</th>${P.players.map(p => `<th>${esc(p)}</th>`).join('')}</tr></thead><tbody>${Sh.rows.map(r => `<tr><td style="font-size:.8rem">${r.p.map(i => esc(P.players[i].split(' ')[0])).join(' → ')}</td>${r.mc.map(c => `<td>${fmt(sign() * c, 1)}</td>`).join('')}</tr>`).join('')}<tr class="hl"><td><b>Average = Shapley</b></td>${Sh.phi.map(c => `<td><b>${fmt(sign() * c, 1)}</b></td>`).join('')}</tr></tbody></table>`;
    }
    function drawSimplex() {
      const card = $('#co-simplex-card', root);
      if (n !== 3 || P.cost) { card.style.display = 'none'; return; }
      card.style.display = '';
      const V = v[7]; if (V <= 0) { $('#co-simplex', root).innerHTML = ''; return; }
      const W = 460, H = 410, A = [W / 2, 30], B = [30, H - 40], C = [W - 30, H - 40];
      const pt = xx => { const s = GT.sum(xx) || 1; const a = xx[0] / s, b = xx[1] / s, c = xx[2] / s; return [a * A[0] + b * B[0] + c * C[0], a * A[1] + b * B[1] + c * C[1]]; };
      let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:520px;display:block;margin:auto">`;
      s += `<polygon points="${[A, B, C].map(p => p.join(',')).join(' ')}" style="fill:var(--surface-2);stroke:var(--line-2);stroke-width:1.5"/>`;
      const step = V / 40;
      for (let a = 0; a <= V + 1e-9; a += step) for (let b = 0; a + b <= V + 1e-9; b += step) {
        const c = V - a - b, xx = [a, b, Math.max(0, c)];
        const inCore = coreViolations(3, v, xx).length === 0;
        if (inCore) { const [px, py] = pt(xx); s += `<circle cx="${px}" cy="${py}" r="2.6" style="fill:var(--good);opacity:.75"/>`; }
      }
      const [sx, sy] = pt(Sh.phi), [ux, uy] = pt(x.map(y => Math.max(0, y)));
      s += `<circle cx="${ux}" cy="${uy}" r="7" style="fill:var(--p1);stroke:var(--surface);stroke-width:2"/>`;
      s += `<circle cx="${sx}" cy="${sy}" r="7" style="fill:var(--amber);stroke:var(--surface);stroke-width:2"/>`;
      s += `<text x="${A[0]}" y="${A[1] - 10}" text-anchor="middle" style="font-weight:700;font-size:12px;fill:var(--ink)">${esc(P.players[0])} gets all</text>`;
      s += `<text x="${B[0]}" y="${B[1] + 22}" text-anchor="start" style="font-weight:700;font-size:12px;fill:var(--ink)">${esc(P.players[1])} gets all</text>`;
      s += `<text x="${C[0]}" y="${C[1] + 22}" text-anchor="end" style="font-weight:700;font-size:12px;fill:var(--ink)">${esc(P.players[2])} gets all</text>`;
      s += '</svg>';
      $('#co-simplex', root).innerHTML = s;
    }
    $('#co-pre', root).onchange = e => load(e.target.value);
    $('#co-eq', root).onclick = () => { x = new Array(n).fill(v[(1 << n) - 1] / n); drawProp(); drawResult(); drawSimplex(); };
    $('#co-sa', root).onclick = () => { const sa = P.players.map((_, i) => Math.abs(v[1 << i])); const t = GT.sum(sa); const V = v[(1 << n) - 1]; x = sa.map(s => t ? V * s / t : V / n); drawProp(); drawResult(); drawSimplex(); };
    $('#co-sh', root).onclick = () => { x = Sh.phi.slice(); drawProp(); drawResult(); drawSimplex(); GT.log('coalition', `${P.name}: Shapley (${Sh.phi.map(p => fmt(sign() * p, 1)).join(', ')})`, { v, phi: Sh.phi }); };
    load('it');

    /* ---------- voting ---------- */
    let VT = null;
    function loadVote(k) { VT = JSON.parse(JSON.stringify(VOTING[k])); drawVote(); }
    function drawVote() {
      if (!VT) VT = JSON.parse(JSON.stringify(VOTING.board));
      $('#co-vw', root).innerHTML = VT.players.map((p, i) => `<div class="field-row" style="margin-bottom:8px"><input type="text" data-vn="${i}" value="${esc(p)}" style="width:150px"><input type="number" step="0.1" data-vw="${i}" value="${VT.w[i]}" style="width:90px"></div>`).join('');
      $('#co-q', root).value = VT.q;
      $$('[data-vn]', root).forEach(inp => inp.onchange = () => { VT.players[+inp.dataset.vn] = inp.value; voteOut(); });
      $$('[data-vw]', root).forEach(inp => inp.onchange = () => { VT.w[+inp.dataset.vw] = parseFloat(inp.value) || 0; voteOut(); });
      voteOut();
    }
    function voteOut() {
      const k = VT.players.length, q = VT.q, w = VT.w;
      const ss = new Array(k).fill(0);
      const perms = GT.permutations([...Array(k).keys()]);
      perms.forEach(p => { let s = 0; for (const i of p) { s += w[i]; if (s >= q) { ss[i]++; break; } } });
      const bz = new Array(k).fill(0);
      for (let m = 1; m < (1 << k); m++) {
        const tot = GT.sum(bits(m, k).map(i => w[i]));
        if (tot >= q) bits(m, k).forEach(i => { if (tot - w[i] < q) bz[i]++; });
      }
      const bt = GT.sum(bz) || 1, wt = GT.sum(w) || 1;
      const out = $('#co-vout', root);
      out.innerHTML = `<div class="panel-title">Share of votes vs share of power</div><div id="co-vchart"></div>
        <table class="data mt"><thead><tr><th>Voter</th><th>Vote share</th><th>Shapley–Shubik</th><th>Banzhaf</th></tr></thead><tbody>${VT.players.map((p, i) => `<tr><td><b>${esc(p)}</b></td><td>${GT.pct(w[i] / wt, 1)}</td><td><b style="color:var(--amber)">${GT.pct(ss[i] / perms.length, 1)}</b></td><td>${GT.pct(bz[i] / bt, 1)}</td></tr>`).join('')}</tbody></table>
        <div class="note"><p><b>Shapley–Shubik index</b> = share of arrival orders in which the voter is <i>pivotal</i> (turns a losing coalition into a winning one). Voting weight and power can be very different. ${ss.some(x => x === 0) ? '<b>A voter with zero power is a "dummy": its votes never change an outcome.</b>' : ''}</p></div>`;
      GT.chart.bars($('#co-vchart', out), { bars: VT.players.flatMap((p, i) => [{ label: p.split(' ')[0] + ' votes', value: w[i] / wt * 100, color: 'var(--line-2)' }, { label: p.split(' ')[0] + ' power', value: ss[i] / perms.length * 100, color: 'var(--amber)' }]), yLabel: '%', yMax: 100, rotate: true, decimals: 0, height: 260 });
    }
    $('#co-vpre', root).onchange = e => loadVote(e.target.value);
    $('#co-q', root).onchange = e => { VT.q = parseFloat(e.target.value) || 0; voteOut(); };
    $('#co-vadd', root).onclick = () => { if (VT.players.length >= 6) { GT.toast('Max 6 voters'); return; } VT.players.push('Voter ' + (VT.players.length + 1)); VT.w.push(5); drawVote(); };
    $('#co-vrem', root).onclick = () => { if (VT.players.length <= 2) return; VT.players.pop(); VT.w.pop(); drawVote(); };

    /* ---------- classroom ---------- */
    $('#co-cgo', root).onclick = () => {
      const V = v[(1 << n) - 1];
      const props = $('#co-cpaste', root).value.split('\n').map(l => l.trim()).filter(Boolean).map((l, k) => {
        const parts = l.split(':'); const name = parts.length > 1 ? parts[0].trim() : 'Proposal ' + (k + 1);
        const nums = GT.parseNums(parts.length > 1 ? parts.slice(1).join(':') : l).slice(0, n).map(y => sign() * y);
        return { name, x: nums };
      }).filter(p => p.x.length === n);
      if (!props.length) { GT.toast(`Each line needs ${n} numbers`); return; }
      const rows = props.map(p => {
        const eff = Math.abs(GT.sum(p.x) - V) < 0.5;
        const viol = coreViolations(n, v, p.x);
        const dist = Math.sqrt(GT.sum(p.x.map((y, i) => (y - Sh.phi[i]) ** 2)));
        return { ...p, eff, viol, dist };
      }).sort((a, b) => (a.eff && !a.viol.length ? 0 : 1) - (b.eff && !b.viol.length ? 0 : 1) || a.dist - b.dist);
      $('#co-cout', root).innerHTML = `<table class="data"><thead><tr><th>Team</th><th>Split</th><th>Efficient?</th><th>In Core?</th><th>Distance from Shapley</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${r.x.map(y => fmt(sign() * y, 1)).join(' / ')}</td><td>${r.eff ? '<span class="pill good">yes</span>' : '<span class="pill bad">no</span>'}</td><td>${r.viol.length ? `<span class="pill bad">blocked by ${esc(label(r.viol[0].m, P.players))}</span>` : '<span class="pill good">stable</span>'}</td><td>${fmt(r.dist, 1)}</td></tr>`).join('')}</tbody></table><p class="muted" style="font-size:.86rem;margin-top:8px">Shapley benchmark: (${Sh.phi.map(p => fmt(sign() * p, 1)).join(', ')}). Ranking: stable and efficient first, then closest to Shapley.</p>`;
      GT.log('coalition', `Classroom: evaluated ${rows.length} proposals for ${P.name}`, { rows: rows.map(r => ({ name: r.name, x: r.x, stable: !r.viol.length })) });
    };
  }

  GT.register({
    id: 'coalition', num: 10, icon: '🧩', title: 'Coalition Lab: Shapley Value & the Core', modules: ['M7'], sessions: '15–17', time: '45–60 min',
    tagline: 'Characteristic functions for an IT consortium, a highway bid and a runway cost split. Computes Shapley values, tests the Core and measures voting power.',
    problem: 'A consortium of Infosys, Wipro and a global partner wins a large government IT contract. Each contributed differently. Equal splits seem unfair and proportional splits ignore synergies. What is each firm\'s true marginal contribution, and will the split hold together?',
    concepts: ['Characteristic function', 'Shapley value', 'The Core', 'Fairness vs stability', 'Shapley–Shubik power'],
    render,
    guide: {
      objective: 'Compute Shapley values by enumerating marginal contributions, test Core stability, and see when fair and stable allocations coincide and when they do not.',
      players: '1 student or teams of 3 (each team member represents one firm)',
      modes: 'Value-sharing lab · Voting-power calculator · Classroom proposal checker',
      rules: `<ul><li><b>v(S)</b> is the value coalition S can secure on its own. In the airport scenario it is a cost c(S).</li><li>An allocation must be <b>efficient</b>: it splits exactly v(N).</li><li>It is in the <b>Core</b> if no coalition S receives less than v(S); otherwise S would walk away.</li><li>The <b>Shapley value</b> averages each player's marginal contribution over all orders in which the coalition could have formed.</li></ul>`,
      steps: [
        'Open the <b>IT consortium</b>. Before looking at results, propose a split you think is fair and type it in.',
        'Check the verdict: is your split efficient? Is it in the Core? Which coalition blocks it?',
        'Click <b>Equal split</b> and <b>Stand-alone proportional</b>. Why are both problematic?',
        'Study the arrival-order table and recompute one Shapley value by hand.',
        'Switch to the <b>Glove game</b>. Compare where the Core is (the triangle) with the Shapley point. Which would you defend in a negotiation?',
        'Open <b>Empty Core</b>. Why is no split stable? Where do you see this in business?',
        'Go to <b>Voting power</b>. In the 50/49/1 JV, how much power does the 1% partner have? Try changing the quota.'
      ],
      facilitator: [
        'Session 15: form teams of three, each member representing one firm. Teams negotiate a split of ₹800 cr for 10 minutes.',
        'Collect proposals as "Team: x1, x2, x3", paste them into Classroom mode and project the stability ranking.',
        'Session 16: walk through the arrival-order table and the four Shapley axioms (efficiency, symmetry, dummy, additivity).',
        'Session 17: the highway and airport scenarios. Discuss when you would choose a Core allocation over Shapley (when stability is the main risk).',
        'Voting power: use real shareholding patterns from an Indian listed company. Ask: who is the dummy?',
        'Timing: 15 min negotiation, 15 min Shapley walk-through, 10 min Core and the triangle, 10 min voting power.'
      ],
      variations: ['Edit v(S) to reflect the Tata–SIA Air India JV with three partners (Tata, SIA, Government as regulator). Is the actual 74.9/25.1 split close to Shapley?', 'Add a fourth firm (switch to the airport preset to see a 4-player game) and see how Shapley rewards being "pivotal".', 'Climate finance: three countries sharing the cost of a regional grid (cost game).']
    },
    theory: `
      <h3 style="margin-top:0">Cooperative games</h3>
      <p>When players can sign <b>binding agreements</b>, we stop asking "what will each do?" and ask "which coalitions form and how is value divided?" A transferable-utility game is described by its <b>characteristic function</b> v(S): the total value coalition S can guarantee itself.</p>
      <h3>The Core: stability</h3>
      <div class="formula">x is in the Core  ⇔  Σᵢ xᵢ = v(N)  and  Σ_{i∈S} xᵢ ≥ v(S) for every coalition S</div>
      <p>No group can do better by breaking away. The Core may be <b>large</b> (many stable splits, so bargaining decides), a <b>single point</b>, or <b>empty</b> (any split is blocked, so coalitions keep re-forming). The Bondareva–Shapley theorem says the Core is non-empty if and only if the game is "balanced".</p>
      <h3>The Shapley value: fairness</h3>
      <p>Imagine players arriving in a random order, each paid its <b>marginal contribution</b> to those already present. Averaging over all n! orders:</p>
      <div class="formula">φᵢ = Σ_{S ⊆ N∖{i}}  |S|!(n−|S|−1)!/n!  · [ v(S ∪ {i}) − v(S) ]</div>
      <p>It is the <b>unique</b> rule satisfying four axioms: <b>Efficiency</b> (it splits v(N)), <b>Symmetry</b> (identical contributors get the same), <b>Dummy</b> (a player who adds nothing gets nothing) and <b>Additivity</b> (it adds up across separate games).</p>
      <h3>Fairness vs stability</h3>
      <p>For <b>convex</b> games (where synergies grow with coalition size) the Shapley value is always in the Core. Otherwise it may not be: in the glove game the Core gives everything to the scarce supplier, while Shapley gives the OEMs some value for their bargaining position. A manager may prefer the Core when walk-away risk is high, and Shapley when legitimacy and long-term relationships matter.</p>
      <h3>Voting power: Shapley–Shubik (1954)</h3>
      <p>Applied to weighted voting, the Shapley value becomes the probability of being <b>pivotal</b>. Vote share is not power: in a 50/49/1 JV with a 51% quota, partner B (49%) and partner C (1%) have <b>equal</b> power (1/6 each), and A has 2/3.</p>
      <h3>Links</h3>
      <p>With two players, Shapley = the Nash bargaining solution with equal power and BATNAs v({i}) (see the Bargaining Table). Shapley values also underpin <b>SHAP</b>, the most widely used method for explaining machine-learning predictions.</p>`,
    practice: [
      { tag: 'India', title: 'Tata–SIA and the Air India–Vistara merger', text: 'When Vistara merged into Air India (completed November 2024), Singapore Airlines took about a 25.1% stake in the enlarged Air India. Each partner\'s contribution of brand, network, capital, slots and expertise determines what a fair and stable stake looks like.' },
      { tag: 'India', title: 'Infrastructure consortia and PPP bids', text: 'Highway, metro and airport bids are often won by consortia of Indian EPC firms, foreign technology partners and financiers. Profit-sharing disputes in later years are often Core violations: a partner realises it could do better elsewhere.' },
      { tag: 'India', title: 'Promoter control with minority stakes', text: 'Indian promoters often control companies with 30–50% stakes because the remaining shares are dispersed. Shapley–Shubik power can be far above economic ownership. That is why SEBI requires special resolutions and majority-of-minority votes for related-party transactions.' },
      { tag: 'Global', title: 'Airport landing fees (Birmingham)', text: 'Littlechild & Thompson (1977) applied the Shapley value to Birmingham airport runway costs, which became the textbook "airport game". The same logic is used for cost allocation in pipelines, telecom networks and shared IT platforms.' },
      { tag: 'Global', title: 'Climate finance burden sharing', text: 'Who pays for a regional power grid or adaptation fund? Shapley-based allocations are proposed for loss-and-damage funds and joint emission-reduction projects (SDG 17) because they reward marginal contribution.' },
      { tag: 'Frontier', title: 'SHAP: Shapley values in AI', text: 'In SHAP (Lundberg & Lee 2017) the "players" are features in a model\'s prediction, used to explain credit decisions and fraud flags. Regulators increasingly expect this kind of explainability for automated decisions.' }
    ],
    debrief: [
      'Why is an equal split of the IT consortium\'s ₹800 cr unstable? Which coalition would object?',
      'Explain the Shapley value to a CFO in two sentences, without formulas.',
      'In the glove game, would you rather defend the Core or the Shapley allocation in a negotiation? Why?',
      'Give a business example of a game with an empty Core. How do firms manage such situations in practice (contracts, side payments)?',
      'What does the 50/49/1 JV example teach a minority investor negotiating a shareholder agreement?',
      'When should a manager prioritise stability (Core) over fairness (Shapley)?'
    ],
    aiPrompt: `I am analysing a 3-firm consortium: [names]. Coalition values (₹ crore): v(1)=_, v(2)=_, v(3)=_, v(12)=_, v(13)=_, v(23)=_, v(123)=_.
1. Compute the Shapley value showing all 6 arrival orders.
2. Determine whether the Core is non-empty and whether Shapley lies in it.
3. Propose a profit-sharing clause for the JV agreement that balances fairness and stability, including a renegotiation trigger.
4. Explain how the analysis would change if one firm's stand-alone value is overstated because of asymmetric information.
Show your arithmetic so I can check it.`
  });
})();
