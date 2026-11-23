// 多店舗の月次締めボード（ヨモスガラ食堂・架空）の画面
// 状態はメモリだけ（保存しない・外へ送らない）。表示は textContent と createElement だけで作る
(function () {
  'use strict'
  var C = window.Calc39
  var S = C.seed()
  var ui = { store: 0, nudgeStore: -1, nudgeFrom: -1 }
  var STD_KEYS = ['costT', 'costW', 'labor', 'fl', 'yoy']
  var STD_INPUT = { costT: 'cost', costW: 'cost', labor: 'labor', fl: 'fl', yoy: 'yoy' }
  var SVGNS = 'http://www.w3.org/2000/svg'

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

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
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

  // ---------- 部品 ----------
  // 状態の札（full：正式名で出す）
  function stTag (st, full) {
    var kids = [icon('s-' + st, 16)]
    if (st === 'wait' && !full) kids.push(hidden('本部の'), '確認待ち')
    else kids.push(full ? C.ST_NAME[st] : C.ST_SHORT[st])
    return el('span', { class: 'st st--' + st }, kids)
  }
  function nudgeTag () { return el('span', { class: 'tag-nudge', text: '催促' }) }
  function provTag () { return el('span', { class: 'tag-prov', text: '仮' }) }
  function btnSub (text, label, fn, cls) {
    var b = el('button', { type: 'button', class: 'btn-sub' + (cls ? ' ' + cls : ''), 'aria-label': label, text: text })
    b.addEventListener('click', fn)
    return b
  }
  function isNudge (c, si, ii) { return c.nudges.some(function (n) { return n.store === si && n.item === ii }) }

  // ---------- 要約 ----------
  function drawSum (c) {
    $('sum-rate').textContent = C.t1(c.rate) + '%'
    $('sum-rate-sub').textContent = '30項目のうち ' + c.done + '項目が完了'
    var n = c.nudges.length
    $('sum-nudge').textContent = n + '件'
    $('sum-nudge').classList.toggle('is-warn', n > 0)
    $('sum-nudge-sub').textContent = n ? '差し戻し ' + c.nudgeBack + '件・期日の近い未着手 ' + c.nudgeTodo + '件' : 'いま催促する項目はありません'
    $('sum-wait').textContent = c.counts.wait + '件'
    $('sum-mark').textContent = c.markStores ? c.markStores + '店・' + c.marks + 'か所' : '0か所'
    var sub = []
    if (c.totalMarks) sub.push('合計の行にも ' + c.totalMarks + 'か所')
    else if (!c.markStores) sub.push('基準を外れた数字はありません')
    $('sum-mark-sub').textContent = sub.join('')
    $('intro-left').textContent = 'あと' + c.daysLeft + '日'
  }

  // ---------- 1 進み具合 ----------
  function drawLegend () {
    var ul = $('legend')
    C.STATES.forEach(function (st) { ul.appendChild(el('li', null, [stTag(st, true)])) })
    ul.appendChild(el('li', { class: 'legend__nudge' }, [nudgeTag(), el('span', { text: '催促：期日まで2日以内の未着手と、差し戻し' })]))
  }
  function cellBody (c, si, ii) {
    var it = S.items[si][ii]
    var line = [el('span', { text: C.stalledText(it) })]
    if (it.st !== 'done') line.push(hidden('経過'))
    if (isNudge(c, si, ii)) line.push(nudgeTag())
    return [stTag(it.st), el('span', { class: 'st-line' }, line)]
  }
  function doneLine (c, si, card) {
    var d = c.stores[si].done
    if (d === 6) return el('span', { class: 'all-done' }, [icon('s-done', 16), card ? 'この店の締めはそろいました' : '締めがそろいました'])
    return el('span', { class: 'st-line', text: card ? '期限まで ' + c.daysLeft + '日・催促 ' + c.nudges.filter(function (n) { return n.store === si }).length + '件' : '期限まで ' + c.daysLeft + '日' })
  }
  function storeLink (si) {
    var b = el('button', { type: 'button', class: 'inline-link', 'aria-label': C.STORES[si] + 'の詳細を開く' }, [el('span', { class: 'nw', text: C.STORES[si] }), icon('i-chev', 16)])
    b.addEventListener('click', function () { selectStore(si, 'det-items-h') })
    return b
  }
  function drawBoard (c) {
    var box = $('board-table')
    clear(box)
    var tb = el('table', { class: 'grid-table board-table' })
    tb.appendChild(el('caption', { class: 'visually-hidden', text: '10月の締めの進み具合。5店×6項目' }))
    var cg = el('colgroup', null, [el('col', { class: 'c-store' })])
    C.ITEMS.forEach(function () { cg.appendChild(el('col', { class: 'c-item' })) })
    cg.appendChild(el('col', { class: 'c-store' }))
    tb.appendChild(cg)
    var hr = el('tr', null, [el('th', { scope: 'col', text: '店' })])
    C.ITEMS.forEach(function (it) { hr.appendChild(el('th', { scope: 'col' }, [el('span', { class: 'th-main', text: it.short }), el('span', { class: 'th-sub', text: '期日 ' + C.fmtMDW(it.due) })])) })
    hr.appendChild(el('th', { scope: 'col', text: '完了' }))
    tb.appendChild(el('thead', null, [hr]))
    var body = el('tbody')
    C.STORES.forEach(function (name, si) {
      var tr = el('tr', null, [el('th', { scope: 'row' }, [storeLink(si)])])
      C.ITEMS.forEach(function (it, ii) { tr.appendChild(el('td', { class: S.items[si][ii].st === 'back' ? 'is-back' : null }, cellBody(c, si, ii))) })
      tr.appendChild(el('td', { class: 'td-done' }, [el('span', { class: 'done-n', text: c.stores[si].done + ' / 6' }), doneLine(c, si, false)]))
      body.appendChild(tr)
    })
    tb.appendChild(body)
    box.appendChild(tb)

    var cards = $('board-cards')
    clear(cards)
    C.STORES.forEach(function (name, si) {
      var rows = el('ul', { class: 'card-rows' })
      C.ITEMS.forEach(function (it, ii) {
        rows.appendChild(el('li', { class: 'card-row' }, [
          el('div', { class: 'card-row__l' }, [el('span', { class: 'card-row__name', text: it.name }), el('span', { class: 'st-line', text: '期日 ' + C.fmtMDW(it.due) })]),
          el('div', { class: 'card-row__r' }, cellBody(c, si, ii))
        ]))
      })
      var art = el('article', { class: 'card' }, [
        el('div', { class: 'card__hd' }, [el('h3', { class: 'h3 nw', text: name }), el('p', { class: 'done-n', text: c.stores[si].done + ' / 6 完了' })]),
        el('p', { class: 'card__sub' }, [doneLine(c, si, true)]),
        rows,
        el('p', { class: 'card__btn' }, [btnSub('この店の詳細', name + 'の詳細を開く', function () { selectStore(si, 'det-items-h') })])
      ])
      cards.appendChild(art)
    })
  }

  // ---------- 2 催促 ----------
  function dueCell (it) {
    var t = C.dueText(it.due)
    return [el('span', { class: 'nw', text: C.fmtMDW(it.due) }), ' ', el('span', { class: 'due-left' + (/過ぎ/.test(t) ? ' is-warn' : ''), text: t })]
  }
  function nudgeBtn (si) {
    var b = btnSub('催促文をつくる', C.STORES[si] + 'あての催促文をつくる', function () { openNudge(si, true) }, 'js-nudge')
    b.setAttribute('data-store', si)
    return b
  }
  function drawNudge (c) {
    var list = c.nudges
    $('nudge-empty').hidden = list.length > 0
    var box = $('nudge-table')
    var cards = $('nudge-cards')
    clear(box)
    clear(cards)
    if (!list.length) return
    var tb = el('table', { class: 'grid-table nudge-table' })
    tb.appendChild(el('caption', { class: 'visually-hidden', text: '催促の一覧' }))
    var hr = el('tr')
    ;['順', '店', '項目', '担当', '経過日数', '状態', '期日', '操作'].forEach(function (h) { hr.appendChild(el('th', { scope: 'col', text: h })) })
    tb.appendChild(el('thead', null, [hr]))
    var body = el('tbody')
    list.forEach(function (n, k) {
      var it = C.ITEMS[n.item]
      var sd = C.stalledText(S.items[n.store][n.item])
      body.appendChild(el('tr', null, [
        el('td', { class: 'num', text: String(k + 1) }),
        el('td', null, [el('span', { class: 'nw', text: C.STORES[n.store] })]),
        el('td', { text: it.name }),
        el('td', { text: it.role }),
        el('td', { class: 'num', text: sd }),
        el('td', null, [stTag(n.st, true)]),
        el('td', null, dueCell(it)),
        el('td', null, [nudgeBtn(n.store)])
      ]))
      cards.appendChild(el('article', { class: 'card card--nudge' }, [
        el('div', { class: 'card__hd' }, [el('h3', { class: 'h3' }, [el('span', { class: 'nudge-no', text: String(k + 1) }), el('span', { class: 'nw', text: C.STORES[n.store] })])]),
        el('p', { class: 'card-row__name', text: it.name }),
        el('p', { class: 'st-line', text: '担当 ' + it.role + '｜経過 ' + sd }),
        el('p', { class: 'nudge-st' }, [stTag(n.st, true), el('span', { class: 'st-line' }, ['期日 '].concat(dueCell(it)))]),
        el('p', { class: 'card__btn' }, [nudgeBtn(n.store)])
      ]))
    })
    tb.appendChild(body)
    box.appendChild(tb)
  }
  // 催促文の欄を作り直す（focus：h3 へ移す）
  function openNudge (si, focus) {
    var r = C.nudgeText(S, si)
    if (!r.count) { closeNudge(false); return r }
    ui.nudgeStore = si
    if (focus) ui.nudgeFrom = si
    $('nudge-panel').hidden = false
    $('nudge-h').textContent = '催促文（' + C.STORES[si] + 'あて）'
    // 文面が変わったら「コピーしました」を消す（コピーした文と今の文が違うのに残さない）
    if ($('nudge-text').value !== r.text) $('nudge-copied').textContent = ''
    $('nudge-text').value = r.text
    $('nudge-text').setAttribute('aria-label', C.STORES[si] + 'あての催促文')
    var miss = $('nudge-miss')
    miss.hidden = !r.missing.length
    miss.textContent = r.missing.map(function (m) { return m + 'の差し戻しの理由が入っていません（店の詳細で入れられます）。' }).join('')
    if (focus) {
      $('nudge-copied').textContent = ''
      $('nudge-h').focus()
      say(C.STORES[si] + 'あての催促文をつくりました（' + r.count + '件）。')
    }
    return r
  }
  function closeNudge (back) {
    $('nudge-panel').hidden = true
    $('nudge-copied').textContent = ''
    var si = ui.nudgeStore
    ui.nudgeStore = -1
    if (back && si >= 0) {
      var bs = document.querySelectorAll('.js-nudge[data-store="' + si + '"]')
      for (var i = 0; i < bs.length; i++) { if (bs[i].offsetParent !== null) { bs[i].focus(); break } }
    }
  }
  function copyNudge () {
    var ta = $('nudge-text')
    var done = function () { $('nudge-copied').textContent = 'コピーしました。送信はしていません。'; say('コピーしました。送信はしていません。') }
    var fallback = function () {
      ta.focus()
      ta.select()
      var okc = false
      try { okc = document.execCommand('copy') } catch (e) { okc = false }
      if (okc) done()
      else $('nudge-copied').textContent = 'コピーできませんでした。選んだ文を長押し（Ctrl＋C）でコピーしてください。'
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback)
    else fallback()
  }

  // ---------- 3 数字の確かめ ----------
  var KEY_OF = { costR: 'cost', laborR: 'labor', flR: 'fl', yoyR: 'yoy' }
  function rateCell (m, key, tagName, provKey) {
    var fk = KEY_OF[key]
    var f = m.flags[fk]
    var kids = []
    var line = [el('span', { class: 'v-main' }, [f ? icon('i-bang', 16, 'bang') : null, el('span', { class: 'v', text: C.t1(m[key]) + '%' }), m.prov[provKey] ? provTag() : null])]
    kids = kids.concat(line)
    if (f) {
      kids.push(el('span', { class: 'off', text: f === 'high' ? '基準外（高い）' : '基準外（低い）' }))
      kids.push(hidden('基準外、基準は' + C.stdBandText(fk, S.std)))
    }
    return el(tagName || 'td', { class: 'num' + (f ? ' is-off' : '') }, kids)
  }
  function yenCell (v, prov) { return el('td', { class: 'num' }, [el('span', { class: 'v-main' }, [el('span', { class: 'v', text: C.fmtYen(v) }), prov ? provTag() : null])]) }
  function offNames (m) { return C.FLAG_KEYS.filter(function (k) { return m.flags[k] }).map(function (k) { return C.FLAG_NAME[k] }) }
  function checkBtn (si, m) {
    var n = offNames(m)
    if (!n.length) return null
    return btnSub('理由を確かめる', C.STORES[si] + 'の' + n.join('・') + 'の理由を確かめる', function () { selectStore(si, 'det-num-h') })
  }
  function drawCheck (c) {
    $('std-cost-hint').textContent = C.stdBandText('cost', S.std) + ' の外に印'
    $('std-yoy-hint').textContent = C.stdBandText('yoy', S.std) + ' の外に印'
    var box = $('check-table')
    clear(box)
    var tb = el('table', { class: 'grid-table check-table' })
    tb.appendChild(el('caption', { class: 'visually-hidden', text: '店ごとの10月の数字と、本部の基準' }))
    var hr = el('tr')
    ;['店', '売上', '前年比', '原価率', '人件費率', 'FL比率', '客単価', '確かめる'].forEach(function (h) { hr.appendChild(el('th', { scope: 'col', text: h })) })
    tb.appendChild(el('thead', null, [hr]))
    var body = el('tbody')
    var row = function (name, m, si) {
      var b = si >= 0 ? checkBtn(si, m) : null
      return el('tr', { class: si < 0 ? 'tr-total' : null }, [
        el('th', { scope: 'row' }, [el('span', { class: 'nw', text: name })]),
        yenCell(m.sales, m.prov.sales),
        rateCell(m, 'yoyR', 'td', 'yoy'),
        rateCell(m, 'costR', 'td', 'cost'),
        rateCell(m, 'laborR', 'td', 'labor'),
        rateCell(m, 'flR', 'td', 'fl'),
        yenCell(m.unit, m.prov.unit),
        el('td', null, [b || el('span', { text: '—' })])
      ])
    }
    c.stores.forEach(function (s, si) { body.appendChild(row(s.name, s.metrics, si)) })
    body.appendChild(row('5店の合計', c.total, -1))
    tb.appendChild(body)
    box.appendChild(tb)

    var cards = $('check-cards')
    clear(cards)
    var card = function (name, m, si) {
      var dl = el('dl', { class: 'nums' })
      var add = function (dt, dd) { dl.appendChild(el('div', { class: 'nums__row' + (dd.classList.contains('is-off') ? ' is-off' : '') }, [el('dt', { text: dt }), dd])) }
      var yd = function (v, p) { return el('dd', { class: 'num' }, [el('span', { class: 'v-main' }, [el('span', { class: 'v', text: C.fmtYen(v) }), p ? provTag() : null])]) }
      add('売上', yd(m.sales, m.prov.sales))
      add('前年比', rateCell(m, 'yoyR', 'dd', 'yoy'))
      add('原価率', rateCell(m, 'costR', 'dd', 'cost'))
      add('人件費率', rateCell(m, 'laborR', 'dd', 'labor'))
      add('FL比率', rateCell(m, 'flR', 'dd', 'fl'))
      add('客単価', yd(m.unit, m.prov.unit))
      var b = si >= 0 ? checkBtn(si, m) : null
      return el('article', { class: 'card' + (si < 0 ? ' card--total' : '') }, [el('h3', { class: 'h3 nw', text: name }), dl, b ? el('p', { class: 'card__btn' }, [b]) : null])
    }
    c.stores.forEach(function (s, si) { cards.appendChild(card(s.name, s.metrics, si)) })
    cards.appendChild(card('5店の合計', c.total, -1))
  }

  // ---------- 4 店の詳細 ----------
  var HINT = {
    cost: { high: '期末の棚卸の数え漏れや、11月分の仕入が10月に入っていないかを確かめてください。', low: '期末の棚卸の数えすぎや、届いていない仕入の請求書がないかを確かめてください。' },
    labor: { high: '勤怠の確定前の数字でないか、ほかの店への応援の付け替えが漏れていないかを確かめてください。' },
    fl: { high: '原価率と人件費率のどちらが上がったかを、上の2行で確かめてください。' },
    yoy: { low: '休業した日や、前の年にだけあった催しなど、売上が減った理由を確かめてください。', high: '同じ日の売上を2回取り込んでいないかを確かめてください。' }
  }
  function drawPick () {
    var box = $('store-pick')
    clear(box)
    C.STORES.forEach(function (name, si) {
      var on = si === ui.store
      var b = el('button', { type: 'button', class: 'store-pick__b', 'aria-pressed': on ? 'true' : 'false' }, [on ? icon('s-done', 16) : null, el('span', { class: 'nw', text: name })])
      b.addEventListener('click', function () { selectStore(si, null, b) })
      box.appendChild(b)
    })
  }
  function drawDetail (c) {
    var si = ui.store
    var name = C.STORES[si]
    $('det-items-h').textContent = name + 'の締めの項目'
    $('det-num-h').textContent = name + 'の10月の数字'
    var ul = $('det-items')
    clear(ul)
    C.ITEMS.forEach(function (it, ii) {
      var cur = S.items[si][ii]
      var sel = el('select', { id: 'sel-' + ii })
      C.STATES.forEach(function (st) {
        var o = el('option', { value: st, text: C.ST_NAME[st] })
        if (st === cur.st) o.selected = true
        sel.appendChild(o)
      })
      sel.addEventListener('change', function () { changeState(si, ii, sel.value) })
      var li = el('li', { class: 'item' + (cur.st === 'back' ? ' is-back' : '') }, [
        el('div', { class: 'item__name' }, [el('span', { class: 'item__t', text: it.name }), el('span', { class: 'st-line', text: '担当 ' + it.role + '・期日 ' + C.fmtJMD(it.due) })]),
        el('div', { class: 'item__sel' }, [el('label', { class: 'visually-hidden', for: 'sel-' + ii, text: it.short + 'の状態' }), sel, stTag(cur.st)]),
        el('p', { class: 'item__days', text: C.stalledText(cur) })
      ])
      if (cur.st === 'back') {
        var ta = el('textarea', { id: 'rsn-' + ii, maxlength: '100', rows: '3', 'aria-describedby': 'rsn-' + ii + '-n' })
        ta.value = cur.reason
        ta.addEventListener('input', function () { changeReason(si, ii, ta.value) })
        li.appendChild(el('div', { class: 'item__reason' }, [el('label', { for: 'rsn-' + ii, text: '差し戻しの理由（店に伝える文。100字まで）' }), ta, el('p', { class: 'note', id: 'rsn-' + ii + '-n', text: '入れた理由は催促文に入ります。' })]))
      }
      ul.appendChild(li)
    })
    var m = c.stores[si].metrics
    var dl = $('det-nums')
    clear(dl)
    var row = function (dt, val, opt) {
      opt = opt || {}
      var f = opt.flag
      var dd = el('dd', { class: 'num' }, [el('span', { class: 'v-main' }, [f ? icon('i-bang', 16, 'bang') : null, el('span', { class: 'v', text: val }), opt.prov ? provTag() : null]), f ? el('span', { class: 'off', text: f === 'high' ? '基準外（高い）' : '基準外（低い）' }) : null])
      dl.appendChild(el('div', { class: 'nums__row' + (f ? ' is-off' : '') + (opt.sum ? ' is-sum' : '') }, [el('dt', { text: dt }), dd]))
      if (f) dl.appendChild(el('div', { class: 'hint-box' }, [el('p', { text: HINT[opt.key][f] })]))
    }
    row('売上', C.fmtYen(m.sales), { prov: m.prov.sales })
    row('前年同月', C.fmtYen(m.prev))
    row('前年比', C.t1(m.yoyR) + '%', { flag: m.flags.yoy, key: 'yoy', prov: m.prov.yoy })
    row('期首の棚卸', C.fmtYen(m.open))
    row('＋ 仕入', C.fmtYen(m.buy))
    row('− 期末の棚卸', C.fmtYen(m.close))
    row('＝ 原価', C.fmtYen(m.cost), { sum: true, prov: m.prov.costAmt })
    row('原価率', C.t1(m.costR) + '%', { flag: m.flags.cost, key: 'cost', prov: m.prov.cost })
    row('人件費', C.fmtYen(m.labor), { prov: m.prov.laborAmt })
    row('人件費率', C.t1(m.laborR) + '%', { flag: m.flags.labor, key: 'labor', prov: m.prov.labor })
    row('FL比率（原価＋人件費）', C.t1(m.flR) + '%', { flag: m.flags.fl, key: 'fl', prov: m.prov.fl })
    row('客数', C.fmtNum(m.cust) + '人')
    row('客単価', C.fmtYen(m.unit), { prov: m.prov.unit })
    // 仮の元になる項目（項目の順）
    var src = []
    var p = m.prov
    if (p.sales) src.push(0)
    if (p.costAmt) { if (S.items[si][2].st !== 'done') src.push(2); if (S.items[si][3].st !== 'done') src.push(3) }
    if (p.laborAmt) src.push(5)
    src.sort()
    var pv = $('det-prov')
    pv.hidden = !src.length
    pv.textContent = src.length ? '仮：元になる項目（' + src.map(function (i) { return C.ITEMS[i].name }).join('・') + '）がまだ完了していません。' : ''
  }

  // ---------- 5 合計 ----------
  function drawTotal (c) {
    var t = c.total
    var dl = $('total-dl')
    clear(dl)
    var add = function (dt, v, f, sub, prov) {
      dl.appendChild(el('div', { class: 'total__i' + (f ? ' is-off' : '') }, [el('dt', { text: dt }), el('dd', null, [
        el('span', { class: 'v-main' }, [f ? icon('i-bang', 16, 'bang') : null, el('span', { class: 'v', text: v }), prov ? provTag() : null]),
        f ? el('span', { class: 'off', text: f === 'high' ? '基準外（高い）' : '基準外（低い）' }) : null,
        sub ? el('span', { class: 'st-line', text: sub }) : null])]))
    }
    add('売上の合計', C.fmtYen(t.sales), null, null, t.prov.sales)
    add('前年比', C.t1(t.yoyR) + '%', t.flags.yoy, null, t.prov.yoy)
    add('原価の合計', C.fmtYen(t.cost), null, null, t.prov.costAmt)
    add('原価率', C.t1(t.costR) + '%', t.flags.cost, null, t.prov.cost)
    add('人件費の合計', C.fmtYen(t.labor), null, null, t.prov.laborAmt)
    add('人件費率', C.t1(t.laborR) + '%', t.flags.labor, null, t.prov.labor)
    add('FL比率', C.t1(t.flR) + '%', t.flags.fl, null, t.prov.fl)
    add('客単価', C.fmtYen(t.unit), null, '客数 ' + C.fmtNum(t.cust) + '人', t.prov.unit)
    $('total-avg').textContent = '率は合計÷合計で出しています（5店の原価率を平均すると ' + C.t1(c.avgCost) + '% になり、売上の大きい店の重みが消えます）。合計の「仮」は、どれか1店でも仮の数字があると付きます。'
  }

  // ---------- 全部を描き直す ----------
  function render () {
    var act = document.activeElement
    var actId = act && act.id
    var c = C.compute(S)
    drawSum(c)
    drawBoard(c)
    drawNudge(c)
    drawCheck(c)
    drawPick()
    drawDetail(c)
    drawTotal(c)
    if (actId && $(actId) && $(actId) !== act) $(actId).focus()
    return c
  }

  // ---------- 操作 ----------
  function selectStore (si, focusId, btn) {
    ui.store = si
    render()
    if (focusId) $(focusId).focus()
    else if (btn) { var bs = $('store-pick').querySelectorAll('button'); bs[si].focus() }
  }
  function changeState (si, ii, st) {
    if (!C.setState(S, si, ii, st)) return
    var c = render()
    var msg = C.STORES[si] + 'の' + C.ITEMS[ii].short + 'を' + C.ST_SHORT[st] + 'に。完了率' + C.t1(c.rate) + '%、催促' + c.nudges.length + '件。'
    if (ui.nudgeStore >= 0) {
      var ns = ui.nudgeStore
      var r = openNudge(ns, false)
      if (!r.count) msg = C.STORES[ns] + 'の催促はなくなりました。完了率' + C.t1(c.rate) + '%。'
    }
    $('sel-' + ii).focus()
    say(msg)
  }
  var rsnTimer = 0
  function changeReason (si, ii, v) {
    S.items[si][ii].reason = Array.from(v).slice(0, 100).join('')
    clearTimeout(rsnTimer)
    rsnTimer = setTimeout(function () { if (ui.nudgeStore === si) openNudge(si, false) }, 400)
  }
  // 基準の入力
  var stdTimer = 0
  function readStdAll () {
    var okAll = true
    var bad = false
    STD_KEYS.forEach(function (k) {
      var inp = $('std-' + k)
      var v = C.readStd(k, inp.value)
      var err = $('std-' + k + '-err')
      if (v === null) {
        bad = true
        okAll = false
        inp.setAttribute('aria-invalid', 'true')
        err.hidden = false
        err.textContent = C.stdRangeText(k) + 'の数字で入れてください。前の基準のままです。'
      } else {
        inp.removeAttribute('aria-invalid')
        err.hidden = true
        err.textContent = ''
        S.std[k] = v
      }
    })
    var c = render()
    if (bad) say('基準は数字で入れてください。前のままです。')
    else say('基準を変えました。数字の目印は' + (c.markStores ? c.markStores + '店・' + c.marks + 'か所' : '0か所') + 'です。')
    return okAll
  }
  function resetStd (quiet) {
    S.std = C.copyStd(C.STD0)
    STD_KEYS.forEach(function (k) {
      var inp = $('std-' + k)
      inp.value = C.tv(C.STD0[k])
      inp.removeAttribute('aria-invalid')
      $('std-' + k + '-err').hidden = true
      $('std-' + k + '-err').textContent = ''
    })
    if (!quiet) { render(); say('基準を最初の値に戻しました。') }
  }
  function resetAll () {
    clearTimeout(stdTimer)
    clearTimeout(rsnTimer)
    S = C.seed()
    ui.store = 0
    resetStd(true)
    closeNudge(false)
    render()
    $('reset-all').focus()
    say('最初の状態に戻しました。')
  }
  function saveCsv () {
    var blob = new Blob([C.csv(S)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = el('a', { href: url, download: 'yomosugara_2026-10_close.csv' })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    say('CSV を保存しました。')
  }

  // ---------- 印刷（A4 横。#print-root に作り、終わったら空にする） ----------
  function buildPrint () {
    var c = C.compute(S)
    var root = $('print-root')
    clear(root)
    var p1 = el('div', { class: 'pr-page' })
    p1.appendChild(el('p', { class: 'pr-title', text: 'ヨモスガラ食堂（架空）10月の締め　2026年11月6日（金）時点・期限 11月10日（火）' }))
    p1.appendChild(el('p', { class: 'pr-sum', text: '全体の完了率 ' + C.t1(c.rate) + '%（30項目のうち ' + c.done + '）／催促 ' + c.nudges.length + '件／本部の確認待ち ' + c.counts.wait + '件／数字の目印 ' + (c.markStores ? c.markStores + '店・' + c.marks + 'か所' : '0か所') }))
    var t1 = el('table', { class: 'pr-table pr-board' })
    var hr = el('tr', null, [el('th', { text: '店' })])
    C.ITEMS.forEach(function (it) { hr.appendChild(el('th', { text: it.short + ' ' + C.fmtMD(it.due) })) })
    hr.appendChild(el('th', { text: '完了' }))
    t1.appendChild(el('thead', null, [hr]))
    var b1 = el('tbody')
    C.STORES.forEach(function (n, si) {
      var tr = el('tr', null, [el('th', { text: n })])
      C.ITEMS.forEach(function (it, ii) { tr.appendChild(el('td', null, cellBody(c, si, ii))) })
      tr.appendChild(el('td', { text: c.stores[si].done + ' / 6' }))
      b1.appendChild(tr)
    })
    t1.appendChild(b1)
    p1.appendChild(t1)
    if (c.nudges.length) {
      var t2 = el('table', { class: 'pr-table' })
      var h2 = el('tr')
      ;['順', '店', '項目', '担当', '経過日数', '状態', '期日'].forEach(function (h) { h2.appendChild(el('th', { text: h })) })
      t2.appendChild(el('thead', null, [h2]))
      var b2 = el('tbody')
      c.nudges.forEach(function (n, k) {
        var it = C.ITEMS[n.item]
        b2.appendChild(el('tr', null, [el('td', { text: String(k + 1) }), el('td', { text: C.STORES[n.store] }), el('td', { text: it.name }), el('td', { text: it.role }), el('td', { text: C.stalledText(S.items[n.store][n.item]) }), el('td', { text: C.ST_NAME[n.st] }), el('td', { text: C.fmtMDW(it.due) + ' ' + C.dueText(it.due) })]))
      })
      t2.appendChild(b2)
      p1.appendChild(el('p', { class: 'pr-h', text: '催促の一覧' }))
      p1.appendChild(t2)
    }
    root.appendChild(p1)
    var p2 = el('div', { class: 'pr-page pr-page--2' })
    var t3 = el('table', { class: 'pr-table' })
    var h3 = el('tr')
    ;['店', '売上', '前年比', '原価率', '人件費率', 'FL比率', '客単価', '仮'].forEach(function (h) { h3.appendChild(el('th', { text: h })) })
    t3.appendChild(el('thead', null, [h3]))
    var b3 = el('tbody')
    var pr = function (name, m) {
      var cell = function (key, fk) { return el('td', { class: m.flags[fk] ? 'is-off' : null, text: (m.flags[fk] ? '! ' : '') + C.t1(m[key]) + '%' }) }
      return el('tr', null, [el('th', { text: name }), el('td', { text: C.fmtYen(m.sales) }), cell('yoyR', 'yoy'), cell('costR', 'cost'), cell('laborR', 'labor'), cell('flR', 'fl'), el('td', { text: C.fmtYen(m.unit) }), el('td', { text: C.provNames(m.prov) })])
    }
    c.stores.forEach(function (s) { b3.appendChild(pr(s.name, s.metrics)) })
    b3.appendChild(pr('5店の合計', c.total))
    t3.appendChild(b3)
    p2.appendChild(el('p', { class: 'pr-h', text: '数字の確かめ' }))
    p2.appendChild(t3)
    var sd = S.std
    p2.appendChild(el('p', { text: '本部の基準：原価率 ' + C.t1(sd.costT) + '%±' + C.t1(sd.costW) + 'pt（' + C.stdBandText('cost', sd) + '）・人件費率 ' + C.t1(sd.labor) + '% 以下・FL比率 ' + C.t1(sd.fl) + '% 以下・前年比 ' + C.stdBandText('yoy', sd) }))
    S.items.forEach(function (row, si) {
      row.forEach(function (it, ii) { if (it.st === 'back' && it.reason.trim()) p2.appendChild(el('p', { text: C.STORES[si] + '・' + C.ITEMS[ii].name + '：' + it.reason.trim() })) })
    })
    p2.appendChild(el('p', { class: 'pr-foot', text: '作品例（架空のお店）。数字はすべて架空です。' }))
    root.appendChild(p2)
  }

  // ---------- はじめ ----------
  drawLegend()
  STD_KEYS.forEach(function (k) {
    $('std-' + k).addEventListener('input', function () {
      clearTimeout(stdTimer)
      stdTimer = setTimeout(readStdAll, 400)
    })
  })
  $('std-reset').addEventListener('click', function () { clearTimeout(stdTimer); resetStd(false) })
  $('reset-all').addEventListener('click', resetAll)
  $('nudge-copy').addEventListener('click', copyNudge)
  $('nudge-close').addEventListener('click', function () { closeNudge(true) })
  $('csv-btn').addEventListener('click', saveCsv)
  $('print-btn').addEventListener('click', function () { window.print() })
  window.addEventListener('beforeprint', buildPrint)
  window.addEventListener('afterprint', function () { clear($('print-root')) })
  render()
  // 試験のための入口（状態は返さない。描き直しの結果だけ）
  window.__demo39 = { buildPrint: buildPrint }
})()
