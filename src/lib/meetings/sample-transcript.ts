/**
 * Transcription d'essai pour le mode développement.
 *
 * Écrite pour éprouver précisément ce qui peut mal tourner dans l'analyse :
 *  - une action clairement attribuée avec échéance énoncée (« Ahmed … demain »)
 *  - une action SANS responsable désigné (« il faudrait que quelqu'un … ») qui
 *    ne doit surtout pas être attribuée à la personne citée juste avant
 *  - une proposition qui n'est PAS une décision
 *  - un problème fournisseur explicite, exploitable en constat QMS proposé
 *  - une question laissée sans réponse
 *
 * Un jeu d'essai trop propre validerait le circuit sans rien dire de la qualité
 * de l'extraction.
 */

export const SAMPLE_TRANSCRIPT_TEXT = `Sonia Ben Amor: Bonjour à tous, on commence la réunion de chantier pour la villa Somrani. Trois points à l'ordre du jour : l'approvisionnement, le retard sur la plantation, et la réclamation du client.
Ahmed Trabelsi: Pour l'approvisionnement, on a un problème avec le fournisseur de substrat. La livraison prévue lundi n'est pas arrivée, et on est toujours sans réponse de leur part.
Sonia Ben Amor: C'est la deuxième fois ce trimestre avec ce fournisseur.
Ahmed Trabelsi: Oui, exactement la même situation qu'en mars.
Sonia Ben Amor: Bon. Ahmed, tu contactes le fournisseur demain pour avoir une date ferme, et tu nous fais un retour.
Ahmed Trabelsi: D'accord, je les appelle demain matin.
Sonia Ben Amor: Il faudrait aussi que quelqu'un vérifie si on a une clause de pénalité dans le contrat cadre.
Karim Mansouri: On pourrait peut-être basculer sur le fournisseur de Sousse pour les prochains chantiers, ce serait plus sûr.
Sonia Ben Amor: C'est une piste, on en reparlera à la revue de direction. Pour l'instant on ne change rien.
Karim Mansouri: Sur la plantation, on a pris quatre jours de retard à cause du substrat. Les arbustes sont en jauge, ils tiennent, mais pas indéfiniment.
Sonia Ben Amor: Est-ce que le retard impacte la date de réception ?
Karim Mansouri: Je ne peux pas répondre aujourd'hui, ça dépend de la date de livraison.
Sonia Ben Amor: D'accord. Dernier point, le client a signalé que l'arrosage automatique de la zone nord ne couvre pas tout le massif. C'est une non-conformité, il faut ouvrir une fiche.
Karim Mansouri: Je confirme, on l'a constaté sur place vendredi.
Sonia Ben Amor: Décision : on reprend le réseau d'arrosage de la zone nord avant la réception, à notre charge. Karim, tu chiffres la reprise avant vendredi.
Karim Mansouri: Ça marche, je prépare le chiffrage.
Sonia Ben Amor: On se revoit lundi prochain pour faire le point. Merci à tous.`

/** Forme « utterances » Recall, pour éprouver aussi la mise à plat. */
export function sampleUtterances() {
  return SAMPLE_TRANSCRIPT_TEXT.split('\n').map((line, index) => {
    const separator = line.indexOf(': ')
    const speaker = separator > 0 ? line.slice(0, separator) : 'Participant inconnu'
    const text = separator > 0 ? line.slice(separator + 2) : line
    return {
      participant: { id: index, name: speaker, is_host: index === 0, email: null },
      language_code: 'fr-FR',
      words: text.split(' ').map((word, w) => ({
        text: word,
        start_timestamp: { absolute: new Date().toISOString(), relative: index * 30 + w },
        end_timestamp: { absolute: new Date().toISOString(), relative: index * 30 + w + 1 },
      })),
    }
  })
}
