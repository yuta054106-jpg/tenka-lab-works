// コハクノ食品（デモ）CSVから出荷伝票を一括作成
// 読み込んだ値はすべて textContent / setAttribute で表示する（innerHTML に CSV の値を入れない）
(function () {
  'use strict'

  // ---------- 固定の値 ----------
  // 見本の CSV（design.md §13-1。乱数なし）
  var SAMPLE_CSV = [
    '出荷日,伝票番号,得意先コード,得意先名,商品コード,商品名,数量,単位,単価,備考',
    '2026-11-19,2611-0001,C001,得意先A 青果店（架空）,P101,昆布（1kg）,2,袋,2400,午前着希望',
    '2026-11-19,2611-0001,C001,得意先A 青果店（架空）,P201,干し椎茸（200g）,5,袋,1600,',
    '2026-11-19,2611-0001,C001,得意先A 青果店（架空）,P202,切り干し大根（1kg）,3,袋,1150,',
    '2026-11-19,2611-0001,C001,得意先A 青果店（架空）,P402,片栗粉（1kg）,4,袋,430,',
    '2026-11-19,2611-0002,C002,得意先B 定食屋（架空）,P301,濃口醤油（1.8L）,6,本,620,',
    '2026-11-19,2611-0002,C002,得意先B 定食屋（架空）,P302,本みりん（1.8L）,4,本,890,"納品時間 10:00,14:00 のどちらか"',
    '2026-11-19,2611-0002,C002,得意先B 定食屋（架空）,P102,かつお節（花削り・500g）,2,袋,1850,',
    '2026-11-19,2611-0002,C002,得意先B 定食屋（架空）,P501,だしパック（業務用50袋）,3,箱,1980,',
    '2026-11-19,2611-0002,C002,得意先B 定食屋（架空）,P304,白味噌（1kg）,5,個,760,',
    '2026-11-19,2611-0003,C003,得意先C そば店（架空）,P102,かつお節（花削り・500g）,4,袋,1850,"箱に""要冷暗所""と表示"',
    '2026-11-19,2611-0003,C003,得意先C そば店（架空）,P101,昆布（1kg）,3,袋,2400,',
    '2026-11-19,2611-0003,C003,得意先C そば店（架空）,P301,濃口醤油（1.8L）,10,本,620,',
    '2026-11-19,2611-0003,C003,得意先C そば店（架空）,P302,本みりん（1.8L）,6,本,890,',
    '2026-11-20,2611-0004,C004,得意先D 弁当店（架空）,P303,米酢（1.8L）,5,本,540,"11/27 も同じ数で',
    '予約済み"',
    '2026-11-20,2611-0004,C004,得意先D 弁当店（架空）,P401,白ごま（1kg）,2,袋,1280,',
    '2026-11-20,2611-0004,C004,得意先D 弁当店（架空）,P402,片栗粉（1kg）,10,袋,430,',
    '2026-11-20,2611-0004,C004,得意先D 弁当店（架空）,P103,煮干し（500g）,3,袋,980,',
    '2026-11-20,2611-0004,C004,得意先D 弁当店（架空）,P501,だしパック（業務用50袋）,2,箱,1980,',
    '2026-11-20,2611-0005,C001,得意先A 青果店（架空）,P201,干し椎茸（200g）,3,袋,1600,',
    '2026-11-20,2611-0005,C001,得意先A 青果店（架空）,P401,白ごま（1kg）,1,袋,1280,',
    '2026-11-20,2611-0006,C002,得意先B 定食屋（架空）,P304,白味噌（1kg）,4,個,760,',
    '2026-11-20,2611-0006,C002,得意先B 定食屋（架空）,P103,煮干し（500g）,2,袋,980,',
    '2026-11-20,2611-0006,C002,得意先B 定食屋（架空）,P301,濃口醤油（1.8L）,12,本,620,前回分の返品1本を回収',
    '2026-11-20,2611-0006,C002,得意先B 定食屋（架空）,P202,切り干し大根（1kg）,2,袋,1150,',
    '2026-11-20,2611-0005,C001,得意先A 青果店（架空）,P303,米酢（1.8L）,2,本,540,'
  ].join('\n') + '\n'

  // ダウンロード用と「見本で試す」用の同じ文字列（CRLF・BOM 付き。§14-6）
  var SAMPLE_FILE_TEXT = '\uFEFF' + SAMPLE_CSV.replace(/\n/g, '\r\n')

  // 列（番号＝札の番号）
  var COLS = [
    { n: 1, key: 'date', name: '出荷日', dest: '右上「出荷日」' },
    { n: 2, key: 'no', name: '伝票番号', dest: '右上「伝票番号」（同じ番号を1枚に）' },
    { n: 3, key: 'ccode', name: '得意先コード', dest: '宛先の下「得意先コード」' },
    { n: 4, key: 'cname', name: '得意先名', dest: '宛先「〜 御中」' },
    { n: 5, key: 'pcode', name: '商品コード', dest: '明細「商品コード」' },
    { n: 6, key: 'pname', name: '商品名', dest: '明細「商品名」' },
    { n: 7, key: 'qty', name: '数量', dest: '明細「数量」・合計数量' },
    { n: 8, key: 'unit', name: '単位', dest: '明細「単位」・合計数量の内訳' },
    { n: 9, key: 'price', name: '単価', dest: '明細「単価」' },
    { n: 10, key: 'note', name: '備考', dest: '下「備考」（行ごとの備考をまとめる）' }
  ]
  var CALC = { n: 'calc', name: '計算', dest: '明細「金額」・合計金額（税抜）' }
  var REQUIRED = ['date', 'no', 'ccode', 'cname', 'pname', 'unit']

  var MAX_BYTES = 1024 * 1024
  var MAX_ROWS = 1000
  var WEEK = ['日', '月', '火', '水', '木', '金', '土']
  var yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
  function fmtYen (n) { return yen.format(n).replace('￥', '¥') }
  function fmtNum (n) { return n.toLocaleString('ja-JP') }

  // ---------- CSV の読み取り（純粋な関数。§14-1・§14-2） ----------
  // 文字列 → { records: [{ fields: [...], line: Excel の行番号 }], error: null | { type: 'quote', line } }
  function parseCSV (text) {
    var records = []
    var fields = []
    var field = ''
    var inQuote = false
    var atStart = true // 項目の先頭か
    var recStartLine = 1
    var i = 0
    var len = text.length
    function endField () { fields.push(field); field = ''; atStart = true }
    function endRecord () {
      endField()
      records.push({ fields: fields, line: records.length + 1 })
      fields = []
    }
    while (i < len) {
      var c = text[i]
      if (inQuote) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue }
          inQuote = false; i++
          // 閉じた " の後ろは区切り・改行・終わりのはず（空白は許す）。
          // ほかの文字が続く時は、手前の " が閉じ忘れで、後ろの行の " と組になってしまった状態とみなす
          while (i < len && (text[i] === ' ' || text[i] === '\t' || text[i] === '　')) i++
          if (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
            return { records: records, error: { type: 'quote', line: recStartLine } }
          }
          continue
        }
        if (c === '\r') { field += '\n'; i += (text[i + 1] === '\n') ? 2 : 1; continue }
        field += c; i++; continue
      }
      if (c === '"' && atStart) { inQuote = true; atStart = false; recStartLine = records.length + 1; i++; continue }
      if (c === ',') { endField(); i++; continue }
      if (c === '\r' || c === '\n') {
        endRecord()
        i += (c === '\r' && text[i + 1] === '\n') ? 2 : 1
        continue
      }
      field += c; atStart = false; i++
    }
    if (inQuote) return { records: records, error: { type: 'quote', line: recStartLine } }
    // 最後の改行のあとは行として数えない
    if (field !== '' || fields.length > 0) endRecord()
    // 最後の空行も数えない
    while (records.length && isBlankRecord(records[records.length - 1].fields)) records.pop()
    // 項目の前後の空白（半角・全角）を取る
    records.forEach(function (r) { r.fields = r.fields.map(trimField) })
    return { records: records, error: null }
  }
  function trimField (s) { return s.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '') }
  function isBlankRecord (fields) { return fields.every(function (f) { return trimField(f) === '' }) }

  // ---------- 値のチェック（§14-3） ----------
  function clip (s, n) { s = String(s); return s.length > n ? s.slice(0, n) + '…' : s }
  function toInt (s) {
    var t = String(s)
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
      .replace(/[－−]/g, '-')
      .replace(/[\s\u3000]/g, '')
      .replace(/[,，]/g, '')
    if (!/^-?\d+$/.test(t)) return null
    return parseInt(t, 10)
  }
  function parseDate (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) || /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s)
    if (!m) return null
    var y = +m[1]; var mo = +m[2]; var d = +m[3]
    var dt = new Date(y, mo - 1, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
    return { y: y, m: mo, d: d, date: dt, iso: y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0') }
  }

  // ヘッダーの対応（列名 → 位置）
  function mapHeader (fields) {
    var names = fields.map(function (f, i) { return i === 0 ? f.replace(/^\uFEFF/, '') : f }).map(trimField)
    var idx = {}
    var extra = []
    names.forEach(function (nm, i) {
      var col = COLS.filter(function (c) { return c.name === nm })[0]
      if (col && idx[col.key] === undefined) idx[col.key] = i
      else extra.push(nm === '' ? '（空の列名）' : nm)
    })
    var missing = COLS.filter(function (c) { return idx[c.key] === undefined }).map(function (c) { return c.name })
    return { idx: idx, missing: missing, extra: extra, order: names }
  }

  // テキスト全体 → 結果 or ファイル全体のエラー
  function processText (text) {
    var body = text.replace(/^\uFEFF/, '')
    if (body.replace(/[\s\u3000]/g, '') === '') return { fatal: { title: 'CSVの中身が空です', body: '見本のCSVをダウンロードして、形を確かめてください。', dl: true } }
    var parsed = parseCSV(body)
    if (parsed.error) {
      return { fatal: { title: 'ダブルクォート（"）が閉じていません', body: parsed.error.line + '行目から後ろが読めませんでした。CSV を確かめてください。' } }
    }
    var recs = parsed.records
    // 「,,,」や「""」だけのファイルは、空の行を除くと1行も残らない（recs[0] が無いまま進むと例外になる）
    if (!recs.length) return { fatal: { title: 'CSVの中身が空です', body: '見本のCSVをダウンロードして、形を確かめてください。', dl: true } }
    // 先頭の空行は見出しとして扱えないので、そのまま見出しのチェックで落とす
    var head = mapHeader(recs[0].fields)
    if (head.missing.length || head.extra.length) {
      var parts = []
      if (head.missing.length) parts.push('足りない列：' + head.missing.join('・'))
      if (head.extra.length) parts.push('見本にない列：' + head.extra.map(function (s) { return clip(s, 20) }).join('・'))
      return { fatal: { title: '見出しの行が見本と違うため、読み込めませんでした', body: parts.join('／'), dl: true } }
    }
    var data = recs.slice(1)
    if (!data.length) return { fatal: { title: 'データの行がありません', body: '見出しの行の下に、出荷の行を入れてください。' } }
    if (data.length > MAX_ROWS) return { fatal: { title: '行が多すぎます', body: '1,000行までの CSV にしてください（デモの上限）。' } }

    var idx = head.idx
    var good = []
    var skipped = []
    // CSV の値をキーにする入れ物は Object.create(null)（「constructor」「__proto__」などの値で既存のプロパティに当たらないように）
    var firstBySlip = Object.create(null)
    data.forEach(function (r) {
      var f = r.fields
      function v (key) { return f[idx[key]] === undefined ? '' : f[idx[key]] }
      function skip (reason) { skipped.push({ line: r.line, reason: reason, raw: f }) }
      if (f.every(function (x) { return x === '' })) return skip('空の行です')
      if (f.length < 10) return skip('列が足りません（10列のところ' + f.length + '列）')
      if (f.length > 10) return skip('列が多すぎます（10列のところ' + f.length + '列）')
      for (var k = 0; k < REQUIRED.length; k++) {
        if (v(REQUIRED[k]) === '') return skip(colByKey(REQUIRED[k]).name + 'が空です')
      }
      var dt = parseDate(v('date'))
      if (!dt) return skip('出荷日の形が読めません（「' + clip(v('date'), 20) + '」）')
      var qty = toInt(v('qty'))
      if (qty === null) return skip('数量が数字ではありません（「' + clip(v('qty'), 20) + '」）')
      if (qty < 1 || qty > 99999) return skip('数量は1〜99,999の整数にしてください（「' + clip(v('qty'), 20) + '」）')
      var price = toInt(v('price'))
      if (price === null) return skip('単価が数字ではありません（「' + clip(v('price'), 20) + '」）')
      if (price < 0 || price > 9999999) return skip('単価は0〜9,999,999の整数にしてください（「' + clip(v('price'), 20) + '」）')
      var no = v('no')
      var first = firstBySlip[no]
      if (first && first.ccode !== v('ccode')) return skip('伝票番号 ' + clip(no, 20) + ' の得意先（' + clip(first.ccode, 20) + '）と違います（' + clip(v('ccode'), 20) + '）')
      if (first && first.date.iso !== dt.iso) return skip('伝票番号 ' + clip(no, 20) + ' の出荷日（' + first.date.iso + '）と違います（' + dt.iso + '）')
      var row = {
        line: r.line, date: dt, no: no, ccode: v('ccode'), cname: v('cname'),
        pcode: v('pcode'), pname: v('pname'), qty: qty, unit: v('unit'), price: price, note: v('note'),
        amount: qty * price, raw: f
      }
      if (!first) firstBySlip[no] = row
      good.push(row)
    })

    var slips = buildSlips(good)
    var skippedLines = {}
    skipped.forEach(function (s) { skippedLines[s.line] = true })
    var result = {
      idx: idx, order: head.order, dataCount: data.length, data: data,
      good: good, skipped: skipped, skippedLines: skippedLines, slips: slips,
      customers: unique(slips.map(function (s) { return s.ccode })).length,
      totalRows: good.length,
      totalQty: slips.reduce(function (a, s) { return a + s.qty }, 0),
      totalAmount: slips.reduce(function (a, s) { return a + s.amount }, 0)
    }
    if (!slips.length) result.fatal = { title: '伝票にできる行がありませんでした', body: '下の一覧の理由を見て、CSV を直してください。' }
    return result
  }
  function colByKey (key) { return COLS.filter(function (c) { return c.key === key })[0] }
  function unique (arr) { var out = []; arr.forEach(function (x) { if (out.indexOf(x) < 0) out.push(x) }); return out }

  // 伝票番号でまとめる（並びは伝票番号の昇順、明細は CSV の順）
  function buildSlips (rows) {
    var map = Object.create(null)
    var keys = []
    rows.forEach(function (r) {
      if (!map[r.no]) { map[r.no] = []; keys.push(r.no) }
      map[r.no].push(r)
    })
    keys.sort(function (a, b) { return a.localeCompare(b, 'ja', { numeric: true }) })
    return keys.map(function (no) {
      var items = map[no]
      var f = items[0]
      var units = []
      var byUnit = Object.create(null)
      items.forEach(function (it) {
        if (byUnit[it.unit] === undefined) { byUnit[it.unit] = 0; units.push(it.unit) }
        byUnit[it.unit] += it.qty
      })
      var notes = unique(items.map(function (it) { return it.note }).filter(function (n) { return n !== '' }))
      return {
        no: no, date: f.date, ccode: f.ccode, cname: f.cname, items: items,
        qty: items.reduce(function (a, it) { return a + it.qty }, 0),
        amount: items.reduce(function (a, it) { return a + it.amount }, 0),
        units: units.map(function (u) { return { unit: u, qty: byUnit[u] } }),
        notes: notes
      }
    })
  }

  // ---------- 文字コード（§14-5） ----------
  function decode (buf) {
    var bytes = new Uint8Array(buf)
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(3)), enc: 'UTF-8（BOMあり）' } } catch (e) { return null }
    }
    try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), enc: 'UTF-8（BOMなし）' } } catch (e) { /* 次へ */ }
    try { return { text: new TextDecoder('shift_jis', { fatal: true }).decode(bytes), enc: 'Shift_JIS' } } catch (e) { return null }
  }

  // ---------- 日付の表示 ----------
  function jpDate (d) { return d.y + '年' + d.m + '月' + d.d + '日（' + WEEK[d.date.getDay()] + '）' }
  function shortDate (d) { return d.m + '/' + d.d + '（' + WEEK[d.date.getDay()] + '）' }

  // ---------- DOM の小道具 ----------
  var $ = function (id) { return document.getElementById(id) }
  // 要素を作る。文字は必ず textContent（文字列の子）で入れる
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
  // 固定の SVG だけを作る（CSV の値は入れない）
  function icon (markup) {
    var t = document.createElement('template')
    t.innerHTML = markup.trim()
    return t.content.firstChild
  }
  var SVG = {
    check: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 9.5l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bang: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4.5v5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/></svg>',
    bangS: '<svg width="12" height="12" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4.5v5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/></svg>',
    arrowR: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v11M4 9l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chev: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    prev: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M11 4l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M7 4l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    print: '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7V2h10v5M5 15H3V8h14v7h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M5 12h10v6H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    slip: '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M10 4h14l8 8v24H10z M24 4v8h8" fill="none" stroke="#5F6368" stroke-width="2" stroke-linejoin="round"/><path d="M15 20h12M15 25h12M15 30h8" stroke="#5F6368" stroke-width="2" stroke-linecap="round"/></svg>',
    stamp: '<svg class="stamp" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="見本の印（このデモの伝票は見本です）">' +
      '<rect x="1.5" y="1.5" width="53" height="53" rx="4" fill="none" stroke="#B23A2E" stroke-width="3"/>' +
      '<rect x="6.5" y="6.5" width="43" height="43" rx="2" fill="none" stroke="#B23A2E" stroke-width="1"/>' +
      '<text x="28" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">見</text>' +
      '<text x="28" y="45" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">本</text>' +
      '</svg>'
  }

  // 札（大）と札（小）
  function bigTag (col) {
    return h('span', { class: 'tag', 'data-col': col.n }, [
      h('span', { class: 'tag__n', text: col.n === 'calc' ? '7×9' : String(col.n) }),
      h('span', { class: 'tag__t', text: col.name })
    ])
  }
  function srcTag (n, extra) {
    return h('span', { class: 'src-tag' + (extra ? ' ' + extra : ''), 'data-col': n, 'aria-hidden': 'true', text: n === 'calc' ? '7×9' : String(n) })
  }

  // ---------- 状態 ----------
  var state = null // 読み込んだ結果
  var printed = false
  var selNo = null // 選んでいる伝票番号
  var spView = 'list' // スマホ・タブレット：list / one
  var mqPC = window.matchMedia('(min-width: 1024px)')
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  var elStatus = $('sr-status')
  var elResult = $('load-result')
  var elSample = $('btn-sample')
  var elFile = $('file')
  var elFileLabel = $('file-label')
  var elLoading = $('loading')
  var elArea = $('slips-area')
  var elPrintRoot = $('print-root')
  var baseTitle = document.title

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
    t.classList.add('is-in')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { t.hidden = true }, 3000)
  }

  // ---------- 手順表示 ----------
  function renderSteps () {
    var ok = state && !state.fatal
    var st = ok ? (printed ? ['done', 'done', 'done'] : ['done', 'done', 'current']) : ['current', '', '']
    Array.prototype.forEach.call(document.querySelectorAll('.step'), function (li, i) {
      li.classList.toggle('is-current', st[i] === 'current')
      li.classList.toggle('is-done', st[i] === 'done')
      var a = li.querySelector('a')
      if (st[i] === 'current') a.setAttribute('aria-current', 'step')
      else a.removeAttribute('aria-current')
    })
  }

  // ---------- 見本のダウンロード（§14-6） ----------
  var dlUrl = null
  function refreshDl () {
    if (dlUrl) URL.revokeObjectURL(dlUrl)
    dlUrl = URL.createObjectURL(new Blob([SAMPLE_FILE_TEXT], { type: 'text/csv;charset=utf-8' }))
    Array.prototype.forEach.call(document.querySelectorAll('.js-dl'), function (a) { a.href = dlUrl })
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.js-dl')
    if (!a) return
    showToast('見本のCSVをダウンロードしました')
    window.setTimeout(refreshDl, 1500)
  })

  // ---------- 読み込み ----------
  var loadingTimer = null
  function setBusy (on) {
    ;[elSample, elFileLabel].forEach(function (b) { if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled') })
    window.clearTimeout(loadingTimer)
    if (on) loadingTimer = window.setTimeout(function () { elLoading.hidden = false }, 100)
    else elLoading.hidden = true
  }
  var busy = false
  elSample.addEventListener('click', function () {
    if (busy) return
    // ダウンロードと同じ文字列を、ファイルと同じ読み取り関数に通す
    applyResult(processText(SAMPLE_FILE_TEXT), { sample: true, enc: '見本（UTF-8）' })
  })
  elFile.addEventListener('change', function () {
    var file = elFile.files && elFile.files[0]
    if (!file || busy) return
    var name = file.name
    function done () { elFile.value = '' }
    if (!/\.csv$/i.test(name)) { done(); applyResult({ fatal: { title: 'CSVファイルを選んでください', body: '拡張子が「.csv」のファイルを読み込めます。' } }, { name: name }); return }
    if (file.size > MAX_BYTES) { done(); applyResult({ fatal: { title: 'ファイルが大きすぎます', body: '1MB までの CSV にしてください（デモの上限）。' } }, { name: name }); return }
    if (file.size === 0) { done(); applyResult({ fatal: { title: 'CSVの中身が空です', body: '見本のCSVをダウンロードして、形を確かめてください。', dl: true } }, { name: name }); return }
    busy = true
    setBusy(true)
    file.arrayBuffer().then(function (buf) {
      var dec = decode(buf)
      if (!dec) return applyResult({ fatal: { title: '文字コードが読めませんでした', body: 'UTF-8 で保存し直して、もう一度お試しください。' } }, { name: name })
      applyResult(processText(dec.text), { name: name, enc: dec.enc })
    }).catch(function () {
      applyResult({ fatal: { title: 'ファイルを読めませんでした', body: 'もう一度お試しください。' } }, { name: name })
    }).then(function () { busy = false; setBusy(false); done() })
  })

  function applyResult (res, src) {
    var prevNo = selNo
    if (res.fatal) {
      state = null
      printed = false
      selNo = null
      spView = 'list'
      renderResultBox(res, src)
      setSampleMain(true)
      renderAll()
      var box = elResult.querySelector('.err-box')
      if (box) box.focus()
      announce(res.fatal.title)
      return
    }
    state = res
    printed = false
    var still = res.slips.filter(function (s) { return s.no === prevNo })[0]
    selNo = still ? still.no : res.slips[0].no
    spView = 'list'
    renderResultBox(res, src)
    setSampleMain(false)
    renderAll()
    var ok = elResult.querySelector('.ok-box')
    if (ok) ok.focus()
    showToast('伝票を' + res.slips.length + '枚作りました')
    announce(res.dataCount + '行を読み込み、伝票を' + res.slips.length + '枚作りました' + (res.skipped.length ? '。' + res.skipped.length + '行を読み飛ばしました' : ''))
  }

  function setSampleMain (main) {
    elSample.classList.toggle('btn-main', main)
    elSample.classList.toggle('btn-sub', !main)
    $('btn-sample-label').textContent = main ? '見本のCSVで試す' : '見本のCSVを読み込み直す'
  }

  // 結果の一言・読み飛ばしの一覧・エラーの箱
  function renderResultBox (res, src) {
    elResult.textContent = ''
    if (res.fatal) {
      var errBox = h('div', { class: 'err-box', role: 'alert', tabindex: '-1' }, [
        h('p', { class: 'err-box__title' }, [icon(SVG.bang), res.fatal.title]),
        h('p', { class: 'err-box__body', text: res.fatal.body }),
        src && src.name ? h('p', { class: 'err-box__file', text: '選んだファイル：' + clip(src.name, 40) }) : null,
        h('p', {}, h('a', { class: 'text-link js-dl', href: dlUrl, download: '見本_出荷実績_コハクノ食品.csv' }, [icon(SVG.down), '見本のCSVをダウンロード']))
      ])
      elResult.appendChild(errBox)
      if (res.skipped && res.skipped.length) elResult.appendChild(skippedBox(res))
      return
    }
    var title = src.sample ? '見本のCSVを読み込みました' : clip(src.name, 40) + ' を読み込みました'
    var line2 = '文字コード：' + src.enc + '／データ ' + res.dataCount + '行 → 伝票 ' + res.slips.length + '枚（得意先 ' + res.customers + '社）' +
      (res.skipped.length ? '、読み飛ばし ' + res.skipped.length + '行' : '')
    var ok = h('div', { class: 'ok-box', role: 'status', tabindex: '-1' }, [
      h('p', { class: 'ok-box__title' }, [icon(SVG.check), title]),
      h('p', { class: 'ok-box__body', id: 'result-line', text: line2 }),
      h('p', { class: 'ok-box__links' }, [
        h('a', { class: 'text-link', href: '#step-map' }, ['② 対応を確かめる', icon(SVG.down)]),
        h('a', { class: 'text-link js-to-slips', href: '#step-slips' }, ['③ 伝票を見る', icon(SVG.down)])
      ])
    ])
    elResult.appendChild(ok)
    if (res.skipped.length) elResult.appendChild(skippedBox(res))
  }

  function skippedBox (res) {
    var list = res.skipped.slice(0, 50)
    var rest = res.skipped.length - list.length
    var table = h('table', { class: 'skip-table' }, [
      h('thead', {}, h('tr', {}, [h('th', { scope: 'col', class: 'c-line', text: '行' }), h('th', { scope: 'col', text: '理由' }), h('th', { scope: 'col', class: 'c-raw', text: '行の中身' })])),
      h('tbody', {}, list.map(function (s) {
        return h('tr', {}, [
          h('td', { class: 'c-line', text: String(s.line) }),
          h('td', { text: s.reason }),
          h('td', { class: 'c-raw', text: clip(s.raw.join(','), 40) })
        ])
      }))
    ])
    var spList = h('ul', { class: 'skip-list' }, list.map(function (s) {
      return h('li', {}, [h('span', { class: 'skip-list__line', text: s.line + '行目' }), h('span', { class: 'skip-list__reason', text: s.reason })])
    }))
    return h('div', { class: 'warn-box' }, [
      h('p', { class: 'warn-box__title' }, [icon(SVG.bang), res.skipped.length + '行を読み飛ばしました（伝票には入れていません）']),
      h('p', { class: 'warn-box__sub', text: 'CSV を直して、もう一度読み込んでください。' }),
      h('p', { class: 'warn-box__note', text: '行は、Excel で開いた時の行番号です（見出しが1行目）' }),
      table, spList,
      rest > 0 ? h('p', { class: 'warn-box__rest', text: 'ほか ' + rest + '行' }) : null
    ])
  }

  // ---------- ② 対応表 ----------
  var SAMPLE_STATE = processText(SAMPLE_FILE_TEXT)
  function renderMap () {
    var src = state || SAMPLE_STATE
    var isSample = !state
    var ex = src.good[0]
    $('map-example-note').hidden = !isSample
    var body = $('map-body')
    var list = $('map-list')
    body.textContent = ''
    list.textContent = ''
    var rows = COLS.map(function (c) {
      var pos = src.idx[c.key] + 1
      var val = ex.raw[src.idx[c.key]]
      return { col: c, pos: pos + '列目', listPos: 'CSVの' + pos + '列目', ex: clip(String(val).replace(/\n/g, ' '), 20) }
    })
    rows.push({ col: CALC, pos: '—', listPos: '計算', ex: fmtNum(ex.qty) + ' × ' + fmtNum(ex.price) })
    rows.forEach(function (r) {
      var exCls = 'map-ex' + (isSample ? ' is-sample' : '')
      body.appendChild(h('tr', { tabindex: '0', 'data-col': r.col.n }, [
        h('th', { scope: 'row' }, bigTag(r.col)),
        h('td', { class: 'map-pos', text: r.pos }),
        h('td', { class: exCls, text: r.ex }),
        h('td', { class: 'map-arrow' }, icon(SVG.arrowR)),
        h('td', { class: 'map-dest' }, [srcTag(r.col.n), r.col.dest])
      ]))
      list.appendChild(h('li', { 'data-col': r.col.n }, [
        h('p', { class: 'map-list__l1' }, [bigTag(r.col), h('span', { class: 'map-list__pos', text: r.listPos })]),
        h('p', { class: 'map-list__l2' }, [icon(SVG.arrowR), r.col.dest]),
        h('p', { class: 'map-list__l3', text: '例：' + r.ex })
      ]))
    })
  }
  // 対応表の行 → 見取り図の札を光らせる
  function hot (n, on) {
    Array.prototype.forEach.call(document.querySelectorAll('#figure .src-tag'), function (t) {
      t.classList.toggle('is-hot', on && t.getAttribute('data-col') === String(n))
    })
  }
  var mapBody = $('map-body')
  mapBody.addEventListener('mouseover', function (e) { var tr = e.target.closest('tr'); if (tr) hot(tr.getAttribute('data-col'), true) })
  mapBody.addEventListener('mouseleave', function () { hot(null, false) })
  mapBody.addEventListener('focusin', function (e) { var tr = e.target.closest('tr'); if (tr) hot(tr.getAttribute('data-col'), true) })
  mapBody.addEventListener('focusout', function () { hot(null, false) })

  // ---------- ② プレビュー ----------
  function renderPreview () {
    var box = $('preview')
    box.textContent = ''
    var cnt = $('preview-count')
    if (!state) {
      cnt.hidden = true
      box.appendChild(h('div', { class: 'preview-empty', text: 'CSVを読み込むと、先頭10行がここに出ます' }))
      return
    }
    cnt.hidden = false
    cnt.textContent = '全 ' + fmtNum(state.dataCount) + '行'
    // CSV の列の順で札を並べる
    var order = state.order.slice(0, 10).map(function (nm) { return COLS.filter(function (c) { return c.name === nm })[0] })
    var thead = h('thead', {}, h('tr', {}, [h('th', { scope: 'col', class: 'pv-line', text: '行' })].concat(order.map(function (c) {
      return h('th', { scope: 'col' }, bigTag(c))
    }))))
    var tbody = h('tbody', {}, state.data.slice(0, 10).map(function (r) {
      var bad = !!state.skippedLines[r.line]
      return h('tr', { class: bad ? 'is-err' : null }, [
        h('th', { scope: 'row', class: 'pv-line' }, [bad ? icon(SVG.bangS) : null, String(r.line), bad ? h('span', { class: 'visually-hidden', text: '（読み飛ばし）' }) : null])
      ].concat(order.map(function (c, i) {
        var v = r.fields[i] === undefined ? '' : r.fields[i]
        var td = h('td', { class: (c.key === 'qty' || c.key === 'price') ? 'num' : null })
        if (v !== '') td.setAttribute('title', v)
        var parts = v.split('\n')
        parts.forEach(function (p, k) {
          if (k > 0) td.appendChild(h('span', { class: 'nl', text: '↵' }))
          td.appendChild(document.createTextNode(p))
        })
        return td
      })))
    }))
    box.appendChild(h('table', { class: 'pv' }, [h('caption', { class: 'visually-hidden', text: 'CSVの先頭10行。行は Excel の行番号' }), thead, tbody]))
  }

  // ---------- ③ 伝票 ----------
  function slipIndex () {
    if (!state) return -1
    for (var i = 0; i < state.slips.length; i++) if (state.slips[i].no === selNo) return i
    return 0
  }
  function qtyText (s) {
    return s.units.length === 1 ? fmtNum(s.qty) + s.units[0].unit : fmtNum(s.qty)
  }
  function unitBreakdown (s) {
    return s.units.length > 1 ? '（' + s.units.map(function (u) { return u.unit + fmtNum(u.qty) }).join('・') + '）' : ''
  }

  // 紙面を作る（画面と印刷で同じ関数。live=false の時は id を付けない）
  function buildPaper (s, live) {
    var itemsRows = s.items.map(function (it, i) {
      return h('tr', {}, [
        h('td', { class: 'it-no', text: String(i + 1) }),
        h('td', { class: 'it-code' }, [it.pcode || '—', srcTag(5, 'sp-only')]),
        h('td', { class: 'it-name' }, [it.pname, srcTag(6, 'sp-only')]),
        h('td', { class: 'it-qty num', text: fmtNum(it.qty) }),
        h('td', { class: 'it-unit', text: it.unit }),
        h('td', { class: 'it-price num' }, [fmtYen(it.price), srcTag(7, 'sp-only'), srcTag(8, 'sp-only'), srcTag(9, 'sp-only')]),
        h('td', { class: 'it-amt num', text: fmtYen(it.amount) })
      ])
    })
    function th (label, cls, tags) { return h('th', { scope: 'col', class: cls }, [label].concat(tags)) }
    var heading = h('h3', {
      class: 'visually-hidden slip-h',
      id: live ? 'slip-h' : null,
      tabindex: live ? '-1' : null,
      'aria-describedby': live ? 'slip-tag-desc' : null,
      text: '出荷伝票 No.' + s.no + '（' + s.cname + '）'
    })
    return h('article', { class: 'paper slip', id: live ? 'slip-paper' : null }, [
      heading,
      h('p', { class: 'p-title', 'aria-hidden': 'true', text: '出荷伝票' }),
      h('dl', { class: 'p-meta' }, [
        h('div', {}, [h('dt', { text: '伝票番号' }), srcTag(2), h('dd', { text: s.no })]),
        h('div', {}, [h('dt', { text: '出荷日' }), srcTag(1), h('dd', { text: jpDate(s.date) })])
      ]),
      h('div', { class: 'p-parties' }, [
        h('div', { class: 'p-to' }, [
          h('p', { class: 'p-to__name' }, [h('span', { class: 'p-to__co', text: s.cname }), h('span', { class: 'p-to__hon', text: '御中' }), srcTag(4)]),
          h('p', { class: 'p-to__code' }, [h('span', { class: 'p-label', text: '得意先コード' }), srcTag(3), h('span', { text: s.ccode })]),
          h('p', { class: 'p-to__lead', text: '下記のとおり出荷いたしました。' })
        ]),
        h('div', { class: 'p-from' }, [
          h('p', { class: 'p-from__name' }, ['コハクノ食品（架空）', icon(SVG.stamp)]),
          h('p', { text: '〒000-0000（架空の住所）' }),
          h('p', { text: 'TEL 00-0000-0000（架空）' })
        ])
      ]),
      h('table', { class: 'items' }, [
        h('caption', { class: 'visually-hidden', text: '明細' }),
        h('thead', {}, h('tr', {}, [
          th('No.', 'c-no', []),
          th('商品コード', 'c-code', [srcTag(5)]),
          th('商品名', 'c-name', [srcTag(6)]),
          th('数量', 'c-qty num', [srcTag(7)]),
          th('単位', 'c-unit', [srcTag(8)]),
          th('単価', 'c-price num', [srcTag(9)]),
          th('金額', 'c-amt num', [srcTag('calc')])
        ])),
        h('tbody', {}, itemsRows)
      ]),
      h('div', { class: 'slip-totals' }, [
        h('table', { class: 'totals' }, h('tbody', {}, [
          h('tr', {}, [h('th', { scope: 'row' }, ['合計数量', srcTag(7), srcTag(8)]), h('td', { class: 'totals__qty' }, [qtyText(s), s.units.length > 1 ? h('span', { class: 'totals__units', text: unitBreakdown(s) }) : null])]),
          h('tr', {}, [h('th', { scope: 'row' }, ['合計金額（税抜）', srcTag('calc')]), h('td', { class: 'totals__amt', text: fmtYen(s.amount) })])
        ])),
        h('p', { class: 'p-note', text: '金額は税抜の参考です。税の扱いはお客様のルールに合わせます。' })
      ]),
      h('div', { class: 'slip-foot' }, [
        h('div', { class: 'p-remarks' }, [
          h('p', { class: 'p-remarks__label' }, ['備考', srcTag(10)]),
          s.notes.length
            ? h('p', { class: 'p-remarks__body', text: s.notes.map(function (n) { return '・' + n }).join('\n') })
            : h('p', { class: 'p-remarks__body is-none', text: '—' })
        ]),
        h('div', { class: 'p-receipt' }, h('p', { text: '受領印' }))
      ]),
      h('p', { class: 'p-foot', text: 'この伝票は TENKA LAB の制作見本です。会社・得意先・商品・数量はすべて架空です。金額は税抜の参考です。' })
    ])
  }

  function deskOutsideNote () {
    return h('p', { class: 'slip-note-outside', 'aria-hidden': 'true' }, ['番号の札＝②の CSV の列（印刷には出ません）', srcTag(4)])
  }
  function printOneBtn (s, wide) {
    return h('button', { type: 'button', class: 'btn-sub print-one' + (wide ? ' print-one--wide' : ''), onclick: function () { doPrint([s]) } }, [icon(SVG.print), 'この伝票だけ印刷'])
  }

  function renderSlips () {
    elArea.textContent = ''
    var has = state && state.slips.length
    $('slips-sum').hidden = !has
    $('print-all-wrap').hidden = !has
    $('print-notes').hidden = !has
    if (!has) {
      elArea.appendChild(h('div', { class: 'desk desk--empty' }, h('div', { class: 'paper-empty' }, [
        icon(SVG.slip),
        h('p', { class: 'paper-empty__title', text: 'まだ伝票はありません' }),
        h('p', { class: 'paper-empty__text', text: '① で CSV を読み込むと、伝票番号ごとにできあがります' }),
        h('a', { class: 'text-link', href: '#step-load', text: '① 読み込みへ戻る' })
      ])))
      return
    }
    $('slips-sum').textContent = state.slips.length + '枚・明細' + state.totalRows + '行・合計 ' + fmtYen(state.totalAmount) + '（税抜・参考）'
    $('print-all-label').textContent = 'すべて印刷・PDFで保存（' + state.slips.length + '枚）'
    var i = slipIndex()
    var s = state.slips[i]
    if (mqPC.matches) {
      // PC：左に一覧（tablist）、右に1枚
      var tabs = h('div', { class: 'slip-tabs', role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': '伝票の一覧' }, state.slips.map(function (sl, k) {
        var on = k === i
        return h('button', {
          type: 'button', role: 'tab', class: 'slip-item', id: 'slip-tab-' + k,
          'aria-selected': on ? 'true' : 'false', 'aria-controls': 'slip-panel', tabindex: on ? '0' : '-1',
          // 一覧を作り直すので、押したタブにフォーカスを戻す（Enter・Space で選んだ時にフォーカスが消えないように）
          onclick: function () { select(sl.no, true) }
        }, itemBody(sl))
      }))
      tabs.addEventListener('keydown', onTabKey)
      var side = h('div', { class: 'slip-side' + (state.slips.length > 6 ? ' is-long' : '') }, [h('p', { class: 'slip-side__title', text: '伝票番号の順' }), tabs])
      var main = h('div', { class: 'slip-main', role: 'tabpanel', id: 'slip-panel', 'aria-labelledby': 'slip-tab-' + i }, [
        h('div', { class: 'slip-toolbar' }, [printOneBtn(s), h('p', { class: 'slip-toolbar__text', text: 'No.' + s.no + '（' + s.cname + '）の1枚' })]),
        h('div', { class: 'desk' }, [deskOutsideNote(), buildPaper(s, true)])
      ])
      elArea.appendChild(h('div', { class: 'slip-layout' }, [side, main]))
      return
    }
    // スマホ・タブレット：一覧 → 1枚
    if (spView === 'list') {
      elArea.appendChild(h('ul', { class: 'slip-cards' }, state.slips.map(function (sl, k) {
        return h('li', {}, h('button', {
          type: 'button', class: 'slip-item slip-card', 'data-no': sl.no,
          'aria-label': 'No.' + sl.no + ' ' + sl.cname + ' ' + sl.date.m + '月' + sl.date.d + '日 明細' + sl.items.length + '行 数量' + sl.qty + ' ' + fmtNum(sl.amount) + '円。押すと伝票を開きます',
          onclick: function () { openOne(sl.no) }
        }, [h('span', { class: 'slip-card__body' }, itemBody(sl)), h('span', { class: 'slip-card__chev' }, icon(SVG.chev))]))
      })))
      return
    }
    var n = state.slips.length
    var bar = h('div', { class: 'one-bar' }, [
      h('button', { type: 'button', class: 'one-back', onclick: backToList }, [icon(SVG.prev), '一覧へ戻る']),
      h('p', { class: 'one-count', text: (i + 1) + ' / ' + n }),
      h('div', { class: 'one-nav' }, [
        h('button', { type: 'button', class: 'one-nav__btn', 'aria-label': '前の伝票', 'aria-disabled': i === 0 ? 'true' : null, onclick: function () { if (i > 0) openOne(state.slips[i - 1].no) } }, icon(SVG.prev)),
        h('button', { type: 'button', class: 'one-nav__btn', 'aria-label': '次の伝票', 'aria-disabled': i === n - 1 ? 'true' : null, onclick: function () { if (i < n - 1) openOne(state.slips[i + 1].no) } }, icon(SVG.next))
      ])
    ])
    elArea.appendChild(bar)
    elArea.appendChild(h('div', { class: 'desk' }, [deskOutsideNote(), buildPaper(s, true)]))
    elArea.appendChild(printOneBtn(s, true))
  }
  function itemBody (sl) {
    return [
      h('span', { class: 'slip-item__l1' }, [h('span', { class: 'slip-item__no', text: 'No.' + sl.no }), h('span', { class: 'slip-item__date', text: shortDate(sl.date) })]),
      h('span', { class: 'slip-item__name', text: sl.cname }),
      h('span', { class: 'slip-item__l3' }, [h('span', { class: 'slip-item__meta', text: '明細' + sl.items.length + '行・数量' + fmtNum(sl.qty) }), h('span', { class: 'slip-item__amt', text: fmtYen(sl.amount) })])
    ]
  }
  function select (no, focusTab) {
    selNo = no
    renderSlips()
    if (focusTab) {
      var t = elArea.querySelector('[role="tab"][aria-selected="true"]')
      if (t) t.focus()
    }
  }
  function onTabKey (e) {
    var i = slipIndex()
    var n = state.slips.length
    var to = null
    if (e.key === 'ArrowDown') to = Math.min(n - 1, i + 1)
    else if (e.key === 'ArrowUp') to = Math.max(0, i - 1)
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = n - 1
    if (to === null) return
    e.preventDefault()
    select(state.slips[to].no, true)
  }
  function openOne (no) {
    selNo = no
    spView = 'one'
    renderSlips()
    $('h-slips').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    var hd = $('slip-h')
    if (hd) hd.focus({ preventScroll: true })
  }
  function backToList () {
    var no = selNo
    spView = 'list'
    renderSlips()
    var btn = elArea.querySelector('.slip-card[data-no="' + cssEsc(no) + '"]')
    if (btn) btn.focus()
  }
  function cssEsc (s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&') }

  mqPC.addEventListener('change', function () { if (state) renderSlips() })

  // ---------- 印刷（§16-1） ----------
  function fillPrint (list) {
    elPrintRoot.textContent = ''
    if (!list || !list.length) {
      elPrintRoot.appendChild(h('p', { class: 'print-empty', text: 'まだ伝票がありません。' }))
      return
    }
    list.forEach(function (s) { elPrintRoot.appendChild(buildPaper(s, false)) })
  }
  function safeName (s) { return String(s).replace(/[\\/:*?"<>|]/g, '_') }
  function doPrint (list) {
    fillPrint(list)
    if (list.length === 1) {
      var s = list[0]
      document.title = safeName('出荷伝票_' + s.date.iso + '_' + s.cname.split(/[\s\u3000]/)[0])
    } else {
      document.title = '出荷伝票_まとめて' + list.length + '枚'
    }
    printed = true
    renderSteps()
    window.print()
  }
  $('print-all').addEventListener('click', function () { if (state) doPrint(state.slips) })
  window.addEventListener('beforeprint', function () {
    if (!elPrintRoot.firstChild) fillPrint(state ? state.slips : [])
  })
  window.addEventListener('afterprint', function () {
    elPrintRoot.textContent = ''
    document.title = baseTitle
  })

  // 「③ 伝票を見る」で見出しにフォーカス
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.js-to-slips')
    if (!a) return
    e.preventDefault()
    $('h-slips').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    $('h-slips').focus({ preventScroll: true })
  })

  function renderAll () {
    renderSteps()
    renderMap()
    renderPreview()
    renderSlips()
  }

  // 検査・レビュー用に純粋な関数だけを出す（画面の動きには使わない）
  window.KohakunoCsv = { parseCSV: parseCSV, processText: processText, SAMPLE_FILE_TEXT: SAMPLE_FILE_TEXT }

  refreshDl()
  renderAll()
})()
