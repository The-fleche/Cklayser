'use client';

/**
 * MyList — contenu de la page « Ma liste ».
 *
 * Rôle : afficher les séries enregistrées (icône signet des cartes).
 *
 * Props : aucune.
 *
 * États :
 *  - visiteur  invitation à se connecter ou à créer un compte ;
 *  - vide      explication (signet des cartes, bouton « + » du hero) ;
 *  - rempli    grille de cartes (le signet permet de retirer une série).
 */
import { Bookmark } from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import { getSeriesList } from '@/lib/catalog';
import Button from '@/components/ui/Button';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import SeriesCard from './SeriesCard';
import styles from './MyList.module.css';

export default function MyList() {
  const { isMember, favorites, openAuthDialog } = useAppState();
  const saved = getSeriesList(favorites);

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>
        <KeyframeDiamond size={6} />
        Votre bibliothèque
      </p>
      <h1 className={styles.title}>Ma liste</h1>

      {!isMember ? (
        <div className={styles.empty}>
          <p>Connectez-vous pour retrouver les séries que vous avez enregistrées.</p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => openAuthDialog('signup')}>
              Créer un compte
            </Button>
            <Button variant="secondary" onClick={() => openAuthDialog('login')}>
              Se connecter
            </Button>
          </div>
        </div>
      ) : saved.length === 0 ? (
        <div className={styles.empty}>
          <p>
            Ma liste est vide. Utilisez le signet
            <Bookmark size={18} strokeWidth={1.75} aria-hidden="true" className={styles.inlineIcon} />
            d’une carte, ou le bouton « + » du hero, pour y ajouter une série.
          </p>
          <div className={styles.actions}>
            <Button href="/" variant="primary">
              Parcourir l’accueil
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.count}>
            {saved.length} série{saved.length > 1 ? 's' : ''} enregistrée{saved.length > 1 ? 's' : ''} pendant cette session
          </p>
          <ul className={styles.grid}>
            {saved.map((series) => (
              <li key={series.id}>
                <SeriesCard series={series} sizes="(max-width: 767px) 92vw, 320px" />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
