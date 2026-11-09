import * as cheerio from 'cheerio';
import { BaseScraper } from './baseScraper.js';
import { RawMeeting } from '../types/index.js';
import { extractPolishDate } from '../utils/dateParser.js';

/**
 * Scraper dla Biuletynu Informacji Publicznej Starostwa Powiatowego w Turku
 * Źródło: https://bip.powiat.turek.pl/101/Terminarz_sesji/
 */
export class PowiatTurekScraper extends BaseScraper {
  readonly name = 'BIP Powiat Turecki';
  readonly municipality = 'Rada Powiatu Tureckiego';
  private readonly baseUrl = 'https://bip.powiat.turek.pl';
  private readonly scheduleUrl = 'https://bip.powiat.turek.pl/101/Terminarz_sesji/';

  public async scrape(): Promise<RawMeeting[]> {
    console.log(`[${this.name}] Pobieranie terminarza sesji z: ${this.scheduleUrl}`);

    let response = await this.fetchWithTimeout(this.scheduleUrl);
    
    // Jeśli serwer BIP zablokuje stronę główną kodem 403 (np. przez regułę WAF dla IP hostingu VPS),
    // skorzystaj z oficjalnego endpointu XML BIP:
    if (!response.ok && (response.status === 403 || response.status === 401)) {
      console.warn(`[${this.name}] Otrzymano HTTP ${response.status} ze strony HTML, próba pobrania przez endpoint XML...`);
      const xmlUrl = 'https://bip.powiat.turek.pl/xml/101/Terminarz_sesji/';
      const xmlResponse = await this.fetchWithTimeout(xmlUrl);
      if (xmlResponse.ok) {
        response = xmlResponse;
      }
    }

    if (!response.ok) {
      throw new Error(`Błąd HTTP ${response.status} podczas pobierania terminarza Powiatu Tureckiego`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const mapBySession = new Map<string, RawMeeting>();

    $('a').each((_, a) => {
      const href = $(a).attr('href') || '';
      const text = $(a).text().trim();

      // Interesują nas wyłącznie odnośniki do sesji
      if (!href.includes('/101/') && !href.includes('/xml/101/')) return;
      if (!text.toLowerCase().includes('sesji')) return;
      if (text.toLowerCase().startsWith('drukuj') || text.toLowerCase().startsWith('zobacz pełną listę')) return;

      // Wyczyszczenie tytułu
      const cleanTitle = text
        .replace(/^Pobierz dane XML\s+/i, '')
        .replace(/^Drukuj informację\s+/i, '')
        .replace(/\s*\(PDF.*?\)$/i, '')
        .replace(/\s*»\s*$/, '')
        .trim();

      if (cleanTitle.length < 10) return;
      if (cleanTitle.toLowerCase() === 'terminarz sesji') return;

      // Identyfikator sesji (np. "XXXI", "XXX", "XXIX" itp.)
      const sessionMatch = cleanTitle.match(/(X{1,3}(?:V?I{0,3}|I[VX]))\s+Sesji/i);
      const sessionKey = sessionMatch ? sessionMatch[1].toUpperCase() : cleanTitle;

      // Parsowanie daty
      const date = extractPolishDate(cleanTitle);

      // Przygotowanie stabilnego linku do artykułu informacji w BIP
      let articleUrl = href
        .replace('/xml/101/', '/101/')
        .replace(/\/wersja\/?$/, '/');

      if (!articleUrl.startsWith('http')) {
        articleUrl = `${this.baseUrl}${articleUrl.startsWith('/') ? '' : '/'}${articleUrl}`;
      }

      const existing = mapBySession.get(sessionKey);
      // Preferujemy wpisy z pełniejszym tytułem (zawierającym datę i godzinę)
      if (!existing || cleanTitle.length > existing.title.length) {
        mapBySession.set(sessionKey, {
          municipality: this.municipality,
          type: cleanTitle.toLowerCase().includes('komisj') ? 'Komisja' : 'Sesja',
          title: cleanTitle,
          date,
          status: 'Zaplanowane',
          url: articleUrl,
        });
      }
    });

    const meetings = Array.from(mapBySession.values());
    console.log(`[${this.name}] Pomyślnie sparsowano ${meetings.length} unikalnych sesji.`);
    return meetings;
  }
}
