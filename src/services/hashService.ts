import { createHash } from 'node:crypto';

/**
 * Generuje unikalny identyfikator hash (SHA-256) na podstawie gminy i kanonicznego adresu URL posiedzenia.
 * Pozwala to na:
 * 1. Brak kolizji, gdy tego samego dnia o tej samej godzinie odbywa się kilka komisji (np. w Turku).
 * 2. Prawidłową detekcję aktualizacji godziny, terminu lub tytułu pod tym samym linkiem.
 * Jeśli URL nie jest dostępny, stosowany jest fallback do tytułu i daty.
 */
export function generateMeetingId(municipality: string, canonicalUrlOrTitle: string, dateFallback?: string): string {
  const normalizedMunicipality = municipality.trim().toLowerCase();
  const normalizedIdentifier = canonicalUrlOrTitle.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedDate = (dateFallback || '').trim().toLowerCase();

  const rawKey = dateFallback
    ? `${normalizedMunicipality}|${normalizedIdentifier}|${normalizedDate}`
    : `${normalizedMunicipality}|${normalizedIdentifier}`;

  return createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

