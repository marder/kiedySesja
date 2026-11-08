import { config } from '../config/index.js';
import { RawMeeting, Scraper } from '../types/index.js';

export abstract class BaseScraper implements Scraper {
  abstract readonly name: string;
  abstract readonly municipality: string;

  abstract scrape(): Promise<RawMeeting[]>;

  /**
   * Pomocnicza funkcja wykonująca żądanie HTTP przy użyciu wyłącznie natywnego fetch API Node.js,
   * z wbudowanym timeoutem i domyślnymi nagłówkami przeglądarki.
   */
  protected async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.http.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'User-Agent': config.http.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
          'Accept-Language': 'pl,en-US;q=0.7,en;q=0.3',
          'Cache-Control': 'no-cache',
          ...init?.headers,
        },
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
