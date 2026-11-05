'use client';

/**
 * AnimationTimeline — cœur de CKlayser Studio (panneau inférieur).
 *
 *  - PlaybackControls : transport, temps, vitesse, boucle ;
 *  - enregistrement automatique des keyframes (●), ajout / suppression,
 *    copier / coller, interpolation des keyframes sélectionnées ;
 *  - TimelineRuler : graduations en images et secondes, tête de lecture
 *    déplaçable ;
 *  - pistes : une ligne par composant animé (résumé), dépliable en pistes
 *    par propriété (Position, Rotation, Échelle, Champ de vision, Zoom) ;
 *  - keyframes (losanges) : clic = sélection (Maj / Ctrl : multiple),
 *    glisser = déplacement dans le temps, rectangle de sélection sur le
 *    fond, double-clic sur une piste = nouvelle keyframe, Ctrl + molette =
 *    zoom ;
 *  - InterpolationEditor : courbe de la keyframe sélectionnée.
 *
 * Tout passe par le store : la timeline, le viewport et l'inspecteur
 * restent synchronisés.
 */
import {
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardPaste,
  Copy,
  Diamond,
  Film,
  Music,
  ListFilter,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { INTERPOLATIONS, PROPERTY_LABELS, animatableProperties, findTrack, getActiveClip } from '@/lib/studio/animation';
import { flattenTree, useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import type { AnimProperty, Interpolation, KeyRef, SceneNode, StudioScene } from '@/lib/studio/types';
import AnimationTrack, { type SummaryKey, type TrackKey } from './AnimationTrack';
import { AudioTrackLane, AudioTrackName } from './AudioTrack';
import InterpolationEditor from './InterpolationEditor';
import { nodeIcon } from './nodeMeta';
import Panel from './Panel';
import PlaybackControls from './PlaybackControls';
import { KeyButton } from './PropertiesInspector';
import TimelineRuler, { TIMELINE_PAD, frameToX } from './TimelineRuler';
import { MenuButton, NumberField, ToolButton } from './ui';
import styles from './Timeline.module.css';

const ROW_H = 24;
const RULER_H = 30;

interface Row {
  id: string;
  variant: 'group' | 'property';
  node: SceneNode;
  property?: AnimProperty;
  keys: TrackKey[];
  summary: SummaryKey[];
  depth: number;
}

function buildRows(scene: StudioScene, selectedId: string | null, onlySelection: boolean, collapsed: Record<string, boolean>): Row[] {
  const clip = getActiveClip(scene);
  if (!clip) return [];
  const animated = new Set(clip.tracks.map((track) => track.nodeId));
  const order = flattenTree(scene).map((item) => item.node);
  const inSelection = (node: SceneNode) => {
    if (!selectedId) return false;
    let current: SceneNode | undefined = node;
    while (current) {
      if (current.id === selectedId) return true;
      current = current.parentId ? scene.nodes[current.parentId] : undefined;
    }
    return false;
  };

  const rows: Row[] = [];
  for (const node of order) {
    const isSelected = node.id === selectedId;
    const properties = animatableProperties(node, scene.dimension);
    const show = onlySelection ? (isSelected && properties.length > 0) || (animated.has(node.id) && inSelection(node)) : animated.has(node.id) || (isSelected && properties.length > 0);
    if (!show) continue;

    const tracks = clip.tracks.filter((track) => track.nodeId === node.id);
    const byFrame = new Map<number, KeyRef[]>();
    for (const track of tracks) {
      for (const key of track.keys) {
        const list = byFrame.get(key.frame) ?? [];
        list.push({ trackId: track.id, keyId: key.id });
        byFrame.set(key.frame, list);
      }
    }
    rows.push({
      id: node.id,
      variant: 'group',
      node,
      keys: [],
      summary: [...byFrame.entries()].sort((a, b) => a[0] - b[0]).map(([frame, refs]) => ({ frame, refs })),
      depth: 0,
    });
    if (collapsed[node.id]) continue;
    // Propriétés : toutes pour le composant sélectionné, sinon seulement les pistes existantes.
    const listed = isSelected ? properties : properties.filter((property) => tracks.some((track) => track.property === property));
    for (const property of listed) {
      const track = findTrack(clip, node.id, property);
      rows.push({
        id: `${node.id}:${property}`,
        variant: 'property',
        node,
        property,
        keys: track ? track.keys.map((key) => ({ ref: { trackId: track.id, keyId: key.id }, frame: key.frame, interpolation: key.interpolation })) : [],
        summary: [],
        depth: 1,
      });
    }
  }
  return rows;
}

export default function AnimationTimeline({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const selectedId = useStudio((state) => state.selectedId);
  const selectedKeys = useStudio((state) => state.selectedKeys);
  const collapsedTracks = useStudio((state) => state.collapsedTracks);
  const zoom = useStudio((state) => state.timelineZoom);
  const autoKey = useStudio((state) => state.autoKey);
  const clipboard = useStudio((state) => state.clipboard);
  const clip = getActiveClip(scene)!;
  const audioAssets = useStudio((state) => state.project.assets).filter((asset) => asset.type === 'audio');
  const audioRefs = clip.audio ?? [];
  const [onlySelection, setOnlySelection] = useState(false);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; origin: Map<string, number>; delta: number; moved: boolean; refs: KeyRef[]; additive: boolean } | null>(null);

  const rows = useMemo(() => buildRows(scene, selectedId, onlySelection, collapsedTracks), [scene, selectedId, onlySelection, collapsedTracks]);
  const selectedIds = useMemo(() => new Set(selectedKeys.map((ref) => ref.keyId)), [selectedKeys]);
  const width = frameToX(clip.duration, zoom) + TIMELINE_PAD + 24;
  const selectedNode = selectedId ? scene.nodes[selectedId] : undefined;
  const canKey = Boolean(selectedNode && animatableProperties(selectedNode, scene.dimension).length > 0);

  // Interpolation commune aux keyframes sélectionnées (pour le sélecteur).
  const selectionInterp = useMemo(() => {
    const values = new Set<Interpolation>();
    for (const track of clip.tracks) for (const key of track.keys) if (selectedIds.has(key.id)) values.add(key.interpolation);
    return values.size === 1 ? [...values][0]! : values.size > 1 ? 'mixed' : '';
  }, [clip, selectedIds]);

  const frameOf = (keyId: string) => {
    for (const track of clip.tracks) {
      const key = track.keys.find((item) => item.id === keyId);
      if (key) return key.frame;
    }
    return 0;
  };

  /* ----- glisser des keyframes ----- */
  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const delta = Math.round((event.clientX - current.startX) / store.getState().timelineZoom);
      if (delta === current.delta) return;
      if (!current.moved) {
        current.moved = true;
        store.beginGesture();
      }
      current.delta = delta;
      store.moveKeys(current.origin, delta);
    };
    const onUp = () => {
      const current = drag.current;
      drag.current = null;
      if (!current) return;
      if (current.moved) {
        store.resolveKeyCollisions();
        store.endGesture();
      } else if (!current.additive) {
        store.selectKeys(current.refs);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [store]);

  const onKeyPointerDown = (event: PointerEvent<HTMLButtonElement>, refs: KeyRef[]) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const current = store.getState().selectedKeys;
    const has = (ref: KeyRef) => current.some((item) => item.keyId === ref.keyId);
    const allSelected = refs.every(has);
    let selection: KeyRef[];
    if (additive) selection = allSelected ? current.filter((item) => !refs.some((ref) => ref.keyId === item.keyId)) : [...current, ...refs.filter((ref) => !has(ref))];
    else selection = allSelected ? current : refs;
    store.selectKeys(selection);
    if (additive && allSelected) return;
    const origin = new Map<string, number>();
    for (const ref of selection) origin.set(ref.keyId, frameOf(ref.keyId));
    drag.current = { startX: event.clientX, origin, delta: 0, moved: false, refs, additive };
  };

  const onKeyKeyDown = (event: KeyboardEvent<HTMLButtonElement>, refs: KeyRef[]) => {
    const current = store.getState().selectedKeys;
    const ensureSelected = () => {
      if (refs.every((ref) => current.some((item) => item.keyId === ref.keyId))) return current;
      store.selectKeys(refs);
      return refs;
    };
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const selection = ensureSelected();
      const origin = new Map<string, number>();
      for (const ref of selection) origin.set(ref.keyId, frameOf(ref.keyId));
      store.moveKeys(origin, (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 10 : 1));
      store.resolveKeyCollisions();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      ensureSelected();
      store.deleteSelectedKeys();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      store.selectKeys(refs, event.shiftKey || event.ctrlKey ? 'toggle' : 'replace');
    }
  };

  /* ----- rectangle de sélection / clic sur le fond ----- */
  const localPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = tracksRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onAreaPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const point = localPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setMarquee({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
  };

  const onAreaPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!marquee) return;
    const point = localPoint(event);
    setMarquee({ ...marquee, x2: point.x, y2: point.y });
  };

  const onAreaPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!marquee) return;
    const box = marquee;
    setMarquee(null);
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (Math.abs(box.x2 - box.x1) < 4 && Math.abs(box.y2 - box.y1) < 4) {
      if (!additive) store.selectKeys([]);
      store.pause();
      store.setFrame(Math.round((box.x1 - TIMELINE_PAD) / zoom));
      return;
    }
    const left = Math.min(box.x1, box.x2);
    const right = Math.max(box.x1, box.x2);
    const top = Math.min(box.y1, box.y2);
    const bottom = Math.max(box.y1, box.y2);
    const picked: KeyRef[] = [];
    rows.forEach((row, index) => {
      const center = index * ROW_H + ROW_H / 2;
      if (center < top || center > bottom) return;
      const items = row.variant === 'property' ? row.keys.map((key) => ({ frame: key.frame, refs: [key.ref] })) : row.summary;
      for (const item of items) {
        const x = frameToX(item.frame, zoom);
        if (x >= left && x <= right) picked.push(...item.refs);
      }
    });
    const unique = picked.filter((ref, index) => picked.findIndex((item) => item.keyId === ref.keyId) === index);
    store.selectKeys(unique, additive ? 'add' : 'replace');
    if (unique.length > 0) store.notify(`${unique.length} keyframe${unique.length > 1 ? 's' : ''} sélectionnée${unique.length > 1 ? 's' : ''}.`);
  };

  /* ----- zoom (Ctrl + molette) ----- */
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      store.setTimelineZoom(store.getState().timelineZoom * (event.deltaY > 0 ? 0.9 : 1.1));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [store, collapsed]);

  const fitZoom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const names = element.querySelector<HTMLElement>('[data-track-names]')?.offsetWidth ?? 196;
    const available = element.clientWidth - names - TIMELINE_PAD * 2 - 28;
    store.setTimelineZoom(available / Math.max(1, store.clip.duration));
  }, [store]);

  // Le clip entier tient dans la largeur à l'ouverture et au changement de clip.
  useEffect(() => {
    fitZoom();
  }, [fitZoom, clip.id, clip.duration, collapsed]);

  return (
    <Panel
      title="Timeline"
      regionLabel="Timeline et keyframes"
      icon={<Film size={14} strokeWidth={2} />}
      side="bottom"
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      className={styles.panel}
      bodyClassName={styles.body}
      actions={
        <div className={styles.headerTools}>
          {scene.clips.length > 1 ? (
            <label className={styles.clipSelect}>
              <span className="sr-only">Clip actif</span>
              <select value={clip.id} onChange={(event) => store.setActiveClip(event.target.value)}>
                {scene.clips.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className={styles.clipName} title="Clip actif">
              {clip.name}
            </span>
          )}
          <ToolButton size="sm" label="Nouveau clip" icon={<Plus size={14} strokeWidth={2} />} onClick={store.addClip} />
        </div>
      }
    >
      <div className={styles.controls}>
        <PlaybackControls />
        <span className={styles.sep} aria-hidden="true" />
        <div className={styles.keyTools} role="group" aria-label="Keyframes">
          <ToolButton
            size="sm"
            tone="record"
            label={autoKey ? 'Enregistrement automatique activé' : 'Enregistrement automatique des keyframes'}
            pressed={autoKey}
            icon={<Circle size={13} strokeWidth={2.4} fill={autoKey ? 'currentColor' : 'none'} />}
            onClick={() => store.setAutoKey(!autoKey)}
          />
          <ToolButton size="sm" label="Ajouter des keyframes au composant sélectionné" shortcut="K" icon={<Diamond size={14} strokeWidth={2.2} />} disabled={!canKey} onClick={() => selectedId && store.insertKeysForNode(selectedId)} />
          <ToolButton size="sm" label="Supprimer les keyframes sélectionnées" shortcut="Suppr" icon={<Trash2 size={14} strokeWidth={2} />} disabled={selectedKeys.length === 0} onClick={store.deleteSelectedKeys} />
          <ToolButton size="sm" label="Copier les keyframes" shortcut="Ctrl C" icon={<Copy size={14} strokeWidth={2} />} disabled={selectedKeys.length === 0} onClick={store.copyKeys} />
          <ToolButton size="sm" label="Coller à l’image courante" shortcut="Ctrl V" icon={<ClipboardPaste size={14} strokeWidth={2} />} disabled={clipboard.length === 0} onClick={store.pasteKeys} />
          <label className={styles.interpSelect}>
            <span className="sr-only">Interpolation des keyframes sélectionnées</span>
            <select
              value={selectionInterp}
              disabled={selectedKeys.length === 0}
              onChange={(event) => store.setKeysInterpolation(event.target.value as Interpolation)}
              data-tip="Interpolation des keyframes sélectionnées"
            >
              <option value="" disabled>
                Interpolation
              </option>
              {selectionInterp === 'mixed' ? (
                <option value="mixed" disabled>
                  Mixte
                </option>
              ) : null}
              {INTERPOLATIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.spacer} />
        <div className={styles.viewTools}>
          <div className={styles.durationField}>
            <NumberField label="Durée du clip (images)" short="⟷" value={clip.duration} min={1} max={14400} step={1} precision={0} onChange={(value) => store.updateClip({ duration: value })} />
          </div>
          <ToolButton size="sm" label="Pistes de la sélection seulement" pressed={onlySelection} icon={<ListFilter size={14} strokeWidth={2} />} onClick={() => setOnlySelection((value) => !value)} />
          <ToolButton size="sm" label="Dézoomer la timeline" icon={<ZoomOut size={14} strokeWidth={2} />} onClick={() => store.setTimelineZoom(zoom / 1.25)} />
          <ToolButton size="sm" label="Ajuster la timeline à la largeur" icon={<MoveHorizontal size={14} strokeWidth={2} />} onClick={fitZoom} />
          <ToolButton size="sm" label="Zoomer la timeline" icon={<ZoomIn size={14} strokeWidth={2} />} onClick={() => store.setTimelineZoom(zoom * 1.25)} />
        </div>
      </div>

      <div className={styles.main}>
        <div ref={scrollRef} className={styles.scroll}>
          <div className={styles.grid}>
            {/* ----- Noms des pistes (colonne collante) ----- */}
            <div className={styles.names} data-track-names>
              <div className={styles.corner} style={{ height: RULER_H }}>
                <span>{clip.fps} i/s</span>
              </div>
              {rows.map((row, index) => (
                <TrackName key={row.id} row={row} alternate={index % 2 === 1} selected={row.node.id === selectedId} collapsed={Boolean(collapsedTracks[row.node.id])} />
              ))}
              {rows.length === 0 ? <div className={styles.emptyName} /> : null}
              <div className={`${styles.name} ${styles.nameGroup} ${styles.audioHeader}`}>
                <Music size={13} strokeWidth={2} aria-hidden="true" className={styles.audioIcon} />
                <span>Audio</span>
                <MenuButton
                  label="Placer un son"
                  ariaLabel="Placer un son sur la timeline"
                  tip="Placer un son à la tête de lecture"
                  className={styles.audioAdd}
                  items={
                    audioAssets.length > 0
                      ? audioAssets.map((asset) => ({ label: asset.name, onSelect: () => store.addAudio(asset.id, Math.round(store.getState().frame)) }))
                      : [{ label: 'Aucun son : importez-en dans les assets', disabled: true }]
                  }
                >
                  <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
                </MenuButton>
              </div>
              {audioRefs.map((audio) => (
                <AudioTrackName key={audio.id} audio={audio} />
              ))}
            </div>

            {/* ----- Règle et pistes ----- */}
            <div className={styles.tracksColumn} style={{ width }}>
              <div className={styles.rulerWrap} style={{ height: RULER_H }}>
                <TimelineRuler duration={clip.duration} fps={clip.fps} zoom={zoom} />
                <PlayheadHead zoom={zoom} />
              </div>
              <div
                ref={tracksRef}
                className={styles.tracks}
                onPointerDown={onAreaPointerDown}
                onPointerMove={onAreaPointerMove}
                onPointerUp={onAreaPointerUp}
                data-keys="local"
              >
                {rows.map((row, index) => (
                  <AnimationTrack
                    key={row.id}
                    variant={row.variant}
                    node={row.node}
                    property={row.property}
                    keys={row.keys}
                    summary={row.summary}
                    zoom={zoom}
                    width={width}
                    selectedIds={selectedIds}
                    alternate={index % 2 === 1}
                    selectedNode={row.node.id === selectedId}
                    onKeyPointerDown={onKeyPointerDown}
                    onKeyKeyDown={onKeyKeyDown}
                    onAddKey={
                      row.property
                        ? (frame) => {
                            store.pause();
                            store.setFrame(frame);
                            store.insertKey(row.node.id, row.property!);
                          }
                        : undefined
                    }
                  />
                ))}
                {rows.length === 0 ? (
                  <div className={styles.emptyLane}><p className={styles.emptyTracks}>
                    Aucune piste animée. Sélectionnez un composant, placez la tête de lecture puis appuyez sur K (ou sur le losange ◆ d’une
                    propriété dans l’inspecteur).
                  </p></div>
                ) : null}
                <div className={`${styles.trackRow} ${styles.trackGroup}`} style={{ width }} />
                {audioRefs.map((audio) => (
                  <AudioTrackLane key={audio.id} audio={audio} zoom={zoom} fps={clip.fps} width={width} />
                ))}

                <span className={styles.endZone} style={{ left: frameToX(clip.duration, zoom) }} aria-hidden="true" />
                <PlayheadLine zoom={zoom} />
                {marquee ? (
                  <span
                    className={styles.marquee}
                    style={{
                      left: Math.min(marquee.x1, marquee.x2),
                      top: Math.min(marquee.y1, marquee.y2),
                      width: Math.abs(marquee.x2 - marquee.x1),
                      height: Math.abs(marquee.y2 - marquee.y1),
                    }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <InterpolationEditor />
      </div>
    </Panel>
  );
}

function TrackName({ row, alternate, selected, collapsed }: { row: Row; alternate: boolean; selected: boolean; collapsed: boolean }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const Icon = nodeIcon(row.node, scene.nodes);
  if (row.variant === 'group') {
    return (
      <div className={`${styles.name} ${styles.nameGroup} ${alternate ? styles.trackAlt : ''} ${selected ? styles.nameSelected : ''}`}>
        <button
          type="button"
          className={styles.nameToggle}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Déplier' : 'Replier'} les pistes de ${row.node.name}`}
          onClick={() => store.toggleTrackGroup(row.node.id)}
        >
          {collapsed ? <ChevronRight size={13} strokeWidth={2.2} aria-hidden="true" /> : <ChevronDown size={13} strokeWidth={2.2} aria-hidden="true" />}
        </button>
        <button type="button" className={styles.nameLabel} onClick={() => store.select(row.node.id)}>
          <Icon size={13} strokeWidth={2} aria-hidden="true" />
          <span>{row.node.name}</span>
        </button>
      </div>
    );
  }
  return (
    <div className={`${styles.name} ${alternate ? styles.trackAlt : ''} ${selected ? styles.nameSelected : ''}`}>
      <KeyButton node={row.node} property={row.property!} />
      <span className={styles.propertyLabel}>{PROPERTY_LABELS[row.property!]}</span>
    </div>
  );
}

function PlayheadLine({ zoom }: { zoom: number }) {
  const frame = useStudio((state) => state.frame);
  return <span className={styles.playhead} style={{ transform: `translateX(${frameToX(frame, zoom)}px)` }} aria-hidden="true" />;
}

function PlayheadHead({ zoom }: { zoom: number }) {
  const frame = useStudio((state) => state.frame);
  return (
    <span className={styles.playheadHead} style={{ transform: `translateX(${frameToX(frame, zoom)}px)` }} aria-hidden="true">
      <span>{Math.round(frame)}</span>
    </span>
  );
}
