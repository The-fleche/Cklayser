'use client';

/**
 * HelpDialog — aide du Studio : raccourcis clavier, souris, et état
 * d'avancement (ce qui fonctionne, ce qui reste à développer).
 */
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import styles from './StudioLayout.module.css';

const SHORTCUTS: [string, string][] = [
  ['Espace', 'Lecture / pause'],
  ['← / →', 'Image précédente / suivante'],
  ['Maj + ← / →', 'Keyframe précédente / suivante'],
  ['Début / Fin', 'Première / dernière image'],
  ['Q W E R T', 'Sélection, déplacement, rotation, échelle, points de contrôle'],
  ['K ou I', 'Keyframes sur le composant sélectionné'],
  ['F', 'Cadrer la sélection'],
  ['0', 'Vue par la caméra de scène / retour à l’éditeur'],
  ['P', 'Aperçu du rendu final'],
  ['Suppr', 'Supprimer les keyframes sélectionnées, sinon le composant'],
  ['Ctrl + C / V', 'Copier / coller des keyframes (à l’image courante)'],
  ['Ctrl + Z / Maj + Ctrl + Z', 'Annuler / rétablir'],
  ['Ctrl + S', 'Enregistrer'],
  ['F2 (hiérarchie)', 'Renommer'],
  ['Échap', 'Quitter la vue caméra, puis désélectionner'],
];

const MOUSE: [string, string][] = [
  ['Clic gauche', 'Sélectionner'],
  ['Glisser gauche (3D)', 'Tourner autour de la scène'],
  ['Glisser droit / gauche (2D)', 'Déplacer la vue'],
  ['Molette', 'Zoom'],
  ['Double-clic sur une caméra', 'Voir par cette caméra'],
  ['Vue caméra : glisser', 'Orienter la caméra (Maj : la déplacer), molette : avancer'],
  ['Champ numérique : glisser l’étiquette', 'Faire varier la valeur (Maj : précis)'],
  ['Timeline : glisser un losange', 'Déplacer la keyframe (Maj / Ctrl : sélection multiple)'],
];

export default function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="studio-aide-titre" onClose={onClose} onCancel={onClose}>
      <div className={styles.dialogHeader}>
        <h2 id="studio-aide-titre" className={styles.dialogTitle}>
          Aide de CKlayser Studio
        </h2>
        <button type="button" className={styles.dialogClose} aria-label="Fermer l’aide" onClick={onClose}>
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.dialogBody}>
        <section>
          <h3 className={styles.dialogSection}>Clavier</h3>
          <dl className={styles.shortcuts}>
            {SHORTCUTS.map(([keys, action]) => (
              <div key={keys}>
                <dt>
                  <kbd>{keys}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3 className={styles.dialogSection}>Souris</h3>
          <dl className={styles.shortcuts}>
            {MOUSE.map(([keys, action]) => (
              <div key={keys}>
                <dt>{keys}</dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={styles.dialogWide}>
          <h3 className={styles.dialogSection}>Keyframes : la règle</h3>
          <p className={styles.dialogText}>
            Une propriété animée modifiée sans enregistrement automatique prend une valeur temporaire (champ orange) jusqu’au
            prochain changement d’image : cliquez sur le losange ◆ du champ pour l’enregistrer. Avec l’enregistrement automatique
            (bouton ● de la timeline), chaque modification crée ou met à jour la keyframe de l’image courante.
          </p>
          <h3 className={styles.dialogSection}>Version actuelle</h3>
          <p className={styles.dialogText}>
            Fonctionnel : scènes 2D et 3D, hiérarchie, transformations, caméras de scène et vue caméra, keyframes, interpolations,
            lecture, annuler / rétablir, enregistrement local et export JSON. Les bones déplacent des parties rigides (skinning
            rigide). À développer : déformation pondérée des maillages, cinématique inverse, pistes audio, rendu partagé avec le
            lecteur public et sauvegarde en ligne.
          </p>
        </section>
      </div>
    </dialog>
  );
}
