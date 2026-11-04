/**
 * /[section] — pages de compte pas encore construites (Mes adhésions,
 * Paramètres).
 * Chaque section a son propre texte ; toute autre adresse renvoie une 404.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ComingSoon from '@/components/ui/ComingSoon';

interface SectionCopy {
  title: string;
  kicker: string;
  description: string;
  highlights?: string[];
}

const SECTIONS: Record<string, SectionCopy> = {
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
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section } = await params;
  return { title: SECTIONS[section]?.title ?? 'Page introuvable' };
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { section } = await params;
  const copy = SECTIONS[section];
  if (!copy) notFound();

  return (
    <ComingSoon
      kicker={copy.kicker}
      title={copy.title}
      description={copy.description}
      highlights={copy.highlights}
    />
  );
}
