"use client";

import React from 'react';
import { z } from 'zod';
import {
  useFieldArray,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form';
import { defaultValueForSchema, getZodLeafType, unwrap } from './utils';
import { matrixTheme } from '@/styles/matrixTheme';

type AnyValues = Record<string, any>;

export interface ZodFormRendererProps {
  schema: any;
  base?: string; // current object path (dot-notation)
  control: Control<AnyValues>;
  register: UseFormRegister<AnyValues>;
  setValue: UseFormSetValue<AnyValues>;
  watch: UseFormWatch<AnyValues>;
  disabled?: boolean;
  errors?: any;
  // Optional: comments plumbing for per-field hints
  comments?: Record<string, string>;
  setFieldComment?: (path: string, value: string) => void;
  // Optional: AI lock toggles (do not disable user input)
  locks?: Record<string, boolean>;
  setFieldLock?: (path: string, value: boolean) => void;
  // Optional: filter out fields we already render elsewhere
  includePath?: (path: string) => boolean;
}

// Utility: join dot path segments safely
function joinPath(base: string | undefined, key: string | number) {
  return base && base.length > 0 ? `${base}.${key}` : String(key);
}

export const ZodFormRenderer: React.FC<ZodFormRendererProps> = (props) => {
  const { schema } = props;
  const s = unwrap(schema);

  if (s instanceof (z as any).ZodObject) {
    return <ObjectRenderer {...props} schema={s} />;
  }

  if (s instanceof (z as any).ZodArray) {
    return <ArrayRenderer {...props} schema={s} />;
  }

  // Leaf controls
  return <LeafRenderer {...props} schema={s} />;
};

const ObjectRenderer: React.FC<ZodFormRendererProps & { schema: any }> = ({
  schema,
  base,
  control,
  register,
  setValue,
  watch,
  disabled,
  errors,
  comments,
  setFieldComment,
  includePath,
  locks,
  setFieldLock,
}) => {
  const shape = schema.shape as Record<string, any>;
  const entries = Object.entries(shape);

  return (
    <div className="space-y-3">
      {entries.map(([key, subschema]) => {
        const path = joinPath(base, key);
        if (includePath && !includePath(path)) return null;
        const u = unwrap(subschema);
        const type = getZodLeafType(u);

        if (u instanceof (z as any).ZodObject || u instanceof (z as any).ZodArray) {
          // Nested object/array – render header + nested section
          return (
            <div key={path} className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-gray-400">{key}</div>
              <ZodFormRenderer
                schema={u}
                base={path}
                control={control}
                register={register}
                setValue={setValue}
                watch={watch}
                disabled={disabled}
                errors={errors}
                comments={comments}
                setFieldComment={setFieldComment}
                includePath={includePath}
                locks={locks}
                setFieldLock={setFieldLock}
              />
            </div>
          );
        }

        // Primitive leaf
        return (
          <LeafRenderer
            key={path}
            schema={u}
            base={path}
            control={control}
            register={register}
            setValue={setValue}
            watch={watch}
            disabled={disabled}
            errors={errors}
            comments={comments}
            setFieldComment={setFieldComment}
            locks={locks}
            setFieldLock={setFieldLock}
            includePath={includePath}
          />
        );
      })}
    </div>
  );
};

const ArrayRenderer: React.FC<ZodFormRendererProps & { schema: any }> = ({
  schema,
  base,
  control,
  register,
  setValue,
  watch,
  disabled,
  errors,
  comments,
  setFieldComment,
  includePath,
  locks,
  setFieldLock,
}) => {
  const itemSchema = unwrap(schema._def.type);
  const name = base || '';

  const { fields, append, remove } = useFieldArray({ control, name: name as any });

  const addItem = () => {
    append(defaultValueForSchema(itemSchema));
  };

  const isObjectItems = itemSchema instanceof (z as any).ZodObject;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gray-400">{name.split('.').slice(-1)[0] || 'items'}</div>
        <button type="button" onClick={addItem} className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs">Add</button>
      </div>
      <div className="space-y-3">
        {fields.map((f, idx) => {
          const itemPath = joinPath(name, idx);
          return (
            <div key={f.id} className="border border-gray-800 rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-400">Item {idx + 1}</div>
                <button type="button" onClick={() => remove(idx)} className="text-xs text-red-300">Remove</button>
              </div>
              {isObjectItems ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <ZodFormRenderer
                      schema={itemSchema}
                      base={itemPath}
                      control={control}
                      register={register}
                      setValue={setValue}
                      watch={watch}
                      disabled={disabled}
                      errors={errors}
                      comments={comments}
                      setFieldComment={setFieldComment}
                      includePath={(p) => p === `${itemPath}.name`}
                      locks={locks}
                      setFieldLock={setFieldLock}
                    />
                  </div>
                  <div>
                    <ZodFormRenderer
                      schema={itemSchema}
                      base={itemPath}
                      control={control}
                      register={register}
                      setValue={setValue}
                      watch={watch}
                      disabled={disabled}
                      errors={errors}
                      comments={comments}
                      setFieldComment={setFieldComment}
                      includePath={(p) => p === `${itemPath}.icon`}
                      locks={locks}
                      setFieldLock={setFieldLock}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <ZodFormRenderer
                      schema={itemSchema}
                      base={itemPath}
                      control={control}
                      register={register}
                      setValue={setValue}
                      watch={watch}
                      disabled={disabled}
                      errors={errors}
                      comments={comments}
                      setFieldComment={setFieldComment}
                      includePath={(p) => p === `${itemPath}.character`}
                      locks={locks}
                      setFieldLock={setFieldLock}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <ZodFormRenderer
                      schema={itemSchema}
                      base={itemPath}
                      control={control}
                      register={register}
                      setValue={setValue}
                      watch={watch}
                      disabled={disabled}
                      errors={errors}
                      comments={comments}
                      setFieldComment={setFieldComment}
                      includePath={(p) => p === `${itemPath}.hiddenObjective`}
                      locks={locks}
                      setFieldLock={setFieldLock}
                    />
                  </div>
                </div>
              ) : (
                <LeafRenderer
                  schema={itemSchema}
                  base={itemPath}
                  control={control}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  disabled={disabled}
                  errors={errors}
                  comments={comments}
                  setFieldComment={setFieldComment}
                  locks={locks}
                  setFieldLock={setFieldLock}
                  includePath={includePath}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Heuristic: treat certain string fields as multiline textareas
function shouldUseTextarea(fieldKey: string, path: string) {
  const k = (fieldKey || '').toLowerCase();
  const p = (path || '').toLowerCase();
  return (
    k.includes('description') || k.includes('objective') || k.includes('character') ||
    p.includes('scenarioDescription') || p.endsWith('.description') || p.endsWith('.hiddenobjective') || p.endsWith('.character')
  );
}

const LeafRenderer: React.FC<ZodFormRendererProps & { schema: any }> = ({
  schema,
  base,
  register,
  disabled,
  errors,
  comments,
  setFieldComment,
  locks,
  setFieldLock,
}) => {
  const t = getZodLeafType(schema);
  const key = base?.split('.').slice(-1)[0] || '';
  const path = base || '';

  function getError(path: string): string | null {
    if (!errors || !path) return null;
    try {
      const parts = path.split('.');
      let cur: any = errors;
      for (const p of parts) {
        if (!cur) return null;
        cur = cur[p];
      }
      if (!cur) return null;
      const msg = (cur.message as string) || (cur.type as string) || '';
      return msg || null;
    } catch { return null; }
  }
  const errorMsg = getError(path);

  // For unions or fallbacks, default to text input
  const common = (
    <div className={matrixTheme.form.field}>
      {key && <label className={matrixTheme.form.label}>{key}</label>}
      {shouldUseTextarea(key, path) ? (
        <textarea
          rows={4}
          disabled={!!disabled}
          aria-invalid={!!errorMsg}
          className={`${matrixTheme.form.textarea} ${errorMsg ? 'border-red-600 focus:ring-red-500' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          {...register(path as any)}
        />
      ) : (
        <input
          disabled={!!disabled}
          aria-invalid={!!errorMsg}
          className={`${matrixTheme.form.input} ${errorMsg ? 'border-red-600 focus:ring-red-500' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          {...register(path as any)}
        />
      )}
      {errorMsg && <div className={matrixTheme.form.error}>{errorMsg}</div>}
    </div>
  );

  let control: React.ReactNode = common;
  if (t === 'number') {
    control = (
      <div className={matrixTheme.form.field}>
        {key && <label className={matrixTheme.form.label}>{key}</label>}
        <input
          type="number"
          disabled={!!disabled}
          aria-invalid={!!errorMsg}
          className={`${matrixTheme.form.input} ${errorMsg ? 'border-red-600 focus:ring-red-500' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          {...register(path as any, { valueAsNumber: true })}
        />
      </div>
    );
  } else if (t === 'boolean') {
    control = (
      <label className={`inline-flex items-center gap-2 ${matrixTheme.form.label}`}>
        <input type="checkbox" disabled={!!disabled} className={matrixTheme.form.checkbox} {...register(path as any)} />
        {key}
      </label>
    );
  }

  return (
    <div className="space-y-1">
      {control}
      {setFieldLock && (
        <label className="inline-flex items-center gap-2 text-[10px] text-gray-400">
          <input
            type="checkbox"
            className="accent-gray-500"
            checked={!!locks?.[path]}
            onChange={(e) => setFieldLock(path, e.target.checked)}
          />
          Lock from AI updates
        </label>
      )}
    </div>
  );
};

export default ZodFormRenderer;
