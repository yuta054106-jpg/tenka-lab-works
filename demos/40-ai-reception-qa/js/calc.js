// AI 受付の答える範囲とテストの記録（ヨツツジ食堂・架空）の集計
// 件数・率・絞り込み・見込みの文・読み上げの文・CSV の文字を返す純粋な関数だけ（時計・乱数を使わない）
var Calc40 = (function (D) {
  'use strict'
  var RESULT_NAME = { pass: '合格', fixed: '修正後合格', todo: '要修正' }
  var EXPECT_NAME = { answer: '答える', handoff: '人へ回す' }
  var DEC_KEYS = ['qa', 'handoff', 'skip', 'none']
  var DEC_NAME = { none: '未判断', qa: 'Q&A に足す', handoff: '人へ回すに足す', skip: '今は足さない' }
  var DEC_ORDER = ['none', 'qa', 'handoff', 'skip']

  function catOf (id) {
    for (var i = 0; i < D.CATS.length; i++) if (D.CATS[i].id === id) return D.CATS[i]
    return null
  }

  // ---------- 文字で探す ----------
  // 前後の空白を除く → 全角の英数と記号を半角に・全角の空白を半角に → 英字は小文字（ひらがなとカタカナは同じにしない）
  function normalize (s) {
    var out = ''
    var t = String(s)
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i)
      if (c >= 0xFF01 && c <= 0xFF5E) out += String.fromCharCode(c - 0xFEE0)
      else if (c === 0x3000) out += ' '
      else out += t.charAt(i)
    }
    return out.trim().toLowerCase()
  }
  function terms (text) {
    var n = normalize(text)
    return n ? n.split(/\s+/) : []
  }
  function qaQuestions (q) { return q.qs.join('／') }
  // 探す対象は「質問の例＋答えの文」だけ（番号・分類名・最終確認日は入れない）
  function qaHay (q) { return normalize(qaQuestions(q) + '\n' + q.a) }
  function filterQa (cat, text) {
    var ws = terms(text || '')
    return D.QA.filter(function (q) {
      if (cat && cat !== 'all' && q.cat !== cat) return false
      var h = qaHay(q)
      return ws.every(function (w) { return h.indexOf(w) >= 0 })
    })
  }

  // ---------- テスト ----------
  function filterTests (result, expect) {
    return D.TESTS.filter(function (t) {
      return (!result || result === 'all' || t.result === result) && (!expect || expect === 'all' || t.expect === expect)
    })
  }
  function countBy (list, key) {
    var o = {}
    list.forEach(function (x) { o[x[key]] = (o[x[key]] || 0) + 1 })
    return o
  }
  // 0.1% 単位の四捨五入（整数だけで計算する）
  function rate10 (n, d) { return d ? Math.floor((n * 2000 + d) / (d * 2)) : 0 }
  function fmt10 (r) { return Math.floor(r / 10) + '.' + (r % 10) }
  function testSummary () {
    var T = D.TESTS
    var r = countBy(T, 'result')
    var e = countBy(T, 'expect')
    var todo = T.filter(function (t) { return t.result === 'todo' })
    var wrong = T.filter(function (t) { return t.answeredWrongly })
    var s = {
      total: T.length,
      pass: r.pass || 0, fixed: r.fixed || 0, todo: r.todo || 0,
      answer: e.answer || 0, handoff: e.handoff || 0,
      todoAnswer: todo.filter(function (t) { return t.expect === 'answer' }).length,
      todoHandoff: todo.filter(function (t) { return t.expect === 'handoff' }).length,
      wrongFirst: wrong.length,
      // 再テスト後の残り：1回目に人へ回す質問へ Q&A の答えを返し（answeredWrongly）、まだ直していない（result が todo）もの。0件でも数として出す
      wrongNow: wrong.filter(function (t) { return t.result === 'todo' }).length
    }
    s.okAll = s.pass + s.fixed
    s.rateAll10 = rate10(s.okAll, s.total)
    s.rateFirst10 = rate10(s.pass, s.total)
    return s
  }
  function expectLabel (t) { return EXPECT_NAME[t.expect] + '（' + t.target + '）' }

  // ---------- 人へ回す ----------
  function handoffSummary () {
    var all = 0
    var added = 0
    D.HANDOFF.forEach(function (h) {
      all += h.words.length
      h.words.forEach(function (w) { if (w.added) added++ })
    })
    return { groups: D.HANDOFF.length, words: all, added: added }
  }
  // 言い回しに入っている合図の言葉（データの食い違いの見張り）
  function signalsIn (text) {
    var hit = []
    D.HANDOFF.forEach(function (h) {
      h.words.forEach(function (w) { if (text.indexOf(w.w) >= 0) hit.push(h.no + ':' + w.w) })
    })
    return hit
  }

  // ---------- 見直し ----------
  function seedDecisions () {
    var o = {}
    D.REVIEW.forEach(function (r) { o[r.no] = r.decision })
    return o
  }
  function reviewCounts (dec) {
    var o = {}
    DEC_KEYS.forEach(function (k) { o[k] = { n: 0, times: 0 } })
    D.REVIEW.forEach(function (r) {
      var k = dec[r.no]
      o[k].n++
      o[k].times += r.times
    })
    return o
  }
  var TAIL = '（このページの中だけの見込みです）。'
  function forecastText (c) {
    var qa = c.qa.n
    var h = c.handoff.n
    var base = D.QA.length
    if (!qa && !h) return '見直しの後も、Q&A と人へ回す合図は変わりません' + TAIL
    var a = qa ? '見直しの後の Q&A は ' + (base + qa) + '問' : '見直しの後の Q&A は ' + base + '問のままです。'
    if (!h) return a + 'です。人へ回す合図は増えません' + TAIL
    return a + (qa ? '、' : '') + '人へ回す合図は ' + h + 'つ増えます' + TAIL
  }
  function totalTimes () {
    var n = 0
    D.REVIEW.forEach(function (r) { n += r.times })
    return n
  }

  // ---------- 読み上げの文（40字以内） ----------
  function cut10 (s) {
    var t = String(s).trim()
    return t.length > 10 ? t.slice(0, 10) + '…' : t
  }
  function catLabel (cat) { return cat === 'all' ? 'すべての分類' : catOf(cat).short }
  function sayQaCat (cat, n) { return catLabel(cat) + 'で' + n + '件です。' }
  function sayQaText (cat, text, n) {
    if (!String(text).trim()) return sayQaCat(cat, n)
    if (!n) return '当たる質問はありません。'
    return '「' + cut10(text) + '」で' + n + '件です。'
  }
  function sayTests (result, expect, n) {
    var parts = []
    if (result !== 'all') parts.push(RESULT_NAME[result])
    if (expect !== 'all') parts.push(EXPECT_NAME[expect])
    if (!parts.length) return n + '件すべてです。'
    return parts.join('・') + 'で' + n + '件です。'
  }
  function sayReview (c) { return 'Q&A に足す' + c.qa.n + '件、未判断' + c.none.n + '件です。' }

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
  function qaCsv () {
    var rows = [['番号', '分類', '質問の例', '答えの文', '最終確認日', '直したテスト']]
    D.QA.forEach(function (q) { rows.push([q.no, catOf(q.cat).name, qaQuestions(q), q.a, q.checked, q.fixedBy]) })
    return csvText(rows)
  }
  function testCsv () {
    var rows = [['番号', '質問の言い回し', '期待する動き', '期待の先', '結果', '直したこと']]
    D.TESTS.forEach(function (t) { rows.push([t.no, t.q, EXPECT_NAME[t.expect], t.target, RESULT_NAME[t.result], t.result === 'pass' ? '' : t.fix]) })
    return csvText(rows)
  }

  var api = {
    D: D, RESULT_NAME: RESULT_NAME, EXPECT_NAME: EXPECT_NAME, DEC_KEYS: DEC_KEYS, DEC_NAME: DEC_NAME, DEC_ORDER: DEC_ORDER,
    catOf: catOf, normalize: normalize, terms: terms, qaQuestions: qaQuestions, filterQa: filterQa,
    filterTests: filterTests, countBy: countBy, rate10: rate10, fmt10: fmt10, testSummary: testSummary, expectLabel: expectLabel,
    handoffSummary: handoffSummary, signalsIn: signalsIn,
    seedDecisions: seedDecisions, reviewCounts: reviewCounts, forecastText: forecastText, totalTimes: totalTimes,
    cut10: cut10, catLabel: catLabel, sayQaCat: sayQaCat, sayQaText: sayQaText, sayTests: sayTests, sayReview: sayReview,
    csvCell: csvCell, qaCsv: qaCsv, testCsv: testCsv
  }
  return Object.freeze(api)
})(typeof Data40 !== 'undefined' ? Data40 : require('./data.js'))
if (typeof module !== 'undefined' && module.exports) module.exports = Calc40
