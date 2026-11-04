'use client';

/**
 * SeriesCard — carte d'une série (ratio de la capture ≈ 16:10).
 *
 * Rôle : visuel, badge unique, titre (Fraunces) et métadonnées posés sur
 * l'image au-dessus d'un voile sombre, signet « Ma liste ».
 *
 * Props :
 *  - series    série affichée
 *  - meta      métadonnées à afficher (par défaut « S1 • 12 épisodes • Animation 2D »)
 *  - progress  progression 0 → 1 (rangée « Continuer à regarder ») : barre
 *              fine terracotta en bas de l'image
 *  - progressLabel  texte accessible de la progression
 *  - sizes     attribut sizes de l'image
 *
 * États :
 *  - survol : élévation de 4 px, zoom d'image de 2 %, liseré intérieur
 *    terracotta de 2 px, ombre profonde (≈ 300 ms) ;
 *  - focus clavier : anneau doré bien visible autour de la carte ;
 *  - signet : bouton bascule (aria-pressed), plein quand la série est dans
 *    Ma liste ; état conservé pendant la session.
 * Toute la carte est cliquable (lien étiré vers /serie/[id]) ; le signet
 * reste un bouton distinct, jamais imbriqué dans le lien.
 */
import { Bookmark } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useId, type ReactNode } from 'react';
import { useAppState } from '@/lib/app-state';
import { formatSeriesMeta, getPrimaryBadge } from '@/lib/catalog';
import type { Series } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import styles from './SeriesCard.module.css';

interface SeriesCardProps {
  series: Series;
  meta?: string;
  /** Icône placée avant la ligne meta (ex. : cadenas « Réservé aux adhérents »). */
  metaIcon?: ReactNode;
  progress?: number;
  progressLabel?: string;
  sizes?: string;
}

export default function SeriesCard({
  series,
  meta,
  metaIcon,
  progress,
  progressLabel,
  sizes = '(max-width: 767px) 75vw, (max-width: 1279px) 32vw, 24vw',
}: SeriesCardProps) {
  const { isMember, isFavorite, toggleFavorite } = useAppState();
  const titleId = useId();
  const badge = getPrimaryBadge(series);
  const saved = isMember && isFavorite(series.id);
  const percent = progress !== undefined ? Math.round(Math.min(Math.max(progress, 0), 1) * 100) : undefined;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.media}>
        <Image src={series.image} alt={series.imageAlt} fill sizes={sizes} className={styles.image} />
      </div>
      <div className={styles.veil} aria-hidden="true" />

      {badge ? <Badge kind={badge} className={styles.badge} /> : null}

      <div className={styles.body}>
        <h3 id={titleId} className={styles.title}>
          <Link href={`/serie/${series.id}`} className={styles.link}>
            {series.title}
          </Link>
        </h3>
        <p className={styles.meta}>
          {metaIcon ? <span className={styles.metaIcon}>{metaIcon}</span> : null}
          {meta ?? formatSeriesMeta(series)}
        </p>
      </div>

      <button
        type="button"
        className={styles.bookmark}
        aria-label={`Ajouter à ma liste : ${series.title}`}
        aria-pressed={saved}
        onClick={() => toggleFavorite(series.id)}
      >
        <Bookmark
          size={26}
          strokeWidth={1.75}
          aria-hidden="true"
          className={styles.bookmarkIcon}
          fill={saved ? 'currentColor' : 'none'}
        />
      </button>

      {percent !== undefined ? (
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={progressLabel ?? `Progression : ${series.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className={styles.progressValue} style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </article>
  );
}
