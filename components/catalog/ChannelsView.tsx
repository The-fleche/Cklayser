/**
 * ChannelsView — page « Chaînes » : toutes les chaînes de créateurs, avec un
 * aperçu de leurs séries et les boutons Suivre / Adhérer.
 *
 * Props : aucune. Composant serveur ; les boutons sont des composants client.
 */
import Image from 'next/image';
import Link from 'next/link';
import { formatSubscribers, getAllChannels, getSeriesByChannel } from '@/lib/catalog';
import Avatar from '@/components/ui/Avatar';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import ChannelActions from './ChannelActions';
import styles from './catalog.module.css';

export default function ChannelsView() {
  const list = getAllChannels();

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>
        <KeyframeDiamond size={6} />
        Créateurs
      </p>
      <h1 className={styles.title}>Chaînes</h1>
      <p className={styles.lead}>
        Les studios et les animateurs indépendants qui publient sur CKlayser. Suivez-les pour être prévenu de leurs
        nouveaux épisodes.
      </p>

      <ul className={styles.channelGrid}>
        {list.map((channel) => {
          const seriesList = getSeriesByChannel(channel.id);
          return (
            <li key={channel.id}>
              <article className={styles.channelCard} aria-labelledby={`chaine-${channel.id}`}>
                <div className={styles.channelInfo}>
                  <Avatar src={channel.avatar} size={56} />
                  <div>
                    <h2 id={`chaine-${channel.id}`} className={styles.channelName}>
                      <Link href={`/chaine/${channel.id}`}>{channel.name}</Link>
                    </h2>
                    <p className={styles.channelMeta}>
                      {formatSubscribers(channel.subscribers)} abonnés · {channel.specialty} · {seriesList.length} séries
                    </p>
                  </div>
                </div>
                <div className={styles.channelSeries} aria-hidden="true">
                  {seriesList.slice(0, 3).map((item) => (
                    <span key={item.id} className={styles.channelThumb}>
                      <Image src={item.image} alt="" fill sizes="120px" />
                    </span>
                  ))}
                </div>
                <ChannelActions channelId={channel.id} channelName={channel.name} />
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
