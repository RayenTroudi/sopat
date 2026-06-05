export default async function RealisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div>Réalisation — projet {id} — en cours de construction.</div>
}
