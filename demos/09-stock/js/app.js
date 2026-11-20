// 焼き菓子と珈琲 ハルツグ（デモ）在庫・発注の管理
// 表示する値はすべて textContent / setAttribute で入れる（入力値・メモを innerHTML に入れない）
// 数量は最初から最後まで「10倍の整数」（qty10）で持つ。2.7kg → 27、24個 → 240
(function () {
  'use strict'

  // ---------- 固定の値（design.md §14。乱数なし） ----------
  var SHOP = '焼き菓子と珈琲 ハルツグ（架空）'
  var SUPPLIERS = {
    A: '仕入先A 製菓材料（架空）',
    B: '仕入先B 乳製品・珈琲豆（架空）',
    C: '仕入先C 包材（架空）'
  }
  var SUP_ORDER = ['A', 'B', 'C']
  // no, 品目, 分類, 単位, 小数可, 現在庫10, 発注点10, 目標10, 発注単位10, 単価, 仕入先
  var ITEM_ROWS = [
    [1, '薄力粉', '材料', 'kg', true, 52, 50, 150, 50, 300, 'A'],
    [2, '強力粉', '材料', 'kg', true, 40, 20, 60, 10, 360, 'A'],
    [3, 'アーモンドプードル', '材料', 'kg', true, 8, 10, 30, 10, 2400, 'A'],
    [4, 'グラニュー糖', '材料', 'kg', true, 80, 40, 120, 10, 280, 'A'],
    [5, '粉糖', '材料', 'kg', true, 15, 10, 30, 10, 520, 'A'],
    [6, 'バター（食塩不使用）', '材料', 'kg', true, 12, 18, 45, 9, 1800, 'B'],
    [7, '卵', '材料', '個', false, 240, 300, 900, 100, 30, 'B'],
    [8, '牛乳', '材料', 'L', true, 30, 20, 60, 10, 250, 'B'],
    [9, '生クリーム（乳脂肪35%）', '材料', 'L', true, 0, 10, 30, 10, 1400, 'B'],
    [10, 'クルミ', '材料', 'kg', true, 6, 5, 20, 10, 2200, 'A'],
    [11, '製菓用チョコレート', '材料', 'kg', true, 4, 10, 30, 10, 1900, 'A'],
    [12, 'コーヒー豆（ブレンド）', '材料', 'kg', true, 15, 20, 60, 5, 3200, 'B'],
    [13, 'コーヒー豆（デカフェ）', '材料', 'kg', true, 10, 5, 15, 5, 3800, 'B'],
    [14, '紙袋（小）', '包材', '枚', false, 1800, 1000, 4000, 1000, 12, 'C'],
    [15, '紙袋（大）', '包材', '枚', false, 600, 500, 2000, 500, 18, 'C'],
    [16, '焼き菓子の箱（6個入り）', '包材', '枚', false, 0, 200, 600, 200, 85, 'C'],
    [17, '個包装の袋', '包材', '枚', false, 2000, 2000, 6000, 1000, 4, 'C'],
    [18, '脱酸素剤', '包材', '個', false, 3000, 2000, 6000, 1000, 3, 'C'],
    [19, 'テイクアウトカップ（240ml）', '包材', '個', false, 1400, 1000, 4000, 500, 15, 'C'],
    [20, 'カップのふた', '包材', '個', false, 1600, 1000, 4000, 500, 8, 'C']
  ]
  var ITEMS = ITEM_ROWS.map(function (r) {
    return { no: r[0], name: r[1], cat: r[2], unit: r[3], dec: r[4], stock10: r[5], rop10: r[6], target10: r[7], lot10: r[8], price: r[9], sup: r[10] }
  })
  function itemOf (no) { return ITEMS[no - 1] }

  // 最初の入荷待ち（バター 2.7kg、11/18 発注）
  var INIT_WAIT = { 6: { wait10: 27, waitAt: '2026-11-18T16:30:00+09:00' } }
  // 最初の履歴12件（古い順）
  var INIT_HIST = [
    [1, '2026-11-02T09:10:00+09:00', 4, '入荷', 50, 100, '', false, null],
    [2, '2026-11-05T14:30:00+09:00', 4, '使用', -20, 80, '', false, null],
    [3, '2026-11-07T08:45:00+09:00', 7, '入荷', 600, 840, '', false, null],
    [4, '2026-11-10T16:00:00+09:00', 9, '使用', -10, 0, '', false, null],
    [5, '2026-11-12T18:00:00+09:00', 14, '使用', -500, 1800, '', false, null],
    [6, '2026-11-14T13:15:00+09:00', 16, '使用', -200, 0, '週末の詰め合わせ', false, null],
    [7, '2026-11-15T11:20:00+09:00', 7, '使用', -600, 240, '', false, null],
    [8, '2026-11-16T09:30:00+09:00', 12, '使用', -10, 15, '', false, null],
    [9, '2026-11-17T17:40:00+09:00', 1, '使用', -25, 52, '', false, null],
    [10, '2026-11-18T10:05:00+09:00', 8, '使用', -10, 20, '', true, null],
    [11, '2026-11-18T10:06:00+09:00', 8, '取り消し', 10, 30, '2026/11/18（水）10:05 の使用を取り消し', false, 10],
    [12, '2026-11-19T15:00:00+09:00', 18, '廃棄', -200, 3000, '開封後に期限切れ', false, null]
  ]
  var KINDS = ['入荷', '使用', '廃棄', '取り消し', '棚卸調整']
  var KIND_ICON = { 入荷: 'in', 使用: 'whisk', 廃棄: 'trash', 取り消し: 'undo', 棚卸調整: 'clip' }
  var KIND_HINT = { 入荷: '届いた量を足します', 使用: '使った量を引きます', 廃棄: '傷んだ・割れた等で捨てた量を引きます' }
  var STATE_LABEL = { ok: '足りる', low: '少ない', out: '切れ' }
  var STORE_KEY = 'tenkaLab.demo09.stock.v1'
  var HIST_KEEP = 300
  var HIST_PAGE = 30
  var MAX10 = 999999 // 99,999.9
  var WEEK = ['日', '月', '火', '水', '木', '金', '土']

  // ---------- 数・金額・日時の書き方（§2-1・§13-1） ----------
  var yenFmt = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
  function fmtYen (n) { return yenFmt.format(n).replace('￥', '¥') }
  function commas (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
  var MINUS = '−'
  // 数だけ（単位なし）。toFixed を使わず、整数部と小数1桁を文字でつなぐ
  function fmtNum (q10, dec) {
    var a = Math.abs(q10)
    var s = dec ? commas(Math.trunc(a / 10)) + '.' + (a % 10) : commas(Math.trunc(a / 10))
    return (q10 < 0 ? MINUS : '') + s
  }
  function fmtQty (q10, it) { return fmtNum(q10, it.dec) + it.unit }
  function fmtDelta (d10, it) {
    if (d10 === 0) return '±0'
    return (d10 > 0 ? '+' : '') + fmtQty(d10, it)
  }
  function fmtRate (d10, b10) {
    if (b10 <= 0) return '—'
    if (d10 === 0) return '0.0%'
    var r = Math.round(Math.abs(d10) * 1000 / Math.abs(b10))
    return (d10 > 0 ? '+' : MINUS) + Math.trunc(r / 10) + '.' + (r % 10) + '%'
  }
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  function fmtDT (iso) {
    var d = new Date(iso)
    return d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '（' + WEEK[d.getDay()] + '）' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
  }
  function fmtShort (iso) { var d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEK[d.getDay()] + '）' }
  function fmtJP (d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WEEK[d.getDay()] + '）' }
  function isoDay (d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) }

  // ---------- 数量の読み取り（§8-2）。parseFloat を使わない ----------
  // ctx: { zero: 0 を許すか, dec: 小数を許すか, unit, label }
  // 戻り値 { v: qty10 } か { err: 文言 }。空は { empty: true, err }
  function parseQty (raw, ctx) {
    var s = String(raw)
      .replace(/^[\s　]+|[\s　]+$/g, '')
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
      .replace(/．/g, '.')
      .replace(/[,，]/g, '')
    var shapeMsg = ctx.zero
      ? ctx.label + 'は 0 以上の数で入れてください（小数は第1位まで）'
      : '数量は 0 より大きい数で入れてください（小数は第1位まで）'
    if (s === '') return { empty: true, err: ctx.label + 'を入れてください' }
    var m = /^(\d+)(?:\.(\d))?$/.exec(s)
    if (!m) return { err: shapeMsg }
    var ip = m[1].replace(/^0+(?=\d)/, '')
    var fd = m[2] ? Number(m[2]) : 0
    var big = ip.length > 6
    var v = big ? MAX10 + 1 : Number(ip) * 10 + fd
    if (v === 0 && !ctx.zero) return { err: shapeMsg }
    if (!ctx.dec && fd !== 0) return { err: 'この品目は1' + ctx.unit + '単位（整数）で入れてください' }
    if (v > MAX10) return { err: ctx.label + 'は 99,999.9 までにしてください' }
    return { v: v }
  }

  // ---------- 状態・金額・発注（§11-1・§18-3・§18-4） ----------
  function stateOf (stock10, rop10) {
    if (stock10 <= 0) return 'out'
    if (stock10 <= rop10) return 'low'
    return 'ok'
  }
  function yenOf (stock10, price) { return Math.round(Math.max(0, stock10) * price / 10) }

  // ---------- 状態（保存するもの） ----------
  var S = null // { st: [{ stock10, wait10, waitAt }]（no-1 の順）, hist: [...] }
  function initialState () {
    return {
      st: ITEMS.map(function (it) {
        var w = INIT_WAIT[it.no]
        return { stock10: it.stock10, wait10: w ? w.wait10 : 0, waitAt: w ? w.waitAt : null }
      }),
      hist: INIT_HIST.map(function (r) {
        return { seq: r[0], at: r[1], no: r[2], kind: r[3], d10: r[4], after10: r[5], memo: r[6], undone: r[7], undoOf: r[8] }
      })
    }
  }
  function stOf (no) { return S.st[no - 1] }
  function isInt (n) { return typeof n === 'number' && Number.isInteger(n) }

  // ---------- 保存（§13-2・§13-3） ----------
  var canSave = false
  try {
    window.localStorage.setItem('tenkaLab.test', '1')
    window.localStorage.removeItem('tenkaLab.test')
    canSave = true
  } catch (e) { canSave = false }

  function loadState () {
    if (!canSave) return null
    try {
      var raw = window.localStorage.getItem(STORE_KEY)
      if (!raw) return null
      var d = JSON.parse(raw)
      if (!d || d.v !== 1 || !Array.isArray(d.items) || d.items.length !== 20 || !Array.isArray(d.hist)) return null
      var st = []
      for (var i = 0; i < 20; i++) {
        var x = d.items[i]
        if (!x || x.no !== i + 1 || !isInt(x.stock10) || !isInt(x.wait10) || x.wait10 < 0 || Math.abs(x.stock10) > 99999999) return null
        if (x.wait10 > 0 && (typeof x.waitAt !== 'string' || isNaN(new Date(x.waitAt).getTime()))) return null
        st.push({ stock10: x.stock10, wait10: x.wait10, waitAt: x.wait10 > 0 ? x.waitAt : null })
      }
      var seen = {}
      var hist = []
      for (var j = 0; j < d.hist.length; j++) {
        var h0 = d.hist[j]
        if (!h0 || !isInt(h0.seq) || h0.seq < 1 || seen[h0.seq] || typeof h0.at !== 'string' || isNaN(new Date(h0.at).getTime()) ||
          !isInt(h0.no) || h0.no < 1 || h0.no > 20 || KINDS.indexOf(h0.kind) < 0 || !isInt(h0.d10) || !isInt(h0.after10) ||
          typeof h0.memo !== 'string' || typeof h0.undone !== 'boolean' || !(h0.undoOf === null || isInt(h0.undoOf))) return null
        seen[h0.seq] = true
        hist.push({ seq: h0.seq, at: h0.at, no: h0.no, kind: h0.kind, d10: h0.d10, after10: h0.after10, memo: h0.memo.slice(0, 200), undone: h0.undone, undoOf: h0.undoOf })
      }
      hist.sort(function (a, b) { return a.seq - b.seq })
      return { st: st, hist: hist }
    } catch (e) { return null }
  }
  function saveState () {
    if (S.hist.length > HIST_KEEP) S.hist = S.hist.slice(S.hist.length - HIST_KEEP)
    if (!canSave) return
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 1,
        items: S.st.map(function (x, i) { return { no: i + 1, stock10: x.stock10, wait10: x.wait10, waitAt: x.waitAt } }),
        hist: S.hist
      }))
    } catch (e) { /* 保存に失敗しても画面は止めない */ }
  }

  // ---------- DOM の小道具（⑧と同じ） ----------
  var $ = function (id) { return document.getElementById(id) }
  function h (tag, props, kids) {
    var el = document.createElement(tag)
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k]
        if (v === null || v === undefined || v === false) return
        if (k === 'class') el.className = v
        else if (k === 'text') el.textContent = v
        else if (k === 'hidden') el.hidden = true
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v)
        else el.setAttribute(k, v === true ? '' : String(v))
      })
    }
    append(el, kids)
    return el
  }
  function append (el, kids) {
    if (kids === null || kids === undefined) return
    if (!Array.isArray(kids)) kids = [kids]
    kids.forEach(function (k) {
      if (k === null || k === undefined || k === false) return
      if (Array.isArray(k)) append(el, k)
      else if (typeof k === 'string' || typeof k === 'number') el.appendChild(document.createTextNode(String(k)))
      else el.appendChild(k)
    })
  }
  // 固定の SVG だけを作る（入力値は入れない）
  function icon (name, size) {
    var t = document.createElement('template')
    var s = size || 14
    var body = ICON[name]
    t.innerHTML = name === 'stamp' ? body : '<svg width="' + s + '" height="' + s + '" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + body + '</svg>'
    return t.content.firstChild
  }
  var SW = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  var ICON = {
    ok: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M5 8.3l2 2 4-4.3"' + SW + '/>',
    low: '<path d="M8 1.8L15 14H1z"' + SW + '/><path d="M8 6.5v3"' + SW + '/><circle cx="8" cy="11.8" r="1" fill="currentColor"/>',
    out: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"' + SW + '/>',
    wait: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M8 4.5V8l2.5 1.8"' + SW + '/>',
    in: '<path d="M8 1v7M5 5l3 3 3-3"' + SW + '/><path d="M2 9v5h12V9M2 9h3.5l1 1.5h3l1-1.5H14"' + SW + '/>',
    whisk: '<path d="M8 15v-4"' + SW + '/><path d="M8 11C2.5 9 2.5 2 8 1c5.5 1 5.5 8 0 10z"' + SW + '/><path d="M8 11C5.8 8.5 5.8 3.5 8 1M8 11c2.2-2.5 2.2-7.5 0-10"' + SW + '/>',
    trash: '<path d="M2 4h12M6 4V2h4v2M3.5 4l1 10h7l1-10M6.5 7v4M9.5 7v4"' + SW + '/>',
    undo: '<path d="M3 3v4h4"' + SW + '/><path d="M3.3 7A5.5 5.5 0 1 1 4 11.5"' + SW + '/>',
    clip: '<path d="M5.5 2.5H3.5v12h9v-12h-2"' + SW + '/><path d="M5.5 1.5h5v2.5h-5z"' + SW + '/><path d="M5.5 9.5l1.8 1.8 3.2-3.5"' + SW + '/>',
    pencil: '<path d="M10.5 2.5l3 3L5.5 13.5H2.5v-3z M9 4l3 3"' + SW + '/>',
    print: '<path d="M4 6V1.5h8V6M4 12H2V6.5h12V12h-2"' + SW + '/><path d="M4 9.5h8V15H4z"' + SW + '/>',
    arrowR: '<path d="M2 8h11M9 4l4 4-4 4"' + SW + '/>',
    chev: '<path d="M6 3l5 5-5 5"' + SW + '/>',
    stamp: '<svg class="stamp" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="見本の印（この発注書は見本です）">' +
      '<rect x="1.5" y="1.5" width="53" height="53" rx="4" fill="none" stroke="#B23A2E" stroke-width="3"/>' +
      '<rect x="6.5" y="6.5" width="43" height="43" rx="2" fill="none" stroke="#B23A2E" stroke-width="1"/>' +
      '<text x="28" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">見</text>' +
      '<text x="28" y="45" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">本</text>' +
      '</svg>'
  }
  // HTML に置いた data-icon の入れ物に SVG を入れる
  function fillIcons (root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-icon]'), function (el) {
      if (el.firstChild) return
      var n = el.getAttribute('data-icon')
      var size = n === 'pencil' || n === 'clip' ? 20 : n === 'undo18' ? 18 : 16
      el.appendChild(icon(n === 'undo18' ? 'undo' : n, size))
    })
  }

  // 札（§1-2）
  function stateTag (st) {
    return h('span', { class: 'state', 'data-state': st }, [icon(st, 14), STATE_LABEL[st]])
  }
  function waitTag () { return h('span', { class: 'state', 'data-state': 'wait', 'data-wait': '1' }, [icon('wait', 14), '入荷待ち']) }
  function tagsFor (no) {
    var it = itemOf(no); var x = stOf(no)
    var box = h('span', { class: 'tags' }, stateTag(stateOf(x.stock10, it.rop10)))
    if (x.wait10 > 0) box.appendChild(waitTag())
    return box
  }
  function kindTag (kind) { return h('span', { class: 'kind' }, [icon(KIND_ICON[kind], 14), kind]) }
  function deltaEl (d10, it, tag) {
    var cls = d10 > 0 ? 'd-plus' : d10 < 0 ? 'd-minus' : 'd-zero'
    return h(tag || 'span', { class: 'delta ' + cls, text: fmtDelta(d10, it) })
  }

  // ---------- 画面の状態（保存しない） ----------
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var ui = {
    tab: 'rec',
    fState: 'all', // all / alert
    fCat: 'all', // all / 材料 / 包材
    cCat: 'all',
    kind: '使用',
    recErrShown: false,
    histLimit: HIST_PAGE,
    edits: {}, // 発注の手直し no → { raw, v, err }
    counts: {} // 棚卸の入力 no → raw
  }

  // ---------- 発注の計算（§11-1）。バッジ・合計・印刷もこの結果を使う ----------
  function autoPlan () {
    var list = []
    ITEMS.forEach(function (it) {
      var x = stOf(it.no)
      var have = x.stock10 + x.wait10
      if (have > it.rop10) return
      var short10 = Math.max(0, it.target10 - have)
      var auto10 = Math.ceil(short10 / it.lot10) * it.lot10
      list.push({ it: it, short10: short10, auto10: auto10 })
    })
    return list
  }
  function plan () {
    var rows = autoPlan().map(function (r) {
      var e = ui.edits[r.it.no]
      var q10 = e ? (e.err ? null : e.v) : r.auto10
      return { it: r.it, short10: r.short10, auto10: r.auto10, edited: !!e, err: e ? e.err : null, raw: e ? e.raw : null, q10: q10, yen: q10 === null ? 0 : Math.round(q10 * r.it.price / 10) }
    })
    var sups = SUP_ORDER.map(function (k) {
      var rs = rows.filter(function (r) { return r.it.sup === k })
      var live = rs.filter(function (r) { return r.q10 > 0 })
      return { key: k, name: SUPPLIERS[k], rows: rs, live: live, yen: live.reduce(function (a, r) { return a + r.yen }, 0), err: rs.some(function (r) { return r.err }) }
    }).filter(function (s) { return s.rows.length > 0 })
    var liveSups = sups.filter(function (s) { return s.live.length > 0 })
    return {
      rows: rows,
      sups: sups,
      liveSups: liveSups,
      count: rows.filter(function (r) { return r.q10 > 0 }).length,
      yen: sups.reduce(function (a, s) { return a + s.yen }, 0)
    }
  }
  function formula (r) {
    var it = r.it; var x = stOf(it.no)
    var s = '目標 ' + fmtNum(it.target10, it.dec) + ' − 在庫 ' + fmtNum(x.stock10, it.dec)
    if (x.wait10 > 0) s += ' − 入荷待ち ' + fmtNum(x.wait10, it.dec)
    s += ' ＝ ' + fmtNum(r.short10, it.dec) + ' → ' + fmtQty(it.lot10, it) + ' 単位で ' + fmtQty(r.auto10, it)
    return s
  }

  // ---------- 知らせ ----------
  var elStatus = $('sr-status')
  function announce (msg) {
    elStatus.textContent = ''
    window.setTimeout(function () { elStatus.textContent = msg }, 50)
  }
  var toastTimer = null
  function showToast (text) {
    var t = $('toast')
    $('toast-text').textContent = text
    t.hidden = false
    t.classList.remove('is-in')
    void t.offsetWidth
    if (!reduceMotion) t.classList.add('is-in')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { t.hidden = true }, 3000)
    announce(text)
  }

  // ---------- 確認の窓（§13-4） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null
  var dlgOpener = null
  var dlgFallbackFocus = null
  function confirmBox (opt) {
    return new Promise(function (resolve) {
      if (!hasDialog) {
        var text = opt.title + '\n\n' + opt.body + (opt.list && opt.list.length ? '\n' + opt.list.map(function (s) { return '・' + s }).join('\n') : '')
        resolve(window.confirm(text))
        return
      }
      dlgOpener = document.activeElement
      dlgFallbackFocus = opt.fallback || null
      $('cf-title').textContent = opt.title
      $('cf-body').textContent = opt.body
      var ul = $('cf-list')
      ul.textContent = ''
      if (opt.list && opt.list.length) {
        opt.list.forEach(function (s) { ul.appendChild(h('li', { text: s })) })
        ul.hidden = false
      } else ul.hidden = true
      $('cf-ok').textContent = opt.ok
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
    // 開いたボタンにフォーカスを戻す（描き直しで消えていたら代わりの所へ）
    window.setTimeout(function () {
      if (document.activeElement && document.activeElement !== document.body && !dlg.contains(document.activeElement)) return
      var target = dlgOpener && document.contains(dlgOpener) ? dlgOpener : dlgFallbackFocus
      if (target) target.focus()
    }, 0)
  }
  $('cf-ok').addEventListener('click', function () { closeDlg(true) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(false) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(false) })

  // ---------- 切替（.seg、ラジオの動き） ----------
  function makeSeg (box, opts, cur, onPick) {
    box.textContent = ''
    opts.forEach(function (o) {
      var on = o.v === cur
      var b = h('button', { type: 'button', class: 'seg__btn', role: 'radio', 'aria-checked': on ? 'true' : 'false', tabindex: on ? '0' : '-1', 'data-v': o.v }, [o.icon ? icon(o.icon, 16) : null, o.label])
      // onPick で box の中が作り直されるので、選んだボタンにフォーカスを戻す（Enter・Space で選んだ時にフォーカスが消えないように）
      b.addEventListener('click', function () {
        onPick(o.v)
        var nb = box.querySelector('.seg__btn[data-v="' + o.v + '"]')
        if (nb && document.activeElement !== nb) nb.focus()
      })
      box.appendChild(b)
    })
    box.onkeydown = function (e) {
      var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
      if (keys.indexOf(e.key) < 0) return
      e.preventDefault()
      var btns = Array.prototype.slice.call(box.querySelectorAll('.seg__btn'))
      var i = btns.indexOf(document.activeElement)
      if (i < 0) i = 0
      var n = btns.length
      var j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? (i - 1 + n) % n : (i + 1) % n
      onPick(btns[j].getAttribute('data-v'))
      var nb = box.querySelector('.seg__btn[data-v="' + btns[j].getAttribute('data-v') + '"]')
      if (nb) nb.focus()
    }
  }
  var CAT_OPTS = [{ v: 'all', label: 'すべての分類' }, { v: '材料', label: '材料' }, { v: '包材', label: '包材' }]

  // ---------- タブ（§7） ----------
  var TABS = ['rec', 'order', 'count']
  function openTab (name, opt) {
    ui.tab = name
    TABS.forEach(function (t) {
      var on = t === name
      var tb = $('tab-' + t)
      tb.setAttribute('aria-selected', on ? 'true' : 'false')
      tb.tabIndex = on ? 0 : -1
      $('panel-' + t).hidden = !on
    })
    if (!(opt && opt.noScroll)) {
      // パネルの先頭がタブより上に隠れていたら、タブの下まで戻す
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
    var i = TABS.indexOf(ui.tab)
    var j = null
    if (e.key === 'ArrowRight') j = (i + 1) % 3
    else if (e.key === 'ArrowLeft') j = (i + 2) % 3
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = 2
    if (j === null) return
    e.preventDefault()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  // 見出し・カードへ移る（貼り付いたタブの下に来るように scroll-margin を CSS で付けている）
  function goTo (el, focusEl) {
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    if (focusEl) focusEl.focus({ preventScroll: true })
  }

  // ---------- 描き直し ----------
  function renderAll () {
    renderSummary()
    renderRecInfo()
    renderStock()
    renderHist()
    renderOrder()
    renderCount()
  }

  // 上の数字（§6）と、タブのバッジ
  function renderSummary () {
    var low = 0; var out = 0; var wait = 0; var yen = 0
    ITEMS.forEach(function (it) {
      var x = stOf(it.no)
      var st = stateOf(x.stock10, it.rop10)
      if (st === 'low') low++
      if (st === 'out') out++
      if (x.wait10 > 0) wait++
      yen += yenOf(x.stock10, it.price)
    })
    $('sum-low-n').textContent = String(low)
    $('sum-out-n').textContent = String(out)
    $('sum-wait-n').textContent = String(wait)
    $('sum-yen-n').textContent = fmtYen(yen)
    $('sum-low').setAttribute('aria-label', '少ない ' + low + '品目')
    $('sum-out').setAttribute('aria-label', '切れ ' + out + '品目')
    $('sum-wait').setAttribute('aria-label', '入荷待ち ' + wait + '品目')
    $('sum-yen').setAttribute('aria-label', '在庫金額の合計 ' + fmtYen(yen) + '（税抜の参考）')
    $('sum-low-link').parentNode.hidden = low === 0
    $('sum-out-link').parentNode.hidden = out === 0
    $('sum-wait-link').parentNode.hidden = wait === 0
    var p = plan()
    var badge = $('tab-order-badge')
    badge.textContent = p.count > 0 ? String(p.count) : ''
    badge.hidden = p.count === 0
    $('tab-order').setAttribute('aria-label', p.count > 0 ? '発注リスト（' + p.count + '品目）' : '発注リスト')
  }

  // ---------- 記録する（§8） ----------
  var elItem = $('rec-item')
  var elQty = $('rec-qty')
  var elMemo = $('rec-memo')
  ;['材料', '包材'].forEach(function (cat) {
    var g = h('optgroup', { label: cat })
    ITEMS.filter(function (it) { return it.cat === cat }).forEach(function (it) {
      g.appendChild(h('option', { value: String(it.no), text: it.name + '（' + it.unit + '）' }))
    })
    elItem.appendChild(g)
  })
  elItem.value = '1'
  function curItem () { return itemOf(Number(elItem.value)) }
  function renderKindSeg () {
    makeSeg($('rec-kind'), [{ v: '入荷', label: '入荷', icon: 'in' }, { v: '使用', label: '使用', icon: 'whisk' }, { v: '廃棄', label: '廃棄', icon: 'trash' }], ui.kind, function (v) {
      ui.kind = v
      renderKindSeg()
      renderRecPreview()
    })
    $('rec-kind-hint').textContent = KIND_HINT[ui.kind]
  }
  function renderRecInfo () {
    var it = curItem(); var x = stOf(it.no)
    var now = $('rec-now')
    now.textContent = ''
    append(now, [h('span', { class: 'rec__nowtext' }, ['いまの在庫 ', h('strong', { text: fmtQty(x.stock10, it) }), '・発注点 ' + fmtQty(it.rop10, it)]), tagsFor(it.no)])
    $('rec-qty-label').textContent = '数量（' + it.unit + '）'
    $('rec-qty-unit').textContent = it.unit
    $('rec-qty-hint').textContent = it.dec ? '0.1' + it.unit + ' 単位で入れられます' : '1' + it.unit + ' 単位（整数）で入れます'
    renderRecPreview()
  }
  function recParse () {
    var it = curItem()
    return parseQty(elQty.value, { zero: false, dec: it.dec, unit: it.unit, label: '数量' })
  }
  function signOf (kind) { return kind === '入荷' ? 1 : -1 }
  function renderRecPreview () {
    var box = $('rec-after')
    var it = curItem(); var x = stOf(it.no)
    var r = recParse()
    if (ui.recErrShown) showRecErr(r.err || null)
    box.textContent = ''
    if (r.err) { box.hidden = true; return }
    var after = x.stock10 + signOf(ui.kind) * r.v
    var st = stateOf(after, it.rop10)
    box.hidden = false
    if (after < 0) {
      box.classList.add('is-minus')
      box.appendChild(h('span', { text: '記録後の在庫：' + fmtQty(after, it) + '（切れ）。記録する時に確認します' }))
    } else {
      box.classList.remove('is-minus')
      append(box, [h('span', {}, ['記録後の在庫：', h('strong', { text: fmtQty(after, it) })]), stateTag(st)])
    }
  }
  function showRecErr (msg) {
    var e = $('rec-qty-err')
    if (msg) {
      e.textContent = msg
      e.hidden = false
      elQty.setAttribute('aria-invalid', 'true')
      elQty.setAttribute('aria-describedby', 'rec-qty-err rec-qty-hint')
    } else {
      e.textContent = ''
      e.hidden = true
      elQty.removeAttribute('aria-invalid')
      elQty.setAttribute('aria-describedby', 'rec-qty-hint')
    }
  }
  elItem.addEventListener('change', function () { renderRecInfo() })
  elQty.addEventListener('input', renderRecPreview)
  $('rec-btn').addEventListener('click', function () {
    var it = curItem(); var x = stOf(it.no)
    var r = recParse()
    ui.recErrShown = true
    if (r.err) { showRecErr(r.err); elQty.focus(); return }
    showRecErr(null)
    var d10 = signOf(ui.kind) * r.v
    var after = x.stock10 + d10
    var kind = ui.kind
    var memo = elMemo.value.replace(/^[\s　]+|[\s　]+$/g, '').slice(0, 40)
    var go = function () { commitRecord(it, kind, d10, memo) }
    if (after < 0 && kind !== '入荷') {
      confirmBox({
        title: '在庫がマイナスになります',
        body: it.name + 'の在庫は ' + fmtQty(x.stock10, it) + ' です。' + kind + ' ' + fmtQty(r.v, it) + ' を記録すると ' + fmtQty(after, it) + ' になります。前の記録が漏れている時などは、このまま記録して、あとで棚卸で合わせられます。',
        ok: 'マイナスのまま記録する',
        fallback: elQty
      }).then(function (yes) { if (yes) { go(); elQty.focus() } })
    } else go()
  })
  function nextSeq () { return S.hist.reduce(function (a, x) { return Math.max(a, x.seq) }, 0) + 1 }
  function stateChangeText (before, after) {
    return before === after ? '' : '。' + STATE_LABEL[after] + 'になりました'
  }
  function commitRecord (it, kind, d10, memo) {
    var x = stOf(it.no)
    var before = stateOf(x.stock10, it.rop10)
    x.stock10 += d10
    if (kind === '入荷' && x.wait10 > 0) { x.wait10 = 0; x.waitAt = null } // 仮定 #5
    S.hist.push({ seq: nextSeq(), at: new Date().toISOString(), no: it.no, kind: kind, d10: d10, after10: x.stock10, memo: memo, undone: false, undoOf: null })
    ui.edits = {}
    saveState()
    elQty.value = ''
    elMemo.value = ''
    ui.recErrShown = false
    showRecErr(null)
    renderAll()
    flashRow(it.no)
    elQty.focus()
    showToast(it.name + ' ' + kind + ' ' + fmtQty(Math.abs(d10), it) + ' を記録しました（在庫 ' + fmtQty(x.stock10, it) + '）' + stateChangeText(before, stateOf(x.stock10, it.rop10)))
  }
  function flashRow (no) {
    if (reduceMotion) return
    Array.prototype.forEach.call(document.querySelectorAll('#stock-area [data-no="' + no + '"]'), function (el) {
      el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash')
    })
  }
  // 一覧の「記録」から品目を選ぶ
  function pickItem (no, kind, qty10) {
    openTab('rec', { noScroll: true })
    elItem.value = String(no)
    if (kind) { ui.kind = kind; renderKindSeg() }
    if (qty10 !== undefined) elQty.value = fmtNum(qty10, itemOf(no).dec).replace(/,/g, '')
    ui.recErrShown = false
    showRecErr(null)
    renderRecInfo()
    var wide = window.matchMedia('(min-width: 1024px)').matches
    if (!wide) $('rec-card').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    elQty.focus({ preventScroll: !wide ? true : false })
  }

  // ---------- 在庫一覧（§9） ----------
  function renderFilters () {
    makeSeg($('f-state'), [{ v: 'all', label: 'すべて' }, { v: 'alert', label: '少ない・切れだけ' }], ui.fState, function (v) { ui.fState = v; renderFilters(); renderStock() })
    makeSeg($('f-cat'), CAT_OPTS, ui.fCat, function (v) { ui.fCat = v; renderFilters(); renderStock() })
  }
  function renderStock () {
    var total = 0
    ITEMS.forEach(function (it) { total += yenOf(stOf(it.no).stock10, it.price) })
    var shown = ITEMS.filter(function (it) {
      var st = stateOf(stOf(it.no).stock10, it.rop10)
      if (ui.fState === 'alert' && st === 'ok') return false
      if (ui.fCat !== 'all' && it.cat !== ui.fCat) return false
      return true
    })
    var shownYen = shown.reduce(function (a, it) { return a + yenOf(stOf(it.no).stock10, it.price) }, 0)
    $('stock-shown').textContent = '20品目中 ' + shown.length + '品目を表示'
    $('stock-yen').textContent = fmtYen(total)
    var filtered = ui.fState !== 'all' || ui.fCat !== 'all'
    $('stock-yen-shown').hidden = !filtered
    $('stock-yen-shown').textContent = filtered ? '表示中の品目：' + fmtYen(shownYen) : ''
    var area = $('stock-area')
    area.textContent = ''
    if (!shown.length) { area.appendChild(h('p', { class: 'empty', text: 'この条件の品目はありません。' })); return }
    function sub (it) { return [it.cat + '・仕入先' + it.sup + '・', h('span', { class: 'nw', text: '目標 ' + fmtQty(it.target10, it) })] }
    function recBtn (it) {
      return h('button', { type: 'button', class: 'btn-sub btn-sm', 'aria-label': it.name + 'を記録', onclick: function () { pickItem(it.no) } }, ['記録', icon('chev', 14)])
    }
    // PC・タブレット：表
    var table = h('table', { class: 'stock' }, [
      h('caption', { class: 'visually-hidden', text: '在庫一覧（品目番号の順）' }),
      h('colgroup', {}, [h('col', { class: 'c-st' }), h('col'), h('col', { class: 'c-q' }), h('col', { class: 'c-rop' }), h('col', { class: 'c-yen' }), h('col', { class: 'c-op' })]),
      h('thead', {}, h('tr', {}, [
        h('th', { scope: 'col', text: '状態' }), h('th', { scope: 'col', text: '品目' }),
        h('th', { scope: 'col', class: 'num', text: '現在庫' }), h('th', { scope: 'col', class: 'num', text: '発注点' }),
        h('th', { scope: 'col', class: 'num', text: '在庫金額' }), h('th', { scope: 'col', class: 'ctr' }, h('span', { class: 'visually-hidden', text: '操作' }))
      ])),
      h('tbody', {}, shown.map(function (it) {
        var x = stOf(it.no); var st = stateOf(x.stock10, it.rop10)
        return h('tr', { 'data-no': it.no, 'data-state': st }, [
          h('td', {}, tagsFor(it.no)),
          h('th', { scope: 'row' }, [h('span', { class: 'stock__name', text: it.name }), h('span', { class: 'stock__sub' }, sub(it))]),
          h('td', { class: 'num stock__q' + (x.stock10 < 0 ? ' is-neg' : ''), text: fmtQty(x.stock10, it) }),
          h('td', { class: 'num', text: fmtQty(it.rop10, it) }),
          h('td', { class: 'num', text: fmtYen(yenOf(x.stock10, it.price)) }),
          h('td', { class: 'ctr' }, recBtn(it))
        ])
      }))
    ])
    // スマホ：カード
    var list = h('ul', { class: 'stock-list' }, shown.map(function (it) {
      var x = stOf(it.no); var st = stateOf(x.stock10, it.rop10)
      return h('li', { 'data-no': it.no, 'data-state': st }, [
        tagsFor(it.no),
        h('p', { class: 'stock-list__name', text: it.name }),
        h('p', { class: 'stock-list__sub' }, sub(it)),
        h('p', { class: 'stock-list__q' }, [
          h('span', {}, [h('span', { class: 'lbl', text: '在庫 ' }), h('strong', { class: x.stock10 < 0 ? 'is-neg' : null, text: fmtQty(x.stock10, it) })]),
          h('span', {}, [h('span', { class: 'lbl', text: '発注点 ' }), h('span', { class: 'rop', text: fmtQty(it.rop10, it) })])
        ]),
        h('div', { class: 'stock-list__foot' }, [h('span', { text: '在庫金額 ' + fmtYen(yenOf(x.stock10, it.price)) }), recBtn(it)])
      ])
    }))
    append(area, [table, list])
  }
  // 上の数字の「見る ›」
  Array.prototype.forEach.call(document.querySelectorAll('.js-sum-alert'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      openTab('rec', { noScroll: true })
      ui.fState = 'alert'
      renderFilters(); renderStock()
      goTo($('stock-card'), $('h-stock'))
    })
  })
  $('sum-wait-link').addEventListener('click', function (e) {
    e.preventDefault()
    openTab('order', { noScroll: true })
    goTo($('wait-card'), $('h-wait'))
  })
  // 手順表示（§5-3）
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      var g = a.getAttribute('data-go')
      if (g === 'rec-card') { openTab('rec', { noScroll: true }); goTo($('rec-card'), $('h-rec')) }
      else if (g === 'stock-card') { openTab('rec', { noScroll: true }); goTo($('stock-card'), $('h-stock')) }
      else if (g === 'order') { openTab('order', { noScroll: true }); goTo($('panel-order'), $('h-order')) }
      else { openTab('count', { noScroll: true }); goTo($('panel-count'), $('h-count')) }
    })
  })

  // ---------- 履歴（§10） ----------
  function histDesc () { return S.hist.slice().sort(function (a, b) { return b.seq - a.seq }) }
  // 同じ品目に、後から棚卸調整がある記録は取り消せない（棚卸で数え直した数に、もう一度打ち消しを足すと二重になる）
  function lockedByCount (r) { return S.hist.some(function (x) { return x.no === r.no && x.kind === '棚卸調整' && x.seq > r.seq }) }
  function canUndo (r) { return (r.kind === '入荷' || r.kind === '使用' || r.kind === '廃棄') && !r.undone && !lockedByCount(r) }
  function renderHist () {
    var all = histDesc()
    $('hist-count').textContent = '（' + all.length + '件・新しい順）'
    var rows = all.slice(0, ui.histLimit)
    var area = $('hist-area')
    area.textContent = ''
    function undoCell (r) {
      if (canUndo(r)) {
        var it = itemOf(r.no)
        return h('button', { type: 'button', class: 'btn-sub btn-sm', 'data-seq': r.seq, 'aria-label': fmtDT(r.at) + ' の' + it.name + ' ' + r.kind + 'を取り消す', onclick: function () { undo(r.seq) } }, '取り消す')
      }
      if (r.undone) return h('span', { class: 'hist__done', text: '取り消し済み' })
      if (r.kind === '入荷' || r.kind === '使用' || r.kind === '廃棄') return h('span', { class: 'hist__done', text: '棚卸後は不可' })
      return null
    }
    var table = h('table', { class: 'hist-table' }, [
      h('caption', { class: 'visually-hidden', text: '履歴（新しい順）' }),
      h('colgroup', {}, [h('col', { class: 'c-at' }), h('col'), h('col', { class: 'c-kind' }), h('col', { class: 'c-d' }), h('col', { class: 'c-after' }), h('col', { class: 'c-memo' }), h('col', { class: 'c-undo' })]),
      h('thead', {}, h('tr', {}, [
        h('th', { scope: 'col', text: '日時' }), h('th', { scope: 'col', text: '品目' }), h('th', { scope: 'col', text: '種類' }),
        h('th', { scope: 'col', class: 'num', text: '数量' }), h('th', { scope: 'col', class: 'num', text: '記録後の在庫' }),
        h('th', { scope: 'col', text: 'メモ' }), h('th', { scope: 'col', class: 'ctr', text: '取り消し' })
      ])),
      h('tbody', {}, rows.map(function (r) {
        var it = itemOf(r.no)
        return h('tr', { 'data-seq': r.seq }, [
          h('td', { class: 'hist__at', text: fmtDT(r.at) }),
          h('th', { scope: 'row', class: 'hist__name', text: it.name }),
          h('td', {}, kindTag(r.kind)),
          h('td', { class: 'num' }, deltaEl(r.d10, it)),
          h('td', { class: 'num hist__after', text: fmtQty(r.after10, it) }),
          h('td', { class: 'hist__memo' + (r.memo ? '' : ' is-none'), text: r.memo || '—' }),
          h('td', { class: 'ctr' }, undoCell(r))
        ])
      }))
    ])
    var list = h('ul', { class: 'hist-list' }, rows.map(function (r) {
      var it = itemOf(r.no)
      return h('li', { 'data-seq': r.seq }, [
        h('div', { class: 'hist-list__l1' }, [h('span', { class: 'hist__at', text: fmtDT(r.at) }), kindTag(r.kind)]),
        h('p', { class: 'hist-list__l2' }, [h('span', { class: 'hist__name', text: it.name }), h('span', { class: 'hist-list__q' }, [deltaEl(r.d10, it), ' → ', h('span', { class: 'hist__after', text: fmtQty(r.after10, it) })])]),
        h('div', { class: 'hist-list__l3' }, [h('p', { class: 'hist__memo' }, r.memo ? ['メモ：', h('span', { text: r.memo })] : null), undoCell(r)])
      ])
    }))
    append(area, [table, list])
    if (all.length > rows.length) {
      area.appendChild(h('button', { type: 'button', class: 'btn-sub hist__more', onclick: function () { ui.histLimit += HIST_PAGE; renderHist() } }, 'さらに30件表示'))
    }
  }
  function undo (seq) {
    var r = S.hist.filter(function (x) { return x.seq === seq })[0]
    if (!r || !canUndo(r)) return
    var it = itemOf(r.no); var x = stOf(r.no)
    var d10 = -r.d10
    var after = x.stock10 + d10
    confirmBox({
      title: 'この記録を取り消しますか',
      body: fmtDT(r.at) + ' の ' + it.name + ' ' + r.kind + ' ' + fmtDelta(r.d10, it) + ' を打ち消す記録（' + fmtDelta(d10, it) + '）を足します。在庫は ' + fmtQty(x.stock10, it) + ' → ' + fmtQty(after, it) + ' になります。元の記録は消えません。',
      ok: '取り消す',
      fallback: $('h-hist')
    }).then(function (yes) {
      // 窓を開いている間に状態が変わっていたら何もしない（二重の取り消しを防ぐ）。在庫は今の値から計算し直す
      if (!yes || !canUndo(r)) return
      var before = stateOf(x.stock10, it.rop10)
      after = x.stock10 + d10
      x.stock10 = after
      r.undone = true
      S.hist.push({ seq: nextSeq(), at: new Date().toISOString(), no: r.no, kind: '取り消し', d10: d10, after10: after, memo: fmtDT(r.at) + ' の' + r.kind + 'を取り消し', undone: false, undoOf: r.seq })
      ui.edits = {}
      saveState()
      renderAll()
      $('h-hist').focus()
      showToast(it.name + ' ' + r.kind + ' ' + fmtDelta(r.d10, it) + ' を取り消しました（在庫 ' + fmtQty(after, it) + '）' + stateChangeText(before, stateOf(after, it.rop10)))
    })
  }

  // ---------- 発注リスト（§11） ----------
  var orderRefs = {} // 入力中に書き換える所
  function renderOrder () {
    var p = plan()
    var area = $('order-area')
    area.textContent = ''
    orderRefs = { rows: {}, sups: {} }
    if (!p.rows.length) {
      area.appendChild(h('div', { class: 'order-empty' }, [
        icon('ok', 32),
        h('p', { class: 'order-empty__title', text: 'いま発注が必要な品目はありません' }),
        h('p', { class: 'order-empty__text', text: '発注点以下になった品目が、ここに自動で出ます。' })
      ]))
    } else {
      var sumText = h('p', { class: 'order-sum__text', id: 'order-total' })
      var printBtn = h('button', { type: 'button', class: 'btn-main order-sum__btn', id: 'print-all' }, [icon('print', 20), h('span', { id: 'print-all-label' })])
      printBtn.addEventListener('click', function () {
        if (printBtn.getAttribute('aria-disabled') === 'true') return
        doPrint(plan().liveSups)
      })
      area.appendChild(h('div', { class: 'order-sum' }, [
        sumText,
        h('div', { class: 'order-sum__ops' }, [printBtn, h('p', { class: 'order-sum__note', text: '1社＝A4 1枚で出ます。PDF にするには、印刷の画面で送信先を『PDF に保存』にします。' })])
      ]))
      orderRefs.total = sumText
      orderRefs.printBtn = printBtn
      p.sups.forEach(function (s) { area.appendChild(supCard(s)) })
    }
    updateOrderNumbers()
    renderWait()
  }
  function supCard (s) {
    var meta = h('p', { class: 'order-card__meta' })
    var bPrint = h('button', { type: 'button', class: 'btn-sub', onclick: function () { if (bPrint.getAttribute('aria-disabled') !== 'true') { var ps = plan().liveSups.filter(function (x) { return x.key === s.key }); if (ps.length) doPrint(ps) } } }, [icon('print', 18), 'この仕入先だけ印刷'])
    var bDone = h('button', { type: 'button', class: 'btn-sub', onclick: function () { if (bDone.getAttribute('aria-disabled') !== 'true') markOrdered(s.key) } }, '発注した')
    orderRefs.sups[s.key] = { meta: meta, bPrint: bPrint, bDone: bDone }
    var table = h('table', { class: 'order' }, [
      h('caption', { class: 'visually-hidden', text: s.name + 'の発注リスト' }),
      h('colgroup', {}, [h('col'), h('col', { class: 'c-q' }), h('col', { class: 'c-q' }), h('col', { class: 'c-t' }), h('col', { class: 'c-t' }), h('col', { class: 'c-in' }), h('col', { class: 'c-p' }), h('col', { class: 'c-yen' })]),
      h('thead', {}, h('tr', {}, [
        h('th', { scope: 'col', text: '品目' }), h('th', { scope: 'col', class: 'num', text: '在庫' }), h('th', { scope: 'col', class: 'num', text: '入荷待ち' }),
        h('th', { scope: 'col', class: 'num', text: '目標' }), h('th', { scope: 'col', class: 'num', text: '単位' }), h('th', { scope: 'col', text: '発注する数' }),
        h('th', { scope: 'col', class: 'num', text: '単価' }), h('th', { scope: 'col', class: 'num', text: '金額の目安' })
      ])),
      h('tbody', {}, s.rows.map(function (r) { return orderRow(r) }))
    ])
    return h('section', { class: 'card order-card', 'data-sup': s.key, 'aria-labelledby': 'h-sup-' + s.key }, [
      h('div', { class: 'order-card__head' }, [
        h('div', { class: 'order-card__title' }, [h('h3', { id: 'h-sup-' + s.key, text: s.name }), meta]),
        h('div', { class: 'order-card__ops' }, [bPrint, bDone])
      ]),
      table
    ])
  }
  function orderRow (r) {
    var it = r.it; var x = stOf(it.no)
    var inId = 'order-in-' + it.no
    var errId = 'order-err-' + it.no
    var input = h('input', { id: inId, class: 'input input--num', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': it.name + 'の発注する数（' + it.unit + '）', 'aria-describedby': 'order-f-' + it.no })
    input.value = r.edited ? r.raw : fmtNum(r.auto10, it.dec).replace(/,/g, '')
    var err = h('p', { class: 'field__err', id: errId, hidden: true })
    var f = h('p', { class: 'order__f', id: 'order-f-' + it.no })
    var yen = h('span', { class: 'order__yen' })
    input.addEventListener('input', function () {
      var res = parseQty(input.value, { zero: true, dec: it.dec, unit: it.unit, label: '数' })
      if (!res.err && res.v === r.auto10) delete ui.edits[it.no]
      else ui.edits[it.no] = { raw: input.value, v: res.err ? null : res.v, err: res.err || null }
      updateOrderNumbers()
      renderSummary()
    })
    orderRefs.rows[it.no] = { input: input, err: err, f: f, yen: yen }
    return h('tr', { 'data-no': it.no }, [
      h('th', { scope: 'row', class: 'order__name' }, [
        h('span', { class: 'order__nm', text: it.name }),
        h('span', { class: 'order__spmeta', text: '在庫 ' + fmtQty(x.stock10, it) + (x.wait10 > 0 ? '・入荷待ち ' + fmtQty(x.wait10, it) : '') + '・目標 ' + fmtQty(it.target10, it) + '・単位 ' + fmtQty(it.lot10, it) })
      ]),
      h('td', { class: 'num order__pc', text: fmtQty(x.stock10, it) }),
      h('td', { class: 'num order__pc', text: x.wait10 > 0 ? fmtQty(x.wait10, it) : '—' }),
      h('td', { class: 'num order__pc', text: fmtQty(it.target10, it) }),
      h('td', { class: 'num order__pc', text: fmtQty(it.lot10, it) }),
      h('td', { class: 'order__in' }, [h('span', { class: 'order__inrow' }, [input, h('span', { class: 'order__unit', 'aria-hidden': 'true', text: it.unit }), yen]), err, f]),
      h('td', { class: 'num order__pc', text: fmtYen(it.price) }),
      h('td', { class: 'num order__pc order__yen-pc' })
    ])
  }
  // 入力のたびに数字だけ書き換える（入力欄は作り直さない）
  function updateOrderNumbers () {
    var p = plan()
    p.rows.forEach(function (r) {
      var ref = orderRefs.rows && orderRefs.rows[r.it.no]
      if (!ref) return
      var tr = ref.input.closest('tr')
      var yenText = r.err ? '—' : fmtYen(r.yen)
      ref.yen.textContent = yenText
      tr.querySelector('.order__yen-pc').textContent = yenText
      tr.classList.toggle('is-zero', r.q10 === 0)
      var ftxt = formula(r)
      ref.f.textContent = ftxt
      if (r.edited && !r.err) {
        ref.f.appendChild(h('span', { class: 'order__mark', text: r.q10 === 0 ? '（今回は発注しない）' : '（手で変更）' }))
      }
      if (r.err) {
        ref.err.textContent = r.err; ref.err.hidden = false
        ref.input.setAttribute('aria-invalid', 'true')
        ref.input.setAttribute('aria-describedby', 'order-err-' + r.it.no + ' order-f-' + r.it.no)
      } else {
        ref.err.textContent = ''; ref.err.hidden = true
        ref.input.removeAttribute('aria-invalid')
        ref.input.setAttribute('aria-describedby', 'order-f-' + r.it.no)
      }
    })
    p.sups.forEach(function (s) {
      var ref = orderRefs.sups && orderRefs.sups[s.key]
      if (!ref) return
      ref.meta.textContent = s.live.length + '品目・金額の目安 ' + fmtYen(s.yen)
      var off = s.err || s.live.length === 0
      ;[ref.bPrint, ref.bDone].forEach(function (b) { if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled') })
    })
    if (orderRefs.total) {
      orderRefs.total.textContent = ''
      append(orderRefs.total, [p.liveSups.length + '社・' + p.count + '品目・金額の目安 ', h('strong', { text: fmtYen(p.yen) }), '（税抜の参考）'])
      $('print-all-label').textContent = '仕入先ごとに印刷・PDFで保存（' + p.liveSups.length + '枚）'
      var anyErr = p.sups.some(function (s) { return s.err })
      if (anyErr || p.liveSups.length === 0) orderRefs.printBtn.setAttribute('aria-disabled', 'true')
      else orderRefs.printBtn.removeAttribute('aria-disabled')
    }
  }
  function markOrdered (key) {
    var s = plan().sups.filter(function (x) { return x.key === key })[0]
    if (!s || s.err || !s.live.length) return
    var name = '仕入先' + key
    confirmBox({
      title: name + ' に発注しましたか',
      body: 'このデモでは送信はしません。押すと、下の ' + s.live.length + '品目が『入荷待ち』になり、発注リストから外れます。入荷を記録すると入荷待ちは消えます。',
      list: s.live.map(function (r) { return r.it.name + ' ' + fmtQty(r.q10, r.it) }),
      ok: '発注した',
      fallback: $('h-order')
    }).then(function (yes) {
      if (!yes) return
      var now = new Date().toISOString()
      s.live.forEach(function (r) {
        var x = stOf(r.it.no)
        x.wait10 += r.q10
        x.waitAt = now
      })
      s.rows.forEach(function (r) { delete ui.edits[r.it.no] })
      saveState()
      renderAll()
      $('h-order').focus()
      showToast(name + ' の ' + s.live.length + '品目を入荷待ちにしました')
    })
  }
  function renderWait () {
    var area = $('wait-area')
    area.textContent = ''
    var ws = ITEMS.filter(function (it) { return stOf(it.no).wait10 > 0 })
    if (!ws.length) { area.appendChild(h('p', { class: 'sub', text: '入荷待ちの品目はありません。' })); return }
    area.appendChild(h('ul', { class: 'wait-list' }, ws.map(function (it) {
      var x = stOf(it.no)
      return h('li', { 'data-no': it.no }, [
        waitTag(),
        h('div', { class: 'wait-list__body' }, [
          h('p', { class: 'wait-list__name', text: it.name }),
          h('p', { class: 'wait-list__meta', text: '仕入先' + it.sup + '・' + fmtShort(x.waitAt) + '発注' })
        ]),
        h('p', { class: 'wait-list__q', text: fmtQty(x.wait10, it) }),
        h('button', { type: 'button', class: 'btn-sub btn-sm', 'aria-label': it.name + 'の入荷を記録', onclick: function () { pickItem(it.no, '入荷', x.wait10) } }, '入荷を記録')
      ])
    })))
  }

  // ---------- 棚卸（§12） ----------
  var countRefs = {}
  function countCalc () {
    var res = { entered: 0, diff: 0, big: 0, err: false, rows: [] }
    ITEMS.forEach(function (it) {
      var raw = ui.counts[it.no]
      if (raw === undefined || String(raw).replace(/[\s　]/g, '') === '') return
      var r = parseQty(raw, { zero: true, dec: it.dec, unit: it.unit, label: '数えた数' })
      res.entered++
      if (r.err) { res.err = true; res.rows.push({ it: it, err: r.err }); return }
      var b10 = stOf(it.no).stock10
      var d10 = r.v - b10
      var big = d10 !== 0 && Math.abs(d10) * 10 >= Math.abs(b10)
      if (d10 !== 0) res.diff++
      if (big) res.big++
      res.rows.push({ it: it, v: r.v, b10: b10, d10: d10, big: big })
    })
    return res
  }
  function renderCountSeg () {
    makeSeg($('c-cat'), CAT_OPTS, ui.cCat, function (v) { ui.cCat = v; renderCountSeg(); renderCount() })
  }
  function renderCount () {
    var area = $('count-area')
    area.textContent = ''
    countRefs = {}
    var shown = ITEMS.filter(function (it) { return ui.cCat === 'all' || it.cat === ui.cCat })
    var table = h('table', { class: 'count-table' }, [
      h('caption', { class: 'visually-hidden', text: '棚卸の入力' }),
      h('colgroup', {}, [h('col'), h('col', { class: 'c-b' }), h('col', { class: 'c-in' }), h('col', { class: 'c-d' }), h('col', { class: 'c-r' }), h('col', { class: 'c-m' })]),
      h('thead', {}, h('tr', {}, [
        h('th', { scope: 'col', text: '品目' }), h('th', { scope: 'col', class: 'num', text: '帳簿' }), h('th', { scope: 'col', text: '数えた数' }),
        h('th', { scope: 'col', class: 'num', text: '差' }), h('th', { scope: 'col', class: 'num', text: '差の率' }), h('th', { scope: 'col' }, h('span', { class: 'visually-hidden', text: '印' }))
      ])),
      h('tbody', {}, shown.map(function (it) {
        var x = stOf(it.no)
        var input = h('input', { id: 'count-in-' + it.no, class: 'input input--num', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': it.name + 'の数えた数（' + it.unit + '）' })
        input.value = ui.counts[it.no] || ''
        var err = h('p', { class: 'field__err', id: 'count-err-' + it.no, hidden: true })
        var d = h('span', { class: 'count__d' })
        var rt = h('span', { class: 'count__r' })
        var mk = h('span', { class: 'count__mk' })
        input.addEventListener('input', function () { ui.counts[it.no] = input.value; updateCountRow(it); updateCountStatus() })
        countRefs[it.no] = { input: input, err: err, d: d, rt: rt, mk: mk }
        return h('tr', { 'data-no': it.no }, [
          h('th', { scope: 'row' }, [h('span', { class: 'count__nm', text: it.name }), h('span', { class: 'count__sub', text: it.cat + '・仕入先' + it.sup })]),
          h('td', { class: 'num count__b' }, [h('span', { class: 'sp-lbl', text: '帳簿 ' }), fmtQty(x.stock10, it)]),
          h('td', { class: 'count__in' }, [h('span', { class: 'order__inrow' }, [input, h('span', { class: 'order__unit', 'aria-hidden': 'true', text: it.unit })]), err]),
          h('td', { class: 'num count__dc' }, [h('span', { class: 'sp-lbl', text: '差 ' }), d]),
          h('td', { class: 'num count__rc' }, rt),
          h('td', { class: 'count__mc' }, mk)
        ])
      }))
    ])
    area.appendChild(table)
    shown.forEach(updateCountRow)
    updateCountStatus()
  }
  function updateCountRow (it) {
    var ref = countRefs[it.no]
    if (!ref) return
    ref.d.textContent = ''; ref.rt.textContent = ''; ref.mk.textContent = ''
    ref.d.className = 'count__d'
    var raw = ui.counts[it.no]
    var tr = ref.input.closest('tr')
    tr.classList.remove('has-val')
    if (raw === undefined || String(raw).replace(/[\s　]/g, '') === '') {
      ref.err.hidden = true; ref.err.textContent = ''; ref.input.removeAttribute('aria-invalid'); ref.input.removeAttribute('aria-describedby')
      return
    }
    var r = parseQty(raw, { zero: true, dec: it.dec, unit: it.unit, label: '数えた数' })
    if (r.err) {
      ref.err.textContent = r.err; ref.err.hidden = false
      ref.input.setAttribute('aria-invalid', 'true'); ref.input.setAttribute('aria-describedby', 'count-err-' + it.no)
      return
    }
    ref.err.hidden = true; ref.err.textContent = ''; ref.input.removeAttribute('aria-invalid'); ref.input.removeAttribute('aria-describedby')
    tr.classList.add('has-val')
    var b10 = stOf(it.no).stock10
    var d10 = r.v - b10
    ref.d.textContent = fmtDelta(d10, it)
    ref.d.className = 'count__d delta ' + (d10 > 0 ? 'd-plus' : d10 < 0 ? 'd-minus' : 'd-zero')
    var rate = fmtRate(d10, b10)
    ref.rt.textContent = rate
    ref.rt.setAttribute('data-rate', rate)
    if (d10 !== 0 && Math.abs(d10) * 10 >= Math.abs(b10)) {
      append(ref.mk, h('span', { class: 'bigmark' }, [icon('low', 14), '差が10%以上']))
    }
  }
  function updateCountStatus () {
    var c = countCalc()
    $('count-status').textContent = '入力 ' + c.entered + '品目／20品目・差あり ' + c.diff + '品目・差が10%以上 ' + c.big + '品目'
    var off = c.entered === 0 || c.err
    var b = $('count-btn')
    if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled')
    $('count-off').hidden = !off
  }
  $('count-btn').addEventListener('click', function () {
    var c = countCalc()
    if (c.entered === 0 || c.err) return
    var diffs = c.rows.filter(function (r) { return r.d10 !== 0 })
    var same = c.rows.length - diffs.length
    var body = diffs.length
      ? '差のある ' + diffs.length + '品目を『棚卸調整』として記録し、帳簿を数えた数に合わせます。' + (same ? '差のない ' + same + '品目は記録しません。' : '')
      : '差のある品目はありません。入力を消して終わります。'
    confirmBox({
      title: '棚卸を確定しますか',
      body: body,
      list: diffs.map(function (r) { return r.it.name + ' ' + fmtQty(r.b10, r.it) + ' → ' + fmtQty(r.v, r.it) + '（' + fmtDelta(r.d10, r.it) + '）' }),
      ok: '確定する',
      fallback: $('h-count')
    }).then(function (yes) {
      if (!yes) return
      var at = new Date().toISOString()
      diffs.forEach(function (r) { // 品目番号の順
        var x = stOf(r.it.no)
        x.stock10 = r.v
        S.hist.push({ seq: nextSeq(), at: at, no: r.it.no, kind: '棚卸調整', d10: r.d10, after10: r.v, memo: '棚卸', undone: false, undoOf: null })
      })
      ui.counts = {}
      if (diffs.length) { ui.edits = {}; saveState() }
      renderAll()
      $('h-count').focus()
      showToast(diffs.length ? '棚卸を確定しました（' + diffs.length + '品目を調整）' : '差のある品目はありませんでした。入力を消しました')
    })
  })
  $('count-clear').addEventListener('click', function () {
    ui.counts = {}
    renderCount()
    showToast('棚卸の入力を消しました')
  })

  // ---------- 発注書と印刷（§17） ----------
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  function buildPO (s, today) {
    var tr = s.live.map(function (r, i) {
      return h('tr', {}, [
        h('td', { class: 'po-c-no', text: String(i + 1) }),
        h('td', { text: r.it.name }),
        h('td', { class: 'num', text: fmtNum(r.q10, r.it.dec) }),
        h('td', { class: 'ctr', text: r.it.unit }),
        h('td', { class: 'num', text: fmtYen(r.it.price) }),
        h('td', { class: 'num', text: fmtYen(r.yen) })
      ])
    })
    return h('section', { class: 'po' }, [
      h('h2', { class: 'po-title', text: '発注書' }),
      h('div', { class: 'po-meta' }, [h('p', { text: '発注日 ' + fmtJP(today) }), h('p', { text: '納品希望日 　　月　　日' })]),
      h('div', { class: 'po-parties' }, [
        h('div', { class: 'po-to' }, [
          h('p', { class: 'po-to__name' }, [h('span', { class: 'po-to__co', text: s.name }), h('span', { class: 'po-to__hon', text: '御中' })]),
          h('p', { class: 'po-to__lead', text: '下記のとおり発注いたします。' })
        ]),
        h('div', { class: 'po-from' }, [
          h('p', { class: 'po-from__name' }, [h('span', { text: '焼き菓子と珈琲' }), h('br'), h('span', { text: 'ハルツグ（架空）' }), icon('stamp')]),
          h('p', { text: '〒000-0000（架空の住所）' }),
          h('p', { text: 'TEL 00-0000-0000（架空）' })
        ])
      ]),
      h('table', { class: 'po-items' }, [
        h('colgroup', {}, [h('col', { class: 'po-w-no' }), h('col'), h('col', { class: 'po-w-q' }), h('col', { class: 'po-w-u' }), h('col', { class: 'po-w-p' }), h('col', { class: 'po-w-a' })]),
        h('thead', {}, h('tr', {}, [h('th', { text: 'No.' }), h('th', { text: '品目' }), h('th', { class: 'num', text: '数量' }), h('th', { class: 'ctr', text: '単位' }), h('th', { class: 'num', text: '単価' }), h('th', { class: 'num', text: '金額の目安' })])),
        h('tbody', {}, tr)
      ]),
      h('table', { class: 'po-total' }, h('tbody', {}, h('tr', {}, [h('th', { text: '合計（税抜・目安）' }), h('td', { class: 'po-total__amt', text: fmtYen(s.yen) })]))),
      h('p', { class: 'po-note', text: '金額は税抜の参考です。税の扱いはお客様のルールに合わせます。' }),
      h('div', { class: 'po-remarks' }, h('p', { class: 'po-remarks__label', text: '備考' })),
      h('p', { class: 'po-foot', text: 'この発注書は TENKA LAB の制作見本です。お店・品目・数量・仕入先はすべて架空です。金額は税抜の参考です。' })
    ])
  }
  function fillPrint (sups) {
    elPrintRoot.textContent = ''
    if (!sups || !sups.length) {
      elPrintRoot.appendChild(h('p', { class: 'print-empty', text: 'いま発注が必要な品目はありません。' }))
      return
    }
    var today = new Date()
    sups.forEach(function (s) { elPrintRoot.appendChild(buildPO(s, today)) })
  }
  function doPrint (sups) {
    if (!sups.length) return
    fillPrint(sups)
    var day = isoDay(new Date())
    document.title = sups.length === 1 ? '発注書_' + day + '_仕入先' + sups[0].key : '発注書_' + day + '_' + sups.length + '社'
    window.print()
  }
  window.addEventListener('beforeprint', function () {
    if (!elPrintRoot.firstChild) {
      var p = plan()
      fillPrint(p.sups.some(function (s) { return s.err }) ? p.liveSups.filter(function (s) { return !s.err }) : p.liveSups)
    }
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  // ---------- 最初の状態に戻す（§13-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox({
      title: '最初の状態に戻しますか',
      body: '記録・発注・棚卸をすべて消して、デモの最初の在庫と履歴（12件）に戻します。',
      ok: '戻す',
      fallback: $('btn-reset')
    }).then(function (yes) {
      if (!yes) return
      S = initialState()
      saveState()
      ui.fState = 'all'; ui.fCat = 'all'; ui.cCat = 'all'; ui.kind = '使用'
      ui.edits = {}; ui.counts = {}; ui.histLimit = HIST_PAGE; ui.recErrShown = false
      elItem.value = '1'; elQty.value = ''; elMemo.value = ''
      showRecErr(null)
      renderKindSeg(); renderFilters(); renderCountSeg()
      openTab('rec', { noScroll: true })
      renderAll()
      showToast('最初の状態に戻しました')
    })
  })

  // ---------- はじめ ----------
  S = loadState() || initialState()
  $('note-nosave').hidden = canSave
  fillIcons()
  renderKindSeg()
  renderFilters()
  renderCountSeg()
  renderAll()

  // 検査用（読み取りだけ）
  window.HarutsuguStock = {
    plan: function () { var p = plan(); return { count: p.count, yen: p.yen, sups: p.sups.map(function (s) { return { key: s.key, yen: s.yen, items: s.live.map(function (r) { return { no: r.it.no, q10: r.q10, yen: r.yen } }) } }) } },
    fmtQty: function (q10, no) { return fmtQty(q10, itemOf(no)) },
    canSave: function () { return canSave }
  }
})()
