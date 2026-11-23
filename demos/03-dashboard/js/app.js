// カフェ ユメツム（デモ）売上ダッシュボード
// 外部通信なし。数字はすべて架空で、シード固定の疑似乱数から毎回同じ値を作る
(function () {
  'use strict'

  var SEED = 20260901
  var YEAR = 2026
  var MONTHS = [9, 10, 11]
  var LAST_DAY = { 9: 30, 10: 31, 11: 19 } // 11月は19日までの途中経過
  var DAYS_IN_MONTH = { 9: 30, 10: 31, 11: 30 }
  var TARGET_TOTAL = { 9: 1660000, 10: 1710000, 11: 1040000 } // 売上管理シートの作品例と同じ規模
  var GOAL = 1800000 // 月目標（仮定）
  var CLOSED_DOW = 2 // 火曜定休
  var WEEK = ['日', '月', '火', '水', '木', '金', '土']
  var WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // 月→日
  var DOW_WEIGHT = { 0: 1.25, 1: 1.0, 3: 1.0, 4: 1.0, 5: 1.1, 6: 1.35 }
  var CATS = [
    { key: 'dine', name: '店内飲食', short: '店内', color: '#4E3426' },
    { key: 'take', name: 'テイクアウト', short: '持帰', color: '#C08A4A' },
    { key: 'retail', name: '物販', short: '物販', sub: '焼き菓子・豆', color: '#A9C4CF' }
  ]
  var COST_ITEMS = [
    { key: 'purchase', name: '仕入' },
    { key: 'labor', name: '人件費' },
    { key: 'rent', name: '家賃' },
    { key: 'utility', name: '水道光熱' },
    { key: 'other', name: 'その他' }
  ]

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 疑似乱数（mulberry32） ----------
  function mulberry32 (a) {
    return function () {
      a |= 0
      a = (a + 0x6D2B79F5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function round100 (v) { return Math.round(v / 100) * 100 }
  function dowOf (m, d) { return new Date(Date.UTC(YEAR, m - 1, d)).getUTCDay() }

  // ---------- データを作る ----------
  function buildData () {
    var rnd = mulberry32(SEED)
    var data = {}
    MONTHS.forEach(function (m) {
      var days = []
      var raw = 0
      for (var d = 1; d <= LAST_DAY[m]; d++) {
        var dow = dowOf(m, d)
        if (dow === CLOSED_DOW) {
          days.push({ m: m, d: d, dow: dow, closed: true, sales: 0, cust: 0, dine: 0, take: 0, retail: 0 })
          continue
        }
        var w = DOW_WEIGHT[dow] * (1 + (rnd() * 2 - 1) * 0.12)
        var rd = 0.60 + (rnd() * 2 - 1) * 0.05
        var rt = 0.27 + (rnd() * 2 - 1) * 0.05
        var unit = 850 + rnd() * 130
        raw += w
        days.push({ m: m, d: d, dow: dow, closed: false, w: w, rd: rd, rt: rt, unit: unit })
      }
      // 月合計を目安に合わせて同じ倍率で補正し、100円単位に丸める
      var k = TARGET_TOTAL[m] / raw
      days.forEach(function (x) {
        if (x.closed) return
        x.sales = round100(x.w * k)
        x.dine = round100(x.sales * x.rd)
        x.take = round100(x.sales * x.rt)
        x.retail = x.sales - x.dine - x.take
        x.cust = Math.round(x.sales / x.unit)
      })
      var sum = function (key) { return days.reduce(function (s, x) { return s + x[key] }, 0) }
      var sales = sum('sales')
      // 経費（月額。11月は19日までの日割り）
      var part = LAST_DAY[m] / DAYS_IN_MONTH[m]
      var cost = {
        purchase: round100(sales * (0.31 + rnd() * 0.02)),
        labor: round100((440000 + rnd() * 20000) * part),
        rent: round100(180000 * part),
        utility: round100((47000 + rnd() * 6000) * part),
        other: round100((27000 + rnd() * 6000) * part)
      }
      cost.total = COST_ITEMS.reduce(function (s, c) { return s + cost[c.key] }, 0)
      var openDays = 0
      for (var i = 1; i <= DAYS_IN_MONTH[m]; i++) if (dowOf(m, i) !== CLOSED_DOW) openDays++
      data[m] = {
        m: m, days: days, sales: sales, cust: sum('cust'),
        dine: sum('dine'), take: sum('take'), retail: sum('retail'),
        cost: cost, openDaysMonth: openDays,
        openDaysSoFar: days.filter(function (x) { return !x.closed }).length
      }
    })
    return data
  }

  var DATA = buildData()

  // ---------- 表記 ----------
  function yen (v) { return Math.round(v).toLocaleString('ja-JP') }
  function man (v) { return (v / 10000).toFixed(1) }
  function esc (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function dayLabel (x) { return x.m + '/' + x.d + '（' + WEEK[x.dow] + '）' }
  function sumRange (m, toDay) {
    return DATA[m].days.reduce(function (s, x) { return x.d <= toDay ? s + x.sales : s }, 0)
  }
  function signPct (p) {
    if (Math.abs(p) < 0.5) return { text: '±0%前後', cls: 'even' }
    return p > 0 ? { text: '▲ +' + p.toFixed(1) + '%', cls: 'good' } : { text: '▼ ' + p.toFixed(1) + '%', cls: 'bad' }
  }

  var state = { m: 11, firstDraw: true }

  // ---------- 指標カード ----------
  function renderKpis () {
    var m = state.m
    var cur = DATA[m]
    var prev = DATA[m - 1]
    var rate = cur.sales / GOAL * 100
    var html = ''

    // 1 今月の売上
    var pace = ''
    var progress = ''
    var fill = Math.min(100, rate)
    if (m === 11) {
      var forecast = cur.sales / cur.openDaysSoFar * cur.openDaysMonth
      var pacePos = cur.openDaysSoFar / cur.openDaysMonth * 100
      var ok = forecast >= GOAL
      progress = '<div class="progress progress--pace">' +
        '<div class="progress__track" role="progressbar" aria-label="目標に対する達成率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(fill) + '"><div class="progress__fill" style="width:' + fill.toFixed(1) + '%"></div></div>' +
        '<span class="progress__pace" style="left:' + pacePos.toFixed(1) + '%" aria-hidden="true"></span>' +
        '<span class="progress__pace-label" style="left:' + pacePos.toFixed(1) + '%" aria-hidden="true">目標ペース</span></div>'
      pace = '<p class="kpi__note"><span class="' + (ok ? 'good' : 'bad') + '">' + (ok ? '▲ 目標ペース以上' : '▼ 目標ペースより遅れ') + '</span><br>このままなら月末 約' + Math.round(forecast / 10000) + '万円</p>'
    } else {
      progress = '<div class="progress"><div class="progress__track" role="progressbar" aria-label="目標に対する達成率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(fill) + '"><div class="progress__fill" style="width:' + fill.toFixed(1) + '%"></div></div></div>'
      pace = cur.sales >= GOAL
        ? '<p class="kpi__note"><span class="good">✓ 目標を達成</span></p>'
        : '<p class="kpi__note">目標まであと ' + man(GOAL - cur.sales) + '万円</p>'
    }
    html += card('今月の売上', cur.sales, '円',
      progress + '<p class="kpi__note kpi__note--sub">目標 ' + (GOAL / 10000) + '万円・達成率 ' + Math.round(rate) + '%</p>' + pace)

    // 2 前月同期比 / 前月比
    if (!prev) {
      html += cardText('前月同期比', '—', 'even', '<p class="kpi__note kpi__note--sub">8月はデモの期間外です</p>')
    } else if (m === 11) {
      var base = sumRange(10, LAST_DAY[11])
      var p = (cur.sales / base - 1) * 100
      var s = signPct(p)
      html += cardText('前月同期比', s.text, s.cls, '<p class="kpi__note kpi__note--sub">10月1〜' + LAST_DAY[11] + '日：' + man(base) + '万円</p>')
    } else {
      var p2 = (cur.sales / prev.sales - 1) * 100
      var s2 = signPct(p2)
      html += cardText('前月比', s2.text, s2.cls, '<p class="kpi__note kpi__note--sub">' + (m - 1) + '月：' + man(prev.sales) + '万円</p>')
    }

    // 3 客単価
    var unit = Math.round(cur.sales / cur.cust)
    var note3 = '<p class="kpi__note kpi__note--sub">客数 ' + yen(cur.cust) + '人</p>'
    if (prev) {
      var diff = unit - Math.round(prev.sales / prev.cust)
      var dcls = diff > 0 ? 'good' : diff < 0 ? 'bad' : 'even'
      var dtxt = diff > 0 ? '▲ +' + diff : diff < 0 ? '▼ ' + diff : '±0'
      note3 += '<p class="kpi__note">前月 <span class="' + dcls + '">' + dtxt + '円</span></p>'
    }
    html += card('客単価', unit, '円', note3)

    // 4 利益
    var profit = cur.sales - cur.cost.total
    html += card('利益（売上−経費）', profit, '円',
      '<p class="kpi__note kpi__note--sub">経費 ' + man(cur.cost.total) + '万円・利益率 ' + Math.round(profit / cur.sales * 100) + '%</p>')

    document.getElementById('kpis').innerHTML = html
    fitKpiValues()
  }
  function card (title, value, unit, notes) {
    return '<article class="kpi"><h2 class="kpi__title">' + esc(title) + '</h2>' +
      '<p class="kpi__value" data-yen="' + value + '">' + esc(yen(value) + unit) + '</p>' + notes + '</article>'
  }
  function cardText (title, text, cls, notes) {
    return '<article class="kpi"><h2 class="kpi__title">' + esc(title) + '</h2>' +
      '<p class="kpi__value ' + cls + '">' + esc(text) + '</p>' + notes + '</article>'
  }
  // 金額が1行に入らない時（幅 360px 未満など）は「104.0万円」表記に切り替える
  function fitKpiValues () {
    var narrow = window.innerWidth < 360
    Array.prototype.forEach.call(document.querySelectorAll('.kpi__value[data-yen]'), function (el) {
      var v = Number(el.getAttribute('data-yen'))
      el.textContent = yen(v) + '円'
      if (narrow || el.scrollWidth > el.clientWidth + 1) {
        el.textContent = (v >= 10000 ? man(v) + '万円' : yen(v) + '円')
        el.setAttribute('aria-label', yen(v) + '円')
      } else {
        el.removeAttribute('aria-label')
      }
    })
  }

  // ---------- SVG の部品 ----------
  function niceMax (v, step) { return Math.ceil(v * 1.15 / step) * step }
  var measureCtx = null
  // 太字の文字幅を実測する（使えない時は概算）
  function textWB (s, size) {
    try {
      if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
      measureCtx.font = '700 ' + size + 'px ' + getComputedStyle(document.body).fontFamily
      return Math.ceil(measureCtx.measureText(s).width) + 1
    } catch (e) { return textW(s, size) * 1.05 }
  }
  function textW (s, size) {
    var w = 0
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) < 256 ? size * 0.6 : size
    return w
  }
  function topRoundBar (x, y, w, h, r, cls, extra, title) {
    if (h <= 0) return ''
    r = Math.min(r, w / 2, h)
    var d = 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'
    return '<path class="' + cls + '" d="' + d + '"' + (extra || '') + '>' + (title ? '<title>' + esc(title) + '</title>' : '') + '</path>'
  }
  function n (v) { return Math.round(v * 10) / 10 }
  function isPC () { return window.matchMedia('(min-width: 768px)').matches }

  // ---------- 日別の棒グラフ ----------
  function renderDaily () {
    var m = state.m
    var cur = DATA[m]
    var box = document.getElementById('daily-svg')
    var W = Math.max(280, Math.floor(box.clientWidth))
    var pc = isPC()
    var H = pc ? 280 : 220
    var P = { t: 24, r: 8, b: 32, l: 40 }
    var pw = W - P.l - P.r
    var ph = H - P.t - P.b
    var days = cur.days
    var open = days.filter(function (x) { return !x.closed })
    var maxDay = open.reduce(function (a, x) { return x.sales > a.sales ? x : a })
    var minDay = open.reduce(function (a, x) { return x.sales < a.sales ? x : a })
    var goalDay = GOAL / cur.openDaysMonth
    var yMax = niceMax(Math.max(maxDay.sales, goalDay), 10000)
    var slot = pw / days.length
    var bw = slot * 0.6
    var y = function (v) { return P.t + ph - v / yMax * ph }
    var base = P.t + ph

    document.getElementById('daily-aside').textContent = '目標の日割り：' + man(goalDay) + '万円／営業日'

    var label = m + '月の日別売上。合計' + man(cur.sales) + '万円。最高は' + m + '月' + maxDay.d + '日（' + WEEK[maxDay.dow] + '）' + man(maxDay.sales) +
      '万円、最低は' + m + '月' + minDay.d + '日（' + WEEK[minDay.dow] + '）' + man(minDay.sales) + '万円。目標の日割りは' + man(goalDay) + '万円。火曜は定休日。'
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(label) + '"' + (state.firstDraw && !reduceMotion ? ' class="anim"' : '') + '>'
    // 目盛り
    for (var i = 1; i <= 4; i++) {
      var gv = yMax / 4 * i
      var gy = n(y(gv))
      s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + gy + '" y2="' + gy + '" stroke="#EDE3D6" stroke-width="1"/>'
      s += '<text class="axis" x="' + (P.l - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(+(gv / 10000).toFixed(1) + '万') + '</text>'
    }
    // 棒
    days.forEach(function (x, idx) {
      var cx = P.l + slot * idx + slot / 2
      if (x.closed) {
        s += '<text class="axis" x="' + n(cx) + '" y="' + (base - 4) + '" text-anchor="middle">休</text>'
      } else {
        s += topRoundBar(n(cx - bw / 2), n(y(x.sales)), n(bw), n(base - y(x.sales)), 2, 'bar grow', ' data-i="' + idx + '"', dayLabel(x) + ' ' + yen(x.sales) + '円')
      }
      if ([1, 5, 10, 15, 20, 25, 30].indexOf(x.d) >= 0) {
        s += '<text class="axis" x="' + n(cx) + '" y="' + (base + 18) + '" text-anchor="middle">' + esc(pc ? m + '/' + x.d : String(x.d)) + '</text>'
      }
    })
    s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + base + '" y2="' + base + '" stroke="#6E625A" stroke-width="1"/>'
    // 目標の日割り線
    var gyl = n(y(goalDay))
    s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + gyl + '" y2="' + gyl + '" stroke="#2F6B45" stroke-width="2" stroke-dasharray="6 4"/>'
    var gt = '目標 ' + man(goalDay) + '万'
    var gtw = textW(gt, 12) + 8
    s += '<rect x="' + n(W - P.r - gtw) + '" y="' + (gyl - 20) + '" width="' + n(gtw) + '" height="17" fill="#FFFFFF" rx="2"/>'
    s += '<text class="goal-label" x="' + (W - P.r - 4) + '" y="' + (gyl - 7) + '" text-anchor="end">' + esc(gt) + '</text>'
    // 最高・最低のラベル（棒の上）
    var placed = []
    ;[[maxDay, '最高'], [minDay, '最低']].forEach(function (pair) {
      var x = pair[0]
      var idx = days.indexOf(x)
      var cx = P.l + slot * idx + slot / 2
      var t = pair[1] + ' ' + man(x.sales) + '万'
      var tw = textWB(t, 13)
      var tx = Math.min(Math.max(cx, P.l + tw / 2), W - P.r - tw / 2)
      var hiV = 0
      days.forEach(function (o, j) {
        var ox = P.l + slot * j + slot / 2
        if (Math.abs(ox - tx) <= tw / 2 + bw / 2 + 2) hiV = Math.max(hiV, o.sales)
      })
      var ty = y(hiV) - 6
      // 先に置いたラベルと重なる間は 18px ずつ上へ
      var hit = function () {
        return placed.some(function (q) { return tx - tw / 2 - 2 < q.r && tx + tw / 2 + 2 > q.l && ty - 13 < q.b && ty + 4 > q.t })
      }
      while (hit()) ty -= 18
      placed.push({ l: tx - tw / 2 - 2, r: tx + tw / 2 + 2, t: ty - 13, b: ty + 4 })
      s += '<rect x="' + n(tx - tw / 2 - 2) + '" y="' + n(ty - 13) + '" width="' + n(tw + 4) + '" height="17" fill="#FFFFFF" fill-opacity="0.85" rx="2"/>'
      s += '<text class="vlabel" x="' + n(tx) + '" y="' + n(ty) + '" text-anchor="middle">' + esc(t) + '</text>'
    })
    s += '</svg>'
    box.innerHTML = s

    // 操作用の透明ボタン（キーボード・タップ・hover で吹き出し）
    var hits = document.getElementById('daily-hits')
    var tip = document.getElementById('daily-tip')
    tip.hidden = true
    var hh = ''
    days.forEach(function (x, idx) {
      if (x.closed) return
      hh += '<button type="button" class="hit" data-i="' + idx + '" style="left:' + n(P.l + slot * idx) + 'px;width:' + n(slot) + 'px;top:' + P.t + 'px;height:' + ph + 'px" aria-label="' +
        esc(dayLabel(x) + ' ' + yen(x.sales) + '円・客 ' + x.cust + '人') + '"></button>'
    })
    hits.innerHTML = hh
    var show = function (ev) {
      var idx = Number(ev.currentTarget.getAttribute('data-i'))
      var x = days[idx]
      Array.prototype.forEach.call(box.querySelectorAll('.bar'), function (b) { b.classList.toggle('is-on', Number(b.getAttribute('data-i')) === idx) })
      tip.textContent = dayLabel(x) + ' ' + yen(x.sales) + '円・客 ' + x.cust + '人'
      tip.hidden = false
      var cx = P.l + slot * idx + slot / 2
      var half = tip.offsetWidth / 2
      var left = Math.min(Math.max(cx, half), W - half)
      tip.style.left = left + 'px'
      tip.style.top = Math.max(y(x.sales) - 8, tip.offsetHeight) + 'px'
    }
    var hide = function () {
      tip.hidden = true
      Array.prototype.forEach.call(box.querySelectorAll('.bar.is-on'), function (b) { b.classList.remove('is-on') })
    }
    Array.prototype.forEach.call(hits.querySelectorAll('.hit'), function (b) {
      b.addEventListener('mouseenter', show)
      b.addEventListener('focus', show)
      b.addEventListener('click', show)
      b.addEventListener('mouseleave', function () { if (document.activeElement !== b) hide() })
      b.addEventListener('blur', hide)
    })
  }

  // ---------- 区分の内訳 ----------
  function renderCats () {
    var m = state.m
    var cur = DATA[m]
    var prev = DATA[m - 1]
    var html = ''
    CATS.forEach(function (c) {
      var v = cur[c.key]
      var share = v / cur.sales
      html += '<li class="cat"><span class="cat__name">' + esc(c.name) + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</span>' +
        '<span class="cat__track"><span class="cat__bar" style="background:' + c.color + ';width:calc((100% - 120px) * ' + share.toFixed(4) + ')" aria-hidden="true"></span>' +
        '<span class="cat__val">' + esc(man(v) + '万円（' + Math.round(share * 100) + '%）') + '</span></span></li>'
    })
    document.getElementById('cats').innerHTML = html
    var comment
    if (!prev) {
      comment = '9月は比べる前月がありません。'
    } else {
      var best = null
      CATS.forEach(function (c) {
        var a = cur[c.key] / cur.sales * 100
        var b = prev[c.key] / prev.sales * 100
        if (!best || Math.abs(a - b) > Math.abs(best.a - best.b)) best = { c: c, a: a, b: b }
      })
      comment = '前月から比率がいちばん動いたのは' + best.c.name + '：売上の ' + Math.round(best.a) + '%（前月 ' + Math.round(best.b) + '%）'
    }
    document.getElementById('cat-comment').textContent = comment
  }

  // ---------- 月別の売上と経費 ----------
  function renderMonthly () {
    var box = document.getElementById('month-svg')
    var W = Math.max(260, Math.floor(box.clientWidth))
    var pc = isPC()
    var H = pc ? 260 : 240
    var P = { t: 32, r: 8, b: 56, l: 48 }
    var pw = W - P.l - P.r
    var ph = H - P.t - P.b
    var maxV = Math.max.apply(null, MONTHS.map(function (m) { return Math.max(DATA[m].sales, DATA[m].cost.total) }))
    var yMax = Math.max(niceMax(maxV, 500000), Math.ceil(GOAL * 1.05 / 500000) * 500000)
    var y = function (v) { return P.t + ph - v / yMax * ph }
    var base = P.t + ph
    // 数値ラベルが隣の棒・枠・グラフの右端にかからない配置を探す（13px→12px→整数の万円の順に試す）
    var lay = null
    var fmts = [[13, 1], [12, 1], [12, 0]]
    for (var f = 0; f < fmts.length && !lay; f++) {
      var fs = fmts[f][0]
      var dg = fmts[f][1]
      var fmt = function (v) { return (v / 10000).toFixed(dg) + '万' }
      var lws = Math.max.apply(null, MONTHS.map(function (m) { return textWB(fmt(DATA[m].sales), fs) }))
      var lwe = Math.max.apply(null, MONTHS.map(function (m) { return textWB(fmt(DATA[m].cost.total), fs) }))
      for (var b = Math.min(64, (pw - 12) / 10.5); b >= 12 && !lay; b -= 0.5) {
        var m0 = Math.max(0.75 * b, (lws - b) / 2 + 4)
        // 月と月の間：経費ラベルが次の月の売上の棒にも、売上ラベルにもかからない幅
        var g = Math.max(1.5 * b, lwe + 10 - b, lwe + lws / 2 - 1.5 * b + 6)
        var tail = Math.max(6, lwe + 8 - b) // 最後の経費ラベル＋枠の分
        var total = m0 + 3 * (2 * b + 4) + 2 * g + tail
        if (total <= pw) {
          var extra = pw - total
          lay = { bw: b, m0: m0 + extra / 4, g: g + extra / 4, fs: fs, fmt: fmt }
        }
      }
    }
    if (!lay) lay = { bw: (pw - 12) / 10.5, m0: 0.75 * (pw - 12) / 10.5, g: 1.5 * (pw - 12) / 10.5, fs: 12, fmt: function (v) { return Math.round(v / 10000) + '万' } }
    var bw = lay.bw
    var labelParts = []
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="__LABEL__"' + (state.firstDraw && !reduceMotion ? ' class="anim"' : '') + '>'
    s += '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#D9BE98"/><line x1="0" y1="0" x2="0" y2="6" stroke="#B89A72" stroke-width="1.5"/></pattern></defs>'
    for (var i = 1; i <= 4; i++) {
      var gv = yMax / 4 * i
      var gy = n(y(gv))
      s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + gy + '" y2="' + gy + '" stroke="#EDE3D6" stroke-width="1"/>'
      s += '<text class="axis" x="' + (P.l - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(Math.round(gv / 10000) + '万') + '</text>'
    }
    // 目標線は棒・数値ラベルより先に描き、ラベルの白い下敷きで線が文字にかからないようにする
    var gy2 = n(y(GOAL))
    s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + gy2 + '" y2="' + gy2 + '" stroke="#2F6B45" stroke-width="2" stroke-dasharray="6 4"/>'
    MONTHS.forEach(function (m, k) {
      var d = DATA[m]
      var gx = P.l + lay.m0 + k * (2 * bw + 4 + lay.g)
      var sx = gx
      var ex = gx + bw + 4
      var cx = gx + bw + 2
      var st = lay.fmt(d.sales)
      var et = lay.fmt(d.cost.total)
      var etw = textWB(et, lay.fs)
      if (m === state.m) {
        // 枠の上辺は経費ラベルより上、右辺は経費ラベルの右端より外に置く
        var top = Math.min(y(d.sales) - 4, y(d.cost.total) - 10 - lay.fs - 4)
        var right = Math.min(W - P.r + 2, Math.max(ex + bw + 4, ex + etw + 4))
        s += '<rect x="' + n(gx - 4) + '" y="' + n(top) + '" width="' + n(right - (gx - 4)) + '" height="' + n(base - top + 4) + '" rx="4" fill="none" stroke="#3B2F28" stroke-width="2"/>'
      }
      s += topRoundBar(n(sx), n(y(d.sales)), n(bw), n(base - y(d.sales)), 2, 'grow', ' fill="#4E3426"', m + '月 売上 ' + yen(d.sales) + '円')
      s += topRoundBar(n(ex), n(y(d.cost.total)), n(bw), n(base - y(d.cost.total)), 2, 'grow', ' fill="url(#hatch)"', m + '月 経費 ' + yen(d.cost.total) + '円')
      // 数値ラベル（棒の外。経費は棒の左端から右へ書いて、売上の棒に重ねない）
      var stw = textWB(st, lay.fs)
      var sty = (m === state.m ? Math.min(y(d.sales) - 4, y(d.cost.total) - 10 - lay.fs - 4) : y(d.sales)) - 10
      var fsAttr = ' style="font-size:' + lay.fs + 'px"'
      s += '<rect x="' + n(sx + bw / 2 - stw / 2 - 2) + '" y="' + n(sty - lay.fs) + '" width="' + n(stw + 4) + '" height="' + (lay.fs + 4) + '" fill="#FFFFFF" fill-opacity="0.9" rx="2"/>'
      s += '<text class="vlabel"' + fsAttr + ' x="' + n(sx + bw / 2) + '" y="' + n(sty) + '" text-anchor="middle">' + esc(st) + '</text>'
      s += '<text class="vlabel"' + fsAttr + ' x="' + n(ex) + '" y="' + n(y(d.cost.total) - 10) + '" text-anchor="start">' + esc(et) + '</text>'
      s += '<text class="axis" x="' + n(cx) + '" y="' + (base + 16) + '" text-anchor="middle" style="fill:#3B2F28;font-weight:' + (m === state.m ? 700 : 400) + '">' + m + '月</text>'
      if (m === 11) s += '<text class="axis" x="' + n(cx) + '" y="' + (base + 31) + '" text-anchor="middle">19日まで</text>'
      s += '<text class="axis" x="' + n(cx) + '" y="' + (base + 47) + '" text-anchor="middle" style="fill:#3B2F28">' + esc('利益 ' + man(d.sales - d.cost.total) + '万') + '</text>'
      labelParts.push(m + '月 売上' + man(d.sales) + '万円・経費' + man(d.cost.total) + '万円・利益' + man(d.sales - d.cost.total) + '万円' + (m === 11 ? '（19日まで）' : ''))
    })
    s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + base + '" y2="' + base + '" stroke="#6E625A" stroke-width="1"/>'
    var gt = '目標 ' + (GOAL / 10000) + '万'
    var gw = textW(gt, 12) + 8
    s += '<rect x="' + n(W - P.r - gw) + '" y="' + (gy2 - 20) + '" width="' + n(gw) + '" height="17" fill="#FFFFFF" rx="2"/>'
    s += '<text class="goal-label" x="' + (W - P.r - 4) + '" y="' + (gy2 - 7) + '" text-anchor="end">' + esc(gt) + '</text>'
    s += '</svg>'
    var label = '月別の売上と経費。' + labelParts.join('。') + '。月目標は' + (GOAL / 10000) + '万円。'
    box.innerHTML = s.replace('__LABEL__', esc(label))

    // 経費の内訳（選んだ月）
    var c = DATA[state.m].cost
    var t = '<caption class="visually-hidden">' + esc(state.m + '月の経費の内訳') + '</caption><tbody>'
    COST_ITEMS.forEach(function (it) { t += '<tr><th scope="row">' + esc(it.name) + '</th><td>' + esc(yen(c[it.key]) + '円') + '</td></tr>' })
    t += '<tr class="total"><th scope="row">合計</th><td>' + esc(yen(c.total) + '円') + '</td></tr></tbody>'
    document.getElementById('cost-table').innerHTML = t
  }

  // ---------- 曜日別 ----------
  function renderWeeks () {
    var m = state.m
    var cur = DATA[m]
    var avg = {}
    WEEK_ORDER.forEach(function (w) {
      if (w === CLOSED_DOW) return
      var ds = cur.days.filter(function (x) { return x.dow === w && !x.closed })
      avg[w] = ds.reduce(function (s, x) { return s + x.sales }, 0) / ds.length
    })
    var ranked = Object.keys(avg).map(Number).sort(function (a, b) { return avg[b] - avg[a] })
    var top = ranked[0]
    var second = ranked[1]
    var max = avg[top]
    var html = ''
    WEEK_ORDER.forEach(function (w) {
      if (w === CLOSED_DOW) {
        html += '<li class="week"><span class="week__day">' + WEEK[w] + '</span><span class="week__off">定休日</span></li>'
        return
      }
      var isTop = w === top
      html += '<li class="week' + (isTop ? ' week--top' : '') + '"><span class="week__day">' + WEEK[w] + '</span>' +
        '<span class="week__track"><span class="week__bar" style="width:calc((100% - 120px) * ' + (avg[w] / max).toFixed(4) + ')" aria-hidden="true"></span>' +
        '<span class="week__val">' + esc(man(avg[w]) + '万円') + '</span>' + (isTop ? '<span class="week__badge">1位</span>' : '') + '</span></li>'
    })
    document.getElementById('weeks').innerHTML = html

    var weekdays = [1, 3, 4, 5]
    var wdAvg = weekdays.reduce(function (s, w) { return s + avg[w] }, 0) / weekdays.length
    var text = esc(m + '月は') + '<strong>' + esc(WEEK[top] + '曜日') + '</strong>' + esc('の売上がいちばん多く、平均 ' + man(avg[top]) + '万円。')
    if (top === 0 || top === 6) {
      text += esc('平日（月・水・木・金）の平均の ' + (avg[top] / wdAvg).toFixed(1) + '倍です。')
    } else {
      var weAvg = (avg[0] + avg[6]) / 2
      text += esc('土日の平均より ' + man(avg[top] - weAvg) + '万円多い日です。')
    }
    text += esc('2番目は ' + WEEK[second] + '曜日（' + man(avg[second]) + '万円）。')
    document.getElementById('week-comment').innerHTML = text
  }

  // ---------- 日別の一覧 ----------
  function renderDailyList () {
    var m = state.m
    var cur = DATA[m]
    var open = cur.days.filter(function (x) { return !x.closed })
    var maxDay = open.reduce(function (a, x) { return x.sales > a.sales ? x : a })
    var t = '<table class="dtable"><caption class="visually-hidden">' + esc(m + '月の日別の売上') + '</caption><thead><tr>' +
      '<th scope="col">日付</th><th scope="col">曜日</th><th scope="col">売上（円）</th><th scope="col">客数（人）</th><th scope="col">店内飲食</th><th scope="col">テイクアウト</th><th scope="col">物販</th></tr></thead><tbody>'
    var r = ''
    cur.days.forEach(function (x) {
      var we = x.dow === 0 || x.dow === 6
      if (x.closed) {
        t += '<tr class="off"><td>' + m + '/' + x.d + '</td><td>' + WEEK[x.dow] + '</td><td class="off-label">定休日</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'
        r += '<li class="drow drow--off"><div class="drow__top"><span>' + esc(dayLabel(x)) + '</span><span>定休日</span></div></li>'
        return
      }
      var tag = x === maxDay ? '<span class="tag">最高</span>' : ''
      t += '<tr><td>' + m + '/' + x.d + '</td><td' + (we ? ' class="we"' : '') + '>' + WEEK[x.dow] + '</td><td>' + yen(x.sales) + tag + '</td><td>' + x.cust + '</td><td>' + yen(x.dine) + '</td><td>' + yen(x.take) + '</td><td>' + yen(x.retail) + '</td></tr>'
      r += '<li class="drow"><div class="drow__top"><span>' + esc(dayLabel(x)) + '</span><span>' + yen(x.sales) + '円' + tag + '</span></div>' +
        '<p class="drow__cust">客 ' + x.cust + '人</p><p class="drow__mix">店内 ' + yen(x.dine) + '／持帰 ' + yen(x.take) + '／物販 ' + yen(x.retail) + '</p></li>'
    })
    t += '<tr class="total"><td>合計</td><td></td><td>' + yen(cur.sales) + '</td><td>' + yen(cur.cust) + '</td><td>' + yen(cur.dine) + '</td><td>' + yen(cur.take) + '</td><td>' + yen(cur.retail) + '</td></tr></tbody></table>'
    r += '<li class="drow drow--total"><div class="drow__top"><span>合計</span><span>' + yen(cur.sales) + '円</span></div>' +
      '<p class="drow__cust">客 ' + yen(cur.cust) + '人</p><p class="drow__mix">店内 ' + yen(cur.dine) + '／持帰 ' + yen(cur.take) + '／物販 ' + yen(cur.retail) + '</p></li>'
    document.getElementById('daily-table').innerHTML = t
    document.getElementById('daily-rows').innerHTML = r
    updateSummary()
  }
  function updateSummary () {
    var det = document.getElementById('daily')
    var m = state.m
    document.getElementById('daily-summary-text').textContent = det.open
      ? '日別の一覧を閉じる'
      : '日別の一覧を開く（' + m + '月・' + LAST_DAY[m] + '日分）'
  }

  // ---------- 全体 ----------
  function renderAll () {
    renderKpis()
    renderDaily()
    renderCats()
    renderMonthly()
    renderWeeks()
    renderDailyList()
    state.firstDraw = false
  }

  function selectMonth (m, focus) {
    state.m = m
    Array.prototype.forEach.call(document.querySelectorAll('.month-tab'), function (b) {
      var on = Number(b.getAttribute('data-m')) === m
      b.setAttribute('aria-selected', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
      if (on && focus) b.focus()
    })
    document.getElementById('main').setAttribute('aria-labelledby', 'tab-' + m)
    renderAll()
    document.getElementById('sr-status').textContent = m + '月の数字を表示しています'
  }

  function init () {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.month-tab'))
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { selectMonth(Number(b.getAttribute('data-m')), false) })
      b.addEventListener('keydown', function (e) {
        var j = null
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length
        else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length
        else if (e.key === 'Home') j = 0
        else if (e.key === 'End') j = tabs.length - 1
        if (j === null) return
        e.preventDefault()
        selectMonth(Number(tabs[j].getAttribute('data-m')), true)
      })
    })
    var det = document.getElementById('daily')
    det.addEventListener('toggle', updateSummary)
    document.getElementById('to-daily').addEventListener('click', function (e) {
      e.preventDefault()
      det.open = true
      updateSummary()
      det.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      document.getElementById('daily-summary').focus({ preventScroll: true })
    })

    var lastW = 0
    var timer = null
    window.addEventListener('resize', function () {
      clearTimeout(timer)
      timer = setTimeout(function () {
        if (window.innerWidth === lastW) return
        lastW = window.innerWidth
        renderDaily()
        renderMonthly()
        fitKpiValues()
      }, 150)
    })
    lastW = window.innerWidth
    renderAll()
  }

  // 確認用（検査で月合計を読むため。表示には使わない）
  window.__dashDemo = { totals: function () { var o = {}; MONTHS.forEach(function (m) { o[m] = { sales: DATA[m].sales, cost: DATA[m].cost.total, cust: DATA[m].cust } }); return o } }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
