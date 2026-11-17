/* 01 — Price War Matrix Lab: normal form, dominance, IEDS, Nash equilibrium */
(function () {
  const { $, $$, esc, fmt } = GT;

  const PRESETS = {
    telecom: {
      name: 'Telecom tariff war (Prisoner\'s Dilemma)', A: 'Telco A', B: 'Telco B', unit: '₹ crore / month',
      rows: ['Hold tariff', 'Cut tariff'], cols: ['Hold tariff', 'Cut tariff'],
      pa: [[600, 200], [800, 350]], pb: [[600, 800], [200, 350]],
      story: 'Two telecom operators choose prepaid tariffs at the same time. Cutting steals subscribers if the rival holds, but if both cut, ARPU collapses.'
    },
    petrol: {
      name: 'Petrol pumps on one highway (3×3, IEDS)', A: 'Pump A', B: 'Pump B', unit: '₹ thousand / day',
      rows: ['Low price', 'Mid price', 'High price'], cols: ['Low price', 'Mid price', 'High price'],
      pa: [[40, 60, 70], [30, 50, 80], [20, 35, 60]], pb: [[40, 30, 20], [60, 50, 35], [70, 80, 60]],
      story: 'Session 2\'s two petrol stations. Use IEDS to see how a strategy that is never a best response is eliminated, and how that sets off a chain of further eliminations.'
    },
    advert: {
      name: 'FMCG advertising arms race', A: 'Brand A', B: 'Brand B', unit: '₹ crore profit',
      rows: ['Advertise heavily', 'Moderate spend'], cols: ['Advertise heavily', 'Moderate spend'],
      pa: [[400, 650], [300, 500]], pb: [[400, 300], [650, 500]],
      story: 'Two soft-drink brands decide on IPL-season ad budgets. Advertising mostly shifts share between them rather than growing the category.'
    },
    release: {
      name: 'Film release clash (anti-coordination)', A: 'Studio A', B: 'Studio B', unit: '₹ crore box office',
      rows: ['Release at Diwali', 'Release at Christmas'], cols: ['Release at Diwali', 'Release at Christmas'],
      pa: [[200, 500], [400, 150]], pb: [[200, 400], [500, 150]],
      story: 'Two big-budget films choose a festive weekend. Clashing splits screens. Each studio prefers Diwali, but only if the other film goes elsewhere.'
    },
    stag: {
      name: '5G tower sharing (Stag Hunt)', A: 'Operator A', B: 'Operator B', unit: '₹ crore NPV',
      rows: ['Share infrastructure', 'Build alone'], cols: ['Share infrastructure', 'Build alone'],
      pa: [[500, 0], [300, 300]], pb: [[500, 300], [0, 300]],
      story: 'A shared tower company pays off only if both commit. Building alone is safe but costly. Trust decides which equilibrium you get.'
    },
    boeing: {
      name: 'Boeing vs Airbus: re-engine or new design?', A: 'Boeing', B: 'Airbus', unit: '$ bn programme value',
      rows: ['Clean-sheet design', 'Re-engine old frame'], cols: ['Clean-sheet design', 'Re-engine old frame'],
      pa: [[50, 30], [80, 60]], pb: [[50, 80], [30, 60]],
      story: 'Session 7 case. Re-engining is faster to market, which makes it dominant on paper. The matrix leaves out the tail risk (safety) that later dominated Boeing\'s payoffs.'
    }
  };

  function analyse(st, activeR, activeC) {
    const R = st.rows.length, C = st.cols.length;
    const ar = activeR || [...Array(R).keys()], ac = activeC || [...Array(C).keys()];
    const brA = {}, brB = {};
    ac.forEach(j => { const m = Math.max(...ar.map(i => st.pa[i][j])); ar.forEach(i => { if (st.pa[i][j] === m) brA[i + ',' + j] = true; }); });
    ar.forEach(i => { const m = Math.max(...ac.map(j => st.pb[i][j])); ac.forEach(j => { if (st.pb[i][j] === m) brB[i + ',' + j] = true; }); });
    const ne = [];
    ar.forEach(i => ac.forEach(j => { if (brA[i + ',' + j] && brB[i + ',' + j]) ne.push([i, j]); }));
    const domRow = ar.find(s => ar.every(r => r === s || ac.every(j => st.pa[s][j] > st.pa[r][j])));
    const domCol = ac.find(s => ac.every(c => c === s || ar.every(i => st.pb[i][s] > st.pb[i][c])));
    // Pareto-optimal cells
    const cells = []; ar.forEach(i => ac.forEach(j => cells.push([i, j])));
    const pareto = cells.filter(([i, j]) => !cells.some(([k, l]) => st.pa[k][l] >= st.pa[i][j] && st.pb[k][l] >= st.pb[i][j] && (st.pa[k][l] > st.pa[i][j] || st.pb[k][l] > st.pb[i][j])));
    // Mixed NE for 2x2
    let mixed = null;
    if (R === 2 && C === 2) {
      const a = st.pa, b = st.pb;
      const dp = b[0][0] - b[1][0] - b[0][1] + b[1][1];
      const dq = a[0][0] - a[0][1] - a[1][0] + a[1][1];
      if (dp !== 0 && dq !== 0) {
        const p = (b[1][1] - b[1][0]) / dp; // prob row plays row0
        const q = (a[1][1] - a[0][1]) / dq; // prob col plays col0
        if (p > 0 && p < 1 && q > 0 && q < 1) {
          const ua = q * a[0][0] + (1 - q) * a[0][1];
          const ub = p * b[0][0] + (1 - p) * b[1][0];
          mixed = { p, q, ua, ub };
        }
      }
    }
    return { brA, brB, ne, domRow, domCol, pareto, mixed };
  }

  function classify(st, an) {
    if (st.rows.length !== 2 || st.cols.length !== 2) {
      if (an.ne.length === 1) return 'Unique pure-strategy Nash equilibrium. Check whether IEDS reaches it.';
      return `${an.ne.length} pure-strategy equilibria.`;
    }
    const neP = an.ne.map(([i, j]) => an.pareto.some(([k, l]) => k === i && l === j));
    if (an.domRow !== undefined && an.domCol !== undefined && an.ne.length === 1 && !neP[0]) return '<b>Prisoner\'s Dilemma.</b> Both players have a dominant strategy, but the resulting equilibrium is Pareto-dominated: individually rational, collectively worse.';
    if (an.domRow !== undefined && an.domCol !== undefined) return '<b>Dominance-solvable with no dilemma.</b> Each player has a dominant strategy and the equilibrium is efficient.';
    if (an.ne.length === 0) return '<b>No pure-strategy equilibrium</b> (a Matching Pennies structure). Players must randomise, so see the mixed equilibrium.';
    if (an.ne.length === 2) {
      const diag = an.ne.every(([i, j]) => i === j);
      if (diag) {
        const [x, y] = an.ne; const s1 = st.pa[x[0]][x[1]] + st.pb[x[0]][x[1]], s2 = st.pa[y[0]][y[1]] + st.pb[y[0]][y[1]];
        return s1 !== s2 ? '<b>Coordination game (Stag Hunt).</b> Two equilibria: one payoff-dominant (efficient but risky), one risk-dominant (safe). Trust and communication decide which one happens.' : '<b>Pure coordination game.</b> Two equilibria. Players just need to match.';
      }
      return '<b>Anti-coordination game (Chicken / Battle of the Sexes).</b> Two equilibria in which players do different things, and each prefers the one that favours them. Commitment and first-mover moves matter here.';
    }
    return 'Unique Nash equilibrium, reached by best-response reasoning (no dominant strategy for at least one player).';
  }

  function render(root) {
    let st = null, ieds = null, playLog = [], persona = 'rational';
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="lab">Matrix lab</button><button class="subtab" data-sub="play">Play vs AI rival</button><button class="subtab" data-sub="class">Classroom mode</button><button class="subtab" data-sub="classify">Classify the game (S2)</button></div>
      <div data-pane="classify" class="hide"><div class="card"><div class="panel-title">Session 2: what kind of game is it?</div><p class="muted" style="font-size:.9rem">For each situation, choose one option on each of the four dimensions, then check your answers. The four dimensions are independent: a game can be sequential and still have incomplete information.</p><div id="pw-cls" class="tbl-wrap"></div><div class="btn-row mt"><button class="btn primary" id="pw-cls-go">Check answers</button><button class="btn" id="pw-cls-reset">Clear</button></div><div id="pw-cls-out"></div></div></div>
      <div class="layout-2r" data-pane="lab play class">
        <div class="stack">
          <div class="card">
            <div class="field"><label>Scenario</label><select id="pw-preset">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join('')}</select></div>
            <p class="muted" id="pw-story" style="font-size:.92rem"></p>
            <div class="matrix-wrap"><table class="matrix" id="pw-matrix"></table></div>
            <p class="muted" style="font-size:.8rem;margin-top:8px"><span style="color:var(--p1);font-weight:700">Blue = row player</span> · <span style="color:var(--p2);font-weight:700">Red = column player</span> · Underlined = best response · Gold cell = Nash equilibrium · Payoffs are editable</p>
          </div>
          <div data-pane="play" class="card hide">
            <div class="panel-title">Play 6 rounds against an AI rival</div>
            <div class="field"><label>Rival persona</label><select id="pw-persona">
              <option value="rational">Textbook rational (plays its equilibrium / dominant strategy)</option>
              <option value="coop">Cooperative-minded (aims for the jointly best outcome)</option>
              <option value="tft">Mirror (copies your last move)</option>
              <option value="mystery">Mystery (hidden; reveals after 6 rounds)</option>
            </select></div>
            <p class="muted" style="font-size:.9rem">You are the <b style="color:var(--p1)">row player</b>. Both choose at the same time. Total profit counts.</p>
            <div class="btn-row" id="pw-moves"></div>
            <div class="kpis mt"><div class="kpi p1"><div class="k">Your total</div><div class="v" id="pw-you">0</div></div><div class="kpi p2"><div class="k">Rival total</div><div class="v" id="pw-rival">0</div></div><div class="kpi"><div class="k">Round</div><div class="v" id="pw-round">0/6</div></div></div>
            <div class="log mt" id="pw-log"></div>
            <button class="btn sm mt" id="pw-reset">New match</button>
          </div>
          <div data-pane="class" class="card hide">
            <div class="panel-title">Classroom mode: what did the class choose?</div>
            <p class="muted" style="font-size:.9rem">Split the class into row-firms and column-firms. Each writes a choice privately. Enter the counts below to compare behaviour with the Nash prediction.</p>
            <div id="pw-class-inputs"></div>
            <button class="btn primary sm" id="pw-class-go">Show results</button>
            <div id="pw-class-out" class="mt"></div>
          </div>
        </div>
        <div class="stack">
          <div class="card"><div class="panel-title">Solver</div>
            <label style="display:flex;gap:6px;align-items:center;font-weight:500"><input type="checkbox" id="pw-showbr" checked> Show best responses</label>
            <label style="display:flex;gap:6px;align-items:center;font-weight:500"><input type="checkbox" id="pw-showne" checked> Highlight Nash equilibria</label>
            <div id="pw-analysis" class="mt"></div>
          </div>
          <div class="card" data-pane="lab"><div class="panel-title">Iterated elimination (IEDS)</div>
            <p class="muted" style="font-size:.88rem">Remove strictly dominated strategies one step at a time.</p>
            <div class="btn-row"><button class="btn sm primary" id="pw-ieds">Next step</button><button class="btn sm" id="pw-ieds-reset">Reset</button></div>
            <div id="pw-ieds-log" class="mt" style="font-size:.88rem"></div>
          </div>
        </div>
      </div>`;

    GT.subtabs(root, sub => { if (sub === 'play') resetPlay(); });
    // the lab pane uses data-pane=lab on IEDS card; keep shared cards visible
    const preset = $('#pw-preset', root);

    function load(key) {
      const p = PRESETS[key];
      st = JSON.parse(JSON.stringify(p));
      ieds = { rows: [...Array(st.rows.length).keys()], cols: [...Array(st.cols.length).keys()], log: [] };
      $('#pw-story', root).textContent = p.story + ' Units: ' + p.unit + '.';
      drawMatrix(); drawAnalysis(); drawIeds(); resetPlay(); drawClassInputs();
    }

    function drawMatrix(highlight) {
      const an = analyse(st);
      const showBR = $('#pw-showbr', root).checked, showNE = $('#pw-showne', root).checked;
      let h = `<tr><th></th><th></th><th class="colhead" colspan="${st.cols.length}">${esc(st.B)}</th></tr><tr><th></th><th></th>${st.cols.map(c => `<th class="colhead">${esc(c)}</th>`).join('')}</tr>`;
      st.rows.forEach((r, i) => {
        h += `<tr>${i === 0 ? `<th class="rowhead" rowspan="${st.rows.length}" style="writing-mode:vertical-rl;transform:rotate(180deg)">${esc(st.A)}</th>` : ''}<th class="rowhead">${esc(r)}</th>`;
        st.cols.forEach((c, j) => {
          const k = i + ',' + j;
          const isNE = showNE && an.ne.some(([x, y]) => x === i && y === j);
          const dim = !ieds.rows.includes(i) || !ieds.cols.includes(j);
          const picked = highlight && highlight[0] === i && highlight[1] === j;
          h += `<td class="cell ${isNE ? 'ne' : ''} ${dim ? 'dim' : ''} ${picked ? 'picked' : ''}"><span class="pay">
            <input class="a ${showBR && an.brA[k] ? 'br' : ''}" data-i="${i}" data-j="${j}" data-w="a" type="number" value="${st.pa[i][j]}" style="${showBR && an.brA[k] ? 'text-decoration:underline;text-decoration-thickness:2px;font-weight:800' : ''}">
            <input class="b ${showBR && an.brB[k] ? 'br' : ''}" data-i="${i}" data-j="${j}" data-w="b" type="number" value="${st.pb[i][j]}" style="${showBR && an.brB[k] ? 'text-decoration:underline;text-decoration-thickness:2px;font-weight:800' : ''}">
          </span></td>`;
        });
        h += '</tr>';
      });
      const t = $('#pw-matrix', root); t.innerHTML = h;
      $$('input', t).forEach(inp => inp.addEventListener('change', () => {
        const v = parseFloat(inp.value) || 0; const i = +inp.dataset.i, j = +inp.dataset.j;
        if (inp.dataset.w === 'a') st.pa[i][j] = v; else st.pb[i][j] = v;
        ieds = { rows: [...Array(st.rows.length).keys()], cols: [...Array(st.cols.length).keys()], log: [] };
        drawMatrix(); drawAnalysis(); drawIeds();
      }));
    }

    function drawAnalysis() {
      const an = analyse(st);
      const nm = ([i, j]) => `(${esc(st.rows[i])}, ${esc(st.cols[j])}) → <span style="color:var(--p1)">${fmt(st.pa[i][j])}</span>, <span style="color:var(--p2)">${fmt(st.pb[i][j])}</span>`;
      let h = `<div class="note amber"><p>${classify(st, an)}</p></div>`;
      h += `<p style="margin:10px 0 4px"><b>Dominant strategy</b><br><span style="color:var(--p1)">${esc(st.A)}:</span> ${an.domRow !== undefined ? esc(st.rows[an.domRow]) : 'none'}<br><span style="color:var(--p2)">${esc(st.B)}:</span> ${an.domCol !== undefined ? esc(st.cols[an.domCol]) : 'none'}</p>`;
      h += `<p style="margin:10px 0 4px"><b>Pure-strategy Nash equilibria</b><br>${an.ne.length ? an.ne.map(nm).join('<br>') : 'None'}</p>`;
      if (an.mixed) h += `<p style="margin:10px 0 4px"><b>Mixed-strategy equilibrium</b><br>${esc(st.A)} plays “${esc(st.rows[0])}” with p = ${fmt(an.mixed.p, 2)}; ${esc(st.B)} plays “${esc(st.cols[0])}” with q = ${fmt(an.mixed.q, 2)}.<br><small>Expected payoffs: ${fmt(an.mixed.ua, 1)} and ${fmt(an.mixed.ub, 1)}</small></p>`;
      const ineff = an.ne.filter(c => !an.pareto.some(p => p[0] === c[0] && p[1] === c[1]));
      if (ineff.length) h += `<p class="muted" style="font-size:.88rem;margin-top:8px">${ineff.length === an.ne.length ? 'Every' : 'Some'} equilibrium is Pareto-inefficient: another cell makes both firms better off. Ask what stops them getting there (enforceability, trust, antitrust law).</p>`;
      $('#pw-analysis', root).innerHTML = h;
    }

    function stepIeds() {
      const R = ieds.rows, C = ieds.cols;
      for (const r of R) {
        const dom = R.find(s => s !== r && C.every(j => st.pa[s][j] > st.pa[r][j]));
        if (dom !== undefined) { ieds.rows = R.filter(x => x !== r); ieds.log.push(`<span style="color:var(--p1)">${esc(st.A)}</span>: “${esc(st.rows[r])}” is strictly dominated by “${esc(st.rows[dom])}”, so remove it.`); return true; }
      }
      for (const c of C) {
        const dom = C.find(s => s !== c && R.every(i => st.pb[i][s] > st.pb[i][c]));
        if (dom !== undefined) { ieds.cols = C.filter(x => x !== c); ieds.log.push(`<span style="color:var(--p2)">${esc(st.B)}</span>: “${esc(st.cols[c])}” is strictly dominated by “${esc(st.cols[dom])}”, so remove it.`); return true; }
      }
      return false;
    }
    function drawIeds() {
      const done = ieds.rows.length === 1 && ieds.cols.length === 1;
      let h = ieds.log.map((l, k) => `<div>${k + 1}. ${l}</div>`).join('');
      if (ieds.finished) h += done ? `<div class="note good"><p>Dominance-solvable. Prediction: (${esc(st.rows[ieds.rows[0]])}, ${esc(st.cols[ieds.cols[0]])}).</p></div>` : `<div class="note"><p>No more strictly dominated strategies. IEDS stops here; use Nash equilibrium on what is left.</p></div>`;
      $('#pw-ieds-log', root).innerHTML = h || '<span class="muted">No steps yet.</span>';
    }
    $('#pw-ieds', root).onclick = () => { if (!stepIeds()) ieds.finished = true; drawMatrix(); drawIeds(); };
    $('#pw-ieds-reset', root).onclick = () => { ieds = { rows: [...Array(st.rows.length).keys()], cols: [...Array(st.cols.length).keys()], log: [] }; drawMatrix(); drawIeds(); };
    $('#pw-showbr', root).onchange = () => drawMatrix();
    $('#pw-showne', root).onchange = () => drawMatrix();

    /* ---- play vs AI ---- */
    let totals = [0, 0], lastMine = null, hiddenPersona = null;
    function aiMove() {
      const an = analyse(st);
      const p = persona === 'mystery' ? hiddenPersona : persona;
      if (p === 'tft' && lastMine !== null) return Math.min(lastMine, st.cols.length - 1);
      if (p === 'coop') {
        let best = [0, 0], bv = -Infinity;
        st.rows.forEach((_, i) => st.cols.forEach((_, j) => { const v = st.pa[i][j] + st.pb[i][j]; if (v > bv) { bv = v; best = [i, j]; } }));
        return Math.random() < 0.8 ? best[1] : GT.randInt(0, st.cols.length - 1);
      }
      if (p === 'random') return GT.randInt(0, st.cols.length - 1);
      // rational: dominant, else NE column (random if multiple), else mixed
      if (an.domCol !== undefined) return an.domCol;
      if (an.ne.length) return GT.pick(an.ne)[1];
      if (an.mixed) return Math.random() < an.mixed.q ? 0 : 1;
      return GT.randInt(0, st.cols.length - 1);
    }
    function resetPlay() {
      totals = [0, 0]; playLog = []; lastMine = null; persona = $('#pw-persona', root).value;
      hiddenPersona = GT.pick(['rational', 'coop', 'tft', 'random']);
      $('#pw-moves', root).innerHTML = st.rows.map((r, i) => `<button class="btn p1" data-m="${i}">${esc(r)}</button>`).join('');
      $$('#pw-moves .btn', root).forEach(b => b.onclick = () => playRound(+b.dataset.m));
      paintPlay();
    }
    function playRound(i) {
      if (playLog.length >= 6) return;
      const j = aiMove();
      totals[0] += st.pa[i][j]; totals[1] += st.pb[i][j];
      playLog.push(`R${playLog.length + 1}: you <b style="color:var(--p1)">${esc(st.rows[i])}</b>, rival <b style="color:var(--p2)">${esc(st.cols[j])}</b> → ${fmt(st.pa[i][j])} / ${fmt(st.pb[i][j])}`);
      lastMine = i; drawMatrix([i, j]); paintPlay();
      if (playLog.length === 6) {
        const pName = { rational: 'Textbook rational', coop: 'Cooperative-minded', tft: 'Mirror (tit-for-tat)', random: 'Random' }[persona === 'mystery' ? hiddenPersona : persona];
        playLog.push(`<b>Match over.</b> Rival persona: ${pName}. You ${totals[0] > totals[1] ? 'out-earned' : totals[0] === totals[1] ? 'tied with' : 'earned less than'} the rival.`);
        GT.log('price-war', `${st.name}: you ${totals[0]} vs rival ${totals[1]} (${pName})`, { scenario: st.name, you: totals[0], rival: totals[1], persona: pName });
        paintPlay();
      }
    }
    function paintPlay() {
      $('#pw-you', root).textContent = fmt(totals[0]); $('#pw-rival', root).textContent = fmt(totals[1]);
      $('#pw-round', root).textContent = `${Math.min(playLog.length, 6)}/6`;
      $('#pw-log', root).innerHTML = playLog.map(l => `<div>${l}</div>`).join('') || '<div class="muted">Pick a strategy to play round 1.</div>';
      $$('#pw-moves .btn', root).forEach(b => b.disabled = playLog.length >= 6);
    }
    $('#pw-persona', root).onchange = resetPlay;
    $('#pw-reset', root).onclick = () => { resetPlay(); drawMatrix(); };

    /* ---- classroom ---- */
    function drawClassInputs() {
      $('#pw-class-inputs', root).innerHTML = `<div class="layout-even">
        <div><b style="color:var(--p1)">${esc(st.A)} choices</b>${st.rows.map((r, i) => `<div class="field-row" style="margin:6px 0"><span>${esc(r)}</span><input type="number" min="0" value="0" data-cr="${i}"></div>`).join('')}</div>
        <div><b style="color:var(--p2)">${esc(st.B)} choices</b>${st.cols.map((c, j) => `<div class="field-row" style="margin:6px 0"><span>${esc(c)}</span><input type="number" min="0" value="0" data-cc="${j}"></div>`).join('')}</div></div>`;
      $('#pw-class-out', root).innerHTML = '';
    }
    $('#pw-class-go', root).onclick = () => {
      const r = $$('[data-cr]', root).map(i => +i.value || 0), c = $$('[data-cc]', root).map(i => +i.value || 0);
      const nr = GT.sum(r) || 1, nc = GT.sum(c) || 1;
      const an = analyse(st);
      const neRows = new Set(an.ne.map(x => x[0])), neCols = new Set(an.ne.map(x => x[1]));
      const bars = st.rows.map((s, i) => ({ label: 'A: ' + s, value: r[i] / nr * 100, color: neRows.has(i) ? 'var(--amber)' : 'var(--p1)' }))
        .concat(st.cols.map((s, j) => ({ label: 'B: ' + s, value: c[j] / nc * 100, color: neCols.has(j) ? 'var(--amber)' : 'var(--p2)' })));
      const out = $('#pw-class-out', root);
      out.innerHTML = '<div id="pw-cchart"></div><p class="muted" style="font-size:.86rem">Gold bars = strategies used in a Nash equilibrium. Ask why the rest of the class did not play them (fairness, trust, misreading the payoffs?).</p>';
      GT.chart.bars($('#pw-cchart', out), { bars, yLabel: '% of class', yMax: 100, rotate: true, decimals: 0 });
      GT.log('price-war', `Classroom tally for ${st.name}`, { rows: r, cols: c });
    };


    /* ---- Session 2: classify the game ---- */
    const DIMS = [
      { k: 'coop', label: 'Agreements', opts: ['Non-cooperative', 'Cooperative'] },
      { k: 'time', label: 'Timing', opts: ['Simultaneous', 'Sequential'] },
      { k: 'pay', label: 'Info about payoffs/types', opts: ['Complete', 'Incomplete'] },
      { k: 'moves', label: 'Info about earlier moves', opts: ['Perfect', 'Imperfect'] }
    ];
    const CASES = [
      { t: 'Two petrol pumps on the same highway set the next day\'s price each evening. Neither sees the other\'s board until morning. Costs are similar and well known.', a: { coop: 0, time: 0, pay: 0, moves: 1 }, why: 'Moves are effectively simultaneous, so when a pump chooses it has not seen the rival\'s choice: imperfect information. Costs are known, so payoffs are complete.' },
      { t: 'Jio announces new tariffs. Airtel studies them for a week and then announces its own. Both know each other\'s cost structure.', a: { coop: 0, time: 1, pay: 0, moves: 0 }, why: 'Airtel moves after observing Jio, so it is sequential with perfect information, and costs are common knowledge.' },
      { t: 'A buyer on a used-car platform makes an offer. The seller knows the car\'s true condition; the buyer does not.', a: { coop: 0, time: 1, pay: 1, moves: 0 }, why: 'The buyer sees the listing before offering (sequential, perfect information about moves) but does not know the seller\'s type, which is incomplete information. That is the lemons problem.' },
      { t: 'Three telecom operators submit sealed bids for a spectrum block. Each knows only its own valuation.', a: { coop: 0, time: 0, pay: 1, moves: 1 }, why: 'Sealed bids are simultaneous, so imperfect information about moves. Valuations are private, so payoffs are incomplete.' },
      { t: 'Infosys, Wipro and a global partner have signed an enforceable consortium agreement and must now divide ₹800 crore of profit.', a: { coop: 1, time: null, pay: null, moves: null }, why: 'Binding, enforceable agreements make this a cooperative game. We analyse coalitions and allocations (Core, Shapley) rather than moves, so timing and information dimensions are not the focus.' },
      { t: 'OPEC+ members agree production quotas at a meeting, but no court can enforce them. Each month every member chooses its output without seeing the others\' figures until later.', a: { coop: 0, time: 0, pay: 0, moves: 1 }, why: 'The meeting looks cooperative, but quotas are not enforceable, so it is non-cooperative. Within each month outputs are chosen simultaneously, so imperfect information, even though the game repeats.' },
      { t: 'Maruti decides whether to build an EV platform. Tata Motors sees the decision and responds. Neither knows yet how large EV demand will be, but both face the same uncertainty.', a: { coop: 0, time: 1, pay: 0, moves: 0 }, why: 'Sequential with perfect information about moves. Shared uncertainty about demand is modelled as a move by Nature that both observe equally, not as private information, so payoffs are still complete.' }
    ];
    function drawCls() {
      $('#pw-cls', root).innerHTML = `<table class="data"><thead><tr><th style="min-width:260px">Situation</th>${DIMS.map(d => `<th>${d.label}</th>`).join('')}</tr></thead><tbody>${CASES.map((c, i) => `<tr><td style="font-size:.86rem">${i + 1}. ${esc(c.t)}</td>${DIMS.map(d => `<td><select data-c="${i}" data-d="${d.k}" style="min-width:130px"><option value="">–</option>${d.opts.map((o, k) => `<option value="${k}">${o}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table>`;
      $('#pw-cls-out', root).innerHTML = '';
    }
    $('#pw-cls-go', root).onclick = () => {
      let right = 0, total = 0; const rows = [];
      CASES.forEach((c, i) => {
        let ok = true;
        DIMS.forEach(d => {
          const sel = $(`select[data-c="${i}"][data-d="${d.k}"]`, root); const ans = c.a[d.k];
          if (ans === null) { sel.style.borderColor = ''; return; }
          total++; const hit = sel.value !== '' && +sel.value === ans; if (hit) right++; else ok = false;
          sel.style.borderColor = hit ? 'var(--good)' : 'var(--bad)';
        });
        rows.push(`<div style="margin:6px 0"><b>${i + 1}.</b> ${ok ? '<span class="pill good">correct</span>' : '<span class="pill bad">check</span>'} ${c.why}</div>`);
      });
      $('#pw-cls-out', root).innerHTML = `<div class="note"><p><b>${right} of ${total}</b> classifications correct. A green border marks a correct choice, red an incorrect one.</p></div><div style="font-size:.88rem">${rows.join('')}</div>`;
      GT.log('price-war', `Classification exercise: ${right}/${total}`, { right, total });
    };
    $('#pw-cls-reset', root).onclick = drawCls;
    drawCls();

    preset.onchange = () => load(preset.value);
    load('telecom');
  }

  GT.register({
    id: 'price-war', num: 1, icon: '⚔️', title: 'Price War Matrix Lab', modules: ['M1', 'M2'], sessions: '1–4, 7', time: '30–40 min',
    tagline: 'Payoff matrices for telecom tariffs, FMCG advertising, highway petrol pumps and Boeing vs Airbus. Edit the numbers and the solver marks best responses, dominated strategies and equilibria. Includes the Session 2 classification exercise.',
    problem: 'Two telecom companies must set prices at the same time without knowing each other\'s choice. How do we represent this formally, and what does it predict? Why do rivals end up in price wars even when cooperation would benefit everyone?',
    concepts: ['Normal form', 'Dominant strategy', 'IEDS', 'Nash equilibrium', 'Pareto efficiency'],
    render,
    guide: {
      objective: 'Learn to turn a business rivalry into a payoff matrix, solve it with dominance, IEDS and best responses, and recognise the four classic game families: Prisoner\'s Dilemma, coordination, anti-coordination and stag hunt.',
      players: '1 student vs AI, or the class split into row-firms and column-firms',
      modes: 'Matrix lab (solver) · Play vs AI (6 rounds) · Classroom tally',
      rules: `<ul><li>You are the <b style="color:var(--p1)">row player</b> (blue payoffs). The rival is the <b style="color:var(--p2)">column player</b> (red).</li><li>Both choose simultaneously and cannot sign binding contracts.</li><li>Each cell shows (your payoff, rival payoff) in the stated units.</li><li>In Play mode you face a rival with a hidden or chosen persona for 6 rounds. Total profit is your score.</li></ul>`,
      steps: [
        'Choose the <b>Telecom tariff war</b> scenario. Before looking at the solver, write down what you think each firm will do and why.',
        'Turn on <b>Show best responses</b>. For each rival choice, find your best reply (the underlined blue number). Do the same for the rival.',
        'Find the cell where both payoffs are underlined. That is the <b>Nash equilibrium</b>. Is it the cell that maximises joint profit?',
        'Switch to <b>Petrol pumps (3×3)</b> and click <b>Next step</b> under IEDS repeatedly. Note the order of elimination and why each step is justified.',
        'Edit the payoffs. Can you turn the telecom game into a coordination game? What business change (e.g. a regulator-imposed price floor) would those new numbers represent?',
        'Go to <b>Play vs AI rival</b> and play 6 rounds against the <b>Mystery</b> persona. Guess the persona before it is revealed.',
        'Open <b>Classify the game (S2)</b> and classify the seven situations on the four dimensions: cooperative or not, timing, information about payoffs, information about earlier moves.',
        'Record your results (they are logged automatically) and answer the debrief questions.'
      ],
      facilitator: [
        'Project the Telecom scenario. Ask for a show of hands: "Hold or cut?" Count the hands, then use the Classroom mode tally.',
        'Reveal best responses one player at a time to build the Nash logic visually (Session 4).',
        'Use Petrol pumps for Session 2/3 to demonstrate IEDS, then edit one payoff live to show how fragile dominance-solvability can be.',
        'Close with Boeing vs Airbus (Session 7): ask "What payoff is missing from this matrix?" (tail risk, regulatory trust, reputation).',
        'Timing: 5 min hook, 15 min solver walk-through, 10 min play, 10 min debrief.'
      ],
      variations: ['Ask teams to build a matrix from a news story (e.g. quick-commerce discounting by Blinkit vs Zepto) and defend each payoff number.', 'Introduce communication: let pairs talk before choosing, and compare cooperation rates (cheap talk).', 'Make the game sequential and preview Module 3: does moving first change anything?']
    },
    theory: `
      <h3 style="margin-top:0">1. Normal-form game</h3>
      <p>A normal (strategic) form game lists the <b>players</b>, each player's <b>strategies</b>, and a <b>payoff</b> for every combination of strategies. It fits situations where players move simultaneously, or without seeing each other's move.</p>
      <h3>2. Dominance</h3>
      <p>Strategy <i>s</i> <b>strictly dominates</b> <i>s'</i> if it gives a strictly higher payoff whatever the rival does. A rational player never plays a strictly dominated strategy. If every player has a dominant strategy, the outcome follows immediately.</p>
      <div class="formula">s strictly dominates s'  ⇔  u(s, t) > u(s', t)  for every rival strategy t</div>
      <h3>3. Iterated elimination (IEDS)</h3>
      <p>If rationality is <b>common knowledge</b>, players can remove dominated strategies, then remove strategies that become dominated in the reduced game, and so on. The order of elimination does not change the result for strict dominance. Each extra round needs one more level of "I know that you know that I am rational", so long chains are fragile in practice (see the Beauty Contest).</p>
      <h3>4. Nash equilibrium</h3>
      <p>A strategy profile is a Nash equilibrium if <b>each player's strategy is a best response to the others'</b>. Nobody regrets their choice once they see what the others did. In a matrix, find the cells where both payoffs are best responses (both underlined).</p>
      <div class="formula">(s*, t*) is a NE  ⇔  u₁(s*, t*) ≥ u₁(s, t*) ∀s  and  u₂(s*, t*) ≥ u₂(s*, t) ∀t</div>
      <h3>5. The four 2×2 families every manager should recognise</h3>
      <table class="data"><thead><tr><th>Family</th><th>Signature</th><th>Business example</th><th>Managerial lever</th></tr></thead><tbody>
        <tr><td>Prisoner's Dilemma</td><td>Dominant strategies lead to a Pareto-inferior NE</td><td>Price wars, ad wars, discounting</td><td>Repeated interaction, contracts, changing the payoffs (loyalty programmes, MFN clauses)</td></tr>
        <tr><td>Coordination / Stag Hunt</td><td>Two NE on the diagonal; one efficient, one safe</td><td>Infrastructure sharing, technology standards, UPI adoption</td><td>Communication, assurance, credible commitments</td></tr>
        <tr><td>Chicken / Battle of the Sexes</td><td>Two NE off the diagonal; conflict over which</td><td>Release dates, capacity entry, format wars</td><td>Move first, commit visibly (Module 3/5)</td></tr>
        <tr><td>Matching Pennies</td><td>No pure NE</td><td>Audits, promotions timing, penalty kicks</td><td>Randomise (Module 2, Session 6)</td></tr>
      </tbody></table>
      <h3>6. Mixed-strategy equilibrium (2×2)</h3>
      <p>Each player randomises so as to make the <b>other</b> player indifferent. In a 2×2 game the column player's equilibrium probability q of the first column solves:</p>
      <div class="formula">q·a₁₁ + (1−q)·a₁₂ = q·a₂₁ + (1−q)·a₂₂   (row player indifferent)</div>
      <h3>7. Limits</h3>
      <ul><li>Payoffs must include everything the players care about: fairness, reputation, tail risk. The Boeing preset shows what happens when the matrix leaves something out.</li><li>NE predicts <i>stable</i> outcomes, not necessarily the ones that will occur when several equilibria exist (the selection problem).</li></ul>`,
    practice: [
      { tag: 'India', title: 'Jio\'s 2016 entry and the tariff war', text: 'Jio launched with free voice and very cheap data. Incumbents had to cut, and data prices fell by over 90% within a couple of years. The industry consolidated (Vodafone and Idea merged in 2018) and several smaller operators exited. This is a PD with an entrant whose payoffs differed sharply from the incumbents\'.' },
      { tag: 'India', title: 'July 2024: three operators raise tariffs within days', text: 'Jio, Airtel and Vi announced prepaid hikes of roughly 10–25% within days of each other. With only three players, high market concentration and repeated interaction, the "Hold tariff" cell becomes reachable (see the OPEC repeated-game simulation).' },
      { tag: 'India', title: 'Quick-commerce discount wars', text: 'Blinkit, Zepto, Swiggy Instamart and new entrants keep offering free delivery and deep discounts. Each platform\'s best response to a rival\'s discount is to match it, which is the advertising-PD structure with cash burn standing in for ad spend.' },
      { tag: 'Global', title: 'Boeing 737 MAX vs Airbus A320neo', text: 'Airbus launched the re-engined A320neo in 2010. Boeing replied in 2011 with a re-engined 737 rather than a clean-sheet aircraft. On a speed-to-market matrix re-engining dominates, but the payoffs left out certification and safety risk (Session 7 case).' },
      { tag: 'Global', title: 'Coke vs Pepsi advertising', text: 'Cola advertising is often taught as a Prisoner\'s Dilemma: mutual spending largely cancels out. The 1971 US ban on TV cigarette advertising is a classic natural experiment in which regulation moved firms to the cooperative cell and industry profits rose.' },
      { tag: 'Frontier', title: 'Algorithmic pricing and tacit collusion', text: 'Calvano et al. (2020, <i>AER</i>) showed that reinforcement-learning pricing bots can learn to sustain supra-competitive prices without communicating. The US DOJ\'s 2024 case against RealPage alleged algorithm-assisted rent coordination. Who is "playing" the matrix when an AI sets the price?' }
    ],
    debrief: [
      'In the telecom PD, both firms understand that (Hold, Hold) is better. Why is it still not an equilibrium? What would need to change?',
      'Which strategy was eliminated first in the petrol pump game? What level of "common knowledge of rationality" does the full IEDS chain need?',
      'Edit the telecom matrix so that "Hold" becomes dominant. What real-world policy, contract or technology would produce those payoffs?',
      'In the film release clash, how could one studio "win" the coordination problem? (Hint: announcements, sunk marketing spend.)',
      'For Boeing vs Airbus: was re-engining truly dominant once safety risk is priced in? Rebuild the matrix with an expected-cost term for a catastrophic failure.',
      'Is the Prisoner\'s Dilemma good or bad for society? Distinguish the firms\' view from consumers\' and the regulator\'s.'
    ],
    aiPrompt: `I am an MBA student studying game theory. Here is a 2×2 payoff matrix I built for [describe industry, e.g. Indian quick-commerce discounting]:
Row firm strategies: [A1, A2]; Column firm strategies: [B1, B2]
Payoffs (row, column): (A1,B1)=(_,_), (A1,B2)=(_,_), (A2,B1)=(_,_), (A2,B2)=(_,_)

1. Identify dominant strategies, all pure Nash equilibria and any mixed equilibrium.
2. Classify the game (PD, coordination, chicken, stag hunt...).
3. Critique my payoffs: what real factors (regulation, reputation, capacity, investor pressure) are missing, and how would including them change the equilibrium?
4. Suggest two concrete managerial moves that would change the game itself rather than just playing it better.`
  });
})();
