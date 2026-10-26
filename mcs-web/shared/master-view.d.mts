export interface MasterExpression { id?:string; title?:string; markdown:string; status?:string; source?:string; conditions?:string[]; locale?:string }
export interface MasterReference { id:string; title:string; href:string; anchor?:string }
export interface MasterView {
  schema:'mcs-master-view/1'; version:string; sourceVersion:string; locale:string; contentLocale:string;
  id:string; anchor?:string; title:string; context:string[]; expressions:MasterExpression[]; equivalents:MasterExpression[];
  intuition:string; intuitionLocale:string; status:string; sources:string[]; completeness:'registered'|'partial'; gaps:string[];
  references:MasterReference[]; variants:MasterView[];
}
export const MASTER_CONTENT_VERSION:string;
export function legacyMasterView(node:any,options?:{nodes?:any[];sourceVersion?:string;locale?:string}):MasterView;
export function objectMasterView(object:any,options?:{objects?:any[];anchor?:string;sourceVersion?:string;locale?:string}):MasterView;
export function learningMasterView(node:any,objects:any[],options?:{sourceVersion?:string;locale?:string}):MasterView;
export function masterPreview(view:MasterView):MasterView;
