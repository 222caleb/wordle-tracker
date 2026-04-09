function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  updateTabIndicator(btn);
  if (name === 'leaderboard') renderLeaderboard();
  if (name === 'history') renderHistory();
  if (name === 'submit') renderTodayScores();
}

function updateTabIndicator(btn) {
  const indicator = document.querySelector('.tab-indicator');
  if (!indicator) return;
  indicator.style.left = btn.offsetLeft + 'px';
  indicator.style.width = btn.offsetWidth + 'px';
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showScoreReveal(player, score) {
  const scoreNum = score === 'X' ? 'X' : (typeof score === 'number' ? score : parseInt(score, 10));

  let color, label;
  if (scoreNum === 1 || scoreNum === 2) { color = '#f5c518'; label = 'KABLOOIE!!'; }
  else if (scoreNum === 3)              { color = '#538d4e'; label = 'NICE!'; }
  else if (scoreNum === 4)              { color = '#538d4e'; label = 'SOLID'; }
  else if (scoreNum === 5)              { color = '#b59f3b'; label = 'CLOSE ONE'; }
  else if (scoreNum === 6)              { color = '#e67e22'; label = 'PHEW!'; }
  else                                  { color = '#e74c3c'; label = 'YIKES'; }

  const scoreDisp = score === 'X' ? 'X/6' : `${scoreNum}/6`;

  const overlay = document.createElement('div');
  overlay.className = 'score-reveal-overlay';
  overlay.innerHTML = `
    <div class="score-reveal-ring" style="border-color:${color}"></div>
    <div class="score-reveal-ring score-reveal-ring-2" style="border-color:${color}"></div>
    <div class="score-reveal-content">
      <div class="score-reveal-player">${player}</div>
      <div class="score-reveal-score" style="color:${color}">${scoreDisp}</div>
      <div class="score-reveal-label" style="color:${color}">${label}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 1900);
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

// Position tab indicator on load without transition
const _initTab = document.querySelector('.tab.active');
if (_initTab) {
  const _ind = document.querySelector('.tab-indicator');
  if (_ind) {
    _ind.style.transition = 'none';
    _ind.style.left = _initTab.offsetLeft + 'px';
    _ind.style.width = _initTab.offsetWidth + 'px';
    requestAnimationFrame(() => { _ind.style.transition = ''; });
  }
}

const savedPlayer = localStorage.getItem('wordlePlayer');
if (savedPlayer) document.getElementById('submit-player').value = savedPlayer;
document.getElementById('submit-player').addEventListener('change', function() {
  if (this.value) localStorage.setItem('wordlePlayer', this.value);
});

window.addEventListener('focus', fetchScores);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) fetchScores();
});
