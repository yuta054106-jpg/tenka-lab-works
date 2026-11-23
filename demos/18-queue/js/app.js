// 理容 トモリギ（デモ）順番待ちの受付と呼び出し
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 操作ごとに「読む（検証）→ 変える → 書く → 描き直す」（design.md §11-3）。時刻・分は 0時からの分の整数だけで扱う（実時間は使わない）
(function () {
  'use strict'

  // ---------- 定数（design.md §7-1・§18） ----------
  var SEATS = 3
  var MENU = {
    cut: { name: 'カット', min: 30 },
    shave: { name: 'カット＋顔そり', min: 45 },
    kids: { name: '子どもカット', min: 20 }
  }
  var MENU_IDS = ['cut', 'shave', 'kids']
  var OPEN = 600
  var START_NOW = 640
  var CLOSE = 1140
  var MAX_NO = 99
  var MAX_WAIT = 30
  var KEY = 'tenkaLab.demo18.queue.v1'
  var TEST_KEY = 'tenkaLab.demo18.test'
  var STATUSES = ['wait', 'called', 'serving', 'done', 'canceled']
  var VIEWS = ['customer', 'shop', 'board']
  function hasMenu (id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MENU, id) }

  // ---------- 書き方（§2-3） ----------
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  function clock (m) { return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60) }
  function noLabel (n) { return n + '番' }
  function seatLabel (s) { return '席' + s }
  function ceil5 (w) { return w <= 0 ? 0 : Math.floor((w + 4) / 5) * 5 }
  function estLabel (w) { return w === 0 ? 'まもなく' : '約' + w + '分' }
  function waited (at, now) { return (now - at) + '分' }
  function menuName (id) { return MENU[id].name }

  // ---------- 規則（§7。純粋な関数） ----------
  function seatPerson (st, s) {
    for (var i = 0; i < st.people.length; i++) {
      var p = st.people[i]
      if ((p.status === 'called' || p.status === 'serving') && p.seat === s) return p
    }
    return null
  }
  // 待ち時間の目安（§7-3）
  function estimate (st) {
    var now = st.now
    var free = [0]
    for (var s = 1; s <= SEATS; s++) {
      var p = seatPerson(st, s)
      if (!p) free.push(now)
      else if (p.status === 'serving') free.push(Math.max(p.startAt + MENU[p.menu].min, now))
      else free.push(now + MENU[p.menu].min)
    }
    function pick () {
      var b = 1
      for (var k = 2; k <= SEATS; k++) if (free[k] < free[b]) b = k
      return b
    }
    var byNo = {}
    st.line.forEach(function (no, i) {
      var q = st.people[no - 1]
      var b = pick()
      var w = free[b] - now
      byNo[no] = { ahead: i, wait: w, est: ceil5(w), seat: b }
      free[b] = free[b] + MENU[q.menu].min
    })
    var nw = free[pick()] - now
    return { byNo: byNo, next: { ahead: st.line.length, wait: nw, est: ceil5(nw) } }
  }
  // 平均の待ち時間（§7-6）。対象 0人なら null
  function avgWait (st) {
    var sum = 0; var n = 0
    st.people.forEach(function (p) {
      if (p.startAt !== null && (p.status === 'serving' || p.status === 'done')) { sum += p.startAt - p.at; n++ }
    })
    return n ? { avg: Math.round(sum / n), n: n } : null
  }
  // お店の集計（§7-5）
  function shopSummary (st) {
    var r = { wait: 0, total: 0, canceled: 0, done: 0, avg: avgWait(st) }
    st.people.forEach(function (p) {
      if (p.status === 'wait') r.wait++
      if (p.status === 'canceled') r.canceled++; else r.total++
      if (p.status === 'done') r.done++
    })
    return r
  }
  // ?view= の検証（§10-2）。許可リストと完全一致だけ
  function parseView (search) {
    var v = null
    try { v = new URLSearchParams(search).get('view') } catch (e) { return null }
    return typeof v === 'string' && VIEWS.indexOf(v) >= 0 ? v : null
  }
  // ?no= の検証（§10-2）。^[1-9][0-9]?$ に合う時だけ整数（保存の中にいるかは呼ぶ側で見る）
  function parseNo (search) {
    var v = null
    try { v = new URLSearchParams(search).get('no') } catch (e) { return null }
    if (typeof v !== 'string' || !/^[1-9][0-9]?$/.test(v)) return null
    return parseInt(v, 10)
  }
  function isInt (v) { return typeof v === 'number' && Number.isInteger(v) }
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  function inRange (v, a, b) { return isInt(v) && v >= a && v <= b }
  // 保存の中身の検証（§11-2）。通れば必要な鍵だけの新しいオブジェクト、外れれば null
  function validate (d) {
    if (!isObj(d) || d.v !== 1) return null
    if (!inRange(d.now, OPEN, CLOSE)) return null
    var now = d.now
    if (!inRange(d.seq, 1, MAX_NO + 1)) return null
    if (!Array.isArray(d.people) || d.people.length > MAX_NO || d.people.length !== d.seq - 1) return null
    var people = []; var prevAt = 0; var used = {}; var waitSet = {}; var nWait = 0
    for (var i = 0; i < d.people.length; i++) {
      var p = d.people[i]
      if (!isObj(p) || p.no !== i + 1) return null
      if (!hasMenu(p.menu)) return null
      if (!inRange(p.at, 0, now) || p.at < prevAt) return null
      prevAt = p.at
      if (typeof p.status !== 'string' || STATUSES.indexOf(p.status) < 0) return null
      if (p.absent !== 0 && p.absent !== 1) return null
      if (!isInt(p.seat)) return null
      var st = p.status
      var nul = function (v) { return v === null }
      if (st === 'wait' || st === 'canceled') { if (p.seat !== 0) return null } else if (!inRange(p.seat, 1, SEATS)) return null
      if (st === 'wait') {
        if (!nul(p.calledAt) || !nul(p.startAt) || !nul(p.endAt)) return null
        waitSet[p.no] = true; nWait++
      } else if (st === 'called') {
        if (!inRange(p.calledAt, p.at, now) || !nul(p.startAt) || !nul(p.endAt)) return null
      } else if (st === 'serving') {
        if (!inRange(p.startAt, p.at, now) || !nul(p.endAt)) return null
        if (!nul(p.calledAt) && !inRange(p.calledAt, p.at, p.startAt)) return null
      } else if (st === 'done') {
        if (!inRange(p.startAt, p.at, now) || !inRange(p.endAt, p.startAt, now)) return null
        if (!nul(p.calledAt) && !inRange(p.calledAt, p.at, p.startAt)) return null
      } else {
        if (!inRange(p.endAt, p.at, now) || !nul(p.startAt) || !nul(p.calledAt)) return null
      }
      if (st === 'called' || st === 'serving') {
        if (used[p.seat]) return null
        used[p.seat] = true
      }
      people.push({ no: p.no, menu: p.menu, at: p.at, status: st, seat: p.seat, absent: p.absent, calledAt: st === 'called' || st === 'serving' || st === 'done' ? p.calledAt : null, startAt: p.startAt, endAt: p.endAt })
    }
    if (!Array.isArray(d.line) || d.line.length > MAX_WAIT || d.line.length !== nWait) return null
    var seen = {}; var line = []
    for (i = 0; i < d.line.length; i++) {
      var no = d.line[i]
      if (!isInt(no) || seen[no] || !waitSet[no]) return null
      seen[no] = true
      line.push(no)
    }
    return { now: now, seq: d.seq, line: line, people: people }
  }
  // 見本（§18-3）
  function sample () {
    var P = function (no, menu, at, status, seat, calledAt, startAt, endAt) {
      return { no: no, menu: menu, at: at, status: status, seat: seat, absent: 0, calledAt: calledAt, startAt: startAt, endAt: endAt }
    }
    return {
      now: START_NOW,
      seq: 10,
      line: [4, 5, 7, 8, 9],
      people: [
        P(1, 'shave', 600, 'serving', 1, 600, 600, null),
        P(2, 'shave', 604, 'serving', 2, 608, 610, null),
        P(3, 'kids', 614, 'serving', 3, 622, 625, null),
        P(4, 'cut', 618, 'wait', 0, null, null, null),
        P(5, 'shave', 624, 'wait', 0, null, null, null),
        P(6, 'cut', 627, 'canceled', 0, null, null, 633),
        P(7, 'kids', 631, 'wait', 0, null, null, null),
        P(8, 'cut', 635, 'wait', 0, null, null, null),
        P(9, 'cut', 638, 'wait', 0, null, null, null)
      ]
    }
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
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, now: S.now, seq: S.seq, line: S.line, people: S.people }))
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
  function person (no) { return isInt(no) && no >= 1 && no <= S.people.length ? S.people[no - 1] : null }
  function waitCount () { return S.line.length }

  // ---------- 操作（§7-2。どれも読む → 変える → 書く。戻り値は読み上げの文） ----------
  // 番号を取る（§7-4）。戻り値 { no } か { why }
  function takeNumber (menu) {
    load()
    var why = takeBlock(menu)
    if (why) return { why: why }
    var no = S.seq
    S.people.push({ no: no, menu: menu, at: S.now, status: 'wait', seat: 0, absent: 0, calledAt: null, startAt: null, endAt: null })
    S.line.push(no)
    S.seq = no + 1
    save()
    return { no: no }
  }
  function takeBlock (menu) {
    if (S.now >= CLOSE) return '本日の受付は終わりました（デモの時計は 19:00 まで）'
    if (S.seq > MAX_NO) return 'デモでは番号は99番までです。「見本に戻す」で最初に戻せます'
    if (waitCount() >= MAX_WAIT) return 'いま受付を止めています（デモでは待っている人は30人までです）'
    if (!hasMenu(menu)) return 'メニューを選んでください'
    return ''
  }
  // 次の人を呼ぶ。shown は押したボタンに出ていた番号（古い画面の見分け）
  function callNext (seat, shown) {
    load()
    var p = seatPerson(S, seat)
    if (p) return { msg: p.status === 'called' ? seatLabel(seat) + ' は もう ' + noLabel(p.no) + ' を呼んでいます' : seatLabel(seat) + ' は 施術中です' }
    if (!S.line.length) return { msg: '待っている人はいません' }
    var no = S.line.shift()
    var q = person(no)
    q.status = 'called'; q.seat = seat; q.calledAt = S.now
    save()
    var msg = shown && shown !== no ? noLabel(shown) + ' はほかの席で呼ばれたため、' + noLabel(no) + ' を呼びました' : seatLabel(seat) + ' に ' + noLabel(no) + ' を呼びました'
    return { msg: msg, ok: true }
  }
  function changed (no) { return { msg: noLabel(no) + ' の状態が変わったため、操作しませんでした' } }
  // 来店を確認（施術を始める）
  function checkIn (seat, no) {
    load()
    var p = seatPerson(S, seat)
    if (!p || p.no !== no || p.status !== 'called') return changed(no)
    p.status = 'serving'; p.startAt = S.now
    save()
    return { msg: noLabel(no) + ' の施術を始めました。終わり見込み ' + clock(S.now + MENU[p.menu].min), ok: true }
  }
  // 終わり
  function finish (seat, no) {
    load()
    var p = seatPerson(S, seat)
    if (!p || p.no !== no || p.status !== 'serving') return changed(no)
    p.status = 'done'; p.endAt = S.now
    save()
    return { msg: seatLabel(seat) + ' の ' + noLabel(no) + ' を終わりにしました', ok: true }
  }
  // 不在（後ろへ回す）。不在 0 の人だけ
  function markAbsent (seat, no) {
    load()
    var p = seatPerson(S, seat)
    if (!p || p.no !== no || p.status !== 'called' || p.absent !== 0) return changed(no)
    // 列が上限なら回さない（回すと 31人になり、検証で見本に戻ってしまうため）。理由をそのまま伝える
    if (S.line.length >= MAX_WAIT) return { msg: '待っている人が30人のため、' + noLabel(no) + ' を後ろへ回せません' }
    p.status = 'wait'; p.absent = 1; p.seat = 0; p.calledAt = null
    S.line.push(no)
    save()
    return { msg: noLabel(no) + ' を不在として列の最後に回しました', ok: true }
  }
  // 取り消す（お客様：待ち・呼び出し中／お店：呼び出し中で不在 1 の人）
  function cancelNo (no, from) {
    load()
    var p = person(no)
    if (!p) return changed(no)
    if (from === 'shop' && !(p.status === 'called' && p.absent === 1)) return changed(no)
    if (p.status !== 'wait' && p.status !== 'called') return changed(no)
    if (p.status === 'wait') S.line = S.line.filter(function (x) { return x !== no })
    p.status = 'canceled'; p.endAt = S.now; p.seat = 0; p.calledAt = null
    save()
    return { msg: noLabel(no) + ' の受付を取り消しました', ok: true }
  }
  // 時計を進める（§5-5）
  function advance (min) {
    load()
    if (S.now >= CLOSE) return { msg: 'デモの時計は 19:00 までです' }
    S.now = Math.min(S.now + min, CLOSE)
    save()
    return { msg: 'デモの時計を ' + clock(S.now) + ' にしました', ok: true }
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
  function btn (cls, id) {
    var b = el('button', cls)
    b.type = 'button'
    if (id) b.id = id
    return b
  }
  function setDisabled (b, off) { if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled') }
  function isOff (b) { return b.getAttribute('aria-disabled') === 'true' }
  function nw (text, cls) { return el('span', 'nw' + (cls ? ' ' + cls : ''), text) }
  // 番号の大きな数字（数字＋小さい「番」）
  function bigNo (n, cls) {
    var s = el('span', 'nw ' + cls)
    add(s, [el('span', cls + '-d', String(n)), el('span', cls + '-u', '番')])
    return s
  }

  // 折れてはいけない語（§13）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = ['理容 トモリギ', 'デモ（架空のお店）', '2026年11月21日（土）', 'カット＋顔そり', '子どもカット',
    '来店を確認', '（施術を始める）', '不在（後ろへ回す）', '受付を取り消す', '次の人を呼ぶ', '番号を取る', '見本に戻す', '次の方の受付へ', '1分進める', '5分進める',
    '目安です。', '前後します', 'お進みください', 'あなたの前に', '待っています', '呼ばれました', '呼び出し中', '施術中', '不在・後ろへ', '取り消し', '取り消す', 'まもなく',
    '終わり見込み', 'トモリギ', 'カット', 'デモ', '架空']
  var NW_RE = new RegExp([
    '席[1-3]へお進みください', '（\\d{1,2}番）', '約\\d+分', '\\d{2}:\\d{2}', '\\d{1,2}番', '席[1-3]', '\\d+(?:人|件|分)'
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
    wait: ['待っています', 'i-hourglass'], waitShop: ['待ち', 'i-hourglass'], soon: ['まもなく', 'i-arrow'], absent: ['不在・後ろへ', 'i-uturn'],
    called: ['呼び出し中', 'i-bell'], calledCust: ['呼ばれました', 'i-bell'], serving: ['施術中', 'i-scissors'], done: ['終わり', 'i-check'], canceled: ['取り消し', 'i-ban']
  }
  var TAG_CLS = { waitShop: 'wait', calledCust: 'called' }
  function stateTag (kind, big) {
    var cls = TAG_CLS[kind] || kind
    var t = el('span', 'state-tag state-tag--' + cls + (big ? ' state-tag--big' : ''))
    t.setAttribute('data-state', cls)
    add(t, [icon(TAG[kind][1], big ? 18 : 14), TAG[kind][0]])
    return t
  }
  // 待っている人の札の種類（優先：まもなく ＞ 不在・後ろへ ＞ 待ち）
  function waitKind (p, e) {
    if (e && e.est === 0) return 'soon'
    if (p.absent === 1) return 'absent'
    return 'wait'
  }

  // ---------- 知らせ ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  function announce (msg) {
    var sr = $('sr-status')
    window.clearTimeout(srTimer)
    sr.textContent = ''
    srTimer = window.setTimeout(function () { sr.textContent = msg }, 50)
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

  // ---------- 確認の窓（⑯と同じ。最初のフォーカスは「やめる」、Esc＝やめる） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null
  function confirmBox (opt) {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(true); return }
      $('cf-title').textContent = opt.title
      $('cf-body').textContent = opt.body
      var ok = $('cf-ok')
      ok.textContent = ''
      if (opt.danger) ok.appendChild(icon('i-ban', 18))
      ok.appendChild(document.createTextNode(opt.ok))
      ok.className = 'btn-sub confirm__ok' + (opt.danger ? ' btn-danger' : '')
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
    // やめた時は開いた所へ戻す。遅れて動いた時に、その間に利用者が動かしたフォーカスを奪わないよう、フォーカスが body・窓の中にある時だけ戻す（⑯ と同じ直し）
    if (!yes && dlgOpener) {
      var id = dlgOpener
      if ($(id)) $(id).focus()
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
  var ui = {
    tab: parseView(search) || 'customer',
    mine: null,
    menu: null,
    tried: false,
    calls: null
  }
  function focusId (id) { var e = $(id); if (e) e.focus({ preventScroll: false }) }
  function setUrl (q) { try { window.history.replaceState(null, '', q) } catch (e) { /* file:// などで置き換えられない時はそのまま */ } }

  // ---------- タブ（⑯と同じ動き。3つ） ----------
  var TABS = ['customer', 'shop', 'board']
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
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = TABS.length - 1
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
        openTab('customer', { noScroll: true })
        var f = ui.mine ? $('mine-ticket') : n === '1' ? $('menu-cut') : $('c-take').querySelector('.now-box')
        if (f && !f.hasAttribute('tabindex') && f.tagName !== 'BUTTON') f.setAttribute('tabindex', '-1')
        goTo($('cust-frame'), f)
      } else if (n === '3') {
        openTab('shop', { noScroll: true })
        goTo($('s-seats'), $('s-seats'))
      } else {
        openTab('board', { noScroll: true })
        goTo($('panel-board'), $('board-h'))
      }
    })
  })

  // ---------- デモの時計（§5-5） ----------
  function renderClock () {
    $('clock-time').textContent = clock(S.now)
    setDisabled($('btn-adv1'), S.now >= CLOSE)
    setDisabled($('btn-adv5'), S.now >= CLOSE)
  }
  function onAdvance (min, b) {
    var r = advance(min)
    renderAll()
    b.focus()
    announce(r.msg)
  }
  $('btn-adv1').addEventListener('click', function () { onAdvance(1, $('btn-adv1')) })
  $('btn-adv5').addEventListener('click', function () { onAdvance(5, $('btn-adv5')) })

  // ---------- お客様の画面（§6） ----------
  function renderCustomer () {
    var mine = ui.mine ? person(ui.mine) : null
    if (ui.mine && !mine) ui.mine = null
    $('c-take').hidden = !!ui.mine
    $('c-mine').hidden = !ui.mine
    var est = estimate(S)
    // 受付
    $('now-wait-n').textContent = String(waitCount())
    $('now-est').textContent = estLabel(est.next.est)
    MENU_IDS.forEach(function (id) { $('menu-' + id).setAttribute('aria-pressed', ui.menu === id ? 'true' : 'false') })
    var why = takeBlock(ui.menu)
    var take = $('btn-take')
    setDisabled(take, !!why)
    var showWhy = why && (why !== 'メニューを選んでください' || ui.tried)
    $('take-why').hidden = !showWhy
    $('take-why').textContent = ''
    if (showWhy) { add($('take-why'), [icon('i-info', 18), el('span', null, why)]); wrapWords($('take-why')) }
    if (mine) renderMine(mine, est)
  }
  function renderMine (p, est) {
    var e = est.byNo[p.no]
    $('mine-ticket').setAttribute('aria-label', 'あなたの番号 ' + noLabel(p.no))
    $('mine-no').textContent = ''
    $('mine-no').appendChild(bigNo(p.no, 'ticket-no__n'))
    $('mine-meta').textContent = menuName(p.menu) + '・受付 ' + clock(p.at)
    wrapWords($('mine-meta'))
    var kind = p.status === 'wait' ? waitKind(p, e) : p.status === 'called' ? 'calledCust' : p.status
    var tagBox = $('mine-tag')
    tagBox.textContent = ''
    tagBox.appendChild(stateTag(kind, true))
    $('mine-once').hidden = !(p.status === 'wait' && p.absent === 1 && e && e.est === 0)
    var body = $('mine-body')
    body.textContent = ''
    if (p.status === 'wait') {
      var msg = kind === 'soon' ? 'まもなく呼ばれます。お店の近くでお待ちください。' : kind === 'absent' ? '呼ばれた時にいらっしゃらなかったため、列の後ろへ回りました。次に呼ばれた時にいらっしゃらない場合は、受付が取り消されます。' : '呼ばれたら、表示の席へお進みください。'
      var facts = el('div', 'wait-facts')
      var f1 = el('div', 'wait-facts__box')
      add(f1, [el('p', 'wait-facts__l', 'あなたの前に'), add(el('p', 'wait-facts__v nw', null), [el('span', 'wait-facts__n', String(e.ahead)), el('span', 'wait-facts__u', '人')])])
      f1.id = 'mine-ahead'
      var f2 = el('div', 'wait-facts__box')
      var v2 = el('p', 'wait-facts__v nw')
      if (e.est === 0) v2.appendChild(el('span', 'wait-facts__n wait-facts__n--soon', 'まもなく'))
      else add(v2, [el('span', 'wait-facts__u', '約'), el('span', 'wait-facts__n', String(e.est)), el('span', 'wait-facts__u', '分')])
      add(f2, [el('p', 'wait-facts__l', '目安'), v2])
      f2.id = 'mine-est'
      add(facts, [f1, f2])
      var sr = el('p', 'visually-hidden', 'あなたの前に ' + e.ahead + '人、目安 ' + estLabel(e.est))
      add(body, [facts, sr, el('p', 'est-note', '目安です。前後します'), el('p', 'mine-msg', msg)])
      if (e.ahead === 0) facts.querySelector('.wait-facts__v').appendChild(el('span', 'wait-facts__x', '（次の番です）'))
      add(body, el('p', 'sub sub--13', 'この画面を閉じても、番号は ' + noLabel(p.no) + ' のままです。'))
    } else if (p.status === 'called') {
      // role="status" は付けない：描き直しのたびに作り直す箱なので、#sr-status の読み上げと二重になりうる（読み上げは #sr-status に一本化）
      var box = el('div', 'called-box')
      var t = el('p', 'called-box__t')
      add(t, [icon('i-bell', 20), stateTag('calledCust')])
      add(box, [t, el('p', 'called-box__no', noLabel(p.no) + ' さま'), el('p', 'called-box__seat', seatLabel(p.seat) + ' へお進みください'), el('p', 'called-box__at', clock(p.calledAt) + ' に呼ばれました')])
      add(body, box)
    } else if (p.status === 'serving') {
      add(body, el('p', 'mine-msg', seatLabel(p.seat) + ' で施術中です。'))
    } else if (p.status === 'done') {
      var d = el('div', 'done-box')
      add(d, [icon('i-okc', 24), el('p', null, 'ご来店ありがとうございました。')])
      add(body, d)
    } else {
      var c = el('div', 'cancel-box')
      add(c, [el('p', 'cancel-box__t', 'この番号の受付は取り消されました。'), el('p', 'sub', '番号を取り直す時は「次の方の受付へ」を押してください。')])
      add(body, c)
    }
    wrapWords(body)
    $('btn-cancel').hidden = !(p.status === 'wait' || p.status === 'called')
    $('mine-link').setAttribute('href', '?view=customer&no=' + p.no)
  }
  function mineSnap () {
    if (!ui.mine) return null
    var p = person(ui.mine)
    if (!p) return null
    var e = estimate(S).byNo[p.no]
    return { no: p.no, status: p.status, seat: p.seat, absent: p.absent, est: e ? e.est : null }
  }
  // 別のタブの操作で自分の番号が変わった時の読み上げ（§15-2）
  function mineMsg (a, b) {
    if (!a || !b || a.no !== b.no) return ''
    var n = noLabel(b.no)
    if (a.status !== b.status) {
      if (b.status === 'called') return n + ' が呼ばれました。' + seatLabel(b.seat) + ' へお進みください'
      if (b.status === 'serving') return n + ' は ' + seatLabel(b.seat) + ' で施術中です'
      if (b.status === 'done') return n + ' は終わりました。ご来店ありがとうございました'
      if (b.status === 'canceled') return n + ' の受付は取り消されました'
      if (b.status === 'wait' && b.absent === 1) return n + ' は不在のため後ろへ回りました。目安 ' + estLabel(b.est)
      return ''
    }
    if (b.status === 'wait' && a.est !== b.est) return '目安が ' + estLabel(b.est) + ' になりました'
    return ''
  }
  $('menu-list').addEventListener('click', function (e) {
    var b = e.target.closest('.menu-btn')
    if (!b) return
    var id = b.getAttribute('data-menu')
    if (!hasMenu(id)) return
    ui.menu = id
    ui.tried = false
    renderCustomer()
  })
  $('btn-take').addEventListener('click', function () {
    var r = takeNumber(ui.menu)
    if (r.why) {
      ui.tried = true
      renderAll()
      announce(r.why)
      return
    }
    ui.mine = r.no
    ui.menu = null
    ui.tried = false
    setUrl('?view=customer&no=' + r.no)
    renderAll()
    var e = estimate(S).byNo[r.no]
    focusId('c-mine-h')
    announce(noLabel(r.no) + ' を取りました。あなたの前に ' + e.ahead + '人、目安 ' + estLabel(e.est) + 'です。目安です。前後します')
  })
  $('btn-next-guest').addEventListener('click', function () {
    ui.mine = null; ui.menu = null; ui.tried = false
    setUrl('?view=customer')
    renderAll()
    focusId('c-take-h')
    announce('受付の画面に戻りました')
  })
  $('btn-cancel').addEventListener('click', function () {
    var no = ui.mine
    if (!no) return
    confirmBox({ title: noLabel(no) + ' の受付を取り消しますか', body: '取り消すと、この番号では呼ばれなくなります。番号を取り直すと、列の最後になります。', ok: '取り消す', danger: true }).then(function (yes) {
      if (!yes) return
      var r = cancelNo(no, 'customer')
      renderAll()
      focusId('c-mine-h')
      if (r.ok) showToast(r.msg); else announce(r.msg)
    })
  })

  // ---------- お店の画面（§8） ----------
  function seatCard (s, est) {
    var p = seatPerson(S, s)
    var state = !p ? 'empty' : p.status
    var card = el('article', 'seat')
    card.id = 'seat-' + s
    card.setAttribute('data-state', state)
    card.setAttribute('aria-labelledby', 'seat-' + s + '-h')
    var head = el('div', 'seat__head')
    var h = el('h3', null, seatLabel(s))
    h.id = 'seat-' + s + '-h'
    head.appendChild(h)
    if (!p) head.appendChild(el('span', 'seat__empty', '空き'))
    else head.appendChild(stateTag(p.status))
    card.appendChild(head)
    var main = btn('btn-main seat__main', 'seat-' + s + '-main')
    var acts = el('div', 'seat__actions')
    if (!p) {
      var next = S.line.length ? S.line[0] : null
      if (next) {
        var q = person(next)
        card.appendChild(el('p', 'seat__next', '次は ' + noLabel(next) + '（' + menuName(q.menu) + '）'))
        add(main, [icon('i-bell', 18), add(el('span'), [nw('次の人を呼ぶ'), nw('（' + noLabel(next) + '）')])])
        main.setAttribute('aria-label', '次の人を呼ぶ（' + noLabel(next) + '）' + seatLabel(s))
        main.setAttribute('data-no', String(next))
      } else {
        card.appendChild(el('p', 'seat__next', '待っている人はいません'))
        add(main, [icon('i-bell', 18), nw('次の人を呼ぶ')])
        setDisabled(main, true)
      }
      main.setAttribute('data-act', 'call')
      acts.appendChild(main)
    } else {
      var no = el('p', 'seat__no')
      add(no, [nw(noLabel(p.no), 'seat__no-n'), ' ', nw(menuName(p.menu), 'seat__no-m')])
      card.appendChild(no)
      main.setAttribute('data-no', String(p.no))
      if (p.status === 'called') {
        card.appendChild(el('p', 'seat__meta', '呼び出し ' + clock(p.calledAt) + '・呼んでから ' + (S.now - p.calledAt) + '分'))
        add(main, [icon('i-scissors', 18), add(el('span'), [nw('来店を確認'), nw('（施術を始める）')])])
        main.setAttribute('data-act', 'checkin')
        acts.appendChild(main)
        if (p.absent === 0) {
          var ab = btn('btn-sub seat__sub', 'seat-' + s + '-sub')
          add(ab, [icon('i-uturn', 18), nw('不在（後ろへ回す）')])
          ab.setAttribute('data-act', 'absent'); ab.setAttribute('data-no', String(p.no))
          acts.appendChild(ab)
        } else {
          acts.appendChild(el('p', 'seat__once', noLabel(p.no) + ' は一度 不在で後ろへ回っています。2回目は取り消しだけです'))
          var cb = btn('btn-sub btn-danger seat__sub', 'seat-' + s + '-sub')
          add(cb, [icon('i-ban', 18), nw('受付を取り消す')])
          cb.setAttribute('data-act', 'cancel'); cb.setAttribute('data-no', String(p.no))
          acts.appendChild(cb)
        }
      } else {
        var end = p.startAt + MENU[p.menu].min
        var meta = el('p', 'seat__meta')
        add(meta, [nw('開始 ' + clock(p.startAt)), '・', nw('終わり見込み ' + clock(end)), S.now > end ? nw('（' + (S.now - end) + '分過ぎています）') : null])
        card.appendChild(meta)
        add(main, [icon('i-check', 18), nw('終わり')])
        main.setAttribute('aria-label', seatLabel(s) + ' の ' + noLabel(p.no) + ' を終わりにする')
        main.setAttribute('data-act', 'finish')
        acts.appendChild(main)
      }
    }
    card.appendChild(acts)
    wrapWords(card)
    return card
  }
  function renderShop () {
    var est = estimate(S)
    var sum = shopSummary(S)
    $('sum-wait-n').textContent = String(sum.wait)
    $('sum-total-n').textContent = String(sum.total)
    $('sum-cancel').textContent = '取り消し ' + sum.canceled + '件'
    var av = $('sum-avg-v')
    av.textContent = ''
    if (sum.avg) {
      add(av, [el('span', 'summary__unit summary__unit--pre', '約'), el('span', 'summary__n', String(sum.avg.avg)), el('span', 'summary__unit', '分')])
      $('sum-avg-note').textContent = '施術を始めた ' + sum.avg.n + '人'
    } else {
      var dash = el('span', 'summary__n', '—')
      dash.setAttribute('aria-hidden', 'true')
      add(av, [dash, el('span', 'visually-hidden', 'まだありません')])
      $('sum-avg-note').textContent = '施術を始めた 0人'
    }
    $('sum-done-n').textContent = String(sum.done)
    // 席のカード
    var list = $('seats-list')
    list.textContent = ''
    for (var s = 1; s <= SEATS; s++) list.appendChild(seatCard(s, est))
    // 待っている人
    $('s-line-n').textContent = S.line.length + '人'
    var body = $('line-body'); var cards = $('line-cards')
    body.textContent = ''; cards.textContent = ''
    S.line.forEach(function (no, i) {
      var p = person(no); var e = est.byNo[no]
      var kind = waitKind(p, e) === 'wait' ? 'waitShop' : waitKind(p, e)
      var tr = el('tr')
      tr.setAttribute('data-no', String(no))
      var th = el('th', 'line-table__no', noLabel(no))
      th.setAttribute('scope', 'row')
      add(tr, [el('td', 'line-table__ord', String(i + 1)), th, el('td', null, menuName(p.menu)), el('td', null, clock(p.at)), el('td', null, waited(p.at, S.now)), el('td', 'line-table__est', estLabel(e.est)), add(el('td'), stateTag(kind))])
      body.appendChild(tr)
      var li = el('li', 'line-card')
      li.setAttribute('data-no', String(no))
      var r1 = el('p', 'line-card__r1')
      add(r1, [el('span', 'line-card__ord', String(i + 1)), nw(noLabel(no), 'line-card__no'), el('span', 'line-card__menu', menuName(p.menu)), stateTag(kind)])
      var r2 = el('p', 'line-card__r2')
      add(r2, [el('span', null, '受付 ' + clock(p.at) + '・待った ' + waited(p.at, S.now)), el('span', 'line-card__est', '目安 ' + estLabel(e.est))])
      add(li, [r1, r2])
      cards.appendChild(li)
    })
    wrapWords(body); wrapWords(cards)
    var none = S.line.length === 0
    $('line-table').hidden = none
    cards.hidden = none
    $('line-none').hidden = !none
    var foot = $('line-foot')
    foot.textContent = none ? '' : '目安です。前後します。次に呼ぶのは いちばん上の ' + noLabel(S.line[0]) + ' です。'
    foot.hidden = none
    wrapWords(foot)
    // 今日の記録
    var logged = S.people.filter(function (p) { return p.status === 'done' || p.status === 'canceled' })
    $('day-log-sum').textContent = '今日の記録（終わり ' + sum.done + '人・取り消し ' + sum.canceled + '件）'
    wrapWords($('day-log-sum'))
    var ul = $('day-log-ul')
    ul.textContent = ''
    logged.forEach(function (p) {
      var li = el('li', 'day-log__row')
      li.setAttribute('data-no', String(p.no))
      if (p.status === 'canceled') {
        add(li, [nw(noLabel(p.no), 'day-log__no'), nw(menuName(p.menu)), nw('受付 ' + clock(p.at)), add(el('span', 'nw'), [stateTag('canceled'), ' ' + clock(p.endAt)])])
      } else {
        add(li, [nw(noLabel(p.no), 'day-log__no'), nw(menuName(p.menu)), nw('受付 ' + clock(p.at)), nw('開始 ' + clock(p.startAt)), nw('終わり ' + clock(p.endAt)), nw(seatLabel(p.seat)), stateTag('done')])
      }
      ul.appendChild(li)
    })
  }
  $('seats-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-act]')
    if (!b) return
    var s = parseInt(b.id.split('-')[1], 10)
    var act = b.getAttribute('data-act')
    var no = b.hasAttribute('data-no') ? parseInt(b.getAttribute('data-no'), 10) : null
    if (act === 'call' && isOff(b)) { announce('待っている人はいません'); return }
    if (act === 'cancel') {
      confirmBox({ title: noLabel(no) + ' の受付を取り消しますか', body: noLabel(no) + ' は2回目の呼び出しにもいらっしゃいませんでした。取り消すと、' + seatLabel(s) + ' が空きます。番号は欠番になります。', ok: '取り消す', danger: true }).then(function (yes) {
        if (!yes) return
        var r = cancelNo(no, 'shop')
        renderAll()
        focusId('seat-' + s + '-main')
        if (r.ok) showToast(r.msg); else announce(r.msg)
      })
      return
    }
    var r = act === 'call' ? callNext(s, no) : act === 'checkin' ? checkIn(s, no) : act === 'finish' ? finish(s, no) : markAbsent(s, no)
    renderAll()
    focusId('seat-' + s + '-main')
    announce(r.msg)
  })

  // ---------- 呼び出し表示（§9） ----------
  function calledList () {
    var out = []
    for (var s = 1; s <= SEATS; s++) { var p = seatPerson(S, s); if (p && p.status === 'called') out.push(p.no + '@' + s) }
    return out
  }
  function renderBoard () {
    var est = estimate(S)
    $('board-now').textContent = clock(S.now)
    var seats = $('board-seats')
    seats.textContent = ''
    var anyCall = false
    for (var s = 1; s <= SEATS; s++) {
      var p = seatPerson(S, s)
      var st = !p ? 'empty' : p.status
      var box = el('div', 'board__seat')
      box.id = 'board-seat-' + s
      box.setAttribute('data-state', st)
      var name = el('p', 'board__seat-name', seatLabel(s))
      box.appendChild(name)
      var main = el('div', 'board__seat-main')
      if (st === 'called') {
        anyCall = true
        if (ui.calls && ui.calls.indexOf(p.no + '@' + s) < 0 && !reduceMotion) box.classList.add('is-in')
        add(main, [bigNo(p.no, 'board__no'), el('p', 'board__go', seatLabel(s) + 'へお進みください')])
      } else {
        main.appendChild(el('p', 'board__state', st === 'serving' ? '施術中' : 'ご案内の準備中'))
      }
      box.appendChild(main)
      wrapWords(box)
      seats.appendChild(box)
    }
    $('board-none').hidden = anyCall
    var nx = $('board-next')
    nx.textContent = ''
    S.line.slice(0, 3).forEach(function (no) {
      var li = el('li', 'board__next-item')
      li.setAttribute('data-no', String(no))
      add(li, [bigNo(no, 'board__next-no'), el('p', 'board__next-est nw', estLabel(est.byNo[no].est))])
      nx.appendChild(li)
    })
    nx.hidden = S.line.length === 0
    $('board-next-none').hidden = S.line.length > 0
    $('board-wait-n').textContent = S.line.length + '人'
  }

  // ---------- まとめて描き直す ----------
  function renderTabs () {
    var n = waitCount()
    var badge = $('tab-shop-badge')
    badge.hidden = n === 0
    badge.textContent = n ? '待ち ' + n : ''
    if (n) $('tab-shop').setAttribute('aria-label', 'お店の画面（待っている人 ' + n + '人）'); else $('tab-shop').removeAttribute('aria-label')
  }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    $('board-live').textContent = ''
    renderClock()
    renderCustomer()
    renderShop()
    renderBoard()
    renderTabs()
    ui.calls = calledList()
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }

  // ---------- 見本に戻す（§11-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox({ title: '見本に戻しますか', body: '受付・呼び出し・時計をすべて最初（10:40、待っている人 5人）に戻します。', ok: '戻す' }).then(function (yes) {
      if (!yes) return
      S = sample()
      save()
      if (ui.mine && ui.mine >= S.seq) { ui.mine = null; setUrl('?view=customer') }
      ui.menu = null; ui.tried = false
      renderAll()
      focusId('btn-reset')
      showToast('見本に戻しました')
    })
  })

  // ---------- 3つの画面の同期（§11-3） ----------
  window.addEventListener('storage', function (e) {
    if (!canSave) return
    if (e.key !== null && e.key !== KEY) return
    var before = mineSnap()
    var callsBefore = ui.calls || []
    if (e.key === null || e.newValue === null) { S = sample(); save() } else load()
    if (ui.mine && !person(ui.mine)) { ui.mine = null; setUrl('?view=customer') }
    renderAll()
    var after = mineSnap()
    var msg = ui.tab === 'customer' ? mineMsg(before, after) : ''
    if (msg) announce(msg)
    // 呼び出しが増えた時だけ、見えている呼び出し表示で読む（polite）
    var live = $('board-live')
    var added = ui.calls.filter(function (c) { return callsBefore.indexOf(c) < 0 })
    if (ui.tab === 'board' && added.length) {
      live.textContent = added.map(function (c) { var x = c.split('@'); return x[0] + '番の方、席' + x[1] + 'へお進みください' }).join('。')
    }
  })

  // ---------- はじめ ----------
  $('note-nosave').hidden = canSave
  load()
  var urlNo = parseNo(search)
  if (urlNo && person(urlNo)) ui.mine = urlNo
  wrapWords(document.body)
  renderAll()
  openTab(ui.tab, { noScroll: true })

  // 検査用（純粋な関数だけ。状態は出さない）
  window.__demo18 = { estimate: estimate, ceil5: ceil5, estLabel: estLabel, clock: clock, parseView: parseView, parseNo: parseNo, validate: validate, avgWait: avgWait }
})()
