'use client';

/**
 * HomeSections — rangées de découverte sous le hero.
 *
 * Rôle : assembler les sections de la page d'accueil selon l'état du
 * spectateur.
 *
 * Props : aucune.
 *
 * États :
 *  - membre   « Recommandées pour vous », « Parcourir par univers »,
 *             « En avance cette semaine », « Continuer à regarder » ;
 *  - visiteur « Populaires en ce moment » (au lieu de « Recommandées pour
 *             vous ») et pas de « Continuer à regarder ».
 */
import { continueWatching, earlyIds, popularIds, recommendedIds, universes } from '@/data/mock';
import { useAppState } from '@/lib/app-state';
import { getSeries, getSeriesList, META_SEPARATOR } from '@/lib/catalog';
import SeriesCard from './SeriesCard';
import SeriesRow from './SeriesRow';
import UniverseCard from './UniverseCard';
import styles from './HomeSections.module.css';

export default function HomeSections() {
  const { isMember } = useAppState();
  const firstRow = getSeriesList(isMember ? recommendedIds : popularIds);
  const earlyRow = getSeriesList(earlyIds);

  return (
    <div className={styles.sections}>
      <SeriesRow title={isMember ? 'Recommandées pour vous' : 'Populaires en ce moment'} href="/decouvrir">
        {firstRow.map((series) => (
          <li key={series.id}>
            <SeriesCard series={series} />
          </li>
        ))}
      </SeriesRow>

      <SeriesRow title="Parcourir par univers" href="/decouvrir" variant="universe">
        {universes.map((universe) => (
          <li key={universe.id}>
            <UniverseCard universe={universe} />
          </li>
        ))}
      </SeriesRow>

      <SeriesRow title="En avance cette semaine" href="/exclusives">
        {earlyRow.map((series) => (
          <li key={series.id}>
            <SeriesCard series={series} />
          </li>
        ))}
      </SeriesRow>

      {isMember ? (
        <SeriesRow title="Continuer à regarder" href="/profil">
          {continueWatching.map((item) => {
            const series = getSeries(item.seriesId);
            if (!series) return null;
            return (
              <li key={item.seriesId}>
                <SeriesCard
                  series={series}
                  meta={[`S${series.season}`, `Épisode ${item.episode}`, `${item.remainingMinutes} min restantes`].join(META_SEPARATOR)}
                  progress={item.progress}
                  progressLabel={`Épisode ${item.episode} de ${series.title} : progression`}
                />
              </li>
            );
          })}
        </SeriesRow>
      ) : null}
    </div>
  );
}
