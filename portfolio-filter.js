// 作品例の「やりたいことで絞り込む」（portfolio-filter-design.md／ヨウタンワ 2026-11-22）
// JS が動かないときは .filter が hidden のまま＝全件表示。外部通信・ライブラリなし。
(function () {
  'use strict'

  // 分類の定義（チップの並び順もこのとおり）
  var CATS = [
    ['all', 'すべて'],
    ['page', 'ホームページ・LP'],
    ['reserve', '予約・受付・注文'],
    ['money', '売上・お金の管理'],
    ['stock', '在庫・仕込み・原価'],
    ['staff', 'スタッフ・日々の作業'],
    ['customer', 'お客様対応・常連づくり'],
    ['ai', 'AI の活用'],
  ]

  var section = document.getElementById('works')
  var filter = document.getElementById('works-filter')
  if (!section || !filter) return
  var chipsBox = filter.querySelector('.filter__chips')
  var status = filter.querySelector('.filter__status')
  var reset = filter.querySelector('.filter__reset')
  var bottom = section.querySelector('.filter__bottom')
  var bottomBtn = bottom ? bottom.querySelector('.filter__reset-bottom') : null
  var groups = Array.prototype.slice.call(section.querySelectorAll('.group'))
  var cards = Array.prototype.slice.call(section.querySelectorAll('article.card'))
  if (!chipsBox || !status || !cards.length) return

  // カードごとの分類（data-cat は半角スペース区切り）
  var cardCats = cards.map(function (card) {
    var v = (card.getAttribute('data-cat') || '').trim()
    if (!v) console.warn('作品例のカードに data-cat がありません：', card.getAttribute('aria-labelledby'))
    return v ? v.split(/\s+/) : []
  })
  var total = cards.length

  function countOf(key) {
    if (key === 'all') return total
    return cardCats.filter(function (c) { return c.indexOf(key) !== -1 }).length
  }
  function nameOf(key) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === key) return CATS[i][1]
    return ''
  }
  function isKey(key) { return !!nameOf(key) }

  // チップを作る（件数は data-cat から数える）
  var chips = CATS.map(function (cat) {
    var b = document.createElement('button')
    b.type = 'button'
    b.className = 'filter__chip'
    b.setAttribute('data-cat', cat[0])
    b.setAttribute('aria-pressed', 'false')
    var mark = document.createElement('span')
    mark.className = 'filter__mark'
    mark.setAttribute('aria-hidden', 'true')
    var name = document.createElement('span')
    name.className = 'filter__name'
    name.textContent = cat[1]
    var count = document.createElement('span')
    count.className = 'filter__count'
    count.textContent = countOf(cat[0]) + '件'
    b.appendChild(mark)
    b.appendChild(name)
    b.appendChild(count)
    chipsBox.appendChild(b)
    return b
  })

  var allLabel = 'すべての作品例を見る（' + total + '件）'
  if (bottomBtn) bottomBtn.textContent = allLabel

  // 0件のときの案内（いまの分類では出ない。将来カードを外したときの保険）
  var emptyWrap = document.createElement('div')
  emptyWrap.className = 'wrap filter__empty-wrap'
  emptyWrap.hidden = true
  emptyWrap.style.marginTop = 'var(--sp-6)'
  var empty = document.createElement('div')
  empty.className = 'filter__empty'
  var emptyText = document.createElement('p')
  emptyText.textContent = 'この分類の作品例は、いまはありません。お店に合わせて作れますので、ご相談ください。'
  var emptyBtn = document.createElement('button')
  emptyBtn.type = 'button'
  emptyBtn.className = 'btn btn--sub'
  emptyBtn.textContent = allLabel
  empty.appendChild(emptyText)
  empty.appendChild(emptyBtn)
  emptyWrap.appendChild(empty)
  // 最後のグループの後ろに置く（全グループが消えたときは、見た目上 1つ目のグループの位置に出る）。
  // 先頭に差し込むと CSS の .works__head + .group（見出し直下の余白）が効かなくなるため
  if (groups.length) {
    var last = groups[groups.length - 1]
    last.parentNode.insertBefore(emptyWrap, last.nextSibling)
  }

  var current = 'all'

  function apply(key, animate) {
    current = key
    chips.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-cat') === key ? 'true' : 'false')
    })
    var shown = 0
    cards.forEach(function (card, i) {
      var c = cardCats[i]
      var show = key === 'all' || c.indexOf(key) !== -1
      var wasHidden = card.hidden
      card.hidden = !show
      card.classList.remove('is-in')
      if (show) {
        shown++
        if (animate && wasHidden) {
          void card.offsetWidth  // アニメーションをやり直すため
          card.classList.add('is-in')
        }
      }
    })
    groups.forEach(function (g) {
      g.hidden = !g.querySelector('article.card:not([hidden])')
    })
    var filtered = key !== 'all'
    if (!filtered) status.textContent = 'すべての作品例 ' + total + '件を表示しています'
    else if (shown === 0) status.textContent = '「' + nameOf(key) + '」の作品例は 0件です'
    else status.textContent = '「' + nameOf(key) + '」の作品例 ' + shown + '件を表示しています'
    if (reset) reset.hidden = !filtered
    if (bottom) bottom.hidden = !filtered || shown === 0
    emptyWrap.hidden = shown !== 0
  }

  function writeUrl(key) {
    if (!window.history || !history.replaceState) return
    try {
      var params = new URLSearchParams(location.search)
      if (key === 'all') params.delete('cat')
      else params.set('cat', key)
      var q = params.toString()
      history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash)
    } catch (e) {
      // file:// などで書き換えられなくても、絞り込みはそのまま動かす
    }
  }

  function select(key) {
    apply(key, true)
    writeUrl(key)
  }

  function backToAll() {
    select('all')
    chips[0].focus()
  }

  chipsBox.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.filter__chip') : null
    if (!b) return
    var key = b.getAttribute('data-cat')
    // 選択中のチップを押し直すと「すべて」に戻る
    if (key === current && key !== 'all') key = 'all'
    if (key === current) return
    select(key)
  })
  if (reset) reset.addEventListener('click', backToAll)
  if (bottomBtn) bottomBtn.addEventListener('click', backToAll)
  emptyBtn.addEventListener('click', backToAll)

  // 読み込み時：?cat= が知っている分類ならその分類で始める（読み上げは鳴らさない＝表示前に文を入れる）
  var start = 'all'
  try {
    var q = new URLSearchParams(location.search).get('cat')
    if (q && isKey(q)) start = q
  } catch (e) { start = 'all' }
  apply(start, false)
  filter.hidden = false
})()
