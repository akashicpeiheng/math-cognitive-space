import { useCallback, useEffect, useRef, useState } from 'react';
import { api, formatError, useApi, useLocaleKey } from './api';
import { useProfileContext } from './state';
import { deriveLearning, type GraphAction, type GraphRelation, type LearningProgress } from './learning';
import type { DirectionsResponse, EventView, LearningDirectionView, NodeSummary, ProfileDetailResponse } from './types';
import type { LearningPlanView } from '../../shared/learning-plan.mjs';

export interface OntologyGraph {
  version?: string;
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
  /** 学习者声明的学习方向（E 层，按声明时间升序）；没有选档案时是空数组。 */
  directions: LearningDirectionView[];
  learningPlan?: LearningPlanView | null;
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
  const [directions, setDirections] = useState<LearningDirectionView[]>([]);
  const [learningPlan, setLearningPlan] = useState<LearningPlanView | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loadGeneration = useRef(0);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    if (!profileId) { setTheta(null); setEvents([]); setDirections([]); setLearningPlan(null); setLoadedFor(null); setLoading(false); setError(null); return; }
    setLoading(true);
    try {
      const [detail, listed, aimed, planned] = await Promise.all([
        api<ProfileDetailResponse>(`/profiles/${profileId}`),
        api<{ events: EventView[] }>(`/profiles/${profileId}/events?limit=2000`),
        /*
         * 方向与档案详情、事件**一起**取：三者是同一份 E 层状态的不同切面，
         * 分开取会让「下一步」在某一帧里按旧方向算出来——
         * 那正是「方向不清晰」最容易变成「方向来回跳」的地方。
         * 方向接口失败时整块按错误处理（下面的 catch），不静默当成「没有方向」：
         * 「你以为没声明过方向」比「明确报错」更误导。
         */
        api<DirectionsResponse>(`/profiles/${profileId}/directions`),
        api<{ plan: LearningPlanView }>(`/profiles/${profileId}/learning-plan`),
      ]);
      if (generation !== loadGeneration.current) return;
      setTheta(detail.theta);
      setEvents(listed.events);
      setDirections(aimed.directions);
      setLearningPlan(planned.plan);
      setLoadedFor(profileId);
      setError(null);
    } catch (reason) {
      if (generation === loadGeneration.current) setError(formatError(reason));
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [profileId, localeKey]);

  useEffect(() => { void load(); }, [load]);

  // useApi 的 reload 每次渲染都会是新函数；用 ref 固定引用，避免 reload 依赖抖动。
  const graphReload = useRef(graph.reload);
  graphReload.current = graph.reload;

  const reload = useCallback(async () => {
    await Promise.all([load(), Promise.resolve(graphReload.current())]);
  }, [load]);

  const matchesProfile = loadedFor === profileId;
  const visibleTheta = matchesProfile ? theta : null;
  const visibleEvents = matchesProfile ? events : [];
  const progress = graph.data
    ? deriveLearning({ nodes: graph.data.nodes, actions: graph.data.actions, relations: graph.data.relations, theta: visibleTheta, events: visibleEvents })
    : null;

  return {
    graph: graph.data,
    theta: visibleTheta,
    events: visibleEvents,
    progress,
    directions: matchesProfile ? directions : [],
    learningPlan: matchesProfile ? learningPlan : null,
    loading: loading || graph.loading || Boolean(profileId && !matchesProfile && !error),
    error: error ?? (graph.error ? formatError(graph.error) : null),
    reload,
  };
}
