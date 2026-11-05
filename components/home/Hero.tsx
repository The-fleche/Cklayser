'use client';

/**
 * Hero — carrousel principal de la page d'accueil (trois diapositives).
 *
 * Rôle : mettre en avant les séries phares, élément visuel dominant.
 *
 * Props : aucune (diapositives : data/mock.ts).
 *
 * États et comportements :
 *  - navigation précédente / suivante (flèches rondes en bas à droite) ;
 *  - indicateurs cliquables (actif en terracotta, aria-current) ;
 *  - défilement automatique toutes les 7 s ; 12 s pour une diapositive
 *    vidéo (deux passages de l'extrait) ;
 *  - vidéo de fond : extrait du DERNIER épisode de la série quand il en a un
 *    (Episode.teaser), sinon slide.video. Muette, lancée automatiquement,
 *    en boucle ; lecture seulement sur la diapositive active, arrêtée par
 *    le bouton pause, l'onglet masqué ou le mouvement réduit ;
 *  - « Regarder maintenant » mène à la page de présentation de la série
 *    (choix de l'épisode), pas directement au dernier épisode ;
 *  - bouton son en haut à droite (diapositive vidéo) : la vidéo démarre
 *    muette (exigence des navigateurs pour la lecture automatique) ; le
 *    bouton active ou coupe le son, et ce choix vaut pour toute la visite ;
 *  - pause au survol et au focus clavier ; bouton pause/lecture accessible
 *    au clavier (visible dès qu'il reçoit le focus, et en permanence sur
 *    une diapositive vidéo : WCAG 2.2.2) ;
 *  - clavier : flèches gauche et droite quand le focus est dans le carrousel ;
 *  - balayage tactile (seuil 50 px) ;
 *  - aucun défilement automatique si prefers-reduced-motion est actif ;
 *  - pause quand l'onglet est masqué.
 */
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type TouchEvent } from 'react';
import { heroSlides } from '@/data/mock';
import { getLatestEpisode, getSeries } from '@/lib/catalog';
import { usePrefersReducedMotion } from '@/lib/hooks';
import type { HeroSlide as HeroSlideData, Series } from '@/lib/types';
import IconButton from '@/components/ui/IconButton';
import HeroSlide from './HeroSlide';
import styles from './Hero.module.css';

const AUTOPLAY_DELAY = 7000;
/** Durée d'une diapositive vidéo : deux passages d'un extrait de 6 s. */
const VIDEO_SLIDE_DELAY = 12000;
const SWIPE_THRESHOLD = 50;

interface ResolvedSlide {
  slide: HeroSlideData;
  series: Series;
  watchHref: string;
}

/** Associe chaque diapositive à sa série et à l'extrait de son dernier épisode. */
const slides: ResolvedSlide[] = heroSlides.flatMap((slide) => {
  const series = getSeries(slide.seriesId);
  if (!series) return [];
  const latest = getLatestEpisode(series.id);
  const teaser = latest?.teaser;
  return [
    {
      slide: teaser ? { ...slide, video: teaser.src, image: teaser.poster } : slide,
      series,
      // Page de présentation de la série : le spectateur choisit son épisode.
      watchHref: `/serie/${series.id}`,
    },
  ];
});

export default function Hero() {
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [muted, setMuted] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const autoplay = total > 1 && !reducedMotion && !userPaused && !hovered && !keyboardFocus && !pageHidden;

  const goTo = useCallback((next: number) => setIndex(((next % total) + total) % total), [total]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  const currentHasVideo = Boolean(slides[index]?.slide.video);
  const videoPlaying = !reducedMotion && !userPaused && !pageHidden;

  // Minuterie relancée à chaque changement de diapositive (7 s pleines,
  // 12 s pour une vidéo, qui boucle pendant ce temps).
  useEffect(() => {
    if (!autoplay) return undefined;
    const delay = currentHasVideo ? VIDEO_SLIDE_DELAY : AUTOPLAY_DELAY;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % total), delay);
    return () => window.clearTimeout(timer);
  }, [autoplay, currentHasVideo, index, total]);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previous();
    }
  };

  // Pause au focus CLAVIER uniquement (:focus-visible), reprise quand le
  // focus quitte le carrousel.
  const onFocusCapture = (event: FocusEvent<HTMLElement>) => {
    if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) setKeyboardFocus(true);
  };
  const onBlurCapture = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !rootRef.current?.contains(nextTarget)) setKeyboardFocus(false);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) next();
      else previous();
    }
  };

  const current = slides[index];

  return (
    <section
      ref={rootRef}
      className={styles.hero}
      aria-roledescription="carrousel"
      aria-label="À la une"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Région annoncée seulement quand la rotation est arrêtée, pour ne
          pas interrompre les lecteurs d'écran toutes les 7 s. */}
      <div className={styles.viewport} aria-live={autoplay ? 'off' : 'polite'}>
        {slides.map(({ slide, series, watchHref }, slideIndex) => (
          <HeroSlide
            key={slide.id}
            slide={slide}
            series={series}
            watchHref={watchHref}
            active={slideIndex === index}
            position={slideIndex + 1}
            total={total}
            preload={slideIndex === 0}
            playing={slideIndex === index && videoPlaying}
            muted={muted || slideIndex !== index}
          />
        ))}
      </div>

      {currentHasVideo && !reducedMotion ? (
        <IconButton
          label={muted ? 'Activer le son' : 'Couper le son'}
          variant="dark"
          size={40}
          className={styles.sound}
          onClick={() => setMuted((value) => !value)}
        >
          {muted ? <VolumeX size={20} strokeWidth={2} /> : <Volume2 size={20} strokeWidth={2} />}
        </IconButton>
      ) : null}

      {total > 1 ? (
        <>
          <div className={styles.dotsZone}>
            <div className={styles.dots} role="group" aria-label="Choisir une diapositive">
              {slides.map(({ slide, series }, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  className={styles.dot}
                  aria-label={`Diapositive ${slideIndex + 1} : ${series.title}`}
                  aria-current={slideIndex === index ? 'true' : undefined}
                  onClick={() => goTo(slideIndex)}
                />
              ))}
            </div>
          </div>

          <div className={styles.controls}>
            <IconButton
              label={
                currentHasVideo
                  ? userPaused
                    ? 'Reprendre la vidéo et le défilement automatique'
                    : 'Mettre en pause la vidéo et le défilement automatique'
                  : userPaused
                    ? 'Reprendre le défilement automatique'
                    : 'Mettre en pause le défilement automatique'
              }
              variant="dark"
              size={40}
              className={currentHasVideo && !reducedMotion ? undefined : styles.pauseHidden}
              onClick={() => setUserPaused((value) => !value)}
            >
              {userPaused ? <Play size={16} strokeWidth={2} fill="currentColor" /> : <Pause size={16} strokeWidth={2} fill="currentColor" />}
            </IconButton>
            <IconButton label="Diapositive précédente" variant="dark" size={40} className={styles.arrow} onClick={previous}>
              <ChevronLeft size={24} strokeWidth={2.25} />
            </IconButton>
            <IconButton label="Diapositive suivante" variant="dark" size={40} className={styles.arrow} onClick={next}>
              <ChevronRight size={24} strokeWidth={2.25} />
            </IconButton>
          </div>
        </>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {!autoplay && current ? `Diapositive ${index + 1} sur ${total} : ${current.series.title}` : ''}
      </p>
    </section>
  );
}
