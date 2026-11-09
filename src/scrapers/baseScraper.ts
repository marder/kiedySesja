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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'pl,en-US;q=0.7,en;q=0.3',
          'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Linux"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
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
