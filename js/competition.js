// --- Competition Management ---

const INVITE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += '-';
    code += INVITE_CHARSET[Math.floor(Math.random() * INVITE_CHARSET.length)];
  }
  return code;
}

async function loadCompetition() {
  const { data: { session } } = await supabase.auth.getSession();

  // Stage 2: try finding competition via user_id in competition_members
  if (session?.user?.id) {
    const { data: memberRow } = await supabase
      .from('competition_members')
      .select('display_name, competition_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle();

    if (memberRow) {
      return await _loadCompetitionById(memberRow.competition_id, memberRow.display_name);
    }
  }

  // Stage 1 fallback: localStorage
  const id = localStorage.getItem('wordleCompetitionId');
  if (!id) return null;

  const comp = await _loadCompetitionById(id, localStorage.getItem('wordlePlayer'));
  if (!comp) return null;

  // Auto-claim slot if signed in but slot unclaimed
  if (session?.user?.id && currentPlayer) {
    const member = currentCompetition.members.find(
      m => m.display_name === currentPlayer && !m.user_id
    );
    if (member) {
      await supabase.from('competition_members')
        .update({ user_id: session.user.id })
        .eq('id', member.id);
    }
  }

  return comp;
}

async function _loadCompetitionById(id, savedPlayer) {
  const { data, error } = await supabase
    .from('competitions')
    .select('*, competition_members(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    localStorage.removeItem('wordleCompetitionId');
    return null;
  }

  currentCompetition = {
    id: data.id,
    name: data.name,
    invite_code: data.invite_code,
    prize_amount: data.prize_amount,
    season_year: data.season_year,
    members: data.competition_members || [],
  };

  if (savedPlayer && currentCompetition.members.some(m => m.display_name === savedPlayer)) {
    currentPlayer = savedPlayer;
    localStorage.setItem('wordleCompetitionId', id);
    localStorage.setItem('wordlePlayer', currentPlayer);
  }

  return currentCompetition;
}

async function _createCompetitionInDb(name, members, prizeAmount, seasonYear) {
  const invite_code = generateInviteCode();

  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .insert([{ name, invite_code, prize_amount: prizeAmount || 0, season_year: seasonYear || new Date().getFullYear() }])
    .select()
    .single();

  if (compErr || !comp) throw compErr || new Error('Failed to create competition');

  const memberRows = members.map(m => ({
    competition_id: comp.id,
    display_name: m.name,
    color: m.color || '#888',
  }));

  const { error: membersErr } = await supabase
    .from('competition_members')
    .insert(memberRows);

  if (membersErr) throw membersErr;

  const { data: full } = await supabase
    .from('competitions')
    .select('*, competition_members(*)')
    .eq('id', comp.id)
    .single();

  return full;
}

async function joinCompetition(inviteCode, playerName) {
  const code = inviteCode.trim().toUpperCase();

  const { data: comp, error } = await supabase
    .from('competitions')
    .select('*, competition_members(*)')
    .eq('invite_code', code)
    .single();

  if (error || !comp) throw new Error('Competition not found — check your invite code');

  const member = (comp.competition_members || []).find(m => m.display_name === playerName);
  if (!member) throw new Error(`"${playerName}" is not in this competition`);

  currentCompetition = {
    id: comp.id,
    name: comp.name,
    invite_code: comp.invite_code,
    prize_amount: comp.prize_amount,
    season_year: comp.season_year,
    members: comp.competition_members || [],
  };

  localStorage.setItem('wordleCompetitionId', comp.id);
  currentPlayer = member.display_name;
  localStorage.setItem('wordlePlayer', currentPlayer);

  // Claim this member slot for the current user
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id && !member.user_id) {
    await supabase.from('competition_members')
      .update({ user_id: session.user.id })
      .eq('id', member.id);
  }

  return currentCompetition;
}

// --- Landing UI ---

function showLanding() {
  document.getElementById('landing-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  showLandingHome();
}

function hideLanding() {
  document.getElementById('landing-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function showLandingHome() {
  document.getElementById('landing-home').style.display = '';
  document.getElementById('landing-create').style.display = 'none';
  document.getElementById('landing-join').style.display = 'none';
}

function showCreateScreen() {
  document.getElementById('landing-home').style.display = 'none';
  document.getElementById('landing-create').style.display = '';
  document.getElementById('landing-join').style.display = 'none';
  _initCreateScreen();
}

function showJoinScreen() {
  document.getElementById('landing-home').style.display = 'none';
  document.getElementById('landing-create').style.display = 'none';
  document.getElementById('landing-join').style.display = '';
  document.getElementById('join-invite-code').value = '';
  document.getElementById('join-player-name').innerHTML = '<option value="">Select your name...</option>';
  document.getElementById('join-members-preview').style.display = 'none';
  document.getElementById('join-members-preview').innerHTML = '';
  document.getElementById('join-name-section').style.display = 'none';
  document.getElementById('join-error').textContent = '';
}

// --- Create Screen ---
let _createMembers = [];

function _initCreateScreen() {
  _createMembers = [
    { name: '', color: MEMBER_PALETTE[0] },
    { name: '', color: MEMBER_PALETTE[1] },
  ];
  document.getElementById('create-comp-name').value = '';
  document.getElementById('create-prize').value = '100';
  document.getElementById('create-year').value = new Date().getFullYear();
  document.getElementById('create-error').textContent = '';
  const btn = document.getElementById('create-submit-btn');
  btn.disabled = false;
  btn.textContent = 'CREATE COMPETITION';
  _renderCreateMembers();
}

function _escHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function _renderCreateMembers() {
  document.getElementById('create-members-list').innerHTML = _createMembers.map((m, i) => `
    <div class="create-member-row">
      <button class="create-member-color-btn" style="background:${m.color}"
        onclick="_pickMemberColor(${i})" title="Pick color"></button>
      <input class="create-member-name" type="text" placeholder="Player ${i + 1}"
        value="${_escHtml(m.name)}" oninput="_createMembers[${i}].name=this.value" maxlength="20">
      ${_createMembers.length > 2
        ? `<button class="create-member-remove" onclick="_removeCreateMember(${i})">✕</button>`
        : '<span class="create-member-placeholder"></span>'}
    </div>
  `).join('');
}

let _colorPickTarget = null;

function _pickMemberColor(idx) {
  _colorPickTarget = idx;
  const picker = document.getElementById('create-color-picker');
  picker.innerHTML = MEMBER_PALETTE.map(c =>
    `<div class="create-palette-swatch${_createMembers[idx].color === c ? ' selected' : ''}"
      style="background:${c}" onclick="_selectMemberColor('${c}')"></div>`
  ).join('');
  picker.style.display = 'flex';
}

function _selectMemberColor(color) {
  if (_colorPickTarget !== null) _createMembers[_colorPickTarget].color = color;
  document.getElementById('create-color-picker').style.display = 'none';
  _renderCreateMembers();
}

function _addCreateMember() {
  if (_createMembers.length >= 10) return;
  _createMembers.push({ name: '', color: MEMBER_PALETTE[_createMembers.length % MEMBER_PALETTE.length] });
  _renderCreateMembers();
}

function _removeCreateMember(idx) {
  _createMembers.splice(idx, 1);
  _renderCreateMembers();
}

async function submitCreateCompetition() {
  document.querySelectorAll('.create-member-name').forEach((inp, i) => {
    if (_createMembers[i]) _createMembers[i].name = inp.value.trim();
  });

  const name     = document.getElementById('create-comp-name').value.trim();
  const prize    = parseInt(document.getElementById('create-prize').value, 10) || 0;
  const year     = parseInt(document.getElementById('create-year').value, 10) || new Date().getFullYear();
  const errEl    = document.getElementById('create-error');

  const validMembers = _createMembers.filter(m => m.name.trim());
  if (!name)                   { errEl.textContent = 'Enter a competition name'; return; }
  if (validMembers.length < 2) { errEl.textContent = 'Need at least 2 players'; return; }

  const names = validMembers.map(m => m.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) { errEl.textContent = 'Player names must be unique'; return; }

  errEl.textContent = '';
  const btn = document.getElementById('create-submit-btn');
  btn.disabled = true;
  btn.textContent = 'CREATING...';

  try {
    const full = await _createCompetitionInDb(
      name,
      validMembers.map(m => ({ name: m.name.trim(), color: m.color })),
      prize,
      year
    );

    currentCompetition = {
      id: full.id,
      name: full.name,
      invite_code: full.invite_code,
      prize_amount: full.prize_amount,
      season_year: full.season_year,
      members: full.competition_members || [],
    };

    localStorage.setItem('wordleCompetitionId', full.id);
    currentPlayer = validMembers[0].name.trim();
    localStorage.setItem('wordlePlayer', currentPlayer);

    // Claim the creator's member slot
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const creatorMember = currentCompetition.members.find(m => m.display_name === currentPlayer);
      if (creatorMember && !creatorMember.user_id) {
        await supabase.from('competition_members')
          .update({ user_id: session.user.id })
          .eq('id', creatorMember.id);
      }
    }

    showInviteScreen();
  } catch(e) {
    errEl.textContent = e.message || 'Failed to create — try again';
    btn.disabled = false;
    btn.textContent = 'CREATE COMPETITION';
  }
}

// --- Invite Code Screen (shown after create) ---

function showInviteScreen() {
  document.getElementById('landing-home').style.display   = 'none';
  document.getElementById('landing-create').style.display = 'none';
  document.getElementById('landing-join').style.display   = 'none';
  document.getElementById('landing-invite').style.display = '';

  const code = currentCompetition.invite_code;
  document.getElementById('invite-code-display').textContent = code;
  document.getElementById('invite-comp-name').textContent = currentCompetition.name;
  document.getElementById('invite-members-list').textContent =
    currentCompetition.members.map(m => m.display_name).join(', ');
  document.getElementById('invite-copy-btn').textContent = 'COPY CODE';
}

async function copyInviteCode() {
  const code = currentCompetition.invite_code;
  try {
    await navigator.clipboard.writeText(code);
    const btn = document.getElementById('invite-copy-btn');
    btn.textContent = 'COPIED! ✓';
    setTimeout(() => { btn.textContent = 'COPY CODE'; }, 2000);
  } catch(e) {}
}

function enterCompetition() {
  hideLanding();
  initAppUI();
}

// --- Switch / Leave Competition ---

function switchCompetition() {
  localStorage.removeItem('wordleCompetitionId');
  localStorage.removeItem('wordlePlayer');
  location.reload();
}

// --- Join Screen ---

async function previewInviteCode() {
  const raw  = document.getElementById('join-invite-code').value;
  const code = raw.trim().toUpperCase();
  // Auto-insert dash
  if (raw.replace('-','').length === 3 && !raw.includes('-')) {
    document.getElementById('join-invite-code').value = code + '-';
  }

  const previewEl  = document.getElementById('join-members-preview');
  const nameSection = document.getElementById('join-name-section');
  const sel        = document.getElementById('join-player-name');

  if (code.replace('-','').length < 6) {
    previewEl.style.display = 'none';
    nameSection.style.display = 'none';
    previewEl.innerHTML = '';
    return;
  }

  previewEl.style.display = '';
  previewEl.innerHTML = '<div class="join-preview-loading">Looking up code...</div>';

  const { data: comp } = await supabase
    .from('competitions')
    .select('name, competition_members(display_name)')
    .eq('invite_code', code)
    .single();

  if (!comp) {
    previewEl.innerHTML = '<div class="join-preview-error">Code not found — double check it</div>';
    nameSection.style.display = 'none';
    return;
  }

  const names = (comp.competition_members || []).map(m => m.display_name);
  previewEl.innerHTML = `
    <div class="join-preview-comp">${_escHtml(comp.name)}</div>
    <div class="join-preview-members">${names.map(_escHtml).join(' · ')}</div>
  `;

  sel.innerHTML = '<option value="">Select your name...</option>' +
    names.map(n => `<option value="${_escHtml(n)}">${_escHtml(n)}</option>`).join('');
  nameSection.style.display = '';
}

async function submitJoinCompetition() {
  const code       = document.getElementById('join-invite-code').value.trim();
  const playerName = document.getElementById('join-player-name').value;
  const errEl      = document.getElementById('join-error');

  if (!code)       { errEl.textContent = 'Enter your invite code'; return; }
  if (!playerName) { errEl.textContent = 'Select your name'; return; }

  errEl.textContent = '';
  const btn = document.getElementById('join-submit-btn');
  btn.disabled = true;
  btn.textContent = 'JOINING...';

  try {
    await joinCompetition(code, playerName);
    hideLanding();
    initAppUI();
  } catch(e) {
    errEl.textContent = e.message || 'Failed to join — try again';
    btn.disabled = false;
    btn.textContent = 'JOIN';
  }
}

// --- App startup gate ---

async function initApp() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    showAuthOverlay();
    return;
  }

  const email = session?.user?.email;
  setAdminState(email && ADMIN_EMAILS.includes(email));

  const comp = await loadCompetition();
  if (comp) {
    initAppUI();
  } else {
    showLanding();
  }
}
