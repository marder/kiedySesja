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
    timeFilter: 'all', // DOMYŚLNIE 'all' (żadne rekordy nie są ukryte)
    q: '',
    sort: 'date_desc', // DOMYŚLNIE od najnowszych do najstarszych
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
  syncIcon: document.getElementById('syncIcon'),
  toast: document.getElementById('toast'),

  btnNtfyInfo: document.getElementById('btnNtfyInfo'),
  ntfyModal: document.getElementById('ntfyModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  channelsGrid: document.getElementById('channelsGrid'),

  btnThemeToggle: document.getElementById('btnThemeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  themeLabel: document.getElementById('themeLabel'),
};

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
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    elements.themeIcon.textContent = '☀️';
    elements.themeLabel.textContent = 'Jasny';
  } else {
    document.body.classList.remove('light-theme');
    elements.themeIcon.textContent = '🌙';
    elements.themeLabel.textContent = 'Ciemny';
  }
}

function initEventListeners() {
  // Wyszukiwanie
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

  // Wybór gminy
  elements.municipalitySelect.addEventListener('change', (e) => {
    state.filters.municipality = e.target.value;
    applyFilters();
  });

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

  // Kliknięcie w karty statystyk (Szybkie filtry)
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
    elements.municipalitySelect.value = 'all';
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
    renderChannelsModal();
    applyFilters();
  } catch (err) {
    console.error('Błąd podczas ładowania danych:', err);
    showToast('❌ Błąd połączenia z serwerem API');
  }
}

function renderChannelsModal() {
  if (!state.channels || !elements.channelsGrid) return;
  elements.channelsGrid.innerHTML = '';

  state.channels.municipalities.forEach(ch => {
    const item = document.createElement('div');
    item.className = 'muni-channel-item';
    item.innerHTML = `
      <div>
        <div class="muni-name">${escapeHtml(ch.municipality)}</div>
        <span class="muni-topic">Temat: ${escapeHtml(ch.topic)}</span>
      </div>
      <a href="${escapeHtml(ch.url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" title="Otwórz kanał ${escapeHtml(ch.municipality)} w ntfy">
        🔔 Subskrybuj
      </a>
    `;
    elements.channelsGrid.appendChild(item);
  });
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
  select.innerHTML = '<option value="all">Wszystkie samorządy powiatu tureckiego</option>';

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
    // Filtr samorządu
    if (municipality !== 'all' && m.municipality.toLowerCase() !== municipality.toLowerCase()) {
      return false;
    }
    // Filtr typu
    if (type !== 'all' && m.type.toLowerCase() !== type.toLowerCase()) {
      return false;
    }
    // Filtr czasu
    const mDate = m.date.slice(0, 10);
    if (timeFilter === 'upcoming' && mDate < todayStr) {
      return false;
    }
    if (timeFilter === 'past' && mDate >= todayStr) {
      return false;
    }
    // Wyszukiwarka
    if (q) {
      const fullText = `${m.title} ${m.municipality} ${m.date} ${m.type} ${m.url}`.toLowerCase();
      if (!fullText.includes(q)) return false;
    }
    return true;
  });

  // Sortowanie (Domyślnie date_desc - od najnowszych do najstarszych)
  state.filteredMeetings.sort((a, b) => {
    if (sort === 'date_asc') return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date);
  });

  renderMeetings();
}

function renderMeetings() {
  const count = state.filteredMeetings.length;
  elements.resultsCount.innerHTML = `Znaleziono: <strong>${count}</strong> ${getPolishPlural(count, 'posiedzenie', 'posiedzenia', 'posiedzeń')}`;

  const isEmpty = count === 0;
  elements.emptyState.classList.toggle('hidden', !isEmpty);
  elements.cardsContainer.classList.toggle('hidden', isEmpty || state.filters.view !== 'cards');
  elements.tableContainer.classList.toggle('hidden', isEmpty || state.filters.view !== 'table');

  if (isEmpty) return;

  if (state.filters.view === 'cards') {
    renderCardsView();
  } else {
    renderTableView();
  }
}

function renderCardsView() {
  elements.cardsContainer.innerHTML = '';

  state.filteredMeetings.forEach(m => {
    const card = document.createElement('div');
    card.className = 'meeting-card';

    const typeClass = m.type.toLowerCase().includes('sesj') ? 'sesja' : 'komisja';
    const countdown = getCountdown(m.date);
    const googleCalUrl = createGoogleCalendarLink(m);

    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="municipality-tag">${escapeHtml(m.municipality)}</span>
          <span class="type-tag ${typeClass}">${escapeHtml(m.type)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(m.title)}</h3>
      </div>

      <div>
        <div class="card-meta">
          <div class="datetime-box">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${formatHumanDate(m.date)}</span>
          </div>
          <span class="countdown-pill ${countdown.pillClass}">${countdown.label}</span>
        </div>

        <div class="card-actions">
          <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener" class="card-btn card-btn-link" title="Przejdź do oficjalnego źródła BIP">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            BIP / Źródło
          </a>
          <a href="${googleCalUrl}" target="_blank" rel="noopener" class="card-btn card-btn-cal" title="Dodaj wydarzenie do Kalendarza Google">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
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

    tr.innerHTML = `
      <td style="white-space: nowrap;">
        <strong>${formatHumanDate(m.date)}</strong>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
          <span class="countdown-pill ${countdown.pillClass}" style="font-size: 0.7rem; padding: 1px 6px;">${countdown.label}</span>
        </div>
      </td>
      <td><strong>${escapeHtml(m.municipality)}</strong></td>
      <td><span class="type-tag ${typeClass}">${escapeHtml(m.type)}</span></td>
      <td>${escapeHtml(m.title)}</td>
      <td><span style="font-size: 0.8rem; font-weight: 600; color: #4ade80;">${escapeHtml(m.status)}</span></td>
      <td>
        <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener" class="card-btn card-btn-link" style="padding: 4px 10px; font-size: 0.75rem;">
          Otwórz BIP &rarr;
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
  elements.syncIcon.classList.add('spin');
  showToast('🔄 Rozpoczęto synchronizację z biuletynami BIP...');

  try {
    const res = await fetch('/api/sync', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      showToast(`✅ Zsynchronizowano! Sprawdzono ${data.totalProcessed} pozycji (Nowe: ${data.totalNew}, Zmiany: ${data.totalUpdated})`);
      await loadData();
    } else {
      showToast(`❌ Błąd: ${data.error || 'Nieznany błąd'}`);
    }
  } catch (err) {
    showToast(`❌ Błąd połączenia z serwerem synchronizacji`);
  } finally {
    state.isSyncing = false;
    elements.btnSync.disabled = false;
    elements.syncIcon.classList.remove('spin');
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 4500);
}

// Pomocnicze funkcje formatujące
function formatHumanDate(dateStr) {
  if (!dateStr) return 'Termin do ustalenia';
  try {
    const parts = dateStr.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] ? ` godz. ${parts[1]}` : '';

    const d = new Date(datePart);
    if (isNaN(d.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${formatter.format(d)}${timePart}`;
  } catch {
    return dateStr;
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

function getPolishPlural(n, one, few, many) {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
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
