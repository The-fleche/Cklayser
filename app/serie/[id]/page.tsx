/**
 * /serie/[id] — page de visionnage.
 *
 * - Série avec des épisodes vidéo (data/mock.ts → episodes) : lecteur à
 *   points de vue (PovPlayer), informations et liste des épisodes.
 *   L'épisode est choisi par ?episode=N (le premier par défaut).
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
import EpisodeList from '@/components/watch/EpisodeList';
import { formatSeriesMeta, getChannel, getEpisode, getEpisodes, getPrimaryBadge, getSeries } from '@/lib/catalog';
import styles from './watch.module.css';

interface SeriePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string | string[] }>;
}

/** ?episode=2 → 2 ; toute autre valeur → undefined (premier épisode). */
function parseEpisodeNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const number = Number(raw);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

export async function generateMetadata({ params, searchParams }: SeriePageProps): Promise<Metadata> {
  const { id } = await params;
  const series = getSeries(id);
  if (!series) return { title: 'Série introuvable' };
  const episode = getEpisode(series.id, parseEpisodeNumber((await searchParams).episode));
  return { title: episode ? `${series.title} · Épisode ${episode.number}` : series.title };
}

export default async function SeriePage({ params, searchParams }: SeriePageProps) {
  const { id } = await params;
  const requested = parseEpisodeNumber((await searchParams).episode);
  const series = getSeries(id);
  if (!series) notFound();

  const channel = getChannel(series.channelId);
  const badge = getPrimaryBadge(series);
  const episode = getEpisode(series.id, requested);
  const allEpisodes = getEpisodes(series.id);

  if (episode) {
    return (
      <div className={styles.page}>
        {/* key : un nouvel épisode remonte un lecteur neuf (état remis à zéro). */}
        <PovPlayer
          key={episode.id}
          povs={episode.povs}
          title={`${series.title}, épisode ${episode.number} : ${episode.title}`}
        />

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

        <EpisodeList seriesId={series.id} episodes={allEpisodes} currentId={episode.id} />
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
