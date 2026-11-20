// ソラマメ手しごと教室（デモ）予約・問い合わせ管理
// 外部通信なし。データはこのブラウザの localStorage にだけ保存する（使えない場合はメモリ上の見本データで動く）
(function () {
  'use strict'

  var STORAGE_KEY = 'tenkalab-demo-reservation-v1'
  var CAPACITY = 6
  var MAX_DAYS = 30
  var SLOTS = ['10:00', '13:30', '18:30']
  var COURSES = ['刺しゅう', '編み物', 'ミシン小物']
  var STATUS = {
    // 記号は文字ではなく CSS の SVG アイコン（.badge__icon--状態）で出す
    new: { label: '未対応', cls: 'badge--new' },
    doing: { label: '対応中', cls: 'badge--doing' },
    done: { label: '完了', cls: 'badge--done' }
  }
  var GUIDE_KEY = 'tenkalab-demo-reservation-guide-closed'
  var STATUS_ORDER = { new: 0, doing: 1, done: 2 }
  var WEEK = ['日', '月', '火', '水', '木', '金', '土']

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 小さな道具 ----------
  function $(id) { return document.getElementById(id) }

  // innerHTML に入れる文字列は必ずこれを通す（XSS 対策）
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function pad(n) { return (n < 10 ? '0' : '') + n }

  function today() {
    var d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  function addDays(base, n) {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n)
  }

  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
    if (!m) return null
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return ymd(d) === s ? d : null
  }

  function md(d) { return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEK[d.getDay()] + '）' }

  function receivedText(iso) {
    var d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '受付'
  }

  // ---------- 見本データ（実行日からの相対日） ----------
  function sampleData() {
    var t = today()
    function at(dayOffset, hm) {
      var p = hm.split(':')
      var d = addDays(t, dayOffset)
      d.setHours(Number(p[0]), Number(p[1]), 0, 0)
      return d.toISOString()
    }
    function day(n) { return ymd(addDays(t, n)) }
    return [
      { id: 's1', type: 'reservation', status: 'new', date: day(0), slot: '13:30', course: '刺しゅう', name: '山田 花子（見本）', contact: '090-0000-0001', message: '初めてですが、針と糸は持っていなくても大丈夫ですか？', memo: '', receivedAt: at(-1, '21:04') },
      { id: 's2', type: 'reservation', status: 'new', date: day(1), slot: '10:00', course: '編み物', name: '佐藤 みどり（見本）', contact: 'midori@example.com', message: 'かぎ針でコースターを作ってみたいです。', memo: '', receivedAt: at(0, '08:15') },
      { id: 's3', type: 'inquiry', status: 'new', date: '', slot: '', course: 'ミシン小物', name: '鈴木 一郎（見本）', contact: '090-0000-0003', message: '子ども（小学4年）と一緒に参加できますか？', memo: '', receivedAt: at(0, '07:42') },
      { id: 's4', type: 'reservation', status: 'doing', date: day(0), slot: '13:30', course: '刺しゅう', name: '高橋 ゆい（見本）', contact: 'yui@example.com', message: '友人と2人で申し込みたいです（友人は別で申し込みます）。', memo: '確認メール送付済み。返信待ち', receivedAt: at(-2, '19:30') },
      { id: 's5', type: 'reservation', status: 'doing', date: day(1), slot: '18:30', course: 'ミシン小物', name: '田中 さくら（見本）', contact: '090-0000-0005', message: '仕事帰りなので5分ほど遅れるかもしれません。', memo: '遅刻OKと返信予定', receivedAt: at(-1, '12:10') },
      { id: 's6', type: 'inquiry', status: 'doing', date: '', slot: '', course: '編み物', name: '伊藤 かおり（見本）', contact: 'kaori@example.com', message: '毛糸は持ち込みでもよいですか？', memo: '持ち込み可。返信文を作成中', receivedAt: at(-1, '16:48') },
      { id: 's7', type: 'reservation', status: 'done', date: day(0), slot: '10:00', course: '編み物', name: '渡辺 まゆ（見本）', contact: '090-0000-0007', message: '2回目です。前回の続きをやりたいです。', memo: '前回の作品を持参とのこと', receivedAt: at(-3, '10:05') },
      { id: 's8', type: 'reservation', status: 'done', date: day(3), slot: '13:30', course: '刺しゅう', name: '中村 あおい（見本）', contact: 'aoi@example.com', message: '', memo: '予約確定の連絡済み', receivedAt: at(-2, '09:20') }
    ]
  }

  // ---------- 保存（localStorage は try/catch。使えなければメモリだけ） ----------
  var canStore = true

  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : '' }

  // 保存データを信用せず、形を整えてから使う
  function clean(list) {
    if (!Array.isArray(list)) return null
    var out = []
    for (var i = 0; i < list.length && i < 500; i++) {
      var r = list[i]
      if (!r || typeof r !== 'object') continue
      var type = r.type === 'inquiry' ? 'inquiry' : 'reservation'
      var item = {
        id: str(r.id, 40) || ('r' + Date.now() + i),
        type: type,
        status: STATUS[r.status] ? r.status : 'new',
        date: type === 'reservation' && parseYmd(r.date) ? r.date : '',
        slot: type === 'reservation' && SLOTS.indexOf(r.slot) >= 0 ? r.slot : '',
        course: COURSES.indexOf(r.course) >= 0 ? r.course : COURSES[0],
        name: str(r.name, 40),
        contact: str(r.contact, 80),
        message: str(r.message, 200),
        memo: str(r.memo, 500),
        receivedAt: str(r.receivedAt, 40)
      }
      out.push(item)
    }
    return out
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        var parsed = clean(JSON.parse(raw))
        if (parsed) return parsed
      }
    } catch (e) {
      canStore = false
    }
    return sampleData()
  }

  function save() {
    if (!canStore) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
    } catch (e) {
      canStore = false
      showStorageNote()
    }
  }

  function showStorageNote() {
    if (!canStore) {
      $('storage-note').textContent = 'このブラウザでは保存できないため、ページを閉じると見本データに戻ります（外部には送信されません）'
    }
  }

  // ---------- 状態 ----------
  var state = {
    items: [],
    filter: 'all',
    seatOffset: 0,
    openMemos: {},
    submitted: false
  }

  function usedSeats(dateStr, slot, exceptId) {
    var n = 0
    state.items.forEach(function (r) {
      if (r.type === 'reservation' && r.date === dateStr && r.slot === slot && r.id !== exceptId) n++
    })
    return n
  }

  function countBy(status) {
    return state.items.filter(function (r) { return r.status === status }).length
  }

  function sorted(list) {
    return list.slice().sort(function (a, b) {
      var s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (s) return s
      // 問い合わせは同じ状態の最後。受付日時の新しい順
      if (a.type !== b.type) return a.type === 'inquiry' ? 1 : -1
      if (a.type === 'inquiry') return String(b.receivedAt).localeCompare(String(a.receivedAt))
      var k1 = a.date + ' ' + a.slot
      var k2 = b.date + ' ' + b.slot
      if (k1 !== k2) return k1 < k2 ? -1 : 1
      return String(a.receivedAt).localeCompare(String(b.receivedAt))
    })
  }

  // ---------- 画面タブ ----------
  var tabs = [$('tab-customer'), $('tab-admin')]

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab
      t.setAttribute('aria-selected', on ? 'true' : 'false')
      t.tabIndex = on ? 0 : -1
      $(t.getAttribute('aria-controls')).hidden = !on
    })
    if (focus) tab.focus()
    window.scrollTo(0, 0)
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t, false) })
    t.addEventListener('keydown', function (e) {
      var next = null
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') next = tabs[(i + 1) % 2]
      if (e.key === 'Home') next = tabs[0]
      if (e.key === 'End') next = tabs[1]
      if (next) { e.preventDefault(); selectTab(next, true) }
    })
  })

  function updateAdminCount(bump) {
    var n = countBy('new')
    var b = $('admin-count')
    b.textContent = String(n)
    b.setAttribute('aria-label', '未対応 ' + n + '件')
    b.hidden = n === 0
    if (bump && !reduceMotion) {
      b.classList.remove('is-bump')
      void b.offsetWidth
      b.classList.add('is-bump')
    }
  }

  // ---------- 管理画面 ----------
  function renderSummary() {
    var t = today()
    // 左（スマホは1行目）に「未対応」の件数。数はタブのバッジ（#admin-count）と同じ
    var nNew = countBy('new')
    var html = '<div class="summary__col summary__new' + (nNew ? '' : ' is-zero') + '">' +
      '<p class="summary__day">未対応</p>' +
      '<p class="summary__num">' + nNew + '件</p>' +
      (nNew ? '' : '<p class="note">すべて対応済み</p>') + '</div>'
    ;[{ label: '今日', d: t }, { label: '明日', d: addDays(t, 1) }].forEach(function (col) {
      var key = ymd(col.d)
      var rows = state.items.filter(function (r) { return r.type === 'reservation' && r.date === key })
      var body = ''
      if (rows.length === 0) {
        body = '<p class="note">予約はありません</p>'
      } else {
        body = '<ul class="summary__rows">'
        SLOTS.forEach(function (slot) {
          var inSlot = rows.filter(function (r) { return r.slot === slot })
          if (!inSlot.length) return
          var byCourse = {}
          inSlot.forEach(function (r) { byCourse[r.course] = (byCourse[r.course] || 0) + 1 })
          var parts = COURSES.filter(function (c) { return byCourse[c] }).map(function (c) { return esc(c) + ' ' + byCourse[c] + '名' })
          body += '<li>' + esc(slot) + ' ｜ ' + parts.join('／') + '</li>'
        })
        body += '</ul>'
      }
      html += '<div class="summary__col">' +
        '<p class="summary__day">' + esc(col.label + ' ' + md(col.d)) + '</p>' +
        '<p class="summary__num">' + rows.length + '件</p>' + body + '</div>'
    })
    $('summary-cols').innerHTML = html
  }

  function renderSeats() {
    var d = addDays(today(), state.seatOffset)
    var key = ymd(d)
    $('seat-date').textContent = md(d)
    $('seat-prev').disabled = state.seatOffset <= 0
    $('seat-next').disabled = state.seatOffset >= MAX_DAYS
    var html = ''
    SLOTS.forEach(function (slot) {
      var used = Math.min(usedSeats(key, slot), CAPACITY)
      var left = CAPACITY - used
      var dots = ''
      for (var i = 0; i < CAPACITY; i++) dots += '<span class="dot' + (i < used ? ' is-used' : '') + '"></span>'
      var full = left === 0
      html += '<div class="card seat-card' + (full ? ' is-full' : '') + '">' +
        '<p class="seat-card__time">' + esc(slot) + '〜</p>' +
        '<p class="seat-card__num">' + (full ? '満席' : left + '<span class="seat-card__of"> / ' + CAPACITY + '</span>') + '</p>' +
        '<p class="visually-hidden">' + (full ? '残り0席（満席）' : '残り' + left + '席') + '</p>' +
        '<div class="dots" aria-hidden="true">' + dots + '</div>' +
        '</div>'
    })
    $('seats-grid').innerHTML = html
  }

  function renderFilters() {
    var defs = [
      { key: 'all', label: 'すべて', n: state.items.length },
      { key: 'new', label: '未対応', n: countBy('new') },
      { key: 'doing', label: '対応中', n: countBy('doing') },
      { key: 'done', label: '完了', n: countBy('done') }
    ]
    $('filters').innerHTML = defs.map(function (f) {
      return '<button type="button" class="filter" data-filter="' + f.key + '" aria-pressed="' + (state.filter === f.key ? 'true' : 'false') + '">' +
        esc(f.label) + ' ' + f.n + '</button>'
    }).join('')
  }

  function actionButtons(r) {
    if (r.status === 'new') return '<button type="button" class="btn btn--primary" data-act="doing" data-id="' + esc(r.id) + '">対応中にする</button>'
    if (r.status === 'doing') return '<button type="button" class="btn btn--primary" data-act="done" data-id="' + esc(r.id) + '">完了にする</button>'
    return '<button type="button" class="btn btn--secondary" data-act="new" data-id="' + esc(r.id) + '">未対応に戻す</button>'
  }

  function itemHtml(r) {
    var st = STATUS[r.status]
    var isRes = r.type === 'reservation'
    var d = parseYmd(r.date)
    var when = isRes && d ? md(d) + ' ' + r.slot + '〜' : 'お問い合わせ'
    var memoLabel = 'お店のメモ' + (r.memo ? '（メモあり）' : '')
    var open = state.openMemos[r.id] ? ' open' : ''
    var memoId = 'memo-' + esc(r.id)
    return '<li class="item card' + (r.status === 'new' ? ' is-new' : '') + '" data-id="' + esc(r.id) + '" tabindex="-1" aria-label="' + esc(r.name + '、' + st.label) + '">' +
      '<div class="item__grid">' +
        '<div class="item__meta">' +
          '<span class="item__status"><span class="badge ' + st.cls + '"><span class="badge__icon badge__icon--' + r.status + '" aria-hidden="true"></span>' + st.label + '</span></span>' +
          '<span class="item__kind"><span class="badge badge--kind">' + (isRes ? '予約' : '問い合わせ') + '</span><span class="item__course-pc">' + esc(r.course) + '</span></span>' +
          '<span class="item__received">' + esc(receivedText(r.receivedAt)) + '</span>' +
        '</div>' +
        '<p class="item__when">' + esc(when) + '<span class="item__course-sp">' + (isRes ? '　' : ' ｜ ') + esc(r.course) + '</span></p>' +
        '<div class="item__who">' +
          '<p class="item__name">' + esc(r.name) + '</p>' +
          '<p class="item__contact">' + esc(r.contact) + '</p>' +
          (r.message ? '<p class="item__message">「' + esc(r.message) + '」</p>' : '') +
        '</div>' +
        '<details class="memo"' + open + '>' +
          '<summary>' + esc(memoLabel) + '</summary>' +
          '<div class="memo__body">' +
            (r.message ? '<p class="item__message-full">ひとこと：「' + esc(r.message) + '」</p>' : '') +
            '<label class="label" for="' + memoId + '">お店の内部メモ（お客さまには見えません）</label>' +
            '<textarea class="input input--area" id="' + memoId + '" maxlength="500">' + esc(r.memo) + '</textarea>' +
            '<div class="memo__row">' +
              '<button type="button" class="btn btn--secondary" data-act="memo" data-id="' + esc(r.id) + '">メモを保存</button>' +
              '<span class="memo__saved" role="status"></span>' +
            '</div>' +
          '</div>' +
        '</details>' +
        '<div class="item__actions">' + actionButtons(r) + '</div>' +
      '</div>' +
    '</li>'
  }

  function renderList(movedId) {
    var list = sorted(state.items).filter(function (r) { return state.filter === 'all' || r.status === state.filter })
    var el = $('list-items')
    if (!list.length) {
      el.innerHTML = '<li class="empty">このタブの受付はありません</li>'
      return
    }
    el.innerHTML = list.map(itemHtml).join('')
    // 開閉の状態を覚えておく
    Array.prototype.forEach.call(el.querySelectorAll('.memo'), function (det) {
      det.addEventListener('toggle', function () {
        var id = det.closest('.item').getAttribute('data-id')
        if (det.open) state.openMemos[id] = true
        else delete state.openMemos[id]
      })
    })
    if (movedId && !reduceMotion) {
      var moved = el.querySelector('.item[data-id="' + cssEsc(movedId) + '"]')
      if (moved) moved.classList.add('is-moved')
    }
  }

  function cssEsc(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, '')
  }

  function renderAdmin(movedId) {
    renderSummary()
    renderSeats()
    renderFilters()
    renderList(movedId)
    updateAdminCount(false)
  }

  var toastTimer = null
  function toast(msg) {
    var t = $('toast')
    t.textContent = msg
    t.classList.add('is-show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { t.classList.remove('is-show') }, 3000)
  }

  function findItem(id) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i]
    return null
  }

  $('filters').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]')
    if (!b) return
    state.filter = b.getAttribute('data-filter')
    renderFilters()
    renderList()
    var again = $('filters').querySelector('[data-filter="' + state.filter + '"]')
    if (again) again.focus()
  })

  $('list-items').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]')
    if (!b) return
    var id = b.getAttribute('data-id')
    var r = findItem(id)
    if (!r) return
    var act = b.getAttribute('data-act')
    if (act === 'memo') {
      var ta = b.closest('.memo').querySelector('textarea')
      r.memo = ta.value.slice(0, 500)
      save()
      var summary = b.closest('.memo').querySelector('summary')
      summary.textContent = 'お店のメモ' + (r.memo ? '（メモあり）' : '')
      var msg = b.parentNode.querySelector('.memo__saved')
      msg.textContent = '保存しました'
      setTimeout(function () { msg.textContent = '' }, 2000)
      return
    }
    if (!STATUS[act]) return
    // 状態変更の前に、書きかけのメモを失わないよう取り込む
    var memoTa = b.closest('.item').querySelector('.memo textarea')
    if (memoTa && memoTa.value !== r.memo && b.closest('.item').querySelector('.memo').open) r.memo = memoTa.value.slice(0, 500)
    r.status = act
    save()
    renderAdmin(id)
    toast(r.name + 'さんを『' + STATUS[act].label + '』にしました')
    var moved = $('list-items').querySelector('.item[data-id="' + cssEsc(id) + '"]')
    if (moved) moved.focus()
    else {
      var cur = $('filters').querySelector('[aria-pressed="true"]')
      if (cur) cur.focus()
    }
    syncSlotChoices()
  })

  $('seat-prev').addEventListener('click', function () {
    if (state.seatOffset > 0) { state.seatOffset--; renderSeats() }
    if (state.seatOffset === 0) $('seat-next').focus()
  })
  $('seat-next').addEventListener('click', function () {
    if (state.seatOffset < MAX_DAYS) { state.seatOffset++; renderSeats() }
    if (state.seatOffset === MAX_DAYS) $('seat-prev').focus()
  })

  $('reset').addEventListener('click', function () {
    if (!window.confirm('入力した受付を消して、見本データ8件に戻します。よろしいですか？')) return
    state.items = sampleData()
    state.filter = 'all'
    state.seatOffset = 0
    state.openMemos = {}
    save()
    renderAdmin()
    syncSlotChoices()
    setGuide(true)
    toast('見本データ8件に戻しました')
  })

  // ---------- 使い方3ステップ（閉じたら記録し、次からは出さない） ----------
  function setGuide(show) {
    $('guide').hidden = !show
    try {
      if (show) window.localStorage.removeItem(GUIDE_KEY)
      else window.localStorage.setItem(GUIDE_KEY, '1')
    } catch (e) { /* 保存できない環境では、この表示中だけ閉じる */ }
  }
  $('guide-close').addEventListener('click', function () {
    setGuide(false)
    var sel = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true' })[0]
    if (sel) sel.focus()
  })
  try {
    if (window.localStorage.getItem(GUIDE_KEY) === '1') $('guide').hidden = true
  } catch (e) { /* localStorage が使えなければ毎回出す */ }

  // ---------- お客さま画面（受付フォーム） ----------
  var form = $('entry-form')
  var inDate = $('in-date')
  var inName = $('in-name')
  var inContact = $('in-contact')
  var inMessage = $('in-message')

  function radioValue(name) {
    var c = form.querySelector('input[name="' + name + '"]:checked')
    return c ? c.value : ''
  }

  function isReservation() { return radioValue('type') === 'reservation' }

  function setDateRange() {
    inDate.min = ymd(today())
    inDate.max = ymd(addDays(today(), MAX_DAYS))
  }

  function syncSlotChoices() {
    var current = radioValue('slot')
    var d = parseYmd(inDate.value)
    var inRange = d && d >= today() && d <= addDays(today(), MAX_DAYS)
    var html = ''
    SLOTS.forEach(function (slot, i) {
      var left = inRange ? Math.max(CAPACITY - usedSeats(inDate.value, slot), 0) : null
      var full = left === 0
      var seatText = left === null ? '' : (full ? '満席' : '残り' + left + '席')
      html += '<label class="choice"><input type="radio" name="slot" value="' + esc(slot) + '"' +
        (current === slot && !full ? ' checked' : '') + (full ? ' disabled' : '') + '>' +
        '<span>' + esc(slot) + '〜' + (seatText ? '<span class="seat-left">' + esc(seatText) + '</span>' : '') + '</span></label>'
    })
    $('slot-choices').innerHTML = html
  }

  function normalize(s) {
    // 全角の数字・記号を半角に
    return s.replace(/[０-９Ａ-Ｚａ-ｚ＠．－＋]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0) })
      .replace(/[ー−‐]/g, '-').trim()
  }

  function isContact(v) {
    var s = normalize(v)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return true
    if (/^\+?[0-9][0-9-]+$/.test(s)) {
      var digits = s.replace(/[^0-9]/g, '').length
      return digits >= 10 && digits <= 13
    }
    return false
  }

  // 項目ごとのチェック。エラー文（なければ ''）を返す
  var checks = {
    course: function () { return radioValue('course') ? '' : '講座を選んでください' },
    date: function () {
      if (!isReservation()) return ''
      if (!inDate.value) return '希望日を選んでください'
      var d = parseYmd(inDate.value)
      if (!d || d < today() || d > addDays(today(), MAX_DAYS)) return '希望日は今日から30日以内で選んでください'
      return ''
    },
    slot: function () {
      if (!isReservation()) return ''
      var v = radioValue('slot')
      if (!v) return '時間帯を選んでください'
      if (parseYmd(inDate.value) && usedSeats(inDate.value, v) >= CAPACITY) return 'この時間帯は満席です。別の時間帯をお選びください'
      return ''
    },
    name: function () { return inName.value.trim() ? '' : 'お名前を入力してください' },
    contact: function () {
      if (!inContact.value.trim()) return '連絡先を入力してください'
      if (!isContact(inContact.value)) return '電話番号（例：090-0000-0000）かメールアドレス（例：sample@example.com）の形で入力してください'
      return ''
    }
  }

  var fieldEls = {
    course: { wrap: $('f-course'), err: $('err-course'), focus: function () { return form.querySelector('input[name="course"]') } },
    date: { wrap: $('f-date'), err: $('err-date'), input: inDate, focus: function () { return inDate } },
    slot: { wrap: $('f-slot'), err: $('err-slot'), focus: function () { return form.querySelector('input[name="slot"]:checked') || form.querySelector('input[name="slot"]:not(:disabled)') } },
    name: { wrap: $('f-name'), err: $('err-name'), input: inName, focus: function () { return inName } },
    contact: { wrap: $('f-contact'), err: $('err-contact'), input: inContact, focus: function () { return inContact } }
  }

  function showError(key, msg) {
    var f = fieldEls[key]
    f.err.textContent = msg
    f.err.hidden = !msg
    f.wrap.classList.toggle('is-invalid', !!msg)
    if (f.input) {
      if (msg) f.input.setAttribute('aria-invalid', 'true')
      else f.input.removeAttribute('aria-invalid')
    } else {
      // 選択ボタンのグループは中の radio に aria-invalid を付ける
      Array.prototype.forEach.call(f.wrap.querySelectorAll('input[type="radio"]'), function (r) {
        if (msg) { r.setAttribute('aria-invalid', 'true'); r.setAttribute('aria-describedby', f.err.id) } else { r.removeAttribute('aria-invalid'); r.removeAttribute('aria-describedby') }
      })
    }
  }

  function checkOne(key) {
    var msg = checks[key]()
    showError(key, msg)
    return msg
  }

  function checkAll() {
    var errors = []
    Object.keys(checks).forEach(function (k) { if (checkOne(k)) errors.push(k) })
    var box = $('error-summary')
    if (errors.length) {
      box.textContent = '入力内容を確認してください（' + errors.length + '件）'
      box.hidden = false
    } else {
      box.hidden = true
    }
    return errors
  }

  function recheckIfSubmitted(key) {
    if (!state.submitted) return
    checkOne(key)
    var n = Object.keys(checks).filter(function (k) { return !fieldEls[k].err.hidden }).length
    var box = $('error-summary')
    if (n) box.textContent = '入力内容を確認してください（' + n + '件）'
    box.hidden = n === 0
  }

  function syncType() {
    var area = $('reservation-only')
    var show = isReservation()
    if (area.hidden === !show) return
    area.hidden = !show
    if (show && !reduceMotion) {
      area.classList.remove('is-fading')
      void area.offsetWidth
      area.classList.add('is-fading')
    }
    if (!show) { showError('date', ''); showError('slot', '') }
  }

  form.addEventListener('change', function (e) {
    var n = e.target.name
    if (n === 'type') { syncType(); if (state.submitted) { recheckIfSubmitted('date'); recheckIfSubmitted('slot') } }
    if (n === 'course') recheckIfSubmitted('course')
    if (n === 'slot') recheckIfSubmitted('slot')
  })
  inDate.addEventListener('change', function () {
    syncSlotChoices()
    recheckIfSubmitted('date')
    if (state.submitted) recheckIfSubmitted('slot')
  })
  inDate.addEventListener('blur', function () { recheckIfSubmitted('date') })
  inName.addEventListener('blur', function () { recheckIfSubmitted('name') })
  inContact.addEventListener('blur', function () { recheckIfSubmitted('contact') })
  inMessage.addEventListener('input', function () {
    $('count-message').textContent = '残り' + Math.max(200 - inMessage.value.length, 0) + '文字'
  })

  form.addEventListener('submit', function (e) {
    e.preventDefault()
    state.submitted = true
    setDateRange()
    var errors = checkAll()
    if (errors.length) {
      var target = fieldEls[errors[0]].focus()
      if (target) target.focus()
      else $('error-summary').focus()
      return
    }
    var res = isReservation()
    var item = {
      id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: res ? 'reservation' : 'inquiry',
      status: 'new',
      date: res ? inDate.value : '',
      slot: res ? radioValue('slot') : '',
      course: radioValue('course'),
      name: inName.value.trim().slice(0, 40),
      contact: inContact.value.trim().slice(0, 80),
      message: inMessage.value.trim().slice(0, 200),
      memo: '',
      receivedAt: new Date().toISOString()
    }
    // 外部へは送らず、ブラウザ内に保存するだけ
    state.items.push(item)
    save()
    renderAdmin()
    updateAdminCount(true)
    form.hidden = true
    $('done').hidden = false
    $('done').focus()
  })

  function resetForm() {
    form.reset()
    state.submitted = false
    Object.keys(fieldEls).forEach(function (k) { showError(k, '') })
    $('error-summary').hidden = true
    $('count-message').textContent = '残り200文字'
    syncType()
    setDateRange()
    syncSlotChoices()
  }

  $('again').addEventListener('click', function () {
    resetForm()
    $('done').hidden = true
    form.hidden = false
    var first = form.querySelector('input[name="type"]:checked')
    if (first) first.focus()
  })

  $('go-admin').addEventListener('click', function () {
    resetForm()
    $('done').hidden = true
    form.hidden = false
    state.filter = 'all'
    renderAdmin()
    selectTab($('tab-admin'), true)
  })

  // ---------- 開始 ----------
  state.items = load()
  // 初回（保存なし）なら見本データを保存しておく
  save()
  showStorageNote()
  setDateRange()
  syncSlotChoices()
  renderAdmin()
})()
