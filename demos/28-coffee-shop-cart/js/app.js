// 焙煎所 アオシグレ（デモ）コーヒー豆のネットショップ：商品・カート・送料と合計の目安
// 外部通信なし・保存なし。カートの中身・届け先・包装・のしは URL のハッシュだけで持つ
// 表示はすべて createElement・textContent・createTextNode。金額は整数の円だけで計算する
;(function () {
  'use strict'

  // ---------- 商品（すべて架空・税込） ----------
  var PRODUCTS = Object.freeze({
    am100: Object.freeze({ cat: 'bean', name: 'あまおと ブレンド（中煎り）', short: 'あまおと ブレンド 100g', vol: '100g', price: 900, stock: 'ok', cap: 5, grind: true, small: true }),
    am200: Object.freeze({ cat: 'bean', name: 'あまおと ブレンド（中煎り）', short: 'あまおと ブレンド 200g', vol: '200g', price: 1700, stock: 'ok', cap: 5, grind: true, small: true }),
    et100: Object.freeze({ cat: 'bean', name: 'エチオピア（浅煎り）', short: 'エチオピア 100g', vol: '100g', price: 1150, stock: 'ok', cap: 5, grind: true, small: true }),
    et200: Object.freeze({ cat: 'bean', name: 'エチオピア（浅煎り）', short: 'エチオピア 200g', vol: '200g', price: 2200, stock: 'out', cap: 0, grind: true, small: true }),
    br100: Object.freeze({ cat: 'bean', name: 'ブラジル（深煎り）', short: 'ブラジル 100g', vol: '100g', price: 990, stock: 'ok', cap: 5, grind: true, small: true }),
    br200: Object.freeze({ cat: 'bean', name: 'ブラジル（深煎り）', short: 'ブラジル 200g', vol: '200g', price: 1880, stock: 'ok', cap: 5, grind: true, small: true }),
    db10: Object.freeze({ cat: 'drip', name: 'ドリップバッグ 10袋の箱', short: 'ドリップバッグ 10袋の箱', vol: '10g × 10袋', price: 1600, stock: 'ok', cap: 5, grind: false, small: true }),
    gift: Object.freeze({ cat: 'gift', name: 'ギフトの箱', short: 'ギフトの箱', vol: '1箱', price: 3400, stock: 'few', cap: 2, grind: false, small: false }),
    drp: Object.freeze({ cat: 'gift', name: '陶器のドリッパー', short: '陶器のドリッパー', vol: '1〜2杯用・1個', price: 2600, stock: 'ok', cap: 5, grind: false, small: false })
  })
  var PRODUCT_KEYS = Object.freeze(['am100', 'am200', 'et100', 'et200', 'br100', 'br200', 'db10', 'gift', 'drp'])
  var GRINDS = Object.freeze({ w: '豆のまま', m: '中挽き', c: '粗挽き' })
  var GRIND_KEYS = Object.freeze(['w', 'm', 'c'])
  var CAT_NAMES = Object.freeze({ all: 'すべて', bean: '豆', drip: 'ドリップバッグ', gift: 'ギフト・器具' })

  // ---------- 送料・オプション（架空の配送料・税込） ----------
  var AREAS = Object.freeze(['hokkaido', 'tohoku', 'kanto', 'kinki', 'kyushu', 'okinawa'])
  var AREA_NAMES = Object.freeze({ hokkaido: '北海道', tohoku: '東北', kanto: '関東・中部', kinki: '近畿・中国・四国', kyushu: '九州', okinawa: '沖縄' })
  var SHIP = Object.freeze({
    hokkaido: Object.freeze({ s: 1000, l: 1400 }),
    tohoku: Object.freeze({ s: 800, l: 1100 }),
    kanto: Object.freeze({ s: 600, l: 900 }),
    kinki: Object.freeze({ s: 700, l: 1000 }),
    kyushu: Object.freeze({ s: 900, l: 1200 }),
    okinawa: Object.freeze({ s: 1500, l: 2200 })
  })
  var FREE_LINE = 5000 // 商品の小計がこれ以上で送料無料
  var OKINAWA_OVER = 800 // 沖縄は無料にならず、5,000円以上でこの額
  var WRAP_FEE = 300 // ギフト包装（1回のご注文につき）
  var NOSHI = Object.freeze({ orei: '御礼', oiwai: '御祝', muji: '無地' })
  var NOSHI_KEYS = Object.freeze(['orei', 'oiwai', 'muji'])

  var S0 = 'カートは空です。商品の「カートに入れる」で入ります。'
  var K14 = '値段・送料は税込の目安です（架空）。税の内訳は出していません。軽減税率の対象かどうかは、お店と確かめて決めます。このデモでは注文・支払いはできません。'

  // ---------- 金額・数の書き方 ----------
  function fmtYen (n) {
    var s = String(Math.abs(n))
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(s.length - 3) + out; s = s.slice(0, s.length - 3) }
    return (n < 0 ? '-' : '') + s + out + '円'
  }
  function fmtQty (n) { return n + '点' }
  function lineName (line) {
    var p = PRODUCTS[line.id]
    return p.grind ? p.short + '（' + GRINDS[line.grind] + '）' : p.short
  }
  function fmtUnit (line) {
    var p = PRODUCTS[line.id]
    return (p.grind ? GRINDS[line.grind] + '・' : '') + '1つ ' + fmtYen(p.price)
  }
  function meterPct (sub) { return Math.floor(Math.min(sub, FREE_LINE) * 100 / FREE_LINE) }

  // ---------- 並び（商品の表の順 → 挽き方の順） ----------
  function orderOf (id, grind) { return PRODUCT_KEYS.indexOf(id) * 3 + (grind ? GRIND_KEYS.indexOf(grind) : 0) }
  function lineKey (line) { return line.id + (line.grind ? '-' + line.grind : '') }
  function inCartOf (cart, id) {
    var n = 0
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id) n += cart[i].qty
    return n
  }
  function hasGift (cart) { return inCartOf(cart, 'gift') > 0 }
  function emptyState () { return { cart: [], area: null, wrap: false, noshi: null } }
  function copyState (s) {
    return { cart: s.cart.map(function (l) { return { id: l.id, grind: l.grind, qty: l.qty } }), area: s.area, wrap: s.wrap, noshi: s.noshi }
  }

  // ---------- 荷物の大きさ ----------
  function smallCountOf (cart) {
    var n = 0
    for (var i = 0; i < cart.length; i++) if (PRODUCTS[cart[i].id].small) n += cart[i].qty
    return n
  }
  function hasBigOf (cart) {
    for (var i = 0; i < cart.length; i++) if (!PRODUCTS[cart[i].id].small) return true
    return false
  }
  function sizeOf (cart) {
    if (!cart.length) return null
    return hasBigOf(cart) || smallCountOf(cart) >= 5 ? 'l' : 's'
  }
  function sizeText (c) {
    if (c.size === 's') return '小さい荷物（豆とドリップバッグ ' + fmtQty(c.smallCount) + '）'
    if (c.hasBig) return '大きい荷物（ギフトの箱・ドリッパー入り）'
    return '大きい荷物（豆とドリップバッグ ' + fmtQty(c.smallCount) + '）'
  }

  // ---------- 送料 ----------
  function shipFee (subtotal, size, area) {
    if (!area || !size || !SHIP[area]) return null
    if (area === 'okinawa') return subtotal >= FREE_LINE ? OKINAWA_OVER : SHIP.okinawa[size]
    return subtotal >= FREE_LINE ? 0 : SHIP[area][size]
  }

  // 「あと◯円」の文（カートが空でない時）
  function msgKey (subtotal, area) {
    var over = subtotal >= FREE_LINE
    if (!area) return over ? 'S6' : 'S5'
    if (area === 'okinawa') return over ? 'S4' : 'S3'
    return over ? 'S2' : 'S1'
  }
  function remainText (subtotal, area, empty) {
    if (empty) return S0
    var d = fmtYen(Math.max(0, FREE_LINE - subtotal))
    var k = msgKey(subtotal, area)
    if (k === 'S1') return '送料無料まで、あと' + d + 'です（商品の小計 5,000円以上で送料無料）。'
    if (k === 'S2') return '送料無料です（商品の小計が5,000円以上）。'
    if (k === 'S3') return '沖縄は送料無料の対象外です。商品の小計があと' + d + 'で、送料が800円になります。'
    if (k === 'S4') return '沖縄は送料無料の対象外です。商品の小計が5,000円以上のため、送料は800円です。'
    if (k === 'S5') return '届け先を選ぶと送料が出ます。商品の小計 5,000円以上で送料無料です（沖縄を除く）。あと' + d + 'です。'
    return '届け先を選ぶと送料が出ます。商品の小計が5,000円以上のため、沖縄以外は送料無料です。'
  }

  // ---------- カートの計算（純粋な関数。整数だけ） ----------
  function calc (state) {
    var cart = state.cart
    if (!cart.length) return { kind: 'empty', qty: 0, subtotal: 0, msgKey: 'S0', msg: S0 }
    var qty = 0
    var subtotal = 0
    for (var i = 0; i < cart.length; i++) { qty += cart[i].qty; subtotal += PRODUCTS[cart[i].id].price * cart[i].qty }
    var size = sizeOf(cart)
    var ship = shipFee(subtotal, size, state.area)
    var wrapFee = state.wrap ? WRAP_FEE : 0
    return {
      kind: 'ok',
      qty: qty,
      smallCount: smallCountOf(cart),
      hasBig: hasBigOf(cart),
      size: size,
      subtotal: subtotal,
      ship: ship,
      wrapFee: wrapFee,
      noshi: state.noshi,
      total: ship === null ? null : subtotal + ship + wrapFee,
      partial: subtotal + wrapFee,
      remain: Math.max(0, FREE_LINE - subtotal),
      meter: meterPct(subtotal),
      msgKey: msgKey(subtotal, state.area),
      msg: remainText(subtotal, state.area, false)
    }
  }

  // ---------- 入れる・増やす・減らす・消す（新しい state を返す） ----------
  function addItem (state, id, grind, n) {
    var p = PRODUCTS[id]
    if (!p) return { state: state, code: 'none' }
    if (p.stock === 'out') return { state: state, code: 'M4' }
    n = Number(n)
    if (!(n >= 1 && n <= p.cap && n === Math.floor(n))) return { state: state, code: 'none' }
    var g = p.grind ? (GRINDS[grind] ? grind : 'w') : null
    var k = inCartOf(state.cart, id)
    if (k + n > p.cap) return { state: state, code: id === 'gift' ? 'M3' : 'M2', k: k, r: p.cap - k }
    var s = copyState(state)
    var key = id + (g ? '-' + g : '')
    var found = null
    for (var i = 0; i < s.cart.length; i++) if (lineKey(s.cart[i]) === key) found = s.cart[i]
    if (found) found.qty += n
    else {
      var line = { id: id, grind: g, qty: n }
      var at = s.cart.length
      for (var j = 0; j < s.cart.length; j++) if (orderOf(s.cart[j].id, s.cart[j].grind) > orderOf(id, g)) { at = j; break }
      s.cart.splice(at, 0, line)
    }
    return { state: s, code: 'M1', n: n, line: { id: id, grind: g, qty: n } }
  }
  function setQty (state, key, qty) {
    var s = copyState(state)
    var line = null
    for (var i = 0; i < s.cart.length; i++) if (lineKey(s.cart[i]) === key) line = s.cart[i]
    if (!line || !(qty >= 1)) return state
    var cap = PRODUCTS[line.id].cap
    if (inCartOf(s.cart, line.id) - line.qty + qty > cap) return state
    line.qty = qty
    return s
  }
  function removeLine (state, key) {
    var s = copyState(state)
    s.cart = s.cart.filter(function (l) { return lineKey(l) !== key })
    if (!hasGift(s.cart)) s.noshi = null
    if (!s.cart.length) { s.wrap = false; s.noshi = null }
    return s
  }

  // ---------- URL のハッシュ ----------
  var T_RE = '(?:(?:am100|am200|et100|br100|br200)-[wmc]-[1-5]|(?:db10|gift|drp)-[1-5])'
  var HASH_RE = new RegExp('^#cart=' + T_RE + '(?:,' + T_RE + ')*(?:&area=(?:hokkaido|tohoku|kanto|kinki|kyushu|okinawa))?(?:&wrap=1)?(?:&noshi=(?:orei|oiwai|muji))?$')
  function buildHash (state) {
    if (!state.cart.length) return ''
    var h = '#cart=' + state.cart.map(function (l) { return lineKey(l) + '-' + l.qty }).join(',')
    if (state.area) h += '&area=' + state.area
    if (state.wrap) h += '&wrap=1'
    if (state.noshi) h += '&noshi=' + state.noshi
    return h
  }
  function parseHash (h) {
    if (typeof h !== 'string' || h.length > 300 || !HASH_RE.test(h)) return null
    var amp = h.indexOf('&')
    var body = h.slice(6, amp < 0 ? h.length : amp)
    var rest = amp < 0 ? '' : h.slice(amp)
    var cart = []
    var last = -1
    var parts = body.split(',')
    for (var i = 0; i < parts.length; i++) {
      var a = parts[i].split('-')
      var line = a.length === 3 ? { id: a[0], grind: a[1], qty: Number(a[2]) } : { id: a[0], grind: null, qty: Number(a[1]) }
      var o = orderOf(line.id, line.grind)
      if (o <= last) return null
      last = o
      cart.push(line)
      if (inCartOf(cart, line.id) > PRODUCTS[line.id].cap) return null
    }
    var am = /&area=([a-z]+)/.exec(rest)
    var nm = /&noshi=([a-z]+)/.exec(rest)
    var s = { cart: cart, area: am ? am[1] : null, wrap: rest.indexOf('&wrap=1') >= 0, noshi: nm ? nm[1] : null }
    if (s.noshi && !hasGift(cart)) return null
    return s
  }

  // ---------- 読み上げの文 ----------
  function shipPart (c, area) { return area && c.kind === 'ok' ? '送料 ' + fmtYen(c.ship) + '、合計 ' + fmtYen(c.total) + 'です。' : '' }
  function sizePart (a, b) {
    if (a.kind !== 'ok' || b.kind !== 'ok' || a.size === b.size) return ''
    return '荷物の大きさが「' + (b.size === 'l' ? '大きい荷物' : '小さい荷物') + '」になりました。'
  }
  // op：add（R1）・step（R2）・del（R3）・opt（R5）。line は対象の行、n は入れた数
  function srText (op, prev, next, line, n) {
    var a = calc(prev)
    var b = calc(next)
    if (op === 'opt') {
      if (b.kind === 'empty') return 'カートは空です。'
      return shipPart(b, next.area) + b.msg
    }
    var name = lineName(line)
    var tail = sizePart(a, b) + shipPart(b, next.area)
    if (op === 'add') return name + 'を' + fmtQty(n) + '、カートに入れました。カートは' + fmtQty(b.qty) + '、商品の小計 ' + fmtYen(b.subtotal) + 'です。' + tail
    if (op === 'step') {
      var q = 0
      for (var i = 0; i < next.cart.length; i++) if (lineKey(next.cart[i]) === lineKey(line)) q = next.cart[i].qty
      return name + 'を' + fmtQty(q) + 'にしました。商品の小計 ' + fmtYen(b.subtotal) + 'です。' + tail
    }
    if (op === 'del') {
      if (b.kind === 'empty') return name + 'をカートから削除しました。カートは空です。'
      return name + 'をカートから削除しました。商品の小計 ' + fmtYen(b.subtotal) + 'です。' + tail
    }
    return ''
  }
  // カードの案内（M2〜M4）
  function capText (code, k, r) {
    if (code === 'M4') return '品切れのため、カートに入れられません。'
    var head = code === 'M3' ? 'ギフトの箱は残り2点です。' : 'この商品は、1回のご注文で5点までです。'
    return head + 'カートに' + fmtQty(k) + '入っているため、' + (r > 0 ? 'あと' + fmtQty(r) + 'まで入れられます。' : 'これ以上は入れられません。')
  }
  function countText (cat) {
    var n = 0
    for (var i = 0; i < PRODUCT_KEYS.length; i++) if (cat === 'all' || PRODUCTS[PRODUCT_KEYS[i]].cat === cat) n++
    return PRODUCT_KEYS.length + '品のうち ' + n + '品を表示しています'
  }

  var api = Object.freeze({
    PRODUCTS: PRODUCTS, PRODUCT_KEYS: PRODUCT_KEYS, GRINDS: GRINDS, GRIND_KEYS: GRIND_KEYS, AREAS: AREAS, AREA_NAMES: AREA_NAMES, SHIP: SHIP,
    FREE_LINE: FREE_LINE, OKINAWA_OVER: OKINAWA_OVER, WRAP_FEE: WRAP_FEE, NOSHI: NOSHI, NOSHI_KEYS: NOSHI_KEYS,
    sizeOf: sizeOf, shipFee: shipFee, calc: calc, addItem: addItem, setQty: setQty, removeLine: removeLine, parseHash: parseHash, buildHash: buildHash,
    fmtYen: fmtYen, fmtQty: fmtQty, lineName: lineName, fmtUnit: fmtUnit, meterPct: meterPct, remainText: remainText, srText: srText,
    sizeText: sizeText, capText: capText, countText: countText, emptyState: emptyState, msgKey: msgKey
  })
  if (typeof window !== 'undefined') window.__demo28 = api

  if (typeof document === 'undefined' || !document.createElement) return

  // ---------- 表示の部品 ----------
  function $ (id) { return document.getElementById(id) }
  function clear (e) { while (e.firstChild) e.removeChild(e.firstChild) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined) e.textContent = text
    return e
  }
  function nw (text) { return el('span', 'nw', text) }
  function vh (text) { return el('span', 'visually-hidden', text) }
  function txt (s) { return document.createTextNode(s) }
  function add (parent) { for (var i = 1; i < arguments.length; i++) parent.appendChild(typeof arguments[i] === 'string' ? txt(arguments[i]) : arguments[i]); return parent }
  var SVG_NS = 'http://www.w3.org/2000/svg'
  function icon (id, size, cls) {
    var s = document.createElementNS(SVG_NS, 'svg')
    s.setAttribute('width', size); s.setAttribute('height', size)
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(SVG_NS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  // 文の中の金額・数量を折れない span にして並べる
  var NW_RE = /(焙煎所 アオシグレ|小さい荷物|大きい荷物|送料無料|ギフトの箱|ギフト包装|陶器のドリッパー|カートに入れる|[\d,]+円|\d+点)/
  function rich (parent, text) {
    var parts = text.split(NW_RE)
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue
      parent.appendChild(i % 2 ? nw(parts[i]) : txt(parts[i]))
    }
    return parent
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var wideMq = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : { matches: false }
  function isWide () { return wideMq.matches }

  // ---------- 状態 ----------
  var state = emptyState()
  var cat = 'all'
  var opener = null
  var sheet = null

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  // 500ms 何も変わらなければ1回だけ。前と同じ文なら一度空にして 50ms 後に入れる
  function say (text) {
    if (!text) return
    clearTimeout(srTimer)
    srTimer = setTimeout(function () {
      var sr = $('sr-status')
      if (sr.textContent === text) {
        sr.textContent = ''
        srTimer = setTimeout(function () { sr.textContent = text }, 50)
        return
      }
      sr.textContent = text
    }, 500)
  }

  // ---------- カート ----------
  function selWrap (select) {
    var w = el('div', 'sel-wrap')
    w.appendChild(select)
    w.appendChild(icon('i-chev', 20, 'sel__icon'))
    return w
  }
  function option (value, text, selected) {
    var o = el('option', '', text)
    o.value = value
    if (selected) o.selected = true
    return o
  }
  function stepBtn (kind, line, disabled) {
    var b = el('button', 'cart__step cart__' + kind)
    b.type = 'button'
    b.setAttribute('data-act', kind)
    b.setAttribute('data-key', lineKey(line))
    b.setAttribute('data-focus', kind + ':' + lineKey(line))
    b.setAttribute('aria-disabled', disabled ? 'true' : 'false')
    b.appendChild(icon(kind === 'minus' ? 'i-minus' : 'i-plus', 20))
    b.appendChild(vh(lineName(line) + (kind === 'minus' ? 'を1つ減らす' : 'を1つ増やす')))
    return b
  }
  function row (cls, label, value, sub) {
    var d = el('div', 'cart__row' + (cls ? ' ' + cls : ''))
    d.appendChild(el('dt', '', label))
    var dd = el('dd', 'cart__val')
    if (typeof value === 'string') dd.appendChild(nw(value))
    else dd.appendChild(value)
    d.appendChild(dd)
    if (sub) d.appendChild(el('dd', 'cart__sub', sub))
    return d
  }
  function renderCart () {
    var wide = isWide()
    var aside = $('cartbox')
    var head = wide ? aside : $('sheet-head')
    var box = wide ? aside : $('sheet-body')
    clear(aside); clear($('sheet-head')); clear($('sheet-body'))
    aside.hidden = !wide
    var c = calc(state)

    head.appendChild(el('p', 'sec__en', 'CART'))
    var h = el('h2', 'sec__title', 'カート')
    h.id = 'h-cart'
    h.tabIndex = -1
    head.appendChild(h)
    if (c.kind === 'ok') box.appendChild(el('p', 'cart__count', fmtQty(c.qty)))

    if (c.kind === 'empty') {
      box.appendChild(rich(el('p', 'cart__empty'), S0))
      box.appendChild(rich(el('p', 'cart__note'), K14))
      box.appendChild(add(el('p', 'cart__links'), linkTo('ship', '送料の表を見る', 'inline-link cart__link')))
      return
    }

    // 行
    var ul = el('ul', 'cart__list')
    state.cart.forEach(function (line) {
      var p = PRODUCTS[line.id]
      var inCart = inCartOf(state.cart, line.id)
      var li = el('li', 'cart__line')
      li.setAttribute('data-key', lineKey(line))
      li.appendChild(add(el('p', 'cart__name'), nw(lineName(line))))
      li.appendChild(rich(el('p', 'cart__unit'), fmtUnit(line)))
      var ctrl = el('div', 'cart__ctrl')
      ctrl.appendChild(stepBtn('minus', line, line.qty <= 1))
      var q = el('span', 'cart__qty nw', fmtQty(line.qty))
      q.setAttribute('aria-hidden', 'true')
      ctrl.appendChild(q)
      ctrl.appendChild(stepBtn('plus', line, inCart >= p.cap))
      ctrl.appendChild(el('span', 'cart__sum nw', fmtYen(p.price * line.qty)))
      var del = el('button', 'cart__del')
      del.type = 'button'
      del.setAttribute('data-act', 'del')
      del.setAttribute('data-key', lineKey(line))
      del.setAttribute('data-focus', 'del:' + lineKey(line))
      add(del, nw('削除'), vh('（' + lineName(line) + '）'))
      ctrl.appendChild(del)
      li.appendChild(ctrl)
      if (inCart >= p.cap) li.appendChild(rich(el('p', 'cart__cap'), line.id === 'gift' ? 'ギフトの箱は残り2点のため、2点までです。' : '1回のご注文で5点までです。'))
      ul.appendChild(li)
    })
    box.appendChild(ul)

    // 届け先の地域
    var area = el('div', 'cart__area')
    var la = el('label', 'cart__label', '届け先の地域')
    la.htmlFor = 'f-area'
    var sa = el('select', 'sel')
    sa.id = 'f-area'
    sa.setAttribute('data-focus', 'f-area')
    sa.setAttribute('aria-describedby', 'f-area-note')
    sa.appendChild(option('', '選んでください', !state.area))
    AREAS.forEach(function (a) { sa.appendChild(option(a, AREA_NAMES[a], state.area === a)) })
    area.appendChild(la)
    area.appendChild(selWrap(sa))
    var an = el('p', 'cart__hint', '地域の分け方と送料は架空の例です。')
    an.id = 'f-area-note'
    area.appendChild(an)
    box.appendChild(area)

    // ギフト包装
    var wl = el('label', 'opt__check')
    var wi = el('input', 'opt__input')
    wi.type = 'checkbox'
    wi.id = 'f-wrap'
    wi.checked = !!state.wrap
    wi.setAttribute('data-focus', 'f-wrap')
    wl.appendChild(wi)
    wl.appendChild(icon('i-check', 24, 'opt__mark'))
    wl.appendChild(add(el('span', 'opt__text'), 'ギフト包装をする（1回のご注文につき ', nw('300円'), '）'))
    box.appendChild(wl)

    // のし（ギフトの箱がある時だけ）
    var gift = hasGift(state.cart)
    if (gift) {
      var nd = el('div', 'cart__area cart__noshi')
      var ln = rich(el('label', 'cart__label'), 'のし（ギフトの箱だけ・無料）')
      ln.htmlFor = 'f-noshi'
      var sn = el('select', 'sel')
      sn.id = 'f-noshi'
      sn.setAttribute('data-focus', 'f-noshi')
      sn.appendChild(option('', '付けない', !state.noshi))
      NOSHI_KEYS.forEach(function (k) { sn.appendChild(option(k, NOSHI[k], state.noshi === k)) })
      nd.appendChild(ln)
      nd.appendChild(selWrap(sn))
      box.appendChild(nd)
    }

    // 計算の表
    var dl = el('dl', 'cart__rows')
    dl.appendChild(row('', '商品の小計', fmtYen(c.subtotal)))
    if (c.ship === null) {
      dl.appendChild(row('cart__row--none', '送料', el('span', 'cart__none', '届け先を選ぶと出ます')))
    } else {
      var sv = c.ship === 0 ? add(el('span', 'nw'), '0円', el('span', 'cart__free', '（送料無料）')) : nw(fmtYen(c.ship))
      var shipRow = row('', '送料', sv)
      shipRow.appendChild(add(el('dd', 'cart__sub'), nw(AREA_NAMES[state.area]), '・', rich(el('span', ''), sizeText(c))))
      dl.appendChild(shipRow)
    }
    dl.appendChild(row('', 'ギフト包装', fmtYen(c.wrapFee)))
    if (gift) dl.appendChild(row('', 'のし', state.noshi ? NOSHI[state.noshi] + '（無料）' : '付けない'))
    box.appendChild(dl)

    // 合計
    var tot = el('div', 'cart__total')
    tot.appendChild(el('p', 'cart__total-label', '合計（税込）'))
    if (c.total === null) {
      tot.classList.add('cart__total--none')
      tot.appendChild(el('p', 'cart__total-none', '届け先を選ぶと出ます'))
      tot.appendChild(add(el('p', 'cart__partial'), '（送料を除く ', nw(fmtYen(c.partial)), '）'))
    } else {
      var num = el('p', 'cart__total-num nw')
      add(num, String(fmtYen(c.total)).slice(0, -1), el('span', 'cart__total-yen', '円'))
      tot.appendChild(num)
    }
    box.appendChild(tot)

    // 目盛りと「あと」の文
    var meter = el('div', 'meter')
    meter.setAttribute('aria-hidden', 'true')
    var fill = el('span', 'meter__fill')
    fill.style.width = c.meter + '%'
    meter.appendChild(fill)
    box.appendChild(meter)
    box.appendChild(rich(el('p', 'meter__text'), c.msg))

    box.appendChild(rich(el('p', 'cart__note'), '送料無料は、商品の小計（ギフト包装を含まない）で決まります。'))
    box.appendChild(rich(el('p', 'cart__note'), K14))
    box.appendChild(add(el('p', 'cart__links'), linkTo('ship', '送料の表を見る', 'inline-link cart__link')))
    var bf = linkTo('before', '「ご注文の前に」を読む', 'btn-sub cart__before')
    box.appendChild(bf)
  }
  function linkTo (id, text, cls) {
    var a = el('a', cls)
    a.href = '#' + id
    a.appendChild(nw(text))
    return a
  }

  // 1024px〜 の欄：画面の高さ − 48px を超える時は貼り付けない
  function fitSticky () {
    var d = $('cartbox')
    if (!d || d.hidden) return
    d.classList.remove('is-static')
    if (d.offsetHeight > window.innerHeight - 48) d.classList.add('is-static')
  }

  function renderCards () {
    var items = document.querySelectorAll('.item')
    for (var i = 0; i < items.length; i++) {
      var id = items[i].getAttribute('data-id')
      var inc = $('c-' + id)
      if (!inc) continue
      var k = inCartOf(state.cart, id)
      inc.hidden = !k
      inc.textContent = k ? 'カートに' + fmtQty(k) : ''
    }
  }
  function renderBar () {
    var c = calc(state)
    $('cartbar-text').textContent = c.kind === 'empty' ? 'カートを見る（0点）' : 'カートを見る（' + fmtQty(c.qty) + '・小計 ' + fmtYen(c.subtotal) + '）'
    $('cartbar').hidden = isWide()
  }
  function renderShipTable () {
    var trs = document.querySelectorAll('.ship-table tr[data-area]')
    for (var i = 0; i < trs.length; i++) {
      var on = trs[i].getAttribute('data-area') === state.area
      trs[i].classList.toggle('ship-table--current', on)
      var th = trs[i].querySelector('th')
      var mark = th.querySelector('.visually-hidden')
      if (on && !mark) th.appendChild(vh('（選んでいる地域）'))
      if (!on && mark) th.removeChild(mark)
    }
  }
  function writeHash () {
    if (!history.replaceState) return
    var h = buildHash(state)
    if (h === location.hash) return
    history.replaceState(null, '', h || location.pathname + location.search)
  }
  // 描き直し（フォーカスのあった役へ戻す）
  function render (focusKey) {
    var a = document.activeElement
    var keep = focusKey || (a && a.getAttribute && a.getAttribute('data-focus'))
    var inCart = a && a.closest && a.closest('#cartbox, #cart-sheet')
    renderCart()
    renderCards()
    renderBar()
    renderShipTable()
    fitSticky()
    if (keep && (inCart || focusKey)) {
      var t = document.querySelector('[data-focus="' + keep + '"]')
      if (t) t.focus({ preventScroll: true })
      else if ($('h-cart')) $('h-cart').focus({ preventScroll: true })
    }
  }
  function commit (next, text, focusKey) {
    state = next
    render(focusKey)
    writeHash()
    say(text)
  }

  // ---------- カードの案内 ----------
  function clearMsgs () {
    var ms = document.querySelectorAll('.item__msg')
    for (var i = 0; i < ms.length; i++) clear(ms[i])
  }
  function cardMsg (id, code, info) {
    clearMsgs()
    var m = $('m-' + id)
    if (code === 'M1') {
      m.appendChild(txt('カートに入れました（' + fmtQty(info.n) + '）。'))
      var b = el('button', 'inline-link item__open')
      b.type = 'button'
      b.setAttribute('data-act', 'open-sheet')
      b.appendChild(nw('カートを見る'))
      m.appendChild(b)
    } else {
      rich(m, capText(code, info.k, info.r))
    }
  }

  // ---------- シート（〜1023px） ----------
  function sheetOpen () { return sheet && (sheet.open || sheet.hasAttribute('open')) }
  function openSheet (from) {
    if (isWide()) return
    opener = from || null
    document.body.classList.add('is-sheet')
    if (typeof sheet.showModal === 'function') {
      if (!sheet.open) sheet.showModal()
    } else {
      sheet.setAttribute('open', '')
      sheet.classList.add('is-fallback')
    }
    sheet.scrollTop = 0
    $('h-cart').focus({ preventScroll: true })
  }
  function closeSheet (restore) {
    if (!sheetOpen()) return
    if (restore === false) opener = null // 閉じた後にフォーカスを動かさない（移動先へ移すため）
    if (typeof sheet.close === 'function' && sheet.open) sheet.close()
    else { sheet.removeAttribute('open'); afterClose() }
  }
  function afterClose () {
    sheet.classList.remove('is-fallback')
    document.body.classList.remove('is-sheet')
    var o = opener
    opener = null
    if (!o) return
    if (!document.body.contains(o) || !o.getClientRects().length) o = $('cartbar-btn')
    if (o && !isWide()) o.focus({ preventScroll: true })
  }

  // ---------- ページ内の移動（ハッシュを変えない） ----------
  function goTo (id) {
    var target = $(id)
    if (!target || target.hidden) return false
    var h = target.querySelector('[tabindex="-1"]') || target
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
    return true
  }

  // ---------- 絞り込み ----------
  function applyFilter (speak) {
    var items = document.querySelectorAll('.item')
    for (var i = 0; i < items.length; i++) items[i].hidden = !(cat === 'all' || items[i].getAttribute('data-cat') === cat)
    var t = countText(cat)
    $('shop-count').textContent = t
    if (speak) say(t + '。')
  }

  // ---------- ハッシュ（開いた時・hashchange） ----------
  function applyHash (fromEvent) {
    var h = location.hash
    if (h.indexOf('#cart=') !== 0) return
    var p = parseHash(h)
    if (!p) {
      // 不正：エラーを出さずに空のカートに戻し、ハッシュを消す。フォーカス・スクロール・読み上げは動かさない
      state = emptyState()
      render()
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search)
      return
    }
    var prev = state
    state = p
    render()
    if (fromEvent) say(srText('opt', prev, state))
  }

  function onAction (b) {
    var act = b.getAttribute('data-act')
    var key = b.getAttribute('data-key')
    var prev = state
    if (act === 'add') {
      var id = b.getAttribute('data-id')
      var g = $('g-' + id)
      var q = $('q-' + id)
      var res = addItem(state, id, g ? g.value : null, q ? Number(q.value) : 1)
      if (res.code === 'M1') {
        cardMsg(id, 'M1', res)
        commit(res.state, srText('add', prev, res.state, res.line, res.n))
      } else if (res.code === 'M2' || res.code === 'M3') {
        cardMsg(id, res.code, res)
        say(capText(res.code, res.k, res.r))
      }
    } else if (act === 'out') {
      cardMsg(b.getAttribute('data-id'), 'M4', {})
      say(capText('M4'))
    } else if (act === 'minus' || act === 'plus') {
      if (b.getAttribute('aria-disabled') === 'true') return
      var line = null
      state.cart.forEach(function (l) { if (lineKey(l) === key) line = l })
      if (!line) return
      var next = setQty(state, key, line.qty + (act === 'plus' ? 1 : -1))
      if (next === state) return
      commit(next, srText('step', prev, next, line), act + ':' + key)
    } else if (act === 'del') {
      var keys = state.cart.map(lineKey)
      var idx = keys.indexOf(key)
      var dline = state.cart[idx]
      if (!dline) return
      var after = removeLine(state, key)
      var to = keys[idx + 1] || keys[idx - 1]
      state = after
      render(to ? 'del:' + to : 'none')
      if (!to && $('h-cart')) $('h-cart').focus({ preventScroll: true })
      writeHash()
      say(srText('del', prev, after, dline))
    } else if (act === 'open-sheet') {
      openSheet(b)
    }
  }

  function init () {
    sheet = $('cart-sheet')

    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null
      if (!t) return
      var a = t.closest('a[href^="#"]')
      if (a) {
        var id = a.getAttribute('href').slice(1)
        if (!id) return
        if (sheetOpen() && a.closest('#cart-sheet')) closeSheet(false)
        if (goTo(id)) e.preventDefault()
        return
      }
      var b = t.closest('button[data-act]')
      if (b) onAction(b)
    })

    // カートの選択（地域・包装・のし）
    document.addEventListener('change', function (e) {
      var t = e.target
      if (!t) return
      if (t.name === 'cat') {
        cat = CAT_NAMES[t.value] ? t.value : 'all'
        applyFilter(true)
        return
      }
      var prev = state
      var next
      if (t.id === 'f-area') {
        next = copyState(state)
        next.area = AREAS.indexOf(t.value) >= 0 ? t.value : null
      } else if (t.id === 'f-wrap') {
        if (t.getAttribute('aria-disabled') === 'true' || !state.cart.length) { t.checked = false; return }
        next = copyState(state)
        next.wrap = !!t.checked
      } else if (t.id === 'f-noshi') {
        next = copyState(state)
        next.noshi = NOSHI[t.value] && hasGift(state.cart) ? t.value : null
      } else return
      commit(next, srText('opt', prev, next), t.id)
    })

    // シート
    $('sheet-close').addEventListener('click', function () { closeSheet() })
    sheet.addEventListener('close', afterClose)
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet() })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('is-fallback') && sheet.hasAttribute('open')) closeSheet()
    })

    // 1024px をまたいだ時
    var onWide = function () {
      var wasOpen = sheetOpen()
      if (isWide() && wasOpen) closeSheet(false)
      render()
      if (isWide() && wasOpen && $('h-cart')) $('h-cart').focus({ preventScroll: true })
    }
    if (wideMq.addEventListener) wideMq.addEventListener('change', onWide)
    else if (wideMq.addListener) wideMq.addListener(onWide)

    window.addEventListener('hashchange', function () { applyHash(true) })
    window.addEventListener('resize', fitSticky)

    // 読み込み直しでブラウザが選択の状態を戻しても、開いた時は最初の状態から始める
    var radios = document.querySelectorAll('.filter__input')
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === 'all'
    var sels = document.querySelectorAll('.item .sel')
    for (var j = 0; j < sels.length; j++) sels[j].selectedIndex = 0
    applyFilter(false)
    state = emptyState()
    render()
    applyHash(false)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
