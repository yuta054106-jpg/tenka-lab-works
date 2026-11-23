// 返信の下書きキットの見本（ミツカド舎・架空）の計算。画面に触らない純粋な関数だけ
// 正規化 → 置き換え（R1〜R9 の順）→ 分類 → 頼み方の文の組み立て → 送る前の確認の判定
var Calc42 = (function (D) {
  'use strict'
  var KIND_BY_ID = {}
  D.KINDS.forEach(function (k) { KIND_BY_ID[k.id] = k })

  // 件数の表示の順（名前・電話・メール・郵便番号・住所・注文番号・日付・個数）
  var COUNT_KEYS = [
    { k: 'name', label: '名前' }, { k: 'phone', label: '電話' }, { k: 'email', label: 'メール' }, { k: 'postal', label: '郵便番号' },
    { k: 'address', label: '住所' }, { k: 'order', label: '注文番号' }, { k: 'date', label: '日付' }, { k: 'count', label: '個数' }
  ]

  // 置き換えの規則（この順で行う。名前の残り R9 は別に行う）
  // 名前のかたまりの字から「様」（U+69D8）を除く。除かないと「ミツカド舎様 皆様」が1つの名前になる
  var RULES = [
    { id: 'R1', k: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, to: function () { return '〔メール〕' } },
    { id: 'R2', k: 'order', re: /(?<![A-Za-z0-9])MK-?\d{5}(?!\d)/gi, to: function () { return '〔注文番号〕' } },
    { id: 'R3', k: 'phone', re: /(?<![\d-])0\d(?:-?\d){8,9}(?![\d-])/g, to: function () { return '〔電話〕' } },
    { id: 'R4', k: 'postal', re: /〒[ 　]?\d{3}-?\d{4}(?![\d-])|(?<![\d-])\d{3}-\d{4}(?![\d-])/g, to: function () { return '〔郵便番号〕' } },
    // 住所：一致した中に数字か「丁目」「番地」が無ければ置き換えない
    { id: 'R5', k: 'address', re: /[^\s　、。：:「」〔〕]*[都道府県][^\s　、。]*?[市区町村郡].*$/gm, to: function (m) { return /\d|丁目|番地/.test(m[0]) ? '〔住所〕' : null } },
    { id: 'R6', k: 'date', re: /(?:\d{4}年)?\d{1,2}月\d{1,2}日/g, to: function () { return '○月○日' } },
    { id: 'R7', k: 'count', re: /(?<![\d,])\d[\d,]*[ 　]?(個|箱|缶|本|枚|台|袋|セット)/g, to: function (m) { return '○' + m[1] } },
    { id: 'R8', k: 'name', re: /([一-槗槙-鿿々ァ-ヺー]{1,8})(?:[ 　]([一-槗槙-鿿々ァ-ヺー]{1,8}))?[ 　]?(様|さま)(?![子々式相態])/g, to: null }
  ]
  // 名前として置き換えない語（1つ目＋2つ目のかたまりをつないだもの）
  var NOT_NAMES = ['客', '皆', '担当者', '注文者', '依頼主', '主', '家族', '奥', '子', '先', 'ミツカド舎', '店長', '店主']
  var NAME_TO = 'お客様'

  // ---------- 正規化（置き換え後の文にも残る） ----------
  function normalize (text) {
    var s = String(text === null || text === undefined ? '' : text)
    s = s.replace(/\r\n?/g, '\n')
    // 全角数字・全角英字 → 半角、＠ → @
    s = s.replace(/[０-９Ａ-Ｚａ-ｚ＠]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
    // ．→ .（前後がともに半角英数字の時だけ）
    s = s.replace(/(?<=[A-Za-z0-9])．(?=[A-Za-z0-9])/g, '.')
    // 長音・ハイフンのなかま → -（次の字が数字で、前の字が数字か半角英字の時だけ）
    s = s.replace(/(?<=[A-Za-z0-9])[ー－‐―−](?=\d)/g, '-')
    return s
  }

  // ---------- 置き換え ----------
  // 文を「そのままの所」と「置き換えた所」のかたまりに分けて持ち、そのままの所だけに規則を当てる
  // （置き換えた印〔〕・お客様・○ を、後の規則でもう一度置き換えないため）
  function applyRe (parts, re, k, to) {
    var out = []
    parts.forEach(function (p) {
      if (p.k) { out.push(p); return }
      var s = p.t
      var last = 0
      var m
      re.lastIndex = 0
      while ((m = re.exec(s)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue }
        var rep = to(m)
        if (rep === null) continue
        // { keep, t } の時：一致の頭の keep はそのまま残し、残りだけを t に置き換える
        var keep = ''
        if (typeof rep === 'object') { keep = rep.keep; rep = rep.t }
        if (m.index > last) out.push({ t: s.slice(last, m.index), k: null })
        if (keep) out.push({ t: keep, k: null })
        out.push({ t: rep, k: k })
        last = m.index + m[0].length
      }
      if (last < s.length) out.push({ t: s.slice(last), k: null })
    })
    return out
  }
  function splitLiteral (parts, word, k, rep) {
    var out = []
    parts.forEach(function (p) {
      if (p.k) { out.push(p); return }
      var s = p.t
      var i = s.indexOf(word)
      var last = 0
      while (i >= 0) {
        if (i > last) out.push({ t: s.slice(last, i), k: null })
        out.push({ t: rep, k: k })
        last = i + word.length
        i = s.indexOf(word, last)
      }
      if (last < s.length) out.push({ t: s.slice(last), k: null })
    })
    return out
  }
  function zeroCounts () {
    var c = {}
    COUNT_KEYS.forEach(function (x) { c[x.k] = 0 })
    return c
  }
  // 返す値：text（置き換え後の文）・counts（種類ごとの数）・total・marks（置き換えた所の位置 start〜end と種類）
  function redact (text) {
    var parts = [{ t: normalize(text), k: null }]
    var names = []
    RULES.forEach(function (r) {
      if (r.k !== 'name') { parts = applyRe(parts, r.re, r.k, r.to); return }
      parts = applyRe(parts, r.re, r.k, function (m) {
        var full = m[1] + (m[2] || '')
        if (NOT_NAMES.indexOf(full) >= 0) return null
        // 「店長 杏ノ森様」：前のかたまりが置き換えない語なら、それは残して後ろの名前だけ置き換える
        // （つないで1つの名前にすると、R9 で文の他の「店長」まで置き換わるため）
        if (m[2] && NOT_NAMES.indexOf(m[1]) >= 0) {
          if (NOT_NAMES.indexOf(m[2]) >= 0) return null
          if (m[2].length >= 2) names.push(m[2])
          return { keep: m[0].slice(0, m[1].length + 1), t: NAME_TO }
        }
        if (m[1].length >= 2) names.push(m[1])
        if (m[2]) names.push(full)
        return NAME_TO
      })
    })
    // R9 名前の残り：R8 で置き換えた名前が、文の他の所にあれば置き換える（長い名前から）
    names.filter(function (n, i) { return names.indexOf(n) === i && NOT_NAMES.indexOf(n) < 0 })
      .sort(function (a, b) { return b.length - a.length })
      .forEach(function (n) { parts = splitLiteral(parts, n, 'name', NAME_TO) })

    var counts = zeroCounts()
    var marks = []
    var pos = 0
    var t = ''
    parts.forEach(function (p) {
      if (p.k) {
        counts[p.k]++
        marks.push({ k: p.k, start: pos, end: pos + p.t.length })
      }
      t += p.t
      pos += p.t.length
    })
    var total = 0
    COUNT_KEYS.forEach(function (x) { total += counts[x.k] })
    return { text: t, counts: counts, total: total, marks: marks }
  }
  // 置き換え後の文を、画面で mark に包むためのかたまりに分ける
  function pieces (r) {
    var out = []
    var last = 0
    r.marks.forEach(function (m) {
      if (m.start > last) out.push({ t: r.text.slice(last, m.start), k: null })
      out.push({ t: r.text.slice(m.start, m.end), k: m.k })
      last = m.end
    })
    if (last < r.text.length) out.push({ t: r.text.slice(last), k: null })
    return out
  }

  // ---------- 分類 ----------
  function isBlank (text) { return /^[\s　]*$/.test(String(text || '')) }
  function kindClass (id) { return KIND_BY_ID[id] ? KIND_BY_ID[id].cls : null }
  function classLabel (id) { return D.CLS_NAME[kindClass(id)] || '' }

  // ---------- 頼み方の文（AI に頼む種類だけ。AI に頼まない種類・文が空の時は null） ----------
  function trimBlankLines (s) {
    var lines = String(s).split('\n')
    while (lines.length && /^[\s　]*$/.test(lines[0])) lines.shift()
    while (lines.length && /^[\s　]*$/.test(lines[lines.length - 1])) lines.pop()
    return lines.join('\n')
  }
  // AI に頼む種類なのに、店長が答える用件（アレルギー・原材料・送料・日持ち）の言葉が入っていたら、その言葉を返す（2026-11-23 顧問の指摘）
  // 破損・割れは、不満のクチコミのお返事に自然に出るため数えない（その種類の決まりで補償を書かない）
  var SHOP_WORDS = ['アレルギー', '原材料', '卵', '小麦', '乳製品', 'ナッツ', 'そば粉', '落花生', '送料', '日持ち', '賞味期限', '消費期限']
  function shopWords (kindId, text) {
    if (kindClass(kindId) !== 'ai') return []
    var t = String(text || '')
    return SHOP_WORDS.filter(function (w) { return t.indexOf(w) >= 0 })
  }
  function mixText (words) {
    return words.length ? '店長が答える用件の言葉（' + words.join('・') + '）があります。その言葉で尋ねている文なら、「届いた文」の欄から消してから、頼み方の文をコピーしてください。その用件は、店長がひな形で答えます。' : ''
  }
  function buildPrompt (kindId, replacedText) {
    if (kindClass(kindId) !== 'ai') return null
    var body = trimBlankLines(replacedText || '')
    if (body === '') return null
    var r = D.KIND_RULES[kindId]
    return D.SHOP_RULES.concat([
      '',
      '【問い合わせの種類】',
      KIND_BY_ID[kindId].name,
      '',
      '【この種類の決まり】',
      '書き出し：' + r.open,
      '結び：' + r.close,
      '長さ：' + r.len,
      '気をつけること：' + r.care,
      '',
      '【届いた文（置き換え後）】',
      body
    ]).join('\n')
  }

  // ---------- ひな形（【…】の差し込み欄で分ける） ----------
  function template (kindId) { return D.TEMPLATES[kindId] || '' }
  function slots (text) {
    var out = []
    var re = /【[^】]*】/g
    var last = 0
    var m
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), slot: false })
      out.push({ t: m[0], slot: true })
      last = m.index + m[0].length
    }
    if (last < text.length) out.push({ t: text.slice(last), slot: false })
    return out
  }

  // ---------- 送る前の確認 ----------
  function canSend (checks) { return checks.length === D.CHECKS.length && checks.every(function (c) { return c === true }) }
  function checkedN (checks) { return checks.filter(function (c) { return c === true }).length }
  function goText (n) { return n >= D.CHECKS.length ? '店長が確かめました。お店の管理画面から送ってください。このページから送ることはできません。' : 'あと' + (D.CHECKS.length - n) + 'つ確かめると「送ってよい」になります。' }
  function checkState (n) { return n >= D.CHECKS.length ? '送ってよい' : 'あと' + (D.CHECKS.length - n) + 'つ' }

  // ---------- 状態の札・読み上げ ----------
  function pasteState (text, r) { return isBlank(text) ? '未入力' : '置き換え ' + r.total + 'か所' }
  function sayRedact (r) {
    if (!r.total) return '置き換える所は見つかりませんでした。'
    var items = []
    COUNT_KEYS.forEach(function (x) { if (r.counts[x.k]) items.push(x.label + ' ' + r.counts[x.k]) })
    return r.total + 'か所を置き換えました。' + items.join('、') + '。'
  }

  // ---------- 使ったあとの記録（見本） ----------
  function h10 (min) { return Math.floor((min * 20 + 60) / 120) }
  function fmtHours (min) { var h = h10(min); return Math.floor(h / 10) + '.' + (h % 10) }
  function fmtNum (n) {
    var s = String(n < 0 ? -n : n)
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3) }
    return s + out
  }
  // 差：+ は U+002B、− は U+2212
  function fmtDiff (n, unit) { return (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(n) + unit }
  function yen (min, wage) { return Math.floor((min * wage * 2 + 60) / 120) }
  function recordRows () {
    var R = D.RECORD
    var rows = []
    var planSave = 0
    var actSave = 0
    R.rows.forEach(function (x) {
      var p = x.plan.n * x.plan.per
      var a = x.actual.n * x.actual.per
      planSave += x.before - p
      actSave += x.before - a
      rows.push({ id: x.id, item: x.item, plan: p + '分（' + x.plan.n + '通×' + x.plan.per + '分）', actual: a + '分（' + x.actual.n + '通×' + x.actual.per + '分）', diff: fmtDiff(a - p, '分') })
    })
    rows.push({ id: 'save', item: '減った時間（月）', plan: planSave + '分（' + fmtHours(planSave) + '時間）', actual: actSave + '分（' + fmtHours(actSave) + '時間）', diff: fmtDiff(actSave - planSave, '分') })
    var py = yen(planSave, R.wage)
    var ay = yen(actSave, R.wage)
    rows.push({ id: 'yen', item: '減った額（時給 ' + fmtNum(R.wage) + '円・架空）', plan: fmtNum(py) + '円', actual: fmtNum(ay) + '円', diff: fmtDiff(ay - py, '円') })
    var total = R.rows[0].actual.n
    rows.push({ id: 'tpl', item: 'AI に頼まずひな形で答えた', plan: '—', actual: R.tplCount + '通（' + total + '通のうち）', diff: '—' })
    rows.push({ id: 'fix', item: '置き換えの見つけ漏れを店長が直した', plan: '—', actual: R.fixCount + '回', diff: '—' })
    return rows
  }

  return Object.freeze({
    D: D, KIND_BY_ID: KIND_BY_ID, COUNT_KEYS: COUNT_KEYS, RULES: RULES, NOT_NAMES: NOT_NAMES,
    normalize: normalize, redact: redact, pieces: pieces, isBlank: isBlank, kindClass: kindClass, classLabel: classLabel,
    buildPrompt: buildPrompt, shopWords: shopWords, mixText: mixText, SHOP_WORDS: SHOP_WORDS, template: template, slots: slots,
    canSend: canSend, checkedN: checkedN, goText: goText, checkState: checkState, pasteState: pasteState, sayRedact: sayRedact,
    h10: h10, fmtHours: fmtHours, fmtNum: fmtNum, fmtDiff: fmtDiff, yen: yen, recordRows: recordRows
  })
})(typeof Data42 !== 'undefined' ? Data42 : require('./data.js'))
if (typeof module !== 'undefined' && module.exports) module.exports = Calc42
