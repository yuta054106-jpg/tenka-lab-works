// ゲストハウス ヒサメノ（デモ）空室カレンダーと宿泊料金の目安
// 外部通信なし・保存なし。条件は URL のハッシュだけで持つ
// 表示はすべて createElement・textContent・createTextNode。暦は決まった表から（現在の日時・乱数を使わない）
;(function () {
  'use strict'

  // ---------- 部屋（すべて架空・税込） ----------
  var ROOMS = Object.freeze({
    dorm: Object.freeze({ name: '相部屋（ベッド）', short: '相部屋', cap: 4, perBed: true, price: Object.freeze({ w: 3800, h: 4800, n: 6000 }) }),
    twin: Object.freeze({ name: '個室（2人まで）', short: '個室', cap: 2, perBed: false, price: Object.freeze({ w: 9800, h: 12800, n: 16000 }) }),
    wa: Object.freeze({ name: '和室（4人まで）', short: '和室', cap: 4, perBed: false, price: Object.freeze({ w: 16000, h: 20000, n: 26000 }) }),
    hanare: Object.freeze({ name: '離れ（一棟・6人まで）', short: '離れ', cap: 6, perBed: false, price: Object.freeze({ w: 28000, h: 34000, n: 42000 }) })
  })
  var ROOM_KEYS = Object.freeze(['dorm', 'twin', 'wa', 'hanare'])
  var ROOM_DESC = Object.freeze({
    dorm: '8つのベッドが並ぶ相部屋です。1人1ベッドの料金です（架空）。',
    twin: 'ベッドが2つの個室です。3室あります。1室の料金です（架空）。',
    wa: '10畳の和室に布団を敷きます。2室あります。1室の料金です（架空）。',
    hanare: '台所のついた一棟の離れです。1棟だけです。1棟の料金です（架空）。'
  })
  // 料金表の2行目
  var ROOM_UNIT = Object.freeze({ dorm: '1ベッドあたり・4人まで', twin: '1室あたり・2人まで', wa: '1室あたり・4人まで', hanare: '一棟あたり・6人まで' })
  var PTYPE_NAME = Object.freeze({ w: '平日', h: '休前日', n: '年末年始' })

  // ---------- 暦（決まった表） ----------
  var MONTHS = Object.freeze([
    Object.freeze({ ym: '2026-12', y: 2026, m: 12, days: 31, firstWd: 2 }), // 0=日 … 6=土。12/1 は火
    Object.freeze({ ym: '2027-01', y: 2027, m: 1, days: 31, firstWd: 5 }) // 1/1 は金
  ])
  var WD = Object.freeze(['日', '月', '火', '水', '木', '金', '土'])
  var HOLIDAYS = Object.freeze({ '2027-01-01': '元日', '2027-01-11': '成人の日' })
  var CHECKOUT_LAST = Object.freeze({ key: '2027-02-01', m: 2, d: 1, wd: 1 }) // 1/31 の次の日（月）
  var LAST = 61 // 2027-01-31 の番号

  // ---------- 空室（1か月1部屋を31字。o 空きあり・f 残りわずか・x 満室・c 休館） ----------
  var STATUS = Object.freeze({
    dorm: Object.freeze({ '2026-12': 'ooofxoocco' + 'ofooooofxo' + 'ooffxxoffxx', '2027-01': 'xfooooooff' + 'ooooofoocc' + 'oofooooooxo' }),
    twin: Object.freeze({ '2026-12': 'oofxxoocco' + 'fxoooooffo' + 'offxxxffxxx', '2027-01': 'fxfoooofxf' + 'ooooofoocc' + 'ofxoooooffo' }),
    wa: Object.freeze({ '2026-12': 'oooofoocco' + 'fxoooofofo' + 'oooffxoofff', '2027-01': 'ffoooooofo' + 'oooooxoocc' + 'oofoofooofo' }),
    hanare: Object.freeze({ '2026-12': 'ooooxoocco' + 'oxooooooxo' + 'oooxxxoooxx', '2027-01': 'xxooooooxo' + 'oooooooocc' + 'ooxooooooxo' })
  })
  // 料金の種類の表（検査用。画面の計算は priceType の規則で出す）
  var PTYPE_EXPECT = Object.freeze({
    '2026-12': 'wwwhhwwwww' + 'hhwwwwwhhw' + 'wwwwhhwwnnn',
    '2027-01': 'nnnwwwwhhh' + 'wwwwhhwwww' + 'whhwwwwwhhw'
  })

  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  // 62日（番号 0〜61）と、チェックアウトの計算用に 2月1日〜7日（番号 62〜68）
  var ALL = []
  MONTHS.forEach(function (mo) {
    for (var d = 1; d <= mo.days; d++) {
      var key = mo.ym + '-' + pad2(d)
      ALL.push(Object.freeze({ key: key, ym: mo.ym, y: mo.y, m: mo.m, d: d, wd: (mo.firstWd + d - 1) % 7, holiday: HOLIDAYS[key] || '' }))
    }
  })
  for (var fd = 1; fd <= 7; fd++) ALL.push(Object.freeze({ key: '2027-02-' + pad2(fd), ym: '2027-02', y: 2027, m: 2, d: fd, wd: (CHECKOUT_LAST.wd + fd - 1) % 7, holiday: '' }))
  var IDX = {}
  ALL.forEach(function (x, i) { IDX[x.key] = i })
  function dayList () { return ALL.slice(0, LAST + 1).map(function (x) { return { key: x.key, y: x.y, m: x.m, d: x.d, wd: x.wd, holiday: x.holiday } }) }
  function dayAt (i) { return ALL[i] }
  function infoOf (key) { return ALL[IDX[key]] }

  function statusOf (room, key) {
    var x = infoOf(key)
    return STATUS[room][x.ym].charAt(x.d - 1)
  }
  // 年末年始 ＞ 休前日（金・土の夜、次の日が祝日の夜） ＞ 平日
  function priceType (key) {
    var i = IDX[key]
    var x = ALL[i]
    if ((x.m === 12 && x.d >= 29) || (x.m === 1 && x.d <= 3)) return 'n'
    if (x.wd === 5 || x.wd === 6) return 'h'
    if (ALL[i + 1] && ALL[i + 1].holiday) return 'h'
    return 'w'
  }
  function perPerson (total, p) { return Math.floor((total + p - 1) / p) }

  // ---------- 料金の目安（純粋な関数。整数だけ） ----------
  function quote (s) {
    if (!s.in) return { kind: 'none' }
    var room = ROOMS[s.room]
    var i0 = IDX[s.in]
    if (s.p > room.cap) return { kind: 'cap', cap: room.cap }
    if (i0 + s.n - 1 > LAST) return { kind: 'range', maxN: LAST + 1 - i0 }
    var bad = []
    var nights = []
    for (var k = 0; k < s.n; k++) {
      var key = ALL[i0 + k].key
      var st = statusOf(s.room, key)
      if (st === 'c') bad.push({ key: key, reason: 'closed' })
      else if (st === 'x') bad.push({ key: key, reason: 'full' })
      else if (st === 'f' && room.perBed && s.p >= 3) bad.push({ key: key, reason: 'beds' })
      else {
        var type = priceType(key)
        var unit = room.price[type]
        var beds = room.perBed ? s.p : 1
        nights.push({ key: key, type: type, unit: unit, beds: beds, amount: room.perBed ? unit * s.p : unit })
      }
    }
    var checkout = ALL[i0 + s.n].key
    if (bad.length) return { kind: 'ng', bad: bad, checkout: checkout }
    var total = 0
    nights.forEach(function (x) { total += x.amount })
    return { kind: 'ok', nights: nights, total: total, per: perPerson(total, s.p), checkout: checkout }
  }

  // ---------- 書き方（3けたの区切りは自分で入れる） ----------
  function comma (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3) }
    return s + out
  }
  function fmtYen (n) { return comma(n) + '円' }
  function fmtDate (key) { var x = infoOf(key); return x.m + '月' + x.d + '日（' + WD[x.wd] + (x.holiday ? '・祝' : '') + '）' }
  function fmtDateY (key) { return infoOf(key).y + '年' + fmtDate(key) }
  function fmtNight (key) { return fmtDate(key) + 'の夜' }
  function fmtMonth (ym) { return Number(ym.slice(0, 4)) + '年' + Number(ym.slice(5)) + '月' }
  function fmtNights (n) { return n + '泊' }
  function fmtPeople (n) { return n + '人' }
  function fmtBeds (unit, beds) { return fmtYen(unit) + ' × ' + beds + 'ベッド' }

  var REASON = Object.freeze({ full: '満室', closed: '休館', beds: '残りわずか（空いているベッドは2つ）' })
  var REASON_SR = Object.freeze({ full: '満室', closed: '休館', beds: 'ベッドが足りません' })
  var TXT = Object.freeze({
    A2: 'チェックインの日・泊数・人数を、料金の目安で選ぶと、ここに下書きが出ます。',
    A2b: '人数か泊数を直すと、ここに下書きが出ます。',
    A3: 'コピーしました。この画面からは送信していません。',
    A4: 'コピーできませんでした。下書きの文を選んだので、端末の操作でコピーしてください。'
  })

  // ---------- お問い合わせ文の下書き ----------
  function draftText (s) {
    var q = quote(s)
    if (q.kind === 'none') return TXT.A2
    if (q.kind === 'cap' || q.kind === 'range') return TXT.A2b
    var r = ROOMS[s.room]
    var head = [
      '（TENKA LAB のデモの文例・架空の宿）',
      'ゲストハウス ヒサメノ 御中',
      '',
      q.kind === 'ok' ? '次の日程で、空きと料金を確かめたくご連絡しました。' : '次の日程を考えています。',
      '',
      'お部屋：' + r.name,
      'チェックイン：' + fmtDateY(s.in),
      'チェックアウト：' + fmtDateY(q.checkout) + '（' + fmtNights(s.n) + '）',
      '人数：' + fmtPeople(s.p)
    ]
    if (q.kind === 'ok') {
      return head.concat([
        'ページに出た料金の目安：合計 ' + fmtYen(q.total) + '（税込。宿泊税などは別途）',
        '',
        '空いていれば、予約の手続きを教えてください。',
        '（名前と連絡先は、送るときに書き足します）'
      ]).join('\n')
    }
    return head.concat([
      '',
      'ページでは、' + q.bad.map(function (b) { return fmtDateY(b.key) + 'の夜が' + REASON[b.reason] }).join('、') + 'と出ていました。',
      '近い日程や、ほかのお部屋で空きがあれば教えてください。',
      '（名前と連絡先は、送るときに書き足します）'
    ]).join('\n')
  }

  // ---------- 読み上げの文（R4。none の時は空） ----------
  function srText (s) {
    var q = quote(s)
    if (q.kind === 'ok') return '合計 ' + fmtYen(q.total) + 'の目安です（' + fmtNights(s.n) + '・' + fmtPeople(s.p) + '）。'
    if (q.kind === 'ng') return 'この日程は空きがありません。' + q.bad.map(function (b) { return fmtDate(b.key) + REASON_SR[b.reason] }).join('、') + '。'
    if (q.kind === 'cap') return ROOMS[s.room].name + 'は' + q.cap + '人までです。'
    if (q.kind === 'range') return 'このデモの空室は2027年1月31日の夜までです。' + q.maxN + '泊までにしてください。'
    return ''
  }

  // ---------- ハッシュ（デコードしない・そのまま比べる） ----------
  var HASH_A = /^#room=(dorm|twin|wa|hanare)$/
  var HASH_B = /^#room=(dorm|twin|wa|hanare)&in=(2026-12|2027-01)-(0[1-9]|[12][0-9]|3[01])&n=([1-7])&p=([1-6])$/
  function defaultState () { return { room: 'twin', in: null, n: 1, p: 2 } }
  function parseHash (hash) {
    if (typeof hash !== 'string' || hash.length > 80) return null
    var m = HASH_A.exec(hash)
    if (m) return { room: m[1], in: null, n: 1, p: 2 }
    m = HASH_B.exec(hash)
    if (m) return { room: m[1], in: m[2] + '-' + m[3], n: Number(m[4]), p: Number(m[5]) }
    return null
  }
  function buildHash (s) {
    if (!s.in) return s.room === 'twin' ? '' : '#room=' + s.room
    return '#room=' + s.room + '&in=' + s.in + '&n=' + s.n + '&p=' + s.p
  }

  // 検査用に、状態を引数で受ける関数と定数だけ出す
  var api = Object.freeze({
    ROOMS: ROOMS, ROOM_KEYS: ROOM_KEYS, MONTHS: MONTHS, WD: WD, HOLIDAYS: HOLIDAYS, STATUS: STATUS, PTYPE_EXPECT: PTYPE_EXPECT,
    dayList: dayList, statusOf: statusOf, priceType: priceType, quote: quote, perPerson: perPerson, parseHash: parseHash, buildHash: buildHash,
    fmtYen: fmtYen, fmtDate: fmtDate, fmtDateY: fmtDateY, fmtNight: fmtNight, fmtMonth: fmtMonth, fmtNights: fmtNights, fmtPeople: fmtPeople, fmtBeds: fmtBeds,
    draftText: draftText, srText: srText
  })
  if (typeof window !== 'undefined') window.__demo27 = api

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
  function ptype (type) { return el('span', 'ptype ptype--' + type, PTYPE_NAME[type]) }
  function yenNode (n) { return nw(fmtYen(n)) }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var wideMq = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : { matches: false }

  // ---------- 状態 ----------
  var state = defaultState()
  var view = 0 // 表示している月（0＝2026年12月、1＝2027年1月）
  var rove = null // 表の中で Tab が止まるマス
  var lastFocus = null // 最後にフォーカスしたマス

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  var srLast = ''
  // 500ms 何も変わらなければ1回だけ。前と同じ文なら入れない（again の時は一度空にして 50ms 後に入れる）
  function say (text, again) {
    if (!text) return
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
  function join () { return Array.prototype.filter.call(arguments, Boolean).join(' ') }

  // ---------- 選んだ日程の夜（期間の中だけ） ----------
  function stayKeys (s) {
    if (!s.in) return []
    var i0 = IDX[s.in]
    var out = []
    for (var k = 0; k < s.n && i0 + k <= LAST; k++) out.push(ALL[i0 + k].key)
    return out
  }
  function monthOf (key) { return infoOf(key).ym === MONTHS[0].ym ? 0 : 1 }

  // ---------- 部屋 ----------
  function renderRoom () {
    var r = ROOMS[state.room]
    var inputs = document.querySelectorAll('.room-opt__input')
    for (var i = 0; i < inputs.length; i++) inputs[i].checked = inputs[i].value === state.room
    var desc = $('room-desc')
    clear(desc)
    add(desc, nw(r.name), '：' + ROOM_DESC[state.room])
    $('cal-room').textContent = r.name + 'の空室、'
    $('price-room').textContent = r.name
    var hint = $('p-hint')
    clear(hint)
    add(hint, nw(r.name), 'は', nw(r.cap + '人まで'), '。')
    if (r.perBed) add(hint, '相部屋は、人数分のベッドの料金です。')
  }

  // ---------- カレンダー ----------
  var WORD = Object.freeze({ o: '空き', f: 'わずか', x: '満室', c: '休館' })
  var MARK = Object.freeze({ o: 'i-free', f: 'i-few', x: 'i-full', c: 'i-closed' })
  function pickRove () {
    var mo = MONTHS[view].ym
    if (state.in && infoOf(state.in).ym === mo) return state.in
    if (lastFocus && infoOf(lastFocus).ym === mo) return lastFocus
    return mo + '-01'
  }
  function renderCalendar (keepFocusKey) {
    var mo = MONTHS[view]
    $('cal-month').textContent = fmtMonth(mo.ym)
    $('cal-prev').setAttribute('aria-disabled', view === 0 ? 'true' : 'false')
    $('cal-next').setAttribute('aria-disabled', view === 1 ? 'true' : 'false')
    if (!rove || infoOf(rove).ym !== mo.ym) rove = pickRove()
    var stays = stayKeys(state)
    var body = $('cal-body')
    clear(body)
    var d = 1 - mo.firstWd
    for (var row = 0; row < 6; row++) {
      var tr = el('tr')
      for (var col = 0; col < 7; col++, d++) {
        var td = el('td')
        td.setAttribute('role', 'gridcell')
        if (d >= 1 && d <= mo.days) td.appendChild(dayButton(mo.ym + '-' + pad2(d), stays))
        tr.appendChild(td)
      }
      body.appendChild(tr)
    }
    if (keepFocusKey) {
      var b = body.querySelector('[data-key="' + keepFocusKey + '"]')
      if (b) b.focus({ preventScroll: true })
    }
  }
  function dayButton (key, stays) {
    var x = infoOf(key)
    var st = statusOf(state.room, key)
    var b = el('button', 'cal__day cal__day--' + st)
    b.type = 'button'
    b.setAttribute('data-key', key)
    b.tabIndex = key === rove ? 0 : -1
    var si = stays.indexOf(key)
    if (si >= 0) b.classList.add('cal__day--stay')
    if (key === state.in) b.classList.add('cal__day--in')
    add(b, vh(x.m + '月'), el('span', 'cal__d', String(x.d)), vh('日（' + WD[x.wd] + '）' + x.holiday))
    if (x.holiday) {
      var h = el('span', 'cal__hol', '祝')
      h.setAttribute('aria-hidden', 'true')
      b.appendChild(h)
    }
    b.appendChild(icon(MARK[st], 13, 'cal__mark'))
    b.appendChild(txt(' '))
    var w = el('span', 'cal__word')
    if (st === 'o') add(w, WORD.o, vh('あり'))
    else if (st === 'f') add(w, vh('残り'), WORD.f)
    else w.textContent = WORD[st]
    b.appendChild(w)
    var tail = st === 'c' ? '' : '、' + PTYPE_NAME[priceType(key)] + 'の料金'
    if (si >= 0) tail += '、選んだ日程の' + (si + 1) + '泊目'
    if (tail) b.appendChild(vh(tail))
    return b
  }
  function setRove (key) {
    rove = key
    var cells = $('cal-body').querySelectorAll('.cal__day')
    for (var i = 0; i < cells.length; i++) cells[i].tabIndex = cells[i].getAttribute('data-key') === key ? 0 : -1
  }

  function renderPicked () {
    var p = $('cal-picked')
    clear(p)
    if (!state.in) { p.textContent = '日付を押すと、その日から泊まる日程になります。'; return }
    var i0 = IDX[state.in]
    add(p, '選んだ日程：', nw(fmtDate(state.in)), 'から', nw(fmtNights(state.n)), '（太い枠の日）。')
    if (i0 + state.n <= LAST + 1) add(p, 'チェックアウトは', nw(fmtDate(ALL[i0 + state.n].key)), 'です。')
    var months = {}
    stayKeys(state).forEach(function (k) { months[monthOf(k)] = true })
    var other = view === 0 ? 1 : 0
    if (months[other]) add(p, '（', nw(fmtMonth(MONTHS[other].ym)), 'の分は「' + (other === 1 ? '次の月' : '前の月') + '」で見られます）')
  }

  // ---------- 料金の結果 ----------
  function line (cls, nodes) { var e = el('p', cls); nodes.forEach(function (n) { add(e, n) }); return e }
  function summaryLines (card, withOut, q) {
    var r = ROOMS[state.room]
    card.appendChild(line('result__room', [nw(r.name), '・', nw(fmtPeople(state.p))]))
    card.appendChild(line('result__days', [nw(fmtDate(state.in)), 'から', nw(fmtNights(state.n))]))
    if (withOut) card.appendChild(line('result__out', ['チェックアウト ', nw(fmtDate(q.checkout))]))
  }
  function notice (title, body) {
    var box = el('div', 'notice')
    var head = el('p', 'notice__title')
    add(head, icon('i-info', 20), el('span', '', ''))
    var span = head.lastChild
    title.forEach(function (n) { add(span, n) })
    box.appendChild(head)
    body.forEach(function (n) { box.appendChild(n) })
    return box
  }
  function renderResult () {
    var card = $('result')
    clear(card)
    var q = quote(state)
    var r = ROOMS[state.room]
    card.setAttribute('data-kind', q.kind)
    if (q.kind === 'none') {
      card.appendChild(el('p', 'result__none', 'チェックインの日を選ぶと、ここに料金の目安が出ます。カレンダーの日付を押しても選べます。'))
      return q
    }
    summaryLines(card, q.kind === 'ok', q)
    if (q.kind === 'cap') {
      var body = line('notice__body', ['人数を', nw(q.cap + '人'), '以下にするか、ほかのお部屋をお選びください。'])
      if (r.perBed) add(body, '相部屋は、1回のお問い合わせで', nw('4人'), '（4ベッド）までです。')
      else if (state.room !== 'hanare') add(body, nw('6人まで'), '泊まれる離れもあります。')
      card.appendChild(notice([nw(r.name), 'は', nw(q.cap + '人まで'), 'です'], [body]))
    } else if (q.kind === 'range') {
      card.appendChild(notice(['選んだ泊数は、このデモの期間を超えています'], [
        line('notice__body', ['このデモで空室を出しているのは', nw('2027年1月31日'), 'の夜までです。', nw(fmtDate(state.in)), 'からは', nw(fmtNights(q.maxN)), 'までにしてください。'])
      ]))
    } else if (q.kind === 'ng') {
      var ul = el('ul', 'notice__list')
      q.bad.forEach(function (b) {
        var li = el('li')
        add(li, nw(fmtDate(b.key)), nw('の夜'), '：', nw(REASON[b.reason].replace(/（.*/, '')))
        if (b.reason === 'beds') li.appendChild(nw('（空いているベッドは2つ）'))
        ul.appendChild(li)
      })
      card.appendChild(notice(['この日程は空きがありません'], [
        el('p', 'notice__body', '次の夜が空いていないため、合計は出していません。'),
        ul,
        el('p', 'notice__body', '日にちをずらすか、ほかのお部屋をお選びください。')
      ]))
    } else {
      var tb = el('table', 'breakdown')
      tb.appendChild(el('caption', 'visually-hidden', '1泊ごとの料金の内訳'))
      var thead = el('thead', 'visually-hidden')
      var htr = el('tr')
      ;['夜', '料金の種類', '料金'].forEach(function (t) { var th = el('th', '', t); th.scope = 'col'; htr.appendChild(th) })
      thead.appendChild(htr)
      tb.appendChild(thead)
      var tbody = el('tbody')
      q.nights.forEach(function (x) {
        var tr = el('tr')
        var th = el('th')
        th.scope = 'row'
        add(th, nw(fmtDate(x.key)), nw('の夜'))
        var t1 = el('td', 'breakdown__type')
        t1.appendChild(ptype(x.type))
        var t2 = el('td', 'breakdown__yen')
        t2.appendChild(el('span', 'breakdown__amt nw', fmtYen(x.amount)))
        if (r.perBed) t2.appendChild(el('span', 'breakdown__sub nw', fmtBeds(x.unit, x.beds)))
        add(tr, th, t1, t2)
        tbody.appendChild(tr)
      })
      tb.appendChild(tbody)
      card.appendChild(tb)
      var tot = el('p', 'total')
      var big = el('span', 'total__num nw')
      add(big, comma(q.total), el('span', 'total__yen', '円'))
      add(tot, el('span', 'total__label', '合計'), ' ', big, el('span', 'total__tax nw', '（税込）'))
      card.appendChild(tot)
      var per = el('p', 'total__per')
      add(per, '1人あたり ', nw(fmtYen(q.per)), el('span', 'total__note nw', '（1円未満は切り上げ）'))
      card.appendChild(per)
      card.appendChild(el('p', 'note result__note', '料金は税込の目安です（架空）。相部屋は人数分のベッド、ほかは1室の料金です。子ども料金・宿泊税・入湯税は、この試算に含めていません。'))
    }
    return q
  }

  // ---------- 部屋ごとの料金表 ----------
  function renderRates () {
    var body = $('rates-body')
    clear(body)
    ROOM_KEYS.forEach(function (k) {
      var r = ROOMS[k]
      var tr = el('tr', k === state.room ? 'rates--current' : '')
      var th = el('th')
      th.scope = 'row'
      var unit = ROOM_UNIT[k].split('・')
      add(th, el('span', 'rates__name nw', r.short), add(el('span', 'rates__unit'), unit[0] + '・', nw(unit[1])))
      if (k === state.room) th.appendChild(vh('（選んでいる部屋）'))
      tr.appendChild(th)
      ;['w', 'h', 'n'].forEach(function (t) { var td = el('td'); td.appendChild(yenNode(r.price[t])); tr.appendChild(td) })
      body.appendChild(tr)
    })
  }

  // ---------- 下書き ----------
  // 文の中の店名・日付・金額・泊数・人数・部屋の名を、途中で折れない span にする（textContent は文のまま）
  var NW_RE = /ゲストハウス ヒサメノ|\d{4}年\d{1,2}月\d{1,2}日（[^）]+）|[\d,]+円|\d+泊|\d+人|相部屋（ベッド）|個室（2人まで）|和室（4人まで）|離れ（一棟・6人まで）|残りわずか|架空の宿/g
  function wrapNw (parent, text) {
    var last = 0
    var m
    NW_RE.lastIndex = 0
    while ((m = NW_RE.exec(text))) {
      if (m.index > last) parent.appendChild(txt(text.slice(last, m.index)))
      parent.appendChild(nw(m[0]))
      last = m.index + m[0].length
    }
    if (last < text.length) parent.appendChild(txt(text.slice(last)))
  }
  function renderDraft (q) {
    var box = $('draft-text')
    clear(box)
    wrapNw(box, draftText(state))
    $('draft-done').textContent = ''
    $('draft-copy').setAttribute('aria-disabled', q.kind === 'ok' || q.kind === 'ng' ? 'false' : 'true')
  }

  // ---------- 入力欄 ----------
  function syncFields () {
    $('f-in').value = state.in || ''
    $('f-n').value = String(state.n)
    $('f-p').value = String(state.p)
  }
  function buildInOptions () {
    var s = $('f-in')
    clear(s)
    var o0 = el('option', '', '選んでください')
    o0.value = ''
    s.appendChild(o0)
    MONTHS.forEach(function (mo) {
      var g = el('optgroup')
      g.label = fmtMonth(mo.ym)
      for (var d = 1; d <= mo.days; d++) {
        var key = mo.ym + '-' + pad2(d)
        var o = el('option', '', fmtDate(key))
        o.value = key
        g.appendChild(o)
      }
      s.appendChild(g)
    })
  }

  // ---------- 全体の描き直し ----------
  function render (keepFocusKey) {
    renderRoom()
    renderCalendar(keepFocusKey)
    renderPicked()
    var q = renderResult()
    renderRates()
    renderDraft(q)
    syncFields()
    fitSticky()
  }
  function writeHash () {
    if (!history.replaceState) return
    var h = buildHash(state)
    if (h !== location.hash || (!h && location.hash)) history.replaceState(null, '', h || location.pathname + location.search)
  }
  function changed (srPrefix, keepFocusKey) {
    render(keepFocusKey)
    writeHash()
    say(join(srPrefix, srText(state)))
  }

  // 1024px〜：料金の目安の欄が画面より高い時は貼り付けない
  function fitSticky () {
    var d = $('price')
    if (!d) return
    d.classList.remove('is-static')
    if (wideMq.matches && d.offsetHeight > window.innerHeight - 48) d.classList.add('is-static')
  }

  // ---------- ハッシュ（開いた時・hashchange） ----------
  var HASH_HEAD = /^#room(?=$|[=&])/
  function applyHash (fromEvent) {
    var h = location.hash
    if (!HASH_HEAD.test(h)) return
    var p = parseHash(h)
    if (!p) {
      // 不正：エラーを出さずに最初の状態に戻し、ハッシュを消す。フォーカス・スクロール・読み上げは動かさない
      state = defaultState()
      view = 0
      rove = null
      render()
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search)
      return
    }
    var roomChanged = p.room !== state.room
    state = p
    view = state.in ? monthOf(state.in) : 0
    rove = null
    render()
    var canon = buildHash(state)
    if (canon !== h && history.replaceState) history.replaceState(null, '', canon || location.pathname + location.search)
    if (fromEvent) say(srText(state) || (roomChanged ? ROOMS[state.room].name + 'の空室を表示しています。' : ''))
  }

  // ---------- ページ内の移動（ハッシュを変えない） ----------
  function goTo (target, focusEl) {
    if (!target) return false
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    ;(focusEl || target).focus({ preventScroll: true })
    return true
  }

  // ---------- カレンダーのキー操作 ----------
  function moveTo (key, fromKey) {
    var m = monthOf(key)
    lastFocus = key
    if (m !== view) {
      view = m
      rove = key
      renderCalendar(key)
      renderPicked()
      return
    }
    setRove(key)
    var b = $('cal-body').querySelector('[data-key="' + key + '"]')
    if (b) b.focus({ preventScroll: true })
  }
  function onGridKey (e) {
    var b = e.target.closest && e.target.closest('.cal__day')
    if (!b) return
    var key = b.getAttribute('data-key')
    var i = IDX[key]
    var x = ALL[i]
    var to = null
    switch (e.key) {
      case 'ArrowRight': to = i + 1; break
      case 'ArrowLeft': to = i - 1; break
      case 'ArrowDown': to = i + 7; break
      case 'ArrowUp': to = i - 7; break
      case 'Home': to = i - Math.min(x.wd, x.d - 1); break
      case 'End': to = i + Math.min(6 - x.wd, MONTHS[monthOf(key)].days - x.d); break
      case 'PageDown': to = monthOf(key) === 0 ? i + MONTHS[0].days : i; break
      case 'PageUp': to = monthOf(key) === 1 ? i - MONTHS[0].days : i; break
      default: return
    }
    e.preventDefault()
    if (to < 0 || to > LAST || to === i) return
    moveTo(ALL[to].key, key)
  }

  function setMonth (m) {
    if (m === view) return
    view = m
    rove = null
    renderCalendar()
    renderPicked()
    say(fmtMonth(MONTHS[view].ym) + 'を表示しています。')
  }

  // ---------- コピー ----------
  function copyDraft () {
    var btn = $('draft-copy')
    if (btn.getAttribute('aria-disabled') === 'true') return
    var text = draftText(state)
    var done = function () { $('draft-done').textContent = TXT.A3; say(TXT.A3, true) }
    var fail = function () {
      try {
        var sel = window.getSelection()
        var rg = document.createRange()
        rg.selectNodeContents($('draft-text'))
        sel.removeAllRanges()
        sel.addRange(rg)
      } catch (e) { /* 選べない時も文は出す */ }
      $('draft-done').textContent = TXT.A4
      say(TXT.A4, true)
    }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') navigator.clipboard.writeText(text).then(done, fail)
      else fail()
    } catch (e) { fail() }
  }

  function init () {
    buildInOptions()

    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : null
      if (!t) return
      var a = t.closest('a[href^="#"]')
      if (a) {
        var id = a.getAttribute('href').slice(1)
        var target = id && $(id)
        if (target && goTo(target, target.querySelector('h1, h2'))) e.preventDefault()
        return
      }
      var b = t.closest('button')
      if (!b) return
      if (b.classList.contains('cal__day')) {
        var key = b.getAttribute('data-key')
        state.in = key
        rove = key
        lastFocus = key
        changed('', key)
      } else if (b.id === 'cal-prev') {
        if (b.getAttribute('aria-disabled') !== 'true') setMonth(0)
      } else if (b.id === 'cal-next') {
        if (b.getAttribute('aria-disabled') !== 'true') setMonth(1)
      } else if (b.id === 'to-price') {
        goTo($('price'), $('h-price'))
      } else if (b.id === 'reroom') {
        var r = document.querySelector('.room-opt__input:checked')
        r.closest('.room-opt').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
        r.focus({ preventScroll: true })
      } else if (b.id === 'draft-copy') {
        copyDraft()
      }
    })

    var radios = document.querySelectorAll('.room-opt__input')
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function () {
        if (!this.checked || !ROOMS[this.value]) return
        state.room = this.value
        changed(ROOMS[state.room].name + 'の空室を表示しています。')
      })
    }
    $('f-in').addEventListener('change', function () {
      var v = this.value
      state.in = IDX[v] !== undefined && IDX[v] <= LAST ? v : null
      var pre = ''
      if (state.in && monthOf(state.in) !== view) {
        view = monthOf(state.in)
        pre = fmtMonth(MONTHS[view].ym) + 'を表示しています。'
      }
      if (state.in) rove = state.in
      changed(pre)
    })
    $('f-n').addEventListener('change', function () {
      var n = Number(this.value)
      state.n = n >= 1 && n <= 7 ? n : 1
      changed('')
    })
    $('f-p').addEventListener('change', function () {
      var p = Number(this.value)
      state.p = p >= 1 && p <= 6 ? p : 2
      changed('')
    })

    var grid = $('cal-grid')
    grid.addEventListener('keydown', onGridKey)
    grid.addEventListener('focusin', function (e) {
      var b = e.target.closest && e.target.closest('.cal__day')
      if (b) lastFocus = b.getAttribute('data-key')
    })
    // 表から出た時は、次に入る時のマスを決め直す（チェックインの日 → 最後のマス → 1日）
    grid.addEventListener('focusout', function (e) {
      if (e.relatedTarget && grid.contains(e.relatedTarget)) return
      setRove(pickRove())
    })

    window.addEventListener('hashchange', function () { applyHash(true) })
    window.addEventListener('resize', fitSticky)
    if (wideMq.addEventListener) wideMq.addEventListener('change', fitSticky)

    // 読み込み直しでブラウザが入力欄の状態を戻しても、開いた時は最初の状態から始める
    state = defaultState()
    view = 0
    render()
    applyHash(false)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
