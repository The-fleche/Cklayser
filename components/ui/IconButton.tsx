/**
 * IconButton — bouton rond ne contenant qu'une icône.
 *
 * Rôle : flèches du carrousel, bouton « + » (Ma liste), cloche, défilement
 * des rangées. Le libellé accessible est OBLIGATOIRE (`label` → aria-label),
 * puisque l'icône seule n'a pas de nom.
 *
 * Props :
 *  - label     nom accessible (aria-label)
 *  - variant   'dark' (fond brun sombre, flèches) | 'outline' (contour clair, « + »)
 *              | 'plain' (sans fond, cloche) | 'soft' (fond de surface)
 *  - size      diamètre en px (40 par défaut)
 *  - pressed   état bascule → aria-pressed (ex. : série déjà dans Ma liste)
 *  - indicator pastille orange + texte accessible (ex. : « 3 non lues »)
 *  - autres props natives de <button>
 *
 * États : repos, survol (fond éclairci), focus clavier (anneau doré),
 * pressé, désactivé (atténué + curseur interdit).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './IconButton.module.css';

type Variant = 'dark' | 'outline' | 'plain' | 'soft';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  label: string;
  variant?: Variant;
  size?: number;
  pressed?: boolean;
  /** Texte accessible de la pastille ; la pastille n'est affichée que s'il est fourni. */
  indicator?: string;
  children: ReactNode;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'dark', size = 40, pressed, indicator, className, style, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={indicator ? `${label} (${indicator})` : label}
      aria-pressed={pressed}
      className={[styles.iconButton, styles[variant], className ?? ''].filter(Boolean).join(' ')}
      // Le diamètre est une donnée de mise en page passée en variable CSS.
      style={{ ...style, ['--icon-button-size' as string]: `${size}px` }}
      {...rest}
    >
      <span className={styles.glyph} aria-hidden="true">
        {children}
      </span>
      {indicator ? <span className={styles.indicator} aria-hidden="true" /> : null}
    </button>
  );
});

export default IconButton;
