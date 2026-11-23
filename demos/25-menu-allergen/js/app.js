// スープカレー ミズナラ堂（デモ）日本語・英語のメニューと原材料の絞り込み
// 外部通信なし・保存なし（状態はメモリと URL のハッシュだけ）。表示はすべて textContent と createElement
// 文の中の [ ] は折れない span（.nw）、* * は strong、{名前} は数や部品を入れる所
;(function () {
  'use strict'

  // ---------- 原材料（特定原材料 9品目。この順で並べる） ----------
  var ALG_KEYS = Object.freeze(['shrimp', 'crab', 'walnut', 'wheat', 'soba', 'egg', 'milk', 'peanut', 'cashew'])
  // 辞書のキー（チェックの文字・札・並びで使う）
  var ALG_WORD = Object.freeze({ shrimp: 'P4', crab: 'P5', walnut: 'P6', wheat: 'P7', soba: 'P8', egg: 'P9', milk: 'P10', peanut: 'P11', cashew: 'P12' })
  var CATS = Object.freeze(['curry', 'topping', 'side', 'drink'])
  var CAT_WORD = Object.freeze({ curry: 'M1', topping: 'M2', side: 'M3', drink: 'M4' })

  // ---------- メニュー（すべて架空。値段は税込） ----------
  function item (id, cat, ja, en, price, add, spice, alg, dja, den) {
    return Object.freeze({ id: id, cat: cat, ja: Object.freeze(ja), en: Object.freeze(en), price: price, add: add, spice: spice, alg: Object.freeze(alg), desc: Object.freeze({ ja: dja, en: den }) })
  }
  var MENU = Object.freeze([
    item('sc-chicken', 'curry', ['チキンと野菜の', 'スープカレー'], ['Chicken', 'and', 'Vegetable', 'Soup', 'Curry'], 1480, false, 2, ['wheat'],
      '骨つきの鶏もも1本と、素揚げの野菜10種類。基本のスープです。', 'A chicken leg on the bone with 10 kinds of fried vegetables. Basic soup.'),
    item('sc-pork', 'curry', ['豚の角煮と', '半熟卵の', 'スープカレー'], ['Braised', 'Pork', 'and', 'Egg', 'Soup', 'Curry'], 1580, false, 2, ['wheat', 'egg'],
      'しょうゆで煮た豚の角煮と、半熟卵。基本のスープです。', 'Pork belly braised in soy sauce, with a soft-boiled egg. Basic soup.'),
    item('sc-hamburg', 'curry', ['ハンバーグの', 'スープカレー'], ['Hamburg', 'Steak', 'Soup', 'Curry'], 1580, false, 1, ['wheat', 'egg', 'milk'],
      'パン粉・卵・牛乳をつなぎにした、手ごねのハンバーグ。基本のスープです。', 'A handmade hamburg steak with breadcrumbs, egg and milk. Basic soup.'),
    item('sc-lamb', 'curry', ['ラムと野菜の', 'スープカレー'], ['Lamb', 'and', 'Vegetable', 'Soup', 'Curry'], 1680, false, 4, ['walnut', 'peanut', 'cashew'],
      'くるみと[落花生]のたれに漬けたラム肉。ココナッツのスープです。', 'Lamb marinated in a walnut and peanut sauce. Coconut soup.'),
    item('sc-shrimp', 'curry', ['えびの', 'スープカレー'], ['Shrimp', 'Soup', 'Curry'], 1680, false, 3, ['shrimp', 'wheat', 'milk'],
      '頭つきのえびを2尾。えびのスープです。', 'Two whole shrimp with heads. Shrimp soup.'),
    item('sc-seafood', 'curry', ['海の幸の', 'スープカレー'], ['Seafood', 'Soup', 'Curry'], 1880, false, 3, ['shrimp', 'crab', 'wheat', 'milk'],
      'かに・ほたて・いか。えびのスープです。', 'Crab, scallops and squid. Shrimp soup.'),
    item('sc-veg', 'curry', ['野菜の', 'スープカレー'], ['Vegetable', 'Soup', 'Curry'], 1380, false, 1, ['cashew'],
      'かぼちゃ・なす・ピーマンなど、素揚げの野菜15種類。ココナッツのスープです。', '15 kinds of fried vegetables, such as pumpkin, eggplant and green pepper. Coconut soup.'),
    item('tp-egg', 'topping', ['半熟卵'], ['Soft-Boiled', 'Egg'], 150, true, 0, ['egg'],
      'とろりとした半熟卵を1個。', 'One soft-boiled egg.'),
    item('tp-cheese', 'topping', ['チーズ'], ['Cheese'], 200, true, 0, ['milk'],
      'スープにとけるチーズ。', 'Cheese that melts into the soup.'),
    item('tp-natto', 'topping', ['納豆'], ['Natto', '(Fermented Soybeans)'], 150, true, 0, [],
      '[スープカレー]で人気のトッピング。大豆は[9品目]に入らないため、絞り込みの対象外です。', 'A popular soup curry topping. Soy is not one of the 9 allergens, so the filter does not cover it.'),
    item('tp-shrimp', 'topping', ['えびフライ', '（1本）'], ['Fried', 'Shrimp', '(1 piece)'], 300, true, 0, ['shrimp', 'wheat', 'egg'],
      '衣に小麦粉と卵を使っています。', 'The batter uses wheat flour and egg.'),
    item('tp-veg', 'topping', ['素揚げ野菜の', '追加'], ['Extra', 'Fried', 'Vegetables'], 250, true, 0, [],
      'その日の野菜を3種類。', 'Three vegetables of the day.'),
    item('sd-rice', 'side', ['ライスの', '大盛り'], ['Large', 'Rice'], 100, true, 0, [],
      'ライスを普通盛り（[200g]）から [300g] にします。', 'Makes your rice [300 g] instead of [200 g] (regular).'),
    item('sd-zangi', 'side', ['ザンギ', '（3個）'], ['Zangi', '(Fried Chicken,', '3 pieces)'], 480, false, 0, ['wheat', 'egg'],
      'しょうゆで下味をつけた、北海道ふうの鶏のから揚げ。', 'Hokkaido-style fried chicken seasoned with soy sauce.'),
    item('sd-potato', 'side', ['じゃがバター'], ['Butter', 'Potato'], 380, false, 0, ['milk'],
      '蒸したじゃがいもに、バターをのせて。', 'A steamed potato topped with butter.'),
    item('sd-salad', 'side', ['くるみの', 'サラダ'], ['Walnut', 'Salad'], 420, false, 0, ['walnut', 'egg'],
      'くるみと葉もの野菜に、卵のドレッシング。', 'Leafy greens and walnuts with an egg dressing.'),
    item('dr-lassi', 'drink', ['ラッシー'], ['Lassi', '(Yogurt Drink)'], 380, false, 0, ['milk'],
      'ヨーグルトの飲みもの。辛さをやわらげます。', 'A yogurt drink. It makes the spice feel milder.'),
    item('dr-soba', 'drink', ['そば茶'], ['Buckwheat', 'Tea'], 250, false, 0, ['soba'],
      'そばの実を煎ったお茶（温・冷）。', 'Roasted buckwheat tea, hot or iced.'),
    item('dr-oolong', 'drink', ['ウーロン茶'], ['Oolong', 'Tea'], 250, false, 0, [],
      '温・冷を選べます。', 'Hot or iced.'),
    item('dr-ginger', 'drink', ['ジンジャーエール'], ['Ginger', 'Ale'], 350, false, 1, [],
      'しょうがを煮て作った、お店の[ジンジャーエール]。', 'Our ginger ale, made from simmered ginger.')
  ])

  // ---------- 辞書（日本語・英語。キーの数と名前は同じ） ----------
  var I18N = Object.freeze({
    ja: Object.freeze({
      T1: 'スープカレー ミズナラ堂（デモ）日本語・英語のメニューと原材料の絞り込み｜TENKA LAB',
      T2: '*[TENKA LAB] の動く*[*デモ*（架空のお店）]です。お店・メニュー・値段・原材料はすべて[架空]です。',
      T3: '作品例一覧へ',
      T4: 'デモ',
      T5: '表示の言語',
      T6: 'すぐに使うボタン',
      NAME: 'スープカレー ミズナラ堂',
      H0: 'デモ（架空のお店）',
      H1: '日本語・英語のメニュー',
      H1a: 'スープカレー',
      H1b: 'ミズナラ堂',
      H2: '[スープカレー]のお店[（架空）]のメニューです。日本語と英語を切り替えて、原材料で絞り込めます。',
      H3: '原材料で絞り込む',
      C0: 'アレルギーについて',
      C1: 'これは[デモ（架空のお店）]です。お店・メニュー・値段・原材料はすべて[架空]で、実際の原材料ではありません。',
      C2: '同じ厨房・同じ調理器具で調理するため、表示にない原材料がごく少量混ざることがあります（実際のお店では、お店が調べて書きます）。',
      C3: '表示しているのは、特定原材料の[9品目]（[えび]・[かに]・[くるみ]・[小麦]・[そば]・[卵]・[乳]・[落花生]・[カシューナッツ]）だけです。大豆・ごまなど、特定原材料に準ずる[20品目]は表示していません。',
      C4: 'トッピングやサイドを足すと、その原材料も加わります。',
      C5: '食物アレルギーのある方は、注文の前にお店の人へ直接お伝えください。',
      P1: '原材料で絞り込む',
      P2: '選んだ原材料を含む品は、隠さずにメニューのいちばん下にまとめます。いくつでも選べます。',
      P3: '原材料（[9品目]）',
      P4: 'えび',
      P5: 'かに',
      P6: 'くるみ',
      P7: '小麦',
      P8: 'そば',
      P9: '卵',
      P10: '乳',
      P11: '落花生',
      P12: 'カシューナッツ',
      R1: '原材料を選んでいません。全[20品]を表示しています。',
      R2: '選んだ原材料：[{n}つ] ／ 含まない品：[{a}品] ／ 含む品：[{b}品]{link}',
      RL: '（下にまとめています）',
      P13: '選んだ原材料をすべて外す',
      P14: '選んだ品目を使っているかの情報で並べ替えています。調理中に混ざることがあります。実際のお店では、食物アレルギーのある方は注文の前にお店の人へお伝えください。',
      P15: '選んだ原材料はページのアドレスに残ります（共有すると相手にも伝わります）。',
      M0: 'メニュー',
      M1: 'スープカレー',
      M2: 'トッピング',
      M3: 'サイド',
      M4: '飲みもの',
      M5: '含む原材料（[9品目]のうち）',
      M5n: 'なし',
      M6: '[スープカレー]には、ライス（普通盛り [200g]）がつきます。スープは品ごとに決まっています。',
      M7: 'スープの原材料（[9品目]のうち）',
      M8a: '基本のスープ（鶏と香味野菜）：',
      M8ad: '[小麦]（しょうゆ）',
      M8b: 'えびのスープ：',
      M8bd: '[えび]・[小麦]・[乳]（バター）',
      M8c: 'ココナッツのスープ：',
      M8cd: '[カシューナッツ]',
      M9: 'この分類の品は、すべて選んだ原材料のいずれかを含みます（下にまとめています）。',
      M10: 'トッピングを足すと、その原材料も加わります。例：チキンと野菜の[スープカレー]（[小麦]）に[半熟卵]（[卵]）を足すと、[小麦]と[卵]を含みます。',
      M11: '選んだ原材料を含む品（[{b}品]）',
      M12: '隠さずに、ここにまとめています。注文の前に、お店の人にご相談ください。',
      M13: '値段はすべて税込です[（架空）]。',
      M14: '英語の品名も小さく添えています。',
      M15: '辛さは [0〜5] の[6段階]です（お店の目安）。',
      M16: '選んだ原材料を含む：{alg}',
      SP: '辛さ {n}（{w}）',
      SP0: '辛くない',
      SP1: 'ほんのり',
      SP2: 'ふつう',
      SP3: 'やや辛い',
      SP4: '辛い',
      SP5: 'とても辛い',
      W0a: '[TENKA LAB] より',
      W0b: '実際のお仕事では',
      W1: '紙のメニューの横に [QR] を置き、お客様のスマホで日本語・英語を切り替えて見られるメニューのページをお作りします。',
      W2h: '原材料は、お店に聞き取り',
      W2l: Object.freeze(['品ごと・スープごとに使っている原材料を伺い、[9品目]を表にします', '混ざる可能性の書き方など、表示の内容はお店が決めます']),
      W3h: '翻訳は人の目で',
      W3l: Object.freeze(['機械翻訳のままにせず、短く平易な英語にします', '英語を母語とする方の確認を入れるかは、お見積もりの条件として決めます（費用は別）', '中国語・韓国語などの言語の追加も、お見積もりの条件としてご相談します（費用は別）']),
      W4h: '[QR] の置き場所と更新',
      W4l: Object.freeze(['[QR] はテーブル・レジ横・入口などに置けます', 'メニューや値段が変わった時の直し方（お店で直せる範囲・保守で直す範囲）は、お見積もりの条件として最初に決めます', '費用の目安：ページ[1枚] [80,000円（税込）]から。原材料の絞り込み・言語の切り替えをつける場合は、内容によりお見積もり']),
      W5h: 'お店で確かめていただくこと',
      W5l: Object.freeze(['原材料の表が、仕入れ先の資料（原材料の規格書など）と合っていること', '同じ厨房・調理器具で混ざる可能性の書き方', 'メニューや仕入れ先を変えた時に、原材料の表も直すこと']),
      W6: '原材料と注意書きは、お店が確かめて決め、責任を持ちます。[TENKA LAB] は、お店が確かめた内容を翻訳し、表示と絞り込みに反映します（内容が正しいかは判断しません）。',
      W7: 'ほかの作品例を見る',
      F1: 'このページは [TENKA LAB] が作った動く[デモ]です。[スープカレー ミズナラ堂]と、メニュー・値段・原材料はすべて[架空]です。',
      F2: '作品例を見る',
      B1: '選んだ原材料：[{n}つ]',
      B1z: '原材料を選んでいません',
      B2: '絞り込みへ',
      S0: '原材料を選んでいません。全20品を表示しています。',
      S1: '選んだ原材料：{n}つ。含まない品：{a}品。含む品：{b}品は、メニューの下にまとめました。',
      L: '日本語の表示に切り替えました。'
    }),
    en: Object.freeze({
      T1: 'Soup Curry Mizunara-do (Demo) Menu in Japanese and English with Allergen Filter | TENKA LAB',
      T2: '*A working demo by [TENKA LAB]* [(fictional restaurant).] The restaurant, menu, prices and ingredients are all fictional.',
      T3: 'All works',
      T4: 'Demo',
      T5: 'Language',
      T6: 'Quick actions',
      NAME: 'Soup Curry Mizunara-do',
      H0: 'Demo (fictional restaurant)',
      H1: 'Menu in Japanese and English',
      H1a: 'Soup Curry',
      H1b: 'Mizunara-do',
      H2: 'This is the menu of a soup curry restaurant [(fictional).] You can switch between Japanese and English, and filter by allergen.',
      H3: 'Filter by allergen',
      C0: 'About allergens',
      C1: 'This is a demo [(fictional restaurant).] The restaurant, menu, prices and ingredients are all fictional. This is not real ingredient information.',
      C2: 'We cook everything in the same kitchen with the same tools. Small amounts of ingredients not shown here may get into any dish. (A real restaurant writes this after checking its own kitchen.)',
      C3: 'We only show [9 allergens]: shrimp, crab, walnut, wheat, buckwheat, egg, milk, peanut and cashew. Other allergens, such as soy and sesame, are not shown.',
      C4: 'Toppings and sides add their own allergens.',
      C5: 'If you have a food allergy, please tell our staff before you order.',
      P1: 'Filter by allergen',
      P2: 'Items with the selected allergens are not hidden. They move to the bottom of the menu. You can select more than one.',
      P3: 'Allergens [(9)]',
      P4: 'Shrimp',
      P5: 'Crab',
      P6: 'Walnut',
      P7: 'Wheat',
      P8: 'Buckwheat',
      P9: 'Egg',
      P10: 'Milk',
      P11: 'Peanut',
      P12: 'Cashew',
      R1: 'No allergens selected. Showing all [20 items].',
      R2: 'Selected: [{n}] / Items without them: [{a}] / Items with them: [{b}] {link}',
      RL: '(at the bottom)',
      P13: 'Clear all',
      P14: 'The menu is sorted by whether each item uses the allergens you selected. Allergens can still get into food during cooking. At a real restaurant, if you have a food allergy, please tell the staff before you order.',
      P15: 'Your selected allergens stay in the page address (URL). If you share the link, the other person will see them too.',
      M0: 'Menu',
      M1: 'Soup Curry',
      M2: 'Toppings',
      M3: 'Sides',
      M4: 'Drinks',
      M5: 'Allergens [(of the 9)]',
      M5n: 'None',
      M6: 'Each soup curry comes with rice [(200 g).] Each curry has its own soup.',
      M7: 'Allergens in each soup [(of the 9)]',
      M8a: 'Basic soup (chicken and vegetables):',
      M8ad: 'Wheat (soy sauce)',
      M8b: 'Shrimp soup:',
      M8bd: 'Shrimp, Wheat, Milk (butter)',
      M8c: 'Coconut soup:',
      M8cd: 'Cashew',
      M9: 'Every item here contains at least one of the selected allergens. See the bottom of the menu.',
      M10: 'Toppings add their own allergens. Example: Chicken and Vegetable Soup Curry (Wheat) + [Soft-Boiled] Egg (Egg) contains Wheat and Egg.',
      M11: 'Items with the selected allergens [({b})]',
      M12: 'These items are listed here, not hidden. Please ask our staff before you order.',
      M13: 'All prices include tax [(fictional).]',
      M14: 'Japanese names are shown in small letters. You can point to them when you order.',
      M15: 'Spice levels go from [0 to 5] (our own guide).',
      M16: 'Contains selected: {alg}',
      SP: 'Spice {n} ({w})',
      SP0: 'Not spicy',
      SP1: 'Mild',
      SP2: 'Medium',
      SP3: 'Medium hot',
      SP4: 'Hot',
      SP5: 'Very hot',
      W0a: 'From [TENKA LAB]',
      W0b: 'For a real restaurant',
      W1: 'We make a menu page like this one. Guests scan a [QR code] next to your paper menu and read it in Japanese or English on their phones.',
      W2h: 'We ask you about ingredients',
      W2l: Object.freeze(['We list the [9 allergens] for each dish and each soup, based on what you tell us', 'You decide what the page says, such as how ingredients may mix in the kitchen']),
      W3h: 'Translation checked by people',
      W3l: Object.freeze(['We do not use machine translation as is. We write short, plain English', 'In the quote, we decide whether to add a check by a native English speaker (extra cost)', 'Other languages, such as Chinese and Korean, can also be discussed in the quote (extra cost)']),
      W4h: '[QR codes] and updates',
      W4l: Object.freeze(['You can put the [QR code] on tables, by the register or at the door', 'In the quote, we first agree on how to update the page when the menu or prices change (what you can edit yourself, and what we update as maintenance)', 'Price guide: from [¥80,000] [(tax included)] for one page. Allergen filters and language switching are priced based on what you need']),
      W5h: 'What your restaurant should check',
      W5l: Object.freeze(['The ingredient list matches your suppliers\' documents (such as product specs)', 'How you explain that ingredients may mix in the kitchen', 'When you change a dish or a supplier, you also update the ingredient list']),
      W6: 'Your restaurant checks the ingredients and allergen notes, and is responsible for them. [TENKA LAB] translates what you have checked and adds it to the page and the filter. We do not judge whether it is correct.',
      W7: 'See other works',
      F1: 'This page is a working demo made by [TENKA LAB]. [Soup Curry Mizunara-do] and its menu, prices and ingredients are all fictional.',
      F2: 'See our works',
      B1: 'Selected: {n}',
      B1z: 'No allergens selected',
      B2: 'Change filter',
      S0: 'No allergens selected. Showing all 20 items.',
      S1: 'Selected: {n}. Items without them: {a}. Items with them: {b}, listed at the bottom.',
      L: 'Now showing in English.'
    })
  })

  // ---------- 文の部品 ----------
  // [ ] * * を外して {名前} を入れた、ただの文字
  function plain (str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined ? String(vars[k]) : '' }).replace(/[[\]*]/g, '')
  }
  // [ ] を折れない span、* * を strong にして、文書の断片を作る。{名前} には文字か要素を入れる
  function build (str, vars) {
    var frag = document.createDocumentFragment()
    var stack = [frag]
    var buf = ''
    var top = function () { return stack[stack.length - 1] }
    var flush = function () { if (buf) { top().appendChild(document.createTextNode(buf)); buf = '' } }
    str = String(str)
    for (var i = 0; i < str.length; i++) {
      var ch = str[i]
      if (ch === '[') {
        flush()
        var s = document.createElement('span'); s.className = 'nw'
        top().appendChild(s); stack.push(s)
      } else if (ch === ']') {
        flush(); if (stack.length > 1) stack.pop()
      } else if (ch === '*') {
        flush()
        if (top().nodeName === 'STRONG') stack.pop()
        else { var b = document.createElement('strong'); top().appendChild(b); stack.push(b) }
      } else if (ch === '{') {
        var j = str.indexOf('}', i)
        var v = vars ? vars[str.slice(i + 1, j)] : undefined
        flush()
        if (v && v.nodeType) top().appendChild(v)
        else if (v !== undefined) top().appendChild(document.createTextNode(String(v)))
        i = j
      } else buf += ch
    }
    flush()
    return frag
  }
  function word (lang, key) {
    var d = I18N[lang]
    return d && Object.prototype.hasOwnProperty.call(d, key) ? d[key] : ''
  }

  // ---------- 書き方（3けたの区切りは自分で入れる） ----------
  function comma (n) {
    var s = String(n)
    var out = ''
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3) }
    return s + out
  }
  function fmtPrice (yen, add, lang) {
    return (add ? '+' : '') + (lang === 'en' ? '¥' + comma(yen) : comma(yen) + '円')
  }
  function fmtCount (n, lang) { return lang === 'en' ? String(n) : n + '品' }
  function fmtSpice (level, lang) {
    return plain(word(lang, 'SP'), { n: level, w: word(lang, 'SP' + level) })
  }
  function sortAlg (keys) { return ALG_KEYS.filter(function (k) { return keys.indexOf(k) >= 0 }) }
  function joinAlg (keys, lang) {
    return sortAlg(keys).map(function (k) { return word(lang, ALG_WORD[k]) }).join(lang === 'en' ? ', ' : '・')
  }

  // ---------- 絞り込み（純粋な関数） ----------
  function filterMenu (selected) {
    var sel = sortAlg(selected || [])
    var shown = []
    var below = []
    var byCat = { curry: 0, topping: 0, side: 0, drink: 0 }
    MENU.forEach(function (it) {
      var hits = sel.filter(function (k) { return it.alg.indexOf(k) >= 0 })
      if (hits.length) below.push({ id: it.id, hits: hits })
      else { shown.push(it.id); byCat[it.cat]++ }
    })
    return { shown: shown, below: below, counts: { shown: shown.length, below: below.length, byCat: byCat } }
  }
  function countsOf (selected) {
    var r = filterMenu(selected)
    return { n: sortAlg(selected || []).length, a: r.counts.shown, b: r.counts.below }
  }
  // 結果の行（見える文）と読み上げの文
  function resultText (selected, lang) {
    var c = countsOf(selected)
    if (!c.n) return plain(word(lang, 'R1'))
    return plain(word(lang, 'R2'), { n: c.n, a: c.a, b: c.b, link: plain(word(lang, 'RL')) })
  }
  function srText (selected, lang) {
    var c = countsOf(selected)
    return c.n ? plain(word(lang, 'S1'), c) : plain(word(lang, 'S0'))
  }

  // ---------- ハッシュ ----------
  var HASH_RE = /^#(?:lang=(ja|en)(?:&ex=([a-z]+(?:,[a-z]+){0,8}))?|ex=([a-z]+(?:,[a-z]+){0,8}))$/
  // そのまま比べる（デコードしない）。正しければ { lang, ex }、不正なら null
  function parseHash (hash) {
    var m = HASH_RE.exec(hash)
    if (!m) return null
    var lang = m[1] || 'ja'
    var list = m[2] !== undefined ? m[2] : m[3]
    var keys = list === undefined ? [] : list.split(',')
    for (var i = 0; i < keys.length; i++) {
      if (ALG_KEYS.indexOf(keys[i]) < 0) return null
      if (keys.indexOf(keys[i]) !== i) return null
    }
    return { lang: lang, ex: sortAlg(keys) }
  }
  function buildHash (st) {
    var parts = []
    if (st.lang === 'en') parts.push('lang=en')
    var ex = sortAlg(st.ex || [])
    if (ex.length) parts.push('ex=' + ex.join(','))
    return parts.length ? '#' + parts.join('&') : ''
  }

  // ---------- 表示の部品 ----------
  function $ (id) { return document.getElementById(id) }
  function clear (el) { while (el.firstChild) el.removeChild(el.firstChild) }
  function el (tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined) e.textContent = text
    return e
  }
  function nw (text) { return el('span', 'nw', text) }
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
  // 辛さの丸 5つ（直径 8px・間 3px）
  function spiceDots (level) {
    var s = document.createElementNS(SVG_NS, 'svg')
    s.setAttribute('width', '52'); s.setAttribute('height', '8'); s.setAttribute('viewBox', '0 0 52 8')
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false')
    s.setAttribute('class', 'item__dots')
    for (var i = 0; i < 5; i++) {
      var c = document.createElementNS(SVG_NS, 'circle')
      c.setAttribute('cx', String(4 + i * 11)); c.setAttribute('cy', '4')
      if (i < level) { c.setAttribute('r', '4'); c.setAttribute('class', 'on') } else { c.setAttribute('r', '3.25'); c.setAttribute('class', 'off') }
      s.appendChild(c)
    }
    return s
  }
  // 名前の区切りを折れない span で並べる（英語は間に空白）
  function nameParts (target, chunks, lang) {
    chunks.forEach(function (c, i) {
      if (i && lang === 'en') target.appendChild(document.createTextNode(' '))
      target.appendChild(nw(c))
    })
    return target
  }
  function algParts (keys, lang) {
    var f = document.createDocumentFragment()
    sortAlg(keys).forEach(function (k, i) {
      if (i) f.appendChild(document.createTextNode(lang === 'en' ? ', ' : '・'))
      f.appendChild(nw(word(lang, ALG_WORD[k])))
    })
    return f
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------- 状態（メモリだけ） ----------
  var state = { lang: 'ja', ex: [] }
  var BY_ID = {}
  MENU.forEach(function (it) { BY_ID[it.id] = it })

  // ---------- 読み上げ（live 領域は #sr-status の1つだけ） ----------
  var srTimer = 0
  var srLast = ''
  // 500ms 何も変わらなければ1回だけ。前と同じ文なら入れない（again の時は一度空にして 50ms 後に入れる）
  function say (text, again) {
    clearTimeout(srTimer)
    srTimer = setTimeout(function () {
      var sr = $('sr-status')
      if (text === srLast) {
        if (!again) return
        sr.textContent = ''
        srTimer = setTimeout(function () { sr.textContent = text }, 50)
        return
      }
      srLast = text
      sr.textContent = text
    }, 500)
  }

  // ---------- 品のカード ----------
  function itemCard (it, lang, hits) {
    var li = el('li', 'item')
    li.setAttribute('data-id', it.id)
    var other = lang === 'en' ? 'ja' : 'en'
    if (hits) {
      var badge = el('p', 'item__badge')
      badge.appendChild(icon('i-alert', 18))
      var bt = el('span')
      bt.appendChild(build(word(lang, 'M16'), { alg: algParts(hits, lang) }))
      badge.appendChild(bt)
      li.appendChild(badge)
      li.appendChild(el('p', 'item__cat', word(lang, CAT_WORD[it.cat])))
    }
    var head = el('div', 'item__head')
    head.appendChild(nameParts(el('h4', 'item__name'), it[lang], lang))
    var price = el('p', 'item__price')
    price.appendChild(nw(fmtPrice(it.price, it.add, lang)))
    head.appendChild(price)
    li.appendChild(head)
    var sub = nameParts(el('p', 'item__sub'), it[other], other)
    sub.setAttribute('lang', other)
    li.appendChild(sub)
    var desc = el('p', 'item__desc')
    desc.appendChild(build(it.desc[lang]))
    li.appendChild(desc)
    var sp = el('p', 'item__spice')
    sp.appendChild(spiceDots(it.spice))
    sp.appendChild(nw(fmtSpice(it.spice, lang)))
    li.appendChild(sp)
    var box = el('div', 'item__alg')
    var lab = el('p', 'item__alg-label')
    lab.appendChild(build(word(lang, 'M5')))
    box.appendChild(lab)
    if (it.alg.length) {
      var ul = el('ul', 'alg-tags')
      sortAlg(it.alg).forEach(function (k) {
        var tag = el('li', 'alg-tag' + (hits && hits.indexOf(k) >= 0 ? ' alg-tag--hit' : ''))
        tag.appendChild(icon('i-' + k, 16, 'alg-icon'))
        tag.appendChild(nw(word(lang, ALG_WORD[k])))
        ul.appendChild(tag)
      })
      box.appendChild(ul)
    } else {
      box.appendChild(el('p', 'item__none', word(lang, 'M5n')))
    }
    li.appendChild(box)
    return li
  }

  // ---------- 描き直し ----------
  function render () {
    var lang = state.lang
    var r = filterMenu(state.ex)
    var c = countsOf(state.ex)
    CATS.forEach(function (cat) {
      var ul = $('items-' + cat)
      clear(ul)
      r.shown.forEach(function (id) { if (BY_ID[id].cat === cat) ul.appendChild(itemCard(BY_ID[id], lang)) })
      var empty = !r.counts.byCat[cat]
      ul.hidden = empty
      $('cat-' + cat).querySelector('.cat__empty').hidden = !empty
    })
    var bl = $('items-below')
    clear(bl)
    r.below.forEach(function (b) { bl.appendChild(itemCard(BY_ID[b.id], lang, b.hits)) })
    $('below').hidden = !r.below.length
    var bt = $('below-title')
    clear(bt)
    bt.appendChild(build(word(lang, 'M11'), { b: c.b }))
    // 結果の行
    var res = $('alg-result')
    clear(res)
    if (!c.n) res.appendChild(build(word(lang, 'R1')))
    else {
      var a = el('a', 'inline-link nw', word(lang, 'RL'))
      a.href = '#below'
      res.appendChild(build(word(lang, 'R2'), { n: c.n, a: c.a, b: c.b, link: a }))
    }
    // 固定バー（すぐに替える）
    var fb = $('fixbar-sel')
    clear(fb)
    fb.appendChild(c.n ? build(word(lang, 'B1'), { n: c.n }) : build(word(lang, 'B1z')))
    fitSticky()
  }

  // 辞書で全文を入れ替える
  function applyLang (lang) {
    state.lang = lang
    var d = I18N[lang]
    var list = document.querySelectorAll('[data-i18n]')
    for (var i = 0; i < list.length; i++) {
      var e = list[i]
      var v = word(lang, e.getAttribute('data-i18n'))
      clear(e)
      if (Array.isArray(v)) v.forEach(function (t) { var li = el('li'); li.appendChild(build(t)); e.appendChild(li) })
      else e.appendChild(build(v))
    }
    var lab = document.querySelectorAll('[data-i18n-label]')
    for (var k = 0; k < lab.length; k++) lab[k].setAttribute('aria-label', word(lang, lab[k].getAttribute('data-i18n-label')))
    document.documentElement.lang = lang
    document.title = d.T1
    var btns = document.querySelectorAll('.lang-btn')
    for (var b = 0; b < btns.length; b++) btns[b].setAttribute('aria-pressed', btns[b].getAttribute('data-lang') === lang ? 'true' : 'false')
    $('hd-sub').hidden = lang !== 'en'
    render()
  }

  function syncChecks () {
    var list = document.querySelectorAll('.alg-opt__input')
    for (var i = 0; i < list.length; i++) list[i].checked = state.ex.indexOf(list[i].value) >= 0
  }
  function readChecks () {
    var keys = []
    var list = document.querySelectorAll('.alg-opt__input')
    for (var i = 0; i < list.length; i++) if (list[i].checked) keys.push(list[i].value)
    return sortAlg(keys)
  }
  function writeHash () {
    if (!history.replaceState) return
    var h = buildHash(state)
    if (h === location.hash) return
    history.replaceState(null, '', h || location.pathname + location.search)
  }

  // 1024px〜 の絞り込みのカード：画面の高さ − 48px を超える時は貼り付けない
  function fitSticky () {
    var card = $('alg-card')
    if (!card) return
    card.classList.remove('is-static')
    if (card.offsetHeight > window.innerHeight - 48) card.classList.add('is-static')
  }

  // ---------- ハッシュ（開いた時・hashchange） ----------
  function applyHash (fromEvent) {
    var h = location.hash
    if (h.indexOf('#lang=') !== 0 && h.indexOf('#ex=') !== 0) return
    var p = parseHash(h)
    var prevLang = state.lang
    if (!p) {
      // 不正：エラーを出さずに最初の状態に戻し、ハッシュを消す。フォーカス・スクロール・読み上げは動かさない
      state.ex = []
      syncChecks()
      if (prevLang !== 'ja') applyLang('ja')
      else render()
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search)
      return
    }
    state.ex = p.ex
    syncChecks()
    if (p.lang !== prevLang) applyLang(p.lang)
    else render()
    var canon = buildHash(p)
    if (canon !== h && history.replaceState) history.replaceState(null, '', canon || location.pathname + location.search)
    if (fromEvent) {
      var s = srText(p.ex, p.lang)
      if (p.lang !== prevLang) s = word(p.lang, 'L') + (p.lang === 'en' ? ' ' : '') + s
      say(s)
    }
  }

  // ---------- ページ内の移動（ハッシュを変えない） ----------
  function goTo (id) {
    var target = $(id)
    if (!target || target.hidden) return false
    var h = target.querySelector('[tabindex="-1"]') || target
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
      if (goTo(hash.slice(1))) e.preventDefault()
    })

    var btns = document.querySelectorAll('.lang-btn')
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var l = this.getAttribute('data-lang')
        if (l === state.lang || !I18N[l]) return
        applyLang(l)
        writeHash()
        say(word(l, 'L'))
      })
    }
    var inputs = document.querySelectorAll('.alg-opt__input')
    for (var k = 0; k < inputs.length; k++) {
      inputs[k].addEventListener('change', function () {
        state.ex = readChecks()
        render()
        writeHash()
        say(srText(state.ex, state.lang))
      })
    }
    $('alg-clear').addEventListener('click', function () {
      state.ex = []
      syncChecks()
      render()
      writeHash()
      say(srText(state.ex, state.lang), true)
    })

    window.addEventListener('hashchange', function () { applyHash(true) })
    window.addEventListener('resize', fitSticky)

    // スマホの固定バー：絞り込みとファーストビューの主ボタンが、どちらも見えていない時だけ出す
    var bar = $('fixbar')
    if ('IntersectionObserver' in window) {
      var seen = { filter: true, cta: true }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { seen[en.target.id === 'filter' ? 'filter' : 'cta'] = en.isIntersecting })
        bar.classList.toggle('is-hide', seen.filter || seen.cta)
      })
      io.observe($('filter'))
      io.observe($('hero-cta'))
    }

    state.ex = readChecks()
    applyLang('ja')
    applyHash(false)
  }

  // 検査用に、状態を引数で受ける関数と定数だけ出す
  window.__demo25 = Object.freeze({
    ALG_KEYS: ALG_KEYS, MENU: MENU, CATS: CATS, I18N: I18N,
    filterMenu: filterMenu, parseHash: parseHash, buildHash: buildHash,
    fmtPrice: fmtPrice, fmtCount: fmtCount, fmtSpice: fmtSpice, joinAlg: joinAlg, srText: srText, resultText: resultText
  })

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
