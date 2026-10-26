import type { ObjectScale } from '../../shared/content-documents.mjs';

export const MCS_SCALES: Record<ObjectScale, { zh: string; en: string }> = {
  atom: { zh: '原子', en: 'Atom' }, molecule: { zh: '分子', en: 'Molecule' },
  unit: { zh: '单元', en: 'Unit' }, topic: { zh: '话题', en: 'Topic' },
  subdiscipline: { zh: '子学科', en: 'Subdiscipline' },
};
export const MCS_RELATIONS: Record<string, { zh: string; en: string }> = {
  deduction: { zh: '推导', en: 'Deduction' }, scaling: { zh: '放缩', en: 'Scaling' },
  application: { zh: '应用', en: 'Application' }, duality: { zh: '对偶', en: 'Duality' },
};
