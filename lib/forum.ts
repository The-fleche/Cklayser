/**
 * Fandoms & Forums — accès aux données fictives et formats d'affichage
 * (fonctions pures, utilisables côté serveur). Les contributions du membre
 * sont dans lib/forum-store.ts.
 */
import { forumAuthors, forumTags, forumThreads } from '@/data/forum';
import type { ForumAuthor, ForumTag, ForumThread } from '@/lib/types';

export const ME = 'me';
export const FORUM_TITLE_MAX = 120;
export const FORUM_BODY_MAX = 2000;

/* ----- Données fictives ---------------------------------------------------- */
export function getForumAuthor(id: string): ForumAuthor | undefined {
  return forumAuthors.find((author) => author.id === id);
}

export function getMockThread(id: string): ForumThread | undefined {
  return forumThreads.find((thread) => thread.id === id);
}

export function getTagLabel(tag: ForumTag): string {
  return forumTags.find((item) => item.id === tag)?.label ?? tag;
}

/** 95 → « il y a 1 h » ; 4 300 → « il y a 2 j ». */
export function formatAge(minutes: number): string {
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${Math.round(minutes)} min`;
  if (minutes < 60 * 24) return `il y a ${Math.round(minutes / 60)} h`;
  if (minutes < 60 * 24 * 30) return `il y a ${Math.round(minutes / (60 * 24))} j`;
  return `il y a ${Math.round(minutes / (60 * 24 * 30))} mois`;
}

/** Ancienneté (minutes) d'une contribution datée en millisecondes. */
export function ageFrom(createdAt: number, now: number): number {
  return Math.max(0, (now - createdAt) / 60_000);
}
