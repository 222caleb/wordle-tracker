// --- History ---
let pendingDeleteId = null;

function renderHistory() {
  const data = loadData();
  const filtered = historyFilter === 'ALL' ? data : data.filter(e => e.player === historyFilter);
  const sorted = [...filtered].sort((a,b) => b.id - a.id);

  const list = document.getElementById('history-list');
  if (!sorted.length) {
    list.innerHTML = '<div style="color:var(--text3);font-family:var(--mono);font-size:13px;padding:1rem 0">No scores yet.</div>';
    return;
  }

  list.innerHTML = sorted.map(e => {
    const d = new Date(e.date);
    const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    const scoreClass = e.score === 'X' ? 'score-X' : `score-${e.score}`;
    const scoreDisp = e.score === 'X' ? 'X/6' : `${e.score}/6`;
    const deleteBtn = isAdmin
      ? `<button class="delete-btn" onclick="deleteEntry(${e.id})" data-delete-id="${e.id}" title="Delete">✕</button>`
      : '';
    const avatarColor = PLAYER_COLORS[e.player] || '#555';
    return `<div class="history-item">
      <div class="history-meta">
        <div class="player-avatar player-avatar-sm" style="background:${avatarColor}">${e.player[0]}</div>
        <span class="history-player">${e.player}</span>
        <a class="history-wordle" href="https://www.nytimes.com/games/wordle/index.html" target="_blank" rel="noopener">#${e.puzzleNum}</a>
        <span class="history-date">${dateStr}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="history-score ${scoreClass}">${scoreDisp}</span>
        ${deleteBtn}
      </div>
    </div>`;
  }).join('');
}

function deleteEntry(id) {
  if (pendingDeleteId === id) {
    pendingDeleteId = null;
    supabase.from('scores').delete().eq('id', id).then(({ error }) => {
      if (error) { showToast('Delete failed — are you logged in?', true); return; }
      fetchScores();
      showToast('Entry removed');
    });
    return;
  }

  // First click: show confirm state
  if (pendingDeleteId !== null) {
    const prev = document.querySelector(`[data-delete-id="${pendingDeleteId}"]`);
    if (prev) { prev.textContent = '✕'; prev.classList.remove('confirm'); }
  }
  pendingDeleteId = id;
  const btn = document.querySelector(`[data-delete-id="${id}"]`);
  if (btn) { btn.textContent = 'sure?'; btn.classList.add('confirm'); }
}

document.addEventListener('click', function(e) {
  if (pendingDeleteId !== null && !e.target.classList.contains('delete-btn')) {
    const btn = document.querySelector(`[data-delete-id="${pendingDeleteId}"]`);
    if (btn) { btn.textContent = '✕'; btn.classList.remove('confirm'); }
    pendingDeleteId = null;
  }
});

function filterHistory(player, btn) {
  historyFilter = player;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory();
}
