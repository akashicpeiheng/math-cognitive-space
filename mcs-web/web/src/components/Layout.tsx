import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useProfileContext } from '../state';
import { SITE } from '../site';
import { PressFeedback } from './PressFeedback';
import { AuthStatus } from './AuthStatus';

/**
 * 主导航只保留学习主线上的五步：开始学习 → 找对象 → 看结构 → 定路线 → 回看自己的记录。
 * 「知识网络」放在「学习路线」之前：先看清结构，再定路线。
 *
 * 「开始学习」指向 `/start`（各个角度的切入口）；首页 `/` 只有六幕动画，
 * 点侧栏品牌即可回到首页，不单独占一个导航项。
 * 介绍、方法论、辅导与研究台属于「按需查阅」，放辅助导航；复习并入「我的学习」的标签页，
 * 不再单占一个一级入口。
 */
const NAV = [
  { to: '/start', label: '开始学习', icon: 'home' },
  { to: '/nodes', label: '数学对象', icon: 'nodes' },
  { to: '/network', label: '知识网络', icon: 'network' },
  { to: '/plan', label: '学习路线', icon: 'plan' },
  { to: '/profile', label: '我的学习', icon: 'profile', also: ['/review'] },
];

const NAV_SECONDARY = [
  { to: '/intro', label: '网站介绍', icon: 'intro' },
  { to: '/method', label: '学习方法论', icon: 'method' },
  {
    to: '/tutor',
    label: '辅导',
    icon: 'tutor',
    /*
     * 「已接入 DeepTutor」必须写在侧栏上，而不是等人点进去才知道。
     *
     * 措辞按实际集成的口径写：这是**本机可选入口**（DeepTutor 不在本站进程里，
     * 断开时页面不伪造回复），所以徽标只断言「接入」这一件可核对的事，
     * 不断言「随时可用」或任何教学效果。连通状态由辅导页自己按证据显示。
     */
    badge: {
      text: 'DeepTutor',
      title: '辅导已接入 DeepTutor：本机可选入口，导通状态在辅导页按证据显示',
    },
  },
  { to: '/lab', label: '前沿研究', icon: 'lab' },
  { to: '/maintenance', label: '网站维护', icon: 'intro' },
  /*
   * 自动关联是**维护动作**（写入 data/extensions/），不是学习入口：
   * 它不改公共本体图，除非走到最后一步「确认入库」。
   */
  { to: '/authoring', label: '自动关联', icon: 'authoring' },
];

/** 顶栏显示「当前在哪」；节点页与回放等二级页面沿用所属栏目名。 */
function locationLabel(pathname: string): string {
  if (pathname === '/') return '首页';
  if (pathname.startsWith('/start')) return '开始学习';
  if (pathname.startsWith('/nodes')) return '数学对象';
  if (pathname.startsWith('/plan')) return '学习路线';
  if (pathname.startsWith('/network') || pathname.startsWith('/graph')) return '知识网络';
  if (pathname.startsWith('/profile') || pathname.startsWith('/review')) return '我的学习';
  if (pathname.startsWith('/intro')) return '网站介绍';
  if (pathname.startsWith('/method')) return '学习方法论';
  if (pathname.startsWith('/tutor')) return '辅导';
  if (pathname.startsWith('/lab') || pathname.startsWith('/research')) return '前沿研究';
  if (pathname.startsWith('/maintenance')) return '网站维护';
  if (pathname.startsWith('/authoring')) return '自动关联';
  return '数学认知空间';
}

const SIDEBAR_STORAGE_KEY = 'mcs-sidebar-collapsed-v1';

function initialDesktopSidebarState() {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'; }
  catch { return false; }
}

function NavIcon({ name }: { name: string }) {
  const common = { className: 'nav-icon', viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M4 10.5 12 4l8 6.5v8.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 18.7Z" /><path d="M9.2 20v-6.2h5.6V20" /></svg>;
    case 'intro':
      return <svg {...common}><circle cx="12" cy="12" r="8.4" /><path d="M12 10.7v5.4M12 7.5h.01" /></svg>;
    case 'method':
      return <svg {...common}><circle cx="12" cy="12" r="8.3" /><path d="m14.9 9.1-1.5 4.3-4.3 1.5 1.5-4.3Z" /></svg>;
    case 'nodes':
      return <svg {...common}><circle cx="7" cy="7" r="2.5" /><rect x="14.5" y="4.5" width="5" height="5" rx="1.2" /><path d="M4.8 18.8 7 14.6l2.2 4.2ZM12 7h2.5M8.2 9l-1 5.4M16.7 9.5l-6.1 6.2" /></svg>;
    case 'network':
      return <svg {...common}><circle cx="12" cy="5" r="2.2" /><circle cx="5.3" cy="17.8" r="2.2" /><circle cx="18.7" cy="17.8" r="2.2" /><path d="m10.9 6.9-4.5 8.9M13.1 6.9l4.5 8.9M7.5 17.8h9" /></svg>;
    case 'plan':
      return <svg {...common}><circle cx="5" cy="18.5" r="1.8" /><circle cx="19" cy="5.5" r="1.8" /><path d="M6.8 18.3c5.3-.5 1.7-7.6 6.6-8.1 3.1-.3 2.8-3 3.8-3.8" /><path d="M8 5h4M8 8h2" /></svg>;
    case 'review':
      return <svg {...common}><path d="M5.1 9.2A7.5 7.5 0 0 1 18.7 8M18.9 14.8A7.5 7.5 0 0 1 5.3 16" /><path d="M5 5v4.5h4.5M19 19v-4.5h-4.5" /></svg>;
    case 'profile':
      return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5.3 20c.6-4.1 3-6.2 6.7-6.2s6.1 2.1 6.7 6.2" /></svg>;
    case 'tutor':
      return <svg {...common}><path d="M4 5.2h16v10.6H9l-4.8 3 .8-3H4Z" /><path d="M8 9h8M8 12h5" /></svg>;
    case 'lab':
      return <svg {...common}><path d="M9 3h6M10 3v5.4l-5 9A2.4 2.4 0 0 0 7.1 21h9.8a2.4 2.4 0 0 0 2.1-3.6l-5-9V3" /><path d="M7.8 15h8.4" /></svg>;
    case 'authoring':
      // 两个节点由一条带箭头的线连起来：表示「自动找关系」，不是「已建立关系」。
      return <svg {...common}><circle cx="6.2" cy="7.2" r="2.3" /><circle cx="17.8" cy="16.8" r="2.3" /><path d="M7.9 8.9c1.4 1.6 6.8 4.4 8.3 6.1" /><path d="m13.6 15.6 2.8-.3-.6 2.7" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="7" /></svg>;
  }
}

export function Layout() {
  const { profiles, profileId, setProfileId } = useProfileContext();
  const location = useLocation();
  const [desktopCollapsed, setDesktopCollapsed] = useState(initialDesktopSidebarState);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const sync = (event: MediaQueryListEvent) => setIsNarrow(event.matches);
    setIsNarrow(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(desktopCollapsed)); }
    catch { /* 浏览器禁用存储时，侧栏仍可在本次会话中正常切换。 */ }
  }, [desktopCollapsed]);

  // 窄屏导航在完成一次跳转后自动收起，把正文空间还给学习内容。
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const compact = isNarrow ? !mobileOpen : desktopCollapsed;
  /*
   * 首页自己收尾（2026-10-04，按用户截图要求）：
   * 1. 不显示全站页脚——末幕的幕内署名已经写了同一份「作者 · 联系邮箱」；
   * 2. 正文区不留通用的 4rem 下内边距——末幕底部那行「滚轮提示」就是页面最后一行，
   *    留着它会在那一行之下再撑出 64px 空白（实测文档高 5899，内容只到 5835）。
   * 其它页面照旧：页脚是署名的落点，正文与页脚之间也需要那段留白。
   */
  const isHome = location.pathname === '/';
  const toggleLabel = isNarrow
    ? (mobileOpen ? '收起导航' : '展开导航')
    : (desktopCollapsed ? '展开侧栏' : '收起侧栏');

  return (
    <div className={`app-shell${compact ? ' sidebar-collapsed' : ''}`}>
      {/*
        主要按键的按下反馈：只挂一个 pointerdown 监听，把落点写进 `--press-x/--press-y`
        （见 PressFeedback.tsx 与 styles.css 的同一处说明）。挂在这里是因为全部路由都经过本组件。
      */}
      <PressFeedback />
      <aside className="sidebar" aria-label="站点侧栏">
        <div className="sidebar-head">
          {/*
            品牌位是回首页的唯一常驻入口：首页只有六幕动画，不占导航项。

            因此它必须**一眼看出是个按钮**，而不是一段站名文本。做法不是加一句说明，
            而是把可点击的样子直接做出来：整块有边框与底色的按钮面板、右上角一枚实心
            「首页」胶囊 + 房子图标、悬停时抬起并加深、按下时回落、键盘聚焦有描边。
            纯装饰件一律 aria-hidden，屏幕阅读器只念按钮本身（aria-label 已经写明去处）。
          */}
          <Link className="brand" to="/" title="回到首页动画（六幕叙事）" aria-label="回到首页动画">
            <span className="brand-cta" aria-hidden="true">
              <svg className="brand-cta-icon" viewBox="0 0 24 24">
                <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <span className="brand-cta-label">首页</span>
              <svg className="brand-cta-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {/* 小 logo：design/mcs-logo-v13 导出的一笔彩虹字标（透明底）；大 logo（v6 紫色徽记）在首页首屏。 */}
            <img className="brand-wordmark" src="/wordmark-256.png" alt="" aria-hidden="true" width={132} height={41} />
            <span className="brand-copy">
              <strong>数学认知空间</strong>
              <small>M / E / D 分离 · 本机工作台</small>
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={toggleLabel}
            aria-expanded={!compact}
            title={toggleLabel}
            onClick={() => (isNarrow ? setMobileOpen((open) => !open) : setDesktopCollapsed((value) => !value))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {isNarrow
                ? <><path d="M5 7h14M5 12h14M5 17h14" /><path className="toggle-accent" d={mobileOpen ? 'm9 14 3-3 3 3' : 'm9 10 3 3 3-3'} /></>
                : <><path d="M5 5h14v14H5Z" /><path d="M9 5v14" /><path className="toggle-accent" d={desktopCollapsed ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3'} /></>}
            </svg>
          </button>
        </div>
        <nav aria-label="主导航" className="nav-primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={compact ? item.label : undefined}
              className={({ isActive }) => (isActive || (item.also ?? []).includes(location.pathname) ? 'nav-item active' : 'nav-item')}
            >
              <NavIcon name={item.icon} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}</nav>
        <div className="nav-secondary">
          <p className="nav-secondary-title">按需查阅</p>
          {NAV_SECONDARY.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={compact ? `${item.label}${item.badge ? ` · ${item.badge.text}` : ''}` : item.badge?.title}
              className={({ isActive }) => (isActive ? 'nav-item secondary active' : 'nav-item secondary')}
            >
              <NavIcon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {item.badge && (
                <span className="nav-badge" title={item.badge.title}>
                  <span className="nav-badge-dot" aria-hidden="true" />
                  {item.badge.text}
                </span>
              )}
            </NavLink>
          ))}
          <p className="nav-secondary-note">介绍、方法论、辅导（已接入 DeepTutor）、前沿研究，以及站点自身的维护材料与「自动关联」（把对象写成形式表达并自动找关系）。</p>
        </div>
        <div className="sidebar-author">
          <span>作者</span>
          <strong>{SITE.author}</strong>
          <a href={SITE.mailto}>{SITE.email}</a>
        </div>
        {/* 本体哈希与运行版本不再占侧栏：它们在「我的学习 · 高级设置」里可查。 */}
      </aside>
      <div className="main-column">
        <header className="topbar">
          <nav className="topbar-crumbs" aria-label="当前位置">
            <span className="topbar-title">{locationLabel(location.pathname)}</span>
          </nav>
          <div className="topbar-side">
            <div className="profile-picker">
              <label htmlFor="profile-select">学习者档案（E）</label>
              <select id="profile-select" value={profileId ?? ''} onChange={(event) => setProfileId(event.target.value || null)}>
                <option value="">未选择档案</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id} title={`修订号 rev ${profile.revision}`}>{profile.name}</option>
                ))}
              </select>
            </div>
            {/*
              账号状态（2026-10 加）。本机模式下 `AuthStatus` 的**第一行**就返回 null
              （`mode !== 'supabase'`），因此页头上这一处不会多出任何 DOM：
              本机模式的页头与从前逐字相同。见 AuthStatus.tsx 的说明。

              外面这层 `.topbar-side` 是纯布局（本机模式下它只裹着一个原本就在的
              `.profile-picker`，盒子模型与「直接是 topbar 子元素」等价：都是
              `display:flex` + `align-items:center`，因此本机模式的页头外观不变）。
            */}
            <AuthStatus />
          </div>
        </header>
        <main className={`workspace${isHome ? ' is-home' : ''}`}>
          <Outlet />
        </main>
        {/*
          首页不显示全站页脚：末幕的幕内署名已经写了同一份「作者 · 联系邮箱」，
          底部再来一条整宽的同款署名是重复的，也是首页最后一屏里唯一与叙事无关的横条。
          其它页仍然保留——那里没有幕内署名，页脚是署名与联系方式的落点。
          （窄屏收掉侧栏时，别的页面的页脚也仍然是署名与联系方式的落点。）
        */}
        {!isHome && (
          <footer className="site-footer">
            <span>{SITE.name} · 作者 <strong>{SITE.author}</strong></span>
            <span className="site-contact">
              联系邮箱 <a href={SITE.mailto}>{SITE.email}</a>
            </span>
          </footer>
        )}
      </div>
    </div>
  );
}
