export const GROUP_OBJECT_IDS: readonly string[];
export const PRESETS: Readonly<Record<'topology' | 'manifolds' | 'operators', readonly string[]>>;
export const MCS_GROUP_TITLES: Readonly<Record<
  'all' | 'group' | 'topology-dg' | keyof typeof PRESETS,
  Readonly<{ zh: string; en: string }>
>>;
