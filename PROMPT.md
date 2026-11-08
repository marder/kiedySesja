# Prompt: Mikroserwis do agregacji terminarzy samorządowych

**System Role:** Jesteś ekspertem backendu w środowisku Node.js i TypeScript. Piszesz czysty, modularny i odporny na błędy kod przeznaczony do uruchomienia na lekkim VPS-ie (np. jako usługa systemd lub zadanie cron). Stawiasz na rozwiązania natywne, minimalizując zewnętrzne zależności.

## Cel projektu
Napisz mikroserwis (worker działający w tle), który agreguje terminarze sesji i komisji z różnych stron samorządowych, wykrywa nowe posiedzenia oraz zmiany statusu, a następnie wysyła powiadomienia do subskrybentów.

## Stos technologiczny
* **Środowisko:** Node.js (v18+) + TypeScript
* **Baza danych:** SQLite (użyj `better-sqlite3` dla wydajności i synchroniczności)
* **Żądania HTTP:** WYŁĄCZNIE natywne Node.js `fetch API` (zakaz używania axios/request)
* **Parsowanie HTML:** `cheerio` (dla starszych BIP-ów)
* **Powiadomienia:** `nodemailer` (SMTP) oraz natywne żądania `fetch` POST dla `ntfy.sh`
* **Harmonogramowanie:** Skrypt ma być napisany jako jednorazowy "strzał" (idealny pod systemowy cron), ale z przejrzystą strukturą uruchamiającą główną funkcję.

## Źródła danych do obsłużenia
Należy przygotować architekturę zdolną obsłużyć trzy różne strategie pozyskiwania danych:

1. **Strategia JSON / API (System e-Sesja - dynamiczne SPA):**
   * Brudzew: `https://gminabrudzew.esesja.pl/posiedzenia`
   * Dobra: `https://dobra.esesja.pl/posiedzenia`
2. **Strategia Scrapowania HTML (Klasyczne BIP-y - tabele/listy):**
   * Powiat Turecki: `https://bip.powiat.turek.pl/101/Terminarz_sesji/`
   * Tuliszków Komisje: `https://bip.tuliszkow.pl/kategorie/18-informacje-o-posiedzeniu-komisji`
   * Tuliszków Sesje: `https://bip.tuliszkow.pl/kategorie/17-zawiadomienia-o-sesji`
3. **Strategia Mieszana/Niestandardowa (Dedykowane moduły/Posiedzenia.tv):**
   * Miasto Turek: `https://rada.miastoturek.pl/kalendarz-posiedzen`
   * Władysławów: `https://wladyslawow.posiedzenia.tv/`
   * Malanów: `https://rada.malanow.pl/`

## Wymagania architektoniczne i logika biznesowa

1. **Baza danych:** 
   Zaprojektuj schemat SQLite (tabela `meetings`) zawierający: `id` (hash), `municipality` (string), `type` (Sesja/Komisja), `title` (string), `date` (datetime/string), `status` (string), `url` (string), `created_at`, `updated_at`.

2. **Detekcja zmian (Core Logic):**
   * Dla każdego pobranego z sieci elementu wygeneruj unikalny hash (SHA-256 lub MD5) bazujący na kombinacji: `gmina + tytuł/typ + oryginalna data`.
   * Zweryfikuj w bazie, czy dany hash istnieje.
   * **Brak rekordu:** Zapisz do DB jako nowe posiedzenie. Wyzwól powiadomienie "Nowe posiedzenie".
   * **Rekord istnieje:** Porównaj kluczowe pola (szczególnie `status` lub zmianę godziny). Jeśli wykryjesz modyfikację, zaktualizuj wpis w DB i wyzwól powiadomienie "Aktualizacja posiedzenia".

3. **Moduł Notyfikacji:**
   * Utwórz ujednolicony serwis powiadomień.
   * Metoda `send()` ma wysyłać alerty równolegle przez:
     - `Nodemailer` (przygotuj przykładową konfigurację pod dowolny serwer SMTP).
     - HTTP POST za pomocą natywnego `fetch` na adres `https://ntfy.sh/radypowiatuturek_test`.

4. **Odporność na błędy (Fault Tolerance):**
   * Każdy scraper musi być uruchamiany w izolacji (np. przez `Promise.allSettled`).
   * Zmiana struktury HTML Tuliszkowa nie może zablokować pobierania danych z e-Sesji Dobrej. Loguj błędy do konsoli (lub pliku), ale kontynuuj działanie całego workera.

## Oczekiwany rezultat od AI

1. Kompletny plik `package.json` z niezbędnymi zależnościami (`better-sqlite3`, `cheerio`, `nodemailer`, `typescript` itd.).
2. Drzewo katalogów (np. `src/scrapers/`, `src/db/`, `src/services/`).
3. Kod źródłowy inicjalizacji bazy i głównego kontrolera logicznego.
4. Kod serwisu powiadomień.
5. **Implementacja dwóch wzorcowych scraperów:**
   * Zbuduj w pełni funkcjonalny scraper dla strategii JSON (np. Dobra/Brudzew).
   * Zbuduj wzorcowy scraper HTML dla klasycznego BIP (np. Tuliszków), pokazujący jak użyć `cheerio` i natywnego `fetch`.
   Resztę scraperów dodam analogicznie na podstawie Twoich wzorców. Zadbaj o mocne typowanie w TypeScript.