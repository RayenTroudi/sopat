# Analyse d'écart SMQ SOPAT ↔ Application (ISO 9001:2015)

> Générée le 2026-07-13. Source : `C:\Users\PC\Documents\SOPAT\SMQ SOPAT` (~150 documents, 6 processus).
> Légende : ✅ implémenté · ⚠ partiel · ❌ manquant · 🔄 à améliorer

## 1. Cartographie des processus SMQ

Le SMQ SOPAT est organisé en **6 processus** (et non 4) :

| Processus | Code | Couverture app |
|---|---|---|
| Commercial | CO | ⚠ (projets/clients existent, pas de pipeline d'offres) |
| Étude | ET | ✅ |
| Réalisation & Entretien | RE | ✅ |
| Achat | AC | ⚠ |
| Ressources Humaines | RH | ✅ |
| Management de la qualité & environnement | MI/MQ | ⚠ |

## 2. Détail par document SMQ

### Management Qualité & Environnement (MI/MQ)
| Document | Statut | Module app |
|---|---|---|
| PRC MI 01 Maîtrise des informations documentées | ✅ | DMS (`dms_documents`, versions, workflow, signatures, codification) |
| FOR MI 01 Rapport de revue documentaire | ❌ | Aucune campagne de revue documentaire périodique |
| PRC MI 05 / FOR MI 02 Veille normative & réglementaire | ✅ | `/admin/regulatory-watch` |
| FOR MI 04 PV de réunion | ❌→✅ | **Nouveau module `/admin/meetings` (cette itération)** |
| PRC MI 06 / FOR MI 05 NC, PNC & réclamations | ✅ | `/admin/nc` + CAPA (`non_conformances`, `corrective_actions`) |
| PRC MI 07 / FOR MI 08/09 Écoute PI + suggestions personnel | ✅ | `/admin/stakeholders` + suggestions |
| PRC MI 08 / FOR MI 07 Risques & opportunités | ✅ | `/admin/risks-opportunities` |
| PRC MI 09 / FOR MI 13/14 Audits internes + programme | ✅ | `/admin/audits`, `/admin/audit-programs`, `/admin/auditors` (LIS MI 08) |
| PRC MI 10 / FOR MQ 15 Revue de direction | ❌→✅ | **Nouveau module `/admin/management-reviews` (cette itération)** |
| PRC MI 11 / PLA MI 04/05 Aspects environnementaux (AES) | ❌→✅ | **Nouveau module `/admin/environment/aspects` (F×G, seuil 9)** |
| PRC MI 12 / LIS MI 09 Gestion des déchets (+ dangereux) | ⚠ | `waste_records` existe ; pas de registre spécifique déchets dangereux |
| FOR MI 10 Tableau de bord (KPI SMQ) | ✅ | Dashboard SMQ (`kpi-smq.ts`) |
| FOR MI 12 Check-list SME & SST | ✅ | `/admin/environment/hse-checklist` |
| PLA MI 01 Plan annuel de management | ✅ | `/admin/management-plan` |
| PLA MI 02 Plan des initiatives solidaires | ✅ | RSE événements/partenariats |
| PLA MI 03 Plan de communication | ✅ | `/admin/management-plan/communication` |
| ORG MI 01–08 Politiques, chartes, contexte, cartographie | ⚠ | Stockés dans le DMS ; pas de page « Contexte de l'organisation » dédiée (ISO 4.1) |
| ORG MI 09 Connaissances organisationnelles | ❌ | À créer (ISO 7.1.6) |
| LIS MI 01/02/03 Listes informations documentées | ✅ | DMS registre |
| LIS MI 04 Liste des mots de passe | 🔄 | Ne PAS digitaliser tel quel (risque sécurité) ; remplacé par gestion des comptes |
| INS MI 01–21 Fiches d'instruction (SST/environnement) | ⚠ | À publier comme documents contrôlés dans le DMS (contenu statique) |

### Commercial (CO)
| Document | Statut | Module app |
|---|---|---|
| PRS CO 01 Processus commercial | ⚠ | Cycle projet existe, pipeline avant-vente absent |
| FOR CO 01 Tableau de suivi des offres | ❌→✅ | **Nouveau module `/admin/commercial/offers` (cette itération)** |
| FOR CO 02 Bordereau des prix | ⚠ | `realisation_line_items` (attachement/décompte) couvrent l'aval ; bordereau d'offre à lier au module offres |
| FOR CO 03 État de solde client | ❌→✅ | **Nouveau module `/admin/commercial/client-balances` (factures/encaissements/avoirs, solde par client)** |
| LIS CO 01 Liste des références | ⚠ | Portfolio export s'en rapproche |
| ORG CO 01/02 Offre de prix / Contrat d'entretien | ⚠ | Génération PDF existante à étendre |

### Étude (ET)
| Document | Statut |
|---|---|
| FOR ET 01 Registre de suivi des projets d'étude | ✅ `/admin/etude/study-register` |
| FOR ET 02 Fiche projet | ✅ `project_study_records` |
| FOR ET 03/04/05 Spécifications techniques MD/plantes/PP | ✅ matières décoratives, palette végétale, phytosanitaire |
| FOR ET 06 Liste des articles du projet | ✅ `/admin/etude/project-articles` |
| LIS ET 02/03 Palette végétale + spécifications plantes | ✅ `plant_species` (seed LIS ET 03) |

### Réalisation & Entretien (RE)
| Document | Statut |
|---|---|
| FOR RE 03 Équipe projet | ✅ `project_team_members` |
| FOR RE 04 Suivi journalier de chantier | ✅ `chantier_daily_logs` |
| FOR RE 05/14 PV réception provisoire/définitive | ✅ |
| FOR RE 13 Attachement / FOR RE 15 Décompte | ✅ `realisation_line_items` |
| PLA RE 01–05 Plannings (annuel, hebdo, action, mensuel, Gantt) | ✅ |
| LIS RE 02 Liste des projets de réalisation | ✅ `/admin/realisation` |

### Achat (AC)
| Document | Statut |
|---|---|
| PRC AC 02 / FOR AC 11 Sélection & évaluation fournisseurs | ✅ `supplier_evaluations` |
| LIS AC 01 Fournisseurs agréés | ✅ `suppliers` |
| Bons de commande | ✅ `purchase_orders` |
| FOR AC 01 Extra dépenses | ❌→✅ | **`/admin/achat/extra-expenses` avec validation direction** |
| FOR AC 05 Bon de retour / FOR AC 06 Bon de livraison | ❌→✅ | **`/admin/achat/delivery-notes` (lignes d'articles, BL-/BR-)** |
| FOR AC 10 Suivi approvisionnement chantier | ⚠ | Couvert partiellement par BC + bons de livraison liés au projet ; vue de synthèse à créer |

### Ressources Humaines (RH)
| Document | Statut |
|---|---|
| FOR RH 01 Recrutement, 03 Évaluation, 05/06/07 Formation, 08 Fiche de poste, 13 Pointage, 14 Congé, 15 Sortie, 28 Matériel, 34 Check-list dossier, 41 Ordre de mission, 43 Registre congés | ✅ tous couverts |
| LIS RH 01 Suppléants / LIS RH 02 Suivi du personnel | ✅ |
| PLA RH 01 Intégration / PLA RH 02 Formation | ✅ |
| PRC RH 04 Discipline / PRC RH 05 Paie | ❌ (hors périmètre actuel — décision à prendre) |

## 3. Conformité ISO 9001:2015 — synthèse par clause

| Clause | État | Note |
|---|---|---|
| 4 Contexte | ⚠ | PI ✅, risques ✅ ; page contexte/enjeux (ORG MI 07) manquante |
| 5 Leadership / politique | ⚠ | Politiques dans DMS ; publication in-app à prévoir |
| 6 Planification (risques, objectifs) | ✅ | R&O + plan de management |
| 7 Support (compétences, communication, inf. doc.) | ✅/⚠ | RH + DMS ✅ ; connaissances organisationnelles ❌ |
| 8 Réalisation (commercial→étude→réalisation→achat) | ⚠ | Pipeline offres ❌→✅ maintenant ; achats partiels |
| 9.1 Surveillance / satisfaction client | ✅ | KPI + `client_satisfaction` |
| 9.2 Audit interne | ✅ | |
| 9.3 Revue de direction | ❌→✅ | **Module créé cette itération** |
| 10 Amélioration (NC/CAPA) | ✅ | |

## 4. Reste à faire (priorisé)

1. ~~État de solde client (FOR CO 03)~~ ✅ fait — bordereau des prix (FOR CO 02) lié aux offres reste à faire
2. ~~Registre AES (PLA MI 04/05)~~ ✅ fait
3. ~~Formulaires Achat : bons livraison/retour, extra dépenses~~ ✅ faits — vue « suivi appro chantier » (FOR AC 10) à créer
4. **Revue documentaire périodique (FOR MI 01)** dans le DMS
5. **Connaissances organisationnelles (ORG MI 09)**
6. Page « Contexte & politiques » (publication des ORG MI 01–08 depuis le DMS)
7. **Export Excel professionnel** généralisé (bouton en haut à droite de chaque dashboard) — nécessite `exceljs` (le paquet `xlsx` actuel ne gère pas le style)
8. Exports PDF/PPTX de rapports de direction
9. Notifications/escalades automatiques (échéances CAPA, audits, revues)
