/**
 * Nom affiché de l'assistant dans la visioconférence.
 *
 * Isolé dans un module sans dépendance serveur pour que l'écran de création
 * puisse annoncer aux participants le nom EXACT qu'ils verront arriver. Si la
 * valeur vivait dans le client Recall (`server-only`), l'UI en afficherait une
 * copie, qui finirait par diverger — et le bandeau de consentement annoncerait
 * un nom différent de celui qui rejoint réellement.
 */
export const BOT_DISPLAY_NAME = 'SOPAT AI Meeting Assistant'
