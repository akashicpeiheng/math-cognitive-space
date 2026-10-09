import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, formatError, useApi, useLocaleKey } from '../api';
import { useI18n } from '../i18n';
import { useProfileContext } from '../state';
import { StatusBadge } from '../components/StatusBadge';
import type { NodeSummary, TutorStatus } from '../types';
import { DEEPTUTOR_INTRO_BY_LOCALE } from '../deeptutor-intro';

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

/** 页内提示语用**键**记住，而不是记住渲染好的字符串：切语种后提示也跟着换。 */
type Notice =
  | { key: 'profileMissing' }
  | { key: 'sessionCreated' }
  | { key: 'answerRecorded' }
  | { key: 'questionSubmitted' }
  | { key: 'pollFailed'; detail: string }
  | { key: 'failed'; detail: string };

/**
 * 本页文案（中英成对）。
 *
 * 三步导览的顺序按「先看它现在通不通，再选对象开会话，最后提问看评价」——
 * 与页面从上到下的布局一致，因此引导箭头指的方向和视线方向相同。
 *
 * 通用壳层文案（导航、按钮）在 `messages.ts`；这里放的是**本页自己的**长文案，
 * 按手册 §1 跟页面走，避免把通用表撑成垃圾场。
 */
/** 页内提示语（键 → 文案）。带参数的两条是函数，其余是整句。 */
interface TutorNoticeText {
  profileMissing: string;
  sessionCreated: string;
  answerRecorded: string;
  questionSubmitted: string;
  pollFailed: (detail: string) => string;
  failed: (detail: string) => string;
}

interface TutorText {
  guideAria: string;
  guideDismiss: string;
  guideSteps: Array<{ index: number; title: string; detail: string }>;
  heading: string;
  lead: string;
  aboutTitle: string;
  aboutTag: string;
  versionRuntime: string;
  license: string;
  source: string;
  fileModified: string;
  readAt: string;
  versionRecorded: string;
  recordedSuffix: (note: string) => string;
  basis: string;
  statusTitle: string;
  checking: string;
  badgeLive: string;
  badgeReachable: string;
  badgeDisconnected: string;
  frontend: string;
  backend: string;
  bridgeRunning: string;
  bridgeStopped: string;
  restart: string;
  sessionTitle: string;
  modes: { explain: string; hint: string; practice: string };
  create: string;
  turnsTitle: string;
  noTurns: string;
  kindAnswer: string;
  kindQuestion: string;
  waiting: string;
  askTab: string;
  answerTab: string;
  placeholderAnswer: string;
  placeholderQuestion: string;
  send: string;
  notices: TutorNoticeText;
}

const TUTOR_TEXT: { zh: TutorText; en: TutorText } = {
  zh: {
    guideAria: '辅导页导览',
    guideDismiss: '跳过引导',
    guideSteps: [
      { index: 1, title: '看状态', detail: '两条接入路径各自通不通，按证据显示，不替你判断可用性。' },
      { index: 2, title: '选对象，建会话', detail: '挑一个正在学的数学对象；上下文按那一版本体注入。' },
      { index: 3, title: '提问与评价', detail: '回合会落成本机事件；模型反馈不会自动确认掌握。' },
    ],
    heading: '辅导入口',
    lead: 'DeepTutor 是可选入口。它读取同一版本体与同一规划器；模型反馈只能追加 E 记录，不能修改 M，也不能自动确认全面掌握。',
    aboutTitle: '关于 DeepTutor',
    aboutTag: '已接入 · 本机可选入口',
    versionRuntime: '版本（运行期读自本机检出）：',
    license: '许可：',
    source: '来源：',
    fileModified: '检出文件时间：',
    readAt: '读取于',
    versionRecorded: '版本：',
    recordedSuffix: (note: string) => `（手工核对，可能滞后——这次没有读到本机检出${note ? `：${note}` : ''}）`,
    basis: '依据：',
    statusTitle: '接入状态',
    checking: '检查 DeepTutor 状态…',
    badgeLive: '已连通并完成真实回环',
    badgeReachable: '后端可达，本进程还没跑完过真实回环',
    badgeDisconnected: '未连接',
    frontend: 'DeepTutor 前端：',
    backend: '后端：',
    bridgeRunning: '桥接在运行',
    bridgeStopped: '桥接未运行',
    restart: '启动 DeepTutor 后重试。学习、图谱、路线与研究工作台不依赖它；断开期间页面不会伪造模型回复。',
    sessionTitle: '创建会话',
    modes: { explain: '讲解', hint: '分步提示', practice: '针对性练习' },
    create: '创建会话',
    turnsTitle: '辅导回合',
    noTurns: '还没有回合。',
    kindAnswer: '作答与评价',
    kindQuestion: '提问',
    waiting: '等待模型回复…',
    askTab: '提问',
    answerTab: '作答求评价',
    placeholderAnswer: '写下你的完整思路；这会先记录为 E 中的真实作答事件。',
    placeholderQuestion: '问什么？',
    send: '发送',
    notices: {
      profileMissing: '先在顶部选择或新建档案。',
      sessionCreated: '辅导会话已创建；上下文来自固定本体版本与最小个人状态。',
      answerRecorded: '作答已记录为 E 事件，正在请求评价；模型反馈不会自动确认掌握。',
      questionSubmitted: '问题已提交，等待模型回复。',
      pollFailed: (detail: string) => `轮询辅导回合失败（已停止重试）：${detail}`,
      failed: (detail: string) => detail,
    },
  },
  en: {
    guideAria: 'Tutoring page tour',
    guideDismiss: 'Skip the tour',
    guideSteps: [
      { index: 1, title: 'Check the status', detail: 'Whether each of the two integration paths is up, shown as evidence; the page does not decide usability for you.' },
      { index: 2, title: 'Pick an object, open a session', detail: 'Choose a mathematical object you are working on; the context is injected from that version of the ontology.' },
      { index: 3, title: 'Ask and evaluate', detail: 'Turns are recorded as local events; model feedback never confirms mastery automatically.' },
    ],
    heading: 'Tutoring entry',
    lead: 'DeepTutor is an optional entry. It reads the same ontology version and the same planner; model feedback can only append records to E, cannot change M, and never confirms full mastery automatically.',
    aboutTitle: 'About DeepTutor',
    aboutTag: 'Connected · optional local entry',
    versionRuntime: 'Version (read at runtime from the local checkout): ',
    license: 'Licence: ',
    source: 'Source: ',
    fileModified: 'checkout file time: ',
    readAt: 'read at',
    versionRecorded: 'Version: ',
    recordedSuffix: (note: string) => `(checked by hand, may be out of date — the local checkout could not be read this time${note ? `: ${note}` : ''})`,
    basis: 'Basis: ',
    statusTitle: 'Integration status',
    checking: 'Checking DeepTutor status…',
    badgeLive: 'Connected, with one real round trip completed',
    badgeReachable: 'Backend reachable, no real round trip completed by this process yet',
    badgeDisconnected: 'Not connected',
    frontend: 'DeepTutor frontend: ',
    backend: ' backend: ',
    bridgeRunning: 'Bridge is running',
    bridgeStopped: 'Bridge is not running',
    restart: 'Start DeepTutor and try again. Study, the network, routes and the research workbench do not depend on it; while it is disconnected the page does not fabricate model replies.',
    sessionTitle: 'Create a session',
    modes: { explain: 'Explanation', hint: 'Step-by-step hints', practice: 'Targeted practice' },
    create: 'Create session',
    turnsTitle: 'Tutoring turns',
    noTurns: 'No turns yet.',
    kindAnswer: 'Answer and evaluation',
    kindQuestion: 'Question',
    waiting: 'Waiting for the model reply…',
    askTab: 'Ask',
    answerTab: 'Answer for evaluation',
    placeholderAnswer: 'Write out your full reasoning; it is first recorded as a real answer event in E.',
    placeholderQuestion: 'What do you want to ask?',
    send: 'Send',
    notices: {
      profileMissing: 'Choose or create a profile at the top first.',
      sessionCreated: 'Tutoring session created; the context comes from a fixed ontology version and minimal personal state.',
      answerRecorded: 'The answer was recorded as an E event and an evaluation was requested; model feedback never confirms mastery automatically.',
      questionSubmitted: 'Question submitted; waiting for the model reply.',
      pollFailed: (detail: string) => `Polling tutoring turns failed (retries stopped): ${detail}`,
      failed: (detail: string) => detail,
    },
  },
};

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
  const [notice, setNotice] = useState<Notice | null>(null);
  /*
   * 语种：`pick` 取本页文案，`fmtDate` 按语种格式化时间（**不再**写死 `zh-CN`），
   * `isPending` 用来标注「这一段还是后端的中文」。
   */
  const { pick, fmtDate, isPending, t } = useI18n();
  const text = pick(TUTOR_TEXT);
  const intro = pick(DEEPTUTOR_INTRO_BY_LOCALE);
  /** 直接调 `api()` 的 effect 依赖它：切语种后重新取数（见 api.ts 的同名说明）。 */
  const localeKey = useLocaleKey();
  /** 后端下发的说明文字：英文语境下仍是中文，按手册标注「尚未翻译」。 */
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );

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
          setNotice({ key: 'pollFailed', detail: formatError(reason) });
        }
      }
    }, 1200);
    return () => { active = false; clearInterval(timer); };
    /* localeKey 在依赖里：换语种后这一路也要跟着走一遍（响应内容与提示语都按语种）。 */
  }, [sessionId, localeKey]);

  async function createSession() {
    if (!profileId) { setNotice({ key: 'profileMissing' }); return; }
    try {
      const session = await api<{ id: string }>('/tutor/sessions', { method: 'POST', body: { profileId, nodeId, mode } });
      setSessionId(session.id);
      setTurns([]);
      setNotice({ key: 'sessionCreated' });
    } catch (error) { setNotice({ key: 'failed', detail: formatError(error) }); }
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
      setNotice({ key: kind === 'answer' ? 'answerRecorded' : 'questionSubmitted' });
    } catch (error) { setNotice({ key: 'failed', detail: formatError(error) }); }
  }

  /** 提示语按**当前语种**渲染：存的是键，切语种不会留下一句上一语言的话。 */
  const noticeText = (value: Notice): string => {
    const { notices } = text;
    switch (value.key) {
      case 'pollFailed': return notices.pollFailed(value.detail);
      case 'failed': return notices.failed(value.detail);
      case 'profileMissing': return notices.profileMissing;
      case 'sessionCreated': return notices.sessionCreated;
      case 'answerRecorded': return notices.answerRecorded;
      default: return notices.questionSubmitted;
    }
  };

  const available = status.data?.available;

  return (
    <div className="page">
      <div className="section-heading">
        <h1>{text.heading} <span className="tutor-brand">DeepTutor</span></h1>
        <p>{text.lead}</p>
      </div>

      {/*
        引导条：把这一页的三件事按顺序点出来，并高亮「现在这一步」。
        它是视角引导，不是权限控制——被淡化的区块照样可以点。
      */}
      {!guideOff && (
        <nav className="tutor-guide" aria-label={text.guideAria} data-guide-step={guideStep}>
          <ol>
            {text.guideSteps.map((step) => (
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
          <button type="button" className="link-button tutor-guide-dismiss" onClick={dismissGuide}>{text.guideDismiss}</button>
        </nav>
      )}

      {/* DeepTutor 介绍：是什么、怎么接、边界在哪。 */}
      <section className="card tutor-intro">
        <div className="tutor-intro-head">
          <h2>{text.aboutTitle}</h2>
          <span className="tutor-intro-tag">{text.aboutTag}</span>
        </div>
        <p>{intro.what}</p>
        <ul className="tutor-intro-list">
          {intro.how.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
        <div className="tutor-intro-paths">
          {intro.paths.map((path) => (
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
            {intro.links.map((link) => (
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
                {text.versionRuntime}
                <strong data-version-source="runtime">{status.data.upstream.label ?? `v${status.data.upstream.version}`}</strong>
                <span className="muted"> · </span>{text.license}<strong>{intro.recorded.license}</strong>
                <span className="muted"> · </span>{text.source}<code>{status.data.upstream.source}</code>
                {status.data.upstream.fileModifiedAt && (
                  <>
                    <span className="muted"> · </span>{text.fileModified}{fmtDate(status.data.upstream.fileModifiedAt)}
                  </>
                )}
                <span className="muted"> · </span>{text.readAt} {fmtDate(status.data.upstream.readAt)}
              </>
            ) : (
              <>
                {text.versionRecorded}<strong data-version-source="recorded">{intro.recorded.version}</strong>
                <span className="muted">{text.recordedSuffix(status.data?.upstream?.note ?? '')}</span>
                <span className="muted"> · </span>{text.license}<strong>{intro.recorded.license}</strong>
                <span className="muted"> · </span>{text.basis}{intro.recorded.basis}
              </>
            )}
          </p>
        </div>
        <p className="tutor-intro-boundary">{intro.boundary}</p>
      </section>

      <section
        className={`card tutor-status${!guideOff && guideStep === 1 ? ' is-guiding' : ''}`}
        data-guide-step={guideOff ? undefined : guideStep}
      >
        <h2>{text.statusTitle}</h2>
        {status.loading && <p>{text.checking}</p>}
        {status.data && (
          <>
            <div className="plan-status">
              <StatusBadge status={available ? (status.data.liveVerified ? 'passed' : 'not_run') : 'unsupported'} label={available ? (status.data.liveVerified ? text.badgeLive : text.badgeReachable) : text.badgeDisconnected} />
              <span>{status.data.adapter ?? 'none'}</span>
            </div>
            {/* 后端下发的说明仍是中文：英文语境下标注「尚未翻译」，不自己编英文。 */}
            <p><span {...pendingProps(status.data.note)}>{status.data.note}</span></p>
            {status.data.frontend_url && <p className="muted">{text.frontend}{status.data.frontend_url} · {text.backend}{status.data.backend_url}</p>}
            {/*
              两套集成必须同时披露：本站内适配器（上下文注入 + 事件落 E）与桥接（3783，
              带 MCP 工具与事件登记，是经过核查的那一套）。不写清楚，使用者会以为只有一套、
              甚至把两边的结论混着用。
            */}
            {status.data.bridge && (
              <>
                <div className="plan-status">
                  <StatusBadge status={status.data.bridge.reachable ? 'passed' : 'not_run'} label={status.data.bridge.reachable ? text.bridgeRunning : text.bridgeStopped} />
                  <span>{status.data.bridge.url}</span>
                </div>
                <p className="muted"><span {...pendingProps(status.data.bridge.note)}>{status.data.bridge.note}</span></p>
              </>
            )}
          </>
        )}
        {!available && !status.loading && (
          <div className="notice">
            {text.restart}
          </div>
        )}
      </section>

      <section className={`card${!guideOff && guideStep === 2 ? ' is-guiding' : ''}`}>
        <h2>{text.sessionTitle}</h2>
        <div className="inline-form">
          <select value={nodeId} onChange={(event) => setNodeId(event.target.value)}>
            {(nodes.data?.nodes ?? []).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
          </select>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="explain">{text.modes.explain}</option>
            <option value="hint">{text.modes.hint}</option>
            <option value="practice">{text.modes.practice}</option>
          </select>
          <button className="button primary" disabled={!profileId} onClick={createSession}>{text.create}</button>
        </div>
        {notice && <p className="notice"><span {...pendingProps(noticeText(notice))}>{noticeText(notice)}</span></p>}
      </section>

      {sessionId && (
        <section className={`card tutor-session${!guideOff && guideStep === 3 ? ' is-guiding' : ''}`}>
          <h2>{text.turnsTitle}</h2>
          <div className="turn-list">
            {turns.length === 0 && <p className="muted">{text.noTurns}</p>}
            {turns.map((turn) => (
              <article key={turn.id} className={`turn ${turn.kind}`}>
                <header><StatusBadge status={turn.status === 'done' ? 'passed' : turn.status === 'error' ? 'failed' : 'not_run'} label={turn.kind === 'answer' ? text.kindAnswer : text.kindQuestion} /><code>{turn.requestId}</code></header>
                {turn.error && <p className="error">{turn.error.code}：{turn.error.message}</p>}
                {turn.answer && <p className="turn-answer">{turn.answer}</p>}
                {!turn.answer && !turn.error && <p>{text.waiting}</p>}
              </article>
            ))}
          </div>
          <div className="turn-composer">
            <div className="segmented">
              <button className={kind === 'question' ? 'active' : ''} onClick={() => setKind('question')}>{text.askTab}</button>
              <button className={kind === 'answer' ? 'active' : ''} onClick={() => setKind('answer')}>{text.answerTab}</button>
            </div>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={5} placeholder={kind === 'answer' ? text.placeholderAnswer : text.placeholderQuestion} />
            <button className="button primary" disabled={!available || !input.trim()} onClick={send}>{text.send}</button>
          </div>
        </section>
      )}
    </div>
  );
}
