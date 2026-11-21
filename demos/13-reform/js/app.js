// ハルカゼ住まい工房（デモ）リフォームのかんたん概算
// 表示はすべて textContent / value / setAttribute で入れる（innerHTML・insertAdjacentHTML は使わない）。
// アイコンは HTML の <symbol> を <use> で使う。外部への通信・保存（localStorage など）はしない。
(function () {
  'use strict'

  // ---------- 単価表（design.md §7-5。架空・税込・固定） ----------
  // disp：処分費。dispPer が true なら数を掛ける（／台）、false なら1式（1回）
  // opts の per：true＝数を掛ける（× 台数・枚数・坪）、false＝1式
  var PRICES = {
    kitchen: {
      name: 'キッチン', fixed: true,
      grades: { std: { body: 600000, work: 250000, disp: 30000, days: 4 }, pro: { body: 1100000, work: 300000, disp: 30000, days: 5 } },
      desc: { std: '幅255cmの定番のシステムキッチン', pro: '引き出しの収納・掃除しやすい換気扇・人造大理石の天板' },
      opts: [
        { id: 'k-dish', name: '食器洗い乾燥機を付ける', price: 120000, per: false, days: 0 },
        { id: 'k-floor', name: '床と壁を張り替える', price: 150000, per: false, days: 1 },
        { id: 'k-water', name: '浄水の水栓にする', price: 50000, per: false, days: 0 }
      ]
    },
    bath: {
      name: '浴室', fixed: true,
      grades: { std: { body: 700000, work: 300000, disp: 50000, days: 4 }, pro: { body: 1150000, work: 350000, disp: 50000, days: 5 } },
      desc: { std: '1坪の定番のユニットバス。床が冷えにくい', pro: '保温の浴槽・断熱の壁と天井・乾きやすい床' },
      opts: [
        { id: 'b-heat', name: '浴室暖房乾燥機を付ける', price: 150000, per: false, days: 0 },
        { id: 'b-rail', name: '手すりを付ける（2か所）', price: 30000, per: false, days: 0 },
        { id: 'b-tile', name: 'タイルの浴室から入れ替える', price: 250000, per: false, days: 2 }
      ]
    },
    toilet: {
      name: 'トイレ', label: '台数', unit: '台', unitShow: '台', min: 1, max: 3, init: 1, dispPer: true,
      hint: '1階と2階など、取り替える台数',
      grades: { std: { body: 150000, work: 50000, disp: 10000 }, pro: { body: 300000, work: 70000, disp: 10000 } },
      desc: { std: '節水型の便器と温水洗浄便座', pro: 'タンクのない便器・手洗い器つき' },
      opts: [
        { id: 't-floor', name: '床と壁紙を張り替える', price: 60000, per: true, days: 1 },
        { id: 't-rail', name: '手すりを付ける', price: 30000, per: true, days: 0 }
      ]
    },
    basin: {
      name: '洗面', label: '台数', unit: '台', unitShow: '台', min: 1, max: 3, init: 1, dispPer: true,
      hint: '取り替える洗面台の数',
      grades: { std: { body: 150000, work: 60000, disp: 10000 }, pro: { body: 320000, work: 80000, disp: 10000 } },
      desc: { std: '幅75cmの洗面台', pro: '幅90cm・三面鏡の収納・くもり止めの鏡' },
      opts: [
        { id: 's-floor', name: '床と壁紙を張り替える', price: 50000, per: true, days: 1 },
        { id: 's-shelf', name: '壁付けの収納棚を足す', price: 30000, per: true, days: 0 }
      ]
    },
    window: {
      name: '窓の断熱', label: '窓の枚数', unit: '枚', unitShow: '枚', min: 1, max: 20, init: 4, dispPer: false,
      hint: '内窓を付ける窓の数（大きさは平均で計算）',
      grades: { std: { body: 50000, work: 15000, disp: 0 }, pro: { body: 75000, work: 22000, disp: 0 } },
      desc: { std: '樹脂の内窓・ふつうの複層ガラス', pro: '樹脂の内窓・断熱を高めた複層ガラス（Low-E）' },
      opts: [
        { id: 'w-frame', name: '窓台に木の枠を足す（結露の受け）', short: '窓台に木の枠を足す', price: 10000, per: true, days: 1 },
        { id: 'w-rail', name: 'カーテンレールを付け替える', price: 5000, per: true, days: 0 }
      ]
    },
    wall: {
      name: '外壁', label: '家の広さ', unit: '坪', unitShow: '坪（延べ床面積）', min: 20, max: 60, init: 30, dispPer: false,
      hint: '30坪＝約99㎡。分からなければ 30 のままで',
      grades: { std: { body: 12000, work: 18000, disp: 20000, base: 10 }, pro: { body: 20000, work: 20000, disp: 20000, base: 12 } },
      desc: { std: 'シリコン系の塗料で塗り替え', pro: 'フッ素系の塗料で塗り替え（長持ち）' },
      opts: [
        { id: 'o-seal', name: '目地のシーリングを打ち替える', price: 3000, per: true, days: 1 },
        { id: 'o-roof', name: '屋根もいっしょに塗る', price: 5000, per: true, days: 3 },
        { id: 'o-gutter', name: '雨どいを取り替える', price: 150000, per: false, days: 1 }
      ]
    }
  }
  var GRADE_NAME = { std: '標準', pro: 'こだわり' }
  var MAX_LIST = 6

  // 整数どうしの切り上げ（Math.ceil の代わり。金額・日数を整数のまま扱う）
  function ceilDiv (a, b) { return Math.floor((a + b - 1) / b) }

  // 場所の工期（オプションを除く）
  function placeDays (place, grade, qty) {
    var g = PRICES[place].grades[grade]
    if (place === 'kitchen' || place === 'bath') return g.days
    if (place === 'toilet' || place === 'basin') return qty
    if (place === 'window') return ceilDiv(qty, 8)
    return g.base + ceilDiv(qty, 10)
  }

  // 下限・上限・約（万円）を基準の額 S から出す（§7-6。すべて整数）
  function bounds (s) {
    return {
      low: Math.floor(s * 9 / 100000),
      high: Math.floor((s * 12 + 99999) / 100000),
      about: Math.floor((s + 5000) / 10000)
    }
  }

  // 1件の計算。item = { place, grade, qty, opts: [id...] }
  function estimate (item) {
    var p = PRICES[item.place]
    var g = p.grades[item.grade]
    var q = p.fixed ? 1 : item.qty
    var body = g.body * q
    var work = g.work * q
    var disposal = p.dispPer ? g.disp * q : g.disp
    var option = 0
    var days = placeDays(item.place, item.grade, q)
    p.opts.forEach(function (o) {
      if (item.opts.indexOf(o.id) === -1) return
      option += o.price * (o.per ? q : 1)
      days += o.days
    })
    var s = body + work + disposal + option
    var b = bounds(s)
    return { body: body, work: work, disposal: disposal, option: option, s: s, low: b.low, high: b.high, about: b.about, days: days }
  }

  // リストの合計（合計の S から幅を出し直す。工期は「最長〜和」）
  function total (items) {
    var t = { body: 0, work: 0, disposal: 0, option: 0, s: 0, days: 0, daysMin: 0, daysMax: 0 }
    items.forEach(function (it) {
      var e = estimate(it)
      t.body += e.body; t.work += e.work; t.disposal += e.disposal; t.option += e.option; t.s += e.s
      t.daysMax += e.days
      if (e.days > t.daysMin) t.daysMin = e.days
    })
    var b = bounds(t.s)
    t.low = b.low; t.high = b.high; t.about = b.about; t.days = t.daysMax
    return t
  }

  // ---------- 書き方（§2-3） ----------
  var yenFmt = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
  function yen (n) { return yenFmt.format(n).replace('￥', '¥') }
  function man (n) { return '約' + Math.floor((n + 5000) / 10000).toLocaleString('ja-JP') + '万円' }
  function rangeText (e) { return '約' + e.low.toLocaleString('ja-JP') + '万〜' + e.high.toLocaleString('ja-JP') + '万円' }
  function plus (n, unit) { return '＋' + yen(n) + (unit ? '／' + unit : '') }
  function days (d) { return '約' + d + '日' }
  function daysRange (a, b) { return a === b ? '約' + a + '日' : '約' + a + '〜' + b + '日' }
  function qtyText (item) { var p = PRICES[item.place]; return p.fixed ? '1式' : item.qty + p.unit }
  function itemTitle (item) { return PRICES[item.place].name + '・' + GRADE_NAME[item.grade] + '・' + qtyText(item) }
  function optNames (item) {
    return PRICES[item.place].opts.filter(function (o) { return item.opts.indexOf(o.id) !== -1 }).map(function (o) { return o.short || o.name })
  }

  // ---------- 小さな道具 ----------
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    return e
  }
  function icon (name, size) {
    var NS = 'http://www.w3.org/2000/svg'
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('width', String(size)); s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    var u = document.createElementNS(NS, 'use')
    u.setAttribute('href', '#' + name)
    s.appendChild(u)
    return s
  }
  // 途中で折れると読みにくい語（「Low-E」「2か所」・カタカナ語）を .nw の span に包んで入れる（innerHTML は使わない）
  // 「カーテンレール」は 360px のオプション欄に1行で入らないため、「カーテン」「レール」に分けて語の切れ目だけで折る
  var NW_RE = /（Low-E）|Low-E|[0-9]*か所|カーテン|レール|シーリング|お問い合わせ|システム|キッチン|ユニット|バス/g
  function setText (node, text) {
    node.textContent = ''
    var last = 0
    var m
    NW_RE.lastIndex = 0
    while ((m = NW_RE.exec(text))) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)))
      node.appendChild(el('span', 'nw', m[0]))
      last = m.index + m[0].length
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)))
    return node
  }
  // 目安の幅を「約94万〜」「126万円」の2つの塊にして入れる（360px で「〜」の後だけで折れるように）
  function setRange (node, e) {
    node.textContent = ''
    node.appendChild(el('span', 'nw', '約' + e.low.toLocaleString('ja-JP') + '万〜'))
    node.appendChild(document.createElement('wbr'))
    node.appendChild(el('span', 'nw', e.high.toLocaleString('ja-JP') + '万円'))
  }
  var srTimer = 0
  function say (text, delay) {
    clearTimeout(srTimer)
    var sr = $('sr-status')
    srTimer = setTimeout(function () { sr.textContent = ''; setTimeout(function () { sr.textContent = text }, 30) }, delay || 0)
  }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態 ----------
  var list = []
  var cur = { place: null, grade: 'std', qty: 1, opts: [], qtyRaw: '', touched: false }

  // 数の欄の読み取り（§7-7）。{ ok, value, err }
  function readQty (raw) {
    var p = PRICES[cur.place]
    var v = String(raw).trim().replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
    var range = p.min + '〜' + p.max
    if (v === '') return { ok: false, empty: true, err: p.label + 'を入れてください（' + range + p.unit + '）' }
    if (!/^\d+$/.test(v)) return { ok: false, err: p.label + 'は数字（' + range + ' の整数）で入れてください' }
    var n = parseInt(v, 10)
    if (n < p.min) return { ok: false, err: p.label + 'は ' + range + p.unit + 'の範囲で入れてください' }
    if (n > p.max) return { ok: false, err: p.label + 'は ' + range + p.unit + 'の範囲で入れてください。' + p.max + p.unit + 'を超える場合は、ご相談ください' }
    return { ok: true, value: n }
  }

  // 今の入力から1件分を作る（作れなければ null）
  function currentItem () {
    if (!cur.place) return null
    var p = PRICES[cur.place]
    var qty = 1
    if (!p.fixed) {
      var r = readQty($('sim-qty').value)
      if (!r.ok) return null
      qty = r.value
    }
    return { place: cur.place, grade: cur.grade, qty: qty, opts: cur.opts.slice() }
  }

  // ---------- 場所を選んだ時 ----------
  function setPlace (place) {
    cur.place = place
    cur.opts = []
    var p = PRICES[place]
    ;['step-grade', 'step-qty', 'step-opt'].forEach(function (id) { $(id).disabled = false })
    setText($('grade-std-desc'), p.desc.std)
    setText($('grade-pro-desc'), p.desc.pro)
    // ③ 数
    $('qty-none').hidden = !p.fixed
    $('qty-box').hidden = !!p.fixed
    if (p.fixed) {
      $('qty-legend').textContent = '広さ・数'
      setText($('qty-none'), '1式（1か所）です。数の入力はありません。')
    } else {
      $('qty-legend').textContent = p.label
      $('qty-unit').textContent = p.unitShow
      $('sim-qty-hint').textContent = p.hint
      $('sim-qty').value = String(p.init)
    }
    clearQtyErr()
    // 前の場所の「＋」「−」の押せない状態を残さない（例：トイレ 3台 → 外壁 30坪で「＋」が押せないまま）
    if (!p.fixed) updateQtyButtons(p.init)
    // ④ オプション
    var box = $('opt-list')
    box.textContent = ''
    $('opt-none').hidden = true
    p.opts.forEach(function (o) {
      var lab = el('label', 'opt')
      var cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.value = o.id
      cb.id = 'opt-' + o.id
      cb.setAttribute('autocomplete', 'off')
      cb.addEventListener('change', function () {
        var i = cur.opts.indexOf(o.id)
        if (cb.checked && i === -1) cur.opts.push(o.id)
        if (!cb.checked && i !== -1) cur.opts.splice(i, 1)
        // §7-5 の順にそろえる
        cur.opts = p.opts.map(function (x) { return x.id }).filter(function (id) { return cur.opts.indexOf(id) !== -1 })
        render(true)
      })
      var txt = el('span', 'opt__text')
      txt.appendChild(setText(el('span', 'opt__name'), o.name))
      if (o.days) txt.appendChild(el('span', 'opt__days', '工期 ＋' + o.days + '日'))
      lab.appendChild(cb)
      lab.appendChild(txt)
      lab.appendChild(el('span', 'opt__price', plus(o.price, o.per ? p.unit : '')))
      box.appendChild(lab)
    })
    render(true)
  }

  function clearQtyErr () {
    $('sim-qty').removeAttribute('aria-invalid')
    $('sim-qty-err').hidden = true
    $('sim-qty-err-t').textContent = ''
  }
  function showQtyErr (text) {
    $('sim-qty').setAttribute('aria-invalid', 'true')
    $('sim-qty-err-t').textContent = text
    $('sim-qty-err').hidden = false
  }

  // 数の欄のチェック（mode：'input' は空でもエラーを出さない）
  function checkQty (mode) {
    var p = PRICES[cur.place]
    if (!p || p.fixed) return true
    var r = readQty($('sim-qty').value)
    if (r.ok) { clearQtyErr(); updateQtyButtons(r.value); return true }
    if (r.empty && mode === 'input') clearQtyErr()
    else showQtyErr(r.err)
    updateQtyButtons(null)
    return false
  }
  function updateQtyButtons (n) {
    var p = PRICES[cur.place]
    var minus = $('qty-minus'); var plusB = $('qty-plus')
    minus.removeAttribute('aria-disabled'); plusB.removeAttribute('aria-disabled')
    if (n === null) return
    if (n <= p.min) minus.setAttribute('aria-disabled', 'true')
    if (n >= p.max) plusB.setAttribute('aria-disabled', 'true')
  }
  function step (d) {
    var p = PRICES[cur.place]
    if (!p || p.fixed) return
    var r = readQty($('sim-qty').value)
    var n
    if (!r.ok) n = p.min
    else {
      n = r.value + d
      if (n < p.min || n > p.max) return
    }
    $('sim-qty').value = String(n)
    checkQty('step')
    render(true)
  }

  // ---------- 描き直し ----------
  function fillTable (prefix, e) {
    $(prefix + '-body-yen').textContent = yen(e.body)
    $(prefix + '-work-yen').textContent = yen(e.work)
    $(prefix + '-disp-yen').textContent = yen(e.disposal)
    $(prefix + '-opt-yen').textContent = yen(e.option)
    $(prefix + '-sum-yen').textContent = yen(e.s)
  }

  function render (announce) {
    var item = currentItem()
    var empty = $('res-empty')
    var body = $('res-body')
    if (!item) {
      body.hidden = true
      empty.hidden = false
      empty.textContent = cur.place ? '数を直すと、目安が出ます' : '場所を選ぶと、目安が出ます'
    } else {
      var e = estimate(item)
      empty.hidden = true
      body.hidden = false
      $('res-title').textContent = itemTitle(item)
      var names = optNames(item)
      $('res-opts').hidden = !names.length
      setText($('res-opts'), names.length ? 'オプション：' + names.join('・') : '')
      setRange($('res-range'), e)
      $('res-base').textContent = '基準の額 ' + yen(e.s) + '（' + man(e.s) + '）を中心にした幅'
      fillTable('res', e)
      Array.prototype.forEach.call(document.querySelectorAll('#res-table .breakdown__sub'), function (s) {
        s.textContent = item.place === 'wall' ? s.getAttribute('data-wall') : ''
      })
      $('res-days').textContent = days(e.days)
      if (announce) say('目安 ' + rangeText(e) + '、工期 ' + days(e.days), 600)
    }
    $('add-err').hidden = true
    renderButtons()
    // 結果が出る・消えると結果の列の高さが変わるので、sticky の要否を測り直す
    checkSticky()
  }

  function renderButtons () {
    var item = currentItem()
    var add = $('btn-add')
    if (!item || list.length >= MAX_LIST) add.setAttribute('aria-disabled', 'true')
    else add.removeAttribute('aria-disabled')
    var c = $('btn-consult')
    if (list.length || item) { c.removeAttribute('aria-disabled'); $('consult-msg').hidden = true } else c.setAttribute('aria-disabled', 'true')
    $('add-count').textContent = list.length + ' / ' + MAX_LIST
  }

  function renderList () {
    var ol = $('sim-list')
    ol.textContent = ''
    $('list-n').textContent = list.length + ' / ' + MAX_LIST + '件'
    $('list-empty').hidden = list.length > 0
    list.forEach(function (it, i) {
      var e = estimate(it)
      var li = el('li')
      var t = el('div', 'sim-list__text')
      t.appendChild(el('p', 'sim-list__t', (i + 1) + '. ' + itemTitle(it)))
      var v = el('p', 'sim-list__v')
      v.appendChild(el('span', 'nw', '約' + e.low.toLocaleString('ja-JP') + '万〜'))
      v.appendChild(el('span', 'nw', e.high.toLocaleString('ja-JP') + '万円'))
      v.appendChild(document.createTextNode('・'))
      v.appendChild(el('span', 'nw', days(e.days)))
      t.appendChild(v)
      var names = optNames(it)
      if (names.length) t.appendChild(setText(el('p', 'sim-list__o'), '＋ ' + names.join('・')))
      var del = el('button', 'btn-text sim-list__del', '削除')
      del.type = 'button'
      del.setAttribute('aria-label', (i + 1) + '件目 ' + itemTitle(it) + ' を削除')
      del.addEventListener('click', function () { removeAt(i) })
      li.appendChild(t)
      li.appendChild(del)
      ol.appendChild(li)
    })
    var box = $('sim-total')
    if (!list.length) { box.hidden = true } else {
      var tt = total(list)
      box.hidden = false
      setRange($('tot-range'), tt)
      $('tot-base').textContent = '基準の額 ' + yen(tt.s) + '（' + man(tt.s) + '）'
      fillTable('tot', tt)
      $('tot-days').textContent = daysRange(tt.daysMin, tt.daysMax)
    }
    renderButtons()
    checkSticky()
  }

  var okTimer = 0
  function addToList () {
    var add = $('btn-add')
    $('add-ok').hidden = true
    if (list.length >= MAX_LIST) {
      $('add-err-t').textContent = 'リストに入れられるのは6件までです。どれかを削除してから足してください'
      $('add-err').hidden = false
      say($('add-err-t').textContent)
      return
    }
    if (!cur.place) {
      $('add-err-t').textContent = '場所を選ぶと、リストに足せます'
      $('add-err').hidden = false
      return
    }
    if (!checkQty('add')) {
      $('add-err').hidden = true
      $('sim-qty').focus()
      return
    }
    var item = currentItem()
    if (!item) return
    list.push(item)
    renderList()
    var msg = 'リストに足しました（' + list.length + ' / ' + MAX_LIST + '件）'
    $('add-ok-t').textContent = msg
    $('add-ok').hidden = false
    $('add-err').hidden = true
    clearTimeout(okTimer)
    okTimer = setTimeout(function () { $('add-ok').hidden = true }, 3000)
    say(msg)
    if (add.getAttribute('aria-disabled') === 'true') add.focus()
  }

  function removeAt (i) {
    list.splice(i, 1)
    renderList()
    $('add-err').hidden = true
    var dels = document.querySelectorAll('#sim-list .sim-list__del')
    if (dels.length) (dels[i] || dels[dels.length - 1]).focus()
    else $('h-list').focus()
    say((i + 1) + '件目を削除しました。リストは' + list.length + '件です')
  }

  // 相談の文（§7-10。改行は LF）
  function consultText () {
    var items = list.length ? list : [currentItem()]
    var lines = ['【かんたん概算の内容】']
    items.forEach(function (it, i) {
      var e = estimate(it)
      var names = optNames(it)
      lines.push((i + 1) + '. ' + itemTitle(it) + (names.length ? '（＋ ' + names.join('・') + '）' : '') + '：' + rangeText(e) + '・' + days(e.days))
    })
    if (items.length > 1) {
      var t = total(items)
      lines.push('合計：' + rangeText(t) + '（税込）・工期 ' + daysRange(t.daysMin, t.daysMax))
    }
    lines.push('※ ホームページの概算です。現地調査で変わります。', '', '【ご相談したいこと】', '')
    return lines.join('\n')
  }

  function consult () {
    if (!list.length && !currentItem()) {
      $('consult-msg').hidden = false
      return
    }
    $('consult-msg').hidden = true
    var ta = $('c-body')
    ta.value = consultText()
    ta.removeAttribute('aria-invalid')
    $('c-body-err').hidden = true
    $('c-sent-in').hidden = true
    $('contact').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    ta.focus({ preventScroll: true })
    say('相談内容に概算の内容を入れました')
  }

  // PC の結果の列：画面より高ければ sticky をやめる
  function checkSticky () {
    var side = $('sim-side')
    side.classList.remove('is-static')
    if (side.offsetHeight > window.innerHeight - 48) side.classList.add('is-static')
  }

  // ---------- 施工事例の絞り込み ----------
  function filterWorks (v) {
    var cards = document.querySelectorAll('#works-list .work')
    var n = 0
    Array.prototype.forEach.call(cards, function (c) {
      var show = v === 'all' || c.getAttribute('data-place') === v
      c.hidden = !show
      if (show) n++
    })
    $('works-n').textContent = cards.length + '件中 ' + n + '件を表示'
  }

  // ---------- 問い合わせの見本 ----------
  function submitContact (ev) {
    ev.preventDefault()
    var ta = $('c-body')
    var way = document.querySelector('input[name="c-way"]:checked')
    var okBody = ta.value.trim() !== ''
    if (okBody) ta.removeAttribute('aria-invalid'); else ta.setAttribute('aria-invalid', 'true')
    $('c-body-err').hidden = okBody
    $('c-way-err').hidden = !!way
    if (way) $('c-way').removeAttribute('aria-invalid'); else $('c-way').setAttribute('aria-invalid', 'true')
    if (!okBody || !way) {
      $('c-sent-in').hidden = true
      if (!okBody) ta.focus()
      else document.querySelector('input[name="c-way"]').focus()
      return
    }
    $('c-sent-way').textContent = way.value
    $('c-sent-in').hidden = false
  }

  // ---------- ページ内の移動・メニュー ----------
  var menuBtn, nav
  function closeMenu (focusBtn) {
    if (!nav.classList.contains('is-open')) return
    nav.classList.remove('is-open')
    menuBtn.setAttribute('aria-expanded', 'false')
    if (focusBtn) menuBtn.focus()
  }
  function goTo (hash) {
    var target = document.getElementById(hash.slice(1))
    if (!target) return false
    var h = target.querySelector('[tabindex="-1"]') || target
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
    return true
  }

  // ---------- 始める ----------
  function init () {
    menuBtn = $('hd-menu'); nav = $('hd-nav')
    menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open')
      nav.classList.toggle('is-open', open)
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false')
      if (!open) menuBtn.focus()
    })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true) })

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]')
      if (!a) return
      var hash = a.getAttribute('href')
      if (hash.length < 2) return
      var inMenu = !!a.closest('#hd-nav')
      if (goTo(hash)) {
        e.preventDefault()
        if (history.replaceState) history.replaceState(null, '', hash)
      }
      if (inMenu) closeMenu(false)
    })

    // シミュレーター
    $('sim-form').addEventListener('submit', function (e) { e.preventDefault() })
    Array.prototype.forEach.call(document.querySelectorAll('input[name="place"]'), function (r) {
      r.addEventListener('change', function () { if (r.checked) setPlace(r.value) })
    })
    Array.prototype.forEach.call(document.querySelectorAll('input[name="grade"]'), function (r) {
      r.addEventListener('change', function () { if (r.checked) { cur.grade = r.value; render(true) } })
    })
    var q = $('sim-qty')
    q.addEventListener('input', function () { checkQty('input'); render(true) })
    q.addEventListener('blur', function () { if (cur.place && !PRICES[cur.place].fixed) { checkQty('blur'); renderButtons() } })
    $('qty-minus').addEventListener('click', function () { if (this.getAttribute('aria-disabled') !== 'true') step(-1) })
    $('qty-plus').addEventListener('click', function () { if (this.getAttribute('aria-disabled') !== 'true') step(1) })
    $('btn-add').addEventListener('click', addToList)
    $('btn-consult').addEventListener('click', consult)

    // 施工事例
    var fr = document.querySelectorAll('input[name="wfilter"]')
    Array.prototype.forEach.call(fr, function (r) {
      r.addEventListener('change', function () { if (r.checked) filterWorks(r.value) })
      r.addEventListener('keydown', function (e) {
        if (e.key !== 'Home' && e.key !== 'End') return
        e.preventDefault()
        var t = e.key === 'Home' ? fr[0] : fr[fr.length - 1]
        t.checked = true
        t.focus()
        filterWorks(t.value)
      })
    })

    // 問い合わせの見本
    $('contact-form').addEventListener('submit', submitContact)
    $('c-body').addEventListener('input', function () {
      if (this.value.trim() !== '') { this.removeAttribute('aria-invalid'); $('c-body-err').hidden = true }
    })
    Array.prototype.forEach.call(document.querySelectorAll('input[name="c-way"]'), function (r) {
      r.addEventListener('change', function () { $('c-way-err').hidden = true; $('c-way').removeAttribute('aria-invalid') })
    })

    // スマホの固定バー：ファーストビューの主ボタンが見えている間は隠す
    var bar = $('fixbar')
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { bar.classList.toggle('is-hide', en.isIntersecting) })
      })
      io.observe($('hero-cta'))
    }
    window.addEventListener('resize', checkSticky)

    renderList()
    render(false)
  }

  // 検査用に計算の関数だけ出す（状態は変えられない）
  window.HarukazeSim = { estimate: estimate, total: total, consultText: consultText, PRICES: PRICES }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
