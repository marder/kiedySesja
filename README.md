# KiedySesja – Terminarz Posiedzeń Rady Miejskiej Turku

Nowoczesny serwis internetowy oraz mikroserwis backendowy w **Node.js + TypeScript**, monitorujący oficjalny terminarz sesji i posiedzeń komisji **Rady Miejskiej Turku** (za pośrednictwem oficjalnego portalu System Rada Urzędu Miejskiego w Turku).

System automatycznie wykrywa nowe posiedzenia i aktualizacje terminów, udostępniając dane przez responsywny interfejs WWW (SPA), API REST, kalendarz iCalendar (.ics) oraz powiadomienia push w telefonie (ntfy.sh).

---

## 🌐 Funkcjonalności

* **Dashboard (SPA):**
  * Liczniki KPI: wszystkie, nadchodzące, sesje rady, posiedzenia komisji.
  * Przełącznik motywów: Dark Mode (domyślny) oraz Light Mode.
  * Pełne wsparcie dla urządzeń mobilnych (interfejs zoptymalizowany pod ekrany smartfonów).
* **Filtrowanie i Wyszukiwanie:**
  * Wyszukiwarka na żywo (tytuł, temat, numer sesji, komisja).
  * Filtry czasu: *Wszystkie* / *Nadchodzące* / *Archiwalne*.
  * Filtry typu: *Wszystkie typy* / *Sesje* / *Komisje*.
  * Sortowanie chronologiczne: od najnowszych do najstarszych lub rosnąco.
* **Widoki i Akcje:**
  * **Siatka kart:** Czytelne karty z odliczaniem (*"Za X dni"*, *"Jutro"*, *"Zakończone"*), bezpośrednim linkiem do oficjalnego źródła posiedzenia oraz przyciskiem dodania do Kalendarza Google.
  * **Widok tabeli:** Zwięzłe, tabelaryczne zestawienie dla szybkiego przeglądu.
* **Integracje & Eksport:**
  * 🔄 **Synchronizacja na żądanie:** Przycisk *"Synchronizuj"* w nagłówku.
  * 📅 **Eksport iCalendar (.ics):** Pobieranie terminarza do Apple Calendar, Google Calendar lub Outlooka.
  * 🔔 **Powiadomienia Push w telefonie (ntfy.sh):**
    * Oficjalny kanał: `https://ntfy.sh/kiedy-sesje-turek`
    * Bez rejestracji, bez reklam i bez spamu.

---

## 🔌 API REST

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/api/meetings` | Lista posiedzeń (`?type=...&timeFilter=all&sort=date_desc&q=...`) |
| `GET` | `/api/stats` | Statystyki globalne posiedzeń |
| `GET` | `/api/municipalities` | Liczba posiedzeń |
| `GET` | `/api/channels` | Informacje o kanale ntfy.sh |
| `POST` | `/api/sync` | Wymuszenie natychmiastowej synchronizacji ze źródłem |
| `GET` | `/api/export/ics` | Eksport terminarza w formacie iCalendar (`.ics`) |
| `GET` | `/api/export/json` | Pobranie bazy w formacie JSON |

---

## 🚀 Uruchomienie lokalne

### 1. Instalacja zależności
```bash
npm install
```

### 2. Konfiguracja zmiennych środowiskowych
```bash
cp .env.example .env
```

### 3. Kompilacja i start
```bash
npm run build
npm start
```
Serwis uruchamia się pod adresem: **http://localhost:3001** (lub portem z `.env`).

---

## ⏱️ Automatyczne Skanowanie w Tle (Auto-Sync)

Aplikacja posiada wbudowany harmonogram w tle:
* Po starcie serwera pierwsze sprawdzenie następuje po 5 sekundach.
* Kolejne sprawdzania powtarzają się automatycznie co **30 minut** (konfigurowalne w `.env` przez `SYNC_INTERVAL_MINUTES=30`).

---

## 🧪 Testy

```bash
npm test          # Testy jednostkowe parserów
npm run test:live # Test canary sprawdzający scraper na żywym portalu
```
