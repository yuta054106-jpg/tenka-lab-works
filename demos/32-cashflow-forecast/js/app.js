// カフェ ユメツム（デモ）資金繰りの見通し：入金と支払いの予定から、6週間先までの残高を日ごとに出す
// 外部通信なし・保存なし（URL のハッシュも使わない）。操作は「もしも」の札とボタンだけ
// 日付は決まった暦（日の番号 0 ＝ 2026-12-01（火））で数える。端末の時計・乱数は使わない
// 表示はすべて createElement・createElementNS・textContent・createTextNode
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}

  // ---------- デモの暦（0 ＝ 2026-12-01（火）… 41 ＝ 2027-01-11（月）） ----------
  var DAYS = 42
  var TODAY = 0
  var START = 520000
  var SAFE = 300000
  var WD = Object.freeze(['日', '月', '火', '水', '木', '金', '土'])
  function wdOf (d) { return (2 + d) % 7 }
  function monthDay (d) { return d <= 30 ? { m: 12, d: d + 1 } : { m: 1, d: d - 30 } }

  // ---------- 予定23件（税込・整数の円・すべて架空） ----------
  function it (o) { return Object.freeze(o) }
  var ITEMS = Object.freeze([
    it({ id: 'P01', d: 1, io: 'in', name: 'カードの入金', amt: 140000, sales: true }),
    it({ id: 'P02', d: 6, io: 'in', name: '現金売上の預け入れ', amt: 40000, sales: true }),
    it({ id: 'P03', d: 6, io: 'out', name: 'コーヒー機器のリース（架空）', amt: 30000 }),
    it({ id: 'P04', d: 8, io: 'in', name: 'カードの入金', amt: 140000, sales: true }),
    it({ id: 'P05', d: 9, io: 'out', name: '仕入れ先B コーヒー豆の卸（架空）への支払い', who: '仕入れ先B コーヒー豆の卸（架空）', amt: 90000, ask: true }),
    it({ id: 'P06', d: 13, io: 'in', name: '現金売上の預け入れ', amt: 40000, sales: true }),
    it({ id: 'P07', d: 14, io: 'in', name: 'QR 決済の入金', amt: 50000, sales: true }),
    it({ id: 'P08', d: 14, io: 'in', name: '取引先D 喫茶店（架空）からの入金', who: '取引先D 喫茶店（架空）', amt: 30000, early: true }),
    it({ id: 'P09', d: 15, io: 'in', name: 'カードの入金', amt: 140000, sales: true }),
    it({ id: 'P10', d: 20, io: 'in', name: '現金売上の預け入れ', amt: 40000, sales: true }),
    it({ id: 'P11', d: 20, io: 'out', name: '水道光熱（架空）', amt: 45000 }),
    it({ id: 'P12', d: 22, io: 'in', name: 'カードの入金', amt: 140000, sales: true }),
    it({ id: 'P13', d: 24, io: 'out', name: '給料（架空）', amt: 420000 }),
    it({ id: 'P14', d: 27, io: 'in', name: '現金売上の預け入れ', amt: 40000, sales: true }),
    it({ id: 'P15', d: 27, io: 'in', name: '取引先A 雑貨店（架空）からの入金', who: '取引先A 雑貨店（架空）', amt: 80000, early: true }),
    it({ id: 'P16', d: 27, io: 'out', name: '家賃（架空）', amt: 220000 }),
    it({ id: 'P17', d: 29, io: 'in', name: 'カードの入金', amt: 140000, sales: true }),
    it({ id: 'P18', d: 30, io: 'out', name: '仕入れ先A 製菓材料店（架空）への支払い', who: '仕入れ先A 製菓材料店（架空）', amt: 300000, ask: true }),
    it({ id: 'P19', d: 30, io: 'out', name: '税・社会保険（架空の額）', amt: 70000 }),
    it({ id: 'P20', d: 34, io: 'in', name: '現金売上の預け入れ', amt: 30000, sales: true }),
    it({ id: 'P21', d: 35, io: 'in', name: 'QR 決済の入金', amt: 40000, sales: true }),
    it({ id: 'P22', d: 36, io: 'in', name: 'カードの入金', amt: 100000, sales: true }),
    it({ id: 'P23', d: 40, io: 'out', name: '仕入れ先B コーヒー豆の卸（架空）への支払い', who: '仕入れ先B コーヒー豆の卸（架空）', amt: 100000, ask: true })
  ])
  var EXTRA = it({ id: 'X01', d: 13, io: 'out', name: '設備の買い替え（架空）', amt: 150000 })

  // ---------- もしも4個（この順が表示の順） ----------
  var WHATIFS = Object.freeze([
    it({ key: 'late', title: '取引先A 雑貨店（架空）の入金が1週間遅れたら', desc: '12月28日（月）の 80,000円が、1月4日（月）に' }),
    it({ key: 'sales', title: '12月中のカード・QR 決済の入金と現金の預け入れが1割少なかったら', desc: '対象は10件、合わせて −91,000円' }),
    it({ key: 'equip', title: '設備の買い替え（架空 150,000円）を12月14日に払ったら', desc: '12月14日（月）に 150,000円の支払いを足す' }),
    it({ key: 'delay', title: '仕入れ先A 製菓材料店（架空）への支払いを1週間後ろにできたら', desc: '12月31日（木）の 300,000円が、1月7日（木）に（仕入れ先が支払日の変更に同意した場合の試算）' })
  ])
  var WKEYS = Object.freeze(WHATIFS.map(function (w) { return w.key }))

  // ---------- 残高の数え方（整数だけの純粋な関数） ----------
  function hasKey (on, k) {
    if (!on) return false
    if (Array.isArray(on)) return on.indexOf(k) >= 0
    return !!on[k]
  }
  function copyItem (x) {
    var o = {}
    Object.keys(x).forEach(function (k) { o[k] = x[k] })
    return o
  }
  // 日 → 入金が先 → 番号 の順
  function itemOrder (a, b) {
    if (a.d !== b.d) return a.d - b.d
    if (a.io !== b.io) return a.io === 'in' ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  }
  function mark (x, by) {
    if (!x.from) x.from = { d: x.d, amt: x.amt }
    x.by = by
  }
  // もしもを W1 → W4 の順にあてる。元の一覧は書き換えない
  function applyWhatifs (on, items) {
    var list = (items || ITEMS).map(copyItem)
    if (hasKey(on, 'late')) list.forEach(function (x) { if (x.id === 'P15') { mark(x, 'late'); x.d = 34 } })
    if (hasKey(on, 'sales')) list.forEach(function (x) { if (x.sales && x.d <= 30) { mark(x, 'sales'); x.amt = x.amt - x.amt / 10 } })
    if (hasKey(on, 'equip')) { var e = copyItem(EXTRA); e.by = 'equip'; e.added = true; list.push(e) }
    if (hasKey(on, 'delay')) list.forEach(function (x) { if (x.id === 'P18') { mark(x, 'delay'); x.d = 37 } })
    list.sort(itemOrder)
    return list
  }
  function inRange (x) { return x.d >= 0 && x.d < DAYS }
  // 日の終わりの残高（長さ 42）。期間の外の予定は使わない
  function daily (items, start) {
    var s = start === undefined ? START : start
    var delta = []
    for (var i = 0; i < DAYS; i++) delta.push(0)
    items.forEach(function (x) { if (inRange(x)) delta[x.d] += x.io === 'in' ? x.amt : -x.amt })
    var bal = []
    var run = s
    for (var d = 0; d < DAYS; d++) { run += delta[d]; bal.push(run) }
    return bal
  }
  function summarize (bal, items, safe) {
    var line = safe === undefined ? SAFE : safe
    var min = bal[0]
    var minDay = 0
    var below = 0
    var firstBelow = -1
    for (var d = 0; d < bal.length; d++) {
      if (bal[d] < min) { min = bal[d]; minDay = d }
      if (bal[d] < line) { below++; if (firstBelow < 0) firstBelow = d }
    }
    var totalIn = 0
    var totalOut = 0
    var nIn = 0
    var nOut = 0
    ;(items || []).forEach(function (x) {
      if (!inRange(x)) return
      if (x.io === 'in') { totalIn += x.amt; nIn++ } else { totalOut += x.amt; nOut++ }
    })
    return {
      min: min, minDay: minDay, below: below, firstBelow: firstBelow,
      firstBal: firstBelow >= 0 ? bal[firstBelow] : null,
      final: bal[bal.length - 1], totalIn: totalIn, totalOut: totalOut, nIn: nIn, nOut: nOut, safe: line
    }
  }
  // 日ごとの残高の表の行：d0 と予定のある日を行の始まりにする
  function rows (items, bal, s) {
    var starts = { 0: true }
    items.forEach(function (x) { if (inRange(x)) starts[x.d] = true })
    var out = []
    for (var d = 0; d < DAYS; d++) {
      if (!starts[d]) continue
      var to = d
      while (to + 1 < DAYS && !starts[to + 1]) to++
      out.push({ from: d, to: to, bal: bal[d], below: bal[d] < s.safe, low: s.minDay >= d && s.minDay <= to })
    }
    return out
  }
  // 相談の候補：支払いは F−7〜F の ask、入金は F+1〜F+7 の early
  function hints (items, s) {
    var F = s.firstBelow
    if (F < 0) return null
    var outs = items.filter(function (x) { return x.io === 'out' && x.ask && x.d >= F - 7 && x.d <= F })
    var ins = items.filter(function (x) { return x.io === 'in' && x.early && x.d >= F + 1 && x.d <= F + 7 })
    outs.sort(itemOrder)
    ins.sort(itemOrder)
    return { first: F, bal: s.firstBal, list: outs.concat(ins) }
  }

  // ---------- 書き方（3けた区切り・日付は自前。端末の書式・時計を使わない） ----------
  var MINUS = '−'
  function digits (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) {
      out = ',' + s.slice(s.length - 3) + out
      s = s.slice(0, s.length - 3)
    }
    return s + out
  }
  function fmtYen (n) { return (n < 0 ? MINUS + digits(-n) : digits(n)) + '円' }
  function fmtSigned (n) { return n > 0 ? '+' + fmtYen(n) : n < 0 ? fmtYen(n) : '0円' }
  function fmtDay (d) { var p = monthDay(d); return p.m + '月' + p.d + '日（' + WD[wdOf(d)] + '）' }
  function fmtDayY (d) { return (d <= 30 ? '2026' : '2027') + '年' + fmtDay(d) }
  function fmtShort (d) { var p = monthDay(d); return p.m + '/' + p.d }
  function fmtRange (a, b) { return a === b ? fmtDay(a) : fmtDay(a) + '〜' + fmtDay(b) }
  function fmtDays (n) { return n + '日' }

  // 動いた予定の文（オンのもしもの順）
  function changes (on) {
    var list = applyWhatifs(on)
    var out = []
    WKEYS.forEach(function (k) {
      if (!hasKey(on, k)) return
      var moved = list.filter(function (x) { return x.by === k })
      var lines = []
      if (k === 'sales') {
        var groups = []
        var sum = 0
        ITEMS.forEach(function (x) {
          if (!(x.sales && x.d <= 30)) return
          var g = groups.filter(function (y) { return y.name === x.name })[0]
          if (!g) { g = { name: x.name, n: 0, amt: x.amt }; groups.push(g) }
          g.n++
          sum += x.amt / 10
        })
        groups.forEach(function (g) {
          lines.push(g.name + ' ' + g.n + '件：' + fmtYen(g.amt) + ' → ' + fmtYen(g.amt - g.amt / 10) + (g.n > 1 ? '（1件ごと）' : ''))
        })
        lines.push('合わせて ' + fmtYen(-sum))
      } else if (k === 'equip') {
        lines.push(EXTRA.name + fmtYen(EXTRA.amt) + '：' + fmtDay(EXTRA.d) + 'に足しました')
      } else {
        moved.forEach(function (x) { lines.push(x.name + ' ' + fmtYen(x.amt) + '：' + fmtDay(x.from.d) + '→ ' + fmtDay(x.d)) })
      }
      out.push({ key: k, lines: lines })
    })
    return out
  }

  // ---------- グラフの座標（純粋な関数。1単位＝1px） ----------
  var TOP_V = 1200000
  function chartGeom (bal, base, s, W) {
    var H = W < 560 ? 220 : 280
    var PW = W - 56
    var PH = H - 44
    function x (d) { return 44 + Math.round(d * PW / DAYS) }
    function y (v) {
      var c = v < 0 ? 0 : v > TOP_V ? TOP_V : v
      return 16 + Math.round((TOP_V - c) * PH / TOP_V)
    }
    function stairs (b) {
      var p = 'M' + x(0) + ' ' + y(b[0])
      for (var d = 1; d < DAYS; d++) p += ' H' + x(d) + ' V' + y(b[d])
      return p + ' H' + x(DAYS)
    }
    var below = []
    for (var d = 0; d < DAYS; d++) {
      if (bal[d] < s.safe) below.push({ d: d, x: x(d), w: x(d + 1) - x(d), y: y(s.safe), h: y(bal[d]) - y(s.safe) })
    }
    var mid = function (d) { return Math.round((x(d) + x(d + 1)) / 2) }
    return {
      W: W, H: H, PW: PW, PH: PH, x: x, y: y,
      grid: [0, 600000, 900000, 1200000].map(function (v) { return { v: v, y: y(v), label: v === 0 ? '0' : (v / 10000) + '万' } }),
      safe: { y: y(s.safe), tx: 48, label: (s.safe / 10000) + '万', text: '安全ライン ' + (s.safe / 10000) + '万円' },
      below: below,
      base: base ? stairs(base) : null,
      line: stairs(bal),
      low: { cx: mid(s.minDay), cy: y(s.min), r: 6 },
      ticks: [
        { x: 44, anchor: 'start', text: '今日 ' + fmtShort(0) },
        { x: mid(14), anchor: 'middle', text: fmtShort(14) },
        { x: mid(31), anchor: 'middle', text: fmtShort(31) },
        { x: W - 12, anchor: 'end', text: fmtShort(41) }
      ]
    }
  }

  // ---------- 読み上げの文 ----------
  function titleOf (k) { return WHATIFS.filter(function (w) { return w.key === k })[0].title }
  function srText (what, s, key, onNow) {
    var tail = 'いちばん低い日は' + fmtDay(s.minDay) + '、' + fmtYen(s.min) + '。安全ラインを下回る日は' + fmtDays(s.below) + 'です。'
    if (what === 'reset') return '最初の見通しに戻しました。' + tail
    return titleOf(key) + 'を' + (onNow ? 'オン' : 'オフ') + 'にしました。' + tail
  }

  root.__demo32 = Object.freeze({
    START: START, SAFE: SAFE, DAYS: DAYS, TODAY: TODAY, WD: WD, ITEMS: ITEMS, EXTRA: EXTRA, WHATIFS: WHATIFS,
    wdOf: wdOf, applyWhatifs: applyWhatifs, daily: daily, summarize: summarize, rows: rows, hints: hints, changes: changes,
    chartGeom: chartGeom, fmtYen: fmtYen, fmtSigned: fmtSigned, fmtDay: fmtDay, fmtDayY: fmtDayY, fmtShort: fmtShort,
    fmtRange: fmtRange, fmtDays: fmtDays, srText: srText
  })

  if (typeof document === 'undefined' || !document.createElement) return

  // ====================================================================
  // 画面
  // ====================================================================
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function txt (t) { return document.createTextNode(t) }
  function add (parent, kids) { kids.forEach(function (k) { if (k) parent.appendChild(typeof k === 'string' ? txt(k) : k) }); return parent }
  function clear (node) { while (node.firstChild) node.removeChild(node.firstChild) }
  var SVGNS = 'http://www.w3.org/2000/svg'
  function svgEl (tag, attrs) {
    var e = document.createElementNS(SVGNS, tag)
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, String(attrs[k])) })
    return e
  }
  function icon (id, size, cls) {
    var s = svgEl('svg', { width: size, height: size, 'aria-hidden': 'true', focusable: 'false' })
    if (cls) s.setAttribute('class', cls)
    var u = svgEl('use', { href: '#' + id })
    s.appendChild(u)
    return s
  }
  // 途中で折れてはいけない語を .nw で包む
  var NWRE = /\d{1,2}月\d{1,2}日（[日月火水木金土]）→ \d{1,2}月\d{1,2}日（[日月火水木金土]）|\d{1,3}(?:,\d{3})*円 → \d{1,3}(?:,\d{3})*円|カフェ ユメツム|デモ（架空のお店）|TENKA LAB|\d{4}年\d{1,2}月\d{1,2}日（[日月火水木金土]）|\d{1,2}月\d{1,2}日（[日月火水木金土]）|[+−]?\d{1,3}(?:,\d{3})*円|\d+日|\d+件|取引先[A-Z]|仕入れ先[A-Z]|1週間|（架空）/g
  function nwText (s) {
    var f = document.createDocumentFragment()
    var last = 0
    var m
    NWRE.lastIndex = 0
    while ((m = NWRE.exec(s))) {
      if (m.index > last) f.appendChild(txt(s.slice(last, m.index)))
      f.appendChild(el('span', 'nw', m[0]))
      last = m.index + m[0].length
    }
    if (last < s.length) f.appendChild(txt(s.slice(last)))
    return f
  }
  function p (cls, s) { var e = el('p', cls); e.appendChild(nwText(s)); return e }

  var TAG = Object.freeze({
    in: Object.freeze({ label: '入金', icon: 'i-in' }),
    out: Object.freeze({ label: '支払い', icon: 'i-out' }),
    chg: Object.freeze({ label: 'もしもで変更', icon: 'i-swap' }),
    add: Object.freeze({ label: 'もしもで追加', icon: 'i-swap' }),
    below: Object.freeze({ label: '下回る', icon: 'i-alert' }),
    low: Object.freeze({ label: 'いちばん低い日', icon: 'i-ring' })
  })
  function tag (kind) {
    var T = TAG[kind]
    var mod = kind === 'add' ? 'chg' : kind
    return add(el('span', 'tag tag--' + mod + ' nw'), [icon(T.icon, 16), T.label])
  }

  var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態（画面の中だけ。保存しない） ----------
  var state = { on: {} }
  var BASE_ITEMS = applyWhatifs({})
  var BASE_BAL = daily(BASE_ITEMS)
  var BASE_SUM = summarize(BASE_BAL, BASE_ITEMS)
  function anyOn () { return WKEYS.some(function (k) { return !!state.on[k] }) }
  function compute () {
    var items = applyWhatifs(state.on)
    var bal = daily(items)
    var s = summarize(bal, items)
    return { items: items, bal: bal, s: s }
  }

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  var srLast = ''
  // 500ms 何も変わらなければ1回だけ。前と同じ文なら一度空にして 50ms 後に入れる
  function say (text) {
    clearTimeout(srTimer)
    if (!text) return
    srTimer = setTimeout(function () {
      var sr = $('sr-status')
      if (text === srLast) {
        sr.textContent = ''
        srTimer = setTimeout(function () { sr.textContent = text }, 50)
        return
      }
      srLast = text
      sr.textContent = text
    }, 500)
  }

  // ---------- ページ内移動（ハッシュを変えない） ----------
  function goTo (id) {
    var target = $(id)
    if (!target) return
    var h = target.matches('[tabindex="-1"]') ? target : (target.querySelector('[tabindex="-1"]') || target)
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
  }

  // ---------- まとめのタイル ----------
  function tileNum (value, unit, cls) {
    return add(el('p', 'tile__num' + (cls ? ' ' + cls : '')), [value, el('span', 'tile__unit', unit)])
  }
  function yenNum (n, cls) {
    var s = fmtYen(n)
    return tileNum(s.slice(0, -1), '円', cls)
  }
  function baseLine (s) { return p('tile__base', '最初の見通し：' + s) }
  function renderTiles (r) {
    var box = $('tiles')
    clear(box)
    var s = r.s
    var base = anyOn()
    var t1 = add(el('li', 'tile'), [p('tile__label', '12月1日の始まりの残高'), yenNum(START), el('p', 'tile__sub', '架空の口座')])
    var t2 = add(el('li', 'tile'), [el('p', 'tile__label', '6週間の終わりの残高'), yenNum(s.final), p('tile__sub', fmtDay(DAYS - 1)), base ? baseLine(fmtYen(BASE_SUM.final)) : null])
    var t3 = add(el('li', 'tile tile--low'), [el('p', 'tile__label', 'いちばん低い日'), p('tile__day', fmtDay(s.minDay)), yenNum(s.min, 'tile__num--low'), el('p', 'tile__sub', '同じ額の日があれば早い日'), base ? baseLine(fmtDay(BASE_SUM.minDay) + '・' + fmtYen(BASE_SUM.min)) : null])
    var n4 = add(el('p', 'tile__num' + (s.below > 0 ? ' tile__num--below' : '')), [s.below > 0 ? icon('i-alert', 16, 'tile__alert') : null, String(s.below), el('span', 'tile__unit', '日')])
    var t4 = add(el('li', 'tile'), [el('p', 'tile__label', '安全ラインを下回る日'), n4, p('tile__sub', '安全ライン ' + fmtYen(SAFE)), base ? baseLine(fmtDays(BASE_SUM.below)) : null])
    add(box, [t1, t2, t3, t4])
  }

  // ---------- グラフ ----------
  var lastW = 0
  function drawChart (r) {
    var fig = $('chart-fig')
    var W = fig.clientWidth - 16
    if (W < 120) W = 120
    lastW = W
    var g = chartGeom(r.bal, anyOn() ? BASE_BAL : null, r.s, W)
    var svg = svgEl('svg', { class: 'chart__svg', viewBox: '0 0 ' + g.W + ' ' + g.H, width: g.W, height: g.H, 'aria-hidden': 'true', focusable: 'false' })
    var defs = svgEl('defs')
    var pat = svgEl('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse' })
    pat.appendChild(svgEl('path', { d: 'M-1 7L7 -1M5 7L7 5M-1 1L1 -1', stroke: '#A33A2A', 'stroke-width': 1.5, fill: 'none' }))
    defs.appendChild(pat)
    svg.appendChild(defs)
    g.grid.forEach(function (t) {
      svg.appendChild(svgEl('path', { d: 'M44 ' + t.y + ' H' + (g.W - 12), stroke: '#E6DCCF', 'stroke-width': 1, fill: 'none' }))
      svg.appendChild(add(svgEl('text', { x: 40, y: t.y + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#6E625A' }), [t.label]))
    })
    svg.appendChild(svgEl('path', { d: 'M44 ' + g.safe.y + ' H' + (g.W - 12), stroke: '#A33A2A', 'stroke-width': 2, 'stroke-dasharray': '8 4', fill: 'none' }))
    svg.appendChild(add(svgEl('text', { x: 40, y: g.safe.y + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#A33A2A' }), [g.safe.label]))
    svg.appendChild(add(svgEl('text', { x: g.safe.tx, y: g.safe.y - 6, 'text-anchor': 'start', 'font-size': 12, 'font-weight': 700, fill: '#A33A2A' }), [g.safe.text]))
    g.below.forEach(function (b) {
      svg.appendChild(svgEl('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: 'url(#hatch)', class: 'chart__below' }))
    })
    if (g.base) svg.appendChild(svgEl('path', { d: g.base, stroke: '#6E625A', 'stroke-width': 1.5, 'stroke-dasharray': '3 3', fill: 'none', class: 'chart__base' }))
    svg.appendChild(svgEl('path', { d: g.line, stroke: '#6B4A34', 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'chart__line' }))
    svg.appendChild(svgEl('circle', { cx: g.low.cx, cy: g.low.cy, r: g.low.r, fill: '#FFFFFF', stroke: '#6B4A34', 'stroke-width': 3, class: 'chart__low' }))
    g.ticks.forEach(function (t) {
      svg.appendChild(add(svgEl('text', { x: t.x, y: g.H - 8, 'text-anchor': t.anchor, 'font-size': 12, fill: '#6E625A' }), [t.text]))
    })
    clear(fig)
    fig.appendChild(svg)
  }
  function legendSample (kind) {
    var s = svgEl('svg', { width: 32, height: 16, viewBox: '0 0 32 16', 'aria-hidden': 'true', focusable: 'false', class: 'chart__key' })
    if (kind === 'line') s.appendChild(svgEl('path', { d: 'M2 12 H14 V5 H30', stroke: '#6B4A34', 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }))
    if (kind === 'safe') s.appendChild(svgEl('path', { d: 'M1 8 H31', stroke: '#A33A2A', 'stroke-width': 2, 'stroke-dasharray': '8 4', fill: 'none' }))
    if (kind === 'below') {
      s.appendChild(svgEl('rect', { x: 2, y: 2, width: 28, height: 12, fill: 'url(#hatch-key)', stroke: '#A33A2A', 'stroke-width': 1 }))
    }
    if (kind === 'low') s.appendChild(svgEl('circle', { cx: 16, cy: 8, r: 5, fill: '#FFFFFF', stroke: '#6B4A34', 'stroke-width': 3 }))
    if (kind === 'base') s.appendChild(svgEl('path', { d: 'M2 12 H14 V5 H30', stroke: '#6E625A', 'stroke-width': 1.5, 'stroke-dasharray': '3 3', fill: 'none' }))
    return s
  }
  function renderLegend (r) {
    var ul = $('legend')
    clear(ul)
    var list = [
      ['line', '茶の線：日の終わりの残高'],
      ['safe', '赤の破線：安全ライン ' + fmtYen(SAFE)],
      ['below', '斜線：安全ラインを下回る日'],
      ['low', '白い丸：いちばん低い日（' + fmtDay(r.s.minDay) + '・' + fmtYen(r.s.min) + '）']
    ]
    if (anyOn()) list.push(['base', '点線：もしも無しの見通し'])
    list.forEach(function (x) {
      var li = el('li', 'chart__item')
      li.appendChild(legendSample(x[0]))
      li.appendChild(add(el('span'), [nwText(x[1])]))
      ul.appendChild(li)
    })
  }
  function td (cls, kids, tagName) {
    var c = el(tagName || 'td', cls)
    add(c, kids)
    return c
  }
  function renderDays (r) {
    var rs = rows(r.items, r.bal, r.s)
    $('days-n').textContent = rs.length + '行'
    var tb = $('tb-days')
    clear(tb)
    rs.forEach(function (x) {
      var tr = el('tr', x.below ? 'days__row--below' : '')
      var th = td('c-range', [nwText(fmtRange(x.from, x.to))], 'th')
      th.setAttribute('scope', 'row')
      tr.appendChild(th)
      tr.appendChild(td('c-bal', [el('span', 'nw', fmtYen(x.bal))]))
      tr.appendChild(td('c-st', [x.below ? tag('below') : null, x.low ? tag('low') : null]))
      tb.appendChild(tr)
    })
  }

  // ---------- もしも ----------
  function renderWhatifs () {
    WHATIFS.forEach(function (w) {
      var b = $('wi-' + w.key)
      var on = !!state.on[w.key]
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
      b.querySelector('.wi__state').textContent = on ? 'オン' : 'オフ'
    })
  }
  function renderNow (r) {
    var s = r.s
    $('now-low').textContent = ''
    add($('now-low'), [nwText(fmtDay(s.minDay) + '・' + fmtYen(s.min))])
    $('now-below').textContent = ''
    add($('now-below'), [nwText(fmtDays(s.below))])
    $('now-below').className = s.below > 0 ? 'wi__num wi__num--below' : 'wi__num'
    $('now-final').textContent = ''
    add($('now-final'), [nwText(fmtYen(s.final))])
    $('now-none').hidden = s.firstBelow >= 0
    var ul = $('changes')
    clear(ul)
    var ch = changes(state.on)
    if (!ch.length) {
      ul.appendChild(el('li', 'wi__empty', 'もしもを選ぶと、ここに動いた予定が出ます。'))
    } else {
      ch.forEach(function (c) {
        var li = el('li', 'wi__change')
        c.lines.forEach(function (l) { li.appendChild(add(el('span', 'wi__line'), [nwText(l)])) })
        ul.appendChild(li)
      })
    }
    var h = hints(r.items, s)
    var box = $('hint')
    box.hidden = !h
    if (!h) return
    clear($('hint-title'))
    add($('hint-title'), [nwText('安全ラインを下回る最初の日：' + fmtDay(h.first) + '（' + fmtYen(h.bal) + '）')])
    var hl = $('hint-list')
    clear(hl)
    if (!h.list.length) {
      hl.appendChild(add(el('li'), [nwText('近い日に、日を相談できる予定はありません。ほかの支払いや入金の日を、お店で見直す形にできます。')]))
    }
    h.list.forEach(function (x) {
      var t = x.io === 'out'
        ? x.who + 'への支払い（' + fmtDay(x.d) + '・' + fmtYen(x.amt) + '）は、日を1週間ほど後ろにできるか、相手先に相談する形にできます。'
        : x.who + 'からの入金（' + fmtDay(x.d) + '・' + fmtYen(x.amt) + '）は、1週間ほど早めてもらえるか、相談する形にできます。'
      hl.appendChild(add(el('li', 'hint__item hint__item--' + x.io), [nwText(t)]))
    })
  }

  // ---------- 予定の一覧 ----------
  function renderItems (r) {
    var s = r.s
    clear($('items-count'))
    add($('items-count'), [nwText('予定 ' + (s.nIn + s.nOut) + '件（入金 ' + s.nIn + '件・支払い ' + s.nOut + '件）')])
    clear($('items-total'))
    add($('items-total'), [el('span', 'nw', '入金の合計 ' + fmtYen(s.totalIn)), ' ／ ', el('span', 'nw', '支払いの合計 ' + fmtYen(s.totalOut))])
    var tb = $('tb-items')
    clear(tb)
    r.items.forEach(function (x) {
      if (!inRange(x)) return
      var tr = el('tr', x.by ? 'items__row--chg' : '')
      tr.id = 'row-' + x.id
      var day = td('c-day', [el('span', 'nw', fmtDay(x.d))], 'th')
      day.setAttribute('scope', 'row')
      if (wdOf(x.d) === 0) day.appendChild(el('span', 'items__sun', '日曜日。実際は前後の平日になることがあります。'))
      tr.appendChild(day)
      var name = td('c-name', [add(el('span', 'items__name'), [nwText(x.name)])])
      if (x.by) {
        var prev = x.added ? null : x.from.d !== x.d ? fmtDay(x.from.d) + '→ ' + fmtDay(x.d) : fmtYen(x.from.amt) + ' → ' + fmtYen(x.amt)
        name.appendChild(add(el('span', 'items__chg'), [tag(x.added ? 'add' : 'chg'), prev ? add(el('span', 'prev'), [nwText(prev)]) : null]))
      }
      tr.appendChild(name)
      tr.appendChild(td('c-io', [tag(x.io)]))
      tr.appendChild(td('c-amt', [el('span', 'nw', fmtSigned(x.io === 'in' ? x.amt : -x.amt))]))
      tb.appendChild(tr)
    })
  }

  var cur = null
  function render () {
    cur = compute()
    renderWhatifs()
    renderTiles(cur)
    drawChart(cur)
    renderLegend(cur)
    renderDays(cur)
    renderNow(cur)
    renderItems(cur)
  }
  function onToggle (k) {
    state.on[k] = !state.on[k]
    render()
    say(srText('toggle', cur.s, k, state.on[k]))
  }
  function onReset () {
    state.on = {}
    render()
    $('wi-' + WKEYS[0]).focus()
    say(srText('reset', cur.s))
  }
  var rafId = 0
  function onResize () {
    if (rafId) return
    rafId = root.requestAnimationFrame(function () {
      rafId = 0
      var W = $('chart-fig').clientWidth - 16
      if (W !== lastW && cur) drawChart(cur)
    })
  }

  function init () {
    WHATIFS.forEach(function (w) {
      $('wi-' + w.key).addEventListener('click', function () { onToggle(w.key) })
    })
    $('reset').addEventListener('click', onReset)
    $('to-whatif').addEventListener('click', function (e) { e.preventDefault(); goTo('whatif') })
    document.querySelector('.hd__logo').addEventListener('click', function (e) { e.preventDefault(); goTo('top') })
    root.addEventListener('resize', onResize)
    state = { on: {} }
    render()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
