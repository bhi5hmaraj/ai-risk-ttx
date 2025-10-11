import React, { useMemo, useRef, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import type { GameLogEntry } from '../../types';
import { ActionTreeModal } from './ActionTreeModal';
import { buildActionFlowData } from '../../services/gameHelpers';

interface ActionTreePortalProps {
  isOpen: boolean;
  onClose: () => void;
  logEntry: GameLogEntry | null;
  eventLog: GameLogEntry[];
}

export const ActionTreePortal: React.FC<ActionTreePortalProps> = ({ isOpen, onClose, logEntry, eventLog }) => {
  const { nodes, edges } = useMemo(() => buildActionFlowData(eventLog), [eventLog]);
  const flowRef = useRef<ReactFlowInstance | null>(null);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    flowRef.current = instance;
    requestAnimationFrame(() => instance.fitView({ padding: 0.2 }));
  }, []);

  const handleReset = useCallback(() => {
    flowRef.current?.fitView({ padding: 0.2, duration: 300 });
  }, []);

  const title = logEntry ? `Full Action Tree (Round ${logEntry.round})` : 'Full Action Tree';

  return (
    <ActionTreeModal isOpen={isOpen} onClose={onClose} onReset={handleReset} title={title}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={handleInit}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="rgba(255,255,255,0.1)" />
        <MiniMap nodeColor="#2563eb" pannable zoomable />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </ActionTreeModal>
  );
};
