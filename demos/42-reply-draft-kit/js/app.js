// 返信の下書きキットの見本（ミツカド舎・架空）の画面
// 種類・貼った文・確認はメモリだけ（保存しない・外へ送らない）。表示は textContent と createElement だけで作る
(function () {
  'use strict'
  var C = window.Calc42
  var D = C.D
  var SVGNS = 'http://www.w3.org/2000/svg'
  var CLS_ICON = { ai: 'w-ai', shop: 'w-shop' }
  var ui = { kind: null, checks: D.CHECKS.map(function () { return false }) }

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

  // ---------- 札 ----------
  function clsTag (cls) { return el('span', { class: 'tag tag--' + cls }, [icon(CLS_ICON[cls]), D.CLS_NAME[cls]]) }
  function setState (id, text, okCls) {
    var e = $(id)
    e.textContent = text
    e.classList.toggle('is-ok', !!okCls)
  }

  // ---------- 1 種類のカード ----------
  function buildKinds () {
    var box = $('kinds')
    D.KINDS.forEach(function (k) {
      var inp = el('input', { type: 'radio', name: 'kind', id: 'kind-' + k.id, value: k.id, class: 'kind__in' })
      inp.addEventListener('change', function () { if (inp.checked) pickKind(k.id) })
      box.appendChild(el('label', { class: 'kind kind--' + k.cls, for: 'kind-' + k.id, 'data-id': k.id }, [
        inp,
        el('span', { class: 'kind__on', 'aria-hidden': 'true' }, [icon('i-chk', 14)]),
        el('span', { class: 'kind__name', text: k.name }),
        clsTag(k.cls),
        el('span', { class: 'kind__ex', text: k.example }),
        el('span', { class: 'kind__sel visually-hidden', text: '' })
      ]))
    })
  }
  function drawKinds () {
    Array.prototype.forEach.call($('kinds').querySelectorAll('.kind'), function (lab) {
      var on = lab.getAttribute('data-id') === ui.kind
      lab.classList.toggle('is-on', on)
      lab.querySelector('.kind__in').checked = on
      lab.querySelector('.kind__sel').textContent = on ? '選んでいます' : ''
    })
    $('kind-hint').hidden = !!ui.kind
    setState('st-kind', ui.kind ? C.KIND_BY_ID[ui.kind].name : '未選択')
  }

  // ---------- 2 置き換え ----------
  function buildSamples () {
    var box = $('samples')
    D.SAMPLES.forEach(function (s) {
      var b = el('button', { type: 'button', class: 'btn-sub', id: 'sample-' + s.id, 'aria-pressed': 'false', text: s.label })
      b.addEventListener('click', function () { useSample(s) })
      box.appendChild(b)
    })
  }
  function drawSamples (text) {
    var t = C.normalize(text)
    D.SAMPLES.forEach(function (s) { $('sample-' + s.id).setAttribute('aria-pressed', t === s.text ? 'true' : 'false') })
  }
  function drawRedact (text, r) {
    var blank = C.isBlank(text)
    setState('st-paste', C.pasteState(text, r))
    var tot = $('total')
    clear(tot)
    tot.classList.toggle('is-on', !blank && r.total > 0)
    if (blank) tot.textContent = '置き換え 0か所'
    else if (!r.total) tot.textContent = '置き換える所は見つかりませんでした。見つけ漏れがあり得るので、最後は人の目で確かめてください。'
    else tot.appendChild(el('span', null, [el('span', { class: 'total__u', text: '置き換え ' }), String(r.total), el('span', { class: 'total__u', text: 'か所' })]))
    var dl = $('found')
    clear(dl)
    C.COUNT_KEYS.forEach(function (x) {
      var n = r.counts[x.k]
      dl.appendChild(el('div', { 'data-k': x.k }, [el('dt', { text: x.label }), el('dd', { class: n ? 'is-on' : null, text: String(n) })]))
    })
    var res = $('result')
    clear(res)
    if (blank) {
      res.appendChild(el('p', { class: 'result__empty', text: '届いた文を左（スマホは上）の欄に貼ると、ここに置き換えた文が出ます。' }))
      return
    }
    C.pieces(r).forEach(function (p) {
      if (p.k) res.appendChild(el('mark', { 'data-k': p.k, text: p.t }))
      else res.appendChild(document.createTextNode(p.t))
    })
  }

  // ---------- 3 頼み方の文・ひな形 ----------
  function fillTpl (box, text) {
    clear(box)
    C.slots(text).forEach(function (p) {
      if (p.slot) box.appendChild(el('span', { class: 'slot', text: p.t }))
      else box.appendChild(document.createTextNode(p.t))
    })
  }
  var lastPrompt = null
  function drawPrompt (text, r) {
    var cls = C.kindClass(ui.kind)
    var prompt = cls === 'ai' ? C.buildPrompt(ui.kind, r.text) : null
    var showShop = cls === 'shop'
    var showAi = cls === 'ai' && prompt !== null
    $('prompt-wait').hidden = showShop || showAi
    $('out-ai').hidden = !showAi
    $('out-shop').hidden = !showShop
    if (showShop) setState('st-prompt', D.CLS_NAME.shop)
    else if (showAi) setState('st-prompt', D.CLS_NAME.ai)
    else setState('st-prompt', '未作成')
    if (showAi) {
      if (prompt !== lastPrompt) {
        $('prompt-box').textContent = prompt
        $('msg-prompt').hidden = true
      }
      fillTpl($('tpl-ai'), C.template(ui.kind))
    }
    if (showShop) fillTpl($('tpl-shop'), C.template(ui.kind))
    lastPrompt = prompt
  }

  // ---------- 4 送る前の確認 ----------
  function buildChecks () {
    var ul = $('checks')
    D.CHECKS.forEach(function (c, i) {
      var inp = el('input', { type: 'checkbox', id: 'chk-' + c.id, class: 'chk__in' })
      inp.addEventListener('change', function () {
        ui.checks[i] = inp.checked
        $('reset-note').hidden = true
        var n = drawChecks()
        if (inp.checked && n === D.CHECKS.length) say('送ってよいになりました。')
      })
      ul.appendChild(el('li', null, [
        el('label', { class: 'chk', for: 'chk-' + c.id }, [inp, el('span', { class: 'chk__box', 'aria-hidden': 'true' }, [icon('i-chk', 16)]), el('span', { class: 'chk__t', text: c.text })])
      ]))
    })
  }
  function drawChecks () {
    var n = C.checkedN(ui.checks)
    var ok = C.canSend(ui.checks)
    D.CHECKS.forEach(function (c, i) { $('chk-' + c.id).checked = ui.checks[i] })
    setState('st-check', C.checkState(n), ok)
    var go = $('go')
    clear(go)
    go.classList.toggle('is-ok', ok)
    if (ok) go.appendChild(el('span', { class: 'go__tag' }, [icon('i-chk', 14), '送ってよい']))
    go.appendChild(document.createTextNode(C.goText(n)))
    return n
  }
  // 文・種類が変わったら、確認を外す（1つ以上付いていた時だけ知らせる）
  function dropChecks () {
    if (C.checkedN(ui.checks) === 0) return
    ui.checks = D.CHECKS.map(function () { return false })
    $('reset-note').hidden = false
    drawChecks()
  }

  // ---------- まとめて描く ----------
  var lastSay = ''
  function render (speak) {
    var text = $('src-text').value
    var r = C.redact(text)
    drawKinds()
    drawSamples(text)
    drawRedact(text, r)
    drawPrompt(text, r)
    if (speak && !C.isBlank(text)) {
      var s = C.sayRedact(r)
      if (s !== lastSay) say(s)
      lastSay = s
    }
    if (C.isBlank(text)) lastSay = ''
  }

  // ---------- 操作 ----------
  function pickKind (id) {
    if (ui.kind === id) return
    ui.kind = id
    dropChecks()
    hideMsgs()
    render(false)
  }
  function useSample (s) {
    var changed = $('src-text').value !== s.text || ui.kind !== s.kind
    $('src-text').value = s.text
    ui.kind = s.kind
    if (changed) dropChecks()
    hideMsgs()
    render(true)
  }
  function onInput () {
    dropChecks()
    render(true)
  }
  function hideMsgs () {
    $('msg-prompt').hidden = true
    $('msg-tpl').hidden = true
  }
  function resetAll () {
    ui.kind = null
    ui.checks = D.CHECKS.map(function () { return false })
    $('src-text').value = ''
    $('reset-note').hidden = true
    hideMsgs()
    lastPrompt = null
    lastSay = ''
    drawChecks()
    render(false)
    say('最初の状態に戻しました。')
  }

  // ---------- コピー（navigator.clipboard。使えなければ文を選択状態にする。外へは送らない） ----------
  function selectBox (box) {
    var sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    var range = document.createRange()
    range.selectNodeContents(box)
    sel.addRange(range)
  }
  function copyText (text, box, msgId) {
    var msg = $(msgId)
    var ok = function () {
      msg.textContent = 'コピーしました。お店の AI サービスに貼ってください。このページからはどこにも送っていません。'
      msg.hidden = false
      say(msg.textContent)
    }
    var ng = function () {
      selectBox(box)
      msg.textContent = 'コピーできませんでした。文を選んだので、長押しかキー操作でコピーしてください。'
      msg.hidden = false
      say(msg.textContent)
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, ng)
      else ng()
    } catch (e) { ng() }
  }

  // ---------- 記録の表とカード ----------
  function drawRecord () {
    var rows = C.recordRows()
    $('rec-period').textContent = D.RECORD.period
    var heads = ['項目', '見込み（診断の提案2）', '実際（架空）', '差']
    var t = el('table', { class: 'rec-table' })
    t.appendChild(el('caption', { class: 'visually-hidden', text: '使ったあとの記録（見本）' + D.RECORD.period }))
    var hr = el('tr')
    heads.forEach(function (h) { hr.appendChild(el('th', { scope: 'col', text: h })) })
    t.appendChild(el('thead', null, [hr]))
    var body = el('tbody')
    rows.forEach(function (r) {
      body.appendChild(el('tr', { 'data-id': r.id }, [el('th', { scope: 'row', text: r.item }), el('td', { text: r.plan }), el('td', { text: r.actual }), el('td', { text: r.diff })]))
    })
    t.appendChild(body)
    $('rec-table').appendChild(t)
    var grid = el('div', { class: 'cards' })
    rows.forEach(function (r) {
      grid.appendChild(el('article', { class: 'card', 'data-id': r.id }, [
        el('h3', { class: 'card__h', text: r.item }),
        el('p', { class: 'card__line' }, [el('span', { class: 'card__k', text: '見込み ' }), r.plan]),
        el('p', { class: 'card__line' }, [el('span', { class: 'card__k', text: '実際 ' }), r.actual]),
        el('p', { class: 'card__line' }, [el('span', { class: 'card__k', text: '差 ' }), r.diff])
      ]))
    })
    $('rec-cards').appendChild(grid)
    $('rec-sum').textContent = D.RECORD.summary
  }

  // ---------- 印刷（A4 縦。#print-root に作り、終わったら空にする。貼った文は入れない） ----------
  function buildPrint () {
    var root = $('print-root')
    clear(root)
    root.appendChild(el('p', { class: 'pr-title', text: 'ミツカド舎　返信のひな形（10通り）' }))
    root.appendChild(el('p', { class: 'pr-lead', text: '【】は差し込み欄です。アレルギー・原材料・値段・送料・日持ち・補償は、店の表を見て店長が書きます。' }))
    D.KINDS.forEach(function (k) {
      root.appendChild(el('div', { class: 'pr-kind' }, [
        el('p', { class: 'pr-kind__h', text: k.id + ' ' + k.name + '（' + D.CLS_NAME[k.cls] + '）' }),
        el('p', { class: 'pr-kind__t', text: C.template(k.id) })
      ]))
    })
    var ul = el('ul')
    D.CHECKS.forEach(function (c) { ul.appendChild(el('li', { text: '□ ' + c.text })) })
    root.appendChild(el('div', { class: 'pr-checks' }, [el('p', { class: 'pr-checks__h', text: '送る前の確認（5つ）' }), ul]))
    root.appendChild(el('p', { class: 'pr-foot', text: 'デモ（架空のお店）。焼き菓子とケーキ ミツカド舎は架空のお店です。このページは AI を動かしていません。' }))
  }

  // ---------- はじめ ----------
  buildKinds()
  buildSamples()
  buildChecks()
  drawRecord()
  $('src-text').addEventListener('input', onInput)
  $('reset-all').addEventListener('click', resetAll)
  $('copy-prompt').addEventListener('click', function () { copyText($('prompt-box').textContent, $('prompt-box'), 'msg-prompt') })
  $('copy-tpl').addEventListener('click', function () { copyText(C.template(ui.kind), $('tpl-shop'), 'msg-tpl') })
  // beforeprint が来ないブラウザでも中身が出るよう、先に作ってから印刷する
  $('print-btn').addEventListener('click', function () { buildPrint(); window.print() })
  window.addEventListener('beforeprint', buildPrint)
  window.addEventListener('afterprint', function () { clear($('print-root')) })
  drawChecks()
  render(false)
  // 試験のための入口（状態は返さない）
  window.__demo42 = { buildPrint: buildPrint }
})()
