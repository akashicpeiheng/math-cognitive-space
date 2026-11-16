import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';

export type McsMode = 'atlas' | 'applied' | 'objects';

/**
 * `/mcs` 的三种浏览方式。当前项用 `aria-current="page"` 标出；
 * 切换只改 `?view=`，不改语种前缀，也不把地图视角写进 URL。
 *
 * 对象网络页暂时保留自己的「数学地图」按钮，不强制套用这个组件；
 * 这里的 `objects` 项只负责从地图/索引进入对象网络。
 */
export function McsModeSwitch({ mode }: { mode: McsMode }) {
  const { pick } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const go = (next: McsMode) => {
    if (next === mode) return;
    navigate(next === 'atlas' ? location.pathname : `${location.pathname}?view=${next}`);
  };
  const items: Array<{ id: McsMode; label: string }> = [
    { id: 'atlas', label: pick({ zh: '数学地图', en: 'Math map' }) },
    { id: 'applied', label: pick({ zh: '应用数学', en: 'Applied' }) },
    { id: 'objects', label: pick({ zh: '对象网络', en: 'Object network' }) },
  ];
  return (
    <div className="mcs-mode-switch" role="group" aria-label={pick({ zh: '浏览方式', en: 'Browse mode' })}>
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={item.id === mode ? 'is-active' : undefined}
          aria-current={item.id === mode ? 'page' : undefined}
          onClick={() => go(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
