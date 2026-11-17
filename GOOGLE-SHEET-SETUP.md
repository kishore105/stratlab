# Collecting results in a Google Sheet

When this is set up, students enter their name and roll number once. After that, every game they finish adds a row to a Google Sheet that you own.
Until it is set up, the site works as before and results stay in each student's browser.

## 1. Create the Sheet (5 minutes, done once)
1. Sign in to the Google account that should own the data, then open https://sheets.new. Name the sheet **StratLab results**.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the sample code in the editor. Paste in the contents of [`google-apps-script/Code.gs`](google-apps-script/Code.gs), then click **Save** and name the project "StratLab collector".
4. Click **Deploy → New deployment**. Click the gear icon and choose **Web app**, then set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone** (students don't have Google logins tied to the site, so this setting is required)
5. Click **Deploy** and then **Authorize access**. Google will say the app is unverified, because it is your own script. Click **Advanced → Go to StratLab collector** and allow it.
6. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/.../exec`.
7. Open that URL in your browser. It should show *"StratLab results collector is running."*

## 2. Connect the website
Put the URL into `js/config.js`:

```js
window.STRATLAB_CONFIG = {
  sheetUrl: 'https://script.google.com/macros/s/XXXX/exec'
};
```

You can edit the file on GitHub (open the file, click the pencil icon, then **Commit changes**), or send the URL to whoever maintains the site. The site picks it up after GitHub Pages redeploys, in about a minute.

## 3. Check that it works
Open the site and start any game. Enter a test name and roll number, then finish a round. A **Results** tab appears in the sheet with one row per finished game:

| Received at | Roll number | Name | Game id | Game | Result | Played at | Record id | Details (JSON) |
|---|---|---|---|---|---|---|---|---|

Delete your test rows afterwards.

## Managing access
- **Who sees the data:** whoever you share the Sheet with. Share it with your professor as *Viewer*, and avoid giving *Editor* access widely.
- **Analysing it:** use **Insert → Pivot table**, for example roll number by game, or average result per game. You can also use **File → Download** for Excel or CSV.
- **Changing the script:** use **Deploy → Manage deployments → Edit (pencil) → Version: New version**. This keeps the same URL. Creating a new deployment instead gives a new URL, which you would then have to update in `config.js`.
- **Stopping collection:** use **Deploy → Manage deployments → Archive**, or clear `sheetUrl` in `config.js`.

## Limits to know about
- **Names and roll numbers are typed in by students, not verified by a login.** Cross-check them against the class list before using the data for grading.
- **The web-app URL is visible in the site's code.** Someone could add junk rows to the Sheet. The script caps field lengths and blocks spreadsheet formulas, but it cannot stop fake rows.
- **Each browser sends its own results.** If a student plays offline or the request fails, they can resend from **My results → Send unsent results**.
- **Collect only what you need.** Tell students what is recorded (the site shows this before they start). Check whether your institute has rules on collecting student data.
