(async function () {
  const THEMES = [
    { id: '',            name: 'Navy',       top: '#1e3060', bot: '#f0b830' },
    { id: 'watermelon',  name: 'Watermelon', top: '#3d7848', bot: '#f04898' },
    { id: 'rose',        name: 'Rose',       top: '#8a1258', bot: '#ffaad6' },
    { id: 'ocean',       name: 'Ocean',      top: '#1a6870', bot: '#cfe8ef' },
    { id: 'sunset',      name: 'Sunset',     top: '#c0128a', bot: '#ffa028' },
    { id: 'sage',        name: 'Sage',       top: '#2e5a3a', bot: '#d4f0c0' },
    { id: 'grape',       name: 'Grape',      top: '#57467b', bot: '#ea7af4' },
    { id: 'calm',        name: 'Calm',       top: '#4a4858', bot: '#c4cad0' },
  ];

  const LANGS = [
    ['en','English'],['es','Spanish'],['fr','French'],['de','German'],['it','Italian'],
    ['pt','Portuguese'],['zh','Chinese'],['ja','Japanese'],['ko','Korean'],['ar','Arabic'],
    ['hi','Hindi'],['ta','Tamil'],['te','Telugu'],['bn','Bengali'],['ur','Urdu'],
    ['ru','Russian'],['tr','Turkish'],['vi','Vietnamese'],['th','Thai'],['pl','Polish'],
    ['nl','Dutch'],['sv','Swedish'],['ro','Romanian'],['el','Greek'],['he','Hebrew'],
    ['fa','Persian'],['sw','Swahili'],['tl','Filipino'],['ms','Malay'],['id','Indonesian'],
  ];

  function getSession() {
    try { return JSON.parse(localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session') || 'null'); }
    catch { return null; }
  }

  function saveSession(updated) {
    const data = JSON.stringify(updated);
    if (localStorage.getItem('auth_session')) localStorage.setItem('auth_session', data);
    else sessionStorage.setItem('auth_session', data);
  }

  function getUsers() { try { return JSON.parse(localStorage.getItem('auth_users')) || []; } catch { return []; } }
  function saveUsers(u) { localStorage.setItem('auth_users', JSON.stringify(u)); }

  function doLogout() {
    localStorage.removeItem('auth_session');
    sessionStorage.removeItem('auth_session');
    window.location.href = 'home.html';
  }

  function applyTheme(id) {
    document.documentElement.dataset.theme = id;
    localStorage.setItem('app-theme', id);
    document.querySelectorAll('.sp-swatch').forEach(s =>
      s.classList.toggle('sp-active', s.dataset.theme === id)
    );
  }

  const langOptions = LANGS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  // ── Styles ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #sp-btn {
      position: fixed;
      top: calc(12px + env(safe-area-inset-top));
      left: 12px; z-index: 600;
      width: 42px; height: 42px;
      background: var(--navy); color: var(--accent);
      border: none; border-radius: 11px;
      font-size: 22px; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);
      transition: background 0.15s;
      -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    }
    #sp-btn:hover { background: var(--navy-mid); }

    #sp-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); z-index: 598;
    }
    #sp-overlay.sp-open { display: block; }

    #sp-panel {
      position: fixed; top: 0; left: 0;
      width: 300px; max-width: 88vw; height: 100dvh;
      background: var(--surface); z-index: 599;
      transform: translateX(-100%);
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
      display: flex; flex-direction: column;
      box-shadow: 6px 0 32px rgba(0,0,0,0.2);
      overflow-y: auto;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }
    #sp-panel.sp-open { transform: translateX(0); }

    #sp-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 15px 16px; background: var(--navy); flex-shrink: 0;
    }
    #sp-head-title { font-size: 17px; font-weight: 800; color: var(--accent); letter-spacing: 0.04em; font-family: var(--font, system-ui); }
    #sp-head-close {
      background: rgba(255,255,255,0.1); border: none; border-radius: 8px;
      width: 32px; height: 32px; color: rgba(255,255,255,0.75); font-size: 17px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    #sp-head-close:hover { background: rgba(255,255,255,0.2); color: #fff; }

    #sp-body { padding: 16px; display: flex; flex-direction: column; gap: 18px; flex: 1; }

    .sp-user-card {
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .sp-user-name  { font-size: 15px; font-weight: 700; color: var(--text); }
    .sp-user-sub   { font-size: 12px; color: var(--muted); }
    .sp-edit-btn {
      margin-top: 8px; width: 100%; padding: 9px;
      font-size: 13px; font-weight: 700;
      background: var(--bg); color: var(--navy);
      border: 1.5px solid var(--border);
      border-radius: 9px; cursor: pointer; font-family: var(--font, system-ui);
      transition: background 0.15s;
    }
    .sp-edit-btn:hover { background: var(--border); }

    .sp-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }

    .sp-swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 4px; }
    .sp-swatch {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      background: none; border: none; cursor: pointer; padding: 3px;
      -webkit-tap-highlight-color: transparent;
    }
    .sp-circle {
      width: 46px; height: 46px; border-radius: 50%;
      position: relative; overflow: hidden;
      border: 3px solid rgba(255,255,255,0.8);
      box-shadow: 0 0 0 1.5px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.15);
      transition: box-shadow 0.15s;
    }
    .sp-circle::before, .sp-circle::after { content: ''; position: absolute; left: 0; right: 0; }
    .sp-circle::before { top: 0; height: 55%; }
    .sp-circle::after  { bottom: 0; height: 45%; }
    .sp-swatch.sp-active .sp-circle {
      border-color: var(--navy);
      box-shadow: 0 0 0 2.5px var(--navy), 0 2px 8px rgba(0,0,0,0.2);
    }
    .sp-name { font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--font, system-ui); }
    .sp-swatch.sp-active .sp-name { color: var(--navy); font-weight: 800; }

    /* Language selectors in panel */
    .sp-lang-group { display: flex; flex-direction: column; gap: 5px; }
    .sp-lang-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .sp-lang-select {
      width: 100%; padding: 9px 12px; font-size: 14px; font-family: var(--font, system-ui);
      background: var(--bg); color: var(--text);
      border: 1.5px solid var(--border); border-radius: 9px;
      cursor: pointer; outline: none; transition: border-color 0.15s;
    }
    .sp-lang-select:focus { border-color: var(--navy); }

    .sp-divider { height: 1px; background: var(--border); }

    #sp-logout {
      width: 100%; padding: 13px; font-size: 15px; font-weight: 700;
      background: #fef2f2; color: #b91c1c;
      border: 1.5px solid #fecaca; border-radius: 12px;
      cursor: pointer; font-family: var(--font, system-ui); transition: background 0.15s;
    }
    #sp-logout:hover { background: #fee2e2; }

    /* Edit profile modal */
    #sp-edit-modal {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(3px);
      z-index: 700; align-items: center; justify-content: center; padding: 20px;
    }
    #sp-edit-modal.open { display: flex; }
    #sp-edit-box {
      background: var(--surface); border-radius: 20px; padding: 28px 24px;
      width: 100%; max-width: 380px;
      display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2); position: relative;
    }
    #sp-edit-box h3 { font-size: 18px; font-weight: 700; color: var(--navy); }
    .sp-ef { display: flex; flex-direction: column; gap: 5px; }
    .sp-ef label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }
    .sp-ef input {
      padding: 11px 14px; font-size: 15px; font-family: var(--font, system-ui);
      background: var(--bg); border: 1.5px solid var(--border);
      border-radius: 10px; color: var(--text); outline: none;
      transition: border-color 0.15s;
    }
    .sp-ef input:focus { border-color: var(--navy); background: var(--surface); }
    .sp-phone-row { display: flex; gap: 8px; }
    .sp-phone-country { flex: 0 0 42%; }
    .sp-phone-row input { flex: 1; min-width: 0; }
    .sp-ef select {
      padding: 11px 14px; font-size: 15px; font-family: var(--font, system-ui);
      background: var(--bg); border: 1.5px solid var(--border);
      border-radius: 10px; color: var(--text); outline: none;
      transition: border-color 0.15s;
    }
    .sp-ef select:focus { border-color: var(--navy); background: var(--surface); }
    .sp-msg.sp-error { color: #b91c1c; }
    .sp-edit-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .sp-save-btn {
      padding: 11px 24px; font-size: 14px; font-weight: 700;
      background: var(--navy); color: var(--accent);
      border: none; border-radius: 10px; cursor: pointer; font-family: var(--font, system-ui);
    }
    .sp-cancel-btn {
      padding: 11px 20px; font-size: 14px; font-weight: 500;
      background: var(--bg); color: var(--muted);
      border: none; border-radius: 10px; cursor: pointer; font-family: var(--font, system-ui);
    }
    .sp-msg { font-size: 13px; color: #15803d; display: none; font-weight: 600; text-align: center; }
    .sp-msg.show { display: block; }
    #sp-edit-close {
      position: absolute; top: 14px; right: 14px;
      background: var(--bg); border: none; border-radius: 50%;
      width: 32px; height: 32px; font-size: 18px; color: var(--muted);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    #sp-edit-close:hover { background: var(--border); }

    /* Logout confirm modal */
    #sp-logout-modal {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(3px);
      z-index: 800; align-items: center; justify-content: center; padding: 20px;
    }
    #sp-logout-modal.open { display: flex; }
    #sp-logout-box {
      background: var(--surface); border-radius: 20px; padding: 28px 24px;
      width: 100%; max-width: 340px;
      display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2); text-align: center;
    }
    #sp-logout-box h3 { font-size: 18px; font-weight: 700; color: var(--navy); }
    #sp-logout-box p  { font-size: 15px; color: var(--muted); line-height: 1.5; }
    #sp-logout-actions { display: flex; gap: 10px; }
    #sp-logout-confirm {
      flex: 1; padding: 13px; font-size: 15px; font-weight: 700;
      background: #b91c1c; color: #fff;
      border: none; border-radius: 12px; cursor: pointer; font-family: var(--font, system-ui);
      transition: opacity 0.15s;
    }
    #sp-logout-confirm:hover { opacity: 0.88; }
    #sp-logout-cancel {
      flex: 1; padding: 13px; font-size: 15px; font-weight: 600;
      background: var(--bg); color: var(--muted);
      border: none; border-radius: 12px; cursor: pointer; font-family: var(--font, system-ui);
    }
    #sp-logout-cancel:hover { background: var(--border); }
  `;

  const swatchStyle = document.createElement('style');
  swatchStyle.textContent = THEMES.map(t =>
    `.sp-swatch[data-theme="${t.id}"] .sp-circle::before{background:${t.top}}` +
    `.sp-swatch[data-theme="${t.id}"] .sp-circle::after{background:${t.bot}}`
  ).join('');

  document.head.appendChild(style);
  document.head.appendChild(swatchStyle);

  // ── Build DOM ─────────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'sp-btn'; btn.setAttribute('aria-label', 'Open menu'); btn.textContent = '≡';

  const overlay = document.createElement('div'); overlay.id = 'sp-overlay';

  const panel = document.createElement('div'); panel.id = 'sp-panel';

  const session   = getSession();
  const username  = session ? session.username : null;
  const name      = session ? (session.name  || '') : '';
  const phone     = session ? (session.phone || '') : '';
  const isUser    = session ? session.role === 'user' : false;
  let phoneDecrypted = '';
  if (phone) {
    phoneDecrypted = await decryptPhone(phone) || '';
    if (!phoneDecrypted && !phone.includes(':')) phoneDecrypted = phone;
  }
  const currentTheme = localStorage.getItem('app-theme') || '';
  const ctLang = localStorage.getItem('caretaker_lang') || 'en';
  const usLang = localStorage.getItem('user_lang') || 'en';

  const swatchesHTML = THEMES.map(t => `
    <button class="sp-swatch${t.id === currentTheme ? ' sp-active' : ''}" data-theme="${t.id}">
      <span class="sp-circle"></span>
      <span class="sp-name">${t.name}</span>
    </button>`).join('');

  const makeLangOpts = (selected) =>
    LANGS.map(([v, l]) => `<option value="${v}"${v === selected ? ' selected' : ''}>${l}</option>`).join('');

  panel.innerHTML = `
    <div id="sp-head">
      <span id="sp-head-title">A-TEN</span>
      <button id="sp-head-close" aria-label="Close">✕</button>
    </div>
    <div id="sp-body">
      ${username ? `
      <div class="sp-user-card">
        <span class="sp-user-name">${name || username}</span>
        ${phoneDecrypted ? `<span class="sp-user-sub">${formatFullPhone(phoneDecrypted)}</span>` : ''}
        <button class="sp-edit-btn" id="sp-open-edit">Edit Profile</button>
      </div>` : ''}

      <div>
        <p class="sp-label">Colour Scheme</p>
        <div class="sp-swatches">${swatchesHTML}</div>
      </div>

      <div class="sp-divider"></div>

      <div>
        <p class="sp-label">Languages</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="sp-lang-group">
            <label class="sp-lang-label">Caretaker</label>
            <select class="sp-lang-select" id="sp-ct-lang">${makeLangOpts(ctLang)}</select>
          </div>
          <div class="sp-lang-group">
            <label class="sp-lang-label">User</label>
            <select class="sp-lang-select" id="sp-us-lang">${makeLangOpts(usLang)}</select>
          </div>
        </div>
      </div>

      <div class="sp-divider"></div>
      <button id="sp-logout">Log Out</button>
    </div>`;

  // Edit profile modal
  const editModal = document.createElement('div');
  editModal.id = 'sp-edit-modal';
  editModal.innerHTML = `
    <div id="sp-edit-box">
      <button id="sp-edit-close">✕</button>
      <h3>Edit Profile</h3>
      <div class="sp-ef">
        <label>Full Name</label>
        <input type="text" id="sp-edit-name" value="${name}" placeholder="Your full name" />
      </div>
      ${isUser ? '' : `
      <div class="sp-ef">
        <label>Phone Number</label>
        <div class="sp-phone-row">
          <select class="sp-phone-country" id="sp-edit-country"></select>
          <input type="tel" id="sp-edit-phone" inputmode="numeric" />
        </div>
      </div>`}
      <p class="sp-msg sp-error" id="sp-edit-error"></p>
      <p class="sp-msg" id="sp-edit-msg">Saved!</p>
      <div class="sp-edit-actions">
        <button class="sp-cancel-btn" id="sp-edit-cancel">Cancel</button>
        <button class="sp-save-btn"   id="sp-edit-save">Save</button>
      </div>
    </div>`;

  // Logout confirm modal
  const logoutModal = document.createElement('div');
  logoutModal.id = 'sp-logout-modal';
  logoutModal.innerHTML = `
    <div id="sp-logout-box">
      <h3>Log Out?</h3>
      <p>Are you sure you want to log out?</p>
      <div id="sp-logout-actions">
        <button id="sp-logout-cancel">Cancel</button>
        <button id="sp-logout-confirm">Log Out</button>
      </div>
    </div>`;

  document.body.appendChild(btn);
  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  document.body.appendChild(editModal);
  document.body.appendChild(logoutModal);

  // ── Phone field ───────────────────────────────────────────────────────────
  const splitPhone = phoneDecrypted ? splitFullPhone(phoneDecrypted) : null;
  const editCountry = editModal.querySelector('#sp-edit-country');
  const editPhone   = editModal.querySelector('#sp-edit-phone');
  if (editCountry && editPhone) {
    setupPhoneInput(editCountry, editPhone, splitPhone ? splitPhone.iso : 'US');
    if (splitPhone) editPhone.value = formatPhoneDigits(splitPhone.digits);
  }

  // ── Toggle panel ──────────────────────────────────────────────────────────
  let open = false;
  function openPanel()  {
    open = true;
    panel.classList.add('sp-open');
    overlay.classList.add('sp-open');
    btn.style.display = 'none';   // hide hamburger so it doesn't cover the panel title
  }
  function closePanel() {
    open = false;
    panel.classList.remove('sp-open');
    overlay.classList.remove('sp-open');
    btn.style.display = '';       // show hamburger again
  }

  btn.addEventListener('click', () => open ? closePanel() : openPanel());
  overlay.addEventListener('click', closePanel);
  panel.querySelector('#sp-head-close').addEventListener('click', closePanel);

  // ── Themes ────────────────────────────────────────────────────────────────
  panel.querySelectorAll('.sp-swatch').forEach(s =>
    s.addEventListener('click', () => applyTheme(s.dataset.theme))
  );

  // ── Languages ────────────────────────────────────────────────────────────
  function triggerTranslation() {
    const ct = localStorage.getItem('caretaker_lang') || 'en';
    const us = localStorage.getItem('user_lang') || 'en';
    if (typeof translatePage === 'function') translatePage(ct, us);
    else if (typeof initTranslations === 'function') initTranslations();
    else if (typeof translateDashboard === 'function') translateDashboard(ct);
    // Update tab bar immediately — no reload needed
    if (typeof window.applyTabTranslations === 'function') window.applyTabTranslations(ct);
  }

  panel.querySelector('#sp-ct-lang').addEventListener('change', e => {
    localStorage.setItem('caretaker_lang', e.target.value);
    triggerTranslation();
  });
  panel.querySelector('#sp-us-lang').addEventListener('change', e => {
    localStorage.setItem('user_lang', e.target.value);
    triggerTranslation();
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  panel.querySelector('#sp-logout').addEventListener('click', () => {
    closePanel();
    logoutModal.classList.add('open');
  });
  logoutModal.querySelector('#sp-logout-confirm').addEventListener('click', doLogout);
  logoutModal.querySelector('#sp-logout-cancel').addEventListener('click',  () => logoutModal.classList.remove('open'));
  logoutModal.addEventListener('click', e => { if (e.target === logoutModal) logoutModal.classList.remove('open'); });

  // ── Edit profile ─────────────────────────────────────────────────────────
  if (username) {
    panel.querySelector('#sp-open-edit').addEventListener('click', () => {
      editModal.classList.add('open');
      closePanel();
    });
  }

  editModal.querySelector('#sp-edit-close').addEventListener('click',  () => editModal.classList.remove('open'));
  editModal.querySelector('#sp-edit-cancel').addEventListener('click', () => editModal.classList.remove('open'));
  editModal.addEventListener('click', e => { if (e.target === editModal) editModal.classList.remove('open'); });

  editModal.querySelector('#sp-edit-save').addEventListener('click', async () => {
    const errEl = editModal.querySelector('#sp-edit-error');
    errEl.classList.remove('show');

    if (!isUser && !isPhoneValid(editCountry, editPhone)) {
      const country = getPhoneCountry(editCountry.value);
      errEl.textContent = `Enter a valid ${country.digits}-digit phone number for ${country.name}.`;
      errEl.classList.add('show');
      return;
    }

    const newName = editModal.querySelector('#sp-edit-name').value.trim();
    const s = getSession();
    if (s) {
      s.name = newName;
      let fullPhone = '';
      if (!isUser) {
        fullPhone = getFullPhone(editCountry, editPhone);
        s.phone = await encryptPhone(fullPhone);
      }
      saveSession(s);
      // also update the stored user record
      const users = getUsers();
      const u = users.find(x => x.username === s.username);
      if (u) { u.name = newName; if (!isUser) u.phone = s.phone; saveUsers(users); }
      // update displayed info
      const nameEl = panel.querySelector('.sp-user-name');
      const subEl  = panel.querySelector('.sp-user-sub');
      if (nameEl) nameEl.textContent = newName || s.username;
      if (subEl)  subEl.textContent  = formatFullPhone(fullPhone);
    }
    const msg = editModal.querySelector('#sp-edit-msg');
    msg.classList.add('show');
    setTimeout(() => { msg.classList.remove('show'); editModal.classList.remove('open'); }, 1200);
  });
})();
