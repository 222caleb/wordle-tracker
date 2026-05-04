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

// --- Email + password auth (all users) ---

let _authMode = 'signin';

function showAuthOverlay() {
  _authMode = 'signin';
  _renderAuthForm();
  document.getElementById('auth-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
}

function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function toggleAuthMode() {
  _authMode = _authMode === 'signin' ? 'signup' : 'signin';
  _renderAuthForm();
  setTimeout(() => document.getElementById('auth-email')?.focus(), 50);
}

function _renderAuthForm() {
  const isSignUp = _authMode === 'signup';
  document.getElementById('auth-form-section').style.display = '';
  document.getElementById('auth-sent-section').style.display = 'none';
  document.getElementById('auth-title').textContent = isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN';
  document.getElementById('auth-password-confirm-row').style.display = isSignUp ? '' : 'none';
  const btn = document.getElementById('auth-submit-btn');
  btn.textContent = isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN';
  btn.disabled = false;
  document.getElementById('auth-toggle-text').innerHTML = isSignUp
    ? 'Already have an account? <button class="auth-toggle-btn" onclick="toggleAuthMode()">Sign in</button>'
    : 'New here? <button class="auth-toggle-btn" onclick="toggleAuthMode()">Create an account</button>';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  const confirm = document.getElementById('auth-password-confirm');
  if (confirm) confirm.value = '';
  document.getElementById('auth-error').textContent = '';
}

async function submitAuth() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');

  if (!email)    { errEl.textContent = 'Enter your email address'; return; }
  if (!password) { errEl.textContent = 'Enter your password'; return; }

  const btn = document.getElementById('auth-submit-btn');

  if (_authMode === 'signup') {
    const confirm = document.getElementById('auth-password-confirm').value;
    if (password !== confirm)  { errEl.textContent = 'Passwords don\'t match'; return; }
    if (password.length < 6)   { errEl.textContent = 'Password must be at least 6 characters'; return; }

    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'CREATING...';

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });

    if (error) {
      errEl.textContent = error.message;
      btn.disabled = false;
      btn.textContent = 'CREATE ACCOUNT';
      return;
    }

    document.getElementById('auth-form-section').style.display = 'none';
    document.getElementById('auth-sent-section').style.display = '';
    document.getElementById('auth-sent-email').textContent = email;

  } else {
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'SIGNING IN...';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errEl.textContent = error.message === 'Invalid login credentials'
        ? 'Incorrect email or password'
        : error.message;
      btn.disabled = false;
      btn.textContent = 'SIGN IN';
      return;
    }
    // onAuthStateChange handles the rest
  }
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
