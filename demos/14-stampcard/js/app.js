// パンの店 ネリマメ堂（デモ）スマホのスタンプカード
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 画面はいつも状態 S から描き直す（design.md §11-1 evaluate）。個数・金額・日数は整数だけで扱う
(function () {
  'use strict'

  // ---------- 定数（design.md §7-1） ----------
  var TODAY = '2026-12-05'
  var TODAY_LONG = '2026年12月5日（土）'
  var PER_YEN = 1000
  var MAX_PER_VISIT = 3
  var CARD = 10
  var GIFTS = { drink: { at: 5, name: 'ドリンク1杯', icon: 'i-cup' }, bread: { at: 10, name: '好きなパン1つ', icon: 'i-bread' } }
  var KINDS = ['drink', 'bread']
  var KIND_SHORT = { drink: 'ドリンク', bread: 'パン' }
  var VALID_MONTHS = 6
  var NEAR_DAYS = 30
  var AMOUNT_MIN = 1
  var AMOUNT_MAX = 100000
  var MAX_MEMBERS = 50
  var REASONS = ['金額の打ち間違い', '会員の選び間違い', '二重に押した', 'その他']
  var STORE_KEY = 'tenkaLab.demo14.stampcard.v1'
  // 見本の会員8人（§18-2）
  var SEED = [
    { no: 1, stamps: 7, drink: 1, bread: 0, last: '2026-12-01', joined: '2026-03-14' },
    { no: 2, stamps: 9, drink: 0, bread: 1, last: '2026-11-28', joined: '2026-01-10' },
    { no: 3, stamps: 3, drink: 0, bread: 0, last: '2026-11-30', joined: '2026-09-02' },
    { no: 4, stamps: 4, drink: 0, bread: 0, last: '2026-05-20', joined: '2026-02-08' },
    { no: 5, stamps: 6, drink: 1, bread: 0, last: '2026-06-20', joined: '2026-04-01' },
    { no: 6, stamps: 0, drink: 0, bread: 1, last: '2026-08-31', joined: '2025-12-20' },
    { no: 7, stamps: 5, drink: 1, bread: 0, last: '2026-11-15', joined: '2026-07-22' },
    { no: 8, stamps: 1, drink: 0, bread: 0, last: '2026-12-03', joined: '2026-12-03' }
  ]

  // ---------- 書き方（§2-3） ----------
  function parts (iso) { return [parseInt(iso.slice(0, 4), 10), parseInt(iso.slice(5, 7), 10), parseInt(iso.slice(8, 10), 10)] }
  function dateLong (iso) { var p = parts(iso); return p[0] + '年' + p[1] + '月' + p[2] + '日' }
  function dateShort (iso) { var p = parts(iso); return p[0] + '/' + p[1] + '/' + p[2] }
  function yen (n) { return n.toLocaleString('ja-JP') + '円' }
  function pcs (n) { return n + '個' }
  function gifts (n) { return n + 'つ' }
  function memberNo (n) { return 'NM-' + ('000' + n).slice(-4) }
  function pad2 (n) { return (n < 10 ? '0' : '') + n }

  // ---------- 規則（§7。純粋な関数） ----------
  function isLeap (y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) }
  function monthDays (y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] }
  function dayNum (iso) { var p = parts(iso); return Date.UTC(p[0], p[1] - 1, p[2]) / 86400000 }
  // 有効期限＝最後の来店の6か月後の同じ日（無い日は月末）
  function expiryOf (last) {
    var p = parts(last)
    var y = p[0]; var m = p[1] + VALID_MONTHS
    if (m > 12) { y += 1; m -= 12 }
    var d = Math.min(p[2], monthDays(y, m))
    return y + '-' + pad2(m) + '-' + pad2(d)
  }
  function daysLeft (last) { return dayNum(expiryOf(last)) - dayNum(TODAY) }
  // 'expired' | 'near' | 'ok'（会員でも最後の来店日の文字でも受ける）
  function statusOf (m) {
    var left = daysLeft(typeof m === 'string' ? m : m.last)
    return left < 0 ? 'expired' : left <= NEAR_DAYS ? 'near' : 'ok'
  }
  function effectiveStamps (m) { return statusOf(m) === 'expired' ? 0 : m.stamps }
  function countOf (a) { return Math.min(MAX_PER_VISIT, Math.floor(a / PER_YEN)) }
  // 押した時の数え方（§7-3）。会員は変えずに結果を返す
  function applyStamp (member, k) {
    var reset = statusOf(member) === 'expired'
    var s0 = reset ? 0 : member.stamps
    var s1 = s0 + k
    var gained = null
    if (s1 >= CARD) gained = 'bread'
    else if (s0 < GIFTS.drink.at && s1 >= GIFTS.drink.at) gained = 'drink'
    return { s0: s0, s1: s1, stamps: gained === 'bread' ? s1 - CARD : s1, last: TODAY, gained: gained, reset: reset }
  }
  // 金額の読み取り（§7-2）{ v } か { err: 'empty' | 'form' | 'range' }
  function parseAmount (v) {
    var s = String(v == null ? '' : v).trim()
    if (s === '') return { err: 'empty' }
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) }).replace(/[,，]/g, '')
    if (!/^\d+$/.test(s)) return { err: 'form' }
    var n = parseInt(s, 10)
    if (n < AMOUNT_MIN || n > AMOUNT_MAX) return { err: 'range' }
    return { v: n }
  }
  // 会員番号の読み取り（§8-2）{ no } か { err: 'empty' | 'form' }。全角は変換しない
  function parseMemberNo (v) {
    var s = String(v == null ? '' : v).trim()
    if (s === '') return { err: 'empty' }
    s = s.toUpperCase()
    if (!/^NM-[0-9]{4}$/.test(s)) return { err: 'form' }
    return { no: parseInt(s.slice(3), 10) }
  }

  // ---------- 状態・保存（§11） ----------
  function initialState () {
    return { members: SEED.map(function (m) { return Object.assign({}, m) }), pending: [], stampLog: [], handLog: [], nextNo: 9 }
  }
  function isInt (v) { return typeof v === 'number' && Math.floor(v) === v && isFinite(v) }
  function isDate (s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
    var p = parts(s)
    if (p[1] < 1 || p[1] > 12 || p[2] < 1 || p[2] > monthDays(p[0], p[1])) return false
    return s <= TODAY
  }
  function validState (d) {
    if (!d || typeof d !== 'object' || d.v !== 1) return false
    if (!Array.isArray(d.members) || d.members.length < 1 || d.members.length > MAX_MEMBERS) return false
    var seen = {}; var maxNo = 0
    for (var i = 0; i < d.members.length; i++) {
      var m = d.members[i]
      if (!m || typeof m !== 'object') return false
      if (!isInt(m.no) || m.no < 1 || m.no > 9999 || seen[m.no]) return false
      if (!isInt(m.stamps) || m.stamps < 0 || m.stamps > 9) return false
      if (!isInt(m.drink) || m.drink < 0 || m.drink > 99 || !isInt(m.bread) || m.bread < 0 || m.bread > 99) return false
      if (!isDate(m.last) || !isDate(m.joined)) return false
      seen[m.no] = m; maxNo = Math.max(maxNo, m.no)
    }
    if (!Array.isArray(d.pending) || !Array.isArray(d.stampLog) || !Array.isArray(d.handLog)) return false
    var pend = {}
    for (i = 0; i < d.pending.length; i++) {
      var p = d.pending[i]
      // no は数の整数だけ（"2" の文字でも seen["2"] に当たって通ってしまうため）
      if (!p || !isInt(p.no) || !seen[p.no] || pend[p.no] || KINDS.indexOf(p.kind) < 0 || seen[p.no][p.kind] < 1) return false
      pend[p.no] = true
    }
    for (i = 0; i < d.stampLog.length; i++) {
      var l = d.stampLog[i]
      if (!l || l.seq !== i + 1 || !isInt(l.no) || !seen[l.no] || !isInt(l.add) || l.add < 1 || l.add > 3) return false
      if (!isInt(l.amount) || l.amount < 1000 || l.amount > AMOUNT_MAX) return false
      if (typeof l.reason !== 'string' || (l.reason !== '' && REASONS.indexOf(l.reason) < 0)) return false
      if (typeof l.undone !== 'boolean' || typeof l.reset !== 'boolean' || (l.gained !== null && KINDS.indexOf(l.gained) < 0)) return false
      if (!l.before || !isInt(l.before.stamps) || l.before.stamps < 0 || l.before.stamps > 9 || !isDate(l.before.last)) return false
    }
    for (i = 0; i < d.handLog.length; i++) {
      var hd = d.handLog[i]
      if (!hd || !isInt(hd.no) || !seen[hd.no] || KINDS.indexOf(hd.kind) < 0) return false
    }
    if (!isInt(d.nextNo) || d.nextNo <= maxNo || d.nextNo > 10000) return false
    return true
  }
  var canSave = (function () {
    try {
      var k = STORE_KEY + '.test'
      window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k)
      return true
    } catch (e) { return false }
  })()
  function loadState () {
    if (!canSave) return null
    try {
      var raw = window.localStorage.getItem(STORE_KEY)
      if (!raw) return null
      var d = JSON.parse(raw)
      if (!validState(d)) return null
      return {
        members: d.members.map(function (m) { return { no: m.no, stamps: m.stamps, drink: m.drink, bread: m.bread, last: m.last, joined: m.joined } }).sort(function (a, b) { return a.no - b.no }),
        pending: d.pending.map(function (p) { return { no: p.no, kind: p.kind } }),
        stampLog: d.stampLog.map(function (l) { return { seq: l.seq, no: l.no, amount: l.amount, add: l.add, before: { stamps: l.before.stamps, last: l.before.last }, gained: l.gained, reset: l.reset, undone: l.undone, reason: l.reason } }),
        handLog: d.handLog.map(function (x) { return { no: x.no, kind: x.kind } }),
        nextNo: d.nextNo
      }
    } catch (e) { return null }
  }
  function saveState () {
    if (!canSave) return
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, members: S.members, pending: S.pending, stampLog: S.stampLog, handLog: S.handLog, nextNo: S.nextNo }))
    } catch (e) { /* 保存に失敗しても画面は止めない */ }
  }
  var S = loadState() || initialState()
  function findMember (no) { return S.members.filter(function (m) { return m.no === no })[0] || null }
  function pendingOf (no) { return S.pending.filter(function (p) { return p.no === no })[0] || null }

  // ---------- 操作（§7-3〜7-8） ----------
  function doStamp (no, amount) {
    var m = findMember(no); var k = countOf(amount)
    if (!m || k < 1) return null
    var r = applyStamp(m, k)
    S.stampLog.push({ seq: S.stampLog.length + 1, no: no, amount: amount, add: k, before: { stamps: m.stamps, last: m.last }, gained: r.gained, reset: r.reset, undone: false, reason: '' })
    m.stamps = r.stamps; m.last = r.last
    if (r.gained) m[r.gained] += 1
    saveState()
    return { r: r, k: k }
  }
  // 直前の1件を取り消せるか { ok, reason }
  function canUndo () {
    var l = S.stampLog[S.stampLog.length - 1]
    if (!l) return { ok: false, reason: 'none' }
    if (l.undone) return { ok: false, reason: 'done' }
    if (l.gained) {
      var m = findMember(l.no); var have = m[l.gained]
      if (have - 1 < 0) return { ok: false, reason: 'handed' }
      var p = pendingOf(l.no)
      if (p && p.kind === l.gained && have - 1 < 1) return { ok: false, reason: 'pending' }
    }
    return { ok: true, reason: '' }
  }
  var UNDO_WHY = {
    none: '今日はまだ押印がありません',
    done: '取り消せるのは直前の1件だけです（2件前は取り消せません）',
    handed: 'この押印でたまった特典はもう渡したため、取り消せません',
    pending: 'この押印でたまった特典が確認待ちのため、取り消せません。先に確認待ちを「取りやめ」にしてください'
  }
  function undoLast (reason) {
    if (!canUndo().ok || REASONS.indexOf(reason) < 0) return null
    var l = S.stampLog[S.stampLog.length - 1]
    var m = findMember(l.no)
    m.stamps = l.before.stamps; m.last = l.before.last
    if (l.gained) m[l.gained] -= 1
    l.undone = true; l.reason = reason
    saveState()
    return l
  }
  function requestGift (no, kind) {
    var m = findMember(no)
    if (!m || pendingOf(no) || m[kind] < 1) return false
    S.pending.push({ no: no, kind: kind })
    saveState()
    return true
  }
  function handGift (no, kind) {
    var i = -1
    S.pending.forEach(function (p, j) { if (p.no === no && p.kind === kind) i = j })
    var m = findMember(no)
    if (i < 0 || !m || m[kind] < 1) return false
    m[kind] -= 1
    S.pending.splice(i, 1)
    S.handLog.push({ no: no, kind: kind })
    saveState()
    return true
  }
  function cancelGift (no) {
    var before = S.pending.length
    S.pending = S.pending.filter(function (p) { return p.no !== no })
    if (S.pending.length !== before) { saveState(); return true }
    return false
  }
  function newMember () {
    // 番号は4けた（NM-9999）まで。10000 以上は表示が NM-0000 になり、保存も通らなくなる
    if (S.members.length >= MAX_MEMBERS || S.nextNo > 9999) return null
    var m = { no: S.nextNo, stamps: 0, drink: 0, bread: 0, last: TODAY, joined: TODAY }
    S.members.push(m); S.nextNo += 1
    saveState()
    return m
  }
  function todaySummary () {
    var live = S.stampLog.filter(function (l) { return !l.undone })
    var add = 0; live.forEach(function (l) { add += l.add })
    var hd = { drink: 0, bread: 0 }; S.handLog.forEach(function (x) { hd[x.kind]++ })
    return {
      stamps: add, visits: live.length, handed: S.handLog.length, handDrink: hd.drink, handBread: hd.bread,
      joined: S.members.filter(function (m) { return m.joined === TODAY }).length,
      members: S.members.length
    }
  }
  // 画面に出す値を状態からまとめて計算する
  function evaluate () {
    var expired = 0; var near = 0
    var rows = S.members.slice().sort(function (a, b) { return a.no - b.no }).map(function (m) {
      var st = statusOf(m)
      if (st === 'expired') expired++
      if (st === 'near') near++
      return { m: m, st: st, eff: effectiveStamps(m), exp: expiryOf(m.last), left: daysLeft(m.last), pend: pendingOf(m.no) }
    })
    return { rows: rows, expired: expired, near: near, sum: todaySummary(), undo: canUndo() }
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
  function icon (name, size, color) {
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('width', String(size)); s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    if (color) s.style.color = color
    var u = document.createElementNS(NS, 'use')
    u.setAttribute('href', '#' + name)
    s.appendChild(u)
    return s
  }
  // 折れてはいけない語（§13）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  var NW_RE = /パンの店 ネリマメ堂|ドリンク1杯|好きなパン1つ|ドリンク\d+|パン\d+|NM-\d{4}|\d{4}年\d{1,2}月\d{1,2}日(?:（.）)?|\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日（.）|\d+〜[\d,]+円|あと\d+[個日]|\d+日過ぎ|×?[\d,]+(?:円|個目|個|つ|人|回|か月|日|件目|件)|有効期限|期限切れ|期限間近|確認待ち|取り消し済み|スタンプカード|スタンプ|会員証|デモ|架空|税込|見本|あんパン/g
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
    // 親が flex の時は、分けた語が別々の箱になって隙間が空くので、1つの span にまとめる
    var par = node.parentNode
    if (/flex/.test(window.getComputedStyle(par).display)) { var box = el('span'); box.appendChild(frag); frag = box }
    par.replaceChild(frag, node)
  }
  function wrapWords (root) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode
        if (!p || p.closest('.nw, svg, option, select, script, style, title, textarea')) return NodeFilter.FILTER_REJECT
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
    expired: ['期限切れ', 'i-stop'], near: ['期限間近', 'i-warn'], wait: ['確認待ち', 'i-clock'],
    handed: ['渡した', 'i-check'], undone: ['取り消し済み', 'i-ban']
  }
  function stateTag (st) {
    var t = el('span', 'state-tag state-tag--' + st)
    t.setAttribute('data-state', st)
    add(t, [icon(TAG[st][1], 14), TAG[st][0]])
    return t
  }
  function arrow () { var a = el('span', 'fc-arrow', '→'); a.setAttribute('aria-label', 'から'); return a }

  // ---------- 知らせ ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  function announce (msg) {
    var sr = $('sr-status')
    sr.textContent = ''
    window.setTimeout(function () { sr.textContent = msg }, 50)
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
  function showDone (id, lines) {
    var box = $(id)
    box.textContent = ''
    var r1 = add(el('p', 'done-box__t'), [icon('i-okc', 20), el('span', null, lines[0])])
    box.appendChild(r1)
    if (lines[1]) box.appendChild(el('p', 'done-box__s', lines[1]))
    wrapWords(box)
    box.hidden = false
  }
  function clearDone () { ['stamp-done', 'wait-done', 'undo-done'].forEach(function (id) { $(id).hidden = true; $(id).textContent = '' }) }
  function setErr (inputId, errId, msg) {
    var e = $(errId)
    if (msg) {
      e.textContent = ''
      add(e, [icon('i-warn', 16), msg])
      wrapWords(e)
      e.hidden = false
      if (inputId) $(inputId).setAttribute('aria-invalid', 'true')
    } else {
      e.hidden = true; e.textContent = ''
      if (inputId) $(inputId).removeAttribute('aria-invalid')
    }
  }

  // ---------- 確認の窓（⑫と同じ） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null
  function confirmBox () {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(true); return }
      dlgOpener = document.activeElement
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
    if (!yes && dlgOpener && document.contains(dlgOpener)) window.setTimeout(function () { dlgOpener.focus() }, 0)
  }
  $('cf-ok').addEventListener('click', function () { closeDlg(true) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(false) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(false) })

  // ---------- 画面の状態（保存しない） ----------
  var ui = { tab: 'guest', guestNo: 2, picked: null, giftMsg: null }

  // ---------- タブ（⑫と同じ動き） ----------
  var TABS = ['guest', 'shop']
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
    if (e.key === 'ArrowRight') j = (i + 1) % 2
    else if (e.key === 'ArrowLeft') j = (i + 1) % 2
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
      openTab(a.getAttribute('data-tab'), { noScroll: true })
      var card = $(a.getAttribute('data-go'))
      var f = a.getAttribute('data-focus')
      goTo(card, f ? $(f) : card.querySelector('[tabindex="-1"]'))
    })
  })

  // ---------- お客様の画面（§6） ----------
  function renderGuestSelect () {
    var sel = $('guest-no')
    sel.textContent = ''
    S.members.slice().sort(function (a, b) { return a.no - b.no }).forEach(function (m) {
      var o = el('option', null, memberNo(m.no)); o.value = String(m.no)
      sel.appendChild(o)
    })
    // 保存に NM-0002 がいない時（形は正しい保存）でも止まらないよう、いちばん若い番号の会員にする
    if (!findMember(ui.guestNo)) ui.guestNo = findMember(2) ? 2 : sel.options[0] ? parseInt(sel.options[0].value, 10) : 2
    sel.value = String(ui.guestNo)
  }
  $('guest-no').addEventListener('change', function () {
    ui.guestNo = parseInt(this.value, 10); ui.giftMsg = null
    renderGuest()
  })
  function renderGuest () {
    var m = findMember(ui.guestNo)
    var st = statusOf(m); var eff = effectiveStamps(m)
    $('mc-no').textContent = memberNo(m.no)
    // マス（§6-3）
    var ol = $('stamps'); ol.textContent = ''
    for (var i = 1; i <= CARD; i++) {
      var on = i <= eff
      var li = el('li', 'stamp'); li.setAttribute('data-on', on ? 'true' : 'false')
      var c = el('span', 'stamp__c'); c.setAttribute('aria-hidden', 'true')
      if (on) add(c, [icon('i-bread', 16), el('span', 'stamp__n', String(i))])
      else {
        if (i === 5) c.appendChild(icon('i-cup', 14))
        if (i === 10) c.appendChild(icon('i-bread', 14))
        c.appendChild(el('span', 'stamp__n', String(i)))
      }
      li.appendChild(c)
      li.appendChild(el('span', 'visually-hidden', i + '個目 ' + (on ? '押してあります' : 'まだです')))
      ol.appendChild(li)
    }
    ol.setAttribute('aria-label', 'スタンプカード 10個中 ' + eff + '個')
    // 3つの数
    var nextKind = eff < GIFTS.drink.at ? 'drink' : 'bread'
    $('num-now').textContent = String(eff)
    // 「好きなパン1つ／まで」の位置でだけ折れるように、名前と「まで」を別の塊にする
    var nl = $('num-next-l'); nl.textContent = ''
    add(nl, [el('span', 'nw', GIFTS[nextKind].name), document.createElement('wbr'), el('span', 'nw', 'まで')])
    $('num-next').textContent = String(GIFTS[nextKind].at - eff)
    $('num-gift').textContent = String(m.drink + m.bread)
    // 有効期限
    var ex = $('expiry'); ex.textContent = ''
    ex.className = 'expiry' + (st === 'near' ? ' expiry--near' : st === 'expired' ? ' expiry--expired' : '')
    var exp = expiryOf(m.last)
    if (st === 'ok') {
      add(ex, [add(el('p', 'expiry__t'), [icon('i-cal', 18), el('span', null, '有効期限 ' + dateLong(exp) + 'まで')]),
        el('p', 'expiry__s', '最後の来店 ' + dateLong(m.last) + 'から6か月')])
    } else if (st === 'near') {
      add(ex, [stateTag('near'), el('p', 'expiry__t', '有効期限 ' + dateLong(exp) + 'まで（あと' + daysLeft(m.last) + '日）'),
        el('p', 'expiry__s', '期限が近づいています。来店してスタンプを押すと、期限が6か月延びます。')])
    } else {
      add(ex, [stateTag('expired'), el('p', 'expiry__t', 'スタンプの期限が切れています（' + dateLong(exp) + 'まで）'),
        el('p', 'expiry__s', '前のスタンプ ' + m.stamps + '個は使えません。次の来店で、1個目から数え直します。ためた特典は使えます。')])
    }
    // ためた特典（§6-4）
    var ul = $('gifts'); ul.textContent = ''
    var pend = pendingOf(m.no)
    var lastHand = null
    S.handLog.forEach(function (x) { if (x.no === m.no) lastHand = x })
    KINDS.forEach(function (kind) {
      var g = GIFTS[kind]
      var li = el('li', 'gift'); li.setAttribute('data-kind', kind)
      var r1 = el('div', 'gift__r1')
      var ic = el('span', 'gift__icon'); ic.appendChild(icon(g.icon, 22))
      add(r1, [ic, add(el('p', 'gift__name'), [el('strong', null, g.name), el('span', 'gift__cond', '（' + g.at + '個で1つ）')]), el('span', 'gift__n nw', '×' + gifts(m[kind]))])
      li.appendChild(r1)
      if (pend && pend.kind === kind) {
        var wb = el('div', 'wait-box'); wb.setAttribute('role', 'status')
        add(wb, [add(el('p', 'wait-box__t'), [stateTag('wait'), el('span', null, g.name + ' を使います')]),
          el('p', 'wait-box__s', 'この画面をお店の人に見せてください。お店が「渡した」を押すと、特典が1つ減ります。')])
        var cb = el('button', 'confirm__cancel wait-box__cancel', '取りやめる'); cb.type = 'button'; cb.id = 'wait-cancel'
        cb.addEventListener('click', function () {
          cancelGift(m.no); ui.giftMsg = null
          renderAll(); announce('特典の使用を取りやめました')
          $('use-' + kind).focus()
        })
        wb.appendChild(cb)
        li.appendChild(wb)
      } else {
        var b = el('button', 'btn-main gift__use'); b.type = 'button'; b.id = 'use-' + kind
        add(b, [icon('i-gift', 20), 'この特典を使う'])
        b.setAttribute('aria-label', g.name + ' を使う')
        var can = m[kind] >= 1 && !pend
        if (!can) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', 'gmsg-' + kind) }
        b.addEventListener('click', function () {
          if (b.getAttribute('aria-disabled') === 'true') {
            ui.giftMsg = kind
            var p = $('gmsg-' + kind); p.hidden = false
            announce(p.textContent)
            return
          }
          if (!requestGift(m.no, kind)) return
          ui.giftMsg = null
          renderAll()
          announce(g.name + ' を使います。お店の確認待ちです')
          $('wait-cancel').focus()
        })
        li.appendChild(b)
        var msg = el('p', 'gift__msg', pend ? 'お店の確認待ちの特典があります。渡し終わってから使えます' : '使える特典がありません')
        msg.id = 'gmsg-' + kind
        msg.hidden = can || (!pend && ui.giftMsg !== kind)
        li.appendChild(msg)
      }
      if (lastHand && lastHand.kind === kind) {
        li.appendChild(add(el('p', 'gift__handed'), [icon('i-okc', 16), '渡しました（' + dateLong(TODAY) + '）']))
      }
      ul.appendChild(li)
    })
    // お店に見せるコード（§6-5・§14-3）
    renderCode(m.no)
    $('code-no').textContent = memberNo(m.no)
    wrapWords($('panel-guest'))
  }
  function renderCode (n) {
    var box = $('code'); box.textContent = ''
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('viewBox', '0 0 25 25'); s.setAttribute('shape-rendering', 'crispEdges')
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'お店に見せるコードの見本（' + memberNo(n) + '。読み取れません）')
    function rect (x, y, w, h, fill) {
      var r = document.createElementNS(NS, 'rect')
      r.setAttribute('x', String(x)); r.setAttribute('y', String(y)); r.setAttribute('width', String(w)); r.setAttribute('height', String(h))
      r.setAttribute('fill', fill); s.appendChild(r)
    }
    rect(0, 0, 25, 25, '#FFFFFF')
    function inFinder (r, c) { return (r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8) }
    function finderBlack (r, c) {
      var r0 = r < 8 ? 0 : 14; var c0 = c < 8 ? 0 : 14
      var y = r - r0; var x = c - c0
      if (y < 0 || y > 6 || x < 0 || x > 6) return false // 区切りの白
      if (y === 0 || y === 6 || x === 0 || x === 6) return true
      if (y === 1 || y === 5 || x === 1 || x === 5) return false
      return true
    }
    for (var r = 0; r < 21; r++) {
      for (var c = 0; c < 21; c++) {
        var black = inFinder(r, c) ? finderBlack(r, c) : ((r * 21 + c) * 37 + n * 101 + r * c) % 7 < 3
        if (r >= 8 && r <= 12 && c >= 8 && c <= 12) black = false
        if (black) rect(c + 2, r + 2, 1, 1, '#2E2219')
      }
    }
    var u = document.createElementNS(NS, 'use')
    u.setAttribute('href', '#i-bread'); u.setAttribute('x', '11'); u.setAttribute('y', '11'); u.setAttribute('width', '3'); u.setAttribute('height', '3')
    u.setAttribute('style', 'color:#5A3418'); u.setAttribute('shape-rendering', 'geometricPrecision')
    s.appendChild(u)
    box.appendChild(s)
  }

  // ---------- お店の画面（§8） ----------
  // ① 会員を選ぶ
  function pickMember (no, opt) {
    ui.picked = no
    setErr('shop-no', 'shop-no-err', '')
    var m = findMember(no)
    renderShop()
    announce(memberNo(no) + ' を選びました。今のスタンプ ' + effectiveStamps(m) + '個')
    if (!(opt && opt.noFocus)) $('shop-amount').focus()
  }
  function lookup () {
    clearDone()
    var r = parseMemberNo($('shop-no').value)
    var msg = null
    if (r.err === 'empty') msg = '会員番号を入れてください（例 NM-0001）'
    else if (r.err === 'form') msg = '会員番号は半角の「NM-」と数字4けたで入れてください（例 NM-0001）'
    else if (!findMember(r.no)) msg = 'その会員番号は見つかりません。番号を確かめるか、下の会員一覧から選んでください'
    if (msg) {
      ui.picked = null
      renderShop()
      setErr('shop-no', 'shop-no-err', msg)
      $('shop-no').focus()
      return false
    }
    $('shop-no').value = memberNo(r.no)
    pickMember(r.no)
    return true
  }
  $('no-form').addEventListener('submit', function (e) { e.preventDefault(); lookup() })
  $('shop-no').addEventListener('input', function () {
    clearDone()
    if (ui.picked !== null) { ui.picked = null; renderShop() }
  })
  $('new-btn').addEventListener('click', function () {
    clearDone()
    var m = newMember()
    if (!m) { setErr(null, 'new-err', 'デモでは会員は50人までです'); return }
    setErr(null, 'new-err', '')
    $('shop-no').value = memberNo(m.no)
    renderAll()
    pickMember(m.no, { noFocus: true })
    showToast('新しい会員 ' + memberNo(m.no) + ' を作りました（お名前・電話番号は聞きません）')
    $('shop-amount').focus()
  })
  function giftList (m) {
    var a = []
    KINDS.forEach(function (k) { if (m[k] > 0) a.push(GIFTS[k].name + (m[k] > 1 ? ' ×' + m[k] : '')) })
    return a.length ? '（' + a.join('・') + '）' : ''
  }
  function renderPicked () {
    var box = $('picked'); box.textContent = ''
    var m = ui.picked !== null ? findMember(ui.picked) : null
    box.classList.toggle('is-empty', !m)
    if (!m) { box.appendChild(el('p', 'picked__none', '会員を選んでください')); return }
    var st = statusOf(m); var pend = pendingOf(m.no)
    var r1 = el('p', 'picked__r1')
    add(r1, [el('span', 'picked__no nw', memberNo(m.no)), st !== 'ok' ? stateTag(st) : null, pend ? stateTag('wait') : null])
    box.appendChild(r1)
    box.appendChild(el('p', 'picked__r2', '今のスタンプ ' + effectiveStamps(m) + '個・ためた特典 ' + (m.drink + m.bread) + 'つ' + giftList(m)))
    box.appendChild(el('p', 'picked__r3', '最後の来店 ' + dateShort(m.last) + '（有効期限 ' + dateShort(expiryOf(m.last)) + '）'))
    if (st === 'expired') box.appendChild(el('p', 'picked__warn', '期限切れのため、前のスタンプ ' + m.stamps + '個は消えています。今回の分から数え直します'))
    if (pend) {
      var p = el('p', 'picked__warn', 'この会員に確認待ちの特典があります（' + GIFTS[pend.kind].name + '）')
      var a = el('a', 'text-link picked__link', '確認待ちへ'); a.href = '#wait-card'
      a.addEventListener('click', function (e) { e.preventDefault(); goTo($('wait-card'), $('h-wait')) })
      box.appendChild(p); box.appendChild(a)
    }
  }
  // ② 金額と個数
  var liveTimer = null
  function amountState () {
    var r = parseAmount($('shop-amount').value)
    var m = ui.picked !== null ? findMember(ui.picked) : null
    return { r: r, k: r.err ? null : countOf(r.v), m: m }
  }
  function renderCount (fromInput) {
    var a = amountState()
    var n = $('count-n'); var u = $('count-u'); var note = $('count-note'); var fc = $('forecast')
    note.hidden = true; note.textContent = ''; fc.hidden = true; fc.textContent = ''
    if (a.r.err) { n.textContent = '—'; u.hidden = true } else { n.textContent = String(a.k); u.hidden = false }
    if (fromInput !== false) {
      if (a.r.err === 'form') setErr('shop-amount', 'amount-err', '購入金額は数字（1〜100,000円の整数）で入れてください')
      else if (a.r.err === 'range') setErr('shop-amount', 'amount-err', '購入金額は 1〜100,000円の範囲で入れてください')
      else setErr('shop-amount', 'amount-err', '')
    }
    if (!a.r.err && a.k === 0) { note.textContent = '1,000円未満のため、スタンプは押せません（1,000円ごとに1個）'; note.className = 'count-box__note is-strong'; note.hidden = false }
    if (!a.r.err && a.r.v >= 4000) { note.textContent = '1回のお会計で3個までです'; note.className = 'count-box__note'; note.hidden = false }
    if (a.m && a.k >= 1) {
      var r = applyStamp(a.m, a.k)
      var tail = ''
      if (r.gained === 'bread') tail = r.stamps > 0 ? '（10個で好きなパン1つが1つ増え、余りの' + r.stamps + '個は次のカードへ）' : '（10個で好きなパン1つが1つ増え、カードが新しくなります）'
      else if (r.gained === 'drink') tail = '（5個目でドリンク1杯が1つ増えます）'
      else if (r.reset && a.m.stamps > 0) tail = '（期限切れのため、前の' + a.m.stamps + '個は数えません）'
      add(fc, ['押した後：', el('span', 'nw', pcs(r.s0)), ' ', arrow(), ' ', el('span', 'nw', pcs(r.stamps)), tail])
      fc.hidden = false
    }
    wrapWords($('count-box'))
    var can = !!a.m && a.k >= 1
    var b = $('stamp-btn')
    $('stamp-btn-t').textContent = can ? 'スタンプを' + a.k + '個押す' : 'スタンプを押す'
    wrapWords($('stamp-btn-t'))
    if (can) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true')
    if (can) setErr(null, 'stamp-err', '')
    // 読み上げは 500ms 待ってから（§15-1 7）
    window.clearTimeout(liveTimer)
    liveTimer = window.setTimeout(function () {
      $('count-live').textContent = a.r.err ? '' : '押す個数 ' + a.k + '個。' + (fc.hidden ? '' : fc.textContent.replace('→', 'から'))
    }, 500)
  }
  $('shop-amount').addEventListener('input', function () { clearDone(); setErr(null, 'stamp-err', ''); renderCount() })
  $('stamp-btn').addEventListener('click', function () {
    clearDone()
    var a = amountState()
    if (!a.m) { setErr(null, 'stamp-err', '会員を選んでください'); $('shop-no').focus(); return }
    if (a.r.err) {
      var msg = a.r.err === 'empty' ? '購入金額を入れてください' : a.r.err === 'form' ? '購入金額は数字（1〜100,000円の整数）で入れてください' : '購入金額は 1〜100,000円の範囲で入れてください'
      setErr('shop-amount', 'amount-err', msg)
      setErr(null, 'stamp-err', msg)
      $('shop-amount').focus()
      return
    }
    if (a.k < 1) { setErr(null, 'stamp-err', '1,000円未満のため、スタンプは押せません'); return }
    var before = a.m.stamps
    var res = doStamp(a.m.no, a.r.v)
    if (!res) return
    var r = res.r
    var l2 = ''
    if (r.gained === 'bread') l2 = r.stamps > 0 ? '10個たまり、好きなパン1つが1つ増えました。余りの' + r.stamps + '個は次のカードに入りました。' : '10個たまり、好きなパン1つが1つ増えました。カードが新しくなりました。'
    else if (r.gained === 'drink') l2 = '5個目で、ドリンク1杯が1つ増えました。'
    else if (r.reset && before > 0) l2 = '期限切れのため、前の' + before + '個は数えず、1個目から数え直しました。'
    var l1 = memberNo(a.m.no) + ' にスタンプを' + res.k + '個押しました（' + yen(a.r.v) + '）'
    $('shop-amount').value = ''
    setErr('shop-amount', 'amount-err', '')
    renderAll()
    showDone('stamp-done', [l1, l2])
    announce(l1 + (l2 ? '。' + l2 : ''))
    $('shop-amount').focus()
  })
  // 特典の確認待ち（§8-4）
  function renderWait () {
    var ul = $('wait-list'); ul.textContent = ''
    $('wait-count').textContent = S.pending.length + '件'
    $('wait-none').hidden = S.pending.length > 0
    S.pending.forEach(function (p) {
      var g = GIFTS[p.kind]; var no = memberNo(p.no)
      var li = el('li', 'wait-row'); li.setAttribute('data-no', String(p.no))
      add(li, [add(el('p', 'wait-row__r1'), [stateTag('wait'), el('span', 'wait-row__no nw', no), add(el('span', 'wait-row__gift'), [icon(g.icon, 20), g.name])])])
      var ops = el('div', 'wait-row__ops')
      var hb = el('button', 'btn-sub wait-row__hand'); hb.type = 'button'; hb.id = 'hand-' + p.no
      add(hb, [icon('i-check', 18), '渡した'])
      hb.setAttribute('aria-label', no + ' に ' + g.name + ' を渡した')
      hb.addEventListener('click', function () { onHand(p.no, p.kind) })
      var cb = el('button', 'confirm__cancel wait-row__cancel', '取りやめ'); cb.type = 'button'; cb.id = 'wcancel-' + p.no
      cb.setAttribute('aria-label', no + ' の ' + g.name + ' の確認待ちを取りやめ')
      cb.addEventListener('click', function () {
        clearDone()
        if (!cancelGift(p.no)) return
        renderAll()
        announce(no + ' の ' + g.name + ' の確認待ちを取りやめました')
        var nx = document.querySelector('#wait-list .wait-row__hand'); (nx || $('h-wait')).focus()
      })
      ops.appendChild(hb); ops.appendChild(cb)
      li.appendChild(ops)
      ul.appendChild(li)
    })
  }
  function onHand (no, kind) {
    var idx = -1
    S.pending.forEach(function (p, j) { if (p.no === no && p.kind === kind) idx = j })
    if (!handGift(no, kind)) return
    clearDone()
    var msg = memberNo(no) + ' に' + GIFTS[kind].name + 'を渡しました'
    renderAll()
    showDone('wait-done', [msg])
    announce(msg)
    var rows = document.querySelectorAll('#wait-list .wait-row__hand')
    var nx = rows[idx] || rows[rows.length - 1]
    ;(nx || $('h-wait')).focus()
  }
  // 押し間違いの取り消し（§8-5）
  function renderUndo (E) {
    var box = $('undo-last'); box.textContent = ''
    var l = S.stampLog[S.stampLog.length - 1]
    if (l) {
      var p = add(el('p', 'undo__line'), ['直前の押印：今日' + l.seq + '件目　' + memberNo(l.no) + '・' + l.add + '個（' + yen(l.amount) + '）'])
      if (l.undone) { p.appendChild(document.createTextNode(' ')); p.appendChild(stateTag('undone')) }
      box.appendChild(p)
      if (l.gained && !l.undone) box.appendChild(el('p', 'sub undo__gain', 'この押印で' + GIFTS[l.gained].name + 'が1つ増えています（取り消すと減ります）'))
    }
    var b = $('undo-btn')
    if (E.undo.ok) { b.removeAttribute('aria-disabled'); $('undo-why').textContent = '取り消せるのは直前の1件だけです'; $('undo-why').className = 'sub sub--13 undo__why' } else {
      b.setAttribute('aria-disabled', 'true')
      $('undo-why').textContent = UNDO_WHY[E.undo.reason]
      $('undo-why').className = 'undo__why is-strong'
    }
    // 今日の押印（新しい順）
    var ol = $('stamp-log'); ol.textContent = ''
    $('stamp-log-none').hidden = S.stampLog.length > 0
    ol.hidden = S.stampLog.length === 0
    S.stampLog.slice().reverse().forEach(function (x) {
      var li = el('li', 'stamp-log__row' + (x.undone ? ' is-undone' : ''))
      li.setAttribute('value', String(x.seq))
      add(li, [el('span', 'stamp-log__t', x.seq + '件目　' + memberNo(x.no) + '　' + x.add + '個　' + yen(x.amount))])
      if (x.undone) { li.appendChild(stateTag('undone')); li.appendChild(el('span', 'stamp-log__reason', x.reason)) }
      ol.appendChild(li)
    })
  }
  $('undo-reason').addEventListener('change', function () { if (this.value) setErr('undo-reason', 'undo-reason-err', '') })
  $('undo-btn').addEventListener('click', function () {
    var u = canUndo()
    if (!u.ok) { announce(UNDO_WHY[u.reason]); return }
    var reason = $('undo-reason').value
    if (!reason) {
      setErr('undo-reason', 'undo-reason-err', '取り消す理由を選んでください')
      $('undo-reason').focus()
      return
    }
    clearDone()
    var l = undoLast(reason)
    if (!l) return
    $('undo-reason').value = ''
    setErr('undo-reason', 'undo-reason-err', '')
    var msg = memberNo(l.no) + ' の押印（' + l.add + '個）を取り消しました（理由：' + reason + '）'
    renderAll()
    showDone('undo-done', [msg])
    announce(msg)
  })
  // 上の数字・会員一覧（§8-6・§8-7）
  function renderSummary (E) {
    var s = E.sum
    $('sum-stamp-n').textContent = String(s.stamps); $('sum-stamp-note').textContent = s.visits + '回'
    $('sum-gift-n').textContent = String(s.handed); $('sum-gift-note').textContent = 'ドリンク' + s.handDrink + '・パン' + s.handBread
    $('sum-new-n').textContent = String(s.joined); $('sum-new-note').textContent = '会員 ' + s.members + '人'
  }
  function selectBtn (no) {
    var b = el('button', 'btn-sub btn-sm', '選ぶ'); b.type = 'button'
    b.setAttribute('aria-label', memberNo(no) + ' を選ぶ'); b.setAttribute('data-pick', String(no))
    b.addEventListener('click', function () {
      clearDone()
      $('shop-no').value = memberNo(no)
      pickMember(no, { noFocus: true })
      goTo($('stamp-card'), $('shop-amount'))
    })
    return b
  }
  function renderMembers (E) {
    $('h-members').textContent = '会員一覧（' + E.rows.length + '人）'
    $('member-flags').textContent = E.expired || E.near ? '期限切れ ' + E.expired + '人・期限間近 ' + E.near + '人' : '期限切れ・期限間近の会員はいません'
    var tb = $('member-tbody'); tb.textContent = ''
    var ul = $('member-rows'); ul.textContent = ''
    E.rows.forEach(function (x) {
      var m = x.m; var no = memberNo(m.no)
      var tr = el('tr', x.st === 'expired' ? 'is-expired' : x.st === 'near' ? 'is-near' : '')
      tr.setAttribute('data-no', String(m.no))
      var th = el('th', 'member-list__no nw', no); th.setAttribute('scope', 'row')
      var tdS = el('td', 'member-list__st'); tdS.appendChild(el('span', 'member-list__big', pcs(x.eff)))
      if (x.st === 'expired') tdS.appendChild(el('span', 'member-list__sub', '前の' + m.stamps + '個は期限切れ'))
      var tdG = el('td'); add(tdG, [el('span', 'member-list__big', gifts(m.drink + m.bread)), el('span', 'member-list__sub', 'ドリンク' + m.drink + '・パン' + m.bread)])
      var tdL = el('td', 'nw', dateShort(m.last))
      var tdE = el('td'); tdE.appendChild(el('span', 'member-list__date', dateShort(x.exp)))
      if (x.st !== 'ok') tdE.appendChild(stateTag(x.st))
      if (x.st === 'near') tdE.appendChild(el('span', 'member-list__sub', 'あと' + x.left + '日'))
      var tdW = el('td')
      if (x.pend) tdW.appendChild(stateTag('wait')); else { var dash = el('span', null, '—'); dash.setAttribute('aria-hidden', 'true'); tdW.appendChild(dash); tdW.appendChild(el('span', 'visually-hidden', 'なし')) }
      var tdO = el('td', 'op'); tdO.appendChild(selectBtn(m.no))
      add(tr, [th, tdS, tdG, tdL, tdE, tdW, tdO])
      tb.appendChild(tr)
      // スマホのカード
      var li = el('li', 'member-row' + (x.st === 'expired' ? ' is-expired' : x.st === 'near' ? ' is-near' : ''))
      li.setAttribute('data-no', String(m.no))
      var r1 = el('div', 'member-row__r1')
      add(r1, [add(el('p', 'member-row__id'), [el('span', 'member-row__no nw', no), x.st !== 'ok' ? stateTag(x.st) : null, x.pend ? stateTag('wait') : null]), selectBtn(m.no)])
      li.appendChild(r1)
      li.appendChild(el('p', 'member-row__r2', 'スタンプ ' + pcs(x.eff) + '・特典 ' + gifts(m.drink + m.bread) + (x.st === 'expired' ? '（前の' + m.stamps + '個は期限切れ）' : '')))
      li.appendChild(el('p', 'member-row__r3', '最後の来店 ' + dateShort(m.last) + '・期限 ' + dateShort(x.exp) + (x.st === 'near' ? '（あと' + x.left + '日）' : '')))
      ul.appendChild(li)
    })
  }
  function renderTabs () {
    var n = S.pending.length
    var badge = $('tab-shop-badge')
    badge.hidden = n === 0
    badge.textContent = n ? '確認待ち ' + n : ''
    if (n) $('tab-shop').setAttribute('aria-label', 'お店の画面（押印）（特典の確認待ち ' + n + '件）'); else $('tab-shop').removeAttribute('aria-label')
  }
  function renderShop () {
    var E = evaluate()
    renderSummary(E)
    renderPicked()
    renderCount(false)
    renderWait()
    renderUndo(E)
    renderMembers(E)
    renderTabs()
    wrapWords($('panel-shop'))
    return E
  }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    renderGuestSelect()
    renderGuest()
    renderShop()
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus()
  }

  // ---------- 最初の状態に戻す（§11-4） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox().then(function (yes) {
      if (!yes) return
      S = initialState()
      saveState()
      ui = { tab: 'guest', guestNo: 2, picked: null, giftMsg: null }
      $('shop-no').value = ''; $('shop-amount').value = ''; $('undo-reason').value = ''
      ;['shop-no', 'shop-amount', 'undo-reason'].forEach(function (id) { $(id).removeAttribute('aria-invalid') })
      ;['shop-no-err', 'amount-err', 'stamp-err', 'undo-reason-err', 'new-err'].forEach(function (id) { $(id).hidden = true; $(id).textContent = '' })
      clearDone()
      renderAll()
      openTab('guest')
      $('tab-guest').focus()
      showToast('最初の状態に戻しました')
    })
  })

  // ---------- はじめ ----------
  $('note-nosave').hidden = canSave
  wrapWords(document.body)
  renderAll()
  var hash = (window.location.hash || '').slice(1)
  openTab(hash === 'shop' ? 'shop' : 'guest', { noScroll: true })

  // 検査用（純粋な関数だけ。状態は出さない）
  window.__demo14 = { countOf: countOf, expiryOf: expiryOf, daysLeft: daysLeft, statusOf: statusOf, applyStamp: applyStamp }
})()
