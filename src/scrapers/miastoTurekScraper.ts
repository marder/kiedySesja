import * as cheerio from 'cheerio';
import { BaseScraper } from './baseScraper.js';
import { RawMeeting } from '../types/index.js';

/**
 * Scraper dla Miasta Turek (System Rada dla Mieszkańców)
 * Źródło: https://rada.miastoturek.pl/kalendarz-posiedzen
 */
export class MiastoTurekScraper extends BaseScraper {
  readonly name = 'System Rada Miasto Turek';
  readonly municipality = 'Rada Miejska Turku';
  private readonly baseUrl = 'https://rada.miastoturek.pl';
  private readonly calendarUrl = 'https://rada.miastoturek.pl/kalendarz-posiedzen';

  public async scrape(): Promise<RawMeeting[]> {
    console.log(`[${this.name}] Pobieranie kalendarza posiedzeń z: ${this.calendarUrl}`);

    const response = await this.fetchWithTimeout(this.calendarUrl);
    if (!response.ok) {
      throw new Error(`Błąd HTTP ${response.status} podczas pobierania kalendarza Miasta Turek`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const meetings: RawMeeting[] = [];
    const seenUrls = new Set<string>();

    // Na rada.miastoturek.pl każde posiedzenie to osobny blok 'div.border-start'
    // Dzięki temu nie pomijamy sesji i komisji odbywających się tego samego dnia!
    $('div.border-start').each((_, el) => {
      const container = $(el);

      // 1. Link do posiedzenia (np. /posiedzenie/120)
      const linkEl = container.find('a[href*="/posiedzenie/"]').first();
      let meetingUrl = this.calendarUrl;
      if (linkEl.length > 0) {
        const href = linkEl.attr('href') || '';
        meetingUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
      }

      // 2. Tytuł posiedzenia z nagłówka h2/h3
      const titleEl = container.find('h2, h3, .card-title').first();
      let title = titleEl.text().replace(/\s+/g, ' ').trim();

      // 3. Godzina posiedzenia (np. z tagu <small> "17:00")
      const timeMatch = container.text().match(/(\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : '16:00';

      // 4. Data posiedzenia z nadrzędnej karty danego dnia (format: DD-MM-YYYY)
      const dayParent = container.closest('.card, .timeline-content, .timeline-body, li');
      const dateMatch = dayParent.text().match(/(\d{2})-(\d{2})-(\d{4})/);

      if (!dateMatch) return;

      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = dateMatch[3];
      const formattedDate = `${year}-${month}-${day} ${time}`;

      if (!title) {
        title = container.hasClass('border-danger') ? 'Sesja Rady Miejskiej Turku' : 'Posiedzenie Komisji';
      }

      // Jeśli tytuł to ogólne "Posiedzenie komisji" i mamy nagłówek dodatkowy (np. p, small, strong), spróbujmy doprecyzować
      if (title.toLowerCase() === 'posiedzenie komisji') {
        const subtitle = container.find('p, .text-muted, small').not(':has(a)').text().replace(/\s+/g, ' ').trim();
        if (subtitle && subtitle.length > 5 && !subtitle.includes(':') && !subtitle.match(/^\d{2}-\d{2}/)) {
          title = `Posiedzenie komisji - ${subtitle}`;
        }
      }

      // Typ: border-danger to Sesja (czerwona ramka), border-primary to Komisja

      let type = 'Komisja';
      if (container.hasClass('border-danger') || title.toLowerCase().includes('sesj')) {
        type = 'Sesja';
      }

      if (seenUrls.has(meetingUrl)) return;
      seenUrls.add(meetingUrl);

      meetings.push({
        municipality: this.municipality,
        type,
        title,
        date: formattedDate,
        status: 'Zaplanowane',
        url: meetingUrl,
      });
    });

    console.log(`[${this.name}] Pomyślnie sparsowano ${meetings.length} posiedzeń.`);
    return meetings;
  }
}
