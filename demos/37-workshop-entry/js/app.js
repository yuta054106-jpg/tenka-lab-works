// 陶房ツチアカリ（デモ・架空のお店）体験会の申込（定員・キャンセル待ち）と当日の受付
// 外部通信なし・保存なし。操作はボタンと選択だけ。文字を入れる欄なし
// 表示はすべて createElement・textContent・replaceChildren。時計は止めている（デモの今は定数 NOW）
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}
  function fz (o) { return Object.freeze(o) }

  // ---------- 固定データ（すべて架空） ----------
  // デモの今：2026-12-06（日）9:50。12/6 0:00 からの分で表す
  var NOW = 590
  var DAY = 1440
  var CLOCK_MAX = 1438
  var FIRST_NO = 1223
  var OPEN_FIRST = 'S1'

  var KINDS = fz({
    tebineri: fz({ name: 'はじめての手びねり（湯のみ）', time: '2時間', price: 3500, priceNote: '', bring: 'エプロン・手をふくタオル（爪は短めに）', extra: '' }),
    rokuro: fz({ name: 'ろくろ体験（小鉢）', time: '2時間', price: 4800, priceNote: '', bring: 'エプロン・手をふくタオル・汚れてもよい服', extra: '' }),
    oyako: fz({ name: '親子の粘土あそび', time: '1時間30分', price: 2500, priceNote: '大人もお子さまも', bring: 'エプロン（お子さまの分も）・手をふくタオル', extra: '4歳から小学生のお子さまと保護者の方向けです。', min: 2, minNote: '2人から（保護者1人＋お子さま1人以上）申し込めます。', cond: '4歳から小学生のお子さまと保護者1人でご参加ください（架空の設定）。2人から（保護者1人＋お子さま1人以上）申し込めます。人数は保護者の方も含めて選びます。' })
  })
  var COMMON_NOTE = '焼き上がりは約1か月後です。お渡しの方法は当日ご案内します。'

  // start＝12/6 0:00 からの分。日付の文字は固定の文字列で持つ
  var SLOTS = fz([
    fz({ id: 'S1', day: '12月6日（日）', dayShort: '12月6日', start: 600, end: '12:00', kind: 'tebineri', cap: 8 }),
    fz({ id: 'S2', day: '12月6日（日）', dayShort: '12月6日', start: 840, end: '16:00', kind: 'rokuro', cap: 6 }),
    fz({ id: 'S3', day: '12月12日（土）', dayShort: '12月12日', start: 9240, end: '11:30', kind: 'oyako', cap: 8 }),
    fz({ id: 'S4', day: '12月13日（日）', dayShort: '12月13日', start: 10680, end: '12:00', kind: 'tebineri', cap: 8 }),
    fz({ id: 'S5', day: '12月19日（土）', dayShort: '12月19日', start: 19560, end: '16:00', kind: 'rokuro', cap: 6 }),
    fz({ id: 'S6', day: '12月20日（日）', dayShort: '12月20日', start: 20760, end: '11:30', kind: 'oyako', cap: 8 })
  ])
  // 申込とキャンセル待ちの初期。[番号, 人数, 状態]。並びは配列の順＝待ちの順番
  var INIT = fz({
    S1: [['T-1201', 2, 'booked'], ['T-1202', 1, 'booked'], ['T-1203', 2, 'booked'], ['T-1204', 1, 'booked'], ['T-1205', 2, 'booked']],
    S2: [['T-1206', 2, 'booked'], ['T-1207', 2, 'booked']],
    S3: [['T-1208', 2, 'booked'], ['T-1209', 3, 'booked']],
    S4: [['T-1210', 2, 'booked'], ['T-1211', 3, 'booked'], ['T-1212', 1, 'booked'], ['T-1213', 2, 'booked'], ['T-1214', 3, 'wait'], ['T-1215', 1, 'wait'], ['T-1216', 2, 'wait']],
    S5: [['T-1217', 2, 'booked'], ['T-1218', 2, 'booked'], ['T-1219', 2, 'booked']],
    S6: [['T-1220', 3, 'booked'], ['T-1221', 2, 'booked'], ['T-1222', 2, 'booked']]
  })

  // ---------- 決まり（純粋な関数。状態から毎回計算する） ----------
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  // 592 →「9:52」、600 →「10:00」（H は0を付けない・MM は2桁）
  function fmtTime (m) {
    var t = m % DAY
    var mm = t % 60
    return ((t - mm) / 60) + ':' + pad2(mm)
  }
  function fmtYen (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '円' }
  function sumSize (a) { var n = 0; a.forEach(function (e) { n += e.size }); return n }
  function ofStatus (list, st) { return list.filter(function (e) { return e.status === st }) }
  function byNo (a, b) { return a.no < b.no ? -1 : a.no > b.no ? 1 : 0 }
  // 1回分の数。残り＝定員−申込−繰り上げ候補（申込＋候補＋残り＝定員）
  function calc (slot, list) {
    var bk = ofStatus(list, 'booked')
    var wt = ofStatus(list, 'wait')
    var booked = sumSize(bk)
    var free = slot.cap - booked
    // 繰り上げ候補：待ちの先頭から順に、入る所まで。入らない組が出たらそこで止める（順番を守る）
    var left = free
    var cand = []
    for (var i = 0; i < wt.length; i++) {
      if (wt[i].size > left) break
      cand.push(wt[i])
      left -= wt[i].size
    }
    var held = sumSize(cand)
    var came = sumSize(bk.filter(function (e) { return e.at !== null }))
    return {
      booked: booked,
      bookedList: bk.slice().sort(byNo),
      bookedGroups: bk.length,
      free: free,
      waits: wt,
      waitPeople: sumSize(wt),
      cand: cand,
      held: held,
      rest: slot.cap - booked - held,
      cancels: ofStatus(list, 'cancel').sort(byNo),
      came: came,
      // 1組の最少人数（親子体験は保護者1人＋お子さま1人以上で2人から）
      min: KINDS[slot.kind].min || 1,
      closed: slot.start - 30 <= NOW,
      today: slot.start < DAY
    }
  }
  // お客様の画面の札：締切 → 順番待ち受付中（待ちが1組以上で、まだ申込で埋まっていない席がある）
  // → 満席・待ち（待ちが1組以上 または 残り0）→ 残りわずか（1〜2）→ 残り◯席
  // 順番待ち受付中も満席と同じく、新しい申込は待ちの最後に入る（待っている方より先に席を取らない）
  function custState (c) {
    if (c.closed) return 'closed'
    if (c.waits.length > 0 && c.free > 0) return 'queue'
    if (c.waits.length > 0 || c.rest === 0) return 'wait'
    // 待ちはいないが、残り席が最少人数に足りない回も順番待ち（新しい申込は待ちへ）
    if (c.rest < c.min) return 'queue'
    if (c.rest <= 2) return 'few'
    return 'free'
  }
  // お客様が選べる人数の上限
  function maxNinzu (c) {
    var s = custState(c)
    if (s === 'closed') return 0
    if (s === 'wait' || s === 'queue') return 4
    return Math.min(4, c.rest)
  }
  // 管理画面の札
  function adminState (c) {
    if (c.rest === 0) return 'full'
    if (c.rest <= 2) return 'few'
    return 'free'
  }
  function initEntries () {
    var o = {}
    SLOTS.forEach(function (s) {
      o[s.id] = INIT[s.id].map(function (r) { return { no: r[0], size: r[1], status: r[2], at: null } })
    })
    return o
  }

  // 検査用の出口（凍結した定数と純粋な関数だけ）
  root.__demo37 = fz({ NOW: NOW, SLOTS: SLOTS, KINDS: KINDS, calc: calc, custState: custState, maxNinzu: maxNinzu, adminState: adminState, fmtTime: fmtTime, fmtYen: fmtYen, initEntries: initEntries })
  if (typeof document === 'undefined') return

  // ---------- 画面 ----------
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  var SVG = 'http://www.w3.org/2000/svg'
  function icon (id, size, cls) {
    var s = document.createElementNS(SVG, 'svg')
    s.setAttribute('width', String(size))
    s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true')
    s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(SVG, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  // 札。字と数の間には空白の文字を入れる
  function chip (mod, iconId, text) {
    var c = el('span', 'chip chip--' + mod)
    if (iconId) c.appendChild(icon(iconId, 16))
    c.appendChild(el('span', null, text))
    return c
  }
  function btn (cls, text, act, data) {
    var b = el('button', cls, text)
    b.type = 'button'
    b.dataset.act = act
    Object.keys(data || {}).forEach(function (k) { b.dataset[k] = data[k] })
    return b
  }
  function slotOf (id) {
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].id === id) return SLOTS[i]
    return null
  }
  function kindOf (slot) { return KINDS[slot.kind] }
  function startText (slot) { return slot.day + fmtTime(slot.start) }
  function rangeText (slot) { return slot.day + fmtTime(slot.start) + '〜' + slot.end }
  function shortText (slot) { return slot.dayShort + ' ' + fmtTime(slot.start) }

  // ---------- 状態（画面の中だけ。保存しない） ----------
  var state = {}
  function resetState () {
    state.entries = initEntries()
    state.clock = NOW
    state.nextNo = FIRST_NO
    state.open = OPEN_FIRST
    state.pick = ''
    state.ninzu = 1
    state.done = null
  }
  function calcOf (slot) { return calc(slot, state.entries[slot.id]) }
  function findEntry (no) {
    for (var i = 0; i < SLOTS.length; i++) {
      var list = state.entries[SLOTS[i].id]
      for (var j = 0; j < list.length; j++) if (list[j].no === no) return { slot: SLOTS[i], entry: list[j] }
    }
    return null
  }

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

  // ---------- 数の帯（dl） ----------
  function numItem (dl, label, value, cls) {
    var d = el('div', 'nums__item' + (cls ? ' ' + cls : ''))
    d.append(el('dt', null, label), ' ', el('dd', null, value))
    dl.appendChild(d)
  }
  function waitText (c) { return c.waits.length + '組 ' + c.waitPeople + '人' }

  function renderAllNums () {
    var dl = $('all-nums')
    dl.replaceChildren()
    var booked = 0; var cap = 0; var wg = 0; var wp = 0
    SLOTS.forEach(function (s) {
      var c = calcOf(s)
      booked += c.booked; cap += s.cap; wg += c.waits.length; wp += c.waitPeople
    })
    numItem(dl, '12月の体験会', SLOTS.length + '回', 'nums__item--wide')
    numItem(dl, '申込', booked + '人')
    numItem(dl, '定員', cap + '人')
    numItem(dl, 'キャンセル待ち', wg + '組 ' + wp + '人', 'nums__item--wide')
  }

  // 管理画面の札（今日・状態・繰り上げ候補）
  function adminChips (c, withToday) {
    var box = el('span', 'chips')
    if (withToday && c.today) box.appendChild(chip('today', null, '今日'))
    var a = adminState(c)
    if (a === 'full') box.appendChild(chip('full', 'i-full', '満席'))
    else if (a === 'few') box.appendChild(chip('few', 'i-few', '残りわずか'))
    else box.appendChild(chip('free', 'i-free', '空きあり'))
    // 残りが1組の最少人数に足りない回（親子体験の残り1席など）は、お客様の画面では順番待ち受付中になるため添える
    if (c.rest > 0 && c.rest < c.min) box.appendChild(el('span', 'chips__min', c.min + '人から'))
    if (c.cand.length) box.appendChild(chip('cand', 'i-up', '繰り上げ候補 ' + c.cand.length + '組'))
    return box
  }
  function openBtn (slot) {
    var on = state.open === slot.id
    var b = btn('btn-sub btn-open' + (on ? ' is-on' : ''), on ? '表示中' : '名簿を見る', 'open', { slot: slot.id })
    b.setAttribute('aria-pressed', on ? 'true' : 'false')
    // 見える字「表示中」も名前に含める（音声入力で届くように）
    b.setAttribute('aria-label', shortText(slot) + ' ' + kindOf(slot).name + 'の名簿を見る' + (on ? '（表示中）' : ''))
    return b
  }

  // 1025px 以上で見せる表
  function renderTable () {
    var t = el('table', 'slots-table')
    var cap = el('caption', 'visually-hidden', '12月の体験会の回ごとの席')
    var thead = el('thead')
    var hr = el('tr')
    ;['日時', '体験会', '定員', '申込', '候補', '残り', '待ち', '状態', '名簿'].forEach(function (h, i) {
      var th = el('th', 'col-' + i, h)
      th.scope = 'col'
      hr.appendChild(th)
    })
    thead.appendChild(hr)
    var tb = el('tbody')
    SLOTS.forEach(function (s) {
      var c = calcOf(s)
      var tr = el('tr', state.open === s.id ? 'is-open' : '')
      tr.dataset.slot = s.id
      var th = el('th', 'cell-date', startText(s))
      th.scope = 'row'
      var stCell = el('td', 'cell-state')
      stCell.appendChild(adminChips(c, true))
      var opCell = el('td', 'cell-op')
      opCell.appendChild(openBtn(s))
      tr.append(th, el('td', 'cell-kind', kindOf(s).name), el('td', 'cell-n', String(s.cap)), el('td', 'cell-n', String(c.booked)),
        el('td', 'cell-n', String(c.held)), el('td', 'cell-n', String(c.rest)), el('td', 'cell-wait', waitText(c)), stCell, opCell)
      tb.appendChild(tr)
    })
    t.append(cap, thead, tb)
    $('slots-table').replaceChildren(t)
  }

  // 1024px 以下で見せるカード
  function renderAdminCards () {
    var ul = $('slots-admin')
    ul.replaceChildren()
    SLOTS.forEach(function (s) {
      var c = calcOf(s)
      var li = el('li', 'slot' + (state.open === s.id ? ' is-on' : ''))
      li.dataset.slot = s.id
      var head = el('div', 'slot__head')
      head.appendChild(el('p', 'slot__date', rangeText(s)))
      if (c.today) head.appendChild(chip('today', null, '今日'))
      var dl = el('dl', 'slot__nums')
      numItem(dl, '定員', String(s.cap))
      numItem(dl, '申込', String(c.booked))
      numItem(dl, '候補', String(c.held))
      numItem(dl, '残り', String(c.rest))
      numItem(dl, '待ち', waitText(c))
      var chips = el('div', 'slot__chips')
      chips.appendChild(adminChips(c, false))
      var op = el('div', 'slot__op')
      op.appendChild(openBtn(s))
      li.append(head, el('p', 'slot__name', kindOf(s).name), dl, chips, op)
      ul.appendChild(li)
    })
  }

  // ---------- 名簿 ----------
  function rowInfo (e, pre) {
    var info = el('div', 'row__info')
    if (pre) info.appendChild(el('span', 'row__pos', pre))
    info.append(el('span', 'row__no', e.no), ' ', el('span', 'row__size', e.size + '人'))
    return info
  }
  function bookedRow (slot, c, e) {
    var li = el('li', 'row' + (e.at !== null ? ' row--done' : ''))
    li.dataset.no = e.no
    var info = rowInfo(e)
    info.append(' ', e.at !== null ? chip('done', 'i-tick', '受付済み ' + fmtTime(e.at)) : chip('booked', null, '申込'))
    var bs = el('div', 'row__btns')
    var b1
    if (!c.today) {
      b1 = btn('btn-sub', '当日に押せます', 'come', { no: e.no })
      b1.disabled = true
      // 見える字「当日に押せます」をそのまま名前に含める
      b1.setAttribute('aria-label', e.no + ' は当日に押せます（' + slot.dayShort + '）')
    } else if (e.at === null) {
      b1 = btn('btn-main', '来ました', 'come', { no: e.no })
      b1.setAttribute('aria-label', e.no + '（' + e.size + '人）が来ました')
    } else {
      b1 = btn('btn-sub', '受付を取り消す', 'undo', { no: e.no })
      b1.setAttribute('aria-label', e.no + ' の受付を取り消す')
    }
    var b2 = btn('btn-sub', 'キャンセルにする', 'cancel', { no: e.no })
    if (e.at !== null) {
      b2.disabled = true
      b2.setAttribute('aria-label', e.no + ' は受付済みのためキャンセルできません')
    } else {
      b2.setAttribute('aria-label', e.no + '（' + e.size + '人）をキャンセルにする')
    }
    bs.append(b1, b2)
    li.append(info, bs)
    return li
  }
  function waitRow (c, e, i) {
    var isCand = c.cand.indexOf(e) >= 0
    // ［繰り上げる］は先頭の候補だけ（確定も待ちの順に行う）
    var isHead = c.cand.length > 0 && c.cand[0] === e
    var li = el('li', 'row row--wait' + (isCand ? ' row--cand' : ''))
    li.dataset.no = e.no
    var info = rowInfo(e, '待ち' + (i + 1) + '番')
    info.append(' ', isCand ? chip('cand', 'i-up', '繰り上げ候補') : chip('wait', null, '待ち'))
    var bs = el('div', 'row__btns')
    if (isHead) {
      var bp = btn('btn-main', '繰り上げる', 'promote', { no: e.no })
      bp.setAttribute('aria-label', e.no + '（' + e.size + '人）を申込に繰り上げる')
      bs.appendChild(bp)
    }
    var bc = btn('btn-sub', 'キャンセルにする', 'cancel', { no: e.no })
    bc.setAttribute('aria-label', e.no + '（' + e.size + '人）をキャンセルにする')
    bs.appendChild(bc)
    li.append(info, bs)
    return li
  }
  function cancelRow (e) {
    var li = el('li', 'row row--cancel')
    li.dataset.no = e.no
    var info = rowInfo(e)
    info.append(' ', chip('cancel', null, 'キャンセル'))
    li.appendChild(info)
    return li
  }
  function h4 (id, text) {
    var h = el('h4', 'roster__h4', text)
    h.id = id
    h.tabIndex = -1
    return h
  }

  function renderRoster () {
    var slot = slotOf(state.open)
    var c = calcOf(slot)
    var box = $('roster')
    box.replaceChildren()
    var h3 = el('h3', 'roster__title')
    h3.id = 'roster-h'
    h3.tabIndex = -1
    h3.append(el('span', 'nw', rangeText(slot)), ' ', el('span', 'ib', kindOf(slot).name))
    var dl = el('dl', 'nums nums--slot')
    numItem(dl, '定員', String(slot.cap))
    numItem(dl, '申込', String(c.booked))
    numItem(dl, '繰り上げ候補', String(c.held))
    numItem(dl, '残り', String(c.rest))
    numItem(dl, 'キャンセル待ち', waitText(c), 'nums__item--wide')
    box.append(h3, dl)

    // 繰り上げの説明（候補がいる時／空きと待ちがあって候補がいない時）
    if (c.cand.length) {
      box.appendChild(el('p', 'promo promo--go', '空いた ' + c.free + '席に、待ちの先頭から ' + c.cand.length + '組（' + c.held + '人）が入れます。［繰り上げる］で先頭の方から順に申込に移ります（実際のお仕事では、ここでお客様にご連絡します）。'))
    } else if (c.free > 0 && c.waits.length) {
      box.appendChild(el('p', 'promo', '空き ' + c.free + '席。待ちの先頭 ' + c.waits[0].no + ' は ' + c.waits[0].size + '人のため、まだ入れません。順番を守るため、後ろの方を先に繰り上げません。'))
    }

    var cols = el('div', 'roster__cols')
    var main = el('div', 'roster__main')
    var side = el('div', 'roster__side')

    // 当日の受付
    var recv = el('div', 'recv')
    recv.id = 'recv'
    if (c.today) {
      var num = el('p', 'recv__num')
      num.append('来た ', el('strong', null, c.came + '人'), '／申込 ', el('strong', null, c.booked + '人'))
      recv.append(num, el('p', 'recv__hint', '組の全員がそろったら［来ました］を押してください。'))
      var notYet = c.bookedList.filter(function (e) { return e.at === null })
      if (!c.bookedList.length) {
        recv.appendChild(el('p', 'recv__all', '申込はありません。'))
      } else if (!notYet.length) {
        recv.appendChild(el('p', 'recv__all', '全員そろいました'))
      } else {
        var p = el('p', 'recv__lab', 'まだ来ていない番号：')
        var ul = el('ul', 'recv__list')
        ul.id = 'not-yet'
        notYet.forEach(function (e) { ul.appendChild(el('li', null, e.no)) })
        recv.append(p, ul)
      }
    } else {
      recv.appendChild(el('p', 'recv__off', '当日の受付は ' + slot.day + 'に使えます。'))
    }
    main.append(h4('recv-h', '当日の受付'), recv)

    // 申込の名簿
    main.appendChild(h4('booked-h', '申込の名簿（' + c.bookedGroups + '組 ' + c.booked + '人）'))
    if (c.bookedList.length) {
      var ub = el('ul', 'rows')
      ub.id = 'rows-booked'
      c.bookedList.forEach(function (e) { ub.appendChild(bookedRow(slot, c, e)) })
      main.appendChild(ub)
    } else {
      main.appendChild(el('p', 'empty', '申込はありません。'))
    }

    // キャンセル待ち
    side.appendChild(h4('wait-h', c.waits.length ? 'キャンセル待ち（' + waitText(c) + '）' : 'キャンセル待ち（0組）'))
    if (c.waits.length) {
      var uw = el('ul', 'rows')
      uw.id = 'rows-wait'
      c.waits.forEach(function (e, i) { uw.appendChild(waitRow(c, e, i)) })
      side.appendChild(uw)
    } else {
      side.appendChild(el('p', 'empty', 'キャンセル待ちの方はいません。'))
    }
    // キャンセルした組（0組の時は見出しごと出さない）
    if (c.cancels.length) {
      side.appendChild(h4('cancel-h', 'キャンセルした組（' + c.cancels.length + '組）'))
      var uc = el('ul', 'rows')
      uc.id = 'rows-cancel'
      c.cancels.forEach(function (e) { uc.appendChild(cancelRow(e)) })
      side.appendChild(uc)
    }
    cols.append(main, side)
    box.appendChild(cols)
  }

  // ---------- お客様の画面 ----------
  function priceLine (slot) {
    var k = kindOf(slot)
    return k.time + '・1人 ' + fmtYen(k.price) + '（税込' + (k.priceNote ? '・' + k.priceNote : '') + '）・定員 ' + slot.cap + '人'
  }
  function custChip (c) {
    var s = custState(c)
    if (s === 'closed') return chip('closed', 'i-lock', '申込は締め切りました')
    if (s === 'queue') return chip('queue', 'i-few', '順番待ち受付中')
    if (s === 'wait') return chip('full', 'i-full', '満席・キャンセル待ちできます')
    if (s === 'few') return chip('few', 'i-few', '残りわずか 残り' + c.rest + '席')
    return chip('free', 'i-free', '残り' + c.rest + '席')
  }
  // 順番待ち受付中の添え（待ちがいる時／最少人数に席が足りない時）
  function queueText (c) {
    if (c.waits.length) return '空いた席は待ちの順にご案内します。いま ' + c.waits.length + '組がお待ちです'
    return c.min + '人から申し込めます。いまは残り' + c.rest + '席のため順番待ちでの受付です'
  }
  function renderCustCards () {
    var ul = $('slots-cust')
    ul.replaceChildren()
    SLOTS.forEach(function (s) {
      var c = calcOf(s)
      var st = custState(c)
      var on = state.pick === s.id
      var li = el('li', 'slot slot--cust' + (on ? ' is-on' : ''))
      li.dataset.slot = s.id
      var chips = el('div', 'slot__chips')
      chips.appendChild(custChip(c))
      li.append(el('p', 'slot__date', rangeText(s)), el('h3', 'slot__name', kindOf(s).name), el('p', 'slot__meta', priceLine(s)))
      if (kindOf(s).cond) li.appendChild(el('p', 'slot__cond', kindOf(s).cond))
      li.appendChild(chips)
      if (st === 'queue') li.appendChild(el('p', 'slot__add', queueText(c)))
      if (st === 'wait' && c.waits.length) li.appendChild(el('p', 'slot__add', 'いま ' + c.waits.length + '組がお待ちです'))
      if (st === 'closed') li.appendChild(el('p', 'slot__add', '申込は開始の30分前までです。'))
      var b
      if (st === 'closed') {
        b = btn('btn-sub btn-pick', '締め切りました', 'pick', { slot: s.id })
        b.disabled = true
        b.setAttribute('aria-label', shortText(s) + ' の回は締め切りました')
      } else {
        b = btn('btn-sub btn-pick' + (on ? ' is-on' : ''), null, 'pick', { slot: s.id })
        if (on) b.appendChild(icon('i-tick', 16))
        b.appendChild(el('span', null, on ? '選択中' : 'この回を選ぶ'))
        b.setAttribute('aria-pressed', on ? 'true' : 'false')
        // 見える字「選択中」も名前に含める
        b.setAttribute('aria-label', shortText(s) + ' ' + kindOf(s).name + 'を選ぶ' + (on ? '（選択中）' : ''))
      }
      var op = el('div', 'slot__op')
      op.appendChild(b)
      li.appendChild(op)
      ul.appendChild(li)
    })
  }

  function mockField (label) {
    var d = el('div', 'mock')
    d.append(el('p', 'mock__label', label), el('div', 'mock-field', '実際のお仕事ではここに入力欄'))
    return d
  }
  function line (cls, label, value) {
    var p = el('p', cls)
    p.append(el('span', 'done__lab', label), ' ', el('span', null, value))
    return p
  }

  // 完了の箱。番号から いまの状態（申込・待ち順・繰り上げ候補・キャンセル）を引き直して出す
  function doneBox (d) {
    var f = findEntry(d.no)
    var slot = f.slot
    var e = f.entry
    var k = kindOf(slot)
    var c = calcOf(slot)
    var now = e.status
    var w = el('div', 'done')
    w.id = 'done'
    var title
    if (now === 'cancel') title = 'この' + (d.mode === 'wait' ? 'キャンセル待ち' : '申込') + 'はキャンセルになりました（デモ）'
    else if (now === 'booked' && d.mode === 'wait') title = '繰り上げで申込になりました（デモ）'
    else if (now === 'booked') title = '申し込みました（デモ）'
    else title = 'キャンセル待ちに登録しました（デモ）'
    var h = el('h3', 'done__title', title)
    h.id = 'done-h'
    h.tabIndex = -1
    // 繰り上げで申込になった後は「申込番号」と出す
    w.append(h, el('p', 'done__nolab', d.mode === 'wait' && now !== 'booked' ? '番号' : '申込番号'), el('p', 'done__no', d.no))
    if (now === 'wait') {
      var pos = c.waits.indexOf(e) + 1
      w.appendChild(el('p', 'done__pos', 'いま 待ち' + pos + '番目 です'))
      if (pos !== d.pos) w.appendChild(el('p', 'done__was', '（登録時は 待ち' + d.pos + '番目）'))
    }
    var what = el('p', 'done__what')
    what.append(el('span', 'nw', rangeText(slot)), ' ', el('span', 'ib', k.name + '・' + e.size + '人'))
    w.appendChild(what)
    if (now === 'cancel') {
      w.appendChild(el('p', 'done__info', 'お店の管理画面でキャンセルにしました。もう一度申し込む時は［続けて申し込む］から選んでください。'))
    } else if (now === 'wait') {
      var isCand = c.cand.indexOf(e) >= 0
      w.appendChild(el('p', 'done__info', isCand
        ? '席が空き、繰り上げ候補になりました。お店からのご連絡をお待ちください（デモでは連絡しません）。'
        : '席が空いて順番が来たら、お店からご連絡します（デモでは連絡しません）。'))
    } else {
      w.appendChild(line('done__line', '合計', fmtYen(k.price * e.size) + '（税込・当日お店でお支払い）'))
      w.appendChild(line('done__line', '集合', fmtTime(slot.start - 10) + '（開始の10分前）'))
      w.appendChild(line('done__line', '持ち物', k.bring))
      w.appendChild(el('p', 'done__info', COMMON_NOTE + (k.extra ? k.extra : '')))
    }
    w.appendChild(el('p', 'done__note', 'このデモでは、どこにも送られず保存もされません。'))
    w.appendChild(btn('btn-sub btn-again', '続けて申し込む', 'again'))
    return w
  }

  function renderEntry () {
    var box = $('entry')
    box.replaceChildren()
    var d = state.done
    if (d) {
      box.appendChild(doneBox(d))
      return
    }
    var h3 = el('h3', 'entry__title', '申込の内容')
    h3.id = 'entry-h'
    h3.tabIndex = -1
    box.appendChild(h3)
    var inner = el('div', 'entry__box')
    box.appendChild(inner)
    if (!state.pick) {
      var p = el('p', 'entry__empty')
      p.append(el('span', 'only-sm', '上の一覧から'), el('span', 'only-lg', '左の一覧から'), '、申し込む回を選んでください。')
      inner.appendChild(p)
      return
    }
    var s = slotOf(state.pick)
    var c = calcOf(s)
    var st = custState(c)
    var max = maxNinzu(c)
    var sel = el('p', 'entry__slot')
    sel.append(el('span', 'entry__lab', '選んだ回：'), el('span', 'ib', startText(s)), ' ', el('span', 'ib', kindOf(s).name))
    inner.appendChild(sel)
    // 参加の条件は人数を選ぶ前に出す
    var cond = null
    if (kindOf(s).cond) {
      cond = el('p', 'entry__cond', kindOf(s).cond)
      cond.id = 'entry-cond'
      inner.appendChild(cond)
    }

    var fs = el('fieldset', 'ninzu')
    fs.appendChild(el('legend', 'ninzu__legend', '人数'))
    var opts = el('div', 'ninzu__opts')
    for (var n = 1; n <= 4; n++) {
      var off = n > max || n < c.min
      var lab = el('label', 'ninzu__opt' + (n === state.ninzu ? ' is-on' : '') + (off ? ' is-off' : ''))
      var r = el('input')
      r.type = 'radio'
      r.name = 'ninzu'
      r.value = String(n)
      r.className = 'ninzu__radio'
      r.checked = n === state.ninzu
      r.disabled = off
      lab.appendChild(r)
      if (n === state.ninzu) lab.appendChild(icon('i-tick', 16))
      lab.appendChild(el('span', null, n + '人'))
      opts.appendChild(lab)
    }
    fs.appendChild(opts)
    // 最少人数の注記は、条件の箱が出ている時は重ねて書かない（条件の箱を人数の説明として読ませる）
    var minNote = c.min > 1 && !cond ? kindOf(s).minNote : ''
    var desc = cond ? ['entry-cond'] : []
    if (max < 4 || minNote) {
      var note = el('p', 'ninzu__note', minNote + (max < 4 ? '残り' + c.rest + '席のため、' + (max + 1) + '人以上は選べません。' : ''))
      note.id = 'ninzu-note'
      desc.push('ninzu-note')
      fs.appendChild(note)
    }
    if (desc.length) fs.setAttribute('aria-describedby', desc.join(' '))
    inner.appendChild(fs)
    inner.append(mockField('お名前'), mockField('ご連絡先（電話またはメール）'))
    var go
    if (st === 'queue') {
      inner.appendChild(el('p', 'entry__wait', c.waits.length
        ? 'この回は順番待ち受付中です（空いた席は待ちの順にご案内）。キャンセル待ちに登録すると、順番が来た時にお店からご連絡します（デモでは連絡しません）。'
        : 'この回は' + c.min + '人から申し込めます。いまは残り' + c.rest + '席のため順番待ちでの受付です。キャンセル待ちに登録すると、席が空いて順番が来た時にお店からご連絡します（デモでは連絡しません）。'))
      go = btn('btn-go', 'キャンセル待ちに登録（デモ）', 'apply')
    } else if (st === 'wait') {
      inner.appendChild(el('p', 'entry__wait', 'この回は満席です。キャンセル待ちに登録すると、席が空いて順番が来た時にお店からご連絡します（デモでは連絡しません）。'))
      go = btn('btn-go', 'キャンセル待ちに登録（デモ）', 'apply')
    } else {
      var k = kindOf(s)
      var tot = el('p', 'entry__total')
      tot.append('合計 ', el('span', 'nw', state.ninzu + '人 × ' + fmtYen(k.price)), ' ', el('span', 'nw', '＝ ' + fmtYen(k.price * state.ninzu) + '（税込）'))
      inner.append(tot, el('p', 'entry__pay', '当日お店でお支払い。デモでは決済しません。'))
      go = btn('btn-go', '申し込む（デモ）', 'apply')
    }
    inner.appendChild(go)
  }

  function renderClock () {
    var c = $('clock')
    c.hidden = state.clock === NOW
    c.textContent = state.clock === NOW ? '' : '／受付の時計 ' + fmtTime(state.clock)
  }

  // 描き直しは1本。操作のたびに呼ぶ
  function render () {
    // 選んでいた人数が選べなくなったら、選べる一番大きい人数にする
    if (state.pick && !state.done) {
      var pc = calcOf(slotOf(state.pick))
      var max = maxNinzu(pc)
      if (state.ninzu > max) state.ninzu = max
      if (state.ninzu < pc.min) state.ninzu = pc.min
    }
    renderAllNums()
    renderTable()
    renderAdminCards()
    renderRoster()
    renderCustCards()
    renderEntry()
    renderClock()
  }

  function focusSel (sel) {
    var e = document.querySelector(sel)
    if (e) e.focus()
  }

  // ---------- 操作 ----------
  function onOpen (id) {
    state.open = id
    render()
    focusSel('#roster-h')
  }
  function onCome (no) {
    var f = findEntry(no)
    if (!f || f.entry.status !== 'booked' || f.entry.at !== null || !calcOf(f.slot).today) return
    state.clock = Math.min(state.clock + 2, CLOCK_MAX)
    f.entry.at = state.clock
    render()
    focusSel('#rows-booked .row[data-no="' + no + '"] [data-act="undo"]')
    var c = calcOf(f.slot)
    say(no + ' を受付しました（' + fmtTime(f.entry.at) + '）。来た ' + c.came + '人／申込 ' + c.booked + '人。')
  }
  function onUndo (no) {
    var f = findEntry(no)
    if (!f || f.entry.at === null) return
    f.entry.at = null
    render()
    focusSel('#rows-booked .row[data-no="' + no + '"] [data-act="come"]')
    say(no + ' の受付を取り消しました。')
  }
  function onCancel (no) {
    var f = findEntry(no)
    if (!f || f.entry.status === 'cancel' || f.entry.at !== null) return
    var wasWait = f.entry.status === 'wait'
    var before = calcOf(f.slot).cand
    f.entry.status = 'cancel'
    render()
    var after = calcOf(f.slot)
    var fresh = after.cand.some(function (e) { return before.indexOf(e) < 0 })
    if (fresh) focusSel('#rows-wait .row[data-no="' + after.cand[0].no + '"] [data-act="promote"]')
    else focusSel(wasWait ? '#wait-h' : '#booked-h')
    say(no + ' をキャンセルにしました。' + (after.cand.length ? '繰り上げ候補 ' + after.cand.length + '組です。' : '繰り上げ候補はありません。'))
  }
  function onPromote (no) {
    var f = findEntry(no)
    var cd = f ? calcOf(f.slot).cand : []
    if (!f || !cd.length || cd[0] !== f.entry) return
    f.entry.status = 'booked'
    render()
    var after = calcOf(f.slot)
    if (after.cand.length) focusSel('#rows-wait .row[data-no="' + after.cand[0].no + '"] [data-act="promote"]')
    else focusSel('#booked-h')
    say(no + ' を申込に繰り上げました。残り' + after.rest + '席です。')
  }
  function onPick (id) {
    var s = slotOf(id)
    var c = calcOf(s)
    if (custState(c) === 'closed') return
    // 選択中の回をもう一度押した時は人数を残す（別の回なら最少人数から。ふつうは 1人、親子体験は 2人）
    if (state.pick !== id) state.ninzu = c.min
    state.pick = id
    state.done = null
    render()
    focusSel('#entry-h')
    var cs = custState(c)
    say(shortText(s) + ' の回を選びました。' + (cs === 'wait' || cs === 'queue' ? 'キャンセル待ちになります。' : '残り' + c.rest + '席です。'))
  }
  function onNinzu (n) {
    state.ninzu = n
    render()
    focusSel('.ninzu__radio[value="' + n + '"]')
  }
  function onApply () {
    if (!state.pick || state.done) return
    var s = slotOf(state.pick)
    var c = calcOf(s)
    var st = custState(c)
    var size = state.ninzu
    if (st === 'closed' || size < c.min || size > maxNinzu(c)) return
    var mode = st === 'wait' || st === 'queue' ? 'wait' : 'booked'
    var no = 'T-' + state.nextNo
    state.entries[s.id].push({ no: no, size: size, status: mode, at: null })
    state.nextNo += 1
    var pos = mode === 'wait' ? calcOf(s).waits.length : 0
    // 控えは登録時の形と待ち順だけ。いまの状態は表示のたびに番号から引き直す
    state.done = { mode: mode, no: no, pos: pos }
    render()
    focusSel('#done-h')
    if (mode === 'wait') say(no + ' でキャンセル待ちに登録しました。待ち' + pos + '番目です。')
    else say(no + ' で申し込みました。' + shortText(s) + '・' + size + '人です。')
  }
  function onAgain () {
    state.pick = ''
    state.done = null
    state.ninzu = 1
    render()
    focusSel('#slots-cust .btn-pick:not(:disabled)')
  }
  function onReset () {
    resetState()
    render()
    say('最初の状態に戻しました。')
  }
  function onClick (e) {
    var b = e.target.closest('[data-act]')
    if (!b || b.disabled) return
    var a = b.dataset.act
    if (a === 'open') onOpen(b.dataset.slot)
    else if (a === 'come') onCome(b.dataset.no)
    else if (a === 'undo') onUndo(b.dataset.no)
    else if (a === 'cancel') onCancel(b.dataset.no)
    else if (a === 'promote') onPromote(b.dataset.no)
    else if (a === 'pick') onPick(b.dataset.slot)
    else if (a === 'apply') onApply()
    else if (a === 'again') onAgain()
  }
  function onChange (e) {
    var r = e.target
    if (r && r.name === 'ninzu' && r.checked) onNinzu(Number(r.value))
  }

  // ---------- タブ ----------
  var TABS = ['tab-admin', 'tab-cust']
  function selectTab (id, focus) {
    TABS.forEach(function (t) {
      var b = $(t)
      var on = t === id
      b.setAttribute('aria-selected', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
      $(b.getAttribute('aria-controls')).hidden = !on
    })
    if (focus) $(id).focus()
  }
  function onTabKey (e) {
    var i = TABS.indexOf(e.currentTarget.id)
    var n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') n = (i + TABS.length - 1) % TABS.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = TABS.length - 1
    if (n < 0) return
    e.preventDefault()
    selectTab(TABS[n], true)
  }

  function init () {
    resetState()
    render()
    $('main').addEventListener('click', onClick)
    $('entry').addEventListener('change', onChange)
    $('reset').addEventListener('click', onReset)
    TABS.forEach(function (t) {
      $(t).addEventListener('click', function () { selectTab(t, false) })
      $(t).addEventListener('keydown', onTabKey)
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
