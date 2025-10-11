import type { GameLogEntry } from '../types';
import type { Node, Edge } from 'reactflow';

type FlowNode = Node<{ label: string; detail?: any; variant?: 'event' | 'role' | 'action'; }>; 
type FlowEdge = Edge;

const COLUMN_X = {
  event: 0,
  role: 280,
  action: 560,
};

const ROW_SPACING = 220;
const ROLE_SPACING = 140;
const ACTION_SPACING = 120;

const sanitizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const buildActionFlowData = (eventLog: GameLogEntry[]): { nodes: FlowNode[]; edges: FlowEdge[] } => {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  eventLog.forEach((log, roundIndex) => {
    const baseY = roundIndex * ROW_SPACING;
    const eventId = `event-${log.round}`;

    nodes.push({
      id: eventId,
      position: { x: COLUMN_X.event, y: baseY },
      data: {
        label: log.event?.headline ?? (log.round === 0 ? 'Opening Scenario' : `Round ${log.round}`),
        detail: log.event?.detail,
        variant: 'event',
      },
      type: 'default',
    });

    log.playerActions.forEach((playerAction, actionIndex) => {
      const roleId = `${eventId}-role-${sanitizeId(playerAction.roleName)}-${actionIndex}`;
      const roleY = baseY + ROLE_SPACING * (actionIndex + 1);

      nodes.push({
        id: roleId,
        position: { x: COLUMN_X.role, y: roleY },
        data: {
          label: playerAction.roleName,
          detail: playerAction.availableOptions,
          variant: 'role',
        },
        type: 'default',
      });

      edges.push({ id: `${eventId}->${roleId}`, source: eventId, target: roleId, animated: false });

      playerAction.actions.forEach((action, idx) => {
        const actionId = `${roleId}-action-${sanitizeId(action.title)}-${idx}`;
        const actionY = roleY + ACTION_SPACING * idx;

        nodes.push({
          id: actionId,
          position: { x: COLUMN_X.action, y: actionY },
          data: {
            label: action.title,
            detail: action.description,
            variant: 'action',
          },
          type: 'default',
        });

        edges.push({ id: `${roleId}->${actionId}`, source: roleId, target: actionId, animated: true });
      });
    });
  });

  return { nodes, edges };
};
