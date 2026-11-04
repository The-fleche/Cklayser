'use client';

/**
 * Hooks utilitaires partagés.
 *
 *  - useDismiss              ferme un menu/panneau au clic extérieur ou sur Échap.
 *  - useMediaQuery           suit une media query (false au rendu serveur).
 *  - usePrefersReducedMotion raccourci pour prefers-reduced-motion: reduce.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Ferme un élément flottant lorsqu'on clique à l'extérieur des éléments
 * fournis ou qu'on appuie sur Échap.
 * @param refs      éléments considérés comme « intérieurs » (déclencheur + panneau)
 * @param onDismiss fonction de fermeture ; reçoit la raison pour rendre le focus si besoin
 * @param enabled   écoute active uniquement quand le panneau est ouvert
 */
export function useDismiss(
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  onDismiss: (reason: 'outside' | 'escape') => void,
  enabled: boolean,
): void {
  // Références stables vers les dernières valeurs : l'abonnement aux
  // événements ne dépend que de `enabled`, pas de chaque rendu du parent.
  const handlerRef = useRef(onDismiss);
  const refsRef = useRef(refs);
  useEffect(() => {
    handlerRef.current = onDismiss;
    refsRef.current = refs;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inside = refsRef.current.some((ref) => ref.current?.contains(target));
      if (!inside) handlerRef.current('outside');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handlerRef.current('escape');
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
}

/** Suit une media query côté client. Renvoie false pendant le rendu serveur. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** true si l'utilisateur a demandé à réduire les animations. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** true si la cible d'un événement clavier est un champ de saisie. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
