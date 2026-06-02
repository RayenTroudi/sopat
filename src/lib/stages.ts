export const STAGES: Record<number, { name: string; description: string; color: string }> = {
  1: {
    name: 'Première Consultation',
    description: "Écoute, analyse du site et définition des objectifs du projet avec votre interlocuteur dédié.",
    color: '#3B82F6',
  },
  2: {
    name: 'Études & Conception',
    description: "Plans, rendus 3D, choix des essences et validation du budget avant tout engagement.",
    color: '#F59E0B',
  },
  3: {
    name: 'Réalisation',
    description: "Mise en œuvre par nos équipes terrain avec un suivi qualité rigoureux à chaque étape.",
    color: '#10B981',
  },
  4: {
    name: 'Entretien & Suivi',
    description: "Maintenance régulière pour préserver l'esthétique et la vitalité de votre espace dans la durée.",
    color: '#8B5CF6',
  },
}

export const SHORT_STAGE_NAMES: Record<number, string> = {
  1: 'Consultation',
  2: 'Études',
  3: 'Réalisation',
  4: 'Entretien',
}

export function getStageName(stage: number): string {
  return STAGES[stage]?.name ?? `Étape ${stage}`
}

export function getStageColor(stage: number): string {
  return STAGES[stage]?.color ?? '#6b7280'
}
