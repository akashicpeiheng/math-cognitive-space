import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { readMcsReturn } from '../mcs-return';

export function McsReturnLink() {
  const [params] = useSearchParams(), { pick, hrefFor } = useI18n();
  if (params.get('from') !== 'mcs') return null;
  const snapshot = readMcsReturn();
  return <p className="mcs-note-return"><Link to={hrefFor(snapshot?.href ?? '/mcs')} state={snapshot ? { mcsReturn: snapshot.state } : undefined}>{pick({ zh: '← 返回 MCS 视图', en: '← Return to MCS view' })}</Link></p>;
}
