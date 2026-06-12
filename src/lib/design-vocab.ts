// Shared design-concept vocabulary constants for the Design Concept Registry.

export const DESIGN_VOCABULARY_OPTIONS = [
  'méditerranéen',
  'tropical',
  'minimaliste',
  'contemporain',
  'traditionnel local',
  'bioclimatique',
  'japonais',
  'luxe sobre',
  'écologique',
  'urbain',
  'sensoriel',
  'autre',
] as const

export const PLANT_PALETTE_OPTIONS = [
  'végétaux locaux',
  'palette xérophyte',
  'palette tropicale',
  'palette méditerranéenne',
  'intérieur tropical',
  'faible empreinte hydrique',
  'biodiversité locale',
  'plantes endémiques',
  'autre',
] as const

export type DesignVocab = (typeof DESIGN_VOCABULARY_OPTIONS)[number]
export type PlantPalette = (typeof PLANT_PALETTE_OPTIONS)[number]

export const PROJECT_TYPE_LABEL_FR: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public:           'Espace public',
  siege_social:            'Siège social',
  hotelier_touristique:    'Hôtelier & touristique',
  residentiel:             'Résidentiel',
  interieur:               'Intérieur',
}

export const PROJECT_TYPE_ICON: Record<string, string> = {
  ingenierie_territoriale: '🗺️',
  espace_public:           '🌳',
  siege_social:            '🏢',
  hotelier_touristique:    '🏨',
  residentiel:             '🏡',
  interieur:               '🪴',
}

export const PROJECT_TYPE_VALUES = [
  'ingenierie_territoriale',
  'espace_public',
  'siege_social',
  'hotelier_touristique',
  'residentiel',
  'interieur',
] as const
