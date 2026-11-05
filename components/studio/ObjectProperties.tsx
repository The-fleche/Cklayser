'use client';

/**
 * ObjectProperties — propriétés propres aux objets physiques : forme,
 * dimensions et matériau (mesh, décor), sprite 2D (taille, forme, calque,
 * pivot, texture), modèle importé, corps lié à un squelette (couleur de
 * chaque partie). LightProperties — type, couleur, intensité, ombres.
 */
import { SHAPE_LABELS } from '@/lib/studio/factory';
import { useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import type { PrimitiveShape, SceneNode, SpriteShape } from '@/lib/studio/types';
import { ColorField, Note, NumberField, Section, SelectField, Toggle } from './ui';
import styles from './Inspector.module.css';

const SHAPES = Object.entries(SHAPE_LABELS).map(([value, label]) => ({ value: value as PrimitiveShape, label }));
const SPRITE_SHAPES: { value: SpriteShape; label: string }[] = [
  { value: 'rounded', label: 'Arrondi' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'rect', label: 'Rectangle' },
];

export default function ObjectProperties({ node }: { node: SceneNode }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const assets = useStudio((state) => state.project.assets);
  const textures = assets.filter((asset) => asset.type === 'texture');
  const gesture = { onGestureStart: () => store.beginGesture(), onGestureEnd: () => store.endGesture() };
  const boneName = (id: string) => scene.nodes[id]?.name ?? 'bone supprimé';

  if (node.kind === 'group') {
    return (
      <Section title="Groupe">
        <Note>
          Nœud de regroupement : ses transformations s’appliquent à tous ses enfants ({node.children.length}). Glissez des composants
          dessus dans la hiérarchie pour les y ranger.
        </Note>
      </Section>
    );
  }

  if (node.mesh?.skin) {
    const skin = node.mesh.skin;
    return (
      <Section title="Corps lié au squelette">
        <Note>
          Animez les bones du squelette « {scene.nodes[skin.skeletonId]?.name ?? '—'} » pour faire bouger le corps : le maillage se
          déforme selon les poids des bones.
        </Note>
        {skin.parts.map((part, index) => (
          <ColorField
            key={part.boneId}
            label={boneName(part.boneId)}
            value={part.color}
            onChange={(color) =>
              store.updateNode(node.id, (draft) => {
                const target = draft.mesh?.skin?.parts[index];
                if (target) target.color = color;
              })
            }
          />
        ))}
        <NumberField label="Rugosité" short="R" value={node.mesh.roughness} min={0} max={1} step={0.05} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.mesh!.roughness = value))} {...gesture} />
        <Note>Mode de déformation (pondérée ou rigide) : propriétés du squelette.</Note>
      </Section>
    );
  }

  if (node.sprite?.skin) {
    const skin = node.sprite.skin;
    return (
      <Section title="Corps lié au squelette 2D">
        <Note>Chaque sprite est lié à son bone ; ordre d’affichage par partie.</Note>
        {skin.parts.map((part, index) => (
          <ColorField
            key={part.boneId}
            label={boneName(part.boneId)}
            value={part.color}
            onChange={(color) =>
              store.updateNode(node.id, (draft) => {
                const target = draft.sprite?.skin?.parts[index];
                if (target) target.color = color;
              })
            }
          />
        ))}
        <Note>En déformation pondérée, chaque sprite est un maillage subdivisé qui se plie avec les bones (propriétés du squelette).</Note>
      </Section>
    );
  }

  if (node.mesh) {
    const mesh = node.mesh;
    const texture = mesh.textureAssetId ? assets.find((asset) => asset.id === mesh.textureAssetId) : undefined;
    return (
      <>
        <Section title={node.kind === 'environment' ? 'Décor' : 'Forme'}>
          <SelectField label="Primitive" value={mesh.shape} options={SHAPES} onChange={(shape) => store.updateNode(node.id, (draft) => void (draft.mesh!.shape = shape))} />
          <div className={styles.triple}>
            {(['Largeur', 'Hauteur', 'Profondeur'] as const).map((label, axis) => (
              <NumberField
                key={label}
                label={label}
                short={label.charAt(0)}
                value={mesh.size[axis] ?? 1}
                step={0.05}
                min={0}
                precision={3}
                onChange={(value) => store.updateNode(node.id, (draft) => void (draft.mesh!.size[axis] = value))}
                {...gesture}
              />
            ))}
          </div>
        </Section>
        <Section title="Matériau">
          <ColorField label="Couleur" value={mesh.color} onChange={(color) => store.updateNode(node.id, (draft) => void (draft.mesh!.color = color))} />
          <div className={styles.pair}>
            <NumberField label="Rugosité" short="R" value={mesh.roughness} min={0} max={1} step={0.05} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.mesh!.roughness = value))} {...gesture} />
            <NumberField label="Métal" short="M" value={mesh.metalness} min={0} max={1} step={0.05} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.mesh!.metalness = value))} {...gesture} />
          </div>
          <SelectField
            label="Texture"
            value={mesh.textureAssetId ?? ''}
            options={[{ value: '', label: 'Aucune' }, ...textures.map((asset) => ({ value: asset.id, label: asset.name }))]}
            onChange={(value) => store.updateNode(node.id, (draft) => void (draft.mesh!.textureAssetId = value || undefined))}
          />
          {texture?.sessionOnly ? <Note>Texture disponible pour cette session seulement (fichier lourd).</Note> : null}
          <Note>Astuce : glissez un matériau depuis les assets sur l’objet.</Note>
        </Section>
      </>
    );
  }

  if (node.sprite) {
    const sprite = node.sprite;
    return (
      <Section title="Sprite">
        <div className={styles.pair}>
          <NumberField label="Largeur" short="L" value={sprite.width} min={0.01} step={0.05} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.sprite!.width = value))} {...gesture} />
          <NumberField label="Hauteur" short="H" value={sprite.height} min={0.01} step={0.05} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.sprite!.height = value))} {...gesture} />
        </div>
        <SelectField label="Forme" value={sprite.shape} options={SPRITE_SHAPES} onChange={(shape) => store.updateNode(node.id, (draft) => void (draft.sprite!.shape = shape))} />
        <ColorField label="Couleur" value={sprite.color} onChange={(color) => store.updateNode(node.id, (draft) => void (draft.sprite!.color = color))} />
        <SelectField
          label="Texture"
          value={sprite.assetId ?? ''}
          options={[{ value: '', label: 'Forme colorée' }, ...textures.map((asset) => ({ value: asset.id, label: asset.name }))]}
          onChange={(value) => store.updateNode(node.id, (draft) => void (draft.sprite!.assetId = value || undefined))}
        />
        <div className={styles.pair}>
          <NumberField label="Calque (ordre d’affichage)" short="C" value={sprite.layer} step={1} precision={0} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.sprite!.layer = Math.round(value)))} {...gesture} />
          <NumberField label="Pivot vertical" short="P" value={sprite.pivot[1]} min={0} max={1} step={0.05} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.sprite!.pivot[1] = value))} {...gesture} />
        </div>
      </Section>
    );
  }

  if (node.model) {
    const asset = assets.find((item) => item.id === node.model!.assetId);
    return (
      <Section title="Modèle importé">
        <Note>
          {asset ? `Fichier : ${asset.name}${asset.size ? ` (${(asset.size / 1024).toFixed(0)} Ko)` : ''}.` : 'Fichier introuvable (session terminée ?) : un cube filaire le remplace.'}
          {' '}Transformations et keyframes s’appliquent au modèle entier.
        </Note>
        <Note tone="todo">À développer : lecture des squelettes et animations contenus dans le fichier glTF.</Note>
      </Section>
    );
  }

  return null;
}

export function LightProperties({ node }: { node: SceneNode }) {
  const store = useStudioStore();
  const light = node.light;
  if (!light) return null;
  return (
    <Section title="Lumière">
      <SelectField
        label="Type"
        value={light.type}
        options={[
          { value: 'directional', label: 'Directionnelle (soleil)' },
          { value: 'point', label: 'Ponctuelle' },
          { value: 'ambient', label: 'Ambiante' },
        ]}
        onChange={(type) => store.updateNode(node.id, (draft) => void (draft.light!.type = type))}
      />
      <ColorField label="Couleur" value={light.color} onChange={(color) => store.updateNode(node.id, (draft) => void (draft.light!.color = color))} />
      <NumberField
        label="Intensité"
        short="I"
        value={light.intensity}
        min={0}
        max={20}
        step={0.1}
        onGestureStart={() => store.beginGesture()}
        onGestureEnd={() => store.endGesture()}
        onChange={(value) => store.updateNode(node.id, (draft) => void (draft.light!.intensity = value))}
      />
      {light.type === 'directional' ? (
        <Toggle label="Projette des ombres" checked={light.castShadow} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.light!.castShadow = value))} />
      ) : null}
      {light.type === 'directional' ? <Note>La lumière directionnelle éclaire vers l’origine de la scène depuis sa position.</Note> : null}
    </Section>
  );
}
