/* 14 — Hidden Types: Bayesian games and Bayesian Nash equilibrium */
(function () {
  const { $, $$, fmt, esc } = GT;
  const ROUNDS = 12;

  const GAMES = {
    mb: {
      name: 'Matching Pennies or Bidding?', rows: ['1', '2'], cols: ['1', '2'], types: ['Matching Pennies', 'Bidding'], p: 0.5, P1: 'Player 1', P2: 'Player 2',
      story: 'Both players show 1 or 2. Player 2 knows which game is being played. Player 1 knows only the probability of each game.',
      t: [[[[1, 0], [0, 1]], [[0, 1], [1, 0]]], [[[0, 0], [0, 1]], [[1, 0], [0, 0]]]]
    },
    tinder: {
      name: 'Battle of the Sexes with an unknown partner', rows: ['Football', 'Movie'], cols: ['Football', 'Movie'], types: ['Wishes to meet', 'Wishes to avoid'], p: 0.75, P1: 'Player 1', P2: 'Player 2',
      story: 'Player 1 wants to meet Player 2, but does not know whether Player 2 wants to meet or to avoid Player 1.',
      t: [[[[2, 1], [0, 0]], [[0, 0], [1, 2]]], [[[2, 0], [0, 2]], [[0, 1], [1, 0]]]]
    },
    entry: {
      name: 'Market entry against an unknown incumbent', rows: ['Enter', 'Stay out'], cols: ['Fight', 'Accommodate'], types: ['Tough incumbent', 'Weak incumbent'], p: 0.4, P1: 'Entrant', P2: 'Incumbent',
      story: 'A tough incumbent gains from a price war, and a weak one loses from it. The entrant cannot tell which it faces. Units: ₹ crore.',
      insight: 'Entering pays 20 − 30p, so the entrant enters only if the chance of a tough incumbent is below 2/3.',
      t: [[[[-10, 30], [20, 10]], [[0, 50], [0, 50]]], [[[-10, -10], [20, 20]], [[0, 50], [0, 50]]]]
    }
  };

  function solve(G, p) {
    const S2 = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const cell = (i, s) => [0, 1].map(k => p * G.t[0][i][s[0]][k] + (1 - p) * G.t[1][i][s[1]][k]);
    const grid = G.rows.map((_, i) => S2.map(s => cell(i, s)));
    const bne = [];
    grid.forEach((r, i) => r.forEach((c, j) => {
      const rowBest = grid.every(o => o[j][0] <= c[0] + 1e-9), colBest = r.every(o => o[1] <= c[1] + 1e-9);
      if (rowBest && colBest) bne.push([i, j]);
    }));
    return { S2, grid, bne };
  }

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="solve">Find the equilibrium</button><button class="subtab" data-sub="play">Play it</button></div>
      <div class="card" style="margin-bottom:16px">
        <div class="panel-title">The game</div>
        <div class="layout-even" style="gap:14px"><div class="field" style="margin:0"><label>Example</label><select id="by-g">${Object.entries(GAMES).map(([k, g]) => `<option value="${k}">${esc(g.name)}</option>`).join('')}</select></div>
        <div class="field" style="margin:0"><div class="field-row"><label id="by-pl"></label><span class="val" id="by-pv"></span></div><input type="range" id="by-p" min="0" max="1" step="0.05"></div></div>
        <p class="muted" id="by-story" style="font-size:.92rem;margin:10px 0 0"></p>
      </div>
      <div class="layout-even" id="by-types" style="margin-bottom:16px"></div>
      <div data-pane="solve" class="card">
        <div class="panel-title">Converted to one normal-form game</div>
        <p class="muted" style="font-size:.9rem">Nature picks the type first. A strategy for the informed player says what each type does, so it has two parts: the first is for <span id="by-t1"></span>, the second for <span id="by-t2"></span>. Each cell is an expected payoff.</p>
        <div class="matrix-wrap"><table class="matrix" id="by-nf"></table></div>
        <div id="by-res"></div>
      </div>
      <div data-pane="play" class="card hide">
        <div class="panel-title">Round <span id="by-r">1</span> of ${ROUNDS}: you are <span id="by-me"></span></div>
        <p class="muted" style="font-size:.9rem">The computer knows its type and plays its equilibrium strategy. You see the type only after you choose.</p>
        <div class="btn-row" id="by-moves"></div>
        <div class="kpis mt"><div class="kpi p1"><div class="k">Your average</div><div class="v" id="by-avg">–</div></div><div class="kpi accent"><div class="k">Equilibrium expects</div><div class="v" id="by-eq">–</div></div></div>
        <div id="by-pmsg"></div><div class="log mt" id="by-log"></div>
        <button class="btn ghost sm mt" id="by-new">Restart</button>
      </div>`;
    GT.subtabs(root);
    let G, p, A, H = [];
    const stratName = s => `${G.cols[s[0]]} / ${G.cols[s[1]]}`;

    function miniMatrix(tp, idx) {
      return `<div class="card"><div class="panel-title">${esc(G.types[idx])} (probability ${fmt(idx === 0 ? p : 1 - p, 2)})</div><div class="matrix-wrap"><table class="matrix"><tr><th></th>${G.cols.map(c => `<th class="colhead">${esc(c)}</th>`).join('')}</tr>${G.rows.map((r, i) => `<tr><th class="rowhead">${esc(r)}</th>${G.cols.map((_, j) => `<td class="cell" style="min-width:84px;height:50px"><span class="pay"><span class="a">${tp[i][j][0]}</span><span class="b">${tp[i][j][1]}</span></span></td>`).join('')}</tr>`).join('')}</table></div></div>`;
    }
    function draw() {
      A = solve(G, p);
      $('#by-pv', root).textContent = fmt(p, 2);
      $('#by-types', root).innerHTML = G.t.map(miniMatrix).join('');
      $('#by-t1', root).textContent = G.types[0]; $('#by-t2', root).textContent = G.types[1];
      const isB = (i, j) => A.bne.some(b => b[0] === i && b[1] === j);
      $('#by-nf', root).innerHTML = `<tr><th></th>${A.S2.map(s => `<th class="colhead" style="font-size:.78rem">${esc(stratName(s))}</th>`).join('')}</tr>` + G.rows.map((r, i) => `<tr><th class="rowhead">${esc(r)}</th>${A.grid[i].map((c, j) => `<td class="cell ${isB(i, j) ? 'ne' : ''}" style="min-width:104px;height:52px"><span class="pay" style="font-size:.9rem"><span class="a">${fmt(c[0], 2)}</span><span class="b">${fmt(c[1], 2)}</span></span></td>`).join('')}</tr>`).join('');
      const list = A.bne.map(([i, j]) => `${G.P1} plays <b>${esc(G.rows[i])}</b>; ${G.P2} plays <b>${esc(stratName(A.S2[j]))}</b>`).join('<br>');
      $('#by-res', root).innerHTML = `<div class="note amber"><p><b>${A.bne.length ? `${A.bne.length} pure-strategy Bayesian Nash equilibri${A.bne.length === 1 ? 'um' : 'a'}.` : 'No pure-strategy Bayesian Nash equilibrium at this probability.'}</b></p><p>${list || 'Players would need to randomise.'}</p>${G.insight ? `<p>${G.insight}</p>` : ''}</div>`;
      resetPlay();
    }
    function resetPlay() {
      H = []; $('#by-me', root).textContent = G.P1; $('#by-pmsg', root).innerHTML = '';
      $('#by-moves', root).innerHTML = G.rows.map((r, i) => `<button class="btn p1" data-i="${i}">${esc(r)}</button>`).join('');
      $$('#by-moves .btn', root).forEach(b => b.onclick = () => round(+b.dataset.i));
      paintPlay();
    }
    function eqValue() { if (!A.bne.length) return null; const [i, j] = A.bne[0]; return A.grid[i][j][0]; }
    function paintPlay() {
      $('#by-r', root).textContent = Math.min(H.length + 1, ROUNDS);
      $('#by-avg', root).textContent = H.length ? fmt(GT.mean(H.map(h => h.u)), 2) : '–';
      const e = eqValue(); $('#by-eq', root).textContent = e === null ? '–' : fmt(e, 2);
      $$('#by-moves .btn', root).forEach(b => b.disabled = H.length >= ROUNDS);
      $('#by-log', root).innerHTML = H.map((h, k) => `<div>R${k + 1}: you chose ${esc(G.rows[h.i])}. Type was <b>${esc(G.types[h.ty])}</b>, which played ${esc(G.cols[h.a])}. You got ${h.u}.</div>`).reverse().join('') || '<div class="muted">Choose an action to begin.</div>';
    }
    function round(i) {
      if (H.length >= ROUNDS) return;
      const ty = Math.random() < p ? 0 : 1, strat = A.bne.length ? A.S2[A.bne[0][1]] : [GT.randInt(0, 1), GT.randInt(0, 1)], a = strat[ty];
      H.push({ i, ty, a, u: G.t[ty][i][a][0] }); paintPlay();
      if (H.length === ROUNDS) {
        const avg = GT.mean(H.map(h => h.u)), e = eqValue();
        $('#by-pmsg', root).innerHTML = `<div class="note"><p>Your average was <b>${fmt(avg, 2)}</b>${e === null ? '' : ` against an expected ${fmt(e, 2)} in equilibrium`}. Twelve rounds is a small sample, so luck in the type draws matters.</p></div>`;
        GT.log('bayesian', `${G.name} (p=${fmt(p, 2)}): average ${fmt(avg, 2)}`, { game: G.name, p, avg });
      }
    }
    function load(k) {
      G = GAMES[k]; p = G.p; $('#by-p', root).value = p;
      $('#by-pl', root).textContent = `Probability of “${G.types[0]}”`;
      $('#by-story', root).textContent = G.story;
      draw();
    }
    $('#by-g', root).onchange = e => load(e.target.value);
    $('#by-p', root).oninput = e => { p = +e.target.value; draw(); };
    $('#by-new', root).onclick = resetPlay;
    load('mb');
  }

  GT.register({
    id: 'bayesian', num: 14, icon: '', title: 'Hidden Types: Bayesian Games', modules: ['M6'], sessions: '14', time: '30–40 min',
    tagline: 'One player does not know which game is being played. Turn the uncertainty into a single matrix and find the Bayesian Nash equilibrium.',
    problem: 'Firms rarely know a rival\'s costs, and bargainers rarely know what the other side will accept. How do you choose a strategy when you are unsure of the other player\'s payoffs?',
    concepts: ['Incomplete information', 'Types', 'Beliefs', 'Nature', 'Bayesian Nash equilibrium'],
    render,
    guide: {
      objective: 'Represent incomplete information with types and a move by Nature, convert the game to normal form, and find its Bayesian Nash equilibria.',
      players: '1 student vs the computer, or pairs using the coin-toss version in class',
      modes: 'Equilibrium solver · 12-round play',
      rules: `<ul><li>Nature picks the type of Player 2 with a known probability.</li><li>Player 2 sees the type. Player 1 sees only the probability.</li><li>Player 2's strategy names an action for each type.</li><li>Payoffs in the converted matrix are expected payoffs.</li></ul>`,
      steps: [
        'Start with <b>Matching Pennies or Bidding</b>. Read the two matrices and the probability of each.',
        'Work out by hand the expected payoff for one cell of the converted matrix, then compare it with the table.',
        'Find the highlighted equilibrium. Why does Player 1 choose 2?',
        'Open the <b>Battle of the Sexes</b> example. How many equilibria are there at probability 0.75?',
        'Open <b>Market entry</b> and move the probability slider. Find where the entrant stops entering.',
        'Go to <b>Play it</b> and play 12 rounds. Compare your average with the equilibrium value.'
      ],
      facilitator: [
        'Pair students. Player 2 draws a random number from 1 to 100: 50 or below means Matching Pennies, above means Bidding. Player 1 is not told.',
        'Play several rounds and ask Player 1 what they believed about the game.',
        'Project the solver and build one cell of the converted matrix on the board.',
        'Discuss the entry example: which equilibrium relies on a weak incumbent fighting?',
        'Timing: 10 min pair play, 15 min conversion and solving, 10 min discussion.'
      ],
      variations: ['Ask students to change the belief and predict which equilibria survive before moving the slider.', 'Link to auctions: each bidder\'s value is its type.']
    },
    theory: `
      <h3 style="margin-top:0">Incomplete information</h3>
      <p>In a game of complete information everyone knows all players' payoffs. With <b>incomplete information</b>, at least one player is unsure of another's payoffs or preferences.</p>
      <h3>From incomplete to imperfect information</h3>
      <p>Harsanyi's approach adds a player called <b>Nature</b>, who picks each player's <b>type</b> using probabilities everyone knows. The informed player sees the draw and the other does not, so the game becomes one of imperfect information that standard tools can solve.</p>
      <h3>Strategies are plans for each type</h3>
      <p>If Player 2 has two types and two actions, it has 2 × 2 = 4 strategies. The strategy “1 / 2” means play 1 as the first type and 2 as the second.</p>
      <div class="formula">Expected payoff of (i, xy) = p · u(i, x | type 1) + (1 − p) · u(i, y | type 2)</div>
      <h3>Bayesian Nash equilibrium</h3>
      <p>A <b>Bayesian Nash equilibrium</b> is a strategy profile in which each type of each player maximises expected payoff, given the other player's strategy and its beliefs about types. In the converted matrix it is simply a Nash equilibrium.</p>
      <h3>Where it applies</h3>
      <p>Bargaining, auctions, market competition with unknown costs, signalling, and private contributions to public goods are all Bayesian games.</p>`,
    practice: [
      { tag: 'India', title: 'Entering a market with an unknown rival', text: 'A new quick-commerce or telecom entrant cannot observe how much cash an incumbent is prepared to burn. Its entry decision depends on its belief about the incumbent\'s type.' },
      { tag: 'India', title: 'Spectrum auctions', text: 'Each operator knows its own valuation but not its rivals\'. Bidding strategies are plans for each possible valuation, which is a Bayesian game (see Auction House).' },
      { tag: 'Global', title: 'Mergers and acquisitions', text: 'An acquirer does not know the lowest price the target would accept, and the target does not know how much the acquirer values the deal. Offers reflect beliefs about the other side\'s type.' },
      { tag: 'Global', title: 'Procurement with unknown supplier costs', text: 'Buyers design contracts without knowing each supplier\'s true cost. They choose terms that work across the range of types they think they may face.' },
      { tag: 'Recent research', title: 'AI agents with private information', text: 'Negotiation and pricing agents often hold data their counterparts lack. Modelling their counterparts\' possible types is the same exercise as in this game.' }
    ],
    debrief: [
      'What is the difference between incomplete and imperfect information?',
      'Why does Player 2 have four strategies when it has only two actions?',
      'Calculate one cell of the converted matrix by hand and explain each term.',
      'In the entry example, at what belief does the entrant stop entering, and why?',
      'Which equilibrium in the entry example depends on a weak incumbent fighting? Is that believable?',
      'Name a decision from your internship where you were unsure of the other party\'s type.'
    ],
    aiPrompt: `Here is a Bayesian game: Player 2 is one of two types with probability p and 1 − p. Payoff matrices for each type: [paste both].
1. List each player's pure strategies.
2. Convert the game to normal form with expected payoffs, showing the calculation for each cell.
3. Find every pure-strategy Bayesian Nash equilibrium.
4. Say how the answer changes as p moves from 0 to 1.
Show your working so I can check it against the Hidden Types simulation.`
  });
})();
