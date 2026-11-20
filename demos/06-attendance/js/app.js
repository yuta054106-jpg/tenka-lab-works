// カフェ ユメツム（デモ）勤怠・出勤簿の自動集計
// 外部通信なし・保存なし。打刻はこのページの中だけで持ち、再読み込みで最初のデータに戻る
(function () {
  'use strict'

  var MONTH = 11
  var DAYS = 30
  var LAST_DAY = 20 // 打刻がある最後の日
  var WEEK = ['日', '月', '火', '水', '木', '金', '土']
  var FIRST_DOW = 0 // 2026-11-01 は日曜
  var CLOSED_DOW = 2 // 3店舗とも火曜が定休日
  var EDITOR = '店長（架空）'

  // ---------- 架空データ（design.md §13） ----------
  var STORES = [
    { key: 'eki', name: '駅前店' },
    { key: 'koen', name: '公園通り店' },
    { key: 'minato', name: '港町店' }
  ]
  var KINDS = ['社員', 'パート', 'アルバイト']
  function hm (h, m) { return h * 60 + m }
  // dows：出勤する曜日（0=日）
  var STAFF = [
    { id: 'aoki', name: '青木', kind: '社員', store: 'eki', dows: [1, 3, 4, 5, 6], shift: [hm(9, 0), hm(18, 0)], breaks: [[hm(13, 0), hm(14, 0)]], in: hm(8, 50), out: hm(18, 10) },
    { id: 'ishida', name: '石田', kind: '社員', store: 'minato', dows: [4, 5, 6, 0, 1], shift: [hm(12, 0), hm(21, 0)], breaks: [[hm(15, 0), hm(15, 30)], [hm(18, 0), hm(18, 30)]], in: hm(11, 55), out: hm(21, 10) },
    { id: 'ueno', name: '上野', kind: 'パート', store: 'eki', dows: [1, 3, 4, 5], shift: [hm(8, 0), hm(14, 0)], breaks: [[hm(11, 0), hm(11, 30)]], in: hm(7, 55), out: hm(14, 0) },
    { id: 'eguchi', name: '江口', kind: 'パート', store: 'koen', dows: [3, 4, 5, 6, 0], shift: [hm(9, 0), hm(15, 0)], breaks: [[hm(12, 0), hm(12, 30)]], in: hm(8, 55), out: hm(15, 0) },
    { id: 'ogawa', name: '小川', kind: 'パート', store: 'minato', dows: [1, 3, 4, 5], shift: [hm(11, 0), hm(16, 0)], breaks: [], in: hm(10, 55), out: hm(16, 0) },
    { id: 'kawamura', name: '川村', kind: 'アルバイト', store: 'eki', dows: [1, 3, 5, 6], shift: [hm(15, 0), hm(20, 0)], breaks: [], in: hm(14, 55), out: hm(20, 5) },
    { id: 'kinoshita', name: '木下', kind: 'アルバイト', store: 'koen', dows: [1, 5, 6, 0], shift: [hm(12, 0), hm(18, 0)], breaks: [[hm(15, 0), hm(15, 30)]], in: hm(11, 55), out: hm(18, 5) },
    { id: 'kubo', name: '久保', kind: 'アルバイト', store: 'minato', dows: [4, 5, 6, 0], shift: [hm(17, 0), hm(21, 0)], breaks: [], in: hm(16, 55), out: hm(21, 5) }
  ]
  // 例外（いつもの打刻を上書きする。out: null は打刻もれ）
  var EXCEPTIONS = {
    '7-aoki': { store: 'koen' },
    '12-ogawa': { store: 'koen' },
    '18-eguchi': { store: 'eki' },
    '16-kawamura': { out: null },
    '13-ishida': { out: hm(23, 20) },
    '14-kubo': { breaks: [[hm(21, 0), hm(21, 45)]], out: hm(24, 30) },
    '5-ueno': { in: hm(8, 12) },
    '11-eguchi': { in: hm(9, 7) },
    '19-ishida': { in: hm(12, 20) },
    '9-aoki': { out: hm(16, 30) },
    '20-kubo': { out: hm(20, 15) }
  }
  var WEEKS = [
    { key: 'w1', label: '第1週', range: '11/1〜7', from: 1, to: 7 },
    { key: 'w2', label: '第2週', range: '11/8〜14', from: 8, to: 14 },
    { key: 'w3', label: '第3週', range: '11/15〜20', from: 15, to: 20 },
    { key: 'all', label: 'すべて', range: '', from: 1, to: 31 }
  ]

  // ---------- 文字・時刻 ----------
  function esc (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function dow (day) { return (FIRST_DOW + day - 1) % 7 }
  function dayLabel (day) { return MONTH + '/' + day + '（' + WEEK[dow(day)] + '）' }
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  // 時刻（分）→「8:50」「24:30」
  function tm (min) { return min == null ? '' : Math.floor(min / 60) + ':' + pad2(min % 60) }
  // 時間（分）→「8:20」。0 は「—」
  function dur (min) { return min ? Math.floor(min / 60) + ':' + pad2(min % 60) : '—' }
  // 合計欄用。0 も「0:00」
  function durZ (min) { return Math.floor(min / 60) + ':' + pad2(min % 60) }
  function cnt (n, unit) { return n ? n + unit : '—' }
  function storeName (key) { return STORES.filter(function (s) { return s.key === key })[0].name }
  function storeIdx (key) { for (var i = 0; i < STORES.length; i++) if (STORES[i].key === key) return i; return 9 }
  function staffOf (id) { return STAFF.filter(function (s) { return s.id === id })[0] }
  function staffLabel (s) { return s.name + '（' + s.kind + '・' + storeName(s.store) + '）' }
  function brkText (b) { return b && b[0] != null && b[1] != null ? tm(b[0]) + '–' + tm(b[1]) : (b && (b[0] != null || b[1] != null) ? (b[0] != null ? tm(b[0]) : '?') + '–' + (b[1] != null ? tm(b[1]) : '?') : '—') }
  function nowText () {
    var d = new Date()
    return d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
  }

  // ---------- 打刻を作る ----------
  function makePunches () {
    var list = []
    for (var day = 1; day <= LAST_DAY; day++) {
      if (dow(day) === CLOSED_DOW) continue
      STAFF.forEach(function (s) {
        if (s.dows.indexOf(dow(day)) < 0) return
        var p = {
          id: 'd' + day + '-' + s.id, day: day, staff: s.id, store: s.store,
          in: s.in, out: s.out, breaks: s.breaks.map(function (b) { return b.slice() })
        }
        var ex = EXCEPTIONS[day + '-' + s.id]
        if (ex) {
          if ('store' in ex) p.store = ex.store
          if ('in' in ex) p.in = ex.in
          if ('out' in ex) p.out = ex.out
          if ('breaks' in ex) p.breaks = ex.breaks.map(function (b) { return b.slice() })
        }
        list.push(p)
      })
    }
    return list
  }
  var punches = makePunches()
  function sortPunches () {
    punches.sort(function (a, b) {
      return a.day - b.day || storeIdx(a.store) - storeIdx(b.store) ||
        (a.in == null ? 9999 : a.in) - (b.in == null ? 9999 : b.in) ||
        STAFF.indexOf(staffOf(a.staff)) - STAFF.indexOf(staffOf(b.staff))
    })
  }
  sortPunches()
  function findPunch (id) { return punches.filter(function (p) { return p.id === id })[0] }

  // 修正履歴（§13-4。打刻は直した後の値で持つ）
  var history = [{
    at: '2026/11/06 14:20', punchId: 'd6-ueno', day: 6, staff: 'ueno', store: 'eki',
    changes: [{ label: '出勤', before: '8:05', after: '7:55' }],
    reason: '打刻機の時計が10分進んでいた（架空）', by: EDITOR, fresh: false
  }]
  var editedStaff = {} // このページで修正したスタッフ（②で「修正済み」を出す）

  // ---------- 計算 ----------
  var NIGHT = [[0, hm(5, 0)], [hm(22, 0), hm(29, 0)]]
  function overlap (a, b, c, d) { return Math.max(0, Math.min(b, d) - Math.max(a, c)) }
  function nightOf (s, e) {
    return NIGHT.reduce(function (t, n) { return t + overlap(s, e, n[0], n[1]) }, 0)
  }
  function fullBreaks (p) { return p.breaks.filter(function (b) { return b[0] != null && b[1] != null }) }
  function issueOf (p) {
    if (p.in == null) return { text: '出勤の打刻がありません', short: '出勤なし' }
    if (p.out == null) return { text: '退勤の打刻がありません', short: '退勤なし' }
    for (var i = 0; i < p.breaks.length; i++) {
      var b = p.breaks[i]
      if ((b[0] == null) !== (b[1] == null)) {
        return b[1] == null ? { text: '休憩の終了の打刻がありません', short: '休憩の終了なし' } : { text: '休憩の開始の打刻がありません', short: '休憩の開始なし' }
      }
    }
    return null
  }
  function calc (p) {
    var st = staffOf(p.staff)
    var r = { issue: issueOf(p), help: p.store !== st.store, fixed: isFixed(p.id), counted: false, work: 0, brk: 0, ot: 0, night: 0, late: false, early: false }
    if (r.issue) return r
    var fb = fullBreaks(p)
    r.brk = fb.reduce(function (t, b) { return t + b[1] - b[0] }, 0)
    r.work = p.out - p.in - r.brk
    r.ot = Math.max(0, r.work - 480)
    r.night = nightOf(p.in, p.out) - fb.reduce(function (t, b) { return t + nightOf(b[0], b[1]) }, 0)
    r.late = p.in > st.shift[0]
    r.early = p.out < st.shift[1]
    r.counted = true
    return r
  }
  function isFixed (id) { return history.some(function (h) { return h.punchId === id }) }
  function zero () { return { days: 0, work: 0, brk: 0, ot: 0, night: 0, late: 0, early: 0, check: 0, help: 0, helpStores: [], people: 0 } }
  function add (t, c) {
    if (!c.counted) { t.check++; return }
    t.days++; t.work += c.work; t.brk += c.brk; t.ot += c.ot; t.night += c.night
    if (c.late) t.late++
    if (c.early) t.early++
  }
  function staffTotal (id) {
    var t = zero()
    punches.forEach(function (p) {
      if (p.staff !== id) return
      var c = calc(p)
      add(t, c)
      if (c.help) {
        t.help++
        var n = storeName(p.store)
        if (t.helpStores.indexOf(n) < 0) t.helpStores.push(n)
      }
    })
    return t
  }
  function allTotal () {
    var t = zero()
    punches.forEach(function (p) { add(t, calc(p)) })
    return t
  }
  function kindTotal (kind) {
    var t = zero()
    punches.forEach(function (p) { if (staffOf(p.staff).kind === kind) add(t, calc(p)) })
    t.people = STAFF.filter(function (s) { return s.kind === kind }).length
    return t
  }
  function storeTotal (key) {
    var t = zero()
    punches.forEach(function (p) { if (p.store === key) add(t, calc(p)) })
    return t
  }
  function issues () { return punches.filter(function (p) { return issueOf(p) }) }

  // ---------- SVG ----------
  function svg (w, body, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' width="' + w + '" height="' + w + '" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + body + '</svg>' }
  var I_ALERT = svg(14, '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.3v4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="11.4" r="1" fill="currentColor"/>')
  var I_ALERT16 = I_ALERT.replace('width="14" height="14"', 'width="16" height="16"')
  var I_HELP = svg(14, '<path d="M2 5.5h10M9 2.5l3 3-3 3M14 10.5H4M7 7.5l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>')
  var I_CLOCK = svg(14, '<circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.5V8l2.5 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>')
  var I_MOON = svg(14, '<path d="M12.5 10.3A5.6 5.6 0 0 1 5.7 3.5a5.6 5.6 0 1 0 6.8 6.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>')
  var I_PEN = svg(14, '<path d="M10.5 2.5l3 3-8 8H2.5v-3z M9 4l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>')
  var I_CHECK = svg(16, '<path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
  var I_ARROW = svg(12, '<path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', 'h-arrow')
  var I_NEXT = svg(16, '<path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
  var STAMP = '<svg class="stamp" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="見本の印（このデモの出勤簿は見本です）">' +
    '<rect x="1.5" y="1.5" width="53" height="53" rx="4" fill="none" stroke="#B23A2E" stroke-width="3"/>' +
    '<rect x="6.5" y="6.5" width="43" height="43" rx="2" fill="none" stroke="#B23A2E" stroke-width="1"/>' +
    '<text x="28" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">見</text>' +
    '<text x="28" y="45" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">本</text>' +
    '</svg>'

  function tag (kind, icon, text) { return '<span class="tag tag--' + kind + '">' + icon + '<span>' + esc(text) + '</span></span>' }
  function tagsHTML (c) {
    var out = []
    if (c.issue) out.push(tag('warn', I_ALERT, '確認が必要'))
    if (c.late) out.push(tag('bad', I_CLOCK, '遅刻'))
    if (c.early) out.push(tag('bad', I_CLOCK, '早退'))
    if (c.night) out.push(tag('night', I_MOON, '深夜 ' + dur(c.night)))
    if (c.fixed) out.push(tag('fixed', I_PEN, '修正済み'))
    return out.join('')
  }

  // ---------- 要素 ----------
  var $ = function (id) { return document.getElementById(id) }
  var mqPC = window.matchMedia('(min-width: 1024px)')
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  var elStatus = $('sr-status')
  function announce (msg) {
    elStatus.textContent = ''
    window.setTimeout(function () { elStatus.textContent = msg }, 50)
  }

  // ---------- タブ ----------
  var TABS = ['punch', 'summary', 'roster']
  var curTab = 'punch'
  var tabsBar = $('tabs-bar')
  function setTab (key, opts) {
    opts = opts || {}
    curTab = key
    TABS.forEach(function (k) {
      var t = $('tab-' + k)
      var on = k === key
      t.setAttribute('aria-selected', on ? 'true' : 'false')
      t.tabIndex = on ? 0 : -1
      $('panel-' + k).hidden = !on
    })
    if (key === 'summary') renderSummary()
    if (key === 'roster') renderRoster()
    if (opts.focus) $('tab-' + key).focus()
    if (!opts.noHash && window.history.replaceState) window.history.replaceState(null, '', '#' + key)
    if (!opts.noScroll) {
      // 帯より下まで読み進めていたら、帯の下端まで戻す
      var barTop = tabsAnchor()
      if (window.pageYOffset > barTop) window.scrollTo({ top: barTop, behavior: reduceMotion.matches ? 'auto' : 'smooth' })
    }
  }
  // タブの帯が貼りつき始める位置
  function tabsAnchor () {
    var prev = tabsBar.previousElementSibling
    return prev.getBoundingClientRect().bottom + window.pageYOffset
  }
  document.querySelector('[role="tablist"]').addEventListener('click', function (e) {
    var t = e.target.closest('[role="tab"]')
    if (t) setTab(t.dataset.tab)
  })
  document.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
    var i = TABS.indexOf(curTab)
    var n = null
    if (e.key === 'ArrowRight') n = TABS[(i + 1) % 3]
    else if (e.key === 'ArrowLeft') n = TABS[(i + 2) % 3]
    else if (e.key === 'Home') n = TABS[0]
    else if (e.key === 'End') n = TABS[2]
    if (n) { e.preventDefault(); setTab(n, { focus: true }) }
  })

  // ---------- ① 確認が必要の帯・タブのバッジ ----------
  function renderBadge () {
    var n = issues().length
    var b = $('tab-badge')
    b.hidden = !n
    b.textContent = n ? '要確認 ' + n : ''
  }
  function issueSentence (list) {
    var first = list[0]
    return '確認が必要な打刻が' + list.length + '件あります（' + MONTH + '/' + first.day + ' ' + staffOf(first.staff).name + '・' + issueOf(first).text + (list.length > 1 ? ' ほか' : '') + '）'
  }
  function renderCheckBand () {
    var list = issues()
    var el = $('check-band')
    if (!list.length) {
      el.innerHTML = '<p class="ok-band">' + I_CHECK + '確認が必要な打刻はありません</p>'
      return
    }
    el.innerHTML = '<div class="warn-band"><p class="warn-band__text">' + I_ALERT16 + '<span>' + esc(issueSentence(list)) + '</span></p>' +
      '<button type="button" class="btn-sub btn-sub--warn" data-jump="' + esc(list[0].id) + '">この打刻を見る</button></div>'
  }

  // ---------- ① 絞り込み ----------
  var fWeek = 'w3'
  var fStore = 'all'
  var fStaff = 'all'
  function segHTML (key, cur, label, sub) {
    var on = key === cur
    return '<button type="button" role="radio" class="seg" data-key="' + key + '" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '">' +
      '<span class="seg__label">' + esc(label) + '</span>' + (sub ? '<span class="seg__n">' + esc(sub) + '</span>' : '') + '</button>'
  }
  function renderFilters () {
    $('f-week').innerHTML = WEEKS.map(function (w) { return segHTML(w.key, fWeek, w.label, w.range) }).join('')
    $('f-store').innerHTML = segHTML('all', fStore, 'すべて') + STORES.map(function (s) { return segHTML(s.key, fStore, s.name) }).join('')
  }
  function initStaffSelect () {
    $('f-staff').innerHTML = '<option value="all">すべて</option>' + STAFF.map(function (s) {
      return '<option value="' + s.id + '">' + esc(staffLabel(s)) + '</option>'
    }).join('')
    $('r-staff').innerHTML = STAFF.map(function (s) {
      return '<option value="' + s.id + '">' + esc(staffLabel(s)) + '</option>'
    }).join('')
  }
  function radioGroup (el, set) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.seg')
      if (b) set(b.dataset.key, false)
    })
    el.addEventListener('keydown', function (e) {
      var keys = Array.prototype.map.call(el.querySelectorAll('.seg'), function (b) { return b.dataset.key })
      var cur = el.querySelector('[aria-checked="true"]').dataset.key
      var i = keys.indexOf(cur)
      var n = null
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = keys[(i + 1) % keys.length]
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = keys[(i + keys.length - 1) % keys.length]
      if (n) { e.preventDefault(); set(n, true) }
    })
  }
  radioGroup($('f-week'), function (k, focus) { fWeek = k; renderFilters(); renderPunches(); if (focus) $('f-week').querySelector('[data-key="' + k + '"]').focus() })
  radioGroup($('f-store'), function (k, focus) { fStore = k; renderFilters(); renderPunches(); if (focus) $('f-store').querySelector('[data-key="' + k + '"]').focus() })
  $('f-staff').addEventListener('change', function () { fStaff = this.value; renderPunches() })

  function visiblePunches () {
    var w = WEEKS.filter(function (x) { return x.key === fWeek })[0]
    return punches.filter(function (p) {
      return p.day >= w.from && p.day <= w.to && (fStore === 'all' || p.store === fStore) && (fStaff === 'all' || p.staff === fStaff)
    })
  }

  // ---------- ① 打刻の一覧 ----------
  function outHTML (p) {
    if (p.out == null) return '<span class="none">—</span>'
    var s = esc(tm(p.out))
    if (p.out >= 1440) {
      s += '<span class="visually-hidden">（翌日の' + Math.floor((p.out - 1440) / 60) + '時' + (p.out % 60) + '分）</span><span class="next-day" aria-hidden="true">翌' + esc(tm(p.out - 1440)) + '</span>'
    }
    return s
  }
  function breaksHTML (p) {
    var list = p.breaks.filter(function (b) { return b[0] != null || b[1] != null })
    if (!list.length) return '<span class="none">—</span>'
    return list.map(function (b) { return '<span class="brk">' + esc(brkText(b)) + '</span>' }).join('')
  }
  function storeCellHTML (p, c) {
    var st = staffOf(p.staff)
    return esc(storeName(p.store)) + (c.help ? '<span class="help-line">' + tag('help', I_HELP, '応援') + '<span class="sub-s">所属：' + esc(storeName(st.store)) + '</span></span>' : '')
  }
  function editBtn (p, cls) {
    var st = staffOf(p.staff)
    return '<button type="button" class="' + cls + '" data-edit="' + esc(p.id) + '" aria-label="' + esc(MONTH + '/' + p.day + ' ' + st.name + 'の打刻を修正') + '">' + I_PEN + '<span>修正</span></button>'
  }
  function groupByDay (list) {
    var g = []
    list.forEach(function (p) {
      if (!g.length || g[g.length - 1].day !== p.day) g.push({ day: p.day, items: [] })
      g[g.length - 1].items.push(p)
    })
    return g
  }
  function emptyHTML () {
    return '<div class="empty-box"><p class="empty-box__title">この条件の打刻はありません</p><button type="button" class="linkish" id="clear-filter">絞り込みを外す</button></div>'
  }
  function renderPunches () {
    var list = visiblePunches()
    $('punch-count').textContent = punches.length + '件中 ' + list.length + '件を表示'
    var el = $('punch-list')
    if (!list.length) { el.innerHTML = emptyHTML(); return }
    var groups = groupByDay(list)
    if (mqPC.matches) {
      el.innerHTML = '<table class="ptable"><colgroup><col class="c-staff"><col class="c-store"><col class="c-in"><col class="c-brk"><col class="c-out"><col class="c-work"><col class="c-tags"><col class="c-edit"></colgroup>' +
        '<thead><tr><th scope="col">スタッフ</th><th scope="col">店舗</th><th scope="col" class="num">出勤</th><th scope="col" class="num">休憩</th><th scope="col" class="num">退勤</th><th scope="col" class="num">実働</th><th scope="col">印</th><th scope="col"><span class="visually-hidden">修正</span></th></tr></thead>' +
        groups.map(function (g) {
          return '<tbody><tr class="dayrow"><th scope="rowgroup" colspan="8">' + esc(dayLabel(g.day)) + '</th></tr>' +
            g.items.map(function (p) {
              var st = staffOf(p.staff)
              var c = calc(p)
              return '<tr id="row-' + esc(p.id) + '" class="prow' + (c.issue ? ' is-issue' : '') + '" tabindex="-1">' +
                '<td><span class="nm">' + esc(st.name) + '</span><span class="sub-s">' + esc(st.kind) + '</span></td>' +
                '<td>' + storeCellHTML(p, c) + '</td>' +
                '<td class="num">' + (p.in == null ? '<span class="none">—</span>' : esc(tm(p.in))) + '</td>' +
                '<td class="num">' + breaksHTML(p) + '</td>' +
                '<td class="num">' + outHTML(p) + '</td>' +
                '<td class="num strong">' + (c.counted ? esc(dur(c.work)) : '<span class="none">—</span>') + '</td>' +
                '<td><span class="tags">' + tagsHTML(c) + '</span>' + (c.issue ? '<span class="issue-text">' + esc(c.issue.text) + '</span>' : '') + '</td>' +
                '<td class="edit-cell">' + editBtn(p, 'btn-edit') + '</td></tr>'
            }).join('') + '</tbody>'
        }).join('') + '</table>'
    } else {
      el.innerHTML = groups.map(function (g) {
        return '<section class="pday" aria-label="' + esc(dayLabel(g.day)) + '"><h3 class="pday__h">' + esc(dayLabel(g.day)) + '</h3><div class="pcards">' +
          g.items.map(function (p) {
            var st = staffOf(p.staff)
            var c = calc(p)
            var tags = tagsHTML(c) + (c.help ? tag('help', I_HELP, '応援') : '')
            return '<article id="row-' + esc(p.id) + '" class="pcard' + (c.issue ? ' is-issue' : '') + '" tabindex="-1" aria-label="' + esc(dayLabel(p.day) + ' ' + st.name) + '">' +
              '<div class="pcard__top"><p><span class="nm">' + esc(st.name) + '</span> <span class="sub-s">' + esc(st.kind) + '</span></p><p class="pcard__store">' + esc(storeName(p.store)) + '</p></div>' +
              (tags ? '<p class="pcard__tags">' + tags + (c.issue ? '<span class="issue-text">' + esc(c.issue.text) + '</span>' : '') + (c.help ? '<span class="sub-s">所属：' + esc(storeName(st.store)) + '</span>' : '') + '</p>' : '') +
              '<dl class="pcard__times"><div><dt>出勤</dt><dd>' + (p.in == null ? '<span class="none">—</span>' : esc(tm(p.in))) + '</dd></div>' +
              '<div><dt>休憩</dt><dd>' + breaksHTML(p) + '</dd></div>' +
              '<div><dt>退勤</dt><dd>' + outHTML(p) + '</dd></div></dl>' +
              '<div class="pcard__foot"><p>実働 <strong>' + (c.counted ? esc(dur(c.work)) : '—') + '</strong></p>' + editBtn(p, 'btn-edit btn-edit--sp') + '</div>' +
              '</article>'
          }).join('') + '</div></section>'
      }).join('')
    }
  }
  $('punch-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-edit]')
    if (b) { openEdit(b.dataset.edit, b); return }
    if (e.target.id === 'clear-filter') {
      fWeek = 'all'; fStore = 'all'; fStaff = 'all'; $('f-staff').value = 'all'
      renderFilters(); renderPunches()
      $('f-week').querySelector('[aria-checked="true"]').focus()
    }
  })

  // 確認が必要な行へ
  function jumpTo (id) {
    var p = findPunch(id)
    if (!p) return
    if (curTab !== 'punch') setTab('punch', { noScroll: true })
    fWeek = WEEKS.filter(function (w) { return w.key !== 'all' && p.day >= w.from && p.day <= w.to })[0].key
    fStore = 'all'; fStaff = 'all'; $('f-staff').value = 'all'
    renderFilters(); renderPunches()
    var row = $('row-' + id)
    if (!row) return
    var rect = row.getBoundingClientRect()
    var y = rect.top + window.pageYOffset - window.innerHeight / 2 + rect.height / 2
    window.scrollTo({ top: Math.max(0, y), behavior: 'auto' })
    row.focus({ preventScroll: true })
    row.classList.remove('is-flash', 'is-mark')
    void row.offsetWidth
    row.classList.add(reduceMotion.matches ? 'is-mark' : 'is-flash')
  }
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-jump]')
    if (j) { e.preventDefault(); jumpTo(j.dataset.jump) }
  })

  // ---------- ① 修正履歴 ----------
  function changeHTML (ch) {
    return '<span class="chg"><span class="chg__l">' + esc(ch.label) + '</span><span class="chg__b">' + esc(ch.before) + '</span>' + I_ARROW + '<span class="visually-hidden">から</span><strong class="chg__a">' + esc(ch.after) + '</strong></span>'
  }
  function renderHistory () {
    $('history-count').textContent = '（' + history.length + '件）'
    var el = $('history-list')
    if (mqPC.matches) {
      el.innerHTML = '<table class="htable"><colgroup><col class="c-at"><col class="c-target"><col><col class="c-reason"><col class="c-by"></colgroup>' +
        '<thead><tr><th scope="col">修正した日時</th><th scope="col">対象</th><th scope="col">直した所（前 → 後）</th><th scope="col">理由</th><th scope="col">修正した人</th></tr></thead><tbody>' +
        history.map(function (h, i) {
          return '<tr class="' + (h.fresh && i === 0 ? 'is-new' : '') + '"><td>' + esc(h.at) + '</td><td>' + esc(dayLabel(h.day) + ' ' + staffOf(h.staff).name + '・' + storeName(h.store)) + '</td>' +
            '<td>' + h.changes.map(changeHTML).join('') + '</td><td class="h-reason"></td><td>' + esc(h.by) + '</td></tr>'
        }).join('') + '</tbody></table>'
    } else {
      el.innerHTML = '<ol class="hlist">' + history.map(function (h, i) {
        return '<li class="' + (h.fresh && i === 0 ? 'is-new' : '') + '"><p class="hlist__meta">' + esc(h.at + ' ・ ' + h.by) + '</p>' +
          '<p class="hlist__target">' + esc(dayLabel(h.day) + ' ' + staffOf(h.staff).name + '・' + storeName(h.store)) + '</p>' +
          '<p class="hlist__chg">' + h.changes.map(changeHTML).join('') + '</p>' +
          '<p class="hlist__reason">理由：<span class="h-reason"></span></p></li>'
      }).join('') + '</ol>'
    }
    // 理由は利用者の入力なので textContent で入れる
    var cells = el.querySelectorAll('.h-reason')
    history.forEach(function (h, i) { cells[i].textContent = h.reason })
  }

  // ---------- ② 月の集計 ----------
  function renderSummary () {
    var all = allTotal()
    var iss = issues()
    $('kpis').innerHTML =
      kpi('実働の合計', durZ(all.work), STAFF.length + '人・' + all.days + '日分') +
      kpi('残業の合計', durZ(all.ot), '1日8時間超') +
      kpi('深夜の合計', durZ(all.night), '22時〜翌5時') +
      (iss.length
        ? '<div class="kpi kpi--warn"><p class="kpi__h">確認が必要</p><p class="kpi__v">' + iss.length + '件</p><p class="kpi__s"><a href="#punch" data-jump="' + esc(iss[0].id) + '">打刻を見る</a>（集計に未算入）</p></div>'
        : '<div class="kpi kpi--ok"><p class="kpi__h">確認が必要</p><p class="kpi__v">0件</p><p class="kpi__s">すべて集計済み</p></div>')

    var order = STAFF.slice().sort(function (a, b) {
      return KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || storeIdx(a.store) - storeIdx(b.store)
    })
    var rows = order.map(function (s) { return { s: s, t: staffTotal(s.id) } })
    var el = $('staff-list')
    if (mqPC.matches) {
      el.innerHTML = '<table class="stable"><colgroup><col class="c-staff"><col class="c-home"><col class="c-days"><col class="c-w"><col class="c-b"><col class="c-o"><col class="c-n"><col class="c-l"><col class="c-e"><col></colgroup>' +
        '<thead><tr><th scope="col">スタッフ</th><th scope="col">所属</th><th scope="col" class="num">出勤日数</th><th scope="col" class="num">実働</th><th scope="col" class="num">休憩</th><th scope="col" class="num">残業</th><th scope="col" class="num">深夜</th><th scope="col" class="num">遅刻</th><th scope="col" class="num">早退</th><th scope="col">確認が必要</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var s = r.s, t = r.t
          return '<tr data-staff="' + s.id + '"><th scope="row"><span class="nm-line"><a href="#roster" class="nm" data-roster="' + s.id + '" aria-label="' + esc(s.name + 'の出勤簿を開く') + '">' + esc(s.name) + '</a>' + (editedStaff[s.id] ? tag('fixed', I_PEN, '修正済み') : '') + '</span><span class="sub-s">' + esc(s.kind) + '</span></th>' +
            '<td>' + esc(storeName(s.store)) + (t.help ? '<span class="help-days">応援 ' + t.help + '日</span>' : '') + '</td>' +
            '<td class="num">' + t.days + '日</td><td class="num strong">' + dur(t.work) + '</td><td class="num">' + dur(t.brk) + '</td>' +
            '<td class="num">' + dur(t.ot) + '</td><td class="num">' + dur(t.night) + '</td><td class="num">' + cnt(t.late, '回') + '</td><td class="num">' + cnt(t.early, '回') + '</td>' +
            '<td>' + (t.check ? tag('warn', I_ALERT, '確認が必要') + ' <span class="strong">' + t.check + '件</span>' : '<span class="none">—</span>') + '</td></tr>'
        }).join('') +
        '</tbody><tfoot><tr class="total"><th scope="row">合計</th><td></td><td class="num">' + all.days + '日</td><td class="num">' + durZ(all.work) + '</td><td class="num">' + durZ(all.brk) + '</td><td class="num">' + durZ(all.ot) + '</td><td class="num">' + durZ(all.night) + '</td><td class="num">' + all.late + '回</td><td class="num">' + all.early + '回</td><td>' + all.check + '件</td></tr></tfoot></table>'
    } else {
      el.innerHTML = '<div class="scards">' + rows.map(function (r) {
        var s = r.s, t = r.t
        return '<article class="scard" data-staff="' + s.id + '"><div class="scard__top"><p class="scard__who"><span class="nm">' + esc(s.name) + '</span> <span class="sub-s">' + esc(s.kind) + ' ・ ' + esc(storeName(s.store)) + '</span>' + (editedStaff[s.id] ? ' ' + tag('fixed', I_PEN, '修正済み') : '') + (t.help ? ' <span class="help-days">応援 ' + t.help + '日</span>' : '') + '</p>' +
          '<button type="button" class="btn-sub btn-sub--s" data-roster="' + s.id + '" aria-label="' + esc(s.name + 'の出勤簿を開く') + '">出勤簿' + I_NEXT + '</button></div>' +
          (t.check ? '<p class="scard__issue">' + tag('warn', I_ALERT, '確認が必要 ' + t.check + '件') + '<span>' + esc(issueDays(s.id)) + ' は集計に入っていません</span></p>' : '') +
          '<dl class="scard__dl"><div><dt>出勤日数</dt><dd>' + t.days + '日</dd></div><div><dt>実働</dt><dd>' + dur(t.work) + '</dd></div>' +
          '<div><dt>残業</dt><dd>' + dur(t.ot) + '</dd></div><div><dt>深夜</dt><dd>' + dur(t.night) + '</dd></div>' +
          '<div><dt>遅刻</dt><dd>' + cnt(t.late, '回') + '</dd></div><div><dt>早退</dt><dd>' + cnt(t.early, '回') + '</dd></div></dl>' +
          '<p class="scard__brk">休憩 ' + dur(t.brk) + '</p></article>'
      }).join('') + '</div>' +
        '<div class="scard-total"><p class="scard-total__h">合計（8人）</p><p>出勤 ' + all.days + '日・実働 <strong>' + durZ(all.work) + '</strong>・休憩 ' + durZ(all.brk) + '・残業 ' + durZ(all.ot) + '・深夜 ' + durZ(all.night) + '・遅刻 ' + all.late + '回・早退 ' + all.early + '回・確認が必要 ' + all.check + '件</p></div>'
    }

    var kRows = KINDS.map(function (k) { return { name: k, t: kindTotal(k) } })
    var sRows = STORES.map(function (s) { return { name: s.name, t: storeTotal(s.key) } })
    $('groups').innerHTML =
      '<div class="group"><h3 class="group__h" id="h-kind">雇用区分別</h3><table class="gtable" aria-labelledby="h-kind"><thead><tr><th scope="col">区分</th><th scope="col" class="num">人数</th><th scope="col" class="num">出勤<br>（人日）</th><th scope="col" class="num">実働</th><th scope="col" class="num">残業</th><th scope="col" class="num">深夜</th></tr></thead><tbody>' +
      kRows.map(function (r) { return '<tr><th scope="row">' + esc(r.name) + '</th><td class="num">' + r.t.people + '</td><td class="num">' + r.t.days + '</td><td class="num">' + durZ(r.t.work) + '</td><td class="num">' + durZ(r.t.ot) + '</td><td class="num">' + durZ(r.t.night) + '</td></tr>' }).join('') +
      '</tbody><tfoot><tr class="total"><th scope="row">全体</th><td class="num">' + STAFF.length + '</td><td class="num">' + all.days + '</td><td class="num">' + durZ(all.work) + '</td><td class="num">' + durZ(all.ot) + '</td><td class="num">' + durZ(all.night) + '</td></tr></tfoot></table></div>' +
      '<div class="group"><h3 class="group__h" id="h-store">店舗別（働いた店舗で計算）</h3><table class="gtable gtable--store" aria-labelledby="h-store"><thead><tr><th scope="col">店舗</th><th scope="col" class="num">出勤<br>（人日）</th><th scope="col" class="num">実働</th><th scope="col" class="num">残業</th><th scope="col" class="num">深夜</th></tr></thead><tbody>' +
      sRows.map(function (r) { return '<tr><th scope="row">' + esc(r.name) + '</th><td class="num">' + r.t.days + '</td><td class="num">' + durZ(r.t.work) + '</td><td class="num">' + durZ(r.t.ot) + '</td><td class="num">' + durZ(r.t.night) + '</td></tr>' }).join('') +
      '</tbody><tfoot><tr class="total"><th scope="row">全体</th><td class="num">' + all.days + '</td><td class="num">' + durZ(all.work) + '</td><td class="num">' + durZ(all.ot) + '</td><td class="num">' + durZ(all.night) + '</td></tr></tfoot></table>' +
      '<p class="group__note">応援で働いた時間は、応援先の店舗に数えます。</p></div>'
  }
  function kpi (h, v, s) { return '<div class="kpi"><p class="kpi__h">' + esc(h) + '</p><p class="kpi__v">' + esc(v) + '</p><p class="kpi__s">' + esc(s) + '</p></div>' }
  function issueDays (staffId) {
    return punches.filter(function (p) { return p.staff === staffId && issueOf(p) }).map(function (p) { return MONTH + '/' + p.day }).join('・')
  }
  $('panel-summary').addEventListener('click', function (e) {
    var a = e.target.closest('[data-roster]')
    if (!a) return
    e.preventDefault()
    rStaff = a.dataset.roster
    $('r-staff').value = rStaff
    setTab('roster')
    $('r-staff').focus()
  })

  // ---------- ③ 出勤簿 ----------
  var rStaff = 'ishida'
  function renderRoster () {
    var s = staffOf(rStaff)
    var t = staffTotal(s.id)
    var mine = punches.filter(function (p) { return p.staff === s.id })
    var iss = mine.filter(function (p) { return issueOf(p) })
    $('roster-warn').innerHTML = iss.length
      ? '<div class="warn-band"><p class="warn-band__text">' + I_ALERT16 + '<span>' + esc('確認が必要な日があります（' + iss.map(function (p) { return MONTH + '/' + p.day }).join('・') + '）。直してから印刷するのがおすすめです。') + '</span></p>' +
        '<button type="button" class="btn-sub btn-sub--warn" data-jump="' + esc(iss[0].id) + '">この打刻を見る</button></div>'
      : ''
    var schedBrk = s.breaks.reduce(function (a, b) { return a + b[1] - b[0] }, 0)
    var overnight = false
    var rows = ''
    for (var d = 1; d <= DAYS; d++) {
      var w = dow(d)
      var p = mine.filter(function (x) { return x.day === d })[0]
      var we = (w === 0 || w === 6) ? ' we' : ''
      var cells = ['', '', '', '', '', '', '', '']
      var note = ''
      var bold = false
      if (p) {
        var c = calc(p)
        cells[0] = storeName(p.store)
        cells[1] = p.in == null ? '' : tm(p.in)
        var notes = []
        if (c.help) notes.push('応援（' + storeName(p.store) + '）')
        if (c.counted) {
          cells[2] = tm(p.out)
          if (p.out >= 1440) overnight = true
          cells[3] = c.brk ? dur(c.brk) : ''
          cells[4] = dur(c.work)
          cells[5] = c.ot ? dur(c.ot) : ''
          cells[6] = c.night ? dur(c.night) : ''
          if (c.late) notes.push('遅刻')
          if (c.early) notes.push('早退')
          if (c.night) notes.push('深夜あり')
        } else {
          bold = true
          notes.push('確認が必要（' + c.issue.short + '）')
        }
        if (c.fixed) notes.push('修正済み')
        note = notes.join('・')
      } else if (w === CLOSED_DOW) {
        note = '<span class="p-closed">定休日</span>'
      }
      rows += '<tr><td class="c' + we + '">' + d + '</td><td class="c' + we + '">' + WEEK[w] + '</td>' +
        '<td>' + esc(cells[0]) + '</td><td class="num">' + esc(cells[1]) + '</td><td class="num">' + esc(cells[2]) + '</td><td class="num">' + esc(cells[3]) + '</td>' +
        '<td class="num">' + esc(cells[4]) + '</td><td class="num">' + esc(cells[5]) + '</td><td class="num">' + esc(cells[6]) + '</td>' +
        '<td' + (bold ? ' class="b"' : '') + '>' + (note.indexOf('<span') === 0 ? note : esc(note)) + '</td></tr>'
    }
    var box = function (h, v) { return '<div><dt>' + h + '</dt><dd>' + esc(v) + '</dd></div>' }
    $('paper').innerHTML = '<article class="paper" aria-labelledby="r-title">' +
      '<h2 class="r-title" id="r-title">出勤簿</h2>' +
      '<div class="r-head"><dl class="r-meta">' +
        '<div><dt>対象月</dt><dd>2026年11月（1日〜30日）</dd></div>' +
        '<div><dt>氏　名</dt><dd class="r-name">' + esc(s.name) + '（' + esc(s.kind) + '）</dd></div>' +
        '<div><dt>所　属</dt><dd>' + esc(storeName(s.store)) + (t.help ? '<span class="r-help">（応援 ' + t.help + '日：' + esc(t.helpStores.join('・')) + '）</span>' : '') +
          '<span class="r-shift">シフト ' + esc(tm(s.shift[0]) + '〜' + tm(s.shift[1])) + '（' + (schedBrk ? '休憩 ' + schedBrk + '分' : '休憩なし') + '）</span></dd></div>' +
      '</dl><div class="r-from"><p class="r-from__name">カフェ ユメツム</p><p class="r-from__store">' + esc(storeName(s.store)) + '</p>' + STAMP + '</div></div>' +
      '<dl class="r-sum">' + box('出勤日数', t.days + '日') + box('実働', dur(t.work)) + box('休憩', dur(t.brk)) + box('残業', dur(t.ot)) + box('深夜', dur(t.night)) +
        box('遅刻', cnt(t.late, '回')) + box('早退', cnt(t.early, '回')) + box('確認が必要', cnt(t.check, '件')) + '</dl>' +
      '<div class="roster-scroll"><table class="r-table"><colgroup><col class="w-d"><col class="w-w"><col class="w-st"><col class="w-t"><col class="w-t"><col class="w-t"><col class="w-t"><col class="w-t"><col class="w-t"><col class="w-n"></colgroup>' +
        '<thead><tr><th scope="col" class="c">日</th><th scope="col" class="c">曜</th><th scope="col">勤務店</th><th scope="col" class="num">出勤</th><th scope="col" class="num">退勤</th><th scope="col" class="num">休憩</th><th scope="col" class="num">実働</th><th scope="col" class="num">残業</th><th scope="col" class="num">深夜</th><th scope="col">備考</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr><th scope="row" colspan="5" class="c-total">合計</th><td class="num">' + (t.brk ? dur(t.brk) : '') + '</td><td class="num">' + (t.work ? dur(t.work) : '') + '</td><td class="num">' + (t.ot ? dur(t.ot) : '') + '</td><td class="num">' + (t.night ? dur(t.night) : '') + '</td><td></td></tr></tfoot>' +
      '</table></div>' +
      '<p class="r-note">※ 11月21日以降は、まだ打刻がないため空欄です。<br>※ 実働＝退勤−出勤−休憩（1分単位）。残業（1日8時間超）・深夜（22時〜翌5時）の数え方は、この見本の仮定です。' + (overnight ? '<br>※ 24:30 は翌日の0:30 を表します。' : '') + '</p>' +
      '<div class="r-checks"><div><p>本人確認</p><span></span></div><div><p>店長確認</p><span></span></div></div>' +
      '<p class="r-foot">この出勤簿は TENKA LAB の制作見本です。お店・スタッフ・時間はすべて架空です。</p>' +
      '</article>'
  }
  $('r-staff').addEventListener('change', function () { rStaff = this.value; renderRoster() })
  var baseTitle = document.title
  $('print-btn').addEventListener('click', function () { window.print() })
  window.addEventListener('beforeprint', function () { document.title = '出勤簿_見本_2026年11月_' + staffOf(rStaff).name; renderRoster() })
  window.addEventListener('afterprint', function () { document.title = baseTitle })

  // ---------- 修正のダイアログ ----------
  var dlg = $('edit-dialog')
  var editing = null
  var opener = null
  var FIELDS = [
    { key: 'in', label: '出勤' },
    { key: 'b0s', label: '休憩1 開始', pair: 'b0' },
    { key: 'b0e', label: '休憩1 終了', pair: 'b0' },
    { key: 'b1s', label: '休憩2 開始', pair: 'b1' },
    { key: 'b1e', label: '休憩2 終了', pair: 'b1' },
    { key: 'out', label: '退勤' }
  ]
  function valsOf (p) {
    var b0 = p.breaks[0] || [null, null]
    var b1 = p.breaks[1] || [null, null]
    return { in: p.in, b0s: b0[0], b0e: b0[1], b1s: b1[0], b1e: b1[1], out: p.out }
  }
  // 「2005」「20:05」「20：05」「２０：０５」→ 分。空は null、形が違えば NaN
  function parseTime (s) {
    var v = String(s).replace(/[０-９：]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) }).replace(/[\s　]/g, '')
    if (v === '') return null
    var m = v.match(/^(\d{1,2}):(\d{2})$/) || v.match(/^(\d{1,2})(\d{2})$/)
    if (!m) return NaN
    var h = Number(m[1]), mi = Number(m[2])
    if (h > 29 || mi > 59) return NaN
    return h * 60 + mi
  }
  function timeRow (label, ids, before, hint) {
    var inputs = ids.map(function (id, i) {
      var sub = ids.length > 1 ? (i === 0 ? '開始' : '終了') : ''
      return (i ? '<span class="dash" aria-hidden="true">–</span>' : '') +
        '<input type="text" inputmode="numeric" autocomplete="off" class="tin" id="in-' + id + '" data-k="' + id + '"' + (sub ? ' placeholder="' + sub + '" aria-label="' + esc(label + 'の' + sub) + '"' : '') + ' aria-describedby="err-' + ids[0] + (hint ? ' ' + hint : '') + '">'
    }).join('')
    return '<div class="trow"><' + (ids.length > 1 ? 'span' : 'label for="in-' + ids[0] + '"') + ' class="trow__l">' + esc(label) + '</' + (ids.length > 1 ? 'span' : 'label') + '>' +
      '<div class="trow__in">' + inputs + '</div><span class="trow__before">修正前 ' + esc(before) + '</span>' +
      '<p class="ferr trow__err" id="err-' + ids[0] + '" hidden></p></div>'
  }
  function openEdit (id, btn) {
    var p = findPunch(id)
    if (!p) return
    editing = p
    opener = btn
    var st = staffOf(p.staff)
    var v = valsOf(p)
    $('edit-target').textContent = dayLabel(p.day) + '・' + st.name + '（' + st.kind + '）・' + storeName(p.store)
    $('edit-shift').textContent = 'シフト ' + tm(st.shift[0]) + '〜' + tm(st.shift[1])
    $('edit-times').innerHTML =
      timeRow('出勤', ['in'], v.in == null ? '—（打刻なし）' : tm(v.in)) +
      timeRow('休憩1', ['b0s', 'b0e'], brkText([v.b0s, v.b0e])) +
      timeRow('休憩2', ['b1s', 'b1e'], brkText([v.b1s, v.b1e])) +
      timeRow('退勤', ['out'], v.out == null ? '—（打刻なし）' : tm(v.out))
    FIELDS.forEach(function (f) { $('in-' + f.key).value = v[f.key] == null ? '' : tm(v[f.key]) })
    $('edit-reason').value = ''
    clearErrors()
    updateLen()
    updatePreview()
    dlg.showModal()
    var first = p.out == null ? $('in-out') : $('in-in')
    first.focus()
  }
  function closeEdit () {
    if (dlg.open) dlg.close()
  }
  dlg.addEventListener('close', function () {
    editing = null
    if (opener && document.body.contains(opener)) opener.focus()
  })
  dlg.addEventListener('cancel', function () { /* Esc は閉じてよい（内容は捨てる） */ })
  $('edit-x').addEventListener('click', closeEdit)
  $('edit-cancel').addEventListener('click', closeEdit)

  function readForm () {
    var r = {}
    FIELDS.forEach(function (f) { r[f.key] = parseTime($('in-' + f.key).value) })
    return r
  }
  function setErr (id, msg, inputs) {
    var p = $(id)
    p.hidden = !msg
    p.innerHTML = msg ? I_ALERT + '<span>' + esc(msg) + '</span>' : ''
    ;(inputs || []).forEach(function (inp) {
      if (msg) inp.setAttribute('aria-invalid', 'true')
      else inp.removeAttribute('aria-invalid')
    })
  }
  function clearErrors () {
    ['err-in', 'err-b0s', 'err-b1s', 'err-out', 'err-reason', 'err-form'].forEach(function (id) { setErr(id, '') })
    dlg.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid') })
  }
  // 入力を確かめる。エラーの一覧を返す（{ errId, inputs, msg }）
  function validate (v) {
    var errs = []
    var FMT = '「20:05」のように、時:分で入れてください'
    function inp (k) { return $('in-' + k) }
    // 形
    var bad = {}
    FIELDS.forEach(function (f) { if (Number.isNaN(v[f.key])) bad[f.key] = true })
    if (bad.in) errs.push({ errId: 'err-in', inputs: [inp('in')], msg: FMT })
    else if (v.in == null) errs.push({ errId: 'err-in', inputs: [inp('in')], msg: '出勤の時刻を入れてください' })
    var outOk = !bad.out
    if (bad.out) errs.push({ errId: 'err-out', inputs: [inp('out')], msg: FMT })
    else if (v.out != null && v.in != null && !bad.in && v.out <= v.in) { errs.push({ errId: 'err-out', inputs: [inp('out')], msg: '退勤は出勤より後の時刻にしてください' }); outOk = false }
    var brs = []
    ;['b0', 'b1'].forEach(function (b) {
      var s = v[b + 's'], e = v[b + 'e']
      var ins = [inp(b + 's'), inp(b + 'e')]
      if (bad[b + 's'] || bad[b + 'e']) { errs.push({ errId: 'err-' + b + 's', inputs: ins.filter(function (x) { return bad[x.dataset.k] }), msg: FMT }); return }
      if ((s == null) !== (e == null)) { errs.push({ errId: 'err-' + b + 's', inputs: ins.filter(function (x) { return v[x.dataset.k] == null }), msg: '休憩は開始と終了の両方を入れてください' }); return }
      if (s == null) return
      brs.push({ b: b, s: s, e: e, ins: ins })
    })
    if (v.in != null && !bad.in) {
      var lastOk = brs.slice()
      lastOk.forEach(function (x, i) {
        var outside = x.e <= x.s || x.s < v.in || (outOk && v.out != null && x.e > v.out)
        var overlapPrev = i > 0 && overlap(x.s, x.e, lastOk[0].s, lastOk[0].e) > 0
        if (outside || overlapPrev) errs.push({ errId: 'err-' + x.b + 's', inputs: x.ins, msg: '休憩は出勤と退勤の間に、重ならないように入れてください' })
      })
    }
    errs.sort(function (a, b) { return order(a.errId) - order(b.errId) })
    return errs
  }
  function order (id) { return ['err-in', 'err-b0s', 'err-b1s', 'err-out', 'err-reason', 'err-form'].indexOf(id) }

  function previewCalc (v) {
    if (v.in == null || v.out == null || Number.isNaN(v.in) || Number.isNaN(v.out) || v.out <= v.in) return null
    var p = { staff: editing.staff, store: editing.store, in: v.in, out: v.out, breaks: [] }
    var okB = true
    ;['b0', 'b1'].forEach(function (b) {
      var s = v[b + 's'], e = v[b + 'e']
      if (Number.isNaN(s) || Number.isNaN(e) || (s == null) !== (e == null)) okB = false
      else if (s != null) p.breaks.push([s, e])
    })
    if (!okB) return null
    var fb = p.breaks
    var brk = fb.reduce(function (t, b) { return t + Math.max(0, b[1] - b[0]) }, 0)
    var work = v.out - v.in - brk
    if (work < 0) return null
    return { work: work, ot: Math.max(0, work - 480), night: nightOf(v.in, v.out) - fb.reduce(function (t, b) { return t + nightOf(b[0], b[1]) }, 0) }
  }
  function updatePreview () {
    if (!editing) return
    var c = previewCalc(readForm())
    var el = $('edit-preview')
    if (!c) { el.innerHTML = '<strong>出勤・退勤（休憩は開始と終了）を入れると、実働・残業・深夜をここに出します</strong>'; return }
    el.innerHTML = 'この内容だと <span>実働 <strong>' + dur(c.work) + '</strong>・残業 <strong>' + dur(c.ot) + '</strong>・深夜 <strong>' + dur(c.night) + '</strong></span>'
  }
  function updateLen () { $('edit-len').textContent = $('edit-reason').value.length + ' / 100' }
  $('edit-times').addEventListener('input', updatePreview)
  $('edit-times').addEventListener('focusout', function (e) {
    // 離れた時に形をそろえる（「2005」→「20:05」）
    var t = e.target
    if (!t.classList || !t.classList.contains('tin')) return
    var m = parseTime(t.value)
    if (m != null && !Number.isNaN(m)) t.value = tm(m)
  })
  $('edit-reason').addEventListener('input', function () { updateLen(); if (this.value.trim()) setErr('err-reason', '', [this]) })
  $('edit-presets').addEventListener('click', function (e) {
    var b = e.target.closest('.preset')
    if (!b) return
    var r = $('edit-reason')
    r.value = b.textContent
    updateLen()
    setErr('err-reason', '', [r])
    r.focus()
  })

  $('edit-form').addEventListener('submit', function (e) {
    e.preventDefault()
    if (!editing) return
    clearErrors()
    var v = readForm()
    var errs = validate(v)
    var reasonEl = $('edit-reason')
    var reason = reasonEl.value.replace(/^[\s　]+|[\s　]+$/g, '')
    if (!reason) errs.push({ errId: 'err-reason', inputs: [reasonEl], msg: '修正の理由を入れてください（履歴に残ります）' })
    var before = valsOf(editing)
    var changed = FIELDS.some(function (f) { return before[f.key] !== v[f.key] })
    if (!errs.length && !changed) errs.push({ errId: 'err-form', inputs: [$('in-in')], msg: '修正前と同じ内容です。直す所を変えてください' })
    if (errs.length) {
      var seen = {}
      errs.forEach(function (er) {
        if (seen[er.errId]) return
        seen[er.errId] = true
        setErr(er.errId, er.msg, er.inputs)
      })
      var firstInp = errs[0].inputs[0]
      if (firstInp) firstInp.focus()
      announce(errs[0].msg)
      return
    }
    // 直した所（変えた項目だけ）
    var changes = []
    if (before.in !== v.in) changes.push({ label: '出勤', before: before.in == null ? '—' : tm(before.in), after: tm(v.in) })
    ;['b0', 'b1'].forEach(function (b, i) {
      if (before[b + 's'] !== v[b + 's'] || before[b + 'e'] !== v[b + 'e']) {
        changes.push({ label: '休憩' + (i + 1), before: brkText([before[b + 's'], before[b + 'e']]), after: brkText([v[b + 's'], v[b + 'e']]) })
      }
    })
    if (before.out !== v.out) changes.push({ label: '退勤', before: before.out == null ? '—' : tm(before.out), after: v.out == null ? '—' : tm(v.out) })

    var p = editing
    p.in = v.in
    p.out = v.out
    p.breaks = [[v.b0s, v.b0e], [v.b1s, v.b1e]].filter(function (b) { return b[0] != null })
    history.forEach(function (h) { h.fresh = false })
    history.unshift({ at: nowText(), punchId: p.id, day: p.day, staff: p.staff, store: p.store, changes: changes, reason: reason.slice(0, 100), by: EDITOR, fresh: true })
    editedStaff[p.staff] = true
    sortPunches()
    var openerId = p.id
    opener = null
    dlg.close()
    renderAll()
    var btn = document.querySelector('[data-edit="' + openerId + '"]')
    if (btn) btn.focus()
    announce('修正履歴に1件追加しました')
    showToast('保存しました。月の集計と出勤簿を計算し直しました。')
  })

  // ---------- 知らせ ----------
  var elToast = $('toast')
  var toastTimer = null
  var toastHold = false
  function showToast (text) {
    $('toast-text').textContent = text
    elToast.hidden = false
    elToast.classList.remove('is-in')
    void elToast.offsetWidth
    elToast.classList.add('is-in')
    armToast()
  }
  function armToast () {
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { if (!toastHold) elToast.hidden = true }, 6000)
  }
  elToast.addEventListener('mouseenter', function () { toastHold = true })
  elToast.addEventListener('mouseleave', function () { toastHold = false; armToast() })
  elToast.addEventListener('focusin', function () { toastHold = true })
  elToast.addEventListener('focusout', function () { toastHold = false; armToast() })
  $('toast-link').addEventListener('click', function () {
    elToast.hidden = true
    toastHold = false
    setTab('summary', { focus: true })
  })

  // ---------- 全体の描き直し ----------
  function renderAll () {
    renderBadge()
    renderCheckBand()
    renderPunches()
    renderHistory()
    if (curTab === 'summary') renderSummary()
    if (curTab === 'roster') renderRoster()
  }
  function onMQ (mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn)
    else mq.addListener(fn)
  }
  onMQ(mqPC, renderAll)

  // ---------- 開始 ----------
  initStaffSelect()
  $('r-staff').value = rStaff
  renderFilters()
  renderAll()
  var h = (window.location.hash || '').replace('#', '')
  if (TABS.indexOf(h) >= 0 && h !== 'punch') setTab(h, { noScroll: true, noHash: true })
  window.addEventListener('hashchange', function () {
    var k = window.location.hash.replace('#', '')
    if (TABS.indexOf(k) >= 0 && k !== curTab) setTab(k, { noHash: true })
  })
})()
