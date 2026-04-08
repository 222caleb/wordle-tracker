// --- Monthly points ---
function computeMonthlyPoints() {
  const data = loadData();
  const now = new Date();
  const pts = {};
  PLAYERS.forEach(p => pts[p] = 0);

  for (let m = 0; m < now.getMonth(); m++) {
    const monthData = data.filter(e => e.month === m && e.year === now.getFullYear());
    if (!monthData.length) continue;
    const stats = PLAYERS.map(p => {
      const entries = monthData.filter(e => e.player === p);
      const scores = entries.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
      const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
      return { player: p, avg, count: entries.length };
    }).filter(s => s.avg !== null);
    if (!stats.length) continue;
    stats.sort((a,b) => a.avg !== b.avg ? a.avg - b.avg : b.count - a.count);
    pts[stats[0].player]++;
  }
  return pts;
}

function getMonthPoints(player) { return computeMonthlyPoints()[player] || 0; }

function hasSeasonPoints() {
  return new Date().getMonth() > 0 && Object.values(computeMonthlyPoints()).some(v => v > 0);
}

// --- Leaderboard ---
function renderLeaderboard() {
  const data = loadData();
  const monthData = data.filter(e => e.month === currentMonth && e.year === new Date().getFullYear());
  document.getElementById('month-label').textContent = FULL_MONTHS[currentMonth].toUpperCase();

  const showSeasonPts = hasSeasonPoints();

  const stats = PLAYERS.map(p => {
    const entries = monthData.filter(e => e.player === p);
    const scores = entries.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
    const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
    const total = scores.length ? scores.reduce((a,b)=>a+b,0) : null;
    return { player: p, count: entries.length, avg, total };;
  });

  stats.sort((a,b) => {
    if (a.avg === null && b.avg === null) return 0;
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    if (Math.abs(a.avg - b.avg) > 0.001) return a.avg - b.avg;
    return b.count - a.count;
  });

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const lb = document.getElementById('leaderboard');
  lb.innerHTML = '';

  stats.forEach((s, i) => {
    const isLeader = i === 0 && s.avg !== null;
    const isSilver = i === 1 && s.avg !== null;
    const isBronze = i === 2 && s.avg !== null;

    const row = document.createElement('div');
    let rowClass = 'player-row';
    if (isLeader) rowClass += ' leader';
    else if (isSilver) rowClass += ' silver';
    else if (isBronze) rowClass += ' bronze';
    if (!showSeasonPts) rowClass += ' no-season-pts';
    row.className = rowClass;

    let rankLabel, medal;
    if (isLeader)      { rankLabel = '<span class="rank gold">1</span>';   medal = '<span class="medal">👑</span>'; }
    else if (isSilver) { rankLabel = '<span class="rank silver">2</span>'; medal = '<span class="medal">🥈</span>'; }
    else if (isBronze) { rankLabel = '<span class="rank bronze">3</span>'; medal = '<span class="medal">🥉</span>'; }
    else               { rankLabel = `<span class="rank">${i+1}</span>`;   medal = ''; }

    const avgDisplay = s.avg !== null ? s.avg.toFixed(2) : '—';
    const avgClass = s.avg !== null && s.avg <= 3.5 ? 'stat-val good' : 'stat-val';
    const totalDisplay = s.total !== null ? s.total : '—';
    const barWidth = s.count ? Math.round((s.count / maxCount) * 100) : 0;

    const seasonPtsCol = showSeasonPts ? `
      <div class="stat-col">
        <div class="stat-val">${getMonthPoints(s.player)}</div>
        <div class="stat-label">season pts</div>
      </div>` : '';

    row.innerHTML = `
      ${rankLabel}
      <div class="player-name">${medal}${s.player}</div>
      <div class="stat-col">
        <div class="${avgClass}">${avgDisplay}</div>
        <div class="stat-label">avg</div>
      </div>
      <div class="stat-col">
        <div class="stat-val">${totalDisplay}</div>
        <div class="stat-label">total</div>
      </div>
      <div class="stat-col">
        <div class="stat-val">${s.count}</div>
        <div class="stat-label">games</div>
      </div>
      ${seasonPtsCol}
      <div class="score-bar-wrap">
        <div class="score-bar"><div class="score-bar-fill" style="width:${barWidth}%"></div></div>
      </div>
    `;
    lb.appendChild(row);
  });
}

// --- Prize section ---
function renderPrizeSection() {
  const pts = computeMonthlyPoints();
  const maxPts = Math.max(...Object.values(pts));
  const grid = document.getElementById('points-grid');
  grid.innerHTML = PLAYERS.map(p => {
    const isLeading = pts[p] === maxPts && maxPts > 0;
    return `<div class="points-chip">
      <div class="p-name">${p}</div>
      <div class="p-pts${isLeading ? ' leading' : ''}">${pts[p]}</div>
    </div>`;
  }).join('');
}

function changeMonth(dir) {
  currentMonth = Math.max(0, Math.min(11, currentMonth + dir));
  renderLeaderboard();
}
