// ピラティススタジオ ソラノネ（デモ）コース診断
// 外部通信なし・保存なし（状態はメモリと URL のハッシュだけ）。表示はすべて textContent
;(function () {
  'use strict'

  // ---------- 定数（質問・点数・理由の文・コース） ----------
  var QUESTIONS = [
    { title: '運動の経験は、どのくらいですか？', opts: ['ほとんどない', 'ときどきしている（ヨガ・ジムなど）', '産後で、しばらく休んでいる'] },
    { title: 'いちばん気になることは？', hint: true, opts: ['姿勢・体の硬さ', '肩や腰の重さ', '体力に自信がない', 'とくにない・まず試してみたい'] },
    { title: 'ふだんの過ごし方に近いのは？', opts: ['座っている時間が長い', '立ち仕事・家事で動くことが多い', '子育て中で、自分の時間が少ない'] },
    { title: 'どんなレッスンが合いそうですか？', opts: ['少人数で、こまかく見てほしい', 'みんなと、楽しく続けたい', '体調に合わせて、ゆっくり進めたい'] },
    { title: '通えそうな回数は？', opts: ['週1回（月4回）', '月2回くらい'] }
  ]

  // SCORES[問][答え-1][コース]（コース 0＝はじめてのマット、1＝マシンで整える、2＝産後・やさしいペース）
  var SCORES = [
    [[2, 0, 1], [1, 2, 0], [0, 0, 3]],
    [[2, 1, 0], [0, 2, 1], [1, 0, 2], [1, 1, 1]],
    [[1, 2, 0], [2, 0, 1], [0, 0, 2]],
    [[0, 2, 1], [2, 0, 0], [0, 0, 2]],
    [[1, 1, 0], [0, 0, 1]]
  ]

  // 鍵は「問-答え-コース（0始まり）」。2点以上の組み合わせだけ
  var REASONS = {
    '1-1-0': '「運動はほとんどしていない」とのこと。はじめてのマットは、呼吸と基本の動きを1つずつ覚えるところから始めます。',
    '1-2-1': '「ときどき運動している」とのこと。マシンで整えるは、バネの重さを変えて、少し手ごたえのある動きもできます。',
    '1-3-2': '「産後で、しばらく運動を休んでいる」とのこと。産後・やさしいペースは、その日の体調を確かめてから、軽い動きで始めます。',
    '2-1-0': '「姿勢・体の硬さ」が気になるとのこと。はじめてのマットでは、背骨や股関節をゆっくり動かす練習を中心に行います。',
    '2-2-1': '「肩や腰の重さ」が気になるとのこと。マシンの支えを使い、肩まわり・背中・腰まわりをゆっくり動かします。',
    '2-3-2': '「体力に自信がない」とのこと。休みをはさみながら、回数や動きの大きさをその日に合わせて変えます。',
    '3-1-1': '「座っている時間が長い」とのこと。座ったままでは動かしにくい胸や股関節のまわりを、マシンで大きく動かします。',
    '3-2-0': '「立ち仕事・家事で動くことが多い」とのこと。マットの上で横になり、ふだんの体の使い方をゆっくり見直す時間にできます。',
    '3-3-2': '「子育て中で、自分の時間が少ない」とのこと。月2回から通えて、レッスンは1回50分です。',
    '4-1-1': '「少人数で、こまかく見てほしい」とのこと。マシンで整えるは定員3人で、講師が1人ずつ動きを確かめます。',
    '4-2-0': '「みんなと、楽しく続けたい」とのこと。はじめてのマットは定員6人で、同じくらいの経験の方といっしょに進めます。',
    '4-3-2': '「体調に合わせて、ゆっくり進めたい」とのこと。定員4人で、無理のないペースで進めます。'
  }

  var DEFAULTS = [
    ['はじめてのマットは、ピラティスがはじめての方のための入り口のコースです。', '道具はマットだけ。動きに慣れたら、ほかのコースにも移れます。'],
    ['マシンで整えるは、マシンの支えがあるので、動きの位置が分かりやすいコースです。', '定員3人の少人数で行います。'],
    ['産後・やさしいペースは、無理をしないことをいちばんに進めるコースです。', 'その日の体調に合わせて、休みながら参加できます。']
  ]

  var COURSES = [
    { name: 'はじめてのマット', catch: '運動がひさしぶりの方に', times: '月4回', yen: '9,800円（税込・架空）', icon: 'i-mat', cls: 'c-ic--mat', card: 'course-mat' },
    { name: 'マシンで整える', catch: '肩や腰の重さが気になる方に', times: '月4回', yen: '14,800円（税込・架空）', icon: 'i-machine', cls: 'c-ic--machine', card: 'course-machine' },
    { name: '産後・やさしいペース', catch: '体力に不安がある方に', times: '月2回', yen: '6,800円（税込・架空）', icon: 'i-gentle', cls: 'c-ic--gentle', card: 'course-gentle' }
  ]

  var HASH_RE = /^#result=([1-3])-([1-4])-([1-3])-([1-3])-([1-2])$/

  // ---------- 計算（画面はすべてこの結果から作る） ----------
  // 合計 → Q2 の点 → コースの番号 の順で並べる
  function rank (answers) {
    var total = [0, 0, 0]
    var q2 = [0, 0, 0]
    for (var q = 0; q < 5; q++) {
      var row = SCORES[q][answers[q] - 1]
      for (var c = 0; c < 3; c++) total[c] += row[c]
    }
    for (var k = 0; k < 3; k++) q2[k] = SCORES[1][answers[1] - 1][k]
    var order = [0, 1, 2]
    order.sort(function (a, b) { return (total[b] - total[a]) || (q2[b] - q2[a]) || (a - b) })
    return { order: order, total: total }
  }

  // 2点以上の答えの文を Q1→Q5 で最大3行。2行に満たなければ既定の文で2行にする
  function reasons (answers, c) {
    var out = []
    for (var q = 0; q < 5 && out.length < 3; q++) {
      if (SCORES[q][answers[q] - 1][c] >= 2) {
        var t = REASONS[(q + 1) + '-' + answers[q] + '-' + c]
        if (t) out.push(t)
      }
    }
    for (var i = 0; out.length < 2; i++) out.push(DEFAULTS[c][i])
    return out
  }

  // ハッシュをそのまま正規表現で判定。合えば5つの数、合わなければ null
  function parseHash (hash) {
    var m = HASH_RE.exec(hash)
    if (!m) return null
    return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])]
  }

  // ---------- 表示の部品 ----------
  function $ (id) { return document.getElementById(id) }
  var SVGNS = 'http://www.w3.org/2000/svg'
  function icon (id, size) {
    var s = document.createElementNS(SVGNS, 'svg')
    s.setAttribute('width', size); s.setAttribute('height', size)
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    var u = document.createElementNS(SVGNS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }

  // 折れてはいけない語・数字と単位を .nw の span に包んで入れる（HTML の文字列は使わず、要素を作って textContent で入れる）
  var NW_RE = /(とのこと。|ピラティススタジオ ソラノネ|はじめてのマット|マシンで整える|産後・やさしいペース|コース診断|体験レッスン|ピラティス|おすすめ|2番目の候補|定員\d+人|[月週]\d+回|\d[\d,]*(?:円|回|分|人|点|秒|代|つ)(?:（[^）]*）)?)/
  function setText (el, text) {
    while (el.firstChild) el.removeChild(el.firstChild)
    var parts = String(text).split(NW_RE)
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue
      if (i % 2 === 1) {
        var sp = document.createElement('span')
        sp.className = 'nw'
        sp.textContent = parts[i]
        el.appendChild(sp)
      } else {
        el.appendChild(document.createTextNode(parts[i]))
      }
    }
  }

  var srTimer = 0
  function say (text) {
    clearTimeout(srTimer)
    var sr = $('sr-status')
    sr.textContent = ''
    srTimer = setTimeout(function () { sr.textContent = text }, 50)
  }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態 ----------
  var ans = [0, 0, 0, 0, 0]   // 0＝まだ
  var cur = 0                 // いま出している問い（0〜4）
  var showing = false         // 結果を出しているか
  var gen = 0                 // 描き直しの番号（古いボタンのクリックを捨てる）

  function clearHash () {
    if (location.hash && history.replaceState) history.replaceState(null, '', location.pathname + location.search)
  }

  // ---------- 問いの画面 ----------
  function renderQ (q, focus) {
    cur = q
    showing = false
    gen++
    var myGen = gen
    var Q = QUESTIONS[q]
    $('quiz-r').hidden = true
    $('quiz-q').hidden = false
    var pg = $('quiz-progress')
    while (pg.firstChild) pg.removeChild(pg.firstChild)
    var ps = document.createElement('span')
    ps.className = 'nw'
    ps.textContent = '質問 ' + (q + 1) + ' / 5'
    pg.appendChild(ps)
    var bars = $('quiz-bar').children
    for (var b = 0; b < bars.length; b++) bars[b].className = b <= q ? 'is-done' : ''
    $('quiz-title').textContent = Q.title
    $('quiz-hint').hidden = !Q.hint
    var ul = $('quiz-opts')
    while (ul.firstChild) ul.removeChild(ul.firstChild)
    for (var i = 0; i < Q.opts.length; i++) {
      var li = document.createElement('li')
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'q-opt'
      btn.setAttribute('aria-pressed', ans[q] === i + 1 ? 'true' : 'false')
      btn.setAttribute('aria-describedby', 'quiz-title')
      btn.setAttribute('data-v', String(i + 1))
      var n = document.createElement('span')
      n.className = 'q-opt__n'
      n.setAttribute('aria-hidden', 'true')
      n.textContent = String(i + 1)
      n.appendChild(icon('i-ck', 18))
      var t = document.createElement('span')
      t.className = 'q-opt__t'
      setText(t, Q.opts[i])
      btn.appendChild(n); btn.appendChild(t)
      btn.addEventListener('click', (function (v) {
        return function () { if (myGen === gen) choose(q, v) }
      })(i + 1))
      li.appendChild(btn)
      ul.appendChild(li)
    }
    $('quiz-back').hidden = q === 0
    var body = $('quiz-body')
    body.classList.remove('is-in')
    if (!reduced) { void body.offsetWidth; body.classList.add('is-in') }
    setResultMarks(null)
    if (focus) $('quiz-title').focus({ preventScroll: true })
  }

  function choose (q, v) {
    ans[q] = v
    if (q < 4) renderQ(q + 1, true)
    else showResult(true)
  }

  // ---------- 結果の画面 ----------
  function fillCourse (c, prefix) {
    var C = COURSES[c]
    setText($(prefix + '-name'), C.name)
    $(prefix + '-catch').textContent = C.catch
    $(prefix + '-use').setAttribute('href', '#' + C.icon)
    $(prefix + '-ic').className = 'c-ic ' + (prefix === 'best' ? 'c-ic--56 ' : 'c-ic--40 ') + C.cls
  }

  // コースの札「診断のおすすめ」と、申し込みの「診断のおすすめ：」
  function setResultMarks (best) {
    for (var c = 0; c < 3; c++) {
      $(COURSES[c].card).querySelector('.badge--course').hidden = best !== c
    }
    $('apply-diag').hidden = best === null
    $('apply-none').hidden = best !== null
    $('apply-course').textContent = best === null ? '' : COURSES[best].name
  }

  function showResult (focus) {
    var r = rank(ans)
    var best = r.order[0]; var second = r.order[1]
    showing = true
    gen++
    $('quiz-q').hidden = true
    $('quiz-r').hidden = false
    fillCourse(best, 'best')
    fillCourse(second, 'second')
    $('best-times').textContent = COURSES[best].times
    $('best-yen').textContent = COURSES[best].yen
    var ul = $('best-reasons')
    while (ul.firstChild) ul.removeChild(ul.firstChild)
    var rs = reasons(ans, best)
    for (var i = 0; i < rs.length; i++) {
      var li = document.createElement('li')
      li.appendChild(icon('i-check', 18))
      var sp = document.createElement('span')
      setText(sp, rs[i])
      li.appendChild(sp)
      ul.appendChild(li)
    }
    // 点数の内訳（おすすめ順）
    var sl = $('score-list')
    while (sl.firstChild) sl.removeChild(sl.firstChild)
    var fills = []
    for (var k = 0; k < 3; k++) {
      var c = r.order[k]
      var row = document.createElement('li')
      var nm = document.createElement('span'); nm.className = 'score-list__name nw'; nm.textContent = COURSES[c].name
      var bar = document.createElement('span'); bar.className = 'score-list__bar'; bar.setAttribute('aria-hidden', 'true')
      var fill = document.createElement('span'); bar.appendChild(fill)
      fills.push([fill, Math.min(100, r.total[c] * 10)])
      var pt = document.createElement('span'); pt.className = 'score-list__pt nw'; pt.textContent = r.total[c] + '点'
      row.appendChild(nm); row.appendChild(bar); row.appendChild(pt)
      sl.appendChild(row)
    }
    var setFills = function () { for (var f = 0; f < fills.length; f++) fills[f][0].style.width = fills[f][1] + '%' }
    if (reduced) setFills(); else setTimeout(setFills, 30)

    var h = '#result=' + ans.join('-')
    $('quiz-hash').textContent = h
    if (history.replaceState) history.replaceState(null, '', h)
    setResultMarks(best)
    if (focus) $('quiz-r-title').focus({ preventScroll: true })
    say('診断の結果：おすすめは ' + COURSES[best].name + '、2番目は ' + COURSES[second].name + ' です')
  }

  function resetQuiz (focus) {
    ans = [0, 0, 0, 0, 0]
    renderQ(0, focus)
  }

  // ---------- ハッシュ（開いた時・hashchange） ----------
  function applyHash () {
    var h = location.hash
    if (h.indexOf('#result=') !== 0) return
    var a = parseHash(h)
    if (!a) {
      clearHash()
      resetQuiz(false)
      return
    }
    ans = a
    showResult(false)
    // 開いた時は動かさずに即座に移る（CSS の scroll-behavior: smooth を一時的に止める）
    var root = document.documentElement
    var prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    $('shindan').scrollIntoView({ behavior: 'auto', block: 'start' })
    root.style.scrollBehavior = prev
    $('quiz-r-title').focus({ preventScroll: true })
  }

  // ---------- ページ内の移動（ハッシュを変えない） ----------
  function goTo (id, focusEl) {
    var target = $(id)
    if (!target) return false
    var h = focusEl || target.querySelector('[tabindex="-1"]') || target
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
    return true
  }

  function init () {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]')
      if (!a) return
      var hash = a.getAttribute('href')
      if (hash.length < 2) return
      var id = hash.slice(1)
      var focusEl = null
      // ファーストビューのボタン：まだ何も答えていなければ1問目の問いへ
      if (a.id === 'hero-cta' && !showing && cur === 0 && !ans[0]) focusEl = $('quiz-title')
      if (goTo(id, focusEl)) e.preventDefault()
    })

    $('quiz-back').addEventListener('click', function () { if (cur > 0) renderQ(cur - 1, true) })
    $('quiz-back-r').addEventListener('click', function () { clearHash(); renderQ(4, true) })
    $('quiz-again').addEventListener('click', function () {
      clearHash()
      resetQuiz(true)
      say('最初の質問に戻りました')
    })
    $('apply-btn').addEventListener('click', function () { $('apply-msg').hidden = false })

    window.addEventListener('hashchange', applyHash)

    // スマホの固定バー：ファーストビューの主ボタンが見えている間は隠す
    var bar = $('fixbar')
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { bar.classList.toggle('is-hide', en.isIntersecting) })
      })
      io.observe($('hero-cta'))
    }

    renderQ(0, false)
    applyHash()
  }

  // 検査用に計算の関数だけ出す（状態は変えられない。COURSES は画面の文字の元なので、外から書き換えられないよう凍らせて渡す）
  for (var fz = 0; fz < COURSES.length; fz++) Object.freeze(COURSES[fz])
  Object.freeze(COURSES)
  window.SoranoneQuiz = Object.freeze({ rank: rank, reasons: reasons, parseHash: parseHash, COURSES: COURSES })

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
