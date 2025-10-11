import React, { useMemo } from 'react';
import type { GameLogEntry } from '../../types';
import { ActionTreeModal } from './ActionTreeModal';
import { ACTION_TREE_STYLESHEET, buildActionTreeData } from '../../services/gameHelpers';

interface ActionTreePortalProps {
  isOpen: boolean;
  onClose: () => void;
  logEntry: GameLogEntry | null;
  eventLog: GameLogEntry[];
}

export const ActionTreePortal: React.FC<ActionTreePortalProps> = ({ isOpen, onClose, logEntry, eventLog }) => {
  const { elements } = useMemo(() => buildActionTreeData(eventLog), [eventLog]);

  return (
    <ActionTreeModal
      isOpen={isOpen}
      onClose={onClose}
      logEntry={logEntry}
      stylesheet={ACTION_TREE_STYLESHEET}
      elements={elements}
    />
  );
};

