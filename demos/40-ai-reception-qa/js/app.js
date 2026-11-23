// AI 受付の答える範囲とテストの記録（ヨツツジ食堂・架空）の画面
// 絞り込みと見直しの判断はメモリだけ（保存しない・外へ送らない）。表示は textContent と createElement だけで作る
(function () {
  'use strict'
  var C = window.Calc40
  var D = C.D
  var SVGNS = 'http://www.w3.org/2000/svg'
  var ui = { cat: 'all', text: '', result: 'all', expect: 'all', dec: C.seedDecisions() }

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
  function hidden (t) { return el('span', { class: 'visually-hidden', text: t }) }

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

  // ---------- 札 ----------
  var RES_ICON = { pass: 's-pass', fixed: 's-fixed', todo: 's-todo' }
  function resultTag (r) { return el('span', { class: 'tag tag--' + r }, [icon(RES_ICON[r]), C.RESULT_NAME[r]]) }
  function expectTag (t) {
    return el('span', { class: 'tag tag--' + t.expect }, [icon(t.expect === 'answer' ? 'i-answer' : 'i-hand'), C.expectLabel(t)])
  }
  function fixedTag (no) { return el('span', { class: 'tag-fixed', text: 'テストで直した（' + no + '）' }) }
  function stat (lab, num, sub, seal) {
    return el('div', { class: 'stat' }, [el('p', { class: 'stat__lab', text: lab }), el('p', { class: 'stat__num' + (seal ? ' is-seal' : ''), text: num }), el('p', { class: 'stat__sub', text: sub })])
  }
  function table (cls, caption, heads) {
    var t = el('table', { class: 'form-table ' + cls })
    t.appendChild(el('caption', { class: 'visually-hidden', text: caption }))
    var hr = el('tr')
    heads.forEach(function (h) { hr.appendChild(el('th', { scope: 'col', text: h })) })
    t.appendChild(el('thead', null, [hr]))
    var b = el('tbody')
    t.appendChild(b)
    return { t: t, b: b }
  }

  // ---------- 絞り込みボタン（aria-pressed。1つだけ選べる） ----------
  function chips (boxId, items, get, set) {
    var box = $(boxId)
    items.forEach(function (it) {
      var b = el('button', { type: 'button', class: 'chip', 'data-v': it.v, 'aria-pressed': 'false' }, [icon('i-chk', 16, 'chip__chk'), it.t])
      b.addEventListener('click', function () {
        if (get() === it.v) return
        set(it.v)
      })
      box.appendChild(b)
    })
  }
  function syncChips (boxId, v) {
    Array.prototype.forEach.call($(boxId).querySelectorAll('.chip'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false') })
  }

  // ---------- 表紙の帯・記録3 の要約 ----------
  function drawCover () {
    var s = C.testSummary()
    var h = C.handoffSummary()
    var all = C.fmt10(s.rateAll10) + '%'
    var first = C.fmt10(s.rateFirst10) + '%'
    $('cv-qa').textContent = D.QA.length + '問'
    $('cv-qa-sub').textContent = D.CATS.length + 'つの分類 × ' + (D.QA.length / D.CATS.length) + '問'
    $('cv-ho').textContent = h.groups + '分類'
    $('cv-test').textContent = s.total + '件'
    $('cv-test-sub').textContent = '答える ' + s.answer + '件・人へ回す ' + s.handoff + '件'
    $('cv-rate').textContent = all
    $('cv-rate-sub').textContent = '修正後合格を含む（' + s.okAll + ' / ' + s.total + '）。含まないと ' + first + '（' + s.pass + ' / ' + s.total + '）'
    $('cv-todo').textContent = s.todo + '件'
    $('ts-all').textContent = all
    $('ts-all-sub').textContent = s.total + '件のうち ' + s.okAll + '件'
    $('ts-first').textContent = first
    $('ts-first-sub').textContent = s.total + '件のうち ' + s.pass + '件'
    $('ts-todo').textContent = s.todo + '件'
    $('ts-todo-sub').textContent = '答える ' + s.todoAnswer + '件・人へ回す ' + s.todoHandoff + '件'
    $('ts-wrong').textContent = s.wrongNow + '件'
    $('ts-wrong').className = 'stat__num' + (s.wrongNow ? ' is-seal' : '')
    $('ts-wrong-sub').textContent = '1回目は ' + s.wrongFirst + '件。' + (s.wrongFirst - s.wrongNow) + '件を直しました'
    $('ho-meta').textContent = '合図の言葉 ' + h.words + '・うち 11/2 に追加 ' + h.added
  }

  // ---------- 記録1 ----------
  function drawQa () {
    var list = C.filterQa(ui.cat, ui.text)
    $('qa-n').textContent = list.length + '件'
    var empty = $('qa-empty')
    var tb = $('qa-table')
    var cd = $('qa-cards')
    clear(tb)
    clear(cd)
    if (!list.length) {
      empty.textContent = '「' + ui.text.trim() + '」に当たる質問はありません。答えるか人へ回すかは、記録 4 の見直しで決めます。'
      empty.hidden = false
      return list.length
    }
    empty.hidden = true
    var T = table('qa-t', '答える範囲の表。Q&A 30問', ['番号', '分類', '質問の例', '答えの文', '最終確認日'])
    list.forEach(function (q) {
      var cat = C.catOf(q.cat).short
      var ans = el('td', null, [el('span', { class: 'cell-p', text: q.a })])
      if (q.fixedBy) ans.appendChild(el('span', { class: 'cell-tag' }, [fixedTag(q.fixedBy)]))
      T.b.appendChild(el('tr', null, [
        el('th', { scope: 'row', class: 'no', text: q.no }),
        el('td', { text: cat }),
        el('td', { text: C.qaQuestions(q) }),
        ans,
        el('td', { class: 'date', text: q.checked })
      ]))
      cd.appendChild(el('article', { class: 'card' }, [
        el('h3', { class: 'card__h' }, [el('span', { class: 'card__no', text: q.no }), ' ', el('span', { class: 'card__cat', text: cat })]),
        el('p', { class: 'card__q', text: C.qaQuestions(q) }),
        el('p', { class: 'card__p', text: q.a }),
        el('p', { class: 'card__date', text: '最終確認日 ' + q.checked }),
        q.fixedBy ? el('p', { class: 'card__tag' }, [fixedTag(q.fixedBy)]) : null
      ]))
    })
    tb.appendChild(T.t)
    return list.length
  }

  // ---------- 記録2 ----------
  function words (h) {
    var p = el('span', { class: 'sigs' })
    h.words.forEach(function (w, i) {
      if (i) p.appendChild(document.createTextNode('・'))
      p.appendChild(w.added ? el('span', { class: 'sig sig--added' }, [w.w, hidden('（11月2日に追加）')]) : el('span', { class: 'sig', text: w.w }))
    })
    return p
  }
  function drawHandoff () {
    var T = table('ho-t', '答えさせない質問の一覧。人へ回す5分類', ['番号', '分類と、答えさせない理由', '合図の言葉', 'AI が返す決まった文', 'お店が返事する目安'])
    var cd = $('ho-cards')
    D.HANDOFF.forEach(function (h) {
      T.b.appendChild(el('tr', null, [
        el('th', { scope: 'row', class: 'no', text: h.no }),
        el('td', null, [el('span', { class: 'ho-name', text: h.name }), el('span', { class: 'reason', text: h.reason })]),
        el('td', null, [words(h)]),
        el('td', { text: h.reply }),
        el('td', { text: h.eta })
      ]))
      cd.appendChild(el('article', { class: 'card' }, [
        el('h3', { class: 'card__h' }, [el('span', { class: 'card__no', text: h.no }), ' ', el('span', { class: 'card__name', text: h.name })]),
        el('p', { class: 'reason', text: h.reason }),
        el('p', { class: 'card__lab', text: '合図の言葉：' }),
        el('p', { class: 'card__p' }, [words(h)]),
        el('p', { class: 'card__lab', text: 'AI が返す決まった文：' }),
        el('p', { class: 'card__p', text: h.reply }),
        el('p', { class: 'card__lab', text: 'お店が返事する目安：' }),
        el('p', { class: 'card__p', text: h.eta })
      ]))
    })
    $('ho-table').appendChild(T.t)
  }

  // ---------- 記録3 ----------
  function drawLegend () {
    var ul = $('ts-legend')
    ;[
      [resultTag('pass'), '：1回目で期待どおり'],
      [resultTag('fixed'), '：1回目は外れ、直して試し直して期待どおり'],
      [resultTag('todo'), '：外れていて、まだ直していない'],
      [el('span', { class: 'tag tag--answer' }, [icon('i-answer'), '答える（Q番号）']), '：その問の答えの文を返すのが正しい'],
      [el('span', { class: 'tag tag--handoff' }, [icon('i-hand'), '人へ回す（H番号）']), '：決まった文を返し、お店の人へ回すのが正しい']
    ].forEach(function (x) { ul.appendChild(el('li', null, [x[0], el('span', { text: x[1] })])) })
  }
  function fixCell (t) {
    if (t.result === 'pass') return el('td', { class: 'fix' }, [el('span', { class: 'dash', text: '—' }), hidden('直したことはありません')])
    return el('td', { class: 'fix fix--' + t.result, text: t.fix })
  }
  function drawTests () {
    var list = C.filterTests(ui.result, ui.expect)
    $('ts-n').textContent = list.length + '件'
    $('ts-empty').hidden = list.length > 0
    var tb = $('ts-table')
    var cd = $('ts-cards')
    clear(tb)
    clear(cd)
    if (!list.length) return 0
    var T = table('ts-t', '誤回答テストの記録。70件', ['番号', '質問の言い回し', '期待する動き', '結果', '直したこと'])
    list.forEach(function (t) {
      T.b.appendChild(el('tr', null, [
        el('th', { scope: 'row', class: 'no', text: t.no }),
        el('td', { text: t.q }),
        el('td', null, [expectTag(t)]),
        el('td', null, [resultTag(t.result)]),
        fixCell(t)
      ]))
      cd.appendChild(el('article', { class: 'card card--' + t.result }, [
        el('div', { class: 'card__top' }, [el('h3', { class: 'card__h card__no', text: t.no }), resultTag(t.result)]),
        el('p', { class: 'card__q', text: t.q }),
        el('p', { class: 'card__exp' }, [el('span', { class: 'card__lab-in', text: '期待 ' }), expectTag(t)]),
        t.result === 'pass' ? null : el('p', { class: 'card__fix fix--' + t.result, text: t.fix })
      ]))
    })
    tb.appendChild(T.t)
    return list.length
  }

  // ---------- 記録4 ----------
  var rvRefs = {}
  function decSelect (r, where) {
    var id = 'rv-' + where + '-' + r.no
    var sel = el('select', { id: id, class: 'dec', 'data-r': r.no })
    C.DEC_ORDER.forEach(function (k) { sel.appendChild(el('option', { value: k, text: C.DEC_NAME[k] })) })
    sel.value = ui.dec[r.no]
    sel.addEventListener('change', function () { changeDecision(r.no, sel.value) })
    var note = el('span', { class: 'dec__note', text: 'まだ決めていません' })
    return { box: [el('label', { class: 'visually-hidden', for: id, text: r.no + 'の判断' }), sel, note], sel: sel, note: note }
  }
  function questionBits (r) {
    return [el('span', { class: 'cell-p', text: r.q }), r.memo ? el('span', { class: 'memo', text: 'メモ：' + r.memo }) : null]
  }
  function buildReview () {
    var T = table('rv-t', '月1回の見直し。10月に答えられなかった質問の上位8つ', ['順', '10月に答えられなかった質問', '回数', '足す先（案）', '判断'])
    var cd = $('rv-cards')
    D.REVIEW.forEach(function (r) {
      var a = decSelect(r, 't')
      var b = decSelect(r, 'c')
      var cell = el('td', { class: 'dec-cell' }, a.box)
      var cbox = el('div', { class: 'card__dec' }, [el('p', { class: 'card__lab', text: '判断' })].concat(b.box))
      T.b.appendChild(el('tr', null, [
        el('th', { scope: 'row', class: 'no', text: r.no }),
        el('td', null, questionBits(r)),
        el('td', { class: 'num', text: r.times + '回' }),
        el('td', { text: r.target }),
        cell
      ]))
      cd.appendChild(el('article', { class: 'card' }, [
        el('div', { class: 'card__top' }, [el('h3', { class: 'card__h card__no', text: r.no }), el('span', { class: 'card__times', text: r.times + '回' })]),
        el('p', { class: 'card__q', text: r.q }),
        r.memo ? el('p', { class: 'memo', text: 'メモ：' + r.memo }) : null,
        el('p', { class: 'card__p' }, [el('span', { class: 'card__lab-in', text: '足す先（案）：' }), r.target]),
        cbox
      ]))
      rvRefs[r.no] = { sels: [a.sel, b.sel], cells: [cell, cbox] }
    })
    $('rv-table').appendChild(T.t)
    $('rv-total').textContent = '10月に答えられなかった質問の上位' + D.REVIEW.length + 'つ・合わせて ' + C.totalTimes() + '回'
  }
  function drawReview () {
    var c = C.reviewCounts(ui.dec)
    var box = $('rv-stats')
    clear(box)
    ;['qa', 'handoff', 'skip', 'none'].forEach(function (k) {
      var sub = k === 'none' && !c.none.n ? '未判断はありません' : '合わせて ' + c[k].times + '回'
      box.appendChild(stat(C.DEC_NAME[k], c[k].n + '件', sub))
    })
    $('rv-forecast').textContent = C.forecastText(c)
    D.REVIEW.forEach(function (r) {
      var ref = rvRefs[r.no]
      var v = ui.dec[r.no]
      ref.sels.forEach(function (s) { if (s.value !== v) s.value = v })
      ref.cells.forEach(function (x) { x.classList.toggle('is-none', v === 'none') })
    })
    return c
  }
  function changeDecision (no, v) {
    if (ui.dec[no] === v) return
    ui.dec[no] = v
    say(C.sayReview(drawReview()))
  }

  // ---------- 操作 ----------
  function setCat (v) {
    ui.cat = v
    syncChips('qa-cats', v)
    say(C.sayQaCat(v, drawQa()))
  }
  function setText (v) {
    ui.text = v
    say(C.sayQaText(ui.cat, v, drawQa()))
  }
  function setResult (v) {
    ui.result = v
    syncChips('ts-r', v)
    say(C.sayTests(ui.result, ui.expect, drawTests()))
  }
  function setExpect (v) {
    ui.expect = v
    syncChips('ts-e', v)
    say(C.sayTests(ui.result, ui.expect, drawTests()))
  }
  function clearQa () {
    ui.cat = 'all'
    ui.text = ''
    $('qa-q').value = ''
    syncChips('qa-cats', 'all')
    drawQa()
    $('qa-q').focus()
    say('30問すべてを出しました。')
  }
  function clearTests () {
    ui.result = 'all'
    ui.expect = 'all'
    syncChips('ts-r', 'all')
    syncChips('ts-e', 'all')
    drawTests()
    say('70件すべてを出しました。')
  }
  function resetAll () {
    ui.cat = 'all'
    ui.text = ''
    ui.result = 'all'
    ui.expect = 'all'
    ui.dec = C.seedDecisions()
    $('qa-q').value = ''
    syncChips('qa-cats', 'all')
    syncChips('ts-r', 'all')
    syncChips('ts-e', 'all')
    drawQa()
    drawTests()
    drawReview()
    $('reset-all').focus()
    say('最初の状態に戻しました。')
  }
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
  function prHead (no, title) { return el('p', { class: 'pr-h' }, [el('span', { class: 'pr-h__no', text: no }), title]) }
  function buildPrint () {
    var root = $('print-root')
    clear(root)
    var s = C.testSummary()
    var h = C.handoffSummary()
    var p1 = el('div', { class: 'pr-page' })
    p1.appendChild(el('p', { class: 'pr-title', text: '見本（架空）ヨツツジ食堂 AI 受付の設定の記録　2026年11月4日（水）時点' }))
    p1.appendChild(el('p', { text: 'AI の答えを再現する画面ではありません。設定代行でお渡しする表と記録の見本です。' }))
    p1.appendChild(el('p', { class: 'pr-sum', text: '答える範囲 ' + D.QA.length + '問／答えさせない ' + h.groups + '分類／誤回答テスト ' + s.total + '件／合格率 ' + C.fmt10(s.rateAll10) + '%（修正後合格を含む。含まないと ' + C.fmt10(s.rateFirst10) + '%）／要修正 ' + s.todo + '件' }))
    p1.appendChild(prHead('記録 1', '答える範囲の表（Q&A 30問）'))
    var t1 = prTable('pr-qa', ['番号', '分類', '質問の例', '答えの文', '最終確認日'])
    D.QA.forEach(function (q) {
      t1.b.appendChild(el('tr', null, [el('td', { text: q.no }), el('td', { text: C.catOf(q.cat).short }), el('td', { text: C.qaQuestions(q) }), el('td', { text: q.a + (q.fixedBy ? '　［テストで直した（' + q.fixedBy + '）］' : '') }), el('td', { text: q.checked })]))
    })
    p1.appendChild(t1.t)
    root.appendChild(p1)

    var p2 = el('div', { class: 'pr-page pr-break' })
    p2.appendChild(prHead('記録 2', '答えさせない質問の一覧（人へ回す）'))
    var t2 = prTable('pr-ho', ['番号', '分類と、答えさせない理由', '合図の言葉', 'AI が返す決まった文', 'お店が返事する目安'])
    D.HANDOFF.forEach(function (x) {
      var w = el('td')
      x.words.forEach(function (o, i) {
        if (i) w.appendChild(document.createTextNode('・'))
        w.appendChild(o.added ? el('span', { class: 'sig--added', text: o.w + '*' }) : document.createTextNode(o.w))
      })
      t2.b.appendChild(el('tr', null, [el('td', { text: x.no }), el('td', { text: x.name + '：' + x.reason }), w, el('td', { text: x.reply }), el('td', { text: x.eta })]))
    })
    p2.appendChild(t2.t)
    p2.appendChild(el('p', { class: 'pr-note', text: '下線と * ：11月2日のテストのあとに足した言葉' }))
    p2.appendChild(prHead('記録 4', '月1回の見直し（10月の分）'))
    var t4 = prTable('pr-rv', ['順', '10月に答えられなかった質問', '回数', '足す先（案）', '判断'])
    D.REVIEW.forEach(function (r) {
      t4.b.appendChild(el('tr', null, [el('td', { text: r.no }), el('td', { text: r.q + (r.memo ? '（メモ：' + r.memo + '）' : '') }), el('td', { text: r.times + '回' }), el('td', { text: r.target }), el('td', { text: C.DEC_NAME[ui.dec[r.no]] })]))
    })
    p2.appendChild(t4.t)
    p2.appendChild(el('p', { class: 'pr-note', text: C.forecastText(C.reviewCounts(ui.dec)) }))
    root.appendChild(p2)

    var p3 = el('div', { class: 'pr-page pr-break' })
    p3.appendChild(prHead('記録 3', '誤回答テストの記録（70件）'))
    p3.appendChild(el('p', { class: 'pr-sum', text: '合格率（修正後合格を含む）' + C.fmt10(s.rateAll10) + '%（' + s.okAll + ' / ' + s.total + '）／1回目の合格率（含まない）' + C.fmt10(s.rateFirst10) + '%（' + s.pass + ' / ' + s.total + '）／要修正 ' + s.todo + '件／人へ回す質問への誤回答：再テスト後の残り ' + s.wrongNow + '件（1回目は ' + s.wrongFirst + '件）' }))
    var t3 = prTable('pr-ts', ['番号', '質問の言い回し', '期待する動き', '結果', '直したこと'])
    D.TESTS.forEach(function (t) {
      t3.b.appendChild(el('tr', null, [el('td', { text: t.no }), el('td', { text: t.q }), el('td', { text: C.expectLabel(t) }), el('td', null, [resultTag(t.result)]), el('td', { text: t.result === 'pass' ? '—' : t.fix })]))
    })
    p3.appendChild(t3.t)
    p3.appendChild(el('p', { class: 'pr-foot', text: 'デモ（架空のお店）。数字・テストの結果はすべて架空です。このページは AI を動かしていません。' }))
    root.appendChild(p3)
  }

  // ---------- はじめ ----------
  chips('qa-cats', [{ v: 'all', t: 'すべて' }].concat(D.CATS.map(function (c) { return { v: c.id, t: c.short } })), function () { return ui.cat }, setCat)
  chips('ts-r', [{ v: 'all', t: 'すべて' }, { v: 'pass', t: '合格' }, { v: 'fixed', t: '修正後合格' }, { v: 'todo', t: '要修正' }], function () { return ui.result }, setResult)
  chips('ts-e', [{ v: 'all', t: 'すべて' }, { v: 'answer', t: '答える' }, { v: 'handoff', t: '人へ回す' }], function () { return ui.expect }, setExpect)
  syncChips('qa-cats', 'all')
  syncChips('ts-r', 'all')
  syncChips('ts-e', 'all')
  $('qa-q').value = ''
  $('qa-q').addEventListener('input', function () { setText($('qa-q').value) })
  $('qa-clear').addEventListener('click', clearQa)
  $('ts-clear').addEventListener('click', clearTests)
  $('reset-all').addEventListener('click', resetAll)
  $('csv-qa').addEventListener('click', function () { saveCsv(C.qaCsv(), 'yotsutsuji_qa_sample-demo.csv', 'Q&A の CSV を保存しました。') })
  $('csv-test').addEventListener('click', function () { saveCsv(C.testCsv(), 'yotsutsuji_test_sample-demo.csv', 'テストの記録の CSV を保存しました。') })
  // beforeprint が来ないブラウザでも中身が出るよう、先に作ってから印刷する（beforeprint でも同じ中身に作り直す）
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
  drawCover()
  drawQa()
  drawHandoff()
  drawLegend()
  drawTests()
  buildReview()
  drawReview()
  // 試験のための入口（状態は返さない。描き直しの結果だけ）
  window.__demo40 = { buildPrint: buildPrint }
})()
