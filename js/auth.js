// --- Auth ---
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) setAdminState(true);
}

function setAdminState(val) {
  isAdmin = val;
  document.getElementById('admin-badge').classList.toggle('visible', val);
  document.getElementById('logout-btn').classList.toggle('visible', val);
  renderHistory();
}

async function adminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = 'Invalid email or password.'; return; }
  closeAdminModal();
  setAdminState(true);
  showToast('Logged in as admin');
}

async function adminLogout() {
  await supabase.auth.signOut();
  setAdminState(false);
  showToast('Logged out');
}

function openAdminModal() {
  document.getElementById('admin-modal').classList.add('visible');
  document.getElementById('admin-email').value = '';
  document.getElementById('admin-password').value = '';
  document.getElementById('login-error').textContent = '';
  setTimeout(() => document.getElementById('admin-email').focus(), 50);
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('visible');
}

document.getElementById('admin-modal').addEventListener('click', function(e) {
  if (e.target === this) closeAdminModal();
});

document.getElementById('admin-password').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') adminLogin();
});

function checkHash() {
  if (window.location.hash === '#admin') {
    if (!isAdmin) openAdminModal();
    history.replaceState(null, '', window.location.pathname);
  }
}
window.addEventListener('hashchange', checkHash);
