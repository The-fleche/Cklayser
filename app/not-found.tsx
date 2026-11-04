/**
 * 404 aux couleurs de CKlayser.
 */
import ComingSoon from '@/components/ui/ComingSoon';

export default function NotFound() {
  return (
    <ComingSoon
      kicker="Erreur 404"
      title="Cette scène n’existe pas"
      description="Le lien suivi ne mène à aucune page. Il a peut-être été déplacé, ou la série n’est plus disponible."
    />
  );
}
