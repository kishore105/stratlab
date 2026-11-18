/* 13 — Rollback Lab: centipede game, Nim, converting trees to matrices, Nash vs subgame perfect */
(function () {
  const { $, $$, fmt, esc } = GT;
  const L = (a, b) => ({ pay: [a, b] });
  const D = (p, moves) => ({ p, moves });

  const TREES = {
    fourStage: {
      name: 'Two players, two stages each', players: ['Player 1', 'Player 2'],
      note: 'Player 1 must state a choice between G and H even when choosing A, because a strategy is a complete plan for every node.',
      build: () => D(0, [['A', D(1, [['C', L(3, 8)], ['D', L(8, 3)]])], ['B', D(1, [['E', L(5, 5)], ['F', D(0, [['G', L(2, 10)], ['H', L(1, 0)]])]])]])
    },
    entry: {
      name: 'Firm A and Firm B: enter or stay out', players: ['Firm A', 'Firm B'],
      note: 'Firm B\'s strategy has two letters: what it does if A enters (E = enter, D = stay out), then what it does if A stays out.',
      build: () => D(0, [['E', D(1, [['E', L(-10, -10)], ['D', L(50, 0)]])], ['D', D(1, [['E', L(0, 50)], ['D', L(0, 0)]])]])
    },
    split: {
      name: 'Split two coins: offer, then accept or reject', players: ['Proposer', 'Responder'],
      note: 'The responder gets 0 from rejecting and 0 from accepting the 2-0 offer, so it is indifferent there. That tie is why more than one subgame perfect equilibrium exists.',
      build: () => D(0, [['2-0', D(1, [['A', L(2, 0)], ['R', L(0, 0)]])], ['1-1', D(1, [['A', L(1, 1)], ['R', L(0, 0)]])], ['0-2', D(1, [['A', L(0, 2)], ['R', L(0, 0)]])]])
    }
  };

  /* ---- tree analysis ---- */
  function analyse(tree) {
    const nodes = [[], []];
    (function walk(n) { if (n.pay) return; n.idx = nodes[n.p].length; nodes[n.p].push(n); n.moves.forEach(m => walk(m[1])); })(tree);
    const product = list => list.reduce((acc, n) => acc.flatMap(a => n.moves.map((_, i) => a.concat(i))), [[]]);
    const S = [product(nodes[0]), product(nodes[1])];
    const label = (pl, s) => s.map((c, k) => nodes[pl][k].moves[c][0]).join(nodes[pl].some(n => n.moves[0][0].length > 1) ? ' ' : '');
    const value = (n, s1, s2) => { while (!n.pay) n = n.moves[(n.p === 0 ? s1 : s2)[n.idx]][1]; return n.pay; };
    const grid = S[0].map(a => S[1].map(b => value(tree, a, b)));
    const isNE = (i, j) => grid.every(r => r[j][0] <= grid[i][j][0] + 1e-9) && grid[i].every(c => c[1] <= grid[i][j][1] + 1e-9);
    const isSPNE = (i, j) => nodes.flat().every(n => {
      const here = value(n, S[0][i], S[1][j])[n.p];
      return n.moves.every(m => value(m[1], S[0][i], S[1][j])[n.p] <= here + 1e-9);
    });
    const ne = [], sp = [];
    S[0].forEach((_, i) => S[1].forEach((_, j) => { if (isNE(i, j)) ne.push([i, j]); if (isSPNE(i, j)) sp.push([i, j]); }));
    return { nodes, S, label, grid, ne, sp, value };
  }

  function layout(tree) {
    let y = 0, depthMax = 0;
    (function w(n, d) { n.d = d; depthMax = Math.max(depthMax, d); if (n.pay) { n.y = y++ * 46 + 28; } else { n.moves.forEach(m => w(m[1], d + 1)); n.y = GT.mean(n.moves.map(m => m[1].y)); } n.x = 34 + d * 130; })(tree, 0);
    return { h: y * 46 + 16, w: 34 + depthMax * 130 + 90 };
  }
  function treeSVG(tree, A) {
    const { h, w } = layout(tree), [si, sj] = A.sp[0] || [];
    let edges = '', dots = '';
    (function walk(n) {
      if (n.pay) { dots += `<text x="${n.x + 8}" y="${n.y + 5}" style="font-family:var(--mono);font-size:14px;font-weight:600"><tspan style="fill:var(--p1)">${n.pay[0]}</tspan><tspan style="fill:var(--muted)">, </tspan><tspan style="fill:var(--p2)">${n.pay[1]}</tspan></text>`; return; }
      const chosen = si === undefined ? -1 : (n.p === 0 ? A.S[0][si] : A.S[1][sj])[n.idx];
      n.moves.forEach((m, i) => {
        const c = m[1];
        if (i === chosen) edges += `<line x1="${n.x}" y1="${n.y}" x2="${c.x}" y2="${c.y}" style="stroke:var(--hl);stroke-width:10;stroke-linecap:round"/>`;
        edges += `<line x1="${n.x}" y1="${n.y}" x2="${c.x}" y2="${c.y}" style="stroke:var(--ink);stroke-width:${i === chosen ? 2 : 1}"/>`;
        edges += `<text x="${(n.x + c.x) / 2}" y="${(n.y + c.y) / 2 - 5}" text-anchor="middle" style="font-size:13px;font-weight:600;fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:4px">${esc(m[0])}</text>`;
        walk(c);
      });
      dots += `<rect x="${n.x - 12}" y="${n.y - 12}" width="24" height="24" style="fill:${n.p === 0 ? 'var(--p1)' : 'var(--p2)'}"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:#fff">${n.p + 1}</text>`;
    })(tree);
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w + 80}px;height:auto;display:block">${edges}${dots}</svg>`;
  }

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="cent">Centipede game</button><button class="subtab" data-sub="nim">Nim: take the last coin</button><button class="subtab" data-sub="conv">Tree to matrix</button></div>

      <div data-pane="cent" class="layout-2">
        <div class="card">
          <div class="panel-title">The pile grows each time someone passes</div>
          <p class="muted" style="font-size:.9rem">You move first. On your turn, take the pile and end the game, or pass and let it grow. If everyone passes to the end, nobody gets anything.</p>
          <div class="field"><label>Stages</label><select id="ce-n"><option value="4">4 stages</option><option value="6" selected>6 stages</option><option value="10">10 stages</option></select></div>
          <div class="field"><label>Opponent</label><select id="ce-ai"><option value="human">Typical person (passes early, takes late)</option><option value="rational">Strictly rational (always takes)</option></select></div>
          <div class="btn-row"><button class="btn primary" id="ce-take">Take the pile</button><button class="btn" id="ce-pass">Pass</button><button class="btn ghost" id="ce-new">New game</button></div>
        </div>
        <div class="card"><div class="kpis"><div class="kpi accent"><div class="k">Pile now</div><div class="v" id="ce-pile">1</div></div><div class="kpi p1"><div class="k">Your total</div><div class="v" id="ce-you">0</div></div><div class="kpi"><div class="k">Games played</div><div class="v" id="ce-g">0</div></div></div>
          <div id="ce-strip" class="mt"></div><div id="ce-msg"></div></div>
      </div>

      <div data-pane="nim" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Take turns removing coins</div>
          <div class="field"><label>Coins at the start</label><select id="ni-n"><option>15</option><option selected>21</option><option>30</option></select></div>
          <div class="field"><label>Most coins per turn</label><select id="ni-m"><option value="3" selected>3</option><option value="2">2</option></select></div>
          <div class="field"><label>Rule</label><select id="ni-r"><option value="last">Whoever takes the last coin wins</option><option value="lose">Whoever takes the last coin loses</option></select></div>
          <div class="btn-row" id="ni-moves"></div>
          <div class="btn-row mt"><button class="btn sm" id="ni-hint">Show the winning move</button><button class="btn ghost sm" id="ni-new">New game</button></div>
        </div>
        <div class="card"><div class="kpis"><div class="kpi accent"><div class="k">Coins left</div><div class="v" id="ni-left">21</div></div><div class="kpi p1"><div class="k">Your wins</div><div class="v" id="ni-w">0</div></div><div class="kpi p2"><div class="k">Computer's wins</div><div class="v" id="ni-l">0</div></div></div>
          <div id="ni-coins" class="mt" style="font-family:var(--mono);letter-spacing:3px;line-height:1.5;word-break:break-all"></div><div id="ni-msg"></div><div class="log mt" id="ni-log"></div></div>
      </div>

      <div data-pane="conv" class="hide">
        <div class="layout-even">
          <div class="card"><div class="panel-title">Game tree</div>
            <div class="field"><label>Example</label><select id="co2-s">${Object.entries(TREES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('')}</select></div>
            <div id="co2-tree" style="overflow-x:auto"></div>
            <p class="muted" style="font-size:.84rem;margin-top:8px">Highlighted branches show a subgame perfect equilibrium.</p></div>
          <div class="card"><div class="panel-title">Counting</div><div id="co2-count"></div><div id="co2-note"></div></div>
        </div>
        <div class="card mt"><div class="panel-title">The same game as a matrix</div><div class="matrix-wrap"><table class="matrix" id="co2-m"></table></div>
          <p class="muted" style="font-size:.84rem;margin-top:8px">Yellow cells are Nash equilibria. <b>SPNE</b> marks those that remain credible at every node.</p><div id="co2-res"></div></div>
      </div>`;
    GT.subtabs(root);

    /* ---- centipede ---- */
    let C, cg = 0, ct = 0;
    function ceNew() { C = { n: +$('#ce-n', root).value, t: 1, over: false }; $('#ce-msg', root).innerHTML = ''; cePaint(); }
    function cePaint() {
      $('#ce-pile', root).textContent = C.over ? '–' : C.t; $('#ce-you', root).textContent = ct; $('#ce-g', root).textContent = cg;
      $('#ce-take', root).disabled = $('#ce-pass', root).disabled = C.over;
      $('#ce-strip', root).innerHTML = `<div style="display:flex;gap:4px;flex-wrap:wrap">${Array.from({ length: C.n }, (_, i) => { const s = i + 1, mine = s % 2 === 1, now = s === C.t && !C.over; return `<div style="flex:1 0 42px;text-align:center;padding:6px 2px;border:1px solid ${now ? 'var(--ink)' : 'var(--line)'};background:${s < C.t ? 'var(--surface-2)' : now ? 'var(--hl-soft)' : 'var(--surface)'};font-family:var(--mono);font-size:.85rem;color:${mine ? 'var(--p1)' : 'var(--p2)'}"><b>₹${s}</b><br><small>${mine ? 'You' : 'Rival'}</small></div>`; }).join('')}</div>`;
    }
    function ceEnd(you, rival, how) {
      C.over = true; cg++; ct += you;
      $('#ce-msg', root).innerHTML = `<div class="note ${you > 1 ? 'good' : 'amber'}"><p><b>${how}</b> You get ₹${you}, the rival gets ₹${rival}. Rollback predicts that you take ₹1 at the very first move, because each player would take just before the other could. ${you > 1 ? 'You did better by trusting the rival to pass, which is what most people do in experiments.' : ''}</p></div>`;
      GT.log('rollback', `Centipede (${C.n} stages): you ₹${you}, rival ₹${rival}`, { stages: C.n, you, rival, ai: $('#ce-ai', root).value });
      cePaint();
    }
    $('#ce-take', root).onclick = () => ceEnd(C.t, 0, `You took the pile at stage ${C.t}.`);
    $('#ce-pass', root).onclick = () => {
      if (C.t >= C.n) return ceEnd(0, 0, 'Everyone passed to the end.');
      C.t++;
      const last = C.t >= C.n, pr = $('#ce-ai', root).value === 'rational' || last ? 1 : 0.12 + 0.75 * Math.pow(C.t / C.n, 2);
      if (Math.random() < pr) return ceEnd(0, C.t, `The rival took the pile at stage ${C.t}.`);
      C.t++; cePaint();
    };
    $('#ce-new', root).onclick = ceNew; $('#ce-n', root).onchange = ceNew; ceNew();

    /* ---- nim ---- */
    let N, wins = 0, losses = 0;
    const niTarget = () => N.rule === 'last' ? 0 : 1 % (N.m + 1);
    const niBest = n => { for (let k = 1; k <= Math.min(N.m, n); k++) if ((n - k) % (N.m + 1) === niTarget() && !(N.rule === 'lose' && k === n)) return k; return 0; };
    function niNew() { N = { n: +$('#ni-n', root).value, m: +$('#ni-m', root).value, rule: $('#ni-r', root).value, over: false, log: [] }; $('#ni-msg', root).innerHTML = niBest(N.n) ? '<div class="note"><p>You move first, and this start can be won with correct play.</p></div>' : '<div class="note amber"><p>You move first, but this start is a losing position against perfect play. You need the computer to slip, and it will not.</p></div>'; niPaint(); }
    function niPaint() {
      $('#ni-left', root).textContent = N.n; $('#ni-w', root).textContent = wins; $('#ni-l', root).textContent = losses;
      $('#ni-coins', root).textContent = '●'.repeat(N.n);
      $('#ni-moves', root).innerHTML = Array.from({ length: N.m }, (_, i) => `<button class="btn p1" data-k="${i + 1}" ${N.over || i + 1 > N.n ? 'disabled' : ''}>Take ${i + 1}</button>`).join('');
      $$('#ni-moves .btn', root).forEach(b => b.onclick = () => niMove(+b.dataset.k));
      $('#ni-log', root).innerHTML = N.log.map(l => `<div>${l}</div>`).reverse().join('') || '<div class="muted">No moves yet.</div>';
    }
    function niFinish(youTookLast) {
      const youWin = N.rule === 'last' ? youTookLast : !youTookLast;
      N.over = true; if (youWin) wins++; else losses++;
      const safe = N.rule === 'last' ? `multiples of ${N.m + 1}` : `one more than a multiple of ${N.m + 1}`;
      $('#ni-msg', root).innerHTML = `<div class="note ${youWin ? 'good' : 'bad'}"><p><b>${youWin ? 'You won.' : 'The computer won.'}</b> Working backwards, the positions to leave for your opponent are ${safe}. From any of them, whatever the opponent takes, you can return to the next one.</p></div>`;
      GT.log('rollback', `Nim (${N.rule === 'last' ? 'last coin wins' : 'last coin loses'}, max ${N.m}): ${youWin ? 'won' : 'lost'}`, { won: youWin });
      niPaint();
    }
    function niMove(k) {
      if (N.over) return;
      N.n -= k; N.log.push(`You took ${k}, leaving ${N.n}.`);
      if (N.n === 0) return niFinish(true);
      const best = niBest(N.n), c = best || GT.randInt(1, Math.min(N.m, N.n === 1 ? 1 : Math.min(N.m, Math.max(1, N.n - (N.rule === 'lose' ? 1 : 0)))));
      N.n -= c; N.log.push(`Computer took ${c}, leaving ${N.n}.`);
      if (N.n === 0) return niFinish(false);
      niPaint();
    }
    $('#ni-hint', root).onclick = () => { const b = niBest(N.n); GT.toast(N.over ? 'Start a new game' : b ? `Take ${b}, leaving ${N.n - b}` : 'No winning move here: you are in a losing position'); };
    ['#ni-n', '#ni-m', '#ni-r'].forEach(s => $(s, root).onchange = niNew); $('#ni-new', root).onclick = niNew; niNew();

    /* ---- tree to matrix ---- */
    function drawConv() {
      const T = TREES[$('#co2-s', root).value], tree = T.build(), A = analyse(tree);
      $('#co2-tree', root).innerHTML = treeSVG(tree, A);
      const nS = A.nodes[0].length + A.nodes[1].length;
      $('#co2-count', root).innerHTML = `<table class="data"><thead><tr><th></th><th style="color:var(--p1)">${esc(T.players[0])}</th><th style="color:var(--p2)">${esc(T.players[1])}</th></tr></thead><tbody>
        <tr><td>Information sets</td><td>${A.nodes[0].length}</td><td>${A.nodes[1].length}</td></tr>
        <tr><td>Pure strategies</td><td><b>${A.S[0].length}</b></td><td><b>${A.S[1].length}</b></td></tr>
        <tr><td>Subgames</td><td colspan="2">${nS}</td></tr></tbody></table>
        <p class="muted" style="font-size:.86rem;margin-top:8px">Pure strategies = the product of the number of actions at each of a player's information sets. With perfect information, every decision node starts a subgame.</p>`;
      $('#co2-note', root).innerHTML = `<div class="note"><p>${esc(T.note)}</p></div>`;
      const hit = (l, i, j) => l.some(x => x[0] === i && x[1] === j);
      let h = `<tr><th></th>${A.S[1].map(s => `<th class="colhead">${esc(A.label(1, s))}</th>`).join('')}</tr>`;
      A.S[0].forEach((s, i) => { h += `<tr><th class="rowhead">${esc(A.label(0, s))}</th>${A.S[1].map((_, j) => `<td class="cell ${hit(A.ne, i, j) ? 'ne' : ''}" style="min-width:74px;height:50px"><span class="pay" style="font-size:.88rem;gap:4px"><span class="a">${A.grid[i][j][0]}</span>,<span class="b">${A.grid[i][j][1]}</span></span>${hit(A.sp, i, j) ? '<br><small style="font-weight:700;color:#142033">SPNE</small>' : ''}</td>`).join('')}</tr>`; });
      $('#co2-m', root).innerHTML = h;
      const nameOf = ([i, j]) => `(${A.label(0, A.S[0][i])}, ${A.label(1, A.S[1][j])})`;
      const drop = A.ne.filter(x => !hit(A.sp, x[0], x[1]));
      $('#co2-res', root).innerHTML = `<div class="note amber"><p><b>${A.ne.length} pure-strategy Nash equilibri${A.ne.length === 1 ? 'um' : 'a'}, ${A.sp.length} subgame perfect.</b> SPNE: ${A.sp.map(nameOf).join(', ')}.${drop.length ? ` The other ${drop.length === 1 ? 'one relies' : drop.length + ' rely'} on a threat or promise that would not be carried out: ${drop.map(nameOf).join(', ')}.` : ''}</p></div>`;
    }
    $('#co2-s', root).onchange = drawConv; drawConv();
  }

  GT.register({
    id: 'rollback', num: 13, icon: '', title: 'Rollback Lab', modules: ['M3'], sessions: '8–9', time: '30–40 min',
    tagline: 'The centipede game, Nim, and a tool that converts any small game tree into its matrix and separates Nash equilibria from subgame perfect ones.',
    problem: 'Backward induction says the centipede game ends at the first move, yet most people pass. How do you solve a sequential game from the end, how many strategies does a player really have, and why are some Nash equilibria not believable?',
    concepts: ['Backward induction', 'Centipede game', 'Strategy vs plan', 'Information sets', 'Subgames', 'SPNE'],
    render,
    guide: {
      objective: 'Solve sequential games by rollback, count strategies and subgames, convert a tree into normal form, and see why subgame perfection removes non-credible threats.',
      players: '1 student vs the computer',
      modes: 'Centipede game · Nim · Tree-to-matrix converter',
      rules: `<ul><li><b>Centipede:</b> on your turn take the pile or pass. Passing adds to the pile, and the other player then decides.</li><li><b>Nim:</b> take 1 to 3 coins per turn from 21. Taking the last coin wins, unless you switch the rule.</li><li><b>Tree to matrix:</b> pick a tree and read its strategies, subgames, Nash equilibria and SPNE.</li></ul>`,
      steps: [
        'Play the <b>Centipede game</b> three times against the typical opponent. At which stage did you take the pile?',
        'Switch to the strictly rational opponent. What happens if you pass at the first move?',
        'Play <b>Nim</b> with 21 coins. Then use <b>Show the winning move</b> and work out the pattern.',
        'Open <b>Tree to matrix</b> and count the pure strategies for each player before reading the table.',
        'In the Firm A and Firm B example, find the three Nash equilibria. Which threat or promise makes each one work?',
        'Change the Nim rule so the last coin loses. How does the pattern shift?'
      ],
      facilitator: [
        'Open with a live centipede game between two students, using real coins if you can.',
        'Ask the class to solve the four-stage game from the end on the board, then compare with what the volunteers did.',
        'Play Nim against a volunteer and let the class spot the multiples of four.',
        'Use Tree to matrix to show why Player 1 needs a plan for a node that its own first move rules out.',
        'Timing: 10 min centipede, 10 min Nim, 15 min conversion and SPNE.'
      ],
      variations: ['Raise the stakes in the centipede game. Does the stage at which people take change?', 'Ask teams to draw their own tree for a business case and count strategies by hand.']
    },
    theory: `
      <h3 style="margin-top:0">Backward induction (rollback)</h3>
      <p>Start at the last decision, find the best action there, replace that node with its payoff, and repeat until you reach the first move. In finite games of perfect information this gives the subgame perfect outcome.</p>
      <h3>The centipede game</h3>
      <p>At the last stage the mover takes, since passing gives nothing. The player before knows this and takes one stage earlier, and the argument carries back to the first move. Rollback predicts the game ends at once with the smallest pile, even though both could earn far more by passing. In experiments, most people pass for several stages (McKelvey &amp; Palfrey 1992).</p>
      <h3>Strategies, information sets and subgames</h3>
      <p>A <b>pure strategy</b> is a complete plan that names an action at every information set of the player, including those that the plan itself makes unreachable. An <b>information set</b> groups nodes that a player cannot tell apart. With perfect information each node is its own set.</p>
      <div class="formula">Pure strategies of a player = product of (actions available) over that player's information sets</div>
      <p>A <b>subgame</b> starts at a single node and contains everything after it. It cannot cut across an information set.</p>
      <h3>Nash vs subgame perfect equilibrium</h3>
      <p>Nash equilibrium checks only the path that is played, so it can rest on threats that would never be carried out. A <b>subgame perfect equilibrium</b> must be a Nash equilibrium in every subgame. Every SPNE is a Nash equilibrium, but not every Nash equilibrium is subgame perfect.</p>
      <h3>Nim and determined games</h3>
      <p>Nim has no chance and no hidden information, so with correct play the winner is fixed from the start. If each turn removes 1 to m coins and the last coin wins, the losing positions are the multiples of m + 1. Zermelo's theorem extends this idea to games such as chess.</p>`,
    practice: [
      { tag: 'Global', title: 'Centipede in the laboratory', text: 'McKelvey and Palfrey (1992) found that very few players take the pile at the first opportunity. Palacios-Huerta and Volij (2009) reported that chess players stop much earlier, which suggests experience with backward reasoning matters.' },
      { tag: 'India', title: 'Supplier credit that grows over time', text: 'A supplier extends more credit to a buyer each time the last bill is paid. Either side could end the relationship by defaulting or cutting off credit. Trust builds in a pattern close to the centipede game, and risk is highest near the known end of a contract.' },
      { tag: 'Global', title: 'Chess and Zermelo\'s theorem', text: 'Chess is finite with perfect information, so in principle it has a determined result. It is too large to solve, which is a reminder that rollback has limits when the tree is huge.' },
      { tag: 'India', title: 'Contract negotiations with a fixed deadline', text: 'When the last round of talks is known, each party reasons back from that date. Concessions often arrive just before the deadline, for the same reason players take the pile near the end.' },
      { tag: 'Global', title: 'Commitment in project finance', text: 'Lenders release funds in stages. Each stage is a decision node, and the contract is written so that continuing remains the best choice at every stage. That is subgame perfection built into a contract.' }
    ],
    debrief: [
      'Roll back the four-stage centipede game on paper. What does each player get?',
      'Why do most people pass even though rollback says take? Is passing irrational?',
      'Why must a strategy say what you would do at a node that your own plan never reaches?',
      'In the Firm A and Firm B game, which Nash equilibria rest on threats that are not credible?',
      'What is the winning rule in Nim with 21 coins, and who wins with correct play?',
      'Give a business relationship that has the structure of a centipede game.'
    ],
    aiPrompt: `Here is a sequential game: [describe the players, the order of moves and the payoffs].
1. Draw the game tree in text form and solve it by backward induction, showing each step.
2. List each player's pure strategies and count the subgames.
3. Write the normal form, list every pure-strategy Nash equilibrium and say which are subgame perfect.
4. Explain which threats or promises are not credible.
Show your working so I can check it against the Rollback Lab.`
  });
})();
