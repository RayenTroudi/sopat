/**
 * Archivage du classeur source d'un bordereau FOR-CO-02.
 *
 * Volontairement SANS `import 'server-only'`, comme `audit-record.ts` et pour
 * la même raison : les scripts de vérification tournent sous tsx, hors du
 * bundler Next, et doivent pouvoir exercer cette politique directement. La
 * protection contre un import client reste assurée par les identifiants
 * Cloudinary, qui ne sont lisibles que côté serveur.
 *
 * ── Pourquoi l'import échoue désormais quand l'archivage échoue ─────────────
 *
 * La première version de ce code attrapait l'erreur, écrivait une ligne dans la
 * console et poursuivait l'import avec `source_file_url = NULL`. C'était le
 * mauvais compromis, pour une raison précise : la dégradation était INVISIBLE.
 * L'utilisateur voyait un import réussi, le bordereau arrivait chiffré dans
 * l'ERP, et personne n'apprenait que la pièce justificative n'existait pas.
 * Le manque ne se découvrait qu'en audit, des mois plus tard, sur le seul
 * document dont on avait besoin.
 *
 * Un contrôle qualité qui se désactive tout seul en silence ne protège rien.
 * Le contrat est donc inversé : par défaut, pas d'archive, pas d'import. Le
 * message dit quoi faire, et rien n'a été écrit — l'utilisateur réessaie quand
 * le stockage répond.
 *
 * ── Ce que la règle n'est PAS ──────────────────────────────────────────────
 *
 * Ce n'est pas « ISO l'exige ». §7.5.3.2 demande la maîtrise de l'information
 * documentée d'origine externe « que l'organisme juge nécessaire » : c'est
 * SOPAT qui décide que le classeur signé en fait partie, pas la norme. Ce
 * module rend cette décision applicable et réversible, il ne l'invente pas.
 *
 * ── La porte de sortie, et pourquoi elle est bruyante ──────────────────────
 *
 * Un environnement sans stockage objet (développement, intégration continue,
 * poste hors ligne) doit pouvoir importer. `BORDEREAU_REQUIRE_SOURCE_ARCHIVE=false`
 * le permet — mais l'import enregistre alors `sourceArchive: 'disabled'` dans
 * les statistiques du registre. La lacune est donc DÉCLARÉE, lisible ligne par
 * ligne, au lieu d'être un NULL qu'on ne sait pas interpréter des années après.
 */
import { uploadBufferToCloudinary } from '@/lib/cloudinary'

export type ArchivedSource = { url: string; publicId: string }

export type ArchiveOutcome =
  | { ok: true; source: ArchivedSource; note: 'stored' }
  /** Archivage volontairement désactivé : l'import continue, la lacune est déclarée. */
  | { ok: true; source: null; note: 'disabled' }
  | { ok: false; error: string }

/** Le stockage objet est-il configuré du tout ? */
export function isArchiveConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  )
}

/**
 * Vrai par défaut. Seule la chaîne exacte « false » lève l'exigence : une
 * variable vide, absente ou mal orthographiée laisse le contrôle en place,
 * parce qu'une faute de frappe ne doit pas désarmer une règle qualité.
 */
export function isArchiveRequired(): boolean {
  return process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE !== 'false'
}

/**
 * Archive le classeur reçu, ou explique pourquoi l'import ne peut pas continuer.
 *
 * L'identifiant public EST l'empreinte du contenu. Deux conséquences voulues :
 * réenvoyer le même octet-pour-octet ne crée pas une seconde archive, et un
 * fichier différent ne peut pas prendre la place d'un autre — il aurait un
 * autre hash, donc un autre identifiant. Une archive ne peut donc pas être
 * remplacée en silence par un contenu qui ne lui correspond pas.
 */
export async function archiveSourceWorkbook(
  bytes: ArrayBuffer,
  fileHash: string,
): Promise<ArchiveOutcome> {
  const required = isArchiveRequired()

  if (!isArchiveConfigured()) {
    if (required) {
      return {
        ok: false,
        error:
          "L'archivage du classeur source n'est pas configuré (CLOUDINARY_*). " +
          "Un bordereau ne peut pas être importé sans conserver sa pièce d'origine. " +
          'Configurez le stockage, ou levez explicitement l\'exigence avec ' +
          'BORDEREAU_REQUIRE_SOURCE_ARCHIVE=false.',
      }
    }
    return { ok: true, source: null, note: 'disabled' }
  }

  try {
    const stored = await uploadBufferToCloudinary(Buffer.from(bytes), {
      folder: 'bordereaux-sources',
      publicId: `FOR-CO-02-${fileHash}`,
      format: 'xlsx',
    })
    return { ok: true, source: { url: stored.secureUrl, publicId: stored.publicId }, note: 'stored' }
  } catch (e) {
    console.error('Archivage du classeur FOR-CO-02 impossible', e)
    if (required) {
      return {
        ok: false,
        error:
          "Le classeur source n'a pas pu être archivé, l'import est donc annulé : " +
          "un bordereau chiffré sans sa pièce d'origine n'est pas une preuve. " +
          'Réessayez ; si la panne persiste, prévenez l\'administrateur.',
      }
    }
    return { ok: true, source: null, note: 'disabled' }
  }
}
