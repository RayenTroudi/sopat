import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'

const s = StyleSheet.create({
  wrap: { borderBottomWidth: 2, borderBottomColor: COLORS.green, paddingBottom: 4, marginBottom: 12 },
  text: { fontSize: 18, fontWeight: 700, color: COLORS.green },
})

export function SectionTitle({ children }: { children: string }) {
  return (
    <View style={s.wrap}><Text style={s.text}>{children}</Text></View>
  )
}
