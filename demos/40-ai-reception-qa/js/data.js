// AI 受付の答える範囲とテストの記録（ヨツツジ食堂・架空）の見本データ
// 定数だけ。文は見本の表から1字も変えずに写した。人名・電話番号・実在の地名とサービス名は入れない
var Data40 = (function () {
  'use strict'
  // デモの今日（表示だけ。計算には使わない）
  var TODAY = '2026-11-04'
  // 記録1 の分類（この順が分類順）
  var CATS = [
    { id: 'hours', name: '営業時間・定休日', short: '営業時間' },
    { id: 'access', name: '場所・駐車場', short: '場所・駐車場' },
    { id: 'menu', name: 'メニュー・値段の目安', short: 'メニュー・値段' },
    { id: 'takeout', name: '持ち帰り・予約の受け方', short: '持ち帰り・予約' },
    { id: 'pay', name: '支払い', short: '支払い' },
    { id: 'seat', name: '席・子連れ', short: '席・子連れ' }
  ]
  // 記録1 Q&A 30問（qs：質問の例。画面と CSV では「／」でつなぐ。fixedBy：テストで直した時のテストの番号）
  var QA = [
    { no: 'Q01', cat: 'hours', qs: ['何時から何時までやっていますか？', '営業時間を教えてください', '日曜の夜もやっていますか？'], a: '昼は 11:00〜14:30、夜は 17:30〜21:00 です。日曜・祝日も同じ時間です。', checked: '2026-11-02', fixedBy: 'T02' },
    { no: 'Q02', cat: 'hours', qs: ['定休日はいつですか？', 'お休みの日を教えてください'], a: '毎週水曜日と、第3木曜日がお休みです。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q03', cat: 'hours', qs: ['ラストオーダーは何時ですか？'], a: '昼は 14:00、夜は 20:30 がラストオーダーです。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q04', cat: 'hours', qs: ['臨時休業はどこで分かりますか？'], a: '臨時のお休みは、このアカウントのお知らせと、お店の入口の貼り紙でお伝えします。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q05', cat: 'hours', qs: ['年末年始は営業していますか？'], a: '年末年始のお休みは、決まり次第お知らせでお伝えします。いまはまだ決まっていません。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q06', cat: 'access', qs: ['お店はどこにありますか？', '行き方を教えてください'], a: 'お店の場所は、プロフィールの「お店の地図」のリンクからご覧ください。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q07', cat: 'access', qs: ['駐車場はありますか？', '車で行っても大丈夫ですか？'], a: 'お店の前に3台分の駐車場があります。満車の時に使える近くの駐車場のご案内はしていません。', checked: '2026-11-02', fixedBy: 'T11' },
    { no: 'Q08', cat: 'access', qs: ['自転車はとめられますか？'], a: 'お店の横に、自転車3台分の置き場があります。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q09', cat: 'access', qs: ['駅から歩けますか？'], a: '駅の東口から歩いて約6分です。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q10', cat: 'access', qs: ['車いすで入れますか？'], a: '入口に段差が1段あります。お声がけいただければ、お店の者がお手伝いします。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q11', cat: 'menu', qs: ['どんなメニューがありますか？'], a: '日替わり・焼き魚・しょうが焼きなどの定食が中心です。持ち帰りのお弁当もあります。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q12', cat: 'menu', qs: ['定食はいくらくらいですか？'], a: '定食は 800〜1,200円ほど（税込）です。日によって変わるので、店頭の黒板の値段をご確認ください。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q13', cat: 'menu', qs: ['今日の日替わりは何ですか？'], a: 'その日の日替わりは、朝10時ごろにこのアカウントのお知らせでお伝えします。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q14', cat: 'menu', qs: ['ご飯の量は変えられますか？', '大盛りはできますか？'], a: 'ご飯の大盛り・少なめは、注文の時にお申し付けください。大盛りの値段は店頭でご確認ください。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q15', cat: 'menu', qs: ['お弁当はいくらくらいですか？'], a: 'お弁当は 600〜900円ほど（税込）です。日によって変わるので、店頭の値段をご確認ください。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q16', cat: 'takeout', qs: ['お弁当はいつまでに食べればいいですか？'], a: 'お受け取りから2時間以内にお召し上がりください。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q17', cat: 'takeout', qs: ['お弁当の予約はできますか？'], a: 'お弁当は、受け取りの前の日の20時までにご予約いただけます。メニュー・個数・受け取りの時刻を送ってください。お店の者がお返事した時点で予約の確定です。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q18', cat: 'takeout', qs: ['席の予約はできますか？'], a: '席のご予約は夜（17:30〜）だけ受けています。日時と人数を送ってください。お店の者がお返事した時点で予約の確定です。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q19', cat: 'takeout', qs: ['電話でも予約できますか？'], a: 'ご予約は、このアカウントのメッセージで受けています。電話番号はプロフィールの「お店の情報」に載せています。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q20', cat: 'takeout', qs: ['お弁当は何時に受け取れますか？'], a: 'お弁当の受け取りは 11:00〜14:00 と 17:30〜20:30 です。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q21', cat: 'pay', qs: ['クレジットカードは使えますか？', 'カード使えますか？'], a: '現金のほか、クレジットカードが使えます。', checked: '2026-11-02', fixedBy: 'T32' },
    { no: 'Q22', cat: 'pay', qs: ['電子マネーは使えますか？'], a: '交通系などの電子マネーが使えます。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q23', cat: 'pay', qs: ['QRコード決済は使えますか？'], a: 'QRコード決済が使えます。使える種類はレジの横の案内でご確認ください。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q24', cat: 'pay', qs: ['お弁当の代金は先払いですか？'], a: 'お弁当の代金は、受け取りの時にお支払いください。先払いはありません。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q25', cat: 'pay', qs: ['領収書はもらえますか？'], a: '領収書をお出しします。お会計の時にお申し付けください。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q26', cat: 'seat', qs: ['席はいくつありますか？'], a: 'カウンター8席・テーブル12席の、全部で20席です。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q27', cat: 'seat', qs: ['子ども用のいすはありますか？', 'ベビーチェアはありますか？'], a: '子ども用のいすを2つ用意しています。空いていればお使いいただけます。', checked: '2026-11-02', fixedBy: 'T40' },
    { no: 'Q28', cat: 'seat', qs: ['子ども連れでも大丈夫ですか？'], a: 'お子さま連れでもどうぞ。取り分け用の小皿とスプーンをお出しします。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q29', cat: 'seat', qs: ['一人でも入りやすいですか？'], a: 'お一人さまは、カウンター席をご案内することが多いです。', checked: '2026-10-28', fixedBy: '' },
    { no: 'Q30', cat: 'seat', qs: ['たばこは吸えますか？'], a: '店内・お店の前とも禁煙です。', checked: '2026-10-28', fixedBy: '' }
  ]
  // 記録2 人へ回す5分類（words の added：11月2日のテストのあとに足した言葉）
  var HANDOFF = [
    { no: 'H1', name: 'アレルギー・原材料の詳細', reason: '間違えると体に関わるため', words: [{ w: 'アレルギー', added: false }, { w: 'アレルゲン', added: false }, { w: '原材料', added: false }, { w: '入って', added: false }, { w: '使って', added: false }, { w: '食べられる', added: true }, { w: '抜き', added: true }], reply: 'アレルギーや原材料については、正確にお答えするため、お店の者が直接お返事します。少しお待ちください。', eta: '営業日はその日のうちに（休みの日は次の営業日の 11:00 まで）' },
    { no: 'H2', name: '料金の確定（貸切・大口の注文）', reason: '金額はお店とお客様の約束になるため', words: [{ w: '貸切', added: false }, { w: '団体', added: false }, { w: '見積', added: false }, { w: '大口', added: false }, { w: '借り', added: true }], reply: '貸切や大口のご注文の料金は、人数・日時・ご予算を伺ってから、お店の者がお返事します。', eta: '2営業日以内' },
    { no: 'H3', name: '予約の確定・取り消し', reason: '席と仕込みの都合を、お店が見て決めるため', words: [{ w: 'キャンセル', added: false }, { w: '取り消し', added: false }, { w: '確定', added: false }, { w: '変更', added: false }, { w: 'やめ', added: true }], reply: 'ご予約の確定・変更・取り消しは、お店の者が確かめてからお返事します。お返事をもって手続きの完了とします。', eta: '営業時間中は1時間ほど（時間外は次の営業日の 11:00 まで）' },
    { no: 'H4', name: 'クレーム・体調不良', reason: '言葉の選び方を、人が判断するべきため', words: [{ w: '具合', added: false }, { w: '異物', added: false }, { w: '態度', added: false }, { w: '苦情', added: false }, { w: 'ひどい', added: false }, { w: 'お腹', added: true }, { w: '痛い', added: true }], reply: 'ご不便をおかけし、申し訳ありません。お店の者が内容を確かめて、直接ご連絡します。体調がすぐれない時は、先に医療機関にご相談ください。急いで手当てが必要な時は、救急（119番）へご連絡ください。', eta: 'その日のうちに（休みの日も店主が確かめます）' },
    { no: 'H5', name: '取材・営業', reason: '受けるかどうかを、お店の方針で決めるため', words: [{ w: '取材', added: false }, { w: '撮影', added: false }, { w: '掲載', added: false }, { w: '載せ', added: false }, { w: '提案', added: false }, { w: '広告', added: false }, { w: '売り込み', added: false }], reply: '取材やご提案のご連絡ありがとうございます。お店の者が内容を確かめてからお返事します。お返事できない場合もあります。', eta: '5営業日以内' }
  ]
  // 記録3 誤回答テスト70件（expect：answer＝答える／handoff＝人へ回す。result：pass＝合格／fixed＝修正後合格／todo＝要修正）
  // answeredWrongly：人へ回すはずの質問に、1回目で Q&A の答えを返したもの
  var TESTS = [
    { no: 'T01', q: 'お昼は何時から？', expect: 'answer', target: 'Q01', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T02', q: '日曜の夜もやってる？', expect: 'answer', target: 'Q01', result: 'fixed', fix: '1回目：定休日の文（Q02）を返した。→ Q01 の答えの文に「日曜・祝日も同じ時間です。」を足し、質問の例に「日曜の夜もやっていますか？」を足した（11/2）。', answeredWrongly: false },
    { no: 'T03', q: '水曜ってお休み？', expect: 'answer', target: 'Q02', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T04', q: '休みの日いつ', expect: 'answer', target: 'Q02', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T05', q: '夜のラストオーダー何時？', expect: 'answer', target: 'Q03', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T06', q: '急な休みはどこで知らせてる？', expect: 'answer', target: 'Q04', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T07', q: '今日って開いてる？', expect: 'answer', target: 'Q04', result: 'todo', fix: '1回目：営業時間の文（Q01）だけを返し、臨時のお休みの知らせ方を言わなかった。→ 直す予定：「今日」「いま」が入った時は Q01 と Q04 の両方を返す（12月の見直しで）。', answeredWrongly: false },
    { no: 'T08', q: '大晦日はやってますか', expect: 'answer', target: 'Q05', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T09', q: 'お店の場所はどこ？', expect: 'answer', target: 'Q06', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T10', q: '駐車場ある？', expect: 'answer', target: 'Q07', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T11', q: '車で行っても平気？', expect: 'answer', target: 'Q07', result: 'fixed', fix: '1回目：お店の場所の文（Q06）を返した。→ Q07 の質問の例に「車で行っても大丈夫ですか？」を足した（11/2）。', answeredWrongly: false },
    { no: 'T12', q: '自転車で行ってもいい？', expect: 'answer', target: 'Q08', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T13', q: '駅から近い？', expect: 'answer', target: 'Q09', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T14', q: '歩いて何分くらい？', expect: 'answer', target: 'Q09', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T15', q: '車いすでも入れる？', expect: 'answer', target: 'Q10', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T16', q: 'どんな料理のお店？', expect: 'answer', target: 'Q11', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T17', q: '定食っていくら？', expect: 'answer', target: 'Q12', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T18', q: 'ランチの値段知りたい', expect: 'answer', target: 'Q12', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T19', q: '今日の日替わり何？', expect: 'answer', target: 'Q13', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T20', q: '日替わりのメニューはどこで見られる？', expect: 'answer', target: 'Q13', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T21', q: 'ご飯少なめにできる？', expect: 'answer', target: 'Q14', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T22', q: '大盛りって頼める？', expect: 'answer', target: 'Q14', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T23', q: 'お弁当の値段は？', expect: 'answer', target: 'Q15', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T24', q: 'お弁当って夜まで置いといて平気？', expect: 'answer', target: 'Q16', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T25', q: 'お弁当を前もって頼みたい', expect: 'answer', target: 'Q17', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T26', q: '明日のお昼のお弁当、予約できる？', expect: 'answer', target: 'Q17', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T27', q: '夜に席を取っておける？', expect: 'answer', target: 'Q18', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T28', q: '4人で予約したい', expect: 'answer', target: 'Q18', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T29', q: '電話で予約はできる？', expect: 'answer', target: 'Q19', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T30', q: 'お弁当、何時から取りに行ける？', expect: 'answer', target: 'Q20', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T31', q: '夕方にお弁当受け取れる？', expect: 'answer', target: 'Q20', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T32', q: 'カード使える？', expect: 'answer', target: 'Q21', result: 'fixed', fix: '1回目：電子マネーの文（Q22）を返した。→ Q21 の質問の例に「カード使えますか？」を足した（11/2）。', answeredWrongly: false },
    { no: 'T33', q: '現金だけ？', expect: 'answer', target: 'Q21', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T34', q: '電子マネーで払える？', expect: 'answer', target: 'Q22', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T35', q: '交通系で払える？', expect: 'answer', target: 'Q22', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T36', q: 'QRで払える？', expect: 'answer', target: 'Q23', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T37', q: 'お弁当は先にお金払うの？', expect: 'answer', target: 'Q24', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T38', q: 'レシートじゃなくて領収書ほしい', expect: 'answer', target: 'Q25', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T39', q: '何席くらいある？', expect: 'answer', target: 'Q26', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T40', q: 'ベビーチェアある？', expect: 'answer', target: 'Q27', result: 'fixed', fix: '1回目：「お答えできません」と返した（言葉を知らなかった）。→ Q27 の質問の例に「ベビーチェアはありますか？」を足した（11/2）。', answeredWrongly: false },
    { no: 'T41', q: '子ども用のいすは何個？', expect: 'answer', target: 'Q27', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T42', q: '赤ちゃん連れでも入れる？', expect: 'answer', target: 'Q28', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T43', q: '小さい子がいても平気？', expect: 'answer', target: 'Q28', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T44', q: '一人で行っても大丈夫？', expect: 'answer', target: 'Q29', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T45', q: 'たばこ吸える席ある？', expect: 'answer', target: 'Q30', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T46', q: 'そばアレルギーがあるんですが', expect: 'handoff', target: 'H1', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T47', q: '卵アレルギーでも食べられる？', expect: 'handoff', target: 'H1', result: 'fixed', fix: '1回目：定食の説明（Q11）を返した。「食べられる？」が Q11 に強く結びつき、人へ回すより先に答えた。→ H1 の合図に「食べられる」を足し、合図の言葉が入っていたら Q&A より先に人へ回す決まりにした（11/2）。', answeredWrongly: true },
    { no: 'T48', q: 'エビ抜きにできる？', expect: 'handoff', target: 'H1', result: 'fixed', fix: '1回目：ご飯の量の文（Q14）を返した。→ H1 の合図に「抜き」を足した（11/2）。', answeredWrongly: true },
    { no: 'T49', q: 'このたれ、何が入ってる？', expect: 'handoff', target: 'H1', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T50', q: '小麦粉を使っていないメニューは？', expect: 'handoff', target: 'H1', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T51', q: '貸切はいくらでできますか', expect: 'handoff', target: 'H2', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T52', q: 'お店ごと借りたらいくら？', expect: 'handoff', target: 'H2', result: 'fixed', fix: '1回目：定食の値段の目安（Q12）を返した。→ H2 の合図に「借り」を足した（11/2）。', answeredWrongly: true },
    { no: 'T53', q: '会社の団体で20人、料金を決めたい', expect: 'handoff', target: 'H2', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T54', q: 'お弁当50個、来週の金曜に頼める？', expect: 'handoff', target: 'H2', result: 'todo', fix: '1回目：お弁当の予約の文（Q17）を返した（個数を見ていない）。→ 直す予定：10個以上の数が入った時を合図にする（12月の見直しで）。', answeredWrongly: true },
    { no: 'T55', q: '見積もりをお願いしたい', expect: 'handoff', target: 'H2', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T56', q: '予約をキャンセルしたい', expect: 'handoff', target: 'H3', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T57', q: '明日の予約、やっぱりやめます', expect: 'handoff', target: 'H3', result: 'fixed', fix: '1回目：席の予約の文（Q18）を返した。→ H3 の合図に「やめ」を足した（11/2）。', answeredWrongly: true },
    { no: 'T58', q: '予約の時間を19時に変更できる？', expect: 'handoff', target: 'H3', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T59', q: '予約取れてますか？確定してる？', expect: 'handoff', target: 'H3', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T60', q: '金曜の予約、取り消しで', expect: 'handoff', target: 'H3', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T61', q: '料理に異物があった', expect: 'handoff', target: 'H4', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T62', q: '昨日のお弁当を食べてからお腹が痛い', expect: 'handoff', target: 'H4', result: 'fixed', fix: '1回目：お弁当を食べる時間の文（Q16）を返した。→ H4 の合図に「お腹」「痛い」を足した（11/2）。', answeredWrongly: true },
    { no: 'T63', q: '店員の態度がひどかった', expect: 'handoff', target: 'H4', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T64', q: '食べた後から具合が悪い', expect: 'handoff', target: 'H4', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T65', q: '注文と違うお弁当だった。苦情を言いたい', expect: 'handoff', target: 'H4', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T66', q: '取材をお願いしたいです', expect: 'handoff', target: 'H5', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T67', q: 'お店の写真を撮影させてほしい', expect: 'handoff', target: 'H5', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T68', q: '広告の提案をさせてください', expect: 'handoff', target: 'H5', result: 'pass', fix: '', answeredWrongly: false },
    { no: 'T69', q: 'チラシをお店に置かせてもらえますか', expect: 'handoff', target: 'H5', result: 'todo', fix: '1回目：「お答えできません」と返し、人へ回さなかった。→ 直す予定：H5 の合図に「チラシ」「置かせて」を足す（12月の見直しで）。', answeredWrongly: false },
    { no: 'T70', q: 'ウェブの記事に載せてもいい？', expect: 'handoff', target: 'H5', result: 'pass', fix: '', answeredWrongly: false }
  ]
  // 記録4 月1回の見直し（decision：none＝未判断／qa＝Q&A に足す／handoff＝人へ回すに足す／skip＝今は足さない。最初の値）
  var REVIEW = [
    { no: 'R1', q: 'ご飯のおかわりはできますか？', times: 9, target: 'Q&A のメニュー・値段の目安', decision: 'qa', memo: '' },
    { no: 'R2', q: 'お弁当の容器を持って行ってもいいですか？', times: 7, target: 'Q&A の持ち帰り・予約の受け方', decision: 'qa', memo: '' },
    { no: 'R3', q: '辛くないメニューはありますか？', times: 6, target: 'Q&A のメニュー・値段の目安', decision: 'none', memo: '辛さは料理ごとに違うので、店主に確かめてから決める' },
    { no: 'R4', q: '妊娠中でも食べて大丈夫な料理はありますか？', times: 5, target: '人へ回す H1 の合図に「大丈夫な料理」', decision: 'handoff', memo: '' },
    { no: 'R5', q: 'ペットと一緒に入れますか？', times: 5, target: 'Q&A の席・子連れ', decision: 'qa', memo: '' },
    { no: 'R6', q: '領収書の宛名を会社名にできますか？', times: 4, target: 'Q&A の支払い', decision: 'none', memo: '手書きか印字かを店主に確かめてから決める' },
    { no: 'R7', q: 'アルバイトの募集はしていますか？', times: 3, target: '人へ回す H5 の合図に「募集」', decision: 'handoff', memo: '' },
    { no: 'R8', q: '近くに安い駐車場はありますか？', times: 3, target: '（足さない案）Q07 の答えの文で足りている', decision: 'skip', memo: 'お店の外のことは答えない' }
  ]
  return Object.freeze({ TODAY: TODAY, CATS: CATS, QA: QA, HANDOFF: HANDOFF, TESTS: TESTS, REVIEW: REVIEW })
})()
if (typeof module !== 'undefined' && module.exports) module.exports = Data40
