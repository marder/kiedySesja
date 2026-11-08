export type MeetingType = 'Sesja' | 'Komisja' | 'Inne';

export interface Meeting {
  id: string; // Wygenerowany unikalny hash (SHA-256)
  municipality: string; // np. "Gmina Dobra", "Gmina i Miasto Tuliszków"
  type: MeetingType | string; // 'Sesja' | 'Komisja'
  title: string;
  date: string; // np. '2026-11-20 14:00' lub ISO
  status: string; // np. 'Zaplanowane', 'Odwołane', 'Zakończone'
  url: string;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface RawMeeting {
  municipality: string;
  type: MeetingType | string;
  title: string;
  date: string;
  status: string;
  url: string;
}

export interface MeetingChange {
  isNew: boolean;
  meeting: Meeting;
  previousMeeting?: Meeting;
  changedFields?: string[];
}

export interface Scraper {
  readonly name: string;
  readonly municipality: string;
  scrape(): Promise<RawMeeting[]>;
}

export interface NotificationPayload {
  changeType: 'NEW' | 'UPDATE';
  meeting: Meeting;
  previousMeeting?: Meeting;
  changesSummary?: string;
}
