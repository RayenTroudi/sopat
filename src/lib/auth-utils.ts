export type UserRole =
  | 'admin'
  | 'direction'
  | 'etudes_chef'
  | 'etudes_team'
  | 'realisation_chef'
  | 'realisation_team'
  | 'entretien_chef'
  | 'entretien_team'

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

export function isDirection(role: UserRole): boolean {
  return role === 'direction'
}

// Admin and direction see everything
export function hasFullAccess(role: UserRole): boolean {
  return role === 'admin' || role === 'direction'
}

export function canAccessEtudes(role: UserRole): boolean {
  return hasFullAccess(role) || role === 'etudes_chef' || role === 'etudes_team'
}

export function canAccessRealisation(role: UserRole): boolean {
  return hasFullAccess(role) || role === 'realisation_chef' || role === 'realisation_team'
}

export function canAccessEntretien(role: UserRole): boolean {
  return hasFullAccess(role) || role === 'entretien_chef' || role === 'entretien_team'
}

export function isChef(role: UserRole): boolean {
  return role === 'etudes_chef' || role === 'realisation_chef' || role === 'entretien_chef'
}

// What the role label should read in French
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  direction: 'Direction',
  etudes_chef: "Chef d'études",
  etudes_team: "Équipe études",
  realisation_chef: 'Chef de réalisation',
  realisation_team: 'Équipe réalisation',
  entretien_chef: "Chef d'entretien",
  entretien_team: "Équipe entretien",
}

// Routes each role is allowed to reach — used in middleware
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  admin: ['/admin'],
  direction: ['/admin'],
  etudes_chef: ['/admin/projects', '/admin/documents', '/admin/nc', '/admin/suppliers'],
  etudes_team: ['/admin/projects'],
  realisation_chef: ['/admin/projects', '/admin/nc', '/admin/suppliers', '/admin/reports'],
  realisation_team: ['/admin/projects'],
  entretien_chef: ['/admin/projects', '/admin/nc', '/admin/reports'],
  entretien_team: ['/admin/projects'],
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (hasFullAccess(role)) return true
  // Dashboard root is always accessible to authenticated users
  if (pathname === '/admin') return true
  return ROLE_ALLOWED_PREFIXES[role].some((prefix) => pathname.startsWith(prefix))
}
