export type UserRole =
  | 'admin'
  | 'direction'
  | 'etudes_chef'
  | 'etudes_team'
  | 'realisation_chef'
  | 'realisation_team'
  | 'entretien_chef'
  | 'entretien_team'
  | 'rh_manager'
  | 'rh_agent'

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
  rh_manager: 'Responsable RH',
  rh_agent: 'Agent RH',
}

// Routes each role is allowed to reach — used in middleware
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  admin: ['/admin'],
  direction: ['/admin'],
  etudes_chef: ['/admin/projects', '/admin/documents', '/admin/nc', '/admin/suppliers', '/admin/commercial'],
  etudes_team: ['/admin/projects'],
  realisation_chef: ['/admin/projects', '/admin/nc', '/admin/suppliers', '/admin/reports'],
  realisation_team: ['/admin/projects'],
  entretien_chef: ['/admin/projects', '/admin/nc', '/admin/reports'],
  entretien_team: ['/admin/projects'],
  rh_manager: ['/admin/rh', '/admin/team'],
  rh_agent: ['/admin/rh'],
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (hasFullAccess(role)) return true
  // Dashboard root is always accessible to authenticated users
  if (pathname === '/admin') return true
  return (ROLE_ALLOWED_PREFIXES[role] ?? []).some((prefix) => pathname.startsWith(prefix))
}

// Landing page for a role — used when middleware denies access to a path.
// Always a path the role is allowed to reach, so no redirect loop is possible.
export function roleHome(role: UserRole): string {
  if (hasFullAccess(role)) return '/admin/dashboard'
  return ROLE_ALLOWED_PREFIXES[role]?.[0] ?? '/login'
}

export function canAccessDocuments(role: UserRole): boolean {
  return hasFullAccess(role) || role === 'etudes_chef'
}

export function canAccessNC(role: UserRole): boolean {
  return (
    hasFullAccess(role) ||
    role === 'etudes_chef' ||
    role === 'realisation_chef' ||
    role === 'entretien_chef'
  )
}

export function getTeamLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administration',
    direction: 'Direction',
    etudes_chef: 'Équipe Études',
    etudes_team: 'Équipe Études',
    realisation_chef: 'Équipe Réalisation',
    realisation_team: 'Équipe Réalisation',
    entretien_chef: 'Équipe Entretien',
    entretien_team: 'Équipe Entretien',
    rh_manager: 'Ressources Humaines',
    rh_agent: 'Ressources Humaines',
  }
  return labels[role]
}
