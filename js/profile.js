// --- Character builder config ---
const CHAR_BUILDER = {
  skinColor: {
    label: 'Skin',
    type: 'color',
    opts: ['f2d3b1','ecad80','9e5622','763900','edb98a','d78774','ae5d29','614335'],
  },
  hair: {
    label: 'Hair',
    type: 'style',
    opts: ['long01','long02','long03','long04','long05','long06','long07','long08',
           'long09','long10','long11','long12','long13','long14','long15','long16',
           'long17','long18','long19','long20','long21','long22','long23','long24',
           'long25','long26','short01','short02','short03','short04','short05',
           'short06','short07','short08','short09','short10','short11','short12',
           'short13','short14','short15','short16','short17','short18','short19'],
  },
  hairColor: {
    label: 'Hair Color',
    type: 'color',
    opts: ['0e0e0e','562306','6a4e35','796a45','b9a05f','e5d7a3','afafaf',
           'ac6511','cb6820','ab2a18','3eac2c','85c2c6','dba3be','592454'],
  },
  eyes: {
    label: 'Eyes',
    type: 'style',
    opts: ['variant01','variant02','variant03','variant04','variant05','variant06',
           'variant07','variant08','variant09','variant10','variant11','variant12',
           'variant13','variant14','variant15','variant16','variant17','variant18',
           'variant19','variant20','variant21','variant22','variant23','variant24',
           'variant25','variant26'],
  },
  eyebrows: {
    label: 'Eyebrows',
    type: 'style',
    opts: ['variant01','variant02','variant03','variant04','variant05','variant06',
           'variant07','variant08','variant09','variant10','variant11','variant12',
           'variant13','variant14','variant15'],
  },
  mouth: {
    label: 'Mouth',
    type: 'style',
    opts: ['variant01','variant02','variant03','variant04','variant05','variant06',
           'variant07','variant08','variant09','variant10','variant11','variant12',
           'variant13','variant14','variant15','variant16','variant17','variant18',
           'variant19','variant20','variant21','variant22','variant23','variant24',
           'variant25','variant26','variant27','variant28','variant29','variant30'],
  },
  earrings: {
    label: 'Earrings',
    type: 'style',
    opts: ['none','variant01','variant02','variant03','variant04','variant05','variant06'],
  },
  glasses: {
    label: 'Glasses',
    type: 'style',
    opts: ['none','variant01','variant02','variant03','variant04','variant05'],
  },
  backgroundColor: {
    label: 'Background',
    type: 'color',
    opts: ['transparent','b6e3f4','c0aede','d1d4f9','ffd5dc','ffdfbf','1a1a1b','121213'],
  },
};

// Array-type params that need [] notation in the DiceBear v9 API
const ARRAY_PARAMS = new Set(['skinColor','hair','hairColor','eyes','eyebrows','mouth',
                              'earrings','glasses','backgroundColor']);

// --- Cross-device avatar cache ---
let _avatarCache = {};

async function loadAvatars() {
  try {
    const { data, error } = await supabase.from('avatars').select('player, config');
    if (!error && data) {
      data.forEach(row => { _avatarCache[row.player] = row.config; });
      renderLeaderboard();
    }
  } catch(e) {}
}

// --- Avatar helpers ---
function getPlayerAvatar(player) {
  if (_avatarCache[player]) return _avatarCache[player];
  try {
    const s = localStorage.getItem(`wordleAvatar_${player}`);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return { style: 'adventurer', seed: player.toLowerCase(), attrs: {} };
}

function getAvatarUrl(player) {
  const config = getPlayerAvatar(player);
  return _buildDiceBearUrl(config.attrs || {}, config.seed || player.toLowerCase());
}

function _buildDiceBearUrl(attrs, seed) {
  const params = new URLSearchParams({ seed: seed || 'default' });
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (!v) return;
    if (k === 'earrings') {
      if (v === 'none') { params.append('earringsProbability', '0'); return; }
      params.append('earrings[]', v);
      params.append('earringsProbability', '100');
      return;
    }
    if (k === 'glasses') {
      if (v === 'none') { params.append('glassesProbability', '0'); return; }
      params.append('glasses[]', v);
      params.append('glassesProbability', '100');
      return;
    }
    if (ARRAY_PARAMS.has(k)) {
      if (v === 'transparent') return;
      params.append(k + '[]', v);
    } else {
      params.append(k, v);
    }
  });
  return `https://api.dicebear.com/9.x/adventurer/svg?${params}`;
}

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
  document.body.style.overflow = 'hidden';
}

function closeProfile() {
  document.getElementById('profile-overlay').classList.remove('active');
  document.body.style.overflow = '';
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

// --- Character builder (avatar picker) ---
let _pickerPlayer  = null;
let _activeAttr    = 'skinColor';
let _builderState  = { seed: '', attrs: {} };

function openAvatarPicker() {
  _pickerPlayer = _profilePlayer;
  const saved = getPlayerAvatar(_pickerPlayer);
  _builderState = { seed: saved.seed || _pickerPlayer.toLowerCase(), attrs: { ...(saved.attrs || {}) } };
  _activeAttr = 'skinColor';
  _renderBuilder();
  document.getElementById('avatar-picker-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAvatarPicker() {
  document.getElementById('avatar-picker-overlay').classList.remove('active');
  // keep body lock — profile is still open
}

function _renderBuilder() {
  document.getElementById('avatar-preview-img').src = _buildDiceBearUrl(_builderState.attrs, _builderState.seed);

  // attribute tabs
  document.getElementById('builder-attr-tabs').innerHTML = Object.entries(CHAR_BUILDER).map(([key, def]) =>
    `<button class="builder-attr-tab ${key === _activeAttr ? 'active' : ''}" onclick="selectBuilderAttr('${key}')">${def.label}</button>`
  ).join('');

  // options panel
  const def = CHAR_BUILDER[_activeAttr];
  const current = _builderState.attrs[_activeAttr] || '';

  if (def.type === 'color') {
    document.getElementById('builder-options').innerHTML = def.opts.map(v => {
      const hex = v === 'transparent' ? 'transparent' : '#' + v;
      const border = v === 'transparent' ? '2px dashed var(--text3)' : '';
      const selected = current === v;
      return `<div class="color-swatch ${selected ? 'selected' : ''}" style="background:${hex};${border ? 'border:' + border : ''}"
        onclick="selectBuilderOption('${v}')">${selected ? '<span class="swatch-check">✓</span>' : ''}</div>`;
    }).join('');
  } else {
    document.getElementById('builder-options').innerHTML = def.opts.map(v => {
      const isNone = v === 'none';
      const previewAttrs = { ..._builderState.attrs, [_activeAttr]: v };
      const url = isNone ? null : _buildDiceBearUrl(previewAttrs, _builderState.seed);
      const selected = (current === v) || (!current && isNone);
      if (isNone) {
        return `<div class="style-option ${selected ? 'selected' : ''} style-option-none" onclick="selectBuilderOption('${v}')">
          <span>NONE</span>
        </div>`;
      }
      return `<div class="style-option ${selected ? 'selected' : ''}" onclick="selectBuilderOption('${v}')">
        <img src="${url}" class="style-option-img" alt="" loading="lazy">
      </div>`;
    }).join('');
  }
}

function selectBuilderAttr(key) {
  _activeAttr = key;
  _renderBuilder();
}

function selectBuilderOption(value) {
  _builderState.attrs[_activeAttr] = value;
  _renderBuilder();
}

function randomizeSeed() {
  _builderState.seed = Math.random().toString(36).slice(2, 10);
  _renderBuilder();
}

async function saveAvatar() {
  if (!_pickerPlayer) return;
  const config = { style: 'adventurer', seed: _builderState.seed, attrs: _builderState.attrs };

  // save to localStorage immediately
  localStorage.setItem(`wordleAvatar_${_pickerPlayer}`, JSON.stringify(config));
  _avatarCache[_pickerPlayer] = config;

  // sync to Supabase for cross-device
  try {
    await supabase.from('avatars').upsert(
      { player: _pickerPlayer, config, updated_at: new Date().toISOString() },
      { onConflict: 'player' }
    );
  } catch(e) {}

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
