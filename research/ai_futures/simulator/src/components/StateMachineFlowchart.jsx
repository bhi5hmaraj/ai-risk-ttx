import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useSimulationStore from '../store/useSimulationStore';

function StateMachineFlowchart() {
  const simState = useSimulationStore((state) => state.simState);

  // Build nodes and edges from simulation state
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!simState) return { initialNodes: [], initialEdges: [] };

    const currentState = simState.currentState;
    const history = simState.history || [];

    // Get visited state IDs
    const visitedStateIds = new Set(history.map(h => h.currentStateId));

    const nodes = [];
    const edges = [];
    let yPosition = 0;
    const xSpacing = 300;
    const ySpacing = 120;

    // Add all visited states in order
    const seenStates = new Set();
    history.forEach((h) => {
      if (!seenStates.has(h.currentStateId)) {
        seenStates.add(h.currentStateId);

        const isCurrent = h.currentStateId === currentState.id;

        nodes.push({
          id: h.currentStateId,
          type: 'default',
          data: {
            label: (
              <div style={{ padding: '8px' }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: isCurrent ? '#4ecdc4' : '#8e8e8e',
                  marginBottom: '4px',
                }}>
                  {isCurrent ? '● CURRENT' : '✓ COMPLETED'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {h.currentStateName}
                </div>
                <div style={{ fontSize: '10px', color: '#8e8e8e' }}>
                  {h.simTimeMonths != null ? `Month ${h.simTimeMonths.toFixed(1)}` : ''}
                </div>
              </div>
            ),
          },
          position: { x: 50, y: yPosition },
          style: {
            background: isCurrent ? '#4ecdc4' : '#2c3e50',
            color: isCurrent ? '#0a0e1a' : '#e0e0e0',
            border: isCurrent ? '3px solid #6ee7df' : '1px solid #2c3e50',
            borderRadius: '12px',
            padding: 0,
            width: 250,
            opacity: isCurrent ? 1 : 0.7,
          },
        });

        yPosition += ySpacing;
      }
    });

    // Add next possible states
    if (currentState.user_choices && currentState.user_choices.length > 0) {
      // User has choices - show all options side by side
      currentState.user_choices.forEach((choice, index) => {
        if (!visitedStateIds.has(choice.to)) {
          const xOffset = (index - (currentState.user_choices.length - 1) / 2) * xSpacing;

          nodes.push({
            id: choice.to,
            type: 'default',
            data: {
              label: (
                <div style={{ padding: '8px' }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#4ecdc4',
                    marginBottom: '4px',
                  }}>
                    ? YOUR CHOICE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {choice.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#8e8e8e', lineHeight: 1.3 }}>
                    {choice.description}
                  </div>
                </div>
              ),
            },
            position: { x: 50 + xOffset, y: yPosition },
            style: {
              background: '#1a1f3a',
              color: '#e0e0e0',
              border: '2px dashed #4ecdc4',
              borderRadius: '12px',
              padding: 0,
              width: 250,
            },
          });

          // Add edge from current to choice
          edges.push({
            id: `${currentState.id}-${choice.to}`,
            source: currentState.id,
            target: choice.to,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#4ecdc4', strokeWidth: 2 },
            label: choice.label,
            labelStyle: { fontSize: '11px', fill: '#4ecdc4' },
          });
        }
      });
    } else if (currentState.auto_transitions && currentState.auto_transitions.length > 0) {
      // Auto transition - show next state
      const nextTransition = currentState.auto_transitions[0];
      if (!visitedStateIds.has(nextTransition.to)) {
        nodes.push({
          id: 'next_auto',
          type: 'default',
          data: {
            label: (
              <div style={{ padding: '8px' }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#8e8e8e',
                  marginBottom: '4px',
                }}>
                  → NEXT
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Next State
                </div>
                <div style={{ fontSize: '10px', color: '#8e8e8e', lineHeight: 1.3 }}>
                  {nextTransition.condition || 'Auto-transition'}
                </div>
              </div>
            ),
          },
          position: { x: 50, y: yPosition },
          style: {
            background: '#0f1629',
            color: '#e0e0e0',
            border: '2px dashed #8e8e8e',
            borderRadius: '12px',
            padding: 0,
            width: 250,
          },
        });

        edges.push({
          id: `${currentState.id}-next_auto`,
          source: currentState.id,
          target: 'next_auto',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8e8e8e', strokeWidth: 2, strokeDasharray: '5,5' },
          label: 'auto',
          labelStyle: { fontSize: '11px', fill: '#8e8e8e' },
        });
      }
    }

    // Add edges between visited states
    for (let i = 1; i < nodes.length - (currentState.user_choices?.length || (currentState.auto_transitions?.length ? 1 : 0)); i++) {
      edges.push({
        id: `edge-${i}`,
        source: nodes[i - 1].id,
        target: nodes[i].id,
        type: 'smoothstep',
        style: { stroke: '#2c3e50', strokeWidth: 2 },
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [simState]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when simState changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  if (!simState) return null;

  return (
    <div style={{ height: '100%', minHeight: '500px', background: '#0f1629', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        style={{ background: '#0f1629' }}
      >
        <Background color="#2c3e50" gap={16} />
        <Controls style={{ background: '#1a1f3a', border: '1px solid #2c3e50' }} />
        <MiniMap
          style={{ background: '#1a1f3a', border: '1px solid #2c3e50' }}
          nodeColor={(node) => {
            if (node.id === simState.currentState.id) return '#4ecdc4';
            if (node.style?.border?.includes('dashed')) return '#1a1f3a';
            return '#2c3e50';
          }}
        />
      </ReactFlow>
    </div>
  );
}

export default StateMachineFlowchart;
