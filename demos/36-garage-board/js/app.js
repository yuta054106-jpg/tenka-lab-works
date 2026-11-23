// ミチカゼ自動車整備（デモ・架空のお店）作業ボードとお客様への進み具合のお知らせ
// 外部通信なし・保存なし。操作はボタンと選択だけ。文字を入れる欄なし
// 表示はすべて createElement・textContent・replaceChildren。時計は止めている（デモの今は定数 NOW）
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}
  function fz (o) { return Object.freeze(o) }

  // ---------- 固定データ（すべて架空） ----------
  var COLS = fz(['受付', '点検中', '部品待ち', '作業中', '仕上げの確認', 'お渡しできます'])
  var LAST = COLS.length - 1
  // 部品待ちの列。お客様向けの工程には、この列を実際に通った車だけ出す
  var PARTS = 2
  // デモの今：2026-11-24（火）15:00。11/24 0:00 からの分。翌日は +1440
  var NOW = 900
  var DAY = 1440
  // due＝お渡しの予定、col＝最初の列、parts＝部品の入荷予定（無ければ null）
  var CARS = fz([
    fz({ no: 'M-1101', kind: '軽自動車', job: 'オイル交換', due: 930, col: 3, parts: null }),
    fz({ no: 'M-1102', kind: 'ワゴン', job: '車検のお預かり', due: 1020, col: 1, parts: null }),
    fz({ no: 'M-1103', kind: '軽自動車', job: 'タイヤ交換（冬用へ）', due: 960, col: 4, parts: null }),
    fz({ no: 'M-1104', kind: 'セダン', job: 'ブレーキの点検', due: 961, col: 3, parts: null }),
    fz({ no: 'M-1105', kind: '軽トラック', job: 'バッテリーの交換', due: 870, col: 4, parts: null }),
    fz({ no: 'M-1106', kind: 'ミニバン', job: '車検のお預かり', due: 2100, col: 2, parts: 1980 }),
    fz({ no: 'M-1107', kind: 'コンパクトカー', job: 'エアコンの点検', due: 1080, col: 0, parts: null }),
    fz({ no: 'M-1108', kind: 'ワゴン', job: 'オイル交換', due: 840, col: 5, parts: null }),
    fz({ no: 'M-1109', kind: '軽自動車', job: 'ワイパーとライトの交換', due: 810, col: 5, parts: null }),
    fz({ no: 'M-1110', kind: 'SUV', job: '異音の点検', due: 2460, col: 0, parts: null }),
    fz({ no: 'M-1111', kind: 'ミニバン', job: 'ドアミラーの交換', due: 950, col: 2, parts: 915 })
  ])
  // お客様向けの段ごとの案内
  var STEP_MSG = fz([
    'お車をお預かりしました。これから点検に入ります。',
    'いま、お車を点検しています。',
    '部品の入荷を待っています。',
    'いま、作業をしています。',
    '作業が終わり、最後の確認をしています。',
    'お渡しの準備ができました。受付で受付番号をお伝えください。'
  ])
  var PARTS_NONE_MSG = '入荷予定は未定です。'
  var SORRY_MSG = 'お渡しの予定の時刻を過ぎています。お待たせしており、申し訳ありません。'

  // ---------- 決まり（純粋な関数） ----------
  // 急ぎ：お渡し予定まで60分以内か、予定を過ぎた車（準備完了の車を除く）
  function isUrgent (car, col) { return col !== LAST && car.due - NOW <= 60 }
  function isToday (car) { return car.due < DAY }
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  // お客様向けに出す工程（列の番号の並び）。部品待ちは、通った車（via が true）だけ
  function custSteps (via) {
    var out = []
    COLS.forEach(function (_, i) { if (i !== PARTS || via) out.push(i) })
    return out
  }
  // 入荷予定日だけ（時刻は出さない）。900 →「今日（11月24日）」、1980 →「明日（11月25日）」
  function fmtDay (m) { return m < DAY ? '今日（11月24日）' : '明日（11月25日）' }
  // 900 →「今日 15:00」、1980 →「明日 9:00」
  function fmtTime (m) {
    var day = m < DAY ? '今日' : '明日'
    var t = m < DAY ? m : m - DAY
    var mm = t % 60
    return day + ' ' + ((t - mm) / 60) + ':' + pad2(mm)
  }
  // 急ぎの添え
  function urgentNote (car) {
    var d = car.due - NOW
    if (d > 0) return '（あと' + d + '分）'
    if (d === 0) return '（予定の時刻です）'
    return '（' + (-d) + '分過ぎ）'
  }
  // 列の中の並び：お渡しの予定の早い順、同じなら受付番号の順
  function byDue (a, b) {
    if (a.due !== b.due) return a.due - b.due
    return a.no < b.no ? -1 : a.no > b.no ? 1 : 0
  }

  // 検査用の出口（凍結した定数と純粋な関数だけ）
  root.__demo36 = fz({ COLS: COLS, NOW: NOW, CARS: CARS, isUrgent: isUrgent, isToday: isToday, fmtTime: fmtTime, fmtDay: fmtDay, urgentNote: urgentNote, custSteps: custSteps })
  if (typeof document === 'undefined') return

  // ---------- 画面 ----------
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function nw (text) { return el('span', 'nw', text) }
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

  // ---------- 状態（画面の中だけ。保存しない） ----------
  // via＝部品待ちの列を通ったか（車ごとの記録。最初から部品待ちにいる車だけ true）
  var state = { col: {}, via: {}, open: [], pick: '' }
  function resetState () {
    CARS.forEach(function (c) {
      state.col[c.no] = c.col
      state.via[c.no] = c.col === PARTS
    })
    state.open = COLS.map(function () { return true })
    state.pick = ''
  }
  function carOf (no) {
    for (var i = 0; i < CARS.length; i++) if (CARS[i].no === no) return CARS[i]
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

  // ---------- ボード ----------
  var lanes = []
  // 列の枠は最初に1回だけ作る（畳むボタンを描き直さない）
  function buildLanes () {
    var board = $('board')
    COLS.forEach(function (name, i) {
      var sec = el('section', 'lane')
      sec.setAttribute('aria-labelledby', 'lane-h-' + i)
      var head = el('div', 'lane__head')
      var h = el('h3', 'lane__title')
      h.id = 'lane-h-' + i
      var num = el('span', 'lane__num')
      // 名前と台数の間に空白（読み上げで「受付2台」とつながらないように）
      h.append(el('span', 'lane__name', name), ' ', num)
      var tg = el('button', 'lane__toggle')
      tg.type = 'button'
      tg.setAttribute('aria-controls', 'lane-list-' + i)
      tg.appendChild(icon('i-chev', 24))
      tg.addEventListener('click', function () {
        state.open[i] = !state.open[i]
        renderToggle(i)
      })
      head.append(h, tg)
      var list = el('ul', 'lane__list')
      list.id = 'lane-list-' + i
      sec.append(head, list)
      board.appendChild(sec)
      lanes.push({ num: num, toggle: tg, list: list })
    })
  }
  function renderToggle (i) {
    var l = lanes[i]
    var open = state.open[i]
    l.toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    l.toggle.setAttribute('aria-label', COLS[i] + 'の列を' + (open ? '畳む' : '開く'))
    l.list.hidden = !open
  }
  function line (cls, label, value) {
    var p = el('p', cls)
    p.append(el('span', 'car__lab', label), ' ', el('strong', 'nw', value))
    return p
  }
  function moveBtn (car, col, dir) {
    var b = el('button', 'mv mv--' + dir)
    b.type = 'button'
    b.dataset.no = car.no
    b.dataset.dir = dir
    var to = dir === 'next' ? col + 1 : col - 1
    var can = to >= 0 && to <= LAST
    var word = dir === 'next' ? '次へ' : '戻す'
    if (can) {
      b.setAttribute('aria-label', car.no + ' を「' + COLS[to] + '」へ' + (dir === 'next' ? '進める' : '戻す'))
      if (dir === 'next') b.append(el('span', null, word), icon('i-next', 16))
      else b.append(icon('i-back', 16), el('span', null, word))
    } else {
      b.disabled = true
      b.setAttribute('aria-label', car.no + (dir === 'next' ? ' はこれ以上進められません' : ' はこれ以上戻せません'))
      b.appendChild(el('span', null, word))
    }
    return b
  }
  function card (car) {
    var col = state.col[car.no]
    var urgent = isUrgent(car, col)
    var li = el('li', 'lane__item')
    var a = el('article', 'car' + (urgent ? ' car--urgent' : ''))
    var idNo = 'car-' + car.no + '-no'
    a.setAttribute('aria-labelledby', idNo)
    a.dataset.no = car.no
    var no = el('p', 'car__no', car.no)
    no.id = idNo
    a.append(no, el('p', 'car__kind', car.kind), el('p', 'car__job', car.job), line('car__due', 'お渡しの予定', fmtTime(car.due)))
    if (col === PARTS) a.appendChild(line('car__parts', '部品の入荷予定', car.parts === null ? '未定' : fmtTime(car.parts)))
    if (urgent) {
      var u = el('p', 'car__urg')
      var tag = el('span', 'tag-urgent')
      tag.append(icon('i-warn', 16), '急ぎ')
      u.append(tag, el('span', 'car__urg-note nw', urgentNote(car)))
      a.appendChild(u)
    }
    var mv = el('div', 'car__mv')
    mv.append(moveBtn(car, col, 'back'), moveBtn(car, col, 'next'))
    a.appendChild(mv)
    li.appendChild(a)
    return li
  }
  function renderBoard () {
    var per = COLS.map(function () { return [] })
    CARS.forEach(function (c) { per[state.col[c.no]].push(c) })
    var counts = []
    per.forEach(function (cars, i) {
      cars.sort(byDue)
      var l = lanes[i]
      l.num.textContent = cars.length + '台'
      if (cars.length) l.list.replaceChildren.apply(l.list, cars.map(card))
      else l.list.replaceChildren(el('li', 'lane__empty', 'この列に車はありません'))
      renderToggle(i)
      var c = el('li', 'counts__item')
      c.append(el('span', 'counts__name', COLS[i]), ' ', el('strong', 'counts__num nw', cars.length + '台'))
      counts.push(c)
    })
    $('counts').replaceChildren.apply($('counts'), counts)
    var today = 0
    var ready = 0
    var urgent = 0
    CARS.forEach(function (c) {
      var col = state.col[c.no]
      if (isToday(c)) { today++; if (col === LAST) ready++ }
      if (isUrgent(c, col)) urgent++
    })
    $('today').replaceChildren(nw('今日お渡し予定'), ' ', el('strong', 'today__num nw', today + '台'), ' のうち ', nw('お渡し準備完了'), ' ', el('strong', 'today__num nw', ready + '台'))
    var us = $('urgent-sum')
    us.className = 'urgent-sum' + (urgent ? '' : ' urgent-sum--zero')
    us.replaceChildren()
    if (urgent) us.appendChild(icon('i-warn', 16))
    us.append('急ぎ ', el('strong', 'nw', urgent + '台'))
  }

  // ---------- お客様向けの表示 ----------
  // k＝表示の何段目（0から）、now＝いまの段（表示の段の番号）
  function step (i, k, now) {
    var li = el('li', 'step')
    if (k < now) {
      li.classList.add('step--done')
      li.append(icon('i-tick', 18, 'step__tick'))
    } else if (k === now) {
      li.classList.add('step--now')
      li.setAttribute('aria-current', 'step')
    } else {
      li.classList.add('step--todo')
    }
    var body = el('span', 'step__body')
    var nm = el('span', 'step__name')
    nm.append(el('span', 'step__num', String(k + 1)), COLS[i])
    body.appendChild(nm)
    if (k < now) body.appendChild(el('span', 'visually-hidden', '（済み）'))
    if (k === now) body.appendChild(el('span', 'step__here', 'いまここ'))
    li.appendChild(body)
    return li
  }
  function renderCust () {
    var out = $('cust-out')
    var sel = $('cust-no')
    if (sel.value !== state.pick) sel.value = state.pick
    var car = carOf(state.pick)
    if (!car) {
      out.replaceChildren(el('p', 'cust__empty', 'サンプルを選ぶと、お車の進み具合が出ます。'))
      return
    }
    var col = state.col[car.no]
    var box = el('div', 'cust__card')
    var h = el('h3', 'cust__no')
    h.append('受付番号 ', nw(car.no))
    var due = el('p', 'cust__due')
    due.append(el('span', 'car__lab', 'お渡しの予定'), ' ', el('strong', 'nw', fmtTime(car.due)))
    var list = custSteps(state.via[car.no])
    var now = list.indexOf(col)
    var sh = el('h4', 'visually-hidden', '進み具合（' + list.length + '段）')
    var ol = el('ol', 'steps')
    list.forEach(function (i, k) { ol.appendChild(step(i, k, now)) })
    var msg = el('div', 'cust__msg' + (col === LAST ? ' cust__msg--ready' : ''))
    if (col === LAST) msg.appendChild(icon('i-tick', 24))
    var mp = el('p', null, STEP_MSG[col])
    if (col === PARTS) {
      if (car.parts === null) mp.append(PARTS_NONE_MSG)
      else mp.append('入荷予定日：', nw(fmtDay(car.parts)))
    }
    msg.appendChild(mp)
    box.append(h, el('p', 'cust__what', car.kind + '・' + car.job), due, sh, ol, msg)
    if (col !== LAST && car.due < NOW) {
      var s = el('p', 'cust__sorry')
      s.append(icon('i-info', 20), el('span', null, SORRY_MSG))
      box.appendChild(s)
    }
    out.replaceChildren(box)
  }

  // ---------- 描き直しは1本 ----------
  function render () {
    renderBoard()
    renderCust()
  }

  // ---------- 操作 ----------
  function move (no, dir) {
    var car = carOf(no)
    var from = state.col[no]
    var to = dir === 'next' ? from + 1 : from - 1
    if (!car || to < 0 || to > LAST) return
    var was = isUrgent(car, from)
    state.col[no] = to
    // 部品待ちを通ったことを記録する（戻しても消さない。最初に戻すで消える）
    if (to === PARTS) state.via[no] = true
    // 行き先の列が畳まれていたら開く（畳んだ列の中ではフォーカスを戻せず、body に落ちるため）
    state.open[to] = true
    render()
    // フォーカスは同じ車の新しいカードの、押したのと同じボタン。押せなければ反対のボタン
    var same = document.querySelector('.mv[data-no="' + no + '"][data-dir="' + dir + '"]')
    var other = document.querySelector('.mv[data-no="' + no + '"][data-dir="' + (dir === 'next' ? 'back' : 'next') + '"]')
    var f = same && !same.disabled ? same : other
    if (f) f.focus()
    say(no + ' を「' + COLS[to] + '」へ移しました。' + (!was && isUrgent(car, to) ? '急ぎです。' : ''))
  }
  function onBoardClick (e) {
    var b = e.target.closest('.mv')
    if (!b || b.disabled) return
    move(b.dataset.no, b.dataset.dir)
  }
  function onReset () {
    resetState()
    render()
    say('最初の状態に戻しました。')
  }
  function onPick () {
    state.pick = $('cust-no').value
    renderCust()
    var car = carOf(state.pick)
    if (!car) return
    var col = state.col[car.no]
    var list = custSteps(state.via[car.no])
    say(car.no + ' はいま、' + list.length + '段のうち' + (list.indexOf(col) + 1) + '段目「' + COLS[col] + '」です。')
  }

  // ---------- タブ ----------
  var TABS = ['tab-board', 'tab-cust']
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
    var sel = $('cust-no')
    var first = el('option', null, '選んでください')
    first.value = ''
    sel.appendChild(first)
    CARS.forEach(function (c) {
      var o = el('option', null, c.no + '・' + c.kind)
      o.value = c.no
      sel.appendChild(o)
    })
    buildLanes()
    resetState()
    render()
    $('board').addEventListener('click', onBoardClick)
    $('reset').addEventListener('click', onReset)
    sel.addEventListener('change', onPick)
    TABS.forEach(function (t) {
      $(t).addEventListener('click', function () { selectTab(t, false) })
      $(t).addEventListener('keydown', onTabKey)
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
