import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { useProfileContext } from '../state';
import { StatusBadge } from '../components/StatusBadge';
import type { NodeSummary, TutorStatus } from '../types';
import { DEEPTUTOR_INTRO } from '../deeptutor-intro';

interface TurnView {
  id: string;
  requestId: string;
  kind: string;
  status: string;
  answer: string;
  error: { code: string; message: string } | null;
  liveVerified: boolean;
}

/** 引导关闭状态存在本机（界面偏好，不是学习记录）。 */
const GUIDE_KEY = 'mcs-tutor-guide-v1';

/**
 * 时间戳显示：与站内其它页面同一口径（`toLocaleString('zh-CN')`）。
 * 上游版本的「读取于 / 检出文件时间」都用它——这两个时间必须能看懂，否则版本号无从判断新旧。
 */
function formatStamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN');
}

/**
 * 三步导览的文案。
 *
 * 顺序按「先看它现在通不通，再选对象开会话，最后提问看评价」——
 * 与页面从上到下的布局一致，因此引导箭头指的方向和视线方向相同。
 */
const GUIDE_STEPS = [
  { index: 1, title: '看状态', detail: '两条接入路径各自通不通，按证据显示，不替你判断可用性。' },
  { index: 2, title: '选对象，建会话', detail: '挑一个正在学的数学对象；上下文按那一版本体注入。' },
  { index: 3, title: '提问与评价', detail: '回合会落成本机事件；模型反馈不会自动确认掌握。' },
];

export function TutorPage() {
  const [params] = useSearchParams();
  const { profileId } = useProfileContext();
  const status = useApi<TutorStatus>('/tutor/status');
  const nodes = useApi<{ nodes: NodeSummary[] }>('/ontology/nodes?limit=500');
  const [nodeId, setNodeId] = useState(params.get('node') ?? 'limit:limit-ed');
  const [mode, setMode] = useState('explain');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<TurnView[]>([]);
  const [input, setInput] = useState('');
  const [kind, setKind] = useState<'question' | 'answer'>('question');
  const [message, setMessage] = useState('');

  /**
   * 三步引导的当前步（纯界面状态，**不写学习者档案 E**）。
   *
   * 依据是三件可核对的事，而不是「用户看没看过」：
   * 有会话 → 第一步过了；有回合 → 第二步过了；其余停在当前这一步。
   * 关掉引导记在 localStorage（与侧栏折叠同类，属本机偏好）。
   */
  const [guideOff, setGuideOff] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    try { return localStorage.getItem(GUIDE_KEY) === 'off'; } catch { return false; }
  });
  const guideStep = turns.length > 0 ? 3 : sessionId ? 2 : 1;
  const dismissGuide = () => {
    setGuideOff(true);
    try { localStorage.setItem(GUIDE_KEY, 'off'); } catch { /* 隐私模式：忽略 */ }
  };

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let failures = 0;
    const terminal = (status: string) => status === 'done' || status === 'error' || status === 'cancelled';
    const timer = setInterval(async () => {
      try {
        const session = await api<{ turns: Array<{ id: string; requestId: string; kind: string; status: string; answer: string; error: { code: string; message: string } | null; liveVerified: boolean }> }>(`/tutor/sessions/${sessionId}`);
        if (!active) return;
        failures = 0;
        setTurns(session.turns.slice().reverse());
        /*
         * 全部回合都到终态就停止轮询（2026-10 修）。
         *
         * 从前只要 `sessionId` 在就每 1.2 秒打一次服务，回答早已拿到也照打不误——
         * 页面开着就一直发请求。这里明确：没有在跑的回合就不再问。
         */
        if (session.turns.length > 0 && session.turns.every((turn) => terminal(turn.status))) clearInterval(timer);
      } catch (reason) {
        if (!active) return;
        /*
         * 失败不再静默（从前是 `catch { /* keep polling *\/ }`）：记下连续失败次数，
         * 连续三次就停下并把原因说出来——一直重试一个连不上的服务只是把问题藏起来。
         */
        failures += 1;
        if (failures >= 3) {
          clearInterval(timer);
          setMessage(`轮询辅导回合失败（已停止重试）：${formatError(reason)}`);
        }
      }
    }, 1200);
    return () => { active = false; clearInterval(timer); };
  }, [sessionId]);

  async function createSession() {
    if (!profileId) { setMessage('先在顶部选择或新建档案。'); return; }
    try {
      const session = await api<{ id: string }>('/tutor/sessions', { method: 'POST', body: { profileId, nodeId, mode } });
      setSessionId(session.id);
      setTurns([]);
      setMessage('辅导会话已创建；上下文来自固定本体版本与最小个人状态。');
    } catch (error) { setMessage(formatError(error)); }
  }

  async function send() {
    if (!sessionId || !input.trim()) return;
    try {
      let answerEventId: string | undefined;
      if (kind === 'answer') {
        const event = await api<{ eventId: string }>(`/profiles/${profileId}/events`, { method: 'POST', body: { event: { eventId: `ui-answer-${Date.now()}`, kind: 'answer', nodeId, payload: { text: input } } } });
        answerEventId = event.eventId;
      }
      await api(`/tutor/sessions/${sessionId}/turns`, { method: 'POST', body: { kind, content: input, requestId: `ui-turn-${Date.now()}`, answerEventId } });
      setInput('');
      setMessage(kind === 'answer' ? '作答已记录为 E 事件，正在请求评价；模型反馈不会自动确认掌握。' : '问题已提交，等待模型回复。');
    } catch (error) { setMessage(formatError(error)); }
  }

  const available = status.data?.available;

  return (
    <div className="page">
      <div className="section-heading">
        <h1>辅导入口 <span className="tutor-brand">DeepTutor</span></h1>
        <p>DeepTutor 是可选入口。它读取同一版本体与同一规划器；模型反馈只能追加 E 记录，不能修改 M，也不能自动确认全面掌握。</p>
      </div>

      {/*
        引导条：把这一页的三件事按顺序点出来，并高亮「现在这一步」。
        它是视角引导，不是权限控制——被淡化的区块照样可以点。
      */}
      {!guideOff && (
        <nav className="tutor-guide" aria-label="辅导页导览" data-guide-step={guideStep}>
          <ol>
            {GUIDE_STEPS.map((step) => (
              <li
                key={step.index}
                className={step.index === guideStep ? 'is-current' : step.index < guideStep ? 'is-done' : 'is-todo'}
                aria-current={step.index === guideStep ? 'step' : undefined}
              >
                <span className="tutor-guide-index">{step.index < guideStep ? '✓' : step.index}</span>
                <span className="tutor-guide-text">
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className="link-button tutor-guide-dismiss" onClick={dismissGuide}>跳过引导</button>
        </nav>
      )}

      {/* DeepTutor 介绍：是什么、怎么接、边界在哪。 */}
      <section className="card tutor-intro">
        <div className="tutor-intro-head">
          <h2>关于 DeepTutor</h2>
          <span className="tutor-intro-tag">已接入 · 本机可选入口</span>
        </div>
        <p>{DEEPTUTOR_INTRO.what}</p>
        <ul className="tutor-intro-list">
          {DEEPTUTOR_INTRO.how.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
        <div className="tutor-intro-paths">
          {DEEPTUTOR_INTRO.paths.map((path) => (
            <div key={path.title}>
              <strong>{path.title}</strong>
              <span>{path.detail}</span>
            </div>
          ))}
        </div>
        {/*
          外部链接与核对依据放在一起：链接写清指向什么，版本写清是从哪儿读到的。
          外链一律 target="_blank" + rel="noreferrer"（不把本站的 referrer 带出去）。
        */}
        <div className="tutor-intro-external">
          <div className="tutor-intro-links">
            {DEEPTUTOR_INTRO.links.map((link) => (
              <a key={link.href} className="tutor-intro-link" href={link.href} target="_blank" rel="noreferrer">
                <span className="tutor-intro-link-label">{link.label} ↗</span>
                <span className="tutor-intro-link-detail">{link.detail}</span>
              </a>
            ))}
          </div>
          <p className="tutor-intro-verified">
            {/*
              版本号改成**运行期读到的**（TODO A4-26）：服务端只读本机检出的
              `deeptutor/__version__.py`，把版本、来源路径与读取时间一起下发。
              读不到时不再显示一个手抄的常数，而是明说「未读到本机检出」并给出记录值——
              两者在界面上必须能分辨，否则读者无法判断这个版本号是什么时候核对的。
            */}
            {status.data?.upstream?.available ? (
              <>
                版本（运行期读自本机检出）：
                <strong data-version-source="runtime">{status.data.upstream.label ?? `v${status.data.upstream.version}`}</strong>
                <span className="muted"> · </span>许可：<strong>{DEEPTUTOR_INTRO.recorded.license}</strong>
                <span className="muted"> · </span>来源：<code>{status.data.upstream.source}</code>
                {status.data.upstream.fileModifiedAt && (
                  <>
                    <span className="muted"> · </span>检出文件时间：{formatStamp(status.data.upstream.fileModifiedAt)}
                  </>
                )}
                <span className="muted"> · </span>读取于 {formatStamp(status.data.upstream.readAt)}
              </>
            ) : (
              <>
                版本：<strong data-version-source="recorded">{DEEPTUTOR_INTRO.recorded.version}</strong>
                <span className="muted">（手工核对，可能滞后——这次没有读到本机检出{status.data?.upstream?.note ? `：${status.data.upstream.note}` : ''}）</span>
                <span className="muted"> · </span>许可：<strong>{DEEPTUTOR_INTRO.recorded.license}</strong>
                <span className="muted"> · </span>依据：{DEEPTUTOR_INTRO.recorded.basis}
              </>
            )}
          </p>
        </div>
        <p className="tutor-intro-boundary">{DEEPTUTOR_INTRO.boundary}</p>
      </section>

      <section
        className={`card tutor-status${!guideOff && guideStep === 1 ? ' is-guiding' : ''}`}
        data-guide-step={guideOff ? undefined : guideStep}
      >
        <h2>接入状态</h2>
        {status.loading && <p>检查 DeepTutor 状态…</p>}
        {status.data && (
          <>
            <div className="plan-status">
              <StatusBadge status={available ? (status.data.liveVerified ? 'passed' : 'not_run') : 'unsupported'} label={available ? (status.data.liveVerified ? '已连通并完成真实回环' : '后端可达，本进程还没跑完过真实回环') : '未连接'} />
              <span>{status.data.adapter ?? 'none'}</span>
            </div>
            <p>{status.data.note}</p>
            {status.data.frontend_url && <p className="muted">DeepTutor 前端：{status.data.frontend_url} · 后端：{status.data.backend_url}</p>}
            {/*
              两套集成必须同时披露：本站内适配器（上下文注入 + 事件落 E）与桥接（3783，
              带 MCP 工具与事件登记，是经过核查的那一套）。不写清楚，使用者会以为只有一套、
              甚至把两边的结论混着用。
            */}
            {status.data.bridge && (
              <>
                <div className="plan-status">
                  <StatusBadge status={status.data.bridge.reachable ? 'passed' : 'not_run'} label={status.data.bridge.reachable ? '桥接在运行' : '桥接未运行'} />
                  <span>{status.data.bridge.url}</span>
                </div>
                <p className="muted">{status.data.bridge.note}</p>
              </>
            )}
          </>
        )}
        {!available && !status.loading && (
          <div className="notice">
            启动 DeepTutor 后重试。学习、图谱、路线与研究工作台不依赖它；断开期间页面不会伪造模型回复。
          </div>
        )}
      </section>

      <section className={`card${!guideOff && guideStep === 2 ? ' is-guiding' : ''}`}>
        <h2>创建会话</h2>
        <div className="inline-form">
          <select value={nodeId} onChange={(event) => setNodeId(event.target.value)}>
            {(nodes.data?.nodes ?? []).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
          </select>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="explain">讲解</option>
            <option value="hint">分步提示</option>
            <option value="practice">针对性练习</option>
          </select>
          <button className="button primary" disabled={!profileId} onClick={createSession}>创建会话</button>
        </div>
        {message && <p className="notice">{message}</p>}
      </section>

      {sessionId && (
        <section className={`card tutor-session${!guideOff && guideStep === 3 ? ' is-guiding' : ''}`}>
          <h2>辅导回合</h2>
          <div className="turn-list">
            {turns.length === 0 && <p className="muted">还没有回合。</p>}
            {turns.map((turn) => (
              <article key={turn.id} className={`turn ${turn.kind}`}>
                <header><StatusBadge status={turn.status === 'done' ? 'passed' : turn.status === 'error' ? 'failed' : 'not_run'} label={turn.kind === 'answer' ? '作答与评价' : '提问'} /><code>{turn.requestId}</code></header>
                {turn.error && <p className="error">{turn.error.code}：{turn.error.message}</p>}
                {turn.answer && <p className="turn-answer">{turn.answer}</p>}
                {!turn.answer && !turn.error && <p>等待模型回复…</p>}
              </article>
            ))}
          </div>
          <div className="turn-composer">
            <div className="segmented">
              <button className={kind === 'question' ? 'active' : ''} onClick={() => setKind('question')}>提问</button>
              <button className={kind === 'answer' ? 'active' : ''} onClick={() => setKind('answer')}>作答求评价</button>
            </div>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={5} placeholder={kind === 'answer' ? '写下你的完整思路；这会先记录为 E 中的真实作答事件。' : '问什么？'} />
            <button className="button primary" disabled={!available || !input.trim()} onClick={send}>发送</button>
          </div>
        </section>
      )}
    </div>
  );
}
