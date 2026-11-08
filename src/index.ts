import { MeetingDatabase } from './db/database.js';
import { NotificationService } from './services/notificationService.js';
import { MeetingService } from './services/meetingService.js';
import { Scraper } from './types/index.js';
import { PowiatTurekScraper } from './scrapers/powiatTurekScraper.js';
import { MiastoTurekScraper } from './scrapers/miastoTurekScraper.js';

export async function runSync(db?: MeetingDatabase) {
  console.log('='.repeat(60));
  console.log('Rozpoczcie cyklu synchronizacji terminarzy samorzadowych (Turek i Powiat)');
  console.log(`Czas startu: ${new Date().toLocaleString('pl-PL')}`);
  console.log('='.repeat(60));

  // Inicjalizacja komponentw
  const ownDb = db || new MeetingDatabase();
  const notificationService = new NotificationService();
  const meetingService = new MeetingService(ownDb, notificationService);

  // Lista zarejestrowanych scraperw - tylko Miasto Turek i Powiat Turecki
  const scrapers: Scraper[] = [
    new PowiatTurekScraper(),
    new MiastoTurekScraper(),
  ];

  console.log(`[Worker] Zaladowano ${scrapers.length} scrapery: Rada Miejska Turku oraz Rada Powiatu Tureckiego.`);

  // Uruchomienie scraperw z izolacj bldw przez Promise.allSettled
  const results = await Promise.allSettled(
    scrapers.map(async (scraper) => {
      console.log(`[Worker] Start zadania: ${scraper.name}`);
      const rawMeetings = await scraper.scrape();
      const stats = await meetingService.processMeetings(rawMeetings);
      return { scraperName: scraper.name, stats };
    })
  );

  console.log('\n' + '='.repeat(60));
  console.log('Podsumowanie przebiegu:');
  console.log('='.repeat(60));

  let totalNew = 0;
  let totalUpdated = 0;
  let totalProcessed = 0;

  const summary = results.map((res, index) => {
    const scraperName = scrapers[index].name;
    if (res.status === 'fulfilled') {
      const { stats } = res.value;
      totalProcessed += stats.total;
      totalNew += stats.newCount;
      totalUpdated += stats.updatedCount;
      console.log(
        `[${scraperName}] Zakonczono sukcesem: pobrano ${stats.total}, nowe: ${stats.newCount}, zaktualizowane: ${stats.updatedCount}`
      );
      return { scraperName, success: true, ...stats };
    } else {
      console.error(`[${scraperName}] Blad krytyczny zadania:`, res.reason);
      return { scraperName, success: false, error: (res.reason as Error)?.message || String(res.reason) };
    }
  });

  console.log('-'.repeat(60));
  console.log(`Podsumowanie: Przetworzono lacznie: ${totalProcessed} | Nowe: ${totalNew} | Zaktualizowane: ${totalUpdated}`);
  console.log('='.repeat(60) + '\n');

  return {
    totalProcessed,
    totalNew,
    totalUpdated,
    summary,
  };
}

// Uruchomienie bezporednie z wiersza polecen
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const ownDb = new MeetingDatabase();
  runSync(ownDb)
    .then(() => {
      ownDb.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      ownDb.close();
      process.exit(1);
    });
}


