import React from 'react';
import type { CausalReference, GameLogEntry } from '../../types';
import { Tooltip } from '../ui/Tooltip';

interface CauseTagProps {
  cause: CausalReference;
  logs: GameLogEntry[];
}

const truncate = (s: string, n = 140) => (s.length > n ? s.slice(0, n).trim() + '…' : s);

function resolveGist(cause: CausalReference, logs: GameLogEntry[]) {
  if (cause.type === 'event') {
    const found = logs.find((l) => l.event && (l.event.id === cause.ref || l.event.headline === cause.ref));
    if (found?.event) {
      return {
        title: found.event.headline,
        detail: truncate(found.event.detail || ''),
        round: found.round,
      };
    }
  }
  if (cause.type === 'action') {
    // Expect format: Role:Action@Round, but fall back gracefully
    const m = /^(.*?):(.*)@([0-9]+)$/.exec(cause.ref || '') || [];
    const role = (m[1] || '').trim();
    const actionTitle = (m[2] || '').trim();
    const round = Number(m[3]) || undefined;
    const entries = round ? logs.filter((l) => l.round === round) : logs;
    for (const l of entries) {
      const pa = l.playerActions.find((p) => (!role || p.roleName === role) && p.actions.some((a) => a.title === actionTitle));
      if (pa) {
        const action = pa.actions.find((a) => a.title === actionTitle)!;
        return {
          title: `${pa.roleName} — ${action.title}`,
          detail: truncate(action.description || ''),
          round: l.round,
        };
      }
    }
  }
  // exogenous or unresolved
  return {
    title: cause.type === 'exogenous' ? 'External Factor' : 'Cited Reference',
    detail: truncate(cause.rationale || ''),
    round: undefined,
  };
}

export const CauseTag: React.FC<CauseTagProps> = ({ cause, logs }) => {
  const gist = resolveGist(cause, logs);
  const pillColor =
    cause.type === 'event' ? 'bg-blue-800/40 text-blue-200 border-blue-700/50' :
    cause.type === 'action' ? 'bg-green-800/30 text-green-200 border-green-700/50' :
    'bg-purple-800/30 text-purple-200 border-purple-700/50';

  const tip = (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{cause.type === 'exogenous' ? 'External' : cause.type}</p>
      <p className="font-semibold text-gray-100 text-sm leading-snug">{gist.title}</p>
      {gist.detail && <p className="text-xs text-gray-300 mt-1 leading-snug">{gist.detail}</p>}
      {gist.round !== undefined && (
        <p className="text-[11px] text-gray-400 mt-1">Round {gist.round}</p>
      )}
      {cause.rationale && cause.rationale.trim() !== (gist.detail || '').trim() && (
        <p className="text-[11px] text-amber-300/90 mt-2">Why: {truncate(cause.rationale, 160)}</p>
      )}
    </div>
  );

  return (
    <Tooltip content={tip}>
      <button type="button" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${pillColor} hover:opacity-90 transition-opacity`}
        title={gist.title}
      >
        <span className="text-[10px] uppercase">{cause.type}</span>
        {typeof gist.round === 'number' && (
          <span className="ml-1 text-[10px] font-semibold text-gray-300">R{gist.round}</span>
        )}
      </button>
    </Tooltip>
  );
};
