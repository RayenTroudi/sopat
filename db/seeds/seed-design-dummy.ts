import { db } from '../index'
import { projects, designTemplates } from '../schema'
import { eq } from 'drizzle-orm'

// Real user IDs
const ADMIN = '8490ab62-a88e-4e00-8e17-a307922f9a40'
const KARIM = 'e4451d4f-3ce7-4608-a125-b581847a0be3' // etudes_chef

// Real project IDs from DB
const PROJ_ORANGERS    = '132b21d7-806d-4153-a20a-2d0614a9b017' // Jardin Villa Les Orangers (residentiel)
const PROJ_SIDI_BOU   = '46baf2a4-4463-4b69-aba4-ba7654bc7a0c' // Jardin Méditerranéen Résidence Sidi Bou (residentiel)
const PROJ_JASMINS    = '454b5405-d0b3-4129-96c1-330a81f98b33' // Parc Résidentiel Les Jasmins (residentiel)
const PROJ_CARTHAGE   = '478ad1e0-a913-4399-b40e-73d2012d8b9a' // Aménagement Galerie Carthage Mall (espace_public)
const PROJ_FARHAT     = '1a4acd19-249d-4f3d-8e62-9154199a42b9' // Réaménagement Place Farhat Hached (espace_public)

async function main() {
  console.log('Seeding design concepts + templates dummy data…')

  // ── 1. Concept data on existing projects ──────────────────────────────────────
  // The "Bibliothèque de concepts" page reads conceptTitle, conceptDescription,
  // designVocabulary and plantPalettePhilosophy from the projects table.

  const conceptUpdates = [
    {
      id: PROJ_ORANGERS,
      conceptTitle: 'Jardin Andalou Contemporain',
      conceptDescription:
        'Un jardin qui s\'inspire de l\'héritage andalou-tunisien tout en adoptant une lecture résolument contemporaine. ' +
        'Les lignes géométriques structurent l\'espace en trois zones distinctes : un patio central ombragé par une pergola en fer forgé, ' +
        'un bosquet d\'orangers amers et de grenadiers délimitant la zone de repos, et un tapis de couvre-sols xérophytes fermant le périmètre. ' +
        'La palette végétale privilégie les espèces résistantes à la sécheresse estivale tunisienne, avec une attention particulière portée aux ' +
        'essences parfumées — jasmin, rosiers anciens, lavande — pour activer la dimension sensorielle du jardin. ' +
        'L\'eau est présente uniquement sous forme d\'un filet décoratif alimenté en circuit fermé, limitant la consommation hydrique à son minimum.',
      designVocabulary: ['méditerranéen', 'contemporain', 'sensoriel', 'luxe sobre'],
      plantPalettePhilosophy: ['palette méditerranéenne', 'palette xérophyte', 'végétaux locaux'],
    },
    {
      id: PROJ_SIDI_BOU,
      conceptTitle: 'L\'Écrin Bleu de Sidi Bou Saïd',
      conceptDescription:
        'Le concept s\'appuie sur l\'identité chromatique forte de Sidi Bou Saïd — le blanc et le bleu — pour créer un jardin qui dialogue ' +
        'avec l\'architecture vernaculaire du site. Les végétaux sont choisis pour leurs fleurs blanches, mauves et bleues : agapanthes, ' +
        'plumbagos, lantanas, buddleias. La structure minérale joue avec les terrasses successives propres à la topographie du site, ' +
        'reliées par des escaliers en pierre calcaire locale. ' +
        'Un bassin à débordement, habillé de zellige bleu, constitue le point focal du jardin bas. ' +
        'La végétation en hauteur — oliviers taillés en nuage, lauriers-roses — crée un écran visuel naturel vis-à-vis des voisins tout en ' +
        'filtrant la lumière rasante de l\'après-midi.',
      designVocabulary: ['méditerranéen', 'traditionnel local', 'sensoriel', 'luxe sobre'],
      plantPalettePhilosophy: ['palette méditerranéenne', 'végétaux locaux', 'faible empreinte hydrique'],
    },
    {
      id: PROJ_JASMINS,
      conceptTitle: 'Parc Résilientiel Multiusages',
      conceptDescription:
        'Un parc de résidence pensé pour accueillir simultanément des usages multiples et des générations différentes. ' +
        'L\'axe principal nord-sud structure le projet en cinq séquences : aire de jeux pour enfants avec sol amortissant, ' +
        'prairie fleurie semi-naturelle, cheminement piéton ombragé par une double allée de micocouliers, espace fitness en plein air, ' +
        'et jardin de plantes aromatiques et médicinales à caractère pédagogique. ' +
        'L\'ensemble du réseau d\'arrosage fonctionne en goutte-à-goutte enterré, alimenté par un réservoir de récupération des eaux ' +
        'pluviales de la toiture des garages souterrains. ' +
        'Le concept intègre des nichoirs à oiseaux et des hôtels à insectes pour renforcer la biodiversité locale au sein de la résidence.',
      designVocabulary: ['bioclimatique', 'écologique', 'contemporain', 'urbain'],
      plantPalettePhilosophy: ['biodiversité locale', 'végétaux locaux', 'faible empreinte hydrique', 'plantes endémiques'],
    },
    {
      id: PROJ_CARTHAGE,
      conceptTitle: 'Oasis Urbaine — Galerie Carthage',
      conceptDescription:
        'L\'intervention propose de transformer les circulations horizontales de la galerie marchande en un parcours végétal immersif. ' +
        'Des îlots plantés surélevés, composés d\'essences tropicales à grand développement — ficus lyrata, strelitzias, bananiers nains — ' +
        'rythment le cheminement commercial et créent des pauses visuelles qui invitent le visiteur à ralentir. ' +
        'Chaque îlot dispose d\'un éclairage spectral LED calibré pour assurer la croissance des plantes malgré l\'absence de lumière naturelle directe. ' +
        'Les bacs sont habillés d\'un composite bois anthracite qui reprend le code couleur de la charte architecturale de la galerie. ' +
        'Un brumisateur discret intégré en plafond assure le maintien du taux d\'hygrométrie nécessaire aux espèces tropicales.',
      designVocabulary: ['tropical', 'contemporain', 'luxe sobre', 'sensoriel'],
      plantPalettePhilosophy: ['palette tropicale', 'intérieur tropical'],
    },
    {
      id: PROJ_FARHAT,
      conceptTitle: 'Place du Vivant — Réaménagement Farhat Hached',
      conceptDescription:
        'Le projet de réaménagement de la Place Farhat Hached repose sur une lecture de l\'espace public comme infrastructure écologique ' +
        'autant que sociale. La place existante, minéralisée à 90 %, est restructurée en faveur d\'un équilibre 50/50 entre surfaces perméables ' +
        'végétalisées et espaces pavés. ' +
        'Un bosquet de caroubiers et de chênes liège — espèces endémiques de l\'étage bioclimatique subhumide tunisien — forme un couvert ' +
        'arboré qui réduit l\'îlot de chaleur urbain et offre une ombre dense dès la première décennie après plantation. ' +
        'La strate arbustive associe des espèces mellifères locales pour soutenir les pollinisateurs dans un contexte urbain dense. ' +
        'Le mobilier urbain est réalisé en pierre de Aïn Draham et en bois de robinier certifié, garantissant longévité et cohérence ' +
        'avec l\'identité territoriale de la région.',
      designVocabulary: ['écologique', 'urbain', 'bioclimatique', 'traditionnel local'],
      plantPalettePhilosophy: ['plantes endémiques', 'biodiversité locale', 'végétaux locaux', 'faible empreinte hydrique'],
    },
  ]

  for (const u of conceptUpdates) {
    await db
      .update(projects)
      .set({
        conceptTitle: u.conceptTitle,
        conceptDescription: u.conceptDescription,
        designVocabulary: u.designVocabulary,
        plantPalettePhilosophy: u.plantPalettePhilosophy,
      })
      .where(eq(projects.id, u.id))
    console.log(`  ✓ Concept "${u.conceptTitle}" → ${u.id.slice(0, 8)}…`)
  }

  // ── 2. Design templates ───────────────────────────────────────────────────────
  const templates = [
    {
      templateName: 'Jardin Méditerranéen Résidentiel',
      projectTypeContext: ['residentiel'] as any[],
      conceptDescriptionTemplate:
        'Un jardin résidentiel qui s\'ancre dans la tradition méditerranéenne tunisienne tout en répondant aux exigences contemporaines ' +
        'de confort, de durabilité et d\'esthétique. L\'organisation spatiale s\'articule autour d\'un patio central ombragé, ' +
        'de terrasses successives reliées par des cheminements en pierre locale, et d\'une palette végétale composée exclusivement ' +
        'd\'espèces adaptées au climat semi-aride. ' +
        'La gestion de l\'eau est au cœur du concept : arrosage goutte-à-goutte enterré, récupération des eaux de pluie, ' +
        'et choix d\'espèces xérophytes pour les zones d\'exposition maximale. ' +
        'L\'ambiance olfactive est construite par des essences parfumées — jasmin, lavande, romarin — disposées en bordure ' +
        'des cheminements pour activer le jardin lors de chaque passage.',
      recommendedVocabulary: ['méditerranéen', 'contemporain', 'sensoriel', 'luxe sobre'],
      recommendedPalette: ['palette méditerranéenne', 'palette xérophyte', 'végétaux locaux'],
      isPublished: true,
      createdBy: KARIM,
    },
    {
      templateName: 'Espace Public Bioclimatique',
      projectTypeContext: ['espace_public', 'ingenierie_territoriale'] as any[],
      conceptDescriptionTemplate:
        'Une intervention sur l\'espace public fondée sur les principes de la conception bioclimatique : réduction de l\'îlot de chaleur ' +
        'urbain, favorisation de la biodiversité, et création d\'espaces vécus qui répondent aux besoins de toutes les générations. ' +
        'Le couvert arboré constitue la colonne vertébrale du projet : des espèces à grand développement, endémiques ou naturalisées, ' +
        'sont choisies pour leur capacité à fournir une ombre dense dès 5–7 ans après plantation. ' +
        'Les surfaces au sol alternent entre revêtements perméables (graviers drainants, pavés à joints enherbés) ' +
        'et îlots de prairie fleurie semi-naturelle. ' +
        'Le mobilier urbain est réalisé en matériaux durables d\'origine locale, renforçant la cohérence territoriale du projet.',
      recommendedVocabulary: ['bioclimatique', 'écologique', 'urbain', 'contemporain'],
      recommendedPalette: ['plantes endémiques', 'biodiversité locale', 'faible empreinte hydrique', 'végétaux locaux'],
      isPublished: true,
      createdBy: KARIM,
    },
    {
      templateName: 'Intérieur Tropical Haut de Gamme',
      projectTypeContext: ['interieur', 'hotelier_touristique'] as any[],
      conceptDescriptionTemplate:
        'Un paysage intérieur construit autour d\'une végétation tropicale à grand développement, pensé pour transformer un espace ' +
        'architectural en environnement sensoriel vivant. Des îlots plantés de hauteurs variées — de 0,5 m à 4 m — créent une ' +
        'canopée intérieure qui structure les circulations et génère des ambiances distinctes selon les zones. ' +
        'Chaque plante est choisie pour son feuillage architectural, sa tolérance à la lumière artificielle et sa faible exigence ' +
        'd\'entretien en milieu conditionné. ' +
        'L\'éclairage spectral LED est intégré dès la conception pour assurer la croissance et valoriser visuellement les végétaux ' +
        'en lumière artificielle. ' +
        'Un protocole d\'entretien mensuel est prévu, incluant le nettoyage des feuilles, le contrôle de l\'hygrométrie et ' +
        'la rotation saisonnière des espèces décoratives.',
      recommendedVocabulary: ['tropical', 'luxe sobre', 'contemporain', 'sensoriel'],
      recommendedPalette: ['palette tropicale', 'intérieur tropical'],
      isPublished: true,
      createdBy: ADMIN,
    },
    {
      templateName: 'Siège Social — Jardin d\'Entreprise',
      projectTypeContext: ['siege_social'] as any[],
      conceptDescriptionTemplate:
        'Un jardin d\'entreprise qui traduit les valeurs de la marque dans le paysage : sobriété, modernité et ancrage territorial. ' +
        'La façade végétale et l\'entrée principale sont mises en valeur par une composition minérale-végétale structurée, ' +
        'aux lignes nettes et aux contrastes de textures assumés. ' +
        'Les espaces de pause extérieurs sont organisés en alcôves végétales semi-privées, offrant ombre et confort acoustique ' +
        'aux collaborateurs. ' +
        'Le parking est intégré dans un schéma de verdissement par strates : arbres de haute tige en allée, haies taillées ' +
        'en limite, couvre-sols drainants en surface. ' +
        'L\'ensemble du projet est conçu pour une maintenance minimale : taille annuelle pour les haies, arrosage automatique ' +
        'programmable, et absence de gazon tondable.',
      recommendedVocabulary: ['minimaliste', 'contemporain', 'bioclimatique', 'urbain'],
      recommendedPalette: ['palette méditerranéenne', 'végétaux locaux', 'faible empreinte hydrique'],
      isPublished: true,
      createdBy: KARIM,
    },
    {
      templateName: 'Hôtelier & Touristique — Paysage de Resort',
      projectTypeContext: ['hotelier_touristique'] as any[],
      conceptDescriptionTemplate:
        'Un paysage hôtelier conçu pour immerger le visiteur dans une expérience végétale dès son arrivée. ' +
        'L\'entrée monumentale est scandée par une double allée de palmiers majestés, prolongée par des massifs de bougainvillées ' +
        'et de plumbagos. Les abords de la piscine adoptent un registre tropical luxuriant avec des strelitzias, des agapanthes ' +
        'et des cannas, tout en maintenant des couloirs de circulation dégagés et sécurisés. ' +
        'Les zones de restauration en terrasse bénéficient d\'une végétation filtrante — haies de lauriers-roses taillés, ' +
        'treillages végétaux — qui protège de la vue sans bloquer la lumière. ' +
        'Le tout est irriguée par un système goutte-à-goutte programmé avec sonde tensiométrique pour optimiser la consommation ' +
        'd\'eau en période estivale.',
      recommendedVocabulary: ['tropical', 'méditerranéen', 'luxe sobre', 'sensoriel'],
      recommendedPalette: ['palette tropicale', 'palette méditerranéenne', 'faible empreinte hydrique'],
      isPublished: true,
      createdBy: ADMIN,
    },
    {
      templateName: 'Génie Territorial — Trame Verte Urbaine',
      projectTypeContext: ['ingenierie_territoriale'] as any[],
      conceptDescriptionTemplate:
        'Une intervention à l\'échelle du territoire visant à reconstituer une trame verte et bleue fonctionnelle en milieu urbain dense. ' +
        'Le projet s\'appuie sur une analyse écologique préalable des corridors biologiques existants et des zones de rupture ' +
        'à résorber. La plantation s\'effectue par unités paysagères cohérentes : boisements d\'accompagnement le long des voies, ' +
        'noues végétalisées pour la gestion des eaux pluviales, et bosquets refuges pour la faune en nœuds stratégiques du réseau. ' +
        'Les espèces choisies sont exclusivement endémiques ou naturalisées de la région, sélectionnées pour leur résistance ' +
        'aux conditions urbaines difficiles (sécheresse, pollution, compaction des sols). ' +
        'Le projet est accompagné d\'un plan de gestion différenciée sur 10 ans, intégrant les pratiques zéro pesticide ' +
        'et zéro engrais chimique dès la phase de confortement.',
      recommendedVocabulary: ['bioclimatique', 'écologique', 'urbain'],
      recommendedPalette: ['plantes endémiques', 'biodiversité locale', 'végétaux locaux', 'faible empreinte hydrique'],
      isPublished: false,
      createdBy: KARIM,
    },
    {
      templateName: 'Jardin Minimaliste Contemporain',
      projectTypeContext: ['residentiel', 'siege_social'] as any[],
      conceptDescriptionTemplate:
        'Un jardin qui fait de la sobriété son argument principal. Peu de végétaux, mais choisis avec précision pour leurs qualités ' +
        'sculpturales : oliviers multi-troncs taillés en nuage, graminées ondulantes, agaves en accent ponctuel. ' +
        'La surface minérale domine : dalles béton gris clair à joints larges, graviers blancs immaculés, ' +
        'béton désactivé en zones de circulation. L\'absence de gazon est assumée et revendiquée comme un choix responsable. ' +
        'L\'éclairage est traité comme un élément de composition à part entière : spots enterrés rasants pour les végétaux, ' +
        'balises LED basse hauteur pour les cheminements, projecteur unique sur l\'olivier central. ' +
        'Le résultat est un jardin qui se lit différemment selon l\'heure et la saison, mais qui reste toujours lisible et maîtrisé.',
      recommendedVocabulary: ['minimaliste', 'contemporain', 'luxe sobre'],
      recommendedPalette: ['palette xérophyte', 'palette méditerranéenne', 'faible empreinte hydrique'],
      isPublished: true,
      createdBy: KARIM,
    },
  ]

  for (const t of templates) {
    await db.insert(designTemplates).values({
      templateName: t.templateName,
      projectTypeContext: t.projectTypeContext,
      conceptDescriptionTemplate: t.conceptDescriptionTemplate,
      recommendedVocabulary: t.recommendedVocabulary,
      recommendedPalette: t.recommendedPalette,
      exampleProjectIds: [],
      referenceImageCloudinaryIds: [],
      isPublished: t.isPublished,
      createdBy: t.createdBy,
    }).onConflictDoNothing()
    console.log(`  ✓ Template "${t.templateName}" (${t.isPublished ? 'publié' : 'brouillon'})`)
  }

  console.log('Done.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
