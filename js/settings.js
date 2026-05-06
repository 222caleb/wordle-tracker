// --- Competition Settings ---

function isOwner() {
  if (!currentCompetition?.creator_user_id) return false;
  // checked against session asynchronously — see openSettings
  return _cachedIsOwner;
}

let _cachedIsOwner = false;

async function _checkOwner() {
  const { data: { session } } = await supabase.auth.getSession();
  _cachedIsOwner = !!(session?.user?.id && session.user.id === currentCompetition?.creator_user_id);
  return _cachedIsOwner;
}

async function openSettings() {
  const owner = await _checkOwner();
  if (!owner) return;

  document.getElementById('settings-name').value = currentCompetition.name;
  document.getElementById('settings-prize').value = currentCompetition.prize_amount || 0;
  document.getElementById('settings-invite-code').textContent = currentCompetition.invite_code;
  document.getElementById('settings-name-error').textContent = '';
  document.getElementById('settings-prize-error').textContent = '';
  document.getElementById('settings-code-msg').textContent = '';

  _renderSettingsMembers();

  const archiveBtn = document.getElementById('settings-archive-btn');
  archiveBtn.textContent = currentCompetition.is_archived ? 'UNARCHIVE SEASON' : 'ARCHIVE SEASON';

  document.getElementById('settings-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function _renderSettingsMembers() {
  const list = document.getElementById('settings-members-list');
  list.innerHTML = currentCompetition.members.map(m => `
    <div class="settings-member-row" id="settings-member-${m.id}">
      <div class="settings-member-dot" style="background:${m.color || '#888'}"></div>
      <div class="settings-member-name">${_escHtml(m.display_name)}</div>
      <div class="settings-member-status">${m.user_id ? '✓ joined' : 'not signed up'}</div>
      <button class="settings-member-remove" onclick="removeMember('${m.id}','${_escHtml(m.display_name)}')" title="Remove">✕</button>
    </div>
  `).join('');
}

async function saveCompName() {
  const name = document.getElementById('settings-name').value.trim();
  const errEl = document.getElementById('settings-name-error');
  if (!name) { errEl.textContent = 'Name cannot be empty'; return; }

  const btn = document.getElementById('settings-name-btn');
  btn.disabled = true; btn.textContent = 'SAVING...';

  const { error } = await supabase
    .from('competitions')
    .update({ name })
    .eq('id', currentCompetition.id);

  if (error) {
    errEl.textContent = 'Failed to save';
  } else {
    currentCompetition.name = name;
    renderCompChip();
    setHeaderDate();
    errEl.textContent = '';
    btn.textContent = 'SAVED ✓';
    setTimeout(() => { btn.textContent = 'SAVE'; btn.disabled = false; }, 1800);
    return;
  }
  btn.disabled = false; btn.textContent = 'SAVE';
}

async function saveCompPrize() {
  const prize = parseInt(document.getElementById('settings-prize').value, 10);
  const errEl = document.getElementById('settings-prize-error');
  if (isNaN(prize) || prize < 0) { errEl.textContent = 'Enter a valid amount'; return; }

  const btn = document.getElementById('settings-prize-btn');
  btn.disabled = true; btn.textContent = 'SAVING...';

  const { error } = await supabase
    .from('competitions')
    .update({ prize_amount: prize })
    .eq('id', currentCompetition.id);

  if (error) {
    errEl.textContent = 'Failed to save';
  } else {
    currentCompetition.prize_amount = prize;
    renderPrizeSection();
    errEl.textContent = '';
    btn.textContent = 'SAVED ✓';
    setTimeout(() => { btn.textContent = 'SAVE'; btn.disabled = false; }, 1800);
    return;
  }
  btn.disabled = false; btn.textContent = 'SAVE';
}

async function regenerateInviteCode() {
  const btn = document.getElementById('settings-regen-btn');
  const msgEl = document.getElementById('settings-code-msg');
  btn.disabled = true; btn.textContent = 'REGENERATING...';

  const newCode = generateInviteCode();
  const { error } = await supabase
    .from('competitions')
    .update({ invite_code: newCode })
    .eq('id', currentCompetition.id);

  if (error) {
    msgEl.textContent = 'Failed to regenerate';
    msgEl.style.color = '#e74c3c';
  } else {
    currentCompetition.invite_code = newCode;
    localStorage.setItem('wordleCompetitionId', currentCompetition.id);
    document.getElementById('settings-invite-code').textContent = newCode;
    msgEl.textContent = 'New code saved — share it with your members';
    msgEl.style.color = 'var(--text2)';
  }
  btn.disabled = false; btn.textContent = 'REGENERATE';
}

async function removeMember(memberId, displayName) {
  if (!confirm(`Remove "${displayName}" from this competition?`)) return;

  const { error } = await supabase
    .from('competition_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    showToast('Failed to remove member', true);
    return;
  }

  currentCompetition.members = currentCompetition.members.filter(m => m.id !== memberId);
  _renderSettingsMembers();
  showToast(`${displayName} removed`);
}

async function toggleArchive() {
  const newState = !currentCompetition.is_archived;
  const btn = document.getElementById('settings-archive-btn');
  btn.disabled = true;

  const { error } = await supabase
    .from('competitions')
    .update({ is_archived: newState })
    .eq('id', currentCompetition.id);

  if (error) {
    showToast('Failed to update', true);
    btn.disabled = false;
    return;
  }

  currentCompetition.is_archived = newState;
  btn.textContent = newState ? 'UNARCHIVE SEASON' : 'ARCHIVE SEASON';
  btn.disabled = false;
  showToast(newState ? 'Season archived' : 'Season unarchived');
}
