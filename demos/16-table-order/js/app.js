// 定食とおばんざい ミトリ堂（デモ）テーブル注文
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 操作ごとに「読む（検証）→ 変える → 書く → 描き直す」（design.md §11-3）。金額・数量は整数（円）だけで扱う
(function () {
  'use strict'

  // ---------- 定数（design.md §7-1・§18） ----------
  var TABLES = 6
  var MAX_QTY = 9
  var LARGE_ADD = 100
  var LATE_MIN = 15
  var MAX_ORDER_NO = 999
  var KEY = 'tenkaLab.demo16.tableOrder.v1'
  var TEST_KEY = 'tenkaLab.demo16.test'
  var CATS = [
    { id: 't', name: '定食', note: 'ご飯・味噌汁・小鉢つきです。' },
    { id: 'k', name: 'おばんざい小鉢', note: '' },
    { id: 'g', name: 'ご飯もの・汁', note: '' },
    { id: 'd', name: '飲みもの', note: '' }
  ]
  var MENU = [
    { id: 't1', cat: 't', name: '鶏の照り焼き定食', price: 980, note: '甘辛のたれで焼いています', large: true },
    { id: 't2', cat: 't', name: 'さばの味噌煮定食', price: 1050, note: '骨までやわらかく煮ました', large: true },
    { id: 't3', cat: 't', name: '豚の生姜焼き定食', price: 950, note: 'すりおろし生姜をたっぷり', large: true },
    { id: 't4', cat: 't', name: '本日の焼き魚定食', price: 1100, note: '魚は日替わり（デモでは鮭）', large: true },
    { id: 'k1', cat: 'k', name: 'ひじきの煮もの', price: 280, note: '大豆とにんじん入り', large: false },
    { id: 'k2', cat: 'k', name: 'だし巻き玉子', price: 380, note: '焼きたてを切り分けます', large: false },
    { id: 'k3', cat: 'k', name: 'ほうれん草のおひたし', price: 250, note: 'かつお節をのせて', large: false },
    { id: 'k4', cat: 'k', name: 'かぼちゃの煮つけ', price: 300, note: 'ほっくり甘めの味', large: false },
    { id: 'g1', cat: 'g', name: '白ご飯', price: 200, note: '土鍋で炊いています（架空）', large: true },
    { id: 'g2', cat: 'g', name: '鮭のおにぎり', price: 180, note: '1個。のりは別に添えます', large: false },
    { id: 'g3', cat: 'g', name: '豚汁', price: 350, note: '根菜たっぷりの具だくさん', large: false },
    { id: 'd1', cat: 'd', name: 'ほうじ茶ラテ', price: 380, note: '温かい・甘さひかえめ', large: false },
    { id: 'd2', cat: 'd', name: '梅ソーダ', price: 350, note: '自家製の梅シロップ（架空）', large: false },
    { id: 'd3', cat: 'd', name: 'ノンアルコールビール', price: 420, note: '瓶とグラスでお出しします', large: false }
  ]
  var MENU_BY_ID = {}
  MENU.forEach(function (m) { MENU_BY_ID[m.id] = m })
  var STATUSES = ['new', 'cooking', 'served']
  function hasId (id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MENU_BY_ID, id) }

  // ---------- 書き方（§2-3） ----------
  function yen (n) { return n.toLocaleString('ja-JP') + '円' }
  function unitLine (u, q) { return yen(u) + ' × ' + q }
  function pts (n) { return n + '点' }
  function tableName (t) { return t + '番テーブル' }
  function orderNo (n) { return '注文番号 ' + ('00' + n).slice(-3) }
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  function elapsed (at, now) {
    var m = Math.floor((now - at) / 60000)
    if (m < 1) return '1分未満'
    if (m < 60) return m + '分'
    return '60分以上'
  }
  function minutes (at, now) { return Math.floor((now - at) / 60000) }
  function clock (at) { var d = new Date(at); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
  function itemName (id, large) { return MENU_BY_ID[id].name + (large ? '（大盛り）' : '') }

  // ---------- 規則（§7。純粋な関数） ----------
  function unitPrice (line) { return MENU_BY_ID[line.id].price + (line.large ? LARGE_ADD : 0) }
  function lineTotal (line) { return unitPrice(line) * line.qty }
  function cartTotal (lines) { var s = 0; lines.forEach(function (l) { s += lineTotal(l) }); return s }
  function cartCount (lines) { var s = 0; lines.forEach(function (l) { s += l.qty }); return s }
  function lineKey (id, large) { return id + (large ? ':L' : '') }
  // ?table= の検証（§9-2）。^[1-6]$ に合う文字列だけ受ける
  function parseTableParam (search) {
    var v = null
    try { v = new URLSearchParams(search).get('table') } catch (e) { return null }
    if (typeof v !== 'string' || !/^[1-6]$/.test(v)) return null
    return parseInt(v, 10)
  }
  function parseViewParam (search) {
    try { return new URLSearchParams(search).get('view') === 'kitchen' } catch (e) { return false }
  }
  function isInt (v) { return typeof v === 'number' && Number.isInteger(v) }
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  // 保存の中身の検証（§11-2）。通れば必要な鍵だけの新しいオブジェクト、外れれば null
  function validate (d, nowArg) {
    var now = typeof nowArg === 'number' ? nowArg : Date.now()
    var lim = now + 60000
    var okAt = function (a) { return isInt(a) && a > 0 && a <= lim }
    if (!isObj(d) || d.v !== 1) return null
    if (!isInt(d.seq) || d.seq < 1 || d.seq > 1000) return null
    if (!Array.isArray(d.orders) || d.orders.length > 200) return null
    var orders = []; var prev = Infinity
    for (var i = 0; i < d.orders.length; i++) {
      var o = d.orders[i]
      if (!isObj(o)) return null
      if (!isInt(o.no) || o.no < 1 || o.no > MAX_ORDER_NO || o.no >= prev || o.no >= d.seq) return null
      prev = o.no
      if (!isInt(o.table) || o.table < 1 || o.table > TABLES) return null
      if (!okAt(o.at)) return null
      if (typeof o.status !== 'string' || STATUSES.indexOf(o.status) < 0) return null
      if (!Array.isArray(o.items) || o.items.length < 1 || o.items.length > 28) return null
      var keys = {}; var items = []; var all = true; var any = false
      for (var j = 0; j < o.items.length; j++) {
        var it = o.items[j]
        if (!isObj(it) || !hasId(it.id)) return null
        if (typeof it.large !== 'boolean' || (it.large && !MENU_BY_ID[it.id].large)) return null
        if (!isInt(it.qty) || it.qty < 1 || it.qty > MAX_QTY) return null
        if (typeof it.served !== 'boolean') return null
        var k = lineKey(it.id, it.large)
        if (keys[k]) return null
        keys[k] = true
        if (it.served) any = true; else all = false
        items.push({ id: it.id, large: it.large, qty: it.qty, served: it.served })
      }
      if (all !== (o.status === 'served')) return null
      if (any && o.status === 'new') return null
      orders.push({ no: o.no, table: o.table, at: o.at, status: o.status, items: items })
    }
    if (!Array.isArray(d.soldOut) || d.soldOut.length > MENU.length) return null
    var so = []
    for (i = 0; i < d.soldOut.length; i++) {
      if (!hasId(d.soldOut[i]) || so.indexOf(d.soldOut[i]) >= 0) return null
      so.push(d.soldOut[i])
    }
    if (!Array.isArray(d.closed) || d.closed.length > 200) return null
    var closed = []
    for (i = 0; i < d.closed.length; i++) {
      var c = d.closed[i]
      if (!isObj(c)) return null
      if (!isInt(c.table) || c.table < 1 || c.table > TABLES) return null
      if (!isInt(c.count) || c.count < 1 || c.count > 200) return null
      if (!isInt(c.total) || c.total < 0 || c.total > 99999999) return null
      if (!okAt(c.at)) return null
      closed.push({ table: c.table, count: c.count, total: c.total, at: c.at })
    }
    return { seq: d.seq, orders: orders, soldOut: so, closed: closed }
  }
  // 見本（§18-3）。at は今からの相対
  function sample () {
    var now = Date.now()
    var M = 60000
    return {
      seq: 4,
      orders: [
        { no: 3, table: 2, at: now - 3 * M, status: 'new', items: [{ id: 'k2', large: false, qty: 1, served: false }, { id: 'd3', large: false, qty: 1, served: false }] },
        { no: 2, table: 5, at: now - 12 * M, status: 'cooking', items: [{ id: 't1', large: true, qty: 2, served: false }, { id: 'k1', large: false, qty: 1, served: true }, { id: 'g3', large: false, qty: 1, served: false }] },
        { no: 1, table: 2, at: now - 25 * M, status: 'served', items: [{ id: 't3', large: false, qty: 1, served: true }, { id: 'd1', large: false, qty: 1, served: true }] }
      ],
      soldOut: ['t4'],
      closed: []
    }
  }
  function orderTotal (o) { return cartTotal(o.items) }
  function unservedQty (o) { var s = 0; o.items.forEach(function (it) { if (!it.served) s += it.qty }); return s }
  function syncStatus (o) {
    var all = o.items.every(function (it) { return it.served })
    var any = o.items.some(function (it) { return it.served })
    if (all) o.status = 'served'
    else if (any || o.status === 'served') o.status = 'cooking'
  }
  function tableSum (st, t) {
    var list = st.orders.filter(function (o) { return o.table === t })
    var total = 0; var wait = 0
    list.forEach(function (o) { total += orderTotal(o); wait += unservedQty(o) })
    return { count: list.length, total: total, wait: wait }
  }
  function kitchenSummary (st) {
    var r = { fresh: 0, cooking: 0, wait: 0, closedN: st.closed.length, closedYen: 0 }
    st.orders.forEach(function (o) {
      if (o.status === 'new') r.fresh++
      if (o.status === 'cooking') r.cooking++
      if (o.status !== 'served') r.wait += unservedQty(o)
    })
    st.closed.forEach(function (c) { r.closedYen += c.total })
    return r
  }

  // ---------- 保存（§11） ----------
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
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, seq: S.seq, orders: S.orders, soldOut: S.soldOut, closed: S.closed }))
    } catch (e) { noSave() }
  }
  // 読み直す。無い・壊れている時は見本で初期化して書く。保存できない時はメモリの S のまま
  function load () {
    if (!canSave) { if (!S) S = sample(); return }
    var raw = null
    try { raw = window.localStorage.getItem(KEY) } catch (e) { noSave(); if (!S) S = sample(); return }
    var st = null
    if (typeof raw === 'string') {
      try { st = validate(JSON.parse(raw)) } catch (e) { st = null }
    }
    if (st) { S = st; return }
    S = sample()
    save()
  }
  function findOrder (no) { return S.orders.filter(function (o) { return o.no === no })[0] || null }
  function isSoldOut (id) { return S.soldOut.indexOf(id) >= 0 }

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
  function btn (cls, text, id) {
    var b = el('button', cls, text)
    b.type = 'button'
    if (id) b.id = id
    return b
  }
  function setDisabled (b, off) { if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled') }
  function isOff (b) { return b.getAttribute('aria-disabled') === 'true' }
  function yenEl (n, cls) { return el('span', 'nw' + (cls ? ' ' + cls : ''), yen(n)) }
  function qtyEl (q) {
    var s = el('span', 'nw')
    add(s, [el('span', 'visually-hidden', '数量'), (function () { var x = el('span', null, '×'); x.setAttribute('aria-hidden', 'true'); return x })(), String(q)])
    return s
  }

  // 折れてはいけない語（§13）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = ['定食とおばんざい ミトリ堂', 'デモ（架空のお店）', '大盛り（+100円）', '（大盛り）', 'お会計はレジで', 'テーブルを空ける', '見本に戻す', '提供待ちの品', 'おばんざい小鉢', 'ご飯もの・汁']
    .concat(MENU.map(function (m) { return m.name }).sort(function (a, b) { return b.length - a.length }))
    .concat(['提供済み', '調理中', '品切れ', '新規', '受付', '飲みもの', 'ミトリ堂', 'おばんざい', '（税込）', 'デモ', '架空', '税込'])
  var NW_RE = new RegExp([
    '注文番号 \\d{3}', '経過 (?:\\d+分(?:以上|未満)?|1分未満)', '受付 \\d{2}:\\d{2}', '\\d{2}:\\d{2}',
    '[\\d,]+円 × \\d+', '[\\d,]+円（税込）', '×\\d+', '\\d+分(?:以上|未満)', '[\\d,]+(?:番テーブル|円|点|件|回|番|卓|分|品|個)', '番テーブル'
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
        if (!p || p.closest('.nw, svg, script, style, title, .visually-hidden')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var list = []; var n
    while ((n = tw.nextNode())) list.push(n)
    list.forEach(wrapText)
    return root
  }
  // 状態の札（§1-3）
  var TAG = {
    new: ['新規', 'i-dot'], guestNew: ['受付', 'i-dot'], cooking: ['調理中', 'i-pot'], served: ['提供済み', 'i-check'],
    soldout: ['品切れ', 'i-ban'], late: ['15分以上', 'i-clock']
  }
  function stateTag (st) {
    var cls = st === 'guestNew' ? 'new' : st
    var t = el('span', 'state-tag state-tag--' + cls)
    t.setAttribute('data-state', cls)
    add(t, [icon(TAG[st][1], 14), TAG[st][0]])
    return t
  }

  // ---------- 知らせ ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  var qtyTimer = null
  function announce (msg) {
    var sr = $('sr-status')
    window.clearTimeout(srTimer)
    window.clearTimeout(qtyTimer)
    sr.textContent = ''
    srTimer = window.setTimeout(function () { sr.textContent = msg }, 50)
  }
  function announceLater (fn) {
    window.clearTimeout(qtyTimer)
    qtyTimer = window.setTimeout(function () { announce(fn()) }, 400)
  }
  var toastTimer = null
  function showToast (text) {
    var t = $('toast')
    $('toast-text').textContent = text
    wrapWords($('toast-text'))
    t.hidden = false
    t.classList.remove('is-in')
    void t.offsetWidth
    if (!reduceMotion) t.classList.add('is-in')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { t.hidden = true }, 3000)
    announce(text)
  }

  // ---------- 確認の窓（⑭と同じ。最初のフォーカスは「やめる」、Esc＝やめる） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null
  function confirmBox (opt) {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(true); return }
      $('cf-title').textContent = opt.title
      $('cf-body').textContent = opt.body
      $('cf-ok').textContent = opt.ok
      $('cf-ok').className = 'btn-sub confirm__ok' + (opt.danger ? ' btn-danger' : '')
      wrapWords($('cf-title')); wrapWords($('cf-body'))
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
    // やめた時は開いた所へ戻す。遅れて動いた時に、その間に利用者が動かしたフォーカスを奪わないよう、フォーカスが body・窓の中にある時だけ戻す（オウホン 2026-11-21）
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
  var search = window.location.search || ''
  var urlTable = parseTableParam(search)
  var ui = {
    tab: parseViewParam(search) ? 'kitchen' : 'guest',
    table: urlTable,
    scene: urlTable ? 'menu' : 'table',
    cat: 't',
    cart: [],
    notice: null,
    lastOrder: null,
    knownSeq: 0,
    banner: []
  }
  function focusId (id) { var e = $(id); if (e) e.focus({ preventScroll: false }) }

  // ---------- タブ（⑭と同じ動き） ----------
  var TABS = ['guest', 'kitchen']
  function openTab (name, opt) {
    ui.tab = name
    TABS.forEach(function (t) {
      var on = t === name
      var tb = $('tab-' + t)
      tb.setAttribute('aria-selected', on ? 'true' : 'false')
      tb.tabIndex = on ? 0 : -1
      $('panel-' + t).hidden = !on
    })
    updateCartbarBody()
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
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') j = (i + 1) % 2
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = 1
    if (j === null) return
    e.preventDefault()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  function goTo (target, focusEl) {
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    if (focusEl) focusEl.focus({ preventScroll: true })
  }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      var n = a.getAttribute('data-step')
      if (n === '1' || n === '2') {
        openTab('guest', { noScroll: true })
        if (ui.table) setScene('menu'); else setScene('table')
        renderGuest()
        var f = !ui.table ? $('g-table-h') : n === '1' ? $('g-menu-h') : $('cat-' + ui.cat)
        goTo($('guest-frame'), f)
      } else {
        openTab('kitchen', { noScroll: true })
        var card = n === '3' ? $('k-open') : $('k-tables')
        goTo(card, card.querySelector('h2'))
      }
    })
  })

  // ---------- お客様の画面（§6） ----------
  var SCENES = { table: 'g-table', menu: 'g-menu', confirm: 'g-confirm', done: 'g-done', history: 'g-history' }
  function setScene (name) {
    ui.scene = name
    Object.keys(SCENES).forEach(function (k) { $(SCENES[k]).hidden = k !== name })
    updateCartbarBody()
  }
  function updateCartbarBody () {
    document.body.classList.toggle('has-cartbar', ui.tab === 'guest' && ui.scene === 'menu')
  }
  function showScene (name, focusTarget) {
    window.clearTimeout(qtyTimer)
    setScene(name)
    renderGuest()
    var h = $(focusTarget || SCENES[name] + '-h')
    if (h) {
      h.focus({ preventScroll: true })
      var frameTop = $('guest-frame').getBoundingClientRect().top
      var tabsH = $('tabs').getBoundingClientRect().height
      if (frameTop < tabsH || frameTop > window.innerHeight) $(SCENES[name]).scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }
  function cartLine (key) { return ui.cart.filter(function (l) { return lineKey(l.id, l.large) === key })[0] || null }
  function qtyOf (id, large) { var l = cartLine(lineKey(id, large)); return l ? l.qty : 0 }
  function cartSummaryText () { return 'カート ' + pts(cartCount(ui.cart)) + ' ' + yen(cartTotal(ui.cart)) }
  function soldOutInCart () { return ui.cart.filter(function (l) { return isSoldOut(l.id) }) }

  // カートに足す（§7-2）。戻り値 'added' | 'soldout' | 'max' | 'none'
  function addLine (id, large) {
    if (!hasId(id)) return 'none'
    if (isSoldOut(id)) return 'soldout'
    if (large && !MENU_BY_ID[id].large) return 'none'
    var l = cartLine(lineKey(id, large))
    if (!l) { ui.cart.push({ id: id, large: !!large, qty: 1 }); return 'added' }
    if (l.qty >= MAX_QTY) return 'max'
    l.qty++
    return 'added'
  }
  function subLine (id, large) {
    var key = lineKey(id, large)
    var l = cartLine(key)
    if (!l) return 'none'
    l.qty--
    if (l.qty <= 0) { ui.cart = ui.cart.filter(function (x) { return x !== l }); return 'removed' }
    return 'sub'
  }
  function qtyMsg (id, large, removed) {
    if (removed) return MENU_BY_ID[id].name + ' をカートから外しました。' + cartSummaryText()
    return itemName(id, large) + ' ' + qtyOf(id, large) + '個。' + cartSummaryText()
  }
  function onQty (id, large, dir, from) {
    load()
    ui.notice = null
    if (dir > 0) {
      var r = addLine(id, large)
      if (r === 'soldout') {
        ui.notice = { key: id, at: from, text: MENU_BY_ID[id].name + 'は品切れのため、注文できません' }
        announce(ui.notice.text)
      } else if (r === 'max') {
        ui.notice = { key: lineKey(id, large), at: from, text: '1つの品は9個までです（大盛りは別に数えます）' }
        announce(ui.notice.text)
      } else if (r === 'added') {
        announceLater(function () { return qtyMsg(id, large, false) })
      }
    } else {
      if (isSoldOut(id)) {
        ui.notice = { key: id, at: from, text: MENU_BY_ID[id].name + 'は品切れのため、注文できません' }
        announce(ui.notice.text)
      } else {
        var r2 = subLine(id, large)
        if (r2 === 'removed') announceLater(function () { return qtyMsg(id, large, true) })
        else if (r2 === 'sub') announceLater(function () { return qtyMsg(id, large, false) })
      }
    }
    return dir
  }

  function qtyButtons (id, large, prefix, q, offMinus, offPlus) {
    var nm = itemName(id, large)
    var base = prefix + '-' + id + (large ? '-L' : '')
    var minus = btn('qty__btn', null, base + '-minus')
    minus.appendChild(icon('i-minus', 20))
    minus.setAttribute('aria-label', nm + 'を1つ減らす')
    setDisabled(minus, offMinus)
    var plus = btn('qty__btn', null, base + '-plus')
    plus.appendChild(icon('i-plus', 20))
    plus.setAttribute('aria-label', nm + 'を1つ増やす')
    setDisabled(plus, offPlus)
    var out = el('output', 'qty__num', String(q))
    out.id = base + '-n'
    minus.addEventListener('click', function () { onQtyClick(id, large, -1, prefix, minus) })
    plus.addEventListener('click', function () { onQtyClick(id, large, 1, prefix, plus) })
    return [minus, out, plus]
  }
  function onQtyClick (id, large, dir, prefix, b) {
    var keepId = b.id
    var keyBefore = ui.cart.map(function (l) { return lineKey(l.id, l.large) })
    onQty(id, large, dir, prefix)
    renderAll()
    if (prefix === 'c') {
      // 確認の場面で行が消えた時は、次の行の −、無ければ合計の箱へ（§6-5）
      var k = lineKey(id, large)
      if (!cartLine(k) && keyBefore.indexOf(k) >= 0) {
        var idx = keyBefore.indexOf(k)
        var nextKey = keyBefore.slice(idx + 1).filter(function (x) { return cartLine(x) })[0]
        if (nextKey) { var p = nextKey.split(':'); focusId('c-' + p[0] + (p[1] ? '-L' : '') + '-minus') } else focusId('total-box')
        return
      }
    }
    focusId(keepId)
  }

  function renderMenu () {
    var t = ui.table
    $('g-menu-h').textContent = t ? tableName(t) : ''
    var hist = S.orders.filter(function (o) { return o.table === t })
    var hb = $('btn-menu-hist')
    hb.hidden = hist.length === 0
    hb.textContent = ''
    if (hist.length) add(hb, ['注文の履歴（このテーブル） ', el('span', 'nw', hist.length + '件')])
    // 分類タブ
    var tabs = $('cat-tabs')
    tabs.textContent = ''
    CATS.forEach(function (c) {
      var b = btn('cat-tab', null, 'cat-' + c.id)
      b.setAttribute('role', 'tab')
      b.setAttribute('aria-controls', 'cat-panel')
      var on = ui.cat === c.id
      b.setAttribute('aria-selected', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
      b.appendChild(el('span', 'nw', c.name))
      var n = 0
      ui.cart.forEach(function (l) { if (MENU_BY_ID[l.id].cat === c.id) n += l.qty })
      if (n) {
        var badge = el('span', 'cat-tab__n')
        var vis = el('span', null, String(n)); vis.setAttribute('aria-hidden', 'true')
        add(badge, [vis, el('span', 'visually-hidden', 'カートに ' + pts(n))])
        b.appendChild(badge)
      }
      b.addEventListener('click', function () { ui.cat = c.id; renderAll(); focusId('cat-' + c.id) })
      tabs.appendChild(b)
    })
    // 分類のパネル
    var cat = CATS.filter(function (c) { return c.id === ui.cat })[0]
    var panel = $('cat-panel')
    panel.setAttribute('aria-labelledby', 'cat-' + cat.id)
    panel.textContent = ''
    panel.appendChild(el('h3', 'cat-panel__h', cat.name))
    if (cat.note) panel.appendChild(el('p', 'sub cat-panel__note', cat.note))
    var list = el('div', 'dishes')
    MENU.filter(function (m) { return m.cat === cat.id }).forEach(function (m) { list.appendChild(dishEl(m)) })
    panel.appendChild(list)
    renderCartbar()
  }
  function noticeEl (text) { return add(el('p', 'notice'), [icon('i-info', 16), el('span', null, text)]) }
  function dishEl (m) {
    var so = isSoldOut(m.id)
    var a = el('article', 'dish' + (so ? ' is-soldout' : ''))
    a.setAttribute('aria-labelledby', 'dish-' + m.id)
    a.setAttribute('data-id', m.id)
    var top = el('div', 'dish__top')
    var art = el('span', 'dish__art')
    art.setAttribute('data-cat', m.cat)
    art.setAttribute('aria-hidden', 'true')
    art.appendChild(icon('art-' + m.cat, 36))
    if (so) art.appendChild(icon('i-ban', 16, 'dish__ban'))
    var body = el('div', 'dish__body')
    var h = el('h4', 'dish__name')
    h.id = 'dish-' + m.id
    h.appendChild(document.createTextNode(m.name))
    if (so) { h.appendChild(document.createTextNode(' ')); h.appendChild(stateTag('soldout')) }
    body.appendChild(h)
    body.appendChild(el('p', 'dish__note', m.note))
    if (so) body.appendChild(el('p', 'dish__off', '本日は品切れです'))
    var price = el('p', 'dish__price')
    add(price, [String(m.price.toLocaleString('ja-JP')), el('span', 'yen-u', '円')])
    add(top, [art, body, price])
    a.appendChild(top)
    var rows = m.large ? [[false, 'ふつう', null], [true, '大盛り（+100円）', yen(m.price + LARGE_ADD)]] : [[false, '数', null]]
    rows.forEach(function (r) {
      var q = qtyOf(m.id, r[0])
      var row = el('div', 'qty')
      var lab = el('span', 'qty__label', r[1])
      if (r[2]) lab.appendChild(el('span', 'qty__sub', r[2]))
      row.appendChild(lab)
      add(row, qtyButtons(m.id, r[0], 'q', q, so || q === 0, so || q >= MAX_QTY))
      a.appendChild(row)
      if (ui.notice && ui.notice.at === 'q' && ui.notice.key === lineKey(m.id, r[0]) && !so) a.appendChild(noticeEl(ui.notice.text))
    })
    // 品切れの案内は札の下に1つだけ（大盛りの無い品・「ふつう」の行は lineKey が id と同じなので、上の行の案内と二重にならないよう so の時だけ）
    if (ui.notice && ui.notice.at === 'q' && ui.notice.key === m.id && so) a.appendChild(noticeEl(ui.notice.text))
    return a
  }
  function renderCartbar () {
    var sum = $('cart-sum')
    sum.textContent = ''
    var n = cartCount(ui.cart)
    if (!n) sum.appendChild(el('p', 'cartbar__empty', 'まだ何も選んでいません'))
    else {
      sum.appendChild(el('p', 'cartbar__n', pts(n)))
      var tot = el('p', 'cartbar__total')
      add(tot, [yen(cartTotal(ui.cart)), el('span', 'cartbar__tax', '（税込）')])
      sum.appendChild(tot)
    }
    setDisabled($('btn-cart-go'), n === 0)
  }
  // 確認の場面で押せない理由（§6-5）
  function orderBlock () {
    if (!ui.cart.length) return { kind: 'empty', text: '品がありません。メニューに戻って選んでください' }
    var so = soldOutInCart()
    if (so.length) {
      var names = []
      so.forEach(function (l) { var nm = MENU_BY_ID[l.id].name; if (names.indexOf(nm) < 0) names.push(nm) })
      return { kind: 'soldout', text: '品切れの品がカートにあります（' + names.join('・') + '）。外してから注文してください' }
    }
    if (S.seq > MAX_ORDER_NO) return { kind: 'max', text: 'デモでは注文は999件までです。「見本に戻す」で最初に戻せます' }
    return null
  }
  function renderConfirm () {
    $('g-confirm-table').textContent = ui.table ? tableName(ui.table) : ''
    var ul = $('cart-list')
    ul.textContent = ''
    ui.cart.forEach(function (l) {
      var so = isSoldOut(l.id)
      var li = el('li', 'cart-row' + (so ? ' is-soldout' : ''))
      var nm = el('p', 'cart-row__name', itemName(l.id, l.large))
      if (so) { nm.appendChild(document.createTextNode(' ')); nm.appendChild(stateTag('soldout')) }
      li.appendChild(nm)
      var r2 = el('div', 'cart-row__r2')
      r2.appendChild(el('span', 'cart-row__unit nw', unitLine(unitPrice(l), l.qty)))
      var q = el('div', 'cart-row__qty')
      add(q, qtyButtons(l.id, l.large, 'c', l.qty, so, so || l.qty >= MAX_QTY))
      if (!so) r2.appendChild(q)
      if (so) r2.appendChild(el('span', 'cart-row__off', '品切れのため注文できません'))
      else r2.appendChild(el('span', 'cart-row__sub', yen(lineTotal(l))))
      li.appendChild(r2)
      if (ui.notice && ui.notice.at === 'c' && ui.notice.key === lineKey(l.id, l.large)) li.appendChild(noticeEl(ui.notice.text))
      ul.appendChild(li)
    })
    ul.hidden = ui.cart.length === 0
    var tb = $('total-box')
    tb.textContent = ''
    add(tb, [el('span', 'total-box__l', '合計 ' + pts(cartCount(ui.cart))), add(el('span', 'total-box__v'), [yen(cartTotal(ui.cart)), el('span', 'total-box__tax', '（税込）')])])
    var why = orderBlock()
    setDisabled($('btn-order'), !!why)
    var w = $('order-why')
    w.textContent = ''
    if (why) { add(w, [icon('i-info', 16), el('span', null, why.text)]); w.hidden = false } else w.hidden = true
    $('btn-remove-soldout').hidden = !(why && why.kind === 'soldout')
  }
  function renderDone () {
    var o = ui.lastOrder
    if (!o) return
    $('g-done-no').textContent = orderNo(o.no)
    $('g-done-table').textContent = tableName(o.table)
    $('g-done-sr').textContent = '、' + orderNo(o.no) + '、' + tableName(o.table) + '、合計 ' + yen(orderTotal(o))
    var ul = $('g-done-list')
    ul.textContent = ''
    o.items.forEach(function (it) {
      var li = el('li')
      add(li, [add(el('span'), [itemName(it.id, it.large) + ' ', qtyEl(it.qty)]), yenEl(lineTotal(it))])
      ul.appendChild(li)
    })
    var tot = $('g-done-total')
    tot.textContent = ''
    add(tot, [el('span', null, '合計 ' + pts(cartCount(o.items))), yenEl(orderTotal(o))])
  }
  function guestStatusTag (st) { return stateTag(st === 'new' ? 'guestNew' : st) }
  function renderHistory () {
    var t = ui.table
    var list = S.orders.filter(function (o) { return o.table === t })
    $('g-hist-sub').textContent = t ? tableName(t) + '・' + list.length + '件' : ''
    var tot = $('hist-total')
    tot.textContent = ''
    tot.hidden = list.length === 0
    var sum = 0; list.forEach(function (o) { sum += orderTotal(o) })
    add(tot, [el('span', 'total-box__l', 'このテーブルの合計'), add(el('span', 'total-box__v'), [yen(sum), el('span', 'total-box__tax', '（税込）')]), el('span', 'total-box__s', 'お会計はレジで。今日の注文の足し算です（デモ）')])
    var ul = $('hist-list')
    ul.textContent = ''
    list.forEach(function (o) {
      var li = el('li', 'h-order')
      li.setAttribute('data-no', String(o.no))
      var head = el('p', 'h-order__head')
      add(head, [el('span', 'h-order__no nw', orderNo(o.no)), guestStatusTag(o.status), el('span', 'h-order__at nw', '受付 ' + clock(o.at))])
      li.appendChild(head)
      var items = el('ul', 'h-order__items')
      o.items.forEach(function (it) {
        var r = el('li')
        var nm = add(el('span'), [itemName(it.id, it.large) + ' ', qtyEl(it.qty)])
        if (it.served) { nm.appendChild(document.createTextNode(' ')); nm.appendChild(stateTag('served')) }
        add(r, [nm, yenEl(lineTotal(it))])
        items.appendChild(r)
      })
      li.appendChild(items)
      ul.appendChild(li)
    })
    ul.hidden = list.length === 0
    $('hist-none').hidden = list.length !== 0
  }
  function renderGuest () {
    Object.keys(SCENES).forEach(function (k) { $(SCENES[k]).hidden = k !== ui.scene })
    if (ui.scene === 'menu') renderMenu()
    if (ui.scene === 'confirm') renderConfirm()
    if (ui.scene === 'done') renderDone()
    if (ui.scene === 'history') renderHistory()
    updateCartbarBody()
    wrapWords($('panel-guest'))
  }

  // 卓の選択
  Array.prototype.forEach.call(document.querySelectorAll('.table-btn'), function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-table')
      if (!/^[1-6]$/.test(v)) return
      ui.table = parseInt(v, 10)
      ui.cart = []; ui.cat = 't'; ui.notice = null
      showScene('menu')
      announce(tableName(ui.table) + 'のメニューです')
    })
  })
  $('btn-change-table').addEventListener('click', function () {
    var n = cartCount(ui.cart)
    var go = function () { ui.cart = []; ui.notice = null; ui.table = null; showScene('table') }
    if (!n) { go(); return }
    confirmBox({ title: '席を変えますか', body: '選んだ品（' + pts(n) + '）はカートから消えます。', ok: '変える' }).then(function (yes) { if (yes) go() })
  })
  // 分類タブのキーボード（左右の矢印・Home／End で移り、すぐ開く）
  $('cat-tabs').addEventListener('keydown', function (e) {
    var ids = CATS.map(function (c) { return c.id })
    var i = ids.indexOf(ui.cat); var j = null
    if (e.key === 'ArrowRight') j = (i + 1) % ids.length
    else if (e.key === 'ArrowLeft') j = (i + ids.length - 1) % ids.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = ids.length - 1
    if (j === null) return
    e.preventDefault()
    ui.cat = ids[j]
    renderAll()
    focusId('cat-' + ui.cat)
  })
  $('btn-menu-hist').addEventListener('click', function () { load(); showScene('history') })
  $('btn-cart-go').addEventListener('click', function () {
    if (isOff($('btn-cart-go'))) { announce('品を選んでください'); return }
    load(); ui.notice = null
    showScene('confirm')
  })
  $('btn-confirm-back').addEventListener('click', function () { ui.notice = null; showScene('menu') })
  $('btn-remove-soldout').addEventListener('click', function () {
    load()
    ui.cart = ui.cart.filter(function (l) { return !isSoldOut(l.id) })
    renderAll()
    focusId(ui.cart.length ? 'btn-order' : 'total-box')
    announce('品切れの品をカートから外しました。合計 ' + yen(cartTotal(ui.cart)))
  })
  $('btn-order').addEventListener('click', function () {
    load()
    var why = orderBlock()
    if (why) { renderAll(); announce(why.text); return }
    var o = placeOrder(ui.table, ui.cart)
    if (!o) return
    ui.lastOrder = o
    ui.cart = []; ui.notice = null
    trackNew()
    renderAll()
    showScene('done')
  })
  $('btn-more').addEventListener('click', function () { ui.cart = []; ui.cat = 't'; ui.notice = null; load(); showScene('menu') })
  $('btn-done-hist').addEventListener('click', function () { load(); showScene('history') })
  $('btn-hist-back').addEventListener('click', function () { load(); showScene('menu') })

  // 注文する（§7-3）。呼ぶ前に load() 済み
  function placeOrder (table, cart) {
    if (!table || !cart.length || cart.some(function (l) { return isSoldOut(l.id) }) || S.seq > MAX_ORDER_NO) return null
    var o = { no: S.seq, table: table, at: Date.now(), status: 'new', items: cart.map(function (l) { return { id: l.id, large: l.large, qty: l.qty, served: false } }) }
    S.orders.unshift(o)
    S.seq++
    save()
    return o
  }

  // ---------- 厨房・ホールの画面（§8） ----------
  function trackNew () {
    if (S.seq < ui.knownSeq) { ui.knownSeq = S.seq; ui.banner = []; return }
    var fresh = S.orders.filter(function (o) { return o.no >= ui.knownSeq }).map(function (o) { return o.no })
    if (fresh.length) {
      ui.banner = ui.banner.concat(fresh)
      ui.bannerAnim = true
    }
    ui.knownSeq = S.seq
  }
  function renderBanner () {
    var b = $('new-banner')
    ui.banner = ui.banner.filter(function (no) { return !!findOrder(no) })
    if (!ui.banner.length) { b.hidden = true; return }
    var list = ui.banner.slice().sort(function (x, y) { return x - y }).map(findOrder)
    var t = $('nb-text')
    t.textContent = ''
    if (list.length === 1) {
      t.textContent = '新しい注文が届きました：' + tableName(list[0].table) + '　' + orderNo(list[0].no) + '（' + list[0].items.length + '品）'
    } else {
      var tables = []
      list.forEach(function (o) { var n = tableName(o.table); if (tables.indexOf(n) < 0) tables.push(n) })
      t.textContent = '新しい注文が ' + list.length + '件 届きました：' + tables.join('・')
    }
    var wasHidden = b.hidden
    b.hidden = false
    if (wasHidden && ui.bannerAnim && !reduceMotion) { b.classList.remove('is-in'); void b.offsetWidth; b.classList.add('is-in') }
    ui.bannerAnim = false
  }
  function hideBanner () { ui.banner = []; $('new-banner').hidden = true }
  $('nb-close').addEventListener('click', function () {
    hideBanner()
    focusId('k-open-h')
  })
  $('nb-see').addEventListener('click', function () {
    var first = ui.banner.slice().sort(function (x, y) { return y - x })[0]
    hideBanner()
    var h = first && $('tk-' + ('00' + first).slice(-3))
    if (h) goTo(h.closest('.ticket'), h); else goTo($('k-open'), $('k-open-h'))
  })

  function ticketId (no) { return 'tk-' + ('00' + no).slice(-3) }
  function ticketEl (o, now) {
    var a = el('article', 'ticket')
    a.setAttribute('data-state', o.status)
    a.setAttribute('data-no', String(o.no))
    a.setAttribute('aria-labelledby', ticketId(o.no))
    var head = el('div', 'ticket__head')
    var h = el('h3', 'ticket__table', tableName(o.table))
    h.id = ticketId(o.no)
    h.tabIndex = -1
    add(head, [stateTag(o.status), h, el('span', 'ticket__no', orderNo(o.no))])
    a.appendChild(head)
    var time = el('p', 'ticket__time')
    var late = stateTag('late')
    late.classList.add('js-late')
    late.hidden = minutes(o.at, now) < LATE_MIN
    var elSpan = el('span', 'ticket__el nw js-el', '経過 ' + elapsed(o.at, now))
    elSpan.setAttribute('data-at', String(o.at))
    add(time, [el('span', 'nw', '受付 ' + clock(o.at)), el('span', null, '・'), elSpan, late])
    late.setAttribute('data-at', String(o.at))
    a.appendChild(time)
    var ul = el('ul', 'ticket__items')
    o.items.forEach(function (it, i) {
      var li = el('li', 'ticket__item' + (it.served ? ' is-served' : ''))
      var nm = el('span', 'ticket__name', itemName(it.id, it.large))
      if (it.served) { nm.appendChild(document.createTextNode(' ')); nm.appendChild(stateTag('served')) }
      var q = el('span', 'ticket__qty')
      q.appendChild(qtyEl(it.qty))
      var label = tableName(o.table) + ' ' + orderNo(o.no) + ' の ' + MENU_BY_ID[it.id].name + (it.large ? '（大盛り）' : '')
      var b
      if (it.served) {
        b = btn('text-btn', '戻す', ticketId(o.no) + '-i' + i)
        b.setAttribute('aria-label', label + ' の提供済みを戻す')
        b.addEventListener('click', function () { onUnserve(o.no, i) })
      } else {
        b = btn('btn-sub btn-sm', '提供済みにする', ticketId(o.no) + '-i' + i)
        b.setAttribute('aria-label', label + ' を提供済みにする')
        b.addEventListener('click', function () { onServe(o.no, i) })
      }
      var op = el('span', 'ticket__op')
      op.appendChild(b)
      add(li, [nm, q, op])
      ul.appendChild(li)
    })
    a.appendChild(ul)
    var foot = el('div', 'ticket__foot')
    var main
    if (o.status === 'new') {
      main = btn('btn-main', null, ticketId(o.no) + '-main')
      add(main, [icon('i-pot', 20), '調理を始める'])
      main.addEventListener('click', function () { onStart(o.no) })
    } else {
      main = btn('btn-main', null, ticketId(o.no) + '-main')
      add(main, [icon('i-check', 20), 'すべて提供済みにする'])
      main.addEventListener('click', function () { onServeAll(o.no) })
    }
    var sum = el('p', 'ticket__sum')
    add(sum, ['この注文 ', add(el('strong'), [yenEl(orderTotal(o))])])
    add(foot, [main, sum])
    a.appendChild(foot)
    return a
  }
  function servedRowEl (o) {
    var li = el('li', 'served-row')
    li.setAttribute('data-no', String(o.no))
    var head = el('p', 'served-row__head')
    add(head, [stateTag('served'), el('strong', 'nw', tableName(o.table)), el('span', 'nw', orderNo(o.no)), el('span', 'nw', '受付 ' + clock(o.at)), el('span', 'served-row__sum', yen(orderTotal(o)))])
    li.appendChild(head)
    var ul = el('ul', 'served-row__items')
    o.items.forEach(function (it, i) {
      var r = el('li')
      var b = btn('text-btn', '戻す', 'sv-' + o.no + '-i' + i)
      b.setAttribute('aria-label', tableName(o.table) + ' ' + orderNo(o.no) + ' の ' + MENU_BY_ID[it.id].name + (it.large ? '（大盛り）' : '') + ' の提供済みを戻す')
      b.addEventListener('click', function () { onUnserve(o.no, i, true) })
      add(r, [add(el('span'), [itemName(it.id, it.large) + ' ', qtyEl(it.qty)]), b])
      ul.appendChild(r)
    })
    li.appendChild(ul)
    return li
  }
  function renderKitchen () {
    var now = Date.now()
    var K = kitchenSummary(S)
    $('sum-new-n').textContent = String(K.fresh)
    $('sum-cook-n').textContent = String(K.cooking)
    $('sum-wait-n').textContent = String(K.wait)
    $('sum-closed-n').textContent = String(K.closedN)
    $('sum-closed-yen').textContent = yen(K.closedYen)
    $('sum-new-box').classList.toggle('is-on', K.fresh > 0)
    renderBanner()
    // まだの注文（注文番号の大きい順）
    var open = S.orders.filter(function (o) { return o.status !== 'served' }).sort(function (x, y) { return y.no - x.no })
    var served = S.orders.filter(function (o) { return o.status === 'served' }).sort(function (x, y) { return y.no - x.no })
    $('k-open-n').textContent = open.length + '件'
    var box = $('tickets')
    box.textContent = ''
    open.forEach(function (o) { box.appendChild(ticketEl(o, now)) })
    $('k-open-none').hidden = open.length !== 0
    // 提供済みの注文
    $('served-sum').textContent = '提供済みの注文（' + served.length + '件）'
    var sul = $('served-ul')
    sul.textContent = ''
    served.forEach(function (o) { sul.appendChild(servedRowEl(o)) })
    if (!served.length) sul.appendChild(el('li', 'served-row__none', '提供済みの注文はありません。'))
    // テーブルの合計
    var body = $('table-sum-body')
    var cards = $('table-cards')
    body.textContent = ''; cards.textContent = ''
    for (var t = 1; t <= TABLES; t++) {
      var ts = tableSum(S, t)
      var tr = el('tr')
      tr.setAttribute('data-table', String(t))
      var th = el('th', null, t + '番'); th.setAttribute('scope', 'row')
      var tdN = el('td')
      if (ts.count) tdN.textContent = ts.count + '件'; else tdN.appendChild(dash())
      var tdY = el('td', 'num', yen(ts.total))
      var tdW = el('td')
      if (ts.wait) tdW.textContent = pts(ts.wait); else tdW.appendChild(dash())
      var tdO = el('td', 'op')
      tdO.appendChild(closeBtn(t, ts, 'ts'))
      add(tr, [th, tdN, tdY, tdW, tdO])
      body.appendChild(tr)
      var li = el('li')
      li.setAttribute('data-table', String(t))
      var info = el('div')
      var r1 = el('p', 'table-cards__r1')
      add(r1, [el('strong', 'nw', t + '番'), el('span', 'nw', ts.count ? ts.count + '件' : '注文なし'), el('strong', 'nw', yen(ts.total))])
      info.appendChild(r1)
      info.appendChild(el('p', 'table-cards__r2', '未提供 ' + (ts.wait ? pts(ts.wait) : '—')))
      add(li, [info, closeBtn(t, ts, 'tc')])
      cards.appendChild(li)
    }
    $('closed-line').textContent = ''
    add($('closed-line'), ['今日 締めた分　', el('span', 'nw', K.closedN + '回'), '・', el('span', 'nw', yen(K.closedYen))])
    // 品切れの切り替え
    var sl = $('soldout-list')
    sl.textContent = ''
    CATS.forEach(function (c) {
      sl.appendChild(el('h3', null, c.name))
      var ul = el('ul')
      MENU.filter(function (m) { return m.cat === c.id }).forEach(function (m) {
        var so = isSoldOut(m.id)
        var li2 = el('li', 'soldout-row')
        var nm = el('span', 'soldout-row__name', m.name)
        if (so) { nm.appendChild(document.createTextNode(' ')); nm.appendChild(stateTag('soldout')) }
        var b = btn('btn-sub btn-sm', so ? '品切れを戻す' : '品切れにする', 'so-' + m.id)
        b.setAttribute('aria-pressed', so ? 'true' : 'false')
        b.setAttribute('aria-label', so ? m.name + ' の品切れを戻す' : m.name + ' を品切れにする')
        b.addEventListener('click', function () { onToggleSoldOut(m.id) })
        add(li2, [nm, b])
        ul.appendChild(li2)
      })
      sl.appendChild(ul)
    })
    wrapWords($('panel-kitchen'))
  }
  function dash () {
    var s = el('span')
    var d = el('span', null, '—'); d.setAttribute('aria-hidden', 'true')
    add(s, [d, el('span', 'visually-hidden', 'なし')])
    return s
  }
  function closeBtn (t, ts, prefix) {
    var b = btn('btn-sub btn-sm btn-danger', '空ける', prefix + '-close-' + t)
    b.setAttribute('aria-label', tableName(t) + 'を空ける')
    setDisabled(b, ts.count === 0)
    b.addEventListener('click', function () { onCloseTable(t, b.id) })
    return b
  }
  // 経過時間だけを書き直す（§8-4。札ごと描き直さない）
  function tickElapsed () {
    var now = Date.now()
    Array.prototype.forEach.call(document.querySelectorAll('.js-el'), function (s) {
      var at = parseInt(s.getAttribute('data-at'), 10)
      var txt = '経過 ' + elapsed(at, now)
      if (s.textContent !== txt) s.textContent = txt
    })
    Array.prototype.forEach.call(document.querySelectorAll('.js-late'), function (s) {
      var at = parseInt(s.getAttribute('data-at'), 10)
      s.hidden = minutes(at, now) < LATE_MIN
    })
  }
  window.setInterval(tickElapsed, 30000)

  // 厨房の操作（§7-5）。どれも 読む → 変える → 書く
  function gone () { renderAll(); announce('この注文はもうありません（テーブルが空けられました）') }
  function dropBanner (no) { if (ui.banner.indexOf(no) >= 0) hideBanner() }
  function nextTicketFocus (no, openBefore) {
    var idx = openBefore.indexOf(no)
    var after = openBefore.slice(idx + 1).filter(function (n) { var o = findOrder(n); return o && o.status !== 'served' })[0]
    focusId(after ? ticketId(after) : 'k-open-h')
  }
  function openNos () { return S.orders.filter(function (o) { return o.status !== 'served' }).sort(function (x, y) { return y.no - x.no }).map(function (o) { return o.no }) }
  function onStart (no) {
    load()
    var o = findOrder(no)
    if (!o) { gone(); return }
    dropBanner(no)
    if (o.status === 'new') o.status = 'cooking'
    save()
    renderAll()
    focusId(ticketId(no) + '-main')
    announce(orderNo(no) + ' を調理中にしました')
  }
  function onServe (no, i) {
    var before = openNos()
    load()
    var o = findOrder(no)
    if (!o || !o.items[i]) { gone(); return }
    dropBanner(no)
    o.items[i].served = true
    if (o.status === 'new') o.status = 'cooking'
    syncStatus(o)
    save()
    renderAll()
    if (o.status === 'served') {
      nextTicketFocus(no, before)
      announce(MENU_BY_ID[o.items[i].id].name + ' を提供済みにしました。' + orderNo(no) + ' はすべて提供済みです')
      return
    }
    var nextI = -1
    for (var j = i + 1; j < o.items.length; j++) if (!o.items[j].served) { nextI = j; break }
    focusId(nextI >= 0 ? ticketId(no) + '-i' + nextI : ticketId(no) + '-main')
    var leftItems = o.items.filter(function (it) { return !it.served }).length
    announce(MENU_BY_ID[o.items[i].id].name + ' を提供済みにしました。残り ' + leftItems + '品')
  }
  function onUnserve (no, i, fromServed) {
    load()
    var o = findOrder(no)
    if (!o || !o.items[i]) { gone(); return }
    dropBanner(no)
    o.items[i].served = false
    o.status = 'cooking'
    save()
    renderAll()
    focusId(fromServed ? ticketId(no) : ticketId(no) + '-i' + i)
    announce(MENU_BY_ID[o.items[i].id].name + ' の提供済みを戻しました。' + orderNo(no) + ' は調理中です')
  }
  function onServeAll (no) {
    var before = openNos()
    load()
    var o = findOrder(no)
    if (!o) { gone(); return }
    dropBanner(no)
    o.items.forEach(function (it) { it.served = true })
    o.status = 'served'
    save()
    renderAll()
    nextTicketFocus(no, before)
    announce(orderNo(no) + ' はすべて提供済みです')
  }
  function onToggleSoldOut (id) {
    load()
    var on = !isSoldOut(id)
    if (on) S.soldOut.push(id); else S.soldOut = S.soldOut.filter(function (x) { return x !== id })
    save()
    renderAll()
    focusId('so-' + id)
    announce(on ? MENU_BY_ID[id].name + ' を品切れにしました。お客様の画面で注文できなくなります' : MENU_BY_ID[id].name + ' の品切れを戻しました')
  }
  function onCloseTable (t, btnId) {
    load()
    var ts = tableSum(S, t)
    if (!ts.count) { announce(tableName(t) + 'には注文がありません'); return }
    var body = 'このテーブルの注文（' + ts.count + '件・' + yen(ts.total) + '）を締めて、一覧とお客様の画面の履歴から消します。' + (ts.wait ? 'まだ出していない品が ' + pts(ts.wait) + ' あります。' : '')
    confirmBox({ title: tableName(t) + 'を空けますか', body: body, ok: '空ける', danger: true }).then(function (yes) {
      if (!yes) return
      load()
      var cur = tableSum(S, t)
      if (!cur.count) { renderAll(); focusId(btnId); return }
      closeTable(t)
      save()
      renderAll()
      focusId(btnId)
      showToast(tableName(t) + 'を空けました（' + cur.count + '件・' + yen(cur.total) + '）')
    })
  }
  function closeTable (t) {
    var ts = tableSum(S, t)
    if (!ts.count) return null
    S.closed.push({ table: t, count: ts.count, total: ts.total, at: Date.now() })
    S.orders = S.orders.filter(function (o) { return o.table !== t })
    return ts
  }

  // ---------- まとめて描き直す ----------
  function renderTabs () {
    var n = S.orders.filter(function (o) { return o.status === 'new' }).length
    var badge = $('tab-kitchen-badge')
    badge.hidden = n === 0
    badge.textContent = n ? '新規 ' + n : ''
    if (n) $('tab-kitchen').setAttribute('aria-label', '厨房・ホールの画面（新規の注文 ' + n + '件）'); else $('tab-kitchen').removeAttribute('aria-label')
  }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    renderGuest()
    renderKitchen()
    renderTabs()
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }

  // ---------- 見本に戻す（§11-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox({ title: '見本に戻しますか', body: '注文・品切れ・締めた分をすべて消して、見本の注文3件に戻します。', ok: '戻す' }).then(function (yes) {
      if (!yes) return
      S = sample()
      save()
      ui.cart = []; ui.notice = null; ui.lastOrder = null; ui.cat = 't'
      ui.table = urlTable
      setScene(urlTable ? 'menu' : 'table')
      ui.knownSeq = S.seq
      hideBanner()
      renderAll()
      focusId('btn-reset')
      showToast('見本に戻しました')
    })
  })

  // ---------- 2つのタブの同期（§11-3） ----------
  window.addEventListener('storage', function (e) {
    if (!canSave) return
    if (e.key !== null && e.key !== KEY) return
    var watch = ui.scene === 'history' && ui.table ? S.orders.filter(function (o) { return o.table === ui.table }).map(function (o) { return [o.no, o.status] }) : null
    load()
    trackNew()
    renderAll()
    if (watch) {
      var msgs = []
      watch.forEach(function (w) {
        var o = findOrder(w[0])
        if (o && o.status !== w[1]) msgs.push(orderNo(o.no) + ' が' + (o.status === 'cooking' ? '調理中' : o.status === 'served' ? '提供済み' : '受付') + 'になりました')
      })
      if (msgs.length) announce(msgs.join('。'))
    }
  })

  // ---------- はじめ ----------
  $('note-nosave').hidden = canSave
  load()
  ui.knownSeq = S.seq
  wrapWords(document.body)
  setScene(ui.scene)
  renderAll()
  openTab(ui.tab, { noScroll: true })

  // 検査用（純粋な関数だけ。状態は出さない）
  window.__demo16 = { lineTotal: lineTotal, cartTotal: cartTotal, cartCount: cartCount, parseTableParam: parseTableParam, validate: validate, elapsed: elapsed }
})()
