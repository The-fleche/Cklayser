'use client';

/**
 * SearchBar — recherche interactive du catalogue.
 *
 * Rôle : filtre les séries et les créateurs des données fictives pendant la
 * saisie et propose un menu de résultats (motif ARIA « combobox » + liste).
 *
 * Props :
 *  - variant     'inline' (pilule du header, desktop/tablette)
 *                | 'overlay' (recherche plein écran sur mobile)
 *  - inputRef    référence vers le champ (raccourci clavier « / » géré par Topbar)
 *  - autoFocus   place le focus à l'ouverture (variante overlay)
 *  - onNavigate  appelé après le choix d'un résultat (ferme l'overlay)
 *
 * États :
 *  - fermé       champ seul ;
 *  - ouvert      liste de résultats (séries, créateurs) ou message « aucun résultat » ;
 *  - option active (flèches ↑ ↓), validation par Entrée, fermeture par Échap ;
 *  - focus       anneau doré autour de la pilule.
 */
import { Search, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { formatSubscribers, getUniverse, searchCatalog, META_SEPARATOR } from '@/lib/catalog';
import { useDismiss } from '@/lib/hooks';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  variant?: 'inline' | 'overlay';
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}

interface ResultOption {
  key: string;
  href: string;
  kind: 'series' | 'channel';
  title: string;
  meta: string;
  image: string;
}

export default function SearchBar({
  variant = 'inline',
  inputRef,
  autoFocus = false,
  onNavigate,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-resultats`;
  const statusId = `${baseId}-statut`;

  const localInputRef = useRef<HTMLInputElement>(null);
  const fieldRef = inputRef ?? localInputRef;
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  /* Résultats calculés à partir de la requête (données fictives). */
  const options = useMemo<ResultOption[]>(() => {
    const { series, channels } = searchCatalog(query);
    return [
      ...series.map((item) => ({
        key: `serie-${item.id}`,
        href: `/serie/${item.id}`,
        kind: 'series' as const,
        title: item.title,
        meta: [`Animation ${item.format}`, getUniverse(item.universe)?.name ?? ''].filter(Boolean).join(META_SEPARATOR),
        image: item.image,
      })),
      ...channels.map((channel) => ({
        key: `chaine-${channel.id}`,
        href: `/chaine/${channel.id}`,
        kind: 'channel' as const,
        title: channel.name,
        meta: `${formatSubscribers(channel.subscribers)} abonnés${META_SEPARATOR}${channel.specialty}`,
        image: channel.avatar,
      })),
    ];
  }, [query]);

  const seriesOptions = options.filter((option) => option.kind === 'series');
  const channelOptions = options.filter((option) => option.kind === 'channel');
  const hasQuery = query.trim().length > 0;
  const showPanel = open && hasQuery;

  useDismiss([rootRef], () => setOpen(false), open && variant === 'inline');

  const goTo = (option: ResultOption) => {
    setOpen(false);
    setActiveIndex(-1);
    router.push(option.href);
    onNavigate?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown': {
        if (!hasQuery) return;
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) => (options.length === 0 ? -1 : (index + 1) % options.length));
        break;
      }
      case 'ArrowUp': {
        if (!hasQuery) return;
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) =>
          options.length === 0 ? -1 : index <= 0 ? options.length - 1 : index - 1,
        );
        break;
      }
      case 'Enter': {
        const option = options[activeIndex] ?? options[0];
        if (open && option) {
          event.preventDefault();
          goTo(option);
        }
        break;
      }
      case 'Escape': {
        // 1er appui : ferme la liste ; 2e appui : efface la saisie.
        if (open && hasQuery) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          setActiveIndex(-1);
        } else if (hasQuery) {
          event.preventDefault();
          event.stopPropagation();
          setQuery('');
        }
        break;
      }
      default:
        break;
    }
  };

  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;
  const statusMessage = !hasQuery
    ? ''
    : options.length === 0
      ? `Aucun résultat pour « ${query.trim()} ».`
      : `${options.length} résultat${options.length > 1 ? 's' : ''} disponible${options.length > 1 ? 's' : ''}. Utilisez les flèches pour parcourir.`;

  const renderOption = (option: ResultOption) => {
    const index = options.indexOf(option);
    const isActive = index === activeIndex;
    return (
      <div
        key={option.key}
        id={`${baseId}-${option.key}`}
        role="option"
        aria-selected={isActive}
        className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
        // mousedown plutôt que click : le champ ne perd pas le focus avant la navigation.
        onMouseDown={(event) => {
          event.preventDefault();
          goTo(option);
        }}
        onMouseEnter={() => setActiveIndex(index)}
      >
        <span className={option.kind === 'series' ? styles.thumb : styles.thumbRound}>
          <Image src={option.image} alt="" fill sizes="64px" className={styles.thumbImage} />
        </span>
        <span className={styles.optionText}>
          <span className={styles.optionTitle}>{option.title}</span>
          <span className={styles.optionMeta}>{option.meta}</span>
        </span>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={[styles.search, variant === 'overlay' ? styles.overlayVariant : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="search"
    >
      <label htmlFor={`${baseId}-champ`} className="sr-only">
        Rechercher une série ou un créateur
      </label>
      <div className={styles.field}>
        <Search size={22} strokeWidth={2} className={styles.searchIcon} aria-hidden="true" />
        <input
          ref={fieldRef}
          id={`${baseId}-champ`}
          type="search"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={showPanel && activeOption ? `${baseId}-${activeOption.key}` : undefined}
          aria-describedby={statusId}
          aria-keyshortcuts="/"
          placeholder="Rechercher une série, un créateur..."
          className={styles.input}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {hasQuery ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Effacer la recherche"
            onClick={() => {
              setQuery('');
              setActiveIndex(-1);
              fieldRef.current?.focus();
            }}
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p id={statusId} className="sr-only" aria-live="polite">
        {statusMessage}
      </p>

      <div className={styles.panel} hidden={!showPanel}>
        {/* Liste de résultats groupés : listbox > group > option (ARIA 1.2). */}
        <div id={listboxId} role="listbox" aria-label="Résultats de recherche" className={styles.listbox}>
          {seriesOptions.length > 0 ? (
            <div role="group" aria-labelledby={`${baseId}-groupe-series`}>
              <div id={`${baseId}-groupe-series`} role="presentation" className={styles.groupLabel}>
                Séries
              </div>
              {seriesOptions.map(renderOption)}
            </div>
          ) : null}
          {channelOptions.length > 0 ? (
            <div role="group" aria-labelledby={`${baseId}-groupe-createurs`}>
              <div id={`${baseId}-groupe-createurs`} role="presentation" className={styles.groupLabel}>
                Créateurs
              </div>
              {channelOptions.map(renderOption)}
            </div>
          ) : null}
        </div>
        {options.length === 0 ? (
          <p className={styles.empty}>
            Aucun résultat pour « {query.trim()} ». Essayez « Lune », « 3D » ou « ClayBot ».
          </p>
        ) : null}
      </div>
    </div>
  );
}
