'use client';

/**
 * SidebarProvider — état d'affichage de la sidebar, partagé entre le bouton
 * menu (☰, dans le header, comme sur YouTube) et la sidebar elle-même.
 *
 * Props :
 *  - initialCollapsed  préférence lue côté serveur dans le cookie
 *                      « cklayser-sidebar » (pas de décalage au chargement)
 *
 * États exposés :
 *  - desktop (≥ 1280 px) : collapsed → rail de 76 px (icônes + libellés
 *    courts) ou sidebar complète de 252 px ; choix mémorisé (cookie, 1 an) ;
 *  - tablette (768 → 1279 px) : rail ; drawerOpen → sidebar complète
 *    par-dessus le contenu. Échap, le voile ou un changement de page la
 *    referment ;
 *  - expanded : la sidebar est-elle affichée en entier (aria-expanded) ?
 */
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useMediaQuery } from '@/lib/hooks';
import { SIDEBAR_COOKIE } from '@/lib/sidebar';

export const SIDEBAR_ID = 'menu-lateral';

interface SidebarState {
  expanded: boolean;
  drawerOpen: boolean;
  toggle: () => void;
  closeDrawer: () => void;
  /** Bouton menu du header : le focus y revient à la fermeture du tiroir. */
  burgerRef: RefObject<HTMLButtonElement | null>;
}

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ initialCollapsed, children }: { initialCollapsed: boolean; children: ReactNode }) {
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Le tiroir se referme à chaque changement de page et en quittant la tablette.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }
  if (!isTablet && drawerOpen) setDrawerOpen(false);

  const toggle = useCallback(() => {
    if (isTablet) {
      setDrawerOpen((open) => !open);
      return;
    }
    setCollapsed((value) => {
      const next = !value;
      document.documentElement.dataset.sidebar = next ? 'collapsed' : 'expanded';
      document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, [isTablet]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const expanded = isTablet ? drawerOpen : !collapsed;
  const value = useMemo(
    () => ({ expanded, drawerOpen, toggle, closeDrawer, burgerRef }),
    [closeDrawer, drawerOpen, expanded, toggle],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarState {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar doit être utilisé à l’intérieur de <SidebarProvider>.');
  return context;
}
