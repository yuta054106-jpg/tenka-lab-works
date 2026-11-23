// 子ども書道教室 ハナツゲ（デモ）出欠と月謝の管理
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 操作ごとに「読む（検証）→ 変える → 書く → 描き直す」（design.md §7-4・§11-3）。金額・数は整数（円）だけで扱う
(function () {
  'use strict'

  // ---------- 定数（design.md §7-1・§18） ----------
  var KEY = 'tenkaLab.demo17.lesson.v1'
  var TEST_KEY = 'tenkaLab.demo17.test'
  var TODAY = '2026-11-19' // デモの今日（固定。端末の日付は使わない）
  var BASE_MONTH = '2026-11' // まとめの月・タブのバッジの月
  var MONTHS = ['2026-10', '2026-11']
  var FEE = { c4: 6000, c2: 3500 } // 税込・架空
  var C2_LESSONS = [1, 3] // 月2回コースが来る回
  var COURSE_NAME = { c4: '月4回', c2: '月2回' }
  var PAY_NAME = { cash: '現金', bank: '振込' }
  var CSV_NAME = 'hanatsuge_2026-11_matome.csv'
  var PRINT_TITLE = 'hanatsuge_2026-11_matome'
  var SCHOOL = '子ども書道教室 ハナツゲ'
  var CLASSES = [
    { id: 'A', day: '火曜', time: '16:00', kumi: 'ひよこ組', w: '火' },
    { id: 'B', day: '木曜', time: '16:00', kumi: 'りす組', w: '木' },
    { id: 'C', day: '土曜', time: '10:00', kumi: 'ふくろう組', w: '土' }
  ]
  var LESSONS = [
    { id: 'A1', cls: 'A', no: 1, date: '2026-11-03' }, { id: 'A2', cls: 'A', no: 2, date: '2026-11-10' },
    { id: 'A3', cls: 'A', no: 3, date: '2026-11-17' }, { id: 'A4', cls: 'A', no: 4, date: '2026-11-24' },
    { id: 'B1', cls: 'B', no: 1, date: '2026-11-05' }, { id: 'B2', cls: 'B', no: 2, date: '2026-11-12' },
    { id: 'B3', cls: 'B', no: 3, date: '2026-11-19' }, { id: 'B4', cls: 'B', no: 4, date: '2026-11-26' },
    { id: 'C1', cls: 'C', no: 1, date: '2026-11-07' }, { id: 'C2', cls: 'C', no: 2, date: '2026-11-14' },
    { id: 'C3', cls: 'C', no: 3, date: '2026-11-21' }, { id: 'C4', cls: 'C', no: 4, date: '2026-11-28' }
  ]
  var CARRY = { 'A-02': 1, 'B-03': 1, 'C-03': 1 } // 先月からの振替の残り（ほかは 0）
  var STUDENTS = []
  CLASSES.forEach(function (c) {
    for (var i = 1; i <= 6; i++) {
      var id = c.id + '-0' + i
      STUDENTS.push({ id: id, cls: c.id, course: i === 6 || (c.id === 'B' && i === 5) ? 'c2' : 'c4', carry: CARRY[id] || 0 })
    }
  })
  function own (o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
  var CLASS_BY_ID = {}; CLASSES.forEach(function (c) { CLASS_BY_ID[c.id] = c })
  var LESSON_BY_ID = {}; LESSONS.forEach(function (l) { LESSON_BY_ID[l.id] = l })
  var STUDENT_BY_ID = {}; STUDENTS.forEach(function (s) { STUDENT_BY_ID[s.id] = s })
  function isLesson (k) { return typeof k === 'string' && own(LESSON_BY_ID, k) }
  function isStudent (k) { return typeof k === 'string' && own(STUDENT_BY_ID, k) }
  function lessonsOf (cls) { return LESSONS.filter(function (l) { return l.cls === cls }) }
  function studentsOf (cls) { return STUDENTS.filter(function (s) { return s.cls === cls }) }

  // ---------- 書き方（§2-3） ----------
  var WD = ['日', '月', '火', '水', '木', '金', '土']
  function dparts (d) { return [parseInt(d.slice(0, 4), 10), parseInt(d.slice(5, 7), 10), parseInt(d.slice(8, 10), 10)] }
  function wday (d) { var p = dparts(d); return WD[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] }
  function md (d) { var p = dparts(d); return p[1] + '/' + p[2] + '（' + wday(d) + '）' }
  function mdLong (d) { var p = dparts(d); return p[1] + '月' + p[2] + '日（' + wday(d) + '）' }
  function ymd (d) { var p = dparts(d); return p[0] + '年' + p[1] + '月' + p[2] + '日（' + wday(d) + '）' }
  function ym (m) { return m.slice(0, 4) + '年' + parseInt(m.slice(5, 7), 10) + '月' }
  function mOnly (m) { return parseInt(m.slice(5, 7), 10) + '月' }
  function yen (n) { return n.toLocaleString('ja-JP') + '円' }
  function ppl (n) { return n + '人' }
  function times (n) { return n + '回' }
  function cname (c) { return c.day + ' ' + c.time + ' ' + c.kumi }
  function lname (l) { return '第' + l.no + '回' }
  function kumiW (s) { var c = CLASS_BY_ID[s.cls]; return c.kumi + '（' + c.w + '）' }
  function feeOf (s) { return FEE[s.course] }
  function planOf (s) { return s.course === 'c4' ? 4 : 2 }

  // ---------- 規則（§7。状態を引数で受ける純粋な関数） ----------
  function targetsOf (l) {
    return studentsOf(l.cls).filter(function (s) { return s.course === 'c4' || C2_LESSONS.indexOf(l.no) >= 0 }).map(function (s) { return s.id })
  }
  function isOpen (l) { return l.date <= TODAY }
  function remainOf (st, sid) {
    var s = STUDENT_BY_ID[sid]
    var n = s.carry
    Object.keys(st.att).forEach(function (lid) { if (st.att[lid][sid] === 'm') n++ })
    Object.keys(st.mk).forEach(function (lid) { if (st.mk[lid].indexOf(sid) >= 0) n-- })
    return n
  }
  // 'm' を外す操作が許されるか（§7-4 変えられない時）
  function canChange (st, lid, sid, v) {
    var prev = st.att[lid] && st.att[lid][sid]
    if (prev === 'm' && v !== 'm' && remainOf(st, sid) <= 0) return false
    return true
  }
  function checkAtt (st, lid, sid) {
    var l = LESSON_BY_ID[lid]
    if (!l || !isOpen(l)) return 'closed'
    if (targetsOf(l).indexOf(sid) < 0) return 'notTarget'
    return null
  }
  // 戻り値 'ok' | 'same' | 'closed' | 'notTarget' | 'locked'
  function setAtt (st, lid, sid, v) {
    var bad = checkAtt(st, lid, sid)
    if (bad) return bad
    var prev = st.att[lid] && st.att[lid][sid]
    if (prev === v) return 'same'
    if (!canChange(st, lid, sid, v)) return 'locked'
    if (!st.att[lid]) st.att[lid] = {}
    st.att[lid][sid] = v
    return 'ok'
  }
  function clearAtt (st, lid, sid) {
    var bad = checkAtt(st, lid, sid)
    if (bad) return bad
    if (!st.att[lid] || !st.att[lid][sid]) return 'same'
    if (!canChange(st, lid, sid, null)) return 'locked'
    delete st.att[lid][sid]
    if (!Object.keys(st.att[lid]).length) delete st.att[lid]
    return 'ok'
  }
  // 戻り値 'ok' | 'closed' | 'sameClass' | 'already' | 'zero'
  function addMakeup (st, lid, sid) {
    var l = LESSON_BY_ID[lid]
    if (!l || !isOpen(l) || !isStudent(sid)) return 'closed'
    if (STUDENT_BY_ID[sid].cls === l.cls) return 'sameClass'
    if (st.mk[lid] && st.mk[lid].indexOf(sid) >= 0) return 'already'
    if (remainOf(st, sid) < 1) return 'zero'
    if (!st.mk[lid]) st.mk[lid] = []
    st.mk[lid].push(sid)
    return 'ok'
  }
  function removeMakeup (st, lid, sid) {
    if (!st.mk[lid] || st.mk[lid].indexOf(sid) < 0) return 'none'
    st.mk[lid] = st.mk[lid].filter(function (x) { return x !== sid })
    if (!st.mk[lid].length) delete st.mk[lid]
    return 'ok'
  }
  function lessonStats (st, lid) {
    var l = LESSON_BY_ID[lid]
    var tg = targetsOf(l)
    var a = st.att[lid] || {}
    var r = { targets: tg.length, p: 0, m: 0, a: 0, none: 0, mkIn: (st.mk[lid] || []).length }
    tg.forEach(function (sid) { var v = a[sid]; if (v) r[v]++; else r.none++ })
    r.present = r.p + r.mkIn
    r.absent = r.m + r.a
    r.recorded = r.p + r.m + r.a
    return r
  }
  function monthStats (st, sid) {
    var s = STUDENT_BY_ID[sid]
    var r = { plan: planOf(s), p: 0, m: 0, a: 0, mkIn: 0 }
    lessonsOf(s.cls).forEach(function (l) { var v = st.att[l.id] && st.att[l.id][sid]; if (v) r[v]++ })
    Object.keys(st.mk).forEach(function (lid) { if (st.mk[lid].indexOf(sid) >= 0) r.mkIn++ })
    r.present = r.p + r.mkIn
    r.rest = r.plan - (r.p + r.m + r.a)
    r.remain = remainOf(st, sid)
    return r
  }
  function feeTotals (st, month) {
    var pm = st.pay[month] || {}
    var r = { dueN: 0, dueYen: 0, paidN: 0, paidYen: 0, cashN: 0, cashYen: 0, bankN: 0, bankYen: 0, totalN: 0, totalYen: 0, c4N: 0, c2N: 0 }
    STUDENTS.forEach(function (s) {
      var f = feeOf(s)
      r.totalN++; r.totalYen += f
      if (s.course === 'c4') r.c4N++; else r.c2N++
      var p = own(pm, s.id) ? pm[s.id] : null
      if (!p) { r.dueN++; r.dueYen += f; return }
      r.paidN++; r.paidYen += f
      if (p.m === 'cash') { r.cashN++; r.cashYen += f } else { r.bankN++; r.bankYen += f }
    })
    return r
  }
  function markPaid (st, month, sid, how) {
    if (MONTHS.indexOf(month) < 0 || !isStudent(sid) || !own(PAY_NAME, how)) return 'none'
    if (!st.pay[month]) st.pay[month] = {}
    if (own(st.pay[month], sid)) return 'already'
    st.pay[month][sid] = { m: how, d: TODAY }
    return 'ok'
  }
  function unmarkPaid (st, month, sid) {
    if (!st.pay[month] || !own(st.pay[month], sid)) return 'none'
    delete st.pay[month][sid]
    return 'ok'
  }
  function payOf (st, month, sid) { var pm = st.pay[month]; return pm && own(pm, sid) ? pm[sid] : null }
  // 振替で来た回のうち日付の一番新しい回（§7-5）
  function lastMakeup (st, sid) {
    var best = null
    Object.keys(st.mk).forEach(function (lid) {
      if (st.mk[lid].indexOf(sid) >= 0) { var l = LESSON_BY_ID[lid]; if (!best || l.date > best.date) best = l }
    })
    return best
  }

  // ---------- CSV（§9-5・§9-6） ----------
  function csvCell (v) {
    if (typeof v === 'number') return String(v)
    var s = String(v)
    if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  var CSV_COLS = [
    ['生徒', '生徒番号'], ['組', '組の呼び名'], ['クラス', '曜日＋時間'], ['コース', '月4回／月2回'], ['予定の回', '整数'], ['出席', '整数（振替を含む）'],
    ['うち振替', '整数'], ['欠席（振替あり）', '整数'], ['欠席', '整数'], ['まだの回', '整数'], ['振替の残り', '整数'], ['月謝（円）', '整数（カンマ・円なし）'],
    ['月謝の状態', '未納／入金済み'], ['入金の方法', '現金／振込／未納は空'], ['入金日', '2026-11-03 の形／未納は空']
  ]
  var CSV_HEAD = CSV_COLS.map(function (c) { return c[0] }).join(',')
  function csvLine (st, s) {
    var c = CLASS_BY_ID[s.cls]
    var ms = monthStats(st, s.id)
    var p = payOf(st, BASE_MONTH, s.id)
    return [csvCell(s.id), csvCell(c.kumi), csvCell(c.day + ' ' + c.time), csvCell(COURSE_NAME[s.course]), ms.plan, ms.present, ms.mkIn, ms.m, ms.a, ms.rest, ms.remain, feeOf(s),
      csvCell(p ? '入金済み' : '未納'), csvCell(p ? PAY_NAME[p.m] : ''), csvCell(p ? p.d : '')].map(function (v) { return typeof v === 'number' ? csvCell(v) : v }).join(',')
  }
  function buildCsv (st) {
    return '﻿' + [CSV_HEAD].concat(STUDENTS.map(function (s) { return csvLine(st, s) })).join('\r\n') + '\r\n'
  }

  // ---------- 保存の検証（§11-2）。通れば必要な鍵だけの新しい状態、外れれば null ----------
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  var DATE_RE = /^2026-(10|11)-(0[1-9]|[12][0-9]|3[01])$/
  function realDate (d) {
    if (typeof d !== 'string' || !DATE_RE.test(d)) return false
    var p = dparts(d)
    var t = new Date(Date.UTC(p[0], p[1] - 1, p[2]))
    if (t.getUTCMonth() !== p[1] - 1 || t.getUTCDate() !== p[2]) return false
    return d >= '2026-10-01' && d <= TODAY
  }
  function validate (d) {
    if (!isObj(d) || d.v !== 1) return null
    if (!isObj(d.att) || !isObj(d.mk) || !isObj(d.pay)) return null
    var st = { att: {}, mk: {}, pay: {} }
    var k, i
    var ak = Object.keys(d.att)
    for (i = 0; i < ak.length; i++) {
      k = ak[i]
      if (!isLesson(k) || !isOpen(LESSON_BY_ID[k])) return null
      var rec = d.att[k]
      if (!isObj(rec)) return null
      var rk = Object.keys(rec)
      if (!rk.length) return null
      var tg = targetsOf(LESSON_BY_ID[k])
      st.att[k] = {}
      for (var j = 0; j < rk.length; j++) {
        if (!isStudent(rk[j]) || tg.indexOf(rk[j]) < 0) return null
        var v = rec[rk[j]]
        if (v !== 'p' && v !== 'm' && v !== 'a') return null
        st.att[k][rk[j]] = v
      }
    }
    var mkk = Object.keys(d.mk)
    for (i = 0; i < mkk.length; i++) {
      k = mkk[i]
      if (!isLesson(k) || !isOpen(LESSON_BY_ID[k])) return null
      var arr = d.mk[k]
      if (!Array.isArray(arr) || arr.length < 1 || arr.length > 12) return null
      var seen = []
      for (j = 0; j < arr.length; j++) {
        if (!isStudent(arr[j]) || STUDENT_BY_ID[arr[j]].cls === LESSON_BY_ID[k].cls || seen.indexOf(arr[j]) >= 0) return null
        seen.push(arr[j])
      }
      st.mk[k] = seen
    }
    for (i = 0; i < STUDENTS.length; i++) if (remainOf(st, STUDENTS[i].id) < 0) return null
    var pk = Object.keys(d.pay)
    for (i = 0; i < pk.length; i++) {
      k = pk[i]
      if (MONTHS.indexOf(k) < 0 || !own(d.pay, k)) return null
      var pm = d.pay[k]
      if (!isObj(pm)) return null
      st.pay[k] = {}
      var sk = Object.keys(pm)
      for (j = 0; j < sk.length; j++) {
        var p = pm[sk[j]]
        if (!isStudent(sk[j]) || !isObj(p)) return null
        if (p.m !== 'cash' && p.m !== 'bank') return null
        if (!realDate(p.d)) return null
        st.pay[k][sk[j]] = { m: p.m, d: p.d }
      }
    }
    return st
  }
  // 見本（§18-3・§18-4）
  function sample () {
    var att = {
      A1: { 'A-01': 'p', 'A-02': 'p', 'A-03': 'p', 'A-04': 'm', 'A-05': 'p', 'A-06': 'p' },
      A2: { 'A-01': 'p', 'A-02': 'm', 'A-03': 'p', 'A-04': 'p', 'A-05': 'a' },
      A3: { 'A-01': 'p', 'A-02': 'p', 'A-03': 'p', 'A-04': 'p', 'A-05': 'p', 'A-06': 'm' },
      B1: { 'B-01': 'p', 'B-02': 'p', 'B-03': 'p', 'B-04': 'm', 'B-05': 'p', 'B-06': 'p' },
      B2: { 'B-01': 'p', 'B-02': 'p', 'B-03': 'm', 'B-04': 'p' },
      C1: { 'C-01': 'p', 'C-02': 'p', 'C-03': 'p', 'C-04': 'p', 'C-05': 'm', 'C-06': 'p' },
      C2: { 'C-01': 'p', 'C-02': 'a', 'C-03': 'p', 'C-04': 'p', 'C-05': 'p' }
    }
    var oct = {}; var nov = {}
    var P10 = { 'A-01': 'b02', 'A-02': 'c06', 'A-03': 'b02', 'A-04': 'c06', 'A-05': 'b02', 'A-06': 'c06', 'B-01': 'c01', 'B-02': 'b02', 'B-03': 'b02', 'B-04': 'b02', 'B-05': 'c01', 'B-06': 'b02', 'C-01': 'c03', 'C-02': 'c03', 'C-03': 'b02', 'C-04': 'c03', 'C-05': 'b02', 'C-06': 'c03' }
    var P11 = { 'A-01': 'b02', 'A-02': 'c03', 'A-03': 'b04', 'A-04': 'c03', 'A-05': 'b06', 'B-01': 'c05', 'B-02': 'b02', 'B-04': 'b09', 'B-05': 'c05', 'B-06': 'b10', 'C-01': 'c07', 'C-03': 'b06', 'C-04': 'c07', 'C-05': 'b13', 'C-06': 'c07' }
    Object.keys(P10).forEach(function (s) { oct[s] = { m: P10[s][0] === 'c' ? 'cash' : 'bank', d: '2026-10-' + P10[s].slice(1) } })
    Object.keys(P11).forEach(function (s) { nov[s] = { m: P11[s][0] === 'c' ? 'cash' : 'bank', d: '2026-11-' + P11[s].slice(1) } })
    return { att: att, mk: { B2: ['A-04'], C2: ['A-02'] }, pay: { '2026-10': oct, '2026-11': nov } }
  }

  // ---------- 保存（§11） ----------
  var canSave = (function () {
    try {
      window.localStorage.setItem(TEST_KEY, '1'); window.localStorage.removeItem(TEST_KEY)
      return true
    } catch (e) { return false }
  })()
  var S = null
  function noSave () {
    canSave = false
    var n = document.getElementById('note-nosave')
    if (n) n.hidden = false
  }
  function save () {
    if (!canSave) return
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, att: S.att, mk: S.mk, pay: S.pay }))
    } catch (e) { noSave() }
  }
  // 読み直す。無い・壊れている時は見本で初期化して書く。保存できない時はメモリの S のまま
  function load () {
    if (!canSave) { if (!S) S = sample(); return }
    var raw = null
    try { raw = window.localStorage.getItem(KEY) } catch (e) { noSave(); if (!S) S = sample(); return }
    var st = null
    if (typeof raw === 'string') {
      try { st = validate(JSON.parse(raw)) } catch (e) { st = null }
    }
    if (st) { S = st; return }
    S = sample()
    save()
  }

  // ---------- DOM の小道具 ----------
  var $ = function (id) { return document.getElementById(id) }
  var NS = 'http://www.w3.org/2000/svg'
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    return e
  }
  function add (parent, kids) {
    (Array.isArray(kids) ? kids : [kids]).forEach(function (k) {
      if (k == null || k === false) return
      parent.appendChild(typeof k === 'string' ? document.createTextNode(k) : k)
    })
    return parent
  }
  function icon (name, size, cls) {
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('width', String(size)); s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(NS, 'use')
    u.setAttribute('href', '#' + name)
    s.appendChild(u)
    return s
  }
  function btn (cls, text, id) {
    var b = el('button', cls, text)
    b.type = 'button'
    if (id) b.id = id
    return b
  }
  function setOff (b, off) { if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled') }
  function nw (text, cls) { return el('span', 'nw' + (cls ? ' ' + cls : ''), text) }
  function yenEl (n) { var s = el('span', 'nw'); add(s, [n.toLocaleString('ja-JP'), el('span', 'yen-u', '円')]); return s }

  // 折れてはいけない語（§13）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = ['子ども書道教室 ハナツゲ', 'デモ（架空の教室）', '振替で来た生徒を足す', 'CSV をダウンロード', '入金済みにする', '振替を取り消す', 'この回に足す', '未納だけ表示',
    '記録を消す', '振替で出席', '振替の残り', '未納に戻す', '見本に戻す', 'デモの今日', 'ふくろう組', 'ひよこ組', 'りす組', 'まだの回', '入金済み', '取り消す', '（振替あり）', '書道教室', 'ハナツゲ',
    'まだ先', '未記録', '出席', '欠席', '未納', '現金', '振込', 'デモ', '架空', '税込']
  var NW_RE = new RegExp([
    '\\d{4}年\\d{1,2}月\\d{1,2}日（.）', '\\d{4}年\\d{1,2}月', '\\d{1,2}月\\d{1,2}日（.）', '\\d{1,2}\\/\\d{1,2}（.）', '\\d{1,2}\\/\\d{1,2}',
    '(?:ひよこ|りす|ふくろう)組（.）', '[ABC]-\\d{2}', '第\\d回', '[月火水木金土日]曜 \\d{2}:\\d{2}', '\\d{2}:\\d{2}',
    '記録 \\d+／\\d+人', '\\d+／\\d+人', '振替の残り \\d+', '月[24]回', '[\\d,]+(?:円|人|回|件|月分|月)'
  ].concat(NW_WORDS.map(esc)).join('|'), 'g')
  function wrapText (node) {
    var s = node.data
    NW_RE.lastIndex = 0
    if (!NW_RE.test(s)) return
    NW_RE.lastIndex = 0
    var frag = document.createDocumentFragment(); var last = 0; var m
    while ((m = NW_RE.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)))
      frag.appendChild(el('span', 'nw', m[0]))
      last = m.index + m[0].length
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)))
    // 親が flex・grid の時は、分けた語が別々の箱になって隙間が空くので、1つの span にまとめる
    var par = node.parentNode
    if (/flex|grid/.test(window.getComputedStyle(par).display)) { var box = el('span'); box.appendChild(frag); frag = box }
    par.replaceChild(frag, node)
  }
  function wrapWords (root) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode
        if (!p || p.closest('.nw, svg, script, style, title, pre, .visually-hidden')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var list = []; var n
    while ((n = tw.nextNode())) list.push(n)
    list.forEach(wrapText)
    return root
  }
  // 状態の札（§1-3）
  var TAG = {
    none: ['未記録', null], makeup: ['振替で出席', 'i-undo'], due: ['未納', 'i-due'], paid: ['入金済み', 'i-check'],
    today: ['今日', null], future: ['まだ先', 'i-clock']
  }
  function stateTag (k) {
    var t = el('span', 'state-tag state-tag--' + k)
    if (TAG[k][1]) t.appendChild(icon(TAG[k][1], 14))
    t.appendChild(document.createTextNode(TAG[k][0]))
    return t
  }
  function remainTag (n) {
    var t = el('span', 'remain-tag ' + (n >= 1 ? 'remain-tag--has' : 'remain-tag--zero'))
    add(t, ['振替の残り', el('span', 'remain-tag__n', String(n))])
    return t
  }
  function noticeEl (text, id) {
    var p = add(el('p', 'notice'), [icon('i-info', 16), el('span', null, text)])
    if (id) p.id = id
    return p
  }

  // ---------- 知らせ ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  function announce (msg) {
    var sr = $('sr-status')
    window.clearTimeout(srTimer)
    sr.textContent = ''
    srTimer = window.setTimeout(function () { sr.textContent = msg }, 50)
  }
  var toastTimer = null
  function showToast (text) {
    var t = $('toast')
    $('toast-text').textContent = text
    wrapWords($('toast-text'))
    t.hidden = false
    t.classList.remove('is-in')
    void t.offsetWidth
    if (!reduceMotion) t.classList.add('is-in')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { t.hidden = true }, 3000)
    announce(text)
  }

  // ---------- 確認の窓（⑯と同じ。最初のフォーカスは「やめる」、Esc＝やめる） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null
  function setOkBtn (b, spec) {
    b.textContent = ''
    if (!spec) { b.hidden = true; return }
    b.hidden = false
    if (spec.icon) b.appendChild(icon(spec.icon, 20))
    b.appendChild(document.createTextNode(spec.text))
  }
  // 戻り値（Promise）：押したボタンの番号 1・2、やめた時 0
  function confirmBox (opt) {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(1); return }
      $('cf-title').textContent = opt.title
      $('cf-body').textContent = opt.body
      setOkBtn($('cf-ok1'), opt.ok[0])
      setOkBtn($('cf-ok2'), opt.ok[1])
      wrapWords($('cf-title')); wrapWords($('cf-body'))
      dlgOpener = document.activeElement && document.activeElement.id
      dlgResolve = resolve
      dlg.showModal()
      $('cf-cancel').focus()
    })
  }
  function closeDlg (n) {
    if (!dlgResolve) return
    var r = dlgResolve
    dlgResolve = null
    if (dlg.open) dlg.close()
    r(n)
    // やめた時は開いた所へ戻す（フォーカスが body・窓の中にある時だけ）
    if (!n && dlgOpener) {
      var id = dlgOpener
      window.setTimeout(function () {
        var a = document.activeElement
        if ($(id) && (!a || a === document.body || dlg.contains(a))) $(id).focus()
      }, 0)
    }
  }
  $('cf-ok1').addEventListener('click', function () { closeDlg(1) })
  $('cf-ok2').addEventListener('click', function () { closeDlg(2) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(0) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(0) })

  // ---------- 画面の状態（保存しない） ----------
  function firstLesson (cls) {
    var ls = lessonsOf(cls)
    var t = ls.filter(function (l) { return l.date === TODAY })[0]
    if (t) return t.id
    var past = ls.filter(function (l) { return l.date < TODAY })
    return past.length ? past[past.length - 1].id : ls[0].id
  }
  var ui = { tab: 'att', cls: 'B', lesson: firstLesson('B'), month: BASE_MONTH, dueOnly: false, notice: null, pickNotice: null }
  function focusId (id) { var e = $(id); if (e) e.focus({ preventScroll: false }) }

  // ---------- タブ（⑯と同じ動き） ----------
  var TABS = ['att', 'fee', 'sum']
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
    updateScrollFocus()
  }
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[role="tab"]')
    if (b) openTab(b.id.slice(4))
  })
  $('tabs').addEventListener('keydown', function (e) {
    var i = TABS.indexOf(ui.tab); var j = null
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = TABS.length - 1
    if (j === null) return
    e.preventDefault()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  var PANEL_H = { att: 'att-h', fee: 'fee-h2', sum: 'sum-h' }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      var n = a.getAttribute('data-step')
      openTab(n, { noScroll: true })
      $('panel-' + n).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      $(PANEL_H[n]).focus({ preventScroll: true })
    })
  })

  // ---------- 今日の出欠（§6） ----------
  function attMsgAfter (sid) { return sid + ' の振替の残り ' + remainOf(S, sid) }
  function recLine (lid) { var r = lessonStats(S, lid); return '記録 ' + r.recorded + '／' + r.targets + '人' }
  function lockText (sid) {
    var l = lastMakeup(S, sid)
    var tail = l ? '先に ' + md(l.date) + CLASS_BY_ID[l.cls].kumi + ' の振替を取り消してください' : ''
    return sid + ' の振替の残りが 0 のため、この「欠席（振替あり）」は変えられません。' + tail
  }
  function futureText (l) { return md(l.date) + 'はまだ先の回です（デモの今日は ' + md(TODAY) + '）' }
  function selText () {
    var l = LESSON_BY_ID[ui.lesson]
    var r = lessonStats(S, l.id)
    return cname(CLASS_BY_ID[ui.cls]) + ' ' + lname(l) + ' ' + mdLong(l.date) + '。生徒 ' + r.targets + '人、' + recLine(l.id)
  }
  var ATT_TXT = { p: '出席', m: '欠席（振替あり）', a: '欠席' }
  function onAtt (sid, v) {
    load()
    ui.notice = null
    var r = setAtt(S, ui.lesson, sid, v)
    if (r === 'same') { renderAll(); return }
    if (r === 'locked') {
      ui.notice = { key: 'row:' + sid, text: lockText(sid) }
      renderAll()
      announce(ui.notice.text)
      return
    }
    if (r !== 'ok') { renderAll(); return }
    save()
    renderAll()
    announce(sid + ' を' + ATT_TXT[v] + 'にしました。' + (v === 'm' ? attMsgAfter(sid) : recLine(ui.lesson)))
  }
  function onClear (sid) {
    load()
    ui.notice = null
    var r = clearAtt(S, ui.lesson, sid)
    if (r === 'locked') {
      ui.notice = { key: 'row:' + sid, text: lockText(sid) }
      renderAll(); focusId('att-clr-' + sid)
      announce(ui.notice.text)
      return
    }
    if (r !== 'ok') { renderAll(); return }
    save()
    renderAll()
    // 記録を消すと「記録を消す」が無くなるので、同じ行の「出席」へ
    focusId('att-p-' + sid)
    announce(sid + ' の記録を消しました。' + attMsgAfter(sid) + '。' + recLine(ui.lesson))
  }
  function onCls (cid) {
    load()
    ui.notice = null
    if (ui.cls === cid) { renderAll(); return }
    ui.cls = cid
    ui.lesson = firstLesson(cid)
    renderAll()
    announce(selText())
  }
  function onLesson (lid) {
    load()
    ui.notice = null
    var l = LESSON_BY_ID[lid]
    if (!isOpen(l)) {
      ui.notice = { key: 'lesson', text: futureText(l) }
      renderAll()
      announce(ui.notice.text)
      return
    }
    if (ui.lesson === lid) { renderAll(); return }
    ui.lesson = lid
    renderAll()
    announce(selText())
  }
  function renderAtt () {
    var cls = CLASS_BY_ID[ui.cls]
    var l = LESSON_BY_ID[ui.lesson]
    // クラス
    var cp = $('cls-pick'); cp.textContent = ''
    CLASSES.forEach(function (c) {
      var on = c.id === ui.cls
      var b = btn('cls-btn', null, 'cls-' + c.id)
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
      b.setAttribute('aria-label', cname(c))
      var l1 = el('span', 'cls-btn__l1')
      if (on) l1.appendChild(icon('i-okc', 16))
      l1.appendChild(nw(c.day + ' ' + c.time))
      add(b, [l1, el('span', 'cls-btn__l2', c.kumi)])
      b.addEventListener('click', function () { onCls(c.id); focusId('cls-' + c.id) })
      cp.appendChild(b)
    })
    // 回
    var lp = $('lesson-pick'); lp.textContent = ''
    lessonsOf(ui.cls).forEach(function (x) {
      var on = x.id === ui.lesson
      var fut = !isOpen(x)
      var b = btn('lesson-btn', null, 'lesson-' + x.id)
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
      setOff(b, fut)
      b.setAttribute('aria-label', lname(x) + ' ' + mdLong(x.date) + (x.date === TODAY ? ' 今日' : fut ? ' まだ先' : ''))
      var l1 = el('span', 'lesson-btn__l1')
      if (on) l1.appendChild(icon('i-okc', 16))
      l1.appendChild(nw(lname(x)))
      var l2 = el('span', 'lesson-btn__l2')
      l2.appendChild(nw(md(x.date)))
      if (x.date === TODAY) l2.appendChild(stateTag('today'))
      if (fut) l2.appendChild(stateTag('future'))
      add(b, [l1, l2])
      b.addEventListener('click', function () { onLesson(x.id); focusId('lesson-' + x.id) })
      lp.appendChild(b)
    })
    var ln = $('lesson-notice')
    ln.textContent = ''
    ln.hidden = !(ui.notice && ui.notice.key === 'lesson')
    if (!ln.hidden) add(ln, [icon('i-info', 16), el('span', null, ui.notice.text)])
    // 上の数字
    var r = lessonStats(S, l.id)
    $('as-p-n').textContent = String(r.present)
    $('as-p-note').textContent = 'うち振替 ' + r.mkIn
    $('as-a-n').textContent = String(r.absent)
    $('as-a-note').textContent = 'うち振替あり ' + r.m
    $('as-n-n').textContent = String(r.none)
    var nn = $('as-n-note')
    nn.textContent = ''
    nn.appendChild(nw('記録 ' + r.recorded + '／' + r.targets + '人'))
    if (!r.none) nn.appendChild(document.createTextNode('・すべて記録しました'))
    nn.classList.toggle('is-strong', !r.none)
    // 生徒の行
    var tg = targetsOf(l)
    $('att-list-h').textContent = cls.kumi + 'の生徒（' + ppl(tg.length) + '）'
    var list = $('att-list'); list.textContent = ''
    tg.forEach(function (sid) { list.appendChild(attRow(l, sid)) })
    var c2 = studentsOf(ui.cls).filter(function (s) { return tg.indexOf(s.id) < 0 }).map(function (s) { return s.id })
    var cn = $('att-c2note')
    cn.hidden = !c2.length
    cn.textContent = c2.length ? '月2回コースの ' + c2.join('・') + ' は、この回はありません（第1回・第3回に来ます）' : ''
    // 振替で来た生徒
    var mks = S.mk[l.id] || []
    $('mk-h').textContent = '振替で来た生徒（' + ppl(mks.length) + '）'
    var ml = $('mk-list'); ml.textContent = ''
    mks.forEach(function (sid) {
      var li = el('li', 'makeup-row')
      li.id = 'mk-row-' + sid
      var rm = btn('btn-sub btn-sm', '振替を取り消す', 'mk-rm-' + sid)
      rm.setAttribute('aria-label', sid + ' の振替を取り消す')
      rm.addEventListener('click', function () { onRemoveMakeup(sid) })
      add(li, [el('span', 'makeup-row__id', sid), el('span', 'makeup-row__from', CLASS_BY_ID[STUDENT_BY_ID[sid].cls].kumi + 'から'), stateTag('makeup'), remainTag(remainOf(S, sid)), rm])
      ml.appendChild(li)
    })
    $('mk-none').hidden = mks.length > 0
  }
  function attRow (l, sid) {
    var s = STUDENT_BY_ID[sid]
    var v = S.att[l.id] && S.att[l.id][sid]
    var locked = v === 'm' && remainOf(S, sid) <= 0
    var li = el('li', 'att-row')
    li.setAttribute('aria-labelledby', 'att-' + sid)
    var idb = el('div', 'att-row__idbox')
    var idEl = el('span', 'att-row__id', sid); idEl.id = 'att-' + sid
    add(idb, [idEl, el('span', 'att-row__meta', CLASS_BY_ID[s.cls].kumi + '・' + COURSE_NAME[s.course])])
    var rem = el('div', 'att-row__remain'); rem.appendChild(remainTag(remainOf(S, sid)))
    var bs = el('div', 'att-btns')
    ;['p', 'm', 'a'].forEach(function (k) {
      var b = btn('att-btn', null, 'att-' + k + '-' + sid)
      b.setAttribute('data-v', k)
      var on = v === k
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
      b.setAttribute('aria-label', sid + ' を' + ATT_TXT[k] + 'にする')
      if (locked && k !== 'm') setOff(b, true)
      var l1 = el('span', 'att-btn__l1')
      if (on) l1.appendChild(icon(k === 'p' ? 'i-maru' : k === 'm' ? 'i-undo' : 'i-slash', 18))
      l1.appendChild(nw(k === 'p' ? '出席' : '欠席'))
      b.appendChild(l1)
      if (k === 'm') b.appendChild(el('span', 'att-btn__l2 nw', '（振替あり）'))
      b.addEventListener('click', function () { onAtt(sid, k); focusId('att-' + k + '-' + sid) })
      bs.appendChild(b)
    })
    var foot = el('div', 'att-row__foot')
    if (v) {
      var c = btn('text-btn', null, 'att-clr-' + sid)
      c.setAttribute('aria-label', sid + ' の記録を消す')
      if (locked) setOff(c, true)
      add(c, [icon('i-undo', 16), nw('記録を消す')])
      c.addEventListener('click', function () { onClear(sid) })
      foot.appendChild(c)
    } else {
      add(foot, [el('span', 'att-row__none', 'まだ記録していません'), stateTag('none')])
    }
    add(li, [idb, rem, bs])
    if (ui.notice && ui.notice.key === 'row:' + sid) li.appendChild(noticeEl(ui.notice.text))
    li.appendChild(foot)
    return li
  }

  // ---------- 振替で来た生徒を選ぶ窓（§6-6） ----------
  var pick = $('pick')
  function pickable (sid) {
    var l = LESSON_BY_ID[ui.lesson]
    if (STUDENT_BY_ID[sid].cls === l.cls) return false
    if ((S.mk[l.id] || []).indexOf(sid) >= 0) return false
    return remainOf(S, sid) >= 1
  }
  function renderPick () {
    var l = LESSON_BY_ID[ui.lesson]
    $('pick-title').textContent = lname(l) + ' ' + md(l.date) + ' ' + CLASS_BY_ID[l.cls].kumi + 'に、振替で来た生徒を足す'
    var others = STUDENTS.filter(function (s) { return s.cls !== l.cls })
    var inl = S.mk[l.id] || []
    var list = $('pick-list'); list.textContent = ''
    var any = false
    others.forEach(function (s) {
      var li = el('li', 'pick-row')
      var left = el('span', 'pick-row__who')
      add(left, [el('span', 'pick-row__id', s.id), el('span', 'pick-row__kumi', CLASS_BY_ID[s.cls].kumi)])
      var rem = remainOf(S, s.id)
      var b
      if (inl.indexOf(s.id) >= 0) {
        b = btn('pick-row__in', 'この回に入っています', 'pick-add-' + s.id)
        setOff(b, true)
        // 見えている文と読み上げ名をそろえる（「足す」と読ませない）
        b.setAttribute('aria-label', s.id + ' はこの回に入っています')
      } else {
        b = btn('btn-sub btn-sm', 'この回に足す', 'pick-add-' + s.id)
        if (rem < 1) setOff(b, true); else any = true
        b.setAttribute('aria-label', s.id + ' をこの回に足す')
      }
      b.addEventListener('click', function () { onAddMakeup(s.id) })
      add(li, [left, remainTag(rem), b])
      list.appendChild(li)
    })
    $('pick-none').hidden = any
    var pn = $('pick-notice')
    pn.textContent = ''
    pn.hidden = !ui.pickNotice
    if (ui.pickNotice) add(pn, [icon('i-info', 16), el('span', null, ui.pickNotice)])
    wrapWords(pick)
    return any
  }
  function openPick () {
    load()
    ui.notice = null
    ui.pickNotice = null
    renderAll()
    renderPick()
    if (!hasDialog) return
    pick.showModal()
    var first = STUDENTS.filter(function (s) { return pickable(s.id) })[0]
    focusId(first ? 'pick-add-' + first.id : 'pick-close')
  }
  function closePick (focusAdd) {
    if (pick.open) pick.close()
    ui.pickNotice = null
    if (focusAdd) focusId('btn-mk-add')
  }
  $('btn-mk-add').addEventListener('click', openPick)
  $('pick-close').addEventListener('click', function () { closePick(true) })
  pick.addEventListener('cancel', function (e) { e.preventDefault(); closePick(true) })
  function onAddMakeup (sid) {
    load()
    var r = addMakeup(S, ui.lesson, sid)
    if (r === 'zero' || r === 'already') {
      ui.pickNotice = r === 'zero' ? sid + ' は振替の残りが 0 のため、足せません' : sid + ' はもうこの回に入っています'
      renderAll(); renderPick()
      focusId('pick-add-' + sid)
      announce(ui.pickNotice)
      return
    }
    if (r !== 'ok') { renderAll(); renderPick(); return }
    save()
    closePick(false)
    renderAll()
    focusId('mk-rm-' + sid)
    announce(sid + ' を振替で足しました。' + attMsgAfter(sid))
  }
  function onRemoveMakeup (sid) {
    load()
    ui.notice = null
    var r = removeMakeup(S, ui.lesson, sid)
    if (r !== 'ok') { renderAll(); return }
    save()
    renderAll()
    focusId('btn-mk-add')
    announce(sid + ' の振替を取り消しました。' + attMsgAfter(sid))
  }

  // ---------- 月謝（§8） ----------
  function dueLine (month) { var t = feeTotals(S, month); return '未納 ' + ppl(t.dueN) + ' ' + yen(t.dueYen) }
  function visibleFee () {
    return STUDENTS.filter(function (s) { return !ui.dueOnly || !payOf(S, ui.month, s.id) })
  }
  function renderFee () {
    var mp = $('month-pick'); mp.textContent = ''
    MONTHS.forEach(function (m) {
      var b = btn('month-btn', null, 'month-' + m)
      var on = m === ui.month
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
      if (on) b.appendChild(icon('i-okc', 16))
      b.appendChild(nw(ym(m)))
      b.addEventListener('click', function () { onMonth(m) })
      mp.appendChild(b)
    })
    var t = feeTotals(S, ui.month)
    $('fs-due-n').textContent = String(t.dueN)
    $('fs-due-yen').textContent = yen(t.dueYen)
    $('fs-due-box').classList.toggle('is-due', t.dueN > 0)
    var dn = $('fs-due-note')
    dn.hidden = t.dueN > 0
    dn.textContent = t.dueN > 0 ? '' : ui.month === BASE_MONTH ? '今月の未納はありません' : 'この月の未納はありません'
    $('fs-paid-n').textContent = String(t.paidN)
    $('fs-paid-yen').textContent = yen(t.paidYen)
    $('fs-paid-note').textContent = '現金 ' + ppl(t.cashN) + ' ' + yen(t.cashYen) + '・振込 ' + ppl(t.bankN) + ' ' + yen(t.bankYen)
    $('fs-total-n').textContent = String(t.totalN)
    $('fs-total-yen').textContent = yen(t.totalYen)
    $('fs-total-note').textContent = '月4回 ' + ppl(t.c4N) + '・月2回 ' + ppl(t.c2N)
    $('fee-h').textContent = ym(ui.month) + 'の月謝（' + ppl(STUDENTS.length) + '）'
    var fb = $('btn-due-only')
    fb.setAttribute('aria-pressed', ui.dueOnly ? 'true' : 'false')
    var rows = visibleFee()
    $('fee-count').textContent = ppl(STUDENTS.length) + 'のうち ' + ppl(rows.length) + 'を表示'
    var list = $('fee-list'); list.textContent = ''
    rows.forEach(function (s) { list.appendChild(feeRow(s)) })
    var none = $('fee-none')
    none.hidden = rows.length > 0
    none.textContent = rows.length ? '' : ym(ui.month) + 'の未納はありません。'
  }
  function feeRow (s) {
    var p = payOf(S, ui.month, s.id)
    var f = feeOf(s)
    var li = el('li', 'fee-row' + (p ? '' : ' fee-row--due'))
    li.id = 'fee-row-' + s.id
    li.setAttribute('aria-labelledby', 'fee-id-' + s.id)
    var idb = el('div', 'fee-row__idbox')
    var idEl = el('span', 'fee-row__id', s.id); idEl.id = 'fee-id-' + s.id
    add(idb, [idEl, el('span', 'fee-row__meta', CLASS_BY_ID[s.cls].kumi + '・' + COURSE_NAME[s.course])])
    var y = el('div', 'fee-row__yen'); y.appendChild(yenEl(f))
    var stt = el('div', 'fee-row__state')
    var op = el('div', 'fee-row__op')
    if (p) {
      add(stt, [stateTag('paid'), el('span', 'fee-row__how', PAY_NAME[p.m] + '・' + md(p.d))])
      var u = btn('btn-sub btn-sm', '取り消す', 'fee-undo-' + s.id)
      u.setAttribute('aria-label', s.id + ' の ' + mOnly(ui.month) + '分 の入金を取り消す')
      u.addEventListener('click', function () { onUndoPay(s.id) })
      op.appendChild(u)
    } else {
      stt.appendChild(stateTag('due'))
      var b = btn('btn-main fee-pay', '入金済みにする', 'fee-pay-' + s.id)
      b.setAttribute('aria-label', s.id + ' の ' + mOnly(ui.month) + '分 ' + yen(f) + ' を入金済みにする')
      b.addEventListener('click', function () { onPay(s.id) })
      op.appendChild(b)
    }
    add(li, [idb, y, stt, op])
    return li
  }
  function onMonth (m) {
    load()
    if (ui.month !== m) {
      ui.month = m
      renderAll()
      announce(ym(m) + 'の月謝。' + dueLine(m))
    } else renderAll()
    focusId('month-' + m)
  }
  $('btn-due-only').addEventListener('click', function () {
    load()
    ui.dueOnly = !ui.dueOnly
    renderAll()
    focusId('btn-due-only')
    announce(ui.dueOnly ? '未納だけ表示。' + ppl(visibleFee().length) : 'すべて表示。' + ppl(STUDENTS.length))
  })
  function onPay (sid) {
    load()
    if (payOf(S, ui.month, sid)) { renderAll(); return }
    var month = ui.month
    var s = STUDENT_BY_ID[sid]
    var before = visibleFee().map(function (x) { return x.id })
    confirmBox({
      title: sid + ' の ' + mOnly(month) + '分を入金済みにしますか',
      body: '月謝 ' + yen(feeOf(s)) + '。入金の方法を選んでください。入金日は ' + md(TODAY) + '（デモの今日）にします。',
      ok: [{ text: '現金', icon: 'i-coin' }, { text: '振込', icon: 'i-book' }]
    }).then(function (n) {
      if (!n) return
      load()
      var how = n === 1 ? 'cash' : 'bank'
      var r = markPaid(S, month, sid, how)
      if (r === 'ok') save()
      renderAll()
      if (ui.dueOnly) {
        var i = before.indexOf(sid)
        var next = before.slice(i + 1).filter(function (x) { return $('fee-pay-' + x) })[0]
        focusId(next ? 'fee-pay-' + next : 'fee-h')
      } else focusId('fee-undo-' + sid)
      if (r === 'ok') announce(sid + ' の ' + mOnly(month) + '分 ' + yen(feeOf(s)) + ' を入金済み（' + PAY_NAME[how] + '）にしました。' + dueLine(month))
    })
  }
  function onUndoPay (sid) {
    load()
    var month = ui.month
    var p = payOf(S, month, sid)
    if (!p) { renderAll(); return }
    confirmBox({
      title: sid + ' の ' + mOnly(month) + '分を未納に戻しますか',
      body: PAY_NAME[p.m] + '・' + md(p.d) + 'の入金の記録を消して、未納にします。',
      ok: [{ text: '未納に戻す' }]
    }).then(function (n) {
      if (!n) return
      load()
      var r = unmarkPaid(S, month, sid)
      if (r === 'ok') save()
      renderAll()
      focusId($('fee-pay-' + sid) ? 'fee-pay-' + sid : 'fee-h')
      if (r === 'ok') announce(sid + ' の ' + mOnly(month) + '分を未納に戻しました。' + dueLine(month))
    })
  }

  // ---------- 月のまとめ（§9） ----------
  function td (cls, kids) { var c = el('td', cls); add(c, kids); return c }
  function renderSum () {
    var tot = { plan: 0, present: 0, mkIn: 0, m: 0, a: 0, rest: 0, remain: 0, remainN: 0 }
    var ft = feeTotals(S, BASE_MONTH)
    var tb = $('sum-tbody'); tb.textContent = ''
    var cards = $('sum-cards'); cards.textContent = ''
    STUDENTS.forEach(function (s) {
      var ms = monthStats(S, s.id)
      var p = payOf(S, BASE_MONTH, s.id)
      Object.keys(tot).forEach(function (k) { if (k !== 'remainN') tot[k] += ms[k] })
      if (ms.remain > 0) tot.remainN++
      var tr = el('tr', p ? '' : 'is-due')
      var th = el('th', 'c-id'); th.setAttribute('scope', 'row')
      add(th, [s.id, el('span', 't-kumi md', kumiW(s))])
      var pres = [String(ms.present)]
      if (ms.mkIn) pres.push(el('span', 't-sub', '（振替 ' + ms.mkIn + '）'))
      var rem = ms.remain > 0 ? el('span', 't-has', String(ms.remain)) : el('span', 't-zero', '0')
      var feeKids = [yen(feeOf(s)), add(el('span', 't-feetag md'), [stateTag(p ? 'paid' : 'due')])]
      var stKids = [stateTag(p ? 'paid' : 'due')]
      if (p) stKids.push(el('span', 't-how', PAY_NAME[p.m] + '・' + md(p.d)))
      add(tr, [th, td('lg t-kumicell', kumiW(s)), td('', COURSE_NAME[s.course]), td('num', String(ms.plan)), td('num', pres), td('num', String(ms.m)), td('num', String(ms.a)),
        td('num', String(ms.rest)), td('num', rem), td('num', feeKids), td('lg', stKids)])
      tb.appendChild(tr)
      // スマホのカード
      var li = el('li', 'sum-card')
      var head = add(el('div', 'sum-card__head'), [el('span', 'sum-card__id', s.id), el('span', 'sum-card__meta', kumiW(s) + '・' + COURSE_NAME[s.course])])
      var feeRowEl = add(el('div', 'sum-card__fee'), [remainTag(ms.remain), el('strong', null, yen(feeOf(s))), stateTag(p ? 'paid' : 'due')])
      add(li, [head,
        // 語と数の間で折れないように、区切り（／・）の所だけで折る（2026-11-21：375px で「まだの回」と数が別の行に分かれていた）
        add(el('p'), [nw('出席 ' + times(ms.present)), nw('（うち振替 ' + ms.mkIn + '）'), '／', nw('予定 ' + times(ms.plan))]),
        add(el('p'), [nw('欠席（振替あり） ' + ms.m), '・', nw('欠席 ' + ms.a), '・', nw('まだの回 ' + ms.rest)]),
        feeRowEl])
      cards.appendChild(li)
    })
    // 合計の行
    var tf = $('sum-tfoot'); tf.textContent = ''
    var tr = el('tr')
    var th = el('th', 'c-id', '合計 ' + ppl(STUDENTS.length)); th.setAttribute('scope', 'row')
    add(tr, [th, td('lg', ''), td('', ''), td('num', String(tot.plan)), td('num', [String(tot.present), el('span', 't-sub', '（振替 ' + tot.mkIn + '）')]), td('num', String(tot.m)), td('num', String(tot.a)),
      td('num', String(tot.rest)), td('num', String(tot.remain)), td('num', [yen(ft.totalYen), el('span', 't-due', '未納 ' + yen(ft.dueYen))]),
      td('lg', ['入金済み ' + ppl(ft.paidN), el('span', 't-due', '未納 ' + ppl(ft.dueN))])])
    tf.appendChild(tr)
    var tc = el('li', 'sum-card sum-card--total')
    add(tc, [add(el('p'), [nw('合計 ' + ppl(STUDENTS.length)), '・', nw('予定 ' + times(tot.plan)), '・', nw('出席 ' + times(tot.present)), nw('（うち振替 ' + tot.mkIn + '）')]),
      add(el('p'), [nw('欠席（振替あり） ' + tot.m), '・', nw('欠席 ' + tot.a), '・', nw('まだの回 ' + tot.rest)]),
      add(el('p'), [nw('振替の残り ' + tot.remain), '・', nw('月謝 ' + yen(ft.totalYen))]),
      add(el('p'), ['入金済み ' + yen(ft.paidYen) + '・', el('span', 't-due', '未納 ' + yen(ft.dueYen))])])
    cards.appendChild(tc)
    // 上の数字
    $('ms-p-n').textContent = String(tot.present)
    $('ms-p-note').textContent = 'うち振替 ' + tot.mkIn
    $('ms-a-n').textContent = String(tot.m + tot.a)
    $('ms-a-note').textContent = 'うち振替あり ' + tot.m
    $('ms-r-n').textContent = String(tot.remain)
    $('ms-r-note').textContent = tot.remainN ? ppl(tot.remainN) + 'に残りがあります' : '残りのある生徒はいません'
    $('ms-due-n').textContent = String(ft.dueN)
    $('ms-due-yen').textContent = yen(ft.dueYen)
    $('ms-due-box').classList.toggle('is-due', ft.dueN > 0)
    $('ms-due-note').textContent = '入金済み ' + yen(ft.paidYen)
    // CSV
    var cn = $('csv-name'); cn.textContent = ''
    add(cn, ['ファイル名：', nw(CSV_NAME), nw('（' + ppl(STUDENTS.length) + '）')])
    $('csv-peek').textContent = buildCsv(S).slice(1).split('\r\n').slice(0, 4).join('\n')
  }
  function renderCols () {
    var tb = $('csv-cols'); tb.textContent = ''
    CSV_COLS.forEach(function (c, i) { add(tb, add(el('tr'), [el('td', null, String(i + 1)), el('td', 'nw', c[0]), el('td', null, c[1])])) })
  }
  // 表の外側の枠が実際に横に動く時だけフォーカスできるように（§15-1 5）
  function updateScrollFocus () {
    var sc = $('sum-scroll')
    if (sc.offsetWidth && sc.scrollWidth > sc.clientWidth) {
      sc.tabIndex = 0
      sc.setAttribute('aria-label', '生徒ごとのまとめの表（横に動かせます）')
      sc.setAttribute('role', 'region')
    } else {
      sc.removeAttribute('tabindex'); sc.removeAttribute('aria-label'); sc.removeAttribute('role')
    }
  }
  window.addEventListener('resize', updateScrollFocus)
  $('btn-csv').addEventListener('click', function () {
    load()
    var blob = new Blob([buildCsv(S)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url; a.download = CSV_NAME
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    showToast('CSV を作りました（' + ppl(STUDENTS.length) + '）')
  })

  // ---------- 紙面（§9-8。値は textContent） ----------
  function stampSvg () {
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('class', 'stamp'); s.setAttribute('width', '56'); s.setAttribute('height', '56'); s.setAttribute('viewBox', '0 0 56 56')
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', '見本の印（この表は見本です）')
    function sv (tag, at, text) {
      var e = document.createElementNS(NS, tag)
      Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]) })
      if (text) e.textContent = text
      s.appendChild(e)
    }
    sv('rect', { x: '1.5', y: '1.5', width: '53', height: '53', rx: '4', fill: 'none', stroke: '#B23A2E', 'stroke-width': '3' })
    sv('rect', { x: '6.5', y: '6.5', width: '43', height: '43', rx: '2', fill: 'none', stroke: '#B23A2E', 'stroke-width': '1' })
    var ft = { x: '28', 'text-anchor': 'middle', 'font-size': '18', 'font-weight': '700', fill: '#B23A2E', 'font-family': 'Hiragino Mincho ProN, Yu Mincho, YuMincho, serif' }
    sv('text', Object.assign({ y: '26' }, ft), '見')
    sv('text', Object.assign({ y: '45' }, ft), '本')
    return s
  }
  var PRINT_COLS = [['生徒', 14], ['組', 20], ['クラス', 22], ['コース', 14], ['予定', 11, 1], ['出席', 11, 1], ['うち振替', 13, 1], ['欠席（振替あり）', 22, 1], ['欠席', 11, 1], ['まだの回', 15, 1], ['振替の残り', 17, 1], ['月謝', 20, 1], ['状態', 18], ['方法・入金日', 65]]
  function buildSheet () {
    var ft = feeTotals(S, BASE_MONTH)
    var tot = { plan: 0, present: 0, mkIn: 0, m: 0, a: 0, rest: 0, remain: 0 }
    var head = el('div', 'sheet__head')
    var shop = el('p', 'sheet__shop', SCHOOL)
    shop.appendChild(stampSvg())
    add(head, [shop, el('p', 'sheet__period', '2026年11月のまとめ（' + md(TODAY) + 'までの記録）')])
    var cg = el('colgroup')
    PRINT_COLS.forEach(function (c) { var col = el('col'); col.style.width = c[1] + 'mm'; cg.appendChild(col) })
    var thead = add(el('thead'), add(el('tr'), PRINT_COLS.map(function (c) { var t = el('th', c[2] ? 'num' : null, c[0]); t.setAttribute('scope', 'col'); return t })))
    var tbody = el('tbody')
    STUDENTS.forEach(function (s) {
      var ms = monthStats(S, s.id)
      Object.keys(tot).forEach(function (k) { tot[k] += ms[k] })
      var p = payOf(S, BASE_MONTH, s.id)
      var c = CLASS_BY_ID[s.cls]
      var cells = [s.id, c.kumi, c.day + ' ' + c.time, COURSE_NAME[s.course], ms.plan, ms.present, ms.mkIn, ms.m, ms.a, ms.rest, ms.remain, yen(feeOf(s)), p ? '入金済み' : '未納', p ? PAY_NAME[p.m] + ' ' + md(p.d) : '—']
      tbody.appendChild(add(el('tr', p ? null : 'is-due'), cells.map(function (v, i) {
        var e = el(i === 0 ? 'th' : 'td', PRINT_COLS[i][2] ? 'num' : null, String(v))
        if (i === 0) e.setAttribute('scope', 'row')
        return e
      })))
    })
    var fr = add(el('tr'), [(function () { var t = el('th', null, '合計 ' + ppl(STUDENTS.length)); t.setAttribute('scope', 'row'); t.colSpan = 4; return t })(),
      el('td', 'num', String(tot.plan)), el('td', 'num', String(tot.present)), el('td', 'num', String(tot.mkIn)), el('td', 'num', String(tot.m)), el('td', 'num', String(tot.a)),
      el('td', 'num', String(tot.rest)), el('td', 'num', String(tot.remain)), el('td', 'num', yen(ft.totalYen)), (function () { var t = el('td', null, '未納 ' + ppl(ft.dueN) + ' ' + yen(ft.dueYen)); t.colSpan = 2; return t })()])
    var table = add(el('table'), [cg, thead, tbody, add(el('tfoot'), fr)])
    return add(el('div', 'sheet'), [head, table,
      el('p', 'sheet__sum', '入金済み ' + ppl(ft.paidN) + ' ' + yen(ft.paidYen) + '（現金 ' + ppl(ft.cashN) + ' ' + yen(ft.cashYen) + '・振込 ' + ppl(ft.bankN) + ' ' + yen(ft.bankYen) + '）／未納 ' + ppl(ft.dueN) + ' ' + yen(ft.dueYen)),
      el('p', 'sheet__foot', 'デモ（架空の教室）です。表の生徒・数・金額はすべて架空です。TENKA LAB の制作見本です。')])
  }
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  function fillPrint () { load(); elPrintRoot.textContent = ''; elPrintRoot.appendChild(buildSheet()) }
  $('btn-print').addEventListener('click', function () {
    fillPrint()
    document.title = PRINT_TITLE
    window.print()
  })
  window.addEventListener('beforeprint', function () {
    if (!elPrintRoot.firstChild) fillPrint()
    document.title = PRINT_TITLE
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  // ---------- まとめて描き直す ----------
  function renderTabs () {
    var n = feeTotals(S, BASE_MONTH).dueN
    var badge = $('tab-fee-badge')
    badge.hidden = n === 0
    badge.textContent = n ? '未納 ' + n : ''
    $('tab-fee').setAttribute('aria-label', n ? '月謝（' + mOnly(BASE_MONTH) + 'の未納 ' + ppl(n) + '）' : '月謝')
  }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    renderAtt()
    renderFee()
    renderSum()
    renderTabs()
    if (pick.open) renderPick()
    ;['panel-att', 'panel-fee', 'panel-sum'].forEach(function (id) { wrapWords($(id)) })
    updateScrollFocus()
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }

  // ---------- 見本に戻す（§11-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox({ title: '見本に戻しますか', body: '出欠・振替・月謝の記録をすべて消して、見本（' + md(TODAY) + 'までの記録）に戻します。', ok: [{ text: '戻す' }] }).then(function (n) {
      if (!n) return
      S = sample()
      save()
      ui.cls = 'B'; ui.lesson = firstLesson('B'); ui.month = BASE_MONTH; ui.dueOnly = false; ui.notice = null; ui.pickNotice = null
      renderAll()
      focusId('btn-reset')
      showToast('見本に戻しました')
    })
  })

  // ---------- 2つのタブの同期（§11-3） ----------
  window.addEventListener('storage', function (e) {
    if (!canSave) return
    if (e.key !== null && e.key !== KEY) return
    if (e.key === null || e.newValue === null) { S = sample(); save() } else load()
    renderAll()
  })

  // ---------- はじめ ----------
  $('note-nosave').hidden = canSave
  load()
  if (!canSave) $('note-nosave').hidden = false
  renderCols()
  wrapWords(document.body)
  renderAll()
  openTab(ui.tab, { noScroll: true })

  // 検査用（状態を引数で受ける純粋な関数だけ。画面の状態は出さない）
  window.__demo17 = { remainOf: remainOf, lessonStats: lessonStats, monthStats: monthStats, feeTotals: feeTotals, csvCell: csvCell, buildCsv: buildCsv, validate: validate, sample: sample }
})()
