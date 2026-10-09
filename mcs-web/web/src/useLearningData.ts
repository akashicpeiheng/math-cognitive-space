import { useCallback, useEffect, useRef, useState } from 'react';
import { api, formatError, useApi, useLocaleKey } from './api';
import { useProfileContext } from './state';
import { deriveLearning, type GraphAction, type GraphRelation, type LearningProgress } from './learning';
import type { EventView, NodeSummary, ProfileDetailResponse } from './types';

export interface OntologyGraph {
  nodes: NodeSummary[];
  relations: GraphRelation[];
  actions: GraphAction[];
  /** 话题聚合：首页的「继续学习」网络按它把邻居归到四个方向。 */
  aggregates?: Array<{ id: string; kind: string; title: string; blocks: string[][] }>;
}

export interface LearningData {
  graph: OntologyGraph | null;
  theta: ProfileDetailResponse['theta'] | null;
  events: EventView[];
  progress: LearningProgress | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * 首页与复习页共用的学习数据入口。
 *
 * 数据全部来自只读接口：本体图（M 的投影）、θ 与事件（E）。派生只在前端内存里发生，
 * 不产生任何写入；写入只由 LearnerActions / ReviewQueue 显式发起。
 */
export function useLearningData(): LearningData {
  const { profileId } = useProfileContext();
  const graph = useApi<OntologyGraph>('/ontology/graph');
  /*
   * 语种是这条 effect 的依赖（2026-10 双语）。
   *
   * `graph` 走 `useApi`，它已把语种内置进依赖；但档案详情与事件是本模块直接 `api()` 拉的，
   * 少这一条就会出现「切到英文后这一块还留着上一次的中文响应」，而且不报错。
   */
  const localeKey = useLocaleKey();
  const [theta, setTheta] = useState<ProfileDetailResponse['theta'] | null>(null);
  const [events, setEvents] = useState<EventView[]>([]);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profileId) { setTheta(null); setEvents([]); setLoading(false); setError(null); return; }
    setLoading(true);
    try {
      const [detail, listed] = await Promise.all([
        api<ProfileDetailResponse>(`/profiles/${profileId}`),
        api<{ events: EventView[] }>(`/profiles/${profileId}/events?limit=2000`),
      ]);
      setTheta(detail.theta);
      setEvents(listed.events);
      setError(null);
    } catch (reason) {
      setError(formatError(reason));
    } finally {
      setLoading(false);
    }
  }, [profileId, localeKey]);

  useEffect(() => { void load(); }, [load]);

  // useApi 的 reload 每次渲染都会是新函数；用 ref 固定引用，避免 reload 依赖抖动。
  const graphReload = useRef(graph.reload);
  graphReload.current = graph.reload;

  const reload = useCallback(async () => {
    await Promise.all([load(), Promise.resolve(graphReload.current())]);
  }, [load]);

  const progress = graph.data
    ? deriveLearning({ nodes: graph.data.nodes, actions: graph.data.actions, relations: graph.data.relations, theta, events })
    : null;

  return {
    graph: graph.data,
    theta,
    events,
    progress,
    loading: loading || graph.loading,
    error: error ?? (graph.error ? formatError(graph.error) : null),
    reload,
  };
}
