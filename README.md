# StratLab: Game Theory Simulation Studio

A WAI (Working with AI) project for **Strategic Decision Making: A Game Theoretic Approach** (MBA Term V).
It contains 12 interactive simulations mapped to the 20-session plan. Each one has an AI opponent, a classroom mode, guidelines, theory, Indian and global cases, debrief questions and an AI extension prompt.

| # | Simulation | Module / Session | Core concepts |
|---|---|---|---|
| 1 | Price War Matrix Lab | M1–M2 · S1–4, 7 | Classifying games, normal form, dominance, IEDS, Nash, PD/coordination/chicken |
| 2 | Keynes' Beauty Contest | M2 · S4 | Iterated dominance, level-k, bubbles |
| 3 | Duopoly Lab: Cournot vs Bertrand | M2 · S5 | Reaction functions, Bertrand paradox, capacity, N firms |
| 4 | Audits & Penalty Kicks | M2 · S6 | Mixed-strategy NE, indifference, inspection game |
| 5 | Market Entry & Commitment | M3, M5 · S8, 10, 11, 13 | Game trees, backward induction, SPNE, credible threats, brinkmanship, real options |
| 6 | The Bargaining Table | M3, M9 · S9, 19 | Ultimatum, Rubinstein, Nash bargaining, BATNA/ZOPA |
| 7 | OPEC Cartel: Repeated Games | M4 · S12 | Grim trigger, TFT, Axelrod tournament, evolution, critical δ |
| 8 | Information Lab: Lemons & Signals | M6 · S14 | Adverse selection, unravelling, Spence signaling, insurance screening |
| 9 | Auction House | M6 (auctions) | First/second-price, English (IPL), winner's curse, revenue equivalence |
| 10 | Coalition Lab | M7 · S15–17 | Shapley value, Core, airport cost game, Shapley–Shubik power |
| 11 | Matching Market | M8 · S18 | Gale–Shapley, stability, blocking pairs |
| 12 | Climate Club | M4, M10 · SDG 17 | Public goods, conditional cooperation, punishment, thresholds |

Also included: a **Which model fits?** page (the practitioner's decision framework from Sessions 17 and 20), a course map, a faculty page, and an About page listing the hand-checked result for every game.

## Run locally
It is plain HTML, CSS and JavaScript with no build step and no dependencies. Either double-click `index.html`, or:

```bash
python -m http.server 8000
```

then open http://localhost:8000.

## Publish on GitHub Pages (recommended, free)
1. Create a free GitHub account and a new **public** repository, e.g. `stratlab`.
2. On the repo page click **Add file → Upload files**, drag in the *contents* of this folder (`index.html`, `css/`, `js/`, `README.md`) and commit.
3. Go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After about a minute the site is live at `https://<your-username>.github.io/stratlab/`.
5. To update it later, upload the changed files again. Pages redeploys automatically.

Alternative with zero setup: drag the folder onto https://app.netlify.com/drop for an instant URL.

## Notes
- Results are logged in each user's browser (localStorage) and can be exported as CSV or JSON from **My results**. No data leaves the browser.
- Case figures are approximate and meant for teaching. Verify them before quoting in assessed work.

## Collecting results centrally
See [GOOGLE-SHEET-SETUP.md](GOOGLE-SHEET-SETUP.md) to send every finished game (with name and roll number) to a Google Sheet you own.
