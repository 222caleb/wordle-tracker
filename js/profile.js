// --- Avatar helpers ---
const AVATAR_STYLES = [
  { id: 'pixel-art',  label: 'Pixel'      },
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'lofi',       label: 'Lofi'       },
  { id: 'bottts',     label: 'Robot'      },
  { id: 'fun-emoji',  label: 'Emoji'      },
  { id: 'thumbs',     label: 'Thumbs'     },
  { id: 'croodles',   label: 'Doodle'     },
  { id: 'micah',      label: 'Micah'      },
];

function getPlayerAvatar(player) {
  try {
    const s = localStorage.getItem(`wordleAvatar_${player}`);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return { style: 'pixel-art', seed: player.toLowerCase() };
}

function getAvatarUrl(player) {
  const { style, seed } = getPlayerAvatar(player);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// Returns an avatar div that works for any size class (player-avatar, cel-avatar, etc.)
// The div has a background-color fallback and overlays the DiceBear SVG image.
function avatarImgHTML(player, className = 'player-avatar', clickable = false) {
  const url = getAvatarUrl(player);
  const color = PLAYER_COLORS[player] || '#555';
  const clickAttr = clickable
    ? `onclick="openProfile('${player}', event)" title="View ${player}'s profile" style="background:${color};cursor:pointer"`
    : `style="background:${color}"`;
  return `<div class="${className}" ${clickAttr}>
    <img src="${url}" class="avatar-img" alt="${player[0]}" onerror="this.remove()">
    <span class="avatar-fallback">${player[0]}</span>
  </div>`;
}

// --- Profile overlay ---
let _profilePlayer = null;

function openProfile(player, event) {
  if (event) event.stopPropagation();
  _profilePlayer = player;
  renderProfileContent(player);
  document.getElementById('profile-overlay').classList.add('active');
}

function closeProfile() {
  document.getElementById('profile-overlay').classList.remove('active');
}

function renderProfileContent(player) {
  const data = loadData();
  const now = new Date();
  const isMe = player === localStorage.getItem('wordlePlayer');
  const color = PLAYER_COLORS[player] || '#f5c518';

  const all = data.filter(e => e.player === player);
  const allS = all.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
  const allAvg = allS.length ? allS.reduce((a,b)=>a+b,0)/allS.length : null;

  const curr = all.filter(e => e.month === now.getMonth() && e.year === now.getFullYear());
  const currS = curr.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
  const currTotal = currS.length ? currS.reduce((a,b)=>a+b,0) : null;
  const currAvg = currS.length ? currTotal/currS.length : null;

  let bestM = null, bestA = Infinity, worstM = null, worstA = -Infinity;
  for (let m = 0; m <= 11; m++) {
    const me = all.filter(e => e.month === m && e.year === now.getFullYear());
    if (!me.length) continue;
    const ms = me.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
    const ma = ms.reduce((a,b)=>a+b,0)/ms.length;
    if (ma < bestA) { bestA = ma; bestM = m; }
    if (ma > worstA) { worstA = ma; worstM = m; }
  }

  const rankStats = PLAYERS.map(p => {
    const pe = data.filter(e => e.player === p && e.month === now.getMonth() && e.year === now.getFullYear());
    const ps = pe.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
    const pt = ps.length ? ps.reduce((a,b)=>a+b,0) : null;
    return { player: p, total: pt, avg: ps.length ? pt/ps.length : null };
  }).filter(s => s.total !== null).sort((a,b) => a.total !== b.total ? a.total-b.total : a.avg-b.avg);
  const rank = rankStats.findIndex(s => s.player === player) + 1;

  const dist = {};
  ['1','2','3','4','5','6','X'].forEach(v => dist[v] = 0);
  all.forEach(e => { const k = e.score === 'X' ? 'X' : String(e.score); dist[k]++; });
  const maxDist = Math.max(...Object.values(dist), 1);

  const trend = [];
  for (let m = 0; m <= now.getMonth(); m++) {
    const me = all.filter(e => e.month === m && e.year === now.getFullYear());
    const ms = me.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
    trend.push({ m, avg: ms.length ? ms.reduce((a,b)=>a+b,0)/ms.length : null });
  }

  document.getElementById('profile-avatar-img').src = getAvatarUrl(player);
  const nameEl = document.getElementById('profile-name');
  nameEl.textContent = player.toUpperCase();
  nameEl.style.color = color;
  document.getElementById('profile-avatar-edit-btn').style.display = isMe ? '' : 'none';
  document.getElementById('profile-rank').textContent = rank > 0 ? `#${rank} THIS MONTH` : 'NO SCORES YET';

  document.getElementById('profile-stats-grid').innerHTML = [
    { v: allS.length,                                                           label: 'ALL-TIME GAMES' },
    { v: allAvg ? allAvg.toFixed(2) : '—',                                     label: 'ALL-TIME AVG'   },
    { v: currS.length || '—',                                                   label: 'THIS MONTH'     },
    { v: currAvg ? currAvg.toFixed(2) : '—',                                   label: 'MONTH AVG'      },
    { v: bestM  !== null ? FULL_MONTHS[bestM].slice(0,3).toUpperCase()  : '—', label: 'BEST MONTH'     },
    { v: worstM !== null ? FULL_MONTHS[worstM].slice(0,3).toUpperCase() : '—', label: 'WORST MONTH'    },
  ].map(s => `<div class="pstat"><div class="pstat-val">${s.v}</div><div class="pstat-label">${s.label}</div></div>`).join('');

  document.getElementById('profile-dist').innerHTML = ['1','2','3','4','5','6','X'].map(v => {
    const c = dist[v] || 0;
    const w = Math.round((c/maxDist)*100);
    return `<div class="dist-bar-row">
      <span class="dist-score-label ${v === 'X' ? 'score-X' : 'score-'+v}">${v}</span>
      <div class="dist-bar-bg"><div class="dist-bar-inner" style="width:${w}%"></div></div>
      <span class="dist-count">${c}</span>
    </div>`;
  }).join('');

  document.getElementById('profile-monthly').innerHTML = trend.map(t => {
    const barH = t.avg !== null ? Math.max(4, Math.round((t.avg/7)*60)) : 0;
    const bc = !t.avg ? 'var(--border)' : t.avg <= 3.5 ? 'var(--green)' : t.avg <= 5 ? 'var(--yellow)' : '#e74c3c';
    return `<div class="monthly-bar-col">
      <div class="monthly-bar-wrap"><div class="monthly-bar" style="height:${barH}px;background:${bc}"></div></div>
      <div class="monthly-bar-label">${FULL_MONTHS[t.m].slice(0,3).toUpperCase()}</div>
    </div>`;
  }).join('');
}

// --- Avatar picker ---
let _pickerPlayer = null;
let _pickerStyle  = 'pixel-art';

function openAvatarPicker() {
  _pickerPlayer = _profilePlayer;
  const av = getPlayerAvatar(_pickerPlayer);
  _pickerStyle = av.style;
  document.getElementById('avatar-seed-input').value = av.seed;
  renderStyleGrid();
  updateAvatarPreview();
  document.getElementById('avatar-picker-overlay').classList.add('active');
}

function closeAvatarPicker() {
  document.getElementById('avatar-picker-overlay').classList.remove('active');
}

function renderStyleGrid() {
  const seed = document.getElementById('avatar-seed-input').value || (_pickerPlayer || 'player').toLowerCase();
  document.getElementById('avatar-style-grid').innerHTML = AVATAR_STYLES.map(s => `
    <div class="style-chip ${s.id === _pickerStyle ? 'selected' : ''}" onclick="selectAvatarStyle('${s.id}')">
      <img src="https://api.dicebear.com/9.x/${s.id}/svg?seed=${encodeURIComponent(seed)}" class="style-chip-img" alt="">
      <span class="style-chip-label">${s.label}</span>
    </div>
  `).join('');
}

function selectAvatarStyle(styleId) {
  _pickerStyle = styleId;
  renderStyleGrid();
  updateAvatarPreview();
}

function updateAvatarPreview() {
  const seed = document.getElementById('avatar-seed-input').value || (_pickerPlayer || 'player').toLowerCase();
  document.getElementById('avatar-preview-img').src =
    `https://api.dicebear.com/9.x/${_pickerStyle}/svg?seed=${encodeURIComponent(seed)}`;
}

function randomizeSeed() {
  document.getElementById('avatar-seed-input').value = Math.random().toString(36).slice(2, 10);
  renderStyleGrid();
  updateAvatarPreview();
}

function saveAvatar() {
  if (!_pickerPlayer) return;
  const seed = document.getElementById('avatar-seed-input').value || _pickerPlayer.toLowerCase();
  localStorage.setItem(`wordleAvatar_${_pickerPlayer}`, JSON.stringify({ style: _pickerStyle, seed }));
  closeAvatarPicker();
  renderProfileContent(_pickerPlayer);
  document.getElementById('profile-avatar-img').src = getAvatarUrl(_pickerPlayer);
  renderLeaderboard();
}

// --- Hall of Fame ---
function renderHallOfFame() {
  const data = loadData();
  const now = new Date();
  const container = document.getElementById('hof-list');
  const entries = [];

  for (let m = 0; m < now.getMonth(); m++) {
    const md = data.filter(e => e.month === m && e.year === now.getFullYear());
    if (!md.length) continue;
    const stats = PLAYERS.map(p => {
      const pe = md.filter(e => e.player === p);
      const scores = pe.map(e => e.score === 'X' ? 7 : parseInt(e.score, 10));
      const total = scores.length ? scores.reduce((a,b)=>a+b,0) : null;
      const avg   = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
      return { player: p, total, avg, count: scores.length };
    }).filter(s => s.total !== null).sort((a,b) => a.total !== b.total ? a.total-b.total : a.avg-b.avg);
    if (stats.length) entries.push({ m, winner: stats[0], runners: stats.slice(1) });
  }

  if (!entries.length) {
    container.innerHTML = '<div class="hof-empty">No completed months yet — check back next month.</div>';
    return;
  }

  container.innerHTML = [...entries].reverse().map(e => {
    const wc = PLAYER_COLORS[e.winner.player] || '#f5c518';
    return `<div class="hof-card">
      <div class="hof-month-label">${FULL_MONTHS[e.m].toUpperCase()} ${now.getFullYear()}</div>
      <div class="hof-winner-row">
        <span class="hof-trophy">🏆</span>
        ${avatarImgHTML(e.winner.player, 'player-avatar player-avatar-lg')}
        <div class="hof-winner-info">
          <div class="hof-winner-name" style="color:${wc}">${e.winner.player.toUpperCase()}</div>
          <div class="hof-winner-stats">${e.winner.total} pts · ${e.winner.avg.toFixed(2)} avg · ${e.winner.count} games</div>
        </div>
      </div>
      <div class="hof-runners">
        ${e.runners.map((s,i) => {
          const rc = PLAYER_COLORS[s.player] || '#555';
          const medal = ['🥈','🥉'][i] || `${i+2}.`;
          return `<span class="hof-runner">${medal} <span style="color:${rc}">${s.player}</span> <span class="hof-runner-pts">${s.total} pts</span></span>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}
