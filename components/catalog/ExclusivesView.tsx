'use client';

/**
 * ExclusivesView — page « Séries exclusives ».
 *
 * Rôle : présenter les avantages de l'adhésion à une chaîne, les épisodes
 * publiés en avance, puis les exclusivités de chaque chaîne.
 *
 * Props : aucune.
 *
 * États :
 *  - adhérent d'une chaîne  mention « Adhérent » + bouton pour résilier ;
 *  - non adhérent           bouton « Adhérer · prix/mois » ; les cartes
 *                           indiquent « Réservé aux adhérents » ;
 *  - visiteur               les boutons ouvrent la création de compte.
 * Démonstration : aucun paiement (voir lib/app-state.tsx, toggleMembership).
 */
import { BadgeCheck, Clock, Lock, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { membershipPrices } from '@/data/mock';
import { useAppState } from '@/lib/app-state';
import { formatSeriesMeta, formatSubscribers, getAllChannels, getAllSeries } from '@/lib/catalog';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import SeriesCard from '@/components/home/SeriesCard';
import styles from './catalog.module.css';

export default function ExclusivesView() {
  const { isMember, isMemberOf, toggleMembership } = useAppState();
  const all = getAllSeries();
  const early = all.filter((item) => item.early);
  const channelsWithExclusives = getAllChannels()
    .map((channel) => ({ channel, list: all.filter((item) => item.exclusive && item.channelId === channel.id) }))
    .filter((entry) => entry.list.length > 0);

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>
        <KeyframeDiamond size={6} />
        Adhésions
      </p>
      <h1 className={styles.title}>Séries exclusives</h1>
      <p className={styles.lead}>
        En adhérant à une chaîne, vous soutenez directement ses animateurs et débloquez ses séries réservées, ses
        épisodes en avance et ses coulisses.
      </p>

      <ul className={styles.perks}>
        <li className={styles.perk}>
          <Star size={22} strokeWidth={2} className={styles.perkIcon} aria-hidden="true" />
          <span>
            <strong>Séries réservées</strong>
            Des saisons entières produites pour les adhérents.
          </span>
        </li>
        <li className={styles.perk}>
          <Clock size={22} strokeWidth={2} className={styles.perkIcon} aria-hidden="true" />
          <span>
            <strong>Épisodes en avance</strong>
            Jusqu’à deux semaines avant leur sortie publique.
          </span>
        </li>
        <li className={styles.perk}>
          <Sparkles size={22} strokeWidth={2} className={styles.perkIcon} aria-hidden="true" />
          <span>
            <strong>Coulisses</strong>
            Rigs, animatiques et sessions de questions avec l’équipe.
          </span>
        </li>
      </ul>

      <section className={styles.section} aria-labelledby="early-title">
        <h2 id="early-title" className={styles.sectionTitle}>
          En avance pour les adhérents
        </h2>
        <p className={styles.sectionText}>Les prochains épisodes, déjà disponibles pour les adhérents de leur chaîne.</p>
        <ul className={styles.grid}>
          {early.map((item) => (
            <li key={item.id}>
              <SeriesCard series={item} sizes="(max-width: 767px) 92vw, 320px" />
            </li>
          ))}
        </ul>
      </section>

      {channelsWithExclusives.map(({ channel, list }) => {
        const joined = isMember && isMemberOf(channel.id);
        const price = membershipPrices[channel.id] ?? '4,99 €';
        const titleId = `exclu-${channel.id}`;
        return (
          <section key={channel.id} className={styles.section} aria-labelledby={titleId}>
            <div className={styles.channelCard}>
              <div className={styles.channelInfo}>
                <Avatar src={channel.avatar} size={56} />
                <div>
                  <h2 id={titleId} className={styles.channelName}>
                    <Link href={`/chaine/${channel.id}`}>{channel.name}</Link>
                  </h2>
                  <p className={styles.channelMeta}>
                    {formatSubscribers(channel.subscribers)} abonnés · {channel.specialty} · {list.length} exclusivité
                    {list.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className={styles.channelActions}>
                {joined ? (
                  <>
                    <span className={styles.memberTag}>
                      <BadgeCheck size={18} strokeWidth={2} aria-hidden="true" />
                      Adhérent
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => toggleMembership(channel.id)}>
                      Résilier
                      <span className="sr-only"> l’adhésion à {channel.name}</span>
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => toggleMembership(channel.id)}>
                    Adhérer · {price}/mois
                    <span className="sr-only"> à {channel.name}</span>
                  </Button>
                )}
              </div>
            </div>
            <ul className={styles.grid}>
              {list.map((item) => (
                <li key={item.id}>
                  <SeriesCard
                    series={item}
                    sizes="(max-width: 767px) 92vw, 320px"
                    meta={joined ? formatSeriesMeta(item) : 'Réservé aux adhérents'}
                    metaIcon={joined ? undefined : <Lock size={13} strokeWidth={2.25} aria-hidden="true" />}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
