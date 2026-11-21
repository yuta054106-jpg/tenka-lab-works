// おむすびと豚汁 ヒナタギ（デモ）レジ締めの現金の数え表と日報
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 金額・平均はすべて整数だけで計算する（design.md §10。小数の丸めの関数・現在時刻・乱数は使わない）
// 今日の締めのフォームは最初に1回だけ作り、描き直しでは数字・一覧の所だけ書き換える（§12-3）
(function () {
  'use strict'

  // ---------- 定数（design.md §12-1・§20-1） ----------
  var KEY = 'tenkaLab.demo22.registerClose.v1'
  var TEST_KEY = 'tenkaLab.demo22.test'
  var SHOP = 'おむすびと豚汁 ヒナタギ'
  var TODAY = '2026-12-01'
  var MIN_DATE = '2026-11-01'
  var MONTHS = ['2026-12', '2026-11']
  var DENOMS = [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1]
  var DN = ['1万円札', '5千円札', '2千円札', '千円札', '500円玉', '100円玉', '50円玉', '10円玉', '5円玉', '1円玉']
  var FLOAT = 30000
  var FLOAT_PLAN = [0, 0, 0, 15, 12, 60, 30, 100, 60, 200]
  var TODAY_REG = { regCash: 36480, card: 15720, qr: 21460, customers: 76 }
  var REASONS = ['count', 'change', 'register', 'other']
  var REASON_L = { count: '数え間違い', change: '釣り銭の渡し間違い', register: 'レジの打ち間違い', other: 'その他' }
  var ROLES = ['early', 'late', 'manager']
  var ROLE_L = { early: '早番', late: '遅番', manager: '店長' }
  var REC_KEYS = ['no', 'date', 'counts', 'regCash', 'card', 'qr', 'customers', 'role', 'reason', 'note']
  var MAX_YEN = 9999999
  var MAX_N = 9999
  // 見本の締め 26日分（§20-2。番号・日付・締めた人・金種の枚数10・現金売上（レジ）・カード・QR・客数。数字はすべて架空）
  var SAMPLE = [
    [1, '11-01', 'early', [2, 1, 0, 41, 14, 63, 30, 104, 60, 200], 52340, 23180, 31460, 112],
    [2, '11-02', 'late', [1, 1, 1, 37, 12, 57, 31, 101, 60, 200], 38760, 15420, 22180, 79],
    [3, '11-03', 'late', [2, 2, 0, 33, 15, 63, 31, 103, 60, 200], 49880, 21940, 28620, 104],
    [4, '11-05', 'late', [1, 1, 0, 36, 14, 61, 30, 104, 60, 200], 37140, 16280, 20960, 76],
    [5, '11-06', 'late', [2, 0, 0, 37, 11, 60, 30, 102, 60, 200], 41520, 18740, 24300, 86],
    [6, '11-07', 'manager', [3, 1, 0, 34, 13, 64, 31, 101, 60, 200], 55960, 24820, 33140, 118],
    [7, '11-08', 'early', [2, 2, 1, 36, 12, 61, 31, 103, 60, 200], 53180, 22960, 32480, 114],
    [8, '11-09', 'late', [1, 1, 0, 36, 12, 64, 30, 102, 60, 200], 36420, 14860, 21340, 74],
    [9, '11-10', 'late', [1, 0, 0, 41, 12, 60, 30, 98, 60, 200], 35980, 15240, 20780, 72],
    [10, '11-12', 'late', [1, 1, 0, 38, 12, 63, 30, 100, 60, 200], 38300, 16920, 22100, 80],
    [11, '11-13', 'late', [2, 1, 0, 33, 12, 60, 29, 101, 60, 200], 42860, 19180, 25420, 88],
    [12, '11-14', 'manager', [3, 1, 1, 35, 12, 62, 30, 104, 60, 200], 57240, 25360, 34020, 120],
    [13, '11-15', 'early', [2, 1, 0, 41, 13, 61, 30, 102, 60, 200], 51620, 22440, 30940, 108],
    [14, '11-16', 'late', [1, 1, 0, 37, 13, 60, 30, 103, 60, 200], 37580, 15960, 22460, 78],
    [15, '11-17', 'late', [1, 0, 0, 42, 12, 57, 30, 104, 60, 200], 36740, 15580, 21180, 75],
    [16, '11-19', 'late', [2, 0, 0, 34, 12, 60, 31, 101, 60, 200], 39060, 17340, 22900, 82],
    [17, '11-20', 'late', [2, 1, 0, 33, 12, 64, 30, 102, 60, 200], 43420, 19560, 26180, 90],
    [18, '11-21', 'manager', [3, 1, 0, 36, 12, 63, 31, 102, 60, 200], 56380, 24940, 33560, 119],
    [19, '11-22', 'early', [2, 2, 0, 37, 13, 62, 31, 101, 60, 200], 52760, 23620, 31880, 111],
    [20, '11-23', 'late', [2, 1, 1, 37, 12, 60, 29, 99, 60, 200], 48940, 21280, 29140, 102],
    [21, '11-24', 'late', [1, 0, 0, 40, 11, 63, 31, 101, 60, 200], 34860, 14920, 20540, 70],
    [22, '11-26', 'late', [1, 1, 0, 39, 12, 60, 29, 99, 60, 200], 38940, 17060, 23180, 81],
    [23, '11-27', 'late', [2, 1, 0, 34, 12, 61, 31, 103, 60, 200], 44180, 20140, 26860, 94],
    [24, '11-28', 'manager', [3, 2, 0, 34, 12, 60, 30, 98, 60, 200], 58120, 26040, 34860, 122],
    [25, '11-29', 'early', [3, 0, 1, 37, 12, 60, 30, 102, 60, 200], 54020, 23860, 32660, 115],
    [26, '11-30', 'late', [1, 1, 0, 39, 12, 64, 31, 103, 60, 200], 39480, 16640, 23320, 84]
  ]
  // 過不足のあった5日の理由とひとこと（ほかの21日は空）
  var SAMPLE_NOTE = {
    '11-07': ['change', '千円札を2枚重ねて渡したかもしれない。次から1枚ずつ数えて渡す'],
    '11-13': ['change', 'お釣りを100円少なく渡したかもしれない。常連さんなら次にお返しする'],
    '11-16': ['other', '原因が分からない。翌日、両替の記録と照らす'],
    '11-21': ['count', 'お預かりの10円玉を1枚少なく数えた'],
    '11-28': ['register', '現金のお会計（860円）をQRで打ってしまった']
  }
  // 今日の締めの見本の枚数（§20-3）
  var PRESET = {
    even: [1, 1, 0, 36, 12, 64, 31, 103, 60, 200],
    over: [1, 1, 0, 36, 12, 66, 31, 103, 60, 200],
    short: [1, 1, 0, 35, 12, 64, 31, 103, 60, 200]
  }
  var PRESET_L = { even: 'ぴったりの見本', over: '多い見本', short: '少ない見本' }
  function own (o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
  function pad2 (n) { return n < 10 ? '0' + n : String(n) }

  // ---------- 日付（Date のオブジェクトは作らない。Date.UTC の数だけ使う） ----------
  function dayNum (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000
  }
  // 日の番号 → 'YYYY-MM-DD'（グレゴリオ暦の計算）
  function ymd (z) {
    z += 719468
    var era = Math.floor(z / 146097)
    var doe = z - era * 146097
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
    var y = yoe + era * 400
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
    var mp = Math.floor((5 * doy + 2) / 153)
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1
    var m = mp < 10 ? mp + 3 : mp - 9
    if (m <= 2) y++
    return String(y).padStart(4, '0') + '-' + pad2(m) + '-' + pad2(d)
  }
  var WD = ['日', '月', '火', '水', '木', '金', '土']
  // 曜日の番号（0＝日〜6＝土。1970-01-01 は木曜）
  function wdIdx (s) { return ((dayNum(s) % 7) + 7 + 4) % 7 }
  function wdName (s) { return WD[wdIdx(s)] }
  function jpDate (s) { var p = s.split('-'); return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日（' + wdName(s) + '）' }
  function mdw (s) { return s.slice(5) + '（' + wdName(s) + '）' }
  function jpMonth (ym) { var p = ym.split('-'); return Number(p[0]) + '年' + Number(p[1]) + '月' }

  // ---------- 数の書き方（§2-4） ----------
  function n3 (n) { return n.toLocaleString('ja-JP') }
  function yen (n) { return n < 0 ? '−' + yen(-n) : n3(n) + '円' }
  function fmtDiff (d) { return d > 0 ? '＋' + n3(d) + '円' : d === 0 ? '±0円' : '−' + n3(-d) + '円' }
  function fmtDiffN (d) { return d > 0 ? '＋' + n3(d) : d === 0 ? '±0' : '−' + n3(-d) }
  function diffKind (d) { return d > 0 ? 'over' : d < 0 ? 'short' : 'even' }
  var KIND_L = { over: '多い', short: '少ない', even: 'ぴったり' }

  // ---------- 決め方（§10。状態を引数で受ける純粋な関数） ----------
  // 合計 s・件数 n（n ≥ 1）から「s÷n を1の位に四捨五入した整数」（0.5 はいつも切り上げ）
  function roundDiv (s, n) { return Math.floor((2 * s + n) / (2 * n)) }
  function unitPrice (total, customers) { return customers === 0 ? null : roundDiv(total, customers) }
  function closeCalc (rec) {
    var amt = rec.counts.map(function (c, i) { return c * DENOMS[i] })
    var counted = amt.reduce(function (a, b) { return a + b }, 0)
    var actual = counted - FLOAT
    var total = rec.regCash + rec.card + rec.qr
    return { amt: amt, counted: counted, actual: actual, diff: actual - rec.regCash, total: total, unit: unitPrice(total, rec.customers) }
  }
  // 明日の釣り銭に残す目安（§6-4）：残す＝min(数えた, 目安)、取り出す＝数えた − 残す、足りない＝目安 − 残す
  function floatPlan (counts) {
    var keep = counts.map(function (c, i) { return Math.min(c, FLOAT_PLAN[i]) })
    var out = counts.map(function (c, i) { return c - keep[i] })
    var lack = FLOAT_PLAN.map(function (p, i) { return p - keep[i] })
    var y = function (a) { return a.reduce(function (s, c, i) { return s + c * DENOMS[i] }, 0) }
    var keepY = y(keep)
    return { keep: keep, out: out, lack: lack, keepY: keepY, outY: y(out), lackY: FLOAT - keepY }
  }
  function byDate (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0 }
  function monthRecs (st, ym) { return st.closes.filter(function (r) { return r.date.slice(0, 7) === ym }).sort(byDate) }
  function sumOf (rows, f) { return rows.reduce(function (a, r) { return a + f(r) }, 0) }
  function statsOf (rows) {
    var cs = rows.map(function (r) { return { r: r, c: closeCalc(r) } })
    var n = rows.length
    var o = {
      n: n,
      total: sumOf(cs, function (x) { return x.c.total }), cash: sumOf(rows, function (r) { return r.regCash }),
      card: sumOf(rows, function (r) { return r.card }), qr: sumOf(rows, function (r) { return r.qr }),
      customers: sumOf(rows, function (r) { return r.customers }),
      counted: sumOf(cs, function (x) { return x.c.counted }), actual: sumOf(cs, function (x) { return x.c.actual })
    }
    var dd = cs.filter(function (x) { return x.c.diff !== 0 })
    o.diffN = dd.length
    o.diffSum = sumOf(cs, function (x) { return x.c.diff })
    var ov = dd.filter(function (x) { return x.c.diff > 0 }); var sh = dd.filter(function (x) { return x.c.diff < 0 })
    o.over = { n: ov.length, sum: sumOf(ov, function (x) { return x.c.diff }) }
    o.short = { n: sh.length, sum: sumOf(sh, function (x) { return x.c.diff }) }
    o.reasons = {}
    REASONS.forEach(function (k) {
      var rs = dd.filter(function (x) { return x.r.reason === k })
      o.reasons[k] = { n: rs.length, sum: sumOf(rs, function (x) { return x.c.diff }) }
    })
    o.avgSale = n ? roundDiv(o.total, n) : null
    o.avgCust = n ? roundDiv(o.customers, n) : null
    o.unit = n ? unitPrice(o.total, o.customers) : null
    return o
  }
  // 月の集計（§10-4）。曜日別 wd は 0＝日〜6＝土
  function monthStats (st, ym) {
    var rows = monthRecs(st, ym)
    var o = statsOf(rows)
    o.ym = ym
    o.wd = WD.map(function (x, i) { return statsOf(rows.filter(function (r) { return wdIdx(r.date) === i })) })
    return o
  }
  // 日報の行（§7-2）：その月の1日から「その月の末日と今日の早い方」まで。記録・定休日（水曜）・締めの記録なし
  function monthDays (st, ym) {
    var rows = monthRecs(st, ym)
    var out = []
    var first = dayNum(ym + '-01')
    for (var z = first; ; z++) {
      var d = ymd(z)
      if (d.slice(0, 7) !== ym || d > TODAY) break
      var r = rows.filter(function (x) { return x.date === d })[0]
      out.push(r ? { date: d, kind: 'rec', rec: r } : { date: d, kind: wdIdx(d) === 3 ? 'closed' : 'none' })
    }
    return out
  }

  // ---------- 入力の読み取り（§11）。戻り値 { v } か { e } ----------
  function realDate (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (!m) return false
    var mo = Number(m[2]); var d = Number(m[3])
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false
    return ymd(Date.UTC(Number(m[1]), mo - 1, d) / 86400000) === s
  }
  function parseDate (text) {
    var s = String(text).trim().normalize('NFKC').trim().replace(/[/.]/g, '-')
    if (s === '') return { e: 'empty' }
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
    if (!m) return { e: 'form' }
    var v = m[1] + '-' + pad2(Number(m[2])) + '-' + pad2(Number(m[3]))
    if (!realDate(v)) return { e: 'form' }
    if (v > TODAY) return { e: 'future' }
    if (v < MIN_DATE) return { e: 'old' }
    return { v: v }
  }
  // 金種の枚数（§11-2）。空欄は 0枚、空白だけは誤り
  function parseCount (raw) {
    raw = String(raw)
    if (raw === '') return { v: 0 }
    var s = raw.normalize('NFKC').trim()
    if (s === '') return { e: 'space' }
    if (/^\d+$/.test(s)) { var n = Number(s); return n > MAX_N ? { e: 'max' } : { v: n } }
    if (/^[-−]/.test(s)) return { e: 'neg' }
    if (/^\d*[.]\d*$/.test(s) && /\d/.test(s)) return { e: 'dec' }
    return { e: 'char' }
  }
  // レジの記録（§11-3）。末尾の単位を1つだけ取り、3桁ごとのカンマを取る
  function parseNum (raw, unit, max) {
    var s = String(raw).normalize('NFKC').trim()
    if (s === '') return { e: 'empty' }
    if (s.slice(-1) === unit) s = s.slice(0, -1).trim()
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '')
    if (!/^\d+$/.test(s)) return { e: 'form' }
    var n = Number(s)
    return n > max ? { e: 'form' } : { v: n }
  }
  function parseYen (raw) { return parseNum(raw, '円', MAX_YEN) }
  function parseCust (raw) { return parseNum(raw, '人', MAX_N) }
  var PHONE_RE = /\d(?:[-‐−–ー()]*\d){9,}/
  // 使えない文字（制御文字・タブ・C1・行／段落の区切り）。改行は読み取りの時に空白にする
  var CTRL_RE = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/
  // ひとこと（§11-4）。改行（CR・LF・CRLF）は半角の空白1つにし、前後の空白を取る
  function checkNote (text) {
    var s = String(text).replace(/\r\n|\r|\n/g, ' ').trim()
    if (s === '') return { e: 'empty' }
    var n = Array.from(s).length
    if (n > 60) return { e: 'long', n: n }
    var nf = s.normalize('NFKC')
    if (PHONE_RE.test(nf)) return { e: 'phone' }
    if (nf.indexOf('@') >= 0) return { e: 'at' }
    if (CTRL_RE.test(s)) return { e: 'ctrl' }
    return { v: s }
  }
  var DATE_MSG = {
    empty: '締める日を入れてください', form: '締める日は 2026-12-01 の形で、ある日付を入れてください',
    future: '未来の日付は締められません（今日は 2026-12-01）', old: 'このデモでは 2026-11-01 から今日までの日付を入れてください',
    dup: 'この日はもう締めてあります。締め直すときは、締めた直後の「この締めを取り消す」で取り消してから締めてください'
  }
  function countMsg (e, name) {
    if (e === 'space') return name + 'の枚数が空白だけです。0枚なら空にするか 0 を入れてください'
    if (e === 'dec') return name + 'の枚数は整数で入れてください（小数は入れられません）'
    if (e === 'neg') return name + 'の枚数に、マイナスは入れられません'
    if (e === 'max') return name + 'の枚数は 9,999枚までです'
    return name + 'の枚数は、半角か全角の数字だけで入れてください（カンマ・単位は付けません）'
  }
  function noteMsg (r) {
    if (r.e === 'empty') return '過不足があるときは、ひとこと（60字まで）を書いてください'
    if (r.e === 'long') return 'ひとことは60字までにしてください（いま ' + r.n + '字）'
    if (r.e === 'phone') return '電話番号のような数字（10桁以上）は書けません。お客様のお名前・連絡先は書かないでください'
    if (r.e === 'at') return 'メールアドレスのような文字（@）は書けません。お客様のお名前・連絡先は書かないでください'
    return 'ひとことに使えない文字が入っています'
  }

  // ---------- 保存の検証（§12-2）。通れば新しい状態、外れれば null ----------
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  function intIn (v, a, b) { return typeof v === 'number' && Number.isInteger(v) && v >= a && v <= b }
  function sameKeys (o, list) {
    var ks = Object.keys(o)
    if (ks.length !== list.length) return false
    return list.every(function (k) { return own(o, k) }) && ks.every(function (k) { return list.indexOf(k) >= 0 })
  }
  // 日付は決まった書き方（YYYY-MM-DD）だけ。2026-11-1 のように同じ日の別の書き方を通さない
  function okDate (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && realDate(s) && s >= MIN_DATE && s <= TODAY }
  function validate (d) {
    if (!isObj(d) || !sameKeys(d, ['v', 'closes', 'seq'])) return null
    if (d.v !== 1) return null
    if (!intIn(d.seq, 1, 100000)) return null
    if (!Array.isArray(d.closes) || d.closes.length > 31) return null
    var st = { closes: [], seq: d.seq }
    var nos = {}; var dates = {}
    for (var i = 0; i < d.closes.length; i++) {
      var a = d.closes[i]
      if (!isObj(a) || !sameKeys(a, REC_KEYS)) return null
      if (!intIn(a.no, 1, d.seq - 1) || own(nos, String(a.no))) return null
      nos[String(a.no)] = 1
      if (!okDate(a.date) || own(dates, a.date)) return null
      dates[a.date] = 1
      if (!Array.isArray(a.counts) || a.counts.length !== 10 || !a.counts.every(function (c) { return intIn(c, 0, MAX_N) })) return null
      if (!intIn(a.regCash, 0, MAX_YEN) || !intIn(a.card, 0, MAX_YEN) || !intIn(a.qr, 0, MAX_YEN) || !intIn(a.customers, 0, MAX_N)) return null
      if (typeof a.role !== 'string' || ROLES.indexOf(a.role) < 0) return null
      if (typeof a.reason !== 'string' || typeof a.note !== 'string') return null
      var rec = { no: a.no, date: a.date, counts: a.counts.slice(), regCash: a.regCash, card: a.card, qr: a.qr, customers: a.customers, role: a.role, reason: a.reason, note: a.note }
      if (closeCalc(rec).diff !== 0) {
        if (REASONS.indexOf(a.reason) < 0) return null
        var cn = checkNote(a.note)
        if (cn.e || cn.v !== a.note) return null
      } else if (a.reason !== '' || a.note !== '') return null
      st.closes.push(rec)
    }
    st.closes.sort(byDate)
    return st
  }
  function sample () {
    return {
      closes: SAMPLE.map(function (r) {
        var nt = SAMPLE_NOTE[r[1]] || ['', '']
        return { no: r[0], date: '2026-' + r[1], counts: r[3].slice(), regCash: r[4], card: r[5], qr: r[6], customers: r[7], role: r[2], reason: nt[0], note: nt[1] }
      }),
      seq: 27
    }
  }

  // ---------- CSV（§13） ----------
  function csvCell (v) {
    if (v === null) return '""'
    if (typeof v === 'number') return String(v)
    var s = String(v)
    if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  var CSV_COLS = [
    ['日付', '2026-11-01 の形'], ['曜日', '日〜土'], ['売上合計', 'レジの記録（現金売上（レジ）＋カード＋QR）。円'], ['現金売上（レジ）', '円'], ['カード', '円'], ['QR', '円'], ['客数', '人'],
    ['客単価', '売上合計÷客数（1円未満は四捨五入）。客数 0 の日は空'], ['数えた現金', '金種ごとの枚数×金額の合計'], ['釣り銭準備金', '30000'], ['現金売上（実際）', '数えた現金 − 釣り銭準備金'],
    ['過不足', '現金売上（実際）− 現金売上（レジ）。少ない時はマイナス'], ['区分', '多い・少ない・ぴったり'], ['理由', 'ぴったりの日は空'], ['ひとこと', '60字まで。ぴったりの日は空'], ['締めた人', '早番・遅番・店長']
  ].concat(DN.map(function (n) { return [n, '枚数 0〜9,999'] }))
  function buildCsv (st, ym) {
    var lines = [CSV_COLS.map(function (c) { return c[0] }).join(',')]
    monthRecs(st, ym).forEach(function (r) {
      var c = closeCalc(r)
      var k = diffKind(c.diff)
      lines.push([csvCell(r.date), csvCell(wdName(r.date)), c.total, r.regCash, r.card, r.qr, r.customers, csvCell(c.unit), c.counted, FLOAT, c.actual, c.diff,
        csvCell(KIND_L[k]), csvCell(k === 'even' ? '' : REASON_L[r.reason]), csvCell(k === 'even' ? '' : r.note), csvCell(ROLE_L[r.role])].concat(r.counts).map(function (v) { return typeof v === 'number' ? String(v) : v }).join(','))
    })
    return '\uFEFF' + lines.join('\r\n') + '\r\n'
  }

  // ---------- 保存（§12） ----------
  var canSave = (function () {
    try {
      window.localStorage.setItem(TEST_KEY, '1'); window.localStorage.removeItem(TEST_KEY)
      return true
    } catch (e) { return false }
  })()
  var S = null
  function noSave () {
    canSave = false
    var n = document.getElementById('note-nosave')
    if (n) n.hidden = false
  }
  function save () {
    if (!canSave) return
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, closes: S.closes, seq: S.seq }))
    } catch (e) { noSave() }
  }
  // 読み直す。無い時は黙って見本、壊れている時は見本で初期化して書き直し、注記を出す。保存できない時はメモリの S のまま
  function load () {
    if (!canSave) { if (!S) S = sample(); return }
    var raw = null
    try { raw = window.localStorage.getItem(KEY) } catch (e) { noSave(); if (!S) S = sample(); return }
    if (raw === null) { S = sample(); save(); return }
    var st = null
    try { st = validate(JSON.parse(raw)) } catch (e) { st = null }
    if (st) { S = st; return }
    S = sample()
    save()
    var n = document.getElementById('note-broken')
    if (n) n.hidden = false
  }

  // ---------- DOM の小道具 ----------
  var $ = function (id) { return document.getElementById(id) }
  var NS = 'http://www.w3.org/2000/svg'
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    return e
  }
  function add (parent, kids) {
    (Array.isArray(kids) ? kids : [kids]).forEach(function (k) {
      if (k == null || k === false) return
      if (Array.isArray(k)) { add(parent, k); return }
      parent.appendChild(typeof k === 'string' ? document.createTextNode(k) : k)
    })
    return parent
  }
  function icon (name, size, cls) {
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('width', String(size)); s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(NS, 'use')
    u.setAttribute('href', '#' + name)
    s.appendChild(u)
    return s
  }
  function nw (text, cls) { return el('span', 'nw' + (cls ? ' ' + cls : ''), text) }
  function setText (e, kids) { e.textContent = ''; add(e, kids); return e }

  // 折れてはいけない語（§16）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = [SHOP, '現金売上（レジの記録）', '現金売上（実際）', '釣り銭準備金', '数えた現金', 'QR（スマホ決済）', '売上合計', '客単価', '1日平均',
    '締めの記録なし', 'いま締めた日', '定休日', 'ぴったり', '少ない', '多い', '数え間違い', '釣り銭の渡し間違い', 'レジの打ち間違い', 'その他', '早番', '遅番', '店長',
    'デモ（架空のお店）', 'デモの日付', '見本に戻す', 'CSV をダウンロード', '日報を印刷', '締めの控えを印刷', 'デモ', '架空'].concat(DN)
    .sort(function (a, b) { return b.length - a.length })
  var NW_RE = new RegExp([
    '\\d{4}年\\d{1,2}月(?:\\d{1,2}日(?:（[日月火水木金土]）)?)?', '\\d{4}-\\d{2}-\\d{2}', '\\d{2}-\\d{2}（[日月火水木金土]）',
    '[＋−±]?\\d[\\d,]*(?:円|枚|人|日|回|字|か所)'
  ].concat(NW_WORDS.map(esc)).join('|'), 'g')
  function wrapText (node) {
    var s = node.data
    NW_RE.lastIndex = 0
    if (!NW_RE.test(s)) return
    NW_RE.lastIndex = 0
    var frag = document.createDocumentFragment(); var last = 0; var m
    while ((m = NW_RE.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)))
      frag.appendChild(el('span', 'nw', m[0]))
      last = m.index + m[0].length
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)))
    // 親が flex・grid の時は、分けた語が別々の箱になって隙間が空くので、1つの span にまとめる
    var par = node.parentNode
    if (/flex|grid/.test(window.getComputedStyle(par).display)) { var box = el('span'); box.appendChild(frag); frag = box }
    par.replaceChild(frag, node)
  }
  function wrapWords (root) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode
        if (!p || p.closest('.nw, svg, script, style, title, pre, .visually-hidden, label, option, select, textarea, thead, #sr-status, .day-card__note, .note-row td, .slip-box__note, #print-root')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var list = []; var n
    while ((n = tw.nextNode())) list.push(n)
    list.forEach(wrapText)
    return root
  }
  // 状態の札（§1-4）。見える文字がそのまま読まれる（aria-label を付けない）
  var TAG = { even: ['ぴったり', 'i-okc'], over: ['多い', 'i-plus'], short: ['少ない', 'i-minus'], closed: ['定休日', null], none: ['締めの記録なし', null] }
  function stateTag (k) {
    var t = el('span', 'state-tag state-tag--' + k)
    if (TAG[k][1]) t.appendChild(icon(TAG[k][1], 14))
    t.appendChild(document.createTextNode(TAG[k][0]))
    return t
  }
  function bar (v, max) {
    var b = el('span', 'bar'); b.setAttribute('aria-hidden', 'true')
    var f = el('span', 'bar__fill'); f.style.width = (max ? v * 100 / max : 0) + '%'
    b.appendChild(f)
    return b
  }

  // ---------- 知らせ（live 領域は #sr-status の1つだけ。§18-3） ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  var liveTimer = null
  var lastLive = ''
  function announce (msg, wait) {
    var sr = $('sr-status')
    // 新しい知らせが出たら、打っている途中の読み上げ（600ms 後）は取りやめる（古い過不足を後から読ませない）
    window.clearTimeout(liveTimer)
    window.clearTimeout(srTimer)
    srTimer = window.setTimeout(function () {
      sr.textContent = ''
      srTimer = window.setTimeout(function () { sr.textContent = msg }, 50)
    }, wait == null ? 20 : wait)
  }
  var toastTimer = null
  function showToast (text, sr) {
    var t = $('toast')
    $('toast-text').textContent = text
    wrapWords($('toast-text'))
    t.hidden = false
    t.classList.remove('is-in')
    void t.offsetWidth
    if (!reduceMotion) t.classList.add('is-in')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { t.hidden = true }, 3000)
    announce(sr || text)
  }

  // ---------- 確認の窓（最初のフォーカスは「やめる」、Esc＝やめる） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null
  function confirmBox () {
    return new Promise(function (resolve) {
      // dialog が使えないブラウザでは、ブラウザの確認窓で同じ文を聞く（確認なしで戻さない）
      if (!hasDialog) { resolve(window.confirm($('cf-title').textContent + '\n' + $('cf-body').textContent)); return }
      dlgOpener = document.activeElement && document.activeElement.id
      dlgResolve = resolve
      dlg.showModal()
      $('cf-cancel').focus()
    })
  }
  function closeDlg (yes) {
    if (!dlgResolve) return
    var r = dlgResolve
    dlgResolve = null
    if (dlg.open) dlg.close()
    r(yes)
    if (!yes && dlgOpener) {
      var id = dlgOpener
      window.setTimeout(function () {
        var a = document.activeElement
        if ($(id) && (!a || a === document.body || dlg.contains(a))) $(id).focus()
      }, 0)
    }
  }
  $('cf-ok').addEventListener('click', function () { closeDlg(true) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(false) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(false) })

  // ---------- 画面の状態（保存しない。§12-1） ----------
  var ui = { tab: 'close', view: 'form', lastClosed: null, doneRec: null, dailyYm: '2026-11', reviewYm: '2026-11', expYm: '2026-11', slipDate: null }

  // ---------- タブ ----------
  var TABS = ['close', 'daily', 'review', 'export']
  function openTab (name, opt) {
    if (name === 'review' && ui.tab !== 'review') ui.reviewYm = ui.dailyYm
    if (name === 'export' && ui.tab !== 'export') { ui.expYm = ui.dailyYm; ui.slipDate = null }
    if (name === 'close' && ui.view === 'done' && !lastClosed()) { ui.view = 'form'; ui.doneRec = null; resetForm() }
    ui.tab = name
    TABS.forEach(function (t) {
      var on = t === name
      var tb = $('tab-' + t)
      tb.setAttribute('aria-selected', on ? 'true' : 'false')
      tb.tabIndex = on ? 0 : -1
      $('panel-' + t).hidden = !on
    })
    renderAll()
    if (!(opt && opt.noScroll)) {
      var tabsH = $('tabs').getBoundingClientRect().height
      var top = $('panel-' + name).getBoundingClientRect().top
      if (top < tabsH) window.scrollBy(0, top - tabsH)
    }
  }
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[role="tab"]')
    if (b) { load(); openTab(b.id.slice(4)) }
  })
  $('tabs').addEventListener('keydown', function (e) {
    var i = TABS.indexOf(ui.tab); var j = null
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = TABS.length - 1
    if (j === null) return
    e.preventDefault()
    load()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  function goPanel (n) {
    load()
    openTab(n, { noScroll: true })
    $('panel-' + n).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    $(n + '-h').focus({ preventScroll: true })
  }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); goPanel(a.getAttribute('data-step')) })
  })

  // ---------- 今日の締めのフォーム（§6-2。最初に1回だけ作る） ----------
  var CID = DENOMS.map(function (d) { return 'n-' + d })
  function buildCountRows () {
    var box = $('count-rows')
    DENOMS.forEach(function (d, i) {
      var row = el('div', 'count-row'); row.id = 'row-' + d
      var lb = el('label', 'count-label', DN[i]); lb.setAttribute('for', CID[i])
      var inp = el('input', 'input count-input'); inp.id = CID[i]; inp.type = 'text'; inp.setAttribute('inputmode', 'numeric'); inp.autocomplete = 'off'
      inp.setAttribute('aria-describedby', CID[i] + '-amt err-' + CID[i])
      var out = el('output', 'count-amt'); out.id = CID[i] + '-amt'; out.setAttribute('for', CID[i]); out.setAttribute('aria-live', 'off')
      var err = el('p', 'field__err'); err.id = 'err-' + CID[i]; err.hidden = true
      add(row, [lb, inp, out, err])
      box.appendChild(row)
    })
  }
  buildCountRows()
  function checkedVal (name) { var c = document.querySelector('#close-form input[name="' + name + '"]:checked'); return c ? c.value : null }
  function syncPicks () {
    Array.prototype.forEach.call(document.querySelectorAll('#close-form .pick-btn'), function (lb) {
      lb.classList.toggle('is-on', lb.querySelector('input').checked)
    })
  }
  function setRadio (name, v) {
    Array.prototype.forEach.call(document.querySelectorAll('#close-form input[name="' + name + '"]'), function (r) { r.checked = r.value === v })
  }
  // 誤りの文（入力値は引用しない。§11）
  function showErrP (errId, msg) {
    var p = $(errId)
    setText(p, [icon('i-err', 16, 'field__err-ic'), el('span', 'field__err-msg', msg)])
    p.hidden = false
  }
  function hideErrP (errId) { var p = $(errId); p.hidden = true; p.textContent = '' }
  // key → [誤りの文の id、aria-invalid を付ける欄（ラジオの組は最初のラジオ）]。並びは画面の上から（DOM の順）
  var FORM_ERR = { date: ['err-c-date', 'c-date'], reg: ['err-c-reg', 'c-reg'], card: ['err-c-card', 'c-card'], qr: ['err-c-qr', 'c-qr'], cust: ['err-c-cust', 'c-cust'] }
  CID.forEach(function (id) { FORM_ERR[id] = ['err-' + id, id] })
  FORM_ERR.reason = ['err-reason', 'r-count']
  FORM_ERR.note = ['err-c-note', 'c-note']
  FORM_ERR.role = ['err-role', 'role-early']
  var ERR_ORDER = ['date', 'reg', 'card', 'qr', 'cust'].concat(CID).concat(['reason', 'note', 'role'])
  var formErr = {}
  function setFormErr (key, msg) {
    formErr[key] = msg
    showErrP(FORM_ERR[key][0], msg)
    $(FORM_ERR[key][1]).setAttribute('aria-invalid', 'true')
    var fs = $(FORM_ERR[key][1]).closest('fieldset'); if (fs) fs.setAttribute('data-bad', '1')
  }
  function clearFormErr (key) {
    if (!own(formErr, key)) return
    delete formErr[key]
    hideErrP(FORM_ERR[key][0])
    $(FORM_ERR[key][1]).removeAttribute('aria-invalid')
    var fs = $(FORM_ERR[key][1]).closest('fieldset'); if (fs) fs.removeAttribute('data-bad')
  }
  function clearAllFormErr () { Object.keys(FORM_ERR).forEach(clearFormErr) }
  var REG_FIELDS = { reg: ['c-reg', '現金売上（レジの記録）', parseYen], card: ['c-card', 'カード', parseYen], qr: ['c-qr', 'QR（スマホ決済）', parseYen], cust: ['c-cust', '客数', parseCust] }
  function regErr (k) {
    var f = REG_FIELDS[k]; var r = f[2]($(f[0]).value)
    if (!r.e) return null
    if (k === 'cust') return '客数は 0〜9,999 の整数で入れてください'
    return r.e === 'empty' ? f[1] + 'を入れてください（無い日は 0）' : f[1] + 'は 0〜9,999,999 の整数（円）で入れてください'
  }
  function isClosed (date) { return S.closes.some(function (r) { return r.date === date }) }
  function dateErr () {
    var r = parseDate($('c-date').value)
    if (r.e) return DATE_MSG[r.e]
    return isClosed(r.v) ? DATE_MSG.dup : null
  }
  function countErr (i) { var r = parseCount($(CID[i]).value); return r.e ? countMsg(r.e, DN[i]) : null }
  function errOf (key) {
    if (key === 'date') return dateErr()
    if (own(REG_FIELDS, key)) return regErr(key)
    var i = CID.indexOf(key)
    if (i >= 0) return countErr(i)
    return null
  }
  // いまの入力から計算する（誤りがあれば null）
  function readForm () {
    var counts = []; var cBad = false
    CID.forEach(function (id) { var r = parseCount($(id).value); if (r.e) { cBad = true; counts.push(null) } else counts.push(r.v) })
    var reg = {}; var rBad = {}
    Object.keys(REG_FIELDS).forEach(function (k) { var f = REG_FIELDS[k]; var r = f[2]($(f[0]).value); reg[k] = r.e ? null : r.v; rBad[k] = !!r.e })
    var o = { counts: counts, countsBad: cBad, reg: reg, regBad: rBad }
    if (!cBad) {
      o.counted = counts.reduce(function (a, c, i) { return a + c * DENOMS[i] }, 0)
      o.actual = o.counted - FLOAT
      o.plan = floatPlan(counts)
      if (!rBad.reg) o.diff = o.actual - reg.reg
    }
    if (!rBad.reg && !rBad.card && !rBad.qr) o.total = reg.reg + reg.card + reg.qr
    return o
  }
  function liveMsg (f) {
    if (f.countsBad) return '枚数に直すところがあります'
    if (f.diff == null) return 'レジの記録に直すところがあります'
    return '過不足 ' + fmtDiff(f.diff) + ' ' + KIND_L[diffKind(f.diff)]
  }
  function updateCount () { $('c-note-count').textContent = Array.from($('c-note').value).length + '／60字' }
  function setDateRead () {
    var r = parseDate($('c-date').value)
    $('c-date-read').textContent = r.e ? '' : jpDate(r.v)
    $('c-date-wed').hidden = !!r.e || wdIdx(r.v) !== 3
  }
  // 数え表・結果の箱・釣り銭の目安を描き直す（フォームの欄そのものは触らない）
  function renderCalc () {
    var f = readForm()
    CID.forEach(function (id, i) {
      var o = $(id + '-amt')
      o.textContent = f.counts[i] === null ? '—' : yen(f.counts[i] * DENOMS[i])
      o.classList.toggle('is-wait', f.counts[i] === null)
    })
    var wait = f.countsBad ? '枚数の誤りを直すと出ます' : f.diff == null ? 'レジの記録の誤りを直すと出ます' : ''
    $('count-total').textContent = f.countsBad ? '—' : yen(f.counted)
    $('cr-counted').textContent = f.countsBad ? '—' : yen(f.counted)
    $('cr-float').textContent = yen(FLOAT)
    $('cr-actual').textContent = f.countsBad ? '—' : yen(f.actual)
    $('cr-reg').textContent = f.regBad.reg ? '—' : yen(f.reg.reg)
    var has = f.diff != null
    $('cr-diff').textContent = has ? fmtDiff(f.diff) : '—'
    setText($('cr-tag'), has ? stateTag(diffKind(f.diff)) : null)
    $('cr-wait').textContent = wait; $('cr-wait').hidden = !wait
    $('close-result').classList.toggle('close-result--diff', has && f.diff !== 0)
    $('under-float').hidden = f.countsBad || f.actual >= 0
    var showReason = has && f.diff !== 0
    $('reason-area').hidden = !showReason
    if (!showReason) { clearFormErr('reason'); clearFormErr('note') }
    // 売上合計（レジの記録）
    var rt = $('reg-total')
    if (f.total == null) setText(rt, ['売上合計 —', el('span', 'sub-note', '（レジの記録の誤りを直すと出ます）')])
    else setText(rt, [nw('売上合計'), ' ', nw(yen(f.total)), el('span', 'sub-note', '（レジの記録の合計）')])
    // 明日の釣り銭に残す目安（§6-4）
    var tb = $('float-tbody'); tb.textContent = ''
    DENOMS.forEach(function (d, i) {
      var th = el('th', null, DN[i]); th.setAttribute('scope', 'row')
      var bad = f.countsBad
      var keepTd = el('td', 'num')
      if (bad) keepTd.textContent = '—'
      else {
        add(keepTd, nw(n3(f.plan.keep[i]) + '枚'))
        if (f.plan.lack[i] > 0 && f.actual >= 0) keepTd.appendChild(el('span', 'float-lack', n3(f.plan.lack[i]) + '枚足りない'))
      }
      add(tb, add(el('tr'), [th, el('td', 'num nw', bad ? '—' : n3(f.counts[i]) + '枚'), keepTd, el('td', 'num nw', bad ? '—' : n3(f.plan.out[i]) + '枚')]))
    })
    var fs = $('float-sum'); var fsh = $('float-short')
    fsh.hidden = true
    if (f.countsBad) setText(fs, '残す —・取り出す —')
    else if (f.actual < 0) setText(fs, '残す 0円・取り出す 0円')
    else {
      setText(fs, ['残す ', nw(yen(f.plan.keepY)), '・取り出す ', nw(yen(f.plan.outY)), '（入金に回す）'])
      if (f.plan.lackY > 0) { setText(fsh, lackText(f.plan, f.actual)); fsh.hidden = false }
    }
    // 1024px〜：右の列が画面より高い時は貼り付けない（下が隠れないように）
    var rin = $('close-right-in')
    rin.classList.remove('is-static')
    if (rin.getBoundingClientRect().height > window.innerHeight - 56 - 32) rin.classList.add('is-static')
    wrapWords($('panel-close'))
    return f
  }
  // 「500円玉が 1枚足りません。…入金に回す額は 41,520円 です」
  function lackText (plan, actual) {
    var parts = []
    plan.lack.forEach(function (l, i) { if (l > 0) parts.push(DN[i] + 'が ' + n3(l) + '枚') })
    return parts.join('、') + '足りません。取り出すお札から ' + yen(plan.lackY) + '分を両替して残すと、明日の釣り銭が ' + yen(FLOAT) + ' になります。入金に回す額は ' + yen(actual) + ' です'
  }
  // 打っている途中の読み上げ（止まって 600ms 後に1回。同じ文は続けて読まない）
  function scheduleLive () {
    window.clearTimeout(liveTimer)
    liveTimer = window.setTimeout(function () {
      liveTimer = null
      var msg = liveMsg(readForm())
      if (msg === lastLive) return
      lastLive = msg
      var sr = $('sr-status')
      window.clearTimeout(srTimer)
      sr.textContent = ''
      srTimer = window.setTimeout(function () { sr.textContent = msg }, 50)
    }, 600)
  }
  function resetForm () {
    clearAllFormErr()
    $('close-form').reset()
    $('c-date').value = TODAY
    $('c-reg').value = String(TODAY_REG.regCash); $('c-card').value = String(TODAY_REG.card); $('c-qr').value = String(TODAY_REG.qr); $('c-cust').value = String(TODAY_REG.customers)
    CID.forEach(function (id) { $(id).value = '' })
    $('c-note').value = ''
    syncPicks(); updateCount(); setDateRead(); renderCalc()
    lastLive = liveMsg(readForm())
  }
  function fillForm (r) {
    clearAllFormErr()
    $('c-date').value = r.date
    $('c-reg').value = String(r.regCash); $('c-card').value = String(r.card); $('c-qr').value = String(r.qr); $('c-cust').value = String(r.customers)
    CID.forEach(function (id, i) { $(id).value = String(r.counts[i]) })
    setRadio('reason', r.reason); setRadio('role', r.role)
    $('c-note').value = r.note
    syncPicks(); updateCount(); setDateRead(); renderCalc()
    lastLive = liveMsg(readForm())
  }
  var form = $('close-form')
  form.addEventListener('input', function (e) {
    var t = e.target
    if (t.id === 'c-note') { updateCount(); if (own(formErr, 'note') && !checkNote(t.value).e) clearFormErr('note'); return }
    if (t.type === 'radio') return
    var key = t.id === 'c-date' ? 'date' : t.id === 'c-reg' ? 'reg' : t.id === 'c-card' ? 'card' : t.id === 'c-qr' ? 'qr' : t.id === 'c-cust' ? 'cust' : t.id
    if (own(formErr, key) && errOf(key) === null) clearFormErr(key)
    if (t.id === 'c-date') { setDateRead(); return }
    renderCalc()
    scheduleLive()
  })
  // 誤りの文は blur の時と「締める」の時に出す（打っている途中で赤くしない）
  form.addEventListener('focusout', function (e) {
    var t = e.target
    if (!t.matches || !t.matches('input[type=text]')) return
    var key = t.id === 'c-date' ? 'date' : t.id === 'c-reg' ? 'reg' : t.id === 'c-card' ? 'card' : t.id === 'c-qr' ? 'qr' : t.id === 'c-cust' ? 'cust' : t.id
    var m = errOf(key)
    if (m) setFormErr(key, m); else clearFormErr(key)
  })
  form.addEventListener('change', function (e) {
    var t = e.target
    if (t.type === 'radio') { clearFormErr(t.name); syncPicks() }
  })
  // 次の欄（Enter で締めない。枚数の欄の Enter は次の金種へ、1円玉の次は理由か締めた人へ）
  var TEXT_ORDER = ['c-date', 'c-reg', 'c-card', 'c-qr', 'c-cust'].concat(CID)
  function radioTarget (name) { var c = document.querySelector('#close-form input[name="' + name + '"]:checked'); return c || document.querySelector('#close-form input[name="' + name + '"]') }
  form.addEventListener('keydown', function (e) {
    var t = e.target
    if (e.key === 'Enter' && t.tagName === 'INPUT') {
      e.preventDefault()
      var i = TEXT_ORDER.indexOf(t.id)
      if (i < 0) return
      if (i < TEXT_ORDER.length - 1) $(TEXT_ORDER[i + 1]).focus()
      else (!$('reason-area').hidden ? radioTarget('reason') : radioTarget('role')).focus()
      return
    }
    if (t.type === 'radio' && (e.key === 'Home' || e.key === 'End')) {
      var g = document.querySelectorAll('#close-form input[name="' + t.name + '"]')
      var r = g[e.key === 'Home' ? 0 : g.length - 1]
      e.preventDefault()
      r.checked = true; r.focus()
      r.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  // 見本の枚数（§20-3）。レジの記録・日付・理由・締めた人は変えない
  function preset (k) {
    CID.forEach(function (id, i) { $(id).value = k === 'clear' ? '' : String(PRESET[k][i]); clearFormErr(id) })
    var f = renderCalc()
    var msg = liveMsg(f)
    lastLive = msg
    announce((k === 'clear' ? '枚数を空にしました。' : PRESET_L[k] + 'を入れました。') + msg, 0)
  }
  ;[['smp-even', 'even'], ['smp-over', 'over'], ['smp-short', 'short'], ['smp-clear', 'clear']].forEach(function (p) {
    $(p[0]).addEventListener('click', function () { preset(p[1]) })
  })

  // 締める（§6-2・§12-3）
  function nextNo () {
    // 番号が上限に来た時は 1 から振り直す（直前の1件は取り消せなくなる）
    if (S.seq >= 100000) { S.closes.sort(byDate).forEach(function (r, i) { r.no = i + 1 }); S.seq = S.closes.length + 1 }
    var no = S.seq; S.seq = S.seq + 1
    return no
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    if (e.submitter && e.submitter.id !== 'btn-close') return
    load()
    clearAllFormErr()
    var errs = []
    ERR_ORDER.forEach(function (k) { var m = errOf(k); if (m) errs.push([k, m]) })
    var f = readForm()
    var needWhy = f.diff != null && f.diff !== 0
    var reason = checkedVal('reason'); var nr = checkNote($('c-note').value)
    if (needWhy) {
      if (!reason) errs.push(['reason', '過不足があるときは、理由を選んでください'])
      if (nr.e) errs.push(['note', noteMsg(nr)])
    }
    var role = checkedVal('role')
    if (!role) errs.push(['role', '締めた人（役割）を選んでください'])
    if (errs.length) {
      errs.sort(function (a, b) { return ERR_ORDER.indexOf(a[0]) - ERR_ORDER.indexOf(b[0]) })
      errs.forEach(function (x) { setFormErr(x[0], x[1]) })
      $(FORM_ERR[errs[0][0]][1]).focus()
      announce('締められませんでした。直すところが ' + errs.length + 'か所あります')
      return
    }
    var date = parseDate($('c-date').value).v
    var rec = { no: 0, date: date, counts: f.counts.slice(), regCash: f.reg.reg, card: f.reg.card, qr: f.reg.qr, customers: f.reg.cust, role: role, reason: needWhy ? reason : '', note: needWhy ? nr.v : '' }
    // 書く直前に読み直して、同じ日が無いことを確かめる（別のタブで締めていた時）
    load()
    if (isClosed(date)) {
      setFormErr('date', DATE_MSG.dup); $('c-date').focus()
      announce('締められませんでした。直すところが 1か所あります')
      return
    }
    rec.no = nextNo()
    S.closes.push(rec); S.closes.sort(byDate)
    save()
    // 番号だけでなく日付も持つ（別のタブで見本に戻して同じ番号が別の記録になった時に、別の記録を消さない）
    ui.lastClosed = { date: rec.date, no: rec.no }
    ui.doneRec = JSON.parse(JSON.stringify(rec))
    ui.view = 'done'
    renderAll()
    var c = closeCalc(rec)
    showToast(jpDate(rec.date) + 'を締めました', jpDate(rec.date) + 'を締めました。過不足 ' + fmtDiff(c.diff) + ' ' + KIND_L[diffKind(c.diff)] + '。日報に入りました')
    $('slip-h').focus()
  })
  // 直前の1件（date と no の両方が合う記録がある時だけ）
  function lastClosed () {
    var la = ui.lastClosed
    if (!la || !S) return null
    var r = S.closes.filter(function (x) { return x.date === la.date && x.no === la.no })
    return r.length ? r[0] : null
  }
  $('undo-btn').addEventListener('click', function () {
    load()
    var r = lastClosed()
    var keep = ui.doneRec
    ui.lastClosed = null
    ui.view = 'form'
    if (!r) { ui.doneRec = null; resetForm(); renderAll(); $('c-date').focus(); announce('この締めはもうありません'); return }
    S.closes = S.closes.filter(function (x) { return !(x.date === r.date && x.no === r.no) })
    save()
    ui.doneRec = null
    // 取り消した記録の値を入れたまま（直してすぐ締め直せるように）
    fillForm(keep || r)
    renderAll()
    $('c-date').focus()
    showToast('締めを取り消しました', jpDate(r.date) + 'の締めを取り消しました')
  })
  $('btn-next').addEventListener('click', function () {
    load(); ui.lastClosed = null; ui.doneRec = null; ui.view = 'form'
    resetForm(); renderAll(); $('c-date').focus()
  })
  $('btn-go-daily').addEventListener('click', function () {
    if (ui.doneRec) ui.dailyYm = ui.doneRec.date.slice(0, 7)
    goPanel('daily')
  })
  $('btn-slip-now').addEventListener('click', function () { if (ui.doneRec) doPrint('slip', ui.doneRec) })
  function slipLines (r) {
    var c = closeCalc(r); var k = diffKind(c.diff)
    return {
      date: [nw(jpDate(r.date)), '　締めた人 ', nw(ROLE_L[r.role])],
      l1: [nw('数えた現金'), ' ', nw(yen(c.counted)), ' ／ ', nw('現金売上（実際）'), ' ', nw(yen(c.actual))],
      l2: ['レジの記録 ', nw(yen(r.regCash)), ' ／ 過不足 ', nw(fmtDiff(c.diff)), stateTag(k)],
      l3: [nw('売上合計'), ' ', nw(yen(c.total)), '・客数 ', nw(n3(r.customers) + '人'), '・', nw('客単価'), ' ', nw(c.unit === null ? '—' : yen(c.unit))],
      reason: k === 'even' ? null : ['理由 ', nw(REASON_L[r.reason])],
      note: k === 'even' ? null : '「' + r.note + '」'
    }
  }
  function renderClose () {
    if (ui.view === 'done' && !ui.doneRec) ui.view = 'form'
    form.hidden = ui.view !== 'form'
    $('close-done').hidden = ui.view !== 'done'
    if (ui.view !== 'done') { renderCalc(); return }
    var r = ui.doneRec; var sl = slipLines(r)
    setText($('slip-date-line'), sl.date)
    setText($('slip-l1'), sl.l1); setText($('slip-l2'), sl.l2); setText($('slip-l3'), sl.l3)
    $('slip-l4').hidden = !sl.reason; setText($('slip-l4'), sl.reason)
    $('slip-l5').hidden = !sl.note; $('slip-l5').textContent = sl.note || ''
    setText($('done-note'), ['デモ：この端末の日報（', nw(jpMonth(r.date.slice(0, 7))), '）に入りました（送信はしていません）'])
    $('undo-btn').hidden = !lastClosed()
  }

  // ---------- 月の選択 ----------
  function fillSelect (sel, opts) {
    if (sel.options.length) return
    opts.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op) })
  }
  var MONTH_OPTS = MONTHS.map(function (m) { return [m, jpMonth(m)] })

  // ---------- 日報（§7） ----------
  function overShort (ms, sep, paren) {
    var f = function (lab, o) { return o.n ? lab + ' ' + o.n + '回' + (paren ? '（' + fmtDiff(o.sum) + '）' : ' ' + fmtDiff(o.sum)) : lab + ' 0回' }
    return f('多い', ms.over) + sep + f('少ない', ms.short)
  }
  // 内訳（項目ごとに折れないように）
  function breakdown (cash, card, qr) { return [nw('現金 ' + yen(cash)), '・', nw('カード ' + yen(card)), '・', nw('QR ' + yen(qr))] }
  function overShortNodes (ms, sep, paren) { return overShort(ms, '\n', paren).split('\n').reduce(function (a, t, i) { return a.concat(i ? [sep, nw(t)] : [nw(t)]) }, []) }
  function dailyMsg (ms) {
    if (!ms.n) return jpMonth(ms.ym) + '。締めの記録はありません'
    return jpMonth(ms.ym) + '。営業 ' + ms.n + '日、売上合計 ' + yen(ms.total) + '、過不足 ' + ms.diffN + '回'
  }
  function nowMark (date) { var la = lastClosed(); return !!la && la.date === date }
  function renderDaily () {
    var ym = ui.dailyYm
    var sel = $('daily-month'); fillSelect(sel, MONTH_OPTS); sel.value = ym
    var ms = monthStats(S, ym); var days = monthDays(S, ym)
    $('ds-total').textContent = n3(ms.total)
    setText($('ds-total-note'), breakdown(ms.cash, ms.card, ms.qr))
    $('ds-days').textContent = String(ms.n)
    $('ds-days-note').textContent = '1日平均 ' + (ms.n ? yen(ms.avgSale) : '—')
    $('ds-cust').textContent = n3(ms.customers)
    $('ds-cust-note').textContent = ms.n ? '客単価 ' + (ms.unit === null ? '—' : yen(ms.unit)) + '（1日平均 ' + n3(ms.avgCust) + '人）' : '客単価 —'
    $('ds-diff').textContent = String(ms.diffN)
    $('ds-diff-sum').textContent = ms.n ? '合計 ' + fmtDiff(ms.diffSum) : ''
    $('ds-diff-sum').hidden = !ms.n
    setText($('ds-diff-note'), ms.n ? overShortNodes(ms, '・', true) : null)
    $('ds-diff-note').hidden = !ms.n
    $('daily-none').hidden = ms.n > 0
    var dc = $('day-count')
    dc.hidden = !ms.n
    dc.textContent = ms.n ? days.length + '日のうち 過不足のあった日 ' + ms.diffN + '日' : ''
    $('daily-cap').textContent = jpMonth(ym) + ' 日報'
    // カード（〜1023px）
    var cards = $('day-cards'); cards.textContent = ''
    var tb = $('daily-tbody'); tb.textContent = ''
    days.forEach(function (d) {
      if (d.kind !== 'rec') {
        var cc = el('div', 'day-card day-card--closed'); cc.setAttribute('data-date', d.date)
        add(cc, [el('span', 'day-card__d nw', mdw(d.date)), stateTag(d.kind)])
        cards.appendChild(cc)
        var th0 = el('th', 'nw', mdw(d.date)); th0.setAttribute('scope', 'row')
        var td0 = el('td'); td0.colSpan = 8; td0.appendChild(stateTag(d.kind))
        var tr0 = add(el('tr', 'is-closed'), [th0, td0]); tr0.setAttribute('data-date', d.date)
        tb.appendChild(tr0)
        return
      }
      var r = d.rec; var c = closeCalc(r); var k = diffKind(c.diff); var isD = k !== 'even'
      var card = el('article', 'day-card' + (isD ? ' day-card--diff' : '')); card.setAttribute('data-date', d.date)
      var h = add(el('h4', 'day-card__h'), [nw(mdw(d.date)), el('span', 'day-card__role nw', ROLE_L[r.role]), nowMark(d.date) ? el('span', 'day-card__now nw', '（いま締めた日）') : null])
      add(card, [
        h,
        add(el('p', 'day-card__l1'), [add(el('span'), ['売上合計 ', el('b', 'nw', yen(c.total))]), add(el('span'), ['客数 ', nw(n3(r.customers) + '人')]), add(el('span'), ['客単価 ', nw(c.unit === null ? '—' : yen(c.unit))])]),
        add(el('p', 'day-card__l2'), breakdown(r.regCash, r.card, r.qr)),
        add(el('p', 'day-card__l3'), ['過不足 ', nw(fmtDiff(c.diff)), stateTag(k), isD ? el('span', 'day-card__reason nw', REASON_L[r.reason]) : null]),
        isD ? el('p', 'day-card__note', '「' + r.note + '」') : null
      ])
      cards.appendChild(card)
      // 表（1024px〜）
      var th = el('th', 'nw'); th.setAttribute('scope', 'row')
      add(th, [mdw(d.date), nowMark(d.date) ? el('span', 'now-mark', '（いま締めた日）') : null])
      var dcell = add(el('td', 'c-diffv'), add(el('span', 'diff-cell'), [nw(fmtDiff(c.diff)), stateTag(k), isD ? el('span', 'diff-cell__r', REASON_L[r.reason]) : null]))
      var tr = add(el('tr', isD ? 'is-diff has-note' : null), [th, el('td', 'nw', ROLE_L[r.role]), el('td', 'num nw', yen(c.total)), el('td', 'num nw', yen(r.regCash)), el('td', 'num nw', yen(r.card)), el('td', 'num nw', yen(r.qr)),
        el('td', 'num nw', n3(r.customers) + '人'), el('td', 'num nw', c.unit === null ? '—' : yen(c.unit)), dcell])
      tr.setAttribute('data-date', d.date)
      tb.appendChild(tr)
      if (isD) {
        var nt = el('td'); nt.colSpan = 9
        add(nt, [el('span', 'note-row__l', 'ひとこと：'), r.note])
        tb.appendChild(add(el('tr', 'note-row is-diff'), nt))
      }
    })
    var tf = $('daily-tfoot'); tf.textContent = ''
    if (ms.n) {
      var fth = el('th', 'nw', (Number(ym.slice(5)) + '月の合計')); fth.setAttribute('scope', 'row')
      tf.appendChild(add(el('tr'), [fth, el('td', null, '—'), el('td', 'num nw', yen(ms.total)), el('td', 'num nw', yen(ms.cash)), el('td', 'num nw', yen(ms.card)), el('td', 'num nw', yen(ms.qr)),
        el('td', 'num nw', n3(ms.customers) + '人'), el('td', 'num nw', ms.unit === null ? '—' : yen(ms.unit)), el('td', 'nw', ms.diffN + '回 ' + fmtDiff(ms.diffSum))]))
    }
    wrapWords($('panel-daily'))
  }
  $('daily-month').addEventListener('change', function () {
    load()
    ui.dailyYm = $('daily-month').value
    renderAll()
    announce(dailyMsg(monthStats(S, ui.dailyYm)))
  })

  // ---------- 振り返り（§8） ----------
  var WD_ORDER = [1, 2, 3, 4, 5, 6, 0]
  function reviewMsg (ms) {
    if (!ms.n) return jpMonth(ms.ym) + '。締めの記録はありません'
    var best = null
    WD_ORDER.forEach(function (i) { var o = ms.wd[i]; if (o.n && (best === null || o.avgSale > ms.wd[best].avgSale)) best = i })
    return jpMonth(ms.ym) + '。いちばん平均売上が多いのは ' + WD[best] + '曜 ' + yen(ms.wd[best].avgSale)
  }
  function renderReview () {
    var ym = ui.reviewYm
    var sel = $('review-month'); fillSelect(sel, MONTH_OPTS); sel.value = ym
    var ms = monthStats(S, ym)
    $('review-none').hidden = ms.n > 0
    $('review-grid').hidden = !ms.n
    var cards = $('wd-cards'); cards.textContent = ''
    var tb = $('wd-tbody'); tb.textContent = ''
    $('wd-cap').textContent = jpMonth(ym) + ' 曜日ごとの平均'
    if (ms.n) {
      var maxS = Math.max.apply(null, ms.wd.map(function (o) { return o.n ? o.avgSale : 0 }))
      var maxC = Math.max.apply(null, ms.wd.map(function (o) { return o.n ? o.avgCust : 0 }))
      WD_ORDER.forEach(function (i) {
        var o = ms.wd[i]
        var th = el('th', 'nw', WD[i]); th.setAttribute('scope', 'row')
        if (!o.n) {
          var k = i === 3 ? 'closed' : 'none'
          var tag = i === 3 ? stateTag('closed') : add(el('span', 'state-tag state-tag--none'), '記録なし')
          var cc = add(el('div', 'wd-card wd-card--closed'), [add(el('span', 'wd-card__h'), [nw(WD[i]), el('span', 'wd-card__n nw', '0日')]), tag])
          cc.setAttribute('data-wd', WD[i]); cc.setAttribute('data-kind', k)
          cards.appendChild(cc)
          var td0 = el('td'); td0.colSpan = 4
          add(td0, [el('span', 'nw', '0日'), ' ', i === 3 ? stateTag('closed') : add(el('span', 'state-tag state-tag--none'), '記録なし')])
          var tr0 = add(el('tr', 'is-closed'), [th, td0]); tr0.setAttribute('data-wd', WD[i])
          tb.appendChild(tr0)
          return
        }
        var card = el('article', 'wd-card'); card.setAttribute('data-wd', WD[i])
        add(card, [
          add(el('h4', 'wd-card__h'), [nw(WD[i]), el('span', 'wd-card__n nw', o.n + '日')]),
          add(el('div', 'bar-row'), [el('span', 'bar-row__l', '平均売上'), bar(o.avgSale, maxS), el('span', 'bar-row__v', yen(o.avgSale))]),
          add(el('div', 'bar-row'), [el('span', 'bar-row__l', '平均客数'), bar(o.avgCust, maxC), el('span', 'bar-row__v', n3(o.avgCust) + '人')]),
          el('p', 'wd-card__unit', '客単価 ' + (o.unit === null ? '—' : yen(o.unit)))
        ])
        cards.appendChild(card)
        var tr = add(el('tr'), [th, el('td', 'num nw', o.n + '日'),
          add(el('td'), add(el('div', 'bar-cell'), [el('span', 'bar-cell__v', yen(o.avgSale)), bar(o.avgSale, maxS)])),
          add(el('td'), add(el('div', 'bar-cell'), [el('span', 'bar-cell__v', n3(o.avgCust) + '人'), bar(o.avgCust, maxC)])),
          el('td', 'num nw', o.unit === null ? '—' : yen(o.unit))])
        tr.setAttribute('data-wd', WD[i])
        tb.appendChild(tr)
      })
      setText($('rs-lead'), ['過不足のあった日 ', nw(ms.diffN + '日'), '（営業 ', nw(ms.n + '日'), 'のうち）'])
      setText($('rs-lead2'), overShortNodes(ms, ' ／ ', false))
      var ul = $('reason-bars'); ul.textContent = ''
      var maxR = Math.max.apply(null, REASONS.map(function (k) { return ms.reasons[k].n }))
      REASONS.forEach(function (k) {
        var o = ms.reasons[k]
        var li = add(el('li', 'rbar'), [el('span', 'rbar__l', REASON_L[k]), bar(o.n, maxR), el('span', 'rbar__v', o.n + '回（' + (o.n ? fmtDiff(o.sum) : '0円') + '）')])
        li.setAttribute('data-reason', k)
        ul.appendChild(li)
      })
    }
    wrapWords($('panel-review'))
  }
  $('review-month').addEventListener('change', function () {
    load()
    ui.reviewYm = $('review-month').value
    renderAll()
    announce(reviewMsg(monthStats(S, ui.reviewYm)))
  })

  // ---------- CSV・印刷（§9） ----------
  var NONE_MSG = 'この月の締めの記録はありません'
  function setDisabled (b, off) {
    if (off) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', 'export-none') } else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby') }
  }
  function csvName () { return 'hinatagi_nippou_' + ui.expYm + '.csv' }
  function renderExport () {
    var sel = $('export-month'); fillSelect(sel, MONTH_OPTS); sel.value = ui.expYm
    var rows = monthRecs(S, ui.expYm); var n = rows.length
    $('export-none').hidden = n > 0
    setDisabled($('btn-csv'), !n); setDisabled($('btn-print'), !n); setDisabled($('btn-slip'), !n)
    setText($('csv-name'), ['ファイル名：', nw(csvName()), nw('（' + n + '日分）')])
    $('csv-peek').textContent = buildCsv(S, ui.expYm).slice(1).split('\r\n').filter(function (l) { return l !== '' }).slice(0, 4).join('\n')
    // 控えの日（新しい順。最初は一番新しい日）
    var sd = $('slip-date'); sd.textContent = ''
    var dates = rows.map(function (r) { return r.date }).reverse()
    if (!n) {
      add(sd, el('option', null, '（記録なし）')); sd.firstChild.value = ''
      sd.setAttribute('aria-disabled', 'true'); sd.setAttribute('aria-describedby', 'export-none')
      ui.slipDate = null
    } else {
      sd.removeAttribute('aria-disabled'); sd.removeAttribute('aria-describedby')
      dates.forEach(function (d) { var op = el('option', null, mdw(d)); op.value = d; sd.appendChild(op) })
      if (!ui.slipDate || dates.indexOf(ui.slipDate) < 0) ui.slipDate = dates[0]
      sd.value = ui.slipDate
    }
    wrapWords($('panel-export'))
  }
  $('export-month').addEventListener('change', function () { load(); ui.expYm = $('export-month').value; ui.slipDate = null; renderAll() })
  $('slip-date').addEventListener('change', function () { if ($('slip-date').value) ui.slipDate = $('slip-date').value })
  $('slip-date').addEventListener('keydown', function (e) { if ($('slip-date').getAttribute('aria-disabled') === 'true' && /^Arrow|^Home$|^End$/.test(e.key)) e.preventDefault() })
  function renderCols () {
    var tb = $('csv-cols'); tb.textContent = ''
    CSV_COLS.forEach(function (c, i) { add(tb, add(el('tr'), [el('td', null, String(i + 1)), el('td', 'nw', c[0]), el('td', null, c[1])])) })
  }
  $('btn-csv').addEventListener('click', function () {
    load()
    var n = monthRecs(S, ui.expYm).length
    if (!n) { announce(NONE_MSG); return }
    var blob = new Blob([buildCsv(S, ui.expYm)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url; a.download = csvName()
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    showToast('CSV を作りました（' + jpMonth(ui.expYm) + '・' + n + '日分）')
  })
  $('btn-print').addEventListener('click', function () {
    load()
    if (!monthRecs(S, ui.expYm).length) { announce(NONE_MSG); return }
    doPrint('daily', ui.expYm)
  })
  $('btn-slip').addEventListener('click', function () {
    load()
    var r = S.closes.filter(function (x) { return x.date === ui.slipDate })[0]
    if (!monthRecs(S, ui.expYm).length || !r) { announce(NONE_MSG); return }
    doPrint('slip', r)
  })

  // ---------- 紙面（§14。値は textContent） ----------
  function stampSvg () {
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('class', 'stamp'); s.setAttribute('width', '56'); s.setAttribute('height', '56'); s.setAttribute('viewBox', '0 0 56 56')
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', '見本の印（この紙は見本です）')
    function sv (tag, at, text) {
      var e = document.createElementNS(NS, tag)
      Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]) })
      if (text) e.textContent = text
      s.appendChild(e)
    }
    sv('rect', { x: '1.5', y: '1.5', width: '53', height: '53', rx: '4', fill: 'none', stroke: '#B23A2E', 'stroke-width': '3' })
    sv('rect', { x: '6.5', y: '6.5', width: '43', height: '43', rx: '2', fill: 'none', stroke: '#B23A2E', 'stroke-width': '1' })
    var ft = { x: '28', 'text-anchor': 'middle', 'font-size': '18', 'font-weight': '700', fill: '#B23A2E', 'font-family': 'Hiragino Mincho ProN, Yu Mincho, YuMincho, serif' }
    sv('text', Object.assign({ y: '26' }, ft), '見')
    sv('text', Object.assign({ y: '45' }, ft), '本')
    return s
  }
  // cols：[見出し, 幅 mm（0 は残り）, 右寄せ, 折り返す]
  function sheetTable (cols, rows, cls, foot) {
    var cg = el('colgroup')
    cols.forEach(function (c) { var col = el('col'); if (c[1]) col.style.width = c[1] + 'mm'; cg.appendChild(col) })
    var thead = add(el('thead'), add(el('tr'), cols.map(function (c) { var t = el('th', c[2] ? 'num' : null, c[0]); t.setAttribute('scope', 'col'); return t })))
    var mk = function (r) {
      // 1つのセルに横に広げる行は [文字, colspan] の形
      return add(el('tr'), r.map(function (v, i) {
        var span = Array.isArray(v) ? v[1] : 1
        var e = el(i === 0 ? 'th' : 'td', cols[i][2] && span === 1 ? 'num' : cols[i][3] ? 'wrap' : null, String(Array.isArray(v) ? v[0] : v))
        if (span > 1) e.colSpan = span
        if (i === 0) e.setAttribute('scope', 'row')
        return e
      }))
    }
    var tbody = el('tbody')
    rows.forEach(function (r) { tbody.appendChild(mk(r)) })
    var t = add(el('table', cls), [cg, thead, tbody])
    if (foot) t.appendChild(add(el('tfoot'), mk(foot)))
    return t
  }
  var FOOT_E = 'デモ（架空のお店）です。数字はすべて架空です。TENKA LAB の制作見本です。'
  var PRINT_DAY_COLS = [['日付', 21], ['締めた人', 11], ['売上合計（円）', 20, 1], ['現金（円）', 18, 1], ['カード（円）', 18, 1], ['QR（円）', 18, 1], ['客数', 13, 1], ['客単価（円）', 15, 1], ['過不足（円）', 17, 1], ['理由', 0]]
  var PRINT_DIFF_COLS = [['日付', 21], ['過不足', 24, 1], ['区分', 12], ['理由', 28], ['ひとこと', 0, 0, 1]]
  function sheetHead (title) {
    var shop = el('p', 'sheet__shop', title)
    return [stampSvg(), shop]
  }
  function buildDailySheet (ym) {
    var ms = monthStats(S, ym)
    var title = SHOP + '　' + jpMonth(ym) + 'の日報'
    var cond = el('p', 'sheet__cond', '今日 ' + TODAY + '（デモの日付）で作成　釣り銭準備金 ' + yen(FLOAT))
    if (!ms.n) {
      // 記録0件の月（ブラウザのメニューからの印刷でも白紙にしない）
      return add(el('div', 'sheet'), sheetHead(title).concat([cond, el('p', 'sheet__none', NONE_MSG), el('p', 'sheet__foot', FOOT_E)]))
    }
    var sum = '売上合計 ' + yen(ms.total) + '（現金 ' + yen(ms.cash) + '・カード ' + yen(ms.card) + '・QR ' + yen(ms.qr) + '）／営業 ' + ms.n + '日／1日平均 ' + yen(ms.avgSale) +
      '／客数 ' + n3(ms.customers) + '人・客単価 ' + (ms.unit === null ? '—' : yen(ms.unit)) + '／過不足 ' + ms.diffN + '回 合計 ' + fmtDiff(ms.diffSum)
    var rows = monthDays(S, ym).map(function (d) {
      if (d.kind !== 'rec') return [mdw(d.date), [d.kind === 'closed' ? '定休日（記録なし）' : '締めの記録なし', 9]]
      var r = d.rec; var c = closeCalc(r); var k = diffKind(c.diff)
      return [mdw(d.date), ROLE_L[r.role], n3(c.total), n3(r.regCash), n3(r.card), n3(r.qr), n3(r.customers), c.unit === null ? '—' : n3(c.unit), fmtDiffN(c.diff), k === 'even' ? '' : REASON_L[r.reason]]
    })
    var foot = ['合計', '—', n3(ms.total), n3(ms.cash), n3(ms.card), n3(ms.qr), n3(ms.customers), ms.unit === null ? '—' : n3(ms.unit), fmtDiffN(ms.diffSum), ms.diffN + '回']
    var dd = monthRecs(S, ym).filter(function (r) { return closeCalc(r).diff !== 0 })
    var drows = dd.slice(0, 8).map(function (r) { var c = closeCalc(r); return [mdw(r.date), fmtDiff(c.diff), KIND_L[diffKind(c.diff)], REASON_L[r.reason], r.note] })
    return add(el('div', 'sheet'), sheetHead(title).concat([
      cond,
      el('p', 'sheet__sum', sum),
      sheetTable(PRINT_DAY_COLS, rows, 'sheet__days', foot),
      el('p', 'sheet__h', '過不足のあった日（' + dd.length + '日）'),
      dd.length ? sheetTable(PRINT_DIFF_COLS, drows, 'sheet__diffs') : el('p', 'sheet__line', '過不足のあった日はありません'),
      dd.length > 8 ? el('p', 'sheet__line', 'ほか ' + (dd.length - 8) + '日（CSV に全部あります）') : null,
      el('p', 'sheet__foot', FOOT_E)
    ]))
  }
  var PRINT_SLIP_COLS = [['金種', 30], ['枚数', 26, 1], ['金額（円）', 42, 1], ['明日に残す（枚）', 44, 1], ['取り出す（枚）', 0, 1]]
  function buildSlipSheet (r) {
    var c = closeCalc(r); var k = diffKind(c.diff); var p = floatPlan(r.counts)
    var rows = DENOMS.map(function (d, i) { return [DN[i], n3(r.counts[i]), n3(c.amt[i]), n3(p.keep[i]), n3(p.out[i])] })
    var calc = [['数えた現金', yen(c.counted)], ['− 釣り銭準備金', yen(FLOAT)], ['＝ 現金売上（実際）', yen(c.actual)], ['現金売上（レジの記録）', yen(r.regCash)]]
    var ct = add(el('table', 'calc-tbl'), [add(el('colgroup'), [el('col'), el('col')])])
    ct.firstChild.firstChild.style.width = '52mm'
    var tb = el('tbody')
    calc.forEach(function (x) { var th = el('th', null, x[0]); th.setAttribute('scope', 'row'); tb.appendChild(add(el('tr'), [th, el('td', 'num', x[1])])) })
    var th2 = el('th', null, '過不足'); th2.setAttribute('scope', 'row')
    tb.appendChild(add(el('tr', 'big'), [th2, el('td', 'num', fmtDiff(c.diff) + ' ' + KIND_L[k])]))
    if (k !== 'even') {
      var th3 = el('th', null, '理由'); th3.setAttribute('scope', 'row')
      var th4 = el('th', null, 'ひとこと'); th4.setAttribute('scope', 'row')
      tb.appendChild(add(el('tr'), [th3, el('td', null, REASON_L[r.reason])]))
      tb.appendChild(add(el('tr'), [th4, el('td', 'wrap', r.note)]))
    }
    ct.appendChild(tb)
    var seal = add(el('div', 'seal'), [el('span', null, '確認の印'), el('span', 'seal__box'), el('span', 'seal__box')])
    var notice = null
    if (c.actual >= 0 && p.lackY > 0) notice = el('p', 'sheet__line', lackText(p, c.actual))
    if (c.actual < 0) notice = el('p', 'sheet__line', '数えた現金が釣り銭準備金（30,000円）より少なくなっています。枚数を確かめてください')
    return add(el('div', 'sheet'), sheetHead(SHOP + '　締めの控え').concat([
      el('p', 'sheet__role', jpDate(r.date) + '　締めた人 ' + ROLE_L[r.role]),
      sheetTable(PRINT_SLIP_COLS, rows, 'slip-tbl'),
      el('p', 'slip-total', '数えた現金　' + yen(c.counted)),
      ct,
      el('p', 'sheet__big', '売上合計 ' + yen(c.total) + '（現金 ' + n3(r.regCash) + '・カード ' + n3(r.card) + '・QR ' + n3(r.qr) + '）'),
      el('p', 'sheet__line', '客数 ' + n3(r.customers) + '人・客単価 ' + (c.unit === null ? '—' : yen(c.unit))),
      el('p', 'sheet__big', c.actual >= 0 ? '明日に残す ' + yen(p.keepY) + '・入金に回す ' + yen(c.actual) : '明日に残す 0円・入金に回す 0円'),
      notice,
      seal,
      el('p', 'sheet__foot', FOOT_E)
    ]))
  }
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  var printTitle = null
  function fillPrint (kind, arg) {
    elPrintRoot.textContent = ''
    if (kind === 'slip') { elPrintRoot.appendChild(buildSlipSheet(arg)); printTitle = 'hinatagi_shime_' + arg.date } else { elPrintRoot.appendChild(buildDailySheet(arg)); printTitle = 'hinatagi_nippou_' + arg }
  }
  function doPrint (kind, arg) {
    fillPrint(kind, arg)
    document.title = printTitle
    window.print()
  }
  window.addEventListener('beforeprint', function () {
    // ブラウザのメニューからの印刷は、書き出しのタブで選んでいる月の日報（0件の月は「ありません」の紙）
    if (!elPrintRoot.firstChild) { load(); fillPrint('daily', ui.expYm) }
    document.title = printTitle
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  function renderToday () { $('today-main').textContent = '今日 ' + jpDate(TODAY) }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    renderToday()
    renderClose()
    renderDaily()
    renderReview()
    renderExport()
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }
  window.addEventListener('resize', function () { if (ui.tab === 'close' && ui.view === 'form') renderCalc() })

  // ---------- 見本に戻す（§12-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox().then(function (yes) {
      if (!yes) return
      S = sample()
      save()
      ui.lastClosed = null; ui.doneRec = null; ui.view = 'form'
      ui.dailyYm = '2026-11'; ui.reviewYm = '2026-11'; ui.expYm = '2026-11'; ui.slipDate = null
      $('note-broken').hidden = true
      resetForm()
      renderAll()
      $('btn-reset').focus()
      showToast('見本に戻しました')
    })
  })

  // ---------- 2つのタブの同期（§12-3） ----------
  window.addEventListener('storage', function (e) {
    if (!canSave) return
    if (e.key !== null && e.key !== KEY) return
    if (e.key === null || e.newValue === null) { S = sample(); save() } else load()
    // 別の画面で変わった時は、直前の1件を取り消せなくする（別の記録を消さないため）
    ui.lastClosed = null
    renderAll()
    announce('別の画面で締めの記録が変わりました')
  })

  // ---------- はじめ ----------
  load()
  if (!canSave) $('note-nosave').hidden = false
  renderCols()
  resetForm()
  wrapWords(document.body)
  openTab(ui.tab, { noScroll: true })

  // 検査用（状態を引数で受ける純粋な関数と定数だけ。画面の状態は出さない）
  window.__demo22 = {
    roundDiv: roundDiv, unitPrice: unitPrice, yen: yen, fmtDiff: fmtDiff, diffKind: diffKind, parseCount: parseCount, parseYen: parseYen, parseCust: parseCust, parseDate: parseDate,
    checkNote: checkNote, closeCalc: closeCalc, floatPlan: floatPlan, monthStats: monthStats, monthDays: monthDays, validate: validate, csvCell: csvCell, buildCsv: buildCsv, sample: sample,
    wdName: wdName, jpDate: jpDate, mdw: mdw, TODAY: TODAY, DENOMS: DENOMS, FLOAT: FLOAT, FLOAT_PLAN: FLOAT_PLAN
  }
})()
