'use client';

/**
 * StudioLayout — espace de travail de CKlayser Studio.
 *
 *   ┌──────────────── StudioToolbar ─────────────────┐
 *   │ Hiérarchie │       SceneViewport      │ Inspec- │
 *   │────────────│                          │ teur    │
 *   │ Assets     │──── AnimationTimeline ───│         │
 *   └──────────────── barre d'état ──────────────────┘
 *
 * Panneaux redimensionnables (séparateurs glissables ou flèches du
 * clavier) et réductibles ; disposition mémorisée dans ce navigateur.
 * Tablette (< 1280 px) : panneaux plus étroits, assets repliés par défaut.
 * Raccourcis clavier globaux (aide : touche ?).
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { isEditableTarget } from '@/lib/hooks';
import { getActiveScene, useStudioStore } from '@/lib/studio/store';
import AnimationTimeline from './AnimationTimeline';
import AssetBrowser from './AssetBrowser';
import HelpDialog from './HelpDialog';
import PropertiesInspector from './PropertiesInspector';
import SceneHierarchy from './SceneHierarchy';
import SceneViewport from './SceneViewport';
import Splitter from './Splitter';
import StudioStatusBar from './StudioStatusBar';
import StudioToolbar from './StudioToolbar';
import StudioTooltip from './StudioTooltip';
import styles from './StudioLayout.module.css';

const LAYOUT_KEY = 'cklayser:studio:disposition';

interface LayoutState {
  left: number;
  right: number;
  timeline: number;
  /** Part de la hiérarchie dans la colonne gauche (0..1). */
  split: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  timelineCollapsed: boolean;
  assetsCollapsed: boolean;
}

function defaultLayout(): LayoutState {
  const compact = typeof window !== 'undefined' && window.innerWidth < 1280;
  return {
    left: compact ? 230 : 268,
    right: compact ? 272 : 316,
    timeline: compact ? 236 : 268,
    split: 0.6,
    // Tablette : hiérarchie repliée en bande (un clic la rouvre), viewport plus large.
    leftCollapsed: compact,
    rightCollapsed: false,
    timelineCollapsed: false,
    assetsCollapsed: compact,
  };
}

function readLayout(): LayoutState {
  const fallback = defaultLayout();
  try {
    const saved = JSON.parse(window.localStorage.getItem(LAYOUT_KEY) ?? 'null') as Partial<LayoutState> | null;
    return saved ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

export default function StudioLayout() {
  const store = useStudioStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutState>(readLayout);
  const [fullscreen, setFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const update = useCallback((patch: Partial<LayoutState>) => {
    setLayout((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      } catch {
        /* préférence non mémorisée */
      }
      return next;
    });
  }, []);

  /* ----- plein écran ----- */
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => store.notify('Le navigateur a refusé le plein écran.', 'error'));
  }, [store]);

  /* ----- raccourcis clavier ----- */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      // Raccourcis actifs quand le focus est dans le Studio ou sur l'un de ses
      // ancêtres (<main>, <body> : après un clic dans le viewport par exemple).
      const root = rootRef.current;
      const active = document.activeElement;
      if (!root || (active && !root.contains(active) && !active.contains(root))) return;
      const local = (event.target as HTMLElement | null)?.closest?.('[data-keys="local"]');
      const state = store.getState();
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key;

      if (mod && key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key.toLowerCase() === 'y') {
        event.preventDefault();
        store.redo();
        return;
      }
      if (mod && key.toLowerCase() === 's') {
        event.preventDefault();
        store.save();
        return;
      }
      if (mod && key.toLowerCase() === 'c' && state.selectedKeys.length > 0) {
        event.preventDefault();
        store.copyKeys();
        return;
      }
      if (mod && key.toLowerCase() === 'v' && state.clipboard.length > 0) {
        event.preventDefault();
        store.pasteKeys();
        return;
      }
      if (mod || event.altKey) return;

      // Les flèches appartiennent aux composants qui les gèrent (arbre, losanges…).
      if (local && (key.startsWith('Arrow') || key === 'Home' || key === 'End' || key === 'Enter' || key === ' ' || key === 'Delete' || key === 'Backspace' || key === 'F2')) return;

      const scene = getActiveScene(state.project);
      switch (key) {
        case ' ':
          event.preventDefault();
          store.togglePlay();
          break;
        case 'q':
        case 'Q':
          store.setTool('select');
          break;
        case 'w':
        case 'W':
          store.setTool('move');
          break;
        case 'e':
        case 'E':
          store.setTool('rotate');
          break;
        case 'r':
        case 'R':
          store.setTool('scale');
          break;
        case 't':
        case 'T':
          store.setTool('pose');
          break;
        case 'f':
        case 'F':
          store.requestFrameSelection();
          break;
        case 'k':
        case 'K':
        case 'i':
        case 'I':
          if (state.selectedId) store.insertKeysForNode(state.selectedId);
          break;
        case '0':
          store.setViewMode(state.viewMode === 'camera' ? 'edit' : 'camera');
          break;
        case 'p':
        case 'P':
          store.setViewMode(state.viewMode === 'preview' ? 'edit' : 'preview');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (event.shiftKey) store.jumpToKey(-1);
          else store.stepFrame(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) store.jumpToKey(1);
          else store.stepFrame(1);
          break;
        case 'Home':
          event.preventDefault();
          store.pause();
          store.setFrame(0);
          break;
        case 'End':
          event.preventDefault();
          store.pause();
          store.setFrame(store.clip.duration);
          break;
        case 'Delete':
        case 'Backspace':
          if (state.selectedKeys.length > 0) store.deleteSelectedKeys();
          else if (state.selectedId && state.selectedId !== scene.rootId) store.deleteNode(state.selectedId);
          break;
        case 'Escape':
          if (state.viewMode !== 'edit') store.setViewMode('edit');
          else if (state.selectedKeys.length > 0) store.selectKeys([]);
          else store.select(null);
          break;
        case '?':
          setHelpOpen(true);
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);

  const columns = [
    layout.leftCollapsed ? 'var(--collapsed-size)' : `${layout.left}px`,
    layout.leftCollapsed ? '0px' : 'var(--splitter-size)',
    'minmax(0, 1fr)',
    layout.rightCollapsed ? '0px' : 'var(--splitter-size)',
    layout.rightCollapsed ? 'var(--collapsed-size)' : `${layout.right}px`,
  ].join(' ');

  const leftRows = layout.assetsCollapsed
    ? 'minmax(0, 1fr) 0px var(--panel-header)'
    : `minmax(120px, ${layout.split}fr) var(--splitter-size) minmax(120px, ${1 - layout.split}fr)`;

  const centerRows = layout.timelineCollapsed ? 'minmax(0, 1fr) 0px var(--timeline-collapsed)' : `minmax(160px, 1fr) var(--splitter-size) ${layout.timeline}px`;

  return (
    <div ref={rootRef} className={styles.studio} data-fullscreen={fullscreen || undefined}>
      <h1 className="sr-only">CKlayser Studio — éditeur d’animation</h1>
      <StudioToolbar fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} onOpenHelp={() => setHelpOpen(true)} />

      <div className={styles.workspace} style={{ gridTemplateColumns: columns } as CSSProperties}>
        {/* ----- Colonne gauche : hiérarchie + assets ----- */}
        <div ref={leftRef} className={styles.leftColumn} style={{ gridTemplateRows: leftRows }} data-collapsed={layout.leftCollapsed || undefined}>
          <SceneHierarchy collapsed={layout.leftCollapsed} onToggleCollapsed={() => update({ leftCollapsed: !layout.leftCollapsed })} />
          {layout.leftCollapsed ? null : (
            <>
              {layout.assetsCollapsed ? (
                <div />
              ) : (
                <Splitter
                  orientation="horizontal"
                  label="Redimensionner la hiérarchie et les assets"
                  value={Math.round(layout.split * 100)}
                  min={20}
                  max={85}
                  onChange={(value) => update({ split: value / 100 })}
                  onDrag={(delta) => {
                    const height = leftRef.current?.getBoundingClientRect().height ?? 600;
                    setLayout((current) => {
                      const split = Math.min(0.85, Math.max(0.2, current.split + delta / height));
                      return { ...current, split };
                    });
                  }}
                  onDragEnd={() => update({})}
                />
              )}
              <AssetBrowser collapsed={layout.assetsCollapsed} onToggleCollapsed={() => update({ assetsCollapsed: !layout.assetsCollapsed })} />
            </>
          )}
        </div>

        {layout.leftCollapsed ? (
          <div />
        ) : (
          <Splitter
            orientation="vertical"
            label="Redimensionner le panneau gauche"
            value={layout.left}
            min={200}
            max={460}
            onChange={(value) => update({ left: value })}
            onDrag={(delta) => setLayout((current) => ({ ...current, left: Math.min(460, Math.max(200, current.left + delta)) }))}
            onDragEnd={() => update({})}
          />
        )}

        {/* ----- Centre : viewport + timeline ----- */}
        <div className={styles.centerColumn} style={{ gridTemplateRows: centerRows }}>
          <SceneViewport />
          {layout.timelineCollapsed ? (
            <div />
          ) : (
            <Splitter
              orientation="horizontal"
              label="Redimensionner la timeline"
              value={layout.timeline}
              min={150}
              max={560}
              invert
              onChange={(value) => update({ timeline: value })}
              onDrag={(delta) => setLayout((current) => ({ ...current, timeline: Math.min(560, Math.max(150, current.timeline - delta)) }))}
              onDragEnd={() => update({})}
            />
          )}
          <AnimationTimeline collapsed={layout.timelineCollapsed} onToggleCollapsed={() => update({ timelineCollapsed: !layout.timelineCollapsed })} />
        </div>

        {layout.rightCollapsed ? (
          <div />
        ) : (
          <Splitter
            orientation="vertical"
            label="Redimensionner l’inspecteur"
            value={layout.right}
            min={240}
            max={480}
            invert
            onChange={(value) => update({ right: value })}
            onDrag={(delta) => setLayout((current) => ({ ...current, right: Math.min(480, Math.max(240, current.right - delta)) }))}
            onDragEnd={() => update({})}
          />
        )}

        {/* ----- Colonne droite : inspecteur ----- */}
        <PropertiesInspector collapsed={layout.rightCollapsed} onToggleCollapsed={() => update({ rightCollapsed: !layout.rightCollapsed })} />
      </div>

      <StudioStatusBar />
      <StudioTooltip rootRef={rootRef} />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ResetLayout onReset={() => update(defaultLayout())} />
    </div>
  );
}

/** Commande « Réinitialiser la disposition » exposée au menu Fichier via un événement. */
function ResetLayout({ onReset }: { onReset: () => void }) {
  useEffect(() => {
    const handler = () => onReset();
    window.addEventListener('cklayser:studio:reset-layout', handler);
    return () => window.removeEventListener('cklayser:studio:reset-layout', handler);
  }, [onReset]);
  return null;
}
