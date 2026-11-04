'use client';

/**
 * Contributions du membre aux forums (sujets, réponses, « j'aime »),
 * conservées dans ce navigateur (localStorage).
 *
 * useSyncExternalStore : rendu serveur et premier rendu client identiques
 * (aucune contribution), puis relecture du stockage ; tous les composants de
 * la page partagent le même état.
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { ForumTag } from '@/lib/types';

/* ----- Contributions du membre --------------------------------------------- */
export interface MyReply {
  id: string;
  createdAt: number;
  body: string;
}

export interface MyThread {
  id: string;
  title: string;
  seriesId?: string;
  tag: ForumTag;
  createdAt: number;
  body: string[];
}

interface ForumState {
  threads: MyThread[];
  /** Réponses du membre, par discussion (fictive ou créée par lui). */
  replies: Record<string, MyReply[]>;
  /** « J'aime » donnés : « idDiscussion » ou « idDiscussion/idRéponse ». */
  liked: string[];
}

const STORAGE_KEY = 'cklayser:forum';
const EMPTY: ForumState = { threads: [], replies: {}, liked: [] };

let state: ForumState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ForumState> | null;
    if (parsed && typeof parsed === 'object') {
      state = {
        threads: Array.isArray(parsed.threads) ? parsed.threads : [],
        replies: parsed.replies && typeof parsed.replies === 'object' ? parsed.replies : {},
        liked: Array.isArray(parsed.liked) ? parsed.liked.filter((key) => typeof key === 'string') : [],
      };
    }
  } catch {
    state = EMPTY;
  }
}

function commit(next: ForumState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible : les contributions restent en mémoire.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  // Premier abonnement : prévenir que le stockage vient d'être relu.
  queueMicrotask(listener);
  return () => listeners.delete(listener);
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function useForumStore() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );

  const isLiked = useCallback((key: string) => snapshot.liked.includes(key), [snapshot]);

  const toggleLike = useCallback((key: string) => {
    const liked = state.liked.includes(key) ? state.liked.filter((item) => item !== key) : [...state.liked, key];
    commit({ ...state, liked });
  }, []);

  const addThread = useCallback((input: Omit<MyThread, 'id' | 'createdAt'>): string => {
    const thread: MyThread = { ...input, id: newId('u'), createdAt: Date.now() };
    commit({ ...state, threads: [thread, ...state.threads] });
    return thread.id;
  }, []);

  const addReply = useCallback((threadId: string, body: string) => {
    const reply: MyReply = { id: newId('m'), createdAt: Date.now(), body };
    commit({ ...state, replies: { ...state.replies, [threadId]: [...(state.replies[threadId] ?? []), reply] } });
  }, []);

  const removeThread = useCallback((threadId: string) => {
    const replies = { ...state.replies };
    delete replies[threadId];
    commit({ ...state, threads: state.threads.filter((thread) => thread.id !== threadId), replies });
  }, []);

  return {
    myThreads: snapshot.threads,
    myReplies: snapshot.replies,
    isLiked,
    toggleLike,
    addThread,
    addReply,
    removeThread,
  };
}
