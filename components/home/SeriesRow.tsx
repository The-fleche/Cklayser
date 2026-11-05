'use client';

/**
 * SeriesRow — rangée défilante horizontalement (section de la page d'accueil).
 *
 * Rôle : une <section> titrée contenant une liste de cartes (séries ou
 * univers), défilable horizontalement à la souris, au clavier (Tab entre
 * les cartes), au trackpad et au toucher, avec des boutons de défilement
 * qui apparaissent au survol quand la rangée déborde.
 *
 * Props :
 *  - title    titre de la section (h2)
 *  - href     destination de « Voir plus »
 *  - variant  'series' (quatre cartes par vue sur desktop) | 'universe'
 *             (cartes de largeur fixe, la dernière est rognée par le bord)
 *  - children éléments <li> de la liste
 *
 * États : début / fin de rangée (boutons précédent / suivant masqués selon
 * la position de défilement).
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import IconButton from '@/components/ui/IconButton';
import SectionHeader from './SectionHeader';
import styles from './SeriesRow.module.css';

interface SeriesRowProps {
  title: string;
  href?: string;
  variant?: 'series' | 'universe';
  children: ReactNode;
}

export default function SeriesRow({ title, href, variant = 'series', children }: SeriesRowProps) {
  const baseId = useId();
  const titleId = `${baseId}-titre`;
  const railId = `${baseId}-rangee`;
  const railRef = useRef<HTMLUListElement>(null);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanPrevious(rail.scrollLeft > 4);
    setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const rail = railRef.current;
    if (!rail) return undefined;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [updateEdges]);

  const scrollByPage = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section className={`${styles.section} ${styles[variant]}`} aria-labelledby={titleId}>
      <SectionHeader id={titleId} title={title} href={href} />

      <div className={styles.railWrap}>
        <ul id={railId} ref={railRef} className={styles.rail} onScroll={updateEdges}>
          {children}
        </ul>

        <IconButton
          label={`Faire défiler vers la gauche : ${title}`}
          variant="soft"
          size={40}
          className={`${styles.scrollButton} ${styles.scrollPrevious}`}
          aria-controls={railId}
          hidden={!canPrevious}
          onClick={() => scrollByPage(-1)}
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </IconButton>
        <IconButton
          label={`Faire défiler vers la droite : ${title}`}
          variant="soft"
          size={40}
          className={`${styles.scrollButton} ${styles.scrollNext}`}
          aria-controls={railId}
          hidden={!canNext}
          onClick={() => scrollByPage(1)}
        >
          <ChevronRight size={22} strokeWidth={2} />
        </IconButton>
      </div>
    </section>
  );
}
