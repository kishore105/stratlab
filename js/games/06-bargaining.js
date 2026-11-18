/* 06 — Bargaining Table: Ultimatum, Rubinstein alternating offers, Nash bargaining & BATNA */
(function () {
  const { $, $$, fmt, esc } = GT;
  const PIE = 1000;
  const acc = s => 1 / (1 + Math.exp(-18 * (s - 0.25))); // P(accept | share offered)

  function render(root) {
    root.innerHTML = `
      <div class="subtabs">
        <button class="subtab active" data-sub="prop">Ultimatum: you propose</button>
        <button class="subtab" data-sub="resp">Ultimatum: you respond</button>
        <button class="subtab" data-sub="rub">Alternating offers (Rubinstein)</button>
        <button class="subtab" data-sub="nash">Nash bargaining & BATNA</button>
        <button class="subtab" data-sub="class">Classroom mode</button>
      </div>

      <div data-pane="prop" class="layout-2">
        <div class="card">
          <div class="panel-title">Split ₹${fmt(PIE)}: round <span id="ba-pr">1</span>/10</div>
          <p class="muted" style="font-size:.88rem">Each round you meet a <b>different</b> responder drawn from a population that behaves like real experimental subjects. If they reject, you both get nothing.</p>
          <div class="field"><div class="field-row"><label>Offer to responder</label><span class="val" id="ba-ov">₹300</span></div><input type="range" id="ba-offer" min="0" max="1000" step="25" value="300"></div>
          <div class="btn-row"><button class="btn primary" id="ba-pgo">Make offer</button><button class="btn" id="ba-preset">Restart</button></div>
          <div class="kpis mt"><div class="kpi p1"><div class="k">You earned</div><div class="v" id="ba-pt">0</div></div><div class="kpi"><div class="k">Rejections</div><div class="v" id="ba-prj">0</div></div></div>
          <div class="log mt" id="ba-plog"></div>
        </div>
        <div class="card"><div class="panel-title">What theory says vs what people do</div><div id="ba-pchart"></div><div id="ba-pmsg"></div></div>
      </div>

      <div data-pane="resp" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Proposer offers you…  (round <span id="ba-rr">1</span>/10)</div>
          <div class="center" style="padding:16px 0"><div class="big-number" id="ba-roff">–</div><div class="muted">out of ₹${fmt(PIE)}</div></div>
          <div class="btn-row" style="justify-content:center"><button class="btn p1" id="ba-acc">Accept</button><button class="btn p2" id="ba-rej">Reject</button></div>
          <div class="kpis mt"><div class="kpi p1"><div class="k">You earned</div><div class="v" id="ba-rt">0</div></div><div class="kpi"><div class="k">Money "burned" by rejecting</div><div class="v" id="ba-rb">0</div></div></div>
          <button class="btn sm mt" id="ba-rreset">Restart</button>
        </div>
        <div class="card"><div class="panel-title">Your decisions</div><div class="log" id="ba-rlog"></div><div id="ba-rmsg"></div></div>
      </div>

      <div data-pane="rub" class="layout-2 hide">
        <div class="stack">
          <div class="card">
            <div class="panel-title">Startup acquisition: ₹100 crore of surplus</div>
            <p class="muted" style="font-size:.88rem">You are the <b style="color:var(--p1)">founder (seller)</b>. The AI is the <b style="color:var(--p2)">acquirer</b>. Offers alternate. Each round of delay shrinks the value to each side by its discount factor (cash burn, market window). After round 10 the deal is dead.</p>
            <div class="field"><div class="field-row"><label>Founder's patience δ<sub>S</sub></label><span class="val" data-v="dS"></span></div><input type="range" data-k="dS" min="0.5" max="0.98" step="0.01" value="0.80"></div>
            <div class="field"><div class="field-row"><label>Acquirer's patience δ<sub>B</sub></label><span class="val" data-v="dB"></span></div><input type="range" data-k="dB" min="0.5" max="0.98" step="0.01" value="0.90"></div>
            <div class="note"><p id="ba-spne"></p></div>
          </div>
          <div class="card">
            <div class="panel-title">Round <span id="ba-ur">1</span></div>
            <div id="ba-uact"></div>
            <button class="btn sm mt" id="ba-ureset">Restart negotiation</button>
          </div>
        </div>
        <div class="card"><div class="panel-title">Value shrinking with delay (in today's ₹ crore)</div><div id="ba-uchart"></div><div class="log mt" id="ba-ulog"></div></div>
      </div>

      <div data-pane="nash" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Joint venture negotiation</div>
          <div class="field"><div class="field-row"><label>Total JV value V (₹ cr)</label><span class="val" data-v="V"></span></div><input type="range" data-k="V" min="100" max="1000" step="10" value="500"></div>
          <div class="field"><div class="field-row"><label>Firm A's BATNA d<sub>A</sub></label><span class="val" data-v="dA"></span></div><input type="range" data-k="dA" min="0" max="500" step="10" value="120"></div>
          <div class="field"><div class="field-row"><label>Firm B's BATNA d<sub>B</sub></label><span class="val" data-v="dBn"></span></div><input type="range" data-k="dBn" min="0" max="500" step="10" value="80"></div>
          <div class="field"><div class="field-row"><label>A's bargaining power α</label><span class="val" data-v="al"></span></div><input type="range" data-k="al" min="0" max="1" step="0.05" value="0.5"></div>
          <div id="ba-nout"></div>
        </div>
        <div class="card"><div class="panel-title">Zone of possible agreement (ZOPA)</div><div id="ba-zopa"></div><div class="panel-title mt">Nash product across possible splits</div><div id="ba-nchart"></div></div>
      </div>

      <div data-pane="class" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Paste class ultimatum results</div>
          <p class="muted" style="font-size:.88rem">One pair per line: <code>offer, Y/N</code> (amount offered out of ₹1,000, and whether it was accepted). Pairs play on paper or by chat.</p>
          <textarea id="ba-cpaste" placeholder="400, Y&#10;250, N&#10;500, Y"></textarea>
          <div class="btn-row mt"><button class="btn primary" id="ba-cgo">Analyse</button><button class="btn sm" id="ba-cdemo">Demo data</button></div>
        </div>
        <div class="card"><div id="ba-cout"><p class="muted">Results will appear here.</p></div></div>
      </div>`;
    GT.subtabs(root, s => { if (s === 'rub') rubDraw(); if (s === 'nash') nashDraw(); });

    /* ---------- Ultimatum proposer ---------- */
    let P = { hist: [], tot: 0 };
    const offerEl = $('#ba-offer', root);
    offerEl.oninput = () => $('#ba-ov', root).textContent = '₹' + fmt(+offerEl.value);
    function pDraw() {
      const curve = [], ev = [];
      for (let o = 0; o <= PIE; o += 25) { curve.push([o, acc(o / PIE) * 100]); ev.push([o, (PIE - o) * acc(o / PIE) / 10]); }
      const best = ev.reduce((a, b) => b[1] > a[1] ? b : a);
      GT.chart.line($('#ba-pchart', root), {
        series: [{ name: 'Probability responder accepts (%)', color: 'var(--p2)', points: curve }, { name: 'Your expected earnings ÷ 10', color: 'var(--p1)', points: ev, area: true },
        { name: 'Your offers (✓ accepted at top, ✗ rejected at bottom)', color: 'var(--ink)', points: P.hist.map(h => [h.o, h.ok ? 100 : 0]), dots: true, noLine: true, r: 5 }],
        xMin: 0, xMax: PIE, yMin: 0, yMax: 100, xLabel: 'Amount offered (₹)', yLabel: '%  /  ₹÷10', height: 300,
        vlines: [{ x: best[0], label: `Best offer ≈ ₹${best[0]}`, color: 'var(--amber)' }, { x: 1, label: 'SPNE ≈ ₹1', color: 'var(--bad)' }]
      });
      $('#ba-pr', root).textContent = Math.min(P.hist.length + 1, 10);
      $('#ba-pt', root).textContent = '₹' + fmt(P.tot);
      $('#ba-prj', root).textContent = P.hist.filter(h => !h.ok).length;
      $('#ba-plog', root).innerHTML = P.hist.map((h, i) => `<div>R${i + 1}: offered ₹${fmt(h.o)} → ${h.ok ? '<span class="pill good">accepted</span>' : '<span class="pill bad">rejected</span>'} you get ₹${fmt(h.ok ? PIE - h.o : 0)}</div>`).reverse().join('') || '<div class="muted">No offers yet.</div>';
      $('#ba-pgo', root).disabled = P.hist.length >= 10;
      return best;
    }
    $('#ba-pgo', root).onclick = () => {
      const o = +offerEl.value, ok = Math.random() < acc(o / PIE);
      P.hist.push({ o, ok }); if (ok) P.tot += PIE - o;
      const best = pDraw();
      if (P.hist.length === 10) {
        $('#ba-pmsg', root).innerHTML = `<div class="note"><p>You earned <b>₹${fmt(P.tot)}</b> over 10 rounds. Offering the profit-maximising ≈₹${best[0]} each time would earn about ₹${fmt(10 * (PIE - best[0]) * acc(best[0] / PIE))} in expectation. Offering the SPNE minimum would earn almost nothing, because real responders reject "insulting" offers.</p></div>`;
        GT.log('bargaining', `Ultimatum proposer: earned ₹${fmt(P.tot)}, avg offer ₹${fmt(GT.mean(P.hist.map(h => h.o)))}`, { hist: P.hist });
      }
    };
    $('#ba-preset', root).onclick = () => { P = { hist: [], tot: 0 }; $('#ba-pmsg', root).innerHTML = ''; pDraw(); };
    pDraw();

    /* ---------- Ultimatum responder ---------- */
    let R = { hist: [], tot: 0, burned: 0, cur: 0 };
    const drawOffer = () => { const r = Math.random(); return r < 0.45 ? GT.pick([400, 450, 500]) : r < 0.75 ? GT.pick([250, 300, 350]) : GT.pick([50, 100, 150, 200]); };
    function rNext() { R.cur = drawOffer(); $('#ba-roff', root).textContent = '₹' + fmt(R.cur); $('#ba-rr', root).textContent = Math.min(R.hist.length + 1, 10); }
    function rDraw() {
      $('#ba-rt', root).textContent = '₹' + fmt(R.tot); $('#ba-rb', root).textContent = '₹' + fmt(R.burned);
      $('#ba-rlog', root).innerHTML = R.hist.map((h, i) => `<div>R${i + 1}: offered ₹${fmt(h.o)} → you ${h.a ? 'accepted' : '<b>rejected</b>'}</div>`).reverse().join('') || '<div class="muted">Waiting for your first decision.</div>';
      ['#ba-acc', '#ba-rej'].forEach(s => $(s, root).disabled = R.hist.length >= 10);
      if (R.hist.length === 10) {
        const rejected = R.hist.filter(h => !h.a);
        const minAcc = Math.min(...R.hist.filter(h => h.a).map(h => h.o), Infinity);
        $('#ba-rmsg', root).innerHTML = `<div class="note amber"><p>You rejected ${rejected.length} offer(s), giving up ₹${fmt(R.burned)} to punish the proposers. ${isFinite(minAcc) ? `Your lowest accepted offer was ₹${fmt(minAcc)}.` : ''} A purely money-maximising responder (the SPNE assumption) accepts every positive offer. Your rejections show the size of your preference for fairness, or for reputation.</p></div>`;
        GT.log('bargaining', `Ultimatum responder: rejected ${rejected.length}/10, burned ₹${fmt(R.burned)}`, { hist: R.hist });
      }
    }
    const respond = a => { if (R.hist.length >= 10) return; R.hist.push({ o: R.cur, a }); if (a) R.tot += R.cur; else R.burned += R.cur; rDraw(); if (R.hist.length < 10) rNext(); };
    $('#ba-acc', root).onclick = () => respond(true);
    $('#ba-rej', root).onclick = () => respond(false);
    $('#ba-rreset', root).onclick = () => { R = { hist: [], tot: 0, burned: 0, cur: 0 }; $('#ba-rmsg', root).innerHTML = ''; rNext(); rDraw(); };
    rNext(); rDraw();

    /* ---------- Rubinstein ---------- */
    let prm = {};
    const paint = GT.bindRanges(root, o => { prm = o; if (!$('[data-pane=rub]', root).classList.contains('hide')) { rubReset(); } if (!$('[data-pane=nash]', root).classList.contains('hide')) nashDraw(); }, { dS: v => fmt(v, 2), dB: v => fmt(v, 2), al: v => fmt(v, 2) });
    prm = paint();
    const SUR = 100;
    let U = { t: 0, log: [], done: false, aiOffer: null };
    const xS = () => (1 - prm.dB) / (1 - prm.dS * prm.dB); // founder's share when founder proposes
    const xB = () => (1 - prm.dS) / (1 - prm.dS * prm.dB); // acquirer's share when acquirer proposes
    function rubReset() { U = { t: 0, log: [], done: false, aiOffer: null }; rubDraw(); }
    function rubDraw() {
      $('#ba-spne', root).innerHTML = `<b>SPNE prediction:</b> the founder proposes in round 1 and keeps <b>₹${fmt(SUR * xS(), 1)} cr</b> (${GT.pct(xS(), 1)}); the acquirer accepts immediately. The more patient side gets more. If the acquirer proposed first, it would keep ${GT.pct(xB(), 1)}.`;
      const box = $('#ba-uact', root);
      $('#ba-ur', root).textContent = U.t + 1;
      const discS = Math.pow(prm.dS, U.t), discB = Math.pow(prm.dB, U.t);
      if (U.done) { box.innerHTML = U.doneMsg; }
      else if (U.t >= 10) { U.done = true; U.doneMsg = '<div class="note bad"><p><b>Deal collapsed.</b> The window closed after 10 rounds. Both sides walk away with nothing.</p></div>'; box.innerHTML = U.doneMsg; GT.log('bargaining', 'Rubinstein: no deal after 10 rounds', { prm }); }
      else if (U.t % 2 === 0) {
        box.innerHTML = `<p style="font-size:.9rem">Your turn to propose. Today's value of the deal to you: ${GT.pct(discS, 0)}; to the acquirer: ${GT.pct(discB, 0)}.</p>
          <div class="field"><div class="field-row"><label>You keep (₹ cr of ${SUR})</label><span class="val" id="ba-ukv">60</span></div><input type="range" id="ba-uk" min="0" max="100" step="1" value="${Math.round(SUR * xS())}"></div>
          <button class="btn p1" id="ba-upro">Propose</button>`;
        const k = $('#ba-uk', root); $('#ba-ukv', root).textContent = k.value; k.oninput = () => $('#ba-ukv', root).textContent = k.value;
        $('#ba-upro', root).onclick = () => {
          const keep = +k.value, give = SUR - keep;
          const threshold = SUR * prm.dB * xB();
          const ok = give >= threshold - 0.5;
          U.log.push(`R${U.t + 1}: you ask ₹${keep} cr, offering ₹${give} cr → acquirer ${ok ? 'accepts' : 'rejects'} (it needs ≥ ₹${fmt(threshold, 1)} cr to beat waiting)`);
          if (ok) finish(keep, give); else { U.t++; rubDraw(); }
        };
      } else {
        const offer = Math.round(SUR * prm.dS * xS() * 10) / 10;
        box.innerHTML = `<p style="font-size:.9rem">The acquirer proposes: you get <b>₹${fmt(offer, 1)} cr</b>, it keeps ₹${fmt(SUR - offer, 1)} cr.</p><div class="btn-row"><button class="btn p1" id="ba-uacc">Accept</button><button class="btn p2" id="ba-urej">Reject & counter next round</button></div>`;
        $('#ba-uacc', root).onclick = () => { U.log.push(`R${U.t + 1}: acquirer offers ₹${fmt(offer, 1)} cr → you accept`); finish(offer, SUR - offer); };
        $('#ba-urej', root).onclick = () => { U.log.push(`R${U.t + 1}: acquirer offers ₹${fmt(offer, 1)} cr → you reject`); U.t++; rubDraw(); };
      }
      $('#ba-ulog', root).innerHTML = U.log.map(l => `<div>${l}</div>`).join('') || '<div class="muted">No offers yet.</div>';
      const ptsS = [], ptsB = [];
      for (let t = 0; t <= 10; t++) { ptsS.push([t + 1, SUR * Math.pow(prm.dS, t)]); ptsB.push([t + 1, SUR * Math.pow(prm.dB, t)]); }
      GT.chart.line($('#ba-uchart', root), {
        series: [{ name: 'Value of ₹100 cr to founder', color: 'var(--p1)', points: ptsS }, { name: 'Value of ₹100 cr to acquirer', color: 'var(--p2)', points: ptsB }],
        xMin: 1, xMax: 11, yMin: 0, yMax: 100, xLabel: 'Agreement in round', yLabel: '₹ crore (today)', height: 240, xTicks: 10,
        vlines: [{ x: U.t + 1, label: 'now', color: 'var(--ink-2)' }]
      });
      function finish(you, them) {
        U.done = true;
        const pv = you * Math.pow(prm.dS, U.t);
        U.doneMsg = `<div class="note good"><p><b>Deal in round ${U.t + 1}.</b> You get ₹${fmt(you, 1)} cr, worth <b>₹${fmt(pv, 1)} cr</b> in today's terms. The SPNE gave ₹${fmt(SUR * xS(), 1)} cr in round 1. ${U.t > 0 ? 'Delay destroyed value for both sides.' : ''}</p></div>`;
        GT.log('bargaining', `Rubinstein: deal in round ${U.t + 1}, founder PV ₹${fmt(pv, 1)} cr (SPNE ${fmt(SUR * xS(), 1)})`, { prm, you, them, round: U.t + 1 });
        rubDraw();
      }
    }
    $('#ba-ureset', root).onclick = rubReset;

    /* ---------- Nash bargaining ---------- */
    function nashDraw() {
      const V = prm.V, dA = prm.dA, dB = prm.dBn, a = prm.al;
      const S = V - dA - dB;
      const out = $('#ba-nout', root);
      if (S <= 0) {
        out.innerHTML = `<div class="note bad"><p><b>No ZOPA.</b> The BATNAs add up to ₹${fmt(dA + dB)} cr, which is at least the JV value of ₹${fmt(V)} cr. No agreement can make both sides better off, so walking away is rational.</p></div>`;
        $('#ba-zopa', root).innerHTML = ''; $('#ba-nchart', root).innerHTML = ''; return;
      }
      const xA = dA + a * S, xBv = dB + (1 - a) * S;
      out.innerHTML = `<div class="kpis"><div class="kpi p1"><div class="k">Firm A gets</div><div class="v">₹${fmt(xA)}</div></div><div class="kpi p2"><div class="k">Firm B gets</div><div class="v">₹${fmt(xBv)}</div></div><div class="kpi accent"><div class="k">Surplus split</div><div class="v">₹${fmt(S)}</div></div></div>
        <div class="formula">x_A = d_A + α·(V − d_A − d_B) = ${fmt(dA)} + ${fmt(a, 2)}×${fmt(S)} = ${fmt(xA)}</div>
        <p class="muted" style="font-size:.86rem">Raise A's BATNA by ₹10 and A's share rises by ₹${fmt(10 * (1 - a), 1)}. <b>Improving your outside option is the most reliable way to gain bargaining power.</b> With α = 0.5 this equals the two-player Shapley value.</p>`;
      const W = 640, H = 90, X = v => 20 + v / V * (W - 40);
      $('#ba-zopa', root).innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%">
        <rect x="${X(0)}" y="30" width="${X(V) - X(0)}" height="26" rx="4" style="fill:var(--surface-2);stroke:var(--line-2)"/>
        <rect x="${X(0)}" y="30" width="${X(dA) - X(0)}" height="26" style="fill:var(--p1-soft)"/>
        <rect x="${X(V - dB)}" y="30" width="${X(V) - X(V - dB)}" height="26" style="fill:var(--p2-soft)"/>
        <rect x="${X(dA)}" y="30" width="${X(V - dB) - X(dA)}" height="26" style="fill:var(--good-soft);stroke:var(--good)"/>
        <line x1="${X(xA)}" x2="${X(xA)}" y1="22" y2="64" style="stroke:var(--amber);stroke-width:3"/>
        <text x="${X(xA)}" y="16" text-anchor="middle" style="fill:var(--amber);font-weight:700;font-size:12px">NBS split</text>
        <text x="${X(dA / 2)}" y="78" text-anchor="middle" style="fill:var(--p1);font-size:11px">A's BATNA</text>
        <text x="${X((dA + V - dB) / 2)}" y="78" text-anchor="middle" style="fill:var(--good);font-size:11px;font-weight:700">ZOPA (₹${fmt(S)} cr)</text>
        <text x="${X(V - dB / 2)}" y="78" text-anchor="middle" style="fill:var(--p2);font-size:11px">B's BATNA</text>
      </svg><p class="muted" style="font-size:.8rem">The bar shows what A receives, from ₹0 to ₹${fmt(V)} cr.</p>`;
      const pts = [];
      for (let x = dA; x <= V - dB; x += Math.max(1, S / 80)) pts.push([x, Math.pow(x - dA, a) * Math.pow(V - x - dB, 1 - a)]);
      GT.chart.line($('#ba-nchart', root), { series: [{ name: 'Nash product (u_A − d_A)^α (u_B − d_B)^(1−α)', color: 'var(--accent)', points: pts, area: true }], xLabel: 'A\'s share (₹ cr)', yLabel: 'Nash product', height: 220, xMin: dA, xMax: V - dB, markers: [{ x: xA, y: Math.pow(xA - dA, a) * Math.pow(xBv - dB, 1 - a), label: 'maximum', color: 'var(--amber)' }] });
    }

    /* ---------- classroom ---------- */
    $('#ba-cdemo', root).onclick = () => { $('#ba-cpaste', root).value = Array.from({ length: 30 }, () => { const o = GT.pick([500, 500, 450, 400, 400, 350, 300, 250, 200, 100]); return `${o}, ${Math.random() < acc(o / PIE) ? 'Y' : 'N'}`; }).join('\n'); };
    $('#ba-cgo', root).onclick = () => {
      const rows = $('#ba-cpaste', root).value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const n = GT.parseNums(l)[0]; return { o: n, ok: /\b(y|yes|1|accept)/i.test(l.replace(/^[\d.\s,]+/, '')) }; }).filter(r => isFinite(r.o));
      if (!rows.length) { GT.toast('Nothing to analyse'); return; }
      const bins = [[0, 199], [200, 299], [300, 399], [400, 499], [500, 1000]];
      const bars = bins.map(([lo, hi]) => { const g = rows.filter(r => r.o >= lo && r.o <= hi); return { label: `₹${lo}–${hi === 1000 ? '+' : hi}`, value: g.length ? g.filter(r => r.ok).length / g.length * 100 : 0, n: g.length }; });
      const out = $('#ba-cout', root);
      out.innerHTML = `<div class="kpis"><div class="kpi"><div class="k">Pairs</div><div class="v">${rows.length}</div></div><div class="kpi accent"><div class="k">Mean offer</div><div class="v">₹${fmt(GT.mean(rows.map(r => r.o)))}</div></div><div class="kpi p2"><div class="k">Rejection rate</div><div class="v">${GT.pct(rows.filter(r => !r.ok).length / rows.length)}</div></div></div><div class="panel-title mt">Acceptance rate by offer size</div><div id="ba-cc"></div><p class="muted" style="font-size:.86rem">Typical experimental finding: mean offers of 40–50%, and offers below 20% rejected about half the time (Güth et al. 1982; Camerer 2003).</p>`;
      GT.chart.bars($('#ba-cc', out), { bars: bars.map(b => ({ label: `${b.label} (n=${b.n})`, value: b.value, color: 'var(--accent)' })), yMax: 100, yLabel: '% accepted', height: 240 });
      GT.log('bargaining', `Classroom ultimatum: ${rows.length} pairs, mean offer ₹${fmt(GT.mean(rows.map(r => r.o)))}`, { rows });
    };
  }

  GT.register({
    id: 'bargaining', num: 6, icon: '🤝', title: 'The Bargaining Table', modules: ['M3', 'M9'], sessions: '9, 19', time: '40–60 min',
    tagline: 'Ultimatum offers, alternating offers over the sale of a startup, and a Nash bargaining calculator with BATNAs.',
    problem: 'In wage talks, M&A or JV negotiations, every round of delay destroys value. How does the order of moves decide who gets the bigger share? How much should you offer, and when should you walk away?',
    concepts: ['Ultimatum game', 'SPNE vs behaviour', 'Rubinstein bargaining', 'Patience', 'Nash bargaining', 'BATNA & ZOPA'],
    render,
    guide: {
      objective: 'Compare the subgame-perfect prediction with real behaviour in ultimatum bargaining, see how patience and first-mover position shape the split, and quantify how BATNAs set bargaining power.',
      players: '1 student vs AI populations; pairs of students in Classroom mode',
      modes: 'Ultimatum (proposer and responder) · Alternating offers · Nash bargaining calculator · Classroom paste-in',
      rules: `<ul><li><b>Ultimatum:</b> the proposer offers a split of ₹1,000. If the responder rejects, both get zero. There is no second round.</li><li><b>Rubinstein:</b> you and the acquirer alternate offers on ₹100 cr of surplus. Delay discounts each side's value by its δ per round. The deal dies after 10 rounds.</li><li><b>Nash bargaining:</b> set the JV value, each side's BATNA and relative bargaining power, then read off the predicted split.</li></ul>`,
      steps: [
        '<b>Ultimatum, propose:</b> make 10 offers. Try a low one (₹100) early. Watch the acceptance curve and find the offer that maximises expected earnings.',
        '<b>Ultimatum, respond:</b> decide on 10 offers. Did you reject any positive offer? Why?',
        'Compare: SPNE says offer ₹1 and accept anything. What did you do, and what does that say about the payoffs people really care about?',
        '<b>Rubinstein:</b> with default patience, propose a split. Is it accepted? Then make the founder less patient (δ<sub>S</sub> = 0.6) and see how the SPNE share changes.',
        'Try rejecting the acquirer\'s offers several times and track how the value shrinks.',
        '<b>Nash bargaining:</b> raise A\'s BATNA step by step. How much of each ₹10 BATNA gain turns into deal value? Set BATNAs so that no ZOPA exists.',
        'Connect: with α = 0.5, the Nash bargaining split equals the two-player Shapley value (see Coalition Lab).'
      ],
      facilitator: [
        'Session 9 pre-work asks students to play the ultimatum game with a friend. Collect those results and paste them into Classroom mode.',
        'Live: pair students. Proposers write offers on slips, responders accept or reject. Paste the results and show the acceptance-by-offer chart.',
        'Theory reveal: backward induction gives the minimal offer. Then ask why it fails (fairness, reputation, emotions, Indian cultural norms?).',
        'Session 19: run the Rubinstein tab on the projector with two student volunteers advising "founder" and "acquirer".',
        'Close with BATNA: the Nash bargaining tab shows quantitatively that improving your outside option beats arguing harder.',
        'Timing: 15 min ultimatum (Session 9), 25 min Rubinstein and Nash (Session 19).'
      ],
      variations: ['Dictator game: remove the responder\'s veto. Do offers fall? That isolates altruism from fear of rejection.', 'Raise stakes (₹1,000 → ₹1 lakh hypothetically). Do rejection thresholds change?', 'Labour negotiation framing: union vs management with strike costs as discount factors.']
    },
    theory: `
      <h3 style="margin-top:0">Ultimatum game</h3>
      <p>The proposer offers x of a pie; the responder accepts (payoffs pie − x, x) or rejects (0, 0). With purely money-motivated players, backward induction says the responder accepts any x > 0, so the proposer offers the smallest unit. <b>SPNE: offer ≈ 0, accept.</b></p>
      <p>Hundreds of experiments in more than 25 countries find modal offers of 40–50%, and offers below about 20% are rejected around half the time. Responders pay to punish unfairness. This is evidence for <b>social preferences</b> (inequity aversion, Fehr–Schmidt 1999), not a failure of logic.</p>
      <h3>Rubinstein alternating offers (1982)</h3>
      <p>Players alternate proposals over an infinite horizon, and delay is costly (discount factors δ₁, δ₂). The unique SPNE gives immediate agreement, with the first proposer getting:</p>
      <div class="formula">x₁* = (1 − δ₂) / (1 − δ₁·δ₂)        x₂* = 1 − x₁*
Equal patience δ → x₁* = 1/(1+δ) → ½ as δ → 1</div>
      <p><b>Lessons:</b> (i) patience is power: the side that can wait gets more; (ii) the first-mover advantage shrinks as offers become faster; (iii) efficient deals close immediately, so delays in practice signal private information or commitment problems.</p>
      <h3>Nash bargaining solution (1950)</h3>
      <p>Given disagreement points (BATNAs) d_A, d_B and value V, the split maximises the (generalised) Nash product:</p>
      <div class="formula">max (u_A − d_A)^α · (u_B − d_B)^(1−α)   s.t. u_A + u_B = V
⇒ u_A = d_A + α·(V − d_A − d_B)</div>
      <p>Axioms: Pareto efficiency, symmetry, independence of irrelevant alternatives, and invariance to rescaling of utility. Each side gets its BATNA plus a share of the <b>surplus</b>. Rubinstein's model converges to the Nash solution as the time between offers shrinks.</p>
      <h3>BATNA and ZOPA (Fisher & Ury, <i>Getting to Yes</i>)</h3>
      <ul><li><b>BATNA</b>: Best Alternative To a Negotiated Agreement. Your walk-away value.</li><li><b>ZOPA</b>: Zone of Possible Agreement, between the two reservation values. If it is empty, no deal should happen.</li><li>Moves that change outcomes: improve your BATNA (a competing bid), worsen theirs, change perceived patience (deadlines), or create value (expand V).</li></ul>`,
    practice: [
      { tag: 'India', title: 'Tata Steel–Corus and bidding wars', text: 'In 2007 Tata Steel and CSN bid against each other for Corus in an auction-style negotiation. Each competing bid improved the seller\'s BATNA and pushed the price above the initial offer.' },
      { tag: 'India', title: 'Labour negotiations: Maruti Manesar, Samsung Chennai', text: 'Strikes are the "delay" in Rubinstein\'s model. Workers with savings or union funds are more patient (higher δ). Firms facing peak-season demand are less patient. Bargaining power moves with the calendar.' },
      { tag: 'India', title: 'Startup down-rounds and acqui-hires', text: 'A founder with three months of runway has a low δ and a weak BATNA. Acquirers know this and time their offers. Raising a bridge round is a BATNA-improving move that raises the founder\'s share.' },
      { tag: 'Global', title: 'Ultimatum game across cultures', text: 'Henrich et al. (2001) ran the game in 15 small-scale societies. Mean offers ranged from about 26% (Machiguenga) to over 50% (Lamalera whale hunters). Market integration and cooperation norms predicted fairness.' },
      { tag: 'Global', title: 'Microsoft–Activision and deadlines', text: 'Long regulatory reviews shift bargaining power. Termination deadlines and break fees are built-in commitments that shape the alternating-offer game between merging parties and regulators.' },
      { tag: 'Frontier', title: 'AI negotiation agents', text: 'Firms are piloting LLM-based negotiation agents for procurement (e.g. Walmart\'s use of Pactum with suppliers). Agents can be patient (high δ) and can commit to walk-away values, both of which raise bargaining power in theory.' }
    ],
    debrief: [
      'SPNE says offer ₹1. What offer actually maximised your expected earnings? What does that imply about responders\' utility functions?',
      'Did you reject any positive offer as responder? Was it irrational? Under what payoff model is it rational?',
      'In Rubinstein, why does the SPNE predict immediate agreement? Why do real negotiations still drag on?',
      'You are a founder with 3 months of cash. Using δ, explain why the acquirer delays, and name two moves to rebalance power.',
      'Show with the Nash calculator why "improve your BATNA" is better advice than "argue harder".',
      'Labour negotiations in India: which side typically has the higher δ and the better BATNA, and how do labour codes change that?'
    ],
    aiPrompt: `Role-play as the acquirer in a negotiation to buy my startup. Total deal surplus is ₹100 crore. My walk-away (BATNA) is a ₹30 crore bridge round; yours is building the product in-house for an equivalent value of ₹45 crore. I have about 4 months of runway.
1. First, compute the ZOPA and the Nash bargaining solution with equal power.
2. Then negotiate with me in alternating offers, staying in character.
3. After 4 rounds, step out of character and critique my strategy using Rubinstein's patience logic and BATNA theory.
4. Say which of your own moves were bluffs and which were credible.`
  });
})();
