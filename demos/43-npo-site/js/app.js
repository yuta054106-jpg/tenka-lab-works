// NPO の公式サイトの見本（コダマリ学びネット・架空）の画面
// #ハッシュで7つの画面を切り替える・活動報告の絞り込みともっと見る・活動計算書の表と横棒・ご支援のボタン
// 表示は textContent と createElement だけで作る。保存しない（ハッシュは画面の切り替えにだけ使う）
(function (C) {
  'use strict'
  var D = C.D
  var SVGNS = 'http://www.w3.org/2000/svg'
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  // <svg><use href="#id"></svg>（絵だけ。読み上げない）
  function icon (id, cls, w, h) {
    var s = document.createElementNS(SVGNS, 'svg')
    s.setAttribute('class', cls || '')
    s.setAttribute('width', String(w))
    s.setAttribute('height', String(h || w))
    s.setAttribute('aria-hidden', 'true')
    s.setAttribute('focusable', 'false')
    var u = document.createElementNS(SVGNS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  function clear (node) { while (node.firstChild) node.removeChild(node.firstChild) }

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

  // ---------- 札 ----------
  var BIZ_ICON = { kodama: 'i-book', hidamari: 'i-sun', houjin: 'i-logo' }
  function bizTag (biz) {
    var t = el('span', 'biz-tag biz-tag--' + biz)
    t.appendChild(icon(BIZ_ICON[biz], '', 16))
    t.appendChild(document.createTextNode(C.BIZ_BY_ID[biz].tag))
    return t
  }

  // 記事のカード（withBody：本文も出すか）
  function postCard (p, withBody) {
    var a = el('article', 'post')
    a.setAttribute('data-id', p.id)
    var th = el('div', 'post__thumb post__thumb--' + p.biz)
    th.setAttribute('aria-hidden', 'true')
    th.appendChild(icon('t-' + p.biz, 'post__shape', 44))
    th.appendChild(icon('k-' + p.kind, 'post__kind', 12))
    a.appendChild(th)
    var head = el('div', 'post__head')
    var meta = el('p', 'post__meta')
    var t = el('time', 'post__date', C.fmtDate(p.date))
    t.setAttribute('datetime', p.date)
    meta.appendChild(t)
    meta.appendChild(bizTag(p.biz))
    meta.appendChild(el('span', 'kind-tag', C.KIND_BY_ID[p.kind].tag))
    if (C.isNew(p)) meta.appendChild(el('span', 'new-tag', '新着'))
    head.appendChild(meta)
    var h = el('h3', 'post__title', p.title)
    h.setAttribute('tabindex', '-1')
    head.appendChild(h)
    a.appendChild(head)
    if (withBody) {
      var b = el('div', 'post__body')
      // 募集・受付を案内する記事は、本文の先頭にデモの文を出す
      if (C.hasNoReceipt(p)) b.appendChild(el('p', 'demo-note', C.noReceiptText(p)))
      p.body.forEach(function (line) { b.appendChild(el('p', '', line)) })
      a.appendChild(b)
    }
    return a
  }

  // ---------- 活動報告の一覧 ----------
  var st = { biz: 'all', kind: 'all', shown: 6 }
  function radioVal (name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : 'all' }
  function setRadio (name, val) { var r = document.querySelector('input[name="' + name + '"][value="' + val + '"]'); if (r) r.checked = true }
  function setFilter (biz, kind) {
    st.biz = biz
    st.kind = kind
    setRadio('biz', biz)
    setRadio('kind', kind)
    st.shown = C.firstShown(C.filterPosts(biz, kind).length)
    renderPosts()
  }
  function renderPosts () {
    var list = C.filterPosts(st.biz, st.kind)
    var n = list.length
    var m = Math.min(st.shown, n)
    var cnt = $('count')
    clear(cnt)
    cnt.appendChild(el('span', 'count__n', String(n)))
    cnt.appendChild(document.createTextNode('件中 '))
    cnt.appendChild(el('span', 'count__n', String(m)))
    cnt.appendChild(document.createTextNode('件を表示'))
    var box = $('posts')
    clear(box)
    C.withMonths(list.slice(0, m)).forEach(function (x) {
      if (x.month) box.appendChild(el('h2', 'month', x.month))
      box.appendChild(postCard(x.post, true))
    })
    $('empty').hidden = n !== 0
    var more = $('more')
    more.textContent = C.moreText(n, m)
    more.parentNode.hidden = n - m <= 0
  }
  function onFilterChange () {
    setFilter(radioVal('biz'), radioVal('kind'))
    say(C.sayFilter(st.biz, st.kind))
  }

  // ---------- トップの最新3件 ----------
  function renderLatest () {
    var box = $('latest')
    clear(box)
    C.SORTED.slice(0, 3).forEach(function (p) { box.appendChild(postCard(p, false)) })
    $('to-reports-all').textContent = '活動報告をすべて見る（' + C.SORTED.length + '件）'
    $('fig-income').textContent = C.fmtYen(C.account(2025).incomeTotal)
  }

  // ---------- 法人情報 ----------
  function renderOrg () {
    var dl = $('org')
    D.ORG.forEach(function (r) {
      var d = el('div')
      d.appendChild(el('dt', '', r[0]))
      var dd = el('dd')
      if (r[0] === '事業') {
        // 事業の名前は事業ページへのリンク
        var a1 = el('a', '', '放課後の学習会 こだま塾')
        a1.href = '#kodama'
        var a2 = el('a', '', '居場所 ひだまりルーム')
        a2.href = '#hidamari'
        dd.appendChild(a1)
        dd.appendChild(document.createTextNode('（2011年から）／'))
        dd.appendChild(a2)
        dd.appendChild(document.createTextNode('（2019年から）'))
      } else {
        dd.textContent = r[1]
      }
      d.appendChild(dd)
      dl.appendChild(d)
    })
    var tb = $('docs').tBodies[0]
    D.DOCS.forEach(function (name) {
      var tr = el('tr')
      var th = el('th', '', name)
      th.setAttribute('scope', 'row')
      tr.appendChild(th)
      D.DOC_YEARS.forEach(function () {
        var td = el('td', '', '書類なし')
        td.appendChild(el('span', 'visually-hidden', '（デモのため実際の書類はありません）'))
        tr.appendChild(td)
      })
      tb.appendChild(tr)
    })
    // 「活動計算書の要点を見る」：年度表の下の行。同じ画面の h2 へ移る（ハッシュは変えない）
    $('to-accounts').addEventListener('click', function () {
      var h = $('h-accounts')
      h.scrollIntoView({ block: 'start' })
      h.focus()
    })
    var tt = $('trend').tBodies[0]
    C.FYS.forEach(function (fy) {
      var a = C.account(fy)
      var tr = el('tr')
      var th = el('th', '', String(fy))
      th.setAttribute('scope', 'row')
      tr.appendChild(th)
      ;[a.incomeTotal, a.expenseTotal, a.diff].forEach(function (v) { tr.appendChild(el('td', '', C.fmtNum(v))) })
      tt.appendChild(tr)
    })
  }

  // 活動計算書の表と横棒（年度を変えたら作り直す）
  function renderAccount (fy) {
    var a = C.account(fy)
    $('period').textContent = fy + '年度（' + a.period + '）'
    $('acc-caption').textContent = fy + '年度 活動計算書の要点（単位：円）'
    // 表の説明（読み上げ用）：架空の内訳の例を、表に入るとき1回だけ伝える
    $('acc-ex').textContent = D.INCOME_ITEMS.filter(function (it) { return it.ex }).map(function (it) { return it.name + 'の' + it.ex }).join('。')
    var tb = $('acc-table').tBodies[0]
    clear(tb)
    function row (cls, name, val) {
      var tr = el('tr', cls)
      var th = el('th', '', name)
      th.setAttribute('scope', 'row')
      if (val === null) th.setAttribute('colspan', '2')
      tr.appendChild(th)
      if (val !== null) tr.appendChild(el('td', '', C.fmtNum(val)))
      tb.appendChild(tr)
    }
    row('is-head', '経常収益', null)
    D.INCOME_ITEMS.forEach(function (it) {
      row('is-item', it.name, a.income[it.k])
      // 架空の内訳の例は科目名の下に小さく添える
      // 読み上げでは行見出しのたびに読まれないよう aria-hidden にし、表の説明（#acc-ex）で1回だけ伝える
      if (it.ex) {
        var ex = el('span', 'money__ex', it.ex)
        ex.setAttribute('aria-hidden', 'true')
        tb.lastChild.cells[0].appendChild(ex)
      }
    })
    row('is-total', '経常収益計', a.incomeTotal)
    row('is-head', '経常費用', null)
    D.EXPENSE_ITEMS.forEach(function (it) { row('is-item', it.name, a.expense[it.k]) })
    row('is-total', '経常費用計', a.expenseTotal)
    row('is-ord', '当期経常増減額', a.ordinaryDiff)
    row('is-diff', '当期正味財産増減額', a.diff)
    row('', '前期繰越正味財産額', a.begin)
    row('is-end', '次期繰越正味財産額', a.end)

    var fig = $('bars')
    clear(fig)
    function bar (cls, name, val) {
      var r = el('div', 'bar ' + cls)
      r.appendChild(el('span', 'bar__label', name))
      var tr = el('span', 'bar__track')
      var f = el('span', 'bar__fill')
      var pct = C.barPct(val)
      f.style.width = pct + '%'
      f.setAttribute('data-pct', pct)
      tr.appendChild(f)
      r.appendChild(tr)
      r.appendChild(el('span', 'bar__val', C.fmtYen(val)))
      fig.appendChild(r)
    }
    fig.appendChild(el('p', 'bars__h', '経常収益の内訳'))
    D.INCOME_ITEMS.forEach(function (it) { bar('bar--inc', it.name, a.income[it.k]) })
    bar('bar--inc bar--total', '経常収益計', a.incomeTotal)
    fig.appendChild(el('p', 'bars__h', '経常費用の内訳'))
    D.EXPENSE_ITEMS.forEach(function (it) { bar('bar--exp', it.name, a.expense[it.k]) })
    bar('bar--exp bar--total', '経常費用計', a.expenseTotal)

    $('acc-sum').textContent = C.summary(fy)
  }

  // ---------- 画面の切り替え ----------
  function route (first) {
    var r = C.routeOf(location.hash)
    if (r.replace) history.replaceState(null, '', '#top')
    var pages = document.querySelectorAll('.page')
    for (var i = 0; i < pages.length; i++) pages[i].hidden = pages[i].getAttribute('data-page') !== r.go
    var links = document.querySelectorAll('.nav__a')
    for (var j = 0; j < links.length; j++) {
      if (links[j].getAttribute('data-page') === r.go) links[j].setAttribute('aria-current', 'page')
      else links[j].removeAttribute('aria-current')
    }
    document.title = C.titleOf(r.go)
    if (!first) {
      window.scrollTo(0, 0)
      var h = $('h-' + r.go)
      if (h) h.focus({ preventScroll: true })
    }
  }

  function init () {
    renderLatest()
    renderOrg()
    // 事業ページのボタンの件数は data から数える
    ;['kodama', 'hidamari'].forEach(function (b) {
      var a = $('to-reports-' + b)
      a.textContent = C.BIZ_BY_ID[b].tag + 'の活動報告を見る（' + C.countByBiz(b) + '件）'
      // 押した時に絞り込みを（事業＝その事業・種類＝すべて）にしてから #reports へ
      a.addEventListener('click', function () { setFilter(b, 'all') })
    })
    $('to-reports-all').addEventListener('click', function () { setFilter('all', 'all') })

    setFilter('all', 'all')
    var radios = document.querySelectorAll('input[name="biz"], input[name="kind"]')
    for (var i = 0; i < radios.length; i++) radios[i].addEventListener('change', onFilterChange)
    $('more').addEventListener('click', function () {
      var n = C.filterPosts(st.biz, st.kind).length
      var old = st.shown
      st.shown = C.moreShown(old, n)
      renderPosts()
      // 新しく出した最初の記事の題にフォーカス
      var arts = $('posts').querySelectorAll('.post')
      if (arts[old]) arts[old].querySelector('.post__title').focus()
      say(C.sayMore(st.shown, n))
    })
    $('clear').addEventListener('click', function () {
      setFilter('all', 'all')
      $('biz-all').focus()
      say(C.sayFilter('all', 'all'))
    })

    renderAccount(2025)
    var fys = document.querySelectorAll('input[name="fy"]')
    for (var k = 0; k < fys.length; k++) {
      fys[k].addEventListener('change', function (e) {
        var fy = Number(e.target.value)
        renderAccount(fy)
        say(C.sayFy(fy))
      })
    }

    // ご支援のボタン：そのカードの下に「（デモ）実際の受付はありません。…」を出す
    var demos = document.querySelectorAll('[data-demo]')
    for (var d = 0; d < demos.length; d++) {
      demos[d].addEventListener('click', function (e) {
        var m = $(e.currentTarget.getAttribute('data-demo'))
        m.textContent = C.DEMO_MSG
        m.hidden = false
        say(C.DEMO_MSG)
      })
    }

    // 本文へ移動：表示中の画面の h1 へ
    $('skip').addEventListener('click', function () {
      var p = document.querySelector('.page:not([hidden])')
      if (p) p.querySelector('.h1').focus()
    })

    window.addEventListener('hashchange', function () { route(false) })
    route(true)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})(Calc43)
