import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { TeamGroup } from '@/lib/portfolio/types'
import { ROLE_LABELS } from '@/lib/auth-utils'

const s = StyleSheet.create({
  group:  { marginBottom: 14 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  member: { width: 110, borderWidth: 1, borderColor: COLORS.muted, padding: 6 },
  name:   { fontSize: 10, fontWeight: 700 },
  role:   { fontSize: 9, color: COLORS.muted },
})

export function TeamPage({ team }: { team: TeamGroup[] }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Notre équipe</SectionTitle>
      {team.map((g) => (
        <View key={g.roleKey} style={s.group}>
          <Text style={baseStyles.h3}>{g.labelFr}</Text>
          <View style={s.grid}>
            {g.members.map((m) => (
              <View key={m.id} style={s.member}>
                <Text style={s.name}>{m.name}</Text>
                <Text style={s.role}>{ROLE_LABELS[m.role as keyof typeof ROLE_LABELS]}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Footer pageLabel="Équipe" />
    </Page>
  )
}
