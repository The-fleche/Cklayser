'use client';

/**
 * CatalogBrowser — page « Découvrir » : tout le catalogue, filtrable.
 *
 * Props :
 *  - initialUniverse  univers présélectionné (?univers=…, lien « Parcourir
 *                     par univers » de l'accueil)
 *
 * Filtres (combinables) : recherche (titre, synopsis, chaîne), univers,
 * technique (2D / 3D), 3D interactif, nouveautés. Tri : sélection CKlayser,
 * A → Z, nouveautés d'abord, nombre d'épisodes.
 *
 * États : le nombre de résultats est annoncé (aria-live) ; aucun résultat →
 * message et bouton de réinitialisation. L'univers choisi est reporté dans
 * l'URL (lien partageable).
 */
import { Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { universes } from '@/data/mock';
import { getAllSeries, getChannel, normalizeForSearch } from '@/lib/catalog';
import type { AnimationFormat, Series, UniverseId } from '@/lib/types';
import SeriesCard from '@/components/home/SeriesCard';
import Button from '@/components/ui/Button';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import styles from './catalog.module.css';

type SortKey = 'selection' | 'az' | 'new' | 'episodes';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'selection', label: 'Sélection CKlayser' },
  { value: 'az', label: 'Titre (A → Z)' },
  { value: 'new', label: 'Nouveautés d’abord' },
  { value: 'episodes', label: 'Plus d’épisodes' },
];

function sortSeries(list: Series[], key: SortKey): Series[] {
  const copy = [...list];
  switch (key) {
    case 'az':
      return copy.sort((a, b) => a.title.localeCompare(b.title, 'fr', { ignorePunctuation: true }));
    case 'new':
      return copy.sort((a, b) => Number(b.isNew || b.early) - Number(a.isNew || a.early));
    case 'episodes':
      return copy.sort((a, b) => b.episodeCount - a.episodeCount);
    default:
      return copy;
  }
}

export default function CatalogBrowser({ initialUniverse }: { initialUniverse?: UniverseId }) {
  const router = useRouter();
  const pathname = usePathname();
  const uid = useId();
  const [query, setQuery] = useState('');
  const [universe, setUniverse] = useState<UniverseId | 'all'>(initialUniverse ?? 'all');
  const [format, setFormat] = useState<AnimationFormat | 'all'>('all');
  const [onlyInteractive, setOnlyInteractive] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [sort, setSort] = useState<SortKey>('selection');

  // L'URL change (lien « Parcourir par univers », retour arrière) : l'univers suit.
  const [lastInitial, setLastInitial] = useState(initialUniverse);
  if (initialUniverse !== lastInitial) {
    setLastInitial(initialUniverse);
    setUniverse(initialUniverse ?? 'all');
  }

  const results = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    const filtered = getAllSeries().filter((item) => {
      if (universe !== 'all' && item.universe !== universe) return false;
      if (format !== 'all' && item.format !== format) return false;
      if (onlyInteractive && !item.interactive3d) return false;
      if (onlyNew && !item.isNew && !item.early) return false;
      if (!needle) return true;
      const haystack = normalizeForSearch(`${item.title} ${item.synopsis} ${getChannel(item.channelId)?.name ?? ''}`);
      return haystack.includes(needle);
    });
    return sortSeries(filtered, sort);
  }, [format, onlyInteractive, onlyNew, query, sort, universe]);

  const chooseUniverse = (value: UniverseId | 'all') => {
    setUniverse(value);
    router.replace(value === 'all' ? pathname : `${pathname}?univers=${value}`, { scroll: false });
  };

  const filtersActive =
    query !== '' || universe !== 'all' || format !== 'all' || onlyInteractive || onlyNew || sort !== 'selection';

  const reset = () => {
    setQuery('');
    chooseUniverse('all');
    setFormat('all');
    setOnlyInteractive(false);
    setOnlyNew(false);
    setSort('selection');
  };

  const universeName = universes.find((item) => item.id === universe)?.name;

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>
        <KeyframeDiamond size={6} />
        Catalogue
      </p>
      <h1 className={styles.title}>{universeName ? `Découvrir · ${universeName}` : 'Découvrir'}</h1>
      <p className={styles.lead}>
        Toutes les séries animées 2D et 3D de CKlayser. Filtrez par univers ou par technique, et repérez les séries 3D
        interactives, où vous choisissez le point de vue.
      </p>

      <div className={styles.toolbar} role="search" aria-label="Filtrer le catalogue">
        <div className={styles.toolbarRow}>
          <div className={styles.search}>
            <Search size={18} strokeWidth={2} className={styles.searchIcon} aria-hidden="true" />
            <label htmlFor={`${uid}-q`} className="sr-only">
              Rechercher dans le catalogue
            </label>
            <input
              id={`${uid}-q`}
              type="search"
              className={styles.input}
              placeholder="Titre, histoire, chaîne…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <label className={styles.selectLabel}>
            Trier par
            <select className={styles.select} value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.filterGroup}>
          <legend className={styles.filterLegend}>Univers</legend>
          {[{ id: 'all' as const, name: 'Tous' }, ...universes].map((item) => (
            <label key={item.id} className={styles.chip}>
              <input
                type="radio"
                name={`${uid}-univers`}
                checked={universe === item.id}
                onChange={() => chooseUniverse(item.id)}
              />
              {item.name}
            </label>
          ))}
        </fieldset>

        <div className={styles.toolbarRow}>
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterLegend}>Technique</legend>
            {(['all', '2D', '3D'] as const).map((value) => (
              <label key={value} className={styles.chip}>
                <input
                  type="radio"
                  name={`${uid}-format`}
                  checked={format === value}
                  onChange={() => setFormat(value)}
                />
                {value === 'all' ? 'Toutes' : `Animation ${value}`}
              </label>
            ))}
          </fieldset>
          <fieldset className={styles.filterGroup}>
            <legend className="sr-only">Options</legend>
            <label className={styles.chip}>
              <input type="checkbox" checked={onlyInteractive} onChange={(event) => setOnlyInteractive(event.target.checked)} />
              3D interactif
            </label>
            <label className={styles.chip}>
              <input type="checkbox" checked={onlyNew} onChange={(event) => setOnlyNew(event.target.checked)} />
              Nouveautés et avant-premières
            </label>
          </fieldset>
          {filtersActive ? (
            <button type="button" className={styles.reset} onClick={reset}>
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      </div>

      <p className={styles.count} aria-live="polite">
        {results.length} série{results.length > 1 ? 's' : ''}
        {results.length === getAllSeries().length ? ' au catalogue' : ' correspondent à vos filtres'}
      </p>

      {results.length > 0 ? (
        <ul className={styles.grid}>
          {results.map((item) => (
            <li key={item.id}>
              <SeriesCard series={item} sizes="(max-width: 767px) 92vw, 320px" />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>Aucune série ne correspond à ces filtres.</p>
          <Button variant="primary" size="sm" onClick={reset}>
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}
