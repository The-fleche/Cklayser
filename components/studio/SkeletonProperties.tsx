'use client';

/**
 * SkeletonProperties — squelettes, bones et points de contrôle.
 *
 *  - Skeleton : hiérarchie des bones (cliquable), affichage, couleur,
 *    mode de déformation (rigide : fonctionnel ; pondéré : à venir) ;
 *  - Bone : longueur, bone parent, enfants, parties du corps liées,
 *    contraintes qui le visent ;
 *  - Point de contrôle : rayon d'influence, intensité, contrainte
 *    « Viser » (le bone ciblé s'oriente vers le point), axe visé.
 */
import { Bone, Crosshair, Plus } from 'lucide-react';
import { useActiveScene, useStudioStore } from '@/lib/studio/store';
import type { SceneNode, StudioScene } from '@/lib/studio/types';
import { Note, NumberField, Section, SelectField, Toggle } from './ui';
import styles from './Inspector.module.css';

function skeletonOf(scene: StudioScene, node: SceneNode): SceneNode | undefined {
  let current: SceneNode | undefined = node;
  while (current && current.kind !== 'skeleton') current = current.parentId ? scene.nodes[current.parentId] : undefined;
  return current;
}

function BoneTree({ scene, rootId, depth = 0 }: { scene: StudioScene; rootId: string; depth?: number }) {
  const store = useStudioStore();
  const node = scene.nodes[rootId];
  if (!node) return null;
  const children = node.children.filter((id) => scene.nodes[id]?.kind === 'bone' || scene.nodes[id]?.kind === 'control');
  return (
    <>
      {node.kind !== 'skeleton' ? (
        <li>
          <button type="button" className={styles.boneLink} style={{ paddingLeft: 8 + depth * 14 }} onClick={() => store.select(node.id)}>
            {node.kind === 'control' ? <Crosshair size={13} strokeWidth={2} aria-hidden="true" /> : <Bone size={13} strokeWidth={2} aria-hidden="true" />}
            {node.name}
            {node.bone ? <span className={styles.boneMeta}>{node.bone.length.toFixed(2)}</span> : null}
          </button>
        </li>
      ) : null}
      {children.map((id) => (
        <BoneTree key={id} scene={scene} rootId={id} depth={node.kind === 'skeleton' ? depth : depth + 1} />
      ))}
    </>
  );
}

export default function SkeletonProperties({ node }: { node: SceneNode }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const skeleton = skeletonOf(scene, node);
  const bones = Object.values(scene.nodes).filter((item) => item.kind === 'bone' && skeleton && skeletonOf(scene, item)?.id === skeleton.id);
  const gesture = { onGestureStart: () => store.beginGesture(), onGestureEnd: () => store.endGesture() };

  if (node.kind === 'skeleton' && node.skeleton) {
    const data = node.skeleton;
    return (
      <>
        <Section
          title={`Bones (${bones.length})`}
          actions={
            <button type="button" className={styles.miniAction} aria-label="Ajouter un bone racine" data-tip="Ajouter un bone" onClick={() => store.addNode('bone', { parentId: node.id })}>
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          }
        >
          <ul className={styles.boneTree} aria-label="Hiérarchie des bones">
            <BoneTree scene={scene} rootId={node.id} />
          </ul>
        </Section>
        <Section title="Squelette">
          <Toggle label="Afficher les bones" checked={data.showBones} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.skeleton!.showBones = value))} />
          <SelectField
            label="Déformation"
            value={data.deformation}
            options={[
              { value: 'weighted', label: 'Pondérée (skinning)' },
              { value: 'rigid', label: 'Rigide (parties liées)' },
            ]}
            onChange={(value) => store.updateNode(node.id, (draft) => void (draft.skeleton!.deformation = value))}
          />
          <Note>
            Pondérée : le maillage se plie en continu aux articulations. Chaque sommet suit son bone et, près d’une articulation, se
            partage avec le bone voisin (parent ou enfant) ; poids calculés automatiquement. Rigide : chaque partie suit un seul bone.
          </Note>
        </Section>
      </>
    );
  }

  if (node.kind === 'bone' && node.bone) {
    const data = node.bone;
    const parent = node.parentId ? scene.nodes[node.parentId] : undefined;
    const childBones = node.children.map((id) => scene.nodes[id]).filter((item): item is SceneNode => Boolean(item && item.kind === 'bone'));
    const parts = Object.values(scene.nodes).flatMap((item) =>
      [...(item.mesh?.skin?.parts ?? []), ...(item.sprite?.skin?.parts ?? [])].filter((part) => part.boneId === node.id).map(() => item.name),
    );
    const constraints = Object.values(scene.nodes).filter((item) => item.control?.targetBoneId === node.id);
    return (
      <>
        <Section title="Bone">
          <NumberField label="Longueur" short="L" value={data.length} min={0.02} step={0.02} precision={3} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.bone!.length = value))} {...gesture} />
          <dl className={styles.facts}>
            <div>
              <dt>Parent</dt>
              <dd>
                {parent ? (
                  <button type="button" className={styles.inlineLink} onClick={() => store.select(parent.id)}>
                    {parent.name}
                  </button>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Enfants</dt>
              <dd>
                {childBones.length === 0
                  ? 'aucun'
                  : childBones.map((child, index) => (
                      <span key={child.id}>
                        {index > 0 ? ', ' : ''}
                        <button type="button" className={styles.inlineLink} onClick={() => store.select(child.id)}>
                          {child.name}
                        </button>
                      </span>
                    ))}
              </dd>
            </div>
            <div>
              <dt>Corps lié</dt>
              <dd>{parts.length > 0 ? parts.join(', ') : 'aucune partie'}</dd>
            </div>
            <div>
              <dt>Squelette</dt>
              <dd>{skeleton?.name ?? '—'}</dd>
            </div>
          </dl>
          <div className={styles.cameraActions}>
            <button type="button" className={styles.actionButton} onClick={() => store.addNode('bone', { parentId: node.id })}>
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Bone enfant
            </button>
            <button type="button" className={styles.actionButton} onClick={() => store.addNode('control', { parentId: node.id })}>
              <Crosshair size={14} strokeWidth={2} aria-hidden="true" />
              Point de contrôle
            </button>
          </div>
        </Section>
        <Section title="Contraintes">
          {constraints.length === 0 ? (
            <Note>Aucune contrainte. Ajoutez un point de contrôle et choisissez ce bone comme cible pour l’orienter vers lui.</Note>
          ) : (
            constraints.map((item) => (
              <button key={item.id} type="button" className={styles.boneLink} onClick={() => store.select(item.id)}>
                <Crosshair size={13} strokeWidth={2} aria-hidden="true" />
                {item.control?.constraint === 'ik' ? 'IK' : 'Viser'} « {item.name} » · influence {Math.round((item.control?.influence ?? 0) * 100)} %
              </button>
            ))
          )}
          <Note>
            IK : un point de contrôle en mode « IK » qui cible ce bone (bout de chaîne) plie la chaîne parent → ce bone pour que son
            extrémité rejoigne le point.
          </Note>
        </Section>
      </>
    );
  }

  if (node.kind === 'control' && node.control) {
    const data = node.control;
    return (
      <Section title="Point de contrôle">
        <div className={styles.pair}>
          <NumberField label="Rayon d’influence" short="R" value={data.radius} min={0.02} step={0.02} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.control!.radius = value))} {...gesture} />
          <NumberField label="Influence" short="%" value={Math.round(data.influence * 100)} min={0} max={100} step={5} precision={0} unit="%" onChange={(value) => store.updateNode(node.id, (draft) => void (draft.control!.influence = value / 100))} {...gesture} />
        </div>
        <SelectField
          label="Contrainte"
          value={data.constraint}
          options={[
            { value: 'none', label: 'Aucune (repère)' },
            { value: 'aim', label: 'Viser : orienter un bone' },
            { value: 'ik', label: 'IK : chaîne de deux bones' },
          ]}
          onChange={(value) => store.updateNode(node.id, (draft) => void (draft.control!.constraint = value))}
        />
        {data.constraint === 'ik' ? (
          <>
            <SelectField
              label="Bout de chaîne"
              value={data.targetBoneId ?? ''}
              options={[
                { value: '', label: 'Choisir…' },
                ...bones
                  .filter((bone) => bone.parentId && scene.nodes[bone.parentId]?.kind === 'bone')
                  .map((bone) => ({ value: bone.id, label: `${scene.nodes[bone.parentId!]?.name} → ${bone.name}` })),
              ]}
              onChange={(value) => store.updateNode(node.id, (draft) => void (draft.control!.targetBoneId = value || undefined))}
            />
            <SelectField
              label="Pliage"
              value={String(data.bend ?? 1)}
              options={
                scene.dimension === '3d'
                  ? [
                      { value: '1', label: 'Vers l’avant (genou)' },
                      { value: '-1', label: 'Vers l’arrière (coude)' },
                    ]
                  : [
                      { value: '1', label: 'Côté 1' },
                      { value: '-1', label: 'Côté 2' },
                    ]
              }
              onChange={(value) => store.updateNode(node.id, (draft) => void (draft.control!.bend = value === '-1' ? -1 : 1))}
            />
          </>
        ) : null}
        {data.constraint === 'aim' ? (
          <>
            <SelectField
              label="Bone ciblé"
              value={data.targetBoneId ?? ''}
              options={[{ value: '', label: 'Choisir…' }, ...bones.map((bone) => ({ value: bone.id, label: bone.name }))]}
              onChange={(value) => store.updateNode(node.id, (draft) => void (draft.control!.targetBoneId = value || undefined))}
            />
            <SelectField
              label="Axe orienté"
              value={data.aimAxis ?? 'y'}
              options={[
                { value: 'y', label: 'Y (le long du bone)' },
                { value: 'z', label: 'Z (l’avant : regard)' },
              ]}
              onChange={(value) => store.updateNode(node.id, (draft) => void (draft.control!.aimAxis = value))}
            />
          </>
        ) : null}
        <Note>
          Déplacez le point (outil T ou W) : le bone ciblé s’oriente vers lui (Viser) ou la chaîne se plie pour l’atteindre (IK), selon
          l’influence. Sa position s’anime comme celle de tout composant.
        </Note>
      </Section>
    );
  }

  return null;
}

