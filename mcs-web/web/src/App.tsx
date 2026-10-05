import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfileProvider } from './state';
import { AuthProvider } from './auth';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGuard } from './components/AuthGuard';
import { HomePage } from './pages/HomePage';
import { StartPage } from './pages/StartPage';
import { IntroPage } from './pages/IntroPage';
import { MethodPage } from './pages/MethodPage';
import { MethodDetailPage } from './pages/MethodDetailPage';
import { NodeListPage } from './pages/NodeListPage';
import { NodePage } from './pages/NodePage';
import { NetworkPage } from './pages/NetworkPage';
import { PlanPage } from './pages/PlanPage';
import { ResearchPage } from './pages/ResearchPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { AuthoringPage } from './pages/AuthoringPage';
import { ProfilePage } from './pages/ProfilePage';
import { TutorPage } from './pages/TutorPage';
import { LoginPage } from './pages/LoginPage';
import { AuthConfirmPage } from './pages/AuthConfirmPage';

/**
 * 账号层与档案层的嵌套顺序（2026-10 加，**顺序是有讲究的**）。
 *
 * `AuthProvider` 必须在外层：`ProfileProvider` 要读 `useAuth()` 的 `ready` / `identityKey`
 * 来决定何时去拉 `/profiles`。反过来嵌套时，`ProfileProvider` 读到的是 `useAuth()` 的
 * 默认值（`ready: false`），它的加载 effect 会**永远提前返回**——本机模式下档案列表
 * 一直是空的（浏览器验收就是这么抓到的：档案下拉框里一个选项都没有）。
 *
 * 「登录/退出后刷新档案」不需要额外的桥接组件：`ProfileProvider` 的 effect 已经把
 * `identityKey` 当依赖，身份一变它自己会重拉。
 */
export function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        {/*
          错误边界在路由之外：任何一页的渲染异常都落到它身上（从前是整站白屏）。
          放在 Layout 以内会把导航一起丢掉，用户连"回首页"都点不到。
        */}
        <ErrorBoundary>
          <Routes>
          <Route element={<Layout />}>
            {/* 首页只有六幕动画；学习入口在紧接着它的「开始学习」页。 */}
            <Route index element={<HomePage />} />
            <Route path="start" element={<StartPage />} />
            {/* 介绍与方法论：首页最显眼的两个入口落在这里。 */}
            <Route path="intro" element={<IntroPage />} />
            <Route path="method" element={<MethodPage />} />
            {/* 方法库单条：带简介的栏目点进来是更细致的解析。 */}
            <Route path="method/:methodId" element={<MethodDetailPage />} />
            <Route path="nodes" element={<NodeListPage />} />
            <Route path="nodes/:nodeId" element={<NodePage />} />
            {/* 旧的「探索结构」已并入「组建网络」：保留重定向，避免旧链接与书签失效。 */}
            <Route path="graph" element={<Navigate to="/network" replace />} />
            <Route path="network" element={<NetworkPage />} />
            {/*
              学习路线与我的学习是**纯个人**页面：内容全部来自账号下的学习档案。
              公网模式未登录时由 AuthGuard 说明「请先登录」并给出入口；
              本机模式（mode === 'local'）守卫直接放行原页面，行为与从前一致。
            */}
            <Route path="plan" element={<AuthGuard><PlanPage /></AuthGuard>} />
            {/* 复习已并入「我的学习」的待回看标签：旧链接与书签仍然可用。 */}
            <Route path="review" element={<Navigate to="/profile?tab=review" replace />} />
            {/* 研究台挂在 /lab；/research 保留为同一页面的别名，避免旧链接与既有书签失效。 */}
            <Route path="lab" element={<ResearchPage />} />
            <Route path="research" element={<ResearchPage />} />
            {/*
              网站维护：原「研究台」里的维护材料（专稿与 arXiv 清单、覆盖对照、局部化算子、
              证据义务、合法本体条件、关系运算）。研究台改成放前沿研究的公开问题与可借用工具。
            */}
            <Route path="maintenance" element={<MaintenancePage />} />
            {/*
              自动关联：把对象写成受限形式语言的表达，自动发现关系、审阅、入库与回滚。
              它是**维护动作**（写 data/extensions/），入口同时挂在「网站维护」里；
              带 ?node= 参数时从节点页的两个入口进来（以此为基础创建 / 检查已有形式表达）。
            */}
            <Route path="authoring" element={<AuthoringPage />} />
            <Route path="profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
            <Route path="tutor" element={<TutorPage />} />
            {/*
              账号两个入口。**两个模式都注册**：本机模式下登录页要能打开并说清
              「本机模式没有在线账号」，把路由藏起来只会让 404 代替解释。
            */}
            <Route path="login" element={<LoginPage />} />
            {/* 邮箱验证链接的落点（服务端的回调地址正是 /auth/confirm）。 */}
            <Route path="auth/confirm" element={<AuthConfirmPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
          </Routes>
        </ErrorBoundary>
      </ProfileProvider>
    </AuthProvider>
  );
}
