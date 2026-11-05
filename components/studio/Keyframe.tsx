'use client';

/**
 * Keyframe — losange d'une keyframe sur une piste.
 *
 * Props :
 *  - x          position horizontale (px) dans la zone des pistes
 *  - selected   sélectionnée (contour clair, halo)
 *  - summary    losange de résumé (ligne du composant : toutes ses pistes)
 *  - interpolation  forme de l'interpolation sortante (indice visuel)
 *  - onPointerDown  début de sélection / glisser (géré par la timeline)
 *
 * Clavier : ←/→ déplacer d'une image (Maj : 10), Suppr : supprimer,
 * Entrée : sélectionner (Maj / Ctrl : ajouter à la sélection).
 */
import type { KeyboardEvent, PointerEvent } from 'react';
import type { Interpolation } from '@/lib/studio/types';
import styles from './Timeline.module.css';

interface KeyframeProps {
  x: number;
  label: string;
  selected: boolean;
  summary?: boolean;
  interpolation?: Interpolation;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export default function Keyframe({ x, label, selected, summary, interpolation, onPointerDown, onKeyDown }: KeyframeProps) {
  return (
    <button
      type="button"
      className={`${styles.key} ${summary ? styles.keySummary : ''}`}
      style={{ left: x }}
      aria-label={label}
      aria-pressed={selected}
      data-interp={interpolation}
      data-keys="local"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
