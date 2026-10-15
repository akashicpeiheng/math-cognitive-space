export function relationConnectionKey(relation: { id: string; kind: string; [key: string]: unknown }): string;
export function contractConnectionKey(actionId: string, from: string, to: string): string;
export function familyConnectionKey(family: string, from: string, to: string): string;
export function connectionExists(raw: unknown, key: string): boolean;
