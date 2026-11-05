'use client';

/**
 * AssetBrowser — ressources du projet (panneau inférieur gauche, compact).
 *
 *  - dossiers : Personnages, Décors, Matériaux, Animations, Textures, Audio ;
 *  - recherche par nom ;
 *  - aperçu de la ressource sélectionnée (+ lecture pour les sons) ;
 *  - glisser une ressource vers le viewport ou la hiérarchie : instancie un
 *    composant, applique un matériau ou un préréglage d'animation ;
 *    alternative clavier : bouton « Ajouter à la scène » / « Appliquer » ;
 *  - import : bouton, ou dépôt de fichiers depuis l'ordinateur ;
 *  - suppression des ressources importées non utilisées.
 */
import {
  Amphora,
  Box,
  Circle,
  Cone,
  Cylinder,
  FolderOpen,
  Image as ImageIcon,
  Music,
  Package,
  PersonStanding,
  Plus,
  Search,
  Sparkles,
  Torus,
  Trash2,
  Upload,
  Mountain,
  Pill,
  Square,
} from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { assetUrl } from '@/lib/studio/audio';
import { ACCEPTED_FILES, importFiles } from '@/lib/studio/import';
import { useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import type { AssetFolder, StudioAsset } from '@/lib/studio/types';
import Panel from './Panel';
import { ASSET_DRAG_TYPE } from './SceneHierarchy';
import { ToolButton } from './ui';
import styles from './AssetBrowser.module.css';

const FOLDERS: { id: AssetFolder | 'all'; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'characters', label: 'Personnages' },
  { id: 'environments', label: 'Décors' },
  { id: 'materials', label: 'Matériaux' },
  { id: 'animations', label: 'Animations' },
  { id: 'textures', label: 'Textures' },
  { id: 'audio', label: 'Audio' },
];

const TYPE_LABELS: Record<StudioAsset['type'], string> = {
  model: 'Modèle glTF',
  primitive: 'Objet 3D',
  texture: 'Texture',
  character: 'Personnage rigué',
  environment: 'Décor',
  animation: 'Préréglage d’animation',
  material: 'Matériau',
  audio: 'Son',
};

function AssetGlyph({ asset }: { asset: StudioAsset }) {
  const size = 18;
  if (asset.type === 'material') return <span className={styles.swatch} style={{ backgroundColor: asset.color }} aria-hidden="true" />;
  if (asset.type === 'texture' && asset.url) {
    // eslint-disable-next-line @next/next/no-img-element -- miniature d'un fichier local (data URL)
    return <img src={asset.url} alt="" className={styles.thumbImage} />;
  }
  const Icon =
    asset.type === 'character'
      ? PersonStanding
      : asset.type === 'animation'
        ? Sparkles
        : asset.type === 'audio'
          ? Music
          : asset.type === 'model'
            ? Package
            : asset.type === 'environment'
              ? asset.preset === 'backdrop'
                ? Square
                : Mountain
              : asset.shape === 'sphere'
                ? Circle
                : asset.shape === 'cylinder'
                  ? Cylinder
                  : asset.shape === 'cone'
                    ? Cone
                    : asset.shape === 'torus'
                      ? Torus
                      : asset.shape === 'vase'
                        ? Amphora
                        : asset.shape === 'capsule'
                          ? Pill
                          : asset.type === 'texture'
                            ? ImageIcon
                            : Box;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" style={asset.color ? { color: asset.color } : undefined} />;
}

export default function AssetBrowser({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const store = useStudioStore();
  const assets = useStudio((state) => state.project.assets);
  const selectedId = useStudio((state) => state.selectedId);
  const scene = useActiveScene();
  const [folder, setFolder] = useState<AssetFolder | 'all'>('all');
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('fr');
    return assets.filter((asset) => (folder === 'all' || asset.folder === folder) && (!search || asset.name.toLocaleLowerCase('fr').includes(search)));
  }, [assets, folder, query]);

  const active = assets.find((asset) => asset.id === current) ?? null;
  const applies = active?.type === 'material' || active?.type === 'animation';
  const incompatible = active?.dimension && active.dimension !== scene.dimension;

  const onFilesDrop = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    setDragging(false);
    void importFiles(event.dataTransfer.files, store).then((imported) => {
      if (imported[0]) {
        setCurrent(imported[0].id);
        setFolder('all');
      }
    });
  };

  return (
    <Panel
      title="Assets"
      regionLabel="Ressources du projet"
      icon={<FolderOpen size={14} strokeWidth={2} />}
      side="stack"
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      actions={<ToolButton size="sm" label="Importer des fichiers" icon={<Upload size={14} strokeWidth={2} />} onClick={() => fileInput.current?.click()} />}
      bodyClassName={styles.body}
    >
      <div
        className={styles.dropArea}
        data-dragging={dragging || undefined}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onFilesDrop}
      >
        <div className={styles.tools}>
          <div className={styles.search}>
            <Search size={13} strokeWidth={2} aria-hidden="true" className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Rechercher un asset"
              aria-label="Rechercher un asset"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className={styles.folders} role="radiogroup" aria-label="Dossier">
            {FOLDERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={folder === item.id}
                className={styles.folder}
                onClick={() => setFolder(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <ul className={styles.grid} aria-label="Assets">
          {visible.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                className={styles.tile}
                aria-pressed={asset.id === current}
                aria-label={`${asset.name}${asset.dimension ? ` (${asset.dimension.toUpperCase()})` : ''}`}
                draggable
                data-tip={`${asset.name} — glisser dans la scène`}
                onClick={() => setCurrent(asset.id === current ? null : asset.id)}
                onDoubleClick={() => store.useAsset(asset.id, { targetId: selectedId })}
                onDragStart={(event) => {
                  event.dataTransfer.setData(ASSET_DRAG_TYPE, asset.id);
                  event.dataTransfer.effectAllowed = 'copy';
                  setCurrent(asset.id);
                }}
              >
                <span className={styles.thumb}>
                  <AssetGlyph asset={asset} />
                  {asset.dimension ? <span className={styles.dim}>{asset.dimension.toUpperCase()}</span> : null}
                </span>
                <span className={styles.tileName}>{asset.name}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={`${styles.tile} ${styles.importTile}`} onClick={() => fileInput.current?.click()}>
              <span className={styles.thumb}>
                <Plus size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className={styles.tileName}>Importer</span>
            </button>
          </li>
        </ul>
        {visible.length === 0 ? <p className={styles.empty}>Aucun asset dans ce dossier{query ? ` pour « ${query} »` : ''}.</p> : null}

        {dragging ? (
          <div className={styles.dropOverlay} aria-hidden="true">
            <Upload size={22} strokeWidth={2} />
            Déposez vos fichiers (images, .glb, sons)
          </div>
        ) : null}
      </div>

      {active ? (
        <div className={styles.preview} aria-live="polite">
          <div className={styles.previewThumb}>
            <AssetGlyph asset={active} />
          </div>
          <div className={styles.previewText}>
            <p className={styles.previewName}>{active.name}</p>
            <p className={styles.previewMeta}>
              {TYPE_LABELS[active.type]}
              {active.dimension ? ` · ${active.dimension.toUpperCase()}` : ''}
              {active.size ? ` · ${(active.size / 1024).toFixed(0)} Ko` : ''}
              {active.origin === 'library' ? ' · Bibliothèque' : ''}
            </p>
            {active.description ? <p className={styles.previewDesc}>{active.description}</p> : null}
            {active.sessionOnly ? <p className={styles.previewWarn}>Fichier lourd : disponible pour cette session seulement.</p> : null}
            {active.type === 'audio' && assetUrl(active) ? <audio className={styles.audio} src={assetUrl(active)} controls preload="metadata" /> : null}
            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.primary}
                disabled={Boolean(incompatible) || (applies && !selectedId)}
                onClick={() => store.useAsset(active.id, { targetId: selectedId })}
              >
                {active.type === 'audio' ? 'Placer sur la timeline' : applies ? 'Appliquer à la sélection' : 'Ajouter à la scène'}
              </button>
              {active.origin === 'import' ? (
                <ToolButton size="sm" label={`Supprimer ${active.name}`} icon={<Trash2 size={14} strokeWidth={2} />} onClick={() => {
                  store.removeAsset(active.id);
                  if (!store.getState().project.assets.some((asset) => asset.id === active.id)) setCurrent(null);
                }} />
              ) : null}
            </div>
            {incompatible ? <p className={styles.previewWarn}>Asset {active.dimension?.toUpperCase()} : ouvrez une scène {active.dimension?.toUpperCase()}.</p> : null}
          </div>
        </div>
      ) : null}

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_FILES}
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) {
            void importFiles(event.target.files, store).then((imported) => {
              if (imported[0]) setCurrent(imported[0].id);
            });
          }
          event.target.value = '';
        }}
      />
    </Panel>
  );
}
