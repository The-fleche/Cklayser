'use client';

/**
 * TimelineRuler — règle graduée de la timeline.
 *
 * Graduations en images (pas adapté au zoom) et repères de secondes
 * (« 1 s », « 2 s »…). Cliquer ou glisser sur la règle déplace la tête de
 * lecture (la lecture se met en pause). La règle est aussi un curseur
 * accessible au clavier (role="slider").
 */
import { useRef } from 'react';
import { useStudio, useStudioStore } from '@/lib/studio/store';
import styles from './Timeline.module.css';

export const TIMELINE_PAD = 14;

export function frameToX(frame: number, zoom: number): number {
  return TIMELINE_PAD + frame * zoom;
}

export function xToFrame(x: number, zoom: number): number {
  return (x - TIMELINE_PAD) / zoom;
}

/** Pas des graduations : un diviseur de la cadence (les secondes tombent sur une graduation), ou un multiple. */
function tickStep(zoom: number, fps: number): number {
  const divisors: number[] = [];
  for (let value = 1; value <= fps; value += 1) if (fps % value === 0) divisors.push(value);
  const candidates = [...divisors, fps * 2, fps * 5, fps * 10, fps * 30];
  return candidates.find((step) => step * zoom >= 46) ?? fps * 60;
}

export default function TimelineRuler({ duration, fps, zoom }: { duration: number; fps: number; zoom: number }) {
  const store = useStudioStore();
  const frame = useStudio((state) => Math.round(state.frame));
  const dragging = useRef(false);
  const step = tickStep(zoom, fps);
  const minor = step >= 5 && step * zoom >= 80 ? Math.max(1, step / 5) : step >= 2 ? Math.max(1, step / 2) : 0;

  const ticks: number[] = [];
  for (let value = 0; value <= duration; value += step) ticks.push(value);
  const minors: number[] = [];
  if (minor) for (let value = 0; value <= duration; value += minor) if (value % step !== 0) minors.push(value);
  const seconds: number[] = [];
  for (let value = fps; value <= duration; value += fps) seconds.push(value);

  const scrub = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const target = Math.round(xToFrame(clientX - rect.left, zoom));
    store.setFrame(Math.min(duration, Math.max(0, target)));
  };

  return (
    <div
      className={styles.ruler}
      style={{ width: frameToX(duration, zoom) + TIMELINE_PAD + 24 }}
      role="slider"
      tabIndex={0}
      aria-label="Tête de lecture"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={frame}
      aria-valuetext={`Image ${frame}, ${(frame / fps).toFixed(2).replace('.', ',')} s`}
      data-keys="local"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        store.pause();
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        scrub(event.clientX, event.currentTarget);
      }}
      onPointerMove={(event) => {
        if (dragging.current) scrub(event.clientX, event.currentTarget);
      }}
      onPointerUp={(event) => {
        dragging.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (delta) {
          event.preventDefault();
          store.stepFrame(delta * (event.shiftKey ? 10 : 1));
        } else if (event.key === 'Home') {
          event.preventDefault();
          store.setFrame(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          store.setFrame(duration);
        }
      }}
    >
      {minors.map((value) => (
        <span key={`m${value}`} className={styles.tickMinor} style={{ left: frameToX(value, zoom) }} />
      ))}
      {seconds.map((value) => (
        <span key={`s${value}`} className={styles.second} style={{ left: frameToX(value, zoom) }} />
      ))}
      {ticks.map((value) => (
        <span key={value} className={styles.tick} style={{ left: frameToX(value, zoom) }}>
          <span className={styles.tickLabel}>
            {value}
            {value > 0 && value % fps === 0 ? <span className={styles.tickSeconds}>{value / fps} s</span> : null}
          </span>
        </span>
      ))}
      <span className={styles.rulerEnd} style={{ left: frameToX(duration, zoom) }} aria-hidden="true" />
    </div>
  );
}
