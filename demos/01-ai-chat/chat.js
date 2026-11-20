/* 整体院 ソラユイ（デモ・架空のお店）
   シナリオ型チャット＋予約フォーム（送信しない）。外部通信なし。
   お店側の答えはこのファイル内の固定文。利用者の入力は textContent でのみ表示する。 */
(function () {
  'use strict';

  /* ---------- 日付・空き状況（すべて架空。閲覧日から計算） ---------- */
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  var TIMES_WEEKDAY = ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];
  var TIMES_WEEKEND = ['9:00', '10:30', '13:00', '14:30', '16:00'];
  var CLOSED_DAY = 3; // 水曜

  function addDays(base, n) { var d = new Date(base.getFullYear(), base.getMonth(), base.getDate()); d.setDate(d.getDate() + n); return d; }
  function isoDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function labelDate(d) { return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEK[d.getDay()] + '）'; }
  function timesFor(d) { var w = d.getDay(); return (w === 0 || w === 6) ? TIMES_WEEKEND : TIMES_WEEKDAY; }
  // 日付から決まる見た目だけの空き（毎回同じ日なら同じ結果）
  function slotsFor(d) {
    var times = timesFor(d);
    var seed = d.getFullYear() * 400 + (d.getMonth() + 1) * 31 + d.getDate();
    var list = times.map(function (t, i) { return { time: t, open: ((seed * 7 + i * 13) % 5) > 1 }; });
    if (!list.some(function (s) { return s.open; })) list[list.length - 1].open = true;
    return list;
  }
  // 明日から n 日分（定休日を除く）
  function openDays(n) {
    var out = [], today = new Date(), i = 1;
    while (out.length < n && i < 30) { var d = addDays(today, i++); if (d.getDay() !== CLOSED_DAY) out.push(d); }
    return out;
  }

  /* ---------- 予約フォーム（送信しない） ---------- */
  var form = document.getElementById('reserve-form');
  var dateSel = document.getElementById('r-date');
  var timeSel = document.getElementById('r-time');
  var result = document.getElementById('reserve-result');

  function fillTimes() {
    var parts = dateSel.value.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var keep = timeSel.value;
    timeSel.textContent = '';
    slotsFor(d).forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.time;
      o.textContent = s.time + (s.open ? '（空きあり）' : '（満席）');
      o.disabled = !s.open;
      timeSel.appendChild(o);
    });
    var match = Array.prototype.find.call(timeSel.options, function (o) { return o.value === keep && !o.disabled; });
    var first = Array.prototype.find.call(timeSel.options, function (o) { return !o.disabled; });
    timeSel.value = (match || first).value;
  }
  function fillDates() {
    openDays(7).forEach(function (d) {
      var o = document.createElement('option');
      o.value = isoDate(d);
      o.textContent = labelDate(d);
      dateSel.appendChild(o);
    });
    fillTimes();
  }
  function setReservation(iso, time) {
    dateSel.value = iso;
    fillTimes();
    timeSel.value = time;
    result.textContent = '';
    result.classList.remove('is-shown');
  }
  dateSel.addEventListener('change', fillTimes);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var label = dateSel.options[dateSel.selectedIndex].textContent;
    result.textContent = 'デモのため送信されません。（選んだ内容：' + form.menu.value + '／' + label + ' ' + timeSel.value + '）実際のお店では、この内容で予約を受け付け、確認のご連絡をします。';
    result.classList.add('is-shown');
    // 右下のチャットボタンに隠れないよう、結果を画面の中ほどに出す
    result.scrollIntoView({ block: 'center', behavior: 'auto' });
  });
  fillDates();

  /* ---------- チャットのシナリオ ---------- */
  var LABELS = {
    price: '料金を知りたい', reserve: '予約したい', first: 'はじめてで不安', access: '駐車場・アクセス', hours: '営業時間',
    firstPrice: '初回の料金は？', pay: '支払い方法は？', pain: '痛くないですか？', clothes: '服装は？', duration: '時間はどのくらい？',
    phone: '電話で予約したい', goReserve: '予約ページへ進む', top: '最初に戻る',
    effect: '肩こり・腰痛について', cancel: 'キャンセル・予約変更', kids: '子ども連れでも大丈夫？'
  };
  var MAIN = ['price', 'reserve', 'first', 'access', 'hours'];

  var NODES = {
    start: {
      msgs: ['こんにちは。整体院 ソラユイのご案内チャットです。', '知りたいことを下から選ぶか、いちばん下の欄に入力してください。'],
      choices: MAIN
    },
    top: { msgs: ['ほかに知りたいことはありますか？'], choices: MAIN },
    price: {
      msgs: ['<p>料金は次のとおりです（税込）。</p><ul><li>初回（お話＋整体 60分）5,500円</li><li>整体 40分 4,400円</li><li>整体 60分 6,050円</li><li>姿勢チェック付き 70分 7,150円</li></ul><p>追加料金はかかりません。</p>'],
      choices: ['firstPrice', 'pay', 'reserve', 'top']
    },
    firstPrice: {
      msgs: ['はじめての方は「初回（お話＋整体 60分）」5,500円です。最初の15分ほどで、気になる所や普段の過ごし方を伺います。'],
      choices: ['reserve', 'first', 'top']
    },
    pay: {
      msgs: ['現金・クレジットカード・電子マネー・QRコード決済が使えます。'],
      choices: ['price', 'reserve', 'top']
    },
    reserve: {
      msgs: ['空き状況の例です（明日から3日分）。ご希望の時間を押すと、予約ページに日時が入ります。'],
      slots: true,
      choices: ['goReserve', 'cancel', 'phone', 'top']
    },
    first: {
      msgs: ['はじめての方も多くいらっしゃいます。よくいただく質問はこちらです。'],
      choices: ['pain', 'clothes', 'duration', 'effect', 'kids', 'reserve', 'top']
    },
    // 医療の効果をうたわない（治る・改善・効く を答えに使わない）
    effect: {
      msgs: ['効果の感じ方には個人差があります。お話を伺ってから、施術の内容をご説明します。', 'はじめての方は「初回（お話＋整体 60分）」で、最初の15分ほど、気になる所や普段の過ごし方を伺います。'],
      choices: ['firstPrice', 'reserve', 'top']
    },
    cancel: {
      msgs: ['<p>予約の変更・キャンセルは、前日までにご連絡いただければ料金はかかりません。</p><p>当日の変更・キャンセルは、お電話でご連絡ください（デモ用の架空の決まりです）。</p>'],
      choices: ['phone', 'reserve', 'top']
    },
    kids: {
      msgs: ['お子さま連れでもご来院いただけます。施術のあいだは、ベッドのそばでお待ちいただけます。ご予約のときに「子ども連れ」とお伝えください（デモ用の架空の内容です）。'],
      choices: ['reserve', 'first', 'top']
    },
    pain: {
      msgs: ['強く押したり、ボキボキ鳴らしたりする施術はしていません。強さは途中でいつでも変えられますので、遠慮なくお伝えください。'],
      choices: ['clothes', 'duration', 'reserve', 'top']
    },
    clothes: {
      msgs: ['動きやすい服をお貸しします。お仕事帰りの服のままでも大丈夫です。'],
      choices: ['pain', 'duration', 'reserve', 'top']
    },
    duration: {
      msgs: ['初回は約60分です（お話15分＋整体45分）。2回目からは40分か60分を選べます。'],
      choices: ['price', 'reserve', 'top']
    },
    access: {
      msgs: ['<p>◯◯駅 南口から徒歩5分です（架空の住所：◯◯市△△ 2-4-6）。</p><p>院の裏に駐車場が2台あります（無料）。満車のときは、近くのコインパーキングをご利用ください。</p>'],
      choices: ['hours', 'reserve', 'top']
    },
    hours: {
      msgs: ['<p>営業時間は次のとおりです。</p><ul><li>月・火・木・金 10:00〜20:00</li><li>土・日 9:00〜17:00</li><li>祝日も曜日どおりに営業</li><li>定休日 水曜</li></ul><p>最終受付は終了の1時間前です。</p>'],
      choices: ['reserve', 'access', 'top']
    },
    phone: {
      msgs: ['お電話でも受け付けています。<br>000-0000-0000（デモ用の架空の番号です）<br>施術中は出られないことがあるため、予約ページからのご予約がおすすめです。'],
      choices: ['goReserve', 'top']
    },
    fallback: {
      msgs: ['すみません、うまくお答えできませんでした。予約ページか、お電話でご案内します。'],
      choices: ['goReserve', 'phone', 'top']
    },
    hello: { msgs: ['こんにちは。料金・予約・アクセスなど、知りたいことを選ぶか入力してください。'], choices: MAIN },
    thanks: { msgs: ['ありがとうございます。ご来院をお待ちしています（デモのお店です）。'], choices: ['goReserve', 'top'] }
  };

  /* 自由入力のキーワード（上から順に判定） */
  var PRICE_WORDS = ['料金', '値段', 'いくら', '価格', '費用', '金額', '円'];
  var RULES = [
    { node: 'cancel', any: ['キャンセル', 'きゃんせる', '取り消', '取消', '変更', 'へんこう', '日にちを変', '日時を変', '時間を変'] },
    { node: 'kids', any: ['子ども', '子供', 'こども', '子連れ', 'こづれ', '赤ちゃん', 'あかちゃん', 'ベビー', 'キッズ', '託児', '息子', '娘'] },
    // 「腰痛」は「痛」を含むので、痛みの質問（pain）より先に判定する
    { node: 'effect', any: ['治', 'なおる', 'なおり', 'なおせ', '効', 'きくか', 'ききます', '改善', '肩こり', '肩凝り', 'かたこり', '腰痛', 'ようつう', '頭痛', '症状'] },
    { node: 'firstPrice', all: [['初回', '初めて', 'はじめて'], PRICE_WORDS] },
    { node: 'pay', any: ['支払', 'カード', '現金', '電子マネー', 'paypay', 'qr', '決済'] },
    { node: 'phone', any: ['電話', 'でんわ', 'tel'] },
    { node: 'pain', any: ['痛', 'いたい', 'こわい', '怖', 'ボキ', 'ぼき', '強さ', '強く'] },
    { node: 'clothes', any: ['服', '着替', 'きがえ'] },
    { node: 'duration', all: [['時間', '何分'], ['どのくらい', 'どれくらい', 'どれぐらい']] },
    { node: 'duration', any: ['所要', 'かかる', '何分', 'なんぷん', '長さ'] },
    { node: 'price', any: PRICE_WORDS },
    { node: 'reserve', any: ['予約', 'よやく', '空き', '空いて', 'あいて', 'あき', '予定'] },
    { node: 'access', any: ['駐車', 'ちゅうしゃ', '車', 'くるま', 'アクセス', '場所', '駅', '行き方', '住所', 'どこ', '地図'] },
    { node: 'hours', any: ['時間', '営業', '何時', 'なんじ', '休み', '定休', '土日', '日曜', '土曜', '祝日', '夜'] },
    { node: 'first', any: ['初めて', 'はじめて', '初回', '不安', '心配'] },
    { node: 'thanks', any: ['ありがと', '助かり'] },
    { node: 'hello', any: ['こんにちは', 'こんばんは', 'おはよう', 'はじめまして'] }
  ];
  function matchNode(text) {
    var t = text.normalize ? text.normalize('NFKC').toLowerCase() : text.toLowerCase();
    // 英字だけの語（tel・qr・paypay）は単語として出てきたときだけ当てる（hotel・hotels などに反応しない）
    var has = function (w) {
      w = w.toLowerCase();
      if (/^[a-z]+$/.test(w)) return new RegExp('(^|[^a-z])' + w + '(?![a-z])').test(t);
      return t.indexOf(w) !== -1;
    };
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      if (r.all && r.all.every(function (group) { return group.some(has); })) return r.node;
      if (r.any && r.any.some(has)) return r.node;
    }
    return 'fallback';
  }

  /* ---------- チャットの画面 ---------- */
  var launcher = document.getElementById('chat-launcher');
  var panel = document.getElementById('chat-panel');
  var closeBtn = document.getElementById('chat-close');
  var log = document.getElementById('chat-log');
  var chatForm = document.getElementById('chat-form');
  var input = document.getElementById('chat-text');
  var title = document.getElementById('chat-title');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var started = false;
  var busy = false;
  var queue = Promise.resolve();

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduceMotion ? Math.min(ms, 250) : ms); }); }

  function addBubble(cls, html, isUserText) {
    var div = document.createElement('div');
    div.className = 'msg ' + cls;
    if (isUserText) {
      var p = document.createElement('p');
      p.textContent = html; // 利用者の入力はそのまま文字として表示
      div.appendChild(p);
    } else {
      div.innerHTML = html.charAt(0) === '<' ? html : '<p>' + html + '</p>'; // 固定文のみ
    }
    log.appendChild(div);
    scrollDown();
    return div;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'msg msg-bot typing';
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(div);
    log.setAttribute('aria-busy', 'true');
    scrollDown();
    return div;
  }

  function slotsHtmlInto(bubble) {
    var wrap = document.createElement('div');
    wrap.className = 'slots';
    openDays(3).forEach(function (d) {
      var day = document.createElement('div');
      var h = document.createElement('p');
      h.className = 'slot-day';
      h.textContent = labelDate(d);
      var ul = document.createElement('ul');
      ul.className = 'slot-list';
      ul.setAttribute('aria-label', labelDate(d) + 'の空き状況');
      slotsFor(d).forEach(function (s) {
        var li = document.createElement('li');
        var el;
        if (s.open) {
          el = document.createElement('button');
          el.type = 'button';
          el.className = 'slot';
          el.textContent = s.time + ' 空き';
          el.setAttribute('aria-label', labelDate(d) + ' ' + s.time + ' 空きあり。この時間を選ぶ');
          el.addEventListener('click', function () { pickSlot(d, s.time, true); });
        } else {
          el = document.createElement('span');
          el.className = 'slot slot-full';
          el.textContent = s.time + ' 満';
          el.setAttribute('aria-label', labelDate(d) + ' ' + s.time + ' 満席');
        }
        li.appendChild(el);
        ul.appendChild(li);
      });
      day.appendChild(h);
      day.appendChild(ul);
      wrap.appendChild(day);
    });
    var note = document.createElement('p');
    note.className = 'slot-note';
    note.textContent = '※ 空き状況はデモ用の例です。実際のお店では予約システムの空きと連動できます。';
    wrap.appendChild(note);
    bubble.appendChild(wrap);
    scrollDown();
  }

  function removeChoices() {
    Array.prototype.forEach.call(log.querySelectorAll('.choices'), function (c) { c.remove(); });
  }

  function addChoices(keys, focusFirst) {
    var group = document.createElement('div');
    group.className = 'choices';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', '選択肢');
    keys.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice' + (k === 'goReserve' ? ' choice-accent' : '');
      b.textContent = LABELS[k];
      b.addEventListener('click', function () { choose(k); });
      group.appendChild(b);
    });
    log.appendChild(group);
    scrollDown();
    if (focusFirst) group.querySelector('button').focus();
  }

  // ボットの返事を順番に出す（入力中の表示つき）
  function botSay(nodeKey, focusChoices) {
    var node = NODES[nodeKey];
    queue = queue.then(function () {
      busy = true;
      var p = Promise.resolve();
      node.msgs.forEach(function (m, i) {
        p = p.then(function () {
          var t = showTyping();
          var plain = m.replace(/<[^>]+>/g, '');
          return wait(450 + Math.min(plain.length * 12, 900)).then(function () {
            t.remove();
            var bubble = addBubble('msg-bot', m);
            if (node.slots && i === node.msgs.length - 1) slotsHtmlInto(bubble);
          });
        });
      });
      return p.then(function () {
        log.removeAttribute('aria-busy');
        addChoices(node.choices, focusChoices);
        busy = false;
      });
    });
    return queue;
  }

  function goReserve() {
    if (busy) return;
    busy = true;
    removeChoices();
    addBubble('msg-user', LABELS.goReserve, true);
    log.focus({ preventScroll: true });
    queue = queue.then(function () {
      var t = showTyping();
      return wait(500).then(function () {
        t.remove();
        addBubble('msg-bot', '予約ページを開きます。メニューと日時を確かめて、予約ボタンを押してください（デモのため送信はされません）。');
        log.removeAttribute('aria-busy');
        addChoices(['top'], false);
        busy = false;
        return wait(700);
      }).then(function () {
        closeChat(false);
        var target = document.getElementById('reserve');
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        document.getElementById('reserve-title').focus({ preventScroll: true });
      });
    });
  }

  function choose(key) {
    if (key === 'goReserve') { goReserve(); return; }
    if (busy) return;
    removeChoices();
    addBubble('msg-user', LABELS[key], true);
    log.focus({ preventScroll: true });
    botSay(key, true);
  }

  function pickSlot(d, time, fromButton) {
    if (busy) return;
    removeChoices();
    addBubble('msg-user', labelDate(d) + ' ' + time + ' を希望', true);
    setReservation(isoDate(d), time);
    if (fromButton) log.focus({ preventScroll: true });
    queue = queue.then(function () {
      busy = true;
      var t = showTyping();
      return wait(800).then(function () {
        t.remove();
        addBubble('msg-bot', labelDate(d) + ' ' + time + ' ですね。予約ページに日時を入れておきました。メニューを選んで進んでください。');
        log.removeAttribute('aria-busy');
        addChoices(['goReserve', 'reserve', 'top'], fromButton);
        busy = false;
      });
    });
  }

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    title.focus();
    if (!started) {
      started = true;
      var n = document.createElement('div');
      n.className = 'msg msg-notice';
      n.textContent = 'これは TENKA LAB のデモです。実際のお店ではありません。';
      log.appendChild(n);
      botSay('start', false);
    }
  }

  var opener = null; // チャットを開いたボタン（閉じたらここへフォーカスを戻す）

  function closeChat(returnFocus) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    if (returnFocus === false) return;
    // スマホで FV のボタンが見えている間は右下のボタンを隠すので、開いたボタンへ戻す
    var target = opener || launcher;
    if (target === launcher && window.getComputedStyle(launcher).visibility === 'hidden') {
      target = document.querySelector('[data-open-chat]') || launcher;
    }
    target.focus();
  }

  launcher.addEventListener('click', function () { opener = launcher; openChat(); });
  closeBtn.addEventListener('click', function () { closeChat(true); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-open-chat]'), function (b) {
    b.addEventListener('click', function () { opener = b; openChat(); });
  });

  /* 右下の「チャットで相談」：FV の同じボタンが見えている間は is-fv を付ける（CSS でスマホだけ隠す） */
  var heroActions = document.querySelector('.hero-actions');
  if (heroActions && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { launcher.classList.toggle('is-fv', e.isIntersecting); });
    }).observe(heroActions);
  }
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeChat(true); }
  });

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    removeChoices();
    addBubble('msg-user', text.slice(0, 200), true);
    var key = matchNode(text);
    botSay(key, false); // 入力欄からのときはフォーカスを動かさない
  });

  // 確認用（行き止まりチェックのため公開。動作には不要）
  window.__sorayuiChat = { NODES: NODES, LABELS: LABELS, matchNode: matchNode };
})();
