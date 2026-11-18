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

  const SHORT = { 'price-war': 'Price War Lab', 'beauty-contest': 'Beauty Contest', duopoly: 'Cournot vs Bertrand', mixed: 'Audits & Penalty Kicks', entry: 'Entry & Commitment', bargaining: 'Bargaining Table', repeated: 'OPEC Cartel', information: 'Lemons & Signals', auction: 'Auction House', coalition: 'Shapley & Core', matching: 'Matching Market', 'public-goods': 'Climate Club', rollback: 'Rollback Lab', bayesian: 'Hidden Types' };
  const no2 = g => String(g.num).padStart(2, '0');
  const MCOL = { M1: '#2e6f9e', M2: '#2f8f83', M3: '#7a5195', M4: '#a23b72', M5: '#5c7f3a', M6: '#b9801b', M7: '#3f5fb0', M8: '#1f8a9e', M9: '#b04a4a', M10: '#3e7b58' };
  const colorOf = g => MCOL[g.modules[0]] || '#13294b';
  const playedCounts = () => { const c = {}; GT.readLog().forEach(r => { c[r.game] = (c[r.game] || 0) + 1; }); return c; };
  function markPlayed() { const c = playedCounts(); $$('.side-game').forEach(a => a.classList.toggle('played', !!c[a.dataset.g])); }
  GT.onLog = () => { markPlayed(); const m = $('#heroPlays'); if (m) paintPlays(m.dataset.g); };
  function paintPlays(id) {
    const el = $('#heroPlays'); if (!el) return;
    const recs = GT.readLog().filter(r => r.game === id);
    el.innerHTML = recs.length ? `<b>${recs.length}</b> result${recs.length > 1 ? 's' : ''} logged · last: ${esc(recs[recs.length - 1].summary)}` : 'Not played yet';
  }
  const badge = g => `<span class="mono" style="color:var(--muted)">${no2(g)}</span>`;
  GT.shortTitle = g => SHORT[g.id] || g.title;
  const LOGO = `<svg class="brand-mark" viewBox="0 0 30 30" aria-hidden="true"><rect x="1" y="1" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"/><line x1="15" y1="1" x2="15" y2="29" stroke="currentColor" stroke-width="2"/><line x1="1" y1="15" x2="29" y2="15" stroke="currentColor" stroke-width="2"/><rect x="16" y="16" width="12" height="12" fill="#ffe45c"/></svg>`;

  /* ---------- theme (light by default) ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    const b = $('#themeBtn'); if (b) b.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
  }
  function initTheme() {
    let saved = 'light';
    try { saved = localStorage.getItem('stratlab.theme') || 'light'; } catch (e) { }
    setTheme(saved);
  }

  /* ---------- sidebar: a table of contents ---------- */
  /* ---------- student details (name + roll number) ---------- */
  GT.askIdentity = (opts = {}) => {
    if ($('.modal-back')) return;
    const launch = !!opts.launch;
    const cur = GT.identity() || { name: '', roll: '' };
    const wrap = document.createElement('div');
    wrap.className = 'modal-back' + (launch ? ' launch' : '');
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="idTitle">
      ${launch ? `<div class="launch-brand">${LOGO}<span><b>StratLab</b><small>Strategic Decision Making: A Game Theoretic Approach</small></span></div>` : ''}
      <div class="kicker">${launch ? 'Sign in' : 'Your details'}</div>
      <h2 id="idTitle">${launch ? 'Enter your name and roll number' : 'Change name or roll number'}</h2>
      <p>When you finish a game, your name, roll number, choices and result are sent to the course's Google Sheet, along with the time. Only the course team can open it.</p>
      <div class="field"><label for="idName">Full name</label><input type="text" id="idName" maxlength="60" autocomplete="name" value="${esc(cur.name)}"></div>
      <div class="field"><label for="idRoll">Roll number</label><input type="text" id="idRoll" maxlength="20" autocomplete="off" value="${esc(cur.roll)}"></div>
      <p class="idErr" id="idErr"></p>
      <div class="btn-row"><button class="btn primary" id="idSave">${launch ? 'Sign in' : 'Save'}</button>${launch ? '' : '<button class="btn ghost" id="idCancel">Cancel</button>'}</div>
      ${launch ? '<p class="guest"><a href="#" id="idSkip">Faculty or visitor? Continue without recording results</a></p>' : ''}
    </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('modal-open');
    const close = () => { wrap.remove(); document.body.classList.remove('modal-open'); paintWho(); if (opts.onDone) opts.onDone(); };
    $('#idName').focus();
    $('#idSave').onclick = () => {
      const name = $('#idName').value.trim().replace(/\s+/g, ' ');
      const roll = $('#idRoll').value.trim().toUpperCase();
      if (!/^[\p{L} .'-]{2,60}$/u.test(name)) { $('#idErr').textContent = 'Enter your full name (letters only).'; return; }
      if (!/^[A-Z0-9/_-]{2,20}$/.test(roll)) { $('#idErr').textContent = 'Enter your roll number (letters, digits, / - _ only).'; return; }
      GT.setIdentity(name, roll);
      try { sessionStorage.removeItem('stratlab.skipId'); } catch (e) { }
      GT.resendUnsent();
      close();
    };
    const skip = $('#idSkip');
    if (skip) skip.onclick = e => { e.preventDefault(); try { sessionStorage.setItem('stratlab.skipId', '1'); } catch (er) { } close(); };
    const cancel = $('#idCancel');
    if (cancel) cancel.onclick = close;
    wrap.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') $('#idSave').click(); if (e.key === 'Escape' && !launch) close(); });
  };
  GT.signOut = () => {
    GT.clearIdentity();
    try { sessionStorage.removeItem('stratlab.skipId'); } catch (e) { }
    paintWho();
    location.hash = '#/';
    GT.askIdentity({ launch: true });
  };
  function launchGate() {
    let skipped = false; try { skipped = sessionStorage.getItem('stratlab.skipId') === '1'; } catch (e) { }
    if (GT.sheetOn() && !GT.identity() && !skipped) GT.askIdentity({ launch: true });
  }
  function paintWho() {
    const box = $('#whoBox'); if (!box) return;
    if (!GT.sheetOn()) { box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = '';
    const w = GT.identity();
    box.innerHTML = w ? `<span class="kicker">Signed in as</span><b>${esc(w.name)}</b> <span class="mono">${esc(w.roll)}</span><br><a href="#" id="whoEdit">edit</a> · <a href="#" id="whoOut">sign out</a>`
      : `<span class="kicker">Guest · results not recorded</span><a href="#" id="whoIn">Sign in</a>`;
    const ed = $('#whoEdit'); if (ed) ed.onclick = e => { e.preventDefault(); GT.askIdentity(); };
    const out = $('#whoOut'); if (out) out.onclick = e => { e.preventDefault(); GT.signOut(); };
    const inn = $('#whoIn'); if (inn) inn.onclick = e => { e.preventDefault(); GT.askIdentity({ launch: true }); };
  }
  GT.paintWho = paintWho;

  function renderSidebar() {
    const sb = $('#sidebar');
    const mods = MODULES.map(m => {
      const gs = GT.games.filter(g => g.modules[0] === m.id);
      if (!gs.length) return '';
      return `<div class="side-sec" style="--sec:${MCOL[m.id]}">${m.id} · ${esc(m.name.split(':')[0].replace('?', ''))}</div>` +
        gs.map(g => `<a class="side-game" data-g="${g.id}" href="#/game/${g.id}" data-search="${esc((g.title + ' ' + g.concepts.join(' ') + ' ' + g.tagline).toLowerCase())}"><span class="no">${no2(g)}</span><span>${esc(GT.shortTitle(g))}</span></a>`).join('');
    }).join('');
    sb.innerHTML = `
      <a class="brand" href="#/">${LOGO}<span><b>StratLab</b><small>Strategic Decision Making</small></span></a>
      <div class="who" id="whoBox"></div>
      <input class="side-search" id="sideSearch" type="search" placeholder="Find a game or concept">
      <a class="side-link" data-p="home" href="#/">Contents</a>
      <a class="side-link" data-p="choose" href="#/choose">Which model fits?</a>
      <a class="side-link" data-p="course" href="#/course">Course map</a>
      <a class="side-link" data-p="faculty" href="#/faculty">For faculty</a>
      <a class="side-link" data-p="results" href="#/results">My results</a>
      <div id="sideGames">${mods}</div>
      <div class="side-foot"><button class="theme-btn" id="themeBtn">Dark mode</button></div>`;
    paintWho();
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

  /* ---------- home: contents table ---------- */
  function pageHome(root) {
    const c = playedCounts();
    const played = GT.games.filter(g => c[g.id]).length;
    const nextG = GT.games.find(g => !c[g.id]) || GT.games[0];
    const deco = `<svg class="deco" viewBox="0 0 120 120" aria-hidden="true"><rect x="2" y="2" width="116" height="116" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/><line x1="60" y1="2" x2="60" y2="118" stroke="rgba(255,255,255,.35)" stroke-width="2"/><line x1="2" y1="60" x2="118" y2="60" stroke="rgba(255,255,255,.35)" stroke-width="2"/><rect x="62" y="62" width="54" height="54" fill="#ffd84d"/><text x="31" y="36" text-anchor="middle" fill="rgba(255,255,255,.75)" font-family="Roboto Mono" font-size="13">3,3</text><text x="89" y="36" text-anchor="middle" fill="rgba(255,255,255,.75)" font-family="Roboto Mono" font-size="13">0,5</text><text x="31" y="94" text-anchor="middle" fill="rgba(255,255,255,.75)" font-family="Roboto Mono" font-size="13">5,0</text><text x="89" y="94" text-anchor="middle" fill="#13294b" font-family="Roboto Mono" font-size="13" font-weight="600">1,1</text></svg>`;
    const mods = MODULES.map(m => {
      const gs = GT.games.filter(g => g.modules[0] === m.id);
      if (!gs.length) return '';
      return `<section class="mod-card" style="--c:${MCOL[m.id]}"><div class="kicker">Module ${m.id.slice(1)} · Sessions ${m.sessions}</div><h3>${esc(m.name)}</h3>
        ${gs.map(g => `<a class="mod-game" href="#/game/${g.id}"><span class="n">${no2(g)}</span><span><span class="t">${esc(GT.shortTitle(g))}</span><p>${esc(g.tagline)}</p></span><span class="st ${c[g.id] ? 'ok' : ''}">${c[g.id] ? '✓ played' : esc(g.time)}</span></a>`).join('')}</section>`;
    }).join('');
    root.innerHTML = `
      <header class="masthead">
        ${deco}
        <div class="kicker">Strategic Decision Making: A Game Theoretic Approach · MBA Term V</div>
        <h1>StratLab</h1>
        <p class="lead">Fourteen classroom games that follow the session plan. Play against the computer or with your class, then check what happened against the theory.</p>
        <div class="btn-row"><a class="btn primary" href="#/game/${nextG.id}">${played ? 'Continue with' : 'Start with'} ${no2(nextG)} ${esc(GT.shortTitle(nextG))}</a><a class="btn" href="#/choose">Which model fits my problem?</a></div>
      </header>
      <div class="home-two">
        <div class="card"><div class="progress-card"><div><h4 style="margin:0">Your progress</h4><span class="big">${played}</span> <span class="muted">of ${GT.games.length} games played</span></div><div class="pbar"><i style="width:${played / GT.games.length * 100}%"></i></div></div></div>
        <div class="card"><h4>Running a class?</h4><p>Seven games have a classroom mode for collecting the whole class's choices. <a href="#/faculty">See the faculty page</a>.</p></div>
      </div>
      <div class="mod-grid">${mods}</div>`;
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
      ['CLO 3', 'Evaluate assumptions; when behaviour changes the predictions', 'Computer opponents are modelled loosely on experimental findings (ultimatum rejections, level-k reasoning, conditional cooperation), so play regularly departs from theory. Debrief questions ask students to explain the gap.']
    ].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    root.innerHTML = `
      <div class="page-head"><div class="kicker">Session plan</div><h1>Course map</h1>
      <p class="lead">How the simulations line up with the 20-session plan for <i>Strategic Decision Making: A Game Theoretic Approach</i> (Term V). Use it to choose which simulation goes with which class.</p></div>
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
        <div class="page-head"><div class="kicker">For faculty</div><h1>Running the games in class</h1>
        <p class="lead">Every simulation can be used by students on their own laptops or phones. Seven of them also have a <b>Classroom mode</b>, where the faculty projects the page and enters the whole class's responses to show aggregate results live. Nothing needs installing. Students sign in with their name and roll number, and faculty can continue as guests.</p></div>

        <h3>Session template (works for any game)</h3>
        <div class="guide-grid">
          <div class="card flat"><h4>Before class (10 min)</h4><ul><li>Assign the game's <b>How to play</b> tab as a pre-read.</li><li>Optional: students play 1–2 rounds solo, then export their log.</li></ul></div>
          <div class="card flat"><h4>Hook (5 min)</h4><ul><li>Open with the business problem from the session plan. Each game's header states it.</li><li>Take a quick poll: "What would you do?"</li></ul></div>
          <div class="card flat"><h4>Play (15–25 min)</h4><ul><li>Collect choices by show of hands, Google Form, Mentimeter or chat.</li><li>Paste them into the <b>Classroom mode</b> panel on the projector.</li></ul></div>
          <div class="card flat"><h4>Reveal & theory (15 min)</h4><ul><li>Show the equilibrium using the solver.</li><li>Use the <b>Theory</b> tab to formalise the result.</li></ul></div>
          <div class="card flat"><h4>Debrief (10–15 min)</h4><ul><li>Use the debrief questions, from comprehension through to managerial judgement.</li><li>Tie the result to an Indian case from <b>Real cases</b>.</li></ul></div>
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

        <h3>Accuracy of the content</h3>
        <p>This site was built with an AI assistant (Claude). Equilibrium results were recalculated separately and compared with the course slides where worked answers exist. Case facts, figures and statistics quoted from studies have not been verified against original sources, and computer opponents are teaching approximations. Check any figure before quoting it in assessed work.</p>
        <h3>Practical tips</h3>
        <ul>
          <li>Phones work: the layout adapts to small screens.</li>
          <li>When a signed-in student finishes a game, their name, roll number, choices and result are sent to the course Google Sheet, which only people it is shared with can open. Guests' results stay in their own browser.</li>
          <li>Progress ticks are kept per browser, so they do not follow a student to another device. Results already sent stay in the Sheet.</li>
          <li>Continue as a guest when projecting Classroom mode. If you are signed in, whatever you paste there is sent to the Sheet under your name.</li>
          <li>For anonymous live input, collect responses in a Google Form, copy the response column, and paste it into Classroom mode.</li>
          <li>Payoffs in every model are editable or slider-driven, so you can rebuild a case's numbers in class.</li>
        </ul>
      </div>`;
  }

  function syncPanel(log) {
    if (!GT.sheetOn()) return '';
    const w = GT.identity(), unsent = log.filter(r => !r.sent).length;
    if (!w) return `<div class="note amber"><p><b>Your results are not being sent.</b> Add your name and roll number so the course team receives them.</p><div class="btn-row"><button class="btn primary sm" id="changeId">Add name and roll number</button></div></div>`;
    return `<div class="note good"><p><b>Sending results as ${esc(w.name)} (${esc(w.roll)}).</b> ${log.length - unsent} of ${log.length} result(s) sent from this browser.</p><div class="btn-row">${unsent ? `<button class="btn primary sm" id="resend">Send ${unsent} unsent result(s)</button>` : ''}<button class="btn sm" id="changeId">Change name or roll number</button></div></div>`;
  }

  function pageResults(root) {
    const log = GT.readLog().slice().reverse();
    const rows = log.map(r => `<tr><td><small>${new Date(r.t).toLocaleString('en-IN')}</small></td><td>${esc(r.title)}</td><td>${esc(r.summary)}</td>${GT.sheetOn() ? `<td>${r.sent ? 'yes' : '<span class="muted">no</span>'}</td>` : ''}</tr>`).join('');
    root.innerHTML = `
      <div class="page-head"><div class="kicker">Your log</div><h1>My results</h1>
      <p class="lead">Every completed game is logged here. ${GT.sheetOn() ? 'If you have entered your name and roll number, each result is also sent to the course sheet.' : 'This copy of the site is not connected to a course sheet, so results stay in this browser. Export them as CSV or JSON to submit.'}</p></div>
      ${syncPanel(log)}
      <div class="btn-row" style="margin-bottom:14px">
        <button class="btn primary" id="expCsv" ${log.length ? '' : 'disabled'}>Export CSV</button>
        <button class="btn" id="expJson" ${log.length ? '' : 'disabled'}>Export JSON</button>
        <button class="btn ghost" id="clr" ${log.length ? '' : 'disabled'}>Clear log</button>
        <span class="muted">${log.length} entries</span>
      </div>
      <div class="card flat tbl-wrap">${log.length ? `<table class="data"><thead><tr><th>When</th><th>Game</th><th>Result</th>${GT.sheetOn() ? '<th>Sent</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted mb0">Nothing logged yet. Play any simulation and your results will appear here.</p>'}</div>`;
    const rs = $('#resend'); if (rs) rs.onclick = async () => { rs.disabled = true; rs.textContent = 'Sending…'; const n = await GT.resendUnsent(); GT.toast(n + ' result(s) sent'); pageResults(root); };
    const ch = $('#changeId'); if (ch) ch.onclick = () => GT.askIdentity({ onDone: () => pageResults(root) });
    if (!log.length) return;
    $('#expCsv').onclick = () => {
      const q = s => '"' + String(s).replace(/"/g, '""') + '"';
      const csv = ['timestamp,game,summary,data'].concat(GT.readLog().map(r => [r.t, r.title, r.summary, JSON.stringify(r.data)].map(q).join(','))).join('\n');
      GT.download('stratlab-results.csv', csv, 'text/csv');
    };
    $('#expJson').onclick = () => GT.download('stratlab-results.json', JSON.stringify(GT.readLog(), null, 2), 'application/json');
    $('#clr').onclick = () => { if (confirm('Clear all logged results in this browser?')) { GT.clearLog(); pageResults(root); } };
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
    return `<div class="grid">${g.practice.map(c => `<div class="case"><span class="chip ${c.tag === 'India' ? 'amber' : c.tag === 'Frontier' ? 'accent' : ''}">${esc(c.tag === 'Frontier' ? 'Recent research' : c.tag)}</span><h4>${c.title}</h4><p class="mb0" style="color:var(--ink-2);font-size:.93rem">${c.text}</p></div>`).join('')}</div>`;
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


  /* ---------- which model fits? (Sessions 17 & 20) ---------- */
  const QTREE = {
    start: { q: 'Can the parties sign binding, enforceable agreements about how the value is shared?', o: [['Yes, contracts can be enforced', 'coop'], ['No, each side acts in its own interest', 'time']] },
    coop: { q: 'What has to be decided?', o: [['How two parties split a deal', 'R:bargaining'], ['How three or more partners share joint value or costs', 'R:coalition'], ['Who is paired with whom, when prices cannot clear the market', 'R:matching']] },
    time: { q: 'When a player chooses, has it seen what the others chose?', o: [['No, choices are effectively simultaneous', 'rep'], ['Yes, players move in turn', 'seqinfo']] },
    rep: { q: 'Is the same interaction repeated, with no known last round?', o: [['No, it is a one-off', 'priv'], ['Yes, between a few rivals', 'R:repeated'], ['Yes, many players contribute to a shared resource', 'R:public-goods']] },
    priv: { q: 'Does any player hold private information that matters, such as its own valuation?', o: [['Yes, e.g. bidders know only their own value', 'R:auction'], ['No', 'strat']] },
    strat: { q: 'What do the strategies look like?', o: [['A few discrete options (cut or hold, launch or wait)', 'pure'], ['Continuous quantities or prices', 'R:duopoly'], ['Guessing what others will guess', 'R:beauty-contest']] },
    pure: { q: 'Is there a stable choice each side can stick to, or does being predictable get exploited?', o: [['There is a stable choice', 'R:price-war'], ['Predictability gets exploited', 'R:mixed']] },
    seqinfo: { q: 'Does the first mover know something important that the second mover does not?', o: [['Yes (quality, ability, risk)', 'R:information'], ['No, both know the payoffs', 'seq']] },
    seq: { q: 'What is the main question?', o: [['Whether a threat or commitment is credible; when to enter or invest', 'R:entry'], ['How value is split through offers and counter-offers', 'R:bargaining']] }
  };
  const REASON = {
    'price-war': 'A one-off simultaneous game with discrete choices: write the payoff matrix, look for dominant strategies, then Nash equilibrium.',
    'beauty-contest': 'Payoffs depend on predicting others\' beliefs. Iterated dominance gives the theory; level-k reasoning describes what people actually do.',
    duopoly: 'Simultaneous choice of a continuous variable: Cournot if capacity is the commitment, Bertrand if prices adjust easily.',
    mixed: 'There is no pure-strategy equilibrium, so the solution is a mixed strategy that keeps the opponent indifferent.',
    entry: 'Draw the game tree and solve it by backward induction. Keep only threats that are credible (subgame perfection).',
    bargaining: 'Use BATNAs and the Nash bargaining solution for the split; Rubinstein if patience and the timing of offers matter.',
    repeated: 'Repeated play lets the threat of future punishment support cooperation. Check the critical discount factor.',
    information: 'Asymmetric information: look for adverse selection first, then signalling or screening as the remedy.',
    auction: 'A Bayesian game with private values: pick the bidding strategy for the format, and watch for the winner\'s curse if values are common.',
    coalition: 'A cooperative game: write the characteristic function, compute the Shapley value and test it against the Core.',
    matching: 'Two-sided matching: look for a stable matching (no blocking pairs), for example by deferred acceptance.',
    'public-goods': 'An n-player social dilemma: free riding is individually rational, so look at institutions such as sanctions, thresholds or clubs.'
  };
  function pageChoose(root) {
    const path = [];
    function draw() {
      const cur = path.length ? path[path.length - 1].to : 'start';
      const trail = path.map(p => `<li><span class="muted">${esc(QTREE[p.from].q)}</span><br><b>${esc(p.label)}</b></li>`).join('');
      let body;
      if (cur.startsWith('R:')) {
        const g = GT.byId(cur.slice(2));
        body = `<div class="card result-card"><div class="panel-title">Suggested model</div><h2 style="margin:0 0 8px">${no2(g)} · ${esc(GT.shortTitle(g))}</h2><p>${esc(REASON[g.id])}</p><p class="muted" style="font-size:.88rem">Concepts: ${g.concepts.map(esc).join(', ')}</p><div class="btn-row"><a class="btn primary" href="#/game/${g.id}">Open the game</a><button class="btn" id="chRestart">Start again</button></div></div>`;
      } else {
        const n = QTREE[cur];
        body = `<div class="card"><div class="panel-title">Question ${path.length + 1}</div><h3>${esc(n.q)}</h3><div class="choice-list">${n.o.map((o, i) => `<button class="choice" data-i="${i}">${esc(o[0])}</button>`).join('')}</div>${path.length ? '<button class="btn ghost sm mt" id="chBack">← Back</button>' : ''}</div>`;
      }
      root.innerHTML = `<div class="page-head"><div class="kicker">Sessions 17 &amp; 20 · Practitioner's framework</div><h1>Which model fits?</h1><p class="lead">Answer a few questions about the situation and you will be pointed to the model and the simulation that apply. Try it on an example from your internship.</p></div>
        <div class="layout-2r"><div>${body}</div><div class="card flat"><div class="panel-title">Your answers</div>${trail ? `<ol class="trail">${trail}</ol>` : '<p class="muted mb0">None yet.</p>'}</div></div>
        <h2 style="margin-top:36px">The same framework as a table</h2>
        <div class="card flat tbl-wrap"><table class="data"><thead><tr><th>If the situation has…</th><th>Use</th><th>Simulation</th></tr></thead><tbody>
          <tr><td>Enforceable agreements, 2 parties</td><td>Nash bargaining, BATNA</td><td><a href="#/game/bargaining">Bargaining Table</a></td></tr>
          <tr><td>Enforceable agreements, 3+ partners</td><td>Characteristic function, Core, Shapley value</td><td><a href="#/game/coalition">Shapley &amp; Core</a></td></tr>
          <tr><td>Pairing without prices</td><td>Stable matching, deferred acceptance</td><td><a href="#/game/matching">Matching Market</a></td></tr>
          <tr><td>Simultaneous, one-off, discrete choices</td><td>Dominance, Nash equilibrium (pure or mixed)</td><td><a href="#/game/price-war">Price War Lab</a>, <a href="#/game/mixed">Audits &amp; Penalty Kicks</a></td></tr>
          <tr><td>Simultaneous, continuous quantities or prices</td><td>Cournot, Bertrand</td><td><a href="#/game/duopoly">Cournot vs Bertrand</a></td></tr>
          <tr><td>Sequential, full information</td><td>Backward induction, SPNE, commitment, brinkmanship</td><td><a href="#/game/entry">Entry &amp; Commitment</a></td></tr>
          <tr><td>Repeated interaction</td><td>Trigger strategies, critical discount factor</td><td><a href="#/game/repeated">OPEC Cartel</a>, <a href="#/game/public-goods">Climate Club</a></td></tr>
          <tr><td>Private information</td><td>Adverse selection, signalling, screening, auctions</td><td><a href="#/game/information">Lemons &amp; Signals</a>, <a href="#/game/auction">Auction House</a></td></tr>
        </tbody></table></div>`;
      $$('.choice', root).forEach(b => b.onclick = () => { const o = QTREE[cur].o[+b.dataset.i]; path.push({ from: cur, label: o[0], to: o[1] }); draw(); });
      const back = $('#chBack', root); if (back) back.onclick = () => { path.pop(); draw(); };
      const rs = $('#chRestart', root); if (rs) rs.onclick = () => { path.length = 0; draw(); };
    }
    draw();
  }

  function pageGame(root, id, tab) {
    const g = GT.byId(id);
    if (!g) { root.innerHTML = '<h1>Not found</h1><p><a href="#/">Back to home</a></p>'; return; }
    const idx = GT.games.indexOf(g);
    const prev = GT.games[idx - 1], next = GT.games[idx + 1];
    const mod = MODULES.find(m => m.id === g.modules[0]);
    const steps = g.guide.steps.slice(0, 4);
    let ticks = [];
    try { ticks = JSON.parse(localStorage.getItem('stratlab.mission.' + g.id) || '[]'); } catch (e) { }
    const qs = steps.map((st, i) => `<li class="${ticks.includes(i) ? 'done' : ''}"><input type="checkbox" data-mi="${i}" ${ticks.includes(i) ? 'checked' : ''} aria-label="Mark step ${i + 1} done"><span>${st}</span></li>`).join('');
    root.innerHTML = `
      <header class="game-head">
        <div class="hero-row">
          <div class="hero-no">${no2(g)}</div>
          <div style="flex:1;min-width:0">
            <div class="kicker">${mod ? esc('Module ' + mod.id.slice(1) + ' · ' + mod.name) : ''}</div>
            <h1>${esc(GT.shortTitle(g))}</h1>
            <p class="game-sub">${esc(g.tagline)}</p>
            <div class="hero-meta"><span>Session <b>${esc(g.sessions)}</b></span><span>Time <b>${esc(g.time)}</b></span><span>Concepts <b>${g.concepts.slice(0, 3).map(esc).join(', ')}</b></span><span id="heroPlays" data-g="${g.id}"></span></div>
          </div>
        </div>
        <div class="brief"><span class="kicker">The business problem</span>${g.problem}</div>
      </header>
      <div class="tabs" role="tablist">
        <button class="tab" data-t="play">Simulation</button>
        <button class="tab" data-t="guide">How to play</button>
        <button class="tab" data-t="theory">Theory</button>
        <button class="tab" data-t="practice">Real cases</button>
        <button class="tab" data-t="debrief">Debrief</button>
      </div>
      <div id="pane-play">
        <div class="mission" id="qs"><div class="mhead">Your mission<div class="bar"><i id="mbar"></i></div><small id="mcount"></small></div><div><ul>${qs}</ul><div class="more"><a href="#/game/${g.id}/guide" id="mfull">Full step-by-step guide</a></div></div></div>
        <div id="play-root"></div>
      </div>
      <div id="pane-guide" class="hide">${guideHTML(g)}</div>
      <div id="pane-theory" class="hide"><div class="prose" style="max-width:900px">${g.theory}</div></div>
      <div id="pane-practice" class="hide">${practiceHTML(g)}</div>
      <div id="pane-debrief" class="hide">${debriefHTML(g)}</div>
      <nav class="pager">
        ${prev ? `<a href="#/game/${prev.id}"><small>← Previous game</small><span>${no2(prev)} ${esc(GT.shortTitle(prev))}</span></a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/game/${next.id}"><small>Next game →</small><span>${no2(next)} ${esc(GT.shortTitle(next))}</span></a>` : '<span></span>'}
      </nav>`;
    const paintMission = () => {
      const done = $$('#qs input', root).filter(c => c.checked).length;
      $('#mbar').style.width = (done / steps.length * 100) + '%';
      $('#mcount').textContent = done === steps.length ? 'All steps done. Try the debrief questions.' : `${done} of ${steps.length} steps done`;
    };
    $$('#qs input', root).forEach(c => c.onchange = () => {
      c.closest('li').classList.toggle('done', c.checked);
      const t = $$('#qs input', root).map((x, i) => x.checked ? i : -1).filter(i => i >= 0);
      try { localStorage.setItem('stratlab.mission.' + g.id, JSON.stringify(t)); } catch (e) { }
      paintMission();
    });
    paintMission();
    $('#mfull').onclick = e => { e.preventDefault(); $('.tab[data-t=guide]', root).click(); window.scrollTo(0, $('.tabs', root).offsetTop - 10); };
    paintPlays(g.id);
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
    const gg = page === 'game' ? GT.byId(parts[1]) : null;
    document.documentElement.style.setProperty('--mod', gg ? colorOf(gg) : '#13294b');
    markPlayed();
    $$('.side-game').forEach(a => a.classList.toggle('active', page === 'game' && a.dataset.g === parts[1]));
    if (page === 'games') pageGames(root);
    else if (page === 'game') pageGame(root, parts[1], parts[2]);
    else if (page === 'course') pageCourse(root);
    else if (page === 'choose') pageChoose(root);
    else if (page === 'faculty') pageFaculty(root);
    else if (page === 'results') pageResults(root);
    else pageHome(root);
    if (!(page === 'game' && parts[2])) window.scrollTo(0, 0);
    const act = $('.side-game.active'); if (act) act.scrollIntoView({ block: 'nearest' });
    document.title = page === 'game' && GT.byId(parts[1]) ? `${GT.shortTitle(GT.byId(parts[1]))} · StratLab` : 'StratLab · Game Theory Simulations';
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', () => { GT.games.sort((a, b) => a.num - b.num); renderSidebar(); initTheme(); route(); launchGate(); });
})();
