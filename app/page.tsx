/**
 * Page d'accueil CKlayser.
 *
 * Rôle : hero (carrousel) puis rangées de découverte. Le titre de niveau 1
 * est réservé aux lecteurs d'écran : visuellement, le titre de la série mise
 * en avant joue ce rôle éditorial.
 */
import Hero from '@/components/home/Hero';
import HomeSections from '@/components/home/HomeSections';

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">
        CKlayser : séries animées 2D et 3D. <span lang="en">Our Clay, Your Keys.</span>
      </h1>
      <Hero />
      <HomeSections />
    </>
  );
}
