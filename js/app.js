function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  updateTabIndicator(btn);
  if (name === 'leaderboard') renderLeaderboard(true);
  if (name === 'history') renderHistory();
  if (name === 'submit') renderTodayScores();
  if (name === 'halloffame') renderHallOfFame();
  if (name === 'wallofshame') renderWallOfShame();
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

  const heroTitle = document.getElementById('hero-title');
  if (heroTitle && currentCompetition) {
    heroTitle.textContent = `${currentCompetition.name.toUpperCase()} · ${currentCompetition.season_year}`;
  }
}

function renderAll() {
  renderLeaderboard();
  renderPrizeSection();
  renderHistory();
  renderTodayScores();
}

// --- App init (called from competition.js after competition loads) ---
function initAppUI() {
  setHeaderDate();
  renderCompChip();
  populatePlayerSelect();
  renderHistoryFilters();
  renderAll();
  checkSession();
  fetchScores();
  subscribeToScores();
  checkHash();
  loadAvatars();

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

  if (currentPlayer) {
    document.getElementById('submit-player').value = currentPlayer;
  }
  document.getElementById('submit-player').addEventListener('change', function() {
    if (this.value) {
      currentPlayer = this.value;
      localStorage.setItem('wordlePlayer', this.value);
    }
  });

  window.addEventListener('focus', fetchScores);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchScores();
  });
}

// --- Hero terminal ---
function buildTerminalLines() {
  const data = loadData();
  const today = new Date();
  const month = today.getMonth(), year = today.getFullYear();
  const players = getPlayers();

  const todayEntries = data.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === today.getDate();
  });
  const playedToday = todayEntries.map(e => e.player);
  const waiting = players.filter(p => !playedToday.includes(p));

  const monthData = data.filter(e => e.month === month && e.year === year);
  const monthStats = players.map(p => {
    const entries = monthData.filter(e => e.player === p);
    const scores = entries.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
    const total = scores.length ? scores.reduce((a,b)=>a+b,0) : null;
    const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
    return { player: p, total, avg, count: entries.length };
  }).filter(s => s.total !== null).sort((a,b) => a.total !== b.total ? a.total - b.total : a.avg - b.avg);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = Math.round((tomorrow - today) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;

  const lines = [`loading ${FULL_MONTHS[month].toLowerCase()} standings...`];

  if (playedToday.length > 0) {
    lines.push(`played today → ${playedToday.map(p => p.toLowerCase()).join(', ')}`);
  } else {
    lines.push('no scores yet today — go play!');
  }

  if (waiting.length > 0 && playedToday.length > 0) {
    lines.push(`still waiting on: ${waiting.map(p => p.toLowerCase()).join(', ')}`);
  } else if (players.length > 0 && playedToday.length === players.length) {
    lines.push('everyone played today!');
  }

  if (monthStats.length > 0) {
    const leader = monthStats[0];
    lines.push(`${leader.player.toLowerCase()} leads · ${leader.total} pts · ${leader.avg.toFixed(2)} avg`);
  }

  if (monthStats.length > 1) {
    const last = monthStats[monthStats.length - 1];
    lines.push(`${last.player.toLowerCase()} in last — ${last.total} pts`);
  }

  lines.push(`next wordle in: ${h}h ${m}m`);
  lines.push("good luck today. you'll need it.");
  return lines;
}

(function startTerminal() {
  const el = document.getElementById('terminalText');
  if (!el) return;
  let lines = [], lineIdx = 0, charIdx = 0, deleting = false, pauseTicks = 0;

  function tick() {
    if (lineIdx === 0 && charIdx === 0 && !deleting) lines = buildTerminalLines();
    const line = lines[lineIdx] || '';

    if (pauseTicks > 0) { pauseTicks--; setTimeout(tick, 60); return; }

    if (!deleting) {
      charIdx++;
      el.textContent = line.slice(0, charIdx);
      if (charIdx === line.length) {
        deleting = true; pauseTicks = 28; setTimeout(tick, 60);
      } else {
        setTimeout(tick, 42 + Math.random() * 30);
      }
    } else {
      charIdx--;
      el.textContent = line.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false; lineIdx = (lineIdx + 1) % lines.length; pauseTicks = 6; setTimeout(tick, 60);
      } else {
        setTimeout(tick, 22);
      }
    }
  }

  setTimeout(tick, 1500);
})();

// --- Monthly celebration ---
function checkCelebration() {
  const today = new Date();
  if (today.getDate() !== 1) return;
  const key = `wordleCelebrated_${today.getFullYear()}_${today.getMonth()}`;
  if (localStorage.getItem(key)) return;

  const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const data = loadData();
  const monthData = data.filter(e => e.month === prevMonth && e.year === prevYear);
  if (!monthData.length) return;

  const players = getPlayers();
  const stats = players.map(p => {
    const entries = monthData.filter(e => e.player === p);
    const scores = entries.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
    const total = scores.length ? scores.reduce((a,b)=>a+b,0) : null;
    const avg = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2) : null;
    return { player: p, total, avg, count: entries.length };
  }).filter(s => s.total !== null).sort((a,b) => a.total !== b.total ? a.total - b.total : a.avg - b.avg);

  if (!stats.length) return;
  localStorage.setItem(key, '1');
  showCelebration(stats[0], stats.slice(1), FULL_MONTHS[prevMonth], prevMonth, prevYear);
}

let _congratsChannel = null;

async function showCelebration(winner, others, monthName, prevMonth, prevYear) {
  const overlay = document.getElementById('celebration-overlay');
  const winnerColor = getPlayerColor(winner.player);

  document.getElementById('cel-month').textContent = monthName.toUpperCase() + ' WINNER';
  const nameEl = document.getElementById('cel-winner');
  nameEl.textContent = winner.player.toUpperCase();
  nameEl.style.color = winnerColor;
  nameEl.style.textShadow = `0 0 40px ${winnerColor}88`;
  document.getElementById('cel-stats').textContent =
    `${winner.total} total pts · ${winner.avg} avg · ${winner.count} games`;

  const confettiEl = document.getElementById('cel-confetti');
  const colors = ['#f5c518','#538d4e','#b59f3b','#e67e22','#9b59b6','#3498db','#e74c3c'];
  confettiEl.innerHTML = Array.from({length: 55}, (_, i) => {
    const c = colors[i % colors.length];
    const left = Math.random() * 100;
    const size = 5 + Math.random() * 7;
    const delay = Math.random() * 3;
    const dur = 2.5 + Math.random() * 2;
    const round = Math.random() > 0.5 ? '50%' : '2px';
    return `<div class="cel-piece" style="left:${left}%;width:${size}px;height:${size}px;background:${c};border-radius:${round};animation-delay:${delay}s;animation-duration:${dur}s"></div>`;
  }).join('');

  const { data: existing } = await supabase
    .from('congrats_v2')
    .select('from_player')
    .eq('competition_id', currentCompetition.id)
    .eq('to_player', winner.player)
    .eq('month', prevMonth)
    .eq('year', prevYear);
  const sentSet = new Set((existing || []).map(c => c.from_player));

  document.getElementById('cel-congrats').innerHTML = others.map((p, i) => {
    const hasSent = sentSet.has(p.player);
    return `<div class="cel-card" id="cel-card-${p.player}" style="animation-delay:${700 + i * 180}ms">
      ${avatarImgHTML(p.player, 'cel-avatar')}
      <div class="cel-pname">${p.player}</div>
      <div class="${hasSent ? 'cel-sent' : 'cel-waiting'}">${hasSent ? 'SENT ✓' : 'waiting...'}</div>
    </div>`;
  }).join('');

  const isNonWinner = others.some(p => p.player === currentPlayer);
  const iAlreadySent = sentSet.has(currentPlayer);
  const actionEl = document.getElementById('cel-action');
  if (isNonWinner && !iAlreadySent) {
    actionEl.innerHTML = `<button class="cel-send-btn" id="cel-main-send-btn"
      onclick="sendCongrats('${currentPlayer}','${winner.player}',${prevMonth},${prevYear})">
      SEND CONGRATS TO ${winner.player.toUpperCase()} ↗
    </button>`;
  } else if (isNonWinner && iAlreadySent) {
    actionEl.innerHTML = `<div class="cel-my-sent">You already sent your congrats ✓</div>`;
  } else {
    actionEl.innerHTML = '';
  }

  if (_congratsChannel) supabase.removeChannel(_congratsChannel);
  _congratsChannel = supabase
    .channel(`congrats-${Date.now()}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'congrats_v2',
      filter: `to_player=eq.${winner.player}`
    }, payload => {
      const from = payload.new.from_player;
      if (payload.new.competition_id !== currentCompetition.id) return;
      const card = document.getElementById(`cel-card-${from}`);
      if (card) {
        const el = card.querySelector('.cel-waiting');
        if (el) el.outerHTML = '<div class="cel-sent cel-sent-flash">SENT ✓</div>';
      }
    })
    .subscribe();

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function sendCongrats(fromPlayer, toPlayer, month, year) {
  const btn = document.getElementById('cel-main-send-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'SENDING...'; }

  const { error } = await supabase
    .from('congrats_v2')
    .insert([{ competition_id: currentCompetition.id, from_player: fromPlayer, to_player: toPlayer, month, year }]);

  if (error) {
    if (btn) { btn.disabled = false; btn.textContent = `SEND CONGRATS TO ${toPlayer.toUpperCase()} ↗`; }
    showToast('Could not send congrats', true);
    return;
  }

  const actionEl = document.getElementById('cel-action');
  if (actionEl) actionEl.innerHTML = '<div class="cel-my-sent">You sent your congrats ✓</div>';

  const card = document.getElementById(`cel-card-${fromPlayer}`);
  if (card) {
    const el = card.querySelector('.cel-waiting');
    if (el) el.outerHTML = '<div class="cel-sent cel-sent-flash">SENT ✓</div>';
  }
}

function closeCelebration() {
  document.getElementById('celebration-overlay').classList.remove('active');
  document.body.style.overflow = '';
  if (_congratsChannel) { supabase.removeChannel(_congratsChannel); _congratsChannel = null; }
}

// --- Competition chip in header ---
function renderCompChip() {
  if (!currentCompetition) return;
  const chip = document.getElementById('comp-chip');
  chip.textContent = currentCompetition.name;
  chip.style.display = '';

  document.getElementById('comp-panel-name').textContent = currentCompetition.name;
  document.getElementById('comp-panel-code').textContent = currentCompetition.invite_code;
  document.getElementById('comp-panel-player').textContent = currentPlayer || '—';
}

function toggleCompPanel() {
  const panel = document.getElementById('comp-panel');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
  document.getElementById('comp-chip').classList.toggle('active', !isOpen);
}

async function copyCompCode() {
  const code = currentCompetition.invite_code;
  try {
    await navigator.clipboard.writeText(code);
    const btn = document.getElementById('comp-panel-copy-btn');
    btn.textContent = 'COPIED!';
    setTimeout(() => { btn.textContent = 'COPY'; }, 2000);
  } catch(e) {}
}

// Close comp panel when clicking outside
document.addEventListener('click', function(e) {
  const panel = document.getElementById('comp-panel');
  const chip  = document.getElementById('comp-chip');
  if (panel && panel.style.display !== 'none' &&
      !panel.contains(e.target) && e.target !== chip) {
    panel.style.display = 'none';
    chip.classList.remove('active');
  }
});

// Entry point — competition.js defines initApp()
initApp();
