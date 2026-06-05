export default async function EntretienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div>Entretien — projet {id} — en cours de construction.</div>
}
