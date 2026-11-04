/**
 * EpisodeList — liste des épisodes d'une série, sous le lecteur.
 *
 * Props :
 *  - seriesId    série (liens /serie/[id]?episode=N)
 *  - episodes    épisodes dans l'ordre
 *  - currentId   épisode en cours (aria-current="page" + mention « En cours »)
 *
 * États : aucun (composant serveur).
 */
import { Play, SwitchCamera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Episode } from '@/lib/types';
import styles from './EpisodeList.module.css';

interface EpisodeListProps {
  seriesId: string;
  episodes: Episode[];
  currentId: string;
}

/** 12 → « 0:12 » ; 2,7 → « 0:03 ». */
function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function EpisodeList({ seriesId, episodes, currentId }: EpisodeListProps) {
  if (episodes.length < 2) return null;

  return (
    <section className={styles.section} aria-labelledby="episodes-title">
      <h2 id="episodes-title" className={styles.title}>
        Épisodes
      </h2>
      <ol className={styles.list}>
        {episodes.map((episode) => {
          const current = episode.id === currentId;
          return (
            <li key={episode.id}>
              <Link
                href={`/serie/${seriesId}?episode=${episode.number}`}
                className={`${styles.item} ${current ? styles.current : ''}`}
                aria-current={current ? 'page' : undefined}
              >
                <span className={styles.thumb}>
                  <Image src={episode.thumbnail} alt="" fill sizes="176px" />
                  <span className={styles.duration}>{formatDuration(episode.duration)}</span>
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
                  {episode.povs.length > 1 ? (
                    <span className={styles.povs}>
                      <SwitchCamera size={14} strokeWidth={2} aria-hidden="true" />
                      {episode.povs.length} points de vue
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
