// パン工房 コムギトキ（デモ・架空のお店）売上をスマホで見る
// スマホの画面（view.js）は、お店の Google の中で動く形と同じもの。ここではシートの代わりに見本の表から集計して渡す
// 外部通信なし・保存なし。表示は createElement・textContent・replaceChildren。日付は止めている（今日は定数 TODAY）
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}
  var C = root.Calc38 || (typeof Calc38 !== 'undefined' ? Calc38 : null)
  function fz (o) { return Object.freeze(o) }

  // ---------- 固定データ（すべて架空） ----------
  var TODAY = '2026-11-22'
  var READ_AT = '11月22日（日）21:30'
  var SHOP = 'コムギトキ'
  var CLOSED_WEEKDAYS = fz([1])
  var MONTHS_BACK = 2
  var NOTE = '作品例（架空のお店）。数字はすべて架空です。入力した内容はどこにも送られず、保存もされません。'
  // 日ごとの [売上, 客数, メモ]（売上は円・税込。null は空欄＝休み）
  var OCT = [
    [59200, 51], [65500, 55], [79800, 66], [77100, 64], [null, null], [57400, 49], [55100, 47],
    [60300, 51], [66800, 56], [81200, 67], [78500, 65], [null, null], [56600, 48], [53900, 46],
    [58700, 50], [67200, 56], [82400, 68], [79300, 66], [null, null], [58100, 49], [54800, 47],
    [60900, 52], [68400, 57], [83600, 69], [80200, 66], [null, null], [59300, 50], [56200, 48],
    [61500, 52], [69700, 58], [85800, 71, 'ハロウィンの焼き菓子']
  ]
  var NOV = [
    [81600, 66], [null, null], [66200, 56, '祝日も営業'], [58900, 50], [61300, 52], [68800, 57], [86400, 70],
    [83100, 68], [null, null], [59700, 51], [57200, 49], [62500, 53], [71400, 59], [79900, 65, '雨'],
    [84600, 69], [null, null], [60800, 52], [56300, 48], [63900, 54], [72100, 60], [90200, 74, '新しい食パンの初日'],
    [85700, 70]
  ]
  function rowsOf () {
    var out = []
    function push (row, date, v) {
      out.push(fz({ row: row, date: date, sales: v && v[0] !== null ? String(v[0]) : '', customers: v && v[1] !== null ? String(v[1]) : '', memo: (v && v[2]) || '' }))
    }
    for (var d = 1; d <= 31; d++) push(d + 1, '2026-10-' + (d < 10 ? '0' : '') + d, OCT[d - 1])
    for (var e = 1; e <= 30; e++) push(e + 32, '2026-11-' + (e < 10 ? '0' : '') + e, NOV[e - 1])
    return out
  }
  var SALES_ROWS = fz(rowsOf())
  var TARGET_ROWS = fz([fz({ row: 2, ym: '2026-10', target: '1700000' }), fz({ row: 3, ym: '2026-11', target: '1800000' })])
  var ERROR_EXAMPLE = fz([
    fz({ row: 52, field: 'sales', value: '7万2100' }),
    fz({ row: 53, field: 'sales', value: '-90200' }),
    fz({ row: 63, add: fz({ row: 63, date: '2026-11-31', sales: '65000', customers: '55', memo: '日付の打ち間違いの例' }) })
  ])
  function dash (salesRows, targetRows, ym, today) {
    return C.getDashboard({ salesRows: salesRows, targetRows: targetRows, today: today || TODAY, ym: ym, closedWeekdays: CLOSED_WEEKDAYS, monthsBack: MONTHS_BACK, readAt: READ_AT, shopName: SHOP })
  }

  // 検査用の出口（凍結した定数と純粋な関数だけ）
  root.__demo38 = fz({
    TODAY: TODAY, READ_AT: READ_AT, CLOSED_WEEKDAYS: CLOSED_WEEKDAYS, SALES_ROWS: SALES_ROWS, TARGET_ROWS: TARGET_ROWS, ERROR_EXAMPLE: ERROR_EXAMPLE,
    weekday: C.weekday, daysInMonth: C.daysInMonth, readAmount: C.readAmount, readDate: C.readDate, getDashboard: C.getDashboard,
    chartGeom: C.chartGeom, fmtYen: C.fmtYen, fmtRate: C.fmtRate, srText: C.srText, dash: dash
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
  var SVG = 'http://www.w3.org/2000/svg'
  function icon (id, size, cls) {
    var s = document.createElementNS(SVG, 'svg')
    s.setAttribute('width', String(size))
    s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true')
    s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(SVG, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }

  // ---------- 状態（画面の中だけ。保存しない） ----------
  var state = {}
  function resetState () {
    state.sales = SALES_ROWS.map(function (r) { return { row: r.row, date: r.date, sales: r.sales, customers: r.customers, memo: r.memo } })
    state.targets = TARGET_ROWS.map(function (r) { return { row: r.row, ym: r.ym, target: r.target } })
    state.ym = '2026-11'
    state.filter = '2026-11'
    state.tab = 'tab-sales'
    state.errex = false
    state.dash = null
  }
  function compute () {
    state.dash = dash(state.sales, state.targets, state.ym)
    return state.dash
  }

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  var srLast = ''
  // wait ms 何も変わらなければ1回だけ（ふだん 500ms）。前と同じ文なら一度空にして 50ms 後に入れる
  function say (text, wait) {
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
    }, wait === undefined ? 500 : wait)
  }

  // ---------- スマホの画面を描き直す ----------
  function refresh () {
    var h = compute()
    View38.render(h)
    markErrors(h)
    live(h)
    return h
  }
  function live (h) {
    $('sheet-live-t').textContent = C.liveText(h)
    $('sheet-live-err').hidden = !h.errors.length
    $('sheet-live-n').textContent = h.errors.length + '行'
  }

  // ---------- 入力シートの見本 ----------
  function cellIn (r, field, label) {
    var td = el('td', 'cell-' + field)
    var w = el('div', 'cell')
    w.appendChild(icon('i-warn', 16, 'cell__err'))
    var inp = el('input', 'sheet__in')
    inp.type = 'text'
    inp.inputMode = 'numeric'
    inp.autocomplete = 'off'
    inp.value = r[field]
    inp.dataset.row = String(r.row)
    inp.dataset.field = field
    inp.setAttribute('aria-label', label)
    if (field === 'sales' && r.sales === '' && C.weekday(r.date) === 1) inp.placeholder = '休み'
    w.appendChild(inp)
    td.appendChild(w)
    var hint = el('span', 'visually-hidden', 'この行は数えていません')
    hint.id = 'hint-' + field + '-' + r.row
    hint.hidden = true
    td.appendChild(hint)
    return td
  }
  function buildSales () {
    var tb = $('sales-body')
    var list = []
    state.sales.forEach(function (r) {
      var d = C.readDate(r.date)
      var ym = d ? d.slice(0, 7) : r.date.slice(0, 7)
      if (ym !== state.filter) return
      var tr = el('tr')
      tr.dataset.row = String(r.row)
      var no = el('th', null, String(r.row))
      no.scope = 'row'
      tr.appendChild(no)
      var dc = el('td', 'cell-date')
      var dw = el('div', 'cell')
      dw.appendChild(icon('i-warn', 16, 'cell__err'))
      var ds = el('span', d ? 'sheet__date' : 'sheet__raw', d ? C.fmtMD(d) : r.date)
      dw.appendChild(ds)
      dc.appendChild(dw)
      if (r.memo) dc.appendChild(el('span', 'sheet__memo', r.memo))
      tr.appendChild(dc)
      var jmd = d ? C.fmtJMD(d) : r.date
      if (d && d > TODAY) {
        tr.appendChild(el('td', 'sheet__yet', 'まだ'))
        tr.appendChild(el('td', 'sheet__yet', 'まだ'))
      } else {
        tr.appendChild(cellIn(r, 'sales', r.row + '行目 ' + jmd + 'の売上'))
        tr.appendChild(cellIn(r, 'customers', r.row + '行目 ' + jmd + 'の客数'))
      }
      tr.appendChild(el('td', 'c-memo', r.memo))
      list.push(tr)
    })
    tb.replaceChildren.apply(tb, list)
  }
  function buildTargets () {
    var tb = $('target-body')
    var list = state.targets.map(function (r) {
      var tr = el('tr')
      tr.dataset.row = String(r.row)
      var no = el('th', null, String(r.row))
      no.scope = 'row'
      tr.appendChild(no)
      tr.appendChild(el('td', 'cell-ym', r.ym))
      tr.appendChild(cellIn(r, 'target', '「目標」シート ' + r.row + '行目 ' + C.fmtYm(r.ym) + 'の目標売上'))
      return tr
    })
    tb.replaceChildren.apply(tb, list)
  }
  function buildSheet () {
    buildSales()
    buildTargets()
    $('f-11').setAttribute('aria-pressed', state.filter === '2026-11' ? 'true' : 'false')
    $('f-10').setAttribute('aria-pressed', state.filter === '2026-10' ? 'true' : 'false')
  }
  // 誤りのセルに印（面＋枠＋「!」）と aria-invalid
  function markErrors (h) {
    var bad = {}
    h.errors.forEach(function (e) {
      var f = e.sheet === 'target' ? (e.field === 'ym' ? 'ym' : 'target') : e.field
      bad[(e.sheet === 'target' ? 't' : 's') + e.row + ':' + f] = true
    })
    ;[['sales-body', 's'], ['target-body', 't']].forEach(function (p) {
      Array.prototype.forEach.call($(p[0]).querySelectorAll('tr'), function (tr) {
        var row = tr.dataset.row
        Array.prototype.forEach.call(tr.querySelectorAll('td'), function (td) {
          var m = /cell-(\w+)/.exec(td.className)
          if (!m) return
          var on = !!bad[p[1] + row + ':' + m[1]]
          td.classList.toggle('is-err', on)
          var inp = td.querySelector('input')
          var hint = td.querySelector('.visually-hidden')
          if (inp) {
            if (on) { inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', hint.id) } else { inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-describedby') }
            hint.hidden = !on
          }
        })
      })
    })
  }

  // ---------- 操作 ----------
  var inTimer = 0
  function onInput (e) {
    var t = e.target
    if (!t.dataset || !t.dataset.field) return
    var row = Number(t.dataset.row)
    var list = t.dataset.field === 'target' ? state.targets : state.sales
    list.forEach(function (r) { if (r.row === row) r[t.dataset.field] = t.value })
    clearTimeout(inTimer)
    clearTimeout(srTimer)
    // 400ms 待って最後の1回だけ集計・描き直し。読み上げはさらに 400ms 後（最後の入力から 800ms）
    inTimer = setTimeout(function () {
      var h = refresh()
      say(C.srText(h, 'input'), 400)
    }, 400)
  }
  function onMonth (ym) {
    state.ym = ym
    var h = refresh()
    View38.focusMonth()
    say(C.srText(h, 'month'))
  }
  function onReload () {
    var h = refresh()
    say(C.srText(h, 'reload'))
  }
  function onErrExample () {
    if (state.errex) return
    state.errex = true
    ERROR_EXAMPLE.forEach(function (x) {
      if (x.add) state.sales.push({ row: x.add.row, date: x.add.date, sales: x.add.sales, customers: x.add.customers, memo: x.add.memo })
      else state.sales.forEach(function (r) { if (r.row === x.row) r[x.field] = x.value })
    })
    state.filter = '2026-11'
    selectTab('tab-sales', false)
    buildSheet()
    clearTimeout(inTimer)
    var h = refresh()
    var b = $('err-example')
    b.textContent = '誤りの例を入れました'
    // 押したボタンが押せなくなるので、フォーカスは隣の［最初に戻す］へ
    $('reset').focus()
    b.disabled = true
    say(C.srText(h, 'errex'))
  }
  function onReset () {
    clearTimeout(inTimer)
    resetState()
    selectTab('tab-sales', false)
    buildSheet()
    var b = $('err-example')
    b.disabled = false
    b.textContent = '誤りの例を入れる'
    refresh()
    // スマホの画面（1025px 以上は中だけ縦に動く）も上へ戻す
    $('phone-screen').scrollTop = 0
    say(C.srText(state.dash, 'reset'))
  }
  function onFilter (ym) {
    state.filter = ym
    buildSheet()
    markErrors(state.dash)
  }

  // ---------- シートのタブ ----------
  var TABS = ['tab-sales', 'tab-target']
  function selectTab (id, focus) {
    state.tab = id
    TABS.forEach(function (t) {
      var b = $(t)
      var on = t === id
      b.setAttribute('aria-selected', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
      $(b.getAttribute('aria-controls')).hidden = !on
    })
    if (focus) $(id).focus()
  }
  function onTabKey (e) {
    var i = TABS.indexOf(e.currentTarget.id)
    var n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') n = (i + TABS.length - 1) % TABS.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = TABS.length - 1
    if (n < 0) return
    e.preventDefault()
    selectTab(TABS[n], true)
  }

  function init () {
    resetState()
    View38.init({ note: NOTE, onMonth: onMonth, onReload: onReload })
    buildSheet()
    refresh()
    $('panel-sales').addEventListener('input', onInput)
    $('panel-target').addEventListener('input', onInput)
    $('err-example').addEventListener('click', onErrExample)
    $('reset').addEventListener('click', onReset)
    $('f-11').addEventListener('click', function () { onFilter('2026-11') })
    $('f-10').addEventListener('click', function () { onFilter('2026-10') })
    TABS.forEach(function (t) {
      $(t).addEventListener('click', function () { selectTab(t, false) })
      $(t).addEventListener('keydown', onTabKey)
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
