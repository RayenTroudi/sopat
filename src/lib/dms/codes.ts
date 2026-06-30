// src/lib/dms/codes.ts
// Canonical coding system from LIS-MI-01 (SOPAT internal document register)

// All codes that exist in the system (including legacy ISN for display/filtering)
export const TYPE_CODES = ['FOR', 'INS', 'ISN', 'LIS', 'ORG', 'PLA', 'PRC', 'PRS'] as const
export type TypeCode = (typeof TYPE_CODES)[number]

// Codes available when creating new documents (ISN is legacy — new instructions use INS)
export const CREATABLE_TYPE_CODES = ['FOR', 'INS', 'LIS', 'ORG', 'PLA', 'PRC', 'PRS'] as const
export type CreatableTypeCode = (typeof CREATABLE_TYPE_CODES)[number]

export const PROCESS_CODES = ['AC', 'CO', 'ET', 'MI', 'MQ', 'RE', 'RH'] as const
export type ProcessCode = (typeof PROCESS_CODES)[number]

export const TYPE_LABELS: Record<TypeCode, string> = {
  FOR: 'Formulaire / Fiche',
  INS: 'Instruction',
  ISN: 'Instruction (ancien)',
  LIS: 'Liste / Enregistrement',
  ORG: 'Document organisationnel',
  PLA: 'Plan',
  PRC: 'Procédure',
  PRS: 'Processus',
}

export const PROCESS_LABELS: Record<ProcessCode, string> = {
  AC:  'Achat',
  CO:  'Commercial',
  ET:  'Étude',
  MI:  'Management Intégré',
  MQ:  'Management Qualité',
  RE:  'Réalisation & Entretien',
  RH:  'Ressources Humaines',
}

// Auto-derive category from type code
export const TYPE_TO_CATEGORY: Record<TypeCode, string> = {
  FOR: 'formulaire',
  INS: 'instruction',
  ISN: 'instruction',
  LIS: 'enregistrement',
  ORG: 'procedure',
  PLA: 'plan_qualite',
  PRC: 'procedure',
  PRS: 'cartographie_processus',
}

// Auto-derive department from process code
export const PROCESS_TO_DEPARTMENT: Record<ProcessCode, string> = {
  AC:  'finance',
  CO:  'etudes',
  ET:  'etudes',
  MI:  'qualite',
  MQ:  'qualite',
  RE:  'realisation',
  RH:  'rh',
}

// Auto-derive ISO clauses from type code
export const TYPE_TO_ISO_CLAUSES: Record<TypeCode, string[]> = {
  FOR: ['7.5'],
  INS: ['7.5'],
  ISN: ['7.5'],
  LIS: ['7.5'],
  ORG: ['5.1', '5.2'],
  PLA: ['6.1', '6.2'],
  PRC: ['7.5'],
  PRS: ['4.4'],
}

// CODE_REGEX matches TYPE-PROCESS-NN or TYPE-PROCESS-NN-VA
const CODE_REGEX = /^(FOR|INS|ISN|LIS|ORG|PLA|PRC|PRS)-(AC|CO|ET|MI|MQ|RE|RH)-(\d{2,3})(-VA)?$/

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
