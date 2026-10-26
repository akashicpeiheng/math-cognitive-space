import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi, formatError } from '../api';
import { useI18n } from '../i18n';
import { networkReturnHref, restoreNetworkReturn } from '../network-return';
import type { NodeDetailResponse } from '../types';
import { MasterContent } from './MasterView';
export function MasterNodePage() {
  const { nodeId = '' } = useParams(), { pick, hrefFor, locale } = useI18n(), [params] = useSearchParams();
  let decoded = nodeId;
  try { decoded = decodeURIComponent(nodeId); } catch { /* Let the API report the bad identity. */ }
  const result = useApi<NodeDetailResponse>(`/ontology/nodes/${encodeURIComponent(decoded)}`);
  if (result.error) return <div className="page"><p role="alert">{formatError(result.error)}</p></div>;
  if (!result.data) return <div className="page" role="status">{pick({ zh:'加载节点…', en:'Loading object…' })}</div>;
  const { node } = result.data;
  const back = params.get('from') === 'network' ? networkReturnHref(decoded, locale) : null;
  return <article className="page master-node-page" data-reading-mode="master">
    <nav className="breadcrumb"><Link to={hrefFor('/nodes')}>{pick({ zh:'数学对象', en:'Mathematical objects' })}</Link>{back ? <Link to={back} onClick={() => restoreNetworkReturn(decoded)}>{pick({ zh:'返回网络', en:'Back to network' })}</Link> : null}</nav>
    <h1>{node.title}</h1><p className="master-page-meta"><code>{node.id}</code> · Master · {pick({ zh:'AI 参与 · 尚未逐条人工复核', en:'AI-assisted · individual human review pending' })}</p>
    {node.master ? <MasterContent view={node.master}/> : <p>{pick({ zh:'压缩视图暂不可用。', en:'Compact view unavailable.' })}</p>}
  </article>;
}
