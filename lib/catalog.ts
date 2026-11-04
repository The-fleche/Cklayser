/**
 * Accès au catalogue fictif et fonctions de mise en forme.
 *
 * Ces fonctions sont pures (aucun état React) : elles peuvent être utilisées
 * aussi bien dans les composants serveur que client.
 */
import { channels, episodes, series, universes } from '@/data/mock';
import type { BadgeKind, Channel, Episode, Series, Universe } from '@/lib/types';

/** Épisodes visionnables d'une série (avec au moins une vidéo), dans l'ordre. */
export function getEpisodes(seriesId: string): Episode[] {
  return episodes
    .filter((item) => item.seriesId === seriesId && item.povs.length > 0)
    .sort((a, b) => a.season - b.season || a.number - b.number);
}

/** Épisode n° `number` d'une série (saison 1), ou le premier si absent. */
export function getEpisode(seriesId: string, number?: number): Episode | undefined {
  const list = getEpisodes(seriesId);
  return list.find((item) => item.number === number) ?? list[0];
}

/** Dernier épisode publié d'une série. */
export function getLatestEpisode(seriesId: string): Episode | undefined {
  return getEpisodes(seriesId).at(-1);
}

/** Retrouve une série par son identifiant. */
export function getSeries(id: string): Series | undefined {
  return series.find((item) => item.id === id);
}

/** Retrouve plusieurs séries en conservant l'ordre demandé. */
export function getSeriesList(ids: readonly string[]): Series[] {
  return ids.map(getSeries).filter((item): item is Series => item !== undefined);
}

export function getChannel(id: string): Channel | undefined {
  return channels.find((item) => item.id === id);
}

export function getChannelList(ids: readonly string[]): Channel[] {
  return ids.map(getChannel).filter((item): item is Channel => item !== undefined);
}

export function getUniverse(id: string): Universe | undefined {
  return universes.find((item) => item.id === id);
}

/**
 * Badge unique d'une carte.
 * Priorité imposée : En avance > Exclusif > 3D interactif > Nouveau.
 * « 3D interactif » est réservé aux séries 3D compatibles avec le changement
 * de point de vue.
 */
export function getPrimaryBadge(item: Series): BadgeKind | null {
  if (item.early) return 'early';
  if (item.exclusive) return 'exclusive';
  if (item.format === '3D' && item.interactive3d) return 'interactive3d';
  if (item.isNew) return 'new';
  return null;
}

/** Libellés des badges (texte visible). */
export const badgeLabels: Record<BadgeKind, string> = {
  early: 'En avance',
  exclusive: 'Exclusif',
  interactive3d: '3D interactif',
  new: 'Nouveau',
};

/** « 124000 » → « 124k » (format de la capture). */
export function formatSubscribers(count: number): string {
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.', ',')}M`;
  }
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return String(count);
}

/** Séparateur des métadonnées, tel qu'il apparaît sur la capture. */
export const META_SEPARATOR = ' • ';

/** « S1 • 12 épisodes • Animation 2D » */
export function formatSeriesMeta(item: Series): string {
  const episodes = `${item.episodeCount} épisode${item.episodeCount > 1 ? 's' : ''}`;
  return [`S${item.season}`, episodes, `Animation ${item.format}`].join(META_SEPARATOR);
}

/** Normalise une chaîne pour la recherche : minuscules, sans accents ni apostrophes typographiques. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase()
    .trim();
}

export interface SearchResults {
  series: Series[];
  channels: Channel[];
}

/**
 * Recherche plein texte dans le catalogue fictif.
 * Une série correspond si chaque mot de la requête apparaît dans son titre,
 * son univers, son format ou le nom de sa chaîne.
 */
export function searchCatalog(query: string, limit = 6): SearchResults {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return { series: [], channels: [] };

  const matches = (haystack: string) => terms.every((term) => haystack.includes(term));

  const foundSeries = series.filter((item) => {
    const channel = getChannel(item.channelId);
    const universe = getUniverse(item.universe);
    const haystack = normalizeForSearch(
      [item.title, universe?.name ?? '', `animation ${item.format}`, channel?.name ?? ''].join(' '),
    );
    return matches(haystack);
  });

  const foundChannels = channels.filter((channel) =>
    matches(normalizeForSearch(`${channel.name} ${channel.specialty}`)),
  );

  return { series: foundSeries.slice(0, limit), channels: foundChannels.slice(0, 3) };
}
