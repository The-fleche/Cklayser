'use client';

/**
 * FollowedChannels — bloc « CHAÎNES SUIVIES » de la sidebar.
 *
 * Rôle : raccourcis vers les chaînes de créateurs. Chaque chaîne affiche un
 * avatar rond de 40 px, son nom, son nombre d'abonnés (chiffres tabulaires)
 * et sa spécialité d'animation.
 *
 * Props : aucune (les données viennent de data/mock.ts).
 *
 * États :
 *  - membre   titre « CHAÎNES SUIVIES », chaînes suivies ;
 *  - visiteur titre « CHAÎNES POPULAIRES », chaînes populaires ;
 *  - tablette avatars seuls, nom en infobulle.
 */
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { popularChannelIds } from '@/data/mock';
import { useAppState } from '@/lib/app-state';
import { formatSubscribers, getChannelList, META_SEPARATOR } from '@/lib/catalog';
import Avatar from '@/components/ui/Avatar';
import styles from './FollowedChannels.module.css';

export default function FollowedChannels() {
  const { isMember, followedChannels } = useAppState();
  const list = getChannelList(isMember ? followedChannels : popularChannelIds);
  const title = isMember ? 'Chaînes suivies' : 'Chaînes populaires';

  return (
    <section className={styles.channels} aria-labelledby="sidebar-channels-title">
      <div className={styles.header}>
        <h2 id="sidebar-channels-title" className={styles.title}>
          {title}
        </h2>
        <Link href="/chaines" className={styles.seeAll}>
          Voir tout
          <span className="sr-only"> : {title.toLowerCase()}</span>
          <ChevronRight size={15} strokeWidth={2.25} aria-hidden="true" className={styles.chevron} />
        </Link>
      </div>

      {list.length === 0 ? (
        <p className={styles.empty}>
          Aucune chaîne suivie. <Link href="/chaines">Découvrir les chaînes</Link>
        </p>
      ) : null}

      <ul className={styles.list}>
        {list.map((channel) => (
          <li key={channel.id}>
            <Link href={`/chaine/${channel.id}`} className={styles.channel}>
              <Avatar src={channel.avatar} size={40} className={styles.avatar} />
              <span className={styles.text}>
                <span className={styles.name}>{channel.name}</span>
                <span className={styles.meta}>
                  <span className={styles.count}>{formatSubscribers(channel.subscribers)}</span> abonnés
                  {META_SEPARATOR}
                  {channel.specialty}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
