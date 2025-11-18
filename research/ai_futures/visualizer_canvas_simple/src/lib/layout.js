import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 260;
const NODE_HEIGHT = 70;

/**
 * Build edges from state actions for layout
 */
export function makeEdges(STATES) {
  const edges = [];
  Object.entries(STATES).forEach(([fromId, s]) => {
    s.actions.forEach((a, i) => {
      edges.push({
        id: `${fromId}-${i}`,
        source: fromId,
        target: a.to,
        label: a.label,
      });
    });
  });
  return edges;
}

/**
 * Layout nodes using dagre algorithm
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @param {string} direction - "LR" (left→right) or "TB" (top→bottom)
 */
export function layoutWithDagre(nodes, edges, direction) {
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 90,
    nodesep: 40,
    edgesep: 20,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export { NODE_WIDTH, NODE_HEIGHT };
