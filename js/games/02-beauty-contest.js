/* 02 — Keynes' Beauty Contest: guess p × average */
(function () {
  const { $, $$, fmt, esc } = GT;

  function levelOf(g, p) {
    if (g <= 1) return 'Nash (≈0)';
    let best = 0, bd = Infinity;
    for (let k = 0; k <= 4; k++) { const d = Math.abs(g - 50 * Math.pow(p, k)); if (d < bd) { bd = d; best = k; } }
    return g > 100 * p ? 'Dominated (above 100p)' : 'Level-' + best;
  }

  function botsRound1(n, p) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let g;
      if (r < 0.2) g = GT.rand(0, 100);
      else if (r < 0.55) g = 50 * p + GT.normal() * 6;
      else if (r < 0.85) g = 50 * p * p + GT.normal() * 5;
      else if (r < 0.95) g = 50 * p * p * p + GT.normal() * 4;
      else g = GT.rand(0, 2);
      out.push(Math.round(GT.clamp(g, 0, 100) * 10) / 10);
    }
    return out;
  }
  function botsNext(n, prevTarget, p) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let g = r < 0.1 ? GT.rand(0, 100) * 0.6 : prevTarget * (r < 0.5 ? 1 : p) * GT.rand(0.85, 1.05) + GT.normal() * 2;
      out.push(Math.round(GT.clamp(g, 0, 100) * 10) / 10);
    }
    return out;
  }

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="solo">Play vs simulated class</button><button class="subtab" data-sub="class">Classroom mode</button></div>
      <div class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="panel-title">Settings</div>
            <div class="field"><label>Multiplier p (target = p × average)</label><select data-k="p"><option value="0.5">1/2</option><option value="0.6666666667" selected>2/3 (classic)</option><option value="0.75">3/4</option><option value="0.9">0.9</option></select></div>
            <div class="field"><div class="field-row"><label>Other players</label><span class="val" data-v="n"></span></div><input type="range" data-k="n" min="9" max="199" step="10" value="39"></div>
            <div class="field"><label>Aggregate</label><select data-k="agg"><option value="mean">Average (Keynes / Nagel)</option><option value="median">Median</option></select></div>
          </div>
          <div class="card" data-pane="solo">
            <div class="panel-title">Your guess · Round <span id="bc-round">1</span> of 5</div>
            <p class="muted" style="font-size:.9rem">Pick a number from 0 to 100. The winner is whoever comes closest to <b>p × the <span id="bc-aggname">average</span></b> of all guesses.</p>
            <div class="field"><div class="field-row"><label>Guess</label><span class="val" id="bc-gv">33</span></div><input type="range" id="bc-guess" min="0" max="100" step="1" value="33"></div>
            <div class="btn-row"><button class="btn primary" id="bc-submit">Submit guess</button><button class="btn" id="bc-reset">Restart</button></div>
          </div>
          <div class="card hide" data-pane="class">
            <div class="panel-title">Paste the class's guesses</div>
            <p class="muted" style="font-size:.88rem">Any separator works: commas, spaces or one per line (e.g. a column copied from Google Forms). Names are optional, written as <code>Name: 23</code>.</p>
            <textarea id="bc-paste" placeholder="Asha: 22&#10;Rohit: 33&#10;45, 18, 0, 27 ..."></textarea>
            <div class="btn-row mt"><button class="btn primary" id="bc-class-go">Compute winner</button><button class="btn sm" id="bc-demo">Fill demo data</button></div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="kpis">
              <div class="kpi"><div class="k" id="bc-k-agg">Average</div><div class="v" id="bc-mean">–</div></div>
              <div class="kpi accent"><div class="k">Target (p × agg)</div><div class="v" id="bc-target">–</div></div>
              <div class="kpi p1"><div class="k">Your guess</div><div class="v" id="bc-you">–</div></div>
              <div class="kpi"><div class="k">Your rank</div><div class="v" id="bc-rank">–</div></div>
            </div>
            <div id="bc-hist" class="mt"></div>
            <div id="bc-msg"></div>
          </div>
          <div class="layout-even">
            <div class="card"><div class="panel-title">Depth of reasoning (level-k)</div><div id="bc-levels"></div></div>
            <div class="card"><div class="panel-title">Convergence across rounds</div><div id="bc-trend"><p class="muted">Play several rounds to see the target fall towards the Nash equilibrium of 0.</p></div></div>
          </div>
        </div>
      </div>`;

    GT.subtabs(root);
    let rounds = [], params;
    const paint = GT.bindRanges(root, o => { params = o; $('#bc-aggname', root).textContent = o.agg === 'mean' ? 'average' : 'median'; }, { p: v => fmt(v, 2), n: v => v });
    params = paint();
    const guessEl = $('#bc-guess', root);
    guessEl.oninput = () => $('#bc-gv', root).textContent = guessEl.value;

    const agg = (arr, how) => { if (how === 'median') { const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; } return GT.mean(arr); };

    function show(guesses, you, labels) {
      const p = params.p, A = agg(guesses, params.agg), T = p * A;
      $('#bc-k-agg', root).textContent = params.agg === 'mean' ? 'Average' : 'Median';
      $('#bc-mean', root).textContent = fmt(A, 1); $('#bc-target', root).textContent = fmt(T, 1);
      const dists = guesses.map(g => Math.abs(g - T));
      const minD = Math.min(...dists);
      let rankTxt = '–';
      if (you !== null) {
        const yd = Math.abs(you - T);
        const rank = 1 + dists.filter(d => d < yd - 1e-9).length;
        rankTxt = `${rank} / ${guesses.length}`;
        $('#bc-you', root).textContent = fmt(you, 0);
      } else $('#bc-you', root).textContent = '–';
      $('#bc-rank', root).textContent = rankTxt;
      const hist = GT.histogram(guesses, 0, 100, 20);
      const bars = hist.map(b => ({ label: fmt(b.lo), value: b.value, color: (you !== null && you >= b.lo && (you < b.hi || (b.hi === 100 && you === 100))) ? 'var(--p1)' : 'var(--line-2)' }));
      GT.chart.bars($('#bc-hist', root), { bars, height: 220, yLabel: 'No. of guesses', xLabel: 'Guess (bins of 5)', vmarks: [{ pos: T / 5, label: 'Target ' + fmt(T, 1), color: 'var(--accent)' }, { pos: A / 5, label: 'Agg ' + fmt(A, 1), color: 'var(--amber)' }], showValues: false });
      // levels
      const counts = {};
      guesses.forEach(g => { const l = levelOf(g, p); counts[l] = (counts[l] || 0) + 1; });
      const order = ['Dominated (above 100p)', 'Level-0', 'Level-1', 'Level-2', 'Level-3', 'Level-4', 'Nash (≈0)'];
      $('#bc-levels', root).innerHTML = `<table class="data"><thead><tr><th>Type</th><th>Anchor</th><th>Share</th></tr></thead><tbody>${order.filter(o => counts[o]).map(o => {
        const k = o.startsWith('Level-') ? +o.slice(6) : null;
        return `<tr ${you !== null && levelOf(you, p) === o ? 'class="hl"' : ''}><td>${o}</td><td>${k !== null ? fmt(50 * Math.pow(p, k), 1) : o.startsWith('Nash') ? '0' : '> ' + fmt(100 * p, 1)}</td><td>${GT.pct(counts[o] / guesses.length)}</td></tr>`;
      }).join('')}</tbody></table><p class="muted" style="font-size:.82rem;margin-top:6px">Level-k: a level-0 player picks at random (mean 50); level-k best-responds to level-(k−1). Highlighted = your type.</p>`;
      let winners = [];
      guesses.forEach((g, i) => { if (Math.abs(dists[i] - minD) < 1e-9) winners.push(labels ? labels[i] : fmt(g, 1)); });
      return { A, T, winners, minD };
    }

    function drawTrend() {
      if (!rounds.length) return;
      GT.chart.line($('#bc-trend', root), {
        series: [{ name: 'Target', color: 'var(--accent)', points: rounds.map((r, i) => [i + 1, r.T]), dots: true }, { name: 'Your guess', color: 'var(--p1)', points: rounds.map((r, i) => [i + 1, r.you]), dots: true, dash: '5 4' }],
        xMin: 1, xMax: Math.max(5, rounds.length), yMin: 0, yMax: 60, xLabel: 'Round', yLabel: 'Value', height: 220, xTicks: 4,
        hlines: [{ y: 0, label: 'Nash = 0', color: 'var(--bad)' }]
      });
    }

    $('#bc-submit', root).onclick = () => {
      if (rounds.length >= 5) { GT.toast('Five rounds done. Click Restart.'); return; }
      const you = +guessEl.value, p = params.p, n = params.n;
      const bots = rounds.length === 0 ? botsRound1(n, p) : botsNext(n, rounds[rounds.length - 1].T, p);
      const all = bots.concat([you]);
      const labels = bots.map((_, i) => 'Player ' + (i + 1)).concat(['You']);
      const r = show(all, you, labels);
      const won = r.winners.includes('You');
      rounds.push({ T: r.T, you, A: r.A });
      $('#bc-msg', root).innerHTML = `<div class="note ${won ? 'good' : ''}"><p>${won ? '<b>You won this round.</b>' : `Winner: <b>${esc(r.winners.slice(0, 3).join(', '))}</b>, missing the target by ${fmt(r.minD, 2)}.`} Your guess was ${fmt(Math.abs(you - r.T), 1)} away. ${rounds.length === 1 ? 'Theory says everyone should guess 0. Did the simulated class?' : 'The target falls round by round as players respond to the last result.'}</p></div>`;
      $('#bc-round', root).textContent = Math.min(rounds.length + 1, 5);
      drawTrend();
      GT.log('beauty-contest', `Round ${rounds.length}: guessed ${you}, target ${fmt(r.T, 1)}${won ? ' (won)' : ''}`, { p, n, you, target: r.T, avg: r.A });
    };
    $('#bc-reset', root).onclick = () => { rounds = []; $('#bc-round', root).textContent = 1; $('#bc-msg', root).innerHTML = ''; $('#bc-trend', root).innerHTML = '<p class="muted">Play several rounds to see the target fall towards 0.</p>'; };

    $('#bc-demo', root).onclick = () => { $('#bc-paste', root).value = botsRound1(45, params.p).map((g, i) => `Student ${i + 1}: ${Math.round(g)}`).join('\n'); };
    $('#bc-class-go', root).onclick = () => {
      const lines = $('#bc-paste', root).value.split(/\n/).map(s => s.trim()).filter(Boolean);
      const guesses = [], labels = [];
      lines.forEach(l => {
        const m = l.match(/^(.*?)[:\-–]\s*(-?\d+(\.\d+)?)\s*$/);
        if (m && /[a-z]/i.test(m[1])) { guesses.push(GT.clamp(+m[2], 0, 100)); labels.push(m[1].trim()); }
        else GT.parseNums(l).forEach(v => { guesses.push(GT.clamp(v, 0, 100)); labels.push('Guess ' + (guesses.length)); });
      });
      if (guesses.length < 2) { GT.toast('Paste at least two guesses'); return; }
      const r = show(guesses, null, labels);
      $('#bc-msg', root).innerHTML = `<div class="note good"><p><b>Winner${r.winners.length > 1 ? 's' : ''}: ${esc(r.winners.join(', '))}</b> (distance ${fmt(r.minD, 2)}). ${guesses.length} guesses, ${GT.pct(guesses.filter(g => g > 100 * params.p).length / guesses.length)} chose a dominated number above ${fmt(100 * params.p, 0)}, and ${GT.pct(guesses.filter(g => g <= 1).length / guesses.length)} chose the Nash answer.</p></div>`;
      GT.log('beauty-contest', `Classroom: ${guesses.length} guesses, target ${fmt(r.T, 1)}`, { p: params.p, guesses });
    };
  }

  GT.register({
    id: 'beauty-contest', num: 2, icon: '🎯', title: 'Keynes\' Beauty Contest', modules: ['M2', 'M10'], sessions: '4', time: '20–30 min',
    tagline: 'Everyone picks a number from 0 to 100, and the closest to two-thirds of the average wins. Play against a simulated class, or paste in your own class\'s guesses.',
    problem: 'In financial markets you profit not by picking the "best" stock but by predicting what others will think is best, and what they think others will think. How many levels deep do people actually reason, and what does Nash equilibrium predict?',
    concepts: ['Nash equilibrium', 'Iterated dominance', 'Level-k reasoning', 'Common knowledge', 'Market bubbles'],
    render,
    guide: {
      objective: 'Experience the gap between equilibrium reasoning (everyone guesses 0) and actual behaviour (1–3 steps of reasoning), and connect it to herding in financial markets, IPO frenzies and bubbles.',
      players: '1 student vs a simulated class of 10–200, or the whole class live',
      modes: 'Solo vs simulated class (5 rounds) · Classroom paste-in',
      rules: `<ul><li>Every player picks a number from 0 to 100.</li><li>The target is <b>p × average</b> of all numbers (default p = ⅔).</li><li>The closest guess wins. Ties share the prize.</li><li>In solo mode, the bots use a teaching approximation of the reasoning levels found in experiments such as Nagel (1995): about 20% random, 35% one step, 30% two steps, 10% three steps, 5% Nash.</li></ul>`,
      steps: [
        'Before playing, write down your guess and your reasoning on paper.',
        'Submit the guess in round 1. Look at the histogram: where did most of the class cluster?',
        'Check the level-k table: which "type" were you? Was the winner a deep reasoner?',
        'Play rounds 2–5. Track how the target moves in the convergence chart.',
        'Change p to 0.9 and to 0.5 and replay. How quickly does play converge?',
        'Switch to the Median aggregate. Does it change the strategic logic?',
        'Answer: why is 0 the only Nash equilibrium, and why does guessing 0 almost never win round 1?'
      ],
      facilitator: [
        'Before revealing anything, ask every student to write a number on a slip or submit it through a Google Form / Mentimeter.',
        'Paste the responses into <b>Classroom mode</b> and project the histogram. Announce the winner (a small prize helps).',
        'Walk through the level-k table: "Who reasoned 50 → 33? 33 → 22?" Have students raise hands by level.',
        'Run a second round immediately. The class will fall towards 0, which is learning by iterated best response.',
        'Bridge to Keynes (1936, Ch. 12) and the stock market: "third degree" reasoning, momentum, meme stocks.',
        'Timing: 5 min collect, 10 min reveal and level-k, 5 min round 2, 10 min market discussion.'
      ],
      variations: ['Run it with p = 1.2 (target above average). The equilibrium moves to 100, a model of bubbles.', 'Let groups of 3 submit one guess together. Teams typically reason deeper than individuals.', 'Tell students the class includes "economics PhDs" and see if guesses drop (beliefs about others\' rationality).']
    },
    theory: `
      <h3 style="margin-top:0">Why 0 is the unique Nash equilibrium</h3>
      <p>The average can never exceed 100, so the target can never exceed p × 100 ≈ 66.7. Any guess above 66.7 is <b>weakly dominated</b>. If everyone knows this, the average is at most 66.7, so the target is at most 44.4, and so on. Repeating the argument forever leaves only <b>0</b>. Equivalently, if everyone guesses x, the target is p·x < x unless x = 0, so 0 is the only profile in which nobody wants to deviate.</p>
      <div class="formula">Iterated dominance: 100 → 66.7 → 44.4 → 29.6 → 19.8 → … → 0</div>
      <h3>Level-k thinking (Nagel 1995; Stahl & Wilson 1995)</h3>
      <p>Real players do not iterate forever. A <b>level-0</b> player picks naively (on average 50). A <b>level-1</b> player best-responds to level-0: ⅔·50 ≈ 33. Level-2 best-responds to level-1: ≈ 22. Most experiments find people at levels 1–2, so winning targets are usually between 13 and 25 in the first round.</p>
      <div class="formula">Level-k guess ≈ 50 × pᵏ    (p = ⅔: 50, 33.3, 22.2, 14.8, 9.9 …)</div>
      <h3>The key managerial insight</h3>
      <p>Being "right" about the equilibrium is not the same as winning. <b>The best strategy is to be one step ahead of the crowd, not infinitely ahead.</b> This is why you have to model rivals' actual sophistication, not assume they are perfectly rational.</p>
      <h3>Keynes (1936), <i>General Theory</i>, Ch. 12</h3>
      <p>Keynes compared professional investment to a newspaper beauty contest where you win by picking the faces other entrants will pick. Investors "devote [their] intelligences to anticipating what average opinion expects the average opinion to be."</p>
      <h3>Learning dynamics</h3>
      <p>In repeated play, guesses fall quickly towards 0. Rounds 2–5 here model each player best-responding to the previous round's target. This is an example of equilibrium being reached by <b>learning</b>, not by introspection.</p>`,
    practice: [
      { tag: 'Global', title: 'Financial Times contest (1997)', text: 'Richard Thaler ran the ⅔-average game with FT readers. The winning number was 13. That is two or three levels of reasoning, nowhere near the equilibrium of 0, even among a sophisticated readership.' },
      { tag: 'India', title: 'SME IPO frenzies and grey-market premiums', text: 'Subscription multiples of several hundred times on small IPOs reflect investors betting on listing-day demand from <i>other</i> investors rather than on fundamentals. This is a beauty contest about the beauty contest.' },
      { tag: 'Global', title: 'Meme stocks and crypto', text: 'GameStop (2021) and many tokens show prices driven by expectations of others\' expectations. A coordination point ("to the moon") can sustain prices until beliefs flip.' },
      { tag: 'India', title: 'Central bank forward guidance', text: 'RBI monetary policy communication tries to anchor "average opinion". If markets believe others believe inflation will fall, bond yields move before any policy change.' },
      { tag: 'Frontier', title: 'LLMs playing the beauty contest', text: 'Recent studies (2023–25) find large language models often guess in the level-1/2 range like humans, but adjust when told they face "rational AI opponents". Managers using AI agents need to model the AI\'s level of reasoning too.' }
    ],
    debrief: [
      'Prove in two sentences why no rational player guesses above 66.7.',
      'What was the winning number in your class? What does that imply about the average level of reasoning?',
      'If you know your rivals are level-1 thinkers, what is your optimal guess? Why is "0" a bad business strategy here?',
      'How does this game explain momentum and bubbles in equity markets?',
      'When does the equilibrium prediction become accurate? (Repetition, feedback, expertise, high stakes?)',
      'Relate this to pricing: when should a firm assume its rival is perfectly rational, and when should it not?'
    ],
    aiPrompt: `We played Keynes' beauty contest (guess p × average, p = 2/3) in class. The guesses were: [paste list].
1. Compute the target and winner.
2. Estimate the distribution of level-k reasoning in our class and compare it to Nagel (1995).
3. Explain how this connects to asset-price bubbles and to IPO grey-market behaviour in India.
4. Design a version of this game that would help a portfolio manager train against herding. Be explicit about what you are assuming about players' rationality.`
  });
})();
