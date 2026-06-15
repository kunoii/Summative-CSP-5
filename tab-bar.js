(function () {
  localStorage.setItem('role', 'caretaker');

  const page = location.pathname.split('/').pop() || 'caretaker.html';

  const style = document.createElement('style');
  style.textContent = `
    /* ensure content is never hidden behind the fixed tab bar */
    body { padding-bottom: calc(68px + env(safe-area-inset-bottom)) !important; }

    #ct-tab-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: calc(68px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--navy);
      border-top: 2px solid var(--navy-mid);
      display: flex;
      align-items: stretch;
      z-index: 200;
      -webkit-tap-highlight-color: transparent;
    }

    .ct-tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      text-decoration: none;
      color: rgba(255,255,255,0.45);
      font-size: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      transition: color 0.15s, background 0.15s;
      border: none;
      background: none;
      cursor: pointer;
      padding: 8px 4px;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      user-select: none;
    }

    .ct-tab:active { background: rgba(255,255,255,0.07); }

    .ct-tab.active { color: var(--accent); }
    .ct-tab.active .ct-tab-icon { transform: scale(1.18); }

    .ct-tab-icon {
      font-size: 26px;
      line-height: 1;
      transition: transform 0.15s;
      display: block;
    }

    @media (min-width: 600px) {
      .ct-tab { font-size: 12px; }
      .ct-tab-icon { font-size: 24px; }
    }
  `;
  document.head.appendChild(style);

  const tabs = [
    { label: 'Dashboard', href: 'caretaker.html'       },
    { label: 'Users',     href: 'caretaker.html#users' },
    { label: 'Scanner',   href: 'scanner.html'         },
    { label: 'Medicine',  href: 'medication.html'      },
  ];

  const bar = document.createElement('nav');
  bar.id = 'ct-tab-bar';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', 'Main navigation');

  function tabIsActive(tabHref) {
    const [tPage, tHash] = tabHref.includes('#') ? tabHref.split('#') : [tabHref, ''];
    if (page !== tPage) return false;
    if (tHash === 'users') return location.hash === '#users';
    if (tPage === 'caretaker.html') return location.hash !== '#users';
    return true;
  }

  const tabEls = tabs.map(tab => {
    const a = document.createElement('a');
    a.href = tab.href;
    const active = tabIsActive(tab.href);
    a.className = 'ct-tab' + (active ? ' active' : '');
    a.setAttribute('aria-current', active ? 'page' : 'false');
    a.innerHTML = `<span>${tab.label}</span>`;
    bar.appendChild(a);
    return a;
  });

  document.body.appendChild(bar);

  // ── Translate tab labels based on caretaker_lang ──────────────────────────
  function translateTabText(text, lang) {
    if (lang === 'en') return Promise.resolve(text);
    return fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`)
      .then(r => r.json())
      .then(data => data[0].map(x => x[0]).join(''))
      .catch(() => text);
  }

  function applyTabTranslations(lang) {
    if (lang === 'en') {
      tabs.forEach((tab, i) => { tabEls[i].querySelector('span').textContent = tab.label; });
      return;
    }
    Promise.all(tabs.map(tab => translateTabText(tab.label, lang))).then(translated => {
      translated.forEach((text, i) => { tabEls[i].querySelector('span').textContent = text; });
    });
  }

  applyTabTranslations(localStorage.getItem('caretaker_lang') || 'en');

  window.addEventListener('storage', e => {
    if (e.key === 'caretaker_lang') applyTabTranslations(e.newValue || 'en');
  });
})();
