// --- History ---
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
      ? `<button class="delete-btn" onclick="deleteEntry(${e.id})" title="Delete">✕</button>`
      : '';
    return `<div class="history-item">
      <div class="history-meta">
        <span class="history-player">${e.player}</span>
        <span class="history-wordle">#${e.puzzleNum}</span>
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
  supabase.from('scores').delete().eq('id', id).then(({ error }) => {
    if (error) { showToast('Delete failed — are you logged in?'); return; }
    fetchScores();
    showToast('Entry removed');
  });
}

function filterHistory(player, btn) {
  historyFilter = player;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory();
}
