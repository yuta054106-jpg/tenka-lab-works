// ==== 画面の描画 ここから（デモとひな形の index.html で同じ中身） ====
// スマホの画面（.app）を、集計の結果 1つから描く。表示は createElement と textContent だけ
// データの取り方（シートか見本か）は外から init で渡す
var View38 = (function () {
  'use strict'
  var C = Calc38
  var SVGNS = 'http://www.w3.org/2000/svg'
  var opts = {}
  var dash = null
  var daysOpen = false
  var lastW = 0
  var rafId = 0

  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function sv (tag, attrs) {
    var e = document.createElementNS(SVGNS, tag)
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, String(attrs[k])) })
    return e
  }
  function icon (id, size, cls) {
    var s = sv('svg', { width: size, height: size, 'aria-hidden': 'true', focusable: 'false' })
    if (cls) s.setAttribute('class', cls)
    var u = sv('use', { href: '#' + id })
    s.appendChild(u)
    return s
  }
  // 数＋小さめの「円」
  function yen (n, cls) {
    var p = el('p', cls)
    p.appendChild(el('span', 'app__n', C.fmtNum(n)))
    p.appendChild(el('span', 'app__yen', '円'))
    return p
  }
  function dlRow (dl, label, value) {
    var w = el('div', 'app__dlrow')
    var dt = el('dt')
    // 「今月（11月1日〜22日）」は括弧の前でだけ折る
    String(label).split(/(?=（)/).forEach(function (x) { dt.appendChild(el('span', 'nw', x)) })
    w.appendChild(dt)
    w.appendChild(el('dd', null, value))
    dl.appendChild(w)
    return w
  }
  function card (mod, title, id) {
    var s = el('section', 'app__card app__card--' + mod)
    var h = el('h3', 'app__h3', title)
    h.id = id
    s.setAttribute('aria-labelledby', id)
    s.appendChild(h)
    return s
  }

  // ---------- 2. 今月の売上 ----------
  function sumCard (h) {
    var s = card('sum', C.sumTitle(h), 'app-h-sum')
    s.appendChild(yen(h.total, 'app__big'))
    var inc = C.incompleteText(h)
    if (inc) s.appendChild(el('p', 'app__msg app__inc', inc))
    var dl = el('dl', 'app__dl')
    dlRow(dl, '目標（税込）', h.target === null ? '未入力' : C.fmtYen(h.target))
    s.appendChild(dl)
    if (h.target !== null) {
      var r = el('div', 'app__rate')
      var row = el('p', 'app__rate-row')
      row.appendChild(el('span', 'app__rate-lab', '達成率'))
      row.appendChild(el('span', 'app__rate-num', C.fmtRate(h.rate)))
      r.appendChild(row)
      var m = el('div', 'app__meter')
      m.setAttribute('aria-hidden', 'true')
      var f = el('span', 'app__meter-fill')
      f.style.width = Math.min(h.rate / 10, 100) + '%'
      m.appendChild(f)
      r.appendChild(m)
      s.appendChild(r)
      var rl = C.remainLine(h)
      if (rl.sentence) s.appendChild(el('p', 'app__over', rl.sentence))
      else { var dl2 = el('dl', 'app__dl'); dlRow(dl2, rl.label, rl.value); s.appendChild(dl2) }
    } else {
      s.appendChild(el('p', 'app__msg', C.noTargetText(h)))
    }
    var dl3 = el('dl', 'app__dl')
    dlRow(dl3, '営業日', C.bizText(h))
    dlRow(dl3, '1日の平均', C.fmtYen(h.avg))
    s.appendChild(dl3)
    var fc = C.forecastLines(h)
    if (fc) {
      var box = el('div', 'app__forecast')
      if (fc.none) box.appendChild(el('p', 'app__fc-none', fc.none))
      else {
        box.appendChild(el('p', 'app__fc-head', fc.head))
        box.appendChild(yen(fc.value, 'app__mid'))
        box.appendChild(el('p', 'app__fc-cmp', fc.cmp))
        fc.notes.forEach(function (t) { box.appendChild(el('p', 'app__note', t)) })
      }
      s.appendChild(box)
    }
    if (h.errors.length || h.warns.length) s.appendChild(errLine(h))
    return s
  }
  function errLine (h) {
    var p = el('p', 'app__errline')
    p.appendChild(icon('i-warn', 16, 'app__warn'))
    p.appendChild(el('span', null, C.errorLineText(h)))
    var a = el('a', 'app__tolist', '一覧へ')
    a.href = '#app-errors'
    a.addEventListener('click', function (e) {
      e.preventDefault()
      var t = $('app-errors-h')
      if (t) { t.focus(); t.scrollIntoView({ block: 'start' }) }
    })
    p.appendChild(a)
    return p
  }

  // ---------- 3. 前月比 ----------
  function prevCard (h) {
    var s = card('prev', C.prevTitle(h), 'app-h-prev')
    var pl = C.prevLines(h)
    s.appendChild(el('p', 'app__period', pl.period))
    if (pl.none) { s.appendChild(el('p', 'app__msg', pl.none)); return s }
    var dl = el('dl', 'app__dl')
    dlRow(dl, pl.curLabel, pl.cur)
    dlRow(dl, pl.prevLabel, pl.prev)
    s.appendChild(dl)
    var d = el('p', 'app__diff app__diff--' + pl.dir)
    var main = el('span', 'app__diff-main')
    if (pl.dir === 'same') main.appendChild(el('span', 'app__diff-word', '± ' + pl.word))
    else {
      main.appendChild(icon(pl.dir === 'up' ? 'i-up' : 'i-down', 16, 'app__tri'))
      main.appendChild(el('span', 'app__diff-word', pl.word))
      var amt = el('span', 'app__amt')
      amt.appendChild(el('span', 'app__n', C.fmtNum(Math.abs(h.diff))))
      amt.appendChild(el('span', 'app__yen', '円'))
      main.appendChild(amt)
    }
    d.appendChild(main)
    d.appendChild(el('span', 'app__diff-rate', pl.rate))
    s.appendChild(d)
    if (pl.note) s.appendChild(el('p', 'app__note', pl.note))
    return s
  }

  // ---------- 4. 日ごとの売上 ----------
  function legendIcon (kind) {
    var s = sv('svg', { width: 24, height: 16, viewBox: '0 0 24 16', 'aria-hidden': 'true', focusable: 'false', class: 'app__lg-ico' })
    if (kind === 'bar') s.appendChild(sv('rect', { x: 7, y: 2, width: 10, height: 13, class: 'ch-bar' }))
    else if (kind === 'goal') {
      s.appendChild(sv('line', { x1: 0, y1: 8, x2: 24, y2: 8, class: 'ch-goal-under' }))
      s.appendChild(sv('line', { x1: 0, y1: 8, x2: 24, y2: 8, class: 'ch-goal' }))
    } else {
      var t = sv('text', { x: 12, y: 13, class: 'ch-q' })
      t.textContent = '?'
      s.appendChild(t)
    }
    return s
  }
  function chartCard (h) {
    var s = card('chart', '日ごとの売上', 'app-h-chart')
    var ul = el('ul', 'app__legend')
    function li (kind, text) {
      var l = el('li')
      l.appendChild(legendIcon(kind))
      l.appendChild(el('span', null, text))
      ul.appendChild(l)
    }
    li('bar', '棒：その日の売上（税込）。定休日・臨時休業・未入力の日は棒がありません（表で見分けられます）。')
    var lg = C.legendGoal(h)
    if (lg) li('goal', lg)
    if (h.errDays > 0) li('q', '?：数えていない日（いちばん下の一覧を確かめてください）')
    s.appendChild(ul)
    var box = el('div', 'app__chart')
    box.id = 'app-chart'
    s.appendChild(box)
    s.appendChild(daysTable(h))
    return s
  }
  function drawChart () {
    var box = $('app-chart')
    if (!box || !dash || !dash.hasData) return
    var W = box.clientWidth || 300
    lastW = W
    var g = C.chartGeom(dash, W)
    var svg = sv('svg', { width: W, height: g.H, viewBox: '0 0 ' + W + ' ' + g.H, role: 'img', 'aria-label': C.chartLabel(dash), class: 'app__svg' })
    g.ticks.forEach(function (t) {
      svg.appendChild(sv('line', { x1: 36, y1: t.y + 0.5, x2: W - 8, y2: t.y + 0.5, class: t.isBase ? 'ch-base' : 'ch-grid' }))
      var tx = sv('text', { x: 32, y: t.y + 4, class: 'ch-axis ch-axis--y' })
      tx.textContent = t.label
      svg.appendChild(tx)
    })
    g.bars.forEach(function (b) {
      var r = sv('rect', { x: b.x, y: b.y, width: b.w, height: b.h, class: 'ch-bar' })
      r.setAttribute('data-d', String(b.d))
      svg.appendChild(r)
    })
    g.marks.forEach(function (m) {
      var t = sv('text', { x: m.x, y: m.y, class: 'ch-q' })
      t.setAttribute('data-d', String(m.d))
      t.textContent = '?'
      svg.appendChild(t)
    })
    if (g.goal) {
      svg.appendChild(sv('line', { x1: g.goal.x1, y1: g.goal.y, x2: g.goal.x2, y2: g.goal.y, class: 'ch-goal-under' }))
      svg.appendChild(sv('line', { x1: g.goal.x1, y1: g.goal.y, x2: g.goal.x2, y2: g.goal.y, class: 'ch-goal' }))
    }
    g.xlabels.forEach(function (l) {
      var t = sv('text', { x: l.x, y: l.y, class: 'ch-axis ch-axis--x' })
      t.textContent = l.label
      svg.appendChild(t)
    })
    box.replaceChildren(svg)
  }
  function onResize () {
    if (rafId) return
    rafId = requestAnimationFrame(function () {
      rafId = 0
      var box = $('app-chart')
      if (box && box.clientWidth !== lastW) drawChart()
    })
  }
  function daysTable (h) {
    var d = el('details', 'app__days')
    d.open = daysOpen
    d.addEventListener('toggle', function () { daysOpen = d.open })
    var sm = el('summary', 'app__sum')
    sm.appendChild(icon('i-chev', 16, 'app__chev'))
    sm.appendChild(el('span', null, C.daysSummary(h)))
    d.appendChild(sm)
    var t = el('table', 'app__table')
    var cap = el('caption', 'visually-hidden', h.month + '月の日ごとの売上')
    t.appendChild(cap)
    var hasGoal = h.dailyGoal !== null
    var th = el('thead')
    var tr = el('tr')
    ;['日付', '売上', '客数'].concat(hasGoal ? ['目標との差'] : []).forEach(function (x) {
      var c = el('th', null, x)
      c.scope = 'col'
      tr.appendChild(c)
    })
    th.appendChild(tr)
    t.appendChild(th)
    var tb = el('tbody')
    C.dayRows(h).forEach(function (r) {
      var row = el('tr', 'is-' + r.state)
      var c0 = el('th')
      c0.scope = 'row'
      c0.appendChild(el('span', null, r.date))
      if (r.today) c0.appendChild(el('span', 'app__today', '今日'))
      row.appendChild(c0)
      r.cells.forEach(function (x) { row.appendChild(el('td', null, x)) })
      tb.appendChild(row)
    })
    var tot = el('tr', 'app__total')
    var tc = el('th', null, '合計')
    tc.scope = 'row'
    tot.appendChild(tc)
    C.totalRow(h).forEach(function (x) { tot.appendChild(el('td', null, x)) })
    tb.appendChild(tot)
    t.appendChild(tb)
    d.appendChild(t)
    return d
  }

  // ---------- 5. 客数と客単価 ----------
  function custCard (h) {
    var cl = C.custLines(h)
    var s = card('cust', cl.title, 'app-h-cust')
    var t = el('table', 'app__ctable')
    var hr = el('tr')
    ;[['', 'col'], [cl.curHead, 'col'], [cl.prevHead, 'col']].forEach(function (x) {
      var c = el(x[0] === '' ? 'td' : 'th', null, x[0])
      if (x[0] !== '') c.scope = 'col'
      hr.appendChild(c)
    })
    var th = el('thead')
    th.appendChild(hr)
    t.appendChild(th)
    var tb = el('tbody')
    ;[['客数', cl.cust, cl.prevCust], ['客単価（税込）', cl.unit, cl.prevUnit], ['数えた日', cl.days, cl.prevDays]].forEach(function (x) {
      var r = el('tr')
      var c = el('th')
      c.scope = 'row'
      String(x[0]).split(/(?=（)/).forEach(function (w) { c.appendChild(el('span', 'nw', w)) })
      r.appendChild(c)
      r.appendChild(el('td', null, x[1]))
      r.appendChild(el('td', null, x[2]))
      tb.appendChild(r)
    })
    t.appendChild(tb)
    s.appendChild(t)
    if (cl.diff) {
      var p = el('p', 'app__cdiff')
      p.appendChild(el('span', 'app__cdiff-lab', '差'))
      p.appendChild(el('span', null, cl.diff))
      s.appendChild(p)
    }
    if (cl.diffNote) s.appendChild(el('p', 'app__note', cl.diffNote))
    s.appendChild(el('p', 'app__note', cl.note))
    return s
  }

  // ---------- 6. 確かめてほしい行 ----------
  function errBox (h) {
    var b = C.errorBox(h)
    if (!b) return null
    var s = el('section', 'app__errors')
    s.id = 'app-errors'
    var t = el('h3', 'app__h3 app__err-h', b.title)
    t.id = 'app-errors-h'
    t.tabIndex = -1
    s.setAttribute('aria-labelledby', 'app-errors-h')
    s.appendChild(t)
    b.summary.forEach(function (x) { s.appendChild(el('p', 'app__err-sum', x)) })
    var ul = el('ul', 'app__err-list')
    b.items.forEach(function (x) { ul.appendChild(el('li', null, x)) })
    s.appendChild(ul)
    s.appendChild(el('p', 'app__note', b.end))
    return s
  }

  // ---------- 全体 ----------
  function render (h) {
    dash = h
    $('app-title').textContent = h.shopName + 'の売上'
    $('app-month').textContent = C.fmtYm(h.ym)
    var pv = $('app-prev')
    var nx = $('app-next')
    var pm = C.addMonth(h.ym, -1)
    pv.disabled = !h.canPrev
    nx.disabled = !h.canNext
    pv.setAttribute('aria-label', '前の月（' + Number(pm.slice(5)) + '月）を見る')
    nx.setAttribute('aria-label', '次の月（' + Number(h.nextYm.slice(5)) + '月）を見る')
    var body = $('app-body')
    var list = []
    if (!h.hasData) {
      var s = card('empty', h.month + '月の売上', 'app-h-sum')
      s.appendChild(el('p', 'app__msg', C.emptyText(h)))
      list.push(s)
    } else {
      list.push(sumCard(h), prevCard(h), chartCard(h), custCard(h))
    }
    var eb = errBox(h)
    if (eb) list.push(eb)
    body.replaceChildren.apply(body, list)
    $('app-read').textContent = '最後に読んだ時刻：' + h.readAt
    $('app-fail').hidden = true
    drawChart()
  }
  function focusMonth () { $('app-month').focus() }
  function setBusy (on) { $('app-busy').hidden = !on }
  function setFail (on) { $('app-fail').hidden = !on }
  function init (o) {
    opts = o || {}
    $('app-note').textContent = opts.note || ''
    $('app-prev').addEventListener('click', function () { if (dash && dash.canPrev && opts.onMonth) opts.onMonth(C.addMonth(dash.ym, -1)) })
    $('app-next').addEventListener('click', function () { if (dash && dash.canNext && opts.onMonth) opts.onMonth(dash.nextYm) })
    $('app-reload').addEventListener('click', function () { if (opts.onReload) opts.onReload() })
    window.addEventListener('resize', onResize)
  }
  return { init: init, render: render, drawChart: drawChart, focusMonth: focusMonth, setBusy: setBusy, setFail: setFail }
})()
// ==== 画面の描画 ここまで ====
