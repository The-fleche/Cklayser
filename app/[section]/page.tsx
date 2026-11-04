/**
 * /[section] — pages de navigation pas encore construites
 * (Découvrir, Séries Exclusives, Fandoms & Forums, chaînes, compte).
 * Chaque section a son propre texte ; toute autre adresse renvoie une 404.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ComingSoon from '@/components/ui/ComingSoon';
import { getUniverse } from '@/lib/catalog';

interface SectionCopy {
  title: string;
  kicker: string;
  description: string;
  highlights?: string[];
}

const SECTIONS: Record<string, SectionCopy> = {
  decouvrir: {
    kicker: 'Découvrir · Bientôt disponible',
    title: 'Tout le catalogue, bientôt à explorer',
    description:
      'Parcourez les séries par univers, par technique d’animation ou par créateur. La page Découvrir est en cours de fabrication.',
  },
  exclusives: {
    kicker: 'Séries Exclusives · Bientôt disponible',
    title: 'Séries Exclusives',
    description:
      'Les séries réservées aux membres des chaînes et les épisodes publiés en avance seront rassemblés ici.',
    highlights: ['Nouveautés de la semaine signalées dans la navigation.', 'Épisodes en avance pour les membres.'],
  },
  fandoms: {
    kicker: 'Fandoms & Forums · Bientôt disponible',
    title: 'Fandoms & Forums',
    description:
      'Théories, fan-arts et discussions autour de vos séries préférées : l’espace communautaire ouvre bientôt.',
  },
  chaines: {
    kicker: 'Chaînes · Bientôt disponible',
    title: 'Toutes les chaînes',
    description: 'Retrouvez les studios et les créateurs qui publient leurs séries sur CKlayser.',
  },
  adhesions: {
    kicker: 'Compte · Bientôt disponible',
    title: 'Mes adhésions',
    description:
      'Gérez vos adhésions aux chaînes : accès aux séries exclusives et aux épisodes publiés en avance.',
  },
  parametres: {
    kicker: 'Compte · Bientôt disponible',
    title: 'Paramètres',
    description: 'Langue, sous-titres, lecture et préférences d’accessibilité seront réglables ici.',
  },
};

interface SectionPageProps {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ univers?: string | string[] }>;
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section } = await params;
  return { title: SECTIONS[section]?.title ?? 'Page introuvable' };
}

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
  const { section } = await params;
  const copy = SECTIONS[section];
  if (!copy) notFound();

  // « Parcourir par univers » mène à /decouvrir?univers=… : on reprend le nom.
  const { univers } = await searchParams;
  const universe = section === 'decouvrir' && typeof univers === 'string' ? getUniverse(univers) : undefined;

  return (
    <ComingSoon
      kicker={copy.kicker}
      title={universe ? `Univers : ${universe.name}` : copy.title}
      description={copy.description}
      highlights={copy.highlights}
    />
  );
}
