/* 04 — Mixed strategies: GST audit inspection game & penalty kicks */
(function () {
  const { $, $$, fmt, esc } = GT;
  const ROUNDS = 30;

  function scenario(key, prm) {
    if (key === 'gst') {
      const { T, F, C } = prm;
      return {
        you: 'Tax authority', ai: 'Firm', rows: ['Audit', 'Don\'t audit'], cols: ['Comply', 'Evade'],
        U: [[T - C, T - C], [T, 0]], V: [[-T, -(T + F)], [-T, 0]], unit: '₹ lakh',
        youLabel: 'net revenue', aiLabel: 'firm payoff'
      };
    }
    return {
      you: 'Goalkeeper', ai: 'Penalty taker', rows: ['Dive to kicker\'s natural side', 'Dive to other side'], cols: ['Shoot natural side', 'Shoot other side'],
      U: [[41.7, 7.09], [5.03, 30.08]], V: [[58.3, 92.91], [94.97, 69.92]], unit: '% save probability',
      youLabel: 'save %', aiLabel: 'score %'
    };
  }
  function eq(S) {
    const { U, V } = S;
    const p = (V[1][1] - V[1][0]) / (V[0][0] - V[1][0] - V[0][1] + V[1][1]);
    const q = (U[1][1] - U[0][1]) / (U[0][0] - U[0][1] - U[1][0] + U[1][1]);
    const vu = q * U[0][0] + (1 - q) * U[0][1];
    const vv = p * V[0][0] + (1 - p) * V[1][0];
    return { p, q, vu, vv };
  }

  function render(root) {
    root.innerHTML = `
      <div class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="field"><label>Scenario</label><select id="mx-sc"><option value="gst">GST audit (you are the tax authority)</option><option value="pk">Penalty shoot-out (you are the goalkeeper)</option></select></div>
            <div id="mx-gst">
              <div class="field"><div class="field-row"><label>Tax due T</label><span class="val" data-v="T"></span></div><input type="range" data-k="T" min="20" max="300" step="10" value="100"></div>
              <div class="field"><div class="field-row"><label>Penalty if caught F</label><span class="val" data-v="F"></span></div><input type="range" data-k="F" min="0" max="500" step="10" value="150"></div>
              <div class="field"><div class="field-row"><label>Cost per audit C</label><span class="val" data-v="C"></span></div><input type="range" data-k="C" min="5" max="150" step="5" value="30"></div>
            </div>
            <p class="muted" id="mx-pkinfo" style="font-size:.86rem;display:none">Scoring rates from 1,417 professional penalty kicks (Palacios-Huerta 2003). "Natural side" is the side that is easier for the kicker's stronger foot.</p>
          </div>
          <div class="card">
            <div class="panel-title">Your move · Round <span id="mx-r">1</span>/${ROUNDS}</div>
            <p class="muted" style="font-size:.88rem">The AI <span id="mx-ainame"></span> watches your history and looks for patterns. Being predictable gets punished.</p>
            <div class="btn-row" id="mx-moves"></div>
            <hr style="margin:14px 0">
            <div class="field"><div class="field-row"><label>Or auto-play 10 rounds, choosing "<span id="mx-r0"></span>" with probability</label><span class="val" id="mx-autov">50%</span></div><input type="range" id="mx-auto" min="0" max="100" step="1" value="50"></div>
            <div class="btn-row"><button class="btn sm" id="mx-autogo">Auto-play 10</button><button class="btn sm" id="mx-eqset">Set to equilibrium</button><button class="btn sm ghost" id="mx-reset">Restart</button></div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="matrix-wrap"><table class="matrix" id="mx-matrix"></table></div>
            <div id="mx-eq" class="mt"></div>
          </div>
          <div class="card">
            <div class="kpis">
              <div class="kpi p1"><div class="k">Your avg <span id="mx-ul"></span></div><div class="v" id="mx-avg">–</div></div>
              <div class="kpi accent"><div class="k">Equilibrium value</div><div class="v" id="mx-eqv">–</div></div>
              <div class="kpi"><div class="k">Your freq. of row 1</div><div class="v" id="mx-freq">–</div></div>
              <div class="kpi p2"><div class="k">AI exploited you</div><div class="v" id="mx-expl">–</div></div>
            </div>
            <div id="mx-chart" class="mt"></div>
            <div id="mx-msg"></div>
          </div>
          <div class="card" id="mx-cs-card"><div class="panel-title">Comparative statics: what happens if the penalty rises?</div><div id="mx-cs"></div></div>
        </div>
      </div>`;

    let key = 'gst', prm, S, E, hist = [];
    const paint = GT.bindRanges(root, o => { prm = o; setup(false); });
    prm = paint();

    function setup(resetHist = true) {
      S = scenario(key, prm); E = eq(S);
      if (resetHist) hist = [];
      $('#mx-gst', root).style.display = key === 'gst' ? '' : 'none';
      $('#mx-pkinfo', root).style.display = key === 'gst' ? 'none' : '';
      $('#mx-cs-card', root).style.display = key === 'gst' ? '' : 'none';
      $('#mx-ainame', root).textContent = S.ai.toLowerCase();
      $('#mx-r0', root).textContent = S.rows[0];
      $('#mx-ul', root).textContent = S.youLabel;
      $('#mx-moves', root).innerHTML = S.rows.map((r, i) => `<button class="btn p1" data-m="${i}">${esc(r)}</button>`).join('');
      $$('#mx-moves .btn', root).forEach(b => b.onclick = () => play(+b.dataset.m));
      drawMatrix(); drawEq(); drawStats(); drawCS();
    }

    function drawMatrix(last) {
      let h = `<tr><th></th><th class="colhead" colspan="2">${esc(S.ai)} (AI)</th></tr><tr><th></th>${S.cols.map(c => `<th class="colhead">${esc(c)}</th>`).join('')}</tr>`;
      S.rows.forEach((r, i) => {
        h += `<tr><th class="rowhead">${esc(r)}</th>${S.cols.map((c, j) => `<td class="cell ${last && last.i === i && last.j === j ? 'picked' : ''}"><span class="pay"><span class="a">${fmt(S.U[i][j], key === 'pk' ? 1 : 0)}</span><span class="b">${fmt(S.V[i][j], key === 'pk' ? 1 : 0)}</span></span></td>`).join('')}</tr>`;
      });
      $('#mx-matrix', root).innerHTML = h;
    }

    function drawEq() {
      const valid = E.p > 0 && E.p < 1 && E.q > 0 && E.q < 1;
      $('#mx-eq', root).innerHTML = valid ? `<div class="note amber"><p><b>Mixed-strategy Nash equilibrium.</b> You choose “${esc(S.rows[0])}” with probability <b>${GT.pct(E.p, 1)}</b>, which makes the ${esc(S.ai.toLowerCase())} indifferent. The ${esc(S.ai.toLowerCase())} chooses “${esc(S.cols[0])}” with probability <b>${GT.pct(E.q, 1)}</b>, which makes you indifferent. Your expected ${S.youLabel}: <b>${fmt(E.vu, 1)}</b>.</p>${key === 'gst' ? `<p class="mb0" style="margin-top:6px">Closed form: audit rate = T/(T+F) = ${GT.pct(prm.T / (prm.T + prm.F), 1)}; evasion rate = C/T = ${GT.pct(prm.C / prm.T, 1)}. The penalty F does not appear in the evasion rate.</p>` : `<p class="mb0" style="margin-top:6px">In Palacios-Huerta's data, observed frequencies for both kickers and goalkeepers were within about 1–2 percentage points of this predicted mix.</p>`}</div>` : `<div class="note bad"><p>With these parameters there is no fully mixed equilibrium (one side has a dominant strategy). Try a different penalty or audit cost.</p></div>`;
    }

    function predictYou() {
      const n = hist.length;
      if (n < 2) return 0.5;
      const recent = hist.slice(-8);
      const freq = (recent.filter(h => h.i === 0).length + 1) / (recent.length + 2);
      const lastI = hist[n - 1].i;
      let follow = 0, tot = 0;
      for (let k = 1; k < n; k++) if (hist[k - 1].i === lastI) { tot++; if (hist[k].i === 0) follow++; }
      const cond = (follow + 1) / (tot + 2);
      const w = Math.min(0.6, tot / 10);
      return (1 - w) * freq + w * cond;
    }
    function aiMove() {
      const pr = predictYou();
      const ev = [0, 1].map(j => pr * S.V[0][j] + (1 - pr) * S.V[1][j]);
      const range = Math.max(...S.V.flat()) - Math.min(...S.V.flat());
      const gap = Math.abs(ev[0] - ev[1]) / (range || 1);
      if (gap < 0.04) return { j: Math.random() < E.q ? 0 : 1, exploit: false };
      const best = ev[0] > ev[1] ? 0 : 1;
      return { j: Math.random() < 0.85 ? best : 1 - best, exploit: true };
    }
    function play(i) {
      if (hist.length >= ROUNDS) return;
      const m = aiMove();
      hist.push({ i, j: m.j, u: S.U[i][m.j], v: S.V[i][m.j], exploit: m.exploit });
      drawMatrix({ i, j: m.j }); drawStats();
      if (hist.length === ROUNDS) finish();
    }
    function finish() {
      const avg = GT.mean(hist.map(h => h.u)), f = hist.filter(h => h.i === 0).length / hist.length;
      const ok = avg >= E.vu - Math.abs(E.vu) * 0.05;
      $('#mx-msg', root).innerHTML = `<div class="note ${ok ? 'good' : 'bad'}"><p><b>${ok ? 'Well mixed.' : 'You were exploited.'}</b> Average ${S.youLabel}: ${fmt(avg, 1)} vs equilibrium ${fmt(E.vu, 1)}. You chose “${esc(S.rows[0])}” ${GT.pct(f)} of the time (equilibrium ${GT.pct(E.p)}). ${ok ? 'An unpredictable, correctly weighted mix cannot be exploited.' : 'The AI detected a bias or pattern in your play and best-responded to it.'}</p></div>`;
      GT.log('mixed', `${key === 'gst' ? 'GST audit' : 'Penalty'}: avg ${fmt(avg, 1)} vs eq ${fmt(E.vu, 1)}, freq ${GT.pct(f)} (eq ${GT.pct(E.p)})`, { scenario: key, prm, hist });
    }
    function drawStats() {
      $('#mx-r', root).textContent = Math.min(hist.length + 1, ROUNDS);
      $$('#mx-moves .btn', root).forEach(b => b.disabled = hist.length >= ROUNDS);
      if (!hist.length) {
        ['#mx-avg', '#mx-freq', '#mx-expl'].forEach(s => $(s, root).textContent = '–');
        $('#mx-eqv', root).textContent = fmt(E.vu, 1); $('#mx-msg', root).innerHTML = '';
        $('#mx-chart', root).innerHTML = '<p class="muted">Play rounds to see your running choice frequency against the equilibrium mix.</p>'; return;
      }
      $('#mx-avg', root).textContent = fmt(GT.mean(hist.map(h => h.u)), 1);
      $('#mx-eqv', root).textContent = fmt(E.vu, 1);
      $('#mx-freq', root).textContent = GT.pct(hist.filter(h => h.i === 0).length / hist.length);
      $('#mx-expl', root).textContent = GT.pct(hist.filter(h => h.exploit).length / hist.length);
      let c0 = 0; const pts = hist.map((h, k) => { if (h.i === 0) c0++; return [k + 1, c0 / (k + 1)]; });
      let s = 0; const avgPts = hist.map((h, k) => { s += h.u; return [k + 1, s / (k + 1)]; });
      const rng = Math.max(...S.U.flat()) - Math.min(...S.U.flat()) || 1, lo = Math.min(...S.U.flat());
      GT.chart.line($('#mx-chart', root), {
        series: [{ name: `Your running share of “${S.rows[0]}”`, color: 'var(--p1)', points: pts, dots: true, r: 2.5 },
        { name: `Your running avg ${S.youLabel} (scaled 0–1)`, color: 'var(--ink-2)', points: avgPts.map(([x, y]) => [x, (y - lo) / rng]), dash: '4 4', width: 1.5 }],
        xMin: 1, xMax: ROUNDS, yMin: 0, yMax: 1, xLabel: 'Round', yLabel: 'Share', height: 240,
        hlines: [{ y: E.p, label: 'Equilibrium mix ' + GT.pct(E.p), color: 'var(--amber)' }, { y: (E.vu - lo) / rng, label: 'Eq. value', color: 'var(--accent)' }]
      });
    }
    function drawCS() {
      if (key !== 'gst') return;
      const audit = [], evade = [];
      for (let F = 0; F <= 500; F += 10) { audit.push([F, prm.T / (prm.T + F)]); evade.push([F, Math.min(1, prm.C / prm.T)]); }
      GT.chart.line($('#mx-cs', root), {
        series: [{ name: 'Equilibrium audit rate', color: 'var(--p1)', points: audit }, { name: 'Equilibrium evasion rate', color: 'var(--p2)', points: evade }],
        xMin: 0, xMax: 500, yMin: 0, yMax: 1, xLabel: 'Penalty F', yLabel: 'Probability', height: 220,
        vlines: [{ x: prm.F, label: 'current F', color: 'var(--ink-2)' }]
      });
    }

    $('#mx-sc', root).onchange = e => { key = e.target.value; setup(); };
    $('#mx-auto', root).oninput = e => $('#mx-autov', root).textContent = e.target.value + '%';
    $('#mx-eqset', root).onclick = () => { const v = Math.round(GT.clamp(E.p, 0, 1) * 100); $('#mx-auto', root).value = v; $('#mx-autov', root).textContent = v + '%'; };
    $('#mx-autogo', root).onclick = () => { const pr = +$('#mx-auto', root).value / 100; for (let k = 0; k < 10 && hist.length < ROUNDS; k++) play(Math.random() < pr ? 0 : 1); };
    $('#mx-reset', root).onclick = () => setup();
    setup();
  }

  GT.register({
    id: 'mixed', num: 4, icon: '🎲', title: 'Be Unpredictable: Audits & Penalty Kicks', modules: ['M2'], sessions: '6', time: '25–35 min',
    tagline: 'Face an AI that hunts for patterns in your play. Learn why the optimal audit rate depends on the penalty, and why evasion doesn\'t.',
    problem: 'A tax authority cannot audit everyone, and a goalkeeper cannot cover both corners. If you are predictable you lose. How unpredictable should you be, and why does a higher penalty reduce audits rather than evasion?',
    concepts: ['Mixed strategy NE', 'Indifference principle', 'Zero-sum games', 'Comparative statics'],
    render,
    guide: {
      objective: 'Discover that the optimal mix makes the opponent indifferent, that predictable patterns get exploited, and the counter-intuitive comparative statics of inspection games.',
      players: '1 student vs a pattern-detecting AI',
      modes: '30 rounds manual or auto-play at a chosen probability',
      rules: `<ul><li><b>GST audit:</b> you choose Audit or Don't audit; the AI firm chooses Comply or Evade. Your payoff is tax recovered minus audit cost. Penalties go to the Consolidated Fund, so they do not count towards the department's target.</li><li><b>Penalty kicks:</b> you are the keeper; your payoff is the probability of a save.</li><li>The AI looks at your recent frequency and your move-to-move patterns, then best-responds.</li><li>Goal: an average payoff at or above the equilibrium value over 30 rounds.</li></ul>`,
      steps: [
        'Play 10 rounds of the GST audit by clicking buttons. Try to "outsmart" the firm.',
        'Look at the "AI exploited you" share. Did a pattern give you away?',
        'Click <b>Set to equilibrium</b> and then <b>Auto-play 10</b> twice. Compare your average with the equilibrium value.',
        'Restart and auto-play at 90% audit. Then at 10%. What does the AI do each time?',
        'Move the <b>penalty F</b> slider. Watch the comparative-statics chart: which rate changes, audit or evasion?',
        'Move the <b>audit cost C</b> slider. Now which rate changes? Write the intuition in one sentence.',
        'Switch to Penalty kicks and compare the equilibrium with the real data note.'
      ],
      facilitator: [
        'Classroom Matching Pennies first: pair students; one hides a coin heads/tails, the other guesses, 10 rounds. Ask who won and how.',
        'Project the GST game. Have the class shout "audit" or "not" each round while the AI plays against them. Groups are usually very predictable.',
        'Reveal the indifference logic: "Your mix is set by the <i>firm\'s</i> payoffs, not your own."',
        'Show the comparative statics: raising penalties lowers audit frequency in equilibrium, while evasion stays fixed by audit cost. Debate tax-policy implications.',
        'Timing: 5 min coin game, 10 min AI play, 10 min theory, 10 min applications.'
      ],
      variations: ['Random drug testing in sport or random breath tests on highways: same structure.', 'Add a third option (e.g. "Partial audit") and discuss support of the mixed equilibrium.', 'Link to marketing: timing of discount sales so customers cannot wait strategically.']
    },
    theory: `
      <h3 style="margin-top:0">When pure strategies fail</h3>
      <p>In games like Matching Pennies, audits and penalty kicks, every pure-strategy profile gives someone an incentive to deviate. Nash (1950) proved that every finite game has an equilibrium <b>if players may randomise</b>.</p>
      <h3>The indifference principle</h3>
      <p>In a mixed equilibrium, each player mixes in exactly the proportions that make the <b>opponent</b> indifferent between their pure strategies. If the opponent were not indifferent, they would pick one strategy for sure, and that could be exploited.</p>
      <div class="formula">Row mixes p so that Column is indifferent:
p·V(r₁,c₁) + (1−p)·V(r₂,c₁) = p·V(r₁,c₂) + (1−p)·V(r₂,c₂)</div>
      <h3>The inspection game: a counter-intuitive result</h3>
      <p>With tax T, penalty F and audit cost C:</p>
      <div class="formula">Equilibrium audit probability   a* = T / (T + F)
Equilibrium evasion probability e* = C / T</div>
      <p>The authority's audit rate is pinned down by the <b>firm's</b> indifference, and the firm's evasion rate by the <b>authority's</b>. So a <b>higher penalty lowers the audit rate needed but leaves equilibrium evasion unchanged</b>: the firm's payoffs (including F) set the authority's mix, not the firm's own behaviour. To cut evasion you must change the <i>authority's</i> payoffs, e.g. lower audit cost C through analytics, or reward recovery. This is the "own-payoff irrelevance" result (Tsebelis 1989). In practice, harsher penalties mainly save enforcement effort. (The result assumes the authority values recovered tax, not penalty revenue. If penalties counted as revenue, F would also enter e*.)</p>
      <h3>Why predictability is costly</h3>
      <p>If you audit with probability above a*, the firm complies for sure and you waste audits. Below a*, the firm evades for sure. Patterns such as alternating are a form of predictability: the AI here conditions on your last move, as a real opponent would.</p>
      <h3>Evidence</h3>
      <p>Palacios-Huerta (2003) and Chiappori, Levitt & Groseclose (2002) found professional penalty takers and goalkeepers mix almost exactly as theory predicts, and their choices are serially independent. Walker & Wooders (2001) found the same for Wimbledon serves. Students in labs, by contrast, alternate too much.</p>`,
    practice: [
      { tag: 'India', title: 'GST and income-tax scrutiny selection', text: 'The CBDT and GST network use risk-based, partly randomised scrutiny selection. If selection were fully predictable from rules, firms would stay just under the triggers. Randomness keeps everyone honest at lower audit cost.' },
      { tag: 'India', title: 'Ticket checking on Indian Railways and metro', text: 'TTE checks are not on every train. Fines for ticketless travel need to be high enough that a modest check frequency deters evasion. This is a direct application of a* = T/(T+F).' },
      { tag: 'Global', title: 'Airport security and the LAX ARMOR system', text: 'Los Angeles airport used game-theoretic randomisation (Stackelberg security games, Tambe et al.) to schedule checkpoints and canine patrols so attackers could not predict them. Similar tools have been used by the US Coast Guard and wildlife-protection agencies.' },
      { tag: 'Global', title: 'Penalty kicks and Wimbledon serves', text: 'Professionals mix close to the equilibrium. Studies of World Cup shoot-outs show keepers dive more to the kicker\'s natural side, roughly as predicted.' },
      { tag: 'Frontier', title: 'Promotions timing and AI shoppers', text: 'If a retailer runs sales on a fixed calendar, customers (and now shopping bots) wait. Randomised flash sales keep full-price demand alive, a mixed strategy in marketing.' }
    ],
    debrief: [
      'Why does your equilibrium mix depend on the opponent\'s payoffs rather than your own?',
      'Policy question: the government doubles GST penalties. According to the model, what happens to evasion? To audit frequency? Do you believe it?',
      'Was the AI able to exploit you? Which pattern did it detect?',
      'Professional athletes randomise close to equilibrium, but students alternate too much. Why might experience matter?',
      'Identify one decision in your internship company that should have been randomised but was not.',
      'Is randomising "fair" when a regulator selects firms for audit? Discuss the legitimacy vs. effectiveness trade-off.'
    ],
    aiPrompt: `I am analysing the GST audit inspection game: tax T = 100, penalty F = 150, audit cost C = 30 (₹ lakh).
1. Derive the mixed-strategy Nash equilibrium (audit probability and evasion probability) step by step.
2. Explain intuitively why raising F lowers the audit rate but leaves evasion unchanged in this model.
3. Which assumptions (risk neutrality, a single firm type, perfect detection, fixed budget) drive this result? Relax two of them and say how the conclusion changes.
4. Recommend a randomised audit policy for a state GST department and state its limitations.`
  });
})();
