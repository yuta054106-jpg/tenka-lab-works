// シラカゲ不動産（デモ）賃貸物件の一覧と絞り込み
// 外部通信なし。保存は「気になる」だけ（localStorage のキー1つ。使えない時はメモリだけで動く）
// 表示はすべて createElement・textContent・createTextNode
;(function () {
  'use strict'

  // ---------- 条件の定数 ----------
  var LAY_KEYS = Object.freeze(['1r', '1k', '1ldk', '2ldk', '3ldk'])
  var OPT_KEYS = Object.freeze(['pet', 'park', 'floor2', 'bath', 'new10'])
  var RENT_CAPS = Object.freeze([5, 6, 7, 8, 9, 10])
  var WALK_CAPS = Object.freeze([5, 10, 15])
  var SORT_KEYS = Object.freeze(['cheap', 'new', 'near'])
  var LAY_NAME = Object.freeze({ '1r': '1R', '1k': '1K', '1ldk': '1LDK', '2ldk': '2LDK', '3ldk': '3LDK' })
  var OPT_NAME = Object.freeze({ pet: 'ペット可', park: '駐車場あり', floor2: '2階以上', bath: 'バストイレ別', new10: '築10年以内' })
  var OPT_ICON = Object.freeze({ pet: 'i-pet', park: 'i-car', floor2: 'i-floor', bath: 'i-bath', new10: 'i-new' })
  var SORT_NAME = Object.freeze({ cheap: '家賃の安い順（管理費込み）', new: '新しい順（築年数）', near: '駅から近い順' })
  var LINE = 'ゆきあかり線'
  var FAV_KEY = 'tenka-demo26-fav'

  // ---------- 物件（18件。すべて架空の決まった値。面積は10倍の整数） ----------
  function prop (no, name, station, walk, lay, area10, rent, fee, depositM, keyM, age, floor, floors, pet, park, bath) {
    var id = 'p' + (no < 10 ? '0' : '') + no
    return Object.freeze({ id: id, no: no, name: name, station: station, walk: walk, lay: lay, area10: area10, rent: rent, fee: fee, depositM: depositM, keyM: keyM, age: age, floor: floor, floors: floors, pet: pet, park: park, bath: bath })
  }
  var PROPS = Object.freeze([
    prop(1, 'コナユキハイツ 102', 'こなゆき台', 3, '1r', 185, 38000, 2000, 0, 0, 28, 1, 2, false, false, false),
    prop(2, 'フユミ橋レジデンス 305', 'ふゆみ橋', 6, '1k', 240, 52000, 3000, 1, 0, 12, 3, 5, false, false, true),
    prop(3, 'シモツキテラス 201', 'しもつき通', 9, '1ldk', 382, 68000, 4000, 1, 1, 6, 2, 3, true, true, true),
    prop(4, 'ツララが丘ハウス A', 'つららが丘', 14, '2ldk', 550, 72000, 3000, 1, 0, 18, 1, 2, true, true, true),
    prop(5, 'コナユキ台パレス 403', 'こなゆき台', 5, '1ldk', 405, 86000, 5000, 1, 1, 3, 4, 8, false, true, true),
    prop(6, 'フユミコート 102', 'ふゆみ橋', 11, '1k', 224, 45000, 2000, 0, 1, 22, 1, 3, false, false, true),
    prop(7, 'シモツキメゾン 302', 'しもつき通', 4, '2ldk', 586, 98000, 6000, 1, 1, 2, 3, 6, true, true, true),
    prop(8, 'ツララ荘 203', 'つららが丘', 8, '1r', 201, 41000, 2000, 0, 0, 15, 2, 3, false, false, false),
    prop(9, 'コナユキガーデン 101', 'こなゆき台', 12, '3ldk', 723, 115000, 5000, 2, 1, 9, 1, 3, true, true, true),
    prop(10, 'フユミハイツ 202', 'ふゆみ橋', 2, '1k', 258, 58000, 3000, 1, 1, 7, 2, 4, false, false, true),
    prop(11, 'シモツキコーポ 105', 'しもつき通', 13, '1ldk', 360, 55000, 2000, 1, 0, 25, 1, 2, true, true, true),
    prop(12, 'ツララテラス 301', 'つららが丘', 7, '2ldk', 524, 79000, 4000, 1, 1, 11, 3, 4, false, true, true),
    prop(13, 'コナユキメゾン 205', 'こなゆき台', 10, '1k', 232, 49000, 3000, 1, 0, 10, 2, 3, true, false, true),
    prop(14, 'フユミガーデン 401', 'ふゆみ橋', 15, '3ldk', 708, 92000, 4000, 1, 1, 20, 4, 5, true, true, true),
    prop(15, 'シモツキハウス 201', 'しもつき通', 1, '1r', 176, 43000, 3000, 0, 1, 5, 2, 3, false, false, false),
    prop(16, 'ツララが丘コート 102', 'つららが丘', 18, '2ldk', 602, 66000, 3000, 0, 0, 30, 1, 2, true, true, true),
    prop(17, 'コナユキテラス 302', 'こなゆき台', 6, '2ldk', 540, 88000, 5000, 1, 1, 8, 3, 5, false, true, true),
    prop(18, 'フユミパレス 206', 'ふゆみ橋', 9, '1ldk', 420, 74000, 4000, 1, 1, 14, 2, 6, false, false, true)
  ])
  var TOTAL = PROPS.length
  var BY_ID = {}
  PROPS.forEach(function (p) { BY_ID[p.id] = p })

  // 間取り図の部屋（間取りごとに型1つ）
  var PLAN_ROOMS = Object.freeze({
    '1r': ['bal', 'r1', 'ub', 'k', 'en'],
    '1k': ['bal', 'r1', 'k', 'ba', 'wc', 'en'],
    '1ldk': ['bal', 'ldk', 'r1', 'ba', 'wc', 'en'],
    '2ldk': ['bal', 'r1', 'ldk', 'r2', 'ba', 'wc', 'en'],
    '3ldk': ['bal', 'r1', 'ldk', 'r2', 'r3', 'ba', 'wc', 'en']
  })
  var ROOM_NAME = Object.freeze({ bal: 'バルコニー', ldk: 'LDK', k: 'キッチン', ub: 'ユニットバス', ba: '浴室', wc: 'トイレ', en: '玄関' })

  // ---------- 書き方（3けたの区切りは自分で入れる） ----------
  function comma (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3) }
    return s + out
  }
  function fmtYen (n) { return comma(n) + '円' }
  function fmtRentCap (man) { return man + '万円以下' }
  function fmtMonths (m) { return m === 0 ? 'なし' : m + 'か月' }
  function fmtArea (x10) { return Math.floor(x10 / 10) + '.' + (x10 % 10) + '㎡' }
  function fmtWalk (n) { return '徒歩' + n + '分' }
  function fmtAge (n) { return '築' + n + '年' }
  function fmtFloor (f, total) { return f + '階（' + total + '階建て）' }
  function fmtCount (n) { return n + '件' }
  function fmtNo (no) { return (no < 10 ? '0' : '') + no }

  // ---------- 絞り込み・並べ替え（純粋な関数） ----------
  function monthly (p) { return p.rent + p.fee }
  function hasOpt (p, k) {
    if (k === 'floor2') return p.floor >= 2
    if (k === 'new10') return p.age <= 10
    return p[k] === true
  }
  function emptyCond () { return { rent: null, lay: [], walk: null, opt: [] } }
  function ordered (keys, list) { return keys.filter(function (k) { return list.indexOf(k) >= 0 }) }
  function matches (p, cond) {
    if (cond.rent !== null && monthly(p) > cond.rent * 10000) return false
    if (cond.lay.length && cond.lay.indexOf(p.lay) < 0) return false
    if (cond.walk !== null && p.walk > cond.walk) return false
    for (var i = 0; i < cond.opt.length; i++) if (!hasOpt(p, cond.opt[i])) return false
    return true
  }
  function filterProps (cond) { return PROPS.filter(function (p) { return matches(p, cond) }) }
  function sortProps (list, sort) {
    var key = sort === 'new' ? function (p) { return p.age } : sort === 'near' ? function (p) { return p.walk } : monthly
    return list.slice().sort(function (a, b) {
      return (key(a) - key(b)) || (monthly(a) - monthly(b)) || (a.no - b.no)
    })
  }
  function condLabel (key, cond) {
    if (key === 'rent') return '家賃の上限（' + fmtRentCap(cond.rent) + '）'
    if (key === 'lay') return '間取り（' + cond.lay.map(function (k) { return LAY_NAME[k] }).join('・') + '）'
    if (key === 'walk') return '駅から徒歩（' + cond.walk + '分以内）'
    return OPT_NAME[key.slice(4)]
  }
  function without (cond, key) {
    var c = { rent: cond.rent, lay: cond.lay.slice(), walk: cond.walk, opt: cond.opt.slice() }
    if (key === 'rent') c.rent = null
    else if (key === 'lay') c.lay = []
    else if (key === 'walk') c.walk = null
    else c.opt = c.opt.filter(function (k) { return 'opt:' + k !== key })
    return c
  }
  // 0件のとき：付いている条件を1つだけ外した件数。1件以上を、多い順（同じなら条件の順）に2つまで
  function relaxHints (cond) {
    var keys = []
    if (cond.rent !== null) keys.push('rent')
    if (cond.lay.length) keys.push('lay')
    if (cond.walk !== null) keys.push('walk')
    ordered(OPT_KEYS, cond.opt).forEach(function (k) { keys.push('opt:' + k) })
    var list = keys.map(function (k, i) { return { key: k, label: condLabel(k, cond), count: filterProps(without(cond, k)).length, i: i } })
      .filter(function (h) { return h.count > 0 })
    list.sort(function (a, b) { return (b.count - a.count) || (a.i - b.i) })
    return list.slice(0, 2).map(function (h) { return { key: h.key, label: h.label, count: h.count } })
  }

  // ---------- 初期費用の目安（整数だけで計算する） ----------
  function initialCost (p) {
    var deposit = p.rent * p.depositM
    var key = p.rent * p.keyM
    var agent = p.rent * 11 / 10
    var first = p.rent + p.fee
    return { deposit: deposit, key: key, agent: agent, first: first, total: deposit + key + agent + first }
  }

  // ---------- 読み上げの文 ----------
  function srText (cond, sort) {
    var n = filterProps(cond).length
    if (n) return '条件に合う物件は' + n + '件です（' + SORT_NAME[sort] + '）。'
    if (relaxHints(cond).length) return '条件に合う物件はありません。条件をゆるめる案内を出しました。'
    return '条件に合う物件はありません。条件をクリアすると全' + TOTAL + '件を表示できます。'
  }

  // ---------- ハッシュ ----------
  var PART_RE = /^(rent|lay|walk|opt|sort)=([0-9a-z]+(?:,[0-9a-z]+)*)$/
  var HASH_KEYS = ['rent', 'lay', 'walk', 'opt', 'sort']
  // そのまま比べる（デコードしない）。正しければ { cond, sort }、不正なら null
  function parseHash (hash) {
    if (typeof hash !== 'string' || hash.length > 200 || hash.charAt(0) !== '#') return null
    var parts = hash.slice(1).split('&')
    var cond = emptyCond()
    var sort = 'cheap'
    var last = -1
    for (var i = 0; i < parts.length; i++) {
      var m = PART_RE.exec(parts[i])
      if (!m) return null
      var pos = HASH_KEYS.indexOf(m[1])
      if (pos <= last) return null
      last = pos
      var v = m[2]
      var vals = v.split(',')
      if (m[1] === 'rent') {
        var r = RENT_CAPS.filter(function (c) { return String(c) === v })
        if (!r.length) return null
        cond.rent = r[0]
      } else if (m[1] === 'walk') {
        var w = WALK_CAPS.filter(function (c) { return String(c) === v })
        if (!w.length) return null
        cond.walk = w[0]
      } else if (m[1] === 'sort') {
        if (SORT_KEYS.indexOf(v) < 0) return null
        sort = v
      } else {
        var allowed = m[1] === 'lay' ? LAY_KEYS : OPT_KEYS
        for (var j = 0; j < vals.length; j++) {
          if (allowed.indexOf(vals[j]) < 0 || vals.indexOf(vals[j]) !== j) return null
        }
        cond[m[1]] = ordered(allowed, vals)
      }
    }
    return { cond: cond, sort: sort }
  }
  // buildHash(cond, sort) でも buildHash({ cond, sort }) でもよい
  function buildHash (cond, sort) {
    if (cond && cond.cond) { sort = cond.sort; cond = cond.cond }
    var parts = []
    if (cond.rent !== null) parts.push('rent=' + cond.rent)
    if (cond.lay.length) parts.push('lay=' + ordered(LAY_KEYS, cond.lay).join(','))
    if (cond.walk !== null) parts.push('walk=' + cond.walk)
    if (cond.opt.length) parts.push('opt=' + ordered(OPT_KEYS, cond.opt).join(','))
    if (sort && sort !== 'cheap') parts.push('sort=' + sort)
    return parts.length ? '#' + parts.join('&') : ''
  }

  // ---------- 「気になる」を読む（純粋な関数） ----------
  var FAV_RE = /^p(0[1-9]|1[0-8])$/
  function readFav (raw) {
    var v
    try { v = JSON.parse(raw) } catch (e) { return [] }
    if (!Array.isArray(v)) return []
    var out = []
    v.forEach(function (x) { if (typeof x === 'string' && FAV_RE.test(x) && out.indexOf(x) < 0) out.push(x) })
    return out.sort()
  }

  // 検査用に、状態を引数で受ける関数と定数だけ出す
  window.__demo26 = Object.freeze({
    PROPS: PROPS, LAY_KEYS: LAY_KEYS, OPT_KEYS: OPT_KEYS, RENT_CAPS: RENT_CAPS, WALK_CAPS: WALK_CAPS, SORT_KEYS: SORT_KEYS,
    monthly: monthly, matches: matches, filterProps: filterProps, sortProps: sortProps, relaxHints: relaxHints,
    initialCost: initialCost, parseHash: parseHash, buildHash: buildHash, fmtYen: fmtYen, srText: srText, readFav: readFav,
    fmtRentCap: fmtRentCap, fmtMonths: fmtMonths, fmtArea: fmtArea, fmtWalk: fmtWalk, fmtAge: fmtAge, fmtFloor: fmtFloor, fmtCount: fmtCount
  })

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
  function sep () { return el('span', 'sep', ' ／ ') }
  function vh (text) { return el('span', 'visually-hidden', text) }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var wideMq = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : { matches: false }
  function isWide () { return wideMq.matches }

  // ---------- 状態 ----------
  var state = { cond: emptyCond(), sort: 'cheap', fav: [], detailId: null, sheetId: null }
  var canSave = true
  var opener = null

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  var srLast = ''
  // 500ms 何も変わらなければ1回だけ。前と同じ文なら入れない（again の時は一度空にして 50ms 後に入れる）
  function say (text, again) {
    clearTimeout(srTimer)
    srTimer = setTimeout(function () {
      var sr = $('sr-status')
      if (text === srLast) {
        if (!again) return
        sr.textContent = ''
        srTimer = setTimeout(function () { sr.textContent = text }, 50)
        return
      }
      srLast = text
      sr.textContent = text
    }, 500)
  }

  // ---------- 部品：駅の行・間取り図・気になる ----------
  function stationLine (p, cls) {
    var e = el('p', cls)
    add(e, nw(LINE), ' ', nw(p.station + '駅'), ' ')
    var b = el('b', 'nw', fmtWalk(p.walk))
    e.appendChild(b)
    return e
  }
  function plan (lay, small) {
    var d = el('div', 'plan plan--' + lay + (small ? ' plan--sm' : ''))
    d.setAttribute('aria-hidden', 'true')
    var rooms = PLAN_ROOMS[lay]
    var many = rooms.filter(function (r) { return /^r\d$/.test(r) }).length > 1
    rooms.forEach(function (r) {
      var s = el('span', 'plan__room plan__room--' + r)
      var name = /^r\d$/.test(r) ? (many ? '洋室' + r.slice(1) : '洋室') : ROOM_NAME[r]
      s.appendChild(el('span', 'plan__label', name))
      d.appendChild(s)
    })
    return d
  }
  function favButton (p, cls) {
    var b = el('button', 'fav-btn' + (cls ? ' ' + cls : ''))
    b.type = 'button'
    b.setAttribute('data-id', p.id)
    b.setAttribute('data-act', 'fav')
    b.setAttribute('aria-pressed', state.fav.indexOf(p.id) >= 0 ? 'true' : 'false')
    add(b, icon('i-heart', 20), nw('気になる'), vh('：' + p.name))
    return b
  }

  // ---------- 物件のカード ----------
  function propCard (p, current) {
    var li = el('li', 'prop' + (current ? ' prop--current' : ''))
    li.id = 'prop-' + p.id
    li.setAttribute('data-id', p.id)
    var art = el('article', 'prop__in')
    art.setAttribute('aria-labelledby', 'prop-' + p.id + '-name')
    var head = el('div', 'prop__head')
    head.appendChild(el('p', 'prop__no nw', '物件番号 ' + fmtNo(p.no)))
    var badges = el('p', 'prop__badges')
    if (current) badges.appendChild(el('span', 'badge badge--current', '詳細を表示中'))
    badges.appendChild(el('span', 'badge badge--open', '募集中（架空）'))
    head.appendChild(badges)
    art.appendChild(head)

    var grid = el('div', 'prop__grid')
    grid.appendChild(plan(p.lay, true))
    var title = el('div', 'prop__title')
    var h3 = el('h3', 'prop__name', p.name)
    h3.id = 'prop-' + p.id + '-name'
    title.appendChild(h3)
    title.appendChild(stationLine(p, 'prop__station'))
    grid.appendChild(title)

    var info = el('div', 'prop__info')
    var money = el('div', 'prop__money')
    var rent = el('p', 'prop__rent')
    var rs = nw(comma(p.rent))
    rs.appendChild(el('span', 'prop__yen', '円'))
    rent.appendChild(rs)
    money.appendChild(rent)
    money.appendChild(add(el('p', 'prop__fee'), '管理費 ', nw(fmtYen(p.fee))))
    info.appendChild(money)
    info.appendChild(add(el('p', 'prop__month'), '月額 ', el('b', 'nw', fmtYen(monthly(p))), nw('（管理費込み）')))
    info.appendChild(add(el('p', 'prop__spec'), nw(LAY_NAME[p.lay]), sep(), nw(fmtArea(p.area10)), sep(), nw(fmtAge(p.age)), sep(), nw(fmtFloor(p.floor, p.floors))))
    info.appendChild(add(el('p', 'prop__spec prop__spec--sub'), nw('敷金 ' + fmtMonths(p.depositM)), sep(), nw('礼金 ' + fmtMonths(p.keyM))))
    var tags = OPT_KEYS.filter(function (k) { return hasOpt(p, k) })
    if (tags.length) {
      var ul = el('ul', 'prop__tags')
      tags.forEach(function (k) { ul.appendChild(add(el('li', 'tag'), icon(OPT_ICON[k], 16), nw(OPT_NAME[k]))) })
      info.appendChild(ul)
    }
    var act = el('div', 'prop__actions')
    var db = el('button', 'btn-sub')
    db.type = 'button'
    db.setAttribute('data-id', p.id)
    db.setAttribute('data-act', 'detail')
    if (current) db.setAttribute('aria-current', 'true')
    add(db, icon('i-doc', 20), nw('詳細と初期費用'), vh('：' + p.name))
    act.appendChild(db)
    act.appendChild(favButton(p))
    info.appendChild(act)
    grid.appendChild(info)
    art.appendChild(grid)
    li.appendChild(art)
    return li
  }

  // ---------- 一覧の描き直し ----------
  function shownIds () { return filterProps(state.cond).map(function (p) { return p.id }) }
  function renderList () {
    var ul = $('props')
    // 描き直す前のフォーカス（一覧の中のボタン）を覚えておく
    var ae = document.activeElement
    var keep = null
    if (ae && ul.contains(ae) && ae.getAttribute('data-id')) keep = { id: ae.getAttribute('data-id'), act: ae.getAttribute('data-act') }
    var emptyHad = $('empty').contains(ae)

    var list = sortProps(filterProps(state.cond), state.sort)
    var cur = isWide() ? state.detailId : null
    clear(ul)
    list.forEach(function (p) { ul.appendChild(propCard(p, p.id === cur)) })
    ul.hidden = !list.length
    var n = list.length
    $('count-n').textContent = fmtCount(n)
    $('fixbar-n').textContent = fmtCount(n)
    var sum = $('list-sum')
    clear(sum)
    if (n) add(sum, SORT_NAME[state.sort] + 'に ', nw(fmtCount(n)), 'を並べています。')
    sum.hidden = !n
    renderEmpty(n)
    updateDetailNote()

    if (keep) {
      var b = ul.querySelector('[data-id="' + keep.id + '"][data-act="' + keep.act + '"]')
      if (b) b.focus({ preventScroll: true })
      else $('h-list').focus({ preventScroll: true })
    } else if (emptyHad && !$('empty').contains(document.activeElement)) {
      $('h-list').focus({ preventScroll: true })
    }
  }
  function renderEmpty (n) {
    var box = $('empty')
    clear(box)
    box.hidden = !!n
    if (n) return
    var h = el('h3', 'empty__title', '条件に合う物件はありません（0件）')
    h.id = 'h-empty'
    box.appendChild(h)
    var hints = relaxHints(state.cond)
    if (hints.length) {
      box.appendChild(el('p', 'empty__lead', '条件を1つ外すと、次の件数になります。'))
      var ul = el('ul', 'relax')
      hints.forEach(function (hn) {
        var b = el('button', 'relax-btn')
        b.type = 'button'
        b.setAttribute('data-relax', hn.key)
        add(b, el('span', 'relax-btn__name', hn.label + 'を外す'), ' ', el('span', 'relax-btn__count nw', '― ' + fmtCount(hn.count)))
        ul.appendChild(add(el('li'), b))
      })
      box.appendChild(ul)
    } else {
      box.appendChild(el('p', 'empty__lead', '条件を1つ外しても見つかりません。「条件をクリア」で、全' + TOTAL + '件を表示できます。'))
      var c = el('button', 'btn-sub')
      c.type = 'button'
      c.setAttribute('data-clear', '1')
      add(c, icon('i-x', 20), nw('条件をクリア'))
      box.appendChild(c)
    }
  }

  // ---------- 物件の詳細（シートの中・右の欄の中で同じ） ----------
  function renderDetail (container, id) {
    var p = BY_ID[id]
    // 同じ id の見出しが2つにならないよう、ほかの入れ物の見出しから id を外す
    var old = $('d-title')
    if (old && !container.contains(old)) old.removeAttribute('id')
    clear(container)
    var box = el('div', 'detail__in')
    var head = el('div', 'detail__head')
    add(head, el('span', 'prop__no nw', '物件番号 ' + fmtNo(p.no)), el('span', 'badge badge--open', '募集中（架空）'))
    box.appendChild(head)
    var h = el('h2', 'detail__title', p.name)
    h.id = 'd-title'
    h.tabIndex = -1
    box.appendChild(h)
    var out = el('p', 'detail__note detail__out', 'この物件は、いまの条件の一覧には入っていません。')
    out.hidden = shownIds().indexOf(id) >= 0
    box.appendChild(out)
    box.appendChild(stationLine(p, 'detail__station'))
    var pl = plan(p.lay, false)
    pl.classList.add('detail__plan')
    box.appendChild(pl)
    box.appendChild(el('p', 'detail__plan-note', '間取りの図は、部屋の並びの目安です（架空）。'))
    var dl = el('dl', 'detail__dl')
    function row (k, v) { dl.appendChild(el('dt', '', k)); var dd = el('dd'); if (typeof v === 'string') dd.textContent = v; else dd.appendChild(v); dl.appendChild(dd) }
    row('家賃', nw(fmtYen(p.rent)))
    row('管理費', nw(fmtYen(p.fee)))
    row('月額', add(el('span'), nw(fmtYen(monthly(p))), nw('（管理費込み）')))
    row('間取り', nw(LAY_NAME[p.lay]))
    row('面積', nw(fmtArea(p.area10)))
    row('築年数', add(el('span'), nw(fmtAge(p.age)), '（', nw('2026年11月'), '時点・', nw('架空'), '）'))
    row('階', nw(fmtFloor(p.floor, p.floors)))
    row('敷金', nw(fmtMonths(p.depositM)))
    row('礼金', nw(fmtMonths(p.keyM)))
    row('ペット', p.pet ? '可' : '不可')
    row('駐車場', p.park ? 'あり' : 'なし')
    row('バス・トイレ', p.bath ? '別' : '同じ（ユニットバス）')
    box.appendChild(dl)
    box.appendChild(el('h3', 'detail__cost-title', '初期費用の目安'))
    var c = initialCost(p)
    var t = el('table', 'cost')
    t.appendChild(el('caption', 'visually-hidden', '初期費用の目安の内訳'))
    var tb = el('tbody')
    function line (label, sub, yen, cls) {
      var tr = el('tr', cls)
      var th = el('th')
      th.scope = 'row'
      th.appendChild(label)
      if (sub) th.appendChild(add(el('span', 'cost__sub'), sub))
      tr.appendChild(th)
      tr.appendChild(add(el('td'), nw(fmtYen(yen))))
      tb.appendChild(tr)
    }
    line(add(el('span'), '敷金', nw('（' + fmtMonths(p.depositM) + '）')), '', c.deposit)
    line(add(el('span'), '礼金', nw('（' + fmtMonths(p.keyM) + '）')), '', c.key)
    line(add(el('span'), '仲介手数料'), add(el('span'), '上限で計算（家賃', nw('1か月分'), '＋', nw('消費税10%）')), c.agent)
    line(add(el('span'), '前家賃・管理費', nw('（1か月）')), '', c.first)
    line(add(el('span'), '合計の目安'), '', c.total, 'cost__total')
    t.appendChild(tb)
    box.appendChild(t)
    box.appendChild(el('p', 'detail__strong', '目安です。実際の金額はお問い合わせください。'))
    box.appendChild(add(el('p', 'detail__extra'), '仲介手数料は上限の額で計算しています。借りる方の負担は、原則は家賃', nw('0.5か月分'), '＋消費税で、事前に承諾した場合に', nw('1か月分'), '＋消費税までです。日割りの家賃・火災保険・保証会社・鍵の交換などは別途です。実際のページでは、ここから問い合わせフォーム・電話・LINE につなぎます（このデモにはありません）。'))
    box.appendChild(favButton(p, 'detail__fav'))
    container.appendChild(box)
    return h
  }
  function renderAsideEmpty () {
    var c = $('detail')
    var old = $('d-title')
    if (old && !c.contains(old)) old.removeAttribute('id')
    clear(c)
    var box = el('div', 'detail__in')
    var h = el('h2', 'detail__title', '物件の詳細')
    h.id = 'd-title'
    h.tabIndex = -1
    box.appendChild(h)
    box.appendChild(el('p', 'detail__note', '物件の「詳細と初期費用」を押すと、ここに出ます。'))
    c.appendChild(box)
  }
  function updateDetailNote () {
    var ids = shownIds()
    var boxes = [$('detail'), $('sheet-body')]
    boxes.forEach(function (b) {
      var n = b.querySelector('.detail__out')
      var fav = b.querySelector('.detail__fav')
      if (n && fav) n.hidden = ids.indexOf(fav.getAttribute('data-id')) >= 0
    })
  }
  function setAsideVisible () { $('detail').hidden = !isWide() }

  // 1024px〜 の詳細の欄：画面の高さ − 48px を超える時は貼り付けない
  function fitSticky () {
    var d = $('detail')
    if (!d || d.hidden) return
    d.classList.remove('is-static')
    if (d.offsetHeight > window.innerHeight - 48) d.classList.add('is-static')
  }

  function showInAside (id, focus) {
    state.detailId = id
    var h = renderDetail($('detail'), id)
    renderList()
    fitSticky()
    if (focus) {
      $('detail').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
      h.focus({ preventScroll: true })
    }
  }

  // ---------- シート（〜1023px） ----------
  var sheet = null
  function sheetOpen () { return sheet && (sheet.open || sheet.hasAttribute('open')) }
  function openSheet (id, from) {
    opener = from || null
    state.sheetId = id
    state.detailId = id
    var h = renderDetail($('sheet-body'), id)
    sheet.setAttribute('aria-labelledby', 'd-title')
    document.body.classList.add('is-sheet')
    if (typeof sheet.showModal === 'function') {
      if (!sheet.open) sheet.showModal()
    } else {
      sheet.setAttribute('open', '')
      sheet.classList.add('is-fallback')
    }
    sheet.scrollTop = 0
    h.focus({ preventScroll: true })
  }
  function closeSheet (restore) {
    if (!sheetOpen()) return
    if (typeof sheet.close === 'function' && sheet.open) sheet.close()
    else { sheet.removeAttribute('open'); afterClose() }
    if (restore === false) opener = null
  }
  function afterClose () {
    sheet.classList.remove('is-fallback')
    document.body.classList.remove('is-sheet')
    state.sheetId = null
    var o = opener
    opener = null
    if (!o) return
    var target = document.body.contains(o) ? o : null
    if (!target && o.getAttribute) target = document.querySelector('[data-act="' + o.getAttribute('data-act') + '"][data-id="' + o.getAttribute('data-id') + '"]')
    if (target) target.focus({ preventScroll: true })
    else $('h-list').focus({ preventScroll: true })
  }

  function openDetail (id, from) {
    if (isWide()) showInAside(id, true)
    else openSheet(id, from)
  }

  // ---------- 気になるリスト ----------
  function saveFav () {
    try { window.localStorage.setItem(FAV_KEY, JSON.stringify(state.fav)) } catch (e) { noSave() }
  }
  function noSave () { canSave = false; $('fav-nosave').hidden = false }
  function renderFav (focusAfter) {
    var ul = $('fav-list')
    clear(ul)
    var ids = state.fav
    $('fav-n').textContent = '（' + fmtCount(ids.length) + '）'
    $('fav-empty').hidden = !!ids.length
    ul.hidden = !ids.length
    ids.forEach(function (id) {
      var p = BY_ID[id]
      var li = el('li', 'fav__item')
      li.setAttribute('data-id', id)
      li.appendChild(el('p', 'fav__name', p.name))
      li.appendChild(add(el('p', 'fav__sub'), nw(LAY_NAME[p.lay]), sep(), '月額 ', nw(fmtYen(monthly(p)))))
      var btns = el('div', 'fav__btns')
      var d = el('button', 'btn-sub')
      d.type = 'button'
      d.setAttribute('data-id', id); d.setAttribute('data-act', 'fav-detail')
      add(d, nw('詳細'), vh('：' + p.name))
      var r = el('button', 'btn-sub')
      r.type = 'button'
      r.setAttribute('data-id', id); r.setAttribute('data-act', 'fav-remove')
      add(r, nw('外す'), vh('：' + p.name))
      btns.appendChild(d); btns.appendChild(r)
      li.appendChild(btns)
      ul.appendChild(li)
    })
    if (focusAfter) focusAfter()
  }
  function syncFavButtons () {
    var list = document.querySelectorAll('.fav-btn')
    for (var i = 0; i < list.length; i++) list[i].setAttribute('aria-pressed', state.fav.indexOf(list[i].getAttribute('data-id')) >= 0 ? 'true' : 'false')
  }
  function setFav (id, on, focusAfter) {
    var has = state.fav.indexOf(id) >= 0
    if (on === has) return
    state.fav = on ? readFav(JSON.stringify(state.fav.concat([id]))) : state.fav.filter(function (x) { return x !== id })
    syncFavButtons()
    renderFav(focusAfter)
    saveFav()
    say(on ? '気になるリストに入れました（' + fmtCount(state.fav.length) + '）。' : '気になるリストから外しました（' + fmtCount(state.fav.length) + '）。')
  }

  // ---------- 条件の入力 ----------
  function readControls () {
    var c = emptyCond()
    var r = $('f-rent').value
    c.rent = r === '' ? null : Number(r)
    var lay = []; var opt = []
    var boxes = document.querySelectorAll('.chip__input')
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) (boxes[i].name === 'lay' ? lay : opt).push(boxes[i].value)
    c.lay = ordered(LAY_KEYS, lay)
    c.opt = ordered(OPT_KEYS, opt)
    var w = document.querySelector('.walk-opt__input:checked')
    c.walk = w && w.value !== '' ? Number(w.value) : null
    return c
  }
  function syncControls () {
    var c = state.cond
    $('f-rent').value = c.rent === null ? '' : String(c.rent)
    var boxes = document.querySelectorAll('.chip__input')
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = (boxes[i].name === 'lay' ? c.lay : c.opt).indexOf(boxes[i].value) >= 0
    var radios = document.querySelectorAll('.walk-opt__input')
    for (var k = 0; k < radios.length; k++) radios[k].checked = radios[k].value === (c.walk === null ? '' : String(c.walk))
    $('f-sort').value = state.sort
  }
  function writeHash () {
    if (!history.replaceState) return
    var h = buildHash(state.cond, state.sort)
    if (h === location.hash) return
    history.replaceState(null, '', h || location.pathname + location.search)
  }
  function changed (again) {
    renderList()
    writeHash()
    say(srText(state.cond, state.sort), again)
  }
  function clearCond () {
    state.cond = emptyCond()
    syncControls()
    changed(true)
  }

  // ---------- ハッシュ（開いた時・hashchange） ----------
  var HASH_HEAD = /^#(rent|lay|walk|opt|sort)(?=$|[=&])/
  function applyHash (fromEvent) {
    var h = location.hash
    if (!HASH_HEAD.test(h)) return
    var p = parseHash(h)
    if (!p) {
      // 不正：エラーを出さずに最初の状態に戻し、ハッシュを消す。フォーカス・スクロール・読み上げは動かさない
      state.cond = emptyCond()
      state.sort = 'cheap'
      syncControls()
      renderList()
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search)
      return
    }
    state.cond = p.cond
    state.sort = p.sort
    syncControls()
    renderList()
    var canon = buildHash(p.cond, p.sort)
    if (canon !== h && history.replaceState) history.replaceState(null, '', canon || location.pathname + location.search)
    if (fromEvent) say(srText(state.cond, state.sort))
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

  function init () {
    sheet = $('sheet')

    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : null
      if (!t) return
      var a = t.closest('a[href^="#"]')
      if (a) {
        var hash = a.getAttribute('href')
        if (hash.length > 1 && goTo(hash.slice(1))) e.preventDefault()
        return
      }
      var b = t.closest('button')
      if (!b) return
      var act = b.getAttribute('data-act')
      var id = b.getAttribute('data-id')
      if (act === 'detail') openDetail(id, b)
      else if (act === 'fav') setFav(id, b.getAttribute('aria-pressed') !== 'true')
      else if (act === 'fav-detail') {
        if (isWide()) showInAside(id, true)
        else openSheet(id, b)
      } else if (act === 'fav-remove') {
        var idx = state.fav.indexOf(id)
        setFav(id, false, function () {
          var rest = document.querySelectorAll('#fav-list [data-act="fav-remove"]')
          if (!rest.length) $('h-fav').focus({ preventScroll: true })
          else rest[Math.min(idx, rest.length - 1)].focus({ preventScroll: true })
        })
      } else if (b.hasAttribute('data-relax')) {
        state.cond = without(state.cond, b.getAttribute('data-relax'))
        syncControls()
        renderList()
        writeHash()
        $('h-list').focus({ preventScroll: true })
        say(srText(state.cond, state.sort))
      } else if (b.hasAttribute('data-clear')) {
        clearCond()
      }
    })

    // 条件の入力（「検索する」ボタンは置かない。変わるたびに描き直す）
    var inputs = document.querySelectorAll('#f-rent, .chip__input, .walk-opt__input')
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('change', function () {
        state.cond = readControls()
        changed()
      })
    }
    $('f-sort').addEventListener('change', function () {
      var v = this.value
      state.sort = SORT_KEYS.indexOf(v) >= 0 ? v : 'cheap'
      changed()
    })
    $('f-clear').addEventListener('click', clearCond)

    // シート
    $('sheet-close').addEventListener('click', function () { closeSheet() })
    sheet.addEventListener('close', afterClose)
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet() })
    sheet.addEventListener('cancel', function () { /* Esc は dialog がそのまま閉じる */ })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('is-fallback') && sheet.hasAttribute('open')) closeSheet()
    })

    // 1024px をまたいだ時
    var onWide = function () {
      setAsideVisible()
      if (isWide()) {
        if (sheetOpen()) {
          var id = state.sheetId
          opener = null
          closeSheet(false)
          showInAside(id, true)
          return
        }
        if (state.detailId) renderDetail($('detail'), state.detailId)
        else renderAsideEmpty()
        fitSticky()
      }
      renderList()
    }
    if (wideMq.addEventListener) wideMq.addEventListener('change', onWide)
    else if (wideMq.addListener) wideMq.addListener(onWide)

    window.addEventListener('hashchange', function () { applyHash(true) })
    window.addEventListener('resize', fitSticky)

    // スマホの固定バー：絞り込みとファーストビューの主ボタンが、どちらも見えていない時だけ出す
    var bar = $('fixbar')
    if ('IntersectionObserver' in window) {
      var seen = { filter: true, cta: true }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { seen[en.target.id === 'filter' ? 'filter' : 'cta'] = en.isIntersecting })
        bar.classList.toggle('is-hide', seen.filter || seen.cta)
      })
      io.observe($('filter'))
      io.observe($('hero-cta'))
    }

    // 「気になる」を読む（開いた時には書き直さない）
    var raw = null
    try { raw = window.localStorage.getItem(FAV_KEY) } catch (e) { canSave = false }
    state.fav = readFav(raw)
    if (!canSave) noSave()

    setAsideVisible()
    renderAsideEmpty()
    // 読み込み直しでブラウザが入力欄の状態を戻しても、開いた時は条件なし・家賃の安い順から始める
    state.cond = emptyCond()
    state.sort = 'cheap'
    syncControls()
    renderList()
    renderFav()
    applyHash(false)
    fitSticky()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
