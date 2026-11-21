// 喫茶 カサネド（デモ）お客様アンケートの集計と見える化
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 平均・割合は整数だけで計算する（design.md §10-2。小数の丸めの関数・現在時刻・乱数は使わない）
// フォームの欄は最初に1回だけ作り、描き直しでは数字・一覧の所だけ書き換える（§12-3）
(function () {
  'use strict'

  // ---------- 定数（design.md §12-1・§20-1） ----------
  var KEY = 'tenkaLab.demo21.cafeSurvey.v1'
  var TEST_KEY = 'tenkaLab.demo21.test'
  var SHOP = '喫茶 カサネド'
  var TODAY = '2026-12-01'
  var MIN_DATE = '2026-10-01'
  var MONTHS = ['2026-12', '2026-11', '2026-10']
  var MAX_ANS = 1000
  var ITEMS = ['taste', 'speed', 'service', 'comfort', 'price']
  var IL = { taste: '味', speed: '提供の速さ', service: '接客', comfort: '居心地', price: '価格' }
  var SLOTS = ['morning', 'lunch', 'afternoon', 'night']
  var SL = { morning: '朝', lunch: '昼', afternoon: '午後', night: '夜' }
  var SR = { morning: '開店〜11時', lunch: '11〜14時', afternoon: '14〜17時', night: '17時〜閉店' }
  var CATS = ['pro', 'pas', 'det']
  var CL = { pro: '推奨', pas: '中立', det: '批判' }
  var ANS_KEYS = ['id', 'date', 'slot', 'taste', 'speed', 'service', 'comfort', 'price', 'again', 'comment', 'done', 'memo']
  // 見本の回答 60件（§20-2。番号・来店日・時間帯・味・速さ・接客・居心地・価格・また来たい・ひとこと・対応済み・社内メモ。回答はすべて架空）
  var SAMPLE = [
    ['A001', '2026-10-02', 'lunch', 5, 2, 4, 3, 4, 6, '昼はコーヒーが出てくるまで少し待ちました。味はとても好きです。', 0, ''],
    ['A002', '2026-10-03', 'morning', 5, 5, 4, 5, 3, 9, '朝の静かな時間に、厚切りのトーストとコーヒー。ほっとしました。', 0, ''],
    ['A003', '2026-10-03', 'lunch', 4, 3, 4, 4, 4, 8, '', 0, ''],
    ['A004', '2026-10-04', 'afternoon', 5, 4, 5, 5, 3, 10, '窓ぎわの席が明るくて、本が読みやすかったです。', 0, ''],
    ['A005', '2026-10-06', 'lunch', 5, 2, 3, 3, 3, 5, '注文から料理まで20分ほど待ちました。昼休みが短いので心配です。', 1, '11月から昼は先に注文を伺う形にした'],
    ['A006', '2026-10-08', 'afternoon', 5, 5, 4, 5, 4, 9, '', 0, ''],
    ['A007', '2026-10-09', 'lunch', 4, 1, 4, 3, 4, 3, '昼の混む時間、注文を聞いてもらうまでかなり待ちました。', 1, '11月から昼は先に注文を伺う形にした'],
    ['A008', '2026-10-10', 'morning', 4, 5, 5, 4, 4, 8, '', 0, ''],
    ['A009', '2026-10-10', 'afternoon', 4, 4, 5, 4, 3, 8, 'プリンが固めで好みでした。', 0, ''],
    ['A010', '2026-10-11', 'afternoon', 5, 4, 4, 5, 4, 10, '', 0, ''],
    ['A011', '2026-10-13', 'lunch', 4, 3, 5, 4, 4, 9, 'ナポリタンがおいしかった。また来ます。', 0, ''],
    ['A012', '2026-10-15', 'afternoon', 4, 3, 4, 5, 3, 7, '', 0, ''],
    ['A013', '2026-10-16', 'lunch', 5, 2, 4, 4, 5, 10, 'カップがきれいで、コーヒーの香りがよかったです。', 0, ''],
    ['A014', '2026-10-17', 'lunch', 3, 2, 4, 2, 3, 6, '席が狭く、隣の声が気になりました。', 1, '11月に席の間を広げた'],
    ['A015', '2026-10-17', 'afternoon', 5, 5, 5, 4, 4, 10, '深煎りのブレンドが好みの味でした。豆も買って帰りました。', 0, ''],
    ['A016', '2026-10-18', 'afternoon', 4, 4, 4, 5, 3, 9, '', 0, ''],
    ['A017', '2026-10-20', 'morning', 5, 4, 3, 5, 3, 10, 'モーニングのゆで卵がうれしい。', 0, ''],
    ['A018', '2026-10-22', 'lunch', 4, 3, 4, 3, 4, 8, '', 0, ''],
    ['A019', '2026-10-23', 'afternoon', 5, 4, 5, 5, 4, 9, '店員さんの説明がていねいで、豆を選びやすかったです。', 0, ''],
    ['A020', '2026-10-24', 'lunch', 5, 2, 4, 4, 4, 9, '', 0, ''],
    ['A021', '2026-10-24', 'afternoon', 5, 5, 4, 4, 4, 8, 'ケーキの種類がもう少しあるとうれしいです。', 0, ''],
    ['A022', '2026-10-25', 'afternoon', 4, 4, 4, 5, 3, 9, '', 0, ''],
    ['A023', '2026-10-27', 'lunch', 4, 4, 5, 4, 4, 10, '昼でも落ち着いて食べられました。', 0, ''],
    ['A024', '2026-10-29', 'afternoon', 4, 3, 5, 4, 1, 4, 'ケーキセットが少し高いと感じました。', 0, ''],
    ['A025', '2026-10-30', 'lunch', 4, 3, 4, 3, 3, 7, '', 0, ''],
    ['A026', '2026-10-31', 'morning', 4, 4, 5, 5, 4, 7, '開店直後は少し寒かったです。', 0, ''],
    ['A027', '2026-10-31', 'lunch', 5, 2, 4, 4, 4, 8, '', 0, ''],
    ['A028', '2026-10-31', 'afternoon', 5, 4, 4, 5, 4, 8, '静かで長居してしまいました。', 0, ''],
    ['A029', '2026-11-01', 'morning', 5, 5, 5, 5, 4, 10, '朝の光が入る席で、コーヒーがいっそうおいしく感じました。', 0, ''],
    ['A030', '2026-11-01', 'lunch', 5, 3, 4, 4, 4, 9, '前より料理が早く出てきました。', 0, ''],
    ['A031', '2026-11-03', 'lunch', 4, 4, 4, 3, 4, 8, '', 0, ''],
    ['A032', '2026-11-05', 'night', 4, 4, 4, 5, 4, 9, '夜も開いているのがうれしいです。照明が落ち着きます。', 0, ''],
    ['A033', '2026-11-06', 'afternoon', 5, 4, 5, 5, 4, 10, '季節のタルトがおいしかったです。', 0, ''],
    ['A034', '2026-11-07', 'lunch', 5, 3, 5, 4, 4, 10, '', 0, ''],
    ['A035', '2026-11-07', 'night', 5, 4, 5, 5, 3, 8, '夜のコーヒーは少し高めに感じましたが、雰囲気は好きです。', 0, ''],
    ['A036', '2026-11-08', 'afternoon', 5, 5, 4, 5, 3, 9, '', 0, ''],
    ['A037', '2026-11-10', 'lunch', 4, 2, 4, 3, 3, 6, '昼は相変わらず少し待ちます。席に着くまでが長かった。', 0, ''],
    ['A038', '2026-11-12', 'night', 4, 5, 4, 4, 4, 7, '', 0, ''],
    ['A039', '2026-11-13', 'lunch', 5, 4, 4, 4, 4, 9, '日替わりのサンドがちょうどいい量でした。', 0, ''],
    ['A040', '2026-11-14', 'morning', 4, 5, 4, 5, 3, 9, '', 0, ''],
    ['A041', '2026-11-14', 'afternoon', 4, 4, 4, 5, 4, 8, '席の間が広くなって話しやすくなりました。', 0, ''],
    ['A042', '2026-11-15', 'lunch', 4, 3, 5, 4, 4, 9, '', 0, ''],
    ['A043', '2026-11-17', 'night', 5, 4, 4, 5, 4, 10, '仕事帰りに寄れる店ができてうれしい。', 0, ''],
    ['A044', '2026-11-18', 'lunch', 5, 4, 4, 4, 5, 10, '', 0, ''],
    ['A045', '2026-11-19', 'afternoon', 5, 4, 5, 4, 3, 9, '店員さんがカップを選ばせてくれて楽しかったです。', 0, ''],
    ['A046', '2026-11-20', 'night', 4, 3, 4, 4, 3, 8, '', 0, ''],
    ['A047', '2026-11-21', 'lunch', 4, 3, 4, 3, 4, 8, 'コーヒーのおかわりがあると助かります。', 0, ''],
    ['A048', '2026-11-21', 'afternoon', 4, 5, 5, 5, 4, 10, '', 0, ''],
    ['A049', '2026-11-22', 'morning', 5, 4, 5, 4, 4, 10, 'モーニングのトーストが香ばしい。', 0, ''],
    ['A050', '2026-11-24', 'lunch', 5, 3, 4, 4, 4, 9, '', 0, ''],
    ['A051', '2026-11-25', 'night', 5, 4, 5, 5, 4, 9, '静かな音楽がちょうどよい音量でした。', 0, ''],
    ['A052', '2026-11-26', 'lunch', 4, 4, 5, 4, 4, 7, '', 0, ''],
    ['A053', '2026-11-27', 'afternoon', 5, 4, 4, 5, 3, 8, 'ケーキがもう少し大きいとうれしい。', 0, ''],
    ['A054', '2026-11-28', 'lunch', 3, 2, 3, 2, 3, 2, '注文を忘れられて30分待ちました。残念です。', 0, ''],
    ['A055', '2026-11-28', 'night', 4, 4, 4, 3, 3, 7, '夜は席が少し暗くて、メニューが読みにくかったです。', 0, ''],
    ['A056', '2026-11-28', 'afternoon', 4, 3, 4, 4, 2, 5, 'ケーキセットの値段が上がった気がします。', 0, ''],
    ['A057', '2026-11-29', 'morning', 5, 5, 4, 5, 3, 9, '', 0, ''],
    ['A058', '2026-11-29', 'lunch', 5, 4, 4, 4, 4, 10, '昼の提供が早くなって助かります。', 0, ''],
    ['A059', '2026-11-30', 'night', 5, 5, 5, 5, 4, 10, '深煎りのブレンドと、白いカップの手ざわりが好きです。', 0, ''],
    ['A060', '2026-11-30', 'afternoon', 5, 4, 5, 5, 4, 9, '豆の量り売りがありがたいです。', 0, '']
  ]
  function own (o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
  function pad2 (n) { return n < 10 ? '0' + n : String(n) }
  function idNum (id) { return Number(id.slice(1)) }
  function idOf (n) { return 'A' + (n < 1000 ? String(n).padStart(3, '0') : String(n)) }

  // ---------- 日付 ----------
  function dayNum (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000
  }
  // 日の番号 → 'YYYY-MM-DD'（グレゴリオ暦の計算。Date のオブジェクトを作らない）
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
  function jpDate (s) {
    var p = s.split('-')
    var w = ((dayNum(s) % 7) + 7 + 4) % 7 // 1970-01-01 は木曜
    return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日（' + WD[w] + '）'
  }
  function jpMonth (ym) { var p = ym.split('-'); return Number(p[0]) + '年' + Number(p[1]) + '月' }
  function prevMonth (ym) {
    var y = Number(ym.slice(0, 4)); var m = Number(ym.slice(5, 7)) - 1
    if (m === 0) { m = 12; y-- }
    return y + '-' + pad2(m)
  }

  // ---------- 決め方（§10。状態を引数で受ける純粋な関数） ----------
  // 合計 s・件数 n（n ≥ 1）から「平均を10倍して四捨五入した整数」（小数第2位で四捨五入、0.05 は切り上げ）
  function avg10 (s, n) { return Math.floor((20 * s + n) / (2 * n)) }
  // 件数 c・回答数 n から割合（整数％、0.5 は切り上げ）
  function pct (c, n) { return Math.floor((200 * c + n) / (2 * n)) }
  function fmt1 (q) { return Math.floor(q / 10) + '.' + (q % 10) }
  function fmtSigned (d) { return d > 0 ? '+' + d : d === 0 ? '0' : '−' + (-d) }
  function fmtDiff1 (dq) { return dq > 0 ? '▲' + fmt1(dq) : dq < 0 ? '▼' + fmt1(-dq) : '前の月と同じ' }
  function category (again) { return again >= 9 ? 'pro' : again >= 7 ? 'pas' : 'det' }
  function total (a) { return ITEMS.reduce(function (x, k) { return x + a[k] }, 0) }
  function byOld (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : idNum(a.id) - idNum(b.id) }
  function monthAnswers (st, ym) { return st.answers.filter(function (a) { return a.date.slice(0, 7) === ym }).sort(byOld) }
  function statsOf (rows) {
    var n = rows.length
    var o = { n: n, sum: {}, dist: {}, avg: {}, all: 0, avgAll: null, cnt: {}, pct: {}, d: null, low: null }
    ITEMS.forEach(function (k) {
      o.sum[k] = 0; o.dist[k] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      rows.forEach(function (a) { o.sum[k] += a[k]; o.dist[k][a[k]]++ })
      o.all += o.sum[k]
    })
    CATS.forEach(function (c) { o.cnt[c] = 0 })
    rows.forEach(function (a) { o.cnt[category(a.again)]++ })
    if (!n) return o
    ITEMS.forEach(function (k) { o.avg[k] = avg10(o.sum[k], n) })
    o.avgAll = avg10(o.all, n * 5)
    CATS.forEach(function (c) { o.pct[c] = pct(o.cnt[c], n) })
    o.d = o.pct.pro - o.pct.det
    // いちばん低い項目：丸めた平均が一番小さい項目。同じなら項目の順で先（§10-4）
    o.low = ITEMS.reduce(function (b, k) { return o.avg[k] < o.avg[b] ? k : b }, ITEMS[0])
    return o
  }
  function monthStats (st, ym) {
    var rows = monthAnswers(st, ym)
    var o = statsOf(rows)
    o.ym = ym
    o.slots = {}
    SLOTS.forEach(function (s) { o.slots[s] = statsOf(rows.filter(function (a) { return a.slot === s })) })
    return o
  }
  // 前の月から（§10-5）。前の月が0件なら prevN 0（画面は「前の月は回答なし」）。この月が0件なら回答数の差だけ
  function monthDiff (st, ym) {
    var cur = monthStats(st, ym); var pm = prevMonth(ym); var prev = monthStats(st, pm)
    var o = { prevYm: pm, prevN: prev.n, n: prev.n ? cur.n - prev.n : null, avg: {}, avgAll: null, pct: {}, d: null }
    if (!prev.n || !cur.n) { ITEMS.forEach(function (k) { o.avg[k] = null }); CATS.forEach(function (c) { o.pct[c] = null }); return o }
    ITEMS.forEach(function (k) { o.avg[k] = cur.avg[k] - prev.avg[k] })
    o.avgAll = cur.avgAll - prev.avgAll
    CATS.forEach(function (c) { o.pct[c] = cur.pct[c] - prev.pct[c] })
    o.d = cur.d - prev.d
    return o
  }
  // 前の月からの文字（印刷・読み上げ用）。kind：'avg'（10倍の整数）・'n'（件）・'pt'（ポイント）・'d'（差）
  function diffText (v, kind) {
    if (v === null) return '前の月は回答なし'
    if (v === 0) return '前の月と同じ'
    if (kind === 'avg') return fmtDiff1(v)
    var a = (v > 0 ? '▲' : '▼') + Math.abs(v).toLocaleString('ja-JP')
    return kind === 'n' ? a + '件' : kind === 'pt' ? a + 'ポイント' : a
  }
  // 声の並び（§10-6。新しい順の同じ日は回答番号の大きい順）
  function normQ (s) { return String(s).trim().normalize('NFKC').toLowerCase() }
  function byNew (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : idNum(b.id) - idNum(a.id) }
  function byLow (a, b) { return total(a) - total(b) || (a.date < b.date ? 1 : a.date > b.date ? -1 : idNum(a.id) - idNum(b.id)) }
  function voiceList (st, opts) {
    var inMonth = st.answers.filter(function (a) { return a.comment !== '' && (opts.ym === 'all' || a.date.slice(0, 7) === opts.ym) })
    var q = normQ(opts.q || '')
    var list = inMonth.filter(function (a) { return (!q || normQ(a.comment).indexOf(q) >= 0) && !(opts.todo && a.done) })
    list.sort(opts.sort === 'low' ? byLow : byNew)
    return { base: inMonth.length, todo: inMonth.filter(function (a) { return !a.done }).length, list: list }
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
  var PHONE_RE = /\d(?:[-‐−–ー()]*\d){9,}/
  // 使えない文字（制御文字・タブ・行／段落の区切り）。改行は読み取りの時に空白にする
  var CTRL_RE = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F-\u009F\u2028\u2029]/
  // ひとこと・社内メモ（§11-4・§11-5）。改行（CR・LF）は1つごとに半角の空白1つにし、前後の空白を取る
  function checkText (text, max) {
    var s = String(text).replace(/\r\n|\r|\n/g, ' ').trim()
    var n = Array.from(s).length
    if (n > max) return { e: 'long', n: n }
    var nf = s.normalize('NFKC')
    if (PHONE_RE.test(nf)) return { e: 'phone' }
    if (nf.indexOf('@') >= 0) return { e: 'at' }
    if (CTRL_RE.test(s)) return { e: 'ctrl' }
    return { v: s }
  }
  var DATE_MSG = {
    empty: 'ご来店日を入れてください', form: 'ご来店日は 2026-12-01 の形で、ある日付を入れてください',
    future: '未来の日付は入れられません（今日は 2026-12-01）', old: 'このデモでは 2026-10-01 から今日までの日付を入れてください'
  }
  function textMsg (r, name, max) {
    if (r.e === 'long') return name + 'は' + max + '字までにしてください（いま ' + r.n + '字）'
    if (r.e === 'phone') return '電話番号のような数字（10桁以上）は書けません。お名前・連絡先は書かないでください'
    if (r.e === 'at') return 'メールアドレスのような文字（@）は書けません。お名前・連絡先は書かないでください'
    return name + 'に使えない文字が入っています'
  }
  var MAX_MSG = '回答は1,000件までです。古い回答の整理は実際のお仕事でご相談ください'

  // ---------- 保存の検証（§12-2）。通れば新しい状態、外れれば null ----------
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  function intIn (v, a, b) { return typeof v === 'number' && Number.isInteger(v) && v >= a && v <= b }
  function sameKeys (o, list) {
    var ks = Object.keys(o)
    if (ks.length !== list.length) return false
    return list.every(function (k) { return own(o, k) }) && ks.every(function (k) { return list.indexOf(k) >= 0 })
  }
  function okDate (s) { return typeof s === 'string' && realDate(s) && s >= MIN_DATE && s <= TODAY }
  // 保存から読んだ文字：そのまま checkText を通して同じ文字に戻ること（trim 済み・改行や制御文字なし・字数・電話番号・@）
  function okText (s, max) { if (typeof s !== 'string') return false; var r = checkText(s, max); return !r.e && r.v === s }
  function validate (d) {
    if (!isObj(d) || !sameKeys(d, ['v', 'answers', 'seq'])) return null
    if (d.v !== 1) return null
    if (!intIn(d.seq, 1, 100000)) return null
    if (!Array.isArray(d.answers) || d.answers.length > MAX_ANS) return null
    var st = { answers: [], seq: d.seq }
    var ids = {}
    for (var i = 0; i < d.answers.length; i++) {
      var a = d.answers[i]
      if (!isObj(a) || !sameKeys(a, ANS_KEYS)) return null
      // 番号は決まった書き方だけ（A001・A1000。A0001 のように同じ数の別の書き方を通さない）
      if (typeof a.id !== 'string' || !/^A\d{3,4}$/.test(a.id) || a.id !== idOf(idNum(a.id)) || own(ids, a.id) || idNum(a.id) < 1 || idNum(a.id) >= d.seq) return null
      ids[a.id] = 1
      if (!okDate(a.date)) return null
      if (typeof a.slot !== 'string' || SLOTS.indexOf(a.slot) < 0) return null
      if (!ITEMS.every(function (k) { return intIn(a[k], 1, 5) })) return null
      if (!intIn(a.again, 0, 10)) return null
      if (!okText(a.comment, 120) || !okText(a.memo, 60)) return null
      if (typeof a.done !== 'boolean') return null
      st.answers.push({ id: a.id, date: a.date, slot: a.slot, taste: a.taste, speed: a.speed, service: a.service, comfort: a.comfort, price: a.price, again: a.again, comment: a.comment, done: a.done, memo: a.memo })
    }
    return st
  }
  function sample () {
    return {
      answers: SAMPLE.map(function (r) { return { id: r[0], date: r[1], slot: r[2], taste: r[3], speed: r[4], service: r[5], comfort: r[6], price: r[7], again: r[8], comment: r[9], done: r[10] === 1, memo: r[11] } }),
      seq: 61
    }
  }

  // ---------- CSV（§13） ----------
  function csvCell (v) {
    if (typeof v === 'number') return String(v)
    var s = String(v)
    if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  var CSV_COLS = [
    ['回答番号', 'A029 の形'], ['来店日', '2026-11-01 の形'], ['時間帯', '朝・昼・午後・夜'], ['味', '1〜5'], ['提供の速さ', '1〜5'], ['接客', '1〜5'], ['居心地', '1〜5'], ['価格', '1〜5'],
    ['また来たいか', '0〜10'], ['区分', '推奨（9〜10）・中立（7〜8）・批判（0〜6）'], ['ひとこと', '120字まで（無い時は空）'], ['対応済み', '済 か 空'], ['社内メモ', '60字まで（無い時は空）']
  ]
  function buildCsv (st, ym) {
    var lines = [CSV_COLS.map(function (c) { return c[0] }).join(',')]
    monthAnswers(st, ym).forEach(function (a) {
      lines.push([csvCell(a.id), csvCell(a.date), csvCell(SL[a.slot])].concat(ITEMS.map(function (k) { return csvCell(a[k]) }))
        .concat([csvCell(a.again), csvCell(CL[category(a.again)]), csvCell(a.comment), csvCell(a.done ? '済' : ''), csvCell(a.memo)]).join(','))
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
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, answers: S.answers, seq: S.seq }))
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
  function btn (cls, kids, id) {
    var b = el('button', cls)
    b.type = 'button'
    if (id) b.id = id
    add(b, kids)
    return b
  }
  function nw (text, cls) { return el('span', 'nw' + (cls ? ' ' + cls : ''), text) }
  function vh (text) { return el('span', 'visually-hidden', text) }
  function setText (e, kids) { e.textContent = ''; add(e, kids); return e }
  function shown (e) { return !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) }
  // 前の月からの値（▲▼ は読ませず、「上がって」「下がって」を読ませる。§18-2）
  function diffNode (v, kind) {
    if (v === null || v === 0) return nw(diffText(v, kind), 'diff-v')
    var t = diffText(v, kind)
    return add(el('span', 'nw diff-v'), [add(el('span'), t[0]), vh(v > 0 ? '上がって ' : '下がって '), t.slice(1)])
  }
  function diffLine (v, kind) { return [el('span', 'diff-l', '前の月から'), ' ', diffNode(v, kind)] }
  // 1つ目の子（▲）だけ aria-hidden にする
  function hideMarks (root) { Array.prototype.forEach.call(root.querySelectorAll('.diff-v > span:first-child:not(.visually-hidden)'), function (s) { s.setAttribute('aria-hidden', 'true') }) }

  // 折れてはいけない語（§16）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = ['喫茶 カサネド', '提供の速さ', '総合の平均', '前の月と同じ', '前の月は回答なし', '推奨と批判の差', 'まだ対応していません', 'まだ対応していない声', '対応済み', 'いちばん低い項目', '回答なし',
    'デモ（架空のお店）', 'デモの日付', '見本に戻す', 'CSV をダウンロード', '印刷・PDFで保存', '開店〜11時', '11〜14時', '14〜17時', '17時〜閉店', '居心地', '接客', '価格', '午後', '推奨', '中立', '批判', 'デモ', '架空']
    .sort(function (a, b) { return b.length - a.length })
  var NW_RE = new RegExp([
    '\\d{4}年\\d{1,2}月(?:\\d{1,2}日(?:（[日月火水木金土]）)?)?', '\\d{4}-\\d{2}-\\d{2}', 'A\\d{3,4}', '合計 \\d+／25', 'また来たい \\d+',
    '[▲▼]?[+−]?\\d[\\d,.]*(?:件|%|ポイント|字|か所)(?:（[\\d,]+件）)?', '[+−]\\d+'
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
        if (!p || p.closest('.nw, svg, script, style, title, pre, .visually-hidden, label, option, select, textarea, thead, #sr-status, .voice__text, .voice__memo-t')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var list = []; var n
    while ((n = tw.nextNode())) list.push(n)
    list.forEach(wrapText)
    return root
  }
  // 状態の札（§1-4）。見える文字がそのまま読まれる（aria-label を付けない）
  var TAG = { pro: ['推奨', 'i-up'], pas: ['中立', 'i-flat'], det: ['批判', 'i-down'], done: ['対応済み', 'i-check'], todo: ['まだ対応していません', null], low: ['いちばん低い項目', 'i-low'] }
  function stateTag (k) {
    var t = el('span', 'state-tag state-tag--' + k)
    if (TAG[k][1]) t.appendChild(icon(TAG[k][1], 14))
    t.appendChild(document.createTextNode(TAG[k][0]))
    return t
  }

  // ---------- 知らせ（live 領域は #sr-status の1つだけ。§18-3） ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  var qTimer = null
  function announce (msg, wait) {
    var sr = $('sr-status')
    // 新しい知らせが出たら、絞り込みの待ちの読み上げ（400ms 後）は取りやめる（古い件数を後から読ませない）
    window.clearTimeout(qTimer)
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
      // dialog が使えないブラウザでは、ブラウザの確認窓で確かめる（確認なしで戻さない）
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
  var ui = { tab: 'answer', view: 'form', lastAdded: null, doneId: null, doneYm: null, sumYm: null, expYm: null, vYm: 'all', q: '', sort: 'new', todo: false }

  // ---------- タブ ----------
  var TABS = ['answer', 'sum', 'voice', 'export']
  var PANEL_H = { answer: 'answer-h', sum: 'sum-h', voice: 'voice-h', export: 'export-h' }
  function openTab (name, opt) {
    if (name === 'export' && ui.tab !== 'export') ui.expYm = ui.sumYm
    if (name === 'answer' && ui.view === 'done' && !lastAdded()) { ui.view = 'form' }
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
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      var n = a.getAttribute('data-step')
      load()
      openTab(n, { noScroll: true })
      $('panel-' + n).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      $(PANEL_H[n]).focus({ preventScroll: true })
    })
  })

  // ---------- 答える画面のフォーム（§6-2。最初に1回だけ作る） ----------
  var GROUPS = ITEMS.concat(['again'])
  var GL = Object.assign({ again: 'また来たいと思いますか' }, IL)
  function buildScoreSets () {
    var box = $('score-sets')
    GROUPS.forEach(function (k) {
      var again = k === 'again'
      var fs = el('fieldset', 'score-set'); fs.id = 'fs-' + k
      fs.setAttribute('aria-describedby', k + '-ends err-' + k)
      var row = el('div', 'score-row' + (again ? ' score-row--again' : ''))
      var vals = again ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5]
      vals.forEach(function (v) {
        var lb = el('label', 'score-pick' + (again ? ' again-pick' : '')); lb.id = 'pk-' + k + '-' + v
        var inp = el('input'); inp.type = 'radio'; inp.name = k; inp.value = String(v); inp.id = k + '-' + v
        add(lb, [inp, icon('i-okc', 12, 'score-pick__ic'), String(v)])
        row.appendChild(lb)
      })
      var ends = el('p', 'scale-ends'); ends.id = k + '-ends'
      add(ends, again ? [el('span', null, '0＝まったく思わない'), el('span', null, '10＝とても思う')] : [el('span', null, '1＝不満'), el('span', null, '5＝満足')])
      var err = el('p', 'field__err'); err.id = 'err-' + k; err.hidden = true
      add(fs, [el('legend', 'q-legend', GL[k]), row, ends, err])
      box.appendChild(fs)
    })
  }
  buildScoreSets()
  function checkedVal (name) { var c = document.querySelector('#answer-form input[name="' + name + '"]:checked'); return c ? c.value : null }
  function syncPicks () {
    Array.prototype.forEach.call(document.querySelectorAll('#answer-form .pick-btn, #answer-form .score-pick'), function (lb) {
      var inp = lb.querySelector('input'); lb.classList.toggle('is-on', inp.checked)
    })
  }
  // 誤りの文（入力値は引用しない。§11）
  function showErrP (errId, msg) {
    var p = $(errId)
    setText(p, [icon('i-err', 16, 'field__err-ic'), el('span', 'field__err-msg', msg)])
    p.hidden = false
  }
  function hideErrP (errId) { var p = $(errId); p.hidden = true; p.textContent = '' }
  // key → [誤りの文の id、aria-invalid を付ける欄、フォーカスする欄]
  var FORM_ERR = { date: ['err-a-date', 'a-date'], slot: ['err-slot', 'slot-morning'], comment: ['err-a-comment', 'a-comment'] }
  GROUPS.forEach(function (k) { FORM_ERR[k] = ['err-' + k, k + '-' + (k === 'again' ? 0 : 1)] })
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
  function clearAllFormErr () { Object.keys(FORM_ERR).forEach(clearFormErr); hideErrP('err-form') }
  function dateErr () { var r = parseDate($('a-date').value); return r.e ? DATE_MSG[r.e] : null }
  function commentErr () { var r = checkText($('a-comment').value, 120); return r.e ? textMsg(r, 'ひとこと', 120) : null }
  function updateCount () { $('a-comment-count').textContent = Array.from($('a-comment').value).length + '／120字' }
  function resetForm () {
    clearAllFormErr()
    $('answer-form').reset()
    $('a-date').value = TODAY
    syncPicks(); updateCount()
  }
  $('answer-form').addEventListener('change', function (e) {
    var t = e.target
    if (t.type === 'radio') { clearFormErr(t.name); syncPicks() }
  })
  $('answer-form').addEventListener('keydown', function (e) {
    var t = e.target
    if (t.type !== 'radio' || (e.key !== 'Home' && e.key !== 'End')) return
    var g = document.querySelectorAll('#answer-form input[name="' + t.name + '"]')
    var r = g[e.key === 'Home' ? 0 : g.length - 1]
    e.preventDefault()
    r.checked = true; r.focus()
    r.dispatchEvent(new Event('change', { bubbles: true }))
  })
  $('a-date').addEventListener('input', function () { if (own(formErr, 'date') && dateErr() === null) clearFormErr('date') })
  $('a-comment').addEventListener('input', function () { updateCount(); if (own(formErr, 'comment') && commentErr() === null) clearFormErr('comment') })

  function nextId () {
    if (S.seq <= 9999) { var id = idOf(S.seq); S.seq = S.seq + 1; return id }
    // 番号が 4桁を超えた時は、使っていない一番小さい番号（回答は1,000件までなので必ず空きがある）
    var used = {}; S.answers.forEach(function (a) { used[idNum(a.id)] = 1 })
    for (var n = 1; n <= 9999; n++) if (!used[n]) return idOf(n)
    return null
  }
  $('answer-form').addEventListener('submit', function (e) {
    e.preventDefault()
    load()
    clearAllFormErr()
    var errs = [] // [key, 文]
    var de = dateErr(); if (de) errs.push(['date', de])
    if (!checkedVal('slot')) errs.push(['slot', 'ご来店の時間帯を選んでください'])
    ITEMS.forEach(function (k) { if (!checkedVal(k)) errs.push([k, '「' + IL[k] + '」を 1〜5 から選んでください']) })
    if (checkedVal('again') === null) errs.push(['again', '「また来たいと思いますか」を 0〜10 から選んでください'])
    var ce = commentErr(); if (ce) errs.push(['comment', ce])
    if (errs.length) {
      errs.forEach(function (x) { setFormErr(x[0], x[1]) })
      $(FORM_ERR[errs[0][0]][1]).focus()
      announce('回答できませんでした。直すところが ' + errs.length + 'か所あります')
      return
    }
    if (S.answers.length >= MAX_ANS) {
      showErrP('err-form', MAX_MSG)
      announce(MAX_MSG)
      return
    }
    var a = { id: nextId(), date: parseDate($('a-date').value).v, slot: checkedVal('slot') }
    ITEMS.forEach(function (k) { a[k] = Number(checkedVal(k)) })
    a.again = Number(checkedVal('again'))
    a.comment = checkText($('a-comment').value, 120).v
    a.done = false
    a.memo = ''
    S.answers.push(a)
    save()
    // 番号だけでなく来店日・時間帯も持つ（別のタブで見本に戻して同じ番号が使われた時に、別の回答を消さない）
    ui.lastAdded = { id: a.id, date: a.date, slot: a.slot }
    ui.view = 'done'; ui.doneId = a.id; ui.doneYm = a.date.slice(0, 7)
    resetForm()
    renderAll()
    announce('回答を受け付けました（' + a.id + '）。' + jpMonth(ui.doneYm) + 'の集計に入りました')
    $('thanks-h').focus()
  })
  // 直前の1件（id・来店日・時間帯の3つが合う回答がある時だけ）
  function lastAdded () {
    var la = ui.lastAdded
    if (!la || !S) return null
    var r = S.answers.filter(function (x) { return x.id === la.id && x.date === la.date && x.slot === la.slot })
    return r.length ? r[0] : null
  }
  function backToForm () {
    ui.view = 'form'
    resetForm()
    renderAll()
    $('a-date').focus()
  }
  $('undo-btn').addEventListener('click', function () {
    load()
    var r = lastAdded()
    ui.lastAdded = null
    if (!r) { backToForm(); announce('この回答はもうありません'); return }
    S.answers = S.answers.filter(function (x) { return x.id !== r.id })
    save()
    backToForm()
    showToast('回答を取り消しました', '回答 ' + r.id + ' を取り消しました')
  })
  $('btn-again').addEventListener('click', function () { load(); ui.lastAdded = null; backToForm() })
  $('btn-go-sum').addEventListener('click', function () {
    load()
    ui.sumYm = ui.doneYm || ui.sumYm
    openTab('sum', { noScroll: true })
    $('panel-sum').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    $('sum-h').focus({ preventScroll: true })
  })
  function renderAnswer () {
    if (ui.view === 'done' && !ui.doneId) ui.view = 'form'
    $('answer-form').hidden = ui.view !== 'form'
    $('answer-done').hidden = ui.view !== 'done'
    if (ui.view !== 'done') { $('undo-btn').hidden = true; return }
    setText($('thanks-note'), ['デモ：回答番号 ', nw(ui.doneId), ' として、この端末の ', nw(jpMonth(ui.doneYm)), 'の集計に入りました（送信はしていません）'])
    $('undo-btn').hidden = !lastAdded()
  }

  // ---------- 月の選択 ----------
  function hasMonth (ym) { return S.answers.some(function (a) { return a.date.slice(0, 7) === ym }) }
  function defaultSumYm () { for (var i = 0; i < MONTHS.length; i++) if (hasMonth(MONTHS[i])) return MONTHS[i]; return MONTHS[0] }
  function fillSelect (sel, opts) {
    if (sel.options.length) return
    opts.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op) })
  }
  var MONTH_OPTS = MONTHS.map(function (m) { return [m, jpMonth(m)] })

  // ---------- 月の集計（§7） ----------
  function sumMsg (ms) {
    if (!ms.n) return jpMonth(ms.ym) + '。回答はありません'
    return jpMonth(ms.ym) + '。回答 ' + ms.n.toLocaleString('ja-JP') + '件、総合 ' + fmt1(ms.avgAll) + '、推奨と批判の差 ' + fmtSigned(ms.d)
  }
  function bar (c, n) {
    var b = el('span', 'bar'); b.setAttribute('aria-hidden', 'true')
    var f = el('span', 'bar__fill'); f.style.width = (n ? c * 100 / n : 0) + '%'
    b.appendChild(f)
    return b
  }
  function renderSum () {
    if (!ui.sumYm || MONTHS.indexOf(ui.sumYm) < 0) ui.sumYm = defaultSumYm()
    var sel = $('sum-month'); fillSelect(sel, MONTH_OPTS); sel.value = ui.sumYm
    var ms = monthStats(S, ui.sumYm); var df = monthDiff(S, ui.sumYm)
    var la = lastAdded()
    var rc = $('sum-recent')
    if (la && la.date.slice(0, 7) === ui.sumYm) { setText(rc, ['直前の回答（', nw(la.id), '）が入っています']); rc.hidden = false } else rc.hidden = true
    $('st-n').textContent = ms.n.toLocaleString('ja-JP')
    setText($('st-n-diff'), diffLine(df.n, 'n'))
    $('st-avg').textContent = ms.n ? fmt1(ms.avgAll) : '回答なし'
    $('st-d').textContent = ms.n ? fmtSigned(ms.d) : '回答なし'
    $('st-avg-diff').hidden = !ms.n; $('st-d-diff').hidden = !ms.n
    setText($('st-avg-diff'), ms.n ? diffLine(df.avgAll, 'avg') : null)
    setText($('st-d-diff'), ms.n ? diffLine(df.d, 'd') : null)
    var low = $('st-low')
    low.hidden = !ms.n
    setText(low, ms.n ? [icon('i-low', 18), add(el('span'), ['いちばん低い項目：', nw(IL[ms.low] + ' ' + fmt1(ms.avg[ms.low])), '（5項目の平均のうち）'])] : null)
    $('sum-none').hidden = ms.n > 0
    $('sum-items').hidden = !ms.n; $('sum-two').hidden = !ms.n
    var grid = $('item-grid'); grid.textContent = ''
    var nps = $('nps-list'); nps.textContent = ''
    var tb = $('slot-tbody'); tb.textContent = ''
    var cards = $('slot-cards'); cards.textContent = ''
    $('slot-cap').textContent = jpMonth(ui.sumYm) + ' 時間帯ごとの平均'
    if (ms.n) {
      ITEMS.forEach(function (k) {
        var isLow = k === ms.low
        var art = el('article', 'item-card' + (isLow ? ' item-card--low' : '')); art.setAttribute('data-k', k)
        var ul = el('ul', 'dist')
        ;[5, 4, 3, 2, 1].forEach(function (v) {
          var c = ms.dist[k][v]
          add(ul, add(el('li', 'dist-row'), [add(el('span', 'dist-row__v'), [String(v), vh('点')]), bar(c, ms.n), nw(c.toLocaleString('ja-JP') + '件', 'dist-row__n')]))
        })
        add(art, [
          add(el('div', 'item-card__r1'), [el('h4', 'item-card__name nw', IL[k]), isLow ? stateTag('low') : null, el('span', 'item-card__avg nw', fmt1(ms.avg[k]))]),
          add(el('p', 'item-card__diff'), diffLine(df.avg[k], 'avg')),
          ul
        ])
        grid.appendChild(art)
      })
      CATS.forEach(function (c) {
        add(nps, add(el('li', 'nps-row'), [add(el('span'), stateTag(c)), bar(ms.cnt[c], ms.n), nw(ms.pct[c] + '%（' + ms.cnt[c].toLocaleString('ja-JP') + '件）', 'nps-row__p'),
          add(el('span', 'nps-row__diff'), ['前の月から ', diffNode(df.pct[c], 'pt')])]))
      })
      setText($('nps-diff'), ['推奨と批判の差 ', nw(fmtSigned(ms.d)), '（', nw(ms.pct.pro + '%'), ' − ', nw(ms.pct.det + '%'), '）'])
      SLOTS.forEach(function (s) {
        var o = ms.slots[s]
        var th = el('th', 'c-slot'); th.setAttribute('scope', 'row')
        add(th, [nw(SL[s]), el('span', 'cell-2 nw', o.n ? SR[s] : '回答なし')])
        var tr = add(el('tr'), [th, el('td', 'num nw', o.n.toLocaleString('ja-JP') + '件')])
        ITEMS.forEach(function (k) { tr.appendChild(el('td', 'num', o.n ? fmt1(o.avg[k]) : '—')) })
        tr.appendChild(el('td', 'num', o.n ? fmt1(o.avgAll) : '—'))
        tr.setAttribute('data-slot', s)
        tb.appendChild(tr)
        var li = el('li', 'slot-card'); li.setAttribute('data-slot', s)
        li.appendChild(add(el('p', 'slot-card__h'), [nw(SL[s] + '（' + SR[s] + '）'), nw(o.n.toLocaleString('ja-JP') + '件')]))
        if (!o.n) li.appendChild(el('p', 'slot-card__none', '回答なし'))
        else {
          var dl = el('dl')
          ITEMS.concat(['all']).forEach(function (k) {
            add(dl, add(el('div'), [el('dt', 'nw', k === 'all' ? '総合' : IL[k]), el('dd', null, fmt1(k === 'all' ? o.avgAll : o.avg[k]))]))
          })
          li.appendChild(dl)
        }
        cards.appendChild(li)
      })
    }
    hideMarks($('panel-sum'))
    wrapWords($('panel-sum'))
  }
  $('sum-month').addEventListener('change', function () {
    load()
    ui.sumYm = $('sum-month').value
    renderAll()
    announce(sumMsg(monthStats(S, ui.sumYm)))
  })

  // ---------- お客様の声（§8） ----------
  var cardCache = {}
  function cardKey (a) { return [a.id, a.date, a.slot, a.comment, a.again].concat(ITEMS.map(function (k) { return a[k] })).join('|') }
  function buildVoice (a) {
    var id = a.id
    var art = el('article', 'voice'); art.setAttribute('aria-labelledby', 'v-' + id + '-h'); art.setAttribute('data-id', id)
    var h = el('h3', 'voice__h'); h.id = 'v-' + id + '-h'
    add(h, [nw(a.date + '（' + SL[a.slot] + '）'), ' ', nw(id, 'voice__id')])
    var cb = el('input'); cb.type = 'checkbox'; cb.id = 'done-' + id
    var lb = el('label', 'pick-btn pick-btn--check voice__done'); lb.id = 'pk-done-' + id
    add(lb, [cb, icon('i-okc', 16, 'pick-btn__ic'), '対応済み'])
    cb.addEventListener('change', function () { markDone(id, cb.checked) })
    var memoL = el('label', 'field__label', '社内メモ（60字まで）'); memoL.setAttribute('for', 'memo-' + id)
    var mi = el('input', 'input'); mi.id = 'memo-' + id; mi.type = 'text'; mi.maxLength = 80; mi.autocomplete = 'off'; mi.setAttribute('aria-describedby', 'err-memo-' + id)
    mi.value = a.memo
    mi.addEventListener('input', function () { if (mi.hasAttribute('aria-invalid') && !checkText(mi.value, 60).e) { mi.removeAttribute('aria-invalid'); hideErrP('err-memo-' + id) } })
    var sb = btn('btn-sub', 'メモを保存', 'memo-save-' + id); sb.setAttribute('aria-label', 'メモを保存 ' + id)
    sb.addEventListener('click', function () { saveMemo(id) })
    var err = el('p', 'field__err'); err.id = 'err-memo-' + id; err.hidden = true
    var scores = ITEMS.map(function (k) { return IL[k] + a[k] }).join('・')
    add(art, [
      add(el('div', 'voice__head'), [h, stateTag(category(a.again))]),
      el('p', 'voice__text', a.comment),
      el('p', 'voice__scores', scores),
      add(el('p', 'voice__sum'), [nw('合計 ' + total(a) + '／25'), '・', nw('また来たい ' + a.again)]),
      add(el('div', 'voice__state'), [el('span', 'voice__tag'), lb]),
      add(el('p', 'voice__memo'), [el('span', 'voice__memo-l', '社内メモ'), el('span', 'voice__memo-t')]),
      add(el('div', 'field memo-field'), [memoL, add(el('div', 'memo-row'), [mi, sb]), err])
    ])
    art.setAttribute('data-memo', a.memo)
    return { el: art, key: cardKey(a) }
  }
  function updateVoice (c, a) {
    var art = c.el
    art.classList.toggle('voice--low', !a.done && total(a) <= 15)
    setText(art.querySelector('.voice__tag'), stateTag(a.done ? 'done' : 'todo'))
    var cb = art.querySelector('input[type=checkbox]'); cb.checked = a.done
    art.querySelector('.voice__done').classList.toggle('is-on', a.done)
    var mp = art.querySelector('.voice__memo'); mp.hidden = a.memo === ''
    mp.querySelector('.voice__memo-t').textContent = a.memo
    var mi = art.querySelector('.memo-field .input')
    // 保存したメモが変わった時だけ欄を書き換える（打ちかけの文字・フォーカスを守る）
    if (art.getAttribute('data-memo') !== a.memo) {
      if (document.activeElement !== mi) mi.value = a.memo
      art.setAttribute('data-memo', a.memo)
    }
  }
  function voiceOpts () { return { ym: ui.vYm, q: ui.q, sort: ui.sort, todo: ui.todo } }
  function renderVoice () {
    var sel = $('voice-month'); fillSelect(sel, [['all', 'すべての月']].concat(MONTH_OPTS)); sel.value = ui.vYm
    $('sort-new').checked = ui.sort === 'new'; $('sort-low').checked = ui.sort === 'low'; $('voice-todo').checked = ui.todo
    $('pk-sort-new').classList.toggle('is-on', ui.sort === 'new'); $('pk-sort-low').classList.toggle('is-on', ui.sort === 'low'); $('pk-todo').classList.toggle('is-on', ui.todo)
    var vl = voiceList(S, voiceOpts())
    setText($('voice-count'), [nw(vl.base.toLocaleString('ja-JP') + '件'), 'のうち ', nw(vl.list.length.toLocaleString('ja-JP') + '件'), 'を表示（', nw('まだ対応していない声'), ' ', nw(vl.todo.toLocaleString('ja-JP') + '件'), '）'])
    $('voice-none').hidden = vl.list.length > 0
    var box = $('voice-list')
    var want = vl.list.map(function (a) {
      var c = cardCache[a.id]
      if (!c || c.key !== cardKey(a)) { c = buildVoice(a); cardCache[a.id] = c }
      updateVoice(c, a)
      return c.el
    })
    var cur = Array.prototype.slice.call(box.children)
    var same = cur.length === want.length && cur.every(function (e, i) { return e === want[i] })
    if (!same) {
      // 並びが変わった時だけ入れ替える（並びが同じならフォーカスのある欄を動かさない）
      cur.forEach(function (e) { if (want.indexOf(e) < 0) box.removeChild(e) })
      want.forEach(function (e, i) { if (box.children[i] !== e) box.insertBefore(e, box.children[i] || null) })
    }
  }
  function voiceMsg () { var n = voiceList(S, voiceOpts()).list.length; return n ? n.toLocaleString('ja-JP') + '件 表示しています' : '当てはまる声はありません' }
  $('voice-q').addEventListener('input', function () {
    load()
    ui.q = $('voice-q').value
    renderAll()
    window.clearTimeout(qTimer)
    qTimer = window.setTimeout(function () { qTimer = null; announce(voiceMsg(), 0) }, 400)
  })
  $('voice-month').addEventListener('change', function () { load(); ui.vYm = $('voice-month').value; renderAll(); announce(voiceMsg()) })
  ;['sort-new', 'sort-low'].forEach(function (id) {
    $(id).addEventListener('change', function () { load(); ui.sort = $(id).value; renderAll(); announce(voiceMsg()) })
  })
  $('voice-todo').addEventListener('change', function () { load(); ui.todo = $('voice-todo').checked; renderAll(); announce(voiceMsg()) })
  function findAns (id) { var r = S.answers.filter(function (a) { return a.id === id }); return r.length ? r[0] : null }
  function markDone (id, on) {
    var before = voiceList(S, voiceOpts()).list.map(function (a) { return a.id })
    load()
    var a = findAns(id)
    if (!a) { renderAll(); announce('この回答はもうありません'); $('voice-h').focus(); return }
    a.done = on
    save()
    renderAll()
    var vl = voiceList(S, voiceOpts())
    announce(on ? id + ' を対応済みにしました。まだ対応していない声 ' + vl.todo + '件' : id + ' の対応済みを外しました。まだ対応していない声 ' + vl.todo + '件')
    var ids = vl.list.map(function (x) { return x.id })
    if (ids.indexOf(id) >= 0) { $('done-' + id).focus(); return }
    // 一覧から消えた時は次のカードの「対応済み」へ。無ければ h2
    var next = before.slice(before.indexOf(id) + 1).filter(function (x) { return ids.indexOf(x) >= 0 })[0]
    if (next && shown($('done-' + next))) $('done-' + next).focus()
    else $('voice-h').focus()
  }
  function saveMemo (id) {
    var mi = $('memo-' + id)
    var r = checkText(mi.value, 60)
    if (r.e) {
      var msg = textMsg(r, '社内メモ', 60)
      showErrP('err-memo-' + id, msg)
      mi.setAttribute('aria-invalid', 'true')
      mi.focus()
      announce('社内メモを保存できませんでした。' + msg)
      return
    }
    load()
    var a = findAns(id)
    if (!a) { renderAll(); announce('この回答はもうありません'); return }
    hideErrP('err-memo-' + id); mi.removeAttribute('aria-invalid')
    a.memo = r.v
    save()
    mi.value = r.v
    renderAll()
    showToast('メモを保存しました')
  }

  // ---------- CSV・印刷（§9） ----------
  function setDisabled (b, off, descId) {
    if (off) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', descId) } else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby') }
    $(descId).hidden = !off
  }
  function csvName () { return 'kasanedo_survey_' + ui.expYm + '.csv' }
  function renderExport () {
    if (!ui.expYm) ui.expYm = ui.sumYm
    var sel = $('export-month'); fillSelect(sel, MONTH_OPTS); sel.value = ui.expYm
    var n = monthAnswers(S, ui.expYm).length
    setDisabled($('btn-csv'), !n, 'csv-none')
    setDisabled($('btn-print'), !n, 'print-none')
    setText($('csv-name'), ['ファイル名：', nw(csvName()), nw('（' + n.toLocaleString('ja-JP') + '件）')])
    $('csv-peek').textContent = buildCsv(S, ui.expYm).slice(1).split('\r\n').filter(function (l) { return l !== '' }).slice(0, 4).join('\n')
  }
  $('export-month').addEventListener('change', function () { load(); ui.expYm = $('export-month').value; renderAll() })
  function renderCols () {
    var tb = $('csv-cols'); tb.textContent = ''
    CSV_COLS.forEach(function (c, i) { add(tb, add(el('tr'), [el('td', null, String(i + 1)), el('td', 'nw', c[0]), el('td', null, c[1])])) })
  }
  $('btn-csv').addEventListener('click', function () {
    load()
    var n = monthAnswers(S, ui.expYm).length
    if (!n) { announce('この月の回答はありません'); return }
    var blob = new Blob([buildCsv(S, ui.expYm)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url; a.download = csvName()
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    showToast('CSV を作りました（' + jpMonth(ui.expYm) + '・' + n.toLocaleString('ja-JP') + '件）')
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
  function sheetTable (cols, rows, cls) {
    var cg = el('colgroup')
    cols.forEach(function (c) { var col = el('col'); if (c[1]) col.style.width = c[1] + 'mm'; cg.appendChild(col) })
    var thead = add(el('thead'), add(el('tr'), cols.map(function (c) { var t = el('th', c[2] ? 'num' : null, c[0]); t.setAttribute('scope', 'col'); return t })))
    var tbody = el('tbody')
    rows.forEach(function (r) {
      tbody.appendChild(add(el('tr'), r.map(function (v, i) {
        var e = el(i === 0 ? 'th' : 'td', cols[i][2] ? 'num' : cols[i][3] ? 'wrap' : null, String(v))
        if (i === 0) e.setAttribute('scope', 'row')
        return e
      })))
    })
    return add(el('table', cls), [cg, thead, tbody])
  }
  var PRINT_ITEM_COLS = [['項目', 30], ['平均', 16, 1], ['前の月から', 36], ['5点', 20, 1], ['4点', 20, 1], ['3点', 20, 1], ['2点', 20, 1], ['1点', 0, 1]]
  var PRINT_SLOT_COLS = [['時間帯', 34], ['回答数', 20, 1], ['味', 20, 1], ['提供の速さ', 24, 1], ['接客', 20, 1], ['居心地', 20, 1], ['価格', 20, 1], ['総合', 0, 1]]
  var PRINT_VOICE_COLS = [['来店日', 15], ['時間帯', 13], ['番号', 15], ['合計', 17, 1], ['また来たい', 19, 1], ['ひとこと', 0, 0, 1]]
  function buildSheet () {
    var ym = ui.expYm
    var ms = monthStats(S, ym); var df = monthDiff(S, ym)
    var shop = el('p', 'sheet__shop', SHOP + '　' + jpMonth(ym) + 'のアンケート集計')
    shop.appendChild(stampSvg())
    var sumLine = '回答 ' + ms.n.toLocaleString('ja-JP') + '件（' + (df.n === null ? '前の月は回答なし' : '前の月から ' + diffText(df.n, 'n')) + '）／総合 ' + fmt1(ms.avgAll) + '（' + diffText(df.avgAll, 'avg') + '）／' +
      '推奨と批判の差 ' + fmtSigned(ms.d) + '（' + diffText(df.d, 'd') + '）／いちばん低い項目 ' + IL[ms.low] + ' ' + fmt1(ms.avg[ms.low])
    var items = ITEMS.map(function (k) { return [IL[k], fmt1(ms.avg[k]), diffText(df.avg[k], 'avg')].concat([5, 4, 3, 2, 1].map(function (v) { return ms.dist[k][v] })) })
    var slots = SLOTS.map(function (s) {
      var o = ms.slots[s]
      return [SL[s] + '（' + SR[s] + '）', o.n + '件'].concat(ITEMS.map(function (k) { return o.n ? fmt1(o.avg[k]) : '—' })).concat([o.n ? fmt1(o.avgAll) : '—'])
    })
    var lows = voiceList(S, { ym: ym, q: '', sort: 'low', todo: false }).list.slice(0, 5)
    var vrows = lows.map(function (a) { return [a.date.slice(5), SL[a.slot], a.id, total(a) + '／25', String(a.again), a.comment + (a.done ? '（対応済み）' : '')] })
    return add(el('div', 'sheet'), [
      add(el('div', 'sheet__head'), shop),
      el('p', 'sheet__cond', '今日 ' + TODAY + '（デモの日付）で作成'),
      el('p', 'sheet__sum', sumLine),
      el('p', 'sheet__h', '5つの項目（平均と、点ごとの件数）'),
      sheetTable(PRINT_ITEM_COLS, items, 'sheet__items'),
      el('p', 'sheet__nps', 'また来たいと思うか：' + CATS.map(function (c) { return CL[c] + ' ' + ms.pct[c] + '%（' + ms.cnt[c] + '件）' }).join('・')),
      el('p', 'sheet__h', '時間帯ごとの平均'),
      sheetTable(PRINT_SLOT_COLS, slots, 'sheet__slots'),
      el('p', 'sheet__h', '点数の低い声（' + lows.length + '件）'),
      lows.length ? sheetTable(PRINT_VOICE_COLS, vrows, 'sheet__voices') : el('p', null, 'ひとことのある回答はありません'),
      el('p', 'sheet__foot', 'デモ（架空のお店）です。回答はすべて架空です。TENKA LAB の制作見本です。')
    ])
  }
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  function fillPrint () { load(); elPrintRoot.textContent = ''; if (monthAnswers(S, ui.expYm).length) elPrintRoot.appendChild(buildSheet()) }
  $('btn-print').addEventListener('click', function () {
    load()
    if (!monthAnswers(S, ui.expYm).length) { announce('この月の回答はありません'); return }
    fillPrint()
    document.title = 'kasanedo_survey_' + ui.expYm
    window.print()
  })
  window.addEventListener('beforeprint', function () {
    if (!elPrintRoot.firstChild) fillPrint()
    document.title = 'kasanedo_survey_' + ui.expYm
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  function renderToday () { $('today-main').textContent = '今日 ' + jpDate(TODAY) }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    renderToday()
    renderAnswer()
    renderSum()
    renderVoice()
    renderExport()
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }

  // ---------- 見本に戻す（§12-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox().then(function (yes) {
      if (!yes) return
      S = sample()
      save()
      ui.lastAdded = null; ui.view = 'form'; ui.doneId = null; ui.doneYm = null
      ui.sumYm = defaultSumYm(); ui.expYm = ui.sumYm; ui.vYm = 'all'; ui.q = ''; ui.sort = 'new'; ui.todo = false
      $('voice-q').value = ''
      cardCache = {}; $('voice-list').textContent = ''
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
    // 別の画面で変わった時は、直前の1件を取り消せなくする（別の回答を消さないため）
    ui.lastAdded = null
    renderAll()
    announce('別の画面で回答が変わりました')
  })

  // ---------- はじめ ----------
  load()
  if (!canSave) $('note-nosave').hidden = false
  ui.sumYm = defaultSumYm()
  renderCols()
  resetForm()
  wrapWords(document.body)
  openTab(ui.tab, { noScroll: true })

  // 検査用（状態を引数で受ける純粋な関数だけ。画面の状態は出さない）
  window.__demo21 = { avg10: avg10, pct: pct, fmt1: fmt1, fmtSigned: fmtSigned, fmtDiff1: fmtDiff1, monthStats: monthStats, monthDiff: monthDiff, voiceList: voiceList, category: category, parseDate: parseDate, checkText: checkText, validate: validate, csvCell: csvCell, buildCsv: buildCsv, sample: sample, prevMonth: prevMonth, TODAY: TODAY }
})()
