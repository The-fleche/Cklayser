/**
 * Données fictives de la page d'accueil CKlayser.
 *
 * Toutes les images sont locales. Pour remplacer un visuel de remplacement
 * par la véritable illustration, il suffit de déposer le fichier dans
 * public/… et de changer le chemin correspondant ci-dessous.
 */
import type {
  Episode,
  Channel,
  ContinueWatchingItem,
  HeroSlide,
  NotificationItem,
  Series,
  Universe,
  UserProfile,
} from '@/lib/types';

/* --------------------------------------------------------------------------
   Chaînes (créateurs)
   -------------------------------------------------------------------------- */
export const channels: Channel[] = [
  {
    id: 'atelier-claybot',
    name: 'Atelier ClayBot',
    subscribers: 124_000,
    specialty: '3D Rig',
    avatar: '/avatars/atelier-claybot.svg',
  },
  {
    id: 'spine-craft-2d',
    name: 'Spine Craft 2D',
    subscribers: 89_000,
    specialty: '2D Spine',
    avatar: '/avatars/spine-craft-2d.svg',
  },
  {
    id: 'studio-lanterne',
    name: 'Studio Lanterne',
    subscribers: 312_000,
    specialty: '2D Cut-out',
    avatar: '/avatars/studio-lanterne.svg',
  },
];

/** Chaînes suivies par le membre connecté (état par défaut, comme sur la capture). */
export const followedChannelIds = ['atelier-claybot', 'spine-craft-2d'];

/** Chaînes mises en avant pour un visiteur (« CHAÎNES POPULAIRES »). */
export const popularChannelIds = ['studio-lanterne', 'atelier-claybot'];

/* --------------------------------------------------------------------------
   Séries
   -------------------------------------------------------------------------- */
export const series: Series[] = [
  {
    id: 'echos-aelith',
    title: 'Les Échos d’Aelith',
    synopsis:
      'Un voyage initiatique au cœur d’un monde en ruines, où chaque souvenir cache un secret.',
    season: 1,
    episodeCount: 10,
    format: '3D',
    interactive3d: true,
    exclusive: true,
    early: true,
    isNew: false,
    universe: 'fantasy',
    channelId: 'studio-lanterne',
    image: '/series/echos-aelith.svg',
    imageAlt: 'Une silhouette en cape rouge face à une citadelle suspendue dans les nuages du soir.',
  },
  {
    id: 'lune-rousse',
    title: 'Lune Rousse',
    synopsis:
      'Sous une lune couleur de braise, une exilée gravit les falaises interdites pour retrouver la voix de son peuple.',
    season: 1,
    episodeCount: 12,
    format: '2D',
    interactive3d: false,
    exclusive: true,
    early: false,
    isNew: false,
    universe: 'fantasy',
    channelId: 'spine-craft-2d',
    image: '/series/lune-rousse.svg',
    imageAlt: 'Une silhouette debout sur une falaise devant une immense lune orangée.',
  },
  {
    id: 'horizons-perdus',
    title: 'Horizons Perdus',
    synopsis:
      'Un jeune cartographe arpente une cité de flèches oubliées dont les rues changent à chaque aube.',
    season: 1,
    episodeCount: 10,
    format: '3D',
    interactive3d: true,
    exclusive: false,
    early: false,
    isNew: false,
    universe: 'aventure',
    channelId: 'atelier-claybot',
    image: '/series/horizons-perdus.svg',
    imageAlt: 'Une silhouette en capuche orange contemple une ville de flèches sous un ciel bleu lavande.',
  },
  {
    id: 'jardin-des-miroirs',
    title: 'Le Jardin des Miroirs',
    synopsis:
      'Dans une forêt où chaque miroir montre un autre été, un chat errant guide ceux qui se sont perdus.',
    season: 1,
    episodeCount: 8,
    format: '2D',
    interactive3d: false,
    exclusive: false,
    early: false,
    isNew: true,
    universe: 'fantastique',
    channelId: 'studio-lanterne',
    image: '/series/jardin-des-miroirs.svg',
    imageAlt: 'Des miroirs dorés suspendus entre les arbres d’une forêt baignée de soleil.',
  },
  {
    id: 'au-dela-des-brumes',
    title: 'Au-delà des Brumes',
    synopsis:
      'Derrière le portail vermillon, la brume garde les noms de ceux qui l’ont traversée.',
    season: 1,
    episodeCount: 10,
    format: '3D',
    interactive3d: false,
    exclusive: false,
    early: false,
    isNew: false,
    universe: 'mystere',
    channelId: 'atelier-claybot',
    image: '/series/au-dela-des-brumes.svg',
    imageAlt: 'Un portail vermillon au milieu de sapins, sous un ciel rose et violet.',
  },
  {
    id: 'cite-des-engrenages',
    title: 'La Cité des Engrenages',
    synopsis:
      'Au-dessus des nuages, une apprentie horlogère découvre que la ville entière peut remonter le temps.',
    season: 1,
    episodeCount: 9,
    format: '3D',
    interactive3d: true,
    exclusive: false,
    early: false,
    isNew: true,
    universe: 'science-fiction',
    channelId: 'atelier-claybot',
    image: '/series/cite-des-engrenages.svg',
    imageAlt: 'Une cité de cuivre hérissée d’engrenages flotte au-dessus d’une mer de nuages.',
  },
  {
    id: 'phare-ysolde',
    title: 'Le Phare d’Ysolde',
    synopsis: 'Chaque nuit, le phare éclaire une île qui n’existe sur aucune carte.',
    season: 1,
    episodeCount: 6,
    format: '2D',
    interactive3d: false,
    exclusive: false,
    early: true,
    isNew: false,
    universe: 'mystere',
    channelId: 'spine-craft-2d',
    image: '/series/phare-ysolde.svg',
    imageAlt: 'Un phare sur une falaise projette un faisceau doré sur une mer nocturne.',
  },
  {
    id: 'forge-des-vents',
    title: 'La Forge des Vents',
    synopsis:
      'Dans les montagnes ocres, une forgeronne façonne des moulins capables de dompter les tempêtes.',
    season: 1,
    episodeCount: 12,
    format: '3D',
    interactive3d: true,
    exclusive: false,
    early: true,
    isNew: false,
    universe: 'aventure',
    channelId: 'atelier-claybot',
    image: '/series/forge-des-vents.svg',
    imageAlt: 'Des moulins de pierre sur des crêtes ocres, sous un ciel de forge orangé.',
  },
  {
    id: 'atelier-des-golems',
    title: 'L’Atelier des Golems',
    synopsis:
      'Une sculptrice d’argile donne vie à des gardiens qui n’obéissent qu’aux souvenirs.',
    season: 2,
    episodeCount: 8,
    format: '3D',
    interactive3d: false,
    exclusive: false,
    early: true,
    isNew: false,
    universe: 'science-fiction',
    channelId: 'atelier-claybot',
    image: '/series/atelier-des-golems.svg',
    imageAlt: 'Des silhouettes de golems d’argile dans un atelier éclairé par une verrière.',
  },
  {
    id: 'veilleurs-de-sel',
    title: 'Les Veilleurs de Sel',
    synopsis: 'Sur un désert de sel, des veilleurs attendent un navire qui ne vient plus.',
    season: 2,
    episodeCount: 10,
    format: '2D',
    interactive3d: false,
    exclusive: false,
    early: false,
    isNew: false,
    universe: 'fantastique',
    channelId: 'spine-craft-2d',
    image: '/series/veilleurs-de-sel.svg',
    imageAlt: 'De minuscules silhouettes sur un désert de sel rose qui reflète le ciel.',
  },
];

/* --------------------------------------------------------------------------
   Hero — trois slides
   -------------------------------------------------------------------------- */
export const heroSlides: HeroSlide[] = [
  {
    id: 'slide-echos-aelith',
    seriesId: 'echos-aelith',
    image: '/hero/echos-aelith-poster.webp',
    video: '/hero/echos-aelith.mp4',
    imageAlt: 'Animation 3D : un robot humanoïde blanc et gris marche et se retourne sur une plaine grise, sous un ciel bleu.',
    focus: '30% 30%',
  },
  {
    id: 'slide-cite-des-engrenages',
    seriesId: 'cite-des-engrenages',
    image: '/hero/cite-des-engrenages.svg',
    imageAlt: 'Une cité de cuivre et d’engrenages suspendue au-dessus d’une mer de nuages.',
    focus: '70% 50%',
  },
  {
    id: 'slide-lune-rousse',
    seriesId: 'lune-rousse',
    image: '/hero/lune-rousse.svg',
    imageAlt: 'Une silhouette au sommet d’une falaise devant une lune immense et rousse.',
    focus: '66% 50%',
  },
];

/* --------------------------------------------------------------------------
   Rangées de la page d'accueil
   -------------------------------------------------------------------------- */
/** Membre : « Recommandées pour vous » (ordre de la capture). */
export const recommendedIds = [
  'lune-rousse',
  'horizons-perdus',
  'jardin-des-miroirs',
  'au-dela-des-brumes',
];

/** Visiteur : « Populaires en ce moment ». */
export const popularIds = [
  'horizons-perdus',
  'lune-rousse',
  'au-dela-des-brumes',
  'jardin-des-miroirs',
];

/** « En avance cette semaine » : séries portant le badge En avance. */
export const earlyIds = ['echos-aelith', 'phare-ysolde', 'forge-des-vents', 'atelier-des-golems'];

/** « Continuer à regarder » (membres uniquement). */
export const continueWatching: ContinueWatchingItem[] = [
  { seriesId: 'horizons-perdus', episode: 4, progress: 0.62, remainingMinutes: 9 },
  { seriesId: 'lune-rousse', episode: 7, progress: 0.35, remainingMinutes: 14 },
  { seriesId: 'veilleurs-de-sel', episode: 5, progress: 0.82, remainingMinutes: 4 },
  { seriesId: 'cite-des-engrenages', episode: 2, progress: 0.18, remainingMinutes: 19 },
];

/* --------------------------------------------------------------------------
   Univers
   -------------------------------------------------------------------------- */
export const universes: Universe[] = [
  {
    id: 'fantasy',
    name: 'Fantasy',
    image: '/universes/fantasy.svg',
    imageAlt: 'Un château sur une colline au soleil couchant.',
  },
  {
    id: 'science-fiction',
    name: 'Science-fiction',
    image: '/universes/science-fiction.svg',
    imageAlt: 'Une planète à anneaux au-dessus d’une ville futuriste.',
  },
  {
    id: 'aventure',
    name: 'Aventure',
    image: '/universes/aventure.svg',
    imageAlt: 'Un sentier sinueux entre des montagnes et des arbres d’automne.',
  },
  {
    id: 'mystere',
    name: 'Mystère',
    image: '/universes/mystere.svg',
    imageAlt: 'Une forêt sombre sous la lune, noyée dans la brume.',
  },
  {
    id: 'fantastique',
    name: 'Fantastique',
    image: '/universes/fantastique.svg',
    imageAlt: 'Des îles flottantes dans un ciel violet.',
  },
];

/* --------------------------------------------------------------------------
   Utilisateur et notifications
   -------------------------------------------------------------------------- */
export const currentUser: UserProfile = {
  name: 'Inès Morel',
  handle: '@ines.morel',
  initials: 'IM',
  plan: 'Membre · 2 adhésions',
};

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'episode',
    title: 'Lune Rousse',
    body: 'L’épisode 8 est disponible en avance pour les membres.',
    time: 'Il y a 2 h',
    href: '/serie/lune-rousse',
  },
  {
    id: 'n2',
    kind: 'channel',
    title: 'Atelier ClayBot',
    body: 'Nouveau making-of : le rig 3D de Horizons Perdus.',
    time: 'Il y a 5 h',
    href: '/chaine/atelier-claybot',
  },
  {
    id: 'n3',
    kind: 'community',
    title: 'Fandom Les Échos d’Aelith',
    body: '24 nouvelles théories ont été publiées sur le forum.',
    time: 'Hier',
    href: '/fandoms',
  },
  {
    id: 'n4',
    kind: 'membership',
    title: 'Spine Craft 2D',
    body: 'Votre adhésion a bien été renouvelée.',
    time: 'Il y a 3 j',
    href: '/adhesions',
  },
];

/** Notifications non lues au chargement (pastille orange de la cloche). */
export const initialUnreadNotificationIds = ['n1', 'n2', 'n3'];

/* --------------------------------------------------------------------------
   Épisodes (lecteur). Seul l'épisode 1 des Échos d'Aelith a des vidéos :
   trois points de vue du même mouvement, filmés en même temps.
   -------------------------------------------------------------------------- */
export const episodes: Episode[] = [
  {
    id: 'echos-aelith-s1e1',
    seriesId: 'echos-aelith',
    season: 1,
    number: 1,
    title: 'Premier pas',
    synopsis:
      'Le premier mouvement d’Aelith, filmé sous trois angles. Changez de point de vue à tout moment : la scène reprend exactement au même instant.',
    povs: [
      {
        id: 'pov1',
        label: 'Dos',
        description: 'Caméra placée derrière le personnage, plan d’ensemble.',
        src: '/watch/echos-aelith/s1e1-pov1.mp4',
        poster: '/watch/echos-aelith/s1e1-pov1-poster.webp',
      },
      {
        id: 'pov2',
        label: 'Plan large',
        description: 'Caméra de trois quarts face, plan large.',
        src: '/watch/echos-aelith/s1e1-pov2.mp4',
        poster: '/watch/echos-aelith/s1e1-pov2-poster.webp',
      },
      {
        id: 'pov3',
        label: 'Profil',
        description: 'Caméra de profil, plan rapproché.',
        src: '/watch/echos-aelith/s1e1-pov3.mp4',
        poster: '/watch/echos-aelith/s1e1-pov3-poster.webp',
      },
    ],
  },
];
