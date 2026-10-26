/**
 * 外观切换（2026-10-16 加，第一百零九轮）：顶栏的三态开关。
 *
 * ## 为什么放在顶栏、与语言并排
 *
 * 外观与语种是同一类东西：**页面级的显示选项**，不属于任何一份学习者档案。
 * 学习者档案下拉在它右边，因为那是数据；这两件是显示。
 *
 * ## 为什么是 `<select>` 而不是一个循环按钮
 *
 * 三态（浅色 / 深色 / 跟随系统）用按钮循环时，用户只能看到「现在是什么」，
 * 看不到「还有哪几种」；而且连点三次才回到原处，中间还会经过自己不想选的外观。
 * 下拉把三个选项一次列全，键盘与读屏器的行为也由浏览器保证。
 * 当前选中项就是当前偏好（含「跟随系统」），与显示出来的外观不是一回事——
 * 因此文案写「跟随系统」而不是「自动」：它描述的是**规则**，不是**结果**。
 */

import { useI18n } from '../i18n';
import { useTheme } from '../theme-context';
import { isThemePreference } from '../theme-mode';

export function ThemeSwitch() {
  const { preference, resolved, setPreference } = useTheme();
  const { t } = useI18n();

  return (
    <div className="theme-picker">
      <label htmlFor="theme-select">{t('theme.label')}</label>
      <select
        id="theme-select"
        value={preference}
        /*
         * `title` 里写明**当前实际外观**：偏好是「跟随系统」时，用户唯一能确认的方式
         * 就是让界面说出来（否则他得去猜系统现在是深还是浅）。
         */
        title={`${t('theme.title')}：${resolved === 'dark' ? t('theme.dark') : t('theme.light')}`}
        onChange={(event) => {
          const next = event.target.value;
          if (isThemePreference(next)) setPreference(next);
        }}
      >
        <option value="system">{t('theme.system')}</option>
        <option value="light">{t('theme.light')}</option>
        <option value="dark">{t('theme.dark')}</option>
      </select>
    </div>
  );
}
