'use client';

/**
 * SceneViewport — vue centrale de la scène (rendu three.js temps réel).
 *
 * Le rendu est délégué à SceneRenderer (lib/studio/engine), qui ne connaît
 * pas React : ce composant l'abonne directement au store (sans re-rendu
 * React à chaque image) et lui transmet sélection, temps, outil et mode.
 *
 * Indications superposées : mode de vue, cadre de la caméra de scène,
 * étiquette de l'aperçu de caméra ; dépôt d'assets (glisser depuis le
 * navigateur d'assets).
 *
 * Props :
 *  - readOnly  consultation seule (mobile) : pas de gizmo ni de pilotage.
 */
import { useEffect, useRef, useState } from 'react';
import { SceneRenderer, type FrameRect, type RenderInput } from '@/lib/studio/engine/SceneRenderer';
import { getActiveScene, useActiveScene, useStudio, useStudioStore, type StudioState } from '@/lib/studio/store';
import { ASSET_DRAG_TYPE } from './SceneHierarchy';
import ViewportToolbar from './ViewportToolbar';
import styles from './SceneViewport.module.css';

const MODE_TEXT = { edit: 'Vue éditeur', camera: 'Vue caméra', preview: 'Aperçu du rendu final' } as const;

export default function SceneViewport({ readOnly = false, embedded = false }: { readOnly?: boolean; embedded?: boolean }) {
  const store = useStudioStore();
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const [frame, setFrame] = useState<FrameRect | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const scene = useActiveScene();
  const viewMode = useStudio((state) => state.viewMode);
  const viewCameraId = useStudio((state) => state.viewCameraId);
  const selectedId = useStudio((state) => state.selectedId);
  const projection = useStudio((state) => state.editorProjection);
  const cameraPreview = useStudio((state) => state.settings.cameraPreview);
  const viewCamera = viewCameraId ? scene.nodes[viewCameraId] : undefined;
  const selected = selectedId ? scene.nodes[selectedId] : undefined;

  /* ----- moteur ----- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer: SceneRenderer;
    try {
      renderer = new SceneRenderer(host, {
        onSelect: (id) => store.select(id),
        onGestureStart: () => store.beginGesture(),
        onGestureEnd: () => store.endGesture(),
        onProperty: (id, property, value) => store.setProperty(id, property, value),
        onViewCamera: readOnly ? undefined : (id) => store.viewThroughCamera(id),
      });
    } catch {
      setWebglError(true);
      return undefined;
    }
    rendererRef.current = renderer;

    const toInput = (state: StudioState): RenderInput => ({
      scene: getActiveScene(state.project),
      evaluation: store.getEvaluation(),
      assets: state.project.assets,
      selectedId: state.selectedId,
      tool: state.tool,
      viewMode: state.viewMode,
      viewCameraId: state.viewCameraId,
      editorProjection: state.editorProjection,
      settings: state.settings,
      readOnly,
    });

    let previous: StudioState | null = null;
    let lastFrameRequest = store.getState().frameRequest;
    const sync = () => {
      const state = store.getState();
      const p = previous;
      previous = state;
      if (state.frameRequest !== lastFrameRequest) {
        lastFrameRequest = state.frameRequest;
        renderer.frameSelection();
      }
      if (
        p &&
        p.project === state.project &&
        p.frame === state.frame &&
        p.overrides === state.overrides &&
        p.selectedId === state.selectedId &&
        p.tool === state.tool &&
        p.viewMode === state.viewMode &&
        p.viewCameraId === state.viewCameraId &&
        p.editorProjection === state.editorProjection &&
        p.settings === state.settings
      ) {
        return;
      }
      renderer.update(toInput(state));
    };
    sync();
    const unsubscribe = store.subscribe(sync);
    return () => {
      unsubscribe();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [store, readOnly]);

  /* ----- cadre de la caméra de scène (modes caméra / aperçu) ----- */
  useEffect(() => {
    const host = hostRef.current;
    const renderer = rendererRef.current;
    if (!host || !renderer || viewMode === 'edit' || !viewCamera?.camera) {
      setFrame(null);
      return undefined;
    }
    const aspect = viewCamera.camera.aspect;
    const measure = () => setFrame(renderer.getFrameRect(aspect));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [viewMode, viewCamera?.camera, viewCamera?.camera?.aspect]);

  /* ----- vues prédéfinies au clavier (1, 3, 7 comme Blender) ----- */
  useEffect(() => {
    if (readOnly) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, textarea, select, [data-keys="local"]')) return;
      const views = { '1': 'front', '3': 'right', '7': 'top' } as const;
      const view = views[event.key as keyof typeof views];
      if (view && store.getState().viewMode === 'edit') rendererRef.current?.setView(view);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store, readOnly]);

  const modeLabel =
    viewMode === 'edit'
      ? `${MODE_TEXT.edit} · ${scene.dimension === '2d' ? '2D' : projection === 'perspective' ? 'Perspective' : 'Orthographique'}`
      : `${MODE_TEXT[viewMode]} · ${viewCamera?.name ?? 'aucune caméra'}`;

  return (
    <section className={`${styles.viewport} ${embedded ? styles.embedded : ''}`} aria-label="Viewport de la scène">
      {readOnly ? null : <ViewportToolbar onView={(view) => rendererRef.current?.setView(view)} />}
      <div
        className={styles.stage}
        data-mode={viewMode}
        data-drop={dropActive || undefined}
        onDragOver={(event) => {
          if (readOnly || !event.dataTransfer.types.includes(ASSET_DRAG_TYPE)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => {
          const assetId = event.dataTransfer.getData(ASSET_DRAG_TYPE);
          setDropActive(false);
          if (!assetId || readOnly) return;
          event.preventDefault();
          const renderer = rendererRef.current;
          const targetId = renderer?.pick(event.clientX, event.clientY) ?? null;
          const position = renderer?.groundPoint(event.clientX, event.clientY) ?? undefined;
          store.useAsset(assetId, { targetId, position: position ?? undefined });
        }}
      >
        <div ref={hostRef} className={styles.canvasHost} data-testid="studio-canvas" />

        {webglError ? (
          <p className={styles.webglError} role="alert">
            WebGL n’est pas disponible dans ce navigateur : le viewport ne peut pas afficher la scène.
          </p>
        ) : null}

        <p className={styles.modeBadge} aria-live="polite">
          <span className={styles.modeDot} data-mode={viewMode} aria-hidden="true" />
          {modeLabel}
        </p>

        {frame ? (
          <div
            className={styles.cameraFrame}
            data-mode={viewMode}
            style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
            aria-hidden="true"
          >
            {viewMode === 'camera' ? <span className={styles.frameHint}>Glisser : orienter · Maj + glisser : déplacer · Molette : avancer</span> : null}
          </div>
        ) : null}

        {viewMode === 'edit' && selected?.kind === 'camera' && cameraPreview ? (
          <p className={styles.pipLabel} aria-hidden="true">
            Ce que filme {selected.name}
          </p>
        ) : null}

        {dropActive ? <div className={styles.dropHint}>Déposer dans la scène</div> : null}
      </div>
    </section>
  );
}
