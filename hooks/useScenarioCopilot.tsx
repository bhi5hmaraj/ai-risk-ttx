"use client";

import React from 'react';
import { useCopilotAction, useCopilotChat } from '@/components/copilot/adapter';
import { copilotParameters, type CustomScenarioForm } from '@/types/customScenarioForm';

export function useScenarioCopilot(
  setValue: (name: any, value: any) => void,
  setComments?: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
  isLocked?: (path: string) => boolean,
) {
  // Helper to apply a patch (with lock checks) once the user approves
  const applyPatch = (args: Partial<CustomScenarioForm>) => {
    const lock = (p: string) => (isLocked ? !!isLocked(p) : false);

    if (typeof args?.scenarioTitle === 'string' && !lock('scenarioTitle')) setValue('scenarioTitle', args.scenarioTitle);
    if (typeof args?.scenarioDescription === 'string' && !lock('scenarioDescription')) setValue('scenarioDescription', args.scenarioDescription);

    if (args?.coreMetric) {
      if (typeof args.coreMetric?.name !== 'undefined' && !lock('coreMetric.name')) setValue('coreMetric.name', args.coreMetric?.name as any);
      if (typeof args.coreMetric?.description !== 'undefined' && !lock('coreMetric.description')) setValue('coreMetric.description', args.coreMetric?.description as any);
      if (typeof args.coreMetric?.value !== 'undefined' && !lock('coreMetric.value')) setValue('coreMetric.value', args.coreMetric?.value as any);
    }

    if (Array.isArray(args?.stakeholders)) {
      (args.stakeholders as any[]).slice(0, 6).forEach((s: any, idx: number) => {
        if (typeof s?.name !== 'undefined' && !lock(`stakeholders.${idx}.name`)) setValue(`stakeholders.${idx}.name`, s?.name);
        if (typeof s?.icon !== 'undefined' && !lock(`stakeholders.${idx}.icon`)) setValue(`stakeholders.${idx}.icon`, s?.icon);
        if (typeof s?.character !== 'undefined' && !lock(`stakeholders.${idx}.character`)) setValue(`stakeholders.${idx}.character`, s?.character);
        if (typeof s?.hiddenObjective !== 'undefined' && !lock(`stakeholders.${idx}.hiddenObjective`)) setValue(`stakeholders.${idx}.hiddenObjective`, s?.hiddenObjective);
      });
    }

    if (typeof (args as any)?.maxRounds === 'number' && !lock('maxRounds')) setValue('maxRounds', (args as any).maxRounds);
    if ((args as any)?.comments && setComments) setComments((prev) => ({ ...prev, ...(args as any).comments }));
  };

  useCopilotAction?.({
    name: 'bulkUpdateScenarioForm',
    description: 'Set multiple fields of the custom scenario form at once (with confirmation).',
    // Use CopilotKit Parameter[] derived from the single source schema
    parameters: copilotParameters as any,
    available: 'enabled',
    renderAndWaitForResponse: (props: any) => <ProposedUpdateCard {...props} onApply={applyPatch} />,
  });
}

function ProposedUpdateCard({ status, args, respond, onApply, handler }: { status: string; args: any; respond?: (r: any) => void; onApply: (a: any) => void; handler?: (r: any) => void; }) {
  const { stopGeneration } = (useCopilotChat?.() as any) || { stopGeneration: () => {} };
  const ref = React.useRef<HTMLDivElement>(null);
  const [closed, setClosed] = React.useState(false);
  React.useEffect(() => { try { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {} }, []);

  // Flatten nested args into dot-path rows for a compact table view
  const rows = React.useMemo(() => {
    const out: Array<{ path: string; value: any }> = [];
    const walk = (val: any, path: string) => {
      if (val === null || typeof val !== 'object') {
        out.push({ path, value: val });
        return;
      }
      if (Array.isArray(val)) {
        val.forEach((v, i) => walk(v, path ? `${path}.${i}` : String(i)));
        return;
      }
      for (const k of Object.keys(val)) {
        walk(val[k], path ? `${path}.${k}` : k);
      }
    };
    try { walk(args ?? {}, ''); } catch {}
    return out;
  }, [args]);

  if (closed) return null;

  return (
    <div ref={ref} className="m-2 p-3 border border-gray-700 rounded bg-gray-900 text-gray-200 text-sm">
      <div className="font-semibold mb-2 sticky top-0 bg-gray-900">Proposed updates (review and approve)</div>
      <div className="max-h-56 overflow-auto border border-gray-800 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-950/60">
            <tr>
              <th className="text-left px-2 py-1 border-b border-gray-800 w-1/2">Field</th>
              <th className="text-left px-2 py-1 border-b border-gray-800">Proposed value</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-2 py-1 text-gray-400" colSpan={2}>No changes proposed.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="odd:bg-gray-950/30">
                  <td className="px-2 py-1 align-top font-mono text-[11px] text-gray-300 break-all">{r.path || '(root)'}</td>
                  <td className="px-2 py-1 align-top break-words">{renderValue(r.value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          className="px-2 py-1 rounded bg-emerald-600"
          onClick={() => {
            try { onApply(args || {}); } catch {}
            try { window.dispatchEvent(new CustomEvent('copilot:applied', { detail: 'Applied updates' })); } catch {}
            setClosed(true);
            const result = { approved: true, applied: true };
            // Defer respond to the microtask queue to avoid conflicting with React updates
            try { (typeof queueMicrotask === 'function' ? queueMicrotask : (fn: any) => setTimeout(fn, 0))(() => respond?.(result)); } catch {}
            try { handler?.(result); } catch {}
            try { stopGeneration?.(); } catch {}
          }}
        >
          Apply updates
        </button>
        <button
          className="px-2 py-1 rounded bg-gray-800 border border-gray-700"
          onClick={() => {
            setClosed(true);
            const result = { approved: false, applied: false };
            try { (typeof queueMicrotask === 'function' ? queueMicrotask : (fn: any) => setTimeout(fn, 0))(() => respond?.(result)); } catch {}
            try { handler?.(result); } catch {}
            try { stopGeneration?.(); } catch {}
          }}
        >
          Cancel
        </button>
      </div>
      <div className="mt-1 text-[11px] text-gray-400">Nothing changes until you click “Apply updates”. Locked fields are never modified.</div>
    </div>
  );
}

function renderValue(v: any): React.ReactNode {
  if (v === null) return <span className="text-gray-400">null</span>;
  const t = typeof v;
  if (t === 'string') return <span className="text-gray-100 break-words">{v}</span>;
  if (t === 'number' || t === 'boolean') return <span className="text-purple-200">{String(v)}</span>;
  try {
    const s = JSON.stringify(v);
    return <span className="text-gray-300 break-words">{s}</span>;
  } catch {
    return <span className="text-gray-400">{String(v)}</span>;
  }
}
