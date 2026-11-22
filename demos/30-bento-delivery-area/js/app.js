// お弁当のユキワタリ亭（デモ）配達できる？いつ届く？確認ページ
// 外部通信なし・保存なし（条件は URL のハッシュだけ）。注文の欄・送信なし
// 日付は決まった暦（2026-11-30〜2027-01-09）で数える。端末の時計・乱数は使わない
// 表示はすべて createElement・textContent・createTextNode
;(function () {
  'use strict'

  // ---------- 地区12（すべて架空） ----------
  var AREAS = Object.freeze({
    hoshinagi: Object.freeze({ name: 'ホシナギ', zone: 'A', r: 1, c: 1, shop: true }),
    yugenohara: Object.freeze({ name: 'ユゲノハラ', zone: 'A', r: 1, c: 2 }),
    kometsubu: Object.freeze({ name: 'コメツブ', zone: 'A', r: 2, c: 1 }),
    nukumori: Object.freeze({ name: 'ヌクモリ', zone: 'A', r: 2, c: 2 }),
    rurinami: Object.freeze({ name: 'ルリナミ', zone: 'B', r: 0, c: 1 }),
    soyogi: Object.freeze({ name: 'ソヨギ', zone: 'B', r: 0, c: 2 }),
    harunome: Object.freeze({ name: 'ハルノメ', zone: 'B', r: 1, c: 0 }),
    nemurigi: Object.freeze({ name: 'ネムリギ', zone: 'B', r: 2, c: 3 }),
    tookaza: Object.freeze({ name: 'トオカザ', zone: 'C', r: 0, c: 0 }),
    amatsuyu: Object.freeze({ name: 'アマツユ', zone: 'C', r: 1, c: 3 }),
    watage: Object.freeze({ name: 'ワタゲ', zone: 'C', r: 2, c: 0 }),
    hatenomine: Object.freeze({ name: 'ハテノミネ', zone: 'X', r: 0, c: 3 })
  })
  // 升目の順（左上から右へ）
  var AREA_KEYS_MAP = Object.freeze(['tookaza', 'rurinami', 'soyogi', 'hatenomine', 'harunome', 'hoshinagi', 'yugenohara', 'amatsuyu', 'watage', 'kometsubu', 'nukumori', 'nemurigi'])
  // select の順（五十音）
  var AREA_KEYS_LIST = Object.freeze(['amatsuyu', 'kometsubu', 'soyogi', 'tookaza', 'nukumori', 'nemurigi', 'hatenomine', 'harunome', 'hoshinagi', 'yugenohara', 'rurinami', 'watage'])

  // ---------- 区分（すべて架空・税込） ----------
  // freeAt 0 ＝ いつも無料、null ＝ 無料にならない。X ＝ 区分外
  var ZONES = Object.freeze({
    A: Object.freeze({ fee: 0, freeAt: 0, min: 5, lead: 1 }),
    B: Object.freeze({ fee: 500, freeAt: 20, min: 8, lead: 1 }),
    C: Object.freeze({ fee: 1000, freeAt: null, min: 15, lead: 2 }),
    X: null
  })
  var CUT_MIN = 900 // 15:00 を分で

  // ---------- お弁当4種（架空・税込） ----------
  var BENTOS = Object.freeze({
    hi: Object.freeze({ name: '日替わり弁当', price: 680 }),
    kara: Object.freeze({ name: '鶏の唐揚げ弁当', price: 750 }),
    sake: Object.freeze({ name: '焼き鮭弁当', price: 780 }),
    maku: Object.freeze({ name: '幕の内弁当', price: 980 })
  })
  var BENTO_KEYS = Object.freeze(['hi', 'kara', 'sake', 'maku'])

  // ---------- デモの暦（0 ＝ 2026-11-30（月）… 40 ＝ 2027-01-09（土）） ----------
  var DAY0 = Object.freeze({ y: 2026, m: 11, d: 30, wd: 1 })
  var DAYS_LEN = 41
  var WD = Object.freeze(['日', '月', '火', '水', '木', '金', '土'])
  var WISH_FIRST = 2
  var WISH_LAST = 40

  // ---------- デモの時刻5つ ----------
  var TIMES = Object.freeze([
    Object.freeze({ key: '1201-1030', i: 1, min: 630, tag: '朝' }),
    Object.freeze({ key: '1201-1459', i: 1, min: 899, tag: '締めの1分前' }),
    Object.freeze({ key: '1201-1500', i: 1, min: 900, tag: '締めちょうど' }),
    Object.freeze({ key: '1205-1700', i: 5, min: 1020, tag: '土曜の夕方' }),
    Object.freeze({ key: '1206-0900', i: 6, min: 540, tag: '日曜の朝' })
  ])

  // ---------- 暦の関数（整数だけ） ----------
  function wdOf (i) { return (DAY0.wd + i) % 7 }
  function isOpen (i) { return wdOf(i) !== 0 }
  function prevOpen (i) {
    for (var j = i - 1; j >= 0; j--) { if (isOpen(j)) return j }
    return null
  }
  // 締めの日：A・B は前の営業日、C は2つ前の営業日
  function cutDay (i, zone) {
    var Z = ZONES[zone]
    if (!Z) return null
    var c = i
    for (var k = 0; k < Z.lead; k++) {
      c = prevOpen(c)
      if (c === null) return null
    }
    return c
  }
  // 締めの日の 15:00 より前か（15:00 ちょうどは締めの後）
  function inTime (now, i, zone) {
    var c = cutDay(i, zone)
    if (c === null) return false
    if (c > now.i) return true
    if (c === now.i && now.min < CUT_MIN) return true
    return false
  }
  function canDeliver (now, i, zone) { return isOpen(i) && inTime(now, i, zone) }
  function firstFrom (now, zone, s) {
    for (var i = s; i <= WISH_LAST; i++) { if (canDeliver(now, i, zone)) return i }
    return null
  }
  function earliest (now, zone) { return firstFrom(now, zone, now.i + 1) }

  // ---------- お届けの日の結果 ----------
  function delivery (state) {
    if (state.d === null || !AREAS[state.d]) return { kind: 'none' }
    var z = AREAS[state.d].zone
    if (z === 'X') return { kind: 'out' }
    var now = TIMES[state.t]
    var E = earliest(now, z)
    var cutE = cutDay(E, z)
    var w = state.w
    if (w === null) return { kind: 'earliest', E: E, cutE: cutE }
    if (!isOpen(w)) {
      var N = firstFrom(now, z, w)
      return { kind: 'closed', w: w, N: N, cutN: cutDay(N, z), E: E }
    }
    if (!inTime(now, w, z)) return { kind: 'late', w: w, cutW: cutDay(w, z), E: E, cutE: cutE }
    return { kind: 'ok', w: w, cutW: cutDay(w, z), E: E }
  }

  // ---------- 配達料と合計の結果（整数の円） ----------
  function money (state) {
    if (state.d === null || !AREAS[state.d]) return { kind: 'none' }
    var zk = AREAS[state.d].zone
    if (zk === 'X') return { kind: 'out' }
    var Z = ZONES[zk]
    var n = state.n
    if (n < Z.min) return { kind: 'short', need: Z.min - n, min: Z.min, n: n }
    var free = Z.freeAt === 0 || (Z.freeAt !== null && n >= Z.freeAt)
    var fee = free ? 0 : Z.fee
    var price = BENTOS[state.b].price
    var sub = price * n
    var toFree = (Z.freeAt !== null && Z.freeAt > 0 && n < Z.freeAt) ? Z.freeAt - n : 0
    return { kind: 'ok', price: price, n: n, sub: sub, fee: fee, free: free, total: sub + fee, toFree: toFree }
  }

  // ---------- 書き方 ----------
  function pad2 (n) { return n < 10 ? '0' + n : String(n) }
  function monthDay (i) {
    if (i === 0) return { y: DAY0.y, m: DAY0.m, d: DAY0.d }
    if (i <= 31) return { y: 2026, m: 12, d: i }
    return { y: 2027, m: 1, d: i - 31 }
  }
  function fmtYen (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) {
      out = ',' + s.slice(s.length - 3) + out
      s = s.slice(0, s.length - 3)
    }
    return s + out + '円'
  }
  function fmtDay (i) { var p = monthDay(i); return p.m + '月' + p.d + '日（' + WD[wdOf(i)] + '）' }
  function fmtCut (i) { return fmtDay(i) + '15:00' }
  function fmtClock (min) { return Math.floor(min / 60) + ':' + pad2(min % 60) }
  function fmtNow (t) { var T = TIMES[t]; return fmtDay(T.i) + fmtClock(T.min) }
  function fmtQty (n) { return n + '個' }
  function fmtUnit (price, n) { return fmtYen(price) + ' × ' + fmtQty(n) }
  function fmtZone (z) { return z === 'X' ? '区分外' : z + '区分' }
  function dayKey (i) { var p = monthDay(i); return p.y + '-' + pad2(p.m) + '-' + pad2(p.d) }
  function dayFromKey (k) {
    for (var i = WISH_FIRST; i <= WISH_LAST; i++) { if (dayKey(i) === k) return i }
    return null
  }
  function timeIndex (key) {
    for (var t = 0; t < TIMES.length; t++) { if (TIMES[t].key === key) return t }
    return null
  }

  // ---------- ハッシュ ----------
  var HASH_RE = /^#d=(hoshinagi|yugenohara|kometsubu|nukumori|rurinami|soyogi|harunome|nemurigi|tookaza|amatsuyu|watage|hatenomine)&n=([1-9]|[12][0-9]|30)(?:&w=(2026-12-(?:0[2-9]|[12][0-9]|3[01])|2027-01-0[1-9]))?&t=(1201-1030|1201-1459|1201-1500|1205-1700|1206-0900)&b=(hi|kara|sake|maku)$/
  // 正しければ状態、だめなら null（decode しない・空白を取らない・大文字小文字を変えない）
  function parseHash (h) {
    if (typeof h !== 'string' || h.length > 120) return null
    var m = HASH_RE.exec(h)
    if (!m) return null
    return { d: m[1], n: Number(m[2]), w: m[3] ? dayFromKey(m[3]) : null, t: timeIndex(m[4]), b: m[5] }
  }
  function buildHash (s) {
    if (s.d === null) return ''
    return '#d=' + s.d + '&n=' + s.n + (s.w !== null ? '&w=' + dayKey(s.w) : '') + '&t=' + TIMES[s.t].key + '&b=' + s.b
  }
  // 「#d=」で始まる（と「#d」だけ）なら、このページの条件のハッシュとして読む
  function isDemoHash (h) { return h === '#d' || h.slice(0, 3) === '#d=' }

  // ---------- 読み上げの文 ----------
  function s1 (s) {
    if (s.d === null) return '地区を選んでいません。'
    var A = AREAS[s.d]
    if (A.zone === 'X') return A.name + '地区は配達の区域外です。'
    return A.name + '地区は' + A.zone + '区分です。' + ZONES[A.zone].min + '個から配達できます。'
  }
  function s2 (s) {
    var r = delivery(s)
    if (r.kind === 'earliest') return '最短のお届け日は' + fmtDay(r.E) + 'です。'
    if (r.kind === 'ok') return fmtDay(r.w) + 'にお届けできます。'
    if (r.kind === 'late') return fmtDay(r.w) + 'は締めを過ぎています。次は' + fmtDay(r.E) + 'です。'
    if (r.kind === 'closed') return fmtDay(r.w) + 'は定休日です。次は' + fmtDay(r.N) + 'です。'
    return ''
  }
  function s3 (s) {
    var r = money(s)
    if (r.kind === 'ok') return '合計の目安は' + fmtYen(r.total) + 'です。'
    if (r.kind === 'short') return 'あと' + r.need + '個で配達できます。'
    return ''
  }
  function s4 (s) { return 'デモの時刻を' + fmtNow(s.t) + 'にしました。' }
  // what：area（地区）・hash・time・wish・qty（個数とお弁当）
  function srText (what, s) {
    if (what === 'area' || what === 'hash') {
      if (s.d !== null && AREAS[s.d].zone === 'X') return s1(s)
      return s1(s) + s2(s) + s3(s)
    }
    if (what === 'time') return s4(s) + s2(s)
    if (what === 'wish') return s2(s)
    if (what === 'qty') return s3(s)
    return ''
  }

  window.__demo30 = {
    AREAS: AREAS, AREA_KEYS_MAP: AREA_KEYS_MAP, AREA_KEYS_LIST: AREA_KEYS_LIST, ZONES: ZONES, CUT_MIN: CUT_MIN,
    BENTOS: BENTOS, BENTO_KEYS: BENTO_KEYS, TIMES: TIMES, DAY0: DAY0, DAYS_LEN: DAYS_LEN, WD: WD,
    WISH_FIRST: WISH_FIRST, WISH_LAST: WISH_LAST,
    wdOf: wdOf, isOpen: isOpen, prevOpen: prevOpen, cutDay: cutDay, inTime: inTime, canDeliver: canDeliver,
    firstFrom: firstFrom, earliest: earliest, delivery: delivery, money: money, parseHash: parseHash, buildHash: buildHash,
    fmtYen: fmtYen, fmtDay: fmtDay, fmtCut: fmtCut, fmtNow: fmtNow, fmtQty: fmtQty, fmtUnit: fmtUnit, fmtZone: fmtZone,
    dayKey: dayKey, srText: srText
  }

  // ======================================================================
  // ここから画面（node で読む時はここで止まる）
  if (typeof document === 'undefined' || !document.createElement) return

  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function nw (text) { return el('span', 'nw', text) }
  function txt (t) { return document.createTextNode(t) }
  // 文と .nw の span を並べた段落（parts の配列：文字列はそのまま、[文字列] は折らない）
  function para (tag, cls, parts) {
    var p = el(tag, cls)
    parts.forEach(function (x) { p.appendChild(typeof x === 'string' ? txt(x) : nw(x[0])) })
    return p
  }
  var SVGNS = 'http://www.w3.org/2000/svg'
  function icon (id, size, cls) {
    var s = document.createElementNS(SVGNS, 'svg')
    s.setAttribute('width', String(size))
    s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true')
    s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(SVGNS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  function clear (node) { while (node.firstChild) node.removeChild(node.firstChild) }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態 ----------
  function initState () { return { d: null, n: 10, w: null, t: 0, b: 'hi' } }
  var state = initState()
  var lastTile = null

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
    var target = $(id)
    if (!target) return
    var h = target.querySelector('[tabindex="-1"]') || target
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
  }

  // ---------- 条件の部品を状態にそろえる ----------
  function tiles () { return Array.prototype.slice.call(document.querySelectorAll('.map__btn')) }
  function rovingKey () {
    if (state.d !== null) return state.d
    if (lastTile) return lastTile
    return 'hoshinagi'
  }
  function syncControls () {
    $('f-area').value = state.d === null ? '' : state.d
    var rk = rovingKey()
    tiles().forEach(function (b) {
      var k = b.getAttribute('data-area')
      var on = k === state.d
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
      b.setAttribute('tabindex', k === rk ? '0' : '-1')
      var r = $('tile-' + k)
      if (r) r.classList.toggle('is-sel', on)
    })
    var cur = state.d === null ? null : AREAS[state.d].zone
    Array.prototype.forEach.call(document.querySelectorAll('.zone-card'), function (c) {
      var on = c.getAttribute('data-zone') === cur
      c.classList.toggle('zone-card--current', on)
      c.querySelector('.zone-card__cur').hidden = !on
    })
    Array.prototype.forEach.call(document.querySelectorAll('input[name="now"]'), function (r, i) { r.checked = i === state.t })
    Array.prototype.forEach.call(document.querySelectorAll('input[name="bento"]'), function (r) { r.checked = r.value === state.b })
    $('qty-out').textContent = fmtQty(state.n)
    $('qty-minus').setAttribute('aria-disabled', state.n <= 1 ? 'true' : 'false')
    $('qty-plus').setAttribute('aria-disabled', state.n >= 30 ? 'true' : 'false')
    Array.prototype.forEach.call(document.querySelectorAll('.qty__quick button'), function (b) {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-n')) === state.n ? 'true' : 'false')
    })
    $('f-wish').value = state.w === null ? '' : dayKey(state.w)
  }

  // ---------- 地区の結果のカード ----------
  function renderZres () {
    var box = $('zres-body')
    clear(box)
    var toWhen = $('zres-to-when')
    if (state.d === null) {
      box.appendChild(el('p', 'zres__empty', '地区を選ぶと、ここに配達できるかと配達料が出ます。'))
      toWhen.hidden = true
      return
    }
    var A = AREAS[state.d]
    if (A.zone === 'X') {
      var n = el('div', 'notice')
      var head = el('div', 'notice__head')
      head.appendChild(icon('i-info', 20))
      head.appendChild(para('p', 'notice__title', [[A.name + '地区'], 'は、配達の区域外です']))
      n.appendChild(head)
      n.appendChild(el('p', 'notice__text', 'お店から遠く、峠の道を通るため、配達していません（架空）。'))
      n.appendChild(el('h3', 'notice__h3', '代わりの方法'))
      var ul = el('ul', 'notice__list')
      var li1 = el('li')
      li1.appendChild(el('strong', null, '店頭受け取り：'))
      li1.appendChild(txt('ホシナギ地区のお店で受け取れます（架空）。受け取りの日と時間は、ご注文の時にご相談ください。'))
      var li2 = el('li')
      li2.appendChild(el('strong', null, 'ご相談ください：'))
      li2.appendChild(txt('まとまった数のご注文は、配達できるかをご相談ください（このデモに連絡先はありません）。'))
      ul.appendChild(li1)
      ul.appendChild(li2)
      n.appendChild(ul)
      box.appendChild(n)
      toWhen.hidden = true
      return
    }
    var Z = ZONES[A.zone]
    var top = el('p', 'zres__head')
    top.appendChild(el('span', 'zres__name nw', A.name + '地区'))
    top.appendChild(el('span', 'zres__badge zres__badge--' + A.zone.toLowerCase() + ' nw', fmtZone(A.zone)))
    box.appendChild(top)
    var okp = el('p', 'zres__ok')
    okp.appendChild(icon('i-check', 20))
    okp.appendChild(txt('配達できます'))
    box.appendChild(okp)
    var dl = el('dl', 'zres__list')
    var rows = [
      ['配達料', Z.fee === 0 ? '無料' : fmtYen(Z.fee)],
      ['最低の個数', Z.min + '個から'],
      ['締め', Z.lead === 1 ? 'お届けの前日の15:00まで' : 'お届けの前々日の15:00まで']
    ]
    rows.forEach(function (r) {
      var d = el('div', 'zres__row')
      d.appendChild(el('dt', null, r[0]))
      var dd = el('dd')
      dd.appendChild(nw(r[1]))
      d.appendChild(dd)
      dl.appendChild(d)
    })
    box.appendChild(dl)
    if (A.shop) box.appendChild(el('p', 'zres__shop', 'お店のある地区です（架空）。'))
    toWhen.hidden = false
  }

  // ---------- お届けの日 ----------
  function whenDay (label, badge, value, cutParts) {
    var d = el('div', 'when-day')
    var lab = el('p', 'when-day__label')
    lab.appendChild(txt(label))
    if (badge) lab.appendChild(el('span', 'when-day__badge nw', badge))
    d.appendChild(lab)
    d.appendChild(el('p', 'when-day__value nw', value))
    d.appendChild(para('p', 'when-day__cut', cutParts))
    return d
  }
  function noticeBox (titleParts, textParts) {
    var n = el('div', 'notice')
    var head = el('div', 'notice__head')
    head.appendChild(icon('i-info', 20))
    head.appendChild(para('p', 'notice__title', titleParts))
    n.appendChild(head)
    n.appendChild(para('p', 'notice__text', textParts))
    return n
  }
  function renderDay () {
    $('wres-now-val').textContent = fmtNow(state.t)
    var box = $('wres-day')
    clear(box)
    var r = delivery(state)
    if (r.kind === 'none') { box.appendChild(el('p', 'wres__msg', '地区を選ぶと、最短のお届け日が出ます。')); return }
    if (r.kind === 'out') { box.appendChild(el('p', 'wres__msg', 'この地区には配達していないため、お届けの日は出していません。')); return }
    if (r.kind === 'earliest') {
      box.appendChild(whenDay('最短のお届け日', null, fmtDay(r.E), ['その日に届けるための締め：', [fmtCut(r.cutE) + ' まで']]))
    } else if (r.kind === 'ok') {
      box.appendChild(whenDay('ご希望の日', 'お届けできます', fmtDay(r.w), ['締め：', [fmtCut(r.cutW) + ' まで']]))
      box.appendChild(para('p', 'wres__sub', ['最短のお届け日は', [fmtDay(r.E)], 'です。']))
    } else if (r.kind === 'late') {
      box.appendChild(noticeBox([[fmtDay(r.w)], 'のお届けは、締めを過ぎています'], [[fmtDay(r.w)], 'にお届けするための締めは、', [fmtCut(r.cutW)], ' でした。']))
      box.appendChild(whenDay('次に届けられる日', null, fmtDay(r.E), ['締め：', [fmtCut(r.cutE) + ' まで']]))
    } else if (r.kind === 'closed') {
      box.appendChild(noticeBox([[fmtDay(r.w)], 'は', ['定休日'], 'です'], ['日曜日はお休みのため、配達していません。']))
      box.appendChild(whenDay('次に届けられる日', null, fmtDay(r.N), ['締め：', [fmtCut(r.cutN) + ' まで']]))
    }
    box.appendChild(el('p', 'wres__note', 'お届けは11時〜12時の間です（架空）。時間の指定は、このデモでは選べません。'))
  }

  // ---------- 配達料と合計の目安 ----------
  function renderMoney () {
    var box = $('wres-money')
    clear(box)
    var r = money(state)
    if (r.kind === 'none') { box.appendChild(el('p', 'wres__msg', '地区を選ぶと、配達料と合計の目安が出ます。')); return }
    if (r.kind === 'out') { box.appendChild(el('p', 'wres__msg', 'この地区には配達していないため、配達料は出していません。')); return }
    var zk = AREAS[state.d].zone
    if (r.kind === 'short') {
      box.appendChild(noticeBox(['あと', [r.need + '個'], 'で配達できます'], [[zk + '区分'], 'の配達は', [r.min + '個から'], 'です。いまは', [fmtQty(r.n)], 'です。']))
      return
    }
    var B = BENTOS[state.b]
    var tb = el('table', 'sum')
    tb.appendChild(el('caption', 'visually-hidden', '配達料と合計の目安'))
    var body = el('tbody')
    var tr1 = el('tr')
    var th1 = el('th')
    th1.setAttribute('scope', 'row')
    th1.appendChild(el('span', 'sum__item', 'お弁当'))
    var subl = el('span', 'sum__sub')
    subl.appendChild(nw(B.name))
    subl.appendChild(txt(' '))
    subl.appendChild(nw(fmtUnit(B.price, r.n)))
    th1.appendChild(subl)
    tr1.appendChild(th1)
    var td1 = el('td')
    td1.appendChild(nw(fmtYen(r.sub)))
    tr1.appendChild(td1)
    var tr2 = el('tr')
    var th2 = el('th', null)
    th2.setAttribute('scope', 'row')
    th2.appendChild(el('span', 'sum__item', '配達料'))
    tr2.appendChild(th2)
    var td2 = el('td')
    td2.appendChild(nw(r.fee > 0 ? fmtYen(r.fee) : '0円（無料）'))
    tr2.appendChild(td2)
    body.appendChild(tr1)
    body.appendChild(tr2)
    tb.appendChild(body)
    box.appendChild(tb)
    var tot = el('p', 'sum__total')
    tot.appendChild(el('span', 'sum__total-label nw', '合計の目安（税込）'))
    var yen = fmtYen(r.total)
    var v = el('span', 'sum__total-value nw', yen.slice(0, yen.length - 1))
    v.appendChild(el('span', 'sum__yen', '円'))
    tot.appendChild(v)
    box.appendChild(tot)
    var note
    if (zk === 'A') note = ['A区分は、配達料が無料です。']
    else if (zk === 'B' && r.toFree > 0) note = ['B区分は', ['20個以上'], 'で配達料が無料です。あと', [r.toFree + '個'], 'です。']
    else if (zk === 'B') note = [['20個以上'], 'なので、配達料は無料です。']
    else note = ['C区分の配達料は、個数にかかわらず', ['1,000円'], 'です。']
    box.appendChild(para('p', 'sum__note', note))
  }

  // ---------- 描き直し ----------
  function render () {
    syncControls()
    renderZres()
    renderDay()
    renderMoney()
  }
  // 操作のたびに URL を書き換える（履歴を増やさない）
  function writeHash () {
    if (!window.history || !history.replaceState) return
    if (state.d !== null) {
      var h = buildHash(state)
      if (location.hash !== h) history.replaceState(null, '', h)
    } else if (isDemoHash(location.hash)) {
      history.replaceState(null, '', location.pathname + location.search)
    }
  }
  function change (what) {
    render()
    writeHash()
    say(srText(what, state))
  }

  // ---------- ハッシュを読む ----------
  // fromEvent：hashchange の時だけ読み上げる
  function applyHash (fromEvent) {
    var h = location.hash
    if (!isDemoHash(h)) return
    var s = parseHash(h)
    if (s === null) {
      state = initState()
      if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search)
      render()
      return
    }
    state = s
    render()
    if (fromEvent) say(srText('hash', state))
  }

  // ---------- 模式図のキーボード（ロービング tabindex） ----------
  function tileAt (r, c) {
    for (var i = 0; i < AREA_KEYS_MAP.length; i++) {
      var A = AREAS[AREA_KEYS_MAP[i]]
      if (A.r === r && A.c === c) return AREA_KEYS_MAP[i]
    }
    return null
  }
  function focusTile (key) {
    lastTile = key
    tiles().forEach(function (b) { b.setAttribute('tabindex', b.getAttribute('data-area') === key ? '0' : '-1') })
    var b = document.querySelector('.map__btn[data-area="' + key + '"]')
    if (b) b.focus()
  }
  function onMapKey (e) {
    var b = e.target.closest ? e.target.closest('.map__btn') : null
    if (!b) return
    var A = AREAS[b.getAttribute('data-area')]
    var r = A.r
    var c = A.c
    var k = e.key
    if (k === 'ArrowRight') c = Math.min(3, c + 1)
    else if (k === 'ArrowLeft') c = Math.max(0, c - 1)
    else if (k === 'ArrowDown') r = Math.min(2, r + 1)
    else if (k === 'ArrowUp') r = Math.max(0, r - 1)
    else if (k === 'Home') c = 0
    else if (k === 'End') c = 3
    else return
    e.preventDefault()
    focusTile(tileAt(r, c))
  }

  // ---------- 希望日の select を作る ----------
  function buildWish () {
    var sel = $('f-wish')
    var g12 = document.createElement('optgroup')
    g12.label = '2026年12月'
    var g1 = document.createElement('optgroup')
    g1.label = '2027年1月'
    for (var i = WISH_FIRST; i <= WISH_LAST; i++) {
      var o = document.createElement('option')
      o.value = dayKey(i)
      o.textContent = fmtDay(i) + (isOpen(i) ? '' : ' 定休日')
      ;(i <= 31 ? g12 : g1).appendChild(o)
    }
    sel.appendChild(g12)
    sel.appendChild(g1)
  }

  function init () {
    buildWish()

    $('f-area').addEventListener('change', function () {
      var v = this.value
      state.d = AREAS[v] ? v : null
      change('area')
    })
    tiles().forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-area')
        lastTile = k
        state.d = k
        change('area')
      })
      b.addEventListener('focus', function () { lastTile = b.getAttribute('data-area') })
    })
    document.querySelector('.map__grid').addEventListener('keydown', onMapKey)

    Array.prototype.forEach.call(document.querySelectorAll('input[name="now"]'), function (r, i) {
      r.addEventListener('change', function () { if (r.checked) { state.t = i; change('time') } })
    })
    Array.prototype.forEach.call(document.querySelectorAll('input[name="bento"]'), function (r) {
      r.addEventListener('change', function () { if (r.checked && BENTOS[r.value]) { state.b = r.value; change('qty') } })
    })
    $('qty-minus').addEventListener('click', function () {
      if (state.n <= 1) return
      state.n--
      change('qty')
    })
    $('qty-plus').addEventListener('click', function () {
      if (state.n >= 30) return
      state.n++
      change('qty')
    })
    Array.prototype.forEach.call(document.querySelectorAll('.qty__quick button'), function (b) {
      b.addEventListener('click', function () { state.n = Number(b.getAttribute('data-n')); change('qty') })
    })
    $('f-wish').addEventListener('change', function () {
      state.w = this.value === '' ? null : dayFromKey(this.value)
      change('wish')
    })
    $('hero-cta').addEventListener('click', function () { goTo('area') })
    // ロゴはハッシュ（条件）を変えずにページの先頭へ
    document.querySelector('.hd__logo').addEventListener('click', function (e) { e.preventDefault(); goTo('top') })
    $('zres-to-when').querySelector('button').addEventListener('click', function () { goTo('when') })

    window.addEventListener('hashchange', function () { applyHash(true) })

    // 読み込み直しでブラウザが欄の状態を戻しても、開いた時は最初の状態から
    state = initState()
    render()
    applyHash(false)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
