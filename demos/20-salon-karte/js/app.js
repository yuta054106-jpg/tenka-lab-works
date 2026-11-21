// 美容室 ソヨギ（デモ）顧客カルテと再来店のお声がけ
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 日付は 'YYYY-MM-DD' の文字で持ち、日の番号（Date.UTC ÷ 1日）の整数で計算する。現在時刻・乱数は使わない（design.md §10-1）
// 金額は税込の整数円。足し算だけ（§10-5）
// フォームの欄は最初に1回だけ作り（index.html）、描き直しでは一覧・カルテ・数字の所だけ書き換える（§12-3）
(function () {
  'use strict'

  // ---------- 定数（design.md §12-1・§20） ----------
  var KEY = 'tenkaLab.demo20.salonKarte.v1'
  var TEST_KEY = 'tenkaLab.demo20.test'
  var SHOP = '美容室 ソヨギ'
  var TODAY = '2026-12-01'
  var MIN_DATE = '2024-01-01'
  var MAX_REC = 500
  var MAX_YEN = 100000
  var MK = ['cut', 'color', 'perm', 'tr']
  var TH_K = ['cut', 'color', 'perm']
  var ML = { cut: 'カット', color: 'カラー', perm: 'パーマ', tr: 'トリートメント' }
  var PRICE = { cut: 5500, color: 7700, perm: 8800, tr: 3300 }
  var DEF_TH = { cut: 45, color: 40, perm: 90 }
  var STAFF_K = ['nagi', 'saku']
  var SN = { nagi: 'ナギ', saku: 'サク' }
  var CUST = [['C-001', 'アオイ'], ['C-002', 'ハルノ'], ['C-003', 'ミオ'], ['C-004', 'カエデ'], ['C-005', 'ツムギ'],
    ['C-006', 'ヒナタ'], ['C-007', 'リツ'], ['C-008', 'シオン'], ['C-009', 'ユズ'], ['C-010', 'ナツメ']].map(function (a) { return { id: a[0], name: a[1] } })
  var CUST_IDS = CUST.map(function (c) { return c.id })
  var CN = {}; CUST.forEach(function (c) { CN[c.id] = c.name })
  // 見本の来店記録 30件（§20-3。お客様・記録はすべて架空）
  var SAMPLE_REC = [
    ['R01', '2026-05-10', 'C-004', { cut: 5500, color: 7700 }, 'nagi', 'BR-6', '初めてのご来店。肩につく長さに'],
    ['R02', '2026-05-12', 'C-009', { cut: 5500, perm: 8800 }, 'saku', '', '毛先に軽いカール'],
    ['R03', '2026-06-04', 'C-006', { cut: 5500, perm: 8800 }, 'saku', '', 'ゆるめのパーマを希望'],
    ['R04', '2026-06-20', 'C-002', { cut: 5500 }, 'nagi', '', '襟足は短め'],
    ['R05', '2026-06-30', 'C-009', { cut: 5500 }, 'saku', '', 'パーマの残りを整える'],
    ['R06', '2026-07-01', 'C-001', { cut: 5500, color: 7700 }, 'nagi', 'AS-7', '根元が伸びやすい'],
    ['R07', '2026-07-04', 'C-004', { cut: 5500 }, 'nagi', '', '前髪を眉上に'],
    ['R08', '2026-07-06', 'C-007', { cut: 5500 }, 'saku', '', '短めのショート'],
    ['R09', '2026-07-25', 'C-008', { color: 7700 }, 'nagi', 'BE-8', '明るめを希望'],
    ['R10', '2026-08-02', 'C-005', { cut: 5500, color: 7700 }, 'saku', 'GR-6', '初めてのご来店。乾燥しやすい'],
    ['R11', '2026-08-05', 'C-002', { cut: 5500 }, 'nagi', '', 'いつもどおり'],
    ['R12', '2026-08-13', 'C-001', { color: 6600 }, 'nagi', 'AS-7', '根元だけ染める'],
    ['R13', '2026-08-20', 'C-007', { cut: 5500 }, 'saku', '', '耳まわりすっきり'],
    ['R14', '2026-08-23', 'C-009', { cut: 5500 }, 'saku', '', '次はパーマも相談'],
    ['R15', '2026-08-29', 'C-003', { cut: 5500, perm: 8800 }, 'saku', '', '初めてのご来店。くせを生かす'],
    ['R16', '2026-09-02', 'C-006', { perm: 8800 }, 'saku', '', '前回より少し強め'],
    ['R17', '2026-09-03', 'C-002', { cut: 5500, tr: 3300 }, 'nagi', '', '毛先の傷みが気になる'],
    ['R18', '2026-09-08', 'C-001', { cut: 5500 }, 'nagi', '', '長さはそのまま'],
    ['R19', '2026-09-10', 'C-008', { cut: 5500, color: 7700 }, 'nagi', 'BE-8', '色の持ちがよかった'],
    ['R20', '2026-09-14', 'C-005', { color: 7700, tr: 3300 }, 'saku', 'GR-6', 'トリートメントで手ざわりが改善'],
    ['R21', '2026-10-02', 'C-004', { cut: 5500, perm: 9900 }, 'nagi', '', 'ロングのためパーマ料金を追加'],
    ['R22', '2026-10-05', 'C-007', { cut: 5500 }, 'saku', '', 'いつもどおり'],
    ['R23', '2026-10-16', 'C-003', { cut: 5500 }, 'saku', '', 'パーマは次回相談'],
    ['R24', '2026-10-18', 'C-002', { cut: 5500 }, 'nagi', '', '少し伸ばし中'],
    ['R25', '2026-10-21', 'C-008', { color: 7700, tr: 3300 }, 'nagi', 'BE-9', '一段明るく'],
    ['R26', '2026-10-22', 'C-001', { cut: 5500, color: 7700 }, 'nagi', 'AS-6', '暗めに戻したい'],
    ['R27', '2026-10-23', 'C-005', { color: 7700 }, 'saku', 'GR-7', '次回は根元から'],
    ['R28', '2026-11-07', 'C-010', { cut: 5500 }, 'saku', '', '初めてのご来店。肩上で切りそろえ'],
    ['R29', '2026-11-21', 'C-007', { cut: 5500 }, 'saku', '', '次回もこの長さ'],
    ['R30', '2026-11-28', 'C-010', { color: 7700, tr: 3300 }, 'nagi', 'BR-7', '落ち着いた茶色に']
  ]
  function own (o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
  function pad2 (n) { return n < 10 ? '0' + n : String(n) }

  // ---------- 日付（§10-1。時差を持たない日の番号） ----------
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
  function elapsed (s) { return dayNum(TODAY) - dayNum(s) }
  var WD = ['日', '月', '火', '水', '木', '金', '土']
  function jpDate (s) {
    var p = s.split('-')
    var w = ((dayNum(s) % 7) + 7 + 4) % 7 // 1970-01-01 は木曜
    return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日（' + WD[w] + '）'
  }
  function jpMonth (ym) { var p = ym.split('-'); return Number(p[0]) + '年' + Number(p[1]) + '月' }
  function yen (n) { return n.toLocaleString('ja-JP') + '円' }
  function menuKeys (r) { return MK.filter(function (k) { return own(r.amt, k) }) }
  function menuLabel (r) { return menuKeys(r).map(function (k) { return ML[k] }).join('・') }
  function total (r) { return menuKeys(r).reduce(function (a, k) { return a + r.amt[k] }, 0) }

  // ---------- 決め方（§10。状態を引数で受ける純粋な関数） ----------
  function recsOf (st, cid) {
    return st.records.filter(function (r) { return r.cid === cid }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : idNum(a.id) - idNum(b.id) })
  }
  function idNum (id) { return Number(id.slice(1)) }
  function lastVisit (st, cid) { var rs = recsOf(st, cid); return rs.length ? rs[rs.length - 1] : null }
  function visitCount (st, cid) { return recsOf(st, cid).length }
  function firstDate (st, cid) { var rs = recsOf(st, cid); return rs.length ? rs[0].date : null }
  function visitNo (st, rec) { return recsOf(st, rec.cid).map(function (r) { return r.id }).indexOf(rec.id) + 1 }
  // 目安＝最後の来店のメニューのうち、カット・カラー・パーマの目安の一番短い日数（トリートメントだけなら null）
  function threshold (r, settings) {
    var best = null
    TH_K.forEach(function (k) { if (own(r.amt, k) && (best === null || settings[k] < best.d)) best = { k: k, d: settings[k] } })
    return best
  }
  // カラーを含む一番新しい記録（同じ日付は id の大きい方）
  function lastColor (st, cid) {
    var rs = recsOf(st, cid).filter(function (r) { return own(r.amt, 'color') })
    return rs.length ? rs[rs.length - 1] : null
  }
  function custInfo (st, cid) {
    var last = lastVisit(st, cid)
    var o = { cid: cid, name: CN[cid], last: last, n: visitCount(st, cid), first: firstDate(st, cid), el: null, th: null, thKey: null, over: null, dueDate: null, due: false, done: false, contact: own(st.contacts, cid) ? st.contacts[cid] : null }
    if (!last) return o
    o.el = elapsed(last.date)
    var t = threshold(last, st.settings)
    if (!t) return o
    o.th = t.d; o.thKey = t.k
    o.over = o.el - t.d
    o.dueDate = ymd(dayNum(last.date) + t.d)
    o.due = o.over >= 0
    o.done = o.due && o.contact !== null && o.contact >= last.date
    return o
  }
  // 候補（まだの方・お声がけ済み）。過ぎた日数の多い順、同じなら番号の小さい順（§10-3）
  function dueList (st) {
    var all = CUST_IDS.map(function (cid) { return custInfo(st, cid) }).filter(function (x) { return x.due })
    all.sort(function (a, b) { return b.over - a.over || (a.cid < b.cid ? -1 : a.cid > b.cid ? 1 : 0) })
    return { yet: all.filter(function (x) { return !x.done }), done: all.filter(function (x) { return x.done }) }
  }
  // 月のまとめ（§10-4・§10-5）。画面・CSV・印刷はこの結果を使う
  function monthSummary (st, ym) {
    var rows = st.records.filter(function (r) { return r.date.slice(0, 7) === ym }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : idNum(a.id) - idNum(b.id) })
    var cids = []
    rows.forEach(function (r) { if (cids.indexOf(r.cid) < 0) cids.push(r.cid) })
    var newIds = cids.filter(function (c) { return firstDate(st, c).slice(0, 7) === ym }).sort()
    var o = { ym: ym, people: cids.length, newN: newIds.length, repN: cids.length - newIds.length, newIds: newIds, count: rows.length, sales: 0, menu: {}, staff: {}, rows: [] }
    MK.forEach(function (k) { o.menu[k] = { n: 0, yen: 0 } })
    STAFF_K.forEach(function (k) { o.staff[k] = { n: 0, yen: 0 } })
    rows.forEach(function (r) {
      var t = total(r)
      o.sales += t
      menuKeys(r).forEach(function (k) { o.menu[k].n++; o.menu[k].yen += r.amt[k] })
      o.staff[r.staff].n++; o.staff[r.staff].yen += t
      var no = visitNo(st, r)
      o.rows.push({ r: r, no: no, isNew: no === 1, total: t })
    })
    return o
  }
  // 探す（§10-6）
  function normQ (q) {
    var s = String(q).trim().normalize('NFKC').toUpperCase()
    s = s.replace(/[ぁ-ゖ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60) })
    return s.replace(/様$/, '').trim()
  }
  function matchCust (q, c) {
    var s = normQ(q)
    if (s === '') return true
    var m = /^C?-?(\d{1,3})$/.exec(s)
    if (m) return Number(c.id.slice(2)) === Number(m[1])
    return c.name.indexOf(s) >= 0
  }

  // ---------- 入力の読み取り（§11）。戻り値 { v } か { e } ----------
  function nfkc (s) { return String(s).trim().normalize('NFKC').trim() }
  function realDate (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (!m) return false
    var mo = Number(m[2]); var d = Number(m[3])
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false
    return ymd(Date.UTC(Number(m[1]), mo - 1, d) / 86400000) === s
  }
  function parseDate (text) {
    var s = nfkc(text).replace(/[/.]/g, '-')
    if (s === '') return { e: 'empty' }
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
    if (!m) return { e: 'form' }
    var v = m[1] + '-' + pad2(Number(m[2])) + '-' + pad2(Number(m[3]))
    if (!realDate(v)) return { e: 'form' }
    if (v > TODAY) return { e: 'future' }
    if (v < MIN_DATE) return { e: 'old' }
    return { v: v }
  }
  function parseYen (text) {
    var s = nfkc(text).replace(/,/g, '')
    if (s === '') return { e: 'empty' }
    if (!/^\d+$/.test(s)) return { e: 'form' }
    var v = Number(s)
    if (v > MAX_YEN) return { e: 'big' }
    return { v: v }
  }
  var COLOR_RE = /^[A-Z0-9][A-Z0-9\-/.+]{0,15}$/
  function parseColor (text) {
    var s = nfkc(text).toUpperCase()
    if (s === '') return { e: 'empty' }
    if (Array.from(s).length > 16) return { e: 'long' }
    if (!COLOR_RE.test(s)) return { e: 'form' }
    return { v: s }
  }
  var PHONE_RE = /\d(?:[-‐−–ー()]*\d){9,}/
  // メモに入っていてはいけない文字（制御文字・行／段落の区切り）
  var CTRL_RE = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/
  var CTRL_G = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g
  function checkMemo (text) {
    // 改行と同じく、タブ・制御文字・行／段落の区切り（U+2028・U+2029）も空白にする（保存の検証 CTRL_RE と合わせる）
    var s = String(text).replace(/\r\n|\r|\n/g, ' ').replace(CTRL_G, ' ').trim()
    var n = Array.from(s).length
    if (n > 200) return { e: 'long', n: n }
    if (PHONE_RE.test(s.normalize('NFKC'))) return { e: 'phone' }
    return { v: s }
  }
  function parseTh (text) {
    var s = nfkc(text)
    if (s === '') return { e: 'empty' }
    if (!/^\d+$/.test(s)) return { e: 'form' }
    var v = Number(s)
    if (v < 1 || v > 365) return { e: 'form' }
    return { v: v }
  }
  var DATE_MSG = {
    empty: '日付を入れてください', form: '日付は 2026-12-01 の形で、ある日付を入れてください',
    future: '未来の日付は入れられません（今日は 2026-12-01）', old: '2024-01-01 より前の日付は入れられません', dup: 'この日の記録はもうあります（1人1日1件まで）'
  }
  function yenMsg (k, e) { return e === 'empty' ? ML[k] + 'の金額を入れてください' : e === 'big' ? ML[k] + 'の金額は 100,000円までにしてください' : ML[k] + 'の金額は 0円以上の整数で入れてください' }
  var COLOR_MSG = { empty: 'カラーの時は色番号を入れてください', long: '色番号は16文字までにしてください', form: '色番号は英字・数字と - / . + で、英字か数字から始めてください' }
  function memoMsg (r) { return r.e === 'long' ? 'メモは200字までにしてください（いま ' + r.n + '字）' : '電話番号のような数字（10桁以上）はメモに保存できません。電話番号などは書かないでください' }
  function thMsg (k, e) { return e === 'empty' ? ML[k] + 'の目安を入れてください' : ML[k] + 'の目安は 1〜365 の整数で入れてください' }
  var MAX_MSG = '記録は500件までです。古い記録の整理は実際のお仕事でご相談ください'

  // ---------- 保存の検証（§12-2）。通れば新しい状態、外れれば null ----------
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  function intIn (v, a, b) { return typeof v === 'number' && Number.isInteger(v) && v >= a && v <= b }
  function sameKeys (o, list) {
    var ks = Object.keys(o)
    if (ks.length !== list.length) return false
    return list.every(function (k) { return own(o, k) }) && ks.every(function (k) { return list.indexOf(k) >= 0 })
  }
  function okDate (s) { return typeof s === 'string' && realDate(s) && s >= MIN_DATE && s <= TODAY }
  var REC_KEYS = ['id', 'cid', 'date', 'amt', 'staff', 'color', 'memo']
  function validate (d) {
    if (!isObj(d) || !['v', 'settings', 'records', 'contacts', 'seq'].every(function (k) { return own(d, k) })) return null
    if (d.v !== 1) return null
    if (!isObj(d.settings) || !sameKeys(d.settings, TH_K)) return null
    if (!TH_K.every(function (k) { return intIn(d.settings[k], 1, 365) })) return null
    if (!intIn(d.seq, 1, 100000)) return null
    if (!Array.isArray(d.records) || d.records.length > MAX_REC) return null
    var st = { settings: { cut: d.settings.cut, color: d.settings.color, perm: d.settings.perm }, records: [], contacts: {}, seq: d.seq }
    var ids = {}; var days = {}
    for (var i = 0; i < d.records.length; i++) {
      var r = d.records[i]
      if (!isObj(r) || !sameKeys(r, REC_KEYS)) return null
      if (typeof r.id !== 'string' || !/^R\d{2,4}$/.test(r.id) || own(ids, r.id) || idNum(r.id) >= d.seq) return null
      ids[r.id] = 1
      if (typeof r.cid !== 'string' || CUST_IDS.indexOf(r.cid) < 0) return null
      if (!okDate(r.date)) return null
      if (own(days, r.cid + r.date)) return null
      days[r.cid + r.date] = 1
      if (!isObj(r.amt)) return null
      var ak = Object.keys(r.amt)
      if (!ak.length || !ak.every(function (k) { return MK.indexOf(k) >= 0 })) return null
      var amt = {}
      for (var j = 0; j < MK.length; j++) {
        var k = MK[j]
        if (!own(r.amt, k)) continue
        if (!intIn(r.amt[k], 0, MAX_YEN)) return null
        amt[k] = r.amt[k]
      }
      if (typeof r.staff !== 'string' || STAFF_K.indexOf(r.staff) < 0) return null
      if (typeof r.color !== 'string') return null
      if (own(amt, 'color') ? !COLOR_RE.test(r.color) : r.color !== '') return null
      if (typeof r.memo !== 'string' || Array.from(r.memo).length > 200 || r.memo !== r.memo.trim() || CTRL_RE.test(r.memo) || PHONE_RE.test(r.memo.normalize('NFKC'))) return null
      st.records.push({ id: r.id, cid: r.cid, date: r.date, amt: amt, staff: r.staff, color: r.color, memo: r.memo })
    }
    if (!isObj(d.contacts)) return null
    var ck = Object.keys(d.contacts)
    for (i = 0; i < ck.length; i++) {
      if (CUST_IDS.indexOf(ck[i]) < 0 || !okDate(d.contacts[ck[i]])) return null
      st.contacts[ck[i]] = d.contacts[ck[i]]
    }
    return st
  }
  function sample () {
    return {
      settings: { cut: DEF_TH.cut, color: DEF_TH.color, perm: DEF_TH.perm },
      records: SAMPLE_REC.map(function (a) { return { id: a[0], cid: a[2], date: a[1], amt: Object.assign({}, a[3]), staff: a[4], color: a[5], memo: a[6] } }),
      contacts: {},
      seq: 31
    }
  }

  // ---------- CSV（§13） ----------
  function csvCell (v) {
    if (v === null) return ''
    if (typeof v === 'number') return String(v)
    var s = String(v)
    if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  var CSV_COLS = [
    ['日付', '2026-11-07 の形'], ['お客様番号', 'C-001〜C-010'], ['呼び名', '「様」なし'], ['何回目の来店', '整数'], ['メニュー', 'カット・カラー の形'],
    ['カット（円）', '整数（無い時は空）'], ['カラー（円）', '整数（無い時は空）'], ['パーマ（円）', '整数（無い時は空）'], ['トリートメント（円）', '整数（無い時は空）'],
    ['合計（税込・円）', '整数'], ['担当', 'ナギ／サク'], ['色番号', 'カラーの時だけ'], ['メモ', 'お店のメモ']
  ]
  function buildCsv (st, ym) {
    var ms = monthSummary(st, ym)
    var lines = [CSV_COLS.map(function (c) { return c[0] }).join(',')]
    ms.rows.forEach(function (x) {
      var r = x.r
      lines.push([csvCell(r.date), csvCell(r.cid), csvCell(CN[r.cid]), csvCell(x.no), csvCell(menuLabel(r))]
        .concat(MK.map(function (k) { return csvCell(own(r.amt, k) ? r.amt[k] : null) }))
        .concat([csvCell(x.total), csvCell(SN[r.staff]), csvCell(r.color), csvCell(r.memo)]).join(','))
    })
    return '﻿' + lines.join('\r\n') + '\r\n'
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
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, settings: S.settings, records: S.records, contacts: S.contacts, seq: S.seq }))
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
  function setText (e, kids) { e.textContent = ''; add(e, kids); return e }
  function shown (e) { return !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) }
  function custLabel (cid) { return CN[cid] + '様（' + cid + '）' }

  // 折れてはいけない語（§16）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = ['美容室 ソヨギ', 'お声がけの候補', 'お声がけ済み', '今日が目安', '目安なし', 'まだの方', 'デモ（架空のお店）', 'デモの日付', '見本に戻す', 'CSV をダウンロード', '印刷・PDFで保存',
    '担当 ナギ', '担当 サク', 'トリートメント', 'カット', 'カラー', 'パーマ', 'ナギ', 'サク', '新規', '再来', 'デモ', '架空', '税込']
    .concat(CUST.map(function (c) { return c.name + '様' })).sort(function (a, b) { return b.length - a.length })
  var NW_RE = new RegExp([
    '\\d{4}年\\d{1,2}月(?:\\d{1,2}日(?:（[日月火水木金土]）)?)?', '\\d{4}-\\d{2}-\\d{2}', '[ァ-ヶー]+様（C-\\d{3}）', 'C-\\d{3}',
    '(?:経過|あと) [\\d,]+日', '[\\d,]+(?:円|日|回目|回|人|件|か所|字)', '\\d{2}-\\d{2}'
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
        if (!p || p.closest('.nw, svg, script, style, title, pre, .visually-hidden, label, option, select, textarea, #sr-status')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var list = []; var n
    while ((n = tw.nextNode())) list.push(n)
    list.forEach(wrapText)
    return root
  }
  // 状態の札（§1-4）。見える文字がそのまま読まれる（aria-label を付けない）
  var TAG = { due: ['お声がけの候補', 'i-bell'], done: ['お声がけ済み', 'i-check'], today: ['今日が目安', 'i-cal'], none: ['目安なし', null], new: ['新規', 'i-leaf'] }
  function stateTag (k) {
    var t = el('span', 'state-tag state-tag--' + k)
    if (TAG[k][1]) t.appendChild(icon(TAG[k][1], 14))
    t.appendChild(document.createTextNode(TAG[k][0]))
    return t
  }
  function tagOf (inf) {
    if (inf.done) return 'done'
    if (inf.due) return 'due'
    if (inf.last && inf.th === null) return 'none'
    return null
  }

  // ---------- 知らせ（live 領域は #sr-status の1つだけ。§18-3） ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  function announce (msg, wait) {
    var sr = $('sr-status')
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
  var ui = { tab: 'search', cid: 'C-001', ym: null, q: '', lastAdded: null, thErr: {}, thPending: {} }

  // ---------- タブ ----------
  var TABS = ['search', 'karte', 'due', 'month']
  function openTab (name, opt) {
    ui.tab = name
    TABS.forEach(function (t) {
      var on = t === name
      var tb = $('tab-' + t)
      tb.setAttribute('aria-selected', on ? 'true' : 'false')
      tb.tabIndex = on ? 0 : -1
      $('panel-' + t).hidden = !on
    })
    syncScrollBoxes()
    if (!(opt && opt.noScroll)) {
      var tabsH = $('tabs').getBoundingClientRect().height
      var top = $('panel-' + name).getBoundingClientRect().top
      if (top < tabsH) window.scrollBy(0, top - tabsH)
    }
  }
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[role="tab"]')
    if (b) openTab(b.id.slice(4))
  })
  $('tabs').addEventListener('keydown', function (e) {
    var i = TABS.indexOf(ui.tab); var j = null
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = TABS.length - 1
    if (j === null) return
    e.preventDefault()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  var PANEL_H = { search: 'search-h', karte: 'karte-h', due: 'due-h', month: 'month-h' }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      var n = a.getAttribute('data-step')
      openTab(n, { noScroll: true })
      $('panel-' + n).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      $(PANEL_H[n]).focus({ preventScroll: true })
    })
  })

  // ---------- 誤りの文（入力値は引用しない。§11） ----------
  function showErrP (errId, msg, prev) {
    var p = $(errId)
    setText(p, [icon('i-err', 16, 'field__err-ic'), el('span', 'field__err-msg', msg), prev ? el('span', 'field__prev', prev) : null])
    p.hidden = false
  }
  function hideErrP (errId) { var p = $(errId); p.hidden = true; p.textContent = '' }
  var FORM_ERR = { date: ['err-f-date', 'f-date'], menu: ['err-menu', null], staff: ['err-staff', null], color: ['err-f-color', 'f-color'], memo: ['err-f-memo', 'f-memo'] }
  MK.forEach(function (k) { FORM_ERR['amt-' + k] = ['err-f-amt-' + k, 'f-amt-' + k] })
  var formErr = {}
  function setFormErr (key, msg) {
    formErr[key] = msg
    showErrP(FORM_ERR[key][0], msg)
    if (FORM_ERR[key][1]) $(FORM_ERR[key][1]).setAttribute('aria-invalid', 'true')
  }
  function clearFormErr (key) {
    if (!own(formErr, key)) return
    delete formErr[key]
    hideErrP(FORM_ERR[key][0])
    if (FORM_ERR[key][1]) $(FORM_ERR[key][1]).removeAttribute('aria-invalid')
  }
  function clearAllFormErr () { Object.keys(FORM_ERR).forEach(clearFormErr); hideErrP('err-form') }

  // ---------- 今日の記録を足す（§7-4） ----------
  function menuBox (k) { return $('m-' + k) }
  function checkedMenus () { return MK.filter(function (k) { return menuBox(k).checked }) }
  function checkedStaff () { var s = STAFF_K.filter(function (k) { return $('s-' + k).checked }); return s.length ? s[0] : null }
  function syncPicks () {
    MK.forEach(function (k) { $('pk-' + k).classList.toggle('is-on', menuBox(k).checked) })
    STAFF_K.forEach(function (k) { $('pk-' + k).classList.toggle('is-on', $('s-' + k).checked) })
  }
  function updateTotal () {
    var sum = 0; var bad = false
    checkedMenus().forEach(function (k) { var r = parseYen($('f-amt-' + k).value); if (r.e) bad = true; else sum += r.v })
    $('f-total').textContent = bad ? '合計 —（金額を確かめてください）' : '合計 ' + yen(sum) + '（税込）'
    wrapWords($('f-total'))
  }
  function updateMemoCount () { $('f-memo-count').textContent = Array.from($('f-memo').value).length + '／200字' }
  function resetForm () {
    clearAllFormErr()
    $('f-date').value = TODAY
    MK.forEach(function (k) { menuBox(k).checked = false; $('amt-' + k).hidden = true; $('f-amt-' + k).value = '' })
    STAFF_K.forEach(function (k) { $('s-' + k).checked = false })
    $('color-field').hidden = true; $('f-color').value = ''
    $('f-memo').value = ''
    syncPicks(); updateTotal(); updateMemoCount()
  }
  // 1つの欄を読む（誤りなら文、正しければ null）
  function dateErr () {
    var r = parseDate($('f-date').value)
    if (r.e) return DATE_MSG[r.e]
    if (S.records.some(function (x) { return x.cid === ui.cid && x.date === r.v })) return DATE_MSG.dup
    return null
  }
  function amtErr (k) { var r = parseYen($('f-amt-' + k).value); return r.e ? yenMsg(k, r.e) : null }
  function colorErr () { var r = parseColor($('f-color').value); return r.e ? COLOR_MSG[r.e] : null }
  function memoErr () { var r = checkMemo($('f-memo').value); return r.e ? memoMsg(r) : null }
  // 正しく直した欄だけ誤りの文を消す（ほかの欄は押すまで出し直さない。§7-4）
  function fixed (key, msg) { if (own(formErr, key) && msg === null) clearFormErr(key) }
  MK.forEach(function (k) {
    menuBox(k).addEventListener('change', function () {
      var on = menuBox(k).checked
      $('amt-' + k).hidden = !on
      $('f-amt-' + k).value = on ? String(PRICE[k]) : ''
      if (!on) clearFormErr('amt-' + k)
      if (k === 'color') {
        $('color-field').hidden = !on
        if (!on) { $('f-color').value = ''; clearFormErr('color') }
      }
      if (checkedMenus().length) clearFormErr('menu')
      syncPicks(); updateTotal()
    })
    $('f-amt-' + k).addEventListener('input', function () { fixed('amt-' + k, amtErr(k)); updateTotal() })
  })
  STAFF_K.forEach(function (k) {
    $('s-' + k).addEventListener('change', function () { clearFormErr('staff'); syncPicks() })
  })
  $('f-date').addEventListener('input', function () { fixed('date', dateErr()) })
  $('f-color').addEventListener('input', function () { fixed('color', colorErr()) })
  $('f-memo').addEventListener('input', function () { updateMemoCount(); fixed('memo', memoErr()) })

  function nextId () {
    if (S.seq <= 9999) { var id = 'R' + pad2(S.seq); S.seq = S.seq + 1; return id }
    // 番号が 4桁を超えた時は、使っていない一番小さい番号（記録は500件までなので必ず空きがある）
    var used = {}; S.records.forEach(function (r) { used[idNum(r.id)] = 1 })
    for (var n = 1; n <= 9999; n++) if (!used[n]) return 'R' + pad2(n)
    return null
  }
  $('karte-form').addEventListener('submit', function (e) {
    e.preventDefault()
    load()
    clearAllFormErr()
    var errs = [] // [key, 文, フォーカスする欄]
    var de = dateErr(); if (de) errs.push(['date', de, 'f-date'])
    var menus = checkedMenus()
    if (!menus.length) errs.push(['menu', 'メニューを1つ以上選んでください', 'm-cut'])
    menus.forEach(function (k) { var m = amtErr(k); if (m) errs.push(['amt-' + k, m, 'f-amt-' + k]) })
    var staff = checkedStaff()
    if (!staff) errs.push(['staff', '担当を選んでください', 's-nagi'])
    if (menus.indexOf('color') >= 0) { var ce = colorErr(); if (ce) errs.push(['color', ce, 'f-color']) }
    var me = memoErr(); if (me) errs.push(['memo', me, 'f-memo'])
    if (errs.length) {
      errs.forEach(function (x) { setFormErr(x[0], x[1]) })
      $(errs[0][2]).focus()
      announce('記録を足せませんでした。直すところが ' + errs.length + 'か所あります')
      return
    }
    if (S.records.length >= MAX_REC) {
      showErrP('err-form', MAX_MSG)
      announce(MAX_MSG)
      return
    }
    var amt = {}
    menus.forEach(function (k) { amt[k] = parseYen($('f-amt-' + k).value).v })
    var rec = {
      id: nextId(), cid: ui.cid, date: parseDate($('f-date').value).v, amt: amt, staff: staff,
      color: menus.indexOf('color') >= 0 ? parseColor($('f-color').value).v : '', memo: checkMemo($('f-memo').value).v
    }
    S.records.push(rec)
    save()
    // 番号だけでなくお客様・日付も持つ（別のタブで見本に戻して同じ番号が使われた時に取り違えない）
    ui.lastAdded = { id: rec.id, cid: rec.cid, date: rec.date }
    resetForm()
    renderAll()
    showToast('記録を足しました', CN[rec.cid] + '様の記録を足しました。' + rec.date + ' ' + menuLabel(rec) + ' ' + yen(total(rec)) + '。来店 ' + visitCount(S, rec.cid) + '回')
    $('undo-btn').focus()
  })

  // ---------- 直前に足した記録を取り消す（§7-5） ----------
  function lastAdded () {
    var la = ui.lastAdded
    if (!la) return null
    var r = S.records.filter(function (x) { return x.id === la.id && x.cid === la.cid && x.date === la.date })
    return r.length ? r[0] : null
  }
  $('undo-btn').addEventListener('click', function () {
    load()
    var r = lastAdded()
    ui.lastAdded = null
    if (!r) { renderAll(); announce('この記録はもうありません'); $('hist-h').focus(); return }
    S.records = S.records.filter(function (x) { return x.id !== r.id })
    save()
    renderAll()
    showToast('記録を取り消しました', CN[r.cid] + '様の ' + r.date + ' の記録を取り消しました。来店 ' + visitCount(S, r.cid) + '回')
    $('hist-h').focus()
  })

  // ---------- カルテを開く・お客様を変える ----------
  function selectCust (cid) {
    if (ui.cid !== cid) { ui.cid = cid; resetForm() }
  }
  function goKarte (cid) {
    load()
    selectCust(cid)
    renderAll()
    openTab('karte')
    $('karte-name').focus({ preventScroll: true })
  }
  $('karte-cust').addEventListener('change', function () {
    load()
    selectCust($('karte-cust').value)
    renderAll()
    announce(CN[ui.cid] + '様のカルテ。来店 ' + visitCount(S, ui.cid) + '回')
  })

  // ---------- 探す（§6） ----------
  var qTimer = null
  $('q').addEventListener('input', function () {
    ui.q = $('q').value
    renderSearch()
    window.clearTimeout(qTimer)
    qTimer = window.setTimeout(function () { announce(searchMsg(true), 0) }, 400)
  })
  function searchList () { return CUST.filter(function (c) { return matchCust(ui.q, c) }) }
  function searchMsg (short) {
    var n = searchList().length
    if (normQ(ui.q) === '') return CUST.length + '人を表示しています'
    if (n) return n + '人 見つかりました'
    return short ? '見つかりません' : '見つかりません。呼び名の一部か、番号（例：C-001・1）で探してください'
  }
  function goBtn (cls, id, cid, withIcon) {
    var b = btn(cls, [nw('カルテを開く'), withIcon ? icon('i-right', 16) : null], id)
    b.setAttribute('aria-label', 'カルテを開く ' + custLabel(cid))
    b.addEventListener('click', function () { goKarte(cid) })
    return b
  }
  function renderSearch () {
    var list = searchList()
    $('q-count').textContent = searchMsg(false)
    $('q-none').hidden = list.length > 0
    var cards = $('cust-cards'); cards.textContent = ''
    var tbody = $('cust-tbody'); tbody.textContent = ''
    $('cust-table-box').classList.toggle('is-empty', !list.length)
    list.forEach(function (c) {
      var inf = custInfo(S, c.id)
      var tg = tagOf(inf)
      var open = c.id === ui.cid
      var yet = inf.due && !inf.done
      var li = el('li', 'cust-card' + (yet ? ' is-due' : '') + (open ? ' cust-row--open' : ''))
      li.setAttribute('data-id', c.id)
      var lastKids = inf.last ? [nw(inf.last.date), nw('（経過 ' + inf.el + '日）')] : '記録なし'
      add(li, [
        open ? el('p', 'cust-open', '開いています') : null,
        add(el('div', 'cust-card__head'), [el('span', 'cust-card__id', c.id), nw(c.name + '様', 'cust-card__name'), tg ? stateTag(tg) : null]),
        add(el('dl', 'kv'), [
          add(el('div'), [el('dt', null, '最後の来店'), add(el('dd'), lastKids)]),
          add(el('div'), [el('dt', null, '前回のメニュー'), el('dd', null, inf.last ? menuLabel(inf.last) : '—')]),
          add(el('div'), [el('dt', null, '来店回数'), add(el('dd'), nw(inf.n + '回'))])
        ]),
        goBtn('btn-sub cust-card__go', 'go-c-' + c.id, c.id, true)
      ])
      cards.appendChild(li)
      var tr = el('tr', (yet ? 'is-due' : '') + (open ? ' cust-row--open' : ''))
      tr.setAttribute('data-id', c.id)
      var th = el('th', 'c-name'); th.setAttribute('scope', 'row')
      add(th, [open ? el('span', 'cust-open cell-open', '開いています') : null, nw(c.name + '様')])
      add(tr, [
        add(el('td', 'c-id'), c.id), th,
        add(el('td', 'c-last'), inf.last ? [nw(inf.last.date), el('span', 'cell-2', '経過 ' + inf.el + '日')] : '記録なし'),
        add(el('td', 'c-menu'), inf.last ? menuLabel(inf.last) : '—'),
        add(el('td', 'c-n num'), nw(inf.n + '回')),
        add(el('td', 'c-state'), tg ? stateTag(tg) : null),
        add(el('td', 'c-go'), goBtn('btn-sub', 'go-t-' + c.id, c.id, false))
      ])
      tbody.appendChild(tr)
    })
    $('cust-table-box').hidden = !list.length
    wrapWords($('panel-search'))
  }

  // ---------- カルテ（§7） ----------
  function dueText (inf) {
    if (!inf.last) return '記録はありません'
    if (inf.th === null) return 'トリートメントだけの来店のため、目安はありません'
    var head = '目安 ' + ML[inf.thKey] + ' ' + inf.th + '日（目安の日 ' + inf.dueDate + '）・'
    if (inf.over > 0) return head + '目安を ' + inf.over + '日 過ぎています'
    if (inf.over === 0) return head + '今日が目安の日です'
    return head + '目安まで あと ' + (-inf.over) + '日'
  }
  function karteTag (inf) {
    if (inf.done) return 'done'
    if (inf.due) return inf.over === 0 ? 'today' : 'due'
    if (inf.last && inf.th === null) return 'none'
    return null
  }
  function renderKarte () {
    var cid = ui.cid
    var inf = custInfo(S, cid)
    $('karte-cust').value = cid
    setText($('karte-name'), nw(custLabel(cid)))
    $('karte-meta').textContent = inf.last ? '来店 ' + inf.n + '回・初めての来店 ' + inf.first : '来店 0回'
    var kt = karteTag(inf)
    setText($('karte-last'), inf.last ? [add(el('span'), ['最後の来店 ', nw(inf.last.date), nw('（経過 ' + inf.el + '日）')]), kt ? stateTag(kt) : null] : '記録はありません')
    $('karte-due').textContent = dueText(inf)
    var lc = lastColor(S, cid)
    setText($('last-color'), lc ? [el('span', 'last-box__code mono nw', lc.color), ' ', el('span', 'last-box__when', lc.date + ' のカラー')] : el('span', 'last-box__empty', 'カラーの記録はありません'))
    $('last-memo-l').textContent = inf.last ? '前回のメモ（' + inf.last.date + '）' : '前回のメモ'
    setText($('last-memo'), inf.last && inf.last.memo ? inf.last.memo : el('span', 'last-box__nomemo', 'メモはありません'))
    // 直前に足した記録（そのお客様のカルテを開いている時だけ）
    var la = lastAdded()
    var ub = $('undo-btn')
    if (la && la.cid === cid) {
      setText(ub, [icon('i-back', 18), '直前に足した記録を取り消す（' + la.date + ' ' + menuLabel(la) + '）'])
      ub.hidden = false
    } else { ub.hidden = true; ub.textContent = '' }
    // 履歴（新しい順）
    var rs = recsOf(S, cid)
    $('hist-n').textContent = rs.length + '件'
    var list = $('visit-list'); list.textContent = ''
    rs.slice().reverse().forEach(function (r, i) {
      var no = rs.length - i
      var added = la && la.id === r.id
      var art = el('article', 'visit' + (added ? ' visit--added' : ''))
      art.setAttribute('data-id', r.id)
      add(art, [
        added ? el('p', 'visit__added', '今回足した記録') : null,
        add(el('p', 'visit__r1'), [nw(r.date, 'visit__date'), nw(no + '回目', 'visit__no'), no === 1 ? stateTag('new') : null, nw('担当 ' + SN[r.staff], 'visit__staff')]),
        add(el('p', 'visit__r2'), [el('span', 'visit__menu', menuLabel(r)), nw(yen(total(r)), 'visit__total')]),
        r.color ? add(el('p', 'visit__color'), [el('span', 'visit__l', '色番号'), el('span', 'mono nw', r.color)]) : null,
        r.memo ? add(el('p', 'visit__memo'), [el('span', 'visit__l', 'メモ'), el('span', 'visit__memo-t', r.memo)]) : null
      ])
      list.appendChild(art)
    })
    wrapWords($('panel-karte'))
  }

  // ---------- お声がけの候補（§8） ----------
  function syncTh () {
    TH_K.forEach(function (k) {
      var inp = $('th-' + k)
      if (inp === document.activeElement || own(ui.thErr, k)) return
      var t = String(S.settings[k])
      if (inp.value !== t) inp.value = t
    })
  }
  function setThErr (k, e) {
    ui.thErr[k] = e
    showErrP('err-th-' + k, thMsg(k, e), '前の値（' + S.settings[k] + '日）で判定しています')
    $('th-' + k).setAttribute('aria-invalid', 'true')
  }
  function clearThErr (k) {
    if (!own(ui.thErr, k)) return
    delete ui.thErr[k]
    hideErrP('err-th-' + k)
    $('th-' + k).removeAttribute('aria-invalid')
  }
  function dueMsg () { var d = dueList(S); return 'まだの方 ' + d.yet.length + '人・お声がけ済み ' + d.done.length + '人' }
  // 目安の欄：打っている間（input）は検証と並べ直しだけ。保存は change・blur（とページを離れる時）だけ（途中の値を保存しない）
  function keepPending () {
    TH_K.forEach(function (k) { if (own(ui.thPending, k)) S.settings[k] = ui.thPending[k] })
  }
  function onTh (k, ev) {
    var inp = $('th-' + k)
    var r = parseTh(inp.value)
    if (ev === 'input') {
      if (r.e === 'empty') { clearThErr(k); return }
      load()
      keepPending()
      if (r.e) { setThErr(k, r.e); announce(thMsg(k, r.e), 500); return }
      clearThErr(k)
      if (S.settings[k] === r.v) { renderAll(); return }
      S.settings[k] = r.v
      ui.thPending[k] = r.v
      renderAll()
      announce('目安を変えました。' + dueMsg(), 500)
      return
    }
    // change・blur：ここで保存する
    var had = own(ui.thPending, k)
    var pend = ui.thPending[k]
    delete ui.thPending[k]
    load()
    keepPending()
    if (r.e) {
      // 誤りの間は、最後に正しかった値（打っている間に判定に使った値）を保存する
      if (had && S.settings[k] !== pend) { S.settings[k] = pend; save(); renderAll() }
      if (ev === 'change' || !own(ui.thErr, k)) { setThErr(k, r.e); announce(thMsg(k, r.e), 500) }
      return
    }
    clearThErr(k)
    inp.value = String(r.v)
    if (S.settings[k] === r.v) { renderAll(); return }
    S.settings[k] = r.v
    save()
    renderAll()
    if (!had) announce('目安を変えました。' + dueMsg(), 500)
  }
  function flushTh () {
    TH_K.forEach(function (k) { if (own(ui.thPending, k)) onTh(k, 'blur') })
  }
  TH_K.forEach(function (k) {
    $('th-' + k).addEventListener('input', function () { onTh(k, 'input') })
    $('th-' + k).addEventListener('change', function () { onTh(k, 'change') })
    $('th-' + k).addEventListener('blur', function () { if (own(ui.thPending, k)) onTh(k, 'blur') })
  })
  window.addEventListener('pagehide', flushTh)
  function focusVisible (ids) {
    for (var i = 0; i < ids.length; i++) { var e = $(ids[i]); if (shown(e)) { e.focus(); return true } }
    return false
  }
  function markDone (cid) {
    load()
    var before = dueList(S).yet.map(function (x) { return x.cid })
    S.contacts[cid] = TODAY
    save()
    renderAll()
    var d = dueList(S)
    announce(CN[cid] + '様をお声がけ済みにしました（' + TODAY + '）。まだの方 ' + d.yet.length + '人')
    var yetIds = d.yet.map(function (x) { return x.cid })
    var next = before.slice(before.indexOf(cid) + 1).filter(function (c) { return yetIds.indexOf(c) >= 0 })[0]
    if (!(next && focusVisible(['dn-c-' + next, 'dn-t-' + next]))) $('due-done-h').focus()
  }
  function unmarkDone (cid) {
    load()
    delete S.contacts[cid]
    save()
    renderAll()
    announce(CN[cid] + '様のお声がけを取り消しました。まだの方 ' + dueList(S).yet.length + '人')
    $('due-yet-h').focus()
  }
  function doneBtn (cls, id, cid) {
    var b = btn(cls, [icon('i-check', 18), nw('お声がけ済みにする')], id)
    b.setAttribute('aria-label', 'お声がけ済みにする ' + custLabel(cid))
    b.addEventListener('click', function () { markDone(cid) })
    return b
  }
  function overKids (inf, table) {
    var num = add(el('span', 'nw'), [el('span', 'big-n', String(inf.over)), el('span', 'big-u', '日')])
    if (table) return inf.over > 0 ? [add(el('span', 'big-n-box'), num), el('span', 'cell-2', '過ぎています')] : [add(el('span', 'big-n-box'), add(el('span', 'nw'), [el('span', 'big-n', '0'), el('span', 'big-u', '日')])), el('span', 'cell-2', '今日が目安')]
    return inf.over > 0 ? ['目安を ', num, ' 過ぎています'] : '今日が目安の日です'
  }
  function renderDue () {
    syncTh()
    var d = dueList(S)
    $('due-yet-n').textContent = String(d.yet.length)
    $('due-done-n').textContent = String(d.done.length)
    document.querySelector('.summary__box--due').classList.toggle('is-due', d.yet.length > 0)
    $('due-yet-none').hidden = d.yet.length > 0
    $('due-table-box').hidden = !d.yet.length
    var cards = $('due-cards'); cards.textContent = ''
    var tbody = $('due-tbody'); tbody.textContent = ''
    d.yet.forEach(function (inf, i) {
      var li = el('li', 'due-card')
      li.setAttribute('data-id', inf.cid)
      add(li, [
        add(el('div', 'due-card__head'), [el('span', 'due-card__rank', String(i + 1)), nw(custLabel(inf.cid), 'due-card__name'), stateTag(inf.over > 0 ? 'due' : 'today')]),
        add(el('p', 'due-card__over'), overKids(inf, false)),
        add(el('p', 'due-card__last'), ['最後の来店 ', nw(inf.last.date), ' ', menuLabel(inf.last), nw('（経過 ' + inf.el + '日）')]),
        add(el('p', 'due-card__th'), ['目安 ', ML[inf.thKey], ' ', nw(inf.th + '日'), '・目安の日 ', nw(inf.dueDate)]),
        doneBtn('btn-sub due-card__done', 'dn-c-' + inf.cid, inf.cid),
        goBtn('text-btn due-card__go', 'dg-c-' + inf.cid, inf.cid, true)
      ])
      cards.appendChild(li)
      var tr = el('tr'); tr.setAttribute('data-id', inf.cid)
      var th = el('th', 'c-cust'); th.setAttribute('scope', 'row')
      add(th, [nw(custLabel(inf.cid), 'due-name'), goBtn('text-btn', 'dg-t-' + inf.cid, inf.cid, true)])
      add(tr, [
        add(el('td', 'c-rank num'), String(i + 1)), th,
        add(el('td', 'c-over'), overKids(inf, true)),
        add(el('td', 'c-last'), [nw(inf.last.date), el('span', 'cell-2', '経過 ' + inf.el + '日')]),
        add(el('td', 'c-menu'), menuLabel(inf.last)),
        add(el('td', 'c-th'), [nw(inf.th + '日'), el('span', 'cell-2', ML[inf.thKey])]),
        add(el('td', 'c-op'), doneBtn('btn-sub', 'dn-t-' + inf.cid, inf.cid))
      ])
      tbody.appendChild(tr)
    })
    $('due-done-none').hidden = d.done.length > 0
    var dl = $('done-list'); dl.textContent = ''
    d.done.forEach(function (inf) {
      var li = el('li', 'done-card'); li.setAttribute('data-id', inf.cid)
      var ub = btn('btn-sub done-card__undo', [nw('お声がけを取り消す')], 'du-' + inf.cid)
      ub.setAttribute('aria-label', 'お声がけを取り消す ' + custLabel(inf.cid))
      ub.addEventListener('click', function () { unmarkDone(inf.cid) })
      add(li, [
        add(el('div', 'done-card__head'), [nw(custLabel(inf.cid), 'done-card__name'), stateTag('done')]),
        add(el('p', 'done-card__day'), ['お声がけした日 ', nw(inf.contact)]),
        ub
      ])
      dl.appendChild(li)
    })
    wrapWords($('panel-due'))
  }

  // ---------- 月のまとめ（§9） ----------
  function monthRange () {
    var first = S.records.reduce(function (a, r) { return a === null || r.date < a ? r.date : a }, null)
    var start = first ? first.slice(0, 7) : TODAY.slice(0, 7)
    var out = []
    var y = Number(TODAY.slice(0, 4)); var m = Number(TODAY.slice(5, 7))
    while (true) {
      var ym = y + '-' + pad2(m)
      out.push(ym)
      if (ym <= start) break
      m--; if (m === 0) { m = 12; y-- }
    }
    return out
  }
  function defaultMonth () {
    var last = S.records.reduce(function (a, r) { return a === null || r.date > a ? r.date : a }, null)
    return last ? last.slice(0, 7) : TODAY.slice(0, 7)
  }
  function syncMonthOptions () {
    var range = monthRange()
    if (!ui.ym || range.indexOf(ui.ym) < 0) ui.ym = defaultMonth()
    var sel = $('month')
    var cur = Array.prototype.map.call(sel.options, function (o) { return o.value })
    if (cur.join() !== range.join()) {
      sel.textContent = ''
      range.forEach(function (ym) { var o = el('option', null, jpMonth(ym)); o.value = ym; sel.appendChild(o) })
    }
    sel.value = ui.ym
  }
  function monthMsg (ms) { return jpMonth(ms.ym) + '。来店 ' + ms.people + '人・' + ms.count + '件・売上 ' + yen(ms.sales) }
  function setDisabled (b, off, descId) {
    if (off) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', descId) } else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby') }
    $(descId).hidden = !off
  }
  function renderMonth () {
    syncMonthOptions()
    var ms = monthSummary(S, ui.ym)
    var mj = jpMonth(ui.ym)
    $('ms-ppl').textContent = String(ms.people)
    $('ms-ppl-note').textContent = '新規 ' + ms.newN + '人・再来 ' + ms.repN + '人'
    $('ms-new').textContent = String(ms.newN)
    $('ms-rep').textContent = String(ms.repN)
    $('ms-cnt').textContent = String(ms.count)
    $('ms-sales').textContent = ms.sales.toLocaleString('ja-JP')
    $('menu-cap').textContent = mj + ' メニュー別の件数と売上'
    $('staff-cap').textContent = mj + ' 担当別の件数と売上'
    var mt = $('menu-tbody'); mt.textContent = ''
    MK.forEach(function (k) {
      var th = el('th', 'c-k', ML[k]); th.setAttribute('scope', 'row')
      add(mt, add(el('tr'), [th, el('td', 'num', ms.menu[k].n + '件'), el('td', 'num', yen(ms.menu[k].yen))]))
    })
    var stb = $('staff-tbody'); stb.textContent = ''
    STAFF_K.forEach(function (k) {
      var th = el('th', 'c-k', SN[k]); th.setAttribute('scope', 'row')
      add(stb, add(el('tr'), [th, el('td', 'num', ms.staff[k].n + '件'), el('td', 'num', yen(ms.staff[k].yen))]))
    })
    $('ml-n').textContent = ms.count + '件'
    $('ml-none').hidden = ms.count > 0
    $('ml-table-box').hidden = !ms.count
    $('ml-cap').textContent = mj + 'の来店（日付の古い順）'
    var ul = $('month-list'); ul.textContent = ''
    var tb = $('ml-tbody'); tb.textContent = ''
    ms.rows.forEach(function (x) {
      var r = x.r
      var li = el('li', 'ml-item'); li.setAttribute('data-id', r.id)
      add(li, [nw(r.date.slice(5), 'ml-item__date'), nw(CN[r.cid] + '様', 'ml-item__name'), x.isNew ? stateTag('new') : null, el('span', 'ml-item__menu', menuLabel(r)), nw(yen(x.total), 'ml-item__total')])
      ul.appendChild(li)
      var tr = el('tr'); tr.setAttribute('data-id', r.id)
      add(tr, [add(el('td', 'c-date'), nw(r.date)), add(el('td', 'c-cust'), nw(custLabel(r.cid))), add(el('td', 'c-no'), [nw(x.no + '回目'), x.isNew ? ' ' : null, x.isNew ? stateTag('new') : null]),
        add(el('td', 'c-menu'), menuLabel(r)), add(el('td', 'c-staff'), nw(SN[r.staff])), add(el('td', 'c-total num'), nw(yen(x.total)))])
      tb.appendChild(tr)
    })
    var empty = ms.count === 0
    setDisabled($('btn-csv'), empty, 'csv-none')
    setDisabled($('btn-print'), empty, 'print-none')
    var cn = $('csv-name'); cn.textContent = ''
    add(cn, ['ファイル名：', nw(csvName()), nw('（' + ms.count + '件）')])
    $('csv-peek').textContent = buildCsv(S, ui.ym).slice(1).split('\r\n').filter(function (l) { return l !== '' }).slice(0, 4).join('\n')
    wrapWords($('panel-month'))
  }
  function csvName () { return 'soyogi_karte_' + ui.ym + '.csv' }
  $('month').addEventListener('change', function () {
    load()
    ui.ym = $('month').value
    renderAll()
    announce(monthMsg(monthSummary(S, ui.ym)))
  })

  // 表が枠より広い時だけ、横に動く枠にフォーカスが入るようにする（§9-2）
  function syncScrollBoxes () {
    Array.prototype.forEach.call(document.querySelectorAll('.mt__scroll'), function (b) {
      if (b.scrollWidth > b.clientWidth + 1) { b.tabIndex = 0; b.setAttribute('role', 'group'); b.setAttribute('aria-label', b.getAttribute('data-label')) } else { b.removeAttribute('tabindex'); b.removeAttribute('role'); b.removeAttribute('aria-label') }
    })
  }
  window.addEventListener('resize', syncScrollBoxes)
  function renderToday () { $('today-main').textContent = '今日 ' + jpDate(TODAY) }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    renderToday()
    renderSearch()
    renderKarte()
    renderDue()
    renderMonth()
    syncScrollBoxes()
    // 作り直したボタンにフォーカスがあった時は、同じ id のボタンへ戻す
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }

  // ---------- CSV ----------
  function renderCols () {
    var tb = $('csv-cols'); tb.textContent = ''
    CSV_COLS.forEach(function (c, i) { add(tb, add(el('tr'), [el('td', null, String(i + 1)), el('td', 'nw', c[0]), el('td', null, c[1])])) })
  }
  $('btn-csv').addEventListener('click', function () {
    load()
    var ms = monthSummary(S, ui.ym)
    if (!ms.count) { announce('この月の記録はありません'); return }
    var blob = new Blob([buildCsv(S, ui.ym)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url; a.download = csvName()
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    showToast('CSV を作りました（' + jpMonth(ui.ym) + '・' + ms.count + '件）')
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
  var PRINT_ROWS = 25
  var PRINT_LIST_COLS = [['日付', 18], ['お客様', 40], ['何回目', 24, 1], ['メニュー', 48, 0, 1], ['担当', 16], ['合計', 0, 1]]
  var PRINT_SIDE_COLS = [['', 38], ['件数', 20, 1], ['売上', 0, 1]]
  function buildSheet () {
    var ms = monthSummary(S, ui.ym)
    var shop = el('p', 'sheet__shop', SHOP + '　' + jpMonth(ui.ym) + 'の来店のまとめ')
    shop.appendChild(stampSvg())
    var menuCols = PRINT_SIDE_COLS.map(function (c, i) { return i === 0 ? ['メニュー', c[1]] : c })
    var staffCols = PRINT_SIDE_COLS.map(function (c, i) { return i === 0 ? ['担当', c[1]] : c })
    var list = ms.rows.slice(0, PRINT_ROWS).map(function (x) {
      return [x.r.date.slice(5), custLabel(x.r.cid), x.no + '回目' + (x.isNew ? '（新規）' : ''), menuLabel(x.r), SN[x.r.staff], yen(x.total)]
    })
    return add(el('div', 'sheet'), [
      add(el('div', 'sheet__head'), shop),
      el('p', 'sheet__cond', '今日 ' + TODAY + '（デモの日付）で作成'),
      el('p', 'sheet__sum', '来店人数 ' + ms.people + '人（新規 ' + ms.newN + '人・再来 ' + ms.repN + '人）／来店件数 ' + ms.count + '件／売上 ' + yen(ms.sales)),
      add(el('div', 'sheet__two'), [
        add(el('div'), [el('p', 'sheet__h', 'メニュー別'), sheetTable(menuCols, MK.map(function (k) { return [ML[k], ms.menu[k].n + '件', yen(ms.menu[k].yen)] }), 'sheet__menu')]),
        add(el('div'), [el('p', 'sheet__h', '担当別'), sheetTable(staffCols, STAFF_K.map(function (k) { return [SN[k], ms.staff[k].n + '件', yen(ms.staff[k].yen)] }), 'sheet__staff')])
      ]),
      el('p', 'sheet__h', 'この月の来店（' + ms.count + '件）'),
      sheetTable(PRINT_LIST_COLS, list, 'sheet__list'),
      ms.count > PRINT_ROWS ? el('p', 'sheet__more', 'ほか ' + (ms.count - PRINT_ROWS) + '件（CSV をご覧ください）') : null,
      el('p', 'sheet__foot', 'デモ（架空のお店）です。お客様・記録はすべて架空です。TENKA LAB の制作見本です。')
    ])
  }
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  function fillPrint () { load(); elPrintRoot.textContent = ''; elPrintRoot.appendChild(buildSheet()) }
  $('btn-print').addEventListener('click', function () {
    load()
    if (!monthSummary(S, ui.ym).count) { announce('この月の記録はありません'); return }
    fillPrint()
    document.title = 'soyogi_karte_' + ui.ym
    window.print()
  })
  window.addEventListener('beforeprint', function () {
    if (!elPrintRoot.firstChild) fillPrint()
    document.title = 'soyogi_karte_' + ui.ym
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  // ---------- 見本に戻す（§12-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox().then(function (yes) {
      if (!yes) return
      S = sample()
      save()
      ui.cid = 'C-001'; ui.ym = null; ui.q = ''; ui.lastAdded = null; ui.thPending = {}
      $('q').value = ''
      $('note-broken').hidden = true
      resetForm()
      TH_K.forEach(function (k) { clearThErr(k); $('th-' + k).value = String(S.settings[k]) })
      renderAll()
      $('btn-reset').focus()
      showToast('見本に戻しました')
    })
  })

  // ---------- 2つのタブの同期（§12-3） ----------
  window.addEventListener('storage', function (e) {
    if (!canSave) return
    if (e.key !== null && e.key !== KEY) return
    if (e.key === null || e.newValue === null) { S = sample(); ui.thPending = {}; save() } else { load(); keepPending() }
    renderAll()
    announce('別の画面で記録が変わりました')
  })

  // ---------- はじめ ----------
  load()
  if (!canSave) $('note-nosave').hidden = false
  CUST.forEach(function (c) { var o = el('option', null, c.id + ' ' + c.name + '様'); o.value = c.id; $('karte-cust').appendChild(o) })
  renderCols()
  resetForm()
  TH_K.forEach(function (k) { $('th-' + k).value = String(S.settings[k]) })
  wrapWords(document.body)
  renderAll()
  openTab(ui.tab, { noScroll: true })

  // 検査用（状態を引数で受ける純粋な関数だけ。画面の状態は出さない）
  window.__demo20 = { dayNum: dayNum, elapsed: elapsed, threshold: threshold, dueList: dueList, monthSummary: monthSummary, matchCust: matchCust, parseDate: parseDate, parseYen: parseYen, parseColor: parseColor, checkMemo: checkMemo, parseTh: parseTh, validate: validate, csvCell: csvCell, buildCsv: buildCsv, sample: sample, TODAY: TODAY }
})()
