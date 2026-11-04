/**
 * Button — bouton en pilule de la charte CKlayser.
 *
 * Rôle : actions principales et secondaires (« Regarder maintenant »,
 * « Créer un compte », « Se connecter »…). Rend un lien Next.js si `href`
 * est fourni (navigation), sinon un <button> (action).
 *
 * Props :
 *  - variant   'primary' (terracotta, texte blanc 4,86:1) | 'secondary' (contour clair) | 'ghost'
 *  - size      'md' (48 px, hero) | 'sm' (40 px, header) | 'lg' (52 px, mobile)
 *  - icon      icône facultative placée avant le libellé (décorative)
 *  - href      transforme le bouton en lien
 *  - fullWidth occupe toute la largeur disponible
 *  - autres props natives de <button> (type, onClick, disabled…)
 *
 * États : repos, survol (halo doré + 1 px d'élévation), pressé (--color-terracotta-pressed),
 * focus clavier (anneau doré), désactivé (atténué, curseur interdit).
 */
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  prefetch?: boolean;
  'aria-label'?: string;
  onClick?: () => void;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', icon, fullWidth = false, className, children } = props;

  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link
        href={props.href}
        prefetch={props.prefetch}
        className={classes}
        aria-label={props['aria-label']}
        onClick={props.onClick}
      >
        {content}
      </Link>
    );
  }

  const {
    variant: _variant,
    size: _size,
    icon: _icon,
    fullWidth: _fullWidth,
    className: _className,
    children: _children,
    href: _href,
    type = 'button',
    ...rest
  } = props;

  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
