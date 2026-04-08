// --- Data ---
function loadData() { return allScores; }

async function fetchScores() {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('id', { ascending: false });
  if (!error) {
    allScores = data || [];
    renderAll();
  }
}

function subscribeToScores() {
  if (scoresChannel) return;
  scoresChannel = supabase
    .channel('scores-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => fetchScores())
    .subscribe();
}

// --- Parse ---
function parseWordle(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const headerMatch = trimmed.match(/Wordle\s+([\d,]+)\s+(\d+|X)\/6/i);
  if (!headerMatch) return null;
  const puzzleNum = headerMatch[1].replace(/,/g, '');
  const score = headerMatch[2] === 'X' ? 'X' : parseInt(headerMatch[2], 10);
  return { puzzleNum, score };
}

document.getElementById('submit-text').addEventListener('input', function() {
  const r = parseWordle(this.value);
  const el = document.getElementById('parse-preview');
  if (r) {
    el.textContent = r.score === 'X'
      ? `Wordle #${r.puzzleNum} · Score: X (failed)`
      : `Wordle #${r.puzzleNum} · Score: ${r.score}/6`;
    el.style.color = 'var(--green)';
  } else if (this.value.trim()) {
    el.textContent = 'Could not parse — make sure you paste the full Wordle share text';
    el.style.color = '#e67e22';
  } else {
    el.textContent = '';
  }
});
