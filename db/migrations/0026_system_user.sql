-- Compte de service « SOPAT Automatisation ».
--
-- email_queue.created_by est uuid NOT NULL avec une clé étrangère vers users :
-- les envois déclenchés par les tâches de fond (relances 48h/72h, digest SMQ,
-- rappels d'entretien, déclencheurs RSE) passaient la chaîne 'system', d'où
-- l'erreur Postgres 22P02 « invalid input syntax for type uuid ». Aucun e-mail
-- n'était donc mis en file.
--
-- Plutôt que de rendre la colonne nullable, on nomme l'acteur automatique :
-- l'ISO 9001 exige un « créé par » pour chaque enregistrement, et un compte
-- dédié se relie proprement à la clé étrangère existante.
--
-- Le compte ne peut pas se connecter : /api/auth/login filtre sur
-- is_active = true, et le hash de mot de passe n'est pas un hash bcrypt valide.
-- Le rôle 'admin' n'accorde aucun droit ici — rien ne s'authentifie jamais
-- comme ce compte.

INSERT INTO users (id, name, email, password_hash, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'SOPAT Automatisation',
  'system@sopat.local',
  '!',
  'admin',
  false
)
ON CONFLICT (id) DO NOTHING;
