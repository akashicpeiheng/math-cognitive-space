import { useI18n } from '../i18n';
import { scalingSummary } from '../connection-display';
import type { ScalingExplanation } from '../types';

export function ScalingExplanationView({ relation, compact = false }: { relation: { kind: string; scaling?: unknown; direction?: unknown; scalingExplanation?: ScalingExplanation | null }; compact?: boolean }) {
  const { locale } = useI18n();
  const summary = scalingSummary(relation, locale);
  if (!summary) return null;
  const changes = (relation.scaling ?? relation.direction) ? relation.scalingExplanation?.changes ?? [] : [];
  return <div className="scaling-explanation">
    <p>{summary}</p>
    {!compact && changes.length > 0 && <>
      <p className="muted">{locale === 'en' ? 'Expansion reading: special → general' : '沿放方向读：特殊端 → 一般端'}</p>
      <table><thead><tr><th>{locale === 'en' ? 'Condition' : '条件'}</th><th>{locale === 'en' ? 'Special' : '特殊端'}</th><th>{locale === 'en' ? 'General' : '一般端'}</th></tr></thead>
        <tbody>{changes.map((change, index) => <tr key={index}><th scope="row">{change.condition}</th><td>{change.special}</td><td>{change.general}</td></tr>)}</tbody>
      </table>
    </>}
  </div>;
}
