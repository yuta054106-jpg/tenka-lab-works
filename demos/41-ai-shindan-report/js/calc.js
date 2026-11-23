// AI 活用の診断の見本（ミツカド舎・架空）の計算。画面に触らない純粋な関数だけ
// すべて整数で計算する。月の分数＝月の回数×1回の分数、月の時間＝月の分数÷60（0.1時間で四捨五入）、月の額＝月の分数÷60×時給（1円で四捨五入）
// 画面・CSV・印刷はどれもこの関数で出すので、端数の処理は同じになる
var Calc41 = (function (D) {
  'use strict'
  var WAY_NAME = {}
  D.WAYS.forEach(function (w) { WAY_NAME[w.id] = w.name })
  var TASK_BY_NO = {}
  D.TASKS.forEach(function (t) { TASK_BY_NO[t.no] = t })
  var MAX_MIN = 480 // 15作業の月の分の最大（横棒の長さの基準）

  // 月の分 ＝ 回数 × 1回の分
  function minutes (t) { return t.times * t.per }
  // 0.1時間の数（四捨五入）
  function h10 (min) { return Math.floor((min * 20 + 60) / 120) }
  // 時間の字（2.0 のように小数1桁）
  function fmtHours (min) {
    var h = h10(min)
    return Math.floor(h / 10) + '.' + (h % 10)
  }
  // 月の額（円未満を四捨五入）
  function yen (min, wage) { return Math.floor((min * wage * 2 + 60) / 120) }
  // 3桁区切り（負の数は前に全角のマイナス）
  function fmtYen (n) {
    var neg = n < 0
    var s = String(neg ? -n : n)
    var out = ''
    while (s.length > 3) {
      out = ',' + s.slice(-3) + out
      s = s.slice(0, -3)
    }
    return (neg ? '−' : '') + s + out
  }
  // 時給の入力を読む。整数・800〜3,000・10の倍数だけ。外れたら null
  function parseWage (v) {
    var s = String(v === null || v === undefined ? '' : v)
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
    s = s.replace(/[,，、\s]/g, '')
    if (!/^\d+$/.test(s)) return null
    var n = parseInt(s, 10)
    if (n < 800 || n > 3000 || n % 10 !== 0) return null
    return n
  }

  // 並べ替え（元の配列は変えない。同じ値は番号の小さい順）
  var SORTS = [
    { id: 'no', name: '番号順' },
    { id: 'time', name: '月の時間が多い順' },
    { id: 'yen', name: '月の額が多い順' }
  ]
  function sortName (key) {
    for (var i = 0; i < SORTS.length; i++) if (SORTS[i].id === key) return SORTS[i].name
    return ''
  }
  function byNo (a, b) { return a.no < b.no ? -1 : a.no > b.no ? 1 : 0 }
  function sortTasks (tasks, key, wage) {
    var list = tasks.slice()
    list.sort(function (a, b) {
      if (key === 'time') {
        var d = minutes(b) - minutes(a)
        if (d) return d
      } else if (key === 'yen') {
        var e = yen(minutes(b), wage) - yen(minutes(a), wage)
        if (e) return e
      }
      return byNo(a, b)
    })
    return list
  }
  function filterTasks (tasks, way) {
    if (!way || way === 'all') return tasks.slice()
    return tasks.filter(function (t) { return t.way === way })
  }
  // 表示の順：絞ってから並べる
  function view (way, key, wage) { return sortTasks(filterTasks(D.TASKS, way), key, wage) }

  // 合計：時間は合計の分から、額は行ごとに丸めた額の和
  function totals (tasks, wage) {
    var min = 0
    var sum = 0
    tasks.forEach(function (t) {
      var m = minutes(t)
      min += m
      sum += yen(m, wage)
    })
    return { n: tasks.length, min: min, hours: fmtHours(min), yen: sum }
  }
  function byWay (wage) {
    return D.WAYS.map(function (w) {
      var t = totals(filterTasks(D.TASKS, w.id), wage)
      t.way = w.id
      return t
    })
  }
  function barWidth (min, max) { return Math.round(max * min / MAX_MIN) }

  // 提案の減る見込み
  function proposalSaving (p, wage) {
    var before = 0
    var after = 0
    p.targets.forEach(function (x) { before += x.before; after += x.after })
    return { before: before, after: after, min: p.saving, hours: fmtHours(p.saving), yen: yen(p.saving, wage) }
  }
  function proposalTotals (wage) {
    var o = { before: 0, after: 0, min: 0, yen: 0 }
    D.PROPOSALS.forEach(function (p) {
      var s = proposalSaving(p, wage)
      o.before += s.before
      o.after += s.after
      o.min += s.min
      o.yen += s.yen
    })
    o.hours = fmtHours(o.min)
    return o
  }
  // 1本目（私たちが作る分）の減る見込み
  function firstSaving (wage) {
    var p = D.PROPOSALS.filter(function (x) { return x.first })[0]
    return proposalSaving(p, wage)
  }
  function targetLabel (p) {
    return p.targets.map(function (x) { return x.task + ' ' + TASK_BY_NO[x.task].name }).join('・')
  }

  // ふりかえり表（F4 だけ時給で計算。差は丸めた額どうしの差）
  function signed (n, unit) {
    if (n === 0) return '±0' + unit
    return (n > 0 ? '+' : '') + fmtYen(n) + unit
  }
  function reviewRows (wage) {
    return D.REVIEW.map(function (r) {
      if (r.no !== 'F4') return r
      var a = yen(r.planMin, wage)
      var b = yen(r.actualMin, wage)
      return { no: r.no, item: '減った額（月・時給 ' + fmtYen(wage) + '円）', plan: fmtYen(a) + '円', actual: fmtYen(b) + '円', diff: signed(b - a, '円'), judge: r.judge }
    })
  }

  // 読み上げの文（40字以内）
  function saySort (key) { return sortName(key) + 'に並べました。' }
  function sayFilter (way, n) { return way === 'all' ? '15作業すべてです。' : WAY_NAME[way] + 'で' + n + '件です。' }
  function sayWage (w) { return '時給' + fmtYen(w) + '円で計算し直しました。' }
  function sayWageBad () { return '時給は800〜3,000円の10円きざみです。' }
  function sayCheck (n) { return '店で決めた ' + n + ' / ' + D.RULES.length + ' です。' }

  // ---------- CSV ----------
  // 表計算ソフトで式として読まれないよう、= + - @ タブ CR で始まる値の先頭に ' を足してから囲む
  function csvCell (v) {
    var s = v === null || v === undefined ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  function csvText (rows) {
    return '﻿' + rows.map(function (r) { return r.map(csvCell).join(',') }).join('\r\n') + '\r\n'
  }
  // 並べ替え・絞り込みに関係なく番号順の全件。額はいまの時給
  function tasksCsv (wage) {
    var rows = [['番号', '作業', '誰が', '回数（月）', '1回の分', '月の分', '月の時間', '時給', '月の額', '向いているやり方', '理由']]
    D.TASKS.forEach(function (t) {
      var m = minutes(t)
      rows.push([t.no, t.name, t.who, t.times, t.per, m, fmtHours(m), wage, yen(m, wage), WAY_NAME[t.way], t.reason])
    })
    var s = totals(D.TASKS, wage)
    rows.push(['合計', s.n + '作業', '', '', '', s.min, s.hours, wage, s.yen, '', ''])
    return csvText(rows)
  }
  function proposalsCsv (wage) {
    var rows = [['番号', '提案', 'やり方', '対象の作業', '前の分（月）', '後の分（月）', '減る見込みの分（月）', '減る見込みの時間（月）', '時給', '減る見込みの額（月・推測）']]
    D.PROPOSALS.forEach(function (p) {
      var s = proposalSaving(p, wage)
      rows.push([p.no, p.title, WAY_NAME[p.way], p.targets.map(function (x) { return x.task }).join('・'), s.before, s.after, s.min, s.hours, wage, s.yen])
    })
    var t = proposalTotals(wage)
    rows.push(['合計', D.PROPOSALS.length + 'つ', '', '', t.before, t.after, t.min, t.hours, wage, t.yen])
    return csvText(rows)
  }

  return Object.freeze({
    D: D, WAY_NAME: WAY_NAME, TASK_BY_NO: TASK_BY_NO, SORTS: SORTS, MAX_MIN: MAX_MIN,
    minutes: minutes, h10: h10, fmtHours: fmtHours, yen: yen, fmtYen: fmtYen, parseWage: parseWage,
    sortName: sortName, sortTasks: sortTasks, filterTasks: filterTasks, view: view, totals: totals, byWay: byWay, barWidth: barWidth,
    proposalSaving: proposalSaving, proposalTotals: proposalTotals, firstSaving: firstSaving, targetLabel: targetLabel, reviewRows: reviewRows,
    saySort: saySort, sayFilter: sayFilter, sayWage: sayWage, sayWageBad: sayWageBad, sayCheck: sayCheck,
    csvCell: csvCell, tasksCsv: tasksCsv, proposalsCsv: proposalsCsv
  })
})(typeof Data41 !== 'undefined' ? Data41 : require('./data.js'))
if (typeof module !== 'undefined' && module.exports) module.exports = Calc41
