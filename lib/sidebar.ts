/** Cookie de la préférence d'affichage de la sidebar (desktop). */
export const SIDEBAR_COOKIE = 'cklayser-sidebar';

/** Valeur du cookie → sidebar repliée ? */
export function isSidebarCollapsed(value: string | undefined): boolean {
  return value === 'collapsed';
}
