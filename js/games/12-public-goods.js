/* 12 — Climate Club: public goods, free riding, peer punishment, threshold (collective-risk) game */
(function () {
  const { $, $$, fmt, esc } = GT;
  const E = 20, ROUNDS = 10;
  const NAMES = ['Country B', 'Country C', 'Country D'];

  function makeBots() {
    const types = GT.shuffle(['cc', 'cc', GT.pick(['fr', 'cc', 'fr', 'noisy'])]);
    return types.map((t, i) => ({ name: NAMES[i], type: t, hist: [], pun: 0, earn: 0 }));
  }
  const TYPE_LABEL = { cc: 'Conditional cooperator', fr: 'Free rider', noisy: 'Erratic' };

  function render(root) {
    root.innerHTML = `
      <div class="subtabs"><button class="subtab active" data-sub="play">Play with 3 AI countries</button><button class="subtab" data-sub="class">Classroom mode</button></div>
      <div data-pane="play" class="layout-2">
        <div class="stack">
          <div class="card">
            <div class="field"><label>Treatment</label><select id="pg-mode">
              <option value="std">Standard public good (no enforcement)</option>
              <option value="pun">With peer punishment</option>
              <option value="thr">Climate threshold (collective risk)</option>
            </select></div>
            <p class="muted" id="pg-desc" style="font-size:.88rem"></p>
            <div class="field" id="pg-mpcr-wrap"><div class="field-row"><label>Return per unit to each country (MPCR)</label><span class="val" data-v="m"></span></div><input type="range" data-k="m" min="0.25" max="0.95" step="0.05" value="0.4"></div>
          </div>
          <div class="card">
            <div class="panel-title">Round <span id="pg-r">1</span>/${ROUNDS} · You are Country A</div>
            <div class="field"><div class="field-row"><label>Contribute to the climate fund (of ${E})</label><span class="val" id="pg-cv">10</span></div><input type="range" id="pg-c" min="0" max="${E}" step="1" value="10"></div>
            <div class="btn-row"><button class="btn primary" id="pg-go">Contribute</button><button class="btn" id="pg-reset">Restart</button></div>
            <div id="pg-punbox" class="mt"></div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="kpis"><div class="kpi p1"><div class="k">Your earnings</div><div class="v" id="pg-you">0</div></div><div class="kpi accent"><div class="k">Group avg contribution</div><div class="v" id="pg-avg">–</div></div><div class="kpi"><div class="k" id="pg-k3">Efficiency</div><div class="v" id="pg-eff">–</div></div></div>
            <div id="pg-chart" class="mt"></div>
            <div id="pg-table" class="tbl-wrap"></div>
            <div id="pg-msg"></div>
          </div>
        </div>
      </div>
      <div data-pane="class" class="layout-2 hide">
        <div class="card">
          <div class="panel-title">Paste class contributions</div>
          <p class="muted" style="font-size:.88rem">Groups of 4 play with an endowment of ${E} per round. One line per round, listing every student's contribution (any separator). Example: <code>R1: 12 5 20 0 8 10 15 3</code>.</p>
          <textarea id="pg-paste" placeholder="R1: 12 5 20 0 8 10 15 3&#10;R2: 10 3 18 0 6 9 12 2"></textarea>
          <div class="field mt"><div class="field-row"><label>MPCR used</label><input type="number" id="pg-cm" value="0.4" step="0.05"></div></div>
          <div class="btn-row"><button class="btn primary" id="pg-cgo">Analyse</button><button class="btn sm" id="pg-cdemo">Demo data</button></div>
        </div>
        <div class="card"><div id="pg-cout"><p class="muted">Results appear here.</p></div></div>
      </div>`;

    GT.subtabs(root);
    let prm, mode = 'std', bots, me, punishPending = false;
    const paint = GT.bindRanges(root, o => { prm = o; if (me) setup(); }, { m: v => fmt(v, 2) });
    prm = paint();
    const cEl = $('#pg-c', root);
    cEl.oninput = () => $('#pg-cv', root).textContent = cEl.value;

    const DESC = {
      std: 'Each round every country gets 20 units. What you keep is yours; what you contribute goes into a joint fund, and each unit contributed returns MPCR to <b>every</b> country. Free riding pays individually, but full cooperation pays everyone most.',
      pun: 'As in the standard game, but after seeing contributions each country can spend 1 unit to cut another country\'s earnings by 3. Will anyone pay to punish?',
      thr: 'Avoid dangerous climate change (Milinski et al. 2008). Contributions earn no return. If the group\'s total over 10 rounds reaches 400 (half of all endowments), everyone keeps what they did not contribute. Otherwise, with 90% probability, everyone loses 80% of their savings.'
    };
    function setup() {
      mode = $('#pg-mode', root).value;
      $('#pg-desc', root).innerHTML = DESC[mode];
      $('#pg-mpcr-wrap', root).style.display = mode === 'thr' ? 'none' : '';
      $('#pg-k3', root).textContent = mode === 'thr' ? 'Group total vs 400' : 'Efficiency';
      bots = makeBots(); me = { hist: [], earn: 0, pun: 0 }; punishPending = false;
      $('#pg-msg', root).innerHTML = ''; $('#pg-punbox', root).innerHTML = '';
      draw();
    }
    function botContribution(b, r) {
      const lastOthers = r === 0 ? null : GT.mean([me.hist[r - 1]].concat(bots.filter(x => x !== b).map(x => x.hist[r - 1])));
      let c;
      if (mode === 'thr') {
        const fair = 10;
        if (b.type === 'fr') c = GT.rand(2, 7);
        else if (b.type === 'noisy') c = GT.rand(0, 20);
        else c = r === 0 ? GT.rand(8, 12) : 0.5 * fair + 0.5 * lastOthers + GT.rand(-2, 2);
      } else {
        if (b.type === 'fr') c = r === 0 ? GT.rand(0, 5) : GT.rand(0, 3);
        else if (b.type === 'noisy') c = GT.rand(0, 20);
        else c = r === 0 ? GT.rand(8, 14) : 0.85 * lastOthers + GT.rand(-1.5, 1.5);
        if (mode === 'pun' && b.pun > 0) c += Math.min(10, b.pun * 1.6) + (b.type === 'fr' ? 3 : 1);
        if (mode === 'pun' && r > 0 && b.type === 'cc') c = Math.max(c, 0.95 * lastOthers);
      }
      return Math.round(GT.clamp(c, 0, E));
    }
    function draw() {
      const r = me.hist.length;
      $('#pg-r', root).textContent = Math.min(r + 1, ROUNDS);
      $('#pg-go', root).disabled = r >= ROUNDS || punishPending;
      $('#pg-you', root).textContent = fmt(me.earn, 1);
      const all = [me].concat(bots);
      const groupTot = GT.sum(all.map(p => GT.sum(p.hist)));
      $('#pg-avg', root).textContent = r ? fmt(groupTot / (4 * r), 1) : '–';
      if (mode === 'thr') $('#pg-eff', root).textContent = `${fmt(groupTot)}/400`;
      else {
        // efficiency: group earnings relative to Nash (0 contributions) and social optimum (full contributions)
        const nashTot = r * E * 4, optTot = r * E * 4 * 4 * prm.m, tot = GT.sum(all.map(p => p.earn));
        $('#pg-eff', root).textContent = r ? GT.pct(GT.clamp((tot - nashTot) / (optTot - nashTot), 0, 1)) : '–';
      }
      const colors = ['var(--p1)', '#7c3aed', '#0891b2', '#b45309'];
      GT.chart.line($('#pg-chart', root), {
        series: all.map((p, i) => ({ name: i === 0 ? 'You (A)' : p.name, color: colors[i], points: p.hist.map((c, k) => [k + 1, c]), dots: true, width: i === 0 ? 3 : 1.8 }))
          .concat(r ? [{ name: 'Group average', color: 'var(--ink)', points: me.hist.map((_, k) => [k + 1, GT.mean(all.map(p => p.hist[k]))]), dash: '6 4', width: 2 }] : []),
        xMin: 1, xMax: ROUNDS, yMin: 0, yMax: E, xLabel: 'Round', yLabel: 'Contribution', height: 260, xTicks: 9,
        hlines: mode === 'thr' ? [{ y: 10, label: 'Fair share to reach target', color: 'var(--good)' }] : []
      });
      $('#pg-table', root).innerHTML = r ? `<table class="data mt"><thead><tr><th>Country</th>${me.hist.map((_, k) => `<th>R${k + 1}</th>`).join('')}<th>Earnings</th></tr></thead><tbody>${all.map((p, i) => `<tr><td><b style="color:${colors[i]}">${i === 0 ? 'You (A)' : p.name}</b></td>${p.hist.map(c => `<td>${c}</td>`).join('')}<td><b>${fmt(p.earn, 1)}</b></td></tr>`).join('')}</tbody></table>` : '';
    }
    function settleRound(r) {
      const all = [me].concat(bots);
      const tot = GT.sum(all.map(p => p.hist[r]));
      if (mode !== 'thr') all.forEach(p => p.earn += E - p.hist[r] + prm.m * tot);
      else all.forEach(p => p.earn += E - p.hist[r]);
    }
    $('#pg-go', root).onclick = () => {
      const r = me.hist.length; if (r >= ROUNDS) return;
      const c = +cEl.value;
      const botC = bots.map(b => botContribution(b, r));
      me.hist.push(c); bots.forEach((b, i) => { b.hist.push(botC[i]); b.pun = 0; });
      settleRound(r);
      if (mode === 'pun') {
        // bots punish low contributors (including you)
        const avg = GT.mean([c].concat(botC));
        let received = 0;
        bots.forEach(b => {
          if (b.type !== 'cc') return;
          const targets = [{ p: me, c }].concat(bots.filter(x => x !== b).map(x => ({ p: x, c: x.hist[r] })));
          targets.forEach(t => { if (t.c < avg - 3) { const pts = Math.min(3, Math.round((avg - t.c) / 4)); if (pts > 0) { b.earn -= pts; t.p.earn -= 3 * pts; if (t.p === me) received += pts; else t.p.pun += pts; } } });
        });
        punishPending = true;
        $('#pg-punbox', root).innerHTML = `<div class="note ${received ? 'bad' : ''}"><p>${received ? `Other countries spent ${received} unit(s) punishing you (−${3 * received} to your earnings) for contributing below the group average.` : 'Nobody punished you this round.'} Now you may punish: each point costs you 1 and cuts the target's earnings by 3.</p></div>
          ${bots.map((b, i) => `<div class="field-row" style="margin:6px 0"><span>${b.name} contributed <b>${b.hist[r]}</b></span><input type="number" min="0" max="5" value="0" data-pun="${i}" style="width:70px"></div>`).join('')}
          <button class="btn sm primary" id="pg-pundo">Confirm punishment & continue</button>`;
        $('#pg-pundo', root).onclick = () => {
          $$('[data-pun]', root).forEach(inp => { const k = GT.clamp(+inp.value || 0, 0, 5); if (k) { me.earn -= k; bots[+inp.dataset.pun].earn -= 3 * k; bots[+inp.dataset.pun].pun += k; } });
          punishPending = false; $('#pg-punbox', root).innerHTML = ''; afterRound();
        };
        draw(); return;
      }
      afterRound();
    };
    function afterRound() {
      draw();
      if (me.hist.length < ROUNDS) return;
      const all = [me].concat(bots);
      const groupTot = GT.sum(all.map(p => GT.sum(p.hist)));
      let msg = '';
      if (mode === 'thr') {
        const ok = groupTot >= 400;
        let disaster = false;
        if (!ok && Math.random() < 0.9) { disaster = true; all.forEach(p => p.earn *= 0.2); }
        msg = ok ? `<b>Target reached (${groupTot}/400).</b> Dangerous climate change was avoided and everyone keeps their savings.` : disaster ? `<b>Target missed (${groupTot}/400), and disaster struck.</b> Everyone lost 80% of their savings. Free riders lost the most in absolute terms.` : `<b>Target missed (${groupTot}/400), but the group was lucky</b> (a 10% chance). Would you bet on that again?`;
        draw();
      } else {
        const first = GT.mean(all.map(p => p.hist[0])), last = GT.mean(all.map(p => p.hist[ROUNDS - 1]));
        msg = `Average contribution went from <b>${fmt(first, 1)}</b> in round 1 to <b>${fmt(last, 1)}</b> in round 10. ${mode === 'pun' ? 'Peer punishment typically <b>sustains or raises</b> contributions, even though punishing is costly for the punisher, a "second-order public good".' : 'Without enforcement, contributions usually <b>decay</b> as conditional cooperators react to free riders. This is the pattern found in hundreds of experiments.'}`;
      }
      msg += ` Your counterparts were: ${bots.map(b => `${b.name} = ${TYPE_LABEL[b.type]}`).join(', ')}.`;
      $('#pg-msg', root).innerHTML = `<div class="note amber"><p>${msg}</p></div>`;
      GT.log('public-goods', `${$('#pg-mode', root).selectedOptions[0].text}: you earned ${fmt(me.earn, 1)}, avg contribution ${fmt(groupTot / (4 * ROUNDS), 1)}`, { mode, me: me.hist, bots: bots.map(b => ({ type: b.type, hist: b.hist })) });
    }
    $('#pg-reset', root).onclick = setup;
    $('#pg-mode', root).onchange = setup;

    /* ---------- classroom ---------- */
    $('#pg-cdemo', root).onclick = () => {
      let base = Array.from({ length: 12 }, () => GT.rand(4, 16));
      $('#pg-paste', root).value = Array.from({ length: 8 }, (_, r) => { const row = base.map(b => Math.round(GT.clamp(b * Math.pow(0.88, r) + GT.rand(-3, 3), 0, E))); return `R${r + 1}: ${row.join(' ')}`; }).join('\n');
    };
    $('#pg-cgo', root).onclick = () => {
      const rows = $('#pg-paste', root).value.split('\n').map(l => l.trim()).filter(Boolean).map(l => GT.parseNums(l.replace(/^R\d+\s*[:\-]?/i, '')));
      if (!rows.length || !rows[0].length) { GT.toast('Nothing to analyse'); return; }
      const m = parseFloat($('#pg-cm', root).value) || 0.4;
      const avg = rows.map(r => GT.mean(r));
      const fr = rows.map(r => r.filter(c => c <= 2).length / r.length);
      const full = rows.map(r => r.filter(c => c >= E - 1).length / r.length);
      const out = $('#pg-cout', root);
      out.innerHTML = `<div class="kpis"><div class="kpi"><div class="k">Students</div><div class="v">${rows[0].length}</div></div><div class="kpi accent"><div class="k">R1 → last avg</div><div class="v">${fmt(avg[0], 1)} → ${fmt(avg[avg.length - 1], 1)}</div></div><div class="kpi p2"><div class="k">Free riders (last round)</div><div class="v">${GT.pct(fr[fr.length - 1])}</div></div></div><div id="pg-cc" class="mt"></div>
        <div class="note"><p>Each unit contributed costs the contributor 1 and returns ${fmt(m, 2)} to each group member, so the individually rational (Nash) contribution is <b>0</b> while the social optimum is <b>${E}</b> whenever MPCR × group size > 1. Typical lab result: about 40–60% of the endowment in round 1, decaying towards 10–20% by round 10 (Ledyard 1995; Fehr & Gächter 2000).</p></div>`;
      GT.chart.line($('#pg-cc', out), { series: [{ name: 'Average contribution', color: 'var(--accent)', points: avg.map((a, i) => [i + 1, a]), dots: true }, { name: 'Share free riding (≤2) × 20', color: 'var(--p2)', points: fr.map((f, i) => [i + 1, f * E]), dash: '5 4' }, { name: 'Share contributing fully × 20', color: 'var(--good)', points: full.map((f, i) => [i + 1, f * E]), dash: '2 4' }], xMin: 1, xMax: Math.max(2, rows.length), yMin: 0, yMax: E, xLabel: 'Round', yLabel: 'Units', height: 260 });
      GT.log('public-goods', `Classroom: ${rows[0].length} students, avg ${fmt(avg[0], 1)} → ${fmt(avg[avg.length - 1], 1)}`, { rows });
    };

    setup();
  }

  GT.register({
    id: 'public-goods', num: 12, icon: '🌍', title: 'Climate Club: Collective Action & Free Riding', modules: ['M4', 'M10'], sessions: '12, 20 (SDG 17)', time: '30–40 min',
    tagline: 'Four countries, ten rounds, one climate fund. Play it without enforcement, with peer punishment, or with a collective-risk threshold.',
    problem: 'Climate agreements, shared infrastructure and industry standards all need contributions whose benefits everyone shares. Why do countries and firms free-ride, and which institutions (sanctions, thresholds, clubs) keep cooperation alive?',
    concepts: ['Public goods', 'Free riding', 'Conditional cooperation', 'Costly punishment', 'Collective risk', 'SDG 17'],
    render,
    guide: {
      objective: 'Experience the n-player Prisoner\'s Dilemma, observe conditional cooperation and decay, and compare institutional fixes: peer punishment and threshold (collective-risk) designs.',
      players: '1 student + 3 AI countries; whole class in groups of 4',
      modes: 'Standard · Peer punishment · Climate threshold · Classroom paste-in',
      rules: `<ul><li>Each round you receive 20 units and choose how many to contribute.</li><li><b>Standard:</b> every unit contributed returns MPCR (default 0.4) to <b>each</b> of the 4 countries. You keep everything you do not contribute.</li><li><b>Punishment:</b> after contributions are revealed, you may pay 1 to impose −3 on another country.</li><li><b>Threshold:</b> no return on contributions, but if the group misses 400 in total over 10 rounds, a disaster wipes out 80% of savings with 90% probability.</li></ul>`,
      steps: [
        'Play 10 rounds of <b>Standard</b>. Note round-1 and round-10 contributions for each country.',
        'Calculate: what does contributing 1 unit cost you, and what does it return to you? To the group?',
        'Play <b>With peer punishment</b>. Did you punish? Were you punished? How did contributions evolve?',
        'Play <b>Climate threshold</b>. What contribution per round is your "fair share"? Did the group reach the target?',
        'Raise MPCR to 0.9 and replay Standard. Does a higher return change behaviour?',
        'Identify your AI counterparts\' types from their behaviour before the reveal.'
      ],
      facilitator: [
        'Classroom: form groups of 4. Each student secretly writes a contribution (0–20) per round; a group scribe announces the total; repeat for 6–10 rounds.',
        'Collect all contributions per round and paste them into Classroom mode. Show the decay curve.',
        'Round 2 variant: allow punishment cards (pay 1 token, remove 3 from a target), or allow 2 minutes of discussion. Compare curves.',
        'Link to SDG 17 and climate negotiations: Paris pledges (voluntary contributions), carbon border taxes (CBAM as punishment), climate clubs (Nordhaus).',
        'Close with Ostrom: real communities often manage commons through monitoring, graduated sanctions and local rules.',
        'Timing: 15 min game, 10 min variant, 15 min discussion.'
      ],
      variations: ['Anonymous vs identified contributions: does visibility raise cooperation?', 'Heterogeneous endowments: rich vs poor countries (common but differentiated responsibilities).', 'Reward instead of punishment: does a "carrot" work as well as a "stick"?']
    },
    theory: `
      <h3 style="margin-top:0">The linear public-goods game</h3>
      <p>Each of n players has endowment E and contributes cᵢ. Payoff:</p>
      <div class="formula">πᵢ = E − cᵢ + m · Σⱼ cⱼ        with  1/n < m < 1</div>
      <p>Each unit contributed costs you 1 but returns only m < 1 to you, so <b>contributing 0 is a dominant strategy</b>. Each unit creates n·m > 1 for the group, so the <b>social optimum is full contribution</b>. This is the n-player Prisoner's Dilemma, Hardin's "tragedy of the commons".</p>
      <h3>What people actually do</h3>
      <ul><li>Round 1: average contributions of 40–60% of the endowment (Ledyard 1995).</li><li>About half of subjects are <b>conditional cooperators</b>: they contribute if others do (Fischbacher, Gächter & Fehr 2001). About a third free-ride.</li><li>Because conditional cooperators match slightly <i>below</i> others, contributions <b>decay</b> over rounds.</li></ul>
      <h3>Institutional fixes</h3>
      <table class="data"><thead><tr><th>Mechanism</th><th>Evidence</th><th>Policy analogue</th></tr></thead><tbody>
        <tr><td>Costly peer punishment</td><td>Contributions rise towards 80–90% (Fehr & Gächter 2000)</td><td>Trade sanctions, CBAM, naming and shaming</td></tr>
        <tr><td>Communication</td><td>Large increases even when the talk is non-binding</td><td>COP negotiations, industry forums</td></tr>
        <tr><td>Thresholds / collective risk</td><td>Groups reach targets about half the time when the risk is high (Milinski et al. 2008)</td><td>1.5°C / 2°C targets</td></tr>
        <tr><td>Clubs with exclusion</td><td>Turns a public good into a club good</td><td>Nordhaus climate clubs, alliances</td></tr>
      </tbody></table>
      <h3>Second-order free riding</h3>
      <p>Punishing is itself a public good: everyone benefits from discipline, but the punisher pays. That people still punish suggests <b>strong reciprocity</b>, an evolved willingness to sanction norm violators.</p>
      <h3>Ostrom's design principles</h3>
      <p>Elinor Ostrom (Nobel 2009) documented communities that sustain commons (forests, fisheries, irrigation) without either privatisation or central control: clear boundaries, local rule-making, monitoring, <b>graduated sanctions</b> and conflict-resolution mechanisms.</p>`,
    practice: [
      { tag: 'India', title: 'International Solar Alliance', text: 'Co-founded by India and France in 2015, the ISA pools technology, finance and procurement for solar deployment. It works as a "club" that lowers each member\'s cost of contributing.' },
      { tag: 'Global', title: 'Paris Agreement pledges (NDCs)', text: 'Paris relies on voluntary, nationally determined contributions: a public-goods game with communication and transparency but no formal punishment. Pledges have so far fallen short of 1.5°C pathways, as the theory would predict.' },
      { tag: 'Global', title: 'EU Carbon Border Adjustment Mechanism', text: 'CBAM (transitional phase from 2023) charges carbon-intensive imports. It acts as costly punishment of free riders and pushes exporters, including Indian steel and aluminium, towards carbon pricing.' },
      { tag: 'India', title: 'Groundwater and stubble burning', text: 'Each farmer\'s extraction or burning is individually rational and collectively harmful. Successful local water-user associations in Maharashtra and Gujarat follow Ostrom\'s design principles.' },
      { tag: 'Global', title: 'Open-source software and industry standards', text: 'Linux, Kubernetes and 5G standards are public goods sustained by firms that benefit from shared infrastructure, reputation and influence over the standard.' },
      { tag: 'Frontier', title: 'Collective action on AI safety', text: 'Frontier AI labs face a public-goods problem on safety research and pace. Voluntary commitments, safety institutes and compute governance are experiments in climate-style collective-action design.' }
    ],
    debrief: [
      'Show that contributing nothing is a dominant strategy but that full contribution maximises group earnings.',
      'Why did contributions decay in the standard game? Distinguish free riders from conditional cooperators.',
      'Why would anyone pay to punish? What does this say about human preferences and about the design of institutions?',
      'Compare the threshold game with real climate negotiations. Is the 1.5°C target a credible threshold?',
      'Is the EU\'s CBAM a fair punishment mechanism from India\'s perspective? Use the concepts of free riding and differentiated responsibility.',
      'Name a public good inside a company (knowledge sharing, culture). Which mechanism from this game would you use?'
    ],
    aiPrompt: `I played a 4-country public-goods climate game (endowment 20/round, MPCR 0.4, 10 rounds). Average contributions by round were: [paste].
1. Explain the pattern using conditional cooperation and free riding.
2. Compare three institutional fixes (peer punishment, collective-risk threshold, climate club with exclusion) using experimental evidence.
3. Evaluate India's position on the EU CBAM using this framework, giving arguments from both sides.
4. Propose a coalition design for a South Asian regional grid that applies Ostrom's design principles. Flag any statistics I should verify.`
  });
})();
