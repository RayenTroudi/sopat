import { StyleSheet } from '@react-pdf/renderer'

export const COLORS = {
  green: '#2D5A27',
  white: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#6B6B6B',
  paper: '#F7F6F2',
}

export const STATIC_COPY = {
  history:
    "Fondée en 2005, SOPAT (Société de Paysage de Tunisie) conçoit et réalise depuis vingt ans des aménagements paysagers haut de gamme pour les secteurs hôtelier, résidentiel, public et institutionnel à travers le bassin méditerranéen et au-delà.",
  values:
    "Excellence, intégrité, respect de l'environnement et passion du végétal guident chacune de nos interventions.",
}

export const baseStyles = StyleSheet.create({
  page:  { padding: 40, fontSize: 11, color: COLORS.ink, fontFamily: 'Helvetica' },
  h1:    { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  h2:    { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  h3:    { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  small: { fontSize: 9, color: COLORS.muted },
})
