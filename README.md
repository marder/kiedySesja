# KiedySesja – Serwis WWW & Agregator Terminarzy Powiatu Tureckiego

Kompletny serwis internetowy oraz mikroserwis backendowy w **Node.js + TypeScript**, agregujący terminarze sesji i komisji rad gmin, miasta oraz powiatu tureckiego. System automatycznie monitoruje biuletyny BIP, e-Sesję oraz systemy rad, wykrywa zmiany i publikuje dane przez responsywny portal WWW, API REST oraz powiadomienia push (ntfy.sh / SMTP).

---

## 🌐 Funkcjonalności Serwisu WWW

* **Nowoczesny Dashboard (SPA):**
  * Liczniki posiedzeń (wszystkie, nadchodzące, sesje rady, posiedzenia komisji).
  * Podział na 9 jednostek samorządowych Powiatu Tureckiego:
    * **Rada Powiatu Tureckiego** (Starostwo Powiatowe w Turku)
    * **Rada Miejska Turku** (Miasto Turek)
    * **Gmina i Miasto Tuliszków**
    * **Gmina Dobra**
    * **Gmina Brudzew**
    * **Gmina Malanów**
    * **Gmina Władysławów**
    * **Gmina Przykona**
    * **Gmina Kawęczyn**
* **Filtrowanie i Wyszukiwanie:**
  * Wyszukiwarka na żywo (tytuł, temat, numer sesji, komisja).
  * Wybór konkretnego samorządu.
  * Filtry czasu: *Nadchodzące* / *Archiwalne* / *Wszystkie*.
  * Filtry typu: *Wszystkie* / *Tylko Sesje* / *Tylko Komisje*.
  * Sortowanie chronologiczne od najbliższych terminów lub od najnowszych.
* **Widoki:**
  * **Siatka kart:** Czytelne karty z odliczaniem (*"Za X dni"*, *"Jutro"*, *"Zakończone"*), bezpośrednim linkiem do BIP i przyciskiem *"+ Dodaj do Kalendarza Google"*.
  * **Tabela:** Kompaktowy widok tabelaryczny.
* **Integracje & Eksport:**
  * 🔄 **Przycisk "Synchronizuj z BIP":** Uruchomienie cyklu zbierania danych na żądanie z poziomu przeglądarki.
  * 📅 **Eksport iCalendar (.ics):** Pobieranie terminarza do Outlooka, Apple Calendar lub Google Calendar.
  * 🔔 **Powiadomienia Push w telefonie (ntfy.sh):** 
    * Kanał zbiorczy: `https://ntfy.sh/radypowiatuturek_test`
    * Dedykowane kanały per gmina: `radypowiatuturek_powiat`, `radypowiatuturek_turek`, `radypowiatuturek_tuliszkow`, `radypowiatuturek_dobra`, `radypowiatuturek_brudzew`, `radypowiatuturek_malanow`, `radypowiatuturek_wladyslawow`, `radypowiatuturek_przykona`, `radypowiatuturek_kaweczyn`.
    * **Ochrona przed spamem i limitem 429:** PUSH wysyłany jest wyłącznie dla posiedzeń bieżących, nadchodzących lub świeżo opublikowanych (ostatnie 14 dni). Dane archiwalne zapisywane są po cichu do bazy.

---

## 🔌 API REST

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/api/meetings` | Lista posiedzeń z filtrowaniem (`?municipality=...&type=...&timeFilter=all&sort=date_desc&q=...`) |
| `GET` | `/api/stats` | Statystyki globalne i wg samorządów |
| `GET` | `/api/municipalities` | Lista samorządów z liczbą posiedzeń |
| `GET` | `/api/channels` | Lista dostępnych kanałów ntfy (zbiorczy oraz dedykowane per gmina) |
| `POST` | `/api/sync` | Wymuszenie ponownej synchronizacji scraperów z BIP |
| `GET` | `/api/export/ics` | Plik iCalendar (`.ics`) do importu w kalendarzach |
| `GET` | `/api/export/json` | Pobranie wszystkich danych w formacie JSON |

---

## 🚀 Uruchomienie

### 1. Uruchomienie Serwisu WWW (Frontend + Backend)
```bash
npm run serve
```
lub wersja produkcyjna po kompilacji:
```bash
npm run build
npm start
```
Serwis dostępny jest pod adresem: **http://localhost:3000**

### 2. Uruchomienie samego workera (np. w cronie)
```bash
npm run worker
```

---

## ⏱️ Harmonogramowanie na VPS (Cron)
```cron
# Sprawdzanie co 30 minut
*/30 * * * * cd /sciezka/do/kiedySesja && /usr/bin/npm run worker >> /var/log/kiedy-sesja.log 2>&1
```
