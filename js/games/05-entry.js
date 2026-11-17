/* 05 — Market Entry & Commitment: extensive form, backward induction, SPNE, credible threats */
(function () {
  const { $, $$, fmt, esc } = GT;

  const L = (a, b, label) => ({ pay: [a, b], label });
  const D = (player, label, moves) => ({ player, label, moves });

  const SCEN = {
    entry: {
      name: 'Airline entry deterrence', players: ['New airline', 'Incumbent carrier'], unit: '₹ crore',
      story: 'A low-cost carrier is considering entering a trunk route dominated by one incumbent. The incumbent publicly threatens a fare war if it enters. Should the entrant believe the threat?',
      build: () => D(0, 'Entrant', [
        { a: 'Stay out', to: L(0, 100, 'Monopoly continues') },
        { a: 'Enter', to: D(1, 'Incumbent', [{ a: 'Fare war', to: L(-20, 20, 'Price war') }, { a: 'Accommodate', to: L(40, 50, 'Shared route') }]) }
      ])
    },
    capacity: {
      name: 'Capacity commitment (Dixit 1980)', players: ['Entrant', 'Incumbent'], unit: '₹ crore',
      story: 'Now the incumbent can first make an irreversible investment in extra capacity (fleet or slots). Excess capacity makes a fare war cheaper to fight, so the threat becomes credible. Is burning money worth it?',
      build: () => D(1, 'Incumbent', [
        { a: 'No extra capacity', to: D(0, 'Entrant', [{ a: 'Stay out', to: L(0, 100) }, { a: 'Enter', to: D(1, 'Incumbent', [{ a: 'Fight', to: L(-20, 20) }, { a: 'Accommodate', to: L(40, 50) }]) }]) },
        { a: 'Invest in capacity', to: D(0, 'Entrant', [{ a: 'Stay out', to: L(0, 80) }, { a: 'Enter', to: D(1, 'Incumbent', [{ a: 'Fight', to: L(-20, 35) }, { a: 'Accommodate', to: L(40, 30) }]) }]) }
      ])
    },
    jio: {
      name: 'Pre-emption: Reliance Jio\'s 4G bet', players: ['Jio', 'Incumbent telco'], unit: '₹ \'000 crore NPV (illustrative)',
      story: 'Jio can sink a very large investment in a nationwide 4G network now, or wait. If it waits, an incumbent may upgrade first and lock in customers. If it builds, the incumbent chooses whether to match prices.',
      build: () => D(0, 'Jio', [
        { a: 'Build nationwide 4G now', to: D(1, 'Incumbent', [{ a: 'Match prices', to: L(30, 20, 'Tariff war, Jio gains share') }, { a: 'Hold prices', to: L(60, -10, 'Mass migration to Jio') }]) },
        { a: 'Wait', to: D(1, 'Incumbent', [{ a: 'Upgrade first', to: L(-10, 60, 'Incumbent locks in data users') }, { a: 'Stay on 3G', to: L(10, 40, 'Slow evolution') }]) }
      ])
    },
    lawsuit: {
      name: 'Credible threats: the supplier lawsuit', players: ['Buyer firm', 'Supplier'], unit: '₹ crore',
      story: 'Session 13. A buyer threatens to sue a supplier unless it cuts prices, but suing is costly for the buyer too. The buyer can first hire a law firm on a contingency fee, which changes its own payoffs from suing.',
      build: () => D(0, 'Buyer', [
        { a: 'Normal retainer', to: D(1, 'Supplier', [{ a: 'Cut price', to: L(30, 50) }, { a: 'Refuse', to: D(0, 'Buyer', [{ a: 'Sue', to: L(-5, 20) }, { a: 'Back down', to: L(0, 80) }]) }]) },
        { a: 'Contingency-fee lawyer', to: D(1, 'Supplier', [{ a: 'Cut price', to: L(28, 50) }, { a: 'Refuse', to: D(0, 'Buyer', [{ a: 'Sue', to: L(5, 20) }, { a: 'Back down', to: L(-2, 80) }]) }]) }
      ])
    },
    maruti: {
      name: 'Maruti Suzuki & EVs under uncertainty', players: ['Maruti', 'Rival (Tata Motors)'], unit: '₹ \'000 crore NPV (illustrative)', chance: true,
      story: 'Session 11 case. Maruti can invest heavily in EVs early, or wait for demand to become clear. Nature decides whether EV demand turns out High or Low. Move the slider to find the probability at which committing early is better than keeping the option to wait.',
      build: (p) => D(0, 'Maruti', [
        { a: 'Invest early', to: D('N', 'Nature', [
          { a: 'EV demand high', prob: p, to: D(1, 'Rival', [{ a: 'Price war', to: L(40, 30) }, { a: 'Coexist', to: L(60, 50) }]) },
          { a: 'EV demand low', prob: 1 - p, to: L(-30, 10, 'Stranded EV capacity') }]) },
        { a: 'Wait and see', to: D('N', 'Nature', [
          { a: 'EV demand high', prob: p, to: D(0, 'Maruti', [{ a: 'Enter late', to: L(20, 70) }, { a: 'Stay with ICE/hybrid', to: L(0, 90) }]) },
          { a: 'EV demand low', prob: 1 - p, to: L(10, 20, 'ICE/hybrid profits preserved') }]) }
      ])
    }
  };

  /* ---- solver & layout ---- */
  function prep(root) {
    let id = 0; const nodes = [];
    (function walk(n, depth, parent) {
      n.id = id++; n.depth = depth; n.parent = parent; nodes.push(n);
      if (n.moves) n.moves.forEach(m => walk(m.to, depth + 1, n));
    })(root, 0, null);
    return nodes;
  }
  function solve(n, steps) {
    if (n.pay) { n.val = n.pay.slice(); return n.val; }
    const vals = n.moves.map(m => solve(m.to, steps));
    if (n.player === 'N') {
      n.val = [0, 1].map(k => GT.sum(n.moves.map((m, i) => (m.prob || 0) * vals[i][k])));
      n.best = null;
      steps.push({ n, text: `Nature at “${n.label}”: expected payoffs (${n.val.map(v => fmt(v, 1)).join(', ')}).` });
    } else {
      let bi = 0;
      vals.forEach((v, i) => { if (v[n.player] > vals[bi][n.player] + 1e-9) bi = i; });
      n.best = bi; n.val = vals[bi];
      steps.push({ n, text: `${esc(n.label)} compares ${n.moves.map((m, i) => `${esc(m.a)} (${fmt(vals[i][n.player], 1)})`).join(' vs ')} and chooses <b>${esc(n.moves[bi].a)}</b>.` });
    }
    return n.val;
  }
  function layout(root) {
    let leafY = 0; const LS = 58, DX = 190;
    (function walk(n) {
      if (n.pay) { n.y = leafY * LS + 30; leafY++; }
      else { n.moves.forEach(m => walk(m.to)); n.y = GT.mean(n.moves.map(m => m.to.y)); }
      n.x = 40 + n.depth * DX;
    })(root);
    return { h: leafY * LS + 20 };
  }

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="solve">Solve the tree</button><button class="subtab" data-sub="play">Play it</button></div>
      <div class="layout-2r">
        <div class="stack">
          <div class="card">
            <div class="field"><label>Scenario</label><select id="en-sc">${Object.entries(SCEN).map(([k, s]) => `<option value="${k}">${esc(s.name)}</option>`).join('')}</select></div>
            <p class="muted" id="en-story" style="font-size:.92rem"></p>
            <div id="en-pwrap" class="field" style="display:none"><div class="field-row"><label>Probability EV demand is high</label><span class="val" id="en-pv">0.40</span></div><input type="range" id="en-p" min="0" max="1" step="0.01" value="0.4"></div>
            <div style="overflow-x:auto"><div id="en-tree" style="min-width:640px"></div></div>
            <p class="muted" style="font-size:.8rem">Payoffs shown as (<span style="color:var(--p1);font-weight:700" id="en-p0"></span>, <span style="color:var(--p2);font-weight:700" id="en-p1"></span>). Gold edges = subgame-perfect choices. Dark path = what actually happened in Play mode.</p>
          </div>
        </div>
        <div class="stack">
          <div class="card" data-pane="solve">
            <div class="panel-title">Backward induction</div>
            <div class="btn-row"><button class="btn primary sm" id="en-step">Next step</button><button class="btn sm" id="en-all">Solve all</button><button class="btn sm ghost" id="en-clear">Reset</button></div>
            <div id="en-steps" class="mt" style="font-size:.9rem"></div>
          </div>
          <div class="card hide" data-pane="play">
            <div class="panel-title">Play against the AI</div>
            <div class="field"><label>Your role</label><select id="en-role"></select></div>
            <div class="field"><label>AI behaviour</label><select id="en-ai"><option value="spne">Rational (subgame perfect)</option><option value="vengeful">Vengeful (carries out threats 60% of the time)</option></select></div>
            <div id="en-play"></div>
            <button class="btn sm mt" id="en-restart">Restart</button>
          </div>
          <div class="card" data-fold="Edit payoffs"><div id="en-edit" class="scroll-y"></div></div>
        </div>
      </div>`;

    let key = 'entry', S, tree, nodes, steps, shown = 0, path = [], cur = null;
    GT.subtabs(root, sub => { if (sub === 'play') startPlay(); else { path = []; draw(); } });

    function build(keepPay) {
      S = SCEN[key];
      const p = +$('#en-p', root).value;
      const old = keepPay && nodes ? nodes.filter(n => n.pay).map(n => n.pay.slice()) : null;
      tree = S.build(p); nodes = prep(tree);
      if (old) nodes.filter(n => n.pay).forEach((n, i) => { if (old[i]) n.pay = old[i]; });
      steps = []; solve(tree, steps); layout(tree);
      $('#en-story', root).textContent = S.story + ' Units: ' + S.unit + '.';
      $('#en-pwrap', root).style.display = S.chance ? '' : 'none';
      $('#en-p0', root).textContent = S.players[0]; $('#en-p1', root).textContent = S.players[1];
      $('#en-role', root).innerHTML = S.players.map((p, i) => `<option value="${i}">${esc(p)}</option>`).join('');
    }

    function draw() {
      const { h } = layout(tree);
      const maxD = Math.max(...nodes.map(n => n.depth));
      const W = 40 + maxD * 190 + 170;
      const revealed = new Set(steps.slice(0, shown).map(s => s.n.id));
      const onPath = new Set(path);
      let s = `<svg class="tree-svg" viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">`;
      nodes.forEach(n => {
        if (!n.moves) return;
        n.moves.forEach((m, i) => {
          const c = m.to;
          const isBest = revealed.has(n.id) && n.best === i;
          const isPath = onPath.has(n.id) && onPath.has(c.id);
          const col = isPath ? 'var(--ink)' : isBest ? 'var(--amber)' : 'var(--line-2)';
          const sw = isPath ? 4 : isBest ? 4 : 1.6;
          s += `<line x1="${n.x}" y1="${n.y}" x2="${c.x}" y2="${c.y}" style="stroke:${col};stroke-width:${sw}"/>`;
          const mx = (n.x + c.x) / 2, my = (n.y + c.y) / 2;
          s += `<text x="${mx}" y="${my - 6}" text-anchor="middle" style="font-size:11.5px;font-weight:600;fill:var(--ink-2);paint-order:stroke;stroke:var(--surface);stroke-width:4px">${esc(m.a)}${m.prob !== undefined ? ` (${fmt(m.prob, 2)})` : ''}</text>`;
        });
      });
      nodes.forEach(n => {
        if (n.pay) {
          s += `<text x="${n.x + 8}" y="${n.y + 5}" style="font-family:var(--mono);font-size:13px;font-weight:700"><tspan style="fill:var(--p1)">${fmt(n.pay[0])}</tspan><tspan style="fill:var(--muted)">, </tspan><tspan style="fill:var(--p2)">${fmt(n.pay[1])}</tspan></text>`;
          if (n.label) s += `<text x="${n.x + 8}" y="${n.y + 19}" style="font-size:10px;fill:var(--muted)">${esc(n.label)}</text>`;
          s += `<circle cx="${n.x}" cy="${n.y}" r="3.5" style="fill:var(--ink-2)"/>`;
        } else {
          const col = n.player === 'N' ? 'var(--muted)' : n.player === 0 ? 'var(--p1)' : 'var(--p2)';
          s += `<circle cx="${n.x}" cy="${n.y}" r="13" style="fill:${col};stroke:var(--surface);stroke-width:2"/>`;
          s += `<text x="${n.x}" y="${n.y + 4}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:#fff">${n.player === 'N' ? 'N' : n.player + 1}</text>`;
          s += `<text x="${n.x}" y="${n.y - 19}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:${col}">${esc(n.label)}</text>`;
          if (revealed.has(n.id)) s += `<text x="${n.x}" y="${n.y + 30}" text-anchor="middle" style="font-family:var(--mono);font-size:10.5px;fill:var(--amber);font-weight:700">(${fmt(n.val[0], 1)}, ${fmt(n.val[1], 1)})</text>`;
        }
      });
      s += '</svg>';
      $('#en-tree', root).innerHTML = s;
      const st = steps.slice(0, shown).map((x, i) => `<div style="margin-bottom:6px">${i + 1}. ${x.text}</div>`).join('');
      let fin = '';
      if (shown >= steps.length) {
        const eqPath = []; let n = tree;
        while (n && !n.pay) { if (n.player === 'N') { eqPath.push('Nature moves'); break; } eqPath.push(`${esc(n.label)}: ${esc(n.moves[n.best].a)}`); n = n.moves[n.best].to; }
        fin = `<div class="note amber"><p><b>SPNE outcome.</b> ${eqPath.join(' → ')}. Payoffs (${fmt(tree.val[0], 1)}, ${fmt(tree.val[1], 1)}).</p>${insight()}</div>`;
      }
      $('#en-steps', root).innerHTML = st + fin || '<span class="muted">Start from the end of the tree: click Next step.</span>';
      drawEdit();
    }

    function insight() {
      if (key === 'entry') return '<p class="mb0" style="margin-top:6px">The fare-war threat is <b>not credible</b>: once the entrant is in, fighting (20) is worse for the incumbent than accommodating (50). A Nash equilibrium in which the entrant stays out because of the threat exists, but it is not subgame perfect.</p>';
      if (key === 'capacity') return '<p class="mb0" style="margin-top:6px">Investing lowers the incumbent\'s payoff in some branches, yet it <b>raises</b> its equilibrium payoff (80 vs 50) because it makes fighting credible. Commitment means deliberately limiting your own options.</p>';
      if (key === 'jio') return '<p class="mb0" style="margin-top:6px">Waiting is dominated once you anticipate the incumbent upgrading first. A large irreversible investment works both as <b>pre-emption</b> and as a <b>commitment</b>.</p>';
      if (key === 'lawsuit') return '<p class="mb0" style="margin-top:6px">With a normal retainer the threat to sue is empty, so the supplier refuses. The contingency-fee contract changes the buyer\'s <i>own</i> payoffs so that suing becomes rational. The supplier sees this and cuts its price. That is a strategic move.</p>';
      if (key === 'maruti') { const p = +$('#en-p', root).value; return `<p class="mb0" style="margin-top:6px">Investing early pays 90p − 30 and waiting pays 10 + 10p, so early commitment wins only if <b>p > 0.50</b> (now p = ${fmt(p, 2)}). Below that, the <b>option value of waiting</b> beats first-mover gains.</p>`; }
      return '';
    }

    function drawEdit() {
      const leaves = nodes.filter(n => n.pay);
      $('#en-edit', root).innerHTML = `<table class="data"><thead><tr><th>Path</th><th style="color:var(--p1)">${esc(S.players[0])}</th><th style="color:var(--p2)">${esc(S.players[1])}</th></tr></thead><tbody>${leaves.map((n, i) => {
        const pathTxt = []; let c = n;
        while (c.parent) { const m = c.parent.moves.find(m => m.to === c); pathTxt.unshift(m.a); c = c.parent; }
        return `<tr><td style="font-size:.8rem">${esc(pathTxt.join(' → '))}</td><td><input type="number" data-l="${i}" data-k="0" value="${n.pay[0]}" style="width:64px"></td><td><input type="number" data-l="${i}" data-k="1" value="${n.pay[1]}" style="width:64px"></td></tr>`;
      }).join('')}</tbody></table>`;
      $$('#en-edit input', root).forEach(inp => inp.onchange = () => {
        leaves[+inp.dataset.l].pay[+inp.dataset.k] = parseFloat(inp.value) || 0;
        steps = []; solve(tree, steps); if (shown) shown = steps.length; draw();
      });
    }

    /* ---- play ---- */
    function startPlay() { path = [tree.id]; cur = tree; advance(); }
    function advance() {
      const role = +$('#en-role', root).value, ai = $('#en-ai', root).value;
      let guard = 0;
      while (cur && !cur.pay && cur.player !== role && guard++ < 20) {
        let i;
        if (cur.player === 'N') { const r = Math.random(); let acc = 0; i = cur.moves.findIndex(m => (acc += m.prob) >= r); if (i < 0) i = cur.moves.length - 1; }
        else {
          i = cur.best;
          if (ai === 'vengeful' && /fight|war|sue/i.test(cur.moves.map(m => m.a).join(' ')) && Math.random() < 0.6) i = cur.moves.findIndex(m => /fight|war|sue/i.test(m.a));
        }
        cur = cur.moves[i].to; path.push(cur.id);
      }
      paintPlay(); draw();
    }
    function paintPlay() {
      const role = +$('#en-role', root).value;
      const box = $('#en-play', root);
      const trail = path.slice(1).map(id => { const n = nodes[id]; const m = n.parent.moves.find(m => m.to === n); return `${esc(n.parent.label)} → <b>${esc(m.a)}</b>`; }).join('<br>');
      if (cur.pay) {
        const eq = tree.val;
        box.innerHTML = `<div style="font-size:.9rem">${trail}</div><div class="note ${cur.pay[role] >= eq[role] ? 'good' : 'bad'}"><p>Outcome: <b style="color:var(--p1)">${fmt(cur.pay[0])}</b>, <b style="color:var(--p2)">${fmt(cur.pay[1])}</b>. You (${esc(S.players[role])}) earned <b>${fmt(cur.pay[role])}</b>; the SPNE ${S.chance ? 'expected ' : ''}payoff is ${fmt(eq[role], 1)}.</p></div>`;
        GT.log('entry', `${S.name} as ${S.players[role]}: earned ${cur.pay[role]} (SPNE ${fmt(eq[role], 1)})`, { scenario: key, role, path: path.slice(), pay: cur.pay });
        return;
      }
      box.innerHTML = `<div style="font-size:.9rem;margin-bottom:8px">${trail || '<span class="muted">You move first.</span>'}</div><p><b>Your move as ${esc(S.players[role])}:</b></p><div class="btn-row">${cur.moves.map((m, i) => `<button class="btn ${role === 0 ? 'p1' : 'p2'}" data-i="${i}">${esc(m.a)}</button>`).join('')}</div>`;
      $$('.btn', box).forEach(b => b.onclick = () => { cur = cur.moves[+b.dataset.i].to; path.push(cur.id); advance(); });
    }

    $('#en-sc', root).onchange = e => { key = e.target.value; shown = 0; path = []; build(false); draw(); if (!$('[data-pane=play]', root).classList.contains('hide')) startPlay(); };
    $('#en-p', root).oninput = e => { $('#en-pv', root).textContent = fmt(+e.target.value, 2); build(true); if (shown) shown = steps.length; draw(); };
    $('#en-step', root).onclick = () => { if (shown < steps.length) shown++; draw(); };
    $('#en-all', root).onclick = () => { shown = steps.length; draw(); };
    $('#en-clear', root).onclick = () => { shown = 0; draw(); };
    $('#en-role', root).onchange = startPlay; $('#en-ai', root).onchange = startPlay; $('#en-restart', root).onclick = startPlay;
    build(false); draw();
  }

  GT.register({
    id: 'entry', num: 5, icon: '🌳', title: 'Market Entry & Strategic Commitment', modules: ['M3', 'M5'], sessions: '8, 10, 11, 13', time: '40–50 min',
    tagline: 'Game trees for airline entry, Jio\'s 4G pre-emption, Maruti\'s EV bet and a supplier lawsuit. Separate credible threats from empty ones.',
    problem: 'A new airline wants to enter a market dominated by one large carrier, which threatens to slash fares. Should the entrant believe it? When does an irreversible investment (Jio\'s ₹1.5 lakh crore, Maruti\'s EV platform) make a threat or a strategy credible?',
    concepts: ['Extensive form', 'Backward induction', 'SPNE', 'Credible threats', 'Commitment', 'Option value'],
    render,
    guide: {
      objective: 'Draw and solve sequential games by backward induction, distinguish Nash from subgame-perfect equilibria, and see how commitment devices change outcomes.',
      players: '1 student vs AI (either role), or the class solving together on the projector',
      modes: 'Step-by-step solver · Play either role vs rational or vengeful AI · Editable payoffs',
      rules: `<ul><li>Players move in sequence and see earlier moves. Node colour shows whose turn it is (<span style="color:var(--p1)">blue</span> = player 1, <span style="color:var(--p2)">red</span> = player 2, grey = Nature/chance).</li><li>Payoffs at the leaves are (player 1, player 2).</li><li>In Play mode, choose a role and make decisions. The AI is either perfectly rational or "vengeful" (sometimes carries out threats that hurt itself).</li></ul>`,
      steps: [
        '<b>Airline entry:</b> before solving, decide whether you would enter. Then click <b>Next step</b> until it is solved. Is the fare-war threat credible?',
        'Find a Nash equilibrium that is <i>not</i> subgame perfect (hint: "Stay out; Fight if entry"). Why do we reject it?',
        'Switch to <b>Capacity commitment</b>. Solve it. Explain why spending on capacity that is never used still pays.',
        'Open <b>Jio pre-emption</b>. Change the "Wait → Upgrade first" payoff for Jio from −10 to +40. Does the decision flip?',
        'Open <b>Maruti EVs</b>. Move the probability slider and find the threshold p at which investing early becomes optimal.',
        'Open <b>Supplier lawsuit</b>. Identify the commitment device and explain why the buyer accepts a lower payoff in some branches.',
        'Use <b>Play it</b> as the entrant against the vengeful AI. Did entering still make sense on average?'
      ],
      facilitator: [
        'Session 8: draw the entry tree on the board, then project this tool and reveal backward induction step by step.',
        'Ask the class to vote "Enter / Stay out" first, then reveal the SPNE. Discuss reputation: what if the incumbent faces 20 entrants (the chain-store paradox)?',
        'Session 10 (Jio): use the pre-emption tree. Edit payoffs live with the class\'s estimates.',
        'Session 11 (Maruti case): students set the probability slider to their own estimate of EV adoption. Collect thresholds and discuss real options.',
        'Session 13: lawsuit tree. Ask for other commitment devices: burning bridges, contracts, reputation, delegation.',
        'Timing: 10 min per scenario; pick 3–4 for one session.'
      ],
      variations: ['Ask students to build a tree for a news story (e.g. a quick-commerce entrant vs an incumbent) by editing payoffs.', 'Chain-store paradox: discuss how a small probability of a "vengeful" incumbent (play the vengeful AI) can deter entry (Kreps–Wilson reputation).', 'Second-mover advantage: change payoffs so that waiting dominates (imitation is cheap).']
    },
    theory: `
      <h3 style="margin-top:0">Extensive form</h3>
      <p>A game tree shows <b>who moves when</b>, <b>what they know</b>, and the payoffs at each end point. A <b>strategy</b> is a complete plan: it says what a player would do at every node where it might be called on to move, including nodes that are never reached.</p>
      <h3>Backward induction</h3>
      <p>Start at the last decision nodes, choose the best action there, replace the node with the resulting payoff, and work back to the root. With perfect information and no ties, this gives a unique outcome.</p>
      <h3>Nash vs subgame-perfect equilibrium</h3>
      <p>In the entry game, (Stay out; Fight if entered) is a Nash equilibrium: given the threat, staying out is optimal, and the threat costs nothing because it is never tested. But it relies on a <b>non-credible threat</b>. Selten's (1965) <b>subgame perfection</b> requires strategies to be optimal in <i>every</i> subgame, including off-path ones, and so rules it out.</p>
      <div class="formula">SPNE = strategy profile that induces a Nash equilibrium in every subgame</div>
      <h3>Strategic moves and commitment (Schelling)</h3>
      <ul><li><b>Commitment:</b> an unconditional, irreversible first move (capacity, sunk investment, public announcements).</li><li><b>Threat:</b> "If you do X, I will hurt you (and maybe me)." It is credible only if carrying it out is in my interest when the time comes.</li><li><b>Promise:</b> "If you do Y, I will reward you." It is credible only if keeping it is in my interest.</li><li>Ways to make them credible: change your own payoffs (contracts, contingency fees), reduce your options (burn bridges), build reputation, delegate to an agent with different incentives.</li></ul>
      <h3>First-mover advantage and the value of waiting</h3>
      <p>Moving first helps when commitment shapes the rival's response (Stackelberg, pre-emption). Moving second helps when there is uncertainty (you learn before committing) or when imitation is cheap. The Maruti tree makes this trade-off explicit: early commitment is optimal only if the probability of high demand exceeds a threshold. Below it, the <b>option value of waiting</b> wins.</p>`,
    practice: [
      { tag: 'India', title: 'Reliance Jio (2016)', text: 'A very large up-front 4G investment before earning revenue. Sunk capacity made Jio\'s low pricing credible for years and pre-empted incumbents\' 4G migration. Within about three years it had become the largest operator by subscribers.' },
      { tag: 'India', title: 'IndiGo\'s mega aircraft orders', text: 'IndiGo placed some of the largest Airbus orders in aviation history (e.g. 500 A320neo-family aircraft in 2023). Locked-in delivery slots and capacity work as a visible commitment that discourages rivals from expanding into its routes.' },
      { tag: 'India', title: 'Maruti\'s cautious EV path', text: 'Maruti focused on hybrids and CNG while Tata Motors took an early EV lead. Maruti\'s first mass-market EV (e-Vitara) came later. This is the wait-and-learn branch of the tree in practice. Was the option value worth the lost share?' },
      { tag: 'Global', title: 'Kodak, Nokia, and failing to commit', text: 'Incumbents often rationally "wait" (the SPNE given their payoffs) because cannibalising a profitable core business looks costly. Disruption theory and game theory meet here.' },
      { tag: 'Global', title: 'Burning the boats', text: 'Cortés (1519) and Xiang Yu reportedly destroyed their own ships or cooking pots so retreat was impossible, which made fighting credible. In business: exclusive contracts, most-favoured-customer clauses and public price guarantees.' },
      { tag: 'Frontier', title: 'Delegating to AI agents as commitment', text: 'A firm that hard-codes an aggressive pricing algorithm, or a negotiation bot that cannot accept less than X, can make threats credible in a way a human manager cannot. Commitment by code is an active research area in AI and game theory.' }
    ],
    debrief: [
      'Why is "Fight if entry occurs" part of a Nash equilibrium but not of a subgame-perfect equilibrium?',
      'In the capacity game, the incumbent invests in capacity it never uses. Is that wasteful? For whom?',
      'What did Jio commit to, and why was the commitment credible to incumbents?',
      'What probability of high EV demand did you estimate for Maruti? How would a real-options view change your recommendation?',
      'List three ways a firm can make a threat credible, with an Indian business example for each.',
      'When is it better to move second? Give an example from technology or FMCG.'
    ],
    aiPrompt: `Help me model a sequential business game. Case: [e.g. a new quick-commerce entrant into a city dominated by an incumbent, or Maruti's EV decision].
1. Draw the game tree in text form (players, moves, order, information) with plausible illustrative payoffs and justify each number.
2. Solve it by backward induction and identify the SPNE.
3. Identify any non-credible threats or promises.
4. Propose one commitment device that would change the outcome, and show the modified tree.
5. Tell me which payoff assumptions the answer is most sensitive to.`
  });
})();
