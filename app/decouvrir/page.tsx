/**
 * /decouvrir — tout le catalogue, filtrable (voir CatalogBrowser).
 * ?univers=fantasy|science-fiction|aventure|mystere|fantastique présélectionne
 * un univers (lien « Parcourir par univers » de l'accueil).
 */
import type { Metadata } from 'next';
import CatalogBrowser from '@/components/catalog/CatalogBrowser';
import { getUniverse } from '@/lib/catalog';

interface DiscoverPageProps {
  searchParams: Promise<{ univers?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: DiscoverPageProps): Promise<Metadata> {
  const { univers } = await searchParams;
  const universe = typeof univers === 'string' ? getUniverse(univers) : undefined;
  return { title: universe ? `Découvrir · ${universe.name}` : 'Découvrir' };
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { univers } = await searchParams;
  const universe = typeof univers === 'string' ? getUniverse(univers) : undefined;
  return <CatalogBrowser initialUniverse={universe?.id} />;
}
