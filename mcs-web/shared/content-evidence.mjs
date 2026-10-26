import {digest} from '../core/formal/codec.mjs';

/** A review receipt is independent of a machine replay receipt. Never infer a human review. */
export function correspondenceInput(object,node,binding,machineInput) {
  if(!object.declarations.some(d=>d.id===binding.anchor)||!node.objects.some(r=>r.id===object.id))throw new Error('对应审阅必须连接实际声明和引用它的节点');
  return `sha256:${digest({schema:'mcs-content-correspondence/1',objectId:object.id,formalHash:object.formalHash,nodeId:node.id,nodeHash:node.nodeHash,anchor:binding.anchor,registrationId:binding.registrationId,target:binding.target,mapping:binding.mapping,machineInput})}`;
}
export function correspondenceState(receipt,currentInput) {
  if(!receipt)return 'pending';
  if(receipt.schema!=='mcs-content-correspondence/1'||receipt.status!=='reviewed'||!receipt.reviewer?.trim()||!Number.isFinite(Date.parse(receipt.reviewedAt)))return 'pending';
  return receipt.inputHash===currentInput?'reviewed':'stale';
}
