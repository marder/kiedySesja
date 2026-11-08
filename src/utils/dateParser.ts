const MONTHS: Record<string, string> = {
  stycznia: '01', styczeń: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecień: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpień: '08',
  września: '09', wrzesień: '09',
  października: '10', październik: '10',
  listopada: '11', listopad: '11',
  grudnia: '12', grudzień: '12',
};

/**
 * Zwraca dzisiejszą datę w polskiej strefie czasowej Europe/Warsaw w formacie YYYY-MM-DD.
 */
export function getPolishTodayStr(refDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(refDate);
}

/**
 * Parsuje polskie daty z tekstu (np. "w dniu 9 listopada 2026 roku, o godz. 10:00",
 * "12.10.2026r.", "23 września 2026") i zwraca format YYYY-MM-DD HH:mm lub YYYY-MM-DD.
 * Jeśli godzina nie występuje w tekście, zwraca samą datę YYYY-MM-DD bez fabrykowania sztucznej godziny.
 */
export function extractPolishDate(text: string, fallbackDate?: string, referenceDate: Date = new Date()): string {
  if (!text) {
    if (fallbackDate) {
      try {
        const d = new Date(fallbackDate);
        if (!isNaN(d.getTime())) {
          return d.toISOString().replace('T', ' ').slice(0, 16);
        }
      } catch {}
      return fallbackDate;
    }
    return getPolishTodayStr(referenceDate);
  }

  // 1. Format numeryczny: DD.MM.YYYY lub DD-MM-YYYY
  const dotMatch = text.match(/(\b\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/);
  let year = '';
  let month = '';
  let day = '';

  if (dotMatch) {
    day = dotMatch[1].padStart(2, '0');
    month = dotMatch[2].padStart(2, '0');
    year = dotMatch[3];
  } else {
    // 2. Format słowny: DD <miesiąc> [YYYY] (rok opcjonalny)
    const wordMatch = text.match(/(\b\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(\d{4}))?/i);
    if (wordMatch) {
      const monthName = wordMatch[2].toLowerCase();
      if (MONTHS[monthName]) {
        day = wordMatch[1].padStart(2, '0');
        month = MONTHS[monthName];
        if (wordMatch[3]) {
          year = wordMatch[3];
        } else {
          // Bezpieczna inferencja roku: jeśli w styczniu parsujemy grudzień, to prawdopodobnie rok ubiegły
          const refYear = referenceDate.getFullYear();
          const refMonth = referenceDate.getMonth() + 1;
          const parsedMonthNum = Number(month);
          if (refMonth === 1 && parsedMonthNum === 12) {
            year = (refYear - 1).toString();
          } else {
            year = refYear.toString();
          }
        }
      }
    }
  }

  // 3. Ekstrakcja godziny (np. godz. 16.00, godz. 10:00, 16:00, o godzinie 16.00)
  // Wcześniejsza normalizacja spacji w PDF-ach ("1 6 . 0 0" -> "16:00")
  const normalizedText = text.replace(/(\d)\s+(\d)\s*[.:]\s*(\d)\s+(\d)/g, '$1$2:$3$4');
  let timeStr: string | null = null;
  const hourMatch = normalizedText.match(/(?:godz\.?|godzinie)\s*(\d{1,2})[.:](\d{2})/i) || normalizedText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hourMatch) {
    const h = Number(hourMatch[1]);
    const m = Number(hourMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }


  if (year && month && day) {
    return timeStr ? `${year}-${month}-${day} ${timeStr}` : `${year}-${month}-${day}`;
  }

  if (fallbackDate) {
    try {
      const d = new Date(fallbackDate);
      if (!isNaN(d.getTime())) {
        return d.toISOString().replace('T', ' ').slice(0, 16);
      }
    } catch {}
    return fallbackDate;
  }

  return getPolishTodayStr(referenceDate);
}

