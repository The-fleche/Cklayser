/**
 * /profil — profil du membre : photo, nom, pseudo, e-mail, présentation,
 * univers préférés et notifications (voir ProfileEditor).
 */
import type { Metadata } from 'next';
import ProfileEditor from '@/components/profile/ProfileEditor';

export const metadata: Metadata = { title: 'Mon profil' };

export default function ProfilePage() {
  return <ProfileEditor />;
}
