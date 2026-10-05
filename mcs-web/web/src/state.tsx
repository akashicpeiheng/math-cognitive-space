import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, formatError } from './api';
import { useAuth } from './auth';
import type { HealthView, ProfileView } from './types';

const STORAGE_KEY = 'mcs-web-selected-profile';

interface ProfileContextValue {
  profiles: ProfileView[];
  profileId: string | null;
  profile: ProfileView | null;
  setProfileId: (id: string | null) => void;
  refreshProfiles: () => Promise<void>;
  health: HealthView | null;
  /*
   * 失败要说出来（2026-10 加）。从前这两个请求各自 `.catch(() => {})` 静默丢弃失败，
   * 于是「服务没起来 / 接口报 500」在界面上表现为「未选择档案」与「正在连接…」——
   * 把失败表达成加载中，是最难排查的一种假象。
   */
  profilesError: string | null;
  healthError: string | null;
}

const ProfileContext = createContext<ProfileContextValue>({
  profiles: [],
  profileId: null,
  profile: null,
  setProfileId: () => {},
  refreshProfiles: async () => {},
  health: null,
  profilesError: null,
  healthError: null,
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, identityKey, mode: authMode, user: authUser } = useAuth();
  const [profiles, setProfiles] = useState<ProfileView[]>([]);
  const [profileId, setProfileIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [health, setHealth] = useState<HealthView | null>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const refreshProfiles = async () => {
    try {
      const result = await api<{ profiles: ProfileView[] }>('/profiles');
      setProfiles(result.profiles);
      setProfilesError(null);
      /*
       * 不再自动选中第一个档案。
       *
       * 自动套用演示档案会让首次访问的人看到别人的进度、复习队列与「继续学习」，
       * 也让首页无法呈现「从问题进入」的冷启动形态。
       * 只有本地保存的档案已经不存在时才退回「未选择档案」，并清掉过期记录。
       */
      setProfileIdState((current) => {
        if (!current) return null;
        if (result.profiles.some((profile) => profile.id === current)) return current;
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* 隐私模式：忽略 */ }
        return null;
      });
    } catch (reason) {
      // 记下来给界面显示，同时继续抛出：调用方的失败分支保持原样。
      setProfilesError(formatError(reason));
      throw reason;
    }
  };

  useEffect(() => {
    /*
     * 等身份问清楚再拉个人数据（2026-10 加，配合 `web/src/auth.tsx`）。
     *
     * 公网模式下 `/profiles` 的策略是 `user`：没登录时它必然 401。从前这里无条件
     * 发请求，于是「还没问清楚身份」被显示成「没有档案 + 一句报错」——
     * 把加载状态与权限状态混成了同一个画面。现在：
     *
     * - `authReady` 为假（首次 `GET /auth/session` 还没回来）时**不发请求**；
     * - **公网模式下未登录的访客也不发**（2026-10-05 补）。访客按定义没有档案，
     *   发出去只会吃一个 401：它污染控制台，还会在界面上冒出一句"读取失败"，
     *   而真实情况是"你还没登录"。HTTPS 验收里就是这样抓到那两条 401/403 噪声的。
     * - `identityKey` 变化（登录、退出、验证链接）时**重拉一次**，退出后不留上一个人的档案列表。
     *
     * 本机模式的行为不变：那一次 bootstrap 照常发出（`GET /api/v2/auth/session`
     * 在本机模式返回 `{mode:'local'}`），随后这里的两个请求与从前**同一轮**发出，
     * 只是从「挂载时」挪到「bootstrap 落地时」——相差一个本机请求之内的时间。
     */
    if (!authReady) return;
    const guestInPublicMode = authMode === 'supabase' && !authUser;
    if (guestInPublicMode) {
      setProfiles([]);
      setProfilesError(null);
    } else {
      refreshProfiles().catch(() => {});
    }
    api<HealthView>('/health')
      .then((value) => { setHealth(value); setHealthError(null); })
      .catch((reason) => setHealthError(formatError(reason)));
  }, [authReady, identityKey, authMode, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const setProfileId = (id: string | null) => {
    setProfileIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id); else localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({
    profiles,
    profileId,
    profile: profiles.find((profile) => profile.id === profileId) ?? null,
    setProfileId,
    refreshProfiles,
    health,
    profilesError,
    healthError,
  }), [profiles, profileId, health, profilesError, healthError]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  return useContext(ProfileContext);
}
