import assert from 'node:assert/strict';
import { PowiatTurekScraper } from '../scrapers/powiatTurekScraper.js';
import { MiastoTurekScraper } from '../scrapers/miastoTurekScraper.js';
import { Scraper } from '../types/index.js';


async function runLiveCanaryTests() {
  console.log('='.repeat(60));
  console.log('🧪 URUCHOMIENIE TESTÓW KONTRAKTOWYCH NA ŻYWO (CANARY / SMOKE)');
  console.log('='.repeat(60));

  const scrapers: Scraper[] = [
    new PowiatTurekScraper(),
    new MiastoTurekScraper(),
  ];


  let passed = 0;
  let failed = 0;

  for (const scraper of scrapers) {
    const startTime = Date.now();
    try {
      console.log(`\n[CANARY] Testowanie: ${scraper.name} (${scraper.municipality})...`);
      const results = await scraper.scrape();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      assert.ok(Array.isArray(results), 'Wynik scrapera musi być tablicą');
      assert.ok(results.length > 0, `Scraper zwrócił 0 wyników! Możliwa zmiana szablonu BIP.`);

      // Walidacja kontraktu każdego posiedzenia
      const seenUrls = new Set<string>();
      for (const m of results) {
        assert.ok(m.title && m.title.length >= 3, `Niepoprawny tytuł: "${m.title}"`);
        assert.ok(m.url && m.url.startsWith('http'), `Niepoprawny URL: "${m.url}"`);
        assert.match(m.date, /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/, `Niepoprawny format daty: "${m.date}"`);

        // Sprawdzamy czy data nie jest z odległej przyszłości (> 1 rok)
        const year = Number(m.date.slice(0, 4));
        const currentYear = new Date().getFullYear();
        assert.ok(year >= 2024 && year <= currentYear + 1, `Podejrzany rok sesji: ${year}`);

        seenUrls.add(m.url);
      }

      console.log(`✅ [PASS] ${scraper.name}: sparsowano ${results.length} posiedzeń w ${elapsed}s (unikalnych URL: ${seenUrls.size})`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${scraper.name}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`PODSUMOWANIE CANARY: Zaliczone: ${passed} | Nieudane: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveCanaryTests().catch((err) => {
  console.error('Błąd wykonania canary:', err);
  process.exit(1);
});
