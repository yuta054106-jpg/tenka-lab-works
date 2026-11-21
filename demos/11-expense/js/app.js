// 焼き菓子と喫茶 ミズハラ堂（デモ）経費の記録と月の集計
// 表示する値はすべて textContent / value / setAttribute で入れる（innerHTML に値を入れない。固定の SVG だけ template で作る）
// 合計・割合・印はいつも evaluate(items) 1つで計算する（design.md §14-3）。金額は整数（円）だけで扱う
(function () {
  'use strict'

  // ---------- 固定の値（design.md §13） ----------
  var STORE_KEY = 'tenkaLab.demo11.expense.v1'
  var SHOP = '焼き菓子と喫茶 ミズハラ堂（架空）'
  var CSV_NAME = '経費_2026-11_ミズハラ堂.csv'
  var PRINT_TITLE = '経費の集計_2026-11_ミズハラ堂'
  var CATS = [
    ['shiire', '仕入（材料）'], ['shomo', '消耗品'], ['kounetsu', '水道光熱'], ['tsushin', '通信'], ['yachin', '地代家賃'],
    ['shuzen', '修繕'], ['ryohi', '旅費交通'], ['kokoku', '広告宣伝'], ['zappi', '雑費']
  ].map(function (r) { return { id: r[0], name: r[1] } })
  var CAT_NAME = {}; CATS.forEach(function (c) { CAT_NAME[c.id] = c.name })
  var PAYS = [{ id: 'cash', name: '現金', icon: 'cash' }, { id: 'card', name: 'カード', icon: 'card' }, { id: 'bank', name: '振込', icon: 'bank' }]
  var PAY_NAME = {}; PAYS.forEach(function (p) { PAY_NAME[p.id] = p.name })
  // 10月の科目ごとの合計（見本の固定値。明細なし。§13-4）
  var OCT = { shiire: 118400, shomo: 15200, kounetsu: 31500, tsushin: 8470, yachin: 45000, shuzen: 0, ryohi: 3100, kokoku: 5500, zappi: 2000 }
  var OCT_TOTAL = 229170
  var SALES = 1710000 // 11月の売上（作品例③の見本と同じ架空の数字）
  var BIG = 50000 // 5万円以上を「大きい支出」とする（お店が決める値の例）
  var MAX_AMOUNT = 10000000
  // 見本の30件（§13-3）[日, 支払先, 金額, 科目, 支払方法, メモ]
  var SEED = [
    [2, '製菓材料店A', 32400, 'shiire', 'bank', '小麦粉・バター（月初のまとめ買い）'],
    [2, '青果店A', 4860, 'shiire', 'cash', 'りんご・レモン'],
    [3, 'ホームセンターB', 3278, 'shomo', 'card', 'ゴミ袋・洗剤'],
    [4, '乳製品店C', 12960, 'shiire', 'bank', '生クリーム・牛乳'],
    [5, '青果店A', 3240, 'shiire', 'cash', 'いちご'],
    [6, '文具店D', 1650, 'shomo', 'cash', 'レジのロール紙'],
    [7, '包材店E', 8800, 'shomo', 'card', '焼き菓子の袋 100枚, シール 200枚'],
    [9, '青果店A', 2916, 'shiire', 'cash', 'りんご'],
    [10, 'バス会社F', 920, 'ryohi', 'cash', '製菓材料店Aへ（往復）'],
    [10, '電力会社G', 18420, 'kounetsu', 'bank', '10月分の電気'],
    [11, 'ガス会社H', 9630, 'kounetsu', 'bank', '10月分のガス'],
    [12, '水道局I', 6050, 'kounetsu', 'bank', '9・10月分の水道'],
    [12, '通信会社J', 5280, 'tsushin', 'card', 'お店の光回線'],
    [13, '通信会社K', 3190, 'tsushin', 'card', 'お店のスマホ'],
    [14, '製菓材料店A', 18900, 'shiire', 'bank', 'アーモンド粉・チョコレート'],
    [16, '青果店A', 4212, 'shiire', 'cash', 'かぼちゃ・さつまいも'],
    [16, '青果店A', 4212, 'shiire', 'cash', 'かぼちゃ・さつまいも'],
    [17, '印刷所L', 13200, 'kokoku', 'bank', 'ショップカード 500枚'],
    [18, '厨房機器店M', 58300, 'shuzen', 'bank', 'オーブンの部品交換'],
    [19, 'ホームセンターB', 2178, '', 'card', '棚の金具'],
    [20, '乳製品店C', 10800, 'shiire', 'bank', 'バター'],
    [21, '青果店A', 3564, 'shiire', 'cash', '洋なし'],
    [23, '珈琲豆店N', 7700, 'shiire', 'card', 'コーヒー豆 2kg'],
    [24, '情報誌O', 11000, 'kokoku', 'bank', '地域の情報誌に掲載'],
    [25, '不動産会社P', 45000, 'yachin', 'bank', '12月分の家賃'],
    [26, 'タクシー会社Q', 1580, 'ryohi', 'cash', '大口注文の配達'],
    [27, 'ホームセンターB', 1958, 'shuzen', 'cash', 'ドアの蝶番'],
    [28, '青果店A', 3888, 'shiire', 'cash', 'みかん'],
    [28, '町内会S', 2000, 'zappi', 'cash', '町内会費（11月）'],
    [30, '製菓材料店A', 21600, 'shiire', 'bank', '小麦粉・グラニュー糖']
  ]

  // ---------- 書き方（§2-1） ----------
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'] // 2026-11-01 は日曜（Date で計算しない）
  var yenFmt = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
  var MINUS = '−'
  function dayNum (iso) { return parseInt(iso.slice(8, 10), 10) }
  function fmtDay (iso) { var d = dayNum(iso); return '11/' + d + '（' + WEEK[(d - 1) % 7] + '）' }
  function fmtMD (iso) { return '11/' + dayNum(iso) }
  function fmtYen (n) {
    var s = yenFmt.format(Math.abs(n)).replace('￥', '¥')
    return n < 0 ? MINUS + s : s
  }
  function tenths (num, den) { return Math.round(num * 1000 / den) } // 整数で丸める（toFixed を使わない）
  function fmtTenths (t) { return Math.floor(t / 10) + '.' + (t % 10) }
  function fmtShare (sum, total) { return (total > 0 ? fmtTenths(tenths(sum, total)) : '0.0') + '%' }
  // 上の箱の金額：文字と、桁数（半角1・全角2）を入れる。文字の大きさは CSS が箱の幅から決める
  function setYen (id, text) {
    var el = $(id); el.textContent = text
    var n = 0
    for (var i = 0; i < text.length; i++) n += text.charCodeAt(i) < 0x100 ? 1 : 2
    el.style.setProperty('--yen-len', String(n))
  }
  function fmtDeltaYen (d) { return d > 0 ? '+' + fmtYen(d) : d < 0 ? MINUS + fmtYen(-d) : '±¥0' }
  function fmtDeltaPct (d, base) {
    if (!base) return null
    var t = tenths(Math.abs(d), base)
    return (d > 0 ? '+' : d < 0 ? MINUS : '±') + fmtTenths(t) + '%'
  }
  function sortDesc (items) { return items.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.seq - a.seq }) }
  function sortAsc (items) { return items.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.seq - b.seq }) }

  // ---------- 入力の読み取り（§7-3） ----------
  // 支払先を比べる時だけの揃え方（保存する値は入力のまま）
  function normPayee (s) { return String(s || '').trim().normalize('NFKC') }
  function parseAmount (raw) {
    var s = String(raw || '').trim()
    if (!s) return { err: 'empty' }
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
    s = s.replace(/^[¥￥]/, '').replace(/円$/, '').replace(/[,，]/g, '')
    if (!/^\d+$/.test(s)) return { err: 'form' }
    var v = parseInt(s, 10)
    if (v === 0) return { err: 'form' }
    if (v > MAX_AMOUNT) return { err: 'max' }
    return { v: v }
  }
  var DATE_RE = /^2026-11-(0[1-9]|[12][0-9]|30)$/
  var MSG = {
    dateEmpty: '日付を選んでください',
    dateRange: '日付は 2026年11月1日〜30日の中で選んでください（デモ）',
    payeeEmpty: '支払先を入れてください',
    amountEmpty: '金額を入れてください',
    amountForm: '金額は 1円以上の整数で入れてください',
    amountMax: '金額は 1,000万円（10,000,000円）までにしてください'
  }
  function cleanMemo (s) { return String(s || '').replace(/\r\n?/g, '\n').trim() }

  // ---------- 合計・割合・印（§14-3。いつもこの1つで計算する） ----------
  function evaluate (items) {
    var byCat = { '': { n: 0, sum: 0 } }; CATS.forEach(function (c) { byCat[c.id] = { n: 0, sum: 0 } })
    var byPay = {}; PAYS.forEach(function (p) { byPay[p.id] = { n: 0, sum: 0 } })
    var total = 0
    var groups = {}; var gOrder = []
    items.forEach(function (it) {
      total += it.amount
      byCat[it.cat].n++; byCat[it.cat].sum += it.amount
      byPay[it.pay].n++; byPay[it.pay].sum += it.amount
      var k = it.date + '|' + normPayee(it.payee) + '|' + it.amount
      if (!groups[k]) { groups[k] = []; gOrder.push(k) }
      groups[k].push(it.seq)
    })
    var flags = {}
    function mark (seq, f) { (flags[seq] = flags[seq] || []).push(f) }
    var dupGroups = 0; var dupItems = 0
    var dupSet = {}
    gOrder.forEach(function (k) { if (groups[k].length >= 2) { dupGroups++; dupItems += groups[k].length; groups[k].forEach(function (s) { dupSet[s] = true }) } })
    var nocat = 0; var big = 0
    items.forEach(function (it) {
      if (dupSet[it.seq]) mark(it.seq, 'dup')
      if (it.cat === '') { nocat++; mark(it.seq, 'nocat') }
      if (it.amount >= BIG) { big++; mark(it.seq, 'big') }
    })
    var maxCat = 0; Object.keys(byCat).forEach(function (k) { if (byCat[k].sum > maxCat) maxCat = byCat[k].sum })
    var maxPay = 0; PAYS.forEach(function (p) { if (byPay[p.id].sum > maxPay) maxPay = byPay[p.id].sum })
    return {
      total: total, count: items.length, byCat: byCat, byPay: byPay, maxCat: maxCat, maxPay: maxPay,
      diff: total - OCT_TOTAL, left: SALES - total,
      flags: { bySeq: flags, dupGroups: dupGroups, dupItems: dupItems, nocat: nocat, big: big, count: dupGroups + nocat + big, flagged: Object.keys(flags).length }
    }
  }

  // ---------- 支払先から科目の候補（§7-4。決まった規則） ----------
  function suggestCat (items, payee, exceptSeq) {
    var key = normPayee(payee)
    if (!key) return null
    var cnt = {}
    items.forEach(function (it) {
      if (it.seq === exceptSeq || it.cat === '' || normPayee(it.payee) !== key) return
      var c = cnt[it.cat] || (cnt[it.cat] = { n: 0, date: '', seq: 0 })
      c.n++
      if (it.date > c.date || (it.date === c.date && it.seq > c.seq)) { c.date = it.date; c.seq = it.seq }
    })
    var best = null
    CATS.forEach(function (cat) {
      var c = cnt[cat.id]
      if (!c) return
      if (!best || c.n > best.n || (c.n === best.n && (c.date > best.date || (c.date === best.date && c.seq > best.seq)))) best = { cat: cat.id, n: c.n, date: c.date, seq: c.seq }
    })
    return best ? { cat: best.cat, n: best.n, lastDate: best.date } : null
  }

  // ---------- CSV（§9-2・9-3） ----------
  function csvCell (v) {
    v = String(v)
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v
    return '"' + v.replace(/\r?\n/g, '\r\n').replace(/"/g, '""') + '"'
  }
  var CSV_HEAD = '日付,支払先,科目,金額,支払方法,メモ'
  function csvLine (it) {
    return [it.date.replace(/-/g, '/'), csvCell(it.payee), csvCell(it.cat ? CAT_NAME[it.cat] : ''), String(it.amount), csvCell(PAY_NAME[it.pay]), csvCell(it.memo)].join(',')
  }
  function csvText (items) {
    return [CSV_HEAD].concat(sortAsc(items).map(csvLine)).join('\r\n') + '\r\n'
  }

  // ---------- 状態と保存（§10） ----------
  function initialState () {
    return {
      items: SEED.map(function (r, i) {
        return { seq: i + 1, date: '2026-11-' + (r[0] < 10 ? '0' : '') + r[0], payee: r[1], amount: r[2], cat: r[3], pay: r[4], memo: r[5] }
      }),
      nextSeq: 31
    }
  }
  var canSave = false
  try {
    window.localStorage.setItem('tenkaLab.test', '1')
    window.localStorage.removeItem('tenkaLab.test')
    canSave = true
  } catch (e) { canSave = false }

  function isInt (v) { return typeof v === 'number' && Math.floor(v) === v && isFinite(v) }
  function validItem (it) {
    if (!it || typeof it !== 'object') return false
    if (!isInt(it.seq) || it.seq < 1) return false
    if (typeof it.date !== 'string' || !DATE_RE.test(it.date)) return false
    if (!isInt(it.amount) || it.amount < 1 || it.amount > MAX_AMOUNT) return false
    if (typeof it.cat !== 'string' || (it.cat !== '' && !Object.prototype.hasOwnProperty.call(CAT_NAME, it.cat))) return false
    if (typeof it.pay !== 'string' || !Object.prototype.hasOwnProperty.call(PAY_NAME, it.pay)) return false
    if (typeof it.payee !== 'string' || it.payee.length < 1 || it.payee.length > 30) return false
    if (typeof it.memo !== 'string' || it.memo.length > 100) return false
    return true
  }
  function loadState () {
    if (!canSave) return null
    try {
      var raw = window.localStorage.getItem(STORE_KEY)
      if (!raw) return null
      var d = JSON.parse(raw)
      if (!d || typeof d !== 'object' || d.v !== 1 || !Array.isArray(d.items) || !isInt(d.nextSeq)) return null
      var seen = {}; var items = []
      for (var i = 0; i < d.items.length; i++) {
        var it = d.items[i]
        if (!validItem(it) || seen[it.seq] || it.seq >= d.nextSeq) return null
        seen[it.seq] = true
        items.push({ seq: it.seq, date: it.date, payee: it.payee, amount: it.amount, cat: it.cat, pay: it.pay, memo: it.memo })
      }
      return { items: items, nextSeq: d.nextSeq }
    } catch (e) { return null }
  }
  function saveState () {
    if (!canSave) return
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, items: S.items, nextSeq: S.nextSeq }))
    } catch (e) { /* 保存に失敗しても画面は止めない */ }
  }
  var S = null
  function findItem (seq) { return S.items.filter(function (x) { return x.seq === seq })[0] || null }

  // ---------- DOM の小道具（⑩と同じ） ----------
  var $ = function (id) { return document.getElementById(id) }
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
  // 固定の SVG だけを作る（値は入れない）
  var SW = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  var ICON = {
    ok: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M5 8.3l2 2 4-4.3"' + SW + '/>',
    warn: '<path d="M8 1.8L15 14H1z"' + SW + '/><path d="M8 6.5v3"' + SW + '/><circle cx="8" cy="11.8" r="1" fill="currentColor"/>',
    info: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M8 7.5v4"' + SW + '/><circle cx="8" cy="4.8" r="1" fill="currentColor"/>',
    dup: '<rect x="1.5" y="4.5" width="8.5" height="10" rx="1"' + SW + '/><path d="M5 4.5V1.5h8.5v10H10"' + SW + '/>',
    nocat: '<circle cx="8" cy="8" r="6.5"' + SW + '/><path d="M6.1 6.2a2 2 0 1 1 2.7 1.9c-.5.2-.8.6-.8 1.2v.3"' + SW + '/><circle cx="8" cy="11.8" r="1" fill="currentColor"/>',
    big: '<circle cx="7" cy="7" r="4.5"' + SW + '/><path d="M10.4 10.4L14.5 14.5"' + SW + '/>',
    plus: '<path d="M8 3v10M3 8h10"' + SW + '/>',
    cash: '<rect x="1" y="4" width="14" height="8" rx="1"' + SW + '/><circle cx="8" cy="8" r="2"' + SW + '/>',
    card: '<rect x="1" y="3" width="14" height="10" rx="1.5"' + SW + '/><path d="M1 6.5h14M4 10h3"' + SW + '/>',
    bank: '<path d="M1.5 6L6.5 2.5 11.5 6zM3 7v6M6.5 7v6M10 7v6M1.5 14h10"' + SW + '/><path d="M12 10.5h3M13.8 8.8l1.7 1.7-1.7 1.7"' + SW + '/>',
    trash: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 10h6.6L12 4M6.8 6.5v5M9.2 6.5v5"' + SW + '/>',
    csv: '<path d="M3 1.5h6.5L13 5v9.5H3z"' + SW + '/><path d="M8 6.5v5M5.8 9.5L8 11.7l2.2-2.2"' + SW + '/>',
    print: '<path d="M4 6V1.5h8V6M4 12H2V6.5h12V12h-2"' + SW + '/><path d="M4 9.5h8V15H4z"' + SW + '/>',
    undo: '<path d="M3 3v4h4"' + SW + '/><path d="M3.3 7A5.5 5.5 0 1 1 4 11.5"' + SW + '/>',
    close: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"' + SW + '/>',
    up: '<path d="M8 3l5.5 9h-11z"' + SW + '/>',
    down: '<path d="M8 13l5.5-9h-11z"' + SW + '/>',
    flat: '<path d="M3 8h10"' + SW + '/>',
    stamp: '<svg class="stamp" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="見本の印（この表は見本です）">' +
      '<rect x="1.5" y="1.5" width="53" height="53" rx="4" fill="none" stroke="#B23A2E" stroke-width="3"/>' +
      '<rect x="6.5" y="6.5" width="43" height="43" rx="2" fill="none" stroke="#B23A2E" stroke-width="1"/>' +
      '<text x="28" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">見</text>' +
      '<text x="28" y="45" text-anchor="middle" font-size="18" font-weight="700" fill="#B23A2E" font-family="Hiragino Mincho ProN, Yu Mincho, YuMincho, serif">本</text>' +
      '</svg>'
  }
  function icon (name, size) {
    var t = document.createElement('template')
    var s = size || 14
    t.innerHTML = name === 'stamp' ? ICON.stamp : '<svg width="' + s + '" height="' + s + '" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>'
    return t.content.firstChild
  }
  function fillIcons (root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-icon]'), function (el) {
      if (el.firstChild) return
      var n = el.getAttribute('data-icon')
      var size = /20$/.test(n) ? 20 : /18$/.test(n) ? 18 : 16
      el.appendChild(icon(n.replace(/\d+$/, ''), size))
    })
  }
  var FLAG = {
    dup: { text: '重複かも', icon: 'dup', title: '同じ日・同じ支払先・同じ金額の記録がほかにもあります' },
    nocat: { text: '科目未選択', icon: 'nocat', title: '科目がまだ選ばれていません' },
    big: { text: '5万円以上', icon: 'big', title: '5万円以上（大きい支出の確認。金額の目安はお店で決められます）' }
  }
  function flagChips (list) {
    return h('span', { class: 'flags' }, list.map(function (f) {
      return h('span', { class: 'flag flag--' + f, title: FLAG[f].title }, [icon(FLAG[f].icon, 14), FLAG[f].text])
    }))
  }

  // ---------- 画面の状態（保存しない） ----------
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var mqPC = window.matchMedia('(min-width: 768px)')
  var mqWide = window.matchMedia('(min-width: 1024px)')
  var ui = { tab: 'entry', fCat: 'all', fPay: 'all', fFlag: false, inPay: 'cash', edPay: 'cash', catTouched: false, errIn: false, errEd: false, editSeq: null, newSeq: null }
  var E = null // 最後の evaluate の結果

  // ---------- 知らせ ----------
  var elStatus = $('sr-status')
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
    if (!reduceMotion) t.classList.add('is-in')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(function () { t.hidden = true }, 3000)
    announce(text)
  }

  // ---------- 確認の窓（⑩と同じ） ----------
  var dlg = $('confirm')
  var hasDialog = typeof window.HTMLDialogElement === 'function' && typeof dlg.showModal === 'function'
  var dlgResolve = null; var dlgOpener = null; var dlgFallbackFocus = null
  function confirmBox (opt) {
    return new Promise(function (resolve) {
      if (!hasDialog) { resolve(window.confirm(opt.title + '\n\n' + opt.body)); return }
      dlgOpener = document.activeElement
      dlgFallbackFocus = opt.fallback || null
      $('cf-title').textContent = opt.title
      $('cf-body').textContent = opt.body
      $('cf-ok').textContent = opt.ok
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
    window.setTimeout(function () {
      if (document.activeElement && document.activeElement !== document.body && !dlg.contains(document.activeElement)) return
      var target = dlgOpener && document.contains(dlgOpener) ? dlgOpener : dlgFallbackFocus
      if (target) target.focus()
    }, 0)
  }
  $('cf-ok').addEventListener('click', function () { closeDlg(true) })
  $('cf-cancel').addEventListener('click', function () { closeDlg(false) })
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(false) })

  // ---------- タブ（⑩と同じ） ----------
  var TABS = ['entry', 'month', 'output']
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
    if (e.key === 'ArrowRight') j = (i + 1) % 3
    else if (e.key === 'ArrowLeft') j = (i + 2) % 3
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = 2
    if (j === null) return
    e.preventDefault()
    openTab(TABS[j])
    $('tab-' + TABS[j]).focus()
  })
  function goTo (el, focusEl) {
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    if (focusEl) focusEl.focus({ preventScroll: true })
  }
  Array.prototype.forEach.call(document.querySelectorAll('#steps a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      openTab(a.getAttribute('data-tab'), { noScroll: true })
      var card = $(a.getAttribute('data-go'))
      var f = a.getAttribute('data-focus')
      goTo(card, f ? $(f) : card.querySelector('[tabindex="-1"]'))
    })
  })

  // ---------- 切替（.seg。ラジオの動き） ----------
  function makeSeg (el, opts, get, set) {
    var btns = opts.map(function (o) {
      return h('button', { type: 'button', class: 'seg__btn', role: 'radio', 'data-v': o.id, onclick: function () { set(o.id); refresh() } },
        [o.icon ? icon(o.icon, 16) : null, o.name])
    })
    append(el, btns)
    function refresh () {
      btns.forEach(function (b) {
        var on = b.getAttribute('data-v') === get()
        b.setAttribute('aria-checked', on ? 'true' : 'false')
        b.tabIndex = on ? 0 : -1
      })
    }
    el.addEventListener('keydown', function (e) {
      var i = btns.indexOf(document.activeElement); if (i < 0) return
      var n = btns.length; var j = null
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + n - 1) % n
      else if (e.key === 'Home') j = 0
      else if (e.key === 'End') j = n - 1
      if (j === null) return
      e.preventDefault()
      btns[j].click(); btns[j].focus()
    })
    refresh()
    return { refresh: refresh }
  }

  // ---------- 科目の欄（候補の並び。§7-4） ----------
  function buildCatSelect (sel, sug) {
    var cur = sel.value
    sel.textContent = ''
    sel.appendChild(h('option', { value: '', text: '選んでください（あとで選べます）' }))
    if (sug) sel.appendChild(h('option', { value: sug.cat, text: CAT_NAME[sug.cat] + '（前に使った科目）' }))
    CATS.forEach(function (c) { if (!sug || c.id !== sug.cat) sel.appendChild(h('option', { value: c.id, text: c.name })) })
    sel.value = cur || ''
  }
  function hintText (payee, sug) {
    return normPayee(payee) + ' で前に使った科目：' + CAT_NAME[sug.cat] + '（' + (sug.n >= 2 ? sug.n + '回' : '1回・' + fmtMD(sug.lastDate)) + '）'
  }
  function showHint (el, payee, sug) {
    el.textContent = ''
    if (!sug) { el.hidden = true; return '' }
    el.hidden = false
    append(el, [h('span', { class: 'cat-hint__i' }, icon('info', 14)), h('span', {}, [
      normPayee(payee) + ' で前に使った科目：', h('strong', { text: CAT_NAME[sug.cat] }),
      '（' + (sug.n >= 2 ? sug.n + '回' : '1回・' + fmtMD(sug.lastDate)) + '）'
    ])])
    return hintText(payee, sug)
  }

  // ---------- 入力のチェック（§7-3） ----------
  function readForm (p) {
    var errs = {}
    var date = $(p + '-date').value
    if (!date) errs.date = MSG.dateEmpty
    else if (!DATE_RE.test(date)) errs.date = MSG.dateRange
    var payee = $(p + '-payee').value.trim()
    if (!payee) errs.payee = MSG.payeeEmpty
    var am = parseAmount($(p + '-amount').value)
    if (am.err) errs.amount = am.err === 'empty' ? MSG.amountEmpty : am.err === 'max' ? MSG.amountMax : MSG.amountForm
    var rec = { date: date, payee: payee, amount: am.v, cat: $(p + '-cat').value, pay: p === 'in' ? ui.inPay : ui.edPay, memo: cleanMemo($(p + '-memo').value) }
    return { errs: errs, rec: rec, ok: !Object.keys(errs).length }
  }
  var HINT_IDS = { 'in-date': ['in-date-hint'], 'in-payee': ['in-payee-hint'], 'in-amount': ['in-amount-hint'], 'ed-date': [], 'ed-payee': ['ed-payee-hint'], 'ed-amount': [] }
  function setDescribed (id) {
    var ids = HINT_IDS[id].filter(function (x) { return !$(x).hidden })
    var err = $(id + '-err')
    if (!err.hidden) ids.push(err.id)
    if (ids.length) $(id).setAttribute('aria-describedby', ids.join(' '))
    else $(id).removeAttribute('aria-describedby')
  }
  function showErrors (p, errs) {
    ;['date', 'payee', 'amount'].forEach(function (f) {
      var id = p + '-' + f
      var el = $(id + '-err')
      if (errs[f]) { el.textContent = errs[f]; el.hidden = false; $(id).setAttribute('aria-invalid', 'true') } else { el.textContent = ''; el.hidden = true; $(id).removeAttribute('aria-invalid') }
      setDescribed(id)
    })
  }
  function focusFirstErr (p, errs) {
    var f = ['date', 'payee', 'amount'].filter(function (x) { return errs[x] })[0]
    if (f) $(p + '-' + f).focus()
  }

  // ---------- 入力のカード（§7-2） ----------
  var inPaySeg = makeSeg($('in-pay'), PAYS, function () { return ui.inPay }, function (v) { ui.inPay = v })
  var srTimer = null
  function updateInSuggest (speak) {
    var payee = $('in-payee').value
    var sug = suggestCat(S.items, payee, null)
    var sel = $('in-cat')
    buildCatSelect(sel, sug)
    if (!ui.catTouched) sel.value = sug ? sug.cat : ''
    var txt = showHint($('in-payee-hint'), payee, sug)
    setDescribed('in-payee')
    if (speak) {
      window.clearTimeout(srTimer)
      if (txt) srTimer = window.setTimeout(function () { announce(txt) }, 500)
    }
  }
  $('in-payee').addEventListener('input', function () {
    updateInSuggest(true)
    if (ui.errIn) showErrors('in', readForm('in').errs)
  })
  ;['in-date', 'in-amount'].forEach(function (id) {
    $(id).addEventListener('input', function () { if (ui.errIn) showErrors('in', readForm('in').errs) })
  })
  $('in-cat').addEventListener('change', function () { ui.catTouched = true })
  function resetEntryForm () {
    $('in-date').value = '2026-11-30'
    $('in-payee').value = ''; $('in-amount').value = ''; $('in-memo').value = ''
    ui.inPay = 'cash'; inPaySeg.refresh()
    ui.catTouched = false; ui.errIn = false
    $('in-cat').value = ''
    showErrors('in', {})
    updateInSuggest(false)
  }
  $('entry-form').addEventListener('submit', function (e) {
    e.preventDefault()
    var r = readForm('in')
    if (!r.ok) { ui.errIn = true; showErrors('in', r.errs); focusFirstErr('in', r.errs); return }
    var rec = r.rec
    rec.seq = S.nextSeq++
    S.items.push(rec)
    saveState()
    ui.newSeq = rec.seq
    // 日付と支払方法はそのまま。ほかを空にする（§14-5）
    $('in-payee').value = ''; $('in-amount').value = ''; $('in-memo').value = ''
    ui.catTouched = false; ui.errIn = false
    $('in-cat').value = ''
    showErrors('in', {})
    renderAll()
    updateInSuggest(false)
    showToast(fmtDay(rec.date) + ' ' + rec.payee + ' ' + fmtYen(rec.amount) + ' を追加しました' + (rec.cat ? '' : '。科目はあとで選べます') + '（11月の合計 ' + fmtYen(E.total) + '）')
    // 横に並ぶ幅（1024px〜）だけ、足した行まで動かす（行が画面内なら動かさない）。狭い幅では入力欄を画面に残す
    var row = $('exp-' + rec.seq)
    if (row && mqWide.matches) {
      var rr = row.getBoundingClientRect()
      if (rr.top < 72 || rr.bottom > window.innerHeight) row.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    }
    $('in-payee').focus({ preventScroll: true })
  })

  // ---------- 上の数字・バッジ（§7-1・§6） ----------
  function renderSummary () {
    setYen('sum-total-n', fmtYen(E.total))
    $('sum-total-note').textContent = '10月 ' + fmtYen(OCT_TOTAL)
    $('sum-count-n').textContent = String(E.count)
    var F = E.flags
    var box = $('sum-flag')
    box.classList.toggle('is-ok', !F.count)
    var ic = $('sum-flag-icon'); ic.textContent = ''; ic.appendChild(icon(F.count ? 'warn' : 'ok', 16))
    $('sum-flag-n').textContent = String(F.count)
    var br = $('sum-flag-break'); br.textContent = ''
    br.classList.toggle('is-ok', !F.count)
    if (!F.count) br.textContent = '気づきの印はありません'
    else {
      var parts = []
      if (F.dupGroups) parts.push(['dup', '重複かも ' + F.dupGroups + '組（' + F.dupItems + '件）'])
      if (F.nocat) parts.push(['nocat', '科目未選択 ' + F.nocat + '件'])
      if (F.big) parts.push(['big', '5万円以上 ' + F.big + '件'])
      parts.forEach(function (p, i) {
        if (i) br.appendChild(document.createTextNode('・'))
        br.appendChild(h('span', { class: 'bk bk--' + p[0] }, [icon(FLAG[p[0]].icon, 12), h('span', { text: p[1] })]))
      })
    }
    $('sum-flag-link-p').hidden = !F.count
    var b = $('tab-entry-badge')
    b.hidden = !F.count
    b.textContent = F.count ? '印 ' + F.count : ''
    if (F.count) $('tab-entry').setAttribute('aria-label', '入力・一覧（気づきの印 ' + F.count + '件）')
    else $('tab-entry').removeAttribute('aria-label')
  }
  $('sum-flag-link').addEventListener('click', function (e) {
    e.preventDefault()
    ui.fFlag = true; $('f-flag').checked = true
    renderList()
    goTo($('list-card'), $('h-list'))
  })

  // ---------- 支払先の候補（datalist） ----------
  function renderDatalist () {
    var cnt = {}; var order = []
    S.items.slice().sort(function (a, b) { return a.seq - b.seq }).forEach(function (it) {
      var k = normPayee(it.payee)
      if (!cnt[k]) { cnt[k] = 0; order.push(k) }
      cnt[k]++
    })
    order.sort(function (a, b) { return cnt[b] - cnt[a] || order.indexOf(a) - order.indexOf(b) })
    var dl = $('payee-list'); dl.textContent = ''
    order.slice().forEach(function (k) { var o = document.createElement('option'); o.value = k; dl.appendChild(o) })
  }

  // ---------- 絞り込み（§7-7） ----------
  var fCat = $('f-cat')
  fCat.appendChild(h('option', { value: 'all', text: 'すべての科目' }))
  CATS.forEach(function (c) { fCat.appendChild(h('option', { value: c.id, text: c.name })) })
  fCat.appendChild(h('option', { value: 'none', text: '（科目未選択）' }))
  fCat.addEventListener('change', function () { ui.fCat = fCat.value; renderList() })
  var fPaySeg = makeSeg($('f-pay'), [{ id: 'all', name: 'すべて' }].concat(PAYS.map(function (p) { return { id: p.id, name: p.name } })), function () { return ui.fPay }, function (v) { ui.fPay = v; renderList() })
  $('f-flag').addEventListener('change', function () { ui.fFlag = $('f-flag').checked; renderList() })
  function resetFilters () {
    ui.fCat = 'all'; ui.fPay = 'all'; ui.fFlag = false
    fCat.value = 'all'; $('f-flag').checked = false; fPaySeg.refresh()
  }
  function visibleItems () {
    return sortDesc(S.items).filter(function (it) {
      if (ui.fCat !== 'all' && it.cat !== (ui.fCat === 'none' ? '' : ui.fCat)) return false
      if (ui.fPay !== 'all' && it.pay !== ui.fPay) return false
      if (ui.fFlag && !E.flags.bySeq[it.seq]) return false
      return true
    })
  }

  // ---------- 一覧（§7-5・7-6） ----------
  // 読み上げの名前。気づきの印があれば（重複かも・5万円以上 など）を入れる（カードは aria-label で中の札が読まれないため）
  function rowLabel (it) {
    var fl = (E && E.flags.bySeq[it.seq]) || []
    var f = fl.length ? '（' + fl.map(function (x) { return FLAG[x].text }).join('・') + '）' : ''
    return fmtDay(it.date) + ' ' + it.payee + ' ' + fmtYen(it.amount) + f + ' を直す・削除する'
  }
  function catCell (it) { return it.cat ? CAT_NAME[it.cat] : h('span', { class: 'cat-none', text: '（未選択）' }) }
  function renderList () {
    var area = $('list-area'); area.textContent = ''
    var list = visibleItems()
    var shownSum = 0; list.forEach(function (it) { shownSum += it.amount })
    $('list-info').textContent = E.count + '件中 ' + list.length + '件を表示' + (list.length ? '・表示中の合計 ' + fmtYen(shownSum) : '')
    if (!list.length) {
      area.appendChild(h('p', { class: 'list-none' }, ['条件に合う記録はありません', h('button', {
        type: 'button', class: 'text-link linkbtn', id: 'f-clear', text: '絞り込みを外す',
        onclick: function () { resetFilters(); renderList(); $('h-list').focus() }
      })]))
      return
    }
    var newSeq = ui.newSeq; ui.newSeq = null
    function common (it) {
      var fl = E.flags.bySeq[it.seq] || []
      return { id: 'exp-' + it.seq, 'data-seq': it.seq, 'data-flags': fl.length ? fl.join(' ') : null, 'data-edge': fl.length ? fl[0] : null, cls: newSeq === it.seq && !reduceMotion ? ' is-new' : '', fl: fl }
    }
    if (mqPC.matches) {
      var head = h('tr', {}, [
        h('th', { scope: 'col', class: 'c-date', text: '日付' }), h('th', { scope: 'col', text: '支払先・メモ' }),
        h('th', { scope: 'col', class: 'c-cat', text: '科目' }), h('th', { scope: 'col', class: 'c-pay', text: '支払方法' }),
        h('th', { scope: 'col', class: 'c-amt num', text: '金額' }), h('th', { scope: 'col', class: 'c-op op', text: '操作' })
      ])
      var rows = list.map(function (it) {
        var c = common(it)
        return h('tr', { id: c.id, 'data-seq': c['data-seq'], 'data-flags': c['data-flags'], 'data-edge': c['data-edge'], class: c.cls.trim() || null }, [
          h('td', { class: 'exp-list__date', text: fmtDay(it.date) }),
          h('td', {}, [h('span', { class: 'exp-list__payee', text: it.payee }), it.memo ? h('span', { class: 'exp-list__memo', text: it.memo }) : null, c.fl.length ? flagChips(c.fl) : null]),
          h('td', { class: 't-cat' }, [catCell(it), h('span', { class: 'exp-list__pay-in', text: PAY_NAME[it.pay] })]),
          h('td', { class: 't-pay', text: PAY_NAME[it.pay] }),
          h('td', { class: 'exp-list__amt', text: fmtYen(it.amount) }),
          h('td', { class: 'exp-list__op' }, h('button', { type: 'button', class: 'btn-sub btn-sm', 'data-seq': it.seq, 'aria-label': rowLabel(it), text: '直す' }))
        ])
      })
      area.appendChild(h('table', { class: 'exp-list' }, [h('caption', { class: 'visually-hidden', text: '11月の記録（日付の新しい順）' }), h('thead', {}, head), h('tbody', {}, rows)]))
    } else {
      area.appendChild(h('div', { class: 'exp-cards' }, list.map(function (it) {
        var c = common(it)
        return h('button', { type: 'button', class: 'exp-card' + c.cls, id: c.id, 'data-seq': c['data-seq'], 'data-flags': c['data-flags'], 'data-edge': c['data-edge'], 'aria-label': rowLabel(it) }, [
          h('span', { class: 'exp-card__date', text: fmtDay(it.date) }),
          h('span', { class: 'exp-card__r1' }, [h('span', { class: 'exp-card__payee', text: it.payee }), h('span', { class: 'exp-card__amt', text: fmtYen(it.amount) })]),
          h('span', { class: 'exp-card__r2' }, [h('span', { class: 'exp-card__meta' }, [catCell(it), '・' + PAY_NAME[it.pay]]), c.fl.length ? flagChips(c.fl) : null]),
          it.memo ? h('span', { class: 'exp-card__memo', text: it.memo }) : null
        ])
      })))
    }
  }
  $('list-area').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-seq]')
    if (b) openEdit(parseInt(b.getAttribute('data-seq'), 10))
  })
  function rowFocusEl (seq) {
    var el = $('exp-' + seq)
    if (!el) return null
    return el.tagName === 'TR' ? el.querySelector('button') : el
  }

  // ---------- 月の集計（§8） ----------
  function deltaIcon (d) { return icon(d > 0 ? 'up' : d < 0 ? 'down' : 'flat', 12) }
  function deltaEl (d, base, na) {
    if (na) return h('span', { class: 'delta delta--na', text: '—' })
    return h('span', { class: 'delta' + (d === 0 ? ' delta--zero' : '') }, [deltaIcon(d), h('span', { class: 't-delta', text: fmtDeltaYen(d) })])
  }
  function paren (t) { return t.charAt(0) === '（' ? t : '（' + t + '）' }
  function deltaPctText (d, base) { var p = fmtDeltaPct(d, base); return p === null ? '（10月は ¥0）' : p }
  function shareEl (sum, total, max, none) {
    var bar = h('div', { class: 'bar', 'aria-hidden': 'true' })
    if (sum > 0 && max > 0) {
      var f = h('span', { class: 'bar__fill' + (none ? ' bar__fill--none' : '') })
      f.style.width = (sum * 100 / max) + '%'
      f.style.minWidth = '2px'
      bar.appendChild(f)
    }
    return h('div', { class: 'share' }, [bar, h('span', { class: 'share__pct t-pct', text: fmtShare(sum, total) })])
  }
  function catRows () {
    var rows = CATS.map(function (c) { return { key: c.id, name: c.name, n: E.byCat[c.id].n, sum: E.byCat[c.id].sum, oct: OCT[c.id] } })
    if (E.byCat[''].n) rows.push({ key: 'none', name: '（科目未選択）', n: E.byCat[''].n, sum: E.byCat[''].sum, oct: null })
    return rows
  }
  function renderMonth () {
    setYen('m-total-n', fmtYen(E.total))
    $('m-total-note').textContent = E.count + '件'
    var di = $('m-diff-i'); di.textContent = ''; di.appendChild(icon(E.diff > 0 ? 'up' : E.diff < 0 ? 'down' : 'flat', 16))
    setYen('m-diff-n', fmtDeltaYen(E.diff))
    $('m-diff-note').textContent = deltaPctText(E.diff, OCT_TOTAL) + '（10月 ' + fmtYen(OCT_TOTAL) + '）'
    setYen('m-cash-n', fmtYen(E.byPay.cash.sum))
    setYen('m-left-n', fmtYen(E.left))

    var rows = catRows()
    var area = $('cat-area'); area.textContent = ''
    var pc = mqPC.matches
    function nameEl (r) { return r.key === 'none' ? h('span', { class: 'row-none' }, [icon('nocat', 14), r.name]) : r.name }
    if (pc) {
      var body = rows.map(function (r) {
        var d = r.oct === null ? 0 : r.sum - r.oct
        return h('tr', { 'data-cat': r.key }, [
          h('th', { scope: 'row' }, nameEl(r)),
          h('td', { class: 'num t-n', text: r.n + '件' }),
          h('td', { class: 'num t-sum', text: fmtYen(r.sum) }),
          h('td', {}, shareEl(r.sum, E.total, E.maxCat, r.key === 'none')),
          h('td', { class: 'num t-oct', text: r.oct === null ? '—' : fmtYen(r.oct) }),
          h('td', { class: 'num' }, [deltaEl(d, r.oct, r.oct === null), r.oct === null ? null : h('span', { class: 'delta__pct t-dpct', text: deltaPctText(d, r.oct) })])
        ])
      })
      body.push(h('tr', { class: 'is-total', 'data-cat': 'total' }, [
        h('th', { scope: 'row', text: '合計' }),
        h('td', { class: 'num t-n', text: E.count + '件' }),
        h('td', { class: 'num t-sum', text: fmtYen(E.total) }),
        h('td', {}, h('span', { class: 'share__pct t-pct', text: '100%' })),
        h('td', { class: 'num t-oct', text: fmtYen(OCT_TOTAL) }),
        h('td', { class: 'num' }, [deltaEl(E.diff, OCT_TOTAL), h('span', { class: 'delta__pct t-dpct', text: deltaPctText(E.diff, OCT_TOTAL) })])
      ]))
      area.appendChild(h('table', { class: 'cat-table' }, [
        h('caption', { class: 'visually-hidden', text: '科目ごとの合計（11月）と10月との比較' }),
        h('thead', {}, h('tr', {}, [
          h('th', { scope: 'col', class: 'c-name', text: '科目' }), h('th', { scope: 'col', class: 'c-n num', text: '件数' }),
          h('th', { scope: 'col', class: 'c-sum num', text: '11月の合計' }), h('th', { scope: 'col', text: '割合' }),
          h('th', { scope: 'col', class: 'c-oct num', text: '10月' }), h('th', { scope: 'col', class: 'c-delta num', text: '増減' })
        ])),
        h('tbody', {}, body)
      ]))
    } else {
      rows.forEach(function (r) {
        var d = r.oct === null ? 0 : r.sum - r.oct
        area.appendChild(h('div', { class: 'cat-block', 'data-cat': r.key }, [
          h('p', { class: 'cat-block__r1' }, [h('span', { class: 'cat-block__name' }, nameEl(r)), h('span', { class: 'cat-block__n t-n', text: r.n + '件' }), h('span', { class: 'cat-block__sum t-sum', text: fmtYen(r.sum) })]),
          shareEl(r.sum, E.total, E.maxCat, r.key === 'none'),
          r.oct === null
            ? h('p', { class: 'cat-block__oct' }, [h('span', { class: 't-oct', text: '10月 —' }), h('span', { class: 'sub sub--13', text: '（10月の見本にはありません）' })])
            : h('p', { class: 'cat-block__oct' }, [h('span', { class: 't-oct', text: '10月 ' + fmtYen(r.oct) }), '→', deltaEl(d, r.oct), h('span', { class: 'delta__pct t-dpct', text: paren(deltaPctText(d, r.oct)) })])
        ]))
      })
      area.appendChild(h('div', { class: 'cat-block is-total', 'data-cat': 'total' }, [
        h('p', { class: 'cat-block__r1' }, [h('span', { class: 'cat-block__name', text: '合計' }), h('span', { class: 'cat-block__n t-n', text: E.count + '件' }), h('span', { class: 'cat-block__sum t-sum', text: fmtYen(E.total) })]),
        h('p', { class: 'cat-block__oct' }, [h('span', { class: 't-pct', text: '100%' }), h('span', { class: 't-oct', text: '10月 ' + fmtYen(OCT_TOTAL) }), '→', deltaEl(E.diff, OCT_TOTAL), h('span', { class: 'delta__pct t-dpct', text: paren(deltaPctText(E.diff, OCT_TOTAL)) })])
      ]))
    }

    // 支払方法ごと（§8-3）
    var pArea = $('pay-area'); pArea.textContent = ''
    var cashNote = '現金で払った合計は、レジ（手元の現金）から出たお金の目安です。'
    function payName (p) { return h('span', { class: 'pay-name' }, [icon(p.icon, 16), p.name]) }
    if (pc) {
      var pb = PAYS.map(function (p) {
        return h('tr', { 'data-pay': p.id }, [
          h('th', { scope: 'row' }, payName(p)),
          h('td', { class: 'num t-n', text: E.byPay[p.id].n + '件' }),
          h('td', { class: 'num t-sum', text: fmtYen(E.byPay[p.id].sum) }),
          h('td', {}, shareEl(E.byPay[p.id].sum, E.total, E.maxPay))
        ])
      })
      pb.push(h('tr', { class: 'is-total', 'data-pay': 'total' }, [
        h('th', { scope: 'row', text: '合計' }), h('td', { class: 'num t-n', text: E.count + '件' }),
        h('td', { class: 'num t-sum', text: fmtYen(E.total) }), h('td', {}, h('span', { class: 'share__pct t-pct', text: '100%' }))
      ]))
      pArea.appendChild(h('table', { class: 'pay-table' }, [
        h('caption', { class: 'visually-hidden', text: '支払方法ごとの合計' }),
        h('thead', {}, h('tr', {}, [h('th', { scope: 'col', class: 'c-name pay-c-name', text: '支払方法' }), h('th', { scope: 'col', class: 'c-n num', text: '件数' }), h('th', { scope: 'col', class: 'c-sum num', text: '合計' }), h('th', { scope: 'col', text: '割合' })])),
        h('tbody', {}, pb)
      ]))
      pArea.appendChild(h('p', { class: 'sub sub--13 pay__note', text: '※ ' + cashNote }))
    } else {
      PAYS.forEach(function (p) {
        pArea.appendChild(h('div', { class: 'cat-block', 'data-pay': p.id }, [
          h('p', { class: 'cat-block__r1' }, [h('span', { class: 'cat-block__name' }, payName(p)), h('span', { class: 'cat-block__n t-n', text: E.byPay[p.id].n + '件' }), h('span', { class: 'cat-block__sum t-sum', text: fmtYen(E.byPay[p.id].sum) })]),
          shareEl(E.byPay[p.id].sum, E.total, E.maxPay),
          p.id === 'cash' ? h('p', { class: 'sub sub--13 pay__note', text: cashNote }) : null
        ]))
      })
      pArea.appendChild(h('div', { class: 'cat-block is-total', 'data-pay': 'total' }, [
        h('p', { class: 'cat-block__r1' }, [h('span', { class: 'cat-block__name', text: '合計' }), h('span', { class: 'cat-block__n t-n', text: E.count + '件' }), h('span', { class: 'cat-block__sum t-sum', text: fmtYen(E.total) })])
      ]))
    }

    // 手元に残る目安（§8-4）
    var ll = $('left-line'); ll.textContent = ''
    append(ll, [
      h('span', { class: 'lp' }, ['11月の売上 ', h('strong', { text: fmtYen(SALES) })]),
      h('span', { class: 'lp' }, ['− 11月の経費 ', h('strong', { text: fmtYen(E.total) })]),
      h('span', { class: 'lp' }, ['＝ 手元に残る目安 ', h('strong', { id: 'left-n', text: fmtYen(E.left) })])
    ])
  }

  // ---------- 出力（§9） ----------
  function renderOutput () {
    var none = !E.count
    var btn = $('csv-btn')
    if (none) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled')
    // ファイル名と「（30件）」はそれぞれ1かたまりで折る（値は textContent）
    var cn = $('csv-name'); cn.textContent = ''
    if (none) cn.textContent = '記録がありません'
    else append(cn, ['ファイル名：', h('span', { class: 'nw', text: CSV_NAME }), h('span', { class: 'nw', text: '（' + E.count + '件）' })])
    $('csv-peek').textContent = [CSV_HEAD].concat(sortAsc(S.items).slice(0, 4).map(csvLine)).join('\n')
    var pv = $('print-preview'); pv.textContent = ''
    pv.appendChild(buildSheet(false))
  }
  $('csv-btn').addEventListener('click', function () {
    if ($('csv-btn').getAttribute('aria-disabled') === 'true') return
    var blob = new Blob(['\uFEFF' + csvText(S.items)], { type: 'text/csv;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url; a.download = CSV_NAME
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    showToast('CSV を作りました（' + E.count + '件）。ダウンロードの場所をご確認ください')
  })

  // ---------- 紙面（§9-5。値は textContent） ----------
  // 店名の「（架空）」は1かたまりで折る
  function shopName () {
    var i = SHOP.indexOf('（')
    return h('span', {}, [SHOP.slice(0, i), h('span', { class: 'nw', text: SHOP.slice(i) })])
  }
  function buildSheet (full) {
    if (!E.count && full) return h('p', { class: 'print-empty', text: '11月の記録がありません。' })
    var head = h('div', { class: 'sheet__head' }, [
      h('p', { class: 'sheet__title' }, [h('span', { class: 'sheet__t', text: '経費の集計' }), h('span', { class: 'sheet__period', text: '2026年11月1日〜30日' })]),
      h('p', { class: 'sheet__shop' }, [shopName(), icon('stamp')])
    ])
    var cr = catRows().map(function (r) {
      return h('tr', {}, [h('td', { text: r.key === 'none' ? '（未選択）' : r.name }), h('td', { class: 'num', text: r.n + '件' }), h('td', { class: 'num', text: fmtYen(r.sum) }), h('td', { class: 'num', text: fmtShare(r.sum, E.total) })])
    })
    cr.push(h('tr', { class: 'sheet__sum' }, [h('th', { scope: 'row', text: '合計' }), h('td', { class: 'num', text: E.count + '件' }), h('td', { class: 'num sheet__yen', text: fmtYen(E.total) }), h('td', { class: 'num', text: '100%' })]))
    var cats = h('table', { class: 'sheet__cats' }, [
      h('colgroup', {}, [h('col', { class: 'sw-name' }), h('col', { class: 'sw-n' }), h('col', { class: 'sw-sum' }), h('col', { class: 'sw-pct' })]),
      h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: '科目' }), h('th', { scope: 'col', class: 'num', text: '件数' }), h('th', { scope: 'col', class: 'num', text: '合計' }), h('th', { scope: 'col', class: 'num', text: '割合' })])),
      h('tbody', {}, cr)
    ])
    var kids = [head, h('p', { class: 'sheet__h', text: '科目ごとの合計' }), full ? cats : h('div', { class: 'sheet__scroll' }, cats)]
    if (!full) {
      kids.push(h('p', { class: 'sheet__more', text: '※ 印刷すると、この下に支払方法ごとの合計と明細（' + E.count + '件・日付の古い順）が続きます。' }))
      return h('div', { class: 'sheet' }, kids)
    }
    var pays = h('table', { class: 'sheet__pays sheet__cats' }, [
      h('colgroup', {}, [h('col', { class: 'sw-name' }), h('col', { class: 'sw-n' }), h('col', { class: 'sw-sum' }), h('col', { class: 'sw-pct' })]),
      h('thead', {}, h('tr', {}, [h('th', { scope: 'col', text: '支払方法' }), h('th', { scope: 'col', class: 'num', text: '件数' }), h('th', { scope: 'col', class: 'num', text: '合計' }), h('th', { scope: 'col', class: 'num', text: '割合' })])),
      h('tbody', {}, PAYS.map(function (p) {
        return h('tr', {}, [h('td', { text: p.name }), h('td', { class: 'num', text: E.byPay[p.id].n + '件' }), h('td', { class: 'num', text: fmtYen(E.byPay[p.id].sum) }), h('td', { class: 'num', text: fmtShare(E.byPay[p.id].sum, E.total) })])
      }))
    ])
    var detail = h('table', { class: 'sheet__detail' }, [
      h('colgroup', {}, [h('col', { class: 'sw-date' }), h('col', { class: 'sw-payee' }), h('col', { class: 'sw-cat' }), h('col', { class: 'sw-pay' }), h('col', { class: 'sw-amt' }), h('col', { class: 'sw-memo' })]),
      h('thead', {}, h('tr', {}, ['日付', '支払先', '科目', '支払方法', '金額', 'メモ'].map(function (t) { return h('th', { scope: 'col', class: t === '金額' ? 'num' : null, text: t }) }))),
      h('tbody', {}, sortAsc(S.items).map(function (it) {
        return h('tr', {}, [
          h('td', { class: 'nw', text: fmtDay(it.date) }), h('td', { text: it.payee }), h('td', { text: it.cat ? CAT_NAME[it.cat] : '（未選択）' }),
          h('td', { text: PAY_NAME[it.pay] }), h('td', { class: 'num', text: fmtYen(it.amount) }), h('td', { class: 'sheet__memo', text: it.memo })
        ])
      }))
    ])
    kids.push(h('p', { class: 'sheet__h', text: '支払方法ごとの合計' }), pays,
      h('p', { class: 'sheet__h', text: '明細（日付の古い順）' }), detail,
      h('p', { class: 'sheet__dsum', text: '明細の合計 ' + E.count + '件 ' + fmtYen(E.total) }),
      h('p', { class: 'sheet__note', text: '科目の名前と分け方は例です。経費の扱いは税理士さんにご確認ください。' }),
      h('p', { class: 'sheet__foot', text: 'この表は TENKA LAB の制作見本です。お店・支払先・金額はすべて架空です。' }))
    return h('div', { class: 'sheet' }, kids)
  }
  var elPrintRoot = $('print-root')
  var baseTitle = document.title
  function fillPrint () { elPrintRoot.textContent = ''; elPrintRoot.appendChild(buildSheet(true)) }
  $('print-btn').addEventListener('click', function () {
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

  // ---------- 修正・削除の窓（§7-8） ----------
  var edit = $('edit')
  var edPaySeg = makeSeg($('ed-pay'), PAYS, function () { return ui.edPay }, function (v) { ui.edPay = v })
  var editFocusTo = null
  function openEdit (seq) {
    var it = findItem(seq); if (!it) return
    ui.editSeq = seq; ui.errEd = false
    $('ed-meta').textContent = fmtDay(it.date) + ' ' + it.payee + ' ' + fmtYen(it.amount)
    $('ed-date').value = it.date
    $('ed-payee').value = it.payee
    $('ed-amount').value = String(it.amount)
    $('ed-memo').value = it.memo
    ui.edPay = it.pay; edPaySeg.refresh()
    $('ed-cat').value = ''
    updateEdSuggest()
    $('ed-cat').value = it.cat
    showErrors('ed', {})
    editFocusTo = null
    if (typeof edit.showModal === 'function') edit.showModal(); else edit.setAttribute('open', '')
    $('ed-date').focus()
  }
  function updateEdSuggest () {
    var sug = suggestCat(S.items, $('ed-payee').value, ui.editSeq)
    buildCatSelect($('ed-cat'), sug) // 選んだ値は変えない
    showHint($('ed-payee-hint'), $('ed-payee').value, sug)
    setDescribed('ed-payee')
  }
  $('ed-payee').addEventListener('input', function () {
    updateEdSuggest()
    if (ui.errEd) showErrors('ed', readForm('ed').errs)
  })
  ;['ed-date', 'ed-amount'].forEach(function (id) {
    $(id).addEventListener('input', function () { if (ui.errEd) showErrors('ed', readForm('ed').errs) })
  })
  function closeEdit (focusSeqOrEl) {
    editFocusTo = focusSeqOrEl
    if (typeof edit.close === 'function') edit.close(); else { edit.removeAttribute('open'); onEditClosed() }
  }
  function onEditClosed () {
    var t = editFocusTo
    if (t === null || t === undefined) t = ui.editSeq
    var el = typeof t === 'number' ? rowFocusEl(t) : t
    if (!el) el = $('h-list')
    ui.editSeq = null
    el.focus()
  }
  edit.addEventListener('close', onEditClosed)
  edit.addEventListener('cancel', function (e) { e.preventDefault(); closeEdit(ui.editSeq) })
  $('ed-x').addEventListener('click', function () { closeEdit(ui.editSeq) })
  $('ed-cancel').addEventListener('click', function () { closeEdit(ui.editSeq) })
  $('edit-form').addEventListener('submit', function (e) {
    e.preventDefault()
    var it = findItem(ui.editSeq); if (!it) { closeEdit(null); return }
    var r = readForm('ed')
    if (!r.ok) { ui.errEd = true; showErrors('ed', r.errs); focusFirstErr('ed', r.errs); return }
    var n = r.rec
    var same = n.date === it.date && n.payee === it.payee && n.amount === it.amount && n.cat === it.cat && n.pay === it.pay && n.memo === it.memo
    if (same) { showToast('変更はありません'); closeEdit(it.seq); return }
    it.date = n.date; it.payee = n.payee; it.amount = n.amount; it.cat = n.cat; it.pay = n.pay; it.memo = n.memo
    saveState()
    ui.newSeq = it.seq
    renderAll()
    closeEdit(it.seq)
    showToast(fmtDay(it.date) + ' ' + it.payee + ' の記録を直しました（11月の合計 ' + fmtYen(E.total) + '）')
  })
  $('ed-del').addEventListener('click', function () {
    var it = findItem(ui.editSeq); if (!it) return
    confirmBox({
      title: 'この記録を削除しますか',
      body: fmtDay(it.date) + ' ' + it.payee + ' ' + fmtYen(it.amount) + '（' + (it.cat ? CAT_NAME[it.cat] : '科目未選択') + '・' + PAY_NAME[it.pay] + '）を削除します。削除すると元に戻せません。',
      ok: '削除する',
      fallback: $('ed-del')
    }).then(function (yes) {
      if (!yes) { $('ed-del').focus(); return }
      // 次の行（なければ前の行、0件なら見出し）にフォーカス
      var vis = visibleItems().map(function (x) { return x.seq })
      var i = vis.indexOf(it.seq)
      var next = i >= 0 ? (vis[i + 1] !== undefined ? vis[i + 1] : vis[i - 1]) : undefined
      S.items = S.items.filter(function (x) { return x.seq !== it.seq })
      saveState()
      renderAll()
      closeEdit(next !== undefined ? next : $('h-list'))
      showToast(fmtDay(it.date) + ' ' + it.payee + ' ' + fmtYen(it.amount) + ' を削除しました（11月の合計 ' + fmtYen(E.total) + '）')
    })
  })

  // ---------- 描き直し（いつも状態から全部） ----------
  function renderAll () {
    E = evaluate(S.items)
    renderSummary()
    renderDatalist()
    renderList()
    renderMonth()
    renderOutput()
  }

  // ---------- 最初の状態に戻す（§10-4） ----------
  $('btn-reset').addEventListener('click', function () {
    confirmBox({ title: '最初の状態に戻しますか', body: '追加・修正・削除をすべて消して、見本の30件に戻します。', ok: '戻す', fallback: $('btn-reset') })
      .then(function (yes) {
        if (!yes) return
        S = initialState()
        saveState()
        resetFilters()
        openTab('entry', { noScroll: true })
        renderAll()
        resetEntryForm()
        showToast('最初の状態に戻しました')
      })
  })

  // 幅が変わったら、スマホ用・PC 用の組み方を作り直す
  function onMq () { renderList(); renderMonth() }
  if (mqPC.addEventListener) mqPC.addEventListener('change', onMq)

  // ---------- はじめ ----------
  S = loadState() || initialState()
  $('note-nosave').hidden = canSave
  fillIcons()
  var hash = (window.location.hash || '').slice(1)
  openTab(TABS.indexOf(hash) >= 0 ? hash : 'entry', { noScroll: true })
  renderAll()
  resetEntryForm()

  // 検査用（読み取りだけ）
  window.MizuharaExpense = {
    state: function () { return JSON.parse(JSON.stringify(S)) },
    evaluate: function () { return JSON.parse(JSON.stringify(evaluate(S.items))) },
    suggest: function (payee) { return suggestCat(S.items, payee, null) },
    csv: function () { return csvText(S.items) },
    canSave: function () { return canSave }
  }
})()
