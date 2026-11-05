'use client';

/**
 * StudioTooltip — infobulle unique du Studio.
 *
 * Affiche le texte de l'attribut data-tip de l'élément survolé (après un
 * court délai) ou focalisé au clavier. Positionnée en `fixed` : elle n'est
 * jamais rognée par le défilement d'un panneau. Purement visuelle : le nom
 * accessible est porté par aria-label sur l'élément lui-même.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import styles from './StudioLayout.module.css';

interface TipState {
  text: string;
  x: number;
  y: number;
  below: boolean;
}

export default function StudioTooltip({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const show = (target: HTMLElement, delay: number) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const text = target.dataset.tip;
        if (!text || !target.isConnected) return;
        const rect = target.getBoundingClientRect();
        const below = rect.top < 90;
        setTip({ text, x: rect.left + rect.width / 2, y: below ? rect.bottom + 6 : rect.top - 6, below });
      }, delay);
    };
    const hide = () => {
      window.clearTimeout(timer.current);
      setTip(null);
    };
    const onOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tip]');
      if (target) show(target, 450);
      else hide();
    };
    const onFocus = (event: FocusEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tip]');
      if (target?.matches(':focus-visible')) show(target, 0);
      else hide();
    };
    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerdown', hide);
    root.addEventListener('focusin', onFocus);
    root.addEventListener('focusout', hide);
    root.addEventListener('pointerleave', hide);
    return () => {
      window.clearTimeout(timer.current);
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerdown', hide);
      root.removeEventListener('focusin', onFocus);
      root.removeEventListener('focusout', hide);
      root.removeEventListener('pointerleave', hide);
    };
  }, [rootRef]);

  if (!tip) return null;
  return (
    <div
      aria-hidden="true"
      className={`${styles.tooltip} ${tip.below ? styles.tooltipBelow : ''}`}
      style={{ left: Math.max(8, Math.min(tip.x, window.innerWidth - 8)), top: tip.y }}
    >
      {tip.text}
    </div>
  );
}
