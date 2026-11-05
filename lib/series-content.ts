/**
 * Épisodes d'une série, vidéo ou temps réel, dans l'ordre de visionnage.
 *
 *  - épisodes vidéo (data/mock.ts → episodes), lus par le lecteur à points
 *    de vue (PovPlayer) ;
 *  - cinématiques temps réel (data/cinematics.ts), reconstruites et jouées
 *    sur l'appareil (ScenePlayer).
 *
 * La numérotation est continue : /serie/[id]/episode/[n].
 */
import { getCinematicsBySeries, type Cinematic } from '@/data/cinematics';
import { getEpisodes } from './catalog';
import type { Episode, Series } from './types';

export interface EpisodeEntry {
  number: number;
  season: number;
  kind: 'video' | 'scene';
  title: string;
  synopsis: string;
  /** Durée en secondes. */
  seconds: number;
  /** Miniature : celle de la vidéo, sinon le visuel de la série. */
  thumbnail: string;
  video?: Episode;
  cinematic?: Cinematic;
}

export function getSeriesEpisodes(series: Series): EpisodeEntry[] {
  const videos: EpisodeEntry[] = getEpisodes(series.id).map((episode) => ({
    number: episode.number,
    season: episode.season,
    kind: 'video',
    title: episode.title,
    synopsis: episode.synopsis,
    seconds: episode.duration,
    thumbnail: episode.thumbnail,
    video: episode,
  }));
  const start = videos.reduce((max, entry) => Math.max(max, entry.number), 0);
  const scenes: EpisodeEntry[] = getCinematicsBySeries(series.id).map((cinematic, index) => ({
    number: start + index + 1,
    season: series.season,
    kind: 'scene',
    title: cinematic.title,
    synopsis: cinematic.synopsis,
    seconds: cinematic.seconds,
    thumbnail: series.image,
    cinematic,
  }));
  return [...videos, ...scenes];
}

/** 12 → « 0:12 » ; 2,7 → « 0:03 ». */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
