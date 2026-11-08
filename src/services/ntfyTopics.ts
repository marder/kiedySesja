/**
 * Definicje kanałów powiadomień ntfy.sh dla Miasta Turek oraz Rady Powiatu Tureckiego
 */

export interface MunicipalityTopicInfo {
  municipality: string;
  topic: string;
  url: string;
  description: string;
}

export const BASE_NTFY_SERVER = 'https://ntfy.sh';
export const GLOBAL_TOPIC = 'sesjeturek_test';

export const MUNICIPALITY_TOPIC_MAP: Record<string, string> = {
  'rada powiatu tureckiego': 'sesjeturek_powiat',
  'starostwo powiatowe w turku': 'sesjeturek_powiat',
  'rada miejska turku': 'sesjeturek_miasto',
  'miasto turek': 'sesjeturek_miasto',
};

/**
 * Zwraca nazwę dedykowanego tematu ntfy dla danej jednostki (Miasto / Powiat)
 */
export function getMunicipalityTopic(municipalityName: string): string {
  const normalized = municipalityName.toLowerCase().trim();
  if (MUNICIPALITY_TOPIC_MAP[normalized]) {
    return MUNICIPALITY_TOPIC_MAP[normalized];
  }

  if (normalized.includes('powiat')) {
    return 'sesjeturek_powiat';
  }
  return 'sesjeturek_miasto';
}

/**
 * Zwraca listę dostępnych kanałów dla Miasta Turek i Powiatu Tureckiego
 */
export function getAllChannels(): { global: MunicipalityTopicInfo; municipalities: MunicipalityTopicInfo[] } {
  const municipalities: MunicipalityTopicInfo[] = [
    {
      municipality: 'Rada Miejska Turku',
      topic: 'sesjeturek_miasto',
      url: `${BASE_NTFY_SERVER}/sesjeturek_miasto`,
      description: 'Sesje Rady Miejskiej i posiedzenia komisji Miasta Turek',
    },
    {
      municipality: 'Rada Powiatu Tureckiego',
      topic: 'sesjeturek_powiat',
      url: `${BASE_NTFY_SERVER}/sesjeturek_powiat`,
      description: 'Sesje i posiedzenia komisji Starostwa Powiatowego w Turku',
    },
  ];

  return {
    global: {
      municipality: 'Miasto i Powiat Turek',
      topic: GLOBAL_TOPIC,
      url: `${BASE_NTFY_SERVER}/${GLOBAL_TOPIC}`,
      description: 'Wspólny kanał powiadomień dla Rady Miejskiej oraz Rady Powiatu Tureckiego',
    },
    municipalities,
  };
}
