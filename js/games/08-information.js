/* 08 — Information Lab: Market for Lemons (adverse selection) & Spence job-market signaling */
(function () {
  const { $, $$, fmt, esc } = GT;
  const QMAX = 10; // ₹ lakh

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="buy">Used-car buyer</button><button class="subtab" data-sub="unravel">Market unravelling</button><button class="subtab" data-sub="spence">Job-market signaling</button><button class="subtab" data-sub="screen">Insurance screening</button></div>

      <div data-pane="buy" class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="panel-title">You buy used cars on an online platform</div>
            <p class="muted" style="font-size:.88rem">Each car's true quality q (its value to the seller, ₹0–10 lakh) is known <b>only to the seller</b>. To you a car is worth <b>k × q</b>. You make a take-it-or-leave-it offer, and the seller accepts only if your offer ≥ q.</p>
            <div class="field"><div class="field-row"><label>Buyer valuation multiplier k</label><span class="val" data-v="k"></span></div><input type="range" data-k="k" min="1.1" max="3" step="0.1" value="1.5"></div>
            <div class="field"><div class="field-row"><label>Share of cars with inspection report θ</label><span class="val" data-v="th"></span></div><input type="range" data-k="th" min="0" max="1" step="0.1" value="0"></div>
          </div>
          <div class="card">
            <div class="panel-title">Car #<span id="in-n">1</span> of 12</div>
            <div id="in-car"></div>
            <div class="field mt"><div class="field-row"><label>Your offer (₹ lakh)</label><span class="val" id="in-pv">5.0</span></div><input type="range" id="in-p" min="0" max="15" step="0.1" value="5"></div>
            <div class="btn-row"><button class="btn primary" id="in-go">Make offer</button><button class="btn" id="in-reset">Restart</button></div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="kpis"><div class="kpi p1"><div class="k">Your total profit</div><div class="v" id="in-tot">0</div></div><div class="kpi"><div class="k">Cars bought</div><div class="v" id="in-cnt">0</div></div><div class="kpi"><div class="k">Avg quality bought</div><div class="v" id="in-aq">–</div></div><div class="kpi"><div class="k">Avg price paid</div><div class="v" id="in-ap">–</div></div></div>
            <div class="panel-title mt">Expected profit from a blind offer</div>
            <div id="in-ev"></div>
            <div id="in-msg"></div>
            <div class="log mt" id="in-log"></div>
          </div>
        </div>
      </div>

      <div data-pane="unravel" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Akerlof's unravelling</div>
          <p class="muted" style="font-size:.88rem">Quality is uniform between q<sub>min</sub> and ₹10 lakh. Buyers pay k × (average quality of cars still offered). Sellers whose car is worth more than the price leave. Repeat.</p>
          <div class="field"><div class="field-row"><label>k (buyer premium)</label><span class="val" data-v="k2"></span></div><input type="range" data-k="k2" min="1.05" max="2.5" step="0.05" value="1.5"></div>
          <div class="field"><div class="field-row"><label>Lowest quality q<sub>min</sub></label><span class="val" data-v="qmin"></span></div><input type="range" data-k="qmin" min="0" max="8" step="0.5" value="0"></div>
          <div class="field"><div class="field-row"><label>Certified share θ (inspections, warranties)</label><span class="val" data-v="th2"></span></div><input type="range" data-k="th2" min="0" max="1" step="0.05" value="0"></div>
          <div id="in-uout"></div>
        </div>
        <div class="card"><div class="panel-title">Price and share of cars traded, round by round</div><div id="in-uchart"></div></div>
      </div>

      <div data-pane="spence" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Hiring when talent is invisible</div>
          <p class="muted" style="font-size:.88rem">Graduates are High (productivity H) or Low (L) types. Employers cannot see type, only credentials e (e.g. years of costly certification or an MBA). Credentials cost Low types more effort. You set the hiring threshold e*: pay H if e ≥ e*, otherwise L.</p>
          <div class="field"><div class="field-row"><label>High productivity H (₹ lakh/yr)</label><span class="val" data-v="H"></span></div><input type="range" data-k="H" min="12" max="40" step="1" value="24"></div>
          <div class="field"><div class="field-row"><label>Low productivity L</label><span class="val" data-v="Lw"></span></div><input type="range" data-k="Lw" min="4" max="20" step="1" value="12"></div>
          <div class="field"><div class="field-row"><label>Cost per unit of e, High type c<sub>H</sub></label><span class="val" data-v="cH"></span></div><input type="range" data-k="cH" min="0.5" max="10" step="0.5" value="2"></div>
          <div class="field"><div class="field-row"><label>Cost per unit of e, Low type c<sub>L</sub></label><span class="val" data-v="cL"></span></div><input type="range" data-k="cL" min="0.5" max="15" step="0.5" value="5"></div>
          <div class="field"><div class="field-row"><label>Share of High types λ</label><span class="val" data-v="lam"></span></div><input type="range" data-k="lam" min="0.05" max="0.95" step="0.05" value="0.4"></div>
          <div class="field"><div class="field-row"><label><b>Your threshold e*</b></label><span class="val" data-v="es"></span></div><input type="range" data-k="es" min="0" max="10" step="0.1" value="3"></div>
        </div>
        <div class="stack">
          <div class="card"><div id="in-sverdict"></div><div id="in-schart"></div></div>
          <div class="card"><div class="panel-title">Separating range</div><div id="in-srange"></div></div>
        </div>
      </div>
      <div data-pane="screen" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Design a health-insurance menu</div>
          <p class="muted" style="font-size:.88rem">Each customer faces a ₹1 lakh medical bill (L = 100, in ₹ thousand) with probability 0.4 (high risk) or 0.1 (low risk). Only the customer knows which. Customers dislike risk: every ₹1 of uncovered loss costs them ρ extra on top of its expected value. You offer two plans and let customers choose.</p>
          <div class="field"><div class="field-row"><label>Full cover: premium</label><span class="val" data-v="iPF"></span></div><input type="range" data-k="iPF" min="0" max="80" step="1" value="43"></div>
          <div class="field"><div class="field-row"><label>Basic plan: premium</label><span class="val" data-v="iPB"></span></div><input type="range" data-k="iPB" min="0" max="60" step="1" value="14"></div>
          <div class="field"><div class="field-row"><label>Basic plan: deductible D</label><span class="val" data-v="iD"></span></div><input type="range" data-k="iD" min="0" max="100" step="5" value="50"></div>
          <div class="field"><div class="field-row"><label>Risk aversion ρ</label><span class="val" data-v="iRho"></span></div><input type="range" data-k="iRho" min="0" max="0.5" step="0.05" value="0.2"></div>
          <div class="field"><div class="field-row"><label>Share of high-risk customers λ</label><span class="val" data-v="iLam"></span></div><input type="range" data-k="iLam" min="0.05" max="0.95" step="0.05" value="0.3"></div>
        </div>
        <div class="stack">
          <div class="card"><div id="in-scr-table"></div><div id="in-scr-verdict"></div></div>
          <div class="card"><div class="panel-title">Conditions</div><div id="in-scr-cond"></div></div>
        </div>
      </div>
      `;

    let prm;
    const paint = GT.bindRanges(root, o => { const restart = B && (o.k !== prm.k || o.th !== prm.th); prm = o; if (restart) resetBuy(); drawAll(); }, { k: v => fmt(v, 1), th: v => GT.pct(v), k2: v => fmt(v, 2), th2: v => GT.pct(v), qmin: v => fmt(v, 1), lam: v => fmt(v, 2), es: v => fmt(v, 1), iRho: v => fmt(v, 2), iLam: v => GT.pct(v) });
    prm = paint();
    GT.subtabs(root, () => drawAll());

    /* ---------- buyer game ---------- */
    let B, car;
    function newCar() { car = { q: Math.round(GT.rand(0, QMAX) * 10) / 10, cert: Math.random() < prm.th }; drawCar(); }
    function drawCar() {
      $('#in-n', root).textContent = Math.min(B.hist.length + 1, 12);
      $('#in-car', root).innerHTML = car.cert
        ? `<div class="note good"><p><b>Inspection report attached.</b> true quality q = ₹${fmt(car.q, 1)} lakh, so it is worth ₹${fmt(prm.k * car.q, 1)} lakh to you.</p></div>`
        : `<div class="note amber"><p><b>No report.</b> The seller says it is "excellent condition, single owner". Quality could be anything from ₹0 to ₹10 lakh.</p></div>`;
    }
    function resetBuy() { B = { hist: [], tot: 0 }; $('#in-msg', root).innerHTML = ''; newCar(); drawBuy(); }
    function drawBuy() {
      const bought = B.hist.filter(h => h.ok);
      $('#in-tot', root).textContent = '₹' + fmt(B.tot, 1) + 'L';
      $('#in-cnt', root).textContent = bought.length;
      $('#in-aq', root).textContent = bought.length ? fmt(GT.mean(bought.map(h => h.q)), 1) : '–';
      $('#in-ap', root).textContent = bought.length ? fmt(GT.mean(bought.map(h => h.p)), 1) : '–';
      $('#in-log', root).innerHTML = B.hist.map((h, i) => `<div>#${i + 1} ${h.cert ? '[report]' : '[no report]'} offer ₹${fmt(h.p, 1)}L → ${h.ok ? `bought; true q = ₹${fmt(h.q, 1)}L, worth ₹${fmt(prm.k * h.q, 1)}L → <b style="color:${h.profit >= 0 ? 'var(--good)' : 'var(--bad)'}">${h.profit >= 0 ? '+' : ''}${fmt(h.profit, 1)}</b>` : 'seller refused'}</div>`).reverse().join('') || '<div class="muted">No offers yet.</div>';
      $('#in-go', root).disabled = B.hist.length >= 12;
      const pts = [];
      for (let p = 0; p <= 15; p += 0.25) { const pa = Math.min(p, QMAX) / QMAX; const eq = Math.min(p, QMAX) / 2; pts.push([p, pa * (prm.k * eq - p)]); }
      GT.chart.line($('#in-ev', root), { series: [{ name: 'Expected profit of a blind offer p', color: 'var(--accent)', points: pts, area: true }], xMin: 0, xMax: 15, xLabel: 'Offer p (₹ lakh)', yLabel: 'E[profit]', height: 210, hlines: [{ y: 0, color: 'var(--ink-2)' }] });
    }
    $('#in-p', root).oninput = e => $('#in-pv', root).textContent = fmt(+e.target.value, 1);
    $('#in-go', root).onclick = () => {
      const p = +$('#in-p', root).value, ok = p >= car.q;
      const profit = ok ? prm.k * car.q - p : 0;
      B.hist.push({ p, q: car.q, ok, profit, cert: car.cert }); B.tot += profit;
      if (B.hist.length === 12) {
        const blind = B.hist.filter(h => !h.cert && h.ok);
        $('#in-msg', root).innerHTML = `<div class="note ${B.tot >= 0 ? 'good' : 'bad'}"><p><b>Done.</b> Profit ₹${fmt(B.tot, 1)} lakh. ${blind.length ? `Among cars bought without a report, average quality was ₹${fmt(GT.mean(blind.map(h => h.q)), 1)}L against an average price of ₹${fmt(GT.mean(blind.map(h => h.p)), 1)}L. <b>The sellers who accept your offer are exactly the ones whose cars are worth less than it.</b>` : ''} ${prm.k < 2 ? `With k = ${fmt(prm.k, 1)}, below 2, any blind offer loses money on average. That is adverse selection.` : prm.k === 2 ? 'With k = 2, a blind offer breaks even on average.' : `With k = ${fmt(prm.k, 1)}, above 2, buyers value cars enough that a blind offer makes money on average despite adverse selection.`}</p></div>`;
        GT.log('information', `Lemons buyer (k=${fmt(prm.k, 1)}, θ=${GT.pct(prm.th)}): profit ₹${fmt(B.tot, 1)}L on ${B.hist.filter(h => h.ok).length} cars`, { hist: B.hist });
      } else newCar();
      drawBuy();
    };
    $('#in-reset', root).onclick = resetBuy;

    /* ---------- unravelling ---------- */
    function drawUnravel() {
      const k = prm.k2, lo = prm.qmin, hi = QMAX, th = prm.th2;
      let p = k * (lo + hi) / 2; const pts = [], share = [];
      for (let t = 0; t < 15; t++) {
        const cut = Math.min(p, hi);
        const s = cut <= lo ? 0 : (cut - lo) / (hi - lo);
        pts.push([t + 1, p]); share.push([t + 1, (th + (1 - th) * s) * 10]);
        const avgQ = cut <= lo ? lo : (lo + cut) / 2;
        p = cut <= lo ? k * lo : k * avgQ;
      }
      const lastShare = share[share.length - 1][1] / 10;
      GT.chart.line($('#in-uchart', root), {
        series: [{ name: 'Price buyers will pay (₹ lakh)', color: 'var(--p1)', points: pts, dots: true }, { name: 'Share of cars traded × 10', color: 'var(--amber)', points: share, dots: true, dash: '5 4' }],
        xMin: 1, xMax: 15, yMin: 0, yMax: Math.max(12, k * hi * 0.8), xLabel: 'Round of market adjustment', yLabel: '₹ lakh / share×10', height: 300, xTicks: 14
      });
      const full = k * (lo + hi) / 2 >= hi && k >= 2 * hi / (lo + hi);
      $('#in-uout', root).innerHTML = `<div class="note ${lastShare > 0.9 ? 'good' : lastShare < 0.15 ? 'bad' : 'amber'}"><p>${lastShare > 0.9 ? '<b>Market survives.</b> Buyers value quality enough that the average car is still worth the top seller\'s price.' : lastShare < 0.15 ? '<b>Market collapses.</b> Each price cut drives out the best remaining cars, average quality falls, and the price falls again. Only lemons are left.' : '<b>Partial unravelling.</b> The market settles where only lower-quality cars trade.'} Long-run share traded: <b>${GT.pct(lastShare)}</b>. ${th > 0 ? `Certification keeps ${GT.pct(th)} of cars trading at full information.` : 'Try raising the certified share θ.'}</p></div><p class="muted" style="font-size:.84rem">Rule of thumb (q<sub>min</sub>=0): the market survives fully only if k ≥ 2, i.e. buyers value cars at least twice what sellers do.</p>`;
    }

    /* ---------- Spence ---------- */
    function drawSpence() {
      const { H, Lw: L, cH, cL, lam, es } = prm;
      const lo = (H - L) / cL, hi = (H - L) / cH;
      const highEdu = H - cH * es, highNo = L, lowEdu = H - cL * es, lowNo = L;
      const highGets = highEdu >= highNo, lowMimics = lowEdu > lowNo;
      let verdict, cls;
      if (H <= L) { verdict = 'H must exceed L for signalling to matter.'; cls = 'bad'; }
      else if (highGets && !lowMimics) { verdict = `<b>Separating equilibrium ✔</b> Only High types acquire e* = ${fmt(es, 1)}. The credential truthfully reveals talent. Wasted signalling cost per High worker: ₹${fmt(cH * es, 1)} lakh.${Math.abs(es - lo) < 0.15 ? ' This is the least-cost (Riley) separating threshold.' : ` The least-cost separating threshold is e* = ${fmt(lo, 1)}.`}`; cls = 'good'; }
      else if (highGets && lowMimics) { verdict = `<b>Signal fails: Low types mimic.</b> The threshold is so low that Low types also find it worth getting the credential (${fmt(lowEdu, 1)} > ${fmt(L, 1)}). Everyone has it, so it says nothing. Raise e* above ${fmt(lo, 1)}.`; cls = 'bad'; }
      else { verdict = `<b>Signal too costly: nobody bothers.</b> Even High types prefer the Low wage (${fmt(highEdu, 1)} < ${fmt(L, 1)}). Lower e* below ${fmt(hi, 1)}. The fallback is pooling: everyone paid λH + (1−λ)L = ₹${fmt(lam * H + (1 - lam) * L, 1)} lakh.`; cls = 'amber'; }
      $('#in-sverdict', root).innerHTML = `<div class="note ${cls}"><p>${verdict}</p></div>`;
      GT.chart.bars($('#in-schart', root), {
        bars: [{ label: 'High: get e*', value: highEdu, color: highGets ? 'var(--good)' : 'var(--line-2)' }, { label: 'High: skip', value: highNo, color: !highGets ? 'var(--good)' : 'var(--line-2)' },
        { label: 'Low: get e*', value: lowEdu, color: lowMimics ? 'var(--bad)' : 'var(--line-2)' }, { label: 'Low: skip', value: lowNo, color: !lowMimics ? 'var(--good)' : 'var(--line-2)' }],
        decimals: 1, yLabel: 'Net payoff (₹ lakh)', height: 240, hlines: [{ y: lam * H + (1 - lam) * L, label: 'Pooling wage', color: 'var(--amber)' }]
      });
      const W = 640, X = v => 30 + v / 10 * (W - 60);
      const a = Math.max(0, Math.min(10, lo)), b = Math.max(0, Math.min(10, hi));
      $('#in-srange', root).innerHTML = `<svg viewBox="0 0 ${W} 80" style="width:100%">
        <line x1="${X(0)}" x2="${X(10)}" y1="40" y2="40" style="stroke:var(--line-2);stroke-width:2"/>
        ${lo < hi ? `<rect x="${X(a)}" y="30" width="${Math.max(2, X(b) - X(a))}" height="20" rx="4" style="fill:var(--good-soft);stroke:var(--good)"/>` : ''}
        <line x1="${X(es)}" x2="${X(es)}" y1="20" y2="60" style="stroke:var(--amber);stroke-width:3"/>
        <text x="${X(es)}" y="14" text-anchor="middle" style="fill:var(--amber);font-weight:700;font-size:12px">e* = ${fmt(es, 1)}</text>
        ${[0, 2, 4, 6, 8, 10].map(t => `<text x="${X(t)}" y="72" text-anchor="middle" style="font-size:11px;fill:var(--muted)">${t}</text>`).join('')}
      </svg><div class="formula">Separating iff  (H−L)/c_L ≤ e* ≤ (H−L)/c_H   →   ${fmt(lo, 2)} ≤ e* ≤ ${fmt(hi, 2)}</div><p class="muted" style="font-size:.86rem">${lo < hi ? 'The green band is where the credential sorts types.' : 'No separating threshold exists: the credential must be <b>cheaper</b> for High types (single-crossing condition).'}</p>`;
    }


    /* ---------- insurance screening ---------- */
    function drawScreen() {
      const L = 100, pH = 0.4, pL = 0.1, PF = prm.iPF, PB = prm.iPB, Dd = prm.iD, rho = prm.iRho, lam = prm.iLam;
      const types = [{ n: 'High risk', p: pH, share: lam }, { n: 'Low risk', p: pL, share: 1 - lam }];
      const plans = ['Full cover', 'Basic plan', 'No insurance'];
      types.forEach(t => {
        t.cost = [PF, PB + (t.p + rho) * Dd, (t.p + rho) * L];
        t.pick = t.cost.indexOf(Math.min(...t.cost));
        t.profit = t.pick === 0 ? PF - t.p * L : t.pick === 1 ? PB - t.p * (L - Dd) : 0;
      });
      const avg = GT.sum(types.map(t => t.share * t.profit));
      $('#in-scr-table', root).innerHTML = `<table class="data"><thead><tr><th>Customer</th>${plans.map(p => `<th>${p}: cost to customer</th>`).join('')}<th>Insurer profit / customer</th></tr></thead><tbody>${types.map(t => `<tr><td><b>${t.n}</b> (${GT.pct(t.share)})</td>${t.cost.map((c, k) => `<td style="${k === t.pick ? 'font-weight:800;background:var(--amber-soft)' : ''}">${fmt(c, 1)}</td>`).join('')}<td>${fmt(t.profit, 1)}</td></tr>`).join('')}<tr><td colspan="4"><b>Average insurer profit per customer</b></td><td><b>${fmt(avg, 1)}</b></td></tr></tbody></table><p class="muted" style="font-size:.8rem;margin-top:6px">Highlighted cell = the plan that customer picks (lowest total cost). Basic plan cost = premium + (p + ρ)·D.</p>`;
      const [H, Lo] = types;
      let v, cls;
      if (H.pick === 0 && Lo.pick === 1) { v = `<b>Separating menu.</b> High-risk customers choose full cover and low-risk customers choose the deductible plan, so the menu sorts them by risk without the insurer ever observing it. ${avg >= 0 ? `It earns ₹${fmt(avg, 1)}k per customer.` : 'But it loses money: raise premiums within the band below.'}`; cls = avg >= 0 ? 'good' : 'amber'; }
      else if (H.pick === Lo.pick) { v = `<b>Pooling.</b> Both types choose the ${plans[H.pick].toLowerCase()}, so the menu reveals nothing about risk.${H.pick === 0 && H.profit < 0 ? ' Full cover attracts the high-risk customers at a loss.' : ''}`; cls = 'amber'; }
      else { v = `<b>Inverted or partial sorting.</b> High risk picks the ${plans[H.pick].toLowerCase()}, low risk picks the ${plans[Lo.pick].toLowerCase()}. Check the conditions below.`; cls = 'bad'; }
      $('#in-scr-verdict', root).innerHTML = `<div class="note ${cls}"><p>${v}</p></div>`;
      const lo = (pL + rho) * Dd, hi = (pH + rho) * Dd, pbar = (lam * pH + (1 - lam) * pL) * L, lowWTP = (pL + rho) * L;
      $('#in-scr-cond', root).innerHTML = `<div class="formula">Self-selection: (p_L + ρ)·D ≤ P_full − P_basic ≤ (p_H + ρ)·D
→ ${fmt(lo, 1)} ≤ ${fmt(PF - PB, 1)} ≤ ${fmt(hi, 1)}   ${PF - PB >= lo && PF - PB <= hi ? '(holds)' : '(fails)'}
Low-risk participation: P_basic + (p_L + ρ)·D ≤ (p_L + ρ)·L
→ ${fmt(PB + lo, 1)} ≤ ${fmt(lowWTP, 1)}   ${PB + lo <= lowWTP ? '(holds)' : '(fails)'}</div>
        <p style="font-size:.88rem;color:var(--ink-2)">The deductible works as a screen because it costs high-risk customers more (they are more likely to pay it). That is the single-crossing condition again. Low-risk customers get less than full cover in exchange for a lower price: the cost of separating them (Rothschild &amp; Stiglitz 1976).</p>
        <p style="font-size:.88rem;color:var(--ink-2)">For comparison, a single full-cover plan priced at average risk would cost ₹${fmt(pbar, 1)}k. Low-risk customers ${pbar <= lowWTP ? 'would still buy it at this level of risk aversion' : `would refuse it (it is worth only ₹${fmt(lowWTP, 1)}k to them), leaving only high risks in the pool, which is adverse selection`}.</p>`;
    }

    function drawAll() {
      if (!B) return;
      drawBuy(); drawUnravel(); drawSpence(); drawScreen();
    }
    resetBuy(); drawAll();
  }

  GT.register({
    id: 'information', num: 8, icon: '🔍', title: 'Information Lab: Lemons & Signals', modules: ['M6'], sessions: '14', time: '35–45 min',
    tagline: 'Buy used cars from sellers who know more than you, watch the market unravel, set a hiring credential, and design an insurance menu that sorts customers by risk.',
    problem: 'A job applicant claims excellent skills; a used-car seller claims "single owner, excellent condition". The other side cannot verify this. How do markets fail when information is private, and how do signals, screening and certification repair them? Does an MBA signal productivity or create it?',
    concepts: ['Asymmetric information', 'Adverse selection', 'Market for lemons', 'Signaling', 'Screening', 'Separating vs pooling'],
    render,
    guide: {
      objective: 'Experience adverse selection as a buyer, model market unravelling, and find the conditions under which a costly signal credibly separates types.',
      players: '1 student; teams can compete on buyer profit',
      modes: 'Buyer game (12 cars) · Unravelling simulator · Signaling designer',
      rules: `<ul><li><b>Buyer game:</b> each car has a hidden quality q (₹0–10 lakh). You value it at k·q. The seller accepts only if your offer is at least q. Some cars come with an inspection report.</li><li><b>Unravelling:</b> sliders for buyer premium, quality range and certification. The chart shows the price falling step by step.</li><li><b>Signaling:</b> choose the credential threshold e*. The tool says whether the result is separating, mimicking or pooling.</li></ul>`,
      steps: [
        'In the buyer game with k = 1.5 and θ = 0, make offers on all 12 cars. Record your profit and the average quality you ended up with.',
        'Look at the expected-profit curve. Why is it negative for every blind offer?',
        'Restart with θ = 50% (half of cars inspected). How do you bid on certified vs uncertified cars?',
        'In <b>Market unravelling</b>, find the k at which the market stops collapsing. Then keep k = 1.5 and raise θ.',
        'In <b>Signaling</b>, find the lowest e* that still separates types. Why is it the efficient choice?',
        'Set c<sub>H</sub> = c<sub>L</sub>. Why can no signal work any more?',
        'In <b>Insurance screening</b>, keep the default menu and check that each risk type picks a different plan. Then raise the basic-plan premium until low-risk customers drop out.',
        'Answer the debrief: does an MBA signal productivity or create it, and what evidence would tell you which?'
      ],
      facilitator: [
        'Opening: auction a sealed envelope "worth between ₹0 and ₹100, which is worth 1.5× to you". The winner almost always overpays, which introduces adverse selection.',
        'Run the buyer game in teams of 3 for 10 minutes and compare profits on the board.',
        'Project the unravelling chart; move θ live and connect it to Cars24 or Spinny certification and to warranties.',
        'Signaling: let the class "set" the IIM admission bar (e*) and discuss the least-cost separating equilibrium vs over-credentialing.',
        'Social-impact link (SDG 8): MSME credit. Banks cannot see borrower quality, so raising interest rates drives out safe borrowers (Stiglitz–Weiss) and leads to rationing. Credit bureaus and GST data act as screening tools.',
        'Timing: 15 min buyer game, 10 min unravelling, 15 min signaling, 5 min wrap-up.'
      ],
      variations: ['Screening instead of signaling: the employer offers a menu (high salary + probation vs a safe lower salary) and types self-select.', 'Insurance: design deductible menus that make high-risk and low-risk customers choose different plans (Rothschild–Stiglitz).', 'Warranty as a signal: let sellers of good cars offer a warranty that would be too costly for sellers of lemons.']
    },
    theory: `
      <h3 style="margin-top:0">Adverse selection: Akerlof (1970)</h3>
      <p>When sellers know quality but buyers do not, buyers pay for <b>average</b> quality. Owners of above-average cars find the price too low and withdraw, so the average falls, the price falls, and more good cars leave. The market can unravel completely even though every trade would create value (k > 1).</p>
      <div class="formula">Uniform q on [0, Q]: at price p, sellers with q ≤ p participate → E[q | sale] = p/2
Buyer pays at most k·p/2 → market survives only if k·p/2 ≥ p ⇔ k ≥ 2</div>
      <p><b>Key lesson:</b> the cars (or borrowers, or job applicants) who accept your offer are a <b>selected</b> sample, and selected against you.</p>
      <h3>Remedies</h3>
      <table class="data"><thead><tr><th>Mechanism</th><th>Who acts</th><th>Example</th></tr></thead><tbody>
        <tr><td><b>Signaling</b></td><td>Informed party takes a costly, credible action</td><td>Warranties, degrees, IPO underpricing, promoter holding</td></tr>
        <tr><td><b>Screening</b></td><td>Uninformed party designs a menu so types self-select</td><td>Insurance deductibles, probation contracts, loan collateral</td></tr>
        <tr><td><b>Certification / disclosure</b></td><td>Third party verifies</td><td>Cars24 inspection, credit bureaus (CIBIL), SEBI disclosures, ratings</td></tr>
        <tr><td><b>Reputation</b></td><td>Repeated interaction</td><td>Seller ratings, brand equity</td></tr>
        <tr><td><b>Mandates / pooling</b></td><td>Regulator</td><td>Compulsory insurance, PM-JAY group cover</td></tr>
      </tbody></table>
      <h3>Spence signaling (1973)</h3>
      <p>A signal works only if it is <b>cheaper for the high type</b> (the single-crossing condition). With productivities H > L and per-unit signal costs c_H < c_L, the employer's threshold e* separates types if:</p>
      <div class="formula">Low won't mimic:  L ≥ H − c_L·e*   ⇔  e* ≥ (H − L)/c_L
High will signal: H − c_H·e* ≥ L   ⇔  e* ≤ (H − L)/c_H</div>
      <p>Many thresholds separate. The <b>least-cost separating</b> (Riley) equilibrium sets e* = (H − L)/c_L. Any higher threshold just burns resources ("credential inflation"). A signal can be privately rational and socially wasteful at the same time.</p>
      <h3>Moral hazard (hidden action) vs adverse selection (hidden type)</h3>
      <p>Adverse selection happens <i>before</i> the contract: who chooses to sign? Moral hazard happens <i>after</i> it: how do people behave once insured or hired? Remedies for moral hazard include deductibles, incentive pay and monitoring.</p>`,
    practice: [
      { tag: 'India', title: 'Cars24, Spinny and CarDekho', text: 'Organised used-car platforms grew by solving Akerlof\'s problem with multi-point inspections, fixed prices, warranties and return windows. They turned "lemons" risk into a certified product and charged a margin for it.' },
      { tag: 'India', title: 'MSME credit and credit rationing', text: 'Banks cannot easily see small-firm risk. Raising rates would attract riskier borrowers, so banks ration credit instead (Stiglitz–Weiss 1981). GST invoice data, Account Aggregators and CIBIL MSME ranks are screening tools that widen financial inclusion (SDG 8).' },
      { tag: 'India', title: 'IIM admissions and campus placements', text: 'Is a CAT percentile plus an IIM degree a signal (sorting existing talent) or human capital (creating it)? Recruiters paying a premium for "day-zero" campuses suggests a large signaling component. The debrief explores this.' },
      { tag: 'India', title: 'Health insurance and pre-existing conditions', text: 'Waiting periods and medical underwriting are screening devices against adverse selection. Group and government schemes (PM-JAY) pool risk to prevent unravelling.' },
      { tag: 'Global', title: 'IPO underpricing and promoter lock-ins', text: 'Issuers that leave money on the table, or promoters who keep a large stake under lock-in, signal confidence that is costly to fake. SEBI\'s lock-in rules and anchor investors work as certification.' },
      { tag: 'Frontier', title: 'AI-generated CVs and the death of signals', text: 'When large language models make polished cover letters and code samples free to produce, they stop separating types (c_H ≈ c_L). Employers are shifting to harder-to-fake screens: live assessments, work trials, verified credentials.' }
    ],
    debrief: [
      'Why were the cars you bought, on average, worse than the cars you were offered?',
      'At what buyer premium k does the market stop unravelling? Explain the k ≥ 2 rule intuitively.',
      'Rank certification, warranty and reputation as solutions for an Indian used-two-wheeler marketplace. Justify your ranking.',
      'What is the least-cost separating threshold in your signaling settings, and why would a society prefer it?',
      'Does an MBA signal productivity or create it? What data would let you tell the two apart?',
      'If AI makes signals cheap to fake, how should employers screen talent? What new adverse-selection problems arise?'
    ],
    aiPrompt: `I am studying adverse selection and signaling. Consider [pick: Indian used-car market / MSME lending / health insurance / campus hiring].
1. Identify the informed and uninformed parties and the hidden characteristic.
2. Explain how the market could unravel, with a numeric example.
3. Propose a signaling solution and a screening solution, and check the single-crossing condition for the signal.
4. Evaluate which solution is most cost-effective in India today, citing real institutions (e.g. CIBIL, Account Aggregator, Cars24 inspection).
5. Point out any claims in your answer that I should verify with data.`
  });
})();
