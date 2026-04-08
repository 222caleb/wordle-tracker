// --- Submit ---
function submitScore() {
  const player = document.getElementById('submit-player').value;
  const text = document.getElementById('submit-text').value;
  if (!player) { showToast('Please select your name'); return; }
  const parsed = parseWordle(text);
  if (!parsed) { showToast('Could not parse Wordle result'); return; }

  const data = loadData();
  if (data.find(e => e.player === player && e.puzzleNum === parsed.puzzleNum)) {
    showToast(`${player} already submitted Wordle #${parsed.puzzleNum}`);
    return;
  }

  const entry = {
    id: Date.now(),
    player,
    puzzleNum: parsed.puzzleNum,
    score: parsed.score,
    date: new Date().toISOString(),
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  };

  supabase.from('scores').insert([entry]).then(() => fetchScores());
  document.getElementById('submit-text').value = '';
  document.getElementById('submit-player').value = '';
  document.getElementById('parse-preview').textContent = '';
  showToast(`Score submitted! ${player}: ${parsed.score}/6`);
}

// --- Today's scores ---
function getTodaysPuzzleNum() {
  const data = loadData();
  const today = new Date();
  const todayScores = data.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  });
  if (todayScores.length) return todayScores[0].puzzleNum;
  return null;
}

function renderTodayScores() {
  const data = loadData();
  const today = new Date();
  const todayScores = data.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  }).sort((a, b) => {
    const sa = a.score === 'X' ? 7 : parseInt(a.score, 10);
    const sb = b.score === 'X' ? 7 : parseInt(b.score, 10);
    return sa - sb;
  });

  const puzzleNum = getTodaysPuzzleNum();
  const numEl = document.getElementById('today-wordle-num');
  numEl.textContent = puzzleNum ? `#${puzzleNum}` : '';

  const list = document.getElementById('today-list');

  if (!todayScores.length) {
    list.innerHTML = '<div class="today-empty">No scores yet today.</div>';
    return;
  }

  list.innerHTML = todayScores.map(e => {
    const scoreNum = e.score === 'X' ? 'X' : parseInt(e.score, 10);
    const scoreClass = e.score === 'X' ? 'score-X' : `score-${e.score}`;
    const scoreDisp = e.score === 'X' ? 'X/6' : `${e.score}/6`;
    const reaction = getReaction(scoreNum);

    let reactionHTML = '';
    if (reaction) {
      if (reaction.gif) {
        reactionHTML = `<img src="${reaction.gif}" class="today-gif" alt="reaction" />`;
      } else {
        reactionHTML = `<span class="today-reaction ${reaction.cls}">${reaction.text}</span>`;
      }
    }

    return `<div style="display:flex;flex-direction:column;gap:0">
      <div class="today-item">
        <div class="today-left">
          <span class="today-player">${e.player}</span>
          ${reactionHTML && !reaction.gif ? reactionHTML : ''}
        </div>
        <span class="today-score-display ${scoreClass}">${scoreDisp}</span>
      </div>
      ${reaction && reaction.gif ? `<img src="${reaction.gif}" class="today-gif" alt="oof" />` : ''}
    </div>`;
  }).join('');
}
