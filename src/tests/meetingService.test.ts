import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MeetingDatabase } from '../db/database.js';
import { MeetingService } from '../services/meetingService.js';
import { NotificationPayload, RawMeeting } from '../types/index.js';

class SpyNotificationService {
  public sent: NotificationPayload[] = [];
  async send(payload: NotificationPayload): Promise<void> {
    this.sent.push(payload);
  }
}

describe('MeetingService — integralność danych i wykrywanie zmian', () => {
  it('nie koliduje przy dwóch różnych komisjach o tej samej dacie i godzinie', async () => {
    const db = new MeetingDatabase(':memory:');
    const spy = new SpyNotificationService();
    const service = new MeetingService(db, spy as any);

    const batch: RawMeeting[] = [
      {
        municipality: 'Rada Miejska Turku',
        type: 'Komisja',
        title: 'Posiedzenie komisji',
        date: '2026-12-10 16:00',
        status: 'Zaplanowane',
        url: 'https://rada.miastoturek.pl/posiedzenie/51',
      },
      {
        municipality: 'Rada Miejska Turku',
        type: 'Komisja',
        title: 'Posiedzenie komisji',
        date: '2026-12-10 16:00',
        status: 'Zaplanowane',
        url: 'https://rada.miastoturek.pl/posiedzenie/52',
      },
    ];

    const res1 = await service.processMeetings(batch);
    assert.equal(res1.newCount, 2, 'Obie komisje powinny zostać wstawione');
    assert.equal(db.getAll().length, 2, 'Baza powinna zawierać dokładnie 2 rekordy');

    // Test idempotentności - drugi przebieg na identycznych danych nie powinien nic zmienić
    const res2 = await service.processMeetings(batch);
    assert.equal(res2.newCount, 0, 'Brak nowych wpisów w drugim przebiegu');
    assert.equal(res2.updatedCount, 0, 'Brak aktualizacji w drugim przebiegu (brak pętli ping-pong)');
    assert.equal(db.getAll().length, 2);

    db.close();
  });

  it('poprawnie wykrywa zmianę terminu/godziny posiedzenia i wysyła alert UPDATE', async () => {
    const db = new MeetingDatabase(':memory:');
    const spy = new SpyNotificationService();
    const service = new MeetingService(db, spy as any);

    const original: RawMeeting[] = [
      {
        municipality: 'Gmina Dobra',
        type: 'Sesja',
        title: 'Sesja Rady Miejskiej',
        date: '2026-12-15 10:00',
        status: 'Zaplanowane',
        url: 'https://bip.dobra24.pl/10065/Zawiadomienia_o_sesji/artykul/123',
      },
    ];

    await service.processMeetings(original);
    assert.equal(spy.sent.length, 1);
    assert.equal(spy.sent[0].changeType, 'NEW');

    // Urząd przesuwa godzinę z 10:00 na 13:00 pod tym samym URL
    const updated: RawMeeting[] = [
      {
        ...original[0],
        date: '2026-12-15 13:00',
      },
    ];

    const updateRes = await service.processMeetings(updated);
    assert.equal(updateRes.updatedCount, 1, 'Powinna zostać wykryta 1 aktualizacja');
    assert.equal(updateRes.newCount, 0, 'Nie powinien powstać zduplikowany rekord');
    assert.equal(db.getAll().length, 1, 'Liczba wierszy w bazie pozostaje 1');

    assert.equal(spy.sent.length, 2);
    assert.equal(spy.sent[1].changeType, 'UPDATE');
    assert.match(spy.sent[1].changesSummary || '', /10:00.*13:00/);

    db.close();
  });

  it('cicho zapisuje archiwalne wpisy bez spamowania powiadomieniami PUSH', async () => {
    const db = new MeetingDatabase(':memory:');
    const spy = new SpyNotificationService();
    const service = new MeetingService(db, spy as any);

    const oldMeetings: RawMeeting[] = [
      {
        municipality: 'Gmina Brudzew',
        type: 'Sesja',
        title: 'I Sesja Rady Gminy',
        date: '2024-05-07 10:00',
        status: 'Zaplanowane',
        url: 'https://brudzew.bip.net.pl/kategorie/62-sesje/artykuly/1',
      },
    ];

    const res = await service.processMeetings(oldMeetings);
    assert.equal(res.newCount, 1);
    assert.equal(db.getAll().length, 1);
    assert.equal(spy.sent.length, 0, 'Archiwalna sesja sprzed miesięcy nie może wysyłać PUSH!');

    db.close();
  });
});
