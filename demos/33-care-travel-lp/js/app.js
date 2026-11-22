// 付き添い旅行 ヒナタミチ（デモ・架空の事業者）付き添いつき旅行の LP
// 外部通信なし・保存なし（URL のハッシュも使わない）。操作は選ぶボタンと開閉だけ。入力欄なし
// 表示はすべて createElement・createElementNS・textContent・replaceChildren
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}
  function fz (o) { return Object.freeze(o) }

  // ---------- プラン・料金（すべて架空・税込・整数の円） ----------
  var PLANS = fz([
    fz({ id: 'day', name: '日帰り', desc: '近場の庭園と食事', nights: 0, trip: 18000, staffFee: 24000 }),
    fz({ id: 'n1', name: '1泊2日', desc: '温泉地で1泊', nights: 1, trip: 46000, staffFee: 55000 }),
    fz({ id: 'n2', name: '2泊3日', desc: 'ご家族の集まり・お墓参りなど（行き先はご相談）', nights: 2, trip: 72000, staffFee: 82000 })
  ])
  var STAFF = fz([1, 2])
  var NIGHT_FEE = 12000 // 夜間の見守り 1泊につき（スタッフの人数によらない）

  // ---------- 早見表（7場面 × 3プラン。st：ok 手伝える／ask 相談のうえ／no できない） ----------
  var SCENES = fz(['move', 'ride', 'meal', 'toilet', 'bath', 'medicine', 'night'])
  var SCENE_NAMES = fz({ move: '移動', ride: '乗り物の乗り降り', meal: '食事', toilet: 'お手洗い', bath: '入浴', medicine: 'お薬', night: '夜間' })
  var ST_NAMES = fz({ ok: '手伝える', ask: '相談のうえ', no: 'できない' })
  var PLAN_LINES = fz({ day: '日帰り：近場の庭園と食事', n1: '1泊2日：温泉地で1泊', n2: '2泊3日：ご家族の集まり・お墓参りなど（行き先はご相談）' })
  function c (st, text) { return fz({ st: st, text: text }) }
  var RIDE = '車・電車・バスの乗り降りで、手を添えて支えます。段差の多い所は、前もって道順を確かめます。'
  var TOILET = '入口までの付き添いと、扉の外での待機はできます。中でのお手伝いは、事前のご相談のうえで決めます。'
  var TOILET_INN = TOILET + '宿のお部屋のお手洗いの様子も、前もって確かめます。'
  var MED = 'お薬はご本人・ご家族の管理です。時間の声かけのみ行います。'
  var MED_NO = '飲ませる・塗る・貼るなどはできません。'
  var BATH = '浴場までの付き添いと、脱衣所の外での見守りはできます。体を洗う・湯船の出入りのお手伝いは、事前のご相談のうえで決めます。お部屋のお風呂や貸切のお風呂は、宿の空きによります。'
  var NIGHT_TAIL = '同じ部屋での付き添いや、夜中のお手洗いのお手伝いは、ご相談のうえで決めます。'
  var HELP = fz({
    day: fz({
      move: c('ok', '歩く時はそばで付き添い、車いすを押し、荷物を持ちます。庭園の中で休めるベンチの場所を、前もって確かめます。'),
      ride: c('ok', RIDE),
      meal: c('ok', '席までのご案内、料理の取り分け、小さく切るなどをお手伝いします。食べ物の形（きざみ・やわらかめなど）は、お店とご相談のうえで決めます。'),
      toilet: c('ask', TOILET),
      bath: c('no', '日帰り（近場の庭園と食事）には、入浴の時間がありません。'),
      medicine: c('no', MED + MED_NO),
      night: c('no', '日帰りのため、夜間の時間はありません。夕方にご自宅までお送りします。')
    }),
    n1: fz({
      move: c('ok', '歩く時はそばで付き添い、車いすを押し、荷物を持ちます。宿の中の移動もご一緒します。'),
      ride: c('ok', RIDE),
      meal: c('ok', '宿とお店の食事で、席までのご案内・取り分け・小さく切るなどをお手伝いします。食べ物の形は、宿・お店とご相談のうえで決めます。'),
      toilet: c('ask', TOILET_INN),
      bath: c('ask', BATH),
      medicine: c('no', MED + MED_NO),
      night: c('ask', '「夜間の見守り」をつけると、スタッフが近くの部屋で待機し、呼ばれたらうかがいます。' + NIGHT_TAIL)
    }),
    n2: fz({
      move: c('ok', '歩く時はそばで付き添い、車いすを押し、荷物を持ちます。3日間なので、2日目はゆっくり過ごせる予定を、ご相談のうえで組みます。'),
      ride: c('ok', RIDE),
      meal: c('ok', '宿とお店の食事で、席までのご案内・取り分け・小さく切るなどをお手伝いします。ご家族の集まりの席では、ご家族と一緒にお手伝いします。'),
      toilet: c('ask', TOILET_INN),
      bath: c('ask', BATH),
      medicine: c('no', MED + '出発の前に、3日分そろっているかをご家族と一緒に確かめます。' + MED_NO),
      night: c('ask', '「夜間の見守り」をつけると、スタッフが近くの部屋で待機し、呼ばれたらうかがいます（2泊とも同じ形です）。' + NIGHT_TAIL)
    })
  })

  // ---------- 純粋な関数（整数だけ） ----------
  function planOf (id) {
    for (var i = 0; i < PLANS.length; i++) if (PLANS[i].id === id) return PLANS[i]
    return null
  }
  function estimate (planId, staff, nightOn) {
    var p = planOf(planId)
    var on = p.nights > 0 && !!nightOn
    var night = on ? NIGHT_FEE * p.nights : 0
    return fz({ trip: p.trip, staffFee: p.staffFee * staff, perStaff: p.staffFee, staff: staff, night: night, nights: p.nights, nightOn: on, total: p.trip + p.staffFee * staff + night })
  }
  function countHelp (planId) {
    var n = { ok: 0, ask: 0, no: 0 }
    SCENES.forEach(function (s) { n[HELP[planId][s].st]++ })
    return fz(n)
  }
  // 3けた区切りは自前（正の整数と 0）
  function fmtYen (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) {
      out = ',' + s.slice(s.length - 3) + out
      s = s.slice(0, s.length - 3)
    }
    return s + out + '円'
  }
  function fmtStaff (n) { return 'スタッフ' + n + '名' }
  function fmtNights (n) { return n + '泊分' }
  function srSize (size) { return size === 'large' ? '文字を大きくしました。' : '文字を標準の大きさに戻しました。' }
  function srHelp (planId) {
    var n = countHelp(planId)
    return '早見表を' + planOf(planId).name + 'に切り替えました。手伝える' + n.ok + '、相談のうえ' + n.ask + '、できない' + n.no + 'です。'
  }
  function srPrice (planId, staff, nightOn) {
    var p = planOf(planId)
    var e = estimate(planId, staff, nightOn)
    var head = '料金の目安は' + fmtYen(e.total) + 'です。'
    if (p.nights === 0) return head + '日帰り、付き添いスタッフ' + staff + '名。'
    return head + p.name + '、付き添いスタッフ' + staff + '名、夜間の見守り' + (e.nightOn ? 'あり' : 'なし') + '。'
  }

  // 検査用の出口（凍結した定数と純粋な関数だけ）
  root.__demo33 = fz({
    PLANS: PLANS, STAFF: STAFF, NIGHT_FEE: NIGHT_FEE, SCENES: SCENES, SCENE_NAMES: SCENE_NAMES, HELP: HELP,
    estimate: estimate, countHelp: countHelp, fmtYen: fmtYen, fmtStaff: fmtStaff, fmtNights: fmtNights,
    srSize: srSize, srHelp: srHelp, srPrice: srPrice
  })
  if (typeof document === 'undefined') return

  // ---------- 画面 ----------
  var SVGNS = 'http://www.w3.org/2000/svg'
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function add (parent, kids) {
    kids.forEach(function (k) {
      if (k === null || k === undefined) return
      parent.appendChild(typeof k === 'string' ? document.createTextNode(k) : k)
    })
    return parent
  }
  function nw (text) { return el('span', 'nw', text) }
  // 文の中の決めた語だけを span.nw に分けて入れる（語の途中で折らない。createElement と文字のノードだけで組む）
  var NW_WORDS = fz(['うかがいます', '乗り降りで'])
  function nwText (parent, text) {
    var rest = text
    var parts = []
    while (rest) {
      var at = -1
      var word = ''
      NW_WORDS.forEach(function (w) {
        var i = rest.indexOf(w)
        if (i >= 0 && (at < 0 || i < at)) { at = i; word = w }
      })
      if (at < 0) { parts.push(rest); break }
      if (at > 0) parts.push(rest.slice(0, at))
      parts.push(nw(word))
      rest = rest.slice(at + word.length)
    }
    return add(parent, parts)
  }
  function icon (id, size) {
    var s = document.createElementNS(SVGNS, 'svg')
    s.setAttribute('width', String(size))
    s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true')
    s.setAttribute('focusable', 'false')
    var u = document.createElementNS(SVGNS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態（画面の中だけ。保存しない） ----------
  var state = { size: 'standard', help: 'n1', plan: 'n1', staff: 1, night: false }

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
  function goTo (id, block) {
    var target = $(id)
    if (!target) return
    var h = target.matches('[tabindex="-1"]') ? target : (target.querySelector('[tabindex="-1"]') || target)
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: block || 'start' })
    h.focus({ preventScroll: true })
  }

  function setPressed (btns, isOn) {
    btns.forEach(function (b) { b.setAttribute('aria-pressed', isOn(b) ? 'true' : 'false') })
  }
  function all (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)) }

  // ---------- 文字の大きさ ----------
  function renderSize () {
    document.documentElement.setAttribute('data-size', state.size)
    $('size-std').setAttribute('aria-pressed', state.size === 'standard' ? 'true' : 'false')
    $('size-lg').setAttribute('aria-pressed', state.size === 'large' ? 'true' : 'false')
  }
  function onSize (size) {
    if (state.size === size) return
    state.size = size
    renderSize()
    say(srSize(size))
  }

  // ---------- 早見表 ----------
  function chip (st) {
    return add(el('span', 'chip chip--' + st + ' nw'), [icon('i-' + st, 20), el('span', null, ST_NAMES[st])])
  }
  function renderHelp () {
    var id = state.help
    setPressed(all('.help__tab'), function (b) { return b.getAttribute('data-plan') === id })
    $('help-plan').textContent = PLAN_LINES[id]
    // 「相談のうえ 3」のように、区分の名と数の間で折らない（字は「1泊2日：手伝える 3・相談のうえ 3・できない 1」の形）
    var n = countHelp(id)
    $('help-sum').replaceChildren(planOf(id).name + '：', nw('手伝える ' + n.ok), '・', nw('相談のうえ ' + n.ask), '・', nw('できない ' + n.no))
    var rows = SCENES.map(function (s) {
      var cell = HELP[id][s]
      var li = el('li', 'help__row help__row--' + cell.st)
      li.setAttribute('data-scene', s)
      return add(li, [
        el('h3', 'help__scene', SCENE_NAMES[s]),
        add(el('p', 'help__chip'), [chip(cell.st)]),
        nwText(el('p', 'help__text'), cell.text)
      ])
    })
    $('help-list').replaceChildren.apply($('help-list'), rows)
  }
  function onHelp (id) {
    if (state.help === id) return
    state.help = id
    renderHelp()
    say(srHelp(id))
  }

  // ---------- 料金の目安 ----------
  function yenBig (n) {
    var s = fmtYen(n)
    return [s.slice(0, s.length - 1), el('span', 'est__yen', '円')]
  }
  function renderPrice () {
    var p = planOf(state.plan)
    var e = estimate(state.plan, state.staff, state.night)
    setPressed(all('.est__plan'), function (b) { return b.getAttribute('data-plan') === state.plan })
    setPressed(all('.est__staff'), function (b) { return Number(b.getAttribute('data-staff')) === state.staff })
    setPressed(all('.est__night'), function (b) { return (b.getAttribute('data-night') === 'on') === state.night })
    var day = p.nights === 0
    $('night-opts').hidden = day
    $('night-desc').hidden = day
    $('night-off').hidden = !day

    $('est-total').replaceChildren.apply($('est-total'), yenBig(e.total))
    $('est-trip').textContent = fmtYen(e.trip)
    $('est-staff-dt').replaceChildren('付き添い料（', nw(fmtStaff(e.staff)), '）')
    $('est-staff').textContent = fmtYen(e.staffFee)
    $('est-per').replaceChildren(nw('1名 ' + fmtYen(e.perStaff)), ' ', nw('× ' + e.staff + '名'))
    var night = $('est-night')
    if (day) night.replaceChildren(nw('0円'), '（日帰りのため なし）')
    else if (e.nightOn) night.replaceChildren(nw(fmtYen(e.night)), '（', nw(fmtNights(e.nights)), '）')
    else night.replaceChildren(nw('0円'), '（なし）')
  }
  function onPrice (key, value) {
    if (state[key] === value) return
    state[key] = value
    renderPrice()
    say(srPrice(state.plan, state.staff, state.night))
  }

  // ---------- 相談のボタン（デモの案内を出す） ----------
  function onApply () {
    var n = $('notice')
    n.hidden = false
    n.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    $('notice-title').focus({ preventScroll: true })
  }

  // ---------- スマホの固定ボタン ----------
  function initFixbar () {
    var bar = $('fixbar')
    if (!('IntersectionObserver' in root)) { bar.classList.remove('is-hide'); return }
    // ファーストビューのボタンは「見えている」か「まだ下にある（スクロールで通り過ぎていない）」間は隠す
    // （見る範囲を下へ大きく広げて、画面より下にある間も「重なっている」と数える）
    // 料金の下と相談のブロックのボタンは、見えている間だけ隠す（同じボタンを2つ並べない）
    var seen = { hero: true, price: false, apply: false }
    function update () { bar.classList.toggle('is-hide', seen.hero || seen.price || seen.apply) }
    var ioHero = new IntersectionObserver(function (es) {
      es.forEach(function (en) { seen.hero = en.isIntersecting })
      update()
    }, { rootMargin: '0px 0px 100000px 0px' })
    var ioCta = new IntersectionObserver(function (es) {
      es.forEach(function (en) { seen[en.target.id === 'price-cta' ? 'price' : 'apply'] = en.isIntersecting })
      update()
    })
    ioHero.observe($('hero-cta'))
    ioCta.observe($('price-cta'))
    ioCta.observe($('apply-cta'))
  }

  function init () {
    $('size-std').addEventListener('click', function () { onSize('standard') })
    $('size-lg').addEventListener('click', function () { onSize('large') })
    all('.help__tab').forEach(function (b) {
      b.addEventListener('click', function () { onHelp(b.getAttribute('data-plan')) })
    })
    all('.est__plan').forEach(function (b) {
      b.addEventListener('click', function () { onPrice('plan', b.getAttribute('data-plan')) })
    })
    all('.est__staff').forEach(function (b) {
      b.addEventListener('click', function () { onPrice('staff', Number(b.getAttribute('data-staff'))) })
    })
    all('.est__night').forEach(function (b) {
      b.addEventListener('click', function () { onPrice('night', b.getAttribute('data-night') === 'on') })
    })
    all('.btn-main').forEach(function (b) { b.addEventListener('click', onApply) })
    document.querySelector('.hd__logo').addEventListener('click', function (e) { e.preventDefault(); goTo('top') })
    $('to-help').addEventListener('click', function (e) { e.preventDefault(); goTo('help') })
    renderSize()
    renderHelp()
    renderPrice()
    initFixbar()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
