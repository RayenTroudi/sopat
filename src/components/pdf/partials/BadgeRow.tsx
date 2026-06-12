import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'

const s = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 6 },
  badge: { borderWidth: 1, borderColor: COLORS.white, color: COLORS.white, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, borderRadius: 2 },
})

export function BadgeRow({ labels }: { labels: string[] }) {
  return (
    <View style={s.row}>
      {labels.map((l) => <Text key={l} style={s.badge}>{l}</Text>)}
    </View>
  )
}
