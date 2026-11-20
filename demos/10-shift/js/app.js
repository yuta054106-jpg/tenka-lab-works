// 弁当と惣菜 ツグミヤ（デモ）シフト表づくり
// 表示する値はすべて textContent / setAttribute で入れる（innerHTML に値を入れない。固定の SVG だけ template で作る）
// 自動の下書きは autoDraft(hopes) 1つ。乱数・日時・オブジェクトのキーの順を使わない（design.md §9・§16-2）
(function () {
  'use strict'

  // ---------- 固定の値（design.md §15） ----------
  var SHOP = '弁当と惣菜 ツグミヤ（架空）'
  var STORE_KEY = 'tenkaLab.demo10.shift.v1'
  // 曜日は計算しない（§2-1・§15-1）
  var DAYS = [
    ['2026-12-01', 1, '火', 1], ['2026-12-02', 2, '水', 1], ['2026-12-03', 3, '木', 1], ['2026-12-04', 4, '金', 1],
    ['2026-12-05', 5, '土', 1], ['2026-12-06', 6, '日', 1], ['2026-12-07', 7, '月', 1], ['2026-12-08', 8, '火', 2],
    ['2026-12-09', 9, '水', 2], ['2026-12-10', 10, '木', 2], ['2026-12-11', 11, '金', 2], ['2026-12-12', 12, '土', 2],
    ['2026-12-13', 13, '日', 2], ['2026-12-14', 14, '月', 2]
  ].map(function (r) {
    return { iso: r[0], d: r[1], w: r[2], week: r[3], open: r[2] !== '水', weekend: r[2] === '土' || r[2] === '日' }
  })
  var BDAYS = DAYS.filter(function (x) { return x.open }) // 営業日 12日（保存の文字列の順）
  var SLOTS = [
    { id: 'am', name: '朝', from: '9:00', to: '13:00', hours: 4, short: '9–13' },
    { id: 'pm1', name: '昼', from: '13:00', to: '17:00', hours: 4, short: '13–17' },
    { id: 'pm2', name: '夜', from: '17:00', to: '20:00', hours: 3, short: '17–20' }
  ]
  var SLOT = {}; SLOTS.forEach(function (s) { SLOT[s.id] = s })
  // id, 呼び名, 役割, できる仕事, 調理, 週の上限日数, 1日の上限時間, 時給（参考）
  var STAFF = [
    ['kae', 'かえ', 'パート', '調理・レジ', true, 5, 8, 1350],
    ['yuki', 'ゆき', 'パート', 'レジ', false, 4, 4, 1250],
    ['taku', 'たく', 'フリーター', '調理・配達', true, 4, 8, 1250],
    ['mio', 'みお', '学生', 'レジ・配達', false, 3, 4, 1200],
    ['maki', 'まき', 'パート', '調理・レジ', true, 4, 8, 1300],
    ['sou', 'そう', '学生', 'レジ・配達', false, 3, 4, 1200],
    ['nao', 'なお', 'シニア', '調理', true, 3, 4, 1200],
    ['riko', 'りこ', '学生', 'レジ', false, 2, 4, 1200]
  ].map(function (r, i) {
    return { id: r[0], name: r[1], role: r[2], jobs: r[3], cook: r[4], maxW: r[5], maxD: r[6], wage: r[7], order: i }
  })
  var STAFF_BY = {}; STAFF.forEach(function (p) { STAFF_BY[p.id] = p })
  var INIT_HOPES = {
    kae: 'ooooxoooooxo',
    yuki: 'oooxxooooxxo',
    taku: 'toxoottxxoot',
    mio: 'xtxooxxtxoox',
    maki: 'oxootxoxootx',
    sou: 'xtootxxtootx',
    nao: 'ooxxxooxxxxo',
    riko: 'xxxooxxxxoox'
  }
  var HOPE_LABEL = { o: '出られる（○）', t: 'どちらでも（△）', x: '出られない（×）' }
  var HOPE_NEXT = { o: 't', t: 'x', x: 'o' }
  var HOPE_RANK = { o: 0, t: 1, x: 2 }
  function need (day, sid) {
    if (day.weekend) return sid === 'pm1' ? 3 : 2
    return sid === 'pm2' ? 1 : 2
  }
  function key (day, sid) { return day.iso + '|' + sid }
  var ALL_KEYS = []
  BDAYS.forEach(function (d) { SLOTS.forEach(function (s) { ALL_KEYS.push(key(d, s.id)) }) })
  function bIndex (day) { return BDAYS.indexOf(day) }
  function hopeOf (hopes, pid, day) { return hopes[pid].charAt(bIndex(day)) }
  function sortIds (ids) { return ids.slice().sort(function (a, b) { return STAFF_BY[a].order - STAFF_BY[b].order }) }

  // ---------- 書き方（§2-1） ----------
  var yenFmt = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
  function fmtYen (n) { return yenFmt.format(n).replace('￥', '¥') }
  function fmtDay (day) { return '12/' + day.d + '（' + day.w + '）' }
  function fmtSlotName (sid) { var s = SLOT[sid]; return s.name + ' ' + s.from + '–' + s.to }
  function dayOfIso (iso) { return DAYS.filter(function (x) { return x.iso === iso })[0] }
  function slotDomId (k) { var p = k.split('|'); return 'slot-' + p[0] + '-' + p[1] }

  // ---------- 表の数え方（自動・評価・候補で共通） ----------
  // slots: { key: [id...] } から、人×日の時間・人×週の日数を数える
  function tally (slots) {
    var dayH = {}; var weekD = {}; var hours = {}
    STAFF.forEach(function (p) { dayH[p.id] = {}; weekD[p.id] = { 1: 0, 2: 0 }; hours[p.id] = 0 })
    BDAYS.forEach(function (d) {
      SLOTS.forEach(function (s) {
        (slots[key(d, s.id)] || []).forEach(function (pid) {
          if (!dayH[pid][d.iso]) { dayH[pid][d.iso] = 0; weekD[pid][d.week]++ }
          dayH[pid][d.iso] += s.hours
          hours[pid] += s.hours
        })
      })
    })
    return { dayH: dayH, weekD: weekD, hours: hours }
  }
  function inSlot (slots, d, sid, pid) { return (slots[key(d, sid)] || []).indexOf(pid) >= 0 }

  // ---------- 自動の下書き（§9-2） ----------
  function autoDraft (hopes) {
    var slots = {}
    ALL_KEYS.forEach(function (k) { slots[k] = [] })
    var H = {}; var dayH = {}; var weekD = {}
    STAFF.forEach(function (p) { H[p.id] = 0; dayH[p.id] = {}; weekD[p.id] = { 1: 0, 2: 0 } })
    var trace = []
    BDAYS.forEach(function (d) {
      var before = {}; STAFF.forEach(function (p) { before[p.id] = H[p.id] })
      trace.push({ day: d.iso, H: before })
      SLOTS.forEach(function (s) {
        var k = key(d, s.id)
        var n = need(d, s.id)
        function cands (cookOnly) {
          return STAFF.filter(function (p) {
            if (cookOnly && !p.cook) return false
            if (hopeOf(hopes, p.id, d) === 'x') return false
            if (slots[k].indexOf(p.id) >= 0) return false
            var dh = dayH[p.id][d.iso] || 0
            if (dh + s.hours > p.maxD) return false
            if (!dh && weekD[p.id][d.week] >= p.maxW) return false
            if (s.id === 'pm2' && inSlot(slots, d, 'am', p.id) && !inSlot(slots, d, 'pm1', p.id)) return false
            return true
          })
        }
        function best (list) {
          var b = null
          list.forEach(function (p) {
            if (!b) { b = p; return }
            var a1 = HOPE_RANK[hopeOf(hopes, p.id, d)]; var b1 = HOPE_RANK[hopeOf(hopes, b.id, d)]
            if (a1 !== b1) { if (a1 < b1) b = p; return }
            if (H[p.id] !== H[b.id]) { if (H[p.id] < H[b.id]) b = p; return }
            if (p.order < b.order) b = p
          })
          return b
        }
        function put (p) {
          slots[k].push(p.id)
          if (!dayH[p.id][d.iso]) { dayH[p.id][d.iso] = 0; weekD[p.id][d.week]++ }
          dayH[p.id][d.iso] += s.hours
          H[p.id] += s.hours
        }
        var c = best(cands(true))
        if (c) put(c)
        while (slots[k].length < n) {
          var p = best(cands(false))
          if (!p) break
          put(p)
        }
        slots[k] = sortIds(slots[k])
      })
    })
    return { slots: slots, trace: trace }
  }

  // ---------- 足りない枠・警告・合計（§10・§16-3。いつもこの1つで計算する） ----------
  function evaluate (hopes, draft) {
    if (!draft) return null
    var slots = draft.slots
    var t = tally(slots)
    var gaps = []; var needSum = 0; var filled = 0
    BDAYS.forEach(function (d) {
      SLOTS.forEach(function (s) {
        var k = key(d, s.id)
        var ids = slots[k]; var n = need(d, s.id)
        needSum += n; filled += Math.min(ids.length, n)
        var short = Math.max(0, n - ids.length)
        var noCook = !ids.some(function (pid) { return STAFF_BY[pid].cook })
        if (short || noCook) {
          var parts = []
          if (short) parts.push(short + '人足りない')
          if (noCook) parts.push('調理できる人がいない')
          gaps.push({ key: k, day: d, sid: s.id, need: n, n: ids.length, short: short, noCook: noCook, reason: parts.join('・') })
        }
      })
    })
    // 警告：スタッフの並び順 → 日付（週はその週の最後の日の位置）→ 種類の順
    var warnings = []
    var marks = {} // 'pid|iso' → [短い言葉]
    function mark (pid, iso, word) {
      var m = marks[pid + '|' + iso] || (marks[pid + '|' + iso] = [])
      if (m.indexOf(word) < 0) m.push(word)
    }
    STAFF.forEach(function (p) {
      DAYS.forEach(function (d) {
        if (d.open) {
          var dh = t.dayH[p.id][d.iso] || 0
          if (dh && hopeOf(hopes, p.id, d) === 'x') {
            warnings.push({ pid: p.id, type: 'hope', day: d, week: d.week, text: p.name + '：' + fmtDay(d) + '希望×の日に入っています' })
            mark(p.id, d.iso, '希望×')
          }
          if (dh > p.maxD) {
            warnings.push({ pid: p.id, type: 'day', day: d, week: d.week, text: p.name + '：' + fmtDay(d) + '1日の上限を超えています（' + dh + '時間／' + p.maxD + '時間）' })
            mark(p.id, d.iso, '上限超え')
          }
        }
        if (d.d === 7 || d.d === 14) {
          var wd = t.weekD[p.id][d.week]
          if (wd > p.maxW) {
            var first = null
            DAYS.forEach(function (x) { if (x.week === d.week && t.dayH[p.id][x.iso] && !first) first = x })
            warnings.push({ pid: p.id, type: 'week', day: first, week: d.week, text: p.name + '：第' + d.week + '週 ' + wd + '日入っています（上限 ' + p.maxW + '日）' })
            DAYS.forEach(function (x) { if (x.week === d.week && t.dayH[p.id][x.iso]) mark(p.id, x.iso, '週の上限超え') })
          }
        }
      })
    })
    var totals = STAFF.map(function (p) {
      var w1 = t.weekD[p.id][1]; var w2 = t.weekD[p.id][2]
      var warnWords = []
      DAYS.forEach(function (d) { (marks[p.id + '|' + d.iso] || []).forEach(function (w) { if (warnWords.indexOf(w) < 0) warnWords.push(w) }) })
      return { pid: p.id, days: w1 + w2, w1: w1, w2: w2, hours: t.hours[p.id], yen: t.hours[p.id] * p.wage, warn: warnWords }
    })
    var sum = { days: 0, w1: 0, w2: 0, hours: 0, yen: 0, filled: filled, need: needSum }
    totals.forEach(function (x) { sum.days += x.days; sum.w1 += x.w1; sum.w2 += x.w2; sum.hours += x.hours; sum.yen += x.yen })
    return { gaps: gaps, warnings: warnings, marks: marks, totals: totals, sum: sum, tally: t }
  }

  // ---------- 窓の候補（§10-3。入れ替え・入れた後の表で判定） ----------
  function candidates (hopes, slots, k, outId) {
    var p0 = k.split('|'); var d = dayOfIso(p0[0]); var sid = p0[1]; var s = SLOT[sid]
    var now = tally(slots)
    var base = {}
    Object.keys(slots).forEach(function (kk) { base[kk] = slots[kk].slice() })
    if (outId) base[k] = base[k].filter(function (x) { return x !== outId })
    var bt = tally(base)
    var list = STAFF.filter(function (p) { return p.id !== outId && base[k].indexOf(p.id) < 0 }).map(function (p) {
      var hope = hopeOf(hopes, p.id, d)
      var dh = bt.dayH[p.id][d.iso] || 0
      var afterH = dh + s.hours
      var reasons = []
      if (hope === 'x') reasons.push('希望×')
      if (afterH > p.maxD) reasons.push('1日の上限を超えます（' + afterH + '時間／' + p.maxD + '時間）')
      if (!dh && bt.weekD[p.id][d.week] + 1 > p.maxW) reasons.push('週の上限を超えます（' + (bt.weekD[p.id][d.week] + 1) + '日／' + p.maxW + '日）')
      var am = inSlot(base, d, 'am', p.id) || sid === 'am'
      var pm1 = inSlot(base, d, 'pm1', p.id) || sid === 'pm1'
      var pm2 = inSlot(base, d, 'pm2', p.id) || sid === 'pm2'
      var gap = am && pm2 && !pm1
      return { p: p, hope: hope, hours: now.hours[p.id], reasons: reasons, gap: gap, ok: !reasons.length && !gap }
    })
    list.sort(function (a, b) {
      return (HOPE_RANK[a.hope] - HOPE_RANK[b.hope]) || (a.hours - b.hours) || (a.p.order - b.p.order)
    })
    return { ok: list.filter(function (x) { return x.ok }), ng: list.filter(function (x) { return !x.ok }) }
  }

  // ---------- 状態と保存（§12） ----------
  function initialState () {
    var hp = {}
    STAFF.forEach(function (p) { hp[p.id] = INIT_HOPES[p.id] })
    return { hopes: hp, draft: null }
  }
  var canSave = false
  try {
    window.localStorage.setItem('tenkaLab.test', '1')
    window.localStorage.removeItem('tenkaLab.test')
    canSave = true
  } catch (e) { canSave = false }

  function validIdList (a) {
    if (!Array.isArray(a)) return false
    var seen = {}
    for (var i = 0; i < a.length; i++) {
      if (typeof a[i] !== 'string' || !Object.prototype.hasOwnProperty.call(STAFF_BY, a[i]) || seen[a[i]]) return false
      seen[a[i]] = true
    }
    return true
  }
  function loadState () {
    if (!canSave) return null
    try {
      var raw = window.localStorage.getItem(STORE_KEY)
      if (!raw) return null
      var d = JSON.parse(raw)
      if (!d || typeof d !== 'object' || d.v !== 1 || !d.hopes || typeof d.hopes !== 'object') return null
      var hk = Object.keys(d.hopes)
      if (hk.length !== 8) return null
      var hopes = {}
      for (var i = 0; i < STAFF.length; i++) {
        var v = d.hopes[STAFF[i].id]
        if (typeof v !== 'string' || !/^[otx]{12}$/.test(v)) return null
        hopes[STAFF[i].id] = v
      }
      var draft = null
      if (d.draft !== null && d.draft !== undefined) {
        var dr = d.draft
        if (!dr || typeof dr !== 'object' || !dr.slots || typeof dr.slots !== 'object') return null
        var sk = Object.keys(dr.slots)
        if (sk.length !== 36) return null
        var slots = {}
        for (var j = 0; j < ALL_KEYS.length; j++) {
          var a = dr.slots[ALL_KEYS[j]]
          var kp = ALL_KEYS[j].split('|')
          if (!validIdList(a) || a.length > need(dayOfIso(kp[0]), kp[1])) return null
          slots[ALL_KEYS[j]] = sortIds(a)
        }
        var manual = {}
        var mm = dr.manual || {}
        if (typeof mm !== 'object' || Array.isArray(mm)) return null
        var mk = Object.keys(mm)
        for (var m = 0; m < mk.length; m++) {
          if (ALL_KEYS.indexOf(mk[m]) < 0 || !validIdList(mm[mk[m]])) return null
          var keep = mm[mk[m]].filter(function (pid) { return slots[mk[m]].indexOf(pid) >= 0 })
          if (keep.length) manual[mk[m]] = keep
        }
        if (dr.hopeChanged !== undefined && typeof dr.hopeChanged !== 'boolean') return null
        draft = { slots: slots, manual: manual, hopeChanged: !!dr.hopeChanged }
      }
      return { hopes: hopes, draft: draft }
    } catch (e) { return null }
  }
  function saveState () {
    if (!canSave) return
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, hopes: S.hopes, draft: S.draft }))
    } catch (e) { /* 保存に失敗しても画面は止めない */ }
  }
  var S = null

  // ---------- DOM の小道具（⑨と同じ） ----------
  var $ = function (id) { return document.getElementById(id) }
  function h (tag, props, kids) {
    var el = document.createElement(tag)
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k]
        if (v === null || v === undefined || v === false) return
        if (k === 'class') el.className = v
        else if (k === 'text') el.textContent = v
        else if (k === 'hidden') el.hidden = true
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v)
        else el.setAttribute(k, v === true ? '' : String(v))
      })
    }
    append(el, kids)
    return el
  }
  function append (el, kids) {
    if (kids === null || kids === undefined) return
    if (!Array.isArray(kids)) kids = [kids]
    kids.forEach(function (k) {
      if (k === null || k === undefined || k === false) return
      if (Array.isArray(k)) append(el, k)
      else if (typeof k === 'string' || typeof k === 'number') el.appendChild(document.createTextNode(String(k)))
      else el.appendChild(k)
    })
  }
  // 固定の SVG だけを作る（値は入れない）
  var SW = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  var SW25 = ' fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'
  var ICON = {
    ok: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M5 8.3l2 2 4-4.3"' + SW + '/>',
    gap: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M8 4.5v4"' + SW + '/><circle cx="8" cy="11.3" r="1" fill="currentColor"/>',
    warn: '<path d="M8 1.8L15 14H1z"' + SW + '/><path d="M8 6.5v3"' + SW + '/><circle cx="8" cy="11.8" r="1" fill="currentColor"/>',
    info: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M8 7.5v4"' + SW + '/><circle cx="8" cy="4.8" r="1" fill="currentColor"/>',
    ladle: '<path d="M5 9.5a4 4 0 0 0 8 0z"' + SW + '/><path d="M9 9.5L14 2"' + SW + '/>',
    pencil: '<path d="M10.5 2.5l3 3L5.5 13.5H2.5v-3z M9 4l3 3"' + SW + '/>',
    hopeO: '<circle cx="8" cy="8" r="5.5"' + SW25 + '/>',
    hopeT: '<path d="M8 2.5L14 13.5H2z"' + SW25 + '/>',
    hopeX: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"' + SW25 + '/>',
    draft: '<rect x="1.5" y="2.5" width="9" height="11" rx="1"' + SW + '/><path d="M1.5 6h9M1.5 9.5h9M6 2.5v11"' + SW + '/><path d="M11 8h4M13 6l2 2-2 2"' + SW + '/>',
    print: '<path d="M4 6V1.5h8V6M4 12H2V6.5h12V12h-2"' + SW + '/><path d="M4 9.5h8V15H4z"' + SW + '/>',
    undo: '<path d="M3 3v4h4"' + SW + '/><path d="M3.3 7A5.5 5.5 0 1 1 4 11.5"' + SW + '/>',
    chev: '<path d="M6 3l5 5-5 5"' + SW + '/>',
    close: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"' + SW + '/>',
    plus: '<path d="M8 3v10M3 8h10"' + SW + '/>',
    stamp: '<svg class="stamp" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="見本の印（このシフト表は見本です）">' +
      '<rect x="1.5" y="1.5" width="53" height="53" rx="4" fill="none" stroke="#B23A2E" stroke-width="3"/>' +
      '<rect x="6.5" y="6.5" width="43" height="43" rx="2" fill="none" stroke="#B23A2E" stroke-width="1"/>' +
      '<text x="28" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">見</text>' +
      '<text x="28" y="45" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">本</text>' +
      '</svg>'
  }
  function icon (name, size) {
    var t = document.createElement('template')
    var s = size || 14
    t.innerHTML = name === 'stamp' ? ICON.stamp : '<svg width="' + s + '" height="' + s + '" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>'
    return t.content.firstChild
  }
  function fillIcons (root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-icon]'), function (el) {
      if (el.firstChild) return
      var n = el.getAttribute('data-icon')
      var size = /20$/.test(n) ? 20 : /18$/.test(n) ? 18 : 16
      el.appendChild(icon(n.replace(/\d+$/, ''), size))
    })
  }
  function hopeMark (v, size) { return h('span', { class: 'mk mk--' + v }, icon({ o: 'hopeO', t: 'hopeT', x: 'hopeX' }[v], size || 20)) }
  function ladle () { return h('span', { class: 'ladle', role: 'img', 'aria-label': '調理できる' }, icon('ladle', 14)) }

  // ---------- 画面の状態（保存しない） ----------
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var mqPC = window.matchMedia('(min-width: 768px)')
  var mqWide = window.matchMedia('(min-width: 1024px)')
  var ui = { tab: 'hope', pick: 'kae', mine: 'kae' }
  var E = null // 最後の evaluate の結果

  // ---------- 知らせ ----------
  var elStatus = $('sr-status')
  function announce (msg) {
    elStatus.textContent = ''
    window.setTimeout(function () { elStatus.textContent = msg }, 50)
  }
  var toastTimer = null
  function showToast (text) {
    var t = $('toast')
    $('toast-text').textContent = text
    t.hidden = false
    t.classList.remove('is-in')
    void t.offsetWidth
    if (!reduceMotion) t.classList.add('is-in')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { t.hidden = true }, 3000)
    announce(text)
  }

  // ---------- 確認の窓（⑨と同じ） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null; var dlgFallbackFocus = null
  function confirmBox (opt) {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(window.confirm(opt.title + '\n\n' + opt.body)); return }
      dlgOpener = document.activeElement
      dlgFallbackFocus = opt.fallback || null
      $('cf-title').textContent = opt.title
      $('cf-body').textContent = opt.body
      $('cf-ok').textContent = opt.ok
      dlgResolve = resolve
      dlg.showModal()
      $('cf-cancel').focus()
    })
  }
  function closeDlg (yes) {
    if (!dlgResolve) return
    var r = dlgResolve
    dlgResolve = null
    if (dlg.open) dlg.close()
    r(yes)
    window.setTimeout(function () {
      if (document.activeElement && document.activeElement !== document.body && !dlg.contains(document.activeElement)) return
      var target = dlgOpener && document.contains(dlgOpener) ? dlgOpener : dlgFallbackFocus
      if (target) target.focus()
    }, 0)
  }
  $('cf-ok').addEventListener('click', function () { closeDlg(true) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(false) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(false) })

  // ---------- タブ（⑨ §7 と同じ） ----------
  var TABS = ['hope', 'shift', 'list']
  function openTab (name, opt) {
    ui.tab = name
    TABS.forEach(function (t) {
      var on = t === name
      var tb = $('tab-' + t)
      tb.setAttribute('aria-selected', on ? 'true' : 'false')
      tb.tabIndex = on ? 0 : -1
      $('panel-' + t).hidden = !on
    })
    if (!(opt && opt.noScroll)) {
      var tabsH = $('tabs').getBoundingClientRect().height
      var top = $('panel-' + name).getBoundingClientRect().top
      if (top < tabsH) window.scrollBy(0, top - tabsH)
    }
  }
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[role="tab"]')
    if (b) openTab(b.id.slice(4))
  })
  $('tabs').addEventListener('keydown', function (e) {
    var i = TABS.indexOf(ui.tab); var j = null
    if (e.key === 'ArrowRight') j = (i + 1) % 3
    else if (e.key === 'ArrowLeft') j = (i + 2) % 3
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = 2
    if (j === null) return
    e.preventDefault()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  function goTo (el, focusEl) {
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    if (focusEl) focusEl.focus({ preventScroll: true })
  }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      openTab(a.getAttribute('data-tab'), { noScroll: true })
      var card = $(a.getAttribute('data-go'))
      if (card.hidden) card = $('board-card')
      goTo(card, card.querySelector('[tabindex="-1"]'))
    })
  })

  // ---------- 描き直し（§16-4：いつも状態から全部） ----------
  function renderAll () {
    E = evaluate(S.hopes, S.draft)
    renderBadge()
    renderHope()
    renderShift()
    renderList()
    renderMine()
  }
  function renderBadge () {
    var b = $('tab-shift-badge')
    var n = E ? E.gaps.length : 0
    b.hidden = !n
    b.textContent = n ? '不足 ' + n : ''
    if (n) $('tab-shift').setAttribute('aria-label', 'シフト表（足りない枠 ' + n + '）')
    else $('tab-shift').removeAttribute('aria-label')
  }

  // ---------- 希望（§7） ----------
  function staffInfo () {
    var area = $('staff-info-area')
    area.textContent = ''
    if (mqPC.matches) {
      area.appendChild(h('table', { class: 'staff-table' }, [
        h('thead', {}, h('tr', {}, ['呼び名', '役割', 'できる仕事', '週の上限', '1日の上限', '時給（参考）'].map(function (t) { return h('th', { scope: 'col', text: t }) }))),
        h('tbody', {}, STAFF.map(function (p) {
          return h('tr', {}, [h('th', { scope: 'row' }, [p.name, p.cook ? ladle() : null]), h('td', { text: p.role }), h('td', { text: p.jobs }), h('td', { text: p.maxW + '日' }), h('td', { text: p.maxD + '時間' }), h('td', { text: fmtYen(p.wage) })])
        }))
      ]))
    } else {
      area.appendChild(h('dl', { class: 'staff-dl' }, STAFF.map(function (p) {
        return h('div', {}, [h('dt', {}, [p.name + '（' + p.role + '）', p.cook ? ladle() : null]), h('dd', { text: p.jobs + '／週' + p.maxW + '日・1日' + p.maxD + '時間／' + fmtYen(p.wage) })])
      })))
    }
  }
  function hopeCell (p, d, cls) {
    var v = hopeOf(S.hopes, p.id, d)
    var kids = cls === 'cal__cell' ? [h('span', { class: 'cal__d', text: '12/' + d.d }), h('span', { class: 'cal__w' + (d.weekend ? ' is-we' : ''), text: d.w }), hopeMark(v, 22)] : [hopeMark(v, 20)]
    return h('button', {
      type: 'button', class: 'hope-cell ' + (cls || ''), 'data-v': v, 'data-staff': p.id, 'data-day': d.iso,
      'aria-label': '12月' + d.d + '日（' + d.w + '） ' + p.name + '：' + HOPE_LABEL[v],
      onclick: function () { toggleHope(p.id, d) }
    }, kids)
  }
  function canCount (d) { return STAFF.filter(function (p) { return hopeOf(S.hopes, p.id, d) !== 'x' }).length }
  function renderHope () {
    staffInfo()
    var area = $('hope-area')
    area.textContent = ''
    ;[1, 2].forEach(function (wk) {
      var days = DAYS.filter(function (d) { return d.week === wk })
      var title = wk === 1 ? '第1週 12/1（火）〜12/7（月）' : '第2週 12/8（火）〜12/14（月）'
      if (mqPC.matches) {
        area.appendChild(h('h3', { class: 'hope__wk', text: title }))
        var head = h('tr', {}, [h('th', { scope: 'col', class: 'hope__staff-h', text: 'スタッフ' })].concat(days.map(function (d) {
          return h('th', { scope: 'col', class: d.open ? '' : 'is-off' }, [h('span', { class: 'hope__hd', text: '12/' + d.d }), h('span', { class: 'hope__hw' + (d.weekend ? ' is-we' : ''), text: d.w })])
        })))
        var rows = STAFF.map(function (p, i) {
          var cells = [h('th', { scope: 'row', class: 'hope__staff' }, [h('span', { class: 'hope__nm' }, [p.name, p.cook ? ladle() : null]), h('span', { class: 'hope__cond', text: p.role + '・週' + p.maxW + '日・1日' + p.maxD + '時間' })])]
          days.forEach(function (d) {
            if (!d.open) { if (i === 0) cells.push(h('td', { class: 'hope__off', rowspan: String(STAFF.length + 1) }, h('span', { text: '休' }))); return }
            cells.push(h('td', {}, hopeCell(p, d)))
          })
          return h('tr', {}, cells)
        })
        rows.push(h('tr', { class: 'hope__can' }, [h('th', { scope: 'row', text: '出られる人（○＋△）' })].concat(days.filter(function (d) { return d.open }).map(function (d) {
          return h('td', { 'data-can': d.iso, text: canCount(d) + '人' })
        }))))
        area.appendChild(h('div', { class: 'hope-wrap' }, h('table', { class: 'hope' }, [
          h('caption', { class: 'visually-hidden', text: title + 'の希望' }),
          h('colgroup', {}, [h('col', { class: 'c-staff' })].concat(days.map(function (d) { return h('col', { class: d.open ? 'c-day' : 'c-off' }) }))),
          h('thead', {}, head), h('tbody', {}, rows)
        ])))
      } else {
        if (wk === 1) {
          var pick = h('div', { class: 'staff-pick', role: 'radiogroup', 'aria-labelledby': 'pick-label' }, STAFF.map(function (p) {
            var on = p.id === ui.pick
            return h('button', { type: 'button', class: 'seg__btn', role: 'radio', 'aria-checked': on ? 'true' : 'false', tabindex: on ? '0' : '-1', 'data-v': p.id, text: p.name, onclick: function () { pickStaff(p.id) } })
          }))
          pick.addEventListener('keydown', function (e) {
            var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
            if (keys.indexOf(e.key) < 0) return
            e.preventDefault()
            var i = STAFF.indexOf(STAFF_BY[ui.pick]); var n = STAFF.length
            var j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? (i - 1 + n) % n : (i + 1) % n
            pickStaff(STAFF[j].id)
          })
          var cur = STAFF_BY[ui.pick]
          area.appendChild(h('p', { class: 'pick-label', id: 'pick-label', text: 'スタッフを選ぶ' }))
          area.appendChild(pick)
          area.appendChild(h('p', { class: 'pick-who' }, [h('strong', {}, [cur.name + '（' + cur.role + '）', cur.cook ? ladle() : null]), h('span', { text: cur.jobs })]))
          area.appendChild(h('p', { class: 'sub pick-cond', text: '週' + cur.maxW + '日まで・1日' + cur.maxD + '時間まで' }))
        }
        var p = STAFF_BY[ui.pick]
        area.appendChild(h('div', { class: 'cal__head' }, [h('h3', { class: 'cal__wk', text: '第' + wk + '週' }), h('span', { class: 'cal__off', text: '水は定休日' })]))
        area.appendChild(h('div', { class: 'cal', role: 'group', 'aria-label': p.name + ' 第' + wk + '週の希望' }, days.filter(function (d) { return d.open }).map(function (d) { return hopeCell(p, d, 'cal__cell') })))
      }
    })
  }
  function pickStaff (id) {
    ui.pick = id
    renderHope()
    var b = document.querySelector('.staff-pick [data-v="' + id + '"]')
    if (b) b.focus()
  }
  function toggleHope (pid, d) {
    var i = bIndex(d)
    var v = S.hopes[pid].charAt(i)
    var nv = HOPE_NEXT[v]
    S.hopes[pid] = S.hopes[pid].slice(0, i) + nv + S.hopes[pid].slice(i + 1)
    if (S.draft) S.draft.hopeChanged = true
    saveState()
    renderAll()
    var b = document.querySelector('.hope-cell[data-staff="' + pid + '"][data-day="' + d.iso + '"]')
    if (b) b.focus()
    announce(STAFF_BY[pid].name + ' ' + fmtDay(d) + HOPE_LABEL[nv])
  }
  $('hope-draft').addEventListener('click', function () { runDraft(true) })

  // ---------- シフト表（§8） ----------
  function runDraft (fromHope) {
    var go = function () {
      S.draft = { slots: autoDraft(S.hopes).slots, manual: {}, hopeChanged: false }
      saveState()
      if (fromHope) openTab('shift', { noScroll: true })
      renderAll()
      if (fromHope) goTo($('auto-card'), $('h-auto'))
      showToast('下書きを作りました（足りない枠 ' + E.gaps.length + '）')
    }
    if (!S.draft) { go(); return }
    confirmBox({ title: '下書きを作り直しますか', body: '今の下書き（手で直した所を含む）を消して、いまの希望で作り直します。', ok: '作り直す', fallback: $('auto-btn') })
      .then(function (yes) { if (yes) go() })
  }
  $('auto-btn').addEventListener('click', function () { runDraft(false) })

  function gapMark (text) { return h('span', { class: 'gap-mark' }, [icon('gap', 14), text || '不足']) }
  function gapOf (k) { return E ? E.gaps.filter(function (g) { return g.key === k })[0] : null }
  function statusRow (d, sid) {
    var k = key(d, sid); var n = need(d, sid)
    if (!S.draft) return h('p', { class: 'slot__st slot__st--pre', text: '必要 ' + n + '人（調理 1人以上）' })
    var g = gapOf(k); var cnt = S.draft.slots[k].length
    if (g) return h('p', { class: 'slot__st slot__st--gap' }, [gapMark(), h('span', { class: 'slot__why', text: g.reason }), h('span', { class: 'slot__cnt', text: cnt + '/' + n + '人' })])
    return h('p', { class: 'slot__st slot__st--ok' }, [icon('ok', 14), h('span', { class: 'slot__cnt', text: cnt + '/' + n + '人' })])
  }
  function slipFor (d, sid, pid) {
    var k = key(d, sid); var p = STAFF_BY[pid]
    var manual = (S.draft.manual[k] || []).indexOf(pid) >= 0
    var words = (E.marks[pid + '|' + d.iso] || [])
    var cls = 'slip' + (manual ? ' slip--manual' : '') + (words.length ? ' slip--warn' : '')
    var label = fmtDay(d) + SLOT[sid].name + ' ' + p.name + (p.cook ? '（調理できる）' : '') + (manual ? '（手で変更）' : '') + '。押すと入れ替え・外す' + (words.length ? '。警告：' + words.join('・') : '')
    return h('button', { type: 'button', class: cls, 'data-slot': k, 'data-id': pid, 'aria-label': label, onclick: function (e) { openPick(k, pid, e.currentTarget) } }, [
      h('span', { class: 'slip__l1' }, [words.length ? h('span', { class: 'slip__warn-i' }, icon('warn', 14)) : null, manual ? h('span', { class: 'slip__pen' }, icon('pencil', 12)) : null, h('span', { class: 'slip__nm', text: p.name }), p.cook ? h('span', { class: 'ladle' }, icon('ladle', 14)) : null]),
      words.length ? h('span', { class: 'slip__why', text: words.join('・') }) : null
    ])
  }
  function slotBody (d, sid) {
    var k = key(d, sid)
    var kids = [statusRow(d, sid)]
    if (S.draft) {
      var ids = S.draft.slots[k]
      var slips = ids.map(function (pid) { return slipFor(d, sid, pid) })
      if (ids.length < need(d, sid)) slips.push(h('button', { type: 'button', class: 'btn-sub btn-sm add-btn', 'data-slot': k, 'aria-label': fmtDay(d) + SLOT[sid].name + 'に人を入れる', onclick: function (e) { openPick(k, null, e.currentTarget) } }, [icon('plus', 14), '入れる']))
      kids.push(h('div', { class: 'slot__slips' }, slips))
    }
    return kids
  }
  function renderShift () {
    $('notice').hidden = !(S.draft && S.draft.hopeChanged)
    // 上の数字
    var has = !!E
    $('sum-empty').hidden = has
    $('summary').classList.toggle('is-pre', !has)
    var nGap = has ? E.gaps.length : 0
    var nWarn = has ? E.warnings.length : 0
    $('sum-gap-n').textContent = has ? String(nGap) : '—'
    $('sum-warn-n').textContent = has ? String(nWarn) : '—'
    $('sum-hours-n').textContent = has ? String(E.sum.hours) : '—'
    $('sum-yen-n').textContent = has ? fmtYen(E.sum.yen) : '—'
    ;['sum-gap-u', 'sum-warn-u', 'sum-hours-u'].forEach(function (id) { $(id).hidden = !has })
    $('sum-gap').classList.toggle('is-ok', has && !nGap)
    var gi = $('sum-gap-icon'); gi.textContent = ''; gi.appendChild(icon(has && !nGap ? 'ok' : 'gap', 16))
    $('sum-gap-link-p').hidden = !(has && nGap)
    $('sum-gap-ok').hidden = !(has && !nGap)
    $('sum-warn-link-p').hidden = !(has && nWarn)
    $('sum-warn-none').hidden = !(has && !nWarn)
    $('sum-hours-note').hidden = !has
    $('sum-hours-note').textContent = has ? '延べ ' + E.sum.days + '日・' + E.sum.filled + '/' + E.sum.need + '人' : ''
    $('sum-yen-note').hidden = !has
    // 不足・警告の一覧
    $('gap-card').hidden = !has
    $('warn-card').hidden = !has
    if (has) {
      $('h-gap').textContent = '足りない枠（' + nGap + '）'
      var ga = $('gap-area'); ga.textContent = ''
      if (!nGap) ga.appendChild(h('p', { class: 'list-none list-none--ok' }, [icon('ok', 16), '足りない枠はありません']))
      else {
        ga.appendChild(h('ul', { class: 'gap-list' }, E.gaps.map(function (g) {
          return h('li', {}, h('a', { href: '#' + slotDomId(g.key), 'data-slot': g.key, onclick: function (e) { e.preventDefault(); jumpSlot(g.key) } }, [
            gapMark(), h('span', { class: 'gap-list__when', text: fmtDay(g.day) + SLOT[g.sid].name }), h('span', { class: 'gap-list__why', text: g.reason }), h('span', { class: 'gap-list__chev' }, icon('chev', 14))
          ]))
        })))
      }
      $('h-warn').textContent = '警告（' + nWarn + '）'
      var wa = $('warn-area'); wa.textContent = ''
      if (!nWarn) wa.appendChild(h('p', { class: 'sub list-none', text: '警告はありません' }))
      else {
        wa.appendChild(h('ul', { class: 'warn-list' }, E.warnings.map(function (w) {
          return h('li', {}, h('a', { href: '#' + slotDomId(firstSlotKey(w)), 'data-pid': w.pid, onclick: function (e) { e.preventDefault(); jumpSlip(w) } }, [h('span', { class: 'warn-list__i' }, icon('warn', 16)), h('span', { text: w.text })]))
        })))
      }
    }
    renderBoard()
    renderTotals()
    placeTotal()
  }
  function renderBoard () {
    var area = $('board-area'); area.textContent = ''
    if (mqPC.matches) {
      var rows = DAYS.map(function (d) {
        var th = h('th', { scope: 'row', class: 'board__day' }, [h('span', { text: '12/' + d.d }), h('span', { class: d.weekend ? 'is-we' : '', text: '（' + d.w + '）' })])
        if (!d.open) return h('tr', { class: 'board__off' }, [th, h('td', { colspan: '3', text: '定休日' })])
        return h('tr', {}, [th].concat(SLOTS.map(function (s) {
          var g = S.draft ? gapOf(key(d, s.id)) : null
          return h('td', { id: slotDomId(key(d, s.id)), tabindex: '-1', class: 'slot' + (g ? ' slot--gap' : ''), 'data-slot': key(d, s.id) }, slotBody(d, s.id))
        })))
      })
      area.appendChild(h('table', { class: 'board' }, [
        h('caption', { class: 'visually-hidden', text: '12/1〜12/14 のシフト表' }),
        h('colgroup', {}, [h('col', { class: 'c-date' }), h('col'), h('col'), h('col')]),
        h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: '日付' })].concat(SLOTS.map(function (s) {
          return h('th', { scope: 'col' }, [h('span', { class: 'board__sn', text: s.name }), h('span', { class: 'board__st', text: s.from + '–' + s.to })])
        })))),
        h('tbody', {}, rows)
      ]))
    } else {
      area.appendChild(h('div', { class: 'day-cards' }, DAYS.map(function (d) {
        if (!d.open) return h('div', { class: 'day-card day-card--off' }, [h('span', { class: 'day-card__d', text: fmtDay(d) }), h('span', { text: '定休日' })])
        var gapN = S.draft ? SLOTS.filter(function (s) { return gapOf(key(d, s.id)) }).length : 0
        return h('section', { class: 'day-card', 'aria-label': fmtDay(d) }, [
          h('div', { class: 'day-card__head' }, [h('h4', { class: 'day-card__d', text: fmtDay(d) }), gapN ? gapMark('不足 ' + gapN) : null]),
          SLOTS.map(function (s) {
            var g = S.draft ? gapOf(key(d, s.id)) : null
            return h('div', { id: slotDomId(key(d, s.id)), tabindex: '-1', class: 'slot day-card__row' + (g ? ' slot--gap' : ''), 'data-slot': key(d, s.id) }, [
              h('p', { class: 'slot__name' }, [h('strong', { text: s.name }), h('span', { text: s.from + '–' + s.to })])
            ].concat(slotBody(d, s.id)))
          })
        ])
      })))
    }
  }
  function renderTotals () {
    var area = $('total-area'); area.textContent = ''
    if (!E) { area.appendChild(h('p', { class: 'sub', text: '下書きを作ると、ここに日数・時間・人件費の目安が出ます。' })); return }
    var rows = E.totals.map(function (x) {
      var p = STAFF_BY[x.pid]
      return h('tr', { class: x.warn.length ? 'is-warn' : '', 'data-pid': x.pid }, [
        h('th', { scope: 'row' }, [h('span', { class: 'totals__nm' }, [x.warn.length ? h('span', { class: 'warn-i' }, icon('warn', 14)) : null, p.name, p.cook ? ladle() : null]),
          x.warn.length ? h('span', { class: 'totals__warn', text: x.warn.join('・') }) : null,
          h('span', { class: 'totals__sub', text: fmtYen(p.wage) })]),
        h('td', { class: 'num' }, [h('span', { class: 'totals__days', text: x.days + '日' }), h('span', { class: 'totals__sub', text: x.w1 + '・' + x.w2 })]),
        h('td', { class: 'num totals__h', text: x.hours + '時間' }),
        h('td', { class: 'num totals__yen', text: fmtYen(x.yen) })
      ])
    })
    rows.push(h('tr', { class: 'totals__sum' }, [h('th', { scope: 'row', text: '合計' }), h('td', { class: 'num', text: E.sum.days + '日' }), h('td', { class: 'num', text: E.sum.hours + '時間' }), h('td', { class: 'num', text: fmtYen(E.sum.yen) })]))
    area.appendChild(h('table', { class: 'totals' }, [
      h('caption', { class: 'visually-hidden', text: 'スタッフごとの日数・時間・人件費の目安' }),
      h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: 'スタッフ' }), h('th', { scope: 'col', class: 'num', text: '日数' }), h('th', { scope: 'col', class: 'num', text: '時間' }), h('th', { scope: 'col', class: 'num', text: '人件費の目安' })])),
      h('tbody', {}, rows)
    ]))
    area.appendChild(h('p', { class: 'sub totals__note', text: '人件費は 時間 × 時給（参考）の目安です。深夜・休日の割増・交通費は含みません。休憩は考えていません（枠の時間をそのまま足しています）。' }))
  }
  // 合計のカード：1024px〜 は右の列の下、ほかは表の下（§4-2）
  function placeTotal () {
    var t = $('total-card')
    if (mqWide.matches) { if (t.parentNode !== $('shift-side')) $('shift-side').appendChild(t) } else if (t.parentNode !== $('shift-body') || t.previousElementSibling !== $('shift-main')) $('shift-body').appendChild(t)
  }
  function ring (el) {
    el.classList.remove('is-ring'); void el.offsetWidth
    el.classList.add('is-ring')
    if (!reduceMotion) window.setTimeout(function () { el.classList.remove('is-ring') }, 1200)
    else {
      var off = function () { el.classList.remove('is-ring'); document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', off) }
      document.addEventListener('pointerdown', off)
      document.addEventListener('keydown', off)
    }
  }
  function jumpSlot (k) {
    if (ui.tab !== 'shift') openTab('shift', { noScroll: true })
    var el = $(slotDomId(k))
    if (!el) return
    goTo(el, el)
    ring(el)
  }
  // 警告の移動先：その日（週の上限はその週の最初の日）に、その人が入っている最初の枠（朝→昼→夜）
  function firstSlotKey (w) {
    var k = null
    SLOTS.forEach(function (s) { if (!k && S.draft.slots[key(w.day, s.id)].indexOf(w.pid) >= 0) k = key(w.day, s.id) })
    return k || key(w.day, 'am')
  }
  function jumpSlip (w) {
    // その日の（週の上限は、その週の最初の日の）その人の札
    var sel = null
    SLOTS.forEach(function (s) { if (!sel) sel = document.querySelector('.slip[data-slot="' + key(w.day, s.id) + '"][data-id="' + w.pid + '"]') })
    if (sel) { sel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); sel.focus({ preventScroll: true }) }
  }
  $('sum-gap-link').addEventListener('click', function (e) { e.preventDefault(); goTo($('gap-card'), $('h-gap')) })
  $('sum-warn-link').addEventListener('click', function (e) { e.preventDefault(); goTo($('warn-card'), $('h-warn')) })

  // ---------- 枠を直す窓（§8-7） ----------
  var pick = $('pick')
  var pk = { key: null, out: null, opener: null }
  function openPick (k, outId, opener) {
    pk.key = k; pk.out = outId; pk.opener = opener
    var p0 = k.split('|'); var d = dayOfIso(p0[0]); var sid = p0[1]
    var ids = S.draft.slots[k]; var n = need(d, sid); var g = gapOf(k)
    $('pk-title').textContent = fmtDay(d) + fmtSlotName(sid)
    var meta = $('pk-meta'); meta.textContent = ''
    append(meta, ['必要 ' + n + '人（調理できる人 1人以上）', h('span', { class: 'pick__now', text: 'いま ' + ids.length + '/' + n + '人' }), g ? gapMark() : null])
    var t = tally(S.draft.slots)
    var cur = $('pk-cur'); cur.textContent = ''
    if (!ids.length) cur.appendChild(h('li', { class: 'pick__none', text: 'いません' }))
    ids.forEach(function (pid) {
      var p = STAFF_BY[pid]
      cur.appendChild(h('li', { class: 'pick__row pick__row--cur' + (pid === outId ? ' is-out' : ''), 'data-id': pid }, [
        h('span', { class: 'pick__who' }, [h('span', { class: 'pick__nm' }, [p.name, p.cook ? ladle() : null]), h('span', { class: 'pick__sub', text: p.role + '・' + p.jobs + '・この期間 ' + t.hours[pid] + '時間' })]),
        h('button', { type: 'button', class: 'btn-sub btn-sm', 'aria-label': p.name + 'をこの枠から外す', onclick: function () { doRemove(k, pid) } }, '外す')
      ]))
    })
    $('pk-cand-title').textContent = outId ? STAFF_BY[outId].name + ' と入れ替える人' : 'この枠に入れる人'
    var c = candidates(S.hopes, S.draft.slots, k, outId)
    function row (x) {
      var p = x.p
      var why = x.reasons.length ? h('span', { class: 'pick__why' }, [icon('warn', 14), x.reasons.join('・')]) : x.gap ? h('span', { class: 'pick__why pick__why--note' }, [icon('info', 14), '朝と夜の間が空きます']) : null
      return h('li', { class: 'pick__row', 'data-id': p.id }, [
        hopeMark(x.hope, 16),
        h('span', { class: 'pick__who' }, [h('span', { class: 'pick__nm' }, [p.name, p.cook ? ladle() : null]), h('span', { class: 'pick__sub', text: p.role + '・' + p.jobs })]),
        h('span', { class: 'pick__hrs', text: x.hours + '時間' }),
        why,
        h('button', { type: 'button', class: 'btn-sub btn-sm', 'aria-label': outId ? p.name + 'と入れ替える' : p.name + 'を入れる', onclick: function () { if (outId) doSwap(k, outId, p.id); else doAdd(k, p.id) } }, outId ? '入れ替える' : '入れる')
      ])
    }
    var okl = $('pk-ok'); okl.textContent = ''
    if (!c.ok.length) okl.appendChild(h('li', { class: 'pick__none', text: 'いません' }))
    c.ok.forEach(function (x) { okl.appendChild(row(x)) })
    var ngl = $('pk-ng'); ngl.textContent = ''
    if (!c.ng.length) ngl.appendChild(h('li', { class: 'pick__none', text: 'いません' }))
    c.ng.forEach(function (x) { ngl.appendChild(row(x)) })
    if (typeof pick.showModal === 'function') pick.showModal(); else pick.setAttribute('open', '')
    $('pk-x').focus()
  }
  function closePick (changed) {
    if (pick.open) { if (typeof pick.close === 'function') pick.close(); else pick.removeAttribute('open') }
    if (changed) {
      var el = $(slotDomId(pk.key)); if (el) el.focus()
    } else if (pk.opener && document.contains(pk.opener)) pk.opener.focus()
  }
  $('pk-x').addEventListener('click', function () { closePick(false) })
  $('pk-close').addEventListener('click', function () { closePick(false) })
  pick.addEventListener('cancel', function (e) { e.preventDefault(); closePick(false) })
  function warnTail () { return E.warnings.length ? '（警告 ' + E.warnings.length + '件）' : '（警告なし）' }
  function labelOf (k) { var p0 = k.split('|'); return fmtDay(dayOfIso(p0[0])) + SLOT[p0[1]].name }
  function setManual (k, pid, on) {
    var m = (S.draft.manual[k] || []).filter(function (x) { return x !== pid })
    if (on) m.push(pid)
    if (m.length) S.draft.manual[k] = sortIds(m); else delete S.draft.manual[k]
  }
  function doSwap (k, outId, inId) {
    S.draft.slots[k] = sortIds(S.draft.slots[k].filter(function (x) { return x !== outId }).concat([inId]))
    setManual(k, outId, false); setManual(k, inId, true)
    saveState(); renderAll(); closePick(true)
    showToast(labelOf(k) + '：' + STAFF_BY[outId].name + ' → ' + STAFF_BY[inId].name + ' に入れ替えました' + warnTail())
  }
  function doAdd (k, inId) {
    S.draft.slots[k] = sortIds(S.draft.slots[k].concat([inId]))
    setManual(k, inId, true)
    saveState(); renderAll(); closePick(true)
    showToast(labelOf(k) + 'に ' + STAFF_BY[inId].name + ' を入れました' + warnTail())
  }
  function doRemove (k, pid) {
    S.draft.slots[k] = S.draft.slots[k].filter(function (x) { return x !== pid })
    setManual(k, pid, false)
    saveState(); renderAll(); closePick(true)
    showToast(labelOf(k) + 'から ' + STAFF_BY[pid].name + ' を外しました（足りない枠 ' + E.gaps.length + '）')
  }

  // ---------- 一覧・紙面（§11） ----------
  function nameList (k) {
    return S.draft.slots[k].map(function (pid) { var p = STAFF_BY[pid]; return p.name + (p.cook ? '（調）' : '') }).join('・')
  }
  // 1人ずつ折れないように span に分ける（textContent は nameList と同じ）
  function nameSpans (k) {
    var out = []
    S.draft.slots[k].forEach(function (pid, i) {
      var p = STAFF_BY[pid]
      if (i) out.push('・')
      out.push(h('span', { class: 'nw', text: p.name + (p.cook ? '（調）' : '') }))
    })
    return out
  }
  function buildSheet () {
    if (!S.draft) return h('p', { class: 'print-empty', text: 'まだ下書きがありません。' })
    var left = h('table', { class: 'sheet__board' }, [
      h('colgroup', {}, [h('col', { class: 'sw-date' }), h('col', { class: 'sw-slot' }), h('col', { class: 'sw-slot' }), h('col', { class: 'sw-slot' })]),
      h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: '日付' })].concat(SLOTS.map(function (s) { return h('th', { scope: 'col', text: s.name + ' ' + s.from + '–' + s.to }) })))),
      h('tbody', {}, DAYS.map(function (d) {
        var th = h('th', { scope: 'row', class: d.weekend || !d.open ? 'is-shade' : '', text: fmtDay(d) })
        if (!d.open) return h('tr', { class: 'sheet__off' }, [th, h('td', { colspan: '3', class: 'is-shade', text: '定休日' })])
        return h('tr', {}, [th].concat(SLOTS.map(function (s) {
          var k = key(d, s.id); var g = gapOf(k)
          return h('td', { 'data-slot': k }, [g ? h('span', { class: 'sheet__gap', text: '【不足】' + g.reason }) : null, h('span', { class: 'sheet__names' }, nameSpans(k))])
        })))
      }))
    ])
    var right = h('div', { class: 'sheet__side' }, [
      h('table', { class: 'sheet__totals' }, [
        h('colgroup', {}, [h('col', { class: 'sw-st' }), h('col', { class: 'sw-sd' }), h('col', { class: 'sw-sh' })]),
        h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: 'スタッフ' }), h('th', { scope: 'col', class: 'num', text: '日数' }), h('th', { scope: 'col', class: 'num', text: '時間' })])),
        h('tbody', {}, E.totals.map(function (x) {
          return h('tr', {}, [h('th', { scope: 'row', text: STAFF_BY[x.pid].name }), h('td', { class: 'num', text: x.days + '日' }), h('td', { class: 'num', text: x.hours + '時間' })])
        }).concat([h('tr', { class: 'sheet__sum' }, [h('th', { scope: 'row', text: '合計' }), h('td', { class: 'num', text: E.sum.days + '日' }), h('td', { class: 'num', text: E.sum.hours + '時間' })])]))
      ]),
      h('p', { class: 'sheet__note', text: '（調）＝調理できる人' })
    ])
    return h('div', { class: 'sheet' }, [
      h('div', { class: 'sheet__head' }, [
        h('p', { class: 'sheet__title' }, [h('span', { class: 'sheet__t', text: 'シフト表' }), h('span', { class: 'sheet__period', text: '2026年12月1日（火）〜14日（月）' })]),
        h('p', { class: 'sheet__shop' }, [h('span', { text: SHOP }), icon('stamp')])
      ]),
      h('div', { class: 'sheet__scroll' }, h('div', { class: 'sheet__body' }, [left, right])),
      h('p', { class: 'sheet__foot', text: 'この表は TENKA LAB の制作見本です。お店・スタッフ・希望はすべて架空です。' })
    ])
  }
  function renderList () {
    var area = $('list-area'); area.textContent = ''
    var btn = $('print-btn')
    if (!S.draft) {
      btn.setAttribute('aria-disabled', 'true')
      area.appendChild(h('div', { class: 'list-empty' }, [
        h('p', { class: 'list-empty__t', text: 'まだ下書きがありません' }),
        h('a', { class: 'text-link', href: '#auto-card', onclick: function (e) { e.preventDefault(); openTab('shift', { noScroll: true }); goTo($('auto-card'), $('h-auto')) } }, 'シフト表で下書きを作る ›')
      ]))
      return
    }
    btn.removeAttribute('aria-disabled')
    area.appendChild(h('p', { class: 'sub scroll-hint', text: '表は横にスクロールできます' }))
    area.appendChild(h('div', { class: 'desk' }, h('div', { class: 'paper' }, buildSheet())))
  }

  // ---------- あなたのシフト（§11-2） ----------
  function mineText (pid) {
    var p = STAFF_BY[pid]
    var lines = [p.name + 'さん', '12月前半（2026年12月1日（火）〜14日（月））のシフトです。', '']
    var days = 0; var hours = 0
    BDAYS.forEach(function (d) {
      var on = SLOTS.filter(function (s) { return S.draft.slots[key(d, s.id)].indexOf(pid) >= 0 })
      if (!on.length) return
      days++
      on.forEach(function (s) { hours += s.hours })
      // 続いた枠はまとめる
      var groups = []
      on.forEach(function (s) {
        var last = groups[groups.length - 1]
        var idx = SLOTS.indexOf(s)
        if (last && SLOTS.indexOf(last[last.length - 1]) === idx - 1) last.push(s); else groups.push([s])
      })
      groups.forEach(function (g) {
        var a = g[0]; var b = g[g.length - 1]
        lines.push(fmtDay(d) + ' ' + (g.length > 1 ? a.name + '〜' + b.name : a.name) + ' ' + a.from + '〜' + b.to)
      })
    })
    if (!days) lines.push('12月前半のシフトは入っていません。')
    else lines.push('合計 ' + days + '日・' + hours + '時間')
    lines.push('', '都合が悪い日は、早めに店長までお知らせください。', SHOP)
    return lines.join('\n')
  }
  var elMine = $('mine-staff')
  STAFF.forEach(function (p) { elMine.appendChild(h('option', { value: p.id, text: p.name + '（' + p.role + '）' })) })
  elMine.addEventListener('change', function () { ui.mine = elMine.value; renderMine() })
  function renderMine () {
    var area = $('mine-area'); area.textContent = ''
    elMine.value = ui.mine
    if (!S.draft) { area.appendChild(h('p', { class: 'sub', text: '下書きを作ると、ここに文面の見本が出ます。' })); return }
    area.appendChild(h('div', { class: 'mine' }, [h('p', { class: 'mine__label', text: '送信はしません（見本の表示だけ）' }), h('p', { class: 'mine__text', id: 'mine-text', text: mineText(ui.mine) })]))
  }

  // ---------- 印刷（§11-3） ----------
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  function fillPrint () { elPrintRoot.textContent = ''; elPrintRoot.appendChild(buildSheet()) }
  $('print-btn').addEventListener('click', function () {
    if ($('print-btn').getAttribute('aria-disabled') === 'true') return
    fillPrint()
    document.title = 'シフト表_2026-12-01_14'
    window.print()
  })
  window.addEventListener('beforeprint', function () {
    if (!elPrintRoot.firstChild) fillPrint()
    if (S.draft) document.title = 'シフト表_2026-12-01_14'
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  // ---------- 最初の状態に戻す（§12-4） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox({ title: '最初の状態に戻しますか', body: '希望を見本の状態に戻し、下書きを消します。', ok: '戻す', fallback: $('btn-reset') })
      .then(function (yes) {
        if (!yes) return
        S = initialState()
        saveState()
        ui.pick = 'kae'; ui.mine = 'kae'
        openTab('hope', { noScroll: true })
        renderAll()
        showToast('最初の状態に戻しました')
      })
  })

  // 幅が変わったら、スマホ用・PC 用の組み方を作り直す
  function onMq () {
    if (pick.open) { if (typeof pick.close === 'function') pick.close(); else pick.removeAttribute('open') }
    renderAll()
  }
  if (mqPC.addEventListener) { mqPC.addEventListener('change', onMq); mqWide.addEventListener('change', onMq) }

  // ---------- はじめ ----------
  S = loadState() || initialState()
  $('note-nosave').hidden = canSave
  fillIcons()
  var hash = (window.location.hash || '').slice(1)
  openTab(TABS.indexOf(hash) >= 0 ? hash : 'hope', { noScroll: true })
  renderAll()

  // 検査用（読み取りだけ）
  window.TsugumiyaShift = {
    autoDraft: function () { return autoDraft(S.hopes) },
    initialDraft: function () { return autoDraft(initialState().hopes) },
    state: function () { return JSON.parse(JSON.stringify(S)) },
    evaluate: function () {
      var e = evaluate(S.hopes, S.draft)
      if (!e) return null
      return {
        gaps: e.gaps.map(function (g) { return { key: g.key, reason: g.reason, n: g.n, need: g.need } }),
        warnings: e.warnings.map(function (w) { return w.text }),
        totals: e.totals.map(function (x) { return { pid: x.pid, days: x.days, w1: x.w1, w2: x.w2, hours: x.hours, yen: x.yen } }),
        sum: e.sum
      }
    },
    canSave: function () { return canSave }
  }
})()
