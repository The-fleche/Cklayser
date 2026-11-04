/**
 * /ma-liste — séries enregistrées avec le signet des cartes ou le bouton
 * « + » du hero (conservées pendant la session).
 */
import type { Metadata } from 'next';
import MyList from '@/components/home/MyList';

export const metadata: Metadata = { title: 'Ma liste' };

export default function MyListPage() {
  return <MyList />;
}
