// そば処 ミナセギ（デモ）衛生管理の記録表
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 温度は 0.1℃ 単位の整数で持ち、判定・合計・平均はすべて整数だけで計算する（小数の丸めの関数・現在時刻・乱数は使わない）
// 今日の記録のフォームは最初に1回だけ作り、描き直しでは札・数字・一覧の所だけ書き換える
(function () {
  'use strict'

  // ---------- 定数 ----------
  var KEY = 'tenkaLab.demo23.hygieneLog.v1'
  var TEST_KEY = 'tenkaLab.demo23.test'
  var SHOP = 'そば処 ミナセギ'
  var TODAY = '2026-12-01'
  var MIN_DATE = '2026-11-01'
  var MONTHS = ['2026-12', '2026-11']
  // 測る所（0 冷蔵A 開店前 … 5 冷凍 閉店後）と基準（0.1℃ 単位。この値以下で良）
  var FRIDGES = ['冷蔵A', '冷蔵B', '冷凍']
  var TIMES = ['開店前', '閉店後']
  var SLOTS = [0, 1, 2, 3, 4, 5].map(function (i) { return FRIDGES[i >> 1] + ' ' + TIMES[i & 1] })
  var LIMITS = [100, 100, 100, 100, -150, -150]
  // 項目（表・CSV・横棒の順）。auto は温度の6つから自動で決まる（保存しない）
  var ITEMS = [
    { id: 'recv', name: '原材料の受け入れ', short: '受入', paper: '受', kind: 'gen', hint: '見た目・におい・温度・期限を確かめた' },
    { id: 'temp', name: '冷蔵冷凍の温度', short: '温度', paper: '温', kind: 'gen', auto: true, hint: '温度の6つから自動で決まります' },
    { id: 'wash', name: '器具の洗浄消毒', short: '洗浄', paper: '洗', kind: 'gen', hint: 'まな板・包丁・ざるを洗って消毒した' },
    { id: 'toilet', name: 'トイレの清掃', short: 'トイレ', paper: 'ト', kind: 'gen', hint: '決めた回数の清掃と消毒をした' },
    { id: 'health', name: '従業員の体調と手指の傷', short: '体調', paper: '体', kind: 'gen', hint: '全員に声をかけ、体調と手指の傷を確かめた。病名・症状は書きません' },
    { id: 'hands', name: '手洗い', short: '手洗', paper: '手', kind: 'gen', hint: '決めた時（作業の前・トイレの後など）に手を洗った' },
    { id: 'pot', name: 'ゆで釜と揚げ油の確認', short: '釜油', paper: '釜', kind: 'gen', hint: 'ゆで釜の湯と揚げ油の色・におい・量を確かめた' },
    { id: 'fry', name: '天ぷらの揚げ温度と時間', short: '揚げ', paper: '揚', kind: 'crit', hint: '決めた油の温度と時間で揚げた' },
    { id: 'tsuyu', name: 'つゆの再加熱', short: 'つゆ', paper: 'つ', kind: 'crit', hint: '作り置きのつゆを、出す前に沸騰させた' },
    { id: 'shime', name: 'そばのゆで後すぐ冷水で締める', short: '締め', paper: '締', kind: 'crit', hint: 'ゆでた後すぐに冷水で締めた' }
  ]
  // 保存するチェックは自動の項目を除く9つ（この順）
  var CHECKS = ITEMS.filter(function (it) { return !it.auto })
  var CHECK_IDS = CHECKS.map(function (it) { return it.id })
  var T_ACTS = [['recheck', '温度の再確認'], ['move', '食材の移動'], ['discard', '廃棄'], ['repair', '修理の依頼'], ['other', 'その他']]
  var C_ACTS = [['redo', 'その場でやり直した'], ['discard', '廃棄した'], ['report', '店長に報告した'], ['other', 'その他']]
  var ROLES = [['open', '開店'], ['mid', '中番'], ['close', '閉店'], ['manager', '店長']]
  function labelOf (list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return '' }
  function idsOf (list) { return list.map(function (x) { return x[0] }) }
  var REC_KEYS = ['no', 'date', 'temps', 'tAct', 'tNote', 'checks', 'cAct', 'cNote', 'role', 'late']
  // 見本の記録 24日分（番号・日付・温度6つ（0.1℃）・否の項目・確認した人。記録はすべて架空）
  var SAMPLE = [
    [1, '11-01', [32, 62, 25, 46, -185, -172], null, 'manager'],
    [2, '11-03', [30, 55, 22, 41, -190, -176], null, 'manager'],
    [3, '11-04', [35, 58, 27, 44, -182, -170], null, 'manager'],
    [4, '11-05', [31, 54, 24, 40, -188, -174], 'recv', 'mid'],
    [5, '11-06', [34, 60, 26, 45, -186, -171], null, 'manager'],
    [6, '11-07', [38, 101, 28, 52, -180, -165], null, 'manager'],
    [7, '11-08', [36, 66, 27, 48, -183, -168], 'pot', 'manager'],
    [8, '11-10', [29, 52, 21, 39, -192, -178], null, 'manager'],
    [9, '11-11', [33, 57, 25, 43, -149, -160], null, 'manager'],
    [10, '11-12', [30, 53, 23, 41, -178, -173], null, 'mid'],
    [11, '11-13', [34, 61, 26, 46, -187, -172], 'toilet', 'manager'],
    [12, '11-14', [37, 100, 29, 50, -184, -166], null, 'manager'],
    [13, '11-15', [35, 68, 28, 49, -181, -167], 'fry', 'manager'],
    [14, '11-17', [28, 51, 19, 38, -205, -180], null, 'manager'],
    [15, '11-19', [31, 55, 24, 42, -189, -175], null, 'mid'],
    [16, '11-20', [33, 59, 25, 44, -186, -171], 'health', 'manager'],
    [17, '11-21', [36, 72, 114, 47, -183, -169], null, 'manager'],
    [18, '11-22', [34, 58, 27, 48, -185, -170], null, 'manager'],
    [19, '11-24', [30, 50, 22, 40, -191, -177], 'shime', 'manager'],
    [20, '11-25', [32, 56, 24, 43, -188, -174], null, 'manager'],
    [21, '11-26', [29, 54, 20, 39, -190, -150], null, 'mid'],
    [22, '11-27', [33, 58, 25, 45, -186, -172], null, 'manager'],
    [23, '11-28', [35, 74, 28, 53, -182, -164], 'pot', 'manager'],
    [24, '11-29', [34, 57, 26, 47, -184, -172], null, 'manager']
  ]
  // 否・基準外の10件の対応とひとこと（温度は測る所の番号、チェックは項目の id）
  var SAMPLE_NOTE = {
    '11-05': ['c', 'recv', 'other', 'ねぎの一部が傷んでいた。受け取らず、業者に交換を頼んだ'],
    '11-07': ['t', 1, 'recheck', '扉の開け閉めが多かった。30分後に測り直して6.8度'],
    '11-08': ['c', 'pot', 'discard', '揚げ油の色が濃かった。開店前に油を捨てて取り替えた'],
    '11-11': ['t', 4, 'repair', '霜が多く冷えが弱い。食材は冷凍の奥へ寄せ、業者に点検を頼んだ'],
    '11-13': ['c', 'toilet', 'redo', '昼の清掃が抜けていた。気づいた時に清掃した'],
    '11-15': ['c', 'fry', 'discard', '混んで油の温度が下がった。低いまま揚げた分は捨てて揚げ直した'],
    '11-20': ['c', 'health', 'report', '手指に傷のある人がいた。手袋をつけ、盛り付けは別の人が行った'],
    '11-21': ['t', 2, 'move', '扉が少し開いていた。食材を冷蔵Aへ移し、閉め方を全員に伝えた'],
    '11-24': ['c', 'shime', 'redo', '冷水が足りず締めが遅れた。その分はゆで直して出した'],
    '11-28': ['c', 'pot', 'redo', 'ゆで釜の湯が濁っていた。昼の後に湯を替えた']
  }
  // 今日の記録の見本（温度の欄に入れる文字。チェックは9つとも同じ値）
  var PRESET = {
    t1: [['3.4', '5.8', '2.6', '4.4', '-18.6', '-17.1'], 'ok', '基準内の見本'],
    t2: [['3.4', '10.0', '2.6', '4.4', '-18.6', '-15.0'], 'ok', '境目の見本'],
    t3: [['3.4', '10.1', '2.6', '4.4', '-18.6', '-14.9'], 'ok', '基準外の見本'],
    t4: [['', '', '', '', '', ''], null, '空にする']
  }
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
  function isMonday (s) { return wdIdx(s) === 1 }
  function jpDate (s) { var p = s.split('-'); return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日（' + wdName(s) + '）' }
  function mdw (s) { return s.slice(5) + '（' + wdName(s) + '）' }
  function jpMonth (ym) { var p = ym.split('-'); return Number(p[0]) + '年' + Number(p[1]) + '月' }

  // ---------- 温度の書き方 ----------
  // 0.1℃ 単位の整数 → 「−14.9」（マイナスは U+2212。0 は 0.0）
  function fmtTempBare (t) { var a = Math.abs(t); return (t < 0 ? '−' : '') + Math.floor(a / 10) + '.' + (a % 10) }
  function fmtTemp (t) { return fmtTempBare(t) + '℃' }
  // CSV の温度（マイナスは半角、℃ なし、小数1桁を必ず付ける）
  function csvTemp (t) { var a = Math.abs(t); return (t < 0 ? '-' : '') + Math.floor(a / 10) + '.' + (a % 10) }

  // ---------- 決め方（状態を引数で受ける純粋な関数） ----------
  function isOut (slot, t) { return t > LIMITS[slot] }
  // 合計 s（0.1℃ 単位。負もある）と件数 n（n ≥ 1）から平均を 0.1℃ 単位の整数で返す。
  // 小数第2位を四捨五入し、.x5 は 0 から遠い方へ（Excel の ROUND と同じ。−17.75 → −17.8）
  function avgTenths (s, n) {
    var a = Math.abs(s)
    var r = Math.floor((2 * a + n) / (2 * n))
    return s < 0 && r !== 0 ? -r : r
  }
  // 1日の記録から出す値（保存しない）
  function dayCalc (rec) {
    var out = rec.temps.map(function (t, i) { return isOut(i, t) })
    var outN = out.filter(Boolean).length
    var chkNg = rec.checks.filter(function (c) { return c === 'ng' }).length
    var ngN = chkNg + (outN > 0 ? 1 : 0)
    return { out: out, outN: outN, auto: outN > 0 ? 'ng' : 'ok', ngN: ngN, allOk: outN === 0 && ngN === 0 }
  }
  // 10項目それぞれの良否（自動の項目を含む）
  function itemVals (rec, dc) {
    return ITEMS.map(function (it) { return it.auto ? dc.auto : rec.checks[CHECK_IDS.indexOf(it.id)] })
  }
  function byDate (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0 }
  function monthRecs (st, ym) { return st.recs.filter(function (r) { return r.date.slice(0, 7) === ym }).sort(byDate) }
  // 日の区分：その月の1日から「その月の末日と今日の早い方」まで全部
  function monthDays (st, ym) {
    var rows = monthRecs(st, ym)
    var out = []
    for (var z = dayNum(ym + '-01'); ; z++) {
      var d = ymd(z)
      if (d.slice(0, 7) !== ym || d > TODAY) break
      var r = rows.filter(function (x) { return x.date === d })[0]
      if (r) out.push({ date: d, kind: 'rec', rec: r })
      else out.push({ date: d, kind: isMonday(d) ? 'closed' : d < TODAY ? 'miss' : 'today' })
    }
    return out
  }
  // 月の集計
  function monthStats (st, ym) {
    var days = monthDays(st, ym)
    var count = function (k) { return days.filter(function (d) { return d.kind === k }).length }
    var recs = monthRecs(st, ym)
    var o = { ym: ym, days: days.length, rec: count('rec'), closed: count('closed'), miss: count('miss'), today: count('today'), ng: 0, out: 0, badDays: 0 }
    o.biz = o.rec + o.miss + o.today
    // 臨時の営業（記録した月曜）の日数
    o.extra = days.filter(function (d) { return d.kind === 'rec' && isMonday(d.date) }).length
    o.perItem = ITEMS.map(function () { return 0 })
    o.perFridge = [0, 0, 0]
    recs.forEach(function (r) {
      var dc = dayCalc(r)
      o.ng += dc.ngN; o.out += dc.outN
      if (!dc.allOk) o.badDays++
      itemVals(r, dc).forEach(function (v, i) { if (v === 'ng') o.perItem[i]++ })
      dc.out.forEach(function (b, i) { if (b) o.perFridge[i >> 1]++ })
    })
    return o
  }
  // 冷蔵庫ごとの最高・最低・平均（整数だけ）。同じ値は一番早い日、同じ日なら開店前
  function tempStats (st, ym) {
    var recs = monthRecs(st, ym)
    return FRIDGES.map(function (f, k) {
      var o = { name: f, n: 0, sum: 0, max: null, min: null, avg: null, out: 0 }
      recs.forEach(function (r) {
        for (var j = 0; j < 2; j++) {
          var s = 2 * k + j; var t = r.temps[s]
          o.n++; o.sum += t
          if (isOut(s, t)) o.out++
          if (o.max === null || t > o.max.t) o.max = { t: t, date: r.date, slot: s }
          if (o.min === null || t < o.min.t) o.min = { t: t, date: r.date, slot: s }
        }
      })
      if (o.n) o.avg = avgTenths(o.sum, o.n)
      return o
    })
  }
  // 否・基準外と、とった対応（日付の古い順 → 温度（測る所の順）→ チェック（項目の順）。自動の項目は入れない）
  function events (st, ym) {
    var out = []
    monthRecs(st, ym).forEach(function (r) {
      r.temps.forEach(function (t, s) { if (isOut(s, t)) out.push({ date: r.date, kind: 't', slot: s, t: t, act: r.tAct[s], actL: labelOf(T_ACTS, r.tAct[s]), note: r.tNote[s], target: SLOTS[s] }) })
      r.checks.forEach(function (c, i) { if (c === 'ng') out.push({ date: r.date, kind: 'c', item: CHECK_IDS[i], act: r.cAct[i], actL: labelOf(C_ACTS, r.cAct[i]), note: r.cNote[i], target: CHECKS[i].name }) })
    })
    return out
  }

  // ---------- 入力の読み取り。戻り値 { v } か { e } ----------
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
  // 温度の欄 → 0.1℃ 単位の整数（文字列から整数で作る）
  function parseTemp (raw) {
    raw = String(raw)
    if (raw === '') return { e: 'empty' }
    var s = raw.normalize('NFKC').trim()
    if (s === '') return { e: 'space' }
    // U+2212（NFKC では変わらない）と長音の「ー」は、先頭の1文字だけマイナスとして読む
    if (s.charAt(0) === '−' || s.charAt(0) === 'ー') s = '-' + s.slice(1)
    if (/°C$/.test(s)) s = s.slice(0, -2).trim()
    else if (/度$/.test(s)) s = s.slice(0, -1).trim()
    var m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s)
    if (!m) return { e: 'char' }
    if (m[3] && m[3].length > 1) return { e: 'dec' }
    var a = Number(m[2]) * 10 + (m[3] ? Number(m[3]) : 0)
    if (a > 300) return { e: 'range' }
    return { v: m[1] && a !== 0 ? -a : a }
  }
  var PHONE_RE = /\d(?:[-‐−–ー()]*\d){9,}/
  // 使えない文字（制御文字・タブ・C1・行／段落の区切り）。改行は読み取りの時に空白にする
  var CTRL_RE = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/
  function normNote (text) { return String(text).replace(/\r\n|\r|\n/g, ' ').trim() }
  // ひとこと。改行（CR・LF・CRLF）は半角の空白1つにし、前後の空白を取る
  function checkNote (text) {
    var s = normNote(text)
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
    empty: '記録する日を入れてください', form: '記録する日は 2026-12-01 の形で、ある日付を入れてください',
    future: '未来の日付は記録できません（今日は 2026-12-01）', old: 'このデモでは 2026-11-01 から今日までの日付を入れてください',
    dup: 'この日はもう記録してあります。直すときは、記録した直後の「この記録を取り消す」で取り消してから記録してください'
  }
  function tempMsg (e, name) {
    if (e === 'empty') return name + 'の温度を入れてください'
    if (e === 'space') return name + 'の温度が空白だけです。数字で入れてください'
    if (e === 'dec') return name + 'の温度は、小数第1位まで（例 3.5）で入れてください'
    if (e === 'range') return name + 'の温度は、−30.0〜30.0 の間で入れてください'
    return name + 'の温度は、数字で入れてください（例 3.5、−18.0）'
  }
  function noteMsg (r, name) {
    if (r.e === 'empty') return name + 'のひとこと（60字まで）を書いてください'
    if (r.e === 'long') return 'ひとことは60字までにしてください（いま ' + r.n + '字）'
    if (r.e === 'phone') return '電話番号のような数字（10桁以上）は書けません。お名前・連絡先は書かないでください'
    if (r.e === 'at') return 'メールアドレスのような文字（@）は書けません。お名前・連絡先は書かないでください'
    return 'ひとことに使えない文字が入っています'
  }

  // ---------- 保存の検証。通れば新しい状態、外れれば null ----------
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  function intIn (v, a, b) { return typeof v === 'number' && Number.isInteger(v) && v >= a && v <= b }
  function sameKeys (o, list) {
    var ks = Object.keys(o)
    if (ks.length !== list.length) return false
    return list.every(function (k) { return own(o, k) }) && ks.every(function (k) { return list.indexOf(k) >= 0 })
  }
  function strArr (a, n) { return Array.isArray(a) && a.length === n && a.every(function (x) { return typeof x === 'string' }) }
  // 日付は決まった書き方（YYYY-MM-DD）だけ。2026-11-1 のように同じ日の別の書き方を通さない
  function okDate (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && realDate(s) && s >= MIN_DATE && s <= TODAY }
  // 保存されたひとことは、正規化した後の文字と同じで 1〜60字、使えない文字が無いこと
  function okNote (s) { var r = checkNote(s); return !r.e && r.v === s }
  function validate (d) {
    if (!isObj(d) || !sameKeys(d, ['v', 'recs', 'seq'])) return null
    if (d.v !== 1) return null
    if (!intIn(d.seq, 1, 100000)) return null
    if (!Array.isArray(d.recs) || d.recs.length > 31) return null
    var st = { recs: [], seq: d.seq }
    var nos = {}; var dates = {}
    var tIds = idsOf(T_ACTS); var cIds = idsOf(C_ACTS); var rIds = idsOf(ROLES)
    for (var i = 0; i < d.recs.length; i++) {
      var a = d.recs[i]
      if (!isObj(a) || !sameKeys(a, REC_KEYS)) return null
      if (!intIn(a.no, 1, d.seq - 1) || own(nos, String(a.no))) return null
      nos[String(a.no)] = 1
      if (!okDate(a.date) || own(dates, a.date)) return null
      dates[a.date] = 1
      if (!Array.isArray(a.temps) || a.temps.length !== 6 || !a.temps.every(function (t) { return intIn(t, -300, 300) })) return null
      if (!strArr(a.tAct, 6) || !strArr(a.tNote, 6)) return null
      for (var s = 0; s < 6; s++) {
        if (isOut(s, a.temps[s])) { if (tIds.indexOf(a.tAct[s]) < 0 || !okNote(a.tNote[s])) return null } else if (a.tAct[s] !== '' || a.tNote[s] !== '') return null
      }
      if (!strArr(a.checks, 9) || !a.checks.every(function (c) { return c === 'ok' || c === 'ng' })) return null
      if (!strArr(a.cAct, 9) || !strArr(a.cNote, 9)) return null
      for (var c = 0; c < 9; c++) {
        if (a.checks[c] === 'ng') { if (cIds.indexOf(a.cAct[c]) < 0 || !okNote(a.cNote[c])) return null } else if (a.cAct[c] !== '' || a.cNote[c] !== '') return null
      }
      if (typeof a.role !== 'string' || rIds.indexOf(a.role) < 0) return null
      if (typeof a.late !== 'boolean' || (a.date === TODAY && a.late)) return null
      st.recs.push({ no: a.no, date: a.date, temps: a.temps.map(function (t) { return t === 0 ? 0 : t }), tAct: a.tAct.slice(), tNote: a.tNote.slice(), checks: a.checks.slice(), cAct: a.cAct.slice(), cNote: a.cNote.slice(), role: a.role, late: a.late })
    }
    st.recs.sort(byDate)
    return st
  }
  function sample () {
    return {
      recs: SAMPLE.map(function (r) {
        var date = '2026-' + r[1]
        var rec = { no: r[0], date: date, temps: r[2].slice(), tAct: ['', '', '', '', '', ''], tNote: ['', '', '', '', '', ''], checks: CHECK_IDS.map(function (id) { return id === r[3] ? 'ng' : 'ok' }), cAct: CHECK_IDS.map(function () { return '' }), cNote: CHECK_IDS.map(function () { return '' }), role: r[4], late: false }
        var nt = SAMPLE_NOTE[r[1]]
        if (nt && nt[0] === 't') { rec.tAct[nt[1]] = nt[2]; rec.tNote[nt[1]] = nt[3] }
        if (nt && nt[0] === 'c') { var ci = CHECK_IDS.indexOf(nt[1]); rec.cAct[ci] = nt[2]; rec.cNote[ci] = nt[3] }
        return rec
      }),
      seq: 25
    }
  }

  // ---------- CSV ----------
  function csvCell (v) {
    if (v === null) return '""'
    if (typeof v === 'number') return String(v)
    var s = String(v)
    if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  // ひとこと単体の先頭も無害化する（つないだ後に式の並びが先頭へ来ないように）
  function safeNote (s) { return /^[=+\-@\t]/.test(s) ? "'" + s : s }
  function eventText (ev) {
    return ev.kind === 't' ? ev.target + ' ' + fmtTemp(ev.t) + ' 基準外 ' + ev.actL + '：' + safeNote(ev.note) : ev.target + ' 否 ' + ev.actL + '：' + safeNote(ev.note)
  }
  var KIND_CSV = { rec: '記録', closed: '定休日', miss: '記録漏れ', today: '今日（未記録）' }
  var CSV_COLS = [['日付', '2026-11-01 の形'], ['曜日', '日〜土'], ['区分', '記録・定休日・記録漏れ・今日（未記録）'], ['記録した日', '当日・後から（記録でない日は空）']]
    .concat(SLOTS.map(function (s) { return [s, '温度（℃、小数第1位）。マイナスは -'] }))
    .concat([['基準外の数', '温度の6つのうち基準外の数']])
    .concat(ITEMS.map(function (it) { return [it.name, it.auto ? '良・否（温度の6つから自動）' : '良・否'] }))
    .concat([['否の数', '10項目のうち否の数（冷蔵冷凍の温度を含む）'], ['確認した人', '開店・中番・閉店・店長'], ['対応とひとこと', '基準外・否の1件ずつ（測る所か項目名・対応：ひとこと）を「 ／ 」でつなぐ'], ['データ', 'どの行も「デモ・架空」（このデモの記録はすべて架空）']])
  // どの行の最後にも入れる架空の印（表計算に取り込んだり行を写したりしても分かるように）
  var CSV_DEMO = 'デモ・架空'
  function buildCsv (st, ym) {
    var lines = [CSV_COLS.map(function (c) { return c[0] }).join(',')]
    var evs = events(st, ym)
    monthDays(st, ym).forEach(function (d) {
      var head = [csvCell(d.date), csvCell(wdName(d.date)), csvCell(KIND_CSV[d.kind])]
      if (d.kind !== 'rec') { for (var i = 0; i < 21; i++) head.push('""'); head.push(csvCell(CSV_DEMO)); lines.push(head.join(',')); return }
      var r = d.rec; var dc = dayCalc(r)
      var ev = evs.filter(function (x) { return x.date === d.date }).map(eventText).join(' ／ ')
      lines.push(head.concat([csvCell(r.late ? '後から' : '当日')], r.temps.map(csvTemp), [String(dc.outN)], itemVals(r, dc).map(function (v) { return csvCell(v === 'ng' ? '否' : '良') }), [String(dc.ngN), csvCell(labelOf(ROLES, r.role)), csvCell(ev), csvCell(CSV_DEMO)]).join(','))
    })
    return '\uFEFF' + lines.join('\r\n') + '\r\n'
  }

  // ---------- 保存 ----------
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
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, recs: S.recs, seq: S.seq }))
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
  function attr (e, o) { Object.keys(o).forEach(function (k) { e.setAttribute(k, o[k]) }); return e }
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

  // 途中で折れてはいけない語を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = [SHOP, '冷蔵A', '冷蔵B', '冷凍', '開店前', '閉店後', '原材料の受け入れ', '冷蔵冷凍の温度', '器具の洗浄消毒', 'トイレの清掃', '手洗い', 'つゆの再加熱',
    '基準外', 'すべて良', '記録漏れ', '定休日', '今日・まだ記録なし', '後から記録', 'いま記録した日', '温度の再確認', '食材の移動', '修理の依頼', 'その場でやり直した', '廃棄した', '店長に報告した',
    '開店', '中番', '閉店', '店長', 'デモ（架空のお店）', 'デモの日付', '見本に戻す', 'CSV をダウンロード', '月の記録表を印刷', '衛生管理計画', 'デモ', '架空']
    .concat(SLOTS).sort(function (a, b) { return b.length - a.length })
  var NW_RE = new RegExp([
    '\\d{4}年\\d{1,2}月(?:\\d{1,2}日(?:（[日月火水木金土]）)?)?', '\\d{4}-\\d{2}-\\d{2}', '\\d{2}-\\d{2}（[日月火水木金土]）',
    '[−-]?\\d+\\.\\d〜[−-]?\\d+\\.\\d', '[−-]?\\d+\\.\\d(?:℃(?:以下)?)?', '\\d+／60字', '\\d+(?:日|回|か所|項目|件|字)'
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
        if (!p || p.closest('.nw, svg, script, style, title, pre, .visually-hidden, label, option, select, textarea, thead, #sr-status, .event-card__note, .slip-ev__note, #print-root, .state-tag')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var list = []; var n
    while ((n = tw.nextNode())) list.push(n)
    list.forEach(wrapText)
    return root
  }
  // 状態の札。見える文字がそのまま読まれる（aria-label を付けない）
  var TAG = { ok: ['良', 'i-okc'], out: ['基準外', 'i-out'], ng: ['否', 'i-ng'], all: ['すべて良', 'i-okc'], miss: ['記録漏れ', 'i-miss'], closed: ['定休日', null], today: ['今日・まだ記録なし', null], late: ['後から記録', null], outAny: ['基準外あり', 'i-out'], ngAny: ['否あり', 'i-ng'] }
  var TAG_CLS = { ok: 'ok', out: 'out', ng: 'ng', all: 'ok', miss: 'miss', closed: 'closed', today: 'today', late: 'late', outAny: 'out', ngAny: 'ng' }
  function stateTag (k) {
    var t = el('span', 'state-tag state-tag--' + TAG_CLS[k])
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

  // ---------- 知らせ（live 領域は #sr-status の1つだけ） ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  var liveTimer = null
  var lastLive = ''
  function announce (msg, wait) {
    var sr = $('sr-status')
    // 新しい知らせが出たら、打っている途中の読み上げ（600ms 後）は取りやめる
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

  // ---------- 画面の状態（保存しない） ----------
  var ui = { tab: 'today', view: 'form', lastRec: null, doneRec: null, monthYm: '2026-11', reviewYm: '2026-11', expYm: '2026-11' }

  // ---------- タブ ----------
  var TABS = ['today', 'month', 'review', 'export']
  function openTab (name, opt) {
    if (name === 'review' && ui.tab !== 'review') ui.reviewYm = ui.monthYm
    if (name === 'export' && ui.tab !== 'export') ui.expYm = ui.monthYm
    if (name === 'today' && ui.view === 'done' && !lastRec()) { ui.view = 'form'; ui.doneRec = null; resetForm() }
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

  // ---------- 今日の記録のフォーム（最初に1回だけ作る） ----------
  function radioPick (name, id, value, text, cls) {
    var lb = el('label', cls || 'pick-btn'); lb.id = 'pk-' + id
    var r = el('input'); r.type = 'radio'; r.name = name; r.value = value; r.id = id
    return add(lb, [r, icon(cls === 'okng-btn' ? (value === 'ng' ? 'i-ng' : 'i-okc') : 'i-okc', 16, 'pick-btn__ic'), text])
  }
  function errP (id) { var p = el('p', 'field__err'); p.id = id; p.hidden = true; return p }
  // 対応とひとことのまとまり（基準外の温度・否のチェックの下）
  function actBox (key, legendText, name, acts, noteId, hintText) {
    var fs = el('fieldset', 'act-box'); fs.id = key + '-set'; fs.hidden = true
    fs.setAttribute('aria-describedby', 'err-' + key)
    var pick = el('div', 'act-pick act-pick--' + acts.length)
    acts.forEach(function (a) { pick.appendChild(radioPick(name, name + '-' + a[0], a[0], a[1])) })
    var ta = el('textarea', 'input input--memo'); ta.id = noteId
    ta.setAttribute('aria-describedby', noteId + '-hint err-' + noteId)
    var lb = el('label', 'field__label', 'ひとこと（60字まで）'); lb.setAttribute('for', noteId)
    var foot = add(el('div', 'memo-foot'), [el('p', 'memo-foot__note', hintText), el('p', 'memo-foot__count')])
    foot.firstChild.id = noteId + '-hint'; foot.lastChild.id = noteId + '-count'
    return add(fs, [el('legend', 'act-box__l', legendText), pick, errP('err-' + key), add(el('div', 'field act-note'), [lb, ta, foot, errP('err-' + noteId)])])
  }
  var NOTE_HINT = '何があったか、どうしたか。氏名・連絡先・体調の詳しい内容は書かないでください。この端末に保存され、CSV に出ます'
  var NOTE_HINT_HEALTH = '何をしたか。氏名・病名・症状は書かないでください。この端末に保存され、CSV に出ます'
  function buildTemps () {
    var box = $('temp-units')
    FRIDGES.forEach(function (f, k) {
      var fs = el('fieldset', 'temp-unit')
      add(fs, [add(el('legend', 'temp-unit__l'), el('h4', 'temp-unit__h', f)), el('p', 'temp-unit__lim', (k < 2 ? '10.0℃以下' : '−15.0℃以下') + 'で良')])
      for (var j = 0; j < 2; j++) {
        var s = 2 * k + j; var id = 't-' + s
        var row = el('div', 'temp-row'); row.id = 'row-' + id
        var lb = el('label', 'temp-label', TIMES[j]); lb.setAttribute('for', id)
        var ctl = el('div', 'temp-ctl')
        if (k === 2) {
          var sb = el('button', 'sign-btn'); sb.type = 'button'; sb.id = 'sign-' + s; sb.setAttribute('aria-pressed', 'false')
          add(sb, [el('span', 'sign-btn__m', '−'), el('span', 'visually-hidden', '（マイナス）' + TIMES[j])])
          ctl.appendChild(sb)
        }
        var inp = el('input', 'input temp-input'); inp.id = id; inp.type = 'text'; inp.setAttribute('inputmode', 'decimal'); inp.autocomplete = 'off'
        inp.setAttribute('aria-describedby', id + '-unit ' + id + '-tag err-' + id)
        var unit = el('span', 'temp-unit-c', '℃'); unit.id = id + '-unit'
        var tag = el('span', 'temp-tag'); tag.id = id + '-tag'
        add(ctl, [inp, unit, tag])
        add(row, [lb, ctl])
        add(fs, [row, errP('err-' + id), actBox('ta-' + s, SLOTS[s] + 'が基準外です。とった対応', 'ta-' + s, T_ACTS, 'tn-' + s, NOTE_HINT)])
      }
      box.appendChild(fs)
    })
  }
  function buildChecks () {
    ITEMS.forEach(function (it) {
      var box = $(it.kind === 'gen' ? 'check-gen' : 'check-crit')
      if (it.auto) {
        var d = el('div', 'check-row check-row--auto'); d.id = 'row-c-temp'
        add(d, [el('p', 'check-name', it.name), el('p', 'check-hint', it.hint), add(el('p', 'check-auto'), el('span', null))])
        d.lastChild.id = 'c-temp-tag'
        box.appendChild(d)
        return
      }
      var fs = el('fieldset', 'check-row'); fs.id = 'row-c-' + it.id
      fs.setAttribute('aria-describedby', 'c-' + it.id + '-hint err-c-' + it.id)
      var hint = el('p', 'check-hint', it.hint); hint.id = 'c-' + it.id + '-hint'
      var pick = add(el('div', 'okng'), [radioPick('c-' + it.id, 'c-' + it.id + '-ok', 'ok', '良', 'okng-btn'), radioPick('c-' + it.id, 'c-' + it.id + '-ng', 'ng', '否', 'okng-btn')])
      add(fs, [el('legend', 'check-name', it.name), hint, pick, errP('err-c-' + it.id)])
      box.appendChild(fs)
      box.appendChild(actBox('ca-' + it.id, it.name + 'が否です。とった対応', 'ca-' + it.id, C_ACTS, 'cn-' + it.id, it.id === 'health' ? NOTE_HINT_HEALTH : NOTE_HINT))
    })
  }
  buildTemps()
  buildChecks()
  var form = $('log-form')
  function checkedVal (name) { var c = form.querySelector('input[name="' + name + '"]:checked'); return c ? c.value : null }
  function setRadio (name, v) {
    Array.prototype.forEach.call(form.querySelectorAll('input[name="' + name + '"]'), function (r) { r.checked = r.value === v })
  }
  function syncPicks () {
    Array.prototype.forEach.call(form.querySelectorAll('.pick-btn, .okng-btn'), function (lb) {
      lb.classList.toggle('is-on', lb.querySelector('input').checked)
    })
  }
  // 冷凍の欄の「−」の切り替えボタン：欄の値がマイナスで始まる時に押した状態
  var MINUS_HEAD = /^[\s　]*[-−－ー]/
  function syncSign () {
    [4, 5].forEach(function (s) { $('sign-' + s).setAttribute('aria-pressed', MINUS_HEAD.test($('t-' + s).value) ? 'true' : 'false') })
  }
  // 誤りの文（入力値は引用しない）
  function showErrP (errId, msg) {
    var p = $(errId)
    setText(p, [icon('i-err', 16, 'field__err-ic'), el('span', 'field__err-msg', msg)])
    p.hidden = false
  }
  function hideErrP (errId) { var p = $(errId); p.hidden = true; p.textContent = '' }
  // key → [誤りの文の id、aria-invalid を付ける欄（ラジオの組は最初のラジオ）]。並びは画面の上から（DOM の順）
  var FORM_ERR = { date: ['err-l-date', 'l-date'] }
  var ERR_ORDER = ['date']
  SLOTS.forEach(function (x, s) {
    FORM_ERR['t-' + s] = ['err-t-' + s, 't-' + s]
    FORM_ERR['ta-' + s] = ['err-ta-' + s, 'ta-' + s + '-' + T_ACTS[0][0]]
    FORM_ERR['tn-' + s] = ['err-tn-' + s, 'tn-' + s]
    ERR_ORDER.push('t-' + s, 'ta-' + s, 'tn-' + s)
  })
  CHECK_IDS.forEach(function (id) {
    FORM_ERR['c-' + id] = ['err-c-' + id, 'c-' + id + '-ok']
    FORM_ERR['ca-' + id] = ['err-ca-' + id, 'ca-' + id + '-' + C_ACTS[0][0]]
    FORM_ERR['cn-' + id] = ['err-cn-' + id, 'cn-' + id]
    ERR_ORDER.push('c-' + id, 'ca-' + id, 'cn-' + id)
  })
  FORM_ERR.role = ['err-role', 'role-open']
  ERR_ORDER.push('role')
  var formErr = {}
  function setFormErr (key, msg) {
    formErr[key] = msg
    showErrP(FORM_ERR[key][0], msg)
    $(FORM_ERR[key][1]).setAttribute('aria-invalid', 'true')
    var t = $(FORM_ERR[key][1])
    if (t.type === 'radio') t.closest('fieldset').setAttribute('data-bad', '1')
  }
  function clearFormErr (key) {
    if (!own(formErr, key)) return
    delete formErr[key]
    hideErrP(FORM_ERR[key][0])
    var t = $(FORM_ERR[key][1])
    t.removeAttribute('aria-invalid')
    if (t.type === 'radio') t.closest('fieldset').removeAttribute('data-bad')
  }
  function clearAllFormErr () { Object.keys(FORM_ERR).forEach(clearFormErr) }
  function hasRec (date) { return S.recs.some(function (r) { return r.date === date }) }
  function dateErr () {
    var r = parseDate($('l-date').value)
    if (r.e) return DATE_MSG[r.e]
    return hasRec(r.v) ? DATE_MSG.dup : null
  }
  function tempErr (s) { var r = parseTemp($('t-' + s).value); return r.e ? tempMsg(r.e, SLOTS[s]) : null }
  // いまの入力から計算する
  function readForm () {
    var temps = SLOTS.map(function (x, s) { var r = parseTemp($('t-' + s).value); return r.e ? null : r.v })
    var badT = SLOTS.filter(function (x, s) { var r = parseTemp($('t-' + s).value); return r.e && r.e !== 'empty' }).length
    var out = temps.map(function (t, s) { return t !== null && isOut(s, t) })
    var outN = out.filter(Boolean).length
    var checks = CHECK_IDS.map(function (id) { return checkedVal('c-' + id) })
    var allT = temps.every(function (t) { return t !== null })
    var ngN = checks.filter(function (c) { return c === 'ng' }).length + (outN > 0 ? 1 : 0)
    var left = temps.filter(function (t) { return t === null }).length + checks.filter(function (c) { return c === null }).length
    return { temps: temps, out: out, outN: outN, badT: badT, checks: checks, allT: allT, ngN: ngN, left: left }
  }
  function liveMsg (f) {
    if (f.badT) return '温度に直すところがあります'
    if (f.left === 0 && f.outN === 0 && f.ngN === 0) return 'すべて良'
    return '基準外 ' + f.outN + 'か所・否 ' + f.ngN + '項目'
  }
  function updateCount (ta) { $(ta.id + '-count').textContent = Array.from(normNote(ta.value)).length + '／60字' }
  function setDateRead () {
    var r = parseDate($('l-date').value)
    $('l-date-read').textContent = r.e ? '' : jpDate(r.v)
    $('l-date-late').hidden = !!r.e || r.v >= TODAY
    $('l-date-mon').hidden = !!r.e || !isMonday(r.v)
  }
  // 札・自動の項目・結果の箱・対応の欄を描き直す（フォームの欄そのものは触らない）
  function renderCalc () {
    var f = readForm()
    SLOTS.forEach(function (x, s) {
      var t = f.temps[s]
      setText($('t-' + s + '-tag'), t === null ? null : stateTag(f.out[s] ? 'out' : 'ok'))
      $('ta-' + s + '-set').hidden = !f.out[s]
      $('row-t-' + s).classList.toggle('is-bad', f.out[s])
      if (!f.out[s]) { clearFormErr('ta-' + s); clearFormErr('tn-' + s) }
    })
    CHECK_IDS.forEach(function (id, i) {
      var ng = f.checks[i] === 'ng'
      $('ca-' + id + '-set').hidden = !ng
      $('row-c-' + id).classList.toggle('is-bad', ng)
      if (!ng) { clearFormErr('ca-' + id); clearFormErr('cn-' + id) }
    })
    // 自動の項目：基準外が1つでもあれば否、6つとも正しく入って基準外 0 なら良、それ以外は待ち
    var at = $('c-temp-tag')
    if (f.outN > 0) setText(at, stateTag('ng'))
    else if (f.allT) setText(at, stateTag('ok'))
    else setText(at, el('span', 'check-wait', '温度を入れると決まります'))
    $('row-c-temp').classList.toggle('is-bad', f.outN > 0)
    $('lr-out').textContent = String(f.outN)
    $('lr-ng').textContent = String(f.ngN)
    $('lr-left').textContent = String(f.left)
    var bad = f.outN > 0 || f.ngN > 0
    setText($('lr-tag'), f.outN > 0 ? stateTag('outAny') : f.ngN > 0 ? stateTag('ngAny') : f.left === 0 ? stateTag('all') : null)
    $('log-result').classList.toggle('log-result--bad', bad)
    syncSign()
    // 1024px〜：右の列が画面より高い時は貼り付けない（下が隠れないように）
    var rin = $('today-right-in')
    rin.classList.remove('is-static')
    if (rin.getBoundingClientRect().height > window.innerHeight - 56 - 32) rin.classList.add('is-static')
    wrapWords($('panel-today'))
    return f
  }
  // 打っている途中の読み上げ（止まって 600ms 後に1回。同じ文は続けて読まない）
  function sayLive (msg) {
    if (msg === lastLive) return
    lastLive = msg
    var sr = $('sr-status')
    window.clearTimeout(srTimer)
    sr.textContent = ''
    srTimer = window.setTimeout(function () { sr.textContent = msg }, 50)
  }
  function scheduleLive () {
    window.clearTimeout(liveTimer)
    liveTimer = window.setTimeout(function () { liveTimer = null; sayLive(liveMsg(readForm())) }, 600)
  }
  function allNotes () { return Array.prototype.slice.call(form.querySelectorAll('textarea')) }
  function resetForm () {
    clearAllFormErr()
    form.reset()
    $('l-date').value = TODAY
    SLOTS.forEach(function (x, s) { $('t-' + s).value = '' })
    allNotes().forEach(function (ta) { ta.value = ''; updateCount(ta) })
    syncPicks(); setDateRead(); renderCalc()
    lastLive = liveMsg(readForm())
  }
  function fillForm (r) {
    clearAllFormErr()
    form.reset()
    $('l-date').value = r.date
    r.temps.forEach(function (t, s) {
      $('t-' + s).value = csvTemp(t)
      setRadio('ta-' + s, r.tAct[s]); $('tn-' + s).value = r.tNote[s]
    })
    CHECK_IDS.forEach(function (id, i) { setRadio('c-' + id, r.checks[i]); setRadio('ca-' + id, r.cAct[i]); $('cn-' + id).value = r.cNote[i] })
    setRadio('role', r.role)
    allNotes().forEach(updateCount)
    syncPicks(); setDateRead(); renderCalc()
    lastLive = liveMsg(readForm())
  }
  function keyOf (t) {
    if (t.id === 'l-date') return 'date'
    if (/^t-\d$/.test(t.id) || /^tn-\d$/.test(t.id) || /^cn-/.test(t.id)) return t.id
    return null
  }
  form.addEventListener('input', function (e) {
    var t = e.target
    if (t.tagName === 'TEXTAREA') {
      updateCount(t)
      if (own(formErr, t.id) && !checkNote(t.value).e) clearFormErr(t.id)
      return
    }
    if (t.type === 'radio') return
    if (t.id === 'l-date') { if (own(formErr, 'date') && dateErr() === null) clearFormErr('date'); setDateRead(); return }
    var s = Number(t.id.slice(2))
    if (own(formErr, t.id) && tempErr(s) === null) clearFormErr(t.id)
    renderCalc()
    scheduleLive()
  })
  // 誤りの文は blur の時と「記録する」の時に出す（打っている途中で赤くしない）
  form.addEventListener('focusout', function (e) {
    var t = e.target
    if (!t.matches || !t.matches('input[type=text]')) return
    var m = t.id === 'l-date' ? dateErr() : tempErr(Number(t.id.slice(2)))
    var k = keyOf(t)
    if (m) setFormErr(k, m); else clearFormErr(k)
  })
  form.addEventListener('change', function (e) {
    var t = e.target
    if (t.type !== 'radio') return
    if (/^c-/.test(t.name) || t.name === 'role' || /^(ta|ca)-/.test(t.name)) clearFormErr(t.name)
    syncPicks()
    if (/^c-/.test(t.name)) {
      var f = renderCalc()
      window.clearTimeout(liveTimer)
      sayLive(liveMsg(f))
    }
  })
  // 「−」の切り替え
  ;[4, 5].forEach(function (s) {
    $('sign-' + s).addEventListener('click', function () {
      var inp = $('t-' + s)
      var v = inp.value
      inp.value = MINUS_HEAD.test(v) ? v.replace(MINUS_HEAD, function (m0) { return m0.slice(0, -1) }) : '-' + v.replace(/^[\s　]+/, '')
      if (own(formErr, 't-' + s) && tempErr(s) === null) clearFormErr('t-' + s)
      renderCalc()
      scheduleLive()
    })
  })
  // Enter で記録しない：記録する日 → 基準内の見本、温度の欄 → 次の温度の欄（冷凍 閉店後は原材料の受け入れ）
  form.addEventListener('keydown', function (e) {
    var t = e.target
    if (e.key === 'Enter' && t.tagName === 'INPUT') {
      e.preventDefault()
      if (t.id === 'l-date') { $('smp-t1').focus(); return }
      var m = /^t-(\d)$/.exec(t.id)
      if (!m) return
      var s = Number(m[1])
      if (s < 5) $('t-' + (s + 1)).focus()
      else (form.querySelector('input[name="c-recv"]:checked') || $('c-recv-ok')).focus()
      return
    }
    if (t.type === 'radio' && (e.key === 'Home' || e.key === 'End')) {
      var g = form.querySelectorAll('input[name="' + t.name + '"]')
      var r = g[e.key === 'Home' ? 0 : g.length - 1]
      e.preventDefault()
      r.checked = true; r.focus()
      r.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  // 見本を入れる（日付・確認した人・対応・ひとことは変えない）
  function preset (k) {
    var p = PRESET[k]
    SLOTS.forEach(function (x, s) { $('t-' + s).value = p[0][s]; clearFormErr('t-' + s) })
    CHECK_IDS.forEach(function (id) { setRadio('c-' + id, p[1]); clearFormErr('c-' + id) })
    syncPicks()
    var f = renderCalc()
    var msg = liveMsg(f)
    lastLive = msg
    announce((k === 't4' ? '空にしました。' : p[2] + 'を入れました。') + msg, 0)
  }
  ;['t1', 't2', 't3', 't4'].forEach(function (k) { $('smp-' + k).addEventListener('click', function () { preset(k) }) })

  // 記録する
  function nextNo () {
    // 番号が上限に来た時は 1 から振り直す（直前の1件は取り消せなくなる）
    if (S.seq >= 100000) { S.recs.sort(byDate).forEach(function (r, i) { r.no = i + 1 }); S.seq = S.recs.length + 1; ui.lastRec = null }
    var no = S.seq; S.seq = S.seq + 1
    return no
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    // submitter の無いブラウザ（iOS Safari 15.3 以前など）でも記録できるように、ある時だけ「記録する」かを見る
    // （欄の上の Enter は keydown で止めているので、ここに来るのは「記録する」ボタンだけ）
    if (e.submitter && e.submitter.id !== 'btn-log') return
    load()
    clearAllFormErr()
    var errs = []
    var dm = dateErr(); if (dm) errs.push(['date', dm])
    var f = readForm()
    var rec = { no: 0, date: '', temps: [], tAct: [], tNote: [], checks: [], cAct: [], cNote: [], role: '', late: false }
    SLOTS.forEach(function (x, s) {
      var m = tempErr(s)
      if (m) { errs.push(['t-' + s, m]); rec.temps.push(0); rec.tAct.push(''); rec.tNote.push(''); return }
      rec.temps.push(f.temps[s])
      if (!f.out[s]) { rec.tAct.push(''); rec.tNote.push(''); return }
      var a = checkedVal('ta-' + s); var nr = checkNote($('tn-' + s).value)
      if (!a) errs.push(['ta-' + s, SLOTS[s] + 'が基準外です。とった対応を選んでください'])
      if (nr.e) errs.push(['tn-' + s, noteMsg(nr, SLOTS[s])])
      rec.tAct.push(a || ''); rec.tNote.push(nr.v || '')
    })
    CHECK_IDS.forEach(function (id, i) {
      var c = f.checks[i]
      if (!c) { errs.push(['c-' + id, CHECKS[i].name + 'の 良／否 を選んでください']); rec.checks.push('ok'); rec.cAct.push(''); rec.cNote.push(''); return }
      rec.checks.push(c)
      if (c !== 'ng') { rec.cAct.push(''); rec.cNote.push(''); return }
      var a = checkedVal('ca-' + id); var nr = checkNote($('cn-' + id).value)
      if (!a) errs.push(['ca-' + id, CHECKS[i].name + 'が否です。とった対応を選んでください'])
      if (nr.e) errs.push(['cn-' + id, noteMsg(nr, CHECKS[i].name)])
      rec.cAct.push(a || ''); rec.cNote.push(nr.v || '')
    })
    var role = checkedVal('role')
    if (!role) errs.push(['role', '確認した人（役割）を選んでください'])
    if (errs.length) {
      errs.sort(function (a, b) { return ERR_ORDER.indexOf(a[0]) - ERR_ORDER.indexOf(b[0]) })
      errs.forEach(function (x) { setFormErr(x[0], x[1]) })
      $(FORM_ERR[errs[0][0]][1]).focus()
      announce('記録できませんでした。直すところが ' + errs.length + 'か所あります')
      return
    }
    rec.date = parseDate($('l-date').value).v
    rec.role = role
    rec.late = rec.date < TODAY
    // 書く直前に読み直して、同じ日が無いことを確かめる（別のタブで記録していた時）
    load()
    if (hasRec(rec.date)) {
      setFormErr('date', DATE_MSG.dup); $('l-date').focus()
      announce('記録できませんでした。直すところが 1か所あります')
      return
    }
    rec.no = nextNo()
    S.recs.push(rec); S.recs.sort(byDate)
    save()
    // 番号だけでなく日付も持つ（別のタブで見本に戻して同じ番号が別の記録になった時に、別の記録を消さない）
    ui.lastRec = { date: rec.date, no: rec.no }
    ui.doneRec = JSON.parse(JSON.stringify(rec))
    ui.view = 'done'
    renderAll()
    var dc = dayCalc(rec)
    showToast(jpDate(rec.date) + 'を記録しました', jpDate(rec.date) + 'を記録しました。基準外 ' + dc.outN + 'か所・否 ' + dc.ngN + '項目')
    $('slip-h').focus()
  })
  // 直前の1件（date と no の両方が合う記録がある時だけ）
  function lastRec () {
    var la = ui.lastRec
    if (!la || !S) return null
    var r = S.recs.filter(function (x) { return x.date === la.date && x.no === la.no })
    return r.length ? r[0] : null
  }
  $('undo-btn').addEventListener('click', function () {
    load()
    var r = lastRec()
    var keep = ui.doneRec
    ui.lastRec = null
    ui.view = 'form'
    if (!r) { ui.doneRec = null; resetForm(); renderAll(); $('l-date').focus(); announce('この記録はもうありません'); return }
    S.recs = S.recs.filter(function (x) { return !(x.date === r.date && x.no === r.no) })
    save()
    ui.doneRec = null
    // 取り消した記録の値を入れたまま（直してすぐ記録し直せるように）
    fillForm(keep || r)
    renderAll()
    $('l-date').focus()
    showToast('記録を取り消しました', jpDate(r.date) + 'の記録を取り消しました')
  })
  $('btn-next').addEventListener('click', function () {
    load(); ui.lastRec = null; ui.doneRec = null; ui.view = 'form'
    resetForm(); renderAll(); $('l-date').focus()
  })
  $('btn-go-month').addEventListener('click', function () {
    if (ui.doneRec) ui.monthYm = ui.doneRec.date.slice(0, 7)
    goPanel('month')
  })
  function renderToday () {
    if (ui.view === 'done' && !ui.doneRec) ui.view = 'form'
    form.hidden = ui.view !== 'form'
    $('log-done').hidden = ui.view !== 'done'
    if (ui.view !== 'done') { renderCalc(); return }
    var r = ui.doneRec; var dc = dayCalc(r)
    setText($('slip-date'), [nw(jpDate(r.date)), '　確認した人 ', nw(labelOf(ROLES, r.role)), r.late ? stateTag('late') : null])
    var tp = []
    FRIDGES.forEach(function (fr, k) { tp.push((k ? '・' : ''), nw(fr + ' ' + fmtTemp(r.temps[2 * k]) + '／' + fmtTemp(r.temps[2 * k + 1]))) })
    tp.push('（開店前／閉店後）')
    setText($('slip-temps'), tp)
    setText($('slip-sum'), ['基準外 ', nw(dc.outN + 'か所'), '・否 ', nw(dc.ngN + '項目'), ' ', dc.allOk ? stateTag('all') : null])
    var ul = $('slip-events'); ul.textContent = ''
    events({ recs: [r] }, r.date.slice(0, 7)).forEach(function (ev) {
      var head = ev.kind === 't' ? [nw(ev.target), ' ', nw(fmtTemp(ev.t)), ' ', stateTag('out')] : [nw(ev.target), ' ', stateTag('ng')]
      ul.appendChild(add(el('li', 'slip-ev'), [add(el('p', 'slip-ev__h'), head), el('p', 'slip-ev__note', ev.actL + '：' + ev.note)]))
    })
    ul.hidden = !ul.firstChild
    setText($('done-note'), ['デモ：この端末の月の記録表（', nw(jpMonth(r.date.slice(0, 7))), '）に入りました（送信はしていません）'])
    $('undo-btn').hidden = !lastRec()
    wrapWords($('log-done'))
  }

  // ---------- 月の選択 ----------
  function fillSelect (sel) {
    if (sel.options.length) return
    MONTHS.forEach(function (m) { var op = el('option', null, jpMonth(m)); op.value = m; sel.appendChild(op) })
  }

  // ---------- 月の記録表 ----------
  function monthMsg (ms) {
    if (!ms.rec) return jpMonth(ms.ym) + '。この月の記録はまだありません'
    return jpMonth(ms.ym) + '。営業 ' + ms.biz + '日、記録 ' + ms.rec + '日、記録漏れ ' + ms.miss + '日、否 ' + ms.ng + '回、基準外 ' + ms.out + '回'
  }
  function nowMark (date) { var la = lastRec(); return !!la && la.date === date }
  function buildLogHead () {
    var cg = $('log-cols')
    var widths = [100, 60, 60, 60, 60, 60, 60, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 52]
    widths.forEach(function (w) { var c = el('col'); c.style.width = w + 'px'; cg.appendChild(c) })
    var th = function (text, o) { var t = el('th', o.cls || null, text); attr(t, o.at || {}); return t }
    var r1 = add(el('tr'), [th('日付', { cls: 'c-date', at: { scope: 'col', rowspan: '2' } })].concat(FRIDGES.map(function (f) { return th(f, { at: { scope: 'colgroup', colspan: '2' } }) }),
      [th('一般的衛生管理', { at: { scope: 'colgroup', colspan: '7' } }), th('重要管理', { at: { scope: 'colgroup', colspan: '3' } }), th('確認', { at: { scope: 'col', rowspan: '2' } })]))
    var r2 = el('tr')
    SLOTS.forEach(function (s, i) { r2.appendChild(th(TIMES[i & 1], { cls: 'num', at: { scope: 'col' } })) })
    ITEMS.forEach(function (it) {
      var t = th(null, { at: { scope: 'col' } })
      var sh = el('span', null, it.short); sh.setAttribute('aria-hidden', 'true')
      add(t, [sh, el('span', 'visually-hidden', it.name)])
      r2.appendChild(t)
    })
    add($('log-thead'), [r1, r2])
    var lg = $('log-legend')
    ITEMS.forEach(function (it) { lg.appendChild(add(el('div'), [el('dt', null, it.short), el('dd', null, it.auto ? it.name + '（温度の6つから自動）' : it.name)])) })
    lg.appendChild(add(el('div', 'log-legend__base'), [el('dt', null, '基準'), el('dd', null, '冷蔵 10.0℃以下・冷凍 −15.0℃以下で良')]))
  }
  buildLogHead()
  function renderMonth () {
    var ym = ui.monthYm
    var sel = $('month-month'); fillSelect(sel); sel.value = ym
    var ms = monthStats(S, ym)
    $('ms-biz').textContent = String(ms.biz)
    // 記録した月曜は臨時の営業として営業日数・記録した日数に入り、記録しない月曜は定休日（記録漏れにしない）
    setText($('ms-biz-note'), ['定休日 ' + ms.closed + '日' + (ms.closed ? '（月曜）' : '')].concat(ms.extra ? ['・', nw('臨時の営業 ' + ms.extra + '日')] : []))
    $('ms-rec').textContent = String(ms.rec)
    $('ms-rec-note').textContent = '記録漏れ ' + ms.miss + '日'
    $('ms-ng').textContent = String(ms.ng)
    $('ms-ng-note').textContent = ms.rec ? '10項目×' + ms.rec + '日のうち' : ''
    $('ms-ng-note').hidden = !ms.rec
    $('ms-out').textContent = String(ms.out)
    $('ms-out-note').textContent = ms.rec ? '温度 6回×' + ms.rec + '日＝' + (6 * ms.rec) + '回のうち' : ''
    $('ms-out-note').hidden = !ms.rec
    $('month-none').hidden = ms.rec > 0
    $('log-cap').textContent = jpMonth(ym) + ' 衛生管理の記録表'
    var tb = $('log-tbody'); tb.textContent = ''
    monthDays(S, ym).forEach(function (d) {
      var th = el('th', 'c-date'); th.setAttribute('scope', 'row')
      add(th, nw(mdw(d.date)))
      var tr = el('tr'); tr.setAttribute('data-date', d.date)
      if (d.kind !== 'rec') {
        tr.className = 'row-' + d.kind
        var td0 = el('td', 'c-span'); td0.colSpan = 17; td0.appendChild(stateTag(d.kind))
        tb.appendChild(add(tr, [th, td0]))
        return
      }
      var r = d.rec; var dc = dayCalc(r)
      if (r.late) add(th, [el('br'), stateTag('late')])
      if (nowMark(d.date)) th.appendChild(el('span', 'now-mark', '（いま記録した日）'))
      tr.appendChild(th)
      r.temps.forEach(function (t, s) {
        var td = el('td', 'num c-t' + (dc.out[s] ? ' cell-bad' : ''))
        add(td, dc.out[s] ? [el('span', 'cell-v', fmtTempBare(t)), el('span', 'cell-sub', '基準外')] : fmtTempBare(t))
        tr.appendChild(td)
      })
      itemVals(r, dc).forEach(function (v) {
        var td = el('td', 'c-c' + (v === 'ng' ? ' cell-bad' : ''))
        add(td, v === 'ng' ? add(el('span', 'cell-ng'), [icon('i-ng', 14), '否']) : '良')
        tr.appendChild(td)
      })
      tr.appendChild(el('td', 'c-role', labelOf(ROLES, r.role)))
      if (r.late || nowMark(d.date)) tr.classList.add('is-tall')
      tb.appendChild(tr)
    })
    // 否・基準外と、とった対応
    var evs = events(S, ym)
    $('ev-sec').hidden = !ms.rec
    $('ev-h').textContent = '否・基準外と、とった対応（' + evs.length + '件）'
    $('ev-none').hidden = evs.length > 0
    var list = $('event-list'); list.textContent = ''
    evs.forEach(function (ev) {
      var head = [nw(mdw(ev.date)), ' ', nw(ev.target)]
      if (ev.kind === 't') head.push(' ', nw(fmtTemp(ev.t)))
      head.push(' ', stateTag(ev.kind === 't' ? 'out' : 'ng'))
      var c = add(el('article', 'event-card'), [add(el('p', 'event-card__h'), head), el('p', 'event-card__act', ev.actL), el('p', 'event-card__note', ev.note)])
      c.setAttribute('data-date', ev.date)
      list.appendChild(c)
    })
    wrapWords($('panel-month'))
  }
  $('month-month').addEventListener('change', function () {
    load()
    ui.monthYm = $('month-month').value
    renderAll()
    announce(monthMsg(monthStats(S, ui.monthYm)))
  })

  // ---------- 振り返り ----------
  function barsOf (ms) {
    var list = FRIDGES.map(function (f, k) { return { g: 'temp', name: f, n: ms.perFridge[k] } })
    ITEMS.forEach(function (it, i) { list.push({ g: it.kind, name: it.name, n: ms.perItem[i] }) })
    return list
  }
  function reviewMsg (ms) {
    if (!ms.rec) return jpMonth(ms.ym) + '。この月の記録はまだありません'
    var best = null
    barsOf(ms).forEach(function (b) { if (b.n > 0 && (best === null || b.n > best.n)) best = b })
    if (!best) return jpMonth(ms.ym) + '。否・基準外はありません'
    return jpMonth(ms.ym) + '。否がいちばん多いのは ' + best.name + ' ' + best.n + '回'
  }
  function when (o) { return mdw(o.date) + TIMES[o.slot & 1] }
  function renderReview () {
    var ym = ui.reviewYm
    var sel = $('review-month'); fillSelect(sel); sel.value = ym
    var ms = monthStats(S, ym)
    $('review-none').hidden = ms.rec > 0
    $('review-body').hidden = !ms.rec
    var cards = $('temp-cards'); cards.textContent = ''
    var tb = $('temp-tbody'); tb.textContent = ''
    ;['bars-temp', 'bars-gen', 'bars-crit'].forEach(function (id) { $(id).textContent = '' })
    if (ms.rec) {
      $('ts-note').textContent = '※ 開店前と閉店後の全部（' + ms.rec + '日×2回＝' + (2 * ms.rec) + '回）から。平均は小数第2位を四捨五入'
      $('temp-cap').textContent = jpMonth(ym) + ' 冷蔵庫ごとの温度'
      tempStats(S, ym).forEach(function (o, k) {
        var lim = k < 2 ? '10.0℃以下で良' : '−15.0℃以下で良'
        var row = function (lab, v, w) { return add(el('div', 'ts-row'), [el('span', 'ts-row__l', lab), el('span', 'ts-row__v', v), el('span', 'ts-row__w', w || '')]) }
        var card = add(el('article', 'ts-card'), [
          add(el('h4', 'ts-card__h'), [nw(o.name), nw('（' + lim + '）', 'ts-card__lim')]),
          row('最高', fmtTemp(o.max.t), when(o.max)), row('最低', fmtTemp(o.min.t), when(o.min)), row('平均', fmtTemp(o.avg)),
          el('p', 'ts-card__n', '測った回数 ' + o.n + '回・基準外 ' + o.out + '回')
        ])
        card.setAttribute('data-f', o.name)
        cards.appendChild(card)
        var th = add(el('th'), [nw(o.name), el('span', 'ts-lim', lim)]); th.setAttribute('scope', 'row')
        var cell = function (x) { return add(el('td'), [el('span', 'ts-v', fmtTemp(x.t)), el('span', 'ts-w', when(x))]) }
        var tr = add(el('tr'), [th, cell(o.max), cell(o.min), el('td', 'num ts-v', fmtTemp(o.avg)), el('td', 'num', o.n + '回'), el('td', 'num', o.out + '回')])
        tr.setAttribute('data-f', o.name)
        tb.appendChild(tr)
      })
      setText($('ib-lead'), ['否 ', nw(ms.ng + '回'), '・基準外 ', nw(ms.out + '回'), '（記録 ', nw(ms.rec + '日'), 'のうち）'])
      var bs = barsOf(ms)
      var max = Math.max.apply(null, bs.map(function (b) { return b.n }))
      bs.forEach(function (b) {
        var li = add(el('li', 'ibar'), [el('span', 'ibar__l', b.name), bar(b.n, max), el('span', 'ibar__v', b.n + '回')])
        li.setAttribute('data-name', b.name)
        $('bars-' + b.g).appendChild(li)
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

  // ---------- CSV・印刷 ----------
  var NONE_MSG = 'この月の記録はまだありません'
  function setDisabled (b, off) {
    if (off) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', 'export-empty') } else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby') }
  }
  function csvName () { return 'minasegi_eisei_demo_' + ui.expYm + '.csv' }
  function renderExport () {
    var sel = $('export-month'); fillSelect(sel); sel.value = ui.expYm
    var n = monthRecs(S, ui.expYm).length
    var days = monthDays(S, ui.expYm).length
    $('export-empty').hidden = n > 0
    setDisabled($('btn-csv'), !n); setDisabled($('btn-print'), !n)
    setText($('csv-name'), ['ファイル名：', nw(csvName()), nw('（' + days + '日分）')])
    var peek = buildCsv(S, ui.expYm).slice(1).split('\r\n').filter(function (l) { return l !== '' })
    $('csv-peek').textContent = (n ? peek.slice(0, 4) : peek.slice(0, 1)).join('\n')
    wrapWords($('panel-export'))
  }
  $('export-month').addEventListener('change', function () { load(); ui.expYm = $('export-month').value; renderAll() })
  function renderCols () {
    var tb = $('csv-cols'); tb.textContent = ''
    CSV_COLS.forEach(function (c, i) { add(tb, add(el('tr'), [el('td', null, String(i + 1)), el('td', 'nw', c[0]), el('td', null, c[1])])) })
  }
  $('btn-csv').addEventListener('click', function () {
    load()
    if (!monthRecs(S, ui.expYm).length) { announce(NONE_MSG); return }
    var blob = new Blob([buildCsv(S, ui.expYm)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url; a.download = csvName()
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    showToast('CSV を作りました（' + jpMonth(ui.expYm) + '・' + monthDays(S, ui.expYm).length + '日分）')
  })
  $('btn-print').addEventListener('click', function () {
    load()
    if (!monthRecs(S, ui.expYm).length) { announce(NONE_MSG); return }
    doPrint(ui.expYm)
  })

  // ---------- 紙面（値は textContent） ----------
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
  var FOOT_E = 'デモ（架空のお店）です。記録はすべて架空です。TENKA LAB の制作見本です。衛生管理の基準は、お店の衛生管理計画と保健所の指導に従ってください。'
  var PAPER_MAX = 12
  var PAPER_KIND = { closed: '定休日', miss: '記録漏れ', today: '今日・まだ記録なし' }
  function paperTable (ym) {
    var t = el('table', 'sheet__log')
    var cg = el('colgroup')
    ;[19, 13, 13, 13, 13, 13, 13, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 10].forEach(function (w) { var c = el('col'); c.style.width = w + 'mm'; cg.appendChild(c) })
    var th = function (text, at) { return attr(el('th', null, text), at) }
    var h1 = add(el('tr'), [th('日付', { scope: 'col', rowspan: '2' })].concat(FRIDGES.map(function (f) { return th(f, { scope: 'colgroup', colspan: '2' }) }), [th('一般的衛生管理', { scope: 'colgroup', colspan: '7' }), th('重要管理', { scope: 'colgroup', colspan: '3' }), th('確認', { scope: 'col', rowspan: '2' })]))
    var h2 = add(el('tr'), SLOTS.map(function (s, i) { return th(i & 1 ? '閉' : '開', { scope: 'col' }) }).concat(ITEMS.map(function (it) { return th(it.paper, { scope: 'col' }) })))
    var tb = el('tbody')
    monthDays(S, ym).forEach(function (d) {
      var rh = attr(el('th', null, mdw(d.date)), { scope: 'row' })
      if (d.kind !== 'rec') { var c = el('td', 'span', PAPER_KIND[d.kind]); c.colSpan = 17; tb.appendChild(add(el('tr', 'is-' + d.kind), [rh, c])); return }
      var r = d.rec; var dc = dayCalc(r)
      var cells = r.temps.map(function (x, s) { return el('td', 'num' + (dc.out[s] ? ' bad' : ''), (dc.out[s] ? '▲' : '') + fmtTempBare(x)) })
        .concat(itemVals(r, dc).map(function (v) { return el('td', 'mid' + (v === 'ng' ? ' bad' : ''), v === 'ng' ? '×否' : '良') }))
      tb.appendChild(add(el('tr'), [rh].concat(cells, [el('td', 'mid', labelOf(ROLES, r.role))])))
    })
    return add(t, [cg, add(el('thead'), [h1, h2]), tb])
  }
  function buildSheet (ym) {
    var ms = monthStats(S, ym)
    var title = SHOP + '　' + jpMonth(ym) + ' 衛生管理の記録表'
    var head = [stampSvg(), el('p', 'sheet__shop', title)]
    if (!ms.rec) {
      // 記録0件の月（ブラウザのメニューからの印刷でも白紙にしない）
      return add(el('div', 'sheet'), head.concat([el('p', 'sheet__none', NONE_MSG), el('p', 'sheet__foot', FOOT_E)]))
    }
    var cond1 = el('p', 'sheet__cond', '今日 ' + TODAY + '（デモの日付）で作成／基準 冷蔵 10.0℃以下・冷凍 −15.0℃以下')
    var cond2 = el('p', 'sheet__cond', '営業 ' + ms.biz + '日・記録 ' + ms.rec + '日・記録漏れ ' + ms.miss + '日・否 ' + ms.ng + '回・基準外 ' + ms.out + '回')
    var evs = events(S, ym)
    var right = add(el('div', 'sheet__right'), el('p', 'sheet__h', '否・基準外と、とった対応（' + evs.length + '件）'))
    if (!evs.length) right.appendChild(el('p', 'sheet__ev', 'この月の否・基準外はありません'))
    evs.slice(0, PAPER_MAX).forEach(function (ev) {
      var h = mdw(ev.date) + ' ' + ev.target + (ev.kind === 't' ? ' ▲' + fmtTemp(ev.t) + ' 基準外' : ' ×否')
      right.appendChild(add(el('div', 'sheet__ev'), [el('p', 'sheet__ev-h', h), el('p', 'sheet__ev-n', ev.actL + '：' + ev.note)]))
    })
    if (evs.length > PAPER_MAX) right.appendChild(el('p', 'sheet__ev-more', 'ほか ' + (evs.length - PAPER_MAX) + '件（CSV に全部あります）'))
    var legend = add(el('p', 'sheet__legend', '凡例：'), ITEMS.map(function (it) { return it.paper + '＝' + it.name }).concat(['開＝開店前', '閉＝閉店後', '▲＝基準外（10.0℃・−15.0℃ を超えた）', '×否＝否']).map(function (t, i) { return [i ? '　' : '', nw(t)] }))
    var seal = add(el('div', 'seal'), [el('span', null, '確認の印'), el('span', 'seal__box'), el('span', 'seal__box')])
    var left = add(el('div', 'sheet__left'), [el('p', 'sheet__unit', '温度（℃）'), paperTable(ym), add(el('div', 'sheet__lfoot'), [legend, seal])])
    return add(el('div', 'sheet'), head.concat([cond1, cond2, add(el('div', 'sheet__body'), [left, right]), el('p', 'sheet__foot', FOOT_E)]))
  }
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  var printTitle = null
  function fillPrint (ym) {
    elPrintRoot.textContent = ''
    elPrintRoot.appendChild(buildSheet(ym))
    printTitle = 'minasegi_eisei_' + ym
  }
  function doPrint (ym) {
    fillPrint(ym)
    document.title = printTitle
    window.print()
  }
  window.addEventListener('beforeprint', function () {
    // ブラウザのメニューからの印刷は、書き出しのタブで選んでいる月（0件の月は「ありません」の紙）
    if (!elPrintRoot.firstChild) { load(); fillPrint(ui.expYm) }
    document.title = printTitle
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  function renderBar () { $('today-main').textContent = '今日 ' + jpDate(TODAY) }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    renderBar()
    renderToday()
    renderMonth()
    renderReview()
    renderExport()
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }
  window.addEventListener('resize', function () { if (ui.tab === 'today' && ui.view === 'form') renderCalc() })

  // ---------- 見本に戻す ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox().then(function (yes) {
      if (!yes) return
      S = sample()
      save()
      ui.lastRec = null; ui.doneRec = null; ui.view = 'form'
      ui.monthYm = '2026-11'; ui.reviewYm = '2026-11'; ui.expYm = '2026-11'
      $('note-broken').hidden = true
      resetForm()
      renderAll()
      $('btn-reset').focus()
      showToast('見本に戻しました')
    })
  })

  // ---------- 2つのタブの同期 ----------
  window.addEventListener('storage', function (e) {
    if (!canSave) return
    if (e.key !== null && e.key !== KEY) return
    if (e.key === null || e.newValue === null) { S = sample(); save() } else load()
    // 別の画面で変わった時は、直前の1件を取り消せなくする（別の記録を消さないため）
    ui.lastRec = null
    renderAll()
    announce('別の画面で記録が変わりました')
  })

  // ---------- はじめ ----------
  load()
  if (!canSave) $('note-nosave').hidden = false
  renderCols()
  resetForm()
  wrapWords(document.body)
  openTab(ui.tab, { noScroll: true })

  // 検査用（状態を引数で受ける純粋な関数と定数だけ。画面の状態は出さない）
  window.__demo23 = {
    parseTemp: parseTemp, isOut: isOut, fmtTemp: fmtTemp, fmtTempBare: fmtTempBare, csvTemp: csvTemp, avgTenths: avgTenths, parseDate: parseDate, checkNote: checkNote,
    dayCalc: dayCalc, monthDays: monthDays, monthStats: monthStats, tempStats: tempStats, events: events, validate: validate, csvCell: csvCell, buildCsv: buildCsv, sample: sample,
    wdName: wdName, mdw: mdw, jpDate: jpDate, TODAY: TODAY, LIMITS: LIMITS, ITEMS: ITEMS, SLOTS: SLOTS
  }
})()
