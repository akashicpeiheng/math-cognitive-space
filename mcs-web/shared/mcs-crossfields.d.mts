export interface McsCrossField {
  id: string;
  /** Editorial navigation pairing, not a formal M membership/relation. */
  domains: readonly [string, string];
  title: Readonly<{ zh: string; en: string }>;
  description: Readonly<{ zh: string; en: string }>;
  /** Related existing atlas entrances, not an assertion of collected coverage. */
  targetIds: readonly string[];
  /** Public primary sources supporting the named crossing topic. */
  sources: readonly string[];
}
export const MCS_CROSS_FIELDS: readonly McsCrossField[];
