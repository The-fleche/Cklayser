/**
 * KeyframeDiamond — petit losange doré lumineux.
 *
 * Rôle : motif de marque évoquant une image-clé (keyframe) d'animation.
 * Utilisé entre les titres de section et leur ligne décorative, et dans le
 * décor de la sidebar. Purement décoratif : toujours aria-hidden.
 *
 * Props :
 *  - size      côté du carré avant rotation, en px (6 par défaut → ~8,5 px de diagonale)
 *  - glow      ajoute un halo doré (true par défaut)
 *  - className classe additionnelle (positionnement)
 *
 * États : aucun (élément statique).
 */
import styles from './KeyframeDiamond.module.css';

interface KeyframeDiamondProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

export default function KeyframeDiamond({ size = 6, glow = true, className }: KeyframeDiamondProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.diamond, glow ? styles.glow : '', className ?? ''].filter(Boolean).join(' ')}
      style={{ ['--diamond-size' as string]: `${size}px` }}
    />
  );
}
