/* 11 — Matching Market: Gale–Shapley deferred acceptance, stability, blocking pairs */
(function () {
  const { $, $$, fmt, esc } = GT;
  const SETS = {
    vc: { A: 'Startups', B: 'Investors', a: ['KrishiAI', 'PayNest', 'MedRoute', 'EduSpark', 'Voltly'], b: ['Indus Capital', 'Sahyadri Ventures', 'Ganga Partners', 'Deccan Angels', 'Konkan Fund'] },
    campus: { A: 'Students', B: 'Recruiters', a: ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan'], b: ['Consulting Co', 'Bank Co', 'FMCG Co', 'Tech Co', 'Startup Co'] }
  };
  const N = 5;

  function genPrefs(kind) {
    const idx = [...Array(N).keys()];
    if (kind === 'random') return { pa: idx.map(() => GT.shuffle(idx)), pb: idx.map(() => GT.shuffle(idx)) };
    // correlated: common quality + idiosyncratic noise
    const qa = idx.map(() => Math.random()), qb = idx.map(() => Math.random());
    const ord = (q, noise) => { const key = idx.map(i => q[i] + noise()); return idx.slice().sort((x, y) => key[y] - key[x]); };
    const nz = kind === 'correlated' ? () => GT.rand(-0.15, 0.15) : () => GT.rand(-0.6, 0.6);
    return { pa: idx.map(() => ord(qb, nz)), pb: idx.map(() => ord(qa, nz)) };
  }

  function render(root) {
    root.innerHTML = `
      <div class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="field"><label>Market</label><select id="mt-set"><option value="vc">Startups ↔ Investors</option><option value="campus">Campus placement: Students ↔ Recruiters</option></select></div>
            <div class="field"><label>Preferences</label><div class="btn-row"><button class="btn sm" data-g="random">Random</button><button class="btn sm" data-g="correlated">Correlated (everyone likes the "top" names)</button><button class="btn sm" data-g="mixed">Mixed</button></div></div>
            <div class="panel-title mt">Preference lists (most preferred first, editable)</div>
            <div class="match-cols">
              <div><b style="color:var(--p1)" id="mt-ah"></b><textarea id="mt-ta" style="min-height:140px;font-size:.8rem"></textarea></div>
              <div><b style="color:var(--p2)" id="mt-bh"></b><textarea id="mt-tb" style="min-height:140px;font-size:.8rem"></textarea></div>
            </div>
            <p class="muted" style="font-size:.78rem">Use the numbers 1–5 for the other side, e.g. <code>KrishiAI: 2 1 4 3 5</code>.</p>
            <button class="btn sm" id="mt-apply">Apply edits</button>
          </div>
          <div class="card">
            <div class="panel-title">Deferred acceptance</div>
            <div class="field"><label>Who proposes?</label><select id="mt-prop"></select></div>
            <div class="btn-row"><button class="btn primary sm" id="mt-step">Next proposal</button><button class="btn sm" id="mt-run">Run to end</button><button class="btn sm ghost" id="mt-reset">Reset</button></div>
            <div class="log mt" id="mt-log" style="max-height:200px"></div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="subtabs" style="margin-bottom:8px"><button class="subtab active" data-sub="alg">Algorithm view</button><button class="subtab" data-sub="manual">Try your own matching</button></div>
            <p class="muted" data-pane="alg" style="font-size:.86rem">Dashed = tentative ("engaged"), solid = final. Numbers show how each side ranks its partner (1 = first choice).</p>
            <p class="muted hide" data-pane="manual" style="font-size:.86rem">Click a name on the left, then a name on the right, to pair them. Can you find a stable matching by hand? Red lines show blocking pairs.</p>
            <div id="mt-svg"></div>
            <div id="mt-verdict"></div>
          </div>
          <div class="card"><div class="panel-title">Who gains? Proposer-optimal vs receiver-optimal</div><div id="mt-compare"></div></div>
        </div>
      </div>`;

    let set = SETS.vc, pa, pb, run, manual = { pairs: {}, sel: null }, mode = 'alg';
    GT.subtabs(root, s => { mode = s; draw(); });

    function namesA() { return set.a; } function namesB() { return set.b; }
    function writeText() {
      $('#mt-ah', root).textContent = set.A; $('#mt-bh', root).textContent = set.B;
      $('#mt-ta', root).value = set.a.map((n, i) => `${n}: ${pa[i].map(j => j + 1).join(' ')}`).join('\n') + '\n\n' + set.b.map((n, j) => `${j + 1} = ${n}`).join('\n');
      $('#mt-tb', root).value = set.b.map((n, j) => `${n}: ${pb[j].map(i => i + 1).join(' ')}`).join('\n') + '\n\n' + set.a.map((n, i) => `${i + 1} = ${n}`).join('\n');
      $('#mt-prop', root).innerHTML = `<option value="A">${set.A} propose</option><option value="B">${set.B} propose</option>`;
    }
    function parseText(txt) {
      const lines = txt.split('\n').filter(l => l.includes(':')).slice(0, N);
      const out = lines.map(l => GT.parseNums(l.split(':')[1]).map(x => x - 1).filter(x => x >= 0 && x < N));
      if (out.length !== N || out.some(r => r.length !== N || new Set(r).size !== N)) return null;
      return out;
    }
    $('#mt-apply', root).onclick = () => {
      const a = parseText($('#mt-ta', root).value), b = parseText($('#mt-tb', root).value);
      if (!a || !b) { GT.toast('Each line needs all 5 numbers exactly once'); return; }
      pa = a; pb = b; reset();
    };

    function da(side) {
      const P = side === 'A' ? pa : pb, R = side === 'A' ? pb : pa;
      const rank = R.map(list => { const r = []; list.forEach((x, k) => r[x] = k); return r; });
      const next = new Array(N).fill(0), hold = new Array(N).fill(-1), free = [...Array(N).keys()];
      const steps = [];
      while (free.length) {
        const p = free.shift(); const r = P[p][next[p]++];
        if (hold[r] === -1) { hold[r] = p; steps.push({ p, r, ok: true, bumped: -1, hold: hold.slice() }); }
        else if (rank[r][p] < rank[r][hold[r]]) { const old = hold[r]; hold[r] = p; free.push(old); steps.push({ p, r, ok: true, bumped: old, hold: hold.slice() }); }
        else { free.push(p); steps.push({ p, r, ok: false, bumped: -1, hold: hold.slice() }); }
        // keep FIFO but rejected proposer should propose again soon: move to front
        if (!steps[steps.length - 1].ok) free.unshift(free.pop());
      }
      // convert to A→B matching
      const m = new Array(N).fill(-1);
      hold.forEach((p, r) => { if (side === 'A') m[p] = r; else m[r] = p; });
      return { steps, match: m, side };
    }
    function rankOf(list, x) { return list.indexOf(x) + 1; }
    function blocking(m) {
      const inv = new Array(N).fill(-1); m.forEach((b, a) => { if (b >= 0) inv[b] = a; });
      const out = [];
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
        if (m[a] === b) continue;
        const aPrefers = m[a] < 0 || rankOf(pa[a], b) < rankOf(pa[a], m[a]);
        const bPrefers = inv[b] < 0 || rankOf(pb[b], a) < rankOf(pb[b], inv[b]);
        if (aPrefers && bPrefers) out.push([a, b]);
      }
      return out;
    }

    function reset() { run = { res: da($('#mt-prop', root).value), shown: 0 }; manual = { pairs: {}, sel: null }; $('#mt-log', root).innerHTML = ''; draw(); compare(); }

    function curHold() {
      if (!run.shown) return { tent: new Array(N).fill(-1), last: null };
      const st = run.res.steps[run.shown - 1];
      const tent = new Array(N).fill(-1);
      st.hold.forEach((p, r) => { if (p < 0) return; if (run.res.side === 'A') tent[p] = r; else tent[r] = p; });
      return { tent, last: st };
    }

    function draw() {
      const W = 640, H = 300, xa = 150, xb = 490, Y = i => 36 + i * 56;
      const done = run.shown >= run.res.steps.length;
      let m, lastStep = null;
      if (mode === 'alg') { const c = curHold(); m = c.tent; lastStep = c.last; }
      else { m = new Array(N).fill(-1); Object.entries(manual.pairs).forEach(([a, b]) => m[+a] = b); }
      const blocks = mode === 'manual' ? blocking(m) : (done ? blocking(m) : []);
      let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%">`;
      s += `<text x="${xa}" y="14" text-anchor="end" style="font-weight:700;font-size:12px;fill:var(--p1)">${esc(set.A)}</text><text x="${xb}" y="14" style="font-weight:700;font-size:12px;fill:var(--p2)">${esc(set.B)}</text>`;
      blocks.forEach(([a, b]) => { s += `<line x1="${xa + 8}" y1="${Y(a)}" x2="${xb - 8}" y2="${Y(b)}" style="stroke:var(--bad);stroke-width:1.5;stroke-dasharray:2 4"/>`; });
      m.forEach((b, a) => {
        if (b < 0) return;
        const final = mode === 'manual' || done;
        s += `<line x1="${xa + 8}" y1="${Y(a)}" x2="${xb - 8}" y2="${Y(b)}" style="stroke:${final ? 'var(--accent)' : 'var(--ink-2)'};stroke-width:${final ? 3 : 2};${final ? '' : 'stroke-dasharray:6 5'}"/>`;
        const ra = rankOf(pa[a], b), rb = rankOf(pb[b], a);
        s += `<text x="${xa + 22}" y="${Y(a) + (Y(b) - Y(a)) * 0.12 - 4}" style="font-size:10.5px;font-weight:700;fill:var(--p1)">#${ra}</text>`;
        s += `<text x="${xb - 22}" y="${Y(b) + (Y(a) - Y(b)) * 0.12 - 4}" text-anchor="end" style="font-size:10.5px;font-weight:700;fill:var(--p2)">#${rb}</text>`;
      });
      if (lastStep && mode === 'alg') {
        const a = run.res.side === 'A' ? lastStep.p : lastStep.r, b = run.res.side === 'A' ? lastStep.r : lastStep.p;
        if (!lastStep.ok) s += `<line x1="${xa + 8}" y1="${Y(a)}" x2="${xb - 8}" y2="${Y(b)}" style="stroke:var(--bad);stroke-width:2.5;opacity:.6"/>`;
      }
      namesA().forEach((n, i) => { const sel = manual.sel === i && mode === 'manual'; s += `<g data-a="${i}" style="cursor:${mode === 'manual' ? 'pointer' : 'default'}"><rect x="${xa - 140}" y="${Y(i) - 15}" width="140" height="30" rx="7" style="fill:${sel ? 'var(--p1)' : 'var(--p1-soft)'}"/><text x="${xa - 10}" y="${Y(i) + 4}" text-anchor="end" style="font-size:12.5px;font-weight:600;fill:${sel ? '#fff' : 'var(--p1)'}">${i + 1}. ${esc(n)}</text></g><circle cx="${xa + 6}" cy="${Y(i)}" r="4" style="fill:var(--p1)"/>`; });
      namesB().forEach((n, j) => { s += `<g data-b="${j}" style="cursor:${mode === 'manual' ? 'pointer' : 'default'}"><rect x="${xb}" y="${Y(j) - 15}" width="148" height="30" rx="7" style="fill:var(--p2-soft)"/><text x="${xb + 10}" y="${Y(j) + 4}" style="font-size:12.5px;font-weight:600;fill:var(--p2)">${j + 1}. ${esc(n)}</text></g><circle cx="${xb - 6}" cy="${Y(j)}" r="4" style="fill:var(--p2)"/>`; });
      s += '</svg>';
      $('#mt-svg', root).innerHTML = s;
      if (mode === 'manual') {
        $$('[data-a]', root).forEach(g => g.onclick = () => { manual.sel = +g.dataset.a; draw(); });
        $$('[data-b]', root).forEach(g => g.onclick = () => {
          if (manual.sel === null) return;
          const b = +g.dataset.b;
          Object.keys(manual.pairs).forEach(a => { if (manual.pairs[a] === b) delete manual.pairs[a]; });
          manual.pairs[manual.sel] = b; manual.sel = null; draw();
          if (Object.keys(manual.pairs).length === N) { const mm = new Array(N).fill(-1); Object.entries(manual.pairs).forEach(([a, bb]) => mm[+a] = bb); const bl = blocking(mm); GT.log('matching', `Manual matching: ${bl.length ? bl.length + ' blocking pairs' : 'stable'}`, { pairs: manual.pairs }); }
        });
        const complete = Object.keys(manual.pairs).length === N;
        $('#mt-verdict', root).innerHTML = complete ? (blocks.length ? `<div class="note bad"><p><b>Unstable.</b> ${blocks.length} blocking pair(s), e.g. ${esc(set.a[blocks[0][0]])} & ${esc(set.b[blocks[0][1]])} both prefer each other to their assigned partners.</p></div>` : `<div class="note good"><p><b>Stable!</b> No pair would rather defect together. ${sameAs() ? `This is the ${sameAs()} matching produced by deferred acceptance.` : 'It differs from both deferred-acceptance outcomes, so this market has more than two stable matchings.'}</p></div>`) : `<p class="muted" style="font-size:.86rem">${Object.keys(manual.pairs).length}/${N} pairs made.</p>`;
      } else {
        $('#mt-verdict', root).innerHTML = done ? `<div class="note good"><p><b>Algorithm finished in ${run.res.steps.length} proposals.</b> ${blocks.length ? '' : 'There are no blocking pairs, so the matching is stable (as Gale & Shapley proved it always will be).'} Average rank of partner: ${set.A} ${fmt(avgRank(m, 'A'), 2)}, ${set.B} ${fmt(avgRank(m, 'B'), 2)}.</p></div>` : '';
      }
    }
    function sameAs() {
      const m = new Array(N).fill(-1); Object.entries(manual.pairs).forEach(([a, b]) => m[+a] = b);
      const A = da('A').match, B = da('B').match;
      if (A.every((x, i) => x === m[i])) return set.A.toLowerCase() + '-proposing';
      if (B.every((x, i) => x === m[i])) return set.B.toLowerCase() + '-proposing';
      return '';
    }
    function avgRank(m, side) {
      if (side === 'A') return GT.mean(m.map((b, a) => rankOf(pa[a], b)));
      const inv = new Array(N).fill(-1); m.forEach((b, a) => inv[b] = a);
      return GT.mean(inv.map((a, b) => rankOf(pb[b], a)));
    }
    function compare() {
      const A = da('A').match, B = da('B').match;
      const same = A.every((x, i) => x === B[i]);
      GT.chart.bars($('#mt-compare', root), {
        bars: [{ label: `${set.A}: when ${set.A} propose`, value: avgRank(A, 'A'), color: 'var(--p1)' }, { label: `${set.A}: when ${set.B} propose`, value: avgRank(B, 'A'), color: 'var(--p1-soft)' },
        { label: `${set.B}: when ${set.A} propose`, value: avgRank(A, 'B'), color: 'var(--p2-soft)' }, { label: `${set.B}: when ${set.B} propose`, value: avgRank(B, 'B'), color: 'var(--p2)' }],
        decimals: 2, yLabel: 'Avg. rank of partner (lower = better)', height: 240, yMin: 0, yMax: 5, rotate: true
      });
      $('#mt-compare', root).insertAdjacentHTML('beforeend', `<div class="note"><p>${same ? 'Here both versions give the <b>same</b> matching: the stable matching is unique, which is common when preferences are highly correlated.' : '<b>The proposing side does better.</b> Deferred acceptance gives the proposers their best stable partners and the receivers their worst. Who proposes is a design choice with real distributional consequences.'}</p></div>`);
    }

    function stepOnce() {
      if (run.shown >= run.res.steps.length) return false;
      const st = run.res.steps[run.shown++];
      const P = run.res.side === 'A' ? set.a : set.b, R = run.res.side === 'A' ? set.b : set.a;
      $('#mt-log', root).insertAdjacentHTML('afterbegin', `<div>${run.shown}. <b>${esc(P[st.p])}</b> proposes to <b>${esc(R[st.r])}</b> → ${st.ok ? (st.bumped >= 0 ? `accepted; ${esc(P[st.bumped])} is dumped` : 'held (tentatively)') : 'rejected'}</div>`);
      return true;
    }
    $('#mt-step', root).onclick = () => { stepOnce(); draw(); if (run.shown >= run.res.steps.length) GT.log('matching', `Deferred acceptance (${$('#mt-prop', root).value === 'A' ? set.A : set.B} propose): ${run.res.steps.length} proposals`, { match: run.res.match }); };
    $('#mt-run', root).onclick = () => { while (stepOnce()); draw(); GT.log('matching', `Deferred acceptance (${$('#mt-prop', root).value === 'A' ? set.A : set.B} propose): ${run.res.steps.length} proposals`, { match: run.res.match }); };
    $('#mt-reset', root).onclick = reset;
    $('#mt-prop', root).onchange = reset;
    $$('[data-g]', root).forEach(b => b.onclick = () => { const g = genPrefs(b.dataset.g); pa = g.pa; pb = g.pb; writeText(); reset(); });
    $('#mt-set', root).onchange = e => { set = SETS[e.target.value]; writeText(); reset(); };

    const g = genPrefs('mixed'); pa = g.pa; pb = g.pb; writeText(); reset();
  }

  GT.register({
    id: 'matching', num: 11, icon: '💞', title: 'Matching Market: Startups, Investors & Campus Placements', modules: ['M8'], sessions: '18', time: '30–40 min',
    tagline: 'Step through the Gale–Shapley algorithm, try to build a stable matching by hand, and see why the side that proposes wins.',
    problem: 'Startups seek investors, students seek recruiters, students apply to IITs. How do we pair agents with different preferences so that no two parties would rather be matched with each other than with their assigned partners, and who gains from the design?',
    concepts: ['Two-sided matching', 'Stability', 'Blocking pairs', 'Deferred acceptance', 'Market design'],
    render,
    guide: {
      objective: 'Understand stability, run the deferred-acceptance algorithm by hand, and see that algorithm design creates winners and losers.',
      players: '1 student; or 10 students role-playing the two sides',
      modes: 'Algorithm stepper · Manual matching challenge · Proposer comparison',
      rules: `<ul><li>Each agent ranks every agent on the other side (1 = most preferred).</li><li>A matching is <b>stable</b> if no startup and investor both prefer each other to their current partners (a <b>blocking pair</b>).</li><li><b>Deferred acceptance:</b> proposers propose in order of preference. Receivers hold the best offer so far and reject the rest. Nothing is final until the end.</li></ul>`,
      steps: [
        'Generate <b>Mixed</b> preferences. Read the lists and guess a good matching.',
        'Switch to <b>Try your own matching</b> and pair everyone by hand. Is your matching stable? Fix any blocking pairs shown in red.',
        'Back in <b>Algorithm view</b>, click <b>Next proposal</b> repeatedly. Narrate what happens at each rejection.',
        'Change who proposes and run again. Compare the average ranks in the chart.',
        'Generate <b>Correlated</b> preferences. Are the two outcomes still different? Why?',
        'Edit one startup\'s list so it ranks a different investor first. How far does the change ripple through the matching?'
      ],
      facilitator: [
        'Live demo with 10 volunteers: 5 "startups" and 5 "investors", each holding a card with their ranking. Run deferred acceptance physically: startups walk to investors, investors hold one card at a time.',
        'Replicate it on the projector with the same preferences and confirm the result.',
        'Ask: "Is it better to propose or to receive?" Then switch sides.',
        'Connect to the 2012 Nobel (Roth & Shapley), the US medical residency match, kidney exchange and JoSAA.',
        'Discussion: why do campus placements unravel into "Day Zero" pre-placement offers, and how could a centralised match help?',
        'Timing: 10 min physical demo, 10 min tool, 15 min applications.'
      ],
      variations: ['Many-to-one: each recruiter has 2 slots (college admissions problem).', 'Strategic misreporting: can a receiver gain by truncating its list? (It can sometimes; proposers never can.)', 'Add an outside option: an investor prefers nobody to a low-ranked startup.']
    },
    theory: `
      <h3 style="margin-top:0">Two-sided matching</h3>
      <p>Two disjoint sets of agents (firms and workers, students and schools) each have preferences over the other side. Money may not be able to clear the market (you cannot buy admission to an IIT or a kidney), so <b>who gets matched to whom</b> is the outcome.</p>
      <h3>Stability</h3>
      <p>A matching is <b>stable</b> if there is no blocking pair (a, b) where a and b both prefer each other to their assigned partners. Unstable matchings tend to unravel, because people renege on deals and go around the system.</p>
      <h3>Gale–Shapley deferred acceptance (1962)</h3>
      <ol><li>Each free proposer proposes to its most-preferred receiver that has not rejected it yet.</li><li>Each receiver tentatively holds its best proposal so far and rejects the others.</li><li>Repeat until no one is free.</li></ol>
      <p><b>Theorems:</b> (i) the algorithm always ends in a <b>stable</b> matching; (ii) it is <b>proposer-optimal</b>: every proposer gets its best partner in any stable matching, and every receiver its worst; (iii) it is <b>strategy-proof for proposers</b>: telling the truth is a dominant strategy for them.</p>
      <div class="formula">Stable matchings always exist · Proposers weakly prefer the proposer-optimal one · Receivers weakly prefer the other</div>
      <h3>Market design lessons (Roth 2015, <i>Who Gets What and Why</i>)</h3>
      <ul><li><b>Thickness:</b> bring enough participants together at the same time.</li><li><b>Congestion:</b> give people time to consider offers.</li><li><b>Safety:</b> make truthful participation safe, i.e. strategy-proof.</li><li><b>Unravelling:</b> without a central clearinghouse, offers get made earlier and earlier (exploding offers, early pre-placement offers).</li></ul>`,
    practice: [
      { tag: 'India', title: 'JoSAA IIT/NIT seat allocation', text: 'The Joint Seat Allocation Authority uses a deferred-acceptance-based algorithm across IITs, NITs and IIITs, with several rounds and reserved categories. Students rank programmes, institutes rank students by JEE rank, and the outcome is stable.' },
      { tag: 'India', title: 'Campus placements and "Day Zero"', text: 'Firms compete for early slots, students feel pressure to accept the first offer, and some offers come with very short deadlines. This is classic unravelling in a decentralised market, and placement-committee slot rules are a partial market-design fix.' },
      { tag: 'Global', title: 'US medical residency match (NRMP)', text: 'Since the 1950s US doctors have been matched to hospitals by a centralised clearinghouse. Roth\'s 1990s redesign made it applicant-proposing and accommodated couples. More than 40,000 positions are matched each year.' },
      { tag: 'Global', title: 'Kidney exchange', text: 'Incompatible donor–patient pairs swap donors in cycles or chains. Roth, Sönmez and Ünver adapted matching theory to it, which has saved thousands of lives. India now permits swap transplants under the transplant rules.' },
      { tag: 'Global', title: 'School choice: Boston vs deferred acceptance', text: 'The old "Boston mechanism" punished honest ranking. Boston and New York moved to deferred acceptance in the 2000s so families could list true preferences safely.' },
      { tag: 'Frontier', title: 'Platforms as matchmakers', text: 'Ride-hailing, dating apps and freelance platforms (Urban Company, Upwork) are matching markets with prices. Questions like who proposes and how many options are shown are now product-management decisions.' }
    ],
    debrief: [
      'Define a blocking pair in the language of startups and investors.',
      'Why does deferred acceptance always produce a stable matching? Give the intuition in two sentences.',
      'Which side gained when it proposed? Should JoSAA be student-proposing or institute-proposing, and why?',
      'Why do decentralised markets such as campus placements unravel? Suggest a market-design fix for an IIM placement process.',
      'Can a receiver gain by misreporting preferences? What does that imply for designing a "truthful" system?',
      'Give one business matching problem you saw during your internship and say whether it was stable.'
    ],
    aiPrompt: `Here are preference lists for 5 startups and 5 investors: [paste lists].
1. Run the Gale–Shapley algorithm with startups proposing, showing every proposal and rejection.
2. Run it again with investors proposing and compare the two matchings.
3. Check whether a third stable matching exists.
4. Design a matching process for a startup demo day at my institute, addressing thickness, congestion, safety and unravelling.
Show each step so I can verify it against my simulation.`
  });
})();
