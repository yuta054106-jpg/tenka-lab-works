// NPO の公式サイトの見本（コダマリ学びネット・架空）の計算。画面に触らない純粋な関数だけ
// 記事の並べ替え・絞り込み・もっと見る・年月の見出し、活動計算書の計・増減・繰越・横棒の %、画面の名前
var Calc43 = (function (D) {
  'use strict'
  var PER = 6 // もっと見るで増やす数・はじめに出す数
  var PAGE_IDS = D.PAGES.map(function (p) { return p.id })
  var BIZ_BY_ID = {}
  D.BIZ.forEach(function (b) { BIZ_BY_ID[b.id] = b })
  var KIND_BY_ID = {}
  D.KINDS.forEach(function (k) { KIND_BY_ID[k.id] = k })

  // ---------- 記事 ----------
  // 新しい順。同じ日付は id の小さい順（日付は 'YYYY-MM-DD' の文字列で比べる）
  function sortPosts (posts) {
    return posts.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)
    })
  }
  var SORTED = sortPosts(D.POSTS)

  // 事業（all・kodama・hidamari・houjin）と種類（all・news・report・recruit）で絞り込む
  function filterPosts (biz, kind) {
    return SORTED.filter(function (p) {
      return (biz === 'all' || p.biz === biz) && (kind === 'all' || p.kind === kind)
    })
  }
  function countByBiz (biz) { return filterPosts(biz, 'all').length }

  // 表示数：はじめは min(6, n)、もっと見るで min(m+6, n)
  function firstShown (n) { return Math.min(PER, n) }
  function moreShown (m, n) { return Math.min(m + PER, n) }
  function countText (n, m) { return n + '件中 ' + m + '件を表示' }
  function moreText (n, m) { return 'もっと見る（残り' + (n - m) + '件）' }

  // 日付 '2026-11-21' → '2026年11月21日'、月の見出し '2026年11月'（先頭の0を付けない）
  function fmtDate (d) {
    var a = d.split('-')
    return Number(a[0]) + '年' + Number(a[1]) + '月' + Number(a[2]) + '日'
  }
  function monthLabel (d) {
    var a = d.split('-')
    return Number(a[0]) + '年' + Number(a[1]) + '月'
  }
  function isNew (p) { return p.date >= D.NEW_FROM && p.date <= D.DEMO_TODAY }

  // 表示中の一覧の、直前の記事と年月が違う記事の前にだけ見出しを置く（[見出し or null, 記事] の並び）
  function withMonths (list) {
    var out = []
    var last = ''
    list.forEach(function (p) {
      var m = monthLabel(p.date)
      out.push({ month: m !== last ? m : null, post: p })
      last = m
    })
    return out
  }

  // 読み上げの文
  function bizSay (biz) { return biz === 'all' ? 'すべての事業' : BIZ_BY_ID[biz].say }
  function kindSay (kind) { return kind === 'all' ? 'すべての種類' : KIND_BY_ID[kind].say }
  function sayFilter (biz, kind) { return bizSay(biz) + '、' + kindSay(kind) + '：' + filterPosts(biz, kind).length + '件です。' }
  function sayMore (m, n) { return m + '件目まで表示しました。全部で' + n + '件です。' }

  // ---------- 金額 ----------
  // 3けた区切り。マイナスは U+2212 を前に付ける（端末の地域設定に頼らず自前で区切る）
  function fmtNum (n) {
    var s = String(Math.abs(n))
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3) }
    return (n < 0 ? '−' : '') + s + out
  }
  function fmtYen (n) { return fmtNum(n) + '円' }

  // ---------- 活動計算書 ----------
  function sumOf (obj, items) { return items.reduce(function (a, it) { return a + obj[it.k] }, 0) }
  function account (fy) {
    var a = D.ACCOUNTS.filter(function (x) { return x.fy === fy })[0]
    if (!a) return null
    var inc = sumOf(a.income, D.INCOME_ITEMS)
    var exp = sumOf(a.expense, D.EXPENSE_ITEMS)
    // 当期経常増減額＝経常収益計−経常費用計。経常外の収益・費用と法人税等がない設定のため、当期正味財産増減額も同じ額
    return { fy: a.fy, period: a.period, income: a.income, expense: a.expense, incomeTotal: inc, expenseTotal: exp, ordinaryDiff: inc - exp, diff: inc - exp, begin: a.begin, end: a.begin + inc - exp }
  }
  var FYS = D.ACCOUNTS.map(function (a) { return a.fy })
  // 横棒の基準：3年度すべての経常収益計・経常費用計の中で一番大きい額（年度を変えても変えない）
  var BAR_BASE = FYS.reduce(function (mx, fy) { var a = account(fy); return Math.max(mx, a.incomeTotal, a.expenseTotal) }, 0)
  // 棒の幅（%・小数第1位の文字列）
  function barPct (n) { return (Math.round(n * 1000 / BAR_BASE) / 10).toFixed(1) }
  function summary (fy) {
    var a = account(fy)
    if (a.diff >= 0) return fy + '年度は、収益が費用を ' + fmtYen(a.diff) + ' 上回りました。'
    return fy + '年度は、経常費用が経常収益を ' + fmtYen(-a.diff) + ' 上回りました。次期繰越正味財産額は ' + fmtYen(a.end) + ' です。'
  }
  function sayFy (fy) { return fy + '年度の活動計算書を表示しました。' }

  // ---------- 画面の切り替え ----------
  // ハッシュから画面を決める。go：出す画面、replace：URL を #top に置き換えるか
  function routeOf (hash) {
    var name = String(hash || '').replace(/^#/, '')
    if (name === '') return { go: 'top', replace: false }
    if (PAGE_IDS.indexOf(name) >= 0) return { go: name, replace: false }
    return { go: 'top', replace: true }
  }
  function titleOf (id) {
    if (id === 'top') return 'コダマリ学びネット（デモ・架空の団体）'
    var p = D.PAGES.filter(function (x) { return x.id === id })[0]
    return p.name + '｜コダマリ学びネット（デモ）'
  }

  var DEMO_MSG = '（デモ）実際の受付はありません。このページは架空の団体の見本です。'
  // 募集の記事（と noReceipt の記事）の本文の先頭に出す文
  var NO_RECEIPT = 'デモのため、実際の募集・受付はありません。'
  function hasNoReceipt (p) { return p.kind === 'recruit' || p.noReceipt === true }

  return Object.freeze({
    D: D, PER: PER, PAGE_IDS: PAGE_IDS, BIZ_BY_ID: BIZ_BY_ID, KIND_BY_ID: KIND_BY_ID, SORTED: SORTED,
    sortPosts: sortPosts, filterPosts: filterPosts, countByBiz: countByBiz, firstShown: firstShown, moreShown: moreShown,
    countText: countText, moreText: moreText, fmtDate: fmtDate, monthLabel: monthLabel, isNew: isNew, withMonths: withMonths,
    sayFilter: sayFilter, sayMore: sayMore, fmtNum: fmtNum, fmtYen: fmtYen, account: account, FYS: FYS, BAR_BASE: BAR_BASE,
    barPct: barPct, summary: summary, sayFy: sayFy, routeOf: routeOf, titleOf: titleOf, DEMO_MSG: DEMO_MSG, NO_RECEIPT: NO_RECEIPT, hasNoReceipt: hasNoReceipt
  })
})(typeof Data43 !== 'undefined' ? Data43 : require('./data.js'))
if (typeof module !== 'undefined' && module.exports) module.exports = Calc43
