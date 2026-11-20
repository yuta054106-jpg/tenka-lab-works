// 作品例（架空のお店）。メニュー開閉と、予約ボタンの案内ダイアログだけ。外部へは何も送信しない
const toggle = document.querySelector('.menu-toggle')
const nav = document.getElementById('site-nav')
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open')
  toggle.setAttribute('aria-expanded', String(open))
})
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    nav.classList.remove('open')
    toggle.setAttribute('aria-expanded', 'false')
  }
})
const dialog = document.getElementById('reserve-dialog')
document.querySelectorAll('[data-reserve]').forEach((b) => b.addEventListener('click', () => dialog.showModal()))
document.getElementById('dialog-close').addEventListener('click', () => dialog.close())
