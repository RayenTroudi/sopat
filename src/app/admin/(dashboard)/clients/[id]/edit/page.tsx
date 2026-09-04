import { redirect } from 'next/navigation'

/**
 * Le profil client se modifie désormais sur place, dans l'onglet « Profil » de sa
 * fiche. Cette route est conservée pour les liens et signets existants : elle
 * renvoie vers la fiche, ouverte en édition.
 *
 * Elle n'affiche plus de formulaire : deux surfaces d'écriture pour le même
 * enregistrement finissent toujours par diverger — un champ ajouté ici, oublié là.
 * C'est exactement ce qui s'était produit, `sectorFreeText` et `clientPotential`
 * étant saisissables mais jamais enregistrés.
 */
export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/admin/clients/${id}?edit=1`)
}
