function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'history') renderHistory();
  if (name === 'submit') renderTodayScores();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function setHeaderDate() {
  const now = new Date();
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  document.getElementById('header-date').textContent =
    now.toLocaleDateString('en-US', opts).toUpperCase() + '\n' + FULL_MONTHS[now.getMonth()].toUpperCase() + ' STANDINGS';
}

function renderAll() {
  renderLeaderboard();
  renderPrizeSection();
  renderHistory();
  renderTodayScores();
}

setHeaderDate();
renderAll();
checkSession();
fetchScores();
subscribeToScores();
checkHash();

window.addEventListener('focus', fetchScores);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) fetchScores();
});
