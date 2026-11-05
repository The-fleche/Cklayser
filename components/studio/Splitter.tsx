'use client';

/**
 * Splitter — séparateur déplaçable entre deux panneaux.
 *
 * Props :
 *  - orientation  « vertical » : barre verticale (redimensionne en largeur) ;
 *                 « horizontal » : barre horizontale (en hauteur)
 *  - value/min/max  taille courante et bornes (annoncées aux lecteurs d'écran)
 *  - onDrag(delta)  déplacement du pointeur en pixels depuis le dernier appel
 *  - onChange       réglage au clavier (flèches : ±16 px, Maj : ±64 px)
 *  - invert         la taille contrôlée est du côté droit / bas
 */
import { useRef } from 'react';
import styles from './StudioLayout.module.css';

interface SplitterProps {
  orientation: 'vertical' | 'horizontal';
  label: string;
  value: number;
  min: number;
  max: number;
  invert?: boolean;
  onDrag: (delta: number) => void;
  onDragEnd: () => void;
  onChange: (value: number) => void;
}

export default function Splitter({ orientation, label, value, min, max, invert, onDrag, onDragEnd, onChange }: SplitterProps) {
  const last = useRef<number | null>(null);
  const vertical = orientation === 'vertical';

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      data-keys="local"
      className={`${styles.splitter} ${vertical ? styles.splitterVertical : styles.splitterHorizontal}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        last.current = vertical ? event.clientX : event.clientY;
      }}
      onPointerMove={(event) => {
        if (last.current === null) return;
        const position = vertical ? event.clientX : event.clientY;
        onDrag(position - last.current);
        last.current = position;
      }}
      onPointerUp={(event) => {
        if (last.current === null) return;
        last.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        onDragEnd();
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 64 : 16;
        const unit = orientation === 'horizontal' && max <= 100 ? Math.max(1, Math.round(step / 8)) : step;
        const grow = vertical ? event.key === 'ArrowRight' : event.key === 'ArrowDown';
        const shrink = vertical ? event.key === 'ArrowLeft' : event.key === 'ArrowUp';
        if (!grow && !shrink) return;
        event.preventDefault();
        const direction = (grow ? 1 : -1) * (invert ? -1 : 1);
        onChange(Math.min(max, Math.max(min, value + direction * unit)));
      }}
    />
  );
}
