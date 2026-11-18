/* 03 — Duopoly Lab: Cournot (quantity) vs Bertrand (price) competition */
(function () {
  const { $, $$, fmt, esc } = GT;
  const ROUNDS = 10;

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="cournot">Cournot: steel capacity</button><button class="subtab" data-sub="bertrand">Bertrand: price war</button><button class="subtab" data-sub="nfirm">N-firm market</button></div>
      <div class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="panel-title">Market</div>
            <p class="muted" style="font-size:.86rem">Inverse demand <code>P = a − b·Q</code>, constant marginal cost <code>c</code>. Units: price ₹'000/tonne, quantity in lakh tonnes.</p>
            <div class="field"><div class="field-row"><label>Demand intercept a</label><span class="val" data-v="a"></span></div><input type="range" data-k="a" min="60" max="160" step="5" value="100"></div>
            <div class="field"><div class="field-row"><label>Slope b</label><span class="val" data-v="b"></span></div><input type="range" data-k="b" min="0.5" max="2" step="0.25" value="1"></div>
            <div class="field"><div class="field-row"><label>Marginal cost c</label><span class="val" data-v="c"></span></div><input type="range" data-k="c" min="0" max="40" step="2" value="10"></div>
          </div>
          <div class="card" data-pane="cournot">
            <div class="panel-title">Your output decision · Round <span id="du-cr">1</span>/${ROUNDS}</div>
            <div class="field"><label>Rival type</label><select id="du-ctype">
              <option value="br">Adaptive (best reply to your last move)</option>
              <option value="cartel">Cartel-minded (punishes overproduction)</option>
              <option value="leader">Aggressive (Stackelberg leader)</option>
            </select></div>
            <div class="field"><div class="field-row"><label>Your quantity q₁</label><span class="val" id="du-qv"></span></div><input type="range" id="du-q" min="0" max="90" step="0.5" value="30"></div>
            <div class="btn-row"><button class="btn primary" id="du-cgo">Produce</button><button class="btn" id="du-creset">Restart</button></div>
          </div>
          <div class="card hide" data-pane="bertrand">
            <div class="panel-title">Your price · Round <span id="du-br">1</span>/${ROUNDS}</div>
            <p class="muted" style="font-size:.86rem">Identical products: the lower price takes the whole market, and a tie splits it. The rival best-responds to your last price.</p>
            <label style="display:flex;gap:6px;align-items:center;font-weight:500;margin-bottom:10px"><input type="checkbox" id="du-cap"> Capacity limit per firm (Kreps–Scheinkman)</label>
            <div class="field" id="du-capwrap" style="display:none"><div class="field-row"><label>Capacity K</label><span class="val" id="du-kv"></span></div><input type="range" id="du-k" min="10" max="90" step="1" value="30"></div>
            <div class="field"><div class="field-row"><label>Your price p₁</label><span class="val" id="du-pv"></span></div><input type="range" id="du-p" min="0" max="100" step="1" value="55"></div>
            <div class="btn-row"><button class="btn primary" id="du-bgo">Set price</button><button class="btn" id="du-breset">Restart</button></div>
          </div>
          <div class="card hide" data-pane="nfirm">
            <div class="panel-title">Number of symmetric Cournot firms</div>
            <div class="field"><div class="field-row"><label>Firms N</label><span class="val" id="du-nv">2</span></div><input type="range" id="du-n" min="1" max="12" step="1" value="2"></div>
            <p class="muted" style="font-size:.86rem">Watch price fall towards marginal cost as firms enter. Moving from 4 to 3 operators after consolidation pushes it the other way.</p>
          </div>
          <div class="card" data-fold="Benchmarks: cartel vs Cournot vs Bertrand"><div id="du-bench"></div></div>
        </div>
        <div class="stack">
          <div class="card" data-pane="cournot">
            <div class="kpis"><div class="kpi p1"><div class="k">Your profit (total)</div><div class="v" id="du-cy">0</div></div><div class="kpi p2"><div class="k">Rival profit</div><div class="v" id="du-cv">0</div></div><div class="kpi"><div class="k">Last market price</div><div class="v" id="du-cp">–</div></div></div>
            <div class="panel-title mt">Reaction functions & play path</div>
            <div id="du-react"></div>
            <div id="du-cmsg"></div>
            <div class="log mt" id="du-clog"></div>
          </div>
          <div class="card hide" data-pane="bertrand">
            <div class="kpis"><div class="kpi p1"><div class="k">Your profit (total)</div><div class="v" id="du-by">0</div></div><div class="kpi p2"><div class="k">Rival profit</div><div class="v" id="du-bv">0</div></div><div class="kpi"><div class="k">Last market price</div><div class="v" id="du-bp">–</div></div></div>
            <div class="panel-title mt">Price path</div>
            <div id="du-bchart"></div>
            <div id="du-bmsg"></div>
            <div class="log mt" id="du-blog"></div>
          </div>
          <div class="card hide" data-pane="nfirm">
            <div id="du-nchart"></div>
            <div id="du-nmsg"></div>
          </div>
        </div>
      </div>`;

    let M, mode = 'cournot';
    let C = { hist: [], tot: [0, 0] }, B = { hist: [], tot: [0, 0] };
    const P = (Q) => Math.max(0, M.a - M.b * Q);
    const D = (p) => Math.max(0, (M.a - p) / M.b);

    const paint = GT.bindRanges(root, o => { M = o; C = { hist: [], tot: [0, 0] }; B = { hist: [], tot: [0, 0] }; $('#du-cmsg', root).innerHTML = ''; $('#du-bmsg', root).innerHTML = ''; refresh(); }, { b: v => fmt(v, 2) });
    M = paint();
    GT.subtabs(root, s => { mode = s; refresh(); });

    function bench() {
      const { a, b, c } = M, s = a - c;
      const qc = s / (3 * b), pc = a - 2 * b * qc, prc = (pc - c) * qc;
      const qm = s / (2 * b), pm = a - b * qm, prm = (pm - c) * qm;
      const ql = s / (2 * b), qf = s / (4 * b), ps = a - b * (ql + qf);
      return { qc, pc, prc, qm, pm, prm, ql, qf, ps, prl: (ps - c) * ql, prf: (ps - c) * qf, qcomp: s / b };
    }

    function drawBench() {
      const k = bench();
      $('#du-bench', root).innerHTML = `<table class="data"><thead><tr><th>Outcome</th><th>Price</th><th>Q total</th><th>Profit / firm</th></tr></thead><tbody>
        <tr><td>Cartel (joint monopoly)</td><td>${fmt(k.pm, 1)}</td><td>${fmt(k.qm, 1)}</td><td>${fmt(k.prm / 2, 0)}</td></tr>
        <tr class="hl"><td>Cournot–Nash</td><td>${fmt(k.pc, 1)}</td><td>${fmt(2 * k.qc, 1)}</td><td>${fmt(k.prc, 0)}</td></tr>
        <tr><td>Stackelberg (leader / follower)</td><td>${fmt(k.ps, 1)}</td><td>${fmt(k.ql + k.qf, 1)}</td><td>${fmt(k.prl, 0)} / ${fmt(k.prf, 0)}</td></tr>
        <tr><td>Bertrand–Nash</td><td>${fmt(M.c, 1)}</td><td>${fmt(k.qcomp, 1)}</td><td>0</td></tr>
      </tbody></table>`;
    }

    /* ---------- Cournot ---------- */
    function rivalQ() {
      const k = bench(), type = $('#du-ctype', root).value, last = C.hist[C.hist.length - 1];
      if (type === 'leader') return k.ql;
      if (type === 'cartel') return (!last || last.q1 <= k.qm / 2 + 0.5) ? k.qm / 2 : Math.max(0, (M.a - M.c - M.b * last.q1) / (2 * M.b));
      if (!last) return k.qc;
      return Math.max(0, (M.a - M.c - M.b * last.q1) / (2 * M.b));
    }
    function drawCournot() {
      const k = bench(), s = (M.a - M.c) / M.b;
      $('#du-q', root).max = s;
      $('#du-qv', root).textContent = fmt(+$('#du-q', root).value, 1);
      const R1 = [[s / 2, 0], [0, s]].map(([x, y]) => [x, y]); // q1 = (s - q2)/2 : points (q1,q2)
      GT.chart.line($('#du-react', root), {
        series: [
          { name: 'Your best response q₁ = (a−c−b·q₂)/2b', color: 'var(--p1)', points: [[s / 2, 0], [0, s]] },
          { name: 'Rival best response q₂ = (a−c−b·q₁)/2b', color: 'var(--p2)', points: [[0, s / 2], [s, 0]] },
          { name: 'Joint-profit frontier (q₁+q₂ = monopoly Q)', color: 'var(--good)', points: [[0, k.qm], [k.qm, 0]], dash: '4 4', width: 1.5 },
          { name: 'Your play path', color: 'var(--ink)', points: C.hist.map(h => [h.q1, h.q2]), dots: true, width: 1.2 }
        ],
        xMin: 0, xMax: s * 0.8, yMin: 0, yMax: s * 0.8, xLabel: 'Your output q₁', yLabel: 'Rival output q₂', height: 330,
        markers: [{ x: k.qc, y: k.qc, label: 'Cournot NE', color: 'var(--amber)' }, { x: k.qm / 2, y: k.qm / 2, label: 'Cartel', color: 'var(--good)', r: 5 }]
      });
      $('#du-cr', root).textContent = Math.min(C.hist.length + 1, ROUNDS);
      $('#du-cy', root).textContent = fmt(C.tot[0]); $('#du-cv', root).textContent = fmt(C.tot[1]);
      const last = C.hist[C.hist.length - 1];
      $('#du-cp', root).textContent = last ? fmt(last.p, 1) : '–';
      $('#du-clog', root).innerHTML = C.hist.map((h, i) => `<div>R${i + 1}: you q₁=${fmt(h.q1, 1)}, rival q₂=${fmt(h.q2, 1)}, P=${fmt(h.p, 1)} → <b style="color:var(--p1)">${fmt(h.pi1)}</b> / <b style="color:var(--p2)">${fmt(h.pi2)}</b></div>`).reverse().join('') || '<div class="muted">Choose an output and click Produce.</div>';
      $('#du-cgo', root).disabled = C.hist.length >= ROUNDS;
    }
    $('#du-q', root).oninput = () => $('#du-qv', root).textContent = fmt(+$('#du-q', root).value, 1);
    $('#du-cgo', root).onclick = () => {
      const q1 = +$('#du-q', root).value, q2 = rivalQ(), p = P(q1 + q2);
      const h = { q1, q2, p, pi1: (p - M.c) * q1, pi2: (p - M.c) * q2 };
      C.hist.push(h); C.tot[0] += h.pi1; C.tot[1] += h.pi2;
      const k = bench();
      if (C.hist.length === ROUNDS) {
        const avg = GT.mean(C.hist.map(x => x.q1));
        $('#du-cmsg', root).innerHTML = `<div class="note"><p><b>Game over.</b> Your average output was ${fmt(avg, 1)}, against ${fmt(k.qc, 1)} at Cournot and ${fmt(k.qm / 2, 1)} as a cartel member. Total profit: ${fmt(C.tot[0])}. ${{ br: `Against this adaptive rival, producing the Cournot quantity every round earns about ${fmt(k.prc * ROUNDS)}.`, cartel: `Against this rival, holding to the cartel quantity every round earns about ${fmt(k.prm / 2 * ROUNDS)}.`, leader: `Against a rival committed to ${fmt(k.ql, 1)}, your best reply is ${fmt(k.qf, 1)} every round, which earns about ${fmt(k.prf * ROUNDS)}.` }[$('#du-ctype', root).value]}</p></div>`;
        GT.log('duopoly', `Cournot vs ${$('#du-ctype', root).selectedOptions[0].text.split(' (')[0]}: profit ${fmt(C.tot[0])} vs ${fmt(C.tot[1])}`, { hist: C.hist, market: M });
      }
      drawCournot();
    };
    $('#du-creset', root).onclick = () => { C = { hist: [], tot: [0, 0] }; $('#du-cmsg', root).innerHTML = ''; drawCournot(); };
    $('#du-ctype', root).onchange = () => $('#du-creset', root).click();

    /* ---------- Bertrand ---------- */
    const capOn = () => $('#du-cap', root).checked;
    const K = () => +$('#du-k', root).value;
    function sales(p1, p2) {
      const cap = capOn() ? K() : Infinity;
      if (Math.abs(p1 - p2) < 1e-9) { const d = D(p1) / 2; return [Math.min(cap, d), Math.min(cap, d)]; }
      if (p1 < p2) { const s1 = Math.min(cap, D(p1)); return [s1, Math.min(cap, Math.max(0, D(p2) - s1))]; }
      const s2 = Math.min(cap, D(p2)); return [Math.min(cap, Math.max(0, D(p1) - s2)), s2];
    }
    function rivalPrice() {
      const last = B.hist[B.hist.length - 1];
      const k = bench();
      if (!last) return Math.round(k.pm);
      let best = M.c, bv = -Infinity;
      for (let p = Math.ceil(M.c); p <= M.a; p += 1) {
        const v = (p - M.c) * sales(last.p1, p)[1];
        if (v > bv + 1e-9) { bv = v; best = p; }
      }
      return best;
    }
    function drawBertrand() {
      $('#du-p', root).max = M.a; $('#du-pv', root).textContent = $('#du-p', root).value;
      $('#du-capwrap', root).style.display = capOn() ? '' : 'none';
      $('#du-kv', root).textContent = K();
      const k = bench();
      GT.chart.line($('#du-bchart', root), {
        series: [{ name: 'Your price', color: 'var(--p1)', points: B.hist.map((h, i) => [i + 1, h.p1]), dots: true }, { name: 'Rival price', color: 'var(--p2)', points: B.hist.map((h, i) => [i + 1, h.p2]), dots: true }],
        xMin: 1, xMax: ROUNDS, yMin: 0, yMax: M.a * 0.8, xLabel: 'Round', yLabel: 'Price', height: 280, xTicks: ROUNDS,
        hlines: [{ y: M.c, label: 'Marginal cost = Bertrand NE', color: 'var(--bad)' }, { y: k.pm, label: 'Monopoly price', color: 'var(--good)' }, { y: k.pc, label: 'Cournot price', color: 'var(--amber)' }]
      });
      $('#du-br', root).textContent = Math.min(B.hist.length + 1, ROUNDS);
      $('#du-by', root).textContent = fmt(B.tot[0]); $('#du-bv', root).textContent = fmt(B.tot[1]);
      const last = B.hist[B.hist.length - 1];
      $('#du-bp', root).textContent = last ? fmt(Math.min(last.p1, last.p2), 0) : '–';
      $('#du-blog', root).innerHTML = B.hist.map((h, i) => `<div>R${i + 1}: you ₹${h.p1}, rival ₹${h.p2}, units sold ${fmt(h.s1, 1)} / ${fmt(h.s2, 1)} → <b style="color:var(--p1)">${fmt(h.pi1)}</b> / <b style="color:var(--p2)">${fmt(h.pi2)}</b></div>`).reverse().join('') || '<div class="muted">Set a price to start. The rival opens at the monopoly price.</div>';
      $('#du-bgo', root).disabled = B.hist.length >= ROUNDS;
    }
    $('#du-p', root).oninput = () => $('#du-pv', root).textContent = $('#du-p', root).value;
    $('#du-k', root).oninput = () => { $('#du-kv', root).textContent = K(); };
    $('#du-cap', root).onchange = () => { $('#du-breset', root).click(); };
    $('#du-bgo', root).onclick = () => {
      const p1 = +$('#du-p', root).value, p2 = rivalPrice();
      const [s1, s2] = sales(p1, p2);
      const h = { p1, p2, s1, s2, pi1: (p1 - M.c) * s1, pi2: (p2 - M.c) * s2 };
      B.hist.push(h); B.tot[0] += h.pi1; B.tot[1] += h.pi2;
      if (B.hist.length === ROUNDS) {
        const lastP = Math.min(p1, p2);
        $('#du-bmsg', root).innerHTML = `<div class="note ${capOn() ? 'good' : 'amber'}"><p>${capOn()
          ? `<b>With capacity limits</b>, undercutting gains little because you cannot serve the extra demand. Prices settle well above cost, near the Cournot price (${fmt(bench().pc, 1)}) when K equals the Cournot quantity (${fmt(bench().qc, 1)}). This is the Kreps–Scheinkman result: capacity first, then price, gives Cournot outcomes.`
          : `<b>The Bertrand paradox.</b> With just two firms selling identical products, each undercutting step pushes price towards marginal cost (₹${M.c}). The final price was ₹${lastP}. Two firms are enough to destroy all profit.`}</p></div>`;
        GT.log('duopoly', `Bertrand${capOn() ? ' (capacity ' + K() + ')' : ''}: profit ${fmt(B.tot[0])} vs ${fmt(B.tot[1])}, final price ${lastP}`, { hist: B.hist, market: M });
      }
      drawBertrand();
    };
    $('#du-breset', root).onclick = () => { B = { hist: [], tot: [0, 0] }; $('#du-bmsg', root).innerHTML = ''; drawBertrand(); };

    /* ---------- N firms ---------- */
    function drawN() {
      const N = +$('#du-n', root).value; $('#du-nv', root).textContent = N;
      const pts = [], prof = [];
      for (let n = 1; n <= 12; n++) { const p = (M.a + n * M.c) / (n + 1); pts.push([n, p]); prof.push([n, Math.pow(M.a - M.c, 2) / (M.b * Math.pow(n + 1, 2)) * n]); }
      const p = (M.a + N * M.c) / (N + 1), q = (M.a - M.c) / (M.b * (N + 1));
      GT.chart.line($('#du-nchart', root), {
        series: [{ name: 'Cournot price', color: 'var(--accent)', points: pts, dots: true }, { name: 'Industry profit ÷ 100', color: 'var(--amber)', points: prof.map(([n, v]) => [n, v / 100]), dots: true, dash: '5 4' }],
        xMin: 1, xMax: 12, yMin: 0, xLabel: 'Number of firms N', yLabel: 'Price / profit', height: 300, xTicks: 11,
        hlines: [{ y: M.c, label: 'Marginal cost', color: 'var(--bad)' }],
        markers: [{ x: N, y: p, label: `N=${N}: P=${fmt(p, 1)}`, color: 'var(--p1)' }]
      });
      const lerner = (p - M.c) / p;
      $('#du-nmsg', root).innerHTML = `<div class="note"><p>With <b>${N}</b> firm${N > 1 ? 's' : ''}: each produces ${fmt(q, 1)}, price = ${fmt(p, 1)}, price-cost margin (Lerner index) = ${GT.pct(lerner, 1)}, industry profit = ${fmt(Math.pow(M.a - M.c, 2) * N / (M.b * Math.pow(N + 1, 2)))}. Formula: <code>P = (a + N·c)/(N+1)</code>.</p></div>`;
    }
    $('#du-n', root).oninput = drawN;

    function refresh() {
      drawBench();
      if (mode === 'cournot') drawCournot();
      else if (mode === 'bertrand') drawBertrand();
      else drawN();
    }
    refresh();
  }

  GT.register({
    id: 'duopoly', num: 3, icon: '🏭', title: 'Duopoly Lab: Cournot vs Bertrand', modules: ['M2'], sessions: '5', time: '35–45 min',
    tagline: 'Ten rounds choosing output against a rival steel producer, then ten rounds setting prices. Also covers capacity limits and what happens to price as firms enter or exit.',
    problem: 'Two steel producers decide independently how much to produce, and each firm\'s profit depends on both outputs. How do firms reach equilibrium, and at what cost to the industry? Which model fits Indian telecom after Jio\'s entry?',
    concepts: ['Cournot', 'Bertrand paradox', 'Reaction functions', 'Stackelberg', 'Capacity commitment'],
    render,
    guide: {
      objective: 'Understand how the strategic variable (quantity vs price) changes the equilibrium, read best-response curves, and judge which model fits an industry.',
      players: '1 student vs an AI rival with a chosen behavioural type',
      modes: 'Cournot (10 rounds) · Bertrand with/without capacity (10 rounds) · N-firm comparative statics',
      rules: `<ul><li>Market demand: <code>P = a − b·(q₁+q₂)</code>. Both firms have marginal cost <code>c</code>.</li><li><b>Cournot:</b> each round you pick an output. Price clears the market. Profit = (P − c)·q.</li><li><b>Bertrand:</b> each round you pick a price. The cheaper firm gets all demand (unless capacity-constrained). A tie splits demand.</li><li>Total profit over 10 rounds is your score. Market parameters can be changed at any time.</li></ul>`,
      steps: [
        'Read the <b>Benchmarks</b> table first. What does each firm earn under cartel, Cournot and Bertrand?',
        'In <b>Cournot</b>, play 10 rounds against the <i>Adaptive</i> rival. Try producing the cartel quantity. What does the rival do?',
        'Watch your play path in the reaction-function chart. Where does it converge?',
        'Restart against the <i>Aggressive (Stackelberg)</i> rival. What is your best response to a committed big producer?',
        'Switch to <b>Bertrand</b> and try to keep prices high for 10 rounds. Record the final price.',
        'Turn on <b>Capacity limit</b> and set K to the Cournot quantity. Replay. Why does the paradox disappear?',
        'Use the <b>N-firm</b> tab to see how price changes as the number of operators drops from 4 to 3 (consolidation).'
      ],
      facilitator: [
        'Ask students to write down whether Indian telecom post-Jio is "Cournot" or "Bertrand" before class (the pre-read in Session 5).',
        'Demo Cournot on the projector with the adaptive rival. Mark the Cournot NE on the chart and show how the path spirals into it.',
        'Run Bertrand live with a volunteer: their price has to stay above cost while the AI undercuts. Most volunteers are surprised by how fast the price reaches cost.',
        'Turn on capacity and discuss: telecom spectrum and network capacity, steel and cement capacity. Capacity commitments soften price competition.',
        'Timing: 10 min Cournot, 10 min Bertrand, 10 min capacity and N-firm, 10 min Jio discussion.'
      ],
      variations: ['Let pairs of students play Cournot against each other on paper with this tool as the referee.', 'Change marginal costs asymmetrically (discuss in theory): a low-cost entrant like Jio gets a bigger Cournot share.', 'Set a = 140 to model a demand boom (the 4G data explosion) and compare profits.']
    },
    theory: `
      <h3 style="margin-top:0">Cournot (quantity competition)</h3>
      <p>Each firm chooses output taking the rival's output as given. Firm 1's profit is <code>(a − b(q₁+q₂) − c)·q₁</code>. Setting the derivative to zero gives the <b>best-response (reaction) function</b>:</p>
      <div class="formula">q₁ = (a − c − b·q₂) / 2b      q₂ = (a − c − b·q₁) / 2b
Nash: q₁* = q₂* = (a − c)/3b,  P* = (a + 2c)/3</div>
      <p>The equilibrium lies between monopoly and perfect competition. Each firm ignores the fact that its extra output lowers the price the <i>rival</i> gets, so together they over-produce relative to the cartel. This is a Prisoner's Dilemma in continuous strategies.</p>
      <h3>Bertrand (price competition)</h3>
      <p>With identical products and no capacity limits, any price above cost invites undercutting by ₹1, which steals the whole market. The only Nash equilibrium is <b>P = c</b>, with zero profit. This is the <b>Bertrand paradox</b>: two firms are enough for the competitive outcome.</p>
      <h3>Resolving the paradox</h3>
      <ul><li><b>Capacity constraints</b> (Kreps & Scheinkman 1983): if firms first choose capacity and then compete on price, the outcome matches Cournot. Undercutting is pointless if you cannot serve the extra customers.</li><li><b>Product differentiation:</b> loyal customers, network quality and bundles (JioCinema, Airtel Xstream) soften price competition.</li><li><b>Repeated interaction:</b> see the OPEC simulation (Module 4).</li></ul>
      <h3>Stackelberg (sequential quantities)</h3>
      <p>If one firm commits first, it produces (a − c)/2b and the follower best-responds with (a − c)/4b. The leader earns more than at Cournot. This is the first-mover advantage developed in Module 3.</p>
      <h3>N firms</h3>
      <div class="formula">P = (a + N·c)/(N + 1)    →  c  as N → ∞</div>
      <h3>Which model when?</h3>
      <table class="data"><thead><tr><th>Industry feature</th><th>Better model</th></tr></thead><tbody>
        <tr><td>Capacity is costly and slow to adjust (steel, cement, refining, airlines' fleet)</td><td>Cournot</td></tr>
        <tr><td>Capacity is cheap and prices change easily (e-commerce, software, data packs)</td><td>Bertrand</td></tr>
        <tr><td>Telecom: spectrum and towers fixed in the short run, but tariffs change overnight</td><td>Two-stage: capacity (Cournot) then price</td></tr>
      </tbody></table>`,
    practice: [
      { tag: 'India', title: 'Telecom after Jio: Bertrand in prices, Cournot in capacity', text: 'Jio\'s very large upfront network investment gave it capacity to absorb demand. Incumbents could not simply match low prices without the capacity to carry the traffic. The industry went from many operators to three private players plus BSNL.' },
      { tag: 'India', title: 'Cement and steel', text: 'Capacity-led industries with high fixed costs behave in a Cournot-like way, with prices above cost. The CCI fined major cement firms over ₹6,000 crore (2012, reaffirmed later) for coordinating capacity utilisation and prices, i.e. trying to move from Cournot to cartel.' },
      { tag: 'India', title: 'Airline fares on trunk routes', text: 'IndiGo and the Air India group control most domestic capacity. Seats are a Cournot-style commitment, but dynamic pricing is Bertrand-like. Fares spike when capacity exits (e.g. Go First\'s 2023 grounding).' },
      { tag: 'Global', title: 'OPEC+ and shale', text: 'Oil producers choose output (Cournot), and US shale acts as a fringe that responds to price. Each production decision moves the world price for everyone.' },
      { tag: 'Frontier', title: 'Price-matching guarantees', text: '"We\'ll match any lower price" sounds pro-consumer, but it removes the incentive to undercut, which turns a Bertrand market into a collusive one. Regulators increasingly examine automated price-matching across e-commerce platforms.' }
    ],
    debrief: [
      'Why does the Cournot equilibrium produce more output than a cartel? Who benefits?',
      'In Bertrand, why does the cooperative price unravel even though both firms know it is better?',
      'How does a capacity limit change the incentive to undercut? Give an Indian industry where this applies.',
      'Was Jio\'s 2016 strategy a Cournot or Bertrand move? Consider both its capacity and its pricing.',
      'Against the Stackelberg rival, what was your best response? Why is committing to a big quantity valuable?',
      'Using the N-firm tab, what happens to consumer welfare if a 4-player market consolidates to 3? What should the CCI weigh?'
    ],
    aiPrompt: `Act as a strategy consultant. Indian telecom: before 2016 there were 6+ operators; after Jio's entry and consolidation there are 3 private players plus BSNL.
1. Model the market as (a) Cournot and (b) Bertrand with capacity constraints. State your assumptions about demand and costs.
2. Which model better explains (i) the 2016–2019 price collapse and (ii) the tariff hikes of 2019, 2021 and July 2024?
3. Use the N-firm Cournot formula P = (a + Nc)/(N+1) to illustrate the welfare effect of moving from 4 to 3 players.
4. Flag where your analysis relies on guesses rather than data.`
  });
})();
