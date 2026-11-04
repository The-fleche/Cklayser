'use client';

/**
 * AppStateProvider — état applicatif partagé (côté client).
 *
 * Rôle : centralise l'état du spectateur et les interactions transverses
 * (Ma liste, notifications, fenêtres de connexion/inscription, annonces).
 *
 * Props : children.
 *
 * États exposés :
 *  - viewer        'member' par défaut (comme la capture). Piloté par l'URL :
 *                  ?state=guest ou ?state=member (lu dès le rendu serveur,
 *                  la route étant rendue dynamiquement — voir app/layout.tsx).
 *  - favorites     séries enregistrées dans « Ma liste », conservées pendant
 *                  la session du navigateur (sessionStorage).
 *  - unreadIds     notifications non lues (pastille de la cloche).
 *  - authDialog    null | { mode: 'login' | 'signup', reason? } — fenêtre de
 *                  démonstration, aucun vrai compte n'est créé.
 *  - toast         dernier message annoncé (affiché + lu par les lecteurs d'écran).
 *  - profile       profil du membre (nom, pseudo, photo…), modifiable sur
 *                  /profil et conservé dans ce navigateur (localStorage).
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { currentUser, initialUnreadNotificationIds } from '@/data/mock';
import { getSeries } from '@/lib/catalog';
import { restoreProfile } from '@/lib/profile';
import type { UserProfile, ViewerState } from '@/lib/types';

export type AuthMode = 'login' | 'signup';

export interface AuthDialogState {
  mode: AuthMode;
  /** Phrase de contexte (ex. : pourquoi la connexion est demandée). */
  reason?: string;
}

export interface ToastState {
  id: number;
  message: string;
}

interface AppStateValue {
  viewer: ViewerState;
  isMember: boolean;
  setViewer: (next: ViewerState) => void;
  signOut: () => void;

  favorites: readonly string[];
  isFavorite: (seriesId: string) => boolean;
  toggleFavorite: (seriesId: string) => void;

  unreadIds: readonly string[];
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;

  authDialog: AuthDialogState | null;
  openAuthDialog: (mode: AuthMode, reason?: string) => void;
  closeAuthDialog: () => void;
  completeAuth: () => void;

  toast: ToastState | null;
  announce: (message: string) => void;
  dismissToast: () => void;

  profile: UserProfile;
  /** Enregistre le profil (déjà validé) ; renvoie false si le stockage a échoué. */
  saveProfile: (next: UserProfile) => boolean;
  resetProfile: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

/** Clé de stockage de Ma liste (durée de vie : la session du navigateur). */
const FAVORITES_STORAGE_KEY = 'cklayser:ma-liste';
/** Clé de stockage du profil (conservé d'une visite à l'autre). */
const PROFILE_STORAGE_KEY = 'cklayser:profil';

/** Lit ?state= et ne retient que les deux valeurs reconnues. */
function parseViewer(value: string | null): ViewerState | null {
  return value === 'guest' || value === 'member' ? value : null;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlViewer = parseViewer(searchParams.get('state'));

  /* ----- Visiteur / membre ------------------------------------------------ */
  const [viewer, setViewerState] = useState<ViewerState>(urlViewer ?? 'member');

  // Synchronisation pendant le rendu (motif recommandé par React) : si le
  // paramètre d'URL change (commutateur de dev, lien partagé), il fait foi.
  const [lastUrlViewer, setLastUrlViewer] = useState(urlViewer);
  if (urlViewer !== lastUrlViewer) {
    setLastUrlViewer(urlViewer);
    if (urlViewer) setViewerState(urlViewer);
  }

  const setViewer = useCallback(
    (next: ViewerState) => {
      setViewerState(next);
      // Si l'URL porte déjà ?state=, on la garde cohérente avec l'état réel.
      if (searchParams.has('state')) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('state', next);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  /* ----- Profil ------------------------------------------------------------ */
  const [profile, setProfile] = useState<UserProfile>(currentUser);
  const profileName = useRef(currentUser.name);
  profileName.current = profile.name;

  // Lecture après l'hydratation (même principe que Ma liste).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) setProfile(restoreProfile(JSON.parse(stored), currentUser));
    } catch {
      // Stockage indisponible ou données illisibles : profil par défaut.
    }
  }, []);

  const saveProfile = useCallback((next: UserProfile) => {
    setProfile(next);
    try {
      // avatar: null mémorise « photo retirée » (sinon la photo par défaut reviendrait).
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...next, avatar: next.avatar ?? null }));
      return true;
    } catch {
      // Quota dépassé ou stockage bloqué : le profil reste appliqué pour cette visite.
      return false;
    }
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(currentUser);
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // Ignoré : rien à effacer.
    }
  }, []);

  /* ----- Annonces (toast + aria-live) ------------------------------------- */
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastCounter = useRef(0);
  const announce = useCallback((message: string) => {
    toastCounter.current += 1;
    setToast({ id: toastCounter.current, message });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  /* ----- Fenêtre de connexion / inscription ------------------------------- */
  const [authDialog, setAuthDialog] = useState<AuthDialogState | null>(null);
  const openAuthDialog = useCallback((mode: AuthMode, reason?: string) => {
    setAuthDialog({ mode, reason });
  }, []);
  const closeAuthDialog = useCallback(() => setAuthDialog(null), []);
  const completeAuth = useCallback(() => {
    setAuthDialog(null);
    setViewer('member');
    announce(`Bienvenue, ${profileName.current.split(' ')[0]} ! Connexion de démonstration réussie.`);
  }, [announce, setViewer]);

  const signOut = useCallback(() => {
    setViewer('guest');
    announce('Déconnexion effectuée (démonstration).');
  }, [announce, setViewer]);

  /* ----- Ma liste (favoris) ------------------------------------------------ */
  const [favorites, setFavorites] = useState<string[]>([]);

  // Lecture différée après l'hydratation : le rendu serveur et le premier
  // rendu client restent identiques (liste vide), puis la session est relue.
  // L'écriture se fait uniquement lors d'une action de l'utilisateur
  // (toggleFavorite) : un effet de sauvegarde risquerait d'écraser la
  // session avec la liste vide initiale (double montage du mode strict).
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((value): value is string => typeof value === 'string'));
        }
      }
    } catch {
      // Stockage indisponible (navigation privée stricte) : Ma liste reste en mémoire.
    }
  }, []);

  const isFavorite = useCallback((seriesId: string) => favorites.includes(seriesId), [favorites]);

  const toggleFavorite = useCallback(
    (seriesId: string) => {
      const title = getSeries(seriesId)?.title ?? 'La série';
      if (viewer === 'guest') {
        openAuthDialog('signup', `Créez un compte gratuit pour enregistrer « ${title} » dans Ma liste.`);
        return;
      }
      const alreadySaved = favorites.includes(seriesId);
      const next = alreadySaved ? favorites.filter((id) => id !== seriesId) : [...favorites, seriesId];
      setFavorites(next);
      try {
        window.sessionStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignoré volontairement : la liste reste disponible en mémoire.
      }
      announce(alreadySaved ? `« ${title} » a été retirée de Ma liste.` : `« ${title} » a été ajoutée à Ma liste.`);
    },
    [announce, favorites, openAuthDialog, viewer],
  );

  /* ----- Notifications ----------------------------------------------------- */
  const [unreadIds, setUnreadIds] = useState<string[]>(initialUnreadNotificationIds);
  const markAllNotificationsRead = useCallback(() => setUnreadIds([]), []);
  const markNotificationRead = useCallback(
    (id: string) => setUnreadIds((current) => current.filter((value) => value !== id)),
    [],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      viewer,
      isMember: viewer === 'member',
      setViewer,
      signOut,
      favorites,
      isFavorite,
      toggleFavorite,
      unreadIds,
      markAllNotificationsRead,
      markNotificationRead,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      completeAuth,
      toast,
      announce,
      dismissToast,
      profile,
      saveProfile,
      resetProfile,
    }),
    [
      viewer,
      setViewer,
      signOut,
      favorites,
      isFavorite,
      toggleFavorite,
      unreadIds,
      markAllNotificationsRead,
      markNotificationRead,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      completeAuth,
      toast,
      announce,
      dismissToast,
      profile,
      saveProfile,
      resetProfile,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/** Accès à l'état partagé. Doit être appelé sous <AppStateProvider>. */
export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState doit être utilisé à l’intérieur de <AppStateProvider>.');
  }
  return context;
}
