/**
 * Fabrique un cookie de session iron-session valide, pour les tests HTTP.
 *
 * Pourquoi c'est légitime
 * -----------------------
 * Vérifier l'autorisation d'une route veut dire l'appeler VRAIMENT, avec la
 * session d'un utilisateur donné et sans elle. Passer par le formulaire de
 * connexion ne marche pas ici : `next start` tourne en `NODE_ENV=production`,
 * donc `cookieOptions.secure` vaut `true` et le navigateur refuserait le cookie
 * posé par le serveur sur `http://localhost`.
 *
 * Le scellé est produit avec le MÊME secret et les MÊMES options que
 * l'application, donc ce n'est pas un contournement du contrôle d'accès : c'est
 * exactement ce que le serveur aurait émis après une connexion réussie. Un
 * secret erroné produit un cookie que le serveur rejette — ce qui est
 * précisément le comportement attendu.
 *
 * À n'utiliser que contre une base isolée.
 */
import { sealData } from 'iron-session'
import { getSessionOptions } from '../../src/lib/session-config'
import type { SessionData } from '../../src/lib/session-config'

export const SESSION_COOKIE_NAME = 'sopat_session'

export async function mintSessionCookie(user: {
  userId: string
  email: string
  name: string
  role: SessionData['role']
}): Promise<string> {
  const options = getSessionOptions()
  const sealed = await sealData(
    {
      isLoggedIn: true,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    } satisfies SessionData,
    { password: options.password, ttl: options.ttl ?? 0 },
  )
  return `${SESSION_COOKIE_NAME}=${sealed}`
}
