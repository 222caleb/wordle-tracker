const ADMIN_EMAILS = ['maxaustin1244@gmail.com'];

// --- Admin state ---
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;
  setAdminState(email && ADMIN_EMAILS.includes(email));
}

function setAdminState(val) {
  isAdmin = val;
  document.getElementById('admin-badge').classList.toggle('visible', val);
  document.getElementById('logout-btn').classList.toggle('visible', val);
  renderHistory();
}

// --- Admin modal (email + password, accessed via #admin hash) ---
async function adminLogin() {
  const email    = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errEl    = document.getElementById('login-error');
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

// --- Magic link auth (all users) ---

function showAuthOverlay() {
  resetAuthForm();
  document.getElementById('auth-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
}

function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function resetAuthForm() {
  document.getElementById('auth-form-section').style.display = '';
  document.getElementById('auth-sent-section').style.display = 'none';
  const emailEl = document.getElementById('auth-email');
  if (emailEl) emailEl.value = '';
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.textContent = '';
  const btn = document.getElementById('auth-send-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'SEND LOGIN LINK'; }
}

async function submitMagicLink() {
  const email = document.getElementById('auth-email').value.trim();
  const errEl = document.getElementById('auth-error');
  if (!email) { errEl.textContent = 'Enter your email address'; return; }

  errEl.textContent = '';
  const btn = document.getElementById('auth-send-btn');
  btn.disabled = true;
  btn.textContent = 'SENDING...';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'SEND LOGIN LINK';
    errEl.textContent = error.message;
    return;
  }

  document.getElementById('auth-form-section').style.display = 'none';
  document.getElementById('auth-sent-section').style.display = '';
  document.getElementById('auth-sent-email').textContent = email;
}

// --- Auth state listener ---
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    hideAuthOverlay();
    const email = session?.user?.email;
    setAdminState(email && ADMIN_EMAILS.includes(email));

    // Only boot the app if competition isn't loaded yet
    if (!currentCompetition) {
      loadCompetition().then(comp => {
        if (comp) initAppUI();
        else showLanding();
      });
    }
  } else if (event === 'SIGNED_OUT') {
    currentCompetition = null;
    currentPlayer      = null;
    allScores          = [];
    _celebrationChecked = false;
    if (scoresChannel) {
      supabase.removeChannel(scoresChannel);
      scoresChannel = null;
    }
    setAdminState(false);
    showAuthOverlay();
  }
});
