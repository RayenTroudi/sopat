/**
 * Les listes de choix du profil client, dans un module neutre.
 *
 * Elles vivaient d'abord dans le formulaire, mais un module `'use client'`
 * n'exporte vers le serveur que des références de composants : lire une de ses
 * constantes depuis une page serveur donne un proxy, pas le tableau. D'où ce
 * fichier partagé — une seule source pour les libellés, utilisable des deux côtés.
 */

export const CLIENT_TYPE_OPTIONS = [
  { value: 'banque',                 label: 'Banque' },
  { value: 'hotellerie',             label: 'Hôtellerie' },
  { value: 'automobile',             label: 'Automobile' },
  { value: 'institutionnel_public',  label: 'Institutionnel public' },
  { value: 'institutionnel_prive',   label: 'Institutionnel privé' },
  { value: 'residentiel_prive',      label: 'Résidentiel privé' },
  { value: 'diplomatique',           label: 'Diplomatique' },
  { value: 'autre',                  label: 'Autre' },
] as const

export const POTENTIAL_OPTIONS = [
  { value: 'fort_potentiel',   label: 'À fort potentiel' },
  { value: 'faible_potentiel', label: 'À faible potentiel' },
  { value: 'neutre',           label: 'Neutre' },
] as const

export const CLIENT_TYPE_LABELS: Record<string, string> =
  Object.fromEntries(CLIENT_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export const POTENTIAL_LABELS: Record<string, string> =
  Object.fromEntries(POTENTIAL_OPTIONS.map((o) => [o.value, o.label]))
