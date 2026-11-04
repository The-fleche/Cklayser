/**
 * /chaines — toutes les chaînes de créateurs (voir ChannelsView).
 */
import type { Metadata } from 'next';
import ChannelsView from '@/components/catalog/ChannelsView';

export const metadata: Metadata = { title: 'Chaînes' };

export default function ChannelsPage() {
  return <ChannelsView />;
}
