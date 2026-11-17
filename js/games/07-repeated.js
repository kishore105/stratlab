/* 07 — OPEC Cartel: repeated Prisoner's Dilemma, trigger strategies, Axelrod tournament */
(function () {
  const { $, $$, fmt, esc } = GT;
  const C = 'C', D = 'D';

  const STRATS = {
    tft: { name: 'Tit-for-Tat', color: '#2457c5', desc: 'Complies first, then copies the rival\'s last move.', f: (m, o) => o.length ? o[o.length - 1] : C },
    grim: { name: 'Grim Trigger', color: '#7c3aed', desc: 'Complies until the rival cheats once, then cheats forever.', f: (m, o) => o.includes(D) ? D : C },
    alld: { name: 'Always Cheat', color: '#c2362b', desc: 'Overproduces every period.', f: () => D },
    allc: { name: 'Always Comply', color: '#1d7a3f', desc: 'Sticks to quota no matter what.', f: () => C },
    gtft: { name: 'Generous TFT', color: '#0f6e66', desc: 'Like TFT, but forgives a cheat one time in three.', f: (m, o) => !o.length || o[o.length - 1] === C ? C : (Math.random() < 1 / 3 ? C : D) },
    tf2t: { name: 'Tit-for-Two-Tats', color: '#0891b2', desc: 'Retaliates only after two cheats in a row.', f: (m, o) => o.length >= 2 && o[o.length - 1] === D && o[o.length - 2] === D ? D : C },
    pavlov: { name: 'Pavlov (Win-Stay, Lose-Shift)', color: '#b45309', desc: 'Repeats its last move if it did well, switches otherwise.', f: (m, o) => { if (!m.length) return C; const l = m.length - 1; return m[l] === o[l] ? C : D; } },
    joss: { name: 'Sneaky TFT (Joss)', color: '#9f1239', desc: 'TFT, but secretly cheats 10% of the time.', f: (m, o) => { const b = o.length ? o[o.length - 1] : C; return b === C && Math.random() < 0.1 ? D : b; } },
    rand: { name: 'Random', color: '#64748b', desc: 'Complies or cheats with equal probability.', f: () => Math.random() < 0.5 ? C : D }
  };

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="play">Play: OPEC+ quota game</button><button class="subtab" data-sub="tour">Axelrod tournament</button><button class="subtab" data-sub="evo">Evolution</button><button class="subtab" data-sub="calc">When does cooperation hold?</button></div>
      <div class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="panel-title">Stage game ($ bn per period)</div>
            <table class="matrix" id="rp-matrix"></table>
            <div class="field mt"><div class="field-row"><label>Temptation T (cheat on a complier)</label><span class="val" data-v="T"></span></div><input type="range" data-k="T" min="3.5" max="9" step="0.5" value="5"></div>
            <p class="muted" style="font-size:.82rem">R = 3 (both comply) · P = 1 (both cheat) · S = 0 (sucker)</p>
          </div>
          <div class="card" data-pane="play">
            <div class="panel-title">You are Saudi Arabia. The rival is a mystery producer.</div>
            <div class="field"><div class="field-row"><label>Chance the game continues each period δ</label><span class="val" data-v="delta"></span></div><input type="range" data-k="delta" min="0.5" max="0.97" step="0.01" value="0.9"></div>
            <label style="display:flex;gap:6px;align-items:center;font-weight:500;margin-bottom:10px"><input type="checkbox" id="rp-noise"> 5% noise (a member overproduces by accident)</label>
            <div class="btn-row"><button class="btn p1" id="rp-c">Comply with quota</button><button class="btn p2" id="rp-d">Cheat (overproduce)</button></div>
            <button class="btn sm mt" id="rp-new">New rival</button>
          </div>
          <div class="card hide" data-pane="tour">
            <div class="panel-title">Entrants</div>
            <div id="rp-entr"></div>
            <div class="field mt"><div class="field-row"><label>Rounds per match</label><span class="val" data-v="rounds"></span></div><input type="range" data-k="rounds" min="5" max="200" step="5" value="100"></div>
            <div class="field"><div class="field-row"><label>Noise (execution error)</label><span class="val" data-v="noise"></span></div><input type="range" data-k="noise" min="0" max="0.2" step="0.01" value="0"></div>
            <button class="btn primary" id="rp-run">Run round-robin tournament</button>
          </div>
          <div class="card hide" data-pane="evo">
            <div class="panel-title">Evolutionary dynamics</div>
            <p class="muted" style="font-size:.88rem">Strategies that earn more in the tournament grow in the population (replicator dynamics). Uses the entrants, rounds and noise from the Tournament tab.</p>
            <div class="field"><div class="field-row"><label>Generations</label><span class="val" data-v="gens"></span></div><input type="range" data-k="gens" min="10" max="150" step="10" value="60"></div>
            <button class="btn primary" id="rp-evo">Run evolution</button>
          </div>
        </div>
        <div class="stack">
          <div class="card" data-pane="play">
            <div class="kpis"><div class="kpi p1"><div class="k">Your total</div><div class="v" id="rp-y">0</div></div><div class="kpi p2"><div class="k">Rival total</div><div class="v" id="rp-o">0</div></div><div class="kpi"><div class="k">Period</div><div class="v" id="rp-t">0</div></div><div class="kpi accent"><div class="k">Coop. rate</div><div class="v" id="rp-cr">–</div></div></div>
            <div id="rp-strip" class="mt" style="overflow-x:auto"></div>
            <div id="rp-msg"></div>
          </div>
          <div class="card hide" data-pane="tour"><div id="rp-tout"><p class="muted">Pick entrants and run the tournament. Every strategy plays every other (and a copy of itself). The score is the average payoff per period.</p></div></div>
          <div class="card hide" data-pane="evo"><div id="rp-eout"><p class="muted">Run evolution to see which strategies take over the population.</p></div></div>
          <div class="card hide" data-pane="calc"><div id="rp-calc"></div></div>
        </div>
      </div>`;

    let prm;
    const pay = (a, b) => a === C ? (b === C ? 3 : 0) : (b === C ? prm.T : 1);
    let G;
    const paint = GT.bindRanges(root, o => { prm = o; drawMatrix(); drawCalc(); }, { delta: v => fmt(v, 2), noise: v => GT.pct(v) });
    prm = paint();
    GT.subtabs(root, s => { if (s === 'calc') drawCalc(); });

    function drawMatrix() {
      $('#rp-matrix', root).innerHTML = `<tr><th></th><th class="colhead">Rival complies</th><th class="colhead">Rival cheats</th></tr>
        <tr><th class="rowhead">Comply</th><td class="cell"><span class="pay"><span class="a">3</span><span class="b">3</span></span></td><td class="cell"><span class="pay"><span class="a">0</span><span class="b">${prm.T}</span></span></td></tr>
        <tr><th class="rowhead">Cheat</th><td class="cell"><span class="pay"><span class="a">${prm.T}</span><span class="b">0</span></span></td><td class="cell ne"><span class="pay"><span class="a">1</span><span class="b">1</span></span></td></tr>`;
    }

    /* ---------- play ---------- */
    function newGame() {
      const k = GT.pick(Object.keys(STRATS));
      G = { k, me: [], op: [], ys: 0, os: 0, over: false };
      $('#rp-msg', root).innerHTML = '<div class="note"><p>Each period, choose to comply or cheat. After every period the game continues with probability δ, so you never know which period is the last. Can you work out your rival\'s strategy?</p></div>';
      drawPlay();
    }
    function drawPlay() {
      $('#rp-y', root).textContent = fmt(G.ys, 1); $('#rp-o', root).textContent = fmt(G.os, 1); $('#rp-t', root).textContent = G.me.length;
      $('#rp-cr', root).textContent = G.me.length ? GT.pct((G.me.filter(x => x === C).length + G.op.filter(x => x === C).length) / (2 * G.me.length)) : '–';
      const cell = (x, col) => `<td style="width:22px;height:22px;text-align:center;font-size:11px;font-weight:700;border-radius:4px;background:${x === C ? 'var(--good-soft)' : 'var(--bad-soft)'};color:${x === C ? 'var(--good)' : 'var(--bad)'}">${x}</td>`;
      $('#rp-strip', root).innerHTML = G.me.length ? `<table style="border-spacing:3px"><tr><th style="text-align:right;font-size:.78rem;color:var(--p1);padding-right:6px">You</th>${G.me.map(x => cell(x)).join('')}</tr><tr><th style="text-align:right;font-size:.78rem;color:var(--p2);padding-right:6px">Rival</th>${G.op.map(x => cell(x)).join('')}</tr></table>` : '';
      ['#rp-c', '#rp-d'].forEach(s => $(s, root).disabled = G.over);
    }
    function move(mine) {
      if (G.over) return;
      const noise = $('#rp-noise', root).checked;
      let theirs = STRATS[G.k].f(G.op, G.me);
      if (noise && Math.random() < 0.05) theirs = theirs === C ? D : C;
      if (noise && Math.random() < 0.05) mine = mine === C ? D : C;
      G.me.push(mine); G.op.push(theirs);
      G.ys += pay(mine, theirs); G.os += pay(theirs, mine);
      if (Math.random() > prm.delta) {
        G.over = true;
        const n = G.me.length;
        $('#rp-msg', root).innerHTML = `<div class="note amber"><p><b>The cartel game ended after ${n} period${n > 1 ? 's' : ''}.</b> Your rival was <b>${STRATS[G.k].name}</b>: ${STRATS[G.k].desc} You averaged ${fmt(G.ys / n, 2)} per period (full cooperation = 3, mutual cheating = 1).</p></div>`;
        GT.log('repeated', `OPEC vs ${STRATS[G.k].name}: ${n} periods, avg ${fmt(G.ys / n, 2)}/period`, { rival: G.k, me: G.me.join(''), op: G.op.join(''), delta: prm.delta, T: prm.T });
      }
      drawPlay();
    }
    $('#rp-c', root).onclick = () => move(C);
    $('#rp-d', root).onclick = () => move(D);
    $('#rp-new', root).onclick = newGame;

    /* ---------- tournament ---------- */
    $('#rp-entr', root).innerHTML = Object.entries(STRATS).map(([k, s]) => `<label style="display:flex;gap:8px;align-items:flex-start;font-weight:500;margin-bottom:6px"><input type="checkbox" data-s="${k}" ${k !== 'rand' ? 'checked' : ''}> <span><b style="color:${s.color}">${s.name}</b><br><small class="muted">${s.desc}</small></span></label>`).join('');
    const entrants = () => $$('[data-s]', root).filter(c => c.checked).map(c => c.dataset.s);
    function match(a, b, rounds, noise) {
      const ma = [], mb = []; let sa = 0, sb = 0;
      for (let t = 0; t < rounds; t++) {
        let x = STRATS[a].f(ma, mb), y = STRATS[b].f(mb, ma);
        if (Math.random() < noise) x = x === C ? D : C;
        if (Math.random() < noise) y = y === C ? D : C;
        ma.push(x); mb.push(y); sa += pay(x, y); sb += pay(y, x);
      }
      return [sa / rounds, sb / rounds];
    }
    function tournament() {
      const E = entrants(), reps = 5;
      const M = {}; E.forEach(a => { M[a] = {}; });
      E.forEach((a, i) => E.forEach((b, j) => {
        if (j < i) return;
        let s = [0, 0];
        for (let r = 0; r < reps; r++) { const m = match(a, b, prm.rounds, prm.noise); s[0] += m[0]; s[1] += m[1]; }
        M[a][b] = s[0] / reps; M[b][a] = s[1] / reps;
        if (a === b) M[a][a] = (s[0] + s[1]) / (2 * reps);
      }));
      return { E, M };
    }
    $('#rp-run', root).onclick = () => {
      const { E, M } = tournament();
      if (E.length < 2) { GT.toast('Pick at least two entrants'); return; }
      const scores = E.map(a => ({ k: a, s: GT.mean(E.map(b => M[a][b])) })).sort((x, y) => y.s - x.s);
      const out = $('#rp-tout', root);
      out.innerHTML = `<div class="panel-title">Average payoff per period</div><div id="rp-tc"></div>
        <div class="tbl-wrap"><table class="data mt"><thead><tr><th>vs →</th>${E.map(b => `<th>${STRATS[b].name.split(' ')[0]}</th>`).join('')}</tr></thead><tbody>${E.map(a => `<tr><td><b style="color:${STRATS[a].color}">${STRATS[a].name}</b></td>${E.map(b => `<td>${fmt(M[a][b], 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="note"><p><b>Winner: ${STRATS[scores[0].k].name}.</b> Axelrod (1984) found that winning strategies are <b>nice</b> (never cheat first), <b>retaliatory</b>, <b>forgiving</b> and <b>clear</b>. Always Cheat beats each opponent head-to-head (or ties), yet it usually finishes near the bottom. ${prm.noise > 0 ? 'With noise, forgiving strategies (Generous TFT, Pavlov) tend to beat strict TFT and Grim, which get stuck in feuds after one error.' : 'Add noise and see whether the ranking changes.'}</p></div>`;
      GT.chart.bars($('#rp-tc', out), { bars: scores.map(s => ({ label: STRATS[s.k].name, value: s.s, color: STRATS[s.k].color })), decimals: 2, yLabel: '$ bn / period', rotate: true, height: 280, hlines: [{ y: 3, label: 'Full cooperation (3)', color: 'var(--good)' }, { y: 1, label: 'Mutual cheating (1)', color: 'var(--bad)' }] });
      GT.log('repeated', `Tournament (${prm.rounds} rounds, noise ${GT.pct(prm.noise)}): winner ${STRATS[scores[0].k].name}`, { scores });
    };

    $('#rp-evo', root).onclick = () => {
      const { E, M } = tournament();
      if (E.length < 2) { GT.toast('Pick at least two entrants on the Tournament tab'); return; }
      let x = E.map(() => 1 / E.length);
      const hist = E.map(() => []);
      for (let g = 0; g <= prm.gens; g++) {
        x.forEach((v, i) => hist[i].push([g, v]));
        const f = E.map((a, i) => E.reduce((s, b, j) => s + x[j] * M[a][b], 0));
        const avg = x.reduce((s, v, i) => s + v * f[i], 0);
        x = x.map((v, i) => v * f[i] / avg);
      }
      const out = $('#rp-eout', root);
      out.innerHTML = '<div class="panel-title">Population share over generations</div><div id="rp-ec"></div>';
      GT.chart.line($('#rp-ec', out), { series: E.map((a, i) => ({ name: STRATS[a].name, color: STRATS[a].color, points: hist[i] })), xMin: 0, xMax: prm.gens, yMin: 0, yMax: 1, xLabel: 'Generation', yLabel: 'Share of population', height: 320 });
      const final = E.map((a, i) => [a, x[i]]).sort((p, q) => q[1] - p[1]);
      out.insertAdjacentHTML('beforeend', `<div class="note"><p>After ${prm.gens} generations, <b>${STRATS[final[0][0]].name}</b> holds ${GT.pct(final[0][1])} of the population. Exploiters often grow early by feeding on unconditional cooperators, then collapse once those "suckers" are gone. Reciprocators inherit the market.</p></div>`);
    };

    /* ---------- calculator ---------- */
    function drawCalc() {
      const T = prm.T, R = 3, P = 1, S = 0;
      const dGrim = (T - R) / (T - P);
      const dTft = (T - R) / (R - S);
      const pts = [];
      for (let t = 3.5; t <= 9; t += 0.25) pts.push([t, (t - R) / (t - P)]);
      $('#rp-calc', root).innerHTML = `<div class="panel-title">Minimum patience needed to sustain cooperation</div>
        <div class="formula">Grim trigger works iff  δ ≥ (T − R)/(T − P) = (${T} − 3)/(${T} − 1) = ${fmt(dGrim, 3)}</div>
        <p>Cooperating forever gives R/(1−δ). Cheating once gives T today, then P forever after: T + δP/(1−δ). Cooperation holds when the first is at least as large as the second.</p>
        <div id="rp-cc"></div>
        <div class="note ${prm.delta >= dGrim ? 'good' : 'bad'}"><p>With your current δ = ${fmt(prm.delta, 2)} (Play tab) and T = ${T}: cooperation <b>${prm.delta >= dGrim ? 'CAN' : 'CANNOT'}</b> be sustained by Grim Trigger. ${prm.delta >= dGrim ? '' : 'Members value the future too little relative to the gain from cheating.'} (TFT also needs δ ≥ (T−R)/(R−S) = ${fmt(dTft, 3)} to deter one-off cheating.)</p></div>
        <h4>What lowers δ in real cartels?</h4><ul style="font-size:.92rem;color:var(--ink-2)"><li>Fiscal pressure: a member needs cash now (low patience).</li><li>Expected end of the oil era: the "future" of the game shrinks.</li><li>Poor monitoring: cheating detected late is like a lower δ.</li><li>New entrants (shale) raise T, the gain from grabbing share.</li></ul>`;
      GT.chart.line($('#rp-cc', root), { series: [{ name: 'Critical δ for Grim Trigger', color: 'var(--accent)', points: pts, area: true }], xMin: 3.5, xMax: 9, yMin: 0, yMax: 1, xLabel: 'Temptation T', yLabel: 'Critical δ', height: 220, markers: [{ x: T, y: dGrim, label: 'now', color: 'var(--amber)' }], hlines: [{ y: prm.delta, label: 'your δ', color: 'var(--p1)' }] });
    }

    drawMatrix(); newGame();
  }

  GT.register({
    id: 'repeated', num: 7, icon: '🛢️', title: 'OPEC Cartel: Repeated Games', modules: ['M4'], sessions: '12', time: '40–50 min',
    tagline: 'Play an indefinitely repeated quota game against a hidden strategy, then run an Axelrod tournament and watch strategies evolve.',
    problem: 'OPEC members keep breaking production quotas they collectively agreed to. Why does cooperation collapse, and can it ever be sustained? What separates OPEC+ from the Indian telecom tariff hikes of 2024?',
    concepts: ['Repeated games', 'Grim trigger', 'Tit-for-Tat', 'Folk theorem', 'Discount factor', 'Tacit collusion'],
    render,
    guide: {
      objective: 'See how the shadow of the future sustains cooperation in a Prisoner\'s Dilemma, find which strategies succeed in repeated interaction, and compute the critical discount factor.',
      players: '1 student vs a hidden AI strategy · whole-class tournament',
      modes: 'Play (random-length game) · Axelrod tournament · Replicator dynamics · Critical-δ calculator',
      rules: `<ul><li>Each period, two producers choose to <b>comply</b> with the quota or <b>cheat</b> (overproduce).</li><li>Stage payoffs: both comply 3 each, both cheat 1 each, cheater vs complier T vs 0.</li><li>After each period the game continues with probability δ, so nobody knows when it ends. This removes the backward-induction unravelling of finite games.</li><li>Your rival uses one of 9 classic strategies. Identify it.</li></ul>`,
      steps: [
        'Play 3–4 games against random rivals. Try to identify each rival\'s strategy from its behaviour before it is revealed.',
        'Play once with noise on. Note how one accidental cheat can trigger a long feud.',
        'Go to <b>Tournament</b>, keep all strategies except Random, and run it. Who wins? Who loses?',
        'Set noise to 5% and re-run. Which strategies gain or lose?',
        'Remove Always Comply and re-run. How does that affect Always Cheat?',
        'Run <b>Evolution</b>. Describe the population dynamics in three phases.',
        'Use the <b>calculator</b>: at T = 5, what δ do you need? What real-world events lower a member\'s δ?'
      ],
      facilitator: [
        'Session 12 pre-read: "Why OPEC keeps breaking its own rules". Ask for the game-theoretic reason before the activity.',
        'Classroom tournament: students write a strategy rule (one sentence) on a card. Code each as the nearest built-in strategy and run the tournament on the projector.',
        'Alternatively, pair students for 6–10 rounds of comply/cheat with a dice roll to end the game (e.g. end on a 6, so δ = 5/6).',
        'Discuss finite vs infinite horizons: if everyone knows the game ends in round 10, backward induction unravels cooperation from the end.',
        'Bridge to antitrust: tacit collusion is legal-ish; explicit agreements are not. Where are algorithmic pricing and telecom tariffs on this spectrum?',
        'Timing: 10 min play, 15 min tournament and evolution, 10 min calculator, 10 min OPEC and telecom discussion.'
      ],
      variations: ['Imperfect monitoring: a member only sees the oil price, not the rival\'s output (Green & Porter price wars).', 'Asymmetric members: give one player a bigger T (Saudi Arabia as swing producer).', 'Add a "compensation" option: cheaters later cut extra (OPEC+ compensation schedules, 2024).']
    },
    theory: `
      <h3 style="margin-top:0">Finitely repeated PD: unravelling</h3>
      <p>If the game is played a known, finite number of times, backward induction applies. In the last round, cheating is dominant. Knowing that, cheating is dominant in the second-to-last round, and so on. <b>Cooperation unravels completely.</b> In laboratory and business practice, people cooperate until near the end anyway (the "end-game effect").</p>
      <h3>Infinitely (indefinitely) repeated games</h3>
      <p>If the game continues each period with probability δ (or players discount the future by δ), future punishments can deter cheating today. Under <b>Grim Trigger</b>, cooperation is an SPNE when:</p>
      <div class="formula">R/(1−δ)  ≥  T + δ·P/(1−δ)     ⇔     δ  ≥  (T − R)/(T − P)</div>
      <h3>The Folk Theorem</h3>
      <p>With sufficiently patient players, <b>any</b> feasible outcome that gives each player more than their minimax (punishment) payoff can be sustained as an equilibrium of the repeated game. Repetition makes cooperation <i>possible</i>, but it also makes many other outcomes possible. Which one occurs depends on norms, communication and focal points.</p>
      <h3>Axelrod's tournaments (1980, 1984)</h3>
      <p>Game theorists submitted strategies for a computer tournament, and the simplest, Tit-for-Tat (Anatol Rapoport), won twice. Successful strategies were:</p>
      <ul><li><b>Nice:</b> never cheat first.</li><li><b>Retaliatory:</b> punish cheating immediately.</li><li><b>Forgiving:</b> return to cooperation after punishment.</li><li><b>Clear:</b> easy for others to recognise and adapt to.</li></ul>
      <p>With noise, strict TFT gets locked into echo feuds. Generous TFT and Pavlov (Nowak & Sigmund 1993) do better.</p>
      <h3>What makes cartels fragile</h3>
      <table class="data"><thead><tr><th>Factor</th><th>Effect on cooperation</th></tr></thead><tbody>
        <tr><td>More members</td><td>Each one's gain from cheating rises and monitoring gets harder</td></tr>
        <tr><td>Demand booms</td><td>T is high today relative to future punishment (Rotemberg–Saloner)</td></tr>
        <tr><td>Imperfect monitoring</td><td>Punishment phases get triggered by mistake (Green–Porter)</td></tr>
        <tr><td>Asymmetric costs / capacities</td><td>Hard to agree on fair quotas</td></tr>
        <tr><td>Short horizons (fiscal stress, energy transition)</td><td>Lower effective δ</td></tr>
      </tbody></table>`,
    practice: [
      { tag: 'Global', title: 'OPEC+ and the 2020 price war', text: 'In March 2020 Saudi Arabia and Russia failed to agree on cuts, and Saudi Arabia flooded the market: a punishment phase. A month later OPEC+ agreed a record cut of about 9.7 million barrels per day, a return to cooperation after the "trigger" was pulled.' },
      { tag: 'Global', title: 'OPEC+ compensation schedules (2023–25)', text: 'Members such as Iraq and Kazakhstan repeatedly overproduced and were required to submit "compensation cuts". This is a forgiving, TFT-like mechanism that avoids a full price war while still punishing.' },
      { tag: 'India', title: 'Telecom tariff hikes, July 2024', text: 'Jio, Airtel and Vi raised prices by roughly 10–25% within days of each other. A concentrated market, frequent interaction and transparent prices make tacit coordination sustainable without any explicit agreement.' },
      { tag: 'India', title: 'CCI and the cement cartel', text: 'The Competition Commission of India fined major cement manufacturers over ₹6,000 crore for coordinating prices and supply. Explicit communication (via the industry association) is what crossed the legal line.' },
      { tag: 'Global', title: 'Airline alliances and codeshares', text: 'Repeated interaction across many routes ("multimarket contact") makes retaliation possible on any route, which raises the effective δ and supports softer competition.' },
      { tag: 'Frontier', title: 'Algorithms that learn to collude', text: 'Calvano et al. (2020) found Q-learning pricing agents converge to supra-competitive prices sustained by punishment-like reward schemes, with no communication. Assad et al. (2024, <i>JPE</i>) found margins rose in German retail fuel after algorithmic pricing was adopted in duopoly markets.' }
    ],
    debrief: [
      'Why does cooperation unravel in a game with a known final round but survive when the end is uncertain?',
      'Which strategy won your tournament, and which of Axelrod\'s four properties explain it?',
      'Always Cheat never loses a head-to-head match, so why does it come near the bottom of the tournament?',
      'Use the δ formula to explain why OPEC cooperation broke down in March 2020.',
      'Is the July 2024 telecom tariff hike tacit collusion or independent profit-maximisation? What evidence would distinguish them?',
      'Should pricing algorithms that learn to cooperate be illegal? Who is liable: the firm, the vendor or the algorithm?'
    ],
    aiPrompt: `I ran an Axelrod-style repeated Prisoner's Dilemma tournament with T=5, R=3, P=1, S=0. Results (average payoff per period): [paste scores].
1. Explain the ranking using Axelrod's properties (nice, retaliatory, forgiving, clear).
2. Compute the critical discount factor for Grim Trigger and explain what it means for OPEC+ members facing fiscal pressure.
3. Apply the analysis to the July 2024 Indian telecom tariff hikes: is this consistent with tacit collusion in a repeated game? What alternative explanations exist?
4. Design one policy a competition regulator could use against algorithmic tacit collusion, and name its main weakness.`
  });
})();
