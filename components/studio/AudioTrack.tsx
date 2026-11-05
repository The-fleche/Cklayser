'use client';

/**
 * AudioTrack — pistes audio d'un clip dans la timeline.
 *
 *  - AudioTrackName : nom du son, muet, volume, retrait (colonne des noms) ;
 *  - AudioTrackLane : bloc du son à sa position (forme d'onde réelle,
 *    décodée par Web Audio), à glisser horizontalement pour le décaler ;
 *    flèches ←/→ au clavier (Maj : 10 images).
 * Les sons sont joués pendant la lecture, synchronisés sur la tête de
 * lecture (lib/studio/audio.ts).
 */
import { Music, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { assetUrl, getAudioInfo, type AudioInfo } from '@/lib/studio/audio';
import { useStudio, useStudioStore } from '@/lib/studio/store';
import type { AudioRef } from '@/lib/studio/types';
import { frameToX } from './TimelineRuler';
import styles from './Timeline.module.css';

function useAudioInfo(assetId: string): AudioInfo | null {
  const asset = useStudio((state) => state.project.assets.find((item) => item.id === assetId));
  const [info, setInfo] = useState<AudioInfo | null>(null);
  const url = assetUrl(asset);
  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    getAudioInfo(url)
      .then((result) => alive && setInfo(result))
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, [url]);
  return info;
}

export function AudioTrackName({ audio }: { audio: AudioRef }) {
  const store = useStudioStore();
  const asset = useStudio((state) => state.project.assets.find((item) => item.id === audio.assetId));
  const name = asset?.name ?? 'Son introuvable';
  return (
    <div className={`${styles.name} ${styles.audioName}`}>
      <Music size={13} strokeWidth={2} aria-hidden="true" className={styles.audioIcon} />
      <span className={styles.propertyLabel} title={name}>
        {name}
      </span>
      <button
        type="button"
        className={styles.audioButton}
        aria-pressed={audio.muted}
        aria-label={audio.muted ? `Rétablir le son de ${name}` : `Couper ${name}`}
        data-tip={audio.muted ? 'Rétablir le son' : 'Couper le son'}
        onClick={() => store.updateAudio(audio.id, { muted: !audio.muted })}
      >
        {audio.muted ? <VolumeX size={13} strokeWidth={2} aria-hidden="true" /> : <Volume2 size={13} strokeWidth={2} aria-hidden="true" />}
      </button>
      <input
        type="range"
        className={styles.volume}
        min={0}
        max={100}
        step={5}
        value={Math.round(audio.volume * 100)}
        aria-label={`Volume de ${name}`}
        aria-valuetext={`${Math.round(audio.volume * 100)} %`}
        onChange={(event) => store.updateAudio(audio.id, { volume: Number(event.target.value) / 100 })}
      />
      <button type="button" className={styles.audioButton} aria-label={`Retirer ${name} de la timeline`} data-tip="Retirer de la timeline" onClick={() => store.removeAudio(audio.id)}>
        <X size={13} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AudioTrackLane({ audio, zoom, fps, width }: { audio: AudioRef; zoom: number; fps: number; width: number }) {
  const store = useStudioStore();
  const asset = useStudio((state) => state.project.assets.find((item) => item.id === audio.assetId));
  const info = useAudioInfo(audio.assetId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const frames = info ? info.duration * fps : fps * 2;
  const left = frameToX(audio.start, zoom);
  const blockWidth = Math.max(8, frames * zoom);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !info) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(blockWidth * ratio);
    canvas.height = Math.round(18 * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    const color = getComputedStyle(canvas).color;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    const mid = canvas.height / 2;
    const columns = info.peaks.length;
    const step = canvas.width / columns;
    info.peaks.forEach((peak, index) => {
      const height = Math.max(1, peak * mid * 0.95);
      context.fillRect(index * step, mid - height, Math.max(1, step - 0.5), height * 2);
    });
  }, [info, blockWidth]);

  return (
    <div className={`${styles.trackRow} ${styles.audioLane}`} style={{ width }}>
      <button
        type="button"
        className={`${styles.audioBlock} ${audio.muted ? styles.audioMuted : ''}`}
        style={{ left, width: blockWidth }}
        aria-label={`${asset?.name ?? 'Son'} : départ image ${audio.start}${info ? `, durée ${info.duration.toFixed(1).replace('.', ',')} s` : ''}. Flèches pour décaler.`}
        data-keys="local"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, start: audio.start, moved: false };
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current) return;
          const delta = Math.round((event.clientX - current.x) / zoom);
          if (!current.moved && delta === 0) return;
          if (!current.moved) {
            current.moved = true;
            store.beginGesture();
          }
          store.updateAudio(audio.id, { start: current.start + delta });
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (drag.current?.moved) store.endGesture();
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const delta = (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 10 : 1);
          store.updateAudio(audio.id, { start: audio.start + delta });
        }}
      >
        <canvas ref={canvasRef} className={styles.wave} style={{ width: blockWidth, height: 18 }} aria-hidden="true" />
        <span className={styles.audioLabel}>{asset?.name}</span>
      </button>
    </div>
  );
}
