/**
 * /serie/[id] — page de présentation d'une série.
 *
 * Le spectateur choisit d'abord son épisode : bandeau (visuel, titre,
 * informations, « Commencer : épisode 1 », Ma liste), puis la liste des
 * épisodes (vidéo et temps réel), puis la fiche de la série et des séries du
 * même univers. Aucun épisode n'est lancé automatiquement.
 *
 * Compatibilité : l'ancien lien /serie/[id]?episode=N redirige vers
 * /serie/[id]/episode/N.
 */
import { Play } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import SeriesCard from '@/components/home/SeriesCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import EpisodeList from '@/components/watch/EpisodeList';
import SeriesListButton from '@/components/watch/SeriesListButton';
import { formatSeriesMeta, getAllSeries, getChannel, getPrimaryBadge, getSeries, getUniverse } from '@/lib/catalog';
import { formatDuration, getSeriesEpisodes } from '@/lib/series-content';
import styles from './series.module.css';

interface SeriePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string | string[] }>;
}

export async function generateMetadata({ params }: SeriePageProps): Promise<Metadata> {
  const { id } = await params;
  const series = getSeries(id);
  return series ? { title: series.title, description: series.synopsis } : { title: 'Série introuvable' };
}

export default async function SeriePage({ params, searchParams }: SeriePageProps) {
  const { id } = await params;
  const series = getSeries(id);
  if (!series) notFound();

  const legacy = (await searchParams).episode;
  const legacyNumber = Number(Array.isArray(legacy) ? legacy[0] : legacy);
  if (Number.isInteger(legacyNumber) && legacyNumber > 0) redirect(`/serie/${series.id}/episode/${legacyNumber}`);

  const channel = getChannel(series.channelId);
  const universe = getUniverse(series.universe);
  const badge = getPrimaryBadge(series);
  const episodes = getSeriesEpisodes(series);
  const first = episodes[0];
  const totalSeconds = episodes.reduce((sum, episode) => sum + episode.seconds, 0);
  const related = getAllSeries()
    .filter((item) => item.universe === series.universe && item.id !== series.id)
    .slice(0, 4);

  return (
    <div className={styles.page}>
      <section className={styles.banner} aria-labelledby="serie-titre">
        <div className={styles.backdrop} aria-hidden="true">
          <Image src={series.image} alt="" fill sizes="100vw" className={styles.backdropImage} />
        </div>
        <div className={styles.bannerText}>
          <p className={styles.kicker}>
            <KeyframeDiamond size={9} />
            {universe?.name ?? 'Série'} · Animation {series.format}
            {series.interactive3d ? ' · points de vue' : ''}
          </p>
          <h1 id="serie-titre" className={styles.title}>
            {series.title}
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
          <p className={styles.synopsis}>{series.synopsis}</p>
          <div className={styles.actions}>
            {first ? (
              <Button href={`/serie/${series.id}/episode/${first.number}`} variant="primary" size="md" icon={<Play size={18} strokeWidth={2} fill="currentColor" aria-hidden="true" />}>
                Commencer : épisode {first.number}
              </Button>
            ) : null}
            <SeriesListButton seriesId={series.id} />
          </div>
          <p className={styles.summary}>
            {episodes.length} épisode{episodes.length > 1 ? 's' : ''} disponible{episodes.length > 1 ? 's' : ''} · {formatDuration(totalSeconds)} au total
          </p>
        </div>
        <div className={styles.poster}>
          <Image src={series.image} alt={series.imageAlt} fill sizes="(max-width: 1023px) 100vw, 480px" preload />
        </div>
      </section>

      <div className={styles.columns}>
        <EpisodeList seriesId={series.id} episodes={episodes} format={series.format} title="Choisir un épisode" />

        <aside className={styles.about} aria-labelledby="serie-apropos">
          <h2 id="serie-apropos" className={styles.aboutTitle}>
            À propos
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>Format</dt>
              <dd>Animation {series.format}</dd>
            </div>
            <div>
              <dt>Saison</dt>
              <dd>
                {series.season} · {series.episodeCount} épisodes prévus
              </dd>
            </div>
            <div>
              <dt>Univers</dt>
              <dd>{universe ? <Link href={`/decouvrir?univers=${universe.id}`}>{universe.name}</Link> : '—'}</dd>
            </div>
            {channel ? (
              <div>
                <dt>Chaîne</dt>
                <dd>
                  <Link href={`/chaine/${channel.id}`}>{channel.name}</Link> · {channel.specialty}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className={styles.aboutText}>
            Les épisodes « temps réel » ne sont pas des vidéos : CKlayser transmet la scène (personnages, squelettes, décors,
            caméras, animation) et votre appareil la reconstruit. Vous pouvez changer de point de vue
            {series.format === '3D' ? ' ou tourner librement autour de la scène' : ''} pendant la lecture.
          </p>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className={styles.related} aria-labelledby="serie-univers">
          <h2 id="serie-univers" className={styles.relatedTitle}>
            Dans le même univers
          </h2>
          <ul className={styles.relatedGrid}>
            {related.map((item) => (
              <li key={item.id}>
                <SeriesCard series={item} sizes="(max-width: 767px) 75vw, 25vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
