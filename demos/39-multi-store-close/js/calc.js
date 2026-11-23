// 多店舗の月次締めボード（ヨモスガラ食堂・架空）の集計
// 状態と基準を受け取り、画面に出す数と文を返す純粋な関数だけ。日付は 'YYYY-MM-DD' の文字で扱う（時計を読まない）
var Calc39 = (function () {
  'use strict'
  var WD = ['日', '月', '火', '水', '木', '金', '土']
  var ZEN = '０１２３４５６７８９'
  var TODAY = '2026-11-06'
  var CLOSE_DUE = '2026-11-10'
  var MONTH_LABEL = '10月'

  var STORES = ['札幌駅前店', '大通店', 'すすきの店', '円山店', '新琴似店']
  // 締めの項目（6つ固定・全店共通）
  var ITEMS = [
    { name: '売上の取込（日計と一致）', short: '売上の取込', role: '店長', due: '2026-11-06' },
    { name: '現金の過不足の理由', short: '現金の過不足', role: '店長', due: '2026-11-06' },
    { name: '仕入の請求書がそろう', short: '仕入の請求書', role: '料理長', due: '2026-11-09' },
    { name: '月末の棚卸', short: '月末の棚卸', role: '料理長', due: '2026-11-07' },
    { name: '経費の領収書', short: '経費の領収書', role: '副店長', due: '2026-11-10' },
    { name: '勤怠の確定', short: '勤怠の確定', role: '店長', due: '2026-11-08' }
  ]
  // 状態（キー → 正式名・短い名）
  var STATES = ['todo', 'doing', 'wait', 'done', 'back']
  var ST_NAME = { todo: '未着手', doing: '作業中', wait: '本部の確認待ち', done: '完了', back: '差し戻し' }
  var ST_SHORT = { todo: '未着手', doing: '作業中', wait: '確認待ち', done: '完了', back: '差し戻し' }

  // 見本の状態（[状態, 止まり始めた日]）
  var SEED = [
    [['done', '2026-11-02'], ['done', '2026-11-03'], ['wait', '2026-11-05'], ['done', '2026-11-02'], ['doing', '2026-11-04'], ['wait', '2026-11-06']],
    [['done', '2026-11-03'], ['back', '2026-11-04'], ['doing', '2026-11-02'], ['wait', '2026-11-03'], ['todo', '2026-11-01'], ['doing', '2026-11-05']],
    [['wait', '2026-11-04'], ['todo', '2026-11-01'], ['todo', '2026-11-01'], ['doing', '2026-11-03'], ['todo', '2026-11-01'], ['todo', '2026-11-01']],
    [['done', '2026-11-02'], ['done', '2026-11-02'], ['done', '2026-11-05'], ['done', '2026-11-01'], ['wait', '2026-11-05'], ['done', '2026-11-04']],
    [['back', '2026-11-05'], ['done', '2026-11-03'], ['todo', '2026-11-01'], ['todo', '2026-11-01'], ['doing', '2026-11-02'], ['wait', '2026-11-04']]
  ]
  var SEED_REASON = [
    [1, 1, '10月18日の不足 3,200円の理由が空欄です。点検の記録を見て、理由を入れてください。'],
    [4, 0, '10月25日の取込が日計と 12,400円 合いません。取込をやり直してください。']
  ]
  // 月の数字（円・税抜）：売上・前年同月・期首の棚卸・仕入・期末の棚卸・人件費・客数
  var NUMS = [
    [9860000, 9120000, 612000, 3105000, 648000, 2780000, 6820],
    [7240000, 7050000, 498000, 2742000, 604000, 2105000, 5310],
    [8150000, 9920000, 540000, 2610000, 566000, 2690000, 5980],
    [5600000, 5180000, 380000, 1690000, 418000, 1680000, 3920],
    [4380000, 3950000, 296000, 1402000, 318000, 1236000, 3210]
  ]
  // 本部の基準（0.1 単位の整数）
  var STD0 = { costT: 320, costW: 30, labor: 300, fl: 600, yoy: 150 }
  var STD_RANGE = { costT: [100, 600], costW: [5, 100], labor: [100, 600], fl: [300, 900], yoy: [10, 500] }
  var NUDGE_DAYS = 2

  // ---------- 暦 ----------
  // 坂本の方法（0＝日 … 6＝土）
  function weekday (s) {
    var y = Number(s.slice(0, 4))
    var m = Number(s.slice(5, 7))
    var d = Number(s.slice(8, 10))
    var t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
    if (m < 3) y -= 1
    return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7
  }
  // 1970-01-01 からの日数（暦の計算だけで出す）
  function dayNo (s) {
    var y = Number(s.slice(0, 4))
    var m = Number(s.slice(5, 7))
    var d = Number(s.slice(8, 10))
    if (m <= 2) y -= 1
    var era = Math.floor(y / 400)
    var yoe = y - era * 400
    var mp = (m + 9) % 12
    var doy = Math.floor((153 * mp + 2) / 5) + d - 1
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
    return era * 146097 + doe - 719468
  }
  // b − a の日数
  function days (a, b) { return dayNo(b) - dayNo(a) }
  function fmtMD (s) { return Number(s.slice(5, 7)) + '/' + Number(s.slice(8, 10)) }
  function fmtMDW (s) { return fmtMD(s) + '（' + WD[weekday(s)] + '）' }
  function fmtJMD (s) { return Number(s.slice(5, 7)) + '月' + Number(s.slice(8, 10)) + '日（' + WD[weekday(s)] + '）' }

  // ---------- 数の書き方 ----------
  function fmtNum (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3) }
    return s + out
  }
  function fmtYen (n) { return fmtNum(n) + '円' }
  // 分子×1000÷分母 を四捨五入した整数（0.1% 単位）
  function r10 (num, den) { return Math.floor((num * 2000 + den) / (den * 2)) }
  // 円未満を四捨五入した割り算
  function divR (num, den) { return Math.floor((num * 2 + den) / (den * 2)) }
  // 0.1 単位の整数 → '30.0'
  function t1 (r) { return Math.floor(r / 10) + '.' + (r % 10) }
  // 基準の値の書き方（整数なら '3'・小数なら '0.5'）
  function tv (r) { return r % 10 === 0 ? String(r / 10) : t1(r) }

  // ---------- 状態 ----------
  function seed () {
    var items = SEED.map(function (row) { return row.map(function (c) { return { st: c[0], since: c[1], reason: '' } }) })
    SEED_REASON.forEach(function (r) { items[r[0]][r[1]].reason = r[2] })
    return { items: items, std: copyStd(STD0) }
  }
  function copyStd (s) { return { costT: s.costT, costW: s.costW, labor: s.labor, fl: s.fl, yoy: s.yoy } }
  // 状態を変えた新しい項目（止まり始めた日を今日に。差し戻しから外したら理由を消す）
  function setState (state, si, ii, st, today) {
    var it = state.items[si][ii]
    if (it.st === st) return false
    it.st = st
    it.since = today || TODAY
    it.reason = ''
    return true
  }
  function stalledText (it, today) {
    if (it.st === 'done') return fmtMD(it.since)
    var n = days(it.since, today || TODAY)
    return n <= 0 ? '今日から' : n + '日'
  }
  function dueText (due, today) {
    var n = days(today || TODAY, due)
    if (n === 0) return '今日'
    return n > 0 ? 'あと' + n + '日' : (-n) + '日過ぎ'
  }

  // ---------- 催促 ----------
  function nudges (state, today) {
    today = today || TODAY
    var list = []
    state.items.forEach(function (row, si) {
      row.forEach(function (it, ii) {
        var left = days(today, ITEMS[ii].due)
        var isBack = it.st === 'back'
        if (isBack || (it.st === 'todo' && left <= NUDGE_DAYS)) {
          list.push({ store: si, item: ii, st: it.st, left: left, stalled: days(it.since, today), back: isBack })
        }
      })
    })
    list.sort(function (a, b) {
      if (a.back !== b.back) return a.back ? -1 : 1
      if (a.left !== b.left) return a.left - b.left
      if (a.stalled !== b.stalled) return b.stalled - a.stalled
      if (a.store !== b.store) return a.store - b.store
      return a.item - b.item
    })
    return list
  }
  function nudgeText (state, si, today) {
    var list = nudges(state, today).filter(function (n) { return n.store === si })
    var lines = ['【架空デモの文面例】', STORES[si] + ' 店長さま', '', '本部 経理です。' + MONTH_LABEL + 'の締めで、次の' + list.length + '件が残っています。', '']
    list.forEach(function (n) {
      var it = ITEMS[n.item]
      lines.push('・' + it.name + '：' + ST_NAME[n.st] + '（担当 ' + it.role + '・期日 ' + fmtJMD(it.due) + '）')
      var r = state.items[si][n.item].reason.trim()
      if (n.back && r) lines.push('　差し戻しの理由：' + r)
    })
    lines.push('', '終わったら、締めボードの状態を「本部の確認待ち」にしてください。', '各項目の期日までに対応をお願いします。難しい場合は対応予定をお知らせください。')
    return { text: lines.join('\n'), count: list.length, missing: list.filter(function (n) { return n.back && !state.items[si][n.item].reason.trim() }).map(function (n) { return ITEMS[n.item].name }) }
  }

  // ---------- 月の数字 ----------
  function metricsOf (v) {
    var cost = v[2] + v[3] - v[4]
    return { sales: v[0], prev: v[1], open: v[2], buy: v[3], close: v[4], cost: cost, labor: v[5], cust: v[6],
      costR: r10(cost, v[0]), laborR: r10(v[5], v[0]), flR: r10(cost + v[5], v[0]), yoyR: r10(v[0], v[1]), unit: divR(v[0], v[6]) }
  }
  // 基準の判定（0.1% に丸めた後の値で。境目ちょうどは内側）
  function flagsOf (m, std) {
    var f = { cost: null, labor: null, fl: null, yoy: null }
    if (m.costR < std.costT - std.costW) f.cost = 'low'
    else if (m.costR > std.costT + std.costW) f.cost = 'high'
    if (m.laborR > std.labor) f.labor = 'high'
    if (m.flR > std.fl) f.fl = 'high'
    if (m.yoyR < 1000 - std.yoy) f.yoy = 'low'
    else if (m.yoyR > 1000 + std.yoy) f.yoy = 'high'
    return f
  }
  // 仮の判定（元になる項目が完了していない数字）。率は分母の売上も元になる
  // 原価の額は仕入の請求書と棚卸、人件費の額は勤怠、売上を使う率・前年比・客単価は売上の取込も見る
  function provOf (row) {
    var nd = function (i) { return row[i].st !== 'done' }
    var s = nd(0)
    var ca = nd(2) || nd(3)
    var la = nd(5)
    return { sales: s, yoy: s, costAmt: ca, cost: s || ca, laborAmt: la, labor: s || la, fl: s || ca || la, unit: s }
  }
  var FLAG_KEYS = ['cost', 'labor', 'fl', 'yoy']
  var FLAG_NAME = { cost: '原価率', labor: '人件費率', fl: 'FL比率', yoy: '前年比' }
  var PROV_KEYS = ['sales', 'yoy', 'costAmt', 'cost', 'laborAmt', 'labor', 'fl', 'unit']
  var PROV_NAME = { sales: '売上', yoy: '前年比', costAmt: '原価', cost: '原価率', laborAmt: '人件費', labor: '人件費率', fl: 'FL比率', unit: '客単価' }
  function flagCount (f) { return FLAG_KEYS.filter(function (k) { return f[k] }).length }

  // 全部の集計
  function compute (state, opt) {
    var today = (opt && opt.today) || TODAY
    var cnt = { todo: 0, doing: 0, wait: 0, done: 0, back: 0 }
    var stores = state.items.map(function (row, si) {
      var c = { todo: 0, doing: 0, wait: 0, done: 0, back: 0 }
      row.forEach(function (it) { c[it.st]++; cnt[it.st]++ })
      var m = metricsOf(NUMS[si])
      m.flags = flagsOf(m, state.std)
      m.prov = provOf(row)
      return { name: STORES[si], counts: c, done: c.done, metrics: m }
    })
    var sum = [0, 0, 0, 0, 0, 0, 0]
    NUMS.forEach(function (v) { for (var k = 0; k < 7; k++) sum[k] += v[k] })
    var total = metricsOf(sum)
    total.flags = flagsOf(total, state.std)
    total.prov = {}
    PROV_KEYS.forEach(function (k) { total.prov[k] = false })
    stores.forEach(function (s) { PROV_KEYS.forEach(function (k) { if (s.metrics.prov[k]) total.prov[k] = true }) })
    var nl = nudges(state, today)
    var markStores = 0
    var marks = 0
    stores.forEach(function (s) { var n = flagCount(s.metrics.flags); if (n) markStores++; marks += n })
    // 店の率を単純に平均した値（0.1% に丸めた値の平均を同じ丸めで）
    var avgCost = Math.floor((stores.reduce(function (a, s) { return a + s.metrics.costR }, 0) * 2 + 5) / 10)
    return {
      today: today, counts: cnt, totalItems: 30, done: cnt.done, rate: r10(cnt.done, 30),
      stores: stores, total: total, nudges: nl,
      nudgeBack: nl.filter(function (n) { return n.back }).length,
      nudgeTodo: nl.filter(function (n) { return !n.back }).length,
      markStores: markStores, marks: marks, totalMarks: flagCount(total.flags), avgCost: avgCost,
      daysLeft: days(today, CLOSE_DUE)
    }
  }
  function flagNames (f) { return FLAG_KEYS.filter(function (k) { return f[k] }).map(function (k) { return FLAG_NAME[k] }).join('・') }
  function provNames (p) { return PROV_KEYS.filter(function (k) { return p[k] }).map(function (k) { return PROV_NAME[k] }).join('・') }

  // ---------- 基準の入力 ----------
  // 文字 → 0.1 単位の整数。誤りなら null
  function readStd (key, v) {
    var s = ''
    var raw = v === null || v === undefined ? '' : String(v)
    for (var i = 0; i < raw.length; i++) {
      var k = ZEN.indexOf(raw.charAt(i))
      s += k >= 0 ? String(k) : (raw.charAt(i) === '．' ? '.' : raw.charAt(i))
    }
    s = s.trim()
    var m = /^(\d{1,3})(?:\.(\d))?$/.exec(s)
    if (!m) return null
    var n = Number(m[1]) * 10 + (m[2] ? Number(m[2]) : 0)
    var r = STD_RANGE[key]
    return n >= r[0] && n <= r[1] ? n : null
  }
  function stdRangeText (key) { var r = STD_RANGE[key]; return tv(r[0]) + '〜' + tv(r[1]) }
  function stdBandText (key, std) {
    if (key === 'cost') return t1(std.costT - std.costW) + '〜' + t1(std.costT + std.costW) + '%'
    if (key === 'yoy') return t1(1000 - std.yoy) + '〜' + t1(1000 + std.yoy) + '%'
    return t1(std[key]) + '% 以下'
  }

  // ---------- CSV ----------
  function csvCell (v) {
    var s = String(v)
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  var CSV_NOTE = '架空デモ：ヨモスガラ食堂は架空のお店で、店名・数字・状態はすべて架空です'
  function csv (state) {
    var c = compute(state)
    var head = ['店'].concat(ITEMS.map(function (it) { return it.name.replace('（日計と一致）', '') }))
      .concat(['完了数', '売上', '前年同月', '前年比(%)', '期首棚卸', '仕入', '期末棚卸', '原価', '原価率(%)', '人件費', '人件費率(%)', 'FL比率(%)', '客数', '客単価', '基準外', '仮の数字'])
    var nums = function (m) {
      return [m.sales, m.prev, t1(m.yoyR), m.open, m.buy, m.close, m.cost, t1(m.costR), m.labor, t1(m.laborR), t1(m.flR), m.cust, m.unit, flagNames(m.flags), provNames(m.prov)]
    }
    // 単体で共有されても架空と分かるように、先頭に1行入れる
    var rows = [[CSV_NOTE], head]
    c.stores.forEach(function (s, si) {
      rows.push([s.name].concat(state.items[si].map(function (it) { return ST_NAME[it.st] })).concat([s.done]).concat(nums(s.metrics)))
    })
    rows.push(['5店の合計', '', '', '', '', '', '', c.done].concat(nums(c.total)))
    return '﻿' + rows.map(function (r) { return r.map(csvCell).join(',') }).join('\r\n') + '\r\n'
  }

  var api = {
    TODAY: TODAY, CLOSE_DUE: CLOSE_DUE, MONTH_LABEL: MONTH_LABEL, STORES: STORES, ITEMS: ITEMS, STATES: STATES,
    ST_NAME: ST_NAME, ST_SHORT: ST_SHORT, STD0: STD0, STD_RANGE: STD_RANGE, FLAG_KEYS: FLAG_KEYS, FLAG_NAME: FLAG_NAME,
    weekday: weekday, days: days, fmtMD: fmtMD, fmtMDW: fmtMDW, fmtJMD: fmtJMD, fmtNum: fmtNum, fmtYen: fmtYen,
    r10: r10, divR: divR, t1: t1, tv: tv, seed: seed, copyStd: copyStd, setState: setState,
    stalledText: stalledText, dueText: dueText, nudges: nudges, nudgeText: nudgeText,
    compute: compute, flagNames: flagNames, provNames: provNames, readStd: readStd,
    stdRangeText: stdRangeText, stdBandText: stdBandText, csvCell: csvCell, csv: csv, CSV_NOTE: CSV_NOTE
  }
  return Object.freeze(api)
})()
if (typeof module !== 'undefined' && module.exports) module.exports = Calc39
