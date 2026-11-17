/**
 * JustHeadz: Google Sheet database (Apps Script web app)
 *
 * The site sends every read and write here. Each request is a POST with a JSON body:
 *   { op, ...args }
 * and gets back { result } or { error }.
 *
 * There is no secret: the /exec URL itself is the key. The site only uses it on the server,
 * so keep it out of anything public (posts, screenshots, NEXT_PUBLIC_ variables).
 *
 * Setup
 *   1. Create a Google Sheet. Open Extensions > Apps Script and paste this file in as Code.gs.
 *   2. Optional: choose the `setup` function in the toolbar and click Run. It creates the
 *      Entries and Wallets tabs now; otherwise they're created on the first request.
 *   3. Deploy > New deployment > type "Web app"
 *        Execute as:     Me
 *        Who has access: Anyone
 *      Copy the web app URL (ends in /exec).
 *   4. In the site's environment set:
 *        GOOGLE_SHEET_URL=<the /exec URL>
 *
 * After you change this code, use Deploy > Manage deployments > edit > Version: New version.
 * Otherwise the /exec URL keeps running the old code.
 *
 * Entries tab: one row per X account. The `data` column holds the full record the site reads.
 * The other columns are copies for you to read, sort and filter. Edit only `data` if you must
 * change a record by hand, because the other columns are rewritten on the next save.
 */

var ENTRIES = 'Entries';
var WALLETS = 'Wallets';
var ENTRY_COLUMNS = [
  'key', 'handle', 'wallet', 'complete', 'blocked', 'followers', 'x_created',
  'tag_reply', 'quote_post', 'joined_at', 'completed_at', 'updated_at', 'data',
];
var WALLET_COLUMNS = ['wallet', 'handle'];
var DATA_COL = ENTRY_COLUMNS.indexOf('data') + 1;
var TASKS = ['follow', 'engage', 'tag', 'memory', 'wallet', 'quote'];

// ---------- setup ----------

var COLUMNS = {};
COLUMNS[ENTRIES] = ENTRY_COLUMNS;
COLUMNS[WALLETS] = WALLET_COLUMNS;

function setup() {
  sheet_(ENTRIES);
  sheet_(WALLETS);
}

function prepareSheet_(sheet, columns) {
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  // Plain text everywhere, so a value like "=..." is never run as a formula
  sheet.getRange(1, 1, sheet.getMaxRows(), columns.length).setNumberFormat('@');
  return sheet;
}

// ---------- web app ----------

function doGet() {
  return json_({ ok: true });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'Body must be JSON.' });
  }
  try {
    return json_({ result: run_(req) });
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function run_(req) {
  switch (req.op) {
    case 'get': return getEntry_(req.handle);
    case 'put': return withLock_(function () { putEntry_(req.entry); return true; });
    case 'all': return allEntries_();
    case 'walletOwner': return walletOwner_(req.wallet);
    case 'claimWallet': return withLock_(function () { claimWallet_(req.wallet, req.handle, req.previous); return true; });
    case 'limit': return withLock_(function () { return limit_(req.key, req.max, req.windowSec); });
    default: throw new Error('Unknown op: ' + req.op);
  }
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ---------- entries ----------

// The tab, created with its header row the first time it's needed
function sheet_(name) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(name);
  if (sheet) return sheet;
  try {
    return prepareSheet_(book.insertSheet(name), COLUMNS[name]);
  } catch (err) {
    // Another request created it at the same moment
    sheet = book.getSheetByName(name);
    if (sheet) return sheet;
    throw err;
  }
}

function lower_(s) {
  return String(s || '').trim().toLowerCase();
}

// Row number (1-based) whose first column equals key, or 0
function findRow_(sheet, key) {
  if (!key || sheet.getLastRow() < 2) return 0;
  var cell = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(key)
    .matchEntireCell(true)
    .findNext();
  return cell ? cell.getRow() : 0;
}

function getEntry_(handle) {
  var sheet = sheet_(ENTRIES);
  var row = findRow_(sheet, lower_(handle));
  if (!row) return null;
  var data = sheet.getRange(row, DATA_COL).getValue();
  return data ? JSON.parse(data) : null;
}

function putEntry_(entry) {
  if (!entry || !entry.handle) throw new Error('Entry needs a handle.');
  var sheet = sheet_(ENTRIES);
  var values = [entryRow_(entry)];
  var row = findRow_(sheet, lower_(entry.handle)) || sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, ENTRY_COLUMNS.length).setNumberFormat('@').setValues(values);
}

function allEntries_() {
  var sheet = sheet_(ENTRIES);
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, DATA_COL, sheet.getLastRow() - 1, 1)
    .getValues()
    .map(function (r) { return r[0]; })
    .filter(function (v) { return v; })
    .map(function (v) { return JSON.parse(v); });
}

// Same columns as signupRow() in src/lib/entry.ts, plus key and data
function entryRow_(e) {
  var done = e.done || {};
  var iso = function (t) { return t ? new Date(Number(t)).toISOString() : ''; };
  var complete = TASKS.every(function (t) { return done[t]; });
  var times = Object.keys(done).map(function (k) { return Number(done[k]); });
  var row = {
    key: lower_(e.handle),
    handle: e.handle,
    wallet: e.wallet || '',
    complete: complete ? 'yes' : 'no',
    blocked: e.blocked || '',
    followers: e.followers === undefined || e.followers === null ? '' : String(e.followers),
    x_created: e.xCreated || '',
    tag_reply: e.tagLink || '',
    quote_post: e.quoteLink || '',
    joined_at: iso(e.createdAt),
    completed_at: complete && times.length ? iso(Math.max.apply(null, times)) : '',
    updated_at: iso(e.updatedAt),
    data: JSON.stringify(e),
  };
  return ENTRY_COLUMNS.map(function (c) { return row[c]; });
}

// ---------- wallets ----------

function walletOwner_(wallet) {
  var sheet = sheet_(WALLETS);
  var row = findRow_(sheet, lower_(wallet));
  return row ? String(sheet.getRange(row, 2).getValue()) : null;
}

function claimWallet_(wallet, handle, previous) {
  var sheet = sheet_(WALLETS);
  var prev = lower_(previous);
  if (prev && prev !== lower_(wallet)) {
    var old = findRow_(sheet, prev);
    if (old) sheet.deleteRow(old);
  }
  var key = lower_(wallet);
  var row = findRow_(sheet, key) || sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 2).setNumberFormat('@').setValues([[key, lower_(handle)]]);
}

// ---------- rate limit ----------

// Fixed window counter kept in the script cache (not the sheet). True when the call is allowed.
function limit_(key, max, windowSec) {
  var cache = CacheService.getScriptCache();
  var id = 'rl:' + key;
  var now = Date.now();
  var w = JSON.parse(cache.get(id) || 'null');
  if (!w || w.reset <= now) w = { n: 0, reset: now + windowSec * 1000 };
  w.n += 1;
  var ttl = Math.max(1, Math.ceil((w.reset - now) / 1000));
  cache.put(id, JSON.stringify(w), Math.min(ttl, 21600));
  return w.n <= max;
}
