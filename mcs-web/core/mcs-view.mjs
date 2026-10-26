import { GROUP_OBJECT_IDS, MCS_GROUP_TITLES, PRESETS } from '../shared/mcs-groups.mjs';

/**
 * Read-only D projection of public M. The case manifest supplies identities, never titles.
 * @param {import('../shared/content-documents.mjs').ContentLibrary} library
 * @param {{id:string,core:Array<{object:string,disambiguation?:{additionalObject?:string}}>,relations:Array<{id:string}>}} topologyCase
 * @returns {import('../shared/mcs-view.mjs').McsViewData}
 */
export function buildMcsView(library, topologyCase) {
  if (topologyCase.id !== 'topology-dg') throw new Error('MCS 分组需要 topology-dg 案例清单');
  const relations = library.relations.filter(relation => relation.layer === 'M');
  const ids = library.objects.map(object => object.id), available = new Set(ids);
  const registeredRelations = new Set(topologyCase.relations.map(relation => relation.id));
  const topologyIds = new Set(topologyCase.core.flatMap(item => [
    item.object, ...(item.disambiguation?.additionalObject ? [item.disambiguation.additionalObject] : []),
  ]));
  for (const relation of relations) {
    if (!registeredRelations.has(relation.id)) continue;
    for (const ref of [relation.from, relation.to, ...relation.premises]) topologyIds.add(ref.id);
  }
  const groupIds = new Set(GROUP_OBJECT_IDS);
  const members = {
    all: ids,
    group: ids.filter(id => groupIds.has(id)),
    'topology-dg': ids.filter(id => topologyIds.has(id)),
    ...Object.fromEntries(Object.entries(PRESETS).map(([id, keys]) => [
      id, keys.map(key => `obj:tdg:${key}`).filter(objectId => available.has(objectId)),
    ])),
  };
  return {
    schema: 'mcs-view/1',
    objectVersion: library.objectVersion,
    contentLocale: 'zh',
    levels: library.scale.levels,
    objects: library.objects.map(object => ({
      id: object.id,
      version: object.version,
      title: object.title,
      scale: object.scale,
      formalHash: object.formalHash,
      path: object.path,
      declarations: object.declarations.map(declaration => ({
        id: declaration.id,
        kind: declaration.kind,
        source: declaration.source,
        type: declaration.type,
        status: declaration.status,
        constructionCount: declaration.constructionCount,
        formalHash: declaration.formalHash,
      })),
      members: object.members,
      references: object.references,
      imports: object.imports,
      exports: object.exports,
      assumptions: object.assumptions,
      normalizedContext: object.normalizedContext,
    })),
    relations,
    groups: Object.entries(MCS_GROUP_TITLES).map(([id, title]) => ({ id, title, objectIds: members[id] })),
  };
}
