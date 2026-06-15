// ── Auth helpers ─────────────────────────────────────────────────────────────
function getCaretakerSession() {
  try {
    return JSON.parse(
      localStorage.getItem('auth_session') ||
      sessionStorage.getItem('auth_session') ||
      'null'
    );
  } catch { return null; }
}

function getStorageKey() {
  const s = getCaretakerSession();
  return 'objects_' + (s ? s.username : '');
}

function getAllAppUsers() {
  try { return JSON.parse(localStorage.getItem('auth_users')) || []; }
  catch { return []; }
}

function saveAllAppUsers(users) {
  localStorage.setItem('auth_users', JSON.stringify(users));
}

function getMyAddedUsers() {
  const session = getCaretakerSession();
  if (!session) return [];
  return getAllAppUsers().filter(u => u.assignedTo === session.username);
}

// ── Hash-based tab routing ────────────────────────────────────────────────────
function switchDashTab(tab) {
  const isObjects = tab === 'objects';
  document.getElementById('panel-objects').style.display = isObjects ? '' : 'none';
  document.getElementById('panel-users').style.display   = isObjects ? 'none' : 'block';
  const h1 = document.querySelector('header h1');
  if (h1) h1.textContent = isObjects ? 'My Objects' : 'Users';
  // Keep bottom tab bar in sync
  document.querySelectorAll('#ct-tab-bar .ct-tab').forEach(a => {
    const href = a.getAttribute('href') || '';
    const active = isObjects ? href === 'caretaker.html' : href === 'caretaker.html#users';
    a.classList.toggle('active', active);
    a.setAttribute('aria-current', active ? 'page' : 'false');
  });
  if (!isObjects) renderUserDashboard();
}

window.addEventListener('hashchange', () => {
  switchDashTab(location.hash === '#users' ? 'users' : 'objects');
});

// ── User dashboard ────────────────────────────────────────────────────────────
function renderUserDashboard() {
  const udContainer = document.getElementById('user-dashboard-container');
  const session = getCaretakerSession();
  const myUsername = (session ? session.username : '').toLowerCase();
  const allUsers = getAllAppUsers();

  // Users who listed me as caretaker OR are already added to me
  const visible = allUsers.filter(u =>
    (u.caretakerName || '').toLowerCase() === myUsername ||
    u.assignedTo === session.username
  );

  udContainer.innerHTML = '';

  if (visible.length === 0) {
    udContainer.innerHTML = `
      <div style="padding:48px 24px;text-align:center;">
        <p style="font-size:17px;color:var(--muted);margin-bottom:8px;">${window.ctTranslations?.noUsers || 'No users yet.'}</p>
        <p style="font-size:14px;color:var(--muted);opacity:0.7;">${window.ctTranslations?.noUsersSubtext || 'Users who link your username during sign-up will appear here.'}</p>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'ud-grid';

  visible.forEach(u => {
    const card = document.createElement('div');
    card.className = 'ud-card';
    const isAdded = u.assignedTo === session.username;
    const displayName = u.name || u.username;

    card.innerHTML = `
      <div class="ud-card-top">
        <div class="ud-user-info">
          <div class="ud-name">${displayName}</div>
          <div class="ud-username">@${u.username}</div>
        </div>
        ${isAdded ? `<button class="ud-remove-x" onclick="confirmRemoveUser('${u.username}')" aria-label="Remove user">✕</button>` : ''}
      </div>
      ${isAdded
        ? `<div class="ud-added-badge">Added</div>`
        : `<button class="ud-add-btn" onclick="addUser('${u.username}')">Add User</button>`
      }
    `;
    grid.appendChild(card);
  });

  udContainer.appendChild(grid);
}

// ── Add / Remove user ─────────────────────────────────────────────────────────
function addUser(username) {
  const session = getCaretakerSession();
  if (!session) return;
  const users = getAllAppUsers();
  const user = users.find(u => u.username === username);
  if (user) {
    user.assigned   = true;
    user.assignedTo = session.username;
    user.role       = 'user';
    saveAllAppUsers(users);
    renderUserDashboard();
    populateAssignDropdown(document.getElementById('obj-assign-select'));
  }
}

let confirmPendingUser = null;

function confirmRemoveUser(username) {
  confirmPendingUser = username;
  document.getElementById('confirm-username').textContent = username;
  document.getElementById('confirm-overlay').style.display = 'flex';
}

document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
  document.getElementById('confirm-overlay').style.display = 'none';
  confirmPendingUser = null;
});

document.getElementById('confirm-remove-btn').addEventListener('click', () => {
  if (confirmPendingUser) {
    const users = getAllAppUsers();
    const user = users.find(u => u.username === confirmPendingUser);
    if (user) { user.assigned = false; user.assignedTo = ''; saveAllAppUsers(users); }
    renderUserDashboard();
    populateAssignDropdown(document.getElementById('obj-assign-select'));
  }
  document.getElementById('confirm-overlay').style.display = 'none';
  confirmPendingUser = null;
});

document.getElementById('confirm-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('confirm-overlay')) {
    document.getElementById('confirm-overlay').style.display = 'none';
    confirmPendingUser = null;
  }
});

// ── Assign dropdown helper ────────────────────────────────────────────────────
function populateAssignDropdown(select, currentValue) {
  if (!select) return;
  const prev = currentValue !== undefined ? currentValue : select.value;
  select.innerHTML = '<option value="everyone">Everyone</option>';
  getMyAddedUsers().forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.username;
    opt.textContent = u.name || u.username;
    select.appendChild(opt);
  });
  if (prev) select.value = prev;
}

// ── Object storage ────────────────────────────────────────────────────────────
function loadObjects() {
  try { return JSON.parse(localStorage.getItem(getStorageKey())) || []; }
  catch { return []; }
}

function saveObjects() {
  localStorage.setItem(getStorageKey(), JSON.stringify(objects));
}

let objects = loadObjects();
let editingIndex = null;

const container    = document.getElementById('object-container');
const viewPopup    = document.getElementById('view-popup');
const popupName    = document.getElementById('popup-obj-name');
const popupInstr   = document.getElementById('popup-obj-instr');
const closeView    = document.getElementById('close-view');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const inputName    = document.getElementById('input-name');
const inputInstr   = document.getElementById('input-instr');
const modalCancel  = document.getElementById('modal-cancel');
const modalSave    = document.getElementById('modal-save');

function renderCards() {
  container.innerHTML = '';

  // ── Scanner card — always first ──
  const scanCard = document.createElement('div');
  scanCard.classList.add('object-card', 'add-object-card');
  scanCard.innerHTML = `<button class="btn-view">${window.ctTranslations?.addObject || '+ Add Object'}</button>`;
  scanCard.addEventListener('click', () => window.location.href = 'scanner.html');
  container.appendChild(scanCard);

  if (objects.length === 0) {
    const msg = document.createElement('p');
    msg.classList.add('warning');
    msg.textContent = window.ctTranslations?.noObjects || 'No objects yet. Use the scanner to add one.';
    container.appendChild(msg);
    return;
  }

  objects.forEach((obj, i) => {
    const card = document.createElement('div');
    card.classList.add('object-card');

    const title = document.createElement('rh1');
    title.textContent = obj.name;
    const lang = localStorage.getItem('caretaker_lang') || 'en';
    if (lang !== 'en') {
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(obj.name)}`)
        .then(r => r.json())
        .then(data => { title.textContent = data[0].map(x => x[0]).join('') || obj.name; })
        .catch(() => { });
    }

    // Assign badge
    const assignBadge = document.createElement('div');
    assignBadge.className = 'obj-assign-badge';
    assignBadge.textContent = (!obj.assignedTo || obj.assignedTo === 'everyone')
      ? 'Everyone'
      : obj.assignedTo;

    const btnGroup = document.createElement('div');
    btnGroup.classList.add('card-btns');

    const viewBtn = document.createElement('button');
    viewBtn.classList.add('btn-view');
    viewBtn.textContent = window.ctTranslations?.view || 'VIEW INSTRUCTIONS';

    const changeBtn = document.createElement('button');
    changeBtn.classList.add('btn-change');
    changeBtn.textContent = window.ctTranslations?.change || 'EDIT INSTRUCTIONS';

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-delete');
    deleteBtn.textContent = window.ctTranslations?.delete || 'DELETE';

    const editDeleteRow = document.createElement('div');
    editDeleteRow.classList.add('card-btns-row');
    editDeleteRow.appendChild(changeBtn);
    editDeleteRow.appendChild(deleteBtn);
    btnGroup.appendChild(viewBtn);
    btnGroup.appendChild(editDeleteRow);

    const photos = JSON.parse(localStorage.getItem('scanner-photos') || '{}');
    const photo = photos[obj.name.toLowerCase()];
    const photoEl = photo ? Object.assign(document.createElement('img'), {
      src: photo, alt: obj.name, className: 'card-photo'
    }) : null;

    card.appendChild(title);
    card.appendChild(assignBadge);
    if (photoEl) card.appendChild(photoEl);
    card.appendChild(btnGroup);
    container.appendChild(card);

    viewBtn.addEventListener('click', () => {
      popupName.textContent  = obj.name;
      popupInstr.textContent = obj.instructions || 'No instructions added.';
      viewPopup.classList.add('show');
    });

    changeBtn.addEventListener('click', () => openModal(i));

    deleteBtn.addEventListener('click', () => {
      objects.splice(i, 1);
      saveObjects();
      renderCards();
    });
  });
}

closeView.addEventListener('click', () => viewPopup.classList.remove('show'));
viewPopup.addEventListener('click', e => {
  if (e.target === viewPopup) viewPopup.classList.remove('show');
});

function openModal(index = null) {
  editingIndex = index;
  const assignSelect = document.getElementById('obj-assign-select');
  populateAssignDropdown(assignSelect);

  if (index !== null) {
    modalTitle.textContent  = window.ctTranslations?.editObjectModal || 'Edit Object';
    inputName.value         = objects[index].name;
    inputInstr.value        = objects[index].instructions;
    assignSelect.value      = objects[index].assignedTo || 'everyone';
  } else {
    modalTitle.textContent  = window.ctTranslations?.addObjectModal || 'Add Object';
    inputName.value         = '';
    inputInstr.value        = '';
    assignSelect.value      = 'everyone';
  }
  modalOverlay.classList.add('show');
  inputName.focus();
}

function closeModal() {
  modalOverlay.classList.remove('show');
  editingIndex = null;
}

modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

modalSave.addEventListener('click', () => {
  const name       = inputName.value.trim();
  const instr      = inputInstr.value.trim();
  const assignedTo = document.getElementById('obj-assign-select').value || 'everyone';
  if (!name) { inputName.focus(); return; }

  if (editingIndex !== null) {
    objects[editingIndex] = { name, instructions: instr, assignedTo };
  } else {
    objects.push({ name, instructions: instr, assignedTo });
  }

  saveObjects();
  renderCards();
  closeModal();
});

inputName.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); inputInstr.focus(); }
});
inputInstr.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) modalSave.click();
});

const SPEECH_LANG_MAP = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  pt: 'pt-PT', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', ar: 'ar-SA',
  hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', ur: 'ur-PK',
  ru: 'ru-RU', tr: 'tr-TR', vi: 'vi-VN', th: 'th-TH', pl: 'pl-PL',
  nl: 'nl-NL', sv: 'sv-SE', ro: 'ro-RO', el: 'el-GR', he: 'he-IL',
  fa: 'fa-IR', sw: 'sw-KE', tl: 'fil-PH', ms: 'ms-MY', id: 'id-ID',
};

function getSpeechLang() {
  const code = localStorage.getItem('caretaker_lang') || 'en';
  return SPEECH_LANG_MAP[code] || 'en-US';
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (err) {
    if (err && err.name === 'NotAllowedError') {
      alert('Microphone access was denied. Please allow it in your browser settings.');
    } else {
      alert('Could not access the microphone: ' + (err && err.message ? err.message : err));
    }
    return false;
  }
}

function setupMic(btnId, targetInput) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.title = 'Speech recognition not supported in this browser';
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    return;
  }

  const INITIAL_TIMEOUT_MS = 4000;
  const SILENCE_TIMEOUT_MS = 3000;

  let activeRecognition = null;
  let silenceTimer = null;
  let baseText = '';
  let finalText = '';

  function clearSilenceTimer() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  }

  function scheduleSilenceTimeout(ms) {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (activeRecognition) { stopVisuals(); try { activeRecognition.stop(); } catch (_) { } }
    }, ms);
  }

  function stopVisuals() {
    btn.classList.remove('listening');
    btn.classList.remove('speaking');
  }

  btn.addEventListener('click', async () => {
    if (activeRecognition) { stopVisuals(); try { activeRecognition.stop(); } catch (_) { } return; }
    const ok = await ensureMicPermission();
    if (!ok) return;
    btn.classList.add('listening');
    const existing = targetInput.value.trim();
    baseText = existing ? existing + ' ' : '';
    finalText = '';
    const r = new SpeechRecognition();
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    r.lang = getSpeechLang();
    r.addEventListener('start', () => { scheduleSilenceTimeout(INITIAL_TIMEOUT_MS); });
    r.addEventListener('speechstart', () => btn.classList.add('speaking'));
    r.addEventListener('speechend',   () => btn.classList.remove('speaking'));
    r.addEventListener('result', (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      targetInput.value = (baseText + finalText + interim).trim();
      scheduleSilenceTimeout(SILENCE_TIMEOUT_MS);
    });
    r.addEventListener('end', () => { activeRecognition = null; stopVisuals(); clearSilenceTimer(); });
    r.addEventListener('error', (ev) => {
      activeRecognition = null; stopVisuals(); clearSilenceTimer();
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') alert('Microphone access was denied.');
      else if (ev.error === 'language-not-supported') alert('Speech recognition not supported for this language.');
      else if (ev.error === 'audio-capture') alert('No microphone found.');
      else if (ev.error === 'network') alert('Speech recognition needs a network connection.');
    });
    activeRecognition = r;
    try { r.start(); } catch (err) {
      activeRecognition = null; stopVisuals(); clearSilenceTimer();
      alert('Could not start speech recognition: ' + (err && err.message ? err.message : err));
    }
  });
}

setupMic('mic-name', document.getElementById('input-name'));
setupMic('mic-instr', document.getElementById('input-instr'));

// ── Init ──────────────────────────────────────────────────────────────────────
renderCards();
if (location.hash === '#users') switchDashTab('users');
