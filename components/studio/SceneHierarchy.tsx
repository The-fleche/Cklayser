'use client';

/**
 * SceneHierarchy — arborescence des composants de la scène (panneau
 * supérieur gauche).
 *
 * Interactions :
 *  - clic : sélectionner (met à jour l'inspecteur, le viewport, la timeline) ;
 *  - chevron ou ←/→ : replier / déplier ; ↑/↓ : naviguer ;
 *  - double-clic ou F2 : renommer ; Suppr : supprimer ;
 *  - H : masquer / afficher ; L : verrouiller ; C (caméra) : voir par elle ;
 *  - glisser-déposer : réorganiser (avant / dedans / après) ; un asset
 *    déposé sur une ligne est instancié dedans ou appliqué (matériau,
 *    animation) ;
 *  - « + » : créer un composant (selon la dimension de la scène) ;
 *  - filtre par nom.
 */
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ListTree,
  Lock,
  LockOpen,
  Plus,
  Search,
  Trash2,
  Video,
  Box,
  Circle,
  Cylinder,
  Cone,
  Pill,
  Torus,
  Amphora,
  Sun,
  Lightbulb,
  SunDim,
  Bone,
  Crosshair,
  Film,
  Layers,
  Image as ImageIcon,
  Star,
} from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { flattenTree, useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import type { SceneNode } from '@/lib/studio/types';
import { nodeFamily, nodeIcon, nodeTypeLabel } from './nodeMeta';
import Panel from './Panel';
import { MenuButton, ToolButton, type MenuItem } from './ui';
import styles from './SceneHierarchy.module.css';

export const NODE_DRAG_TYPE = 'application/x-cklayser-node';
export const ASSET_DRAG_TYPE = 'application/x-cklayser-asset';

type DropPosition = 'before' | 'inside' | 'after';

export default function SceneHierarchy({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const selectedId = useStudio((state) => state.selectedId);
  const expanded = useStudio((state) => state.expanded);
  const viewMode = useStudio((state) => state.viewMode);
  const viewCameraId = useStudio((state) => state.viewCameraId);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  const rows = useMemo(() => {
    const all = flattenTree(scene, filter ? undefined : expanded);
    if (!filter) return all;
    const query = filter.toLocaleLowerCase('fr');
    const keep = new Set<string>();
    for (const { node } of all) {
      if (node.name.toLocaleLowerCase('fr').includes(query)) {
        let current: SceneNode | undefined = node;
        while (current) {
          keep.add(current.id);
          current = current.parentId ? scene.nodes[current.parentId] : undefined;
        }
      }
    }
    return all.filter(({ node }) => keep.has(node.id));
  }, [scene, expanded, filter]);

  const activeId = focusId && rows.some((row) => row.node.id === focusId) ? focusId : (selectedId ?? rows[0]?.node.id ?? null);
  const is2d = scene.dimension === '2d';
  const selected = selectedId ? scene.nodes[selectedId] : undefined;

  const focusRow = (id: string) => {
    setFocusId(id);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)?.focus());
  };

  const addItems: MenuItem[] = [
    { label: is2d ? 'Groupe (Node2D)' : 'Groupe (Node3D)', icon: <Layers size={14} />, onSelect: () => store.addNode('group') },
    ...(is2d
      ? [{ label: 'Sprite', icon: <ImageIcon size={14} />, onSelect: () => store.addNode('sprite') }]
      : [
          { label: 'Cube', icon: <Box size={14} />, onSelect: () => store.addNode('mesh', { shape: 'box' }) },
          { label: 'Sphère', icon: <Circle size={14} />, onSelect: () => store.addNode('mesh', { shape: 'sphere' }) },
          { label: 'Cylindre', icon: <Cylinder size={14} />, onSelect: () => store.addNode('mesh', { shape: 'cylinder' }) },
          { label: 'Cône', icon: <Cone size={14} />, onSelect: () => store.addNode('mesh', { shape: 'cone' }) },
          { label: 'Capsule', icon: <Pill size={14} />, onSelect: () => store.addNode('mesh', { shape: 'capsule' }) },
          { label: 'Tore', icon: <Torus size={14} />, onSelect: () => store.addNode('mesh', { shape: 'torus' }) },
          { label: 'Vase', icon: <Amphora size={14} />, onSelect: () => store.addNode('mesh', { shape: 'vase' }) },
        ]),
    { separator: true, label: '' },
    { label: is2d ? 'Caméra (Camera2D)' : 'Caméra (Camera3D)', icon: <Video size={14} />, onSelect: () => store.addNode('camera') },
    ...(is2d
      ? []
      : [
          { label: 'Lumière directionnelle', icon: <Sun size={14} />, onSelect: () => store.addNode('light', { lightType: 'directional' }) },
          { label: 'Lumière ponctuelle', icon: <Lightbulb size={14} />, onSelect: () => store.addNode('light', { lightType: 'point' }) },
          { label: 'Lumière ambiante', icon: <SunDim size={14} />, onSelect: () => store.addNode('light', { lightType: 'ambient' }) },
        ]),
    { separator: true, label: '' },
    { label: is2d ? 'Squelette (Skeleton2D)' : 'Squelette (Skeleton3D)', icon: <Bone size={14} />, onSelect: () => store.addNode('skeleton') },
    { label: 'Bone', hint: 'Dans le squelette ou le bone sélectionné', icon: <Bone size={14} />, onSelect: () => store.addNode('bone') },
    { label: 'Point de contrôle', icon: <Crosshair size={14} />, onSelect: () => store.addNode('control') },
    { label: 'AnimationPlayer', icon: <Film size={14} />, onSelect: () => store.addNode('animationPlayer') },
  ];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, node: SceneNode, index: number) => {
    if (renaming) return;
    const hasChildren = node.children.length > 0;
    const isOpen = expanded[node.id] !== false;
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = rows[index + 1];
        if (next) focusRow(next.node.id);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const previous = rows[index - 1];
        if (previous) focusRow(previous.node.id);
        break;
      }
      case 'ArrowRight':
        event.preventDefault();
        if (hasChildren && !isOpen) store.toggleExpanded(node.id, true);
        else if (hasChildren && node.children[0]) focusRow(node.children[0]);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (hasChildren && isOpen) store.toggleExpanded(node.id, false);
        else if (node.parentId) focusRow(node.parentId);
        break;
      case 'Home':
        event.preventDefault();
        if (rows[0]) focusRow(rows[0].node.id);
        break;
      case 'End':
        event.preventDefault();
        if (rows[rows.length - 1]) focusRow(rows[rows.length - 1]!.node.id);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        store.select(node.id);
        break;
      case 'F2':
        event.preventDefault();
        if (node.kind !== 'root') setRenaming(node.id);
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        if (node.kind !== 'root') {
          const fallback = rows[index - 1]?.node.id;
          store.deleteNode(node.id);
          if (fallback) focusRow(fallback);
        }
        break;
      case 'h':
      case 'H':
        if (node.kind !== 'root') store.toggleVisible(node.id);
        break;
      case 'l':
      case 'L':
        if (node.kind !== 'root') store.toggleLocked(node.id);
        break;
      case 'c':
      case 'C':
        if (node.kind === 'camera') store.viewThroughCamera(node.id);
        break;
      default:
    }
  };

  /* ----- glisser-déposer ----- */
  const dropPosition = (event: DragEvent<HTMLElement>, node: SceneNode): DropPosition => {
    if (node.kind === 'root') return 'inside';
    const rect = event.currentTarget.getBoundingClientRect();
    const y = (event.clientY - rect.top) / rect.height;
    if (y < 0.28) return 'before';
    if (y > 0.72) return 'after';
    return 'inside';
  };

  const onDragOver = (event: DragEvent<HTMLElement>, node: SceneNode) => {
    const types = event.dataTransfer.types;
    if (!types.includes(NODE_DRAG_TYPE) && !types.includes(ASSET_DRAG_TYPE)) return;
    event.preventDefault();
    const position = types.includes(ASSET_DRAG_TYPE) ? 'inside' : dropPosition(event, node);
    event.dataTransfer.dropEffect = types.includes(ASSET_DRAG_TYPE) ? 'copy' : 'move';
    if (drop?.id !== node.id || drop.position !== position) setDrop({ id: node.id, position });
  };

  const onDrop = (event: DragEvent<HTMLElement>, node: SceneNode) => {
    event.preventDefault();
    setDrop(null);
    const assetId = event.dataTransfer.getData(ASSET_DRAG_TYPE);
    if (assetId) {
      store.useAsset(assetId, { targetId: node.id });
      return;
    }
    const movingId = event.dataTransfer.getData(NODE_DRAG_TYPE) || dragId.current;
    dragId.current = null;
    if (!movingId || movingId === node.id) return;
    const position = dropPosition(event, node);
    if (store.moveNode(movingId, node.id, position)) {
      const moving = store.scene.nodes[movingId];
      store.notify(`« ${moving?.name ?? 'Composant'} » déplacé ${position === 'inside' ? 'dans' : position === 'before' ? 'avant' : 'après'} « ${node.name} ».`);
      if (position === 'inside') store.toggleExpanded(node.id, true);
    }
  };

  return (
    <Panel
      title="Scène"
      regionLabel="Hiérarchie de la scène"
      icon={<ListTree size={14} strokeWidth={2} />}
      side="left"
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      actions={
        <>
          <MenuButton label="Ajouter un composant" ariaLabel="Ajouter un composant" tip="Ajouter un composant" items={addItems} className={styles.addButton} align="end">
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
          </MenuButton>
          <ToolButton
            size="sm"
            label="Supprimer le composant sélectionné"
            shortcut="Suppr"
            icon={<Trash2 size={14} strokeWidth={2} />}
            disabled={!selected || selected.kind === 'root'}
            onClick={() => selected && store.deleteNode(selected.id)}
          />
        </>
      }
      bodyClassName={styles.body}
    >
      <div className={styles.filter}>
        <Search size={13} strokeWidth={2} aria-hidden="true" className={styles.filterIcon} />
        <input
          type="search"
          className={styles.filterInput}
          placeholder="Filtrer les composants"
          aria-label="Filtrer les composants par nom"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      <div ref={listRef} role="tree" aria-label="Composants de la scène" className={styles.tree} data-keys="local" onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null);
      }}>
        {rows.map(({ node, depth }, index) => {
          const Icon = nodeIcon(node, scene.nodes);
          const hasChildren = node.children.length > 0;
          const isOpen = filter ? true : expanded[node.id] !== false;
          const isSelected = node.id === selectedId;
          const viewing = viewMode !== 'edit' && viewCameraId === node.id;
          const isMain = node.kind === 'camera' && scene.viewer.mainCameraId === node.id;
          const dropHere = drop?.id === node.id ? drop.position : null;
          return (
            <div
              key={node.id}
              role="treeitem"
              aria-level={depth + 1}
              aria-selected={isSelected}
              aria-expanded={hasChildren ? isOpen : undefined}
              aria-label={`${node.name}, ${nodeTypeLabel(node, scene.dimension)}${isMain ? ', caméra principale' : ''}${node.visible ? '' : ', masqué'}${node.locked ? ', verrouillé' : ''}`}
              tabIndex={node.id === activeId ? 0 : -1}
              data-node-id={node.id}
              data-family={nodeFamily(node)}
              data-drop={dropHere ?? undefined}
              className={`${styles.row} ${isSelected ? styles.selected : ''} ${node.visible ? '' : styles.hidden}`}
              style={{ paddingLeft: 6 + depth * 14 }}
              draggable={node.kind !== 'root' && renaming !== node.id}
              onDragStart={(event) => {
                dragId.current = node.id;
                event.dataTransfer.setData(NODE_DRAG_TYPE, node.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                dragId.current = null;
                setDrop(null);
              }}
              onDragOver={(event) => onDragOver(event, node)}
              onDrop={(event) => onDrop(event, node)}
              onClick={() => {
                setFocusId(node.id);
                store.select(node.id);
              }}
              onDoubleClick={() => {
                if (node.kind === 'camera') store.viewThroughCamera(node.id);
                else if (node.kind !== 'root') setRenaming(node.id);
              }}
              onKeyDown={(event) => onKeyDown(event, node, index)}
              onFocus={() => setFocusId(node.id)}
            >
              <span
                className={styles.chevron}
                aria-hidden="true"
                onClick={(event) => {
                  event.stopPropagation();
                  if (hasChildren) store.toggleExpanded(node.id);
                }}
              >
                {hasChildren ? isOpen ? <ChevronDown size={13} strokeWidth={2.2} /> : <ChevronRight size={13} strokeWidth={2.2} /> : null}
              </span>
              <Icon size={14} strokeWidth={2} aria-hidden="true" className={styles.icon} />
              {renaming === node.id ? (
                <input
                  className={styles.renameInput}
                  aria-label={`Nouveau nom pour ${node.name}`}
                  defaultValue={node.name}
                  maxLength={60}
                  autoFocus
                  onClick={(event) => event.stopPropagation()}
                  onFocus={(event) => event.target.select()}
                  onBlur={(event) => {
                    store.renameNode(node.id, event.target.value);
                    setRenaming(null);
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') {
                      (event.target as HTMLInputElement).blur();
                      focusRow(node.id);
                    }
                    if (event.key === 'Escape') {
                      setRenaming(null);
                      focusRow(node.id);
                    }
                  }}
                />
              ) : (
                <span className={styles.name}>
                  <span className={styles.nameText}>{node.name}</span>
                  {isMain ? (
                    <Star size={11} strokeWidth={2.2} fill="currentColor" className={styles.mainStar} aria-hidden="true" />
                  ) : null}
                </span>
              )}
              <span className={styles.actions}>
                {node.kind === 'camera' ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className={`${styles.action} ${viewing ? styles.actionOn : ''}`}
                    aria-label={`Voir par ${node.name}`}
                    data-tip={viewing ? 'Vue de cette caméra (actif)' : 'Voir par cette caméra (C)'}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (viewing) store.setViewMode('edit');
                      else store.viewThroughCamera(node.id);
                    }}
                  >
                    <Video size={13} strokeWidth={2} aria-hidden="true" />
                  </button>
                ) : null}
                {node.kind !== 'root' ? (
                  <>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`${styles.action} ${node.locked ? styles.actionOn : ''}`}
                      aria-label={node.locked ? `Déverrouiller ${node.name}` : `Verrouiller ${node.name}`}
                      aria-pressed={node.locked}
                      data-tip={node.locked ? 'Déverrouiller (L)' : 'Verrouiller (L)'}
                      onClick={(event) => {
                        event.stopPropagation();
                        store.toggleLocked(node.id);
                      }}
                    >
                      {node.locked ? <Lock size={13} strokeWidth={2} aria-hidden="true" /> : <LockOpen size={13} strokeWidth={2} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`${styles.action} ${node.visible ? '' : styles.actionOn}`}
                      aria-label={node.visible ? `Masquer ${node.name}` : `Afficher ${node.name}`}
                      aria-pressed={!node.visible}
                      data-tip={node.visible ? 'Masquer (H)' : 'Afficher (H)'}
                      onClick={(event) => {
                        event.stopPropagation();
                        store.toggleVisible(node.id);
                      }}
                    >
                      {node.visible ? <Eye size={13} strokeWidth={2} aria-hidden="true" /> : <EyeOff size={13} strokeWidth={2} aria-hidden="true" />}
                    </button>
                  </>
                ) : null}
              </span>
            </div>
          );
        })}
        {rows.length === 0 ? <p className={styles.empty}>Aucun composant ne correspond à « {filter} ».</p> : null}
      </div>
    </Panel>
  );
}
