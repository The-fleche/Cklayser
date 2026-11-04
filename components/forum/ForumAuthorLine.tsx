'use client';

/**
 * ForumAuthorLine — avatar, nom, badge « Équipe » (compte d'une chaîne) ou
 * « Vous », et ancienneté d'un message.
 *
 * Props :
 *  - authorId   identifiant fictif, ou ME pour le membre connecté
 *  - age        ancienneté déjà formatée (« il y a 2 h »)
 *  - size       diamètre de l'avatar
 */
import { BadgeCheck } from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { ME, getForumAuthor } from '@/lib/forum';
import { getInitials } from '@/lib/profile';
import Avatar from '@/components/ui/Avatar';
import styles from './forum.module.css';

export default function ForumAuthorLine({ authorId, age, size = 36 }: { authorId: string; age: string; size?: number }) {
  const { profile } = useAppState();
  const me = authorId === ME;
  const author = me ? undefined : getForumAuthor(authorId);
  const name = me ? profile.name : (author?.name ?? 'Membre');
  const avatar = me ? profile.avatar : author?.avatar;

  return (
    <div className={styles.author}>
      <Avatar src={avatar} initials={getInitials(name)} size={size} />
      <div className={styles.authorText}>
        <span className={styles.authorName}>
          {name}
          {author?.channelId ? (
            <span className={styles.teamBadge}>
              <BadgeCheck size={14} strokeWidth={2.25} aria-hidden="true" />
              Équipe
            </span>
          ) : null}
          {me ? <span className={styles.meBadge}>Vous</span> : null}
        </span>
        <span className={styles.authorMeta}>{age}</span>
      </div>
    </div>
  );
}
