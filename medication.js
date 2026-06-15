// ── Storage keys
const DISPLAY_KEY  = 'medications_active';
const HISTORY_KEY  = 'medications_history';

// ── Load / save helpers
function loadActive()  { try { return JSON.parse(localStorage.getItem(DISPLAY_KEY))  || []; } catch { return []; } }
function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } }
function saveActive(list) {
  localStorage.setItem(DISPLAY_KEY, JSON.stringify(list));
  const session = JSON.parse(localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session') || 'null');
  if (session && session.username) {
    window.syncMedsToFirestore && window.syncMedsToFirestore(session.username, list);
  }
}
function saveHistory(list) { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }

// ── State
let active           = loadActive();
let history          = loadHistory();
let editingId        = null;
let editTimeSlots    = [];
let editSelectedDays = [];
let editTimes        = [];
let editTimesPerDay  = 1;
let editPillsPerDose = [1]; // array — one entry per dose

// ── DOM refs
const container    = document.getElementById('med-container');
const viewPopup    = document.getElementById('view-popup');
const closeView    = document.getElementById('close-view');
const modalOverlay = document.getElementById('modal-overlay');
const modalCancel  = document.getElementById('modal-cancel');
const modalSave    = document.getElementById('modal-save');
const modalTitle   = document.getElementById('modal-title');
const inputName    = document.getElementById('input-name');
const timeSlotEls = document.querySelectorAll('.period-slot');
const daysToggle   = document.getElementById('days-toggle');
const daysMenu     = document.getElementById('days-menu');
const daysDisplay  = document.getElementById('days-selected-display');
const dayOptions   = document.querySelectorAll('.day-option');
const pillsInput   = document.getElementById('pills-input');

// ── Days dropdown
daysToggle.addEventListener('click', () => daysMenu.classList.toggle('open'));
document.addEventListener('click', e => {
  if (!e.target.closest('.days-dropdown')) daysMenu.classList.remove('open');
});
dayOptions.forEach(option => {
  option.addEventListener('click', () => {
    const day = option.dataset.day;
    if (editSelectedDays.includes(day)) {
      editSelectedDays = editSelectedDays.filter(d => d !== day);
      option.classList.remove('selected');
    } else {
      editSelectedDays.push(day);
      option.classList.add('selected');
    }
    updateDaysDisplay();
  });
});
// ── Assign dropdown ──────────────────────────────────────────────────────────
function getMyAddedUsersMed() {
  try {
    const session = JSON.parse(localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session') || 'null');
    if (!session) return [];
    const allUsers = JSON.parse(localStorage.getItem('auth_users') || '[]');
    return allUsers.filter(u => u.assignedTo === session.username);
  } catch { return []; }
}

function populateMedAssignDropdown(select, currentValue) {
  if (!select) return;
  select.innerHTML = '<option value="everyone">Everyone</option>';
  getMyAddedUsersMed().forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.username;
    opt.textContent = u.name || u.username;
    select.appendChild(opt);
  });
  if (currentValue) select.value = currentValue;
}

// ── Reminder times ────────────────────────────────────────────────────────────
function defaultTimes(n) {
  const presets = [
    [],
    ['09:00'],
    ['08:00','20:00'],
    ['08:00','14:00','20:00'],
    ['08:00','12:00','16:00','20:00'],
    ['08:00','11:00','14:00','17:00','20:00'],
    ['08:00','10:30','13:00','15:30','18:00','21:00'],
    ['08:00','10:00','12:00','14:00','16:00','18:00','21:00'],
    ['07:00','09:00','11:00','13:00','15:00','17:00','19:00','21:00'],
    ['07:00','09:00','11:00','13:00','14:00','16:00','18:00','20:00','22:00'],
    ['06:00','08:00','10:00','12:00','13:00','14:00','16:00','17:00','19:00','21:00'],
  ];
  return presets[n] ? [...presets[n]] : [];
}

function renderTimeSlots() {
  const container = document.getElementById('time-slots-container');
  if (!container) return;
  const defaults = defaultTimes(editTimesPerDay);
  while (editTimes.length < editTimesPerDay) editTimes.push(defaults[editTimes.length] || '09:00');
  editTimes = editTimes.slice(0, editTimesPerDay);
  while (editPillsPerDose.length < editTimesPerDay) editPillsPerDose.push(1);
  editPillsPerDose = editPillsPerDose.slice(0, editTimesPerDay);
  container.innerHTML = '';
  editTimes.forEach((t, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'time-slot';

    // Time input
    const label = document.createElement('span');
    label.className = 'time-slot-label';
    label.textContent = editTimesPerDay > 1 ? 'Dose ' + (i + 1) : 'Time';
    const timeInp = document.createElement('input');
    timeInp.type = 'time';
    timeInp.className = 'time-input';
    timeInp.value = t;
    timeInp.addEventListener('change', e => { editTimes[i] = e.target.value; });

    // Pills per dose picker
    const pillWrap = document.createElement('div');
    pillWrap.className = 'dose-pill-picker';
    const pillMinus = document.createElement('button');
    pillMinus.type = 'button'; pillMinus.textContent = '−'; pillMinus.className = 'dose-pill-btn';
    const pillCount = document.createElement('span');
    pillCount.className = 'dose-pill-count';
    pillCount.textContent = editPillsPerDose[i];
    const pillPlus = document.createElement('button');
    pillPlus.type = 'button'; pillPlus.textContent = '+'; pillPlus.className = 'dose-pill-btn';
    pillMinus.addEventListener('click', () => {
      if (editPillsPerDose[i] > 1) { editPillsPerDose[i]--; pillCount.textContent = editPillsPerDose[i]; }
    });
    pillPlus.addEventListener('click', () => {
      if (editPillsPerDose[i] < 20) { editPillsPerDose[i]++; pillCount.textContent = editPillsPerDose[i]; }
    });
    pillWrap.appendChild(pillMinus);
    pillWrap.appendChild(pillCount);
    pillWrap.appendChild(pillPlus);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'time-slot-delete';
    delBtn.textContent = '×';
    delBtn.disabled = editTimesPerDay <= 1;
    delBtn.style.opacity = editTimesPerDay > 1 ? '1' : '0.3';
    delBtn.style.pointerEvents = editTimesPerDay > 1 ? '' : 'none';
    delBtn.addEventListener('click', () => {
      editTimes[i] = timeInp.value || editTimes[i];
      editTimes.splice(i, 1);
      editPillsPerDose.splice(i, 1);
      editTimesPerDay--;
      renderTimeSlots();
    });

    wrap.appendChild(label);
    wrap.appendChild(timeInp);
    wrap.appendChild(pillWrap);
    wrap.appendChild(delBtn);
    container.appendChild(wrap);
  });
}

function updateDaysDisplay() {
  daysToggle.textContent = editSelectedDays.length
    ? `${editSelectedDays.length} day${editSelectedDays.length > 1 ? 's' : ''} selected ▾`
    : 'Select days ▾';
  daysDisplay.innerHTML = '';
  editSelectedDays.forEach(day => {
    const tag = document.createElement('div');
    tag.className = 'day-tag';
    tag.textContent = day;
    daysDisplay.appendChild(tag);
  });
}

timeSlotEls.forEach(slot => {
  slot.addEventListener('click', () => {
    const s = slot.dataset.slot;
    if (editTimeSlots.includes(s)) {
      editTimeSlots = editTimeSlots.filter(x => x !== s);
      slot.classList.remove('selected');
    } else {
      editTimeSlots.push(s);
      slot.classList.add('selected');
    }
    editTimesPerDay = editTimeSlots.length;
    renderTimeSlots();
  });
});
// ── Daily subtraction
// For each med, store lastDeductDate per med id in localStorage
// On load, figure out how many scheduled days have passed since lastDeductDate, subtract pills
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getDatesFrom(fromDateStr) {
  // Returns array of day-name strings for each day from fromDate (exclusive) up to and including yesterday
  const from   = new Date(fromDateStr);
  const today  = new Date();
  today.setHours(0,0,0,0);
  const dates  = [];
  const cursor = new Date(from);
  cursor.setDate(cursor.getDate() + 1); // start day after last deduct
  while (cursor < today) {
    dates.push(DAY_NAMES[cursor.getDay()]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function runDailyDeduction() {
  const DEDUCT_KEY = 'med_last_deduct';
  let deductMap;
  try { deductMap = JSON.parse(localStorage.getItem(DEDUCT_KEY)) || {}; } catch { deductMap = {}; }

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let changed = false;

  active.forEach(med => {
    const lastDate = deductMap[med.id] || med.startDateISO || todayStr;
    if (lastDate === todayStr) return; // already ran today

    const missedDays = getDatesFrom(lastDate);
    let deduct = 0;
    missedDays.forEach(dayName => {
      if (med.days.includes(dayName)) {
        const ppd = med.pillsPerDose;
        deduct += Array.isArray(ppd) ? ppd.reduce((a, b) => a + b, 0) : med.timesPerDay * (ppd || 1);
      }
    });

    if (deduct > 0) {
      med.pillCount = Math.max(0, (med.pillCount || 0) - deduct);
      changed = true;
    }
    deductMap[med.id] = todayStr;
  });

  localStorage.setItem(DEDUCT_KEY, JSON.stringify(deductMap));
  if (changed) saveActive(active);
}

// ── Low stock threshold
const LOW_STOCK = 7;
function isLow(med) { return typeof med.pillCount === 'number' && med.pillCount <= LOW_STOCK; }

// ── Card action popup state
let cardPopupMed = null;

// ── Render list
function renderCards() {
  container.innerHTML = '';

  // Add button — always first
  const addRow = document.createElement('div');
  addRow.className = 'add-row';
  addRow.innerHTML = `<button class="btn-add-med">${window.medT?.addMedication || 'Add Medication'}</button>`;
  addRow.querySelector('button').addEventListener('click', () => openModal(null));
  container.appendChild(addRow);

  // History button
  const histRow = document.createElement('div');
  histRow.className = 'history-row';
  histRow.innerHTML = `<button class="btn-history">${window.medT?.medHistory || 'Medication History'}</button>`;
  histRow.querySelector('button').addEventListener('click', openHistoryModal);
  container.appendChild(histRow);

  if (active.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'warning';
    msg.textContent = window.medT?.noMeds || 'No medications yet. Tap Add Medication to get started.';
    container.appendChild(msg);
    return;
  }

  active.forEach(med => {
    const row = document.createElement('div');
    row.className = 'med-row' + (isLow(med) ? ' med-row-low' : '');

    const pillText = typeof med.pillCount === 'number'
      ? `<span class="med-row-pills${isLow(med) ? ' pills-low' : ''}">${med.pillCount} ${med.pillCount !== 1 ? (window.medT?.pills || 'pills') : (window.medT?.pill || 'pill')} ${window.medT?.left || 'left'}</span>`
      : '';

    row.innerHTML = `
      <div class="med-row-info">
        <span class="med-row-name">${med.name}</span>
        ${pillText}
      </div>
      <span class="med-row-arrow">›</span>
    `;
    row.addEventListener('click', () => openCardPopup(med));
    container.appendChild(row);
  });
}

// ── Card action popup
function openCardPopup(med) {
  cardPopupMed = med;
  document.getElementById('card-popup-name').textContent = med.name;

  // pill count line
  const pillLine = document.getElementById('card-popup-pills');
  if (typeof med.pillCount === 'number') {
    pillLine.textContent = (isLow(med) ? (window.medT?.lowStock || 'Low stock') + ' — ' : '') + `${med.pillCount} ${med.pillCount !== 1 ? (window.medT?.pills || 'pills') : (window.medT?.pill || 'pill')} ${window.medT?.remaining || 'remaining'}`;
    pillLine.className   = 'card-popup-pills' + (isLow(med) ? ' pills-low' : '');
    pillLine.style.display = '';
  } else {
    pillLine.style.display = 'none';
  }

  document.getElementById('card-popup').classList.add('show');
}

function closeCardPopup() {
  document.getElementById('card-popup').classList.remove('show');
  cardPopupMed = null;
}

document.getElementById('card-popup').addEventListener('click', e => {
  if (e.target === document.getElementById('card-popup')) closeCardPopup();
});
document.getElementById('card-btn-cancel').addEventListener('click', closeCardPopup);

document.getElementById('card-btn-edit').addEventListener('click', () => {
  const med = cardPopupMed;
  closeCardPopup();
  openModal(med);
});

document.getElementById('card-btn-delete').addEventListener('click', () => {
  const med = cardPopupMed;
  const endDate = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const histEntry = history.find(h => h.id === med.id);
  if (histEntry) { histEntry.endDate = endDate; saveHistory(history); }
  const idx = active.findIndex(m => m.id === med.id);
  if (idx !== -1) active.splice(idx, 1);
  saveActive(active);
  closeCardPopup();
  renderCards();
});

// ── Restock button in card popup
document.getElementById('card-btn-restock').addEventListener('click', () => {
  const med = cardPopupMed;
  closeCardPopup();
  openRestockModal(med);
});

// ── Restock modal
let restockMed = null;

function openRestockModal(med) {
  restockMed = med;
  document.getElementById('restock-med-name').textContent = med.name;
  document.getElementById('restock-input').value = '';
  document.getElementById('restock-overlay').classList.add('show');
  document.getElementById('restock-input').focus();
}

document.getElementById('restock-cancel').addEventListener('click', () => {
  document.getElementById('restock-overlay').classList.remove('show');
  restockMed = null;
});
document.getElementById('restock-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('restock-overlay')) {
    document.getElementById('restock-overlay').classList.remove('show');
    restockMed = null;
  }
});
document.getElementById('restock-save').addEventListener('click', () => {
  const amount = Math.max(0, parseInt(document.getElementById('restock-input').value) || 0);
  if (!restockMed || amount === 0) {
    document.getElementById('restock-overlay').classList.remove('show');
    restockMed = null;
    return;
  }
  const idx = active.findIndex(m => m.id === restockMed.id);
  if (idx !== -1) {
    active[idx].pillCount = (active[idx].pillCount || 0) + amount;
    saveActive(active);
    renderCards();
    checkLowStockNotifications();
  }
  document.getElementById('restock-overlay').classList.remove('show');
  restockMed = null;
});

// ── Buy Pills popup (global low-stock list)
document.getElementById('buy-pills-btn').addEventListener('click', () => {
  const lowMeds = active.filter(isLow);
  const list    = document.getElementById('buy-pills-list');
  list.innerHTML = '';

  if (lowMeds.length === 0) {
    list.innerHTML = `<p class="buy-pills-empty">${window.medT?.wellStocked || 'All medications are well stocked.'}</p>`;
  } else {
    lowMeds.forEach(med => {
      const item = document.createElement('div');
      item.className = 'buy-pills-item';
      item.innerHTML = `
        <span class="buy-pills-name">${med.name}</span>
        <span class="buy-pills-count">${med.pillCount} ${med.pillCount !== 1 ? (window.medT?.pills || 'pills') : (window.medT?.pill || 'pill')} ${window.medT?.left || 'left'}</span>
      `;
      list.appendChild(item);
    });
  }

  document.getElementById('buy-pills-overlay').classList.add('show');
});
document.getElementById('buy-pills-close').addEventListener('click', () => {
  document.getElementById('buy-pills-overlay').classList.remove('show');
});
document.getElementById('buy-pills-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('buy-pills-overlay'))
    document.getElementById('buy-pills-overlay').classList.remove('show');
});

// ── View popup close
closeView.addEventListener('click', () => viewPopup.classList.remove('show'));
viewPopup.addEventListener('click', e => {
  if (e.target === viewPopup) viewPopup.classList.remove('show');
});

// ── Modal open (add or edit)
function openModal(med) {
  if (med) {
    editingId        = med.id;
    modalTitle.textContent = window.medT?.changeMedication || 'Change Medication';
    inputName.value  = med.name;
    editTimeSlots    = [...(med.timeSlots || [])];
    editSelectedDays = [...med.days];
    editTimes        = med.times ? [...med.times] : defaultTimes(med.timesPerDay);
    editPillsPerDose = Array.isArray(med.pillsPerDose)
      ? [...med.pillsPerDose]
      : Array(med.timesPerDay || 1).fill(med.pillsPerDose || 1);
    pillsInput.value = typeof med.pillCount === 'number' ? med.pillCount : '';
  } else {
    editingId        = null;
    modalTitle.textContent = window.medT?.addMedication || 'Add Medication';
    inputName.value  = '';
    editTimeSlots    = [];
    editSelectedDays = [];
    editTimes        = defaultTimes(1);
    editPillsPerDose = [1];
    pillsInput.value = '';
  }

  timeSlotEls.forEach(s => {
    editTimeSlots.includes(s.dataset.slot) ? s.classList.add('selected') : s.classList.remove('selected');
  });

  dayOptions.forEach(o => {
    editSelectedDays.includes(o.dataset.day) ? o.classList.add('selected') : o.classList.remove('selected');
  });

  updateDaysDisplay();
  renderTimeSlots();
  populateMedAssignDropdown(
    document.getElementById('med-assign-select'),
    med ? (med.assignedTo || 'everyone') : 'everyone'
  );
  modalOverlay.classList.add('show');
 
  inputName.focus();
}

modalCancel.addEventListener('click', () => {
  modalOverlay.classList.remove('show');
  document.body.style.overflow = '';
});
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }
});

// ── Save (add or edit)
modalSave.addEventListener('click', () => {
  const name = inputName.value.trim();
  if (!name)                    { inputName.focus(); return; }
  if (!editSelectedDays.length) { alert('Please select at least one day.'); return; }
  if (!editTimeSlots.length) { alert('Please select at least one time slot.'); return; }
  const editPillCount = Math.max(0, parseInt(pillsInput.value) || 0);
  const timeInputs = document.querySelectorAll('#time-slots-container .time-input');
  editTimes = Array.from(timeInputs).map(inp => inp.value || '09:00');
  const assignedTo = document.getElementById('med-assign-select')?.value || 'everyone';

  if (editingId !== null) {
    // EDIT
    const activeIndex = active.findIndex(m => m.id === editingId);
    const histEntry   = history.find(h => h.id === editingId);
    if (activeIndex === -1) { modalOverlay.classList.remove('show'); return; }

    const old = active[activeIndex];

    const changes = [];
    if (old.name !== name) changes.push(`Name: "${old.name}" → "${name}"`);
    if ([...old.days].sort().join(',') !== [...editSelectedDays].sort().join(','))
      changes.push(`Days: ${old.days.join(', ')} → ${editSelectedDays.join(', ')}`);
   if ([...(old.timeSlots||[])].sort().join(',') !== [...editTimeSlots].sort().join(','))
  changes.push(`Time slots: ${(old.timeSlots||[]).join(', ')} → ${editTimeSlots.join(', ')}`);
    // pill count changes are NOT tracked in history

    const oldPPD = JSON.stringify(old.pillsPerDose || []);
    const newPPD = JSON.stringify(editPillsPerDose);
    if (oldPPD !== newPPD)
      changes.push(`Pills per dose changed`);

    if (changes.length === 0) {
      active[activeIndex].pillCount     = editPillCount;
      active[activeIndex].pillsPerDose  = [...editPillsPerDose];
      saveActive(active);
      renderCards();
      modalOverlay.classList.remove('show');
      document.body.style.overflow = '';
      return;
    }

    active[activeIndex] = { ...old, name, days: editSelectedDays, timesPerDay: editTimesPerDay, times: [...editTimes], pillCount: editPillCount, pillsPerDose: [...editPillsPerDose], assignedTo };

    const changeDate = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    const sameDay    = histEntry && histEntry.startDate === changeDate;

    if (sameDay) {
      histEntry.name        = name;
      histEntry.days        = editSelectedDays;
      histEntry.timesPerDay = editTimeSlots.length;
      // pillCount intentionally not written to history
    } else {
      if (histEntry) histEntry.endDate = changeDate;
      history.unshift({
        id: editingId, _histId: Date.now(),
        name, days: editSelectedDays, timesPerDay: editTimeSlots.length,
        startDate: changeDate, endDate: null,
        changeLog: [{ date: changeDate, description: changes.join(' | ') }]
        // no pillCount in history
      });
    }

    saveActive(active);
    saveHistory(history);
    renderCards();
    modalOverlay.classList.remove('show');
    document.body.style.overflow = '';    // ← ADD

  } else {
    // ADD
    const today = new Date();
    const startDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const startDateISO = today.toISOString().split('T')[0];
    const id = Date.now();
    const med = { id, name, days: editSelectedDays, timesPerDay: editTimesPerDay, times: [...editTimes], pillCount: editPillCount, pillsPerDose: [...editPillsPerDose], assignedTo, startDate, startDateISO, endDate: null, changeLog: [] };

    active.push(med);
    // history entry has no pillCount
    history.push({ id, name, days: editSelectedDays, timesPerDay: editTimesPerDay, startDate, startDateISO, endDate: null, changeLog: [] });
    saveActive(active);
    saveHistory(history);
    renderCards();
    modalOverlay.classList.remove('show');
    document.body.style.overflow = '';    // ← ADD
  }
});

// ── Mic
function setupMic(btnId, targetInput) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btn.style.opacity='0.4'; btn.style.cursor='not-allowed'; return; }
  const recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  let listening = false;
  const micImg = '<img src="micIcon.png" alt="mic" class="mic-icon" />';
  btn.addEventListener('click', () => { listening ? recognition.stop() : recognition.start(); });
  recognition.addEventListener('start',  () => { listening=true;  btn.classList.add('listening');    btn.innerHTML='⏹'; });
  recognition.addEventListener('result', e  => { targetInput.value = e.results[0][0].transcript; });
  recognition.addEventListener('end',    () => { listening=false; btn.classList.remove('listening'); btn.innerHTML=micImg; });
  recognition.addEventListener('error',  () => { listening=false; btn.classList.remove('listening'); btn.innerHTML=micImg; });
}

// ── Print history
document.getElementById('print-btn').addEventListener('click', () => {
  const log = loadHistory();

  const rows = log.map(med => `
    <tr>
      <td>${med.name}</td>
      <td>${med.days.join(', ')}</td>
      <td>${med.timesPerDay}x / day</td>
      <td>${med.startDate}</td>
      <td>${med.endDate || 'Present'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html><html><head><title>Medication History</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:system-ui,sans-serif;background:#fff;color:#111;padding:48px}
      .print-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:32px;border-bottom:2px solid #03114F;padding-bottom:16px}
      .print-header h1{font-size:28px;font-weight:700;color:#03114F}
      .print-header p{font-size:13px;color:#888}
      table{width:100%;border-collapse:collapse;font-size:15px}
      thead{background:#03114F;color:#fff}
      thead th{padding:12px 16px;text-align:left;font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:13px}
      tbody tr:nth-child(even){background:#f9ead9}
      tbody tr:nth-child(odd){background:#fff}
      tbody td{padding:12px 16px;color:#111;border-bottom:1px solid #e8ddd1;vertical-align:top}
      tbody tr:last-child td{border-bottom:none}
      .no-data{text-align:center;padding:48px;color:#888;font-size:16px}
      .print-footer{margin-top:32px;font-size:12px;color:#aaa;text-align:center;border-top:1px solid #e8ddd1;padding-top:16px}
      @media print{body{padding:24px}}
    </style></head><body>
    <div class="print-header">
      <h1>Medication History</h1>
      <p>Printed on ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
    </div>
    ${log.length===0
      ? `<p class="no-data">No medication history found.</p>`
      : `<table><thead><tr><th>Medication</th><th>Days</th><th>Frequency</th><th>Start Date</th><th>End Date</th></tr></thead><tbody>${rows}</tbody></table>`}
    <div class="print-footer">Generated by A-TEN</div>
    <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
});

// ── Medication History modal ─────────────────────────────────────────────────
function openHistoryModal() {
  renderHistoryList();
  document.getElementById('history-overlay').classList.add('show');
}

function renderHistoryList() {
  const log  = loadHistory();
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (log.length === 0) {
    list.innerHTML = `<p class="history-empty">${window.medT?.noHistory || 'No medication history yet.'}</p>`;
    return;
  }

  log.forEach((med, idx) => {
    const entry = document.createElement('div');
    entry.className = 'history-entry';
    entry.innerHTML = `
      <button class="history-delete-btn" data-idx="${idx}" aria-label="Delete">×</button>
      <div class="history-entry-name">${med.name}</div>
      <div class="history-entry-meta">
        <span>${med.days.map(d => (window.medT?.dayNames?.[d] || d)).join(', ')}</span>
        <span>${med.timesPerDay}x ${window.medT?.perDay || '/ day'}</span>
      </div>
      <div class="history-entry-dates">
        ${med.startDate} — ${med.endDate || (window.medT?.present || 'Present')}
      </div>
    `;
    entry.querySelector('.history-delete-btn').addEventListener('click', () => {
      history.splice(idx, 1);
      saveHistory(history);
      renderHistoryList();
    });
    list.appendChild(entry);
  });
}

document.getElementById('history-close').addEventListener('click', () => {
  document.getElementById('history-overlay').classList.remove('show');
});
document.getElementById('history-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('history-overlay'))
    document.getElementById('history-overlay').classList.remove('show');
});

setupMic('mic-name', document.getElementById('input-name'));

// ── Label scanner ────────────────────────────────────────────────────────────
const scanOverlay    = document.getElementById('scan-overlay');
const scanVideo      = document.getElementById('scan-video');
const scanCanvas     = document.getElementById('scan-canvas');
const scanCamStart   = document.getElementById('scan-cam-start');
const scanAnalyzing  = document.getElementById('scan-analyzing');
const scanStartBtn   = document.getElementById('scan-start-cam-btn');
const scanCaptureBtn = document.getElementById('scan-capture-btn');
const scanCloseBtn   = document.getElementById('scan-close-btn');
let   scanStream     = null;

document.getElementById('scan-label-btn').addEventListener('click', openScanOverlay);

function openScanOverlay() {
  modalOverlay.classList.remove('show');
  scanOverlay.classList.add('show');
  scanCamStart.style.display = '';
  scanAnalyzing.style.display = 'none';
  scanCaptureBtn.disabled = true;
}

function closeScanOverlay() {
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  scanOverlay.classList.remove('show');
  modalOverlay.classList.add('show');
}

scanCloseBtn.addEventListener('click', closeScanOverlay);

scanStartBtn.addEventListener('click', async () => {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    scanVideo.srcObject = scanStream;
    scanCamStart.style.display = 'none';
    scanCaptureBtn.disabled = false;
  } catch {
    alert('Camera access denied. Please allow it in browser settings.');
  }
});

scanCaptureBtn.addEventListener('click', async () => {
  if (!scanStream) return;

  // Capture frame
  const w = scanVideo.videoWidth || 640;
  const h = scanVideo.videoHeight || 480;
  scanCanvas.width = w;
  scanCanvas.height = h;
  scanCanvas.getContext('2d').drawImage(scanVideo, 0, 0, w, h);
  const base64 = scanCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];

  // Stop camera, show spinner
  scanStream.getTracks().forEach(t => t.stop());
  scanStream = null;
  scanCaptureBtn.disabled = true;
  scanAnalyzing.style.display = 'flex';

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            { type: 'text', text: `You are reading a medication bottle label or pharmacy information slip. Extract the following and respond ONLY with raw JSON, no markdown, no explanation:
{
  "name": "medication name (brand or generic)",
  "timesPerDay": <integer 1-10, how many times per day to take it>,
  "days": <"daily" if every day, or an array like ["Monday","Wednesday","Friday"] if specific days are listed>,
  "pillCount": <integer if a quantity or count is shown on the label, otherwise null>,
  "dosageNote": "brief dosage note e.g. '500mg with food' or empty string"
}
If you cannot read the label clearly, still return your best guess. Always return valid JSON.` }
          ]
        }]
      })
    });

    const data = await resp.json();
    const raw  = data.choices?.[0]?.message?.content || '';
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { parsed = null; }

    scanAnalyzing.style.display = 'none';
    closeScanOverlay();

    if (!parsed) {
      alert('Could not read the label clearly. Please fill in the fields manually.');
      return;
    }

    // ── Autofill the form ──────────────────────────────────────────────────
    if (parsed.name)  inputName.value = parsed.name;

    if (parsed.timesPerDay && Number.isInteger(parsed.timesPerDay)) {
      // Map times per day to slots automatically
      const slotMap = { 1: ['Morning'], 2: ['Morning', 'Night'], 3: ['Morning', 'Afternoon', 'Night'], 4: ['Morning', 'Afternoon', 'Evening', 'Night'] };
      editTimeSlots = slotMap[Math.min(4, parsed.timesPerDay)] || ['Morning'];
      timeSlotEls.forEach(s => {
        editTimeSlots.includes(s.dataset.slot) ? s.classList.add('selected') : s.classList.remove('selected');
      });
    }

    if (parsed.days) {
      const ALL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      editSelectedDays = parsed.days === 'daily' ? [...ALL_DAYS]
        : ALL_DAYS.filter(d => (parsed.days || []).map(x => x.toLowerCase()).includes(d.toLowerCase()));
      dayOptions.forEach(o => {
        editSelectedDays.includes(o.dataset.day) ? o.classList.add('selected') : o.classList.remove('selected');
      });
      updateDaysDisplay();
    }

    if (parsed.pillCount != null && !isNaN(Number(parsed.pillCount))) {
      pillsInput.value = Number(parsed.pillCount);
    }

    if (parsed.dosageNote && !inputName.value.includes(parsed.dosageNote)) {
      inputName.placeholder = parsed.dosageNote;
    }

  } catch (err) {
    scanAnalyzing.style.display = 'none';
    closeScanOverlay();
    alert('Scan failed. Check your internet connection and try again.');
    console.error(err);
  }
});

// ── Low-stock notifications (caretaker) ───────────────────────────────────────
function checkLowStockNotifications() {
  const lowMeds = active.filter(isLow);
  const banner  = document.getElementById('low-stock-banner');
  if (banner) {
    if (lowMeds.length === 0) {
      banner.style.display = 'none';
    } else {
      banner.style.display = 'flex';
      banner.innerHTML = `<span>Running low: <strong>${lowMeds.map(m => `${m.name} (${m.pillCount})`).join(', ')}</strong> — tap a medication to restock.</span>`;
    }
  }

  if (!lowMeds.length) return;
  let notified;
  try { notified = JSON.parse(localStorage.getItem('med_low_notified') || '{}'); } catch { notified = {}; }
  const today = new Date().toISOString().split('T')[0];
  lowMeds.forEach(med => {
    if (notified[med.id] === today) return;
    notified[med.id] = today;
    if (Notification.permission === 'granted') {
      new Notification('Low Medication Stock', {
        body: `${med.name} has only ${med.pillCount} pill${med.pillCount !== 1 ? 's' : ''} remaining. Please restock soon.`,
      });
    }
  });
  localStorage.setItem('med_low_notified', JSON.stringify(notified));
}

// ── Init
// ── Init
(async () => {
  const session = JSON.parse(localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session') || 'null');
  if (session && session.caretakerName) {
    // User device — load meds from caretaker's Firestore
    const remoteMeds = await window.loadMedsFromFirestore(session.caretakerName);
    if (remoteMeds.length) {
      active = remoteMeds;
      saveActive(active);
    }
    window.listenToMeds && window.listenToMeds(session.caretakerName, (meds) => {
      active = meds;
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(meds));
      renderCards();
      checkLowStockNotifications();
    });
  }
  runDailyDeduction();
  renderCards();
  checkLowStockNotifications();
})();
checkLowStockNotifications();
if (Notification.permission === 'default') Notification.requestPermission();
window.addEventListener('storage', e => {
  if (e.key === 'medications_active') {
    active = loadActive();
    renderCards();
    checkLowStockNotifications();
  }
});