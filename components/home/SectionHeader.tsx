/**
 * SectionHeader — en-tête commun des rangées de la page d'accueil.
 *
 * Rôle : titre éditorial (Fraunces), ornement « keyframe » (petit losange
 * doré lumineux + ligne fine qui s'estompe vers la droite) et lien
 * « Voir plus ».
 *
 * Props :
 *  - id     identifiant du titre (pour aria-labelledby de la section)
 *  - title  texte du titre (h2)
 *  - href   destination de « Voir plus » (facultatif)
 *
 * États : lien « Voir plus » au survol (chevron décalé) et au focus.
 */
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  id: string;
  title: string;
  href?: string;
}

export default function SectionHeader({ id, title, href }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      <span className={styles.ornament} aria-hidden="true">
        <KeyframeDiamond size={6} />
        <span className={styles.line} />
      </span>
      {href ? (
        <Link href={href} className={styles.more}>
          Voir plus
          <span className="sr-only"> : {title}</span>
          <ChevronRight size={20} strokeWidth={2.25} aria-hidden="true" className={styles.chevron} />
        </Link>
      ) : null}
    </div>
  );
}
