/**
 * Definicje kanałów powiadomień ntfy.sh dla Rady Miejskiej Turku
 */

export interface MunicipalityTopicInfo {
  municipality: string;
  topic: string;
  url: string;
  description: string;
}

export const BASE_NTFY_SERVER = 'https://ntfy.sh';
export const GLOBAL_TOPIC = 'kiedy-sesje-turek';

export const MUNICIPALITY_TOPIC_MAP: Record<string, string> = {
  'rada miejska turku': 'kiedy-sesje-turek',
  'miasto turek': 'kiedy-sesje-turek',
};

/**
 * Zwraca nazwę tematu ntfy
 */
export function getMunicipalityTopic(municipalityName: string): string {
  const normalized = municipalityName.toLowerCase().trim();
  if (MUNICIPALITY_TOPIC_MAP[normalized]) {
    return MUNICIPALITY_TOPIC_MAP[normalized];
  }
  return GLOBAL_TOPIC;
}

/**
 * Zwraca listę dostępnych kanałów
 */
export function getAllChannels(): { global: MunicipalityTopicInfo; municipalities: MunicipalityTopicInfo[] } {
  const municipalities: MunicipalityTopicInfo[] = [
    {
      municipality: 'Rada Miejska Turku',
      topic: 'kiedy-sesje-turek',
      url: `${BASE_NTFY_SERVER}/kiedy-sesje-turek`,
      description: 'Sesje Rady Miejskiej i posiedzenia komisji Miasta Turek',
    },
  ];

  return {
    global: {
      municipality: 'Rada Miejska Turku',
      topic: GLOBAL_TOPIC,
      url: `${BASE_NTFY_SERVER}/${GLOBAL_TOPIC}`,
      description: 'Kanał powiadomień o posiedzeniach i komisjach Rady Miejskiej Turku',
    },
    municipalities,
  };
}
