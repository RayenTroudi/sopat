import { View, Image, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '32%', height: 110, backgroundColor: '#EEE' },
  img:  { width: '100%', height: '100%', objectFit: 'cover' },
})

export function ImageGrid({ urls, cols = 3 }: { urls: string[]; cols?: number }) {
  const width = `${Math.floor(96 / cols)}%`
  return (
    <View style={s.grid}>
      {urls.map((u, i) => (
        <View key={i} style={[s.cell, { width }]}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={u} style={s.img} />
        </View>
      ))}
    </View>
  )
}
