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

    let response: Response;
    try {
      response = await this.fetchWithTimeout(this.scheduleUrl);
    } catch (err) {
      console.warn(`[${this.name}] Błąd sieci podczas odpytywania BIP: ${(err as Error).message}`);
      return [];
    }

    // Obsługa geoblokady BIP Starostwa Powiatowego (kod 403 z zagranicznych adresów IP np. Hetzner/Mikrus)
    if (!response.ok) {
      if (response.status === 403) {
        console.warn(
          `[${this.name}] Wykryto blokadę geolokalizacyjną BIP (HTTP 403). ` +
          `Serwer BIP odrzucił adres IP zagranicznego data-center. ` +
          `Aby pobierać dane na żywo z tego hostingu, ustaw BIP_PROXY_URL w .env (np. proxy z polskim adresem IP). ` +
          `Serwis kontynuuje pracę na dotychczas zgromadzonych danych.`
        );
        return [];
      }

      console.warn(`[${this.name}] Serwer BIP zwrócił status HTTP ${response.status}`);
      return [];
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
