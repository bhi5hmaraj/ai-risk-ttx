import { z } from 'zod';

export type ZodLeafType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'unknown';

export function getZodLeafType(s: any): ZodLeafType {
  const t = unwrap(s);
  if (t instanceof (z as any).ZodString) return 'string';
  if (t instanceof (z as any).ZodNumber) return 'number';
  if (t instanceof (z as any).ZodBoolean) return 'boolean';
  if (t instanceof (z as any).ZodArray) return 'array';
  if (t instanceof (z as any).ZodObject) return 'object';
  return 'unknown';
}

export function unwrap(s: any): any {
  let cur: any = s;
  while (cur && (cur._def?.innerType || cur._def?.schema)) {
    cur = cur._def.innerType || cur._def.schema;
  }
  return cur as any;
}

export function defaultValueForSchema(s: any): any {
  const u = unwrap(s);
  if (u instanceof (z as any).ZodString) return '';
  if (u instanceof (z as any).ZodNumber) return 0;
  if (u instanceof (z as any).ZodBoolean) return false;
  if (u instanceof (z as any).ZodArray) return [];
  if (u instanceof (z as any).ZodObject) {
    const shape = (u as any).shape;
    const out: any = {};
    for (const [k, v] of Object.entries(shape)) out[k] = defaultValueForSchema(v as any);
    return out;
  }
  return null;
}
