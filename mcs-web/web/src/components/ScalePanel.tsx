import { useMemo, useState } from 'react';
import type { ScaleCatalogue, ScaleLevelId, ScalePlan } from '../scale-network';

/**
 * 「尺度对象」面板的正文（2026-10-17）。
 *
 * 只负责列出计划里的对象与触发动作；不读 URL、不写存储。面板外壳（拖动、关闭、
 * aria-label）由 `NetworkPage` 的 floating-panel 提供，这样它与其余五个面板共用同一套
 * 位置记忆与窄屏排布。
 */
export interface ScalePanelText {
  levels: string;
  levelLabels: Record<ScaleLevelId, string>;
  filterHint: string;
  search: string;
  topics: string;
  paths: string;
  units: string;
  molecules: string;
  ungrouped: string;
  add: string;
  remove: string;
  expand: string;
  collapse: string;
  autoMerge: string;
  autoMergeHint: string;
  showEdges: string;
  nodeScale: string;
  nodeScaleHint: string;
  nodeScaleAdd: string;
  note: string;
  empty: string;
  counts: string;
  nodeCount: string;
  unitCount: string;
  moleculeCount: string;
  atomCount: string;
  provisional: string;
  noPlan: string;
}

export interface ScalePanelProps {
  plan: ScalePlan | null;
  catalogue: ScaleCatalogue | null;
  enabled: ScaleLevelId[];
  addedScale: Set<string>;
  expanded: Set<string>;
  autoMerge: boolean;
  showEdges: boolean;
  error?: string | null;
  addedNodeCount: number;
  visibleNodeCount: number;
  text: ScalePanelText;
  onToggleLevel: (level: ScaleLevelId) => void;
  onToggleAutoMerge: (value: boolean) => void;
  onToggleEdges: (value: boolean) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onAddNodeScale: () => void;
}

const LEVELS: ScaleLevelId[] = ['molecule', 'node', 'unit', 'topic'];

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

function matches(query: string, ...values: string[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => value.toLowerCase().includes(needle));
}

export function ScalePanel({
  plan, catalogue, enabled, addedScale, expanded, autoMerge, showEdges, error, addedNodeCount, visibleNodeCount, text,
  onToggleLevel, onToggleAutoMerge, onToggleEdges, onAdd, onRemove, onExpand, onCollapse, onAddNodeScale,
}: ScalePanelProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    if (!plan || !catalogue) return [];
    const byId = new Map(plan.units.map((unit) => [unit.id, unit]));
    const used = new Set<string>();
    const result: Array<{ id: string; kind: 'topic' | 'path' | 'ungrouped'; title: string; units: string[] }> = [];
    for (const topic of plan.topics) {
      const units = topic.members.filter((id) => byId.has(id));
      for (const id of units) used.add(id);
      result.push({ id: topic.id, kind: 'topic', title: topic.title, units });
    }
    for (const path of plan.paths) {
      const units = path.unitIds.filter((id) => byId.has(id) && !used.has(id));
      if (units.length === 0) continue;
      for (const id of units) used.add(id);
      result.push({ id: path.id, kind: 'path', title: path.title, units });
    }
    const rest = plan.units.filter((unit) => !used.has(unit.id));
    if (rest.length > 0) result.push({ id: 'ungrouped', kind: 'ungrouped', title: text.ungrouped, units: rest.map((unit) => unit.id) });
    return result;
  }, [plan, catalogue, text.ungrouped]);

  const visibleUnits = (ids: string[]) => ids
    .map((id) => plan?.units.find((unit) => unit.id === id))
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit))
    .filter((unit) => matches(query, unit.title, unit.id, unit.sourceAggregate));

  const unitRows = (ids: string[]) => (
    <ul className="scale-row-list">
      {visibleUnits(ids).map((unit) => {
        const isAdded = addedScale.has(unit.id);
        const isExpanded = expanded.has(unit.id);
        return (
          <li key={unit.id} className="scale-row" data-scale-object={unit.id} data-scale="unit">
            <div className="scale-row-head">
              <span className="scale-row-title">{unit.title}</span>
              <span className="scale-row-count">{fill(text.counts, { count: unit.members.length, unit: text.nodeCount })}</span>
            </div>
            <div className="scale-row-meta">
              <code>{unit.id}</code>
              {unit.provisional && <span className="scale-row-badge">{text.provisional}</span>}
            </div>
            <div className="scale-row-actions">
              {!isAdded && <button type="button" className="button small" data-action="add-scale" onClick={() => onAdd(unit.id)}>{text.add}</button>}
              {isAdded && <button type="button" className="button small" data-action="remove-scale" onClick={() => onRemove(unit.id)}>{text.remove}</button>}
              {!isExpanded && <button type="button" className="button small primary" data-action="expand-scale" onClick={() => onExpand(unit.id)}>{text.expand}</button>}
              {isExpanded && <button type="button" className="button small" data-action="collapse-scale" onClick={() => onCollapse(unit.id)}>{text.collapse}</button>}
            </div>
          </li>
        );
      })}
    </ul>
  );

  if (!plan) {
    return (
      <div className="scale-panel" data-scale-plan="missing">
        <p className="muted">{error || text.noPlan}</p>
      </div>
    );
  }

  const visibleTopics = plan.topics.filter((topic) => matches(query, topic.title, topic.id));
  const visibleMolecules = plan.molecules.filter((molecule) => matches(query, molecule.title, molecule.id, molecule.node));

  return (
    <div className="scale-panel" data-scale-plan={plan.status}>
      <div className="scale-panel-controls">
        <fieldset className="scale-levels">
          <legend>{text.levels}</legend>
          {LEVELS.map((level) => (
            <label key={level} className="scale-level-option">
              <input
                type="checkbox"
                checked={enabled.includes(level)}
                onChange={() => onToggleLevel(level)}
                data-scale-level={level}
              />
              <span>{text.levelLabels[level]}</span>
            </label>
          ))}
        </fieldset>
        <label className="scale-check">
          <input type="checkbox" checked={autoMerge} onChange={(event) => onToggleAutoMerge(event.target.checked)} data-scale-auto-merge />
          <span>{text.autoMerge}</span>
        </label>
        <p className="muted scale-hint">{text.autoMergeHint}</p>
        <label className="scale-check">
          <input type="checkbox" checked={showEdges} onChange={(event) => onToggleEdges(event.target.checked)} data-scale-edges />
          <span>{text.showEdges}</span>
        </label>
        <input
          className="scale-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={text.search}
          aria-label={text.search}
        />
        <p className="muted scale-hint">{text.filterHint}</p>
        <p className="scale-summary">
          {fill(text.counts, { count: addedNodeCount, unit: text.nodeCount })}
          {' · '}
          {fill(text.counts, { count: plan.counts.units, unit: text.units })}
          {' · '}
          {fill(text.counts, { count: plan.counts.topics, unit: text.topics })}
          {' · '}
          {fill(text.counts, { count: plan.counts.molecules, unit: text.molecules })}
        </p>
      </div>

      <details className="scale-section" data-scale-section="node" open>
        <summary>{text.nodeScale} <span className="muted">{addedNodeCount}</span></summary>
        <p className="muted scale-hint">{fill(text.nodeScaleHint, { added: addedNodeCount, visible: visibleNodeCount })}</p>
        <div className="scale-row-actions">
          <button type="button" className="button small primary" data-action="add-node-scale" onClick={onAddNodeScale}>{text.nodeScaleAdd}</button>
        </div>
      </details>

      <details className="scale-section" open>
        <summary>{text.topics} <span className="muted">{plan.topics.length}</span></summary>
        {visibleTopics.length === 0 ? <p className="muted">{text.empty}</p> : (
          <ul className="scale-row-list">
            {visibleTopics.map((topic) => {
              const isAdded = addedScale.has(topic.id);
              const isExpanded = expanded.has(topic.id);
              return (
                <li key={topic.id} className="scale-row" data-scale-object={topic.id} data-scale="topic">
                  <div className="scale-row-head">
                    <span className="scale-row-title">{topic.title}</span>
                    <span className="scale-row-count">{fill(text.counts, { count: topic.members.length, unit: text.unitCount })}</span>
                  </div>
                  <div className="scale-row-meta">
                    <code>{topic.id}</code>
                    {topic.provisional && <span className="scale-row-badge">{text.provisional}</span>}
                  </div>
                  <div className="scale-row-actions">
                    {!isAdded && <button type="button" className="button small" data-action="add-scale" onClick={() => onAdd(topic.id)}>{text.add}</button>}
                    {isAdded && <button type="button" className="button small" data-action="remove-scale" onClick={() => onRemove(topic.id)}>{text.remove}</button>}
                    {!isExpanded && <button type="button" className="button small primary" data-action="expand-scale" onClick={() => onExpand(topic.id)}>{text.expand}</button>}
                    {isExpanded && <button type="button" className="button small" data-action="collapse-scale" onClick={() => onCollapse(topic.id)}>{text.collapse}</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </details>

      <details className="scale-section" open>
        <summary>{text.units} <span className="muted">{plan.units.length}</span></summary>
        {groups.map((group) => {
          const rows = visibleUnits(group.units);
          if (rows.length === 0) return null;
          return (
            <section key={group.id} className="scale-unit-group" data-scale-group={group.kind}>
              <h4>{group.title}</h4>
              {unitRows(group.units)}
            </section>
          );
        })}
      </details>

      <details className="scale-section" open>
        <summary>{text.molecules} <span className="muted">{plan.molecules.length}</span></summary>
        {visibleMolecules.length === 0 ? <p className="muted">{text.empty}</p> : (
          <ul className="scale-row-list">
            {visibleMolecules.map((molecule) => {
              const isAdded = addedScale.has(molecule.id);
              return (
                <li key={molecule.id} className="scale-row" data-scale-object={molecule.id} data-scale="molecule">
                  <div className="scale-row-head">
                    <span className="scale-row-title">{molecule.title}</span>
                    <span className="scale-row-count">{fill(text.atomCount, { count: molecule.atoms.length })}</span>
                  </div>
                  <div className="scale-row-meta"><code>{molecule.node}</code></div>
                  <div className="scale-row-actions">
                    {!isAdded && <button type="button" className="button small" data-action="add-scale" onClick={() => onAdd(molecule.id)}>{text.add}</button>}
                    {isAdded && <button type="button" className="button small" data-action="remove-scale" onClick={() => onRemove(molecule.id)}>{text.remove}</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </details>

      <p className="muted scale-hint">{text.note}</p>
      {plan.notes.map((note) => <p key={note} className="muted scale-hint">{note}</p>)}
    </div>
  );
}
