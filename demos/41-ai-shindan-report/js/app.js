// AI 活用の診断の納品物の見本（ミツカド舎・架空）の画面
// 並べ替え・絞り込み・時給・チェックはメモリだけ（保存しない・外へ送らない）。表示は textContent と createElement だけで作る
(function () {
  'use strict'
  var C = window.Calc41
  var D = C.D
  var SVGNS = 'http://www.w3.org/2000/svg'
  var WAY_ICON = { ai: 'w-ai', sheet: 'w-sheet', change: 'w-change', keep: 'w-keep' }
  var QUICK = [1000, 1200, 1500]
  var ui = { sort: 'no', way: 'all', wage: D.WAGE0, checks: {} }

  function $ (id) { return document.getElementById(id) }
  // 要素を作る（a：属性。class・text は特別扱い）
  function el (tag, a, kids) {
    var e = document.createElement(tag)
    if (a) {
      Object.keys(a).forEach(function (k) {
        if (a[k] === null || a[k] === undefined || a[k] === false) return
        if (k === 'class') e.className = a[k]
        else if (k === 'text') e.textContent = a[k]
        else e.setAttribute(k, a[k])
      })
    }
    ;(kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c) })
    return e
  }
  function icon (id, size, cls) {
    var s = document.createElementNS(SVGNS, 'svg')
    s.setAttribute('width', size || 16)
    s.setAttribute('height', size || 16)
    s.setAttribute('aria-hidden', 'true')
    s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(SVGNS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  function clear (e) { while (e.firstChild) e.removeChild(e.firstChild) }

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ。500ms 待つ） ----------
  var srTimer = 0
  var srLast = ''
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

  // ---------- 札・横棒 ----------
  function wayTag (way) { return el('span', { class: 'tag tag--' + way }, [icon(WAY_ICON[way]), C.WAY_NAME[way]]) }
  function bar (min, max, way) {
    var b = el('span', { class: 'bar', 'aria-hidden': 'true' })
    var f = el('span', { class: 'bar__fill bar__fill--' + way })
    f.style.width = C.barWidth(min, max) + 'px'
    b.style.width = max + 'px'
    b.appendChild(f)
    return b
  }

  // ---------- ボタンの組（aria-pressed。1つだけ選べる） ----------
  function chips (boxId, items, onPick, extraCls) {
    var box = $(boxId)
    items.forEach(function (it) {
      var b = el('button', { type: 'button', class: 'chip' + (extraCls ? ' ' + extraCls : ''), 'data-v': String(it.v), 'aria-pressed': 'false' }, [icon('i-chk', 16, 'chip__chk'), it.t])
      b.addEventListener('click', function () { onPick(it.v) })
      box.appendChild(b)
    })
  }
  function syncChips (boxId, v) {
    Array.prototype.forEach.call($(boxId).querySelectorAll('.chip'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === String(v) ? 'true' : 'false') })
  }

  // ---------- 表紙の帯（数の前後の単位は小さく） ----------
  function big (id, pre, num, unit) {
    var e = $(id)
    clear(e)
    if (pre) e.appendChild(el('span', { class: 'stat__u', text: pre }))
    e.appendChild(document.createTextNode(num))
    if (unit) e.appendChild(el('span', { class: 'stat__u', text: unit }))
  }
  function drawCover () {
    var t = C.totals(D.TASKS, ui.wage)
    var ai = C.filterTasks(D.TASKS, 'ai').length
    big('cv-n', '', String(t.n), '')
    big('cv-h', '', t.hours, '時間')
    $('cv-h-sub').textContent = t.n + '作業の合計（' + C.fmtYen(t.min) + '分）'
    big('cv-yen', '', C.fmtYen(t.yen), '円')
    $('cv-yen-sub').textContent = '時給 ' + C.fmtYen(ui.wage) + '円で計算（架空）'
    var f = C.firstSaving(ui.wage)
    big('cv-save', '月', f.hours, '時間')
    var sub = $('cv-save-sub')
    clear(sub)
    sub.appendChild(document.createTextNode(C.fmtYen(f.yen) + '円ぶん'))
    sub.appendChild(el('br'))
    sub.appendChild(document.createTextNode('（時給で換算した参考額）'))
    return ai
  }

  // ---------- 1 棚卸表 ----------
  function drawLegend () {
    var ul = $('legend')
    D.WAYS.forEach(function (w) { ul.appendChild(el('li', null, [wayTag(w.id), el('span', { text: w.desc })])) })
  }
  function drawTasks () {
    var list = C.view(ui.way, ui.sort, ui.wage)
    var sum = C.totals(list, ui.wage)
    var all = C.totals(D.TASKS, ui.wage)
    $('order').textContent = '並び：' + C.sortName(ui.sort)
    $('task-n').textContent = list.length + '件'
    // 表（1025px 以上）
    var tb = $('task-table')
    clear(tb)
    var t = el('table', { class: 'task-table' })
    t.appendChild(el('caption', { class: 'visually-hidden', text: '業務の棚卸表。' + C.sortName(ui.sort) + '・' + list.length + '件' }))
    var hr = el('tr')
    ;['番号', '作業と理由', '誰が', '回数（月）', '1回', '月の時間', '月の額', '向いているやり方'].forEach(function (h, i) {
      hr.appendChild(el('th', { scope: 'col', class: i >= 3 && i <= 6 ? 'num' : null, text: h }))
    })
    t.appendChild(el('thead', null, [hr]))
    var body = el('tbody')
    list.forEach(function (x) {
      var m = C.minutes(x)
      body.appendChild(el('tr', { 'data-no': x.no }, [
        el('th', { scope: 'row', text: x.no }),
        el('td', null, [el('span', { class: 'task__name', text: x.name }), el('span', { class: 'task__why', text: x.reason })]),
        el('td', { text: x.who }),
        el('td', { class: 'num', text: x.times + '回' }),
        el('td', { class: 'num', text: x.per + '分' }),
        el('td', { class: 'num' }, [el('span', { class: 'hbar' }, [bar(m, 72, x.way), el('span', { class: 'hbar__v', text: C.fmtHours(m) + '時間' })])]),
        el('td', { class: 'num', text: C.fmtYen(C.yen(m, ui.wage)) + '円' }),
        el('td', null, [wayTag(x.way)])
      ]))
    })
    t.appendChild(body)
    var foot = el('tfoot')
    foot.appendChild(el('tr', { class: 'total' }, [
      el('th', { scope: 'row', text: '合計' }),
      el('td', { text: '表示中 ' + sum.n + '作業' }),
      el('td'), el('td'), el('td'),
      el('td', { class: 'num', text: sum.hours + '時間' }),
      el('td', { class: 'num', text: C.fmtYen(sum.yen) + '円' }),
      el('td')
    ]))
    if (ui.way !== 'all') {
      foot.appendChild(el('tr', { class: 'total-all' }, [el('td', { colspan: '8', text: '15作業の合計は ' + all.hours + '時間・' + C.fmtYen(all.yen) + '円です。' })]))
    }
    t.appendChild(foot)
    tb.appendChild(t)

    // カード（1024px 以下）
    var cd = $('task-cards')
    clear(cd)
    var grid = el('div', { class: 'cards' })
    list.forEach(function (x) {
      var m = C.minutes(x)
      grid.appendChild(el('article', { class: 'card', 'data-no': x.no }, [
        el('h3', { class: 'card__h', text: x.no + ' ' + x.name }),
        el('p', { class: 'card__tag' }, [wayTag(x.way)]),
        el('p', { class: 'card__meta', text: x.who + '・月' + x.times + '回 × ' + x.per + '分' }),
        el('p', { class: 'card__val' }, [bar(m, 160, x.way), el('span', { text: C.fmtHours(m) + '時間・' + C.fmtYen(C.yen(m, ui.wage)) + '円' })]),
        el('p', { class: 'card__why', text: x.reason })
      ]))
    })
    cd.appendChild(grid)
    var box = el('div', { class: 'card-total' }, [el('p', { class: 'card-total__main', text: '合計（表示中 ' + sum.n + '作業）' + sum.hours + '時間・' + C.fmtYen(sum.yen) + '円' })])
    if (ui.way !== 'all') box.appendChild(el('p', { class: 'note note--tight', text: '15作業の合計は ' + all.hours + '時間・' + C.fmtYen(all.yen) + '円です。' }))
    cd.appendChild(box)
    return list.length
  }

  // ---------- 2 提案書 ----------
  function drawProposals () {
    var p = C.proposalTotals(ui.wage)
    $('pr-meta').textContent = '時給 ' + C.fmtYen(ui.wage) + '円で計算'
    $('pr-sum').textContent = '月' + p.hours + '時間・' + C.fmtYen(p.yen) + '円'
    var box = $('pr-list')
    clear(box)
    D.PROPOSALS.forEach(function (x) {
      var s = C.proposalSaving(x, ui.wage)
      var top = el('p', { class: 'proposal__top' }, [el('span', { class: 'proposal__no', text: x.no }), wayTag(x.way)])
      if (x.first) top.appendChild(el('span', { class: 'tag tag--first', text: '1本目に作る' }))
      var risks = el('ul', { class: 'dots dots--tight' })
      x.risks.forEach(function (r) { risks.appendChild(el('li', { text: r })) })
      box.appendChild(el('article', { class: 'proposal proposal--' + x.way, 'data-no': x.no }, [
        top,
        el('h3', { class: 'proposal__h', text: x.title }),
        el('p', { class: 'proposal__lab', text: '何を作るか' }), el('p', { class: 'proposal__p', text: x.what }),
        el('p', { class: 'proposal__lab', text: '減る見込み（推測）' }),
        el('p', { class: 'proposal__big', text: '月' + s.hours + '時間・' + C.fmtYen(s.yen) + '円' }),
        el('p', { class: 'proposal__sub', text: '対象：' + C.targetLabel(x) }),
        el('p', { class: 'proposal__sub', text: C.fmtYen(s.before) + '分 → ' + C.fmtYen(s.after) + '分' }),
        el('p', { class: 'proposal__lab', text: '作る手間' }), el('p', { class: 'proposal__p', text: x.effort }),
        el('p', { class: 'proposal__lab', text: 'お店の月額の費用' }), el('p', { class: 'proposal__p', text: x.cost }),
        el('p', { class: 'proposal__lab', text: 'リスクと対策' }), risks,
        el('p', { class: 'proposal__lab', text: x.reasonLabel }), el('p', { class: 'proposal__p', text: x.reason })
      ]))
    })
  }

  // ---------- 3 使い方ルール ----------
  function buildRules () {
    var ol = $('rule-list')
    D.RULES.forEach(function (r, i) {
      var inp = el('input', { type: 'checkbox', id: 'chk-' + r.id, class: 'chk__in' })
      inp.addEventListener('change', function () {
        ui.checks[r.id] = inp.checked
        var n = drawRuleCount()
        say(C.sayCheck(n))
      })
      ol.appendChild(el('li', { class: 'rule' }, [
        el('div', { class: 'rule__text' }, [
          el('p', { class: 'rule__h', text: (i + 1) + '. ' + r.title }),
          el('p', { class: 'rule__p', text: r.body })
        ]),
        el('label', { class: 'chk', for: 'chk-' + r.id }, [inp, el('span', { class: 'chk__box', 'aria-hidden': 'true' }, [icon('i-chk', 16)]), el('span', { text: '店で決めた' }), el('span', { class: 'visually-hidden', text: '（' + r.title + '）' })])
      ]))
    })
  }
  function ruleCount () {
    var n = 0
    D.RULES.forEach(function (r) { if (ui.checks[r.id]) n++ })
    return n
  }
  function drawRuleCount () {
    var n = ruleCount()
    $('rule-n').textContent = '店で決めた ' + n + ' / ' + D.RULES.length
    $('rule-all').hidden = n !== D.RULES.length
    return n
  }

  // ---------- 4 ふりかえり ----------
  function drawReview () {
    var rows = C.reviewRows(ui.wage)
    var tb = $('rv-table')
    clear(tb)
    var t = el('table', { class: 'rv-table' })
    t.appendChild(el('caption', { class: 'visually-hidden', text: '1か月後のふりかえり表（提案1）' }))
    var hr = el('tr')
    ;['項目', '見込み', '実際（架空）', '差', '判断'].forEach(function (h) { hr.appendChild(el('th', { scope: 'col', text: h })) })
    t.appendChild(el('thead', null, [hr]))
    var body = el('tbody')
    rows.forEach(function (r) {
      body.appendChild(el('tr', { class: r.judge === '直す' ? 'is-fix' : null, 'data-no': r.no }, [
        el('th', { scope: 'row', text: r.item }),
        el('td', { text: r.plan }), el('td', { text: r.actual }), el('td', { class: 'diff', text: r.diff }), el('td', { class: 'judge-cell', text: r.judge })
      ]))
    })
    t.appendChild(body)
    tb.appendChild(t)
    var cd = $('rv-cards')
    clear(cd)
    var grid = el('div', { class: 'cards' })
    rows.forEach(function (r) {
      grid.appendChild(el('article', { class: 'card' + (r.judge === '直す' ? ' is-fix' : ''), 'data-no': r.no }, [
        el('h3', { class: 'card__h', text: r.item }),
        el('p', { class: 'card__line' }, [el('span', { class: 'card__k', text: '見込み ' }), r.plan]),
        el('p', { class: 'card__line' }, [el('span', { class: 'card__k', text: '実際 ' }), r.actual]),
        el('p', { class: 'card__line' }, [el('span', { class: 'card__k', text: '差 ' }), r.diff]),
        el('p', { class: 'card__judge' }, [el('span', { class: 'card__k', text: '判断 ' }), r.judge])
      ]))
    })
    cd.appendChild(grid)
  }

  // ---------- 操作 ----------
  function redrawWage () {
    drawCover()
    drawTasks()
    drawProposals()
    drawReview()
    syncChips('wage-quick', ui.wage)
  }
  function setWage (n) {
    ui.wage = n
    $('wage').value = String(n)
    $('wage').removeAttribute('aria-invalid')
    $('wage-err').hidden = true
    $('wage-err').textContent = ''
    redrawWage()
  }
  function readWage () {
    var n = C.parseWage($('wage').value)
    if (n === null) {
      $('wage').setAttribute('aria-invalid', 'true')
      $('wage-err').textContent = '800〜3,000円の、10円きざみで入れてください。いまは ' + C.fmtYen(ui.wage) + '円のまま計算しています。'
      $('wage-err').hidden = false
      say(C.sayWageBad())
      return
    }
    setWage(n)
    say(C.sayWage(n))
  }
  function setSort (k) {
    ui.sort = k
    syncChips('sort', k)
    drawTasks()
    say(C.saySort(k))
  }
  function setWay (w) {
    ui.way = w
    syncChips('filter', w)
    var n = drawTasks()
    say(C.sayFilter(w, n))
  }
  function resetAll () {
    ui.sort = 'no'
    ui.way = 'all'
    syncChips('sort', 'no')
    syncChips('filter', 'all')
    D.RULES.forEach(function (r) { ui.checks[r.id] = false; $('chk-' + r.id).checked = false })
    drawRuleCount()
    setWage(D.WAGE0)
    say('最初の状態に戻しました。')
  }

  // ---------- CSV ----------
  function saveCsv (text, name, msg) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = el('a', { href: url, download: name })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    say(msg)
  }

  // ---------- 印刷（A4 縦。#print-root に作り、終わったら空にする） ----------
  function prTable (cls, heads) {
    var t = el('table', { class: 'pr-table ' + cls })
    var hr = el('tr')
    heads.forEach(function (h) { hr.appendChild(el('th', { text: h })) })
    t.appendChild(el('thead', null, [hr]))
    var b = el('tbody')
    t.appendChild(b)
    return { t: t, b: b }
  }
  function prHead (no, text) { return el('h2', { class: 'pr-h' }, [no ? el('span', { class: 'pr-h__no', text: no }) : null, text]) }
  function buildPrint () {
    var root = $('print-root')
    clear(root)
    var tt = C.totals(D.TASKS, ui.wage)
    var pt = C.proposalTotals(ui.wage)
    var pf = C.firstSaving(ui.wage)
    var p1 = el('div', { class: 'pr-page' })
    p1.appendChild(el('p', { class: 'pr-title', text: '焼き菓子とケーキ ミツカド舎（架空）AI 活用の診断　2026年11月13日' }))
    p1.appendChild(el('p', { text: 'AI の診断を自動で行う画面ではありません。聞き取りのあとにお渡しする書類の見本です。' }))
    p1.appendChild(el('p', { class: 'pr-sum', text: '診断日 2026年11月13日／棚卸した作業 ' + tt.n + '／月の合計 ' + tt.hours + '時間／月の見込み額 ' + C.fmtYen(tt.yen) + '円（時給 ' + C.fmtYen(ui.wage) + '円）／1本目（私たちが作る分）で減る見込み 月' + pf.hours + '時間（' + C.fmtYen(pf.yen) + '円・推測・時給で換算した参考額）' }))
    p1.appendChild(prHead('1', '業務の棚卸表（15作業）'))
    var t1 = prTable('pr-tasks', ['番号', '作業', '理由', '誰が', '回数', '1回', '時間', '額'])
    D.TASKS.forEach(function (x) {
      var m = C.minutes(x)
      t1.b.appendChild(el('tr', null, [el('td', { text: x.no }), el('td', null, [el('span', { class: 'pr-name', text: x.name }), el('span', { class: 'pr-way', text: '［' + C.WAY_NAME[x.way] + '］' })]), el('td', { text: x.reason }), el('td', { text: x.who }), el('td', { class: 'num', text: x.times + '回' }), el('td', { class: 'num', text: x.per + '分' }), el('td', { class: 'num', text: C.fmtHours(m) + '時間' }), el('td', { class: 'num', text: C.fmtYen(C.yen(m, ui.wage)) + '円' })]))
    })
    t1.b.appendChild(el('tr', { class: 'pr-total' }, [el('td', { text: '合計' }), el('td', { text: tt.n + '作業' }), el('td'), el('td'), el('td'), el('td'), el('td', { class: 'num', text: tt.hours + '時間' }), el('td', { class: 'num', text: C.fmtYen(tt.yen) + '円' })]))
    p1.appendChild(t1.t)
    root.appendChild(p1)

    var p2 = el('div', { class: 'pr-page pr-break' })
    p2.appendChild(prHead('2', '提案書（効く順に3つ）'))
    p2.appendChild(el('p', { class: 'pr-sum', text: '3つすべてを行った場合の試算（推測）：月' + pt.hours + '時間・' + C.fmtYen(pt.yen) + '円　額は時給 ' + C.fmtYen(ui.wage) + '円で換算した参考額' }))
    D.PROPOSALS.forEach(function (x) {
      var s = C.proposalSaving(x, ui.wage)
      var b = el('div', { class: 'pr-prop' })
      b.appendChild(el('p', { class: 'pr-prop__h', text: x.no + '　' + x.title + '　［' + C.WAY_NAME[x.way] + '］' + (x.first ? '［1本目に作る］' : '') }))
      b.appendChild(el('p', { text: '何を作るか：' + x.what }))
      b.appendChild(el('p', { text: '減る見込み（推測）：月' + s.hours + '時間・' + C.fmtYen(s.yen) + '円　対象：' + C.targetLabel(x) + '　' + C.fmtYen(s.before) + '分 → ' + C.fmtYen(s.after) + '分' }))
      b.appendChild(el('p', { text: '作る手間：' + x.effort }))
      b.appendChild(el('p', { text: 'お店の月額の費用：' + x.cost }))
      b.appendChild(el('p', { text: 'リスクと対策：' + x.risks.join('／') }))
      b.appendChild(el('p', { text: x.reasonLabel + '：' + x.reason }))
      p2.appendChild(b)
    })
    root.appendChild(p2)

    var p3 = el('div', { class: 'pr-page pr-break pr-rules' })
    p3.appendChild(prHead('3', 'ミツカド舎　AI の使い方ルール（ひな形）'))
    p3.appendChild(el('p', { text: '決めた日：____年__月__日　見直し：月1回（ふりかえりの日）' }))
    var ol = el('ol', { class: 'pr-rule-list' })
    D.RULES.forEach(function (r, i) {
      ol.appendChild(el('li', { class: 'pr-rule' }, [
        el('div', null, [el('p', { class: 'pr-rule__h', text: (i + 1) + '. ' + r.title }), el('p', { text: r.body })]),
        el('p', { class: 'pr-rule__chk', text: '店で決めた：' + (ui.checks[r.id] ? 'はい' : 'まだ') })
      ]))
    })
    p3.appendChild(ol)
    root.appendChild(p3)

    var p4 = el('div', { class: 'pr-page pr-break' })
    p4.appendChild(prHead('4', '1か月後のふりかえり（見本）　使い始め 2026-11-18・ふりかえり 2026-12-18（架空）'))
    var t4 = prTable('pr-rv', ['項目', '見込み', '実際（架空）', '差', '判断'])
    C.reviewRows(ui.wage).forEach(function (r) {
      t4.b.appendChild(el('tr', null, [el('td', { text: r.item }), el('td', { text: r.plan }), el('td', { text: r.actual }), el('td', { text: r.diff }), el('td', { text: r.judge })]))
    })
    p4.appendChild(t4.t)
    p4.appendChild(el('p', { class: 'pr-sum', text: '提案1をどうするか：続ける／［直して続ける（選んだもの）］／やめる' }))
    p4.appendChild(el('p', { text: '減った時間は見込みより44分少なめでした。焼き数の表で、曜日と天気の補正を手で直す回数が多かったためです。補正の列を足して続けます。発注の数の計算は見込みどおりなので、そのまま続けます。' }))
    p4.appendChild(el('p', { text: '次にすること：焼き数の表に「補正」の列を足す（店長と30分）／提案2を始めるかを決める（使い方ルールの8項目が決まってから）／次のふりかえり（お店で）：2027-01-15' }))
    p4.appendChild(el('p', { class: 'pr-foot', text: 'デモ（架空のお店）。時間・金額はすべて架空の見込みです。このページは AI を動かしておらず、AI のサービスへの送信はありません。' }))
    root.appendChild(p4)
  }

  // ---------- はじめ ----------
  chips('wage-quick', QUICK.map(function (w) { return { v: w, t: C.fmtYen(w) + '円' } }), function (w) { setWage(w); say(C.sayWage(w)) }, 'chip--wage')
  chips('sort', C.SORTS.map(function (s) { return { v: s.id, t: s.name } }), setSort)
  chips('filter', [{ v: 'all', t: 'すべて' }].concat(D.WAYS.map(function (w) { return { v: w.id, t: w.name } })), setWay)
  syncChips('sort', ui.sort)
  syncChips('filter', ui.way)
  $('wage').value = String(ui.wage)
  $('wage').addEventListener('change', readWage)
  $('reset-all').addEventListener('click', resetAll)
  $('csv-tasks').addEventListener('click', function () { saveCsv(C.tasksCsv(ui.wage), 'mitsukado_tanaoroshi.csv', '棚卸表の CSV を保存しました。') })
  $('csv-props').addEventListener('click', function () { saveCsv(C.proposalsCsv(ui.wage), 'mitsukado_teian.csv', '提案の CSV を保存しました。') })
  // beforeprint が来ないブラウザでも中身が出るよう、先に作ってから印刷する
  $('print-btn').addEventListener('click', function () { buildPrint(); window.print() })
  window.addEventListener('beforeprint', buildPrint)
  window.addEventListener('afterprint', function () { clear($('print-root')) })
  // 目次：行き先の見出しへフォーカス（スクロールはブラウザのアンカーに任せる）
  Array.prototype.forEach.call(document.querySelectorAll('.js-jump'), function (a) {
    a.addEventListener('click', function () {
      var h = $(a.getAttribute('data-h'))
      setTimeout(function () { h.focus({ preventScroll: true }) }, 0)
    })
  })
  drawLegend()
  buildRules()
  drawRuleCount()
  redrawWage()
  // 試験のための入口（状態は返さない）
  window.__demo41 = { buildPrint: buildPrint }
})()
