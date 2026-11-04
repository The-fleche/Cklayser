/**
 * /studio — « Bientôt disponible » pour CKlayser Studio, le logiciel de
 * création (lien de la carte « Découvrir le Studio » et du menu de compte).
 */
import type { Metadata } from 'next';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata: Metadata = { title: 'CKlayser Studio' };

export default function StudioPage() {
  return (
    <ComingSoon
      kicker="CKlayser Studio · Bientôt disponible"
      title="Créez. Animez. Publiez."
      description="CKlayser Studio est le logiciel de création de la plateforme. Vous y composez personnages, décors, mouvements et caméras : au lieu d’une vidéo, CKlayser transmet ces éléments de scène, et le lecteur reconstruit l’animation en temps réel sur l’appareil du spectateur."
      highlights={[
        'Rigs 2D et 3D, timeline et keyframes.',
        'Caméras libres pour les séries 3D compatibles avec le changement de point de vue.',
        'Publication directe sur votre chaîne, épisodes exclusifs ou en avance pour vos membres.',
      ]}
    />
  );
}
