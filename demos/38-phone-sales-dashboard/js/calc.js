// ==== 集計 ここから（calc.js と Code.gs と index.html で同じ中身） ====
// 売上をスマホで見る画面の集計。シートの値（文字）を受け取り、画面に出す数と文を返す純粋な関数だけ
// 日付は 'YYYY-MM-DD' の文字で扱い、曜日も計算で出す（時計を読まない）
var Calc38 = (function () {
  'use strict'
  var WD = ['日', '月', '火', '水', '木', '金', '土']
  var MINUS = '−'
  var ZEN = '０１２３４５６７８９'

  // ---------- 暦 ----------
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  // 坂本の方法（0＝日 … 6＝土）
  function weekday (s) {
    var y = Number(s.slice(0, 4))
    var m = Number(s.slice(5, 7))
    var d = Number(s.slice(8, 10))
    var t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
    if (m < 3) y -= 1
    return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7
  }
  function isLeap (y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 }
  // ym は 'YYYY-MM'
  function daysInMonth (ym) {
    var y = Number(ym.slice(0, 4))
    var m = Number(ym.slice(5, 7))
    if (m === 2) return isLeap(y) ? 29 : 28
    return [4, 6, 9, 11].indexOf(m) >= 0 ? 30 : 31
  }
  function addMonth (ym, k) {
    var n = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1 + k
    var y = Math.floor(n / 12)
    return y + '-' + pad2(n - y * 12 + 1)
  }
  function dateOf (ym, d) { return ym + '-' + pad2(d) }
  function monthNo (ym) { return Number(ym.slice(5, 7)) }
  function dayNo (date) { return Number(date.slice(8, 10)) }
  function isClosed (date, closed) { return closed.indexOf(weekday(date)) >= 0 }
  // その月の、定休日の曜日でない日の数（from 日〜to 日）
  function openDays (ym, from, to, closed) {
    var n = 0
    for (var d = from; d <= to; d++) if (!isClosed(dateOf(ym, d), closed)) n++
    return n
  }

  // ---------- 値の読み方 ----------
  function clean (v) { return v === null || v === undefined ? '' : String(v).trim() }
  function toHalf (s) {
    var out = ''
    for (var i = 0; i < s.length; i++) {
      var k = ZEN.indexOf(s.charAt(i))
      out += k >= 0 ? String(k) : s.charAt(i)
    }
    return out
  }
  // 金額・客数：empty（空欄）／num（0 以上の整数）／neg（マイナス）／nan（数字でない）
  function readAmount (v) {
    var s = toHalf(clean(v))
    if (s === '') return { kind: 'empty' }
    s = s.replace(/[,，]/g, '').replace(/円$/, '')
    var neg = /^[-−－▲△]/.test(s)
    if (neg) s = s.slice(1)
    s = s.replace(/^[¥￥]/, '')
    if (!/^\d+$/.test(s)) return { kind: 'nan' }
    if (neg) return { kind: 'neg' }
    return { kind: 'num', value: Number(s) }
  }
  // 'YYYY-MM-DD'・'YYYY/M/D' → 'YYYY-MM-DD'。正しくなければ null
  function readDate (v) {
    var m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(toHalf(clean(v)))
    if (!m) return null
    var mo = Number(m[2])
    var d = Number(m[3])
    if (mo < 1 || mo > 12) return null
    var ym = m[1] + '-' + pad2(mo)
    if (d < 1 || d > daysInMonth(ym)) return null
    return dateOf(ym, d)
  }
  // 'YYYY-MM'・'YYYY/M' → 'YYYY-MM'
  function readYm (v) {
    var m = /^(\d{4})[-/](\d{1,2})$/.exec(toHalf(clean(v)))
    if (!m) return null
    var mo = Number(m[2])
    if (mo < 1 || mo > 12) return null
    return m[1] + '-' + pad2(mo)
  }

  // ---------- 書き方（桁区切り・率は自前で） ----------
  function fmtNum (n) {
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return n < 0 ? MINUS + s : s
  }
  function fmtYen (n) { return fmtNum(n) + '円' }
  function fmtSignedYen (n) { return n > 0 ? '+' + fmtNum(n) : fmtNum(n) }
  // r は千分の1の整数（750 → 75.0%）
  function rateText (r) {
    var a = Math.abs(r)
    return Math.floor(a / 10) + '.' + (a % 10)
  }
  function fmtRate (r) { return (r < 0 ? MINUS : '') + rateText(r) + '%' }
  function fmtSignedRate (r) { return (r > 0 ? '+' : r < 0 ? MINUS : '') + rateText(r) + '%' }
  function fmtMD (date) { return monthNo(date.slice(0, 7)) + '/' + dayNo(date) + '（' + WD[weekday(date)] + '）' }
  function fmtJMD (date) { return monthNo(date.slice(0, 7)) + '月' + dayNo(date) + '日（' + WD[weekday(date)] + '）' }
  function fmtYm (ym) { return Number(ym.slice(0, 4)) + '年' + monthNo(ym) + '月' }
  // 千分の1に四捨五入（符号を外して丸め、符号を後で付ける）
  function rnd1 (num, den) {
    var r = Math.round(Math.abs(num) * 1000 / den)
    return num < 0 ? -r : r
  }
  function cut40 (s) {
    var a = Array.from(s)
    return a.length > 40 ? a.slice(0, 40).join('') + '…' : s
  }

  // ---------- シートを読む ----------
  // 「売上」シート：数える行（日付ごと）・誤りの日・誤りの一覧
  function parseSales (rows, today) {
    var counted = {}
    var errDays = {}
    var first = {}
    var errors = []
    rows.forEach(function (r) {
      var ds = clean(r.date)
      var ss = clean(r.sales)
      var cs = clean(r.customers)
      if (ds === '' && ss === '' && cs === '') return
      var date = readDate(ds)
      if (!date) {
        errors.push({ sheet: 'sales', row: r.row, field: 'date', kind: ds === '' ? 'nodate' : 'date', input: ds, date: '' })
        return
      }
      if (date > today) return
      if (ss === '') return
      if (first[date]) {
        errors.push({ sheet: 'sales', row: r.row, field: 'date', kind: 'dup', input: ds, date: date, first: first[date] })
        return
      }
      first[date] = r.row
      var a = readAmount(ss)
      if (a.kind !== 'num') {
        errors.push({ sheet: 'sales', row: r.row, field: 'sales', kind: a.kind, input: ss, date: date })
        errDays[date] = true
        return
      }
      var c = readAmount(cs)
      if (c.kind === 'nan' || c.kind === 'neg') {
        errors.push({ sheet: 'sales', row: r.row, field: 'customers', kind: c.kind, input: cs, date: date })
        errDays[date] = true
        return
      }
      counted[date] = { row: r.row, sales: a.value, customers: c.kind === 'num' ? c.value : null }
    })
    errors.sort(function (x, y) { return x.row - y.row })
    return { counted: counted, errDays: errDays, errors: errors }
  }
  // 「目標」シート：年月ごとの目標・誤りの一覧
  function parseTargets (rows) {
    var targets = {}
    var first = {}
    var errors = []
    rows.forEach(function (r) {
      var ys = clean(r.ym)
      var ts = clean(r.target)
      if (ys === '' && ts === '') return
      var ym = readYm(ys)
      if (!ym) {
        errors.push({ sheet: 'target', row: r.row, field: 'ym', kind: ys === '' ? 'noym' : 'ym', input: ys, ym: '' })
        return
      }
      if (ts === '') return
      if (first[ym]) {
        errors.push({ sheet: 'target', row: r.row, field: 'ym', kind: 'dup', input: ys, ym: ym, first: first[ym] })
        return
      }
      first[ym] = r.row
      var a = readAmount(ts)
      if (a.kind === 'num' && a.value === 0) {
        errors.push({ sheet: 'target', row: r.row, field: 'target', kind: 'zero', input: ts, ym: ym })
        return
      }
      if (a.kind !== 'num') {
        errors.push({ sheet: 'target', row: r.row, field: 'target', kind: a.kind, input: ts, ym: ym })
        return
      }
      targets[ym] = a.value
    })
    errors.sort(function (x, y) { return x.row - y.row })
    return { targets: targets, errors: errors }
  }
  // 1日〜upto 日の合計
  function sumMonth (counted, ym, upto) {
    var o = { total: 0, bizDone: 0, customers: 0, custSales: 0 }
    for (var d = 1; d <= upto; d++) {
      var c = counted[dateOf(ym, d)]
      if (!c) continue
      o.total += c.sales
      o.bizDone++
      if (c.customers !== null) { o.customers += c.customers; o.custSales += c.sales }
    }
    o.unit = o.customers > 0 ? Math.round(o.custSales / o.customers) : null
    return o
  }
  function hasMonth (counted, ym) {
    var D = daysInMonth(ym)
    for (var d = 1; d <= D; d++) if (counted[dateOf(ym, d)]) return true
    return false
  }

  // ---------- 画面1枚分の数 ----------
  // input：{ salesRows, targetRows, today, ym, closedWeekdays, monthsBack, readAt, shopName }
  function getDashboard (input) {
    var today = input.today
    var closed = input.closedWeekdays || [1]
    var back = typeof input.monthsBack === 'number' ? input.monthsBack : 12
    var curYm = today.slice(0, 7)
    var minYm = addMonth(curYm, -back)
    var ym = input.ym || curYm
    if (ym > curYm) ym = curYm
    if (ym < minYm) ym = minYm
    var ps = parseSales(input.salesRows || [], today)
    var pt = parseTargets(input.targetRows || [])
    var D = daysInMonth(ym)
    var isCurrent = ym === curYm
    var upto = isCurrent ? dayNo(today) : D
    var cur = sumMonth(ps.counted, ym, upto)
    var bizMonth = openDays(ym, 1, D, closed)
    var target = Object.prototype.hasOwnProperty.call(pt.targets, ym) ? pt.targets[ym] : null
    var dailyGoal = target !== null && bizMonth > 0 ? Math.round(target / bizMonth) : null
    var restBiz = 0
    if (isCurrent) {
      restBiz = openDays(ym, upto + 1, D, closed)
      if (!isClosed(today, closed) && !ps.counted[today] && !ps.errDays[today]) restBiz += 1
    }
    var prevYm = addMonth(ym, -1)
    var prevUpto = Math.min(upto, daysInMonth(prevYm))
    var prev = hasMonth(ps.counted, prevYm) ? sumMonth(ps.counted, prevYm, prevUpto) : null
    var days = []
    var errDayCount = 0
    var maxDay = null
    var goalDays = 0
    for (var d = 1; d <= D; d++) {
      var date = dateOf(ym, d)
      var c = ps.counted[date]
      var day = { d: d, date: date, state: 'closed', sales: null, customers: null, diffGoal: null, today: date === today }
      if (d > upto) day.state = 'future'
      else if (c) {
        day.state = 'sales'
        day.sales = c.sales
        day.customers = c.customers
        if (dailyGoal !== null) {
          day.diffGoal = c.sales - dailyGoal
          if (c.sales >= dailyGoal) goalDays++
        }
        if (!maxDay || c.sales > maxDay.sales) maxDay = day
      } else if (ps.errDays[date]) { day.state = 'error'; errDayCount++ }
      days.push(day)
    }
    var errors = ps.errors.concat(pt.errors)
    var diff = prev ? cur.total - prev.total : null
    return {
      shopName: input.shopName || '',
      readAt: input.readAt || '',
      today: today,
      ym: ym,
      month: monthNo(ym),
      isCurrent: isCurrent,
      daysInMonth: D,
      upto: upto,
      hasData: cur.bizDone > 0,
      total: cur.total,
      bizDone: cur.bizDone,
      bizMonth: bizMonth,
      target: target,
      dailyGoal: dailyGoal,
      rate: target !== null ? rnd1(cur.total, target) : null,
      remain: target !== null ? Math.max(target - cur.total, 0) : null,
      over: target !== null ? Math.max(cur.total - target, 0) : null,
      restBiz: restBiz,
      forecast: isCurrent && cur.bizDone >= 1 ? cur.total + Math.round(cur.total * restBiz / cur.bizDone) : null,
      avg: cur.bizDone >= 1 ? Math.round(cur.total / cur.bizDone) : null,
      customers: cur.customers,
      unit: cur.unit,
      prevYm: prevYm,
      prevMonth: monthNo(prevYm),
      prevUpto: prevUpto,
      prev: prev,
      diff: diff,
      diffRate: prev && prev.total > 0 ? rnd1(diff, prev.total) : null,
      days: days,
      bars: days.filter(function (x) { return x.state === 'sales' }).length,
      goalDays: goalDays,
      maxDay: maxDay,
      errDays: errDayCount,
      errors: errors,
      canPrev: ym > minYm,
      canNext: ym < curYm,
      nextYm: addMonth(ym, 1)
    }
  }

  // ---------- 画面の文（すべてここで作る） ----------
  function sumTitle (h) { return h.month + '月の売上' + (h.isCurrent ? '（' + h.upto + '日まで）' : '（月の合計）') }
  function emptyText (h) {
    return h.month + '月の入力は' + (h.isCurrent ? 'まだ' : '') + 'ありません。「売上」シートに ' + h.month + '月の行を入れると、ここに出ます。'
  }
  function noTargetText (h) {
    return h.month + '月の目標が入っていません。「目標」シートに ' + h.ym + ' の行を足すと、達成率が出ます。'
  }
  // 目標との差の行：{ label, value } か { sentence }
  function remainLine (h) {
    if (h.target === null) return null
    if (h.total < h.target) return { label: h.isCurrent ? '目標まで残り' : '目標まで足りなかった分', value: fmtYen(h.remain) }
    if (h.total === h.target) return { sentence: '目標ちょうどです' }
    return { sentence: '目標を ' + fmtYen(h.over) + (h.isCurrent ? ' 上回っています' : ' 上回りました') }
  }
  function bizText (h) { return h.bizDone + '日' + (h.isCurrent ? '（残り ' + h.restBiz + '日）' : '') }
  function forecastLines (h) {
    if (!h.isCurrent || h.forecast === null) return null
    if (h.restBiz === 0) return { none: '残りの営業日はありません。この月の合計は ' + fmtYen(h.total) + ' です。' }
    var cmp = '目安'
    if (h.target !== null) {
      if (h.forecast < h.target) cmp = '目安・目標まで あと ' + fmtYen(h.target - h.forecast)
      else if (h.forecast > h.target) cmp = '目安・目標を ' + fmtYen(h.forecast - h.target) + ' 上回る見込み'
      else cmp = '目安・目標ちょうどの見込み'
    }
    var notes = ['入力済みの営業日の平均 × 残りの営業日で出した目安です。']
    if (h.bizDone <= 4) notes.push('まだ' + h.bizDone + '日分なので、見込みは大きくぶれます。')
    return { head: 'このペースなら月末は', value: h.forecast, cmp: cmp, notes: notes }
  }
  function errorLineText (h) { return '数えていない行が ' + h.errors.length + '行 あります（いちばん下に一覧）。' }
  function prevPeriod (h) { return h.prevMonth + '月1日〜' + h.prevUpto + '日' }
  function curPeriod (h) { return h.month + '月1日〜' + h.upto + '日' }
  function prevLines (h) {
    if (!h.prev) return { none: h.prevMonth + '月の入力がないため、比べられません。', period: prevPeriod(h) + ' と比べています' }
    var diff = h.diff
    var word = diff > 0 ? '増' : diff < 0 ? '減' : '同じ'
    var amount = diff === 0 ? '' : fmtYen(Math.abs(diff))
    var rate = h.diffRate === null ? '（前月は0円）' : '（' + fmtSignedRate(h.diffRate) + '）'
    return {
      period: prevPeriod(h) + ' と比べています',
      curLabel: (h.isCurrent ? '今月' : h.month + '月') + '（' + curPeriod(h) + '）',
      prevLabel: (h.isCurrent ? '前月' : h.prevMonth + '月') + '（' + prevPeriod(h) + '）',
      cur: fmtYen(h.total),
      prev: fmtYen(h.prev.total),
      dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
      word: word,
      amount: amount,
      rate: rate
    }
  }
  function custLines (h) {
    var p = h.prev
    var o = {
      curHead: h.isCurrent ? '今月' : h.month + '月',
      prevHead: (h.isCurrent ? '前月' : h.prevMonth + '月') + 'の同じ日まで',
      cust: fmtNum(h.customers) + '人',
      unit: h.unit === null ? '—' : fmtYen(h.unit),
      prevCust: p ? fmtNum(p.customers) + '人' : '—',
      prevUnit: p && p.unit !== null ? fmtYen(p.unit) : '—',
      diff: null
    }
    if (p && p.customers > 0 && h.customers > 0) {
      o.diff = '客数 ' + fmtSignedYen(h.customers - p.customers) + '人・客単価 ' + fmtSignedYen(h.unit - p.unit) + '円'
    }
    return o
  }
  function legendGoal (h) {
    if (h.dailyGoal === null) return null
    return '点線：目標の1日あたり ' + fmtYen(h.dailyGoal) + '（' + fmtYen(h.target) + ' ÷ ' + h.month + '月の営業日 ' + h.bizMonth + '日）'
  }
  function chartLabel (h) {
    var s = h.month + '月の日ごとの売上の棒グラフ。' + h.bars + '日分。'
    if (h.maxDay) s += '一番多い日は' + fmtJMD(h.maxDay.date) + fmtYen(h.maxDay.sales) + '。'
    if (h.dailyGoal !== null) s += '目標の1日あたり' + fmtYen(h.dailyGoal) + '以上の日は' + h.goalDays + '日。'
    if (h.errDays > 0) s += '数えていない日が' + h.errDays + '日あります。'
    return s
  }
  function daysSummary (h) { return '日ごとの数字を表で見る（' + h.upto + '日分）' }
  // 日ごとの表の行：[日付, 売上, 客数, 目標との差]（目標なしは3つ）
  function dayRows (h) {
    var out = []
    h.days.forEach(function (x) {
      if (x.state === 'future') return
      var r = { date: fmtMD(x.date), today: x.today, cells: [] }
      if (x.state === 'sales') r.cells = [fmtNum(x.sales), x.customers === null ? '—' : fmtNum(x.customers), x.diffGoal === null ? '—' : fmtSignedYen(x.diffGoal)]
      else if (x.state === 'error') r.cells = ['要確認', '—', '—']
      else r.cells = ['休み', '—', '—']
      if (h.dailyGoal === null) r.cells.pop()
      r.state = x.state
      out.push(r)
    })
    return out
  }
  function totalRow (h) {
    var a = [fmtNum(h.total), fmtNum(h.customers)]
    if (h.dailyGoal !== null) a.push('—')
    return a
  }
  function errorText (e) {
    var input = '（入力：' + cut40(e.input) + '）'
    if (e.sheet === 'target') {
      var p = '「目標」シート ' + e.row + '行目'
      if (e.kind === 'noym') return p + '：年月が入っていません'
      if (e.kind === 'ym') return p + '：年月が正しくありません' + input
      if (e.kind === 'dup') return p + '（' + e.ym + '）：同じ年月の行が ' + e.first + '行目 にもあります'
      if (e.kind === 'zero') return p + '（' + e.ym + '）：目標売上が0円です'
      if (e.kind === 'neg') return p + '（' + e.ym + '）：目標売上がマイナスです' + input
      return p + '（' + e.ym + '）：目標売上が数字ではありません' + input
    }
    var q = e.row + '行目'
    if (e.kind === 'nodate') return q + '：日付が入っていません'
    if (e.kind === 'date') return q + '：日付が正しくありません' + input
    q += '（' + e.date + '）'
    if (e.kind === 'dup') return q + '：同じ日付の行が ' + e.first + '行目 にもあります'
    var what = e.field === 'sales' ? '売上' : '客数'
    if (e.kind === 'neg') return q + '：' + what + 'がマイナスです' + input
    return q + '：' + what + 'が数字ではありません' + input
  }
  function rowList (list) {
    var rows = list.map(function (e) { return e.row + '行目' })
    if (rows.length <= 5) return rows.join('・')
    return rows.slice(0, 5).join('・') + ' …ほか' + (rows.length - 5) + '行'
  }
  // 誤りの箱：題・要約（シートごと）・一覧
  function errorBox (h) {
    if (!h.errors.length) return null
    var s = h.errors.filter(function (e) { return e.sheet === 'sales' })
    var t = h.errors.filter(function (e) { return e.sheet === 'target' })
    var sum = []
    if (s.length) sum.push('「売上」シートの ' + rowList(s) + ' を確かめてください。')
    if (t.length) sum.push('「目標」シートの ' + rowList(t) + ' を確かめてください。')
    return {
      title: '確かめてほしい行が ' + h.errors.length + '行 あります',
      summary: sum,
      items: h.errors.map(errorText),
      end: 'この行は数えていません。シートを直して［読み直す］を押すと、数え直します。'
    }
  }
  function liveText (h) {
    if (!h.hasData) return h.month + '月の入力はありません'
    return h.month + '月の売上 ' + fmtYen(h.total) + '｜' + (h.rate === null ? '目標なし' : '達成率 ' + fmtRate(h.rate))
  }
  // 読み上げの文（40字以内）。kind：input・month・errex・reload・reset
  function srText (h, kind) {
    if (kind === 'errex') return '誤りの例を' + h.errors.length + '行入れました。いちばん下に一覧があります。'
    if (kind === 'reset') return '最初の状態に戻しました。'
    if (kind === 'reload') return '読み直しました（' + h.readAt.replace(/（.）/, ' ') + '）。'
    if (kind === 'month') {
      return h.month + '月を表示しました。' + (h.hasData ? '売上 ' + fmtYen(h.total) + '。' : '入力はありません。')
    }
    if (!h.hasData) return (h.errors.length ? '数えていない行が' + h.errors.length + '行あります。' : '') + h.month + '月の入力はありません。'
    var base = h.month + '月の売上 ' + fmtYen(h.total)
    if (h.errors.length) return '数えていない行が' + h.errors.length + '行あります。' + base + '。'
    if (h.rate === null) return base + '。目標は未入力です。'
    return base + '、達成率 ' + fmtRate(h.rate) + '。'
  }

  // ---------- 棒グラフの座標（1単位＝1px） ----------
  function chartGeom (h, W) {
    var H = 200
    var L = 36
    var T = 12
    var PW = W - 44
    var PH = H - 36
    var D = h.daysInMonth
    var base = T + PH
    var max = h.maxDay ? h.maxDay.sales : 0
    if (h.dailyGoal !== null && h.dailyGoal > max) max = h.dailyGoal
    var yMax = Math.ceil(max / 20000) * 20000
    if (yMax === 0) yMax = 20000
    function x (d) { return L + Math.round((d - 1) * PW / D) }
    function y (v) { return T + Math.round((yMax - v) * PH / yMax) }
    function man (v) { return v === 0 ? '0' : (v / 10000) + '万' }
    var g = { W: W, H: H, base: base, yMax: yMax, ticks: [], bars: [], marks: [], goal: null, xlabels: [] }
    ;[0, yMax / 2, yMax].forEach(function (v) { g.ticks.push({ y: y(v), label: man(v), isBase: v === 0 }) })
    h.days.forEach(function (day) {
      var x0 = x(day.d)
      var span = x(day.d + 1) - x0
      var cx = (x0 + x(day.d + 1)) / 2
      if (day.state === 'sales') {
        var bx = x0 + Math.round(span * 0.2)
        var bw = Math.max(2, Math.round(span * 0.6))
        var top = day.sales === 0 ? base - 2 : y(day.sales)
        if (base - top < 2) top = base - 2
        g.bars.push({ d: day.d, x: bx, y: top, w: bw, h: base - top })
      } else if (day.state === 'error') g.marks.push({ d: day.d, x: cx, y: base - 4 })
    })
    if (h.dailyGoal !== null) g.goal = { y: y(h.dailyGoal), x1: L, x2: W - 8 }
    ;[1, 8, 15, 22, 29].forEach(function (d) {
      if (d <= D) g.xlabels.push({ d: d, x: (x(d) + x(d + 1)) / 2, y: H - 6, label: String(d) })
    })
    return g
  }

  var api = {
    WD: WD,
    weekday: weekday,
    daysInMonth: daysInMonth,
    addMonth: addMonth,
    readAmount: readAmount,
    readDate: readDate,
    readYm: readYm,
    fmtNum: fmtNum,
    fmtYen: fmtYen,
    fmtSignedYen: fmtSignedYen,
    fmtRate: fmtRate,
    fmtSignedRate: fmtSignedRate,
    fmtMD: fmtMD,
    fmtJMD: fmtJMD,
    fmtYm: fmtYm,
    rnd1: rnd1,
    getDashboard: getDashboard,
    sumTitle: sumTitle,
    emptyText: emptyText,
    noTargetText: noTargetText,
    remainLine: remainLine,
    bizText: bizText,
    forecastLines: forecastLines,
    errorLineText: errorLineText,
    prevLines: prevLines,
    custLines: custLines,
    legendGoal: legendGoal,
    chartLabel: chartLabel,
    daysSummary: daysSummary,
    dayRows: dayRows,
    totalRow: totalRow,
    errorText: errorText,
    errorBox: errorBox,
    liveText: liveText,
    srText: srText,
    chartGeom: chartGeom
  }
  return Object.freeze(api)
})()
if (typeof module !== 'undefined' && module.exports) module.exports = Calc38
// ==== 集計 ここまで ====
