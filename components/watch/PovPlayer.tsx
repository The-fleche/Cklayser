'use client';

/**
 * PovPlayer — lecteur vidéo à points de vue multiples.
 *
 * Rôle : lire un épisode filmé sous plusieurs angles et passer d'un point de
 * vue à l'autre sans perdre l'instant en cours.
 *
 * Props :
 *  - povs    points de vue de l'épisode (même mouvement, mêmes instants) ;
 *            avec un seul point de vue, le sélecteur est masqué
 *  - title   titre de l'épisode (nom accessible du lecteur)
 *
 * Principe de la synchronisation :
 *  - une balise <video> par point de vue, superposées et toutes préchargées ;
 *    seule la vidéo active est visible ;
 *  - au changement, on lit le timestamp de la vidéo quittée, on le reporte
 *    sur la nouvelle (borné à sa durée : les extraits n'ont pas exactement la
 *    même longueur), on attend la fin du positionnement (« seeked »), puis on
 *    relance la lecture si elle était en cours et on bascule l'affichage.
 *    L'image de la vidéo quittée reste visible pendant ce court délai : pas
 *    d'écran noir ;
 *  - volume, sourdine et vitesse suivent aussi le changement.
 *
 * Contrôles : lecture/pause, barre de progression (input range), temps
 * écoulé, son, points de vue, plein écran (le cadre entier, pour garder les
 * boutons de point de vue en plein écran).
 *
 * Clavier (focus dans le lecteur) : Espace ou K lecture/pause, ← / → ±0,5 s,
 * 1 à 9 point de vue, M son, F plein écran.
 */
import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { PointOfView } from '@/lib/types';
import styles from './PovPlayer.module.css';

interface PovPlayerProps {
  povs: PointOfView[];
  title: string;
}

/** Marge avant la fin quand on borne un timestamp à une vidéo plus courte. */
const END_MARGIN = 0.03;
/** Pas des flèches du clavier (extraits de quelques secondes). */
const KEY_SEEK_STEP = 0.5;
/** Délai maximal d'attente de l'événement « seeked ». */
const SEEK_TIMEOUT = 1500;

/** 2,345 → « 0:02.3 » (dixièmes : les extraits sont très courts). */
function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

/** Version parlée pour les lecteurs d'écran : « 2,3 secondes ». */
function speakTime(seconds: number): string {
  return `${seconds.toFixed(1).replace('.', ',')} secondes`;
}

/** Attend qu'une vidéo connaisse sa durée (métadonnées chargées). */
function whenMetadataReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
}

/** Positionne une vidéo et attend que l'image correspondante soit prête. */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve();
      return;
    }
    const done = () => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', done);
      resolve();
    };
    const timer = window.setTimeout(done, SEEK_TIMEOUT);
    video.addEventListener('seeked', done);
    video.currentTime = time;
  });
}

export default function PovPlayer({ povs, title }: PovPlayerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  /** Jeton du dernier changement demandé : un clic plus récent annule le précédent. */
  const switchToken = useRef(0);

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const activeVideo = useCallback(() => videoRefs.current[active] ?? null, [active]);

  /* ----- Suivi de la vidéo active (temps, durée, état) -------------------- */
  useEffect(() => {
    const video = videoRefs.current[active];
    if (!video) return undefined;

    const sync = () => {
      setTime(video.currentTime);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setPlaying(!video.paused && !video.ended);
      setEnded(video.ended);
      setMuted(video.muted);
    };
    sync();

    // Progression fluide pendant la lecture (timeupdate n'arrive que ~4 fois/s).
    let frame = 0;
    const tick = () => {
      setTime(video.currentTime);
      frame = window.requestAnimationFrame(tick);
    };
    const onPlay = () => {
      sync();
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(tick);
    };
    const onStop = () => {
      window.cancelAnimationFrame(frame);
      sync();
    };
    if (!video.paused) onPlay();

    const events = ['loadedmetadata', 'durationchange', 'seeked', 'timeupdate', 'volumechange'] as const;
    events.forEach((name) => video.addEventListener(name, sync));
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onStop);
    video.addEventListener('ended', onStop);
    return () => {
      window.cancelAnimationFrame(frame);
      events.forEach((name) => video.removeEventListener(name, sync));
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onStop);
      video.removeEventListener('ended', onStop);
    };
  }, [active]);

  /* ----- Plein écran ------------------------------------------------------ */
  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen().catch(() => undefined);
    }
  }, []);

  /* ----- Lecture ---------------------------------------------------------- */
  const togglePlay = useCallback(() => {
    const video = activeVideo();
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [activeVideo]);

  const seek = useCallback(
    (value: number) => {
      const video = activeVideo();
      if (!video) return;
      const max = Number.isFinite(video.duration) ? video.duration : value;
      video.currentTime = Math.min(Math.max(value, 0), max);
      setTime(video.currentTime);
    },
    [activeVideo],
  );

  const toggleMute = useCallback(() => {
    const video = activeVideo();
    if (video) video.muted = !video.muted;
  }, [activeVideo]);

  /* ----- Changement de point de vue (même timestamp) ---------------------- */
  // Plusieurs clics rapprochés forment une seule transition : l'état de
  // départ (lecture en cours, timestamp) est relevé au premier clic et
  // conservé jusqu'à ce que la dernière demande aboutisse. Sans cela, le
  // deuxième clic lirait une vidéo déjà mise en pause par le premier.
  const pendingSwitch = useRef<{ wasPlaying: boolean; timestamp: number } | null>(null);

  const switchPov = useCallback(
    async (nextIndex: number) => {
      const videos = videoRefs.current;
      const from = videos[active];
      const to = videos[nextIndex];
      const pov = povs[nextIndex];
      if (!from || !to || !pov) return;
      if (nextIndex === active && !pendingSwitch.current) return;

      const token = ++switchToken.current;
      if (!pendingSwitch.current) {
        pendingSwitch.current = { wasPlaying: !from.paused && !from.ended, timestamp: from.currentTime };
      }
      const { wasPlaying, timestamp } = pendingSwitch.current;

      // On fige toutes les vidéos : l'image de celle qu'on quitte reste
      // affichée pendant le positionnement de la nouvelle.
      videos.forEach((video) => video?.pause());
      to.muted = from.muted;
      to.volume = from.volume;
      to.playbackRate = from.playbackRate;

      await whenMetadataReady(to);
      if (token !== switchToken.current) return;

      const limit = Number.isFinite(to.duration) ? Math.max(to.duration - END_MARGIN, 0) : timestamp;
      const target = Math.min(timestamp, limit);
      await seekTo(to, target);
      if (token !== switchToken.current) return;

      if (wasPlaying && target < limit) {
        await to.play().catch(() => undefined);
        // Demande plus récente entre-temps : cette vidéo ne doit pas jouer
        // en arrière-plan.
        if (token !== switchToken.current) {
          to.pause();
          return;
        }
      }

      pendingSwitch.current = null;
      setActive(nextIndex);
      setTime(target);
      const clamped = target < timestamp - 0.001;
      setAnnouncement(
        `Point de vue ${nextIndex + 1} : ${pov.label}, à ${speakTime(target)}` +
          (clamped ? ' (fin de ce point de vue, plus court).' : '.'),
      );
    },
    [active, povs],
  );

  /* ----- Raccourcis clavier ----------------------------------------------- */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    const onButton = target.tagName === 'BUTTON';
    const onRange = target instanceof HTMLInputElement && target.type === 'range';
    const key = event.key.toLowerCase();

    if ((key === ' ' && !onButton && !onRange) || key === 'k') {
      event.preventDefault();
      togglePlay();
    } else if ((key === 'arrowleft' || key === 'arrowright') && !onRange) {
      event.preventDefault();
      seek(time + (key === 'arrowright' ? KEY_SEEK_STEP : -KEY_SEEK_STEP));
    } else if (key === 'm') {
      event.preventDefault();
      toggleMute();
    } else if (key === 'f' && canFullscreen) {
      event.preventDefault();
      toggleFullscreen();
    } else if (/^[1-9]$/.test(key)) {
      const index = Number(key) - 1;
      if (index < povs.length) {
        event.preventDefault();
        void switchPov(index);
      }
    }
  };

  const multiPov = povs.length > 1;
  const progress = duration > 0 ? Math.min(time / duration, 1) : 0;
  const PlayIcon = ended ? RotateCcw : playing ? Pause : Play;
  const playLabel = ended ? 'Revoir' : playing ? 'Pause' : 'Lecture';

  return (
    <div
      ref={frameRef}
      className={`${styles.player} ${fullscreen ? styles.isFullscreen : ''}`}
      role="region"
      aria-label={`Lecteur vidéo : ${title}`}
      aria-keyshortcuts={`Space K ArrowLeft ArrowRight M F${multiPov ? ` ${povs.map((_, index) => index + 1).join(' ')}` : ''}`}
      onKeyDown={onKeyDown}
    >
      <div className={styles.stage}>
        {povs.map((pov, index) => (
          <video
            key={pov.id}
            ref={(element) => {
              videoRefs.current[index] = element;
            }}
            className={`${styles.video} ${index === active ? styles.videoActive : ''}`}
            src={pov.src}
            poster={pov.poster}
            preload="auto"
            playsInline
            aria-hidden={index !== active}
            aria-label={index === active ? `${title}, point de vue ${pov.label}` : undefined}
            onClick={index === active ? togglePlay : undefined}
          />
        ))}

        {/* Grand bouton central tant que la vidéo n'est pas lancée. */}
        {!playing ? (
          <button type="button" className={styles.bigPlay} onClick={togglePlay} aria-label={playLabel} tabIndex={-1}>
            <PlayIcon size={34} strokeWidth={2} fill={ended ? 'none' : 'currentColor'} aria-hidden="true" />
          </button>
        ) : null}

        {multiPov ? (
          <p className={styles.povTag} aria-hidden="true">
            <span className={styles.povTagNumber}>POV {active + 1}</span> {povs[active]?.label}
          </p>
        ) : null}
      </div>

      <div className={styles.controls}>
        <div className={styles.transport}>
          <button type="button" className={styles.control} onClick={togglePlay} aria-label={playLabel}>
            <PlayIcon size={20} strokeWidth={2} fill={ended ? 'none' : 'currentColor'} aria-hidden="true" />
          </button>

          <span className={styles.time} aria-hidden="true">
            {formatTime(time)} <span className={styles.timeTotal}>/ {formatTime(duration)}</span>
          </span>

          <input
            type="range"
            className={styles.seek}
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(time, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Position dans la vidéo"
            aria-valuetext={`${speakTime(time)} sur ${speakTime(duration)}`}
            style={{ '--progress': `${progress * 100}%` } as CSSProperties}
          />

          <button
            type="button"
            className={styles.control}
            onClick={toggleMute}
            aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
            aria-pressed={muted}
          >
            {muted ? <VolumeX size={20} strokeWidth={2} aria-hidden="true" /> : <Volume2 size={20} strokeWidth={2} aria-hidden="true" />}
          </button>

          {canFullscreen ? (
            <button
              type="button"
              className={styles.control}
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {fullscreen ? <Minimize size={20} strokeWidth={2} aria-hidden="true" /> : <Maximize size={20} strokeWidth={2} aria-hidden="true" />}
            </button>
          ) : null}
        </div>

        {multiPov ? (
          <div className={styles.povs} role="group" aria-label="Point de vue">
            <span className={styles.povsLabel} aria-hidden="true">
              Point de vue
            </span>
            {povs.map((pov, index) => (
              <button
                key={pov.id}
                type="button"
                className={styles.pov}
                aria-pressed={index === active}
                aria-label={`Point de vue ${index + 1} : ${pov.label}. ${pov.description}`}
                title={`${pov.description} (touche ${index + 1})`}
                onClick={() => void switchPov(index)}
              >
                <span className={styles.povThumb} style={{ backgroundImage: `url(${pov.poster})` }} aria-hidden="true" />
                <span className={styles.povText} aria-hidden="true">
                  <span className={styles.povNumber}>POV {index + 1}</span>
                  <span className={styles.povName}>{pov.label}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
