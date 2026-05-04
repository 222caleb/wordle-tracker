// --- Monthly points ---
function computeMonthlyPoints(upToMonth) {
  const data = loadData();
  const now = new Date();
  const limit = upToMonth !== undefined ? upToMonth : now.getMonth();
  const players = getPlayers();
  const pts = {};
  players.forEach(p => pts[p] = 0);

  for (let m = 0; m < limit; m++) {
    const monthData = data.filter(e => e.month === m && e.year === now.getFullYear());
    if (!monthData.length) continue;
    const stats = players.map(p => {
      const entries = monthData.filter(e => e.player === p);
      const scores = entries.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
      const total = scores.length ? scores.reduce((a,b)=>a+b,0) : null;
      const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
      return { player: p, total, avg, count: entries.length };
    }).filter(s => s.total !== null);
    if (!stats.length) continue;
    stats.sort((a,b) => a.total !== b.total ? a.total - b.total : a.avg - b.avg);
    pts[stats[0].player]++;
  }
  return pts;
}

function getMonthPoints(player, upToMonth) { return computeMonthlyPoints(upToMonth)[player] || 0; }

function hasSeasonPoints(upToMonth) {
  const limit = upToMonth !== undefined ? upToMonth : new Date().getMonth();
  return limit > 0 && Object.values(computeMonthlyPoints(upToMonth)).some(v => v > 0);
}

// --- Sparkline ---
function buildSparkline(playerScores) {
  const recent = [...playerScores].sort((a, b) => a.id - b.id).slice(-10);
  if (recent.length < 2) return '';

  const vals = recent.map(s => s.score === 'X' ? 7 : parseInt(s.score, 10));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 56, H = 20;

  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = ((v - min) / range) * (H - 6) + 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const trend = vals[vals.length - 1] - vals[0];
  const color = trend < 0 ? '#538d4e' : trend > 0 ? '#e67e22' : '#565758';
  const lastX = W;
  const lastY = ((vals[vals.length - 1] - min) / range) * (H - 6) + 3;

  return `<svg class="sparkline" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY.toFixed(1)}" r="2.5" fill="${color}"/>
  </svg>`;
}

// --- Count-up ---
function startCountUps(container) {
  const duration = 700;
  container.querySelectorAll('[data-count-up]').forEach(el => {
    const target = parseFloat(el.dataset.countUp);
    if (isNaN(target) || target === 0) return;
    const decimals = parseInt(el.dataset.decimals || '0');
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = decimals ? (target * eased).toFixed(decimals) : Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// --- Leaderboard ---
function toggleDist(card) {
  const isExpanding = !card.classList.contains('expanded');
  card.classList.toggle('expanded');
  if (isExpanding) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.querySelectorAll('.dist-bar-inner[data-width]').forEach(el => {
          el.style.width = el.dataset.width + '%';
        });
      });
    });
  } else {
    card.querySelectorAll('.dist-bar-inner').forEach(el => {
      el.style.width = '0%';
    });
  }
}

function renderLeaderboard(shouldAnimate = false) {
  const data = loadData();
  const players = getPlayers();
  const monthData = data.filter(e => e.month === currentMonth && e.year === new Date().getFullYear());

  const monthLabelEl = document.getElementById('month-label');
  monthLabelEl.textContent = FULL_MONTHS[currentMonth].toUpperCase();
  monthLabelEl.classList.toggle('current-month', currentMonth === new Date().getMonth());

  const showSeasonPts = hasSeasonPoints(currentMonth);

  const stats = players.map(p => {
    const entries = monthData.filter(e => e.player === p);
    const allEntries = data.filter(e => e.player === p);
    const scores = entries.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
    const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
    const total = scores.length ? scores.reduce((a,b)=>a+b,0) : null;

    const dist = {};
    ['1','2','3','4','5','6','X'].forEach(v => dist[v] = 0);
    entries.forEach(e => {
      const key = e.score === 'X' ? 'X' : String(e.score);
      dist[key] = (dist[key] || 0) + 1;
    });

    return { player: p, count: entries.length, avg, total, dist, allEntries };
  });

  stats.sort((a,b) => {
    if (a.total === null && b.total === null) return 0;
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    if (a.total !== b.total) return a.total - b.total;
    return a.avg - b.avg;
  });

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const lb = document.getElementById('leaderboard');
  lb.innerHTML = '';

  stats.forEach((s, i) => {
    const isLeader = i === 0 && s.avg !== null;
    const isSilver = i === 1 && s.avg !== null;
    const isBronze = i === 2 && s.avg !== null;

    let rowClass = 'player-row';
    if (isLeader) rowClass += ' leader';
    else if (isSilver) rowClass += ' silver';
    else if (isBronze) rowClass += ' bronze';
    if (!showSeasonPts) rowClass += ' no-season-pts';

    let rankLabel, medal;
    if (isLeader)      { rankLabel = '<span class="rank gold">1</span>';   medal = '<span class="medal">👑</span>'; }
    else if (isSilver) { rankLabel = '<span class="rank silver">2</span>'; medal = '<span class="medal">🥈</span>'; }
    else if (isBronze) { rankLabel = '<span class="rank bronze">3</span>'; medal = '<span class="medal">🥉</span>'; }
    else               { rankLabel = `<span class="rank">${i+1}</span>`;   medal = ''; }

    const avgClass = 'stat-val';
    const barWidth = s.count ? Math.round((s.count / maxCount) * 100) : 0;
    const sparklineHTML = buildSparkline(s.allEntries);
    const seasonPts = getMonthPoints(s.player, currentMonth);

    const seasonPtsCol = showSeasonPts ? `
      <div class="stat-col">
        <div class="stat-val" data-count-up="${seasonPts}">0</div>
        <div class="stat-label">season pts</div>
      </div>` : '';

    const maxDistCount = Math.max(...Object.values(s.dist), 1);
    const distBars = ['1','2','3','4','5','6','X'].map(v => {
      const count = s.dist[v] || 0;
      const w = Math.round((count / maxDistCount) * 100);
      const labelClass = v === 'X' ? 'score-X' : `score-${v}`;
      return `<div class="dist-bar-row">
        <span class="dist-score-label ${labelClass}">${v}</span>
        <div class="dist-bar-bg">
          <div class="dist-bar-inner" data-score="${v}" data-width="${w}" style="width:0%"></div>
        </div>
        <span class="dist-count">${count}</span>
      </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'player-card';
    if (shouldAnimate) {
      card.style.animation = `rowSlideIn 0.4s ease both`;
      card.style.animationDelay = `${i * 65}ms`;
    }
    card.addEventListener('click', () => toggleDist(card));

    card.innerHTML = `
      <div class="${rowClass}">
        ${rankLabel}
        <div class="player-name">
          ${medal}
          ${avatarImgHTML(s.player, 'player-avatar', true)}
          <span onclick="openProfile('${s.player}', event)" style="cursor:pointer">${s.player}</span>
          <div class="name-right">
            ${sparklineHTML}
            <span class="expand-icon">▾</span>
          </div>
        </div>
        <div class="stat-col">
          <div class="${avgClass}" ${s.avg !== null ? `data-count-up="${s.avg.toFixed(2)}" data-decimals="2"` : ''}>${s.avg !== null ? '0.00' : '—'}</div>
          <div class="stat-label">avg</div>
        </div>
        <div class="stat-col">
          <div class="stat-val" ${s.total !== null ? `data-count-up="${s.total}"` : ''}>${s.total !== null ? '0' : '—'}</div>
          <div class="stat-label">total</div>
        </div>
        <div class="stat-col">
          <div class="stat-val" data-count-up="${s.count}">0</div>
          <div class="stat-label">games</div>
        </div>
        ${seasonPtsCol}
        <div class="score-bar-wrap">
          <div class="score-bar"><div class="score-bar-fill" data-width="${barWidth}" style="width:0%"></div></div>
        </div>
      </div>
      <div class="dist-panel">
        <div class="dist-title">Score Distribution — ${FULL_MONTHS[currentMonth]}</div>
        ${distBars}
      </div>
    `;

    lb.appendChild(card);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      lb.querySelectorAll('.score-bar-fill[data-width]').forEach(el => {
        el.style.width = el.dataset.width + '%';
      });
      startCountUps(lb);
    });
  });
}

// --- Season section ---
function renderPrizeSection() {
  const pts = computeMonthlyPoints(currentMonth);
  const players = getPlayers();
  const maxPts = Math.max(...Object.values(pts), 0);
  const isAnyPts = maxPts > 0;

  const sorted = [...players].sort((a, b) => (pts[b] || 0) - (pts[a] || 0));
  const prizeAmt = currentCompetition ? `$${currentCompetition.prize_amount || 0} GRAND PRIZE` : '';

  const chipsHTML = sorted.map(p => {
    const isLeading = isAnyPts && pts[p] === maxPts;
    const crown = isLeading ? '<span class="season-chip-crown">👑</span>' : '';
    return `<div class="season-chip${isLeading ? ' leading' : ''}">
      ${avatarImgHTML(p, 'player-avatar player-avatar-sm')}
      <div class="season-chip-info">
        <div class="season-chip-name">${p.toUpperCase()}</div>
        <div class="season-chip-pts">${pts[p] || 0}</div>
      </div>
      ${crown}
    </div>`;
  }).join('');

  document.getElementById('season-section').innerHTML = `
    <div class="season-header">
      <div class="season-label">SEASON STANDINGS</div>
      ${prizeAmt ? `<div class="season-prize-badge">💰 ${prizeAmt}</div>` : ''}
    </div>
    <div class="season-chips">${chipsHTML}</div>
  `;
}

function changeMonth(dir) {
  currentMonth = Math.max(0, Math.min(11, currentMonth + dir));
  renderLeaderboard(true);
  renderPrizeSection();
}
