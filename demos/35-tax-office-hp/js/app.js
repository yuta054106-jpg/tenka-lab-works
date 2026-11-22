// ソラツム会計事務所（デモ・架空の事務所）小さな会計事務所のホームページ
// 外部通信なし・保存なし（URL のハッシュも使わない）。操作は選ぶボタン（radio）と開閉だけ。文字を入れる欄なし
// 表示はすべて createElement・textContent・replaceChildren
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}
  function fz (o) { return Object.freeze(o) }

  // ---------- 料金表（すべて架空・税込・整数の円） ----------
  var FORMS = fz([
    fz({ id: 'kojin', name: '個人事業' }),
    fz({ id: 'hojin', name: '法人' })
  ])
  var SALES = fz([
    fz({ id: 's1', name: '1,000万円未満' }),
    fz({ id: 's2', name: '1,000万〜3,000万円' }),
    fz({ id: 's3', name: '3,000万〜1億円' })
  ])
  var BOOKS = fz([
    fz({ id: 'self', name: 'ご自分で', desc: 'クラウド会計に入力・記帳代行料 0円', fee: 0 }),
    fz({ id: 'few', name: '事務所に任せる（少ない）', desc: '月の取引〜100件・月10,000円', fee: 10000 }),
    fz({ id: 'many', name: '事務所に任せる（多い）', desc: '月の取引〜300件・月20,000円', fee: 20000 })
  ])
  var MEETINGS = fz([
    fz({ id: 'monthly', name: '毎月', add: 5000 }),
    fz({ id: 'quarterly', name: '3か月ごと', add: 0 })
  ])
  // 顧問料の基本（月）＝面談が 3か月ごとの時の顧問料
  var ADVISORY_BASE = fz({
    kojin: fz({ s1: 10000, s2: 15000, s3: 25000 }),
    hojin: fz({ s1: 20000, s2: 25000, s3: 35000 })
  })
  // 決算と申告（年1回）
  var CLOSING = fz({
    kojin: fz({ s1: 60000, s2: 80000, s3: 100000 }),
    hojin: fz({ s1: 150000, s2: 180000, s3: 220000 })
  })
  var MONTHS = 12

  // ---------- 純粋な関数（整数だけ） ----------
  function find (list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]
    return null
  }
  function calc (formId, salesId, booksId, meetingId) {
    var f = find(FORMS, formId)
    var s = find(SALES, salesId)
    var b = find(BOOKS, booksId)
    var m = find(MEETINGS, meetingId)
    var base = ADVISORY_BASE[formId][salesId]
    var add = m.add
    var advisory = base + add
    var books = b.fee
    var closing = CLOSING[formId][salesId]
    var monthly = advisory + books
    return fz({
      formName: f.name, salesName: s.name, booksName: b.name, meetingName: m.name,
      base: base, add: add, advisory: advisory, books: books, closing: closing, monthly: monthly,
      annual: monthly * MONTHS + closing
    })
  }
  // 3けた区切りは自前（0 以上の整数）
  function fmtYen (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) {
      out = ',' + s.slice(s.length - 3) + out
      s = s.slice(0, s.length - 3)
    }
    return s + out + '円'
  }
  function fmtAdd (n) { return '＋' + fmtYen(n) }
  function fmtPerMonth (s) { return s + '／月' }
  function srSummary (c) {
    return c.formName + '、売上' + c.salesName + '、記帳' + c.booksName + '、面談' + c.meetingName + '。年間の合計の目安は' + fmtYen(c.annual) + 'です。'
  }

  // 検査用の出口（凍結した定数と純粋な関数だけ）
  root.__demo35 = fz({
    FORMS: FORMS, SALES: SALES, BOOKS: BOOKS, MEETINGS: MEETINGS, ADVISORY_BASE: ADVISORY_BASE, CLOSING: CLOSING, MONTHS: MONTHS,
    calc: calc, fmtYen: fmtYen, fmtAdd: fmtAdd, fmtPerMonth: fmtPerMonth, srSummary: srSummary
  })
  if (typeof document === 'undefined') return

  // ---------- 画面 ----------
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function nw (text) { return el('span', 'nw', text) }
  function all (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)) }
  var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態（画面の中だけ。保存しない） ----------
  var KEYS = fz(['form', 'sales', 'books', 'meeting'])
  var INIT = fz({ form: 'kojin', sales: 's2', books: 'self', meeting: 'monthly' })
  var state = { form: INIT.form, sales: INIT.sales, books: INIT.books, meeting: INIT.meeting }
  function now () { return calc(state.form, state.sales, state.books, state.meeting) }

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
    var h = $(id)
    if (!h) return
    h.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
  }

  // ---------- 料金の目安 ----------
  function readState () {
    KEYS.forEach(function (k) {
      var c = document.querySelector('input[name="' + k + '"]:checked')
      if (c) state[k] = c.value
    })
  }
  // 要約：個人事業・売上 1,000万〜3,000万円・記帳 ご自分で・面談 毎月
  function sumLine (c) {
    return [nw(c.formName), '・', nw('売上 ' + c.salesName), '・', nw('記帳 ' + c.booksName), '・', nw('面談 ' + c.meetingName)]
  }
  function row (dtParts, ddText) {
    var d = el('div')
    var dt = el('dt')
    dt.replaceChildren.apply(dt, dtParts)
    d.appendChild(dt)
    d.appendChild(el('dd', 'nw', ddText))
    return d
  }
  function render () {
    var c = now()
    var t = fmtYen(c.annual)
    $('r-annual').replaceChildren(t.slice(0, t.length - 1), el('span', 'result__yen', '円'))
    $('r-advisory').textContent = fmtYen(c.advisory)
    $('r-books').textContent = fmtYen(c.books)
    $('r-closing').textContent = fmtYen(c.closing)
    var sub = el('span', 'result__sub')
    sub.replaceChildren(c.formName + '・売上 ', nw(c.salesName))
    $('r-rows').replaceChildren(
      row(['顧問料の基本', sub], fmtPerMonth(fmtYen(c.base))),
      row(['面談の回数：', nw(c.meetingName)], fmtPerMonth(fmtAdd(c.add))),
      row(['記帳の代行：', nw(c.booksName)], fmtPerMonth(fmtAdd(c.books))),
      row(['決算と申告', nw('（年1回）')], fmtYen(c.closing))
    )
    $('r-calc').replaceChildren('年間の合計＝（', nw(fmtYen(c.advisory)), '＋', nw(fmtYen(c.books)), '）', nw('×12か月'), '＋', nw(fmtYen(c.closing)), '＝', nw(t))
    $('ct-sum').replaceChildren.apply($('ct-sum'), sumLine(c))
    $('ct-annual').textContent = t
    return c
  }
  function onChange () {
    readState()
    var c = render()
    say(srSummary(c))
  }

  // ---------- お問い合わせの案内（dialog） ----------
  var lastTrigger = null
  function openDialog (e) {
    var d = $('ask-dialog')
    lastTrigger = e.currentTarget
    var c = now()
    $('dlg-sum').replaceChildren.apply($('dlg-sum'), sumLine(c))
    $('dlg-annual').textContent = fmtYen(c.annual)
    if (typeof d.showModal === 'function') d.showModal()
    else d.setAttribute('open', '')
    $('dlg-title').focus()
  }
  function closeDialog () {
    var d = $('ask-dialog')
    if (typeof d.close === 'function' && d.open) d.close()
    else { d.removeAttribute('open'); afterClose() }
  }
  function afterClose () {
    var t = lastTrigger
    lastTrigger = null
    if (t) t.focus()
  }

  function init () {
    // 再読み込みでブラウザが前の選択を戻すことがあるので、最初の値に入れ直す
    all('.opt__input').forEach(function (i) { i.checked = i.value === INIT[i.name] })
    readState()
    render()
    all('.opt__input').forEach(function (i) { i.addEventListener('change', onChange) })
    ;['est-cta', 'ask-cta'].forEach(function (id) { $(id).addEventListener('click', openDialog) })
    var d = $('ask-dialog')
    $('dlg-close').addEventListener('click', closeDialog)
    d.addEventListener('close', afterClose)
    // 幕（dialog の外側）を押した時だけ閉じる
    // （dialog の内側の余白を押した時も target は dialog になるので、押した位置が箱の外かも見る）
    d.addEventListener('click', function (e) {
      if (e.target !== d) return
      var b = d.getBoundingClientRect()
      var out = e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom
      if (out) closeDialog()
    })
    $('hero-cta').addEventListener('click', function () { goTo('h-price') })
    all('a[data-goto]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); goTo(a.getAttribute('data-goto')) })
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
