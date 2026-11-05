/**
 * EpisodeList — épisodes d'une série (vidéo et temps réel).
 *
 * Props :
 *  - seriesId    série (liens /serie/[id]/episode/N)
 *  - episodes    épisodes dans l'ordre (lib/series-content.ts)
 *  - format      format de la série (indication « Temps réel 2D / 3D »)
 *  - currentNumber  épisode en cours (aria-current="page", « En cours »)
 *  - title / headingLevel  titre de la section
 *
 * États : aucun (composant serveur).
 */
import { Box, Orbit, Play, SwitchCamera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDuration, type EpisodeEntry } from '@/lib/series-content';
import styles from './EpisodeList.module.css';

interface EpisodeListProps {
  seriesId: string;
  episodes: EpisodeEntry[];
  format: '2D' | '3D';
  currentNumber?: number;
  title?: string;
  headingLevel?: 'h2' | 'h3';
}

export default function EpisodeList({ seriesId, episodes, format, currentNumber, title = 'Épisodes', headingLevel = 'h2' }: EpisodeListProps) {
  if (episodes.length === 0) return null;
  const Heading = headingLevel;

  return (
    <section className={styles.section} aria-labelledby={`episodes-${seriesId}`}>
      <Heading id={`episodes-${seriesId}`} className={styles.title}>
        {title}
        <span className={styles.count}>
          {episodes.length} épisode{episodes.length > 1 ? 's' : ''}
        </span>
      </Heading>
      <ol className={styles.list}>
        {episodes.map((episode) => {
          const current = episode.number === currentNumber;
          return (
            <li key={episode.number}>
              <Link
                href={`/serie/${seriesId}/episode/${episode.number}`}
                className={`${styles.item} ${current ? styles.current : ''}`}
                aria-current={current ? 'page' : undefined}
              >
                <span className={styles.thumb}>
                  <Image src={episode.thumbnail} alt="" fill sizes="176px" />
                  {episode.kind === 'scene' ? <span className={styles.sceneVeil} aria-hidden="true" /> : null}
                  <span className={styles.duration}>{formatDuration(episode.seconds)}</span>
                  <span className={styles.play} aria-hidden="true">
                    <Play size={18} strokeWidth={2} fill="currentColor" />
                  </span>
                </span>
                <span className={styles.text}>
                  <span className={styles.number}>
                    Épisode {episode.number}
                    {current ? <span className={styles.badge}>En cours</span> : null}
                  </span>
                  <span className={styles.name}>{episode.title}</span>
                  <span className={styles.synopsis}>{episode.synopsis}</span>
                  <span className={styles.povs}>
                    {episode.kind === 'video' ? (
                      <>
                        <SwitchCamera size={14} strokeWidth={2} aria-hidden="true" />
                        Vidéo
                        {episode.video && episode.video.povs.length > 1 ? ` · ${episode.video.povs.length} points de vue` : ''}
                      </>
                    ) : (
                      <>
                        {format === '3D' ? <Orbit size={14} strokeWidth={2} aria-hidden="true" /> : <Box size={14} strokeWidth={2} aria-hidden="true" />}
                        Temps réel {format} · points de vue{format === '3D' ? ' · caméra libre' : ''}
                      </>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
