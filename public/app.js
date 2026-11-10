// Stan aplikacji
const state = {
  meetings: [],
  filteredMeetings: [],
  stats: null,
  municipalities: [],
  channels: null,
  filters: {
    municipality: 'all',
    type: 'all',
    timeFilter: 'all', // DOMYŚLNIE 'all'
    q: '',
    sort: 'date_desc', // DOMYŚLNIE od najnowszych
    view: 'cards', // 'cards' | 'table'
  },
  theme: localStorage.getItem('theme') || 'dark', // DOMYŚLNIE Dark Mode
  isSyncing: false,
};

// Elementy DOM
const elements = {
  statTotal: document.getElementById('statTotal'),
  statUpcoming: document.getElementById('statUpcoming'),
  statSessions: document.getElementById('statSessions'),
  statCommissions: document.getElementById('statCommissions'),
  statCards: document.querySelectorAll('.stat-card'),

  searchInput: document.getElementById('searchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  municipalitySelect: document.getElementById('municipalitySelect'),
  timeFilterControl: document.getElementById('timeFilterControl'),
  typeFilterControl: document.getElementById('typeFilterControl'),
  sortSelect: document.getElementById('sortSelect'),

  btnViewCards: document.getElementById('btnViewCards'),
  btnViewTable: document.getElementById('btnViewTable'),
  cardsContainer: document.getElementById('cardsContainer'),
  tableContainer: document.getElementById('tableContainer'),
  tableBody: document.getElementById('tableBody'),
  emptyState: document.getElementById('emptyState'),
  resultsCount: document.getElementById('resultsCount'),
  btnResetFilters: document.getElementById('btnResetFilters'),

  btnSync: document.getElementById('btnSync'),
  syncIconSlot: document.getElementById('syncIconSlot'),
  toast: document.getElementById('toast'),

  btnNtfyInfo: document.getElementById('btnNtfyInfo'),
  ntfyModal: document.getElementById('ntfyModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),

  btnThemeToggle: document.getElementById('btnThemeToggle'),
  themeIconSlot: document.getElementById('themeIconSlot'),
  themeLabel: document.getElementById('themeLabel'),
};

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
  loadData();
});

function initTheme() {
  applyTheme(state.theme);
  elements.btnThemeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    applyTheme(state.theme);
  });
}

function applyTheme(theme) {
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    elements.themeIconSlot.innerHTML = '<i data-lucide="sun" class="icon-header"></i>';
    if (elements.themeLabel) elements.themeLabel.textContent = 'Jasny';
    if (metaTheme) metaTheme.setAttribute('content', '#f8fafc');
  } else {
    document.body.classList.remove('light-theme');
    elements.themeIconSlot.innerHTML = '<i data-lucide="moon" class="icon-header"></i>';
    if (elements.themeLabel) elements.themeLabel.textContent = 'Ciemny';
    if (metaTheme) metaTheme.setAttribute('content', '#0a0d14');
  }
  refreshIcons();
}

function initEventListeners() {
  // Wyszukiwanie na żywo
  elements.searchInput.addEventListener('input', (e) => {
    state.filters.q = e.target.value.trim().toLowerCase();
    elements.btnClearSearch.classList.toggle('hidden', !state.filters.q);
    applyFilters();
  });

  elements.btnClearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.filters.q = '';
    elements.btnClearSearch.classList.add('hidden');
    applyFilters();
  });

  // Wybór gminy (opcjonalny, jeśli obecny w DOM)
  if (elements.municipalitySelect) {
    elements.municipalitySelect.addEventListener('change', (e) => {
      state.filters.municipality = e.target.value;
      applyFilters();
    });
  }

  // Filtr czasu
  elements.timeFilterControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    elements.timeFilterControl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filters.timeFilter = btn.dataset.time;
    syncStatCardsActive();
    applyFilters();
  });

  // Filtr typu
  elements.typeFilterControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    elements.typeFilterControl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filters.type = btn.dataset.type;
    applyFilters();
  });

  // Sortowanie
  elements.sortSelect.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    applyFilters();
  });

  // Szybkie filtry z kart statystyk
  elements.statCards.forEach(card => {
    card.addEventListener('click', () => {
      elements.statCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      if (card.dataset.filter) {
        state.filters.timeFilter = card.dataset.filter;
        elements.timeFilterControl.querySelectorAll('.seg-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.time === card.dataset.filter);
        });
      }
      if (card.dataset.type) {
        state.filters.type = card.dataset.type;
        elements.typeFilterControl.querySelectorAll('.seg-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.type === card.dataset.type);
        });
      }
      applyFilters();
    });
  });

  // Przełącznik widoku
  elements.btnViewCards.addEventListener('click', () => setView('cards'));
  elements.btnViewTable.addEventListener('click', () => setView('table'));

  // Reset filtrów
  elements.btnResetFilters.addEventListener('click', () => {
    state.filters.municipality = 'all';
    state.filters.type = 'all';
    state.filters.timeFilter = 'all';
    state.filters.sort = 'date_desc';
    state.filters.q = '';
    elements.searchInput.value = '';
    elements.btnClearSearch.classList.add('hidden');
    if (elements.municipalitySelect) elements.municipalitySelect.value = 'all';
    elements.sortSelect.value = 'date_desc';
    elements.timeFilterControl.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.time === 'all'));
    elements.typeFilterControl.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'all'));
    elements.statCards.forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
    applyFilters();
  });

  // Synchronizacja z BIP
  elements.btnSync.addEventListener('click', handleSync);

  // Modal ntfy
  elements.btnNtfyInfo.addEventListener('click', () => elements.ntfyModal.classList.remove('hidden'));
  elements.btnCloseModal.addEventListener('click', () => elements.ntfyModal.classList.add('hidden'));
  elements.ntfyModal.addEventListener('click', (e) => {
    if (e.target === elements.ntfyModal) elements.ntfyModal.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.ntfyModal.classList.contains('hidden')) {
      elements.ntfyModal.classList.add('hidden');
    }
  });
}

function setView(view) {
  state.filters.view = view;
  elements.btnViewCards.classList.toggle('active', view === 'cards');
  elements.btnViewTable.classList.toggle('active', view === 'table');
  elements.cardsContainer.classList.toggle('hidden', view !== 'cards');
  elements.tableContainer.classList.toggle('hidden', view !== 'table');
  renderMeetings();
}

function syncStatCardsActive() {
  elements.statCards.forEach(c => {
    if (c.dataset.filter) {
      c.classList.toggle('active', c.dataset.filter === state.filters.timeFilter);
    }
  });
}

async function loadData() {
  try {
    const [meetingsRes, statsRes, muniRes, channelsRes] = await Promise.all([
      fetch('/api/meetings'),
      fetch('/api/stats'),
      fetch('/api/municipalities'),
      fetch('/api/channels'),
    ]);

    const meetingsData = await meetingsRes.json();
    const statsData = await statsRes.json();
    const muniData = await muniRes.json();
    const channelsData = await channelsRes.json();

    state.meetings = meetingsData.meetings || [];
    state.stats = statsData;
    state.municipalities = muniData || [];
    state.channels = channelsData;

    renderStats();
    populateMunicipalitySelect();
    applyFilters();
  } catch (err) {
    console.error('Błąd podczas ładowania danych:', err);
    showToast('❌ Błąd połączenia z serwerem');
  }
}

function renderStats() {
  if (!state.stats) return;
  elements.statTotal.textContent = state.stats.total;
  elements.statUpcoming.textContent = state.stats.upcoming;
  elements.statSessions.textContent = state.stats.sessions;
  elements.statCommissions.textContent = state.stats.commissions;
}

function populateMunicipalitySelect() {
  const select = elements.municipalitySelect;
  if (!select) return;
  select.innerHTML = '<option value="all">Wszystkie</option>';

  state.municipalities.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    opt.textContent = `${m.name} (${m.count})`;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const { municipality, type, timeFilter, q, sort } = state.filters;

  state.filteredMeetings = state.meetings.filter(m => {
    if (municipality !== 'all' && m.municipality.toLowerCase() !== municipality.toLowerCase()) {
      return false;
    }
    if (type !== 'all' && m.type.toLowerCase() !== type.toLowerCase()) {
      return false;
    }
    const mDate = m.date.slice(0, 10);
    if (timeFilter === 'upcoming' && mDate < todayStr) {
      return false;
    }
    if (timeFilter === 'past' && mDate >= todayStr) {
      return false;
    }
    if (q) {
      const fullText = `${m.title} ${m.municipality} ${m.date} ${m.type} ${m.url}`.toLowerCase();
      if (!fullText.includes(q)) return false;
    }
    return true;
  });

  // Sortowanie
  state.filteredMeetings.sort((a, b) => {
    if (sort === 'date_asc') return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date);
  });

  renderMeetings();
}

function renderMeetings() {
  const count = state.filteredMeetings.length;
  elements.resultsCount.innerHTML = `Posiedzenia: <strong>${count}</strong>`;

  const isEmpty = count === 0;
  elements.emptyState.classList.toggle('hidden', !isEmpty);
  elements.cardsContainer.classList.toggle('hidden', isEmpty || state.filters.view !== 'cards');
  elements.tableContainer.classList.toggle('hidden', isEmpty || state.filters.view !== 'table');

  if (isEmpty) {
    refreshIcons();
    return;
  }

  if (state.filters.view === 'cards') {
    renderCardsView();
  } else {
    renderTableView();
  }

  refreshIcons();
}

function renderCardsView() {
  elements.cardsContainer.innerHTML = '';

  state.filteredMeetings.forEach(m => {
    const card = document.createElement('div');
    const isSesja = m.type.toLowerCase().includes('sesj');
    const typeClass = isSesja ? 'sesja' : 'komisja';
    const cardTypeClass = isSesja ? 'card-type-sesja' : 'card-type-komisja';
    
    card.className = `meeting-card ${cardTypeClass}`;

    const countdown = getCountdown(m.date);
    const googleCalUrl = createGoogleCalendarLink(m);
    const dateBadge = parseDateComponents(m.date);

    card.innerHTML = `
      <div>
        <div class="card-header-row">
          <span class="municipality-tag">
            <i data-lucide="${isSesja ? 'landmark' : 'users'}" class="icon-inline"></i>
            ${escapeHtml(m.municipality)}
          </span>
          <span class="type-tag ${typeClass}">${escapeHtml(m.type)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(m.title)}</h3>
      </div>

      <div>
        <div class="card-schedule-box">
          <div class="date-badge-widget">
            <div class="calendar-mini-box">
              <span class="cal-month">${dateBadge.month}</span>
              <span class="cal-day">${dateBadge.day}</span>
            </div>
            <div class="date-info-texts">
              <span class="date-full-text">${dateBadge.weekday}, ${dateBadge.dayNum} ${dateBadge.monthLong} ${dateBadge.year}</span>
              <span class="date-time-text">
                <i data-lucide="clock" class="icon-inline"></i>
                ${dateBadge.time}
              </span>
            </div>
          </div>
          <span class="countdown-pill ${countdown.pillClass}">${countdown.label}</span>
        </div>

        <div class="card-actions">
          <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener" class="card-btn card-btn-link" title="Przejdź do źródła BIP">
            <i data-lucide="external-link" class="icon-btn"></i>
            BIP / Źródło
          </a>
          <a href="${googleCalUrl}" target="_blank" rel="noopener" class="card-btn card-btn-cal" title="Dodaj do Kalendarza Google">
            <i data-lucide="calendar-plus" class="icon-btn"></i>
            + Kalendarz
          </a>
        </div>
      </div>
    `;
    elements.cardsContainer.appendChild(card);
  });
}

function renderTableView() {
  elements.tableBody.innerHTML = '';

  state.filteredMeetings.forEach(m => {
    const tr = document.createElement('tr');
    const typeClass = m.type.toLowerCase().includes('sesj') ? 'sesja' : 'komisja';
    const countdown = getCountdown(m.date);
    const dateBadge = parseDateComponents(m.date);

    tr.innerHTML = `
      <td style="white-space: nowrap;">
        <strong>${dateBadge.day} ${dateBadge.month} ${dateBadge.year}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
          ${dateBadge.time} &bull; <span class="countdown-pill ${countdown.pillClass}" style="font-size: 0.68rem; padding: 1px 6px;">${countdown.label}</span>
        </div>
      </td>
      <td><strong>${escapeHtml(m.municipality)}</strong></td>
      <td><span class="type-tag ${typeClass}">${escapeHtml(m.type)}</span></td>
      <td>${escapeHtml(m.title)}</td>
      <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--success);">${escapeHtml(m.status)}</span></td>
      <td>
        <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener" class="card-btn card-btn-link" style="padding: 4px 10px; font-size: 0.75rem; display: inline-flex;">
          <i data-lucide="external-link" class="icon-btn"></i> BIP
        </a>
      </td>
    `;
    elements.tableBody.appendChild(tr);
  });
}

async function handleSync() {
  if (state.isSyncing) return;
  state.isSyncing = true;
  elements.btnSync.disabled = true;
  elements.syncIconSlot.classList.add('spin');
  showToast('🔄 Synchronizacja z biuletynami BIP w toku...');

  try {
    const res = await fetch('/api/sync', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      showToast(`✅ Zsynchronizowano: sprawdzono ${data.totalProcessed} poz. (+${data.totalNew} nowych)`);
      await loadData();
    } else {
      showToast(`❌ Błąd: ${data.error || 'Nieznany błąd'}`);
    }
  } catch (err) {
    showToast(`❌ Błąd połączenia z serwerem`);
  } finally {
    state.isSyncing = false;
    elements.btnSync.disabled = false;
    elements.syncIconSlot.classList.remove('spin');
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 4500);
}

// Rozbicie daty na czytelne komponenty kalendarzowe
function parseDateComponents(dateStr) {
  if (!dateStr) {
    return { day: '?', dayNum: '', month: '---', monthLong: '', year: '', weekday: 'Brak terminu', time: 'Brak godziny' };
  }
  try {
    const parts = dateStr.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] ? `godz. ${parts[1]}` : 'godzina niepodana';

    const d = new Date(datePart);
    if (isNaN(d.getTime())) {
      return { day: '!', dayNum: '', month: 'DATA', monthLong: '', year: '', weekday: dateStr, time: '' };
    }

    const months = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'];
    const monthsLong = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
    const weekdays = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

    const dayNum = d.getDate();
    const day = String(dayNum).padStart(2, '0');
    const month = months[d.getMonth()];
    const monthLong = monthsLong[d.getMonth()];
    const year = d.getFullYear();
    const weekday = weekdays[d.getDay()];

    return { day, dayNum, month, monthLong, year, weekday, time: timePart };
  } catch {
    return { day: '?', dayNum: '', month: '---', monthLong: '', year: '', weekday: dateStr, time: '' };
  }
}

function getCountdown(dateStr) {
  if (!dateStr) return { label: 'Brak terminu', pillClass: 'pill-past' };
  try {
    const targetDate = new Date(dateStr.slice(0, 10));
    const today = new Date(new Date().toISOString().slice(0, 10));
    const diffMs = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Zakończone', pillClass: 'pill-past' };
    }
    if (diffDays === 0) {
      return { label: 'Dzisiaj!', pillClass: 'pill-soon' };
    }
    if (diffDays === 1) {
      return { label: 'Jutro!', pillClass: 'pill-soon' };
    }
    return { label: `Za ${diffDays} dni`, pillClass: 'pill-future' };
  } catch {
    return { label: 'Brak terminu', pillClass: 'pill-past' };
  }
}

function createGoogleCalendarLink(m) {
  try {
    const cleanDate = m.date.replace(/[-:\s]/g, '').slice(0, 12);
    const startStr = cleanDate.length >= 12 ? `${cleanDate}00` : `${cleanDate.slice(0, 8)}T090000Z`;
    const title = encodeURIComponent(`[${m.municipality}] ${m.title}`);
    const details = encodeURIComponent(`Typ: ${m.type}\nStatus: ${m.status}\nOficjalny link: ${m.url}`);
    const location = encodeURIComponent(m.municipality);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${startStr}&details=${details}&location=${location}`;
  } catch {
    return 'https://calendar.google.com';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
