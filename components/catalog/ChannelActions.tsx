'use client';

/**
 * ChannelActions — boutons « Suivre » et « Adhérer » d'une chaîne.
 *
 * Props :
 *  - channelId   chaîne concernée
 *  - channelName nom (complète le nom accessible des boutons)
 *
 * États : suivie / non suivie (aria-pressed), adhérent / non adhérent.
 * Visiteur : les deux boutons ouvrent la création de compte.
 */
import { BadgeCheck, Check, Plus } from 'lucide-react';
import { membershipPrices } from '@/data/mock';
import { useAppState } from '@/lib/app-state';
import Button from '@/components/ui/Button';
import styles from './catalog.module.css';

export default function ChannelActions({ channelId, channelName }: { channelId: string; channelName: string }) {
  const { isMember, isFollowing, toggleFollow, isMemberOf, toggleMembership } = useAppState();
  const following = isMember && isFollowing(channelId);
  const joined = isMember && isMemberOf(channelId);
  const price = membershipPrices[channelId] ?? '4,99 €';

  return (
    <div className={styles.channelActions}>
      <Button
        variant="secondary"
        size="sm"
        aria-pressed={following}
        icon={following ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : <Plus size={16} strokeWidth={2.5} aria-hidden="true" />}
        onClick={() => toggleFollow(channelId)}
      >
        {following ? 'Suivie' : 'Suivre'}
        <span className="sr-only"> {channelName}</span>
      </Button>
      {joined ? (
        <span className={styles.memberTag}>
          <BadgeCheck size={18} strokeWidth={2} aria-hidden="true" />
          Adhérent
        </span>
      ) : (
        <Button variant="primary" size="sm" onClick={() => toggleMembership(channelId)}>
          Adhérer · {price}/mois
          <span className="sr-only"> à {channelName}</span>
        </Button>
      )}
    </div>
  );
}
