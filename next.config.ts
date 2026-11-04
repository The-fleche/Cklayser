import type { NextConfig } from 'next';

/**
 * Configuration Next.js de CKlayser.
 * - Aucune dépendance CSS externe : CSS Modules + feuille globale uniquement.
 * - Les visuels de remplacement sont des SVG locaux : next/image les sert
 *   sans optimisation (comportement par défaut pour les .svg). Les futures
 *   illustrations raster (JPG/PNG/WebP) seront optimisées automatiquement.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pas de fichier AGENTS.md généré automatiquement dans le dépôt.
  agentRules: false,
  // Pas de pastille d'outils de dev superposée à l'interface (captures fidèles).
  devIndicators: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
