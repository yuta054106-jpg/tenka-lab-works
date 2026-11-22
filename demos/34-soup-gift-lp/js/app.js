// スープ工房 ユキノメ（デモ・架空のお店）冷凍スープの詰め合わせの商品LP
// 外部通信なし・保存なし（URL のハッシュも使わない）。操作は選ぶボタン（radio）と開閉だけ。文字を入れる欄なし
// 表示はすべて createElement・textContent・replaceChildren
;(function () {
  'use strict'
  var root = typeof window !== 'undefined' ? window : {}
  function fz (o) { return Object.freeze(o) }

  // ---------- スープ4種（すべて架空。順は固定） ----------
  var SOUPS = fz([
    fz({ id: 'pumpkin', name: 'かぼちゃのポタージュ', short: 'かぼちゃ', note: 'かぼちゃの甘みを、牛乳でのばしたなめらかなポタージュ。', gu: 'かぼちゃ・玉ねぎ', genzai: 'かぼちゃ、玉ねぎ、牛乳、生クリーム、バター、食塩' }),
    fz({ id: 'potato', name: 'じゃがいもとベーコンのスープ', short: 'じゃがいも', note: 'ほくほくのじゃがいもに、ベーコンの塩けを少し。', gu: 'じゃがいも・ベーコン・玉ねぎ', genzai: 'じゃがいも、牛乳、ベーコン（豚肉を含む）、玉ねぎ、小麦粉、バター、食塩' }),
    fz({ id: 'tomato', name: 'トマトと豆のスープ', short: 'トマト', note: 'トマトの酸味に、3種の豆。スプーンですくう、具の多い一杯。', gu: 'トマト・ひよこ豆・白いんげん豆・レンズ豆', genzai: 'トマト、ひよこ豆、白いんげん豆、レンズ豆、玉ねぎ、セロリ、オリーブ油、食塩' }),
    fz({ id: 'kinoko', name: 'きのこのクリームスープ', short: 'きのこ', note: '3種のきのこを炒めて、生クリームでまとめました。仕上げに、砕いたくるみを少し。', gu: 'しめじ・まいたけ・マッシュルーム', genzai: 'しめじ、まいたけ、マッシュルーム、玉ねぎ、生クリーム、小麦粉、くるみ、バター、食塩' })
  ])
  var BAG_G = 250

  // ---------- セット・包装・地域（すべて架空・税込・整数の円） ----------
  var SETS = fz([
    fz({ id: 's4', name: 'お試し4袋セット', short: '4袋', each: 1, price: 3600 }),
    fz({ id: 's8', name: '8袋セット', short: '8袋', each: 2, price: 6800 }),
    fz({ id: 's12', name: '12袋セット', short: '12袋', each: 3, price: 9800 })
  ])
  var GIFT_FEE = 330 // ギフト包装 あり（1箱。セットによらず同じ）
  var REGIONS = fz([
    fz({ id: 'hokkaido', name: '北海道', ship: 1320, delivery: 'ご注文から4〜6日ほどでお届けします（目安・架空）。' }),
    fz({ id: 'mainland', name: '本州・四国・九州', ship: 1100, delivery: 'ご注文から3〜5日ほどでお届けします（目安・架空）。' }),
    fz({ id: 'okinawa', name: '沖縄・離島', ship: 1980, delivery: 'ご注文から5〜8日ほどでお届けします（目安・架空）。島によっては、もう少しかかります。' })
  ])

  // ---------- アレルゲン（特定原材料8品目。ここに無い品目は「含まない」） ----------
  var ALLERGENS = fz(['乳', '小麦', '卵', 'えび', 'かに', 'そば', '落花生', 'くるみ'])
  var ALLERGEN_TABLE = fz({
    pumpkin: fz(['乳']),
    potato: fz(['乳', '小麦']),
    tomato: fz([]),
    kinoko: fz(['乳', '小麦', 'くるみ'])
  })

  // ---------- 純粋な関数（整数だけ） ----------
  function find (list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]
    return null
  }
  function calc (setId, giftId, regionId) {
    var s = find(SETS, setId)
    var r = find(REGIONS, regionId)
    var items = SOUPS.map(function (p) { return fz({ id: p.id, name: p.name, bags: s.each }) })
    var wrap = giftId === 'wrap' ? GIFT_FEE : 0
    return fz({
      setName: s.name, short: s.short, items: fz(items), bags: s.each * SOUPS.length,
      goods: s.price, wrap: wrap, gift: giftId === 'wrap', ship: r.ship,
      regionName: r.name, delivery: r.delivery, total: s.price + wrap + r.ship
    })
  }
  // 3けた区切りは自前（0 以上の整数）
  function fmtYen (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) {
      out = ',' + s.slice(s.length - 3) + out
      s = s.slice(0, s.length - 3)
    }
    return s + out + '円'
  }
  function fmtBags (n) { return n + '袋' }
  function srSummary (c) {
    return c.setName + '、ギフト包装' + (c.gift ? 'あり' : 'なし') + '、' + c.regionName + '。合計' + fmtYen(c.total) + 'です。'
  }
  function fixSummary (c) { return c.short + '・包装' + (c.gift ? 'あり' : 'なし') }

  // 検査用の出口（凍結した定数と純粋な関数だけ）
  root.__demo34 = fz({
    SOUPS: SOUPS, BAG_G: BAG_G, SETS: SETS, GIFT_FEE: GIFT_FEE, REGIONS: REGIONS, ALLERGENS: ALLERGENS, ALLERGEN_TABLE: ALLERGEN_TABLE,
    calc: calc, fmtYen: fmtYen, fmtBags: fmtBags, srSummary: srSummary, fixSummary: fixSummary
  })
  if (typeof document === 'undefined') return

  // ---------- 画面 ----------
  function $ (id) { return document.getElementById(id) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined && text !== null) e.textContent = text
    return e
  }
  function nw (text) { return el('span', 'nw', text) }
  function all (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)) }
  // 文の中の「3〜5日」「（目安・架空）」を span.nw に分けて入れる（語の途中で折らない）
  var NW_RE = /(\d+〜\d+日|（目安・架空）)/
  function nwParts (text) {
    return text.split(NW_RE).filter(function (t) { return t !== '' }).map(function (t) { return NW_RE.test(t) ? nw(t) : t })
  }
  var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態（画面の中だけ。保存しない） ----------
  var INIT = fz({ set: 's8', gift: 'none', region: 'mainland' })
  var state = { set: INIT.set, gift: INIT.gift, region: INIT.region }

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

  // ---------- セットを選ぶ ----------
  function readState () {
    ;['set', 'gift', 'region'].forEach(function (k) {
      var c = document.querySelector('input[name="' + k + '"]:checked')
      if (c) state[k] = c.value
    })
  }
  function sumLine (c) {
    return [nw(c.setName), '・', nw('ギフト包装' + (c.gift ? 'あり' : 'なし')), '・', nw(c.regionName)]
  }
  function render () {
    var c = calc(state.set, state.gift, state.region)
    var t = fmtYen(c.total)
    $('r-total').replaceChildren(t.slice(0, t.length - 1), el('span', 'result__yen', '円'))
    $('r-bags').replaceChildren(nw('全' + fmtBags(c.bags)), '（', nw('1袋' + BAG_G + 'g'), '・', nw('1人前'), '）')
    $('r-items').replaceChildren.apply($('r-items'), c.items.map(function (it) {
      var li = el('li')
      li.appendChild(el('span', 'result__soup', it.name))
      li.appendChild(el('span', 'result__n nw', fmtBags(it.bags)))
      return li
    }))
    $('r-goods-dt').replaceChildren('商品代（', nw(c.setName), '）')
    $('r-goods').textContent = fmtYen(c.goods)
    if (c.gift) $('r-wrap').replaceChildren(nw(fmtYen(c.wrap)))
    else $('r-wrap').replaceChildren(nw('0円'), nw('（なし）'))
    $('r-ship-dt').replaceChildren('送料（冷凍便・', nw(c.regionName), '）')
    $('r-ship').textContent = fmtYen(c.ship)
    $('r-delivery').replaceChildren.apply($('r-delivery'), nwParts(c.delivery))
    $('fix-set').textContent = fixSummary(c)
    $('fix-total').textContent = t
    $('buy-sum').replaceChildren.apply($('buy-sum'), sumLine(c))
    $('buy-total').textContent = t
    return c
  }
  function onChange () {
    readState()
    var c = render()
    say(srSummary(c))
  }

  // ---------- 購入の案内（dialog） ----------
  var lastTrigger = null
  function openDialog (e) {
    var d = $('buy-dialog')
    lastTrigger = e.currentTarget
    var c = calc(state.set, state.gift, state.region)
    $('dlg-sum').replaceChildren.apply($('dlg-sum'), sumLine(c))
    $('dlg-total').textContent = fmtYen(c.total)
    if (typeof d.showModal === 'function') d.showModal()
    else d.setAttribute('open', '')
    $('dlg-title').focus()
  }
  function closeDialog () {
    var d = $('buy-dialog')
    if (typeof d.close === 'function' && d.open) d.close()
    else { d.removeAttribute('open'); afterClose() }
  }
  function afterClose () {
    var t = lastTrigger
    lastTrigger = null
    if (!t) return
    // 固定ボタンが隠れていたら、ご購入の見出しへ
    if (t.id === 'fix-cta' && getComputedStyle($('fixbar')).visibility === 'hidden') { $('h-buy').focus(); return }
    t.focus()
  }

  // ---------- スマホの固定ボタン ----------
  function initFixbar () {
    var bar = $('fixbar')
    if (!('IntersectionObserver' in root)) { bar.classList.remove('is-hide'); return }
    // ファーストビューのボタンは「見えている」か「まだ画面より下にある」間は隠す（見る範囲を下へ大きく広げる）
    // 結果の下とご購入のボタンは、見えている間だけ隠す（同じボタンを2つ並べない）
    var seen = { hero: true, set: false, buy: false }
    function update () { bar.classList.toggle('is-hide', seen.hero || seen.set || seen.buy) }
    var ioHero = new IntersectionObserver(function (es) {
      es.forEach(function (en) { seen.hero = en.isIntersecting })
      update()
    }, { rootMargin: '0px 0px 100000px 0px' })
    var ioCta = new IntersectionObserver(function (es) {
      es.forEach(function (en) { seen[en.target.id === 'set-cta' ? 'set' : 'buy'] = en.isIntersecting })
      update()
    })
    ioHero.observe($('hero-cta'))
    ioCta.observe($('set-cta'))
    ioCta.observe($('buy-cta'))
  }

  function init () {
    // 再読み込みでブラウザが前の選択を戻すことがあるので、HTML の最初の値に入れ直す
    all('.opt__input').forEach(function (i) { i.checked = i.value === INIT[i.name] })
    readState()
    render()
    all('.opt__input').forEach(function (i) { i.addEventListener('change', onChange) })
    ;['set-cta', 'buy-cta', 'fix-cta'].forEach(function (id) { $(id).addEventListener('click', openDialog) })
    var d = $('buy-dialog')
    $('dlg-close').addEventListener('click', closeDialog)
    d.addEventListener('close', afterClose)
    // 幕（dialog の外側）を押した時だけ閉じる
    // （dialog の内側の余白を押した時も target は dialog になるので、押した位置が箱の外かも見る）
    d.addEventListener('click', function (e) {
      if (e.target !== d) return
      var b = d.getBoundingClientRect()
      var out = e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom
      if (out) closeDialog()
    })
    $('hero-cta').addEventListener('click', function () { goTo('h-set') })
    document.querySelector('.hd__logo').addEventListener('click', function (e) { e.preventDefault(); goTo('top') })
    $('to-set').addEventListener('click', function (e) { e.preventDefault(); goTo('h-set') })
    $('to-allergen').addEventListener('click', function (e) { e.preventDefault(); goTo('h-allergen') })
    initFixbar()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
