/* StratLab app shell: router + static pages + game page shell */
(function () {
  'use strict';
  const { $, $$, esc } = GT;

  const MODULES = [
    { id: 'M1', name: 'What is Strategic Thinking?', sessions: '1–3', blurb: 'Players, strategies, payoffs; dominance and IEDS.' },
    { id: 'M2', name: 'Nash Equilibrium: Thinking Simultaneously', sessions: '4–7', blurb: 'Best responses, Cournot/Bertrand, mixed strategies.' },
    { id: 'M3', name: 'Sequential Games: Reason Backwards', sessions: '8–11', blurb: 'Game trees, SPNE, commitment, first-mover advantage.' },
    { id: 'M4', name: 'Repeated Games & Cooperation', sessions: '12', blurb: 'Trigger strategies, Folk theorem, cartels.' },
    { id: 'M5', name: 'Strategic Moves & Credibility', sessions: '13', blurb: 'Threats, promises, commitment devices.' },
    { id: 'M6', name: 'Imperfect Information', sessions: '14', blurb: 'Adverse selection, signaling, screening, auctions.' },
    { id: 'M7', name: 'Cooperative Game Theory', sessions: '15–17', blurb: 'Coalitions, the Core, Shapley value, voting power.' },
    { id: 'M8', name: 'Matching & Stable Partnerships', sessions: '18', blurb: 'Gale–Shapley deferred acceptance, market design.' },
    { id: 'M9', name: 'Negotiation & Bargaining', sessions: '19', blurb: 'Ultimatum, Rubinstein, Nash bargaining, BATNA.' },
    { id: 'M10', name: 'Synthesis, Behaviour & Social Impact', sessions: '20', blurb: 'Collective action, bounded rationality, SDG 17.' }
  ];
  GT.MODULES = MODULES;

  const COLORS = { M1: '#4f46e5', M2: '#2563eb', M3: '#0891b2', M4: '#059669', M5: '#65a30d', M6: '#d97706', M7: '#db2777', M8: '#9333ea', M9: '#e11d48', M10: '#0d9488' };
  const SHORT = { 'price-war': 'Price War Lab', 'beauty-contest': 'Beauty Contest', duopoly: 'Cournot vs Bertrand', mixed: 'Audits & Penalty Kicks', entry: 'Entry & Commitment', bargaining: 'Bargaining Table', repeated: 'OPEC Cartel', information: 'Lemons & Signals', auction: 'Auction House', coalition: 'Shapley & Core', matching: 'Matching Market', 'public-goods': 'Climate Club' };
  const colorOf = g => COLORS[g.modules[0]];
  const badge = g => `<span class="num-badge" style="background:${colorOf(g)}">${g.num}</span>`;
  GT.shortTitle = g => SHORT[g.id] || g.title;

  /* ---------- theme (light by default) ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    const b = $('#themeBtn'); if (b) b.textContent = t === 'dark' ? '☀ Light' : '☾ Dark';
  }
  function initTheme() {
    let saved = 'light';
    try { saved = localStorage.getItem('stratlab.theme') || 'light'; } catch (e) { }
    setTheme(saved);
  }

  /* ---------- sidebar ---------- */
  function renderSidebar() {
    const sb = $('#sidebar');
    const mods = MODULES.map(m => {
      const gs = GT.games.filter(g => g.modules[0] === m.id);
      if (!gs.length) return '';
      return `<div class="side-sec">${m.id} · ${esc(m.name.split(':')[0])}</div>` +
        gs.map(g => `<a class="side-game" data-g="${g.id}" href="#/game/${g.id}" data-search="${esc((g.title + ' ' + g.concepts.join(' ') + ' ' + g.tagline).toLowerCase())}">${badge(g)}<span>${esc(GT.shortTitle(g))}</span></a>`).join('');
    }).join('');
    sb.innerHTML = `
      <a class="brand" href="#/"><span class="brand-mark">S</span><span>StratLab<small>Game theory simulations</small></span></a>
      <input class="side-search" id="sideSearch" type="search" placeholder="Search games or concepts…">
      <a class="side-link" data-p="home" href="#/"><span class="side-ico">⌂</span>Home</a>
      <a class="side-link" data-p="course" href="#/course"><span class="side-ico">▦</span>Course map</a>
      <a class="side-link" data-p="faculty" href="#/faculty"><span class="side-ico">✎</span>Faculty guide</a>
      <a class="side-link" data-p="results" href="#/results"><span class="side-ico">↧</span>My results</a>
      <div id="sideGames">${mods}</div>
      <div class="side-foot"><a href="#/about" class="side-link" data-p="about" style="padding:4px 0">About</a><button class="theme-btn" id="themeBtn">☾ Dark</button></div>`;
    $('#themeBtn').onclick = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      try { localStorage.setItem('stratlab.theme', next); } catch (e) { }
    };
    $('#sideSearch').oninput = e => {
      const q = e.target.value.trim().toLowerCase();
      $$('.side-game').forEach(a => a.style.display = !q || a.dataset.search.includes(q) ? '' : 'none');
      $$('.side-sec').forEach(s => {
        let n = s.nextElementSibling, any = false;
        while (n && n.classList.contains('side-game')) { if (n.style.display !== 'none') any = true; n = n.nextElementSibling; }
        s.style.display = any ? '' : 'none';
      });
    };
    sb.addEventListener('click', e => { if (e.target.closest('a')) $('#shell').classList.remove('nav-open'); });
    $('#menuBtn').onclick = () => $('#shell').classList.add('nav-open');
    $('#scrim').onclick = () => $('#shell').classList.remove('nav-open');
  }

  /* ---------- pages ---------- */
  function gameCard(g) {
    return `<a class="card game-card" href="#/game/${g.id}">
      ${badge(g)}
      <h3>${esc(GT.shortTitle(g))}</h3>
      <p>${esc(g.tagline)}</p>
      <div class="meta"><span style="color:${colorOf(g)}">${g.modules[0]}</span> · Session ${esc(g.sessions)} · ${esc(g.time)}</div>
    </a>`;
  }

  function pageHome(root) {
    const n = GT.games.length;
    const first = GT.games[0];
    let mods = '';
    MODULES.forEach(m => {
      const gs = GT.games.filter(g => g.modules[0] === m.id);
      if (!gs.length) return;
      mods += `<section class="module-block"><div class="module-head"><span class="chip" style="background:${COLORS[m.id]}1a;color:${COLORS[m.id]}">${m.id}</span><h2>${esc(m.name)}</h2><span class="muted">Sessions ${m.sessions}</span></div>
        <div class="grid">${gs.map(gameCard).join('')}</div></section>`;
    });
    root.innerHTML = `
      <section class="hero">
        <span class="eyebrow">Strategic Decision Making · Game Theory</span>
        <h1>Learn game theory by playing it</h1>
        <p class="lead">${n} short simulations, one for each part of the course. Pick a game, read the 3-step quick start, play against the AI, then compare what happened with the theory.</p>
        <div class="btn-row" style="margin-top:18px">
          <a class="btn primary" href="#/game/${first.id}">Start with game 1 →</a>
          <a class="btn" href="#/faculty">I'm running a class</a>
        </div>
      </section>
      <div class="steps-row">
        <div class="step-tile"><i>1</i><b>Pick a game</b><span>From the list below or the sidebar</span></div>
        <div class="step-tile"><i>2</i><b>Play</b><span>Against the AI, or live with the class</span></div>
        <div class="step-tile"><i>3</i><b>Compare</b><span>Your result vs the equilibrium</span></div>
        <div class="step-tile"><i>4</i><b>Reflect</b><span>Debrief questions and export your log</span></div>
      </div>
      <div class="module-block"><div class="module-head"><h2>All simulations</h2><span class="muted">In course order · the sidebar groups them by module</span></div>
        <div class="grid">${GT.games.map(gameCard).join('')}</div></div>`;
  }

  function pageGames(root) { pageHome(root); }

  function pageCourse(root) {
    const rows = MODULES.map(m => {
      const gs = GT.games.filter(g => g.modules.includes(m.id));
      return `<tr><td><span class="chip accent">${m.id}</span></td><td><b>${esc(m.name)}</b><br><small>${esc(m.blurb)}</small></td><td>${m.sessions}</td>
        <td>${gs.map(g => `<a href="#/game/${g.id}">${g.icon} ${esc(g.title)}</a>`).join('<br>') || '<span class="muted">—</span>'}</td></tr>`;
    }).join('');
    const clo = [
      ['CLO 1', 'Represent real situations as games: players, strategies, information, payoffs', 'Every game starts with an explicit model (matrix, tree, characteristic function). In Price War, Entry and Coalition Lab, students build or edit the model themselves.'],
      ['CLO 2', 'Analyse with NE, backward induction, repeated-game logic, information concepts', 'Built-in solvers (NE finder, IEDS, backward induction, Shapley/Core, deferred acceptance, Rubinstein) check student reasoning in real time.'],
      ['CLO 3', 'Evaluate assumptions; when behaviour changes the predictions', 'AI opponents are calibrated to experimental evidence (ultimatum rejections, level-k reasoning, conditional cooperation), so play regularly departs from theory. Debrief questions ask students to explain the gap.']
    ].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    root.innerHTML = `
      <h1>Course map</h1>
      <p class="muted" style="max-width:760px">How the simulations line up with the 20-session plan for <i>Strategic Decision Making: A Game Theoretic Approach</i> (Term V). Use it to choose which simulation goes with which class.</p>
      <div class="card flat tbl-wrap"><table class="data"><thead><tr><th>Module</th><th>Theme</th><th>Sessions</th><th>Simulations</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h2 class="mt" style="margin-top:32px">Mapping to Course Learning Outcomes</h2>
      <div class="card flat tbl-wrap"><table class="data"><thead><tr><th>CLO</th><th>Outcome</th><th>How StratLab supports it</th></tr></thead><tbody>${clo}</tbody></table></div>
      <h2 style="margin-top:32px">Social-impact threads (SDG links in the outline)</h2>
      <div class="grid">
        <div class="card flat"><h4>Collective action & free riding (SDG 17)</h4><p class="muted mb0">Climate Club public-goods game: free riding, conditional cooperation, and why sanctions or thresholds keep agreements together.</p></div>
        <div class="card flat"><h4>Adverse selection & moral hazard (SDG 8)</h4><p class="muted mb0">Information Lab: lemons markets, credit rationing for MSMEs, and how signals and screening make financial inclusion possible.</p></div>
        <div class="card flat"><h4>Coalitions & fair value sharing (SDG 17)</h4><p class="muted mb0">Coalition Lab: Shapley allocations for consortia, burden sharing in climate finance, and checking stability with the Core.</p></div>
      </div>`;
  }

  function pageFaculty(root) {
    root.innerHTML = `
      <div class="prose" style="max-width:920px">
        <h1>Faculty & facilitator guide</h1>
        <p class="lead" style="font-size:1.08rem;color:var(--ink-2)">Every simulation can run in two ways. In <b>Solo / AI mode</b> students play against calibrated AI rivals on their laptops or phones. In <b>Classroom mode</b> the faculty projects the page and enters the whole class's responses to show aggregate results live. No logins, installs or backend are needed.</p>

        <h3>Session template (works for any game)</h3>
        <div class="guide-grid">
          <div class="card flat"><h4>Before class (10 min)</h4><ul><li>Assign the game's <b>How to play</b> tab as a pre-read.</li><li>Optional: students play 1–2 rounds solo, then export their log.</li></ul></div>
          <div class="card flat"><h4>Hook (5 min)</h4><ul><li>Open with the business problem from the session plan. Each game's header states it.</li><li>Take a quick poll: "What would you do?"</li></ul></div>
          <div class="card flat"><h4>Play (15–25 min)</h4><ul><li>Collect choices by show of hands, Google Form, Mentimeter or chat.</li><li>Paste them into the <b>Classroom mode</b> panel on the projector.</li></ul></div>
          <div class="card flat"><h4>Reveal & theory (15 min)</h4><ul><li>Show the equilibrium using the solver.</li><li>Use the <b>Concepts</b> tab to formalise the result.</li></ul></div>
          <div class="card flat"><h4>Debrief (10–15 min)</h4><ul><li>Use the debrief questions, from comprehension through to managerial judgement.</li><li>Tie the result to an Indian case from <b>In practice</b>.</li></ul></div>
          <div class="card flat"><h4>After class</h4><ul><li>Students use the <b>Working with AI</b> prompt to extend the analysis.</li><li>They submit the exported results log with a 1-page reflection.</li></ul></div>
        </div>

        <h3>Which games have a Classroom mode?</h3>
        <div class="card flat tbl-wrap"><table class="data"><thead><tr><th>Game</th><th>What you collect from students</th><th>What the page computes</th></tr></thead><tbody>
          <tr><td>Beauty Contest</td><td>One number 0–100 each</td><td>Target, winner, histogram, implied depth of reasoning (level-k)</td></tr>
          <tr><td>Price War Matrix Lab</td><td>Choice of row/column strategy</td><td>Outcome frequencies vs Nash prediction</td></tr>
          <tr><td>Bargaining Table</td><td>Ultimatum offers and accept/reject</td><td>Mean offer, rejection rates, empirical acceptance curve</td></tr>
          <tr><td>Auction House</td><td>Sealed bids (and private values)</td><td>Winner, price under 1st/2nd-price rules, winner's curse check</td></tr>
          <tr><td>Climate Club</td><td>Contributions per round</td><td>Group payoff, free-riding index, contribution trend</td></tr>
          <tr><td>Coalition Lab</td><td>Proposed allocation from each team</td><td>Core stability check, distance from Shapley</td></tr>
          <tr><td>Matching Market</td><td>Preference lists</td><td>Stable matching by deferred acceptance, blocking pairs</td></tr>
        </tbody></table></div>

        <h3>Assessment ideas (aligned to the WAI component)</h3>
        <ul>
          <li><b>Model it (CLO 1):</b> students build their own matrix or tree from a news story in Price War Lab or Entry, then defend the payoffs.</li>
          <li><b>Solve it (CLO 2):</b> predict the equilibrium before running the solver, then explain any gap.</li>
          <li><b>Critique it (CLO 3):</b> compare AI or class behaviour with theory and identify which assumption failed (rationality, common knowledge, enforceability, information).</li>
          <li><b>AI-augmented extension:</b> each game includes a "Working with AI" prompt. Grade the quality of the student's critique of the AI output, not the output itself.</li>
        </ul>

        <h3>Practical tips</h3>
        <ul>
          <li>Phones work: the layout adapts to small screens.</li>
          <li>Results are stored only in each student's own browser. Ask them to export from <a href="#/results">My Results</a> before switching devices.</li>
          <li>For anonymous live input, collect responses in a Google Form, copy the response column, and paste it into Classroom mode.</li>
          <li>Payoffs in every model are editable or slider-driven, so you can rebuild a case's numbers in class.</li>
        </ul>
      </div>`;
  }

  function pageResults(root) {
    const log = GT.readLog().slice().reverse();
    const rows = log.map(r => `<tr><td><small>${new Date(r.t).toLocaleString('en-IN')}</small></td><td>${esc(r.title)}</td><td>${esc(r.summary)}</td></tr>`).join('');
    root.innerHTML = `
      <h1>My results</h1>
      <p class="muted" style="max-width:720px">Every completed round or experiment is logged here, in this browser only. Export it as CSV or JSON to attach to your WAI submission or reflection.</p>
      <div class="btn-row" style="margin-bottom:14px">
        <button class="btn primary" id="expCsv" ${log.length ? '' : 'disabled'}>Export CSV</button>
        <button class="btn" id="expJson" ${log.length ? '' : 'disabled'}>Export JSON</button>
        <button class="btn ghost" id="clr" ${log.length ? '' : 'disabled'}>Clear log</button>
        <span class="muted">${log.length} entries</span>
      </div>
      <div class="card flat tbl-wrap">${log.length ? `<table class="data"><thead><tr><th>When</th><th>Game</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted mb0">Nothing logged yet. Play any simulation and your results will appear here.</p>'}</div>`;
    if (!log.length) return;
    $('#expCsv').onclick = () => {
      const q = s => '"' + String(s).replace(/"/g, '""') + '"';
      const csv = ['timestamp,game,summary,data'].concat(GT.readLog().map(r => [r.t, r.title, r.summary, JSON.stringify(r.data)].map(q).join(','))).join('\n');
      GT.download('stratlab-results.csv', csv, 'text/csv');
    };
    $('#expJson').onclick = () => GT.download('stratlab-results.json', JSON.stringify(GT.readLog(), null, 2), 'application/json');
    $('#clr').onclick = () => { if (confirm('Clear all logged results in this browser?')) { GT.clearLog(); pageResults(root); } };
  }

  function pageAbout(root) {
    root.innerHTML = `
      <div class="prose">
        <h1>About this project</h1>
        <p>StratLab is a <b>Working with AI (WAI)</b> project for the Term V elective <i>Strategic Decision Making: A Game Theoretic Approach</i>. It turns the course's session plan into hands-on simulations that students can play alone or that faculty can run live in class.</p>
        <h3>Design principles</h3>
        <ul>
          <li><b>Business first.</b> Every game opens with the managerial problem from the session plan, not with notation.</li>
          <li><b>Theory you can check.</b> Each game has a solver (Nash, IEDS, backward induction, Rubinstein, Shapley/Core, Gale–Shapley, revenue equivalence), so students can test their own reasoning.</li>
          <li><b>Behaviour as well as rationality.</b> AI opponents follow published experimental findings (Nagel 1995; Güth et al. 1982; Fehr & Gächter 2000; Axelrod 1984), so the gap between theory and behaviour shows up in play.</li>
          <li><b>India and global cases.</b> Jio, OPEC+, IPL auctions, 5G spectrum, JoSAA seat allocation, Tata–SIA, Cars24, CCI cement cartel and more.</li>
          <li><b>Zero friction.</b> A static website with no login, no install and no data leaving the browser. It works on GitHub Pages or any static host.</li>
        </ul>
        <h3>How AI was used</h3>
        <ul>
          <li>Generating and stress-testing the payoff structures and checking the equilibria analytically.</li>
          <li>Writing the simulation code, opponent behaviour models and solvers, which were then verified against hand calculations.</li>
          <li>Drafting cases and debrief questions, then editing them for accuracy and MBA level.</li>
        </ul>
        <h3>Main references</h3>
        <ul>
          <li>Dixit, A. K. & Skeath, S. (2015). <i>Games of Strategy</i> (3rd ed.). Norton.</li>
          <li>Osborne, M. J. (2004). <i>An Introduction to Game Theory</i>. OUP.</li>
          <li>Ferguson, T. S. (2020). <i>A Course in Game Theory</i>. World Scientific.</li>
          <li>Nagel (1995) AER; Palacios-Huerta (2003) REStud; Axelrod (1984); Fehr & Gächter (2000) AER; Akerlof (1970) QJE; Spence (1973) QJE; Gale & Shapley (1962); Roth (2015) <i>Who Gets What and Why</i>; Milgrom (2004) <i>Putting Auction Theory to Work</i>; Calvano et al. (2020) AER on algorithmic collusion.</li>
        </ul>
        <p class="muted">Simplified numbers are used for teaching. Case figures are approximate and should be checked against current sources before being quoted in assessed work.</p>
      </div>`;
  }

  /* ---------- game page ---------- */
  function guideHTML(g) {
    const G = g.guide;
    const list = arr => `<ol>${arr.map(x => `<li>${x}</li>`).join('')}</ol>`;
    const ul = arr => `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
    return `<div class="prose" style="max-width:980px">
      <div class="note"><p><b>Objective.</b> ${G.objective}</p></div>
      <div class="guide-grid">
        <div class="card flat"><h4>At a glance</h4>
          <table class="data"><tbody>
            <tr><td><b>Time</b></td><td>${esc(g.time)}</td></tr>
            <tr><td><b>Players</b></td><td>${G.players}</td></tr>
            <tr><td><b>Modes</b></td><td>${G.modes}</td></tr>
            <tr><td><b>Sessions</b></td><td>${esc(g.sessions)}</td></tr>
            <tr><td><b>Concepts</b></td><td>${g.concepts.map(esc).join(', ')}</td></tr>
          </tbody></table>
        </div>
        <div class="card flat"><h4>Your role & the rules</h4>${G.rules}</div>
      </div>
      <h3>Step by step: students</h3>${list(G.steps)}
      <h3>Running it in class: faculty</h3>${list(G.facilitator)}
      ${G.variations ? `<h3>Variations & extensions</h3>${ul(G.variations)}` : ''}
    </div>`;
  }

  function practiceHTML(g) {
    return `<div class="grid">${g.practice.map(c => `<div class="case"><span class="chip ${c.tag === 'India' ? 'amber' : c.tag === 'Frontier' ? 'accent' : ''}">${esc(c.tag)}</span><h4>${c.title}</h4><p class="mb0" style="color:var(--ink-2);font-size:.93rem">${c.text}</p></div>`).join('')}</div>`;
  }

  function debriefHTML(g) {
    return `<div class="prose" style="max-width:920px">
      <h3 style="margin-top:0">Debrief questions</h3>
      <ol>${g.debrief.map(q => `<li>${q}</li>`).join('')}</ol>
      <h3>Working with AI: extension prompt</h3>
      <p class="muted">Paste this into Claude, ChatGPT or Gemini after playing. Then critique the answer: which assumptions did the AI make, and where is it wrong or too confident?</p>
      <div class="prompt-box"><button class="btn sm" id="copyPrompt">Copy</button>${esc(g.aiPrompt)}</div>
    </div>`;
  }

  function pageGame(root, id, tab) {
    const g = GT.byId(id);
    if (!g) { root.innerHTML = '<h1>Not found</h1><p><a href="#/">Back to home</a></p>'; return; }
    const idx = GT.games.indexOf(g);
    const prev = GT.games[idx - 1], next = GT.games[idx + 1];
    const mod = MODULES.find(m => m.id === g.modules[0]);
    const qs = g.guide.steps.slice(0, 3).map(s => `<li>${s}</li>`).join('');
    root.innerHTML = `
      <div class="crumb"><a href="#/">Home</a> › ${mod ? esc(mod.id + ' · ' + mod.name) : ''} › Session ${esc(g.sessions)}</div>
      <div class="game-head">${badge(g)}<h1>${esc(GT.shortTitle(g))}</h1></div>
      <p class="game-sub">${esc(g.tagline)}</p>
      <details class="problem"><summary>The business problem · ${esc(g.time)}</summary><p>${g.problem}</p></details>
      <div class="tabs" role="tablist">
        <button class="tab" data-t="play">Play</button>
        <button class="tab" data-t="guide">How to play</button>
        <button class="tab" data-t="theory">Theory</button>
        <button class="tab" data-t="practice">Real cases</button>
        <button class="tab" data-t="debrief">Debrief</button>
      </div>
      <div id="pane-play">
        <div class="quickstart" id="qs"><b>Quick start</b><ol>${qs}</ol><button class="x" id="qsx" title="Hide">✕</button></div>
        <div id="play-root"></div>
      </div>
      <div id="pane-guide" class="hide">${guideHTML(g)}</div>
      <div id="pane-theory" class="hide"><div class="prose" style="max-width:900px">${g.theory}</div></div>
      <div id="pane-practice" class="hide">${practiceHTML(g)}</div>
      <div id="pane-debrief" class="hide">${debriefHTML(g)}</div>
      <nav class="pager">
        ${prev ? `<a href="#/game/${prev.id}"><small>← Previous</small><span>${esc(GT.shortTitle(prev))}</span></a>` : '<span></span>'}
        ${next ? `<a href="#/game/${next.id}" style="text-align:right;margin-left:auto"><small>Next →</small><span>${esc(GT.shortTitle(next))}</span></a>` : '<span></span>'}
      </nav>`;
    let qsHidden = false;
    try { qsHidden = localStorage.getItem('stratlab.qs.' + g.id) === '1'; } catch (e) { }
    if (qsHidden) $('#qs').classList.add('hide');
    $('#qsx').onclick = () => { $('#qs').classList.add('hide'); try { localStorage.setItem('stratlab.qs.' + g.id, '1'); } catch (e) { } };
    g.render($('#play-root'));
    // turn secondary cards into collapsible sections
    $$('[data-fold]', root).forEach(card => {
      const d = document.createElement('details'); d.className = 'fold';
      const s = document.createElement('summary'); s.textContent = card.dataset.fold; d.appendChild(s);
      while (card.firstChild) d.appendChild(card.firstChild);
      card.appendChild(d);
    });
    $('#copyPrompt').onclick = () => GT.copy(g.aiPrompt);
    const show = t => {
      $$('.tab', root).forEach(b => b.classList.toggle('active', b.dataset.t === t));
      ['play', 'guide', 'theory', 'practice', 'debrief'].forEach(k => $('#pane-' + k).classList.toggle('hide', k !== t));
    };
    $$('.tab', root).forEach(b => b.addEventListener('click', () => {
      show(b.dataset.t);
      history.replaceState(null, '', `#/game/${g.id}${b.dataset.t === 'play' ? '' : '/' + b.dataset.t}`);
    }));
    show(tab || 'play');
  }

  /* ---------- router ---------- */
  function route() {
    const root = $('#app');
    const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    const page = parts[0] || '';
    $$('.side-link').forEach(a => a.classList.toggle('active', a.dataset.p === (page || 'home')));
    $$('.side-game').forEach(a => a.classList.toggle('active', page === 'game' && a.dataset.g === parts[1]));
    if (page === 'games') pageGames(root);
    else if (page === 'game') pageGame(root, parts[1], parts[2]);
    else if (page === 'course') pageCourse(root);
    else if (page === 'faculty') pageFaculty(root);
    else if (page === 'results') pageResults(root);
    else if (page === 'about') pageAbout(root);
    else pageHome(root);
    if (!(page === 'game' && parts[2])) window.scrollTo(0, 0);
    const act = $('.side-game.active'); if (act) act.scrollIntoView({ block: 'nearest' });
    document.title = page === 'game' && GT.byId(parts[1]) ? `${GT.shortTitle(GT.byId(parts[1]))} · StratLab` : 'StratLab · Game Theory Simulations';
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', () => { GT.games.sort((a, b) => a.num - b.num); renderSidebar(); initTheme(); route(); });
})();
