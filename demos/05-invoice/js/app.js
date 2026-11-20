// カフェ ユメツム（デモ）請求書の自動作成
// 外部通信なし・保存なし。明細はこのページの中だけで持ち、再読み込みで最初のデータに戻る
(function () {
  'use strict'

  var YEAR = 2026
  var MONTH = 11
  var DAYS = 30
  var MAX_ROWS = 40
  var WEEK = ['日', '月', '火', '水', '木', '金', '土']
  var FIRST_DOW = new Date(YEAR, MONTH - 1, 1).getDay() // 2026-11-01 は日曜
  var CLIENTS = [
    { key: 'A', short: '取引先A', kind: '雑貨店', name: '取引先A 雑貨店（架空）' },
    { key: 'B', short: '取引先B', kind: '書店', name: '取引先B 書店（架空）' },
    { key: 'C', short: '取引先C', kind: '花店', name: '取引先C 花店（架空）' }
  ]
  var ISSUER = {
    name: 'カフェ ユメツム',
    zip: '〒000-0000',
    addr: '（架空の住所）',
    tel: 'TEL 00-0000-0000（架空）',
    reg: 'T0000000000000'
  }

  // 初期データ（design.md §8-5。単価・金額は税抜）
  var INITIAL = [
    [2, 'C', 'フィナンシェ', 20, 200, 8],
    [4, 'A', 'マドレーヌ', 30, 180, 8],
    [4, 'A', 'フィナンシェ', 30, 200, 8],
    [4, 'A', 'ギフト箱（6個用）', 10, 120, 10],
    [6, 'B', 'クッキー缶（小）', 8, 1200, 8],
    [6, 'B', 'ギフト箱（6個用）', 8, 120, 10],
    [9, 'C', 'マドレーヌ', 25, 180, 8],
    [11, 'A', 'クッキー缶（小）', 12, 1200, 8],
    [13, 'B', 'ガレット', 37, 170, 8],
    [16, 'C', '季節のパウンドケーキ', 4, 1400, 8],
    [16, 'C', '配送料', 1, 800, 10],
    [18, 'A', 'マドレーヌ', 30, 180, 8],
    [20, 'B', 'クッキー缶（小）', 10, 1200, 8],
    [20, 'B', 'ギフト箱（6個用）', 10, 120, 10],
    [23, 'C', 'フィナンシェ', 25, 200, 8],
    [25, 'A', '季節のパウンドケーキ', 6, 1400, 8],
    [25, 'A', '紙袋', 25, 33, 10],
    [27, 'B', 'ガレット', 40, 170, 8],
    [30, 'C', 'ガレット', 15, 170, 8],
    [30, 'C', '配送料', 1, 800, 10]
  ]

  var LIMITS = {
    qty: { max: 9999, empty: '数量を入れてください', min: '1以上の数を入れてください', over: '9,999 までにしてください' },
    price: { max: 9999999, empty: '単価を入れてください', min: '1円以上で入れてください', over: '9,999,999円までにしてください' }
  }
  var FIELD_NAME = { name: '品名', qty: '数量', price: '単価' }

  var yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
  function fmt (n) { return yen.format(n).replace('￥', '¥') }

  var mqPC = window.matchMedia('(min-width: 1024px)')
  var mqSP = window.matchMedia('(max-width: 767px)')
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態 ----------
  var nextId = 1
  var rows = []
  var filter = 'all'
  var openIds = [] // スマホ・タブレットで開いている行
  var invoices = null
  var stale = false
  var selected = 0
  var summaryShown = false
  var docTitle = document.title

  function makeRows () {
    return INITIAL.map(function (r) {
      return { id: nextId++, day: r[0], client: r[1], name: r[2], qty: String(r[3]), price: String(r[4]), rate: r[5], err: {} }
    })
  }
  function cloneRows (list) {
    return list.map(function (r) { return Object.assign({}, r, { err: Object.assign({}, r.err) }) })
  }

  // ---------- 文字・日付 ----------
  function esc (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function dow (day) { return WEEK[(FIRST_DOW + day - 1) % 7] }
  function dayLabel (day) { return MONTH + '/' + String(day).padStart(2, '0') + '（' + dow(day) + '）' }
  function dayShort (day) { return MONTH + '/' + String(day).padStart(2, '0') }
  function jpDate (d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日' }
  var ISSUE_DATE = jpDate(new Date(YEAR, MONTH, 0)) // 対象月の末日
  var DUE_DATE = jpDate(new Date(YEAR, MONTH + 1, 0)) // 翌月の末日
  function clientOf (key) { return CLIENTS.filter(function (c) { return c.key === key })[0] }

  // 全角数字・カンマ・前後の空白を直す
  function normNum (s) {
    return String(s)
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
      .replace(/[－−ー‐]/g, '-')
      .replace(/．/g, '.')
      .replace(/[,，、]/g, '')
      .replace(/^[\s　]+|[\s　]+$/g, '')
  }

  // ---------- 入力チェック ----------
  function checkField (row, f) {
    if (f === 'name') return row.name.trim() === '' ? '品名を入れてください' : ''
    var lim = LIMITS[f]
    var v = normNum(row[f])
    if (v === '') return lim.empty
    if (!/^-?\d+(\.\d+)?$/.test(v)) return '数字（整数）で入れてください'
    var n = Number(v)
    if (n <= 0) return lim.min
    if (v.indexOf('.') >= 0) return '数字（整数）で入れてください'
    if (n > lim.max) return lim.over
    return ''
  }
  function rowValid (row) {
    return !checkField(row, 'name') && !checkField(row, 'qty') && !checkField(row, 'price')
  }
  function rowAmount (row) {
    if (!rowValid(row)) return null
    return Number(normNum(row.qty)) * Number(normNum(row.price))
  }
  function hasShownErr (row) { return !!(row.err.name || row.err.qty || row.err.price) }
  function allShownErrors () {
    var list = []
    rows.forEach(function (r, i) {
      ['name', 'qty', 'price'].forEach(function (f) {
        if (r.err[f]) list.push({ row: r, no: i + 1, f: f, msg: r.err[f] })
      })
    })
    return list
  }

  // ---------- SVG ----------
  var ICON_ERR = '<svg class="ico-err" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 3.6v4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="7" cy="10.2" r=".95" fill="currentColor"/></svg>'
  var ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M3 7.5l2.6 2.6L11 4.6" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  var ICON_DOC = '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M10 4h14l8 8v24H10z M24 4v8h8" fill="none" stroke="#6E625A" stroke-width="2" stroke-linejoin="round"/><path d="M15 20h12M15 25h12M15 30h8" stroke="#6E625A" stroke-width="2" stroke-linecap="round"/></svg>'
  var ICON_DOC_S = ICON_DOC.replace('width="40" height="40"', 'width="32" height="32"')
  var ICON_ARROW = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  var ICON_PRINT = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7V2h10v5M5 15H3V8h14v7h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M5 12h10v6H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  var STAMP = '<svg class="stamp" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="見本の印（このデモの請求書は見本です）">' +
    '<rect x="1.5" y="1.5" width="53" height="53" rx="4" fill="none" stroke="#B23A2E" stroke-width="3"/>' +
    '<rect x="6.5" y="6.5" width="43" height="43" rx="2" fill="none" stroke="#B23A2E" stroke-width="1"/>' +
    '<text x="28" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">見</text>' +
    '<text x="28" y="45" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">本</text>' +
    '</svg>'

  // ---------- 要素 ----------
  var $ = function (id) { return document.getElementById(id) }
  var elSheet = $('sheet')
  var elFilter = $('filter')
  var elAdd = $('add-row')
  var elReset = $('reset-rows')
  var elLimit = $('limit-note')
  var elSummary = $('err-summary')
  var elMake = $('make-btn')
  var elMakeFixed = $('make-btn-fixed')
  var elMakeReason = $('make-reason')
  var elFixed = $('fixed-cta')
  var elArea = $('invoice-area')
  var elStatus = $('sr-status')
  var elToast = $('toast')

  function announce (msg) {
    elStatus.textContent = ''
    window.setTimeout(function () { elStatus.textContent = msg }, 50)
  }
  function visibleRows () {
    return rows.filter(function (r) { return filter === 'all' || r.client === filter })
  }
  function rowNo (row) { return rows.indexOf(row) + 1 }
  function findRow (id) { return rows.filter(function (r) { return r.id === id })[0] }

  // ---------- 絞り込み ----------
  function renderFilter () {
    var opts = [{ key: 'all', label: 'すべて', n: rows.length }].concat(CLIENTS.map(function (c) {
      return { key: c.key, label: c.short, n: rows.filter(function (r) { return r.client === c.key }).length }
    }))
    elFilter.innerHTML = opts.map(function (o) {
      var on = o.key === filter
      return '<button type="button" role="radio" class="seg" data-filter="' + o.key + '" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '">' +
        '<span class="seg__label">' + o.label + '</span><span class="seg__n">' + o.n + '件</span></button>'
    }).join('')
  }
  function setFilter (key, focus) {
    filter = key
    renderFilter()
    renderSheet()
    if (focus) elFilter.querySelector('[data-filter="' + key + '"]').focus()
  }
  elFilter.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]')
    if (b) setFilter(b.getAttribute('data-filter'), true)
  })
  elFilter.addEventListener('keydown', function (e) {
    var keys = ['all', 'A', 'B', 'C']
    var i = keys.indexOf(filter)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % keys.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i + keys.length - 1) % keys.length
    else return
    e.preventDefault()
    setFilter(keys[i], true)
  })

  // ---------- 明細（共通の部品） ----------
  function dayOptions (sel) {
    var h = ''
    for (var d = 1; d <= DAYS; d++) h += '<option value="' + d + '"' + (d === sel ? ' selected' : '') + '>' + dayLabel(d) + '</option>'
    return h
  }
  function clientOptions (sel) {
    return CLIENTS.map(function (c) {
      return '<option value="' + c.key + '"' + (c.key === sel ? ' selected' : '') + '>' + c.name + '</option>'
    }).join('')
  }
  function rateOptions (sel) {
    return '<option value="8"' + (sel === 8 ? ' selected' : '') + '>8% 軽減</option><option value="10"' + (sel === 10 ? ' selected' : '') + '>10%</option>'
  }
  function errAttrs (row, f) {
    return row.err[f] ? ' aria-invalid="true" aria-describedby="e-' + row.id + '-' + f + '"' : ''
  }
  function errP (row, f) {
    var m = row.err[f]
    return '<p class="ferr" id="e-' + row.id + '-' + f + '"' + (m ? '' : ' hidden') + '>' + ICON_ERR + '<span>' + esc(m || '') + '</span></p>'
  }
  function amountText (row) {
    var a = rowAmount(row)
    return a === null ? '—' : fmt(a)
  }

  function emptyBox () {
    if (rows.length === 0) {
      return '<div class="empty-box">' + ICON_DOC_S + '<p class="empty-box__title">明細がありません</p><p class="sub">「＋ 行を追加」か「最初のデータに戻す」を押してください</p></div>'
    }
    var c = clientOf(filter)
    return '<div class="empty-box">' + ICON_DOC_S + '<p class="empty-box__title">' + c.short + ' の明細はありません</p><p class="sub"><button type="button" class="linkish" data-showall>すべて表示する</button></p></div>'
  }

  function footHTML () {
    var vis = visibleRows()
    var total = 0
    var bad = 0
    vis.forEach(function (r) {
      var a = rowAmount(r)
      if (a === null) bad++
      else total += a
    })
    var left = filter === 'all' ? rows.length + '行' : '表示中 ' + vis.length + '行（全' + rows.length + '行）'
    var label = filter === 'all' ? '税抜合計' : '表示中の税抜合計'
    return '<div class="foot"><span class="foot__rows">' + left + '</span>' +
      '<span class="foot__sum"><span class="foot__label">' + label + '</span> <strong id="sheet-total">' + fmt(total) + '</strong></span>' +
      (bad ? '<span class="foot__bad">' + ICON_ERR + 'エラーの行（' + bad + '行）は合計に入れていません</span>' : '') + '</div>'
  }

  // ---------- 明細（PC：表） ----------
  function pcRowHTML (row) {
    var no = rowNo(row)
    var bad = hasShownErr(row)
    return '<tr data-id="' + row.id + '"' + (bad ? ' class="is-err"' : '') + '>' +
      '<th scope="row" class="rownum">' + (bad ? ICON_ERR : '') + '<span>' + no + '</span></th>' +
      '<td><select id="f-' + row.id + '-day" data-f="day" aria-label="' + no + '行目の日付">' + dayOptions(row.day) + '</select></td>' +
      '<td><select id="f-' + row.id + '-client" data-f="client" aria-label="' + no + '行目の取引先">' + clientOptions(row.client) + '</select></td>' +
      '<td class="cell-in"><input type="text" id="f-' + row.id + '-name" data-f="name" maxlength="30" value="' + esc(row.name) + '" aria-label="' + no + '行目の品名"' + errAttrs(row, 'name') + '>' + errP(row, 'name') + '</td>' +
      '<td class="cell-in num"><input type="text" inputmode="numeric" id="f-' + row.id + '-qty" data-f="qty" value="' + esc(row.qty) + '" aria-label="' + no + '行目の数量"' + errAttrs(row, 'qty') + '>' + errP(row, 'qty') + '</td>' +
      '<td class="cell-in num"><input type="text" inputmode="numeric" id="f-' + row.id + '-price" data-f="price" value="' + esc(row.price) + '" aria-label="' + no + '行目の単価"' + errAttrs(row, 'price') + '>' + errP(row, 'price') + '</td>' +
      '<td><select id="f-' + row.id + '-rate" data-f="rate" aria-label="' + no + '行目の税率">' + rateOptions(row.rate) + '</select></td>' +
      '<td class="amt"><output data-amt="' + row.id + '">' + amountText(row) + '</output></td>' +
      '<td class="del-cell"><button type="button" class="del" data-del="' + row.id + '" aria-label="' + no + '行目を削除">削除</button></td>' +
      '</tr>'
  }
  function renderPC () {
    var vis = visibleRows()
    var cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    var body = vis.length
      ? vis.map(pcRowHTML).join('')
      : '<tr class="empty-row"><td colspan="9">' + emptyBox() + '</td></tr>'
    elSheet.innerHTML = '<div class="sheet-wrap"><table class="sheet">' +
      '<colgroup><col class="c-no"><col class="c-day"><col class="c-client"><col class="c-name"><col class="c-qty"><col class="c-price"><col class="c-rate"><col class="c-amt"><col class="c-del"></colgroup>' +
      '<thead><tr class="sheet__cols" aria-hidden="true"><td></td>' + cols.map(function (c) { return '<td>' + c + '</td>' }).join('') + '<td></td></tr>' +
      '<tr class="sheet__head"><th scope="col"><span class="visually-hidden">行</span></th><th scope="col">日付</th><th scope="col">取引先</th><th scope="col">品名</th>' +
      '<th scope="col" class="num">数量</th><th scope="col" class="num">単価</th><th scope="col">税率</th><th scope="col" class="num">金額</th><th scope="col"><span class="visually-hidden">削除</span></th></tr></thead>' +
      '<tbody>' + body + '</tbody>' +
      '<tfoot><tr><td colspan="9" id="sheet-foot">' + footHTML() + '</td></tr></tfoot></table></div>'
  }

  // ---------- 明細（スマホ・タブレット：行カード） ----------
  function cardRowHTML (row) {
    var no = rowNo(row)
    var c = clientOf(row.client)
    var bad = hasShownErr(row)
    if (openIds.indexOf(row.id) < 0) {
      var qtyTxt = normNum(row.qty) || '—'
      var priceN = normNum(row.price)
      var priceTxt = /^\d+$/.test(priceN) ? fmt(Number(priceN)) : (priceN || '—')
      return '<li class="rc' + (bad ? ' is-err' : '') + '" data-id="' + row.id + '">' +
        '<div class="rc__l1"><span class="rc__no">' + no + '</span><span class="rc__meta">' + dayLabel(row.day) + '・' + c.short + ' ' + c.kind + '</span>' +
        (bad ? '<span class="rc__flag">' + ICON_ERR + '要修正</span>' : '') +
        '<span class="rc__amt">' + amountText(row) + '</span></div>' +
        '<p class="rc__name">' + (row.name.trim() ? esc(row.name) : '<span class="sub">（品名なし）</span>') + '</p>' +
        '<div class="rc__l3"><span class="rc__calc">' + esc(qtyTxt) + ' × ' + esc(priceTxt) + ' ・ ' + (row.rate === 8 ? '8%軽減' : '10%') + '</span>' +
        '<button type="button" class="rc__edit" data-edit="' + row.id + '" aria-expanded="false" aria-label="' + no + '行目を編集">編集' + ICON_ARROW + '</button></div>' +
        '</li>'
    }
    function fld (f, label, input) {
      return '<div class="fld fld--' + f + '"><label for="f-' + row.id + '-' + f + '">' + label + '</label>' + input + (f === 'name' || f === 'qty' || f === 'price' ? errP(row, f) : '') + '</div>'
    }
    return '<li class="rc is-open' + (bad ? ' is-err' : '') + '" data-id="' + row.id + '">' +
      '<div class="rc__head"><p class="rc__title" tabindex="-1" id="rc-' + row.id + '-title">' + no + '行目を編集</p>' +
      '<button type="button" class="rc__close" data-close="' + row.id + '" aria-expanded="true">閉じる</button></div>' +
      fld('day', '日付', '<select id="f-' + row.id + '-day" data-f="day">' + dayOptions(row.day) + '</select>') +
      fld('client', '取引先', '<select id="f-' + row.id + '-client" data-f="client">' + clientOptions(row.client) + '</select>') +
      fld('name', '品名', '<input type="text" id="f-' + row.id + '-name" data-f="name" maxlength="30" value="' + esc(row.name) + '"' + errAttrs(row, 'name') + '>') +
      '<div class="rc__grid">' +
      fld('qty', '数量', '<input type="text" inputmode="numeric" id="f-' + row.id + '-qty" data-f="qty" value="' + esc(row.qty) + '"' + errAttrs(row, 'qty') + '>') +
      fld('price', '単価', '<input type="text" inputmode="numeric" id="f-' + row.id + '-price" data-f="price" value="' + esc(row.price) + '"' + errAttrs(row, 'price') + '>') +
      fld('rate', '税率', '<select id="f-' + row.id + '-rate" data-f="rate">' + rateOptions(row.rate) + '</select>') +
      '</div>' +
      '<div class="rc__amount"><span>金額</span><output data-amt="' + row.id + '">' + amountText(row) + '</output></div>' +
      '<button type="button" class="del-wide" data-del="' + row.id + '">この行を削除</button>' +
      '</li>'
  }
  function renderCards () {
    var vis = visibleRows()
    elSheet.innerHTML = (vis.length ? '<ul class="rcards">' + vis.map(cardRowHTML).join('') + '</ul>' : emptyBox()) +
      '<div class="rc-foot" id="sheet-foot">' + footHTML() + '</div>'
  }

  function renderSheet () {
    if (mqPC.matches) renderPC()
    else renderCards()
    updateControls()
  }
  function updateFoot () {
    var f = $('sheet-foot')
    if (f) f.innerHTML = footHTML()
  }
  function updateRowView (row) {
    var out = elSheet.querySelector('[data-amt="' + row.id + '"]')
    if (out) out.textContent = amountText(row)
    ;['name', 'qty', 'price'].forEach(function (f) {
      var inp = $('f-' + row.id + '-' + f)
      var p = $('e-' + row.id + '-' + f)
      if (!inp || !p) return
      if (row.err[f]) {
        inp.setAttribute('aria-invalid', 'true')
        inp.setAttribute('aria-describedby', p.id)
        p.querySelector('span').textContent = row.err[f]
        p.hidden = false
      } else {
        inp.removeAttribute('aria-invalid')
        inp.removeAttribute('aria-describedby')
        p.hidden = true
      }
    })
    var tr = elSheet.querySelector('[data-id="' + row.id + '"]')
    if (tr) {
      var bad = hasShownErr(row)
      tr.classList.toggle('is-err', bad)
      var th = tr.querySelector('.rownum')
      if (th) th.innerHTML = (bad ? ICON_ERR : '') + '<span>' + rowNo(row) + '</span>'
    }
    updateFoot()
  }

  // ---------- 明細の操作 ----------
  elSheet.addEventListener('input', function (e) {
    var t = e.target
    var f = t.getAttribute('data-f')
    if (!f) return
    var row = findRow(Number(t.closest('[data-id]').getAttribute('data-id')))
    if (f === 'day' || f === 'rate') row[f] = Number(t.value)
    else row[f] = t.value
    if (f === 'client') renderFilter()
    if (row.err[f]) row.err[f] = checkField(row, f) // 直した瞬間に消す
    updateRowView(row)
    if (summaryShown) renderSummary(false)
    markChanged()
  })
  elSheet.addEventListener('focusout', function (e) {
    var t = e.target
    var f = t.getAttribute && t.getAttribute('data-f')
    if (f !== 'name' && f !== 'qty' && f !== 'price') return
    var li = t.closest('[data-id]')
    if (!li) return
    var row = findRow(Number(li.getAttribute('data-id')))
    if (!row) return
    if (f !== 'name') {
      var n = normNum(t.value)
      if (n !== t.value) { t.value = n; row[f] = n; markChanged() }
    }
    row.err[f] = checkField(row, f)
    updateRowView(row)
    if (summaryShown) renderSummary(false)
  })
  elSheet.addEventListener('click', function (e) {
    var b = e.target.closest('button')
    if (!b) return
    if (b.hasAttribute('data-del')) deleteRow(Number(b.getAttribute('data-del')))
    else if (b.hasAttribute('data-edit')) openRow(Number(b.getAttribute('data-edit')))
    else if (b.hasAttribute('data-close')) closeRow(Number(b.getAttribute('data-close')))
    else if (b.hasAttribute('data-showall')) setFilter('all', true)
  })

  function openRow (id) {
    // 開けるのは1行だけ。ただしエラーのある行は閉じない
    openIds = openIds.filter(function (o) { var r = findRow(o); return r && hasShownErr(r) })
    if (openIds.indexOf(id) < 0) openIds.push(id)
    renderSheet()
    var t = $('rc-' + id + '-title')
    if (t) t.focus()
  }
  function closeRow (id) {
    openIds = openIds.filter(function (o) { return o !== id })
    renderSheet()
    var b = elSheet.querySelector('[data-edit="' + id + '"]')
    if (b) b.focus()
  }

  function deleteRow (id) {
    var snap = snapshot()
    var row = findRow(id)
    var no = rowNo(row)
    var visBefore = visibleRows()
    var vi = visBefore.indexOf(row)
    rows = rows.filter(function (r) { return r !== row })
    openIds = openIds.filter(function (o) { return o !== id })
    afterRowsChanged()
    var vis = visibleRows()
    var next = vis[Math.min(vi, vis.length - 1)]
    var target = next && elSheet.querySelector('[data-del="' + next.id + '"], [data-edit="' + next.id + '"]')
    ;(target || elAdd).focus()
    showToast(no + '行目を削除しました', snap)
  }

  function addRow () {
    if (rows.length >= MAX_ROWS) { announce('行は40行までです（デモの上限）'); return }
    var last = rows[rows.length - 1]
    var row = {
      id: nextId++,
      day: last ? last.day : 1,
      client: filter !== 'all' ? filter : (last ? last.client : 'A'),
      name: '', qty: '', price: '', rate: 8, err: {}
    }
    rows.push(row)
    openIds = openIds.filter(function (o) { var r = findRow(o); return r && hasShownErr(r) })
    openIds.push(row.id)
    afterRowsChanged()
    var inp = $('f-' + row.id + '-name')
    if (inp) inp.focus()
    announce(rowNo(row) + '行目を追加しました')
  }

  function resetRows () {
    var snap = snapshot()
    rows = makeRows()
    filter = 'all'
    openIds = []
    afterRowsChanged()
    showToast('最初のデータに戻しました', snap)
  }

  function snapshot () { return { rows: cloneRows(rows), filter: filter } }
  function restore (snap) {
    rows = cloneRows(snap.rows)
    filter = snap.filter
    openIds = []
    afterRowsChanged()
  }
  function afterRowsChanged () {
    renderFilter()
    renderSheet()
    if (summaryShown) renderSummary(false)
    markChanged()
  }

  elAdd.addEventListener('click', addRow)
  elReset.addEventListener('click', resetRows)

  function updateControls () {
    var full = rows.length >= MAX_ROWS
    elAdd.setAttribute('aria-disabled', String(full))
    elAdd.classList.toggle('is-disabled', full)
    elLimit.hidden = !full
    var none = rows.length === 0
    var n = CLIENTS.filter(function (c) { return rows.some(function (r) { return r.client === c.key }) }).length
    ;[elMake, elMakeFixed].forEach(function (b) {
      b.setAttribute('aria-disabled', String(none))
      b.classList.toggle('is-disabled', none)
      b.querySelector('.make-label').textContent = '請求書を作る（' + n + '社分）'
    })
    elMakeReason.hidden = !none
  }

  // ---------- エラーのまとめ ----------
  function renderSummary (focus) {
    var list = allShownErrors()
    if (!list.length) {
      elSummary.hidden = true
      elSummary.innerHTML = ''
      summaryShown = false
      return
    }
    summaryShown = true
    elSummary.hidden = false
    elSummary.innerHTML = '<p class="err-summary__title">' + ICON_ERR + '入力を直してください（' + list.length + 'か所）</p><ul>' +
      list.map(function (x) {
        return '<li><a href="#f-' + x.row.id + '-' + x.f + '" data-goto="' + x.row.id + '" data-gf="' + x.f + '">' + x.no + '行目の' + FIELD_NAME[x.f] + '：' + esc(x.msg) + '</a></li>'
      }).join('') + '</ul>'
    if (focus) elSummary.focus()
  }
  elSummary.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goto]')
    if (!a) return
    e.preventDefault()
    var id = Number(a.getAttribute('data-goto'))
    var f = a.getAttribute('data-gf')
    var row = findRow(id)
    if (filter !== 'all' && row.client !== filter) { filter = 'all'; renderFilter() }
    if (!mqPC.matches && openIds.indexOf(id) < 0) openIds.push(id)
    renderSheet()
    var inp = $('f-' + id + '-' + f)
    if (inp) inp.focus()
  })

  // ---------- 請求書を作る ----------
  function buildInvoices () {
    var list = []
    CLIENTS.forEach(function (c) {
      var items = rows
        .map(function (r, i) { return { r: r, i: i } })
        .filter(function (x) { return x.r.client === c.key })
        .sort(function (a, b) { return a.r.day - b.r.day || a.i - b.i })
        .map(function (x) {
          var q = Number(normNum(x.r.qty))
          var p = Number(normNum(x.r.price))
          return { day: x.r.day, name: x.r.name.trim(), qty: q, price: p, rate: x.r.rate, amount: q * p }
        })
      if (!items.length) return
      var sub10 = 0
      var sub8 = 0
      items.forEach(function (it) { if (it.rate === 10) sub10 += it.amount; else sub8 += it.amount })
      // 消費税は請求書ごと・税率ごとに1回だけ切り捨て
      var tax10 = Math.floor(sub10 * 10 / 100)
      var tax8 = Math.floor(sub8 * 8 / 100)
      list.push({
        client: c,
        no: YEAR + '-' + String(MONTH).padStart(2, '0') + '-' + String(list.length + 1).padStart(3, '0'),
        items: items,
        has10: items.some(function (it) { return it.rate === 10 }),
        has8: items.some(function (it) { return it.rate === 8 }),
        sub10: sub10, tax10: tax10, sub8: sub8, tax8: tax8,
        total: sub10 + tax10 + sub8 + tax8
      })
    })
    return list
  }

  function generate () {
    if (rows.length === 0) { announce('明細が1行もありません'); return }
    rows.forEach(function (r) {
      r.err = { name: checkField(r, 'name'), qty: checkField(r, 'qty'), price: checkField(r, 'price') }
    })
    var errs = allShownErrors()
    if (errs.length) {
      if (!mqPC.matches) {
        rows.forEach(function (r) { if (hasShownErr(r) && openIds.indexOf(r.id) < 0) openIds.push(r.id) })
      }
      renderSheet()
      renderSummary(false)
      elSummary.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
      elSummary.focus({ preventScroll: true })
      return
    }
    renderSheet()
    renderSummary(false)
    invoices = buildInvoices()
    stale = false
    selected = 0
    renderInvoices()
    updateSteps()
    var h = $('h-invoices')
    h.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
    announce(invoices.length + '社分の請求書を作りました')
  }
  elMake.addEventListener('click', generate)
  elMakeFixed.addEventListener('click', generate)

  function markChanged () {
    if (invoices && !stale) {
      stale = true
      renderInvoices()
      updateSteps()
    }
  }

  // ---------- 請求書の表示 ----------
  function paperHTML (inv, i) {
    var c = inv.client
    var items = inv.items.map(function (it) {
      var r8 = it.rate === 8
      return '<tr><td class="it-day" data-label="日付">' + dayShort(it.day) + '</td>' +
        '<td class="it-name" data-label="品名">' + esc(it.name) + (r8 ? ' ※' : '') + '</td>' +
        '<td class="it-qty num" data-label="数量">' + it.qty.toLocaleString('ja-JP') + '</td>' +
        '<td class="it-price num" data-label="単価">' + fmt(it.price) + '</td>' +
        '<td class="it-rate num" data-label="税率">' + (r8 ? '8%※' : '10%') + '</td>' +
        '<td class="it-amt num" data-label="金額">' + fmt(it.amount) + '</td></tr>'
    }).join('')
    var tot = ''
    if (inv.has10) tot += '<tr><th scope="row">10%対象 小計</th><td>' + fmt(inv.sub10) + '</td></tr><tr class="tax"><th scope="row">消費税（10%）</th><td>' + fmt(inv.tax10) + '</td></tr>'
    if (inv.has8) tot += '<tr><th scope="row">8%対象 小計 ※</th><td>' + fmt(inv.sub8) + '</td></tr><tr class="tax"><th scope="row">消費税（8%）</th><td>' + fmt(inv.tax8) + '</td></tr>'
    tot += '<tr class="grand"><th scope="row">合計（税込）</th><td>' + fmt(inv.total) + '</td></tr>'

    return '<article class="paper' + (stale ? ' is-stale' : '') + '" role="tabpanel" id="inv-panel-' + i + '" aria-labelledby="inv-tab-' + i + '" tabindex="0"' + (i === selected ? '' : ' hidden') + '>' +
      '<h3 class="p-title">請求書</h3>' +
      '<dl class="p-meta"><div><dt>請求番号</dt><dd>' + inv.no + '</dd></div><div><dt>請求日</dt><dd>' + ISSUE_DATE + '</dd></div></dl>' +
      '<div class="p-parties">' +
        '<div class="p-to"><p class="p-to__name"><span class="p-to__co">' + c.name + '</span><span class="p-to__hon">御中</span></p><p class="p-to__lead">下記のとおりご請求申し上げます。</p></div>' +
        '<div class="p-from"><p class="p-from__name">' + ISSUER.name + '</p>' + STAMP +
          '<p>' + ISSUER.zip + '</p><p>' + ISSUER.addr + '</p><p>' + ISSUER.tel + '</p><p class="p-from__reg">登録番号 ' + ISSUER.reg + '</p></div>' +
      '</div>' +
      '<table class="amount"><tbody>' +
        '<tr><th scope="row">ご請求金額<small>（税込）</small></th><td class="amount__val">' + fmt(inv.total) + '</td></tr>' +
        '<tr><th scope="row">お支払期日</th><td class="amount__due">' + DUE_DATE + '</td></tr>' +
      '</tbody></table>' +
      '<p class="p-month">取引年月：' + YEAR + '年' + MONTH + '月</p>' +
      '<table class="items"><thead><tr><th scope="col">日付</th><th scope="col">品名</th><th scope="col" class="num">数量</th><th scope="col" class="num">単価</th><th scope="col" class="num">税率</th><th scope="col" class="num">金額</th></tr></thead>' +
      '<tbody>' + items + '</tbody></table>' +
      '<p class="p-note">※は軽減税率（8%）の対象です。単価・金額は税抜です。</p>' +
      '<div class="totals"><table class="totals__table"><tbody>' + tot + '</tbody></table>' +
      '<p class="p-note">消費税は、税率ごとに合計した金額から計算し、1円未満を切り捨てています。</p></div>' +
      '<dl class="bank"><div><dt>お振込先</dt><dd>（架空の口座）〇〇銀行 〇〇支店 普通 0000000<br>口座名義 カフェ ユメツム<br>振込手数料はご負担をお願いいたします。</dd></div>' +
      '<div><dt>備考</dt><dd>' + MONTH + '月分の焼き菓子の納品代金です。</dd></div></dl>' +
      '<p class="p-foot">この請求書は TENKA LAB の制作見本です。お店・取引先・登録番号・住所・口座はすべて架空です。</p>' +
      '</article>'
  }

  function renderInvoices () {
    if (!invoices) {
      elArea.innerHTML = '<div class="desk desk--empty"><div class="paper-empty">' + ICON_DOC +
        '<p class="paper-empty__title">まだ請求書はありません</p>' +
        '<p class="sub">上の「請求書を作る」を押すと、取引先ごとにできあがります</p>' +
        '<p class="sub"><a href="#details">① 明細へ戻る</a></p></div></div>'
      return
    }
    var sum = invoices.reduce(function (s, v) { return s + v.total }, 0)
    var missing = CLIENTS.filter(function (c) { return !invoices.some(function (v) { return v.client === c }) })
    var cur = invoices[selected]
    var tabs = invoices.map(function (inv, i) {
      var on = i === selected
      return '<button type="button" role="tab" class="inv-tab" id="inv-tab-' + i + '" aria-controls="inv-panel-' + i + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-tab="' + i + '">' +
        '<span class="inv-tab__name">' + inv.client.short + '<span class="inv-tab__kind"> ' + inv.client.kind + '</span></span>' +
        '<span class="inv-tab__no">' + inv.no + '</span>' +
        '<span class="inv-tab__amt">' + fmt(inv.total) + '</span></button>'
    }).join('')
    elArea.innerHTML = '<div class="inv-layout">' +
      '<div class="inv-side">' +
        '<p class="inv-side__title">作成した請求書 ' + invoices.length + '件</p>' +
        '<div class="invoice-tabs" role="tablist" aria-label="作成した請求書" style="--tabs:' + invoices.length + '">' + tabs + '</div>' +
        '<p class="inv-sum"><span>' + invoices.length + '社の合計（税込）</span> <strong>' + fmt(sum) + '</strong></p>' +
        missing.map(function (c) { return '<p class="sub inv-missing">' + c.name + 'は' + MONTH + '月の明細がないため、作っていません</p>' }).join('') +
      '</div>' +
      '<div class="inv-main">' +
        (stale ? '<div class="stale-band" role="status"><p>明細が変わりました。この請求書は前の内容のままです。</p><button type="button" class="btn-sub" id="regen">請求書を作り直す</button></div>' : '') +
        '<div class="invoice-toolbar">' +
          '<div class="print-wrap"><button type="button" class="btn-main btn-main--print' + (stale ? ' is-disabled' : '') + '" id="print-btn" aria-disabled="' + stale + '"' + (stale ? ' aria-describedby="print-reason"' : '') + '>' + ICON_PRINT + '印刷・PDFで保存</button>' +
          '<span class="print-target" id="print-target">（' + cur.client.short + ' の1枚）</span>' +
          (stale ? '<p class="disabled-reason" id="print-reason">作り直してから印刷できます</p>' : '') + '</div>' +
          '<p class="print-note">PDF にするには、印刷の画面で送信先を「PDF に保存」にします。きれいに出すには「ヘッダーとフッター」をオフにしてください。</p>' +
        '</div>' +
        '<div class="desk">' + invoices.map(paperHTML).join('') + '</div>' +
      '</div></div>'
  }

  function selectTab (i, focus) {
    selected = i
    elArea.querySelectorAll('.inv-tab').forEach(function (t, k) {
      var on = k === i
      t.setAttribute('aria-selected', String(on))
      t.tabIndex = on ? 0 : -1
    })
    elArea.querySelectorAll('.paper').forEach(function (p, k) { p.hidden = k !== i })
    var pt = $('print-target')
    if (pt) pt.textContent = '（' + invoices[i].client.short + ' の1枚）'
    if (focus) $('inv-tab-' + i).focus()
  }

  elArea.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]')
    if (t) { selectTab(Number(t.getAttribute('data-tab')), false); return }
    var b = e.target.closest('button')
    if (!b) return
    if (b.id === 'regen') {
      generate()
    } else if (b.id === 'print-btn') {
      if (stale) { announce('作り直してから印刷できます'); return }
      selectTab(selected, false) // 印刷するのは表示中の1枚だけ
      window.print()
    }
  })
  elArea.addEventListener('keydown', function (e) {
    if (!e.target.classList.contains('inv-tab')) return
    var n = invoices.length
    var i = selected
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i + n - 1) % n
    else if (e.key === 'Home') i = 0
    else if (e.key === 'End') i = n - 1
    else return
    e.preventDefault()
    selectTab(i, true)
  })

  // PDF 保存のファイル名の候補にする
  window.addEventListener('beforeprint', function () {
    if (invoices && invoices[selected]) document.title = '請求書_' + invoices[selected].no + '_' + invoices[selected].client.short
  })
  window.addEventListener('afterprint', function () { document.title = docTitle })

  // ---------- 手順表示 ----------
  function updateSteps () {
    var made = !!invoices && !stale
    var state = made ? ['done', 'done', 'current'] : (invoices ? ['done', 'current', ''] : ['current', '', ''])
    document.querySelectorAll('.step').forEach(function (li, i) {
      var a = li.querySelector('a')
      var num = li.querySelector('.step__num')
      li.classList.toggle('is-done', state[i] === 'done')
      li.classList.toggle('is-current', state[i] === 'current')
      if (state[i] === 'current') a.setAttribute('aria-current', 'step')
      else a.removeAttribute('aria-current')
      num.innerHTML = state[i] === 'done' ? ICON_CHECK : String(i + 1)
    })
  }

  // ---------- 知らせ（元に戻す） ----------
  var toastTimer = null
  var toastSnap = null
  var toastHold = false
  function showToast (text, snap) {
    toastSnap = snap
    $('toast-text').textContent = text
    elToast.hidden = false
    elToast.classList.remove('is-in')
    void elToast.offsetWidth
    elToast.classList.add('is-in')
    armToast()
  }
  function armToast () {
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { if (!toastHold) hideToast() }, 6000)
  }
  function hideToast () {
    window.clearTimeout(toastTimer)
    elToast.hidden = true
    toastSnap = null
  }
  elToast.addEventListener('mouseenter', function () { toastHold = true })
  elToast.addEventListener('mouseleave', function () { toastHold = false; armToast() })
  elToast.addEventListener('focusin', function () { toastHold = true })
  elToast.addEventListener('focusout', function () { toastHold = false; armToast() })
  $('toast-undo').addEventListener('click', function () {
    if (!toastSnap) return
    var s = toastSnap
    hideToast()
    toastHold = false
    restore(s)
    announce('元に戻しました')
    elAdd.focus()
  })

  // ---------- スマホの固定ボタン ----------
  var cardSeen = false
  var btnSeen = false
  function updateFixed () {
    var show = mqSP.matches && cardSeen && !btnSeen
    elFixed.hidden = !show
    document.body.classList.toggle('has-fixed', show)
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.target.id === 'details') cardSeen = en.isIntersecting
        else btnSeen = en.isIntersecting
      })
      updateFixed()
    }).observe($('details'))
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (en) { btnSeen = en.isIntersecting })
      updateFixed()
    })
    io2.observe(elMake)
  }

  // ---------- 画面幅の切り替え ----------
  function onMQ (mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn)
    else mq.addListener(fn)
  }
  onMQ(mqPC, function () { openIds = []; renderSheet() })
  onMQ(mqSP, updateFixed)

  // ---------- 開始 ----------
  rows = makeRows()
  renderFilter()
  renderSheet()
  renderInvoices()
  updateSteps()
})()
