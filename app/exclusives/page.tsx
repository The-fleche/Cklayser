/**
 * /exclusives — séries réservées aux adhérents et épisodes en avance
 * (voir ExclusivesView).
 */
import type { Metadata } from 'next';
import ExclusivesView from '@/components/catalog/ExclusivesView';

export const metadata: Metadata = { title: 'Séries exclusives' };

export default function ExclusivesPage() {
  return <ExclusivesView />;
}
