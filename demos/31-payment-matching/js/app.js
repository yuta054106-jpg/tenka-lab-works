// カフェ ユメツム（デモ）入金の消し込み：請求の一覧と通帳の入金の突き合わせ
// 外部通信なし・保存なし（URL のハッシュも使わない）。入力は候補の radio とボタンだけ
// 日付は決まった暦（日の番号 0 ＝ 2026-10-01（木））で数える。端末の時計・乱数は使わない
// 表示はすべて createElement・textContent・createTextNode
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}

  // ---------- 取引先8社（すべて架空） ----------
  var PARTNERS = Object.freeze({
    A: Object.freeze({ name: '取引先A 雑貨店（架空）', reg: 'ザツカテンA', alias: Object.freeze(['ザツカテンエー']), term: 'eom' }),
    B: Object.freeze({ name: '取引先B 書店（架空）', reg: 'カ)トリヒキサキB', alias: Object.freeze(['ショテンB']), term: 'eom' }),
    C: Object.freeze({ name: '取引先C 花店（架空）', reg: 'ハナヤC', alias: Object.freeze(['ユ)ハナヤC']), term: 'eom' }),
    D: Object.freeze({ name: '取引先D 喫茶店（架空）', reg: 'キツサテンD', alias: Object.freeze([]), term: 'd15' }),
    E: Object.freeze({ name: '取引先E 青果店（架空）', reg: 'セイカテンE', alias: Object.freeze(['セイカE']), term: 'd15' }),
    F: Object.freeze({ name: '取引先F 文具店（架空）', reg: 'カ)ブングテンF', alias: Object.freeze([]), term: 'eom' }),
    G: Object.freeze({ name: '取引先G うつわ店（架空）', reg: 'ウツワテンG', alias: Object.freeze([]), term: 'd15' }),
    H: Object.freeze({ name: '取引先H 民宿（架空）', reg: 'ミンシユクH', alias: Object.freeze(['ヤドH']), term: 'd15' })
  })
  var PARTNER_KEYS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  var TERMS = Object.freeze({ eom: '月末締め・翌月末払い', d15: '月末締め・翌月15日払い' })
  var FEE_MIN = 1
  var FEE_MAX = 880
  // 差額の範囲の文字（例：1〜880円）。定数から作る
  var FEE_RANGE = FEE_MIN + '〜' + fmtYen(FEE_MAX)

  // ---------- 請求15件（税込・架空）。due は期日の日の番号 ----------
  function inv (id, p, month, amount, due) { return Object.freeze({ id: id, p: p, month: month, amount: amount, due: due }) }
  var INVOICES = Object.freeze([
    inv('2026-10-001', 'A', 10, 41250, 60),
    inv('2026-10-003', 'C', 10, 23870, 60),
    inv('2026-10-008', 'G', 10, 9350, 45),
    inv('2026-11-001', 'A', 11, 44995, 91),
    inv('2026-11-002', 'B', 11, 39841, 91),
    inv('2026-11-003', 'C', 11, 25142, 91),
    inv('2026-11-004', 'D', 11, 18700, 75),
    inv('2026-11-005', 'E', 11, 6480, 75),
    inv('2026-11-006', 'E', 11, 7560, 75),
    inv('2026-11-007', 'E', 11, 5940, 75),
    inv('2026-11-008', 'F', 11, 12100, 91),
    inv('2026-11-009', 'G', 11, 15400, 75),
    inv('2026-11-010', 'H', 11, 8800, 75),
    inv('2026-11-011', 'H', 11, 8800, 75),
    inv('2026-11-012', 'H', 11, 4400, 75)
  ])

  // ---------- 通帳の入金12行（架空の口座） ----------
  function dep (id, day, name, amount) { return Object.freeze({ id: id, day: day, name: name, amount: amount }) }
  var DEPOSITS = Object.freeze([
    dep('D01', 61, 'ザツカテンA', 44995),
    dep('D02', 64, 'カ)ブングテンF', 12099),
    dep('D03', 67, 'ハナヤC', 49012),
    dep('D04', 70, 'ミンシユクH', 8800),
    dep('D05', 71, 'セイカE', 14040),
    dep('D06', 74, 'キツサテンD', 17820),
    dep('D07', 75, 'カ)トリヒキサキB', 38960),
    dep('D08', 75, 'ウツワテンG', 24749),
    dep('D09', 78, 'カ)ブングテンF', 12100),
    dep('D10', 78, 'セイカテン', 5940),
    dep('D11', 82, 'ヤドH', 8800),
    dep('D12', 84, 'ザツカテンエー', 40810)
  ])

  // ---------- デモの暦（0 ＝ 2026-10-01（木）… 91 ＝ 2026-12-31（木）） ----------
  var TODAY = 85
  var WD = Object.freeze(['日', '月', '火', '水', '木', '金', '土'])
  function wdOf (d) { return (4 + d) % 7 }
  function monthDay (d) {
    if (d <= 30) return { m: 10, d: d + 1 }
    if (d <= 60) return { m: 11, d: d - 30 }
    return { m: 12, d: d - 60 }
  }

  // ---------- 突き合わせ（整数だけの純粋な関数） ----------
  // 名義を引く：登録の名義 → 別の名義 の順。文字どおりの一致だけ
  function lookupName (name) {
    for (var i = 0; i < PARTNER_KEYS.length; i++) {
      var k = PARTNER_KEYS[i]
      if (PARTNERS[k].reg === name) return { p: k, via: 'reg' }
    }
    for (var j = 0; j < PARTNER_KEYS.length; j++) {
      var k2 = PARTNER_KEYS[j]
      if (PARTNERS[k2].alias.indexOf(name) >= 0) return { p: k2, via: 'alias' }
    }
    return null
  }
  function cmpStr (a, b) { return a < b ? -1 : a > b ? 1 : 0 }
  // 古い順：期日 → 請求番号
  function older (a, b) { return a.due !== b.due ? a.due - b.due : cmpStr(a.id, b.id) }
  // 入金の順：入金日 → 入金番号
  function depOrder (a, b) { return a.day !== b.day ? a.day - b.day : cmpStr(a.id, b.id) }

  // 2件以上で合計がぴったりの組（古い順に並べた list の位置の配列）。件数の少ない組 → 古い組
  function bestBundle (list, amount) {
    var best = null
    function better (a, b) {
      if (a.length !== b.length) return a.length < b.length
      for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] < b[i] }
      return false
    }
    function walk (start, picked, sum) {
      if (picked.length >= 2 && sum === amount && (!best || better(picked, best))) best = picked.slice()
      for (var i = start; i < list.length; i++) {
        picked.push(i)
        walk(i + 1, picked, sum + list[i].amount)
        picked.pop()
      }
    }
    walk(0, [], 0)
    return best
  }

  function matchAll (invoices, deposits) {
    var invs = invoices.slice().sort(older)
    var deps = deposits.slice().sort(depOrder)
    var used = {}
    var rows = {}
    deps.forEach(function (d) {
      var who = lookupName(d.name)
      if (!who) { rows[d.id] = { kind: 'check', p: null, via: null, invoices: [], diff: null, reason: 'unknown' }; return }
      var mine = invs.filter(function (x) { return x.p === who.p && !used[x.id] })
      var row = { kind: 'check', p: who.p, via: who.via, invoices: [], diff: null, reason: null }
      var hit = null
      // 理由の文の出し分け用（未入金が1件だけなら「2件以上の合計」の句を出さない）
      row.openCount = mine.length
      if (!mine.length) row.reason = 'noopen'
      else {
        // 1／4 ぴったり（一番古い1件）
        for (var i = 0; i < mine.length; i++) { if (mine[i].amount === d.amount) { hit = [mine[i]]; row.kind = 'exact'; break } }
        // 2 手数料（差の一番小さい1件。同じ差なら古い方）
        if (!hit) {
          var fb = null
          mine.forEach(function (x) {
            var df = x.amount - d.amount
            if (df >= FEE_MIN && df <= FEE_MAX && (!fb || df < fb.amount - d.amount)) fb = x
          })
          if (fb) { hit = [fb]; row.kind = 'fee' }
        }
        // 3 まとめて
        if (!hit) {
          var b = bestBundle(mine, d.amount)
          if (b) { hit = b.map(function (k) { return mine[k] }); row.kind = 'bundle' }
        }
        if (!hit) row.reason = 'mismatch'
      }
      if (hit) {
        var sum = 0
        hit.forEach(function (x) { used[x.id] = true; sum += x.amount })
        row.invoices = hit.map(function (x) { return x.id })
        row.diff = sum - d.amount
      }
      rows[d.id] = row
    })
    return {
      rows: rows,
      open: invs.filter(function (x) { return !used[x.id] }).map(function (x) { return x.id }),
      inv: invs,
      dep: deps
    }
  }

  function findIn (list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i] }
    return null
  }
  // 要確認の候補（3件まで）。名義が分かった時はその取引先の未入金だけ
  function candidates (result, depositId) {
    var row = result.rows[depositId]
    var d = findIn(result.dep, depositId)
    if (!row || !d || row.kind !== 'check' || row.reason === 'noopen') return []
    var pool = result.open.map(function (id) { return findIn(result.inv, id) })
    if (row.reason === 'mismatch') pool = pool.filter(function (x) { return x.p === row.p })
    function gap (x) { var g = x.amount - d.amount; return g < 0 ? -g : g }
    pool.sort(function (a, b) { return gap(a) !== gap(b) ? gap(a) - gap(b) : older(a, b) })
    return pool.slice(0, 3).map(function (x) { return { id: x.id, amount: x.amount, diff: x.amount - d.amount } })
  }
  // 手で消し込む（元の結果は変えない）。候補に無い請求は当てない
  function manual (result, depositId, invoiceId) {
    var ok = candidates(result, depositId).some(function (c) { return c.id === invoiceId })
    if (!ok) return result
    var x = findIn(result.inv, invoiceId)
    var d = findIn(result.dep, depositId)
    var old = result.rows[depositId]
    var rows = {}
    Object.keys(result.rows).forEach(function (k) { rows[k] = result.rows[k] })
    rows[depositId] = { kind: 'manual', p: old.p, via: old.via, invoices: [invoiceId], diff: x.amount - d.amount, reason: null }
    return {
      rows: rows,
      open: result.open.filter(function (id) { return id !== invoiceId }),
      inv: result.inv,
      dep: result.dep
    }
  }
  function summary (result) {
    var s = { exact: 0, fee: 0, bundle: 0, manual: 0, check: 0, alias: 0, aliasExact: 0, feeTotal: 0, bundleInvoices: 0, openCount: 0, openTotal: 0, lateCount: 0, lateTotal: 0 }
    Object.keys(result.rows).forEach(function (k) {
      var r = result.rows[k]
      s[r.kind]++
      if (r.via === 'alias' && r.kind !== 'check') s.alias++
      if (r.via === 'alias' && r.kind === 'exact') s.aliasExact++
      if (r.kind === 'fee') s.feeTotal += r.diff
      if (r.kind === 'bundle') s.bundleInvoices += r.invoices.length
    })
    result.open.forEach(function (id) {
      var x = findIn(result.inv, id)
      s.openCount++
      s.openTotal += x.amount
      if (TODAY - x.due > 0) { s.lateCount++; s.lateTotal += x.amount }
    })
    return s
  }
  // 未入金の一覧：過ぎた日数の多い順 → 期日の早い順 → 請求番号の順
  function openList (result) {
    return result.open.map(function (id) {
      var x = findIn(result.inv, id)
      return { id: x.id, p: x.p, amount: x.amount, due: x.due, late: TODAY - x.due }
    }).sort(function (a, b) {
      var la = a.late > 0 ? a.late : 0
      var lb = b.late > 0 ? b.late : 0
      if (la !== lb) return lb - la
      if (a.due !== b.due) return a.due - b.due
      return cmpStr(a.id, b.id)
    })
  }

  // ---------- 書き方 ----------
  function fmtYen (n) {
    var neg = n < 0
    var s = String(neg ? -n : n)
    var out = ''
    while (s.length > 3) {
      out = ',' + s.slice(s.length - 3) + out
      s = s.slice(0, s.length - 3)
    }
    return (neg ? '-' : '') + s + out + '円'
  }
  function fmtDay (d) { var p = monthDay(d); return p.m + '月' + p.d + '日（' + WD[wdOf(d)] + '）' }
  function fmtDayY (d) { return '2026年' + fmtDay(d) }
  function fmtCount (n) { return n + '件' }
  function fmtDiff (x) {
    if (x > 0) return '入金が' + fmtYen(x) + '少ない'
    if (x < 0) return '入金が' + fmtYen(-x) + '多い'
    return '差なし'
  }
  function fmtDue (due, today) {
    var g = today - due
    if (g > 0) return '期日を' + g + '日過ぎています'
    if (g === 0) return '今日が期日です'
    return '期日まであと' + (-g) + '日'
  }
  function fmtPartner (k) { return PARTNERS[k].name }

  // ---------- 読み上げの文 ----------
  var M3 = '突き合わせました。やり直すには「最初に戻す」を押してください。'
  var GO_WHY = '当てる請求を選んでください。'
  function srText (what, result, depositId, invoiceId) {
    if (what === 'reset') return '最初の状態に戻しました。まだ突き合わせていません。'
    if (what === 'disabled') return M3
    if (what === 'go-why') return GO_WHY
    var s = summary(result)
    if (what === 'run') {
      return '突き合わせました。消し込み済み' + fmtCount(s.exact) + '、手数料差し引き' + fmtCount(s.fee) + '、まとめて入金' + fmtCount(s.bundle) + '、要確認' + fmtCount(s.check) + 'です。未入金は' + fmtCount(s.openCount) + '、合計' + fmtYen(s.openTotal) + 'です。'
    }
    if (what === 'manual') {
      return '入金 ' + depositId + 'を、' + invoiceId + 'に消し込みました。要確認は残り' + fmtCount(s.check) + '、未入金の合計は' + fmtYen(s.openTotal) + 'です。'
    }
    return ''
  }

  root.__demo31 = Object.freeze({
    PARTNERS: PARTNERS, PARTNER_KEYS: PARTNER_KEYS, INVOICES: INVOICES, DEPOSITS: DEPOSITS, FEE_MIN: FEE_MIN, FEE_MAX: FEE_MAX, FEE_RANGE: FEE_RANGE,
    TODAY: TODAY, WD: WD, wdOf: wdOf, lookupName: lookupName, older: older, matchAll: matchAll, candidates: candidates,
    manual: manual, summary: summary, openList: openList, fmtYen: fmtYen, fmtDay: fmtDay, fmtDayY: fmtDayY, fmtDiff: fmtDiff,
    fmtDue: fmtDue, fmtCount: fmtCount, fmtPartner: fmtPartner, srText: srText
  })

  if (typeof document === 'undefined' || !document.createElement) return

  // ====================================================================
  // 画面
  // ====================================================================
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function nw (text, cls) { return el('span', 'nw' + (cls ? ' ' + cls : ''), text) }
  function txt (t) { return document.createTextNode(t) }
  function hid (t) { return el('span', 'visually-hidden', t) }
  function add (parent, kids) { kids.forEach(function (k) { if (k) parent.appendChild(typeof k === 'string' ? txt(k) : k) }); return parent }
  var SVGNS = 'http://www.w3.org/2000/svg'
  function icon (id, size, cls) {
    var s = document.createElementNS(SVGNS, 'svg')
    s.setAttribute('width', String(size))
    s.setAttribute('height', String(size))
    s.setAttribute('aria-hidden', 'true')
    s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(SVGNS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  function clear (node) { while (node.firstChild) node.removeChild(node.firstChild) }
  // 取引先の名：「取引先A」と「雑貨店（架空）」の間でだけ折れる
  function partnerParts (k, cls) {
    var n = PARTNERS[k].name
    var i = n.indexOf(' ')
    return add(el('span', cls || 'pname'), [nw(n.slice(0, i)), ' ', nw(n.slice(i + 1))])
  }

  var STATUS = Object.freeze({
    exact: Object.freeze({ label: '消し込み済み', icon: 'i-tick' }),
    fee: Object.freeze({ label: '手数料差し引き', icon: 'i-fee' }),
    bundle: Object.freeze({ label: 'まとめて入金', icon: 'i-docs' }),
    manual: Object.freeze({ label: '手で消し込み', icon: 'i-pencil' }),
    check: Object.freeze({ label: '要確認', icon: 'i-alert' })
  })
  function statusTag (kind) {
    var S = STATUS[kind]
    return add(el('span', 'status status--' + kind + ' nw'), [icon(S.icon, 16), S.label])
  }
  function aliasTag () { return el('span', 'alias-tag nw', '別の名義で一致') }

  var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態（画面の中だけ。保存しない） ----------
  var state = { result: null, sel: {} }

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  var srLast = ''
  // 500ms 何も変わらなければ1回だけ。前と同じ文なら一度空にして 50ms 後に入れる
  function say (text) {
    clearTimeout(srTimer)
    if (!text) return
    srTimer = setTimeout(function () {
      var sr = $('sr-status')
      if (text === srLast) {
        sr.textContent = ''
        srTimer = setTimeout(function () { sr.textContent = text }, 50)
        return
      }
      srLast = text
      sr.textContent = text
    }, 500)
  }

  // ---------- ページ内移動（ハッシュを変えない） ----------
  function goTo (id) {
    var target = $(id)
    if (!target) return
    var h = target.matches('[tabindex="-1"]') ? target : (target.querySelector('[tabindex="-1"]') || target)
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
  }

  // ---------- 突き合わせる前の2つの一覧（表。〜767px はカードの見た目） ----------
  function td (cls, label, kids) {
    var c = add(el('td', cls), kids)
    if (label) c.setAttribute('data-label', label)
    return c
  }
  function buildData () {
    var tp = $('tb-partners')
    PARTNER_KEYS.forEach(function (k) {
      var P = PARTNERS[k]
      var tr = el('tr')
      add(tr, [
        add(el('th', 'c-name'), [partnerParts(k)]),
        td('c-reg', '登録', [nw(P.reg, 'kana')]),
        td('c-alias', '別の名義', P.alias.length ? P.alias.map(function (a, i) { return nw(a, 'kana') }) : ['なし']),
        td('c-term', '', [TERMS[P.term]])
      ])
      tp.appendChild(tr)
    })
    var ti = $('tb-inv')
    INVOICES.forEach(function (x) {
      ti.appendChild(add(el('tr'), [
        add(el('th', 'c-id'), [nw(x.id)]),
        td('c-p', '', [partnerParts(x.p)]),
        td('c-amt', '', [nw(fmtYen(x.amount))]),
        td('c-due', '期日', [nw(fmtDay(x.due))])
      ]))
    })
    var tdp = $('tb-dep')
    DEPOSITS.forEach(function (d) {
      tdp.appendChild(add(el('tr'), [
        add(el('th', 'c-id'), [nw(d.id)]),
        td('c-day', '', [nw(fmtDay(d.day))]),
        td('c-name', '', [nw(d.name, 'kana')]),
        td('c-amt', '', [nw(fmtYen(d.amount))])
      ]))
    })
  }

  // ---------- まとめのタイル ----------
  function tile (kind, n, subKids, link) {
    var li = el('li', 'tile tile--' + kind)
    li.appendChild(add(el('p', 'tile__head'), [statusTag(kind)]))
    li.appendChild(add(el('p', 'tile__num'), [add(el('span', 'nw'), [String(n), el('span', 'tile__unit', '件')])]))
    if (subKids) li.appendChild(add(el('p', 'tile__sub'), subKids))
    if (link) li.appendChild(link)
    return li
  }
  function pageLink (text, onGo) {
    var a = el('a', 'inline-link tile__link', text)
    a.href = '#result'
    a.addEventListener('click', function (e) { e.preventDefault(); onGo() })
    return a
  }
  function renderSum () {
    var box = $('sum')
    clear(box)
    if (!state.result) {
      box.appendChild(el('p', 'match__empty', 'ボタンを押すと、ここに件数と未入金の合計が出ます。'))
      return
    }
    var s = summary(state.result)
    var ul = el('ul', 'tiles')
    ul.appendChild(tile('exact', s.exact, s.aliasExact ? ['うち', nw('別の名義で一致'), ' ', nw(fmtCount(s.aliasExact))] : null))
    ul.appendChild(tile('fee', s.fee, ['振込手数料の差額 ', nw(fmtYen(s.feeTotal))]))
    ul.appendChild(tile('bundle', s.bundle, ['当てた請求 ', nw(fmtCount(s.bundleInvoices))]))
    ul.appendChild(tile('manual', s.manual, s.manual ? null : ['要確認から選んで消し込めます']))
    var firstCheck = null
    state.result.dep.forEach(function (d) { if (!firstCheck && state.result.rows[d.id].kind === 'check') firstCheck = d.id })
    ul.appendChild(tile('check', s.check, s.check ? ['結果の一覧で確かめてください'] : null,
      firstCheck ? pageLink('要確認へ', function () { goTo('pay-' + firstCheck + '-h') }) : null))
    var op = el('li', 'tile tile--open')
    op.appendChild(el('p', 'tile__label', '未入金の合計'))
    var yen = fmtYen(s.openTotal)
    op.appendChild(add(el('p', 'tile__num tile__num--yen'), [add(el('span', 'nw'), [yen.slice(0, -1), el('span', 'tile__unit', '円')])]))
    op.appendChild(add(el('p', 'tile__sub'), [nw(fmtCount(s.openCount)), '・うち期日を過ぎたもの ', nw(fmtCount(s.lateCount)), ' ', nw(fmtYen(s.lateTotal))]))
    var a = el('a', 'inline-link tile__link', '未入金の一覧へ')
    a.href = '#open'
    a.addEventListener('click', function (e) { e.preventDefault(); goTo('open') })
    op.appendChild(a)
    ul.appendChild(op)
    box.appendChild(ul)
  }

  // ---------- 結果の一覧 ----------
  function invLine (id) {
    var x = findIn(INVOICES, id)
    return add(el('li', 'pay__inv'), [
      add(el('span', 'pay__inv-top'), [nw(x.id, 'pay__inv-id'), hid('、'), ' ', partnerParts(x.p, 'pay__inv-p')]),
      hid('、'),
      add(el('span', 'pay__inv-bot'), [
        add(el('span', 'pay__inv-sub'), [x.month + '月分・期日 ', nw(fmtDay(x.due))]),
        hid('、'),
        nw(fmtYen(x.amount), 'pay__inv-amt')
      ])
    ])
  }
  function invBlock (label, ids) {
    var wrap = el('div', 'pay__invs-wrap')
    wrap.appendChild(el('p', 'pay__label', label))
    var ul = el('ul', 'pay__invs')
    ids.forEach(function (id) { ul.appendChild(invLine(id)) })
    wrap.appendChild(ul)
    return wrap
  }
  function diffLine (label, valKids, cls) {
    return add(el('p', 'pay__diff'), [el('span', 'pay__diff-label', label), ' ', add(el('span', 'pay__diff-val' + (cls ? ' ' + cls : '')), valKids)])
  }
  function reasonText (row) {
    if (row.reason === 'unknown') return ['この振込名義は、取引先の表（登録の名義・別の名義）にありません。実際のページでは、ここから別の名義に足せます。']
    if (row.reason === 'noopen') return [partnerParts(row.p), 'には、未入金の請求がありません。二重の振込か、先の分の入金かを確かめてください。']
    var tail = row.openCount > 1 ? '）にも、2件以上の合計にも当たりません。' : '）にも当たりません。'
    return [partnerParts(row.p), 'の未入金の請求と、金額が合いません。振込手数料の差額（', nw(FEE_RANGE), tail]
  }
  function candBlock (d, cands) {
    var frag = document.createDocumentFragment()
    if (!cands.length) { frag.appendChild(el('p', 'pay__none', '当てられる請求がありません。')); return frag }
    var fs = el('fieldset', 'cands')
    fs.appendChild(add(el('legend', 'cands__title'), ['当てる請求を選んでください（候補', nw(fmtCount(cands.length)), '）']))
    var pick = state.sel[d.id]
    var name = 'cand-' + d.id
    cands.forEach(function (c) {
      var x = findIn(INVOICES, c.id)
      var input = el('input', 'cand__input visually-hidden')
      input.type = 'radio'
      input.name = name
      input.value = c.id
      if (pick === c.id) input.checked = true
      input.addEventListener('change', function () {
        if (!input.checked) return
        state.sel[d.id] = c.id
        var go = $('go-' + d.id)
        go.removeAttribute('aria-disabled')
        $('go-why-' + d.id).hidden = true
      })
      var face = add(el('span', 'cand__face'), [
        el('span', 'cand__dot'),
        add(el('span', 'cand__body'), [
          add(el('span', 'cand__l1'), [nw(c.id, 'cand__id'), hid('、'), partnerParts(x.p, 'cand__p')]),
          hid('、'),
          add(el('span', 'cand__l2'), [nw(fmtYen(c.amount), 'cand__amt'), hid('、'), el('span', 'cand__sep', '・'), nw(fmtDiff(c.diff), 'cand__diff')])
        ])
      ])
      face.firstChild.setAttribute('aria-hidden', 'true')
      face.querySelector('.cand__sep').setAttribute('aria-hidden', 'true')
      fs.appendChild(add(el('label', 'cand'), [input, face]))
    })
    frag.appendChild(fs)
    var go = el('button', 'btn-sub cands__go', 'この請求で消し込む')
    go.type = 'button'
    go.id = 'go-' + d.id
    go.setAttribute('aria-describedby', 'go-why-' + d.id)
    if (!pick) go.setAttribute('aria-disabled', 'true')
    go.addEventListener('click', function () { onGo(d.id) })
    frag.appendChild(go)
    var why = el('p', 'cands__why', GO_WHY)
    why.id = 'go-why-' + d.id
    if (pick) why.hidden = true
    frag.appendChild(why)
    return frag
  }
  function payCard (d) {
    var row = state.result.rows[d.id]
    var li = el('li', 'pay pay--' + row.kind)
    li.id = 'pay-' + d.id
    var h = el('h3', 'pay__title')
    h.id = 'pay-' + d.id + '-h'
    h.setAttribute('tabindex', '-1')
    var dot = el('span', null, '・')
    dot.setAttribute('aria-hidden', 'true')
    add(h, [
      add(el('span', 'pay__meta'), [nw('入金 ' + d.id), hid('、'), dot, nw(fmtDay(d.day))]),
      hid('、'),
      add(el('span', 'pay__row'), [nw(d.name, 'pay__name kana'), hid('、'), nw(fmtYen(d.amount), 'pay__amt')])
    ])
    li.appendChild(h)
    var st = add(el('p', 'pay__status'), [hid('判定：'), statusTag(row.kind)])
    if (row.via === 'alias' && row.kind !== 'check') { st.appendChild(hid('、')); st.appendChild(aliasTag()) }
    li.appendChild(st)
    if (row.kind === 'exact') {
      li.appendChild(invBlock('当てた請求', row.invoices))
      li.appendChild(diffLine('差額', [nw('0円')]))
    } else if (row.kind === 'fee') {
      li.appendChild(invBlock('当てた請求', row.invoices))
      li.appendChild(diffLine('振込手数料の差額', [nw(fmtYen(row.diff))], 'pay__diff-val--fee'))
    } else if (row.kind === 'bundle') {
      var sum = 0
      row.invoices.forEach(function (id) { sum += findIn(INVOICES, id).amount })
      li.appendChild(invBlock('当てた請求（' + fmtCount(row.invoices.length) + '）', row.invoices))
      li.appendChild(diffLine('差額', [nw('0円'), '（', nw(fmtCount(row.invoices.length)), 'の合計 ', nw(fmtYen(sum)), '）']))
    } else if (row.kind === 'manual') {
      li.appendChild(invBlock('当てた請求（手で選んだもの）', row.invoices))
      li.appendChild(diffLine('差額', [nw(row.diff === 0 ? '0円' : fmtDiff(row.diff))]))
    } else {
      li.appendChild(add(el('p', 'pay__reason'), reasonText(row)))
      li.appendChild(candBlock(d, candidates(state.result, d.id)))
    }
    return li
  }
  function renderPays () {
    var ol = $('pays')
    clear(ol)
    if (!state.result) { ol.hidden = true; $('result-empty').hidden = false; return }
    $('result-empty').hidden = true
    ol.hidden = false
    // 表示は入金番号の順
    DEPOSITS.forEach(function (d) { ol.appendChild(payCard(findIn(state.result.dep, d.id))) })
  }

  // ---------- 未入金の一覧 ----------
  function renderOpen () {
    var box = $('open-body')
    clear(box)
    if (!state.result) { box.appendChild(el('p', 'open__empty', '「突き合わせる」を押すと、ここに未入金の請求が出ます。')); return }
    var s = summary(state.result)
    box.appendChild(add(el('p', 'open__total'), [
      el('span', 'open__total-label', '未入金 '), nw(fmtCount(s.openCount), 'open__total-count'), el('span', 'open__total-label', '・'), nw(fmtYen(s.openTotal), 'open__total-yen')
    ]))
    var list = openList(state.result)
    if (!list.length) { box.appendChild(el('p', 'open__empty', '未入金の請求はありません。')); return }
    var tbl = el('table', 'tbl tbl--open')
    tbl.appendChild(el('caption', 'visually-hidden', '未入金の請求（期日を過ぎたものが上）'))
    var thead = el('thead')
    thead.appendChild(add(el('tr'), ['請求番号', '取引先', '請求額', '支払期日', '期日の状態'].map(function (t, i) {
      var th = el('th', ['c-id', 'c-p', 'c-amt', 'c-due', 'c-state'][i], t)
      th.setAttribute('scope', 'col')
      return th
    })))
    tbl.appendChild(thead)
    var tb = el('tbody')
    list.forEach(function (x) {
      var late = x.late > 0
      var stateCell = td('c-state', '', [late ? icon('i-alert', 16) : null, nw(fmtDue(x.due, TODAY))])
      var tr = add(el('tr', 'open-row' + (late ? ' open-row--late' : '')), [
        add(el('th', 'c-id'), [nw(x.id)]),
        td('c-p', '', [partnerParts(x.p)]),
        td('c-amt', '', [nw(fmtYen(x.amount))]),
        td('c-due', '期日', [nw(fmtDay(x.due))]),
        stateCell
      ])
      tr.firstChild.setAttribute('scope', 'row')
      tb.appendChild(tr)
    })
    tbl.appendChild(tb)
    box.appendChild(tbl)
  }

  // ---------- 突き合わせる・最初に戻す ----------
  function renderMatch () {
    var run = $('run')
    if (state.result) {
      run.setAttribute('aria-disabled', 'true')
      $('run-note').textContent = M3
      $('reset').hidden = false
    } else {
      run.removeAttribute('aria-disabled')
      $('run-note').textContent = '請求 15件と、通帳の入金 12行を突き合わせます。'
      $('reset').hidden = true
    }
  }
  function render () {
    renderMatch()
    renderSum()
    renderPays()
    renderOpen()
  }
  function onRun () {
    if (state.result) { say(srText('disabled')); return }
    state.result = matchAll(INVOICES, DEPOSITS)
    state.sel = {}
    render()
    goTo('result')
    say(srText('run', state.result))
  }
  function onReset () {
    state.result = null
    state.sel = {}
    render()
    $('run').focus()
    say(srText('reset'))
  }
  function onGo (depId) {
    var pick = state.sel[depId]
    if (!state.result || !pick) { say(GO_WHY); return }
    var next = manual(state.result, depId, pick)
    if (next === state.result) { say(GO_WHY); return }
    state.result = next
    delete state.sel[depId]
    // ほかのカードで選んでいた候補が無くなったら、選択を外す
    Object.keys(state.sel).forEach(function (k) {
      if (!candidates(state.result, k).some(function (c) { return c.id === state.sel[k] })) delete state.sel[k]
    })
    render()
    $('pay-' + depId + '-h').focus()
    say(srText('manual', state.result, depId, pick))
  }

  function init () {
    buildData()
    $('run').addEventListener('click', onRun)
    $('reset').addEventListener('click', onReset)
    $('to-match').addEventListener('click', function (e) { e.preventDefault(); goTo('match') })
    document.querySelector('.hd__logo').addEventListener('click', function (e) { e.preventDefault(); goTo('top') })
    state = { result: null, sel: {} }
    render()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
