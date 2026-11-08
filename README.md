# KiedySesja – Serwis WWW & Agregator Terminarzy Miasta i Powiatu Tureckiego

Nowoczesny serwis internetowy oraz mikroserwis backendowy w **Node.js + TypeScript**, agregujący terminarze sesji i komisji **Rady Miejskiej Turku** oraz **Rady Powiatu Tureckiego**. System automatycznie monitoruje oficjalne biuletyny BIP oraz systemy rad (m.in. System Rada), wykrywa nowe i zaktualizowane posiedzenia oraz udostępnia dane przez responsywny interfejs WWW (SPA), API REST, kalendarz iCalendar (.ics) oraz powiadomienia push (ntfy.sh / SMTP).

---

## 🌐 Funkcjonalności Serwisu WWW

* **Nowoczesny Dashboard (SPA):**
  * Liczniki posiedzeń KPI (wszystkie, nadchodzące, sesje rady, posiedzenia komisji).
  * Przełącznik motywów: domyślny **Dark Mode** oraz **Light Mode** z zapamiętywaniem wyboru w `localStorage`.
  * Obsługa kluczowych jednostek samorządowych:
    * **Rada Miejska Turku** (Urząd Miejski w Turku – System Rada)
    * **Rada Powiatu Tureckiego** (Starostwo Powiatowe w Turku – Biuletyn Informacji Publicznej)
* **Filtrowanie i Wyszukiwanie:**
  * Wyszukiwarka na żywo (tytuł, temat, numer sesji, komisja).
  * Wybór samorządu (Wszystkie / Miasto Turek / Powiat Turecki).
  * Filtry czasu: *Wszystkie* / *Nadchodzące* / *Archiwalne*.
  * Filtry typu: *Wszystkie typy* / *Tylko Sesje* / *Tylko Komisje*.
  * Sortowanie chronologiczne: od najnowszych do najstarszych (domyślnie) lub rosnąco od najbliższych/najstarszych.
* **Widoki i Akcje:**
  * **Siatka kart:** Czytelne karty posiedzeń z dynamicznym odliczaniem (*"Za X dni"*, *"Jutro"*, *"Dzisiaj"*, *"Zakończone"*), bezpośrednim linkiem do BIP/źródła oraz przyciskiem dodania do Kalendarza Google.
  * **Widok tabeli:** Zwięzłe, tabelaryczne zestawienie dla szybkiego przeglądu.
* **Integracje & Eksport:**
  * 🔄 **Synchronizacja na żądanie:** Przycisk *"Synchronizuj z BIP"* wywołujący natychmiastowe scrapowanie w tle.
  * 📅 **Eksport iCalendar (.ics):** Bezpośredni eksport całego terminarza do Outlooka, Apple Calendar lub Google Calendar.
  * 🔔 **Powiadomienia Push (ntfy.sh):**
    * Kanał wspólny: `https://ntfy.sh/sesjeturek_test`
    * Kanał Miasto Turek: `https://ntfy.sh/sesjeturek_miasto`
    * Kanał Powiat Turecki: `https://ntfy.sh/sesjeturek_powiat`
    * **Inteligentna wysyłka:** PUSH jest wysyłany wyłącznie dla posiedzeń bieżących, nadchodzących lub świeżo opublikowanych (ostatnie 14 dni), zapobiegając spamowaniu starszymi archiwaliami.

---

## 🔌 API REST

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/api/meetings` | Lista posiedzeń z parametrami filtrującymi (`?municipality=...&type=...&timeFilter=all&sort=date_desc&q=...`) |
| `GET` | `/api/stats` | Statystyki globalne i wg samorządów |
| `GET` | `/api/municipalities` | Lista samorządów z liczbą przypisanych posiedzeń |
| `GET` | `/api/channels` | Lista skonfigurowanych kanałów ntfy.sh (zbiorczy oraz dedykowane) |
| `POST` | `/api/sync` | Wymuszenie uruchomienia scraperów |
| `GET` | `/api/export/ics` | Eksport terminarza w standardzie iCalendar (`.ics`) |
| `GET` | `/api/export/json` | Pobranie kompletnej bazy w formacie JSON |

---

## 🚀 Uruchomienie lokalne

### 1. Instalacja zależności
```bash
npm install
```

### 2. Konfiguracja zmiennych środowiskowych
Skopiuj plik `.env.example` do `.env` i uzupełnij opcjonalne dane (np. konfigurację powiadomień e-mail SMTP lub alternatywny port):
```bash
cp .env.example .env
```

### 3. Uruchomienie aplikacji w trybie deweloperskim
```bash
npm run serve
```
Aplikacja uruchomi się pod adresem: **http://localhost:3000**

### 4. Kompilacja i start produkcyjny
```bash
npm run build
npm start
```

### 5. Samodzielny worker synchronizujący
```bash
npm run worker
```

---

## ⏱️ Automatyczne Skanowanie w Tle (Auto-Sync)

Aplikacja posiada **wbudowany automatyczny harmonogram (Auto-Sync)** i nie wymaga konfiguracji zewnętrznego Crona:
* **Domyślne działanie:** Po uruchomieniu serwera (`npm start` lub `npm run serve`), system samoczynnie przeprowadza pierwsze sprawdzenie biuletynów BIP po 5 sekundach od startu, a następnie powtarza je cyklicznie co **30 minut**.
* **Konfiguracja w pliku `.env`:**
  ```env
  AUTO_SYNC_ENABLED=true        # włączenie/wyłączenie timera
  SYNC_INTERVAL_MINUTES=30      # częstotliwość skanowania w minutach
  ```
* **Opcjonalnie (samodzielny worker pod Linux Cron):**
  Jeśli wolisz wyłączyć wbudowany timer w serwerze i zarządzać zadaniami przez systemowy Cron na VPS:
  ```cron
  # Sprawdzanie co 30 minut
  */30 * * * * cd /sciezka/do/sesjeTurek && /usr/bin/npm run worker >> /var/log/sesje-turek.log 2>&1
  ```

---

## 🧪 Testy

```bash
npm test         # Testy jednostkowe parserów i logiki bazy
npm run test:live # Testy canary sprawdzające scrapery na żywych źródłach
```
