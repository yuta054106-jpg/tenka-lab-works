// ラーメン ユキノメ（デモ）お給料の目安
// 外部通信なし・保存なし（状態はメモリと URL のハッシュだけ）。表示はすべて textContent
// 金額は整数だけで計算する（小数の掛け算・丸めの関数は使わない）
;(function () {
  'use strict'

  // ---------- 定数 ----------
  var JOBS = Object.freeze({
    hall: Object.freeze({ name: 'ホール', wage: 1200, wageLabel: '1,200円', nightLabel: '1,500円' }),
    kitchen: Object.freeze({ name: 'キッチン', wage: 1250, wageLabel: '1,250円', nightLabel: '1,562.5円' })
  })
  // 22:00〜翌5:00（始まりの日の 0:00 からの分。始まりは 9:00 以降なので、この1つの区間だけ見ればよい）
  var NIGHT = Object.freeze([1320, 1740])
  var FARE_CAP = 800 // 交通費の1日の上限（架空）
  var WEEKS_NUM = 43
  var WEEKS_DEN = 10 // 1か月 ＝ 4.3週

  function range (from, to, step) { var a = []; for (var v = from; v <= to; v += step) a.push(v); return Object.freeze(a) }
  var START_OPTS = range(540, 1710, 30) // 9:00〜翌4:30（40個）
  var END_OPTS = range(570, 1860, 30) // 9:30〜翌7:00（44個）
  var FARES = range(0, 1200, 100) // 0〜1,200円（13個）
  var BRKS = Object.freeze([0, 30, 60])

  var DEFAULTS = Object.freeze({ job: 'hall', start: 1020, end: 1320, brk: 0, days: 3, fare: 0 })
  var PRESETS = Object.freeze({
    lunch: Object.freeze({ label: '昼の番（ホール）', job: 'hall', start: 630, end: 900, brk: 0, days: 3 }),
    evening: Object.freeze({ label: '夜の番（ホール）', job: 'hall', start: 1020, end: 1320, brk: 0, days: 3 }),
    late: Object.freeze({ label: '遅番（キッチン）', job: 'kitchen', start: 1200, end: 1530, brk: 30, days: 2 })
  })

  var MSG = Object.freeze({
    E1: '終わりの時刻が、始まりの時刻と同じです。終わりの時刻を選び直してください。',
    E2: '終わりの時刻が、始まりの時刻より前です。日付をまたぐ時は「翌」のついた時刻を選んでください。',
    E3: '休憩が、お店にいる時間と同じか、それより長くなっています。休憩を短くするか、時刻を選び直してください。',
    E4: '休憩を除いて8時間を超える組み合わせは、このデモでは計算しません（8時間を超える分は、割増の計算が変わることがあるため）。',
    E5: '休憩を除いて6時間を超えて働く日は、45分以上の休憩が必要です（労働基準法）。休憩を「60分」にしてください。',
    E6: '1週間に働く時間（休憩を除く）が40時間を超える組み合わせは、このデモでは計算しません（40時間を超える分は、割増の計算が変わることがあるため）。週の日数を減らしてください。'
  })
  // エラーの時に aria-invalid を付ける所
  var INVALID_AT = Object.freeze({ E1: 'end', E2: 'end', E3: 'brk', E4: 'end', E5: 'brk', E6: 'days' })

  var HASH_RE = /^#pay=(hall|kitchen)-(\d{4})-(\d{4})-(0|30|60)-([1-6])-(0|[1-9]00|1[0-2]00)$/

  // ---------- 書き方 ----------
  function pad2 (n) { return n < 10 ? '0' + n : String(n) }
  // 時刻（画面）：m は始まりの日の 0:00 からの分。1440 以上は「翌」
  function fmtTime (m) {
    var next = m >= 1440
    var t = next ? m - 1440 : m
    return (next ? '翌' : '') + Math.floor(t / 60) + ':' + pad2(t % 60)
  }
  // 時刻（ハッシュ）：HHMM の4けた。翌は 24 を足す
  function hashTime (m) { return String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0') }
  // 時間の長さ
  function fmtDur (min) {
    var h = Math.floor(min / 60)
    var r = min % 60
    if (h && r) return h + '時間' + r + '分'
    if (h) return h + '時間'
    return r + '分'
  }
  // 金額：3けたごとに区切る（区切りは自分で入れる）
  function fmtNum (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3) }
    return s + out
  }
  function fmtYen (n) { return fmtNum(n) + '円' }

  // ---------- 計算 ----------
  // 上から順に見て、最初に当たった1つを返す（当たらなければ null）
  function validate (inp) {
    var span = inp.end - inp.start
    if (span === 0) return 'E1'
    if (span < 0) return 'E2'
    if (inp.brk >= span) return 'E3'
    var work = span - inp.brk
    if (work > 480) return 'E4'
    if (work > 360 && inp.brk < 60) return 'E5'
    if (work * inp.days > 2400) return 'E6'
    return null
  }

  function calcPay (inp) {
    var code = validate(inp)
    if (code) return { ok: false, code: code }
    var span = inp.end - inp.start
    var nightAll = Math.max(0, Math.min(inp.end, NIGHT[1]) - Math.max(inp.start, NIGHT[0]))
    var dayAll = span - nightAll
    // 休憩は深夜でない時間から先に引く
    var brkDay = Math.min(inp.brk, dayAll)
    var brkNight = inp.brk - brkDay
    var dayMin = dayAll - brkDay
    var nightMin = nightAll - brkNight
    var work = dayMin + nightMin
    // 深夜は 1.25倍 ＝ 5/4。1時間 ＝ 60分。分母は 60×4 ＝ 240。1日の合計で1回だけ円未満を四捨五入
    var num = JOBS[inp.job].wage * (4 * dayMin + 5 * nightMin)
    var wageDay = Math.floor(num / 240)
    if ((num % 240) * 2 >= 240) wageDay += 1
    var fareDay = Math.min(inp.fare, FARE_CAP)
    var perDay = wageDay + fareDay
    // 1か月は円未満を切り捨て（目安を多めに見せない）
    var perMonth = Math.floor(perDay * inp.days * WEEKS_NUM / WEEKS_DEN)
    return { ok: true, span: span, nightAll: nightAll, dayAll: dayAll, brkDay: brkDay, brkNight: brkNight, dayMin: dayMin, nightMin: nightMin, work: work, wageDay: wageDay, fareDay: fareDay, perDay: perDay, perMonth: perMonth, weekMin: work * inp.days }
  }

  function buildHash (inp) {
    return '#pay=' + inp.job + '-' + hashTime(inp.start) + '-' + hashTime(inp.end) + '-' + inp.brk + '-' + inp.days + '-' + inp.fare
  }

  // ハッシュをそのまま比べる（デコードしない）。正しければ入力、不正なら null
  function parseHash (hash) {
    var m = HASH_RE.exec(hash)
    if (!m) return null
    var toMin = function (s) {
      var hh = Number(s.slice(0, 2)); var mm = Number(s.slice(2))
      if (mm !== 0 && mm !== 30) return -1
      return hh * 60 + mm
    }
    var start = toMin(m[2]); var end = toMin(m[3])
    if (START_OPTS.indexOf(start) < 0 || END_OPTS.indexOf(end) < 0) return null
    var inp = { job: m[1], start: start, end: end, brk: Number(m[4]), days: Number(m[5]), fare: Number(m[6]) }
    if (FARES.indexOf(inp.fare) < 0) return null
    if (validate(inp)) return null
    return inp
  }

  // ---------- 表示の部品 ----------
  function $ (id) { return document.getElementById(id) }
  function clear (el) { while (el.firstChild) el.removeChild(el.firstChild) }
  function nw (text) { var s = document.createElement('span'); s.className = 'nw'; s.textContent = text; return s }
  // 部品を順に入れる（文字列はそのまま文字、配列の要素は折れない span）
  function fill (el, parts) {
    clear(el)
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]
      if (typeof p === 'string') el.appendChild(document.createTextNode(p))
      else el.appendChild(nw(p[0]))
    }
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  var srLast = ''
  // 値を変えてから 500ms 何も変わらなければ1回だけ。前と同じ文なら入れない
  function sayLater (text) {
    clearTimeout(srTimer)
    srTimer = setTimeout(function () {
      if (text === srLast) return
      srLast = text
      $('sr-status').textContent = text
    }, 500)
  }
  // 同じ文でも読ませる（一度空にして 50ms 後に入れる）
  function sayAgain (text) {
    clearTimeout(srTimer)
    var sr = $('sr-status')
    sr.textContent = ''
    srTimer = setTimeout(function () { srLast = text; sr.textContent = text }, 50)
  }
  function resultText (r) {
    return r.ok ? 'お給料の目安は、1日 ' + fmtYen(r.perDay) + '、1か月 ' + fmtYen(r.perMonth) + 'です。' : '計算できません。' + MSG[r.code]
  }

  // ---------- 入力の読み書き ----------
  function makeOptions (sel, list, label) {
    for (var i = 0; i < list.length; i++) {
      var o = document.createElement('option')
      o.value = String(list[i])
      o.textContent = label(list[i])
      sel.appendChild(o)
    }
  }
  function radioVal (name) {
    var r = document.querySelector('input[name="' + name + '"]:checked')
    return r ? r.value : ''
  }
  function setRadio (name, v) {
    var list = document.querySelectorAll('input[name="' + name + '"]')
    for (var i = 0; i < list.length; i++) list[i].checked = list[i].value === String(v)
  }
  function readInput () {
    return {
      job: radioVal('job') === 'kitchen' ? 'kitchen' : 'hall',
      start: Number($('pay-start').value),
      end: Number($('pay-end').value),
      brk: Number(radioVal('brk')),
      days: Number(radioVal('days')),
      fare: Number($('pay-fare').value)
    }
  }
  function writeInput (inp) {
    setRadio('job', inp.job)
    $('pay-start').value = String(inp.start)
    $('pay-end').value = String(inp.end)
    setRadio('brk', inp.brk)
    setRadio('days', inp.days)
    if (inp.fare !== undefined) $('pay-fare').value = String(inp.fare)
  }

  function clearHash () {
    if (location.hash.indexOf('#pay=') === 0 && history.replaceState) history.replaceState(null, '', location.pathname + location.search)
  }

  // ---------- 結果の表示 ----------
  function render (inp) {
    var r = calcPay(inp)
    var J = JOBS[inp.job]
    // aria-invalid をいったん全部外す
    var spots = { end: [$('pay-end')], brk: [$('f-brk')], days: [$('f-days')] }
    Object.keys(spots).forEach(function (k) {
      spots[k].forEach(function (el) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby') })
    })
    var err = $('pay-err')
    if (!r.ok) {
      err.hidden = false
      $('pay-err-text').textContent = MSG[r.code]
      $('pay-sum').hidden = true
      $('pay-break-wrap').hidden = true
      $('pay-hash-line').hidden = true
      spots[INVALID_AT[r.code]].forEach(function (el) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'pay-err-text') })
      return r
    }
    err.hidden = true
    $('pay-err-text').textContent = ''
    $('pay-sum').hidden = false
    $('pay-break-wrap').hidden = false
    $('pay-hash-line').hidden = false
    $('pay-day').textContent = fmtNum(r.perDay)
    $('pay-month').textContent = fmtNum(r.perMonth)
    fill($('pay-formula'), ['1日 ', [fmtYen(r.perDay)], ' × ', ['週' + inp.days + '日'], ' × ', ['4.3週'], '（円未満は切り捨て）'])
    fill($('pb-span'), [[fmtTime(inp.start) + '〜' + fmtTime(inp.end)], [ '（' + fmtDur(r.span) + '）' ]])
    fill($('pb-brk'), [[fmtDur(inp.brk)]])
    fill($('pb-day'), [[fmtDur(r.dayMin)], ' × ', [J.wageLabel]])
    fill($('pb-night'), [[fmtDur(r.nightMin)], ' × ', [J.nightLabel]])
    fill($('pb-wage'), [[fmtYen(r.wageDay)]])
    fill($('pb-fare'), [[fmtYen(r.fareDay)]])
    fill($('pb-week'), [[fmtDur(r.weekMin)], '（休憩を除く）'])
    $('pay-hash').textContent = buildHash(inp)
    return r
  }

  // 値が変わった時：計算 → ハッシュ → 500ms 後に読み上げ
  function update (opts) {
    var inp = readInput()
    var r = render(inp)
    if (r.ok) { if (history.replaceState) history.replaceState(null, '', buildHash(inp)) } else clearHash()
    var text = (opts && opts.prefix ? opts.prefix : '') + resultText(r)
    if (opts && opts.again) sayAgain(text)
    else sayLater(text)
    fitSticky()
    return r
  }

  // 1024px〜 の結果のカード：画面の高さ − 48px を超える時は貼り付けない
  function fitSticky () {
    var out = $('pay-out')
    out.classList.remove('is-static')
    if (out.offsetHeight > window.innerHeight - 48) out.classList.add('is-static')
  }

  // ---------- ハッシュ（開いた時・hashchange） ----------
  function applyHash () {
    var h = location.hash
    if (h.indexOf('#pay=') !== 0) return
    var inp = parseHash(h)
    if (!inp) {
      // 不正：エラーを出さずに最初の条件に戻し、ハッシュを消す。フォーカス・スクロールは動かさない
      writeInput(DEFAULTS)
      render(DEFAULTS)
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search)
      fitSticky()
      return
    }
    writeInput(inp)
    var r = render(inp)
    fitSticky()
    var root = document.documentElement
    var prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    $('pay').scrollIntoView({ behavior: 'auto', block: 'start' })
    root.style.scrollBehavior = prev
    $('pay-result-title').focus({ preventScroll: true })
    sayAgain(resultText(r))
  }

  // ---------- ページ内の移動（ハッシュを変えない） ----------
  function goTo (id) {
    var target = $(id)
    if (!target) return false
    var h = target.querySelector('[tabindex="-1"]') || target
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
    return true
  }

  function init () {
    makeOptions($('pay-start'), START_OPTS, fmtTime)
    makeOptions($('pay-end'), END_OPTS, fmtTime)
    makeOptions($('pay-fare'), FARES, function (f) { return f === 0 ? '0円（歩き・自転車など）' : fmtYen(f) })
    writeInput(DEFAULTS)
    render(DEFAULTS)

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]')
      if (!a) return
      var hash = a.getAttribute('href')
      if (hash.length < 2) return
      if (goTo(hash.slice(1))) e.preventDefault()
    })

    var inputs = document.querySelectorAll('.pay-in input, .pay-in select')
    for (var i = 0; i < inputs.length; i++) inputs[i].addEventListener('change', function () { update() })

    var pbtn = document.querySelectorAll('[data-preset]')
    for (var k = 0; k < pbtn.length; k++) {
      pbtn[k].addEventListener('click', function () {
        var P = PRESETS[this.getAttribute('data-preset')]
        if (!P) return
        // 交通費は変えない
        writeInput({ job: P.job, start: P.start, end: P.end, brk: P.brk, days: P.days })
        update({ prefix: P.label + 'の例を入れました。', again: true })
      })
    }

    $('pay-reset').addEventListener('click', function () {
      writeInput(DEFAULTS)
      render(DEFAULTS)
      clearHash()
      fitSticky()
      sayAgain('最初の条件に戻しました。' + resultText(calcPay(DEFAULTS)))
    })

    $('apply-btn').addEventListener('click', function () { $('apply-msg').hidden = false })

    window.addEventListener('hashchange', applyHash)
    window.addEventListener('resize', fitSticky)

    // スマホの固定バー：ファーストビューの主ボタンが見えている間は隠す
    var bar = $('fixbar')
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { bar.classList.toggle('is-hide', en.isIntersecting) })
      })
      io.observe($('hero-cta'))
    }

    fitSticky()
    applyHash()
  }

  // 検査用に、状態を引数で受ける関数と定数だけ出す
  window.__demo24 = Object.freeze({
    calcPay: calcPay, validate: validate, parseHash: parseHash, buildHash: buildHash,
    fmtTime: fmtTime, fmtDur: fmtDur, fmtYen: fmtYen, hashTime: hashTime,
    START_OPTS: START_OPTS, END_OPTS: END_OPTS, FARES: FARES, JOBS: JOBS, NIGHT: NIGHT, FARE_CAP: FARE_CAP, PRESETS: PRESETS, DEFAULTS: DEFAULTS, BRKS: BRKS
  })

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
