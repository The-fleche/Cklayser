/**
 * Types partagés de CKlayser.
 *
 * Toutes les données de la page d'accueil sont fictives (data/mock.ts) et
 * typées ici pour pouvoir être remplacées plus tard par une API sans toucher
 * aux composants.
 */

/** État du spectateur : visiteur anonyme ou membre connecté. */
export type ViewerState = 'guest' | 'member';

/** Technique d'animation d'une série. */
export type AnimationFormat = '2D' | '3D';

/**
 * Badges affichables sur une carte. Un seul badge est montré par carte,
 * selon la priorité : early > exclusive > interactive3d > new.
 */
export type BadgeKind = 'early' | 'exclusive' | 'interactive3d' | 'new';

/** Identifiants des univers parcourables. */
export type UniverseId = 'fantasy' | 'science-fiction' | 'aventure' | 'mystere' | 'fantastique';

export interface Series {
  /** Identifiant stable, utilisé dans l'URL /serie/[id]. */
  id: string;
  title: string;
  synopsis: string;
  season: number;
  episodeCount: number;
  format: AnimationFormat;
  /** Série 3D compatible avec le changement de point de vue pendant le visionnage. */
  interactive3d: boolean;
  /** Réservée aux membres d'une chaîne. */
  exclusive: boolean;
  /** Épisodes publiés en avance pour les membres. */
  early: boolean;
  /** Ajoutée récemment au catalogue. */
  isNew: boolean;
  universe: UniverseId;
  /** Chaîne (créateur) qui publie la série. */
  channelId: string;
  /** Visuel de la carte (remplaçable en changeant ce seul chemin). */
  image: string;
  /** Description courte du visuel, pour les lecteurs d'écran. */
  imageAlt: string;
}

export interface HeroSlide {
  id: string;
  /** Série mise en avant (lien « Regarder maintenant », bouton « + »). */
  seriesId: string;
  /** Visuel panoramique du hero (remplaçable). Avec une vidéo, sert d'affiche :
   *  affiché pendant le chargement et en mouvement réduit. */
  image: string;
  /** Vidéo de fond facultative (MP4 H.264, muette, sans piste audio). */
  video?: string;
  imageAlt: string;
  /** Point focal de l'image (object-position), utile pour le recadrage mobile 4:5. */
  focus?: string;
}

export interface Universe {
  id: UniverseId;
  name: string;
  image: string;
  imageAlt: string;
}

export interface Channel {
  id: string;
  name: string;
  /** Nombre d'abonnés (affiché en « 124k »). */
  subscribers: number;
  /** Spécialité technique : « 3D Rig », « 2D Spine »… */
  specialty: string;
  avatar: string;
}

export interface ContinueWatchingItem {
  seriesId: string;
  episode: number;
  /** Progression dans l'épisode, entre 0 et 1. */
  progress: number;
  remainingMinutes: number;
}

export interface NotificationItem {
  id: string;
  kind: 'episode' | 'channel' | 'community' | 'membership';
  title: string;
  body: string;
  /** Horodatage relatif lisible (« Il y a 2 h »). */
  time: string;
  /** Lien de destination de la notification. */
  href: string;
}

export interface UserProfile {
  name: string;
  handle: string;
  /** Initiales affichées dans l'avatar local. */
  initials: string;
  plan: string;
}

/**
 * Point de vue (caméra) d'un épisode 3D interactif. Tous les points de vue
 * d'un épisode filment le même mouvement : le lecteur passe de l'un à
 * l'autre en conservant le timestamp.
 */
export interface PointOfView {
  id: string;
  /** Libellé court du bouton (ex. : « Dos »). */
  label: string;
  /** Description pour les lecteurs d'écran et l'infobulle. */
  description: string;
  /** Vidéo MP4 (H.264, faststart). */
  src: string;
  /** Première image, affichée avant la lecture. */
  poster: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  season: number;
  number: number;
  title: string;
  synopsis: string;
  /** Au moins un point de vue ; le premier est affiché par défaut. */
  povs: PointOfView[];
}
