'use client';

/**
 * ScenePlayer — lecteur public des cinématiques temps réel.
 *
 * Aucune vidéo : la scène (format CKlayser Studio) est reconstruite et
 * jouée sur l'appareil par le même moteur que le Studio (SceneRenderer, en
 * mode « aperçu », sans aides d'édition).
 *
 *  - lecture / pause, barre de progression, temps ;
 *  - points de vue proposés par le créateur (caméras du spectateur) avec la
 *    transition choisie : coupe, fondu ou mouvement fluide ;
 *  - caméra libre (scènes 3D compatibles), bornée par les limites définies
 *    dans le Studio ;
 *  - ambiance sonore synchronisée ; son coupé / rétabli ;
 *  - plein écran ; clavier : Espace, 1 à n (points de vue), L (caméra
 *    libre), M (son), F (plein écran).
 *
 * Props :
 *  - cinematic   définition (data/cinematics.ts)
 *  - series      id, titre et format de la série
 *  - nextHref    épisode suivant (proposé à la fin)
 */
import { Maximize2, Minimize2, Orbit, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Cinematic } from '@/data/cinematics';
import { AudioPlayback, assetUrl } from '@/lib/studio/audio';
import { evaluateScene, getActiveClip } from '@/lib/studio/animation';
import { buildCinematic } from '@/lib/studio/cinematics';
import { SceneRenderer } from '@/lib/studio/engine/SceneRenderer';
import type { StudioAsset, StudioScene } from '@/lib/studio/types';
import styles from './PovPlayer.module.css';
import own from './ScenePlayer.module.css';

interface ScenePlayerProps {
  cinematic: Cinematic;
  series: { id: string; title: string; format: '2D' | '3D' };
  nextHref?: string;
}

const SETTINGS = { grid: false, bones: false, cameraPreview: false, snap: false, snapStep: 0.25 };

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function ScenePlayer({ cinematic, series, nextHref }: ScenePlayerProps) {
  const [built, setBuilt] = useState<{ scene: StudioScene; assets: StudioAsset[] } | null>(null);

  // Construction côté client uniquement (WebGL, identifiants générés).
  useEffect(() => {
    setBuilt(buildCinematic(cinematic, series));
  }, [cinematic, series]);

  if (!built) {
    return (
      <div className={`${styles.player} ${own.loading}`} role="status">
        <div className={styles.stage}>
          <p className={own.loadingText}>Reconstruction de la scène…</p>
        </div>
      </div>
    );
  }
  return <Player scene={built.scene} assets={built.assets} title={`${series.title} · ${cinematic.title}`} nextHref={nextHref} />;
}

function Player({ scene, assets, title, nextHref }: { scene: StudioScene; assets: StudioAsset[]; title: string; nextHref?: string }) {
  const clip = getActiveClip(scene)!;
  const duration = clip.duration / clip.fps;
  const povs = scene.viewer.povs;
  const transition = scene.viewer.transition;
  const canFree = scene.dimension === '3d' && scene.viewer.freeCamera.enabled;

  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const audioRef = useRef(new AudioPlayback());
  const time = useRef(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [cameraId, setCameraId] = useState(scene.viewer.mainCameraId ?? povs[0]?.cameraId ?? null);
  const [free, setFree] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fading, setFading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const state = useRef({ cameraId, free });
  state.current = { cameraId, free };

  const resolve = useCallback((id: string) => assetUrl(assets.find((asset) => asset.id === id)), [assets]);

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const frame = time.current * clip.fps;
    renderer.update({
      scene,
      evaluation: evaluateScene(scene, frame),
      assets,
      selectedId: null,
      tool: 'select',
      viewMode: 'preview',
      viewCameraId: state.current.cameraId,
      editorProjection: 'perspective',
      settings: SETTINGS,
      readOnly: true,
      cameraTransition: transition,
      freeCamera: state.current.free,
      frameMargin: 0,
    });
  }, [assets, clip.fps, scene, transition]);

  /* ----- moteur ----- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    try {
      rendererRef.current = new SceneRenderer(host, {
        onSelect: () => undefined,
        onGestureStart: () => undefined,
        onGestureEnd: () => undefined,
        onProperty: () => undefined,
      });
    } catch {
      setWebglError(true);
      return undefined;
    }
    draw();
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [draw]);

  useEffect(() => {
    draw();
  }, [cameraId, free, draw]);

  /* ----- lecture ----- */
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      time.current = Math.min(duration, time.current + (now - last) / 1000);
      last = now;
      draw();
      setDisplayTime(time.current);
      if (time.current >= duration) {
        setPlaying(false);
        setEnded(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, draw]);

  useEffect(() => {
    const audio = audioRef.current;
    if (playing) audio.start(clip.audio ?? [], time.current * clip.fps, clip.fps, 1, resolve);
    else audio.stop();
    return () => audio.stop();
  }, [playing, clip, resolve]);

  useEffect(() => audioRef.current.setMuted(muted), [muted]);

  const togglePlay = useCallback(() => {
    if (ended || time.current >= duration) {
      time.current = 0;
      setEnded(false);
      setDisplayTime(0);
    }
    setPlaying((value) => !value);
  }, [duration, ended]);

  const seek = (seconds: number) => {
    time.current = Math.min(duration, Math.max(0, seconds));
    setDisplayTime(time.current);
    setEnded(false);
    draw();
    if (playing) audioRef.current.start(clip.audio ?? [], time.current * clip.fps, clip.fps, 1, resolve);
  };

  const choosePov = useCallback(
    (id: string) => {
      setFree(false);
      if (id === state.current.cameraId) return;
      if (transition.type === 'fade') {
        setFading(true);
        window.setTimeout(() => {
          setCameraId(id);
          setFading(false);
        }, (transition.duration * 1000) / 2);
      } else setCameraId(id);
    },
    [transition],
  );

  /* ----- plein écran ----- */
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen?.();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).tagName === 'INPUT') return;
    const index = Number(event.key) - 1;
    if (Number.isInteger(index) && povs[index]) {
      event.preventDefault();
      choosePov(povs[index]!.cameraId);
    } else if (event.key === ' ' && (event.target as HTMLElement).tagName !== 'BUTTON') {
      event.preventDefault();
      togglePlay();
    } else if ((event.key === 'l' || event.key === 'L') && canFree) setFree((value) => !value);
    else if (event.key === 'm' || event.key === 'M') setMuted((value) => !value);
    else if (event.key === 'f' || event.key === 'F') toggleFullscreen();
  };

  const currentPov = povs.find((pov) => pov.cameraId === cameraId);
  const progress = useMemo(() => `${(displayTime / duration) * 100}%`, [displayTime, duration]);

  return (
    <div ref={frameRef} className={`${styles.player} ${fullscreen ? styles.isFullscreen : ''}`} onKeyDown={onKeyDown} role="region" aria-label={`Lecteur temps réel : ${title}`}>
      <div className={`${styles.stage} ${own.stage}`}>
        <div ref={hostRef} className={own.canvas} data-testid="scene-player-canvas" />
        {webglError ? <p className={own.error}>WebGL n’est pas disponible : la scène ne peut pas être reconstruite sur cet appareil.</p> : null}
        <div className={`${own.fade} ${fading ? own.fadeOn : ''}`} style={{ transitionDuration: `${(transition.duration * 1000) / 2}ms` }} aria-hidden="true" />
        <p className={styles.povTag} aria-live="polite">
          {free ? (
            'Caméra libre'
          ) : (
            <>
              <span className={styles.povTagNumber}>{povs.findIndex((pov) => pov.cameraId === cameraId) + 1}</span>
              {currentPov?.label ?? 'Caméra'}
            </>
          )}
        </p>
        <span className={own.live} aria-hidden="true">
          Temps réel · {scene.dimension.toUpperCase()}
        </span>
        {free ? <p className={own.freeHint}>Glissez pour tourner autour de la scène · molette : distance</p> : null}
        {!playing ? (
          ended ? (
            <div className={own.endCard}>
              <button type="button" className={own.endButton} onClick={togglePlay}>
                <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
                Revoir
              </button>
              {nextHref ? (
                <Link href={nextHref} className={`${own.endButton} ${own.endPrimary}`}>
                  <SkipForward size={18} strokeWidth={2} aria-hidden="true" />
                  Épisode suivant
                </Link>
              ) : null}
            </div>
          ) : (
            <button type="button" className={styles.bigPlay} onClick={togglePlay} aria-label={displayTime > 0 ? 'Reprendre la lecture' : 'Lire la cinématique'}>
              <Play size={30} strokeWidth={2} fill="currentColor" aria-hidden="true" />
            </button>
          )
        ) : null}
      </div>

      <div className={styles.controls}>
        <div className={styles.transport}>
          <button type="button" className={styles.control} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Lecture'}>
            {playing ? <Pause size={20} strokeWidth={2} fill="currentColor" aria-hidden="true" /> : <Play size={20} strokeWidth={2} fill="currentColor" aria-hidden="true" />}
          </button>
          <span className={styles.time}>
            {formatTime(displayTime)} <span className={styles.timeTotal}>/ {formatTime(duration)}</span>
          </span>
          <input
            type="range"
            className={styles.seek}
            style={{ ['--progress' as string]: progress }}
            min={0}
            max={duration}
            step={1 / 24}
            value={displayTime}
            aria-label="Position dans la cinématique"
            aria-valuetext={`${formatTime(displayTime)} sur ${formatTime(duration)}`}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <button type="button" className={styles.control} onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Rétablir le son' : 'Couper le son'} aria-pressed={muted}>
            {muted ? <VolumeX size={20} strokeWidth={2} aria-hidden="true" /> : <Volume2 size={20} strokeWidth={2} aria-hidden="true" />}
          </button>
          <button type="button" className={styles.control} onClick={toggleFullscreen} aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}>
            {fullscreen ? <Minimize2 size={19} strokeWidth={2} aria-hidden="true" /> : <Maximize2 size={19} strokeWidth={2} aria-hidden="true" />}
          </button>
        </div>

        {povs.length > 0 ? (
          <div className={styles.povs} role="group" aria-label="Points de vue">
            <span className={styles.povsLabel}>Points de vue</span>
            {povs.map((pov, index) => (
              <button
                key={pov.cameraId}
                type="button"
                className={`${styles.pov} ${own.pov}`}
                aria-pressed={!free && pov.cameraId === cameraId}
                aria-keyshortcuts={String(index + 1)}
                onClick={() => choosePov(pov.cameraId)}
              >
                <span className={styles.povText}>
                  <span className={styles.povNumber}>{index + 1}</span>
                  <span className={styles.povName}>{pov.label}</span>
                </span>
              </button>
            ))}
            {canFree ? (
              <button type="button" className={`${styles.pov} ${own.pov}`} aria-pressed={free} aria-keyshortcuts="L" onClick={() => setFree((value) => !value)}>
                <Orbit size={18} strokeWidth={2} aria-hidden="true" />
                <span className={styles.povText}>
                  <span className={styles.povNumber}>L</span>
                  <span className={styles.povName}>Caméra libre</span>
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
