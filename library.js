/* ============================================================
   library.js — Library page: shelf + panel management
   ============================================================ */

const _libSb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

(async () => {
  const { data: { session } } = await _libSb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
})();

startBackground();

document.getElementById('btnBack').addEventListener('click', () => {
  window.location.href = 'menu.html';
});

// ── State ─────────────────────────────────────────────────────

let libShelves = [];
let libPanels  = [];

// ── Data loading ──────────────────────────────────────────────

async function loadData() {
  const { data: { user } } = await _libSb.auth.getUser();
  if (!user) return;

  const [{ data: shelfData }, { data: panelData }] = await Promise.all([
    _libSb.from('shelves').select('*').eq('user_id', user.id).order('created_at'),
    _libSb.from('knowledge_panels').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);

  libShelves = shelfData || [];
  libPanels  = panelData || [];
}

// ── Render ────────────────────────────────────────────────────

function renderLibrary() {
  const content = document.getElementById('libContent');

  if (libPanels.length === 0 && libShelves.length === 0) {
    content.innerHTML = `
      <div class="lib-empty">
        <div class="lib-empty-icon">📚</div>
        <p>Your library is empty.<br>Create knowledge panels in Study Buddy and they'll appear here.</p>
      </div>`;
    return;
  }

  content.innerHTML = '';

  // Render each shelf section
  libShelves.forEach(shelf => {
    const shelfPanels = libPanels.filter(p => p.shelf_id === shelf.id);
    content.appendChild(buildShelfSection(shelf, shelfPanels));
  });

  // Render unsorted section
  const unsorted = libPanels.filter(p => !p.shelf_id);
  if (unsorted.length > 0 || libPanels.length === 0) {
    content.appendChild(buildUnsortedSection(unsorted));
  }
}

function buildShelfSection(shelf, shelfPanels) {
  const section = document.createElement('div');
  section.className = 'lib-section';

  const header = document.createElement('div');
  header.className = 'lib-section-header';
  header.innerHTML = `
    <span class="lib-shelf-icon">📚</span>
    <span class="lib-shelf-name">${escLib(shelf.name)}</span>
    <span class="lib-shelf-count">${shelfPanels.length} panel${shelfPanels.length !== 1 ? 's' : ''}</span>
    <div class="lib-shelf-actions">
      <button class="lib-icon-btn lib-rename-shelf" title="Rename shelf">✎ Rename</button>
      <button class="lib-icon-btn lib-delete-shelf" title="Delete shelf">🗑 Delete</button>
    </div>
  `;

  // Rename
  header.querySelector('.lib-rename-shelf').addEventListener('click', () => {
    startRenameShelf(shelf, header.querySelector('.lib-shelf-name'));
  });

  // Delete
  header.querySelector('.lib-delete-shelf').addEventListener('click', () => {
    confirmDeleteShelf(shelf, shelfPanels.length);
  });

  const grid = document.createElement('div');
  grid.className = 'lib-grid';

  if (shelfPanels.length === 0) {
    grid.innerHTML = '<div class="lib-grid-empty">No panels yet — move some here using the dropdown on any card.</div>';
  } else {
    shelfPanels.forEach(p => grid.appendChild(buildPanelCard(p)));
  }

  section.appendChild(header);
  section.appendChild(grid);
  return section;
}

function buildUnsortedSection(unsorted) {
  const section = document.createElement('div');
  section.className = 'lib-section lib-section--unsorted';

  const header = document.createElement('div');
  header.className = 'lib-section-header';
  header.innerHTML = `
    <span class="lib-shelf-icon">📂</span>
    <span class="lib-shelf-name-plain">Unsorted</span>
    <span class="lib-shelf-count">${unsorted.length} panel${unsorted.length !== 1 ? 's' : ''}</span>
  `;

  const grid = document.createElement('div');
  grid.className = 'lib-grid';

  if (unsorted.length === 0) {
    grid.innerHTML = '<div class="lib-grid-empty">All panels are organised into shelves!</div>';
  } else {
    unsorted.forEach(p => grid.appendChild(buildPanelCard(p)));
  }

  section.appendChild(header);
  section.appendChild(grid);
  return section;
}

function buildPanelCard(panel) {
  const card = document.createElement('div');
  card.className = 'lib-card';

  const count    = panel.questions?.length || 0;
  const icon     = panel.type === 'flashcard' ? '🃏' : '📝';
  const typeLabel = panel.type === 'flashcard' ? 'Flashcards' : 'Quiz';
  const countLabel = panel.type === 'flashcard'
    ? `${count} card${count !== 1 ? 's' : ''}`
    : `${count} question${count !== 1 ? 's' : ''}`;

  const moveOptions = [
    `<option value="">📂 Unsorted</option>`,
    ...libShelves.map(s =>
      `<option value="${s.id}" ${panel.shelf_id === s.id ? 'selected' : ''}>📚 ${escLib(s.name)}</option>`)
  ].join('');

  card.innerHTML = `
    <div class="lib-card-top">
      <span class="lib-card-icon">${icon}</span>
      <span class="lib-card-type">${typeLabel}</span>
    </div>
    <div class="lib-card-name">${escLib(panel.name)}</div>
    <div class="lib-card-count">${countLabel}</div>
    <div class="lib-card-footer">
      <select class="lib-move-select" title="Move to shelf">${moveOptions}</select>
      <div class="lib-card-btns">
        <button class="lib-play-btn" title="Play">▶</button>
        <button class="lib-delete-btn" title="Delete panel">🗑</button>
      </div>
    </div>
  `;

  // Rename on name click
  card.querySelector('.lib-card-name').addEventListener('click', () => {
    startRenamePanel(panel, card.querySelector('.lib-card-name'));
  });

  // Move to shelf
  card.querySelector('.lib-move-select').addEventListener('change', async (e) => {
    await movePanelToShelf(panel.id, e.target.value || null);
    await refreshLibrary();
  });

  // Play
  card.querySelector('.lib-play-btn').addEventListener('click', () => openPlayer(panel));

  // Delete
  card.querySelector('.lib-delete-btn').addEventListener('click', () => confirmDeletePanel(panel));

  return card;
}

// ── Inline rename ─────────────────────────────────────────────

function startRenameShelf(shelf, nameEl) {
  const input = document.createElement('input');
  input.className = 'lib-rename-input';
  input.value = shelf.name;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  async function save() {
    const newName = input.value.trim();
    if (newName && newName !== shelf.name) {
      await renameShelf(shelf.id, newName);
    }
    await refreshLibrary();
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') refreshLibrary();
  });
}

function startRenamePanel(panel, nameEl) {
  const input = document.createElement('input');
  input.className = 'lib-rename-input--panel';
  input.value = panel.name;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  async function save() {
    const newName = input.value.trim();
    if (newName && newName !== panel.name) {
      await renamePanel(panel.id, newName);
    }
    await refreshLibrary();
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') refreshLibrary();
  });
}

// ── Confirm + delete ──────────────────────────────────────────

async function confirmDeleteShelf(shelf, panelCount) {
  const msg = panelCount > 0
    ? `Delete "${shelf.name}"? Its ${panelCount} panel${panelCount !== 1 ? 's' : ''} will move to Unsorted.`
    : `Delete shelf "${shelf.name}"?`;
  if (!confirm(msg)) return;
  await deleteShelf(shelf.id);
  await refreshLibrary();
}

async function confirmDeletePanel(panel) {
  if (!confirm(`Delete "${panel.name}"? This cannot be undone.`)) return;
  await deletePanel(panel.id);
  await refreshLibrary();
}

// ── New shelf ─────────────────────────────────────────────────

document.getElementById('btnNewShelf').addEventListener('click', showNewShelfInput);

function showNewShelfInput() {
  if (document.getElementById('newShelfRow')) {
    document.getElementById('newShelfInput').focus();
    return;
  }

  const row = document.createElement('div');
  row.className = 'lib-new-shelf-row';
  row.id = 'newShelfRow';
  row.innerHTML = `
    <input class="lib-new-shelf-input" id="newShelfInput" placeholder="Shelf name…" autocomplete="off" />
    <button class="lib-new-shelf-confirm" id="btnConfirmShelf">Create</button>
    <button class="lib-new-shelf-cancel" id="btnCancelShelf">✕</button>
  `;

  const content = document.getElementById('libContent');
  content.insertBefore(row, content.firstChild);
  document.getElementById('newShelfInput').focus();

  async function create() {
    const name = document.getElementById('newShelfInput').value.trim();
    if (!name) return;
    await createShelf(name);
    await refreshLibrary();
  }

  document.getElementById('btnConfirmShelf').addEventListener('click', create);
  document.getElementById('btnCancelShelf').addEventListener('click', refreshLibrary);
  document.getElementById('newShelfInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  create();
    if (e.key === 'Escape') refreshLibrary();
  });
}

// ── Supabase CRUD ─────────────────────────────────────────────

async function createShelf(name) {
  const { data: { user } } = await _libSb.auth.getUser();
  if (!user) return;
  await _libSb.from('shelves').insert({ user_id: user.id, name });
}

async function renameShelf(id, name) {
  await _libSb.from('shelves').update({ name }).eq('id', id);
}

async function deleteShelf(id) {
  await _libSb.from('shelves').delete().eq('id', id);
}

async function renamePanel(id, name) {
  await _libSb.from('knowledge_panels').update({ name }).eq('id', id);
}

async function movePanelToShelf(panelId, shelfId) {
  await _libSb.from('knowledge_panels').update({ shelf_id: shelfId }).eq('id', panelId);
}

async function deletePanel(id) {
  await _libSb.from('knowledge_panels').delete().eq('id', id);
}

// ── Helpers ───────────────────────────────────────────────────

function escLib(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function refreshLibrary() {
  await loadData();
  renderLibrary();
}

// ── Init ──────────────────────────────────────────────────────

(async () => {
  await loadData();
  renderLibrary();
  setTimeout(() => { document.getElementById('libPage').style.opacity = '1'; }, 120);
})();
