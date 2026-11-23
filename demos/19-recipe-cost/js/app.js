// 洋食 ミナトビ（デモ）メニューの原価計算と値付け
// 表示する値はすべて textContent / setAttribute / createElement(NS) で入れる（HTML の文字列を流し込む書き方は使わない）
// 金額は内部ですべて整数（0.01円＝1）。割り算は最後に1回だけ（design.md §11）
// 入力欄は最初に1回だけ作り、描き直しでは文字の所だけ書き換える（フォーカスと打っている途中の文字を守る。§8-2・§13-3）
(function () {
  'use strict'

  // ---------- 定数（design.md §13-1・§20） ----------
  var KEY = 'tenkaLab.demo19.recipeCost.v1'
  var TEST_KEY = 'tenkaLab.demo19.test'
  var SHOP = '洋食 ミナトビ'
  var CSV_NAME = 'minatobi_genka_kakuu-demo.csv'
  var PRINT_TITLE = 'minatobi_genka_架空デモ'
  var CAP = 1000000000 // 1皿の原価の上限（0.01円単位。＝1,000万円。§11-7）
  var ING = [
    { id: 'F01', name: '玉ねぎ', unit: 'g', q: 1000, p: 300, y: 90 },
    { id: 'F02', name: '合いびき肉', unit: 'g', q: 1000, p: 1200, y: 100 },
    { id: 'F03', name: '卵', unit: '個', q: 10, p: 300, y: 100 },
    { id: 'F04', name: '米', unit: 'g', q: 5000, p: 2000, y: 100 },
    { id: 'F05', name: 'デミグラスソース', unit: 'g', q: 3000, p: 2400, y: 100 },
    { id: 'F06', name: '生クリーム', unit: 'ml', q: 1000, p: 900, y: 100 },
    { id: 'F07', name: '牛すね肉', unit: 'g', q: 1000, p: 2400, y: 80 },
    { id: 'F08', name: 'エビ（殻つき）', unit: 'g', q: 1000, p: 3200, y: 80 },
    { id: 'F09', name: 'スパゲッティ', unit: 'g', q: 1000, p: 400, y: 100 },
    { id: 'F10', name: 'トマトケチャップ', unit: 'g', q: 1000, p: 450, y: 100 },
    { id: 'F11', name: 'パン粉', unit: 'g', q: 1000, p: 500, y: 100 },
    { id: 'F12', name: '鶏もも肉', unit: 'g', q: 1000, p: 1000, y: 95 }
  ]
  // レシピの使う量は 0.1 単位の整数（180g → 1800、2個 → 20）。並びは表の順
  var MENU = [
    { id: 'M1', name: 'ハンバーグ定食', price: 1280, recipe: [['F02', 1800], ['F01', 600], ['F11', 100], ['F05', 800], ['F04', 1000]] },
    { id: 'M2', name: 'オムライス', price: 980, recipe: [['F03', 20], ['F04', 1500], ['F12', 500], ['F01', 300], ['F10', 400], ['F06', 100]] },
    { id: 'M3', name: 'ナポリタン', price: 880, recipe: [['F09', 1200], ['F01', 400], ['F10', 600], ['F12', 400]] },
    { id: 'M4', name: 'エビフライ', price: 1480, recipe: [['F08', 1200], ['F03', 10], ['F11', 200]] },
    { id: 'M5', name: 'ビーフシチュー', price: 1680, recipe: [['F07', 1500], ['F05', 1500], ['F01', 800], ['F06', 100]] },
    { id: 'M6', name: 'プリン', price: 420, recipe: [['F03', 10], ['F06', 600]] }
  ]
  function own (o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
  var ING_BY_ID = {}; ING.forEach(function (f) { ING_BY_ID[f.id] = f })
  var MENU_BY_ID = {}; MENU.forEach(function (m) { MENU_BY_ID[m.id] = m })
  function menusOf (fid) { return MENU.filter(function (m) { return m.recipe.some(function (r) { return r[0] === fid }) }) }

  // ---------- 整数の割り算（0.5 以上を切り上げ・切り上げ）。商と余りで出し、小数の誤差に頼らない ----------
  function qr (n, d) {
    var q = Math.floor(n / d); var r = n - q * d
    if (r < 0) { q--; r += d } else if (r >= d) { q++; r -= d }
    return [q, r]
  }
  function divRound (n, d) {
    if (n < 0) return -divRound(-n, d)
    var a = qr(n, d)
    return 2 * a[1] >= d ? a[0] + 1 : a[0]
  }
  function divCeil (n, d) { var a = qr(n, d); return a[1] > 0 ? a[0] + 1 : a[0] }

  // ---------- 計算（§11。状態を引数で受ける純粋な関数） ----------
  // 食材1行の原価（0.01円単位）。表示用の「使える量あたり」は使わない（§11-1）
  function lineSen (use10, f) { return divRound(use10 * f.p * 1000, f.q * f.y) }
  function costSen (st, mid) {
    var m = MENU_BY_ID[mid]; var s = 0
    m.recipe.forEach(function (r) { s += lineSen(st.use[mid][r[0]], st.ing[r[0]]) })
    return s
  }
  function ratio10 (sen, price) { return divRound(sen * 11, price) } // 0.1% 単位
  function isOver (r10, t) { return r10 > t * 10 } // 表示の原価率で比べる（30.0% は目標 30% で目標内）
  function profitYen (sen, price) { return divRound(price * 1000 - 11 * sen, 1100) }
  // 目安の売値：原価率（四捨五入の前）が目標以下になる、いちばん安い10円単位の売値（切り上げ）。
  // 目標超え（表示の原価率で判定）なら、目安は必ずいまの売値より高い。
  // 逆に、四捨五入の前が目標を少し超え、表示が目標ちょうど（例 30.0%）の時は「目標内」で、目安はいまの売値より10円以上高くなる
  function suggestYen (sen, t) { return 10 * divCeil(11 * sen, 100 * t) }
  function senYen (sen) { return divRound(sen, 100) }
  function calc (st, mid) {
    var m = MENU_BY_ID[mid]
    var sen = costSen(st, mid)
    var r = ratio10(sen, m.price)
    var sug = suggestYen(sen, st.target)
    return { id: mid, sen: sen, yen: senYen(sen), r10: r, over: isOver(r, st.target), profit: profitYen(sen, m.price), suggest: sug, diff: sug - m.price, raise: isOver(r, st.target) } // 値上げの案は一覧の「目標超え」と同じ判定
  }
  function calcAll (st) { return MENU.map(function (m) { return calc(st, m.id) }) }
  function overCap (st) { return MENU.some(function (m) { return costSen(st, m.id) > CAP }) }

  // ---------- 書き方（§2-3。関数1つずつ） ----------
  var MINUS = '−'
  function yen (n) { return (n < 0 ? MINUS : '') + Math.abs(n).toLocaleString('ja-JP') + '円' }
  function sen2 (s) { return Math.floor(s / 100).toLocaleString('ja-JP') + '.' + String(s % 100).padStart(2, '0') }
  function yen2 (s) { return sen2(s) + '円' }
  function pct (r) { return Math.floor(r / 10).toLocaleString('ja-JP') + '.' + (r % 10) + '%' }
  function dyen (n) { return n > 0 ? '+' + yen(n) : n < 0 ? MINUS + yen(-n) : '±0円' }
  function dpt (d) { var a = Math.abs(d); var s = Math.floor(a / 10) + '.' + (a % 10) + 'ポイント'; return d > 0 ? '+' + s : d < 0 ? MINUS + s : '±' + s }
  function num10 (u10) { return u10 % 10 === 0 ? (u10 / 10).toLocaleString('ja-JP') : Math.floor(u10 / 10).toLocaleString('ja-JP') + '.' + (u10 % 10) }
  function qty (u10, unit) { return num10(u10) + unit }
  // 使える量あたり（表示だけ。計算には使わない。§11-1）
  function unitPrice (fid, f) { return yen2(divRound(f.p * 10000, f.q * f.y)) + '／' + ING_BY_ID[fid].unit }
  function chgPct (a, b) { var d = divRound(Math.abs(b - a) * 1000, a); var s = Math.floor(d / 10) + '.' + (d % 10) + '%'; return b > a ? '+' + s : b < a ? MINUS + s : '±' + s }

  // ---------- 入力の読み取りと検証（§12） ----------
  function norm (s) { return String(s).trim().normalize('NFKC').trim().replace(/,/g, '') }
  // 戻り値 { v } か { e: 'empty' | 'form' | 'big' }
  function parseInt10 (text, min, max) {
    var s = norm(text)
    if (s === '') return { e: 'empty' }
    if (!/^\d+$/.test(s)) return { e: 'form' }
    var v = Number(s)
    if (v < min) return { e: 'form' }
    if (v > max) return { e: 'big' }
    return { v: v }
  }
  // 使う量（小数1桁まで）→ 0.1 単位の整数
  function parseUse10 (text) {
    var s = norm(text)
    if (s === '') return { e: 'empty' }
    if (!/^\d+(\.\d)?$/.test(s)) return { e: 'form' }
    var p = s.split('.')
    var v = Number(p[0]) * 10 + (p[1] ? Number(p[1]) : 0)
    if (v < 1) return { e: 'form' }
    if (v > 100000) return { e: 'big' }
    return { v: v }
  }
  var SPEC = {
    p: { min: 1, max: 1000000, empty: '仕入れ値を入れてください', form: '仕入れ値は 1円以上の整数で入れてください', big: '仕入れ値は 1,000,000円までにしてください', label: '仕入れ値', unit: '円' },
    q: { min: 1, max: 100000, empty: '仕入れの量を入れてください', form: '仕入れの量は 1以上の整数で入れてください', big: '仕入れの量は 100,000 までにしてください', label: '仕入れの量' },
    y: { min: 1, max: 100, empty: '歩留まりを入れてください', form: '歩留まりは 1〜100 の整数で入れてください', big: '歩留まりは 100% までにしてください', label: '歩留まり', unit: '%' },
    use: { empty: '使う量を入れてください', form: '使う量は 0.1 以上の数で入れてください（小数は1桁まで）', big: '使う量は 10,000 までにしてください', label: '使う量' },
    t: { min: 10, max: 60, empty: '目標の原価率を入れてください', form: '目標の原価率は 10〜60 の整数で入れてください', big: '目標の原価率は 10〜60 の整数で入れてください', label: '目標の原価率', unit: '%' }
  }
  var CAP_MSG = 'この値だと1皿の原価が 1,000万円を超えるため、受け付けません'
  function parseField (kind, text) { return kind === 'use' ? parseUse10(text) : parseInt10(text, SPEC[kind].min, SPEC[kind].max) }

  // ---------- 保存の検証（§13-2）。通れば新しい状態、外れれば null ----------
  function isObj (v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  function intIn (v, a, b) { return typeof v === 'number' && Number.isInteger(v) && v >= a && v <= b }
  function sameKeys (o, list) {
    var ks = Object.keys(o)
    if (ks.length !== list.length) return false
    return list.every(function (k) { return own(o, k) }) && ks.every(function (k) { return list.indexOf(k) >= 0 })
  }
  var ING_IDS = ING.map(function (f) { return f.id })
  var MENU_IDS = MENU.map(function (m) { return m.id })
  function validate (d) {
    if (!isObj(d) || d.v !== 1) return null
    if (!intIn(d.target, 10, 60)) return null
    if (!isObj(d.ing) || !sameKeys(d.ing, ING_IDS)) return null
    if (!isObj(d.use) || !sameKeys(d.use, MENU_IDS)) return null
    var st = { target: d.target, ing: {}, use: {} }
    for (var i = 0; i < ING_IDS.length; i++) {
      var f = d.ing[ING_IDS[i]]
      if (!isObj(f) || !sameKeys(f, ['p', 'q', 'y'])) return null
      if (!intIn(f.p, 1, 1000000) || !intIn(f.q, 1, 100000) || !intIn(f.y, 1, 100)) return null
      st.ing[ING_IDS[i]] = { p: f.p, q: f.q, y: f.y }
    }
    for (i = 0; i < MENU.length; i++) {
      var m = MENU[i]; var u = d.use[m.id]
      var keys = m.recipe.map(function (r) { return r[0] })
      if (!isObj(u) || !sameKeys(u, keys)) return null
      st.use[m.id] = {}
      for (var j = 0; j < keys.length; j++) {
        if (!intIn(u[keys[j]], 1, 100000)) return null
        st.use[m.id][keys[j]] = u[keys[j]]
      }
    }
    if (overCap(st)) return null
    return st
  }
  function sample () {
    var st = { target: 30, ing: {}, use: {} }
    ING.forEach(function (f) { st.ing[f.id] = { p: f.p, q: f.q, y: f.y } })
    MENU.forEach(function (m) { st.use[m.id] = {}; m.recipe.forEach(function (r) { st.use[m.id][r[0]] = r[1] }) })
    return st
  }
  function clone (st) { return JSON.parse(JSON.stringify(st)) }

  // ---------- CSV（§14） ----------
  function csvCell (v) {
    if (typeof v === 'number') return String(v)
    var s = String(v)
    if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  // 小数の列（数の形の文字）は囲まずに出す
  function csvRaw (s) { return String(s) }
  var CSV_COLS = [
    ['メニュー', 'メニュー名'], ['売値（税込・円）', '整数'], ['1皿の原価（円）', '整数（四捨五入）'], ['1皿の原価（0.01円まで）', '345.00 の形'],
    ['原価率（%）', '29.6 の形'], ['粗利（円）', '整数（税抜の売値 − 原価）'], ['目標の原価率（%）', '整数'], ['目標との比較', '目標超え／目標内'],
    ['値付けの目安（税込・円）', '整数（10円単位で切り上げ）'], ['目安との差（円）', '整数（負は -）']
  ]
  function buildCsv (st, t) {
    var s2 = { target: t, ing: st.ing, use: st.use }
    var lines = [CSV_COLS.map(function (c) { return c[0] }).join(',')]
    MENU.forEach(function (m) {
      var c = calc(s2, m.id)
      lines.push([csvCell(m.name), csvCell(m.price), csvCell(c.yen), csvRaw(Math.floor(c.sen / 100) + '.' + String(c.sen % 100).padStart(2, '0')),
        csvRaw(Math.floor(c.r10 / 10) + '.' + (c.r10 % 10)), csvCell(c.profit), csvCell(t), csvCell(c.over ? '目標超え' : '目標内'), csvCell(c.suggest), csvCell(c.diff)].join(','))
    })
    return '﻿' + lines.join('\r\n') + '\r\n'
  }

  // ---------- 保存（§13） ----------
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
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, target: S.target, ing: S.ing, use: S.use }))
    } catch (e) { noSave() }
  }
  // 読み直す。無い時は黙って見本、壊れている時は見本で初期化して書き直し、注記を出す。保存できない時はメモリの S のまま
  function load () {
    if (!canSave) { if (!S) S = sample(); return }
    var raw = null
    try { raw = window.localStorage.getItem(KEY) } catch (e) { noSave(); if (!S) S = sample(); return }
    if (raw === null) { S = sample(); save(); return }
    var st = null
    try { st = validate(JSON.parse(raw)) } catch (e) { st = null }
    if (st) { S = st; return }
    S = sample()
    save()
    var n = document.getElementById('note-broken')
    if (n) n.hidden = false
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
  function nw (text, cls) { return el('span', 'nw' + (cls ? ' ' + cls : ''), text) }
  function vh (text) { return el('span', 'visually-hidden', text) }
  function setText (e, kids) { e.textContent = ''; add(e, kids); return e }

  // 折れてはいけない語（§17）を .nw の span に包む（テキストノードを分けて createElement で入れる）
  function esc (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  var NW_WORDS = ['洋食 ミナトビ', 'ハンバーグ定食', 'オムライス', 'ナポリタン', 'エビフライ', 'ビーフシチュー', 'プリン',
    '玉ねぎ', '合いびき肉', '米', 'デミグラスソース', '生クリーム', '牛すね肉', 'エビ（殻つき）', 'スパゲッティ', 'トマトケチャップ', 'パン粉', '鶏もも肉',
    '目標の原価率', 'いまの売値で目標内', '値上げの案', '見本から変更', '影響のあったメニュー', '目標超え', '目標内', 'デモ（架空のお店）', '見本に戻す', 'CSV をダウンロード', '印刷・PDFで保存',
    'デモ', '架空', '税込', '税抜']
  var NW_RE = new RegExp([
    '[+−±]?[\\d,]+\\.\\d{2}円／(?:g|ml|個)', '目標の原価率 \\d+%', '[+−±]?[\\d,]+(?:\\.\\d+)?(?:円|%|ml|g|個|ポイント|品)'
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
        if (!p || p.closest('.nw, svg, script, style, title, pre, .visually-hidden, label, option')) return NodeFilter.FILTER_REJECT
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
    over: ['目標超え', 'i-over'], ok: ['目標内', 'i-check'], raise: ['値上げの案', 'i-up'], keep: ['いまの売値で目標内', null], edited: ['見本から変更', 'i-pencil']
  }
  function stateTag (k) {
    var t = el('span', 'state-tag state-tag--' + k)
    if (TAG[k][1]) t.appendChild(icon(TAG[k][1], 14))
    t.appendChild(document.createTextNode(TAG[k][0]))
    return t
  }
  // 前後の比較の印（色に頼らず形と文字で。§1-3）
  function trend (d) {
    var s = el('span', 'trend')
    s.appendChild(icon(d > 0 ? 'i-tri-up' : d < 0 ? 'i-tri-down' : 'i-eq', 14))
    s.appendChild(vh(d > 0 ? '上がる' : d < 0 ? '下がる' : '変わらず'))
    return s
  }

  // ---------- 知らせ ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var srTimer = null
  // 入力による再計算は止まって 500ms 後に1回（§19-2）。ボタンは短く待つだけ
  function announce (msg, wait) {
    var sr = $('sr-status')
    window.clearTimeout(srTimer)
    srTimer = window.setTimeout(function () {
      sr.textContent = ''
      srTimer = window.setTimeout(function () { sr.textContent = msg }, 30)
    }, wait == null ? 20 : wait)
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

  // ---------- 確認の窓（最初のフォーカスは「やめる」、Esc＝やめる） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null
  function confirmBox () {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(true); return }
      dlgOpener = document.activeElement && document.activeElement.id
      dlgResolve = resolve
      dlg.showModal()
      $('cf-cancel').focus()
    })
  }
  function closeDlg (yes) {
    if (!dlgResolve) return
    var r = dlgResolve
    dlgResolve = null
    if (dlg.open) dlg.close()
    r(yes)
    if (!yes && dlgOpener) {
      var id = dlgOpener
      window.setTimeout(function () {
        var a = document.activeElement
        if ($(id) && (!a || a === document.body || dlg.contains(a))) $(id).focus()
      }, 0)
    }
  }
  $('cf-ok').addEventListener('click', function () { closeDlg(true) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(false) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(false) })

  // ---------- 画面の状態（保存しない） ----------
  // errs：入力欄ごとの誤り { code, raw }。box：影響のあったメニューの箱 { fid, before }
  var ui = { tab: 'list', menu: 'M1', sort: 'base', errs: {}, focusFid: null, focusBefore: null, box: null }
  function focusId (id) { var e = $(id); if (e) e.focus({ preventScroll: false }) }

  // ---------- タブ ----------
  var TABS = ['list', 'recipe', 'ing', 'price']
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
  var PANEL_H = { list: 'list-h', recipe: 'recipe-h', ing: 'ing-h', price: 'price-h' }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      var n = a.getAttribute('data-step')
      openTab(n, { noScroll: true })
      $('panel-' + n).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      $(PANEL_H[n]).focus({ preventScroll: true })
    })
  })

  // ---------- 入力欄（最初に1回だけ作る） ----------
  // 入力欄の id → { kind, fid, mid }
  var FIELDS = {}
  function inputBox (id, kind, unit, labelKids) {
    var lab = el('label', 'cell-label')
    lab.htmlFor = id
    add(lab, labelKids)
    var wrap = el('div', 'input-wrap')
    var inp = el('input', 'input')
    inp.id = id; inp.type = 'text'; inp.autocomplete = 'off'
    inp.setAttribute('inputmode', kind === 'use' ? 'decimal' : 'numeric')
    inp.setAttribute('aria-describedby', 'err-' + id)
    add(wrap, [inp, add(el('span', 'input__unit'), unit)])
    wrap.lastChild.setAttribute('aria-hidden', 'true')
    return { lab: lab, wrap: wrap, inp: inp }
  }
  function errP (id) { var p = el('p', 'field__err'); p.id = 'err-' + id; p.hidden = true; return p }
  function fieldValue (id) {
    var f = FIELDS[id]
    if (f.kind === 't') return S.target
    if (f.kind === 'use') return S.use[f.mid][f.fid]
    return S.ing[f.fid][f.kind]
  }
  function fieldText (id) { var f = FIELDS[id]; var v = fieldValue(id); return f.kind === 'use' ? num10(v) : String(v) }
  function prevText (id) {
    var f = FIELDS[id]; var v = fieldValue(id)
    if (f.kind === 'use') return qty(v, ING_BY_ID[f.fid].unit)
    if (f.kind === 'q') return v.toLocaleString('ja-JP') + ING_BY_ID[f.fid].unit
    if (f.kind === 'p') return yen(v)
    return v + '%'
  }
  function errMsg (id, code) { var f = FIELDS[id]; return code === 'cap' ? CAP_MSG : SPEC[f.kind][code] }
  // 誤りの文を出す（入力値は引用しない。§12）
  function showErr (id) {
    var p = $('err-' + id); var inp = $(id)
    if (!p || !inp) return
    var e = ui.errs[id]
    if (!e) {
      p.hidden = true; p.textContent = ''
      inp.removeAttribute('aria-invalid')
    } else {
      setText(p, [icon('i-err', 16, 'field__err-ic'), el('span', 'field__err-msg', errMsg(id, e.code)), el('span', 'field__prev', '前の値（' + prevText(id) + '）で計算しています')])
      p.hidden = false
      inp.setAttribute('aria-invalid', 'true')
    }
    var row = p.closest('.err-row')
    if (row) row.hidden = !row.querySelector('.field__err:not([hidden])')
  }
  function setErr (id, code) { ui.errs[id] = { code: code, raw: $(id).value }; showErr(id) }
  function clearErr (id) { if (ui.errs[id]) { delete ui.errs[id]; showErr(id) } }
  // フォーカスの無い・誤りの無い欄だけ、いまの値に合わせる（打っている途中の欄は触らない）
  function syncInputs () {
    Object.keys(FIELDS).forEach(function (id) {
      var inp = $(id)
      if (!inp || inp === document.activeElement || ui.errs[id]) return
      var t = fieldText(id)
      if (inp.value !== t) inp.value = t
    })
  }

  // 目標の原価率
  FIELDS['in-target'] = { kind: 't' }
  $('in-target').addEventListener('input', function () { onField('in-target', 'input') })
  $('in-target').addEventListener('change', function () { onField('in-target', 'change') })
  Array.prototype.forEach.call(document.querySelectorAll('.pick-btn--t'), function (b) {
    b.addEventListener('click', function () {
      load()
      var t = Number(b.getAttribute('data-t'))
      S.target = t
      save()
      delete ui.errs['in-target']
      showErr('in-target')
      $('in-target').value = String(t)
      renderAll()
      announce(targetMsg())
    })
  })
  function targetMsg () { return '目標の原価率 ' + S.target + '%。目標超え ' + calcAll(S).filter(function (c) { return c.over }).length + '品' }
  // target-err は帯の下の1つ（id が in-target 用の err-in-target ではないので付け替える）
  $('target-err').id = 'err-in-target'
  $('in-target').setAttribute('aria-describedby', 'target-hint err-in-target')

  // 食材の値段の行（§9）。12行×3欄を1回だけ作る
  var ingRefs = {}
  function buildIng () {
    var table = $('ing-table')
    ING.forEach(function (f) {
      var tb = el('tbody', 'ing-row'); tb.id = 'ing-' + f.id
      var tr = el('tr', 'ing-main')
      var th = el('th', 'c-name'); th.setAttribute('scope', 'row')
      var name = nw(f.name, 'ing-name'); name.id = 'ing-name-' + f.id
      var tag = el('span', 'row-tag')
      add(th, [name, tag])
      var cells = {}
      ;['p', 'q', 'y'].forEach(function (k) {
        var id = 'in-' + k + '-' + f.id
        FIELDS[id] = { kind: k, fid: f.id }
        var unit = k === 'p' ? '円' : k === 'q' ? f.unit : '%'
        var b = inputBox(id, k, unit, [vh(f.name + 'の'), SPEC[k].label])
        var td = add(el('td', 'c-' + k), [b.lab, b.wrap])
        cells[k] = td
        b.inp.addEventListener('input', function () { onField(id, 'input') })
        b.inp.addEventListener('change', function () { onField(id, 'change') })
      })
      var unitTd = el('td', 'c-unit num')
      var unitSpan = nw('', 'ing-unit')
      add(unitTd, [unitSpan, el('span', 'ing-unit__l', '（使える量あたり）')])
      var ms = menusOf(f.id)
      var menusTd = el('td', 'c-menus')
      add(menusTd, [el('span', 'ing-menus__l', '使うメニュー：'), ms.map(function (m) { return m.name }).join('・'), nw('（' + ms.length + '品）')])
      add(tr, [th, cells.p, cells.q, cells.y, unitTd, menusTd])
      var er = el('tr', 'err-row'); er.hidden = true
      var etd = el('td'); etd.colSpan = 6
      add(etd, [errP('in-p-' + f.id), errP('in-q-' + f.id), errP('in-y-' + f.id)])
      er.appendChild(etd)
      var ir = el('tr', 'impact-row'); ir.hidden = true
      var itd = el('td'); itd.colSpan = 6
      var box = el('div', 'impact'); box.setAttribute('role', 'group'); box.setAttribute('aria-labelledby', 'impact-h-' + f.id)
      itd.appendChild(box); ir.appendChild(itd)
      add(tb, [tr, er, ir])
      table.appendChild(tb)
      ingRefs[f.id] = { tb: tb, tag: tag, unit: unitSpan, impactRow: ir, box: box }
      // 前後の比較の「前」は、この行の欄にフォーカスが入った時に取る（§9-3）
      tb.addEventListener('focusin', function () {
        tb.classList.add('ing-row--editing')
        if (ui.focusFid !== f.id) { load(); ui.focusFid = f.id; ui.focusBefore = snapshot(S, f.id) }
      })
      tb.addEventListener('focusout', function (e) {
        if (!e.relatedTarget || !tb.contains(e.relatedTarget)) tb.classList.remove('ing-row--editing')
        // 行を離れたら、次に入った時に新しい「前」を取る（§9-3。別の窓へ移っただけの時はフォーカスが行に残るので取り直さない）
        window.setTimeout(function () {
          if (ui.focusFid === f.id && !tb.contains(document.activeElement)) ui.focusFid = null
        }, 0)
      })
    })
  }
  function snapshot (st, fid) {
    var r = {}
    calcAll(st).forEach(function (c) { r[c.id] = c })
    return { fid: fid, ing: { p: st.ing[fid].p, q: st.ing[fid].q, y: st.ing[fid].y }, res: r }
  }
  // 前と後の比較（§9-3・§9-4）。純粋な関数
  function impact (before, after, fid) {
    var a = {}; calcAll(after).forEach(function (c) { a[c.id] = c })
    var changed = ['p', 'q', 'y'].filter(function (k) { return before.ing[k] !== after.ing[fid][k] })
    return {
      changed: changed,
      items: menusOf(fid).map(function (m) { return { id: m.id, b: before.res[m.id], a: a[m.id] } })
    }
  }

  // レシピ（§8）。メニューを選び直した時だけ行を作り直す（入力中の描き直しでは作らない）
  var recipeRefs = {}
  function buildRecipe () {
    var table = $('recipe-table')
    Array.prototype.slice.call(table.tBodies).forEach(function (b) { b.parentNode.removeChild(b) })
    Object.keys(FIELDS).forEach(function (id) { if (FIELDS[id].kind === 'use') delete FIELDS[id] })
    recipeRefs = {}
    var m = MENU_BY_ID[ui.menu]
    var tfoot = table.tFoot
    m.recipe.forEach(function (r) {
      var f = ING_BY_ID[r[0]]
      var id = 'use-' + m.id + '-' + f.id
      FIELDS[id] = { kind: 'use', fid: f.id, mid: m.id }
      var tb = el('tbody', 'recipe-row'); tb.id = 'rr-' + f.id
      var tr = el('tr')
      var th = el('th', 'c-name'); th.setAttribute('scope', 'row')
      th.appendChild(nw(f.name, 'recipe-name'))
      var unitTd = el('td', 'c-unit num')
      var unitSpan = nw('')
      add(unitTd, [unitSpan, el('span', 'recipe-unit__l', '（使える量あたり）')])
      var b = inputBox(id, 'use', f.unit, [vh(f.name + 'の'), '使う量'])
      var useTd = add(el('td', 'c-use'), [b.lab, b.wrap])
      var costTd = el('td', 'c-cost num')
      var costSpan = nw('')
      add(costTd, [el('span', 'recipe-cost__l', '原価 '), costSpan])
      var tagTd = el('td', 'c-tag')
      add(tr, [th, unitTd, useTd, costTd, tagTd])
      var er = el('tr', 'err-row'); er.hidden = true
      var etd = el('td'); etd.colSpan = 5
      etd.appendChild(errP(id)); er.appendChild(etd)
      add(tb, [tr, er])
      table.insertBefore(tb, tfoot)
      // 誤りのまま他のメニューへ移って戻った時は、欄の文字と誤りの文を戻す
      b.inp.value = ui.errs[id] ? ui.errs[id].raw : fieldText(id)
      showErr(id)
      b.inp.addEventListener('input', function () { onField(id, 'input') })
      b.inp.addEventListener('change', function () { onField(id, 'change') })
      recipeRefs[f.id] = { unit: unitSpan, cost: costSpan, tag: tagTd, tb: tb }
    })
  }
  function buildMenuPick () {
    var mp = $('menu-pick')
    MENU.forEach(function (m) {
      var b = btn('pick-btn pick-btn--menu', null, 'menu-' + m.id)
      add(b, [icon('i-okc', 16, 'pick-btn__ic'), nw(m.name)])
      b.addEventListener('click', function () { selectMenu(m.id) })
      mp.appendChild(b)
    })
  }
  function selectMenu (mid) {
    load()
    if (ui.menu !== mid) { ui.menu = mid; buildRecipe() }
    renderAll()
  }

  // ---------- 入力のたびに（§8-2・§9-2・§12） ----------
  function onField (id, ev) {
    var f = FIELDS[id]; var inp = $(id)
    if (!f || !inp) return
    var r = parseField(f.kind, inp.value)
    // 空は打っている途中には出さない（欄を離れた時に出す）
    if (r.e === 'empty' && ev === 'input') { clearErr(id); return }
    load()
    if (f.kind !== 't' && f.kind !== 'use' && ui.focusFid !== f.fid) { ui.focusFid = f.fid; ui.focusBefore = snapshot(S, f.fid) }
    if (r.e) { setErr(id, r.e); announce(errMsg(id, r.e), 500); return }
    var st = clone(S)
    if (f.kind === 't') st.target = r.v
    else if (f.kind === 'use') st.use[f.mid][f.fid] = r.v
    else st.ing[f.fid][f.kind] = r.v
    if (overCap(st)) { setErr(id, 'cap'); announce(CAP_MSG, 500); return }
    var had = !!ui.errs[id]
    delete ui.errs[id]
    showErr(id)
    var same = r.v === fieldValue(id)
    if (ev === 'change') inp.value = f.kind === 'use' ? num10(r.v) : String(r.v)
    if (same) { if (had) renderAll(); return }
    S = st
    save()
    if (f.kind === 'p' || f.kind === 'q' || f.kind === 'y') ui.box = { fid: f.fid, before: ui.focusBefore }
    else if (f.kind === 'use') ui.box = null
    renderAll()
    announce(fieldMsg(id), 500)
  }
  function fieldMsg (id) {
    var f = FIELDS[id]
    var all = calcAll(S)
    var overN = all.filter(function (c) { return c.over }).length
    if (f.kind === 't') return targetMsg()
    if (f.kind === 'use') {
      var c = calc(S, f.mid)
      return MENU_BY_ID[f.mid].name + ' 原価 ' + yen(c.yen) + ' 原価率 ' + pct(c.r10) + ' ' + (c.over ? '目標超え' : '目標内')
    }
    var g = ING_BY_ID[f.fid]; var v = S.ing[f.fid][f.kind]
    var head = f.kind === 'p' ? g.name + ' ' + yen(v) : f.kind === 'q' ? g.name + ' 仕入れの量 ' + v.toLocaleString('ja-JP') + g.unit : g.name + ' 歩留まり ' + v + '%'
    return head + '。影響 ' + menusOf(f.fid).length + '品。目標超え ' + overN + '品'
  }

  // ---------- 描き直し ----------
  function isEdited (st) {
    return {
      ing: function (fid) { var a = st.ing[fid]; var b = ING_BY_ID[fid]; return a.p !== b.p || a.q !== b.q || a.y !== b.y },
      use: function (mid, fid) { return st.use[mid][fid] !== MENU_BY_ID[mid].recipe.filter(function (r) { return r[0] === fid })[0][1] }
    }
  }
  function sampleUse (mid, fid) { return MENU_BY_ID[mid].recipe.filter(function (r) { return r[0] === fid })[0][1] }
  function renderTarget () {
    var t = S.target
    Array.prototype.forEach.call(document.querySelectorAll('.pick-btn--t'), function (b) {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-t')) === t && !ui.errs['in-target'] ? 'true' : 'false')
    })
    // 入力欄に 25・30・35 以外を入れた時は3つとも押していない形（§6）
    var inp = $('in-target')
    var cur = parseInt10(inp.value, 10, 60)
    if (cur.v == null || [25, 30, 35].indexOf(cur.v) < 0) {
      Array.prototype.forEach.call(document.querySelectorAll('.pick-btn--t'), function (b) { b.setAttribute('aria-pressed', 'false') })
    }
  }
  function sortedList (all) {
    var list = all.slice()
    var idx = function (c) { return MENU_IDS.indexOf(c.id) }
    if (ui.sort === 'ratio') list.sort(function (a, b) { return b.r10 - a.r10 || idx(a) - idx(b) })
    else if (ui.sort === 'profit') list.sort(function (a, b) { return a.profit - b.profit || idx(a) - idx(b) })
    return list
  }
  function goRecipe (mid) {
    load()
    ui.menu = mid
    buildRecipe()
    renderAll()
    openTab('recipe')
    $('recipe-h3').focus({ preventScroll: true })
  }
  function goBtn (cls, id, m, text) {
    var b = btn(cls, null, id)
    b.setAttribute('aria-label', m.name + 'のレシピを見る')
    add(b, text ? [nw(text), icon('i-right', 16)] : [nw(m.name)])
    b.addEventListener('click', function () { goRecipe(m.id) })
    return b
  }
  function renderList (all) {
    var overs = all.filter(function (c) { return c.over })
    $('ls-over-n').textContent = String(overs.length)
    $('ls-over-note').textContent = MENU.length + '品中・目標の原価率 ' + S.target + '%'
    $('ls-over-box').classList.toggle('is-over', overs.length > 0)
    var max = all[0]
    all.forEach(function (c) { if (c.r10 > max.r10) max = c })
    $('ls-max-n').textContent = pct(max.r10).replace('%', '')
    $('ls-max-note').textContent = MENU_BY_ID[max.id].name
    Array.prototype.forEach.call(document.querySelectorAll('.pick-btn--sort'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-sort') === ui.sort ? 'true' : 'false')
    })
    var list = sortedList(all)
    var cards = $('menu-cards'); cards.textContent = ''
    var tbody = $('cost-tbody'); tbody.textContent = ''
    list.forEach(function (c) {
      var m = MENU_BY_ID[c.id]
      // スマホのカード
      var li = el('li', 'menu-card' + (c.over ? ' is-over' : ''))
      li.setAttribute('data-id', m.id)
      var head = add(el('div', 'menu-card__head'), [el('span', 'menu-card__name', m.name), stateTag(c.over ? 'over' : 'ok')])
      var ratio = add(el('p', 'menu-card__ratio'), [el('span', 'menu-card__l', '原価率 '), add(el('span', 'big-pct nw'), [pct(c.r10).replace('%', ''), el('span', 'pct-u', '%')])])
      var nums = add(el('dl', 'menu-card__nums'), [
        add(el('div'), [el('dt', null, '売値（税込）'), el('dd', null, yen(m.price))]),
        add(el('div'), [el('dt', null, '1皿の原価'), el('dd', null, yen(c.yen))]),
        add(el('div'), [el('dt', null, '粗利'), el('dd', null, yen(c.profit))])
      ])
      add(li, [head, ratio, nums, goBtn('text-btn menu-card__go', 'go-c-' + m.id, m, 'レシピを見る')])
      cards.appendChild(li)
      // 768px〜 の表
      var tr = el('tr', c.over ? 'is-over' : '')
      tr.setAttribute('data-id', m.id)
      var th = el('th', 'c-menu'); th.setAttribute('scope', 'row')
      add(th, [el('span', 'cost-name lg-only', m.name), goBtn('text-btn cost-name-btn md-only', 'go-n-' + m.id, m)])
      add(tr, [th, add(el('td', 'num'), yen(m.price)), add(el('td', 'num'), yen(c.yen)), add(el('td', 'num t-ratio'), pct(c.r10)), add(el('td', 'num'), yen(c.profit)),
        add(el('td', 'c-tag'), stateTag(c.over ? 'over' : 'ok')), add(el('td', 'c-go lg'), goBtn('text-btn', 'go-t-' + m.id, m, 'レシピを見る'))])
      tbody.appendChild(tr)
    })
    var cn = $('csv-name'); cn.textContent = ''
    add(cn, ['ファイル名：', nw(CSV_NAME), nw('（' + MENU.length + '品）')])
    $('csv-peek').textContent = buildCsv(S, S.target).slice(1).split('\r\n').slice(0, 4).join('\n')
  }
  function renderRecipe () {
    var m = MENU_BY_ID[ui.menu]
    var c = calc(S, m.id)
    var ed = isEdited(S)
    MENU.forEach(function (x) {
      var b = $('menu-' + x.id)
      b.setAttribute('aria-pressed', x.id === m.id ? 'true' : 'false')
    })
    $('recipe-h3').textContent = m.name
    setText($('recipe-tag'), stateTag(c.over ? 'over' : 'ok'))
    setText($('recipe-price'), ['売値 ', nw(yen(m.price)), '（税込）・税抜 ', nw(yen2(divRound(m.price * 1000, 11)))])
    setText($('rn-cost'), nw(yen(c.yen)))
    setText($('rn-ratio'), nw(pct(c.r10)))
    setText($('rn-profit'), nw(yen(c.profit)))
    $('recipe-cap').textContent = m.name + 'の食材・使う量・原価'
    m.recipe.forEach(function (r) {
      var fid = r[0]; var ref = recipeRefs[fid]
      if (!ref) return
      var f = S.ing[fid]
      ref.unit.textContent = unitPrice(fid, f)
      ref.cost.textContent = yen2(lineSen(S.use[m.id][fid], f))
      var edited = ed.use(m.id, fid)
      ref.tag.textContent = ''
      ref.tag.classList.toggle('is-empty', !edited)
      if (edited) add(ref.tag, [stateTag('edited'), el('span', 'sample-note', '見本 ' + qty(sampleUse(m.id, fid), ING_BY_ID[fid].unit))])
    })
    setText($('recipe-total'), ['内訳の合計 ', nw(yen2(c.sen)), ' → 1皿の原価 ', nw(yen(c.yen))])
  }
  function renderIng () {
    var ed = isEdited(S)
    ING.forEach(function (g) {
      var ref = ingRefs[g.id]
      ref.unit.textContent = unitPrice(g.id, S.ing[g.id])
      ref.tag.textContent = ''
      if (ed.ing(g.id)) ref.tag.appendChild(stateTag('edited'))
      // 影響のあったメニューの箱（1つだけ。前と後の値が同じなら出さない）
      var show = ui.box && ui.box.fid === g.id && ui.box.before
      var im = show ? impact(ui.box.before, S, g.id) : null
      if (im && !im.changed.length) im = null
      ref.impactRow.hidden = !im
      ref.box.textContent = ''
      if (im) buildImpact(ref.box, g, ui.box.before, im)
    })
  }
  function buildImpact (box, g, before, im) {
    var h = el('p', 'impact__h')
    h.id = 'impact-h-' + g.id
    add(h, [nw('影響のあったメニュー'), ' ', nw(im.items.length + '品')])
    box.appendChild(h)
    im.changed.forEach(function (k) {
      var a = before.ing[k]; var b = S.ing[g.id][k]
      var p = el('p', 'impact__chg')
      if (k === 'p') add(p, [g.name + 'の仕入れ値 ', nw(yen(a)), ' → ', nw(yen(b)), nw('（' + chgPct(a, b) + '）')])
      else if (k === 'q') add(p, [g.name + 'の仕入れの量 ', nw(a.toLocaleString('ja-JP') + g.unit), ' → ', nw(b.toLocaleString('ja-JP') + g.unit)])
      else add(p, [g.name + 'の歩留まり ', nw(a + '%'), ' → ', nw(b + '%')])
      box.appendChild(p)
    })
    var ul = el('ul', 'impact__list')
    im.items.forEach(function (it) {
      var li = el('li', 'impact__item'); li.setAttribute('data-id', it.id)
      var l1 = add(el('p', 'impact__name'), [nw(MENU_BY_ID[it.id].name)])
      // 「前」の札はいまの目標で比べ直す（前を取った後に目標を変えても、目標の変更を食材の影響に数えない）
      if (isOver(it.b.r10, S.target) !== it.a.over) add(l1, [stateTag(it.a.over ? 'over' : 'ok'), el('span', 'impact__became', 'になりました')])
      var l2 = add(el('p', 'impact__cost'), ['原価 ', nw(yen(it.b.yen)), ' → ', nw(yen(it.a.yen)), nw('（' + dyen(it.a.yen - it.b.yen) + '）')])
      var d = it.a.r10 - it.b.r10
      var l3 = add(el('p', 'impact__ratio'), ['原価率 ', nw(pct(it.b.r10)), ' → ', nw(pct(it.a.r10)), add(el('span', 'nw'), ['（', trend(d), ' ' + dpt(d) + '）'])])
      add(li, [l1, l2, l3])
      ul.appendChild(li)
    })
    box.appendChild(ul)
  }
  function renderPrice (all) {
    var t = S.target
    setText($('price-lead'), [nw('目標の原価率 ' + t + '%'), ' にする税込の売値（10円単位で切り上げ）'])
    $('price-cap').textContent = '目標の原価率 ' + t + '% にする売値の目安'
    var raises = all.filter(function (c) { return c.raise })
    $('ps-n').textContent = String(raises.length)
    $('ps-names').textContent = raises.length ? raises.map(function (c) { return MENU_BY_ID[c.id].name }).join('・') : '（いまの売値で、すべて目標内です）'
    $('ps-box').classList.toggle('is-over', raises.length > 0)
    var cards = $('price-cards'); cards.textContent = ''
    var tbody = $('price-tbody'); tbody.textContent = ''
    all.forEach(function (c) {
      var m = MENU_BY_ID[c.id]
      var li = el('li', 'price-card' + (c.raise ? ' is-raise' : ''))
      li.setAttribute('data-id', m.id)
      add(li, [
        add(el('div', 'price-card__head'), [el('span', 'price-card__name', m.name), stateTag(c.raise ? 'raise' : 'keep')]),
        add(el('p', 'price-card__sug'), [el('span', 'price-card__l', '目安 '), add(el('span', 'big-yen nw'), [c.suggest.toLocaleString('ja-JP'), el('span', 'pct-u', '円')]), el('span', 'price-card__l', '（税込）')]),
        add(el('p', 'price-card__diff'), ['いまの売値 ', nw(yen(m.price)), ' → 差 ', nw(dyen(c.diff))]),
        add(el('p', 'price-card__meta'), ['1皿の原価 ', nw(yen(c.yen)), '・いまの原価率 ', nw(pct(c.r10))])
      ])
      cards.appendChild(li)
      var tr = el('tr', c.raise ? 'is-raise' : '')
      tr.setAttribute('data-id', m.id)
      var th = el('th', 'c-menu', m.name); th.setAttribute('scope', 'row')
      add(tr, [th, add(el('td', 'num'), yen(c.yen)), add(el('td', 'num'), yen(m.price)), add(el('td', 'num'), pct(c.r10)), add(el('td', 'num t-sug'), yen(c.suggest)),
        add(el('td', 'num'), dyen(c.diff)), add(el('td', 'c-tag'), stateTag(c.raise ? 'raise' : 'keep'))])
      tbody.appendChild(tr)
    })
  }
  function renderAll () {
    var keep = document.activeElement && document.activeElement.id
    var all = calcAll(S)
    renderTarget()
    renderList(all)
    renderRecipe()
    renderIng()
    renderPrice(all)
    syncInputs()
    ;['panel-list', 'panel-recipe', 'panel-ing', 'panel-price'].forEach(function (id) { wrapWords($(id)) })
    // 一覧の「レシピを見る」など作り直したボタンにフォーカスがあった時は、同じ id のボタンへ戻す
    if (keep && $(keep) && document.activeElement !== $(keep) && (document.activeElement === document.body || !document.activeElement)) $(keep).focus({ preventScroll: true })
  }

  // 並べ替え（§7-4。保存しない）
  var SORT_NAME = { base: '見本の順', ratio: '原価率の高い順', profit: '粗利の低い順' }
  Array.prototype.forEach.call(document.querySelectorAll('.pick-btn--sort'), function (b) {
    b.addEventListener('click', function () {
      load()
      ui.sort = b.getAttribute('data-sort')
      renderAll()
      var first = sortedList(calcAll(S))[0]
      announce(SORT_NAME[ui.sort] + 'に並べました。1番目 ' + MENU_BY_ID[first.id].name + ' ' + pct(first.r10))
    })
  })

  // ---------- CSV ----------
  function renderCols () {
    var tb = $('csv-cols'); tb.textContent = ''
    CSV_COLS.forEach(function (c, i) { add(tb, add(el('tr'), [el('td', null, String(i + 1)), el('td', 'nw', c[0]), el('td', null, c[1])])) })
  }
  $('btn-csv').addEventListener('click', function () {
    load()
    var blob = new Blob([buildCsv(S, S.target)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url; a.download = CSV_NAME
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    showToast('CSV を作りました（' + MENU.length + '品）')
  })

  // ---------- 紙面（§15。値は textContent） ----------
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
  function sheetTable (cols, rows, cls) {
    var cg = el('colgroup')
    cols.forEach(function (c) { var col = el('col'); if (c[1]) col.style.width = c[1] + 'mm'; cg.appendChild(col) })
    var thead = add(el('thead'), add(el('tr'), cols.map(function (c) { var t = el('th', c[2] ? 'num' : null, c[0]); t.setAttribute('scope', 'col'); return t })))
    var tbody = el('tbody')
    rows.forEach(function (r) {
      tbody.appendChild(add(el('tr', r.cls || null), r.cells.map(function (v, i) {
        var e = el(i === 0 ? 'th' : 'td', (cols[i][2] ? 'num' : '') + (r.bold === i ? ' is-over' : '') || null, String(v))
        if (i === 0) e.setAttribute('scope', 'row')
        return e
      })))
    })
    return add(el('table', cls), [cg, thead, tbody])
  }
  var PRINT_MENU_COLS = [['メニュー', 38], ['売値', 20, 1], ['原価', 18, 1], ['原価率', 18, 1], ['粗利', 18, 1], ['目安の売値', 24, 1], ['差', 20, 1], ['比較', 0]]
  var PRINT_ING_COLS = [['食材', 40], ['仕入れ値', 26, 1], ['仕入れの量', 26, 1], ['歩留まり', 20, 1], ['使える量あたり', 30, 1], ['使うメニュー', 0]]
  function buildSheet () {
    var all = calcAll(S)
    var head = el('div', 'sheet__head')
    var shop = el('p', 'sheet__shop', SHOP + '　メニューの原価帳')
    shop.appendChild(stampSvg())
    add(head, [shop])
    var cond = el('p', 'sheet__cond', '目標の原価率 ' + S.target + '%・消費税 10% で計算（デモの仮定）。売値は税込、仕入れ値は税抜。粗利＝税抜の売値−1皿の原価（表の食材だけ）。')
    var mrows = all.map(function (c) {
      var m = MENU_BY_ID[c.id]
      return { cls: c.over ? 'is-over' : null, bold: c.over ? 7 : -1, cells: [m.name, yen(m.price), yen(c.yen), pct(c.r10), yen(c.profit), yen(c.suggest), dyen(c.diff), c.over ? '目標超え' : '目標内'] }
    })
    var irows = ING.map(function (g) {
      var f = S.ing[g.id]
      return { cells: [g.name, yen(f.p), f.q.toLocaleString('ja-JP') + g.unit, f.y + '%', unitPrice(g.id, f), menusOf(g.id).map(function (m) { return m.name }).join('・')] }
    })
    var demo = el('p', 'sheet__demo', '架空のデモ（TENKA LAB の制作見本）です。お店・食材・値段・数字はすべて架空です。')
    return add(el('div', 'sheet'), [demo, head, cond,
      el('p', 'sheet__h', 'メニューの原価と値付けの目安（' + MENU.length + '品）'),
      sheetTable(PRINT_MENU_COLS, mrows, 'sheet__menu'),
      el('p', 'sheet__h', '食材の値段（' + ING.length + '品）'),
      sheetTable(PRINT_ING_COLS, irows, 'sheet__ing'),
      el('p', 'sheet__foot', 'デモ（架空のお店）です。食材・値段・数字はすべて架空です。TENKA LAB の制作見本です。')])
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

  // ---------- 見本に戻す（§13-5） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox().then(function (yes) {
      if (!yes) return
      S = sample()
      save()
      ui.menu = 'M1'; ui.sort = 'base'; ui.box = null; ui.errs = {}; ui.focusFid = null; ui.focusBefore = null
      $('note-broken').hidden = true
      Array.prototype.forEach.call(document.querySelectorAll('.field__err'), function (p) { p.hidden = true; p.textContent = '' })
      Array.prototype.forEach.call(document.querySelectorAll('.err-row'), function (r) { r.hidden = true })
      Array.prototype.forEach.call(document.querySelectorAll('.input[aria-invalid]'), function (i) { i.removeAttribute('aria-invalid') })
      buildRecipe()
      Object.keys(FIELDS).forEach(function (id) { $(id).value = fieldText(id) })
      renderAll()
      focusId('btn-reset')
      showToast('見本に戻しました')
    })
  })

  // ---------- 2つのタブの同期（§13-3） ----------
  window.addEventListener('storage', function (e) {
    if (!canSave) return
    if (e.key !== null && e.key !== KEY) return
    if (e.key === null || e.newValue === null) { S = sample(); save() } else load()
    renderAll()
  })

  // ---------- はじめ ----------
  load()
  if (!canSave) $('note-nosave').hidden = false
  buildIng()
  buildMenuPick()
  buildRecipe()
  renderCols()
  Object.keys(FIELDS).forEach(function (id) { $(id).value = fieldText(id) })
  wrapWords(document.body)
  renderAll()
  openTab(ui.tab, { noScroll: true })

  // 検査用（状態を引数で受ける純粋な関数だけ。画面の状態は出さない）
  window.__demo19 = { lineSen: lineSen, costSen: costSen, ratio10: ratio10, isOver: isOver, profitYen: profitYen, suggestYen: suggestYen, parseInt10: parseInt10, parseUse10: parseUse10, validate: validate, csvCell: csvCell, buildCsv: buildCsv, sample: sample, impact: impact }
})()
