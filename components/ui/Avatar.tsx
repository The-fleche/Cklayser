/**
 * Avatar — image ronde d'une chaîne ou de l'utilisateur.
 *
 * Rôle : avatars locaux simples (petits SVG dans public/avatars) ou, à
 * défaut d'image, initiales sur fond argile.
 *
 * Props :
 *  - src       chemin d'une image locale (facultatif)
 *  - initials  initiales affichées si aucune image n'est fournie
 *  - size      diamètre en px (40 par défaut, comme les chaînes de la capture)
 *  - ring      anneau clair autour de l'avatar (avatar du header)
 *  - alt       texte alternatif ; laisser vide si le nom est déjà écrit à côté
 *
 * États : aucun.
 */
import Image from 'next/image';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string;
  initials?: string;
  size?: number;
  ring?: boolean;
  alt?: string;
  className?: string;
}

export default function Avatar({ src, initials, size = 40, ring = false, alt = '', className }: AvatarProps) {
  return (
    <span
      className={[styles.avatar, ring ? styles.ring : '', className ?? ''].filter(Boolean).join(' ')}
      style={{ ['--avatar-size' as string]: `${size}px` }}
      role={!src && alt ? 'img' : undefined}
      aria-label={!src && alt ? alt : undefined}
      aria-hidden={!src && !alt ? true : undefined}
    >
      {src ? (
        <Image src={src} alt={alt} width={size} height={size} className={styles.image} />
      ) : (
        <span className={styles.initials} aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  );
}
