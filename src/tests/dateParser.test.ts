import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractPolishDate, getPolishTodayStr } from '../utils/dateParser.js';

describe('extractPolishDate & getPolishTodayStr', () => {
  it('poprawnie parsuje format słowny z godziną i rokiem', () => {
    const text = 'Sesja odbędzie się w dniu 29 października 2026 r. o godz. 16:00 w sali obrad';
    const parsed = extractPolishDate(text);
    assert.equal(parsed, '2026-10-29 16:00');
  });

  it('poprawnie parsuje format numeryczny DD.MM.YYYY z godziną po kropce', () => {
    const text = 'Posiedzenie w dniu 15.11.2026 o godzinie 14.30 w urzędzie';
    const parsed = extractPolishDate(text);
    assert.equal(parsed, '2026-11-15 14:30');
  });

  it('nie fabrykuje godziny 10:00, jeśli godzina nie została podana', () => {
    const text = 'Zawiadomienie o sesji Rady Gminy w dniu 25 listopada 2026 r.';
    const parsed = extractPolishDate(text);
    assert.equal(parsed, '2026-11-25');
  });

  it('normalizuje rozstrzelone godziny z PDF ("1 6 . 0 0" -> "16:00")', () => {
    const text = 'dniu 3 listopada 2026 r. o godz. 1 6. 0 0 sesja Rady';
    const parsed = extractPolishDate(text);
    assert.equal(parsed, '2026-11-03 16:00');
  });

  it('bezpiecznie inferuje ubiegły rok dla grudnia, gdy parsujemy w styczniu', () => {
    const text = 'zwołuję posiedzenie na dzień 28 grudnia o godz. 12:00';
    const mockRefDate = new Date('2027-01-10T12:00:00Z');
    const parsed = extractPolishDate(text, undefined, mockRefDate);
    assert.equal(parsed, '2026-12-28 12:00');
  });

  it('poprawnie formatuje dzisiejszą datę w strefie Europe/Warsaw', () => {
    const todayStr = getPolishTodayStr();
    assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/);
  });
});
