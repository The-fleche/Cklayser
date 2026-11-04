'use client';

/**
 * LikeButton — « J'aime » d'une discussion ou d'une réponse.
 *
 * Props :
 *  - likeKey  clé enregistrée (« idDiscussion » ou « idDiscussion/idRéponse »)
 *  - count    total fictif, hors « j'aime » du membre
 *  - label    complément du nom accessible (« la discussion », « la réponse de … »)
 *
 * États : aimé (aria-pressed, cœur plein) / non aimé. Visiteur : ouvre la
 * création de compte.
 */
import { Heart } from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { useForumStore } from '@/lib/forum-store';
import styles from './forum.module.css';

export default function LikeButton({ likeKey, count, label }: { likeKey: string; count: number; label: string }) {
  const { isMember, openAuthDialog } = useAppState();
  const { isLiked, toggleLike } = useForumStore();
  const liked = isMember && isLiked(likeKey);
  const total = count + (liked ? 1 : 0);

  return (
    <button
      type="button"
      className={styles.like}
      aria-pressed={liked}
      aria-label={`J’aime ${label} (${total})`}
      onClick={() =>
        isMember ? toggleLike(likeKey) : openAuthDialog('signup', 'Créez un compte gratuit pour participer aux forums.')
      }
    >
      <Heart size={16} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
      <span aria-hidden="true">{total}</span>
    </button>
  );
}
