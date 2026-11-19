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
var SPOTS = 'Spots';
var ENTRY_COLUMNS = [
  'key', 'handle', 'wallet', 'complete', 'blocked', 'followers', 'x_created',
  'tag_reply', 'quote_post', 'joined_at', 'completed_at', 'updated_at', 'data',
  // Evolution, sent by the site with each save
  'head', 'stage', 'evo_points', 'referrals', 'referred_by',
  // Holder claim
  'claim_phase', 'claim_community', 'claim_wallet', 'claim_vault', 'claimed_at',
];
var WALLET_COLUMNS = ['wallet', 'handle'];
var SPOT_COLUMNS = ['handle', 'community', 'taken_at'];

// ---------- holder claim caps: change these here, then redeploy (New version) ----------
// Spots across every community
var TOTAL_CAP = 3000;
// Spots per community, by the name the site uses. A community not listed is only held to TOTAL_CAP.
var OG_CAP = 100;
var COMMUNITY_CAPS = {
  // Phase 1: the OG communities
  'CryptoPunks': OG_CAP, 'Pudgy Penguins': OG_CAP, 'CyberKongz': OG_CAP, 'Milady': OG_CAP,
  'Bored Ape Yacht Club': OG_CAP, 'Mutant Ape Yacht Club': OG_CAP, 'Lil Pudgys': OG_CAP, 'Doodles': OG_CAP,
  'VeeFriends': OG_CAP, 'Cool Cats': OG_CAP, 'Meebits': OG_CAP, 'DeadFellaz': OG_CAP, 'Azuki': OG_CAP,
  'Moonbirds': OG_CAP, 'Sappy Seals': OG_CAP, 'CloneX': OG_CAP, 'World of Women': OG_CAP, 'Max Pain and Frens': OG_CAP,
  // Phase 2
  'Funkari': 50,
  'WIF Outlaws': 150,
  'Souls.club': 150,
  'Vaultlings': 100,
  'The Goat Ranch Club': 150,
  'TMO Initiates': 100,
  'Normies': 120,
  'CCFF00': 200,
  'Argonauts': 30,
  'Rekt Tradooor': 30,
  'Original Blokyz': 100,
  'Freedz': 70,
  'Internet Monkes': 70,
  'pyopyopyo': 120,
  'Clay Stonkz': 70,
  'The Mutual Fun': 100,
  'FUDS': 30,
  'Goat Street': 80,
  'AGNTS': 70,
  'Vamps': 100,
  'Suited Ape Society': 100,
  'Yield Field Deeds': 30,
  'Companions by Wfit': 100,
  'Cash Grab RH': 40,
};
var DATA_COL = ENTRY_COLUMNS.indexOf('data') + 1;
var TASKS = ['follow', 'engage', 'tag', 'memory', 'wallet', 'quote'];

// ---------- setup ----------

var COLUMNS = {};
COLUMNS[ENTRIES] = ENTRY_COLUMNS;
COLUMNS[WALLETS] = WALLET_COLUMNS;
COLUMNS[SPOTS] = SPOT_COLUMNS;

function setup() {
  sheet_(ENTRIES);
  sheet_(WALLETS);
  sheet_(SPOTS);
}

function prepareSheet_(sheet, columns) {
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  // Plain text everywhere, so a value like "=..." is never run as a formula
  sheet.getRange(1, 1, sheet.getMaxRows(), columns.length).setNumberFormat('@');
  return sheet;
}

// ---------- web app ----------

// Bump when this file changes, so the live copy can be checked: open the /exec URL in a browser
var VERSION = 7; // 7: caps for every Phase 2 community. 6: 3,000 total, more Phase 2 caps. 5: per-community caps. 4: Spots tab. 3: evolution and claim columns

function doGet() {
  return json_({ ok: true, version: VERSION });
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
    case 'put': return withLock_(function () { putEntry_(req.entry, req.extra); return true; });
    case 'all': return allEntries_();
    case 'walletOwner': return walletOwner_(req.wallet);
    case 'claimWallet': return withLock_(function () { claimWallet_(req.wallet, req.handle, req.previous); return true; });
    case 'limit': return withLock_(function () { return limit_(req.key, req.max, req.windowSec); });
    case 'takeSpot': return withLock_(function () { return takeSpot_(req.handle, req.community, req.release || []); });
    case 'spotRoom': return spotRoom_(req.community);
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

function putEntry_(entry, extra) {
  if (!entry || !entry.handle) throw new Error('Entry needs a handle.');
  var sheet = sheet_(ENTRIES);
  ensureHeader_(sheet, ENTRY_COLUMNS);
  var values = [entryRow_(entry, extra || {})];
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

// Adds header cells for columns introduced after the tab was made
function ensureHeader_(sheet, columns) {
  if (sheet.getLastColumn() >= columns.length) return;
  sheet.getRange(1, 1, 1, columns.length).setNumberFormat('@').setValues([columns]).setFontWeight('bold');
}

// Same columns as signupRow() in src/lib/entry.ts, plus key and data
function entryRow_(e, extra) {
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
  return ENTRY_COLUMNS.map(function (c) { return c in row ? row[c] : extra[c] === undefined ? '' : String(extra[c]); });
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

// ---------- holder claim spots ----------

function capOf_(community) {
  var want = lower_(community);
  for (var name in COMMUNITY_CAPS) if (lower_(name) === want) return COMMUNITY_CAPS[name];
  return Infinity;
}

// Rows already taken: in total, and for one community
function spotCounts_(sheet, community) {
  var n = sheet.getLastRow() - 1;
  if (n < 1) return { total: 0, community: 0 };
  var want = lower_(community);
  var mine = sheet.getRange(2, 2, n, 1).getValues().filter(function (r) { return lower_(r[0]) === want; }).length;
  return { total: n, community: mine };
}

// 'ok' | 'full' (every spot gone) | 'community_full' (this community's spots gone)
function roomFor_(sheet, community) {
  var c = spotCounts_(sheet, community);
  if (c.total >= TOTAL_CAP) return 'full';
  if (c.community >= capOf_(community)) return 'community_full';
  return 'ok';
}

// One row per locked claim. Counting and adding happen under the same lock, so two people
// can never both get the last spot. release: handles whose spot is freed first (a takeover).
// Returns 'ok' (they have a spot), 'full' or 'community_full'.
function takeSpot_(handle, community, release) {
  var sheet = sheet_(SPOTS);
  ensureHeader_(sheet, SPOT_COLUMNS);
  release.forEach(function (h) {
    var r = findRow_(sheet, lower_(h));
    if (r) sheet.deleteRow(r);
  });
  var key = lower_(handle);
  if (!key) throw new Error('takeSpot needs a handle.');
  if (findRow_(sheet, key)) return 'ok';
  var room = roomFor_(sheet, community);
  if (room !== 'ok') return room;
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 3).setNumberFormat('@').setValues([[key, String(community || ''), new Date().toISOString()]]);
  return 'ok';
}

// Whether a community still has room, for a heads-up before the X steps (no lock: a hint only)
function spotRoom_(community) {
  return roomFor_(sheet_(SPOTS), community);
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
