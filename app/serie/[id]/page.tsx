/**
 * /serie/[id] — page de visionnage.
 *
 * - Série avec un épisode vidéo (data/mock.ts → episodes) : lecteur à
 *   points de vue (PovPlayer) + informations de l'épisode.
 * - Autres séries : fiche « Bientôt disponible ».
 */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import ComingSoon from '@/components/ui/ComingSoon';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import PovPlayer from '@/components/watch/PovPlayer';
import { formatSeriesMeta, getChannel, getFirstEpisode, getPrimaryBadge, getSeries } from '@/lib/catalog';
import styles from './watch.module.css';

interface SeriePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SeriePageProps): Promise<Metadata> {
  const { id } = await params;
  const series = getSeries(id);
  return { title: series ? series.title : 'Série introuvable' };
}

export default async function SeriePage({ params }: SeriePageProps) {
  const { id } = await params;
  const series = getSeries(id);
  if (!series) notFound();

  const channel = getChannel(series.channelId);
  const badge = getPrimaryBadge(series);
  const episode = getFirstEpisode(series.id);

  if (episode) {
    return (
      <div className={styles.page}>
        <PovPlayer povs={episode.povs} title={`${series.title}, épisode ${episode.number} : ${episode.title}`} />

        <section className={styles.info} aria-labelledby="episode-title">
          <p className={styles.kicker}>
            <KeyframeDiamond size={9} />
            Saison {episode.season} · Épisode {episode.number}
          </p>
          <h1 id="episode-title" className={styles.title}>
            {series.title}
            <span className={styles.episodeTitle}>{episode.title}</span>
          </h1>
          <div className={styles.meta}>
            {badge ? <Badge kind={badge} size="md" /> : null}
            <span>{formatSeriesMeta(series)}</span>
            {channel ? (
              <Link href={`/chaine/${channel.id}`} className={styles.channel}>
                {channel.name}
              </Link>
            ) : null}
          </div>
          <p className={styles.synopsis}>{episode.synopsis}</p>
          {episode.povs.length > 1 ? (
            <p className={styles.hint}>
              {episode.povs.length} points de vue · touches 1 à {episode.povs.length} pour changer de caméra
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <ComingSoon
      kicker="Lecteur · Bientôt disponible"
      title={series.title}
      description={series.synopsis}
      media={
        <Image
          src={series.image}
          alt={series.imageAlt}
          fill
          preload
          sizes="(max-width: 767px) 100vw, 1080px"
        />
      }
      highlights={[
        formatSeriesMeta(series),
        channel ? `Publiée par ${channel.name} (${channel.specialty})` : 'Chaîne indépendante',
        series.interactive3d
          ? 'Série 3D compatible : vous pourrez changer de point de vue pendant le visionnage.'
          : 'Le lecteur reconstruira l’animation en temps réel sur votre appareil.',
      ]}
    >
      {badge ? <Badge kind={badge} size="md" /> : null}
    </ComingSoon>
  );
}
