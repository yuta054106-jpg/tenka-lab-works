/* とりと酒 北燈 予約LP（TENKA LAB 作品例）
   - ヘッダーの見た目（スクロール後）
   - スマホ固定バーの出し入れ
   - 画面に入ったら出す動き
   - 予約フォーム（作品例のため送信しない） */
(function () {
  'use strict';

  var doc = document;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- ヘッダー：スクロールしたら線と半透明 ---------- */
  var header = doc.getElementById('site-header');
  if (header) {
    var ticking = false;
    var updateHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
    updateHeader();
  }

  /* ---------- スマホ固定バー：FV が消えたら出す／予約フォームが見えている間は隠す ---------- */
  var bar = doc.getElementById('fixed-cta');
  var fv = doc.getElementById('top');
  var reserve = doc.getElementById('reserve');
  if (bar && fv && reserve && hasIO) {
    var fvVisible = true;
    var reserveVisible = false;
    var updateBar = function () {
      bar.classList.toggle('is-visible', !fvVisible && !reserveVisible);
    };
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { fvVisible = e.isIntersecting; });
      updateBar();
    }).observe(fv);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { reserveVisible = e.isIntersecting; });
      updateBar();
    }).observe(reserve);
  }

  /* ---------- 画面に入ったら出す（一度出したら戻さない） ---------- */
  var reveals = doc.querySelectorAll('.reveal');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!hasIO || reduceMotion) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  } else {
    var revealIO = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          observer.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    Array.prototype.forEach.call(reveals, function (el) { revealIO.observe(el); });
  }

  /* ---------- 予約フォーム（作品例のため送信しない） ---------- */
  var form = doc.getElementById('reserve-form');
  if (!form) return;

  var status = doc.getElementById('form-status');
  var dateInput = doc.getElementById('f-date');

  // ご来店日：今日〜60日後（端末の日付で計算）
  var toISO = function (d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  };
  if (dateInput) {
    var today = new Date();
    var max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);
    dateInput.min = toISO(today);
    dateInput.max = toISO(max);
  }

  var requiredIds = ['f-date', 'f-time', 'f-people', 'f-name', 'f-tel'];

  // aria-describedby にエラー文の id を足す／外す（人数のヒントは残す）
  var setDescribedBy = function (field, errorId, on) {
    var ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    ids = ids.filter(function (id) { return id !== errorId; });
    if (on) ids.unshift(errorId);
    if (ids.length) field.setAttribute('aria-describedby', ids.join(' '));
    else field.removeAttribute('aria-describedby');
  };

  var showError = function (field, on) {
    var err = doc.getElementById(field.id + '-error');
    if (!err) return;
    err.hidden = !on;
    if (on) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    setDescribedBy(field, err.id, on);
  };

  var isEmpty = function (field) { return field.value.trim() === ''; };

  // 入力し直したら、その欄のエラーを消す
  requiredIds.forEach(function (id) {
    var field = doc.getElementById(id);
    if (!field) return;
    var clear = function () {
      if (field.getAttribute('aria-invalid') === 'true' && !isEmpty(field)) showError(field, false);
    };
    field.addEventListener('input', clear);
    field.addEventListener('change', clear);
  });

  var clearStatus = function () {
    status.textContent = '';
    status.classList.remove('is-shown');
  };

  form.addEventListener('submit', function (event) {
    event.preventDefault(); // 作品例のため、どこにも送信しない

    var firstInvalid = null;
    requiredIds.forEach(function (id) {
      var field = doc.getElementById(id);
      if (!field) return;
      var invalid = isEmpty(field);
      showError(field, invalid);
      if (invalid && !firstInvalid) firstInvalid = field;
    });

    clearStatus();

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // 読み上げを確実にするため、少し待ってから文を入れる
    window.setTimeout(function () {
      status.textContent = '作品例のため送信されません。実際のお店では、ここでご予約を受け付けます。';
      status.classList.add('is-shown');
    }, 50);
  });
})();
