/* 09 — Auction House: first/second-price, English (IPL-style), winner's curse, revenue equivalence */
(function () {
  const { $, $$, fmt, esc } = GT;

  function render(root) {
    root.innerHTML = `
      <div class="subtabs">
        <button class="subtab active" data-sub="sealed">Sealed-bid spectrum auction</button>
        <button class="subtab" data-sub="english">English auction (IPL-style)</button>
        <button class="subtab" data-sub="common">Winner's curse</button>
        <button class="subtab" data-sub="rev">Revenue equivalence</button>
        <button class="subtab" data-sub="class">Classroom mode</button>
      </div>

      <div data-pane="sealed" class="layout-2">
        <div class="card">
          <div class="field"><label>Format</label><select id="au-fmt"><option value="fp">First-price sealed bid (pay your bid)</option><option value="sp">Second-price / Vickrey (pay 2nd-highest bid)</option></select></div>
          <div class="field"><div class="field-row"><label>Number of bidders (incl. you)</label><span class="val" data-v="n"></span></div><input type="range" data-k="n" min="2" max="10" step="1" value="4"></div>
          <div class="note"><p>Round <b id="au-r">1</b>/10. Your private value for this spectrum block is <b style="font-size:1.2rem" id="au-v">–</b> ₹ crore. Rivals have independent values drawn uniformly from 0–100 and bid optimally for the format.</p></div>
          <div class="field"><div class="field-row"><label>Your bid (₹ cr)</label><span class="val" id="au-bv">50</span></div><input type="range" id="au-b" min="0" max="100" step="1" value="50"></div>
          <div class="btn-row"><button class="btn primary" id="au-go">Submit sealed bid</button><button class="btn" id="au-reset">Restart</button></div>
        </div>
        <div class="stack">
          <div class="card"><div class="kpis"><div class="kpi p1"><div class="k">Your total surplus</div><div class="v" id="au-tot">0</div></div><div class="kpi"><div class="k">Auctions won</div><div class="v" id="au-won">0</div></div><div class="kpi accent"><div class="k">Equilibrium bid now</div><div class="v" id="au-eq">–</div></div></div>
            <div id="au-res" class="mt"></div><div class="log mt" id="au-log"></div></div>
        </div>
      </div>

      <div data-pane="english" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">IPL player auction</div>
          <p class="muted" style="font-size:.88rem">The auctioneer raises the price step by step. Franchises drop out when the price passes what the player is worth to them. The last one in wins at the current price. Your franchise's value for this all-rounder is shown below. Click <b>Drop out</b> when you want to stop.</p>
          <div class="note amber"><p>Your value: <b style="font-size:1.2rem" id="au-ev">–</b> ₹ crore · Rival franchises: <b id="au-en">5</b></p></div>
          <div class="center" style="padding:10px 0"><div class="muted">Current price</div><div class="big-number" id="au-ep">–</div></div>
          <div class="btn-row" style="justify-content:center"><button class="btn primary" id="au-estart">Start bidding</button><button class="btn p2" id="au-edrop" disabled>Drop out</button></div>
          <div id="au-eres" class="mt"></div>
        </div>
        <div class="card"><div class="panel-title">Paddles still up</div><div id="au-epaddles"></div><div class="log mt" id="au-elog"></div></div>
      </div>

      <div data-pane="common" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Oil & gas block (OALP-style): common value</div>
          <p class="muted" style="font-size:.88rem">The block's true value V is the <b>same for everyone</b> (somewhere between ₹50 and ₹150 crore), but nobody knows it. Each bidder's geologists give an estimate = V ± up to ₹20 cr. The highest bid wins and pays its bid.</p>
          <div class="note"><p>Round <b id="au-cr">1</b>/8. Your geologists' estimate: <b style="font-size:1.2rem" id="au-cs">–</b> ₹ crore. There are <b id="au-cn">6</b> bidders in total.</p></div>
          <div class="field"><div class="field-row"><label>Your bid (₹ cr)</label><span class="val" id="au-cbv">90</span></div><input type="range" id="au-cb" min="30" max="180" step="1" value="90"></div>
          <div class="btn-row"><button class="btn primary" id="au-cgo">Bid</button><button class="btn" id="au-creset">Restart</button></div>
          <p class="muted" style="font-size:.84rem;margin-top:10px">Hint: if you win, what does that tell you about your estimate compared with the other five?</p>
        </div>
        <div class="card"><div class="kpis"><div class="kpi p1"><div class="k">Your profit</div><div class="v" id="au-ctot">0</div></div><div class="kpi p2"><div class="k">Naive rivals' avg profit when they win</div><div class="v" id="au-crv">–</div></div></div><div id="au-cres" class="mt"></div><div class="log mt" id="au-clog"></div></div>
      </div>

      <div data-pane="rev" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Simulate 4,000 auctions per format</div>
          <div class="field"><div class="field-row"><label>Bidders n</label><span class="val" data-v="rn"></span></div><input type="range" data-k="rn" min="2" max="12" step="1" value="4"></div>
          <div class="field"><div class="field-row"><label>Reserve price r</label><span class="val" data-v="rr"></span></div><input type="range" data-k="rr" min="0" max="90" step="5" value="0"></div>
          <button class="btn primary" id="au-rgo">Run simulation</button>
          <p class="muted" style="font-size:.86rem;margin-top:10px">Values ~ U[0, 100]. Bidders follow equilibrium strategies. With a reserve price, the first-price bid becomes b(v) = v − (vⁿ − rⁿ)/(n·vⁿ⁻¹).</p>
        </div>
        <div class="card"><div id="au-rout"><p class="muted">Run the simulation to compare expected seller revenue.</p></div></div>
      </div>

      <div data-pane="class" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Paste sealed bids</div>
          <p class="muted" style="font-size:.88rem">One per line: <code>Team name, bid</code>. Optionally enter the true common value (e.g. the number of coins in a jar × coin value) to test for the winner's curse.</p>
          <textarea id="au-cpaste" placeholder="Team Alpha, 82&#10;Team Beta, 95&#10;Team Gamma, 71"></textarea>
          <div class="field mt"><label>True common value (optional)</label><input type="number" id="au-ctrue" placeholder="e.g. 64" style="width:140px"></div>
          <button class="btn primary" id="au-cgo2">Resolve auction</button>
        </div>
        <div class="card"><div id="au-cout"><p class="muted">Results will appear here.</p></div></div>
      </div>`;

    let prm;
    const paint = GT.bindRanges(root, o => { prm = o; if (S && !S.hist.length) newSealed(); });
    let S = null;
    prm = paint();
    GT.subtabs(root);

    /* ---------- sealed bid ---------- */
    const fmtSel = $('#au-fmt', root);
    function newSealed() {
      if (!S) S = { hist: [], tot: 0 };
      S.v = Math.round(GT.rand(5, 100));
      $('#au-v', root).textContent = S.v;
      $('#au-r', root).textContent = Math.min(S.hist.length + 1, 10);
      const n = prm.n, eqb = fmtSel.value === 'fp' ? S.v * (n - 1) / n : S.v;
      $('#au-eq', root).textContent = fmt(eqb, 1);
    }
    function drawSealed() {
      $('#au-tot', root).textContent = fmt(S.tot, 1);
      $('#au-won', root).textContent = S.hist.filter(h => h.win).length;
      $('#au-log', root).innerHTML = S.hist.map((h, i) => `<div>R${i + 1} (${h.f === 'fp' ? '1st' : '2nd'}-price): value ${h.v}, bid ${h.b}, top rival bid ${fmt(h.top, 1)} → ${h.win ? `<span class="pill good">won</span> paid ${fmt(h.price, 1)}, surplus <b>${fmt(h.v - h.price, 1)}</b>` : '<span class="pill">lost</span>'}${h.regret ? ` <span class="pill amber">${h.regret}</span>` : ''}</div>`).reverse().join('') || '<div class="muted">No bids yet.</div>';
      $('#au-go', root).disabled = S.hist.length >= 10;
    }
    $('#au-b', root).oninput = e => $('#au-bv', root).textContent = e.target.value;
    $('#au-go', root).onclick = () => {
      const n = prm.n, f = fmtSel.value, b = +$('#au-b', root).value;
      const rivals = Array.from({ length: n - 1 }, () => { const v = GT.rand(0, 100); return f === 'fp' ? v * (n - 1) / n * GT.rand(0.95, 1.03) : v; });
      const top = Math.max(...rivals);
      const win = b > top;
      const price = win ? (f === 'fp' ? b : top) : 0;
      let regret = '';
      if (win && price > S.v) regret = 'overpaid';
      else if (!win && top < S.v && f === 'sp') regret = 'could have won profitably';
      else if (!win && top < S.v * 0.98 && f === 'fp') regret = 'shaded too much';
      S.hist.push({ v: S.v, b, top, win, price, f, regret });
      if (win) S.tot += S.v - price;
      $('#au-res', root).innerHTML = `<div class="note ${win ? (S.v - price >= 0 ? 'good' : 'bad') : ''}"><p>${win ? `You won and paid ₹${fmt(price, 1)} cr. Surplus: <b>${fmt(S.v - price, 1)}</b>.` : `You lost. The winning bid was ₹${fmt(top, 1)} cr.`} ${f === 'sp' ? 'In a Vickrey auction, bidding your true value is a weakly dominant strategy: your bid decides <i>whether</i> you win, not <i>what you pay</i>.' : `In a first-price auction you shade your bid below value. With ${n} bidders the equilibrium bid is ${n - 1}/${n} of value.`}</p></div>`;
      if (S.hist.length === 10) GT.log('auction', `Sealed ${f === 'fp' ? 'first' : 'second'}-price (n=${n}): surplus ${fmt(S.tot, 1)}, won ${S.hist.filter(h => h.win).length}/10`, { hist: S.hist });
      drawSealed(); if (S.hist.length < 10) newSealed();
    };
    $('#au-reset', root).onclick = () => { S = { hist: [], tot: 0 }; $('#au-res', root).innerHTML = ''; newSealed(); drawSealed(); };
    fmtSel.onchange = () => $('#au-reset', root).click();
    newSealed(); drawSealed();

    /* ---------- English / IPL ---------- */
    let E = null, timer = null;
    const NAMES = ['Mumbai', 'Chennai', 'Kolkata', 'Bengaluru', 'Delhi', 'Rajasthan', 'Punjab', 'Hyderabad', 'Lucknow', 'Gujarat'];
    function eDraw() {
      $('#au-ep', root).textContent = E ? '₹' + fmt(E.price, 2) + ' cr' : '–';
      $('#au-epaddles', root).innerHTML = E ? `<div class="chips">${E.bidders.map(b => `<span class="chip ${b.you ? 'accent' : ''}" style="${b.out ? 'opacity:.35;text-decoration:line-through' : ''}">${b.name}${b.you ? ' (you)' : ''}</span>`).join('')}</div>` : '';
      $('#au-elog', root).innerHTML = E ? E.log.map(l => `<div>${l}</div>`).reverse().join('') : '';
    }
    function eNew() {
      const n = 5;
      const names = GT.shuffle(NAMES).slice(0, n + 1);
      E = { price: 2, you: Math.round(GT.rand(8, 22) * 4) / 4, bidders: [], log: [], done: false };
      E.bidders = names.map((nm, i) => ({ name: nm, you: i === 0, v: i === 0 ? null : Math.round(GT.rand(4, 24) * 4) / 4, out: false }));
      $('#au-ev', root).textContent = fmt(E.you, 2); $('#au-en', root).textContent = n;
      $('#au-eres', root).innerHTML = ''; $('#au-edrop', root).disabled = true; $('#au-estart', root).disabled = false;
      eDraw();
    }
    function eTick() {
      const inc = E.price < 10 ? 0.25 : 0.5;
      E.price = Math.round((E.price + inc) * 100) / 100;
      E.bidders.forEach(b => { if (!b.you && !b.out && E.price > b.v) { b.out = true; E.log.push(`${b.name} drops at ₹${fmt(E.price, 2)} cr`); } });
      eCheck(); eDraw();
    }
    function eCheck() {
      if (E.done) return;
      const live = E.bidders.filter(b => !b.out);
      if (live.length <= 1) {
        clearInterval(timer); E.done = true; $('#au-edrop', root).disabled = true;
        const w = live[0] || E.bidders.filter(b => !b.you).sort((a, b) => b.v - a.v)[0];
        const rivalMax = Math.max(...E.bidders.filter(b => !b.you).map(b => b.v));
        let msg;
        if (w && w.you) msg = `<div class="note ${E.you - E.price >= 0 ? 'good' : 'bad'}"><p>🏏 <b>Sold to you at ₹${fmt(E.price, 2)} cr!</b> Your value: ₹${fmt(E.you, 2)} cr, so surplus is <b>${fmt(E.you - E.price, 2)}</b>. The price was set by the last rival to drop (their value ≈ ₹${fmt(rivalMax, 2)} cr), which is the second-highest valuation.</p></div>`;
        else msg = `<div class="note"><p>Sold to <b>${w ? w.name : 'a rival'}</b> at ₹${fmt(E.price, 2)} cr. ${E.you > E.price ? `You dropped out too early: your value of ₹${fmt(E.you, 2)} cr was above the final price.` : 'Correct to drop: the price exceeded your value.'}</p></div>`;
        msg += `<p class="muted" style="font-size:.86rem">Dominant strategy in an English auction: stay in until the price reaches your value, then drop. The outcome matches a Vickrey auction.</p>`;
        $('#au-eres', root).innerHTML = msg;
        GT.log('auction', `IPL English auction: value ${E.you}, price ${E.price}, ${w && w.you ? 'won' : 'lost'}`, { you: E.you, price: E.price, won: !!(w && w.you) });
      }
    }
    $('#au-estart', root).onclick = () => {
      if (!E || E.done) eNew();
      $('#au-estart', root).disabled = true; $('#au-edrop', root).disabled = false;
      E.log.push(`Auction opens at ₹${fmt(E.price, 2)} cr`);
      clearInterval(timer); timer = setInterval(() => { if (!document.body.contains(root)) { clearInterval(timer); return; } eTick(); }, 450);
    };
    $('#au-edrop', root).onclick = () => {
      const me = E.bidders.find(b => b.you); me.out = true; E.log.push(`<b>You drop</b> at ₹${fmt(E.price, 2)} cr`);
      $('#au-edrop', root).disabled = true;
      const live = E.bidders.filter(b => !b.out);
      if (live.length > 1) { // let rivals finish quickly
        clearInterval(timer);
        while (E.bidders.filter(b => !b.out).length > 1) { eTick(); }
      }
      eCheck(); eDraw();
      $('#au-estart', root).disabled = false; $('#au-estart', root).textContent = 'Next player';
    };
    eNew();

    /* ---------- common value ---------- */
    let Cv = null;
    const NB = 6, ERR = 20;
    function cNew() {
      if (!Cv) Cv = { hist: [], tot: 0, rivalWins: [] };
      Cv.V = GT.rand(50, 150);
      Cv.sig = Cv.V + GT.rand(-ERR, ERR);
      $('#au-cs', root).textContent = fmt(Cv.sig, 1); $('#au-cn', root).textContent = NB;
      $('#au-cr', root).textContent = Math.min(Cv.hist.length + 1, 8);
    }
    function cDraw() {
      $('#au-ctot', root).textContent = fmt(Cv.tot, 1);
      $('#au-crv', root).textContent = Cv.rivalWins.length ? fmt(GT.mean(Cv.rivalWins), 1) : '–';
      $('#au-clog', root).innerHTML = Cv.hist.map((h, i) => `<div>R${i + 1}: estimate ${fmt(h.s, 1)}, bid ${h.b} → ${h.win ? `won; true V = ${fmt(h.V, 1)} → <b style="color:${h.V - h.b >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmt(h.V - h.b, 1)}</b>` : `lost to a bid of ${fmt(h.top, 1)} (true V = ${fmt(h.V, 1)})`}</div>`).reverse().join('') || '<div class="muted">No bids yet.</div>';
      $('#au-cgo', root).disabled = Cv.hist.length >= 8;
    }
    $('#au-cb', root).oninput = e => $('#au-cbv', root).textContent = e.target.value;
    $('#au-cgo', root).onclick = () => {
      const b = +$('#au-cb', root).value;
      const rivals = Array.from({ length: NB - 1 }, () => { const s = Cv.V + GT.rand(-ERR, ERR); return s - GT.rand(0, 6); });
      const top = Math.max(...rivals), win = b > top;
      Cv.hist.push({ s: Cv.sig, b, V: Cv.V, win, top });
      if (win) Cv.tot += Cv.V - b; else Cv.rivalWins.push(Cv.V - top);
      const shade = ERR * (NB - 1) / (NB + 1);
      $('#au-cres', root).innerHTML = `<div class="note ${win && Cv.V - b < 0 ? 'bad' : 'amber'}"><p>${win ? (Cv.V - b < 0 ? '😬 <b>Winner\'s curse!</b> ' : '<b>Won profitably.</b> ') : ''}Winning means your estimate was probably the <b>most optimistic</b> of ${NB}. With errors of ±${ERR}, the highest of ${NB} estimates overshoots V by about ${fmt(shade, 1)} on average, so shade your bid by at least that much. The naive rivals bid close to their estimates and lose money when they win.</p></div>`;
      if (Cv.hist.length === 8) GT.log('auction', `Common-value: profit ${fmt(Cv.tot, 1)}; naive rivals avg ${Cv.rivalWins.length ? fmt(GT.mean(Cv.rivalWins), 1) : '–'}`, { hist: Cv.hist });
      cDraw(); if (Cv.hist.length < 8) cNew();
    };
    $('#au-creset', root).onclick = () => { Cv = null; cNew(); cDraw(); $('#au-cres', root).innerHTML = ''; };
    cNew(); cDraw();

    /* ---------- revenue equivalence ---------- */
    $('#au-rgo', root).onclick = () => {
      const n = prm.rn, r = prm.rr, T = 4000;
      const fpBid = v => v < r ? 0 : v - (Math.pow(v, n) - Math.pow(r, n)) / (n * Math.pow(v, n - 1));
      let fp = [], sp = [], eng = [];
      for (let t = 0; t < T; t++) {
        const vs = Array.from({ length: n }, () => GT.rand(0, 100)).sort((a, b) => b - a);
        const v1 = vs[0], v2 = vs[1];
        fp.push(v1 >= r ? fpBid(v1) : 0);
        const second = v1 >= r ? Math.max(r, v2) : 0;
        sp.push(second); eng.push(second + (v1 >= r ? GT.rand(0, 0.5) * (v1 > v2 + 0.5 ? 1 : 0) : 0));
      }
      const theo = 100 * (n - 1) / (n + 1);
      const out = $('#au-rout', root);
      out.innerHTML = `<div class="panel-title">Average seller revenue (₹ cr)</div><div id="au-rc"></div><div id="au-rh"></div>`;
      GT.chart.bars($('#au-rc', out), { bars: [{ label: 'First-price', value: GT.mean(fp), color: 'var(--p1)' }, { label: 'Second-price', value: GT.mean(sp), color: 'var(--p2)' }, { label: 'English', value: GT.mean(eng), color: 'var(--accent)' }], decimals: 1, height: 220, hlines: r === 0 ? [{ y: theo, label: `Theory (n−1)/(n+1)×100 = ${fmt(theo, 1)}`, color: 'var(--amber)' }] : [] });
      const hf = GT.histogram(fp, 0, 100, 20), hs = GT.histogram(sp, 0, 100, 20);
      GT.chart.line($('#au-rh', out), { series: [{ name: 'First-price revenue distribution', color: 'var(--p1)', points: hf.map(b => [b.lo + 2.5, b.value / T]) }, { name: 'Second-price revenue distribution', color: 'var(--p2)', points: hs.map(b => [b.lo + 2.5, b.value / T]) }], xMin: 0, xMax: 100, yMin: 0, xLabel: 'Revenue', yLabel: 'Share of auctions', height: 220 });
      out.insertAdjacentHTML('beforeend', `<div class="note"><p><b>Revenue equivalence (Vickrey 1961; Myerson 1981).</b> With risk-neutral bidders and independent private values, every standard format gives the <b>same expected revenue</b>. They differ in risk: first-price revenue is less spread out. ${r > 0 ? `A reserve of ₹${r} cr ${r === 50 ? 'is the optimal reserve here (Myerson): it' : ''} raises expected revenue at the cost of sometimes not selling (${GT.pct(Math.pow(r / 100, n))} of the time).` : 'Try a reserve price of 50, the revenue-maximising reserve for U[0,100] values.'}</p></div>`);
      GT.log('auction', `Revenue equivalence n=${n}, r=${r}: FP ${fmt(GT.mean(fp), 1)}, SP ${fmt(GT.mean(sp), 1)}`, {});
    };

    /* ---------- classroom ---------- */
    $('#au-cgo2', root).onclick = () => {
      const rows = $('#au-cpaste', root).value.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => { const nums = GT.parseNums(l); const name = l.replace(/[-\d.,\s]+$/, '').replace(/[,:]\s*$/, '').trim() || 'Bidder ' + (i + 1); return { name, b: nums[nums.length - 1] }; }).filter(r => isFinite(r.b));
      if (rows.length < 2) { GT.toast('Need at least two bids'); return; }
      rows.sort((a, b) => b.b - a.b);
      const V = parseFloat($('#au-ctrue', root).value);
      const out = $('#au-cout', root);
      out.innerHTML = `<div class="kpis"><div class="kpi accent"><div class="k">Winner</div><div class="v" style="font-size:1.1rem">${esc(rows[0].name)}</div></div><div class="kpi"><div class="k">Pays (1st-price)</div><div class="v">${fmt(rows[0].b, 1)}</div></div><div class="kpi"><div class="k">Pays (2nd-price)</div><div class="v">${fmt(rows[1].b, 1)}</div></div>${isFinite(V) ? `<div class="kpi ${rows[0].b > V ? 'p2' : 'p1'}"><div class="k">Winner's profit (1st-price)</div><div class="v">${fmt(V - rows[0].b, 1)}</div></div>` : ''}</div>
        <div id="au-cbars" class="mt"></div>
        ${isFinite(V) ? `<div class="note ${rows[0].b > V ? 'bad' : 'good'}"><p>${rows[0].b > V ? `<b>Winner's curse.</b> The winning bid exceeded the true value of ${fmt(V, 1)}.` : 'No winner\'s curse this time.'} Mean bid ${fmt(GT.mean(rows.map(r => r.b)), 1)} vs true value ${fmt(V, 1)}. ${GT.pct(rows.filter(r => r.b > V).length / rows.length)} of bids were above the true value.</p></div>` : ''}`;
      GT.chart.bars($('#au-cbars', out), { bars: rows.slice(0, 25).map((r, i) => ({ label: r.name, value: r.b, color: i === 0 ? 'var(--amber)' : 'var(--accent)' })), rotate: true, height: 260, hlines: isFinite(V) ? [{ y: V, label: 'True value', color: 'var(--bad)' }] : [] });
      GT.log('auction', `Classroom auction: ${rows.length} bids, winner ${rows[0].name} at ${rows[0].b}`, { rows, V });
    };
  }

  GT.register({
    id: 'auction', num: 9, icon: '🔨', title: 'Auction House: Spectrum, IPL & Oil Blocks', modules: ['M6'], sessions: '14 (auctions)', time: '40–50 min',
    tagline: 'Bid in first- and second-price spectrum auctions, run a live IPL-style ascending auction, fall into the winner\'s curse, and test revenue equivalence.',
    problem: 'The government sells spectrum, coal blocks and oil fields by auction; IPL franchises bid for players; Google sells ads by auction. How should you bid when others\' values are private, and how should a seller design the auction to maximise revenue without cursing the winners?',
    concepts: ['First-price vs Vickrey', 'Bid shading', 'English auction', 'Winner\'s curse', 'Revenue equivalence', 'Reserve price'],
    render,
    guide: {
      objective: 'Learn the optimal bidding strategy under each format, experience the winner\'s curse in common-value auctions, and understand why the format matters to sellers (or why it does not).',
      players: '1 student vs AI bidders; class teams in Classroom mode',
      modes: 'Sealed bid (10 rounds) · Live English auction · Common value (8 rounds) · Revenue simulator · Classroom bids',
      rules: `<ul><li><b>Private values:</b> you know your own value; rivals' values are random and independent. Surplus = value − price if you win.</li><li><b>First-price:</b> the winner pays its own bid. <b>Second-price:</b> the winner pays the second-highest bid.</li><li><b>English:</b> the price rises automatically; click Drop out when you want to stop. The last bidder standing wins at the current price.</li><li><b>Common value:</b> the asset is worth the same V to everyone; you get a noisy estimate.</li></ul>`,
      steps: [
        'Play 10 rounds of <b>first-price</b>. Compare your bids with the "equilibrium bid now" figure.',
        'Switch to <b>second-price</b> and play 10 rounds bidding exactly your value. Then try bidding above or below value. Can you do better?',
        'Run the <b>English (IPL)</b> auction 3 times. When is the right time to drop out?',
        'In <b>Winner\'s curse</b>, first bid your estimate for 4 rounds, then shade by about ₹14 cr for 4 rounds. Compare profits.',
        'In <b>Revenue equivalence</b>, compare formats for n = 2 and n = 10. Then add a reserve price of 50.',
        'Discuss: why did India use ascending (SMRA) auctions for spectrum rather than sealed bids?'
      ],
      facilitator: [
        'Classic opener: a jar of coins (count it secretly). Teams submit sealed bids on slips, you paste them into Classroom mode with the true value, and the winner almost always overpays.',
        'Run the IPL auction on the projector with a volunteer "franchise owner" while the class advises: "Stay in! Drop!"',
        'Explain Vickrey truth-telling with the regret pills in the sealed-bid log.',
        'Use the revenue simulator to show equivalence, then break it: risk aversion makes first-price raise more; collusion and entry deterrence favour sealed bids (Klemperer).',
        'Connect to Nobel 2020 (Milgrom & Wilson) and India\'s spectrum auctions.',
        'Timing: 10 min coin jar, 10 min sealed bids, 10 min IPL, 10 min revenue and policy.'
      ],
      variations: ['All-pay auction: lobbying and R&D races, where everyone pays their bid.', 'Combinatorial bids: spectrum bands that are worth more together (exposure problem).', 'Collusion: let two teams agree beforehand, then discuss how ascending auctions make signalling between bidders easier.']
    },
    theory: `
      <h3 style="margin-top:0">Private-value auctions</h3>
      <p><b>Second-price (Vickrey)</b> and <b>English</b> auctions: bidding your true value is a <b>weakly dominant strategy</b>. Your bid only decides whether you win; the price is set by someone else. Overbidding risks winning at a loss, and underbidding risks losing a profitable item.</p>
      <p><b>First-price:</b> you trade a lower chance of winning for a bigger margin. With n bidders and values ~ U[0, 1], the symmetric Bayesian Nash equilibrium is:</p>
      <div class="formula">b(v) = ((n − 1)/n) · v     → shading shrinks as competition grows</div>
      <h3>Revenue equivalence theorem</h3>
      <p>With risk-neutral bidders, independent private values and the same allocation rule (highest value wins), every standard auction gives the seller the same expected revenue: the expected <b>second-highest value</b>.</p>
      <div class="formula">E[Revenue] = E[v₍₂₎] = 100·(n − 1)/(n + 1)   for values ~ U[0, 100]</div>
      <p>When it fails: risk-averse bidders (first-price raises more), affiliated values (English raises more, the linkage principle), collusion, budget constraints, asymmetric bidders.</p>
      <h3>Reserve prices</h3>
      <p>A reserve price trades a chance of not selling for higher bids. For U[0,100] values the optimal reserve is 50 regardless of n (Myerson 1981): the seller acts like a monopolist facing the bidders' virtual values.</p>
      <h3>Common values and the winner's curse</h3>
      <p>When the asset is worth the same to everyone (oil reserves, spectrum with uncertain demand), each bidder has a noisy estimate. <b>Winning is bad news</b>: it means your estimate was the most optimistic. Rational bidders condition on winning:</p>
      <div class="formula">Bid ≈ E[V | my estimate is the highest of n]   ≈  s − e·(n − 1)/(n + 1)   (errors ~ U[−e, e])</div>
      <p>More bidders means you should shade <b>more</b> in a common-value auction, the opposite of the private-value intuition.</p>
      <h3>Practical auction design (Klemperer: "what really matters")</h3>
      <ul><li>Attract entry: weak bidders must believe they can win (Anglo-Dutch hybrids, set-asides).</li><li>Prevent collusion: sealed bids reduce signalling; avoid round-number bid increments.</li><li>Set reserves carefully: too high and nothing sells (India's 2016 spectrum auction left about 60% unsold).</li></ul>`,
    practice: [
      { tag: 'India', title: '5G spectrum auction (2022)', text: 'India sold 5G spectrum through a multi-round simultaneous ascending auction raising about ₹1.5 lakh crore, with Jio the largest buyer. Ascending formats let bidders discover what bands are worth to others, which reduces the winner\'s curse on uncertain demand.' },
      { tag: 'India', title: 'The 2010 3G auction and the winner\'s curse', text: 'The 3G and BWA auctions raised about ₹1 lakh crore. High spectrum costs and slow 3G adoption contributed to operators\' debt stress later, a widely cited Indian example of the winner\'s curse.' },
      { tag: 'India', title: 'IPL mega auction', text: 'An English auction with a twist: Right-to-Match cards let a franchise match the final price for its former player. In the 2025 mega auction (Nov 2024) Rishabh Pant went for a record ₹27 crore. RTM gives incumbents an informational and strategic edge.' },
      { tag: 'India', title: 'Coal block and OALP oil block auctions', text: 'After the 2014 Supreme Court cancellation of allotted coal blocks, auctions replaced discretionary allocation. Oil and gas blocks under OALP are common-value assets with heavy geological uncertainty.' },
      { tag: 'Global', title: 'Google ads and the generalised second-price auction', text: 'Each search triggers an auction for ad slots. GSP is not truthful (shading pays), which is one reason ad platforms now use more automated, ML-driven bidding.' },
      { tag: 'Frontier', title: 'Nobel 2020: Milgrom & Wilson', text: 'Their SMRA and combinatorial clock designs underpin spectrum auctions worldwide, including the US FCC\'s incentive auction (2016–17), which bought broadcast spectrum and resold it to mobile carriers.' }
    ],
    debrief: [
      'Why is bidding your true value optimal in a second-price auction but not in a first-price auction?',
      'How much did you shade in first-price? How close was it to (n−1)/n?',
      'In the common-value auction, why should you shade more when there are more bidders?',
      'If all formats give the same expected revenue, why do governments care so much about design? Name three things the theorem ignores.',
      'Was India\'s 2010 3G auction a winner\'s curse? What other explanations are there for later telecom stress?',
      'How does the IPL Right-to-Match card change bidding incentives for other franchises?'
    ],
    aiPrompt: `Act as an auction-design adviser to the Department of Telecommunications planning the next spectrum auction.
1. Compare first-price sealed bid, second-price sealed bid and simultaneous multi-round ascending (SMRA) formats on revenue, efficiency, collusion risk and winner's-curse risk.
2. Explain the revenue equivalence theorem and why it may fail here (common values, asymmetric bidders, budget constraints, only 3 bidders).
3. Recommend a reserve-price strategy, using what happened in India's 2016 and 2022 auctions as evidence.
4. List the assumptions you made and the data DoT would need to check them.`
  });
})();
