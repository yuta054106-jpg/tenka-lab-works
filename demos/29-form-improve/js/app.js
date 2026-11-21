// 個別指導 コノハズク学習室（デモ）申し込みフォームの直す前と直した後
// 送信・保存は一切しない（form に送り先なし・submit は最初に preventDefault・通信なし・ブラウザへの保存なし）
// ハッシュは #before／#after の2つだけを書く。入力値はどこにも書かない
// 表示はすべて createElement・textContent・createTextNode
;(function () {
  'use strict'

  // ---------- 直す前の16欄（悪い例） ----------
  var BAD_FIELDS = Object.freeze([
    { id: 'b-cname', name: 'お名前' },
    { id: 'b-ckana', name: 'ふりがな' },
    { id: 'b-pname', name: '保護者のお名前' },
    { id: 'b-pkana', name: '保護者のふりがな' },
    { id: 'b-birth', name: '生年月日（例：20150401）' },
    { id: 'b-school', name: '学校名' },
    { id: 'b-grade', name: '学年' },
    { id: 'b-zip', name: '郵便番号（ハイフンなし）' },
    { id: 'b-addr', name: 'ご住所' },
    { id: 'b-tel', name: '電話番号（半角数字のみ）' },
    { id: 'b-mail', name: 'メールアドレス' },
    { id: 'b-mail2', name: 'メールアドレス（確認）' },
    { id: 'b-subj', name: '希望の教科' },
    { id: 'b-days', name: '希望の曜日' },
    { id: 'b-how', name: '当塾を知ったきっかけ' },
    { id: 'b-note', name: 'ご要望' }
  ].map(Object.freeze))
  var BAD_INITIAL = Object.freeze({
    'b-cname': 'コノハ 太郎（架空）', 'b-ckana': '', 'b-pname': 'コノハ 花子（架空）', 'b-pkana': '', 'b-birth': '', 'b-school': '', 'b-grade': '',
    'b-zip': '000-0000', 'b-addr': '架空県 架空市 1-2-3（架空）', 'b-tel': '000-1234-5678', 'b-mail': 'hanako@example.com', 'b-mail2': '',
    'b-subj': '', 'b-days': '', 'b-how': '', 'b-note': ''
  })

  // ---------- 直した後の選択肢と見本の値 ----------
  var KINDS = Object.freeze({ trial: '無料体験授業（資料もお渡しします）', doc: '資料だけ（メールでお送りします）' })
  var GRADES = Object.freeze({
    e1: '小学1年', e2: '小学2年', e3: '小学3年', e4: '小学4年', e5: '小学5年', e6: '小学6年',
    j1: '中学1年', j2: '中学2年', j3: '中学3年', h1: '高校1年', h2: '高校2年', h3: '高校3年'
  })
  var SUBJECTS = Object.freeze([['math', '算数・数学'], ['jpn', '国語'], ['eng', '英語'], ['sci', '理科'], ['soc', '社会']])
  var DAYS = Object.freeze([['mon', '月'], ['tue', '火'], ['wed', '水'], ['thu', '木'], ['fri', '金'], ['sat', '土']])
  var TIMES = Object.freeze([['t1', '16:00〜17:30'], ['t2', '17:40〜19:10'], ['t3', '19:20〜20:50'], ['any', 'どれでもよい']])
  var VIAS = Object.freeze({ mail: 'メール', tel: '電話' })
  var GOOD_INITIAL = Object.freeze({
    kind: 'trial', grade: '', subj: Object.freeze([]), days: Object.freeze([]), time: '',
    name: 'コノハ 花子（架空）', via: 'mail', mail: 'hanako@example.com', tel: '000-1234-5678', note: ''
  })
  var STEP_NAMES = Object.freeze(['お子さまのこと', 'ご希望の曜日と時間', '連絡先'])

  // ---------- 文言 ----------
  var MSG = Object.freeze({
    V1: '学年を選んでください。',
    V2: '教科を1つ以上選んでください。',
    V3: 'ご希望の曜日を1つ以上選んでください。',
    V4: 'ご希望の時間帯を選んでください。',
    V5: '保護者のお名前（呼び名）を入れてください。',
    V6: '20文字以内で入れてください（いま{n}文字）。',
    V7: 'メールアドレスを入れてください（連絡の方法がメールのため）。',
    V8: 'メールアドレスに「@」が入っていません。例：hanako@example.com',
    V9: 'メールアドレスの形を確かめてください。例：hanako@example.com',
    V10: 'メールアドレスが長すぎます。254文字以内で入れてください。',
    V11: '電話番号を入れてください（連絡の方法が電話のため）。',
    V12: '電話番号は数字で入れてください（ハイフンや空白はあっても大丈夫です）。',
    V13: '電話番号のけた数を確かめてください（0から始まる10けたか11けた）。',
    V14: '200文字以内で入れてください（いま{n}文字）。',
    GE0: '{n}か所、確かめてほしい所があります。',
    BE0: '入力内容に誤りがあります。',
    BE1: '未入力の項目があります：',
    BE2: '郵便番号の形式が正しくありません',
    BE3: '電話番号の形式が正しくありません',
    BE4: '生年月日の形式が正しくありません',
    BE5: 'メールアドレス（確認）が一致しません',
    BE6: '（デモ）誤りはありません。直す前のフォームでは、確認画面がないまま、このボタンで送られてしまいます。このデモでは送信していません。',
    MAIN1: '次へ（2/3 ご希望の曜日と時間）',
    MAIN2: '次へ（3/3 連絡先）',
    MAIN3: '無料体験を申し込む（確認へ）',
    MAIN3DOC: '資料を申し込む（確認へ）',
    BACKTO: '確認画面に戻る',
    NONE_SEL: '選んでいません',
    NONE_IN: '入れていません',
    NONE: 'なし'
  })

  // ---------- 入力チェック（純粋な関数） ----------
  function clean (s) { return String(s == null ? '' : s).normalize('NFKC').trim() }
  function countChars (s) { return Array.from(String(s == null ? '' : s)).length }
  function ng (id, n) { return { ok: false, id: id, text: MSG[id].replace('{n}', String(n)) } }
  var OK = Object.freeze({ ok: true })

  function checkGrade (v) { return v === '' || v == null ? ng('V1') : OK }
  function checkSubj (list) { return !list || list.length === 0 ? ng('V2') : OK }
  function checkDays (list, kind) { return kind === 'trial' && (!list || list.length === 0) ? ng('V3') : OK }
  function checkTime (v, kind) { return kind === 'trial' && !v ? ng('V4') : OK }
  function checkName (s) {
    var t = String(s == null ? '' : s).trim()
    if (t === '') return ng('V5')
    var n = countChars(t)
    if (n > 20) return ng('V6', n)
    return OK
  }
  var MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  function checkMail (s, via) {
    var t = clean(s)
    if (t === '') return via === 'mail' ? ng('V7') : OK
    if (t.indexOf('@') < 0) return ng('V8')
    if (!MAIL_RE.test(t)) return ng('V9')
    if (t.length > 254) return ng('V10')
    return OK
  }
  // ハイフンの仲間（- ‐ ‑ – — − ー）・空白・かっこを取り除いて数字だけにする
  var TEL_DROP = /[-‐‑–—−ー\s()]/g
  function checkTel (s, via) {
    var d = clean(s).replace(TEL_DROP, '')
    if (d === '') return via === 'tel' ? ng('V11') : OK
    if (!/^\d+$/.test(d)) return ng('V12')
    if (!/^0\d{9,10}$/.test(d)) return ng('V13')
    return OK
  }
  function checkNote (s) {
    var n = countChars(s)
    return n > 200 ? ng('V14', n) : OK
  }

  // 欄の名前（まとめ・読み上げで使う）
  var FIELD_NAMES = Object.freeze({
    grade: '学年', subj: '希望の教科', days: '希望の曜日', time: '希望の時間帯',
    name: '保護者のお名前（呼び名）', mail: 'メールアドレス', tel: '電話番号', note: 'ご質問・ご要望'
  })
  var STEP_FIELDS = Object.freeze({ 1: ['grade', 'subj'], 2: ['days', 'time'], 3: ['name', 'mail', 'tel', 'note'] })
  function checkField (key, v) {
    switch (key) {
      case 'grade': return checkGrade(v.grade)
      case 'subj': return checkSubj(v.subj)
      case 'days': return checkDays(v.days, v.kind)
      case 'time': return checkTime(v.time, v.kind)
      case 'name': return checkName(v.name)
      case 'mail': return checkMail(v.mail, v.via)
      case 'tel': return checkTel(v.tel, v.via)
      case 'note': return checkNote(v.note)
    }
    return OK
  }
  // そのステップの誤りを上から順に（[{ key, name, id, text }]）
  function checkStep (n, v) {
    var out = []
    var keys = STEP_FIELDS[n] || []
    for (var i = 0; i < keys.length; i++) {
      var r = checkField(keys[i], v)
      if (!r.ok) out.push({ key: keys[i], name: FIELD_NAMES[keys[i]], id: r.id, text: r.text })
    }
    return out
  }

  // 直す前の「送信」：前後の空白を取らない。\d は半角の 0〜9 だけ
  function beforeCheck (values) {
    var get = function (id) { var x = values && values[id]; return x == null ? '' : String(x) }
    var items = []
    var bad = {}
    var empty = BAD_FIELDS.filter(function (f) { return get(f.id) === '' })
    if (empty.length) {
      items.push({ id: 'BE1', text: MSG.BE1 + empty.map(function (f) { return f.name }).join('、') })
      empty.forEach(function (f) { bad[f.id] = true })
    }
    var zip = get('b-zip')
    if (zip !== '' && !/^\d{7}$/.test(zip)) { items.push({ id: 'BE2', text: MSG.BE2 }); bad['b-zip'] = true }
    var tel = get('b-tel')
    if (tel !== '' && !/^\d{10,11}$/.test(tel)) { items.push({ id: 'BE3', text: MSG.BE3 }); bad['b-tel'] = true }
    var birth = get('b-birth')
    if (birth !== '' && !/^\d{8}$/.test(birth)) { items.push({ id: 'BE4', text: MSG.BE4 }); bad['b-birth'] = true }
    var m2 = get('b-mail2')
    if (m2 !== '' && m2 !== get('b-mail')) { items.push({ id: 'BE5', text: MSG.BE5 }); bad['b-mail2'] = true }
    return {
      ok: items.length === 0,
      head: items.length ? MSG.BE0 : '',
      items: items,
      invalid: BAD_FIELDS.filter(function (f) { return bad[f.id] }).map(function (f) { return f.id })
    }
  }

  // ---------- ハッシュ（そのまま比べる。デコードしない） ----------
  function parseTab (hash) {
    var h = typeof hash === 'string' ? hash : ''
    if (h === '#before') return { tab: 'before', rewrite: false }
    if (h === '#after' || h === '' || h === '#') return { tab: 'after', rewrite: false }
    return { tab: 'after', rewrite: true }
  }

  // ---------- 確認画面の中身 ----------
  function pick (pairs, list) {
    return pairs.filter(function (p) { return list && list.indexOf(p[0]) >= 0 }).map(function (p) { return p[1] })
  }
  function labelOf (pairs, key) {
    for (var i = 0; i < pairs.length; i++) if (pairs[i][0] === key) return pairs[i][1]
    return ''
  }
  function confirmRows (v) {
    var subj = pick(SUBJECTS, v.subj)
    var days = pick(DAYS, v.days)
    var time = labelOf(TIMES, v.time)
    var mail = clean(v.mail)
    var tel = String(v.tel == null ? '' : v.tel).trim()
    var note = String(v.note == null ? '' : v.note)
    return [
      { step: 1, title: 'お子さまのこと', rows: [
        ['申し込みの内容', KINDS[v.kind] || ''],
        ['学年', GRADES[v.grade] || MSG.NONE_SEL],
        ['希望の教科', subj.length ? subj.join('、') : MSG.NONE_SEL]
      ] },
      { step: 2, title: 'ご希望の曜日と時間', rows: [
        ['希望の曜日', days.length ? days.join('・') : MSG.NONE_SEL],
        ['希望の時間帯', time || MSG.NONE_SEL]
      ] },
      { step: 3, title: '連絡先', rows: [
        ['保護者のお名前（呼び名）', String(v.name == null ? '' : v.name).trim()],
        ['連絡の方法', VIAS[v.via] || ''],
        ['メールアドレス', mail || MSG.NONE_IN],
        ['電話番号', tel || MSG.NONE_IN],
        ['ご質問・ご要望', note.trim() === '' ? MSG.NONE : note]
      ] }
    ]
  }

  // ---------- 読み上げの文 ----------
  function srText (code, a, b) {
    switch (code) {
      case 'R1': return a === 'before' ? '直す前のフォーム（悪い例）を表示しました。' : '直した後のフォームを表示しました。'
      case 'R2': return a === 'confirm' ? '確認画面です。まだ送られていません。' : 'ステップ ' + a + '/3、' + STEP_NAMES[a - 1] + 'です。'
      case 'R3': return MSG.GE0.replace('{n}', String(a)) + b + 'の欄に移りました。'
      case 'R4': return a + '：' + b
      case 'R5': return a.ok ? MSG.BE6 : a.head + a.items.map(function (x) { return x.text + '。' }).join('')
      case 'R6': return '見本の値を入れ直しました。'
      case 'R7': return '最初からやり直します。ステップ 1/3、お子さまのことです。'
      case 'R8': return 'お申し込みの流れはここまでです。デモのため、どこにも送られていません。'
      case 'R9': return '直す前のフォームの欄をすべて空にしました。'
      case 'R10': return a ? '番号の札を出しました。' : '番号の札を消しました。'
    }
    return ''
  }

  function mainLabel (step, kind, fixMode) {
    if (fixMode) return MSG.BACKTO
    if (step === 1) return MSG.MAIN1
    if (step === 2) return MSG.MAIN2
    return kind === 'doc' ? MSG.MAIN3DOC : MSG.MAIN3
  }

  var api = Object.freeze({
    BAD_FIELDS: BAD_FIELDS, BAD_INITIAL: BAD_INITIAL, GOOD_INITIAL: GOOD_INITIAL, GRADES: GRADES, SUBJECTS: SUBJECTS, DAYS: DAYS, TIMES: TIMES,
    KINDS: KINDS, VIAS: VIAS, MSG: MSG, clean: clean, countChars: countChars, checkGrade: checkGrade, checkSubj: checkSubj, checkDays: checkDays,
    checkTime: checkTime, checkName: checkName, checkMail: checkMail, checkTel: checkTel, checkNote: checkNote, checkStep: checkStep,
    beforeCheck: beforeCheck, parseTab: parseTab, confirmRows: confirmRows, srText: srText, mainLabel: mainLabel, FIELD_NAMES: FIELD_NAMES
  })
  if (typeof window !== 'undefined') window.__demo29 = api

  if (typeof document === 'undefined' || !document.createElement) return

  // ---------- 表示の部品 ----------
  function $ (id) { return document.getElementById(id) }
  function clear (e) { while (e.firstChild) e.removeChild(e.firstChild) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined) e.textContent = text
    return e
  }
  function nw (text) { return el('span', 'nw', text) }
  function vh (text) { return el('span', 'visually-hidden', text) }
  function txt (s) { return document.createTextNode(s) }
  var SVG_NS = 'http://www.w3.org/2000/svg'
  function icon (id, size, cls) {
    var s = document.createElementNS(SVG_NS, 'svg')
    s.setAttribute('width', size); s.setAttribute('height', size)
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    if (cls) s.setAttribute('class', cls)
    var u = document.createElementNS(SVG_NS, 'use')
    u.setAttribute('href', '#' + id)
    s.appendChild(u)
    return s
  }
  // 折れてはいけない語を .nw の span にして並べる
  var NW_RE = /(個別指導 コノハズク学習室|デモ（架空のお店）|TENKA LAB|コノハ 花子（架空）|（架空）|ステップ [123]\/3|hanako@example\.com|000-1234-5678|16:00〜17:30|17:40〜19:10|19:20〜20:50|デモ|架空)/
  function rich (parent, text) {
    var parts = String(text).split(NW_RE)
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue
      parent.appendChild(i % 2 ? nw(parts[i]) : txt(parts[i]))
    }
    return parent
  }
  // 書いてある文の中の語も、開いた時に1回だけ包む（.nw の中・見えない文字・SVG は触らない）
  function wrapWords (root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode
        if (!p || !NW_RE.test(n.nodeValue)) return NodeFilter.FILTER_SKIP
        if (p.closest('.nw, .visually-hidden, svg, script, style, textarea, option, title, #sr-status, .hd__demo, .req, .tag')) return NodeFilter.FILTER_SKIP
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var list = []
    while (walker.nextNode()) list.push(walker.currentNode)
    list.forEach(function (n) {
      var frag = document.createDocumentFragment()
      rich(frag, n.nodeValue)
      n.parentNode.replaceChild(frag, n)
    })
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  // 500ms 何も変わらなければ1回だけ。前と同じ文なら一度空にして 50ms 後に入れる
  function say (text) {
    if (!text) return
    clearTimeout(srTimer)
    srTimer = setTimeout(function () {
      var sr = $('sr-status')
      if (sr.textContent === text) {
        sr.textContent = ''
        srTimer = setTimeout(function () { sr.textContent = text }, 50)
        return
      }
      sr.textContent = text
    }, 500)
  }

  // ---------- ページ内の移動（ハッシュを変えない） ----------
  function goTo (id) {
    var target = $(id)
    if (!target) return false
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
      if (target.closest('[hidden]')) return false
      target.focus()
      return true
    }
    if (target.hidden) return false
    var h = target.getAttribute('tabindex') === '-1' ? target : (target.querySelector('[tabindex="-1"]') || target)
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    h.focus({ preventScroll: true })
    return true
  }
  function focusHead (id) {
    var h = $(id)
    if (!h) return
    h.focus({ preventScroll: true })
    h.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  }

  // 1024px〜 の「このタブで見るところ」：画面の高さ − 48px を超える時は貼り付けない
  function fitSticky () {
    var d = $('guide')
    if (!d) return
    d.classList.remove('is-static')
    if (window.innerWidth >= 1024 && d.offsetHeight > window.innerHeight - 48) d.classList.add('is-static')
  }

  // チェック・丸のボタンの label の枠（入った時は紺 2px）
  function syncChoices () {
    var ins = document.querySelectorAll('.choice__input')
    for (var i = 0; i < ins.length; i++) {
      var l = ins[i].closest('.choice')
      if (l) l.classList.toggle('is-on', ins[i].checked)
    }
  }

  // ---------- タブ ----------
  var tab = 'after'
  function setTab (next, opts) {
    opts = opts || {}
    var changed = next !== tab
    tab = next
    var b = $('tab-before'); var a = $('tab-after')
    b.setAttribute('aria-selected', String(tab === 'before')); b.tabIndex = tab === 'before' ? 0 : -1
    a.setAttribute('aria-selected', String(tab === 'after')); a.tabIndex = tab === 'after' ? 0 : -1
    $('panel-before').hidden = tab !== 'before'
    $('panel-after').hidden = tab !== 'after'
    $('h-guide').textContent = tab === 'before' ? '直す前の悪い点' : '直した後で直した点'
    var gt = document.querySelectorAll('#guide-list .tag')
    for (var i = 0; i < gt.length; i++) gt[i].className = 'tag ' + (tab === 'before' ? 'tag--bad' : 'tag--fix')
    if (opts.write && changed && location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab)
    if (opts.speak && changed) say(srText('R1', tab))
    fitSticky()
    return changed
  }

  // ---------- 直す前 ----------
  function badValues () {
    var v = {}
    BAD_FIELDS.forEach(function (f) { v[f.id] = $(f.id).value })
    return v
  }
  function badClearMarks () {
    BAD_FIELDS.forEach(function (f) { var e = $(f.id); e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby') })
    $('bad-summary').hidden = true
    clear($('bad-summary'))
    $('bad-ok').hidden = true
  }
  function badFill (vals) {
    BAD_FIELDS.forEach(function (f) { $(f.id).value = vals[f.id] || '' })
    badClearMarks()
  }
  function badSubmit () {
    var r = beforeCheck(badValues())
    badClearMarks()
    if (r.ok) {
      $('bad-ok').hidden = false
    } else {
      var box = $('bad-summary')
      box.appendChild(el('p', 'bad__sumhead', r.head))
      var ul = el('ul')
      r.items.forEach(function (x) { ul.appendChild(el('li', '', x.text)) })
      box.appendChild(ul)
      box.hidden = false
      r.invalid.forEach(function (id) { var e = $(id); e.setAttribute('aria-invalid', 'true'); e.setAttribute('aria-describedby', 'bad-summary') })
    }
    // 画面はスクロールさせない・フォーカスも動かさない（悪い例）
    say(srText('R5', r))
  }

  // ---------- 直した後 ----------
  var step = 1 // 1・2・3・'confirm'・'done'
  var fixMode = false
  var live = {}

  function checkedList (name) {
    var out = []
    var ins = document.querySelectorAll('#good-form input[name="' + name + '"]')
    for (var i = 0; i < ins.length; i++) if (ins[i].checked) out.push(ins[i].value)
    return out
  }
  function goodValues () {
    return {
      kind: checkedList('kind')[0] || 'trial',
      grade: $('a-grade').value,
      subj: checkedList('subj'),
      days: checkedList('day'),
      time: checkedList('time')[0] || '',
      name: $('a-name').value,
      via: checkedList('via')[0] || 'mail',
      mail: $('a-mail').value,
      tel: $('a-tel').value,
      note: $('a-note').value
    }
  }
  var GROUP = { subj: 'subj', days: 'day', time: 'time' }
  var HINT = { subj: 'h-subj', days: 'h-days', name: 'h-name', mail: 'h-mail', tel: 'h-tel', note: 'h-note' }
  var TEXT_IDS = { name: 'a-name', mail: 'a-mail', tel: 'a-tel', note: 'a-note' }
  function inputsOf (key) {
    if (key === 'grade') return [$('a-grade')]
    if (GROUP[key]) return Array.prototype.slice.call(document.querySelectorAll('#good-form input[name="' + GROUP[key] + '"]'))
    return [$(TEXT_IDS[key])]
  }
  function errShown (key) { return !$('e-' + key).hidden }
  function showErr (key, res) {
    var e = $('e-' + key)
    var ins = inputsOf(key)
    var hint = HINT[key]
    if (res.ok) {
      e.hidden = true
      clear(e)
      ins.forEach(function (x) { x.removeAttribute('aria-invalid') })
      ins.forEach(function (x) { if (hint) x.setAttribute('aria-describedby', hint); else x.removeAttribute('aria-describedby') })
      return
    }
    clear(e)
    e.appendChild(icon('i-alert', 16))
    e.appendChild(el('span', '', res.text))
    e.setAttribute('data-id', res.id)
    e.hidden = false
    ins.forEach(function (x) { x.setAttribute('aria-invalid', 'true') })
    // 組（checkbox・radio）は1つずつ Tab で止まるので、全部の欄にエラーの文をつなぐ
    ins.forEach(function (x) { x.setAttribute('aria-describedby', 'e-' + key + (hint ? ' ' + hint : '')) })
  }
  // 欄を確かめ直して表示を直す（新しくエラーが出たかを返す）
  function recheck (key, v) {
    var was = errShown(key)
    var res = checkField(key, v || goodValues())
    showErr(key, res)
    if (!res.ok) live[key] = true
    return !res.ok && !was ? res : null
  }
  function firstInputId (key) { return inputsOf(key)[0].id }

  function renderSummary (errs) {
    var box = $('good-summary')
    clear(box)
    if (!errs.length) { box.hidden = true; return }
    box.appendChild(el('p', 'good__sumhead', MSG.GE0.replace('{n}', String(errs.length))))
    var ul = el('ul')
    errs.forEach(function (x) {
      var li = el('li')
      var a = el('a', '', x.name)
      a.href = '#' + firstInputId(x.key)
      li.appendChild(a)
      ul.appendChild(li)
    })
    box.appendChild(ul)
    box.hidden = false
  }
  // まとめが出ている時は、そのステップの残りで描き直す（0 になれば消す）
  function refreshSummary () {
    if ($('good-summary').hidden || typeof step !== 'number') return
    renderSummary(checkStep(step, goodValues()))
  }

  function setReq (key, must) {
    var r = $('r-' + key)
    if (!r) return
    r.textContent = must ? '必須' : '任意'
    r.className = 'req ' + (must ? 'req--must' : 'req--opt')
    var rv = $('rv-' + key)
    if (rv) rv.textContent = must ? '（必須）' : '（任意）'
    if (TEXT_IDS[key]) {
      if (must) $(TEXT_IDS[key]).setAttribute('aria-required', 'true')
      else $(TEXT_IDS[key]).removeAttribute('aria-required')
    }
  }
  function syncDepends () {
    var v = goodValues()
    var trial = v.kind === 'trial'
    setReq('days', trial); setReq('time', trial)
    $('note-doc').hidden = trial
    setReq('mail', v.via === 'mail'); setReq('tel', v.via === 'tel')
    renderMainLabels()
  }
  function renderMainLabels () {
    var kind = goodValues().kind
    for (var n = 1; n <= 3; n++) {
      var b = $('next-' + n)
      clear(b)
      b.appendChild(nw(mainLabel(n, kind, fixMode)))
    }
  }

  function renderSteps () {
    var row = $('steps-row')
    row.hidden = step === 'done'
    var cur = step === 'confirm' ? 4 : step
    var items = document.querySelectorAll('.steps__item')
    for (var i = 0; i < items.length; i++) {
      var li = items[i]
      var n = i + 1
      var dot = li.querySelector('.steps__dot')
      var name = li.querySelector('.steps__name')
      clear(dot)
      clear(name)
      name.appendChild(txt(n === 4 ? '確認' : ['お子さま', '曜日と時間', '連絡先'][i]))
      li.classList.remove('steps--now', 'steps--done')
      li.removeAttribute('aria-current')
      if (n === cur) {
        li.classList.add('steps--now')
        li.setAttribute('aria-current', 'step')
        if (n < 4) dot.textContent = String(n)
      } else if (n < cur) {
        li.classList.add('steps--done')
        dot.appendChild(icon('i-check', 18))
        if (n < 4) dot.appendChild(vh(String(n)))
        name.appendChild(vh('（入力済み）'))
      } else if (n < 4) dot.textContent = String(n)
    }
  }

  function showStep (s, opts) {
    opts = opts || {}
    step = s
    for (var n = 1; n <= 3; n++) $('step-' + n).hidden = s !== n
    $('good-form').hidden = typeof s !== 'number'
    $('step-confirm').hidden = s !== 'confirm'
    $('step-done').hidden = s !== 'done'
    if (!opts.keepSummary) renderSummary([])
    renderSteps()
    renderMainLabels()
    fitSticky()
  }

  function renderConfirm () {
    var root = $('confirm-boxes')
    clear(root)
    confirmRows(goodValues()).forEach(function (box) {
      var sec = el('section', 'confirm__box')
      var hid = 'h-cbox-' + box.step
      sec.setAttribute('aria-labelledby', hid)
      var head = el('div', 'confirm__head')
      var h4 = el('h4', '', box.title)
      h4.id = hid
      head.appendChild(h4)
      var b = el('button', 'btn-sub')
      b.type = 'button'
      b.setAttribute('data-fix', String(box.step))
      b.appendChild(nw('修正する'))
      b.appendChild(vh('（' + box.title + '）'))
      head.appendChild(b)
      sec.appendChild(head)
      var dl = el('dl', 'confirm__rows')
      box.rows.forEach(function (r) {
        var d = el('div')
        d.appendChild(el('dt', '', r[0]))
        var dd = el('dd')
        rich(dd, r[1])
        d.appendChild(dd)
        dl.appendChild(d)
      })
      sec.appendChild(dl)
      root.appendChild(sec)
    })
  }

  // 止まった時：まとめを出し、最初の誤りの欄へ
  function stopAt (errs) {
    errs.forEach(function (x) { showErr(x.key, x); live[x.key] = true })
    renderSummary(errs)
    var first = $(firstInputId(errs[0].key))
    first.focus()
    say(srText('R3', errs.length, errs[0].name))
  }

  function goConfirm () {
    renderConfirm()
    showStep('confirm')
    focusHead('h-confirm')
    say(srText('R2', 'confirm'))
  }

  function mainAction () {
    if (typeof step !== 'number') return
    var v = goodValues()
    var errs = checkStep(step, v)
    // 一度も確かめていない欄も、ここで全部確かめる
    STEP_FIELDS[step].forEach(function (k) { if (errs.every(function (x) { return x.key !== k })) showErr(k, OK) })
    if (errs.length) { stopAt(errs); return }
    if (fixMode || step === 3) {
      // 確認へ行く前に、ステップ1〜3を全部確かめ、最初に誤りのあるステップを開く
      for (var n = 1; n <= 3; n++) {
        var e = checkStep(n, v)
        if (e.length) {
          showStep(n, { keepSummary: true })
          stopAt(e)
          return
        }
      }
      fixMode = false
      goConfirm()
      return
    }
    showStep(step + 1)
    focusHead('h-step-' + step)
    say(srText('R2', step))
  }
  function backAction (to) {
    showStep(to)
    focusHead(to === 'confirm' ? 'h-confirm' : 'h-step-' + to)
    say(srText('R2', to))
  }

  function goodFill (keys) {
    var I = GOOD_INITIAL
    if (keys.indexOf('kind') >= 0) { $('a-kind-trial').checked = I.kind === 'trial'; $('a-kind-doc').checked = I.kind === 'doc' }
    if (keys.indexOf('grade') >= 0) $('a-grade').value = I.grade
    if (keys.indexOf('subj') >= 0) inputsOf('subj').forEach(function (x) { x.checked = false })
    if (keys.indexOf('days') >= 0) inputsOf('days').forEach(function (x) { x.checked = false })
    if (keys.indexOf('time') >= 0) inputsOf('time').forEach(function (x) { x.checked = false })
    if (keys.indexOf('name') >= 0) $('a-name').value = I.name
    if (keys.indexOf('via') >= 0) { $('a-via-mail').checked = I.via === 'mail'; $('a-via-tel').checked = I.via === 'tel' }
    if (keys.indexOf('mail') >= 0) $('a-mail').value = I.mail
    if (keys.indexOf('tel') >= 0) $('a-tel').value = I.tel
    if (keys.indexOf('note') >= 0) $('a-note').value = I.note
    keys.forEach(function (k) { if (FIELD_NAMES[k]) { showErr(k, OK); delete live[k] } })
    syncChoices()
    syncDepends()
  }
  var ALL_KEYS = ['kind', 'grade', 'subj', 'days', 'time', 'name', 'via', 'mail', 'tel', 'note']

  function restart () {
    fixMode = false
    live = {}
    goodFill(ALL_KEYS)
    showStep(1)
    focusHead('h-step-1')
    say(srText('R7'))
  }

  // ---------- 開いた時・ハッシュ ----------
  function applyHash (fromEvent) {
    var r = parseTab(location.hash)
    if (r.rewrite) history.replaceState(null, '', '#after')
    setTab(r.tab, { speak: fromEvent })
    return r
  }

  function init () {
    wrapWords(document.body)

    // 読み込み直しでブラウザが欄の中身を戻しても、開いた時は見本の値から始める
    badFill(BAD_INITIAL)
    $('show-tags').checked = true
    live = {}
    goodFill(ALL_KEYS)
    showStep(1)

    // 両方の form：送らない（最初の行で止める）
    $('bad-form').addEventListener('submit', function (e) { e.preventDefault(); badSubmit() })
    $('good-form').addEventListener('submit', function (e) { e.preventDefault(); mainAction() })

    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null
      if (!t) return
      var a = t.closest('a[href^="#"]')
      if (a) {
        var id = a.getAttribute('href').slice(1)
        if (!id) return
        if (a.id === 'hero-cta') {
          setTab('after', { speak: true, write: true })
        }
        // ページ内の移動はハッシュを変えない（行き先が隠れていても書き換えない）
        e.preventDefault()
        goTo(id)
        return
      }
      var b = t.closest('button')
      if (!b) return
      if (b.id === 'tab-before' || b.id === 'tab-after') { setTab(b.id === 'tab-before' ? 'before' : 'after', { speak: true, write: true }); return }
      if (b.id === 'bad-reset') { badFill({}); say(srText('R9')); return }
      if (b.id === 'bad-refill') { badFill(BAD_INITIAL); say(srText('R6')); return }
      if (b.id === 'good-refill') { goodFill(['name', 'via', 'mail', 'tel']); refreshSummary(); say(srText('R6')); return }
      if (b.id === 'back-2') { backAction(1); return }
      if (b.id === 'back-3') { backAction(2); return }
      if (b.id === 'back-c') { backAction(3); return }
      if (b.id === 'send-demo') {
        showStep('done')
        focusHead('h-done')
        say(srText('R8'))
        return
      }
      if (b.id === 'restart') { restart(); return }
      var fx = b.getAttribute('data-fix')
      if (fx) {
        fixMode = true
        var n = Number(fx)
        showStep(n)
        focusHead('h-step-' + n)
        say(srText('R2', n))
      }
    })

    // タブの矢印・Home・End（自動で切り替える）
    $('tab-before').parentNode.addEventListener('keydown', function (e) {
      var k = e.key
      var next = null
      if (k === 'ArrowLeft' || k === 'ArrowRight') next = tab === 'before' ? 'after' : 'before'
      else if (k === 'Home') next = 'before'
      else if (k === 'End') next = 'after'
      if (!next) return
      e.preventDefault()
      setTab(next, { speak: true, write: true })
      $('tab-' + next).focus()
    })

    // 文字の欄：離れた時に確かめる。一度エラーが出た欄は、打つたびに確かめ直す
    Object.keys(TEXT_IDS).forEach(function (key) {
      var input = $(TEXT_IDS[key])
      input.addEventListener('blur', function () {
        if (input.closest('[hidden]')) return
        var res = recheck(key)
        if (res) say(srText('R4', FIELD_NAMES[key], res.text))
        refreshSummary()
      })
      input.addEventListener('input', function () {
        if (!live[key]) return
        recheck(key)
        refreshSummary()
      })
    })

    document.addEventListener('change', function (e) {
      var t = e.target
      if (!t) return
      if (t.id === 'show-tags') {
        var on = t.checked
        var tags = document.querySelectorAll('.compare__main .tag')
        for (var i = 0; i < tags.length; i++) tags[i].hidden = !on
        syncChoices()
        say(srText('R10', on))
        return
      }
      if (!t.closest('#good-form')) return
      syncChoices()
      var v = goodValues()
      if (t.name === 'kind') {
        syncDepends()
        ;['days', 'time'].forEach(function (k) { if (errShown(k)) recheck(k, v) })
      } else if (t.name === 'via') {
        syncDepends()
        ;['mail', 'tel'].forEach(function (k) { if (errShown(k)) recheck(k, v) })
      } else if (t.id === 'a-grade') {
        if (live.grade) recheck('grade', v)
      } else if (t.name === 'subj' || t.name === 'day' || t.name === 'time') {
        var key = t.name === 'day' ? 'days' : t.name
        if (live[key]) recheck(key, v)
      }
      refreshSummary()
    })

    window.addEventListener('hashchange', function () { applyHash(true) })
    window.addEventListener('resize', fitSticky)

    var r = applyHash(false)
    // 不正なハッシュがページ内の id と同じでも、開いた時はスクロールを動かさない
    if (r.rewrite) window.scrollTo(0, 0)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
