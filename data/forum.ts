/**
 * Fandoms & Forums — données fictives (membres, communautés, discussions).
 *
 * Tous les pseudos et messages sont inventés. Les dates sont exprimées en
 * « minutes écoulées » (ageMinutes) pour un affichage relatif stable
 * (« il y a 2 h ») identique côté serveur et côté navigateur.
 */
import type { ForumAuthor, ForumTag, ForumThread, Fandom } from '@/lib/types';

export const forumTags: { id: ForumTag; label: string }[] = [
  { id: 'theories', label: 'Théories' },
  { id: 'episode', label: 'Discussion d’épisode' },
  { id: 'fanart', label: 'Fan art' },
  { id: 'technique', label: 'Animation & technique' },
  { id: 'questions', label: 'Questions' },
];

export const forumAuthors: ForumAuthor[] = [
  { id: 'u-nova', name: 'Nova Ferrand', handle: 'nova.ferrand' },
  { id: 'u-tilio', name: 'Tilio', handle: 'tilio_anim' },
  { id: 'u-margaux', name: 'Margaux B.', handle: 'margaux.b' },
  { id: 'u-sacha', name: 'Sacha Lenoir', handle: 'sacha.lenoir' },
  { id: 'u-amine', name: 'Amine K.', handle: 'amine.k' },
  { id: 'u-jun', name: 'Jun Arakawa', handle: 'jun.ara' },
  { id: 'u-lise', name: 'Lise Carmin', handle: 'lise.carmin' },
  { id: 'u-oscar', name: 'Oscar Vidal', handle: 'oscarv' },
  // Comptes officiels des chaînes (badge « Équipe »).
  { id: 'c-lanterne', name: 'Studio Lanterne', handle: 'studio.lanterne', channelId: 'studio-lanterne', avatar: '/avatars/studio-lanterne.svg' },
  { id: 'c-claybot', name: 'Atelier ClayBot', handle: 'atelier.claybot', channelId: 'atelier-claybot', avatar: '/avatars/atelier-claybot.svg' },
  { id: 'c-spine', name: 'Spine Craft 2D', handle: 'spinecraft', channelId: 'spine-craft-2d', avatar: '/avatars/spine-craft-2d.svg' },
];

export const fandoms: Fandom[] = [
  { seriesId: 'echos-aelith', members: 18_400, online: 312 },
  { seriesId: 'lune-rousse', members: 12_900, online: 141 },
  { seriesId: 'cite-des-engrenages', members: 9_700, online: 88 },
  { seriesId: 'horizons-perdus', members: 7_300, online: 64 },
  { seriesId: 'archipel-des-lucioles', members: 4_100, online: 57 },
  { seriesId: 'brindille-et-caillou', members: 21_600, online: 230 },
];

export const forumThreads: ForumThread[] = [
  {
    id: 'aelith-trois-cameras',
    title: 'Épisode 1 : vous l’avez regardé sous quel point de vue en premier ?',
    seriesId: 'echos-aelith',
    tag: 'episode',
    authorId: 'u-nova',
    ageMinutes: 95,
    likes: 214,
    pinned: true,
    body: [
      'J’ai lancé « Premier pas » en vue de dos, puis je suis passée au profil au moment où elle se retourne. On sent vraiment le poids du mouvement de côté.',
      'Je trouve que le plan large raconte autre chose : on voit à quel point la plaine est vide. Et vous, quel POV en premier ?',
    ],
    replies: [
      { id: 'r1', authorId: 'u-tilio', ageMinutes: 80, likes: 41, body: 'Profil direct, et j’ai repassé la scène trois fois en changeant de caméra au même instant. C’est bluffant que ça reprenne pile au même moment.' },
      { id: 'r2', authorId: 'u-margaux', ageMinutes: 72, likes: 18, body: 'Plan large. Le dos, c’est trop intime pour un premier visionnage, je trouve.' },
      { id: 'r3', authorId: 'c-lanterne', ageMinutes: 60, likes: 156, body: 'Merci pour vos retours ! Petite confidence : le plan large est celui que l’équipe a monté en premier. Les deux autres caméras ont été posées ensuite sur la même animation.' },
      { id: 'r4', authorId: 'u-jun', ageMinutes: 31, likes: 9, body: 'Est-ce qu’il y aura une caméra subjective dans les prochains épisodes ? 👀' },
    ],
  },
  {
    id: 'aelith-theorie-plaine',
    title: 'Théorie : la plaine grise de l’épisode 2 est l’intérieur de la citadelle',
    seriesId: 'echos-aelith',
    tag: 'theories',
    authorId: 'u-sacha',
    ageMinutes: 260,
    likes: 133,
    body: [
      'Regardez l’horizon dans « L’éveil » : il est parfaitement plat et le ciel n’a aucun nuage. Ça ressemble plus à une salle immense qu’à un vrai paysage.',
      'Mon hypothèse : Aelith ne s’est pas éveillée dehors, mais dans une chambre de la citadelle qui simule le monde extérieur.',
    ],
    replies: [
      { id: 'r1', authorId: 'u-amine', ageMinutes: 240, likes: 37, body: 'Ça expliquerait pourquoi elle n’a pas d’ombre portée nette dans certains plans !' },
      { id: 'r2', authorId: 'u-lise', ageMinutes: 200, likes: 12, body: 'Ou alors c’est juste un décor de test… mais j’aime beaucoup ta version.' },
      { id: 'r3', authorId: 'u-oscar', ageMinutes: 150, likes: 22, body: 'Le synopsis dit « monde en ruines ». Une plaine aussi propre, c’est suspect.' },
    ],
  },
  {
    id: 'lune-rousse-fanart',
    title: '[Fan art] L’exilée au sommet de la falaise, version aquarelle',
    seriesId: 'lune-rousse',
    tag: 'fanart',
    authorId: 'u-margaux',
    ageMinutes: 540,
    likes: 302,
    body: [
      'J’ai repris la scène de la falaise de l’épisode 8 en aquarelle, avec la lune beaucoup plus grande que dans la série.',
      'Trois heures de travail, surtout pour le dégradé du ciel. Les retours sont les bienvenus !',
    ],
    replies: [
      { id: 'r1', authorId: 'c-spine', ageMinutes: 500, likes: 88, body: 'Magnifique ! On l’a partagé dans le salon de l’équipe. Le dégradé du ciel est plus réussi que le nôtre 😄' },
      { id: 'r2', authorId: 'u-nova', ageMinutes: 470, likes: 14, body: 'Les arbres morts au premier plan donnent une super profondeur.' },
    ],
  },
  {
    id: 'engrenages-rig',
    title: 'Comment l’Atelier ClayBot anime-t-il les engrenages de la cité ?',
    seriesId: 'cite-des-engrenages',
    tag: 'technique',
    authorId: 'u-tilio',
    ageMinutes: 1_380,
    likes: 97,
    body: [
      'Je débute en rigging 3D et je me demande si les engrenages sont animés à la main ou pilotés par des contraintes.',
      'Quand la cité tourne, toutes les dents restent parfaitement synchronisées, même les plus petites.',
    ],
    replies: [
      { id: 'r1', authorId: 'c-claybot', ageMinutes: 1_300, likes: 121, body: 'Bonne question ! Un seul engrenage « maître » est animé. Tous les autres suivent par un rapport de rotation calculé à partir du nombre de dents. On en parle en détail dans les coulisses réservées aux adhérents.' },
      { id: 'r2', authorId: 'u-jun', ageMinutes: 1_200, likes: 16, body: 'C’est le même principe que les drivers dans la plupart des logiciels 3D.' },
      { id: 'r3', authorId: 'u-tilio', ageMinutes: 1_100, likes: 5, body: 'Merci ! Je vais essayer sur une petite horloge pour m’entraîner.' },
    ],
  },
  {
    id: 'brindille-age',
    title: 'À partir de quel âge montrez-vous Brindille & Caillou ?',
    seriesId: 'brindille-et-caillou',
    tag: 'questions',
    authorId: 'u-oscar',
    ageMinutes: 2_900,
    likes: 64,
    body: ['Mon fils a 4 ans et adore le chat roux. Certains épisodes de la saison 3 sont-ils plus effrayants ?'],
    replies: [
      { id: 'r1', authorId: 'u-lise', ageMinutes: 2_800, likes: 21, body: 'Rien d’effrayant, à part l’épisode de l’orage (S3E12), qui reste très doux.' },
      { id: 'r2', authorId: 'c-spine', ageMinutes: 2_700, likes: 47, body: 'La série est pensée pour les 3 à 7 ans. Chaque épisode dure 7 minutes et se termine toujours au calme.' },
    ],
  },
  {
    id: 'horizons-fin-saison',
    title: 'Fin de saison d’Horizons Perdus : déçus ou conquis ?',
    seriesId: 'horizons-perdus',
    tag: 'episode',
    authorId: 'u-amine',
    ageMinutes: 4_300,
    likes: 88,
    body: [
      'Sans divulgâcher : je trouve que le dernier épisode tranche avec le rythme du reste de la saison.',
      'Merci de mettre vos réponses qui révèlent la fin entre crochets [divulgâcheur].',
    ],
    replies: [
      { id: 'r1', authorId: 'u-sacha', ageMinutes: 4_200, likes: 19, body: 'Conquis. Le changement de rythme est voulu, à mon avis : on sort enfin de la cité.' },
      { id: 'r2', authorId: 'u-nova', ageMinutes: 4_000, likes: 7, body: 'Un peu déçue par la musique, mais la dernière image est sublime.' },
    ],
  },
  {
    id: 'lucioles-saison-2',
    title: 'L’Archipel des Lucioles aura-t-il une saison 2 ?',
    seriesId: 'archipel-des-lucioles',
    tag: 'questions',
    authorId: 'u-jun',
    ageMinutes: 6_100,
    likes: 45,
    body: ['La saison 1 vient de sortir et je suis déjà en manque. Une annonce est prévue ?'],
    replies: [
      { id: 'r1', authorId: 'c-lanterne', ageMinutes: 5_900, likes: 73, body: 'On ne peut rien promettre pour l’instant… mais les storyboards ne sont pas restés dans le tiroir 🌙' },
    ],
  },
  {
    id: 'outils-debutant',
    title: 'Débuter l’animation 2D : quels outils utilisent les créateurs CKlayser ?',
    tag: 'technique',
    authorId: 'u-lise',
    ageMinutes: 8_600,
    likes: 120,
    body: [
      'Je voudrais me lancer dans l’animation 2D découpée, comme Spine Craft 2D. Quels logiciels conseillez-vous pour débuter sans tout dépenser ?',
    ],
    replies: [
      { id: 'r1', authorId: 'c-spine', ageMinutes: 8_400, likes: 64, body: 'Commencez par un personnage simple en 5 ou 6 parties : tête, buste, bras, jambes. La découpe compte plus que l’outil. CKlayser Studio proposera bientôt des modèles prêts à animer.' },
      { id: 'r2', authorId: 'u-tilio', ageMinutes: 8_000, likes: 11, body: 'Et regardez beaucoup de références vidéo, même filmées au téléphone.' },
    ],
  },
];
