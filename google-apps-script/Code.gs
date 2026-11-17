/**
 * StratLab results collector (Google Apps Script).
 *
 * Paste this into Extensions → Apps Script of the Google Sheet that should
 * receive results, then deploy it as a Web app (see GOOGLE-SHEET-SETUP.md).
 * Each finished game on the website sends one row here.
 */

const SHEET_NAME = 'Results';
const HEADERS = ['Received at', 'Roll number', 'Name', 'Game id', 'Game', 'Result', 'Played at (student clock)', 'Record id', 'Details (JSON)'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const row = [
      new Date(),
      clean_(d.roll, 30),
      clean_(d.name, 80),
      clean_(d.game, 40),
      clean_(d.title, 100),
      clean_(d.summary, 400),
      clean_(d.t, 40),
      clean_(d.id, 40),
      clean_(d.data, 5000)
    ];
    if (!row[1] || !row[3]) return json_({ ok: false, error: 'missing roll number or game' });
    sheet_().appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the web-app URL in a browser shows this; useful to check the deployment works.
function doGet() {
  return ContentService.createTextOutput('StratLab results collector is running.');
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

// Trim, cap length, and stop values from being read as spreadsheet formulas.
function clean_(v, max) {
  let s = (v === null || v === undefined) ? '' : String(v);
  s = s.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
