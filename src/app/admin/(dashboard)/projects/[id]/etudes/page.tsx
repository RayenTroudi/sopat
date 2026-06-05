export default async function EtudesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div>Études — projet {id} — en cours de construction.</div>
}
