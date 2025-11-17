import React, { useMemo } from 'react'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import { STATES, TRANSITIONS } from '../model'
import './StateMachineVisualizer.css'

/**
 * Visual representation of the AI2027 state machine using React Flow
 */
export default function StateMachineVisualizer({ currentStateId, history }) {
  // Convert states to React Flow nodes
  const nodes = useMemo(() => {
    return Object.values(STATES).map((state, index) => {
      const isCurrent = state.id === currentStateId
      const isVisited = history.some(h => h.stateId === state.id)

      // Layout: vertical flow with branching
      let x = 400
      let y = index * 150

      // Custom positioning for better layout
      if (state.id === 'current_2024') {
        x = 400
        y = 50
      } else if (state.id === 'gpt5_level') {
        x = 400
        y = 200
      } else if (state.id === 'race_dynamics') {
        x = 150
        y = 350
      } else if (state.id === 'agi_2027') {
        x = 400
        y = 500
      } else if (state.id === 'superintelligence') {
        x = 400
        y = 650
      } else if (state.id === 'extinction') {
        x = 200
        y = 800
      } else if (state.id === 'aligned_committee') {
        x = 600
        y = 800
      }

      return {
        id: state.id,
        type: 'custom',
        position: { x, y },
        data: {
          ...state,
          isCurrent,
          isVisited,
        },
        style: {
          background: isCurrent ? '#e94560' : (isVisited ? '#0f3460' : '#16213e'),
          border: `2px solid ${isCurrent ? '#ff6b81' : (isVisited ? '#64ffda' : '#0f3460')}`,
          borderRadius: '8px',
          padding: '15px',
          minWidth: '200px',
          color: '#e0e0e0',
        }
      }
    })
  }, [currentStateId, history])

  // Convert transitions to React Flow edges
  const edges = useMemo(() => {
    return TRANSITIONS.map((transition, index) => {
      const isActive = history.some(h => h.transitionId === transition.id)

      // Color by epistemic confidence
      let color = '#4a5568'
      if (transition.epistemicConfidence > 0.6) color = '#48bb78' // Strong: green
      else if (transition.epistemicConfidence > 0.3) color = '#ed8936' // Moderate: orange
      else if (transition.epistemicConfidence > 0) color = '#fc8181' // Weak: red
      else color = '#e53e3e' // Contested: dark red

      if (isActive) color = '#64ffda' // Highlight if taken

      return {
        id: `${transition.id}-${index}`,
        source: transition.from,
        target: transition.to || transition.choices?.[0]?.targetState || 'unknown',
        label: transition.type === 'choice' ? '?' : (transition.epistemicConfidence * 100).toFixed(0) + '%',
        animated: transition.type === 'automatic',
        style: {
          stroke: color,
          strokeWidth: isActive ? 3 : 2,
        },
        labelStyle: {
          fill: color,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#0a0a0a',
        },
        type: transition.contested ? 'smoothstep' : 'default',
      }
    })
  }, [history])

  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), [])

  return (
    <div className="state-machine-visualizer">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#1a1a2e" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.isCurrent) return '#e94560'
            if (node.data.isVisited) return '#64ffda'
            return '#0f3460'
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
      </ReactFlow>

      <div className="legend">
        <h4>Legend</h4>
        <div className="legend-item">
          <span className="color-box" style={{ background: '#48bb78' }}></span>
          Strong (&gt;60%)
        </div>
        <div className="legend-item">
          <span className="color-box" style={{ background: '#ed8936' }}></span>
          Moderate (30-60%)
        </div>
        <div className="legend-item">
          <span className="color-box" style={{ background: '#fc8181' }}></span>
          Weak (&lt;30%)
        </div>
        <div className="legend-item">
          <span className="color-box" style={{ background: '#e53e3e' }}></span>
          Contested
        </div>
      </div>
    </div>
  )
}

// Custom node component
function CustomNode({ data }) {
  return (
    <div className="custom-node">
      <div className="node-header">
        <h3>{data.name}</h3>
        {data.isCurrent && <span className="current-badge">CURRENT</span>}
      </div>
      <p className="node-description">{data.description}</p>
      <div className="node-footer">
        <span className="node-time">{data.time}</span>
        {data.probability !== undefined && data.probability < 1.0 && (
          <span className="node-probability">P={data.probability.toFixed(1)}</span>
        )}
      </div>
      {data.isEndState && (
        <div className="end-state-badge">
          {data.outcomeType === 'catastrophic' ? '💀' : '⚠️'}  END STATE
        </div>
      )}
    </div>
  )
}
