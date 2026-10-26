export type ObjectScale='atom'|'molecule'|'unit'|'topic'|'subdiscipline';
export interface ObjectRef {id:string;version:string;anchor:string;formalHash:string}
export interface LeanBinding {anchor:string;registrationId:string;target:string;mapping:string;review:'pending'}
export interface FormalDeclaration {id:string;kind:'term'|'formula';source:string;type:string;status:string;formalHash:string;canonical:unknown;constructionCount:number}
export interface MathObjectRecord {
  id:string;version:string;title:string;kind:'object';scale:ObjectScale;language:string;grammar:string;
  normalizedContext:{signature:string;bases:string[];constants:Array<{name:string;type:string;background:string}>};
  declarations:FormalDeclaration[];assumptions:string[];references:ObjectRef[];imports:ObjectRef[];members:ObjectRef[];
  exports:Array<{name:string;ref:ObjectRef;type:string}>;links:unknown[];lean:LeanBinding[];
  formalHash:string;bindingHash:string;documentHash:string;path:string;body:string;structuralStatus:'valid';proofStatus:'not-checked';
}
export interface ReadingRoute {id:string;title:string;inputs:Array<{id:string;version:string}>}
export interface LearningNodeDocument {id:string;version:string;title:string;kind:'node';goals:string[];objects:ObjectRef[];prerequisites:Array<{id:string;version:string}>;case?:string;routes?:ReadingRoute[];body:string;path:string;documentHash:string;nodeHash:string}
export interface ContentRelation {schema:'mcs-relation/1';id:string;version:string;title:string;case:string;layer:'M'|'L';kind:string;strength?:'hard'|'soft';from:ObjectRef;to:ObjectRef;premises:ObjectRef[];context:string;routeId?:string;witness:{type:string;statement:string;mapping?:string;differences?:string};evidence:{status:string;source:string;registrationId?:string};body:string;relationHash:string;proofStatus:'not-checked'}
export interface ContentLibrary {
  schema:'mcs-content-library/1';objectVersion:string;learningVersion:string;objects:MathObjectRecord[];nodes:LearningNodeDocument[];relations:ContentRelation[];
  scale:{schema:'mcs-object-scale/1';levels:Array<{id:ObjectScale;sigma:number;title:string}>;members:Array<{parent:string;child:string}>};
}
export interface ContentSource {path:string;markdown:string}
export interface ParsedContentDocument {kind:'object'|'node'|'relation';data:Record<string,any>;body:string;path:string;documentHash:string}
export const OBJECT_SCHEMA:'mcs-object/1';
export const NODE_SCHEMA:'mcs-node/1';
export const GRAMMAR:'mcs-object-grammar/1';
export const OBJECT_SCALES:readonly ObjectScale[];
export const SCALE_TITLES:Readonly<Record<ObjectScale,string>>;
export class ContentDocumentError extends Error {code:string;path:string}
export function parseContentDocument(markdown:string,path?:string):ParsedContentDocument;
export function formatContentDocument(data:Record<string,unknown>,body:string):string;
export function compileContentLibrary(sources:Array<ContentSource|ParsedContentDocument>,options?:{checkPins?:boolean}):ContentLibrary;
export function objectReference(library:ContentLibrary,id:string,anchor?:string):ObjectRef;
export function constructionCount(term:unknown):number;
