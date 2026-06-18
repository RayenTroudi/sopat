// src/lib/dms/codes.ts
// Canonical coding system from LIS-MI-01 (SOPAT internal document register)

export const TYPE_CODES = ['LIS', 'PRS', 'PRC', 'INS', 'FOR', 'ORG', 'PLA'] as const
export type TypeCode = (typeof TYPE_CODES)[number]

export const PROCESS_CODES = ['MI', 'RH', 'CO', 'RE', 'ET', 'AC'] as const
export type ProcessCode = (typeof PROCESS_CODES)[number]

export const TYPE_LABELS: Record<TypeCode, string> = {
  LIS: 'Liste',
  PRS: 'Processus',
  PRC: 'Procédure',
  INS: 'Instruction',
  FOR: 'Formulaire / Fiche',
  ORG: 'Document organisationnel',
  PLA: 'Plan',
}

export const PROCESS_LABELS: Record<ProcessCode, string> = {
  MI: 'Management Intégré / Qualité',
  RH: 'Ressources Humaines',
  CO: 'Commercial',
  RE: 'Réalisation & Entretien',
  ET: 'Étude',
  AC: 'Achat',
}

// CODE_REGEX matches TYPE-PROCESS-NN or TYPE-PROCESS-NN-VA
const CODE_REGEX = /^(LIS|PRS|PRC|INS|FOR|ORG|PLA)-(MI|RH|CO|RE|ET|AC)-(\d{2})(-VA)?$/

export function isValidCode(code: string): boolean {
  return CODE_REGEX.test(code)
}

export function parseCode(code: string): { type: TypeCode; process: ProcessCode; seq: number; va: boolean } | null {
  const m = CODE_REGEX.exec(code)
  if (!m) return null
  return {
    type:    m[1] as TypeCode,
    process: m[2] as ProcessCode,
    seq:     parseInt(m[3], 10),
    va:      m[4] === '-VA',
  }
}

export function buildCode(type: TypeCode, process: ProcessCode, seq: number, va = false): string {
  return `${type}-${process}-${String(seq).padStart(2, '0')}${va ? '-VA' : ''}`
}
