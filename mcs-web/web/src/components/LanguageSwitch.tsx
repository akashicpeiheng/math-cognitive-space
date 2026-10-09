/**
 * 语言切换按键（中文 / EN）。
 *
 * ## 为什么是分段控件而不是一个「切换」按钮
 *
 * 一个按钮只能表达「点下去会变成什么」，而用户往往不知道自己现在在哪个语种里
 * （尤其英文界面里全是中文内容时）。两个都列出来的分段控件同时回答了两个问题：
 * 现在是什么、还有哪些可选。当前项用 `aria-pressed` + 视觉高亮标出，不是只靠颜色。
 *
 * ## 它改的是 URL，不是组件状态
 *
 * 路径前缀是语种的唯一真相（见 `i18n/index.tsx`），因此这里调 `switchTo()` 走一次
 * `navigate()`：当前路径、查询串与锚点全部保留。`?locale=` 不在这里拼——中文站不带
 * 参数，英文站靠前缀，两套机制不能同时生效（否则分享链接里会出现两个真相）。
 */

import { useI18n } from '../i18n';
import { LOCALES } from '../i18n/locales';

export function LanguageSwitch() {
  const { locale, switchTo, t } = useI18n();

  return (
    <div className="locale-switch" role="group" aria-label={t('locale.switch')}>
      {LOCALES.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            className={`locale-option${active ? ' active' : ''}`}
            aria-pressed={active}
            /*
             * 目标语种的名称用**目标语种自己写**（`English` / `中文`），
             * 屏幕阅读器念出来时才对得上；`title` 给鼠标用户，两种语言都写。
             */
            lang={item === 'en' ? 'en' : 'zh-CN'}
            title={item === 'en' ? t('locale.enTitle') : t('locale.zhTitle')}
            onClick={() => switchTo(item)}
          >
            {item === 'en' ? 'EN' : '中文'}
          </button>
        );
      })}
    </div>
  );
}
