import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'

const s = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  text: { fontSize: 9, color: COLORS.muted },
})

export function Footer({ pageLabel }: { pageLabel: string }) {
  return (
    <View style={s.wrap} fixed>
      <Text style={s.text}>SOPAT — Société de Paysage de Tunisie</Text>
      <Text style={s.text}>{pageLabel}</Text>
    </View>
  )
}
