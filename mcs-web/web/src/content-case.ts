import { PRESETS } from '../../shared/mcs-groups.mjs';
export { PRESETS };
export const CASE_ID='topology-dg';
export function caseNetworkHref(layer='M',preset='topology'){
 const keys=PRESETS[preset as keyof typeof PRESETS]??PRESETS.topology;
 return '/network?'+new URLSearchParams({contentCase:CASE_ID,layer,preset,nodes:keys.map(k=>`${layer==='M'?'obj':'learn'}:tdg:${k}`).join(',')});
}
