import type { GameLogEntry } from '../types';
import cytoscape from 'cytoscape';

export const ACTION_TREE_STYLESHEET: cytoscape.Stylesheet[] = [
  { selector: 'node', style: { label: 'data(label)', 'text-valign': 'center', 'text-halign': 'center', color: '#fff', 'font-size': '10px', 'text-wrap': 'wrap', 'text-max-width': '120px', shape: 'round-rectangle', width: '130px', height: 'auto', padding: '10px', 'background-opacity': 1 } as any },
  { selector: '.event', style: { 'background-color': '#be123c', 'font-weight': 'bold', 'font-size': '14px', color: 'white' } },
  { selector: '.role', style: { 'background-color': '#1d4ed8', 'font-weight': 'bold', 'font-size': '12px' } },
  { selector: '.action', style: { 'font-size': '9px', width: '100px', height: 'auto', padding: '8px' } as any },
  { selector: '.chosen', style: { 'background-color': '#16a34a', 'border-width': '2px', 'border-color': '#22c55e' } },
  { selector: '.unchosen', style: { 'background-color': '#4b5563', opacity: 0.7 } },
  { selector: 'edge', style: { width: 2, 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
  { selector: '.event-edge', style: { 'line-color': '#4b5563', 'target-arrow-color': '#4b5563' } },
  { selector: '.chosen-edge', style: { 'line-color': '#22c55e', 'target-arrow-color': '#22c55e', width: 3, 'z-index': 99 } },
  { selector: '.unchosen-edge', style: { 'line-color': '#4b5563', 'target-arrow-color': '#4b5563', opacity: 0.6 } },
];

export const buildActionTreeData = (eventLog: GameLogEntry[]) => {
  const nodes: cytoscape.ElementDefinition[] = [];
  const edges: cytoscape.ElementDefinition[] = [];
  let lastEventId: string | null = null;

  eventLog.forEach((log) => {
    if (!log.event) return;

    const eventId = `event_${log.round}`;
    nodes.push({ data: { id: eventId, label: log.event.headline }, classes: 'event' });

    if (lastEventId) {
      edges.push({ data: { source: lastEventId, target: eventId }, classes: 'event-edge' });
    }

    log.playerActions.forEach((pa) => {
      const roleId = `${pa.roleName}_${log.round}`;
      nodes.push({ data: { id: roleId, label: pa.roleName }, classes: 'role' });
      edges.push({ data: { source: eventId, target: roleId }, classes: 'event-edge' });

      pa.availableOptions?.forEach((opt) => {
        const actionId = `${roleId}_${opt.title}`;
        const isChosen = pa.actions.some((a) => a.title === opt.title);

        nodes.push({
          data: { id: actionId, label: opt.title },
          classes: isChosen ? 'action chosen' : 'action unchosen',
        });

        edges.push({
          data: { source: roleId, target: actionId },
          classes: isChosen ? 'edge chosen-edge' : 'edge unchosen-edge',
        });
      });
    });
    lastEventId = eventId;
  });

  const lastLogEntry = eventLog.length > 0 ? eventLog[eventLog.length - 1] : null;
  return { elements: [...nodes, ...edges], lastLogEntry };
};

