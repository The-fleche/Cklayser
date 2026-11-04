'use client';

/**
 * HeroSlide — une diapositive du carrousel principal.
 *
 * Rôle : visuel panoramique + badge, titre éditorial (Fraunces italique),
 * synopsis, bouton « Regarder maintenant » et bouton « + » (Ma liste).
 *
 * Props :
 *  - slide     données de la diapositive (visuel, point focal)
 *  - series    série mise en avant
 *  - active    diapositive visible ; les autres sont inertes (inert +
 *              aria-hidden) pour le clavier et les lecteurs d'écran
 *  - position / total   « 1 sur 3 » (nom accessible du groupe)
 *  - preload   précharge le visuel (première diapositive : LCP)
 *  - playing   la vidéo de fond (si la diapositive en a une) doit jouer :
 *              diapositive active, sans pause ni mouvement réduit
 *  - watchHref lien « Regarder maintenant » (dernier épisode de la série)
 *
 * Vidéo : l'affiche (slide.image) est rendue par next/image en dessous ;
 * la vidéo, muette, sans contrôles et en boucle, apparaît en fondu une fois
 * lancée. Elle repart du début à chaque retour sur la diapositive.
 *
 * États : membre (« Regarder maintenant ») / visiteur (« Regarder
 * gratuitement ») ; série enregistrée ou non (bouton « + » ↔ coche,
 * aria-pressed).
 */
import { Check, Play, Plus } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import { getPrimaryBadge } from '@/lib/catalog';
import type { HeroSlide as HeroSlideData, Series } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import styles from './HeroSlide.module.css';

interface HeroSlideProps {
  slide: HeroSlideData;
  series: Series;
  active: boolean;
  position: number;
  total: number;
  preload?: boolean;
  watchHref?: string;
  playing?: boolean;
}

export default function HeroSlide({
  slide,
  series,
  active,
  position,
  total,
  preload = false,
  watchHref,
  playing = false,
}: HeroSlideProps) {
  const { isMember, isFavorite, toggleFavorite } = useAppState();
  const badge = getPrimaryBadge(series);
  const saved = isMember && isFavorite(series.id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoShown, setVideoShown] = useState(false);

  // Retour au début quand la diapositive redevient active.
  useEffect(() => {
    const video = videoRef.current;
    if (video && active) video.currentTime = 0;
  }, [active]);

  // Lecture / pause pilotées par le carrousel. Un refus de lecture
  // automatique par le navigateur laisse simplement l'affiche visible.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.play().catch(() => setVideoShown(false));
    } else {
      video.pause();
    }
  }, [playing]);

  return (
    <div
      className={`${styles.slide} ${active ? styles.active : ''}`}
      role="group"
      aria-roledescription="diapositive"
      aria-label={`${position} sur ${total} : ${series.title}`}
      aria-hidden={!active}
      inert={!active}
    >
      <div className={styles.media}>
        {/* Cadre du visuel : plein hero pour une illustration ; décalé à
            droite pour une vidéo (cadrage 16:9, sujet hors de la colonne de
            texte), avec un fondu sur son bord gauche. */}
        <div className={`${styles.frame} ${slide.video ? styles.frameVideo : ''}`}>
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            preload={preload}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) calc(100vw - 76px), calc(100vw - 252px)"
            className={styles.image}
            style={{ objectPosition: slide.focus ?? '70% 50%' }}
          />
          {slide.video ? (
            <video
              ref={videoRef}
              className={`${styles.video} ${videoShown ? styles.videoShown : ''}`}
              src={slide.video}
              poster={slide.image}
              muted
              playsInline
              loop
              preload={preload ? 'auto' : 'metadata'}
              aria-hidden="true"
              tabIndex={-1}
              style={{ objectPosition: slide.focus ?? '50% 50%' }}
              onPlaying={() => setVideoShown(true)}
            />
          ) : null}
        </div>
        <div className={styles.veil} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        {badge ? <Badge kind={badge} size="md" className={styles.badge} /> : null}
        <h2 className={styles.title}>{series.title}</h2>
        <p className={styles.synopsis}>{series.synopsis}</p>
        <div className={styles.actions}>
          <Button
            href={watchHref ?? `/serie/${series.id}`}
            variant="primary"
            size="md"
            icon={<Play size={20} strokeWidth={2} fill="currentColor" />}
            className={styles.watch}
          >
            {isMember ? 'Regarder maintenant' : 'Regarder gratuitement'}
          </Button>
          <IconButton
            label={`Ajouter à ma liste : ${series.title}`}
            variant="outline"
            size={50}
            pressed={saved}
            onClick={() => toggleFavorite(series.id)}
          >
            {saved ? <Check size={22} strokeWidth={2} /> : <Plus size={24} strokeWidth={2} />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
