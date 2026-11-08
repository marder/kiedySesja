import { MeetingDatabase } from '../db/database.js';
import { generateMeetingId } from './hashService.js';
import { NotificationService } from './notificationService.js';
import { Meeting, RawMeeting } from '../types/index.js';
import { getPolishTodayStr } from '../utils/dateParser.js';

export interface ProcessResult {
  total: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  notificationsSent: number;
}

export class MeetingService {
  constructor(
    private db: MeetingDatabase,
    private notifications: NotificationService
  ) {}

  /**
   * Sprawdza, czy dane posiedzenie kwalifikuje się do natychmiastowego wysłania alertu PUSH.
   *
   * Ochrona przed spamem i ograniczeniami ntfy.sh:
   * 1. Alertujemy ZAWSZE o posiedzeniach nadchodzących i bieżących (termin >= dzisiaj w czasie polskim).
   * 2. Alertujemy o świeżo opublikowanych posiedzeniach z ostatnich 14 dni.
   * 3. Wpisy archiwalne (sprzed ponad 14-30 dni) są cicho zapisywane do bazy danych
   *    dla celów wyszukiwarki WWW, ale NIE generują powiadomień na telefon.
   */
  private shouldSendAlert(dateStr: string): boolean {
    if (!dateStr) return false;
    try {
      const targetDay = dateStr.slice(0, 10);
      const todayStr = getPolishTodayStr();

      // Nadchodzące / dzisiejsze
      if (targetDay >= todayStr) return true;

      // Świeże archiwalne (maksymalnie 14 dni wstecz)
      const targetDate = new Date(targetDay);
      const todayDate = new Date(todayStr);
      if (isNaN(targetDate.getTime()) || isNaN(todayDate.getTime())) return false;

      const diffMs = todayDate.getTime() - targetDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= 14;
    } catch {
      return false;
    }
  }

  /**
   * Przetwarza listę surowych wpisów posiedzeń pobranych przez scraper:
   * oblicza hash na podstawie unikalnego adresu URL posiedzenia (lub tytułu/daty jako fallback),
   * wykrywa nowości oraz zmiany (termin, godzina, status, tytuł) i wysyła odpowiednie powiadomienia.
   */
  public async processMeetings(rawMeetings: RawMeeting[]): Promise<ProcessResult> {
    const nowIso = new Date().toISOString();
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let notificationsSent = 0;

    for (const raw of rawMeetings) {
      // Unikalny identyfikator: preferujemy kanoniczny URL posiedzenia
      const identifier = raw.url || raw.title || raw.type;
      const meetingId = raw.url
        ? generateMeetingId(raw.municipality, raw.url)
        : generateMeetingId(raw.municipality, identifier, raw.date);

      const existing = this.db.findById(meetingId);

      if (!existing) {
        // Nowy rekord
        const newMeeting: Meeting = {
          id: meetingId,
          municipality: raw.municipality,
          type: raw.type,
          title: raw.title,
          date: raw.date,
          status: raw.status || 'Zaplanowane',
          url: raw.url,
          created_at: nowIso,
          updated_at: nowIso,
        };

        this.db.insert(newMeeting);
        newCount++;

        // Wysyłamy powiadomienie PUSH tylko dla posiedzeń aktualnych / nadchodzących
        if (this.shouldSendAlert(newMeeting.date)) {
          console.log(`[MeetingService] [NOWE - ALERT PUSH] ${newMeeting.municipality} - ${newMeeting.title} (${newMeeting.date})`);
          await this.notifications.send({
            changeType: 'NEW',
            meeting: newMeeting,
          });
          notificationsSent++;
        } else {
          console.log(`[MeetingService] [NOWE - ARCHIWUM] ${newMeeting.municipality} - ${newMeeting.title} (${newMeeting.date}) - pominięto PUSH`);
        }
      } else {
        // Rekord istnieje - weryfikacja czy nastąpiła zmiana w statusie, dacie lub linku/tytule
        const changes: string[] = [];

        if (raw.status && raw.status !== existing.status) {
          changes.push(`Status: "${existing.status}" -> "${raw.status}"`);
        }
        if (raw.date && raw.date !== existing.date) {
          changes.push(`Termin: "${existing.date}" -> "${raw.date}"`);
        }
        if (raw.url && raw.url !== existing.url) {
          changes.push(`Link: "${existing.url}" -> "${raw.url}"`);
        }
        if (raw.title && raw.title !== existing.title && raw.title.length > existing.title.length) {
          changes.push(`Tytuł: "${existing.title}" -> "${raw.title}"`);
        }

        if (changes.length > 0) {
          const updatedMeeting: Meeting = {
            ...existing,
            title: raw.title || existing.title,
            type: raw.type || existing.type,
            status: raw.status || existing.status,
            date: raw.date || existing.date,
            url: raw.url || existing.url,
            updated_at: nowIso,
          };

          this.db.update(updatedMeeting);
          updatedCount++;

          const changesSummary = changes.join('\n');
          console.log(`[MeetingService] [AKTUALIZACJA] ${updatedMeeting.municipality} - ${updatedMeeting.title}:\n${changesSummary}`);

          // Powiadamiamy o zmianach jeśli posiedzenie jest nadchodzące lub świeże
          if (this.shouldSendAlert(updatedMeeting.date)) {
            await this.notifications.send({
              changeType: 'UPDATE',
              meeting: updatedMeeting,
              previousMeeting: existing,
              changesSummary,
            });
            notificationsSent++;
          }
        } else {
          unchangedCount++;
        }
      }
    }

    return {
      total: rawMeetings.length,
      newCount,
      updatedCount,
      unchangedCount,
      notificationsSent,
    };
  }
}

