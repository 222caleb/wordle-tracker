// --- Puzzle number from date ---
function getTodayPuzzleNumFromDate() {
  const epoch = new Date(2021, 5, 19); // June 19, 2021 = Wordle #1
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((d - epoch) / 86400000) + 1;
}

// --- Populate player select dynamically ---
function populatePlayerSelect() {
  const sel = document.getElementById('submit-player');
  const players = getPlayers();
  sel.innerHTML = '<option value="">Select...</option>' +
    players.map(p => `<option value="${p}">${p}</option>`).join('');
  if (currentPlayer) sel.value = currentPlayer;
}

// --- Quick score selection ---
let _quickScore = null;

function selectQuickScore(score, btn) {
  _quickScore = score;
  document.querySelectorAll('.quick-score-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const puzzleNum = getTodaysPuzzleNum() || getTodayPuzzleNumFromDate();
  const disp = score === 'X' ? 'X/6' : `${score}/6`;
  const el = document.getElementById('quick-preview');
  el.textContent = `Wordle #${puzzleNum} · ${disp}`;
  el.style.display = 'block';

  document.getElementById('submit-text').value = '';
  document.getElementById('parse-preview').textContent = '';
}

// --- Clipboard paste ---
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const ta = document.getElementById('submit-text');
    ta.value = text;
    ta.dispatchEvent(new Event('input'));
    _quickScore = null;
    document.querySelectorAll('.quick-score-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('quick-preview').style.display = 'none';
  } catch(e) {
    showToast('Could not read clipboard — paste manually', true);
  }
}

// --- Submit ---
function submitScore() {
  const player = document.getElementById('submit-player').value;
  if (!player) { showToast('Please select your name', true); return; }

  let parsed;
  if (_quickScore !== null) {
    const puzzleNum = String(getTodaysPuzzleNum() || getTodayPuzzleNumFromDate());
    parsed = { puzzleNum, score: _quickScore };
  } else {
    const text = document.getElementById('submit-text').value;
    parsed = parseWordle(text);
    if (!parsed) { showToast('Tap your score above or paste your Wordle result', true); return; }
  }

  const data = loadData();
  if (data.find(e => e.player === player && e.puzzleNum === parsed.puzzleNum)) {
    showToast(`${player} already submitted Wordle #${parsed.puzzleNum}`, true);
    return;
  }

  const entry = {
    id: Date.now(),
    competition_id: currentCompetition.id,
    player,
    puzzleNum: parsed.puzzleNum,
    score: parsed.score,
    date: new Date().toISOString(),
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  };

  supabase.from('scores_v2').insert([entry]).then(() => fetchScores());
  showScoreReveal(player, parsed.score);

  _quickScore = null;
  document.querySelectorAll('.quick-score-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('quick-preview').style.display = 'none';
  document.getElementById('submit-text').value = '';
  document.getElementById('parse-preview').textContent = '';
  showToast(`Score submitted! ${player}: ${parsed.score === 'X' ? 'X' : parsed.score}/6`);
}

// --- Today's scores ---
function getTodaysPuzzleNum() {
  const data = loadData();
  const today = new Date();
  const todayScores = data.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth()    === today.getMonth()    &&
           d.getDate()     === today.getDate();
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
           d.getMonth()    === today.getMonth()    &&
           d.getDate()     === today.getDate();
  }).sort((a, b) => {
    const sa = a.score === 'X' ? 7 : parseInt(a.score, 10);
    const sb = b.score === 'X' ? 7 : parseInt(b.score, 10);
    return sa - sb;
  });

  const puzzleNum = getTodaysPuzzleNum() || getTodayPuzzleNumFromDate();
  document.getElementById('today-wordle-num').textContent = `#${puzzleNum}`;

  const list = document.getElementById('today-list');

  if (!todayScores.length) {
    list.innerHTML = '<div class="today-empty">No scores yet today.</div>';
    return;
  }

  const players = getPlayers();
  const playedToday = new Set(todayScores.map(e => e.player));
  const waiting = players.filter(p => !playedToday.has(p));
  const waitingHTML = waiting.length
    ? `<div class="waiting-on">Still waiting on: ${waiting.join(', ')}</div>`
    : '';

  list.innerHTML = todayScores.map((e, i) => {
    const scoreNum = e.score === 'X' ? 'X' : parseInt(e.score, 10);
    const scoreClass = e.score === 'X' ? 'score-X' : `score-${e.score}`;
    const scoreDisp = e.score === 'X' ? 'X/6' : `${e.score}/6`;
    const reaction = getReaction(scoreNum);

    let reactionHTML = '';
    if (reaction) {
      reactionHTML = reaction.gif
        ? `<img src="${reaction.gif}" class="today-gif" alt="reaction" />`
        : `<span class="today-reaction ${reaction.cls}">${reaction.text}</span>`;
    }

    return `<div class="today-flip-wrap" style="animation-delay:${i * 110}ms">
      <div class="today-item">
        <div class="today-left">
          <span class="today-player">${e.player}</span>
          ${reaction && !reaction.gif ? reactionHTML : ''}
        </div>
        <span class="today-score-display ${scoreClass}">${scoreDisp}</span>
      </div>
      ${reaction && reaction.gif ? `<img src="${reaction.gif}" class="today-gif" alt="oof" />` : ''}
    </div>`;
  }).join('') + waitingHTML;
}
