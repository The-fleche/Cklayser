/**
 * /studio — CKlayser Studio, l'éditeur d'animation intégré à la plateforme.
 *
 * Sur tablette et desktop, l'éditeur occupe toute la fenêtre (le squelette
 * du site est masqué par SiteFrame) ; sur mobile, consultation des projets.
 */
import type { Metadata } from 'next';
import StudioApp from '@/components/studio/StudioApp';

export const metadata: Metadata = {
  title: 'CKlayser Studio',
  description: 'Éditeur d’animation 2D et 3D par keyframes de CKlayser : scènes, squelettes, caméras et timeline, dans le navigateur.',
};

export default function StudioPage() {
  return <StudioApp />;
}
