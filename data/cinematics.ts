/**
 * Cinématiques temps réel des séries.
 *
 * Chaque entrée décrit une courte scène au format CKlayser Studio : le
 * lecteur ne télécharge pas de vidéo, il reconstruit la scène (personnages
 * riggés, décors, caméras, animation, son) et la joue en temps réel
 * (lib/studio/cinematics.ts construit la scène, components/watch/ScenePlayer
 * la joue). Elles s'ouvrent aussi dans le Studio pour être modifiées.
 *
 * Mise en scène (archetype) :
 *  - rencontre     deux personnages se saluent ; champ / contrechamp ;
 *  - voyage        marche à travers le décor ; travelling d'accompagnement ;
 *  - contemplation un personnage lève les yeux vers un astre qui monte ;
 *                  grue ascendante, regard piloté par une contrainte ;
 *  - fete          ronde de trois personnages autour d'un feu / de lanternes ;
 *  - decouverte    un personnage s'agenouille (IK des pieds) et tend la main
 *                  (IK de la main) vers un objet ; travelling avant ;
 *  - orbite        structure en anneaux et vaisseau ; caméra en orbite.
 */

export type CinematicArchetype = 'rencontre' | 'voyage' | 'contemplation' | 'fete' | 'decouverte' | 'orbite';

export interface Cinematic {
  id: string;
  seriesId: string;
  title: string;
  synopsis: string;
  archetype: CinematicArchetype;
  /** Durée en secondes (24 i/s). */
  seconds: number;
}

export const cinematics: Cinematic[] = [
  // Les Échos d'Aelith
  { id: 'aelith-reveil-ruines', seriesId: 'echos-aelith', archetype: 'contemplation', seconds: 8, title: 'Le réveil des ruines', synopsis: 'Aelith lève les yeux : un écho lumineux s’élève des pierres effondrées.' },
  { id: 'aelith-gardien', seriesId: 'echos-aelith', archetype: 'decouverte', seconds: 8, title: 'Le fragment de mémoire', synopsis: 'Agenouillée dans la poussière, elle ramasse un éclat qui garde la voix d’un disparu.' },
  // Lune Rousse
  { id: 'lune-ascension', seriesId: 'lune-rousse', archetype: 'voyage', seconds: 8, title: 'L’ascension', synopsis: 'L’exilée longe le pied des falaises interdites sous la lune de braise.' },
  { id: 'lune-voix', seriesId: 'lune-rousse', archetype: 'contemplation', seconds: 7, title: 'La voix du peuple', synopsis: 'Au sommet, la lune se lève et semble lui répondre.' },
  // Horizons Perdus
  { id: 'horizons-aube', seriesId: 'horizons-perdus', archetype: 'voyage', seconds: 8, title: 'Les rues de l’aube', synopsis: 'Le cartographe traverse la cité des flèches avant que les rues ne se déplacent.' },
  { id: 'horizons-carte', seriesId: 'horizons-perdus', archetype: 'decouverte', seconds: 7, title: 'La carte oubliée', synopsis: 'Au pied d’une flèche, une boussole abandonnée indique un nouvel horizon.' },
  // Le Jardin des Miroirs
  { id: 'miroirs-chat', seriesId: 'jardin-des-miroirs', archetype: 'rencontre', seconds: 7, title: 'Le guide', synopsis: 'Une promeneuse perdue rencontre celui qui connaît le chemin entre les étés.' },
  { id: 'miroirs-reflet', seriesId: 'jardin-des-miroirs', archetype: 'contemplation', seconds: 7, title: 'Un autre été', synopsis: 'Face au grand miroir, un soleil d’une autre saison se lève.' },
  // Au-delà des Brumes
  { id: 'brumes-portail', seriesId: 'au-dela-des-brumes', archetype: 'voyage', seconds: 8, title: 'Le portail vermillon', synopsis: 'Un voyageur s’avance vers le portail, entre les colonnes de brume.' },
  { id: 'brumes-noms', seriesId: 'au-dela-des-brumes', archetype: 'rencontre', seconds: 7, title: 'Les gardiens des noms', synopsis: 'Deux silhouettes se reconnaissent de part et d’autre du seuil.' },
  // La Cité des Engrenages
  { id: 'engrenages-horloge', seriesId: 'cite-des-engrenages', archetype: 'orbite', seconds: 8, title: 'Le grand mécanisme', synopsis: 'Les anneaux de l’horloge céleste tournent au-dessus des nuages.' },
  { id: 'engrenages-apprentie', seriesId: 'cite-des-engrenages', archetype: 'decouverte', seconds: 7, title: 'La clé de remontoir', synopsis: 'L’apprentie trouve la clé qui fait remonter le temps.' },
  // Le Phare d'Ysolde
  { id: 'phare-veille', seriesId: 'phare-ysolde', archetype: 'contemplation', seconds: 8, title: 'La veille', synopsis: 'Le faisceau s’allume et révèle la silhouette d’une île absente des cartes.' },
  { id: 'phare-visiteur', seriesId: 'phare-ysolde', archetype: 'rencontre', seconds: 7, title: 'Le visiteur', synopsis: 'Quelqu’un frappe à la porte du phare, venu de l’île.' },
  // La Forge des Vents
  { id: 'forge-moulins', seriesId: 'forge-des-vents', archetype: 'orbite', seconds: 8, title: 'Les moulins de tempête', synopsis: 'Les pales forgées s’éveillent quand le vent se lève sur les montagnes ocres.' },
  { id: 'forge-marteau', seriesId: 'forge-des-vents', archetype: 'decouverte', seconds: 7, title: 'Le métal chantant', synopsis: 'La forgeronne ramasse une pièce encore chaude qui siffle comme le vent.' },
  // L'Atelier des Golems
  { id: 'golems-eveil', seriesId: 'atelier-des-golems', archetype: 'rencontre', seconds: 8, title: 'Premier souvenir', synopsis: 'La sculptrice salue son golem, qui lui rend son geste.' },
  { id: 'golems-ronde', seriesId: 'atelier-des-golems', archetype: 'fete', seconds: 7, title: 'La ronde des gardiens', synopsis: 'Les gardiens d’argile dansent autour du four encore rougeoyant.' },
  // Les Veilleurs de Sel
  { id: 'sel-attente', seriesId: 'veilleurs-de-sel', archetype: 'contemplation', seconds: 8, title: 'L’attente', synopsis: 'Sur le désert blanc, un veilleur scrute l’horizon où devrait paraître le navire.' },
  { id: 'sel-releve', seriesId: 'veilleurs-de-sel', archetype: 'rencontre', seconds: 7, title: 'La relève', synopsis: 'Deux veilleurs échangent leur poste au coucher du soleil.' },
  // L'Archipel des Lucioles
  { id: 'lucioles-nuit', seriesId: 'archipel-des-lucioles', archetype: 'fete', seconds: 8, title: 'La nuit des îles', synopsis: 'Les habitants dansent pendant que les lucioles s’allument une à une.' },
  { id: 'lucioles-derniere', seriesId: 'archipel-des-lucioles', archetype: 'decouverte', seconds: 7, title: 'La dernière luciole', synopsis: 'La gardienne recueille une luciole éteinte au creux de sa main.' },
  // La Dernière Orbite
  { id: 'orbite-station', seriesId: 'derniere-orbite', archetype: 'orbite', seconds: 8, title: 'La station engrenage', synopsis: 'La station pivote sur son axe ; la planète n’est plus à sa place.' },
  { id: 'orbite-equipage', seriesId: 'derniere-orbite', archetype: 'rencontre', seconds: 7, title: 'Rapport d’équipage', synopsis: 'La commandante et l’ingénieur constatent l’impossible.' },
  // Le Cartographe des Dunes
  { id: 'dunes-caravane', seriesId: 'cartographe-des-dunes', archetype: 'voyage', seconds: 8, title: 'Sur la piste de la caravane', synopsis: 'Le jeune cartographe marche entre les dunes qui ont bougé dans la nuit.' },
  { id: 'dunes-trace', seriesId: 'cartographe-des-dunes', archetype: 'decouverte', seconds: 7, title: 'La trace', synopsis: 'Une empreinte à demi ensablée : la caravane est passée par ici.' },
  // La Nuit des Lanternes
  { id: 'lanternes-envol', seriesId: 'nuit-des-lanternes', archetype: 'fete', seconds: 8, title: 'L’envol', synopsis: 'La ville danse pendant que les lanternes montent dans le ciel.' },
  { id: 'lanternes-message', seriesId: 'nuit-des-lanternes', archetype: 'contemplation', seconds: 7, title: 'Le message', synopsis: 'Une lanterne redescend lentement vers une enfant qui l’attendait.' },
  // Les Murmures du Glacier
  { id: 'glacier-expedition', seriesId: 'murmures-du-glacier', archetype: 'voyage', seconds: 8, title: 'L’expédition', synopsis: 'L’expédition progresse sur la glace sous les aurores.' },
  { id: 'glacier-murmure', seriesId: 'murmures-du-glacier', archetype: 'decouverte', seconds: 7, title: 'Le murmure', synopsis: 'Une exploratrice pose la main sur la glace, qui murmure un nom.' },
  // Brindille & Caillou
  { id: 'brindille-bonjour', seriesId: 'brindille-et-caillou', archetype: 'rencontre', seconds: 6, title: 'Bonjour Caillou !', synopsis: 'Brindille salue son ami qui, comme toujours, ne bouge pas d’un pouce.' },
  { id: 'brindille-ronde', seriesId: 'brindille-et-caillou', archetype: 'fete', seconds: 6, title: 'La ronde de la prairie', synopsis: 'Brindille entraîne ses amis dans une ronde autour de Caillou.' },
];

export function getCinematicsBySeries(seriesId: string): Cinematic[] {
  return cinematics.filter((item) => item.seriesId === seriesId);
}

export function getCinematic(id: string): Cinematic | undefined {
  return cinematics.find((item) => item.id === id);
}
