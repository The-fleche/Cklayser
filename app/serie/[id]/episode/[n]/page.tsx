/**
 * /serie/[id]/episode/[n] — lecture d'un épisode choisi sur la page de la
 * série.
 *
 *  - épisode vidéo : lecteur à points de vue (PovPlayer) ;
 *  - épisode temps réel : la scène est reconstruite et jouée sur l'appareil
 *    (ScenePlayer), avec ses points de vue, sa caméra libre et son son ;
 *    elle peut aussi s'ouvrir dans CKlayser Studio.
 * Sous le lecteur : informations, puis les autres épisodes.
 */
import { ArrowLeft, Wand2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import EpisodeList from '@/components/watch/EpisodeList';
import PovPlayer from '@/components/watch/PovPlayer';
import ScenePlayer from '@/components/watch/ScenePlayer';
import { formatSeriesMeta, getChannel, getPrimaryBadge, getSeries } from '@/lib/catalog';
import { getSeriesEpisodes } from '@/lib/series-content';
import styles from '../../watch.module.css';

interface EpisodePageProps {
  params: Promise<{ id: string; n: string }>;
}

async function resolve(params: EpisodePageProps['params']) {
  const { id, n } = await params;
  const series = getSeries(id);
  if (!series) return null;
  const episodes = getSeriesEpisodes(series);
  const index = episodes.findIndex((entry) => String(entry.number) === n);
  if (index < 0) return null;
  return { series, episodes, episode: episodes[index]!, next: episodes[index + 1] };
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const data = await resolve(params);
  if (!data) return { title: 'Épisode introuvable' };
  return { title: `${data.series.title} · Épisode ${data.episode.number} : ${data.episode.title}`, description: data.episode.synopsis };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const data = await resolve(params);
  if (!data) notFound();
  const { series, episodes, episode, next } = data;
  const channel = getChannel(series.channelId);
  const badge = getPrimaryBadge(series);
  const nextHref = next ? `/serie/${series.id}/episode/${next.number}` : undefined;

  return (
    <div className={styles.page}>
      <Link href={`/serie/${series.id}`} className={styles.back}>
        <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
        {series.title} : tous les épisodes
      </Link>

      {episode.video ? (
        <PovPlayer key={episode.video.id} povs={episode.video.povs} title={`${series.title}, épisode ${episode.number} : ${episode.title}`} />
      ) : episode.cinematic ? (
        <ScenePlayer key={episode.cinematic.id} cinematic={episode.cinematic} series={{ id: series.id, title: series.title, format: series.format }} nextHref={nextHref} />
      ) : null}

      <section className={styles.info} aria-labelledby="episode-title">
        <p className={styles.kicker}>
          <KeyframeDiamond size={9} />
          Saison {episode.season} · Épisode {episode.number} · {episode.kind === 'video' ? 'Vidéo' : `Temps réel ${series.format}`}
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
        {episode.video && episode.video.povs.length > 1 ? (
          <p className={styles.hint}>
            {episode.video.povs.length} points de vue · touches 1 à {episode.video.povs.length} pour changer de caméra
          </p>
        ) : null}
        {episode.cinematic ? (
          <>
            <p className={styles.hint}>
              Scène reconstruite en temps réel sur votre appareil · touches 1, 2, 3 : points de vue
              {series.format === '3D' ? ' · L : caméra libre' : ''} · M : son
            </p>
            <Link href={`/studio?cinematique=${episode.cinematic.id}`} className={styles.studioLink}>
              <Wand2 size={16} strokeWidth={2} aria-hidden="true" />
              Ouvrir cette scène dans CKlayser Studio
            </Link>
          </>
        ) : null}
      </section>

      <EpisodeList seriesId={series.id} episodes={episodes} format={series.format} currentNumber={episode.number} title="Tous les épisodes" />
    </div>
  );
}
