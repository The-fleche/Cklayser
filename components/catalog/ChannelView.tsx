/**
 * ChannelView — page d'une chaîne : présentation, boutons Suivre / Adhérer
 * et toutes ses séries.
 *
 * Props : channel. Composant serveur ; les boutons sont des composants client.
 */
import { formatSubscribers, getSeriesByChannel } from '@/lib/catalog';
import type { Channel } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import SeriesCard from '@/components/home/SeriesCard';
import ChannelActions from './ChannelActions';
import styles from './catalog.module.css';

export default function ChannelView({ channel }: { channel: Channel }) {
  const list = getSeriesByChannel(channel.id);
  const exclusives = list.filter((item) => item.exclusive).length;

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>
        <KeyframeDiamond size={6} />
        Chaîne · {channel.specialty}
      </p>
      <div className={`${styles.channelCard} ${styles.channelHeader}`}>
        <div className={styles.channelInfo}>
          <Avatar src={channel.avatar} size={80} ring />
          <div>
            <h1 className={`${styles.title} ${styles.titleFlush}`}>
              {channel.name}
            </h1>
            <p className={styles.channelMeta}>
              {formatSubscribers(channel.subscribers)} abonnés · {list.length} séries
              {exclusives ? ` · ${exclusives} exclusivité${exclusives > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>
        <ChannelActions channelId={channel.id} channelName={channel.name} />
      </div>

      <section className={styles.section} aria-labelledby="chaine-series">
        <h2 id="chaine-series" className={styles.sectionTitle}>
          Séries
        </h2>
        <ul className={styles.grid}>
          {list.map((item) => (
            <li key={item.id}>
              <SeriesCard series={item} sizes="(max-width: 767px) 92vw, 320px" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
