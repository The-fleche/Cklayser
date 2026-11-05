'use client';

/**
 * StudioToolbar — barre supérieure de CKlayser Studio.
 *
 *  - gauche : logo (retour à l'accueil du site), nom du projet (modifiable),
 *    menus Scène, Importer et Fichier ;
 *  - centre : onglet du projet, onglets des scènes (scène active renommable
 *    par double-clic), indicateur de sauvegarde ;
 *  - droite : annuler, rétablir, enregistrer, réglages, aide, plein écran.
 */
import {
  Box,
  CircleHelp,
  Download,
  FileJson,
  FilePlus2,
  FolderOpen,
  Image as ImageIcon,
  LayoutPanelLeft,
  Maximize2,
  Minimize2,
  Redo2,
  RotateCcw,
  Save,
  Settings2,
  Square,
  Trash2,
  Undo2,
  Upload,
  FolderKanban,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ACCEPTED_FILES, importFiles } from '@/lib/studio/import';
import { getActiveScene, parseProject, serializeProject, useStudio, useStudioStore } from '@/lib/studio/store';
import { MenuButton, ToolButton } from './ui';
import styles from './StudioToolbar.module.css';

interface StudioToolbarProps {
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenHelp: () => void;
}

function formatSaved(timestamp: number | null): string {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

export default function StudioToolbar({ fullscreen, onToggleFullscreen, onOpenHelp }: StudioToolbarProps) {
  const store = useStudioStore();
  const project = useStudio((state) => state.project);
  const canUndo = useStudio((state) => state.canUndo);
  const canRedo = useStudio((state) => state.canRedo);
  const saveState = useStudio((state) => state.saveState);
  const lastSavedAt = useStudio((state) => state.lastSavedAt);
  const settings = useStudio((state) => state.settings);
  const scene = getActiveScene(project);
  const assetInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [editingScene, setEditingScene] = useState(false);

  useEffect(() => {
    const start = () => setEditingScene(true);
    window.addEventListener('cklayser:studio:rename-scene', start);
    return () => window.removeEventListener('cklayser:studio:rename-scene', start);
  }, []);

  const exportProject = () => {
    const blob = new Blob([serializeProject(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const slug = project.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    link.download = `${slug || 'projet'}.cklayser.json`;
    link.click();
    URL.revokeObjectURL(url);
    store.notify('Projet exporté en fichier JSON.');
  };

  const openProject = async (file: File) => {
    const parsed = parseProject(await file.text());
    if (!parsed) {
      store.notify(`« ${file.name} » n’est pas un projet CKlayser Studio valide.`, 'error');
      return;
    }
    store.loadProject(parsed, `Projet « ${parsed.name} » ouvert.`);
  };

  return (
    <header className={styles.toolbar}>
      {/* ----- Gauche ----- */}
      <div className={styles.left}>
        <Link href="/" className={styles.brand} aria-label="CKlayser — retour à l’accueil" data-tip="Retour à CKlayser">
          <Image src="/brand/logo.png" alt="" width={1420} height={535} sizes="96px" className={styles.logo} />
          <span className={styles.brandStudio}>Studio</span>
        </Link>

        <span className={styles.divider} aria-hidden="true" />

        {editingProject ? (
          <input
            className={styles.nameInput}
            aria-label="Nom du projet"
            defaultValue={project.name}
            maxLength={80}
            autoFocus
            onBlur={(event) => {
              store.renameProject(event.target.value);
              setEditingProject(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'Escape') setEditingProject(false);
            }}
          />
        ) : (
          <button type="button" className={styles.projectName} data-tip="Renommer le projet" onClick={() => setEditingProject(true)}>
            <span className="sr-only">Projet : </span>
            {project.name}
          </button>
        )}

        <nav className={styles.menus} aria-label="Menus du Studio">
          <MenuButton
            label="Scène"
            items={[
              { label: 'Nouvelle scène 3D', icon: <Box size={14} />, onSelect: () => store.addScene('3d') },
              { label: 'Nouvelle scène 2D', icon: <Square size={14} />, onSelect: () => store.addScene('2d') },
              { separator: true, label: '' },
              ...project.scenes.map((item) => ({
                label: item.name,
                hint: item.dimension === '3d' ? 'Scène 3D' : 'Scène 2D',
                checked: item.id === scene.id,
                onSelect: () => store.setActiveScene(item.id),
              })),
              { separator: true, label: '' },
              { label: 'Renommer la scène…', onSelect: () => setEditingScene(true) },
              { label: 'Nouveau clip d’animation', onSelect: () => store.addClip() },
              { label: 'Supprimer la scène', icon: <Trash2 size={14} />, onSelect: () => store.deleteScene(), disabled: project.scenes.length <= 1 },
            ]}
          >
            Scène
          </MenuButton>
          <MenuButton
            label="Importer"
            items={[
              { label: 'Importer des fichiers…', hint: 'Images, modèles .glb, sons', icon: <ImageIcon size={14} />, onSelect: () => assetInput.current?.click() },
              { label: 'Ouvrir un projet (.json)…', icon: <FileJson size={14} />, onSelect: () => projectInput.current?.click() },
            ]}
          >
            Importer
          </MenuButton>
          <MenuButton
            label="Fichier"
            items={[
              { label: 'Enregistrer', icon: <Save size={14} />, shortcut: 'Ctrl S', onSelect: () => store.save() },
              { label: 'Exporter le projet (.json)', icon: <Download size={14} />, onSelect: exportProject },
              { label: 'Ouvrir un projet…', icon: <FolderOpen size={14} />, onSelect: () => projectInput.current?.click() },
              { separator: true, label: '' },
              { label: 'Recharger la démonstration', icon: <FilePlus2 size={14} />, onSelect: () => store.resetDemo() },
              {
                label: 'Réinitialiser la disposition',
                icon: <LayoutPanelLeft size={14} />,
                onSelect: () => window.dispatchEvent(new Event('cklayser:studio:reset-layout')),
              },
            ]}
          >
            Fichier
          </MenuButton>
        </nav>

        <input
          ref={assetInput}
          type="file"
          accept={ACCEPTED_FILES}
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void importFiles(event.target.files, store);
            event.target.value = '';
          }}
        />
        <input
          ref={projectInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void openProject(file);
            event.target.value = '';
          }}
        />
      </div>

      {/* ----- Centre : projet, scènes, sauvegarde ----- */}
      <div className={styles.center}>
        <div className={styles.projectTab} aria-hidden="true">
          <FolderKanban size={14} strokeWidth={2} />
          <span>Projet</span>
        </div>
        <div role="tablist" aria-label="Scènes du projet" className={styles.tabs} data-keys="local">
          {project.scenes.map((item) => {
            const active = item.id === scene.id;
            if (active && editingScene) {
              return (
                <input
                  key={item.id}
                  className={styles.tabInput}
                  aria-label="Nom de la scène"
                  defaultValue={item.name}
                  maxLength={60}
                  autoFocus
                  onBlur={(event) => {
                    store.renameScene(event.target.value);
                    setEditingScene(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                    if (event.key === 'Escape') setEditingScene(false);
                  }}
                />
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                className={styles.tab}
                data-tip={active ? 'Double-clic pour renommer' : `Ouvrir « ${item.name} »`}
                onClick={() => store.setActiveScene(item.id)}
                onDoubleClick={() => active && setEditingScene(true)}
                onKeyDown={(event) => {
                  if (event.key === 'F2' && active) setEditingScene(true);
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    const index = project.scenes.findIndex((entry) => entry.id === item.id);
                    const next = project.scenes[(index + (event.key === 'ArrowRight' ? 1 : -1) + project.scenes.length) % project.scenes.length];
                    if (next) {
                      store.setActiveScene(next.id);
                      requestAnimationFrame(() => (document.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement | null)?.focus());
                    }
                  }
                }}
              >
                <span className={styles.dimension}>{item.dimension.toUpperCase()}</span>
                <span className={styles.tabName}>{item.name}</span>
              </button>
            );
          })}
        </div>
        <p className={`${styles.saveState} ${saveState === 'dirty' ? styles.saveDirty : ''}`} aria-live="polite">
          <span className={styles.saveDot} aria-hidden="true" />
          {saveState === 'saved' ? (lastSavedAt ? `Enregistré à ${formatSaved(lastSavedAt)}` : 'Démonstration non modifiée') : 'Modifications non enregistrées'}
        </p>
      </div>

      {/* ----- Droite ----- */}
      <div className={styles.right}>
        <ToolButton label="Annuler" shortcut="Ctrl Z" icon={<Undo2 size={17} strokeWidth={2} />} disabled={!canUndo} onClick={store.undo} />
        <ToolButton label="Rétablir" shortcut="Maj Ctrl Z" icon={<Redo2 size={17} strokeWidth={2} />} disabled={!canRedo} onClick={store.redo} />
        <ToolButton label="Enregistrer" shortcut="Ctrl S" icon={<Save size={17} strokeWidth={2} />} onClick={() => store.save()} />
        <span className={styles.divider} aria-hidden="true" />
        <MenuButton
          label="Réglages de l’éditeur"
          ariaLabel="Réglages de l’éditeur"
          tip="Réglages"
          align="end"
          className={styles.iconMenu}
          items={[
            { label: 'Grille et axes', checked: settings.grid, onSelect: () => store.setSetting('grid', !settings.grid) },
            { label: 'Squelettes et points de contrôle', checked: settings.bones, onSelect: () => store.setSetting('bones', !settings.bones) },
            { label: 'Aperçu de la caméra sélectionnée', checked: settings.cameraPreview, onSelect: () => store.setSetting('cameraPreview', !settings.cameraPreview) },
            { label: 'Aimantation (grille 0,25 · 15°)', checked: settings.snap, onSelect: () => store.setSetting('snap', !settings.snap) },
            { separator: true, label: '' },
            { label: 'Réinitialiser la disposition', icon: <RotateCcw size={14} />, onSelect: () => window.dispatchEvent(new Event('cklayser:studio:reset-layout')) },
          ]}
        >
          <Settings2 size={17} strokeWidth={2} aria-hidden="true" />
        </MenuButton>
        <ToolButton label="Aide et raccourcis" shortcut="?" icon={<CircleHelp size={17} strokeWidth={2} />} onClick={onOpenHelp} />
        <ToolButton
          label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          icon={fullscreen ? <Minimize2 size={17} strokeWidth={2} /> : <Maximize2 size={17} strokeWidth={2} />}
          pressed={fullscreen}
          onClick={onToggleFullscreen}
        />
        <Link href="/" className={styles.exit} data-tip="Quitter le Studio">
          <Upload size={15} strokeWidth={2} aria-hidden="true" className={styles.exitIcon} />
          Quitter
        </Link>
      </div>
    </header>
  );
}
