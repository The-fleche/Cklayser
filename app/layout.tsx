/**
 * Layout racine de CKlayser.
 *
 * Rôle : polices (next/font/google), feuille globale, état partagé et
 * squelette de l'application : sidebar fixe, header collant, contenu,
 * navigation mobile, fenêtres de démonstration.
 *
 * Rendu dynamique : `await connection()` exclut la page du pré-rendu
 * statique. L'état visiteur/membre (?state=guest|member) est ainsi lu dès le
 * rendu serveur par useSearchParams, sans clignotement à l'hydratation.
 */
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Fraunces, JetBrains_Mono, Manrope } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import AuthDialog from '@/components/layout/AuthDialog';
import DevStateToggle from '@/components/layout/DevStateToggle';
import MobileNav from '@/components/layout/MobileNav';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toast from '@/components/ui/Toast';
import { AppStateProvider } from '@/lib/app-state';
import { THEME_COLOR_HEADER } from '@/lib/theme';
import styles from './layout.module.css';

/* Fraunces : titres éditoriaux (hero, sections, cartes). Police variable,
   romaine et italique, axe d'optique « opsz » pour les très grands corps. */
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

/* Manrope : interface et texte courant. */
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

/* JetBrains Mono : surtitres techniques, compteurs. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CKlayser — Séries animées 2D et 3D',
    template: '%s · CKlayser',
  },
  description:
    'CKlayser diffuse des séries animées 2D et 3D reconstruites en temps réel sur votre appareil. Our Clay, Your Keys.',
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR_HEADER,
  colorScheme: 'dark',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();

  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AppStateProvider>
          <a href="#contenu" className="skip-link">
            Aller au contenu
          </a>
          <Sidebar />
          <div className={styles.column}>
            <Topbar />
            <main id="contenu" tabIndex={-1} className={styles.main}>
              {children}
            </main>
          </div>
          <MobileNav />
          <AuthDialog />
          <Toast />
          {process.env.NODE_ENV === 'development' ? <DevStateToggle /> : null}
        </AppStateProvider>
      </body>
    </html>
  );
}
