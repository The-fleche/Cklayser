/**
 * UniverseCard — carte illustrée « Parcourir par univers ».
 *
 * Rôle : entrée vers la découverte filtrée par univers (Fantasy,
 * Science-fiction…). Le nom est posé sur l'image, au-dessus d'un voile.
 *
 * Props :
 *  - universe  univers affiché
 *
 * États : survol (zoom d'image de 2 %, liseré intérieur terracotta),
 * focus clavier (anneau doré intérieur : la rangée est rognée sur ses bords).
 */
import Image from 'next/image';
import Link from 'next/link';
import type { Universe } from '@/lib/types';
import styles from './UniverseCard.module.css';

export default function UniverseCard({ universe }: { universe: Universe }) {
  return (
    <Link href={`/decouvrir?univers=${universe.id}`} className={styles.card}>
      <Image
        src={universe.image}
        alt=""
        fill
        sizes="(max-width: 767px) 200px, 277px"
        className={styles.image}
      />
      <span className={styles.veil} aria-hidden="true" />
      <span className={styles.name}>{universe.name}</span>
    </Link>
  );
}
