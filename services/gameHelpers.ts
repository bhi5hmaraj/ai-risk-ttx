import type { GameLogEntry } from '../types';
import type { Node, Edge } from 'reactflow';

type FlowNode = Node<{ label: string; detail?: any; variant?: 'event' | 'role' | 'action'; }>;
type FlowEdge = Edge;

const COLUMN_X = {
  event: 0,
  role: 350,
  action: 700,
};

const ROW_SPACING = 220;
const ROLE_SPACING = 160;
const ACTION_SPACING = 100;

const sanitizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Build action flow data for a specific round
 * Shows only the selected round's event, roles, and actions
 */
export const buildActionFlowData = (eventLog: GameLogEntry[], selectedRound?: number): { nodes: FlowNode[]; edges: FlowEdge[] } => {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // If no specific round selected, show all rounds (old behavior)
  const logsToDisplay = selectedRound !== undefined
    ? eventLog.filter(log => log.round === selectedRound)
    : eventLog;

  logsToDisplay.forEach((log, index) => {
    const baseY = index * ROW_SPACING;
    const eventId = `event-${log.round}`;

    // Event/Scenario Node - Diamond shape
    nodes.push({
      id: eventId,
      position: { x: COLUMN_X.event, y: baseY },
      data: {
        label: log.event?.headline ?? (log.round === 0 ? 'Opening Scenario' : `Round ${log.round}`),
        detail: log.event?.detail,
        variant: 'event',
      },
      type: 'event', // Custom node type
      style: {
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        color: '#fff',
        border: '2px solid #60a5fa',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '600',
        minWidth: '200px',
        boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)',
      },
    });

    log.playerActions.forEach((playerAction, actionIndex) => {
      const roleId = `${eventId}-role-${sanitizeId(playerAction.roleName)}-${actionIndex}`;
      const roleY = baseY + (actionIndex - log.playerActions.length / 2) * ROLE_SPACING;

      // Role Node - Rounded rectangle
      nodes.push({
        id: roleId,
        position: { x: COLUMN_X.role, y: roleY },
        data: {
          label: playerAction.roleName,
          detail: playerAction.availableOptions,
          variant: 'role',
        },
        type: 'role', // Custom node type
        style: {
          background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
          color: '#fff',
          border: '2px solid #c4b5fd',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '13px',
          fontWeight: '500',
          minWidth: '160px',
          boxShadow: '0 4px 6px rgba(124, 58, 237, 0.3)',
        },
      });

      edges.push({
        id: `${eventId}->${roleId}`,
        source: eventId,
        target: roleId,
        animated: false,
        style: { stroke: '#60a5fa', strokeWidth: 2 },
      });

      // Only show chosen actions, not all available options
      playerAction.actions.forEach((action, idx) => {
        const actionId = `${roleId}-action-${sanitizeId(action.title)}-${idx}`;
        const actionY = roleY + (idx - playerAction.actions.length / 2) * ACTION_SPACING;

        // Action Node - Pill shape (very rounded)
        nodes.push({
          id: actionId,
          position: { x: COLUMN_X.action, y: actionY },
          data: {
            label: action.title,
            detail: action.description,
            variant: 'action',
          },
          type: 'action', // Custom node type
          style: {
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#fff',
            border: '2px solid #34d399',
            borderRadius: '20px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: '500',
            minWidth: '180px',
            maxWidth: '250px',
            boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
          },
        });

        edges.push({
          id: `${roleId}->${actionId}`,
          source: roleId,
          target: actionId,
          animated: true,
          style: { stroke: '#a78bfa', strokeWidth: 2 },
        });
      });
    });
  });

  return { nodes, edges };
};
