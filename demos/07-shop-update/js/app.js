// 定食と惣菜 ユキマド（デモ）お店のページ更新
// 外部通信なし。変更はこのブラウザの localStorage にだけ保存する（?today= のときは保存しない）
(function () {
  'use strict'

  var KEY = 'tenkalab-demo-shop-update-v1'
  var WEEK = ['日', '月', '火', '水', '木', '金', '土']
  var REG_DOW = 3 // 毎週水曜が定休
  var HOURS = '11:00–20:00（L.O. 19:30）'
  var HOURS_SHORT = '11:00–14:00（L.O. 13:30）'
  var NOTICE_MAX = 20

  // ---------- アイコン（自作 SVG。currentColor） ----------
  var ICON = {
    tel: '<path d="M6.6 3.5h3l1.5 4.2-2 1.5a12 12 0 0 0 5.7 5.7l1.5-2 4.2 1.5v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.6 5.6a2 2 0 0 1 2-2.1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    pen: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5zM13.5 7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>',
    back: '<path d="M9 5L4 10l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    alert: '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 6.5v7" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.4" fill="#FFFFFF"/>',
    x: '<path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    noren: '<path d="M3 5h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 6h4.6v10.5l-2.3 1.6L4 16.5zM9.7 6h4.6v10.5l-2.3 1.6-2.3-1.6zM15.4 6H20v10.5l-2.3 1.6-2.3-1.6z" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/><path d="M12 7v5H8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    door: '<rect x="6" y="3" width="12" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 21h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="12.5" r="1.2" fill="currentColor"/>',
    doorx: '<rect x="6" y="3" width="12" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 21h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 8.5l6 6M15 8.5l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
  }
  // カレンダーの記号（14px）
  var MARK = {
    open: '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2"/>',
    regular: '<path d="M2 7h10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    closed: '<path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    short: '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 2a5 5 0 0 0 0 10z" fill="currentColor"/>'
  }
  function svg (name, size, vb) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + (vb || 24) + ' ' + (vb || 24) + '" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>'
  }
  function markSvg (st) {
    return '<svg class="day__mark" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">' + MARK[st] + '</svg>'
  }
  var CHECK = '<svg class="seg__check" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON.check + '</svg>'

  var STATUS = {
    open: { label: '営業', short: '', legend: '営業' },
    regular: { label: '定休', short: '定休', legend: '定休' },
    closed: { label: '臨時休業', short: '臨休', legend: '臨時休業' },
    short: { label: '短縮営業', short: '短縮', legend: '短縮 11:00–14:00' }
  }

  // ---------- 架空データ（design.md §12） ----------
  var TEISHOKU = [
    { id: 't1', name: '豚汁定食', price: 950, isNew: true },
    { id: 't2', name: '鶏の唐揚げ定食', price: 950 },
    { id: 't3', name: '豚の生姜焼き定食', price: 980 },
    { id: 't4', name: '鯖の味噌煮定食', price: 1000 },
    { id: 't5', name: '鮭のちゃんちゃん焼き定食', price: 1050 },
    { id: 't6', name: '肉じゃがコロッケ定食', price: 900 }
  ]
  var DAILY = [
    { id: 'd1', name: '鰈の煮付け定食', price: 850, desc: '甘辛く煮た鰈に、小鉢2品' },
    { id: 'd2', name: '鶏の南蛮漬け定食', price: 850, desc: '揚げた鶏を甘酢に漬けて' },
    { id: 'd3', name: '麻婆豆腐定食', price: 850, desc: '山椒は控えめ、ご飯がすすむ味' }
  ]
  var SOZAI = [
    { id: 's1', name: '筑前煮', price: 380 },
    { id: 's2', name: 'ポテトサラダ', price: 300 },
    { id: 's3', name: 'ほうれん草の胡麻和え', price: 250 },
    { id: 's4', name: 'だし巻き玉子', price: 320 },
    { id: 's5', name: 'いももち（2個）', price: 280 },
    { id: 's6', name: 'かぼちゃの煮物', price: 300 }
  ]
  var NEWYEAR_BODY = '12月31日（木）から1月3日（日）までお休みします。1月4日（月）から通常どおり営業します。'
  var KIND = { off: 'お休み', 'new': '新メニュー', info: 'お知らせ' }

  // ---------- 日付（年月日だけで計算する） ----------
  function pad (n) { return (n < 10 ? '0' : '') + n }
  function iso (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  function parseIso (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
    if (!m) return null
    var y = +m[1]; var mo = +m[2]; var d = +m[3]
    var dt = new Date(y, mo - 1, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
    return dt
  }
  function addDays (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) }
  function md (d) { return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEK[d.getDay()] + '）' }
  function mdLong (d) { return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WEEK[d.getDay()] + '）' }
  function yen (n) { return n.toLocaleString('ja-JP') + '円' }

  // ---------- 「今日」（design.md §12-6） ----------
  var params = new URLSearchParams(location.search)
  var todayParam = params.get('today')
  var fixed = false
  var badParam = false
  var TODAY = null
  if (todayParam !== null) {
    TODAY = parseIso(todayParam)
    if (TODAY) fixed = true
    else badParam = true
  }
  if (!TODAY) { var now = new Date(); TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
  var TODAY_ISO = iso(TODAY)
  var MONTHS = [
    new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
    new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1)
  ]
  var RANGE_END = new Date(TODAY.getFullYear(), TODAY.getMonth() + 2, 0)
  var TOMORROW = addDays(TODAY, 1)
  var storageFailed = false

  // ---------- 状態 ----------
  var state = null

  function firstDow (from, dow) {
    var d = from
    while (d.getDay() !== dow) d = addDays(d, 1)
    return d
  }
  function makeSample () {
    var shortDay = firstDow(addDays(TODAY, 2), 6)
    var closedDay = firstDow(addDays(TODAY, 5), 1)
    var days = {}
    days[iso(shortDay)] = 'short'
    days[iso(closedDay)] = 'closed'
    var nye = new Date(TODAY.getFullYear(), 11, 31)
    if (nye >= MONTHS[0] && nye <= RANGE_END) days[iso(nye)] = 'closed'
    return {
      version: 1,
      createdFor: TODAY_ISO,
      days: days,
      soldOut: ['s4'],
      daily: 'd1',
      notices: [
        { id: 'n1', date: iso(addDays(TODAY, -1)), kind: 'off', title: '営業日の変更のお知らせ', body: mdLong(shortDay) + 'は14:00までの短縮営業、' + mdLong(closedDay) + 'は臨時休業いたします。' },
        { id: 'n2', date: iso(addDays(TODAY, -4)), kind: 'new', title: '冬の新メニュー 豚汁定食をはじめました', body: '根菜たっぷりの豚汁に、小鉢2品とご飯がつきます。950円です。' },
        { id: 'n3', date: iso(addDays(TODAY, -9)), kind: 'info', title: '年末年始の営業について', body: NEWYEAR_BODY }
      ],
      seq: 3
    }
  }
  function load () {
    if (fixed) return null
    try {
      var raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      var s = JSON.parse(raw)
      if (!s || s.version !== 1 || typeof s.days !== 'object' || !Array.isArray(s.soldOut) || !Array.isArray(s.notices)) return null
      return s
    } catch (e) {
      storageFailed = true
      return null
    }
  }
  function save () {
    if (fixed) return
    try {
      state.notices = state.notices.slice(0, NOTICE_MAX)
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch (e) {
      if (!storageFailed) { storageFailed = true; renderFlags() }
    }
  }

  function baseStatus (d) { return d.getDay() === REG_DOW ? 'regular' : 'open' }
  function statusOf (d) { return state.days[iso(d)] || baseStatus(d) }
  function setStatus (d, st) {
    if (st === baseStatus(d)) delete state.days[iso(d)]
    else state.days[iso(d)] = st
  }
  function cycleOf (d) {
    return d.getDay() === REG_DOW ? ['regular', 'open', 'short'] : ['open', 'closed', 'short']
  }
  function nextStatus (d) {
    var c = cycleOf(d)
    var i = c.indexOf(statusOf(d))
    return c[(i + 1) % c.length]
  }
  function isOff (st) { return st === 'closed' || st === 'regular' }
  function nextOpenDay (from) {
    for (var d = from; d <= RANGE_END; d = addDays(d, 1)) {
      var st = statusOf(d)
      if (st === 'open' || st === 'short') return d
    }
    return null
  }
  function findItem (id) {
    var all = TEISHOKU.concat(SOZAI, DAILY)
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]
    return null
  }
  function isSold (id) { return state.soldOut.indexOf(id) >= 0 }

  // ---------- 小さな道具 ----------
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    return e
  }
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  var pcMq = window.matchMedia('(min-width: 1024px)')
  function isPC () { return pcMq.matches }
  function srSay (msg) {
    var s = $('sr-status')
    s.textContent = ''
    window.setTimeout(function () { s.textContent = msg }, 50)
  }
  // 再描画しても、押していたボタンにフォーカスを戻す
  function keepFocus (fn) {
    var a = document.activeElement
    var key = a && a.getAttribute ? a.getAttribute('data-key') : null
    fn()
    if (key) {
      var b = document.querySelector('[data-key="' + key + '"]')
      if (b) b.focus({ preventScroll: true })
    }
  }

  var toastTimer = null
  function toast (msg, linkText, onLink) {
    var t = $('toast')
    // 読み上げのため、先に表示してから中身を入れる（非表示中に入れた文は読まれないことが多い）
    t.innerHTML = ''
    t.classList.remove('is-in')
    t.style.opacity = '0'
    t.hidden = false
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () {
      t.appendChild(el('span', '', msg))
      if (linkText) {
        var b = el('button', 'toast__link', linkText)
        b.type = 'button'
        b.addEventListener('click', function () { hideToast(); onLink() })
        t.appendChild(b)
      }
      t.style.opacity = ''
      void t.offsetWidth
      t.classList.add('is-in')
      toastTimer = window.setTimeout(hideToast, linkText ? 5000 : 3000)
    }, 50)
  }
  function hideToast () { $('toast').hidden = true }

  // ---------- 注意の札 ----------
  function renderFlags () {
    var msgs = []
    if (fixed) msgs.push('検査用：今日を ' + TODAY_ISO + '（' + WEEK[TODAY.getDay()] + '）に固定しています。この状態では保存しません')
    if (badParam) msgs.push('?today の日付が読めなかったため、端末の日付を使っています')
    if (storageFailed) msgs.push('このブラウザでは保存できない設定のため、読み込み直すと最初の状態に戻ります')
    document.querySelectorAll('[data-flags]').forEach(function (box) {
      box.innerHTML = ''
      msgs.forEach(function (m) {
        var p = el('p', 'flag')
        p.innerHTML = svg('alert', 14)
        p.appendChild(document.createTextNode(m))
        box.appendChild(p)
      })
    })
  }

  // ---------- お客様の画面 ----------
  var custMonth = 0
  var ownerMonth = 0

  function signContent (inner) {
    var st = statusOf(TODAY)
    var big; var small; var icon
    if (st === 'open') { big = '本日 営業'; small = HOURS; icon = 'noren' }
    else if (st === 'short') { big = '本日 短縮営業'; small = HOURS_SHORT; icon = 'clock' }
    else {
      var nx = nextOpenDay(TOMORROW)
      var nxText = '次の営業日はお知らせをご覧ください'
      if (nx) nxText = '次の営業日 ' + md(nx) + (statusOf(nx) === 'short' ? '11:00–14:00' : '11:00から')
      if (st === 'closed') { big = '本日は 臨時休業です'; small = nxText; icon = 'doorx' }
      else { big = '本日は 定休日です'; small = '毎週水曜定休・' + (nx ? '次の営業日 ' + md(nx) : '次の営業日はお知らせをご覧ください'); icon = 'door' }
    }
    inner.setAttribute('data-s', st)
    inner.innerHTML = ''
    var ic = el('span', 'sign__icon')
    ic.innerHTML = svg(icon, 28)
    var tx = el('div', 'sign__text')
    tx.appendChild(el('p', 'sign__date', mdLong(TODAY).replace('（', '（')))
    tx.appendChild(el('p', 'sign__big', big))
    tx.appendChild(el('p', 'sign__small', small))
    inner.appendChild(ic)
    inner.appendChild(tx)
    return big
  }
  function renderSign (animate, done) {
    var inner = $('sign-inner')
    if (!animate || reduced.matches) {
      signContent(inner)
      if (done) done()
      return
    }
    inner.classList.remove('is-flip-in', 'is-changed')
    inner.classList.add('is-flip-out')
    window.setTimeout(function () {
      signContent(inner)
      inner.classList.remove('is-flip-out')
      inner.classList.add('is-flip-in')
      window.setTimeout(function () {
        inner.classList.remove('is-flip-in')
        if (done) done()
      }, 260)
    }, 200)
  }

  function renderNews () {
    var box = $('c-news')
    box.innerHTML = ''
    var list = state.notices.slice(0, 3)
    if (!list.length) { box.appendChild(el('p', 'news__none', 'いまお知らせはありません')); return }
    var ul = el('ul', 'news')
    list.forEach(function (n) {
      var li = el('li', 'news__item')
      li.setAttribute('data-notice', n.id)
      var meta = el('p', 'news__meta')
      var d = parseIso(n.date)
      meta.appendChild(el('span', '', d ? md(d) : n.date))
      meta.appendChild(el('span', 'kind kind--' + n.kind, KIND[n.kind] || 'お知らせ'))
      li.appendChild(meta)
      li.appendChild(el('p', 'news__title', n.title))
      li.appendChild(el('p', 'news__body', n.body))
      ul.appendChild(li)
    })
    box.appendChild(ul)
  }

  function stampEl (pop) {
    var s = el('span', 'stamp' + (pop ? ' is-pop' : ''), '本日売り切れ')
    s.setAttribute('aria-hidden', 'true')
    return s
  }

  function renderDaily (pop) {
    $('c-daily-date').textContent = md(TODAY)
    var box = $('c-daily')
    var body = $('c-daily-body')
    body.innerHTML = ''
    var old = box.querySelector('.stamp')
    if (old) old.remove()
    var item = findItem(state.daily) || DAILY[0]
    box.setAttribute('data-item', 'daily')
    if (isOff(statusOf(TODAY))) {
      box.classList.remove('is-sold')
      body.appendChild(el('p', 'daily__off', '本日はお休みです'))
      return
    }
    var sold = isSold('daily')
    box.classList.toggle('is-sold', sold)
    body.appendChild(el('p', 'daily__name', item.name))
    var price = el('p', 'daily__price', yen(item.price))
    if (sold) price.appendChild(el('span', 'visually-hidden', ' 本日売り切れ'))
    body.appendChild(price)
    body.appendChild(el('p', 'daily__desc', item.desc))
    if (sold) box.appendChild(stampEl(pop === 'daily'))
  }

  function renderMenuList (ul, items, pop) {
    ul.innerHTML = ''
    items.forEach(function (it) {
      var sold = isSold(it.id)
      var li = el('li', 'menu__item' + (sold ? ' is-sold' : ''))
      li.setAttribute('data-item', it.id)
      li.setAttribute('aria-label', it.name + (it.isNew ? '（新）' : '') + ' ' + yen(it.price) + (sold ? ' 本日売り切れ' : ''))
      var name = el('span', 'menu__name')
      name.appendChild(el('span', '', it.name))
      if (it.isNew) name.appendChild(el('span', 'menu__new', '新'))
      li.appendChild(name)
      li.appendChild(el('span', 'menu__dots'))
      li.appendChild(el('span', 'menu__price', yen(it.price)))
      if (sold) li.appendChild(stampEl(pop === it.id))
      li.querySelectorAll('span').forEach(function (s) { s.setAttribute('aria-hidden', 'true') })
      ul.appendChild(li)
    })
  }
  function renderMenu (pop) {
    renderMenuList($('c-menu-t'), TEISHOKU, pop)
    renderMenuList($('c-menu-s'), SOZAI, pop)
  }

  function monthButtons (box, cur, onPick, prefix) {
    box.innerHTML = ''
    MONTHS.forEach(function (m, i) {
      var b = el('button', 'seg__btn')
      b.type = 'button'
      b.setAttribute('aria-pressed', i === cur ? 'true' : 'false')
      b.setAttribute('data-key', prefix + '-m' + i)
      b.innerHTML = CHECK
      b.appendChild(document.createTextNode((m.getMonth() + 1) + '月'))
      b.addEventListener('click', function () { onPick(i) })
      box.appendChild(b)
    })
  }

  function dayAria (d, st) {
    var s = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK[d.getDay()] + '曜 ' + STATUS[st].label
    if (st === 'open') s += ' 11:00から20:00'
    if (st === 'short') s += ' 11:00から14:00'
    if (iso(d) === TODAY_ISO) s = '今日 ' + s
    return s
  }
  function dayInner (d, st) {
    var isToday = iso(d) === TODAY_ISO
    var h = '<span class="day__num" aria-hidden="true">' + d.getDate() + '</span>' + markSvg(st)
    if (STATUS[st].short) h += '<span class="day__label" aria-hidden="true">' + STATUS[st].short + '</span>'
    else if (isToday) h += '<span class="day__label day__label--today" aria-hidden="true" style="color:#2D4B6B">今日</span>'
    return h
  }
  function buildCal (mi, owner) {
    var first = MONTHS[mi]
    var y = first.getFullYear(); var m = first.getMonth()
    var last = new Date(y, m + 1, 0).getDate()
    var table = el('table', owner ? 'ocal' : 'cal')
    var cap = el('caption', 'visually-hidden', y + '年' + (m + 1) + '月の営業日')
    table.appendChild(cap)
    var thead = el('thead')
    var hr = el('tr')
    WEEK.forEach(function (w) { var th = el('th', '', w); th.scope = 'col'; hr.appendChild(th) })
    thead.appendChild(hr)
    table.appendChild(thead)
    var tb = el('tbody')
    var tr = el('tr')
    for (var i = 0; i < first.getDay(); i++) tr.appendChild(el('td', 'is-blank'))
    for (var day = 1; day <= last; day++) {
      var d = new Date(y, m, day)
      var st = statusOf(d)
      var past = d < TODAY
      var isToday = iso(d) === TODAY_ISO
      var cls = 'day st-' + st + (past ? ' is-past' : '') + (isToday ? ' day--today' : '')
      var td = el('td')
      if (owner) {
        var b = el('button', 'oday ' + cls)
        b.type = 'button'
        b.setAttribute('data-date', iso(d))
        b.setAttribute('data-key', 'od-' + iso(d))
        b.innerHTML = dayInner(d, st)
        if (past) {
          b.disabled = true
          b.setAttribute('aria-label', dayAria(d, st) + '（過ぎた日）')
        } else {
          var nx = nextStatus(d)
          b.setAttribute('aria-label', dayAria(d, st) + '。押すと' + STATUS[nx].label + 'に変わります')
        }
        td.appendChild(b)
      } else {
        td.className = 'st-' + st + (past ? ' is-past' : '')
        td.setAttribute('data-date', iso(d))
        var div = el('div', cls)
        div.innerHTML = dayInner(d, st)
        div.appendChild(el('span', 'visually-hidden', dayAria(d, st)))
        td.appendChild(div)
      }
      tr.appendChild(td)
      if (d.getDay() === 6) { tb.appendChild(tr); tr = el('tr') }
    }
    if (tr.children.length) {
      while (tr.children.length < 7) tr.appendChild(el('td', 'is-blank'))
      tb.appendChild(tr)
    }
    table.appendChild(tb)
    return table
  }
  function renderLegend (ul) {
    ul.innerHTML = ''
    ;['open', 'regular', 'closed', 'short'].forEach(function (st) {
      var li = el('li')
      var box = el('span', 'legend__box st-' + st)
      box.innerHTML = markSvg(st)
      li.appendChild(box)
      li.appendChild(document.createTextNode(STATUS[st].legend))
      ul.appendChild(li)
    })
    var li = el('li')
    li.innerHTML = '<span class="legend__today" aria-hidden="true">今</span>今日'
    ul.appendChild(li)
  }
  function renderCustCal () {
    monthButtons($('c-months'), custMonth, function (i) { custMonth = i; keepFocus(renderCustCal) }, 'cm')
    var wrap = $('c-cal')
    wrap.innerHTML = ''
    wrap.appendChild(buildCal(custMonth, false))
  }

  function renderCustomer (pop) {
    renderNews()
    renderDaily(pop)
    renderMenu(pop)
    renderCustCal()
  }

  // ---------- 店主の画面 ----------
  function renderOwnerToday () {
    $('o-today-label').textContent = '今日 ' + md(TODAY)
    var box = $('o-today')
    box.innerHTML = ''
    var st = statusOf(TODAY)
    var offSt = TODAY.getDay() === REG_DOW ? 'regular' : 'closed'
    var opts = [
      { v: 'open', t: '営業' },
      { v: offSt, t: '休み' },
      { v: 'short', t: '短縮 〜14:00' }
    ]
    opts.forEach(function (o, i) {
      var b = el('button', 'seg__btn')
      b.type = 'button'
      b.setAttribute('role', 'radio')
      var on = st === o.v
      b.setAttribute('aria-checked', on ? 'true' : 'false')
      b.setAttribute('data-key', 'ot-' + i)
      b.tabIndex = on ? 0 : -1
      if (o.v !== 'open' && o.v !== 'short') b.setAttribute('aria-label', '休み（' + STATUS[o.v].label + '）')
      b.innerHTML = CHECK
      b.appendChild(document.createTextNode(o.t))
      b.addEventListener('click', function () { setToday(o.v) })
      b.addEventListener('keydown', function (e) {
        var k = e.key
        if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'ArrowDown' && k !== 'ArrowUp') return
        e.preventDefault()
        var n = (i + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length
        setToday(opts[n].v)
        var nb = box.querySelector('[data-key="ot-' + n + '"]')
        if (nb) nb.focus()
      })
      box.appendChild(b)
    })
  }
  function renderOwnerCal () {
    monthButtons($('o-months'), ownerMonth, function (i) { ownerMonth = i; keepFocus(renderOwnerCal) }, 'om')
    var wrap = $('o-cal')
    wrap.innerHTML = ''
    wrap.appendChild(buildCal(ownerMonth, true))
  }
  function renderOwnerDaily () {
    var box = $('o-daily')
    box.innerHTML = ''
    DAILY.forEach(function (it, i) {
      var b = el('button', 'ochoice__btn')
      b.type = 'button'
      b.setAttribute('role', 'radio')
      var on = state.daily === it.id
      b.setAttribute('aria-checked', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
      b.setAttribute('data-key', 'dl-' + it.id)
      b.appendChild(el('span', 'ochoice__radio'))
      var t = el('span', '')
      t.appendChild(el('span', 'ochoice__name', it.name))
      t.appendChild(el('span', 'ochoice__price', yen(it.price)))
      b.appendChild(t)
      b.addEventListener('click', function () { setDaily(it.id) })
      b.addEventListener('keydown', function (e) {
        var k = e.key
        if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'ArrowDown' && k !== 'ArrowUp') return
        e.preventDefault()
        var n = (i + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + DAILY.length) % DAILY.length
        setDaily(DAILY[n].id)
        var nb = box.querySelector('[data-key="dl-' + DAILY[n].id + '"]')
        if (nb) nb.focus()
      })
      box.appendChild(b)
    })
    var row = $('o-daily-sold')
    row.innerHTML = ''
    var cur = findItem(state.daily)
    fillRow(row, { id: 'daily', name: '日替わり（' + cur.name + '）', price: cur.price })
  }
  function fillRow (row, it) {
    var sold = isSold(it.id)
    row.classList.toggle('is-sold', sold)
    row.setAttribute('data-orow', it.id)
    var n = el('span', 'orow__name', it.name)
    n.appendChild(el('span', 'orow__price', yen(it.price)))
    row.appendChild(n)
    var b = el('button', 'sw')
    b.type = 'button'
    b.setAttribute('role', 'switch')
    b.setAttribute('aria-checked', sold ? 'true' : 'false')
    b.setAttribute('data-key', 'sw-' + it.id)
    b.setAttribute('data-sw', it.id)
    b.setAttribute('aria-label', sold ? it.name + 'の売り切れを取り消す' : it.name + 'を売り切れにする')
    b.innerHTML = '<span class="sw__text" aria-hidden="true">' + (sold ? '売り切れ' : '販売中') + '</span>' +
      '<span class="sw__track" aria-hidden="true"><span class="sw__knob"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON.x + '</svg></span></span>'
    b.addEventListener('click', function () { toggleSold(it.id) })
    row.appendChild(b)
  }
  function renderOwnerMenu () {
    ;[['o-menu-t', TEISHOKU], ['o-menu-s', SOZAI]].forEach(function (p) {
      var ul = $(p[0])
      ul.innerHTML = ''
      p[1].forEach(function (it) {
        var li = el('li', 'orow')
        fillRow(li, it)
        ul.appendChild(li)
      })
    })
  }
  function renderOwnerNews () {
    $('o-news-title').textContent = '出しているお知らせ（' + state.notices.length + '件）'
    var ul = $('o-news')
    ul.innerHTML = ''
    state.notices.forEach(function (n, i) {
      var li = el('li', 'onews')
      var left = el('div', '')
      var meta = el('p', 'onews__meta')
      var d = parseIso(n.date)
      meta.appendChild(el('span', '', d ? md(d) : n.date))
      meta.appendChild(el('span', 'kind kind--' + n.kind, KIND[n.kind] || 'お知らせ'))
      left.appendChild(meta)
      left.appendChild(el('p', 'onews__title', n.title))
      if (i >= 3) left.appendChild(el('p', 'onews__hidden', 'ページには出ていません'))
      li.appendChild(left)
      var b = el('button', 'linkish', '取り下げる')
      b.type = 'button'
      b.setAttribute('aria-label', '「' + n.title + '」を取り下げる')
      b.addEventListener('click', function () { withdraw(n.id) })
      li.appendChild(b)
      ul.appendChild(li)
    })
  }
  function renderOwner () {
    keepFocus(function () {
      renderOwnerToday()
      renderOwnerCal()
      renderOwnerDaily()
      renderOwnerMenu()
      renderOwnerNews()
    })
  }

  // ---------- 変わった所を見せる（design.md §8） ----------
  var pending = [] // 〜1023px で、まだ見ていない変更
  var pendingSay = ''
  function custScreen () { return $('screen-customer') }

  function scrollToEl (target) {
    var behavior = reduced.matches ? 'auto' : 'smooth'
    if (isPC()) {
      var sc = custScreen()
      var r = target.getBoundingClientRect()
      var sr = sc.getBoundingClientRect()
      var top = sc.scrollTop + (r.top - sr.top) - (sc.clientHeight / 2) + (r.height / 2)
      sc.scrollTo({ top: Math.max(0, top), behavior: behavior })
    } else {
      var r2 = target.getBoundingClientRect()
      var y = window.scrollY + r2.top - (window.innerHeight / 2) + (r2.height / 2)
      window.scrollTo({ top: Math.max(0, y), behavior: behavior })
    }
  }
  function tagOn (host) {
    var old = host.querySelector(':scope > .changed-tag')
    if (old) old.remove()
    var t = el('span', 'changed-tag', 'いま変わりました')
    t.setAttribute('aria-hidden', 'true')
    host.appendChild(t)
    window.setTimeout(function () {
      t.classList.add('is-out')
      window.setTimeout(function () { t.remove() }, 200)
    }, 3000)
  }
  function glow (node) {
    var cls = reduced.matches ? 'is-mark' : 'is-changed'
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
    window.setTimeout(function () { node.classList.remove(cls) }, reduced.matches ? 3000 : 1700)
  }
  // targets: [{ type: 'sign'|'notice'|'day'|'item'|'news', id }]
  function resolve (t) {
    if (t.type === 'sign') return { node: $('sign-inner'), host: $('sign-inner') }
    if (t.type === 'news') return { node: $('c-news'), host: $('c-news') }
    if (t.type === 'notice') {
      var n = document.querySelector('#c-news [data-notice="' + t.id + '"]')
      return n ? { node: n, host: n } : null
    }
    if (t.type === 'item') {
      var it = t.id === 'daily' ? $('c-daily') : document.querySelector('#c-menu-t [data-item="' + t.id + '"], #c-menu-s [data-item="' + t.id + '"]')
      return it ? { node: it, host: it } : null
    }
    if (t.type === 'day') {
      var td = document.querySelector('#c-cal td[data-date="' + t.id + '"]')
      return td ? { node: td, host: $('c-cal') } : null
    }
    return null
  }
  function showChanges (targets, say) {
    var found = targets.map(resolve).filter(Boolean)
    if (!found.length) return
    var topMost = found.reduce(function (a, b) { return a.node.getBoundingClientRect().top <= b.node.getBoundingClientRect().top ? a : b })
    scrollToEl(topMost.node)
    found.forEach(function (f) { glow(f.node); tagOn(f.host) })
    if (say) srSay(say)
    flowArrow()
  }
  function flowArrow () {
    var a = document.querySelector('.stage__arrow')
    if (!a) return
    a.classList.remove('is-flow')
    void a.offsetWidth
    a.classList.add('is-flow')
  }
  // 変更を伝える。PC はその場で光らせ、〜1023px はバッジとトースト
  function changed (targets, say) {
    var dayT = targets.filter(function (t) { return t.type === 'day' })[0]
    if (dayT) {
      var d = parseIso(dayT.id)
      var mi = d && d.getMonth() === MONTHS[1].getMonth() && d.getFullYear() === MONTHS[1].getFullYear() ? 1 : 0
      if (mi !== custMonth) { custMonth = mi; renderCustCal() }
    }
    if (isPC() || currentTab === 'customer') {
      showChanges(targets, say)
      return
    }
    pending = pending.concat(targets)
    pendingSay = say
    var badge = $('tab-badge')
    var cnt = (+badge.getAttribute('data-n') || 0) + 1
    badge.setAttribute('data-n', cnt)
    badge.textContent = '変更 ' + cnt
    badge.hidden = false
    srSay(say)
    toast('お客様の画面に出しました', '見る', function () {
      selectTab('customer', true)
    })
  }
  function flushPending () {
    var badge = $('tab-badge')
    badge.hidden = true
    badge.setAttribute('data-n', '0')
    if (!pending.length) return
    var t = pending
    var s = pendingSay
    pending = []
    pendingSay = ''
    window.setTimeout(function () { showChanges(t, s) }, 60)
  }

  // ---------- 操作 ----------
  function setToday (st) {
    if (statusOf(TODAY) === st) return
    setStatus(TODAY, st)
    save()
    renderOwner()
    renderCustomer()
    var phase = '本日の札が「' + STATUS[st].label + '」に変わりました'
    if (isPC() || currentTab === 'customer') {
      renderSign(true, function () { changed([{ type: 'sign' }, { type: 'day', id: TODAY_ISO }], 'お客様の画面：' + phase) })
    } else {
      renderSign(false)
      changed([{ type: 'sign' }, { type: 'day', id: TODAY_ISO }], 'お客様の画面：' + phase)
    }
  }
  var saidTimer = null
  function cycleDay (isoStr, btn) {
    var d = parseIso(isoStr)
    if (!d || d < TODAY) return
    var nx = nextStatus(d)
    setStatus(d, nx)
    save()
    if (btn && !reduced.matches) {
      btn.classList.add('is-press')
    }
    window.setTimeout(function () {
      renderOwner()
      renderCustomer()
      var said = $('o-cal-said')
      said.textContent = md(d) + 'を「' + STATUS[nx].label + '」にしました'
      window.clearTimeout(saidTimer)
      saidTimer = window.setTimeout(function () { said.textContent = '' }, 2000)
      var targets = [{ type: 'day', id: isoStr }]
      if (isoStr === TODAY_ISO) {
        targets.unshift({ type: 'sign' })
        renderSign(isPC() || currentTab === 'customer', function () { changed(targets, 'お客様の画面：本日の札が「' + STATUS[nx].label + '」に変わりました') })
      } else {
        changed(targets, 'お客様の画面：' + md(d) + 'が「' + STATUS[nx].label + '」に変わりました')
      }
    }, btn && !reduced.matches ? 120 : 0)
  }
  function setDaily (id) {
    if (state.daily === id) return
    state.daily = id
    save()
    renderOwner()
    renderDaily()
    changed([{ type: 'item', id: 'daily' }], 'お客様の画面：本日の日替わりが「' + findItem(id).name + '」に変わりました')
  }
  function toggleSold (id) {
    var on = !isSold(id)
    if (on) state.soldOut.push(id)
    else state.soldOut = state.soldOut.filter(function (x) { return x !== id })
    save()
    renderOwner()
    var name = id === 'daily' ? '日替わり' : findItem(id).name
    var say = 'お客様の画面：' + name + 'に「本日売り切れ」の札が' + (on ? '付きました' : 'なくなりました')
    var finish = function () {
      if (id === 'daily') renderDaily(on ? 'daily' : null)
      else renderMenu(on ? id : null)
      changed([{ type: 'item', id: id }], say)
    }
    if (!on && !reduced.matches) {
      var st = document.querySelector(id === 'daily' ? '#c-daily .stamp' : '[data-item="' + id + '"] .stamp')
      if (st) { st.classList.add('is-out'); window.setTimeout(finish, 150); return }
    }
    finish()
  }
  function withdraw (nid) {
    var idx = -1
    state.notices.forEach(function (n, i) { if (n.id === nid) idx = i })
    state.notices = state.notices.filter(function (n) { return n.id !== nid })
    save()
    renderOwner()
    renderNews()
    // 押したボタンが消えるので、次の行の「取り下げる」（なければ一覧の見出し）へフォーカスを移す
    var btns = $('o-news').querySelectorAll('button')
    var next = btns[Math.min(Math.max(idx, 0), btns.length - 1)] || $('o-news-title')
    next.focus({ preventScroll: true })
    changed([{ type: 'news' }], 'お客様の画面：お知らせ欄が変わりました')
  }

  // ---------- お知らせのフォーム ----------
  var TPLS = [
    { key: 'closed', label: '臨時休業', kind: 'off', title: '臨時休業のお知らせ', body: function (d) { return mdLong(d) + 'は、都合により臨時休業いたします。ご不便をおかけしますが、よろしくお願いいたします。' }, date: true },
    { key: 'new', label: '新メニュー', kind: 'new', title: '冬の新メニューのお知らせ', body: function () { return '「鶏と白菜のうま煮定食」をはじめました。950円です。数に限りがあります。' } },
    { key: 'ny', label: '年末年始', kind: 'off', title: '年末年始の営業について', body: function () { return NEWYEAR_BODY } }
  ]
  var tplKey = null
  var tplBody = ''
  function renderTpls () {
    var box = $('o-tpls')
    box.innerHTML = ''
    TPLS.forEach(function (t) {
      var b = el('button', 'tpl')
      b.type = 'button'
      b.setAttribute('aria-pressed', tplKey === t.key ? 'true' : 'false')
      b.setAttribute('data-key', 'tpl-' + t.key)
      b.setAttribute('data-tpl', t.key)
      b.innerHTML = CHECK
      b.appendChild(document.createTextNode(t.label))
      b.addEventListener('click', function () { pickTpl(t) })
      box.appendChild(b)
    })
  }
  function tplOf (k) { return TPLS.filter(function (t) { return t.key === k })[0] || null }
  function pickTpl (t) {
    var body = $('f-body')
    var hadText = $('f-title').value.trim() !== '' || body.value.trim() !== ''
    tplKey = t.key
    clearErrors()
    var dateWrap = $('f-date-wrap')
    var fd = $('f-date')
    if (t.date) {
      dateWrap.hidden = false
      var dflt = nextOpenDay(TOMORROW) || TOMORROW
      fd.value = iso(dflt)
      tplBody = t.body(dflt)
    } else {
      dateWrap.hidden = true
      fd.value = ''
      tplBody = t.body()
    }
    $('f-title').value = t.title
    body.value = tplBody
    updateCounts()
    keepFocus(renderTpls)
    if (hadText) glow(body)
  }
  function onDateInput () {
    var t = tplOf(tplKey)
    if (!t || !t.date) return
    var d = parseIso($('f-date').value)
    var body = $('f-body')
    // 例文のまま（書き換えていない）なら、日付に合わせて本文も直す
    if (d && body.value === tplBody) {
      tplBody = t.body(d)
      body.value = tplBody
      updateCounts()
    }
  }
  function updateCounts () {
    $('c-title').textContent = $('f-title').value.length + ' / 30'
    $('c-body').textContent = $('f-body').value.length + ' / 120'
  }
  function setErr (field, errId, msg) {
    var e = $(errId)
    e.innerHTML = svg('alert', 16)
    e.appendChild(document.createTextNode(msg))
    e.hidden = false
    field.classList.add('is-err')
    field.setAttribute('aria-invalid', 'true')
  }
  function clearErrors () {
    ;[['f-date', 'e-date'], ['f-title', 'e-title'], ['f-body', 'e-body']].forEach(function (p) {
      $(p[1]).hidden = true
      $(p[0]).classList.remove('is-err')
      $(p[0]).removeAttribute('aria-invalid')
    })
  }
  var osaidTimer = null
  function publish (e) {
    e.preventDefault()
    clearErrors()
    var t = tplOf(tplKey)
    var title = $('f-title').value.trim()
    var body = $('f-body').value.trim()
    var needDate = !!(t && t.date)
    var d = needDate ? parseIso($('f-date').value) : null
    var firstBad = null
    if (needDate) {
      if (!d || d < TOMORROW || d > RANGE_END) {
        setErr($('f-date'), 'e-date', '明日から' + (RANGE_END.getMonth() + 1) + '月末までの日を選んでください')
        firstBad = firstBad || $('f-date')
      } else if (d.getDay() === REG_DOW) {
        setErr($('f-date'), 'e-date', '水曜は定休日です。ほかの日を選んでください')
        firstBad = firstBad || $('f-date')
      }
    }
    if (!title) { setErr($('f-title'), 'e-title', '見出しを入れてください'); firstBad = firstBad || $('f-title') }
    if (!body) { setErr($('f-body'), 'e-body', '本文を入れてください'); firstBad = firstBad || $('f-body') }
    if (firstBad) { firstBad.focus(); return }

    state.seq = (state.seq || state.notices.length) + 1
    var n = { id: 'n' + state.seq + '-' + Date.now().toString(36), date: TODAY_ISO, kind: t ? t.kind : 'info', title: title, body: body }
    state.notices.unshift(n)
    state.notices = state.notices.slice(0, NOTICE_MAX)
    var targets = [{ type: 'notice', id: n.id }]
    if (needDate) {
      setStatus(d, 'closed')
      targets.push({ type: 'day', id: iso(d) })
      var mi = d.getMonth() === MONTHS[1].getMonth() ? 1 : 0
      ownerMonth = mi
    }
    save()

    // 欄を空に戻す
    $('f-title').value = ''
    $('f-body').value = ''
    $('f-date').value = ''
    $('f-date-wrap').hidden = true
    tplKey = null
    tplBody = ''
    updateCounts()
    renderTpls()

    var msg = needDate ? 'お知らせ欄とカレンダーの2か所に出しました' : 'お知らせ欄に出しました'
    var said = $('o-said')
    said.innerHTML = svg('check', 16)
    said.appendChild(document.createTextNode(msg))
    window.clearTimeout(osaidTimer)
    osaidTimer = window.setTimeout(function () { said.innerHTML = '' }, 4000)

    renderOwner()
    renderCustomer()
    var sayMsg = 'お客様の画面：お知らせ「' + title + '」を出しました' + (needDate ? '。' + md(d) + 'が臨時休業になりました' : '')
    if (needDate && iso(d) === TODAY_ISO) {
      targets.unshift({ type: 'sign' })
      renderSign(false)
    }
    changed(targets, sayMsg)
  }

  // ---------- 見本に戻す ----------
  function resetAll () {
    if (!window.confirm('変えた営業日・売り切れ・お知らせを消して、最初の見本に戻します。よろしいですか？')) return
    if (!fixed) {
      try { window.localStorage.removeItem(KEY) } catch (e) { /* 保存できない設定。メモリだけで動かす */ }
    }
    state = makeSample()
    save()
    custMonth = 0
    ownerMonth = 0
    tplKey = null
    tplBody = ''
    $('f-title').value = ''
    $('f-body').value = ''
    $('f-date').value = ''
    $('f-date-wrap').hidden = true
    clearErrors()
    updateCounts()
    renderTpls()
    renderAll()
    pending = []
    $('tab-badge').hidden = true
    $('tab-badge').setAttribute('data-n', '0')
    toast('見本に戻しました')
  }

  // ---------- タブ（〜1023px） ----------
  var currentTab = 'customer'
  var tabs = ['customer', 'owner']
  function applyLayout () {
    var pc = isPC()
    tabs.forEach(function (k) {
      var p = $('panel-' + k)
      if (pc) {
        p.hidden = false
        p.removeAttribute('role')
        p.setAttribute('aria-labelledby', 'name-' + k)
      } else {
        p.setAttribute('role', 'tabpanel')
        p.setAttribute('aria-labelledby', 'tab-' + k)
        p.hidden = k !== currentTab
      }
    })
  }
  function selectTab (k, fromSee) {
    currentTab = k
    tabs.forEach(function (t) {
      var b = $('tab-' + t)
      var on = t === k
      b.setAttribute('aria-selected', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
    })
    if (k === 'owner') { var dot = $('tab-dot'); if (dot) dot.remove() }
    applyLayout()
    if (!isPC()) {
      // タブの位置まで戻す（上に貼りついたタブの直下から読めるように）
      var bar = $('tabs-bar')
      var top = bar.getBoundingClientRect().top + window.scrollY
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'auto' })
    }
    if (k === 'customer') flushPending()
    if (fromSee) $('tab-customer').focus({ preventScroll: true })
  }
  function setupTabs () {
    tabs.forEach(function (k, i) {
      var b = $('tab-' + k)
      b.addEventListener('click', function () { selectTab(k) })
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
        e.preventDefault()
        var n = tabs[(i + 1) % 2]
        selectTab(n)
        $('tab-' + n).focus()
      })
    })
    var h = location.hash.replace('#', '')
    if (h === 'owner' || h === 'customer') currentTab = h
    if (currentTab === 'owner') { var dot = $('tab-dot'); if (dot) dot.remove() }
    tabs.forEach(function (t) {
      $('tab-' + t).setAttribute('aria-selected', t === currentTab ? 'true' : 'false')
      $('tab-' + t).tabIndex = t === currentTab ? 0 : -1
    })
    applyLayout()
    var onMq = function () { applyLayout() }
    if (pcMq.addEventListener) pcMq.addEventListener('change', onMq)
    else if (pcMq.addListener) pcMq.addListener(onMq)
  }

  // ---------- 「試す」 ----------
  function tryStep (k) {
    if (!isPC() && currentTab !== 'owner') selectTab('owner')
    var target; var box
    if (k === 'today') {
      box = $('o-today-box')
      target = box.querySelector('[aria-checked="true"]') || box.querySelector('button')
    } else if (k === 'soldout') {
      box = document.querySelector('#o-menu-t .orow')
      target = box.querySelector('.sw')
    } else {
      box = $('o-tpls')
      target = box.querySelector('[data-tpl="closed"]')
    }
    var behavior = reduced.matches ? 'auto' : 'smooth'
    if (isPC()) {
      var sc = $('screen-owner')
      var r = box.getBoundingClientRect()
      var sr = sc.getBoundingClientRect()
      var top = sc.scrollTop + (r.top - sr.top) - (sc.clientHeight / 2) + (r.height / 2)
      sc.scrollTo({ top: Math.max(0, top), behavior: behavior })
      // 画面全体は、2台が見える所まで
      var dev = $('panel-owner').getBoundingClientRect()
      if (dev.top < 0 || dev.top > window.innerHeight * 0.5) {
        window.scrollTo({ top: window.scrollY + $('panel-customer').getBoundingClientRect().top - 16, behavior: behavior })
      }
    } else {
      var r2 = box.getBoundingClientRect()
      window.scrollTo({ top: Math.max(0, window.scrollY + r2.top - (window.innerHeight / 2) + (r2.height / 2)), behavior: behavior })
    }
    target.focus({ preventScroll: true })
    glow(box)
  }

  // ---------- 全部描き直す ----------
  function renderAll () {
    renderFlags()
    renderSign(false)
    renderCustomer()
    renderOwner()
    renderLegend($('c-legend'))
    renderLegend($('o-legend'))
  }

  function init () {
    var loaded = load()
    state = loaded || makeSample()
    if (!loaded) save()
    if (!state.daily || !findItem(state.daily)) state.daily = 'd1'

    // 静的な部分のアイコン
    document.querySelectorAll('svg[data-icon]').forEach(function (s) {
      s.innerHTML = ICON[s.getAttribute('data-icon')] || ''
    })

    setupTabs()
    renderTpls()
    renderAll()
    updateCounts()

    document.querySelectorAll('[data-tel]').forEach(function (b) {
      b.addEventListener('click', function () { toast('デモのため発信しません（電話番号も架空です）') })
    })
    document.querySelectorAll('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () { tryStep(b.getAttribute('data-try')) })
    })
    $('o-cal').addEventListener('click', function (e) {
      var b = e.target.closest('.oday')
      if (b && !b.disabled) cycleDay(b.getAttribute('data-date'), b)
    })
    $('o-form').addEventListener('submit', publish)
    $('f-title').addEventListener('input', updateCounts)
    $('f-body').addEventListener('input', updateCounts)
    $('f-date').addEventListener('input', onDateInput)
    $('f-date').addEventListener('change', onDateInput)
    $('f-date').min = iso(TOMORROW)
    $('f-date').max = iso(RANGE_END)
    $('o-reset').addEventListener('click', resetAll)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
