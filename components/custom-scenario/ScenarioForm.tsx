"use client";

import React from 'react';
import type { ScenarioFormProps } from './types';
import { zCustomScenarioForm } from '@/types/customScenarioForm';
import ZodFormRenderer from '@/components/schema-form/ZodFormRenderer';
import { DynamicFields } from '@/components/DynamicFields';

export function ScenarioForm({
  control,
  register,
  setValue,
  watch,
  getValues,
  isSubmitting,
  errors,
  comments,
  setFieldComment,
  locks,
  setFieldLock,
  compileDescription,
  handleContinue,
  submitErrors,
  preview,
  stakeholdersCount,
  validationStatus,
}: ScenarioFormProps) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-emerald-400">Matrix | Scenario builder</h1>
      <p className="text-gray-400 text-base">Sketch the crisis or whisper to The Architect—either way, you stay in control before anything locks in.</p>

      {/* Basics: Title + Rounds (responsive), then Description */}
      <section className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <ZodFormRenderer
              schema={(zCustomScenarioForm.shape as any).scenarioTitle}
              base="scenarioTitle"
              control={control as any}
              register={register as any}
              setValue={setValue as any}
              watch={watch as any}
              disabled={isSubmitting}
              errors={errors}
              comments={comments}
              setFieldComment={setFieldComment}
              locks={locks}
              setFieldLock={setFieldLock}
            />
          </div>
          <div>
            <ZodFormRenderer
              schema={(zCustomScenarioForm.shape as any).maxRounds}
              base="maxRounds"
              control={control as any}
              register={register as any}
              setValue={setValue as any}
              watch={watch as any}
              disabled={isSubmitting}
              errors={errors}
              comments={comments}
              setFieldComment={setFieldComment}
              locks={locks}
              setFieldLock={setFieldLock}
            />
          </div>
          <div className="md:col-span-3">
            <ZodFormRenderer
              schema={(zCustomScenarioForm.shape as any).scenarioDescription}
              base="scenarioDescription"
              control={control as any}
              register={register as any}
              setValue={setValue as any}
              watch={watch as any}
              disabled={isSubmitting}
              errors={errors}
              comments={comments}
              setFieldComment={setFieldComment}
              locks={locks}
              setFieldLock={setFieldLock}
            />
          </div>
        </div>

        {/* Additional dynamic fields if schema extends */}
        <DynamicFields value={getValues()} register={register} disabled={isSubmitting} />
      </section>

      {/* Core metric + maxRounds */}
      <section className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <ZodFormRenderer
              schema={(zCustomScenarioForm.shape as any).coreMetric}
              base="coreMetric"
              control={control as any}
              register={register as any}
              setValue={setValue as any}
              watch={watch as any}
              disabled={isSubmitting}
              errors={errors}
              includePath={(p) => p === 'coreMetric.name'}
              comments={comments}
              setFieldComment={setFieldComment}
              locks={locks}
              setFieldLock={setFieldLock}
            />
          </div>
          <div>
            <ZodFormRenderer
              schema={(zCustomScenarioForm.shape as any).coreMetric}
              base="coreMetric"
              control={control as any}
              register={register as any}
              setValue={setValue as any}
              watch={watch as any}
              disabled={isSubmitting}
              errors={errors}
              includePath={(p) => p === 'coreMetric.value'}
              comments={comments}
              setFieldComment={setFieldComment}
              locks={locks}
              setFieldLock={setFieldLock}
            />
          </div>
          <div className="md:col-span-3">
            <ZodFormRenderer
              schema={(zCustomScenarioForm.shape as any).coreMetric}
              base="coreMetric"
              control={control as any}
              register={register as any}
              setValue={setValue as any}
              watch={watch as any}
              disabled={isSubmitting}
              errors={errors}
              includePath={(p) => p === 'coreMetric.description'}
              comments={comments}
              setFieldComment={setFieldComment}
              locks={locks}
              setFieldLock={setFieldLock}
            />
          </div>
        </div>
      </section>

      {/* Stakeholders */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stakeholders ({stakeholdersCount})</h2>
        </div>
        {/* Render stakeholders with a compact grid per item */}
        {/* We rely on the renderer's array layout; it now packs item fields via grid in ZodFormRenderer */}
        <ZodFormRenderer
          schema={(zCustomScenarioForm.shape as any).stakeholders}
          base="stakeholders"
          control={control as any}
          register={register as any}
          setValue={setValue as any}
          watch={watch as any}
          disabled={isSubmitting}
          errors={errors}
          comments={comments}
          setFieldComment={setFieldComment}
          locks={locks}
          setFieldLock={setFieldLock}
        />
      </section>

      {/* Actions */}
      <div className="flex gap-2 items-start flex-col md:flex-row" data-error-summary="1">
        <div className="flex gap-2">
          <button disabled={isSubmitting} onClick={compileDescription} className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded disabled:opacity-60 text-sm">Preview</button>
          <button disabled={isSubmitting} onClick={async () => { if (isSubmitting) return; await Promise.resolve(handleContinue()); }} className="px-2 py-1.5 bg-emerald-600 rounded disabled:opacity-60 text-sm">Accept and Continue → Pick Role</button>
        </div>
        {submitErrors.length > 0 && (
          <div className="mt-2 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded p-2">
            <div className="font-medium">Please fix the following before continuing:</div>
            <ul className="list-disc list-inside">
              {submitErrors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <section className="space-y-2">
          <h3 className="text-sm text-gray-300">Compiled Scenario Description</h3>
          <pre className="whitespace-pre-wrap bg-gray-900 border border-gray-800 rounded p-3 text-xs text-gray-200">{preview}</pre>
        </section>
      )}

      {/* Debug status */}
      <div className="pt-4 border-t border-gray-800 text-xs text-gray-400">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>Title OK: {String(validationStatus.titleOK)}</div>
          <div>Desc OK: {String(validationStatus.descOK)}</div>
          <div>CM Name OK: {String(validationStatus.cmNameOK)}</div>
          <div>CM Desc OK: {String(validationStatus.cmDescOK)}</div>
          <div>CM Value OK: {String(validationStatus.cmValueOK)}</div>
          <div>Stakeholders with name+hidden: {validationStatus.stakeholderCount}</div>
        </div>
      </div>
    </div>
  );
}

export default ScenarioForm;
