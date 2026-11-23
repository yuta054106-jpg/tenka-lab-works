// 洋菓子 トキワダ（デモ）クリスマスケーキの予約と仕込み表
// 表示する値はすべて textContent / value / setAttribute で入れる（innerHTML に値を入れない。固定の SVG だけ template で作る）
// 個数・残り・印・売上見込みはいつも evaluate(orders) 1つで計算する（design.md §16-3）。金額・個数は整数だけで扱う
(function () {
  'use strict'

  // ---------- 固定の値（design.md §14） ----------
  var STORE_KEY = 'tenkaLab.demo12.preorder.v1'
  var SHOP = '洋菓子 トキワダ（架空）'
  var DAYS = [
    { id: '2026-12-22', md: '12/22', w: '火', long: '12月22日' },
    { id: '2026-12-23', md: '12/23', w: '水', long: '12月23日' },
    { id: '2026-12-24', md: '12/24', w: '木', long: '12月24日' },
    { id: '2026-12-25', md: '12/25', w: '金', long: '12月25日' }
  ]
  var DAY = {}; DAYS.forEach(function (d) { DAY[d.id] = d })
  var SLOTS = [
    { id: 'am', name: '午前', range: '10–12時' },
    { id: 'pm', name: '午後', range: '12–16時' },
    { id: 'ev', name: '夕方', range: '16–19時' }
  ]
  var SLOT = {}; SLOTS.forEach(function (s, i) { s.order = i; SLOT[s.id] = s })
  var PRODS = [
    { id: 'short4', name: '苺のショートケーキ 4号（12cm）', short: 'ショート4号', price: 3800 },
    { id: 'short5', name: '苺のショートケーキ 5号（15cm）', short: 'ショート5号', price: 4800 },
    { id: 'choco5', name: 'チョコレートケーキ 5号（15cm）', short: 'チョコ5号', price: 4500 },
    { id: 'noel', name: 'ブッシュ・ド・ノエル（18cm）', short: 'ノエル', price: 4200 },
    { id: 'yaki', name: '焼き菓子の詰め合わせ（12個入り）', short: '焼き菓子', price: 2500 }
  ]
  PRODS.forEach(function (p) { p.mid = p.name.replace(/（[^（]*）$/, '') }) // エラー文・読み上げ用（大きさの括弧を除く）
  var PROD = {}; PRODS.forEach(function (p) { PROD[p.id] = p })
  // 日ごとの上限（作れる数。§14-3）
  var CAP = {
    '2026-12-22': { short4: 6, short5: 4, choco5: 3, noel: 3, yaki: 6 },
    '2026-12-23': { short4: 8, short5: 6, choco5: 4, noel: 4, yaki: 8 },
    '2026-12-24': { short4: 10, short5: 8, choco5: 5, noel: 5, yaki: 10 },
    '2026-12-25': { short4: 8, short5: 6, choco5: 4, noel: 4, yaki: 8 }
  }
  var PAYS = [{ id: 'pre', name: '前払い済み', icon: 'ok' }, { id: 'onsite', name: '当日払い', icon: 'coin' }]
  var PAY_NAME = { pre: '前払い済み', onsite: '当日払い' }
  var MAX_Q = 20
  var FIRST_DAY = '2026-12-24'
  // 見本の25件（§14-4）[番号, お名前, 日, 時間帯, 4号, 5号, チョコ, ノエル, 焼き菓子, 支払い, メモ]
  var SEED = [
    [1, 'ア', 24, 'ev', 3, 2, 0, 1, 2, 'pre', '会社でまとめて。箱は別々に'],
    [2, 'イ', 23, 'am', 0, 0, 2, 0, 0, 'onsite', ''],
    [3, 'ウ', 22, 'am', 2, 0, 0, 0, 0, 'pre', 'ろうそく 長2本'],
    [4, 'エ', 24, 'am', 0, 0, 0, 1, 0, 'pre', ''],
    [5, 'オ', 25, 'am', 1, 0, 0, 0, 1, 'onsite', ''],
    [6, 'カ', 23, 'ev', 1, 2, 0, 1, 0, 'pre', '子ども会用。プレート「メリークリスマス」'],
    [7, 'キ', 24, 'am', 1, 0, 0, 0, 0, 'onsite', ''],
    [8, 'ク', 22, 'pm', 1, 0, 1, 0, 0, 'onsite', ''],
    [9, 'ケ', 24, 'pm', 0, 2, 0, 0, 2, 'pre', '保冷剤を多めに'],
    [10, 'コ', 23, 'am', 1, 0, 1, 0, 0, 'pre', ''],
    [11, 'サ', 24, 'ev', 0, 1, 2, 1, 0, 'onsite', 'プレート「おめでとう」'],
    [12, 'シ', 22, 'am', 0, 1, 0, 0, 1, 'pre', ''],
    [13, 'ス', 25, 'pm', 2, 0, 0, 0, 2, 'pre', 'ろうそく 短5本'],
    [14, 'セ', 24, 'pm', 2, 0, 0, 1, 0, 'onsite', ''],
    [15, 'ソ', 23, 'pm', 2, 0, 0, 0, 0, 'onsite', ''],
    [16, 'タ', 24, 'pm', 0, 0, 1, 1, 0, 'pre', 'プレート「ありがとう」'],
    [17, 'チ', 22, 'ev', 0, 0, 0, 1, 1, 'onsite', ''],
    [18, 'ツ', 23, 'pm', 0, 0, 1, 1, 0, 'pre', ''],
    [19, 'テ', 24, 'am', 0, 1, 0, 0, 1, 'onsite', '車で来店'],
    [20, 'ト', 25, 'pm', 0, 1, 1, 0, 0, 'onsite', ''],
    [21, 'ナ', 23, 'pm', 0, 1, 0, 0, 1, 'onsite', ''],
    [22, 'ニ', 24, 'ev', 3, 0, 0, 0, 1, 'pre', 'ろうそく 数字の「3」'],
    [23, 'ヌ', 22, 'ev', 0, 1, 0, 0, 0, 'pre', ''],
    [24, 'ネ', 23, 'ev', 1, 0, 0, 0, 2, 'onsite', '焼き菓子は手提げ袋を2つ'],
    [25, 'ノ', 25, 'ev', 0, 1, 0, 1, 0, 'pre', '']
  ]

  // ---------- 書き方（§2-1） ----------
  var yenFmt = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
  function fmtYen (n) { return yenFmt.format(n).replace('￥', '¥') }
  function fmtDay (d) { return DAY[d].md + '（' + DAY[d].w + '）' }
  function fmtDayLong (d) { return DAY[d].long + '（' + DAY[d].w + '）' }
  function fmtNo (no) { return 'A-' + (no < 10 ? '00' : no < 100 ? '0' : '') + no }
  function fmtSlot (s) { return SLOT[s].name + ' ' + SLOT[s].range }
  function pct (q, cap) { return cap > 0 ? Math.round(q * 100 / cap) : 0 }
  function itemsText (items) {
    return PRODS.filter(function (p) { return items[p.id] > 0 }).map(function (p) { return p.short + ' ×' + items[p.id] }).join('・')
  }
  // 画面用：商品ごとに折り返さない単位にする（「ショート5号 ×2」の途中で折れない）
  function itemsNodes (items) {
    var out = []
    PRODS.filter(function (p) { return items[p.id] > 0 }).forEach(function (p, i) {
      if (i) out.push('・')
      out.push(h('span', { class: 'nw', text: p.short + ' ×' + items[p.id] }))
    })
    return out
  }
  function amountOf (o) { var s = 0; PRODS.forEach(function (p) { s += o.items[p.id] * PROD[p.id].price }); return s }
  function qtyOf (o) { var s = 0; PRODS.forEach(function (p) { s += o.items[p.id] }); return s }
  function levelOf (q, cap) { return q >= cap ? 'full' : q * 10 >= cap * 9 ? 'few' : '' }
  function sortOrders (list) {
    return list.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      if (a.slot !== b.slot) return SLOT[a.slot].order - SLOT[b.slot].order
      return a.no - b.no
    })
  }

  // ---------- 個数・残り・印・売上見込み（§7-6・§16-3。いつもこの1つで計算する） ----------
  function evaluate (orders) {
    var grid = {}; var byDay = {}; var byProduct = {}; var bySlot = {}
    DAYS.forEach(function (d) {
      byDay[d.id] = { qty: 0, cap: 0, count: 0, pre: 0, onsite: 0, preN: 0, onsiteN: 0 }
      PRODS.forEach(function (p) { grid[d.id + '|' + p.id] = { qty: 0, cap: CAP[d.id][p.id] }; byDay[d.id].cap += CAP[d.id][p.id] })
      SLOTS.forEach(function (s) { bySlot[d.id + '|' + s.id] = { count: 0, qty: 0, items: {}, onsiteN: 0, onsite: 0 } })
    })
    PRODS.forEach(function (p) { byProduct[p.id] = { qty: 0, cap: 0 } })
    var total = { qty: 0, cap: 0 }; var count = 0; var canceled = 0
    var sales = { pre: 0, onsite: 0, all: 0 }
    orders.forEach(function (o) {
      if (o.canceled) { canceled++; return }
      count++
      var amt = amountOf(o)
      var bd = byDay[o.date]; var bs = bySlot[o.date + '|' + o.slot]
      bd.count++; bs.count++
      if (o.pay === 'pre') { bd.pre += amt; bd.preN++; sales.pre += amt } else { bd.onsite += amt; bd.onsiteN++; sales.onsite += amt; bs.onsiteN++; bs.onsite += amt }
      sales.all += amt
      PRODS.forEach(function (p) {
        var q = o.items[p.id]
        grid[o.date + '|' + p.id].qty += q
        bs.items[p.id] = (bs.items[p.id] || 0) + q
        bs.qty += q
      })
    })
    var marks = { full: [], few: [] }
    DAYS.forEach(function (d) {
      PRODS.forEach(function (p) {
        var g = grid[d.id + '|' + p.id]
        g.left = Math.max(0, g.cap - g.qty); g.pct = pct(g.qty, g.cap); g.level = levelOf(g.qty, g.cap)
        if (g.level) marks[g.level].push({ date: d.id, prod: p.id, left: g.left })
        byDay[d.id].qty += g.qty
        byProduct[p.id].qty += g.qty; byProduct[p.id].cap += g.cap
      })
      var bd = byDay[d.id]
      bd.left = bd.cap - bd.qty; bd.pct = pct(bd.qty, bd.cap); bd.all = bd.pre + bd.onsite
      total.qty += bd.qty; total.cap += bd.cap
    })
    PRODS.forEach(function (p) { var b = byProduct[p.id]; b.left = b.cap - b.qty; b.pct = pct(b.qty, b.cap) })
    total.left = total.cap - total.qty; total.pct = pct(total.qty, total.cap)
    return { count: count, canceled: canceled, qty: total.qty, grid: grid, byDay: byDay, byProduct: byProduct, bySlot: bySlot, total: total, sales: sales, marks: marks }
  }
  // この予約に入れられる数（§16-4。新規は exceptNo = null）
  function others (orders, date, prod, exceptNo) {
    var s = 0
    orders.forEach(function (o) { if (!o.canceled && o.date === date && o.no !== exceptNo) s += o.items[prod] })
    return s
  }
  function allowance (orders, date, prod, exceptNo) { return Math.max(0, CAP[date][prod] - others(orders, date, prod, exceptNo)) }

  // ---------- 状態と保存（§11） ----------
  function initialState () {
    return {
      orders: SEED.map(function (r) {
        return { no: r[0], date: '2026-12-' + r[2], slot: r[3], items: { short4: r[4], short5: r[5], choco5: r[6], noel: r[7], yaki: r[8] }, kana: r[1], memo: r[10], pay: r[9], handed: false, canceled: false }
      }),
      nextNo: 26
    }
  }
  var canSave = false
  try {
    window.localStorage.setItem('tenkaLab.test', '1')
    window.localStorage.removeItem('tenkaLab.test')
    canSave = true
  } catch (e) { canSave = false }

  function isInt (v) { return typeof v === 'number' && Math.floor(v) === v && isFinite(v) }
  function has (o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
  function validOrder (o) {
    if (!o || typeof o !== 'object') return false
    if (!isInt(o.no) || o.no < 1 || o.no > 999) return false
    if (typeof o.date !== 'string' || !has(DAY, o.date)) return false
    if (typeof o.slot !== 'string' || !has(SLOT, o.slot)) return false
    if (!o.items || typeof o.items !== 'object') return false
    var sum = 0
    for (var i = 0; i < PRODS.length; i++) {
      var q = o.items[PRODS[i].id]
      if (!isInt(q) || q < 0 || q > MAX_Q) return false
      sum += q
    }
    if (sum < 1) return false
    if (typeof o.kana !== 'string' || o.kana.length < 1 || o.kana.length > 10 || !o.kana.trim()) return false
    if (typeof o.memo !== 'string' || o.memo.length > 60) return false
    if (typeof o.pay !== 'string' || !has(PAY_NAME, o.pay)) return false
    if (typeof o.handed !== 'boolean' || typeof o.canceled !== 'boolean' || (o.handed && o.canceled)) return false
    return true
  }
  function loadState () {
    if (!canSave) return null
    try {
      var raw = window.localStorage.getItem(STORE_KEY)
      if (!raw) return null
      var d = JSON.parse(raw)
      if (!d || typeof d !== 'object' || d.v !== 1 || !Array.isArray(d.orders) || !isInt(d.nextNo) || d.nextNo < 1 || d.nextNo > 1000) return null
      var seen = {}; var orders = []
      for (var i = 0; i < d.orders.length; i++) {
        var o = d.orders[i]
        if (!validOrder(o) || seen[o.no] || o.no >= d.nextNo) return null
        seen[o.no] = true
        var items = {}; PRODS.forEach(function (p) { items[p.id] = o.items[p.id] })
        orders.push({ no: o.no, date: o.date, slot: o.slot, items: items, kana: o.kana, memo: o.memo, pay: o.pay, handed: o.handed, canceled: o.canceled })
      }
      // 取消でない予約の個数が、どの日・商品でも上限以下
      var g = evaluate(orders).grid
      var over = Object.keys(g).some(function (k) { return g[k].qty > g[k].cap })
      if (over) return null
      return { orders: orders, nextNo: d.nextNo }
    } catch (e) { return null }
  }
  function saveState () {
    if (!canSave) return
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, orders: S.orders, nextNo: S.nextNo }))
    } catch (e) { /* 保存に失敗しても画面は止めない */ }
  }
  var S = null
  function findOrder (no) { return S.orders.filter(function (x) { return x.no === no })[0] || null }

  // ---------- DOM の小道具（⑪と同じ） ----------
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
  // 固定の SVG だけを作る（値は入れない）
  var SW = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  var ICON = {
    ok: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M5 8.3l2 2 4-4.3"' + SW + '/>',
    warn: '<path d="M8 1.8L15 14H1z"' + SW + '/><path d="M8 6.5v3"' + SW + '/><circle cx="8" cy="11.8" r="1" fill="currentColor"/>',
    stop: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M4.8 8h6.4"' + SW + '/>',
    coin: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M5.6 4.6L8 7.6l2.4-3M8 7.6v4.2M6 8.6h4M6 10.4h4"' + SW + '/>',
    check: '<path d="M3 8.5l3.2 3.2L13 4.8"' + SW + '/>',
    ban: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M3.4 12.6l9.2-9.2"' + SW + '/>',
    plus: '<path d="M8 3v10M3 8h10"' + SW + '/>',
    minus: '<path d="M3 8h10"' + SW + '/>',
    print: '<path d="M4 6V1.5h8V6M4 12H2V6.5h12V12h-2"' + SW + '/><path d="M4 9.5h8V15H4z"' + SW + '/>',
    undo: '<path d="M3 3v4h4"' + SW + '/><path d="M3.3 7A5.5 5.5 0 1 1 4 11.5"' + SW + '/>',
    close: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"' + SW + '/>',
    stamp: '<svg class="stamp" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="見本の印（この表は見本です）">' +
      '<rect x="1.5" y="1.5" width="53" height="53" rx="4" fill="none" stroke="#B23A2E" stroke-width="3"/>' +
      '<rect x="6.5" y="6.5" width="43" height="43" rx="2" fill="none" stroke="#B23A2E" stroke-width="1"/>' +
      '<text x="28" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">見</text>' +
      '<text x="28" y="45" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">本</text>' +
      '</svg>'
  }
  function icon (name, size) {
    var t = document.createElement('template')
    var s = size || 14
    t.innerHTML = name === 'stamp' ? ICON.stamp : '<svg width="' + s + '" height="' + s + '" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>'
    return t.content.firstChild
  }
  function fillIcons (root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-icon]'), function (el) {
      if (el.firstChild) return
      var n = el.getAttribute('data-icon')
      var size = /20$/.test(n) ? 20 : /18$/.test(n) ? 18 : 16
      el.appendChild(icon(n.replace(/\d+$/, ''), size))
    })
  }
  // 枠の印の札（§1-2）・予約の札（§1-3）
  var LEVEL = { full: { text: '満数', icon: 'stop' }, few: { text: '残りわずか', icon: 'warn' } }
  function levelTag (lv) { return lv ? h('span', { class: 'level level--' + lv }, [icon(LEVEL[lv].icon, 14), LEVEL[lv].text]) : null }
  function payTag (pay) { return h('span', { class: 'pay-tag pay-tag--' + pay }, [icon(pay === 'pre' ? 'ok' : 'coin', 14), PAY_NAME[pay]]) }
  function stateTag (o) {
    if (o.canceled) return h('span', { class: 'state-tag state-tag--canceled' }, [icon('ban', 14), '取消'])
    if (o.handed) return h('span', { class: 'state-tag state-tag--handed' }, [icon('check', 14), '渡した'])
    return null
  }

  // ---------- 画面の状態（保存しない） ----------
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var mqPC = window.matchMedia('(min-width: 768px)')
  var mqWide = window.matchMedia('(min-width: 1200px)')
  var ui = {
    tab: 'order', fDay: 'all', fState: 'active', pDay: 'all', hDay: FIRST_DAY,
    inDate: FIRST_DAY, inSlot: null, inPay: 'onsite', edDate: null, edSlot: null, edPay: 'onsite',
    errIn: false, errEd: false, editNo: null, newNo: null, printMode: null
  }
  var E = null // 最後の evaluate の結果

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

  // ---------- 確認の窓（⑪と同じ） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null; var dlgFallbackFocus = null
  function confirmBox (opt) {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(window.confirm(opt.title + '\n\n' + opt.body)); return }
      dlgOpener = document.activeElement
      dlgFallbackFocus = opt.fallback || null
      $('cf-title').textContent = opt.title
      $('cf-body').textContent = opt.body
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
    window.setTimeout(function () {
      if (document.activeElement && document.activeElement !== document.body && !dlg.contains(document.activeElement)) return
      var target = dlgOpener && document.contains(dlgOpener) ? dlgOpener : dlgFallbackFocus
      if (target) target.focus()
    }, 0)
  }
  $('cf-ok').addEventListener('click', function () { closeDlg(true) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(false) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(false) })

  // ---------- タブ（⑪と同じ） ----------
  var TABS = ['order', 'prep', 'hand']
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
    if (e.key === 'ArrowRight') j = (i + 1) % 3
    else if (e.key === 'ArrowLeft') j = (i + 2) % 3
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = 2
    if (j === null) return
    e.preventDefault()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  function goTo (el, focusEl) {
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    if (focusEl) focusEl.focus({ preventScroll: true })
  }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      openTab(a.getAttribute('data-tab'), { noScroll: true })
      var card = $(a.getAttribute('data-go'))
      var f = a.getAttribute('data-focus')
      var fe = f === 'slot' ? $('in-slot').querySelector('[tabindex="0"]') : f ? $(f) : card.querySelector('[tabindex="-1"]')
      goTo(card, fe)
    })
  })

  // ---------- 切替（.seg。ラジオの動き。選ばれていない時は1つ目にフォーカスが入る） ----------
  function makeSeg (el, opts, get, set) {
    var btns = opts.map(function (o) {
      return h('button', { type: 'button', class: 'seg__btn', role: 'radio', 'data-v': o.id, 'aria-label': o.aria || null, onclick: function () { if (b0.disabled) return; set(o.id); refresh() } },
        o.label ? o.label() : [o.icon ? icon(o.icon, 16) : null, o.name])
    })
    var b0 = { disabled: false }
    append(el, btns)
    function refresh () {
      var cur = get()
      var any = btns.some(function (b) { return b.getAttribute('data-v') === cur })
      btns.forEach(function (b, i) {
        var on = b.getAttribute('data-v') === cur
        b.setAttribute('aria-checked', on ? 'true' : 'false')
        b.tabIndex = on || (!any && i === 0) ? 0 : -1
      })
    }
    el.addEventListener('keydown', function (e) {
      var i = btns.indexOf(document.activeElement); if (i < 0) return
      var n = btns.length; var j = null
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + n - 1) % n
      else if (e.key === 'Home') j = 0
      else if (e.key === 'End') j = n - 1
      if (j === null) return
      e.preventDefault()
      btns[j].click(); btns[j].focus()
    })
    refresh()
    return {
      refresh: refresh,
      first: function () { return btns.filter(function (b) { return b.tabIndex === 0 })[0] || btns[0] },
      setDisabled: function (v) { b0.disabled = v; btns.forEach(function (b) { b.disabled = v }) }
    }
  }
  function dayLabel (d) { return [h('span', { class: 'seg__main', text: DAY[d].md }), h('span', { class: 'seg__sub', text: '（' + DAY[d].w + '）' })] }
  var DAY_OPTS = DAYS.map(function (d) { return { id: d.id, label: function () { return dayLabel(d.id) }, aria: fmtDay(d.id) } })
  var SLOT_OPTS = SLOTS.map(function (s) { return { id: s.id, label: function () { return [h('span', { class: 'seg__main', text: s.name }), h('span', { class: 'seg__sub', text: s.range })] }, aria: fmtSlot(s.id) } })

  // ---------- 入力の読み取り（§7-4） ----------
  function parseQty (raw) {
    var s = String(raw === null || raw === undefined ? '' : raw).trim()
    if (!s) return { v: 0, empty: true }
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
    if (!/^\d+$/.test(s)) return { err: 'form' }
    var v = parseInt(s, 10)
    if (v < 1 || v > MAX_Q) return { err: 'range' }
    return { v: v }
  }
  var MSG = {
    date: '受け取り日を選んでください',
    slot: '受け取りの時間帯を選んでください',
    qForm: '個数は 1〜20 の整数で入れてください',
    qRange: '個数は 1〜20 の整数で入れてください（いらない商品は空のままにします）',
    none: '商品を1つ以上入れてください',
    kana: 'お名前（仮名）を入れてください'
  }
  function msgFull (d, p) { return fmtDay(d) + 'の' + PROD[p].mid + 'は満数です（上限' + CAP[d][p] + '個）。ほかの日をお選びください' }
  function msgOver (d, p, left) { return fmtDay(d) + 'の' + PROD[p].mid + 'は残り' + left + '個です（上限' + CAP[d][p] + '個）。' + left + '個まで入れられます' }
  function msgOverEd (d, p, allow, oth) { return fmtDay(d) + 'の' + PROD[p].mid + 'は、この予約に' + allow + '個まで入れられます（上限' + CAP[d][p] + '個・ほかの予約で' + oth + '個）' }
  function limitMsg (pf, d, p) {
    var ex = pf === 'ed' ? ui.editNo : null
    var allow = allowance(S.orders, d, p, ex)
    if (allow === 0) return msgFull(d, p)
    return pf === 'ed' ? msgOverEd(d, p, allow, others(S.orders, d, p, ex)) : msgOver(d, p, allow)
  }
  function cleanMemo (s) { return String(s || '').replace(/\r\n?/g, '\n').trim() }
  function readForm (pf) {
    var errs = {}; var items = {}
    var date = ui[pf + 'Date']; var slot = ui[pf + 'Slot']
    if (!date || !has(DAY, date)) errs.date = MSG.date
    if (!slot || !has(SLOT, slot)) errs.slot = MSG.slot
    var anyQ = false; var formErr = false
    PRODS.forEach(function (p) {
      var r = parseQty($(pf + '-q-' + p.id).value)
      if (r.err) { errs['q-' + p.id] = r.err === 'range' ? MSG.qRange : MSG.qForm; formErr = true; items[p.id] = 0; return }
      items[p.id] = r.v
      if (r.v > 0) anyQ = true
    })
    if (!formErr && !anyQ) errs.prods = MSG.none
    if (!errs.date) {
      PRODS.forEach(function (p) {
        if (errs['q-' + p.id] || !items[p.id]) return
        var allow = allowance(S.orders, date, p.id, pf === 'ed' ? ui.editNo : null)
        if (items[p.id] > allow) errs['q-' + p.id] = limitMsg(pf, date, p.id)
      })
    }
    var kana = $(pf + '-kana').value.trim()
    if (!kana) errs.kana = MSG.kana
    var rec = { date: date, slot: slot, items: items, kana: kana, memo: cleanMemo($(pf + '-memo').value), pay: ui[pf + 'Pay'] }
    return { errs: errs, rec: rec, ok: !Object.keys(errs).length }
  }
  // 入力中の個数と、お会計（形の正しい行だけ数える）
  function formBill (pf) {
    var sum = 0; var n = 0
    PRODS.forEach(function (p) { var r = parseQty($(pf + '-q-' + p.id).value); if (!r.err && r.v) { sum += r.v * p.price; n += r.v } })
    return { sum: sum, n: n }
  }

  // ---------- 商品と個数の行（§7-3。入力のカード・修正の窓で共通） ----------
  function buildProdRows (pf) {
    var box = $(pf + '-prods-rows')
    PRODS.forEach(function (p) {
      var id = pf + '-q-' + p.id
      box.appendChild(h('div', { class: 'prod-row', id: id + '-row', 'data-prod': p.id }, [
        h('p', { class: 'prod-row__r1' }, [h('span', { class: 'prod-row__name', text: p.name }), h('span', { class: 'prod-row__price', text: fmtYen(p.price) })]),
        h('div', { class: 'prod-row__r2' }, [
          h('p', { class: 'prod-row__info', id: id + '-info' }),
          h('div', { class: 'qty', id: id + '-qty' }, [
            h('button', { type: 'button', class: 'qty__minus', 'data-prod': p.id, 'aria-label': '1つ減らす' }, icon('minus', 20)),
            h('input', { class: 'qty__n', id: id, type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': p.mid + 'の個数', 'data-prod': p.id }),
            h('button', { type: 'button', class: 'qty__plus', 'data-prod': p.id, 'aria-label': '1つ増やす' }, icon('plus', 20))
          ])
        ]),
        h('p', { class: 'prod-row__full', id: id + '-full', hidden: true, text: '満数のため、この日は受け付けられません' }),
        h('p', { class: 'prod-row__why', id: id + '-why', hidden: true }),
        h('p', { class: 'field__err', id: id + '-err', hidden: true })
      ]))
    })
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-prod]'); if (!b || b.disabled) return
      var p = b.getAttribute('data-prod')
      var inp = $(pf + '-q-' + p)
      var r = parseQty(inp.value)
      var cur = r.err ? 0 : r.v
      var why = $(pf + '-q-' + p + '-why')
      if (b.classList.contains('qty__plus')) {
        if (b.getAttribute('aria-disabled') === 'true') {
          why.textContent = limitMsg(pf, ui[pf + 'Date'], p)
          why.hidden = false
          setRowDescribed(pf, p)
          announce(why.textContent)
          return
        }
        inp.value = String(cur + 1)
      } else {
        inp.value = cur <= 1 ? '' : String(cur - 1)
        why.hidden = true; why.textContent = ''
      }
      onFormChange(pf)
    })
    box.addEventListener('input', function (e) {
      if (e.target.classList.contains('qty__n')) {
        var why = $(pf + '-q-' + e.target.getAttribute('data-prod') + '-why')
        why.hidden = true; why.textContent = ''
        onFormChange(pf)
      }
    })
  }
  function setRowDescribed (pf, p) {
    var id = pf + '-q-' + p
    var ids = [id + '-info']
    ;['-full', '-why', '-err'].forEach(function (s) { if (!$(id + s).hidden) ids.push(id + s) })
    $(id).setAttribute('aria-describedby', ids.join(' '))
  }
  // 2段目の文・札・＋の押せる／押せない・お会計を作り直す
  function updateRows (pf) {
    var date = ui[pf + 'Date']
    var ex = pf === 'ed' ? ui.editNo : null
    PRODS.forEach(function (p) {
      var id = pf + '-q-' + p.id
      var cap = CAP[date][p.id]
      var oth = others(S.orders, date, p.id, ex)
      var allow = Math.max(0, cap - oth)
      var r = parseQty($(id).value)
      var cur = r.err ? 0 : r.v
      var info = $(id + '-info'); info.textContent = ''
      var lv = pf === 'ed' ? levelOf(oth, cap) : E.grid[date + '|' + p.id].level
      if (pf === 'ed') {
        append(info, [h('span', { class: 'prod-row__left', text: 'ほかの予約で' + oth + '個／上限' + cap }), ' → ', h('strong', { text: allow ? 'この予約は' + allow + '個まで' : 'この予約には入れられません' })])
      } else if (!r.err && cur > 0 && cur <= allow) {
        append(info, ['残り ' + allow + '個 → この予約で ' + cur + '個 → ', h('strong', { text: '残り ' + (allow - cur) + '個' })])
      } else {
        append(info, [h('strong', { class: 'prod-row__left', text: '残り ' + allow + '個' }), h('span', { class: 'prod-row__cap', text: '（上限' + cap + '）' })])
      }
      var tag = levelTag(lv)
      if (tag) info.appendChild(tag)
      $(id + '-row').setAttribute('data-level', lv)
      $(id + '-full').hidden = allow !== 0
      var plus = $(id + '-qty').querySelector('.qty__plus')
      if (cur + 1 > allow || cur >= MAX_Q) plus.setAttribute('aria-disabled', 'true'); else plus.removeAttribute('aria-disabled')
      setRowDescribed(pf, p.id)
    })
    var b = formBill(pf)
    $(pf + '-bill').textContent = 'お会計 ' + fmtYen(b.sum) + '（' + b.n + '個）'
  }
  function showErrors (pf, errs) {
    ;['date', 'slot', 'kana', 'prods'].forEach(function (f) {
      var el = $(pf + '-' + f + '-err')
      var tgt = f === 'kana' ? $(pf + '-kana') : $(pf + '-' + f)
      if (errs[f]) { el.textContent = errs[f]; el.hidden = false; tgt.setAttribute('aria-invalid', 'true') } else { el.textContent = ''; el.hidden = true; tgt.removeAttribute('aria-invalid') }
      if (f === 'kana') {
        var ids = pf === 'in' ? ['in-kana-hint'] : []
        if (errs.kana) ids.push(el.id)
        if (ids.length) tgt.setAttribute('aria-describedby', ids.join(' ')); else tgt.removeAttribute('aria-describedby')
      } else if (f !== 'prods') {
        if (errs[f]) tgt.setAttribute('aria-describedby', el.id); else tgt.removeAttribute('aria-describedby')
      }
    })
    PRODS.forEach(function (p) {
      var id = pf + '-q-' + p.id
      var el = $(id + '-err'); var m = errs['q-' + p.id]
      if (m) { el.textContent = m; el.hidden = false; $(id).setAttribute('aria-invalid', 'true'); $(id + '-qty').classList.add('is-invalid'); $(id + '-why').hidden = true } else { el.textContent = ''; el.hidden = true; $(id).removeAttribute('aria-invalid'); $(id + '-qty').classList.remove('is-invalid') }
      setRowDescribed(pf, p.id)
    })
  }
  function focusFirstErr (pf, errs) {
    if (errs.date) { segs[pf + 'Date'].first().focus(); return }
    if (errs.slot) { segs[pf + 'Slot'].first().focus(); return }
    for (var i = 0; i < PRODS.length; i++) { if (errs['q-' + PRODS[i].id]) { $(pf + '-q-' + PRODS[i].id).focus(); return } }
    if (errs.prods) { $(pf + '-q-' + PRODS[0].id).focus(); return }
    if (errs.kana) $(pf + '-kana').focus()
  }
  function onFormChange (pf) {
    updateRows(pf)
    if (ui['err' + (pf === 'in' ? 'In' : 'Ed')]) showErrors(pf, readForm(pf).errs)
  }
  function clearWhy (pf) { PRODS.forEach(function (p) { var w = $(pf + '-q-' + p.id + '-why'); w.hidden = true; w.textContent = '' }) }

  // ---------- 入力のカード（§7-3） ----------
  var segs = {}
  buildProdRows('in')
  segs.inDate = makeSeg($('in-date'), DAY_OPTS, function () { return ui.inDate }, function (v) { ui.inDate = v; clearWhy('in'); onFormChange('in') })
  segs.inSlot = makeSeg($('in-slot'), SLOT_OPTS, function () { return ui.inSlot }, function (v) { ui.inSlot = v; onFormChange('in') })
  segs.inPay = makeSeg($('in-pay'), PAYS, function () { return ui.inPay }, function (v) { ui.inPay = v })
  ;['in-kana'].forEach(function (id) { $(id).addEventListener('input', function () { if (ui.errIn) showErrors('in', readForm('in').errs) }) })
  function clearEntry (keep) {
    ui.inSlot = null
    if (!keep) { ui.inDate = FIRST_DAY; ui.inPay = 'onsite' }
    PRODS.forEach(function (p) { $('in-q-' + p.id).value = '' })
    $('in-kana').value = ''; $('in-memo').value = ''
    ui.errIn = false
    segs.inDate.refresh(); segs.inSlot.refresh(); segs.inPay.refresh()
    clearWhy('in')
    showErrors('in', {})
    updateRows('in')
  }
  function newFullText (before, after) {
    var was = {}; before.full.forEach(function (m) { was[m.date + '|' + m.prod] = true })
    var add = after.full.filter(function (m) { return !was[m.date + '|' + m.prod] })
    return add.length ? '。' + add.map(function (m) { return fmtDay(m.date) + PROD[m.prod].short }).join('・') + 'が満数になりました' : ''
  }
  $('order-form').addEventListener('submit', function (e) {
    e.preventDefault()
    var r = readForm('in')
    if (!r.ok) { ui.errIn = true; showErrors('in', r.errs); focusFirstErr('in', r.errs); return }
    var before = E.marks
    var o = r.rec
    o.no = S.nextNo++
    o.handed = false; o.canceled = false
    var rec = { no: o.no, date: o.date, slot: o.slot, items: o.items, kana: o.kana, memo: o.memo, pay: o.pay, handed: false, canceled: false }
    S.orders.push(rec)
    saveState()
    ui.newNo = rec.no
    renderAll()
    clearEntry(true)
    showToast(fmtNo(rec.no) + ' ' + rec.kana + '様 ' + fmtDay(rec.date) + SLOT[rec.slot].name + ' の予約を受けました（' + fmtYen(amountOf(rec)) + '）' + newFullText(before, E.marks))
    // 横に並ぶ幅（1200px〜）だけ、受けた行まで動かす。狭い幅では入力欄を画面に残す
    var row = $('ord-' + rec.no)
    if (row && mqWide.matches) {
      var rr = row.getBoundingClientRect()
      if (rr.top < 72 || rr.bottom > window.innerHeight) row.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    }
    segs.inSlot.first().focus({ preventScroll: true })
  })

  // ---------- 上の数字・バッジ（§7-2・§6） ----------
  function markCount () { return E.marks.full.length + E.marks.few.length }
  function renderSummary () {
    $('sum-count-n').textContent = String(E.count)
    $('sum-count-note').textContent = E.canceled ? '取消 ' + E.canceled + '件（数に入れていません）' : '取消 0件'
    $('sum-qty-n').textContent = String(E.qty)
    $('sum-sales-n').textContent = fmtYen(E.sales.all)
    setSalesNote($('sum-sales-note'))
    var n = markCount()
    var box = $('sum-mark')
    box.classList.toggle('is-ok', !n)
    var ic = $('sum-mark-icon'); ic.textContent = ''; ic.appendChild(icon(n ? 'warn' : 'ok', 16))
    var v = $('sum-mark-val'); v.textContent = ''
    // 「満数 2・」「残りわずか 1」をそれぞれ1かたまりにして、数字だけが次の行に落ちないようにする
    if (n) append(v, [h('span', { class: 'nw' }, ['満数 ', h('span', { class: 'summary__n', text: String(E.marks.full.length) }), '・']), h('wbr'), h('span', { class: 'nw' }, ['残りわずか ', h('span', { class: 'summary__n', text: String(E.marks.few.length) })])])
    else { v.appendChild(h('span', { class: 'summary__okmsg', text: '満数・残りわずかの枠はありません' })) }
    var b = $('tab-prep-badge')
    b.hidden = !n
    b.textContent = n ? '印 ' + n : ''
    if (n) $('tab-prep').setAttribute('aria-label', '仕込み表（満数 ' + E.marks.full.length + '枠・残りわずか ' + E.marks.few.length + '枠）')
    else $('tab-prep').removeAttribute('aria-label')
  }
  $('sum-mark-link').addEventListener('click', function (e) {
    e.preventDefault()
    openTab('prep', { noScroll: true })
    goTo($('prep-card'), $('h-prep'))
  })

  // ---------- 絞り込み（§7-9） ----------
  segs.fDay = makeSeg($('f-day'), [{ id: 'all', name: 'すべて' }].concat(DAYS.map(function (d) { return { id: d.id, name: d.md, aria: fmtDay(d.id) } })), function () { return ui.fDay }, function (v) { ui.fDay = v; renderList() })
  $('f-state').addEventListener('change', function () { ui.fState = $('f-state').value; renderList() })
  function resetFilters () { ui.fDay = 'all'; ui.fState = 'active'; $('f-state').value = 'active'; segs.fDay.refresh() }
  function visibleOrders () {
    return sortOrders(S.orders).filter(function (o) {
      if (ui.fDay !== 'all' && o.date !== ui.fDay) return false
      var st = ui.fState
      if (st === 'active') return !o.canceled
      if (st === 'pending') return !o.canceled && !o.handed
      if (st === 'handed') return !o.canceled && o.handed
      if (st === 'canceled') return o.canceled
      return true
    })
  }

  // ---------- 一覧（§7-7・7-8） ----------
  function rowLabel (o) {
    var st = o.canceled ? '（取消）' : o.handed ? '（渡した）' : ''
    return fmtNo(o.no) + ' ' + o.kana + '様 ' + fmtDay(o.date) + SLOT[o.slot].name + st + ' を直す・取り消す'
  }
  // スマホのカードは aria-label が中身を上書きするため、商品・お会計・支払い・メモも入れる
  function cardLabel (o) {
    var st = o.canceled ? '（取消）' : o.handed ? '（渡した）' : ''
    return fmtNo(o.no) + ' ' + o.kana + '様 ' + fmtDay(o.date) + SLOT[o.slot].name + st + '。' + itemsText(o.items) + '。' +
      fmtYen(amountOf(o)) + '・' + PAY_NAME[o.pay] + (o.memo ? '。メモ：' + o.memo : '') + '。直す・取り消す'
  }
  function renderList () {
    var area = $('list-area'); area.textContent = ''
    var list = visibleOrders()
    var q = 0; var amt = 0; var anyCanceled = false
    list.forEach(function (o) { if (o.canceled) { anyCanceled = true; return } q += qtyOf(o); amt += amountOf(o) })
    $('list-info').textContent = list.length + '件を表示' + (list.length ? '・表示中の個数 ' + q + '個・お会計 ' + fmtYen(amt) + (anyCanceled ? '（取消は入れていません）' : '') : '')
    if (!list.length) {
      area.appendChild(h('p', { class: 'list-none' }, ['条件に合う予約はありません', h('button', {
        type: 'button', class: 'text-link linkbtn', id: 'f-clear', text: '絞り込みを外す',
        onclick: function () { resetFilters(); renderList(); $('h-list').focus() }
      })]))
      return
    }
    var newNo = ui.newNo; ui.newNo = null
    var prevDate = null
    if (mqPC.matches) {
      var head = h('tr', {}, [
        h('th', { scope: 'col', class: 'c-when', text: '受け取り' }), h('th', { scope: 'col', class: 'c-who' }, [h('span', { class: 'nw', text: '番号・' }), h('span', { class: 'nw', text: 'お名前' })]),
        h('th', { scope: 'col', text: '商品と個数・メモ' }), h('th', { scope: 'col', class: 'c-amt num', text: 'お会計' }),
        
        h('th', { scope: 'col', class: 'c-state', text: '状態' }), h('th', { scope: 'col', class: 'c-op op', text: '操作' })
      ])
      var rows = list.map(function (o) {
        var cls = ['ord-row']
        if (o.canceled) cls.push('is-canceled'); else if (o.handed) cls.push('is-handed')
        if (prevDate !== null && prevDate !== o.date) cls.push('is-newday')
        prevDate = o.date
        if (newNo === o.no && !reduceMotion) cls.push('is-new')
        var st = stateTag(o)
        return h('tr', { id: 'ord-' + o.no, 'data-no': o.no, class: cls.join(' ') }, [
          h('td', { class: 'order-list__when' }, [h('span', { class: 'order-list__date', text: fmtDay(o.date) }), h('span', { class: 'order-list__slot', text: fmtSlot(o.slot) })]),
          h('td', { class: 'order-list__who' }, [h('span', { class: 'order-list__no', text: fmtNo(o.no) }), h('span', { class: 'order-list__kana', text: o.kana + '様' })]),
          h('td', { class: 'order-list__what' }, [h('span', { class: 'order-list__items t-items' }, itemsNodes(o.items)), o.memo ? h('span', { class: 'order-list__memo', text: o.memo }) : null]),
          h('td', { class: 'order-list__amt' }, [h('span', { class: 'order-list__yen t-amt', text: fmtYen(amountOf(o)) }), h('span', { class: 'order-list__tags' }, [payTag(o.pay), st ? h('span', { class: 'order-list__state-in' }, stateTag(o)) : null])]),
          h('td', { class: 'order-list__state' }, st || h('span', { class: 'order-list__none' }, [h('span', { 'aria-hidden': 'true', text: '—' }), h('span', { class: 'visually-hidden', text: '受け渡し前' })])),
          h('td', { class: 'order-list__op' }, h('button', { type: 'button', class: 'btn-sub btn-sm', 'data-no': o.no, 'aria-label': rowLabel(o), text: '直す' }))
        ])
      })
      area.appendChild(h('table', { class: 'order-list' }, [h('caption', { class: 'visually-hidden', text: '予約の一覧（受け取り日・時間帯の順）' }), h('thead', {}, head), h('tbody', {}, rows)]))
    } else {
      area.appendChild(h('div', { class: 'order-cards' }, list.map(function (o) {
        var cls = 'order-card' + (o.canceled ? ' is-canceled' : o.handed ? ' is-handed' : '') + (newNo === o.no && !reduceMotion ? ' is-new' : '')
        return h('button', { type: 'button', class: cls, id: 'ord-' + o.no, 'data-no': o.no, 'aria-label': cardLabel(o) }, [
          h('span', { class: 'order-card__r1' }, [h('span', { class: 'order-card__when', text: fmtDay(o.date) + ' ' + fmtSlot(o.slot) }), h('span', { class: 'order-card__no', text: fmtNo(o.no) })]),
          h('span', { class: 'order-card__r2' }, [h('span', { class: 'order-card__kana', text: o.kana + '様' }), h('span', { class: 'order-card__amt t-amt', text: fmtYen(amountOf(o)) })]),
          h('span', { class: 'order-card__items t-items' }, itemsNodes(o.items)),
          h('span', { class: 'order-card__tags' }, [payTag(o.pay), stateTag(o)]),
          o.memo ? h('span', { class: 'order-card__memo', text: o.memo }) : null
        ])
      })))
    }
  }
  $('list-area').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-no]')
    if (b) openEdit(parseInt(b.getAttribute('data-no'), 10))
  })
  function rowFocusEl (no) {
    var el = $('ord-' + no)
    if (!el) return null
    return el.tagName === 'TR' ? el.querySelector('button') : el
  }

  // ---------- 仕込み表（§8） ----------
  function barEl (q, cap, lv) {
    var bar = h('div', { class: 'bar', 'aria-hidden': 'true' })
    if (q > 0) {
      var f = h('span', { class: 'bar__fill' + (lv ? ' bar__fill--' + lv : '') })
      f.style.width = Math.min(100, q * 100 / cap) + '%'
      bar.appendChild(f)
    }
    return bar
  }
  // マスの中身（個数 / 上限・棒・% と残り・札）
  function cellBody (c, lv) {
    return [
      h('p', { class: 'cell__n' }, [h('span', { class: 'cell__q t-q', text: String(c.qty) }), h('span', { class: 'cell__cap t-cap', text: ' / ' + c.cap + '個' })]),
      barEl(c.qty, c.cap, lv),
      h('p', { class: 'cell__pct' }, [h('span', { class: 't-pct', text: c.pct + '%' }), h('span', { class: 'cell__left t-left', text: '残り' + c.left })]),
      lv ? h('p', { class: 'cell__tag' }, levelTag(lv)) : null
    ]
  }
  function renderPrep () {
    var T = E.total
    $('p-qty-n').textContent = String(T.qty)
    $('p-qty-note').textContent = '残り ' + T.left + '個（' + T.pct + '%）'
    var nf = E.marks.full.length; var nw = E.marks.few.length
    $('p-full-n').textContent = String(nf)
    setMarkNote($('p-full-note'), E.marks.full.map(function (m) { return [DAY[m.date].md, PROD[m.prod].short] }))
    $('p-full').classList.toggle('is-zero', !nf)
    var fi = $('p-full-icon'); fi.textContent = ''; fi.appendChild(icon('stop', 16))
    $('p-few-n').textContent = String(nw)
    setMarkNote($('p-few-note'), E.marks.few.map(function (m) { return [DAY[m.date].md, PROD[m.prod].short, '（残り' + m.left + '）'] }))
    $('p-few').classList.toggle('is-zero', !nw)
    var wi = $('p-few-icon'); wi.textContent = ''; wi.appendChild(icon('warn', 16))
    $('p-sales-n').textContent = fmtYen(E.sales.all)
    setSalesNote($('p-sales-note'))

    var area = $('prep-area'); area.textContent = ''
    if (mqPC.matches) {
      var body = PRODS.map(function (p) {
        var cells = DAYS.map(function (d) {
          var g = E.grid[d.id + '|' + p.id]
          return h('td', { 'data-key': d.id + '|' + p.id, 'data-level': g.level }, cellBody(g, g.level))
        })
        cells.push(h('td', { class: 'is-sum', 'data-key': 'total|' + p.id, 'data-level': '' }, cellBody(E.byProduct[p.id], '')))
        return h('tr', {}, [h('th', { scope: 'row' }, [h('span', { class: 'prep-table__name', text: p.short }), h('span', { class: 'prep-table__price', text: fmtYen(p.price) })])].concat(cells))
      })
      var tc = DAYS.map(function (d) { return h('td', { class: 'is-sum', 'data-key': d.id + '|total', 'data-level': '' }, cellBody(E.byDay[d.id], '')) })
      tc.push(h('td', { class: 'is-sum', 'data-key': 'total|total', 'data-level': '' }, cellBody(E.total, '')))
      body.push(h('tr', { class: 'is-total' }, [h('th', { scope: 'row', text: '1日の合計' })].concat(tc)))
      area.appendChild(h('table', { class: 'prep-table' }, [
        h('caption', { class: 'visually-hidden', text: '受け取り日ごと・商品ごとの予約の個数と上限' }),
        h('thead', {}, h('tr', {}, [h('th', { scope: 'col', class: 'c-name' }, [h('span', { class: 'nw', text: '商品＼' }), h('span', { class: 'nw', text: '受け取り日' })])].concat(DAYS.map(function (d) { return h('th', { scope: 'col', text: fmtDay(d.id) }) }), [h('th', { scope: 'col', class: 'is-sum', text: '4日の合計' })]))),
        h('tbody', {}, body)
      ]))
    } else {
      DAYS.forEach(function (d) {
        var bd = E.byDay[d.id]
        area.appendChild(h('section', { class: 'prep-day', 'data-day': d.id, 'aria-label': fmtDay(d.id) + 'の仕込み数' }, [
          h('h3', { class: 'prep-day__head' }, [h('span', { class: 'prep-day__date', text: fmtDay(d.id) }), h('span', { class: 'prep-day__sum', 'data-key': d.id + '|total', text: bd.qty + ' / ' + bd.cap + '個（' + bd.pct + '%）残り' + bd.left })]),
          PRODS.map(function (p) { var g = E.grid[d.id + '|' + p.id]; return prepRow(p, g, g.level, d.id + '|' + p.id) })
        ]))
      })
      var T2 = E.total
      area.appendChild(h('section', { class: 'prep-day prep-day--total', 'data-day': 'total', 'aria-label': '4日の合計（商品ごと）' }, [
        h('h3', { class: 'prep-day__head' }, [h('span', { class: 'prep-day__date', text: '4日の合計（商品ごと）' })]),
        PRODS.map(function (p) { return prepRow(p, E.byProduct[p.id], '', 'total|' + p.id) }),
        h('p', { class: 'prep-day__all', 'data-key': 'total|total', text: '合計 ' + T2.qty + ' / ' + T2.cap + '個・' + T2.pct + '%・残り' + T2.left })
      ]))
    }
    renderSales()
    renderPrintCard()
  }
  // 注記の各項目を「12/24」「ショート4号」「（残り1）」の小さい単位に分け、単位の間だけで折れるようにする。
  // 区切りの「・」は前の項目の最後の単位に入れ、行頭に「・」だけが残らないようにする
  function setMarkNote (el, list) {
    el.textContent = ''
    if (!list.length) { el.textContent = 'ありません'; return }
    list.forEach(function (parts, i) {
      if (i) el.appendChild(h('wbr'))
      parts.forEach(function (t, j) {
        var last = j === parts.length - 1
        if (j === 1) el.appendChild(document.createTextNode(' '))
        else if (j > 1) el.appendChild(h('wbr'))
        el.appendChild(h('span', { class: 'nw', text: t + (last && i < list.length - 1 ? '・' : '') }))
      })
    })
  }
  // 売上見込みの注記。「前払い済み」「当日払い」と金額をそれぞれ1かたまりにする（文字は「前払い済み ¥…・当日払い ¥…」のまま）
  function setSalesNote (el) {
    el.textContent = ''
    append(el, [h('span', { class: 'nw', text: '前払い済み' }), ' ', h('span', { class: 'nw', text: fmtYen(E.sales.pre) + '・' }), h('wbr'),
      h('span', { class: 'nw', text: '当日払い' }), ' ', h('span', { class: 'nw', text: fmtYen(E.sales.onsite) })])
  }
  function prepRow (p, c, lv, key) {
    return h('div', { class: 'prep-row', 'data-key': key, 'data-level': lv }, [
      h('p', { class: 'prep-row__r1' }, [
        h('span', { class: 'prep-row__name', text: p.short }),
        h('span', { class: 'cell__n' }, [h('span', { class: 'cell__q t-q', text: String(c.qty) }), h('span', { class: 'cell__cap t-cap', text: ' / ' + c.cap + '個' })]),
        levelTag(lv)
      ]),
      h('div', { class: 'prep-row__r2' }, [barEl(c.qty, c.cap, lv), h('span', { class: 'prep-row__pct t-pct', text: c.pct + '%' }), h('span', { class: 'cell__left t-left', text: '残り' + c.left })])
    ])
  }
  function renderSales () {
    var area = $('sales-area'); area.textContent = ''
    var tot = { n: E.count, pre: E.sales.pre, onsite: E.sales.onsite, all: E.sales.all }
    if (mqPC.matches) {
      var rows = DAYS.map(function (d) {
        var b = E.byDay[d.id]
        return h('tr', { 'data-day': d.id }, [h('th', { scope: 'row', text: fmtDay(d.id) }), h('td', { class: 'num t-n', text: b.count + '件' }), h('td', { class: 'num t-pre', text: fmtYen(b.pre) }), h('td', { class: 'num t-on', text: fmtYen(b.onsite) }), h('td', { class: 'num t-all', text: fmtYen(b.all) })])
      })
      rows.push(h('tr', { class: 'is-total', 'data-day': 'total' }, [h('th', { scope: 'row', text: '4日の合計' }), h('td', { class: 'num t-n', text: tot.n + '件' }), h('td', { class: 'num t-pre', text: fmtYen(tot.pre) }), h('td', { class: 'num t-on', text: fmtYen(tot.onsite) }), h('td', { class: 'num t-all', text: fmtYen(tot.all) })]))
      area.appendChild(h('table', { class: 'sales-table' }, [
        h('caption', { class: 'visually-hidden', text: '受け取り日ごとの売上見込み（前払い済み・当日払い）' }),
        h('thead', {}, h('tr', {}, [
          h('th', { scope: 'col', class: 'c-day', text: '受け取り日' }), h('th', { scope: 'col', class: 'c-n num', text: '件数' }),
          h('th', { scope: 'col', class: 'num' }, h('span', { class: 'th-i' }, [icon('ok', 12), '前払い済み'])),
          h('th', { scope: 'col', class: 'num' }, h('span', { class: 'th-i' }, [icon('coin', 12), '当日払い'])),
          h('th', { scope: 'col', class: 'num', text: '合計' })
        ])),
        h('tbody', {}, rows)
      ]))
    } else {
      DAYS.forEach(function (d) {
        var b = E.byDay[d.id]
        area.appendChild(salesBlock(d.id, fmtDay(d.id), { n: b.count, pre: b.pre, onsite: b.onsite, all: b.all }, false))
      })
      area.appendChild(salesBlock('total', '4日の合計', tot, true))
    }
  }
  function salesBlock (key, label, v, isTotal) {
    return h('div', { class: 'sales-block' + (isTotal ? ' is-total' : ''), 'data-day': key }, [
      h('p', { class: 'sales-block__r1' }, [h('span', { class: 'sales-block__day', text: label }), h('span', { class: 'sales-block__n t-n', text: v.n + '件' }), h('span', { class: 'sales-block__all t-all', text: fmtYen(v.all) })]),
      h('p', { class: 'sales-block__r2' }, ['前払い済み ', h('span', { class: 't-pre', text: fmtYen(v.pre) }), ' ／ 当日払い ', h('span', { class: 't-on', text: fmtYen(v.onsite) })])
    ])
  }

  // ---------- 印刷のカード（§8-5） ----------
  var PDAY_OPTS = [{ id: 'all', name: '4日分（4枚）' }].concat(DAYS.map(function (d) { return { id: d.id, name: d.md, aria: fmtDay(d.id) } }))
  segs.pDay = makeSeg($('p-day-seg'), PDAY_OPTS, function () { return ui.pDay }, function (v) { ui.pDay = v; $('p-day').value = v; renderPrintCard() })
  PDAY_OPTS.forEach(function (o) { $('p-day').appendChild(h('option', { value: o.id, text: o.id === 'all' ? o.name : fmtDay(o.id) })) })
  $('p-day').addEventListener('change', function () { ui.pDay = $('p-day').value; segs.pDay.refresh(); renderPrintCard() })
  function renderPrintCard () {
    var pv = $('print-preview'); pv.textContent = ''
    pv.appendChild(buildPrepSheet(ui.pDay === 'all' ? DAYS[0].id : ui.pDay, false))
  }

  // ---------- 当日の受け渡し（§9） ----------
  segs.hDay = makeSeg($('h-day'), DAY_OPTS, function () { return ui.hDay }, function (v) { ui.hDay = v; renderHand(); var b = handBand(); announce(fmtDay(v) + ' 残り ' + b.left + '件') })
  function handOrders (d) { return S.orders.filter(function (o) { return o.date === d && !o.canceled }) }
  function handBand () {
    var list = handOrders(ui.hDay)
    var left = list.filter(function (o) { return !o.handed })
    var on = left.filter(function (o) { return o.pay === 'onsite' })
    var sum = 0; on.forEach(function (o) { sum += amountOf(o) })
    return { total: list.length, left: left.length, onN: on.length, onSum: sum }
  }
  function renderHand () {
    var d = ui.hDay
    var b = handBand()
    var band = $('hand-band'); band.textContent = ''
    band.classList.toggle('is-done', b.total > 0 && b.left === 0)
    if (!b.total) band.appendChild(h('p', { class: 'hand-band__l1', id: 'hand-band-1', text: fmtDay(d) + ' この日の予約はありません' }))
    else if (!b.left) band.appendChild(h('p', { class: 'hand-band__l1 hand-band__done', id: 'hand-band-1' }, [icon('ok', 20), fmtDay(d) + ' この日の受け渡しはすべて済みました']))
    else {
      append(band, [
        h('p', { class: 'hand-band__l1', id: 'hand-band-1' }, [fmtDay(d) + ' 残り ', h('strong', { class: 'hand-band__n', text: String(b.left) }), '件 ／ ' + b.total + '件']),
        h('p', { class: 'hand-band__l2', id: 'hand-band-2' }, ['当日のお会計 残り ', h('strong', { text: String(b.onN) }), '件 ', h('strong', { class: 'hand-band__yen', text: fmtYen(b.onSum) })])
      ])
    }
    var sb = $('slip-btn')
    $('slip-btn-text').textContent = 'この日の予約票を印刷（' + b.total + '枚）'
    if (b.total) sb.removeAttribute('aria-disabled'); else sb.setAttribute('aria-disabled', 'true')
    var area = $('hand-slots'); area.textContent = ''
    SLOTS.forEach(function (s) {
      var list = handOrders(d).filter(function (o) { return o.slot === s.id })
      var pend = list.filter(function (o) { return !o.handed }).sort(function (a, c) { return a.no - c.no })
      var done = list.filter(function (o) { return o.handed }).sort(function (a, c) { return a.no - c.no })
      area.appendChild(h('section', { class: 'hand-slot', 'data-slot': s.id, 'aria-labelledby': 'hs-' + s.id }, [
        h('h3', { class: 'hand-slot__head', id: 'hs-' + s.id }, [h('span', { class: 'hand-slot__name', text: fmtSlot(s.id) }), h('span', { class: 'hand-slot__n', text: list.length ? '残り ' + pend.length + '件 ／ ' + list.length + '件' : '予約なし' })]),
        list.length ? h('div', { class: 'hand-slot__rows' }, pend.concat(done).map(handRow)) : null
      ]))
    })
  }
  function handRow (o) {
    var amt = amountOf(o)
    var right
    if (o.pay === 'pre') right = payTag('pre')
    else if (o.handed) right = h('span', { class: 'bill-done', text: 'お会計済み ' + fmtYen(amt) })
    else right = h('span', { class: 'bill' }, [h('span', { class: 'bill__l', text: 'お会計' }), h('span', { class: 'bill__n', text: fmtYen(amt) })])
    return h('label', { class: 'hand-row' + (o.handed ? ' is-handed' : ''), id: 'hand-' + o.no, 'data-no': o.no }, [
      h('span', { class: 'hand-row__check' }, [
        h('input', { type: 'checkbox', class: 'hand-check', 'data-no': o.no, checked: o.handed ? true : null, 'aria-label': fmtNo(o.no) + ' ' + o.kana + '様 渡した' + (o.pay === 'onsite' && !o.handed ? '（お会計 ' + fmtYen(amt) + '）' : '') }),
        h('span', { class: 'hand-row__lbl', 'aria-hidden': 'true', text: '渡した' })
      ]),
      h('span', { class: 'hand-row__body' }, [
        h('span', { class: 'hand-row__r1' }, [h('span', { class: 'hand-row__no', text: fmtNo(o.no) }), h('span', { class: 'hand-row__kana', text: o.kana + '様' })]),
        h('span', { class: 'hand-row__items' }, itemsNodes(o.items)),
        o.memo ? h('span', { class: 'hand-row__memo', text: o.memo }) : null
      ]),
      h('span', { class: 'hand-row__right' }, right)
    ])
  }
  $('hand-slots').addEventListener('change', function (e) {
    var c = e.target.closest('.hand-check'); if (!c) return
    var no = parseInt(c.getAttribute('data-no'), 10)
    var o = findOrder(no); if (!o || o.canceled) return
    o.handed = c.checked
    saveState()
    renderAll()
    var nc = $('hand-' + no) && $('hand-' + no).querySelector('.hand-check')
    if (nc) nc.focus()
    var b = handBand()
    announce(fmtNo(o.no) + ' ' + o.kana + '様 ' + (o.handed ? 'を渡したにしました' : 'の「渡した」を外しました') + '。残り ' + b.left + '件')
  })

  // ---------- 紙面（§10。値は textContent） ----------
  function stampEl () { return icon('stamp') }
  function buildPrepSheet (d, full) {
    var bd = E.byDay[d]
    var head = h('div', { class: 'sheet__head' }, [
      h('p', { class: 'sheet__title' }, [h('span', { class: 'sheet__t', text: '仕込み表' }), h('span', { class: 'sheet__period', text: fmtDayLong(d) + '受け取り分' })]),
      h('p', { class: 'sheet__shop' }, [SHOP, stampEl()])
    ])
    var count = h('p', { class: 'sheet__count', text: '予約 ' + bd.count + '件・' + bd.qty + '個' })
    var prows = PRODS.map(function (p) {
      var g = E.grid[d + '|' + p.id]
      var left = String(g.left) + (g.level === 'full' ? '（満数）' : g.level === 'few' ? '（残りわずか）' : '')
      return h('tr', { 'data-prod': p.id }, [h('td', { text: p.name }), h('td', { class: 'num sheet__big', text: String(g.qty) }), h('td', { class: 'num', text: String(g.cap) }), h('td', { class: 'sheet__left', text: left }), h('td', { class: 'ctr' }, h('span', { class: 'sheet__box', 'aria-hidden': 'true' }))])
    })
    prows.push(h('tr', { class: 'sheet__sum' }, [h('th', { scope: 'row', text: '合計' }), h('td', { class: 'num sheet__big', text: String(bd.qty) }), h('td', { class: 'num', text: String(bd.cap) }), h('td', { text: String(bd.left) }), h('td', {})]))
    var prods = h('table', { class: 'sheet__prods' }, [
      h('colgroup', {}, [h('col', { class: 'sw-name' }), h('col', { class: 'sw-q' }), h('col', { class: 'sw-cap' }), h('col', { class: 'sw-left' }), h('col', { class: 'sw-done' })]),
      h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: '商品' }), h('th', { scope: 'col', class: 'num', text: '予約の個数' }), h('th', { scope: 'col', class: 'num', text: '上限' }), h('th', { scope: 'col', text: '残り' }), h('th', { scope: 'col', class: 'ctr', text: '仕込み済み' })])),
      h('tbody', {}, prows)
    ])
    var kids = [head, count, h('p', { class: 'sheet__h', text: '商品ごとの個数' }), full ? prods : h('div', { class: 'sheet__scroll' }, prods)]
    if (!full) {
      kids.push(h('p', { class: 'sheet__more', text: '※ 印刷すると、この下に時間帯ごとの個数と、メモのある予約の一覧が続きます。' }))
      return h('div', { class: 'sheet', 'data-day': d }, kids)
    }
    var srows = SLOTS.map(function (s) {
      var bs = E.bySlot[d + '|' + s.id]
      return h('tr', { 'data-slot': s.id }, [h('td', { text: fmtSlot(s.id) })].concat(PRODS.map(function (p) { return h('td', { class: 'num', text: String(bs.items[p.id] || 0) }) }), [h('td', { class: 'num', text: String(bs.qty) })]))
    })
    srows.push(h('tr', { class: 'sheet__sum' }, [h('th', { scope: 'row', text: '合計' })].concat(PRODS.map(function (p) { return h('td', { class: 'num', text: String(E.grid[d + '|' + p.id].qty) }) }), [h('td', { class: 'num', text: String(bd.qty) })])))
    var slots = h('table', { class: 'sheet__slots' }, [
      h('colgroup', {}, [h('col', { class: 'sw-slot' })].concat(PRODS.map(function () { return h('col', { class: 'sw-p' }) }), [h('col', { class: 'sw-t' })])),
      h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: '時間帯' })].concat(PRODS.map(function (p) { return h('th', { scope: 'col', class: 'num', text: p.short }) }), [h('th', { scope: 'col', class: 'num', text: '計' })]))),
      h('tbody', {}, srows)
    ])
    var memos = sortOrders(S.orders.filter(function (o) { return o.date === d && !o.canceled && o.memo }))
    var memoEl = memos.length
      ? h('table', { class: 'sheet__memos' }, [
        h('colgroup', {}, [h('col', { class: 'sw-no' }), h('col', { class: 'sw-kana' }), h('col', { class: 'sw-mslot' }), h('col', {})]),
        h('thead', {}, h('tr', {}, ['番号', 'お名前', '時間帯', 'メモ'].map(function (t) { return h('th', { scope: 'col', text: t }) }))),
        h('tbody', {}, memos.map(function (o) { return h('tr', {}, [h('td', { text: fmtNo(o.no) }), h('td', { text: o.kana + '様' }), h('td', { text: SLOT[o.slot].name }), h('td', { class: 'sheet__memo', text: o.memo })]) }))
      ])
      : h('p', { class: 'sheet__nomemo', text: 'メモのある予約はありません' })
    kids.push(h('p', { class: 'sheet__h', text: '時間帯ごとの個数（この時間までに用意する数）' }), slots,
      h('p', { class: 'sheet__h', text: 'メモのある予約' }), memoEl,
      h('div', { class: 'sheet__end' }, [
        h('p', { class: 'sheet__note', text: 'アレルギーの対応はお店でご確認ください。' }),
        h('p', { class: 'sheet__foot', text: 'この表は TENKA LAB の制作見本です。お店・商品・予約はすべて架空です。' })
      ]))
    return h('section', { class: 'sheet sheet--print', 'data-day': d }, kids)
  }
  function buildSlips (d) {
    var list = sortOrders(handOrders(d))
    var pages = []
    for (var i = 0; i < list.length; i += 8) pages.push(list.slice(i, i + 8))
    if (!pages.length) return [h('p', { class: 'print-empty', text: fmtDayLong(d) + 'の予約はありません。' })]
    return pages.map(function (pg) {
      return h('section', { class: 'slips' }, [
        h('div', { class: 'slips__grid' }, pg.map(function (o) {
          return h('div', { class: 'slip', 'data-no': o.no }, [
            h('p', { class: 'slip__head' }, [h('span', { class: 'slip__t', text: '予約票' }), h('span', { class: 'slip__no', text: fmtNo(o.no) }), stampEl()]),
            h('p', { class: 'slip__kana', text: o.kana + '様' }),
            h('p', { class: 'slip__when', text: fmtDayLong(o.date) + ' ' + fmtSlot(o.slot) }),
            h('ul', { class: 'slip__items' }, PRODS.filter(function (p) { return o.items[p.id] > 0 }).map(function (p) { return h('li', { text: p.name + ' ×' + o.items[p.id] }) })),
            h('p', { class: 'slip__pay', text: o.pay === 'pre' ? '前払い済み' : '当日払い ' + fmtYen(amountOf(o)) }),
            h('p', { class: 'slip__memo', text: 'メモ：' + o.memo })
          ])
        })),
        h('p', { class: 'slips__foot', text: 'この票は TENKA LAB の制作見本です。お店・商品・予約はすべて架空です。' })
      ])
    })
  }
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  function prepTitle () { return ui.pDay === 'all' ? '仕込み表_2026-12-22_25_トキワダ' : '仕込み表_' + ui.pDay + '_トキワダ' }
  function fillPrint (mode) {
    elPrintRoot.textContent = ''
    ui.printMode = mode
    if (mode === 'slips') {
      append(elPrintRoot, buildSlips(ui.hDay))
      document.title = '予約票_' + ui.hDay + '_トキワダ'
    } else {
      var days = ui.pDay === 'all' ? DAYS.map(function (d) { return d.id }) : [ui.pDay]
      days.forEach(function (d) { elPrintRoot.appendChild(buildPrepSheet(d, true)) })
      document.title = prepTitle()
    }
  }
  $('print-btn').addEventListener('click', function () { fillPrint('prep'); window.print() })
  $('slip-btn').addEventListener('click', function () {
    if ($('slip-btn').getAttribute('aria-disabled') === 'true') return
    fillPrint('slips'); window.print()
  })
  window.addEventListener('beforeprint', function () {
    if (!elPrintRoot.firstChild) fillPrint(ui.tab === 'hand' ? 'slips' : 'prep')
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    ui.printMode = null
    document.title = baseTitle
  })

  // ---------- 修正・取消の窓（§7-10） ----------
  var edit = $('edit')
  buildProdRows('ed')
  segs.edDate = makeSeg($('ed-date'), DAY_OPTS, function () { return ui.edDate }, function (v) { ui.edDate = v; clearWhy('ed'); onFormChange('ed') })
  segs.edSlot = makeSeg($('ed-slot'), SLOT_OPTS, function () { return ui.edSlot }, function (v) { ui.edSlot = v; onFormChange('ed') })
  segs.edPay = makeSeg($('ed-pay'), PAYS, function () { return ui.edPay }, function (v) { ui.edPay = v })
  $('ed-kana').addEventListener('input', function () { if (ui.errEd) showErrors('ed', readForm('ed').errs) })
  var editFocusTo = null
  function edSetReadOnly (ro) {
    segs.edDate.setDisabled(ro); segs.edSlot.setDisabled(ro); segs.edPay.setDisabled(ro)
    Array.prototype.forEach.call(edit.querySelectorAll('.prods input, .prods button, #ed-kana, #ed-memo'), function (el) { el.disabled = ro })
  }
  function openEdit (no) {
    var o = findOrder(no); if (!o) return
    ui.editNo = no; ui.errEd = false
    $('ed-meta').textContent = fmtNo(o.no) + ' ' + o.kana + '様 ' + fmtDay(o.date) + SLOT[o.slot].name + ' ' + fmtYen(amountOf(o))
    ui.edDate = o.date; ui.edSlot = o.slot; ui.edPay = o.pay
    segs.edDate.refresh(); segs.edSlot.refresh(); segs.edPay.refresh()
    PRODS.forEach(function (p) { $('ed-q-' + p.id).value = o.items[p.id] ? String(o.items[p.id]) : '' })
    $('ed-kana').value = o.kana
    $('ed-memo').value = o.memo
    clearWhy('ed')
    showErrors('ed', {})
    $('ed-top-err').hidden = true; $('ed-top-err').textContent = ''
    var st = $('ed-state'); st.textContent = ''
    st.hidden = !(o.canceled || o.handed)
    if (o.canceled) append(st, [stateTag(o), 'この予約は取り消してあります。直すには、先に「取消を戻す」を押してください。'])
    else if (o.handed) append(st, [stateTag(o), 'この予約は渡してあります。'])
    edSetReadOnly(o.canceled)
    $('ed-save').hidden = o.canceled
    $('ed-del').hidden = o.canceled
    $('ed-restore').hidden = !o.canceled
    if (o.handed) $('ed-del').setAttribute('aria-disabled', 'true'); else $('ed-del').removeAttribute('aria-disabled')
    $('ed-del-note').hidden = !o.handed
    $('ed-title').textContent = o.canceled ? '取り消した予約' : '予約を直す'
    updateRows('ed')
    editFocusTo = null
    if (typeof edit.showModal === 'function') edit.showModal(); else edit.setAttribute('open', '')
    $('ed-title').focus()
  }
  function closeEdit (focusNoOrEl) {
    editFocusTo = focusNoOrEl
    if (typeof edit.close === 'function') edit.close(); else { edit.removeAttribute('open'); onEditClosed() }
  }
  function onEditClosed () {
    var t = editFocusTo
    if (t === null || t === undefined) t = ui.editNo
    var el = typeof t === 'number' ? rowFocusEl(t) : t
    if (!el) el = $('h-list')
    ui.editNo = null
    el.focus()
  }
  edit.addEventListener('close', onEditClosed)
  edit.addEventListener('cancel', function (e) { e.preventDefault(); closeEdit(ui.editNo) })
  $('ed-x').addEventListener('click', function () { closeEdit(ui.editNo) })
  $('ed-cancel').addEventListener('click', function () { closeEdit(ui.editNo) })
  function sameItems (a, b) { return PRODS.every(function (p) { return a[p.id] === b[p.id] }) }
  $('edit-form').addEventListener('submit', function (e) {
    e.preventDefault()
    var o = findOrder(ui.editNo); if (!o) { closeEdit(null); return }
    if (o.canceled) return
    var r = readForm('ed')
    if (!r.ok) { ui.errEd = true; showErrors('ed', r.errs); focusFirstErr('ed', r.errs); return }
    var n = r.rec
    var same = n.date === o.date && n.slot === o.slot && sameItems(n.items, o.items) && n.kana === o.kana && n.memo === o.memo && n.pay === o.pay
    if (same) { showToast('変更はありません'); closeEdit(o.no); return }
    var before = E.marks
    o.date = n.date; o.slot = n.slot; o.items = n.items; o.kana = n.kana; o.memo = n.memo; o.pay = n.pay
    saveState()
    ui.newNo = o.no
    renderAll()
    closeEdit(o.no)
    showToast(fmtNo(o.no) + ' ' + o.kana + '様 の予約を直しました（' + fmtYen(amountOf(o)) + '）' + newFullText(before, E.marks))
  })
  $('ed-del').addEventListener('click', function () {
    var o = findOrder(ui.editNo); if (!o) return
    if ($('ed-del').getAttribute('aria-disabled') === 'true') { announce($('ed-del-note').textContent); return }
    confirmBox({
      title: 'この予約を取り消しますか',
      body: fmtNo(o.no) + ' ' + o.kana + '様 ' + fmtDay(o.date) + SLOT[o.slot].name + '（' + itemsText(o.items) + '）を取り消します。取り消した予約は個数・売上見込みに入らなくなり、一覧には「取消」として残ります。',
      ok: '取り消す',
      fallback: $('ed-del')
    }).then(function (yes) {
      if (!yes) { $('ed-del').focus(); return }
      var vis = visibleOrders().map(function (x) { return x.no })
      o.canceled = true
      saveState()
      renderAll()
      var vis2 = visibleOrders().map(function (x) { return x.no })
      var target = null
      if (vis2.indexOf(o.no) >= 0) target = o.no
      else {
        var i = vis.indexOf(o.no)
        for (var k = i + 1; k < vis.length && target === null; k++) if (vis2.indexOf(vis[k]) >= 0) target = vis[k]
        for (var j = i - 1; j >= 0 && target === null; j--) if (vis2.indexOf(vis[j]) >= 0) target = vis[j]
      }
      closeEdit(target !== null ? target : $('h-list'))
      showToast(fmtNo(o.no) + ' ' + o.kana + '様 ' + fmtDay(o.date) + SLOT[o.slot].name + ' の予約を取り消しました')
    })
  })
  $('ed-restore').addEventListener('click', function () {
    var o = findOrder(ui.editNo); if (!o || !o.canceled) return
    var bad = PRODS.filter(function (p) { return o.items[p.id] > allowance(S.orders, o.date, p.id, o.no) })
    if (bad.length) {
      var te = $('ed-top-err')
      te.textContent = bad.map(function (p) { return fmtDay(o.date) + 'の' + PROD[p.id].mid + 'が満数のため戻せません（上限' + CAP[o.date][p.id] + '個）' }).join('。')
      te.hidden = false
      announce(te.textContent)
      return
    }
    o.canceled = false
    saveState()
    ui.newNo = o.no
    renderAll()
    closeEdit(o.no)
    showToast(fmtNo(o.no) + ' ' + o.kana + '様 の取消を戻しました')
  })

  // ---------- 描き直し（いつも状態から全部。入力中の欄の値は消さない） ----------
  function renderAll () {
    E = evaluate(S.orders)
    renderSummary()
    renderList()
    renderPrep()
    renderHand()
    updateRows('in')
  }

  // ---------- 最初の状態に戻す（§11-4） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox({ title: '最初の状態に戻しますか', body: '追加・修正・取消・受け渡しのチェックをすべて消して、見本の25件に戻します。', ok: '戻す', fallback: $('btn-reset') })
      .then(function (yes) {
        if (!yes) return
        S = initialState()
        saveState()
        resetFilters()
        ui.pDay = 'all'; $('p-day').value = 'all'; segs.pDay.refresh()
        ui.hDay = FIRST_DAY; segs.hDay.refresh()
        openTab('order', { noScroll: true })
        renderAll()
        clearEntry(false)
        showToast('最初の状態に戻しました')
      })
  })

  // 幅が変わったら、スマホ用・PC 用の組み方を作り直す
  function onMq () { renderList(); renderPrep() }
  if (mqPC.addEventListener) mqPC.addEventListener('change', onMq)

  // ---------- はじめ ----------
  S = loadState() || initialState()
  $('note-nosave').hidden = canSave
  fillIcons()
  var hash = (window.location.hash || '').slice(1)
  openTab(TABS.indexOf(hash) >= 0 ? hash : 'order', { noScroll: true })
  E = evaluate(S.orders)
  renderAll()
  clearEntry(false)

  // 検査用（読み取りだけ）
  window.TokiwadaPreorder = {
    state: function () { return JSON.parse(JSON.stringify(S)) },
    evaluate: function () { return JSON.parse(JSON.stringify(evaluate(S.orders))) },
    allowance: function (d, p, ex) { return allowance(S.orders, d, p, ex === undefined ? null : ex) },
    canSave: function () { return canSave }
  }
})()
